#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "submission");
const ZIP = path.join(ROOT, "dist", "submission.zip");

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("[zip] dist/submission/index.html missing — run npm run build first");
  process.exit(1);
}

try {
  // Prefer PowerShell Compress-Archive on Windows; fallback to node archiver if needed
  fs.rmSync(ZIP, { force: true });
  // Use PowerShell if available
  const psCmd = `Compress-Archive -Path "${OUT}\\*" -DestinationPath "${ZIP}" -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: "inherit" });
  const size = fs.statSync(ZIP).size;
  console.log(`[zip] created ${path.relative(ROOT, ZIP)} (${(size/1024).toFixed(1)} KB, ${(size/1024/1024).toFixed(2)} MB)`);
  if (size > 35 * 1024 * 1024) console.error("[zip] WARNING: ZIP exceeds 35 MB limit!");
} catch (e) {
  console.error("[zip] PowerShell Compress-Archive failed, trying 7z/node fallback");
  console.error(e.message);
  process.exit(1);
}
