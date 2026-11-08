# ALEF — Owner Decisions Log (Nov 6–7, 2026)

All times EST (America/Toronto). These rulings govern the work queues; where a review or plan disagrees with a ruling here, the ruling wins.

## Standing decisions

- **Licence (Nov 6):** the app is All Rights Reserved, © 2026 John Khan. It is free now and may be sold later, so every resource in it must be sale-clear. No embedded metadata in produced files; commits in the owner's name only; no tool names in repository files or commits.
- **The 9.5 mandate (Nov 7, 01:16):** perfect the games and everything else to production/studio quality; the audit fix queue leads the work, ahead of the secondary ledgers (confirmed 02:20 — the 100-fix queue is the work order).
- **Theme (Nov 7, ~08:34):** greens and gold. Blue is out, everywhere.
- **Veil rotation (Nov 7, 08:33):** the opening veil keeps rotating all 80 blessings. It does not always open on the same blessing.
- **Accessibility (Nov 7, 12:51):** a standing workstream — blind, deaf and hard-of-hearing, and physically limited users; games playable by speaking.
- **GitHub Actions (Nov 7):** Actions usage is exhausted on the owner's student account and upgrading would void the student privileges — no upgrade. Work continues by hand; the local test gate is the gate until the monthly allowance resets. A self-hosted runner was offered; the decision is still the owner's.
- **Email reminders:** explicitly NOT covered by the "do it all" authorization — they need a sending-service signup in the owner's name first.

## Nov 7, in order

- **~12:57 — Sound enhancement approved.** The owner heard the before/after pair for the historic recordings: "way better — keep it up and put this on." The full rollout shipped inside Build C, originals preserved.
- **13:04–13:30 — The afternoon orders.** (1) The music bar is too prominent: shrink it to a compact control and move every right and credit to a new Terms & Rights page. (2) Stories and books use the high-grade voices for both readers; any unit the high-grade voice refuses falls back to the standard voice for that unit so nothing is ever silent. (3) The two dictionaries are sewn into one. (4) The entire Torah goes in the app, Hebrew beside English, both read aloud. (5) 13:30 — "do it all": full-queue execution in programme order, reporting each landing as it verifies live.
- **~14:10 — Fix the seven flagged letter cartoons** (reversing the morning's hold-back). **14:12 — pe-final ships as-is** (its letter is correct; the composition is an outlier, accepted). **14:15 — qof is wrong, fix it directly:** the owner overruled a machine pass on the qof letterform ("the leg is off") and ordered a direct fix; the glyph was redrawn deterministically inside the letter box. Lesson recorded: machine review does not clear letterforms.
- **14:27 — HOLD the arcade merge until after Build C.** Then rebase onto the new main, run a fresh merged-tree gate, and land the games' audio branch with or after the games.
- **~14:44 — "Yes to both" (the two pending Nov 5 decisions).** (a) A second voice-casting candidate is added to the tradition-voice auditions, under the same blind-judge gate. (b) The corrected sourcing brief stands: one named speech corpus is for training and transcription QA only, never shipped clips; two named text corpora are approved for Hebrew text QA only; two large web corpora are excluded as sources.
- **~14:52 — The design contributor confirmed all four corrections back**, and disclosed one renderer invocation made before the correction arrived: it stopped on a missing module before synthesis and produced no audio — nothing to clean up. Division of labour confirmed: pictures, game/content data, and text sit with the design contributor; voice casting and all voice production sit with the build side.
- **~14:56 — Whole Torah on the app now** (side conversation): Hebrew and English, both voice pairs. The storage design in LANES.md (Torah) was worked out under this order.
- **16:04 — Land the 124 high-grade prayer clips as the prayer upgrade** (they had been parked with an inventory after the books run; the alternative was to keep them parked).
- **16:06 — Graphics on tablets and dual-screen phones are not good enough** (the mascot named): audit and fix ordered; the phone rendering stays as approved.
- **16:07 — The music loop sounds unnatural and is too loud:** crossfade loop, lower default level, ducking under speech — folded into the usability fix bundle.
- **16:09 — The new games and the Torah have not hit the app:** the merge hold's condition (Build C) was already met, so the arcade merge and the Torah Genesis build were dispatched on the spot. **16:22 — "Merge the games, don't waste time"** (the merge was already running).
- **16:11 — The little-books branch is pushed and unmerged:** flagged by the owner; reconciliation ordered instead of a blind merge, because most of its content already reached main by other routes.
- **16:16 — Beginner-usability review 2: "open a new lane for this and fix asap."**
- **16:19 — U-01 ruling (veil frequency): "Keep it every visit, with the new close X + Don't show again."** The review's once-per-learner-ever splash is NOT adopted. The veil stays a per-visit feature; the fix ships a visible close control and a persisted opt-out.
- **16:20 — "Add the voices in the journey":** produce and land the missing clips along the beginner journey (phrases first), not just the fallback prompts.
- **16:22 — This handover push:** "Make sure all is on GitHub, in case someone else has to restart."

## Decisions still owed by the owner

- Branch protection for `main` (offered via API; on his word only).
- The sending-service signup for email reminders.
- The vowel-restoration tool choice for the siddur work, and the siddur source's licence clearance.
- The synagogue-archive permission letter (cantorial) — his send only; one Free Art License file — his call only.
- Two human-gated quality calls: the teacher's review of letterforms and flagged pointing (the arcade flags F2/F3 ride that pack), and the blind-judge panel for tradition voices (at least two judges, the owner among them).
- The owner's phone still needs one manual step before it picks up current builds: a fresh browser open, or delete and re-add the home-screen icon. Instructions were sent Nov 7 ~08:32; confirmation outstanding.
