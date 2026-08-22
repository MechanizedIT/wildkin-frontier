#!/usr/bin/env node
/**
 * Submission builder — bundles first-party ESM via esbuild module graph and
 * inlines the readable bundle into dist/submission/index.html.
 *
 * Requirements (Phase 0.5):
 * - bundle src/main.js
 * - minify false, sourcemap false, format esm, keep "three" external
 * - inline readable bundle into submission index.html
 * - vendor/three.module.js remains served relatively via importmap
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "submission");

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

async function build() {
  // 1. Clean output
  fs.rmSync(OUT, { recursive: true, force: true });
  ensureDir(OUT);

  // 2. Copy vendor and assets (relative, offline)
  copyDir(path.join(ROOT, "vendor"), path.join(OUT, "vendor"));
  if (fs.existsSync(path.join(ROOT, "assets"))) {
    copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));
  }
  // Copy third-party provenance to submission if present
  if (fs.existsSync(path.join(ROOT, "THIRD_PARTY_NOTICES.md"))) {
    fs.copyFileSync(path.join(ROOT, "THIRD_PARTY_NOTICES.md"), path.join(OUT, "THIRD_PARTY_NOTICES.md"));
  }

  // 3. Read CSS (inlined readable — no minification)
  const cssPath = path.join(ROOT, "styles", "game.css");
  let cssInline = "";
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, "utf-8");
    cssInline = `<style>\n${css}\n</style>`;
  }

  // 4. Bundle first-party ESM via esbuild module graph
  //    Robust: follows imports from src/main.js automatically; no hard-coded module list.
  const entry = path.join(ROOT, "src", "main.js");
  if (!fs.existsSync(entry)) {
    console.error(`[build] missing entry: src/main.js`);
    process.exit(1);
  }

  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    minify: false,
    sourcemap: false,
    external: ["three", "rapier", "@dimforge/rapier3d-compat"],
    target: "esnext",
    legalComments: "inline",
    charset: "utf8",
    write: false,
    logLevel: "info",
  });

  if (!result.outputFiles || result.outputFiles.length === 0) {
    console.error("[build] esbuild produced no output");
    process.exit(1);
  }
  const jsBundle = result.outputFiles[0].text;

  // Basic readability guard — submission validator requires readable tokens
  for (const token of ["createScene", "createCamera", "createRenderer"]) {
    if (!jsBundle.includes(token)) {
      console.error(`[build] bundled output missing expected token: ${token}`);
      process.exit(1);
    }
  }

  // 5. Build submission index.html — first-party bundle inlined as a single module script
  //    Three.js stays external via importmap → ./vendor/three.module.js at runtime.
  //    Read current index.html for title/hud sync, but fallback to Phase 1 defaults.
  const submissionHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#0e1420" />
    <title>Wildkin Frontier — Phase 3.5A</title>
    ${cssInline}
    <script type="importmap">
      {
        "imports": {
          "three": "./vendor/three.module.js",
          "rapier": "./vendor/rapier.js",
          "@dimforge/rapier3d-compat": "./vendor/rapier.js"
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
            <strong>WILDKIN FRONTIER — Phase 3.5A</strong>
            <small>World Data · Regions · Expedition Session</small>
          </div>
          <div class="badge" style="text-align: right">
            <strong style="font-size: 11px">Left: move · Right: Tap attack / Swipe dodge</strong>
            <small>C=Sneak · Shift=Run · Space=dodge · F/Click=attack</small>
          </div>
        </div>
        <div class="hud-bottom">
          <div id="debug-label">Phase 3.5A — 0.9.0 · starting…</div>
          <div class="hud-hint">White ring = harvest · Orange ring = will hit · Tap: attack Swipe: dodge · Regions: see debug</div>
        </div>
      </div>
    </div>
    <script type="module">
// Submission build — first-party bundle (readable, unminified) via esbuild
// Entry: src/main.js  |  external: three → ./vendor/three.module.js, rapier → ./vendor/rapier.js
${jsBundle}
</script>
  </body>
</html>
`;

  fs.writeFileSync(path.join(OUT, "index.html"), submissionHtml, "utf-8");

  const stats = fs.statSync(path.join(OUT, "index.html"));
  const vendorSize = fs.existsSync(path.join(OUT, "vendor", "three.module.js"))
    ? fs.statSync(path.join(OUT, "vendor", "three.module.js")).size
    : 0;
  const rapierSize = fs.existsSync(path.join(OUT, "vendor", "rapier.js"))
    ? fs.statSync(path.join(OUT, "vendor", "rapier.js")).size
    : 0;
  console.log(`[build] wrote ${path.relative(ROOT, path.join(OUT, "index.html"))} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`[build] vendor/three.module.js ${(vendorSize / 1024).toFixed(1)} KB`);
  console.log(`[build] vendor/rapier.js ${(rapierSize / 1024).toFixed(1)} KB`);
  console.log(`[build] submission dir: ${path.relative(ROOT, OUT)}`);
  console.log(`[build] next: npm run validate  |  npm run zip`);
}

build().catch((err) => {
  console.error("[build] failed:");
  console.error(err);
  process.exit(1);
});
