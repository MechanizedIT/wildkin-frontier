// src/creatures/creatureConfig.js — re-export for convenience, plus spawn placements
import { RUSHER_CONFIG, SPITTER_CONFIG } from "../combat/combatConfig.js";

export { RUSHER_CONFIG, SPITTER_CONFIG };

export const CREATURE_SPAWNS = [
  // Near spawn: skittish - should flee from player, no immediate attack, breathing room
  { type: "rusher", pos: { x: 4.5, y: 0, z: 3.8 }, id: "rusher_near", temperament: "SKITTISH", speciesTag: "fang", homePos: { x: 4.5, y: 0, z: 3.8 }, roamRadius: 3.0, noticeRadius: 5.0, personalSpace: 1.8, leashRadius: 6.5 },
  // Mid: territorial - warns then attacks if you linger/enter personal space, overlaps resource routes
  { type: "rusher", pos: { x: -6.0, y: 0, z: 0.5 }, id: "rusher_mid_1", temperament: "TERRITORIAL", speciesTag: "fang", homePos: { x: -6.0, y: 0, z: 0.5 }, roamRadius: 2.5, noticeRadius: 6.0, personalSpace: 2.6, leashRadius: 7.0 },
  // Mid2: defensive - ignores until hit, then retaliates
  { type: "rusher", pos: { x: 7.5, y: 0, z: -2.5 }, id: "rusher_mid_2", temperament: "DEFENSIVE", speciesTag: "fang", homePos: { x: 7.5, y: 0, z: -2.5 }, roamRadius: 2.8, noticeRadius: 5.5, personalSpace: 2.0, leashRadius: 7.5 },
  // Outer: aggressive spitter - attacks player and also hostile to skittish (triggers wildkin-vs-wildkin)
  { type: "spitter", pos: { x: 1.5, y: 0, z: -8.5 }, id: "spitter_outer_1", temperament: "AGGRESSIVE", speciesTag: "spit", homePos: { x: 1.5, y: 0, z: -8.5 }, roamRadius: 2.2, noticeRadius: 6.5, personalSpace: 2.2, leashRadius: 8.0, hostileSpecies: ["flutter"] },
  // Outer2: skittish spitter that is prey for aggressive — creates flee interaction without player
  { type: "spitter", pos: { x: -8.5, y: 0, z: -5.5 }, id: "spitter_outer_2", temperament: "SKITTISH", speciesTag: "flutter", homePos: { x: -8.5, y: 0, z: -5.5 }, roamRadius: 2.5, noticeRadius: 5.0, personalSpace: 1.6, leashRadius: 7.0 },
  // Extra aggressive rusher near spitter_outer_1 to ensure one wildkin-vs-wildkin interaction (aggressive chases skittish)
  { type: "rusher", pos: { x: 3.8, y: 0, z: -6.2 }, id: "rusher_hunter", temperament: "AGGRESSIVE", speciesTag: "fang", homePos: { x: 3.8, y: 0, z: -6.2 }, roamRadius: 3.2, noticeRadius: 7.0, personalSpace: 2.0, leashRadius: 9.0, hostileSpecies: ["flutter"] },
];

export const CREATURE_TOTAL = CREATURE_SPAWNS.length;
