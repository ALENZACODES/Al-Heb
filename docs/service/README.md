# Service: Siddur Coverage % and Follow the service (draft)

Route `#/service`, view `src/service/service.view.js` (model `src/service/model.js`, data `data/service/orders.json`). Offline, no network.

## Hooks (src/shell is not edited by this lane)
- `src/shell/router.js`, before `progress`: `{ name: 'service', pattern: '/service', module: '../service/service.view.js', title: 'Follow the service', owner: 'service', optional: true, quick: 'nav.service' },`
- `src/shell/i18n.js`: `'nav.service': 'Follow the service',`

## What it does
- Coverage: for Friday evening, Shabbat morning and weekday morning, the share of lines Aleph holds that the learner can decode now. It reuses `src/progress` (`readableNow` -> `decode.gradeLines/gradeWords`); nothing is re-implemented. Percentages are rounded down. "Decodable" is not "fluent". Known gaps (`data/corpus/gaps.json` ids) are listed separately, so the percentage is not of the whole service.
- Follow the service: page-turn cards for Friday evening and Shabbat morning from registry texts only: pointed Hebrew, transliteration per tradition (hide toggle), registry English. Stand/sit/sing/silent markers appear only where `torah-service-guide.json` says so, each with its quoted words (a test verifies the quote); otherwise "varies by congregation". Friday evening has no guide wording, so it has no markers. Audio button only when `audio.status` reports a real file (speech fallback does not count).

## Limits
Draft, not clergy reviewed. Sequence differs in real congregations. No prayerbook text, layout or page numbers (Mishkan T'filah etc. are copyrighted). Weekday morning has the same Follow cards (no stand/sit markers: the guide quotes are for Shabbat morning only, so every weekday card says "varies by congregation").

## Checks
`node --test tests/service.*.test.js`; `node tests/service.shot.mjs <siteCopyWithRoute> <outDir>` (390px, no horizontal overflow, no console errors).
