#!/usr/bin/env node
/**
 * Phase 0 submission builder
 * - Creates dist/submission with index.html at root
 * - Inlines first-party JS/CSS into index.html (readable, unminified)
 * - Copies /vendor and /assets relatively
 * - Keeps third-party (Three.js) in /vendor via relative path
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "submission");

function readFile(p) {
  return fs.readFileSync(p, "utf-8");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function inlineCss(cssPath) {
  const css = readFile(cssPath);
  return `<style>\n${css}\n</style>`;
}

// Collect JS modules in dependency order by following imports from src/main.js
// For Phase 0 we know the graph explicitly; use simple ordered list.
const JS_MODULES = [
  "src/game/createCamera.js",
  "src/game/createRenderer.js",
  "src/game/createScene.js",
  "src/main.js",
];

function stripImportExportForInline(code, modulePath) {
  let out = code;

  // Remove import lines for "three" — we will keep vendor import via importmap
  // Keep other first-party imports by stripping them (they are inlined separately)
  out = out.replace(/^\s*import\s+.*from\s+["'].*["'];?\s*$/gm, (match) => {
    // Keep a comment so readability remains and we can spot what was inlined
    return `// inlined: ${match.trim()}`;
  });

  // Remove `export` keyword but keep declarations readable
  out = out.replace(/^\s*export\s+(?=(const|let|var|function|class|async))/gm, "");
  out = out.replace(/^\s*export\s*\{\s*[^}]*\}\s*;?\s*$/gm, "// exports inlined");
  out = out.replace(/^\s*export\s+default\s+/gm, "// default export inlined\n");

  // Add header comment per file
  const header = `\n// ── ${modulePath} ──\n`;
  return header + out;
}

function build() {
  // Clean output
  fs.rmSync(OUT, { recursive: true, force: true });
  ensureDir(OUT);

  // 1. Copy vendor and assets
  copyDir(path.join(ROOT, "vendor"), path.join(OUT, "vendor"));
  if (fs.existsSync(path.join(ROOT, "assets"))) {
    copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));
  }

  // 2. Read CSS
  const cssPath = path.join(ROOT, "styles", "game.css");
  let cssInline = "";
  if (fs.existsSync(cssPath)) {
    cssInline = inlineCss(cssPath);
  }

  // 3. Inline JS — readable, unminified
  let jsBundle = "";
  for (const rel of JS_MODULES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      console.error(`[build] missing module: ${rel}`);
      process.exit(1);
    }
    const raw = readFile(abs);
    jsBundle += stripImportExportForInline(raw, rel) + "\n";
  }

  // 4. Build submission index.html
  // Keep Three.js in /vendor via importmap, first-party code is inlined as a single module script.
  const submissionHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#0e1420" />
    <title>Frontier Prototype — Phase 0</title>
    ${cssInline}
    <script type="importmap">
      {
        "imports": {
          "three": "./vendor/three.module.js"
        }
      }
    </script>
  </head>
  <body>
    <div id="app" aria-label="Game canvas container">
      <canvas id="c" aria-label="3D scene"></canvas>
      <div id="hud" aria-hidden="false">
        <div class="hud-top">
          <div class="badge">
            <strong>FRONTIER — Phase 0</strong>
            <small>Portrait · Three.js · Offline</small>
          </div>
          <div class="badge" style="text-align: right">
            <strong style="font-size: 11px">No gameplay yet</strong>
            <small>Foundation only</small>
          </div>
        </div>
        <div class="hud-bottom">
          <div id="debug-label">Phase 0 — 0.1.0 · starting…</div>
          <div class="hud-hint">High third-person camera · placeholder island</div>
        </div>
      </div>
    </div>
    <script type="module">
// Submission build — first-party code inlined readable, unminified (Phase 0)
// Source modules: ${JS_MODULES.join(", ")}
import * as THREE from "three";
${jsBundle}
// ── bootstrap (from src/main.js inlined above) ──
// The inlined main.js already executed its top-level bootstrap because
// its code is now in this single module scope. No extra wrapper needed.
// Note: createCamera/createRenderer/createScene are now in scope.
</script>
  </body>
</html>
`;

  // The inlined main.js expects DOMContent? It runs immediately; ensure #app exists — it does because script is after body.
  // However the jsBundle includes the main.js bootstrap that queries document.getElementById before load — it will work since DOM is already parsed.

  fs.writeFileSync(path.join(OUT, "index.html"), submissionHtml, "utf-8");

  // 5. Size report
  const stats = fs.statSync(path.join(OUT, "index.html"));
  const vendorSize = fs.existsSync(path.join(OUT, "vendor", "three.module.js"))
    ? fs.statSync(path.join(OUT, "vendor", "three.module.js")).size
    : 0;
  console.log(`[build] wrote ${path.relative(ROOT, path.join(OUT, "index.html"))} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`[build] vendor/three.module.js ${(vendorSize / 1024).toFixed(1)} KB`);
  console.log(`[build] submission dir: ${path.relative(ROOT, OUT)}`);

  // 6. Recommend zip
  console.log(`[build] next: npm run validate  |  npm run zip`);
}

build();
