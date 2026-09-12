// Development-only renderer for CUA/CDP capture. Reuses the real factories;
// menus consume the resulting PNGs and never create a WebGL context.
import * as THREE from '../../vendor/three.module.js';
import { BASE_PIECES } from '../../src/base/baseCatalog.js';
import { createBasePieceVisual } from '../../src/base/basePieceVisual.js';
import { FRONTIER_LIGHTING_CONFIG as light } from '../../src/presentation/visualStyle.js';

export function renderBaseThumbnails({ visualAssets, pieceIds, prepare = () => {} }) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(160,160);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const images=[];
  try {
    for(const piece of BASE_PIECES.filter(piece=>pieceIds.includes(piece.id))) {
      const scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(light.skyColor,light.groundColor,light.skyIntensity));
      const sun=new THREE.DirectionalLight(light.sunColor,light.sunIntensity);sun.position.set(-4,8,6);scene.add(sun);
      const root=createBasePieceVisual(piece,visualAssets);prepare(root,piece);scene.add(root);
      const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
      const span=bounds.getSize(new THREE.Vector3()).length()*.53;
      const camera=new THREE.OrthographicCamera(-span,span,span,-span,.01,40);
      camera.position.copy(center).add(new THREE.Vector3(4,3,6));camera.lookAt(center);
      renderer.render(scene,camera);
      images.push({id:piece.id,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,
        png:renderer.domElement.toDataURL('image/png').split(',')[1]});
      if(root.userData.ownsBaseResources){
        const geometries=new Set(),materials=new Set();
        root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [].concat(node.material??[]))materials.add(material);});
        geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
      }
    }
    return images;
  } finally { renderer.dispose(); }
}
