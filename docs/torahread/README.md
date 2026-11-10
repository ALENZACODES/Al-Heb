# Torah reading mini-course (draft)

Route: `#/torahread` (sections: `/torahread/ladder|aliyah|words|trope|sources`). View: `src/torahread/torahread.view.js`.
Goal 1 of the user: read Torah and prayers aloud with a congregation. A Torah scroll has no vowel points and no cantillation marks; siddurim are pointed.

| Section | What it does | Files |
|---|---|---|
| Reading without vowels | 15 lines (Priestly Blessing x3, Shema, V'ahavta 6:5, Barchu, blessing before and after the reading, 7 short Torah verses) at 4 steps: 1 pointed, 2a two words in three keep points, 2b one in three keeps points, 3 no points. Each word is a button (tap to show points + transliteration). "Did you say it right?" shows the answer; the learner rates themselves (stored in `ctx.store` key `torahread.v1`). No speech recognition. | `ladder.view.js`, `pointing.js`, `data/torahread/ladder.json` |
| Aliyah rehearsal | 10 steps with certainty badges (common / varies / unknown), the three blessings from the registry with transliteration, English, audio hook; rehearsal mode hides the words; per-step "rehearsed" checkbox; movement-differences list with `unknown` wherever not certain. | `aliyah.view.js`, `data/torahread/aliyah.json` |
| 30 Torah words | The 30 most frequent written words (UXLC 2.6, five books, 79,985 written words), unpointed spelling first, tap for pointed form, how it is said, gloss, other readings of the same spelling with counts. | `words.view.js`, `data/torahread/words30.json` |
| Trope: not taught | What it is, why not here, what a beginner does (listen to a cantor, ask). | `trope.view.js`, `data/torahread/trope.json` |

Design choices (not established methods): the fading pattern in step 2 is positional (index mod 3); the "no points" text also drops the verse-end mark and turns a maqaf into a space.

## Rebuilding the data
```
python3 -I src/torahread/tools/fetch_torah.py /tmp/tr_raw     # network; downloads UXLC XML + JPS 1917 verse JSON
node src/torahread/tools/build-data.mjs /tmp/tr_raw           # writes data/torahread/verses.json and words30.json
```
The build re-derives Numbers 6:24 and Deuteronomy 6:4 with the registry's normaliser and stops if they differ from `registry.json`. English glosses of the 30 words come from `data/torahread/gloss-input.json` (original, hand-written; every "other reading" key must occur in the text or the build fails).

## Audio hooks (honest)
Views call `ctx.audio.play(kind, id, {text})` and print exactly what happened (file / browser voice / "No audio yet" with the reason), plus a static line saying whether a recording is listed (`ctx.audio.has`). Targets:
- registry lines: kind `prayer`, id = registry id (these exist in `data/audio/manifest.json`, all status `missing` today)
- new Torah verses: kind `prayer`, id `torahread-<verse id>` (e.g. `torahread-gen-1-1`): NOT in the manifest, so the result is "No audio yet: no audio entry exists"
- the 30 words: kind `word`, id `torahread-word-01` ... `torahread-word-30`: not in the manifest either
Lane 4 would need to add those ids (text = pointed Hebrew in `verses.json` / `words30.json`; for the divine name the spoken text is Adonai).

## Not done / needs a human
Clergy or Hebrew-teacher review of everything; Hebrew pronunciation of the fading steps has no audio; no screen reader test; denominational rows are deliberately sparse.
