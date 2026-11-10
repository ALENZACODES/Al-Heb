# Calendar art: green and gold

Order sheet: `docs/images/calendar-art.csv` (13 rows: 1 header, 12 markers). The pictures are made in the outside picture studio and saved to the paths in the `path` column; `node tools/images/ingest_queue.mjs` (see `docs/images/QUEUE-2026-11-07.md`) checks the size, resizes if needed, strips metadata and writes them in place. Nothing in this sheet has been drawn yet.

## Why

The owner wants the calendar to look deep green and gold, and says the current reminder and check marks (text glyphs such as a plain check mark) do not look like they belong. This sheet orders one matching set of markers plus one header so that every mark in the calendar comes from the same hand.

## Slots that exist in the view today (read from `src/curriculum/calendar.view.js` and `calendar.style.js` on 2026-11-07)

| Slot in the view | Hook | Marker |
| --- | --- | --- |
| Page header, behind `h1` and the today box | `.alef-calendar` top | `assets/img/calendar/header.png` (1600 x 600) |
| Month grid day cell | `button.alef-cal-day.shabbat` | `markers/shabbat.png` |
| Month grid day cell | `button.alef-cal-day.holiday` (any holiday whose kind is not `roshchodesh`) | `markers/festival.png`, `festival-minor.png`, `fast.png`, `remembrance.png` by the holiday `kind` (`major`, `minor`, `fast`, `modern`) from `src/curriculum/calendar.js` |
| Month grid day cell, Rosh Chodesh | the cell's `hebrew.day === 1` (no class today; the year view underlines it with `.alef-cal-mini .rc`) | `markers/rosh-chodesh.png` |
| Reminders list item | `li[data-kind]` with `candles`, `havdalah`, `morning`, `evening`, `holiday`, `roshchodesh` (from `src/curriculum/reminders.js`) | `candles.png`, `havdalah.png`, `morning.png`, `evening.png`, `festival.png`, `rosh-chodesh.png` |
| Reminder types turned on (settings) | the `.check` rows in the settings form | `markers/reminder-set.png` |
| Finished lesson on a day | not in the calendar view yet; `src/morning/morning.view.js` draws a text check mark for `done` | `markers/lesson-done.png` |

Not ordered: a 12-month set. The month view shows the month as a text caption and the year view shows twelve text-titled mini tables; neither renders month art, so there is no slot for it. Add rows to the CSV if a month banner is designed later.

## Paths for wiring (Lane 4)

```
assets/img/calendar/header.png
assets/img/calendar/markers/candles.png
assets/img/calendar/markers/havdalah.png
assets/img/calendar/markers/festival.png
assets/img/calendar/markers/festival-minor.png
assets/img/calendar/markers/fast.png
assets/img/calendar/markers/rosh-chodesh.png
assets/img/calendar/markers/shabbat.png
assets/img/calendar/markers/remembrance.png
assets/img/calendar/markers/morning.png
assets/img/calendar/markers/evening.png
assets/img/calendar/markers/reminder-set.png
assets/img/calendar/markers/lesson-done.png
```

Markers are 256 x 256 PNG with transparency, drawn to read at 20 to 24 px (one bold silhouette, no fine detail). The header is 1600 x 600 PNG with its lower third kept quiet and dark so the title can sit over it. Both must be optional in the view: show the picture when the file exists, keep the current text and colour marks when it does not (an `error` listener removes the image, as the arcade's `art()` helper in `src/games/arcade.js` does).

## Palette for the studio

Deep green `#1F4D2E`, olive `#6B7F3A` (already in the house palette), warm gold `#D9A441`, paper-cream `#F6F1E7` for any light touch. No gradients, no gloss, no text, no star of David, no flags.

## Master command (paste once, then the 13 rows)

```
You are drawing a small matching set of calendar marks and one header for a Hebrew learning app for adults.
House style: flat vector, thick rounded charcoal outlines where an edge is needed, no gradients, no gloss,
no photo-realism, no cartoon sparkle.

PALETTE for this set only: deep green #1F4D2E, olive #6B7F3A, warm gold #D9A441, paper-cream #F6F1E7.
Every mark uses deep green as its body and gold as its highlight so the set reads as one family.

MARKERS (kind = marker): 256 x 256, transparent background, ONE silhouette centred with 24 px of clear space
around it, drawn to stay readable at 24 px on screen. No text, no numbers, no letters in any alphabet,
no star of David, no flags.

HEADER (kind = backdrop): 1600 x 600, landscape, no text, Jerusalem stone and olive motifs in deep green and
gold, light from the upper left, the lower third quiet and dark so white text can sit over it.

Save each file under the exact path in its row. Strip all metadata. After the 13, show me a contact sheet
so I can check that the marks match each other. Reply "ready" and I will paste the rows.
```
