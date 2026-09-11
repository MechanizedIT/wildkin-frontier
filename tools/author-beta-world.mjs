#!/usr/bin/env node
// Deterministic, hand-composed Early Access campaign data. Run after changing this
// file: node tools/author-beta-world.mjs && npm run world:generate
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSurfaceHeight } from "../src/world/terrainSurfaceModel.js";
import { meshRecipePart } from './mesh-recipe.mjs';
import {VISUAL_KIT_BUILDERS} from './visual-kit-registry.mjs';
import {composeLandscapeArt} from './compose-landscape-art.mjs';
import {registerStationAssets} from './register-station-assets.mjs';
import {composeOvernightHabitats} from './compose-overnight-habitats.mjs';
import {normalizeCampaignHarvestCollision} from './normalize-harvest-collision.mjs';
import {composeFoundryHabitat} from './compose-foundry-habitat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORLD_PATH = path.join(ROOT, "src/world/data/world.json");
const world = JSON.parse(fs.readFileSync(WORLD_PATH, "utf8"));
const TAU = Math.PI * 2;
const p = (x, z, y = 0) => ({ x, y, z });
const part = (id, shape, x, y, z, sx, sy, sz, color, ry = 0) => ({ id, shape, position: { x, y, z }, rotation: { x: 0, y: ry, z: 0 }, scale: { x: sx, y: sy, z: sz }, color });
// Use only where a part needs a non-upright pose. The legacy `part` final
// argument remains Y rotation so existing authored foliage stays unchanged.
const partR = (id, shape, x, y, z, sx, sy, sz, color, rotation = {}) => ({ id, shape, position: { x, y, z }, rotation: { x: rotation.x ?? 0, y: rotation.y ?? 0, z: rotation.z ?? 0 }, scale: { x: sx, y: sy, z: sz }, color });
const recipe = (id, displayName, category, parts, gameplay = { role: "prop" }, collision = null) => ({ id, displayName, category, version: 1, parts, collision, gameplay });
const coll = (w, h, d, y = h / 2) => ({ shape: "box", offset: { x: 0, y, z: 0 }, size: { w, h, d } });

function asset(id, name, category, parts, gameplay, collision) {
  const next = recipe(id, name, category, parts, gameplay, collision);
  const existing = world.visualAssets.findIndex((entry) => entry.id === id);
  if (existing !== -1 && world.visualAssets[existing].model) {
    next.model = world.visualAssets[existing].model;
    next.parts = [];
  }
  if (existing === -1) world.visualAssets.push(next);
  else world.visualAssets[existing] = next;
}
function prop(id, visualAssetId, x, z, scale = 1, rotY = 0, collisionEnabled = false) {
  return { id, subtype: "visualAsset", visualAssetId, pos: p(x, z), rotY, uniformScale: scale, visibleInPlay: true, collisionEnabled, opacity: 1 };
}
function res(id, type, x, z, level = 1) { return { id, type, level, pos: p(x, z) }; }
function wild(id, assetId, x, z, scale = 1, rotY = 0) { return prop(id, assetId, x, z, scale, rotY, true); }
function boundary(id, x, z, w, d) { return { id, pos: p(x, z), size: { w, h: 3, d }, rotY: 0, color: "#273447", opacity: 0.22, visibleInPlay: false, collisionEnabled: true }; }
function shell(id, displayName, groundColor) {
  return {
    id, displayName, sectionType: "expedition", size: { width: 50, depth: 50 }, bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 }, neighbors: [], pockets: [],
    ground: { type: "plain", color: groundColor }, groundPatches: [{ id: `ground_${id}`, pos: p(0, 0, -0.5), size: { w: 50, h: 0.5, d: 50 }, color: groundColor, opacity: 1, visibleInPlay: true, collisionEnabled: true, rotY: 0 }],
    boundaryColliders: [boundary(`boundary_${id}_north`, 0, -24.5, 49, .5), boundary(`boundary_${id}_south`, 0, 24.5, 49, .5), boundary(`boundary_${id}_west`, -24.5, 0, .5, 49), boundary(`boundary_${id}_east`, 24.5, 0, .5, 49)],
    props: [], resources: [], creatures: [], majorWaypoints: [], extractionBeacons: [], pois: [], traversal: { platforms: [], obstacles: [], climbables: [], jumpTraversals: [] }, entryPoints: [], portalGates: [], jumpPads: [], parkourStarts: [], parkourCheckpoints: [], parkourEnds: [], parkourCourseZones: [], killVolumes: [], lootChests: [], sectionProfile: null,
  };
}
// Regions are authored as local islands. Bigger expeditions remain bounded,
// but their square footprint is explicit rather than inferred by each placement
// call. Rebuild all four edges together so visual limits and Rapier blockers
// always describe the same playable floor.
function resizeSection(section, width, depth = width) {
  const halfX = width / 2, halfZ = depth / 2;
  const edgeX = halfX - .5, edgeZ = halfZ - .5;
  section.size = { width, depth };
  section.bounds = { minX: -halfX, maxX: halfX, minZ: -halfZ, maxZ: halfZ };
  section.groundPatches = [{ id: `ground_${section.id}`, pos: p(0, 0, -.5), size: { w: width, h: .5, d: depth }, color: section.ground.color, opacity: 1, visibleInPlay: true, collisionEnabled: true, rotY: 0 }];
  section.boundaryColliders = [
    boundary(`boundary_${section.id}_north`, 0, -edgeZ, width - 1, .5), boundary(`boundary_${section.id}_south`, 0, edgeZ, width - 1, .5),
    boundary(`boundary_${section.id}_west`, -edgeX, 0, .5, depth - 1), boundary(`boundary_${section.id}_east`, edgeX, 0, .5, depth - 1),
  ];
}
function marker(section, x, z, id, type, courseId = null) {
  const obj = { id, pos: p(x, z), rotY: 0, triggerRadius: 1.6 };
  if (courseId) obj.courseId = courseId;
  if (type === "start" || type === "checkpoint") { obj.respawnPosition = p(x, z); obj.respawnFacingYaw = Math.PI; }
  section[type === "start" ? "parkourStarts" : type === "checkpoint" ? "parkourCheckpoints" : "parkourEnds"].push(obj);
}
function chest(id, name, x, z, table, secret = false, courseId = null, refillSeconds = null) {
  const c = { id, displayName: name, pos: p(x, z), rotY: 0, lootTableId: table, refillSeconds, triggerRadius: 1.4, secret, visualAssetId: "asset_chest" };
  if (courseId) c.courseId = courseId;
  return c;
}
function gate(id, name, x, z, targetSectionId, targetEntryId, targetGateId, level, resources) {
  return { id, displayName: name, pos: p(x, z), rotY: 0, targetSectionId, targetEntryId, targetGateId, state: "ruined", triggerRadius: 1.85, visualAssetId: "asset_ruin_arch", uniformScale: .72, requirements: { minPlayerLevel: level, resources } };
}
function lootTable(id, displayName, rewards) {
  const next = { id, displayName, rewards };
  const index = world.lootTables.findIndex((entry) => entry.id === id);
  if (index === -1) world.lootTables.push(next); else world.lootTables[index] = next;
}

// Distinct field-drop silhouettes carry through from resource node to pickup,
// inventory and costs whenever the runtime requests a drop visual asset.
asset('asset_drop_wood', 'Split Frontier Logs', 'Resource Drops', [partR('log_a','cylinder',-.18,.3,0,.22,1.15,.22,'#855032',{z:Math.PI/2}),partR('log_b','cylinder',.2,.26,.08,.19,.9,.19,'#b87948',{z:Math.PI/2}),part('cut','cylinder',-.74,.3,0,.23,.04,.23,'#f2c17b',Math.PI/2)]);
asset('asset_drop_stone', 'Pale Field Stone', 'Resource Drops', [part('body','icosahedron',0,.35,0,.78,.64,.68,'#a9b9b3'),part('facet','icosahedron',.26,.55,.3,.28,.22,.18,'#d8e3d5')]);
asset('asset_drop_fiber', 'Gathered Fiber', 'Resource Drops', [partR('blade_a','cone',-.16,.36,0,.1,.72,.1,'#79c663',{z:-.35}),partR('blade_b','cone',.08,.42,0,.1,.84,.1,'#a5db74',{z:.18}),partR('blade_c','cone',.25,.3,0,.08,.62,.08,'#4e9b58',{z:.46})]);
asset('asset_drop_berries', 'Sunberry Cluster', 'Resource Drops', [part('leaf','sphere',0,.3,0,.52,.1,.36,'#427b48'),part('berry_a','sphere',-.2,.5,.05,.25,.25,.25,'#e85d68'),part('berry_b','sphere',.2,.48,.04,.24,.24,.24,'#d63e57'),part('berry_c','sphere',0,.67,.08,.22,.22,.22,'#ff8e7c')]);
asset('asset_drop_iron_ore', 'Iron Vein', 'Resource Drops', [part('rock','icosahedron',0,.42,0,.85,.72,.7,'#657989'),part('vein_a','box',-.18,.5,.55,.15,.48,.08,'#b7d7df',-.3),part('vein_b','box',.25,.44,.53,.12,.38,.07,'#91b7c9',.2)]);
asset('asset_drop_crystal', 'Resonance Crystal', 'Resource Drops', [part('shard','cone',0,.62,0,.36,1.24,.36,'#63e5e7'),part('shard_l','cone',-.3,.4,.06,.19,.8,.19,'#9efff0',-.22),part('shard_r','cone',.3,.34,.05,.17,.68,.17,'#3fbcd2',.2)]);
for (const [id, visualAssetId] of Object.entries({ wood:'asset_drop_wood', stone:'asset_drop_stone', fiber:'asset_drop_fiber', berries:'asset_drop_berries', iron_ore:'asset_drop_iron_ore', crystal_shard:'asset_drop_crystal' })) { const drop = world.resourceDrops.find((entry) => entry.id === id); if (drop) drop.visualAssetId = visualAssetId; }
// New silhouettes: every recipe is deliberately assembled from the existing primitive vocabulary.
asset("asset_verge_canopy", "Verdant Canopy", "Verdant Ecology", [part("trunk", "cylinder", 0, 1.5, 0, .42, 3, .42, "#65442b"), part("crown_a", "icosahedron", -.55, 3.1, 0, 1.5, 1.25, 1.3, "#356d45"), part("crown_b", "icosahedron", .62, 3.35, .1, 1.35, 1.5, 1.25, "#4f914f"), part("crown_top", "icosahedron", 0, 4.25, 0, 1.2, 1.1, 1.1, "#70ad55")], { role: "prop" }, coll(1.1, 3.2, 1.1, 1.6));
// These are separate authored recipes, then replaced by the focused kit bake.
// They give composition a broad frame tree and a narrow tall tree without an
// id-specific runtime rendering path.
asset("asset_verge_canopy_spread", "Verdant Spread Canopy", "Verdant Ecology", [part("placeholder", "icosahedron", 0, 1, 0, 1, 1, 1, "#2f7044")], { role: "prop" });
asset("asset_verge_canopy_tall", "Verdant Tall Canopy", "Verdant Ecology", [part("placeholder", "icosahedron", 0, 1, 0, 1, 1, 1, "#347c48")], { role: "prop" });
asset("asset_mushroom_ring", "Mooncap Mushroom Ring", "Verdant Ecology", [part("stalk", "cylinder", 0, .35, 0, .13, .7, .13, "#d9c5a5"), part("cap", "sphere", 0, .75, 0, .62, .25, .62, "#9f75cf"), part("small_a", "sphere", .58, .28, .28, .32, .16, .32, "#ba8ee0"), part("small_b", "sphere", -.5, .2, -.25, .28, .14, .28, "#ba8ee0")]);
asset("asset_fen_reed", "Shatterfen Reed Cluster", "Fen Ecology", [part("reed_a", "cylinder", -.28, .85, 0, .07, 1.7, .07, "#8dbb86", .18), part("reed_b", "cylinder", .05, 1.05, .1, .06, 2.1, .06, "#b5d78e", -.16), part("reed_c", "cylinder", .3, .72, -.08, .07, 1.45, .07, "#759f7e", .25), part("flower", "sphere", .05, 2.05, .1, .2, .2, .2, "#b8eefa")]);
asset("asset_fen_stone", "Shatterfen Standing Stone", "Fen Ecology", [part("stone", "icosahedron", 0, 1.15, 0, .75, 2.25, .6, "#4f6680", .15), part("vein", "box", 0, 1.2, .55, .16, 1.5, .08, "#7fd3dd")], { role: "prop" }, coll(1.2, 2.3, 1, 1.15));
asset("asset_ember_spire", "Emberfall Spire", "Ember Ecology", [part("base", "icosahedron", 0, .45, 0, 1.2, .8, 1, "#3f3035"), part("spire", "cone", 0, 1.9, 0, .72, 3.1, .72, "#8e4038"), part("ember", "sphere", 0, 2.6, .42, .28, .28, .28, "#ffb54a")], { role: "prop" }, coll(1.3, 3.3, 1.3, 1.65));
asset("asset_ember_bloom", "Cinder Bloom", "Ember Ecology", [part("stem", "cylinder", 0, .45, 0, .12, .9, .12, "#5d4032"), part("petal_a", "cone", -.24, .98, 0, .32, .55, .32, "#ff714b", .4), part("petal_b", "cone", .24, .98, 0, .32, .55, .32, "#f4a340", -.4), part("core", "sphere", 0, 1.08, 0, .22, .22, .22, "#ffe27a")]);
asset("asset_wind_arch", "Windscar Stone Needle", "Cliff Ecology", [part("shaft", "cone", 0, 2.35, 0, .8, 4.4, .8, "#667887"), part("band", "cylinder", 0, 2.5, 0, .66, .12, .66, "#d1c48c")], { role: "prop" }, coll(1.2, 4.4, 1.2, 2.2));
asset("asset_cloudflower", "Cloudflower", "Cliff Ecology", [part("stem", "cylinder", 0, .42, 0, .09, .84, .09, "#76976b"), part("petal_a", "icosahedron", .28, .88, 0, .36, .18, .36, "#d7edff"), part("petal_b", "icosahedron", -.28, .88, 0, .36, .18, .36, "#d7edff"), part("core", "sphere", 0, .92, 0, .16, .16, .16, "#f4da67")]);
asset("asset_heartwood_tree", "Heartwood Ancient", "Vault Ecology", [part("trunk", "cylinder", 0, 2.2, 0, .7, 4.4, .7, "#52323a"), partR("root_l", "cone", -.8, .45, .15, .45, 1.4, .45, "#70434b", { z: .92 }), partR("root_r", "cone", .8, .45, -.1, .45, 1.4, .45, "#70434b", { z: -.92 }), part("crown", "icosahedron", 0, 4.9, 0, 1.9, 1.5, 1.7, "#b84e7a"), part("core", "sphere", 0, 3.3, .55, .35, .35, .35, "#ffb1cb")], { role: "prop" }, coll(1.5, 4.5, 1.5, 2.25));
asset("asset_vault_barrier", "Resonant Barrier", "Vault Structures", [part("left", "box", -.75, 1.1, 0, .25, 2.2, .35, "#486378"), part("right", "box", .75, 1.1, 0, .25, 2.2, .35, "#486378"), part("seal", "sphere", 0, 1.15, 0, .72, .95, .18, "#78dcea"), part("rune", "cylinder", 0, 1.15, .22, .44, .1, .1, "#ecffff")], { role: "prop" }, coll(1.8, 2.2, .45, 1.1));
asset("asset_sanctuary_totem", "Wildkin Sanctuary Totem", "Camp", [part("post", "cylinder", 0, 1.2, 0, .28, 2.4, .28, "#72503e"), part("orb", "sphere", 0, 2.45, 0, .48, .48, .48, "#83e0ba"), part("ring", "cylinder", 0, 1.8, 0, .58, .1, .58, "#e5c472")]);
asset("asset_workshop_awning", "Frontier Workshop Awning", "Camp", [part("post_l", "cylinder", -.9, 1.1, 0, .12, 2.2, .12, "#6f4a34"), part("post_r", "cylinder", .9, 1.1, 0, .12, 2.2, .12, "#6f4a34"), part("roof", "box", 0, 2.3, 0, 2.3, .2, 1.4, "#d6a45a"), part("lamp", "sphere", 0, 1.95, .35, .18, .18, .18, "#ffdd7a")]);
asset("asset_path_lantern", "Frontier Path Lantern", "Camp", [part("post", "cylinder", 0, .72, 0, .08, 1.44, .08, "#594437"), part("cap", "cone", 0, 1.46, 0, .3, .2, .3, "#d9b867"), part("light", "sphere", 0, 1.18, 0, .22, .26, .22, "#ffe89a")]);
asset("asset_pebble_cluster", "Pebble Cluster", "Ground Detail", [part("stone_a", "icosahedron", -.25, .1, 0, .38, .2, .28, "#71807a", .25), part("stone_b", "icosahedron", .22, .08, .16, .27, .16, .25, "#9aa49a", -.2), part("stone_c", "icosahedron", .08, .06, -.28, .2, .12, .18, "#596b68")]);
asset("asset_fallen_log", "Mossy Fallen Log", "Verdant Ecology", [partR("log", "cylinder", 0, .34, 0, .38, 2.6, .38, "#694631", { z: Math.PI / 2 }), part("moss", "icosahedron", 0, .57, 0, 1.1, .16, .45, "#78a654"), part("cap", "sphere", -.75, .57, .22, .25, .12, .25, "#d4b465")]);
asset("asset_fen_lily", "Fen Lily Cluster", "Fen Ecology", [part("pad_a", "sphere", -.25, .05, 0, .62, .06, .5, "#5c9b7d"), part("pad_b", "sphere", .3, .05, .15, .5, .05, .42, "#4b836e"), part("flower", "cone", 0, .33, 0, .22, .5, .22, "#f0b4d6")]);
// Purpose-built return portal: a readable negative-space arch with a luminous
// field behind it.  This keeps the arrival object legible from the portrait
// camera without reusing the heavy ruined progression gate silhouette.
asset("asset_frontier_portal", "Frontier Waygate", "Frontier Structures", [part("pillar_l", "box", -1.08, 1.05, 0, .38, 2.1, .52, "#456b68"), part("pillar_r", "box", 1.08, 1.05, 0, .38, 2.1, .52, "#456b68"), part("lintel", "box", 0, 2.18, 0, 2.55, .36, .58, "#739987"), part("keystone", "icosahedron", 0, 2.55, 0, .42, .42, .42, "#f1cc63"), part("crystal_l", "icosahedron", -.72, 1.25, -.22, .18, .46, .18, "#5ce5d2", .18), part("crystal_r", "icosahedron", .72, 1.25, -.22, .18, .46, .18, "#5ce5d2", -.18)]);
asset("asset_frontier_portal_outpost", "Frontier Outpost Gate", "Frontier Structures", [part("placeholder", "box", 0, 1, 0, 1, 1, 1, "#d8b276")], { role: "prop" });
asset("asset_trail_stones", "Mossy Trail Stones", "Verdant Ecology", [part("slab_a", "icosahedron", -.48, .09, .1, .55, .13, .42, "#7f906c", .2), part("slab_b", "icosahedron", .18, .07, -.12, .42, .1, .34, "#a0ab79", -.2), part("sprig", "sphere", .34, .15, .18, .16, .08, .14, "#7faf57")]);
asset("asset_luminous_blossom", "Luminous Blossom", "Medicinal Flora", [part("stem", "cylinder", 0, .48, 0, .1, .96, .1, "#638e63"), part("petal_a", "icosahedron", -.28, .94, 0, .32, .18, .32, "#f4a9d7", .5), part("petal_b", "icosahedron", .28, .94, 0, .32, .18, .32, "#e7d074", -.5), part("core", "sphere", 0, 1.03, 0, .18, .18, .18, "#eaffb2")], { role: "harvestable", harvestable: { dropId: "wildflower", maxChunks: 3, respawnSeconds: 18, feedbackProfile: "fiber" } });
const wildflowerDrop = world.resourceDrops.find((entry) => entry.id === "wildflower");
if (wildflowerDrop) wildflowerDrop.visualAssetId = "asset_luminous_blossom";

const wildkin = (name, archetype, temperament, colorA, colorB, speed, damage, health, tag) => ({ role: "wildkin", wildkin: { archetype, temperament, health, moveSpeed: speed, damage, respawnSeconds: 28, roamRadius: 4.5, noticeRadius: 7, personalSpace: 2, leashRadius: 10, speciesTag: tag, hostileSpecies: [] } });
asset("asset_wildkin_mossling", "Mossling", "Wildkin", [part("body", "icosahedron", 0, .56, 0, .74, .55, .62, "#78ae5d"), part("belly", "sphere", 0, .48, .48, .42, .3, .15, "#b9d77a"), part("head", "sphere", 0, .9, .28, .48, .4, .4, "#8fc86a"), part("muzzle", "sphere", 0, .78, .63, .24, .16, .15, "#d5e69a"), part("eye_l", "sphere", -.18, .98, .61, .075, .075, .06, "#23353a"), part("eye_r", "sphere", .18, .98, .61, .075, .075, .06, "#23353a"), partR("antler_l", "cone", -.38, 1.34, .16, .11, .58, .11, "#d8c66e", { z: .62 }), partR("antler_r", "cone", .38, 1.34, .16, .11, .58, .11, "#d8c66e", { z: -.62 }), partR("leaf_l", "icosahedron", -.43, 1.22, -.03, .26, .12, .42, "#b8dc69", { z: -.28 }), partR("leaf_r", "icosahedron", .43, 1.22, -.03, .26, .12, .42, "#b8dc69", { z: .28 }), part("foot_l", "sphere", -.38, .16, .06, .22, .12, .24, "#547d47"), part("foot_r", "sphere", .38, .16, .06, .22, .12, .24, "#547d47")], wildkin("Mossling", "rusher", "SKITTISH", "#78ae5d", "#b8dc69", 2.8, 1, 6, "mossling"), coll(1, .9, 1, .45));
asset("asset_wildkin_tidefin", "Tidefin", "Wildkin", [partR("body", "capsule", 0, .62, 0, .48, .95, .48, "#51a9be", { x: Math.PI / 2 }), part("belly", "sphere", 0, .52, .25, .42, .28, .36, "#76c7cc"), part("head", "sphere", 0, .68, .58, .48, .38, .36, "#5ebbd0"), part("muzzle", "sphere", 0, .54, .88, .25, .16, .12, "#c9f4e5"), part("eye_l", "sphere", -.2, .78, .84, .075, .075, .06, "#17343b"), part("eye_r", "sphere", .2, .78, .84, .075, .075, .06, "#17343b"), part("dorsal", "cone", 0, 1.12, -.1, .26, .62, .26, "#a4ecdf"), partR("tail_l", "cone", -.38, .62, -.78, .23, .62, .23, "#86d8d4", { z: .82 }), partR("tail_r", "cone", .38, .62, -.78, .23, .62, .23, "#86d8d4", { z: -.82 }), partR("fin_l", "icosahedron", -.6, .56, .18, .5, .1, .26, "#79d8d4", { z: -.28 }), partR("fin_r", "icosahedron", .6, .56, .18, .5, .1, .26, "#79d8d4", { z: .28 })], wildkin("Tidefin", "spitter", "DEFENSIVE", "#51a9be", "#a4ecdf", 2.2, 1, 8, "tidefin"), coll(.9, 1.1, .9, .55));
asset("asset_wildkin_emberhorn", "Emberhorn", "Wildkin", [part("body", "icosahedron", 0, .72, -.05, .9, .62, .72, "#b7603e"), part("belly", "sphere", 0, .55, .42, .55, .28, .16, "#df8a4c"), part("head", "icosahedron", 0, 1.02, .56, .58, .48, .46, "#cf7442"), part("snout", "box", 0, .82, .95, .5, .22, .25, "#6e3b34"), part("eye_l", "sphere", -.22, 1.13, .91, .08, .08, .06, "#fff1a6"), part("eye_r", "sphere", .22, 1.13, .91, .08, .08, .06, "#fff1a6"), partR("horn_l", "cone", -.38, 1.48, .52, .13, .7, .13, "#ffe08a", { z: .62 }), partR("horn_r", "cone", .38, 1.48, .52, .13, .7, .13, "#ffe08a", { z: -.62 }), part("leg_fl", "capsule", -.48, .33, .38, .14, .42, .14, "#7e3f36"), part("leg_fr", "capsule", .48, .33, .38, .14, .42, .14, "#7e3f36"), part("leg_bl", "capsule", -.5, .33, -.4, .14, .42, .14, "#7e3f36"), part("leg_br", "capsule", .5, .33, -.4, .14, .42, .14, "#7e3f36"), partR("tail", "cone", 0, .78, -.86, .22, .65, .22, "#ffb247", { x: -.95 })], wildkin("Emberhorn", "rusher", "TERRITORIAL", "#b7603e", "#ffe08a", 2.1, 2, 12, "emberhorn"), coll(1.2, 1.1, 1, .55));
asset("asset_wildkin_skydancer", "Skydancer", "Wildkin", [part("body", "sphere", 0, .72, 0, .48, .4, .58, "#c3e6ee"), part("head", "sphere", 0, .96, .36, .32, .3, .3, "#d8f3f2"), partR("beak", "cone", 0, .9, .72, .14, .42, .14, "#f4da67", { x: Math.PI / 2 }), part("eye_l", "sphere", -.13, 1.04, .58, .065, .065, .05, "#243d54"), part("eye_r", "sphere", .13, 1.04, .58, .065, .065, .05, "#243d54"), partR("wing_l", "icosahedron", -.68, .77, -.03, .7, .12, .34, "#92b9da", { z: -.32 }), partR("wing_r", "icosahedron", .68, .77, -.03, .7, .12, .34, "#92b9da", { z: .32 }), partR("feather_l", "cone", -.72, .58, -.38, .15, .68, .15, "#7aa5cc", { z: -.9 }), partR("feather_r", "cone", .72, .58, -.38, .15, .68, .15, "#7aa5cc", { z: .9 }), partR("tail_l", "cone", -.22, .66, -.67, .14, .58, .14, "#80b8d1", { x: -.8, z: .22 }), partR("tail_r", "cone", .22, .66, -.67, .14, .58, .14, "#80b8d1", { x: -.8, z: -.22 }), part("foot_l", "sphere", -.18, .3, .12, .09, .08, .12, "#f1bf69"), part("foot_r", "sphere", .18, .3, .12, .09, .08, .12, "#f1bf69")], wildkin("Skydancer", "spitter", "SKITTISH", "#c3e6ee", "#92b9da", 3.2, 1, 8, "skydancer"), coll(1, .9, 1, .45));
asset("asset_thornprowler", "Thornprowler", "Hostile Wildkin", [part("body", "capsule", 0, .65, 0, .65, .86, .65, "#445c39"), part("head", "icosahedron", 0, .85, .48, .52, .4, .42, "#526d40"), part("snout", "sphere", 0, .65, .83, .26, .16, .13, "#293c2c"), part("eye_l", "sphere", -.18, .94, .8, .08, .08, .06, "#ff9f61"), part("eye_r", "sphere", .18, .94, .8, .08, .08, .06, "#ff9f61"), partR("spike_l", "cone", -.47, 1.18, -.05, .15, .72, .15, "#b9c95c", { z: .34 }), partR("spike_c", "cone", 0, 1.3, -.14, .15, .8, .15, "#b9c95c", { z: 0 }), partR("spike_r", "cone", .47, 1.18, -.05, .15, .72, .15, "#b9c95c", { z: -.34 }), part("leg_l", "capsule", -.42, .27, 0, .12, .38, .12, "#30472f"), part("leg_r", "capsule", .42, .27, 0, .12, .38, .12, "#30472f")], wildkin("Thornprowler", "rusher", "AGGRESSIVE", "#445c39", "#b9c95c", 2.6, 1, 7, "thornprowler"), coll(1.25, 1.1, 1.15, .55));
asset("asset_cinderjaw", "Cinderjaw", "Hostile Wildkin", [part("body", "icosahedron", 0, .76, -.04, .95, .7, .75, "#532f36"), part("head", "icosahedron", 0, .9, .48, .6, .48, .48, "#713a3c"), part("jaw_lower", "box", 0, .55, .88, .75, .18, .3, "#e97949"), part("jaw_upper", "box", 0, .78, .82, .68, .16, .24, "#b74e3e"), part("eye_l", "sphere", -.2, 1.02, .78, .075, .075, .06, "#ffe27a"), part("eye_r", "sphere", .2, 1.02, .78, .075, .075, .06, "#ffe27a"), partR("flame_a", "cone", -.32, 1.43, -.08, .17, .72, .17, "#ffb247", { z: .26 }), partR("flame_b", "cone", .32, 1.43, -.08, .17, .72, .17, "#ff714b", { z: -.26 }), part("leg_l", "capsule", -.48, .3, -.18, .14, .4, .14, "#402a30"), part("leg_r", "capsule", .48, .3, -.18, .14, .4, .14, "#402a30")], wildkin("Cinderjaw", "rusher", "AGGRESSIVE", "#532f36", "#ffb247", 2.3, 2, 16, "cinderjaw"), coll(1.4, 1.2, 1.2, .6));
asset("asset_heartwood_guardian", "Heartwood Guardian", "Hostile Wildkin", [part("torso", "capsule", 0, 1.58, 0, 1.05, 2.8, 1.05, "#4c3040"), part("bark_chest", "box", 0, 1.8, .94, 1.18, .72, .16, "#704654"), part("head", "icosahedron", 0, 3.13, .05, 1.1, .82, .92, "#843c63"), part("face", "box", 0, 3.08, .86, .72, .48, .12, "#d8709b"), part("eye_l", "sphere", -.27, 3.2, .98, .11, .11, .07, "#fff0a5"), part("eye_r", "sphere", .27, 3.2, .98, .11, .11, .07, "#fff0a5"), partR("crown_l", "cone", -.58, 3.82, .04, .2, 1.15, .2, "#c34b78", { z: .52 }), partR("crown_c", "cone", 0, 4.0, .04, .22, 1.3, .22, "#e46b9c", { z: 0 }), partR("crown_r", "cone", .58, 3.82, .04, .2, 1.15, .2, "#c34b78", { z: -.52 }), partR("arm_l", "capsule", -1.28, 1.85, .03, .28, 1.45, .28, "#704654", { z: .78 }), partR("arm_r", "capsule", 1.28, 1.85, .03, .28, 1.45, .28, "#704654", { z: -.78 }), partR("claw_l", "cone", -1.75, 1.18, .2, .2, .62, .2, "#b84e7a", { z: .9 }), partR("claw_r", "cone", 1.75, 1.18, .2, .2, .62, .2, "#b84e7a", { z: -.9 }), part("leg_l", "capsule", -.52, .48, 0, .33, .78, .33, "#3b2836"), part("leg_r", "capsule", .52, .48, 0, .33, .78, .33, "#3b2836"), partR("root_foot_l", "cone", -.72, .18, .22, .3, .75, .3, "#704654", { z: .72 }), partR("root_foot_r", "cone", .72, .18, .22, .3, .75, .3, "#704654", { z: -.72 }), part("core", "sphere", 0, 1.85, 1.12, .34, .34, .18, "#f4e38a")], wildkin("Heartwood Guardian", "spitter", "AGGRESSIVE", "#4c3040", "#c34b78", 1.5, 2, 36, "heartwood_guardian"), coll(2, 3.2, 2, 1.6));

// Expand camp into a readable home, keeping original systems and gate IDs intact.
const camp = world.regions.find((region) => region.id === "camp");
camp.displayName = "Frontier Haven";
camp.props = camp.props.filter((entry) => !new Set(["prop_camp_sanctuary", "prop_camp_workshop", "prop_camp_bench", "prop_camp_crate_a", "prop_camp_crate_b", "prop_camp_tree", "prop_camp_flower", "prop_camp_lantern_a", "prop_camp_lantern_b", "prop_camp_lantern_c", "prop_camp_pebbles", "prop_camp_log"]).has(entry.id));
camp.groundPatches = camp.groundPatches.filter((entry) => !["patch_camp_gate_path", "patch_camp_plaza"].includes(entry.id));
// First-launch composition: spawn at 0,0, gate at 0,-4.5. The pod is behind
// the player and every persistent Camp interaction is visible within one camera view.
camp.playerSpawn = { position: p(0, 2), facingYaw: Math.PI };
world.camp.playerSpawn = { position: p(0, 2), facingYaw: Math.PI };
const campGate = camp.portalGates.find((entry) => entry.id === "gate_camp_frontier");
if (campGate) { campGate.pos = p(0, -6); campGate.visualAssetId = "asset_frontier_portal_outpost"; campGate.uniformScale = .92; }
const campPod = camp.props.find((entry) => entry.id === "prop_camp_dropPod");
if (campPod) campPod.pos = p(-8, 5);
const campResonator = camp.props.find((entry) => entry.id === "prop_camp_resonator");
if (campResonator) campResonator.pos = p(8, 5);
const campPoi = camp.pois.find((entry) => entry.id === "poi_camp_resonator");
if (campPoi) campPoi.pos = p(2.8, -1.6);
camp.groundPatches.push({ id: "patch_camp_gate_path", pos: p(0, -2.25, .018), size: { w: 6, h: .035, d: 10.5 }, color: "#bda96f", opacity: 1, visibleInPlay: true, collisionEnabled: false, rotY: 0 }, { id: "patch_camp_plaza", pos: p(0, 1.8, .016), size: { w: 10, h: .03, d: 5 }, color: "#967b52", opacity: 1, visibleInPlay: true, collisionEnabled: false, rotY: 0 });
camp.props.push(prop("prop_camp_sanctuary", "asset_sanctuary_totem", -2.7, -1.6, .88), prop("prop_camp_workshop", "asset_workshop_awning", 2.8, -1.6, .88), prop("prop_camp_bench", "asset_bench", 6.3, 3.3, 1, .4), prop("prop_camp_crate_a", "asset_wooden_crate", 9.4, 7, 1), prop("prop_camp_crate_b", "asset_wooden_crate", 6.7, 7, .8, .35), prop("prop_camp_lantern_a", "asset_path_lantern", -1.55, -1.7, 1), prop("prop_camp_lantern_b", "asset_path_lantern", 1.55, -1.7, 1), prop("prop_camp_lantern_c", "asset_path_lantern", 1.55, -3.7, .95), prop("prop_camp_pebbles", "asset_pebble_cluster", -3.8, -2.8, 1.25), prop("prop_camp_log", "asset_fallen_log", -5.5, 2.6, 1.1, .2), prop("prop_camp_tree", "asset_verge_canopy", -22, 17, 1.1, 0, true), prop("prop_camp_flower", "asset_cloudflower", -8, 3, 1.25));

const s1 = shell("section_1", "Verdant Verge", "#547b54");
resizeSection(s1, 80);
// The route is made from discrete stepping stones and framed ecology. Large
// thin ground cards created horizon banding in the mobile camera, so the base
// terrain remains continuous here.
s1.entryPoints.push({ id: "entry_section_1", pos: p(0, 16), facingYaw: Math.PI });
s1.portalGates.push({ id: "gate_section_1_camp_arrival", displayName: "Forest Edge", pos: p(0, 18.5), rotY: Math.PI, role: "campLink", campReturnEnabled: true, travelEnabled: false, state: "active", triggerRadius: 1.85, visualAssetId: "asset_frontier_portal", uniformScale: .76 }, gate("gate_section_1_to_2", "Shatterfen Gate", 0, -21, "section_2", "entry_section_2", "gate_section_2_to_1", 2, { wood: 4, stone: 3 }));
s1.majorWaypoints.push({ id: "wp_section_1", type: "majorWaypoint", pos: p(-1, 7), displayName: "Verdant Lookout", runSpawn: { position: p(0, 10), facingYaw: Math.PI } });
s1.extractionBeacons.push({ id: "beacon_section_1", type: "extractionBeacon", pos: p(-16, 2), displayName: "Mosslight Beacon" });
s1.resources.push(res("tree_section_1_01", "tree", -10, 14), res("rock_section_1_01", "rock", 9, 13), res("fiber_section_1_01", "fiber", -5, 5), res("tree_section_1_02", "tree", -17, 9), res("fiber_section_1_02", "fiber", 13, 4), res("rock_section_1_02", "rock", 14, -12));
s1.props.push(prop("prop_s1_canopy_a", "asset_verge_canopy", -18, 16, 1.25, .2, true), prop("prop_s1_canopy_b", "asset_verge_canopy", 16, 15, 1.35, .6, true), prop("prop_s1_canopy_c", "asset_verge_canopy", -19, -4, 1.1, 1.1, true), prop("prop_s1_canopy_d", "asset_verge_canopy", -11, 18, 1.15, .8, true), prop("prop_s1_canopy_e", "asset_verge_canopy", 11, 17, 1.1, .2, true), prop("prop_s1_mushrooms", "asset_mushroom_ring", -13, 4, 1.2), prop("prop_s1_mushrooms_b", "asset_mushroom_ring", 5, 12, 1.1), prop("prop_s1_mushrooms_c", "asset_mushroom_ring", -6, -2, 1.15), prop("prop_s1_log_a", "asset_fallen_log", -8, 12, 1.15, .7), prop("prop_s1_log_b", "asset_fallen_log", 12, -5, 1.15, -.55), prop("prop_s1_pebble_a", "asset_pebble_cluster", 7, 15, 1.35), prop("prop_s1_pebble_b", "asset_pebble_cluster", -3, 9, 1.15), prop("prop_s1_berry_a", "asset_berry_bush", -7, 14, 1.15), prop("prop_s1_berry_b", "asset_berry_bush", 10, 8, 1.1), prop("prop_s1_moss_barrier", "asset_vault_barrier", -18, -13, 1.05, 1.57, true), prop("prop_s1_ruin", "asset_ruin_arch", -13, -10, 1.25, .3, true));
s1.props.push(prop("prop_s1_iron_a", "asset_iron_ore_rock", -10, 10, 1.1), prop("prop_s1_iron_b", "asset_iron_ore_rock", 12, 6, 1.05), prop("prop_s1_blossom_a", "asset_luminous_blossom", -4, 12, 1.25), prop("prop_s1_blossom_b", "asset_luminous_blossom", 5, 5, 1.2));
s1.props.push(prop("prop_s1_entry_fern_a", "asset_mushroom_ring", -3.2, 16.2, 1.5), prop("prop_s1_entry_fern_b", "asset_mushroom_ring", 3.4, 16.4, 1.45), prop("prop_s1_entry_pebbles", "asset_pebble_cluster", 1.5, 15.8, 1.6), prop("prop_s1_entry_log", "asset_fallen_log", -6.2, 15.4, 1.3, .15), prop("prop_s1_entry_tree", "asset_verge_canopy", 6.8, 15.7, 1.15, -.25, true), prop("prop_s1_entry_tree_l", "asset_verge_canopy", -7.1, 16.4, 1.1, .24, true), prop("prop_s1_entry_stone", "asset_fen_stone", 4.8, 14.8, .95, -.15), prop("prop_s1_entry_moons", "asset_mushroom_ring", -4.4, 14.1, 1.45), prop("prop_s1_trail_a", "asset_trail_stones", -.4, 13.7, 1.35, .12), prop("prop_s1_trail_b", "asset_trail_stones", .4, 11.9, 1.3, -.2), prop("prop_s1_trail_c", "asset_trail_stones", -.2, 10.1, 1.35, .18), prop("prop_s1_trail_d", "asset_trail_stones", .5, 8.3, 1.3, -.1), prop("prop_s1_trail_e", "asset_trail_stones", -.3, 6.5, 1.35, .1));
s1.props.push(wild("wildkin_mossling_1", "asset_wildkin_mossling", -7, 8), wild("wildkin_mossling_2", "asset_wildkin_mossling", 13, 10, .9), wild("wildkin_thorn_1", "asset_thornprowler", -12, -6, .9), wild("wildkin_thorn_2", "asset_thornprowler", 10, -12, .85));
s1.jumpPads.push({ id: "jump_pad_section_1", pos: p(10, -3, .35), rotY: Math.PI, triggerRadius: 1.3, powerPreset: "medium", verticalLaunch: null, cooldown: 1, visualAssetId: "asset_frontier_launch_pad" });
s1.traversal.platforms.push({ id: "platform_section_1_takeoff", x: 10, y: 0, baseY: 0, z: -3, w: 3, h: 3, height: .35, rotY: 0 }, { id: "platform_section_1_landing", x: 10, y: 0, baseY: 0, z: -14, w: 4, h: 4, height: .35, rotY: 0 });
marker(s1, 10, 1, "parkour_start_section_1", "start", "course_section_1"); marker(s1, 10, -8, "parkour_checkpoint_section_1", "checkpoint", "course_section_1"); marker(s1, 10, -16, "parkour_end_section_1", "end", "course_section_1"); s1.parkourCourseZones.push({ id: "parkour_zone_section_1_a", courseId: "course_section_1", pos: p(10, -7.5, 2), size: { w: 8, h: 6, d: 21 } }); s1.killVolumes.push({ id: "kill_volume_section_1", courseId: "course_section_1", pos: p(10, -12, .6), size: { w: 3, h: 1.2, d: 5 } });
s1.lootChests.push(chest("chest_secret_section_1", "Rootbound Cache", -19, -10, "loot_secret_section_1", true), chest("chest_parkour_section_1", "Canopy Cache", 10, -16, "loot_parkour_section_1", false, "course_section_1", 86400), chest("chest_mossling_secret", "Mossling Hollow", -18, -15, "loot_secret_section_1", true));
s1.sectionProfile = { tier: 1, recommendedLevel: { min: 1, max: 2 }, resourceValueTarget: { min: 10, max: 20 }, wildkinCountTarget: { min: 3, max: 5 }, wildkinLevelTarget: { min: 1, max: 2 }, expected: { waypoint: 1, extractionBeacons: { min: 1, max: 1 }, secrets: { min: 2, max: 3 }, parkourCourses: { min: 1, max: 1 }, outboundPortals: { min: 1, max: 1 } } };
// Verdant Verge — three readable pockets: canopy arrival, Mosslight lookout,
// then a broken-root gate glade. Props sit outside the 3.6u central corridor.
s1.props.push(prop("prop_s1_lookout_canopy_l", "asset_verge_canopy", -6.8, 6.7, 1.18, .18, true), prop("prop_s1_lookout_canopy_r", "asset_verge_canopy", 6.6, 5.7, 1.12, -.2, true), prop("prop_s1_lookout_log_l", "asset_fallen_log", -4.1, 5.1, 1.28, .3), prop("prop_s1_lookout_log_r", "asset_fallen_log", 4.6, 4.2, 1.2, -.42), prop("prop_s1_lookout_moons_l", "asset_mushroom_ring", -3.3, 7.5, 1.45), prop("prop_s1_lookout_moons_r", "asset_mushroom_ring", 3.6, 6.4, 1.4), prop("prop_s1_lookout_berries", "asset_berry_bush", -5.1, 3.6, 1.22), prop("prop_s1_lookout_blossom", "asset_luminous_blossom", 4.8, 3.1, 1.4), prop("prop_s1_lookout_stones", "asset_pebble_cluster", -3.2, 3.1, 1.65), prop("prop_s1_deep_ruin_l", "asset_ruin_arch", -7.5, -7.8, 1.0, .3, true), prop("prop_s1_deep_ruin_r", "asset_ruin_arch", 7.2, -9.1, .92, -.35, true), prop("prop_s1_deep_canopy_l", "asset_verge_canopy", -5.2, -11.1, 1.15, .1, true), prop("prop_s1_deep_canopy_r", "asset_verge_canopy", 5.4, -12.4, 1.12, -.2, true), prop("prop_s1_deep_moons", "asset_mushroom_ring", 3.3, -7.2, 1.55), prop("prop_s1_deep_iron", "asset_iron_ore_rock", -4.4, -8.2, 1.15), prop("prop_s1_gate_stones_l", "asset_fen_stone", -5.8, -18.2, 1.08, .22, true), prop("prop_s1_gate_stones_r", "asset_fen_stone", 5.8, -18.6, 1.03, -.22, true), prop("prop_s1_gate_trail", "asset_trail_stones", -.3, -15.8, 1.5, .08));

const s2 = shell("section_2", "Shatterfen", "#3d6871");
resizeSection(s2, 80);
// Shatterfen uses the continuous teal marsh floor. Reed islands, lily clusters,
// standing stones, and raised traversal props establish the route without
// overlapping rectangular water/causeway cards in the portrait camera.
s2.entryPoints.push({ id: "entry_section_2", pos: p(0, 18), facingYaw: Math.PI }); s2.portalGates.push({ id: "gate_section_2_to_1", displayName: "Verdant Return Gate", pos: p(0, 22), rotY: Math.PI, targetGateId: "gate_section_1_to_2", targetSectionId: "section_1", targetEntryId: "entry_section_1", state: "active", triggerRadius: 1.85, visualAssetId: "asset_frontier_portal", uniformScale: .76 }, gate("gate_section_2_to_3", "Emberfall Gate", 0, -21, "section_3", "entry_section_3", "gate_section_3_to_2", 3, { wood: 5, stone: 5, iron_ore: 2 }));
s2.majorWaypoints.push({ id: "wp_section_2", type: "majorWaypoint", pos: p(13, 6), displayName: "Fen Observatory", runSpawn: { position: p(12, 9), facingYaw: Math.PI } }); s2.extractionBeacons.push({ id: "beacon_section_2", type: "extractionBeacon", pos: p(-18, 3), displayName: "Tideglass Beacon" });
s2.resources.push(res("rock_section_2_01", "rock", 12, 14, 2), res("fiber_section_2_01", "fiber", 15, 9, 2), res("tree_section_2_01", "tree", 18, -4, 2), res("rock_section_2_02", "rock", 13, -13, 2));
s2.props.push(prop("prop_s2_stone_a", "asset_fen_stone", 14, 14, 1.25, .1, true), prop("prop_s2_stone_b", "asset_fen_stone", -16, -5, 1.1, .7, true), prop("prop_s2_stone_c", "asset_fen_stone", -12, 16, .9, .2, true), prop("prop_s2_reed_a", "asset_fen_reed", -5, 13, 1.4), prop("prop_s2_reed_b", "asset_fen_reed", -14, 9, 1.2), prop("prop_s2_reed_c", "asset_fen_reed", -17, 1, 1.35), prop("prop_s2_reed_d", "asset_fen_reed", -6, -12, 1.15), prop("prop_s2_lily_a", "asset_fen_lily", -9, 8, 1.3), prop("prop_s2_lily_b", "asset_fen_lily", -16, -2, 1.4), prop("prop_s2_lily_c", "asset_fen_lily", 15, -11, 1.2), prop("prop_s2_pebble_a", "asset_pebble_cluster", 5, 14, 1.3), prop("prop_s2_pebble_b", "asset_pebble_cluster", 9, 2, 1.2), prop("prop_s2_crystal_a", "asset_crystal", 8, -9, 1.15), prop("prop_s2_crystal_b", "asset_crystal", -16, -12, 1.05), prop("prop_s2_barrier", "asset_vault_barrier", -19, -15, 1.05, 1.57, true));
s2.props.push(prop("prop_s2_iron_a", "asset_iron_ore_rock", 7, 9, 1.05), prop("prop_s2_blossom_a", "asset_luminous_blossom", -6, 11, 1.25), prop("prop_s2_blossom_b", "asset_luminous_blossom", 9, -4, 1.2));
s2.props.push(prop("prop_s2_entry_reed_a", "asset_fen_reed", -3.8, 16.2, 1.45), prop("prop_s2_entry_reed_b", "asset_fen_reed", 4.2, 15.8, 1.35), prop("prop_s2_entry_lily", "asset_fen_lily", -1.4, 14.8, 1.45), prop("prop_s2_entry_stone", "asset_fen_stone", 8.2, 16.2, .85, .2), prop("prop_s2_entry_pebbles", "asset_pebble_cluster", 1.6, 15, 1.45));
s2.props.push(prop("prop_s2_entry_reed_c", "asset_fen_reed", -7.2, 15.2, 1.45), prop("prop_s2_entry_reed_d", "asset_fen_reed", 7.1, 14.6, 1.35), prop("prop_s2_entry_lily_b", "asset_fen_lily", -4.8, 13.8, 1.5), prop("prop_s2_entry_lily_c", "asset_fen_lily", 3.8, 13.2, 1.45), prop("prop_s2_entry_stone_b", "asset_fen_stone", -8.4, 14.2, 1.0, -.2), prop("prop_s2_entry_stone_c", "asset_fen_stone", 6.3, 12.7, .95, .2));
s2.props.push(wild("wildkin_tidefin_1", "asset_wildkin_tidefin", -8, 7), wild("wildkin_tidefin_2", "asset_wildkin_tidefin", 12, -4), wild("wildkin_thorn_3", "asset_thornprowler", 5, -13, .95), wild("wildkin_thorn_4", "asset_thornprowler", -12, -7, .9));
s2.jumpPads.push({ id: "jump_pad_section_2", pos: p(13, -3, .35), rotY: Math.PI, triggerRadius: 1.3, powerPreset: "high", verticalLaunch: null, cooldown: 1, visualAssetId: "asset_frontier_launch_pad" }); s2.traversal.platforms.push({ id: "platform_s2_a", x: 13, y: 0, baseY: 0, z: -3, w: 3, h: 3, height: .35, rotY: 0 }, { id: "platform_s2_b", x: 13, y: 0, baseY: 0, z: -15, w: 4, h: 4, height: .35, rotY: 0 }); marker(s2, 13, 1, "parkour_start_section_2", "start", "course_section_2"); marker(s2, 13, -8, "parkour_checkpoint_section_2", "checkpoint", "course_section_2"); marker(s2, 13, -17, "parkour_end_section_2", "end", "course_section_2"); s2.parkourCourseZones.push({ id: "parkour_zone_section_2", courseId: "course_section_2", pos: p(13, -8, 2), size: { w: 8, h: 6, d: 22 } }); s2.killVolumes.push({ id: "kill_volume_section_2", courseId: "course_section_2", pos: p(13, -13, .6), size: { w: 3, h: 1.2, d: 5 } });
s2.lootChests.push(chest("chest_secret_section_2", "Sunken Cache", -17, -11, "loot_secret_section_1", true), chest("chest_parkour_section_2", "Fen Leap Cache", 13, -17, "loot_parkour_section_1", false, "course_section_2", 86400), chest("chest_tidefin_secret", "Tidefin Grotto", -19, -16, "loot_secret_section_1", true)); s2.sectionProfile = { tier: 2, recommendedLevel: { min: 2, max: 3 }, resourceValueTarget: { min: 12, max: 24 }, wildkinCountTarget: { min: 3, max: 5 }, wildkinLevelTarget: { min: 2, max: 3 }, expected: { waypoint: 1, extractionBeacons: { min: 1, max: 1 }, secrets: { min: 2, max: 3 }, parkourCourses: { min: 1, max: 1 }, outboundPortals: { min: 1, max: 1 } } };
// Shatterfen — reed-edge arrival, Tideglass observatory islet, and a drowned
// gate pocket. The open middle reads as shallow water between landmark banks.
s2.props.push(prop("prop_s2_mid_reed_l", "asset_fen_reed", -6.7, 7.2, 1.55), prop("prop_s2_mid_reed_r", "asset_fen_reed", 6.8, 6.2, 1.48), prop("prop_s2_mid_lily_l", "asset_fen_lily", -4.5, 5.8, 1.6), prop("prop_s2_mid_lily_r", "asset_fen_lily", 4.7, 4.7, 1.5), prop("prop_s2_mid_stone_l", "asset_fen_stone", -7.4, 3.7, 1.0, .18, true), prop("prop_s2_mid_stone_r", "asset_fen_stone", 7.3, 2.8, .94, -.15, true), prop("prop_s2_mid_blossom", "asset_luminous_blossom", -3.7, 2.8, 1.4), prop("prop_s2_observatory_arch", "asset_ruin_arch", 13, 5.3, .9, .25, true), prop("prop_s2_observatory_stone_l", "asset_fen_stone", 10.6, 6.2, 1.1, -.1, true), prop("prop_s2_observatory_stone_r", "asset_fen_stone", 15.4, 6.1, 1.05, .1, true), prop("prop_s2_observatory_crystal", "asset_crystal", 13, 8.2, 1.2), prop("prop_s2_deep_reed_l", "asset_fen_reed", -6.5, -7.8, 1.55), prop("prop_s2_deep_reed_r", "asset_fen_reed", 6.7, -8.8, 1.5), prop("prop_s2_deep_lily_l", "asset_fen_lily", -4.2, -10.2, 1.55), prop("prop_s2_deep_lily_r", "asset_fen_lily", 4.1, -11.3, 1.45), prop("prop_s2_deep_crystal", "asset_crystal", 5.6, -6.3, 1.15), prop("prop_s2_gate_stone_l", "asset_fen_stone", -5.8, -18.3, 1.12, .25, true), prop("prop_s2_gate_stone_r", "asset_fen_stone", 5.9, -18.8, 1.05, -.2, true));

function laterSection(id, name, color, tier, entryGateId, entryName, priorGateId, priorSectionId, forward) {
  const s = shell(id, name, color); s.entryPoints.push({ id: `entry_${id}`, pos: p(0, 18), facingYaw: Math.PI }); s.portalGates.push({ id: entryGateId, displayName: entryName, pos: p(0, 22), rotY: Math.PI, targetGateId: priorGateId, targetSectionId: priorSectionId, targetEntryId: `entry_${priorSectionId}`, state: "active", triggerRadius: 1.85, visualAssetId: "asset_ruin_arch", uniformScale: .7 }); if (forward) { const from = id.replace("section_", ""); const to = forward.id.replace("section_", ""); s.portalGates.push(gate(`gate_section_${from}_to_${to}`, forward.name, 0, -21, forward.id, `entry_${forward.id}`, `gate_section_${to}_to_${from}`, forward.level, forward.resources)); } s.majorWaypoints.push({ id: `wp_${id}`, type: "majorWaypoint", pos: p(-1, 7), displayName: `${name} Waypoint`, runSpawn: { position: p(0, 10), facingYaw: Math.PI } }); s.extractionBeacons.push({ id: `beacon_${id}`, type: "extractionBeacon", pos: p(-18, 3), displayName: `${name} Beacon` }); return s;
}
const s3 = laterSection("section_3", "Emberfall Ruins", "#74484a", 3, "gate_section_3_to_2", "Shatterfen Return Gate", "gate_section_2_to_3", "section_2", { id: "section_4", name: "Windscar Gate", level: 4, resources: { stone: 7, iron_ore: 4, crystal_shard: 2 } });
s3.resources.push(res("tree_section_3_01", "tree", -12, 14, 3), res("rock_section_3_01", "rock", 12, 13, 3), res("fiber_section_3_01", "fiber", 14, 6, 3)); s3.props.push(prop("prop_s3_spire_a", "asset_ember_spire", -14, 12, 1.15, .2, true), prop("prop_s3_spire_b", "asset_ember_spire", 15, 7, 1.4, .7, true), prop("prop_s3_bloom_a", "asset_ember_bloom", -9, 4, 1.35), prop("prop_s3_ore_a", "asset_iron_ore_rock", 10, -10, 1.15), prop("prop_s3_crystal", "asset_crystal", -15, -10, 1.2), prop("prop_s3_barrier", "asset_vault_barrier", -19, -15, 1.05, 1.57, true), wild("wildkin_emberhorn_1", "asset_wildkin_emberhorn", -8, 8), wild("wildkin_emberhorn_2", "asset_wildkin_emberhorn", 11, 7, .95), wild("wildkin_cinder_1", "asset_cinderjaw", -10, -6, .9), wild("wildkin_cinder_2", "asset_cinderjaw", 10, -12, .9));
s3.jumpPads.push({ id: "jump_pad_section_3", pos: p(9, -3, .35), rotY: Math.PI, triggerRadius: 1.3, powerPreset: "high", verticalLaunch: null, cooldown: 1, visualAssetId: "asset_frontier_launch_pad" }); s3.traversal.platforms.push({ id: "platform_s3_a", x: 9, y: 0, baseY: 0, z: -3, w: 3, h: 3, height: .35, rotY: 0 }, { id: "platform_s3_b", x: 9, y: 0, baseY: 0, z: -15, w: 4, h: 4, height: .35, rotY: 0 }); marker(s3, 9, 1, "parkour_start_section_3", "start", "course_section_3"); marker(s3, 9, -8, "parkour_checkpoint_section_3", "checkpoint", "course_section_3"); marker(s3, 9, -17, "parkour_end_section_3", "end", "course_section_3"); s3.parkourCourseZones.push({ id: "parkour_zone_section_3", courseId: "course_section_3", pos: p(9, -8, 2), size: { w: 8, h: 6, d: 22 } }); s3.killVolumes.push({ id: "kill_volume_section_3", courseId: "course_section_3", pos: p(9, -13, .6), size: { w: 3, h: 1.2, d: 5 } }); s3.lootChests.push(chest("chest_secret_section_3", "Cinder Cache", -17, -10, "loot_secret_section_1", true), chest("chest_parkour_section_3", "Spire Cache", 9, -17, "loot_parkour_section_1", false, "course_section_3", 86400), chest("chest_emberhorn_secret", "Emberhorn Den", -19, -16, "loot_secret_section_1", true)); s3.sectionProfile = { tier: 3, recommendedLevel: { min: 3, max: 4 }, resourceValueTarget: { min: 12, max: 25 }, wildkinCountTarget: { min: 3, max: 5 }, wildkinLevelTarget: { min: 3, max: 4 }, expected: { waypoint: 1, extractionBeacons: { min: 1, max: 1 }, secrets: { min: 2, max: 3 }, parkourCourses: { min: 1, max: 1 }, outboundPortals: { min: 1, max: 1 } } };
// Emberfall — ash shrine at the waypoint, a collapsed ruin chamber beside the
// launch route, then a cinder-gate forecourt with flanking ore and blooms.
s3.props.push(prop("prop_s3_shrine_spire_l", "asset_ember_spire", -6.8, 7.1, 1.22, -.12, true), prop("prop_s3_shrine_spire_r", "asset_ember_spire", 10.2, 7.5, 1.15, .18, false), prop("prop_s3_shrine_bloom_l", "asset_ember_bloom", -3.7, 5.5, 1.65), prop("prop_s3_shrine_bloom_r", "asset_ember_bloom", 3.8, 4.5, 1.55), prop("prop_s3_shrine_ruin", "asset_ruin_arch", -5.8, 2.4, .86, .12, true), prop("prop_s3_shrine_ore", "asset_iron_ore_rock", 5.4, 2.1, 1.12), prop("prop_s3_chamber_arch_l", "asset_ruin_arch", -7.4, -7.3, .96, .2, true), prop("prop_s3_chamber_arch_r", "asset_ruin_arch", 7.3, -8.6, .88, -.25, true), prop("prop_s3_chamber_spire_l", "asset_ember_spire", -4.6, -11.1, 1.1, .2, true), prop("prop_s3_chamber_spire_r", "asset_ember_spire", 4.9, -10.4, 1.05, -.18, true), prop("prop_s3_chamber_bloom", "asset_ember_bloom", 3.4, -7.1, 1.55), prop("prop_s3_gate_spire_l", "asset_ember_spire", -6.1, -18.2, 1.18, .1, true), prop("prop_s3_gate_spire_r", "asset_ember_spire", 6.2, -18.7, 1.13, -.12, true), prop("prop_s3_gate_ore", "asset_iron_ore_rock", -4.1, -15.1, 1.13), prop("prop_s3_gate_bloom", "asset_ember_bloom", 3.8, -15.3, 1.55));

const s4 = laterSection("section_4", "Windscar Cliffs", "#71899a", 4, "gate_section_4_to_3", "Emberfall Return Gate", "gate_section_3_to_4", "section_3", { id: "section_5", name: "Heartwood Gate", level: 5, resources: { iron_ore: 6, crystal_shard: 5, stone: 8 } });
s4.resources.push(res("tree_section_4_01", "tree", -13, 14, 4), res("rock_section_4_01", "rock", 12, 14, 4), res("fiber_section_4_01", "fiber", 13, 5, 4)); s4.props.push(prop("prop_s4_needle_a", "asset_wind_arch", -15, 11, 1.3, .3, true), prop("prop_s4_needle_b", "asset_wind_arch", 14, 7, 1.45, .8, true), prop("prop_s4_cloud_a", "asset_cloudflower", -8, 4, 1.5), prop("prop_s4_cloud_b", "asset_cloudflower", 8, -6, 1.4), prop("prop_s4_crystal", "asset_crystal", -15, -10, 1.3), prop("prop_s4_barrier", "asset_vault_barrier", -19, -15, 1.05, 1.57, true), wild("wildkin_skydancer_1", "asset_wildkin_skydancer", -8, 8), wild("wildkin_skydancer_2", "asset_wildkin_skydancer", 12, 7, .95), wild("wildkin_thorn_5", "asset_thornprowler", -10, -6, 1), wild("wildkin_cinder_3", "asset_cinderjaw", 10, -12, 1));
s4.props.push(prop("prop_s4_iron_a", "asset_iron_ore_rock", -5, 12, 1.15), prop("prop_s4_iron_b", "asset_iron_ore_rock", 9, -5, 1.05), prop("prop_s4_blossom", "asset_luminous_blossom", 4, 8, 1.3));
s4.jumpPads.push({ id: "jump_pad_section_4", pos: p(8, -3, .35), rotY: Math.PI, triggerRadius: 1.3, powerPreset: "high", verticalLaunch: null, cooldown: 1, visualAssetId: "asset_frontier_launch_pad" }); s4.traversal.platforms.push({ id: "platform_s4_a", x: 8, y: 0, baseY: 0, z: -3, w: 3, h: 3, height: .35, rotY: 0 }, { id: "platform_s4_b", x: 8, y: 0, baseY: 0, z: -15, w: 4, h: 4, height: .35, rotY: 0 }); marker(s4, 8, 1, "parkour_start_section_4", "start", "course_section_4"); marker(s4, 8, -8, "parkour_checkpoint_section_4", "checkpoint", "course_section_4"); marker(s4, 8, -17, "parkour_end_section_4", "end", "course_section_4"); s4.parkourCourseZones.push({ id: "parkour_zone_section_4", courseId: "course_section_4", pos: p(8, -8, 2), size: { w: 8, h: 6, d: 22 } }); s4.killVolumes.push({ id: "kill_volume_section_4", courseId: "course_section_4", pos: p(8, -13, .6), size: { w: 3, h: 1.2, d: 5 } }); s4.lootChests.push(chest("chest_secret_section_4", "Windworn Cache", -17, -10, "loot_secret_section_1", true), chest("chest_parkour_section_4", "Cloudstep Cache", 8, -17, "loot_parkour_section_1", false, "course_section_4", 86400), chest("chest_skydancer_secret", "Skydancer Eyrie", -19, -16, "loot_secret_section_1", true)); s4.sectionProfile = { tier: 4, recommendedLevel: { min: 4, max: 5 }, resourceValueTarget: { min: 12, max: 26 }, wildkinCountTarget: { min: 3, max: 5 }, wildkinLevelTarget: { min: 4, max: 5 }, expected: { waypoint: 1, extractionBeacons: { min: 1, max: 1 }, secrets: { min: 2, max: 3 }, parkourCourses: { min: 1, max: 1 }, outboundPortals: { min: 1, max: 1 } } };
// Windscar — breezy waypoint shelf, a sideward cloudstep shelf around the
// existing parkour course, and wind-carved gate spires in the distance.
s4.props.push(prop("prop_s4_shelf_needle_l", "asset_wind_arch", -6.8, 7.1, 1.25, -.18, false), prop("prop_s4_shelf_needle_r", "asset_wind_arch", 6.9, 6.2, 1.17, .18, true), prop("prop_s4_shelf_flower_l", "asset_cloudflower", -3.6, 5.7, 1.65), prop("prop_s4_shelf_flower_r", "asset_cloudflower", 3.8, 4.6, 1.58), prop("prop_s4_shelf_crystal", "asset_crystal", -5.2, 2.5, 1.18), prop("prop_s4_shelf_stones", "asset_pebble_cluster", 4.8, 2.2, 1.7), prop("prop_s4_cloudstep_needle_l", "asset_wind_arch", -7.4, -7.5, 1.14, .2, true), prop("prop_s4_cloudstep_needle_r", "asset_wind_arch", 5.1, -9.3, 1.08, -.18, true), prop("prop_s4_cloudstep_flower_l", "asset_cloudflower", -4.1, -10.8, 1.6), prop("prop_s4_cloudstep_flower_r", "asset_cloudflower", 3.7, -7.2, 1.5), prop("prop_s4_cloudstep_crystal", "asset_crystal", -4.9, -6.2, 1.15), prop("prop_s4_gate_needle_l", "asset_wind_arch", -6.1, -18.2, 1.22, -.1, true), prop("prop_s4_gate_needle_r", "asset_wind_arch", 6.2, -18.7, 1.16, .14, true), prop("prop_s4_gate_flower_l", "asset_cloudflower", -3.8, -15.2, 1.6), prop("prop_s4_gate_flower_r", "asset_cloudflower", 3.9, -15.6, 1.55), prop("prop_s4_gate_iron", "asset_iron_ore_rock", 5.1, -14.2, 1.12));

const s5 = laterSection("section_5", "Heartwood Vault", "#633e59", 5, "gate_section_5_to_4", "Windscar Return Gate", "gate_section_4_to_5", "section_4");
s5.resources.push(res("tree_section_5_01", "tree", -13, 14, 5), res("rock_section_5_01", "rock", 13, 13, 5), res("fiber_section_5_01", "fiber", 14, 5, 5)); s5.props.push(prop("prop_s5_heartwood_a", "asset_heartwood_tree", -14, 12, 1.25, .1, true), prop("prop_s5_heartwood_b", "asset_heartwood_tree", 14, 7, 1.4, .6, true), prop("prop_s5_core_crystal", "asset_crystal", 0, -11, 1.6), prop("prop_s5_barrier", "asset_vault_barrier", -19, -14, 1.1, 1.57, true), wild("wildkin_guardian", "asset_heartwood_guardian", 0, -8, 1.15), wild("wildkin_cinder_4", "asset_cinderjaw", -11, -4, 1), wild("wildkin_thorn_6", "asset_thornprowler", 11, -5, 1));
s5.jumpPads.push({ id: "jump_pad_section_5", pos: p(9, -3, .35), rotY: Math.PI, triggerRadius: 1.3, powerPreset: "high", verticalLaunch: null, cooldown: 1, visualAssetId: "asset_frontier_launch_pad" }); s5.traversal.platforms.push({ id: "platform_s5_a", x: 9, y: 0, baseY: 0, z: -3, w: 3, h: 3, height: .35, rotY: 0 }, { id: "platform_s5_b", x: 9, y: 0, baseY: 0, z: -15, w: 4, h: 4, height: .35, rotY: 0 }); marker(s5, 9, 1, "parkour_start_section_5", "start", "course_section_5"); marker(s5, 9, -8, "parkour_checkpoint_section_5", "checkpoint", "course_section_5"); marker(s5, 9, -17, "parkour_end_section_5", "end", "course_section_5"); s5.parkourCourseZones.push({ id: "parkour_zone_section_5", courseId: "course_section_5", pos: p(9, -8, 2), size: { w: 8, h: 6, d: 22 } }); s5.killVolumes.push({ id: "kill_volume_section_5", courseId: "course_section_5", pos: p(9, -13, .6), size: { w: 3, h: 1.2, d: 5 } }); s5.lootChests.push(chest("chest_secret_section_5", "Rootbound Cache", -17, -10, "loot_secret_section_1", true), chest("chest_parkour_section_5", "Vault Ascent Cache", 9, -17, "loot_parkour_section_1", false, "course_section_5", 86400), chest("chest_heartwood_core", "Heartwood Core", 0, -15, "loot_parkour_section_1", true)); s5.sectionProfile = { tier: 5, recommendedLevel: { min: 5, max: 6 }, resourceValueTarget: { min: 10, max: 24 }, wildkinCountTarget: { min: 3, max: 5 }, wildkinLevelTarget: { min: 5, max: 6 }, expected: { waypoint: 1, extractionBeacons: { min: 1, max: 1 }, secrets: { min: 2, max: 3 }, parkourCourses: { min: 1, max: 1 }, outboundPortals: { min: 0, max: 0 } } };
// Heartwood Vault — a reverent waypoint grove, a deliberately open guardian
// arena, then a dense sacred-core frame that leaves the chest interaction clear.
s5.props.push(prop("prop_s5_waypoint_tree_l", "asset_heartwood_tree", -7.0, 7.1, 1.2, -.12, true), prop("prop_s5_waypoint_tree_r", "asset_heartwood_tree", 6.9, 6.0, 1.14, .15, true), prop("prop_s5_waypoint_crystal_l", "asset_crystal", -3.9, 5.4, 1.35), prop("prop_s5_waypoint_crystal_r", "asset_crystal", 3.8, 4.5, 1.3), prop("prop_s5_waypoint_root_l", "asset_fallen_log", -4.6, 2.4, 1.5, .25), prop("prop_s5_waypoint_root_r", "asset_fallen_log", 4.8, 2.1, 1.45, -.25), prop("prop_s5_waypoint_stones", "asset_pebble_cluster", -1.2, 2.8, 1.8), prop("prop_s5_arena_tree_l", "asset_heartwood_tree", -8.3, -7.5, 1.1, .2, true), prop("prop_s5_arena_tree_r", "asset_heartwood_tree", 8.2, -8.5, 1.06, -.18, true), prop("prop_s5_arena_crystal_l", "asset_crystal", -5.1, -10.4, 1.3), prop("prop_s5_arena_crystal_r", "asset_crystal", 5.2, -10.9, 1.26), prop("prop_s5_core_tree_l", "asset_heartwood_tree", -7.0, -15.3, 1.22, -.1, true), prop("prop_s5_core_tree_r", "asset_heartwood_tree", 7.0, -15.5, 1.16, .12, true), prop("prop_s5_core_crystal_l", "asset_crystal", -3.7, -14.0, 1.48), prop("prop_s5_core_crystal_r", "asset_crystal", 3.8, -14.2, 1.42), prop("prop_s5_core_roots_l", "asset_fallen_log", -4.9, -17.9, 1.5, .3), prop("prop_s5_core_roots_r", "asset_fallen_log", 4.8, -17.7, 1.45, -.3));

// Mid-route framing stays compact enough for a mobile camera. These clusters
// turn the previously empty walks between major pockets into legible choices:
// step through the center, or peel toward the flank harvests and Wildkin.
s1.props.push(prop("prop_s1_route_grove_l", "asset_verge_canopy", -3.9, -.8, .95, .15), prop("prop_s1_route_grove_r", "asset_verge_canopy", 4.1, -2.0, .92, -.16), prop("prop_s1_route_moons_l", "asset_mushroom_ring", -2.8, -3.8, 1.38), prop("prop_s1_route_moons_r", "asset_mushroom_ring", 2.9, -4.6, 1.35), prop("prop_s1_route_stones", "asset_trail_stones", .2, -4.9, 1.45, -.1));
s2.props.push(prop("prop_s2_route_reed_l", "asset_fen_reed", -3.7, -.4, 1.5), prop("prop_s2_route_reed_r", "asset_fen_reed", 3.8, -1.2, 1.45), prop("prop_s2_route_lily_l", "asset_fen_lily", -2.8, -3.7, 1.55), prop("prop_s2_route_lily_r", "asset_fen_lily", 2.9, -4.4, 1.5), prop("prop_s2_route_stone_l", "asset_fen_stone", -4.8, -5.8, .92, .1), prop("prop_s2_route_stone_r", "asset_fen_stone", 4.8, -6.5, .9, -.1));
s3.props.push(prop("prop_s3_route_spire_l", "asset_ember_spire", -3.9, -.5, .98, .14), prop("prop_s3_route_spire_r", "asset_ember_spire", 4.0, -1.5, .95, -.15), prop("prop_s3_route_bloom_l", "asset_ember_bloom", -2.8, -3.8, 1.48), prop("prop_s3_route_bloom_r", "asset_ember_bloom", 2.9, -4.6, 1.45), prop("prop_s3_route_ore", "asset_iron_ore_rock", 4.8, -5.6, 1.06));
s4.props.push(prop("prop_s4_route_needle_l", "asset_wind_arch", -3.9, -.6, .98, .14), prop("prop_s4_route_needle_r", "asset_wind_arch", 4.0, -1.7, .94, -.15), prop("prop_s4_route_flower_l", "asset_cloudflower", -2.8, -3.8, 1.55), prop("prop_s4_route_flower_r", "asset_cloudflower", 2.9, -4.7, 1.52), prop("prop_s4_route_crystal", "asset_crystal", 4.9, -5.8, 1.1));
s5.props.push(prop("prop_s5_route_tree_l", "asset_heartwood_tree", -4.8, -.7, .98, .12), prop("prop_s5_route_tree_r", "asset_heartwood_tree", 4.9, -1.8, .94, -.12), prop("prop_s5_route_crystal_l", "asset_crystal", -2.9, -3.9, 1.3), prop("prop_s5_route_crystal_r", "asset_crystal", 3.0, -4.8, 1.27), prop("prop_s5_route_roots", "asset_fallen_log", .2, -5.4, 1.35, .06));

// Keep resource IDs explicit and make every generated collection deterministic.
// The base terrain carries each late-zone palette. Earlier versions used large
// thin overlay cards for paths and pools; those produced obvious diagonal seams
// in the portrait camera. The route is now framed by a small number of tall,
// readable landmarks and low detail props instead.
s3.props.push(prop("prop_s3_bloom_b", "asset_ember_bloom", 6, 13, 1.4), prop("prop_s3_bloom_c", "asset_ember_bloom", -5, -8, 1.2), prop("prop_s3_pebbles", "asset_pebble_cluster", 5, 8, 1.4), prop("prop_s3_arrival_spire_l", "asset_ember_spire", -7.2, 15.5, 1.22, -.15, true), prop("prop_s3_arrival_spire_r", "asset_ember_spire", 7.1, 14.8, 1.16, .2, true), prop("prop_s3_arrival_bloom_l", "asset_ember_bloom", -3.3, 15.1, 1.55), prop("prop_s3_arrival_bloom_r", "asset_ember_bloom", 3.7, 14.2, 1.45), prop("prop_s3_arrival_ore", "asset_iron_ore_rock", 5.1, 12.5, 1.05), prop("prop_s3_arrival_stones", "asset_pebble_cluster", -1.2, 13.2, 1.6));
s4.props.push(prop("prop_s4_needle_c", "asset_wind_arch", -12, -10, 1.15, .2, true), prop("prop_s4_cloud_c", "asset_cloudflower", -5, 13, 1.5), prop("prop_s4_pebbles", "asset_pebble_cluster", 5, 10, 1.5), prop("prop_s4_arrival_needle_l", "asset_wind_arch", -7.4, 15.4, 1.24, -.18, true), prop("prop_s4_arrival_needle_r", "asset_wind_arch", 7, 14.4, 1.17, .15, true), prop("prop_s4_arrival_flower_l", "asset_cloudflower", -3.1, 15.3, 1.6), prop("prop_s4_arrival_flower_r", "asset_cloudflower", 3.4, 13.8, 1.55), prop("prop_s4_arrival_crystal", "asset_crystal", 5.2, 12.1, 1.12), prop("prop_s4_arrival_stones", "asset_pebble_cluster", -1.1, 12.8, 1.65));
s5.props.push(prop("prop_s5_heartwood_c", "asset_heartwood_tree", -12, -4, 1.1, .3, true), prop("prop_s5_pebbles", "asset_pebble_cluster", 5, 11, 1.4), prop("prop_s5_arrival_tree_l", "asset_heartwood_tree", -7.1, 15.3, 1.14, -.12, true), prop("prop_s5_arrival_tree_r", "asset_heartwood_tree", 7.2, 14.6, 1.08, .2, true), prop("prop_s5_arrival_crystal_l", "asset_crystal", -3.5, 14.2, 1.32), prop("prop_s5_arrival_crystal_r", "asset_crystal", 3.7, 13.2, 1.28), prop("prop_s5_arrival_roots", "asset_fallen_log", -.5, 12.1, 1.55, .08), prop("prop_s5_arrival_stones", "asset_pebble_cluster", 1.8, 15.6, 1.7));
// Gate levels use permanent banked XP. These hand-authored cache tables make a
// successful first-clear of each zone enough for the next gate, without relying
// on enemy respawn farming. Repeatable parkour caches retain a modest reward.
lootTable("loot_shatterfen_secret", "Shatterfen Discovery", [{ type: "resource", id: "iron_ore", amount: 2 }, { type: "xp", amount: 50 }]);
lootTable("loot_shatterfen_parkour", "Shatterfen Leap", [{ type: "resource", id: "crystal_shard", amount: 2 }, { type: "xp", amount: 45 }]);
lootTable("loot_emberfall_secret", "Emberfall Discovery", [{ type: "resource", id: "iron_ore", amount: 3 }, { type: "xp", amount: 78 }]);
lootTable("loot_emberfall_parkour", "Emberfall Ascent", [{ type: "resource", id: "crystal_shard", amount: 2 }, { type: "xp", amount: 72 }]);
lootTable("loot_windscar_secret", "Windscar Discovery", [{ type: "resource", id: "crystal_shard", amount: 3 }, { type: "xp", amount: 118 }]);
lootTable("loot_windscar_parkour", "Windscar Flight", [{ type: "resource", id: "iron_ore", amount: 3 }, { type: "xp", amount: 112 }]);
lootTable("loot_heartwood_core", "Heartwood Core", [{ type: "resource", id: "crystal_shard", amount: 6 }, { type: "xp", amount: 250 }]);
for (const current of [s1, s2, s3, s4, s5]) for (const entry of current.props) if (entry.id.endsWith("_barrier")) entry.collisionEnabled = false;
const setChestLoot = (section, id, tableId) => { const target = section.lootChests.find((entry) => entry.id === id); if (target) target.lootTableId = tableId; };
for (const id of ["chest_secret_section_2", "chest_tidefin_secret"]) setChestLoot(s2, id, "loot_shatterfen_secret"); setChestLoot(s2, "chest_parkour_section_2", "loot_shatterfen_parkour");
for (const id of ["chest_secret_section_3", "chest_emberhorn_secret"]) setChestLoot(s3, id, "loot_emberfall_secret"); setChestLoot(s3, "chest_parkour_section_3", "loot_emberfall_parkour");
for (const id of ["chest_secret_section_4", "chest_skydancer_secret"]) setChestLoot(s4, id, "loot_windscar_secret"); setChestLoot(s4, "chest_parkour_section_4", "loot_windscar_parkour");
setChestLoot(s5, "chest_heartwood_core", "loot_heartwood_core");

// Sunlit Wilds terrain is deliberately continuous. Routes and masks are rendered
// by the shared terrain layer; no overlapping decal cards are authored here.
// Coordinates stay local to each section so pockets retain a compact, readable
// mobile composition while their silhouettes and water create real negative space.
const surface = (seed, palette, routes, heights = [], water = [], grassDensity = .55) => ({ seed, palette, routes, heights, water, detail: { grassDensity } });
const P = (grass, grassShade, path, pathEdge, rock, waterColor, waterFoam, accent) => ({ grass, grassShade, path, pathEdge, rock, water: waterColor, waterFoam, accent });
camp.surface = surface(1103, P('#75b84e', '#3f7c48', '#d6a45a', '#f0cd82', '#b47a50', '#39bcd0', '#d9fbf1', '#f5d570'), [
  { id: 'haven-walk', points: [{ x: -1, z: 7 }, { x: 0, z: 2 }, { x: 0, z: -6 }, { x: 0, z: -8 }], width: 2.0 },
  { id: 'workshop-spur', points: [{ x: 0, z: 0 }, { x: 2.6, z: 0 }, { x: 2.8, z: -1.6 }], width: 1.45 },
  { id: 'sanctuary-spur', points: [{x:0,z:0},{x:-2.7,z:0},{x:-2.7,z:-1.6}], width:1.45 },
], [{ id: 'haven-berm-west', x: -15, z: 5, rx: 10, rz: 13, height: 1.8, plateau: .42 }, { id: 'haven-berm-east', x: 15, z: 4, rx: 11, rz: 14, height: 1.65, plateau: .42 }], [{ id: 'haven-pond', x: -13, z: -8, rx: 7, rz: 5, depth: .28 }], .72);
s1.surface = surface(2101, P('#76b94f', '#3b7444', '#d9a856', '#efcf83', '#c88957', '#43bdd0', '#e3fbf4', '#f4d768'), [
  { id: 'verge-ridgeway', points: [{ x: 0, z: 36 }, { x: 3, z: 27 }, { x: -5, z: 17 }, { x: 5, z: 7 }, { x: -3, z: -7 }, { x: 0, z: -30 }], width: 3.5 },
  { id: 'verge-mossling-creek', points: [{ x: -5, z: 20 }, { x: -15, z: 18 }, { x: -25, z: 10 }, { x: -22, z: -3 }, { x: -13, z: -13 }], width: 2.6 },
  { id: 'verge-ore-shelf', points: [{ x: -4, z: 17 }, { x: 12, z: 18 }, { x: 27, z: 9 }, { x: 20, z: -6 }, { x: 5, z: -14 }], width: 2.8 },
  { id: 'verge-root-hollow-shortcut', points: [{ x: -8, z: -3 }, { x: -20, z: -10 }, { x: -17, z: -22 }, { x: -7, z: -28 }], width: 2.25 },
], [
  // A broad, readable rise rather than a collision-prone cliff. The gate and
  // its framing stones snap to this surface below, so the visual ridge and
  // Rapier walkable floor keep the same approach.
  { id: 'rootfall-ridge', x: 0, z: -30, rx: 17, rz: 10, height: 1.35, plateau: .42 },
  { id: 'lookout-knoll', x: -7, z: 10, rx: 10, rz: 8, height: 1.05, plateau: .38 },
  { id: 'ore-shelf', x: 24, z: 7, rx: 11, rz: 16, height: 1.6, plateau: .4 },
  { id: 'root-hollow-rim', x: -20, z: -12, rx: 10, rz: 13, height: .48, plateau: .34 },
], [{ id: 'mosslight-creek', x: -33, z: 4, rx: 5, rz: 19, depth: .3 }, { id: 'fern-pool', x: -31, z: -22, rx: 5, rz: 6, depth: .22 }], .78);
s2.surface = surface(3107, P('#5aa786', '#286d64', '#d1a56a', '#edd69c', '#9fa68f', '#38adc5', '#d6fff7', '#f4a4c7'), [
  { id: 'fen-zigzag-causeway', points: [{ x: 0, z: 36 }, { x: -8, z: 26 }, { x: 6, z: 17 }, { x: -9, z: 8 }, { x: 5, z: -2 }, { x: -7, z: -16 }, { x: 0, z: -30 }], width: 3.25 },
  { id: 'observatory-island-spur', points: [{ x: 6, z: 17 }, { x: 16, z: 14 }, { x: 23, z: 8 }], width: 2.8 },
  { id: 'far-bank-route', points: [{ x: -7, z: -16 }, { x: -18, z: -19 }, { x: -28, z: -15 }], width: 2.65 },
], [
  { id: 'observatory-islet', x: 23, z: 8, rx: 8, rz: 9, height: .7, plateau: .46 },
  { id: 'far-bank', x: -28, z: -15, rx: 9, rz: 12, height: .62, plateau: .43 },
  { id: 'fen-gate-bank', x: 0, z: -31, rx: 13, rz: 8, height: .62, plateau: .45 },
], [{ id: 'tidefin-shallows', x: -22, z: 7, rx: 11, rz: 18, depth: .34 }, { id: 'mirror-basin', x: 14, z: -10, rx: 12, rz: 15, depth: .38 }], .68);
s3.surface = surface(4109, P('#8d7350', '#58443e', '#d29b58', '#f0ce82', '#a76045', '#4e8a93', '#f7e4b2', '#ffb35d'), [
  { id: 'ember-route', points: [{ x: 0, z: 20 }, { x: -3, z: 13 }, { x: 1, z: 7 }, { x: -2, z: 0 }, { x: 2, z: -8 }, { x: 0, z: -20 }], width: 3.1 },
  { id: 'forge-spur', points: [{ x: 1, z: 7 }, { x: 7, z: 6 }, { x: 10, z: 3 }], width: 3.0 },
], [{ id: 'forge-shelf-west', x: -11, z: 2, rx: 9, rz: 18, height: 1.9, plateau: .4 }, { id: 'forge-shelf-east', x: 12, z: -8, rx: 8, rz: 14, height: 2.1, plateau: .42 }, { id: 'ember-gate-rise', x: 0, z: -18, rx: 10, rz: 6, height: .8, plateau: .45 }], [], .46);
s4.surface = surface(5113, P('#7db8a1', '#486b70', '#d4ae68', '#f0d890', '#a38770', '#4baec7', '#e6fcff', '#d9eaf7'), [
  { id: 'wind-spine', points: [{ x: 0, z: 20 }, { x: 1, z: 12 }, { x: -2, z: 5 }, { x: 2, z: -4 }, { x: 0, z: -20 }], width: 3.1 },
  { id: 'eyrie-spur', points: [{ x: -2, z: 5 }, { x: -9, z: 7 }, { x: -13, z: 9 }], width: 3.1 },
], [{ id: 'west-shoulder', x: -13, z: 2, rx: 10, rz: 21, height: 2.25, plateau: .44 }, { id: 'east-shoulder', x: 13, z: -5, rx: 9, rz: 19, height: 1.9, plateau: .42 }, { id: 'wind-gate-terrace', x: 0, z: -18, rx: 11, rz: 6, height: .92, plateau: .45 }], [], .38);
s5.surface = surface(6119, P('#7caa74', '#3d5e56', '#d1a76b', '#efd594', '#805d65', '#3aa9be', '#e1fff2', '#f0a6c4'), [
  { id: 'vault-approach', points: [{ x: 0, z: 20 }, { x: 1, z: 12 }, { x: -1, z: 6 }, { x: 0, z: -2 }, { x: 0, z: -14 }], width: 3.2 },
], [{ id: 'heartwood-rim-west', x: -12, z: -6, rx: 10, rz: 18, height: 2.0, plateau: .46 }, { id: 'heartwood-rim-east', x: 12, z: -6, rx: 10, rz: 18, height: 2.0, plateau: .46 }, { id: 'core-dais', x: 0, z: -15, rx: 8, rz: 6, height: .55, plateau: .5 }], [{ id: 'vault-reflection-pool', x: -16, z: 10, rx: 6, rz: 8, depth: .22 }], .52);

const snapPosition = (section, value) => { if (value?.x !== undefined && value?.z !== undefined) value.y = Number(getSurfaceHeight(section.surface, value.x, value.z).toFixed(4)); };
const snapSection = (section) => {
  for (const item of [...section.props, ...section.resources, ...section.creatures, ...section.majorWaypoints, ...section.extractionBeacons, ...section.pois, ...section.entryPoints, ...section.portalGates, ...section.jumpPads, ...section.parkourStarts, ...section.parkourCheckpoints, ...section.parkourEnds, ...section.lootChests]) snapPosition(section, item.pos);
  for (const waypoint of section.majorWaypoints) if (waypoint.runSpawn?.position) snapPosition(section, waypoint.runSpawn.position);
  for (const item of [...section.parkourStarts, ...section.parkourCheckpoints]) snapPosition(section, item.respawnPosition);
  for (const platform of section.traversal.platforms) platform.baseY = Number((getSurfaceHeight(section.surface, platform.x, platform.z) + (platform.baseY ?? 0)).toFixed(4));
};
camp.props = camp.props.filter((entry) => !entry.id.startsWith('prop_camp_grove_') && !entry.id.startsWith('prop_camp_fern_') && !entry.id.startsWith('prop_camp_blossom_') && !entry.id.startsWith('prop_camp_frame_') && entry.id !== 'prop_camp_log_stack');
// Camp reads as a real inhabited sanctuary: its planted flanks frame the route
// and keep the workshop/nest visible from the initial player position.
camp.props.push(prop('prop_camp_grove_l_a','asset_verge_canopy',-4.6,-5.7,.95,.12,true),prop('prop_camp_grove_l_b','asset_verge_canopy',-5.5,2.3,.9,-.16,true),prop('prop_camp_grove_r_a','asset_verge_canopy',4.6,-5.7,.92,-.1,true),prop('prop_camp_grove_r_b','asset_verge_canopy',5.5,2.3,.9,.2,true),prop('prop_camp_fern_l','asset_mushroom_ring',-5.8,.9,1.25),prop('prop_camp_fern_r','asset_mushroom_ring',5.5,.8,1.25),prop('prop_camp_blossom_l','asset_luminous_blossom',-6.2,4.8,1.3),prop('prop_camp_blossom_r','asset_luminous_blossom',6.1,5.3,1.3),prop('prop_camp_log_stack','asset_fallen_log',7.2,2.3,.9,.18),prop('prop_camp_frame_l','asset_verge_canopy_spread',-3,10,1.04,.1),prop('prop_camp_frame_r','asset_verge_canopy_tall',3.1,8,1.04,-.1),prop('prop_camp_frame_spread','asset_verge_canopy_spread',-4.7,7.4,.94,.18),prop('prop_camp_frame_tall','asset_verge_canopy_tall',4.8,6.8,.9,-.18),prop('prop_camp_frame_rocks_l','asset_pebble_cluster',-4.7,5.2,1.8,.2),prop('prop_camp_frame_rocks_r','asset_pebble_cluster',4.9,4.9,1.8,-.2));
s1.resources = s1.resources.filter((entry) => !entry.id.includes('_grove_')); s1.props = s1.props.filter((entry) => !entry.id.startsWith('prop_s1_safe_'));
// First look: two safe, coherent harvest groves flank the route.  They teach
// harvesting through visible fields while leaving the central path uncluttered.
s1.resources.push(res('tree_section_1_grove_l_a', 'tree', -7.8, 15.2), res('tree_section_1_grove_l_b', 'tree', -10.2, 12.8), res('fiber_section_1_grove_l', 'fiber', -6.3, 13.2), res('tree_section_1_grove_r_a', 'tree', 7.6, 15.0), res('tree_section_1_grove_r_b', 'tree', 10.1, 12.6), res('fiber_section_1_grove_r', 'fiber', 6.2, 12.4));
s1.props.push(prop('prop_s1_safe_grove_l_a', 'asset_verge_canopy', -9.7, 16.9, .82, .18, true), prop('prop_s1_safe_grove_l_b', 'asset_verge_canopy', -4.6, 11.8, .85, -.12, true), prop('prop_s1_safe_grove_r_a', 'asset_verge_canopy', 9.8, 16.6, .8, -.16, true), prop('prop_s1_safe_grove_r_b', 'asset_verge_canopy', 4.6, 11.8, .85, .14, true), prop('prop_s1_safe_pebbles_l', 'asset_pebble_cluster', -5.1, 15.4, 1.25), prop('prop_s1_safe_pebbles_r', 'asset_pebble_cluster', 5.0, 15.2, 1.25), prop('prop_s1_safe_moons_l', 'asset_mushroom_ring', -4.4, 12.2, 1.16), prop('prop_s1_safe_moons_r', 'asset_mushroom_ring', 4.2, 11.9, 1.16));
// First overnight regional pass.  These two islands deliberately avoid the
// old "one central spine plus mirrored side props" shape: each landmark pulls
// the player into a different loop with a readable return route.
s1.props = s1.props.filter((entry) => !entry.id.startsWith('prop_s1_') && !entry.id.startsWith('wildkin_'));
s1.resources = s1.resources.filter((entry) => !entry.id.includes('section_1_'));
// Begin beyond the arrival gate on the existing ridgeway. The gate remains a
// landmark behind the camera while Rootfall and the first branch read ahead.
s1.entryPoints[0].pos = p(2, 29); s1.portalGates.find((entry) => entry.id === 'gate_section_1_camp_arrival').pos = p(0, 36);
s1.portalGates.find((entry) => entry.id === 'gate_section_1_to_2').pos = p(0, -34);
s1.majorWaypoints[0].pos = p(-7, 10); s1.majorWaypoints[0].runSpawn.position = p(-4, 13);
s1.extractionBeacons[0].pos = p(-27, 8);
s1.jumpPads[0].pos = p(24, -6, .35);
s1.traversal.platforms[0].x = 24; s1.traversal.platforms[0].z = -6;
s1.traversal.platforms[1].x = 24; s1.traversal.platforms[1].z = -13;
for (const [collection, x, z] of [[s1.parkourStarts, 24, -2], [s1.parkourCheckpoints, 24, -9], [s1.parkourEnds, 24, -15]]) { collection[0].pos = p(x, z); if (collection[0].respawnPosition) collection[0].respawnPosition = p(x, z); }
s1.parkourCourseZones[0].pos = p(24, -8, 2); s1.lootChests.find((entry) => entry.courseId).pos = p(24, -15);
s1.resources.push(
  res('tree_section_1_arrival_l', 'tree', -10, 29), res('tree_section_1_arrival_r', 'tree', 11, 28), res('fiber_section_1_arrival', 'fiber', -5, 25),
  res('tree_section_1_creek_a', 'tree', -22, 17), res('fiber_section_1_creek', 'fiber', -27, 11), res('tree_section_1_hollow', 'tree', -22, -14),
  res('rock_section_1_shelf_a', 'rock', 20, 15), res('rock_section_1_shelf_b', 'rock', 29, 7), res('fiber_section_1_shelf', 'fiber', 18, 1), res('rock_section_1_gate', 'rock', 8, -28),
);
s1.props.push(
  prop('prop_s1_arrival_tree_l', 'asset_verge_canopy_spread', -8, 33, 1.05, .12, true), prop('prop_s1_arrival_tree_r', 'asset_verge_canopy_tall', 8, 31, 1.04, -.14, true), prop('prop_s1_arrival_stones', 'asset_trail_stones', 1, 28, 1.5),
  prop('prop_s1_lookout_arch', 'asset_ruin_arch', -12, 10, 1.1, .08, true), prop('prop_s1_lookout_tree_l', 'asset_verge_canopy', -15, 12, 1.1, .2, true), prop('prop_s1_lookout_tree_r', 'asset_verge_canopy', 1, 8, 1.05, -.15, true), prop('prop_s1_lookout_blossom', 'asset_luminous_blossom', -3, 14, 1.35),
  prop('prop_s1_creek_stone_a', 'asset_fen_stone', -28, 15, 1.05, .16, true), prop('prop_s1_creek_stone_b', 'asset_fen_stone', -20, 3, .98, -.2, true), prop('prop_s1_creek_moons', 'asset_mushroom_ring', -25, 8, 1.55), prop('prop_s1_creek_mossling', 'asset_wildkin_mossling', -20, 12, 1, .1, true), prop('prop_s1_creek_mossling_b', 'asset_wildkin_mossling', -29, 1, .9, -.3, true),
  // The harvestable rocks occupy a clear shelf patch; surrounding standing
  // stones read as geology rather than duplicate, misleading resource nodes.
  prop('prop_s1_ore_vein_a', 'asset_iron_ore_rock', 24, 15, 1.08), prop('prop_s1_ore_vein_b', 'asset_iron_ore_rock', 27, 13, 1.02, .22),
  prop('prop_s1_ore_spire', 'asset_fen_stone', 32, 9, 1.32, .1, true), prop('prop_s1_ore_cluster', 'asset_fen_stone', 14, 1, 1.1, -.15, true), prop('prop_s1_ore_tree', 'asset_verge_canopy_tall', 30, 15, 1.08, .2, true), prop('prop_s1_ore_launch_stone', 'asset_fen_stone', 28, -8, 1.08, .12, true),
  prop('prop_s1_hollow_arch', 'asset_ruin_arch', -25, -13, 1.05, 1.35, true), prop('prop_s1_hollow_root_l', 'asset_fallen_log', -25, -17, 1.4, .35), prop('prop_s1_hollow_root_r', 'asset_fallen_log', -15, -20, 1.35, -.42), prop('prop_s1_hollow_thorn', 'asset_thornprowler', -22, -8, .9, .2, true),
  prop('prop_s1_rootfall_l', 'asset_fen_stone', -7, -31, 1.18, .18, true), prop('prop_s1_rootfall_r', 'asset_fen_stone', 7, -31, 1.12, -.18, true), prop('prop_s1_gate_trail', 'asset_trail_stones', 0, -27, 1.5),
);
s1.lootChests.find((entry) => entry.id === 'chest_secret_section_1').pos = p(-21, -15);
s1.lootChests.find((entry) => entry.id === 'chest_mossling_secret').pos = p(-31, 3);
// Natural perimeter silhouette: irregular tree/stone pockets conceal the
// mechanical fail-safe boundary without turning the expedition into a fence.
// Arrival and Rootfall retain open central sightlines; every solid cluster is
// outside the authored loops and reads as untraversable alien growth.
s1.props.push(
  prop('prop_s1_edge_south_l_a', 'asset_verge_canopy_tall', -31, 36, 1.32, .12, true), prop('prop_s1_edge_south_l_b', 'asset_fen_stone', -23, 37, 1.42, -.2, true),
  prop('prop_s1_edge_south_r_a', 'asset_fen_stone', 23, 36.5, 1.45, .18, true), prop('prop_s1_edge_south_r_b', 'asset_verge_canopy_tall', 31, 35.5, 1.28, -.15, true),
  prop('prop_s1_edge_root_l_a', 'asset_verge_canopy', -30, -35, 1.38, .2, true), prop('prop_s1_edge_root_l_b', 'asset_fen_stone', -19, -36, 1.55, -.1, true),
  prop('prop_s1_edge_root_r_a', 'asset_fen_stone', 19, -36, 1.48, .12, true), prop('prop_s1_edge_root_r_b', 'asset_verge_canopy', 30, -35, 1.35, -.2, true),
  prop('prop_s1_edge_creek_a', 'asset_verge_canopy_tall', -36, 27, 1.26, .18, true), prop('prop_s1_edge_creek_b', 'asset_fen_stone', -36, 10, 1.52, -.14, true), prop('prop_s1_edge_creek_c', 'asset_verge_canopy', -35, -10, 1.32, .08, true), prop('prop_s1_edge_creek_d', 'asset_fen_stone', -35, -27, 1.46, .2, true),
  prop('prop_s1_edge_shelf_a', 'asset_fen_stone', 36, 28, 1.5, -.18, true), prop('prop_s1_edge_shelf_b', 'asset_verge_canopy_tall', 35, 12, 1.3, .12, true), prop('prop_s1_edge_shelf_c', 'asset_fen_stone', 36, -7, 1.48, .16, true), prop('prop_s1_edge_shelf_d', 'asset_verge_canopy', 35, -25, 1.34, -.12, true),
);

s2.props = s2.props.filter((entry) => !entry.id.startsWith('prop_s2_') && !entry.id.startsWith('wildkin_'));
s2.resources = s2.resources.filter((entry) => !entry.id.includes('section_2_'));
s2.entryPoints[0].pos = p(0, 32); s2.portalGates.find((entry) => entry.id === 'gate_section_2_to_1').pos = p(0, 36);
s2.portalGates.find((entry) => entry.id === 'gate_section_2_to_3').pos = p(0, -34);
s2.majorWaypoints[0].pos = p(23, 8); s2.majorWaypoints[0].runSpawn.position = p(19, 11);
s2.extractionBeacons[0].pos = p(-28, -15);
s2.resources.push(
  res('rock_section_2_arrival', 'rock', 8, 28, 2), res('fiber_section_2_arrival', 'fiber', -9, 25, 2), res('tree_section_2_shallows', 'tree', -29, 9, 2),
  res('fiber_section_2_shallows', 'fiber', -20, 2, 2), res('rock_section_2_observatory', 'rock', 27, 12, 2), res('tree_section_2_far_bank', 'tree', -31, -19, 2), res('rock_section_2_gate', 'rock', 9, -28, 2),
);
s2.props.push(
  prop('prop_s2_arrival_reed_l', 'asset_fen_reed', -7, 31, 1.55), prop('prop_s2_arrival_reed_r', 'asset_fen_reed', 8, 29, 1.5), prop('prop_s2_arrival_stone', 'asset_fen_stone', 10, 26, 1.05, .15, true),
  prop('prop_s2_causeway_stone_a', 'asset_fen_stone', -9, 20, 1.02, .2, true), prop('prop_s2_causeway_lily_a', 'asset_fen_lily', 1, 18, 1.6), prop('prop_s2_causeway_stone_b', 'asset_fen_stone', -10, 7, 1.1, -.15, true), prop('prop_s2_causeway_crystal', 'asset_crystal', 5, -2, 1.15),
  prop('prop_s2_shallows_reed_a', 'asset_fen_reed', -28, 13, 1.65), prop('prop_s2_shallows_reed_b', 'asset_fen_reed', -19, 5, 1.5), prop('prop_s2_shallows_lily', 'asset_fen_lily', -25, 2, 1.6), prop('prop_s2_tidefin_a', 'asset_wildkin_tidefin', -22, 9, 1, .22, true), prop('prop_s2_tidefin_b', 'asset_wildkin_tidefin', -30, 1, .9, -.18, true),
  prop('prop_s2_observatory_arch', 'asset_ruin_arch', 23, 8, 1.15, .22, true), prop('prop_s2_observatory_stone_l', 'asset_fen_stone', 18, 10, 1.08, -.1, true), prop('prop_s2_observatory_stone_r', 'asset_fen_stone', 28, 7, 1.05, .14, true), prop('prop_s2_observatory_crystal', 'asset_crystal', 23, 13, 1.3),
  prop('prop_s2_farbank_reed', 'asset_fen_reed', -30, -12, 1.65), prop('prop_s2_farbank_stone', 'asset_fen_stone', -24, -19, 1.12, .18, true), prop('prop_s2_farbank_blossom', 'asset_luminous_blossom', -29, -20, 1.45), prop('prop_s2_farbank_thorn', 'asset_thornprowler', -32, -7, .92, -.2, true),
  prop('prop_s2_gate_stone_l', 'asset_fen_stone', -7, -31, 1.15, .18, true), prop('prop_s2_gate_stone_r', 'asset_fen_stone', 7, -31, 1.12, -.18, true), prop('prop_s2_gate_lily', 'asset_fen_lily', 4, -28, 1.45),
);
s2.lootChests.find((entry) => entry.id === 'chest_secret_section_2').pos = p(-29, -21);
s2.lootChests.find((entry) => entry.id === 'chest_tidefin_secret').pos = p(-33, 3);
// Shatterfen's edge uses heavier wetland monoliths and scattered canopy
// growth, leaving breaches only where the authored causeway leads onward.
s2.props.push(
  prop('prop_s2_edge_south_l_a', 'asset_fen_stone', -30, 36, 1.5, .16, true), prop('prop_s2_edge_south_l_b', 'asset_verge_canopy_tall', -20, 35, 1.24, -.12, true),
  prop('prop_s2_edge_south_r_a', 'asset_verge_canopy_tall', 21, 35, 1.28, .14, true), prop('prop_s2_edge_south_r_b', 'asset_fen_stone', 31, 36, 1.52, -.18, true),
  prop('prop_s2_edge_gate_l_a', 'asset_fen_stone', -29, -35, 1.58, .12, true), prop('prop_s2_edge_gate_l_b', 'asset_verge_canopy', -18, -36, 1.3, -.18, true),
  prop('prop_s2_edge_gate_r_a', 'asset_verge_canopy', 18, -36, 1.3, .18, true), prop('prop_s2_edge_gate_r_b', 'asset_fen_stone', 29, -35, 1.56, -.12, true),
  prop('prop_s2_edge_basin_a', 'asset_fen_stone', -36, 25, 1.5, -.16, true), prop('prop_s2_edge_basin_b', 'asset_verge_canopy_tall', -35, 6, 1.26, .12, true), prop('prop_s2_edge_basin_c', 'asset_fen_stone', -36, -14, 1.54, .18, true),
  prop('prop_s2_edge_observatory_a', 'asset_verge_canopy_tall', 36, 25, 1.28, -.12, true), prop('prop_s2_edge_observatory_b', 'asset_fen_stone', 35, 5, 1.55, .16, true), prop('prop_s2_edge_observatory_c', 'asset_verge_canopy', 36, -16, 1.3, -.18, true),
);
const entryRoot=s5.props.find(p=>p.id==='prop_s5_arrival_roots');if(entryRoot){entryRoot.pos.x=-4.3;entryRoot.rotY=1.2;}
// Keep launch gaps legible and free of unrelated models or hostile spawn sites.
for (const [section,id,x,z] of [[s1,'prop_s1_log_b',15,-1],[s2,'wildkin_tidefin_2',17,1],[s4,'prop_s4_cloud_b',12,-1],[s4,'prop_s4_iron_b',12,-2],[s5,'wildkin_thorn_6',16,3]]) {
  const item=section.props.find(entry=>entry.id===id);if(item){item.pos.x=x;item.pos.z=z;}
}
// Each late-game launch lane grades the continuous terrain into a shallow,
// readable bench.  It removes the invisible step made when a thin platform
// spans a hillside, while retaining the hill on either side of the course.
const configureLateCourse = (section, x) => {
  section.surface.routes.push({
    id: `course-spine-${section.id}`,
    points: [p(x, 1), p(x, -3), p(x, -9), p(x, -11)],
    width: 3.6,
    elevation: .15,
    feather: 1.5,
  });
  const pad = section.jumpPads[0];
  if (pad) { pad.pos = p(x, -3); pad.horizontalLaunch = 5.35; }
  const [takeoff, landing] = section.traversal.platforms;
  // snapSection adds the authored terrain height once after all route grading
  // is present. Keep the source offset zero to avoid baking it twice.
  if (takeoff) { takeoff.x = x; takeoff.z = -3; takeoff.height = .02; takeoff.baseY = 0; }
  if (landing) { landing.x = x; landing.z = -9; landing.height = .02; landing.baseY = 0; }
  const end = section.parkourEnds[0]; if (end) end.pos = p(x, -11);
  const chest = section.lootChests.find((entry) => entry.courseId); if (chest) chest.pos = p(x, -11);
  section.killVolumes = section.killVolumes.filter((entry) => entry.courseId !== `course_${section.id}`);
};
configureLateCourse(s2, 13);
configureLateCourse(s3, 9);
configureLateCourse(s4, 8);
configureLateCourse(s5, 9);
// The later compact regions retain their established landing apron. The two
// expanded opening regions author their own deeper arrival spaces above.
for (const section of [s3, s4, s5]) {
  section.entryPoints[0].pos.z = 16;
  section.portalGates[0].pos.z = 18.5;
  section.surface.routes[0].points[0].z = 18.5;
}
const landingTree = s5.props.find(entry => entry.id === 'prop_s5_arena_tree_r');
if (landingTree) { landingTree.pos.x = 13.3; landingTree.collisionEnabled = false; }
// Distinct late-expedition envelopes and routes: a court, ridge-perch loops,
// and a Heartwood outer return. Keep all route/actor positions at least 6m
// inside the raw bounds so the shared scenic boundary layer can own the edge.
resizeSection(s3, 120);
resizeSection(s4, 120, 140);
resizeSection(s5, 140);
s3.surface = surface(4109, P('#8d7350','#58443e','#d29b58','#f0ce82','#a76045','#4e8a93','#f7e4b2','#ffb35d'), [
  {id:'ember-route',points:[{x:0,z:48},{x:-10,z:34},{x:-18,z:16},{x:-6,z:2},{x:8,z:-15},{x:0,z:-45}],width:3.4},
  {id:'ember-court-direct',points:[{x:-18,z:16},{x:-3,z:12},{x:13,z:5},{x:8,z:-15}],width:4.2},
  {id:'foundry-return',points:[{x:-6,z:2},{x:-25,z:-4},{x:-29,z:-23},{x:-12,z:-34},{x:0,z:-45}],width:2.35},
], [{id:'ember-west-shelf',x:-30,z:4,rx:20,rz:34,height:2.2,plateau:.42},{id:'ember-east-shelf',x:28,z:-7,rx:18,rz:38,height:2.6,plateau:.4},{id:'ember-gate-rise',x:0,z:-45,rx:15,rz:10,height:.9,plateau:.45}], [], .44);
s4.surface = surface(5113, P('#7db8a1','#486b70','#d4ae68','#f0d890','#a38770','#4baec7','#e6fcff','#d9eaf7'), [
  {id:'wind-spine',points:[{x:0,z:55},{x:-9,z:38},{x:-20,z:18},{x:-7,z:0},{x:12,z:-19},{x:0,z:-55}],width:3.15},
  {id:'west-perch-loop',points:[{x:-20,z:18},{x:-37,z:19},{x:-43,z:4},{x:-25,z:-4},{x:-7,z:0}],width:2.45},
  {id:'east-eyrie-loop',points:[{x:12,z:-19},{x:34,z:-12},{x:39,z:-31},{x:17,z:-39},{x:0,z:-55}],width:2.55},
], [{id:'wind-west-ridge',x:-35,z:8,rx:18,rz:40,height:2.5,plateau:.42},{id:'wind-east-ridge',x:32,z:-20,rx:19,rz:36,height:2.25,plateau:.4},{id:'wind-gate-rise',x:0,z:-54,rx:15,rz:10,height:1,plateau:.45}], [], .36);
s5.surface = surface(6119, P('#7caa74','#3d5e56','#d1a76b','#efd594','#805d65','#3aa9be','#e1fff2','#f0a6c4'), [
  {id:'vault-approach',points:[{x:0,z:57},{x:-14,z:38},{x:-27,z:20},{x:-18,z:3},{x:0,z:-12}],width:3.3},
  {id:'guardian-bowl',points:[{x:0,z:-12},{x:15,z:-22},{x:11,z:-39},{x:0,z:-49}],width:3.8},
  {id:'outer-return',points:[{x:-18,z:3},{x:-39,z:-2},{x:-42,z:-25},{x:-20,z:-39},{x:0,z:-49}],width:2.5},
], [{id:'heartwood-west-ring',x:-36,z:-7,rx:25,rz:48,height:2.35,plateau:.42},{id:'heartwood-east-ring',x:34,z:-18,rx:25,rz:43,height:2.1,plateau:.4},{id:'guardian-bowl',x:4,z:-28,rx:23,rz:20,height:.75,plateau:.55},{id:'core-dais',x:0,z:-49,rx:11,rz:8,height:.65,plateau:.5}], [{id:'arrival-pool',x:-31,z:29,rx:9,rz:13,depth:.25}], .5);
const move = (section, id, x, z) => { const item=[...section.props,...section.resources,...section.entryPoints,...section.portalGates,...section.majorWaypoints,...section.extractionBeacons].find(e=>e.id===id); if(item?.pos)item.pos=p(x,z); return item; };
move(s3,'entry_section_3',0,46); move(s3,'gate_section_3_to_2',0,51); move(s3,'gate_section_3_to_4',0,-49); move(s3,'wp_section_3',-17,23); move(s3,'beacon_section_3',-30,-22); move(s3,'wildkin_emberhorn_1',-4,12); move(s3,'wildkin_emberhorn_2',10,6); move(s3,'fiber_section_3_01',12,4); move(s3,'prop_s3_spire_b',30,10);
move(s4,'entry_section_4',0,53); move(s4,'gate_section_4_to_3',0,58); move(s4,'gate_section_4_to_5',0,-58); move(s4,'wp_section_4',-36,17); move(s4,'beacon_section_4',38,-30); move(s4,'wildkin_skydancer_1',-38,14); move(s4,'wildkin_skydancer_2',-30,6); move(s4,'prop_s4_needle_b',-45,-2);
move(s5,'entry_section_5',0,55); move(s5,'gate_section_5_to_4',0,60); move(s5,'wp_section_5',-24,22); move(s5,'beacon_section_5',-40,-24); move(s5,'wildkin_guardian',4,-28); move(s5,'wildkin_cinder_4',-16,-5); move(s5,'fiber_section_5_01',17,9); move(s5,'tree_section_5_01',-17,16); move(s5,'prop_s5_heartwood_b',33,-16);
const heartwoodCore = s5.lootChests.find(entry => entry.id === 'chest_heartwood_core'); if (heartwoodCore) heartwoodCore.pos = p(0, -49);
for (const [section, waypoint] of [[s3,'wp_section_3'],[s4,'wp_section_4'],[s5,'wp_section_5']]) { const wp=section.majorWaypoints.find(w=>w.id===waypoint); if(wp?.runSpawn) { wp.runSpawn.position=p(wp.pos.x+5,wp.pos.z+5); } }
camp.surface.routes.push({id:'southern-clearing-link',points:[{x:0,z:5},{x:-.8,z:8},{x:0,z:10.25}],width:1.8});
for (const section of [camp, s1, s2, s3, s4, s5]) snapSection(section);
// Continuous terrain owns the visible/physical floor. Legacy box cards hid the
// route and water masks as giant rectangles, so retain none of them in Sunlit Wilds.
for (const section of [camp, s1, s2, s3, s4, s5]) section.groundPatches = [];
// Verdant's ore-shelf course is a short, directed hop from its high route to
// a broad landing. It stays separated from the root-hollow shortcut.
const s1Pad = s1.jumpPads.find((entry) => entry.id === 'jump_pad_section_1');
if (s1Pad) { s1Pad.pos = p(24, -6); s1Pad.horizontalLaunch = 5.35; }
const s1Takeoff = s1.traversal.platforms.find((entry) => entry.id === 'platform_section_1_takeoff');
if (s1Takeoff) { s1Takeoff.x = 24; s1Takeoff.z = -6; s1Takeoff.height = .02; s1Takeoff.baseY = getSurfaceHeight(s1.surface, s1Takeoff.x, s1Takeoff.z); }
const s1Landing = s1.traversal.platforms.find((entry) => entry.id === 'platform_section_1_landing');
if (s1Landing) { s1Landing.x = 24; s1Landing.z = -13; s1Landing.height = .02; s1Landing.baseY = getSurfaceHeight(s1.surface, s1Landing.x, s1Landing.z); }
// The destination apron is a safe reward space; this launch has no kill-volume under its landing.
s1.killVolumes = s1.killVolumes.filter((entry) => entry.id !== 'kill_volume_section_1');
for (const platform of s2.traversal.platforms) { platform.height = .02; platform.baseY = getSurfaceHeight(s2.surface, platform.x, platform.z); }
const s1End = s1.parkourEnds.find((entry) => entry.id === 'parkour_end_section_1'); if (s1End) { s1End.pos = p(24, -15); }
const s1Chest = s1.lootChests.find((entry) => entry.id === 'chest_parkour_section_1'); if (s1Chest) { s1Chest.pos = p(24, -15); }
for (const item of [s1Pad, s1End, s1Chest]) if (item?.pos) snapPosition(s1, item.pos);
// Bright-rimmed thorn beds occupy only the air gap; both platforms and the
// checkpoint apron are safe. The same volume drives the visible bed and failure.
for (const [section, x] of [[s1,24],[s2,13],[s3,9],[s4,8],[s5,9]]) {
  // S1's launch apron begins at z=-6 and its broad landing at z=-13. Keep
  // the thorn bed entirely in that visible gap, rather than under takeoff.
  const hazardZ = section === s1 ? -9.25 : -5.8;
  section.killVolumes.push({id:'kill_volume_'+section.id, courseId:'course_'+section.id,
    pos:p(x,hazardZ,getSurfaceHeight(section.surface,x,hazardZ)+.42),
    size:{w:3.4,h:.84,d:1.8},rotY:0});
}
snapPosition(camp, camp.playerSpawn.position);
snapPosition(camp, world.camp.playerSpawn.position);
// Bake custom environment geometry into canonical recipe parts.  The normal
// Visual Asset pipeline therefore continues to support author selection,
// per-part transforms/colors, undo and JSON export; no id-specific runtime path.
for (const [assetId,build] of VISUAL_KIT_BUILDERS) {
  const target = world.visualAssets.find((entry) => entry.id === assetId);
  if (!target || target.model) continue;
  const visual = build(assetId);
  if (!visual) continue;
  visual.updateMatrixWorld(true);
  const meshes = []; visual.traverse((node) => { if (node.isMesh) meshes.push(node); });
  target.parts = meshes.map((mesh, index) => meshRecipePart(`mesh_${index}`, mesh));
}
world.regions = [camp, s1, s2, s3, s4, s5];
for(const [section,groundcover] of [[camp,'cushion'],[s1,'cushion'],[s2,'fan'],[s3,'mineral'],[s4,'fan'],[s5,'spore']])section.surface.detail.groundcover=groundcover;
composeLandscapeArt(world);
composeOvernightHabitats(world);
composeFoundryHabitat(world);
registerStationAssets(world);
normalizeCampaignHarvestCollision(world);
fs.writeFileSync(WORLD_PATH, JSON.stringify(world) + "\n");
console.log("Authored Early Access campaign: Frontier Haven + Verdant Verge, Shatterfen, Emberfall Ruins, Windscar Cliffs, Heartwood Vault.");
