#!/usr/bin/env python3
"""Image helper for tools/images/ingest_queue.mjs (dev tooling only, never used by the app).

Run as:  python3 -I tools/images/ingest_queue_image.py <command> ...   (-I: the files are untrusted data)
Prints ONE JSON document on stdout. Exit code 0 even on a per-file error (reported inside the JSON); 2 on usage.

  probe FILE                    -> {ok, format, width, height, mode, hasAlpha, alphaUsed}
  convert SRC DST SPEC_JSON     -> {ok, width, height, bytes}   SPEC = {"format":"png"|"jpeg","width":W,"height":H,
                                   "alpha":true|false,"quality":85,"crop":true|false}
Needs Pillow. Without it the probe says {"ok": false, "error": "no PIL"} and the caller falls back to ffprobe/ffmpeg.
"""
import json
import os
import sys

try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = 40_000_000
except ImportError:
    Image = None


def out(obj):
    sys.stdout.write(json.dumps(obj))
    sys.stdout.write('\n')


def probe(path):
    if Image is None:
        return {'ok': False, 'error': 'no PIL'}
    try:
        with Image.open(path) as im:
            im.load()
            has_alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
            alpha_used = False
            if has_alpha:
                a = im.convert('RGBA').getchannel('A')
                lo, hi = a.getextrema()
                alpha_used = lo < 255
            return {'ok': True, 'format': im.format, 'width': im.width, 'height': im.height, 'mode': im.mode,
                    'hasAlpha': has_alpha, 'alphaUsed': alpha_used}
    except Exception as e:  # noqa: BLE001 - reported, not raised
        return {'ok': False, 'error': f'{type(e).__name__}: {e}'}


def convert(src, dst, spec):
    if Image is None:
        return {'ok': False, 'error': 'no PIL'}
    try:
        w, h = int(spec['width']), int(spec['height'])
        with Image.open(src) as im:
            im.load()
            im = im.convert('RGBA' if spec.get('alpha') else 'RGB')
            if spec.get('crop') and (im.width * h != im.height * w):
                # centre crop to the target aspect before resizing
                if im.width * h > im.height * w:
                    nw = im.height * w // h
                    x0 = (im.width - nw) // 2
                    im = im.crop((x0, 0, x0 + nw, im.height))
                else:
                    nh = im.width * h // w
                    y0 = (im.height - nh) // 2
                    im = im.crop((0, y0, im.width, y0 + nh))
            if (im.width, im.height) != (w, h):
                im = im.resize((w, h), Image.LANCZOS)
            os.makedirs(os.path.dirname(dst) or '.', exist_ok=True)
            # No exif, no icc, no text chunks are passed: PIL writes only what is given here.
            if spec.get('format') == 'jpeg':
                im.save(dst, 'JPEG', quality=int(spec.get('quality', 85)), optimize=True, subsampling='4:2:0')
            else:
                im.save(dst, 'PNG', optimize=True)
            return {'ok': True, 'width': im.width, 'height': im.height, 'bytes': os.path.getsize(dst)}
    except Exception as e:  # noqa: BLE001
        return {'ok': False, 'error': f'{type(e).__name__}: {e}'}


def main(argv):
    if len(argv) >= 3 and argv[1] == 'probe':
        out(probe(argv[2]))
        return 0
    if len(argv) >= 5 and argv[1] == 'convert':
        out(convert(argv[2], argv[3], json.loads(argv[4])))
        return 0
    sys.stderr.write(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv))
