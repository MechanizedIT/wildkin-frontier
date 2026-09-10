"""Create diagnostic-only, lower-triangle GLB controls from an existing GLB.

Example:
  blender -b --python tools/art/derive-mobile-glb.py -- --input C:\\asset.glb \
    --output-dir C:\\mobile --targets 10000,20000 --diagnostic-no-bake

The source GLB is read only. Position welding and QEM decimation happen on
disposable in-memory Blender mesh copies. These controls can distort UV-mapped
source color, so they require an explicit diagnostic flag and are not approved
runtime assets.
"""

from __future__ import annotations

import argparse
import bmesh
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Absolute source .glb path.")
    parser.add_argument("--output-dir", required=True, help="Absolute output directory.")
    parser.add_argument("--targets", default="10000,20000", help="Comma-separated triangle targets.")
    parser.add_argument(
        "--diagnostic-no-bake",
        action="store_true",
        help="Required acknowledgement: this QEM-only route is a diagnostic control, not a production asset pipeline.",
    )
    parser.add_argument(
        "--skip-position-weld",
        action="store_true",
        help="Keep GLB split vertices as a UV-seam-preserving diagnostic comparison control.",
    )
    return parser.parse_args(raw)


def absolute_path(value: str, label: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        raise ValueError(f"{label} must be an absolute path: {value}")
    return path.resolve()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mesh_triangles(mesh: bpy.types.Mesh) -> int:
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def validate_mesh(mesh: bpy.types.Mesh) -> bool:
    """Repair invalid topology on a disposable derived mesh and report it."""
    changed = mesh.validate(verbose=False, clean_customdata=False)
    mesh.update()
    return changed


def welded_copy(source: bpy.types.Mesh) -> tuple[bpy.types.Mesh, float, bool]:
    """Merge coincident positions on a new mesh while retaining loop UV layers."""
    if not source.vertices:
        result = source.copy()
        return result, 0.0, validate_mesh(result)
    points = [vertex.co for vertex in source.vertices]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    tolerance = max(max(maximum - minimum) * 0.000001, 0.000000001)
    result = bpy.data.meshes.new(f"Welded diagnostic base | {source.name}")
    bm = bmesh.new()
    try:
        bm.from_mesh(source)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=tolerance)
        bmesh.ops.dissolve_degenerate(bm, dist=tolerance, edges=list(bm.edges))
        bm.normal_update()
        bm.to_mesh(result)
    finally:
        bm.free()
    # BMesh preserves material indices, while this explicit copy preserves the
    # index-to-material mapping required for exported GLB faces.
    for material in source.materials:
        result.materials.append(material)
    return result, tolerance, validate_mesh(result)


def matte_material(material: bpy.types.Material) -> bpy.types.Material:
    """Copy a source material and remove only reflective controls/maps."""
    result = material.copy()
    result.name = f"Mobile Matte | {material.name}"
    result.use_nodes = True
    if result.node_tree:
        for node in result.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            for socket_name, value in (
                ("Metallic", 0.0),
                ("Roughness", 0.9),
                ("Specular IOR Level", 0.0),
                ("Coat Weight", 0.0),
                ("Coat Roughness", 1.0),
            ):
                socket = node.inputs.get(socket_name)
                if socket:
                    for link in list(socket.links):
                        result.node_tree.links.remove(link)
                    socket.default_value = value
    result.metallic = 0.0
    result.roughness = 0.9
    return result


def base_color_image_inventory(materials: list[bpy.types.Material]) -> list[dict]:
    """List only images upstream of each material's Principled Base Color."""
    images: dict[int, bpy.types.Image] = {}
    for material in materials:
        if not material.use_nodes or not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            base_color = node.inputs.get("Base Color")
            if not base_color:
                continue
            pending = [link.from_node for link in base_color.links]
            visited: set[int] = set()
            while pending:
                candidate = pending.pop()
                pointer = candidate.as_pointer()
                if pointer in visited:
                    continue
                visited.add(pointer)
                if candidate.type == "TEX_IMAGE" and candidate.image:
                    images[candidate.image.as_pointer()] = candidate.image
                for input_socket in candidate.inputs:
                    pending.extend(link.from_node for link in input_socket.links)
    return [
        {"name": image.name, "width": image.size[0], "height": image.size[1]}
        for image in images.values()
    ]


def apply_decimate(obj: bpy.types.Object, target_triangles: int) -> tuple[float, int, bool]:
    initial_triangles = mesh_triangles(obj.data)
    ratio = min(1.0, max(0.001, target_triangles / max(initial_triangles, 1)))
    modifier = obj.modifiers.new(name="QEM mobile triangle budget", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    # Applying through Blender's modifier operator yields exportable mesh data.
    # The evaluated-object extraction path can retain invalid custom data after
    # a bmesh position weld, even when its in-memory triangle count looks right.
    for candidate in bpy.context.view_layer.objects:
        if candidate:
            candidate.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    validation_repaired = validate_mesh(obj.data)
    return ratio, mesh_triangles(obj.data), validation_repaired


def export_selected_glb(obj: bpy.types.Object, output: Path) -> None:
    for candidate in bpy.context.view_layer.objects:
        candidate.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True)


def roundtrip_glb_stats(path: Path) -> dict:
    """Read the just-exported GLB in this disposable scene and report final counts."""
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == "MESH"]
    if not imported:
        raise RuntimeError(f"Round-trip import produced no mesh: {path}")
    triangles = vertices = materials = 0
    uv_layers: set[str] = set()
    validation_changes = False
    for obj in imported:
        validation_changes = validate_mesh(obj.data) or validation_changes
        triangles += mesh_triangles(obj.data)
        vertices += len(obj.data.vertices)
        materials += len(obj.data.materials)
        uv_layers.update(layer.name for layer in obj.data.uv_layers)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.update()
    return {
        "vertices": vertices,
        "triangles": triangles,
        "uv_layers": sorted(uv_layers),
        "material_count": materials,
        "validation_changed_on_roundtrip_import": validation_changes,
    }


def main() -> None:
    options = arguments()
    if not options.diagnostic_no_bake:
        raise ValueError("This known UV-risk route is diagnostic-only; pass --diagnostic-no-bake to run it.")
    source_path = absolute_path(options.input, "--input")
    output_dir = absolute_path(options.output_dir, "--output-dir")
    if source_path.suffix.lower() != ".glb" or not source_path.is_file():
        raise ValueError(f"--input must be an existing .glb: {source_path}")
    targets = sorted({int(item.strip()) for item in options.targets.split(",") if item.strip()})
    if not targets or min(targets) <= 0:
        raise ValueError("--targets must contain positive triangle counts")
    if output_dir.exists():
        raise ValueError(f"Refusing to reuse output directory: {output_dir}")
    if len({target // 1000 for target in targets}) != len(targets):
        raise ValueError("--targets would create duplicate output filenames; use separate runs")
    output_dir.mkdir(parents=True)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(source_path))
    sources = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(sources) != 1:
        raise RuntimeError(f"This derivation expects one mesh object, imported {len(sources)}")
    source_obj = sources[0]
    source_mesh = source_obj.data
    original_materials = [material for material in source_mesh.materials if material]
    if len(original_materials) != 1:
        raise RuntimeError(f"This trial expects one source material, imported {len(original_materials)}")
    if options.skip_position_weld:
        welded_mesh = source_mesh.copy()
        weld_tolerance = None
        welded_validation_repaired = validate_mesh(welded_mesh)
        base_label = "UV-seam-preserving source copy; source GLB and source mesh unchanged"
    else:
        welded_mesh, weld_tolerance, welded_validation_repaired = welded_copy(source_mesh)
        base_label = "disposable position-welded derivation copy; source GLB, source mesh, and per-corner UV data remain unchanged"
    welded_triangles = mesh_triangles(welded_mesh)
    matte = matte_material(original_materials[0])

    source_obj.name = "Imported source (read-only external GLB)"
    source_obj.hide_render = True
    source_obj.hide_viewport = True
    variants = []
    collection = bpy.data.collections.new("Mobile GLB candidates")
    bpy.context.scene.collection.children.link(collection)
    for target in targets:
        mesh = welded_mesh.copy()
        mesh.materials.clear()
        mesh.materials.append(matte)
        obj = bpy.data.objects.new(f"Mossling mobile target {target}", mesh)
        obj.matrix_world = source_obj.matrix_world.copy()
        collection.objects.link(obj)
        ratio, actual_triangles, validation_repaired = apply_decimate(obj, target)
        destination = output_dir / f"mossling-{target // 1000}k.glb"
        export_selected_glb(obj, destination)
        roundtrip = roundtrip_glb_stats(destination)
        variants.append({
            "requested_triangles": target,
            "qem_ratio": ratio,
            "pre_export_triangles": actual_triangles,
            "validation_repaired_disposable_copy": validation_repaired,
            "vertices": len(obj.data.vertices),
            "uv_layers": [layer.name for layer in obj.data.uv_layers],
            "material_count": len(obj.data.materials),
            "base_color_textures": base_color_image_inventory(list(obj.data.materials)),
            "glb": destination.name,
            "bytes": destination.stat().st_size,
            "final_glb_roundtrip": roundtrip,
        })
    report = {
        "source_glb": str(source_path),
        "source_sha256": sha256(source_path),
        "source_bytes": source_path.stat().st_size,
        "source_triangles": mesh_triangles(source_mesh),
        "source_vertices": len(source_mesh.vertices),
        "source_material_count": len(original_materials),
        "source_base_color_textures": base_color_image_inventory(original_materials),
        "welded_copy": {
            "label": base_label,
            "tolerance": weld_tolerance,
            "triangles": welded_triangles,
            "vertices": len(welded_mesh.vertices),
            "validation_repaired_disposable_copy": welded_validation_repaired,
            "diagnostic_status": "unapproved: QEM-only controls may distort texture UVs or separate seam geometry; review only.",
        },
        "runtime_material": "Diagnostic copied source material with metallic 0, Specular IOR Level 0, Coat Weight 0, and roughness 0.9; Base Color links retained and reflective texture links removed.",
        "variants": variants,
    }
    with (output_dir / "derivation.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "mobile-derivation.blend"))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
