"""Observe the terminal R6 artifact; never rebuild, repair or save the mesh."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading
import time
import bpy
import numpy as np

HERE=Path(__file__).resolve().parent
INPUT=HERE/'candidate/held-candidate.blend'
BLEND_SHA='d807fbb961da12b5e2bd21ffd7b66f709818c1c7e3efbd276424f022496eb477'
BUILDER_SHA='9f364a91048ae9ee98f699ec8daa1bf4d83055ec719572d42796a2dba32cf984'


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def signature(xyz,tris):
    h=hashlib.sha256(); h.update(xyz.tobytes()); h.update(tris.tobytes()); return h.hexdigest()


def component_facts(xyz,tris):
    parent=list(range(len(xyz))); rank=[0]*len(xyz)
    def find(a):
        while parent[a]!=a: parent[a]=parent[parent[a]]; a=parent[a]
        return a
    for a,b,c in tris.tolist():
        for first,second in ((a,b),(b,c)):
            x,y=find(first),find(second)
            if x!=y:
                if rank[x]<rank[y]: x,y=y,x
                parent[y]=x
                if rank[x]==rank[y]: rank[x]+=1
    labels=np.array([find(i) for i in range(len(xyz))],dtype=np.int32)
    roots,inverse=np.unique(labels,return_inverse=True)
    face_labels=inverse[tris[:,0]]
    assert np.array_equal(face_labels,inverse[tris[:,1]]) and np.array_equal(face_labels,inverse[tris[:,2]])
    counts=np.bincount(face_labels,minlength=len(roots))
    a,b,c=(xyz[tris[:,i]].astype(np.float64) for i in range(3))
    areas=np.bincount(face_labels,weights=np.linalg.norm(np.cross(b-a,c-a),axis=1)*.5,minlength=len(roots))
    volumes=np.bincount(face_labels,weights=np.einsum('ij,ij->i',a,np.cross(b,c))/6,minlength=len(roots))
    rows=[]
    for index in np.argsort(counts)[::-1]:
        if not counts[index]: continue
        coords=xyz[inverse==index]
        rows.append({'component_root':int(roots[index]),'triangles':int(counts[index]),'vertices':len(coords),
                     'area':float(areas[index]),'signed_volume':float(volumes[index]),
                     'bounds':{'min':coords.min(axis=0).tolist(),'max':coords.max(axis=0).tolist()}})
    return {'face_bearing_vertex_connected_components':len(rows),'components_by_triangle_count':rows,
            'negative_signed_volume_components':int((volumes[counts>0]<0).sum()),
            'positive_signed_volume_components':int((volumes[counts>0]>0).sum()),
            'nesting_or_physical_solid_count_tested':False,
            'note':'Surface graph components are not automatically separate physical solids; cavity nesting and self-intersections are not established by these counts.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); output=args.output_dir
    assert output.is_absolute() and not output.exists()
    assert digest(INPUT)==BLEND_SHA and digest(HERE/'build-candidate.py')==BUILDER_SHA
    spec=importlib.util.spec_from_file_location('r6_builder',HERE/'build-candidate.py')
    helper=importlib.util.module_from_spec(spec); spec.loader.exec_module(helper)
    assert helper.free_gib()>=8
    output.mkdir(parents=True); samples=[]; stop=threading.Event(); start=time.monotonic()
    def watchdog():
        while not stop.is_set():
            available=helper.free_gib(); samples.append(available)
            if available<6:
                helper.write(output/'reserve-breach.json',{'free_gib':available,'pid':os.getpid()}); os._exit(77)
            stop.wait(.5)
    threading.Thread(target=watchdog,daemon=True).start()
    receipt={'source_blend_sha256':BLEND_SHA,'script_sha256':digest(__file__),'status':'running'}
    try:
        bpy.ops.wm.open_mainfile(filepath=str(INPUT))
        raw=bpy.data.objects['Lantern_R5_Raw_Master']; work=bpy.data.objects['Lantern_R6_Work']
        assert not raw.modifiers and not work.modifiers
        raw_xyz,raw_tris=helper.mesh_arrays(raw.data); xyz,tris=helper.mesh_arrays(work.data)
        assert len(xyz)==62510 and len(tris)==124172
        assert len(raw_xyz)==1077634 and len(raw_tris)==2218798
        before={'raw':signature(raw_xyz,raw_tris),'r6':signature(xyz,tris)}
        facts=component_facts(xyz,tris); assert facts['face_bearing_vertex_connected_components']==240
        helper.write(output/'component-facts.json',facts)
        inspector=helper.load_module('inspect-lantern-geometry.py','r6_inspector')
        studio=helper.load_module('inspect-generated-glb.py','r6_studio')
        params=json.loads((HERE/'parameters.json').read_text(encoding='utf-8'))
        assert digest(HERE/'parameters.json')==helper.PARAM_SHA
        raw.hide_set(False); work.hide_set(False)
        frames,renders=helper.render_comparison(output,raw,work,inspector,studio,params['preservation_and_exposure']['review_material'])
        helper.write(output/'render-framing.json',frames)
        after={'raw':signature(*helper.mesh_arrays(raw.data)),'r6':signature(*helper.mesh_arrays(work.data))}
        assert before==after and digest(INPUT)==BLEND_SHA
        receipt.update({'status':'terminal HOLD artifact observed; no repair or admission',
                        'geometry_signatures_before':before,'geometry_signatures_after':after,
                        'raw_counts':[len(raw_xyz),len(raw_tris)],'r6_counts':[len(xyz),len(tris)],
                        'renders':renders,'source_file_unchanged':True,
                        'no_modifiers_or_mesh_mutations_or_save_invoked':True})
    except Exception as error:
        receipt.update({'status':'diagnostic failed','error':str(error)}); raise
    finally:
        stop.set(); receipt.update({'elapsed_seconds':time.monotonic()-start,'min_sampled_free_gib':min(samples) if samples else helper.free_gib()})
        helper.write(output/'run-receipt.json',receipt); print(json.dumps(receipt),flush=True)


if __name__=='__main__': main()
