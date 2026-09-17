"""Guarded Blender renderer for the approved Trailgloam R7 hoof-only repair.

No geometry is reconstructed here.  R6 comes from its pinned pure constructor and
R7 pads come from the approved cuff-derived pure constructor.  --execute is required.
"""
import argparse, ctypes, hashlib, importlib.util, json, math, os, struct, sys, threading, time
from pathlib import Path
import bpy
from mathutils import Vector

MIN_FREE_GIB=8.0; RESERVE_GIB=6.0; SIZES=(512,96,48)
R6_PARAMS_SHA='cc4e081fda9efca9792d3e336133e1413360c57b1ac8acfe263a64de35d3b3e0'
R6_CPU_SHA='667d72d660a8c70b78b8e8f7c7ee6d92e7271563cb8b02c313b6a124421d9d28'
R7_PARAMS_SHA='41d4d2440763bc6e5685daea4ad3aa208ba51add706446651d5a80e310eb418b'
R7_CPU_SHA='627fb8ab388bea30efb7d6826986b694dff7dfe9280b2da092a57cd13249b917'
R7_PROOF_SHA='af2c1da7185152d15637a1284eebe63352b0c980fac5ae41d4953bf46530c188'
VIEWS=(('front',Vector((0,-1,.16))),('rear',Vector((0,1,.16))),('left',Vector((-1,0,.16))),('right',Vector((1,0,.16))),('top',Vector((0,0,1))),('underside',Vector((0,0,-1))),('three-quarter',Vector((.68,-.74,.38))))

def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''): h.update(block)
 return h.hexdigest()
def free_gib():
 class S(ctypes.Structure): _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in ('total','available','page_total','page_available','virtual_total','virtual_available','extended')]
 s=S();s.length=ctypes.sizeof(s)
 if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s)): raise RuntimeError('RAM measurement unavailable')
 return s.available/2**30
def sub(a,b):return [a[i]-b[i] for i in range(3)]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def dot(a,b):return sum(a[i]*b[i] for i in range(3))
def mag(a):return math.sqrt(dot(a,a))
def arguments():
 xs=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 p=argparse.ArgumentParser();p.add_argument('--execute',action='store_true');p.add_argument('--plan-dir',required=True,type=Path);p.add_argument('--output-dir',required=True,type=Path);return p.parse_args(xs)
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def literal_signature(part):
 return json.dumps({'vertices':part['vertices'],'faces':part['faces']},separators=(',',':'),allow_nan=False)
def audit(part):
 vertices,faces=part['vertices'],part['faces'];edges={};minimum=float('inf')
 for face in faces:
  if len(face)!=3 or min(face)<0 or max(face)>=len(vertices):raise RuntimeError(part['name']+' bad triangle index')
  a,b,c=(vertices[i] for i in face);n=cross(sub(b,a),sub(c,a));area=mag(n)
  if area<=1e-8 or not all(math.isfinite(v) for point in (a,b,c) for v in point):raise RuntimeError(part['name']+' nonfinite or degenerate face')
  for edge in ((face[0],face[1]),(face[1],face[2]),(face[2],face[0])):
   edge=tuple(sorted(edge));edges[edge]=edges.get(edge,0)+1
 center=[sum(v[i] for v in vertices)/len(vertices) for i in range(3)]
 for ia,ib,ic in faces:
  a,b,c=(vertices[i] for i in (ia,ib,ic));minimum=min(minimum,dot(cross(sub(b,a),sub(c,a)),sub([(a[i]+b[i]+c[i])/3 for i in range(3)],center)))
 if any(count!=2 for count in edges.values()) or minimum<=0:raise RuntimeError(part['name']+' closure/winding failed')
 return {'vertices':len(vertices),'triangles':len(faces),'boundary_edges':sum(n==1 for n in edges.values()),'nonmanifold_edges':sum(n>2 for n in edges.values()),'outward_centroid_dot_min':minimum}
def make_material(part):
 if part['name'].endswith('_hoof_r7'):
  color=(.095,.19,.20,1)
 elif '_hoof' in part['name']: raise RuntimeError('old R6 hoof reached materializer')
 elif 'eye' in part['name']:color=(.9,.86,.70,1)
 elif 'frond' in part['name']:color=(.78,.35,.035,1)
 elif 'cuff' in part['name'] or 'collar' in part['name']:color=(.09,.10,.11,1)
 else:color=(.07,.32,.34,1)
 material=bpy.data.materials.new(part['name']+'_display');material.diffuse_color=color;return material
def make_object(part):
 mesh=bpy.data.meshes.new(part['name']+'_literal');mesh.from_pydata(part['vertices'],[],part['faces']);mesh.update(calc_edges=False)
 if len(mesh.vertices)!=len(part['vertices']) or len(mesh.polygons)!=len(part['faces']) or any(len(poly.vertices)!=3 for poly in mesh.polygons):raise RuntimeError(part['name']+' Blender topology parity failed')
 for index,(literal,vertex) in enumerate(zip(part['vertices'],mesh.vertices)):
  for axis in range(3):
   expected=struct.pack('<f',struct.unpack('<f',struct.pack('<f',literal[axis]))[0]);actual=struct.pack('<f',vertex.co[axis])
   if actual!=expected:raise RuntimeError(f'{part["name"]} float32 XYZ mismatch {index}/{axis}')
 if [i for face in part['faces'] for i in face] != [loop.vertex_index for loop in mesh.loops]:raise RuntimeError(part['name']+' index-loop mismatch')
 mesh.calc_loop_triangles()
 if len(mesh.loop_triangles)!=len(part['faces']):raise RuntimeError(part['name']+' loop-triangle mismatch')
 center=sum((vertex.co for vertex in mesh.vertices),Vector())/len(mesh.vertices)
 for triangle in mesh.loop_triangles:
  a,b,c=(mesh.vertices[i].co for i in triangle.vertices)
  if (b-a).cross(c-a).length_squared<=1e-16 or (b-a).cross(c-a).dot((a+b+c)/3-center)<=0:raise RuntimeError(part['name']+' Blender winding mismatch')
 obj=bpy.data.objects.new(part['name'],mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(make_material(part));return obj
def main():
 a=arguments()
 if not a.execute:raise RuntimeError('refusing without --execute')
 plan=a.plan_dir.resolve();out=a.output_dir.resolve()
 if not a.plan_dir.is_absolute() or not a.output_dir.is_absolute() or not plan.is_dir() or out.exists():raise RuntimeError('plan-dir must exist absolute and output-dir must be fresh absolute')
 if free_gib()<MIN_FREE_GIB:raise RuntimeError('requires 8GiB free before Blender import')
 r7={name:plan/name for name in ('parameters.json','cpu-feasibility.py','cpu-feasibility.json')};r6=plan.parent/'full-r6-plan';r6_params=r6/'parameters.json';r6_cpu=r6/'cpu-feasibility.py'
 if not all(p.is_file() for p in (*r7.values(),r6_params,r6_cpu)):raise RuntimeError('missing pinned R6/R7 inputs')
 if sha(r6_params)!=R6_PARAMS_SHA or sha(r6_cpu)!=R6_CPU_SHA or sha(r7['parameters.json'])!=R7_PARAMS_SHA:raise RuntimeError('reviewed source hash differs')
 if R7_CPU_SHA is None or R7_PROOF_SHA is None:raise RuntimeError('R7 builder source has not been independently hash-pinned')
 if sha(r7['cpu-feasibility.py'])!=R7_CPU_SHA or sha(r7['cpu-feasibility.json'])!=R7_PROOF_SHA:raise RuntimeError('R7 CPU source/proof differs from independent pin')
 r6mod=load('trailgloam_r6_cpu',r6_cpu);r7mod=load('trailgloam_r7_hooves',r7['cpu-feasibility.py'])
 r6parts,*_=r6mod.build_parts(json.loads(r6_params.read_text(encoding='utf8')));pads,hosts=r7mod.build_replacement_hooves(json.loads(r7['parameters.json'].read_text(encoding='utf8')))
 old_hooves=[part for part in r6parts if part['name'].endswith('_hoof')]
 retained=[part for part in r6parts if not part['name'].endswith('_hoof')]
 if len(old_hooves)!=6 or len(pads)!=6 or {part['name'].replace('_r7','') for part in pads}!={part['name'] for part in old_hooves}:raise RuntimeError('must replace exactly six named R6 hooves')
 source_signatures={part['name']:literal_signature(part) for part in retained}
 if any(literal_signature(part)!=source_signatures[part['name']] for part in retained):raise RuntimeError('retained R6 component mutation')
 proof=json.loads(r7['cpu-feasibility.json'].read_text(encoding='utf8'))
 if not (proof.get('all_closed_outward') and proof.get('all_cuff_contacts') and proof.get('all_grounded')):raise RuntimeError('R7 CPU contact/topology proof failed')
 audits={part['name']:audit(part) for part in pads}
 if any(min(point[2] for point in part['sole_ring'])!=0 or max(point[2] for point in part['sole_ring'])!=0 for part in pads):raise RuntimeError('R7 sole-plane contract failed')
 if any(not contact['full_terminal_cuff_end_ring_inside_closed_socket']['contained'] for contact in proof['contacts']):raise RuntimeError('R7 full cuff socket contract failed')
 parts=retained+pads
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
  if len(objects)!=len(parts) or any(name not in objects for name in source_signatures):raise RuntimeError('R6 retained Blender object inventory mismatch')
  vertices=[vertex for part in parts for vertex in part['vertices']];lo=[min(v[i] for v in vertices) for i in range(3)];hi=[max(v[i] for v in vertices) for i in range(3)];target=Vector([(lo[i]+hi[i])/2 for i in range(3)]);radius=max(hi[i]-lo[i] for i in range(3))*2.8
  scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True
  camera_data=bpy.data.cameras.new('TrailgloamCamera');camera=bpy.data.objects.new('TrailgloamCamera',camera_data);bpy.context.collection.objects.link(camera);scene.camera=camera;renders=[]
  for size in SIZES:
   scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.resolution_percentage=100
   for label,direction in VIEWS:
    camera.location=target+direction.normalized()*radius;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();destination=out/f'{label}-{size}.png';scene.render.filepath=str(destination);bpy.ops.render.render(write_still=True)
    if not destination.is_file() or destination.stat().st_size==0:raise RuntimeError('missing render '+str(destination))
    renders.append(destination.name)
  bpy.ops.wm.save_as_mainfile(filepath=str((out/'trailgloam-hoof-r7.blend').resolve()))
  receipt={'status':'R7 hoof-only candidate; pending independent visual review','source_hashes':{'r6_parameters':sha(r6_params),'r6_cpu':sha(r6_cpu),'r7_parameters':sha(r7['parameters.json']),'r7_cpu':sha(r7['cpu-feasibility.py']),'r7_proof':sha(r7['cpu-feasibility.json'])},'replacement':{'old_hoof_count':len(old_hooves),'new_hoof_count':len(pads),'retained_r6_part_count':len(retained),'new_pad_audits':audits,'CPU_socket_and_sole_contract':'pinned CPU evidence; Blender receipt proves literal mesh parity, not a separate contact remeasurement'},'bounds_m':{'min':lo,'max':hi,'extent':[hi[i]-lo[i] for i in range(3)]},'renders':renders,'views':[view[0] for view in VIEWS],'sizes':list(SIZES),'min_sampled_free_gib':min(samples) if samples else free_gib(),'elapsed_seconds':time.monotonic()-started}
  (out/'render-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8');print(json.dumps(receipt),flush=True)
 finally:stop.set()
if __name__=='__main__':main()
