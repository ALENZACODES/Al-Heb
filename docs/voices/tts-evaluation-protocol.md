# TTS listening-test protocol (Azure vs Google vs ElevenLabs)

Purpose: decide, with a fresh test on Aleph's actual content, which provider (if any) renders Modern Israeli words and sentences. Not run yet; no credentials and no listeners exist in this repository's session.

## Ground facts this test must respect
- Only Modern Israeli pronunciation can be tested. No TTS provider found offers Ashkenazi (or liturgical Sephardi) pronunciation: Ashkenazi audio is a human-recording task.
- Google Chirp 3 HD documentation states custom pronunciations and pause control are NOT available for he-IL, so you cannot fix a mispronounced word with a pronunciation override on Google. `<phoneme>` is listed among Chirp SSML tags but the page does not say it works for Hebrew; test it, do not assume.
- Azure SSML phoneme/IPA support for he-IL is unverified. ElevenLabs and OpenAI have no documented Hebrew phoneme control.
- Whether each engine honours niqqud in input is undocumented. The test must establish it.
- The earlier independent test (Rosehill, March 2025) is one person's qualitative snapshot; models have changed since (ElevenLabs v4, Gemini 3.1 TTS preview). Treat it as a prior, not a result.
- Redistribution rights of Azure/Google TTS output are unconfirmed (counsel). Do not ship test audio.

## Candidates
Azure he-IL-AvriNeural (m) / he-IL-HilaNeural (f); Google he-IL Chirp 3 HD (try several of the 16 male / 14 female names, e.g. Charon, Kore) and Wavenet B/D (m), A/C (f); ElevenLabs v3 with language_code "he" and a few voices. Optional: Gemini-TTS (Preview), OpenAI gpt-4o-mini-tts (unevaluated for Hebrew).

## Stimuli (build from the corpus once lane 5 data lands)
1. 30 words spanning every letter, every vowel, and the five foreigner-marker traps (resh, pure vowels, final stress, shva clusters, pharyngeals).
2. 20 pointed sentences / phrasebook lines.
3. 10 prayer lines incl. the Priestly Blessing (Israeli reading).
4. 22 syllables (one per letter) to probe isolated-syllable behaviour; plus 5 bare vowels to confirm that isolated sounds fail (expected).
5. Homograph probes: the same consonants with different pointing; each rendered pointed AND unpointed to see whether niqqud is honoured.
Render with: `node tools/audio/render_tts.mjs --provider <p> --voice m|f --limit N --execute` into a scratch folder, never audio/ (or delete afterwards).

## Procedure
- Blind and randomized: file names are random ids; a key sheet is kept by the organizer.
- At least 3 listeners including 2 native Israeli Hebrew speakers; one should be a reader of siddur Hebrew if prayers are tested.
- Each item rated on: (A) pronunciation correct, 0 wrong / 1 minor / 2 correct; (B) stress correct, same scale; (C) naturalness 1-5; (D) would you teach with it, yes/no.
- Record every audible niqqud failure (wrong vowel, ignored mark) verbatim.

## Decision rules (set before listening)
- A provider passes for a content class only if >= 90% of items score 2 on (A) and (B) from every native listener, and no item has a wrong vowel in a letter-learning context.
- Isolated letter and vowel sounds default to human recording regardless of the outcome.
- Report cost using the render dry-run and docs/voices/tts-cost-plan.md (list prices verified on fetched pages 2026-11-03; per-row verified flags in data/audio/tts-prices.json) and attach the redistribution-rights status.
- Outcome format: one table per provider x voice x content class with pass/fail counts, plus the list of failures.
