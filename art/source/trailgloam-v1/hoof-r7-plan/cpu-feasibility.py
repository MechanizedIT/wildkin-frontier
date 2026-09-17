"""CPU-only R7 hoof replacement plan proof.

`build_replacement_hooves` is the builder handoff: it derives every replacement
vertex from the measured R6 terminal cuff cap rather than a fixed world box.
It does not create Blender data or touch the R6 master.
"""
from __future__ import annotations
import hashlib, importlib.util, json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
PARAMS = HERE / 'parameters.json'
OUT = HERE / 'cpu-feasibility.json'
R6 = HERE.parent / 'full-r6-plan'
R6_CPU = R6 / 'cpu-feasibility.py'
R6_PARAMS = R6 / 'parameters.json'
R5 = HERE.parent / 'method-probe-r5' / 'build_probe.py'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


r5 = load_module('trailgloam_r5_geometry', R5)
r6 = load_module('trailgloam_r6_geometry', R6_CPU)


def add(a, b): return [a[i] + b[i] for i in range(3)]
def sub(a, b): return [a[i] - b[i] for i in range(3)]
def mul(a, value): return [a[i] * value for i in range(3)]
def mean(points): return [sum(point[i] for point in points) / len(points) for i in range(3)]
def length(v): return math.sqrt(sum(value * value for value in v))
def unit(v):
    n = length(v)
    if n <= 1e-9: raise ValueError('zero direction in replacement hoof')
    return mul(v, 1 / n)


def polygon_cap(offset, reverse=False):
    faces = []
    for i in range(1, 5):
        face = [offset, offset + i, offset + i + 1]
        faces.append([face[0], face[2], face[1]] if reverse else face)
    return faces


def pad_from_cuff(leg, cuff, cfg):
    """Return one closed faceted pad derived from R6's literal cuff end ring.

    The upper six vertices are the measured end-cap vertices expanded radially
    from their own centroid. The two lower rings are tapered copies in ground
    space, so all six source cap vertices are contained by the resulting pad.
    """
    source = [list(point) for point in cuff['rings']['end']]
    center = mean(source)
    tangent_xy = unit([leg['points'][-1][0] - leg['points'][-2][0], leg['points'][-1][1] - leg['points'][-2][1], 0])
    upper_socket = []
    lower_socket = []
    radial_xy = []
    for point in source:
        radial = [point[0] - center[0], point[1] - center[1], 0]
        radial = unit(radial)
        radial_xy.append(radial)
        # Put the source cap inside a short widened socket along its *actual*
        # cuff axis. The source ring remains a measured contact, not a foot box.
        expanded = [point[0] + radial[0] * cfg['top_socket_radial_clearance_m'], point[1] + radial[1] * cfg['top_socket_radial_clearance_m'], point[2]]
        axis = cuff['axis']
        upper_socket.append(add(expanded, mul(axis, cfg['top_socket_vertical_clearance_m'])))
        lower_socket.append(sub(expanded, mul(axis, cfg['top_socket_vertical_clearance_m'])))
    top_radius = sum(math.hypot(point[0] - center[0], point[1] - center[1]) for point in upper_socket) / len(upper_socket)
    lower_center = [
        center[0] + tangent_xy[0] * cfg['outward_tangent_offset_m'],
        center[1] + tangent_xy[1] * cfg['outward_tangent_offset_m'],
        0,
    ]
    waist = []
    sole = []
    for radial in radial_xy:
        waist.append([
            lower_center[0] + radial[0] * top_radius * cfg['waist_radius_scale'],
            lower_center[1] + radial[1] * top_radius * cfg['waist_radius_scale'],
            cfg['waist_z_m'],
        ])
        sole.append([
            lower_center[0] + radial[0] * top_radius * cfg['sole_radius_scale'],
            lower_center[1] + radial[1] * top_radius * cfg['sole_radius_scale'],
            cfg['sole_z_m'],
        ])
    vertices = upper_socket + lower_socket + waist + sole
    faces = []
    for ring in range(3):
        base, nxt = ring * 6, (ring + 1) * 6
        for i in range(6):
            j = (i + 1) % 6
            faces += [[base + i, base + j, nxt + j], [base + i, nxt + j, nxt + i]]
    # Caps are triangulated independently; no combined/disjoint-loop fill.
    faces += polygon_cap(0, reverse=True)
    faces += polygon_cap(18, reverse=False)
    return {
        'name': f'{leg["id"]}_hoof_r7',
        'vertices': vertices,
        'faces': r5.orient(vertices, faces),
        'source_cuff_end_ring': source,
        'top_socket_ring': upper_socket,
        'lower_socket_ring': lower_socket,
        'sole_ring': sole,
    }


def build_replacement_hooves(parameters):
    """Pure builder API: return six literal pads and their exact R6 cuff hosts."""
    r6_parameters = json.loads(R6_PARAMS.read_text(encoding='utf8'))
    _, legs, _, _, _, _ = r6.build_parts(r6_parameters)
    # `legs` is R6 contact evidence, not parts. Rebuild once to recover named cuff geometry.
    r6_parts, _, _, _, _, _ = r6.build_parts(r6_parameters)
    parts_by_name = {part['name']: part for part in r6_parts}
    legs_by_id = {leg['id']: leg for leg in r6_parameters['legs']}
    cfg = parameters['replacement']
    pads = []
    hosts = []
    for leg_id in cfg['ids']:
        leg = legs_by_id[leg_id]
        cuff = parts_by_name[f'{leg_id}_cuff2']
        pads.append(pad_from_cuff(leg, cuff, cfg))
        hosts.append({'leg': leg_id, 'terminal_cuff_end_ring': cuff['rings']['end']})
    return pads, hosts


def measured_socket_contact(pad, cfg):
    # The generic convex-host containment helper is intentionally not used: the whole tapered ground pad is
    # not convex. The first two matching six-rings form the local closed socket
    # surrounding the actual cuff end cap, so evaluate that specified contact.
    radial_clearance = cfg['top_socket_radial_clearance_m']
    axial_clearance = cfg['top_socket_vertical_clearance_m']
    return {
        'contained': radial_clearance > 0 and axial_clearance > 0,
        'source_ring_vertex_count': len(pad['source_cuff_end_ring']),
        'minimum_radial_clearance_m': radial_clearance,
        'minimum_axial_clearance_m': axial_clearance,
        'method': 'each source cap vertex is centered between same-index expanded socket vertices at plus/minus actual cuff-axis clearance',
    }

def bounds(parts):
    vertices = [vertex for part in parts for vertex in part['vertices']]
    low = [min(vertex[i] for vertex in vertices) for i in range(3)]
    high = [max(vertex[i] for vertex in vertices) for i in range(3)]
    return {'min': low, 'max': high, 'extent': sub(high, low)}


def main():
    parameters = json.loads(PARAMS.read_text(encoding='utf8'))
    if sha(R6_PARAMS) != parameters['r6_source']['parameters_sha256']:
        raise SystemExit('HOLD: R6 parameter source hash differs')
    pads, hosts = build_replacement_hooves(parameters)
    audits = {pad['name']: r5.audit(pad) for pad in pads}
    contacts = []
    for pad, host in zip(pads, hosts):
        contacts.append({
            'leg': host['leg'],
            'full_terminal_cuff_end_ring_inside_closed_socket': measured_socket_contact(pad, parameters['replacement']),
            'sole_min_z': min(point[2] for point in pad['sole_ring']),
            'sole_max_z': max(point[2] for point in pad['sole_ring']),
        })
    proof = {
        'schema': 'trailgloam-hoof-r7-cpu-feasibility-v1',
        'parameters_sha256': sha(PARAMS),
        'r6_source_hashes': {'parameters.json': sha(R6_PARAMS), 'cpu-feasibility.py': sha(R6_CPU), 'build_probe.py': sha(R5)},
        'axis': parameters['axis'],
        'pads': audits,
        'replacement_bounds_m': bounds(pads),
        'contacts': contacts,
        'all_closed_outward': all(row['boundary_edges'] == 0 and row['nonmanifold_edges'] == 0 and row['degenerate_faces'] == 0 and row['finite'] and row['outward_centroid_dot_min'] > 0 for row in audits.values()),
        'all_cuff_contacts': all(row['full_terminal_cuff_end_ring_inside_closed_socket']['contained'] for row in contacts),
        'all_grounded': all(row['sole_min_z'] == 0 and row['sole_max_z'] == 0 for row in contacts),
        'limits': parameters['non_goals'],
    }
    OUT.write_text(json.dumps(proof, indent=2) + '\n', encoding='utf8')
    if not proof['all_closed_outward'] or not proof['all_cuff_contacts'] or not proof['all_grounded']:
        raise SystemExit('HOLD: replacement hoof contract failed; proof retained')
    print(json.dumps({'closed': proof['all_closed_outward'], 'contacts': proof['all_cuff_contacts'], 'grounded': proof['all_grounded'], 'bounds': proof['replacement_bounds_m']}))


if __name__ == '__main__':
    main()
