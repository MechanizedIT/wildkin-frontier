"""EXPERIMENTAL: bake contact-constrained motion on the Mossling-v2 skin.

September 11 v4 passes sole math but FAILS independent visual motion review.
Retained for contact/weighting research, not production asset admission.

Run in Blender with --input <admitted.glb> --output-dir <fresh-directory>.
This anatomy-specific helper preserves the accepted surface, UVs, bind skeleton
and other actions. Blender -Y is forward, +Z up. Independent exported-GLB and
actual-game reviews are required after numeric authoring gates pass.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector

PAWS = ('rear_paw.R', 'front_paw.R', 'rear_paw.L', 'front_paw.L')
FPS = 120
SETTINGS = {
    'Walk': {'seconds': .50, 'speed': .98, 'duty': .65,
             'phase': [0, .25, .5, .75], 'lift': .055, 'crouch': .055,
             'body_bob': .013, 'body_pitch': .028},
    'Run': {'seconds': .35, 'speed': 4.0, 'duty': .24,
            'phase': [.55, 0, .45, .08], 'lift': .095, 'crouch': .080,
            'body_bob': .030, 'body_bob_phase': math.pi, 'body_pitch': .055},
}

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def set_rest(rig):
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()

def firm_paw_soles(meshes):
    """Keep each sole rigid, with a short weight transition above the toes.

    Only weights change. Imported geometry, bind transforms, UVs and textures
    stay intact. The old blended lower-leg influence dragged the sole through
    the floor even when the ankle target itself remained perfectly planted.
    """
    report = {}
    for mesh in meshes:
        for paw in PAWS:
            group = mesh.vertex_groups[paw]
            candidates = [v for v in mesh.data.vertices
                          if any(g.group == group.index and g.weight > .5 for g in v.groups)]
            if not candidates:
                raise ValueError(f'No dominant paw vertices for {paw}')
            bottom = min((mesh.matrix_world @ v.co).z for v in candidates)
            changed = 0
            for vertex in candidates:
                height = (mesh.matrix_world @ vertex.co).z - bottom
                blend = max(0, min(1, (.10 - height) / .05))
                if blend == 0:
                    continue
                weights = [(g.group, g.weight) for g in vertex.groups]
                old = next(weight for index, weight in weights if index == group.index)
                for index, weight in weights:
                    mesh.vertex_groups[index].add([vertex.index], weight * (1 - blend), 'REPLACE')
                group.add([vertex.index], old * (1 - blend) + blend, 'REPLACE')
                changed += 1
            report[paw] = {'world_bottom_z': bottom, 'vertices_adjusted': changed,
                           'rigid_height': .05, 'transition_height': .05}
    return report

def attach_foliage(meshes):
    """Give a disconnected flower/leaf shell one coherent attachment.

    Nearest-bone PER VERTEX is not rigid-shell weighting: opposite sides of a
    petal can otherwise follow the thigh and spine and tear into a thin strip.
    Weld coincident UV splits for connectivity inspection only; never edit mesh.
    """
    report = []
    for mesh in meshes:
        parent = list(range(len(mesh.data.vertices)))
        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        def union(a, b):
            parent[find(a)] = find(b)
        positions = {}
        for v in mesh.data.vertices:
            key = tuple(round(c / 1e-5) for c in v.co)
            if key in positions:
                union(v.index, positions[key])
            else:
                positions[key] = v.index
        for edge in mesh.data.edges:
            union(*edge.vertices)
        groups = {}
        for v in mesh.data.vertices:
            groups.setdefault(find(v.index), []).append(v)
        for vertices in groups.values():
            if len(vertices) > 1000:
                continue
            center = sum((mesh.matrix_world @ v.co for v in vertices), Vector()) / len(vertices)
            if center.z < .50:
                continue
            if center.y < -.25 and center.z > .75:
                bone_name = 'head'
            elif -.10 < center.y < .50:
                bone_name = 'spine'
            else:
                totals = {}
                for v in vertices:
                    for g in v.groups:
                        totals[g.group] = totals.get(g.group, 0) + g.weight
                bone_name = mesh.vertex_groups[max(totals, key=totals.get)].name
            ids = [v.index for v in vertices]
            for group in mesh.vertex_groups:
                group.remove(ids)
            mesh.vertex_groups[bone_name].add(ids, 1, 'REPLACE')
            report.append({'vertices': len(ids), 'center': list(center), 'bone': bone_name})
    return report

def pose_segment(bone, head, tail):
    rest = bone.bone
    delta = (rest.tail_local - rest.head_local).rotation_difference(tail - head)
    matrix = delta.to_matrix().to_4x4() @ rest.matrix_local.to_quaternion().to_matrix().to_4x4()
    matrix.translation = head
    bone.matrix = matrix
    bpy.context.view_layer.update()

def solve_limb(rig, paw, target, rest, front):
    upper = rig.pose.bones[paw.replace('paw', 'upper')]
    lower = rig.pose.bones[paw.replace('paw', 'lower')]
    foot = rig.pose.bones[paw]
    origin = upper.head.copy()
    length_a, length_b = upper.bone.length, lower.bone.length
    direction = target - origin
    distance = direction.length
    if not abs(length_a - length_b) + 1e-5 < distance < length_a + length_b - 1e-5:
        raise ValueError(f'{paw}: unreachable foot target {distance:.5f}, leg {length_a + length_b:.5f}')
    direction.normalize()
    # Elbows collect toward the rear; stifles toward the front. Avoid lateral
    # pole directions that throw knees sideways out of the body plane.
    pole = rig.matrix_world.to_3x3().inverted() @ Vector((0, 1 if front else -1, 0))
    pole -= direction * pole.dot(direction)
    pole.normalize()
    along = (length_a * length_a - length_b * length_b + distance * distance) / (2 * distance)
    height = math.sqrt(max(0, length_a * length_a - along * along))
    joint = origin + direction * along + pole * height
    pose_segment(upper, origin, joint)
    pose_segment(lower, joint, target)
    # Preserve the actual bind sole orientation independently of the lower leg.
    foot_matrix = rest[paw].copy()
    foot_matrix.translation = target
    foot.matrix = foot_matrix
    bpy.context.view_layer.update()
    return {'reach': distance, 'available': length_a + length_b,
            'error': (foot.head - target).length,
            'joint_error': (lower.head - upper.tail).length,
            'ankle_error': (foot.head - lower.tail).length}

def curve(phase, settings, index):
    q = (phase - settings['phase'][index]) % 1
    duty = settings['duty']
    stride = settings['speed'] * settings['seconds']
    sweep = stride * duty
    if q < duty:
        # Body travels -Y, so an in-place stance paw MUST travel +Y.
        return Vector((0, stride * (q - duty / 2), 0)), q, True
    u = (q - duty) / (1 - duty)
    smooth = u * u * (3 - 2 * u)
    return Vector((0, sweep * (.5 - smooth), settings['lift'] * math.sin(math.pi * u) ** 2)), q, False

def create_clip(rig, name, settings):
    set_rest(rig)
    rest = {b.name: b.bone.matrix_local.copy() for b in rig.pose.bones}
    base = {paw: rig.matrix_world @ rig.pose.bones[paw].head for paw in PAWS}
    inverse = rig.matrix_world.inverted()
    inv_rotation = inverse.to_3x3()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    frames = round(settings['seconds'] * FPS)
    report = {'settings': settings, 'stride': settings['speed'] * frames / FPS,
              'frames': frames, 'samples': [], 'max_target_error': 0,
              'max_joint_error': 0, 'max_stance_slip_step': 0}
    previous = {}
    first_pose = None
    for frame in range(frames + 1):
        bpy.context.scene.frame_set(frame)
        phase = frame / frames
        for bone in rig.pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        root = rig.pose.bones['root']
        world_shift = Vector((.006 * math.sin(phase * math.tau), 0,
                              -settings['crouch'] + settings['body_bob'] * math.sin(phase * math.tau * 2 + settings.get('body_bob_phase', 0))))
        moved = rest['root'].copy()
        moved.translation += inv_rotation @ world_shift
        root.matrix = moved
        for bone_name, ratio in [('spine', 1), ('neck', -.65), ('head', -.45)]:
            rig.pose.bones[bone_name].rotation_quaternion = Quaternion((1, 0, 0), settings['body_pitch'] * ratio * math.sin(phase * math.tau))
        for bone_name, amplitude in [('tail_01', .025), ('tail_02', .04), ('tail_03', .055)]:
            rig.pose.bones[bone_name].rotation_quaternion = Quaternion((0, 0, 1), amplitude * math.sin(phase * math.tau - .4))
        bpy.context.view_layer.update()
        sample = {'frame': frame, 'time': frame / FPS, 'paws': {}, 'support': 0}
        for index, paw in enumerate(PAWS):
            offset, q, stance = curve(phase, settings, index)
            target_world = base[paw] + offset
            measured = solve_limb(rig, paw, inverse @ target_world, rest, paw.startswith('front'))
            position = rig.matrix_world @ rig.pose.bones[paw].head
            sample['paws'][paw] = {'position': list(position), 'phase': q, 'stance': stance, **measured}
            sample['support'] += int(stance)
            report['max_target_error'] = max(report['max_target_error'], measured['error'])
            report['max_joint_error'] = max(report['max_joint_error'], measured['joint_error'], measured['ankle_error'])
            prev = previous.get(paw)
            if prev and stance and prev['stance'] and q > prev['phase']:
                slip = position - Vector(prev['position']) + Vector((0, -settings['speed'] / FPS, 0))
                report['max_stance_slip_step'] = max(report['max_stance_slip_step'], slip.length)
            previous[paw] = sample['paws'][paw]
        pose = {}
        for bone in rig.pose.bones:
            bone.keyframe_insert('location', frame=frame, group=bone.name)
            bone.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
            pose[bone.name] = [*bone.location, *bone.rotation_quaternion]
        if first_pose is None:
            first_pose = pose
        if frame == frames:
            report['max_loop_transform_delta'] = max(abs(x - y) for key in pose for x, y in zip(pose[key], first_pose[key]))
        report['samples'].append(sample)
    for channel in action.fcurves:
        for key in channel.keyframe_points:
            key.interpolation = 'LINEAR'
    report['support_range'] = [min(s['support'] for s in report['samples']), max(s['support'] for s in report['samples'])]
    for field in ('max_target_error', 'max_joint_error', 'max_stance_slip_step', 'max_loop_transform_delta'):
        if report[field] > 2e-4:
            raise ValueError(f'{name} {field}: {report[field]}')
    if name == 'Walk' and report['support_range'][0] < 2:
        raise ValueError('Walk requires at least two support paws throughout')
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=False)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(args.input.resolve()))
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
    for track in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(track)
    set_rest(rig)
    attachments = attach_foliage(meshes)
    sole_weights = firm_paw_soles(meshes)
    for name in ('Walk', 'Run'):
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
    # glTF import uses Blender frames at 24 FPS. Preserve other action seconds.
    for action in bpy.data.actions:
        for channel in action.fcurves:
            for key in channel.keyframe_points:
                key.co.x *= FPS / 24
                key.handle_left.x *= FPS / 24
                key.handle_right.x *= FPS / 24
        action.use_fake_user = True
    bpy.context.scene.render.fps = FPS
    report = {'input': str(args.input), 'input_sha256': digest(args.input), 'method': 'analytic fixed-length IK; absolute bind sole orientation; body -Y, stance paws +Y', 'sole_weights': sole_weights, 'attachments': attachments, 'clips': {}}
    for name, settings in SETTINGS.items():
        report['clips'][name] = create_clip(rig, name, settings)
    set_rest(rig)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'mossling-analytic-ik.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    model = output / 'model.glb'
    bpy.ops.export_scene.gltf(filepath=str(model), export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='ACTIONS', export_materials='EXPORT', export_force_sampling=True)
    report['output_sha256'] = digest(model)
    report['note'] = 'Authoring contact gates passed. Exact exported-GLB contact and independent motion review still required.'
    (output / 'motion-provenance.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({name: {k: v for k, v in data.items() if k != 'samples'} for name, data in report['clips'].items()}, indent=2))

if __name__ == '__main__':
    main()
