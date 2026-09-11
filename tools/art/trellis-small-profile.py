"""Process-local 512-only TRELLIS launcher. Leaves the installed pipeline intact.

--prepare-only writes/validates a filtered cached config without importing torch.
The normal trellis-local.ps1 Full launch remains unchanged.
"""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import runpy
import sys
import threading
import time

REPO = 'microsoft/TRELLIS.2-4B'
EXCLUDED = {'shape_slat_flow_model_1024', 'tex_slat_flow_model_1024'}


def free_ram_gib():
    class MemoryStatus(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (name, ctypes.c_ulonglong) for name in
            ('total', 'available', 'page_total', 'page_available', 'virtual_total', 'virtual_available', 'extended')]
    status = MemoryStatus()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise OSError('Cannot measure available system RAM')
    return status.available / 2**30


def cached_snapshot(cache, repo):
    folder = cache / ('models--' + repo.replace('/', '--'))
    revision = (folder / 'refs' / 'main').read_text(encoding='utf8').strip()
    snapshot = folder / 'snapshots' / revision
    if not snapshot.is_dir():
        raise FileNotFoundError(f'Missing cached snapshot for {repo}')
    return snapshot


def prepare(install, output):
    cache = install / 'models' / 'hub'
    snapshot = cached_snapshot(cache, REPO)
    source = snapshot / 'pipeline.json'
    config = json.loads(source.read_text(encoding='utf8'))
    selected = {}
    excluded_bytes = 0
    for key, value in config['args']['models'].items():
        if value.startswith('ckpts/'):
            prefix = snapshot / value
        else:
            parts = value.split('/')
            prefix = cached_snapshot(cache, '/'.join(parts[:2])) / '/'.join(parts[2:])
        for suffix in ('.json', '.safetensors'):
            if not Path(str(prefix) + suffix).is_file():
                raise FileNotFoundError(str(prefix) + suffix)
        if key in EXCLUDED:
            excluded_bytes += Path(str(prefix) + '.safetensors').stat().st_size
        else:
            selected[key] = str(prefix).replace('\\', '/')
    if len(selected) != 6:
        raise ValueError('Installed pipeline schema changed; review before launching')
    config['args']['models'] = selected
    config['args']['default_pipeline_type'] = '512'
    config['args']['low_vram'] = True
    output.mkdir(parents=True, exist_ok=True)
    (output / 'pipeline.json').write_text(json.dumps(config, indent=2), encoding='utf8')
    receipt = {'source': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
               'profile': '512-only', 'model_keys': list(selected), 'excluded_checkpoint_gib': excluded_bytes / 2**30,
               'memory_note': 'Checkpoint bytes omitted, not a measured RAM saving. Guarded startup/inference proof required.'}
    (output / 'profile.json').write_text(json.dumps(receipt, indent=2), encoding='utf8')
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--install-root', default='C:/Users/cwood/Tools/trellis2-stableprojectorz/code')
    parser.add_argument('--profile-dir', default=str(Path(__file__).resolve().parents[2] / '.dream-loop/trellis-safe-profile/config'))
    parser.add_argument('--prepare-only', action='store_true')
    args, server_args = parser.parse_known_args()
    install, output = Path(args.install_root).resolve(), Path(args.profile_dir).resolve()
    receipt = prepare(install, output)
    print(json.dumps(receipt), flush=True)
    if args.prepare_only:
        return
    available = free_ram_gib()
    if available < 18:
        raise RuntimeError(f'512 profile requires 18 GiB free before startup; currently {available:.2f}. No models loaded.')
    for key, value in {'PYTHONNOUSERSITE':'1', 'HF_HOME':str(install / 'models'), 'HF_HUB_OFFLINE':'1',
                       'TRANSFORMERS_OFFLINE':'1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN':'1', 'HF_HUB_DISABLE_TELEMETRY':'1',
                       'SETUPTOOLS_USE_DISTUTILS':'stdlib', 'OMP_NUM_THREADS':'4', 'MKL_NUM_THREADS':'4'}.items():
        os.environ[key] = value
    # Stop only this isolated process if memory pressure reaches the reserve.
    def guard():
        while True:
            remaining = free_ram_gib()
            if remaining < 6:
                print(f'[RAM GUARD] Stopping owned TRELLIS process: only {remaining:.2f} GiB free.', flush=True)
                os._exit(77)
            time.sleep(2)
    threading.Thread(target=guard, daemon=True).start()
    sys.path.insert(0, str(install))
    os.chdir(install)
    from trellis2.pipelines import Trellis2ImageTo3DPipeline
    original_load = Trellis2ImageTo3DPipeline.from_pretrained
    original_run = Trellis2ImageTo3DPipeline.run
    def load_profile(path):
        if path != REPO:
            raise ValueError('This launcher only supports its reviewed local TRELLIS model')
        pipeline = original_load(str(output))
        if set(pipeline.models).intersection(EXCLUDED):
            raise RuntimeError('Unexpected high-resolution models loaded')
        return pipeline
    def run_512(self, *values, **options):
        import inspect
        bound = inspect.signature(original_run).bind_partial(self, *values, **options)
        if (bound.arguments.get('pipeline_type') or self.default_pipeline_type) != '512':
            raise ValueError('512-only profile: request pipeline_type=512; 1024/1536 are disabled')
        return original_run(self, *values, **options)
    Trellis2ImageTo3DPipeline.from_pretrained = staticmethod(load_profile)
    Trellis2ImageTo3DPipeline.run = run_512
    sys.argv = [str(install / 'api_spz/main_api.py'), *server_args]
    runpy.run_path(sys.argv[0], run_name='__main__')


if __name__ == '__main__':
    main()
