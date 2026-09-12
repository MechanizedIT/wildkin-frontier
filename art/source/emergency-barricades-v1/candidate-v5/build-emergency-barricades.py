"""Reproducible matte emergency defenses. Blender 4.5, bounded CPU review.

Usage: blender -b -t 2 --python this.py -- --output-dir ABS_NEW_SOURCE --review-dir ABS_NEW_REVIEW
Design coordinates are glTF meters: X along panel, Y up, +Z outboard.
Source retains named solid components; each static GLB is one mesh/material.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--output-dir', required=True)
p.add_argument('--review-dir', required=True)
p.add_argument('--post-review-only', action='store_true', help='Export family, render only changed optional post')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
out, review = Path(a.output_dir).resolve(), Path(a.review_dir).resolve()
if out.exists() or review.exists():
    raise ValueError('Keep reviewed bytes immutable: use new output/review directories')
out.mkdir(parents=True)
review.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# Flat palette only: no normal/reflection maps or baked illumination.
palette = [(216,207,179), (56,66,69), (72,95,111), (99,123,134),
           (244,157,48), (96,198,205), (170,161,139), (34,44,48)]
im = bpy.data.images.new('emergency-palette', width=64, height=8, alpha=False)
im.pixels.foreach_set([v for y in range(8) for x in range(64)
                       for v in (*[c/255 for c in palette[x//8]],1)])
im.filepath_raw = str(out/'palette.png')
im.file_format = 'PNG'
im.save()
mat = bpy.data.materials.new('emergency-matte-palette')
mat.use_nodes = True
bs = mat.node_tree.nodes.get('Principled BSDF')
bs.inputs['Roughness'].default_value = 1
bs.inputs['Metallic'].default_value = 0
bs.inputs['Specular IOR Level'].default_value = 0
tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = im
tex.interpolation = 'Closest'
mat.node_tree.links.new(tex.outputs['Color'], bs.inputs['Base Color'])

def point(v): return (v[0], -v[2], v[1])

def finish(obj, name, color, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('broad single facet edges','BEVEL')
        mod.width, mod.segments = bevel, 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='Palette')
    uv.name = 'Palette'
    for item in uv.data: item.uv = ((color+.5)/8,.5)
    return obj

def box(name, loc, size, color, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(location=point(loc))
    obj = bpy.context.object
    obj.dimensions = (size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name,color,bevel)

def solid(name, vertices, faces, color):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([point(v) for v in vertices],[],faces)
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj,name,color)

def plate(name, polygon, front, back, color):
    # X/Y silhouette extruded along Z, polygon counterclockwise from front.
    n=len(polygon)
    verts=[(x,y,z) for z in (front,back) for x,y in polygon]
    faces=[tuple(range(n)), tuple(range(2*n-1,n-1,-1))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return solid(name,verts,faces,color)

def brace(name,x,width=.24):
    # Closed triangular solid, attached to post and seated on the same Y=0 plane.
    yz=[(0,-.13),(0,.62),(.13,.62),(.97,.22),(.97,.13)]
    n=len(yz)
    verts=[(xx,y,z) for xx in (x-width/2,x+width/2) for y,z in yz]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
    return solid(name,verts,faces,2)

def create_straight():
    box('structural lower sill',(0,.13,0),(2.64,.26,.32),1,.035)
    box('broad recovered ivory armor',(0,.9,0),(2.40,1.46,.28),0,.065)
    for sign in (-1,1):
        z=sign*.157
        poly=[(-1.16,.17),(1.16,.17),(1.16,.35),(1.04,.35),(.91,.49),(-.91,.49),(-1.04,.35),(-1.16,.35)]
        plate('chamfered dark kick plate '+str(sign),poly,z+sign*.027,z,1)
        for x in (-.87,.87):
            box('recessed status socket',(x,1.35,sign*.146),(.10,.19,.025),7,.01)
            box('nonluminous cyan insert',(x,1.35,sign*.164),(.044,.125,.014),5,.004)
        box('orange service tab',(0,.50,sign*.18),(.24,.09,.035),4,.012)
    for x in (-1.22,1.22):
        box('supported end upright',(x,.81,0),(.32,1.62,.36),2,.035)
        box('blue grey broad cap',(x,1.62,0),(.36,.16,.40),3,.028)
        brace('outboard triangular buttress',x)
        box('ground shoe',(x,.06,.37),(.30,.12,.54),1,.018)

def create_post():
    box('square corner foot',(0,.08,0),(.52,.16,.52),1,.035)
    box('square termination upright',(0,.835,0),(.36,1.59,.36),2,.035)
    box('corner broad cap',(0,1.62,0),(.48,.16,.48),3,.04)
    for sign in (-1,1):
        box('termination ivory inset',(0,.87,sign*.19),(.22,.85,.04),0,.025)
        box('termination status socket',(0,1.43,sign*.186),(.10,.18,.026),7,.008)
        box('termination cyan insert',(0,1.43,sign*.206),(.046,.12,.018),5,.004)

def export(name,builder):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    builder()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'-editable.blend')))
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=name
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',
       use_selection=True,export_yup=True,export_materials='EXPORT',export_image_format='AUTO')

export('emergency-barricade',create_straight)
export('emergency-corner-post',create_post)

# All review views below reimport actual GLBs, never only the editable source.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED'
scene.render.threads=2
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('neutral world')
scene.world.color=(.28,.28,.28)
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=0

def load(path):
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return list(set(scene.objects)-before)

walls=load(out/'emergency-barricade.glb')
floor_mat=bpy.data.materials.new('neutral warm ground')
floor_mat.diffuse_color=(.33,.32,.29,1)
floor_mat.roughness=1
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.003))
bpy.context.object.data.materials.append(floor_mat)

def aim(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
ld=bpy.data.lights.new('large soft key','AREA')
lo=bpy.data.objects.new('large soft key',ld)
scene.collection.objects.link(lo)
lo.location=(-3,-4,7)
ld.energy=650
ld.size=6
aim(lo,(0,0,.7))
cd=bpy.data.cameras.new('review camera')
cam=bpy.data.objects.new('review camera',cd)
scene.collection.objects.link(cam)
scene.camera=cam

def render(name,loc,target,span=3.6,width=512,height=512):
    scene.render.resolution_x=width
    scene.render.resolution_y=height
    cd.type='ORTHO'
    cd.ortho_scale=span
    cam.location=loc
    aim(cam,target)
    scene.render.filepath=str(review/(name+'.png'))
    bpy.ops.render.render(write_still=True)

if a.post_review_only:
    for obj in walls: obj.hide_render=True
    load(out/'emergency-corner-post.glb')
    render('corner-post',(3,-5,3),(0,0,.85),2.35)
    bpy.ops.wm.save_as_mainfile(filepath=str(review/'fresh-post-review.blend'))
    sys.exit(0)

render('front',(0,-7,2.6),(0,-.1,.85))
render('rear',(0,7,2.6),(0,-.1,.85))
render('three-quarter',(4,-7,3.7),(0,-.1,.75))
render('side',(7,0,2.4),(0,-.1,.8))
for obj in walls: obj.hide_render=True
posts=load(out/'emergency-corner-post.glb')
render('corner-post',(3,-5,3),(0,0,.85),2.35)
for obj in posts: obj.hide_render=True
for obj in walls: obj.hide_render=False

# Neutral environment fixture, actual shipped Explorer and native-size geometry.
# Camera is a separate diagnostic with normal gameplay pitch/FOV, not traversal proof.
root=Path(__file__).resolve().parents[2]
players=load(root/'assets/models/explorer-v2/model.glb')
for obj in players:
    if obj.parent is None: obj.location += Vector((0,-2.1,0))
for dx in (-2.8,2.8):
    for obj in walls:
        cp=obj.copy()
        scene.collection.objects.link(cp)
        cp.location.x+=dx
scene.render.resolution_x=844
scene.render.resolution_y=390
cd.type='PERSP'
cd.sensor_fit='VERTICAL'
cd.sensor_height=24
cd.lens=24/(2*math.tan(math.radians(52/2)))
cam.location=(0,-2.1-6.55*.85,.9+4.1*.85)
aim(cam,(0,-2.1,.9))
scene.render.filepath=str(review/'game-scale-neutral.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(review/'fresh-glb-review.blend'))

manifest={
 'status':'candidate; independent model review and native admission pending',
 'builder':'tools/art/build-emergency-barricades.py',
 'reference':'art/targets/crash-camp-v1/target.png',
 'style':'art/style/explorer-master.png',
 'axis':'glTF meters: X along wall, Y up, +Z outboard brace',
 'pivot':[0,0,0],
 'modularPitch':2.8,
 'straightBounds':{'min':[-1.4,0,-.2],'max':[1.4,1.7,.64]},
 'cornerPostBounds':{'min':[-.26,0,-.26],'max':[.26,1.7,.26]},
 'collisionRecommendation':{
  'panel':{'center':[0,.85,0],'size':[2.8,1.7,.4]},
  'feet':[{'center':[x,.06,.37],'size':[.30,.12,.54]} for x in (-1.22,1.22)],
  'brace':'Optional convex wedge per side: X center +/-1.22 width .24; Y/Z polygon [(0,-.13),(0,.62),(.13,.62),(.97,.22),(.97,.13)]. Never full-height box over feet.',
  'cornerPost':{'center':[0,.85,0],'size':[.52,1.7,.52]},
  'note':'Descriptor recommendations only; parent must validate actual compound/convex support and runtime access.'},
 'render':{'engine':'Cycles CPU','threads':2,'samples':12,'freshGLB':True,'gameCamera':{'verticalFov':52,'focusHeight':.9,'horizontalDistance':6.55,'verticalOffset':4.1,'landscapeZoom':.85},'images':['front.png','rear.png','three-quarter.png','side.png','corner-post.png','game-scale-neutral.png']},
 'materials':'one matte opaque palette material per GLB; 64x8 embedded PNG; metallic=0 roughness=1, no emission',
 'files':{f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in out.iterdir() if f.is_file()}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
