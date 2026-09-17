"""Read-only V3 mesh/rig inventory for the isolated Mossling V4 candidate."""
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index("--") + 1:]
source = Path(args[args.index("--input") + 1]).resolve()
output = Path(args[args.index("--output") + 1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))

objects = []
surface_probes = []
for obj in bpy.context.scene.objects:
    record = {"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None,
              "location": list(obj.location), "rotation": list(obj.rotation_euler), "scale": list(obj.scale)}
    if obj.type == "MESH":
        corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        record["worldBounds"] = {"min": [min(v[i] for v in corners) for i in range(3)], "max": [max(v[i] for v in corners) for i in range(3)]}
        record["vertices"] = len(obj.data.vertices)
        record["materials"] = [slot.material.name if slot.material else None for slot in obj.material_slots]
        record["vertexGroups"] = [group.name for group in obj.vertex_groups]
        record["modifiers"] = [{"type": mod.type, "object": getattr(mod.object, "name", None)} for mod in obj.modifiers]
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        try:
            points = [obj.matrix_world @ vertex.co for vertex in evaluated.vertices]
            if points: record["evaluatedWorldBounds"] = {"min": [min(v[i] for v in points) for i in range(3)], "max": [max(v[i] for v in points) for i in range(3)]}
        finally:
            obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
    if obj.type == "ARMATURE":
        record["bones"] = [{"name": bone.name, "head": list(bone.head_local), "tail": list(bone.tail_local)} for bone in obj.data.bones]
    objects.append(record)
main = next((obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent and obj.parent.type == 'ARMATURE'), None)
if main:
    for x in (-.18, -.135, -.11, .11, .135, .18):
        hit, point, normal, face = main.ray_cast(Vector((x, -2, .765)), Vector((0, 1, 0)))
        surface_probes.append({'x': x, 'z': .765, 'hit': bool(hit), 'point': list(point) if hit else None, 'normal': list(normal) if hit else None, 'face': face if hit else None})
output.write_text(json.dumps({"source": str(source), "objects": objects, "faceSurfaceProbes": surface_probes}, indent=2), encoding="utf-8")
