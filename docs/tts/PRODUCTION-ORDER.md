# ALEF voices: the exact production order (text-to-speech on your PC, plus what the drafting assistant can and cannot do)

Read this first. These are the facts the order is built on, each measured from the repo today:

- The audio manifest needs 22,512 clips and has 0 recorded, 0 text-to-speech (TTS), so 22,512 are missing (`node tools/audio/coverage.mjs`).
- Missing per voice: Ari (man, Israeli) 4,286; Noa (woman, Israeli) 4,286; Ashkenazi man 3,485; Ashkenazi woman 3,485; Sephardi man 3,485; Sephardi woman 3,485.
- The manifest marks letter names, letter sounds, final and variant letters, vowel signs (niqqud) and syllables as **human only** (22 + 5 + 4 + 22 + 4 + 15 + 110 = 182 per Israeli voice). Everything else listed (anchor words 27, lesson words 940, phrasebook 250, prayer lines 129, prayer words 1,723 per Israeli voice) is marked "human or TTS (TTS unvetted)". Do not push TTS into the human-only kinds without deciding to change that rule on purpose.
- The existing TTS pipeline (`tools/tts/`, `docs/tts/README.md`) is tested in mock mode only. No real Hebrew clip has been generated. Nobody has listened to any output. A real-model install attempt on 2026-11-04 ran out of disk in this cloud workspace.
- The "sound words" method (feeding the TTS a Latin-letter respelling instead of Hebrew, so one Israeli-only model can imitate Sephardi and Ashkenazi) is being built in two lanes: the respelling engine (`tools/tts/soundtext.mjs`, `docs/tts/SOUNDWORDS.md`) and the pipeline wiring (`docs/tts/RUN-ON-YOUR-PC.md`). Check that those files exist before relying on steps 6 to 9 below. Respelled Sephardi and Ashkenazi speech is an experiment: its quality is unknown until a native listener hears it.

## Part A: the order for the TTS run (all on your own GPU computer)

Do the steps in this order. Each step has a stop-and-check. Do not skip a check to save time: the checks are what keep bad audio out of the app.

**Step 0. Get a machine that can do it.** You need a computer with an NVIDIA graphics card (or an Apple silicon Mac), Python 3.11, Node 20 or newer, ffmpeg and ffprobe on the path, and plenty of free disk (the weights plus raw WAV files are large; the exact need is not measured, so check free space after the install and keep at least several tens of GB spare). Stop if the install fills the disk: delete the Hugging Face cache you do not need before continuing.

**Step 1. Fetch the repo and plan.** Clone the private repo, then run `node tools/tts/plan.mjs`. Check: it writes `tools/tts/plan.json` and a donor-export folder; open the first lines and confirm tier 1 is the core prayer lines.

**Step 2. Install the model** exactly as `docs/tts/README.md` says (virtual environment, then `pip install chatterbox-tts faster-whisper`). Check: `python -c "import chatterbox"` runs without error.

**Step 3. Pick the voices (this is a rights step, not a technical one).** The renderer clones the voice of a reference recording, 10 to 20 seconds of clean speech with no music, one for the man and one for the woman. Use only a voice that is yours, or a person who signed `docs/voices/donor-rights-grant.md`. If you have neither yet, you can do a technical test with `--allow-default-voice`, but then male and female sound the same and nothing from that run may be shipped.

**Step 4. Smoke test, 20 clips, Israeli only.** Run the render with `--limit 20`, then `node tools/tts/post.mjs --limit 20` and `python tools/tts/verify.py`. Check: the 20 MP3 files exist, `verify-report.csv` has 20 rows, and you can open them. Listen to all 20 yourself. If any is silent, clipped, or the wrong word, stop and fix before scaling.

**Step 5. Native listening check for the Israeli voice.** Give 20 clips (pointed and unpointed variants if you have them) to a native Hebrew speaker, blind. Use `docs/voices/tts-evaluation-protocol.md`. The automatic check in `verify.py` only catches missing, truncated, repeated or wrong words; it does not hear vowels, stress or accent. Pass rule (a suggestion for you to confirm): the listener rates at least 18 of 20 as acceptable for a learner. If it fails, stop; the Israeli voice is not ready, and the Sephardi and Ashkenazi steps will be worse.

**Step 6. Render the Israeli tier 1, then tier 2, for both voices.** Tier 1 is the core prayer lines. Tier 2 is the words in `deck-order.json`. Do the man first, then the woman, in batches of about 200, running post and verify after each batch. The pipeline is resumable: if it stops, re-run and it skips what exists. Check after each batch: the gate's pass rate, then listen to 10 random clips.

**Step 7. Copy accepted Israeli clips into the repo** with `node tools/tts/manifest_update.mjs --dry-run`, then without `--dry-run`, then `node tools/audio/build_manifest.mjs --check` (it must say the manifest files are current). Each accepted clip is marked `tts` and labelled in the app as a synthetic voice, never as a recorded teacher. Commit nothing until the checks pass.

**Step 8. Sound-word respelling for Sephardi (pilot).** Confirm `data/tts/soundwords.sephardi.json` exists and read its confidence counts. Render only the high-confidence items, 20 clips. A native Sephardi-values reader listens, blind, using `docs/tts/RUN-ON-YOUR-PC.md`'s checklist. Pass rule: the same 18 of 20. If it fails, do not scale; the respelling alphabet or the language setting needs changing, which is a job for the respelling lane, and it must be re-listened to after any change.

**Step 9. Sound-word pilot for Ashkenazi,** exactly like step 8, with an Ashkenazi reader. Ashkenazi has more variants (for example Lithuanian and Polish vowel mappings and tav rafuya read as s); the person who listens must agree to the model chosen in `docs/tts/SOUNDWORDS.md`, and you must record which model was used.

**Step 10. Scale Sephardi and Ashkenazi** in the same order as step 6, only for the passing high-confidence items, then medium confidence in a second pass with a fresh listener sample. Items the engine flagged low confidence or "unvoiced" (no niqqud) are not rendered; leave them for a human.

**Step 11. Final checks before any of it ships.** Run the manifest check, the meta scan, and the audio tests (`node --test tests/audio*.test.js`). Make sure the in-app label says what each clip is (synthetic, respelled, which tradition, unreviewed or reviewed). Never mark a TTS clip as recorded or human.

**Step 12. Human recordings still win.** The first 100 clips for each of Sephardi and Ashkenazi are already chosen in `docs/voices/FIRST-100.md` (100 clips each, all ids present in the manifest, checked by `node tools/audio/first100.mjs`). If you can get a human reader, record those first and let human clips replace TTS clips later. The 182 human-only Israeli clips per voice (letters, letter sounds, vowel signs, syllables) are the case where a human is the right answer.

## Part B: the order for the drafting assistant (text work and review; not the voices)

Be clear about what the drafting assistant is for. It writes and cross-checks text well. It is not a guaranteed Hebrew voice: if you try its audio features, treat that as one more TTS engine that has to pass the same blind listening checks in Part A, and do not assume it can produce Sephardi or Ashkenazi accents. Everything the drafting assistant produces here is a draft for a human; mark uncertain items `?? CHECK`. Paste the Ground rules from `docs/drafts/SIX-LANES.md` at the top of each chat. File names: `lane<N>-<item#>-<short-name>.<ext>`, saved in `docs/drafts/inbox/lane<N>/`.

Use items 201 onward so they do not collide with items 1 to 200.

1. **Item 201, independent respelling of the first 100 letter/vowel/syllable items per tradition.** Give the drafting assistant the pointed Hebrew plus the tradition rules from `data/pronunciation/`, and ask for a Latin-letter respelling with syllable breaks and a marked stress. This is the second opinion for the engine's output. Output: CSV, columns id, he, tradition, respelling, stress, doubt.
2. **Item 202, the same for the 300 highest-priority words** (anchor words, lesson words in `deck-order.json` order) for each of the three traditions.
3. **Item 203, the same for the prayer lines** in the tier 1 list (the Shema, Modeh Ani, the blessing formula, the Priestly Blessing). Ask it to list every place it was unsure (medial shva, stress, ayin) instead of guessing.
4. **Item 204, a disagreement report.** Once the repo's engine output exists, give the drafting assistant both files and ask it to list every item where the two respellings differ, grouped by cause (vowel mapping, shva, stress, ayin or chet realisation, tav rafuya). A human decides each group once, which fixes whole classes of items.
5. **Item 205, one-page rule sheet per tradition** in plain English for the listener: what each pointed vowel and each hard letter should sound like in that tradition, and the variants that are acceptable. Mark as a draft for a native reader.
6. **Item 206, listener scorecards:** one printable 20-clip sheet per tradition with columns for clip id, heard word, correct (yes/no), vowel wrong, stress wrong, accent wrong, notes, plus a place for the listener's name and community and the date.
7. **Item 207, a blind-test order sheet:** a random order of the 20 clips with no labels that reveal the tradition or the voice, and a separate answer key.
8. **Item 208, a short consent and credit text for voice donors and listeners,** to take to a lawyer (not legal advice), covering what the recording is used for, whether it can be revoked, and how credit is given.
9. **Item 209, review of the in-app audio label wording** per tradition, written for a nervous adult beginner: honest, short, no jargon.
10. **Item 210, a checklist for re-listening** after any change to the respelling rules, so no change ships unheard.

Optional the drafting assistant check on audio you already have: upload 20 generated clips and ask it to write down what it hears in Hebrew letters (a transcript). Compare the transcripts to the target. This is a rough second opinion like `verify.py`, not a replacement for a native listener, and it can make its own mistakes on short single words.

## What nobody can do from here

- This cloud workspace cannot render real audio (no GPU; the last install filled the disk).
- Nobody has listened to a single generated clip.
- The quality of respelled Sephardi and Ashkenazi speech is unknown.
- Tradition names are too broad to certify a voice model: record which community model each listener approved.
- A synthetic voice must never be presented as a recorded person.
