import bpy
print('COLLECTIONS', [(c.name, len(c.objects)) for c in bpy.data.collections])
for o in bpy.data.objects:
    if o.type == 'MESH': print('MESH', o.name, [c.name for c in o.users_collection], len(o.data.vertices), len(o.data.polygons))
