# Calendar reminder QA: festivals 2026-2028 and candle-lighting offsets (P061 stage 2, 2026-11-04)

Test: `tests/calendar.festivals.test.js` (`node --test tests/calendar.festivals.test.js`, under 2 s). Result (after stage 5-6): 14 pass, 0 fail, 0 todo. No calendar data file was edited; the two defects found in `src/curriculum/reminders.js` were fixed in stage 5 (below).

## Independent computations written in the test

Neither reuses calendar.js. Both were calibrated against the Hebcal snapshot (`data/calendar/hebcal-fixtures.json`) for Hebrew years 5785-5790 inside the test, and against each other.

- (A) The classical arithmetic Hebrew calendar: molad of Tishrei plus the four dehiyyot (molad zaken, GaTaRaD, BeTU'TaKPaT, lo ADU Rosh), in the form published by Reingold and Dershowitz, "Calendrical Calculations", Software: Practice and Experience 20(9), 1990, pp. 899-928 (the `hebrew-calendar-elapsed-days` function also in GNU Emacs `cal-hebrew.el`). calendar.js uses the later Dershowitz-Reingold formulation (noon rule plus 356/382-day year delays), so agreement is between two different formulations of the same rules.
- (B) Gauss's formula for the Gregorian date of 15 Nisan (C. F. Gauss, "Berechnung des jüdischen Osterfestes", Monatliche Correspondenz, 1802), in the form given by Jean Meeus, "Astronomical Algorithms", 2nd ed., Willmann-Bell 1998, chapter 9. The other festivals follow from 15 Nisan by fixed day counts (1 Tishrei = 15 Nisan + 163, 6 Sivan = +50, 14 Adar [II] = -30, 9 Av = next 1 Tishrei - 51) and from the year length (next 15 Nisan minus this one) for Hanukkah and Tu BiShvat.
- (C) For sunset, the "sunrise equation" (Wikipedia article of that name; accuracy about 1-2 minutes), used only as a gross-error check on the app's NOAA-style solar code.

## What was checked

| Check | Result |
|---|---|
| Every civil day 2026-01-01 to 2028-12-31 (1,096 days): calendar.js `toHebrew` versus (A) | 0 mismatches |
| Year lengths, leap years and month lengths 5786-5789: calendar.js versus (A) versus (B) | agree |
| Every festival start in Hebrew years 5786-5789 (covers all of 2026-2028), modes reform, traditional, israel: calendar.js versus (A), (B) and the Hebcal snapshot (13 festivals, 14 in traditional, including the Tisha B'Av 10-Av shift in 5789 and the Yom HaShoah / Yom HaZikaron / Yom HaAtzmaut weekday rules, recomputed in the test) | 0 mismatches (52 + 56 + 52 occurrences) |
| Day counts per mode (RH 1/2/2, Pesach 7/8/7, Shavuot 1/2/1, Sukkot 7, Hanukkah 8), derived last days versus Hebcal (Pesach VII and VIII, Chanukah 8th Day, Rosh Hashana II, Shavuot II), eve = start - 1 | agree. Note: Hebcal's "Chanukah: 1 Candle" is the evening before 25 Kislev, so it equals calendar.js's `eve`, not `start` |
| Classical weekday constraints 5786-5790 (RH never Sun/Wed/Fri; YK never Fri/Sun; Pesach I never Mon/Wed/Fri) | hold |
| Candle offsets by city: Hebcal candle time versus calendar.js sunset for the 10 snapshot cities (Toronto, New York, Los Angeles, Chicago, Jerusalem, Haifa, Tel Aviv, London, Sydney, Miami), 34 Fridays each (340 values) | the implied offset equals the preset `candleMinutes` every time: 18 outside Israel, Jerusalem 40, Haifa 30, Tel Aviv 20 |
| The same through the reminders path (`normalizePrefs` with a preset, `buildReminders`): candle items for each city | equal to Hebcal to the minute, description names the city's offset, local time string identical |
| (C) sunrise equation versus Hebcal sunset (candle time + offset) for the 340 values | all within 3 minutes |
| All 63 presets in `data/calendar/locations.json`: offset rule (18; Jerusalem 40; Haifa and Zikhron Ya'akov 30; other Israeli cities 20), `suggestCandleMinutes`, Israel flag versus the bounding box, `Asia/Jerusalem` only for Israeli presets | pass |
| Reform candle reminders 2026-2028 (Toronto): one on the eve of every festival's first day, Friday eves merged with Shabbat, none on a Saturday | pass |

## Defects found in `src/curriculum/reminders.js` and fixed (stage 5)

1. Missing candle reminders for later Yom Tov days. `eveNames` was built from each holiday's `eve` (= day before `start`) only, so there was no reminder for the eve of Pesach VII (20 Nisan: 2026-04-07, 2027-04-27, 2028-04-16) in any mode, nor for second days in traditional mode (Rosh Hashanah II, Sukkot II, Pesach II and VIII, Shavuot II). Fix: the evenings are now every Friday plus the evening before every day in `yomTovDates()` from `streak.js` (so reminders and the streak freeze use one list of Yom Tov days), titled by the festival(s) containing that day.
2. Wrong time for a Yom Tov evening that is Shabbat or itself a Yom Tov day. Simchat Torah 2026-10-04 and 2027-10-24 follow Shemini Atzeret on Shabbat, and the app emitted "Candle lighting (Simchat Torah)" 18 minutes before sunset on the Saturday. Fix: when the evening is a Saturday, or a Yom Tov day other than Friday, the reminder is at nightfall by the user's havdalah method (8.5 degrees or N minutes after sunset; equal to the havdalah time on a Saturday), the description says to light from an existing flame after the day has ended, and weekday second nights are titled "(second night)". A Friday that is a Yom Tov keeps the before-sunset Shabbat rule.

Tests: "the eve of the LAST Pesach day", "a candle reminder on the eve of every Yom Tov day 2026-2028" (reform 21, israel 24, traditional 30 Yom Tov days; before sunset versus after nightfall; every Saturday item is a Yom Tov evening and after sunset), "traditional mode: Simchat Torah" (equals the Toronto havdalah time to the minute). The existing reminders, ics and view suites stay green. The `.ics` export and notification code consume the item list unchanged; a Saturday-night item is an instant like any other.

Israel (stage 6): Jerusalem, israel mode, 2026-2028: a reminder on the eve of each of the 24 Yom Tov days; first-day eves are 40 minutes before sunset; the evening after Shabbat that leads into Rosh Hashanah II is after nightfall; no Simchat Torah, Pesach II or Pesach VIII night.

## Not checked

- Diaspora two-day Yom Tov as an option separate from traditional mode: it does not exist; traditional mode was checked as a whole (dates, day counts, candle reminders).
- Israel: dates in israel mode were checked (one-day festivals, two-day Rosh Hashanah; the Israeli Torah-reading schedule is covered by `tests/calendar.parsha.test.js`, not here). Israeli candle times were checked only for Jerusalem, Haifa and Tel Aviv, against Hebcal, which is itself a calculation; the 20-minute offset for other Israeli cities is an inference from Hebcal's output (see `docs/curriculum/calendar-notes.md`), not a published rule.
- Festival-eve candle times (as opposed to Friday times) are not in the Hebcal snapshot, so they were checked for presence, day and before/after sunset (and, for Simchat Torah, equality with havdalah), not to the minute against Hebcal. Hebcal's own second-night rule was not compared.
- Havdalah times, Rosh Chodesh, the Omer, minor fasts, and years outside 2026-2028 (the existing `tests/calendar.dates.test.js` covers Hebcal agreement for 5785-5790).
- Import of the `.ics` export into Apple, Google or Outlook calendars; notification delivery (see calendar-notes.md).
- No halachic authority was consulted; agreement with Hebcal and with two textbook algorithms is arithmetic agreement only.
