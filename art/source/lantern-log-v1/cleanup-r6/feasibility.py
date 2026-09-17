"""CPU-only feasibility receipt for the main-only Lantern R6 reconstruction."""
from __future__ import annotations
import hashlib, json, math
from pathlib import Path
HERE=Path(__file__).resolve().parent
R5=HERE.parent/'geometry-ply-r5'; PLY=R5/'raw-geometry.ply'; AUDIT=R5/'topology-audit.json'; OUT=HERE/'feasibility.json'
EXPECTED_SHA256='e25bdd049cf9a7d8d4e1a7df9e4193e9840b0b550c6052b134d3d88cd6276120'; MAIN_ROOT=1579; VOXEL_SIZE=.006

def sha256(path):
 d=hashlib.sha256()
 with path.open('rb') as h:
  for b in iter(lambda:h.read(1024*1024),b''): d.update(b)
 return d.hexdigest()

def main():
 audit=json.loads(AUDIT.read_text(encoding='utf-8'))
 diagnostic=json.loads((HERE/'raw-coordinate-diagnostic.json').read_text(encoding='utf-8'))
 if sha256(PLY)!=EXPECTED_SHA256 or audit['source']['sha256']!=EXPECTED_SHA256 or diagnostic['source_sha256']!=EXPECTED_SHA256: raise RuntimeError('frozen R5 source mismatch')
 if diagnostic['duplicate_exact_position_vertices'] or diagnostic['duplicate_raw_index_triangle_records_ignoring_winding']: raise RuntimeError('main-only R6 plan assumes the verified no-dedup diagnostic')
 items=audit['findings']['components']['largest_by_area']; main_part=next(x for x in items if x['root_vertex']==MAIN_ROOT)
 bounds=main_part['bounds']; span=[bounds['max'][i]-bounds['min'][i] for i in range(3)]; dims=[math.ceil(s/VOXEL_SIZE)+2 for s in span]
 result={'schema':'lantern-cleanup-r6-feasibility-v2','execution':'CPU-only; no Blender/GPU/model output','source':{'path':str(PLY.relative_to(HERE.parent.parent.parent.parent)),'sha256':EXPECTED_SHA256,'vertices':audit['source']['vertex_count'],'faces':audit['source']['face_count']},'deduplication_diagnosis':{'exact_coordinate_diagnostic_sha256':sha256(HERE/'raw-coordinate-diagnostic.json'),'duplicate_exact_position_vertices':0,'duplicate_raw_index_triangles_ignoring_winding':0,'conclusion':'weld/dedup cannot repair the selected raw field'},'selected_work_component':{'root_vertex':MAIN_ROOT,'faces':main_part['faces'],'vertices':main_part['vertices'],'bounds_raw_xyz':bounds,'span_raw_xyz':span},'excluded_from_work_preserved_in_raw_master':[{'root_vertex':x['root_vertex'],'faces':x['faces'],'bounds':x['bounds']} for x in items if x['root_vertex']!=MAIN_ROOT],'single_voxel_reconstruction':{'voxel_size_raw_units':VOXEL_SIZE,'grid_dimensions_with_two_cell_margin':dims,'bounded_aabb_cell_count':math.prod(dims),'triangle_gate':{'minimum':35000,'maximum':600000}},'global_r5_topology_not_component_attribution':{'global_boundary_edges':audit['findings']['boundary_edges'],'global_nonmanifold_edges':audit['findings']['nonmanifold_edges'],'required_before_apply':'Builder records selected-main edge incidence separately; global audit does not allocate defects to this component.'},'limits':{'one_reconstruction_only':True,'no_resolution_fallback':True,'no_crop_probe':True,'no_master_mutation':True,'no_fullprofile_rerun':True,'no_runtime_export_or_admission':True}}
 OUT.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
