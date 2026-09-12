"""Reproducible Rootfall: five common-origin props and one reusable seam.
Blender -b -t 2 --python this.py -- --output-dir ABS_NEW --review-dir ABS_NEW
Local game axes X across lane, Y up, +Z approach. CPU review only.
"""
import argparse, hashlib, importlib.util, json, math, random, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True);p.add_argument('--review-dir',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output_dir).resolve();review=Path(a.review_dir).resolve()
if out.exists() or review.exists():raise ValueError('Fresh candidate directories required')
out.mkdir(parents=True);review.mkdir(parents=True);root=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
colors=[(96,70,51),(107,77,55),(115,83,59),(86,64,48),(202,157,95),(63,90,77),(78,105,81),(103,122,79),(112,119,108),(141,142,119),(120,95,60),(167,144,96),(224,181,110)]
palette=bpy.data.images.new('Rootfall embedded matte palette',width=len(colors)*8,height=8,alpha=False)
palette.pixels.foreach_set([v for y in range(8) for x in range(len(colors)*8) for v in (*[c/255 for c in colors[x//8]],1)])
palette.filepath_raw=str(out/'palette.png');palette.file_format='PNG';palette.save()
mat=bpy.data.materials.new('rootfall-matte');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=1;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=0
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=palette;tex.interpolation='Closest';mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
def pt(v):return (v[0],-v[2],v[1])
def game(v):return (v.x,v.z,-v.y)
def paint(ob,colorspec):
    ob.data.materials.clear();ob.data.materials.append(mat)
    uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='Palette');uv.name='Palette'
    for f in ob.data.polygons:
        c=colorspec[f.index] if isinstance(colorspec,list) else colorspec
        for i in f.loop_indices:uv.data[i].uv=((c+.5)/len(colors),.5)
        f.use_smooth=False
    return ob
def mesh(name,vertices,faces,c=0):
    me=bpy.data.meshes.new(name);me.from_pydata([pt(v) for v in vertices],[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    return paint(ob,c)
def box(name,a,b,width,depth,c):
    v=Vector(b)-Vector(a);mid=(Vector(a)+Vector(b))/2
    bpy.ops.mesh.primitive_cube_add(location=pt(mid));ob=bpy.context.object;ob.name=name
    ob.dimensions=(width,depth,v.length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.rotation_euler=Vector(pt(v)).to_track_quat('Z','Y').to_euler()
    mod=ob.modifiers.new('broad hewn facets','BEVEL');mod.width=.045;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    return paint(ob,c)
def rock(name,loc,scale,c=8):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=pt(loc));ob=bpy.context.object;ob.name=name
    ob.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return paint(ob,c)
def branch(name,path,c=0,sides=8):
    vertices=[];faces=[]
    for i,(x,y,z,r) in enumerate(path):
        v=Vector((x,y,z));d=Vector(path[min(i+1,len(path)-1)][:3])-Vector(path[max(0,i-1)][:3]);d.normalize()
        u=d.cross(Vector((0,1,0)))
        if u.length<.1:u=d.cross(Vector((0,0,1)))
        u.normalize();w=d.cross(u).normalized()
        for j in range(sides):
            theta=2*math.pi*j/sides;f=1+.075*math.sin(j*2.7+i*.6)
            q=v+(u*math.cos(theta)+w*math.sin(theta))*r*f
            vertices.append((q.x,max(0,q.y),q.z))
    faces=[tuple(reversed(range(sides)))]
    for i in range(len(path)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.append(tuple(range((len(path)-1)*sides,len(path)*sides)))
    return mesh(name,vertices,faces,[c if i%5 else min(c+1,3) for i in range(len(faces))])

# Cross-section includes closely spaced front points. The kerf reuses those
# curved profile points instead of forcing a rectangular inset across them.
angles=[-180,-150,-120,-90,-60,-36,-18,-9,0,9,18,36,60,90,120,150]
def trunk(name,rings,underbody=False):
    vs=[];faces=[];cs=[];n=len(angles)
    for station,(x,y,z,ry,rz,notch) in enumerate(rings):
        for deg in angles:
            th=math.radians(deg)+(.13*math.sin(x*1.07) if abs(deg)>18 else 0)
            # Continuous irregular ridges depend on world X, including matching
            # cut planes. No axis-aligned repeated color or polygon bands.
            rough=1+.11*math.sin(x*.9+th*3)+.07*math.cos(x*.63-th*5)
            qz=z+rz*math.cos(th)*rough
            qy=max(0,y+ry*math.sin(th)*rough)
            if deg==-90:qy=0
            qx=x
            if station not in (0,len(rings)-1) and abs(x)>1.95:
                qx+=.19*math.sin(th*2+x*.6)
            if abs(x)<1.96 and deg in (-36,-18,-9,0,9,18):
                # A tapered diagonal kerf follows the existing oval trunk
                # curvature. It is deepest just above/front of the center and
                # feathers into intact bark at both torn ends.
                taper={-36:.12,-18:.42,-9:.82,0:1.0,9:.72,18:.27}[deg]
                qz-=notch*(.22+.78*taper)
            vs.append((qx,qy,qz))
    # Most of a severed end remains dark exterior bark. The actual exposed
    # sapwood is the curved, tapered kerf below, not a pale rectangular cap.
    faces.append(tuple(reversed(range(n))));cs.append(1)
    for i in range(len(rings)-1):
        for j in range(n):
            face=(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j)
            notchface=(rings[i][-1] or rings[i+1][-1]) and j in (5,6,7,8,9)
            if notchface:
                # Offset triangles preserve the diagonal taper and expose wood
                # within the torn edge; there is no inset panel or hardware.
                faces.extend([(face[0],face[1],face[2]),(face[0],face[2],face[3])])
                cs.extend([4,12] if (i+j)%3 else [12,4])
            else:
                faces.append(face)
                moss=(j in (10,11,12) and abs(rings[i][0])>2 and (i+2*j)%5 not in (0,1))
                lower_underbody=underbody and i in (1,2,3) and j in (4,5,10,11)
                cs.append((5 if j%2 else 6) if moss else ((2 if (i+j)%2 else 3) if lower_underbody else (1 if (i*3+j*2)%13==0 else 0)))
    faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)));cs.append(1)
    ob=mesh(name,vs,faces,cs)
    return vs

cut=(-1.65,1.3,0,1.3,1.03,.17)
left_rings=[(-5.65,.6,-.3,.6,.81,0),(-4.65,1.25,-.3,1.25,1.3,0),(-3.9,1.5,-.1,1.5,1.35,0),(-2.7,1.4,.02,1.4,1.1,0),(-1.91,1.29,0,1.29,1.03,0),cut]
right_rings=[(1.65,1.03,0,1.03,1.03,.17),(1.91,1.0,0,1.,1.03,0),(2.6,.97,-.12,.97,1.06,0),(3.8,.69,-.2,.69,.78,0),(4.9,.52,-.5,.52,.61,0),(5.65,.27,-.5,.27,.33,0)]
center_rings=[cut,(-1.38,1.28,0,1.28,1.03,0),(-.6,1.2,-.1,1.2,.96,0),(.55,1.18,-.01,1.18,1.04,0),(1.38,1.05,0,1.05,1.03,0),right_rings[0]]
collider_points={};brace_contacts={}
def retained(side):
    rings=left_rings if side<0 else right_rings
    body=trunk('continuous retained trunk with fixed cut face',rings)
    # Only 4 points per ring used for the compact body/foot envelope.
    points=[body[i*len(angles)+j] for i in range(len(rings)) for j in (0,3,8,13)]
    if side<0:
        paths=[ [(-4.25,1.45,.1,.82),(-4.8,.8,.85,.69),(-5.2,.27,1.9,.32),(-5.6,.06,2.35,.08)],
          [(-3.8,1.38,.2,.73),(-3.75,.67,1.35,.55),(-3.2,.16,2.2,.25),(-2.9,.04,2.5,.07)],
          [(-4.5,1.5,0,.8),(-5.4,.7,-.1,.6),(-6.25,.16,.55,.26),(-6.85,.03,.7,.05)],
          [(-4.35,1.4,-.2,.72),(-4.3,2.35,-.45,.49),(-4.65,3.05,-.6,.22),(-4.95,3.35,-.5,.05)],
          [(-4.6,1.1,-.45,.67),(-5.35,.5,-1.3,.46),(-5.75,.05,-2.15,.12)],
          [(-3.65,.9,-.4,.55),(-3.05,.4,-1.4,.37),(-2.65,.07,-2.15,.13)] ]
    else:
        paths=[[(3.2,.9,.15,.6),(4.2,.5,1.0,.44),(5.5,.08,1.8,.16),(6.2,.025,1.9,.05)],
          [(3.5,1.1,-.15,.62),(4.5,1.5,-.8,.48),(5.65,2.15,-1.1,.29),(6.3,2.48,-1.1,.06)],
          [(4.6,1.5,-.75,.4),(5.4,1.45,.15,.29),(6.35,1.7,.5,.08)],
          [(4.1,.85,-.3,.56),(5.2,.65,-1.35,.43),(6.4,.1,-2.05,.15),(6.85,.03,-2.25,.04)],
          [(3.1,.75,.3,.46),(3.3,.31,1.4,.32),(3.75,.03,2.0,.09)]]
    for i,path in enumerate(paths):
        branch('joined tapering root finger %d'%i,path,i%3)
        if path[-1][1]<.11:points.append(path[-1][:3])
    # Thin continuous bark lips are part of the retained bodies. They hug the
    # curved kerf edges and overlap as peeled layers, rather than floating as
    # three decorative inserts in the exposed wood.
    cut_x=side*1.65; toward_gap=-side
    def lip(name,outline,depth,color):
        verts=[(cut_x+toward_gap*depth,y,z) for y,z in outline]
        mesh(name,verts,[tuple(range(len(verts)))],color)
    lip('torn lower bark lip',[(.84,.98),(1.01,.80),(1.24,.75),(1.17,.87),(1.03,.94)],.012,1)
    lip('torn upper bark lip',[(1.27,.75),(1.52,.82),(1.70,.97),(1.53,.95),(1.38,.87)],.015,0)
    lip('overlapping bark wedge',[(1.11,.88),(1.27,.76),(1.38,.84),(1.22,.94)],.022,2)
    # Small low bank stones stay seated around the root feet, never in the lane.
    for i,(x,y,z,s) in enumerate(( [(-6.15,.48,-.35,.85),(-5.9,.32,1.1,.5),(-2.65,.22,1.35,.38)] if side<0 else [(6.05,.67,-.5,.92),(5.5,.35,1.0,.56),(2.8,.24,-1.25,.42)] )):
        rock('grounded bank stone', (x,y,z),(s,y/0.85065,s*.8),8+i%2)
        points.extend([(x-s*.85,0,z),(x+s*.85,y*1.9,z),(x,0,z+s*.75)])
    # Bounded leaf clusters on the actual branch tips, not a detached canopy.
    for i,(x,y,z) in enumerate(([(4.65,1.82,-.83),(5.45,2.08,-1.02),(5.75,2.31,-1.06),(5.65,1.55,.3),(6.15,1.72,.46)] if side>0 else [(-4.26,2.28,-.21),(-4.49,2.76,-.43),(-4.87,1.45,-.16)])):
        rock('attached leaf lobe',(x,y,z),(.28,.10,.20),6+i%2)
    collider_points['rootfall-left' if side<0 else 'rootfall-right']=points

def central():
    # Local warm lower-front facets keep the closed core visibly grounded in
    # shadow without extending the silhouette or adding a separate wall.
    vs=trunk('removable continuous grounded central core',center_rings,underbody=True)
    collider_points['rootfall-center']=[vs[i*len(angles)+j] for i in (0,2,3,5) for j in (0,3,6,8,10,13)]

def braces(side):
    # Both timbers have seated feet and converge into the same retained-body bearing.
    bearing=(side*2.15,1.48,.9)
    feet=[(side*2.06,.04,2.16),(side*3.0,.04,1.74)]
    for i,foot in enumerate(feet):box('grounded hewn timber %d'%i,foot,bearing,.23,.24,10 if i else 2)
    # Bind both upper timber shafts in front of their bearing, not the bark.
    middle=(Vector(feet[0])+Vector(feet[1]))/2;axis=(Vector(bearing)-middle).normalized()
    center=middle.lerp(Vector(bearing),.72);u=Vector((1,0,0));u=(u-axis*u.dot(axis)).normalized();v=axis.cross(u).normalized()
    for turn in (-1,0,1):
        loopcenter=center+axis*(turn*.071);vs=[];faces=[];major=14;minor=5
        for i in range(major):
            th=2*math.pi*i/major;q=loopcenter+u*(math.cos(th)*.285)+v*(math.sin(th)*.17)
            radial=(u*math.cos(th)+v*math.sin(th)).normalized()
            for j in range(minor):
                angle=2*math.pi*j/minor;vs.append(tuple(q+(radial*math.cos(angle)+axis*math.sin(angle))*.028))
        for i in range(major):
            for j in range(minor):faces.append((i*minor+j,i*minor+(j+1)%minor,((i+1)%major)*minor+(j+1)%minor,((i+1)%major)*minor+j))
        mesh('continuous fiber wrap around both timbers',vs,faces,11)
    knot=center+v*.185
    branch('fiber knot and tucked return',[(*tuple(knot-u*.06),.034),(*tuple(knot+axis*.07),.044),(*tuple(knot+u*.065-axis*.055),.027)],11,5)
    brace_contacts[str(side)]={'feet':feet,'bearing':bearing,'lashingCenter':list(center),'members':2,'lashings':1,'note':'Three continuous fiber turns surround both upper shafts before their supported wood bearing; small tucked knot.'}

def seam():
    # Three overlapping connected laminae preserve the existing 3-hit resource
    # stage contract. They read as one torn diagonal bark lip, not as separate
    # decorative studs: removing chunk_2 exposes a small chip, then chunk_1
    # peels back, while chunk_0 anchors the remaining bark edge.
    layers=[
      [(-.34,1.01),(-.23,.98),(-.08,1.05),(.07,1.17),(.24,1.30),(.33,1.35),(.24,1.41),(.05,1.33),(-.12,1.20),(-.29,1.10)],
      [(-.19,1.08),(-.05,1.13),(.10,1.24),(.27,1.34),(.22,1.39),(.05,1.30),(-.11,1.18)],
      [(-.31,1.03),(-.18,1.08),(-.03,1.18),(-.10,1.22),(-.24,1.12)]
    ]
    for i,poly in enumerate(layers):
        n=len(poly);depth=-.045+i*.012
        verts=[(x,y,depth) for x,y in poly]+[(x,y,depth+.026+.010*math.sin(j*1.7+i)) for j,(x,y) in enumerate(poly)]
        faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
        mesh('RootfallTornBark_chunk_%d'%i,verts,faces,[1,0]+[1 if (j+i)%3 else 2 for j in range(n)])

builders={'rootfall-left':lambda:retained(-1),'rootfall-right':lambda:retained(1),'rootfall-center':central,'rootfall-brace-left':lambda:braces(-1),'rootfall-brace-right':lambda:braces(1),'rootfall-seam':seam}
spec=importlib.util.spec_from_file_location('check',root/'tools/art/check-game-glb.py');checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
facts={};colliders={}
def hull(points):
    bm=bmesh.new()
    for v in points:bm.verts.new(v)
    bm.verts.ensure_lookup_table();bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
    used=set(v for f in bm.faces for v in f.verts)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in used],context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.verts.ensure_lookup_table();bm.verts.index_update()
    result={'shape':'convexHull','vertices':[round(c,6) for v in bm.verts for c in v.co],'indices':[v.index for f in bm.faces for v in f.verts],'offset':{'x':0,'y':0,'z':0}}
    bm.free();return result

for name,build in builders.items():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);build();bpy.context.view_layer.update()
    parts=[ob for ob in bpy.context.scene.objects if ob.type=='MESH'];verts=[game(ob.matrix_world@v.co) for ob in parts for v in ob.data.vertices]
    if 'brace' in name:collider_points[name]=[game(ob.matrix_world@v.co) for ob in parts if 'timber' in ob.name for v in ob.data.vertices]
    if name in collider_points:colliders[name]=hull(collider_points[name])
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'-editable.blend')))
    if name!='rootfall-seam':
        bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();bpy.context.object.name=name
        bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.object.select_all(action='SELECT');path=out/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT')
    doc,blob=checker.parse_glb(path.read_bytes());points=[]
    for m in doc['meshes']:
        for prim in m['primitives']:
            _,vs=checker.accessor_values(doc,blob,prim['attributes']['POSITION']);points.extend(vs)
    report=checker.check(path,'prop',{},[])
    if not report['ok']:raise ValueError(report['failures'])
    report.update({'bytes':path.stat().st_size,'bounds':{'min':[min(v[i] for v in points) for i in range(3)],'max':[max(v[i] for v in points) for i in range(3)]},'draws':sum(len(m['primitives']) for m in doc['meshes'])})
    facts[name]=report

manifest={'status':'candidate awaiting independent model review; no runtime admission',
 'reference':'art/targets/rootfall-closed-v3/target.png','referenceSHA256':hashlib.sha256((root/'art/targets/rootfall-closed-v3/target.png').read_bytes()).hexdigest(),
 'axes':'game X across, Y up, +Z approach','ordinaryPropOrigins':[0,0,0],'cutPlanesX':[-1.65,1.65],
 'revision':'V4: curved diagonal sapwood kerfs, retained torn-bark lip layers, and warm grounded central underbody facets',
 'cutWork':{'planesX':[-1.65,1.65],'frontBandY':[0.84,1.70],'recessDepthM':0.17,'finish':'curved tapered sapwood facets beneath continuous torn bark lips; no inset panel or fittings'},
 'seams':{'model':'rootfall-seam.glb','positions':[[-1.65,0,1],[1.65,0,1]],'scale':1,'yaw':0,'pivot':'own ground origin','chunks':['RootfallTornBark_chunk_0','RootfallTornBark_chunk_1','RootfallTornBark_chunk_2'],'collisionEnabledRecommendation':False,'targetBox':{'size':{'w':.74,'h':1.35,'d':.25},'offset':{'x':0,'y':.675,'z':0}}},
 'components':facts,'colliders':colliders,'braceContacts':brace_contacts,
 'stateContinuity':{'closed':['rootfall-left','rootfall-right','rootfall-center','rootfall-seam x2'],'open':['rootfall-left','rootfall-right','rootfall-brace-left','rootfall-brace-right'],'retainedSourceIdentical':True,'retainedIdentity':{n:facts[n]['sourceSHA256'] for n in ('rootfall-left','rootfall-right')},'method':'same freshly imported objects stay untouched; only center/seam visibility and brace visibility toggle'},
 'clearance':{'reservedX':[-1.5,1.5],'reservedZ':[-3,3],'retainedInnerPlanesX':[-1.65,1.65],'nativeCapsuleTraversal':'pending root integration'},
 'material':'one opaque embedded 96x8 palette, roughness1 metallic0 specular0','review':{'freshGLB':True,'engine':'Cycles CPU','threads':2,'samples':12},
 'totals':{'triangles':sum(v['counts']['triangles'] for v in facts.values()),'bytes':sum(v['bytes'] for v in facts.values()),'draws':sum(v['draws'] for v in facts.values())}}
(out/'build-rootfall.py').write_bytes(Path(__file__).read_bytes());(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

# All comparison evidence comes from fresh GLBs, with unchanged retained objects.
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=12;sc.cycles.use_denoising=True
sc.render.threads_mode='FIXED';sc.render.threads=2;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG'
sc.world=bpy.data.worlds.new('neutral');sc.world.color=(.35,.35,.35);sc.view_settings.view_transform='Standard';sc.view_settings.look='Medium High Contrast'
def load(path,offset=(0,0,0)):
    before=set(sc.objects);bpy.ops.import_scene.gltf(filepath=str(path));items=list(set(sc.objects)-before)
    for ob in items:
        if ob.parent is None:ob.location+=Vector(pt(offset))
    return items
items={n:load(out/(n+'.glb')) for n in list(builders)[:5]}
items['seams']=load(out/'rootfall-seam.glb',(-1.65,0,1))+load(out/'rootfall-seam.glb',(1.65,0,1))
def state(opened):
    for n,obs in items.items():
        for ob in obs:ob.hide_render=(not opened if 'brace' in n else opened if n in ('rootfall-center','seams') else False)
state(False)
ground=bpy.data.materials.new('neutral grounded scale');ground.diffuse_color=(.30,.33,.27,1);ground.roughness=1
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.006));bpy.context.object.data.materials.append(ground)
def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
ld=bpy.data.lights.new('soft broad key','AREA');lo=bpy.data.objects.new('soft broad key',ld);sc.collection.objects.link(lo);lo.location=(-4,-7,10);ld.energy=1800;ld.size=10;aim(lo,(0,0,1))
cd=bpy.data.cameras.new('locked comparison');cam=bpy.data.objects.new('locked comparison',cd);sc.collection.objects.link(cam);sc.camera=cam
def render(name,loc,target,span=17,w=844,h=480):
    sc.render.resolution_x=w;sc.render.resolution_y=h;cd.type='ORTHO';cd.ortho_scale=span;cam.location=pt(loc);aim(cam,pt(target));sc.render.filepath=str(review/(name+'.png'));bpy.ops.render.render(write_still=True)
render('front-closed',(0,4.5,15),(0,1,0))
render('quarter-closed',(10,8,15),(0,1,0))
render('side-closed',(15,4,0),(0,1,0),11)
state(True);render('front-open',(0,4.5,15),(0,1,0));render('quarter-open',(10,8,15),(0,1,0))
render('brace-contact',(5,4,7),(2.4,.85,1.1),5,640,512)
state(False);render('notch-detail',(3.5,2.6,7),(1.65,1.15,.8),3.6,640,512)
players=load(root/'assets/models/explorer-v2/model.glb',(0,0,5.4))
sc.render.resolution_x=844;sc.render.resolution_y=390;cd.type='PERSP';cd.sensor_fit='VERTICAL';cd.sensor_height=24;cd.lens=24/(2*math.tan(math.radians(26)))
cam.location=pt((0,.9+4.1*.85,5.4+6.55*.85));aim(cam,pt((0,.9,5.4)))
for opened in (False,True):
    state(opened);sc.render.filepath=str(review/('game-scale-'+('open' if opened else 'closed')+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(review/'fresh-GLB-review.blend'))
manifest['evidence']={f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in review.glob('*.png')}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'totals':manifest['totals'],'components':{k:{'hash':v['sourceSHA256'],'triangles':v['counts']['triangles'],'bounds':v['bounds']} for k,v in facts.items()}},indent=2))
