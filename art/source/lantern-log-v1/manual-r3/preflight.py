import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
params_path = ROOT / 'parameters.json'
raw = params_path.read_bytes()
data = json.loads(raw)
assert hashlib.sha256(raw).hexdigest() == '7d04105d455170836a2d3056f654f03a4603b58af6ad818114852e452c06e7e3'
assert data['log']['sides'] == 12 and len(data['log']['sections']) == 5
assert data['log']['nearEnd']['closed'] is True
assert data['log']['nearEnd']['innerRadiusRatio'] == .58
assert data['log']['grounding']['source_z_floor_m'] == .075
assert data['log']['grounding']['whole_asset_translation_z_m'] == -.075
assert len(data['log']['bark']['bearingsDeg']) == 6
assert len(data['log']['moss']['clusters']) == 3
assert len(data['mushrooms']) == 6
for mushroom in data['mushrooms']:
    assert len(mushroom['stem']) == 3 and len(mushroom['radii']) == 3
    assert mushroom['capRadius'] > 0 and mushroom['capHeight'] > 0
assert data['mushroomMethod']['capRings'][0]['r'] == 0
assert data['mushroomMethod']['capRings'][-1]['r'] == 0
out = {
    'status': 'CPU_ONLY_PREPARED_NOT_BLENDER_EXECUTED',
    'note': 'Counts describe the planned literal construction only. Closure, normals, finite triangles, actual contact and footprint proof are Blender execution audits.',
    'parameters_sha256': hashlib.sha256(raw).hexdigest(),
    'literal_counts': {'log_sections': 5, 'log_sides': 12, 'bark_strips': 6, 'moss_patches': 3, 'stems': 6, 'caps': 6, 'mushroom_parts': 12},
    'required_execution_audits': ['final_vertex_bounds', 'closed_manifold_edges', 'positive_outward_signed_volume', 'six_stem_and_cap_contacts', 'all_angle_neutral_renders'],
}
(ROOT / 'preflight.json').write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
print(json.dumps(out, indent=2))


