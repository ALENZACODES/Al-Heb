# Production spec — English narration for "What Is Reform Judaism"

Status: READY TO PRODUCE, not yet produced. The Cloud Shell session is busy with the Books 6–62 Hebrew run; this job queues behind it and uses the same route (production runs inside Cloud Shell as johnnykhan1@gmail.com, project `gen-lang-client-0474790324`, so no credential leaves Google). Smoke-test rule applies: render section 1 only, verify the file plays and is non-zero, then run the rest.

## Inputs
- Script: `narration-script.md` — 5 sections, spoken text identical to `page-text.md` (heading first, then paragraphs). Feed the TTS the plain paragraphs only; strip the markdown and the `[spoken heading]` markers, keeping the heading words themselves as the first spoken line of each file.
- Language: English (the page's own language). This is a topics page, not a Hebrew lesson — no tradition/voice-gender rules from the Hebrew library apply.

## Voice and settings
- Service: Google Cloud Text-to-Speech.
- Voice: a natural English voice — first choice `en-US-Chirp3-HD` (a warm, unhurried voice; pick the specific named voice at smoke-test time and record which one was used in the sidecar, below), fallback `en-US-Neural2` if Chirp 3 HD rejects any section.
- speakingRate: 0.95. Pitch: default. No SSML tricks beyond paragraph pauses (a 400 ms break between paragraphs is fine; do not add breaths, music or effects).
- One voice for all five sections. Do not mix voices inside the page.

## File rules (house spec, same as the rest of the library)
- Paths: `audio/en/topics/reform-judaism-s01.mp3` … `reform-judaism-s05.mp3` in the repo.
- Format after ffmpeg post-processing: MP3, mono, 44.1 kHz, 96 kbps, peak normalised to −3 dBFS, 0.3 s silence at head and tail.
- ALL metadata stripped (no ID3, no encoder tags). Verify with the repo scanner: `node tools/meta/scan.mjs audio/en/topics` must print PASS.
- Raw Cloud output is 24 kHz — never ship it unconverted.

## Honesty and labelling
- The page labels this audio, in the player line and next to every Listen button, as: **"Synthetic voice (English), not a recorded teacher."** (Modelled on `src/shell/audio-labels.js`; that file's existing synthetic labels are Hebrew-specific — the view adds the English wording, it does not reuse the Israeli-only string.)
- Provenance sidecar per file, following the library's existing sidecar pattern: voice name, rate, date, source script section. Sidecars live with the production records, not in learner-facing text.
- QA: transcribe-back check (faster-whisper, English) against the section text; any missing or added word means re-render that section. A human listen to section 1 before the page is announced.

## Cost
~1,100 words ≈ 6,500 characters ≈ well under US$1 at Chirp 3 HD rates, inside the existing free-trial credit.

## What ships when
The page can ship with text first and the Listen buttons appearing only when each file exists (the app already has this pattern: `src/shell/audio-access.js` shows "No audio yet" instead of a dead button). Do not announce the audio until all five files are in and QA'd.
