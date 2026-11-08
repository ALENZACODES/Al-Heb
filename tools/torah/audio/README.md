# Torah speech synthesis and Hebrew round-trip checks

This resumable pipeline uses Google Chirp 3 HD Charon (Ari) and Kore (Noa), Hebrew `he-IL` and English `en-US`. A rendered file is not automatically publishable. The initial pointed Hebrew pilot failed independent recognition; see `docs/torah/audio-verification/`.

From the repository root:

1. `node tools/torah/audio/plan.mjs .` generates a four-voice/language plan from the full source corpus and the current divine-name convention. Hebrew display remains unchanged.
2. `pwsh tools/torah/audio/render.ps1 -Limit 12` generates only the pilot. Google authentication uses `GOOGLE_TTS_API_KEY` from the Windows user environment or process environment; secrets are never written to files.
3. Install `faster-whisper==1.2.1` in a local Python environment, then run `python tools/torah/audio/verify.py --limit 6`.
4. Run comparison tests with `python -m unittest discover -s tools/torah/audio -p test_verify.py`.

`render-parallel.ps1` is available for a successful pilot: up to eight workers, each with a minimum four seconds between paid requests (maximum 120/minute). Both renderers default to twelve clips. Reruns skip clips only when source/voice fingerprints and actual audio SHA256 match. A failed request retries four times with backoff. Do not run overlapping workers over the same shard. `pwsh tools/torah/audio/test-render.ps1` checks valid resume and corrupt-file regeneration with a mocked network request.

The Hebrew ASR model is `ivrit-ai/whisper-large-v3-turbo-ct2`, pinned to revision `72ad623a37947395efcc3933132353790e5a12f5`. Optional `HEBREW_ASR_MODEL` points to that downloaded local model. Recognition receives no source prompt or hotwords. Reports retain exact source, transcript, raw word edit count, fingerprint and audio hash. Normalization removes punctuation/vowel marks only. A second comparison explicitly records four narrow spelling equivalences; raw mismatches remain visible. Cache identity includes a verifier-policy hash and model revision. Exact consonantal matches do not verify vowels, stress, biblical qere, or liturgical pronunciation. Reports are evidence, not a claim of perfect pronunciation.

`plan-chapters.mjs .` is an experimental Hebrew chapter/chunk planner. It overwrites `plan.json`, creates `chapters.json`, enforces the request byte limit and checks complete source coverage. Its input policy is still under evaluation and is marked experimental; full rendering requires an explicit `-AllowExperimental` switch. Do not interpret that switch as linguistic validation.

`phoneme_check.py` is an experimental supplemental check using `renikud/whisper-he-ipa`; it requires a local model at `phoneme-model/`, Transformers and PyTorch. It predicts phonemes directly from audio without a source prompt. It is not yet a publication gate.

Known uncertainties include prefixed divine names and readings where source consonants and spoken qere differ. All initial files are staged as `pending-asr-and-listening`; no utility here inserts unverified files into the learner audio manifest.

Documentation: [Google Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd), [ivrit.ai model card](https://huggingface.co/ivrit-ai/whisper-large-v3-turbo-ct2).
