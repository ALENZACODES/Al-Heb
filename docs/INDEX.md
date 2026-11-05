# Docs index

One line per folder under `docs/`, then the top-level files. The description is the first heading of the folder's
`README.md` when it has one, otherwise of its first Markdown file. Regenerate by hand when folders change.

Start here: `STATUS.md` (where the project stands), `v0/SCOPE.md` (what the first release is), `v0/PREVIEW-TRIAGE.md`
(hide, merge or keep for every preview page), `audio/NO-AUDIO.md` (how the app behaves with no recordings), `review/STATUS.md`
(native review progress), `DEPLOY.md` (how to publish).

## Top-level files

| file | first heading |
|---|---|
| [`A11Y.md`](A11Y.md) | Accessibility (lane 8; round 2 on 2026-11-03, accessibility and PWA pass 2026-11-04) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | ALEF architecture (lane 8) |
| [`CAPACITOR.md`](CAPACITOR.md) | Wrapping ALEF with Capacitor (documentation only; nothing here has been run) |
| [`CONTRACT.md`](CONTRACT.md) | ALEF build contract (all lanes read this first) |
| [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md) | Decisions only John can make (2026-11-04) |
| [`DEPLOY.md`](DEPLOY.md) | Deploying ALEF (static hosting; nothing has been deployed) |
| [`HANDOFF.md`](HANDOFF.md) | ALEF handoff for John (checked 2026-11-04, refreshed about 21:15) |
| [`NEXT-STEPS-JOHN.md`](NEXT-STEPS-JOHN.md) | Next steps that only John can do |
| [`NOTES.md`](NOTES.md) | Maintenance notes — 2026-11-04 |
| [`STATUS.md`](STATUS.md) | ALEF status (measured 2026-11-04; counts table partly refreshed 2026-11-05 about 04:45 local, tip 3ebc1c5 plus local doc commits) |
| [`TOOLING.md`](TOOLING.md) | Dev tooling record (Round 2) |

## Folders

| folder | files | about |
|---|---:|---|
| [`a11y/`](a11y/) | 8 | Cognitive, learning, mental-health and sensory-sensitivity access (`COGNITIVE.md`) |
| [`accents/`](accents/) | 3 | Audit: does `settings.congregation` change what the learner sees? (`AUDIT.md`) |
| [`audio/`](audio/) | 1 | Audio-less experience (0 recorded clips) (`NO-AUDIO.md`) |
| [`book/`](book/) | 5 | Image run: how to produce the 797 images (766 from the doc + 31 quirky mnemonics) (`IMAGE-RUN.md`) |
| [`corpus/`](corpus/) | 5 | ALEF corpus: sources, licences and reuse status (`LICENSES.md`) |
| [`curriculum/`](curriculum/) | 12 | Curriculum integrity (`INTEGRITY.md`) |
| [`data/`](data/) | 1 | Learner data safety (store, backup, restore, delete, update) (`README.md`) |
| [`deploy/`](deploy/) | 4 | CI gap: local green versus a clean runner (`CI-GAP.md`) |
| [`drafts/`](drafts/) | 1567 | Drafts inbox: how to use it (10 steps) (`README.md`) |
| [`feel/`](feel/) | 3 | Badges: earned recognition in ALEF (draft) (`BADGES.md`) |
| [`festivals/`](festivals/) | 2 | Festivals screens: what they are, where the data comes from, what was and was not checked (`FESTIVALS.md`) |
| [`firstday/`](firstday/) | 2 | Ladder route for main (DRAFT, unreviewed) (`LADDER-ROUTE.md`) |
| [`grammar/`](grammar/) | 2 | Grammar notes: gaps for a native speaker (`GAPS.md`) |
| [`hebrew-lint/`](hebrew-lint/) | 3 | Hebrew lint: fixes and open items (`FIXES.md`) |
| [`host-kit/`](host-kit/) | 5 | ALEF facilitator guide: "Read Hebrew" cohort (5 x 90 minutes) (`facilitator-guide.md`) |
| [`images/`](images/) | 205 | Generated-image ingest (how to use it when the images arrive) (`README.md`) |
| [`img/`](img/) | 1 | Wiring generated pictures into the views (`INTEGRATION.md`) |
| [`install/`](install/) | 1 | Install ALEF card: route entry (not wired) (`ROUTES.md`) |
| [`israel/`](israel/) | 10 | Israel track: "Sound like a local" (draft) (`README.md`) |
| [`launch/`](launch/) | 3 | Pre-launch checklist, ordered by risk (draft, 2026-11-04) (`CHECKLIST.md`) |
| [`legal/`](legal/) | 5 | Content licence audit (`CONTENT-LICENCE-AUDIT.md`) |
| [`letters/`](letters/) | 66 | Art concept map (DRAFT) (`ART-CONCEPT-MAP.md`) |
| [`licenses/`](licenses/) | 7 | (no Markdown file at the top of this folder) |
| [`listen/`](listen/) | 1 | Listen and pick: route to add (shell owner) (`ROUTES.md`) |
| [`meta/`](meta/) | 1 | Metadata scan report (`SCAN-REPORT.md`) |
| [`mobile/`](mobile/) | 1 | Mobile findings (2026-11-04) (`FINDINGS.md`) |
| [`morning/`](morning/) | 2 | Streak: one record, one number (`MIGRATION.md`) |
| [`nav/`](nav/) | 1 | Navigation model (information architecture lane) (`NAV.md`) |
| [`notify/`](notify/) | 1 | Study reminders: route entry (not wired) (`ROUTES.md`) |
| [`offline/`](offline/) | 3 | Offline readiness: what exists (`README.md`) |
| [`onboarding/`](onboarding/) | 2 | First-run flow (onboarding) — DRAFT, untested with learners (`FLOW.md`) |
| [`onramp/`](onramp/) | 28 | On-ramp: the first 30 minutes as baby steps (DRAFT, 2026-11-04) (`ONRAMP.md`) |
| [`perf/`](perf/) | 6 | ALEF performance and PWA audit (`PERF.md`) |
| [`photo/`](photo/) | 3 | Photo feature OCR / vowelizer / translation benchmark (Lane 6, round 2, 2026-11-04) (`BENCHMARK.md`) |
| [`placement/`](placement/) | 1 | Placement check: route entry (DRAFT, UNREVIEWED) (`ROUTES.md`) |
| [`progress/`](progress/) | 3 | Progress screen (lane: progress) (`README.md`) |
| [`pronunciation/`](pronunciation/) | 8 | Lane 3: vowels, pronunciation traditions, transliteration (`README.md`) |
| [`qa/`](qa/) | 402 | Accessibility pass on the 15 v0 routes (375x667) (`A11Y-V0.md`) |
| [`record-kit/`](record-kit/) | 1 | ALEF record kit: getting human voice recordings from a volunteer (`README.md`) |
| [`release/`](release/) | 5 | Handoff ledger: 38-item audit of main f924b24 (`HANDOFF-LEDGER.md`) |
| [`research/`](research/) | 10 | B: gender as a mechanic (feature c) (`B-gender-drill.md`) |
| [`resources/`](resources/) | 4 | Books and courses: teaching ideas for ALEF (`books-and-courses.md`) |
| [`review/`](review/) | 93 | Reviewer packets: getting the unreviewed Hebrew proofread (`README.md`) |
| [`screens/`](screens/) | 35 | (no Markdown file at the top of this folder) |
| [`sensitivity/`](sensitivity/) | 3 | Divine-name and denomination conventions (working defaults, NOT clergy-reviewed) (`CONVENTIONS.md`) |
| [`service/`](service/) | 1 | Service: Siddur Coverage % and Follow the service (draft) (`README.md`) |
| [`speak/`](speak/) | 2 | Say it (draft, unreviewed) (`README.md`) |
| [`sprint/`](sprint/) | 1 | Word Sprint (draft) (`README.md`) |
| [`strategy/`](strategy/) | 4 | Competitor analysis: review against the ALEF repo (November 2026) (`COMPETITOR-REVIEW.md`) |
| [`teacher/`](teacher/) | 1 | Teacher share and Class summary (DRAFT, not educator reviewed) (`README.md`) |
| [`test/`](test/) | 6 | CI failure triage: ci run 41899215557 / pages run 41899215538 (`CI-FAILURE-TRIAGE.md`) |
| [`timedread/`](timedread/) | 1 | Timed Read-Aloud (self-assessed) (`README.md`) |
| [`torahread/`](torahread/) | 3 | Torah reading mini-course (draft) (`README.md`) |
| [`traditions/`](traditions/) | 7 | Traditions lane (`README.md`) |
| [`trope/`](trope/) | 1 | Trope trainer: route and nav string (main wires) (`ROUTES.md`) |
| [`tts/`](tts/) | 4 | Local TTS factory for synthetic clips (Israeli from Hebrew; Sephardi and Ashkenazi from respellings) (`README.md`) |
| [`typing/`](typing/) | 1 | Typing practice (draft, unreviewed) (`ROUTES.md`) |
| [`v0/`](v0/) | 3 | ALEF v0: launch note for John (2026-11-04, memory-chain section refreshed about 21:15) (`LAUNCH-NOTE.md`) |
| [`verification/`](verification/) | 3 | Proposed fixes from the verification sweep (`DATA-FIXES.md`) |
| [`vocab/`](vocab/) | 51 | Record-level attribution (words.json) (`ATTRIBUTION.md`) |
| [`voices/`](voices/) | 106 | First 100 clips to record, per tradition (`FIRST-100.md`) |
| [`wordtrace/`](wordtrace/) | 13 | Word tracing (src/wordtrace) (`README.md`) |
| [`workbook/`](workbook/) | 56 | Extra printable sets: First 10 minutes, cursive words, niqqud (DRAFT, unreviewed) (`FIRSTDAY-PAGES.md`) |
| [`youtube/`](youtube/) | 3 | Per-video notes (captions read) (`notes.md`) |
