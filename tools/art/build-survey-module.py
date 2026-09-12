"""Rebuild the static Survey Module component family and fresh-GLB CPU review.

Blender 4.5: -b -t 2 --python this.py -- --output-dir ABS_NEW --review-dir ABS_NEW
All shell components share glTF origin (0,0,0); +Z is the entrance, Y is up.
Breadcrumb props instead have their own centered ground pivot. No chest is exported.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

p=argparse.ArgumentParser()
p.add_argument('--output-dir',required=True)
p.add_argument('--review-dir',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out,review=Path(a.output_dir).resolve(),Path(a.review_dir).resolve()
if out.exists() or review.exists(): raise ValueError('Use fresh candidate directories')
out.mkdir(parents=True);review.mkdir(parents=True)
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)

colors=[(215,208,185),(67,88,105),(47,59,68),(94,113,124),
        (241,162,61),(34,43,50),(160,160,145),(93,185,191)]
image=bpy.data.images.new('SurveyPalette',width=64,height=8,alpha=False)
image.pixels.foreach_set([v for y in range(8) for x in range(64) for v in (*[c/255 for c in colors[x//8]],1)])
image.filepath_raw=str(out/'palette.png');image.file_format='PNG';image.save()
mat=bpy.data.materials.new('survey-matte-palette');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF')
bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=1;bs.inputs['Specular IOR Level'].default_value=0
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Closest'
mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])

def point(v):return (v[0],-v[2],v[1])
def finish(obj,name,color,bevel=0):
    obj.name=name;obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active=obj
    if bevel:
        mod=obj.modifiers.new('single structural facet','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='Palette');uv.name='Palette'
    for item in uv.data:item.uv=((color+.5)/8,.5)
    for face in obj.data.polygons:face.use_smooth=False
    return obj
def box(name,loc,size,color,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(location=point(loc));obj=bpy.context.object
    obj.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name,color,bevel)
def solid(name,verts,faces,color):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([point(v) for v in verts],[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return finish(obj,name,color)
def extrude(name,polygon,axis,start,end,color,bevel=0):
    # Polygon is in remaining axes, in their natural coordinate order.
    other=[i for i in range(3) if i!=axis];n=len(polygon);vertices=[]
    for along in (start,end):
        for q in polygon:
            v=[0,0,0];v[axis]=along;v[other[0]],v[other[1]]=q;vertices.append(v)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    ob=solid(name,vertices,faces,color)
    # Explicit normal consistency for differently oriented closed prisms.
    bpy.context.view_layer.objects.active=ob;ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');ob.select_set(False)
    if bevel:
        mod=ob.modifiers.new('broad plate edge facets','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for item in ob.data.uv_layers.active.data:item.uv=((color+.5)/8,.5)
    return ob
def beam(name,a,b,width,depth,color,bevel=.035):
    mid=[(aa+bb)/2 for aa,bb in zip(a,b)];length=math.dist(a,b)
    ob=box(name,mid,(width,length,depth),color,bevel)
    direction=Vector(point([bb-aa for aa,bb in zip(a,b)]))
    ob.rotation_euler=direction.to_track_quat('Z','Y').to_euler();return ob
def cylinder(name,loc,radius,depth,color,axis=(1,0,0),sides=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=radius,depth=depth,location=point(loc));ob=bpy.context.object
    ob.rotation_euler=Vector(point(axis)).to_track_quat('Z','Y').to_euler()
    return finish(ob,name,color)

def dish():
    center=Vector((3.04,2.93,-1.42));normal=Vector((.25,.63,.74)).normalized()
    pivot=center-normal*.20
    box('receiver seated mounting shoe',(2.96,2.14,-1.49),(.48,.26,.62),2,.045)
    beam('single receiver support',(2.96,2.20,-1.49),pivot,.28,.31,1,.035)
    cylinder('one receiver horizontal pivot',pivot,.17,.68,3)
    cylinder('visible axle end',(pivot.x+.35,pivot.y,pivot.z),.12,.035,2)
    beam('dish connected hub',pivot,center,.21,.21,2,.022)
    u=Vector((1,0,0));u=(u-normal*u.dot(normal)).normalized();v=normal.cross(u)
    # One missing outer sector forms a deliberate broken sheet edge; no extra rods.
    sectors=12;angles=[2*math.pi*i/sectors for i in range(sectors+1)]
    verts=[]
    for radius,depth in [(.08,0),(.36,.055),(.76,.27)]:
        for theta in angles:
            q=center+u*(math.cos(theta)*radius)+v*(math.sin(theta)*radius)+normal*depth
            verts.append(tuple(q))
    faces=[]
    for ring in range(2):
        for i in range(sectors):
            if ring==1 and i==2:continue
            faces.append((ring*13+i,ring*13+i+1,(ring+1)*13+i+1,(ring+1)*13+i))
    bowl=solid('ivory faceted receiver bowl',verts,faces,0)
    bpy.context.view_layer.objects.active=bowl
    mod=bowl.modifiers.new('honest sheet thickness','SOLIDIFY');mod.thickness=.075;mod.offset=-1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # New solidify loops inherit the existing palette UV; reassert one layer.
    for item in bowl.data.uv_layers.active.data:item.uv=(.5/8,.5)
    cylinder('dark compact dish central plug',center,.075,.08,2,axis=normal)

def side_wall(sign):
    box('weighty side floor frame',(sign*2.78,.31,0),(.54,.26,7),2,.055)
    # Thick damaged hull plates sit on a retained lower structural sill.
    for j,(z0,z1) in enumerate([(-2.47,-.42),(.42,2.47)]):
        top=2.03 if j==0 else 1.98
        poly=[(.47,z0),(.47,z1),(top-.43,z1),(top-.40,z1-.19),(top-.21,z1-.12),
              (top-.24,z1-.44),(top,z1-.69),(top,z0+.22),(top-.15,z0)]
        # The missing broad corner is actual empty mesh space, not a painted crack.
        extrude('thick torn ivory hull sheet',poly,0,sign*2.67,sign*2.96,0,.024)
        box('exposed dark lower hull flange',(sign*2.77,.55,(z0+z1)/2),(.39,.22,z1-z0+.06),1,.025)
        box('broad inset armor division',(sign*2.985,1.12,(z0+z1)/2),(.035,.11,(z1-z0)*.73),6,.014)
    # Discontinuous upper rails remain attached to the nearest intact rib.
    for z0,z1 in [(-2.53,-.28),(.32,2.10)]:
        box('retained upper hull rail',(sign*2.79,2.08,(z0+z1)/2),(.32,.22,z1-z0),1,.035)
    ends=[(1.78,2.98),(1.93,2.77),(1.57,3.06)] if sign<0 else [(1.94,2.78),(1.61,3.06),(1.78,2.98)]
    for index,(z,(tip,high)) in enumerate(zip([-2.85,0,2.85],ends)):
        box('rib locked floor socket',(sign*2.73,.37,z),(.80,.38,.92),2,.07)
        core=[(2.40,.32),(3.03,.32),(3.03,1.96),(2.80,2.40),(2.25,2.96),
              (tip+.16,high+.16),(tip,high+.07),(tip+.09,high-.07),(tip-.08,high-.13),
              (tip+.05,high-.28),(2.32,2.39),(2.48,1.92),(2.48,.58),(2.40,.58)]
        extrude('continuous snapped cabin rib',[(sign*x,y) for x,y in core],2,z-.35,z+.35,1,.045)
        # Pale armor follows the entrance arch; missing sleeves expose structural blue.
        upright=[(2.51,.49),(2.96,.49),(2.96,1.90),(2.73,2.29),(2.52,2.08)]
        for face in (-1,1):
            extrude('layered ivory upright armor',[(sign*x,y) for x,y in upright],2,z+face*.359,z+face*.411,0,.022)
            if index!=1 or sign>0:
                armor_tip=tip+.19
                shoulder=[(2.72,2.31),(2.90,2.43),(2.18,3.04),(armor_tip+.11,high+.14),
                          (armor_tip,high+.03),(armor_tip+.09,high-.10),(2.26,2.65)]
                extrude('broken ivory shoulder sleeve',[(sign*x,y) for x,y in shoulder],2,z+face*.36,z+face*.423,0,.022)
        box('ivory outward rib armor',(sign*3.06,1.22,z),(.075,1.32,.53),0,.026)
        if index==2:box('amber entrance rib marker',(sign*2.72,1.33,z+.435),(.14,.48,.035),4,.009)
    box('amber side hull identity',(sign*3.012,1.43,1.25),(.03,.14,.46),4,.01)
    if sign==1:dish()

def rear_wall():
    box('rear floor frame',(0,.31,-3.28),(5.40,.26,.42),2,.045)
    polys=[ [(-2.47,.47),(-.07,.47),(-.07,1.91),(-.27,1.84),(-.38,2.11),(-1.06,2.11),(-1.24,2.24),(-2.47,2.24)],
            [(.07,.47),(2.47,.47),(2.47,2.18),(1.78,2.18),(1.56,1.88),(.64,1.88),(.47,2.01),(.07,1.93)] ]
    for poly in polys:extrude('broken framed rear hull plate',poly,2,-3.43,-3.12,0,.024)
    box('rear plate dividing spine',(0,1.13,-3.07),(.15,1.40,.14),1,.018)
    box('rear dark lower sill',(0,.53,-3.10),(5.0,.20,.20),1,.025)
    for x in [-1.32,1.32]:box('rear broad plate inset',(x,1.01,-3.09),(1.74,.12,.05),6,.015)
    # The amber part is a fixed bracket face, not a second recoverable loot item.
    box('single attached cartridge bracket',(1.51,.94,-3.0),(.52,1.12,.22),2,.025)
    box('amber bracket backplate',(1.51,.95,-2.866),(.23,.63,.045),4,.014)
    for y in [.62,1.29]:box('bracket retaining jaw',(1.51,y,-2.82),(.38,.10,.16),1,.012)

def floor():
    box('low continuous floor backing',(0,.05,0),(6,.10,7),5,.025)
    for x in [-1.405,1.405]:
        for z in [-2.28,0,2.28]:box('broad floor plate',(x,.14,z),(2.77,.08,2.22),2,.017)
    for x in [-2.92,2.92]:box('outer floor edge channel',(x,.14,0),(.16,.08,7),1,.015)
    for z in [-3.42,3.42]:box('front rear floor edge channel',(0,.14,z),(5.64,.08,.16),1,.015)
def ramp():extrude('true shallow entrance wedge',[(0,3.5),(0,4.8),(.025,4.8),(.18,3.5)],0,-1.60,1.60,3)
def panel_debris():
    poly=[(-1.06,-.70),(.72,-.70),(.93,-.45),(.76,-.23),(1.05,-.06),(.78,.12),(.96,.28),(.82,.64),(-.38,.71),(-.57,.55),(-1.02,.52)]
    extrude('torn blue hull panel frame',poly,1,0,.14,1)
    left=[(-.95,-.57),(.14,-.57),(.19,.56),(-.29,.59),(-.48,.43),(-.91,.43)]
    extrude('retained ivory panel half',left,1,.145,.235,0)
    bent=[(.18,-.55),(.66,-.55),(.81,-.39),(.62,-.20),(.88,-.05),(.63,.10),(.79,.25),(.70,.53),(.23,.54)]
    ob=extrude('creased torn ivory panel wing',bent,1,.155,.245,0)
    for vertex in ob.data.vertices:vertex.co.z+=(vertex.co.x-.18)*.30
    ob.data.update()
    box('retained amber panel marker',(-.61,.253,-.37),(.31,.032,.13),4,.008)
def cargo_frame():
    tops={(-1,-1):(-.60,.68,-.42),(1,-1):(.60,.68,-.42),(-1,1):(-.60,.61,.42),(1,1):(.43,.51,.32)}
    for (sx,sz),top in tops.items():
        box('grounded cargo socket',(sx*.60,.07,sz*.42),(.21,.14,.21),2,.022)
        beam('crushed frame upright',(sx*.60,.10,sz*.42),top,.15,.15,1,.021)
    for z in [-.42,.42]:box('retained lower width rail',(0,.14,z),(1.29,.14,.13),2,.022)
    for x in [-.60,.60]:box('retained lower depth rail',(x,.14,0),(.13,.14,.80),2,.022)
    beam('retained rear upper rail',tops[(-1,-1)],tops[(1,-1)],.14,.14,3,.022)
    for sx in [-1,1]:beam('bent side upper rail',tops[(sx,-1)],tops[(sx,1)],.14,.14,3,.022)
    beam('broken front rail left',tops[(-1,1)],(-.17,.55,.46),.14,.14,3,.018)
    beam('broken front rail right',(.19,.37,.46),tops[(1,1)],.14,.14,3,.018)

builders={'survey-left-wall':lambda:side_wall(-1),'survey-right-wall':lambda:side_wall(1),
          'survey-rear-wall':rear_wall,'survey-floor':floor,'survey-ramp':ramp,
          'survey-panel-debris':panel_debris,'survey-cargo-frame':cargo_frame}
spec=importlib.util.spec_from_file_location('glbcheck',root/'tools/art/check-game-glb.py')
checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
facts={}
for name,builder in builders.items():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    builder();bpy.context.view_layer.update()
    shoulder_parts=[];upper_hulls=[];sockets=[]
    for part in bpy.context.scene.objects:
        if part.type!='MESH':continue
        points=[part.matrix_world@v.co for v in part.data.vertices]
        xyz=[(q.x,q.z,-q.y) for q in points]
        bounds={'name':part.name,'min':[min(v[i] for v in xyz) for i in range(3)],'max':[max(v[i] for v in xyz) for i in range(3)]}
        if 'shoulder' in part.name:shoulder_parts.append(bounds)
        if 'continuous snapped cabin rib' in part.name:
            # Convex hull inputs cover only the upper remnant, never its empty underside down to the floor.
            upper_hulls.append({'name':part.name,'vertices':sorted(set(tuple(round(v,6) for v in q) for q in xyz if q[1]>=1.91))})
        if 'rib locked floor socket' in part.name:sockets.append(bounds)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'-editable.blend')))
    bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.join()
    ob=bpy.context.object;ob.name=name;scene=bpy.context.scene;scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    path=out/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT')
    doc,binblob=checker.parse_glb(path.read_bytes());points=[];draws=0
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            _,vertices=checker.accessor_values(doc,binblob,primitive['attributes']['POSITION']);points.extend(vertices);draws+=1
    report=checker.check(path,'prop',{},[])
    report.update({'bounds':{'min':[min(v[i] for v in points) for i in range(3)],'max':[max(v[i] for v in points) for i in range(3)]},'drawPrimitives':draws,'bytes':path.stat().st_size,'pivot':[0,0,0]})
    if shoulder_parts:report['upperShoulderParts']=shoulder_parts
    if upper_hulls:report['upperStructuralHulls']=upper_hulls
    if sockets:report['groundSockets']=sockets
    facts[name]=report
    if not report['ok']:raise ValueError(report['failures'])

def measured_box(name):
    bounds=facts[name]['bounds'];lo,hi=bounds['min'],bounds['max']
    return {'kind':'box','center':[(a+b)/2 for a,b in zip(lo,hi)],'size':[b-a for a,b in zip(lo,hi)]}

manifest={'status':'candidate; independent model and native integration gates pending','reference':'art/targets/survey-wreck-v1/target.png',
 'referenceSHA256':hashlib.sha256((root/'art/targets/survey-wreck-v1/target.png').read_bytes()).hexdigest(),
 'builder':'tools/art/build-survey-module.py','axes':'X width, Y up, +Z entrance; root yaw -PI/2 gives west world entrance',
 'origin':'all five shell GLBs share module center ground origin; each breadcrumb separately centered at its own ground origin',
 'components':facts,'shellNominalSize':[6,3.3,7],'rampEndZ':4.8,'entranceClearWidth':3.2,'openRoofClearWidthAtRibTips':2.8,
 'chestFixture':{'path':'assets/models/field-chest-v1/model.glb','position':[0,.18,-1.48],'yaw':0,'exportedWithShell':False,'openLocalXDegrees':-100},
 'colliders':{
  'survey-left-wall':{'kind':'box','center':[-2.79,1.17,0],'size':[.68,1.98,7],'note':'Main wall only. groundSockets are separate low boxes; upperStructuralHulls provide exported upper rib points above Y1.91 for optional collision. Never use a cabin-wide envelope.'},
  'survey-right-wall':{'kind':'box','center':[2.79,1.17,0],'size':[.68,1.98,7],'note':'Main wall only. groundSockets are separate low boxes; upperStructuralHulls provide upper rib points above Y1.91. Receiver is elevated; do not extend floor-level collision to dish bounds.'},
  'survey-rear-wall':{'kind':'box','center':[0,1.21,-3.245],'size':[5.4,2.06,.49],'bracketBox':{'center':[1.51,.94,-2.92],'size':[.52,1.12,.38]}},
  'survey-floor':{'kind':'box','center':[0,.09,0],'size':[6,.18,7]},
  'survey-ramp':{'kind':'convex-prism','axis':'X','range':[-1.6,1.6],'polygonYZ':[[0,3.5],[0,4.8],[.025,4.8],[.18,3.5]]},
  'survey-panel-debris':measured_box('survey-panel-debris'),
  'survey-cargo-frame':{**measured_box('survey-cargo-frame'),'note':'Small open frame is not a player-sized pass-through.'}},
 'material':'one opaque matte material per component, embedded 64x8 palette; no emission/metal/reflection/normal maps',
 'review':{'engine':'Cycles CPU','threads':2,'samples':12,'freshExportReimport':True,'renderPaths':['front.png','rear.png','three-quarter.png','game-scale-neutral.png','chest-open-clearance.png','breadcrumbs.png']}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'build-survey-module.py').write_bytes(Path(__file__).read_bytes())

# Fresh exported assembly, separate from the seven editable/export scenes.
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('neutral world');scene.world.color=(.28,.28,.28)
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
def load(path,offset=(0,0,0)):
    before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(path));items=list(set(scene.objects)-before)
    for ob in items:
        if ob.parent is None:ob.location+=Vector(point(offset))
    return items
shell=[]
for name in list(builders)[:5]:shell.extend(load(out/(name+'.glb')))
chest=load(root/'assets/models/field-chest-v1/model.glb',(0,.18,-1.48))
groundmat=bpy.data.materials.new('neutral ground');groundmat.diffuse_color=(.31,.33,.29,1);groundmat.roughness=1
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));bpy.context.object.data.materials.append(groundmat)
def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
ld=bpy.data.lights.new('large soft key','AREA');lo=bpy.data.objects.new('large soft key',ld);scene.collection.objects.link(lo)
lo.location=(-4,-6,10);ld.energy=1400;ld.size=9;aim(lo,(0,0,1))
cd=bpy.data.cameras.new('review camera');cam=bpy.data.objects.new('review camera',cd);scene.collection.objects.link(cam);scene.camera=cam
def render(name,location,target,span=11,width=640,height=512):
    scene.render.resolution_x=width;scene.render.resolution_y=height;cd.type='ORTHO';cd.ortho_scale=span
    cam.location=point(location);aim(cam,point(target));scene.render.filepath=str(review/(name+'.png'));bpy.ops.render.render(write_still=True)
render('front',(0,8.5,13),(0,.9,.4))
render('rear',(0,7,-13),(0,1,0))
render('three-quarter',(10,9,14),(0,.9,.4))
for ob in chest:
    if ob.name=='ChestLidPivot':
        ob.rotation_mode='XYZ';ob.rotation_euler.x-=math.radians(100)
render('chest-open-clearance',(7,9,10),(0,1,-.4),10)
for ob in chest:
    if ob.name=='ChestLidPivot':ob.rotation_euler.x+=math.radians(100)
players=load(root/'assets/models/explorer-v2/model.glb',(0,0,5.5))
scene.render.resolution_x=844;scene.render.resolution_y=390;cd.type='PERSP';cd.sensor_fit='VERTICAL';cd.sensor_height=24
cd.lens=24/(2*math.tan(math.radians(52/2)))
cam.location=point((0,.9+4.1*.85,5.5+6.55*.85));aim(cam,point((0,.9,5.5)))
scene.render.filepath=str(review/'game-scale-neutral.png');bpy.ops.render.render(write_still=True)
for ob in shell+chest+players:ob.hide_render=True
load(out/'survey-panel-debris.glb',(-1.5,0,0));load(out/'survey-cargo-frame.glb',(1.35,0,0))
render('breadcrumbs',(4,5,7),(0,.3,0),6.2)
bpy.ops.wm.save_as_mainfile(filepath=str(review/'fresh-GLB-review.blend'))
manifest['totals']={'triangles':sum(r['counts']['triangles'] for r in facts.values()),'draws':sum(r['drawPrimitives'] for r in facts.values()),'glbBytes':sum(r['bytes'] for r in facts.values())}
manifest['files']={f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in out.iterdir() if f.is_file() and f.name!='manifest.json'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'totals':manifest['totals'],'components':{k:{'hash':v['sourceSHA256'],'bounds':v['bounds'],'triangles':v['counts']['triangles']} for k,v in facts.items()}},indent=2))
