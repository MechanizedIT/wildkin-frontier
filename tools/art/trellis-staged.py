"""Isolated, one-image TRELLIS 512 experiment; prepare is the safe default.

Preparation reads JSON and safetensors headers only. It never imports Torch.
The installed environment and existing Full/Small512 launchers are untouched.
Runtime reuses installed numerical methods with real stage-scoped modules.
"""
import argparse
from contextlib import contextmanager
import ctypes
from datetime import datetime, timezone
import gc
import hashlib
import json
import math
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import threading
import time

REPO = 'microsoft/TRELLIS.2-4B'
RESERVE_GIB = 6.0
WORKSPACE_GIB = 2.0
IMPORT_GIB = 1.0
MAX_DECODED_FACES = 750000
EXPECTED = (
    'sparse_structure_decoder', 'sparse_structure_flow_model',
    'shape_slat_decoder', 'shape_slat_flow_model_512',
    'tex_slat_decoder', 'tex_slat_flow_model_512',
)
EXCLUDED = {'shape_slat_flow_model_1024', 'tex_slat_flow_model_1024'}
GROUPS = (
    ('background', ('rembg',)), ('conditioning', ('dino',)),
    ('sparse', ('sparse_structure_flow_model', 'sparse_structure_decoder')),
    ('shape-flow', ('shape_slat_flow_model_512',)),
    ('texture-flow', ('tex_slat_flow_model_512',)),
    ('decode', ('shape_slat_decoder', 'tex_slat_decoder')),
)


def available_gib():
    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (key, ctypes.c_ulonglong) for key in
            ('total', 'available', 'page_total', 'page_available', 'virtual_total', 'virtual_available', 'extended')]
    status = Status()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise OSError('Cannot measure available physical RAM')
    return status.available / 2**30


def snapshot(cache, repo):
    folder = cache / ('models--' + repo.replace('/', '--'))
    revision = (folder / 'refs/main').read_text(encoding='utf8').strip()
    target = folder / 'snapshots' / revision
    if not target.is_dir():
        raise FileNotFoundError(target)
    return target


def weight_metadata(path):
    """Read bounded safetensors metadata, never tensor payloads or Torch."""
    with path.open('rb') as stream:
        size_data = stream.read(8)
        if len(size_data) != 8:
            raise ValueError(f'Truncated safetensors header: {path}')
        size = struct.unpack('<Q', size_data)[0]
        if not 2 <= size <= 16 * 1024**2:
            raise ValueError(f'Unexpected safetensors header size: {path}')
        header_bytes = stream.read(size)
        header = json.loads(header_bytes)
    dtypes, parameters = {}, 0
    for key, tensor in header.items():
        if key == '__metadata__':
            continue
        start, end = tensor['data_offsets']
        if not 0 <= start <= end <= path.stat().st_size - size - 8:
            raise ValueError(f'Invalid tensor offsets: {path}:{key}')
        parameters += math.prod(tensor['shape'])
        dtypes[tensor['dtype']] = dtypes.get(tensor['dtype'], 0) + end - start
    return {'path': str(path), 'file_bytes': path.stat().st_size,
            'header_sha256': hashlib.sha256(header_bytes).hexdigest(),
            'tensor_bytes': sum(dtypes.values()), 'bytes_by_dtype': dtypes,
            'fp32_constructor_bytes': parameters * 4}


def prepare(install):
    cached = snapshot(install / 'models/hub', REPO)
    source = cached / 'pipeline.json'
    config = json.loads(source.read_text(encoding='utf8'))['args']
    if set(config['models']) != set(EXPECTED) | EXCLUDED:
        raise ValueError('Installed model-key schema changed; review required')
    models = {}
    for key in EXPECTED:
        value = config['models'][key]
        if value.startswith('ckpts/'):
            prefix = cached / value
        else:
            parts = value.split('/')
            prefix = snapshot(install / 'models/hub', '/'.join(parts[:2])) / '/'.join(parts[2:])
        model_config = json.loads(Path(str(prefix) + '.json').read_text(encoding='utf8'))
        models[key] = {**weight_metadata(Path(str(prefix) + '.safetensors')),
                       'prefix': str(prefix), 'model_class': model_config['name'],
                       'config_sha256': hashlib.sha256(Path(str(prefix) + '.json').read_bytes()).hexdigest()}
    for key, folder in [('dino', 'dinov3'), ('rembg', 'RMBG-2.0')]:
        local = install / 'MODELS' / folder
        # The installed wrappers choose these exact local folders.
        json.loads((local / 'config.json').read_text(encoding='utf8'))
        models[key] = {**weight_metadata(local / 'model.safetensors'), 'local_folder': str(local)}
    stages = []
    for name, keys in GROUPS:
        # Deliberately conservative: simultaneous full-FP32 constructors plus
        # all group's checkpoint bytes, despite sequential mixed-dtype loads.
        constructors = sum(models[k]['fp32_constructor_bytes'] for k in keys) / 2**30
        checkpoints = sum(models[k]['file_bytes'] for k in keys) / 2**30
        stages.append({'name': name, 'keys': list(keys), 'constructor_gib': constructors,
                       'checkpoint_gib': checkpoints, 'workspace_gib': WORKSPACE_GIB,
                       'estimated_increment_gib': constructors + checkpoints + WORKSPACE_GIB,
                       'required_free_gib': constructors + checkpoints + WORKSPACE_GIB + RESERVE_GIB})
    source_files = ['trellis2/pipelines/trellis2_image_to_3d.py', 'trellis2/models/__init__.py',
                    'trellis2/modules/utils.py', 'api_spz/core/state_manage.py']
    return {'profile': 'stage-scoped-512-experiment', 'installed_config': str(source),
            'config_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'installed_source_sha256': {p: hashlib.sha256((install / p).read_bytes()).hexdigest() for p in source_files},
            'models': models, 'stages': stages, 'reserve_gib': RESERVE_GIB,
            'bootstrap_required_free_gib': max(s['required_free_gib'] for s in stages) + IMPORT_GIB,
            'notes': ['Metadata-only estimates, not measured peak memory or generation proof.',
                      'Existing Small51218GiB startup/6GiB reserve settings remain untouched.',
                      'This distinct runner checks actual free RAM before import and every stage.',
                      '512 one-image only; real stage modules released after numerical methods return.',
                      'Decode keeps two small decoders together to preserve installed internal references.',
                      'Export uses clean/simplify without voxel remeshing; quality/topology may differ from earlier remeshed assets.',
                      f'Decoded meshes above {MAX_DECODED_FACES} faces are refused before export, never pre-simplified from millions.',
                      'This count guard cannot bound the decoder peak before its result exists; RAM watchdog and external GPU headroom review remain required.',
                      'Earlier 512 trial export inputs contain roughly 1.9M faces (possibly already pre-simplified); this stricter experiment may explicitly refuse them.'],
            'config': config}


def ensure_free(required, label):
    free = available_gib()
    if free < required:
        raise RuntimeError(f'{label} refused: {free:.2f}GiB free, {required:.2f}GiB required including {RESERVE_GIB:.0f}GiB reserve')
    return free


def acquire_owned_job():
    """No process is stopped. Refuse competing local TRELLIS services/jobs."""
    with socket.socket() as sock:
        sock.settimeout(.2)
        if sock.connect_ex(('127.0.0.1', 7960)) == 0:
            raise RuntimeError('TRELLIS API port7960 is occupied; coordinate the existing job first')
    command = "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -match 'trellis-staged\\.py|trellis-small-profile\\.py|api_spz[/\\\\]main_api\\.py' } | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"
    raw = subprocess.run(['powershell', '-NoProfile', '-Command', command], check=True, capture_output=True, text=True).stdout.strip()
    processes = json.loads(raw) if raw else []
    if isinstance(processes, dict):
        processes = [processes]
    if any(p['ProcessId'] not in {os.getpid(), os.getppid()} for p in processes):
        raise RuntimeError('Another local TRELLIS Python process exists; no parallel job allowed')
    kernel = ctypes.windll.kernel32
    kernel.CreateMutexW.restype = ctypes.c_void_p
    handle = kernel.CreateMutexW(None, True, 'Local\\WildkinTrellisStagedJob')
    if not handle or kernel.GetLastError() == 183:
        if handle:
            kernel.CloseHandle(ctypes.c_void_p(handle))
        raise RuntimeError('Another staged job owns the generation mutex')
    return handle


def run_one(args, install, output, plan):
    ensure_free(plan['bootstrap_required_free_gib'], 'Pre-import whole-plan check')
    if any(p.name not in {'plan.json'} for p in output.iterdir()):
        raise ValueError('Use a new output directory; existing generation artifacts are never overwritten')
    handle = acquire_owned_job()
    stop = threading.Event()
    def watchdog():
        while not stop.wait(.5):
            try:
                free = available_gib()
            except Exception as error:
                print(f'[RAM GUARD] Measurement failed; stopping owned process: {error}', flush=True)
                os._exit(77)
            if free < RESERVE_GIB:
                print(f'[RAM GUARD] Stopping owned staged process: {free:.2f}GiB free', flush=True)
                os._exit(77)
    threading.Thread(target=watchdog, daemon=True).start()
    for key, value in {'PYTHONNOUSERSITE': '1', 'HF_HOME': str(install / 'models'),
                       'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
                       'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1', 'HF_HUB_DISABLE_TELEMETRY': '1',
                       'SETUPTOOLS_USE_DISTUTILS': 'stdlib', 'OMP_NUM_THREADS': '4', 'MKL_NUM_THREADS': '4',
                       'TORCHDYNAMO_DISABLE': '1', 'PYTORCH_CUDA_ALLOC_CONF': 'garbage_collection_threshold:0.65',
                       'OPENCV_IO_ENABLE_OPENEXR': '1', 'SPARSE_DEBUG': '0'}.items():
        os.environ[key] = value
    os.chdir(install)
    sys.path.insert(0, str(install))
    events = []
    def record(label, **values):
        item = {'label': label, 'time': datetime.now(timezone.utc).isoformat(), 'free_gib': available_gib(), **values}
        events.append(item)
        (output / 'events.json').write_text(json.dumps(events, indent=2), encoding='utf8')
        print(json.dumps(item), flush=True)
    try:
        import torch
        torch.set_num_threads(4)
        torch.set_num_interop_threads(4)
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA is required; no CPU inference fallback')
        # Apply the same local compatibility patches BEFORE importing pipeline.
        from api_spz.core.state_manage import _apply_patches
        _apply_patches()
        from trellis2.pipelines import Trellis2ImageTo3DPipeline
        from trellis2.pipelines import samplers, rembg
        from trellis2.modules import image_feature_extractor
        from trellis2 import models
        from PIL import Image
        config = plan['config']
        kwargs = {'models': {}, 'low_vram': True, 'default_pipeline_type': '512'}
        for prefix in ['sparse_structure', 'shape_slat', 'tex_slat']:
            spec = config[prefix + '_sampler']
            kwargs[prefix + '_sampler'] = getattr(samplers, spec['name'])(**spec['args'])
            kwargs[prefix + '_sampler_params'] = spec['params']
        kwargs.update({key: config[key] for key in ['shape_slat_normalization', 'tex_slat_normalization']})
        pipeline = Trellis2ImageTo3DPipeline(**kwargs)
        pipeline.to(torch.device('cuda'))
        record('empty-pipeline-ready', resident_model_keys=list(pipeline.models))
        stages = {s['name']: s for s in plan['stages']}

        @contextmanager
        def stage(name):
            spec = stages[name]
            ensure_free(spec['required_free_gib'], f'{name} stage')
            if pipeline.models or pipeline.image_cond_model is not None or pipeline.rembg_model is not None:
                raise RuntimeError('Previous stage retained a model')
            record(name + ':before-load', estimate=spec)
            try:
                # Loading constructors consumes RNG. Preserve sampler seed/state
                # across those loads so staging does not alter inference noise.
                with torch.random.fork_rng(devices=[torch.cuda.current_device()]):
                    for key in spec['keys']:
                        if key == 'dino':
                            spec_aux = config['image_cond_model']
                            pipeline.image_cond_model = getattr(image_feature_extractor, spec_aux['name'])(**spec_aux['args'])
                        elif key == 'rembg':
                            spec_aux = config['rembg_model']
                            pipeline.rembg_model = getattr(rembg, spec_aux['name'])(**spec_aux['args'])
                        else:
                            pipeline.models[key] = models.from_pretrained(plan['models'][key]['prefix']).eval()
                pipeline._convert_bf16_to_fp16_if_needed()
                record(name + ':loaded', resident_model_keys=list(pipeline.models))
                yield
            finally:
                # All numerical method frames have returned before this point.
                # Discard real modules; .cpu() alone would retain their weights.
                pipeline.models.clear()
                pipeline.image_cond_model = None
                pipeline.rembg_model = None
                gc.collect()
                torch.cuda.empty_cache()
                record(name + ':released', resident_model_keys=list(pipeline.models))

        with torch.inference_mode():
            image = Image.open(args.input).convert('RGBA')
            with stage('background'):
                image = pipeline.preprocess_image(image)
            image.save(output / 'preprocessed.png')
            torch.manual_seed(args.seed)
            with stage('conditioning'):
                pipeline.image_cond_model.to(pipeline.device)
                cond = pipeline._cast_cond(pipeline.get_cond([image], 512))
            params = {'steps': args.steps}
            with stage('sparse'):
                coords = pipeline.sample_sparse_structure(cond, 32, 1, params)
            # The installed512 path does not apply run(max_num_tokens). Bound
            # this experiment explicitly before either dense attention stage.
            if coords.shape[0] > 32768:
                raise RuntimeError(f'512 coordinate ceiling exceeded: {coords.shape[0]}')
            with stage('shape-flow'):
                shape = pipeline.sample_shape_slat(cond, pipeline.models['shape_slat_flow_model_512'], coords, params)
            del coords
            with stage('texture-flow'):
                texture = pipeline.sample_tex_slat(cond, pipeline.models['tex_slat_flow_model_512'], shape, params)
            del cond
            shape._spatial_cache = {}
            texture._spatial_cache = {}
            with stage('decode'):
                mesh = pipeline.decode_latent(shape, texture, 512)[0]
            del shape, texture
            decoded_faces = int(mesh.faces.shape[0])
            record('decode:geometry-budget', decoded_faces=decoded_faces,
                   decoded_vertices=int(mesh.vertices.shape[0]), face_limit=MAX_DECODED_FACES)
            if decoded_faces > MAX_DECODED_FACES:
                raise RuntimeError(f'Decoded mesh refused: {decoded_faces} faces exceed {MAX_DECODED_FACES}; no heavy simplification/remesh fallback')
            mesh.attrs = mesh.attrs.cpu()
            mesh.coords = mesh.coords.cpu()
            gc.collect()
            torch.cuda.empty_cache()
            ensure_free(RESERVE_GIB + WORKSPACE_GIB, 'Export workspace')
            record('export:before')
            import o_voxel
            # Preserve the installed API's explicit detachment before export.
            vertices, faces, attrs, coords = mesh.vertices, mesh.faces, mesh.attrs, mesh.coords
            layout, voxel_size = mesh.layout, mesh.voxel_size
            del mesh
            glb = o_voxel.postprocess.to_glb(vertices=vertices, faces=faces, attr_volume=attrs,
                coords=coords, attr_layout=layout, voxel_size=voxel_size,
                aabb=[[-.5, -.5, -.5], [.5, .5, .5]], decimation_target=args.faces,
                texture_size=1024, remesh=False, verbose=True)
            target = output / 'raw.glb'
            glb.export(str(target))
            record('complete', output=str(target), output_sha256=hashlib.sha256(target.read_bytes()).hexdigest())
    finally:
        stop.set()
        ctypes.windll.kernel32.ReleaseMutex(ctypes.c_void_p(handle))
        ctypes.windll.kernel32.CloseHandle(ctypes.c_void_p(handle))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install-root', default='C:/Users/cwood/Tools/trellis2-stableprojectorz/code')
    parser.add_argument('--output-dir', default='.dream-loop/trellis-staged-study')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--prepare-only', action='store_true')
    modes.add_argument('--run', action='store_true', help='Explicit one-image execution; requires reviewed plan/headroom')
    parser.add_argument('--input', type=Path)
    parser.add_argument('--seed', type=int, default=1234)
    parser.add_argument('--steps', type=int, default=12, choices=range(1, 13))
    parser.add_argument('--faces', type=int, default=60000)
    args = parser.parse_args()
    install, output = Path(args.install_root).resolve(), Path(args.output_dir).resolve()
    if args.input:
        args.input = args.input.resolve()
    if args.run and (args.input is None or not args.input.is_file()):
        parser.error('--run needs an existing reviewed --input image')
    if not 10000 <= args.faces <= 60000:
        parser.error('--faces must be between10000 and60000')
    if args.run and output.exists() and any(p.name != 'plan.json' for p in output.iterdir()):
        parser.error('--run needs a fresh output directory (a prepared plan.json is allowed)')
    plan = prepare(install)
    plan['observed_free_gib'] = available_gib()
    plan['bootstrap_currently_fits'] = plan['observed_free_gib'] >= plan['bootstrap_required_free_gib']
    plan['requested_run'] = {'seed': args.seed, 'steps': args.steps, 'faces': args.faces,
                             'texture_size': 1024, 'pipeline_type': '512', 'num_samples': 1,
                             'export_remesh': False, 'max_decoded_faces': MAX_DECODED_FACES,
                             'input': str(args.input) if args.input else None,
                             'input_sha256': hashlib.sha256(args.input.read_bytes()).hexdigest() if args.input else None}
    output.mkdir(parents=True, exist_ok=True)
    (output / 'plan.json').write_text(json.dumps(plan, indent=2), encoding='utf8')
    print(json.dumps({k: plan[k] for k in ['profile', 'stages', 'observed_free_gib', 'bootstrap_required_free_gib', 'bootstrap_currently_fits']}), flush=True)
    if args.run:
        run_one(args, install, output, plan)


if __name__ == '__main__':
    main()
