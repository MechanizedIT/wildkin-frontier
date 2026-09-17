import hashlib,json
from pathlib import Path
root=Path('art/source/lantern-log-v1/manual-r4')
p=json.loads(root.joinpath('parameters.json').read_text())
assert hashlib.sha256(root.joinpath('parameters.json').read_bytes()).hexdigest()=='797d79dd9b4d407b9abaf48ba2fd1a88554c6a5d4a101bffc36be87bc5703952'
assert len(p['body']['original_angles_deg'])==12 and len(set(p['body']['original_angles_deg'])|set(p['body']['extra_angles_deg']))==23
assert [g['valley_deg'] for g in p['body']['grooves']]==[175,225,300,345]
assert p['retention']['mushroom_stems']==6 and p['retention']['mushroom_caps']==6
out={'status':'CPU_SOURCE_PREPARED_NOT_BLENDER_EXECUTED','parameters_sha256':hashlib.sha256(root.joinpath('parameters.json').read_bytes()).hexdigest(),'angular_samples':23,'planned_render_count':42,'preserved_r3_meshes':22,'r4_bark_strips':0}
root.joinpath('preflight.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
