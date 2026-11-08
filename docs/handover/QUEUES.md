# ALEF — Open Work Queues

Pointers and counts as of the snapshot: **2026-11-07, 16:26 EST**. The queue files themselves live on the build machine (paths below) and are worked in place; their substance is summarized here so the shape of the remaining work survives without the machine. The governing programme document is the goal file: `~/workspace/goals/alef-at-9-5-production-quality-hebrew-studio/GOAL.md` (the 9.5 mandate, the 7-dimension rubric, and the 20-item gap ledger G1–G20).

## Queue 1 — The 100-fix audit queue (leads all other work)

- **File:** `~/workspace/goals/alef-at-9-5-production-quality-hebrew-studio/hidden_files/fixes-100.md`
- **Shape:** items 1–80 are in hand; items 81–100 never arrived (the source paste was cut off) — do not invent them.
- **Progress:** **14 of 80 closed** — items #3 through #15, plus #19 — each verified on main. Item #16 is next in sequence (verify the queue file's own markings first; the work lane re-points as items close).
- **Blocked items:** #1 GitHub Actions (owner-blocked; student-plan minutes exhausted — work by hand, see DECISIONS.md). #2 branch protection (owner's word only). #15 is closed as code but host-blocked in effect: the host ignores the `_headers` file, so the cache rules do not apply live; a `render.yaml` headers attempt is still outstanding, failing which it joins the host decision at #20.
- **Cadence:** a scheduled work lane runs this queue every 2 hours, plus a morning report. Gate rule: full local `npm test` before every push, fail-name diff against the running baseline.

## Queue 2 — Third-audit triage (software-house audit, 577/1000)

- **File:** `~/workspace/goals/alef-at-9-5-production-quality-hebrew-studio/hidden_files/third-audit-queue-2026-11-07.md`
- **Source:** the Nov 7 deep-dive audit (grade 577/1000; a batch road runs 577 → 950). Its full text is local at `~/workspace/alef-third-audit-deepdive.txt`.
- **Closed:** D-44 (music status must be event-driven), D-45 (a stray dismissal string), D-46 (missing route labels) — all inside Build C.
- **Open, batched:** D-42 + D-43 (assessment integrity: counters and completion-without-mastery); D-47 + D-48 (persistence: counters that move alone, milestones that disagree); D-49 (book labels — in flight via the books work); D-50 (Torah card + interim copy); D-51 (a vowel tone clip); D-52 (Sacred Listen split). Part 5 builds: OCR help items OCR-1 to OCR-5; Siddur completion (licence-blocked, see LANES.md); Torah (in flight); Reform stories shelf.
- **Two items wait on the owner:** the vowel-restoration tool choice, and the siddur source licence. Each point is credited once — nothing gets fixed twice across queues.

## Queue 3 — Beginner-usability fixes U-01 to U-25 (51/100 review)

- **Source:** the Nov 7 beginner-usability review (15 journeys: 5 clean, 7 partial, 2 failures, 1 success via a misleading path). Full text local at `~/workspace/alef-usability-review-2.txt`; the fix list is Part 3 of that document, ranked U-01 (highest rescue per effort) to U-25.
- **Status:** a dedicated fix workstream was dispatched Nov 7, 16:16 EST and is triaging every item against current main before fixing (several findings predate Build C and the book voicing). It also carries the three Build C follow-ups (welcome-screen Calendar doorway; the music bundle; the veil Listen early-tap check).
- **Decided:** U-01 is settled by owner ruling — NOT the review's once-ever splash (see DECISIONS.md, 16:19). The remaining 24 items stand as written in the review.
- **Overlap discipline:** U-13 is the same substance as D-43 (Queue 2) — one fix, credited in both. U-08 and U-14 overlap the staged learning-path build (LANES.md). U-16's premise (only 5 of 62 books voiced) is stale — all 62 are voiced; the item reduces to shelf labelling.

## How the queues interlock

Programme order set by the owner ("do it all", Nov 7, 13:30): books audio → Build C → badges → dictionary → learning path → Reform page → cantorial → Torah → Siddur / stories / OCR → accessibility — with Queue 1 (the 100 fixes) leading throughout and the usability fixes (Queue 3) running as their own lane from Nov 7, 16:16. Landings are reported one by one as they verify live; nothing is promised as an unbounded overnight completion — work proceeds in bounded, numbered batches with honest closed / partial / untouched counts.
