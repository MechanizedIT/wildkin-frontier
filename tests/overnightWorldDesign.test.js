import assert from "node:assert/strict";
import { test } from "node:test";
import WORLD_DATA from "../src/world/data/world.generated.js";

const region = (id) => WORLD_DATA.regions.find((entry) => entry.id === id);

function hasRoute(section, id) {
  return section.surface.routes.some((route) => route.id === id);
}

test("the first two expeditions match their independently sized visual and collision islands", () => {
  for (const id of ["section_1", "section_2"]) {
    const section = region(id);
    const {minX,maxX,minZ,maxZ}=section.bounds;
    assert.deepEqual(section.size, { width: maxX-minX, depth: maxZ-minZ });
    assert.ok(section.size.width>=80 && section.size.depth>=80);
    const edges = Object.fromEntries(section.boundaryColliders.map((edge) => [edge.id.split("_").at(-1), edge]));
    assert.equal(edges.north.pos.z, minZ+.5); assert.equal(edges.south.pos.z, maxZ-.5);
    assert.equal(edges.west.pos.x, minX+.5); assert.equal(edges.east.pos.x, maxX-.5);
    assert.equal(edges.north.size.w, section.size.width-1); assert.equal(edges.west.size.d, section.size.depth-1);
  }
});

test("Verdant and Shatterfen retain distinct landmark-led loops", () => {
  const verge = region("section_1"), fen = region("section_2");
  for (const [section, required] of [[verge, ["verdant-low-spine", "verdant-west-hollow", "verdant-upland-ascent", "verdant-upland-descent"]], [fen, ["fen-return-silt", "fen-tidefin-bank", "fen-observatory-high-loop", "fen-far-bank-shoulder", "fen-wreck-return-descent"]]]) {
    for (const id of required) assert.ok(hasRoute(section, id), `${section.id} needs ${id}`);
    assert.ok(section.surface.heights.length >= 3, `${section.id} needs several elevation landmarks`);
    assert.ok(section.surface.water.length >= 2, `${section.id} needs multiple distinct water spaces`);
  }
  assert.deepEqual(verge.majorWaypoints[0].pos.x, -7);
  assert.deepEqual(fen.majorWaypoints[0].pos.x, 23);
  assert.ok(verge.extractionBeacons[0].pos.x < -20, "Verdant extraction should reward its creek loop");
  assert.ok(fen.extractionBeacons[0].pos.z < -10, "Shatterfen extraction should reward the far-bank loop");
});
