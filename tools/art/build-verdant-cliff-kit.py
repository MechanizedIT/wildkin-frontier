"""Reproducible V3 Verdant rocks: clipped irregular blocks, not tapered rings.

Run with Blender 4.5 --background --threads 2 --python this.py --
  --output-dir art/source/verdant-cliff-kit-v1/candidate-v3
  --render-dir .dream-loop/verdant-cliff-kit-v1/render-v3
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
from mathutils.geometry import delaunay_2d_cdt

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
    (115, 112, 106), (120, 117, 110), (126, 122, 115), (132, 127, 119),
    (139, 131, 121), (143, 135, 124), (148, 139, 128), (153, 144, 133),
    (84, 87, 86), (95, 97, 93), (105, 104, 97), (117, 114, 104),
    (101, 102, 82), (113, 111, 88), (124, 119, 95), (135, 128, 103),
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
    """Eight deliberately authored irregular corners clipped with one bevel.

    The convex block can have tilted planes and strongly offset top corners.
    Large surviving faces get one shallow off-centre facet, not subdivision.
    No ring levels, rotational polygon footprint, ribbons or added green meshes.
    """
    rng = random.Random(seed)
    bm = bmesh.new()
    for point in corners:
        bm.verts.new(point)
    bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    # Coplanar source triangles become large stone planes before clipping.
    bmesh.ops.dissolve_limit(bm, angle_limit=.015, verts=list(bm.verts), edges=list(bm.edges))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1,
                   affect='EDGES', clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    vertices = [tuple(v.co) for v in bm.verts]
    faces = []
    for face in bm.faces:
        indices = [v.index for v in face.verts]
        if face.calc_area() > .32 and face.normal.z > -.65:
            # Triangulate a bounded set of well-spaced planar points. A long
            # cliff wall must not become a radiating fan of needle triangles.
            center = face.calc_center_median()
            axis = max(face.edges, key=lambda e:e.calc_length())
            u = (axis.verts[1].co-axis.verts[0].co).normalized()
            v = face.normal.cross(u).normalized()
            planar = [Vector(((p.co-center).dot(u),(p.co-center).dot(v))) for p in face.verts]
            edge_ids = [(i,(i+1)%len(planar)) for i in range(len(planar))]
            def inside(point):
                signs=[]
                for a,b in edge_ids:
                    delta=planar[b]-planar[a]
                    cross=delta.x*(point.y-planar[a].y)-delta.y*(point.x-planar[a].x)
                    if abs(cross)/max(delta.length,.0001) < .15:
                        return False
                    signs.append(cross>0)
                return all(signs) or not any(signs)
            lo=[min(p[i] for p in planar) for i in range(2)]
            hi=[max(p[i] for p in planar) for i in range(2)]
            step=.57
            nx=max(1,int((hi[0]-lo[0])/step))
            ny=max(1,int((hi[1]-lo[1])/step))
            interior=[]
            for ix in range(nx):
                for iy in range(ny):
                    p=Vector((lo[0]+(ix+.50+rng.uniform(-.15,.15))*(hi[0]-lo[0])/nx,
                              lo[1]+(iy+.50+rng.uniform(-.15,.15))*(hi[1]-lo[1])/ny))
                    if inside(p):
                        interior.append(p)
            if not interior:
                interior=[Vector((0,0))]
            coords,_,triangles,_,_,_=delaunay_2d_cdt(planar+interior,edge_ids,[],0,.00001)
            local_ids=[]
            for p in coords:
                boundary=next((i for i,q in enumerate(planar) if (p-q).length<.00001),None)
                if boundary is not None:
                    local_ids.append(indices[boundary])
                else:
                    local_ids.append(len(vertices))
                    vertices.append(tuple(center+u*p.x+v*p.y+face.normal*rng.uniform(.005,.018)))
            for triangle in triangles:
                ids=[local_ids[i] for i in triangle]
                a,b,c=[Vector(vertices[i]) for i in ids]
                if (b-a).cross(c-a).dot(face.normal)<0:
                    ids.reverse()
                faces.append(ids)
        else:
            faces.append(indices)
    bm.free()
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    mesh.update()
    uv = mesh.uv_layers.new(name='Palette')
    for polygon in mesh.polygons:
        polygon.use_smooth = False
        n = polygon.normal
        # Each plane owns restrained colour variation, independent of Z bands.
        if n.z > .67:
            tone = rng.choice([4, 5, 5, 6, 6, 7])
        elif n.z < -.25:
            tone = rng.choice([8, 9, 10, 0])
        else:
            tone = rng.choice([0, 1, 1, 2, 2, 3, 4])
        # Optional sparse lichen is a real stone face colour, never an insert.
        if moss and polygon.center.z < 1.15 and n.z > -.1 and rng.random() < .035:
            tone = rng.choice([12, 13, 14])
        for loop in polygon.loop_indices:
            uv.data[loop].uv = ((tone % 4 + .5) / 4, (tone // 4 + .5) / 4)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj, corners


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


# Corners are bottom front-left/right, back-right/left, followed by four
# corresponding top corners. They deliberately do not form repeated rings.
TOE = [
    ('Toe main broken shoulder', [(-1.55,-.72,0),(.25,-.83,0),(.45,.73,0),(-1.31,.80,0),
        (-1.27,-.57,1.12),(.18,-.62,1.40),(.35,.65,1.37),(-1.05,.77,1.22)], .16, False),
    ('Toe offset right block', [(-.05,-.63,0),(1.59,-.63,0),(1.36,.69,0),(.10,.65,0),
        (.20,-.37,1.00),(1.06,-.39,.89),(1.13,.50,.97),(.34,.61,1.09)], .19, True),
    ('Toe forward chipped step', [(-.74,-1.00,0),(.47,-1.01,0),(.60,-.43,0),(-.80,-.37,0),
        (-.61,-.88,.64),(.30,-.85,.55),(.44,-.30,.68),(-.73,-.31,.75)], .095, True),
    ('Toe low left foot', [(-1.72,-.75,0),(-.95,-.87,0),(-.83,.11,0),(-1.61,.18,0),
        (-1.60,-.67,.36),(-1.11,-.75,.56),(-1.07,.14,.74),(-1.47,.27,.55)], .09, False),
]
BUTTRESS = [
    ('Buttress offset rear crown', [(-.20,-.02,0),(1.24,-.18,0),(1.25,.85,0),(-.34,1.01,0),
        (-.36,.12,3.65),(1.08,.02,3.78),(.99,.77,3.87),(-.44,.89,3.68)], .15, False),
    ('Buttress left blunt shoulder', [(-1.45,-.61,0),(-.13,-.58,0),(-.02,.72,0),(-1.42,.81,0),
        (-1.05,-.31,3.20),(-.23,-.39,3.16),(-.14,.62,3.28),(-1.20,.70,3.37)], .14, False),
    ('Buttress broad diagonal foreground stratum', [(-1.49,-1.00,0),(.86,-1.07,0),(.73,-.22,0),(-1.34,.02,0),
        (-1.41,-.69,1.83),(.72,-.84,1.13),(.62,-.15,1.61),(-1.26,-.08,2.11)], .14, True),
    ('Buttress upper interlocking step', [(-1.27,-.75,1.11),(.23,-.80,.92),(.26,.02,1.25),(-1.18,.10,1.48),
        (-1.29,-.56,2.48),(.13,-.54,2.02),(.10,.08,2.29),(-1.09,.13,2.61)], .115, True),
    ('Buttress descending right block', [(.57,-.71,0),(1.64,-.46,0),(1.51,.70,0),(.55,.65,0),
        (.78,-.39,2.56),(1.45,-.29,2.34),(1.36,.66,2.48),(.63,.61,2.75)], .15, True),
]
LEDGE = [
    ('Ledge offset diagonal support', [(-1.04,-.47,0),(.90,-.78,0),(1.05,.63,0),(-.87,.74,0),
        (-.63,-.34,1.29),(.95,-.50,1.38),(.79,.56,1.62),(-.78,.63,1.50)], .14, True),
    ('Ledge projecting sloped slab', [(-1.47,-.90,.96),(.74,-.99,.76),(1.02,.37,1.09),(-1.21,.56,1.17),
        (-1.72,-1.04,1.58),(.85,-1.06,1.65),(1.05,.43,1.95),(-1.32,.65,1.85)], .095, False),
    ('Ledge planted high right abutment', [(.60,-.26,0),(1.62,-.38,0),(1.53,.79,0),(.37,.82,0),
        (.53,-.06,2.36),(1.30,-.07,2.21),(1.30,.69,2.33),(.32,.72,2.52)], .135, False),
    ('Ledge right low broken foot', [(.88,-.78,0),(1.66,-.62,0),(1.56,.17,0),(.85,.12,0),
        (.88,-.69,.70),(1.49,-.53,.91),(1.51,.08,1.22),(.86,.04,1.06)], .10, True),
    ('Ledge rear fractured shoulder', [(-.90,.29,0),(.45,.27,0),(.43,1.03,0),(-1.04,.96,0),
        (-.81,.30,1.95),(.44,.24,2.15),(.28,.92,2.10),(-.95,.88,1.89)], .115, False),
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
    'assetFamily': 'verdant-cliff-kit-v1 candidate-v3',
    'reference': 'art/targets/verdant-cliff-kit-v1/target.png',
    'referenceSHA256': hashlib.sha256(Path('art/targets/verdant-cliff-kit-v1/target.png').read_bytes()).hexdigest(),
    'builderSHA256': hashlib.sha256(builder.read_bytes()).hexdigest(),
    'targetReview': 'Independent target PASS 8.4; exact V3 exports PENDING independent review',
    'construction': 'Individually authored clipped asymmetric blocks, broad diagonal strata and bounded planar triangulation; no tapered ring mesh, loose strip, micro-noise or subdivision.',
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
for record,position in zip(records,[(-4.15,0,0),(0,0,0),(4.20,0,0)]):
    family.extend(imported_model(OUT / record['file'],position))
render('family-front3q.png',(4.5,-24,10),(0,0,1.70),13.1,(1280,640))
render('family-back3q.png',(-4.5,24,10),(0,0,1.70),13.1,(1280,640))
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
