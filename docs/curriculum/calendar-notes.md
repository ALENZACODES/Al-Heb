# Calendar notes (Lane 1, round 2, 2026-11-04)

Files: `src/curriculum/calendar.js` (dates, holidays, sun times), `calendar.parsha.js`, `calendar.grid.js`, `calendar.locations.js`, `calendar.prayer.js`, `calendar.view.js`, `calendar.style.js`, `reminders.js`, `reminders.ics.js`, `reminders.notify.js`; data in `data/calendar/`; tests `tests/calendar.*.test.js`; dev tools (network, not run by `node --test`) in `tests/calendar.tools/`.

## What was checked against Hebcal (and what that means)
Hebcal is itself a calculation, not a halachic authority. "Matches Hebcal" means the arithmetic agrees.

| Item | Result | How to re-run |
|---|---|---|
| Gregorian to Hebrew date, every day 2000-2040 (14,976 days) | 0 mismatches | `node tests/calendar.tools/compare-dates.mjs 2000 2040` |
| Holiday dates, Hebrew years 5740-5900, reform, israel and traditional modes (RH, YK, Sukkot, Shemini Atzeret, Simchat Torah, Hanukkah, Tu BiShvat, Purim, Pesach, Shavuot, Tisha B'Av incl. 10 Av shift, Yom HaShoah, Rosh Chodesh) | 5,696 comparisons, 0 mismatches | `fetch-hebcal.mjs <dir>` then `compare-holidays.mjs <dir>` |
| Yom HaZikaron / Yom HaAtzmaut weekday shifts | match from Hebrew year 5758 (1997/8) on; earlier years use an older rule not implemented | `compare-holidays.mjs <dir> 5758` |
| Candle lighting and havdalah, 63 preset locations x 34 weeks (Nov 2026 - Jun 2027), two havdalah methods | candles: 2,141 of 2,142 identical to the minute, 1 value one minute earlier than Hebcal; havdalah: 4,262 of 4,271 identical, 9 one minute earlier | `node tests/calendar.tools/compare-times.mjs` |
| Torah portions, 14 year types x diaspora/Israel | all 161 years of the same type have identical sequences; tables learned from 5740-5820 reproduce 5821-5900 exactly | `build-parsha.mjs <dir> <out>` |

Candle times are shown rounded DOWN to the minute (never later than the exact time); havdalah rounded to the nearest minute. Those rounding rules are what make the output equal Hebcal's.

Offline test fixtures (a snapshot of Hebcal output, CC BY 4.0, credit Hebcal) are in `data/calendar/hebcal-fixtures.json`; `tests/calendar.dates.test.js` and `calendar.parsha.test.js` compare against it without network.

## Hebrew date arithmetic
Standard arithmetic calendar (molad parts 12084 + 13753, the four dehiyyot, year-length corrections). Checked as above.

## Holidays and Reform conventions
| Item | Status |
|---|---|
| Rosh Hashanah: most North American Reform congregations keep one day, some two | sourced (reformjudaism.org). Default: one day plus `optionalExtraDays: 1`. |
| Pesach 7 days for most Reform communities | sourced (reformjudaism.org) |
| Shemini Atzeret combined with Simchat Torah on 22 Tishrei | sourced: reformjudaism.org Simchat Torah page, "in Israel and in Reform congregations, which generally observe one day of holidays rather than two" |
| Yom Kippur one day | 10 Tishrei; one day in every stream, so the open question in VERIFICATION 1.14 is only about Shavuot |
| Shavuot one day in Reform | still not stated explicitly by a fetched page; consistent with the sentence above (one day of holidays rather than two). Marked `verified: "inferred"`. |
| Tu BiShvat, Tisha B'Av | dates equal Hebcal (applied DATA-FIXES B1, B2); Reform observance of Tisha B'Av varies |
| Rosh Chodesh | dates equal Hebcal; Reform-specific practice not researched (shown as a date only) |
| Yom HaShoah, Yom HaZikaron, Yom HaAtzmaut | dates equal Hebcal from 5758; Reform practice not researched |
Modes: `reform` (default), `traditional` (two-day Rosh Hashanah and Shavuot, 8-day Pesach, Simchat Torah separate, Hebcal diaspora dates), `israel` (one festival day, two-day Rosh Hashanah). Not a statement about any particular congregation.
Not included: Omer, Lag BaOmer, minor fasts, Yom Yerushalayim, Shabbat special names (Shekalim, Zachor...).

## Torah portions
Computed offline from the year type (weekday of 1 Tishrei x year length) with tables in `data/calendar/parsha.json`. The tables were derived from Hebcal's output, not from an independent source; independent invariants are tested for 5740-5900 (sequence order, Bereshit on the first Shabbat after Simchat Torah, Devarim on Shabbat Chazon, Bamidbar before Shavuot). Default schedule is diaspora outside Israel and Israeli for Israeli presets; Reform congregations in the diaspora normally follow the diaspora schedule, but in years when a festival's last day falls on Shabbat the two schedules differ for several weeks and a congregation may follow either (setting "Torah reading schedule"). Portion names are Hebcal's transliterations; Hebrew names are unpointed.

## Locations, candle lighting, havdalah
- 63 presets in `data/calendar/locations.json` (US, Canada, Israel, a few others) with hand-entered approximate coordinates (not GeoNames), IANA time zones, plus manual latitude/longitude. The app never calls geolocation.
- Candle minutes: 18; Jerusalem 40; Haifa and Zikhron Ya'akov 30 (Hebcal's published text); other Israeli presets 20. The 20 is not in Hebcal's published text: it is what Hebcal's output implies (observed 2026-11-04 for 13 Israeli points and Tel Aviv by GeoNames id, where an explicit `b=18` made no difference). VERIFICATION 1.08 says "18 elsewhere"; that row should get this caveat. Any value 0-90 can be typed.
- Havdalah: sun 8.5 degrees below the horizon (default, equals Hebcal's `M=on`), or 42, 50 or 72 minutes after sunset. At high latitudes in summer the angle method has no answer; the UI says so and suggests minutes.
- Sun position is evaluated at the event time (one refinement pass); sea-level horizon, no elevation or terrain.

## Reminders
- In-app list plus a `.ics` file (RFC 5545): candle lighting (Fridays and festival eves) and havdalah as absolute UTC times; morning and evening prayer moments as floating local times; holidays and Rosh Chodesh as all-day events; one VALARM (ACTION:DISPLAY) each. Candle lighting alert default 30 minutes before; holidays alert at 09:00 on the eve; prayer moments at the event time.
- Verified: tests parse the file back (structure, CRLF, 75-octet folding, escaping, UTC/floating/all-day dates, TRIGGER values); a one-off check with the Python `icalendar` 7.3.0 package (installed to /tmp only, not in the repo) parsed an Israel export with 421 events and 421 alarms; a headless Chromium download produced the file.
- NOT verified: import into Apple Calendar, Google Calendar or Outlook, and how each treats VALARM on import. Calendar apps differ; some ignore alarms on imported events.
- Notifications use the Notification API with setTimeout and only fire while the app is open. No server, no push, no background. The button is shown only when the browser supports Notification; permission is requested on click only.

## Prayer cards
`data/calendar/prayer-cards.json`: 23 morning, 23 evening, 4 Friday-evening and 2 Saturday-evening reflections written by Lane 1 in the spirit of `book/opening-prayer.txt`, each with a one-line pointed Hebrew phrase sliced verbatim from a `data/corpus/registry.json` entry (test checks containment). Labelled draft and not clergy reviewed in the data and on screen. Glosses are Aleph's own plain renderings. Modeh Ani switches to the feminine form for voice `f` (checked against `prompts.json`). The previous `dailyPrompt` rotation in `prompts.js` is no longer shown in the calendar view (its file is untouched).

## Day pages and markers (2026-11-07)
- Route `/day/<iso-date>` (`src/curriculum/day.view.js`, model `calendar.day.js`, copy `data/calendar/days.json`): one section per observance on the day (festival, fast, Rosh Chodesh, Shabbat, Friday as the eve of Shabbat, the eve of a Yom Tov), each with the pointed Hebrew name, transliteration, English, what the day is (2-6 sentences), what people do, key words (he / tr / en), prayers and readings, links into Aleph (registry texts via `/read/<id>`, festival lessons, the festival word pack under `/festivals/<id>`), the Torah portion on Shabbat, and candle-lighting / havdalah / festival-end times for the chosen city through the same `calendar.js` functions the reminders use (nothing re-derived). Previous / next day and previous / next notable day.
- Copy was written for Aleph in plain English (Reform-friendly, widely shared customs, no ruling); it is marked draft on screen and has not been reviewed by clergy or a Hebrew teacher. Texts are linked only when the registry id exists; Yom Kippur, Purim, Tisha B'Av and the Israeli national days have no text in the corpus and say so.
- Markers (`calendar.markers.js`): festival (major), minor festival, fast, remembrance day (the modern Israeli days), Rosh Chodesh, Shabbat, candle lighting, havdalah, studied (streak `doneDates`); the reminders list and the settings rows add morning, evening and reminder-on. Each is an inline SVG shape plus a text label; the grid shows the shape with the label for screen readers and the cell's own text. Optional artwork is the set Lane 2 ordered in `docs/images/CALENDAR-ART.md`: `assets/img/calendar/header.png` and `assets/img/calendar/markers/<name>.png` (candles, havdalah, festival, festival-minor, fast, rosh-chodesh, shabbat, remembrance, morning, evening, reminder-set, lesson-done; map in `ART_NAME`). A picture is shown only when the file exists (probed once per browser session, result kept in sessionStorage `alef:calendar.art`, an `error` listener removes a picture that fails); until the files exist the first calendar visit of a session logs one 404 per slot in the console and nothing else changes. New Hebrew on the day pages (key words, names) has no audio; it is listed for the audio lane in `docs/audio/NEW-LINES-FOR-RENDER-2026-11-07.md`.
- Grid: a day with any marker other than "studied" is a link to its page; other days remain buttons that open the short detail panel (which also links to the page). Tests: `tests/calendar.day.test.js`, `tests/calendar.view.test.js`.
