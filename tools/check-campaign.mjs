#!/usr/bin/env node
// CLI wrapper around the same browser-safe readiness report used by Author Mode.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCampaign } from "../src/author/campaignReadiness.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = JSON.parse(fs.readFileSync(path.join(root, "src/world/data/world.json"), "utf8"));
const report = analyzeCampaign(world);
if (report.errors.length) {
  console.error("[check-campaign] FAIL");
  for (const error of report.errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log("[check-campaign] PASS — route, carried renewable economy, companion identity, finale order, and coarse walkability are coherent.");
for (const section of report.sections) console.log(`${section.id}: XP ${section.xp} (L${section.level}), reachable renewable harvest ${JSON.stringify(section.renewableResources)}`);
for (const warning of report.warnings) console.warn(`[check-campaign] ${warning}`);
