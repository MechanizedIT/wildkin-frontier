"""Reconstruct the reviewed Resonance Bench study; editable source + compact GLB.

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
    raise ValueError('Refusing to overwrite an existing resonance study')
out.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

colors = {
    'ivory': (226, 211, 182), 'edge': (248, 231, 199),
    'slate': (48, 59, 73), 'steel': (82, 96, 109),
    'dark': (30, 39, 47), 'tray': (48, 81, 85),
    'amber': (240, 155, 46), 'cyan': (67, 224, 234),
    'bolt': (134, 145, 146), 'joint': (122, 119, 109),
    'blue': (44, 110, 166), 'black': (22, 28, 32),
    'violet': (133, 70, 204), 'lilac': (187, 114, 241), 'crystal_light': (211, 157, 252),
}
atlas = bpy.data.images.new('resonance-palette-256', width=256, height=256, alpha=False)
palette = list(colors.values()) + [(226, 211, 182)] * (16-len(colors))
pixels = []
for y in range(256):
    for x in range(256):
        pixels.extend([c / 255 for c in palette[(y // 64) * 4 + x // 64]] + [1])
atlas.pixels.foreach_set(pixels)
atlas.filepath_raw = str(out / 'resonance-palette.png')
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

def ring(name, radius_outer, radius_inner, z, height, color, n=12):
    vertices=[]
    for zz,r in ((z-height/2,radius_outer),(z+height/2,radius_outer),
                 (z+height/2,radius_inner),(z-height/2,radius_inner)):
        vertices.extend((math.cos(i*math.tau/n)*r, math.sin(i*math.tau/n)*r,zz) for i in range(n))
    faces=[]
    for band in range(4):
        for i in range(n):
            faces.append((band*n+i,band*n+(i+1)%n,((band+1)%4)*n+(i+1)%n,((band+1)%4)*n+i))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    return finish(ob,name,color)

# A broad twelve-sided base; raised work deck and four visibly grounded feet.
cylinder('Lower slate chassis',(0,0,.18),.61,.27,'slate',vertices=12)
cylinder('Ivory segmented work deck',(0,0,.393),.69,.215,'ivory',vertices=12)
cylinder('Dark underside deck reveal',(0,0,.271),.655,.038,'dark',vertices=12)
for x in (-.47,.47):
    for y in (-.40,.40):
        foot=prism('Splayed grounded foot',[(x-.12,0),(x+.12,0),(x+.095,.18),(x-.075,.22)],y-.16,y+.16,'slate',.017)
        box('Foot face inset',(x,y-.171,.085),(.16,.016,.045),'steel',.007)
        box('Foot ankle collar',(x,y,.216),(.20,.20,.12),'steel',.018)

# The crystal is seated in a fitted socket, with a violet insulating ring.
cylinder('Reactor well dark inset',(0,0,.515),.458,.055,'dark',vertices=12)
ring('Outer twelve-segment reactor crown',.454,.315,.559,.084,'steel')
ring('Violet annular insulator',.346,.293,.596,.020,'violet')
for i in range(3):
    angle=i*math.tau/3
    marker=box('Rotor cyan phase index',(math.cos(angle)*.384,math.sin(angle)*.384,.607),(.068,.025,.012),'cyan',0)
    marker.rotation_euler[2]=angle
cylinder('Crystal socket plinth',(0,0,.599),.28,.07,'slate',vertices=8)
cylinder('Crystal socket bevel cap',(0,0,.641),.237,.026,'steel',vertices=8)
for i in range(8):
    angle=i*math.tau/8
    x,y=math.cos(angle)*.246,math.sin(angle)*.246
    obj=box('Radial crystal retaining clamp',(x,y,.642),(.104,.092,.060),'slate',.012)
    obj.rotation_euler[2]=angle
    cylinder('Radial clamp fastener',(x,y,.679),.013,.010,'bolt',vertices=6)

# Deliberate irregular crystal facets, maintaining a single connected solid.
crystal_vertices=[]
for z,rx,ry,offset in ((.647,.124,.118,0),(.735,.189,.162,.06),(.875,.145,.131,-.03),(.995,.064,.068,.09)):
    for i in range(6):
        a=i*math.tau/6+offset
        crystal_vertices.append((math.cos(a)*rx,math.sin(a)*ry,z))
crystal_vertices.append((.012,-.009,1.046))
crystal_faces=[tuple(reversed(range(6)))]
for row in range(3):
    for i in range(6):
        a=row*6+i;b=row*6+(i+1)%6;c=(row+1)*6+(i+1)%6;d=(row+1)*6+i
        crystal_faces.extend([(a,b,c),(a,c,d)])
for i in range(6):
    crystal_faces.append((18+i,18+(i+1)%6,24))
mesh=bpy.data.meshes.new('Seated resonance crystal facets')
mesh.from_pydata(crystal_vertices,[],crystal_faces)
mesh.update()
obj=bpy.data.objects.new('Seated resonance crystal',mesh)
bpy.context.collection.objects.link(obj)
finish(obj,'Seated resonance crystal','violet')
for face in mesh.polygons:
    color=['violet','lilac','crystal_light'][face.index%3 if face.center.z>.8 else face.index%2]
    idx=list(colors).index(color)
    for loop_index in face.loop_indices:
        mesh.uv_layers.active.data[loop_index].uv=((idx%4+.5)/4,(idx//4+.5)/4)

# Mirrored fork towers with functional hinges and inward facing resonator pads.
for side in (-1,1):
    x=side*.495
    box('Prong base mounting shoe',(x,.21,.548),(.29,.31,.115),'slate',.025)
    box('Prong ivory hinge base',(x,.22,.623),(.255,.27,.15),'ivory',.016)
    cylinder('Prong faceted hinge drum',(x,.06,.643),.075,.060,'steel',(0,1,0),8)
    cylinder('Prong hinge captive axle',(x,.023,.643),.032,.019,'slate',(0,1,0),6)
    box('Prong twin-rail dark spine',(x,.225,.893),(.155,.145,.43),'slate',.014)
    box('Prong front rail inset',(x,.145,.818),(.072,.016,.195),'steel',.005)
    box('Prong upper armor backing',(x,.226,1.128),(.29,.245,.29),'ivory',.038)
    box('Prong top cap',(x,.225,1.281),(.21,.24,.037),'edge',.009)
    box('Prong inward dark emitter housing',(x-side*.124,.192,1.13),(.072,.25,.30),'dark',.018)
    box('Prong violet resonance strip',(x-side*.165,.174,1.125),(.021,.17,.21),'violet',.008)
    box('Prong front violet status strip',(x,.092,1.118),(.054,.017,.20),'violet',.005)
    box('Prong front slate armored surround',(x-side*.075,.087,1.117),(.038,.020,.25),'slate',.007)
    box('Prong top dark service bridge',(x,.204,1.276),(.132,.258,.047),'steel',.007)
    cylinder('Prong upper armor front screw',(x+side*.09,.094,1.213),.013,.012,'bolt',(0,1,0),6)

# Angled front screen: integral functional control panel, minimal tiny detail.
panel=box('Angled ivory control console',(0,-.564,.493),(.46,.22,.097),'ivory',.019)
panel.rotation_euler[0]=math.radians(28)
bezel=box('Control console dark bezel',(0,-.584,.547),(.352,.152,.015),'slate',.011)
bezel.rotation_euler[0]=math.radians(28)
screen=box('Control console violet display',(-.055,-.591,.558),(.174,.090,.010),'violet',.005)
screen.rotation_euler[0]=math.radians(28)
for y in (-.557,-.601):
    button=box('Control console cyan selector',(.111,y,.566+(.601+y)*.45),(.047,.025,.009),'cyan',.003)
    button.rotation_euler[0]=math.radians(28)
box('Front lower ivory equipment face',(0,-.569,.21),(.37,.090,.13),'ivory',.013)
box('Front lower slate inset',(0,-.619,.21),(.25,.014,.056),'slate',.005)
box('Front lower cyan status bar',(0,-.63,.21),(.20,.010,.026),'cyan',.004)

# Coil is a practical service cable secured to the right-front armor, no ornament.
box('Cable stowage mounting plate',(.535,-.502,.39),(.20,.085,.19),'slate',.012)
box('Cable stowage hook',(.535,-.606,.45),(.084,.145,.14),'steel',.010)
for loop in range(2):
    points=[]
    for i in range(16):
        a=i*math.tau/16
        points.append((.535+math.cos(a)*(.134+loop*.020),-.655-loop*.023,.252+math.sin(a)*.224))
    for i in range(16):
        link('Stowed amber service cable',points[i],points[(i+1)%16],.022,'amber')
link('Cable lower plug neck',(.57,-.717,.048),(.625,-.715,.035),.027,'slate')
cylinder('Cable plug violet identifier',(.625,-.715,.035),.035,.045,'violet',(1,0,0),8)

# Rear access and fasteners give a resolved all-direction silhouette.
for x in (-.37,.37):
    box('Rear upright conduit',(x+math.copysign(.06,x),.311,.741),(.042,.036,.26),'slate',.006)
    link('Rear conduit deck connection',(x+math.copysign(.06,x),.311,.612),(x*.70,.428,.505),.023,'dark')
box('Rear ivory service access',(0,.691,.389),(.37,.06,.16),'edge',.014)
for x in (-.105,-.035,.035,.105):
    box('Rear heat exhaust slit',(x,.728,.39),(.032,.013,.083),'slate',.003)
for angle in (0,math.pi,math.pi/3,2*math.pi/3):
    x,y=.665*math.cos(angle),.665*math.sin(angle)
    cylinder('Deck service captive screw',(x,y,.425),.014,.012,'joint',(math.cos(angle),math.sin(angle),0),6)

anchor=bpy.data.objects.new('CraftOutputAnchor',None)
bpy.context.collection.objects.link(anchor)
anchor.location=(0,0,1.10)
anchor.empty_display_type='PLAIN_AXES'
anchor.empty_display_size=.12
anchor['purpose']='Separate replaceable crafted-output mounting point above seated reactor'
anchor['front_glTF']='+Z'
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:
    ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.wm.save_as_mainfile(filepath=str(out/'resonance-bench-editable.blend'))
def join_at_pivot(objects,name,pivot):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:
        bpy.ops.object.join()
    ob=bpy.context.object
    ob.name=name
    bpy.context.scene.cursor.location=pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return ob
rotor_parts=[ob for ob in parts if ob.name in {'Outer twelve-segment reactor crown','Violet annular insulator'} or ob.name.startswith('Rotor cyan phase index')]
crystal_parts=[ob for ob in parts if ob.name=='Seated resonance crystal']
shell_parts=[ob for ob in parts if ob not in rotor_parts+crystal_parts]
shell=join_at_pivot(shell_parts,'ResonanceBenchStructure',(0,0,0))
rotor=join_at_pivot(rotor_parts,'ResonanceRotor',(0,0,.559))
crystal=join_at_pivot(crystal_parts,'ResonanceCrystal',(0,0,.647))
rotor['motion']='Rotate local Y in glTF, full circle; no lift'
crystal['motion']='Rotate local Y in glTF, full circle; optional local Y lift 0..0.055m from rest'
bpy.ops.export_scene.gltf(filepath=str(out/'resonance-bench.glb'),export_format='GLB',export_materials='EXPORT',export_yup=True,export_extras=True)
glb=out/'resonance-bench.glb'
manifest={'method':'Reviewed reference hard-surface reconstruction; no image-to-3D run',
          'reference':'../../overnight-crafting-target/stations-v1.png',
          'referenceReviewer':'root; author crafting_targets',
          'modelReview':'Pending independent root review; no admission claimed',
          'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'fileBytes':glb.stat().st_size,
          'editableSource':'resonance-bench-editable.blend','front':'+Z glTF / -Y Blender',
          'units':'meters; grounded at Y=0 glTF',
          'outputMount':'CraftOutputAnchor; separate empty. Central seated crystal is integral reactor.',
          'materialCount':1,'textureSize':[256,256],'sourcePartCount':len(parts),
          'triangles':sum(len(f.vertices)-2 for ob in (shell,rotor,crystal) for f in ob.data.polygons),
          'runtimeMeshCount':3,
          'motionNodes':{'ResonanceRotor':{'restPositionGLTF':[0,.559,0],'axis':'local Y rotation','rangeRadians':[0,math.tau]},
                         'ResonanceCrystal':{'restPositionGLTF':[0,.647,0],'axis':'local Y rotation/lift','rotationRangeRadians':[0,math.tau],'liftDeltaRangeMeters':[0,.055]}}}
(out/'build-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))

