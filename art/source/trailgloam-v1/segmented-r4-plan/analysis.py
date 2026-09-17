"""Exact primitive-envelope and contact proof for proposed Trailgloam R4; CPU only."""
import json,hashlib,math
from pathlib import Path
P=Path(__file__).with_name('parameters.json');O=Path(__file__).with_name('analysis.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def add_box(out,c,d,name):
 for sx in(-1,1):
  for sy in(-1,1):
   for sz in(-1,1):out.append(([c[0]+sx*d[0]/2,c[1]+sy*d[1]/2,c[2]+sz*d[2]/2],name))
def add_capsule(out,a,b,r,name):
 # Exact AABB extrema of a swept spherical section; six extrema at both endpoints.
 for q in(a,b):
  for axis in range(3):
   for s in(-1,1):
    x=q.copy();x[axis]+=s*r;out.append((x,name))
def B(rows):
 return {'min':[min(x[0][i] for x in rows) for i in range(3)],'max':[max(x[0][i] for x in rows) for i in range(3)]}
def norm(a):return math.sqrt(sum(x*x for x in a))
def sub(a,b):return[a[i]-b[i]for i in range(3)]
def main():
 d=json.loads(P.read_text(encoding='utf8'));rows=[]; contacts=[]; closed=[]
 for name,x in d['parts'].items():add_box(rows,x['center'],x['full_dimensions'],name);closed.append(name)
 shell=d['parts']['shell']; shrad=[q/2 for q in shell['full_dimensions']]
 head=d['parts']['head']; hrad=[q/2 for q in head['full_dimensions']]
 # Along head-to-shell centre line, ellipsoid supports add. Positive result means genuine penetration.
 u=sub(shell['center'],head['center']); L=norm(u);u=[x/L for x in u]
 support=lambda radii:math.sqrt(sum((u[i]*radii[i])**2 for i in range(3)))
 head_pen=support(shrad)+support(hrad)-L
 for leg in d['legs']:
  q=leg['points'];r=leg['radii']; hoof=leg['hoof_full_dimensions'];
  for i in range(3):add_capsule(rows,q[i],q[i+1],r[i],f'{leg["id"]}_link_{i}')
  add_box(rows,q[-1],hoof,f'{leg["id"]}_hoof');closed += [f'{leg["id"]}_link_{i}' for i in range(3)]+[f'{leg["id"]}_hoof']
  # coxa penetrates shell by radial shell support minus socket centre distance minus coxa radius.
  dv=sub(q[0],shell['center']);dist=norm(dv);uu=[x/dist for x in dv]; shell_support=math.sqrt(sum((uu[i]*shrad[i])**2 for i in range(3))); shell_coxa=shell_support+r[0]-dist
  cuff=[]
  for i,pt in enumerate(q[:-1]):
   cr=(r[min(i,2)]+d['joint_overlap']['collar_extra_radius_m']); add_capsule(rows,pt,pt,cr,f'{leg["id"]}_cuff_{i}');closed.append(f'{leg["id"]}_cuff_{i}');cuff.append({'joint':i,'cuff_radius_m':cr,'penetration_into_adjacent_link_m':d['joint_overlap']['collar_extra_radius_m']})
  contacts.append({'id':leg['id'],'hoof_actual_min_z_m':q[-1][2]-hoof[2]/2,'shell_to_coxa_penetration_m':shell_coxa,'cuffs':cuff,'closed_parts':4})
 for f in d['fronds']:
  collar=d['frond_overlap']['collar_full_diameter_m'];ch=d['frond_overlap']['collar_height_m'];c=f['socket'];add_box(rows,c,[collar,collar,ch],f'collar_{f["id"]}');closed.append(f'collar_{f["id"]}')
  for c,(w,dep) in zip(f['centers'],f['full_width_depth']):add_box(rows,c,[w,dep,dep],f'frond_{f["id"]}')
  closed.append(f'frond_{f["id"]}')
 b=B(rows);extent=[b['max'][i]-b['min'][i]for i in range(3)]
 # True 3Q basis, camera from (+X,-Y,+Z) looking at asset; projected X is normalized cross product, Y is camera up.
 f=[-1/math.sqrt(3),1/math.sqrt(3),-1/math.sqrt(3)];right=[f[1],-f[0],0];rl=norm(right);right=[x/rl for x in right];up=[f[1]*right[2]-f[2]*right[1],f[2]*right[0]-f[0]*right[2],f[0]*right[1]-f[1]*right[0]]
 proj=lambda p:[sum(p[i]*right[i]for i in range(3)),sum(p[i]*up[i]for i in range(3)),sum(p[i]*f[i]for i in range(3))]
 leg3=[]
 for leg in d['legs']:
  z=[proj(x)for x in leg['points']];leg3.append({'id':leg['id'],'screen_bounds':{'min':[min(x[i]for x in z)for i in(0,1)],'max':[max(x[i]for x in z)for i in(0,1)]},'depth_range':[min(x[2]for x in z),max(x[2]for x in z)]})
 result={'schema':'trailgloam-segmented-r4-cpu-proof-v2','parameters_sha256':sha(P),'primitive_vertex_count':len(rows),'complete_bounds_m':{**b,'extent':extent},'closed_part_count':len(closed),'closed_parts':closed,'head_shell_ellipsoid_penetration_m':head_pen,'legs':contacts,'fronds':{'construction':d['frond_overlap']['construction'],'count':2,'separate_closed_collars_and_blades':True},'three_quarter_projection_proxy':{'camera_forward':f,'screen_right':right,'screen_up':up,'leg_anchor_bounds':leg3,'limit':'anchor projection/depth only; expected occlusion is not resolved and no surface rasterization was performed.'},'limits':['No Blender/GPU/model build. Blender must verify actual closures, covered cuffs, frond contact, and all-angle visibility.']}
 assert len(contacts)==6 and all(x['hoof_actual_min_z_m']==0 for x in contacts) and head_pen>0 and all(x['shell_to_coxa_penetration_m']>0 for x in contacts)
 O.write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps({'extent':extent,'head_pen':head_pen,'output':str(O)}))
if __name__=='__main__':main()




