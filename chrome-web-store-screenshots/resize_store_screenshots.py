#!/usr/bin/env python3
"""Resize screenshots to Chrome Web Store 640×400 (16:10) without distortion.

Fits each image inside the canvas with uniform scaling, then pads with white.
Outputs JPEG (no alpha) as required by the store.

Run from repo root or this folder: python resize_store_screenshots.py
"""

from __future__ import annotations

import os

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = ROOT
BG = (255, 255, 255)
JPEG_QUALITY = 92

# Source PNG filenames in this directory -> output base name
JOBS = [
    ("single price green.png", "single-price-green"),
    ("single price red.png", "single-price-red"),
    ("price range.png", "price-range"),
    ("Farbeinstellungen.png", "farbeinstellungen"),
    ("Suchergebnisse.png", "suchergebnisse"),
]

SIZES = ((640, 400),)


def fit_pad(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Scale uniformly so image fits inside tw×th; pad with BG centered."""
    img = img.convert("RGB")
    w, h = img.size
    scale = min(tw / w, th / h)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (tw, th), BG)
    x = (tw - nw) // 2
    y = (th - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename, base in JOBS:
        path = os.path.join(ROOT, filename)
        if not os.path.isfile(path):
            raise SystemExit(f"Missing file: {path}")

        img = Image.open(path)
        for tw, th in SIZES:
            out = fit_pad(img, tw, th)
            name = f"{base}-{tw}x{th}.jpg"
            dest = os.path.join(OUTPUT_DIR, name)
            out.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)
            print("Wrote", dest)


if __name__ == "__main__":
    main()
