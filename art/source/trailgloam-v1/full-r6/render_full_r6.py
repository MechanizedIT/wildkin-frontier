"""Blender parity renderer for the planned Trailgloam full R6 candidate.

This file is intentionally non-executing until plan/source review and root release.
It imports the plan's shared CPU construction routine; it contains no geometry recipe.
"""
import argparse, ctypes, hashlib, importlib.util, json, math, os, struct, sys, threading, time
from pathlib import Path
import bpy
from mathutils import Vector

MIN_FREE_GIB=8.0; RESERVE_GIB=6.0; SIZES=(512,96,48)
# Update only after the planner's root-contact correction and review.
PARAMETERS_SHA256='cc4e081fda9efca9792d3e336133e1413360c57b1ac8acfe263a64de35d3b3e0'
CPU_ROUTINE_SHA256='667d72d660a8c70b78b8e8f7c7ee6d92e7271563cb8b02c313b6a124421d9d28'
R5_ROUTINES_SHA256='18ffc6c31220607742affc03edfad86bd11e36018ca86b5ad4ce51bfd3ab4d01'
CPU_PROOF_SHA256='7aba9a40ee0356ea0a9e76e70bdc215cb90340543a6887476deb6dd61f9e13e5'
VIEWS=(('front',Vector((0,-1,.16))),('rear',Vector((0,1,.16))),('left',Vector((-1,0,.16))),('right',Vector((1,0,.16))),('top',Vector((0,0,1))),('underside',Vector((0,0,-1))),('three-quarter',Vector((.68,-.74,.38))))

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''): h.update(block)
 return h.hexdigest()
def free_gib():
 class S(ctypes.Structure): _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in ('total','available','page_total','page_available','virtual_total','virtual_available','extended')]
 s=S();s.length=ctypes.sizeof(s)
 if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s)): raise RuntimeError('RAM measurement unavailable')
 return s.available/2**30
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def dot(a,b): return sum(a[i]*b[i] for i in range(3))
def mag(a): return math.sqrt(dot(a,a))
def args():
 x=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 p=argparse.ArgumentParser();p.add_argument('--execute',action='store_true');p.add_argument('--plan-dir',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);return p.parse_args(x)
def import_routine(path):
 spec=importlib.util.spec_from_file_location('trailgloam_full_r6_cpu',path); module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def audit(part):
 v,f=part['vertices'],part['faces'];edges={};min_dot=float('inf')
 for tri in f:
  if len(tri)!=3 or min(tri)<0 or max(tri)>=len(v):raise RuntimeError(part['name']+' invalid triangle index')
  a,b,c=[v[i] for i in tri]; area=mag(cross(sub(b,a),sub(c,a)))
  if not all(math.isfinite(x) for p in (a,b,c) for x in p) or area<=1e-8:raise RuntimeError(part['name']+' nonfinite/degenerate triangle')
  for e in ((tri[0],tri[1]),(tri[1],tri[2]),(tri[2],tri[0])): e=tuple(sorted(e));edges[e]=edges.get(e,0)+1
 center=[sum(q[i] for q in v)/len(v) for i in range(3)]
 for ia,ib,ic in f:
  a,b,c=v[ia],v[ib],v[ic]; tri_center=[(a[i]+b[i]+c[i])/3 for i in range(3)];min_dot=min(min_dot,dot(cross(sub(b,a),sub(c,a)),sub(tri_center,center)))
 if any(n!=2 for n in edges.values()) or min_dot<=0:raise RuntimeError(part['name']+' closure/winding parity failed')
 lo=[min(q[i] for q in v) for i in range(3)];hi=[max(q[i] for q in v) for i in range(3)]
 return {'vertices':len(v),'triangles':len(f),'boundary_edges':sum(n==1 for n in edges.values()),'nonmanifold_edges':sum(n>2 for n in edges.values()),'outward_centroid_dot_min':min_dot,'bounds':{'min':lo,'max':hi,'extent':[hi[i]-lo[i] for i in range(3)]}}
def material(name):
 colors={'saucer':(.07,.32,.34,1),'head':(.07,.32,.34,1),'eye':(.9,.86,.70,1),'link':(.07,.32,.34,1),'hoof':(.055,.06,.065,1),'cuff':(.09,.10,.11,1),'collar':(.09,.10,.11,1),'frond':(.78,.35,.035,1)}
 key=next(k for k in colors if name==k or name.startswith(k+'_') or ('_'+k) in name)
 m=bpy.data.materials.new(name+'_display');m.diffuse_color=colors[key];return m
def make_object(part):
 mesh=bpy.data.meshes.new(part['name']+'_literal');mesh.from_pydata(part['vertices'],[],part['faces']);mesh.update(calc_edges=False)
 if len(mesh.vertices)!=len(part['vertices']) or len(mesh.polygons)!=len(part['faces']) or any(len(p.vertices)!=3 for p in mesh.polygons):raise RuntimeError(part['name']+' Blender triangle parity failed')
 for n,(literal,vertex) in enumerate(zip(part['vertices'],mesh.vertices)):
  for axis in range(3):
   expected=struct.pack('<f',struct.unpack('<f',struct.pack('<f',literal[axis]))[0]);actual=struct.pack('<f',vertex.co[axis])
   if actual!=expected:raise RuntimeError(f'{part["name"]} float32 XYZ mismatch at {n}/{axis}')
 loops=[i for face in part['faces'] for i in face]
 if loops != [loop.vertex_index for loop in mesh.loops]:raise RuntimeError(part['name']+' Blender index-loop mismatch')
 mesh.calc_loop_triangles()
 if len(mesh.loop_triangles)!=len(part['faces']):raise RuntimeError(part['name']+' Blender loop triangle count mismatch')
 centroid=sum((vertex.co for vertex in mesh.vertices),Vector())/len(mesh.vertices)
 for tri in mesh.loop_triangles:
  a,b,c=(mesh.vertices[index].co for index in tri.vertices);normal=(b-a).cross(c-a)
  if normal.length_squared<=1e-16 or normal.dot((a+b+c)/3-centroid)<=0:raise RuntimeError(part['name']+' Blender triangle winding mismatch')
 obj=bpy.data.objects.new(part['name'],mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material(part['name']));return obj
def main():
 a=args()
 if not a.execute:raise RuntimeError('Refusing full candidate render without explicit --execute')
 plan=a.plan_dir.resolve();out=a.output_dir.resolve()
 if not a.plan_dir.is_absolute() or not a.output_dir.is_absolute() or not plan.is_dir() or out.exists():raise RuntimeError('plan-dir must exist absolute and output-dir must be fresh absolute')
 if free_gib()<MIN_FREE_GIB:raise RuntimeError('requires 8GiB free before Blender objects')
 paths={n:plan/n for n in ('parameters.json','cpu-feasibility.py','cpu-feasibility.json')};r5=plan.parent/'method-probe-r5'/'build_probe.py'
 if not all(p.is_file() for p in paths.values()) or not r5.is_file():raise RuntimeError('missing reviewed CPU inputs')
 expected={'parameters.json':PARAMETERS_SHA256,'cpu-feasibility.py':CPU_ROUTINE_SHA256}
 if CPU_PROOF_SHA256:expected['cpu-feasibility.json']=CPU_PROOF_SHA256
 for name,digest in expected.items():
  if sha(paths[name])!=digest:raise RuntimeError(name+' SHA differs from pinned reviewed input')
 if sha(r5)!=R5_ROUTINES_SHA256:raise RuntimeError('R5 shared routine SHA differs from pinned input')
 routine=import_routine(paths['cpu-feasibility.py'])
 if not hasattr(routine,'build_parts'):raise RuntimeError('plan CPU routine must expose pure build_parts(parameters) before Blender execution')
 parameters=json.loads(paths['parameters.json'].read_text(encoding='utf8'));proof=json.loads(paths['cpu-feasibility.json'].read_text(encoding='utf8'))
 built=routine.build_parts(parameters)
 if not isinstance(built,tuple) or len(built)!=6:raise RuntimeError('build_parts must return parts, leg contacts, frond contacts, shell, head, eyes')
 parts,leg_contacts,frond_contacts,shell,head,eyes=built
 if not isinstance(parts,list):raise RuntimeError('build_parts must return literal part list')
 if proof.get('parameters_sha256')!=sha(paths['parameters.json']) or not proof.get('all_contacts',False):raise RuntimeError('pinned CPU proof lacks passing computed root/foot/frond contacts')
 exposure=proof.get('surface_zbuffer_exposure_256',{});minimum=parameters.get('visual_gates',{}).get('frond_min_exposed_pixels_256')
 if not proof.get('frond_exposure_pass') or not isinstance(minimum,int) or minimum<=0 or not exposure or any(count<minimum for view in exposure.values() for count in view.values()):raise RuntimeError('pinned CPU proof lacks required per-blade frond exposure')
 audits={part['name']:audit(part) for part in parts}
 if set(audits)!=set(proof.get('parts',{})):raise RuntimeError('literal part inventory differs from pinned CPU proof')
 for name,actual in audits.items():
  expected=proof['parts'][name]
  if actual['vertices']!=expected['vertices'] or actual['triangles']!=expected['triangles'] or actual['boundary_edges']!=expected['boundary_edges'] or actual['nonmanifold_edges']!=expected['nonmanifold_edges'] or abs(actual['outward_centroid_dot_min']-expected['outward_centroid_dot_min'])>1e-9 or any(abs(actual['bounds'][key][axis]-expected['bounds'][key][axis])>1e-9 for key in ('min','max','extent') for axis in range(3)):raise RuntimeError(name+' Blender-preflight topology/winding/bounds differs from CPU proof')
 def contained(record):return isinstance(record,dict) and record.get('contained') is True
 if not all(row.get('hoof_min_z')==0 and all(contained(value) for value in row.values() if isinstance(value,dict)) for row in leg_contacts):raise RuntimeError('shared CPU routine reports a failed grounded-foot/root/cuff contact')
 if not all(all(contained(value) for value in row.values() if isinstance(value,dict)) for row in frond_contacts):raise RuntimeError('shared CPU routine reports a failed collar/blade contact')
 if not routine.r5.contains(shell,head['rings']['start'])['contained'] or not all(routine.r5.contains(head,eye['rings']['start'])['contained'] for eye in eyes):raise RuntimeError('shared CPU routine reports a failed head/eye root contact')
 out.mkdir(parents=True);stop=threading.Event();samples=[]
 def watchdog():
  while not stop.is_set():
   available=free_gib();samples.append(available)
   if available<RESERVE_GIB:(out/'reserve-breach.json').write_text(json.dumps({'free_gib':available,'reserve_gib':RESERVE_GIB},indent=2)+'\n',encoding='utf8');os._exit(77)
   stop.wait(.5)
 threading.Thread(target=watchdog,daemon=True).start();started=time.monotonic()
 try:
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
  objects={part['name']:make_object(part) for part in parts}
  hooves=[obj for name,obj in objects.items() if name.endswith('_hoof')]
  if len(hooves)!=6 or any(abs(min(vertex.co.z for vertex in obj.data.vertices))>1e-7 for obj in hooves):raise RuntimeError('Blender grounded-foot sole parity failed')
  vertices=[v for p in parts for v in p['vertices']];lo=[min(v[i] for v in vertices) for i in range(3)];hi=[max(v[i] for v in vertices) for i in range(3)];target=Vector([(lo[i]+hi[i])/2 for i in range(3)]);radius=max(hi[i]-lo[i] for i in range(3))*2.8
  scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True
  data=bpy.data.cameras.new('TrailgloamCamera');cam=bpy.data.objects.new('TrailgloamCamera',data);bpy.context.collection.objects.link(cam);scene.camera=cam;rendered=[]
  for size in SIZES:
   scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.resolution_percentage=100
   for label,direction in VIEWS:
    cam.location=target+direction.normalized()*radius;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();dest=out/f'{label}-{size}.png';scene.render.filepath=str(dest);bpy.ops.render.render(write_still=True)
    if not dest.is_file() or dest.stat().st_size==0:raise RuntimeError('missing render '+str(dest))
    rendered.append(dest.name)
  bpy.ops.wm.save_as_mainfile(filepath=str((out/'trailgloam-full-r6.blend').resolve()))
  receipt={'status':'full R6 neutral candidate; pending independent visual review','source_hashes':{n:sha(p) for n,p in paths.items()}|{'r5-build_probe.py':sha(r5)},'blender_topology_winding_xyz_index_parity':audits,'grounded_foot_contract':'CPU routine must provide reviewed contact evidence; this Blender receipt proves literal XYZ/index/topology parity, not independent contact remeasurement','bounds_m':{'min':lo,'max':hi,'extent':[hi[i]-lo[i] for i in range(3)]},'renders':rendered,'views':[x[0] for x in VIEWS],'sizes':list(SIZES),'min_sampled_free_gib':min(samples) if samples else free_gib(),'elapsed_seconds':time.monotonic()-started}
  (out/'render-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8');print(json.dumps(receipt),flush=True)
 finally:stop.set()
if __name__=='__main__':main()
