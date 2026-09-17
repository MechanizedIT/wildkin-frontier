"""CPU-only labeled depth proof for frozen Skydancer R3 plan."""
import json, math, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
plan_path=ROOT/'docs/species/skydancer/construction-plan-r3-exterior-shingles.json'
proof_path=ROOT/'art/reviews/skydancer/rotation-1/construction-plan-r3-exterior-shingles-proof.json'
source_path=ROOT/'art/reviews/skydancer/rotation-1/r2-native-mesh.json'
plan=json.loads(plan_path.read_text())
# The only visibility contract: each view judges three plates on its camera-facing wing.
plan['visibility_contract']={'thresholds':{'96':2,'512':20},'views':{'side':'right','threequarter':'right','side_mirror':'left','threequarter_mirror':'left'},'rule':'Each named view requires all three plates on its specified camera-facing wing to meet the per-resolution floor. Far-side plates are recorded but not part of that view pass.'}
plan_path.write_text(json.dumps(plan,indent=2)+'\n')
plan_hash=hashlib.sha256(plan_path.read_bytes()).hexdigest()
native=json.loads(source_path.read_text()); parts=native['parts']; assert len(parts)==27, len(parts)
replacements={p['name']:p for p in plan['right_plates']+plan['left_plates']}
def world(v,m): return [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]
items=[]
for serial,x in enumerate(parts):
 name=x['name']; r=replacements.get(name); V=r['vertices'] if r else [world(x['attributes']['position']['array'][i:i+3],x['matrixWorld']) for i in range(0,len(x['attributes']['position']['array']),3)]; T=r['triangles'] if r else [x['index'][i:i+3] for i in range(0,len(x['index']),3)]; items.append((f'{serial}:{name}',V,T))
assert len(items)==27
def basis(pos,look):
 f=[look[i]-pos[i]for i in range(3)];m=math.sqrt(sum(q*q for q in f));f=[q/m for q in f]
 r=[-f[2],0,f[0]];m=math.hypot(r[0],r[2]);r=[q/m for q in r]
 u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];return f,r,u
def project(v,pos,look,n):
 f,r,u=basis(pos,look);d=[v[i]-pos[i]for i in range(3)];z=sum(d[i]*f[i]for i in range(3));k=1/math.tan(math.radians(38)/2)
 return ((sum(d[i]*r[i]for i in range(3))/z*k*.5+.5)*n,(.5-sum(d[i]*u[i]for i in range(3))/z*k*.5)*n,z)
def raster(pos,look,n):
 depth=[1e99]*(n*n);labels=['']*(n*n)
 for name,V,T in items:
  q=[project(v,pos,look,n)for v in V]
  for ia,ib,ic in T:
   A,B,C=q[ia],q[ib],q[ic];den=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1])
   if abs(den)<1e-12:continue
   for y in range(max(0,int(min(A[1],B[1],C[1]))),min(n-1,int(max(A[1],B[1],C[1]))+1)+1):
    for x in range(max(0,int(min(A[0],B[0],C[0]))),min(n-1,int(max(A[0],B[0],C[0]))+1)+1):
     w=((B[1]-C[1])*(x+.5-C[0])+(C[0]-B[0])*(y+.5-C[1]))/den;v=((C[1]-A[1])*(x+.5-C[0])+(A[0]-C[0])*(y+.5-C[1]))/den;u=1-w-v
     if w>=0 and v>=0 and u>=0:
      z=1/(w/A[2]+v/B[2]+u/C[2]);i=y*n+x
      if z<depth[i]:depth[i]=z;labels[i]=name
 return {name:labels.count(name) for name,_,_ in items}
cam=plan['fixed_camera_projection']['cameras'];views={'side':cam['side'],'threequarter':cam['threequarter'],'side_mirror':([-cam['side'][0][0],cam['side'][0][1],cam['side'][0][2]],[-cam['side'][1][0],cam['side'][1][1],cam['side'][1][2]]),'threequarter_mirror':([-cam['threequarter'][0][0],cam['threequarter'][0][1],cam['threequarter'][0][2]],[-cam['threequarter'][1][0],cam['threequarter'][1][1],cam['threequarter'][1][2]])}
counts={name:{str(n):raster(*v,n)for n in (96,512)}for name,v in views.items()}
contract=plan['visibility_contract'];checks=[]
for view,side in contract['views'].items():
 for n,floor in contract['thresholds'].items():
  for plate in ['upper_cover_plate','mid_cover_plate','lower_cover_plate']:
   c=sum(v for k,v in counts[view][n].items() if k.endswith(f':{side}_{plate}'));checks.append({'view':view,'resolution':int(n),'plate':f'{side}_{plate}','visible_pixels':c,'floor':floor,'pass':c>=floor})
old=json.loads(proof_path.read_text()) if proof_path.exists() else {}
old.update({'plan_sha256':plan_hash,'executed_cpu_depth_raster':{'script':'art/reviews/skydancer/rotation-1/r3-depth-raster-proof.py','complete_model_part_count':len(items),'complete_model_part_names':[name for name,_,_ in items],'source_sha256':hashlib.sha256(source_path.read_bytes()).hexdigest(),'fov_degrees':38,'counts':counts,'visibility_contract':contract,'checks':checks},'occlusion_pass':all(x['pass'] for x in checks)})
proof_path.write_text(json.dumps(old,indent=2)+'\n')
print(json.dumps({'plan_sha256':plan_hash,'complete_model_parts':len(items),'pass':old['occlusion_pass'],'checks':checks},indent=2))
