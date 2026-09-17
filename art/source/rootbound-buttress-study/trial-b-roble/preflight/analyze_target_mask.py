"""Read-only numerical silhouette analysis for Trial B's approved source image.

The script creates no image assets. It prints JSON from the opaque-white target
so the builder can use measured screen-space landmarks without treating a
single perspective view as orthographic geometry.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


TARGET = Path("art/source/rootbound-buttress-v1/reference/target-v1.png")


def intervals(values: list[bool]) -> list[list[int]]:
    result: list[list[int]] = []
    start = None
    for index, value in enumerate(values + [False]):
        if value and start is None:
            start = index
        elif not value and start is not None:
            result.append([start, index - 1])
            start = None
    return result


def main() -> None:
    image = Image.open(TARGET).convert("RGB")
    width, height = image.size
    pixels = image.load()

    # The approved image has opaque near-white ground. This conservative mask
    # retains colored subject pixels and omits the white background only.
    mask = [[min(pixels[x, y]) < 235 for x in range(width)] for y in range(height)]
    xs = [x for y in range(height) for x in range(width) if mask[y][x]]
    ys = [y for y in range(height) for x in range(width) if mask[y][x]]
    left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)

    sample_rows = [
        ("top_peak", 0.06),
        ("high_canopy", 0.18),
        ("lobe_band", 0.34),
        ("fork_window_band", 0.49),
        ("lower_trunk", 0.67),
        ("buttress_shoulder", 0.82),
        ("ground_toes", 0.93),
    ]
    rows = []
    for label, normalized_y in sample_rows:
        y = round(normalized_y * (height - 1))
        runs = intervals(mask[y])
        rows.append({
            "label": label,
            "pixelY": y,
            "normalizedY": round(y / (height - 1), 4),
            "foregroundIntervalsPx": runs,
            "foregroundIntervalsNormalized": [
                [round(a / (width - 1), 4), round(b / (width - 1), 4)]
                for a, b in runs
            ],
        })

    # A deliberately broad color class separates the warm trunk/branch mass
    # from green canopy for landmarking. It is not material extraction.
    bark_rows = []
    for label, normalized_y in [
        ("upper_fork", 0.30), ("major_forks", 0.42),
        ("window_band", 0.48), ("trunk", 0.60),
        ("root_collar", 0.74), ("root_spread", 0.82),
        ("toe_band", 0.90),
    ]:
        y = round(normalized_y * (height - 1))
        bark = []
        for x in range(width):
            red, green, blue = pixels[x, y]
            bark.append(red > green * 1.08 and red > blue * 1.20 and red > 45)
        runs = [run for run in intervals(bark) if run[1] - run[0] >= 12]
        bark_rows.append({
            "label": label,
            "pixelY": y,
            "barkIntervalsPx": runs,
            "barkIntervalsNormalized": [
                [round(a / (width - 1), 4), round(b / (width - 1), 4)]
                for a, b in runs
            ],
        })

    # At the lower silhouette, record each visible toe's bottommost extent as
    # screen-space landmarks. They are not a count of hidden rear buttresses.
    toe_columns = []
    for x in range(left, right + 1):
        occupied = [y for y in range(round(height * 0.70), height) if mask[y][x]]
        if occupied:
            toe_columns.append((x, max(occupied)))
    local_minima = []
    for index in range(2, len(toe_columns) - 2):
        x, y = toe_columns[index]
        nearby = [pair[1] for pair in toe_columns[index - 2:index + 3]]
        if y == max(nearby) and y > nearby[0] and y >= nearby[-1]:
            if not local_minima or x - local_minima[-1][0] > 18:
                local_minima.append((x, y))

    report = {
        "schema": "trial-b-roble-target-mask-analysis/v1",
        "method": {
            "source": str(TARGET).replace("\\", "/"),
            "sha256": hashlib.sha256(TARGET.read_bytes()).hexdigest(),
            "image": {"width": width, "height": height, "mode": "RGB"},
            "mask": "subject pixel when min(R,G,B) < 235; numerical analysis only; no image output",
            "limit": "A single perspective three-quarter view fixes screen-space silhouette landmarks only. Rear form, depth, topology, and exact world dimensions remain inferred.",
        },
        "foregroundBounds": {
            "pixels": {"left": left, "right": right, "top": top, "bottom": bottom, "width": right - left + 1, "height": bottom - top + 1},
            "normalized": {"left": round(left / (width - 1), 4), "right": round(right / (width - 1), 4), "top": round(top / (height - 1), 4), "bottom": round(bottom / (height - 1), 4)},
        },
        "rowIntervals": rows,
        "barkColorLandmarkBands": bark_rows,
        "visibleToeBottomLandmarks": [
            {"pixel": [x, y], "normalized": [round(x / (width - 1), 4), round(y / (height - 1), 4)]}
            for x, y in local_minima
        ],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
