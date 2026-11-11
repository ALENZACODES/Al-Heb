# Sephardi setting: which clips play (owner decision, Nov 7 2026)

## What the owner heard on the live site

`src/shell/settings.js` defaults `congregation` to `sephardi`, so a fresh learner was in the Sephardi slot. On `#/read`, "Play line" fetched `audio/f/sephardi/line/bless-priestly-1.mp3` (6.7 s) instead of the Israeli clip (2.7 s): the 258 Sephardi line clips and the Sephardi word clips were made from Latin-letter respellings by an outside voice service (`source: paid-cloud`, labelled "made from a respelling") and sound slow and unnatural. The dictionary said "No clip for Woman (Noa), Sephardi." for words that had an Israeli clip. The Israeli clips (he-IL WaveNet, Ari and Noa) are the natural ones.

## Decision (John Khan, 2026-11-07 21:33)

The Sephardi setting plays the Israeli clips for everything (letters, vowels, syllables, words, lines, prayers, book pages, games) and expresses the Sephardi tradition only on screen, in the English-letter reading ("Transliteration (Sephardi, approximate)"). The respelled `audio/<voice>/sephardi/*` clips are retired from playback; files and manifest rows stay. The default congregation stays `sephardi` now that it plays the natural clips.

## What changed (commit "Sephardi setting plays the Israeli clips")

- `src/audio/player.js`: `PLAYBACK_TRADITION = { israeli: 'israeli', sephardi: 'israeli', ashkenazi: 'israeli' }` and `playbackTradition()`. `plan()` resolves files in the played tradition (same voice); the result keeps `tradition` = the learner's setting and adds `fileTradition: 'israeli'`, `via: 'tradition'`. A Sephardi file is never selected. The Web Speech mismatch rule now looks at the played tradition, so the Israeli device voice is not refused for the Sephardi setting.
- Captions (`src/shell/audio-labels.js` `traditionCaption`, used by `describeResult` and `playbackLine` in `src/shell/audio.js`): "(woman, Israeli voice; Sephardi reading shown in English letters)". The Israeli caption is unchanged; Ashkenazi now uses the same stand-in caption as Sephardi ("(woman, Israeli)").
- Dictionary (`src/vocab/clips.js`): `lookupClip` and `alternateClip` read the played tradition's slot; the clip keeps its real `tradition` and carries `setting`; `clipCaption` names both; a retired slot is never offered as an alternative. `data/vocab/clip-lookup.json` regenerated (rule text).
- Phrasebook (`src/phrases/phrases.view.js`): the Sephardi style plays the Israeli row; the ladder skips retired slots. The catalogue coverage table (`model.js`) still counts real rows.
- Settings/onboarding line (`src/pronunciation/forTradition.js`): "No recorded audio yet. Sephardi plays the Israeli clips (a synthetic man's or woman's voice) and shows the Sephardi reading in English letters; where no clip exists, Listen uses your device's Hebrew voice if it has one: a computer voice, not a teacher."
- Tests: `tests/audio.tradition-playback.test.js` runs the real manifests: for both voices and all six kinds, every id with an Israeli file (8,709 ids) resolves to that Israeli file under the Sephardi setting; no result points at `/sephardi/`; `bless-priestly-1` and the shalom words `r03-w1`, `r04-w2`, `r04-w3` checked by name; the dictionary lookup gets the Israeli slot for every text with one.

## Data facts behind the decision

- Every Sephardi clip and every Ashkenazi clip has an Israeli counterpart of the same voice (0 own-file-without-Israeli for every kind), so retiring the Sephardi files silences nothing.
- Sephardi words: 4,897 own files of 7,006 rows; Israeli files for 6,345 of those rows. The rule adds 1,448 word clips to the Sephardi setting; 661 word rows have no file in either tradition (device voice or silence, as before).
- Lines: 258 Sephardi, 258 Israeli counterparts. Prayers, letters, vowels, syllables: Sephardi had no files of its own; the Israeli stand-ins already applied per id (`data/audio/equivalence.json`, commit 39ae3543). That per-id list is now redundant for Sephardi but harmless; it still documents the rule history.

## Ashkenazi: same rule (owner decision, later 2026-11-07)

`PLAYBACK_TRADITION.ashkenazi` is now `'israeli'`. The Ashkenazi setting plays the Israeli clip of the same voice and shows the Ashkenazi reading in English letters; the caption reads "Israeli voice; Ashkenazi reading shown in English letters". The respelled `audio/<voice>/ashkenazi/*` files and their manifest rows stay on disk but are not played.

Known limit, stated plainly: the sound is Modern Israeli, so for Ashkenazi-specific values (tav as "s", cholam as "oy", qamats as "o") the clip will not match the English-letter reading. The on-screen reading is the Ashkenazi one; the voice is not. This was the trade-off flagged before the decision.

## Honest limits

No one listened to any clip in this environment (no speaker). The Sephardi-line duration and the "unnatural" verdict are the owner's, from the live site. The claim that Israeli clips are "complete for stories/arcade" is the coordinator's live-site observation (`audio/f/israeli/book/book20-p01.mp3` played to the end); this lane only counted the files (1,488 book, 370 games).

## In the catalogue (11 November 2026)

The site check of 11 November counted every Sephardi and Ashkenazi row without a file of its own as a missing clip (Sephardi 67% serving). Under this decision those rows are not missing: they play the Israeli clip of the same voice. The catalogue now says so. `tools/audio/plays_israeli.mjs` asks the player (`src/audio/player.js` `status()`) what each such row plays and writes `"status": "plays-israeli"`, `"source": "israeli-clip"` and `"plays": "<the Israeli file>"` on the row; the row's own `path` stays as the place a clip of its own would go. A row whose own clip appears goes back to `missing` so `tools/audio/mark_present.mjs` admits it, and a row whose Israeli clip disappears goes back to `missing` too. `data/audio/summary.json` counts these rows as `playsIsraeli`, apart from `missing` (rows nothing plays from a file) and `viaOther` (rows that play an alias or linked clip): `total = recorded + tts + playsIsraeli + viaOther + missing`. Tests: `tests/audit.audio-lane-2026-11-11.test.js`, `tests/audio.manifest.test.js`.
