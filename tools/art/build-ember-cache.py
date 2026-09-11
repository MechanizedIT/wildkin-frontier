"""Reviewed Ember cache reconstruction. Blender X right/-Y front/Z up; glTF +Z front/Y up.

Build writes a fresh study only. --render-only reads its exported GLB and produces
bounded CPU review renders; it never modifies shipping assets or world data.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--output-dir', required=True)
p.add_argument('--render-only', action='store_true')
p.add_argument('--revise', action='store_true', help='Replace this unadmitted study after a local correction')
opt = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = Path(opt.output_dir).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)

def look(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def review():
    bpy.ops.import_scene.gltf(filepath=str(out/'ember-cache.glb'))
    model = list(bpy.context.scene.objects)
    left, right, tray = (bpy.data.objects[n] for n in ('CacheDoorLeft','CacheDoorRight','CacheTray'))
    rest = {ob.name:ob.location.copy() for ob in (left,right,tray)}
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard'
    if scene.world is None:scene.world=bpy.data.worlds.new('Review world')
    scene.world.color=(.28,.28,.28)
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.44,.47,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015))
    floor=bpy.context.object
    material=bpy.data.materials.new('Review floor');material.diffuse_color=(.28,.29,.30,1);material.use_nodes=True
    material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.28,.29,.30,1)
    material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
    floor.data.materials.append(material)
    for name,loc,power,size in [('Key',(-3,-4,6),450,4),('Fill',(4,-1,4),180,3)]:
        bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;look(light,(0,0,.7))
    bpy.ops.object.camera_add(location=(3,-5,3))
    cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.35;scene.camera=cam
    def state(opened):
        left.location=rest[left.name]+Vector((-.515 if opened else 0,0,0))
        right.location=rest[right.name]+Vector((.515 if opened else 0,0,0))
        tray.location=rest[tray.name]+Vector((0,-.25 if opened else 0,0))
        bpy.context.view_layer.update()
    def shot(name,pos,target=(0,0,.75),scale=3.35):
        cam.location=pos;cam.data.ortho_scale=scale;look(cam,target);scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    for opened in (False,True):
        state(opened);label='open' if opened else 'closed'
        for name,pos in [('front',(0,-5,2.2)),('three-quarter',(3,-5,3)),('rear',(3,5,2.8))]:
            shot(label+'-'+name,pos)
    (out/'render-evidence.json').write_text(json.dumps({'engine':'Cycles CPU','threads':4,'samples':24,'resolution':[512,512],'sourceGLB':hashlib.sha256((out/'ember-cache.glb').read_bytes()).hexdigest(),'views':['closed-front','closed-three-quarter','closed-rear','open-front','open-three-quarter','open-rear'],'scaleProof':'actual-scale.json and *-actual-explorer-scale.png from exported GLB + real Explorer Idle in Three.js','review':'Pending independent judgment; rendered exported GLB unchanged'},indent=2),encoding='utf-8')

if opt.render_only:
    review()
    sys.exit(0)
if out.exists() and not opt.revise:
    raise ValueError('Refusing to overwrite an existing cache study')
out.mkdir(parents=True,exist_ok=opt.revise)
colors={'ivory':(224,211,184),'edge':(242,229,204),'slate':(48,58,69),'steel':(81,93,105),'dark':(25,30,35),'basalt':(72,65,75),'basaltLight':(88,79,88),'basaltDark':(57,53,63),'amber':(249,158,38),'amberDark':(166,92,30),'bolt':(133,132,123),'tray':(58,65,70),'rock':(108,91,81),'black':(17,21,26),'sand':(144,122,96),'seam':(102,99,94)}
atlas=bpy.data.images.new('Ember cache palette256',width=256,height=256,alpha=False)
pixels=[];palette=list(colors.values())
for y in range(256):
    for x in range(256):pixels.extend([v/255 for v in palette[(y//64)*4+x//64]]+[1])
atlas.pixels.foreach_set(pixels);atlas.filepath_raw=str(out/'ember-cache-palette.png');atlas.file_format='PNG';atlas.save()
mat=bpy.data.materials.new('Ember cache matte palette');mat.use_nodes=True
bsdf=mat.node_tree.nodes['Principled BSDF'];bsdf.inputs['Roughness'].default_value=1;bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Specular IOR Level'].default_value=0
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Closest';mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
groups={name:[] for name in ('CacheStructure','CacheDoorLeft','CacheDoorRight','CacheTray','CacheCore')}
active='CacheStructure'
def finish(ob,name,color,bevel=0):
    ob.name=name;bpy.context.view_layer.objects.active=ob
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    if bevel:
        mod=ob.modifiers.new('Single faceted edge','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    ob.data.materials.append(mat);uv=ob.data.uv_layers.active or ob.data.uv_layers.new();i=list(colors).index(color)
    for loop in uv.data:loop.uv=((i%4+.5)/4,(i//4+.5)/4)
    for face in ob.data.polygons:face.use_smooth=False
    groups[active].append(ob);return ob
def box(name,loc,size,color,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(ob,name,color,bevel)
def prism(name,polygon,y1,y2,color,bevel=0):
    n=len(polygon);verts=[(x,y,z) for y in (y1,y2) for x,z in polygon];faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);return finish(ob,name,color,bevel)
def cylinder(name,loc,radius,depth,color,axis=(0,0,1),vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc);ob=bpy.context.object;ob.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return finish(ob,name,color)
def rock_mass(name,points,color='basalt'):
    # A few authored fracture corners produce broad unequal planes, not noise
    # or a rounded box modifier. Each mass is one small convex closed volume.
    mesh=bpy.data.meshes.new(name);bm=bmesh.new()
    for point in points:bm.verts.new(point)
    bm.verts.ensure_lookup_table();bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);finish(ob,name,color)
    uv=ob.data.uv_layers.active
    for face in ob.data.polygons:
        shade='basaltLight' if face.normal.z>.48 else color
        i=list(colors).index(shade)
        for loop in face.loop_indices:uv.data[loop].uv=((i%4+.5)/4,(i//4+.5)/4)
    return ob

# A real rear cavity, supported floor and permanent transverse shutter rails.
box('Grounded vault plinth',(0,0,.105),(2.13,1.5,.21),'basaltDark',.055)
box('Inner cavity back wall',(0,.605,.795),(1.12,.17,1.11),'dark',.015)
box('Rear service armored slab',(0,.718,.83),(1.10,.064,.91),'slate',.035)
box('Cavity floor',(0,.045,.24),(1.02,1.05,.09),'slate',.012)
box('Cavity ceiling',(0,.04,1.305),(1.08,1.08,.13),'slate',.022)
for z in (.255,1.305):
    box('Continuous captured shutter rail',(0,-.49,z),(2.08,.20,.074),'steel',.01)
    box('Rail front return lip',(0,-.596,z),(2.04,.035,.10),'slate',.008)
for side in (-1,1):
    # Each pocket is open along the door plane, enclosed front/rear/outboard.
    box('Pocket rear armor',(side*.786,-.354,.785),(.56,.14,1.045),'slate',.02)
    box('Pocket front armor',(side*.785,-.705,.775),(.56,.06,1.01),'slate',.018)
    box('Pocket outer stop',(side*1.067,-.49,.775),(.056,.33,1.02),'steel',.008)
    poly=[(.574,.34),(.938,.34),(1.012,.44),(.997,1.14),(.934,1.23),(.574,1.23)]
    prism('Ivory fixed pocket armor',[(side*x,z) for x,z in (poly if side>0 else list(reversed(poly)))],-.749,-.681,'ivory',.016)
    box('Dark captured inner rail',(side*.536,-.731,.784),(.042,.024,.955),'steel',.004)
    box('Interior cavity side wall',(side*.554,.16,.79),(.085,.92,1.02),'dark',.008)
    # Faceted basalt shoulders form supported side masses, not floating blocks.
    if side<0:
        points=[(.65,-.31,.13),(.98,-.36,.06),(1.10,.02,.18),(1.08,.58,.11),(.74,.70,.20),(.62,.53,1.30),(.84,.60,1.40),(1.035,.42,1.16),(1.10,.02,.91),(.98,-.34,.95),(.82,-.32,1.30),(.66,-.29,1.37)]
    else:
        points=[(.66,-.34,.12),(1.06,-.31,.04),(1.10,.20,.20),(1.01,.68,.12),(.69,.69,.19),(.64,.54,1.40),(.86,.54,1.49),(1.055,.32,1.20),(1.10,-.02,.84),(.99,-.36,.91),(.84,-.32,1.28),(.67,-.28,1.35)]
    rock_mass('Unequal fractured basalt shoulder',[(side*x,y,z) for x,y,z in points])
    points=[(.70,-.48,.08),(.92,-.75,.05),(1.10,-.65,.08),(1.08,-.29,.14),(.76,-.26,.16),(.75,-.45,.38),(.89,-.66,.61 if side<0 else .49),(1.05,-.56,.45),(1.07,-.29,.37)]
    rock_mass('Grounded broken basalt toe',[(side*x,y,z) for x,y,z in points],'basaltDark')
    poly=[(.495,1.30),(.80,1.265),(.975,1.37),(.854,1.53),(.613,1.51),(.49,1.425)]
    prism('Heavy ivory shoulder block',[(side*x,z) for x,z in (poly if side>0 else list(reversed(poly)))],-.75,-.22,'ivory',.027)
    box('Supported tray lower slide',(side*.385,-.12,.25),(.095,1.08,.055),'steel',.008)
    box('Rear vertical rib',(side*.68,.66,.76),(.12,.16,1.16),'basaltDark',.026)
    for z in (.36,1.17):cylinder('Pocket captive bolt',(side*.59,-.743,z),.019,.010,'bolt',(0,1,0),6)
rock_mass('Left slanted crown fracture',[(-.79,-.24,1.365),(-.03,-.30,1.355),(.10,.55,1.37),(-.68,.69,1.36),(-.69,-.21,1.53),(-.25,-.22,1.60),(-.015,-.11,1.52),(.045,.52,1.56),(-.58,.56,1.57)])
rock_mass('Right lower crown fracture',[(.012,-.30,1.348),(.76,-.23,1.36),(.81,.60,1.38),(.105,.57,1.37),(.04,-.20,1.48),(.57,-.20,1.47),(.73,.04,1.54),(.64,.56,1.555),(.105,.52,1.535)],'basaltDark')
box('Inner warm status recess',(0,-.19,1.224),(.43,.065,.078),'black',.012)
box('Inner amber status strip',(0,-.23,1.224),(.31,.020,.032),'amber',.005)
for x in (-.28,-.14,0,.14,.28):box('Rear maintenance exhaust',(x,.756,.87),(.048,.014,.23),'dark',.008)
box('Rear service horizontal keeper',(0,.754,.61),(.78,.026,.07),'steel',.01)

# Constant-size mirrored shutters: .493m panels, .515m outward travel. Static
# front pocket armor occludes them in the open state; no scaling or hiding.
for side,name in [(-1,'CacheDoorLeft'),(1,'CacheDoorRight')]:
    active=name
    poly=[(.007,.29),(.428,.29),(.5,.37),(.5,1.16),(.426,1.265),(.007,1.265)]
    prism('Ivory sliding panel',[(side*x,z) for x,z in (poly if side>0 else list(reversed(poly)))],-.590,-.445,'ivory',.012)
    box('Shutter top guide shoe',(side*.25,-.49,1.274),(.34,.15,.048),'steel',.007)
    box('Shutter bottom guide shoe',(side*.25,-.49,.277),(.34,.15,.044),'steel',.007)
    box('Shutter interior back face',(side*.25,-.432,.77),(.45,.020,.83),'slate',.008)
    box('Center seal steel stile',(side*.023,-.603,.77),(.028,.026,.84),'steel',.004)
    # Two dark/amber seal halves meet in closed position and remain attached.
    poly=[(0,.715),(.125,.925),(0,.925)]
    prism('Seal bezel half',[(side*x,z) for x,z in (poly if side>0 else list(reversed(poly)))],-.644,-.608,'slate',.008)
    poly=[(.011,.771),(.083,.898),(.011,.898)]
    prism('Amber seal half',[(side*x,z) for x,z in (poly if side>0 else list(reversed(poly)))],-.659,-.643,'amber',.003)
    for z in (.40,1.13):cylinder('Panel captive screw',(side*.395,-.607,z),.012,.01,'bolt',(0,1,0),6)

active='CacheTray'
box('Sliding tray supported bed',(0,-.04,.338),(.84,.72,.086),'slate',.02)
box('Tray recessed core seat',(0,-.04,.393),(.60,.59,.036),'tray',.012)
box('Ivory tray front armor',(0,-.424,.373),(.87,.09,.15),'ivory',.025)
box('Tray front indicator bezel',(0,-.474,.37),(.32,.018,.061),'slate',.008)
box('Tray amber indicator',(0,-.486,.37),(.21,.014,.025),'amber',.004)
for side in (-1,1):
    box('Moving captured tray runner',(side*.385,-.005,.304),(.055,.77,.042),'dark',.006)
    prism('Ivory tray side guard',[(side*.285,.41),(side*.42,.41),(side*.42,.505),(side*.335,.505)],-.345,.255,'ivory',.009)
    for y in (-.235,.19):box('Core cradle side guide',(side*.187,y,.465),(.04,.105,.12),'steel',.008)
for y in (-.235,.19):box('Core cradle contact saddle',(0,y,.418),(.18,.105,.02),'steel',.004)
active='CacheCore'
cylinder('Amber recovered core',(0,-.005,.583),.133,.40,'amber',(0,1,0),6)
for y in (-.225,.215):
    cylinder('Core faceted end armor',(0,y,.583),.155,.10,'slate',(0,1,0),8)
    cylinder('Core end inset',(0,y+math.copysign(.055,y),.583),.108,.014,'steel',(0,1,0),8)
for side in (-1,1):box('Core protective spine',(side*.116,-.005,.642),(.041,.38,.052),'slate',.009)
box('Core top amber face',(0,-.005,.704),(.125,.25,.022),'amber',.009)

# Keep the whole tray behind the closed door's back face, then advance .25m.
for ob in groups['CacheTray']+groups['CacheCore']:ob.location.y+=.09
# Cut the real swept shutter cavity through each intersecting fixed part. This
# resolves hidden overlaps with rock feet/corner caps, retaining fixed geometry
# rather than relying on visual occlusion to pretend the shutters fit.
active='CacheStructure'
cutter=box('Temporary shutter swept clearance',(0,-.54,.779),(2.066,.268,1.048),'dark',0)
groups[active].remove(cutter)
bpy.context.view_layer.update()
for ob in groups['CacheStructure']:
    points=[ob.matrix_world@Vector(c) for c in ob.bound_box]
    low=[min(v[i] for v in points) for i in range(3)];high=[max(v[i] for v in points) for i in range(3)]
    if any(high[i]<=(-1.033,-.674,.255)[i] or low[i]>=(1.033,-.406,1.303)[i] for i in range(3)):continue
    bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Real captured shutter pocket','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
source_parts=sum(len(items) for items in groups.values())
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ember-cache-editable.blend'))
def join(items,name,pivot):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name
    bpy.context.scene.cursor.location=pivot;bpy.ops.object.origin_set(type='ORIGIN_CURSOR');return ob
pivots={'CacheStructure':(0,0,0),'CacheDoorLeft':(-.25,-.49,.775),'CacheDoorRight':(.25,-.49,.775),'CacheTray':(0,.05,.338),'CacheCore':(0,.085,.583)}
nodes={name:join(items,name,pivots[name]) for name,items in groups.items()}
bpy.context.view_layer.update()
core=nodes['CacheCore'];world=core.matrix_world.copy();core.parent=nodes['CacheTray'];core.matrix_world=world
for name,delta in [('CacheDoorLeft',-.515),('CacheDoorRight',.515)]:nodes[name]['motion']='Translate local X by '+str(delta)+'m from rest; constant geometry, no scale/hide'
nodes['CacheTray']['motion']='Translate local +Z glTF by0.25m only after shutters clear; fixed rails remain engaged'
nodes['CacheCore']['purpose']='Seated reward presentation, child of tray. Hide/remove after authoritative claim only.'
nodes['CacheStructure']['purpose']='Identical fixed housing in all cache states; side pockets contain shutters'
triangles=sum(len(face.vertices)-2 for ob in nodes.values() for face in ob.data.polygons)
assert triangles<=6000,triangles
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ember-cache-assemblies.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'ember-cache.glb'),export_format='GLB',export_materials='EXPORT',export_yup=True,export_extras=True,export_animations=False)
glb=out/'ember-cache.glb'
manifest={'reference':'../../overnight-ember-cache-target/closed-open-v1.png','referenceSHA256':'3372e01994bb9f80ba4cc6eb9ee209070ca1691a4183bf56e9a12c6feccb4684','referenceReview':'root approved direction; generated Explorer size not used','method':'Blender hard-surface reconstruction; station palette/export pattern','modelReview':'Pending independent root judgment; no self-PASS or integration','sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'fileBytes':glb.stat().st_size,'triangles':triangles,'materialCount':1,'textureSize':[256,256],'runtimeMeshCount':5,'sourcePartCount':source_parts,'dimensionsMeters':[2.2,1.6,1.5],'front':'+Z glTF / -Y Blender','base':'Y0 glTF','clearOpeningMeters':{'width':1.01,'height':1.0},'doorPanelWidthMeters':.493,'doorTravelMeters':.515,'trayTravelMeters':.25,'motionNodes':{'CacheDoorLeft':{'axis':'local X','delta':-.515,'restGLTF':[-.25,.775,.49]},'CacheDoorRight':{'axis':'local X','delta':.515,'restGLTF':[.25,.775,.49]},'CacheTray':{'axis':'local Z','delta':.25,'restGLTF':[0,.338,-.05]},'CacheCore':{'parent':'CacheTray','claimPresentation':'remove or hide whole core after reward'}},'limits':'Static model and motion extremes require independent review. Root owns reward/collision/animation integration.'}
bpy.context.view_layer.update()
def bounds(ob):
    points=[ob.matrix_world@Vector(c) for c in ob.bound_box]
    return [min(v[i] for v in points) for i in range(3)],[max(v[i] for v in points) for i in range(3)]
door_low,door_high=bounds(nodes['CacheDoorRight']);tray_low,tray_high=bounds(nodes['CacheTray'])
assert tray_low[1] > door_high[1], 'Closed tray or indicator intersects shutter back'
assert door_high[0]+.515<1.033 and door_low[1]>-.674 and door_high[1]<-.406 and door_high[2]<1.303
all_bounds=[bounds(ob) for ob in nodes.values()]
low=[min(pair[0][i] for pair in all_bounds) for i in range(3)];high=[max(pair[1][i] for pair in all_bounds) for i in range(3)]
manifest['dimensionsMeters']=[high[i]-low[i] for i in (0,2,1)]
manifest['mechanicalClearance']={'closedTrayToShutterMeters':tray_low[1]-door_high[1],'pocketSweepExtentsBlender':{'min':[-1.033,-.674,.255],'max':[1.033,-.406,1.303]},'doorGeometryConstant':True,'fixedShellIdentical':True,'coreSaddleContactHeight':.428}
(out/'build-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
