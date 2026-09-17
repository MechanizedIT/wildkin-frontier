"""Derive one bounded runtime convex proxy per completed cliff GLB.

This reads the exact exported GLBs.  It does not export, modify, or render any
visual asset.  The engine currently accepts one convex hull per descriptor, so
the proxy deliberately fills only non-passable stone crevices in these scenic
rocks; the original per-chunk hull study remains alongside it.
"""
import json
import sys
from pathlib import Path

import bmesh
import bpy


OUT = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
LIMIT_VERTICES = 64
LIMIT_INDICES = 372


def gltf_point(point):
    # The GLB importer restores Blender Z-up.  Runtime GLB space is Y-up.
    return [round(point.x, 6), round(point.z, 6), round(-point.y, 6)]


def proxy_for(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ vertex.co for vertex in obj.data.vertices)
    bm = bmesh.new()
    for point in points:
        bm.verts.new(point)
    bm.verts.ensure_lookup_table()
    bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
    used = {vertex for face in bm.faces for vertex in face.verts}
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if vertex not in used], context="VERTS")
    bmesh.ops.triangulate(bm, faces=list(bm.faces), quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    indices = [vertex.index for face in bm.faces for vertex in face.verts]
    if len(bm.verts) > LIMIT_VERTICES or len(indices) > LIMIT_INDICES:
        raise RuntimeError(f"{glb.name}: hull {len(bm.verts)} vertices / {len(indices)} indices exceeds bounded descriptor")
    descriptor = {
        "asset": glb.name,
        "shape": "convexHull",
        "vertices": [value for vertex in bm.verts for value in gltf_point(vertex.co)],
        "indices": indices,
        "vertexCount": len(bm.verts),
        "indexCount": len(indices),
        "source": "convex hull of exact exported GLB mesh in runtime Y-up coordinates",
        "limitations": "This one-hull runtime proxy fills the rock's concave fissures and under-cap crevices. They are scenic, lower/narrower than player traversal clearance, and are not intended walkable openings.",
        "placement": "Use as a static scenic-cliff collider outside intended travel routes; do not substitute it for a broad AABB.",
    }
    bm.free()
    return descriptor


records = []
for glb in sorted(OUT.glob("verdant-cliff-*.glb")):
    descriptor = proxy_for(glb)
    (OUT / f"{glb.stem}-runtime-collider.json").write_text(json.dumps(descriptor, indent=2), encoding="utf-8")
    records.append({"asset": glb.name, "descriptor": f"{glb.stem}-runtime-collider.json", "vertexCount": descriptor["vertexCount"], "indexCount": descriptor["indexCount"]})
(OUT / "runtime-collider-summary.json").write_text(json.dumps({"schemaNote": "Current visual asset collider accepts one convexHull. Per-chunk study hull files remain for source reference only.", "assets": records}, indent=2), encoding="utf-8")
print(json.dumps(records, indent=2))
