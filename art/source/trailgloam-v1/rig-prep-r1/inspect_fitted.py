"""Read-only source/export comparison and full-cycle surface samples."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
BASE=Path.cwd()/'art/source/trailgloam-v1/rig-prep-r1'
OUT=BASE/'fitted-r1a';D=json.loads((BASE/'landmarks.json').read_text());REPORT=json.loads((OUT/'build-receipt.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path.cwd()/D['source']['path']))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH');S=D['scale']['uniform'];SHIFT=D['scale']['ground_shift_z']
points=[Vector((v.co.x*S,v.co.y*S,v.co.z*S+SHIFT)) for v in source.data.vertices]
source_uv=[set() for _ in points]
for loop in source.data.loops:source_uv[loop.vertex_index].add(tuple(source.data.uv_layers.active.data[loop.index].uv))
tree=KDTree(len(points))
for i,p in enumerate(points):tree.insert(p,i)
tree.balance();source_triangles=len(source.data.polygons)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'trailgloam-fitted.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
assert len(rig.data.bones)==REPORT['bones'];assert len(mesh.data.polygons)==source_triangles
for track in rig.animation_data.nla_tracks:track.mute=True
acts={a.name:a for a in bpy.data.actions};assert set(REPORT['clips'])<=set(acts)
def select(clip,phase):
    action=acts[clip];rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
    lo,hi=action.frame_range;f=lo+(hi-lo)*phase;bpy.context.scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update()
select('Neutral',0)
ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());neutral=[ev.matrix_world@v.co for v in ev.data.vertices]
maxdist=max(tree.find(p)[2] for p in neutral);assert maxdist<2e-6,maxdist
max_uv=0
for loop in mesh.data.loops:
    p=neutral[loop.vertex_index];uv=mesh.data.uv_layers.active.data[loop.index].uv
    matches=tree.find_range(p,2e-6)
    error=min(math.dist(uv,q) for _,i,_ in matches for q in source_uv[i]);max_uv=max(max_uv,error)
assert max_uv<2e-6,max_uv
footids={}
for leg in D['legs']:
    name=leg['id'];group=mesh.vertex_groups.get(name+'_foot')
    ids=[v.index for v in mesh.data.vertices if any(g.group==group.index and g.weight>.99 for g in v.groups)]
    lowest=min(neutral[i].z for i in ids)
    footids[name]=[i for i in ids if neutral[i].z<lowest+.005]
assert all(footids.values())
samples=[];A=set(D['gait']['stance_group_a'])
for clip in ['Neutral','Loaded','WalkDiagnostic']:
    for phase in ([0] if clip!='WalkDiagnostic' else [i/33 for i in range(34)]):
        select(clip,phase);ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());ps=[ev.matrix_world@v.co for v in ev.data.vertices]
        assert all(math.isfinite(v) for p in ps for v in p)
        mn=[min(p[i] for p in ps) for i in range(3)];mx=[max(p[i] for p in ps) for i in range(3)]
        assert max(mx[i]-mn[i] for i in range(3))<2.8
        feet={}
        for name,ids in footids.items():
            fp=[ps[i] for i in ids];center=sum(fp,Vector())/len(fp)
            feet[name]={'stance':(phase+(0 if name in A else .5))%1<.6,'minZ':min(p.z for p in fp),'maxZ':max(p.z for p in fp),'center':list(center)}
        samples.append({'clip':clip,'phase':phase,'bounds':[mn,mx],'feet':feet})
walk=[s for s in samples if s['clip']=='WalkDiagnostic']
movement={n:max(s['feet'][n]['center'][1] for s in walk)-min(s['feet'][n]['center'][1] for s in walk) for n in footids}
assert min(movement.values())>.06,movement
max_stance_z=max(abs(f['minZ']) for s in walk for f in s['feet'].values() if f['stance'])
loop_error=max(math.dist(walk[0]['feet'][n]['center'],walk[-1]['feet'][n]['center']) for n in footids)
assert loop_error<1e-5,loop_error
result={'glbSHA256':REPORT['glbSHA256'],'bones':len(rig.data.bones),'sourceVertexCount':len(points),'exportReimportVertexCount':len(mesh.data.vertices),'triangles':len(mesh.data.polygons),'maxNeutralSurfaceErrorM':maxdist,'maxUVError':max_uv,'vertexCountNote':'Exporter split 40 additional vertices. Geometry and UVs compared against source; vertex count alone was an invalid preservation assertion. No model regeneration.','actions':list(acts),'minFootTravelM':min(movement.values()),'maxStanceSoleAbsHeightM':max_stance_z,'loopFootErrorM':loop_error,'samples':samples,'status':'Surface/UV/rig/loop assertions pass; visual deformation and contact review still required'}
(OUT/'roundtrip-receipt.json').write_text(json.dumps(result,indent=2));print('INSPECTION_COMPLETE',json.dumps({k:v for k,v in result.items() if k!='samples'}))
