#!/usr/bin/env python3
"""Image helper for tools/images/ingest.mjs (dev tooling only, never used by the app).

Run as:  python3 -I tools/images/ingest_image.py <command> ...   (-I: ignore cwd / env, files are untrusted data)

Commands (all print ONE JSON document on stdout; errors are reported inside the JSON, exit code is 0 unless usage is wrong):
  extract ZIP OUTDIR                 safe zip extraction of image-looking members into OUTDIR (flat, collision-proof names)
  probe FILE                         format / size / alpha / metadata facts, sha256
  process JSON                       one image: write web copies, strip metadata, run OCR. JSON = {src, outdir, stem, sizes, ocr, ocrLangs, minConf, minChars, maxEdgeCap}
  tessinfo                           is tesseract usable and which of heb/eng are installed

Needs Pillow. OCR needs the tesseract CLI (already on the dev box); without it `ocr.ran` is false and nothing is claimed.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

try:
    from PIL import Image, ImageCms  # noqa: F401
    Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard (4096 x 4096 is ~16.7M)
except ImportError:  # reported as JSON so callers can say so
    Image = None

IMAGE_EXT = {'.png', '.jpg', '.jpeg', '.webp'}
MAX_ZIP_ENTRIES = 6000
MAX_ZIP_BYTES = 8 * 1024 ** 3
MAX_MEMBER_BYTES = 80 * 1024 ** 2


def out(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.write('\n')


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def cmd_extract(zip_path, outdir):
    """Extract only image members. Names are flattened to NNNNN<ext> so no member name can escape OUTDIR (zip-slip proof);
    the original path is returned for reporting. Skips macOS junk, directories, hidden files, symlinks."""
    os.makedirs(outdir, exist_ok=True)
    res = {'ok': True, 'files': [], 'skipped': [], 'error': None}
    try:
        zf = zipfile.ZipFile(zip_path)
    except (zipfile.BadZipFile, OSError) as e:
        return {'ok': False, 'files': [], 'skipped': [], 'error': f'not a readable zip: {e}'}
    with zf:
        infos = zf.infolist()
        if len(infos) > MAX_ZIP_ENTRIES:
            return {'ok': False, 'files': [], 'skipped': [], 'error': f'zip has {len(infos)} entries (limit {MAX_ZIP_ENTRIES})'}
        total = sum(i.file_size for i in infos)
        if total > MAX_ZIP_BYTES:
            return {'ok': False, 'files': [], 'skipped': [], 'error': f'zip expands to {total} bytes (limit {MAX_ZIP_BYTES})'}
        n = 0
        for info in infos:
            name = info.filename
            base = os.path.basename(name.replace('\\', '/'))
            if info.is_dir() or not base:
                continue
            parts = name.replace('\\', '/').split('/')
            unix_mode = (info.external_attr >> 16) & 0o170000
            if '__MACOSX' in parts or base.startswith('.') or base.startswith('._'):
                res['skipped'].append({'name': name, 'reason': 'junk'})
                continue
            if unix_mode == 0o120000:
                res['skipped'].append({'name': name, 'reason': 'symlink'})
                continue
            ext = os.path.splitext(base)[1].lower()
            if ext not in IMAGE_EXT:
                res['skipped'].append({'name': name, 'reason': 'not an image extension'})
                continue
            if info.file_size > MAX_MEMBER_BYTES:
                res['skipped'].append({'name': name, 'reason': f'member too large ({info.file_size} bytes)'})
                continue
            n += 1
            dest = os.path.join(outdir, f'{n:05d}{ext}')
            with zf.open(info) as src, open(dest, 'wb') as dst:
                shutil.copyfileobj(src, dst, 1 << 20)
            y, mo, d, h, mi, s = info.date_time
            res['files'].append({'path': dest, 'name': base, 'zipPath': name, 'zipDate': f'{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}:{s:02d}'})
    return res


def _alpha_facts(im):
    """Return (hasAlphaChannel, fractionTransparent) for any mode."""
    has = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info) or 'transparency' in im.info
    if not has:
        return False, 0.0
    a = im.convert('RGBA').getchannel('A')
    hist = a.histogram()
    total = sum(hist) or 1
    return True, round(sum(hist[:250]) / total, 4)


def cmd_probe(path):
    if Image is None:
        return {'ok': False, 'error': 'Pillow is not installed'}
    try:
        size = os.path.getsize(path)
        with open(path, 'rb') as f:
            head = f.read()
        with Image.open(path) as im:
            fmt = im.format
            w, h = im.size
            mode = im.mode
            has_icc = bool(im.info.get('icc_profile'))
            has_exif = bool(im.getexif()) or 'exif' in im.info
            im.load()
            has_alpha, transparent = _alpha_facts(im)
        return {
            'ok': True, 'format': fmt, 'width': w, 'height': h, 'mode': mode, 'bytes': size,
            'sha256': hashlib.sha256(head).hexdigest(), 'hasAlpha': has_alpha, 'transparentFraction': transparent,
            'hasIcc': has_icc, 'hasExif': has_exif,
            # Generated images are expected to carry C2PA content credentials; byte-sniff only (not a validation).
            'c2paMarker': (b'c2pa' in head) or (b'jumb' in head),
        }
    except Exception as e:  # unreadable / truncated / bomb
        return {'ok': False, 'error': f'{type(e).__name__}: {e}'}


def _to_srgb(im):
    icc = im.info.get('icc_profile')
    if not icc:
        return im, False
    try:
        import io
        src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        dst = ImageCms.createProfile('sRGB')
        mode = 'RGBA' if im.mode in ('RGBA', 'LA', 'PA') else 'RGB'
        return ImageCms.profileToProfile(im.convert(mode), src, dst, outputMode=mode), True
    except Exception:
        return im, False


def _tess_usable():
    exe = shutil.which('tesseract')
    if not exe:
        return None, set()
    try:
        p = subprocess.run([exe, '--list-langs'], capture_output=True, text=True, timeout=30)
        langs = {l.strip() for l in p.stdout.splitlines()[1:] if l.strip()}
        return exe, langs
    except Exception:
        return None, set()


TEXT_CHAR = re.compile(r'[A-Za-z0-9א-תÀ-ɏ]')  # Latin (incl. accents), digits, Hebrew letters (nikkud ignored)
HEB = re.compile(r'[א-ת]')


def _tess_pass(exe, png, lang, env):
    p = subprocess.run([exe, png, 'stdout', '-l', lang, '--psm', '11', 'tsv'], capture_output=True, text=True, timeout=120, env=env)
    if p.returncode != 0:
        raise RuntimeError(f'tesseract exit {p.returncode}: {p.stderr[:200]}')
    words = []
    for line in p.stdout.splitlines()[1:]:
        c = line.split('\t')
        if len(c) < 12 or c[0] != '5':
            continue
        try:
            conf = float(c[10])
        except ValueError:
            continue
        txt = c[11].strip()
        chars = TEXT_CHAR.findall(txt)
        if not chars:
            continue
        # a run of one repeated look-alike glyph (I I I, lll, 000) is almost always a drawn stroke, not text
        if len(set(chars)) == 1 and chars[0] in 'Il1oO0|':
            continue
        words.append({'t': txt, 'conf': round(conf, 1), 'n': len(chars), 'box': [int(c[6]), int(c[7]), int(c[8]), int(c[9])],
                      'hebrew': bool(HEB.search(txt)), 'lang': lang})
    return words


def run_ocr(flat, langs, min_conf, min_chars):
    """One tesseract pass per language (mixing heb+eng in one pass lowers recall on both).
    A word is a text blob if it has >= min_chars letters/digits at conf >= min_conf, or >= 5 such characters at conf >= 15
    (long strings in art are read with low confidence). Both tiers are deliberately cheap and recall-leaning: a human looks
    at every flagged picture. A single large letter is NOT reliably found (reported as a known limit)."""
    exe, installed = _tess_usable()
    if not exe:
        return {'ran': False, 'reason': 'tesseract CLI not found'}
    use = [l for l in langs if l in installed]
    if not use:
        return {'ran': False, 'reason': f'none of {langs} installed (have {sorted(installed)})'}
    with tempfile.TemporaryDirectory() as td:
        png = os.path.join(td, 'o.png')
        g = flat.convert('RGB')  # colour kept: greyscale lowered recall on coloured backgrounds in tests
        long_edge = max(g.size)
        if long_edge > 1600:  # speed; text big enough to matter survives
            k = 1600 / long_edge
            g = g.resize((max(1, round(g.size[0] * k)), max(1, round(g.size[1] * k))), Image.LANCZOS)
        g.save(png)
        env = dict(os.environ, OMP_THREAD_LIMIT='1')
        words = []
        try:
            for lang in use:
                words += _tess_pass(exe, png, lang, env)
        except subprocess.TimeoutExpired:
            return {'ran': False, 'reason': 'tesseract timed out'}
        except RuntimeError as e:
            return {'ran': False, 'reason': str(e)}
    blobs, soft = [], []
    for w in words:
        if (w['n'] >= min_chars and w['conf'] >= min_conf) or (w['n'] >= 5 and w['conf'] >= 15):
            blobs.append(w)
        elif w['hebrew'] and w['conf'] >= 85:  # short, confident Hebrew: a lone letter drawn into the picture
            soft.append(w)
    blobs.sort(key=lambda w: -w['conf'])
    return {'ran': True, 'langs': use, 'minConf': min_conf, 'minChars': min_chars, 'blobs': blobs[:20], 'blobCount': len(blobs),
            'possibleLetters': soft[:20], 'containsText': len(blobs) > 0, 'possibleText': len(soft) > 0 and not blobs}


def cmd_process(a):
    if Image is None:
        return {'ok': False, 'error': 'Pillow is not installed'}
    try:
        os.makedirs(a['outdir'], exist_ok=True)
        with Image.open(a['src']) as im0:
            im0.load()
            im, converted = _to_srgb(im0)
            has_alpha, transparent = _alpha_facts(im0)
            if has_alpha and transparent > 0:
                im = im.convert('RGBA')
            else:
                im = im.convert('RGB')  # opaque: drop the useless alpha channel
                has_alpha = False
            w, h = im.size
            long_edge = max(w, h)
            cap = a.get('maxEdgeCap', 1600)
            written = []
            seen = set()
            for s in a.get('sizes', [800, 1600]):
                target = min(s, long_edge, cap)
                if target in seen:
                    continue
                seen.add(target)
                k = target / long_edge
                tw, th = max(1, round(w * k)), max(1, round(h * k))
                r = im if (tw, th) == (w, h) else im.resize((tw, th), Image.LANCZOS)
                name = f"{a['stem']}.{target}.webp"
                dest = os.path.join(a['outdir'], name)
                # no exif=/icc_profile=/xmp= passed: all metadata is dropped
                r.save(dest, 'WEBP', quality=88, method=6)
                written.append({'edge': target, 'file': name, 'width': tw, 'height': th, 'bytes': os.path.getsize(dest)})
            ocr = {'ran': False, 'reason': 'disabled'}
            if a.get('ocr', True):
                flat = im
                if has_alpha:
                    bg = Image.new('RGB', im.size, (255, 255, 255))
                    bg.paste(im, mask=im.getchannel('A'))
                    flat = bg
                ocr = run_ocr(flat, a.get('ocrLangs', ['heb', 'eng']), a.get('minConf', 60), a.get('minChars', 3))
        return {'ok': True, 'variants': written, 'hasAlpha': has_alpha, 'iccConvertedToSrgb': converted, 'ocr': ocr}
    except Exception as e:
        return {'ok': False, 'error': f'{type(e).__name__}: {e}'}


def main(argv):
    if len(argv) < 2:
        sys.stderr.write(__doc__)
        return 2
    c = argv[1]
    if c == 'extract' and len(argv) == 4:
        out(cmd_extract(argv[2], argv[3]))
    elif c == 'probe' and len(argv) == 3:
        out(cmd_probe(argv[2]))
    elif c == 'process' and len(argv) == 3:
        out(cmd_process(json.loads(argv[2])))
    elif c == 'tessinfo':
        exe, langs = _tess_usable()
        out({'tesseract': exe, 'langs': sorted(langs), 'pillow': Image is not None})
    else:
        sys.stderr.write(__doc__)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
