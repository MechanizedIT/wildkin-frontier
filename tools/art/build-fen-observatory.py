"""Fen receiver study. Blender Z-up/-Y-front exports glTF Y-up/+Z-front.
One rigid horizontal-X receiver pivot, supported only by the side trunnions.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

parser=argparse.ArgumentParser();parser.add_argument('--output-dir',required=True);parser.add_argument('--render-only',action='store_true')
opt=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(opt.output_dir).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
PIVOT=Vector((0,0,1.98));TILT=math.radians(18)
def look(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
def extents(objects):
    points=[o.matrix_world@v.co for o in objects if o.type=='MESH' for v in o.data.vertices]
    return [min(v[i] for v in points)for i in range(3)],[max(v[i] for v in points)for i in range(3)]

def review():
    bpy.ops.import_scene.gltf(filepath=str(out/'fen-observatory.glb'))
    receiver=bpy.data.objects['ReceiverTiltPivot'];fixed=bpy.data.objects['ReceiverStructure'];scene=bpy.context.scene
    # glTF import uses quaternion rotation mode; use Euler deliberately for the
    # local-X test poses so changing rotation_euler actually moves this object.
    receiver.rotation_mode='XYZ'
    # Explicit exported component identity excludes ONLY the axle child. All
    # bowl/rim/spoke/core vertices are measured, including any erroneous outlier.
    assert {o.name for o in receiver.children}=={'ReceiverAxles'}
    assert receiver.type=='MESH' and bpy.data.objects['ReceiverAxles'].type=='MESH'
    fixed_points=[fixed.matrix_world@v.co for v in fixed.data.vertices]
    body_max_x=max(abs(v.co.x)for v in receiver.data.vertices)
    pylon_inner=min(abs(p.x)for p in fixed_points if p.z>.60)
    assert body_max_x<pylon_inner,(body_max_x,pylon_inner)
    under_body_fixed=max(p.z for p in fixed_points if abs(p.x)<=body_max_x)
    # Linear triangle height reaches its minimum at a vertex. Include each
    # vertex's critical angle as well as range endpoints for a continuous sweep.
    low_angle,high_angle=map(math.radians,(-10,10));sweep_min=float('inf')
    for v in receiver.data.vertices:
        critical=math.atan2(v.co.y,v.co.z)+math.pi
        if critical>math.pi:critical-=2*math.pi
        candidates=[low_angle,high_angle]
        if low_angle<=critical<=high_angle:candidates.append(critical)
        sweep_min=min(sweep_min,*(receiver.location.z+math.sin(a)*v.co.y+math.cos(a)*v.co.z for a in candidates))
    assert sweep_min>under_body_fixed,(sweep_min,under_body_fixed)
    poses=[]
    for angle in (-10,0,10):
        receiver.rotation_euler.x=math.radians(angle);bpy.context.view_layer.update()
        body=[receiver.matrix_world@v.co for v in receiver.data.vertices]
        lowest=min(p.z for p in body)
        assert lowest>.52,(angle,lowest)
        poses.append({'localXDegrees':angle,'lowestBowlSurface':lowest,'plinthTop':.39,'verticalPlinthGap':lowest-.39,'maximumNonAxleBodyAbsX':max(abs(p.x)for p in body),'measuredPylonInnerAbsX':pylon_inner,'bearingAxleContact':'Only ReceiverAxles child excluded; intentional coaxial bearing contact'})
    receiver.rotation_euler.x=0;bpy.context.view_layer.update();low,high=extents([receiver,fixed])
    (out/'export-check.json').write_text(json.dumps({'sha256':hashlib.sha256((out/'fen-observatory.glb').read_bytes()).hexdigest(),'pivotBlender':list(receiver.location),'nodeRestRotationRadians':list(receiver.rotation_euler),'axis':'local X, identical horizontal X in glTF','neutralBakedTiltBackDegrees':18,'continuousSweep':{'degrees':[-10,10],'method':'All non-axle mesh vertices, endpoint and exact critical-angle minima','minimumMovingBodyHeight':sweep_min,'maximumFixedHeightInsideBodyXSpan':under_body_fixed,'verticalGap':sweep_min-under_body_fixed,'lateralPylonGap':pylon_inner-body_max_x},'poses':poses,'boundsBlender':{'min':low,'max':high}},indent=2),encoding='utf-8')
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard'
    world=bpy.data.worlds.new('Neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.48,.49,.50,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;mat=bpy.data.materials.new('Review floor');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.43,.44,.44,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1;floor.data.materials.append(mat)
    for name,pos,power,size in [('Key',(-4,-5,7),750,5),('Fill',(4,-1,5),300,4)]:
        bpy.ops.object.light_add(type='AREA',location=pos);lamp=bpy.context.object;lamp.name=name;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;look(lamp,(0,0,1.5))
    bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=4.25
    views=[('neutral-front',(0,-7,3.3),0),('neutral-three-quarter',(4,-7,4.0),0),('tilt-minus10',(4,-7,4.0),-10),('tilt-plus10',(4,-7,4.0),10),('rear',(4,7,3.6),0),('underside',(3,-6,1.0),-10)]
    meta=[]
    for name,pos,angle in views:
        receiver.rotation_euler.x=math.radians(angle);cam.location=pos;look(cam,(0,0,1.5));scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True);meta.append({'name':name,'camera':pos,'target':[0,0,1.5],'orthoScale':4.25,'localXDegrees':angle})
    (out/'render-evidence.json').write_text(json.dumps({'sha256':hashlib.sha256((out/'fen-observatory.glb').read_bytes()).hexdigest(),'engine':'Cycles CPU','threads':4,'samples':24,'resolution':[512,512],'views':meta,'review':'pending independent model review'},indent=2),encoding='utf-8')
if opt.render_only:review();sys.exit(0)
if (out/'fen-observatory.glb').exists():raise ValueError('Use a new output directory; preserve exact previous candidates')
out.mkdir(parents=True,exist_ok=True)
colors={'slate':(134,150,163),'slateEdge':(169,183,192),'slateDark':(100,118,132),'stone':(174,164,143),'stoneLight':(202,190,164),'stoneDark':(146,135,113),'turquoise':(67,203,207),'turquoiseShade':(46,165,174),'recess':(66,86,96),'inlayEdge':(94,126,133),'back':(113,127,134),'chip':(189,174,146),'base':(162,151,130),'baseEdge':(185,173,149),'coreLight':(107,224,221),'dark':(78,96,105)}
palette=list(colors);image=bpy.data.images.new('Fen palette256',width=256,height=256,alpha=False)
def linear(v):
    v/=255;return v/12.92 if v<=.04045 else((v+.055)/1.055)**2.4
pixels=[]
for y in range(256):
    for x in range(256):pixels.extend([linear(v)for v in colors[palette[(y//64)*4+x//64]]]+[1])
image.pixels.foreach_set(pixels);image.filepath_raw=str(out/'fen-palette.png');image.file_format='PNG';image.save()
mat=bpy.data.materials.new('Fen matte stone and ceramic');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=1;bs.inputs['Specular IOR Level'].default_value=0
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Closest';mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
groups={'ReceiverStructure':[],'ReceiverTiltPivot':[],'ReceiverAxles':[]};active='ReceiverStructure'
def finish(ob,name,color,bevel=0):
    ob.name=name;bpy.context.view_layer.objects.active=ob
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    if bevel:
        m=ob.modifiers.new('Single facet bevel','BEVEL');m.width=bevel;m.segments=1;bpy.ops.object.modifier_apply(modifier=m.name)
    ob.data.materials.append(mat);uv=ob.data.uv_layers.active or ob.data.uv_layers.new();idx=palette.index(color)
    for loop in uv.data:loop.uv=((idx%4+.5)/4,(idx//4+.5)/4)
    for face in ob.data.polygons:face.use_smooth=False
    groups[active].append(ob);return ob
def mesh(name,verts,faces,color):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);return finish(ob,name,color)
def box(name,loc,size,color,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(ob,name,color,bevel)
def prism(name,poly,z0,z1,color):
    n=len(poly);v=[(x,y,z)for z in(z0,z1)for x,y in poly];f=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)];return mesh(name,v,f,color)
def cylinder(name,loc,radius,depth,color,axis=(1,0,0),n=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=radius,depth=depth,location=loc);ob=bpy.context.object;ob.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return finish(ob,name,color)
def receiver_point(x,v,depth):return (x,v*math.sin(TILT)-depth*math.cos(TILT),PIVOT.z+v*math.cos(TILT)+depth*math.sin(TILT))
def rmesh(name,verts,faces,color):return mesh(name,[receiver_point(*v)for v in verts],faces,color)
def radial(a,r,d):return(r*math.cos(a),r*math.sin(a),d)
def receiver_bar(name,angle,r0,r1,width,d0,d1,color,thick=.05):
    u=Vector((math.cos(angle),math.sin(angle)));side=Vector((-u.y,u.x));verts=[]
    for depthadd in(0,thick):
        for radius,d in((r0,d0),(r1,d1)):
            for sign in(-1,1):
                q=u*radius+side*width*.5*sign;verts.append((q.x,q.y,d+depthadd))
    return rmesh(name,verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],color)

# One common low rooted plinth; the middle stays clear above its deck.
poly=[(-1.8,-.75),(-1.45,-1.1),(1.45,-1.1),(1.8,-.75),(1.8,.75),(1.45,1.1),(-1.45,1.1),(-1.8,.75)]
verts=[(x*s,y*s,z)for s,z in((1,0),(.995,.07),(.93,.35))for x,y in poly]
faces=[tuple(reversed(range(8))),tuple(range(16,24))]+[(ring*8+i,ring*8+(i+1)%8,(ring+1)*8+(i+1)%8,(ring+1)*8+i)for ring in range(2)for i in range(8)]
mesh('Faceted sloping common foundation',verts,faces,'base')
prism('Broad stone deck',[(x*.935,y*.935)for x,y in poly],.34,.39,'stoneLight')
for side in(-1,1):
    box('Rooted pylon foot',(side*1.43,0,.47),(.66,.76,.22),'stone',.055)
    # Inner boundary is exactly1.25, safely outside the rotating rim's1.183.
    x0,x1=sorted((side*1.25,side*1.68));verts=[(x,y,z)for z,yhalf in((.55,.30),(1.86,.18))for x,y in((x0,-yhalf),(x1,-yhalf),(x1,yhalf),(x0,yhalf))]
    mesh('Fixed bearing pylon',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'slate')
    cylinder('Fixed stone trunnion socket',(side*1.42,0,PIVOT.z),.255,.32,'stone')
    cylinder('Fixed outer steel bearing',(side*1.60,0,PIVOT.z),.21,.06,'slateDark')
    cylinder('Fixed turquoise bearing cap',(side*1.636,0,PIVOT.z),.14,.025,'turquoise')
    box('Pylon inset bed',(side*1.46,-.248,1.13),(.20,.045,.75),'recess',.01)
    box('Pylon turquoise inlay',(side*1.46,-.278,1.13),(.085,.024,.60),'turquoise',.01)
for x in(-1.36,0,1.36):
    frame=box('Foundation inset frame',(x,-1.015,.22),(.26,.11,.40),'slateDark',.025);frame.rotation_euler.x=math.radians(-15)
    inlay=box('Foundation turquoise inlay',(x,-1.078,.22),(.09,.018,.25),'turquoise',.01);inlay.rotation_euler.x=math.radians(-15)

active='ReceiverTiltPivot'
# Octagonal hollow receiver, a closed double shell. The inside genuinely
# descends toward its focus; the rear follows the same dish with finite wall.
angles=[math.radians(22.5+i*45)for i in range(8)]
rings=[(1.10,.08),(.65,-.18),(.24,-.31),(.24,-.43),(.65,-.30),(1.10,-.04)]
for sector in range(8):
    a,b=angles[sector],angles[(sector+1)%8];verts=[radial(t,r,d)for r,d in rings for t in(a,b)]
    faces=[(i*2,i*2+1,(i+1)*2+1,(i+1)*2)for i in range(5)]+[(10,11,1,0),(0,2,4,6,8,10),(1,11,9,7,5,3)]
    rmesh('Concave stone bowl sector '+str(sector),verts,faces,['stone','stoneLight','stone','stoneDark'][sector%4])
rmesh('Closed bowl focus back',[radial(a,.25,-.43)for a in angles]+[radial(a,.25,-.30)for a in angles],[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8)for i in range(8)],'back')
for sector in range(8):
    a,b=angles[sector],angles[(sector+1)%8];profile=[(1.04,.08),(1.08,.18),(1.23,.20),(1.28,.15),(1.28,-.14),(1.23,-.21),(1.08,-.17),(1.04,-.10)]
    verts=[]
    for end,t in enumerate((a,b)):
        for j,(r,d)in enumerate(profile):
            if sector==5 and end==0 and j in(1,2,3):r-=.09;d-=.065
            verts.append(radial(t,r,d))
    faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(j,(j+1)%8,(j+1)%8+8,j+8)for j in range(8)]
    rmesh('Chipped rim block' if sector==5 else 'Octagonal rim block '+str(sector),verts,faces,'stoneLight' if sector in(1,3,5,7)else'slate')
    if sector in(0,2,4,6):
        # The octagon's segment is a chord, not a circular arc. Fit the inset
        # to its actual front plane rather than letting it overhang the rim.
        mid=a+math.pi/8;receiver_bar('Rim turquoise insert',mid,1.035,1.105,.42,.192,.203,'turquoise',.008)
for angle in(0,math.pi/2,math.pi,math.pi*1.5):
    receiver_bar('Supported focus spoke',angle,.22,.99,.155,-.26,.085,'slateDark',.085)
    receiver_bar('Spoke turquoise conductor',angle,.44,.92,.065,-.065,.149,'turquoise',.012)
# Core and its ring are part of the same rigid assembly, not a hovering jewel.
for name,radius,d0,d1,color in [('Focus collar',.32,-.27,-.08,'slate'),('Core socket',.245,-.09,-.015,'recess'),('Turquoise focusing core',.205,-.012,.12,'turquoise')]:
    verts=[radial(a,radius if layer==0 else radius*.88,d)for layer,d in enumerate((d0,d1))for a in angles]
    rmesh(name,verts,[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8)for i in range(8)],color)
active='ReceiverAxles'
for side in(-1,1):cylinder('Receiver trunnion axle',(side*1.265,0,PIVOT.z),.11,.27,'slateDark')

bpy.context.view_layer.update();objects=[o for items in groups.values()for o in items];low,high=extents(objects);tris=sum(len(f.vertices)-2 for o in objects for f in o.data.polygons);assert tris<=5000,tris
bpy.ops.wm.save_as_mainfile(filepath=str(out/'fen-observatory-editable.blend'))
for name,items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name;bpy.context.scene.cursor.location=(0,0,0) if name=='ReceiverStructure'else PIVOT;bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
axles=bpy.data.objects['ReceiverAxles'];axles.parent=bpy.data.objects['ReceiverTiltPivot'];axles.location=(0,0,0)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'fen-observatory-batches.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'fen-observatory.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT',export_animations=False)
manifest={'sha256':hashlib.sha256((out/'fen-observatory.glb').read_bytes()).hexdigest(),'referenceSHA256':'0cd82420a80314a34ae6f56ff7fd9456c964a3930e38722f0589ef404ff41390','triangles':tris,'fileBytes':(out/'fen-observatory.glb').stat().st_size,'meshBatches':3,'materials':1,'palette':[256,256],'dimensionsMeters':[high[0]-low[0],high[2]-low[2],high[1]-low[1]],'baseY':low[2],'nodes':{'ReceiverStructure':'fixed plinth/pylons/socket housing','ReceiverTiltPivot':{'localAxis':'X','pivotGLTF':[0,1.98,0],'nodeRestRotationRadians':[0,0,0],'neutralTiltBackBakedDegrees':18,'runtimePlannedRangeDegrees':[-8,8],'reviewExtremesDegrees':[-10,10],'geometry':'all bowl/rim/spokes/core; no coordinate-filtered clearance exclusions','child':'ReceiverAxles: only two coaxial shafts, identity local transform, no independent motion'}},'review':'Pending independent exported-image and sweep review; no shipping integration'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');print(json.dumps(manifest,indent=2))
