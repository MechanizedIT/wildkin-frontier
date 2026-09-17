bl_info = {
    "name": "Wildkin Region Authoring",
    "author": "Wildkin Frontier",
    "version": (0, 1, 0),
    "blender": (4, 2, 0),
    "location": "3D View > Sidebar > Wildkin",
    "description": "Author Wildkin Frontier habitat terrain, streamed scenery, and gameplay markers in Blender",
    "category": "3D View",
}

import bpy
import json
import math
import os
from pathlib import Path
from bpy.props import StringProperty, FloatProperty, PointerProperty
from bpy.types import Operator, Panel, PropertyGroup
from bpy_extras.io_utils import ImportHelper

COLLECTIONS = ("WK_GUIDES", "WK_TERRAIN", "WK_STATIC", "WK_GAMEPLAY", "WK_ALWAYS")


def ensure_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def ensure_layout():
    return {name: ensure_collection(name) for name in COLLECTIONS}


def game_to_blender(x, y, z):
    # Wildkin / glTF ground plane is X/Z with Y up.
    # Blender is X/Y with Z up. Keep X and height intuitive in Blender.
    return (float(x), -float(z), float(y))


def blender_to_game(location):
    return {
        "x": float(location.x),
        "y": float(location.z),
        "z": float(-location.y),
    }


def clear_guides(collection):
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def make_guide_empty(collection, name, x, z, elevation=0.0, display="PLAIN_AXES", size=1.5):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = display
    obj.empty_display_size = size
    obj.location = game_to_blender(x, elevation, z)
    obj.hide_render = True
    collection.objects.link(obj)
    return obj


def make_route_curve(collection, name, points):
    curve_data = bpy.data.curves.new(name=name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = 0.12
    curve_data.bevel_resolution = 0
    spline = curve_data.splines.new("POLY")
    spline.points.add(max(0, len(points) - 1))
    for index, point in enumerate(points):
        x, y, z = game_to_blender(point["x"], point.get("elevation", 0.0), point["z"])
        spline.points[index].co = (x, y, z, 1.0)
    obj = bpy.data.objects.new(name, curve_data)
    obj.hide_render = True
    collection.objects.link(obj)
    return obj


def make_bounds(collection, bounds):
    min_x, max_x = bounds["minX"], bounds["maxX"]
    min_z, max_z = bounds["minZ"], bounds["maxZ"]
    points = [
        {"x": min_x, "z": min_z}, {"x": max_x, "z": min_z},
        {"x": max_x, "z": max_z}, {"x": min_x, "z": max_z},
        {"x": min_x, "z": min_z},
    ]
    return make_route_curve(collection, "GUIDE_REGION_BOUNDS", points)


def recursive_objects(collection):
    return list(collection.all_objects) if collection else []


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        if obj.name in bpy.context.view_layer.objects:
            obj.hide_set(False)
            obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def export_glb(filepath, objects):
    exportable = [obj for obj in objects if obj.type in {"MESH", "CURVE", "EMPTY"}]
    if not exportable:
        return False
    select_only(exportable)
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    return True


def marker_payload(obj):
    custom = {}
    for key in obj.keys():
        if key == "_RNA_UI":
            continue
        value = obj[key]
        if isinstance(value, (str, int, float, bool)) or value is None:
            custom[key] = value
    return {
        "name": obj.name,
        "type": custom.pop("wk_type", "marker"),
        "id": custom.pop("wk_id", obj.name),
        "position": blender_to_game(obj.matrix_world.translation),
        "properties": custom,
    }


class WKRegionSettings(PropertyGroup):
    region_id: StringProperty(name="Region ID", default="rootbound-wildwood")
    chunk_size: FloatProperty(name="Chunk Size", default=50.0, min=1.0)
    config_path: StringProperty(name="Region Config", subtype="FILE_PATH")
    output_root: StringProperty(
        name="Export Root",
        description="Repository output directory, usually assets/world-authored",
        subtype="DIR_PATH",
        default="//exports",
    )


class WK_OT_initialize(Operator):
    bl_idname = "wk.initialize_region"
    bl_label = "Initialize Wildkin Collections"
    bl_description = "Create the standard Wildkin authoring collections"

    def execute(self, context):
        ensure_layout()
        self.report({"INFO"}, "Wildkin collections ready")
        return {"FINISHED"}


class WK_OT_import_config(Operator, ImportHelper):
    bl_idname = "wk.import_region_config"
    bl_label = "Load Region Config"
    bl_description = "Load a region authoring JSON and create non-exported guides"
    filename_ext = ".json"
    filter_glob: StringProperty(default="*.json", options={"HIDDEN"})

    def execute(self, context):
        settings = context.scene.wk_region
        try:
            with open(self.filepath, "r", encoding="utf-8") as handle:
                config = json.load(handle)
        except Exception as exc:
            self.report({"ERROR"}, f"Could not read config: {exc}")
            return {"CANCELLED"}

        collections = ensure_layout()
        guides = collections["WK_GUIDES"]
        clear_guides(guides)
        settings.config_path = self.filepath
        settings.region_id = config.get("regionId", settings.region_id)
        settings.chunk_size = float(config.get("chunkSize", settings.chunk_size))

        bounds = config.get("bounds")
        if bounds:
            make_bounds(guides, bounds)

        for item in config.get("subregions", []):
            obj = make_guide_empty(
                guides,
                f"GUIDE_ZONE_{item.get('id', 'zone')}",
                item.get("x", 0), item.get("z", 0), 0,
                display="SPHERE", size=max(2.0, min(item.get("radiusX", 8), item.get("radiusZ", 8)) * 0.18),
            )
            obj["wk_guide_label"] = item.get("label", item.get("id", "zone"))

        primary = config.get("primaryRoute", [])
        optional = config.get("optionalRoute", [])
        if primary:
            make_route_curve(guides, "GUIDE_PRIMARY_ROUTE", primary)
        if optional:
            make_route_curve(guides, "GUIDE_OPTIONAL_ROUTE", optional)

        for item in config.get("gameplaySeeds", []):
            obj = make_guide_empty(
                guides,
                f"GUIDE_{item.get('type', 'marker')}_{item.get('id', 'seed')}",
                item.get("x", 0), item.get("z", 0), item.get("elevation", 0),
                display="CUBE", size=0.8,
            )
            obj["wk_guide_type"] = item.get("type", "marker")

        self.report({"INFO"}, f"Loaded guides for {settings.region_id}")
        return {"FINISHED"}


class WK_OT_add_marker(Operator):
    bl_idname = "wk.add_gameplay_marker"
    bl_label = "Add Gameplay Marker"
    bl_description = "Add an Empty to WK_GAMEPLAY at the 3D cursor"

    def execute(self, context):
        collection = ensure_collection("WK_GAMEPLAY")
        obj = bpy.data.objects.new("gameplay-marker", None)
        obj.empty_display_type = "ARROWS"
        obj.empty_display_size = 0.75
        obj.location = context.scene.cursor.location
        obj["wk_type"] = "marker"
        obj["wk_id"] = "change-me"
        collection.objects.link(obj)
        context.view_layer.objects.active = obj
        obj.select_set(True)
        return {"FINISHED"}


class WK_OT_export_region(Operator):
    bl_idname = "wk.export_region"
    bl_label = "Export Wildkin Region"
    bl_description = "Export terrain, always-loaded art, streamed static chunks, and gameplay metadata"

    def execute(self, context):
        settings = context.scene.wk_region
        collections = ensure_layout()
        output_root = Path(bpy.path.abspath(settings.output_root)).resolve()
        region_root = output_root / settings.region_id
        chunks_root = region_root / "chunks"
        region_root.mkdir(parents=True, exist_ok=True)
        chunks_root.mkdir(parents=True, exist_ok=True)

        config = {}
        config_path = bpy.path.abspath(settings.config_path) if settings.config_path else ""
        if config_path and os.path.isfile(config_path):
            with open(config_path, "r", encoding="utf-8") as handle:
                config = json.load(handle)

        assets = {}
        terrain_objects = recursive_objects(collections["WK_TERRAIN"])
        if export_glb(region_root / "terrain.glb", terrain_objects):
            assets["terrain"] = f"assets/world-authored/{settings.region_id}/terrain.glb"

        always_objects = recursive_objects(collections["WK_ALWAYS"])
        if export_glb(region_root / "always.glb", always_objects):
            assets["always"] = f"assets/world-authored/{settings.region_id}/always.glb"

        grouped = {}
        for obj in recursive_objects(collections["WK_STATIC"]):
            if obj.type not in {"MESH", "CURVE", "EMPTY"}:
                continue
            game_pos = blender_to_game(obj.matrix_world.translation)
            cx = math.floor(game_pos["x"] / settings.chunk_size)
            cz = math.floor(game_pos["z"] / settings.chunk_size)
            grouped.setdefault((cx, cz), []).append(obj)

        chunk_records = []
        for (cx, cz), objects in sorted(grouped.items()):
            filename = f"{cx}_{cz}.glb"
            if export_glb(chunks_root / filename, objects):
                chunk_records.append({
                    "cx": cx,
                    "cz": cz,
                    "path": f"assets/world-authored/{settings.region_id}/chunks/{filename}",
                })

        markers = [marker_payload(obj) for obj in recursive_objects(collections["WK_GAMEPLAY"])]
        manifest = {
            "schemaVersion": 1,
            "regionId": settings.region_id,
            "chunkSize": settings.chunk_size,
            "bounds": config.get("bounds"),
            "assets": assets,
            "chunks": chunk_records,
            "markers": markers,
            "coordinateConvention": "Three.js X/Y-up/Z; exported from Blender X/-Z/Y",
        }
        with open(region_root / "manifest.json", "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, indent=2)
            handle.write("\n")

        bpy.ops.object.select_all(action="DESELECT")
        self.report({"INFO"}, f"Exported {settings.region_id}: {len(chunk_records)} chunks, {len(markers)} markers")
        return {"FINISHED"}


class WK_PT_region_authoring(Panel):
    bl_label = "Wildkin Region"
    bl_idname = "WK_PT_region_authoring"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Wildkin"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.wk_region
        layout.operator("wk.initialize_region", icon="OUTLINER_COLLECTION")
        layout.operator("wk.import_region_config", icon="FILE_FOLDER")
        layout.separator()
        layout.prop(settings, "region_id")
        layout.prop(settings, "chunk_size")
        layout.prop(settings, "config_path")
        layout.prop(settings, "output_root")
        layout.separator()
        layout.operator("wk.add_gameplay_marker", icon="EMPTY_ARROWS")
        layout.operator("wk.export_region", icon="EXPORT")
        layout.separator()
        layout.label(text="WK_TERRAIN: sculpted habitat mesh")
        layout.label(text="WK_STATIC: streamed scenery")
        layout.label(text="WK_GAMEPLAY: marker empties")
        layout.label(text="WK_ALWAYS: hero/always-loaded art")


classes = (
    WKRegionSettings,
    WK_OT_initialize,
    WK_OT_import_config,
    WK_OT_add_marker,
    WK_OT_export_region,
    WK_PT_region_authoring,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.wk_region = PointerProperty(type=WKRegionSettings)


def unregister():
    del bpy.types.Scene.wk_region
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
