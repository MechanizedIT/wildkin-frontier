# Export the immutable R4 collection with its reviewed per-face palette retained in COLOR_0.
# No source blend is saved; topology, object transforms, and 16 source meshes are unchanged.
import bpy, os, sys
out = os.path.abspath(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1 else None
if not out: raise RuntimeError('Expected -- <absolute-output-glb>')
collection=bpy.data.collections.get('R4_repaired')
if not collection or len(collection.objects) != 16: raise RuntimeError('Expected the 16-object R4_repaired collection')
mat=bpy.data.materials.new('LanternR4RuntimeVertexColors'); mat.use_nodes=True
nodes=mat.node_tree.nodes; nodes.clear(); outNode=nodes.new('ShaderNodeOutputMaterial'); bsdf=nodes.new('ShaderNodeBsdfPrincipled'); color=nodes.new('ShaderNodeVertexColor'); color.layer_name='COLOR_0'
bsdf.inputs['Roughness'].default_value=1.0; mat.node_tree.links.new(color.outputs['Color'],bsdf.inputs['Base Color']); mat.node_tree.links.new(bsdf.outputs['BSDF'],outNode.inputs['Surface']); mat.diffuse_color=(1,1,1,1)
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.type != 'MESH': raise RuntimeError(f'Unexpected R4 object {obj.name}:{obj.type}')
    mesh=obj.data; original=[tuple(slot.material.diffuse_color) if slot.material else (1,1,1,1) for slot in obj.material_slots]
    if not original: raise RuntimeError(f'No source material on {obj.name}')
    attr=mesh.color_attributes.get('COLOR_0') or mesh.color_attributes.new('COLOR_0','FLOAT_COLOR','CORNER')
    for polygon in mesh.polygons:
        rgba=original[polygon.material_index] if polygon.material_index < len(original) else original[0]
        for loop_index in polygon.loop_indices: attr.data[loop_index].color=rgba
    mesh.materials.clear(); mesh.materials.append(mat)
    for polygon in mesh.polygons: polygon.material_index=0
    obj.select_set(True); bpy.context.view_layer.objects.active=obj
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_materials='EXPORT', export_normals=True, export_tangents=False, export_yup=True)
if not os.path.isfile(out) or os.path.getsize(out)<=0: raise RuntimeError('GLB export missing')
print(f'EXPORTED_R4_RUNTIME_VERTEX_COLOR {out} bytes={os.path.getsize(out)} objects={len(collection.objects)} materials=1 color_attribute=COLOR_0')
