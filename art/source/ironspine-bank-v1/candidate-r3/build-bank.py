"""Root builder. Execute only after independent construction-plan V2 PASS.
Literal game-Y-up vertices become Blender native Z-up; no topology substitution.
"""
import bpy, bmesh, json, hashlib, math
from pathlib import Path
from collections import Counter
from mathutils import Vector
OUT=Path(__file__).resolve().parent; SRC=OUT.parent
PLAN=SRC/'construction-data-r3.json'; EXPECTED='9763c30394abe66761d05749bd97d18e8eade5005176dea61f1efd991540d6b2'
assert hashlib.sha256(PLAN.read_bytes()).hexdigest()==EXPECTED
data=json.loads(PLAN.read_text(encoding='utf-8-sig'))
assert (SRC/'construction-plan-r3-review.md').exists(), 'Independent review missing'
verts=[(x,-z,y) for x,y,z in data['vertices']];faces=data['faces']
bpy.ops.wm.read_factory_settings(use_empty=True)
me=bpy.data.meshes.new('IronspineBankLiteralR3');me.from_pydata(verts,[],faces);me.update()
changed=me.validate(verbose=True);me.calc_loop_triangles()
beforeNormals=[list(p.normal) for p in me.polygons]
# Audit literal normals first. R3 expects consistent input; do not silently
# repair it. Any failure remains a saved pre-render result for review.
obj=bpy.data.objects.new('GEO-IronspineNarrowBank-R3',me);bpy.context.collection.objects.link(obj)
edges=Counter(tuple(sorted((t.vertices[i],t.vertices[(i+1)%3]))) for t in me.loop_triangles for i in range(3))
adj={i:set() for i in range(len(me.vertices))}
for a,b in edges:adj[a].add(b);adj[b].add(a)
seen=set();components=0
for a in adj:
 if a in seen:continue
 components+=1;stack=[a];seen.add(a)
 while stack:
  for b in adj[stack.pop()]:
   if b not in seen:seen.add(b);stack.append(b)
volume=sum(me.vertices[t.vertices[0]].co.dot(me.vertices[t.vertices[1]].co.cross(me.vertices[t.vertices[2]].co))/6 for t in me.loop_triangles)
actual=[[v.co.x,v.co.z,-v.co.y] for v in me.vertices]
error=max(abs(a-b) for x,y in zip(actual,data['vertices']) for a,b in zip(x,y))
metrics={'status':'PRE_RENDER_AUDIT','inputSha256':EXPECTED,'blenderVersion':bpy.app.version_string,'meshValidateChanged':changed,'vertices':len(me.vertices),'triangles':len(me.loop_triangles),'edgeUseHistogram':dict(Counter(edges.values())),'components':components,'signedVolume':volume,'zeroAreaTriangles':sum(t.area<1e-9 for t in me.loop_triangles),'gameAxisRoundtripMaxError':error,'boundsGame':{'min':[min(v[i] for v in actual) for i in range(3)],'max':[max(v[i] for v in actual) for i in range(3)]},'capSourceFaces':{k:data['faceGroups'][k] for k in ['leftCap','rightCap']}}
metrics['normalRepair']={'method':'none; unmodified literal face winding is audited before rendering','changedFaces':[]}
directed=Counter((t.vertices[i],t.vertices[(i+1)%3]) for t in me.loop_triangles for i in range(3))
metrics['directedEdgeConsistent']=all(directed[(a,b)]==1 and directed[(b,a)]==1 for a,b in edges)
def receipt(): (OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
receipt()
assert not changed and len(me.loop_triangles)==256 and components==1 and set(edges.values())=={2} and volume>0 and metrics['zeroAreaTriangles']==0 and error<1e-6 and metrics['directedEdgeConsistent']
# Cap normals must actually face outward; the source indices are preserved.
metrics['capOutward']=all(me.polygons[i].normal.x<-.999 for i in data['faceGroups']['leftCap']) and all(me.polygons[i].normal.x>.999 for i in data['faceGroups']['rightCap'])
receipt()
assert metrics['capOutward'],'Cap winding'
mat=bpy.data.materials.new('Massing neutral');mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.28,.30,.31,1);bsdf.inputs['Roughness'].default_value=1;bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Alpha'].default_value=1
obj.data.materials.append(mat)
for p in me.polygons:p.use_smooth=False
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('NeutralWorld');scene.world.color=(.35,.35,.35)
scene.view_settings.view_transform='Standard'
center=Vector((0,0,.62))
def camera(name,game,scale=4.5):
 camd=bpy.data.cameras.new(name);camd.type='ORTHO';camd.ortho_scale=scale
 cam=bpy.data.objects.new(name,camd);bpy.context.collection.objects.link(cam);cam.location=(game[0],-game[2],game[1]);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam;return cam
for xyz,power,size in [((-4,-5,7),1100,5),((4,2,6),700,4)]:
 ld=bpy.data.lights.new('Softbox','AREA');ld.energy=power;ld.shape='DISK';ld.size=size
 ob=bpy.data.objects.new('Softbox',ld);bpy.context.collection.objects.link(ob);ob.location=xyz;ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
# Actual cap-facing transparent-film images and measured alpha coverage before studio.
scene.render.film_transparent=True;scene.render.resolution_x=scene.render.resolution_y=128
metrics['capOpaqueCoverage']=[]
for name,key,side in [('cap-left','leftCap',-1),('cap-right','rightCap',1)]:
 indices=data['faceGroups'][key];faceVertices=[list(me.polygons[i].vertices) for i in indices]
 cm=bpy.data.meshes.new(name+'Proof');cm.from_pydata([tuple(v.co) for v in me.vertices],[],faceVertices);cm.update()
 cap=bpy.data.objects.new(name+'Proof',cm);bpy.context.collection.objects.link(cap);cap.data.materials.append(mat);obj.hide_render=True
 used=[me.vertices[i].co for f in faceVertices for i in f]
 lo=Vector([min(v[i] for v in used) for i in range(3)]);hi=Vector([max(v[i] for v in used) for i in range(3)]);center=(lo+hi)/2
 scale=max(hi.y-lo.y,hi.z-lo.z)*1.25
 camera(name,(center.x+side*6,center.z,-center.y),scale)
 file=OUT/(name+'.png');scene.render.filepath=str(file);bpy.ops.render.render(write_still=True)
 im=bpy.data.images.load(str(file),check_existing=False);pixels=list(im.pixels);opaque=sum(pixels[i]>.5 for i in range(3,len(pixels),4));bpy.data.images.remove(im)
 expected=sum(me.polygons[i].area for i in indices)/(scale*scale)
 metrics['capOpaqueCoverage'].append({'file':file.name,'isolatedCapFaces':indices,'opaquePixels':opaque,'fraction':opaque/(128*128),'projectedPolygonFraction':expected,'minimumRelativeCoverage':.90})
 assert opaque/(128*128)>expected*.90,'Isolated cap render coverage'
 bpy.data.objects.remove(cap,do_unlink=True);bpy.data.meshes.remove(cm);obj.hide_render=False
center=Vector((0,0,.62))
receipt();scene.render.film_transparent=False
bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,-.385));floor=bpy.context.object;floor.name='StudioFloor'
floorMat=bpy.data.materials.new('Floor');floorMat.diffuse_color=(.5,.52,.53,1);floor.data.materials.append(floorMat)
scene.render.resolution_x=800;scene.render.resolution_y=600
for name,loc in [('source-threequarter',(4,3,-6)),('side',(0,.62,-8)),('end',(-8,.62,0)),('rear-threequarter',(-4,3,6))]:
 camera(name,loc);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ironspine-bank-r3.blend'))
metrics['status']='MASSING_READY_FOR_INDEPENDENT_REVIEW';metrics['renders']=[p.name for p in OUT.glob('*.png')];receipt()
print(json.dumps(metrics))

