// src/creatures/creatureConfig.js — re-export for convenience, plus spawn placements
import { RUSHER_CONFIG, SPITTER_CONFIG } from "../combat/combatConfig.js";

export { RUSHER_CONFIG, SPITTER_CONFIG };

export const CREATURE_SPAWNS = [
  // Near spawn: skittish - should flee from player, no immediate attack, breathing room (clear ground south of north edge)
  { type: "rusher", pos: { x: -1.2, y: 0, z: 6.8 }, id: "rusher_near", temperament: "SKITTISH", speciesTag: "fang", homePos: { x: -1.2, y: 0, z: 6.8 }, roamRadius: 3.0, noticeRadius: 5.0, personalSpace: 1.8, leashRadius: 6.5 },
  // West-north territorial - warns then attacks if you linger/enter personal space, clear ground north of low platforms
  { type: "rusher", pos: { x: -6.0, y: 0, z: 3.8 }, id: "rusher_mid_1", temperament: "TERRITORIAL", speciesTag: "fang", homePos: { x: -6.0, y: 0, z: 3.8 }, roamRadius: 2.5, noticeRadius: 6.0, personalSpace: 2.6, leashRadius: 7.0 },
  // East-north defensive - ignores until hit, then retaliates, clear ground east of obstacles
  { type: "rusher", pos: { x: 7.0, y: 0, z: 4.5 }, id: "rusher_mid_2", temperament: "DEFENSIVE", speciesTag: "fang", homePos: { x: 7.0, y: 0, z: 4.5 }, roamRadius: 2.8, noticeRadius: 5.5, personalSpace: 2.0, leashRadius: 7.5 },
  // Near-center aggressive spitter - approachable for player combat test, clear ground south of tree
  { type: "spitter", pos: { x: 1.0, y: 0, z: 2.0 }, id: "spitter_outer_1", temperament: "AGGRESSIVE", speciesTag: "spit", homePos: { x: 1.0, y: 0, z: 2.0 }, roamRadius: 2.2, noticeRadius: 6.5, personalSpace: 2.2, leashRadius: 8.0, hostileSpecies: ["flutter"] },
  // West prey skittish - creates flee interaction without player, clear ground south of lowA
  { type: "spitter", pos: { x: -6.8, y: 0, z: -4.2 }, id: "spitter_outer_2", temperament: "SKITTISH", speciesTag: "flutter", homePos: { x: -6.8, y: 0, z: -4.2 }, roamRadius: 2.5, noticeRadius: 5.0, personalSpace: 1.6, leashRadius: 7.0 },
  // West hunter aggressive rusher - pairs with prey for observable wildkin-vs-wildkin interaction
  { type: "rusher", pos: { x: -9.2, y: 0, z: -3.8 }, id: "rusher_hunter", temperament: "AGGRESSIVE", speciesTag: "fang", homePos: { x: -9.2, y: 0, z: -3.8 }, roamRadius: 3.2, noticeRadius: 7.0, personalSpace: 2.0, leashRadius: 9.0, hostileSpecies: ["flutter"] },
];

export const CREATURE_TOTAL = CREATURE_SPAWNS.length;
