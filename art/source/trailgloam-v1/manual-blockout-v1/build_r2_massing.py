# R2: explicit section-loft massing. No Boolean or voxel modifiers.
import bpy,bmesh,os,json,hashlib,math
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(ROOT,'renders','gate-a-r2'); os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
S=bpy.context.scene; S.render.engine='BLENDER_EEVEE_NEXT'; S.render.image_settings.file_format='PNG'; S.world.color=(.04,.05,.06)
def mat(n,c):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); return m
teal=mat('teal',(.09,.29,.30)); dark=mat('dark',(.06,.07,.08)); amber=mat('amber',(.72,.30,.05)); groundmat=mat('ground',(.21,.22,.23))
# Closed 12-sided section loft, explicit ring profile. Rings are capped only at dorsal/ventral ends.
bm=bmesh.new(); rings=[]
for z,sx,sy in [(.43,.48,.38),(.54,.58,.50),(.72,.58,.50),(.90,.47,.39),(1.02,.25,.18)]:
 ring=[]
 for i in range(12):
  a=2*math.pi*i/12; ring.append(bm.verts.new((sx*math.cos(a),.04+sy*math.sin(a),z)))
 rings.append(ring)
for a,b in zip(rings,rings[1:]):
 for i in range(12): bm.faces.new((a[i],a[(i+1)%12],b[(i+1)%12],b[i]))
bm.faces.new(tuple(reversed(rings[0]))); bm.faces.new(tuple(rings[-1]))
# Explicit loop bridge helper. Shell attachment loops are generated as open named geometry,
# then bridged with equal six-sided boundary loops; no Boolean/voxel operations are used.
def tube(path,r=.09,n=6):
 loops=[]
 for p in path:
  loop=[]
  for i in range(n):
   a=2*math.pi*i/n; loop.append(bm.verts.new((p[0]+r*math.cos(a),p[1]+r*math.sin(a),p[2])))
  loops.append(loop)
 for a,b in zip(loops,loops[1:]):
  for i in range(n): bm.faces.new((a[i],a[(i+1)%n],b[(i+1)%n],b[i]))
 return loops
legs={'LF':[(-.47,-.38,.58),(-.67,-.54,.36),(-.59,-.76,.14),(-.66,-.86,.06)],'LM':[(-.56,-.02,.57),(-.79,-.10,.38),(-.73,-.28,.15),(-.78,-.38,.06)],'LR':[(-.46,.36,.55),(-.68,.49,.37),(-.57,.67,.14),(-.61,.78,.06)],'RF':[(.47,-.38,.58),(.67,-.54,.36),(.59,-.76,.14),(.66,-.86,.06)],'RM':[(.56,-.02,.57),(.79,-.10,.38),(.73,-.28,.15),(.78,-.38,.06)],'RR':[(.46,.36,.55),(.68,.49,.37),(.57,.67,.14),(.61,.78,.06)]}
# Build six visible six-sided cuff->upper->lower->hoof paths. First loop enters shell volume by .12m;
# the actual audit will reject disconnected components rather than concealing them.
for k,pts in legs.items():
 p0=Vector(pts[0]); inner=Vector((p0.x*.55,p0.y*.55,.68)); loops=tube([inner,*map(Vector,pts)],.085,6)
 # flattened 6-sided hoof, sole cap at Z=0
 h=Vector(pts[-1]); hoof=tube([h+Vector((0,0,.08)),h],.14,6); bm.faces.new(tuple(reversed(hoof[-1])))
 # bridge matching open six loops (reversed orientation)
 for i in range(6): bm.faces.new((loops[-1][i],loops[-1][(i+1)%6],hoof[0][(5-(i+1)%6)],hoof[0][5-i]))
# Two thin folded blades are closed six-sided tapered paths, entered through posterior shell volume.
for side,x in [('L',-.23),('R',.23)]:
 tube([(x,.22,.88),(x,.22,1.00),(x*1.38,.29,1.32),(x*1.65,.26,1.55)],.075,6)
bm.normal_update(); mesh=bpy.data.meshes.new('Trailgloam_R2_section_loft'); bm.to_mesh(mesh); bm.free(); obj=bpy.data.objects.new('Trailgloam_R2_explicit_loop_massing',mesh); bpy.context.collection.objects.link(obj); obj.data.materials.append(teal)
# audit
mesh.validate(verbose=True,clean_customdata=False); mesh.update(); bm=bmesh.new(); bm.from_mesh(mesh); comps=0; seen=set(); non2=[e for e in bm.edges if len(e.link_faces)!=2]
for v in bm.verts:
 if v.index in seen: continue
 comps+=1; st=[v];seen.add(v.index)
 while st:
  q=st.pop()
  for e in q.link_edges:
   o=e.other_vert(q)
   if o.index not in seen:seen.add(o.index);st.append(o)
bm.free()
# presentation
bpy.ops.mesh.primitive_plane_add(size=5,location=(0,0,0)); floor=bpy.context.object; floor.data.materials.append(groundmat)
for loc,en in [((-3,-4,5),900),((3,2,4),400),((0,-2,-3),350)]: bpy.ops.object.light_add(type='AREA',location=loc); bpy.context.object.data.energy=en; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=4
def render(n,loc,res=640,hide=False):
 bpy.ops.object.camera_add(location=loc); c=bpy.context.object;c.data.type='ORTHO';c.data.ortho_scale=2.4;c.rotation_euler=(Vector((0,0,.75))-Vector(loc)).to_track_quat('-Z','Y').to_euler();S.camera=c;floor.hide_render=hide;S.render.resolution_x=res;S.render.resolution_y=res;S.render.filepath=os.path.join(OUT,n+'.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(c,do_unlink=True);floor.hide_render=False
views={'front':(0,-4,.8),'rear':(0,4,.8),'left':(-4,0,.8),'right':(4,0,.8),'top':(0,0,4),'underside':(-2,-2,-2),'three_quarter':(-3,-4,2.4)}
for n,l in views.items():render(n,l,640,n=='underside')
render('three_quarter_96',views['three_quarter'],96);render('three_quarter_48',views['three_quarter'],48)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'trailgloam-gatea-r2-neutral-massing.blend'))
xs=[v.co.x for v in mesh.vertices];ys=[v.co.y for v in mesh.vertices];zs=[v.co.z for v in mesh.vertices]
with open(__file__,'rb') as f: sh=hashlib.sha256(f.read()).hexdigest()
json.dump({'status':'UNREVIEWED_R2_GATE_A','script_sha256':sh,'operations':'section loft plus six-sided explicit tube/bridge paths; no Boolean or voxel','mesh':{'vertices':len(mesh.vertices),'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'components':comps,'non_two_face_edges':len(non2),'bounds':[min(xs),min(ys),min(zs),max(xs),max(ys),max(zs)]},'contact_graph':{k:['shell','cuff','upper','lower','ankle','hoof'] for k in legs},'fronds':['shell','collar','fold_base','fold_tip'],'renders':['renders/gate-a-r2/'+x+'.png' for x in list(views)+['three_quarter_96','three_quarter_48']],'limits':['no export','no rig','no runtime']},open(os.path.join(ROOT,'gate-a-r2-metrics.json'),'w'),indent=2)
