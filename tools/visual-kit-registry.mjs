// One ordered registry for both focused baking and full campaign authoring.
import {CUSTOM_ENVIRONMENT_ASSET_IDS,createEnvironmentMeshVisual} from '../src/world/environmentMeshKit.js';
import {CUSTOM_WILDKIN_ASSET_IDS,createWildkinMeshVisual} from '../src/world/wildkinMeshKit.js';
import {CUSTOM_PROP_ASSET_IDS,createFrontierPropMeshVisual} from '../src/world/frontierPropMeshKit.js';
import {CUSTOM_ECOLOGY_ASSET_IDS,createEcologyMeshVisual} from '../src/world/ecologyMeshKit.js';
import {CUSTOM_LIBRARY_ASSET_IDS,createLibraryMeshVisual} from '../src/world/libraryMeshKit.js';
import {CUSTOM_LANDMARK_ASSET_IDS,createLandmarkMeshVisual} from '../src/world/landmarkMeshKit.js';
export const VISUAL_KIT_BUILDERS=new Map();
for(const [ids,build] of [
  [CUSTOM_ENVIRONMENT_ASSET_IDS,createEnvironmentMeshVisual],
  [CUSTOM_WILDKIN_ASSET_IDS,createWildkinMeshVisual],
  [CUSTOM_PROP_ASSET_IDS,createFrontierPropMeshVisual],
  [CUSTOM_ECOLOGY_ASSET_IDS,createEcologyMeshVisual],
  [CUSTOM_LIBRARY_ASSET_IDS,createLibraryMeshVisual],
  [CUSTOM_LANDMARK_ASSET_IDS,createLandmarkMeshVisual],
])for(const id of ids)VISUAL_KIT_BUILDERS.set(id,build);
