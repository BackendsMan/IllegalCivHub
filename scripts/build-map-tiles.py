"""Bake the orange coastline glow into the Liberty City map tiles.

Downloads the GTA IV tiles (same source as tfb.turf-map.io), adds the glow, and writes
public/map-tiles/{z}/{x}/{y}.webp plus a one-piece backdrop (full.webp). The glow is computed once at zoom 3 and scaled to every
other zoom, so it covers the same geographic area at every zoom level (no jumping while zooming).

Run:  python scripts/build-map-tiles.py      (needs Pillow + numpy; re-run to change the glow)
"""
import io
import os
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageFilter

SRC = 'https://cdn.jsdelivr.net/gh/interactive-game-maps/grand_theft_auto_iv@master/map_tiles/{z}/{x}/{y}.png'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'map-tiles')
CACHE = os.path.join(os.path.dirname(__file__), '..', '.tile-cache')
ZOOMS = range(2, 6)
SEA = (94, 124, 143)
BASE_Z = 3  # glow is designed at this zoom (6x4 tiles)

# (dilate px, blur px, color, opacity) at BASE_Z, outermost first
BANDS = [
    (20, 16, (156, 34, 7), 0.85),
    (10, 7, (226, 64, 11), 0.95),
    (3, 2, (255, 122, 31), 1.0),
]


def grid(z):
    s = 2 ** (z - 3)
    return int(6 * s) or 3, int(4 * s) or 2  # z2 → 3x2


def fetch(z, x, y):
    path = os.path.join(CACHE, str(z), str(x), f'{y}.png')
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            data = urllib.request.urlopen(SRC.format(z=z, x=x, y=y), timeout=30).read()
        except urllib.error.HTTPError:
            data = b''  # missing tile = open sea
        with open(path, 'wb') as f:
            f.write(data)
    data = open(path, 'rb').read()
    if not data:
        return Image.new('RGB', (256, 256), SEA)
    tile = Image.open(io.BytesIO(data)).convert('RGBA')
    bg = Image.new('RGBA', tile.size, SEA + (255,))
    return Image.alpha_composite(bg, tile).convert('RGB')


def stitch(z):
    w, h = grid(z)
    canvas = Image.new('RGB', (w * 256, h * 256), SEA)
    with ThreadPoolExecutor(16) as pool:
        jobs = {(x, y): pool.submit(fetch, z, x, y) for x in range(w) for y in range(h)}
    for (x, y), job in jobs.items():
        canvas.paste(job.result(), (x * 256, y * 256))
    return canvas


def land_mask(img):
    """1 on land/roads, 0 on sea. Sea is blue (B well above R); land and roads are grey."""
    a = np.asarray(img, dtype=np.float32)
    return np.clip((a[..., 2] - a[..., 0] - 40) / -25, 0, 1)  # B-R: sea≈49 → 0, grey≈0..10 → 1


def dilate(mask_img, r):
    for _ in range(r):
        mask_img = mask_img.filter(ImageFilter.MaxFilter(3))
    return mask_img


def glow_layers(base_img):
    m = Image.fromarray((land_mask(base_img) * 255).astype(np.uint8), 'L')
    return [(dilate(m, d).filter(ImageFilter.GaussianBlur(b)), color, op) for d, b, color, op in BANDS]


def main():
    print('building glow at zoom', BASE_Z)
    layers = glow_layers(stitch(BASE_Z))
    for z in ZOOMS:
        img = stitch(z)
        size = img.size
        out = np.asarray(img, dtype=np.float32)
        land = land_mask(img)[..., None]
        sea_part = out.copy()
        for alpha_img, color, op in layers:
            a = np.asarray(alpha_img.resize(size, Image.BICUBIC), dtype=np.float32)[..., None] / 255 * op
            sea_part = sea_part * (1 - a) + np.array(color, dtype=np.float32) * a
        result = Image.fromarray((out * land + sea_part * (1 - land)).clip(0, 255).astype(np.uint8))
        if z == 4:  # one-piece backdrop shown under the tiles, so zooming never reveals gaps
            result.save(os.path.join(OUT, 'full.webp'), quality=82, method=6)
        w, h = grid(z)
        for x in range(w):
            for y in range(h):
                d = os.path.join(OUT, str(z), str(x))
                os.makedirs(d, exist_ok=True)
                result.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(os.path.join(d, f'{y}.webp'), quality=88, method=6)
        print(f'zoom {z}: {w * h} tiles')


if __name__ == '__main__':
    main()
