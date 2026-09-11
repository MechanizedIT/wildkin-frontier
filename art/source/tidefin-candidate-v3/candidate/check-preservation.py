"""CPU-only exact exported preservation check for the action-only revision."""
import importlib.util,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('checker',root/'tools/art/check-game-glb.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def load(p):
 raw=p.read_bytes();d,b=m.parse_glb(raw)
 def values(i):return m.accessor_values(d,b,i)[1]
 clips={}
 for clip in d['animations']:
  tracks={}
  for c in clip['channels']:
   s=clip['samplers'][c['sampler']];tracks[(d['nodes'][c['target']['node']]['name'],c['target']['path'])]=(values(s['input']),values(s['output']),s.get('interpolation','LINEAR'))
  clips[clip['name']]=tracks
 meshes=[{'attributes':{k:values(i)for k,i in p['attributes'].items()},'indices':values(p['indices'])}for mesh in d['meshes']for p in mesh['primitives']]
 return hashlib.sha256(raw).hexdigest(),clips,meshes
old=load(out.parent/'v2/tidefin-motion.glb');new=load(out/'tidefin-motion.glb')
r={'sourceV2SHA256':old[0],'candidateV3SHA256':new[0],'meshAttributesIndicesExact':old[2]==new[2],'clipsExact':{n:old[1][n]==new[1][n]for n in ['Idle','Walk','Run']},'changedClips':{n:old[1][n]!=new[1][n]for n in ['Attack','Hurt']},'method':'Exact decoded exported mesh attributes/indices including skin weights; exact keyed animation inputs/outputs/interpolation by bone name'}
assert r['meshAttributesIndicesExact'] and all(r['clipsExact'].values()) and all(r['changedClips'].values())
(out/'preservation.json').write_text(json.dumps(r,indent=2),encoding='utf-8');print(json.dumps(r))
