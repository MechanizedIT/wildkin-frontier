import bpy,bmesh,json,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[4]; SRC=ROOT/'art/source/sunscar-weathered-rib-v1'; OUT=SRC/'massing-r2'; PLAN=SRC/'geometry-plan-r2.json'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=json.loads(PLAN.read_text()); assert sha(PLAN)=='d6bd4f21ad76b9901712c9c9ba2bec2148472e4fe1f439dc480d83f4fd6e1d5b'
bpy.ops.wm.read_factory_settings(use_empty=True)
# Direct plan interpretation: (normalised depth,Z) table, seven rings x 11.
def profile(st):
 d,l,u=st['depth'],st['lower'],st['upper']
 return [(-.5,0),(-.5,.42*l),(-.5,.68*l),(-.18,.68*l),(-.18,.92*l),(-.18,u),(.14,u),(.30,.96*u),(.5,.68*u),(.5,.28*l),(.5,0)]
verts=[];rings=[]
for st in plan['stations']:
 r=[]
 for yn,z in profile(st):r.append(len(verts));verts.append((st['x'],yn*st['depth'],z))
 rings.append(r)
faces=[]
for s in range(6):
 for i in range(11):faces.append([rings[s][i],rings[s+1][i],rings[s+1][(i+1)%11],rings[s][(i+1)%11]])
# Mesh sides then bmesh closed end ngon fill as prescribed.
me=bpy.data.meshes.new('SunscarWeatheredRibR2Mesh');me.from_pydata(verts,[],faces);me.update()
bm=bmesh.new();bm.from_mesh(me)
# bmesh rings track same order; create 11-edge end ngons then triangulate them.
bverts=list(bm.verts); left=[bverts[i] for i in reversed(rings[0])]; right=[bverts[i] for i in rings[-1]]
capfaces=[]
for ring in (left,right):capfaces.append(bm.faces.new(ring))
cap_edges=[e for f in capfaces for e in f.edges]
# triangle_fill operates on the open boundary, so retire temporary ngons first.
bmesh.ops.delete(bm,geom=capfaces,context='FACES_ONLY')
bmesh.ops.triangle_fill(bm,edges=cap_edges,use_beauty=True)
bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(me);bm.free();me.update()
obj=bpy.data.objects.new('SunscarWeatheredRib_R2',me);bpy.context.collection.objects.link(obj)
mat=bpy.data.materials.new('Warm ochre sandstone');mat.diffuse_color=(.52,.20,.055,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.52,.20,.055,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;me.materials.append(mat)
for f in me.polygons:f.use_smooth=False
# structural metrics first
edges={}
for f in me.polygons:
 vs=list(f.vertices)
 for i,a in enumerate(vs):edges.setdefault(tuple(sorted((a,vs[(i+1)%len(vs)]))),[]).append(f.index)
openE=[e for e,fs in edges.items() if len(fs)!=2]; adj={i:set() for i in range(len(me.vertices))}
for a,b in edges:adj[a].add(b);adj[b].add(a)
seen=set();comps=0
for v in adj:
 if v not in seen:
  comps+=1;stack=[v];seen.add(v)
  while stack:
   x=stack.pop()
   for n in adj[x]:
    if n not in seen:seen.add(n);stack.append(n)
co=[v.co for v in me.vertices];mi=[min(v[i] for v in co) for i in range(3)];ma=[max(v[i] for v in co) for i in range(3)]
tris=[]
for f in me.polygons:
 vs=list(f.vertices)
 for j in range(1,len(vs)-1):tris.append((vs[0],vs[j],vs[j+1]))
bvh=BVHTree.FromPolygons([tuple(v.co) for v in me.vertices],tris,all_triangles=True);over=[];touch=[]
for a,b in bvh.overlap(bvh):
 if a>=b or set(tris[a])&set(tris[b]):continue
 spans=[]
 for ax in range(3):spans.append(min(max(me.vertices[v].co[ax] for v in tris[a]),max(me.vertices[v].co[ax] for v in tris[b]))-max(min(me.vertices[v].co[ax] for v in tris[a]),min(me.vertices[v].co[ax] for v in tris[b])))
 (touch if any(x<=1e-5 for x in spans) else over).append([a,b])
# studio
bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,-.008));floor=bpy.context.object;fm=bpy.data.materials.new('Neutral ground');fm.diffuse_color=(.1,.1,.1,1);floor.data.materials.append(fm)
w=bpy.data.worlds.new('World');bpy.context.scene.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs['Color'].default_value=(.04,.04,.04,1);w.node_tree.nodes['Background'].inputs['Strength'].default_value=.2
for loc,e,size in [((-4,-5,7),900,5),((4,-2,4),450,4),((3,5,6),700,3)]:
 ld=bpy.data.lights.new('Studio','AREA');ld.energy=e;ld.shape='DISK';ld.size=size;L=bpy.data.objects.new('Studio',ld);bpy.context.collection.objects.link(L);L.location=loc;c=L.constraints.new('TRACK_TO');c.target=obj;c.track_axis='TRACK_NEGATIVE_Z';c.up_axis='UP_Y'
def cam(n,loc):
 d=bpy.data.cameras.new(n);d.lens=52;o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=loc;c=o.constraints.new('TRACK_TO');c.target=obj;c.track_axis='TRACK_NEGATIVE_Z';c.up_axis='UP_Y';return o
cams={'source-threequarter':cam('source',(5,-6,3.5)),'front':cam('front',(0,-7,2.5)),'rear':cam('rear',(0,7,2.5)),'left':cam('left',(-7,0,2.5)),'right':cam('right',(7,0,2.5)),'threequarter':cam('threequarter',(5,-5,3.1))}
sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE_NEXT';sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.resolution_x=sc.render.resolution_y=512
for n,c in cams.items():sc.camera=c;sc.render.filepath=str(OUT/(n+'-512.png'));bpy.ops.render.render(write_still=True)
sc.camera=cams['source-threequarter']
for px in (48,96):sc.render.resolution_x=sc.render.resolution_y=px;sc.render.filepath=str(OUT/f'source-threequarter-{px}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunscar-weathered-rib-massing-r2.blend'))
metrics={'status':'R2_FOCUSED_MASSING_UNREVIEWED','input':{'geometryPlan':'../geometry-plan-r2.json','sha256':sha(PLAN)},'topology':{'vertices':len(me.vertices),'faces':len(me.polygons),'triangles':len(tris),'components':comps,'nonTwoFaceEdges':len(openE),'nonAdjacentPositiveVolumeOverlaps':over,'zeroVolumeNonSharedTouchPairs':touch},'bounds':{'min':mi,'max':ma,'size':[ma[i]-mi[i] for i in range(3)]},'grounding':{'allRingBottomsZ':sorted(set(round(me.vertices[i].co.z,8) for r in rings for i in (r[0],r[10]))),'passes':abs(mi[2])<1e-7},'note':'R2 uses real shared shelf edges (2-3 and 5-6), no centre fans/slabs/booleans. Visual Gate A remains independent.','renders':sorted(p.name for p in OUT.glob('*.png'))}
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
if openE or comps!=1 or over or abs(mi[2])>1e-6:raise RuntimeError('audit failure preserved')
print(json.dumps(metrics))
