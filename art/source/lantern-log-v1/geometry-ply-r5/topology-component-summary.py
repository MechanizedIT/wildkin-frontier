import json, numpy as np, os, sys
base='art/source/lantern-log-v1/geometry-ply-r5'; ply=os.path.join(base,'raw-geometry.ply'); audit=os.path.join(base,'topology-audit.json'); labels=np.memmap(ply+'.labels.bin',dtype='<u4',mode='r'); nv=1077634;nf=2218798;hb=397
positions=np.memmap(ply,dtype='<f4',mode='r',offset=hb,shape=(nv,3));dt=np.dtype([('count','u1'),('index','<u4',(3,))],align=False); faces=np.memmap(ply,dtype=dt,mode='r',offset=hb+nv*12,shape=(nf,))['index']
roots,inv=np.unique(labels,return_inverse=True); n=len(roots); fl=inv[faces[:,0]]; cross=int(np.count_nonzero((inv[faces[:,1]]!=fl)|(inv[faces[:,2]]!=fl))); fc=np.bincount(fl,minlength=n); vc=np.bincount(inv,minlength=n); areas=np.zeros(n,dtype=np.float64)
for b in range(0,nf,200000):
 t=faces[b:b+200000];a=positions[t[:,0]].astype(np.float64);bb=positions[t[:,1]].astype(np.float64);c=positions[t[:,2]].astype(np.float64);areas+=np.bincount(fl[b:b+len(t)],weights=.5*np.linalg.norm(np.cross(bb-a,c-a),axis=1),minlength=n)
ids=np.flatnonzero(fc); ranked=ids[np.argsort(areas[ids])[::-1]]; out=[]
for cid in ranked[:12]:
 pts=positions[inv==cid];out.append({'component':int(cid),'root_vertex':int(roots[cid]),'faces':int(fc[cid]),'vertices':int(vc[cid]),'area':float(areas[cid]),'bounds':{'min':[float(x) for x in pts.min(axis=0)],'max':[float(x) for x in pts.max(axis=0)]}})
with open(audit,encoding='utf8') as f:j=json.load(f)
j['findings']['components']={'method':'temporary LLVM clang++ union-find on undirected triangle-edge adjacency; labels summarized with read-only NumPy memmaps','face_bearing_component_count':int(len(ids)),'all_vertex_component_count':int(n),'cross_component_faces':cross,'largest_by_area':out,'note':'Isolated unused vertices each remain their own all-vertex component; face-bearing count is the topology result. Components use vertex-edge adjacency: a shared vertex joins shells.'}
j['method']['normal_winding_test']='not tested'
j['findings']['components']['connectivity']='vertex-connected through triangle edges; components that touch only at one vertex are joined'
j['execution']['component_solver']='clang++ 17 -O3 temporary union-find; no repository script or dependency added'
with open(audit,'w',encoding='utf8',newline='\n') as f:json.dump(j,f,indent=2);f.write('\n')
