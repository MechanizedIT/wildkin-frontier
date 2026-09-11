"""Bounded intact canopy study. Blender Z up/-Y front; glTF Y up/+Z front.
No world/shipping edits. Render-only imports the exact exported GLB.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True);p.add_argument('--render-only',action='store_true')
opt=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(opt.output_dir).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
def look(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
def bounds(objects):
    points=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    return [min(v[i] for v in points) for i in range(3)],[max(v[i] for v in points) for i in range(3)]
def render_review():
    bpy.ops.import_scene.gltf(filepath=str(out/'alien-canopy.glb'))
    model=list(bpy.context.scene.objects)
    # Include triangle/footprint-plane intersections, not just mesh vertices.
    heights=[]
    for ob in model:
        if ob.type!='MESH':continue
        ob.data.calc_loop_triangles()
        for tri in ob.data.loop_triangles:
            v=[ob.matrix_world@ob.data.vertices[i].co for i in tri.vertices]
            for axis in(0,1):
                for sign in(-1,1):
                    heights.extend(p.z for p in v if sign*p[axis]>.54)
                    for a,b in zip(v,v[1:]+v[:1]):
                        aa=sign*a[axis]-.54;bb=sign*b[axis]-.54
                        if aa*bb<0:
                            t=aa/(aa-bb);heights.append(a.z+(b.z-a.z)*t)
    low,high=bounds(model)
    audit={'sourceSHA256':hashlib.sha256((out/'alien-canopy.glb').read_bytes()).hexdigest(),'boundsBlender':{'min':low,'max':high},'minimumSurfaceOutside1_08mFootprint':min(heights),'minimumAtScale0_9':min(heights)*.9,'requiredMinimumUnscaled':2.45,'requiredMinimumWorld':2.2}
    (out/'export-clearance.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
    assert min(heights)>=2.45,audit
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard'
    world=bpy.data.worlds.new('Neutral canopy review');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.46,.48,.50,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;mat=bpy.data.materials.new('Review floor');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.39,.41,.42,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1;floor.data.materials.append(mat)
    for name,pos,power,size in [('Key',(-4,-5,8),900,5),('Fill',(4,-1,6),320,4)]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;look(light,(0,0,2.3))
    bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=5.25
    views=[('front',(0,-9,4.0),(0,0,2.2)),('front3q',(6,-9,5),(0,0,2.2)),('rear',(0,9,4),(0,0,2.2)),('side',(9,0,4),(0,0,2.2)),('underside',(4,-7,1.0),(0,0,2.7))]
    meta=[]
    for name,pos,target in views:
        cam.location=pos;look(cam,target);scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True);meta.append({'file':name+'.png','cameraPosition':list(pos),'target':list(target),'orthoScale':cam.data.ortho_scale})
    (out/'render-evidence.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256((out/'alien-canopy.glb').read_bytes()).hexdigest(),'engine':'Cycles CPU','threads':4,'samples':24,'resolution':[512,512],'views':meta,'review':'Pending independent judgment'},indent=2),encoding='utf-8')
if opt.render_only:render_review();sys.exit(0)
if (out/'alien-canopy.glb').exists():raise ValueError('Use a fresh output directory; preserve previous exported studies')
out.mkdir(parents=True,exist_ok=True)
colors={'bark':(169,122,83),'barkShade':(144,101,73),'barkRidge':(191,141,94),'barkWarm':(180,130,84),
        'jade':(67,126,68),'jadeLight':(88,148,73),'jadeShade':(51,107,65),'olive':(114,153,63),
        'oliveLight':(147,177,79),'oliveShade':(96,138,61),'top':(153,182,85),'topLight':(171,194,107),
        'under':(84,137,112),'underLight':(103,155,125),'underDark':(68,116,101),'edge':(77,119,83)}
palette=list(colors);atlas=bpy.data.images.new('Intact canopy palette256',width=256,height=256,alpha=False)
pixels=[]
def linear(value):
    value=value/255
    return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4
for y in range(256):
    for x in range(256):pixels.extend([linear(v) for v in colors[palette[(y//64)*4+x//64]]]+[1])
atlas.pixels.foreach_set(pixels);atlas.filepath_raw=str(out/'canopy-palette.png');atlas.file_format='PNG';atlas.save()
material=bpy.data.materials.new('Canopy matte palette');material.use_nodes=True;bsdf=material.node_tree.nodes['Principled BSDF'];bsdf.inputs['Roughness'].default_value=1;bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Specular IOR Level'].default_value=0
tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Closest';material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
groups={'CanopyStructure':[],'CanopyLeaves':[]};leaf_contacts=[]
def mesh(name,vertices,faces,colors_by_face,group='CanopyStructure'):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);data.materials.append(material);uv=data.uv_layers.new()
    for i,poly in enumerate(data.polygons):
        color=colors_by_face[i%len(colors_by_face)];idx=palette.index(color)
        for loop in poly.loop_indices:uv.data[loop].uv=((idx%4+.5)/4,(idx//4+.5)/4)
        poly.use_smooth=False
    groups[group].append(ob);return ob
def stem(name,path,radii,segments=8,twist=0):
    pts=[Vector(v) for v in path];verts=[]
    for i,pt in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();side=tangent.cross(Vector((0,1,0))).normalized()
        if side.length<.1:side=Vector((1,0,0))
        up=tangent.cross(side).normalized()
        for j in range(segments):
            a=j*2*math.pi/segments+twist*i;verts.append(tuple(pt+(side*math.cos(a)+up*math.sin(a))*radii[i]))
    faces=[tuple(reversed(range(segments)))];shades=['barkShade']
    for i in range(len(pts)-1):
        for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j));shades.append(['bark','barkWarm','bark','barkShade','barkShade','bark','barkRidge','bark'][j])
    faces.append(tuple(range((len(pts)-1)*segments,len(pts)*segments)));shades.append('bark')
    return mesh(name,verts,faces,shades)

# No exposed grain: one intact, slightly turning trunk with broad bark planes.
stem('Intact tapered trunk',[(0,0,.30),(-.05,.02,.68),(-.08,.04,1.3),(.04,0,2.05),(.08,.02,2.65),(-.05,.10,3.25),(.02,.16,3.77),(.24,.26,4.0)],[.36,.33,.285,.24,.185,.14,.10,.065],twist=.13)
# Root toes and closed foot remain inside the1.08m square collider footprint.
for i,a in enumerate([-.5,.7,1.85,3.0,4.3,5.35]):
    dx,dy=math.cos(a),math.sin(a);perp=(-dy,dx);r=.47;w=.075
    v=[(dx*r+perp[0]*s*w,dy*r+perp[1]*s*w,.015)for s in(-1,1)]+[(dx*.16+perp[0]*s*.12,dy*.16+perp[1]*s*.12,0)for s in(-1,1)]+[(dx*.13+perp[0]*s*.1,dy*.13+perp[1]*s*.1,.72 if i%2 else .57)for s in(-1,1)]
    mesh('Grounded buttress '+str(i),v,[(0,2,3,1),(0,1,5,4),(0,4,2),(1,3,5),(2,4,5,3)],['barkShade','barkRidge' if i%2 else 'bark','barkWarm','bark','bark'])
# Closed basal plug meets the exact ground instead of a trunk floating on roots.
stem('Closed root core',[(0,0,.0),(0,0,.30)],[.28,.36])
hubs=[(-.8,-.03,3.02),(.8,.10,3.12),(-.32,.15,3.66),(.24,.26,4.0)]
stem('Left supported fork',[(.01,.02,2.34),(-.3,.02,2.64),hubs[0]],[.18,.14,.085])
stem('Right supported fork',[(.04,.02,2.42),(.43,.0,2.72),hubs[1]],[.175,.13,.08])
stem('Upper left fork',[(-.02,.1,3.20),(-.2,.12,3.47),hubs[2]],[.105,.08,.065])
leaves=[
 (0,(-2.05,-.16,2.74),.86,'jade'),(0,(-1.68,-.88,2.90),.84,'olive'),(0,(-1.75,.92,2.99),.81,'jade'),(0,(-.7,-1.0,2.77),.76,'jade'),
 (1,(2.05,-.40,2.80),.90,'olive'),(1,(1.80,.90,2.98),.82,'jade'),(1,(.95,-1.04,2.82),.83,'olive'),(1,(.8,.98,3.04),.77,'jade'),
 (2,(-1.05,-.30,3.66),.78,'olive'),(2,(-.78,1.10,3.80),.76,'jade'),(2,(.35,-.55,3.40),.74,'olive'),
 (3,(-.15,-.52,4.55),.64,'top'),(3,(.78,.92,4.05),.75,'olive'),(3,(-.48,.60,4.55),.61,'top'),
 (0,(-1.75,.52,2.79),.81,'jade'),(1,(1.86,.24,2.84),.84,'jade'),
]
for index,(hub_id,end,width,color) in enumerate(leaves):
    # Long overlapping paddles leave two unequal windows over the side forks.
    # Their narrower width is geometric, not a texture-painted silhouette.
    width*=1.15
    start=Vector(hubs[hub_id]);end=Vector(end);delta=end-start;side=Vector((-delta.y,delta.x,0)).normalized();verts=[];n=12
    # Lens-shaped volumes: a convex central ridge, curved shoulders and a
    # cascading tapered belly. Both length and cross-section close to a blunt
    # tip; there is no constant-thickness vertical rim around a flat platter.
    samples=[(0,.075),(.12,.48),(.30,.87),(.50,1),(.69,.94),(.84,.78),(.95,.40),(1,.035)]
    roll=[-.12,.16,-.17,.11,.09,-.14,.17,-.12,.13,-.1,-.18,.15,-.14,.12,.1,-.12][index]
    for t,spread in samples:
        swell=math.sin(t*math.pi)**.8
        center=start+delta*t;center.z+=math.sin(t*math.pi)*(.22 if hub_id==3 else .25)
        center+=side*(math.sin(t*math.pi)*(.08 if index%2 else -.065))
        for j in range(n):
            a=j*2*math.pi/n;cross=math.sin(a);vertical=math.cos(a)
            lateral=cross*width*.5*spread*(1.06 if cross>0 else .94)
            thick=(.30 if vertical>=0 else .29)*swell+.012
            pt=center+side*lateral
            pt.z+=vertical*thick+lateral*roll
            verts.append(tuple(pt))
    faces=[tuple(reversed(range(n)))];shades=['under']
    for i in range(len(samples)-1):
        for j in range(n):
            faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
            top=math.cos((j+.5)*2*math.pi/n)>0
            shades.append((color+'Light' if j in(0,11)and color!='top' else 'topLight' if color=='top' and j in(0,11) else color)if top else('underLight' if j in(3,8) else 'under'))
    faces.append(tuple(range((len(samples)-1)*n,len(samples)*n)));shades.append('edge')
    leaf=mesh('Closed paddle leaf '+str(index),verts,faces,shades,'CanopyLeaves')
    petiole_end=start+delta*.24;petiole_end.z+=.04
    stem('Leaf socket '+str(index),[start-Vector((0,0,.045)),petiole_end],[.048,.029],segments=8)
    leaf_contacts.append({'leaf':index,'hub':hub_id,'base':list(start),'tip':list(end),'attachment':'closed blade base intersects fork hub; tapered socket continues into underside'})

bpy.context.view_layer.update();objects=[ob for items in groups.values() for ob in items]
# Normalize the authored footprint/height once, preserving all branch/leaf joins.
low,high=bounds(objects);sx=3.7/(high[0]-low[0]);sy=2.5/(high[1]-low[1]);sz=(4.4-2.45)/(high[2]-2.45)
for ob in objects:
    for vert in ob.data.vertices:
        # Crown proportions may spread; never expand the grounded collision foot.
        blend=max(0,min(1,(vert.co.z-2.2)/.35));vert.co.x*=1+(sx-1)*blend;vert.co.y*=1+(sy-1)*blend
        if vert.co.z>2.45:vert.co.z=2.45+(vert.co.z-2.45)*sz
low,high=bounds(objects)
outside=[v.co.z for ob in objects for v in ob.data.vertices if abs(v.co.x)>.54 or abs(v.co.y)>.54]
foot=[v.co for ob in objects for v in ob.data.vertices if v.co.z<2.45]
assert min(outside)>=2.45,('overhang clearance',min(outside))
assert all(abs(v.x)<=.54 and abs(v.y)<=.54 for v in foot)
source_parts=len(objects);triangles=sum(len(f.vertices)-2 for ob in objects for f in ob.data.polygons);assert triangles<=5000,triangles
for ob in objects:ob.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'alien-canopy-editable.blend'))
for name,items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'alien-canopy-batches.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'alien-canopy.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT',export_animations=False)
glb=out/'alien-canopy.glb';manifest={'assetId':'asset_verge_canopy','referenceSHA256':'7d719b1d32f65159d9b8e3d9f4d3dd8dfbc6d23625e9e43fe01f74e9f914b418','referenceReview':'level_design_review PREGEN PASS8.2; clearance provision honored','modelReview':'Pending independent judgment; no self-admission','sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'fileBytes':glb.stat().st_size,'triangles':triangles,'sourceParts':source_parts,'meshBatches':2,'materials':1,'palette':[256,256],'dimensionsMeters':[high[0]-low[0],high[2]-low[2],high[1]-low[1]],'boundsBlender':{'min':low,'max':high},'baseY':low[2],'minimumOutsideTrunkHeight':min(outside),'minimumAtSmallestAuthoredScale':min(outside)*.9,'lowerFootprintLimit':1.08,'colliderUnchanged':{'size':[1.1,3.2,1.1],'offset':[0,1.6,0]},'front':'+Z glTF','leaves':len(leaves),'leafContacts':leaf_contacts,'normalization':[sx,sy,sz],'limits':'Only standard canopy modeled; tall/spread, collision, game/Author integration and all harvestables untouched'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');print(json.dumps(manifest,indent=2))
