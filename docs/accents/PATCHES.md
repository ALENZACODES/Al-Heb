# Patches for other owners (not applied)

All use the helper in src/pronunciation/forTradition.js (also exported from src/shell/tradition.js). Import path shown for each. Tested helpers: `congregationOf`, `setCongregation`, `respell`, `vowelSound`, `letterSound`, `audioNote`.

1. src/traditions/traditions.view.js:122-123 (tradition write never persists)
   Replace both lines with: `setCongregation(ctx.settings, t);`
   Add: `import { setCongregation } from '../pronunciation/forTradition.js';`

2. src/speak/speak.js:220 and 297 (speak sets show Israeli transliteration)
   Replace `item.translit` with `(respell(item.he, congregationOf(ctx?.settings)) || item.translit)` at both lines (also 362 for `q.played.translit`).
   Add: `import { respell, congregationOf } from '../pronunciation/forTradition.js';`

3. src/curriculum/intermediate.view.js:35 (392 of 635 words fall back to Israeli silently)
   `export const pronLine = (w, trad) => w?.pronunciation?.[trad] || (trad === "israeli" ? "" : respell(w?.he, trad)) || w?.pronunciation?.israeli || w?.translit || "";`
   Add: `import { respell } from '../pronunciation/forTradition.js';`

4. Letter sounds are Israeli-only. Add one line to src/curriculum/content.js loader: load `data/pronunciation/consonants.json` and expose `consonants: new Map(Object.entries(cons.letters))`; then:
   - src/curriculum/lesson.view.js:50 `L?.sound?.en || ""` -> `letterSound(c.consonants.get(id), congregation, { fallbackEn: L?.sound?.en }).en`
   - src/curriculum/review.view.js:26 `L.sound?.en || ""` -> `letterSound(c.consonants.get(p.key), congregation, { fallbackEn: L.sound?.en }).en`
   - src/letters/atlas.view.js:31 and src/letters/trace.view.js:159: same call with `ctx.settings`.
   Import: `import { letterSound } from '../pronunciation/forTradition.js';`. Effect: tav shows "s without dagesh (Shabbos), t with dagesh" for ashkenazi; unchanged for the others.

5. src/firstday/firstday.view.js:35,36,40 (first screen an Ashkenazi learner sees says "ah", "oh", "shah-LOHM")
   Line 36: append `v.id === 'kamatz' ? ' (' + vowelSound(cNiq.get('kamatz'), congregationOf(ctx?.settings)).en + ')' : ''` after `v.sound`, where `cNiq` is niqqud.json records by id; line 40: after `${w.sound}` add `, in your setting: ${respell(w.he, congregationOf(ctx?.settings))}`.
   Imports: `vowelSound, respell, congregationOf` from '../pronunciation/forTradition.js'. First-day audio is israeli-only (model.js:62); add `audioNote(congregationOf(ctx?.settings))` under the Listen buttons.

6. src/curriculum/exercises.session.js:159: `L.sound.en` -> `letterSound(consonantsById.get(id), tradition, { fallbackEn: L.sound?.en }).en` (needs the tradition passed into `buildChoiceQuestions` options; lower priority).

7. src/placement/model.js:58: low priority; placement distractors use the Israeli translit. Leave, or note "Israeli spelling" in the prompt.

8. Wherever a non-Israeli setting plays with no clip (audio-ui.js describePlay), show `audioNote(tradition, { hasRecording: false })` so the device-voice mismatch is stated in one sentence.
