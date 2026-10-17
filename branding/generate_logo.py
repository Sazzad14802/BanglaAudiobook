"""
BornoVerse logo generator.

The mark is defined once as geometry (headphones, sound bars, open book) and
emitted both as an SVG and as anti-aliased PNGs, so every asset is identical
and any size renders crisply. Requires only Pillow.

    python branding/generate_logo.py

Outputs go to branding/exports/ and are copied into app/assets and admin/public.
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "branding" / "exports"

DARK = "#13AD81"
LIGHT = "#56DDA4"
CX2 = 1251  # mirror axis x = 625.5 in the 1254-unit design grid
VIEW = (126, 126, 1000, 1000)  # square crop around the mark (x, y, w, h)


# ── Geometry primitives: each returns (svg_path_d, polygon_points) ───────────

def bezier(p0, p1, p2, p3, steps=48):
    pts = []
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1 - t
        pts.append((
            mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0],
            mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1],
        ))
    return pts


class Path2D:
    """Tiny path builder that tracks both SVG commands and a flattened polygon."""

    def __init__(self, x, y):
        self.d = [f"M{x:.1f} {y:.1f}"]
        self.pts = [(x, y)]

    @property
    def cur(self):
        return self.pts[-1]

    def line(self, x, y):
        self.d.append(f"L{x:.1f} {y:.1f}")
        self.pts.append((x, y))
        return self

    def curve(self, c1, c2, end):
        self.d.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {end[0]:.1f} {end[1]:.1f}")
        self.pts.extend(bezier(self.cur, c1, c2, end))
        return self

    def arc(self, cx, cy, rx, ry, a0, a1, steps=40):
        """Elliptical arc around (cx, cy) from angle a0 to a1 (degrees, y down)."""
        end = (cx + rx * math.cos(math.radians(a1)), cy + ry * math.sin(math.radians(a1)))
        large = 1 if abs(a1 - a0) > 180 else 0
        sweep = 1 if a1 > a0 else 0
        self.d.append(f"A{rx:.1f} {ry:.1f} 0 {large} {sweep} {end[0]:.1f} {end[1]:.1f}")
        for i in range(1, steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            self.pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
        return self

    def close(self):
        self.d.append("Z")
        return " ".join(self.d), self.pts


def rounded_rect(x0, y0, x1, y1, tl, tr, br, bl):
    p = Path2D(x0 + tl, y0)
    p.line(x1 - tr, y0)
    if tr:
        p.arc(x1 - tr, y0 + tr, tr, tr, -90, 0)
    p.line(x1, y1 - br)
    if br:
        p.arc(x1 - br, y1 - br, br, br, 0, 90)
    p.line(x0 + bl, y1)
    if bl:
        p.arc(x0 + bl, y1 - bl, bl, bl, 90, 180)
    p.line(x0, y0 + tl)
    if tl:
        p.arc(x0 + tl, y0 + tl, tl, tl, 180, 270)
    return p.close()


def mirror(points):
    return [(CX2 - x, y) for x, y in points]


def mirror_d(d: str) -> str:
    """Mirror an SVG path built by Path2D across the vertical axis."""
    out, tokens = [], d.split()
    i = 0
    while i < len(tokens):
        t = tokens[i]
        cmd, rest = t[0], t[1:]
        if cmd in "ML":
            x, y = float(rest), float(tokens[i + 1])
            out.append(f"{cmd}{CX2 - x:.1f} {y:.1f}")
            i += 2
        elif cmd == "C":
            vals = [float(rest)] + [float(v) for v in tokens[i + 1:i + 6]]
            mirrored = [f"{CX2 - vals[k]:.1f} {vals[k + 1]:.1f}" for k in (0, 2, 4)]
            out.append("C" + " ".join(mirrored))
            i += 6
        elif cmd == "A":
            rx, ry, rot, large, sweep, x, y = [float(rest)] + [float(v) for v in tokens[i + 1:i + 7]]
            out.append(f"A{rx:.1f} {ry:.1f} 0 {int(large)} {1 - int(sweep)} {CX2 - x:.1f} {y:.1f}")
            i += 7
        else:  # Z
            out.append(t)
            i += 1
    return " ".join(out)


# ── The mark ─────────────────────────────────────────────────────────────────

def build_shapes():
    shapes = []  # (color, svg_d, points)

    def add(color, shape, mirrored_color=None):
        d, pts = shape
        shapes.append((color, d, pts))
        if mirrored_color:
            shapes.append((mirrored_color, mirror_d(d), mirror(pts)))

    # Headband: elliptical ring (outer a=343,b=315 / inner a=285,b=257) cut at y=378.
    cx, cy = CX2 / 2, 470
    def angle(a, b, y):
        return math.degrees(math.asin((y - cy) / b))
    end_o, end_i = angle(343, 315, 378), angle(285, 257, 378)
    band = Path2D(cx + 343 * math.cos(math.radians(180 - end_o)), 378)
    band.arc(cx, cy, 343, 315, 180 - end_o, 360 + end_o, steps=120)
    band.line(cx + 285 * math.cos(math.radians(end_i)), 378)
    band.arc(cx, cy, 285, 257, 360 + end_i, 180 - end_i, steps=120)
    add(DARK, band.close())

    # Ear cups: outer "D" shells and inner pads (left pad dark, right pad light).
    add(DARK, rounded_rect(229, 397, 318, 598, 82, 14, 14, 82), mirrored_color=DARK)
    left_pad = rounded_rect(340, 378, 398, 614, 6, 46, 46, 6)
    add(DARK, left_pad)
    shapes.append((LIGHT, mirror_d(left_pad[0]), mirror(left_pad[1])))

    # Sound bars (rounded capsules).
    for x0, x1, y0, y1 in [(455, 496, 428, 542), (525, 566, 370, 587), (604, 647, 310, 645)]:
        r = (x1 - x0) / 2
        bar = rounded_rect(x0, y0, x1, y1, r, r, r, r)
        add(LIGHT, bar)
        if x0 != 604:
            shapes.append((LIGHT, mirror_d(bar[0]), mirror(bar[1])))

    # Cover: thick swoosh under the pages.
    cover = Path2D(158, 714)
    cover.arc(181, 714, 23, 23, 180, 360, steps=20)
    cover.line(214, 900)
    cover.curve((216, 925), (240, 931), (300, 937))
    cover.curve((440, 950), (560, 990), (625.5, 1050))
    cover.curve((690, 990), (811, 950), (951, 937))
    cover.curve((1011, 931), (1035, 925), (1037, 900))
    cover.line(1047, 714)
    cover.arc(1070, 714, 23, 23, 180, 360, steps=20)
    cover.line(1095, 912)
    cover.curve((1095, 980), (1000, 990), (880, 1004))
    cover.curve((760, 1020), (670, 1050), (625.5, 1097))
    cover.curve((581, 1050), (491, 1020), (371, 1004))
    cover.curve((251, 990), (156, 980), (156, 912))
    cover.line(158, 714)
    add(DARK, cover.close())

    # Pages: left dark, right light, separated by a hairline at the spine.
    page = Path2D(242, 614)
    page.curve((420, 628), (560, 690), (622, 792))
    page.line(622, 1046)
    page.curve((560, 985), (420, 925), (276, 900))
    page.curve((258, 897), (248, 885), (246, 866))
    page.line(228, 630)
    page.curve((227, 620), (233, 613), (242, 614))
    d, pts = page.close()
    shapes.append((DARK, d, pts))
    shapes.append((LIGHT, mirror_d(d).replace("M629.0", "M629.0"), mirror(pts)))
    return shapes


SHAPES = build_shapes()


def svg(fill_dark=DARK, fill_light=LIGHT, view=VIEW) -> str:
    x, y, w, h = view
    paths = "\n  ".join(
        f'<path fill="{fill_dark if c == DARK else fill_light}" d="{d}"/>' for c, d, _ in SHAPES
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" role="img" aria-label="BornoVerse">\n'
        f"  <title>BornoVerse</title>\n  {paths}\n</svg>\n"
    )


def render(size: int, scale: float = 1.0, background=None, mono=None) -> Image.Image:
    """Render the mark into a size×size image; `scale` is the mark's share of the canvas."""
    ss = 4
    big = size * ss
    canvas = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    vx, vy, vw, _ = VIEW
    k = big * scale / vw
    offset = big * (1 - scale) / 2
    for color, _, pts in SHAPES:
        fill = mono or color
        draw.polygon([((x - vx) * k + offset, (y - vy) * k + offset) for x, y in pts], fill=fill)
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    DIST.mkdir(parents=True, exist_ok=True)
    (DIST / "bornoverse-logo.svg").write_text(svg(), encoding="utf-8")
    (DIST / "bornoverse-logo-white.svg").write_text(svg("#FFFFFF", "#FFFFFF"), encoding="utf-8")
    (DIST / "bornoverse-logo-dark.svg").write_text(svg("#0B5E47", "#0B5E47"), encoding="utf-8")

    for size in (16, 32, 48, 64, 128, 180, 192, 256, 512, 1024, 2048):
        render(size).save(DIST / f"bornoverse-logo-{size}.png", optimize=True)
    render(1024, mono="#FFFFFF").save(DIST / "bornoverse-logo-white-1024.png", optimize=True)

    # App icon: white tile, mark at 78% (stores require an opaque square).
    render(1024, 0.78, background="#FFFFFF").convert("RGB").save(DIST / "app-icon-1024.png", optimize=True)
    # Android adaptive icon: mark inside the 66% safe zone on a separate background layer.
    render(1024, 0.6).save(DIST / "android-icon-foreground.png", optimize=True)
    Image.new("RGB", (1024, 1024), "#FFFFFF").save(DIST / "android-icon-background.png")
    render(1024, 0.6, mono="#000000").save(DIST / "android-icon-monochrome.png", optimize=True)
    # Android status-bar notification icon: white silhouette on transparency.
    render(96, 0.86, mono="#FFFFFF").save(DIST / "notification-icon.png", optimize=True)
    # Splash + in-app logo (transparent).
    render(1024, 0.9).save(DIST / "splash-icon.png", optimize=True)
    render(48).save(DIST / "favicon.png", optimize=True)
    render(256).save(DIST / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    render(180, 0.8, background="#FFFFFF").convert("RGB").save(DIST / "apple-touch-icon.png", optimize=True)

    app_assets = ROOT / "app" / "assets"
    for src, dst in [
        ("app-icon-1024.png", "icon.png"),
        ("android-icon-foreground.png", "android-icon-foreground.png"),
        ("android-icon-background.png", "android-icon-background.png"),
        ("android-icon-monochrome.png", "android-icon-monochrome.png"),
        ("notification-icon.png", "notification-icon.png"),
        ("splash-icon.png", "splash-icon.png"),
        ("bornoverse-logo-512.png", "logo.png"),
        ("favicon.png", "favicon.png"),
    ]:
        shutil.copyfile(DIST / src, app_assets / dst)

    admin_public = ROOT / "admin" / "public"
    admin_public.mkdir(exist_ok=True)
    for src, dst in [
        ("bornoverse-logo.svg", "logo.svg"),
        ("bornoverse-logo.svg", "favicon.svg"),
        ("favicon.ico", "favicon.ico"),
        ("apple-touch-icon.png", "apple-touch-icon.png"),
        ("bornoverse-logo-192.png", "logo-192.png"),
    ]:
        shutil.copyfile(DIST / src, admin_public / dst)
    print(f"Wrote {len(list(DIST.iterdir()))} files to {DIST}")


if __name__ == "__main__":
    main()
