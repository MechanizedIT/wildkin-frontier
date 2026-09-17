"""CPU construction proof for the full Trailgloam R6 builder input.

Reuses R5's reviewed closed ring-loft/prism/wedge/folded-blade routines and
builds every planned solid literally. It is intentionally importable by the
separate Blender builder; no Blender/GPU calls occur here.
"""
from __future__ import annotations
import hashlib, importlib.util, json, math
from pathlib import Path
HERE=Path(__file__).resolve().parent; P=HERE/'parameters.json'; OUT=HERE/'cpu-feasibility.json'
R5=HERE.parent/'method-probe-r5'/'build_probe.py'
spec=importlib.util.spec_from_file_location('r5',R5); r5=importlib.util.module_from_spec(spec); spec.loader.exec_module(r5)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def norm(a): return math.sqrt(sum(x*x for x in a))
def bounds(parts):
 v=[q for p in parts for q in p['vertices']]; lo=[min(q[i] for q in v) for i in range(3)]; hi=[max(q[i] for q in v) for i in range(3)]; return {'min':lo,'max':hi,'extent':sub(hi,lo)}
def projection_visibility(parts, direction, size=256):
 # Actual planned triangles receive a small orthographic z-buffer, labelled by part.
 f=r5.unit(direction); right=r5.unit(r5.cross(f,[0,0,1] if abs(f[2])<.9 else [0,1,0])); up=r5.unit(r5.cross(right,f)); allv=[v for p in parts for v in p['vertices']]; xs=[r5.dot(v,right) for v in allv]; ys=[r5.dot(v,up) for v in allv]; margin=.06; xmin,xmax=min(xs)-margin,max(xs)+margin;ymin,ymax=min(ys)-margin,max(ys)+margin
 z=[-1e99]*(size*size); owner=[-1]*(size*size)
 for pi,p in enumerate(parts):
  for face in p['faces']:
   q=[p['vertices'][i] for i in face]; uv=[((r5.dot(x,right)-xmin)/(xmax-xmin)*(size-1),(r5.dot(x,up)-ymin)/(ymax-ymin)*(size-1),r5.dot(x,f)) for x in q]; ax,ay,_=uv[0];bx,by,_=uv[1];cx,cy,_=uv[2]; den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
   if abs(den)<1e-9: continue
   for yy in range(max(0,int(min(ay,by,cy))),min(size-1,int(max(ay,by,cy)))+1):
    for xx in range(max(0,int(min(ax,bx,cx))),min(size-1,int(max(ax,bx,cx)))+1):
     a=((by-cy)*(xx-cx)+(cx-bx)*(yy-cy))/den;b=((cy-ay)*(xx-cx)+(ax-cx)*(yy-cy))/den;c=1-a-b
     if a>=0 and b>=0 and c>=0:
      depth=a*uv[0][2]+b*uv[1][2]+c*uv[2][2]; idx=yy*size+xx
      if depth>z[idx]:z[idx]=depth;owner[idx]=pi
 return {p['name']:owner.count(i) for i,p in enumerate(parts)}
def build_parts(d):
 shell=r5.ring_loft(d['parts']['shell']['rings_z_rx_ry'],d['parts']['shell']['sides'],'saucer'); head=r5.prism(d['parts']['head']['start'],d['parts']['head']['end'],d['parts']['head']['radius_start'],d['parts']['head']['radius_end'],d['parts']['head']['sides'],'head'); eyes=[r5.prism([x,-.72,.53],[x,-.82,.52],.055,.040,6,f'eye_{side}') for x,side in ((-.13,'L'),(.13,'R'))]; parts=[shell,head]+eyes; contacts=[]
 for leg in d['legs']:
  pts=leg['points']; radii=leg['radii']; links=[]
  for i in range(3): links.append(r5.prism(pts[i],pts[i+1],radii[i],radii[i]*.88,6,f'{leg["id"]}_link{i}'))
  hoof=r5.wedge({'x_min':pts[-1][0]-leg['hoof_full_dimensions'][0]/2,'x_max':pts[-1][0]+leg['hoof_full_dimensions'][0]/2,'y_min':pts[-1][1]-leg['hoof_full_dimensions'][1]/2,'y_max':pts[-1][1]+leg['hoof_full_dimensions'][1]/2,'sole_z':0,'rear_top_z':leg['hoof_full_dimensions'][2]*.72,'front_top_z':leg['hoof_full_dimensions'][2]},f'{leg["id"]}_hoof'); parts+=links+[hoof]; tang=[r5.unit(sub(pts[i+1],pts[i])) for i in range(3)]; cuffs=[]
  for i,at in enumerate(pts[1:]):
   # The terminal cuff is lifted into the hoof volume; its full cap ring,
   # rather than its center, is checked below.
   if i==2: at=r5.add(at,[0,0,d.get('terminal_cuff_lift_z',0)])
   axis=r5.unit(r5.add(tang[i],tang[i+1])) if i<2 else tang[2]; half=d['joint_overlap']['cuff_length']/2; cuffs.append(r5.prism(r5.sub(at,r5.mul(axis,half)),r5.add(at,r5.mul(axis,half)),d['joint_overlap']['cuff_radius'],d['joint_overlap']['cuff_radius'],6,f'{leg["id"]}_cuff{i}'))
  parts+=cuffs; contacts.append({'leg':leg['id'],'coxa_root_ring_inside_saucer':r5.contains(shell,links[0]['rings']['start']),'hoof_min_z':min(v[2] for v in hoof['vertices']),'cuff0_contains_adjoining_rings':r5.contains(cuffs[0],links[0]['rings']['end']+links[1]['rings']['start']),'cuff1_contains_adjoining_rings':r5.contains(cuffs[1],links[1]['rings']['end']+links[2]['rings']['start']),'cuff2_contains_lower_ring':r5.contains(cuffs[2],links[2]['rings']['end']),'hoof_contains_lower_cuff_ring':r5.contains(hoof,cuffs[2]['rings']['end'])})
 frond_contacts=[]
 for fr in d['fronds']:
  collar=r5.prism(fr['collar_base'],fr['collar_tip'],fr['collar_radius'],fr['collar_radius'],6,f'collar_{fr["id"]}'); blade=r5.diamond_loft(fr['centers'],fr['widths'],fr['thicknesses'],f'frond_{fr["id"]}');parts += [collar,blade];frond_contacts.append({'id':fr['id'],'blade_root_inside_closed_collar':r5.contains(collar,blade['root_ring']),'collar_root_inside_saucer':r5.contains(shell,collar['rings']['start'])})
 return parts,contacts,frond_contacts,shell,head,eyes
def main():
 d=json.loads(P.read_text()); parts,contacts,frond_contacts,shell,head,eyes=build_parts(d)
 audits={p['name']:r5.audit(p) for p in parts}; vis={name:projection_visibility(parts,vec) for name,vec in d['visual_gates']['views'].items()}; blades={x['id']:f'frond_{x["id"]}' for x in d['fronds']}; exposure={view:{bid:counts[name] for bid,name in blades.items()} for view,counts in vis.items()}; gate=d['visual_gates']['frond_min_exposed_pixels_256']; proof={'schema':'trailgloam-full-r6-cpu-feasibility-v1','parameters_sha256':sha(P),'reference':d['reference'],'axis':d['axis'],'parts':audits,'complete_bounds_m':bounds(parts),'head_root_inside_saucer':r5.contains(shell,head['rings']['start']),'eye_bases_inside_head':[r5.contains(head,eye['rings']['start']) for eye in eyes],'legs':contacts,'fronds':frond_contacts,'surface_zbuffer_exposure_256':exposure,'all_closed_outward':all(a['boundary_edges']==0 and a['nonmanifold_edges']==0 and a['degenerate_faces']==0 and a['finite'] and a['outward_centroid_dot_min']>0 for a in audits.values()),'all_contacts':all(c['hoof_min_z']==0 and all(v['contained'] for k,v in c.items() if isinstance(v,dict)) for c in contacts) and all(v['contained'] for c in frond_contacts for k,v in c.items() if isinstance(v,dict)) and r5.contains(shell,head['rings']['start'])['contained'] and all(r5.contains(head,eye['rings']['start'])['contained'] for eye in eyes),'limits':d['limits']}; prior=json.loads((HERE/'pre-refactor-v1'/'cpu-feasibility.json').read_text()); prior_leg_keys=['hoof_min_z','cuff0_contains_adjoining_rings','cuff1_contains_adjoining_rings','cuff2_contains_lower_ring','hoof_contains_lower_cuff_ring']; proof['pre_refactor_parity']={'literal_geometry_bounds_equal':proof['complete_bounds_m']==prior['complete_bounds_m'],'frond_exposure_equal':proof['surface_zbuffer_exposure_256']==prior['surface_zbuffer_exposure_256'],'prior_leg_contact_subset_equal':all(all(row[k]==prior['legs'][i][k] for k in prior_leg_keys) for i,row in enumerate(contacts))}; proof['frond_exposure_pass']=all(n>=gate for view in exposure.values() for n in view.values()); OUT.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'bounds':proof['complete_bounds_m'],'closed':proof['all_closed_outward'],'contacts':proof['all_contacts'],'exposure':exposure,'passes':proof['frond_exposure_pass']}))
if __name__=='__main__':main()

