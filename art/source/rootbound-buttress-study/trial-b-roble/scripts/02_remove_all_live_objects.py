import bpy

# Some prior scene objects may be hidden and therefore skipped by selection.
# Remove only the currently live scene datablocks; this does not read or alter
# Trial A's source files.
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                   bpy.data.cameras, bpy.data.lights):
    for block in list(datablocks):
        if block.users == 0:
            datablocks.remove(block)
print({'scene': bpy.context.scene.name, 'objects': len(bpy.context.scene.objects)})
