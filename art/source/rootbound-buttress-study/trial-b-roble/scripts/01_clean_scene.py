import bpy

# Trial B owns a fresh scene only. Trial A's already saved source is not read,
# copied, or modified; this removes its live scene objects before Trial B work.
if bpy.context.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                   bpy.data.cameras, bpy.data.lights):
    for block in list(datablocks):
        if block.users == 0:
            datablocks.remove(block)
scene = bpy.context.scene
scene.name = 'Rootbound_Trial_B_RobLe_Massing'
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world.color = (0.055, 0.055, 0.055)
print({'scene': scene.name, 'objects': len(bpy.context.scene.objects)})
