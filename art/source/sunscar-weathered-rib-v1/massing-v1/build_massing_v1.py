import bpy, json, hashlib, math, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[4]
SRC=ROOT/'art'/'source'/'sunscar-weathered-rib-v1'
OUT=SRC/'massing-v1'
PLAN=SRC/'geometry-plan-v2.json'
EXPECTED=''
# The V2 file is the sole numerical input: never duplicate station values here.
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
plan=json.loads(PLAN.read_text(encoding='utf-8'))
if plan['schemaVersion'] != 2 or plan['asset'] != 'sunscar-weathered-rib-v1': raise RuntimeError('unexpected plan identity')
for k in ('primaryLoft','connectedTerraces','topologyConvention','envelopeMeters'):
    if k not in plan: raise RuntimeError('missing plan key '+k)

# Fresh scene
bpy.ops.wm.read_factory_settings(use_empty=True)
verts=[]; rings=[]
for s,station in enumerate(plan['primaryLoft']['stations']):
    ring=[]
    for depth_frac, height_frac in plan['primaryLoft']['loopCoordinates']:
        ring.append(len(verts))
        verts.append((station['x'], depth_frac*station['depth'], height_frac*station['height']))
    rings.append(ring)
faces=[]; face_tags=[]
def quad_indices(s,i):
    return [rings[s][i],rings[s+1][i],rings[s+1][(i+1)%8],rings[s][(i+1)%8]]
# exactly table-driven face centres
centers={}
def key(s,i): return (s,i)
def set_centers():
    for op in plan['connectedTerraces']:
        if op['name']=='upper_cap_facets':
            a,b=op['inclusiveStationFaceRange']; offset=op['centerOffsetBlenderXYZ']
            for s in range(a,b+1):
                for i in op['loopEdgeIndices']: centers[key(s,i)]=tuple(offset)
        elif op['name']=='front_bedding_ledge':
            a,b=op['inclusiveStationFaceRange']; offset=op['centerOffsetBlenderXYZ']
            for s in range(a,b+1): centers[key(s,op['loopEdgeIndices'][0])]=tuple(offset)
        elif op['name']=='vertical_erosion_gullies':
            for label,offset in op['centerOffsetsBlenderXYZ'].items():
                s=int(label.split('[')[1].split(']')[0]); i=int(label.split('[')[2].split(']')[0]); centers[key(s,i)]=tuple(offset)
        else: raise RuntimeError('unknown detail '+op['name'])
set_centers()
for s in range(len(rings)-1):
    for i in range(8):
        q=quad_indices(s,i)
        if key(s,i) not in centers:
            faces.append(q); face_tags.append(f'Q[{s}][{i}]')
        else:
            off=centers[key(s,i)]; c=tuple(sum(verts[v][axis] for v in q)/4+off[axis] for axis in range(3)); ci=len(verts); verts.append(c)
            faces.extend([[q[0],q[1],ci],[q[1],q[2],ci],[q[2],q[3],ci],[q[3],q[0],ci]])
            face_tags.extend([f'C[{s}][{i}]']*4)
# post-detail caps: written order, mesh normals recalc follows.
faces.append(list(reversed(rings[0]))); face_tags.append('cap_left')
faces.append(rings[-1]); face_tags.append('cap_right')
mesh=bpy.data.meshes.new('SunscarWeatheredRibMesh')
mesh.from_pydata(verts,[],faces); mesh.update()
obj=bpy.data.objects.new('SunscarWeatheredRib_V1',mesh); bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj; obj.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
mat=bpy.data.materials.new('Sunscar warm ochre sandstone'); mat.diffuse_color=(0.55,0.24,0.075,1); mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=(0.54,0.20,0.055,1); bsdf.inputs['Roughness'].default_value=.9
obj.data.materials.append(mat)
# flat-facet material only; no texture/extra materials.
for p in mesh.polygons: p.use_smooth=False

# Audit mesh topology, bounds, grounding, normals and nonadjacent BVH overlaps.
edge_faces={}
for poly in mesh.polygons:
    vs=list(poly.vertices)
    for j,a in enumerate(vs):
        b=vs[(j+1)%len(vs)]; e=tuple(sorted((a,b))); edge_faces.setdefault(e,[]).append(poly.index)
open_edges=[e for e,fs in edge_faces.items() if len(fs)!=2]
# vertex-connected component count
adj={i:set() for i in range(len(mesh.vertices))}
for a,b in edge_faces: adj[a].add(b); adj[b].add(a)
seen=set(); comps=0
for v in adj:
    if v in seen: continue
    comps+=1; stack=[v]; seen.add(v)
    while stack:
        x=stack.pop()
        for n in adj[x]:
            if n not in seen: seen.add(n);stack.append(n)
coords=[v.co for v in mesh.vertices]
mins=[min(v[i] for v in coords) for i in range(3)]; maxs=[max(v[i] for v in coords) for i in range(3)]
# Fan/quad n-gons are triangulated for actual triangle cost.
triangles=[]
for poly in mesh.polygons:
    vs=list(poly.vertices)
    for j in range(1,len(vs)-1): triangles.append((vs[0],vs[j],vs[j+1],poly.index))
# BVH against own triangulation; only report hit pairs sharing no vertex (can flag true self intersections).
bvh=BVHTree.FromPolygons([tuple(v.co) for v in mesh.vertices],[t[:3] for t in triangles],all_triangles=True)
overlap=[]; boundary_touch_pairs=[]
for a,b in bvh.overlap(bvh):
    if a>=b: continue
    va=set(triangles[a][:3]); vb=set(triangles[b][:3])
    if va.intersection(vb): continue
    # BVH reports closed-shell cap/side boundary contact even when the two
    # triangles share no vertex after n-gon triangulation. Retain that fact,
    # but classify it separately when their AABB intersection has zero volume.
    ta,tb=triangles[a][:3],triangles[b][:3]
    spans=[]
    for axis in range(3):
        lo=max(min(mesh.vertices[v].co[axis] for v in ta),min(mesh.vertices[v].co[axis] for v in tb))
        hi=min(max(mesh.vertices[v].co[axis] for v in ta),max(mesh.vertices[v].co[axis] for v in tb))
        spans.append(hi-lo)
    if any(span <= 1e-7 for span in spans): boundary_touch_pairs.append([a,b])
    else: overlap.append([a,b])
normal_bad=[]
center=sum((Vector(v) for v in verts),Vector())/len(verts)
for poly in mesh.polygons:
    c=poly.center; # local coords
    if poly.normal.length<.99: normal_bad.append(poly.index)
# render composition
world=bpy.context.scene.world or bpy.data.worlds.new('World'); bpy.context.scene.world=world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.05,0.05,0.05,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.18
# floor separate from subject and excluded from audit
bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,-.008)); floor=bpy.context.object; floor.name='NeutralGround'; fm=bpy.data.materials.new('Neutral ground'); fm.diffuse_color=(.11,.11,.11,1); floor.data.materials.append(fm)
# lights
for name,loc,energy,size in [('Key',(-4,-5,7),900,5),('Fill',(4,-2,4),450,4),('Rim',(3,5,6),700,3)]:
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size; light=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(light); light.location=loc
    con=light.constraints.new(type='TRACK_TO'); con.target=obj; con.track_axis='TRACK_NEGATIVE_Z'; con.up_axis='UP_Y'
# camera
def camera_for(name,loc,lens=52):
    data=bpy.data.cameras.new(name); data.lens=lens; cam=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(cam); cam.location=loc; con=cam.constraints.new(type='TRACK_TO'); con.target=obj; con.track_axis='TRACK_NEGATIVE_Z'; con.up_axis='UP_Y'; return cam
cams={
 'source-threequarter':camera_for('camera_source', (5,-6,3.5)),
 'front':camera_for('camera_front',(0,-7,2.5)),
 'rear':camera_for('camera_rear',(0,7,2.5)),
 'left':camera_for('camera_left',(-7,0,2.5)),
 'right':camera_for('camera_right',(7,0,2.5)),
 'threequarter':camera_for('camera_threequarter',(5,-5,3.1)),
}
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.render.resolution_x=512;scene.render.resolution_y=512
for name,cam in cams.items():
    scene.camera=cam; scene.render.filepath=str(OUT/f'{name}-512.png'); bpy.ops.render.render(write_still=True)
# 48/96 representations use source-facing camera only.
scene.camera=cams['source-threequarter']
for px in (48,96):
    scene.render.resolution_x=px;scene.render.resolution_y=px;scene.render.filepath=str(OUT/f'source-threequarter-{px}.png');bpy.ops.render.render(write_still=True)
scene.render.resolution_x=512;scene.render.resolution_y=512
# persist Blend
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunscar-weathered-rib-massing-v1.blend'))
metrics={
 'status':'INITIAL_MASSING_UNREVIEWED', 'asset':'sunscar-weathered-rib-v1',
 'input':{'geometryPlan':'../geometry-plan-v2.json','sha256':sha(PLAN)},
 'method':'one connected seven-station eight-vertex loft with table-driven in-place shared centre-fan replacements, then end caps',
 'declaredEnvelopeMeters':plan['envelopeMeters'],
 'actualBoundsBlenderXYZ':{'min':mins,'max':maxs,'size':[maxs[i]-mins[i] for i in range(3)]},
 'grounding':{'minimumZ':mins[2],'bottomRingZValues':sorted(set(round(mesh.vertices[v].co.z,8) for ring in rings for v in (ring[0],ring[-1]))),'passes':abs(mins[2])<1e-7},
 'topology':{'vertices':len(mesh.vertices),'faces':len(mesh.polygons),'trianglesAfterFanTriangulation':len(triangles),'components':comps,'edges':len(edge_faces),'nonTwoFaceEdges':len(open_edges),'normalFailures':normal_bad,'nonAdjacentTriangleOverlapPairs':overlap[:20],'nonAdjacentTriangleOverlapCount':len(overlap),'zeroVolumeBoundaryTouchPairs':boundary_touch_pairs[:20],'zeroVolumeBoundaryTouchCount':len(boundary_touch_pairs)},
 'planTriangleArithmeticNote':'The executed mesh contains 140 triangles after triangulating 32 untouched quads, 16 four-triangle centre fans, and two 6-triangle caps. This differs from the plan estimate of 156, while remaining below 700; it is recorded for independent review rather than normalized to the estimate.',
 'visualCaveat':'Centre fans create recess/dimple facets, not a broad projecting ledge. Independent review must decide whether the long cap/high left shoulder and bedding transition read sufficiently; this build does not self-pass that requirement.',
 'renders':[p.name for p in sorted(OUT.glob('*.png'))],
 'blend':'sunscar-weathered-rib-massing-v1.blend'
}
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
if open_edges or comps!=1 or abs(mins[2])>1e-6 or overlap: raise RuntimeError('structural audit failure; metrics preserved')
print(json.dumps(metrics['topology']))
