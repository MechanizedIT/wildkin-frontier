"""Small read-only GLB track/contact audit; no Blender, dependencies or model changes."""
import json, struct, hashlib, math
from pathlib import Path
out=Path(__file__).resolve().parent
raw=(out/'tidefin-motion.glb').read_bytes()
jlen,jtype=struct.unpack_from('<II',raw,12)
doc=json.loads(raw[20:20+jlen]); binary=raw[28+jlen:]
def accessor(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
 assert a['componentType']==5126
 n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
 start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',n*4)
 return [struct.unpack_from('<'+'f'*n,binary,start+k*stride) for k in range(a['count'])]
checks={}
for animation in doc['animations']:
 maximum=0;root=None
 for channel in animation['channels']:
  sampler=animation['samplers'][channel['sampler']];values=accessor(sampler['output']);first,last=values[0],values[-1]
  error=max(abs(a-b) for a,b in zip(first,last))
  if channel['target']['path']=='rotation':error=min(error,max(abs(a+b)for a,b in zip(first,last)))
  maximum=max(maximum,error)
  if doc['nodes'][channel['target']['node']].get('name')=='Pelvis' and channel['target']['path']=='translation':
   root={axis:max(v[i]for v in values)-min(v[i]for v in values)for axis,i in [('X',0),('Y',1),('Z',2)]}
 assert root is not None
 checks[animation['name']]={'maximumTrackEndpointDelta':maximum,'exportedRootJoint':'Pelvis','translationRangeMeters':root}
(out/'loop-check.json').write_text(json.dumps({'sha256':hashlib.sha256(raw).hexdigest(),'method':'Actual GLB track endpoints and root joint ranges. Nondeform source Root is exported into Pelvis; ranges exclude its nonzero rest translation.','clips':checks},indent=2),encoding='utf-8')
contacts=json.loads((out/'actual-export-contact.json').read_text());summary={}
for name,clip in contacts['clips'].items():
 segments=[]
 for paw in clip['samples'][0]['paws']:
  active=[]
  for sample in clip['samples']:
   p=sample['paws'][paw]
   if p['stance']:active.append((p['worldX'],p['translatedZ']))
   elif active:segments.append(active);active=[]
  if active:segments.append(active)
 drift=max(math.dist(a,b)for seg in segments for a in seg for b in seg)
 lateral=max(max(p[0]for p in s)-min(p[0]for p in s)for s in segments)
 summary[name]={k:clip[k]for k in ['settings','maximumStanceDrift','maximumPlantedAbsY','minimumSoleY']}
 summary[name].update(maximumStanceDriftXZ=drift,maximumStanceLateralRange=lateral)
(out/'contact-summary.json').write_text(json.dumps({'sha256':contacts['sha256'],'clips':summary},indent=2),encoding='utf-8')
print(json.dumps({'loop':checks,'contact':summary},indent=2))
