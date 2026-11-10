"""Bounded image intake. Every image is rebuilt from its pixels, so no EXIF, GPS, ICC, XMP or comments survive.

The limits and the order of checks (size, signature, pixel budget, then decode) follow the intake used in the
Renewal Radar document scanner (backend/renewal/ocr/camera.py, same author, MIT); this is a smaller version for photos of signs.
Nothing is written to disk.
"""
from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000
MAX_SIDE = 2000
MIN_SIDE = 48
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class IntakeError(ValueError):
    """The upload failed a size, type or readability check. `status` is the HTTP status to answer with."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _signature_ok(data: bytes) -> bool:
    return (data[:3] == b'\xff\xd8\xff' or data[:8] == b'\x89PNG\r\n\x1a\n'
            or (data[:4] == b'RIFF' and data[8:12] == b'WEBP'))


def load_clean(data: bytes, *, max_side: int = MAX_SIDE) -> Image.Image:
    """bytes -> upright RGB image with no metadata, longest side at most `max_side`."""
    if not data:
        raise IntakeError('No image was sent.')
    if len(data) > MAX_BYTES:
        raise IntakeError('The photo is larger than 10 MB.', 413)
    if not _signature_ok(data):
        raise IntakeError('Only JPEG, PNG or WebP photos are accepted.', 415)
    try:
        probe = Image.open(BytesIO(data))
        if probe.format not in ALLOWED_FORMATS:
            raise IntakeError('Only JPEG, PNG or WebP photos are accepted.', 415)
        if probe.width * probe.height > MAX_PIXELS:
            raise IntakeError('The photo has too many pixels.', 413)
        probe.load()
    except IntakeError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError) as exc:
        raise IntakeError('The photo could not be read.') from exc
    upright = ImageOps.exif_transpose(probe)  # apply the camera rotation before the tag is dropped
    rgb = upright.convert('RGB')
    if min(rgb.size) < MIN_SIDE:
        raise IntakeError('The photo is too small to read.')
    if max(rgb.size) > max_side:
        rgb.thumbnail((max_side, max_side), Image.LANCZOS)
    clean = Image.new('RGB', rgb.size)   # a fresh image: only pixel values are copied
    clean.paste(rgb)
    return clean


def encode_jpeg(img: Image.Image, quality: int = 88) -> bytes:
    """RGB image -> JPEG bytes with no metadata blocks."""
    fresh = Image.new('RGB', img.size)
    fresh.paste(img.convert('RGB'))
    buf = BytesIO()
    fresh.save(buf, 'JPEG', quality=quality, optimize=True)
    return buf.getvalue()


def encode_png(img: Image.Image) -> bytes:
    fresh = Image.new('RGB', img.size)
    fresh.paste(img.convert('RGB'))
    buf = BytesIO()
    fresh.save(buf, 'PNG')
    return buf.getvalue()


def metadata_keys(data: bytes) -> list[str]:
    """Names of metadata found in encoded image bytes (empty list = clean). Used by the tests and /health self-check."""
    img = Image.open(BytesIO(data))
    found = [k for k in img.info if k in ('exif', 'icc_profile', 'xmp', 'XML:com.adobe.xmp', 'comment', 'photoshop', 'dpi')]
    if len(img.getexif()):
        found.append('exif-tags')
    for marker in (b'Exif\x00\x00', b'http://ns.adobe.com/xap', b'ICC_PROFILE'):
        if marker in data:
            found.append(marker.decode('latin1').strip('\x00'))
    return sorted(set(found))
