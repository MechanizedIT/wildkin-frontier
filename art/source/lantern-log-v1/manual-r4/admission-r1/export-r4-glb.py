# Export only the retained R4 collection from its immutable comparison blend.
import bpy, os, sys
out = os.path.abspath(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else None
if not out: raise RuntimeError('Expected -- <absolute-output-glb>')
collection=bpy.data.collections.get('R4_repaired')
if not collection or len(collection.objects) != 16: raise RuntimeError('Expected the 16-object R4_repaired collection')
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.type != 'MESH': raise RuntimeError(f'Unexpected R4 object {obj.name}:{obj.type}')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
    export_materials='EXPORT', export_normals=True, export_tangents=False, export_yup=True)
if not os.path.isfile(out) or os.path.getsize(out) <= 0: raise RuntimeError('GLB export missing')
print(f'EXPORTED_R4_GLB {out} bytes={os.path.getsize(out)} objects={len(collection.objects)}')
