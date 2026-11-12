# Fitted Scheduler Numbers On The Device (H2)

Status: built and unit-tested on simulated review histories (tests/platform.scheduler.test.js). Not yet checked against a real
learner's history, because the answer log only started on 12 November 2026.

## What Is Fitted

Aleph's live scheduler (src/curriculum/srs.js) is FSRS-style, with its own hand-chosen constants. Five of them are fitted:

- `INIT_S[0..3]`: the stability (days until the chance of recall falls to 90%) after the first answer Again, Hard, Good or
  Easy. These play the role of FSRS weights w0 to w3.
- `grow`: one factor on the stability increase after a recall (1 = unchanged).

Everything else (difficulty updates, the lapse rule, the forgetting curve) stays as written in srs.js.

## The Data

From 12 November 2026 every call to `review()` appends one number to the card, `day * 10 + rating` (UTC day number), keeping
the newest 24 (`LOG_MAX`). The log stays on the card, so it travels with backups and device moves. Cards reviewed before that
date have no log; their history cannot be used.

## The Method

1. Replay each card's log through `review()` with candidate numbers.
2. For every review made one day or more after the previous one, take the model's predicted chance of recall
   `R = (1 + 19/81 * t / S) ^ -0.5` and the outcome (Hard, Good or Easy = remembered; Again = forgot).
3. Loss = average binary log loss over those reviews (lower predicts better). Same-day reviews update the card but are not scored.
4. Coordinate descent, two passes: each `INIT_S[g]` over a log-spaced grid from 0.05 to 60 days (then a finer grid around the
   best point), using only cards first answered `g`; then `grow` over 0.25 to 4 the same way.
5. The four first-answer numbers are made non-decreasing (Again <= Hard <= Good <= Easy).

`INIT_S[g]` is only fitted when at least 20 scored reviews come from cards first answered `g`; otherwise it keeps its default.

## When It Is Used

- Not enough history (fewer than 300 scored reviews, `MIN_REVIEWS`, or fewer than 30 cards, `MIN_CARDS`, Aleph's own rule):
  the page says so and the set numbers stay.
- Enough history but the fit does not lower the loss: the set numbers stay and the page says so.
- Otherwise the page offers "Use my fitted numbers". Only then is store key `srs.fit` saved with `active: true`, and `review()`
  uses it (read once per session through `activeParams()`). "Use the set numbers instead" turns it off.

## Limits, Stated Plainly

- The loss shown is measured on the same reviews used for the fit, so it is a best case, not a held-out test.
- Day granularity only; the 10-minute relearning step is not modelled.
- Only five numbers are fitted, not the 21 FSRS-6 weights. The FSRS-6 preview on the same page still uses the published defaults.
