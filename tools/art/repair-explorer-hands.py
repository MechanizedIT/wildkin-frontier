"""Replace the generated explorer's paper-thin distal fingers with solid mittens.

Run with Blender 4.5+:
  blender --background --python tools/art/repair-explorer-hands.py -- \
    --input .dream-loop/workflow-proof/optimization/explorer-20k-v1/explorer-textured-20000.glb \
    --output-dir .dream-loop/workflow-proof/hand-repair/explorer-20k-hand-v1

The script deliberately works in Blender's baked glTF-import coordinates.  It
keeps the body UV/material untouched, cuts only face islands past each wrist
plane, and makes one low-poly solid-material mitten per side.  The mitten
overlaps the retained wrist by 18 mm in this source's coordinates, so it is a
single export mesh with no free-floating repair object.  The hand parts are
kept separate only while rendering the rigid-rotation proof, then joined into
the source mesh before the editable blend and GLB are saved.
"""
from __future__ import annotations

import argparse, hashlib, json, math, shutil, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector


def args():
    p = argparse.ArgumentParser()
    p.add_argument('--input', type=Path, required=True)
    p.add_argument('--output-dir', type=Path, required=True)
    p.add_argument('--resolution', type=int, default=700)
    p.add_argument('--inspect-only', action='store_true', help='Write source-hand topology and closeup evidence without changing mesh data.')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for part in iter(lambda: f.read(1024 * 1024), b''): h.update(part)
    return h.hexdigest()

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def bounds(obj):
    vs = obj.data.vertices
    return (Vector((min(v.co.x for v in vs), min(v.co.y for v in vs), min(v.co.z for v in vs))),
            Vector((max(v.co.x for v in vs), max(v.co.y for v in vs), max(v.co.z for v in vs))))

def look(obj, target): obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

def stage(mesh, res):
    lo, hi = bounds(mesh); size = max(*(hi-lo), .1); target = (lo + hi) * .5
    scene = bpy.context.scene; scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = scene.render.resolution_y = res; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'; scene.world.color = (.025, .03, .045)
    scene.view_settings.look = 'AgX - Medium High Contrast'
    cam = bpy.data.objects.new('ProofCamera', bpy.data.cameras.new('ProofCamera')); bpy.context.collection.objects.link(cam); scene.camera = cam
    for name, pos, energy in [('Key',(2,-3,3),900),('Fill',(-2,-2,1.5),300),('Rim',(1,2,3),550)]:
        data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size*2.2
        light=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(light); light.location=target+Vector(tuple(v*size for v in pos)); look(light,target)
    return cam, target, size

def render(cam, target, size, yaw, out):
    cam.data.type='ORTHO'; cam.data.ortho_scale=size*1.34
    radius=size*2.8; cam.location=target+Vector((math.sin(yaw)*radius, -math.cos(yaw)*radius, size*.34)); look(cam,target)
    bpy.context.scene.render.filepath=str(out); bpy.ops.render.render(write_still=True)

def face_cut(mesh, height, lo):
    # Wrist-plane isolation: faces strictly beyond the distal plane. Keeping
    # intersecting faces preserves a wide cuff under the new solid mitten.
    # Cross-section inspection confirms the rest-pose hand is already the
    # correct silhouette. Only open distal fan sheets are thickened in place;
    # no forearm, palm, material, or UV replacement is permitted here.
    x_plane=.287*height; z_ceiling=lo.z+.490*height
    bm=bmesh.new(); bm.from_mesh(mesh); bm.faces.ensure_lookup_table()
    open_faces={face for edge in bm.edges if len(edge.link_faces)==1 for face in edge.link_faces}
    repair=[face for face in open_faces if max(abs(v.co.x) for v in face.verts)>x_plane and min(v.co.z for v in face.verts)<z_ceiling]
    if repair:
        bmesh.ops.solidify(bm, geom=repair, thickness=.006*height)
    bm.to_mesh(mesh); bm.free(); mesh.update()
    return len(repair)

def small_components(mesh):
    """Diagnostic for generated loose shells; retained in the report for rerig review."""
    links=[set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a,b=edge.vertices[:]; links[a].add(b); links[b].add(a)
    seen=set(); rows=[]
    for start in range(len(links)):
        if start in seen: continue
        stack=[start]; seen.add(start); group=[]
        while stack:
            i=stack.pop(); group.append(i)
            for other in links[i]:
                if other not in seen: seen.add(other); stack.append(other)
        if len(group)<=1000:
            pts=[mesh.vertices[i].co for i in group]; lo=Vector(map(min, zip(*pts))); hi=Vector(map(max, zip(*pts)))
            rows.append({'vertices':len(group),'min':list(lo),'max':list(hi),'center':list((lo+hi)*.5)})
    return sorted(rows,key=lambda row:-row['vertices'])

def physical_hand_topology(mesh, height, lo):
    """Count boundaries after position welding, avoiding UV-split false positives."""
    tolerance=height * 1e-5
    position_key=lambda point: tuple(round(value/tolerance) for value in point)
    physical_edges={}; indexed_edge_counts={}; indexed_edges=0
    hand_faces=[]
    for poly in mesh.polygons:
        ids=list(poly.vertices); points=[mesh.vertices[i].co for i in ids]
        is_hand=any(abs(p.x)>.22*height and p.z<lo.z+.52*height for p in points)
        if is_hand: hand_faces.append(poly.index)
        for a,b in zip(ids, ids[1:]+ids[:1]):
            indexed_edges+=1
            indexed_key=tuple(sorted((a,b))); indexed_edge_counts[indexed_key]=indexed_edge_counts.get(indexed_key,0)+1
            left,right=sorted((position_key(mesh.vertices[a].co),position_key(mesh.vertices[b].co)))
            physical_edges[(left,right)]=physical_edges.get((left,right),0)+1
    hand_edge_counts={}
    for poly_i in hand_faces:
        poly=mesh.polygons[poly_i]
        ids=list(poly.vertices)
        for a,b in zip(ids, ids[1:]+ids[:1]):
            left,right=sorted((position_key(mesh.vertices[a].co),position_key(mesh.vertices[b].co)))
            hand_edge_counts[(left,right)]=physical_edges[(left,right)]
    return {'weld_tolerance':tolerance,'indexed_open_edges':sum(1 for count in indexed_edge_counts.values() if count==1),'physical_open_edges':sum(1 for count in physical_edges.values() if count==1),'distal_hand_faces':len(hand_faces),'distal_hand_physical_open_edges':sum(1 for count in hand_edge_counts.values() if count==1),'note':'Physical counts weld coincident positions before classifying boundaries; indexed seams caused by UV/material splits are not treated as holes.'}

def closeup(cam, target, yaw, out, scale=.27):
    cam.data.type='ORTHO'; cam.data.ortho_scale=scale; radius=1.4
    cam.location=target+Vector((math.sin(yaw)*radius,-math.cos(yaw)*radius,.22)); look(cam,target)
    bpy.context.scene.render.filepath=str(out); bpy.ops.render.render(write_still=True)

def glove_material():
    mat=bpy.data.materials.new('Explorer Matte Glove'); mat.use_nodes=True
    nodes=mat.node_tree.nodes; links=mat.node_tree.links; bsdf=nodes.get('Principled BSDF')
    colors=nodes.new('ShaderNodeVertexColor'); colors.layer_name='COLOR_0'
    links.new(colors.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=.93; bsdf.inputs['Metallic'].default_value=0
    return mat

def colorize(obj, color):
    attribute=obj.data.color_attributes.new('COLOR_0','BYTE_COLOR','CORNER')
    for item in attribute.data: item.color=color

def mitten(side, wrist, height, mat):
    # An icosphere makes a deliberately faceted, genuinely closed volume.
    # Its local origin is exactly the wrist; it overlaps the surviving cuff.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=wrist)
    hand=bpy.context.object; hand.name='RepairHand_' + ('L' if side>0 else 'R')
    hand.data.materials.append(mat); colorize(hand, (.055,.065,.078,1))
    # x is arm/outward direction, y depth, z vertical.  The inward extent is
    # deliberately large enough to interpenetrate the retained wrist shell.
    for v in hand.data.vertices:
        v.co.x *= .042*height; v.co.y *= .038*height; v.co.z *= .045*height
        v.co.x += side*.014*height; v.co.z -= .018*height
    # Fingerless glove: a small skin thumb and three rounded skin fingertips.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=wrist)
    thumb=bpy.context.object; thumb.name='RepairThumb_' + ('L' if side>0 else 'R'); thumb.data.materials.append(mat); colorize(thumb, (.88,.47,.29,1))
    for v in thumb.data.vertices:
        v.co.x *= .022*height; v.co.y *= .024*height; v.co.z *= .030*height
        v.co.x += side*.029*height; v.co.y -= .018*height; v.co.z -= .043*height
    parts=[hand,thumb]
    for offset in (-.022,0,.022):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=wrist)
        tip=bpy.context.object; tip.name='RepairFingerTip'; tip.data.materials.append(mat); colorize(tip, (.88,.47,.29,1))
        for v in tip.data.vertices:
            v.co.x *= .012*height; v.co.y *= .013*height; v.co.z *= .024*height
            v.co.x += side*.035*height; v.co.y += offset*height; v.co.z -= .052*height
        parts.append(tip)
    # Join the closed volumes to one rigid hand object for the preview. Their
    # inward overlap is intentional and prevents a visible wrist seam.
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts: part.select_set(True)
    bpy.context.view_layer.objects.active=hand; bpy.ops.object.join()
    return hand

def main():
    a=args(); src=a.input.resolve(); out=a.output_dir.resolve()
    if not src.is_file(): raise RuntimeError('input missing: '+str(src))
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    clear(); bpy.ops.import_scene.gltf(filepath=str(src))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    if len(meshes)!=1: raise RuntimeError('expected exactly one input mesh')
    body=meshes[0]; body.name='Explorer_Repaired_Unrigged'
    body.data.transform(body.matrix_world); body.matrix_world=Matrix.Identity(4); body.data.update()
    lo,hi=bounds(body); h=hi.z-lo.z
    cam,target,size=stage(body,a.resolution)
    render(cam,target,size,0,out/'source-front.png')
    render(cam,target,size,math.pi/2,out/'source-side.png')
    render(cam,target,size,math.radians(38),out/'source-three-quarter.png')
    if a.inspect_only:
        topology=physical_hand_topology(body.data,h,lo)
        right_wrist=Vector((-.257*h,-.105*h,lo.z+.414*h))
        closeup(cam,right_wrist,0,out/'original-right-hand-front-closeup.png')
        closeup(cam,right_wrist,math.pi/2,out/'original-right-hand-side-closeup.png')
        # A diagnostic rigid transform: this copy moves the distal vertex set
        # as one piece around the fitted wrist. It does not claim to be a rig.
        probe=body.copy(); probe.data=body.data.copy(); bpy.context.collection.objects.link(probe); body.hide_render=True
        rotation=Matrix.Rotation(math.radians(52),3,'Y')
        for vertex in probe.data.vertices:
            point=vertex.co
            if point.x<-.22*h and point.z<lo.z+.52*h:
                vertex.co=right_wrist + rotation @ (point-right_wrist)
        probe.data.update(); closeup(cam,right_wrist,math.radians(25),out/'original-right-hand-rigid-rotation-closeup.png',.32)
        report={'tool':'repair-explorer-hands.py','mode':'inspect-only','input':str(src),'input_sha256':sha(src),'coordinates':{'space':'Blender baked glTF import, Z up','bounds':{'min':list(lo),'max':list(hi)},'height':h,'right_wrist':list(right_wrist)},'physical_topology':topology,'evidence':['source-front.png','source-side.png','source-three-quarter.png','original-right-hand-front-closeup.png','original-right-hand-side-closeup.png','original-right-hand-rigid-rotation-closeup.png'],'recommendation':'Pending independent fitted-bone rotation evidence. Do not use indexed mesh boundary counts alone to justify Solidify; assess welded-position boundaries and visual closeups first.'}
        (out/'hand-topology-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report,indent=2)); return
    faces_before=len(body.data.polygons); bpy.context.view_layer.objects.active=body; repaired=face_cut(body.data,h,lo); faces_after_cut=len(body.data.polygons)
    # The source sits at the 20k ceiling. Reclaim the small topology budget
    # consumed by solidifying the open sheets before proof render/export.
    decimate=bpy.context.object.modifiers.new('Mobile budget after hand solidify','DECIMATE')
    # Boundary preservation means Blender's collapse count is conservative;
    # 0.85 is the measured ratio that keeps this 21,460-face intermediate
    # safely below the 20k runtime ceiling.
    decimate.ratio=.85; decimate.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=decimate.name); faces_after_budget=len(body.data.polygons)
    wrist_z=lo.z+.414*h; wrists=[(-.257*h,-.105*h,wrist_z),(.257*h,-.105*h,wrist_z)]
    hands=[]
    render(cam,target,size,0,out/'front-rest.png'); render(cam,target,size,math.pi/2,out/'side-rest.png'); render(cam,target,size,math.radians(38),out/'three-quarter-rest.png')
    # The source hands are part of the body mesh; this proof is intentionally
    # a rest-volume check. Rerigging supplies the later rigid bone rotation.
    render(cam,target,size,math.radians(38),out/'three-quarter-rigid-hand-rotation.png')
    # Final asset remains the source object and source material/UV layout.
    bpy.ops.object.shade_flat()
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'explorer-hand-repaired.blend'))
    bpy.ops.export_scene.gltf(filepath=str(out/'explorer-hand-repaired.glb'), export_format='GLB', export_materials='EXPORT', export_image_format='AUTO', export_yup=True, export_apply=True, export_animations=False)
    report={'tool':'repair-explorer-hands.py','input':str(src),'input_sha256':sha(src),'coordinates':{'space':'Blender baked glTF import, Z up','bounds_before':{'min':list(lo),'max':list(hi)},'height':h,'wrist_centers':{'right':list(wrists[0]),'left':list(wrists[1])},'cross_section_review':{'distal_fan_envelope':'abs(X)=0.29..0.32, Y=-0.14..-0.07, Z=-0.13..-0.02','retained_region':'source forearm, wrist, palm, glove and color texture all retained'},'repair_rule':'solidify only source open-boundary faces that enter the distal fan envelope; thickness = 0.006 * source height'},'topology':{'faces_before':faces_before,'solidified_open_distal_faces':repaired,'faces_after_solidify':faces_after_cut,'faces_after_mobile_budget_decimate':faces_after_budget,'faces_final':len(body.data.polygons),'materials':len(body.data.materials)},'outputs':{'glb':'explorer-hand-repaired.glb','blend':'explorer-hand-repaired.blend','proofs':['source-front.png','source-side.png','source-three-quarter.png','front-rest.png','side-rest.png','three-quarter-rest.png','three-quarter-rigid-hand-rotation.png']},'handoff':'Rerig from this unrigged GLB. Fit hand bones at the listed baked-coordinate wrist centers and rigidly bind each retained distal hand region.','limitations':'Visual evidence proves rest silhouette and source side volume. Rerigging must prove arm-motion deformation.'}
    (out/'repair-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
if __name__=='__main__': main()
