import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.GALLERY_URL ?? "http://localhost:8080/.dream-loop/asset-gallery.html";
const label = process.argv[2] ?? "asset-baseline";
if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Use a lowercase, hyphenated capture label.");
const out = `.dream-loop/${label}`;
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__assetGallery?.ready === true || window.__assetGallery?.error, { timeout: 30000 });
  const failure=await page.evaluate(()=>window.__assetGallery?.error);if(failure)throw new Error(failure);
  const families = await page.evaluate(() => window.__assetGallery.families);
  const combined = { source: base, families: {}, assets: [], errors };
  for (const family of families) {
    const url = new URL(base); url.searchParams.set("family", family);
    await page.goto(url.toString(), { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__assetGallery?.ready === true, { timeout: 30000 });
    const metrics = await page.evaluate(() => window.__assetGallery.metrics);
    combined.families[family] = metrics.families[family];
    combined.assets.push(...metrics.assets);
    await page.screenshot({ path: `${out}/${slug(family)}.png`, fullPage: true });
  }
  combined.errors.push(...errors);
  await writeFile(`${out}/metrics.json`, JSON.stringify(combined, null, 2));
  if (errors.length) throw new Error(errors.join(" | "));
  console.log(JSON.stringify({ families: combined.families, assets: combined.assets.length }, null, 2));
} catch(error) {
  console.error(JSON.stringify({errors,message:error.message}));throw error;
} finally {
  await browser.close();
}
