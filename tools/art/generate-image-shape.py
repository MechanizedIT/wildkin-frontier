#!/usr/bin/env python3
"""Generate one untextured GLB/OBJ from a clean transparent image, locally.

This wrapper deliberately never downloads weights or auxiliary models.  It is for
the isolated Hunyuan3D-2 shape runtime in ``.dream-loop/local3d``; the model
checkout/weights must be supplied locally after the owner has accepted their
upstream license.  Keeping this narrow preserves the later Blender palette and
cleanup workflow instead of invoking the texture pipeline.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=root / ".dream-loop/all3d-targets/mossling-image3d-input.png",
        help="A PNG with the asset isolated against transparent alpha.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=root / ".dream-loop/local3d/outputs/mossling-image3d.glb",
        help="Destination .glb or .obj file.",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=root / ".dream-loop/local3d/models/hunyuan3d-dit-v2-mini-turbo",
        help="Local shape checkpoint directory; network identifiers are rejected.",
    )
    return parser.parse_args()


def fail(message: str) -> None:
    raise SystemExit(f"image-to-3d: {message}")


def main() -> None:
    args = parse_args()
    if args.output.suffix.lower() not in {".glb", ".obj"}:
        fail("--output must end in .glb or .obj")
    if not args.input.is_file():
        fail(f"input does not exist: {args.input}")
    if not args.model.is_dir():
        fail(
            f"local checkpoint does not exist: {args.model}\n"
            "This wrapper intentionally does not download model weights."
        )

    try:
        from PIL import Image
        from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
    except ImportError as exc:
        fail(
            "isolated Hunyuan runtime is not installed. Install its upstream code "
            "inside .dream-loop/local3d only after the owner accepts its license.\n"
            f"Missing dependency: {exc.name}"
        )

    image = Image.open(args.input).convert("RGBA")
    alpha_min, alpha_max = image.getchannel("A").getextrema()
    if alpha_min == 255:
        fail(
            "input has no transparent background. Export a clean cutout PNG first; "
            "this avoids invoking an auxiliary background-removal model."
        )
    if alpha_max == 0:
        fail("input is fully transparent")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    print(f"Loading local shape checkpoint: {args.model}", flush=True)
    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        str(args.model), local_files_only=True
    )
    print(f"Generating untextured mesh from: {args.input}", flush=True)
    mesh = pipeline(image=image)[0]
    mesh.export(str(args.output))
    print(f"Wrote {args.output}", flush=True)


if __name__ == "__main__":
    main()
