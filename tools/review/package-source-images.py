#!/usr/bin/env python3
"""Package original reference images for the September 12 visual-atlas review.

This is deliberately a provenance pack, not a model render export.  It copies
the selected originals byte-for-byte, writes a mapping receipt, and creates
phone-friendly contact sheets from copies for browsing.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "review" / "source-images-2026-09-12"
ARCHIVE = OUT.parent / "source-images-2026-09-12.zip"


# One entry per original byte sequence. `role` deliberately distinguishes a
# literal image-to-3D input from a target that guided a scripted Blender build.
IMAGES = [
    {
        "id": "explorer_v2_literal_input",
        "source": "art/source/explorer-v2/reference.png",
        "bundle_name": "01-explorer-v2-literal-image-to-3d-input.png",
        "role": "literal_image_to_3d_input",
        "note": "Exact input recorded by explorer-v2/generation.json for the local TRELLIS route.",
    },
    {
        "id": "mossling_neutral_v3_literal_input",
        "source": "art/targets/mossling-neutral-v3/reference.png",
        "bundle_name": "02-mossling-neutral-v3-literal-image-to-3d-input.png",
        "role": "literal_image_to_3d_input",
        "note": "Exact input recorded by mossling-v2/generation.json. Mossling-v3 is the later rig/motion revision of that retained model source.",
    },
    {
        "id": "sapwood_target",
        "source": "art/targets/sapwood-v1/reference.png",
        "bundle_name": "03-sapwood-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Sapwood source records this as its approved visual reference; no image-to-3D run is recorded.",
    },
    {
        "id": "canopy_base_target",
        "source": "art/targets/alien-canopy-v1/target.png",
        "bundle_name": "04-alien-canopy-base-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Alien canopy v1 was created locally in Blender from this reviewed generated target.",
    },
    {
        "id": "canopy_spread_target",
        "source": "art/targets/alien-canopy-spread-v1/target.png",
        "bundle_name": "05-alien-canopy-spread-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Spread canopy v2 correction target; source/reference copy is byte-identical to this file.",
    },
    {
        "id": "canopy_tall_target",
        "source": "art/targets/alien-canopy-tall-v1/target.png",
        "bundle_name": "06-alien-canopy-tall-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Tall canopy target authored with the approved Explorer master among its recorded references.",
    },
    {
        "id": "fen_bank_target",
        "source": "art/source/fen-bank-outcrop-left-v1/reference.png",
        "bundle_name": "07-fen-bank-outcrops-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "One byte-identical target guided both left and right outcrop components.",
    },
    {
        "id": "field_chest_target",
        "source": "art/targets/field-chest-v1/reference.png",
        "bundle_name": "08-field-chest-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Field chest was a Blender reconstruction; no image-to-3D run is recorded.",
    },
    {
        "id": "frontier_crate_literal_input",
        "source": "art/source/frontier-crate-v1/reference.png",
        "bundle_name": "09-frontier-crate-literal-image-to-3d-input.png",
        "role": "literal_image_to_3d_input",
        "note": "Exact input recorded by frontier-crate-v1/generation.json for the local TRELLIS route.",
    },
    {
        "id": "stations_target",
        "source": ".dream-loop/overnight-crafting-target/stations-v1.png",
        "bundle_name": "10-stations-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "One station board guided salvage bench, matter fabricator, and resonance bench Blender reconstructions.",
    },
    {
        "id": "ember_cache_target",
        "source": ".dream-loop/overnight-ember-cache-target/closed-open-v1.png",
        "bundle_name": "11-ember-forge-cache-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Ember forge cache source calls this a Blender hard-surface reconstruction target.",
    },
    {
        "id": "fen_observatory_target",
        "source": "art/targets/fen-observatory-v1/target.png",
        "bundle_name": "12-fen-observatory-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Fen observatory source records a local Blender build from this reviewed generated target.",
    },
    {
        "id": "barricade_target",
        "source": "art/targets/crash-camp-v1/target.png",
        "bundle_name": "13-camp-barricades-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Current emergency-barricades source records this as its approved target; no TRELLIS or image-to-3D route was used.",
    },
    {
        "id": "survey_wreck_target",
        "source": "art/targets/survey-wreck-v1/target.png",
        "bundle_name": "14-survey-wreck-reviewed-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model",
        "note": "Seven Survey module pieces were scripted Blender builds from this fixed target.",
    },
    {
        "id": "rootfall_closed_v3_target",
        "source": "art/targets/rootfall-closed-v3/target.png",
        "bundle_name": "15-rootfall-candidate-current-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model_candidate",
        "note": "Latest actual source for the Rootfall candidate components. The atlas marks Rootfall pending and does not admit it.",
    },
    {
        "id": "tidefin_neutral_v1_target",
        "source": "art/targets/tidefin-neutral-v1/target.png",
        "bundle_name": "16-tidefin-candidate-original-blender-target.png",
        "role": "reviewed_visual_target_for_scripted_blender_model_candidate",
        "note": "Original locked Tidefin neutral target retained for comparison because the candidate is unadmitted and owner-disliked.",
    },
    {
        "id": "explorer_owner_master",
        "source": "art/style/explorer-master.png",
        "bundle_name": "17-explorer-approved-owner-master-reference.png",
        "role": "approved_owner_master_reference",
        "note": "Approved Explorer master style reference used to constrain generated target boards; it is not asserted as a direct model-generation input unless a model receipt says so.",
    },
]


FAMILIES = [
    ("explorer", "Explorer", ["explorer_v2_literal_input"], "current generated game model"),
    ("mossling", "Mossling", ["mossling_neutral_v3_literal_input"], "current generated game model; motion/phone acceptance remains provisional"),
    ("sapwood", "Sapwood harvest tree", ["sapwood_target"], "current generated game model"),
    ("canopies", "Alien canopy family", ["canopy_base_target", "canopy_spread_target", "canopy_tall_target"], "current generated game model"),
    ("outcrops", "Fen bank outcrops", ["fen_bank_target"], "current generated game model; shared by both components"),
    ("field-chest", "Articulated field chest", ["field_chest_target"], "current generated game model"),
    ("frontier-crate", "Frontier storage crate", ["frontier_crate_literal_input"], "current generated game model"),
    ("salvage-bench", "Salvage bench", ["stations_target"], "current generated game model"),
    ("matter-fabricator", "Matter fabricator", ["stations_target"], "current generated game model"),
    ("resonance-bench", "Resonance bench", ["stations_target"], "current generated game model"),
    ("forge-cache", "Ember forge cache", ["ember_cache_target"], "current generated game model"),
    ("observatory", "Fen observatory", ["fen_observatory_target"], "current generated game model"),
    ("barricades", "Camp barricade family", ["barricade_target"], "current generated game model"),
    ("survey-module", "Survey wreck assembly", ["survey_wreck_target"], "current generated game model"),
    ("rootfall-candidate", "Rootfall pending candidate", ["rootfall_closed_v3_target"], "pending; not integrated or admitted"),
    ("tidefin-candidate", "Tidefin pending candidate", ["tidefin_neutral_v1_target"], "pending; not integrated or admitted"),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int):
    for candidate in ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def contact_sheet(entries: list[dict], destination: Path, title: str) -> None:
    width, tile_w, tile_h, margin, header = 1600, 360, 330, 24, 90
    columns = 4
    rows = (len(entries) + columns - 1) // columns
    image = Image.new("RGB", (width, header + margin + rows * (tile_h + margin)), "#182029")
    draw = ImageDraw.Draw(image)
    draw.text((margin, 22), title, fill="white", font=font(32))
    for index, entry in enumerate(entries):
        x = margin + (index % columns) * (tile_w + margin)
        y = header + margin + (index // columns) * (tile_h + margin)
        draw.rounded_rectangle((x, y, x + tile_w, y + tile_h), radius=12, fill="#f2f0eb")
        with Image.open(OUT / "originals" / entry["bundle_name"]) as source:
            source = source.convert("RGB")
            source.thumbnail((tile_w - 24, 230), Image.Resampling.LANCZOS)
            px = x + (tile_w - source.width) // 2
            py = y + 12 + (230 - source.height) // 2
            image.paste(source, (px, py))
        label = entry["bundle_name"].split("-", 1)[1].rsplit(".", 1)[0]
        draw.multiline_text((x + 12, y + 250), label, fill="#1e2933", font=font(16), spacing=2)
    image.save(destination, "PNG", optimize=True)


def main() -> int:
    if OUT.exists():
        raise SystemExit(f"Refusing to overwrite existing output: {OUT}")
    OUT.mkdir(parents=True)
    originals = OUT / "originals"
    originals.mkdir()

    image_records = []
    for item in IMAGES:
        source = ROOT / item["source"]
        if not source.is_file():
            raise SystemExit(f"Missing selected source image: {item['source']}")
        destination = originals / item["bundle_name"]
        shutil.copyfile(source, destination)
        source_hash, copied_hash = sha256(source), sha256(destination)
        if source_hash != copied_hash:
            raise SystemExit(f"Copy hash mismatch: {item['source']}")
        with Image.open(source) as image:
            dimensions = [image.width, image.height]
            image_format = image.format
        image_records.append({
            **item,
            "source_path": item.pop("source"),
            "bundle_path": f"originals/{item['bundle_name']}",
            "bytes": source.stat().st_size,
            "sha256": source_hash,
            "dimensions": dimensions,
            "format": image_format,
            "copy_verified_byte_identical": True,
        })

    by_id = {item["id"]: item for item in image_records}
    family_records = [
        {
            "atlas_id": atlas_id,
            "family": name,
            "atlas_status": status,
            "source_image_ids": image_ids,
            "source_images": [by_id[image_id]["bundle_path"] for image_id in image_ids],
        }
        for atlas_id, name, image_ids, status in FAMILIES
    ]
    manifest = {
        "schema": "wildkin-source-image-bundle/v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Latest locally retained source/reference images for the 16 September 12 visual-atlas model families.",
        "atlas_manifest": ".dream-loop/visual-atlas/2026-09-12/manifest.json",
        "selection_rules": [
            "Copies in originals/ are byte-identical source images, verified with SHA-256 after copy.",
            "Literal image-to-3D inputs are labelled separately from visual targets for scripted Blender construction.",
            "Runtime/model renders, review screenshots, palettes, and rejected historical variants are excluded unless explicitly selected as a current candidate source.",
            "The approved Explorer master is retained as context only; it is not mislabeled as a direct input without a matching model receipt.",
        ],
        "families": family_records,
        "images": image_records,
        "admitted_generated_families_omitted_from_atlas": [],
        "known_missing_or_not_retained": [
            "No additional admitted generated-model family was found outside the atlas's current assets/models family inventory.",
            "Most prop/environment families have no literal image-to-3D input because their receipts record scripted Blender reconstruction from a reviewed target.",
            "Mossling-v3 is a later rig/motion revision; the retained neutral-v3 image is the exact recorded input for its mossling-v2 model predecessor, not a newly asserted direct v3 generation call.",
            "The Rootfall and Tidefin entries are preserved for comparison but remain pending candidates, not admitted runtime art.",
        ],
    }
    (OUT / "source-images-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    literal = [item for item in image_records if item["role"] == "literal_image_to_3d_input"]
    targets = [item for item in image_records if item["role"] != "literal_image_to_3d_input"]
    contact_sheet(literal, OUT / "contact-sheet-literal-inputs.png", "Literal image-to-3D inputs")
    contact_sheet(targets, OUT / "contact-sheet-targets-and-master.png", "Blender targets, candidates, and approved master")

    readme = """# Wildkin Frontier source images — September 12, 2026

This package contains the selected original images behind the 16 model families
in `.dream-loop/visual-atlas/2026-09-12/manifest.json`.  Every file in
`originals/` was copied byte-for-byte from the path recorded in
`source-images-manifest.json`; each copy is SHA-256 verified.

Start with the two contact sheets on a phone, then open an original from
`originals/`.  The manifest maps every atlas family to those originals and
states what each image actually was:

* `literal_image_to_3d_input` means a model generation receipt explicitly
  records that image as an image-to-3D input.
* `reviewed_visual_target_for_scripted_blender_model` means a human/agent
  authored Blender reconstruction used the image for visual direction.  It is
  not evidence that an image-to-3D generator made the model.
* `approved_owner_master_reference` is style context only.
* Candidate rows are included for Rootfall and Tidefin comparison, but neither
  is admitted runtime art.

The three station families intentionally share one target image; both Fen-bank
outcrop components intentionally share one target image.  No additional
admitted generated-model family was found outside the atlas inventory.  Model
renders, review screenshots, generated palettes, and historical rejected
variants are deliberately not presented as model inputs.

Known provenance boundary: Mossling v3 is a retained rig/motion revision of
the v2 geometry source.  The included neutral-v3 image is the exact recorded
literal input for that predecessor; this package does not invent a separate
v3 image-generation call.
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    if ARCHIVE.exists():
        raise SystemExit(f"Refusing to overwrite existing archive: {ARCHIVE}")
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(OUT.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(OUT.parent))
    print(json.dumps({
        "output": str(OUT),
        "archive": str(ARCHIVE),
        "image_count": len(image_records),
        "family_count": len(family_records),
        "literal_input_count": len(literal),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
