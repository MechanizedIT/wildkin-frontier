import { ROCK_PROFILE } from './matter-rock-profile.js';
import { DIRT_PROFILE } from './matter-dirt-profile.js';
import { chipHardRock, selectRockFracture } from './matter-hard-rock.js';
import { buildRockBondGraph, emptyRockStructure, impactRockStructure } from './matter-structure.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';
import { excavateDirt, resolveDirtSupport } from './matter-dirt.js';

export const MATTER_MATERIAL=Object.freeze({AIR:0,ROCK:1,DIRT:2,MIXED:3});

export const ROCK_MATTER_POLICY=Object.freeze({
  id:'rock',material:MATTER_MATERIAL.ROCK,profile:ROCK_PROFILE,
  response:'brittle-stress',removal:chipHardRock,
  emptyStructure:emptyRockStructure,buildStructure:buildRockBondGraph,
  applyStructure:impactRockStructure,findFracture:selectRockFracture,
  analyzeSupport:analyzeRockConnectivity,
});

export const DIRT_MATTER_POLICY=Object.freeze({
  id:'dirt',material:MATTER_MATERIAL.DIRT,profile:DIRT_PROFILE,
  response:'local-cohesion',removal:excavateDirt,
  emptyStructure:null,buildStructure:null,applyStructure:null,findFracture:null,
  analyzeSupport:resolveDirtSupport,
});

// A mixed actor has no actor-wide damage response. Its local target material
// selects the existing dirt or hard-rock strategy at each mining edit.
export const MIXED_MATTER_POLICY=Object.freeze({
  id:'mixed',material:MATTER_MATERIAL.MIXED,profile:Object.freeze({maxDynamicClods:4,detachSpin:[0,0,0],actorDensity:.5,actorFriction:.72,
    maxSupportIntervals:28,maxSupportWork:32768}),
  response:'target-material-dispatch',removal:null,emptyStructure:null,buildStructure:null,applyStructure:null,findFracture:null,analyzeSupport:null,
});

const policies=new Map([[ROCK_MATTER_POLICY.material,ROCK_MATTER_POLICY],[DIRT_MATTER_POLICY.material,DIRT_MATTER_POLICY],[MIXED_MATTER_POLICY.material,MIXED_MATTER_POLICY]]);
export function matterPolicyFor(material){return policies.get(material)??null;}
