# Accents plan: Ashkenazi, Sephardi, Israeli (2-day ship sprint)

Status: plan written 2026-11-04. Nothing below has been recorded, recruited or contacted. Every number comes from an existing repo document (named inline) or from running the code in this sprint; recording hours are the repo's unmeasured assumption (120 to 180 short lines per donor hour, docs/voices/recording/priority_summary.md) until a 30-clip pilot is timed.

Goal: a learner who prays with an Ashkenazi, Sephardi or Modern Orthodox/Israeli-style congregation sees and hears the reading their congregation uses, or is told plainly that they do not hear it yet.

## 0. The three settings and what each really means

| setting | meaning in the app | what exists today |
|---|---|---|
| `israeli` | Modern Israeli values | respelling, vowel wording, IPA, device voice (Israeli) |
| `sephardi` (default) | "American synagogue, Sephardi values" (docs/CONTRACT.md) | respelling is letter-for-letter identical to Israeli (verified by `respellAll().sameIsraeliSephardi`); only IPA and English vowel wording differ |
| `ashkenazi` | Ashkenazi liturgical | respelling differs (kamatz o, tav without dagesh s, holam oy), vowel wording, IPA, tropes named in the Ashkenazi list |

Open decisions that block recording, not coding (owner: John plus the donors): which Ashkenazi variety (Litvish vs Polish/Hasidic holam and tzere; kit README flags it) and which Sephardi variety (Spanish-Portuguese, Syrian, Moroccan, Iraqi and others differ on ayin, chet, resh and tav). The donor states their community on the consent form; the app label says "Sephardi values (American synagogue)" until a named variety is recorded.

## 1. What the app does TODAY with zero recordings

Run in this sprint: `node --test tests/accents.test.js` (14 tests), plus the existing pronunciation, traditions, onboarding and settings suites (208 tests pass after the fixes; I did not run them before).

- Respelling per tradition (src/pronunciation/transliterate.js): read view, Torah reading ladder, vocab cards, sprint, service, morning card, scaffold. All three follow `settings.congregation` (details and gaps in docs/accents/AUDIT.md).
- Rule-based reading: Read it my way (#/read-my-way), Sounds, Sound-gap lab, niqqud dial. All rule-generated, unverified by a native speaker; each screen says so.
- Tradition quiz (#/tradition-quiz) and speak "Sounds by tradition": which pairs sound the same or different in the chosen tradition.
- Compare (#/compare): the same word in all three, with the reason each differs.
- Tropes named in the Ashkenazi or Sephardi/Mizrahi list (src/torahreader/model.js, src/trope/model.js).
- Honest audio: with no clip the player falls back to the device voice and flags a tradition mismatch (src/audio/player.js). The device voice is Israeli.

Fixed this sprint (my files): the tradition switch on Sounds, Sound-gap, Read it my way and the shared UI called `settings.set('congregation', v)`. The real settings object takes a patch object, so that call was rejected and the choice never persisted. All four now go through `setCongregation()` in src/pronunciation/forTradition.js (tests prove it against the real settings). One more copy of the bug remains in src/traditions/traditions.view.js:122; patch in docs/accents/PATCHES.md.

Known today-gaps (not fixable by me, patches in PATCHES.md): First 10 minutes teaches "ah" and "shah-LOHM" regardless of setting; letter sounds (lesson, atlas, trace, review, quick-check) are Israeli-only, so an Ashkenazi learner is told tav is "t"; speak sets show Israeli transliteration; intermediate lessons silently use the Israeli line for 392 of 635 words that have no Sephardi/Ashkenazi line.

## 2. What needs human recordings

Counts per tradition and voice (docs/voices/recording/priority_summary.md, generated from the manifest):

| tier | content | clips | est. donor hours (120 to 180 clips/h) |
|---|---|---:|---:|
| P1 | 22 letter names + 5 final forms | 27 | 0.15 to 0.23 |
| P2 | 15 vowels/marks + 110 syllable drills | 125 | 0.7 to 1.0 |
| P3 | 41 core prayer lines (Modeh Ani, Shema/V'ahavta, blessing formula, Torah blessings, Kiddush, bread, candles, Shehecheyanu) | 41 | 0.23 to 0.34 |
| P1+P2+P3 | the tradition-audible core | 193 | 1.1 to 1.6 |
| P4 | 500 most frequent words | 500 | 2.8 to 4.2 |
| P1 to P4 | priority set | 693 | 3.9 to 5.8 |
| all required | full manifest (Ashkenazi/Sephardi 3,448; Israeli 4,249) | | 19.2 to 28.7 (Ashkenazi/Sephardi); 23.6 to 35.4 (Israeli) |

Across the six cells (3 traditions x m/f) the priority set is 4,158 clips, 23.1 to 34.6 donor hours; the full set is 22,290 clips. Kit model for a full Ashkenazi voice is 7 to 19 booth hours (12 likely), Israeli 8 to 22 (14 likely); both are model outputs, nobody has been timed.

Minimum viable human audio for this sprint: ONE voice per tradition (3 donors, or 2 if the Israeli content ships on the device voice), P1+P2+P3 = 193 clips each, about 1.1 to 1.6 donor hours each, plus the 30-clip pilot (about 0.25 h). P4 is a stretch goal, not a 2-day promise.

Sephardi: no kit exists because data/audio/equivalence.json is empty (nobody has decided which Israeli clips may stand in). Recommendation: do NOT use equivalence for the tradition-sensitive tiers (P2 vowels, P3 prayer lines); record a real Sephardi reader for them. Letter names (P1) are the only tier where an authority could plausibly allow the Israeli clip, and that is their call, not mine. If run, `node tools/audio/session_kit.mjs --write --tradition sephardi` generates the kit.

## 3. What TTS can and cannot do (honest version)

- Can: speak Israeli Hebrew through the device voice today (Web Speech, he-IL). Server TTS for Israeli words and lines is planned only (docs/tts/README.md: 4,860 planned clips); none has been generated or listened to, and the repo requires the listening test in docs/voices/tts-evaluation-protocol.md to pass first.
- Cannot: isolated letter sounds, vowels and syllables (human only, docs/voices/coverage.md), and any Ashkenazi or Sephardi audio. The project research found no TTS service offering Ashkenazi pronunciation (docs/voices/casting-brief.md).
- Rule for copy and labels: never write "Ashkenazi voice" or "Sephardi voice" for anything but a human recording of that tradition. When the setting is not Israeli and there is no clip, the line is the one in `audioNote()` (forTradition.js): the device voice speaks Israeli Hebrew and will not match the setting; read the respelling.
- Do not feed donor recordings to any voice model unless that donor ticked the separate voice-cloning box (default NO).

## 4. Recruiting and consent

Who: cantors (hazzanim) and ba'alei tefillah for liturgical reading; synagogue Hebrew-school teachers for letters, vowels, syllables and words; for Sephardi, hazzanim or teachers from the specific community chosen above. Ask each for one named community and, if possible, one man and one woman per tradition (the app has voice m/f). Where to ask: their own synagogue office, cantors' associations, Hebrew-school directors, and John's existing congregation contacts. Offer: credit (or anonymity, their choice), a copy of the final audio, and a stated time cap (under 2 hours for P1 to P3).

How, using what exists: the single-file recorder (docs/record-kit/README.md, tools/record-kit/recorder.html; build one per list with `node tools/record-kit/build.mjs --script docs/voices/recording-script-<tradition>.csv --limit 150 --out ~/<tradition>-<voice>.html`). It runs on a phone, uploads nothing, requires a consent screen (three ticks, name, separate optional voice-cloning box default off) and exports a zip that `tools/record-kit/ingest.mjs` validates. Note: the ready lists are the 1,000-word scripts; to record the P1 to P3 set, give the donor the rows from docs/voices/recording/recordings_priority.csv for their tradition and voice (filter priority 1 to 3). I have not run the recorder build in this sprint.

Consent, plain words to say before the donor opens the page (summary of docs/voices/donor-rights-grant.md, which is a DRAFT FOR A LAWYER and not ready to sign):
1. You read a list of letters, vowels, words and prayer lines; nothing else is recorded.
2. We may use the recordings in the Aleph app (free or paid), its book audio and marketing, and may sell the product; no royalties.
3. Voice cloning or training a synthetic voice is a separate tick, default NO; a NO does not affect acceptance.
4. You choose credit or no credit. You can withdraw: that stops future use, it does not recall copies already published.
5. Adults only. Say which community and style you read in; that is saved as the donor note.
Until a lawyer reviews the grant, keep the signed form as the record and do not publish any recording.

## 5. Two-day schedule (hours are donor time at the repo assumption; add booth/setup)

| when | what | who | hours |
|---|---|---|---:|
| Day 1 morning | Ship: Israeli device voice labelled on every non-Israeli setting; apply docs/accents/PATCHES.md (firstday, letters, speak, intermediate, traditions write). Send 3 donor invitations with the recorder link and consent summary. | John, code owners | 0 donor |
| Day 1 midday | Pilot: first 30 rows per tradition, time the booth, correct the clips-per-hour assumption | 1 Ashkenazi + 1 Sephardi donor | 0.25 each |
| Day 1 afternoon | Tier P1 + P2 (152 clips): letter names, 15 vowels, 110 syllables | same donors | 0.8 to 1.3 each |
| Day 1 evening | Ingest dry run, post chain; second listener starts QA | John + second listener | |
| Day 2 morning | Tier P3 (41 core prayer lines) | same donors | 0.23 to 0.34 each |
| Day 2 midday | Israeli content: either ship device voice only, or a human Israeli donor does P1 to P3 (193 clips) | Israeli donor | 1.1 to 1.6 |
| Day 2 afternoon | Tier P4 first 100 to 150 words if time; QA finish; ingest `--apply` | | up to 0.8 to 1.3 |
| Day 2 evening | Release only clips that passed QA; update labels from the coverage report | John | |

QA by a second listener: someone other than the donor, ideally from the same tradition. For each clip they confirm it says the pointed text (not improvised), the tradition's values (kamatz, tav, holam, tzere, stress), no clipping or noise, and record the result in the `take_ok` / donor_note columns. Coverage: 100% of P1 to P3, a 20% random sample of P4 (reject the batch if more than 1 in 10 sampled clips fail). Disagreement goes to the donor, not to the app copy. Ingest checks only technical quality (docs/record-kit/README.md), never correctness.

## 6. Ship order

1. Today, no recordings: setting honoured by respelling everywhere (after PATCHES.md), Israeli device voice clearly labelled when the setting is not Israeli, no tradition claim from TTS.
2. First human audio to go live: P3 blessings and P2 vowels for Ashkenazi and Sephardi (the most audible differences), then P1 letter names, then P4 words by frequency.
3. Israeli: device voice first; human Israeli clips (and TTS only after the listening test) as they arrive.
4. Each release: regenerate docs/voices/coverage.md so the learner-facing claim matches the files that exist.

## 7. Risks

- Hour figures are assumptions; the pilot may double them.
- Donor dialect disagreement (Ashkenazi variety, Sephardi community) can invalidate a recording set; settle it before the first session.
- Consent wording is a draft; recordings cannot ship until a lawyer reviews it.
- Respellings are rule-generated; the Sephardi-values respelling equals the Israeli one and cannot show pharyngeal ayin/chet.

## First run and first day: sound promised per tradition

`audioSupport(tradition, {browserVoiceAnyway, audioFree, recorded})` in `src/pronunciation/forTradition.js` (re-exported from
`src/shell/tradition.js`) gives one plain line about what sound a learner gets with their setting, before any button is pressed:

| setting | `supported` | what the line says |
|---|---|---|
| Israeli | `device` | no recorded audio yet; Listen uses the device's Hebrew voice where it has one (a computer voice, not a teacher) |
| Sephardi / Ashkenazi, "use my browser's voice anyway" on (default) | `device-mismatch` | no audio in that style yet; the device voice is Israeli Hebrew and will not sound like the chosen style |
| Sephardi / Ashkenazi, that setting off | `none` | no audio in that style yet; Listen stays off; read the English-letter spelling |
| "I do not use audio" on | `off` | sound is off; every step can be done by reading |

Where it shows: the pronunciation step of `#/welcome` (updates as the choice changes, with a "Start without sound" checkbox that sets
`audioFree`), the Sound box on the welcome plan card, and the `#fd-style` line at the top of `#/firstday`. The first-day "Hear it"
result uses `playLine()`, so the Israeli device voice is never presented as Sephardi or Ashkenazi. Tests: `tests/accents.test.js`,
`tests/onboarding.test.js`, `tests/onramp.test.js`.
