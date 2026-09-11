"""Reconstruct the reviewed Matter Fabricator study; editable source + compact GLB.

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
    raise ValueError('Refusing to overwrite an existing fabrication study')
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
atlas = bpy.data.images.new('fabricator-palette-256', width=256, height=256, alpha=False)
palette = list(colors.values()) + [(226, 211, 182)] * 4
pixels = []
for y in range(256):
    for x in range(256):
        pixels.extend([c / 255 for c in palette[(y // 64) * 4 + x // 64]] + [1])
atlas.pixels.foreach_set(pixels)
atlas.filepath_raw = str(out / 'fabricator-palette.png')
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

# Deep chest-like lower chassis, separated front armor, inset work basin.
box('Lower chassis octagonal skirt', (0,0,.115), (1.52,1.02,.23), 'slate', .07)
box('Basin support body', (0,0,.355), (1.42,.91,.40), 'slate', .055)
prism('Front ivory armor with center foot relief',
      [(-.72,.55),(-.65,.66),(.65,.66),(.72,.55),(.72,.17),(.63,.105),
       (.43,.105),(.35,.225),(-.35,.225),(-.43,.105),(-.63,.105),(-.72,.17)],
      -.517,-.42,'ivory',.012)
for x in (-.67,.67):
    box('Basin ivory side armor', (x,.015,.40), (.135,.88,.45), 'ivory', .035)
    box('Side panel dark seam', (x + math.copysign(.072,x),.04,.40), (.012,.026,.29), 'joint', .002)
    box('Front amber service latch', (x,-.537,.355), (.08,.045,.21), 'amber', .012)
    box('Front latch hinge', (x+math.copysign(.047,x),-.538,.355), (.027,.042,.15), 'slate', .004)
box('Rear housing armor', (0,.43,.40), (1.29,.10,.44), 'ivory', .018)
box('Recessed fabrication tray floor', (0,-.008,.515), (1.18,.74,.055), 'tray', .035)
for x in (-.615,.615):
    box('Raised dark basin side wall', (x,0,.605), (.075,.82,.155), 'slate', .018)
    box('Ivory basin side lip', (x+math.copysign(.052,x),0,.683), (.095,.90,.042), 'edge', .011)
for y in (-.421,.421):
    box('Raised dark basin end wall', (0,y,.602), (1.22,.07,.15), 'slate', .015)
    box('Ivory basin end lip', (0,y+math.copysign(.040,y),.683), (1.33,.092,.045), 'edge', .012)
for x in (-.573,.573):
    for y in (-.38,.38):
        box('Tray corner restraint', (x,y,.655), (.10,.10,.09), 'steel', .019)
for z in (.345,.445):
    box('Front recessed cooling slot', (0,-.528,z), (.53,.022,.043), 'dark', .004)
    box('Cooling slot lower lip', (0,-.543,z-.021), (.50,.018,.009), 'steel', .002)
prism('Center kick guard', [(-.40,.06),(.40,.06),(.33,.18),(-.33,.18)], -.543,-.516,'steel',.008)

# Asymmetric gantry: a tall left pillar and shorter right rail support.
for x in (-.705,.705):
    box('Gantry grounded foot', (x,.27,.135), (.30,.49,.27), 'slate', .035)
    box('Gantry pillar frame', (x,.29,.90), (.17,.24,1.29 if x<0 else 1.02), 'slate', .018)
    box('Column lower collar', (x,.255,.64), (.255,.32,.23), 'slate', .025)
    box('Exposed column linear track', (x,-.005,1.02), (.060,.045,.56 if x<0 else .37), 'steel', .005)
prism('Tall left ivory gantry armor',
      [(-.835,.74),(-.63,.74),(-.63,1.63),(-.53,1.69),(-.53,1.82),(-.69,1.82),(-.835,1.68)],
      .14,.47,'ivory',.015)
prism('Short right ivory gantry return',
      [(.63,.77),(.835,.77),(.835,1.34),(.755,1.43),(.36,1.43),(.36,1.265),(.63,1.265)],
      .14,.46,'ivory',.018)
box('Right lower armor shin', (.746,-.03,.40), (.14,.43,.59), 'ivory', .025)
box('Right shin amber top clamp', (.748,-.145,.72), (.13,.17,.08), 'amber', .012)
box('Upper gantry spanning shell', (-.12,.28,1.69), (1.19,.38,.25), 'ivory', .040)
box('Gantry left top cap', (-.65,.30,1.797), (.27,.38,.045), 'edge', .010)
box('Gantry right top maintenance plate', (.367,.29,1.812), (.31,.27,.020), 'slate', .015)
box('Gantry left top maintenance plate', (-.37,.29,1.821), (.29,.23,.014), 'steel', .010)
box('Gantry running carriage rail', (-.12,.06,1.505), (1.23,.17,.13), 'dark', .012)
box('Gantry upper rail lip', (-.17,-.035,1.575), (1.12,.052,.050), 'steel', .007)
box('Status display housing', (-.19,-.068,1.501), (.54,.098,.14), 'slate', .017)
box('Status display recess', (-.19,-.122,1.501), (.36,.014,.070), 'dark', .008)
box('Cyan fabrication status strip', (-.19,-.133,1.501), (.292,.013,.043), 'cyan', .005)

# Functionally attached printer carriage, rigid drive housing, stepped nozzle.
box('Print carriage on horizontal track', (.37,.035,1.48), (.31,.34,.28), 'slate', .034)
box('Print carriage upper saddle', (.37,.115,1.627), (.31,.22,.075), 'steel', .014)
cylinder('Print carriage telescoping actuator', (.37,.015,1.225), .035,.31,'steel')
box('Print head ivory tool collar', (.37,.015,1.289), (.24,.255,.13), 'ivory', .027)
cylinder('Print head faceted dark barrel', (.37,.015,1.18), .105,.13,'slate')
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=.047, radius2=.091, depth=.095, location=(.37,.015,1.067))
finish(bpy.context.object,'Printer tapered deposition nozzle','steel')
cylinder('Printer cyan nozzle tip', (.37,.015,1.014),.038,.014,'cyan')
box('Right carriage support crosslink', (.61,.29,1.348), (.20,.18,.09), 'steel', .008)
box('Right gantry amber alignment clamp', (.385,.123,1.366), (.12,.037,.13), 'amber', .008)
cylinder('Carriage front service fastener', (.37,-.142,1.48),.033,.017,'bolt',(0,1,0),6)

# Left control tower and independent removable power case, with actual connector.
box('Left control pod case', (-.98,-.025,.36), (.32,.59,.72), 'slate', .047)
box('Left control pod top inset', (-.98,-.045,.725), (.23,.42,.025), 'steel', .015)
box('Left control pod display face', (-.98,-.326,.386), (.215,.020,.42), 'dark', .015)
box('Left control pod inner face', (-.98,-.340,.386), (.158,.016,.345), 'steel', .012)
box('Left control pod cyan indicator', (-.98,-.351,.409), (.047,.011,.215), 'cyan', .008)
case_x=1.095
box('Separate power case outer frame', (case_x,.04,.39), (.45,.63,.78), 'slate', .048)
box('Separate power case front inset', (case_x,-.286,.38), (.315,.027,.565), 'steel', .020)
box('Separate power case side inset', (1.328,.06,.38), (.023,.42,.55), 'steel', .021)
box('Separate power case lid ivory panel', (case_x,.018,.789), (.325,.49,.04), 'ivory', .012)
for x in (.923,1.267):
    box('Power case amber lid keeper', (x,.018,.793), (.036,.46,.048), 'amber', .008)
box('Power case amber front latch', (case_x,-.315,.62), (.17,.054,.09), 'amber', .013)
box('Power case latch tongue', (case_x,-.348,.588), (.08,.028,.07), 'dark', .006)
for x in (.988,1.202):
    box('Power case carry handle riser',(x,.065,.84),(.038,.047,.091),'dark',.006)
box('Power case carry handle grip',(case_x,.065,.887),(.248,.054,.044),'steel',.007)
link('Rear power umbilical', (.80,.35,.30),(.96,.36,.31),.037,'dark')
for x in (.80,.95):
    cylinder('Rear power plug coupling',(x,.35,.305),.053,.045,'amber',(1,0,0))

# Rear maintenance is resolved, restrained, and visibly connected to both pillars.
box('Rear service inset', (0,.492,.375), (.80,.018,.24), 'slate', .012)
for x in (-.24,-.12,0,.12,.24):
    box('Rear vertical heat vent', (x,.506,.38), (.043,.015,.16), 'dark', .004)
box('Rear gantry cable raceway', (-.705,.478,1.20), (.079,.054,.82), 'slate', .010)
link('Rear head feed upper',(-.52,.50,1.61),(.31,.50,1.61),.026,'dark')
link('Rear head feed down',(.31,.50,1.61),(.37,.22,1.44),.026,'dark')
for x in (-.60,.60):
    for z in (.25,.53):
        cylinder('Front armor captive screw',(x,-.532,z),.014,.010,'joint',(0,1,0),6)
for x in (.974,1.216):
    for z in (.15,.52):
        cylinder('Power case front screw',(x,-.306,z),.015,.012,'bolt',(0,1,0),6)

# Marker stays a named EMPTY through export; craft output can be mounted/removed.
anchor = bpy.data.objects.new('CraftOutputAnchor', None)
bpy.context.collection.objects.link(anchor)
anchor.location = (0,-.07,.553)
anchor.empty_display_type = 'PLAIN_AXES'
anchor.empty_display_size=.13
anchor['purpose'] = 'Mount replaceable crafted item; empty workstation by default'
anchor['front_glTF'] = '+Z'
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
blend_path=out/'matter-fabricator-editable.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

def join_at_pivot(objects, name, pivot):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=name
    bpy.context.scene.cursor.location=pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj

carriage_names={'Print carriage on horizontal track','Print carriage upper saddle','Carriage front service fastener','Print carriage telescoping actuator'}
nozzle_names={'Print head ivory tool collar','Print head faceted dark barrel','Printer tapered deposition nozzle','Printer cyan nozzle tip'}
carriage_parts=[obj for obj in parts if obj.name in carriage_names]
nozzle_parts=[obj for obj in parts if obj.name in nozzle_names]
shell_parts=[obj for obj in parts if obj.name not in carriage_names|nozzle_names]
shell=join_at_pivot(shell_parts,'MatterFabricatorStructure',(0,0,0))
carriage=join_at_pivot(carriage_parts,'FabricatorCarriage',(.37,.015,1.48))
nozzle=join_at_pivot(nozzle_parts,'FabricatorNozzle',(.37,.015,1.289))
world=nozzle.matrix_world.copy()
nozzle.parent=carriage
nozzle.matrix_world=world
carriage['motion']='local X translation: -0.10 to +0.04 meters relative to rest'
nozzle['motion']='local Y translation in glTF: -0.25 to 0 meters relative to rest'
nozzle['minimumTipHeight']=.754
carriage['statusPanelClearance']='Do not travel beyond stated range; fixed panel occupies left track'
bpy.ops.export_scene.gltf(filepath=str(out/'matter-fabricator.glb'), export_format='GLB',
                          export_materials='EXPORT', export_yup=True, export_extras=True)
glb=out/'matter-fabricator.glb'
manifest = {
    'method':'Reviewed reference hard-surface reconstruction; no image-to-3D run',
    'reference':'../../overnight-crafting-target/stations-v1.png',
    'referenceReviewer':'root; reference author crafting_targets',
    'modelReview':'Pending independent root visual judgment; no admission claimed',
    'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),
    'fileBytes':glb.stat().st_size,
    'editableSource':blend_path.name,
    'front':'+Z in glTF, -Y in Blender',
    'units':'meters; grounded at Y=0 in glTF',
    'outputMount':'CraftOutputAnchor; separate empty at tray height, no fused tool',
    'materialCount':1,'textureSize':[256,256],
    'sourcePartCount':len(parts),
    'triangles':sum(len(f.vertices)-2 for obj in (shell,carriage,nozzle) for f in obj.data.polygons),
    'runtimeMeshCount':3,
    'motionNodes':{
        'FabricatorCarriage':{'axis':'local X','deltaRangeMeters':[-.10,.04],'restPositionGLTF':[.37,1.48,-.015]},
        'FabricatorNozzle':{'parent':'FabricatorCarriage','axis':'local Y (glTF)','deltaRangeMeters':[-.25,0],'restPositionGLTF':[0,-.191,0]},
    },
}
(out/'build-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
