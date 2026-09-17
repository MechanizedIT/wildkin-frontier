# Export only the retained R4 collection as a two-material static runtime derivative.
# The source blend is opened read-only; all selection/material changes are process-local.
import bpy, os, sys
out = os.path.abspath(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1 else None
if not out: raise RuntimeError('Expected -- <absolute-output-glb>')
collection=bpy.data.collections.get('R4_repaired')
if not collection or len(collection.objects) != 16: raise RuntimeError('Expected the 16-object R4_repaired collection')
wood=bpy.data.materials.get('r4_wood2'); cap=bpy.data.materials.get('r4_linear_cap1')
if not wood or not cap: raise RuntimeError('Expected reviewed R4 wood/cap materials')
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.type != 'MESH': raise RuntimeError(f'Unexpected R4 object {obj.name}:{obj.type}')
    original=[slot.material.name if slot.material else '' for slot in obj.material_slots]
    for slot in obj.material_slots: slot.material=wood
    # Preserve all meshes/faces; only cap/underside faces retain the violet material.
    if cap.name in original or 'r4_linear_underside' in original:
        obj.data.materials.append(cap)
        capIndex=len(obj.data.materials)-1
        for polygon in obj.data.polygons:
            old=original[polygon.material_index] if polygon.material_index < len(original) else ''
            polygon.material_index=capIndex if old.startswith('r4_linear_cap') or old=='r4_linear_underside' else 0
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
    export_materials='EXPORT', export_normals=True, export_tangents=False, export_yup=True)
if not os.path.isfile(out) or os.path.getsize(out)<=0: raise RuntimeError('GLB export missing')
print(f'EXPORTED_R4_RUNTIME_DERIVATIVE {out} bytes={os.path.getsize(out)} objects={len(collection.objects)} materials=2')
