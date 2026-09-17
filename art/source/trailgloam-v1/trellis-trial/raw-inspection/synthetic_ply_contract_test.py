"""CPU-only synthetic binary PLY schema/receipt round-trip for the Trailgloam inspector."""
import hashlib
import importlib.util
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
PLY = ROOT / 'tools' / 'art' / 'trellis_geometry_ply.py'
spec = importlib.util.spec_from_file_location('ply', PLY)
ply = importlib.util.module_from_spec(spec); spec.loader.exec_module(ply)
vertices = b''.join(__import__('struct').pack('<fff', *point) for point in ((0,0,0),(1,0,0),(0,1,0),(0,0,1)))
with tempfile.TemporaryDirectory() as raw:
    root = Path(raw); target = root / 'raw-geometry.ply'
    receipt = ply.write_binary_ply(target, vertex_bytes=vertices, vertex_count=4, scalar='float32', triangles=((0,1,2),(0,3,1),(0,2,3),(1,3,2)))
    contract = {
        **receipt,
        'profile':'fresh-process-per-stage-512-trailgloam-geometry-ply-v1',
        'mode':'trailgloam-geometry-ply-v1',
        'input_sha256_verified':'417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff',
        'face_limit':1900000, 'decoded_vertices':4, 'decoded_faces':4,
    }
    reread = ply.validate_binary_ply(target, expected_vertex_count=4, expected_face_count=4, expected_scalar='float32')
    assert reread['sha256'] == contract['sha256'] and reread['position_payload_sha256'] == hashlib.sha256(vertices).hexdigest()
    print(json.dumps({'status':'PASS','vertices':4,'faces':4,'sha256':reread['sha256']}))