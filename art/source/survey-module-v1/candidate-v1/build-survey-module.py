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
def extrude(name,polygon,axis,start,end,color):
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
    center=Vector((2.64,2.59,-1.42));normal=Vector((.25,.63,.74)).normalized()
    pivot=center-normal*.15
    beam('single receiver support',(2.67,1.96,-1.42),pivot,.22,.26,2,.025)
    cylinder('one receiver horizontal pivot',pivot,.125,.47,3)
    beam('dish connected hub',pivot,center,.18,.18,2,.016)
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
    mod=bowl.modifiers.new('honest sheet thickness','SOLIDIFY');mod.thickness=.055;mod.offset=-1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # New solidify loops inherit the existing palette UV; reassert one layer.
    for item in bowl.data.uv_layers.active.data:item.uv=(.5/8,.5)
    cylinder('dark compact dish central plug',center,.075,.08,2,axis=normal)

def side_wall(sign):
    x=sign*2.78
    box('continuous side lower frame',(x,.30,0),(.42,.24,7),2,.04)
    # Two repeated manufactured sheets with one plain fracture step each.
    for z0,z1,top in [(-3.15,-.16,1.98),(.16,3.15,1.90)]:
        poly=[(.38,z0),(.38,z1),(top-.12,z1),(top,z1-.20),(top,z0+.18),(top-.08,z0)]
        extrude('large clipped ivory side sheet',poly,0,sign*2.64,sign*2.85,0)
    box('retained longitudinal top rail',(x,2.03,0),(.24,.20,6.7),1,.035)
    for z in [-2.85,0,2.85]:
        box('rib seated shoe',(sign*2.73,.28,z),(.54,.20,.50),2,.035)
        box('paired upright blue rib',(sign*2.74,1.20,z),(.42,1.96,.38),1,.045)
        # Angled shoulder ends stop well clear of the open center roof.
        beam('short snapped roof shoulder',(sign*2.74,2.08,z),(sign*2.11,2.91,z),.41,.38,1,.035)
        beam('ivory shoulder armor',(sign*2.78,2.12,z),(sign*2.15,2.95,z),.23,.43,0,.03)
        box('ivory upright armor',(sign*2.975,1.23,z),(.055,1.57,.32),0,.018)
        if z==2.85:
            box('amber entrance rib marker',(sign*2.76,1.32,z+.212),(.15,.48,.035),4,.009)
        else:
            box('subordinate rib joint',(sign*2.98,.66,z),(.075,.18,.25),3,.02)
    # One broad amber survey stripe per manufactured wall, not scratch noise.
    box('amber side hull identity',(sign*2.875,1.06,1.39),(.03,.13,.48),4,.01)
    if sign==1:dish()

def rear_wall():
    box('rear floor frame',(0,.30,-3.28),(5.40,.24,.42),2,.04)
    poly=[(-2.5,.38),(2.5,.38),(2.5,2.05),(1.86,2.05),(1.68,1.83),(.55,1.83),(.32,2.02),(-.58,2.02),(-.81,2.16),(-2.5,2.16)]
    extrude('broken manufactured rear skin',poly,2,-3.38,-3.17,0)
    box('rear upper structural rail',(0,1.89,-3.105),(4.92,.19,.16),1,.025)
    # The amber part is a fixed bracket face, not a second recoverable loot item.
    box('single attached cartridge bracket',(1.51,.94,-3.0),(.52,1.12,.22),2,.025)
    box('amber bracket backplate',(1.51,.95,-2.866),(.23,.63,.045),4,.014)
    for y in [.62,1.29]:box('bracket retaining jaw',(1.51,y,-2.82),(.38,.10,.16),1,.012)

def floor():box('low beveled plated floor',(0,.09,0),(6,.18,7),2,.025)
def ramp():extrude('true shallow entrance wedge',[(0,3.5),(0,4.8),(.025,4.8),(.18,3.5)],0,-1.60,1.60,3)
def panel_debris():
    poly=[(-.96,-.66),(.84,-.66),(1.02,-.43),(1.02,.57),(.76,.70),(-.81,.70),(-1.01,.39)]
    extrude('detached blue hull panel frame',poly,1,0,.14,1)
    inner=[(-.83,-.54),(.73,-.54),(.90,-.34),(.90,.46),(.64,.58),(-.70,.58),(-.88,.31)]
    extrude('detached ivory armor sheet',inner,1,.14,.225,0)
    box('panel amber edge marker',(.56,.249,-.40),(.30,.03,.12),4,.008)
def cargo_frame():
    for x in [-.60,.60]:
        for z in [-.42,.42]:box('grounded cargo frame post',(x,.36,z),(.16,.72,.16),1,.025)
    for y in [.12,.65]:
        for z in [-.42,.42]:box('open cargo width rail',(0,y,z),(1.31,.14,.13),2,.022)
        for x in [-.60,.60]:box('open cargo depth rail',(x,y,0),(.13,.14,.79),3,.022)

builders={'survey-left-wall':lambda:side_wall(-1),'survey-right-wall':lambda:side_wall(1),
          'survey-rear-wall':rear_wall,'survey-floor':floor,'survey-ramp':ramp,
          'survey-panel-debris':panel_debris,'survey-cargo-frame':cargo_frame}
spec=importlib.util.spec_from_file_location('glbcheck',root/'tools/art/check-game-glb.py')
checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
facts={}
for name,builder in builders.items():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    builder();bpy.context.view_layer.update()
    shoulder_parts=[]
    for part in bpy.context.scene.objects:
        if part.type!='MESH' or 'shoulder' not in part.name:continue
        points=[part.matrix_world@v.co for v in part.data.vertices]
        xyz=[(q.x,q.z,-q.y) for q in points]
        shoulder_parts.append({'name':part.name,'min':[min(v[i] for v in xyz) for i in range(3)],'max':[max(v[i] for v in xyz) for i in range(3)]})
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
    facts[name]=report
    if not report['ok']:raise ValueError(report['failures'])

manifest={'status':'candidate; independent model and native integration gates pending','reference':'art/targets/survey-wreck-v1/target.png',
 'referenceSHA256':hashlib.sha256((root/'art/targets/survey-wreck-v1/target.png').read_bytes()).hexdigest(),
 'builder':'tools/art/build-survey-module.py','axes':'X width, Y up, +Z entrance; root yaw -PI/2 gives west world entrance',
 'origin':'all five shell GLBs share module center ground origin; each breadcrumb separately centered at its own ground origin',
 'components':facts,'shellNominalSize':[6,3,7],'rampEndZ':4.8,'entranceClearWidth':3.2,'openRoofClearWidthAtRibTips':3.8,
 'chestFixture':{'path':'assets/models/field-chest-v1/model.glb','position':[0,.18,-1.48],'yaw':0,'exportedWithShell':False,'openLocalXDegrees':-100},
 'colliders':{
  'survey-left-wall':{'kind':'box','center':[-2.74,1.17,0],'size':[.56,1.98,7],'note':'Thin main wall only. Exact upperShoulderParts bounds provide optional separate collision boxes above the walkable floor; never use a cabin-wide envelope.'},
  'survey-right-wall':{'kind':'box','center':[2.74,1.17,0],'size':[.56,1.98,7],'note':'Thin main wall only. Exact upperShoulderParts bounds provide optional upper collision boxes. Receiver is elevated; do not extend floor-level collision to dish bounds.'},
  'survey-rear-wall':{'kind':'box','center':[0,1.10,-3.245],'size':[5.4,2.20,.47],'bracketBox':{'center':[1.51,.94,-2.92],'size':[.52,1.12,.38]}},
  'survey-floor':{'kind':'box','center':[0,.09,0],'size':[6,.18,7]},
  'survey-ramp':{'kind':'convex-prism','axis':'X','range':[-1.6,1.6],'polygonYZ':[[0,3.5],[0,4.8],[.025,4.8],[.18,3.5]]},
  'survey-panel-debris':{'kind':'box','center':[0,.14,0],'size':[2.04,.28,1.40]},
  'survey-cargo-frame':{'kind':'box','center':[0,.36,0],'size':[1.36,.72,1.00],'note':'Small open frame is not a player-sized pass-through.'}},
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
