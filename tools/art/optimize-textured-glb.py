"""Derive a textured, matte GLB with PyMeshLab's texture-aware QEM decimator.

This keeps UV seams as texture seams and never creates fresh UVs or bakes a
replacement texture.  Its optional positional seam weld is performed before
the *texture-aware* QEM filter; the previous rejected control welded before an
ordinary decimator, which corrupted per-corner UV behavior.

Example (PowerShell):
  & C:/Users/cwood/Tools/wildkin-art-python/Scripts/python.exe `
    tools/art/optimize-textured-glb.py --input <absolute raw.glb> `
    --output-dir <absolute new directory> --targets 10000 20000

Blender is used only for lossless format interchange. PyMeshLab performs the
actual textured simplification via
meshing_decimation_quadric_edge_collapse_with_texture.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import re
import subprocess
import sys
import struct
from pathlib import Path


DEFAULT_BLENDER = Path("C:/Program Files/Blender Foundation/Blender 4.5/blender.exe")
TEXTURED_QEM_PARAMETERS = {
    "targetperc": 0.0, "qualitythr": 0.3, "extratcoordw": 1.0,
    "preserveboundary": False, "boundaryweight": 1.0,
    "optimalplacement": True, "preservenormal": False,
    "planarquadric": False, "selected": False,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def blender_worker_export(source: Path, interchange_dir: Path) -> None:
    """Import raw GLB and emit OBJ + its exact Base Color PNG."""
    import bpy  # type: ignore

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one source mesh, found {len(meshes)}")
    material = meshes[0].active_material
    if not material or not material.use_nodes or not material.node_tree:
        raise RuntimeError("Source has no node-based material")
    principled = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    base = principled.inputs.get("Base Color") if principled else None
    image_node = base.links[0].from_node if base and base.links and base.links[0].from_node.type == "TEX_IMAGE" else None
    if not image_node or not image_node.image:
        raise RuntimeError("Source Base Color is not directly driven by an image texture")
    color_png = interchange_dir / "base-color.png"
    source_png = interchange_dir / "base-color-source.png"
    image = image_node.image
    # Keep the GLB's encoded Base Color bytes, rather than asking Blender to
    # re-save its decoded pixels.  Hash retention is part of the experiment:
    # a texture-aware reduction must not silently alter the liked source art.
    if not image.packed_file:
        raise RuntimeError("Source Base Color is not packed in the source GLB")
    source_png.write_bytes(bytes(image.packed_file.data))
    color_png.write_bytes(source_png.read_bytes())
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    meshes[0].select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    obj_path = interchange_dir / "source.obj"
    bpy.ops.wm.obj_export(
        filepath=str(obj_path),
        export_selected_objects=True,
        export_materials=True,
        export_uv=True,
        export_normals=True,
        apply_modifiers=False,
    )
    # The OBJ exporter can choose an arbitrary packed-image filename. Pin the
    # material to the extracted source PNG so MeshLab and later checks use it.
    obj_path.with_suffix(".mtl").write_text(
        "newmtl MosslingBaseColor\nKd 1.000000 1.000000 1.000000\n"
        "Ka 0.000000 0.000000 0.000000\nKs 0.000000 0.000000 0.000000\n"
        "Ns 1.000000\nmap_Kd base-color.png\n",
        encoding="utf-8",
    )
    print(json.dumps({"source_obj": str(obj_path), "base_color": str(source_png), "dimensions": list(image.size)}))


def blender_worker_assemble(source_obj: Path, output_glb: Path) -> None:
    """Turn MeshLab's OBJ back into one deliberately matte, color-only GLB."""
    import bpy  # type: ignore

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.obj_import(filepath=str(source_obj))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one optimized mesh, found {len(meshes)}")
    obj = meshes[0]
    material = obj.active_material
    if not material:
        material = bpy.data.materials.new("Mossling Matte")
        obj.data.materials.append(material)
    label_path = source_obj.parent / "asset-label.txt"
    asset_label = label_path.read_text(encoding="utf-8").strip() if label_path.is_file() else "Derived Asset"
    material.name = f"{asset_label} Matte Base Color"
    material.use_nodes = True
    # glTF export reads these Blender material fields for its core
    # metallic-roughness factors, in addition to the Principled sockets below.
    material.metallic = 0.0
    material.roughness = 0.9
    nodes = material.node_tree.nodes
    principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if not principled:
        principled = nodes.new("ShaderNodeBsdfPrincipled")
    for name, value in (("Metallic", 0.0), ("Roughness", 0.9), ("Specular IOR Level", 0.0), ("Coat Weight", 0.0)):
        socket = principled.inputs.get(name)
        if socket:
            socket.default_value = value
            for link in list(socket.links):
                material.node_tree.links.remove(link)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_normals=True,
        export_tangents=False,
        export_texcoords=True,
        export_attributes=True,
        export_image_format="AUTO",
    )
    obj.data.calc_loop_triangles()
    print(json.dumps({"vertices": len(obj.data.vertices), "triangles": len(obj.data.loop_triangles)}))


def blender_worker_glb_facts(source_glb: Path) -> None:
    """Return the final GLB's re-imported geometry counts."""
    import bpy  # type: ignore

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source_glb))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Re-imported GLB has no mesh objects")
    for obj in meshes:
        obj.data.calc_loop_triangles()
    print(json.dumps({
        "reimport_mesh_objects": len(meshes),
        "reimport_vertices": sum(len(obj.data.vertices) for obj in meshes),
        "reimport_triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
    }))


def run_blender(blender: Path, mode: str, *paths: Path, capture: bool = False) -> str:
    command = [str(blender), "--background", "--python", str(Path(__file__).resolve()), "--", "--blender-worker", mode]
    command.extend(str(path) for path in paths)
    completed = subprocess.run(command, check=True, text=True, capture_output=capture)
    return completed.stdout if capture else ""


def final_glb_facts(blender: Path, glb_path: Path) -> dict:
    output = run_blender(blender, "facts", glb_path, capture=True)
    for line in reversed(output.splitlines()):
        try:
            result = json.loads(line)
        except json.JSONDecodeError:
            continue
        if "reimport_triangles" in result:
            return result
    raise RuntimeError(f"Blender did not report re-import facts for {glb_path}: {output}")


def restore_exact_embedded_base_color(glb_path: Path, png_path: Path) -> str:
    """Replace Blender's re-encoded image blob with the original PNG bytes.

    Blender's GLB exporter decodes and re-encodes an otherwise unchanged PNG.
    That is visually harmless but fails the stronger source-texture retention
    contract used for this experiment.  This small GLB-level operation changes
    only the image bufferView and shifts later buffer views if necessary.
    """
    data = glb_path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise RuntimeError(f"Invalid GLB: {glb_path}")
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise RuntimeError("GLB has no JSON chunk")
    json_start = 20
    json_end = json_start + json_length
    document = json.loads(data[json_start:json_end].decode("utf-8").rstrip(" \t\r\n\0"))
    bin_length, bin_type = struct.unpack_from("<I4s", data, json_end)
    if bin_type != b"BIN\0":
        raise RuntimeError("GLB has no binary chunk")
    binary = data[json_end + 8 : json_end + 8 + bin_length]
    images = document.get("images", [])
    if len(images) != 1 or "bufferView" not in images[0]:
        raise RuntimeError("Expected exactly one embedded Base Color image")
    image_view_index = images[0]["bufferView"]
    views = document["bufferViews"]
    image_view = views[image_view_index]
    start = image_view.get("byteOffset", 0)
    next_offsets = [view.get("byteOffset", 0) for index, view in enumerate(views) if index != image_view_index and view.get("byteOffset", 0) > start]
    old_end = min(next_offsets, default=len(binary))
    source_png = png_path.read_bytes()
    replacement = source_png + b"\0" * ((-len(source_png)) % 4)
    if old_end < start + image_view["byteLength"]:
        raise RuntimeError("Malformed image bufferView range")
    delta = len(replacement) - (old_end - start)
    new_binary = binary[:start] + replacement + binary[old_end:]
    image_view["byteLength"] = len(source_png)
    for index, view in enumerate(views):
        if index != image_view_index and view.get("byteOffset", 0) >= old_end:
            view["byteOffset"] = view.get("byteOffset", 0) + delta
    document["buffers"][0]["byteLength"] = len(new_binary)
    json_bytes = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * ((-len(json_bytes)) % 4)
    new_binary += b"\0" * ((-len(new_binary)) % 4)
    rebuilt = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(json_bytes) + 8 + len(new_binary))
    rebuilt += struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes
    rebuilt += struct.pack("<I4s", len(new_binary), b"BIN\0") + new_binary
    glb_path.write_bytes(rebuilt)
    return sha256(png_path)


def textured_decimate(source_obj: Path, output_obj: Path, target: int, merge_position_seams: bool) -> dict:
    import pymeshlab  # type: ignore

    meshset = pymeshlab.MeshSet()
    meshset.load_new_mesh(str(source_obj))
    before = meshset.current_mesh()
    source_vertices = before.vertex_number()
    source_faces = before.face_number()
    if merge_position_seams:
        # This is intentionally an opt-in diagnostic.  Unlike the rejected
        # ordinary QEM path, the following decimator remains UV-aware; it tests
        # whether a positional pre-weld can prevent fine seam cracks.
        meshset.meshing_merge_close_vertices(threshold=pymeshlab.PercentageValue(0.0001))
    meshset.meshing_decimation_quadric_edge_collapse_with_texture(
        targetfacenum=target,
        **TEXTURED_QEM_PARAMETERS,
        # UV islands appear as boundaries to OBJ interchange.  Locking every
        # one prevents any collapse; the texture-aware QEM term itself retains
        # the parametrization while allowing those seam-adjacent triangles to
        # simplify.
    )
    after = meshset.current_mesh()
    # MeshLab writes a matching MTL, but pin its image reference to the retained
    # extracted texture. This prevents a material-control map from slipping into
    # a derived runtime asset.
    meshset.save_current_mesh(str(output_obj), save_vertex_normal=True, save_wedge_texcoord=True)
    output_obj.with_suffix(".mtl").write_text(
        "newmtl MosslingBaseColor\nKd 1.000000 1.000000 1.000000\n"
        "Ka 0.000000 0.000000 0.000000\nKs 0.000000 0.000000 0.000000\n"
        "Ns 1.000000\nmap_Kd base-color.png\n",
        encoding="utf-8",
    )
    return {
        "source_vertices": source_vertices,
        "source_faces": source_faces,
        "pymeshlab_preexport_vertices": after.vertex_number(),
        "pymeshlab_preexport_triangles": after.face_number(),
    }


def optimize(options: argparse.Namespace) -> None:
    source = options.input.resolve()
    output = options.output_dir.resolve()
    if not source.is_file() or source.suffix.lower() != ".glb":
        raise ValueError("--input must be an existing absolute .glb")
    if not options.blender.is_file():
        raise ValueError(f"Blender executable is unavailable: {options.blender}")
    if output.exists() and any(output.iterdir()) and not options.allow_existing:
        raise ValueError(f"Output directory is non-empty (use a fresh directory): {output}")
    output.mkdir(parents=True, exist_ok=True)
    interchange = output / "interchange"
    interchange.mkdir(exist_ok=True)
    asset_name = options.name or source.parent.name
    asset_name = re.sub(r"[^A-Za-z0-9_-]+", "-", asset_name).strip("-")
    if not asset_name:
        raise ValueError("--name must contain at least one letter or number")
    asset_label = asset_name.replace("-", " ").replace("_", " ").title()
    (interchange / "asset-label.txt").write_text(asset_label, encoding="utf-8")
    run_blender(options.blender, "export", source, interchange)
    source_obj = interchange / "source.obj"
    base_color = interchange / "base-color.png"
    source_color = interchange / "base-color-source.png"
    if not source_obj.is_file() or not base_color.is_file() or not source_color.is_file():
        raise RuntimeError("Blender interchange export did not produce the OBJ and Base Color PNG")
    manifest = {
        "tool": "optimize-textured-glb.py",
        "asset_name": asset_name,
        "python": sys.version,
        "source_glb": str(source),
        "source_glb_sha256": sha256(source),
        "base_color_png": str(source_color),
        "base_color_png_sha256": sha256(source_color),
        "algorithm": "PyMeshLab meshing_decimation_quadric_edge_collapse_with_texture",
        "pymeshlab_version": importlib.metadata.version("pymeshlab"),
        "filter_parameters": TEXTURED_QEM_PARAMETERS,
        "merge_position_seams": {
            "enabled": options.merge_position_seams,
            "threshold_percent_of_bbox": 0.0001 if options.merge_position_seams else None,
            "guidance": "The seam weld is an experimentally proved Mossling setting only. Pass --merge-position-seams explicitly for a new asset after validating its texture and topology; it is not a universal default.",
        },
        "visual_review": {
            "status": "pending",
            "required": "Determine the actual source front, then inspect matching three-view renders at large and 128-pixel sizes before accepting a runtime derivative.",
        },
        "targets": [],
    }
    for target in options.targets:
        candidate = output / f"{asset_name}-textured-{target}.glb"
        candidate_obj = interchange / f"{asset_name}-textured-{target}.obj"
        result = textured_decimate(source_obj, candidate_obj, target, options.merge_position_seams)
        # Blender's exporter may re-save the image named by the OBJ MTL. Reset
        # it from the immutable source before each candidate and restore the
        # original bytes in the finished GLB below.
        base_color.write_bytes(source_color.read_bytes())
        run_blender(options.blender, "assemble", candidate_obj, candidate)
        result.update({
            "target": target,
            "glb": str(candidate),
            "embedded_base_color_png_sha256": restore_exact_embedded_base_color(candidate, source_color),
            "glb_sha256": sha256(candidate),
            "bytes": candidate.stat().st_size,
        })
        result.update(final_glb_facts(options.blender, candidate))
        manifest["targets"].append(result)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--targets", type=int, nargs="+", default=[10000, 20000])
    parser.add_argument("--blender", type=Path, default=DEFAULT_BLENDER)
    parser.add_argument("--allow-existing", action="store_true")
    parser.add_argument("--name", help="Safe output/material prefix; defaults to the input GLB parent-directory name.")
    parser.add_argument("--merge-position-seams", action="store_true", help="Mossling-proved opt-in: merge coincident positions before texture-aware QEM; validate every new asset.")
    parser.add_argument("--blender-worker", choices=("export", "assemble"))
    parser.add_argument("worker_paths", nargs="*")
    options = parser.parse_args()
    if options.blender_worker:
        if len(options.worker_paths) != 2:
            parser.error("Blender worker expects exactly two paths")
        if options.blender_worker == "export":
            blender_worker_export(Path(options.worker_paths[0]), Path(options.worker_paths[1]))
        else:
            blender_worker_assemble(Path(options.worker_paths[0]), Path(options.worker_paths[1]))
        raise SystemExit(0)
    if any(target < 100 for target in options.targets):
        parser.error("--targets must contain triangle counts of at least 100")
    return options


if __name__ == "__main__":
    # Blender exposes the arguments after ``--`` through ``sys.argv`` but does
    # not preserve the calling script's normal command-line shape. Dispatch the
    # tiny interchange workers before argparse enforces the main CLI fields.
    if "--blender-worker" in sys.argv:
        worker_index = sys.argv.index("--blender-worker")
        worker_args = sys.argv[worker_index + 1 :]
        worker_mode = worker_args[0] if worker_args else ""
        if worker_mode == "facts":
            if len(worker_args) != 2:
                raise SystemExit("Blender facts worker expects one GLB path")
            blender_worker_glb_facts(Path(worker_args[1]))
            raise SystemExit(0)
        if len(worker_args) != 3:
            raise SystemExit("Blender worker expects mode plus two paths")
        _, first_path, second_path = worker_args
        if worker_mode == "export":
            blender_worker_export(Path(first_path), Path(second_path))
        elif worker_mode == "assemble":
            blender_worker_assemble(Path(first_path), Path(second_path))
        else:
            raise SystemExit(f"Unknown Blender worker mode: {worker_mode}")
    else:
        optimize(parse_arguments())
