"""One reviewed main-component Lantern reconstruction; never overwrite R5."""
import argparse
import ctypes
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
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PARAM_SHA = 'b3d4c5f3b44e0be11bb9c891468562b3b32d2452489215d8cb4aa6a60f5827fd'
RAW_SHA = 'e25bdd049cf9a7d8d4e1a7df9e4193e9840b0b550c6052b134d3d88cd6276120'
LABEL_SHA = '1e810f70152b60a04dd4bf4eb05966106b1b7a4dddf0b99eed1d1bfe94586071'


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_module(filename, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools/art' / filename)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def free_gib():
    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (name, ctypes.c_ulonglong) for name in ('total','available','page_total',
            'page_available','virtual_total','virtual_available','extended')]
    value = Status(); value.length = ctypes.sizeof(value)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(value)):
        raise RuntimeError('Cannot measure RAM')
    return value.available / 2**30


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def mesh_arrays(mesh):
    mesh.calc_loop_triangles()
    xyz = np.empty((len(mesh.vertices),3), dtype=np.float32)
    tris = np.empty((len(mesh.loop_triangles),3), dtype=np.int32)
    mesh.vertices.foreach_get('co', xyz.reshape(-1))
    mesh.loop_triangles.foreach_get('vertices', tris.reshape(-1))
    return xyz, tris


def audit(xyz, tris, components=False):
    assert np.isfinite(xyz).all(), 'Non-finite positions'
    assert len(tris) and tris.min() >= 0 and tris.max() < len(xyz)
    repeated = (tris[:,0] == tris[:,1]) | (tris[:,1] == tris[:,2]) | (tris[:,2] == tris[:,0])
    zero = 0; area = volume = 0.0
    for begin in range(0,len(tris),200000):
        a,b,c = (xyz[tris[begin:begin+200000,i]].astype(np.float64) for i in range(3))
        cross = np.cross(b-a,c-a); magnitudes = np.linalg.norm(cross,axis=1)
        zero += int((magnitudes == 0).sum()); area += float(magnitudes.sum()) * .5
        volume += float(np.einsum('ij,ij->i',a,np.cross(b,c)).sum()) / 6
    edges = np.empty(len(tris)*3,dtype=np.uint64)
    direction = np.empty(len(tris)*3,dtype=np.int8)
    for index,(a,b) in enumerate(((0,1),(1,2),(2,0))):
        first,second = tris[:,a],tris[:,b]
        lower = np.minimum(first,second).astype(np.uint64)
        upper = np.maximum(first,second).astype(np.uint64)
        target = slice(index*len(tris),(index+1)*len(tris))
        edges[target] = (lower << 32) | upper
        direction[target] = np.where(first < second,1,-1)
    order = np.argsort(edges)
    keys,starts,counts = np.unique(edges[order],return_index=True,return_counts=True)
    sums = np.add.reduceat(direction[order].astype(np.int32),starts)
    used = np.unique(tris)
    result = {'vertices':len(xyz),'triangles':len(tris),'boundary_edges':int((counts==1).sum()),
              'nonmanifold_edges':int((counts>2).sum()),
              'inconsistent_two_face_edge_directions':int(((counts==2)&(sums!=0)).sum()),
              'unused_vertices':len(xyz)-len(used),'repeated_index_faces':int(repeated.sum()),
              'zero_area_faces':zero,'area':area,'signed_volume':volume,
              'bounds':{'min':xyz.min(axis=0).tolist(),'max':xyz.max(axis=0).tolist()},
              'self_intersections_tested':False}
    if components:
        parent = list(range(len(xyz))); rank = [0]*len(xyz)
        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]; a = parent[a]
            return a
        for key in keys.tolist():
            a,b = find(key >> 32),find(key & 0xffffffff)
            if a != b:
                if rank[a] < rank[b]: a,b=b,a
                parent[b]=a
                if rank[a]==rank[b]: rank[a]+=1
        result['face_bearing_vertex_connected_components'] = len({find(int(i)) for i in used})
    return result


def create_work(xyz, tris):
    mesh = bpy.data.meshes.new('Lantern_R6_main_component')
    mesh.vertices.add(len(xyz)); mesh.vertices.foreach_set('co',xyz.reshape(-1))
    mesh.loops.add(tris.size); mesh.loops.foreach_set('vertex_index',tris.reshape(-1))
    mesh.polygons.add(len(tris))
    mesh.polygons.foreach_set('loop_start',np.arange(len(tris),dtype=np.int32)*3)
    mesh.polygons.foreach_set('loop_total',np.full(len(tris),3,dtype=np.int32))
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new('Lantern_R6_Work',mesh); bpy.context.collection.objects.link(obj)
    return obj


def material(obj, settings, label):
    mat = bpy.data.materials.new(label); mat.use_nodes=True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value=settings['base_color_linear']
    node.inputs['Roughness'].default_value=settings['roughness']
    node.inputs['Metallic'].default_value=settings['metallic']
    obj.data.materials.clear(); obj.data.materials.append(mat)


def render_comparison(output, raw, work, inspector, studio, settings):
    minimum,maximum = studio.scene_bounds([raw])
    camera,target,largest = studio.configure_studio(minimum,maximum,512)
    scene=bpy.context.scene; scene.view_settings.exposure=settings['exposure_ev']
    camera.data.type='ORTHO'
    corners=[Vector((x,y,z)) for x in (minimum.x,maximum.x)
             for y in (minimum.y,maximum.y) for z in (minimum.z,maximum.z)]
    floor=bpy.data.objects.get('Matte Studio Floor')
    frames=[]; renders=[]
    render_dir=output/'renders'; render_dir.mkdir()
    for label,direction in inspector.VIEW_DIRECTIONS:
        camera.location=target+direction.normalized()*largest*2.8
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        rotation=camera.rotation_euler.to_matrix().transposed()
        projected=[rotation@(point-target) for point in corners]
        camera.data.ortho_scale=2*max(max(abs(p.x),abs(p.y)) for p in projected)*1.10
        frames.append({'label':label,'camera_position':list(camera.location),
                       'camera_rotation_euler':list(camera.rotation_euler),
                       'ortho_scale':camera.data.ortho_scale,'full_raw_bounds':{'min':list(minimum),'max':list(maximum)}})
        floor.hide_render=(label=='underside')
        for size in (512,96,48):
            scene.render.resolution_x=scene.render.resolution_y=size
            for name,obj,other in (('r5',raw,work),('r6',work,raw)):
                obj.hide_render=False; other.hide_render=True
                path=(render_dir/f'{name}-{label}-{size}.png').resolve()
                scene.render.filepath=str(path); bpy.ops.render.render(write_still=True)
                assert path.is_file() and path.stat().st_size>0
                renders.append(str(path.relative_to(output)))
    floor.hide_render=False; raw.hide_render=True; work.hide_render=False
    return frames,renders


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    output=args.output_dir
    assert output.is_absolute() and not output.exists(), 'Fresh absolute output required'
    assert free_gib()>=8, 'Need 8GiB before Blender model import'
    assert digest(HERE/'parameters.json')==PARAM_SHA, 'Reviewed parameters changed'
    params=json.loads((HERE/'parameters.json').read_text(encoding='utf-8'))
    source=(HERE/params['inputs']['raw_ply']).resolve()
    labels_path=source.with_name(source.name+'.labels.bin')
    assert digest(source)==RAW_SHA and digest(labels_path)==LABEL_SHA
    assert params['reconstruction']['voxel_size']==.006
    assert params['reconstruction']['fallback'].startswith('none')
    assert params['source_component_selection']['work_copy_only']==[{'root_vertex':1579,'faces':2169924,'vertices':1052031}]
    output.mkdir(parents=True); start=time.monotonic(); stop=threading.Event(); samples=[]
    receipt={'status':'running','source_sha256':RAW_SHA,'parameters_sha256':PARAM_SHA,
             'builder_sha256':digest(__file__),'blender_version':bpy.app.version_string,
             'single_voxel_application':True,'voxel_size':.006}
    def watchdog():
        while not stop.is_set():
            available=free_gib(); samples.append(available)
            if available<6:
                write(output/'reserve-breach.json',{'free_gib':available,'pid':os.getpid()})
                os._exit(77)
            stop.wait(.5)
    threading.Thread(target=watchdog,daemon=True).start()
    try:
        inspector=load_module('inspect-lantern-geometry.py','lantern_inspector')
        studio=load_module('inspect-generated-glb.py','lantern_studio')
        ply_format=load_module('trellis_geometry_ply.py','lantern_ply')
        source_receipt,_=inspector.assert_lantern_contract(source)
        studio.clear_scene()
        raw,positions,checked=inspector.assert_exact_import(source,source_receipt,ply_format)
        raw.name='Lantern_R5_Raw_Master'; raw.hide_render=True
        xyz=positions.reshape(-1,3)
        labels=np.memmap(labels_path,dtype='<u4',mode='r',shape=(len(xyz),))
        faces=np.memmap(source,dtype=np.dtype([('arity','u1'),('indices','<u4',(3,))]),mode='r',
                        offset=checked['header_bytes']+len(xyz)*12,shape=(checked['face_count'],))['indices']
        selected=np.flatnonzero(labels==1579)
        mask=labels[faces[:,0]]==1579
        chosen=faces[mask]
        assert len(selected)==1052031 and len(chosen)==2169924
        assert (labels[chosen]==1579).all()
        remap=np.full(len(xyz),-1,dtype=np.int32); remap[selected]=np.arange(len(selected),dtype=np.int32)
        work_xyz=xyz[selected].copy(); work_tris=remap[chosen]
        before=audit(work_xyz,work_tris)
        write(output/'selected-main-before.json',before)
        work=create_work(work_xyz,work_tris)
        del remap,selected,chosen,mask,work_xyz,work_tris
        bpy.ops.object.select_all(action='DESELECT'); work.select_set(True)
        bpy.context.view_layer.objects.active=work
        mod=work.modifiers.new('One reviewed voxel reconstruction','REMESH')
        for key in ('mode','voxel_size','use_smooth_shade','use_remove_disconnected','scale','threshold','octree_depth'):
            setattr(mod,key,params['reconstruction'][key])
        receipt['actual_modifier_settings']={key:getattr(mod,key) for key in ('mode','voxel_size','use_smooth_shade','use_remove_disconnected','scale','threshold','octree_depth')}
        write(output/'pre-apply-receipt.json',receipt)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        result_xyz,result_tris=mesh_arrays(work.data)
        result=audit(result_xyz,result_tris,components=True)
        write(output/'candidate-audit.json',result)
        geometry=params['gates']['geometry']; errors=[]
        for key in ('boundary_edges','nonmanifold_edges','unused_vertices','repeated_index_faces','zero_area_faces','inconsistent_two_face_edge_directions'):
            if result[key]!=0: errors.append(f'{key}={result[key]}')
        if result['face_bearing_vertex_connected_components']!=1: errors.append('not one face-bearing component')
        if result['signed_volume']<=0: errors.append('nonpositive signed volume')
        if not geometry['triangles_min']<=result['triangles']<=geometry['triangles_max']: errors.append('triangle range failed')
        settings=params['preservation_and_exposure']['review_material']
        material(raw,settings,'Matched neutral R5'); material(work,settings,'Matched neutral R6')
        raw.hide_set(True)
        if errors:
            bpy.ops.wm.save_as_mainfile(filepath=str(output/'held-candidate.blend'))
            raise RuntimeError('Post-reconstruction gate: '+', '.join(errors))
        # viewport hiding is separate from the two objects' per-render visibility.
        raw.hide_set(False)
        frames,renders=render_comparison(output,raw,work,inspector,studio,settings)
        write(output/'render-framing.json',frames)
        raw.hide_set(True)
        bpy.ops.wm.save_as_mainfile(filepath=str(output/'comparison.blend'))
        assert digest(source)==RAW_SHA
        raw_xyz,raw_tris=mesh_arrays(raw.data)
        assert np.array_equal(raw_xyz,xyz) and np.array_equal(raw_tris,faces)
        receipt.update({'status':'technical gates pass; independent visual gate pending','renders':renders,
                        'raw_positions_and_indices_preserved':True,'result':result,
                        'blend_sha256':digest(output/'comparison.blend'),
                        'blend_bytes':(output/'comparison.blend').stat().st_size})
    except Exception as error:
        receipt.update({'status':'HOLD','error':str(error)})
        raise
    finally:
        stop.set(); receipt.update({'elapsed_seconds':time.monotonic()-start,
                                   'min_sampled_free_gib':min(samples) if samples else free_gib()})
        write(output/'run-receipt.json',receipt)
        print(json.dumps(receipt),flush=True)


if __name__=='__main__': main()
