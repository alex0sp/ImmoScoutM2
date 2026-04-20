#!/usr/bin/env python3
"""Generate logo PNGs for the ImmoScout €/m² Badge extension.

Renders at 1024×1024 then downscales with LANCZOS for crisp Retina-ready icons.
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [256, 128, 48, 16]
RENDER_SIZE = 1024
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

BG_COLOR = (61, 245, 221)
BADGE_BG = (255, 255, 255)
BADGE_TEXT = (0, 0, 0)
BLACK = (0, 0, 0)


def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    r = radius
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.pieslice([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=fill)


def create_master(s=RENDER_SIZE):
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(s * 0.04)
    corner_r = int(s * 0.18)

    draw_rounded_rect(draw, (pad, pad, s - pad, s - pad), corner_r, BG_COLOR)

    roof_top = (s * 0.50, s * 0.10)
    roof_left = (s * 0.12, s * 0.42)
    roof_right = (s * 0.88, s * 0.42)
    draw.polygon([roof_top, roof_left, roof_right], fill=BLACK)

    draw.rectangle([s * 0.20, s * 0.36, s * 0.80, s * 0.58], fill=BLACK)

    badge_top = s * 0.58
    badge_bottom = s - pad - int(s * 0.06)
    badge_left = pad + int(s * 0.04)
    badge_right = s - pad - int(s * 0.04)
    badge_r = int(s * 0.10)
    draw_rounded_rect(
        draw,
        (badge_left, badge_top, badge_right, badge_bottom),
        badge_r,
        BADGE_BG,
    )

    text = "€/m²"
    font_size = int(s * 0.22)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype(
                "/System/Library/Fonts/SFCompact.ttf", font_size
            )
        except (OSError, IOError):
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (badge_left + badge_right) / 2 - tw / 2
    ty = (badge_top + badge_bottom) / 2 - (bbox[3] - bbox[1]) / 2 - bbox[1]
    draw.text((tx, ty), text, fill=BADGE_TEXT, font=font)

    return img


master = create_master()

for sz in SIZES:
    icon = master.resize((sz, sz), Image.LANCZOS)
    path = os.path.join(OUTPUT_DIR, f"icon-{sz}.png")
    icon.save(path, "PNG", optimize=True)
    print(f"Saved {path} ({sz}x{sz})")

print("Done!")
