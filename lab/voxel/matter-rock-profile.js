// Provisional rock-only matter policy. Other materials can supply their own
// profile later; they are deliberately not implemented in this lab batch.
export const ROCK_PROFILE=Object.freeze({
  material:1,cellMeters:1.5,minThicknessMeters:1,cohesion:1,
  physicalRetentionProbes:64,shardMinProbes:24,shardMaxProbes:63,
  maxConditionedProbesPerEdit:64,maxTransientShardBodies:4,
  transientShardLifetimeSeconds:3.5,shardImpulse:1.8,
  maxPooledVisualDebris:16,
});
export function rockProfileAtScale(cellMeters){
  if(![1.5,2,2.5].includes(cellMeters))throw new Error('Unsupported rock fracture-cell scale');
  return Object.freeze({...ROCK_PROFILE,cellMeters});
}
