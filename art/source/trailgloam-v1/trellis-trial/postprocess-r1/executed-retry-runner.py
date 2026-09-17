#!/usr/bin/env python3
"""One reviewed Trailgloam decode-to-state then fresh native TRELLIS postprocess.

This deliberately is not a generic resume runner.  It accepts only the pinned
Trailgloam handoffs and writes a private, tensor-only state for one fresh,
model-free o_voxel child.  Parent code is stdlib-only; CUDA/Torch stay in the
owned children.
"""
from __future__ import annotations
import argparse, ctypes, hashlib, json, os, shutil, subprocess, sys, tempfile, threading, time, unittest
from pathlib import Path

REPO_ROOT=Path(__file__).resolve().parents[2]
INSTALL_DEFAULT=Path('C:/Users/cwood/Tools/trellis2-stableprojectorz/code')
ARCHIVE_DEFAULT=REPO_ROOT/'.dream-loop/trailgloam-trellis/geometry-ply-v1-run'
PUBLIC_DEFAULT=REPO_ROOT/'art/source/trailgloam-v1/trellis-trial/postprocess-r1/run'
RAW_MASTER=REPO_ROOT/'art/source/trailgloam-v1/trellis-trial/geometry-ply-v1/raw-geometry.ply'
EXECUTED_RUNNER=REPO_ROOT/'art/source/trailgloam-v1/trellis-trial/geometry-ply-v1/executed-runner.py'
ARCHIVED_PLAN=REPO_ROOT/'art/source/trailgloam-v1/trellis-trial/geometry-ply-v1/plan.json'
INPUT=REPO_ROOT/'art/source/trailgloam-v1/rotation-1-reference/target-v2.png'
PROFILE='trailgloam-postprocess-v1'; MODE='trailgloam-postprocess-v1'
INPUT_SHA='417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff'
RAW_SHA='38b6173aa7a38f8c407f9c2a700016608504e2c949fe513323703afad595cb3f'
RUNNER_SHA='62a0a119267a8c17a48daf51f5894302adce856851d1c89883a700a02d07fbfa'
PLAN_SHA='9fa8f42aee808a81216c5ae0b7fd324e5744ca1c56f59bc08b1976ce66532f5d'
POSTPROCESS_SHA='8ece9f739090beb71f1b818ea09b79547c1c9370fccf37ac354bed854e28377d'
RETRY_PLAN_SHA='d29f6190d81043db13bf88e0d9272ab6db1c247f43fdcbbb20231263d164bffd'; RETRY_STATE_SHA='5e7faaacda9cc4bc6999828405365f065995aee73e56292f623d4eab7494b7c1'; RETRY_LAYOUT_SHA='1bf19c62632e26b4cd9df5dc202152c6060ecd8b5f3aa0eb4f6c4d1a91350506'; RETRY_MANIFEST_SHA='6de3fc82955e5759583a4fb889fb95d5d311cdcb6287315728d749841b0ac231'
ARCHIVE_PINS={'plan.json': 'de37c5ee50b2d93d9069c469d280cb44e179778e92c429d32de7264101f86b77', 'events.json': 'f33b61ed5f631e28c3f38c6f1f2b00c327f7a7d9f734d7e7403d09e7dcfc2eef', 'rng-after-sparse.pt': '510f638d8c17eacc94e8e5f38c2cd483d9bc3f4cefa92a420755050aea4c2fcb', 'rng-after-shape.pt': 'd1ab7479e18f557e504bd55ccb9bd0c3be917f5033e00adb9fb5a692828f1620'}
VERTS=889679; FACES=1804432; FACE_CAP=1900000
RESERVE_GIB=6.0; POST_HOST_ENTRY_GIB=8.0; DECODE_ENTRY_GIB=13.299913866445422
POST_VRAM_ENTRY_GIB=6.0; POST_VRAM_PHASE_GIB=1.0; DECIMATION=60000; TEXTURE=1024
MUTEX='Local\\WildkinTrellisStagedJob'
STATE_KEYS=('vertices','faces','attrs','coords','voxel_size','origin')
LAYOUT={'schema':'trailgloam-pbr-layout-v1','channels':6,'slices':{'base_color':[0,3],'metallic':[3,4],'roughness':[4,5],'alpha':[5,6]}}

def sha(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()
def canonical(obj): return json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=True)

def available_gib():
 m=ctypes.c_ulonglong(); total=ctypes.c_ulonglong(); avail=ctypes.c_ulonglong()
 if not ctypes.windll.kernel32.GlobalMemoryStatusEx: raise RuntimeError('Windows RAM API unavailable')
 class M(ctypes.Structure): _fields_=[('dwLength',ctypes.c_ulong),('dwMemoryLoad',ctypes.c_ulong),('ullTotalPhys',ctypes.c_ulonglong),('ullAvailPhys',ctypes.c_ulonglong),('ullTotalPageFile',ctypes.c_ulonglong),('ullAvailPageFile',ctypes.c_ulonglong),('ullTotalVirtual',ctypes.c_ulonglong),('ullAvailVirtual',ctypes.c_ulonglong),('ullAvailExtendedVirtual',ctypes.c_ulonglong)]
 x=M(); x.dwLength=ctypes.sizeof(M)
 if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(x)): raise OSError('GlobalMemoryStatusEx failed')
 return x.ullAvailPhys/(1024**3)
def require_host(n,label):
 got=available_gib()
 if got<n: raise RuntimeError(f'HOLD_HOST_GUARD {label}: free {got:.3f} GiB < {n:.3f} GiB')
 return got
def event(root,label,**data):
 p=Path(root)/'events.json'; rows=json.loads(p.read_text(encoding='utf8')) if p.exists() else []
 rows.append({'at_unix':time.time(),'label':label,**data}); p.write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8')
def write_json(p,obj): Path(p).write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n',encoding='utf8')
def fresh(p):
 p=Path(p); return not p.exists() or (p.is_dir() and not any(p.iterdir()))
def kernel32():
 k=ctypes.WinDLL('kernel32',use_last_error=True)
 k.CreateMutexW.argtypes=(ctypes.c_void_p,ctypes.c_bool,ctypes.c_wchar_p); k.CreateMutexW.restype=ctypes.c_void_p
 k.ReleaseMutex.argtypes=(ctypes.c_void_p,); k.ReleaseMutex.restype=ctypes.c_bool
 k.CloseHandle.argtypes=(ctypes.c_void_p,); k.CloseHandle.restype=ctypes.c_bool
 return k
def mutex():
 k=kernel32(); h=k.CreateMutexW(None,True,MUTEX)
 if not h or k.GetLastError()==183:
  if h:k.CloseHandle(ctypes.c_void_p(h))
  raise RuntimeError('Another process-staged job owns the common TRELLIS mutex')
 return h
def release(h):
 k=kernel32(); k.ReleaseMutex(h); k.CloseHandle(h)
def offline_env(install):
 e=os.environ.copy(); e.update({'PYTHONNOUSERSITE':'1','HF_HOME':str(install/'models'),'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','HF_DATASETS_OFFLINE':'1','HF_HUB_DISABLE_IMPLICIT_TOKEN':'1','HF_HUB_DISABLE_TELEMETRY':'1','NO_PROXY':'*','CUDA_VISIBLE_DEVICES':'0','OMP_NUM_THREADS':'4','MKL_NUM_THREADS':'4','TORCHDYNAMO_DISABLE':'1','PYTORCH_CUDA_ALLOC_CONF':'garbage_collection_threshold:0.65','SPARSE_DEBUG':'0'}); return e
def launch(cmd,install,stdout,stderr):
 flags=getattr(subprocess,'CREATE_NO_WINDOW',0)
 return subprocess.Popen(cmd,cwd=str(install),env=offline_env(install),creationflags=flags,stdout=stdout,stderr=stderr,text=True)
def reject_competing_trellis_processes():
 # Read-only Win32_Process scan; only the parent rejects competitors, never kills.
 script="Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"
 result=subprocess.run(['powershell','-NoProfile','-NonInteractive','-Command',script],capture_output=True,text=True,check=True)
 rows=json.loads(result.stdout or '[]'); rows=rows if isinstance(rows,list) else [rows]
 competing=[r for r in rows if int(r.get('ProcessId') or 0)!=os.getpid() and 'trellis' in str(r.get('CommandLine') or '').lower()]
 if competing: raise RuntimeError('competing TRELLIS process refused: '+canonical([r.get('ProcessId') for r in competing]))
def verify_lineage(archive):
 required={'conditioning.pt':'1bfa3d17343e6e93d2829f4ade676fc84a47ef7656f803917f879617fd145b42','coords.pt':'afce98b7f9bab905279454e78af49d0a39996a61de853089e86c1a49cadc57b4','shape.pt':'e67fd766272970221f23501be5ab98c5882d58e9246697620958c7361347b1c8','texture.pt':'b1a207b828433c68ae97cef3615fec56eff92dc7228f3e3b5fdfeec070d13fbc'}
 for n,d in required.items():
  p=Path(archive)/n
  if not p.is_file() or sha(p)!=d: raise RuntimeError(f'lineage handoff mismatch: {n}')
 if sha(INPUT)!=INPUT_SHA or sha(RAW_MASTER)!=RAW_SHA or sha(EXECUTED_RUNNER)!=RUNNER_SHA or sha(REPO_ROOT/'art/source/trailgloam-v1/trellis-trial/standalone-postprocess-plan.md')!=PLAN_SHA or not ARCHIVED_PLAN.is_file(): raise RuntimeError('pinned public lineage mismatch')
 for name,digest in ARCHIVE_PINS.items():
  path=(ARCHIVED_PLAN.parent/name) if name in ('plan.json','events.json') else Path(archive)/name
  if not path.is_file() or sha(path)!=digest: raise RuntimeError('lineage event/RNG mismatch: '+name)
 return required
def validate_layout(obj):
 if canonical(obj)!=canonical(LAYOUT): raise ValueError('layout is not the exact PBR v1 schema')
 return {k:slice(*v) for k,v in obj['slices'].items()}
def verify_digest(path, expected, label):
 if not Path(path).is_file() or sha(path)!=expected: raise RuntimeError('digest mismatch: '+label)
def verify_retry_state(private):
 root=Path(private)
 for name,digest in (('postprocess-state.pt',RETRY_STATE_SHA),('postprocess-layout.json',RETRY_LAYOUT_SHA),('postprocess-state-manifest.json',RETRY_MANIFEST_SHA),('decoded-master-verify.ply',RAW_SHA)):
  path=root/name
  if not path.is_file() or sha(path)!=digest: raise RuntimeError('retry state mismatch: '+name)
def prepare(args):
 verify_lineage(args.archive)
 reject_competing_trellis_processes()
 if args.retry_postprocess:
  verify_digest(REPO_ROOT/'art/source/trailgloam-v1/trellis-trial/postprocess-retry-import-fix-plan.md',RETRY_PLAN_SHA,'retry plan')
  verify_retry_state(args.private_output)
 if (not args.retry_postprocess and not fresh(args.private_output)) or not fresh(args.public_output): raise RuntimeError('output directory contract refused')
 return {'schema':'trailgloam-postprocess-run-plan-v1','profile':PROFILE,'mode':MODE,'input_sha256':INPUT_SHA,'raw_master_sha256':RAW_SHA,'executed_runner_sha256':RUNNER_SHA,'archive':str(args.archive.resolve()),'private_output':str(args.private_output.resolve()),'public_output':str(args.public_output.resolve()),'decoded_vertices':VERTS,'decoded_faces':FACES,'face_cap':FACE_CAP,'decode_host_entry_gib':DECODE_ENTRY_GIB,'post_host_entry_gib':POST_HOST_ENTRY_GIB,'reserve_gib':RESERVE_GIB,'post_vram_entry_gib':POST_VRAM_ENTRY_GIB,'post_vram_phase_gib':POST_VRAM_PHASE_GIB,'decimation_target':DECIMATION,'texture_size':TEXTURE,'retry_postprocess':args.retry_postprocess,'plan_sha256':PLAN_SHA,'archive_pins':ARCHIVE_PINS}

def child_bootstrap(install):
 os.chdir(install); sys.path.insert(0,str(install)) if str(install) not in sys.path else None

def tensor_check(torch,d,vertices=VERTS,faces_count=FACES):
 if type(d) is not dict or tuple(d.keys())!=STATE_KEYS: raise ValueError('state keys must be exact and ordered')
 specs={'vertices':(torch.float32,2,(vertices,3)),'faces':(torch.int32,2,(faces_count,3)),'attrs':(torch.float16,2,None),'coords':(torch.int32,2,None),'voxel_size':(torch.float32,1,(1,)),'origin':(torch.float32,1,(3,))}
 for k,(dtype,rank,shape) in specs.items():
  x=d[k]
  if type(x) is not torch.Tensor or x.dtype!=dtype or x.ndim!=rank or not x.is_contiguous() or x.device.type!='cpu': raise ValueError(f'bad state tensor {k}')
  if shape and tuple(x.shape)!=shape: raise ValueError(f'bad state shape {k}')
  if not shape and (x.shape[0]<=0 or (k=='attrs' and x.shape[1]!=6) or (k=='coords' and x.shape[1]!=3)): raise ValueError(f'bad variable state shape {k}')
  if x.is_floating_point() and not torch.isfinite(x).all(): raise ValueError(f'nonfinite {k}')
 if d['attrs'].shape[0]!=d['coords'].shape[0]: raise ValueError('attrs/coords cardinality mismatch')
 if int(d['faces'].min())<0 or int(d['faces'].max())>=vertices: raise ValueError('face index outside vertices')
 if not bool((d['voxel_size']>0).all()) or not torch.equal(d['origin'],torch.tensor([-.5,-.5,-.5],dtype=torch.float32)): raise ValueError('bad scalar lineage state')
 return d

class UnsafePayload:
 pass
def state_manifest(state,state_path,layout_path,raw):
 return {'schema':'trailgloam-postprocess-state-v1','profile':PROFILE,'raw_master_sha256':RAW_SHA,'raw_master_bytes':Path(raw).stat().st_size,'raw_vertex_count':VERTS,'raw_face_count':FACES,'state_sha256':sha(state_path),'layout_sha256':sha(layout_path),'tensors':{k:{'dtype':str(v.dtype).replace('torch.',''),'shape':list(v.shape),'nbytes':v.numel()*v.element_size()} for k,v in state.items()}}
def validate_manifest_data(man, layout_hash, tensors, state_path=None):
 if type(man) is not dict or man.get('schema')!='trailgloam-postprocess-state-v1' or man.get('profile')!=PROFILE: raise ValueError('manifest schema mismatch')
 if state_path is not None and man.get('state_sha256')!=sha(state_path): raise ValueError('state byte hash mismatch')
 if man.get('layout_sha256')!=layout_hash or man.get('raw_master_sha256')!=RAW_SHA or man.get('raw_vertex_count')!=VERTS or man.get('raw_face_count')!=FACES: raise ValueError('manifest lineage mismatch')
 expected={k:{'dtype':str(v.dtype).replace('torch.',''),'shape':list(v.shape),'nbytes':v.numel()*v.element_size()} for k,v in tensors.items()}
 if man.get('tensors')!=expected: raise ValueError('manifest tensor receipt mismatch')
 return man
def load_cpu_state(torch,private):
 root=Path(private); layout=json.loads((root/'postprocess-layout.json').read_text(encoding='utf8')); validate_layout(layout)
 state_path=root/'postprocess-state.pt'; man_path=root/'postprocess-state-manifest.json'
 state=torch.load(state_path,map_location='cpu',weights_only=True); tensor_check(torch,state)
 man=json.loads(man_path.read_text(encoding='utf8'))
 validate_manifest_data(man,sha(root/'postprocess-layout.json'),state,state_path)
 return state,layout,man

def host_watchdog(stop):
 def watch():
  while not stop.wait(.5):
   if available_gib()<RESERVE_GIB: os._exit(77)
 threading.Thread(target=watch,daemon=True).start()
def gpu_sample(torch,phase):
 free,total=torch.cuda.mem_get_info(); return {'phase':phase,'host_free_gib':available_gib(),'cuda_free_gib':free/(1024**3),'cuda_total_gib':total/(1024**3),'cuda_allocated_gib':torch.cuda.memory_allocated()/(1024**3),'cuda_reserved_gib':torch.cuda.memory_reserved()/(1024**3)}
def gpu_gate(torch,phase,entry=False):
 s=gpu_sample(torch,phase)
 if entry:
  ok=7.5<=s['cuda_total_gib']<=8.5 and s['cuda_free_gib']>=POST_VRAM_ENTRY_GIB and s['cuda_allocated_gib']<=.25 and s['cuda_reserved_gib']<=.25
 else: ok=s['cuda_free_gib']>=POST_VRAM_PHASE_GIB
 if not ok: raise RuntimeError('HOLD_GPU_GUARD '+canonical(s))
 require_host(RESERVE_GIB,phase); return s

def decode_child(args,plan):
 require_host(DECODE_ENTRY_GIB,'decode child')
 stop=threading.Event(); host_watchdog(stop)
 child_bootstrap(args.install_root); import torch
 from trellis2.modules.sparse import SparseTensor
 # Reuse the reviewed staged construction pattern, but instantiate only the two
 # decoders; from_pretrained would eagerly load every model and is forbidden.
 from api_spz.core.state_manage import _apply_patches; _apply_patches()
 from trellis2.pipelines import Trellis2ImageTo3DPipeline, samplers
 from trellis2 import models
 archived=json.loads(ARCHIVED_PLAN.read_text(encoding='utf8')); config=archived['config']
 kwargs={'models':{},'low_vram':True,'default_pipeline_type':'512'}
 for prefix in ('sparse_structure','shape_slat','tex_slat'):
  spec=config[prefix+'_sampler']; kwargs[prefix+'_sampler']=getattr(samplers,spec['name'])(**spec['args']); kwargs[prefix+'_sampler_params']=spec['params']
 kwargs.update({key:config[key] for key in ('shape_slat_normalization','tex_slat_normalization')})
 pipe=Trellis2ImageTo3DPipeline(**kwargs); pipe.to(torch.device('cuda'))
 for key in ('shape_slat_decoder','tex_slat_decoder'): pipe.models[key]=models.from_pretrained(archived['models'][key]['prefix']).eval()
 pipe._convert_bf16_to_fp16_if_needed()
 # Exact, owned safe handoffs only; no flow/conditioning inference.
 def load(n,keys):
  x=torch.load(args.archive/n,map_location='cpu',weights_only=True)
  if type(x) is not dict or set(x)!=set(keys) or any(type(v) is not torch.Tensor for v in x.values()): raise ValueError('bad archived handoff '+n)
  return x
 pipe.models['shape_slat_decoder'].to('cuda'); pipe.models['tex_slat_decoder'].to('cuda')
 sh=load('shape.pt',('feats','coords')); tx=load('texture.pt',('feats','coords'))
 with torch.inference_mode(): mesh=pipe.decode_latent(SparseTensor(sh['feats'].cuda(),sh['coords'].cuda()),SparseTensor(tx['feats'].cuda(),tx['coords'].cuda()),512)[0]
 if int(mesh.vertices.shape[0])!=VERTS or int(mesh.faces.shape[0])!=FACES or FACES>FACE_CAP: raise RuntimeError('decoded counts differ from pinned master')
 state={'vertices':mesh.vertices.detach().to(dtype=torch.float32,device='cpu').contiguous(),'faces':mesh.faces.detach().to(dtype=torch.int32,device='cpu').contiguous(),'attrs':mesh.attrs.detach().to(dtype=torch.float16,device='cpu').contiguous(),'coords':mesh.coords.detach().to(dtype=torch.int32,device='cpu').contiguous(),'voxel_size':torch.tensor([float(mesh.voxel_size)],dtype=torch.float32),'origin':torch.tensor([-.5,-.5,-.5],dtype=torch.float32)}
 tensor_check(torch,state); private=Path(args.private_output); torch.save(state,private/'postprocess-state.pt')
 (private/'postprocess-layout.json').write_text(canonical(LAYOUT)+'\n',encoding='utf8')
 # Deterministic writer and old comments yield a byte-identical lineage PLY.
 sys.path.insert(0,str(Path(__file__).resolve().parent)); from trellis_geometry_ply import write_binary_ply
 candidate=private/'decoded-master-verify.ply'; rec=write_binary_ply(candidate,vertex_bytes=state['vertices'].numpy().tobytes(),vertex_count=VERTS,scalar='float32',triangles=state['faces'].numpy(),comments=('fresh-process-per-stage-512-trailgloam-geometry-ply-v1','geometry-only; no o_voxel/CuMesh/BVH/UV/bake/simplification','source_vertex_dtype=float32','precision_action=exact-contiguous-CPU-copy'))
 if rec['sha256']!=RAW_SHA: raise RuntimeError('decoded PLY differs from immutable raw master')
 write_json(private/'postprocess-state-manifest.json',state_manifest(state,private/'postprocess-state.pt',private/'postprocess-layout.json',RAW_MASTER)); event(args.public_output,'decode-state:complete',state_sha256=sha(private/'postprocess-state.pt'),raw_sha256=rec['sha256']); stop.set()

def inventory_from_doc(doc):
 accessors=doc.get('accessors'); meshes=doc.get('meshes')
 if not isinstance(accessors,list) or not isinstance(meshes,list): raise ValueError('GLB lacks mesh/accessor arrays')
 vertices=triangles=primitives=0
 for mesh in meshes:
  if not isinstance(mesh,dict) or not isinstance(mesh.get('primitives'),list): raise ValueError('invalid GLB mesh')
  for primitive in mesh['primitives']:
   try:
    position=accessors[primitive['attributes']['POSITION']]['count']; indices=accessors[primitive['indices']]['count']
   except (KeyError,IndexError,TypeError): raise ValueError('GLB primitive lacks POSITION/indices accessor')
   if not isinstance(position,int) or not isinstance(indices,int) or indices%3: raise ValueError('invalid GLB primitive counts')
   vertices+=position; triangles+=indices//3; primitives+=1
 if not primitives: raise ValueError('GLB has no primitives')
 return {'glb_meshes':len(meshes),'glb_primitives':primitives,'vertex_count':vertices,'triangle_count':triangles}
def glb_inventory(path):
 raw=Path(path).read_bytes()
 if raw[:4]!=b'glTF' or len(raw)<20: raise ValueError('not a GLB')
 json_len=int.from_bytes(raw[12:16],'little'); json_type=raw[16:20]
 if json_type!=b'JSON': raise ValueError('GLB lacks JSON chunk')
 return inventory_from_doc(json.loads(raw[20:20+json_len].decode('utf8').rstrip(' \x00')))
def native_phase_trace(torch, output, install):
 source=(install/'o-voxel/o_voxel/postprocess.py').resolve()
 if sha(source)!=POSTPROCESS_SHA: raise RuntimeError('installed postprocess source hash mismatch')
 source_name=str(source); hooks={114:'cumesh-create',129:'bvh-create',194:'remesh',219:'simplify',258:'uv',297:'rasterize',324:'bake-bvh',419:'return'}
 samples=[]
 def local_trace(frame,event_name,arg):
  if event_name=='line' and frame.f_lineno in hooks:
   sample=gpu_gate(torch,'postprocess:'+hooks[frame.f_lineno]); samples.append(sample); event(output,'postprocess:phase',**sample)
  return local_trace
 def global_trace(frame,event_name,arg):
  return local_trace if event_name=='call' and frame.f_code.co_filename==source_name else None
 return global_trace,samples
def postprocess_child(args,plan):
 require_host(POST_HOST_ENTRY_GIB,'postprocess child')
 stop=threading.Event(); host_watchdog(stop)
 child_bootstrap(args.install_root); import torch
 if not torch.cuda.is_available(): raise RuntimeError('CUDA required for native postprocess')
 state,layout,man=load_cpu_state(torch,args.private_output); gpu_gate(torch,'postprocess:entry',True)
 # Model-free bootstrap: install Windows flex_gemm fallback before o_voxel imports grid_sample.
 from api_spz.core.state_manage import _apply_patches; _apply_patches()
 # no pipeline/decoder imports in this child
 import o_voxel
 gpu_gate(torch,'postprocess:before-cumesh')
 trace,samples=native_phase_trace(torch,Path(args.public_output),args.install_root)
 try:
  previous=sys.gettrace(); sys.settrace(trace)
  try:
   glb=o_voxel.postprocess.to_glb(vertices=state['vertices'].cuda(),faces=state['faces'].cuda(),attr_volume=state['attrs'].cuda(),coords=state['coords'].cuda(),attr_layout={k:slice(*v) for k,v in layout['slices'].items()},aabb=[[-.5,-.5,-.5],[.5,.5,.5]],voxel_size=float(state['voxel_size'][0]),decimation_target=DECIMATION,texture_size=TEXTURE,remesh=True,remesh_band=1,remesh_project=0,verbose=True)
  finally: sys.settrace(previous)
  target=Path(args.public_output)/'raw-textured-simplified.glb'; glb.export(str(target)); inventory=glb_inventory(target)
  event(args.public_output,'postprocess:complete',output_sha256=sha(target),bytes=target.stat().st_size,inventory=inventory,gpu_samples=samples+[gpu_sample(torch,'postprocess:complete')]); stop.set()
 except Exception as e:
  sys.settrace(None); event(args.public_output,'HOLD_POSTPROCESS_ERROR',error=str(e),gpu_samples=samples+[gpu_sample(torch,'postprocess:exception')]); stop.set(); raise

def child_main(args):
 plan=json.loads((Path(args.public_output)/'run-plan.json').read_text(encoding='utf8'))
 if plan.get('profile')!=PROFILE: raise RuntimeError('wrong plan')
 if args.child=='decode': decode_child(args,plan)
 elif args.child=='postprocess': postprocess_child(args,plan)
 else: raise RuntimeError('unknown child')

def cpu_fixture_main():
 # Truly tiny production-checker fixtures; no production tensors or CUDA calls.
 import torch
 def tiny(): return {'vertices':torch.zeros((3,3),dtype=torch.float32),'faces':torch.tensor([[0,1,2]],dtype=torch.int32),'attrs':torch.zeros((1,6),dtype=torch.float16),'coords':torch.zeros((1,3),dtype=torch.int32),'voxel_size':torch.tensor([.01],dtype=torch.float32),'origin':torch.tensor([-.5,-.5,-.5],dtype=torch.float32)}
 tensor_check(torch,tiny(),vertices=3,faces_count=1); cases=[]
 for mutate in (lambda x:x.__setitem__('vertices',x['vertices'].double()),lambda x:x.__setitem__('faces',x['faces'].unsqueeze(0)),lambda x:x.pop('origin'),lambda x:x.__setitem__('extra',torch.tensor(1)),lambda x:x.__setitem__('attrs',torch.zeros((2,6),dtype=torch.float16)),lambda x:x.__setitem__('faces',torch.tensor([[3,1,2]],dtype=torch.int32))):
  x=tiny(); mutate(x)
  try: tensor_check(torch,x,vertices=3,faces_count=1)
  except ValueError: cases.append('rejected')
  else: raise AssertionError('bad tiny fixture accepted')
 try: validate_layout({'schema':'bad'})
 except ValueError: cases.append('layout-rejected')
 else: raise AssertionError('bad layout accepted')
 state_file=Path(tempfile.mkdtemp())/'unsafe.pt'; torch.save({'unsafe':UnsafePayload()},state_file)
 try: torch.load(state_file,map_location='cpu',weights_only=True)
 except Exception: cases.append('weights-only-object-rejected')
 else: raise AssertionError('unsafe pickle accepted')
 print(json.dumps({'cpu_schema_fixtures':'pass','rejections':len(cases),'cuda_called':False,'largest_fixture_vertices':3}))

class Tests(unittest.TestCase):
 def test_layout_exact(self): self.assertEqual(validate_layout(json.loads(canonical(LAYOUT)))['alpha'],slice(5,6)); self.assertRaises(ValueError,validate_layout,{'schema':'x'})
 def test_plan_constants(self): self.assertEqual((FACE_CAP,DECIMATION,TEXTURE,POST_HOST_ENTRY_GIB,POST_VRAM_ENTRY_GIB,POST_VRAM_PHASE_GIB),(1900000,60000,1024,8.0,6.0,1.0))
 def test_inventory_sums_all_mesh_primitives(self):
  doc={'accessors':[{'count':3},{'count':3},{'count':4},{'count':6}], 'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1},{'attributes':{'POSITION':2},'indices':3}]}]}
  self.assertEqual(inventory_from_doc(doc),{'glb_meshes':1,'glb_primitives':2,'vertex_count':7,'triangle_count':3})
 def test_digest_rejects_changed_retry_fixture(self):
  with tempfile.TemporaryDirectory() as raw:
   path=Path(raw)/'retry.md'; path.write_text('pinned',encoding='utf8'); verify_digest(path,sha(path),'fixture'); path.write_text('changed',encoding='utf8')
   with self.assertRaises(RuntimeError): verify_digest(path,hashlib.sha256(b'pinned').hexdigest(),'fixture')
 def test_parent_has_no_torch_import(self):
  import ast
  tree=ast.parse(Path(__file__).read_text(encoding='utf8'))
  self.assertFalse(any((isinstance(x,ast.Import) and any(y.name=='torch' for y in x.names)) or (isinstance(x,ast.ImportFrom) and x.module=='torch') for x in tree.body))

def main():
 p=argparse.ArgumentParser(); p.add_argument('--install-root',type=Path,default=INSTALL_DEFAULT); p.add_argument('--archive',type=Path,default=ARCHIVE_DEFAULT); p.add_argument('--private-output',type=Path,default=REPO_ROOT/'.dream-loop/trailgloam-trellis/postprocess-r1'); p.add_argument('--public-output',type=Path,default=PUBLIC_DEFAULT); p.add_argument('--prepare-only',action='store_true'); p.add_argument('--run',action='store_true'); p.add_argument('--retry-postprocess',action='store_true'); p.add_argument('--child',choices=('decode','postprocess')); p.add_argument('--cpu-schema-test',action='store_true'); p.add_argument('--self-test',action='store_true'); a=p.parse_args()
 if a.self_test:
  r=unittest.main(argv=[sys.argv[0]],exit=False); raise SystemExit(0 if r.result.wasSuccessful() else 1)
 if a.cpu_schema_test: cpu_fixture_main(); return
 a.install_root=a.install_root.resolve(); a.archive=a.archive.resolve(); a.private_output=a.private_output.resolve(); a.public_output=a.public_output.resolve()
 if a.child: child_main(a); return
 if a.prepare_only==a.run: p.error('choose exactly one of --prepare-only or --run')
 if a.retry_postprocess and not a.run and not a.prepare_only: p.error('--retry-postprocess needs prepare or run')
 plan=prepare(a)
 if a.prepare_only: print(json.dumps({'prepare_only':'pass','profile':PROFILE,'private_output':str(a.private_output),'public_output':str(a.public_output)})); return
 a.private_output.mkdir(parents=True); a.public_output.mkdir(parents=True); write_json(a.public_output/'run-plan.json',plan); h=mutex()
 try:
  for child in (('postprocess',) if a.retry_postprocess else ('decode','postprocess')):
   cmd=[str(a.install_root/'venv/Scripts/python.exe'),str(Path(__file__).resolve()),'--child',child,'--install-root',str(a.install_root),'--archive',str(a.archive),'--private-output',str(a.private_output),'--public-output',str(a.public_output)]
   with (a.public_output/(child+'.stdout.log')).open('x',encoding='utf8') as out, (a.public_output/(child+'.stderr.log')).open('x',encoding='utf8') as err:
    q=launch(cmd,a.install_root,out,err); code=q.wait()
   if code:
    event(a.public_output,'terminal:HOLD',child=child,exit_code=code)
    write_json(a.public_output/'terminal-receipt.json',{'status':'HOLD','child':child,'exit_code':code})
    raise RuntimeError(f'owned {child} child exited {code}')
 finally: release(h)
if __name__=='__main__': main()

