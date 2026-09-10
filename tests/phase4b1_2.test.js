import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { AUTHOR_CAMERA_SYNC_POLICY } from "../src/author/authorMode.js";
import { createSectionRuntime } from "../src/world/sectionRuntime.js";
import WORLD_DATA from "./fixtures/phase4b1ProofWorld.generated.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("Phase 4B.1.2 — Author performance closure", () => {
  it("keeps repeated SectionRuntime activation idempotent", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const groups = new Map([["section_1", { visible: true }], ["section_2", { visible: true }]]);
    let playgroundActivations = 0;
    let physicsActivations = 0;
    let changes = 0;
    const runtime = createSectionRuntime({
      worldRegistry: registry,
      playground: { sectionGroups: groups, setActiveSection() { playgroundActivations += 1; } },
      physicsWorld: { setActiveSection() { physicsActivations += 1; } },
      onChange() { changes += 1; },
    });

    const first = runtime.activate("section_1");
    const repeat = runtime.activate("section_1");
    const second = runtime.activate("section_2");

    assert.equal(first.changed, true);
    assert.equal(repeat.changed, false);
    assert.equal(second.changed, true);
    assert.equal(playgroundActivations, 2);
    assert.equal(physicsActivations, 2);
    assert.equal(changes, 2);
  });

  it("declares camera operations as camera-only and removes full sync from the loop/handlers", () => {
    assert.deepEqual(AUTHOR_CAMERA_SYNC_POLICY, { pan: false, orbit: false, zoom: false });
    const authorSource = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf8");
    const mainSource = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");
    assert.doesNotMatch(mainSource, /authorSuppress[\s\S]{0,180}updateEditorVisibility\(\)/);
    const pointerMove = authorSource.match(/canvas\.addEventListener\("pointermove",[\s\S]*?\n    \}, true\);/)?.[0] ?? "";
    const mouseMove = authorSource.match(/canvas\.addEventListener\("mousemove",[\s\S]*?\n    \}, true\);/)?.[0] ?? "";
    const wheel = authorSource.match(/canvas\.addEventListener\("wheel",[\s\S]*?\n    \}, \{ passive: false \}\);/)?.[0] ?? "";
    for (const handler of [pointerMove, mouseMove, wheel]) assert.doesNotMatch(handler, /updateEditorVisibility/);
  });
});
