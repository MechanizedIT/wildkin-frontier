"""Exercise the parent retry orchestration with an existing private directory.

No Torch, CUDA, model import or child process is allowed in this regression.
Real hash/schema validation has separate production fixture coverage.
"""
import importlib.util
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

repo = Path(__file__).resolve().parents[5]
spec = importlib.util.spec_from_file_location('runner', repo / 'tools/art/trellis-trailgloam-postprocess.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

with tempfile.TemporaryDirectory() as root:
    private = Path(root) / 'private'
    private.mkdir()
    sentinel = private / 'saved-state'
    sentinel.write_bytes(b'keep exact state')
    public = Path(root) / 'fresh-public'
    calls = []
    class Child:
        def wait(self):
            return 0
    def launch(cmd, install, stdout, stderr):
        calls.append(cmd)
        stdout.write('mock postprocess only\n')
        return Child()
    argv = ['runner', '--run', '--retry-postprocess', '--private-output', str(private), '--public-output', str(public)]
    with patch.object(sys, 'argv', argv), patch.object(runner, 'prepare', return_value={'test': True}), patch.object(runner, 'mutex', return_value=1), patch.object(runner, 'release') as release, patch.object(runner, 'launch', side_effect=launch):
        runner.main()
    assert len(calls) == 1 and calls[0][calls[0].index('--child') + 1] == 'postprocess'
    assert sentinel.read_bytes() == b'keep exact state'
    assert sorted(p.name for p in private.iterdir()) == ['saved-state']
    assert (public / 'postprocess.stdout.log').read_text() == 'mock postprocess only\n'
    assert (public / 'run-plan.json').is_file()
    release.assert_called_once_with(1)
print('PASS: existing-state retry launches only postprocess and preserves private bytes')
