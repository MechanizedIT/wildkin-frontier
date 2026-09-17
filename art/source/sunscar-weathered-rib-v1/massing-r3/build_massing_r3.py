"""R3 prepared only. Execute only after root source-gate release.
Loads UTF-8 ring.coordinatesXYZ verbatim; never reconstructs coordinates from prose.
"""
import bpy,bmesh,json,hashlib,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[4]; SRC=ROOT/'art/source/sunscar-weathered-rib-v1'; OUT=SRC/'massing-r3'; PLAN=SRC/'geometry-plan-r3-final.json'; EXPECTED='077016a80c180f55ee6fab77873270cd922af236415e00ae4e62448d4420189a'
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def fail(metrics,reason):
 metrics['status']='R3_STRUCTURAL_HOLD';metrics['failure']=reason;(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8');raise RuntimeError(reason)
def area2(poly):return sum(poly[i][0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*poly[i][1] for i in range(len(poly)))/2
def tri_area2(a,b,c):return ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2
def tri_intersection_narrow(a,b,c,d,e,f):
 # Conservative narrow-phase: test all triangle edges against the opposite
 # plane + barycentric containment. Coplanar nonshared triangles fail.
 def hit(p,q,u,v,w):
  n=(v-u).cross(w-u); den=n.dot(q-p)
  if abs(den)<1e-8:return False
  t=n.dot(u-p)/den
  if t<=1e-7 or t>=1-1e-7:return False
  x=p+(q-p)*t; c0=(v-u).cross(x-u).dot(n);c1=(w-v).cross(x-v).dot(n);c2=(u-w).cross(x-w).dot(n)
  return (c0>=-1e-7 and c1>=-1e-7 and c2>=-1e-7) or (c0<=1e-7 and c1<=1e-7 and c2<=1e-7)
 return any(hit(p,q,*other) for p,q in ((a,b),(b,c),(c,a)) for other in ((d,e,f),)) or any(hit(p,q,a,b,c) for p,q in ((d,e),(e,f),(f,d)))
# frozen input, direct coordinate load
if digest(PLAN)!=EXPECTED:raise RuntimeError('R3 input hash mismatch')
plan=json.loads(PLAN.read_text(encoding='utf-8')); coords=plan['ring']['coordinatesXYZ']
if len(coords)!=7 or any(len(r)!=12 for r in coords):raise RuntimeError('expected seven 12-point literal rings')
bpy.ops.wm.read_factory_settings(use_empty=True)
verts=[tuple(xyz) for ring in coords for xyz in ring]; rings=[list(range(s*12,s*12+12)) for s in range(7)]
faces=[[rings[s][i],rings[s+1][i],rings[s+1][(i+1)%12],rings[s][(i+1)%12]] for s in range(6) for i in range(12)]
me=bpy.data.meshes.new('SunscarWeatheredRibR3Mesh');me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me)
# Separate existing concave cap faces; triangulate those exact faces, never triangle_fill.
bv=list(bm.verts); left=bm.faces.new([bv[i] for i in reversed(rings[0])]);right=bm.faces.new([bv[i] for i in rings[-1]])
bmesh.ops.triangulate(bm,faces=[left,right],quad_method='BEAUTY',ngon_method='BEAUTY');bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(me);bm.free();me.update();me.calc_loop_triangles()
obj=bpy.data.objects.new('SunscarWeatheredRib_R3',me);bpy.context.collection.objects.link(obj)
metrics={'status':'R3_PRE_RENDER_AUDIT','input':{'path':'../geometry-plan-r3-final.json','sha256':digest(PLAN)},'literalRingCounts':[len(r) for r in coords]}
# closure/components/bounds/grounding/normals
edges={}
for f in me.polygons:
 vs=list(f.vertices)
 for i,a in enumerate(vs):edges.setdefault(tuple(sorted((a,vs[(i+1)%len(vs)]))),[]).append(f.index)
open_edges=[e for e,x in edges.items() if len(x)!=2];adj={i:set() for i in range(len(me.vertices))}
for a,b in edges:adj[a].add(b);adj[b].add(a)
seen=set();components=0
for v in adj:
 if v not in seen:
  components+=1;todo=[v];seen.add(v)
  while todo:
   x=todo.pop()
   for n in adj[x]:
    if n not in seen:seen.add(n);todo.append(n)
co=[v.co for v in me.vertices];mins=[min(v[i] for v in co) for i in range(3)];maxs=[max(v[i] for v in co) for i in range(3)]
normal_bad=[f.index for f in me.polygons if f.normal.length<.99]
metrics['closure']={'components':components,'nonTwoFaceEdges':len(open_edges),'normalFailures':normal_bad};metrics['bounds']={'min':mins,'max':maxs,'size':[maxs[i]-mins[i] for i in range(3)]};metrics['grounding']={'bottomZ':[me.vertices[i].co.z for r in rings for i in (r[0],r[11])]}
if components!=1 or open_edges or normal_bad or any(abs(z)>1e-7 for z in metrics['grounding']['bottomZ']) or any(abs(a-b)>1e-6 for a,b in zip(mins,[-2.2,-1.05,0])) or any(abs(a-b)>1e-6 for a,b in zip(maxs,[2.2,1.05,1.6])):fail(metrics,'closure/bounds/grounding/normals failed')
# cap winding and full YZ coverage: all cap triangles lie at extreme X and together cover profile area.
tri=[tuple(t.vertices) for t in me.loop_triangles];cap_report=[]
for x,ring,sign in [(-2.2,rings[0],-1),(2.2,rings[-1],1)]:
 ids=[t for t in tri if all(abs(me.vertices[v].co.x-x)<1e-6 for v in t)];poly=[(me.vertices[v].co.y,me.vertices[v].co.z) for v in ring];pabs=abs(area2(poly));areas=[tri_area2(*[(me.vertices[v].co.y,me.vertices[v].co.z) for v in t]) for t in ids]
 cap_report.append({'x':x,'triangles':len(ids),'profileArea':pabs,'signedSum':sum(areas),'absoluteSum':sum(abs(a) for a in areas),'windingPass':all(a*sign>1e-8 for a in areas),'coveragePass':abs(sum(abs(a) for a in areas)-pabs)<=1e-5})
metrics['caps']=cap_report
if not all(c['windingPass'] and c['coveragePass'] for c in cap_report):fail(metrics,'cap winding/coverage failed')
# BVH broad candidates with a narrow-phase for every pair except true shared-edge
# neighbours. A pair with exactly one shared vertex is not waived.
def triangle_edges(face):
 return {tuple(sorted((face[i],face[(i+1)%3]))) for i in range(3)}
pts=[tuple(v.co) for v in me.vertices];tri_edges=[triangle_edges(face) for face in tri]
bvh=BVHTree.FromPolygons(pts,tri,all_triangles=True)
waived_shared_edge=[];single_vertex_tested=[];non_adjacent_tested=[]
confirmed_single_vertex=[];confirmed_non_adjacent=[]
for a,b in bvh.overlap(bvh):
 if a>=b:continue
 common=set(tri[a])&set(tri[b])
 if tri_edges[a]&tri_edges[b]:
  waived_shared_edge.append([a,b]);continue
 A=[Vector(pts[v]) for v in tri[a]];B=[Vector(pts[v]) for v in tri[b]]
 if len(common)==1:
  single_vertex_tested.append([a,b])
  if tri_intersection_narrow(*A,*B):confirmed_single_vertex.append([a,b])
 else:
  non_adjacent_tested.append([a,b])
  if tri_intersection_narrow(*A,*B):confirmed_non_adjacent.append([a,b])
metrics['intersection']={
 'loopTriangles':len(tri),'expected':164,
 'waivedSharedEdgePairs':waived_shared_edge,
 'singleVertexPairsTested':single_vertex_tested,
 'nonAdjacentPairsTested':non_adjacent_tested,
 'confirmedSingleVertex':confirmed_single_vertex,
 'confirmedNonAdjacent':confirmed_non_adjacent,
}
if len(tri)!=164 or confirmed_single_vertex or confirmed_non_adjacent:fail(metrics,'triangle count or confirmed intersection failed')
# Cheap cap-facing opaque proof happens before studio. Remaining studio setup/renders only execute after all above passes.
# (root source gate intentionally reviews this script before any execution.)
metrics['status']='R3_STRUCTURAL_PASS_READY_FOR_CHEAP_CAP_RENDER';(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
if '--execute' not in sys.argv:
 raise RuntimeError('Prepared source intentionally stops before rendering; root release requires --execute.')
# Cheap opaque cap proof, only after every structural gate.
mat=bpy.data.materials.new('R3 warm sandstone');mat.diffuse_color=(.52,.20,.055,1);obj.data.materials.append(mat)
def track_camera(name,loc,lens=52):
 d=bpy.data.cameras.new(name);d.lens=lens;c=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(c);c.location=loc;k=c.constraints.new('TRACK_TO');k.target=obj;k.track_axis='TRACK_NEGATIVE_Z';k.up_axis='UP_Y';return c
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.render.resolution_percentage=100
# Load each saved 96px cap image and measure opacity inside its central 60% frame.
# Transparent film makes this a subject-coverage gate instead of a color heuristic.
CAP_CENTRAL_FRACTION=.20;CAP_ALPHA_THRESHOLD=.50;CAP_MIN_OPAQUE_PIXELS=64;CAP_MIN_CENTRAL_COVERAGE=.015
def cap_opaque_coverage(path,name):
 image=bpy.data.images.load(str(path),check_existing=False)
 try:
  width,height=image.size[:];x0=int(width*CAP_CENTRAL_FRACTION);x1=width-x0;y0=int(height*CAP_CENTRAL_FRACTION);y1=height-y0
  central_pixels=(x1-x0)*(y1-y0);pixels=image.pixels[:];opaque=0
  for y in range(y0,y1):
   for x in range(x0,x1):
    if pixels[(y*width+x)*4+3]>CAP_ALPHA_THRESHOLD:opaque+=1
  coverage=opaque/central_pixels if central_pixels else 0.0
  return {'view':name,'image':path.name,'dimensions':[width,height],'centralRectPixels':[x0,y0,x1,y1],
   'centralPixels':central_pixels,'alphaThreshold':CAP_ALPHA_THRESHOLD,'opaquePixels':opaque,'coverage':coverage,
   'minimumOpaquePixels':CAP_MIN_OPAQUE_PIXELS,'minimumCoverage':CAP_MIN_CENTRAL_COVERAGE,
   'passes':opaque>=CAP_MIN_OPAQUE_PIXELS and coverage>=CAP_MIN_CENTRAL_COVERAGE}
 finally:bpy.data.images.remove(image)
cap_coverage=[]
for name,loc in [('cap-left',(-6,0,.8)),('cap-right',(6,0,.55))]:
 scene.camera=track_camera(name,loc,55);scene.render.resolution_x=scene.render.resolution_y=96;cap_path=OUT/(name+'-opaque.png');scene.render.filepath=str(cap_path);bpy.ops.render.render(write_still=True)
 cap_coverage.append(cap_opaque_coverage(cap_path,name))
metrics['capOpaqueCoverage']=cap_coverage;(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
if not all(item['passes'] for item in cap_coverage):fail(metrics,'opaque cap coverage failed')
scene.render.film_transparent=False
# Studio and all-angle evidence after cap images exist.
bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,-.008));floor=bpy.context.object
for loc,energy,size in [((-4,-5,7),900,5),((4,-2,4),450,4),((3,5,6),700,3)]:
 ld=bpy.data.lights.new('Studio','AREA');ld.energy=energy;ld.size=size;L=bpy.data.objects.new('Studio',ld);bpy.context.collection.objects.link(L);L.location=loc;k=L.constraints.new('TRACK_TO');k.target=obj;k.track_axis='TRACK_NEGATIVE_Z';k.up_axis='UP_Y'
world=bpy.data.worlds.new('World');bpy.context.scene.world=world;world.color=(.04,.04,.04)
cams={'source-threequarter':(5,-6,3.5),'front':(0,-7,2.5),'rear':(0,7,2.5),'left':(-7,0,2.5),'right':(7,0,2.5),'threequarter':(5,-5,3.1)}
for name,loc in cams.items():
 scene.camera=track_camera(name,loc);scene.render.resolution_x=scene.render.resolution_y=512;scene.render.filepath=str(OUT/(name+'-512.png'));bpy.ops.render.render(write_still=True)
scene.camera=track_camera('source-small',cams['source-threequarter'])
for px in (48,96):scene.render.resolution_x=scene.render.resolution_y=px;scene.render.filepath=str(OUT/f'source-threequarter-{px}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunscar-weathered-rib-massing-r3.blend'))
metrics['status']='R3_UNREVIEWED_AFTER_EXECUTION';metrics['renders']=sorted(x.name for x in OUT.glob('*.png'));(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
