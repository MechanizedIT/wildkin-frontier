"""Build the isolated Mossling V4 iris-overlay candidate from the V3 GLB.

This never writes the source GLB. It preserves the imported rig/actions/body
texture and adds one combined, head-weighted eye mesh with vertex-colored teal
irises and black pupils.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def args():
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
    color = nodes.new('ShaderNodeVertexColor'); color.layer_name = 'COLOR_0'
    shader.inputs['Roughness'].default_value = .82
    shader.inputs['Metallic'].default_value = 0
    links.new(color.outputs['Color'], shader.inputs['Base Color'])
    links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    return mat


def add_eye_geometry(armature):
    # Animal faces -Y. These are deliberately small overlays inside the
    # existing painted brown rim and cream surround, not replacement sclera.
    # Ray probes on V3's actual head surface. Each eye uses that local surface
    # normal rather than one flat -Y plane, which made the far iris float in a
    # three-quarter view.
    centers = ((Vector((-.135, -.631949, .765)), Vector((-.879766, -.455883, .134842))),
               (Vector(( .135, -.628455, .765)), Vector(( .676664, -.734465, .051842))))
    segments, outer_x, outer_z = 8, .052, .043
    inner_x, inner_z = .024, .028
    vertices, faces, colors = [], [], []
    teal, black = (0.12, .72, .69, 1), (.012, .015, .018, 1)
    for center, normal in centers:
        normal.normalize()
        horizontal = Vector((1, 0, 0)) - normal * normal.x
        horizontal.normalize()
        vertical = normal.cross(horizontal); vertical.normalize()
        base = len(vertices)
        # Outer and inner rings curve just enough to read in profile while the
        # z-fighting offset stays below the existing painted outline.
        for ring_x, ring_z, depth in ((outer_x, outer_z, 0), (inner_x, inner_z, -.004)):
            for index in range(segments):
                angle = index * 6.283185307179586 / segments
                point = center + horizontal * (ring_x * __import__('math').cos(angle)) + vertical * (ring_z * __import__('math').sin(angle)) + normal * (.003 + -depth)
                vertices.append(tuple(point))
        vertices.append(tuple(center + normal * .007))
        center = base + segments * 2
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.extend(((base + index, base + nxt, base + segments + nxt), (base + index, base + segments + nxt, base + segments + index)))
            faces.append((base + segments + index, base + segments + nxt, center))
        colors.extend([teal] * segments + [black] * segments + [black])
    mesh = bpy.data.meshes.new('mossling_v4_iris_overlay_mesh')
    mesh.from_pydata(vertices, [], faces); mesh.materials.append(material())
    mesh.color_attributes.new(name='COLOR_0', type='FLOAT_COLOR', domain='POINT')
    for index, value in enumerate(colors): mesh.color_attributes['COLOR_0'].data[index].color = value
    overlay = bpy.data.objects.new('mossling_v4_iris_overlay', mesh)
    bpy.context.collection.objects.link(overlay)
    overlay.parent = armature
    overlay.vertex_groups.new(name='head').add(list(range(len(vertices))), 1.0, 'REPLACE')
    modifier = overlay.modifiers.new('Head-bound armature', 'ARMATURE'); modifier.object = armature
    return overlay


def main():
    opt = args(); source = Path(opt.input).resolve(); out = Path(opt.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=False)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    armature = next(item for item in bpy.context.scene.objects if item.type == 'ARMATURE')
    body = next(item for item in bpy.context.scene.objects if item.type == 'MESH' and item.parent == armature)
    for slot in body.material_slots:
        if slot.material: slot.material.name = 'wildkin_body'
    overlay = add_eye_geometry(armature)
    bpy.context.view_layer.objects.active = overlay; overlay.select_set(True)
    blend = out / 'mossling-v4-eyes.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    glb = out / 'model.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_materials='EXPORT',
                              export_animations=True, export_animation_mode='ACTIONS',
                              export_force_sampling=True, export_frame_step=1, export_anim_slide_to_zero=True)
    report = {'input': str(source), 'inputSHA256': source_hash, 'output': str(glb),
              'outputSHA256': hashlib.sha256(glb.read_bytes()).hexdigest(),
              'overlay': {'object': overlay.name, 'mesh': overlay.data.name, 'vertices': len(overlay.data.vertices), 'triangles': len(overlay.data.polygons), 'material': 'wildkin_iris', 'headBone': 'head'},
              'bodyMaterial': 'wildkin_body', 'notes': 'V3 body texture/rig/actions imported unchanged; iris overlay uses vertex colors teal + black pupil.'}
    (out / 'build-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__': main()
