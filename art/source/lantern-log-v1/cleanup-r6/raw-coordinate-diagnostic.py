"""Read-only exact-coordinate/index diagnostic of the retained Lantern PLY."""
from pathlib import Path
import ctypes
import hashlib
import json
import time
import numpy as np

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'geometry-ply-r5' / 'raw-geometry.ply'
EXPECTED = 'e25bdd049cf9a7d8d4e1a7df9e4193e9840b0b550c6052b134d3d88cd6276120'


def free_gib():
    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (key, ctypes.c_ulonglong) for key in ('total', 'available', 'page_total',
            'page_available', 'virtual_total', 'virtual_available', 'extended')]
    value = Status(); value.length = ctypes.sizeof(value)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(value)):
        raise RuntimeError('Cannot measure RAM')
    return value.available / 2**30


def main():
    start = time.monotonic()
    if free_gib() < 8: raise RuntimeError('Need 8GiB free for bounded CPU diagnosis')
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED
    receipt = json.loads(SOURCE.with_name('geometry-ply-receipt.json').read_text(encoding='utf-8'))
    nv, nf, header = receipt['vertex_count'], receipt['face_count'], receipt['header_bytes']
    assert nv == 1077634 and nf == 2218798 and receipt['scalar'] == 'float32'
    positions = np.memmap(SOURCE, dtype='<f4', mode='r', offset=header, shape=(nv, 3))
    records = np.memmap(SOURCE, dtype=np.dtype([('arity','u1'),('indices','<u4',(3,))]),
                        mode='r', offset=header + nv * 12, shape=(nf,))
    faces = records['indices']
    unique_positions, inverse = np.unique(positions, axis=0, return_inverse=True)
    raw_face_keys = np.sort(faces, axis=1)
    unique_raw_faces = np.unique(raw_face_keys, axis=0)
    report = {
        'source_sha256': EXPECTED,
        'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'policy': 'Exact equality only; diagnostic arrays, no mesh or source mutation. Triangle keys ignore winding for duplicate detection.',
        'vertices': nv, 'triangles': nf,
        'unique_exact_positions': len(unique_positions),
        'duplicate_exact_position_vertices': nv - len(unique_positions),
        'duplicate_raw_index_triangle_records_ignoring_winding': nf - len(unique_raw_faces),
        'normal_winding_tested': False,
    }
    del raw_face_keys, unique_raw_faces
    if len(unique_positions) != nv:
        mapped = inverse[faces].astype(np.uint32)
        keys = np.sort(mapped, axis=1)
        degenerate = (keys[:,0] == keys[:,1]) | (keys[:,1] == keys[:,2])
        _, first = np.unique(keys[~degenerate], axis=0, return_index=True)
        valid = mapped[~degenerate][first]
        report['virtual_exact_weld'] = {
            'collapsed_triangle_records': int(degenerate.sum()),
            'duplicate_triangle_records_after_weld_ignoring_winding': int((~degenerate).sum() - len(first)),
            'unique_nondegenerate_triangles': len(valid),
        }
        del keys, mapped, first, degenerate
    else:
        valid = faces
    if free_gib() < 6: raise RuntimeError('Stop CPU diagnosis below 6GiB reserve')
    edges = np.empty(len(valid) * 3, dtype=np.uint64)
    for i, (a,b) in enumerate(((0,1),(1,2),(2,0))):
        low = np.minimum(valid[:,a], valid[:,b]).astype(np.uint64)
        high = np.maximum(valid[:,a], valid[:,b]).astype(np.uint64)
        edges[i*len(valid):(i+1)*len(valid)] = (low << 32) | high
    _, counts = np.unique(edges, return_counts=True)
    report['diagnostic_edge_incidence'] = {
        'note': 'After virtual exact weld/dedup only if duplicate positions exist; otherwise original indexed triangles.',
        'boundary_edges': int((counts == 1).sum()),
        'nonmanifold_edges': int((counts > 2).sum()),
    }
    report['elapsed_seconds'] = time.monotonic() - start
    report['ending_free_gib'] = free_gib()
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED
    output = HERE / 'raw-coordinate-diagnostic.json'
    assert not output.exists(), 'Preserve earlier diagnostic evidence'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
