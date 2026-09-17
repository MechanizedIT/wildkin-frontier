# Reusable BMesh one-port diagnostic. SOURCE/PLAN REVIEW REQUIRED BEFORE BLENDER.
# This creates no creature geometry, export, runtime asset, rig, or animation.
import bpy
import bmesh
import json
import math
import os
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.dirname(os.path.abspath(__file__))
METRICS = os.path.join(ROOT, 'one-port-metrics.json')
BLEND = os.path.join(ROOT, 'one-port-probe.blend')
RENDER = os.path.join(ROOT, 'one-port-probe.png')
EPS = 1e-6

def fail(message): raise RuntimeError('ONE-PORT PROBE FAILED: ' + message)

def new_ring(bm, z, radius, count=6):
    return [bm.verts.new((radius * math.cos(2*math.pi*i/count), radius * math.sin(2*math.pi*i/count), z)) for i in range(count)]

def bridge(bm, a, b, label):
    if len(a) != len(b) or len(a) != 6: fail(label + ': expected equal six loops')
    if len({id(v) for v in a+b}) != 12: fail(label + ': duplicate loop vertex')
    for i in range(6):
        try: bm.faces.new((a[i], a[(i+1)%6], b[(5-i)%6], b[(4-i)%6]))
        except ValueError: fail(label + ': duplicate bridge face')

def cap(bm, loop, label):
    try: bm.faces.new(tuple(reversed(loop)))
    except ValueError: fail(label + ': duplicate cap')

def diagnose_fan_deletion():
    """Records Blender 4.5 BMesh semantics separately from the replacement method.

    `FACES_ONLY` removes faces only, deliberately leaving the pivot and its wire spokes.
    Deleting that pivot removes the spokes. This does not prove an angle-sorted neighbour
    list is a topological cycle; the production port avoids that inference entirely.
    """
    bm=bmesh.new(); pivot=bm.verts.new((0,0,0)); loop=new_ring(bm,0,.25)
    faces=[]
    for i in range(6): faces.append(bm.faces.new((pivot,loop[i],loop[(i+1)%6])))
    bmesh.ops.delete(bm,geom=faces,context='FACES_ONLY')
    after_faces={'pivot_valid':pivot.is_valid,'pivot_edges':len(pivot.link_edges),'wire_edges':sum(1 for e in pivot.link_edges if not e.link_faces)}
    bmesh.ops.delete(bm,geom=[pivot],context='VERTS')
    after_pivot={'pivot_valid':pivot.is_valid,'remaining_wire_edges':sum(1 for e in bm.edges if not e.link_faces)}
    bm.free(); return {'after_faces_only':after_faces,'after_pivot_delete':after_pivot}

def build_closed_shell_with_port(bm):
    # Explicit 6->6 annulus: no sphere-face selection, no face deletion, no inferred ordering.
    bottom=new_ring(bm,0.00,.50)
    outer=new_ring(bm,.32,.50)
    aperture=new_ring(bm,.32,.16)
    collar_top=new_ring(bm,.52,.12)
    bridge(bm,bottom,outer,'shell_side')
    bridge(bm,outer,aperture,'shell_top_annulus')
    cap(bm,bottom,'shell_bottom')
    bridge(bm,aperture,collar_top,'aperture_to_collar')
    cap(bm,collar_top,'collar_outer_cap')
    return {'bottom':bottom,'outer':outer,'aperture':aperture,'collar_top':collar_top}

def audit(mesh, aperture_snapshot):
    if mesh.validate(verbose=True,clean_customdata=False): fail('mesh.validate repaired data')
    mesh.update(calc_edges=True)
    # MeshEdge exposes vertex pairs, not BMesh's `link_faces`. Derive incidence from
    # MeshPolygon edge_keys after conversion; the BMesh lifetime ended above.
    face_incidence={edge.key:0 for edge in mesh.edges}
    for polygon in mesh.polygons:
        for edge_key in polygon.edge_keys: face_incidence[edge_key] = face_incidence.get(edge_key,0) + 1
    non_two=[edge_key for edge_key,count in face_incidence.items() if count != 2]
    if non_two: fail(f'{len(non_two)} non-two-face edges')
    if len(mesh.polygons) > 1000: fail(f'{len(mesh.polygons)} faces exceeds diagnostic cap')
    adjacency={v.index:set() for v in mesh.vertices}
    for e in mesh.edges: adjacency[e.vertices[0]].add(e.vertices[1]); adjacency[e.vertices[1]].add(e.vertices[0])
    seen=set(); stack=[mesh.vertices[0].index]
    while stack:
        current=stack.pop()
        if current in seen: continue
        seen.add(current); stack.extend(adjacency[current]-seen)
    if len(seen)!=len(mesh.vertices): fail('not one vertex component')
    mesh.calc_loop_triangles(); triangles=[tuple(t.vertices) for t in mesh.loop_triangles]
    bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],triangles,all_triangles=True)
    bad=[]
    for a,b in bvh.overlap(bvh):
        if a<b and not set(triangles[a]).intersection(triangles[b]): bad.append((a,b))
    if bad: fail(f'{len(bad)} non-adjacent BVH overlaps')
    return {'vertices':len(mesh.vertices),'faces':len(mesh.polygons),'components':1,'non_two_face_edges':0,'bvh_nonadjacent_overlaps':0,'aperture':aperture_snapshot}

def render_neutral():
    world=bpy.context.scene.world or bpy.data.worlds.new('World'); bpy.context.scene.world=world; world.color=(.06,.06,.06)
    bpy.ops.object.light_add(type='AREA', location=(1.8,-2.2,2.4)); bpy.context.object.data.energy=450; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=3
    bpy.ops.object.camera_add(location=(1.2,-1.8,1.1)); camera=bpy.context.object; bpy.context.scene.camera=camera
    direction=Vector((0,0,.26))-camera.location; camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=256; scene.render.resolution_y=256; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.filepath=RENDER
    bpy.ops.render.render(write_still=True)

def main():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    fan_semantics=diagnose_fan_deletion()
    bm=bmesh.new(); loops=build_closed_shell_with_port(bm); bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.verts.index_update()
    aperture_snapshot=[{'bmesh_index':v.index,'coordinate':tuple(v.co)} for v in loops['aperture']]
    mesh=bpy.data.meshes.new('OnePortProbe'); bm.to_mesh(mesh); bm.free()
    obj=bpy.data.objects.new('OnePortProbe',mesh); bpy.context.collection.objects.link(obj)
    report=audit(mesh,aperture_snapshot)
    with open(METRICS,'w',encoding='utf-8') as f: json.dump({'status':'PROBE_AUDITED_BEFORE_RENDER','fan_deletion_semantics':fan_semantics,'mesh':report,'limits':['one abstract shell/collar only','no creature','no export','no runtime']},f,indent=2)
    # This remains after every topology gate. Independent review must authorize execution.
    render_neutral()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)

if __name__ == '__main__': main()
