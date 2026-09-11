#!/usr/bin/env node
/**
 * A deliberately small, staged client for one reviewable Tripo v3 asset trial.
 * It has no retry loop for task-creating requests: an uncertain POST is charged
 * against the local cap until a human reconciles it against the Tripo dashboard.
 *
 * API contract source (read 2026-09-10):
 * https://github.com/VAST-AI-Research/tripo-js-sdk#api-reference
 * V3 uses `file` for image generation and `input` for animation tasks.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CREDIT_CAP = 300;
export const COST = Object.freeze({ generate: 40, rigCheck: 0, rig: 25, animate: 10 });
export const API_ORIGIN = 'https://openapi.tripo3d.ai';
export const API_BASE = `${API_ORIGIN}/v3`;
const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const STATE_DIR = join(ROOT, '.dream-loop', 'tripo-trial');
const LEDGER_PATH = join(STATE_DIR, 'ledger.json');
const LOCK_PATH = join(STATE_DIR, 'ledger.lock');

export function emptyLedger() {
  return { version: 1, capCredits: CREDIT_CAP, createdAt: new Date().toISOString(), entries: [] };
}

export function reservedCredits(ledger) {
  return ledger.entries.reduce((total, entry) => total + Math.max(Number(entry.reservedCredits) || 0, Number(entry.consumedCredits) || 0), 0);
}

export function canReserve(ledger, credits) {
  return Number.isInteger(credits) && credits >= 0 && reservedCredits(ledger) + credits <= Math.min(Number(ledger.capCredits) || CREDIT_CAP, CREDIT_CAP);
}

async function readLedger() {
  try { return JSON.parse(await readFile(LEDGER_PATH, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return emptyLedger(); throw error; }
}

async function writeLedger(ledger) {
  await mkdir(STATE_DIR, { recursive: true });
  const temporary = `${LEDGER_PATH}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  await rename(temporary, LEDGER_PATH);
}

async function withLedgerLock(action) {
  await mkdir(STATE_DIR, { recursive: true });
  try { await mkdir(LOCK_PATH); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Tripo trial ledger is locked by another process; wait and try again.'); throw error; }
  try { return await action(); }
  finally { await rm(LOCK_PATH, { recursive: true, force: true }); }
}

async function reserve(kind, details, credits) {
  return withLedgerLock(async () => {
    const ledger = await readLedger();
    if (!canReserve(ledger, credits)) throw new Error(`Refusing ${kind}: ${reservedCredits(ledger)} + ${credits} exceeds the ${ledger.capCredits}-credit trial cap.`);
    const entry = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, kind, details, reservedCredits: credits, status: 'reserved', reservedAt: new Date().toISOString() };
    ledger.entries.push(entry);
    await writeLedger(ledger);
    return entry;
  });
}

async function updateEntry(id, update) {
  return withLedgerLock(async () => {
    const ledger = await readLedger();
    const entry = ledger.entries.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`Ledger entry ${id} is missing.`);
    Object.assign(entry, update);
    await writeLedger(ledger);
  });
}

function loadDotEnv() {
  return readFile(join(ROOT, '.env'), 'utf8').then((source) => {
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }).catch((error) => { if (error.code !== 'ENOENT') throw error; });
}

async function api(path, options = {}) {
  await loadDotEnv();
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error('TRIPO_API_KEY is required. Put it in the ignored .env file; it is never printed or saved.');
  if (!path.startsWith('/') || path.includes('://')) throw new Error('Refusing a non-allowlisted API path.');
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${key}`, ...(options.headers ?? {}) } });
  const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`Tripo returned non-JSON HTTP ${response.status}.`); }
  if (!response.ok || (body.code !== undefined && body.code !== 0)) throw new Error(`Tripo API request failed (HTTP ${response.status}; code ${body.code ?? 'unavailable'}).`);
  return body.data ?? body;
}

function taskId(response) { return response.task_id ?? response.taskId ?? response.id; }
function assertTaskId(response) { const id = taskId(response); if (!id || typeof id !== 'string') throw new Error('Tripo response contained no task_id; reservation remains recorded for reconciliation.'); return id; }
function validateTaskId(value) { if (!/^[A-Za-z0-9_-]{6,128}$/.test(value)) throw new Error('Task id format is invalid.'); return value; }
function redactForConsole(value) {
  if (Array.isArray(value)) return value.map(redactForConsole);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, /(^|_)url(s)?$/i.test(key) ? '[stored in ignored ledger]' : redactForConsole(child)]));
}

async function submit(kind, path, payload, credits, details) {
  const entry = await reserve(kind, details, credits);
  // Never retry this POST. A transport failure may still have made a paid task.
  try {
    const result = await api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const id = assertTaskId(result);
    await updateEntry(entry.id, { status: 'submitted', taskId: id, submittedAt: new Date().toISOString() });
    return id;
  } catch (error) {
    await updateEntry(entry.id, { status: 'uncertain', error: error.message, uncertainAt: new Date().toISOString() });
    throw error;
  }
}

async function uploadImage(localPath) {
  const absolute = resolve(localPath);
  const extension = extname(absolute).toLowerCase();
  const contentType = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[extension];
  if (!contentType) throw new Error('Image must be PNG, JPEG, or WEBP.');
  if ((await stat(absolute)).size > 20 * 1024 * 1024) throw new Error('Image exceeds Tripo’s 20 MB limit.');
  await loadDotEnv();
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error('TRIPO_API_KEY is required. Put it in the ignored .env file; it is never printed or saved.');
  const form = new FormData();
  form.append('file', new Blob([await readFile(absolute)], { type: contentType }), basename(absolute));
  const response = await fetch(`${API_BASE}/files`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  const body = await response.json();
  if (!response.ok || (body.code !== undefined && body.code !== 0)) throw new Error(`Tripo image upload failed (HTTP ${response.status}; code ${body.code ?? 'unavailable'}).`);
  const token = (body.data ?? body).file_token;
  if (!token) throw new Error('Tripo upload returned no file_token.');
  return token;
}

async function command(args) {
  const [name, ...rest] = args;
  if (name === 'balance') { console.log(JSON.stringify(await api('/account/balance'), null, 2)); return; }
  if (name === 'generate') {
    if (rest.length !== 1) throw new Error('Usage: generate <local-image.png|jpg|webp>');
    await api('/account/balance'); // Check account access before the otherwise irreversible image upload.
    const fileToken = await uploadImage(rest[0]); // Upload is non-billed; generation below is reserved first.
    const sourceHash = createHash('sha256').update(await readFile(resolve(rest[0]))).digest('hex');
    const id = await submit('generate', '/generation/image-to-model', { file: fileToken, model: 'v3.1-20260211', texture: true, pbr: false, texture_quality: 'standard', smart_low_poly: true, face_limit: 12000 }, COST.generate, { sourceHash, model: 'v3.1-20260211', textured: true, pbr: false, smartLowPoly: true, compressed: false });
    console.log(`Submitted generation task ${id}. Run poll ${id}, review its rendered image, then continue.`); return;
  }
  if (name === 'rig-check') {
    const id = validateTaskId(rest[0] ?? '');
    console.log(`Submitted rig-check task ${await submit('rig-check', '/animations/rig-check', { input: id }, COST.rigCheck, { inputTaskId: id })}. Poll it and require output.riggable plus rig_type=quadruped before rigging.`); return;
  }
  if (name === 'rig') {
    const id = validateTaskId(rest[0] ?? '');
    console.log(`Submitted rig task ${await submit('rig', '/animations/rig', { input: id, model: 'v2.5-20260210', rig_type: 'quadruped', spec: 'tripo', out_format: 'glb' }, COST.rig, { inputTaskId: id, model: 'v2.5-20260210', rigType: 'quadruped' })}. Poll and visually review before animation.`); return;
  }
  if (name === 'animate') {
    const id = validateTaskId(rest[0] ?? '');
    console.log(`Submitted quadruped walk task ${await submit('animate', '/animations/retarget', { input: id, animations: ['preset:quadruped:walk'], out_format: 'glb', bake_animation: true, animate_in_place: true }, COST.animate, { inputTaskId: id, animations: ['preset:quadruped:walk'], inPlace: true })}. Poll it, then download immediately.`); return;
  }
  if (name === 'poll') {
    const id = validateTaskId(rest[0] ?? ''); const result = await api(`/tasks/${encodeURIComponent(id)}`);
    await withLedgerLock(async () => { const ledger = await readLedger(); const entry = ledger.entries.find((item) => item.taskId === id); if (entry) Object.assign(entry, { status: result.status ?? entry.status, consumedCredits: result.credits_consumed ?? result.consumed_credit ?? result.consumedCredits ?? entry.consumedCredits, taskResult: result, lastPolledAt: new Date().toISOString() }); await writeLedger(ledger); });
    console.log(JSON.stringify(redactForConsole(result), null, 2)); return;
  }
  if (name === 'download') {
    const id = validateTaskId(rest[0] ?? ''); const result = await api(`/tasks/${encodeURIComponent(id)}`); const output = result.output ?? {};
    const url = output.model_url ?? output.model ?? output.model_urls?.[0];
    if (!url || new URL(url).protocol !== 'https:') throw new Error('Task has no HTTPS model URL. Poll until success first.');
    const response = await fetch(url); // Signed result URL only; deliberately no bearer token.
    if (!response.ok) throw new Error(`Model download failed (HTTP ${response.status}); Tripo URLs expire quickly, poll again for a fresh result.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 12 || bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) throw new Error('Downloaded output is not a binary GLB (missing glTF signature); it was not saved.');
    const destination = join(STATE_DIR, `${id}.glb`); await writeFile(destination, bytes);
    console.log(`Downloaded ${destination}`); return;
  }
  throw new Error('Commands: balance | generate <image> | rig-check <task> | rig <task> | animate <task> | poll <task> | download <task>');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) command(process.argv.slice(2)).catch((error) => { console.error(`Tripo trial: ${error.message}`); process.exitCode = 1; });
