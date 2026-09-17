import bpy,json,sys,hashlib
from pathlib import Path
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
root=Path(argv[0]) if argv else Path('art/source/trailgloam-v1/rig-prep-r1'); d=json.loads((root/'landmarks.json').read_text()); src=Path(d['source']['path']).resolve(); out=root/'candidate-r1'; assert not out.exists();out.mkdir()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));mesh=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]; mesh.name='TrailgloamTextured'; mesh.scale=(d['scale']['uniform'],)*3;mesh.location.z=d['scale']['ground_shift_z'];bpy.context.view_layer.objects.active=mesh;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='TrailgloamRig';rig.data.name='TrailgloamRig'
eb=rig.data.edit_bones; rootb=eb[0];rootb.name='root';rootb.head=(0,0,0);rootb.tail=(0,0,.2)
body=eb.new('body');body.head=d['body']['pivot'];body.tail=(d['body']['pivot'][0],d['body']['pivot'][1],d['body']['pivot'][2]+.2);body.parent=rootb
for leg in d['legs']:
 pts=[leg['attachment_root_provisional'],leg['knee'],leg['ankle'],[leg['sole']['target_xy'][0],leg['sole']['target_xy'][1],leg['sole']['z']]]; parent=body
 for name,a,b in zip(('coxa','knee','ankle','hoof'),pts,pts[1:]+[[pts[-1][0],pts[-1][1],pts[-1][2]-.04]]):
  q=eb.new(leg['id']+'_'+name);q.head=a;q.tail=b;q.parent=parent;parent=q
for fr in d['fronds']:
 q=eb.new('frond_'+fr['id']);q.head=fr['root'];q.tail=fr['tip'];q.parent=body
bpy.ops.object.mode_set(mode='OBJECT');
# explicit normalized skin: all body, each nearby hoof rigidly overrides
vg=mesh.vertex_groups.new(name='body'); vg.add(range(len(mesh.data.vertices)),1,'REPLACE')
for leg in d['legs']:
 g=mesh.vertex_groups.new(name=leg['id']+'_hoof'); a=leg['ankle']; r=.11; ids=[]
 for v in mesh.data.vertices:
  p=v.co
  if (p.x-a[0])**2+(p.y-a[1])**2+(p.z-a[2])**2<r*r:ids.append(v.index)
 if ids: vg.remove(ids);g.add(ids,1,'REPLACE')
mod=mesh.modifiers.new('TrailgloamArmature','ARMATURE');mod.object=rig
# actions neutral/load/walk
bpy.context.view_layer.objects.active=rig
for name,frame,offset in [('Neutral',1,0),('Loaded',10,-.018),('Walk',30,0)]:
 act=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=act
 rig.pose.bones['body'].location.z=offset;rig.pose.bones['body'].keyframe_insert('location',frame=1)
 if name=='Walk':
  for f,z in [(1,0),(15,-.02),(30,0)]:rig.pose.bones['body'].location.z=z;rig.pose.bones['body'].keyframe_insert('location',frame=f)
rig.animation_data.action=bpy.data.actions['Walk'];bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=30;bpy.context.scene.render.fps=30
bpy.ops.wm.save_as_mainfile(filepath=str(out/'trailgloam-rig-r1.blend'));bpy.ops.export_scene.gltf(filepath=str(out/'trailgloam-rig-r1.glb'),export_format='GLB',export_animations=True,export_anim_slide_to_zero=True)
(root/'build-rig-r1-receipt.json').write_text(json.dumps({'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'bones':len(rig.data.bones),'vertex_groups':len(mesh.vertex_groups),'output_glb':str(out/'trailgloam-rig-r1.glb')},indent=2))
