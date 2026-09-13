(async () => {
  const THREE = await import('/vendor/three.module.js');
  const g = window.__game;
  const width = 768, height = 768;
  const target = new THREE.WebGLRenderTarget(width, height);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.OrthographicCamera(-72,72,72,-72,.1,500);
  const capture = (mode) => {
    if (mode === 'overhead') { camera.position.set(10,160,-200); camera.up.set(0,0,-1); camera.lookAt(10,0,-200); }
    else { camera.position.set(104,112,-83); camera.up.set(0,1,0); camera.lookAt(10,12,-200); }
    camera.updateMatrixWorld(true);
    const oldTarget=g.renderer.getRenderTarget(),fog=g.scene.fog;
    try {
      g.scene.fog=null;g.renderer.setRenderTarget(target);g.renderer.render(g.scene,camera);
      const pixels=new Uint8Array(width*height*4);g.renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d'),data=ctx.createImageData(width,height);
      for(let y=0;y<height;y++)data.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);
      ctx.putImageData(data,0,0);return canvas.toDataURL('image/png');
    } finally {g.renderer.setRenderTarget(oldTarget);g.scene.fog=fog;}
  };
  try { return {overhead:capture('overhead'),overview:capture('overview')}; }
  finally {target.dispose();}
})()
