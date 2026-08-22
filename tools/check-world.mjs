#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JSON_PATH = path.join(ROOT, "src", "world", "data", "world.json");
const GEN_PATH = path.join(ROOT, "src", "world", "data", "world.generated.js");

function sortedClone(v) {
  if (Array.isArray(v)) return v.map(sortedClone);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortedClone(v[k]);
    return out;
  }
  return v;
}

const rawJson = fs.readFileSync(JSON_PATH, "utf-8");
let parsed;
try { parsed = JSON.parse(rawJson); } catch (e) { console.error("[check-world] invalid JSON", e.message); process.exit(1); }

if (!fs.existsSync(GEN_PATH)) {
  console.error("[check-world] FAIL — world.generated.js missing. Run: npm run world:generate");
  process.exit(1);
}
const genText = fs.readFileSync(GEN_PATH, "utf-8");
// Extract the JSON payload between export const WORLD_DATA = and ;
const m = genText.match(/export const WORLD_DATA = ([\s\S]+?);\s*\n/);
if (!m) { console.error("[check-world] FAIL — could not parse WORLD_DATA from generated file"); process.exit(1); }
let genParsed;
try { genParsed = JSON.parse(m[1]); } catch (e) { console.error("[check-world] FAIL — generated JSON invalid", e.message); process.exit(1); }

const sortedJson = sortedClone(parsed);
const sortedGen = sortedClone(genParsed);
const jsonStr = JSON.stringify(sortedJson);
const genStr = JSON.stringify(sortedGen);
if (jsonStr !== genStr) {
  console.error("[check-world] FAIL — world.json and world.generated.js are out of sync (stale generated data)");
  console.error("[check-world] Run: npm run world:generate");
  // Show diff hint
  const jKeys = Object.keys(sortedJson).join(",");
  const gKeys = Object.keys(sortedGen).join(",");
  if (jKeys !== gKeys) console.error(`  json keys: ${jKeys}\n  gen keys: ${gKeys}`);
  process.exit(1);
}
console.log("[check-world] PASS — world.json and world.generated.js in sync");
