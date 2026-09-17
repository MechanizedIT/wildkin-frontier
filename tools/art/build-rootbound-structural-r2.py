"""Execute a separately reviewed, hash-frozen Rootbound vertex deformation.

Keeps the raw PLY untouched. Creates one high-detail editable derivative plus
matching raw/derivative inspection renders; no runtime export or reduction.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import threading
import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / 'art/source/rootbound-buttress-trellis/geometry-ply-v1/structural-r2-plan'
OUTPUT = ROOT / 'art/source/rootbound-buttress-trellis/geometry-ply-v1/structural-r2'
RAW = ROOT / 'art/source/rootbound-buttress-trellis/geometry-ply-v1/raw-geometry.ply'
RAW_SHA = '3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--parameters-sha', required=True)
    parser.add_argument('--analysis-sha', required=True)
    parser.add_argument('--receipt-sha', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if bpy.app.version[:2] != (4, 5): raise RuntimeError('Blender 4.5 required')
    if sha(RAW) != RAW_SHA: raise RuntimeError('Raw source changed')
    if sha(PLAN/'parameters.json') != args.parameters_sha: raise RuntimeError('Parameters changed after review')
    if sha(PLAN/'analysis.py') != args.analysis_sha: raise RuntimeError('Executable deformation changed after review')
    if sha(PLAN/'analysis.json') != args.receipt_sha: raise RuntimeError('CPU receipt changed after review')
    if OUTPUT.exists() and any(OUTPUT.iterdir()): raise RuntimeError('Fresh output directory required')
    studio = module('rootbound_studio', ROOT/'tools/art/clean-rootbound-buttress.py')
    studio.require_free(8, 'R2 import')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    stop = threading.Event(); studio.start_watchdog(stop)
    record = {'status':'RUNNING', 'raw_sha256':RAW_SHA,
              'parameters_sha256':args.parameters_sha, 'analysis_sha256':args.analysis_sha,
              'cpu_receipt_sha256':args.receipt_sha}
    try:
        for name in ('parameters.json','analysis.py','analysis.json','construction-plan.md'):
            shutil.copy2(PLAN/name, OUTPUT/name)
        # Import the frozen byte copy, not a file another lane might later revise.
        recipe = module('rootbound_r2_frozen', OUTPUT/'analysis.py')
        params = json.loads((OUTPUT/'parameters.json').read_text(encoding='utf8'))
        proof = json.loads((OUTPUT/'analysis.json').read_text(encoding='utf8'))
        expected = proof['r2_proposed_deformation']
        if expected['parameters_sha256'] != args.parameters_sha: raise RuntimeError('CPU receipt/parameter mismatch')
        audit = expected['triangle_normal_audit']
        if audit['proposed_degenerate_triangle_count_area_lte_1e-12'] != 0 or audit['raw_to_proposed_nonpositive_normal_dot_count'] != 0:
            raise RuntimeError('Frozen CPU surface audit failed')
        studio.reset_scene()
        bpy.ops.wm.ply_import(filepath=str(RAW), forward_axis='Y', up_axis='Z', global_scale=1,
                              merge_verts=False, import_attributes=False)
        objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if len(objects) != 1: raise RuntimeError('Expected one raw mesh')
        raw = objects[0]; raw.name = 'RAW_REFERENCE'
        if len(raw.data.vertices) != 514489 or len(raw.data.polygons) != 1029792:
            raise RuntimeError('Raw counts changed')
        positions = np.empty(len(raw.data.vertices)*3, dtype=np.float32)
        raw.data.vertices.foreach_get('co', positions)
        grounded = positions.reshape(-1,3).astype(np.float64) * params['source']['uniform_scale']
        grounded[:,2] += params['source']['ground_translation_z_m']
        candidate, movement = recipe.apply_r2_positions(grounded, params)
        movement.pop('_web_masks', None)
        if not np.isfinite(candidate).all() or not np.array_equal(candidate[:,2], grounded[:,2]):
            raise RuntimeError('Finite/Z invariant failed')
        if not np.allclose(recipe.bounds(candidate)['min'], expected['proposed_grounded_bounds_m']['min'], atol=1e-6):
            raise RuntimeError('CPU lower envelope differs')
        if not np.allclose(recipe.bounds(candidate)['max'], expected['proposed_grounded_bounds_m']['max'], atol=1e-6):
            raise RuntimeError('CPU upper envelope differs')
        if abs(movement['max_total_xy_displacement_m'] - expected['details']['max_total_xy_displacement_m']) > 1e-6:
            raise RuntimeError('CPU displacement receipt differs')
        indices = np.empty(len(raw.data.loops), dtype=np.uint32)
        raw.data.loops.foreach_get('vertex_index', indices)
        original_indices_sha = hashlib.sha256(indices.tobytes()).hexdigest()
        # Audit the float32 coordinates actually stored in Blender, in bounded chunks.
        actual_raw = grounded.astype(np.float32).astype(np.float64)
        actual_candidate = candidate.astype(np.float32).astype(np.float64)
        degenerates = flips = 0
        for start in range(0, len(indices), 300000):
            tri = indices[start:start+300000].reshape(-1,3)
            a = actual_raw[tri]; b = actual_candidate[tri]
            ar = np.cross(a[:,1]-a[:,0], a[:,2]-a[:,0])
            br = np.cross(b[:,1]-b[:,0], b[:,2]-b[:,0])
            degenerates += int((np.linalg.norm(br,axis=1)<=1e-12).sum())
            flips += int(((ar*br).sum(axis=1)<=0).sum())
        if degenerates or flips: raise RuntimeError(f'Actual float32 surface audit failed: {degenerates} degenerates, {flips} flipped triangles')
        record['actual_float32_surface_audit'] = {'degenerate_triangles':degenerates,'nonpositive_normal_dot_triangles':flips,'global_self_intersections_tested':False}
        raw.data.vertices.foreach_set('co', grounded.astype(np.float32).reshape(-1))
        raw.data.update()
        derived = raw.copy(); derived.data = raw.data.copy(); derived.name='ROOTBOUND_STRUCTURAL_R2'
        bpy.context.collection.objects.link(derived)
        derived.data.vertices.foreach_set('co', candidate.astype(np.float32).reshape(-1))
        derived.data.update()
        final_indices=np.empty(len(derived.data.loops), dtype=np.uint32)
        derived.data.loops.foreach_get('vertex_index', final_indices)
        if not np.array_equal(indices, final_indices): raise RuntimeError('Triangle index change')
        for obj in (raw, derived):
            obj.data.polygons.foreach_set('use_smooth', np.zeros(len(obj.data.polygons), dtype=np.bool_))
            obj.data.materials.clear(); obj.data.materials.append(studio.matte_material())
        bpy.context.view_layer.update()
        bounds=studio.transformed_bounds(raw)
        center=[(bounds['min'][i]+bounds['max'][i])/2 for i in range(3)]
        scene,camera=studio.setup_scene(center,bounds['extent'])
        renders={'raw':studio.render_set(scene,camera,center,bounds['extent'],raw,derived,OUTPUT/'renders/raw'),
                 'derivative':studio.render_set(scene,camera,center,bounds['extent'],derived,raw,OUTPUT/'renders/derivative')}
        record.update({'status':'executed; independent visual review pending', 'vertices':len(derived.data.vertices),
                       'triangles':len(derived.data.polygons),'movement':movement,
                       'grounded_bounds_m':studio.transformed_bounds(derived),'renders':renders,
                       'triangle_indices_sha256':original_indices_sha,'indices_unchanged':True,
                       'no_z_displacement':True,'no_reduction':True,
                       'material':'inspection clay only; no generated texture or runtime material',
                       'not_proven':['four-root consolidation','manifoldness','self-intersection freedom','runtime fit']})
        raw_mesh=raw.data; bpy.data.objects.remove(raw, do_unlink=True)
        if raw_mesh.users==0: bpy.data.meshes.remove(raw_mesh)
        derived.hide_render=False; derived.hide_viewport=False
        bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'structural-r2.blend'), compress=True)
        record['blend_sha256']=sha(OUTPUT/'structural-r2.blend')
        record['blend_bytes']=(OUTPUT/'structural-r2.blend').stat().st_size
        if sha(RAW)!=RAW_SHA: raise RuntimeError('Immutable master changed')
        shutil.copy2(Path(__file__),OUTPUT/'executed-builder.py')
    except Exception as error:
        record.update({'status':'HOLD','error':str(error)})
        raise
    finally:
        (OUTPUT/'receipt.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
        stop.set()
    print(json.dumps({key:value for key,value in record.items() if key!='renders'}),flush=True)


if __name__ == '__main__': main()
