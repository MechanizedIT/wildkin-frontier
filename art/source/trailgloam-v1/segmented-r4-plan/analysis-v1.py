"""CPU-only receipt for Trailgloam segmented R4 planning; no Blender or GPU."""
import hashlib,json,math
from pathlib import Path
P=Path(__file__).with_name('parameters.json'); O=Path(__file__).with_name('analysis.json')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def v(a,b): return [a[i]-b[i] for i in range(3)]
def n(a): return math.sqrt(sum(x*x for x in a))
def bounds(points): return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
def main():
 d=json.loads(P.read_text(encoding='utf8')); pts=[]; contacts=[]
 for x in d['parts'].values():
  c=x['center']; q=x['full_dimensions']; pts += [[c[i]+s*q[i]/2 for i,s in enumerate(sign)] for sign in ((-1,-1,-1),(-1,-1,-1),(1,1,1))]
 for leg in d['legs']:
  a,b,k,h=leg['points']; r=max(leg['radii']); hoof=leg['hoof_full_dimensions']; pts += [[h[i]+s*hoof[i]/2 for i,s in enumerate(sign)] for sign in ((-1,-1,-1),(1,1,1))]
  contacts.append({'id':leg['id'],'sole_z_m':0.0,'hoof_center_z_m':h[2],'chain_lengths_m':[n(v(b,a)),n(v(k,b)),n(v(h,k))],'covered_overlap_m':d['joint_overlap']})
 for f in d['fronds']:
  for c,(w,dep) in zip(f['centers'],f['full_width_depth']): pts += [[c[0]+sx*w/2,c[1]+sy*dep/2,c[2]] for sx in (-1,1) for sy in (-1,1)]
 B=bounds(pts); extent=[B['max'][i]-B['min'][i] for i in range(3)]
 # Orthographic proxies: screen X/Y for front/rear, Y/Z for sides, X/Y top, diagonal X-Y/Z three-quarter.
 views={}
 for name,axes in {'front':(0,2),'rear':(0,2),'left':(1,2),'right':(1,2),'top':(0,1),'underside':(0,1),'three_quarter':(0,2)}.items():
  rows=[]
  for leg in d['legs']:
   q=leg['points']; root=q[0]; hoof=q[-1]; dx=q[1][axes[0]]-root[axes[0]]; dy=q[1][axes[1]]-root[axes[1]]
   rows.append({'id':leg['id'],'root_screen':[root[i] for i in axes],'hoof_screen':[hoof[i] for i in axes],'first_segment_screen_length_m':math.hypot(dx,dy),'nonzero_projected_anchor_path_proxy':math.hypot(hoof[axes[0]]-root[axes[0]],hoof[axes[1]]-root[axes[1]])>.18})
  views[name]={'axes':axes,'nonzero_projected_anchor_paths':sum(x['nonzero_projected_anchor_path_proxy'] for x in rows),'chains':rows}
 result={'schema':'trailgloam-segmented-r4-cpu-proof-v1','parameters_sha256':sha(P),'envelope_m':{**B,'extent':extent},'six_closed_chains':contacts,'covered_joint_contract':d['joint_overlap'],'frond_contract':d['frond_overlap'],'view_projection_proxy':views,'limits':['Anchor/centerline projection only; no mesh rasterization or occlusion proof.','Actual Blender all-angle renders and overlap inspection remain required.']}
 assert len(contacts)==6 and all(x['sole_z_m']==0 for x in contacts) and B['min'][2]==0
 O.write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps({'envelope':extent,'chains':len(contacts),'output':str(O)}))
if __name__=='__main__':main()
