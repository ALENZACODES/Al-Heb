#!/usr/bin/env python3
"""Synthetic image fixtures for tests/images.ingest.test.js (run: python3 -I this.py OUTDIR SPECJSON).
SPEC = [{"name": "a.png", "w": 1024, "h": 1024, "kind": "plain|latin|hebrew|alpha|meta", "seed": 1}]; kind=zip builds a zip of files.
No images are downloaded or copied from anywhere: everything is drawn here."""
import glob, io, json, os, struct, sys, zipfile
from PIL import Image, ImageDraw, ImageFont, ImageCms

def font(name, size):
    p = glob.glob(f'/usr/share/fonts/**/{name}', recursive=True)
    return ImageFont.truetype(p[0], size) if p else ImageFont.load_default()

def draw(spec):
    w, h, kind, seed = spec['w'], spec['h'], spec.get('kind', 'plain'), spec.get('seed', 0)
    mode = 'RGBA' if kind == 'alpha' else 'RGB'
    bg = (0, 0, 0, 0) if kind == 'alpha' else (246, 241, 231)
    im = Image.new(mode, (w, h), bg)
    d = ImageDraw.Draw(im)
    c = lambda r, g, b: (r, g, b, 255) if mode == 'RGBA' else (r, g, b)
    d.ellipse((w * .2 + seed * 7, h * .3, w * .8, h * .8), fill=c(31, 58, 95), outline=c(43, 43, 43), width=14)
    d.rectangle((w * .4, h * .1, w * .6, h * .25), fill=c(176, 55, 59))
    d.polygon([(w * .1, h * .95), (w * .3, h * .7), (w * .5, h * .95)], fill=c(107, 127, 58))
    if kind == 'latin':
        d.text((w * .12, h * .04), 'HELLO cup', font=font('DejaVuSans-Bold.ttf', int(h * .09)), fill=c(20, 20, 20))
    if kind == 'hebrew':
        d.text((w * .12, h * .04), 'שלום בית', font=font('FreeSans.ttf', int(h * .11)), fill=c(20, 20, 20))
    return im

def save(im, path, kind):
    ext = os.path.splitext(path)[1].lower()
    if kind == 'meta':
        exif = Image.Exif(); exif[0x010E] = 'secret description'; exif[0x013B] = 'secret artist'
        prof = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        im.save(path, exif=exif.tobytes(), icc_profile=prof)
    elif ext in ('.jpg', '.jpeg'):
        im.convert('RGB').save(path, quality=90)
    else:
        im.save(path)

def main(out, specs):
    os.makedirs(out, exist_ok=True)
    zips = {}
    for s in specs:
        if s.get('zip'):
            tmp = os.path.join(out, '.tmp_' + os.path.basename(s['name']))
            save(draw(s), tmp, s.get('kind')); zips.setdefault(s['zip'], []).append((s['name'], tmp)); continue
        save(draw(s), os.path.join(out, s['name']), s.get('kind'))
    for z, items in zips.items():
        with zipfile.ZipFile(os.path.join(out, z), 'w') as zf:
            for arcname, tmp in items:
                zf.write(tmp, arcname); os.remove(tmp)
            zf.writestr('__MACOSX/._junk.png', b'junk'); zf.writestr('readme.txt', 'hi')

if __name__ == '__main__':
    main(sys.argv[1], json.loads(sys.argv[2]))
