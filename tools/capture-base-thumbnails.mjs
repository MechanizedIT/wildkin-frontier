// Bake actual catalog models once; menus do not create extra WebGL contexts.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = 'assets/ui/base';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/');
  await page.waitForFunction(() => Boolean(window.__game));
  const images = await page.evaluate(async () => {
    const T = await import('/vendor/three.module.js');
    const { BASE_PIECES } = await import('/src/base/baseCatalog.js');
    const { createBasePieceVisual } = await import('/src/base/basePieceVisual.js');
    const { FRONTIER_LIGHTING_CONFIG: light } = await import('/src/presentation/visualStyle.js');
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(160, 160); renderer.outputColorSpace = T.SRGBColorSpace;
    const images = [];
    for (const piece of BASE_PIECES) {
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight(light.skyColor, light.groundColor, light.skyIntensity));
      const sun = new T.DirectionalLight(light.sunColor, light.sunIntensity);
      sun.position.set(-4, 8, 6); scene.add(sun);
      const root = createBasePieceVisual(piece, window.__game.worldRegistry.data.visualAssets);
      scene.add(root);
      const center = new T.Vector3(0, piece.size[1] / 2, 0);
      const radius = Math.hypot(...piece.size) / 2;
      const span = radius * 1.06;
      const camera = new T.OrthographicCamera(-span, span, span, -span, .01, 40);
      camera.position.copy(center).add(new T.Vector3(4, 3, 6)); camera.lookAt(center);
      renderer.render(scene, camera);
      images.push({ id: piece.id, png: renderer.domElement.toDataURL('image/png').split(',')[1] });
      if (root.userData.ownsBaseResources) root.traverse(object => {
        object.geometry?.dispose();
        for (const material of [].concat(object.material ?? [])) material.dispose();
      });
    }
    renderer.dispose();
    return images;
  });
  for (const { id, png } of images) await fs.writeFile(`${out}/${id}.png`, Buffer.from(png, 'base64'));
  console.log(`Baked ${images.length} real-model thumbnails at 160×160.`);
} finally { await browser.close(); }
