"""Map manually identified Mossling eye pixels from the V3 texture to body faces.

The source texture has no eye mask. This tool deliberately accepts visually
identified pixels instead of guessing from shared brown/cream palette colours.
It reports every matching UV face with its rest-space point, normal, and the
source vertex weights needed to keep an overlay in the same skin space.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--pixel', action='append', required=True,
                        help='named texture pixel: name,x,y (origin top-left)')
    values = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return parser.parse_args(values)


def barycentric(point, a, b, c):
    edge0, edge1, relative = b - a, c - a, point - a
    determinant = edge0.x * edge1.y - edge1.x * edge0.y
    if abs(determinant) < 1e-10:
        return None
    beta = (relative.x * edge1.y - edge1.x * relative.y) / determinant
    gamma = (edge0.x * relative.y - relative.x * edge0.y) / determinant
    alpha = 1.0 - beta - gamma
    if min(alpha, beta, gamma) < -1e-6:
        return None
    return (alpha, beta, gamma)


def main():
    opt = parse()
    requested = []
    for raw in opt.pixel:
        name, x, y = raw.split(',')
        requested.append((name, float(x), float(y)))
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(Path(opt.input).resolve()))
    body = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent and obj.parent.type == 'ARMATURE')
    mesh, uv_layer = body.data, body.data.uv_layers.active.data
    out = {'input': str(Path(opt.input).resolve()), 'body': body.name, 'pixels': []}
    for name, x, y in requested:
        point = Vector(((x + .5) / 1024.0, 1.0 - (y + .5) / 1024.0))
        hits = []
        for polygon in mesh.polygons:
            if len(polygon.loop_indices) != 3:
                continue
            loops = polygon.loop_indices
            uv = [Vector(uv_layer[index].uv) for index in loops]
            weights = barycentric(point, *uv)
            if weights is None:
                continue
            verts = [mesh.vertices[mesh.loops[index].vertex_index] for index in loops]
            location = sum((vertex.co * weight for vertex, weight in zip(verts, weights)), Vector())
            normal = sum((vertex.normal * weight for vertex, weight in zip(verts, weights)), Vector()).normalized()
            groups = {}
            for vertex, weight in zip(verts, weights):
                for group in vertex.groups:
                    group_name = body.vertex_groups[group.group].name
                    groups[group_name] = groups.get(group_name, 0) + group.weight * weight
            hits.append({'polygon': polygon.index, 'vertices': [vertex.index for vertex in verts],
                         'barycentric': [round(weight, 8) for weight in weights],
                         'restPoint': [round(value, 8) for value in location],
                         'restNormal': [round(value, 8) for value in normal],
                         'weights': {key: round(value, 8) for key, value in sorted(groups.items()) if value > 1e-5}})
        out['pixels'].append({'name': name, 'pixel': [x, y], 'uv': [round(point.x, 8), round(point.y, 8)], 'hits': hits})
    Path(opt.output).write_text(json.dumps(out, indent=2), encoding='utf-8')
    print(json.dumps(out, indent=2))


if __name__ == '__main__': main()
