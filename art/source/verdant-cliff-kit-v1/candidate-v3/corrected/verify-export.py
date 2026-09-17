"""Read-only exact palette, grounding and conservative collider coverage proof."""
import importlib.util
import io
import json
import sys
from pathlib import Path
from PIL import Image
ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('checker', ROOT / 'tools/art/check-game-glb.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
manifest = json.loads((HERE / 'manifest.json').read_text())
records=[]
for asset in manifest['assets']:
    path=HERE / asset['file']
    doc, binary=checker.parse_glb(path.read_bytes())
    image_doc=doc['images'][0]
    _, data=checker.view_blob(doc,binary,image_doc['bufferView'])
    image=Image.open(io.BytesIO(data)).convert('RGB')
    observed=sorted({image.getpixel((x*64+32,y*64+32)) for y in range(4) for x in range(4)})
    expected=sorted(tuple(c) for c in asset['texture']['srgbBytePalette'])
    assert observed==expected, (asset['name'],'double sRGB conversion or palette mismatch')
    mat=doc['materials'][0]
    assert mat.get('alphaMode','OPAQUE')=='OPAQUE'
    assert mat['pbrMetallicRoughness']['metallicFactor']==0
    assert mat['pbrMetallicRoughness'].get('roughnessFactor',1)==1
    assert len(doc['meshes'])==1 and len(doc['materials'])==1 and len(doc['images'])==1
    positions=[]
    for prim in doc['meshes'][0]['primitives']:
        _, points=checker.accessor_values(doc,binary,prim['attributes']['POSITION'])
        positions.extend(points)
    assert abs(min(v[1] for v in positions)) < .00001, 'GLB must be Y-up grounded'
    hull=asset['runtimeCollider']
    vertices=[hull['vertices'][i:i+3] for i in range(0,len(hull['vertices']),3)]
    maximum=-float('inf')
    for i in range(0,len(hull['indices']),3):
        a,b,c=[vertices[j] for j in hull['indices'][i:i+3]]
        u=[b[j]-a[j] for j in range(3)]
        v=[c[j]-a[j] for j in range(3)]
        n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
        length=sum(x*x for x in n)**.5
        for point in positions:
            distance=sum(n[j]*(point[j]-a[j]) for j in range(3))/length
            maximum=max(maximum,distance)
    assert maximum <= .00002, (asset['name'],'render outside collider',maximum)
    records.append({'file':asset['file'],'sha256':asset['sha256'],'paletteExact16Swatches':True,
                    'opaqueEmbeddedSingleMaterial':True,'glbGroundedYUp':True,
                    'colliderMaxOutsideMeters':maximum,'colliderVertices':len(vertices),
                    'colliderIndices':len(hull['indices']),'triangles':asset['triangles']})
receipt={'status':'PASS','assets':records,'scope':'Structural exact export only; independent art and native gameplay remain pending.'}
(HERE / 'export-verification.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt,indent=2))
