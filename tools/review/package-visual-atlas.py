"""Zip only the verified atlas deliverables, excluding temporary review files."""
import hashlib
import json
from pathlib import Path
import zipfile

base=Path('.dream-loop/visual-atlas/2026-09-12')
manifest=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
target=Path('output/review/Wildkin-visual-atlas-2026-09-12.zip')
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
    for relative,record in manifest['files'].items():
        file=base/relative
        assert hashlib.sha256(file.read_bytes()).hexdigest()==record['sha256'], relative
        z.write(file,relative)
    z.write(base/'manifest.json','manifest.json')
    z.writestr('README.txt','Wildkin Frontier visual atlas — September 12, 2026\n\n'
        'maps/: full-resolution clean maps and authored-anchor planning overlays.\n'
        'models/: actual exported-model renders, grouped into useful families.\n'
        'model-contact-sheet-*.png: labelled model overview sheets.\n'
        'Rootfall and Tidefin are unfinished candidates, not current game assets.\n'
        'North is world -Z; east is +X. Each map has bounds and world-to-image metadata in manifest.json.\n'
        'This is an authored-layout snapshot without distance fog/shadows, not live player/save state.\n'
        'Camp has starter and expanded-yard variants; player-built structures are omitted.\n\n'
        'Reproduce from the project repository while its dev server is running:\n'
        'node tools/review/capture-visual-atlas.mjs --url http://localhost:8080/ --out .dream-loop/visual-atlas/2026-09-12\n'
        'The manifest path fields are original repository paths; files in this archive use the relative files-map keys.\n')
print(json.dumps({'path':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
