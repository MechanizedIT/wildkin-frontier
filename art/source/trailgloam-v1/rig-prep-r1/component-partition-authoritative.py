from pathlib import Path
import numpy as np,json
root=Path('art/source/trailgloam-v1/rig-prep-r1'); source=Path('.dream-loop/trailgloam-rig-measured'); v=np.load(source/'vertices-blender-world.npy'); f=np.load(source/'triangles.npy'); n=len(v); parent=list(range(n))
def find(x):
 while parent[x]!=x: parent[x]=parent[parent[x]];x=parent[x]
 return x
def union(a,b):
 a=find(a);b=find(b)
 if a!=b:parent[b]=a
seen={}
for i,p in enumerate(v): union(i,seen.setdefault(tuple(np.round(p*1e6).astype(int)),i))
for a,b,c in f: union(int(a),int(b));union(int(b),int(c))
g={}
for i in range(n):g.setdefault(find(i),[]).append(i)
items=[]
for ids in g.values():
 x=v[ids];items.append({'n':len(ids),'min':x.min(0).round(6).tolist(),'max':x.max(0).round(6).tolist(),'center':x.mean(0).round(6).tolist()})
items.sort(key=lambda x:x['n'],reverse=True)
out={'authority':'Blender world arrays / identity matrix','receipt':json.loads((source/'receipt.json').read_text()),'position_weld_tolerance':1e-6,'welded_components':len(items),'largest':items[:20],'all_components':items}
(root/'component-partition-authoritative.json').write_text(json.dumps(out,indent=2),encoding='utf8')
print(out['welded_components'],out['receipt']['min'],out['receipt']['max'])
