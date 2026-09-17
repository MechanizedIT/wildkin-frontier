"""Exact, dependency-free binary PLY writer for guarded TRELLIS geometry receipts.

This module writes only positions and triangle indices.  It deliberately has no
TRELLIS, Torch, mesh-cleaning, UV, texture, BVH, or GLB dependencies, so its
format checks can run in the parent/self-test interpreter.
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path
import struct
from typing import Iterable, Sequence

MAGIC = b'ply\n'
FORMAT = b'format binary_little_endian 1.0\n'
FACE_RECORD_BYTES = 13  # uchar list length + three uint32 indices
SCALARS = {
    'float32': ('float', '<f', 4),
    'float64': ('double', '<d', 8),
}


class PlyError(ValueError):
    """Raised when a PLY receipt would lose precision or violate its schema."""


def _count_rows(rows: Sequence[object] | Iterable[object]) -> int:
    try:
        count = len(rows)  # type: ignore[arg-type]
    except TypeError as error:
        raise PlyError('triangles must have a stable finite row count') from error
    if not 0 <= count <= 0xFFFFFFFF:
        raise PlyError('triangle count is outside PLY uint32 range')
    return count


def _header(vertex_count: int, face_count: int, scalar: str, comments: Iterable[str]) -> bytes:
    if scalar not in SCALARS:
        raise PlyError('PLY positions must be float32 or float64; float16 is refused')
    keyword, _, _ = SCALARS[scalar]
    lines = [MAGIC, FORMAT]
    for comment in comments:
        clean = str(comment).replace('\r', ' ').replace('\n', ' ')
        lines.append(f'comment {clean}\n'.encode('ascii', 'strict'))
    lines.extend([
        f'element vertex {vertex_count}\n'.encode('ascii'),
        f'property {keyword} x\n'.encode('ascii'),
        f'property {keyword} y\n'.encode('ascii'),
        f'property {keyword} z\n'.encode('ascii'),
        f'element face {face_count}\n'.encode('ascii'),
        b'property list uchar uint vertex_indices\n',
        b'end_header\n',
    ])
    return b''.join(lines)


def _validate_vertex_bytes(vertex_bytes: bytes, vertex_count: int, scalar: str) -> None:
    _, unpack, scalar_bytes = SCALARS[scalar]
    expected = vertex_count * 3 * scalar_bytes
    if len(vertex_bytes) != expected:
        raise PlyError(f'vertex byte length {len(vertex_bytes)} does not equal {expected}')
    for values in struct.iter_unpack('<' + unpack[1:] * 3, vertex_bytes):
        if not all(math.isfinite(value) for value in values):
            raise PlyError('PLY positions contain non-finite coordinates')


def write_binary_ply(path: Path, *, vertex_bytes: bytes, vertex_count: int,
                     scalar: str, triangles: Sequence[Sequence[int]],
                     comments: Iterable[str] = ()) -> dict:
    """Write an exact little-endian position/triangle PLY and revalidate it.

    ``vertex_bytes`` must already be a contiguous CPU float32/float64 XYZ
    buffer.  No float conversion occurs here.  Triangle rows are copied as
    checked uint32 indices with the standard ``uchar 3 + uint[3]`` PLY record.
    """
    if not 0 <= vertex_count <= 0xFFFFFFFF:
        raise PlyError('vertex count is outside PLY uint32 range')
    if scalar not in SCALARS:
        raise PlyError('PLY positions must be float32 or float64; float16 is refused')
    face_count = _count_rows(triangles)
    _validate_vertex_bytes(vertex_bytes, vertex_count, scalar)
    header = _header(vertex_count, face_count, scalar, comments)
    target = Path(path)
    if target.exists():
        raise FileExistsError(f'refusing to overwrite PLY receipt: {target.name}')
    with target.open('xb') as stream:
        stream.write(header)
        copied_vertex_bytes = stream.write(vertex_bytes)
        if copied_vertex_bytes != len(vertex_bytes):
            raise OSError('short write while copying exact position bytes')
        for row in triangles:
            if len(row) != 3:
                raise PlyError('PLY geometry-only profile requires triangle rows')
            indices = tuple(int(value) for value in row)
            if any(index < 0 or index >= vertex_count for index in indices):
                raise PlyError('triangle index is outside vertex range')
            stream.write(struct.pack('<BIII', 3, *indices))
    expected_bytes = len(header) + len(vertex_bytes) + face_count * FACE_RECORD_BYTES
    actual_bytes = target.stat().st_size
    if actual_bytes != expected_bytes:
        raise OSError(f'PLY byte count {actual_bytes} does not equal {expected_bytes}')
    checked = validate_binary_ply(target, expected_vertex_count=vertex_count,
                                  expected_face_count=face_count, expected_scalar=scalar)
    checked.update({'header_bytes': len(header), 'copied_vertex_bytes': copied_vertex_bytes,
                    'expected_bytes': expected_bytes, 'actual_bytes': actual_bytes})
    return checked


def _read_header(stream) -> tuple[dict, int]:
    if stream.readline() != MAGIC or stream.readline() != FORMAT:
        raise PlyError('not a binary_little_endian PLY 1.0 file')
    vertex_count = face_count = scalar = None
    while True:
        line = stream.readline()
        if not line:
            raise PlyError('truncated PLY header')
        if line == b'end_header\n':
            break
        words = line.decode('ascii', 'strict').strip().split()
        if words[:2] == ['element', 'vertex'] and len(words) == 3:
            vertex_count = int(words[2])
        elif words[:2] == ['element', 'face'] and len(words) == 3:
            face_count = int(words[2])
        elif words[:2] == ['property', 'float']:
            scalar = 'float32'
        elif words[:2] == ['property', 'double']:
            scalar = 'float64'
    if vertex_count is None or face_count is None or scalar is None:
        raise PlyError('PLY header lacks vertex/face/position schema')
    return {'vertex_count': vertex_count, 'face_count': face_count, 'scalar': scalar}, stream.tell()


def validate_binary_ply(path: Path, *, expected_vertex_count: int | None = None,
                        expected_face_count: int | None = None,
                        expected_scalar: str | None = None) -> dict:
    """Re-read every vertex and triangle; return counts, exact bytes, and SHA-256."""
    target = Path(path)
    with target.open('rb') as stream:
        header, header_bytes = _read_header(stream)
        vertex_count, face_count, scalar = header['vertex_count'], header['face_count'], header['scalar']
        if expected_vertex_count is not None and vertex_count != expected_vertex_count:
            raise PlyError('PLY vertex count differs from expected count')
        if expected_face_count is not None and face_count != expected_face_count:
            raise PlyError('PLY face count differs from expected count')
        if expected_scalar is not None and scalar != expected_scalar:
            raise PlyError('PLY scalar differs from expected precision')
        _, unpack, scalar_bytes = SCALARS[scalar]
        vertex_bytes = stream.read(vertex_count * 3 * scalar_bytes)
        if len(vertex_bytes) != vertex_count * 3 * scalar_bytes:
            raise PlyError('truncated PLY positions')
        _validate_vertex_bytes(vertex_bytes, vertex_count, scalar)
        min_index = max_index = None
        for _ in range(face_count):
            record = stream.read(FACE_RECORD_BYTES)
            if len(record) != FACE_RECORD_BYTES:
                raise PlyError('truncated PLY triangle record')
            arity, a, b, c = struct.unpack('<BIII', record)
            if arity != 3 or any(index >= vertex_count for index in (a, b, c)):
                raise PlyError('invalid PLY triangle record')
            row_min, row_max = min(a, b, c), max(a, b, c)
            min_index = row_min if min_index is None else min(min_index, row_min)
            max_index = row_max if max_index is None else max(max_index, row_max)
        if stream.read(1):
            raise PlyError('PLY has trailing bytes after declared triangles')
    raw = target.read_bytes()
    return {'format': 'binary_little_endian_1.0', 'vertex_count': vertex_count,
            'face_count': face_count, 'scalar': scalar, 'header_bytes': header_bytes,
            'position_payload_sha256': hashlib.sha256(vertex_bytes).hexdigest(),
            'actual_min_index': min_index, 'actual_max_index': max_index,
            'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
