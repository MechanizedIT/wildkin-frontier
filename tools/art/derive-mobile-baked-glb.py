"""Create diagnostic-only welded, QEM-reduced, freshly unwrapped baked GLBs.

The source GLB is never modified.  Each output low mesh is position welded on a
disposable copy, QEM reduced, given a new Smart UV layout, then receives a
Diffuse Color selected-to-active CPU bake from the untouched imported source.
This experiment has not met visual acceptance and is not a production pipeline.
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


def parse_args() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Absolute source GLB.")
    parser.add_argument("--output-dir", required=True, help="Absolute output directory.")
    parser.add_argument("--targets", default="10000,20000", help="Comma-separated triangle targets.")
    parser.add_argument("--texture-size", type=int, default=1024, help="Square baked base-color texture size.")
    parser.add_argument(
        "--diagnostic-experiment",
        action="store_true",
        help="Required acknowledgement: this bake route is experimental and not an approved runtime asset pipeline.",
    )
    return parser.parse_args(raw)


def absolute(value: str, label: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        raise ValueError(f"{label} must be absolute: {value}")
    return path.resolve()


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def triangles(mesh: bpy.types.Mesh) -> int:
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def validate(mesh: bpy.types.Mesh) -> bool:
    changed = mesh.validate(verbose=False, clean_customdata=False)
    mesh.update()
    return changed


def max_extent(mesh: bpy.types.Mesh) -> float:
    points = [vertex.co for vertex in mesh.vertices]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return max(maximum - minimum)


def welded_mesh(source: bpy.types.Mesh) -> tuple[bpy.types.Mesh, float, bool]:
    extent = max_extent(source)
    tolerance = max(extent * 0.000001, 0.000000001)
    output = bpy.data.meshes.new(f"Welded QEM base | {source.name}")
    bm = bmesh.new()
    try:
        bm.from_mesh(source)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=tolerance)
        bmesh.ops.dissolve_degenerate(bm, dist=tolerance, edges=list(bm.edges))
        bm.normal_update()
        bm.to_mesh(output)
    finally:
        bm.free()
    return output, tolerance, validate(output)


def make_runtime_baked_material(image: bpy.types.Image) -> bpy.types.Material:
    material = bpy.data.materials.new("Mossling Mobile Baked Matte")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    principled.inputs["Metallic"].default_value = 0.0
    principled.inputs["Roughness"].default_value = 0.9
    specular = principled.inputs.get("Specular IOR Level")
    if specular:
        specular.default_value = 0.0
    coat = principled.inputs.get("Coat Weight")
    if coat:
        coat.default_value = 0.0
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "Baked Base Color"
    texture.image = image
    links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    for node in nodes:
        node.select = False
    texture.select = True
    nodes.active = texture
    return material


def apply_qem(obj: bpy.types.Object, target: int) -> tuple[float, int, bool]:
    ratio = min(1.0, max(0.001, target / max(triangles(obj.data), 1)))
    modifier = obj.modifiers.new("Welded QEM mobile budget", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    for item in bpy.context.view_layer.objects:
        if item:
            item.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    repaired = validate(obj.data)
    return ratio, triangles(obj.data), repaired


def fresh_smart_uv(obj: bpy.types.Object) -> None:
    for layer in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(layer)
    for item in bpy.context.view_layer.objects:
        if item:
            item.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.015, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if not obj.data.uv_layers:
        raise RuntimeError("Smart UV projection produced no UV layer")


def bake_base_color(high: bpy.types.Object, low: bpy.types.Object, output: Path, texture_size: int, cage: float) -> bpy.types.Image:
    image = bpy.data.images.new(f"{low.name} Base Color", width=texture_size, height=texture_size, alpha=False)
    image.colorspace_settings.name = "sRGB"
    runtime_material = make_runtime_baked_material(image)
    low.data.materials.clear()
    low.data.materials.append(runtime_material)
    texture_node = next(node for node in runtime_material.node_tree.nodes if node.type == "TEX_IMAGE")
    runtime_material.node_tree.nodes.active = texture_node

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.use_cage = True
    scene.render.bake.cage_extrusion = cage
    scene.render.bake.max_ray_distance = cage * 4.0
    scene.render.bake.margin = 8
    for item in bpy.context.view_layer.objects:
        if item:
            item.select_set(False)
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(
        type="DIFFUSE",
        pass_filter={"COLOR"},
        target="IMAGE_TEXTURES",
        save_mode="INTERNAL",
        use_clear=True,
        use_selected_to_active=True,
        use_cage=True,
        cage_extrusion=cage,
        max_ray_distance=cage * 4.0,
        margin=8,
    )
    image.filepath_raw = str(output)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def export_glb(obj: bpy.types.Object, destination: Path) -> None:
    for item in bpy.context.view_layer.objects:
        if item:
            item.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", use_selection=True)


def roundtrip(destination: Path) -> dict:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(destination))
    imported = [item for item in bpy.context.scene.objects if item not in before and item.type == "MESH"]
    if not imported:
        raise RuntimeError(f"No mesh after GLB round trip: {destination}")
    values = {"vertices": 0, "triangles": 0, "materials": 0, "uv_layers": [], "validation_changed": False}
    uv_layers: set[str] = set()
    for item in imported:
        values["validation_changed"] = validate(item.data) or values["validation_changed"]
        values["vertices"] += len(item.data.vertices)
        values["triangles"] += triangles(item.data)
        values["materials"] += len(item.data.materials)
        uv_layers.update(layer.name for layer in item.data.uv_layers)
    for item in imported:
        bpy.data.objects.remove(item, do_unlink=True)
    bpy.context.view_layer.update()
    values["uv_layers"] = sorted(uv_layers)
    return values


def main() -> None:
    options = parse_args()
    if not options.diagnostic_experiment:
        raise ValueError("This known fidelity-risk bake route is diagnostic-only; pass --diagnostic-experiment to run it.")
    source_path = absolute(options.input, "--input")
    output_dir = absolute(options.output_dir, "--output-dir")
    if not source_path.is_file() or source_path.suffix.lower() != ".glb":
        raise ValueError("--input must be an existing .glb")
    targets = sorted({int(value.strip()) for value in options.targets.split(",") if value.strip()})
    if not targets or min(targets) <= 0:
        raise ValueError("--targets must contain positive values")
    if output_dir.exists():
        raise ValueError(f"Refusing to reuse output directory: {output_dir}")
    if len({target // 1000 for target in targets}) != len(targets):
        raise ValueError("--targets would create duplicate output filenames; use separate runs")
    output_dir.mkdir(parents=True)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(source_path))
    sources = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(sources) != 1:
        raise RuntimeError(f"Expected one source mesh, got {len(sources)}")
    high = sources[0]
    high.name = "Untouched high source for Base Color bake"
    if len(high.data.materials) != 1 or not high.data.materials[0]:
        raise RuntimeError("Expected exactly one source material")
    source_mesh = sources[0].data
    welded_base, tolerance, weld_repaired = welded_mesh(source_mesh)
    extent = max_extent(source_mesh)
    cage = max(extent * 0.02, 0.001)
    collection = bpy.data.collections.new("Baked mobile candidates")
    bpy.context.scene.collection.children.link(collection)
    variants = []
    for target in targets:
        mesh = welded_base.copy()
        low = bpy.data.objects.new(f"Mossling baked mobile {target}", mesh)
        low.matrix_world = high.matrix_world.copy()
        collection.objects.link(low)
        ratio, pre_export_triangles, qem_repaired = apply_qem(low, target)
        fresh_smart_uv(low)
        png = output_dir / f"mossling-{target // 1000}k-basecolor.png"
        image = bake_base_color(high, low, png, options.texture_size, cage)
        glb = output_dir / f"mossling-{target // 1000}k-baked.glb"
        export_glb(low, glb)
        variants.append({
            "target_triangles": target,
            "qem_ratio": ratio,
            "pre_export_triangles": pre_export_triangles,
            "qem_validation_repaired_disposable_copy": qem_repaired,
            "fresh_uv_layer": low.data.uv_layers.active.name,
            "baked_base_color_png": png.name,
            "baked_base_color_bytes": png.stat().st_size,
            "glb": glb.name,
            "glb_bytes": glb.stat().st_size,
            "roundtrip": roundtrip(glb),
            "base_color_image": {"name": image.name, "width": image.size[0], "height": image.size[1], "colorspace": image.colorspace_settings.name},
        })
    report = {
        "source_glb": str(source_path),
        "source_sha256": file_hash(source_path),
        "source_triangles": triangles(source_mesh),
        "source_vertices": len(source_mesh.vertices),
        "derivation": {
            "diagnostic_status": "unapproved: fresh UV baking visibly lost eye, flower, and leaf detail in the 1024 Mossling trial.",
            "position_weld_tolerance": tolerance,
            "weld_validation_repaired_disposable_copy": weld_repaired,
            "qem": "Blender collapse decimate on welded disposable mesh",
            "uv": "Fresh Smart UV projection after QEM",
            "bake": "Cycles CPU selected-to-active Diffuse Color/Base Color from untouched high source",
            "bake_texture_size": options.texture_size,
            "cage_extrusion": cage,
            "max_ray_distance": cage * 4.0,
            "runtime_material": "One baked Base Color texture, metallic 0, Specular IOR Level 0, coat 0, roughness 0.9",
        },
        "variants": variants,
    }
    with (output_dir / "baked-derivation.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "baked-mobile-derivation.blend"))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
