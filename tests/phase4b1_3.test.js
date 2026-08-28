import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  captureAuthorCameraProjection,
  getAuthorEditorFarPlane,
  getAuthorSectionViewMetrics,
  getNextAuthorZoomDistance,
  normalizeAuthorWheelDelta,
  restoreAuthorCameraProjection,
} from "../src/author/authorMode.js";
import WORLD_DATA from "../src/world/data/world.js";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("Phase 4B.1.3 — Author camera closure", () => {
  it("derives framing metrics from the selected section bounds", () => {
    const regions = new Map(WORLD_DATA.regions.map((region) => [region.id, region]));
    assert.equal(getAuthorSectionViewMetrics(regions.get("camp")).span, 100);
    assert.equal(getAuthorSectionViewMetrics(regions.get("section_1")).span, 50);
    assert.equal(getAuthorSectionViewMetrics(regions.get("section_2")).span, 50);
    assert.deepEqual(
      getAuthorSectionViewMetrics({ bounds: { minX: -10, maxX: 30, minZ: -5, maxZ: 5 } }),
      { minX: -10, maxX: 30, minZ: -5, maxZ: 5, centerX: 10, centerZ: 0, width: 40, depth: 10, span: 40 },
    );
  });

  it("normalizes pixel, line, and page wheel units and clamps outliers", () => {
    assert.equal(normalizeAuthorWheelDelta(2, 0), 2);
    assert.equal(normalizeAuthorWheelDelta(2, 1), 32);
    assert.equal(normalizeAuthorWheelDelta(2, 2), 120);
    assert.equal(normalizeAuthorWheelDelta(9999, 0), 120);
    assert.equal(normalizeAuthorWheelDelta(-9999, 0), -120);
  });

  it("uses smooth distance-relative zoom with hard section-local bounds", () => {
    const min = 6;
    const max = 160;
    assert.equal(getNextAuthorZoomDistance(40, 0, min, max), 40);
    assert.ok(getNextAuthorZoomDistance(40, 2, min, max) > 40);
    assert.ok(getNextAuthorZoomDistance(40, -2, min, max) < 40);
    let zoomedOut = 40;
    let zoomedIn = 40;
    for (let i = 0; i < 40; i += 1) {
      zoomedOut = getNextAuthorZoomDistance(zoomedOut, 9999, min, max);
      zoomedIn = getNextAuthorZoomDistance(zoomedIn, -9999, min, max);
    }
    assert.equal(zoomedOut, max);
    assert.equal(zoomedIn, min);
    assert.ok(getNextAuthorZoomDistance(40, 100, min, max) < 60, "one wheel notch should not jump by the old span-linear amount");
  });

  it("captures and restores the complete gameplay projection", () => {
    let updates = 0;
    const camera = { near: 0.15, far: 90, fov: 62, updateProjectionMatrix() { updates += 1; } };
    const snapshot = captureAuthorCameraProjection(camera);
    camera.near = 0.5;
    camera.far = getAuthorEditorFarPlane(320, 100);
    camera.fov = 48;
    restoreAuthorCameraProjection(camera, snapshot);
    assert.deepEqual(snapshot, { near: 0.15, far: 90, fov: 62 });
    assert.deepEqual({ near: camera.near, far: camera.far, fov: camera.fov }, snapshot);
    assert.equal(updates, 1);
    assert.ok(getAuthorEditorFarPlane(320, 100) > 320);
  });

  it("keeps camera movement handlers free of full visibility synchronization", () => {
    const source = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf8");
    const pointerMove = source.match(/canvas\.addEventListener\("pointermove",[\s\S]*?\n    \}, true\);/)?.[0] ?? "";
    const mouseMove = source.match(/canvas\.addEventListener\("mousemove",[\s\S]*?\n    \}, true\);/)?.[0] ?? "";
    const wheel = source.match(/canvas\.addEventListener\("wheel",[\s\S]*?\n    \}, \{ passive: false \}\);/)?.[0] ?? "";
    for (const handler of [pointerMove, mouseMove, wheel]) assert.doesNotMatch(handler, /updateEditorVisibility/);
    assert.match(source, /onFocusRegion:\s*\(regionId\)/);
    assert.match(source, /focusLevelEditorTarget\(pos\.x, pos\.z\)/);
    assert.doesNotMatch(source, /getWorldExtents[\s\S]{0,220}levelViewState/);
  });
});
