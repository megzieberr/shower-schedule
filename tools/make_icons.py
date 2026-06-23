"""Generate the app icons (a water drop on a sky-blue tile) into ../public.

Run from anywhere with:  python tools/make_icons.py
Requires Pillow:         python -m pip install pillow
"""
import math
import os

from PIL import Image, ImageDraw

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public"))

SKY = (14, 165, 233, 255)        # tailwind sky-500
WHITE = (255, 255, 255, 255)
HIGHLIGHT = (186, 230, 253, 255)  # tailwind sky-200

# Supersample factor for smooth (anti-aliased) edges.
SS = 4


def make(size, pad_ratio=0.0, rounded=True):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=SKY)
    else:
        d.rectangle([0, 0, s - 1, s - 1], fill=SKY)

    pad = s * pad_ratio
    cx = s / 2
    top = pad + s * 0.16
    bottom = s - pad - s * 0.14
    # Bottom bulb of the drop is a circle; its centre sits a bit above the base.
    cyc = bottom - (bottom - top) * 0.30
    rad = bottom - cyc

    # Circle (the round bottom of the drop).
    d.ellipse([cx - rad, cyc - rad, cx + rad, cyc + rad], fill=WHITE)
    # Triangle (the point at the top), meeting the circle at its sides.
    ang = math.radians(50)
    lx = cx - rad * math.cos(ang)
    rx = cx + rad * math.cos(ang)
    ty = cyc - rad * math.sin(ang)
    d.polygon([(cx, top), (lx, ty), (rx, ty)], fill=WHITE)

    # A soft highlight inside the bulb.
    hr = rad * 0.30
    hx = cx - rad * 0.42
    hy = cyc - rad * 0.05
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=HIGHLIGHT)

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    make(192).save(os.path.join(OUT, "icon-192.png"))
    make(512).save(os.path.join(OUT, "icon-512.png"))
    # Maskable icon needs extra padding so nothing important is cropped.
    make(512, pad_ratio=0.14).save(os.path.join(OUT, "icon-512-maskable.png"))
    print("Wrote icon-192.png, icon-512.png, icon-512-maskable.png to", OUT)


if __name__ == "__main__":
    main()
