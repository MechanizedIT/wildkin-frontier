"""Prepare a local, unrigged rest-pose FBX for a supervised Mixamo trial.

Run in Blender with --input <reviewed.glb> --output-dir <fresh-directory>.
This does not upload anything or assert that Mixamo will rig the character.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    supplied = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    options = parser.parse_args(supplied)
    source = options.input.resolve(strict=True)
    output = options.output_dir.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError("Use a fresh output directory; do not overwrite a reviewed trial")
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    bone_widgets = {bone.custom_shape for obj in bpy.context.scene.objects
                    if obj.type == "ARMATURE" for bone in obj.pose.bones if bone.custom_shape}
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj not in bone_widgets]
    if len(meshes) != 1:
        raise ValueError("This trial helper expects the single-mesh Explorer GLB")
    mesh = meshes[0]
    # Imported mesh data is the bind surface; do not evaluate an animated pose.
    world_matrix = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.matrix_world = world_matrix
    mesh.modifiers.clear()
    mesh.vertex_groups.clear()
    mesh.animation_data_clear()
    mesh.name = "ExplorerRestMesh"
    for obj in list(bpy.context.scene.objects):
        if obj != mesh:
            bpy.data.objects.remove(obj, do_unlink=True)
    textures = []
    for image in bpy.data.images:
        if not image.packed_file:
            continue
        image_path = output / f"texture-{len(textures)}.png"
        image_path.write_bytes(image.packed_file.data)
        image.filepath_raw = str(image_path)
        textures.append({"file": image_path.name, "sha256": sha(image_path), "size": list(image.size)})
    if not textures:
        raise ValueError("Expected an embedded source texture; refuse a silently gray export")
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    vertices = len(mesh.data.vertices)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "explorer-rest.blend"))
    fbx = output / "explorer-rest.fbx"
    bpy.ops.export_scene.fbx(
        filepath=str(fbx), use_selection=True, object_types={"MESH"},
        bake_anim=False, use_mesh_modifiers=False, add_leaf_bones=False,
        path_mode="COPY", embed_textures=True, axis_forward="-Z", axis_up="Y",
    )
    # Verify the actual FBX round trip, including its image, before offering it.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for image in list(bpy.data.images):
        if image.users == 0:
            bpy.data.images.remove(image)
    bpy.ops.import_scene.fbx(filepath=str(fbx))
    returned = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(returned) != 1 or armatures or len(returned[0].data.vertices) != vertices:
        raise RuntimeError("FBX round trip changed mesh count, vertices, or contains a rig")
    texture_nodes = [node for material in returned[0].data.materials if material and material.node_tree
                     for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image]
    if not texture_nodes:
        raise RuntimeError("FBX round trip lost the color texture")
    report = {
        "source": str(source), "source_sha256": sha(source),
        "fbx": str(fbx), "fbx_sha256": sha(fbx), "bytes": fbx.stat().st_size,
        "textures": textures, "vertices": vertices, "mesh_count": 1,
        "rigs": 0, "animations": 0, "roundtrip_texture_nodes": len(texture_nodes),
        "status": "local export verified; Mixamo upload, rigging and animation untested",
        "pose": "original Explorer bind surface; inspect before any external upload",
    }
    (output / "preparation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
