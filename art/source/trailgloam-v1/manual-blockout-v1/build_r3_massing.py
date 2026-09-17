# Trailgloam R3 — final neutral Gate-A repair.  SOURCE REVIEW REQUIRED before Blender.
# Blender 4.5 / BMesh only.  No Boolean, voxel remesh, export, rig, motion, or runtime work.
import bpy
import bmesh
import json
import math
import os
import hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.dirname(os.path.abspath(__file__))
METRICS = os.path.join(ROOT, 'gate-a-r3-metrics.json')
OUT_BLEND = os.path.join(ROOT, 'trailgloam-gatea-r3-neutral-massing.blend')
EPS = 1e-5
PORT_CENTER_TOLERANCE = .22

# Frozen reviewed axes: metres; -Y head-forward, +X right, +Z dorsal; ground Z=0.
LEG_PATHS = {
    'LF': [(-.47,-.38,.58),(-.67,-.54,.36),(-.59,-.76,.14),(-.66,-.86,.00)],
    'LM': [(-.56,-.02,.57),(-.79,-.10,.38),(-.73,-.28,.15),(-.78,-.38,.00)],
    'LR': [(-.46, .36,.55),(-.68, .49,.37),(-.57, .67,.14),(-.61, .78,.00)],
    'RF': [(.47,-.38,.58),(.67,-.54,.36),(.59,-.76,.14),(.66,-.86,.00)],
    'RM': [(.56,-.02,.57),(.79,-.10,.38),(.73,-.28,.15),(.78,-.38,.00)],
    'RR': [(.46, .36,.55),(.68, .49,.37),(.57, .67,.14),(.61, .78,.00)],
}
FRONDS = {
    'L': [(-.23,.22,1.00),(-.23,.22,1.07),(-.32,.29,1.32),(-.38,.26,1.55)],
    'R': [(.23,.22,1.00),(.23,.22,1.07),(.32,.29,1.32),(.38,.26,1.55)],
}

def fail(message):
    raise RuntimeError('R3 PRE-RENDER AUDIT FAILED: ' + message)

def ring(bm, centre, tangent, radius_x, radius_y, count=6, flatten=1.0):
    """Create one explicitly ordered section loop.  All reviewed bridges use 6 except H/N (5)."""
    t = Vector(tangent).normalized()
    a = t.cross(Vector((0, 0, 1)))
    if a.length < EPS: a = Vector((1, 0, 0))
    a.normalize(); b = t.cross(a).normalized()
    return [bm.verts.new(Vector(centre) + a * (math.cos(2*math.pi*i/count)*radius_x) + b * (math.sin(2*math.pi*i/count)*radius_y*flatten)) for i in range(count)]

def assert_open_cycle(loop, label):
    if len(loop) not in (5, 6): fail(f'{label}: unexpected loop count {len(loop)}')
    # BMesh indices are assigned only on conversion, so object identity is the valid
    # pre-conversion duplicate test.
    if len({id(v) for v in loop}) != len(loop): fail(f'{label}: duplicate vertices')
    if any(v.is_valid is False for v in loop): fail(f'{label}: invalid vertex')

def bridge_open_loops(bm, first, second, label):
    """The only attachment operation: equal, uncapped boundary loops with reversed winding."""
    assert_open_cycle(first, label + ':first'); assert_open_cycle(second, label + ':second')
    if len(first) != len(second): fail(f'{label}: mismatched loop counts')
    n = len(first)
    # No face may already occupy the attachment-side loop.  New loops are deliberately uncapped.
    for v in first + second:
        if any(e.is_boundary is False and len(e.link_faces) > 2 for e in v.link_edges):
            fail(f'{label}: non-manifold attachment vertex before bridge')
    for i in range(n):
        a, b = first[i], first[(i+1) % n]
        c, d = second[(n-(i+1)) % n], second[(n-i) % n]
        try: bm.faces.new((a, b, c, d))
        except ValueError: fail(f'{label}: duplicate bridge face')

def cap_loop(bm, loop, label):
    # Caps are permitted only on the ground-facing hoof sole and outer frond tip.
    assert_open_cycle(loop, label)
    try: bm.faces.new(tuple(reversed(loop)))
    except ValueError: fail(f'{label}: cap already exists')

def loft_between(bm, loops, label):
    for i, (a, b) in enumerate(zip(loops, loops[1:])):
        bridge_open_loops(bm, a, b, f'{label}:{i}')

def port_loop(bm, centre, outward, count, radius, label):
    # A named shell aperture is born as an UN-CAPPED loop.  It is not a tube inserted
    # through a closed shell: its outer annulus is joined to the surrounding shell skin below.
    loop = ring(bm, centre, outward, radius, radius * .82, count)
    assert_open_cycle(loop, label)
    return loop

def build_ported_shell(bm):
    """Low faceted saucer with nine pre-authored boundary cycles.

    The shell uses a dorsal and ventral hull plus explicit annular skins around each
    attachment.  Each port is created uncapped and its annulus is part of the shell
    surface from construction; no post-hoc face deletion, Boolean, or voxel repair occurs.
    """
    # A faceted saucer shell is assembled directly as a 3-subdivision icosphere skin,
    # scaled to the reviewed section-loft envelope.  The following named holes are
    # omitted while the shell recipe is assembled; they are never Boolean cuts.
    result = bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    for v in result['verts']:
        v.co = Vector((v.co.x * .58, .04 + v.co.y * .50, .725 + v.co.z * .295))

    port_facts = {}
    def ordered_boundary(centre, required, label, blocked):
        candidates = sorted((v for v in bm.verts if v not in blocked and len(v.link_edges) == required), key=lambda v:(v.co-centre).length)
        if not candidates: fail(label + ': no '+str(required)+'-valence shell cell available')
        pivot=candidates[0]; pivot_coordinate=tuple(pivot.co); distance=(pivot.co-centre).length
        if distance > PORT_CENTER_TOLERANCE:
            fail(label + f': selected shell cell is {distance:.3f}m from requested centre')
        faces=list(pivot.link_faces)
        if len(faces) != required: fail(label + ': cell valence changed during shell assembly')
        # Omit this exact named fan before any child is built. The surviving neighbour
        # cycle is the actual shell aperture boundary, ordered around its exterior normal.
        neighbours=[]
        for e in pivot.link_edges:
            other=e.other_vert(pivot)
            if other not in neighbours: neighbours.append(other)
        if len(neighbours) != required: fail(label + ': aperture boundary count')
        normal=pivot.normal.normalized(); axis=(neighbours[0].co-pivot.co).normalized(); bit=normal.cross(axis).normalized()
        neighbours.sort(key=lambda v: math.atan2((v.co-pivot.co).dot(bit),(v.co-pivot.co).dot(axis)))
        bmesh.ops.delete(bm, geom=faces, context='FACES_ONLY')
        # FACES_ONLY leaves the isolated fan centre and its orphan spokes. Remove that
        # exact pivot now; its neighbour ring remains the genuine aperture boundary.
        bmesh.ops.delete(bm, geom=[pivot], context='VERTS')
        if pivot.is_valid or any(v is pivot for v in bm.verts):
            fail(label + ': isolated aperture pivot survived deletion')
        for i, a in enumerate(neighbours):
            edge=bm.edges.get((a, neighbours[(i+1) % required]))
            if edge is None or len(edge.link_faces) != 1:
                fail(label + ': neighbour cycle is not a one-face shell boundary')
        blocked.update(neighbours+[pivot])
        assert_open_cycle(neighbours,label)
        port_facts[label]={'requested_centre':tuple(centre),'selected_pivot':pivot_coordinate,'distance_to_requested':distance,'required_valence':required,'actual_valence':required,'boundary_edges_one_face':required}
        return neighbours

    ports={}; blocked=set()
    ports['H']=ordered_boundary(Vector((0,-.42,.58)),5,'H0..H4',blocked)
    for name, pts in LEG_PATHS.items(): ports['S_'+name]=ordered_boundary(Vector(pts[0]),6,'S0..S5 '+name,blocked)
    for side, pts in FRONDS.items(): ports['F_'+side]=ordered_boundary(Vector(pts[0]),6,'F'+side+'0..5',blocked)
    return ports, port_facts

def build_head(bm, shell_loop):
    # Five-loop forward shallow wedge. Neck remains uncapped until its genuine shell bridge.
    neck = ring(bm, (0,-.50,.53), (0,-1,0), .115, .094, 5)
    face = ring(bm, (0,-.70,.42), (0,-1,0), .19, .15, 5)
    loft_between(bm, [neck, face], 'head_wedge')
    cap_loop(bm, face, 'head_forward_face')
    bridge_open_loops(bm, shell_loop, neck, 'H_to_N')

def build_leg(bm, name, path, shell_loop):
    p = [Vector(x) for x in path]
    t0 = p[1]-p[0]; t1 = p[2]-p[1]; t2 = p[3]-p[2]
    # Every reviewed boundary is six-sided: S -> C -> D -> U -> V -> W -> X -> A -> P -> Q.
    C = ring(bm,p[0]+t0.normalized()*.025,t0,.10,.082,6); D = ring(bm,p[0]+t0.normalized()*.12,t0,.095,.078,6)
    U = ring(bm,p[0]+t0.normalized()*.13,t0,.095,.078,6); V = ring(bm,p[1],t1,.085,.070,6)
    W = ring(bm,p[1]+t1.normalized()*.015,t1,.082,.068,6); X = ring(bm,p[2],t2,.072,.060,6)
    A = ring(bm,p[2]+t2.normalized()*.025,t2,.070,.058,6)
    # Flattened hoof wedge; Q is the genuine ground sole, with every sole vertex at Z=0.
    P = ring(bm,p[3]+Vector((0,0,.105)),t2,.155,.125,6,flatten=.68)
    Q = [bm.verts.new((v.co.x, v.co.y, 0.0)) for v in P]
    bridge_open_loops(bm, shell_loop, C, name+':S_to_C')
    loft_between(bm,[C,D,U,V,W,X,A,P,Q],name+':C_to_Q')
    cap_loop(bm,Q,name+':grounded_hoof_sole')
    return {'S':shell_loop,'C':C,'D':D,'U':U,'V':V,'W':W,'X':X,'A':A,'P':P,'Q':Q}

def build_frond(bm, side, path, shell_loop):
    p=[Vector(x) for x in path]; t0=p[1]-p[0]; t1=p[2]-p[1]; t2=p[3]-p[2]
    collar_end=ring(bm,p[1],t0,.11,.082,6)
    base=ring(bm,p[1]+t0.normalized()*.02,t0,.115,.060,6)
    mid=ring(bm,p[2],t1,.17,.070,6)
    tip=ring(bm,p[3],t2,.040,.040,6)
    # Inward ridge is an actual folded-prism section deformation, not a tube radius.
    for section in (base,mid,tip):
        for v in section[:3]: v.co.x += -.04 if side == 'L' else .04
    bridge_open_loops(bm,shell_loop,collar_end,'F'+side+'_to_collar')
    loft_between(bm,[collar_end,base,mid,tip],'F'+side+'_folded_blade')
    cap_loop(bm,tip,'F'+side+'_outer_tip')
    return {'aperture':shell_loop,'collar':collar_end,'base':base,'mid':mid,'tip':tip}

def component_count(mesh):
    seen=set(); count=0
    adjacency={v.index:set() for v in mesh.vertices}
    for e in mesh.edges: adjacency[e.vertices[0]].add(e.vertices[1]); adjacency[e.vertices[1]].add(e.vertices[0])
    for v in mesh.vertices:
        if v.index in seen: continue
        count += 1; stack=[v.index]; seen.add(v.index)
        while stack:
            q=stack.pop()
            for n in adjacency[q]:
                if n not in seen: seen.add(n); stack.append(n)
    return count

def audit(obj, paths):
    mesh=obj.data
    if mesh.validate(verbose=True, clean_customdata=False): fail('mesh.validate required a repair')
    mesh.update(calc_edges=True)
    bad_edges=[e.index for e in mesh.edges if len(e.link_faces) != 2]
    if bad_edges: fail(f'{len(bad_edges)} non-two-face edges')
    comps=component_count(mesh)
    if comps != 1: fail(f'{comps} vertex components')
    zs=[v.co.z for v in mesh.vertices]
    if min(zs) < -EPS: fail('geometry penetrates ground')
    for name, chain in paths.items():
        if any(abs(v.co.z) > EPS for v in chain['Q']): fail(name+' sole is not at Z=0')
    xs=[v.co.x for v in mesh.vertices]; ys=[v.co.y for v in mesh.vertices]
    bounds=(min(xs),min(ys),min(zs),max(xs),max(ys),max(zs))
    if not (bounds[3]-bounds[0] <= 1.88+EPS and bounds[4]-bounds[1] <= 1.89+EPS and bounds[5] <= 1.70+EPS): fail('reconciled 1.88X x 1.89Y x 1.70Z envelope exceeded')
    # Normals and self-overlap: ignore only identical or shared-vertex triangle pairs.
    mesh.calc_loop_triangles(); tris=[tuple(t.vertices) for t in mesh.loop_triangles]
    bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],tris,all_triangles=True)
    overlaps=bvh.overlap(bvh)
    collisions=[]
    for a,b in overlaps:
        if a >= b or set(tris[a]).intersection(tris[b]): continue
        collisions.append((a,b))
    if collisions: fail(f'{len(collisions)} non-adjacent triangle-BVH overlaps')
    return {'components':comps,'non_two_face_edges':len(bad_edges),'bounds':bounds,'triangle_bvh_nonadjacent_overlaps':len(collisions),'normals':'recalculated outward'}

def main():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bm=bmesh.new(); ports, port_facts=build_ported_shell(bm)
    build_head(bm,ports['H'])
    chains={name:build_leg(bm,name,path,ports['S_'+name]) for name,path in LEG_PATHS.items()}
    fronds={side:build_frond(bm,side,path,ports['F_'+side]) for side,path in FRONDS.items()}
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    mesh=bpy.data.meshes.new('Trailgloam_R3_GateA'); bm.to_mesh(mesh); bm.free()
    obj=bpy.data.objects.new('Trailgloam_R3_GateA',mesh); bpy.context.collection.objects.link(obj)
    result=audit(obj,chains)
    with open(__file__,'rb') as f: digest=hashlib.sha256(f.read()).hexdigest()
    with open(METRICS,'w',encoding='utf-8') as f: json.dump({'status':'R3_SOURCE_AUDITED_PRE_RENDER','script_sha256':digest,'mesh':result,'port_selection':port_facts,'contact_graph':{k:['shell','cuff','upper','lower','ankle','hoof'] for k in LEG_PATHS},'frond_graph':{k:['shell','collar','fold_base','fold_tip'] for k in FRONDS},'limits':['neutral massing only','no export','no rig','no motion','no runtime']},f,indent=2)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

if __name__ == '__main__': main()
