"""Reproducible V4 Verdant rocks: connected clipped geological masses.

Run with Blender 4.5 --background --threads 2 --python this.py --
  --output-dir art/source/verdant-cliff-kit-v1/candidate-v4
  --render-dir .dream-loop/verdant-cliff-kit-v1/render-v4
All exports are grounded metres, Y-up, static, with one embedded opaque palette.
"""
import argparse
import hashlib
import json
import math
import random
import shutil
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--output-dir', required=True)
parser.add_argument('--render-dir', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
OUT = Path(args.output_dir).resolve()
RENDER = Path(args.render_dir).resolve()
for directory in (OUT, RENDER):
    if directory.exists():
        raise RuntimeError('Use fresh candidate/evidence directories; preserve earlier studies.')
    directory.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# Values are source sRGB byte swatches. Generated-image pixels must receive
# normalized bytes exactly once; do not apply a second linearization here.
PALETTE = [
    (108, 106, 102), (118, 113, 107), (128, 119, 109), (136, 126, 115),
    (142, 132, 120), (149, 139, 126), (154, 143, 130), (157, 147, 133),
    (77, 80, 79), (88, 89, 85), (98, 96, 89), (107, 101, 92),
    (87, 92, 70), (99, 101, 76), (113, 111, 83), (122, 118, 91),
]
atlas = bpy.data.images.new('Verdant cliff matte palette', width=256, height=256, alpha=False)
atlas.pixels.foreach_set([v for y in range(256) for x in range(256)
                         for v in (*[c / 255 for c in PALETTE[(y // 64) * 4 + x // 64]], 1)])
atlas.filepath_raw = str(OUT / 'verdant-cliff-palette.png')
atlas.file_format = 'PNG'
atlas.save()
atlas.pack()
material = bpy.data.materials.new('Verdant cliff matte stone')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = 1
bsdf.inputs['Metallic'].default_value = 0
bsdf.inputs['Specular IOR Level'].default_value = 0
tex = material.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = atlas
tex.interpolation = 'Closest'
material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])


def hull_descriptor(points):
    bm = bmesh.new()
    center_x=(min(p[0] for p in points)+max(p[0] for p in points))*.5
    center_y=(min(p[1] for p in points)+max(p[1] for p in points))*.5
    for point in points:
        # Small deliberate envelope allowance covers shallow surface facets;
        # scale height about ground so the runtime hull stays planted at zero.
        bm.verts.new((center_x+(point[0]-center_x)*1.035,
                      center_y+(point[1]-center_y)*1.035,point[2]*1.025))
    result = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
    used = {v for f in bm.faces for v in f.verts}
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v not in used], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    descriptor = {
        'shape': 'convexHull', 'offset': {'x': 0, 'y': 0, 'z': 0},
        'vertices': [round(a, 6) for v in bm.verts for a in (v.co.x, v.co.z, -v.co.y)],
        'indices': [v.index for face in bm.faces for v in face.verts],
    }
    bm.free()
    assert len(descriptor['vertices']) <= 192 and len(descriptor['indices']) <= 372
    return descriptor


def block(name, corners, bevel, seed, moss=False):
    """Authored convex mass with irregular intermediate silhouette points.

    One small bevel clips corners. Original broad planes own their colour;
    coplanar export triangles share that colour, without radiating painted fans.
    A selected stone face may contain a flush, terminating lichen colour patch.
    """
    bm = bmesh.new()
    for point in corners:
        bm.verts.new(point)
    bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.dissolve_limit(bm, angle_limit=.025, verts=list(bm.verts), edges=list(bm.edges))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1,
                   affect='EDGES', clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    vertices = [tuple(v.co) for v in bm.verts]
    faces, tones = [], []
    # One actual flush patch on a front-facing lower break, never a ribbon.
    eligible=[f for f in bm.faces if f.normal.y < -.30 and f.normal.z < .55
              and f.calc_area() > .22 and f.calc_center_median().z < 1.65]
    patch_face=max(eligible,key=lambda f:f.calc_area(),default=None) if moss else None
    for face in bm.faces:
        indices=[v.index for v in face.verts]
        n=face.normal
        if n.z > .64:
            tone=5 if n.y < 0 else 6
        elif n.z > .26:
            tone=3 if n.x > -.2 else 2
        elif n.z < -.22:
            tone=8 if n.y < .3 else 9
        elif n.x < -.40:
            tone=9
        elif n.y > .45:
            tone=0
        elif n.x > .45:
            tone=2
        else:
            tone=1
        if face == patch_face:
            center=face.calc_center_median()
            # Move toward the interior side of the block rather than its lip.
            center=center.lerp(face.verts[-1].co,.10)
            radius=min(.30,(.12/max(face.calc_area(),.01))**.5)
            inner=[]
            for point in face.verts:
                inner.append(len(vertices))
                vertices.append(tuple(center.lerp(point.co,radius)))
            for i in range(len(indices)):
                faces.append([indices[i],indices[(i+1)%len(indices)],inner[(i+1)%len(indices)],inner[i]])
                tones.append(tone)
            faces.append(inner)
            tones.append(13)
        else:
            faces.append(indices)
            tones.append(tone)
    bm.free()
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.materials.append(material)
    mesh.update()
    uv=mesh.uv_layers.new(name='Palette')
    for polygon,tone in zip(mesh.polygons,tones):
        polygon.use_smooth=False
        for loop in polygon.loop_indices:
            uv.data[loop].uv=((tone%4+.5)/4,(tone//4+.5)/4)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return obj,corners


def build_model(name, specs):
    parts, points, chunk_hulls = [], [], []
    for index, (label, corners, bevel, moss) in enumerate(specs):
        obj, raw = block(label, corners, bevel, 417 + index * 139, moss)
        parts.append(obj)
        points.extend(raw)
        chunk_hulls.append({'name': label, 'collider': hull_descriptor(raw)})
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    model = bpy.context.object
    model.name = name
    model.data.name = name + ' mesh'
    return model, hull_descriptor(points), chunk_hulls


# Each solid has a different authored silhouette. Intermediate points create
# broad diagonal fractures instead of surface colour pretending to be geometry.
TOE = [
    ('Toe connected main shoulder', [(-1.58,-.80,0),(.50,-.93,0),(.65,.75,0),(-1.34,.86,0),
        (-1.25,-.61,1.28),(.27,-.60,1.50),(.48,.59,1.48),(-1.08,.81,1.30),
        (-1.73,-.68,.42),(-1.36,-.94,.69),(.54,-.81,.90)], .085, False),
    ('Toe joined offset right shoulder', [(-.25,-.81,0),(1.75,-.61,0),(1.48,.86,0),(-.21,.79,0),
        (.08,-.45,1.13),(1.16,-.36,.96),(1.33,.61,1.10),(.10,.74,1.25),
        (1.71,-.54,.46),(1.47,.74,.47)], .10, False),
    ('Toe integral foreground ledge', [(-1.12,-1.06,0),(.73,-1.04,0),(.68,-.24,0),(-1.06,-.14,0),
        (-.91,-.83,.79),(.50,-.86,.58),(.63,-.20,.80),(-.86,-.08,.99),
        (-1.20,-.99,.29)], .065, True),
]
BUTTRESS = [
    ('Buttress thick irregular rear ridge', [(-1.53,-.14,0),(1.72,-.12,0),(1.65,1.30,0),(-1.46,1.29,0),
        (-.85,.19,3.16),(1.14,.08,3.34),(1.23,1.02,3.49),(-.98,1.14,3.28),
        (-1.51,1.45,1.38),(1.76,.83,1.58),(-.38,-.23,2.34),(.94,-.29,1.10)], .11, False),
    ('Buttress lower offset shoulder', [(-1.94,-.55,0),(-.04,-.55,0),(.12,.86,0),(-1.72,.97,0),
        (-1.46,-.31,2.66),(-.35,-.40,2.74),(-.08,.68,2.91),(-1.48,.79,2.95),
        (-1.92,-.43,1.28),(-.08,-.43,1.44)], .095, False),
    ('Buttress broad diagonal foreground stratum', [(-1.98,-1.10,0),(.95,-1.09,0),(.79,-.04,0),(-1.70,.21,0),
        (-1.66,-.72,1.73),(.74,-.83,1.11),(.66,-.03,1.68),(-1.48,.17,2.04),
        (-1.88,-1.12,.77),(.98,-.78,.34)], .105, True),
    ('Buttress overlapping upper step', [(-1.73,-.76,.83),(.29,-.77,.83),(.24,.19,.96),(-1.53,.37,1.05),
        (-1.57,-.51,2.20),(.04,-.48,1.87),(.10,.15,2.08),(-1.32,.32,2.35),
        (-1.67,-.70,1.56)], .075, False),
    ('Buttress right descending root', [(.43,-.76,0),(1.94,-.65,0),(1.91,.90,0),(.51,.96,0),
        (.73,-.36,2.28),(1.53,-.33,1.85),(1.59,.75,2.18),(.55,.80,2.51),
        (1.96,-.38,.76),(1.36,-.66,1.23)], .095, False),
]
LEDGE = [
    ('Ledge broad sloping rock support', [(-1.35,-.97,0),(1.53,-.91,0),(1.53,1.02,0),(-1.12,1.04,0),
        (-1.48,-.75,1.14),(1.17,-.45,1.52),(1.18,.78,1.89),(-1.07,.91,1.74),
        (-.99,-1.03,.49),(.97,-.84,.93),(-1.36,.41,.71)], .09, True),
    ('Ledge heavy asymmetric projecting shelf', [(-1.55,-1.13,.84),(.69,-1.14,.76),(1.21,.51,1.11),(-1.23,.80,1.29),
        (-1.99,-1.00,1.40),(.77,-1.04,1.59),(1.12,.57,1.89),(-1.43,.76,1.84),
        (-1.92,-1.14,1.19),(.07,-1.27,1.40),(-1.86,-.26,1.63)], .065, False),
    ('Ledge low joined rear crown', [(-.95,.20,0),(1.59,.14,0),(1.46,1.26,0),(-1.02,1.23,0),
        (-.65,.38,2.11),(1.10,.21,2.16),(1.25,1.06,2.29),(-.81,1.14,2.13),
        (1.63,.55,.91),(-.89,1.38,.81)], .08, False),
    ('Ledge right spreading foot', [(.60,-1.02,0),(1.83,-.75,0),(1.68,.55,0),(.54,.55,0),
        (.81,-.72,.94),(1.53,-.50,1.24),(1.54,.36,1.58),(.72,.39,1.47),
        (1.91,-.56,.46)], .085, False),
]

records = []
for name, specifications in [('verdant-cliff-toe', TOE), ('verdant-cliff-buttress', BUTTRESS), ('verdant-cliff-ledge', LEDGE)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    model, collider, chunks = build_model(name, specifications)
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (name + '-editable.blend')))
    glb = OUT / (name + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                              export_yup=True, export_materials='EXPORT', export_animations=False)
    model.data.calc_loop_triangles()
    points = [model.matrix_world @ v.co for v in model.data.vertices]
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    # Bevels should not lift grounded geometry: every model has Z=0 face(s).
    assert abs(low[2]) < .00001
    record = {
        'name': name, 'file': glb.name, 'sha256': hashlib.sha256(glb.read_bytes()).hexdigest(),
        'bytes': glb.stat().st_size, 'triangles': len(model.data.loop_triangles),
        'meshCount': 1, 'materialCount': 1, 'secondaryMasses': len(specifications) - 1,
        'texture': {'embedded': True, 'opaque': True, 'size': [256,256], 'srgbBytePalette': PALETTE},
        'roughness': 1, 'metalness': 0,
        'boundsBlenderMeters': {'min': [round(v,5) for v in low], 'max': [round(v,5) for v in high],
                               'size': [round(high[i]-low[i],5) for i in range(3)]},
        'runtimeCollider': collider,
        'collisionLimitation': 'Single conservative whole-rock hull closes recesses and the ledge underhang; no compound runtime schema or hidden walk-under claim.',
        'studyChunkHulls': chunks,
    }
    (OUT / (name + '-collider.json')).write_text(json.dumps(collider, indent=2), encoding='utf-8')
    records.append(record)
total = sum(r['triangles'] for r in records)
assert total <= 1900, f'Triangle budget exceeded: {total}'
builder = Path(__file__).resolve()
shutil.copy2(builder, OUT / 'build-verdant-cliff-kit.py')
manifest = {
    'assetFamily': 'verdant-cliff-kit-v1 candidate-v4',
    'reference': 'art/targets/verdant-cliff-kit-v1/target.png',
    'referenceSHA256': hashlib.sha256(Path('art/targets/verdant-cliff-kit-v1/target.png').read_bytes()).hexdigest(),
    'builderSHA256': hashlib.sha256(builder.read_bytes()).hexdigest(),
    'targetReview': 'Independent target PASS 8.4; exact V4 exports PENDING independent review',
    'construction': 'Joined broad clipped masses with intermediate silhouette fractures, shared colour within each planar face, and three flush lichen patches; no triangular colour fans or loose strips.',
    'orientation': 'Grounded Blender metres Z-up; GLB Y-up; collider (x,z,-y)',
    'totalTriangles': total, 'assets': records,
}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print('EXPORT_SUMMARY ' + json.dumps({r['name']: {'triangles':r['triangles'], 'colliderVertices':len(r['runtimeCollider']['vertices'])//3} for r in records}), flush=True)


def look(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z','Y').to_euler()


def imported_model(path, location):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before and o.parent is None]
    for obj in new:
        obj.location += Vector(location)
    return new


def render(filename, position, target, scale, dimensions):
    cam.location = position
    cam.data.ortho_scale = scale
    look(cam,target)
    scene.render.resolution_x,scene.render.resolution_y = dimensions
    scene.render.filepath = str(RENDER / filename)
    bpy.ops.render.render(write_still=True)
    views.append({'file':filename, 'dimensions':dimensions, 'cameraPosition':position,
                  'cameraTarget':target,'orthoScale':scale,
                  'sha256':hashlib.sha256((RENDER / filename).read_bytes()).hexdigest()})


# Render ONLY reimported final GLB bytes, not the editable Blender source.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
world = bpy.data.worlds.new('Neutral review ambient')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.68,.70,.72,1)
world.node_tree.nodes['Background'].inputs[1].default_value = .8
scene.world = world
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.018))
floor = bpy.context.object
floor_mat = bpy.data.materials.new('Neutral review floor')
floor_mat.use_nodes = True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.55,.57,.59,1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
floor.data.materials.append(floor_mat)
for label,pos,energy,size in [('Key',(-5,-7,10),800,7),('Fill',(6,-3,7),470,6),('Backfill',(0,6,8),650,7)]:
    bpy.ops.object.light_add(type='AREA', location=pos)
    light = bpy.context.object
    light.name = label
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    look(light,(0,0,1.5))
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = 'ORTHO'
scene.camera = cam
views = []
family = []
for record,position in zip(records,[(-4.50,0,0),(0,0,0),(4.65,0,0)]):
    family.extend(imported_model(OUT / record['file'],position))
render('family-front3q.png',(4.5,-24,10),(0,0,1.55),14.1,(1280,640))
render('family-back3q.png',(-4.5,24,10),(0,0,1.55),14.1,(1280,640))
for obj in family:
    obj.hide_render = True
for record in records:
    current = imported_model(OUT / record['file'],(0,0,0))
    height = record['boundsBlenderMeters']['size'][2]
    scale = max(4.35,height + .65)
    render(record['name'] + '-front.png',(4.0,-10,5.2),(0,0,height*.48),scale,(640,640))
    render(record['name'] + '-back.png',(-4.0,10,5.2),(0,0,height*.48),scale,(640,640))
    for obj in current:
        bpy.data.objects.remove(obj,do_unlink=True)
receipt = {
    'source':'Fresh exported GLBs reimported into neutral Blender scene',
    'engine':'Cycles CPU','threads':2,'samples':8,'viewTransform':'Standard',
    'lighting':'Neutral world 0.8 plus large key/fill/backfill; no black rear-face concealment',
    'modelHashes':{r['file']:r['sha256'] for r in records}, 'views':views,
    'status':'PENDING independent exact-export visual review; no runtime registration',
}
(RENDER / 'render-evidence.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print('BUILD_AND_RENDER_COMPLETE ' + str(total),flush=True)
