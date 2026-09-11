"""Reconstruct the reviewed Salvage Bench study; editable source + compact GLB.

Blender design coordinates: X right, -Y front, Z up. glTF export: +Z front,
+Y up. All dimensions are meters. No output tool is fused into the workstation.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
parser = argparse.ArgumentParser()
parser.add_argument('--output-dir', required=True)
opt = parser.parse_args(args)
out = Path(opt.output_dir).resolve()
if out.exists():
    raise ValueError('Refusing to overwrite an existing salvage study')
out.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

colors = {
    'ivory': (226, 211, 182), 'edge': (248, 231, 199),
    'slate': (48, 59, 73), 'steel': (82, 96, 109),
    'dark': (30, 39, 47), 'tray': (48, 81, 85),
    'amber': (240, 155, 46), 'cyan': (67, 224, 234),
    'bolt': (134, 145, 146), 'joint': (122, 119, 109),
    'blue': (44, 110, 166), 'black': (22, 28, 32),
}
atlas = bpy.data.images.new('salvage-palette-256', width=256, height=256, alpha=False)
palette = list(colors.values()) + [(226, 211, 182)] * 4
pixels = []
for y in range(256):
    for x in range(256):
        pixels.extend([c / 255 for c in palette[(y // 64) * 4 + x // 64]] + [1])
atlas.pixels.foreach_set(pixels)
atlas.filepath_raw = str(out / 'salvage-palette.png')
atlas.file_format = 'PNG'
atlas.save()
mat = bpy.data.materials.new('Fabricator matte palette')
mat.use_nodes = True
shader = mat.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = 1
shader.inputs['Metallic'].default_value = 0
shader.inputs['Specular IOR Level'].default_value = 0
tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = atlas
tex.interpolation = 'Closest'
mat.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
parts = []

def finish(obj, name, color, bevel=0):
    obj.name = name
    bpy.context.view_layer.objects.active = obj
    if bevel:
        mod = obj.modifiers.new('Single faceted edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(mat)
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new()
    i = list(colors).index(color)
    for loop in uv.data:
        loop.uv = ((i % 4 + .5) / 4, (i // 4 + .5) / 4)
    for face in obj.data.polygons:
        face.use_smooth = False
    parts.append(obj)
    return obj

def box(name, p, size, color, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, color, bevel)

def prism(name, polygon_xz, y1, y2, color, bevel=0):
    n = len(polygon_xz)
    verts = [(x, y, z) for y in (y1, y2) for x, z in polygon_xz]
    faces = [tuple(reversed(range(n))), tuple(range(n, n*2))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.select_set(True)
    return finish(obj, name, color, bevel)

def cylinder(name, p, radius, depth, color, axis=(0,0,1), vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=p)
    obj = bpy.context.object
    obj.rotation_euler = Vector(axis).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, color)

def link(name, a, b, radius, color):
    v = Vector(b)-Vector(a)
    return cylinder(name, (Vector(a)+Vector(b))/2, radius, v.length, color, v)

# Four splayed shoes, dark structural frame and a useful under-bench shelf.
for x in (-.735,.735):
    for y in (-.32,.32):
        prism('Splayed steel bench foot',[(x-.145,0),(x+.145,0),(x+.095,.185),(x-.095,.185)],y-.14,y+.14,'slate',.012)
        box('Bench square frame leg',(x,y,.455),(.155,.17,.58),'slate',.013)
        box('Leg lower collar',(x,y,.192),(.20,.21,.075),'steel',.010)
box('Lower ivory equipment shelf',(0,.015,.215),(1.53,.64,.070),'ivory',.018)
box('Rear lower structural brace',(0,.295,.36),(1.48,.065,.13),'slate',.009)
for x in (-.735,.735):
    box('Side upper frame rail',(x,0,.683),(.15,.76,.14),'steel',.015)
box('Front upper frame rail',(0,-.32,.679),(1.48,.11,.15),'slate',.012)

# Chunky ivory deck with clear panel joints, restrained fasteners and steel ends.
box('Chamfered ivory worktop',(0,0,.764),(1.80,.99,.16),'ivory',.042)
for x in (-.69,0,.69):
    box('Worktop front panel seam',(x,-.498,.766),(.009,.007,.083),'joint',0)
for x in (-.88,.88):
    box('Worktop end protective plate',(x,0,.852),(.13,.84,.035),'steel',.015)
for x in (-.82,.82):
    for y in (-.365,.365):
        cylinder('Worktop captive screw',(x,y,.875),.018,.012,'bolt',vertices=6)
box('Central assembly pad',(-.09,-.17,.854),(.61,.42,.022),'slate',.015)
for x in (-.337,.157):
    for y in (-.333,-.008):
        cylinder('Assembly pad corner fastener',(x,y,.871),.014,.010,'joint',vertices=6)

# Vise axis is local/world X. The movable jaw rides a steel dovetail and screw.
box('Vise grounded mounting shoe',(-.545,.17,.896),(.58,.39,.084),'slate',.019)
box('Vise sliding dovetail rail',(-.543,.17,.954),(.52,.10,.055),'steel',.006)
cylinder('Vise connecting lead screw',(-.655,.14,1.003),.025,.65,'bolt',(1,0,0),8)
prism('Fixed vise upright',[(-.78,.915),(-.63,.915),(-.62,1.145),(-.75,1.167),(-.80,1.085)],-.025,.323,'slate',.009)
box('Fixed vise replaceable grip',(-.613,.147,1.123),(.033,.286,.097),'steel',.006)
prism('Movable vise jaw body',[(-.474,.935),(-.315,.935),(-.302,1.069),(-.334,1.164),(-.474,1.144)],-.025,.323,'slate',.009)
box('Movable vise replaceable grip',(-.487,.147,1.123),(.032,.286,.097),'steel',.006)
box('Movable vise sliding foot',(-.397,.169,.938),(.20,.19,.055),'dark',.006)
cylinder('Vise screw outer collar',(-.934,.14,1.003),.057,.045,'steel',(1,0,0),8)
cylinder('Vise crank hub',(-.973,.14,1.003),.046,.034,'amber',(1,0,0),8)
link('Vise short manual crank',(-.99,.14,1.003),(-.99,.065,.871),.020,'amber')
cylinder('Vise crank hand grip',(-.99,.065,.871),.031,.070,'slate',(1,0,0),8)
for x in (-.745,-.336):
    cylinder('Vise mounting fastener',(x,.287,.945),.017,.014,'bolt',vertices=6)

# Rear-right fiber roll, supported at both axle ends, with a loose feed strip.
for x in (.508,.806):
    prism('Spool anchored fork',[(x-.048,.854),(x+.048,.854),(x+.057,1.175),(x+.017,1.249),(x-.036,1.249),(x-.060,1.169)],.133,.322,'slate',.008)
    box('Spool foot amber clamp',(x,.134,.876),(.117,.112,.066),'amber',.008)
cylinder('Spool cross axle',(.657,.228,1.075),.040,.392,'steel',(1,0,0),8)
cylinder('Wound orange fiber spool',(.657,.228,1.075),.168,.241,'amber',(1,0,0),12)
for x in (.52,.794):
    cylinder('Spool slate end flange',(x,.228,1.075),.202,.051,'steel',(1,0,0),10)
for x in (.591,.657,.723):
    cylinder('Raised fiber winding band',(x,.228,1.075),.174,.021,'amber',(1,0,0),12)
strip=box('Spool descending flat feed',(.646,.031,.966),(.104,.029,.20),'amber',.006)
strip.rotation_euler.x=math.radians(-23)
box('Spool feed end resting on deck',(.646,-.006,.866),(.105,.14,.022),'amber',.007)

# Empty shallow component tray; future output is a separate object on the pad.
box('Component tray floor',(.554,-.248,.866),(.36,.29,.040),'steel',.009)
for x in (.367,.741):
    box('Component tray side wall',(x,-.248,.907),(.026,.30,.09),'slate',.006)
for y in (-.403,-.093):
    box('Component tray end wall',(.554,y,.907),(.399,.023,.09),'slate',.006)

# Small service loop at the rear of the pad, leaving its working front clear.
rope=[]
for i in range(12):
    a=i*math.tau/12
    rope.append((.034+math.cos(a)*.148,.266+math.sin(a)*.108,.867))
for i in range(12):
    link('Rear tabletop service cable loop',rope[i],rope[(i+1)%12],.015,'amber')
box('Service cable connector',(.164,.278,.877),(.067,.043,.031),'steel',.004)

# Two restrained under-shelf supply cases, separate readable shells and latches.
box('Under-bench slate tool case',(-.31,.034,.376),(.53,.43,.252),'slate',.026)
box('Tool case upper lid',(-.31,.034,.511),(.55,.44,.035),'steel',.012)
box('Tool case inset handle',(-.31,-.193,.429),(.215,.024,.076),'dark',.008)
box('Tool case handle grip',(-.31,-.21,.454),(.157,.027,.025),'steel',.006)
box('Under-bench ivory supply case',(.334,.035,.354),(.36,.34,.21),'ivory',.020)
box('Supply case slate lid',(.334,.035,.468),(.37,.35,.035),'slate',.009)
box('Supply case amber latch',(.334,-.149,.359),(.072,.033,.098),'amber',.007)

anchor=bpy.data.objects.new('CraftOutputAnchor',None)
bpy.context.collection.objects.link(anchor)
anchor.location=(-.09,-.17,.875)
anchor.empty_display_type='PLAIN_AXES'
anchor.empty_display_size=.12
anchor['purpose']='Clear front assembly pad; attach/remove actual crafted item separately'
anchor['front_glTF']='+Z'
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:
    ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.wm.save_as_mainfile(filepath=str(out/'salvage-bench-editable.blend'))

def join_at_pivot(objects,name,pivot):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    ob=bpy.context.object
    ob.name=name
    bpy.context.scene.cursor.location=pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return ob

jaw_names={'Movable vise jaw body','Movable vise replaceable grip','Movable vise sliding foot'}
jaw_parts=[ob for ob in parts if ob.name in jaw_names]
shell_parts=[ob for ob in parts if ob.name not in jaw_names]
shell=join_at_pivot(shell_parts,'SalvageBenchStructure',(0,0,0))
jaw=join_at_pivot(jaw_parts,'SalvageViseJaw',(-.397,.169,.938))
jaw['motion']='Translate local X delta [-0.070,0] meters; closes toward fixed left jaw'
jaw['minimumGripClearanceMeters']=.024
bpy.ops.export_scene.gltf(filepath=str(out/'salvage-bench.glb'),export_format='GLB',export_materials='EXPORT',export_yup=True,export_extras=True)
glb=out/'salvage-bench.glb'
manifest={'method':'Reviewed-reference hard-surface reconstruction; no image-to-3D run',
          'reference':'../../overnight-crafting-target/stations-v1.png','referenceReviewer':'root; author crafting_targets',
          'modelReview':'Pending independent root review; no admission claimed',
          'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'fileBytes':glb.stat().st_size,
          'editableSource':'salvage-bench-editable.blend','front':'+Z glTF / -Y Blender',
          'units':'meters; grounded at Y=0 glTF',
          'outputMount':'CraftOutputAnchor; clear front assembly pad; no fused output',
          'materialCount':1,'textureSize':[256,256],'sourcePartCount':len(parts),
          'triangles':sum(len(f.vertices)-2 for ob in (shell,jaw) for f in ob.data.polygons),
          'runtimeMeshCount':2,
          'motionNodes':{'SalvageViseJaw':{'restPositionGLTF':[-.397,.938,-.169],'axis':'local X translation','deltaRangeMeters':[-.070,0]}}}
(out/'build-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))

