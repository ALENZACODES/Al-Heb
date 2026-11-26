# Scanner, Camera and Follower: What Was Built, and Which Outside Code Is Safe for a Paid Product

Written 2026-11-25. Licences were read from the projects' own pages on that date. Recheck a licence before vendoring any
file: a model's weights can carry a different licence from the code that runs them.

## What changed in this pass

| Area | Change | Files | Outside code added |
|---|---|---|---|
| Camera Translator (`#/camera`) and Scan (`#/scan`) | **Live camera.** A viewfinder that checks every frame (sharpness, light, glare, shake) inside the framing box, says what to fix, and takes the photo by itself once the picture has been sharp and steady for 4 frames. Manual shutter, auto on/off, the phone's light and zoom where the camera reports them, tap to focus. Frames are measured in a 160 px canvas and dropped; only the photo taken is handed to the existing reader. | `src/photo/live-capture.js`, hooks in `src/camera/camera.view.js`, `src/photo/scan.view.js` | None (plain arithmetic) |
| Torah reader finger guide | **Follows the recording.** "Hear" and "Play chapter" now move the guide word by word. With the device voice it uses the voice's own word boundaries; with a recorded clip it reads the clip's playback position and estimated word times (each word's share of the clip from its vowels, plus a short rest after a pausing accent). Real per-word times replace the estimate when a verse has `wordMs`. Touching the text takes over. "Follow the recording" can be turned off; calm mode never follows. | `src/torahreader/word-timing.js`, `src/torahreader/finger-follow.js`, `src/torahreader/torahreader.view.js`, `src/audio/player.js` (clock + boundary events), `src/shell/audio.js` (passes the caller's listener through) | None |
| Torah reader | The playing verse's highlight now sets dark text on the light highlight (it was light text on light yellow in the dark theme). | `src/torahreader/torahreader.view.js` | None |
| Word timestamps (offline) | A script that writes real per-word times into the chapter files with a commercially licensed Hebrew recogniser. **Not run yet.** | `tools/torah/audio/align_words.py` | faster-whisper (MIT) + ivrit-ai Whisper (Apache-2.0), on the build machine only |

Checked: unit tests (`tests/photo.live-capture.test.js`, `tests/torahreader.follow.test.js`, plus the existing suites), and
in headless Chrome with a fake camera playing a synthetic sign (`optical-store.jpg`): auto photo fired after
"Hold still… → Sharp and steady", the sign read as "Optical Store" on `#/camera`, and `#/scan` read the same sign; on
`#/torahreader?book=genesis&chapter=1` the guide walked words 0–13 across Genesis 1:1–2 during Play chapter.
**Not checked:** any real phone, any real photo, iOS Safari (it gives the web no light or zoom control), a screen reader.

## Licence register

"OK" means the licence allows use in a product that is sold, with attribution where the licence asks for it. Not legal advice.

### Scanner and camera (reading Hebrew from a photo)

| Option | What it would add | Licence | Verdict |
|---|---|---|---|
| tesseract.js 7 + `heb` traineddata | The reader in use now | Apache-2.0 | OK (already vendored) |
| paddleocr-hebrew (RivoksLab, ONNX) | A much stronger Hebrew line reader. Its model card reports 0.35% CER vs Tesseract 1.34% on clean Hebrew, and 2.33% vs 16.14% on real bilingual Hebrew + Latin | Apache-2.0 per ENGINES.md (fine-tuned from PaddleOCR, Apache-2.0); training weights not published | OK. Best next step for accuracy; recheck the Hugging Face card's licence field before vendoring |
| onnxruntime-web | Runs the ONNX models above in the browser (WASM/WebGPU) | MIT | OK |
| PaddleOCR PP-OCRv5 text detector (ONNX) | Finds the text lines for the recogniser above | Apache-2.0 | OK |
| jscanify | Finds a page's four corners and flattens it (curved/angled siddur pages) | MIT, but needs OpenCV.js | OK |
| OpenCV.js 4.x | Image processing used by jscanify | Apache-2.0 (OpenCV 4.5 and later) | OK; about 8 MB, load only on demand |
| scanic | Page edge detection, Rust/WASM, lighter than OpenCV | MIT | OK; younger project |
| gigapdf-ocr-hebrew (CRNN) | Small Hebrew line reader | Not established | Do not use until checked |
| Surya | OCR + layout | Code Apache-2.0; weights licence restricts commercial use above a revenue threshold (believed) | Avoid unless the weights licence is cleared |
| Google ML Kit text recognition | On-device OCR | Free, but Hebrew not listed | Not usable |
| NLLB-200 (translation) | Whole-line Hebrew → English | Weights CC-BY-NC | Not usable in a sold product |

### Follower (keeping the guide on the word being read)

| Option | What it would add | Licence | Verdict |
|---|---|---|---|
| Device voice word boundaries (`SpeechSynthesisUtterance.onboundary`) | Exact word steps when the device voice reads | Browser built-in | OK — now used |
| Google Cloud TTS SSML `<mark>` timepoints | Exact word times returned with each synthesised clip | Paid service | **Not available for Chirp 3 HD voices**: their SSML support is `<phoneme>`, `<p>`, `<s>`, `<sub>`, `<say-as>` only. Would need a different voice family |
| faster-whisper | Word timestamps from audio (offline script) | MIT | OK |
| ivrit-ai Whisper large-v3 / large-v3-turbo | Hebrew speech recognition with word timing | Apache-2.0 (Hebrew fine-tune of OpenAI Whisper, MIT) | OK — used by `align_words.py` |
| ivrit.ai datasets | Training data | ivrit.ai licence: commercial training allowed; may not be used to imitate a person's voice | OK for alignment; do not use to clone a voice |
| torchaudio `MMS_FA` forced aligner | Very precise alignment of known text to audio | **CC-BY-NC 4.0** | **Not usable** in a sold product |
| MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`) | A *camera* follower: point a real finger at a printed siddur and the app follows the fingertip | Apache-2.0 (library) | OK; recheck the `hand_landmarker.task` model card. About 8 MB; on-device |

## Suggested order for the next passes

1. Run `tools/torah/audio/align_words.py` on one chapter, listen to it with the guide on, then the rest. Exact word times
   make the follower usable for practising leyning.
2. Wire paddleocr-hebrew + onnxruntime-web as a second reader in `src/photo/engines/` behind the existing engine interface,
   and keep Tesseract as the fallback. Measure on the same 849-image sets first, then on real phone photos.
3. Add page flattening (jscanify + OpenCV.js, or scanic) to `#/scan` for prayer-book pages only; signs are already flat.
4. A camera fingertip follower (MediaPipe) for reading from a printed book: only after 1–3, because it stacks on both.

## Sources

- paddleocr-hebrew model card: https://huggingface.co/Rivok/paddleocr-hebrew
- jscanify: https://github.com/puffinsoft/jscanify (MIT)
- MediaPipe: https://github.com/google-ai-edge/mediapipe (Apache-2.0); web guide https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- ivrit-ai Whisper: https://huggingface.co/ivrit-ai/whisper-large-v3 (Apache-2.0)
- faster-whisper: https://github.com/SYSTRAN/faster-whisper (MIT)
- MMS_FA licence: https://docs.pytorch.org/audio/2.8.0/generated/torchaudio.pipelines.MMS_FA.html (CC-BY-NC 4.0)
- Chirp 3 HD SSML support: https://docs.cloud.google.com/text-to-speech/docs/release-notes
