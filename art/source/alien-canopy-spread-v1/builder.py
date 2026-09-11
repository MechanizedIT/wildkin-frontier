"""Bounded spread canopy reconstruction from independently approved three-fan target. Blender Z up/-Y front; glTF Y up/+Z front.
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
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out/'spread-canopy.glb'))
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
    audit={'sourceSHA256':hashlib.sha256((out/'spread-canopy.glb').read_bytes()).hexdigest(),'boundsBlender':{'min':low,'max':high},'minimumSurfaceOutside1_08mFootprint':min(heights),'minimumAtScale0_9':min(heights)*.9,'requiredMinimumUnscaled':2.45,'requiredMinimumWorld':2.205}
    (out/'export-clearance.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
    assert min(heights)>=2.45,audit
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20;scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard'
    world=bpy.data.worlds.new('Neutral canopy review');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.46,.48,.50,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;mat=bpy.data.materials.new('Review floor');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.39,.41,.42,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1;floor.data.materials.append(mat)
    for name,pos,power,size in [('Key',(-4,-5,8),900,5),('Fill',(4,-1,6),320,4)]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;look(light,(0,0,2.3))
    bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=6.8
    views=[('front',(0,-11,3.1),(0,0,1.95)),('front3q',(5,-11,4.4),(0,0,1.95)),('rear',(0,11,3.5),(0,0,1.95)),('side',(11,0,3.5),(0,0,1.95)),('underside',(4,-8,.85),(0,0,2.0))]
    meta=[]
    for name,pos,target in views:
        floor.hide_render=(name=='underside')
        cam.location=pos;look(cam,target);scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True);meta.append({'file':name+'.png','cameraPosition':list(pos),'target':list(target),'orthoScale':cam.data.ortho_scale})
    (out/'render-evidence.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256((out/'spread-canopy.glb').read_bytes()).hexdigest(),'engine':'Cycles CPU','threads':4,'samples':20,'resolution':[512,512],'views':meta,'review':'Pending independent judgment'},indent=2),encoding='utf-8')
if opt.render_only:render_review();sys.exit(0)
if (out/'spread-canopy.glb').exists():raise ValueError('Use a fresh output directory; preserve previous exported studies')
out.mkdir(parents=True,exist_ok=True)
colors={'bark':(169,122,83),'barkShade':(144,101,73),'barkRidge':(191,141,94),'barkWarm':(180,130,84),
        'jade':(66,121,76),'jadeLight':(98,149,69),'jadeShade':(51,103,71),'olive':(125,165,65),
        'oliveLight':(147,179,80),'oliveShade':(107,149,61),'top':(153,182,85),'topLight':(171,194,107),
        'under':(58,112,91),'underLight':(76,131,102),'underDark':(48,99,83),'edge':(77,119,83)}
palette=list(colors);atlas=bpy.data.images.new('Intact canopy palette256',width=256,height=256,alpha=False)
pixels=[]
def linear(value):
    value=value/255
    return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4
for y in range(256):
    for x in range(256):pixels.extend([linear(v) for v in colors[palette[(y//64)*4+x//64]]]+[1])
atlas.pixels.foreach_set(pixels);atlas.filepath_raw=str(out/'canopy-palette.png');atlas.file_format='PNG';atlas.save();atlas.pack()
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

# Compact intact base and clear raised bole; only the upper crown spreads. Below walking height,
# every exposed root/trunk surface remains inside the1.08m modeling footprint.
stem('Spread connected bole',[(0,0,.28),(-.055,.015,.75),(-.02,.025,1.30),(.045,.02,1.91),(.015,.035,2.45),(.06,.13,2.86),(.12,.38,3.27)],[.34,.305,.28,.255,.23,.16,.095],twist=.10)
for i,a in enumerate([-.4,.75,1.85,3.1,4.28,5.4]):
    dx,dy=math.cos(a),math.sin(a);perp=(-dy,dx);r=.47;w=.075
    v=[(dx*r+perp[0]*s*w,dy*r+perp[1]*s*w,.015)for s in(-1,1)]+[(dx*.16+perp[0]*s*.12,dy*.16+perp[1]*s*.12,0)for s in(-1,1)]+[(dx*.13+perp[0]*s*.1,dy*.13+perp[1]*s*.1,.60 if i%2 else .49)for s in(-1,1)]
    mesh('Grounded buttress '+str(i),v,[(0,2,3,1),(0,1,5,4),(0,4,2),(1,3,5),(2,4,5,3)],['barkShade','barkRidge' if i%2 else 'bark','barkWarm','bark','bark'])
stem('Closed root core',[(0,0,0),(0,0,.30)],[.27,.32])
# Three staggered fan sockets have their own continuous supported branches.
# Elbow undersides are explicitly above the clearance plane outside the trunk.
hubs=[(-.88,-.04,2.94),(.82,-.08,2.96),(.12,.63,3.31)]
stem('Broad left rising elbow',[(.01,.03,2.48),(-.42,-.01,2.75),hubs[0]],[.235,.19,.135])
stem('Offset right rising elbow',[(.03,.04,2.53),(.44,-.08,2.79),hubs[1]],[.225,.18,.12])
stem('Elevated rear fork',[(.05,.10,2.81),(.10,.31,3.08),hubs[2]],[.165,.12,.09])
leaves=[
 (0,(-2.85,-.05,3.26),.70,'jade'),(0,(-2.53,-1.18,3.07),.64,'jade'),
 (0,(-2.42,.84,3.60),.64,'jade'),(0,(-1.06,-.02,3.76),.39,'jade'),
 (1,(2.65,-.10,3.10),.65,'jade'),(1,(2.44,-1.55,3.00),.64,'jade'),
 (1,(2.04,.64,3.72),.56,'jade'),(1,(.29,-.91,3.44),.42,'jade'),
 (2,(-1.15,1.36,3.63),.51,'jade'),(2,(1.22,1.57,3.61),.49,'jade'),
 (2,(-.22,1.42,3.82),.41,'jade'),(2,(1.14,.54,3.30),.39,'jade')]
for index,(hub_id,end,width,color) in enumerate(leaves):
    # Reuse the admitted closed lens profile, but orient its cross-section
    # around each actual3D leaf axis. Oblique rear blades must not collapse
    # into a vertical tube from a world-Z-only thickness construction.
    hub=Vector(hubs[hub_id]);end=Vector(end);axis=(end-hub).normalized()
    start=hub+axis*.12;delta=end-start;axis=delta.normalized()
    # Unequal fan planes expose physical belly depth from the reverse view.
    facing=Vector([(0,-.26,.966),(.18,-.46,.87),(-.16,.35,.923)][hub_id])
    normal=(facing-axis*facing.dot(axis)).normalized()
    if normal.length<.1:normal=Vector((0,-1,0))
    side=axis.cross(normal).normalized();normal=side.cross(axis).normalized()
    roll=[-.28,.30,-.20,.17,.36,-.23,.27,-.35,-.22,.26,.05,-.14][index]
    turn=side*math.cos(roll)+normal*math.sin(roll);normal=normal*math.cos(roll)-side*math.sin(roll);side=turn
    verts=[];n=12
    samples=[(0,.085),(.12,.40),(.30,.78),(.50,1),(.69,.95),(.84,.73),(.95,.35),(1,.075)]
    for t,spread in samples:
        swell=math.sin(t*math.pi)**.8
        center=start+delta*t+normal*math.sin(t*math.pi)*.145
        center+=side*(math.sin(t*math.pi)*(.042 if index%2 else -.035))
        for j in range(n):
            a=j*2*math.pi/n;cross=math.sin(a);vertical=[1,.78,.43,0,-.40,-.78,-1,-.78,-.40,0,.43,.78][j]
            lateral=cross*width*.5*spread*(1.06 if cross>0 else .94)
            # Full convex middle/rolled shoulder; greater volume grows upward.
            thick=(.265 if vertical>=0 else .175)*swell+.012
            pt=center+side*lateral+normal*vertical*thick;verts.append(tuple(pt))
    faces=[tuple(reversed(range(n)))];shades=['under']
    for i in range(len(samples)-1):
        for j in range(n):
            faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
            top=math.cos((j+.5)*2*math.pi/n)>0
            # One outward folded lamina exposes its olive underside beside the jade half.
            # Coherent longitudinal facets, not a circumferential dark stripe.
            shades.append(('jadeLight' if j==0 else 'jade') if j in(0,1,2) else ('oliveLight' if j in(10,11) else 'olive' if j==9 else 'underLight' if j in(3,8) else 'under'))
    faces.append(tuple(range((len(samples)-1)*n,len(samples)*n)));shades.append('edge')
    leaf=mesh('Closed paddle leaf '+str(index),verts,faces,shades,'CanopyLeaves')
    petiole_start=hub-axis*.10;petiole_end=start+delta*.24-normal*.025
    stem('Supported petiole '+str(index),[petiole_start,start,petiole_end],[.092,.073,.035],segments=8)
    leaf_contacts.append({'leaf':index,'hub':hub_id,'base':list(start),'tip':list(end),'attachment':'individual tapered petiole overlaps fork hub and closed blade underside'})

bpy.context.view_layer.update();objects=[ob for items in groups.values() for ob in items]
# Normalize the authored footprint/height once, preserving all branch/leaf joins.
low,high=bounds(objects);sx=5.55/(high[0]-low[0]);sy=3.65/(high[1]-low[1]);sz=(3.82-2.45)/(high[2]-2.45)
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
bpy.ops.wm.save_as_mainfile(filepath=str(out/'spread-canopy-editable.blend'))
for name,items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'spread-canopy-batches.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'spread-canopy.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT',export_animations=False)
glb=out/'spread-canopy.glb';manifest={'assetId':'asset_verge_canopy_spread','referenceSHA256':'a6d129b58325c192fe640eb195818a2957427a776c8d88d35bc5170fecae2332','referenceReview':'level_design_review PREGEN PASS8.2; high elbows/undersides set from actual clearance','modelReview':'Pending independent judgment; no self-admission','sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'fileBytes':glb.stat().st_size,'triangles':triangles,'sourceParts':source_parts,'meshBatches':2,'materials':1,'palette':[256,256],'dimensionsMeters':[high[0]-low[0],high[2]-low[2],high[1]-low[1]],'boundsBlender':{'min':low,'max':high},'baseY':low[2],'minimumOutsideTrunkHeight':min(outside),'minimumAtSmallestAuthoredScale':min(outside)*.9,'lowerFootprintLimit':1.08,'colliderUnchanged':None,'front':'+Z glTF','leaves':len(leaves),'leafContacts':leaf_contacts,'normalization':[sx,sy,sz],'limits':'Spread visual candidate only; all8placements/scales/nullcollision unchanged. Standard/tall/harvestables/runtime/world untouched.'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');print(json.dumps(manifest,indent=2))

# Same bounded owned process performs fresh-GLB clearance and review renders.
render_review()
