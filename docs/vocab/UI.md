# Vocabulary screen (`#/vocab`)

View: `src/vocab/vocab.view.js` (route already registered as optional in `src/shell/router.js`). Helpers: `model.js` (pure search/filter/card creation), `loader.js` (lazy tier loader), `split-tiers.mjs` (build tool).

## Data loading
`data/vocab/vocab5000.json` is 1.4 MB, so it is not split for size, but the screen does not read it. `node src/vocab/split-tiers.mjs` writes one file per tier band to `data/vocab/packs/vocab5k-tier-{500,1000,2000,5000}.json` (95 KB, 90 KB, 178 KB, 534 KB after the round-2 fields tags/fn/forms were added). `data/vocab/packs/` is skipped by `tools/build-precache.mjs`, so these are fetched when a tier is opened and cached at runtime by sw.js. Only the selected tier loads (default: words 1-500); "All 5,000 words" loads all four. `tests/vocab.view.test.js` fails if the packs are stale (`--check` does the same from the command line). Note: `vocab5000.json` itself is still precached by the existing rules (under 2 MiB); that is a shell/build decision, not changed here.

## Browse
Tier select, topic select (topics come from the loaded tier), search box. Search: input containing Hebrew letters matches lemma or pointed form after removing vowel points and cantillation (pointed and unpointed queries both work); anything else matches the English gloss, case-insensitive. Cards show pointed Hebrew (`lang="he" dir="rtl"`), gloss, part of speech, topic, frequency rank, and a siddur-style transliteration from `src/pronunciation/transliterate.js` for the learner's `congregation` setting (labelled approximate; empty for the 2 words without vowel points). 40 cards per page ("Show N more" moves focus to the first new card).

## Audio
If `ctx.audio.has('word', id)` is true the recording is played (`ctx.audio.play`). No vocabulary ids are in the audio manifest today, so in practice every button is the browser's Hebrew voice (Web Speech `he-IL`), labelled "Listen (computer voice)". After playing, a polite live region says it is a computer voice, not a recording, that it reads Israeli pronunciation (not Sephardi/Ashkenazi if that is the setting), and may ignore vowel points. No Hebrew voice or no speech synthesis gives a plain "No sound" message.

## Review
Per word or per filtered set (up to 100 words per click) "Add to reviews" creates SRS cards (`newCard` from `src/curriculum/srs.js`, id `vocab:<id>`, plus `tier` and `topic`) in store key **`srs.vocab`**. They are deliberately not in `srs.cards`: the lesson review queue and home screen understand only letter/vowel/lesson-word ids, so mixing them would inflate the home "due" count with cards that screen cannot show. Consequence: the home screen does not count vocabulary reviews; the Review button here shows its own due count. Session: up to 20 due cards, Hebrew first, "Show answer", then Again/Hard/Good/Easy (keys 1-4 after the answer is shown), scheduling by `review()` in srs.js. A word rated Again is shown once more in the same session. Deep link: `#/vocab?review=1`.

## Notices
Top of the screen: "Draft: not proofread" (`role="note"`). Footer: the CC BY-SA 4.0 attribution text from `docs/vocab/LICENSES.md` (FrequencyWords by Hermit Dave, Wiktionary contributors via Wiktextract/kaikki.org, changes made) with links. The licence page links were not re-verified.

## Accessibility
One `h1` (focus target on navigation). Every control has a visible `label`. Mode buttons use `aria-pressed`. Result counts, audio notes and answers are in polite live regions. 48 px minimum targets for selects/inputs and buttons use the shared `.btn`. In review, focus moves to the card, then to the answer after "Show answer". Hebrew is always `dir="rtl"`. Not tested: a real screen reader, keyboard walk-through in a real browser, forced-colors, or reduced-motion (no motion is used).
