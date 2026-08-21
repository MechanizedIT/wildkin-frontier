// src/creatures/creatureConfig.js — re-export for convenience, plus spawn placements
import { RUSHER_CONFIG, SPITTER_CONFIG } from "../combat/combatConfig.js";

export { RUSHER_CONFIG, SPITTER_CONFIG };

export const CREATURE_SPAWNS = [
  // Near spawn: breathing room, one weak Rusher nearby visible but not immediate attack
  { type: "rusher", pos: { x: 4.5, y: 0, z: 3.8 }, id: "rusher_near" },
  // Mid frontier: 1-2 Rushers overlapping resource routes
  { type: "rusher", pos: { x: -6.0, y: 0, z: 0.5 }, id: "rusher_mid_1" },
  { type: "rusher", pos: { x: 7.5, y: 0, z: -2.5 }, id: "rusher_mid_2" },
  // Outer / deeper: introduce Spitter + combined encounter
  { type: "spitter", pos: { x: 1.5, y: 0, z: -8.5 }, id: "spitter_outer_1" },
  { type: "spitter", pos: { x: -8.5, y: 0, z: -5.5 }, id: "spitter_outer_2" },
  // Optional 5th total: combined Rusher near Spitter
  // We'll keep 5 total: 3 rushers + 2 spitters, outer has rusher+spitter
  // Already have 3 rushers; this would be 3+2 =5 but we have near+mid2+mid1 =3 rushers, plus 2 spitters =5 total
];

export const CREATURE_TOTAL = CREATURE_SPAWNS.length;
