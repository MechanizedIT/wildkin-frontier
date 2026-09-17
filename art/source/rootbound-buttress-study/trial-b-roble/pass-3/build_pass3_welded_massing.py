"""Final Trial B massing repair: one welded implicit wood surface, no CSG.

It loads frozen v3-amended section paths directly. Metaball samples follow the
prescribed tapered centerlines, then convert to one explicit mesh; this creates
a continuous welded surface without boolean CSG. Ground-web samples extend the
root upper contours down to a closed planted collar, as the independent review
requires.
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector

ROOT=Path(r"C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-b-roble")
PLAN=Path(r"C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/director/section-construction.json")
OUT=ROOT/"pass-3"/"output"; RENDERS=OUT/"renders"; OUT.mkdir(parents=True,exist_ok=True); RENDERS.mkdir(exist_ok=True)
raw=PLAN.read_bytes(); plan=json.loads(raw); assert plan["schema"]=="rootbound-buttress-section-construction/v3-amended"

for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
for blocks in (bpy.data.meshes,bpy.data.metaballs,bpy.data.materials,bpy.data.cameras,bpy.data.lights):
    for block in list(blocks):
        if block.users==0: blocks.remove(block)
scene=bpy.context.scene; scene.name="Rootbound_Trial_B_Pass3_WeldedMassing"; scene.unit_settings.system='METRIC'; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=900; scene.render.resolution_y=900; scene.render.resolution_percentage=100; scene.world.color=(.045,.045,.052)
col=bpy.data.collections.new("TrialB_Pass3"); scene.collection.children.link(col)
def relink(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)
meta=bpy.data.metaballs.new("GEO_B3_WeldedWood_Meta"); meta.resolution=.16; meta.render_resolution=.16; meta.threshold=.72
mob=bpy.data.objects.new("GEO_B3_WeldedWood_Meta",meta); col.objects.link(mob)
def add_ball(point,radius):
    e=meta.elements.new(); e.type='BALL'; e.co=point; e.radius=radius
def sample_path(points,axes,steps=3,scale=1.0):
    for i in range(len(points)-1):
        a,b=Vector(points[i]),Vector(points[i+1]); ra=min(axes[i])/2*scale; rb=min(axes[i+1])/2*scale
        for j in range(steps):
            t=j/steps; add_ball(a.lerp(b,t),ra*(1-t)+rb*t)
    add_ball(points[-1],min(axes[-1])/2*scale)
def rec(items): return [x['positionM'] for x in items],[x['fullSectionAxesM'] for x in items]

# Frozen full trunk, major branch, and five upper root path samples.
p,a=rec(plan['trunk']['points']); sample_path(p,a,4,1.04)
for branch in plan['majorBranches']:
    p,a=rec(branch['points']); sample_path(p,a,3,1.02)
for root in plan['roots']:
    p,a=rec(root['points']); sample_path(p,a,3,1.10)

# Grounded buttress webs: the reviewed paths stay intact above, while broad
# lower samples give every root a closed vertical descent into the collar.
for root in plan['roots']:
    p,a=rec(root['points']); anchor=Vector(p[0]); toe=Vector(p[-1]);
    # Two lower contour points curve outward/down from the prescribed core.
    for t,down,wide in ((.22,.35,1.25),(.48,.62,1.18),(.76,.82,1.05)):
        q=anchor.lerp(toe,t); q.z=max(.14,q.z-down); add_ball(q,min(a[0])/2*wide)
    add_ball((toe.x,toe.y,.14),min(a[-1])/2*1.18)
for angle in [0,1.256,2.513,3.770,5.027]:
    # closed collar web, shallow outward valleys only; no hollow arch.
    add_ball((.06+math.cos(angle)*.48,.02+math.sin(angle)*.43,.46),.48)
    add_ball((.04+math.cos(angle)*.66,.01+math.sin(angle)*.58,.24),.38)

bpy.context.view_layer.objects.active=mob; mob.select_set(True); bpy.ops.object.convert(target='MESH'); wood=bpy.context.active_object; wood.name="GEO_B3_WeldedButtressTree"
# Facet the welded implicit surface without random displacement.
for poly in wood.data.polygons: poly.use_smooth=False

def hull(name,center,scale,seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=center); o=bpy.context.active_object; o.name=name; relink(o)
    for i,v in enumerate(o.data.vertices):
        k=.80+((i*17+seed*9)%19)/55; d=.80+((i*11+seed*5)%13)/48
        v.co.x*=scale[0]*k; v.co.y*=scale[1]*d; v.co.z*=scale[2]*k
    return o
canopies=[]
for gi,(name,cs,ss) in enumerate([
 ('Left',[(-1.35,.04,3.98),(-1.62,.10,4.03),(-1.19,-.14,4.24)],[(.78,.60,.54),(.62,.50,.46),(.57,.46,.43)]),
 ('High',[(.14,-.08,4.78),(.43,-.12,5.02),(-.06,.04,4.73)],[(.84,.64,.64),(.65,.54,.53),(.60,.50,.47)]),
 ('Right',[(1.36,-.18,3.85),(1.65,-.23,3.91),(1.39,-.04,4.10)],[(.76,.58,.51),(.60,.48,.44),(.55,.45,.40)])]):
    for hi,(c,s) in enumerate(zip(cs,ss)): canopies.append(hull('GEO_B3_Canopy_%s_%d'%(name,hi+1),c,s,gi*5+hi))

mat=bpy.data.materials.new('MAT_B3_Neutral'); mat.diffuse_color=(.53,.56,.58,1)
for o in [wood]+canopies:
    o.data.materials.append(mat)
bpy.ops.mesh.primitive_plane_add(size=18,location=(0,0,0)); ground=bpy.context.active_object; ground.name='REF_B3_Ground'; relink(ground); gm=bpy.data.materials.new('MAT_B3_Ground'); gm.diffuse_color=(.09,.1,.11,1); ground.data.materials.append(gm)
def look(o,p): o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,energy,size in [('REF_B3_Key',(4,-5,8),900,5),('REF_B3_Fill',(-5,2,5),500,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.active_object;o.name=name;relink(o);o.data.energy=energy;o.data.size=size;look(o,(0,0,2.5))
bpy.ops.object.camera_add();cam=bpy.context.active_object;cam.name='REF_B3_Camera';relink(cam);cam.data.lens=52;scene.camera=cam
for label,loc in {'front':(0,-12,4),'rear':(0,12,4),'left':(-12,0,4),'right':(12,0,4),'three_quarter':(9,-10,5.2)}.items():
    cam.location=loc;look(cam,(.05,0,2.75));scene.render.filepath=str(RENDERS/('pass3_'+label+'.png'));bpy.ops.render.render(write_still=True)

# Graph audit is computed from actual mesh topology, never object count.
neighbors={v.index:set() for v in wood.data.vertices}; uses={}
for e in wood.data.edges:
    x,y=e.vertices;neighbors[x].add(y);neighbors[y].add(x)
for f in wood.data.polygons:
    vs=f.vertices
    for i,x in enumerate(vs):
        k=tuple(sorted((x,vs[(i+1)%len(vs)])));uses[k]=uses.get(k,0)+1
unseen=set(neighbors); comps=[]
while unseen:
    s=unseen.pop();q=[s];n=1
    while q:
        x=q.pop(); fresh=neighbors[x]&unseen;unseen-=fresh;n+=len(fresh);q.extend(fresh)
    comps.append(n)
volume=sum((Vector(wood.data.vertices[f.vertices[0]].co).dot(Vector(wood.data.vertices[f.vertices[1]].co).cross(Vector(wood.data.vertices[f.vertices[2]].co))))/6 for f in wood.data.polygons if len(f.vertices)>=3)
mesh_objs=[wood]+canopies; tris=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in mesh_objs); coords=[o.matrix_world@v.co for o in mesh_objs for v in o.data.vertices]; bounds={z:[min(getattr(v,z) for v in coords),max(getattr(v,z) for v in coords)] for z in 'xyz'}
audit={'inputSha256':hashlib.sha256(raw).hexdigest(),'inputSchema':plan['schema'],'woodConnectedComponents':len(comps),'componentVertexCounts':sorted(comps,reverse=True),'boundaryEdges':sum(v==1 for v in uses.values()),'nonManifoldEdges':sum(v>2 for v in uses.values()),'signedVolume':volume,'selfIntersectionCheck':'implicit metaball surface converted directly to one mesh; no CSG or duplicate shell construction; visual all-angle inspection required','triangleCountIncludingCanopy':tris,'bounds':bounds,'asBuiltDeviation':'Frozen core paths/tapers sampled directly; added grounded collar/web samples below root upper contours as authorized by final review.'}
(OUT/'final-mesh-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'trial-b-roble-pass3-massing.blend')); print(audit)
