"""Bounded native-Blender three-pose Mossling study. Execute functions via MCP.

No geometry, topology, UV, texture, shipping asset or source action changes.
This script intentionally does not bake a full gait or an animation library.
"""
import bpy
import hashlib
import json
import math
import struct
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

ROOT = Path('C:/Users/cwood/Documents/mobile-rpg')
SOURCE = ROOT / '.dream-loop/overnight-mossling-motion/retarget-v2'
OUT = ROOT / '.dream-loop/overnight-mossling-motion/volume-v3'
FRAMES = {'neutral': None, 'loaded-extension': 0.0, 'gathered-phase04': 28 * 3 / 11}
RIG = 'MosslingDirectRig'
MESH = 'mossling-neutral-textured-20000'

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def mesh_identity(mesh):
    h = hashlib.sha256()
    for v in mesh.data.vertices:
        h.update(struct.pack('<3f', *v.co))
    for p in mesh.data.polygons:
        h.update(struct.pack('<3I', *p.vertices))
    for uv in mesh.data.uv_layers.active.data:
        h.update(struct.pack('<2f', *uv.uv))
    return {'vertices': len(mesh.data.vertices), 'triangles':len(mesh.data.polygons), 'geometry_uv_sha256':h.hexdigest()}

def set_pose(name, repaired=False):
    rig = bpy.data.objects[RIG]
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    if FRAMES[name] is not None:
        for bone in sorted(rig.pose.bones, key=lambda b:len(b.parent_recursive)):
            bone.matrix = POSES[name][bone.name].copy()
            bpy.context.view_layer.update()
    bpy.context.view_layer.update()
    if repaired and name != 'neutral':
        repair_pose(name)

def setup():
    global POSES, REPORT, BASE_WEIGHTS
    assert sha(SOURCE / 'model.glb') == '8f5ad0f2ba70eeda2d012af7a23794031054c82abff7649372530f0bed2c4561'
    OUT.mkdir(exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'mossling-retarget.blend'))
    rig = bpy.data.objects[RIG]
    mesh=bpy.data.objects[MESH]
    BASE_WEIGHTS={v.index:{mesh.vertex_groups[g.group].name:g.weight for g in v.groups} for v in mesh.data.vertices}
    POSES = {}
    rig.animation_data.action = bpy.data.actions['Run']
    for name, frame in FRAMES.items():
        if frame is None: continue
        bpy.context.scene.frame_set(int(frame), subframe=frame-int(frame))
        POSES[name] = {b.name:b.matrix.copy() for b in rig.pose.bones}
    REPORT = {'source_blend_sha256':sha(SOURCE/'mossling-retarget.blend'), 'source_glb_sha256':sha(SOURCE/'model.glb'), 'source_identity':mesh_identity(bpy.data.objects[MESH]), 'bone_count':len(rig.data.bones), 'frames':FRAMES}
    for obj in bpy.context.scene.objects:
        if obj.name not in (RIG, MESH): obj.hide_render = True
    scene=bpy.context.scene
    scene.render.engine='BLENDER_WORKBENCH'
    scene.render.resolution_x=512; scene.render.resolution_y=512; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.display.shading.light='STUDIO'
    scene.display.shading.color_type='TEXTURE'
    scene.display.shading.show_shadows=True
    scene.display.shading.show_cavity=False
    scene.display.shading.show_specular_highlight=False
    scene.display.shading.background_type='WORLD'
    if scene.world is None: scene.world=bpy.data.worlds.new('StudyWorld')
    scene.world.color=(.12,.15,.17)
    scene.view_settings.view_transform='Standard'
    cam_data=bpy.data.cameras.new('StudyCamera')
    cam=bpy.data.objects.new('StudyCamera',cam_data); scene.collection.objects.link(cam); scene.camera=cam
    cam.data.type='ORTHO';cam.data.ortho_scale=2.1
    set_pose('neutral')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mossling-volume-study.blend'))
    print(json.dumps(REPORT))

def camera(view):
    cam=bpy.context.scene.camera
    target=Vector((0,0,.68))
    offset={'side':Vector((4,0,0)), 'front':Vector((0,-4,0)), 'three-quarter':Vector((3,-4,1.2))}[view]
    cam.location=target+offset
    cam.rotation_euler=(-offset).to_track_quat('-Z','Y').to_euler()

def capture(stage, name, view):
    set_pose(name, repaired=stage=='after')
    camera(view)
    bpy.context.scene.render.filepath=str(OUT/f'{stage}-{name}-{view}.png')
    bpy.ops.render.render(write_still=True)
    print(bpy.context.scene.render.filepath)

def repair_pose(name):
    rig=bpy.data.objects[RIG]
    old=POSES[name]
    rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
    deform={n:(old[n]@rest[n].inverted()).to_quaternion() for n in old}
    pelvis=Quaternion().slerp(deform['pelvis'],.65)
    chest=pelvis.slerp(deform['chest'],.28)
    rotations={'pelvis':pelvis,'spine':pelvis,'chest':chest,
               'neck':chest.slerp(deform['neck'],.40),
               'head':chest.slerp(deform['head'],.50)}
    for n in ['pelvis','spine','chest','neck','head']:
        b=rig.pose.bones[n]
        matrix=rotations[n].to_matrix().to_4x4()@rest[n].to_quaternion().to_matrix().to_4x4()
        if n=='pelvis': matrix.translation=old[n].translation
        else:
            parent={'spine':'pelvis','chest':'pelvis','neck':'chest','head':'neck'}[n]
            matrix.translation=rig.pose.bones[parent].matrix@rest[parent].inverted()@rest[n].translation
        b.matrix=matrix
        bpy.context.view_layer.update()

def repair_weights():
    mesh=bpy.data.objects[MESH]
    before=BASE_WEIGHTS
    # Torso support across the ribcage/haunch. Limb influence tapers smoothly
    # below its anatomical shoulder/hip instead of owning belly triangles.
    def smooth(a,b,x):
        t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
    changed=0
    for v in mesh.data.vertices:
        p=v.co;weights=before[v.index].copy()
        if -.52 < p.y < .72 and .18 < p.z < .75:
            torso=smooth(.25,.47,p.z)
            middle=(1-smooth(.11,.26,abs(p.y-.10))) * smooth(.18,.32,p.z)
            torso=max(torso,middle)
            torso*=smooth(-.52,-.18,p.y)*(1-smooth(.52,.72,p.y))*(1-smooth(.60,.75,p.z))
            influence=sum(weights.values())
            if influence:
                for n in list(weights):
                    weights[n]*=1-torso
                blend=smooth(-.18,.37,p.y)
                weights['pelvis']=weights.get('pelvis',0)+torso*influence*blend
                weights['chest']=weights.get('chest',0)+torso*influence*(1-blend)
                changed+=1
        # Whole semantic back crown including connected surface, feather the
        # mantle base; no orientation or mesh edit is claimed to fix its shape.
        if -.03<p.y<.47 and p.z>.565:
            weights={'pelvis':1.0}
        pairs=sorted(((n,w) for n,w in weights.items() if w>1e-5),key=lambda t:-t[1])[:4]
        total=sum(w for _,w in pairs)
        for g in mesh.vertex_groups:g.remove([v.index])
        for n,w in pairs:mesh.vertex_groups[n].add([v.index],w/total,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
    for v in mesh.data.vertices:
        v.select=(-.48<v.co.y<.68 and .20<v.co.z<.56)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL',factor=.65,repeat=6,expand=0)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.update();mesh.update_tag(refresh={'DATA'});bpy.context.view_layer.update()
    REPORT['changed_torso_vertices']=changed
    REPORT['after_identity']=mesh_identity(mesh)
    assert REPORT['after_identity']==REPORT['source_identity']
    print(json.dumps({'changed_torso_vertices':changed,'identity_preserved':True}))

def finalize():
    from bpy_extras.object_utils import world_to_camera_view
    rig=bpy.data.objects[RIG];mesh=bpy.data.objects[MESH];scene=bpy.context.scene
    landmarks={}
    for name in FRAMES:
        set_pose(name,True);camera('side')
        def project(p):
            q=world_to_camera_view(scene,scene.camera,p)
            return [q.x*512,(1-q.y)*512]
        landmarks[name]={b.name:{'world':list(b.head),'point':project(b.head),'axes':[project(b.head+b.matrix.to_3x3().col[i].normalized()*.075) for i in range(3)]} for b in rig.pose.bones}
    (OUT/'landmarks.json').write_text(json.dumps(landmarks,indent=2))
    colors={'pelvis':(.05,.8,.55),'chest':(1,.35,.06),'spine':(1,.75,.1),'neck':(.8,.2,1),'head':(.9,.8,.85)}
    attr=mesh.data.color_attributes.get('StudyWeightOwnership') or mesh.data.color_attributes.new(name='StudyWeightOwnership',type='FLOAT_COLOR',domain='POINT')
    mesh.data.color_attributes.active_color=attr
    for v in mesh.data.vertices:
        color=Vector((0,0,0))
        for g in v.groups:
            name=mesh.vertex_groups[g.group].name
            rgb=colors.get(name,(.1,.35,1) if name.startswith(('front_','rear_')) else (1,.12,.3))
            color+=Vector(rgb)*g.weight
        attr.data[v.index].color=(*color,1)
    scene.display.shading.color_type='VERTEX'
    for name in FRAMES:
        set_pose(name,True);camera('side');scene.render.filepath=str(OUT/f'weights-{name}-side.png');bpy.ops.render.render(write_still=True)
    scene.display.shading.color_type='TEXTURE'
    mesh.data.color_attributes.remove(attr)
    # Retain three discrete inspection poses; original five source actions
    # remain unchanged. No time-continuous gait or contact solution is implied.
    action=bpy.data.actions.get('Study-ThreePoses') or bpy.data.actions.new('Study-ThreePoses')
    action.use_fake_user=True
    for frame,name in enumerate(FRAMES,1):
        set_pose(name,True)
        rig.animation_data.action=action
        for b in rig.pose.bones:
            b.keyframe_insert('location',frame=frame,group=b.name)
            b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
            b.keyframe_insert('scale',frame=frame,group=b.name)
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='CONSTANT'
    rig.animation_data.action=action;scene.frame_set(1);scene.frame_start=1;scene.frame_end=3
    REPORT['study_action']={'name':action.name,'frames':{'1':'neutral','2':'loaded-extension','3':'gathered-phase04'},'interpolation':'CONSTANT; inspection poses only'}
    REPORT['weights']={'max_influences':max(len([g for g in v.groups if g.weight>1e-5]) for v in mesh.data.vertices),'unweighted':sum(not v.groups for v in mesh.data.vertices),'max_normalization_error':max(abs(1-sum(g.weight for g in v.groups)) for v in mesh.data.vertices)}
    REPORT['derivative_identity']=mesh_identity(mesh)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mossling-volume-study.blend'))
    REPORT['derivative_blend_sha256']=sha(OUT/'mossling-volume-study.blend')
    REPORT['script_sha256']=sha(ROOT/'tools/art/study-mossling-deformation.py')
    REPORT['status']='FAIL: gathered torso/haunch silhouette still shears; no gait bake, export or admission'
    (OUT/'study-report.json').write_text(json.dumps(REPORT,indent=2))
    print(json.dumps(REPORT))
