#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "submission");
const MAX_BYTES = 35 * 1024 * 1024;

let errors = [];
let warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function checkExists(p, label) {
  if (!fs.existsSync(p)) fail(`Missing ${label}: ${path.relative(ROOT, p)}`);
}

function readText(p) {
  return fs.readFileSync(p, "utf-8");
}

// 1. index.html at root
checkExists(path.join(OUT, "index.html"), "submission index.html at dist/submission/index.html");
if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("[validate] FAIL — index.html missing, cannot continue");
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}

const html = readText(path.join(OUT, "index.html"));

// 2. /vendor missing when required — submission uses three + rapier, so vendor must exist
if (!fs.existsSync(path.join(OUT, "vendor", "three.module.js"))) {
  fail("/vendor/three.module.js missing in submission — Three.js must be vendored with relative path");
}
if (!fs.existsSync(path.join(OUT, "vendor", "rapier.js"))) {
  fail("/vendor/rapier.js missing in submission — Rapier must be vendored with relative path (compat, base64 WASM)");
}

// Also check that html references vendor relatively, not absolute/CDN
if (!html.includes("./vendor/three.module.js") && !html.includes("vendor/three.module.js")) {
  fail('index.html does not reference Three.js via relative ./vendor/three.module.js');
}
if (!html.includes("./vendor/rapier.js") && !html.includes("vendor/rapier.js")) {
  fail('index.html does not reference Rapier via relative ./vendor/rapier.js');
}

// 3. Forbidden http:// or https:// runtime references in HTML/JS/CSS
// Allow the importmap comment? No, strictly fail if http:// or https:// appears except in comments about what NOT to do?
// We scan submission index.html; CDN is forbidden.
const httpRegex = /https?:\/\//g;
const httpMatches = [...html.matchAll(httpRegex)];
// Filter out known safe: none — any http is suspicious in Phase 0
if (httpMatches.length > 0) {
  // Check if any line is just a comment describing forbidden pattern — still flag, but we can be lenient for validator comments
  // For now fail if any https: appears
  fail(`Found ${httpMatches.length} http(s):// reference(s) in submission index.html — offline build must not use CDN/runtime network. Matches: ${httpMatches.slice(0,3).map(m=>m[0]).join(", ")}`);
}

// Also scan vendor? vendor is allowed to contain https in license header? But spec says no runtime network requests — license comments with https are okay.
// So we only scan index.html for runtime references, not vendor license.

// 4. Source-map / minified production check — first-party code must be readable, unminified
// Heuristics: index.html should contain readable function names from source, and not be single-line minified, and not contain sourceMappingURL
if (html.includes("sourceMappingURL")) {
  fail("submission index.html contains sourceMappingURL — first-party code must be readable unminified without source maps");
}
// Check that key readable markers exist
const mustContain = ["createScene", "createCamera", "createRenderer", "CAMERA_CONFIG"];
const mustContainAnyPhase = ["Phase 0", "Phase 1", "Phase 1.2"];
for (const token of mustContain) {
  if (!html.includes(token)) fail(`submission index.html missing expected readable token: ${token} — first-party code may not be inlined correctly`);
}
if (!mustContainAnyPhase.some((t) => html.includes(t))) {
  fail(`submission index.html missing phase marker (expected one of ${mustContainAnyPhase.join(", ")})`);
}
// Check minified heuristic: average line length too high suggests minified
const lines = html.split("\n");
const avgLen = html.length / Math.max(lines.length, 1);
if (avgLen > 600) {
  fail(`submission index.html appears minified (avg line length ${avgLen.toFixed(0)} > 600) — keep first-party code readable and unminified`);
}
if (lines.length < 30) {
  warn(`submission index.html is very short (${lines.length} lines) — did inlining fail?`);
}

// 5. Referenced local files missing — check vendor and assets references exist
const vendorRefRegex = /["']\.\/vendor\/[^"']+["']/g;
const vendorRefs = [...html.matchAll(vendorRefRegex)].map(m => m[0].slice(1, -1));
for (const rel of vendorRefs) {
  const abs = path.join(OUT, rel.replace(/^\.\//, ""));
  if (!fs.existsSync(abs)) fail(`Referenced local file missing in submission: ${rel} → ${path.relative(ROOT, abs)} not found`);
}

// 6. ZIP/package size exceeds 35 MB
function dirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else total += fs.statSync(p).size;
  }
  return total;
}
const totalSize = dirSize(OUT);
if (totalSize > MAX_BYTES) {
  fail(`Submission size ${(totalSize / (1024*1024)).toFixed(2)} MB exceeds 35 MB limit`);
} else {
  console.log(`[validate] submission size ${(totalSize / 1024).toFixed(1)} KB — OK (<35 MB)`);
}

// 7. Obvious dev-only paths or localhost references remain
const devPatterns = [
  /localhost:\d+/,
  /127\.0\.0\.1/,
  /\/src\//,
  /node_modules/,
];
for (const pat of devPatterns) {
  if (pat.test(html)) {
    // /src/ references are expected to be gone — but comments may mention src/ — treat as warn vs fail
    if (pat.source === "\\/src\\/") {
      // If the HTML contains a src reference that looks like a script src, fail; if just a comment listing source modules, warn
      if (html.includes('src="/src') || html.includes('src="./src') || html.includes('href="./src')) {
        fail(`submission index.html contains dev path ${pat} as a live reference`);
      } else {
        warn(`submission index.html mentions ${pat} (likely comment — ensure no live dev paths)`);
      }
    } else {
      fail(`submission index.html contains dev-only reference: ${pat}`);
    }
  }
}

// Report
if (warnings.length) {
  console.log("[validate] warnings:");
  for (const w of warnings) console.log("  ⚠ " + w);
}
if (errors.length) {
  console.error(`[validate] FAIL — ${errors.length} error(s):`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
} else {
  console.log("[validate] PASS — submission looks compliant");
}
