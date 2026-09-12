import test from "node:test";
import assert from "node:assert/strict";
import { createWorldHazardSystem, isInsideKillVolume } from "../src/world/worldHazardSystem.js";

test("retained historical course hazards cannot kill from invisible retired geometry", () => {
  const volume={id:'old-bed',courseId:'retired-course',pos:{x:0,y:0,z:0},size:{w:2,h:2,d:2}};
  let deaths=0;
  const hazards=createWorldHazardSystem({getKillVolumesForSection:()=>[volume]},{getActiveSectionId:()=> 'forest',onFatal:()=>deaths++});
  hazards.update({x:0,y:0,z:0});assert.equal(deaths,0);
  delete volume.courseId;hazards.update({x:0,y:0,z:0});assert.equal(deaths,1,'ordinary visible hazards retain their effect');
});

test("world hazards fire once per entry and reset on a section change", () => {
  let sectionId = "forest";
  const volume = { id: "thorns", pos: { x: 0, y: 0, z: 0 }, size: { w: 2, h: 2, d: 2 } };
  const fatal = [];
  const hazards = createWorldHazardSystem({ getKillVolumesForSection: () => [volume] }, {
    getActiveSectionId: () => sectionId,
    onFatal: event => fatal.push(event),
  });

  hazards.update({ x: 0, y: 0, z: 0 });
  hazards.update({ x: 0, y: 0, z: 0 });
  assert.equal(fatal.length, 1, "remaining inside does not repeatedly resolve death");
  hazards.update({ x: 4, y: 0, z: 0 });
  hazards.update({ x: 0, y: 0, z: 0 });
  assert.equal(fatal.length, 2, "leaving and re-entering is a new hazard entry");

  sectionId = "cliffs";
  hazards.update({ x: 0, y: 0, z: 0 });
  assert.equal(fatal.length, 3, "section changes do not retain the previous section's entry state");
  assert.equal(fatal[2].reason, "fatal_hazard");
});

test("world hazards honor rotated volume bounds", () => {
  const volume = { id: "rotated", pos: { x: 0, y: 1, z: 0 }, size: { w: 2, h: 2, d: 6 }, rotY: Math.PI / 2 };
  assert.equal(isInsideKillVolume({ x: 2.5, y: 1, z: 0 }, volume), true, "long local depth rotates onto world X");
  assert.equal(isInsideKillVolume({ x: 0, y: 1, z: 2.5 }, volume), false, "short local width remains bounded after rotation");
  assert.equal(isInsideKillVolume({ x: 0, y: 2.2, z: 0 }, volume), false, "vertical bounds remain part of the hazard");
});
