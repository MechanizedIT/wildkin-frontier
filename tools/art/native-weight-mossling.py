"""One native bone-heat trial on a welded Mossling copy; no gait bake.

Run with an externally owned 120-second / 6-GB process guard and four threads.
UVs remain per face corner. Small decorative shells receive rigid anatomical
owners separately. Bone-heat failure is recorded and not silently retried.
"""
from pathlib import Path
import bpy, bmesh, hashlib, json, struct, time

ROOT=Path('C:/Users/cwood/Documents/mobile-rpg')
OUT=ROOT/'.dream-loop/overnight-mossling-motion/volume-v4native'

def corners(mesh):
    faces=[]
    for p in mesh.data.polygons:
        row=[]
        for i in p.loop_indices:
            v=mesh.data.vertices[mesh.data.loops[i].vertex_index]
            row.append(struct.pack('<5f',*v.co,*mesh.data.uv_layers.active.data[i].uv))
        faces.append(b''.join(sorted(row)))
    return hashlib.sha256(b''.join(sorted(faces))).hexdigest()

def main():
    started=time.time()
    s={}
    exec(compile((ROOT/'tools/art/study-mossling-deformation.py').read_text(), 'study-mossling-deformation.py','exec'),s)
    s['OUT']=OUT
    s['setup']()
    rig=bpy.data.objects[s['RIG']];mesh=bpy.data.objects[s['MESH']]
    report={'source_blend_sha256':s['REPORT']['source_blend_sha256'],'source_glb_sha256':s['REPORT']['source_glb_sha256'], 'input_vertices':len(mesh.data.vertices),'input_triangles':len(mesh.data.polygons),'before_corner_position_uv_sha256':corners(mesh)}
    for view in ['side','front','three-quarter']:s['capture']('source','neutral',view)
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.000001)
    bpy.ops.object.mode_set(mode='OBJECT')
    report.update({'welded_vertices':len(mesh.data.vertices),'welded_triangles':len(mesh.data.polygons),'after_corner_position_uv_sha256':corners(mesh)})
    # Connectivity is established with native welding, not UV-split indices.
    adjacent=[set() for _ in mesh.data.vertices]
    for edge in mesh.data.edges:
        a,b=edge.vertices;adjacent[a].add(b);adjacent[b].add(a)
    unseen=set(range(len(adjacent)));components=[]
    while unseen:
        seed=unseen.pop();found={seed};todo=[seed]
        while todo:
            for v in adjacent[todo.pop()]:
                if v in unseen:unseen.remove(v);found.add(v);todo.append(v)
        components.append(found)
    components.sort(key=len,reverse=True);body=components[0]
    report['component_sizes']=[len(c) for c in components]
    print(json.dumps(report),flush=True)
    # Heat is solved only on the principal connected body. The original
    # welded surface remains intact and retains its per-loop texture UVs.
    temp=mesh.copy();temp.data=mesh.data.copy();temp.name='TemporaryBodyHeatSolve';bpy.context.scene.collection.objects.link(temp)
    for mod in list(temp.modifiers):temp.modifiers.remove(mod)
    temp.parent=None
    for group in list(temp.vertex_groups):temp.vertex_groups.remove(group)
    bm=bmesh.new();bm.from_mesh(temp.data);bm.verts.ensure_lookup_table()
    source_id=bm.verts.layers.int.new('StudySourceVertex')
    for v in bm.verts:v[source_id]=v.index
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in body],context='VERTS')
    bm.to_mesh(temp.data);bm.free()
    for b in rig.data.bones:b.use_deform=b.name not in ('root','spine')
    bpy.ops.object.select_all(action='DESELECT');temp.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    heat_start=time.time()
    try:
        result=bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        report['native_operator_result']=list(result)
    except Exception as exc:
        report['native_exception']=repr(exc)
    report['heat_seconds']=time.time()-heat_start
    weights={}
    mapping=temp.data.attributes['StudySourceVertex']
    for v in temp.data.vertices:
        weights[mapping.data[v.index].value]={temp.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>1e-8}
    report['heat_unweighted_body_vertices']=sum(not value for value in weights.values())
    report['heat_body_vertices']=len(weights)
    if report['heat_unweighted_body_vertices'] or 'native_exception' in report:
        report['status']='NATIVE_HEAT_FAILED; no retry or replacement skin admitted'
        (OUT/'native-report.json').write_text(json.dumps(report,indent=2))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'native-heat-failed.blend'))
        print(json.dumps(report),flush=True)
        return
    # Rigid small shells follow head, pelvis, or their existing tail owner.
    for component in components[1:]:
        center=sum((mesh.data.vertices[i].co for i in component),s['Vector']())/len(component)
        owner='head' if center.y<-.20 else ('pelvis' if center.y<.53 else 'tail_01')
        if owner=='tail_01':
            vote={}
            for i in component:
                for g in mesh.data.vertices[i].groups:
                    n=mesh.vertex_groups[g.group].name
                    if n.startswith('tail'):vote[n]=vote.get(n,0)+g.weight
            if vote:owner=max(vote,key=vote.get)
        for i in component:weights[i]={owner:1.0}
    crown=[]
    for v in mesh.data.vertices:
        if -.03<v.co.y<.47 and v.co.z>.565:
            weights[v.index]={'pelvis':1.0};crown.append(v.index)
    for group in list(mesh.vertex_groups):mesh.vertex_groups.remove(group)
    for b in rig.data.bones:mesh.vertex_groups.new(name=b.name)
    for i,value in weights.items():
        best=sorted(value.items(),key=lambda kv:-kv[1])[:4];total=sum(w for n,w in best)
        for name,weight in best:mesh.vertex_groups[name].add([i],weight/total,'REPLACE')
    bpy.data.objects.remove(temp,do_unlink=True);mesh.data.update();mesh.update_tag(refresh={'DATA'})
    report['rigid_crown_vertices']=len(crown)
    report['max_influences']=max(len(v.groups) for v in mesh.data.vertices)
    report['unweighted_vertices']=sum(not v.groups for v in mesh.data.vertices)
    for name in s['FRAMES']:
        for view in ['side','front','three-quarter']:s['capture']('after',name,view)
    s['REPORT']['native_trial']=report
    s['finalize']()
    report['derivative_blend_sha256']=s['sha'](OUT/'mossling-volume-study.blend')
    report['total_seconds']=time.time()-started
    report['status']='THREE_POSE_REVIEW_REQUIRED; no full gait or GLB export'
    report['script_sha256']=s['sha'](__file__)
    (OUT/'native-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)

if __name__=='__main__':main()
