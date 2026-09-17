"""Build a V4 Mossling eye overlay from manually inspected V3 texture UV points.

The V3 eyes are paint, not separate geometry. Each V4 overlay point is mapped
through the source body UV triangle and inherits its interpolated joint weights.
That makes the overlay follow the same rest surface and animation deformation.
"""
import argparse
import hashlib
import json
import struct
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


TEXTURE_SIZE = 1024
EYES = (
    # These center/boundary pixels were manually read from the two painted V3
    # eye islands in baseline/eye-uv-crops. They are intentionally not derived
    # from a broad brown/cream colour threshold.
    {'name': 'left', 'center': (493, 55), 'outer': (8, 9)},
    {'name': 'right', 'center': (245, 470), 'outer': (6, 3)},
)


def parse():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output-dir', required=True)
    values = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return parser.parse_args(values)


def material():
    mat = bpy.data.materials.new('wildkin_iris')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    for node in list(nodes): nodes.remove(node)
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = (.12, .72, .69, 1)
    shader.inputs['Roughness'].default_value = .82
    vertex = nodes.new('ShaderNodeVertexColor'); vertex.layer_name = 'COLOR_0'
    # Direct connection is intentional: Blender's glTF exporter then emits
    # COLOR_0. The post-export glTF factor below supplies the default teal;
    # standard glTF multiplies that factor by the white/black vertex colours.
    links.new(vertex.outputs['Color'], shader.inputs['Base Color'])
    links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    return mat


def set_exported_iris_default(glb):
    """Set GLTF's material factor after Blender has emitted COLOR_0."""
    raw = glb.read_bytes(); magic, version, _ = struct.unpack_from('<4sII', raw, 0)
    pos, chunks = 12, []
    while pos < len(raw):
        size, kind = struct.unpack_from('<I4s', raw, pos); pos += 8
        chunks.append((kind, raw[pos:pos + size])); pos += size
    document = json.loads(next(data for kind, data in chunks if kind == b'JSON'))
    iris = next(item for item in document['materials'] if item.get('name') == 'wildkin_iris')
    iris.setdefault('pbrMetallicRoughness', {})['baseColorFactor'] = [.12, .72, .69, 1]
    updated = json.dumps(document, separators=(',', ':')).encode('utf-8')
    updated += b' ' * ((-len(updated)) % 4)
    rebuilt = b''.join(struct.pack('<I4s', len(updated), b'JSON') + updated if kind == b'JSON' else struct.pack('<I4s', len(data), kind) + data for kind, data in chunks)
    glb.write_bytes(struct.pack('<4sII', magic, version, 12 + len(rebuilt)) + rebuilt)


def barycentric(point, a, b, c):
    edge0, edge1, relative = b - a, c - a, point - a
    determinant = edge0.x * edge1.y - edge1.x * edge0.y
    if abs(determinant) < 1e-10: return None
    beta = (relative.x * edge1.y - edge1.x * relative.y) / determinant
    gamma = (edge0.x * relative.y - relative.x * edge0.y) / determinant
    result = (1 - beta - gamma, beta, gamma)
    return result if min(result) >= -1e-6 else None


def mapped_point(body, pixel):
    mesh, uv_data = body.data, body.data.uv_layers.active.data
    uv = Vector(((pixel[0] + .5) / TEXTURE_SIZE, 1 - (pixel[1] + .5) / TEXTURE_SIZE))
    for polygon in mesh.polygons:
        if len(polygon.loop_indices) != 3: continue
        loops = polygon.loop_indices; polygon_uv = [Vector(uv_data[i].uv) for i in loops]
        factors = barycentric(uv, *polygon_uv)
        if factors is None: continue
        vertices = [mesh.vertices[mesh.loops[i].vertex_index] for i in loops]
        point = sum((vertex.co * factor for vertex, factor in zip(vertices, factors)), Vector())
        normal = sum((vertex.normal * factor for vertex, factor in zip(vertices, factors)), Vector()).normalized()
        weights = {}
        for vertex, factor in zip(vertices, factors):
            for group in vertex.groups:
                name = body.vertex_groups[group.group].name
                weights[name] = weights.get(name, 0) + group.weight * factor
        return point + normal * .0015, normal, weights, polygon.index
    raise RuntimeError(f'No V3 body triangle contains manually selected texture pixel {pixel}')


def eye_pixels(eye, radius):
    cx, cy = eye['center']; rx, ry = radius
    return [(round(cx + rx * math.cos(index * math.tau / 8)), round(cy + ry * math.sin(index * math.tau / 8))) for index in range(8)]


def add_geometry(body, armature):
    vertices, faces, colours, vertex_weights, evidence = [], [], [], [], []
    for eye in EYES:
        base = len(vertices)
        samples = eye_pixels(eye, eye['outer']) + [eye['center']]
        normals = []
        for pixel in samples:
            point, normal, weights, polygon = mapped_point(body, pixel)
            vertices.append(tuple(point)); normals.append(normal); vertex_weights.append(weights)
            evidence.append({'eye': eye['name'], 'pixel': pixel, 'polygon': polygon, 'restPoint': [round(x, 8) for x in point], 'weights': {key: round(value, 8) for key, value in sorted(weights.items()) if value > 1e-5}})
        for index in range(8):
            nxt = (index + 1) % 8
            triangles = [(base + index, base + nxt, base + 8)]
            for triangle in triangles:
                a, b, c = (Vector(vertices[item]) for item in triangle)
                reference = sum((normals[item - base] for item in triangle), Vector()).normalized()
                faces.append(triangle if (b - a).cross(c - a).dot(reference) >= 0 else tuple(reversed(triangle)))
        colours.extend([(1, 1, 1, 1)] * 8 + [(0, 0, 0, 1)])
    mesh = bpy.data.meshes.new('mossling_v4_iris_overlay_mesh')
    mesh.from_pydata(vertices, [], faces); mesh.materials.append(material())
    colour = mesh.color_attributes.new(name='COLOR_0', type='FLOAT_COLOR', domain='POINT')
    for index, value in enumerate(colours): colour.data[index].color = value
    overlay = bpy.data.objects.new('mossling_v4_iris_overlay', mesh); bpy.context.collection.objects.link(overlay); overlay.parent = armature
    groups = {}
    for index, weights in enumerate(vertex_weights):
        for name, weight in weights.items():
            if weight > 1e-5:
                if name not in groups: groups[name] = overlay.vertex_groups.new(name=name)
                groups[name].add([index], weight, 'REPLACE')
    modifier = overlay.modifiers.new('Body-correspondent armature', 'ARMATURE'); modifier.object = armature
    return overlay, evidence


def main():
    opt = parse(); source, out = Path(opt.input).resolve(), Path(opt.output_dir).resolve(); out.mkdir(parents=True, exist_ok=False)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False); bpy.ops.import_scene.gltf(filepath=str(source))
    armature = next(item for item in bpy.context.scene.objects if item.type == 'ARMATURE')
    body = next(item for item in bpy.context.scene.objects if item.type == 'MESH' and item.parent == armature)
    for slot in body.material_slots:
        if slot.material: slot.material.name = 'wildkin_body'
    overlay, evidence = add_geometry(body, armature)
    blend = out / 'mossling-v4-eyes.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    glb = out / 'model.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_materials='EXPORT', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1, export_anim_slide_to_zero=True)
    set_exported_iris_default(glb)
    report = {'input': str(source), 'inputSHA256': source_hash, 'output': str(glb), 'outputSHA256': hashlib.sha256(glb.read_bytes()).hexdigest(), 'bodyMaterial': 'wildkin_body', 'overlay': {'object': overlay.name, 'mesh': overlay.data.name, 'vertices': len(overlay.data.vertices), 'triangles': len(overlay.data.polygons), 'material': 'wildkin_iris', 'ringVertexColor': 'white', 'pupilVertexColor': 'black', 'materialDefault': 'teal', 'surfaceCorrespondence': evidence}, 'notes': 'V3 body/texture/rig/actions imported unchanged. Every overlay point was manually selected from eye pixels and mapped through its V3 UV triangle with interpolated body weights.'}
    (out / 'build-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__': main()
