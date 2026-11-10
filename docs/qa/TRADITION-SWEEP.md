# Tradition sweep (observed)

Method, as run: every route in `src/shell/router.js` (77 URLs, v0 and preview, parameter routes with one sample id) loaded at 375x667 in headless Chrome, once with `alef:settings.congregation` set to each of israeli, sephardi, ashkenazi (and `onboarded: true`). Visible text of `main` plus `aria-label`/`title`/`alt` strings were collected and diffed across the three runs. A second pass opened 9 lessons, 3 letter pages, the first-day walk (clicked through) and read-my-way with typed input. Each URL was loaded once per setting, with about 0.7 s of settle time. Checked against `data/pronunciation/*.json` and `src/pronunciation/forTradition.js` only; no native speaker, no audio. Static loads only: screens that need typing or taps beyond the above were not exercised. A few first loads showed "Loading..." (timing, not counted as a defect).

The setting was read on every route (0 mismatches in stored value, 0 page errors).

## Where the tradition changes the screen (looks right against the data)
- letter page (Tav): Ashkenazi "s without dagesh (Shabbos), t with dagesh"; Israeli/Sephardi "t".
- Sounds, vowel board, dot tile, syllable chips (Ashkenazi "BO-rukh", penultimate stress), soundgap, rules pages, compare, read-my-way (shabat/shabos, sholom, barukh/borukh), vocab ("eis", "hoyoh"), morning prayer respelling, intermediate lesson respellings (oleinu, shelomo rabo), torahreader word labels, trope names, first-day audio note and sound lines, listen, offline audio index label, settings radios.
- Tradition quiz states "Your setting is X" correctly.

## Status after later edits (2026-11-04)

Read from the working-tree diff; the screens were not re-swept in a browser for this update.
- Fixed in data: item 2 (consonant lines). `data/pronunciation/consonants.json` English lines for Resh, Ayin and Chet now follow each tradition's stored IPA (for example Sephardi Chet "pharyngeal [ħ]", Sephardi Ayin "pharyngeal [ʕ]", Sephardi Resh "front r, rolled or tapped"), with a "needs-native-review" note. The wording itself is still unreviewed by a native speaker.
- Fixed in view code: item 3 (atlas tiles: the Israeli slash IPA is now dropped outside the Israeli setting unless the tradition's stored IPA starts with the same symbol, so no value is invented), item 6 (trope label now reads "Sephardi/Mizrahi, used with your <setting> setting"), item 7 (syllable ladder note uses the setting's display label instead of the raw id).
- Still open: item 1 (Israeli and Sephardi Latin respellings identical, engine limit), item 4 (read-my-way lookup table vs rule engine for Ashkenazi, a data/model question), item 5 (stress mostly unmarked). Item 8 is by design. The card-order question in item 7 was not looked at again.

## Flagged: wrong or Israeli-only for the active tradition (as first observed)
1. **Israeli and Sephardi give identical Latin respellings on every screen** (known engine limit, stated in `forTradition.js`). Sephardi IPA differs on some screens (read-my-way: `ʔa.ta`, `ba.rux`) while the Latin line is the same as Israeli. Not fixable in view code.
2. **Resh, Ayin, Chet: English line is Israeli text under every tradition** (`data/pronunciation/consonants.json`). Resh english for sephardi and ashkenazi is "back-of-the-throat r ... not the English r" while the same record's IPA says "alveolar trill or tap" (sephardi) and "alveolar or uvular, by regional dialect" (ashkenazi). Seen on Sounds, lesson r09 (Resh and Mem), letter page `/letters/resh`. Ayin sephardi english "silent / glottal stop; do not try a pharyngeal" against IPA `[ʕ]`. Chet sephardi english "ch as in Bach" against IPA `[ħ]`. Data contradiction; left for a reviewer, nothing invented.
3. **Letter atlas tiles** show Israeli-only IPA (`/ʁ/`, `/χ/`, `/ʔ/`, `/t/` for Tav) in all three settings; the detail panel adds "In your setting: ..." only when the English differs. The tile grid ignores the setting.
4. **Read-my-way lookup vs rule engine disagree for Ashkenazi.** `respell()` gives `sholom`, `atoh`; the read-my-way table gave `sholoym`, `ateh` (cholam as "oy", final kamatz-he as "eh"), taken from `data/pronunciation/runtime/lookup-*.json`. Sounds lists "o" as the main cholam value and "oy" only as a Polish/Chasidic variant, so the table shows a regional variant without saying so on that sheet. Data/model question.
5. **Stress** is not marked on most respellings (vocab, morning, read-my-way). Ashkenazi stress differs (second-to-last); only syllable chips and the Israel page mark it.
6. **Trope** screen labels the Israeli setting "Names: Sephardi/Mizrahi (change in settings)", so an Israeli setting is shown as a different label.
7. **Syllable ladder** says `Sounds come from the "israeli" tradition setting` with the raw lowercase id (wording only). The card order differs between runs (not verified whether random).
8. **Israel-only screens** (`israel`, `israelsec`, phrasebook) are the same in all three settings by design (`israeliOnly`).

## Fixed in view code
- `src/letters/trace.view.js`: the letter page printed Israeli `/ipa/` next to the tradition's English line, giving "/t/ s without dagesh (Shabbos), t with dagesh" for Ashkenazi Tav. The `/ipa/` is now shown only when the tradition's English line equals the Israeli one. Not browser-rechecked after the edit.

## Tests run
- `node --test tests/pronunciation.*.test.js tests/v0.test.js`: 157 pass, 1 fail. Failing: `pronunciation.ssml.test.js` "every record has three well-formed SSML strings..." with `d.built.rendered.get is not a function`. Neither the test file nor its subject was changed by me; `data/pronunciation/derived/_ssml-*.json` are modified by someone else in the working tree.
- After my edit: `tests/letters*.test.js`, `accents.views`, `wordtrace.view`: 89 pass, 0 fail.
