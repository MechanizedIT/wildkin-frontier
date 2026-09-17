import bpy
for m in bpy.data.materials:
 print('MAT',m.name, tuple(round(v,6) for v in m.diffuse_color), m.use_nodes, tuple(round(v,6) for v in m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value) if m.use_nodes and m.node_tree.nodes.get('Principled BSDF') else None)
