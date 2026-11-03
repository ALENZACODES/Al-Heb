# Calendar notes (Lane 1)

## Hebrew date arithmetic
Standard arithmetic calendar (Dershowitz and Reingold style: molad parts 12084 + 13753 per month, the four dehiyyot, year-length corrections 356/382). Implemented from the published algorithm as I remember it. Verified ONLY by the dated fixtures in `tests/curriculum.calendar.test.js`:
- torah-box.net holiday pages 5787 and 5788 (list the evening an observance begins): Hanukkah, Purim, Pesach, Shavuot, 9 Av 5787; Rosh Hashanah, Yom Kippur, Sukkot, Shemini Atzeret 5788. Same site's header showed 23 Cheshvan 5787 on 2026-11-03.
- almo-ai.com (poor source: its Pesach and Purim rows were wrong): only Rosh Hashana 2026-09-12, Yom Kippur 09-21, Sukkot 09-26, Simchat Torah 10-03 were used, and they agree with the independent anchors above.
- Structural checks (year lengths, Rosh Hashanah never Sun/Wed/Fri, round trips).
Not checked: years far outside 5700-5900, an authoritative published table.

## Reform conventions (what was and was not verified)
| Item | Status |
|---|---|
| Rosh Hashanah: most North American Reform congregations keep ONE day; some keep two | verified (reformjudaism.org "Do Reform Jews celebrate one or two days of Rosh HaShanah"). The module shows one day and exposes `optionalExtraDays: 1`. |
| Pesach: 7 days for most Reform communities (one-day yom tov convention, since 1846 Breslau conference per the same site) | verified (reformjudaism.org "Passover: 7 or 8 days") |
| Sukkot, Shemini Atzeret, Shavuot, Yom Kippur: one festival day each | INFERRED from the one-day-per-festival convention; the Pesach article names these festivals but I did not capture explicit per-festival statements. Marked `verified: "inferred"`. |
| Shemini Atzeret and Simchat Torah combined on 22 Tishrei | inferred (Israeli convention) |
| Hanukkah 8 days, Purim 14 Adar (Adar II in leap years) | standard dates, dates match the torah-box fixtures |
| Tu BiShvat, Tisha B'Av (moved to 10 Av if 9 Av is Shabbat) | UNVERIFIED (recalled); Reform observance of Tisha B'Av varies |
| Not included | Yom HaShoah, Yom HaZikaron, Yom HaAtzmaut (shifting rules not researched), Rosh Chodesh, Omer, minor fasts, parsha |
Do not present the list as an authority for any particular congregation.

## Candle lighting
- Defaults: 18 minutes before sunset; Jerusalem 40 minutes. Source: Hebcal's candle-lighting help page states 18 before sundown, 40 for Jerusalem, 30 for Haifa (page fetched; Hebcal's API/service terms were NOT researched and Hebcal is not called). Other communities use other offsets; the offset is configurable (`offsetMinutes`).
- Sunset algorithm: NOAA solar calculator equations (declination, equation of time, hour angle at 90.833 degrees zenith). No external table of sunset times was reachable, so only sanity checks exist (equator equinox about 18:00; Toronto 2026-11-06 sunset 16:50-17:15 EST; seasons ordered; polar night null). Output for Toronto 2026-11-06 is sunset 17:02, candles 16:44. NOT validated to the minute.
- Elevation, horizon and DST are not modelled beyond the IANA zone formatting via built-in Intl.
- Store/app-store policy on location permissions and local notifications was not researched. The view takes `ctx.settings.location` and never calls geolocation.
