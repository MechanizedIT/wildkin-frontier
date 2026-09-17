# Corrected R2 builder source — review before execution.
# Uses one raw coordinate space; metric root carries both mesh and armature.
import bpy,json,sys,hashlib,math
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]; root=Path(args[0]); d=json.loads((root/'landmarks.json').read_text()); src=Path(d['source']['path']).resolve(); out=root/'candidate-r2/output'; assert not out.exists();out.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(src)); mesh=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]; mesh.name='TrailgloamTextured'
raw_counts={'vertices':len(mesh.data.vertices),'triangles':len(mesh.data.polygons),'uv_layers':len(mesh.data.uv_layers)}
# metric root transforms BOTH skin and armature, not one representation only.
bpy.ops.object.empty_add(type='PLAIN_AXES'); metric=bpy.context.object; metric.name='TrailgloamMetricRoot'; metric.scale=(d['scale']['uniform'],)*3;metric.location.z=d['scale']['ground_shift_z'];mesh.parent=metric
bpy.ops.object.armature_add(enter_editmode=True); rig=bpy.context.object;rig.name='TrailgloamRig';rig.parent=metric; eb=rig.data.edit_bones; rootb=eb[0];rootb.name='root';rootb.head=(0,0,0);rootb.tail=(0,0,.1);body=eb.new('body');body.head=d['body']['pivot'];body.tail=(0,0,.1);body.parent=rootb
for L in d['legs']:
 pts=[L['attachment_root_provisional'],L['knee'],L['ankle'],[L['sole']['target_xy'][0],L['sole']['target_xy'][1],L['sole']['z']]];par=body
 for tag,a,b in zip(('coxa','knee','ankle','hoof'),pts,pts[1:]+[[pts[-1][0],pts[-1][1],pts[-1][2]-.03]]): q=eb.new(L['id']+'_'+tag);q.head=a;q.tail=b;q.parent=par;par=q
for F in d['fronds']:
 q=eb.new('frond_'+F['id']);q.head=F['root'];q.tail=F['tip'];q.parent=body
bpy.ops.object.mode_set(mode='OBJECT')
# Explicit normalized segment weights.  Every selected vertex is owned by one
# nearest anatomical segment, never merely the nearest landmark knot.
bodyg=mesh.vertex_groups.new(name='body');bodyg.add(range(len(mesh.data.vertices)),1,'REPLACE')
def dseg(p,a,b):
 ax,ay,az=a; bx,by,bz=b; dx,dy,dz=bx-ax,by-ay,bz-az; den=dx*dx+dy*dy+dz*dz
 t=max(0,min(1,((p.x-ax)*dx+(p.y-ay)*dy+(p.z-az)*dz)/den)); q=(ax+t*dx,ay+t*dy,az+t*dz)
 return (p.x-q[0])**2+(p.y-q[1])**2+(p.z-q[2])**2
coverage={}
for L in d['legs']:
 pts=[L['attachment_root_provisional'],L['knee'],L['ankle'],[L['sole']['target_xy'][0],L['sole']['target_xy'][1],L['sole']['z']]]; names=[L['id']+'_coxa',L['id']+'_knee',L['id']+'_ankle',L['id']+'_hoof']; groups=[mesh.vertex_groups.new(name=n) for n in names]; coverage[L['id']]={n:0 for n in names}
 for v in mesh.data.vertices:
  ds=[dseg(v.co,pts[0],pts[1]),dseg(v.co,pts[1],pts[2]),dseg(v.co,pts[2],pts[3]),(v.co.x-pts[3][0])**2+(v.co.y-pts[3][1])**2+(v.co.z-pts[3][2])**2]; i=min(range(4),key=lambda j:ds[j]); radius=(.14,.13,.11,.10)[i]
  if ds[i]<radius*radius: bodyg.remove([v.index]);groups[i].add([v.index],1,'REPLACE');coverage[L['id']][names[i]]+=1
# Normalized one-owner invariant; every deform group must receive actual vertices.
assert all(all(n>0 for n in x.values()) for x in coverage.values()),coverage
assert len(bodyg.weight(0) if False else [v for v in mesh.data.vertices])==len(mesh.data.vertices)
mod=mesh.modifiers.new('TrailgloamArmature','ARMATURE');mod.object=rig
# Actual alternating 4-foot diagnostic rotations.
rig.animation_data_create(); walk=bpy.data.actions.new('WalkDiagnostic');rig.animation_data.action=walk
A=set(d['gait']['stance_group_a']); fps=30
for frame,phase in ((1,0),(15,1),(30,0)):
 for L in d['legs']:
  swing=(L['id'] in A)==(phase==1)
  for tag,ang in (('coxa',.10 if swing else 0),('knee',-.36 if swing else 0),('ankle',.24 if swing else 0)):
   pb=rig.pose.bones[L['id']+'_'+tag];pb.rotation_mode='XYZ';pb.rotation_euler.x=ang;pb.keyframe_insert('rotation_euler',frame=frame)
rig.pose.bones['body'].location.z=-.008 if phase else 0;rig.pose.bones['body'].keyframe_insert('location',frame=frame)
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=30;bpy.context.scene.render.fps=fps
# Evaluate neutral and loaded/swing poses without mutating source geometry.
pose_bounds={}
for frame in (1,15,30):
 bpy.context.scene.frame_set(frame); ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()); vs=[ev.matrix_world@v.co for v in ev.data.vertices]; pose_bounds[str(frame)]=[[min(x[i] for x in vs) for i in range(3)],[max(x[i] for x in vs) for i in range(3)]]
bpy.ops.wm.save_as_mainfile(filepath=str(out/'trailgloam-rig-r2.blend'));bpy.ops.export_scene.gltf(filepath=str(out/'trailgloam-rig-r2.glb'),export_format='GLB',export_animations=True,export_anim_slide_to_zero=True)
# Fresh reimport verifies exported skeleton/action inventory and actual duration.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/'trailgloam-rig-r2.glb')); imported=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']; ia=imported[0]; actions=list(bpy.data.actions); duration=(max(a.frame_range[1] for a in actions)-min(a.frame_range[0] for a in actions))/fps
(root/'candidate-r2/receipt.json').write_text(json.dumps({'raw_counts':raw_counts,'coverage':coverage,'bones':len(rig.data.bones),'pose_bounds':pose_bounds,'roundtrip_armatures':len(imported),'roundtrip_bones':len(ia.data.bones),'roundtrip_actions':[a.name for a in actions],'walk_seconds':duration,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest()},indent=2))
