"""One-root five-rib sapwood, built for semantic depletion. Blender4.5 CPU only.
X right/-Y front/Z up; exported glTF +Z front/Y up. No runtime edits.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser();parser.add_argument('--output-dir',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(args.output_dir).resolve()
if out.exists():raise RuntimeError('Use a fresh revision directory')
out.mkdir(parents=True);bpy.ops.wm.read_factory_settings(use_empty=True)
colors={'bark':(103,70,63),'barklight':(129,84,69),'barkdark':(76,54,55),'barkpurple':(91,64,67),
 'cut':(222,173,115),'grain':(238,193,132),'grainlight':(249,212,156),'graindark':(193,140,87),
 'leaf':(54,113,112),'leaflight':(75,139,133),'leafdark':(38,86,88),'leafridge':(93,153,142),
 'root':(108,72,61),'rootlight':(128,83,67),'rootdark':(82,58,55),'sap':(215,160,94)}
palette=list(colors);im=bpy.data.images.new('SapwoodPalette256',width=256,height=256,alpha=False)
pixels=[]
for y in range(256):
 for x in range(256):pixels.extend([v/255 for v in colors[palette[(y//64)*4+x//64]]]+[1])
im.pixels.foreach_set(pixels);im.filepath_raw=str(out/'palette.png');im.file_format='PNG';im.save();im.pack()
mat=bpy.data.materials.new('SapwoodMattePalette');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=1;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=0
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Closest';mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
groups={i:[] for i in range(6)}
def mesh(name,verts,faces,tones,bucket):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);data.materials.append(mat)
 uv=data.uv_layers.new(name='Palette')
 for i,p in enumerate(data.polygons):
  c=palette.index(tones[i%len(tones)]);co=((c%4+.5)/4,(c//4+.5)/4)
  for k in p.loop_indices:uv.data[k].uv=co
  p.use_smooth=False
 groups[bucket].append(ob);return ob
def tube(name,path,radii,bucket,tones=('bark','barklight','barkpurple'),sides=8,caps=True):
 verts=[]
 for (x,y,z),(rx,ry) in zip(path,radii):
  for n in range(sides):
   a=n*math.tau/sides;verts.append((x+math.cos(a)*rx,y+math.sin(a)*ry,z))
 faces=[];cs=[]
 for k in range(len(path)-1):
  for n in range(sides):faces.append((k*sides+n,k*sides+(n+1)%sides,(k+1)*sides+(n+1)%sides,(k+1)*sides+n));cs.append(tones[(n+k)%len(tones)])
 if caps:faces += [tuple(reversed(range(sides))),tuple((len(path)-1)*sides+n for n in range(sides))];cs += [tones[0],tones[0]]
 return mesh(name,verts,faces,cs,bucket)

# A single persistent low common root. Its five sockets never move or get remade.
tube('Common root knot',[(0,0,.025),(0,0,.19),(0,.025,.29)],[(.43,.37),(.40,.34),(.25,.23)],5,('root','rootlight','rootdark'),9)
for i,a in enumerate([-.22,.80,1.97,3.15,4.13,5.15]):
 dx,dy=math.cos(a),math.sin(a)
 tube(f'Buttress root {i}',[(dx*.43,dy*.41,0),(dx*.42,dy*.39,.075),(dx*.32,dy*.29,.22),(dx*.14,dy*.14,.31)],[(.125,.12),(.14,.135),(.145,.12),(.10,.10)],5,('root','rootlight','rootdark'),5)

# Paths correspond to one root joint each. Order removes small outer shoots first.
# Central mature rib persists to the last strike; bases fit the existing low collider.
paths=[
 [(0,.09,.465),(.015,.09,.72),(.075,.08,.94),(.015,.07,1.19),(-.02,.085,1.42),(.065,.095,1.63)],
 [(-.20,.055,.375),(-.245,.055,.65),(-.27,.07,.91),(-.35,.07,1.12),(-.52,.06,1.31)],
 [(.20,.035,.35),(.255,.035,.54),(.37,.07,.77),(.415,.09,.99),(.515,.10,1.14)],
 [(-.255,-.165,.29),(-.36,-.17,.48),(-.46,-.19,.64),(-.65,-.19,.82)],
 [(.245,-.175,.275),(.36,-.18,.415),(.52,-.20,.49),(.67,-.19,.66)]
]
widths=[[.18,.215,.265,.27,.285,.19],[.16,.22,.25,.26,.17],[.15,.195,.24,.25,.165],[.15,.205,.23,.17],[.14,.20,.24,.165]]
joint_positions=[]
for i,path in enumerate(paths):
 x,y,z=path[0];joint_positions.append([x,z,-y])
 tube(f'Fixed stump socket {i}',[(x*.68,y*.65,.17),(x,y,z-.085),(x,y,z)],[(.17,.14),(.14,.12),(.125,.10)],5,('bark','barklight','barkpurple'),7)
 # Pale cut cap, with broad grain strips, lies just below the attached rib base.
 # Remaining stump visibly shows the same cut when that exact rib disappears.
 capverts=[(x,y,z+.0002)]
 for n in range(7):
  a=n*math.tau/7;capverts.append((x+math.cos(a)*.108,y+math.sin(a)*.084,z+.0002))
 mesh(f'Cut socket face {i}',capverts,[(0,n+1,(n+1)%7+1) for n in range(7)],['cut','grain','grainlight','grain','cut','grain','graindark'],5)
 joint=bpy.data.objects.new(f'TreeJoint{i}',None);bpy.context.collection.objects.link(joint);joint.location=(x,y,z);joint['chunk']=f'tree_chunk_{i}'

def rib(i):
 path=paths[i];ws=widths[i];verts=[];centers=[]
 for k,p in enumerate(path):
  p=Vector(p)
  if k==0:p.z-=.002  # Enclose the permanent cut cap while this rib is attached.
  # Cross-sectional width follows the bend while the broad exposed face points forward.
  tangent=Vector(path[min(k+1,len(path)-1)])-Vector(path[max(0,k-1)])
  u=Vector((tangent.z,0,-tangent.x)).normalized();w=ws[k];depth=.155+(w-.15)*.45
  if k==0:u=Vector((1,0,0));w=.25;depth=.21
  section=[(-.5,-.28),(-.39,-.5),(.39,-.5),(.5,-.28),(.5,.28),(.35,.5),(-.35,.5),(-.5,.28)]
  for a,b in section:verts.append(tuple(p+u*(w*a)+Vector((0,depth*b,0))))
  centers.append((p,u,w,depth))
 faces=[];tones=[]
 for k in range(len(path)-1):
  for n in range(8):
   faces.append((k*8+n,k*8+(n+1)%8,(k+1)*8+(n+1)%8,(k+1)*8+n));tones.append(['barklight','barklight','bark','barkpurple','barkdark','bark','barkpurple','bark'][n])
 faces += [tuple(reversed(range(8))),tuple((len(path)-1)*8+n for n in range(8))];tones += ['bark','barklight']
 mesh(f'Rib {i} bark shell',verts,faces,tones,i)
 # The pale longitudinal face remains inset within a substantial bark rim.
 verts=[]
 for k,(p,u,w,d) in enumerate(centers):
  p=p.copy()
  if k==0:p.z+=.010
  if k==len(centers)-1:p.z-=.024
  for n,a in enumerate([-.325,-.20,-.025,.14,.325]):
   grain_offset=math.sin(k*1.77+i*.45+n)*.010 if n not in [0,4] else 0
   verts.append(tuple(p+u*(w*a+grain_offset)+Vector((0,-d*.5-.0018-(.003 if n==2 else 0),0))))
 faces=[];tones=[]
 for k in range(len(centers)-1):
  for n in range(4):faces.append((k*5+n,k*5+n+1,(k+1)*5+n+1,(k+1)*5+n));tones.append(['grain','grainlight','grain','cut'][n])
 mesh(f'Rib {i} longitudinal exposed wood',verts,faces,tones,i)
 return Vector(path[-1])

def fin(name,base,tip,width,roll,bucket):
 # Broad thin leather blade: irregular outline, blunted tip and one crease.
 base=Vector(base);tip=Vector(tip);axis=tip-base
 side=Vector((math.cos(roll),math.sin(roll),0));side=(side-axis.normalized()*side.dot(axis.normalized())).normalized()
 normal=axis.cross(side).normalized()
 outline=[(0,0),(-.40,.20),(-.52,.53),(-.36,.79),(-.09,.96),(.095,1),(.37,.74),(.47,.43),(.24,.16)]
 verts=[]
 for a,b in outline:verts.append(tuple(base+axis*b+side*(a*width)))
 verts.append(tuple(base+axis*.49+normal*.022));verts.append(tuple(base+axis*.49-normal*.014))
 faces=[];tones=[]
 for n in range(9):
  faces.append((n,(n+1)%9,9));tones.append(['leaf','leaflight','leaf','leafridge'][n%4])
  faces.append(((n+1)%9,n,10));tones.append('leafdark')
 mesh(name,verts,faces,tones,bucket)
 # Short broad petiole joins blade directly into the woody rib.
 b=base-axis*.08;tube(name+' petiole',[tuple(b),tuple(base+axis*.17)],[(.031,.023),(.035,.022)],bucket,('leafdark',),5)

for i in range(5):
 tip=rib(i);base=tip+Vector((0,.045,-.035))
 specs={0:[((.045,.07,.335),.27,.1),((.215,.12,.22),.20,.35),((-.14,.095,.25),.18,-.25)],
 1:[((-.26,.02,.095),.23,.25),((-.06,.07,.275),.20,-.2)],
 2:[((.12,.03,.25),.22,-.15),((.275,.015,.09),.22,.1)],
 3:[((-.26,.00,.08),.235,.2),((-.15,-.015,-.085),.21,-.2)],
 4:[((.17,.06,.21),.21,.2),((.255,.015,.09),.23,-.2)]}[i]
 for j,(delta,w,roll) in enumerate(specs):fin(f'Attached leathery fin {i}.{j}',base,base+Vector(delta),w,roll,i)

bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(out/'sapwood-editable.blend'))
for bucket,objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object
 ob.name='TreeStump' if bucket==5 else f'tree_chunk_{bucket}';bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 ob['harvestRole']='persistentStump' if bucket==5 else 'removableCompleteRib'
triangles=sum(len(p.vertices)-2 for ob in bpy.context.scene.objects if ob.type=='MESH' for p in ob.data.polygons)
if triangles>5000:raise RuntimeError(f'Over budget:{triangles}')
bpy.ops.export_scene.gltf(filepath=str(out/'sapwood.glb'),export_format='GLB',export_yup=True,export_extras=True)
glb=out/'sapwood.glb';manifest={'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'bytes':glb.stat().st_size,'triangles':triangles,'meshes':6,'materialCount':1,'textureSize':256,'referenceSHA256':'301371d951851c1590b47a0bc2f8869dec417b3d2e37224ecba7289ae7e7e668','interpretation':'One persistent common root/five fixed sockets; all stages hide only complete ribs and their fins. Teal fins broadened, flattened, blunted and attached, not crystal points. Reference full/depleted base mismatch explicitly not reproduced.','jointsGLTF':joint_positions,'depletionOrder':[4,3,2,1,0],'review':'Pending independent exact-export judgment'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest),flush=True)

# Fresh GLB import proves geometry grouping and stage behavior.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review world');scene.world.color=(.34,.36,.38);scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
floor=bpy.data.materials.new('Review floor');floor.diffuse_color=(.30,.31,.31,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.007));bpy.context.object.data.materials.append(floor)
for p,power,size in [((3,-4,6),420,5),((-3,-1,4),190,4)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.5
for label,hits,position in [('full',0,(2.2,-4,2.0)),('one-hit',1,(2.2,-4,2.0)),('three-hits',3,(2.2,-4,2.0)),('one-remaining',4,(2.2,-4,2.0)),('depleted',5,(2.2,-4,2.0)),('rear',0,(-2.2,4,2.0)),('front',0,(0,-4,1.7))]:
 for i in range(5):bpy.data.objects[f'tree_chunk_{i}'].hide_render=(i>=5-hits)
 camera.location=position;camera.rotation_euler=(Vector((0,0,.92))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'{label}.png');bpy.ops.render.render(write_still=True)
print('Sapwood render job ended',flush=True)
