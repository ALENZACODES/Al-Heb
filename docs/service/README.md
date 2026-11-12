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

## Prayer Practice (`#/prayer-practice`, CODER-100 F3-F9)
View `src/service/practice.view.js`, model `src/service/practice.model.js`, store key `service.practice` (`{lines, words, ladder}`). Lazy route.
- Service ring (F8): `serviceRing()` in `src/lib/counts.js`; denominators are `TOTALS.service` from `tools/counts/build-counts.mjs`, counted with the same `gradeLines`/`gradeWords` the coverage uses (Friday evening 32 lines / 303 words / 17 prayers, Shabbat morning 53 / 507 / 28, weekday morning 37 / 353 / 23). Shown on Service (coverage tab), Progress and Prayer Practice. The ring is the mean of lines read, words known and prayers followed; every part is the learner's own mark.
- Line Tutor (F3): every service line, in order: tap-to-hear words where a word clip exists, transliteration toggle, English (per line where the registry has one per line, else the whole text's English once), Play the line, "I read this line aloud" (self-check).
- Word Deck (F4): every distinct word of a service (same key as the coverage word count), most frequent first; "I can read it" / "Not yet"; words known per service.
- Fluency Ladder (F7): Hear It, Follow It, Read It with Vowels, Read It without Vowels per prayer. Follow It also counts a Companion practice mark, a line card, or all of the prayer's lines read in the tutor. The without-vowels view only removes points from the registry line.
- Parts Roadmap (F5): the guide's sections in service order, held prayers and the order's gaps from `data/corpus/gaps.json` ("Not in Aleph yet", with where and why). No dates promised.
- Festivals (F9): the guide's `otherOccasions` lists (festivals, Hanukkah) with held prayers and gaps, and the next holidays from `src/curriculum/calendar.js`. The festival Amidah is a gap (`g-festival-kiddush`), shown as not in Aleph yet.

## Shabbat Companion additions
- Festivals This Week (F2): holidays starting within 8 days (calendar observance setting), each with the prayers Aleph holds or the gap.
- Countdown and Shabbat Mode (F10): candle-lighting countdown from the existing `candleLighting()` computation for the Calendar location (no location: no countdown). Shabbat Mode hides the menu, sound bar, teachers and footer while the page is open (class `alef-shabbat-quiet` on the root element, removed on leaving), preference `service.shabbatMode`.
- Join-in drills (F6): two more, Gadlu (leader / congregation roles from the guide) and Kedushah (the three verses; the leader's lines between them are not held).
