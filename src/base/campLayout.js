// One authored Camp footprint shared by placement, defenses and saved expansion.
// Costs and dimensions are provisional; existing paid construction is retained.
import { BASE_PIECE_BY_ID } from './baseCatalog.js';
export const CAMP_LAYOUT_VERSION = 1;
export const CAMP_WORKPAD_ROUTE_ID = 'camp-work-pad';
export const CAMP_YARD_COST = Object.freeze({ wood: 6, stone: 4, fiber: 2 });
export const CAMP_YARD_CONSOLE = Object.freeze({ x: 1.8, z: 9.5 });
export const CAMP_YARD_CONSOLE_CANDIDATES = Object.freeze([
  CAMP_YARD_CONSOLE, Object.freeze({ x: 1.8, z: 4.5 }), Object.freeze({ x: -1.8, z: 4.5 }),
]);
export const CAMP_YARD_CONSOLE_CLEARANCE = 1.05; // .4m console half-width plus .65m player approach.
export const CAMP_DEBRIS = Object.freeze([
  Object.freeze({ id: 'camp_yard_debris_west', pos: Object.freeze({ x: -7, z: 16 }) }),
  Object.freeze({ id: 'camp_yard_debris_east', pos: Object.freeze({ x: 6, z: 21 }) }),
  Object.freeze({ id: 'camp_yard_debris_south', pos: Object.freeze({ x: -3, z: 27 }) }),
]);
export const CAMP_DEBRIS_IDS = Object.freeze(CAMP_DEBRIS.map(record => record.id));
const APRON = Object.freeze({ id: 'apron', minX: -9, maxX: 11, minZ: -4, maxZ: 11 });
const NECK = Object.freeze({ id: 'entry', minX: -3, maxX: 3, minZ: -9, maxZ: -4 });
const YARD = Object.freeze({ id: 'yard', minX: -13, maxX: 13, minZ: 11, maxZ: 31 });

export function createCampLayout() {
  return { version: CAMP_LAYOUT_VERSION, yardExpanded: false, clearedDebrisIds: [], legacyApron: false };
}
export function cloneCampLayout(layout) { return { ...layout, clearedDebrisIds: [...layout.clearedDebrisIds] }; }

// Resolve the old square before normalizeBase can reject a structure/container.
export function readCampLayout(base) {
  if (!Object.hasOwn(base ?? {}, 'layout')) {
    const expanded = (Number.isFinite(base?.tier) && base.tier > 0) || (Array.isArray(base?.structures) && base.structures.some(record => Number.isFinite(record?.pos?.z) && record.pos.z >= 6));
    return { version: CAMP_LAYOUT_VERSION, yardExpanded: expanded, clearedDebrisIds: expanded ? [...CAMP_DEBRIS_IDS] : [], legacyApron: expanded };
  }
  const value = base.layout;
  const keys = ['version', 'yardExpanded', 'clearedDebrisIds', 'legacyApron'];
  const validShape = value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key))
    && value.version === CAMP_LAYOUT_VERSION && typeof value.yardExpanded === 'boolean' && typeof value.legacyApron === 'boolean'
    && Array.isArray(value.clearedDebrisIds);
  const validIds = validShape && value.clearedDebrisIds.length <= CAMP_DEBRIS_IDS.length
    && new Set(value.clearedDebrisIds).size === value.clearedDebrisIds.length
    && value.clearedDebrisIds.every(id => CAMP_DEBRIS_IDS.includes(id));
  if (!validIds || (value.yardExpanded && value.clearedDebrisIds.length !== CAMP_DEBRIS_IDS.length)
    || (value.legacyApron && !value.yardExpanded)) throw new Error('invalid-camp-layout');
  return { version: CAMP_LAYOUT_VERSION, yardExpanded: value.yardExpanded, clearedDebrisIds: CAMP_DEBRIS_IDS.filter(id => value.clearedDebrisIds.includes(id)), legacyApron: value.legacyApron };
}

export function getCampBuildAreas(base) {
  const layout = base?.layout ?? createCampLayout();
  const areas = [{ ...APRON }, { ...NECK }];
  if (layout.yardExpanded) areas.push({ ...YARD });
  if (layout.legacyApron) areas.push(
    { id: 'legacy-west', minX: -13, maxX: -9, minZ: 5, maxZ: 11 },
    { id: 'legacy-east', minX: 11, maxX: 13, minZ: 5, maxZ: 11 },
  );
  return areas;
}

export function getCampPerimeter(base) {
  const layout = base?.layout ?? createCampLayout(), segments = [];
  const add = (id, ax, az, bx, bz) => segments.push({ id, a: { x: ax, z: az }, b: { x: bx, z: bz }, height: 1.5, depth: .65 });
  add('entry-west', -3, -9, -3, -4); add('entry-east', 3, -9, 3, -4);
  // The north gate and south personnel opening always remain walkable.
  add('north-west', -9, -4, -3, -4); add('north-east', 3, -4, 11, -4);
  const shoulder = layout.legacyApron ? 5 : 11;
  add('apron-west', -9, -4, -9, shoulder); add('apron-east', 11, -4, 11, shoulder);
  if (layout.yardExpanded) {
    add('yard-west-shoulder', -9, shoulder, -13, shoulder); add('yard-east-shoulder', 11, shoulder, 13, shoulder);
    add('yard-west', -13, shoulder, -13, 31); add('yard-east', 13, shoulder, 13, 31);
    add('yard-south', -13, 31, 13, 31);
  } else {
    add('divider-west', -9, 11, -1.2, 11); add('divider-east', 1.2, 11, 11, 11);
  }
  return segments;
}

export function getCampYardConsole(base) {
  const anchor=CAMP_YARD_CONSOLE_CANDIDATES.find(candidate=>(base?.structures??[]).every(record=>{
    const piece=BASE_PIECE_BY_ID[record.type];if(!piece)return true;
    const dx=candidate.x-record.pos.x,dz=candidate.z-record.pos.z,c=Math.cos(record.yaw),s=Math.sin(record.yaw);
    return Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-piece.size[0]/2),Math.max(0,Math.abs(dx*s+dz*c)-piece.size[2]/2))>=CAMP_YARD_CONSOLE_CLEARANCE;
  }));
  return anchor?{...anchor}:null;
}

export function getCampLayoutReserved(base) {
  const reserved=getCampPerimeter(base).map(segment => ({
    pos: { x: (segment.a.x + segment.b.x) / 2, z: (segment.a.z + segment.b.z) / 2 },
    size: { width: Math.hypot(segment.b.x - segment.a.x, segment.b.z - segment.a.z), depth: segment.depth + .4 },
    yaw: Math.atan2(-(segment.b.z - segment.a.z), segment.b.x - segment.a.x),
  }));
  const console=getCampYardConsole(base);
  if(console)reserved.push({pos:console,radius:CAMP_YARD_CONSOLE_CLEARANCE});
  return reserved;
}
