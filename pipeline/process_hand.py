#!/usr/bin/env python3
"""
Process the photographed drawing-hand assets.

Input : remotion/public/hand/<source photos> (hand holding a pen, any plain
        background — here a white/grey transparency checkerboard baked in).
Output: remotion/public/hand/processed/<id>.png  (tight transparent PNGs)
        remotion/public/hand/hand.json            (pen-tip, scale, angle)

Matting uses rembg (u2net + alpha matting) for clean edges around the fingers
and pen, then trims to a tight box. The pen tip is located as the extreme
opaque pixel in the direction the pen points (configured per image). Scales are
normalised so both hands render at the same palm width on the 1080p canvas.

Usage:  .venv/bin/python pipeline/process_hand.py
Deps :  pip install rembg[cpu] pillow numpy   (only needed to re-process)
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

REPO = Path(__file__).resolve().parent.parent
HAND = REPO / "remotion" / "public" / "hand"
TARGET_PALM = 165.0  # on-screen px → both hands end up the same size

# Per-source config: tip direction + natural pen shaft angle (degrees).
SOURCES = [
    {"id": "grip1", "file": "hand 1.png", "tip": "top", "shaftAngleDeg": 89},
    {"id": "grip2", "file": "hand 2.png", "tip": "left", "shaftAngleDeg": 30},
]


def find_tip(alpha: np.ndarray, mode: str) -> tuple[int, int]:
    ys, xs = np.where(alpha > 40)
    if mode == "top":
        y = int(ys.min())
        return int(round(xs[ys == y].mean())), y
    x = int(xs.min())
    return x, int(round(ys[xs == x].mean()))


def palm_width(alpha: np.ndarray) -> int:
    h = alpha.shape[0]
    widths = []
    for row in alpha[int(h * 0.45):] > 40:
        cols = np.where(row)[0]
        if len(cols):
            widths.append(cols.max() - cols.min() + 1)
    return int(np.percentile(widths, 85)) if widths else alpha.shape[1]


def main() -> None:
    (HAND / "processed").mkdir(parents=True, exist_ok=True)
    session = new_session("u2net")
    images = []
    for src in SOURCES:
        img = Image.open(HAND / src["file"]).convert("RGBA")
        cut = remove(
            img,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=2,
        )
        a = np.array(cut)[:, :, 3]
        ys, xs = np.where(a > 40)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        cut = cut.crop(box)
        alpha = np.array(cut)[:, :, 3]
        tip = find_tip(alpha, src["tip"])
        rh = int(round(cut.size[1] * TARGET_PALM / palm_width(alpha)))
        out = HAND / "processed" / f"{src['id']}.png"
        cut.save(out)
        print(f"{src['id']}: {cut.size[0]}x{cut.size[1]} tip={tip} renderHeight={rh}")
        images.append({
            "id": src["id"],
            "src": f"hand/processed/{src['id']}.png",
            "width": cut.size[0],
            "height": cut.size[1],
            "penTip": {"x": tip[0], "y": tip[1]},
            "renderHeight": rh,
            "shaftAngleDeg": src["shaftAngleDeg"],
        })

    (HAND / "hand.json").write_text(json.dumps({"images": images}, indent=2))
    print(f"Wrote {HAND / 'hand.json'}")


if __name__ == "__main__":
    main()
