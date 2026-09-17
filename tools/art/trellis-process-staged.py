"""Fresh-process TRELLIS 512 experiment; preparation is the safe default.

The parent is standard-library only.  ``--run`` starts one hidden child for each
numerical stage and waits for it to exit before starting the next one.  CPU
handoffs are tensor-only torch archives created in this new output directory;
the parent never accepts a supplied handoff/archive path.
"""
import argparse
import ast
import ctypes
from datetime import datetime, timezone
import hashlib
import importlib.util
import inspect
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import unittest

RESERVE_GIB = 6.0
WORKSPACE_GIB = 2.0
MAX_DECODED_FACES = 750000
GEOMETRY_PLY_MAX_DECODED_FACES = 1_100_000
LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES = 2_300_000
TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES = 1_900_000
FULL_EXPORT_PROFILE = 'fresh-process-per-stage-512-experiment'
GEOMETRY_PLY_PROFILE = 'fresh-process-per-stage-512-geometry-ply-v1'
LANTERN_GEOMETRY_PLY_PROFILE = 'fresh-process-per-stage-512-lantern-geometry-ply-v1'
TRAILGLOAM_GEOMETRY_PLY_PROFILE = 'fresh-process-per-stage-512-trailgloam-geometry-ply-v1'
ROOTBOUND_BUTTRESS_INPUT_SHA256 = '65d8f8c63be4a3c98738aabe72cad21ce9399f3950914b559f8d1dc80abd457a'
LANTERN_LOG_INPUT_SHA256 = '85bd175a6b102cf183b50ff5ca45a1afd6847a6920a28b0039bd8e1e98d6b2ac'
TRAILGLOAM_INPUT_SHA256 = '417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff'
GEOMETRY_PLY_MODES = ('geometry-ply-v1', 'lantern-geometry-ply-v1', 'trailgloam-geometry-ply-v1')
MAX_COORDS = 32768
STAGES = ('background', 'conditioning', 'sparse', 'shape-flow', 'texture-flow', 'decode')
HANDOFFS = {
    'conditioning': 'conditioning.pt', 'sparse': 'coords.pt',
    'shape-flow': 'shape.pt', 'texture-flow': 'texture.pt',
}
RNG_HANDOFFS = {'sparse': 'rng-after-sparse.pt', 'shape-flow': 'rng-after-shape.pt'}


def available_gib():
    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (key, ctypes.c_ulonglong) for key in ('total', 'available', 'page_total',
            'page_available', 'virtual_total', 'virtual_available', 'extended')]
    status = Status(); status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise OSError('Cannot measure available physical RAM')
    return status.available / 2**30


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat()


def load_metadata_helper():
    """Load only the existing metadata helper (it has no Torch imports)."""
    source = Path(__file__).with_name('trellis-staged.py')
    spec = importlib.util.spec_from_file_location('wildkin_trellis_metadata', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def checked_child_path(output, name):
    if name not in set(HANDOFFS.values()) | set(RNG_HANDOFFS.values()) | {'preprocessed.png'}:
        raise ValueError('untrusted child handoff name')
    target = (output / name).resolve()
    if target.parent != output.resolve():
        raise ValueError('handoff escaped output directory')
    return target


def ensure_free(required, label):
    free = available_gib()
    if free < required:
        raise RuntimeError(f'{label} refused: {free:.2f}GiB free, {required:.2f}GiB required including {RESERVE_GIB:.0f}GiB reserve')
    return free


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2), encoding='utf8')


def append_event(output, label, **values):
    path = output / 'events.json'
    events = json.loads(path.read_text(encoding='utf8')) if path.exists() else []
    event = {'label': label, 'time': now(), 'free_gib': available_gib(), **values}
    events.append(event); write_json(path, events)
    print(json.dumps(event), flush=True)


def append_complete_event(output, target):
    """Record completion without colliding with append_event's output argument."""
    append_event(output, 'complete', artifact_path=str(target), output_sha256=sha256(target))


def acquire_owned_job():
    """Refuse competitors; this runner never stops another process."""
    with socket.socket() as sock:
        sock.settimeout(.2)
        if sock.connect_ex(('127.0.0.1', 7960)) == 0:
            raise RuntimeError('TRELLIS API port7960 is occupied; coordinate the existing job first')
    command = "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -match 'trellis-staged\\.py|trellis-process-staged\\.py|trellis-small-profile\\.py|api_spz[/\\\\]main_api\\.py' } | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"
    raw = subprocess.run(['powershell', '-NoProfile', '-Command', command], check=True,
                         capture_output=True, text=True).stdout.strip()
    processes = json.loads(raw) if raw else []
    if isinstance(processes, dict): processes = [processes]
    if any(item['ProcessId'] not in {os.getpid(), os.getppid()} for item in processes):
        raise RuntimeError('Another local TRELLIS Python process exists; no parallel job allowed')
    kernel = ctypes.windll.kernel32; kernel.CreateMutexW.restype = ctypes.c_void_p
    # Match the existing staged helper so two helpers cannot both pass their
    # process scans during a concurrent launch.
    handle = kernel.CreateMutexW(None, True, 'Local\\WildkinTrellisStagedJob')
    if not handle or kernel.GetLastError() == 183:
        if handle: kernel.CloseHandle(ctypes.c_void_p(handle))
        raise RuntimeError('Another process-staged job owns the generation mutex')
    return handle


def offline_env(install):
    env = os.environ.copy()
    env.update({'PYTHONNOUSERSITE': '1', 'HF_HOME': str(install / 'models'),
        'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
        'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1', 'HF_HUB_DISABLE_TELEMETRY': '1',
        'SETUPTOOLS_USE_DISTUTILS': 'stdlib', 'OMP_NUM_THREADS': '4',
        'MKL_NUM_THREADS': '4', 'TORCHDYNAMO_DISABLE': '1',
        'PYTORCH_CUDA_ALLOC_CONF': 'garbage_collection_threshold:0.65',
        'OPENCV_IO_ENABLE_OPENEXR': '1', 'SPARSE_DEBUG': '0'})
    return env


def fresh_output(output):
    return not output.exists() or not any(output.iterdir())


def installed_to_glb_signature(install):
    """Parse the installed postprocess signature without importing Torch/CUDA."""
    source = Path(install) / 'o-voxel' / 'o_voxel' / 'postprocess.py'
    tree = ast.parse(source.read_text(encoding='utf8'), filename=str(source))
    function = next((node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'to_glb'), None)
    if function is None:
        raise ValueError('installed o_voxel postprocess lacks to_glb')
    return tuple(argument.arg for argument in (*function.args.posonlyargs, *function.args.args, *function.args.kwonlyargs))


def profile_spec(profile):
    if profile == 'full-export':
        return {'plan_profile': FULL_EXPORT_PROFILE, 'mode': 'full-export',
                'max_decoded_faces': MAX_DECODED_FACES, 'output_name': 'raw.glb'}
    if profile == 'geometry-ply-v1':
        return {'plan_profile': GEOMETRY_PLY_PROFILE, 'mode': 'geometry-ply-v1',
                'max_decoded_faces': GEOMETRY_PLY_MAX_DECODED_FACES,
                'output_name': 'raw-geometry.ply', 'allowed_input_sha256': ROOTBOUND_BUTTRESS_INPUT_SHA256}
    if profile == 'lantern-geometry-ply-v1':
        return {'plan_profile': LANTERN_GEOMETRY_PLY_PROFILE, 'mode': 'lantern-geometry-ply-v1',
                'max_decoded_faces': LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES,
                'output_name': 'raw-geometry.ply', 'allowed_input_sha256': LANTERN_LOG_INPUT_SHA256}
    if profile == 'trailgloam-geometry-ply-v1':
        return {'plan_profile': TRAILGLOAM_GEOMETRY_PLY_PROFILE, 'mode': 'trailgloam-geometry-ply-v1',
                'max_decoded_faces': TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES,
                'output_name': 'raw-geometry.ply', 'allowed_input_sha256': TRAILGLOAM_INPUT_SHA256}
    raise ValueError(f'unknown TRELLIS output profile: {profile}')


def validate_profile_input(profile, input_path):
    """Both geometry-only exceptions are fixed reviewed inputs, never generic bypasses."""
    expected=profile_spec(profile).get('allowed_input_sha256')
    if expected and input_path and sha256(input_path) != expected:
        raise ValueError(f'{profile} is restricted to its reviewed input SHA')


def profile_contract_from_plan(plan):
    """Reject a mutable plan that differs from its selected immutable profile before any child import."""
    profile_name=plan.get('profile')
    profile_arg=next((value for value in ('full-export','geometry-ply-v1','lantern-geometry-ply-v1','trailgloam-geometry-ply-v1') if profile_spec(value)['plan_profile']==profile_name),None)
    if profile_arg is None: raise ValueError('not this runner profile')
    expected=profile_spec(profile_arg); requested=plan.get('requested_run')
    if not isinstance(requested,dict): raise ValueError('runner plan lacks requested_run')
    for key in ('mode','max_decoded_faces','output_name'):
        if requested.get(key)!=expected[key]: raise ValueError(f'runner plan {key} conflicts with immutable profile contract')
    allowed=expected.get('allowed_input_sha256')
    if allowed:
        input_name=requested.get('input')
        if not input_name or requested.get('input_sha256')!=allowed: raise ValueError('geometry PLY plan lacks its reviewed input hash')
        input_path=Path(input_name).resolve()
        if not input_path.is_file() or sha256(input_path)!=allowed: raise ValueError('geometry PLY reviewed input changed before child import')
    return expected


def validate_decoded_face_limit(decoded_faces, face_limit):
    """Refuse the exact decoded boundary before any geometry-only copy/write."""
    if not isinstance(decoded_faces, int) or decoded_faces < 0:
        raise RuntimeError('Decoded mesh face count is invalid')
    if not isinstance(face_limit, int) or face_limit <= 0:
        raise RuntimeError('Decoded mesh face limit is invalid')
    if decoded_faces > face_limit:
        raise RuntimeError(f'Decoded mesh refused: {decoded_faces} faces exceed {face_limit}; no heavy simplification/remesh fallback')

def make_plan(args, metadata):
    plan = metadata.prepare(args.install_root)
    profile = profile_spec(args.profile)
    plan.update({'profile': profile['plan_profile'],
        'parent_torch_imported': False, 'process_boundary': 'one child exit per stage',
        'handoff_format': 'torch.save tensor-only dictionaries; weights_only load',
        'observed_free_gib': available_gib(),
        'requested_run': {'seed': args.seed, 'steps': args.steps, 'faces': args.faces,
            'texture_size': 1024, 'pipeline_type': '512', 'num_samples': 1,
            'export_remesh': False, 'max_decoded_faces': MAX_DECODED_FACES,
            'max_coordinates': MAX_COORDS, 'input': str(args.input) if args.input else None,
            'input_sha256': sha256(args.input) if args.input else None}})
    plan['requested_run'].update(profile)
    if profile['mode'] in GEOMETRY_PLY_MODES:
        plan['geometry_only_contract'] = {
            'version': 'trellis-' + profile['mode'],
            'allowed_input_sha256': profile['allowed_input_sha256'],
            'forbidden_operations': ['o_voxel', 'CuMesh', 'BVH', 'UV', 'bake', 'simplification', 'GLB export'],
            'ply_schema': 'binary_little_endian; float32/float64 XYZ; uchar-3 uint32[3] triangles',
        }
    plan['bootstrap_currently_fits'] = plan['observed_free_gib'] >= plan['bootstrap_required_free_gib']
    return plan


def stage_floor(plan, stage):
    return next(item['required_free_gib'] for item in plan['stages'] if item['name'] == stage)


def run_parent(args, plan):
    output, install = args.output_dir, args.install_root
    profile_contract_from_plan(plan)
    ensure_free(plan['bootstrap_required_free_gib'], 'Pre-import whole-plan check')
    handle = acquire_owned_job()
    try:
        for stage in STAGES:
            required = stage_floor(plan, stage)
            ensure_free(required, f'{stage} stage')
            append_event(output, stage + ':parent-before-child', required_free_gib=required)
            command = [str(install / 'venv/Scripts/python.exe'), str(Path(__file__).resolve()),
                       '--child-stage', stage, '--install-root', str(install), '--output-dir', str(output)]
            startup = subprocess.STARTUPINFO(); startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startup.wShowWindow = subprocess.SW_HIDE
            child = subprocess.Popen(command, cwd=str(install), env=offline_env(install), startupinfo=startup)
            # The parent only ever terminates this exact Popen child that it created.
            while child.poll() is None:
                if available_gib() < RESERVE_GIB:
                    append_event(output, stage + ':parent-reserve-breach', owned_child_pid=child.pid)
                    child.terminate(); child.wait(timeout=15)
                    raise RuntimeError('Owned child stopped after reserve breach')
                time.sleep(.5)
            if child.returncode:
                append_event(output, stage + ':child-failed', exit_code=child.returncode)
                raise RuntimeError(f'{stage} child exited {child.returncode}; preserved prior outputs')
            append_event(output, stage + ':child-exited', exit_code=0)
        target = output / plan['requested_run']['output_name']
        if not target.is_file():
            raise RuntimeError(f"decode child reported success without {target.name}")
        append_complete_event(output, target)
    finally:
        ctypes.windll.kernel32.ReleaseMutex(ctypes.c_void_p(handle))
        ctypes.windll.kernel32.CloseHandle(ctypes.c_void_p(handle))


def validate_tensor_dict(value, required, limit=MAX_COORDS):
    if not isinstance(value, dict) or set(value) != set(required):
        raise ValueError('handoff schema changed')
    for key, tensor in value.items():
        if not hasattr(tensor, 'device') or tensor.device.type != 'cpu':
            raise ValueError(f'handoff {key} is not a CPU tensor')
        if tensor.numel() > max(limit * 64, 8_000_000):
            raise ValueError(f'handoff {key} exceeds bounded size')
    if 'coords' in value:
        coords = value['coords']
        if coords.ndim != 2 or coords.shape[1] != 4 or coords.shape[0] > MAX_COORDS:
            raise ValueError('coordinate handoff shape exceeds the 512 contract')
        if coords.numel() and (coords.min().item() < 0 or coords.max().item() > 1023):
            raise ValueError('coordinate handoff is outside sparse coordinate bounds')
    if 'feats' in value and 'coords' in value and value['feats'].shape[0] != value['coords'].shape[0]:
        raise ValueError('sparse feature/coordinate rows disagree')
    return value


def child_load(torch, output, name, required):
    path = checked_child_path(output, name)
    if not path.is_file(): raise FileNotFoundError(f'missing prior runner handoff: {path.name}')
    # The path is fixed by stage, was created in this fresh run output, and this
    # refuses arbitrary pickle objects even if an unrelated writer races it.
    return validate_tensor_dict(torch.load(path, map_location='cpu', weights_only=True), required)


def child_save(torch, output, name, tensors):
    path = checked_child_path(output, name)
    if path.exists(): raise FileExistsError(f'refusing to overwrite handoff: {path.name}')
    clean = {key: value.detach().cpu().contiguous() for key, value in tensors.items()}
    validate_tensor_dict(clean, clean.keys())
    torch.save(clean, path)
    append_event(output, 'handoff:' + name, sha256=sha256(path), bytes=path.stat().st_size)


def save_rng(torch, output, name):
    """Persist generator states as CPU byte tensors, never as Python state."""
    child_save(torch, output, name, {'cpu': torch.get_rng_state().cpu(),
        'cuda': torch.cuda.get_rng_state(torch.cuda.current_device()).cpu()})


def restore_rng(torch, output, name):
    state = child_load(torch, output, name, ('cpu', 'cuda'))
    torch.set_rng_state(state['cpu'])
    torch.cuda.set_rng_state(state['cuda'], torch.cuda.current_device())


def bootstrap_child_imports(install):
    """Make installed TRELLIS imports available before any stage-specific import."""
    os.chdir(install)
    source = str(install)
    if source not in sys.path:
        sys.path.insert(0, source)


def child_pipeline(torch, plan, install, keys):
    bootstrap_child_imports(install)
    from api_spz.core.state_manage import _apply_patches; _apply_patches()
    from trellis2.pipelines import Trellis2ImageTo3DPipeline, samplers, rembg
    from trellis2.modules import image_feature_extractor
    from trellis2 import models
    config = plan['config']; kwargs = {'models': {}, 'low_vram': True, 'default_pipeline_type': '512'}
    for prefix in ('sparse_structure', 'shape_slat', 'tex_slat'):
        spec = config[prefix + '_sampler']
        kwargs[prefix + '_sampler'] = getattr(samplers, spec['name'])(**spec['args'])
        kwargs[prefix + '_sampler_params'] = spec['params']
    kwargs.update({key: config[key] for key in ('shape_slat_normalization', 'tex_slat_normalization')})
    pipeline = Trellis2ImageTo3DPipeline(**kwargs); pipeline.to(torch.device('cuda'))
    for key in keys:
        if key == 'dino':
            spec = config['image_cond_model']; pipeline.image_cond_model = getattr(image_feature_extractor, spec['name'])(**spec['args'])
        elif key == 'rembg':
            spec = config['rembg_model']; pipeline.rembg_model = getattr(rembg, spec['name'])(**spec['args'])
        else:
            pipeline.models[key] = models.from_pretrained(plan['models'][key]['prefix']).eval()
    pipeline._convert_bf16_to_fp16_if_needed()
    return pipeline


def run_child(stage, install, output):
    plan = json.loads((output / 'plan.json').read_text(encoding='utf8'))
    profile_contract_from_plan(plan)
    ensure_free(stage_floor(plan, stage), stage + ' child')
    # Texture/decode reconstruct SparseTensor before constructing their pipeline.
    # Bootstrap first so those imports work in a new interpreter.
    bootstrap_child_imports(install)
    import torch
    torch.set_num_threads(4); torch.set_num_interop_threads(4)
    if not torch.cuda.is_available(): raise RuntimeError('CUDA is required; no CPU inference fallback')
    stop = threading.Event()
    def watchdog():
        while not stop.wait(.5):
            if available_gib() < RESERVE_GIB: os._exit(77)
    threading.Thread(target=watchdog, daemon=True).start()
    try:
        append_event(output, stage + ':child-start', pid=os.getpid())
        with torch.inference_mode():
            if stage == 'background':
                from PIL import Image
                pipe = child_pipeline(torch, plan, install, ('rembg',))
                raw_input = Path(plan['requested_run']['input']).resolve()
                if not raw_input.is_file() or sha256(raw_input) != plan['requested_run']['input_sha256']:
                    raise RuntimeError('reviewed input changed after preparation')
                image = pipe.preprocess_image(Image.open(raw_input).convert('RGBA'))
                target = checked_child_path(output, 'preprocessed.png'); image.save(target)
                append_event(output, stage + ':complete', output_sha256=sha256(target))
            elif stage == 'conditioning':
                from PIL import Image
                pipe = child_pipeline(torch, plan, install, ('dino',))
                image = Image.open(checked_child_path(output, 'preprocessed.png')).convert('RGBA')
                pipe.image_cond_model.to(pipe.device); cond = pipe._cast_cond(pipe.get_cond([image], 512))
                child_save(torch, output, 'conditioning.pt', cond)
            elif stage == 'sparse':
                pipe = child_pipeline(torch, plan, install, ('sparse_structure_flow_model', 'sparse_structure_decoder'))
                cond = child_load(torch, output, 'conditioning.pt', ('cond', 'neg_cond'))
                torch.manual_seed(plan['requested_run']['seed'])
                coords = pipe.sample_sparse_structure({k: v.to(pipe.device) for k, v in cond.items()}, 32, 1, {'steps': plan['requested_run']['steps']})
                if coords.shape[0] > MAX_COORDS: raise RuntimeError(f'512 coordinate ceiling exceeded: {coords.shape[0]}')
                child_save(torch, output, 'coords.pt', {'coords': coords})
                save_rng(torch, output, 'rng-after-sparse.pt')
            elif stage == 'shape-flow':
                pipe = child_pipeline(torch, plan, install, ('shape_slat_flow_model_512',))
                cond = child_load(torch, output, 'conditioning.pt', ('cond', 'neg_cond'))
                coords = child_load(torch, output, 'coords.pt', ('coords',))['coords']
                restore_rng(torch, output, 'rng-after-sparse.pt')
                flow = pipe.models['shape_slat_flow_model_512']
                shape = pipe.sample_shape_slat({k: v.to(pipe.device) for k, v in cond.items()}, flow, coords.to(pipe.device), {'steps': plan['requested_run']['steps']})
                child_save(torch, output, 'shape.pt', {'feats': shape.feats, 'coords': shape.coords})
                save_rng(torch, output, 'rng-after-shape.pt')
            elif stage == 'texture-flow':
                from trellis2.modules.sparse import SparseTensor
                pipe = child_pipeline(torch, plan, install, ('tex_slat_flow_model_512',))
                cond = child_load(torch, output, 'conditioning.pt', ('cond', 'neg_cond'))
                shape = child_load(torch, output, 'shape.pt', ('feats', 'coords'))
                shape = SparseTensor(shape['feats'].to(pipe.device), shape['coords'].to(pipe.device))
                restore_rng(torch, output, 'rng-after-shape.pt')
                texture = pipe.sample_tex_slat({k: v.to(pipe.device) for k, v in cond.items()}, pipe.models['tex_slat_flow_model_512'], shape, {'steps': plan['requested_run']['steps']})
                child_save(torch, output, 'texture.pt', {'feats': texture.feats, 'coords': texture.coords})
            else:
                from trellis2.modules.sparse import SparseTensor
                pipe = child_pipeline(torch, plan, install, ('shape_slat_decoder', 'tex_slat_decoder'))
                shape = child_load(torch, output, 'shape.pt', ('feats', 'coords')); texture = child_load(torch, output, 'texture.pt', ('feats', 'coords'))
                shape, texture = SparseTensor(shape['feats'].to(pipe.device), shape['coords'].to(pipe.device)), SparseTensor(texture['feats'].to(pipe.device), texture['coords'].to(pipe.device))
                mesh = pipe.decode_latent(shape, texture, 512)[0]
                face_limit = plan['requested_run']['max_decoded_faces']
                faces = int(mesh.faces.shape[0]); append_event(output, 'decode:geometry-budget', decoded_faces=faces, decoded_vertices=int(mesh.vertices.shape[0]), face_limit=face_limit, mode=plan['requested_run']['mode'])
                validate_decoded_face_limit(faces, face_limit)
                if plan['requested_run']['mode'] in GEOMETRY_PLY_MODES:
                    # Geometry-only receipt: copy exact CPU XYZ/triangles to PLY.
                    # This branch intentionally never imports o_voxel or touches
                    # attrs/coords/UV/bake/BVH/CuMesh/simplification code.
                    from trellis_geometry_ply import write_binary_ply
                    raw_input = Path(plan['requested_run']['input']).resolve()
                    verified_input_sha256 = sha256(raw_input)
                    if verified_input_sha256 != plan['requested_run']['input_sha256']:
                        raise RuntimeError('reviewed input changed before geometry-only copy')
                    source_vertex_dtype = str(mesh.vertices.dtype).replace('torch.', '')
                    source_vertex_device = str(mesh.vertices.device)
                    source_vertex_bytes = int(mesh.vertices.numel() * mesh.vertices.element_size())
                    source_index_dtype = str(mesh.faces.dtype).replace('torch.', '')
                    source_index_device = str(mesh.faces.device)
                    source_index_bytes = int(mesh.faces.numel() * mesh.faces.element_size())
                    vertices = mesh.vertices.detach().cpu().contiguous()
                    indices = mesh.faces.detach().cpu().contiguous()
                    source_dtype = str(vertices.dtype).replace('torch.', '')
                    if vertices.dtype in (torch.float32, torch.float64):
                        precision_action = 'exact-contiguous-CPU-copy'
                    else:
                        raise RuntimeError(f'geometry PLY refuses unsupported vertex dtype {vertices.dtype}; float16 is not precision-preserving')
                    if vertices.ndim != 2 or vertices.shape[1] != 3 or not torch.isfinite(vertices).all().item():
                        raise RuntimeError('geometry PLY refuses non-finite/non-XYZ vertex positions')
                    if indices.ndim != 2 or indices.shape[1] != 3 or indices.dtype.is_floating_point:
                        raise RuntimeError('geometry PLY refuses non-triangle/non-integer indices')
                    indices = indices.to(torch.int64)
                    cpu_index_dtype = str(indices.dtype).replace('torch.', '')
                    copied_vertex_bytes = int(vertices.numel() * vertices.element_size())
                    copied_index_bytes = int(indices.numel() * indices.element_size())
                    if indices.numel() and (indices.min().item() < 0 or indices.max().item() >= vertices.shape[0]):
                        raise RuntimeError('geometry PLY index range exceeds copied positions')
                    scalar = 'float32' if vertices.dtype == torch.float32 else 'float64'
                    target = output / plan['requested_run']['output_name']
                    receipt = write_binary_ply(target, vertex_bytes=vertices.numpy().tobytes(order='C'),
                        vertex_count=int(vertices.shape[0]), scalar=scalar, triangles=indices.numpy(),
                        comments=(plan['profile'], 'geometry-only; no o_voxel/CuMesh/BVH/UV/bake/simplification',
                                  f'source_vertex_dtype={source_dtype}', f'precision_action={precision_action}'))
                    receipt.update({'profile': plan['profile'], 'mode': plan['requested_run']['mode'],
                        'input_sha256_verified': verified_input_sha256,
                        'source_vertex_dtype': source_vertex_dtype, 'source_vertex_device': source_vertex_device,
                        'source_vertex_bytes_before_copy': source_vertex_bytes,
                        'copied_vertex_dtype': source_dtype, 'copied_vertex_bytes_before_serialization': copied_vertex_bytes,
                        'precision_action': precision_action,
                        'source_index_dtype': source_index_dtype, 'source_index_device': source_index_device,
                        'source_index_bytes_before_copy': source_index_bytes,
                        'cpu_index_dtype': cpu_index_dtype, 'copied_index_bytes_before_serialization': copied_index_bytes,
                        'decoded_faces': faces, 'decoded_vertices': int(mesh.vertices.shape[0]),
                        'face_limit': face_limit, 'operations_not_invoked': plan['geometry_only_contract']['forbidden_operations']})
                    write_json(output / 'geometry-ply-receipt.json', receipt)
                    append_event(output, 'geometry-ply:complete', output_sha256=receipt['sha256'],
                                 bytes=receipt['bytes'], vertex_scalar=scalar,
                                 copied_vertex_bytes=copied_vertex_bytes, copied_index_bytes=copied_index_bytes)
                    return
                # Keep the existing staged runner's post-decode export floor.
                # Decoder work may have reduced available RAM since the decode
                # stage entry check; do not begin clean/UV/bake work below it.
                mesh.attrs = mesh.attrs.cpu(); mesh.coords = mesh.coords.cpu()
                import gc; gc.collect(); torch.cuda.empty_cache()
                ensure_free(RESERVE_GIB + WORKSPACE_GIB, 'Export workspace')
                append_event(output, 'export:before', required_free_gib=RESERVE_GIB + WORKSPACE_GIB)
                import o_voxel
                glb = o_voxel.postprocess.to_glb(vertices=mesh.vertices, faces=mesh.faces, attr_volume=mesh.attrs.cpu(), coords=mesh.coords.cpu(), attr_layout=mesh.layout, voxel_size=mesh.voxel_size, aabb=[[-.5, -.5, -.5], [.5, .5, .5]], decimation_target=plan['requested_run']['faces'], texture_size=1024, remesh=False, verbose=True)
                target = output / 'raw.glb'; glb.export(str(target)); append_event(output, stage + ':complete', output_sha256=sha256(target))
    finally:
        stop.set()


def run_import_smoke(install):
    """No-model, no-CUDA smoke for the fresh child interpreter import order."""
    bootstrap_child_imports(install)
    from trellis2.modules.sparse import SparseTensor
    print(json.dumps({'import_smoke': 'pass', 'cwd': os.getcwd(),
        'sparse_tensor_module': SparseTensor.__module__}), flush=True)


def run_import_smoke_parent(install):
    """Use the real isolated interpreter/cwd/env without loading a model."""
    command = [str(install / 'venv/Scripts/python.exe'), str(Path(__file__).resolve()),
        '--child-import-smoke', '--install-root', str(install)]
    result = subprocess.run(command, cwd=str(install), env=offline_env(install),
                            text=True, capture_output=True)
    if result.stdout: print(result.stdout, end='')
    if result.returncode:
        if result.stderr: print(result.stderr, file=sys.stderr, end='')
        raise RuntimeError(f'import-only child smoke exited {result.returncode}')


class ProtocolTests(unittest.TestCase):
    def test_handoff_path_rejects_escape(self):
        with tempfile.TemporaryDirectory() as raw:
            with self.assertRaises(ValueError): checked_child_path(Path(raw), '../outside.pt')
    def test_fresh_output_requires_empty_directory(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw); self.assertTrue(fresh_output(root))
            (root / 'old').write_text('x'); self.assertFalse(fresh_output(root))
    def test_tensor_schema_requires_exact_keys(self):
        self.assertRaises(ValueError, validate_tensor_dict, {}, ('coords',))
    def test_import_smoke_uses_child_bootstrap(self):
        self.assertIn('bootstrap_child_imports', run_import_smoke.__code__.co_names)
    def test_full_export_keywords_match_installed_to_glb_signature_without_import(self):
        install=Path('C:/Users/cwood/Tools/trellis2-stableprojectorz/code')
        parameters=installed_to_glb_signature(install)
        self.assertIn('attr_layout',parameters)
        self.assertNotIn('layout',parameters)
        tree=ast.parse(Path(__file__).read_text(encoding='utf8'))
        calls=[node for node in ast.walk(tree) if isinstance(node,ast.Call)
               and isinstance(node.func,ast.Attribute) and node.func.attr=='to_glb']
        self.assertEqual(len(calls),1)
        keywords={keyword.arg for keyword in calls[0].keywords}
        self.assertIn('attr_layout',keywords)
        self.assertNotIn('layout',keywords)
        self.assertIn('remesh',keywords)
        self.assertEqual(next(keyword.value.value for keyword in calls[0].keywords
                              if keyword.arg=='remesh' and isinstance(keyword.value,ast.Constant)),False)
        self.assertTrue(keywords.issubset(set(parameters)))

    def test_geometry_profile_does_not_relax_full_export(self):
        full = profile_spec('full-export')
        geometry = profile_spec('geometry-ply-v1')
        self.assertEqual(full['plan_profile'], FULL_EXPORT_PROFILE)
        self.assertEqual(full['max_decoded_faces'], MAX_DECODED_FACES)
        self.assertEqual(full['output_name'], 'raw.glb')
        self.assertEqual(geometry['plan_profile'], GEOMETRY_PLY_PROFILE)
        self.assertEqual(geometry['max_decoded_faces'], GEOMETRY_PLY_MAX_DECODED_FACES)
        self.assertEqual(geometry['output_name'], 'raw-geometry.ply')
    def test_geometry_profile_rejects_unreviewed_input(self):
        with tempfile.TemporaryDirectory() as raw:
            image = Path(raw) / 'other.png'; image.write_bytes(b'not-reviewed')
            with self.assertRaises(ValueError): validate_profile_input('geometry-ply-v1', image)
    def test_profile_contract_rejects_mutated_decode_cap_before_import(self):
        spec = profile_spec('full-export')
        plan = {'profile': spec['plan_profile'], 'requested_run': dict(spec)}
        self.assertEqual(profile_contract_from_plan(plan), spec)
        plan['requested_run']['max_decoded_faces'] = GEOMETRY_PLY_MAX_DECODED_FACES
        with self.assertRaises(ValueError): profile_contract_from_plan(plan)
    def test_lantern_geometry_profile_is_exact_and_leaves_existing_caps_unchanged(self):
        full=profile_spec('full-export'); tree=profile_spec('geometry-ply-v1'); lantern=profile_spec('lantern-geometry-ply-v1')
        self.assertEqual(full['max_decoded_faces'],750000)
        self.assertEqual(tree['max_decoded_faces'],1100000)
        self.assertEqual(tree['allowed_input_sha256'],ROOTBOUND_BUTTRESS_INPUT_SHA256)
        self.assertEqual(lantern['max_decoded_faces'],2300000)
        self.assertEqual(lantern['allowed_input_sha256'],LANTERN_LOG_INPUT_SHA256)
        self.assertEqual(lantern['output_name'],'raw-geometry.ply')

    def test_lantern_geometry_profile_rejects_other_input_and_plan_mutation(self):
        image=Path(__file__).resolve().parents[2]/'art/targets/rootbound-wildwood/constituents/lantern-log/reference-v2.png'
        self.assertTrue(image.is_file()); self.assertEqual(sha256(image),LANTERN_LOG_INPUT_SHA256)
        validate_profile_input('lantern-geometry-ply-v1',image)
        with tempfile.TemporaryDirectory() as raw:
            other=Path(raw)/'other.png'; other.write_bytes(b'not-the-reviewed-lantern')
            with self.assertRaises(ValueError): validate_profile_input('lantern-geometry-ply-v1',other)
        spec=profile_spec('lantern-geometry-ply-v1')
        plan={'profile':spec['plan_profile'],'requested_run':dict(spec)}
        plan['requested_run'].update({'input':str(image.resolve()),'input_sha256':LANTERN_LOG_INPUT_SHA256})
        self.assertEqual(profile_contract_from_plan(plan),spec)
        for key, replacement in (
            ('max_decoded_faces',2300001),
            ('mode','geometry-ply-v1'),
            ('output_name','raw.glb'),
        ):
            mutated={'profile':plan['profile'],'requested_run':dict(plan['requested_run'])}
            mutated['requested_run'][key]=replacement
            with self.assertRaises(ValueError): profile_contract_from_plan(mutated)
        mutated={'profile':FULL_EXPORT_PROFILE,'requested_run':dict(plan['requested_run'])}
        with self.assertRaises(ValueError): profile_contract_from_plan(mutated)

    def test_lantern_contract_rejects_input_tampered_after_plan(self):
        image=Path(__file__).resolve().parents[2]/'art/targets/rootbound-wildwood/constituents/lantern-log/reference-v2.png'
        spec=profile_spec('lantern-geometry-ply-v1')
        plan={'profile':spec['plan_profile'],'requested_run':dict(spec)}
        with tempfile.TemporaryDirectory() as raw:
            copied=Path(raw)/'reference-v2.png'; copied.write_bytes(image.read_bytes())
            plan['requested_run'].update({'input':str(copied),'input_sha256':LANTERN_LOG_INPUT_SHA256})
            self.assertEqual(profile_contract_from_plan(plan),spec)
            copied.write_bytes(b'tampered-after-plan')
            with self.assertRaises(ValueError): profile_contract_from_plan(plan)

    def test_trailgloam_geometry_profile_is_exact_and_preserves_other_caps(self):
        full=profile_spec('full-export'); trail=profile_spec('trailgloam-geometry-ply-v1')
        self.assertEqual(full['max_decoded_faces'],MAX_DECODED_FACES)
        self.assertEqual(profile_spec('geometry-ply-v1')['max_decoded_faces'],GEOMETRY_PLY_MAX_DECODED_FACES)
        self.assertEqual(profile_spec('lantern-geometry-ply-v1')['max_decoded_faces'],LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES)
        self.assertEqual(trail['plan_profile'],TRAILGLOAM_GEOMETRY_PLY_PROFILE)
        self.assertEqual(trail['mode'],'trailgloam-geometry-ply-v1')
        self.assertEqual(trail['max_decoded_faces'],TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES)
        self.assertEqual(trail['allowed_input_sha256'],TRAILGLOAM_INPUT_SHA256)
        self.assertEqual(trail['output_name'],'raw-geometry.ply')

    def test_trailgloam_geometry_profile_rejects_changed_input_and_mutated_contract(self):
        image=Path(__file__).resolve().parents[2]/'art/source/trailgloam-v1/rotation-1-reference/target-v2.png'
        self.assertTrue(image.is_file()); self.assertEqual(sha256(image),TRAILGLOAM_INPUT_SHA256)
        validate_profile_input('trailgloam-geometry-ply-v1',image)
        with tempfile.TemporaryDirectory() as raw:
            other=Path(raw)/'other.png'; other.write_bytes(b'changed-input')
            with self.assertRaises(ValueError): validate_profile_input('trailgloam-geometry-ply-v1',other)
        spec=profile_spec('trailgloam-geometry-ply-v1')
        plan={'profile':spec['plan_profile'],'requested_run':dict(spec)}
        plan['requested_run'].update({'input':str(image.resolve()),'input_sha256':TRAILGLOAM_INPUT_SHA256})
        self.assertEqual(profile_contract_from_plan(plan),spec)
        for key,replacement in (('max_decoded_faces',1_900_001),('mode','full-export'),('output_name','raw.glb')):
            mutated={'profile':plan['profile'],'requested_run':dict(plan['requested_run'])}
            mutated['requested_run'][key]=replacement
            with self.assertRaises(ValueError): profile_contract_from_plan(mutated)
        with tempfile.TemporaryDirectory() as raw:
            copied=Path(raw)/'target-v2.png'; copied.write_bytes(image.read_bytes())
            plan['requested_run'].update({'input':str(copied),'input_sha256':TRAILGLOAM_INPUT_SHA256})
            self.assertEqual(profile_contract_from_plan(plan),spec)
            copied.write_bytes(b'tampered-after-plan')
            with self.assertRaises(ValueError): profile_contract_from_plan(plan)

    def test_trailgloam_face_limit_boundary(self):
        validate_decoded_face_limit(TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES,TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES)
        with self.assertRaises(RuntimeError):
            validate_decoded_face_limit(TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES+1,TRAILGLOAM_GEOMETRY_PLY_MAX_DECODED_FACES)

    def test_decoded_face_limit_boundary_refuses_before_serialization(self):
        validate_decoded_face_limit(LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES, LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES)
        with self.assertRaises(RuntimeError):
            validate_decoded_face_limit(LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES + 1, LANTERN_GEOMETRY_PLY_MAX_DECODED_FACES)

    def test_both_geometry_profiles_branch_before_heavy_export(self):
        source=inspect.getsource(run_child)
        self.assertIn("in GEOMETRY_PLY_MODES",source)
        self.assertLess(source.index("in GEOMETRY_PLY_MODES"),source.index('import o_voxel'))
        self.assertIn("operations_not_invoked",source)
        self.assertIn("input_sha256_verified",source)
        self.assertIn("source_vertex_device",source)
        self.assertIn("copied_index_bytes_before_serialization",source)

    def test_binary_ply_round_trip_preserves_precision_and_indices(self):
        from trellis_geometry_ply import write_binary_ply, validate_binary_ply
        vertices = struct.pack('<fffffffff', .125, -.25, 1.5, 3.25, 4.5, -5.75, 6.0, 7.125, 8.25)
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / 'geometry.ply'
            receipt = write_binary_ply(path, vertex_bytes=vertices, vertex_count=3,
                scalar='float32', triangles=[(0, 1, 2)], comments=('self-test',))
            reread = validate_binary_ply(path, expected_vertex_count=3,
                expected_face_count=1, expected_scalar='float32')
            self.assertEqual(receipt['sha256'], reread['sha256'])
            self.assertEqual(receipt['copied_vertex_bytes'], len(vertices))
            self.assertEqual(receipt['actual_bytes'], receipt['expected_bytes'])
            self.assertEqual(receipt['actual_min_index'], 0)
            self.assertEqual(receipt['actual_max_index'], 2)
            self.assertEqual(receipt['position_payload_sha256'], hashlib.sha256(vertices).hexdigest())
    def test_binary_ply_rejects_nonfinite_and_index_escape(self):
        from trellis_geometry_ply import PlyError, write_binary_ply
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with self.assertRaises(PlyError):
                write_binary_ply(root / 'nonfinite.ply', vertex_bytes=struct.pack('<fff', float('nan'), 0, 0),
                    vertex_count=1, scalar='float32', triangles=[])
            with self.assertRaises(PlyError):
                write_binary_ply(root / 'index.ply', vertex_bytes=struct.pack('<fffffffff', 0, 0, 0, 1, 0, 0, 0, 1, 0),
                    vertex_count=3, scalar='float32', triangles=[(0, 1, 3)])
    def test_binary_ply_refuses_float16_schema(self):
        from trellis_geometry_ply import PlyError, write_binary_ply
        with tempfile.TemporaryDirectory() as raw:
            with self.assertRaises(PlyError):
                write_binary_ply(Path(raw) / 'half.ply', vertex_bytes=b'', vertex_count=0,
                    scalar='float16', triangles=[])
    def test_binary_ply_preserves_float64_schema(self):
        from trellis_geometry_ply import write_binary_ply
        vertices = struct.pack('<ddddddddd', .1250000000001, -.25, 1.5, 3.25, 4.5, -5.75, 6.0, 7.125, 8.25)
        with tempfile.TemporaryDirectory() as raw:
            receipt = write_binary_ply(Path(raw) / 'double.ply', vertex_bytes=vertices, vertex_count=3,
                scalar='float64', triangles=[(2, 1, 0)])
            self.assertEqual(receipt['scalar'], 'float64')
            self.assertEqual(receipt['copied_vertex_bytes'], len(vertices))
    def test_complete_event_uses_artifact_path_without_argument_collision(self):
        with tempfile.TemporaryDirectory() as raw:
            output = Path(raw); target = output / 'raw-geometry.ply'
            target.write_bytes(b'geometry-only-receipt')
            append_complete_event(output, target)
            event = json.loads((output / 'events.json').read_text(encoding='utf8'))[-1]
            self.assertEqual(event['label'], 'complete')
            self.assertEqual(event['artifact_path'], str(target))
            self.assertEqual(event['output_sha256'], sha256(target))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install-root', type=Path, default=Path('C:/Users/cwood/Tools/trellis2-stableprojectorz/code'))
    parser.add_argument('--output-dir', type=Path, default=Path('.dream-loop/trellis-process-staged-study'))
    mode = parser.add_mutually_exclusive_group(); mode.add_argument('--prepare-only', action='store_true'); mode.add_argument('--run', action='store_true'); mode.add_argument('--import-smoke', action='store_true')
    parser.add_argument('--input', type=Path); parser.add_argument('--seed', type=int, default=1234); parser.add_argument('--steps', type=int, default=12, choices=range(1, 13)); parser.add_argument('--faces', type=int, default=30000); parser.add_argument('--profile', choices=('full-export', 'geometry-ply-v1', 'lantern-geometry-ply-v1', 'trailgloam-geometry-ply-v1'), default='full-export'); parser.add_argument('--child-stage', choices=STAGES); parser.add_argument('--child-import-smoke', action='store_true'); parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        result = unittest.main(argv=[sys.argv[0]], exit=False)
        if not result.result.wasSuccessful(): raise SystemExit(1)
        return
    args.install_root, args.output_dir = args.install_root.resolve(), args.output_dir.resolve()
    if args.child_import_smoke: run_import_smoke(args.install_root); return
    if args.import_smoke: run_import_smoke_parent(args.install_root); return
    if args.child_stage: run_child(args.child_stage, args.install_root, args.output_dir); return
    if not 10000 <= args.faces <= 30000: parser.error('--faces must be between10000 and30000')
    if args.input: args.input = args.input.resolve()
    if args.run and (args.input is None or not args.input.is_file()): parser.error('--run needs an existing reviewed --input image')
    try: validate_profile_input(args.profile, args.input)
    except ValueError as error: parser.error(f'--profile {error}')
    if args.run and not fresh_output(args.output_dir): parser.error('--run needs a new empty output directory')
    metadata = load_metadata_helper(); plan = make_plan(args, metadata)
    args.output_dir.mkdir(parents=True, exist_ok=True); write_json(args.output_dir / 'plan.json', plan)
    print(json.dumps({key: plan[key] for key in ('profile', 'observed_free_gib', 'bootstrap_required_free_gib', 'bootstrap_currently_fits')}), flush=True)
    if args.run: run_parent(args, plan)


if __name__ == '__main__': main()
