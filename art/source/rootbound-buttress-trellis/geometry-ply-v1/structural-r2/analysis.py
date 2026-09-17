"""Deterministic CPU measurements for the Rootbound buttress raw geometry.

Reads the verified public binary PLY only.  It never opens Blender, runs GPU work,
or modifies geometry.  Z is up; scaled coordinates are meters with raw minimum Z
translated to ground zero after a uniform XY-spread scale.
"""
import hashlib
import json
import math
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[5]
RAW = REPO / 'art/source/rootbound-buttress-trellis/geometry-ply-v1/raw-geometry.ply'
OUT = Path(__file__).with_name('analysis.json')
PARAMS = Path(__file__).with_name('parameters.json')
RAW_SHA256 = '3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c'
SCALE = 4.998019228586503
BAND_CENTERS_M = (.15, .5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.4, 3.7)
BAND_HALF_WIDTH_M = .075
LOW_BAND_MAX_Z_M = .35
RADIAL_BIN_DEGREES = 10


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def parse_header(path):
    with Path(path).open('rb') as stream:
        lines = []
        while True:
            line = stream.readline()
            if not line:
                raise ValueError('truncated PLY header')
            lines.append(line)
            if line == b'end_header\n':
                break
    text = b''.join(lines).decode('ascii')
    if 'format binary_little_endian 1.0' not in text or 'property float x' not in text:
        raise ValueError('unexpected PLY format; expected float32 binary little endian XYZ')
    values = {line.split()[1]: int(line.split()[2]) for line in text.splitlines() if line.startswith('element ')}
    return len(b''.join(lines)), values['vertex'], values['face']


def bounds(points):
    return {'min': points.min(axis=0).astype(float).tolist(),
            'max': points.max(axis=0).astype(float).tolist(),
            'extent': (points.max(axis=0) - points.min(axis=0)).astype(float).tolist()}


def band(points, center):
    low, high = max(0.0, center - BAND_HALF_WIDTH_M), center + BAND_HALF_WIDTH_M
    chosen = points[(points[:, 2] >= low) & (points[:, 2] <= high)]
    item = {'z_range_m': [low, high], 'vertex_count': int(len(chosen))}
    if len(chosen):
        xy = chosen[:, :2]; xy_bounds = bounds(np.c_[xy, np.zeros(len(xy), dtype=np.float32)])
        area = xy_bounds['extent'][0] * xy_bounds['extent'][1]
        item.update({'xy_bounds_m': {'min': xy_bounds['min'][:2], 'max': xy_bounds['max'][:2], 'extent': xy_bounds['extent'][:2]},
                     'xy_centroid_m': xy.mean(axis=0).astype(float).tolist(),
                     'xy_bbox_density_vertices_per_m2': float(len(chosen) / area) if area else None})
    return item


def radial_lobes(points, collar):
    low = points[points[:, 2] < LOW_BAND_MAX_Z_M]
    delta = low[:, :2] - collar
    radii = np.hypot(delta[:, 0], delta[:, 1])
    angles = (np.degrees(np.arctan2(delta[:, 1], delta[:, 0])) + 360.0) % 360.0
    bins = int(360 / RADIAL_BIN_DEGREES)
    entries = []
    for index in range(bins):
        mask = (angles >= index * RADIAL_BIN_DEGREES) & (angles < (index + 1) * RADIAL_BIN_DEGREES)
        values = radii[mask]
        entries.append({'bin': index, 'angle_range_deg': [index * RADIAL_BIN_DEGREES, (index + 1) * RADIAL_BIN_DEGREES],
                        'vertex_count': int(len(values)), 'max_radius_m': float(values.max()) if len(values) else None,
                        'p95_radius_m': float(np.quantile(values, .95)) if len(values) else None})
    nonempty = [entry for entry in entries if entry['vertex_count']]
    global_p99 = float(np.quantile(radii, .99))
    median_count = float(np.median([entry['vertex_count'] for entry in nonempty]))
    # A lobe is data-selected: sustained long-radius bins with nontrivial support.
    active = [(entry['p95_radius_m'] >= global_p99 * .65 and entry['vertex_count'] >= max(5, median_count * .25)) if entry['p95_radius_m'] is not None else False for entry in entries]
    groups = []
    doubled = active + active
    start = None
    for i, flag in enumerate(doubled):
        if flag and start is None: start = i
        if start is not None and (not flag or i == len(doubled) - 1):
            end = i if flag and i == len(doubled) - 1 else i - 1
            if start < bins and end - start + 1 < bins:
                groups.append((start, min(end, start + bins - 1)))
            start = None
    # Circular duplicate groups collapse to their first representation.
    unique = []
    seen = set()
    for start, end in groups:
        key = (start % bins, end % bins, end - start + 1)
        if key not in seen: seen.add(key); unique.append((start, end))
    lobes = []
    for start, end in unique:
        indexes = [i % bins for i in range(start, end + 1)]
        included = [entries[i] for i in indexes]
        peak = max(included, key=lambda item: item['p95_radius_m'] or -1)
        lobes.append({'angular_range_deg_unwrapped': [start * RADIAL_BIN_DEGREES, (end + 1) * RADIAL_BIN_DEGREES],
                      'angular_bins': indexes, 'peak_bin_deg': peak['angle_range_deg'],
                      'max_radius_m': max(item['max_radius_m'] or 0 for item in included),
                      'max_p95_radius_m': max(item['p95_radius_m'] or 0 for item in included),
                      'vertex_count': sum(item['vertex_count'] for item in included)})
    return {'z_range_m': [0.0, LOW_BAND_MAX_Z_M], 'collar_center_xy_m': collar.astype(float).tolist(),
            'global_p99_radius_m': global_p99, 'selection_rule': {'p95_radius_at_least_fraction_of_global_p99': .65,
            'minimum_bin_vertices': max(5, median_count * .25), 'bin_degrees': RADIAL_BIN_DEGREES},
            'bins': entries, 'selected_lobes': lobes}


def upper_clusters(points):
    upper = points[points[:, 2] >= 3.0]
    if len(upper) < 20:
        return {'z_min_m': 3.0, 'vertex_count': int(len(upper)), 'separable': False, 'reason': 'too few upper vertices'}
    xy = upper[:, :2]
    # Farthest pair initialization and deterministic Lloyd iterations, labels by
    # nearest squared distance. This describes point distribution, not fork anatomy.
    first = int(np.argmin(xy[:, 0])); second = int(np.argmax(np.sum((xy - xy[first]) ** 2, axis=1)))
    centers = np.stack((xy[first], xy[second])).astype(np.float64)
    for _ in range(32):
        labels = np.argmin(((xy[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2), axis=1)
        next_centers = np.stack([xy[labels == index].mean(axis=0) if np.any(labels == index) else centers[index] for index in range(2)])
        if np.allclose(next_centers, centers, atol=1e-8): break
        centers = next_centers
    rows = []
    radii90 = []
    for index in range(2):
        subset = upper[labels == index]; delta = subset[:, :2] - centers[index]
        radius90 = float(np.quantile(np.hypot(delta[:, 0], delta[:, 1]), .90)) if len(subset) else math.inf
        radii90.append(radius90)
        rows.append({'cluster': index, 'vertex_count': int(len(subset)), 'xy_centroid_m': centers[index].astype(float).tolist(),
                     'xyz_bounds_m': bounds(subset), 'p90_xy_radius_m': radius90})
    separation = float(np.linalg.norm(centers[0] - centers[1]))
    separable = all(row['vertex_count'] >= len(upper) * .1 for row in rows) and separation > 2 * max(radii90)
    return {'z_min_m': 3.0, 'vertex_count': int(len(upper)), 'method': 'deterministic k=2 XY Lloyd clustering; descriptive only',
            'centroid_separation_m': separation, 'separable': bool(separable), 'clusters': rows,
            'criterion': 'each cluster >=10% of upper points and centroid separation > 2×max cluster p90 XY radius'}


def smooth01(value):
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def parameter_sha():
    return sha256(PARAMS)


def apply_r2_positions(points, params):
    """Return a position-only R2 proposal and auditable selection facts.

    Faces are deliberately not read or rewritten: the planned operation is one
    XY offset per source vertex and preserves the source index buffer unchanged.
    """
    out = points.copy()
    collar = np.asarray(params['collar_center_xy_m'], dtype=np.float64)
    delta = points[:, :2] - collar
    radii = np.hypot(delta[:, 0], delta[:, 1])
    angles = np.degrees(np.arctan2(delta[:, 1], delta[:, 0]))
    displacement = np.zeros((len(points), 2), dtype=np.float64)
    web_receipts = []
    web_masks = []
    for web in params['web_broadening']:
        bearing = math.radians(web['center_bearing_deg'])
        unit = np.array((math.cos(bearing), math.sin(bearing)))
        perpendicular = np.array((-unit[1], unit[0]))
        signed_lateral = delta @ perpendicular
        angular_distance = np.degrees(np.abs(np.arctan2(np.sin(np.radians(angles - web['center_bearing_deg'])), np.cos(np.radians(angles - web['center_bearing_deg'])))))
        z0, z1 = web['z_range_m']; r0, r1 = web['radial_range_m']
        # Full influence away from collar/root tip, smoothly tapering at every edge.
        wz = smooth01((points[:, 2] - z0) / .16) * (1.0 - smooth01((points[:, 2] - (z1 - .18)) / .18))
        wr = smooth01((radii - r0) / .18) * (1.0 - smooth01((radii - (r1 - .32)) / .32))
        wa = np.where(angular_distance < web['angular_half_width_deg'], np.cos((angular_distance / web['angular_half_width_deg']) * math.pi / 2.0) ** 2, 0.0)
        weight = wz * wr * wa
        # tanh is smooth and odd: the centerline stays fixed and both sides spread apart continuously.
        offset = np.tanh(signed_lateral / web['lateral_response_half_width_m']) * web['lateral_max_offset_m'] * weight
        displacement += offset[:, None] * perpendicular
        active = weight > 0.0
        web_masks.append(active)
        web_receipts.append({'name': web['name'], 'selected_vertex_count': int(active.sum()),
            'max_weight': float(weight.max()), 'max_lateral_offset_m': float(np.abs(offset).max()),
            'source_bearing_deg': web['center_bearing_deg'], 'selection_bounds_m': bounds(points[active]) if active.any() else None})

    bend = params['trunk_s_bend']
    centerline = np.asarray(bend['source_centerline_samples_m'], dtype=np.float64)
    controls = np.asarray(bend['target_offset_xy_m_by_height'], dtype=np.float64)
    z = points[:, 2]
    cx = np.interp(z, centerline[:, 0], centerline[:, 1])
    cy = np.interp(z, centerline[:, 0], centerline[:, 2])
    ox = np.interp(z, controls[:, 0], controls[:, 1])
    oy = np.interp(z, controls[:, 0], controls[:, 2])
    core_distance = np.hypot(points[:, 0] - cx, points[:, 1] - cy)
    core_weight = 1.0 - smooth01((core_distance - bend['core_full_radius_m']) / bend['core_edge_m'])
    vertical_weight = smooth01((z - bend['z_range_m'][0]) / bend['vertical_edge_m']) * (1.0 - smooth01((z - (bend['z_range_m'][1] - bend['vertical_edge_m'])) / bend['vertical_edge_m']))
    bend_weight = core_weight * vertical_weight
    bend_delta = np.c_[ox, oy] * bend_weight[:, None]
    displacement += bend_delta
    out[:, :2] += displacement
    per_vertex = np.hypot(displacement[:, 0], displacement[:, 1])
    return out, {'webs': web_receipts, 'trunk_s_bend': {
        'selected_vertex_count': int((bend_weight > 0.0).sum()), 'max_weight': float(bend_weight.max()),
        'max_xy_offset_m': float(np.hypot(bend_delta[:, 0], bend_delta[:, 1]).max()),
        'selection_bounds_m': bounds(points[bend_weight > 0.0])},
        'max_total_xy_displacement_m': float(per_vertex.max()),
        'mean_total_xy_displacement_m': float(per_vertex.mean()),
        'moved_vertex_count': int((per_vertex > 0.0).sum()), '_web_masks': web_masks}

def face_normal_audit(raw_points, proposed_points, header_bytes, vertices, faces):
    """Read the fixed triangle list and compare raw/proposed area vectors in chunks."""
    face_offset = header_bytes + vertices * 12
    packed = np.memmap(RAW, dtype=np.dtype([('count', 'u1'), ('index', '<u4', (3,))]), mode='r', offset=face_offset, shape=(faces,))
    if not np.all(packed['count'] == 3):
        raise ValueError('expected packed triangle PLY faces')
    indices = packed['index']
    if int(indices.min()) < 0 or int(indices.max()) >= vertices:
        raise ValueError('face index outside vertex range')
    raw_degenerate = proposed_degenerate = flipped = 0
    raw_area_min = proposed_area_min = math.inf
    for start in range(0, faces, 100000):
        tri = indices[start:start + 100000]
        a, b, c = raw_points[tri[:, 0]], raw_points[tri[:, 1]], raw_points[tri[:, 2]]
        ar = np.cross(b - a, c - a)
        a, b, c = proposed_points[tri[:, 0]], proposed_points[tri[:, 1]], proposed_points[tri[:, 2]]
        ap = np.cross(b - a, c - a)
        raw_norm = np.linalg.norm(ar, axis=1); proposed_norm = np.linalg.norm(ap, axis=1)
        raw_degenerate += int((raw_norm <= 1e-12).sum()); proposed_degenerate += int((proposed_norm <= 1e-12).sum())
        raw_area_min = min(raw_area_min, float((raw_norm * .5).min())); proposed_area_min = min(proposed_area_min, float((proposed_norm * .5).min()))
        flipped += int(((ar * ap).sum(axis=1) <= 0.0).sum())
    return {'face_index_encoding': 'packed uchar count + three uint32 indices', 'face_count': faces,
      'index_min': int(indices.min()), 'index_max': int(indices.max()), 'raw_degenerate_triangle_count_area_lte_1e-12': raw_degenerate,
      'proposed_degenerate_triangle_count_area_lte_1e-12': proposed_degenerate,
      'raw_min_triangle_area_m2': raw_area_min, 'proposed_min_triangle_area_m2': proposed_area_min,
      'raw_to_proposed_nonpositive_normal_dot_count': flipped,
      'limit': 'This compares indexed triangle area vectors only; it is not a global self-intersection test.'}

def fixed_camera_proxy(points, web_masks, camera, web_specs):
    """Selected-point orthographic bounds/depth proxy; intentionally not a rasterizer."""
    target = np.asarray(camera['target_xyz'], dtype=np.float64)
    direction = np.asarray(camera['position_direction_from_asset_xyz'], dtype=np.float64)
    direction /= np.linalg.norm(direction)
    position = target + direction * float(camera['distance_m'])
    forward = -direction
    world_up = np.array((0.0, 0.0, 1.0))
    right = np.cross(forward, world_up); right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    relative = points - target
    projected = np.c_[relative @ right, relative @ up]
    depth = (points - position) @ forward
    whole_min, whole_max = projected.min(axis=0), projected.max(axis=0)
    span = whole_max - whole_min
    # A 5% camera-safe margin creates normalized screen coordinates 0..1.
    frame_min = whole_min - span * .05; frame_max = whole_max + span * .05
    frame_span = frame_max - frame_min
    low_surface = points[:, 2] <= .95
    low_depth = depth[low_surface]
    rows = []
    for mask, web in zip(web_masks, web_specs):
        selected = projected[mask]; selected_depth = depth[mask]
        normalized = (selected - frame_min) / frame_span
        # Nearness is a point-depth proxy only. It makes no claim about triangles
        # masking one another or final render visibility.
        rows.append({'name': web['name'], 'source_lobe_angular_range_deg': web['source_lobe_angular_range_deg'], 'selected_vertex_count': int(mask.sum()),
          'projected_screen_bounds_normalized': {'min': normalized.min(axis=0).astype(float).tolist(), 'max': normalized.max(axis=0).astype(float).tolist(), 'extent': (normalized.max(axis=0)-normalized.min(axis=0)).astype(float).tolist()},
          'depth_m': {'min': float(selected_depth.min()), 'median': float(np.median(selected_depth)), 'max': float(selected_depth.max()), 'fraction_at_or_nearer_than_low_surface_median': float(np.mean(selected_depth <= np.median(low_depth)))},
          'non_background_proxy': bool(np.all(normalized.max(axis=0) > .05) and np.all(normalized.min(axis=0) < .95))})
    return {'camera_position_xyz_m': position.astype(float).tolist(), 'camera_target_xyz_m': target.astype(float).tolist(),
      'camera_forward_xyz': forward.astype(float).tolist(), 'projection': camera['projection'],
      'complete_point_frame_bounds': {'min': frame_min.astype(float).tolist(), 'max': frame_max.astype(float).tolist()},
      'near_definition': 'selected point depth <= median depth of all source vertices with Z <= 0.95m',
      'webs': rows, 'limit': 'point projection/depth proxy only; no triangles, z-buffer, HUD layout, or mesh occlusion were rasterized'}

def main():
    if sha256(RAW) != RAW_SHA256: raise ValueError('raw PLY SHA mismatch')
    params = json.loads(PARAMS.read_text(encoding='utf8'))
    if params['source']['sha256'] != RAW_SHA256: raise ValueError('parameter source SHA mismatch')
    header_bytes, vertices, faces = parse_header(RAW)
    if (vertices, faces) != (514489, 1029792): raise ValueError('raw PLY counts differ from verified receipt')
    data = np.memmap(RAW, dtype='<f4', mode='r', offset=header_bytes, shape=(vertices, 3))
    raw = np.asarray(data, dtype=np.float64)
    raw_bounds = bounds(raw)
    scaled = raw * SCALE
    scaled[:, 2] -= raw_bounds['min'][2] * SCALE
    meter_bounds = bounds(scaled)
    proposed, deformation = apply_r2_positions(scaled, params)
    web_masks = deformation.pop('_web_masks')
    projection_proxy = fixed_camera_proxy(proposed, web_masks, params['fixed_projection_camera'], params['web_broadening'])
    normal_audit = face_normal_audit(scaled, proposed, header_bytes, vertices, faces)
    if not np.isfinite(proposed).all(): raise ValueError('non-finite proposed coordinate')
    if not np.array_equal(proposed[:, 2], scaled[:, 2]): raise ValueError('R2 recipe changed Z')
    bands = {f'{center:.2f}m': band(scaled, center) for center in BAND_CENTERS_M}
    collar_band = scaled[(scaled[:, 2] >= 1.425) & (scaled[:, 2] <= 1.575)]
    collar = collar_band[:, :2].mean(axis=0) if len(collar_band) else scaled[:, :2].mean(axis=0)
    result = {'schema': 'rootbound-buttress-structural-r2-analysis-v1', 'source': {'path': str(RAW.relative_to(REPO)).replace('\\', '/'),
              'sha256': RAW_SHA256, 'vertex_count': vertices, 'face_count': faces, 'position_dtype': 'float32', 'axis': 'Z-up'},
              'transform': {'uniform_scale': SCALE, 'ground_translation_z_m': float(-raw_bounds['min'][2] * SCALE),
              'formula': 'metersXYZ = rawXYZ * uniform_scale; metersZ -= rawMinZ * uniform_scale'},
              'raw_bounds': raw_bounds, 'scaled_grounded_bounds_m': meter_bounds,
              'horizontal_bands': bands,
              'collar_center_definition': {'z_range_m': [1.425, 1.575], 'vertex_count': int(len(collar_band)),
              'xy_center_m': collar.astype(float).tolist()},
              'low_band_radial_lobes': radial_lobes(scaled, collar), 'upper_vertex_clusters': upper_clusters(scaled),
              'r2_proposed_deformation': {'parameters_path': str(PARAMS.relative_to(REPO)).replace('\\', '/'), 'parameters_sha256': parameter_sha(), 'position_edit_only': True, 'face_count_preserved_by_contract': faces, 'vertex_count_preserved': int(len(proposed)), 'source_grounded_bounds_m': meter_bounds, 'proposed_grounded_bounds_m': bounds(proposed), 'z_values_bitwise_unchanged': bool(np.array_equal(proposed[:, 2], scaled[:, 2])), 'finite_coordinates': bool(np.isfinite(proposed).all()), 'details': deformation, 'fixed_camera_selected_point_proxy': projection_proxy, 'triangle_normal_audit': normal_audit},
              'interpretation_limits': ['Target-to-source anatomical correspondence is unknown; this receipt reports point distributions only.',
              'Selected radial lobes are thresholded data ranges, not a declared four-buttress anatomy.',
              'Upper k=2 clusters are reported only when the stated numeric separability criterion passes.']}
    OUT.write_text(json.dumps(result, indent=2), encoding='utf8')
    print(json.dumps({'output': str(OUT), 'bands': list(bands), 'lobes': len(result['low_band_radial_lobes']['selected_lobes']),
                      'upper_separable': result['upper_vertex_clusters']['separable'], 'r2_max_displacement_m': deformation['max_total_xy_displacement_m']}))

if __name__ == '__main__': main()
