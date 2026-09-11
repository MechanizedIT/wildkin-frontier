import assert from "node:assert/strict";
import { test } from "node:test";
import WORLD_DATA from "../src/world/data/world.generated.js";

const region = (id) => WORLD_DATA.regions.find((entry) => entry.id === id);

function hasRoute(section, id) {
  return section.surface.routes.some((route) => route.id === id);
}

test("the first two expeditions use matched 80-unit visual and collision islands", () => {
  for (const id of ["section_1", "section_2"]) {
    const section = region(id);
    assert.deepEqual(section.size, { width: 80, depth: 80 });
    assert.deepEqual(section.bounds, { minX: -40, maxX: 40, minZ: -40, maxZ: 40 });
    const edges = Object.fromEntries(section.boundaryColliders.map((edge) => [edge.id.split("_").at(-1), edge]));
    assert.equal(edges.north.pos.z, -39.5); assert.equal(edges.south.pos.z, 39.5);
    assert.equal(edges.west.pos.x, -39.5); assert.equal(edges.east.pos.x, 39.5);
    assert.equal(edges.north.size.w, 79); assert.equal(edges.west.size.d, 79);
  }
});

test("Verdant and Shatterfen retain distinct landmark-led loops", () => {
  const verge = region("section_1"), fen = region("section_2");
  for (const [section, required] of [[verge, ["verge-ridgeway", "verge-mossling-creek", "verge-ore-shelf", "verge-root-hollow-shortcut"]], [fen, ["fen-zigzag-causeway", "observatory-island-spur", "far-bank-route"]]]) {
    for (const id of required) assert.ok(hasRoute(section, id), `${section.id} needs ${id}`);
    assert.ok(section.surface.heights.length >= 3, `${section.id} needs several elevation landmarks`);
    assert.ok(section.surface.water.length >= 2, `${section.id} needs multiple distinct water spaces`);
  }
  assert.deepEqual(verge.majorWaypoints[0].pos.x, -7);
  assert.deepEqual(fen.majorWaypoints[0].pos.x, 23);
  assert.ok(verge.extractionBeacons[0].pos.x < -20, "Verdant extraction should reward its creek loop");
  assert.ok(fen.extractionBeacons[0].pos.z < -10, "Shatterfen extraction should reward the far-bank loop");
});
