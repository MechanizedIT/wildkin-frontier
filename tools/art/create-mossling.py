"""Build and export the Mossling hero mesh.

Run with Blender 4.5 in background mode from the repository root:
  & 'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe' --background --python tools/art/create-mossling.py

The exported JS deliberately contains plain position/index arrays.  It has no
runtime Blender/GLTF dependency and keeps each matte colour group inspectable.
Axes: floor = Y 0; facing = +Z.
"""
import bpy, bmesh, os, math, json
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_JS = os.path.join(ROOT, "src", "world", "models", "mosslingMeshData.js")
OUT_BLEND = os.path.join(ROOT, "tools", "art", "source", "mossling.blend")
OUT_RENDER = os.path.join(ROOT, ".dream-loop", "mossling-blender-render.png")

COLORS = {
    "cream": "#dfc39e", "cream_light": "#fff0d4", "cream_shadow": "#c5a37d",
    "muzzle": "#f8d2a7", "ear_inner": "#d99278", "nose": "#332820",
    "eye": "#5b4030", "pupil": "#17130f", "glint": "#fff7df", "paw": "#4a3b30",
    "leaf_dark": "#214735", "leaf_mid": "#47723b", "leaf_light": "#8eae48",
    "leaf_tip": "#b6ca61", "leaf_vein": "#2d5737"
}

def material(name):
    m = bpy.data.materials.new(name)
    h = COLORS[name].lstrip('#'); m.diffuse_color = tuple(int(h[i:i+2],16)/255 for i in (0,2,4)) + (1,)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value = m.diffuse_color; p.inputs['Roughness'].default_value = .94; p.inputs['Metallic'].default_value = 0
    return m
M = {name: material(name) for name in COLORS}

def link(obj, name, mat):
    obj.name = name; obj.data.materials.append(M[mat]); bpy.context.collection.objects.link(obj); return obj

def ico(name, loc, scale, mat, sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(M[mat]); return o

def cone(name, loc, radius1, radius2, depth, mat, rot=(0,0,0), verts=6):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius1, radius2=radius2, depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(M[mat]); return o

def leaf(name, base, tip, width, mat, bend=None):
    """Closed, folded low-poly leaf with a curved centreline; never a flat sign."""
    b, t = Vector(base), Vector(tip); axis=t-b
    side=axis.cross(Vector((0,1,0)))
    if side.length < .01: side=axis.cross(Vector((1,0,0)))
    side.normalize()
    # Five curved rings, wider through the shoulder and thinning naturally at both ends.
    bend=Vector(bend) if bend else Vector((0, -.075, -.035))
    ts=(0,.22,.5,.78,1); widths=(0,.58,1,.56,0); vs=[]
    for u,w in zip(ts,widths):
        c=b+axis*u + bend*(math.sin(math.pi*u)**1.3)
        n=axis.cross(side).normalized()*(.022 + .013*w)
        vs.extend([c-side*width*w-n,c+side*width*w-n,c+side*width*w+n,c-side*width*w+n])
    faces=[]
    for r in range(4):
        a=r*4; q=a+4
        faces += [(a,a+1,q+1,a+0 if False else q), (a+1,a+2,q+2,q+1), (a+2,a+3,q+3,q+2), (a+3,a,q,q+3)]
    faces += [(0,3,2,1),(16,17,18,19)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vs,[],faces); mesh.update(); return link(bpy.data.objects.new(name,mesh),name,mat)

def almond_eye(name, center, sx, sy, mat='eye'):
    """Inset dark almond, a shallow closed mesh seated in the forward facial plane."""
    x,y,z=center; outline=[(-1,0),(-.42,.68),(.38,.55),(1,0),(.38,-.48),(-.42,-.58)]
    front=[(x+px*sx,y+py*sy,z+.008) for px,py in outline]
    back=[(x+px*sx*.9,y+py*sy*.88,z-.032) for px,py in outline]
    vs=front+back; faces=[tuple(range(6)),tuple(range(11,5,-1))]
    for i in range(6): faces.append((i,(i+1)%6,(i+1)%6+6,i+6))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vs,[],faces); mesh.update(); return link(bpy.data.objects.new(name,mesh),name,mat)

def tube(name, points, radii, mat, sides=7):
    verts=[]; faces=[]
    for i,p in enumerate(points):
        p=Vector(p); tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)]); tangent.normalize()
        u=tangent.cross(Vector((0,1,0)))
        if u.length<.01: u=tangent.cross(Vector((1,0,0)))
        u.normalize(); v=tangent.cross(u).normalized()
        for j in range(sides): verts.append(p+(u*math.cos(math.tau*j/sides)+v*math.sin(math.tau*j/sides))*radii[i])
    for i in range(len(points)-1):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces += [tuple(range(sides-1,-1,-1)), tuple((len(points)-1)*sides+j for j in range(sides))]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update(); return link(bpy.data.objects.new(name,mesh),name,mat)

def wedge(name, points, mat):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(points,[],[(0,1,2),(0,2,3),(0,4,5),(0,5,1),(1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0),(4,7,6),(4,6,5)]); mesh.update(); return link(bpy.data.objects.new(name,mesh),name,mat)

def fused_base():
    # Anatomy is intentionally volumetric: shoulder, ribcage, hips, neck and all four legs overlap then become one faceted shell.
    parts=[]
    for loc,sc in [((0,.86,-.16),(.6,.45,.76)),((0,1.04,.28),(.59,.53,.6)),((0,1.34,.59),(.5,.48,.39)),((0,1.6,.82),(.55,.42,.4)),
                   ((-.48,.42,.38),(.21,.5,.23)),((.48,.42,.38),(.21,.5,.23)),((-.5,.41,-.67),(.22,.48,.24)),((.5,.41,-.67),(.22,.48,.24))]:
        parts.append(ico('anatomy_volume',loc,sc,'cream',2))
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); body=bpy.context.object; body.name='mossling_fused_anatomy'
    rem=body.modifiers.new('voxel_joined_anatomy','REMESH'); rem.mode='VOXEL'; rem.voxel_size=.105; rem.use_smooth_shade=False; bpy.context.view_layer.objects.active=body; bpy.ops.object.modifier_apply(modifier=rem.name)
    dec=body.modifiers.new('facet_budget','DECIMATE'); dec.ratio=.68; bpy.ops.object.modifier_apply(modifier=dec.name)
    return body

def build():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    body=fused_base()
    # Grounded paws deliberately project forward, breaking the merged legs into four readable feet.
    for x,z in [(-.48,.48),(.48,.48),(-.52,-.7),(.52,-.7)]:
        ico('planted_dark_paw',(x,.13,z+.11),(.21,.11,.29),'paw',1)
        for dx in (-.06,0,.06): cone('paw_toe',(x+dx,.13,z+.31),.024,.012,.08,'cream_shadow',(math.pi/2,0,0),5)
    # Face: oversized cheek/muzzle volumes and planar ears make the creature read before mantle detail.
    # A bright, compact feline face sits forward of the darker body shell.
    ico('bright_face_plane',(0,1.56,1.08),(.48,.32,.105),'cream_light',1)
    ico('left_cheek',(-.27,1.42,1.18),(.13,.105,.06),'cream_light',1); ico('right_cheek',(.27,1.42,1.18),(.13,.105,.06),'cream_light',1)
    ico('short_lifted_muzzle',(0,1.31,1.2),(.11,.08,.07),'muzzle',1); ico('dark_nose',(0,1.36,1.275),(.035,.023,.028),'nose',1)
    for x in (-.36,.36):
        # The cream face itself is the eye rim: a single friendly almond avoids a raccoon-like dark mask.
        almond_eye('friendly_dark_almond_eye',(x,1.65,1.225),.17,.105); ico('eye_highlight',(x+(-.03 if x<0 else .03),1.695,1.24),(.029,.034,.008),'glint',1)
    for x in (-.55,.55):
        sign=1 if x>0 else -1
        # Low horizontal fox ears carry the side silhouette, instead of rabbit-like vertical spikes.
        wedge('broad_ear',[(x-sign*.1,1.68,.93),(x+sign*.37,1.6,1.04),(x+sign*.2,1.5,1.13),(x-sign*.11,1.56,1.1),(x-sign*.1,1.7,.87),(x+sign*.39,1.62,.97),(x+sign*.22,1.52,1.06),(x-sign*.11,1.58,1.04)],'cream')
        wedge('ear_inner',[(x-sign*.035,1.65,.99),(x+sign*.28,1.6,1.06),(x+sign*.16,1.55,1.105),(x-sign*.055,1.59,1.08),(x-sign*.035,1.665,.97),(x+sign*.3,1.615,1.035),(x+sign*.18,1.565,1.08),(x-sign*.055,1.605,1.06)],'ear_inner')
    # One bright, coherent cream bib separates the face/chest value group from the darker body.
    ico('bright_chest_bib',(0,1.0,.83),(.36,.5,.105),'cream_light',1)
    for x in (-.18,.18): leaf('soft_bib_tuft',(x,1.05,.92),(x*.7,.72,1.0),.11,'cream_light',(x*.04,-.04,.02))
    # Dark under-mantle wraps the shoulder and back, then a light crown layer lifts the silhouette.
    # Mantle leaves spread sideways and backward from the neck.  Their tips curl down around the shoulder contour,
    # producing a leafy volume rather than a row of upright road signs.
    dark=[(-.48,1.18,.35),(-.34,1.3,.03),(-.16,1.38,-.22),(0,1.4,-.34),(.16,1.38,-.22),(.34,1.3,.03),(.48,1.18,.35),(-.43,1.04,-.35),(.43,1.04,-.35)]
    for x,y,z in dark:
        tip=(x*1.78,y-.08,z-.17); leaf('deep_mantle_leaf',(x,y,z),tip,.19,'leaf_dark',(x*.09,-.11,-.1))
    mid=[(-.52,1.38,.43),(-.38,1.55,.3),(-.2,1.66,.2),(0,1.69,.17),(.2,1.66,.2),(.38,1.55,.3),(.52,1.38,.43),(-.32,1.38,-.08),(.32,1.38,-.08)]
    for x,y,z in mid:
        tip=(x*1.62,y+.08,z-.06); leaf('mid_mantle_leaf',(x,y,z),tip,.2,'leaf_mid',(x*.07,-.09,-.08))
    crown=[(-.31,1.77,.72),(-.15,1.87,.69),(0,1.9,.68),(.15,1.87,.69),(.31,1.77,.72)]
    for x,y,z in crown: leaf('bright_crown_leaf',(x,y,z),(x*1.25,y+.27,z+.1),.15,'leaf_light',(x*.04,-.06,-.04))
    outer=[(-.62,1.48,.58,-.92,1.53,.52),(-.58,1.28,.55,-.96,1.22,.42),(-.48,1.1,.28,-.84,1.0,.12),
           (.62,1.48,.58,.92,1.53,.52),(.58,1.28,.55,.96,1.22,.42),(.48,1.1,.28,.84,1.0,.12),
           (-.28,1.55,.5,-.52,1.72,.45),(.28,1.55,.5,.52,1.72,.45)]
    for i,(x,y,z,tx,ty,tz) in enumerate(outer): leaf('overlap_mane_leaf',(x,y,z),(tx,ty,tz),.24,['leaf_dark','leaf_mid','leaf_light'][i%3],((tx-x)*.12,-.1,-.08))
    collar=[(-.38,1.37,.87,-.66,1.18,1.02),(-.52,1.18,.7,-.78,.98,.86),(-.28,1.18,.86,-.45,.82,1.02),
            (.38,1.37,.87,.66,1.18,1.02),(.52,1.18,.7,.78,.98,.86),(.28,1.18,.86,.45,.82,1.02),
            (-.16,1.48,.84,-.33,1.32,1.06),(.16,1.48,.84,.33,1.32,1.06)]
    for i,(x,y,z,tx,ty,tz) in enumerate(collar): leaf('front_collar_leaf',(x,y,z),(tx,ty,tz),.2,['leaf_dark','leaf_mid','leaf_light','leaf_tip'][i%4],((tx-x)*.08,-.08,.025))
    # Curved, substantial tail has a woody green core and a four-leaf plume.
    tail_points=[(0,.87,-.78),(.08,1.04,-1.02),(.27,1.23,-1.13),(.47,1.28,-.98),(.53,1.15,-.78)]
    tube('curved_leaf_tail',tail_points,[.16,.15,.13,.1,.05],'leaf_mid',7)
    for i,(b,t) in enumerate([((.16,1.12,-1.03),(.32,1.38,-1.14)),((.3,1.23,-1.06),(.52,1.47,-1.04)),((.42,1.25,-.95),(.67,1.37,-.84)),((.46,1.15,-.84),(.68,1.2,-.65))]): leaf('tail_plume_leaf',b,t,.13,['leaf_dark','leaf_mid','leaf_light','leaf_tip'][i],(.04,-.06,.04))
    # A small central forehead sprig connects crown and mantle without obscuring the face.
    leaf('forehead_sprig',(0,1.8,1.19),(0,2.13,1.22),.14,'leaf_tip')

def setup_render():
    # The game uses Y-up while Blender uses Z-up.  Export remains in the game
    # basis; only this saved/rendered Blender presentation rotates the model.
    preview_root=bpy.data.objects.new('GAME_Y_UP_PREVIEW',None); bpy.context.collection.objects.link(preview_root)
    for obj in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
        obj.parent = preview_root
    preview_root.rotation_euler.x = math.pi / 2
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=900; scene.render.resolution_y=900; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.filepath=OUT_RENDER
    scene.world.use_nodes=True; scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.16,.18,.16,1); scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,-.015)); floor=bpy.context.object; floor.data.materials.append(material('cream_shadow')); floor.data.materials[0].diffuse_color=(.21,.23,.2,1)
    floor.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.21,.23,.2,1)
    bpy.ops.object.light_add(type='AREA', location=(-4,-4,7)); bpy.context.object.data.energy=1200; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=5
    bpy.ops.object.light_add(type='AREA', location=(4,-2,5)); bpy.context.object.data.energy=650; bpy.context.object.data.size=4
    # Three-quarter profile reveals the planted legs and lifted tail; face is -Y after the preview rotation.
    bpy.ops.object.camera_add(location=(-4.9,-7.5,3.1)); cam=bpy.context.object; scene.camera=cam
    target=Vector((0,0,1.05)); cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=58

def export_js():
    parts=[]; total=0
    for obj in sorted([o for o in bpy.context.scene.objects if o.type=='MESH' and o.name!='Plane'],key=lambda o:o.name):
        bpy.context.view_layer.objects.active=obj; obj.select_set(True); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); obj.select_set(False)
        mesh=obj.data; mesh.calc_loop_triangles(); verts=[]
        for v in mesh.vertices:
            p=obj.matrix_world @ v.co; verts += [round(p.x,4),round(p.y,4),round(p.z,4)]
        inds=[]
        for tri in mesh.loop_triangles: inds += list(tri.vertices)
        total += len(inds)//3; parts.append({'name':obj.name,'color':COLORS[obj.data.materials[0].name],'vertices':verts,'indices':inds})
    os.makedirs(os.path.dirname(OUT_JS),exist_ok=True)
    with open(OUT_JS,'w',encoding='utf8') as f:
        f.write('// Generated by tools/art/create-mossling.py. Floor is Y=0; Mossling faces +Z.\n')
        f.write('// Deliberate low-poly hero mesh: fused anatomy, facial planes, planted paws, layered leaf mantle.\n')
        f.write('export const MOSSLING_MESH_PARTS = '+json.dumps(parts,separators=(',',':'))+';\n')
        f.write(f'export const MOSSLING_TRIANGLE_COUNT = {total};\n')
        f.write('export const MOSSLING_BOUNDS = Object.freeze({ width: 2.05, height: 2.17, depth: 2.64, forward: "+Z" });\n')
    print('EXPORTED',OUT_JS,'triangles',total,'parts',len(parts))

build(); export_js(); setup_render(); os.makedirs(os.path.dirname(OUT_BLEND),exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND); bpy.context.scene.render.filepath=OUT_RENDER; bpy.ops.render.render(write_still=True)
