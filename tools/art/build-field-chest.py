"""Bounded field chest reconstruction. Blender X right/-Y front/Z up -> glTF +Z front/Y up.
One palette, real hollow shell, lid and two released catches; no runtime integration.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector, Matrix

parser=argparse.ArgumentParser()
parser.add_argument('--output-dir',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(args.output_dir).resolve()
if (out/'field-chest.glb').exists():raise ValueError('Fresh candidate export required')
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
colors={'blue':(78,96,114),'blue_light':(97,115,132),'blue_dark':(60,76,91),
        'tan':(183,157,118),'tan_edge':(206,181,142),'ivory':(224,214,192),
        'steel':(48,57,64),'edge':(66,76,83),'inside':(34,42,48),
        'amber':(242,162,61),'amber_edge':(255,185,85),'seam':(42,53,64),
        'hinge':(83,89,91),'floor':(44,53,61),'pin':(103,111,114),'black':(27,32,36)}
atlas=bpy.data.images.new('FieldChestPalette256',width=256,height=256,alpha=False)
pixels=[]
for y in range(256):
 for x in range(256):pixels.extend([v/255 for v in list(colors.values())[(y//64)*4+x//64]]+[1])
atlas.pixels.foreach_set(pixels);atlas.filepath_raw=str(out/'palette.png');atlas.file_format='PNG';atlas.save();atlas.pack()
mat=bpy.data.materials.new('FieldChestMattePalette');mat.use_nodes=True
shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=1;shader.inputs['Metallic'].default_value=0;shader.inputs['Specular IOR Level'].default_value=0
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Closest';mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
groups={k:[] for k in ['body','lid','left','right']}

def finish(ob,name,color,bucket='body',bevel=0):
 ob.name=name;bpy.context.view_layer.objects.active=ob
 if bevel:
  mod=ob.modifiers.new('Single broad facet','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 ob.data.materials.append(mat);uv=ob.data.uv_layers.active or ob.data.uv_layers.new();i=list(colors).index(color)
 for loop in uv.data:loop.uv=((i%4+.5)/4,(i//4+.5)/4)
 for face in ob.data.polygons:face.use_smooth=False
 groups[bucket].append(ob);return ob

def box(name,p,size,color,bucket='body',bevel=.009):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);ob=bpy.context.object;ob.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(ob,name,color,bucket,bevel)

def prism(name,points,y0,y1,color,bucket='body',bevel=0):
 n=len(points);verts=[(x,y,z) for y in [y0,y1] for x,z in points];faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
 return finish(ob,name,color,bucket,bevel)

def cylinder(name,p,radius,depth,color,bucket='body',axis=(1,0,0),sides=10):
 bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=radius,depth=depth,location=p);ob=bpy.context.object;ob.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler()
 return finish(ob,name,color,bucket)

def rim(name,outer,inner,z0,z1,color,bucket='body'):
 def octagon(w,d,c):return [(-w/2+c,-d/2),(w/2-c,-d/2),(w/2,-d/2+c),(w/2,d/2-c),(w/2-c,d/2),(-w/2+c,d/2),(-w/2,d/2-c),(-w/2,-d/2+c)]
 loops=[octagon(*outer),octagon(*inner)];verts=[(x,y,z) for z in [z0,z1] for loop in loops for x,y in loop];faces=[]
 for i in range(8):
  j=(i+1)%8
  faces.extend([(i,j,16+j,16+i),(8+j,8+i,24+i,24+j),(16+i,16+j,24+j,24+i),(j,i,8+i,8+j)])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);return finish(ob,name,color,bucket)

# Grounded corner shoes. The toe notch is actual open geometry, not a painted hole.
for x in [-.575,.575]:
 for y in [-.282,.282]:
  for dx in [-.1025,.1025]:box('Foot notch side',(x+dx,y,.062),(.075,.27,.124),'steel',bevel=.012)
  box('Foot protective crown',(x,y,.128),(.28,.27,.064),'steel',bevel=.012)

# A real floor and four walls; the cavity is .~1.1m x .56m x .52m.
box('Thick blue floor',(0,0,.162),(1.29,.75,.105),'blue_dark',bevel=.018)
box('Interior floor liner',(0,0,.219),(1.105,.554,.018),'floor',bevel=.012)
for y in [-.331,.331]:box('Continuous front rear wall',(0,y,.465),(1.29,.085,.57),'blue',bevel=.018)
for x in [-.605,.605]:box('Continuous side wall',(x,0,.465),(.080,.58,.57),'blue',bevel=.016)
rim('Continuous hollow rim',(1.36,.79,.047),(1.12,.56,.025),.731,.766,'blue_light')
for y in [-.281,.281]:box('Dark inner front rear liner',(0,y,.471),(1.10,.012,.49),'inside',bevel=0)
for x in [-.557,.557]:box('Dark inner side liner',(x,0,.471),(.012,.55,.49),'inside',bevel=0)

# Broad front/rear shield panels with purposeful clipped edges and shallow seams.
panel=[(-.49,.235),(.49,.235),(.565,.305),(.565,.635),(.475,.675),(-.475,.675),(-.565,.635),(-.565,.305)]
for sign in [-1,1]:
 y0,y1=sorted([sign*.377,sign*.394]);prism('Faceted body shield panel',panel,y0,y1,'blue_dark',bevel=.005)
 trim=[(-.44,.26),(.44,.26),(.51,.315),(.51,.610),(.40,.647),(-.40,.647),(-.51,.610),(-.51,.315)]
 a,b=sorted([sign*.396,sign*.401]);prism('Inset blue shield face',trim,a,b,'blue',bevel=0)
 # Front shallow trapezoid panel joint, repeated coherently on rear.
 joint=[(-.30,.67),(.30,.67),(.23,.607),(-.23,.607)]
 a,b=sorted([sign*.402,sign*.405]);prism('Upper shield inset joint',joint,a,b,'blue_dark')
for x in [-.447,.447]:
 for y in [-.400,.400]:box('Fixed tan vertical armor strap',(x,y,.453),(.13,.055,.582),'tan',bevel=.016)
for x in [-.646,.646]:
 for y in [-.282,.282]:box('Ivory corner bumper',(x,y,.453),(.126,.16,.414),'ivory',bevel=.028)
for x in [-.680,.680]:
 box('Side recessed handhold',(x,0,.466),(.021,.245,.18),'blue_dark',bevel=.012)
 box('Side handle grip',(x+math.copysign(.011,x),0,.470),(.026,.175,.035),'steel',bevel=.007)
 for y in [-.102,.102]:box('Side handle grounded mounting block',(x,y,.470),(.03,.045,.114),'edge',bevel=.005)

# Thick lid: recessed underside surrounded by a closed structural rim.
rim('Lid structural perimeter',(1.42,.82,.065),(1.17,.58,.04),.795,.966,'blue','lid')
box('Lid beveled top skin',(0,0,.966),(1.42,.82,.080),'blue_light','lid',.030)
box('Lid central dark top inset',(0,0,.999),(.81,.64,.018),'blue','lid',.013)
box('Recessed underside panel',(0,0,.955),(1.166,.576,.018),'inside','lid',.015)
for x in [-.447,.447]:
 box('Tan lid armor band',(x,0,1.002),(.155,.796,.036),'tan_edge','lid',.013)
 for y in [-.397,.397]:box('Tan lid band downturned end',(x,y,.902),(.155,.044,.19),'tan','lid',.012)

# Two visible rear hinge barrels. Fixed outer knuckles and rotating center.
hinge=(0,.416,.783)
for x in [-.435,.435]:
 box('Fixed hinge mounting leaf',(x,.381,.710),(.24,.047,.112),'edge',bevel=.008)
 box('Lid hinge mounting leaf',(x,.394,.840),(.132,.035,.12),'steel','lid',.006)
 for dx in [-.085,.085]:cylinder('Fixed outer hinge knuckle',(x+dx,.416,.783),.029,.059,'hinge')
 cylinder('Rotating center hinge knuckle',(x,.416,.783),.028,.107,'edge','lid')
 for dx in [-.121,.121]:cylinder('Hinge captive axle end',(x+dx,.416,.783),.016,.009,'pin')

# Latches each hang on an upper pin and release outward. No rigid part bridges
# the moving lid and static body. Keeper tongue contacts are deliberate catches.
latch_pivots={}
for x,bucket in [(-.447,'left'),(.447,'right')]:
 latch_pivots[bucket]=(x,-.437,.907)
 box('Static latch keeper pad',(x,-.412,.710),(.103,.016,.096),'edge',bevel=.006)
 box('Static keeper raised catch',(x,-.425,.729),(.070,.016,.023),'steel',bevel=.004)
 cylinder('Lid latch upper pin',(x,-.437,.907),.018,.15,'edge','lid',sides=8)
 box('Articulated latch housing',(x,-.454,.802),(.116,.028,.205),'steel',bucket,.013)
 box('Latch recessed face',(x,-.471,.809),(.082,.006,.145),'edge',bucket,.005)
 box('Amber latch thumb tab',(x,-.477,.828),(.081,.006,.094),'amber',bucket,.005)
 box('Latch bottom catch shoe',(x,-.448,.711),(.112,.023,.036),'edge',bucket,.006)

def empty(name,p,parent=None):
 ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.matrix_world=Matrix.Translation(p)
 if parent:
  ob.parent=parent;ob.matrix_world=Matrix.Translation(p)
 bpy.context.view_layer.update()
 ob.empty_display_type='PLAIN_AXES';ob.empty_display_size=.08;return ob

bpy.context.view_layer.update()
root=empty('FieldChestRoot',(0,0,0));lid=empty('ChestLidPivot',hinge,root);bpy.context.view_layer.update()
left=empty('ChestLatchLeft',latch_pivots['left'],lid);right=empty('ChestLatchRight',latch_pivots['right'],lid)
parents={'body':root,'lid':lid,'left':left,'right':right}
bpy.context.view_layer.update()
for key,objects in groups.items():
 for ob in objects:
  world=ob.matrix_world.copy();ob.parent=parents[key];ob.matrix_world=world
lid['motion']='Local X0 to -100 degrees; release catches first'
left['motion']=right['motion']='Local X0 to -.8 radians; swing lower tongue outward before lid opens'
bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(out/'field-chest-editable.blend'))

def join_group(key,name):
 bpy.ops.object.select_all(action='DESELECT')
 for ob in groups[key]:ob.select_set(True)
 bpy.context.view_layer.objects.active=groups[key][0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name
 bpy.context.scene.cursor.location=parents[key].matrix_world.translation;bpy.ops.object.origin_set(type='ORIGIN_CURSOR');return ob
meshes=[join_group(k,n) for k,n in [('body','ChestBody'),('lid','ChestLid'),('left','ChestLatchLeftGeometry'),('right','ChestLatchRightGeometry')]]
triangles=sum(len(f.vertices)-2 for ob in meshes for f in ob.data.polygons)
if triangles>5000:raise RuntimeError(f'Triangle budget exceeded:{triangles}')
bpy.ops.export_scene.gltf(filepath=str(out/'field-chest.glb'),export_format='GLB',export_yup=True,export_extras=True)
glb=out/'field-chest.glb'
manifest={'referenceSHA256':'b5338f6cf8a569a79f8eadfe483623adfadf5221a918601ccfd281d76d1c42fe','sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'bytes':glb.stat().st_size,'triangles':triangles,'meshes':4,'materials':1,'textureSize':256,'editableSource':'field-chest-editable.blend','review':'Pending independent actual-model review','motion':{'ChestLidPivot':{'positionGLTF':[0,.783,-.416],'axis':'local X','rangeRadians':[0,-math.radians(100)]},'ChestLatchLeft':{'axis':'local X','rangeRadians':[0,-.8]},'ChestLatchRight':{'axis':'local X','rangeRadians':[0,-.8]}},'dimensionsTarget':[1.42,1.02,.9],'renderMethod':'fresh GLB import, Cycles CPU4threads16samples512px'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest),flush=True)

# Only the fresh exported GLB is rendered. No scene-only structure can hide an export error.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review world');scene.world.color=(.34,.36,.38);scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
floor=bpy.data.materials.new('Review neutral floor');floor.diffuse_color=(.27,.30,.30,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.007));bpy.context.object.data.materials.append(floor)
for p,power,size in [((3,-4,6),380,5),((-3,-1,4),190,4)]:
 bpy.ops.object.light_add(type='AREA',location=p);ob=bpy.context.object;ob.data.energy=power;ob.data.shape='DISK';ob.data.size=size;ob.rotation_euler=(Vector((0,0,.45))-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.3,-3.1,1.9));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.5
lid=bpy.data.objects['ChestLidPivot'];left=bpy.data.objects['ChestLatchLeft'];right=bpy.data.objects['ChestLatchRight']
for moving in [lid,left,right]:moving.rotation_mode='XYZ'
for label,angle,catch,p in [('closed',0,0,(2.3,-3.1,1.9)),('released',0,-.8,(2.3,-3.1,1.9)),('half',-31.640625,-.8,(2.3,-3.1,1.9)),('catch-refold',-90.771484375,-.4,(2.3,-3.1,1.9)),('open',-100,0,(2.3,-3.1,1.9)),('rear-closed',0,0,(-2.2,3.2,1.7)),('rear-open',-100,0,(-2.2,3.2,1.7)),('interior-open',-100,0,(1.3,-2.1,3.7))]:
 lid.rotation_euler.x=math.radians(angle);left.rotation_euler.x=right.rotation_euler.x=catch
 camera.location=p;camera.rotation_euler=(Vector((0,0,.84))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'{label}.png');bpy.ops.render.render(write_still=True)
print('Field chest CPU renders ended',flush=True)
