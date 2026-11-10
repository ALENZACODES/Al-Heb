# SRS notes (Lane 1)

`src/curriculum/srs.js` is an FSRS-style scheduler written from scratch; it is not the reference implementation and does not use the published default weights.

Verified from fetched pages (TheoremPath summary of FSRS, and the ts-fsrs docs which show the curve shape):
- FSRS-4.5/5 forgetting curve R(t,S) = (1 + (19/81) t/S)^(-1/2), R(S,S) = 0.9; interval for retention r = (S/FACTOR)(r^(-2) - 1).
- FSRS-6 makes the decay a per-user weight w20 (not implemented). FSRS-4 used decay -1, factor 1/9.
Not obtained: the default weight vector and the exact update formulas (the official wiki was not on the fetch allowlist). The update rules in srs.js are our own shape and constants, documented in the file header. Scheduling quality has not been tested against any review history.

Research design rules applied (from the notes, competitor_teardown_pedagogy.md): retrieval not recognition (UI lane), gaps about 10-30% of the retention horizon (desired retention default 0.9 gives interval = stability), interleaving visually similar letters (`interleave`, takes Lane 2's `confusableWith`).
Card kinds: letter, vowel, syllable, word, prayerLine. Card state is plain JSON for the store.
