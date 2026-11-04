# Teacher share and Class summary (DRAFT, not educator reviewed)

Closes gap 11 in docs/curriculum/class-track/PEDAGOGY-MAP.md ("mistakes are logged per learner but nothing aggregates them for a teacher").

## Learner: Share my progress with my teacher (`#/share`)
Export builds a summary on the device from the store, using `weakSpots()` in src/progress/model.js (Spot It pair errors, SRS lapses, pron.misses). Output: a copyable code (`ALEF-SHARE-1.` + base64url JSON) and a .json / .txt download. Before export the page says what is shared and that nothing leaves the device until the learner sends it. No name or email unless the learner types a name (markup characters are stripped).

Schema `alef-progress-share/1`: date, optional name, lessons (ids), letters, signs, class-track week and weekDone, weak (kind, ids, n, src for practice screens), optional timed. Timed reads are not built in ALEF yet (docs/progress/timed-read-spec.md), so `timed` is only filled if a caller supplies results; the export page does not.

## Teacher: Class summary (`#/classsummary`)
Paste codes (one per line) or load .json / .txt files. Read in the browser only. Shows most-missed look-alike pairs, sign/vowel practice misses, a "who needs help on what" table (learners behind the median week by more than 1 are flagged), printable (landscape).

## Validation
Schema version must match; unknown fields rejected; ids limited to a safe charset; 8 KB per summary, 256 KB per paste, 60 learners; anything that looks like HTML (also inside a decoded code) is rejected; all output is text nodes, never innerHTML.

## Limits
Counts are rough and self-reported by one device. Two codes from the same learner count twice. No identity check: a code can be edited by its sender.
