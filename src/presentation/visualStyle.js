// Sunlit matte palette: display the authored colors without a cinematic tone
// curve washing out jade/ochre contrast. One sun, one sky fill, no reflections.
export const FRONTIER_LIGHTING_CONFIG = Object.freeze({
  sunColor: 0xfff2db,
  sunIntensity: 3.4,
  skyColor: 0xdbedff,
  groundColor: 0x444e76,
  skyIntensity: .9,
  fillColor: 0xb0f4ed,
  fillIntensity: .25,
});

// Detail is concentrated in the playable view. Far terrain blends into the
// biome atmosphere before the camera clips; nearby colors stay untouched.
export const FRONTIER_VIEW_CONFIG = Object.freeze({
  fogNear: 30,
  fogFar: 56,
  shadowHalfExtent: 18,
  shadowMapSize: 1024,
  sunOffset: Object.freeze({ x: -14, y: 26, z: 10 }),
});
