"""Compose matched U4F-C1 review boards and binary silhouette comparisons."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import numpy as np


VIEWS = ("primary", "opposite", "front", "back", "left", "right", "top", "underside")
BACKGROUND = (44, 48, 53, 255)
HEADER_HEIGHT = 34


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_capture(path: Path) -> Image.Image:
    with Image.open(path) as source:
        rgba = source.convert("RGBA")
    if rgba.size != (512, 512):
        rgba = rgba.resize((512, 512), Image.Resampling.LANCZOS)
    background = Image.new("RGBA", rgba.size, BACKGROUND)
    background.alpha_composite(rgba)
    return background.convert("RGB")


def silhouette(path: Path) -> np.ndarray:
    with Image.open(path) as source:
        rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8)
    if rgba.shape[:2] != (512, 512):
        rgba = np.asarray(Image.fromarray(rgba).resize((512, 512), Image.Resampling.NEAREST))
    return rgba[:, :, 3] > 0


def bounds(mask: np.ndarray) -> list[int] | None:
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def silhouette_metrics(raw: np.ndarray, candidate: np.ndarray) -> dict:
    intersection = int(np.count_nonzero(raw & candidate))
    union = int(np.count_nonzero(raw | candidate))
    raw_area = int(np.count_nonzero(raw))
    candidate_area = int(np.count_nonzero(candidate))
    raw_center = np.argwhere(raw).mean(axis=0) if raw_area else np.array([float("nan"), float("nan")])
    candidate_center = np.argwhere(candidate).mean(axis=0) if candidate_area else np.array([float("nan"), float("nan")])
    return {
        "rawPixels": raw_area,
        "candidatePixels": candidate_area,
        "intersectionOverUnion": intersection / union if union else None,
        "symmetricDifferencePixels": int(np.count_nonzero(raw ^ candidate)),
        "symmetricDifferenceFractionOfRaw": float(np.count_nonzero(raw ^ candidate) / raw_area) if raw_area else None,
        "centroidShiftPixelsYX": (candidate_center - raw_center).astype(float).tolist(),
        "rawBoundsXYXY": bounds(raw),
        "candidateBoundsXYXY": bounds(candidate),
    }


def make_silhouette_overlay(raw: np.ndarray, candidate: np.ndarray) -> Image.Image:
    pixels = np.zeros((512, 512, 4), dtype=np.uint8)
    pixels[:, :, :3] = np.array([46, 50, 55], dtype=np.uint8)
    pixels[:, :, 3] = 255
    pixels[raw & ~candidate] = (244, 62, 49, 255)
    pixels[candidate & ~raw] = (20, 205, 224, 255)
    pixels[raw & candidate] = (238, 235, 220, 255)
    return Image.fromarray(pixels, "RGBA").convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("pre-reduction", "final"), required=True)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--metrics", required=True, type=Path)
    parser.add_argument("--pre-repair-dir", type=Path, help="also compose raw-to-working-to-focused-repair underside trace")
    args = parser.parse_args()
    inputs = args.input_dir.resolve()
    reference_path = args.reference.resolve()
    output_dir = args.output_dir.resolve()
    metrics_path = args.metrics.resolve()
    if not inputs.is_dir() or not reference_path.is_file():
        raise ValueError("input capture directory and reference image must exist")
    output_dir.mkdir(parents=True, exist_ok=True)
    reference = load_capture(reference_path)
    image_hashes: dict[str, str] = {"reference": sha256(reference_path)}
    silhouette_results: dict[str, dict] = {}
    capture_labels = ("raw", "working") if args.mode == "pre-reduction" else ("raw", "pristine", "stamp")
    reference_label = "APPROVED REFERENCE"
    font = ImageFont.load_default()

    for view in VIEWS:
        paths = {label: inputs / f"{label}-{view}.png" for label in capture_labels}
        missing = [str(path) for path in paths.values() if not path.is_file()]
        if missing:
            raise FileNotFoundError("missing matched-view captures: " + ", ".join(missing))
        images = {label: load_capture(path) for label, path in paths.items()}
        for label, path in paths.items():
            image_hashes[path.name] = sha256(path)
        if view == "underside" and args.mode == "final":
            panels = [(label, images[label]) for label in capture_labels]
        else:
            panels = [(reference_label, reference)] + [(label.upper(), images[label]) for label in capture_labels]
        board = Image.new("RGB", (len(panels) * 512, 512 + HEADER_HEIGHT), BACKGROUND[:3])
        draw = ImageDraw.Draw(board)
        for index, (label, image) in enumerate(panels):
            board.paste(image, (index * 512, HEADER_HEIGHT))
            draw.text((index * 512 + 9, 10), label, font=font, fill=(237, 236, 230))
        board_name = (f"pre-reduction-{view}.png" if args.mode == "pre-reduction" else f"comparison-{view}.png")
        board.save(output_dir / board_name, format="PNG", optimize=True)
        image_hashes[board_name] = sha256(output_dir / board_name)

        if "raw" in images:
            raw_mask = silhouette(paths["raw"])
            for label in ("working",) if args.mode == "pre-reduction" else ("pristine", "stamp"):
                candidate_mask = silhouette(paths[label])
                metrics = silhouette_metrics(raw_mask, candidate_mask)
                silhouette_results.setdefault(label, {})[view] = metrics
                overlay_name = f"silhouette-{label}-{view}.png"
                make_silhouette_overlay(raw_mask, candidate_mask).save(output_dir / overlay_name, optimize=True)
                image_hashes[overlay_name] = sha256(output_dir / overlay_name)

    if args.mode == "final":
        underside = load_capture(inputs / "raw-underside.png")
        pristine = load_capture(inputs / "pristine-underside.png")
        stamp = load_capture(inputs / "stamp-underside.png")
        progression = Image.new("RGB", (3 * 512, 512 + HEADER_HEIGHT), BACKGROUND[:3])
        draw = ImageDraw.Draw(progression)
        for index, (label, image) in enumerate((("RAW UNDERSIDE", underside), ("PRISTINE CLEAN UNDERSIDE", pristine), ("STAMP-SOURCE UNDERSIDE", stamp))):
            progression.paste(image, (index * 512, HEADER_HEIGHT))
            draw.text((index * 512 + 9, 10), label, font=font, fill=(237, 236, 230))
        progression.save(output_dir / "underside-progression.png", optimize=True)
        image_hashes["underside-progression.png"] = sha256(output_dir / "underside-progression.png")

    if args.pre_repair_dir is not None:
        earlier = args.pre_repair_dir.resolve()
        trace_images = (
            ("RAW UNDERSIDE", load_capture(inputs / "raw-underside.png")),
            ("INITIAL CLOSED WORKING SOLID", load_capture(earlier / "working-underside.png")),
            ("AFTER ONE FOCUSED REPAIR", load_capture(inputs / "working-underside.png")),
        )
        trace = Image.new("RGB", (3 * 512, 512 + HEADER_HEIGHT), BACKGROUND[:3])
        draw = ImageDraw.Draw(trace)
        for index, (label, image) in enumerate(trace_images):
            trace.paste(image, (index * 512, HEADER_HEIGHT))
            draw.text((index * 512 + 9, 10), label, font=font, fill=(237, 236, 230))
        trace_name = "underside-progression-hold.png"
        trace.save(output_dir / trace_name, optimize=True)
        image_hashes[trace_name] = sha256(output_dir / trace_name)

    result = {
        "status": args.mode,
        "viewSet": list(VIEWS),
        "cameraConvention": "all 3D captures from one Blender camera/light setup and raw-based frame; reference is an image panel only",
        "silhouetteMethod": "alpha mask IoU and symmetric difference on matched 512x512 transparent Blender renders",
        "silhouetteComparisons": silhouette_results,
        "captureAndBoardSha256": image_hashes,
    }
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
