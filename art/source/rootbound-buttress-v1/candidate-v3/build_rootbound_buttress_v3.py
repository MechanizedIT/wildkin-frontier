"""Final silhouette-first manual repair for the Rootbound buttress anchor."""
from __future__ import annotations
import hashlib, json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector

raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(raw) != 1: raise SystemExit('expected empty output directory')
OUT = Path(raw[0]).resolve()
if OUT.exists() and any(OUT.iterdir()): raise SystemExit(f'refusing non-empty {OUT}')
OUT.mkdir(parents=True); RENDERS = OUT / 'renders'; RENDERS.mkdir()
for obj in list(bpy.data.objects): bpy.data.objects.remove(obj, do_unlink=True)

def material():
    mat=bpy.data.materials.new('RootboundPalette'); mat.use_nodes=True
    n=mat.node_tree.nodes; n.clear(); out=n.new('ShaderNodeOutputMaterial'); bsdf=n.new('ShaderNodeBsdfPrincipled'); bsdf.inputs['Roughness'].default_value=1
    attr=n.new('ShaderNodeVertexColor'); attr.layer_name='Col'; mat.node_tree.links.new(attr.outputs['Color'],bsdf.inputs['Base Color']); mat.node_tree.links.new(bsdf.outputs['BSDF'],out.inputs['Surface']); return mat
MAT=material(); BARK=(.40,.17,.055,1); BARK_LIT=(.58,.28,.09,1); LEAF_A=(.035,.16,.09,1); LEAF_B=(.08,.30,.13,1); LEAF_C=(.28,.48,.08,1)

def mesh_obj(name, verts, faces, color):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.materials.append(MAT); mesh.update()
    layer=mesh.color_attributes.new('Col','BYTE_COLOR','CORNER')
    for item in layer.data: item.color=color
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); return obj

def loft(name, centers, radii, color, sides=9):
    verts=[]
    for ri,(center,radius) in enumerate(zip(centers,radii)):
        # Rings are intentionally irregular but all branches remain thick, faceted masses.
        for i in range(sides):
            a=2*math.pi*i/sides; jitter=1+0.12*math.sin(i*3+ri*1.7)
            verts.append((center[0]+math.cos(a)*radius*jitter,center[1]+math.sin(a)*radius*jitter,center[2]))
    faces=[]
    for r in range(len(centers)-1):
        for i in range(sides): faces.append((r*sides+i,r*sides+(i+1)%sides,(r+1)*sides+(i+1)%sides,(r+1)*sides+i))
    return mesh_obj(name,verts,faces,color)

def root_wedge(name, angle, length, color):
    # Broad, flattened wedge shares its high inner lip with the flared base and closes at ground.
    c,s=math.cos(angle),math.sin(angle); p=Vector((c,s,0)); q=Vector((-s,c,0)); inner=p*.70; outer=p*length
    verts=[tuple(inner+q*.46+Vector((0,0,.58))),tuple(inner-q*.46+Vector((0,0,.58))),tuple(inner+q*.62+Vector((0,0,.05))),tuple(inner-q*.62+Vector((0,0,.05))),tuple(outer+q*.36+Vector((0,0,.04))),tuple(outer-q*.36+Vector((0,0,.04))),tuple(outer+p*.24+Vector((0,0,.05)))]
    faces=[(0,1,3,2),(0,2,4,6),(0,6,5,1),(2,3,5,4),(4,5,6)]
    return mesh_obj(name,verts,faces,color)

def canopy(name, center, scale, color, phase):
    # Irregular closed faceted shell: three latitude bands, deliberate lobe outline, no sphere primitive.
    sides=10; levels=[(-.82,.28),(-.30,.92),(.32,1.0),(.82,.38)]; verts=[]
    for level,(height,base) in enumerate(levels):
        for i in range(sides):
            a=2*math.pi*i/sides; variation=1+.20*math.sin(i*2.2+phase)+.10*math.cos(i*4.1-phase)
            verts.append((center[0]+math.cos(a)*scale[0]*base*variation,center[1]+math.sin(a)*scale[1]*base*variation,center[2]+height*scale[2]))
    top=len(verts); verts.append((center[0]+.12*scale[0],center[1]-.08*scale[1],center[2]+scale[2]))
    bottom=len(verts); verts.append((center[0]-.10*scale[0],center[1]+.06*scale[1],center[2]-scale[2]))
    faces=[]
    for level in range(len(levels)-1):
        for i in range(sides): faces.append((level*sides+i,level*sides+(i+1)%sides,(level+1)*sides+(i+1)%sides,(level+1)*sides+i))
    for i in range(sides): faces.append((top,3*sides+i,3*sides+(i+1)%sides)); faces.append((bottom,(i+1)%sides,i))
    return mesh_obj(name,verts,faces,color)

# One flared trunk shell; unequal radii at ground form continuous buttress shoulders.
sides=10; base=[]
for i in range(sides):
    a=2*math.pi*i/sides; flare=1.02 + (.78 if i in (0,2,4,6,8) else .18)
    base.append((math.cos(a)*flare,math.sin(a)*flare,.05))
mid=[]; upper=[]
for i in range(sides):
    a=2*math.pi*i/sides; mid_r=.82+.06*math.sin(i); up_r=.52+.04*math.cos(i*2)
    mid.append((math.cos(a)*mid_r,math.sin(a)*mid_r,.72)); upper.append((math.cos(a)*up_r,math.sin(a)*up_r,2.55))
verts=base+mid+upper; faces=[]
for ring in range(2):
    for i in range(sides): faces.append((ring*sides+i,ring*sides+(i+1)%sides,(ring+1)*sides+(i+1)%sides,(ring+1)*sides+i))
mesh_obj('continuous_flared_trunk',verts,faces,BARK)
for index,(angle,length,color) in enumerate([(0,2.6,BARK_LIT),(1.35,2.25,BARK), (2.65,2.35,BARK_LIT),(4.0,2.12,BARK),(5.20,2.42,BARK_LIT)]): root_wedge(f'buttress_wedge_{index}',angle,length,color)

# Three uneven fork paths start inside the trunk and terminate hidden inside their canopy shells.
loft('fork_left',[(-.28,.02,2.20),(-.75,.12,2.95),(-1.48,.18,3.62)],[.43,.32,.19],BARK)
loft('fork_high',[(.06,.02,2.48),(.20,-.02,3.48),(.06,-.10,4.42)],[.42,.31,.17],BARK_LIT)
loft('fork_right',[(.28,-.04,2.18),(.88,-.12,2.86),(1.64,-.12,3.36)],[.40,.29,.18],BARK)

# Three separated lobes preserve fork windows from front/rear/side views.
canopy('canopy_left',(-1.48,.20,4.10),(1.42,.86,.86),LEAF_B,.4)
canopy('canopy_high',(.06,-.10,5.05),(1.20,.90,.72),LEAF_A,1.5)
canopy('canopy_right',(1.70,-.12,3.92),(1.30,.80,.78),LEAF_C,2.3)

objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
active=objects[0]
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=active; bpy.ops.object.join(); tree=bpy.context.object; tree.name='rootbound_buttress_canopy_v3'
minimum=min((tree.matrix_world@Vector(c) for c in tree.bound_box),key=lambda p:p.z).z; tree.location.z-=minimum; bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)

scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.world.color=(.94,.94,.94)
for loc,energy,size in [((4,-4,8),1000,5),((-4,2,5),600,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc); lamp=bpy.context.object; lamp.data.energy=energy; lamp.data.size=size
bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.01)); floor=bpy.context.object; floor.data.materials.append(MAT); layer=floor.data.color_attributes.new('Col','BYTE_COLOR','CORNER')
for item in layer.data:item.color=(.93,.93,.91,1)
bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera; camera.data.type='ORTHO'; camera.data.ortho_scale=7.6
def shot(name,pos,size=512):
    camera.location=pos; camera.rotation_euler=(Vector((0,0,3.0))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.resolution_x=size; scene.render.resolution_y=size; scene.render.filepath=str(RENDERS/f'{name}.png'); bpy.ops.render.render(write_still=True)
shot('front',(0,-11,4.2));shot('rear',(0,11,4.2));shot('left',(-11,0,4.2));shot('right',(11,0,4.2));shot('three_quarter',(8.2,-8.2,5.0));shot('game_96',(8.2,-8.2,5.0),96);shot('game_48',(8.2,-8.2,5.0),48)
floor.hide_render=True; floor.hide_viewport=True
bounds=[tree.matrix_world@Vector(c) for c in tree.bound_box]; mins=[min(p[i] for p in bounds) for i in range(3)]; maxs=[max(p[i] for p in bounds) for i in range(3)]; dims=[maxs[i]-mins[i] for i in range(3)]; tris=sum(len(p.vertices)-2 for p in tree.data.polygons)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'rootbound-buttress-v3.blend')); bpy.context.view_layer.objects.active=tree; tree.select_set(True); bpy.ops.export_scene.gltf(filepath=str(OUT/'rootbound-buttress-v3.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_normals=True,export_yup=True)
glb=OUT/'rootbound-buttress-v3.glb'; collider={'type':'box','coordinateSpace':'Blender source, Z-up','dimensions':[2.9,2.3,2.7],'center':[0,0,1.35],'scope':'continuous lower trunk/root core only; outer wedge tips and all canopy are non-solid','runtimeMapping':'The GLB exporter uses Y-up. An eventual runtime owner must map this source-space proposal to dimensions [2.9, 2.7, 2.3] and center [0, 1.35, 0], then refit it after placement.'}
manifest={'method':'manual-blender-silhouette-first-continuous-root-branch-canopy-rebuild-v3','reference':'../reference/target-v1.png','mesh':{'triangles':tris,'materials':1,'bounds':{'min':mins,'max':maxs,'dimensions':dims},'grounded':abs(mins[2])<.0001},'colliderProposal':collider,'glb':{'file':glb.name,'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'bytes':glb.stat().st_size}}
(OUT/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(OUT/'collider.json').write_text(json.dumps(collider,indent=2)+'\n')
