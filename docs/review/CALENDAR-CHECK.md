# Calendar and festivals accuracy check (2026-11-04)

Scope: `src/curriculum/calendar*.js`, `src/festivals/*`, `data/calendar/*`, `data/festivals/*`. Only what was run or read is listed. Arithmetic agreement is not a halachic ruling; no rabbi or Hebrew teacher has reviewed any of it.

## Method

1. Ran the existing calendar and festival unit tests (below).
2. Printed `holidaysInHebrewYear(5787, {mode})` for reform, traditional and israel and compared by eye with the Hebcal snapshot (`data/calendar/hebcal-fixtures.json`, fetched 2026-11-04).
3. Compared with web pages fetched today (WebFetch): chabad.org (header "Wed. Nov. 4, 2026 | Cheshvan 24, 5787") and calendarlabs.com (2027 list, which gives the evening on which each festival begins).
4. Read `tests/calendar.festivals.test.js`, which already holds two independent computations (molad plus the four dehiyyot; Gauss's Pesach formula) and checks every civil day 2026-2028. I did not write a third.

## Results

| Check | Result |
|---|---|
| `calendar.dates`, `calendar.festivals`, `calendar.cards`, `calendar.ics`, `calendar.locations`, `calendar.parsha`, `calendar.reminders`, `calendar.view`, `curriculum.calendar` tests | PASS (all tests in each file passed) |
| `festivals.test.js` before my change | FAIL 2 of 19 (see Fixed) |
| `festivals.test.js` after regenerating `data/festivals/vocab.json` | PASS 19 of 19 |
| `node tools/meta/scan.mjs --text` | PASS (also re-run after writing this file; see end) |
| Today 2026-11-04 = 24 Cheshvan 5787 (`toHebrew`) | PASS, equals chabad.org header |
| 5787 is a leap year, Purim in Adar II | PASS (`isHebrewLeapYear(5787)` true; Purim 2027-03-23) |
| Rosh Hashanah 5787: 2026-09-12 (eve 09-11); second day 09-13 | PASS, equals Hebcal snapshot |
| Yom Kippur 2026-09-21 | PASS (snapshot; chabad-style source list agrees) |
| Sukkot 2026-09-26 to 10-02; Shemini Atzeret 10-03; Simchat Torah 10-04 (traditional only) | PASS vs snapshot (diaspora list has Simchat Torah, Israel list does not) |
| Hanukkah 25 Kislev = 2026-12-05, eve 12-04, last day 12-12 | PASS (snapshot "1 Candle" 12-04, "8th Day" 12-12) |
| Tu BiShvat 2027-01-23, Purim 2027-03-23 | PASS vs snapshot; Purim evening 03-22 equals calendarlabs |
| Pesach 2027-04-22 (eve 04-21); reform and israel end 04-28; traditional end 04-29 | PASS vs snapshot; eve equals calendarlabs |
| Shavuot 2027-06-11 (eve 06-10); traditional 2 days to 06-12 | PASS vs snapshot; eve equals calendarlabs |
| Tisha B'Av 2027-08-12 (eve 08-11) | PASS vs snapshot; eve equals calendarlabs |
| Rosh Hashanah 5788 = 2027-10-02 (eve 10-01 on calendarlabs); Simchat Torah 2027-10-24 | PASS |
| Diaspora versus Israel second days | PASS: Rosh Hashanah 2 days in israel mode, Pesach 7 / Shavuot 1 / no Simchat Torah in israel mode; traditional adds RH II, Pesach 8 days, Shavuot II, Simchat Torah, and `streak.js` `yomTovDates` also covers Sukkot day 2 and Pesach days 2 and 7 in traditional mode |
| Yom HaShoah, Yom HaZikaron, Yom HaAtzmaut weekday shifts | PASS vs snapshot 2027 (05-04, 05-11, 05-12); rules checked by the repo's tests for 5758-5900 |
| Candle lighting: city offsets, festival eves, Shabbat evenings that are also Yom Tov | PASS per `calendar.festivals`, `festivals`, `calendar.reminders` tests (Hebcal snapshot, 10 cities); I did not re-derive times independently |
| Preview labelling | PASS: festival screens carry `DRAFT_NOTICE` ("Draft. Nobody has proofread..."), prayer cards say "Draft, not reviewed by clergy", the festival vocab JSON note says unreviewed |
| Observance names/traditions | PASS with limits: settings offer Reform (default, one day), Traditional diaspora, and Israel; parsha schedule auto/Israel/diaspora. Labels are English only; no Ashkenazi/Sephardi festival names (Succos, Shabbos) and no Sephardi/Ashkenazi custom differences are modelled |
| Sensitivity (`src/shell/names.js` conventions) | PARTIAL: the four-letter name occurs in `data/calendar/prayer-cards.json` (22 hits) and `data/festivals/vocab.json` (27 hits) as source text, which `names.js` says is the correct display mode. I did not run the sensitivity tool or check audio targets for these. Calendar and festival JS contain no occurrence |

## Fixed

- `data/festivals/vocab.json` was stale against `data/vocab/words.json` and `data/corpus/*` (transliterations such as tapucha now tapuach, samecha now sameach, mishlocha now mishloach, orecha now oreach; several reading lines with updated pointing or punctuation). Regenerated with `node src/festivals/build.mjs` (the file is documented as builder output with no hand edits). `tests/festivals.test.js` now 19 of 19. If `words.json` or the corpus changes again, the file must be regenerated again.

## Not fixed, for others or judgement

- Not checked: sunset or candle times against any source today (only the repo's existing Hebcal-snapshot tests were run); havdalah, Rosh Chodesh, minor fasts, Omer; `.ics` import into real calendar apps; years outside 2026-2028 beyond what the repo's tests cover.
- One web source fetched (almo-ai.com) gave wrong dates (Purim 2027-02-22, Pesach 2027-03-20, Shavuot "~May 9"). Those are 14 Adar I, not Purim in this leap year; the page was disregarded. Do not cite it.
- `vocab.json` Hebrew and glosses have not been reviewed by a Hebrew speaker (stated in the file).
