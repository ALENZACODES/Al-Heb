# Camera — translate Hebrew signs on the photograph

Route: `#/camera`. A person takes or uploads a photo of a storefront or street sign. ALEF detects the Hebrew, translates it into English, **erases the original lettering, inpaints the fascia, and writes the English in the sign’s own colours** (Google Lens style). See [OVERLAY-STYLE.md](./OVERLAY-STYLE.md).

## Engines

- **High accuracy:** Gemini vision (boxes + text). Cloud Vision was checked and is **not enabled** on the Vertex project; this lane did not enable it.
- **On-device fallback in the existing Scan screen:** `src/photo/` already has tesseract.js, a `sign` mode, and an optional local Tesseract helper (`tools/ocr-server.mjs`). Camera reuses the Talk/Gemini translation backend and the same divine-Name hold. John’s renewal-radar OCR registry (`backend/renewal/ocr/engines.py`, MIT) is the pattern for a future on-device engine swap; Tesseract is not installed in this runtime, so the live camera path uses Gemini vision.
- **Style:** default Lens reprint; optional ALEF gold hairline. Tap a region to hear the Hebrew (device voice) and see transliteration when the service sends it. A short shimmer runs only when reduced motion is off.
- Photos are not stored on the server. EXIF and other metadata are stripped from every uploaded and returned JPEG.

The screen is lazy-loaded. If no translator URL is configured, it shows a clear message and does not upload the photo.
