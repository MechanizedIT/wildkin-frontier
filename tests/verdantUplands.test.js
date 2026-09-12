import assert from "node:assert/strict";
import { describe, it } from "node:test";
import WORLD_DATA from "../src/world/data/world.generated.js";
import { getSurfaceHeight, getRouteDistance, getWaterRadius, validateSurface } from "../src/world/terrainSurfaceModel.js";
import { describeCreatureCollider, describeResourceCollider, describeVisualAssetCollider } from "../src/world/colliderDescriptor.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { composeVerdantUplands, outlinedHeight, VERDANT_GAMEPLAY_PROP_SPECS, VERDANT_MOSSLING_ACTOR_IDS, VERDANT_REPLACED_SCENERY_IDS, VERDANT_UPLANDS } from "../tools/compose-verdant-uplands.mjs";
import { registerEcologyAssets } from "../tools/register-ecology-assets.mjs";

const section = (world) => world.regions.find((entry) => entry.id === "section_1");
const find = (items, id) => items.find((entry) => entry.id === id);
const PLAYER_RADIUS = .4;
const COMFORT_MARGIN = .25;
const baseWorld = () => {
  const world = structuredClone(WORLD_DATA);
  registerEcologyAssets(world);
  return world;
};
const composedWorld = () => composeVerdantUplands(baseWorld());

function routeSlope(route) {
  return route.points.slice(1).map((point, index) => {
    const prior = route.points[index];
    return Math.abs(point.elevation - prior.elevation) / Math.hypot(point.x - prior.x, point.z - prior.z);
  });
}

function footprintRadius(collider) {
  if (!collider?.enabled || collider.shape === "none") return 0;
  if (collider.shape === "capsule") return collider.size.radius;
  return Math.hypot((collider.size.width ?? 0) / 2, (collider.size.depth ?? 0) / 2);
}

describe("Verdant uplands standalone composition", () => {
  it("is idempotent, expands only Verdant, and validates the bounded shared surface", () => {
    const world = baseWorld();
    const beforeOthers = JSON.stringify(world.regions.filter((entry) => entry.id !== "section_1"));
    composeVerdantUplands(world);
    const first = JSON.stringify(world);
    composeVerdantUplands(world);
    assert.equal(JSON.stringify(world), first);
    assert.equal(JSON.stringify(world.regions.filter((entry) => entry.id !== "section_1")), beforeOthers);
    const verdant = section(world);
    assert.deepEqual(verdant.bounds, VERDANT_UPLANDS.bounds);
    assert.deepEqual(verdant.size, { width: 140, depth: 90 });
    assert.doesNotThrow(() => validateSurface(verdant.surface));
    assert.equal(verdant.boundaryColliders.length, 4);
    assert.doesNotThrow(() => normalizeWorldData(world));
    const assetIds = new Set(world.visualAssets.map((entry) => entry.id));
    for (const prop of verdant.props) assert.ok(assetIds.has(prop.visualAssetId), `${prop.id} resolves an admitted asset`);
    assert.deepEqual(verdant.resources.map((entry) => entry.id).sort(), section(WORLD_DATA).resources.map((entry) => entry.id).sort(), "existing harvest IDs remain stable");
    assert.equal(VERDANT_GAMEPLAY_PROP_SPECS.length, 7, "the complete original Verdant gameplay-prop set is explicit");
    for (const expected of VERDANT_GAMEPLAY_PROP_SPECS) {
      const matches = verdant.props.filter((entry) => entry.id === expected.id);
      assert.equal(matches.length, 1, `${expected.id} retains exactly one stable gameplay identity`);
      const actual = matches[0];
      const asset = assetIds.has(actual.visualAssetId) && world.visualAssets.find((entry) => entry.id === actual.visualAssetId);
      assert.equal(actual.visualAssetId, expected.visualAssetId, `${expected.id} keeps its admitted source asset`);
      assert.equal(actual.uniformScale, expected.uniformScale, `${expected.id} keeps its source scale`);
      assert.equal(actual.rotY, expected.rotY, `${expected.id} keeps its source rotation`);
      assert.equal(actual.collisionEnabled, expected.collisionEnabled, `${expected.id} keeps its source collision contract`);
      assert.equal(VERDANT_REPLACED_SCENERY_IDS.includes(expected.id), false, `${expected.id} is gameplay, not replacement scenery`);
      assert.equal(asset.gameplay?.role, expected.role, `${expected.id} keeps its gameplay role`);
      if (expected.dropId) assert.equal(asset.gameplay?.harvestable?.dropId, expected.dropId, `${expected.id} keeps its harvest reward`);
      if (expected.speciesTag) assert.equal(asset.gameplay?.wildkin?.speciesTag, expected.speciesTag, `${expected.id} keeps its encounter species`);
      assert.equal(actual.pos.y, Number(getSurfaceHeight(verdant.surface, actual.pos.x, actual.pos.z).toFixed(4)), `${expected.id} is grounded on the composed surface`);
    }
    assert.equal(verdant.props.some((entry) => entry.id === "prop_verdant_mossling_a" || entry.id === "prop_verdant_mossling_b"), false, "obsolete Mossling aliases are not emitted");
  });

  it("holds Survey, Forest Edge, and Rootfall on their accepted transforms", () => {
    const world = composedWorld();
    const verdant = section(world);
    assert.deepEqual(find(verdant.entryPoints, "entry_section_1").pos, { x: 2, y: 0, z: 29 });
    assert.deepEqual(find(verdant.portalGates, "gate_section_1_camp_arrival").pos, { x: 0, y: 0, z: 36 });
    assert.deepEqual(find(verdant.portalGates, "gate_section_1_to_2").pos, { x: 0, y: 1.35, z: -34 });
    assert.deepEqual(find(verdant.lootChests, "chest_survey_cartridge").pos, { x: 8.48, y: .18, z: 23 });
    for (const id of ["survey-wreck-footprint", "survey-wreck-approach", "rootfall-approach"]) assert.ok(find(verdant.surface.routes, id), `${id} remains available to its dedicated composer`);
    for (const id of ["prop_rootfall_left", "prop_rootfall_right", "prop_rootfall_middle", "rootfall_cut_west", "rootfall_cut_east"]) {
      assert.equal(find(verdant.props, id).pos.y, 1.35, `${id} root support`);
    }
    for (const [x, z] of [[-8, -36], [8, -36], [-8, -26], [8, -26], [0, -31]]) {
      assert.equal(getSurfaceHeight(verdant.surface, x, z), 1.35, `Rootfall support at ${x},${z}`);
    }
    assert.equal(getSurfaceHeight(verdant.surface, 8.48, 23), 0, "Survey apron remains flat");
    const beforeSurvey = section(WORLD_DATA).props.filter((entry) => entry.id.startsWith("prop_survey_")).map((entry) => [entry.id, entry.pos]);
    const afterSurvey = verdant.props.filter((entry) => entry.id.startsWith("prop_survey_")).map((entry) => [entry.id, entry.pos]);
    assert.deepEqual(afterSurvey, beforeSurvey, "Survey component offsets remain untouched");
  });

  it("grades the West Hollow terminal support smoothly in both walking directions", () => {
    const verdant = section(composedWorld());
    const support = find(verdant.surface.routes, "verdant-rootfall-support");
    assert.equal(support.feather, 3, "Rootfall keeps its plateau while widening only the outer grade");
    const terminal = [[-8, -19], [-7, -19], [-6, -19], [-5.5, -19], [-5, -19], [-4.5, -19], [-4, -19], [-3.5, -19]];
    const gradeSegments = (points) => points.slice(1).map(([x, z], index) => {
      const [priorX, priorZ] = points[index];
      return (getSurfaceHeight(verdant.surface, x, z) - getSurfaceHeight(verdant.surface, priorX, priorZ)) / Math.hypot(x - priorX, z - priorZ);
    });
    const eastboundGrades = gradeSegments(terminal);
    const westboundGrades = gradeSegments([...terminal].reverse());
    assert.ok(Math.max(...eastboundGrades) <= .5, "West Hollow → Rootfall uphill grade stays below the controller slope limit");
    assert.ok(Math.max(...westboundGrades.map(Math.abs)) <= .5, "Rootfall → West Hollow downhill grade has the same bounded magnitude");
    for (const [x, z] of [[-8, -36], [8, -36], [-8, -26], [8, -26], [0, -31]]) {
      assert.equal(getSurfaceHeight(verdant.surface, x, z), 1.35, `Rootfall support plateau stays fixed at ${x},${z}`);
    }
  });

  it("authors a broad, connected 3/6/8m upland loop with no unmeasured jump lane", () => {
    const verdant = section(composedWorld());
    const byId = (id) => find(verdant.surface.routes, id);
    const ascent = byId("verdant-upland-ascent");
    const contour = byId("verdant-upland-contour");
    const overlook = byId("verdant-upland-overlook");
    const descent = byId("verdant-upland-descent");
    for (const route of [ascent, contour, overlook, descent]) {
      assert.ok(route.width >= 3.2, `${route.id} clear width`);
      assert.ok(Math.max(...routeSlope(route)) <= .32, `${route.id} grade`);
    }
    assert.equal(getSurfaceHeight(verdant.surface, 40, 12), 3);
    assert.equal(getSurfaceHeight(verdant.surface, 45, -2), 6);
    assert.equal(getSurfaceHeight(verdant.surface, 32, -15), 8);
    for (const water of verdant.surface.water) assert.equal(getSurfaceHeight(verdant.surface, water.x, water.z), -.3, `${water.id} stays at the existing water plane`);
    assert.ok(getRouteDistance(descent, 2, -19) <= -descent.width / 2, "descent joins the Rootfall-side low approach");
    assert.deepEqual(verdant.traversal.jumpTraversals, [], "optional jumps wait for native reach proof");
  });

  it("uses authored polygon shelves, invisible wide grades, and clustered woodland", () => {
    const verdant = section(composedWorld());
    const height = (id) => find(verdant.surface.heights, id);
    const foot = height("verdant-east-foot");
    const shelf = height("verdant-east-shelf");
    const overlook = height("verdant-east-overlook");
    for (const landform of [foot, shelf, overlook, height("verdant-rootfall-west-flank"), height("verdant-rootfall-east-flank")]) {
      assert.ok(landform.outline.length >= 6, `${landform.id} has an authored asymmetric outline`);
      assert.ok(landform.outline.every((point) => Math.abs(point.x) <= 1 && Math.abs(point.z) <= 1));
      assert.ok(landform.edgeWidth >= .7 && landform.edgeWidth <= 12);
    }
    assert.ok(foot.rx > shelf.rx && foot.rz > shelf.rz, "the 3m toe supports a narrower upper shelf");
    assert.equal(foot.height, 3);
    assert.equal(shelf.height, 6);
    assert.equal(overlook.height, 8);
    assert.deepEqual(
      outlinedHeight("fixture", 3, 2, [{ x: 10, z: 2 }, { x: 18, z: 2 }, { x: 18, z: 8 }, { x: 10, z: 8 }]),
      { id: "fixture", x: 14, z: 5, rx: 4, rz: 3, height: 3, edgeWidth: 2, outline: [{ x: -1, z: -1 }, { x: 1, z: -1 }, { x: 1, z: 1 }, { x: -1, z: 1 }] },
      "world-metre authoring converts exactly to the shared normalized outline format",
    );

    const routes = new Map(verdant.surface.routes.map((entry) => [entry.id, entry]));
    for (const id of ["verdant-survey-apron", "verdant-arrival-apron", "survey-wreck-footprint", "verdant-rootfall-support"]) assert.equal(routes.get(id).paint, false, `${id} grades terrain without painting a broad pad`);
    assert.equal(routes.get("survey-wreck-approach").style, "gravel", "Survey keeps a narrow visible approach");
    assert.equal(routes.get("rootfall-approach").style, "gravel", "Rootfall keeps a narrow visible approach");

    const woodland = verdant.props.filter((entry) => entry.id.startsWith("prop_verdant_woodland_"));
    assert.ok(woodland.length >= 45 && woodland.length <= 65, "interior recomposition keeps the existing approximate canopy budget");
    assert.deepEqual(new Set(woodland.map((entry) => entry.visualAssetId)), new Set(["asset_verge_canopy", "asset_verge_canopy_tall", "asset_verge_canopy_spread"]));
    assert.ok(woodland.filter((entry) => entry.visualAssetId === "asset_verge_canopy").every((entry) => entry.uniformScale >= 2.1 && entry.uniformScale <= 2.7));
    assert.ok(woodland.filter((entry) => entry.visualAssetId === "asset_verge_canopy_tall").every((entry) => entry.uniformScale >= 1.5 && entry.uniformScale <= 1.9));
    assert.ok(woodland.filter((entry) => entry.visualAssetId === "asset_verge_canopy_spread").every((entry) => entry.uniformScale >= 1.8 && entry.uniformScale <= 2.4));
    assert.ok(woodland.every((entry) => entry.collisionEnabled), "all canopy variants remain physical for the shared trunk collider contract");
    assert.ok(woodland.some((entry) => entry.pos.x > 52), "outer eastern crest remains framed");
    assert.ok(woodland.some((entry) => entry.pos.x < -58), "west pool keeps a protected bank");
    assert.ok(woodland.some((entry) => entry.pos.z < -28), "Rootfall flanks remain visibly contained");
    assert.equal(woodland.filter((entry) => entry.pos.x > -47 && entry.pos.x < -39 && entry.pos.z > 3 && entry.pos.z < 12).length, 0, "Mossling east-bank opening stays readable");
    const countMass = (id) => woodland.filter((entry) => entry.id.startsWith(`prop_verdant_woodland_${id}_`));
    const thorn = find(verdant.props, "prop_s1_hollow_thorn");
    for (const tree of countMass("central-island")) {
      const treeCollider = describeVisualAssetCollider({ collision: composedWorld().visualAssets.find((entry) => entry.id === tree.visualAssetId)?.collision, uniformScale: tree.uniformScale, position: tree.pos, rotationY: tree.rotY });
      assert.ok(Math.hypot(tree.pos.x - thorn.pos.x, tree.pos.z - thorn.pos.z) >= 6 + footprintRadius(treeCollider), `${tree.id} preserves Thornprowler's six-metre working pocket`);
    }
    const waypoint = find(verdant.majorWaypoints, "wp_section_1");
    for (const tree of countMass("lookout-backdrop")) {
      assert.ok(Math.hypot(tree.pos.x - waypoint.pos.x, tree.pos.z - waypoint.pos.z) >= 3, `${tree.id} leaves the supported lookout standing space open`);
      assert.ok(Math.hypot(tree.pos.x - waypoint.runSpawn.position.x, tree.pos.z - waypoint.runSpawn.position.z) >= 3, `${tree.id} leaves the lookout return spawn open`);
    }
    const landmarkCanopies = [
      "prop_verdant_woodland_mossling-pocket_01",
      "prop_verdant_woodland_arrival-shoulder-west_01",
      "prop_verdant_woodland_central-island_02",
      "prop_verdant_woodland_lookout-backdrop_01",
      "prop_verdant_woodland_east-low-face_03",
      "prop_verdant_woodland_rootfall-east-shoulder_01",
    ].map((id) => find(woodland, id));
    assert.ok(landmarkCanopies.every((entry) => entry?.collisionEnabled), "landmark canopy variation keeps trunk collision enabled");
    assert.ok(new Set(landmarkCanopies.map((entry) => entry.visualAssetId)).size >= 2, "landmarks break the repeated canopy silhouette");
    assert.ok(landmarkCanopies.every((entry) => entry.uniformScale < 2), "landmark crowns are deliberately smaller than the perimeter mass");
    const visibleRoutes = verdant.surface.routes.filter((entry) => entry.paint !== false);
    const assets = new Map(composedWorld().visualAssets.map((entry) => [entry.id, entry]));
    const encounterAndGathering = [
      ...verdant.resources.map((entry) => ({ id: entry.id, pos: entry.pos, collider: describeResourceCollider({ typeId: entry.type, position: entry.pos }) })),
      ...verdant.props.filter((entry) => VERDANT_MOSSLING_ACTOR_IDS.includes(entry.id)).map((entry) => ({
        id: entry.id, pos: entry.pos,
        collider: describeVisualAssetCollider({ collision: assets.get(entry.visualAssetId)?.collision, uniformScale: entry.uniformScale ?? 1, position: entry.pos, rotationY: entry.rotY ?? 0 }),
      })),
    ];
    for (const tree of woodland) {
      const treeCollider = describeVisualAssetCollider({ collision: assets.get(tree.visualAssetId)?.collision, uniformScale: tree.uniformScale, position: tree.pos, rotationY: tree.rotY });
      const treeRadius = footprintRadius(treeCollider);
      assert.ok(Math.min(...visibleRoutes.map((entry) => getRouteDistance(entry, tree.pos.x, tree.pos.z))) >= treeRadius + PLAYER_RADIUS + COMFORT_MARGIN, `${tree.id} clears the route by its actual trunk radius plus player comfort`);
      for (const target of encounterAndGathering) {
        const distance = Math.hypot(target.pos.x - tree.pos.x, target.pos.z - tree.pos.z);
        assert.ok(distance >= treeRadius + footprintRadius(target.collider) + PLAYER_RADIUS + COMFORT_MARGIN, `${tree.id} clears ${target.id} by its actual collision footprint plus player comfort`);
      }
    }
    for (const id of ["prop_verdant_mossling_gap_root", "prop_verdant_mossling_gap_stone", "prop_verdant_return_root", "prop_verdant_lookout_rest_stone"]) assert.ok(find(verdant.props, id), `${id} gives a discovery pocket a local tell`);
  });

  it("keeps three distinct discovery contexts, a dry Mossling bank, and clear main routes", () => {
    const verdant = section(composedWorld());
    const survey = find(verdant.lootChests, "chest_survey_cartridge");
    const upland = find(verdant.lootChests, "chest_parkour_section_1");
    const mossling = find(verdant.lootChests, "chest_mossling_secret");
    assert.equal(survey.displayName, "Survey supply chest");
    assert.equal(upland.displayName, "Upland Shelf Cache");
    assert.equal(mossling.displayName, "Mossling Hollow");
    assert.ok(Math.abs(upland.pos.y - getSurfaceHeight(verdant.surface, upland.pos.x, upland.pos.z)) < .0001);
    assert.ok(Math.abs(mossling.pos.y - getSurfaceHeight(verdant.surface, mossling.pos.x, mossling.pos.z)) < .0001);
    assert.ok(getWaterRadius(verdant.surface, mossling.pos.x, mossling.pos.z) > 1, "Mossling cache remains on the dry hollow bank");
    const water = new Map(verdant.surface.water.map((entry) => [entry.id, entry]));
    const northBay = water.get("mosslight-north-bay");
    const northShoulder = water.get("mosslight-north-shoulder");
    const neck = water.get("mosslight-neck");
    const southReach = water.get("mosslight-south-reach");
    const southOutlet = water.get("mosslight-south-outlet");
    assert.equal(water.size, 5, "the water uses a five-ellipse connected silhouette rather than three tangent ovals");
    assert.ok(northBay.z < northShoulder.z && northShoulder.z < neck.z && neck.z < southReach.z && southReach.z < southOutlet.z, "the broad bay is north at negative Z and narrows southward");
    assert.ok(northBay.rx > southOutlet.rx && northShoulder.rx > southOutlet.rx && neck.rx > southOutlet.rx, "the north bay and shoulder stay wider than the southern reach");
    for (const [x, z] of [[-54.5, -15.5], [-56, -8], [-55.5, 0], [-55, 9]]) {
      assert.ok(getWaterRadius(verdant.surface, x, z) < .87, `water overlap at ${x},${z} is generous enough for the rendered shoreline radius`);
    }
    const observationBank = [
      ...VERDANT_MOSSLING_ACTOR_IDS.map((id) => find(verdant.props, id)),
      find(verdant.resources, "fiber_section_1_creek"),
      find(verdant.resources, "tree_section_1_creek_a"),
      { id: "east-bank-upper", pos: { x: -42, z: 12 } },
      { id: "east-bank-mid", pos: { x: -42, z: 8 } },
      { id: "east-bank-lower", pos: { x: -42, z: 5 } },
    ];
    for (const target of observationBank) {
      assert.ok(getWaterRadius(verdant.surface, target.pos.x, target.pos.z) >= 1.1, `${target.id} keeps a dry Mossling observation/harvest approach`);
      assert.ok(getSurfaceHeight(verdant.surface, target.pos.x, target.pos.z) > 0, `${target.id} stays on the shared dry bank terrain`);
    }
    const westHollow = find(verdant.surface.routes, "verdant-west-hollow");
    for (const point of westHollow.points) assert.ok(getWaterRadius(verdant.surface, point.x, point.z) >= 1.1, `west walking route stays dry at ${point.x},${point.z}`);
    const lowSpine = find(verdant.surface.routes, "verdant-low-spine");
    for (const id of ["prop_verdant_lookout_rest_stone", "prop_verdant_lookout_rest_groundcover", "prop_verdant_lookout_sightline_root", "prop_verdant_lookout_sightline_groundcover"]) {
      const landmark = find(verdant.props, id);
      assert.ok(landmark, `${id} composes the central rest/sightline`);
      assert.ok(getRouteDistance(lowSpine, landmark.pos.x, landmark.pos.z) >= PLAYER_RADIUS + COMFORT_MARGIN, `${id} leaves low-spine player comfort`);
    }
    for (const id of ["prop_verdant_arrival_curtain_root", "prop_verdant_shelf_cache_root"]) {
      const landmark = find(verdant.props, id);
      const asset = composedWorld().visualAssets.find((entry) => entry.id === landmark.visualAssetId);
      assert.equal(asset.gameplay?.role, "prop", `${id} remains a non-harvest landmark`);
    }
    const mainRoutes = verdant.surface.routes.filter((entry) => entry.id.startsWith("verdant-upland-") || entry.id === "verdant-low-spine");
    for (const item of [...verdant.resources, ...verdant.props.filter((entry) => entry.id.startsWith("prop_verdant_") && entry.collisionEnabled)]) {
      const nearest = Math.min(...mainRoutes.map((entry) => getRouteDistance(entry, item.pos.x, item.pos.z)));
      assert.ok(nearest >= .3, `${item.id} leaves route clearance`);
    }
  });

  it("grounds waypoint and creature support while keeping real collision footprints clear", () => {
    const world = baseWorld();
    const original = section(world);
    original.creatures.push({
      id: "verdant_uplands_grounding_fixture", type: "rusher", temperament: "SKITTISH", speciesTag: "mossling",
      level: 1, pos: { x: 55, y: 99, z: 18 }, homePos: { x: 57, y: 99, z: 20 }, roamRadius: 4, noticeRadius: 7, personalSpace: 2, leashRadius: 10,
    });
    const verdant = section(composeVerdantUplands(world));
    const waypoint = find(verdant.majorWaypoints, "wp_section_1");
    assert.equal(waypoint.runSpawn.position.y, Number(getSurfaceHeight(verdant.surface, waypoint.runSpawn.position.x, waypoint.runSpawn.position.z).toFixed(4)));
    const fixture = find(verdant.creatures, "verdant_uplands_grounding_fixture");
    assert.equal(fixture.pos.y, Number(getSurfaceHeight(verdant.surface, fixture.pos.x, fixture.pos.z).toFixed(4)));
    assert.equal(fixture.homePos.y, Number(getSurfaceHeight(verdant.surface, fixture.homePos.x, fixture.homePos.z).toFixed(4)));

    const assets = new Map(world.visualAssets.map((entry) => [entry.id, entry]));
    const routes = verdant.surface.routes.filter(route => route.paint !== false);
    for (const rock of verdant.props.filter(entry => entry.visualAssetId?.startsWith("asset_verdant_cliff_"))) {
      const collision = assets.get(rock.visualAssetId).collision;
      const radius = Math.max(...collision.vertices.filter((_, index) => index % 3 === 0).map((x, index) => Math.hypot(x, collision.vertices[index * 3 + 2]))) * rock.uniformScale;
      for (const route of routes) assert.ok(getRouteDistance(route, rock.pos.x, rock.pos.z) >= radius + PLAYER_RADIUS + COMFORT_MARGIN, `${rock.id} keeps ${route.id} clear with its actual convex footprint`);
    }
    const physical = [
      ...verdant.resources.map((entry) => ({ id: entry.id, pos: entry.pos, collider: describeResourceCollider({ typeId: entry.type, position: entry.pos }) })),
      ...verdant.creatures.map((entry) => ({ id: entry.id, pos: entry.pos, collider: describeCreatureCollider({ uniformScale: entry.uniformScale ?? 1, position: entry.pos }) })),
      ...verdant.props.filter((entry) => entry.collisionEnabled).map((entry) => ({
        id: entry.id, pos: entry.pos,
        collider: describeVisualAssetCollider({ collision: assets.get(entry.visualAssetId)?.collision, uniformScale: entry.uniformScale ?? 1, position: entry.pos, rotationY: entry.rotY ?? 0 }),
      })),
    ].filter((entry) => footprintRadius(entry.collider) > 0);
    const stableGameplay = VERDANT_GAMEPLAY_PROP_SPECS.map((expected) => {
      const entry = find(verdant.props, expected.id);
      return {
        id: entry.id,
        pos: entry.pos,
        collider: describeVisualAssetCollider({ collision: assets.get(entry.visualAssetId)?.collision, uniformScale: entry.uniformScale, position: entry.pos, rotationY: entry.rotY }),
      };
    });
    for (const harvestable of physical.filter((entry) => verdant.resources.some((resource) => resource.id === entry.id))) {
      for (const other of physical) {
        if (other.id === harvestable.id) continue;
        const distance = Math.hypot(harvestable.pos.x - other.pos.x, harvestable.pos.z - other.pos.z);
        assert.ok(distance > footprintRadius(harvestable.collider) + footprintRadius(other.collider), `${harvestable.id} clears ${other.id}`);
      }
    }
    for (const target of stableGameplay) {
      for (const other of physical) {
        if (other.id === target.id) continue;
        const distance = Math.hypot(target.pos.x - other.pos.x, target.pos.z - other.pos.z);
        assert.ok(
          distance > footprintRadius(target.collider) + footprintRadius(other.collider) + PLAYER_RADIUS + COMFORT_MARGIN,
          `${target.id} has a clear harvest or encounter approach past ${other.id}`,
        );
      }
    }
  });
});
