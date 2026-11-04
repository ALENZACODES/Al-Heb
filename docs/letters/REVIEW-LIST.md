# Native-teacher review list (letters)

Status: NOT native-validated. Every stroke record is `validated:false`, `needsNativeReview:true`, `quality:"draft"`.
A teacher ticks a box when the shape AND the stroke order/direction (as shown in docs/letters/preview-print.png and preview-cursive.png) are what Israeli school handwriting teaches. Write the correction beside any unticked letter.

Legend: P = print (block) strokes, C = cursive (ktav yad) strokes. "doubt" = the build agent doubts it; "ok?" = looks plausible and (where noted) agrees with the one numbered reference found, but nobody qualified has checked it.

| Tick P | Tick C | Letter | Doubt (P / C) |
|---|---|---|---|
| - [ ] | - [ ] | `alef` | P: 3 strokes, order unverified. C: 2 strokes, hook first then diagonal; agrees with Abzug. |
| - [ ] | - [ ] | `bet` | P: bar+back as 1 stroke then base (2). C: 1 stroke from top-left; agrees with Abzug (start top, rightwards). |
| - [ ] | - [ ] | `gimel` | P: ok? C: DOUBT, body then a leftward flick; Abzug's gimel has a different shape/order. |
| - [ ] | - [ ] | `dalet` | P: bar RTL then stem. C: DOUBT, derived zig-zag split as 2 strokes. |
| - [ ] | - [ ] | `he` | P: arc then left leg. C: arc then leg, agrees with Abzug. |
| - [ ] | - [ ] | `vav` | ok / ok (agrees with Abzug: top to bottom) |
| - [ ] | - [ ] | `zayin` | P: bar then stem. C: DOUBT, one pen stroke assumed (joined by hand); Abzug writes it as 3 segments in a similar flow. |
| - [ ] | - [ ] | `chet` | P: arc then leg. C: arc then leg (leg includes a small spike above the arc, a font artefact?); order agrees with Abzug. |
| - [ ] | - [ ] | `tet` | P: DOUBT, one stroke. C: DOUBT, direction flipped to FOLLOW Abzug (inner short stem first, long sweep last); the automatic rule (top first) disagreed. |
| - [ ] | - [ ] | `yod` | ok / ok |
| - [ ] | - [ ] | `kaf` | P: 1 stroke (research-confirmed). C: ok, agrees with Abzug. |
| - [ ] | - [ ] | `lamed` | P: DOUBT, "L" stroke written left-to-right then diagonal. C: 1 stroke top-right hook leftwards then down; Abzug's lamed is a different (looped) shape. |
| - [ ] | - [ ] | `mem` | P: DOUBT, arc/body split. C: DOUBT, derived as ONE N-shaped stroke (right diagonal down, up the valley, down the left); research text says 3 strokes; Abzug's mem order (down, up-left, down) is consistent with the N. |
| - [ ] | - [ ] | `nun` | ok / ok (agrees with Abzug: down then curl left). Note the font's regular nun is long and descends. |
| - [ ] | - [ ] | `samekh` | P: DOUBT, 2 strokes. C: loop from the top going counter-clockwise (left side first); agrees with Abzug. |
| - [ ] | - [ ] | `ayin` | P: right arm first (research exception). C: DOUBT, loop with crossing drawn as one stroke. |
| - [ ] | - [ ] | `pe` | P: ok? C: 1 spiral from top-left; agrees with Abzug. |
| - [ ] | - [ ] | `tsadi` | P: second stroke from top right (research). C: one "3"-shaped stroke from top-left, agrees with Abzug in start/direction. |
| - [ ] | - [ ] | `qof` | P: DOUBT. C: arc then leg. |
| - [ ] | - [ ] | `resh` | ok / ok (agrees with Abzug: left to right across the top, then down). |
| - [ ] | - [ ] | `shin` | P: DOUBT, last part rises (bottom to top), violates top-to-bottom rule; teacher must say whether Israeli print shin is 2 or 3 strokes and in which order. C: DOUBT, one looping stroke; Abzug has 5 segments. |
| - [ ] | - [ ] | `tav` | P: arc/leg. C: DOUBT, split in two (arch + right stem, then left stem with foot) to follow Abzug; the font glyph has no pen-lift information. |
| - [ ] | - [ ] | `kaf-final` | ok? / ok? |
| - [ ] | - [ ] | `mem-final` | P: bar first then body (2, research-confirmed count). C: DOUBT, start at the junction, clockwise loop then tail. |
| - [ ] | - [ ] | `nun-final` | ok / ok (a plain long vertical) |
| - [ ] | - [ ] | `pe-final` | P: ok? C: DOUBT (HIGH). The Gveret Levin glyph is an unusual tall loop-and-stem form; confirm it is what Israeli schools teach before using it for tracing. |
| - [ ] | - [ ] | `tsadi-final` | P: ok? C: DOUBT (HIGH), same reason as pe-final. |

Also for a teacher: (1) is Israeli school PRINT ever written by hand or only read? (2) which stroke counts do they teach for the letters above; (3) the connecting entry/exit strokes cursive letters have inside words are not modelled at all.

## Comparison with one external numbered reference (Round 2, step 3)
Source: Charles Abzug (JMU), "Alef-Bet Instructions for Writing", 2010, slides 7-9 "Cursive" (https://users.cs.jmu.edu/abzugcx/Public/Biblical-Hebrew/HEBR-&-REL-131/Alef-Bet-Instructions-for-Writing.pdf). I VIEWED the diagrams to compare; nothing was copied. Caveats: it is a US course handout in a calligraphic (nib-like) ktav, not an Israeli Ministry of Education model; it numbers pen segments, not necessarily pen lifts; my reading of small arrows can be wrong. Print ("block") slides have no numbers, so print could not be compared.
Compared 20 cursive letters.
- Agree on start and direction (14): bet, he, vav, chet, kaf, nun, nun-final, samekh (counter-clockwise from top-left), ayin (starts top, goes down), pe, tsadi, resh, yod, mem (right stroke down, valley up, left stroke down).
- Agree on stroke ORDER between parts: alef (hook, then diagonal), he and chet (arc first, leg last), mem-final (clockwise from top-left, tail last).
- Disagreed with my automatic rule, CHANGED to follow Abzug: tet (reversed direction), tav (split into arch+right stem, then left stem with foot).
- Partly agree / different shape (so not comparable): gimel (both start at the top; Abzug segment order differs), dalet, lamed, zayin (similar flow), shin (Abzug has 5 segments; ours 1), pe-final and tsadi-final (different forms).
Other sources checked: hebrewversity.com ("most letters 1-3 strokes; top to bottom, right to left" only) and talkpal.ai (no per-letter data). Hebrew4Christians' alphabet page was blocked by this session's fetch allow-list, so it was NOT compared.

## Round 3: contact-sheet review (build agent, not a teacher)
Sheets: docs/letters/review-sheets/<id>.png (print | cursive, numbered start dots, direction arrows) and the printable
docs/letters/REVIEW-SHEET.html (54 tick rows). Generator: `python3 tools/letters/review_sheets.py` (needs rsvg-convert + Pillow).
Mechanical check (review-sheets/coverage.json): 100% of every stroke's median points lie inside the glyph outline dilated by
half the stroke width, for all 54 records; no path leaves its outline, so nothing was changed in letters.json and no stroke was reordered.
What the sheets show that a teacher must rule on (all already-listed doubts stand; these are the places where a stroke runs
bottom-to-top against rule R2, as seen on the sheets):
- print mem: stroke 2 starts at the mid-left junction and RISES into the arc before coming down the right side.
- print shin: stroke 1 ends by rising up the right arm (listed above).
- print mem-final: stroke 1 is bar + right side + base as one stroke (bar drawn left to right per R3), stroke 2 is the left stem; the table row above says "bar first then body", which is the same data described differently.
- cursive chet: stroke 1 starts at the left end of the arc, at mid-height, and rises to the apex before coming down on the right.
- cursive tet: starts at the inner right stem and rises (deliberate, follows Abzug; listed above).
- cursive mem: the middle leg of the N rises (listed above).
- cursive ayin: the loop rises after the crossing (listed above).
- cursive pe-final: stroke 1 starts at mid-left and RISES into the top loop before descending the stem (HIGH doubt already; the whole form needs confirming).
- cursive tsadi-final: after the first descent the pen rises round the top-right loop, then descends the stem (HIGH doubt already).
Start dots that coincide in the data (print samekh strokes 1 and 2; print mem-final 1 and 2; print tav 1 and 2) are drawn offset on the sheets so both numbers stay readable; the data is unchanged.
