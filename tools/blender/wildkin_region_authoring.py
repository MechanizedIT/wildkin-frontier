bl_info = {
    "name": "Wildkin Region Authoring",
    "author": "Wildkin Frontier",
    "version": (0, 2, 0),
    "blender": (4, 2, 0),
    "location": "3D View > Sidebar > Wildkin",
    "description": "Author Wildkin Frontier habitat terrain, asset placements, unique geometry, and gameplay markers in Blender",
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

COLLECTIONS = (
    "WK_GUIDES",
    "WK_TERRAIN",
    "WK_STATIC",
    "WK_UNIQUE",
    "WK_GAMEPLAY",
    "WK_ALWAYS",
)


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


def custom_primitive_props(obj):
    result = {}
    for key in obj.keys():
        if key == "_RNA_UI":
            continue
        value = obj[key]
        if isinstance(value, (str, int, float, bool)) or value is None:
            result[key] = value
    return result


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


def sample_reference_height(reference, x, z, field="currentHeights"):
    values = reference.get(field) or []
    nx = int(reference.get("nx", 0))
    nz = int(reference.get("nz", 0))
    step = float(reference.get("step", 1.0))
    x0 = float(reference.get("x0", 0.0))
    z0 = float(reference.get("z0", 0.0))
    if nx < 2 or nz < 2 or len(values) != nx * nz or step <= 0:
        return 0.0
    fx = max(0.0, min(nx - 1.000001, (x - x0) / step))
    fz = max(0.0, min(nz - 1.000001, (z - z0) / step))
    ix = min(nx - 2, int(math.floor(fx)))
    iz = min(nz - 2, int(math.floor(fz)))
    tx = fx - ix
    tz = fz - iz
    def h(dx, dz):
        return float(values[(iz + dz) * nx + (ix + dx)])
    a, b, c, d = h(0, 0), h(1, 0), h(0, 1), h(1, 1)
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz


def create_reference_mesh(collection, name, reference, field):
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    values = reference.get(field) or []
    nx = int(reference.get("nx", 0))
    nz = int(reference.get("nz", 0))
    step = float(reference.get("step", 1.0))
    x0 = float(reference.get("x0", 0.0))
    z0 = float(reference.get("z0", 0.0))
    if nx < 2 or nz < 2 or len(values) != nx * nz:
        raise ValueError(f"{field} does not match reference dimensions")
    vertices = []
    for iz in range(nz):
        gz = z0 + iz * step
        for ix in range(nx):
            gx = x0 + ix * step
            vertices.append(game_to_blender(gx, float(values[iz * nx + ix]), gz))
    faces = []
    for iz in range(nz - 1):
        for ix in range(nx - 1):
            a = iz * nx + ix
            b = a + 1
            c = a + nx
            d = c + 1
            faces.append((a, c, b))
            faces.append((b, c, d))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.hide_render = True
    obj["wk_terrain_reference"] = field
    collection.objects.link(obj)
    return obj


def project_guides_to_reference(guides, reference):
    for obj in guides.objects:
        if obj.name in {"GUIDE_CURRENT_TERRAIN", "GUIDE_BASE_TERRAIN"}:
            continue
        if obj.type == "EMPTY":
            game = blender_to_game(obj.location)
            obj.location.z = sample_reference_height(reference, game["x"], game["z"]) + 0.35
        elif obj.type == "CURVE":
            for spline in obj.data.splines:
                for point in spline.points:
                    gx = float(point.co.x)
                    gz = float(-point.co.y)
                    point.co.z = sample_reference_height(reference, gx, gz) + 0.25


def copy_reference_to_terrain(source, terrain_collection):
    if source is None or source.type != "MESH":
        raise ValueError("Load a current terrain reference first")
    copy = source.copy()
    copy.data = source.data.copy()
    copy.name = "Rootbound_Sculpt_Terrain"
    copy.hide_render = False
    copy["wk_authored_terrain"] = True
    terrain_collection.objects.link(copy)
    return copy


def recursive_objects(collection):
    return list(collection.all_objects) if collection else []


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    active = None
    for obj in objects:
        if obj.name in bpy.context.view_layer.objects:
            obj.hide_set(False)
            obj.select_set(True)
            active = active or obj
    if active:
        bpy.context.view_layer.objects.active = active


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


def chunk_for_game_position(position, chunk_size):
    return {
        "cx": math.floor(position["x"] / chunk_size),
        "cz": math.floor(position["z"] / chunk_size),
    }


def marker_payload(obj):
    custom = custom_primitive_props(obj)
    return {
        "name": obj.name,
        "type": custom.pop("wk_type", "marker"),
        "id": custom.pop("wk_id", obj.name),
        "position": blender_to_game(obj.matrix_world.translation),
        "properties": custom,
    }


def placement_payload(obj, chunk_size):
    custom = custom_primitive_props(obj)
    asset_id = custom.pop("wk_asset_id", None)
    if not asset_id:
        return None
    position = blender_to_game(obj.matrix_world.translation)
    scale = obj.matrix_world.to_scale()
    rotation = obj.matrix_world.to_euler("XYZ")
    uniform_scale = (abs(scale.x) + abs(scale.y) + abs(scale.z)) / 3.0
    return {
        "name": obj.name,
        "id": custom.pop("wk_id", obj.name),
        "assetId": asset_id,
        "position": position,
        # Wildkin scenery is currently upright/yaw-authored. Blender Z rotation
        # maps to Three.js Y yaw under this project's X/-Z/Y convention.
        "yaw": float(rotation.z),
        "uniformScale": float(uniform_scale),
        "scale3": {"x": float(scale.x), "y": float(scale.z), "z": float(scale.y)},
        "chunk": chunk_for_game_position(position, chunk_size),
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


class WK_OT_import_terrain_reference(Operator, ImportHelper):
    bl_idname = "wk.import_terrain_reference"
    bl_label = "Load Terrain Reference"
    bl_description = "Load sampled Wildkin terrain and drape the guides onto the actual current surface"
    filename_ext = ".json"
    filter_glob: StringProperty(default="*.json", options={"HIDDEN"})

    def execute(self, context):
        try:
            with open(self.filepath, "r", encoding="utf-8") as handle:
                reference = json.load(handle)
            guides = ensure_collection("WK_GUIDES")
            current = create_reference_mesh(guides, "GUIDE_CURRENT_TERRAIN", reference, "currentHeights")
            base = create_reference_mesh(guides, "GUIDE_BASE_TERRAIN", reference, "baseHeights")
            base.hide_set(True)
            current.display_type = "SOLID"
            project_guides_to_reference(guides, reference)
            context.view_layer.objects.active = current
            current.select_set(True)
            self.report({"INFO"}, "Loaded current terrain; base terrain is hidden in WK_GUIDES")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, f"Could not load terrain reference: {exc}")
            return {"CANCELLED"}


class WK_OT_create_sculpt_terrain(Operator):
    bl_idname = "wk.create_sculpt_terrain"
    bl_label = "Create Sculpt Terrain from Reference"
    bl_description = "Duplicate the sampled current terrain into WK_TERRAIN as an editable starting mesh"

    def execute(self, context):
        source = bpy.data.objects.get("GUIDE_CURRENT_TERRAIN")
        try:
            terrain = copy_reference_to_terrain(source, ensure_collection("WK_TERRAIN"))
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}
        select_only([terrain])
        self.report({"INFO"}, "Created editable Rootbound_Sculpt_Terrain in WK_TERRAIN")
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
    bl_description = "Export terrain, reusable asset placements, unique chunk geometry, and gameplay metadata"

    def execute(self, context):
        settings = context.scene.wk_region
        collections = ensure_layout()
        output_root = Path(bpy.path.abspath(settings.output_root)).resolve()
        region_root = output_root / settings.region_id
        unique_root = region_root / "unique-chunks"
        region_root.mkdir(parents=True, exist_ok=True)
        unique_root.mkdir(parents=True, exist_ok=True)

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

        placements = []
        missing_asset_ids = []
        for obj in recursive_objects(collections["WK_STATIC"]):
            placement = placement_payload(obj, settings.chunk_size)
            if placement is None:
                missing_asset_ids.append(obj.name)
            else:
                placements.append(placement)

        grouped_unique = {}
        for obj in recursive_objects(collections["WK_UNIQUE"]):
            if obj.type not in {"MESH", "CURVE", "EMPTY"}:
                continue
            game_pos = blender_to_game(obj.matrix_world.translation)
            chunk = chunk_for_game_position(game_pos, settings.chunk_size)
            grouped_unique.setdefault((chunk["cx"], chunk["cz"]), []).append(obj)

        unique_chunks = []
        for (cx, cz), objects in sorted(grouped_unique.items()):
            filename = f"{cx}_{cz}.glb"
            if export_glb(unique_root / filename, objects):
                unique_chunks.append({
                    "cx": cx,
                    "cz": cz,
                    "path": f"assets/world-authored/{settings.region_id}/unique-chunks/{filename}",
                })

        markers = [marker_payload(obj) for obj in recursive_objects(collections["WK_GAMEPLAY"])]
        manifest = {
            "schemaVersion": 1,
            "regionId": settings.region_id,
            "chunkSize": settings.chunk_size,
            "bounds": config.get("bounds"),
            "assets": assets,
            "placements": sorted(placements, key=lambda item: (item["chunk"]["cz"], item["chunk"]["cx"], item["id"])),
            "uniqueChunks": unique_chunks,
            "markers": markers,
            "coordinateConvention": "Three.js X/Y-up/Z; authored in Blender X/-Z/Y",
        }
        with open(region_root / "manifest.json", "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, indent=2)
            handle.write("\n")

        bpy.ops.object.select_all(action="DESELECT")
        if missing_asset_ids:
            self.report({"WARNING"}, f"Exported, but {len(missing_asset_ids)} WK_STATIC objects lack wk_asset_id")
        else:
            self.report({"INFO"}, f"Exported {settings.region_id}: {len(placements)} placements, {len(unique_chunks)} unique chunks, {len(markers)} markers")
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
        layout.operator("wk.import_terrain_reference", icon="MESH_GRID")
        layout.operator("wk.create_sculpt_terrain", icon="SCULPTMODE_HLT")
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
        layout.label(text="WK_STATIC: reusable asset placements")
        layout.label(text="WK_UNIQUE: streamed unique geometry")
        layout.label(text="WK_GAMEPLAY: marker empties")
        layout.label(text="WK_ALWAYS: hero/always-loaded art")


classes = (
    WKRegionSettings,
    WK_OT_initialize,
    WK_OT_import_config,
    WK_OT_import_terrain_reference,
    WK_OT_create_sculpt_terrain,
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
