#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  // --port=8080 style
  const pref = args.find((a) => a.startsWith(name + "="));
  if (pref) return pref.split("=")[1];
  return fallback;
}

const dirArg = getArg("--dir", ""); // e.g. dist/submission
const port = parseInt(getArg("--port", "8080"), 10);
const host = "0.0.0.0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", dirArg || "");
if (!fs.existsSync(root)) {
  console.error(`[serve] directory not found: ${root}`);
  process.exit(1);
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const server = http.createServer((req, res) => {
  // Basic security: prevent path traversal
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(root, path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, ""));
  // Ensure filePath is inside root
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found: " + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, host, () => {
  let addrs = [];
  try {
    const nets = os.networkInterfaces();
    for (const ifaces of Object.values(nets)) {
      for (const iface of ifaces || []) {
        if (iface.family === "IPv4" && !iface.internal) addrs.push(iface.address);
      }
    }
  } catch {}
  console.log(`[serve] serving ${root}`);
  console.log(`[serve] local:   http://localhost:${port}/`);
  for (const a of addrs) {
    console.log(`[serve] network: http://${a}:${port}/`);
  }
  console.log(`[serve] Open the network URL on your phone (same Wi-Fi).`);
  if (addrs.length === 0) {
    console.log(`[serve] (no external IPv4 found — check Wi-Fi or use localhost)`);
  }
});
