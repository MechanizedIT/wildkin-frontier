import * as THREE from 'three';
import { createVisualAssetVisual, createFenceVisual } from '../world/visualFactory.js';

// Placement and catalog thumbnails share the same fitted model.
export function createBasePieceVisual(piece, visualAssets = []) {
  const asset = visualAssets.find(entry => entry.id === piece.assetId);
  const size = piece.size;
  const visual = asset ? createVisualAssetVisual(asset)
    : createFenceVisual({ size: { w: size[0], h: size[1], d: size[2] } });
  const box = new THREE.Box3().setFromObject(visual);
  const span = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  wrapper.add(visual);
  visual.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  wrapper.scale.set(size[0] / (span.x || 1), size[1] / (span.y || 1), size[2] / (span.z || 1));
  wrapper.userData.ownsBaseResources = !asset;
  return wrapper;
}
