#!/usr/bin/env python3
"""Struck-gold relief emblems on the official blank coin (matches the 3D master set's palette and light).

Each emblem is a flat silhouette (raised) plus optional engraved grooves. A blurred height map gives a bevel; a light from the
upper left shades it with the master palette (sampled from ICON_home_letters). No text, no letters, nothing mirrored.
Usage: python3 tools/images/relief-coins.py <blank_coin_1024.png> <out_dir> [names...]
"""
import sys, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 1024
PAL = np.array([[70, 46, 10], [126, 87, 17], [170, 120, 35], [212, 161, 66], [236, 200, 120], [250, 232, 180], [255, 248, 210]], float)
STOPS = np.array([0.0, 0.18, 0.36, 0.55, 0.72, 0.88, 1.0])


def canvas():
    im = Image.new('L', (S, S), 0)
    return im, ImageDraw.Draw(im)


def relief(raised, grooves=None, bevel=14):
    m = np.asarray(raised, float) / 255
    if grooves is not None:
        g = np.asarray(grooves, float) / 255
        m = np.clip(m - g * 0.85, 0, 1)
    hmap = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(bevel)), float) / 255
    hmap = hmap * 0.65 + m * 0.35
    gy, gx = np.gradient(hmap * 60)
    n = np.dstack([-gx, -gy, np.ones_like(gx)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    light = np.array([-0.55, -0.65, 0.52]); light /= np.linalg.norm(light)
    diff = np.clip((n * light).sum(2), 0, 1)
    yy = np.linspace(1, 0, S)[:, None] * np.ones((1, S))
    shade = np.clip(0.15 + 0.62 * diff + 0.23 * yy, 0, 1)
    spec = np.clip((diff - 0.93) / 0.07, 0, 1) ** 2
    shade = np.clip(shade + 0.25 * spec, 0, 1)
    rgb = np.dstack([np.interp(shade, STOPS, PAL[:, c]) for c in range(3)])
    alpha = np.clip(m * 1.0, 0, 1)
    out = np.dstack([rgb, alpha * 255]).astype('uint8')
    emb = Image.fromarray(out, 'RGBA')
    # drop shadow, lower right, like the masters
    sh = Image.fromarray((np.clip(m, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(9))
    shadow = Image.new('RGBA', (S, S), (5, 14, 8, 0)); shadow.putalpha(sh.point(lambda p: int(p * 0.7)))
    base = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    base.alpha_composite(shadow, (10, 16))
    base.alpha_composite(emb)
    return base


def talk():
    r, d = canvas(); g, gd = canvas()
    d.rounded_rectangle([290, 330, 640, 600], 80, fill=255); d.polygon([(350, 570), (320, 690), (450, 590)], fill=255)
    d.rounded_rectangle([450, 400, 740, 630], 75, fill=255); d.polygon([(660, 600), (720, 700), (600, 615)], fill=255)
    gd.rounded_rectangle([440, 390, 750, 640], 82, outline=255, width=16)  # seam between the two bubbles
    for x in (395, 465, 535): gd.ellipse([x - 18, 447, x + 18, 483], fill=255)  # dots, not letters
    return relief(r, g)


def camera():
    r, d = canvas(); g, gd = canvas()
    d.rounded_rectangle([290, 400, 734, 690], 60, fill=255); d.rounded_rectangle([420, 340, 580, 420], 24, fill=255)
    d.rounded_rectangle([620, 360, 690, 410], 14, fill=255)
    gd.ellipse([402, 437, 622, 657], outline=255, width=22); gd.ellipse([462, 497, 562, 597], fill=255)
    d2 = ImageDraw.Draw(r); d2.ellipse([476, 511, 548, 583], fill=255)  # lens glass, raised again
    return relief(r, g)


def light():
    r, d = canvas(); g, gd = canvas()
    d.chord([300, 470, 724, 720], 0, 180, fill=255)  # lamp bowl
    d.polygon([(640, 560), (760, 520), (700, 600)], fill=255)  # spout
    d.ellipse([340, 560, 380, 600], fill=0)
    # flame
    d.polygon([(512, 300), (560, 400), (548, 470), (476, 470), (464, 400)], fill=255)
    gd.polygon([(512, 360), (532, 420), (512, 455), (492, 420)], fill=255)
    gd.line([(320, 600), (704, 600)], fill=255, width=12)
    return relief(r, g)


def games():
    r, d = canvas(); g, gd = canvas()
    for i in range(2):
        for j in range(2):
            x, y = 330 + i * 190, 330 + j * 190
            d.rounded_rectangle([x, y, x + 170, y + 170], 34, fill=255)
            gd.rounded_rectangle([x + 22, y + 22, x + 148, y + 148], 24, outline=255, width=10)
    return relief(r, g)


def books():
    r, d = canvas(); g, gd = canvas()
    d.rounded_rectangle([300, 560, 724, 690], 22, fill=255)
    d.rounded_rectangle([330, 440, 700, 565], 22, fill=255)
    d.rounded_rectangle([360, 330, 670, 445], 22, fill=255)
    for y0 in (560, 440, 330):
        gd.line([(300, y0), (724, y0)], fill=255, width=10)
    for (x0, y0, x1, y1) in ((320, 590, 700, 660), (350, 470, 680, 535), (380, 355, 650, 420)):
        gd.line([(x0 + 40, (y0 + y1) // 2), (x0 + 90, (y0 + y1) // 2)], fill=255, width=14)  # bands, not writing
    return relief(r, g)


def lab():
    r, d = canvas(); g, gd = canvas()
    d.ellipse([350, 430, 674, 754], fill=255); d.rounded_rectangle([460, 300, 564, 470], 18, fill=255)
    d.rounded_rectangle([430, 270, 594, 320], 18, fill=255)
    gd.chord([375, 455, 649, 729], 15, 165, fill=255)
    for (cx, cy, rr) in ((470, 640, 22), (550, 610, 16), (520, 680, 12)):
        ImageDraw.Draw(r).ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=255)  # bubbles stand up out of the liquid
    return relief(r, g)


def learn():
    r, d = canvas(); g, gd = canvas()
    for (x, y) in ((290, 600), (430, 480), (570, 360)):
        d.ellipse([x, y, x + 190, y + 120], fill=255); gd.ellipse([x + 40, y + 28, x + 150, y + 92], outline=255, width=10)
    return relief(r, g)


def speak():
    r, d = canvas(); g, gd = canvas()
    d.rounded_rectangle([430, 290, 594, 560], 82, fill=255)
    d.arc([380, 420, 644, 650], 0, 180, fill=255, width=26)
    d.rounded_rectangle([498, 640, 526, 710], 8, fill=255); d.rounded_rectangle([420, 700, 604, 736], 16, fill=255)
    for y in (360, 410, 460, 510): gd.line([(455, y), (569, y)], fill=255, width=10)
    return relief(r, g)


def firstday():
    r, d = canvas(); g, gd = canvas()
    d.pieslice([352, 420, 672, 740], 180, 360, fill=255)
    for ang in range(195, 346, 30):
        a = np.deg2rad(ang)
        x0, y0 = 512 + 200 * np.cos(a), 580 + 200 * np.sin(a)
        x1, y1 = 512 + 270 * np.cos(a), 580 + 270 * np.sin(a)
        d.line([(x0, y0), (x1, y1)], fill=255, width=30)
    d.rounded_rectangle([290, 590, 734, 650], 26, fill=255)
    gd.line([(330, 590), (694, 590)], fill=255, width=10)
    return relief(r, g)


def more():
    r, d = canvas(); g, gd = canvas()
    for x in (370, 512, 654):
        d.ellipse([x - 60, 452, x + 60, 572], fill=255); gd.ellipse([x - 28, 484, x + 28, 540], outline=255, width=8)
    return relief(r, g)


def sprint():
    r, d = canvas(); g, gd = canvas()
    d.polygon([(560, 280), (380, 540), (500, 540), (440, 760), (660, 470), (530, 470), (600, 280)], fill=255)  # lightning bolt
    for i, y in enumerate((420, 520, 620)): d.rounded_rectangle([270 + i * 10, y, 360, y + 24], 12, fill=255)  # speed lines
    gd.line([(560, 300), (420, 520)], fill=255, width=10)
    return relief(r, g)


def traditions():
    r, d = canvas(); g, gd = canvas()
    for x in (330, 512, 694):  # three bells, one per tradition
        d.pieslice([x - 85, 360, x + 85, 560], 180, 360, fill=255); d.rounded_rectangle([x - 85, 455, x + 85, 600], 30, fill=255)
        d.ellipse([x - 24, 600, x + 24, 648], fill=255)
        gd.arc([x - 55, 395, x + 55, 520], 200, 340, fill=255, width=12)
    return relief(r, g)


def morning():
    r, d = canvas(); g, gd = canvas()
    d.ellipse([402, 372, 622, 592], fill=255)  # full sun
    for k in range(12):
        a = np.deg2rad(k * 30); c, s_ = np.cos(a), np.sin(a)
        d.line([(512 + 140 * c, 482 + 140 * s_), (512 + 200 * c, 482 + 200 * s_)], fill=255, width=26)
    d.rounded_rectangle([300, 700, 724, 738], 19, fill=255)
    gd.ellipse([440, 410, 584, 554], outline=255, width=12)
    return relief(r, g)


def torahreader():
    r, d = canvas(); g, gd = canvas()
    d.rounded_rectangle([300, 320, 390, 720], 40, fill=255); d.rounded_rectangle([634, 320, 724, 720], 40, fill=255)  # two rollers
    d.rectangle([370, 380, 654, 660], fill=255)  # the open sheet
    for x in (345, 679):
        d.rounded_rectangle([x - 12, 270, x + 12, 330], 8, fill=255); d.rounded_rectangle([x - 12, 710, x + 12, 770], 8, fill=255)
    for y in (430, 480, 530, 580): gd.line([(420, y), (604, y)], fill=255, width=10)  # lines, not letters
    gd.line([(390, 380), (390, 660)], fill=255, width=10); gd.line([(634, 380), (634, 660)], fill=255, width=10)
    return relief(r, g)


def listen():
    r, d = canvas(); g, gd = canvas()
    d.arc([320, 300, 704, 684], 180, 360, fill=255, width=46)  # headphones
    d.rounded_rectangle([290, 480, 410, 680], 46, fill=255); d.rounded_rectangle([614, 480, 734, 680], 46, fill=255)
    gd.rounded_rectangle([318, 510, 382, 650], 28, outline=255, width=10); gd.rounded_rectangle([642, 510, 706, 650], 28, outline=255, width=10)
    return relief(r, g)


def settings():
    r, d = canvas(); g, gd = canvas()
    for k in range(8):
        a = np.deg2rad(k * 45); c, s_ = np.cos(a), np.sin(a)
        d.line([(512 + 120 * c, 512 + 120 * s_), (512 + 225 * c, 512 + 225 * s_)], fill=255, width=86)
    d.ellipse([322, 322, 702, 702], fill=255)
    gd.ellipse([442, 442, 582, 582], fill=255)
    return relief(r, g)


def helpring():
    r, d = canvas(); g, gd = canvas()
    d.ellipse([312, 312, 712, 712], fill=255)  # a lifebuoy, no letters
    gd.ellipse([412, 412, 612, 612], fill=255)
    for a0 in (45, 135, 225, 315):
        a = np.deg2rad(a0); c, s_ = np.cos(a), np.sin(a)
        gd.line([(512 + 105 * c, 512 + 105 * s_), (512 + 195 * c, 512 + 195 * s_)], fill=255, width=30)
    return relief(r, g)


EMBLEMS = dict(talk=talk, camera=camera, light=light, games=games, books=books, lab=lab, learn=learn, speak=speak, firstday=firstday, more=more,
               sprint=sprint, traditions=traditions, morning=morning, torahreader=torahreader, listen=listen, settings=settings, help=helpring)


def main():
    blank = Image.open(sys.argv[1]).convert('RGBA')
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    names = sys.argv[3:] or list(EMBLEMS)
    field = Image.new('L', (S, S), 0); ImageDraw.Draw(field).ellipse([212, 212, 812, 812], fill=255)
    field = field.filter(ImageFilter.GaussianBlur(2))
    for name in names:
        emb = EMBLEMS[name]()
        a = np.minimum(np.asarray(emb.split()[-1], float), np.asarray(field, float))
        emb.putalpha(Image.fromarray(a.astype('uint8')))
        coin = Image.alpha_composite(blank, emb)
        for z in (112, 160, 224, 320):
            p = out / f'ICON_home_{name}.{z}.webp'
            coin.resize((z, z), Image.Resampling.LANCZOS).save(p, 'WEBP', quality=88, method=6)
            subprocess.run(['exiftool', '-all=', '-overwrite_original', '-q', str(p)], check=True)
        print('ok', name)


if __name__ == '__main__':
    main()
