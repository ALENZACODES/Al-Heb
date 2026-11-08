# ALEF — Workstreams (Lanes)

Status as of the snapshot: **2026-11-07, 16:26 EST**. "Local staging" paths are on the build machine under `~/workspace/`. Workstreams marked IN FLIGHT were actively running at snapshot time — check `main`'s commit log before assuming their state.

## Landed on Nov 7 (verified on main)

### Books 6–62 high-grade audio landing
- Purpose: give every Little Book page both voices in the high-grade voice set.
- Result: 1,368/1,368 clips landed (8 chunk commits plus the shelf flip `f9c6128c935c`), live-verified: all 62 books voiced, spot checks byte-identical to the local files.
- Local record: `~/workspace/alef-books-audio/` (production zip, harvest folders, `recording-script.csv`, normalization scripts — copies in `packs/books/`).
- Side product: 124 high-grade prayer clips found in the same production run — see the prayer upgrade below.

### Build C
- Purpose: one bundled build — sound rollout, Terms & Rights page, compact music bar, Home mascot fix, Atlas cartoons for all 27 letters, Calendar/Festivals promotion, navigation sectioning, shared books writer; closed audit defects D-44, D-45, D-46.
- Result: 7 commits, main `4e58c9bcc78a`; gate 2,959 pass / 67 fail against a 74-fail baseline, zero new fails; live-verified at asset level.
- Local record: `~/workspace/alef-build-c/tree` (isolated tree it was rebuilt in after the shared mirror ate the first attempt).

### Badges engine (B2 apply)
- Purpose: wire the staged 25-badge engine and its medallion art into the app.
- Result: landed after Build C — commits `a59d0842` (engine + day-start stamp), `a50bd67a` (25 medallions, additive ingest), `ee331ed6` and `bffaf758` (precache). Art: 25/25 medallions generated and inspected clean.
- Local staging: `~/workspace/alef-badges-b2-staging/` (design + staged tests) and `~/workspace/alef-badges-apply/` (apply tree, gate logs); art originals in `~/workspace/alef-badge-art/`.
- Still locked by design until data sources exist: Café Master, Cantorial Fan, Early Bird / Night Owl (Book Finisher unlocked once the shared books writer landed in Build C). Next action: none for the engine itself; the locked badges unlock as their source features land.

### Sound enhancement rollout (staging)
- Purpose: enhance the 15 historic Sacred Listen recordings (the owner approved the treatment by ear) and prepare the ship/no-ship table.
- Result: staging completed; the rollout itself shipped inside Build C, originals preserved in the repo.
- Local record: `~/workspace/alef-sound-rollout/` (MANIFEST.md, MEASUREMENTS.md, ROLLOUT.md — copies of the manifest, measurements, and the enhance script in `packs/sound-rollout/`). One production trap is documented there: on this ffmpeg build a `volume` stage is silently bypassed when a stereo source is rendered to mono Vorbis — use the `pan=mono` command; all loudness figures were measured on the shipped mono files.

### Cartoon review and the qof redraw
- Purpose: review the 27 meet-the-letter cartoons; 7 letters were flagged at midday.
- Result: owner reversed the hold (14:10) and ordered fixes; the qof letterform was redrawn deterministically (glyph replaced inside the letter box only, in the app's own display typeface) after the owner spotted a malformed leg (14:15). All 27 wired in Build C; the fixed qof serves live at exactly 60,994 bytes (800 px WebP).
- Local record: `~/workspace/alef-cartoon-fix/` (before/after sheets, REVIEW.md, the fixed files).
- Standing lesson: machine review of letterforms is not sufficient — the owner's eye, and later the teacher's, outranks it.

### Arcade recordings (prep + production + post-production)
- Purpose: voice lines for the 30 arcade games (the games branch's own list: 370 lines).
- Result: prep audit clean (370 rows: 240 game lines + 130 law keywords; two pointing flags recorded for the teacher review pack, not silently fixed — the gershayim in "taryag" and the qamats in the praise line); production 370/370 with zero failures; post-production normalized and verified. The finished set sits on branch `audio/arcade-30-voice` (commit `151ca69b`), the raw run on `audio/arcade-30-voice-raw` (commit `e7a1233`). Landing rides the games merge (in flight below).
- Local record: `~/workspace/alef-arcade-lane/` (AUDIT.md, PRODUCTION-PACK.md, POST-PRODUCTION.md, MERGE-NOTE.md; scripts in `packs/arcade/`).

### Reform narration production
- Purpose: English narration for the Reform Judaism page (5 sections, 1,104 words).
- Result: production complete, all 5 sections in the English high-grade female voice, no fallback needed; raw zip on branch `audio/reform-narration-raw` (commit `8644fda`). Normalize + transcribe-back QA + landing ride the page apply (staged below).
- Local record: `~/workspace/alef-reform-lane/` (narration script and production spec in `packs/reform-narration/`).
- Open question for the apply: the design side counts six narration clips for the page; the script has five sections. Reconcile against the page as built; produce one more clip if a sixth section exists.

## In flight at snapshot time

### HD prayer upgrade landing (dispatched 16:04 EST)
- Purpose: replace 124 standard-voice prayer clips with the high-grade versions found in the books production run (owner decision, 16:04).
- State at snapshot: mapping complete — all 124 clips mapped to live prayer paths; the 16 live prayer clips with no high-grade counterpart stay standard voice (lists in `packs/prayers-hd/`). Normalization under way. The replaced standard originals are being preserved on a new branch `audio/prayers-standard-backup`.
- Local workdir: `~/workspace/alef-prayers-hd/`.
- Next action (if it has not landed): finish normalization to house spec, back up the originals to the backup branch, replace the clips on main in chunks, gate, regenerate precache, live-verify three clips plus one veil clip.

### Arcade 30 merge (dispatched 16:09 EST; owner pressed again 16:22)
- Purpose: merge branch `john/arcade-30-2026-11-07` (head `8a38eef438d9`, 30 games, 57 files) plus the 370 voice clips from `audio/arcade-30-voice`.
- Local workdir: `~/workspace/alef-arcade-merge/`.
- Next action: rebase onto current main, run a fresh merged-tree gate with a fail-name diff (the games PDF's "59 vs 67 fails" claim is unverified — never quote it), merge, land the audio branch with or after, live-verify two games end to end.
- Not part of this merge: the 67 game pictures (design side's schedule; the picture list is in `packs/arcade/arcade-images.csv`). Games play their clips by path and stay silent where a file is absent; pictures slot in as approved images land.

### Little-books branch reconciliation (dispatched 16:11 EST)
- Purpose: branch `john/little-books-6-62-2026-11-07` (head `eea12df79576`) was reported pushed and unmerged — but much of its content already reached main by other routes (text merge `988c67c`, all book audio, Book 6 pictures).
- State at snapshot: file-by-file diff against main under way. No blind merge: land only what main lacks (most plausibly the pictures for books 7–62), with every main-wins / branch-wins call reported.
- Local workdir: `~/workspace/alef-books-branch/`.

### Torah — Genesis build (dispatched 16:09 EST)
- Purpose: put the whole Torah in the app — Hebrew (UXLC, public domain) side by side with English (JPS 1917 only, public domain), read aloud in both languages and both voice pairs.
- State at snapshot: build under way — Genesis data for all 50 chapters, the reader route `#/torahreader`, licence-tripwire tests, and the Genesis 1 audio smoke pack (124 clips across the 4 tracks).
- Local staging: `~/workspace/alef-torah-lane/` (data + reader design) and `~/workspace/alef-torah-audio-lane/` (English audio plan, repository layout, production order, state check); build tree at `~/workspace/alef-torah-build/`.
- Storage ruling (already made): shipping all four tracks at verse level is about 4.5 GB, so v1 ships Hebrew verse + chapter clips (about 1.92 GB) plus English chapter clips only (about 1.24 GB); English verse clips are produced and held on the raw branch as intermediates.
- Next action: exact-count freeze → Genesis 1 smoke in all four tracks → full Genesis pilot → decision gate on real cost and size per chapter → the remaining four books. Label all Torah audio as a synthetic reading, never as chant.

### Responsive graphics (dispatched 16:07 EST)
- Purpose: the owner reports graphics render badly on tablets and dual-screen / flip phones (the mascot named as an example).
- State at snapshot: audit under way — screenshot matrix across phone, foldable, and tablet widths before any fix; the phone rendering is approved and must stay identical.
- Local workdir: `~/workspace/alef-responsive/` (before-shots in `shots-before/`).
- Next action: fix at the CSS level (clamps, aspect ratios, breakpoints at the wide widths), gate, and re-shoot the same matrix.

### Beginner-usability fixes (dispatched 16:16 EST)
- Purpose: implement the Nov 7 beginner-usability review (51/100; 25 ranked fixes U-01 to U-25) — triage against current main first (several findings predate Build C), then fix in ranked order.
- State at snapshot: triage under way. The bundle also carries three Build C follow-ups: a Calendar doorway on the first-visit welcome screen; the music bundle (no auto-start on game routes, a crossfade loop, lower default level, ducking under speech — owner's report 16:07); an early-tap verification of the veil Listen button.
- Local workdir: `~/workspace/alef-usability-2-lane/` — note it holds `RULING-U01.md`, the owner's veil ruling (also in DECISIONS.md); two attempts to message the ruling into the running workstream failed on a tooling scope error, so verify on its report that the ruling was applied.
- Local source text: `~/workspace/alef-usability-review-2.txt`.

### Journey audio gap-fill (dispatched 16:20 EST)
- Purpose: the owner ordered the voices added along the beginner journey — the phrases library completed in both Israeli voices, the speaking-practice first-day set, and the dictionary's journey words (hello, thank you, water, please, plus the known gaps such as Friday and computer).
- State at snapshot: just dispatched; its local folder `~/workspace/alef-journey-audio/` was still empty at snapshot time — the audit and production pack come first, then a Cloud Shell production run, then landing.
- Next action: audit the gaps per surface, build the recording script, produce, normalize, land at the exact paths the app requests.

### Fixes-100 work lane (standing, every 2 hours)
- Purpose: work the 100-fix audit queue top-down (see QUEUES.md). At snapshot: 14 of 80 items closed.
- Next action: the queue file names the next item; local gate before every push (Actions is down — see STATE.md).

## Staged, not yet applied

### Dictionary unified build
- Staging: `~/workspace/alef-dictionary-lane/` (audit, build plan, coverage, search design, stress plan, audio gap).
- Plan: one dataset — the full 6,303 entries on screen; retire the reduced 5,000-entry packs; add a stressed-syllable field (stressed syllable in capitals); typo-tolerant multi-field search; rebuild the clip lookup from clips that already exist (playable Israeli entries rise from 344 to about 1,251 with no new production); add the genuine gap words; a later production fill of about 9,878 clips covers every entry in both voices.
- Truthful claim until then: "5,000 most useful words," not "all modern Hebrew words."

### Learning-path (helper) build
- Staging: `~/workspace/alef-helper-lane/`. Quick wins already landed inside Build C (route sectioning, labels, the books writer). Remaining: the "Your path" Home card driven by existing progress stores, level chips at discovery surfaces, bridge moments when beginner tracks complete, the book shelf grouped by level. No route renames, no gating, no hidden content.

### Reform Judaism page apply
- Staging: `~/workspace/alef-reform-lane/` — page text (1,109 words of original prose) for route `#/topics/reform-judaism`, held at preview tier until a rabbi has read it. Narration produced (see above); the apply performs harvest, normalization, transcribe-back QA, provenance records, and the landing, and settles the five-vs-six sections question.

### Cantorial / Sacred Listen expansion
- Staging: `~/workspace/alef-cantorial-lane/REPORT.md` — 11 licence-verified historic files identified (Wikimedia Commons, CC BY-SA 3.0 / public domain; the file URLs are in section 6 of the report), to be ingested with the approved enhancement and written descriptions.
- No clear recording exists for several core pieces (Psalm 150, Lecha Dodi, Shalom Aleichem, and others): the plan is synthetic spoken readings, labelled as such — the available synthesis cannot sing, and no sale-clear Hebrew singing synthesis exists. Two items are the owner's calls only: a permission letter to a London synagogue archive (his send), and one Free Art License file (his decision). Hanukkah (Dec 5–12) makes Maoz Tzur the priority piece.

### Tradition foundation recordings
- State: the pack is complete and pushed — branch `audio/foundation-traditions` (commit `02973320`) and local copy `~/workspace/alef-tradition-foundations/` (also in `packs/foundation-recordings/`): 728 clips specified exactly (per tradition: 57 letters + 110 syllables + 15 vowels, times two voices), with recording spec (MP3, 44.1 kHz mono, about 96 kb/s).
- Blocker: these need human tradition readers. Machine voices must not be substituted and passed off as a tradition. 0 of 728 exist.

### Dialect auditions
- State: a blind-judging pack is assembled at `~/workspace/alef-auditions/pack/` (judge sheet copied into `packs/auditions/`). It needs at least two human judges, the owner among them, before any tradition-voice decision. Nothing ships from this pack without the gate in STATE.md rule 6.

### Siddur completion
- Blocked on licence clearance: the siddur text source's licence is still unverified. Do not build on it until cleared. A second item waits on the owner's word: the vowel-restoration tool choice (the standing playbook rules one named vendor a trap; the cleared open-source alternative is named in the goal file).

### OCR help, accessibility phases, assessment/persistence batch
- OCR: the audit's items OCR-1 to OCR-5 build on the on-device OCR already shipped. Staging notes are in the third-audit queue (QUEUES.md).
- Accessibility: a standing workstream (blind, deaf and hard-of-hearing, and physically limited users; games playable by speaking, extending the existing speech recognizer). Phases: quick fixes → voice-play pilot on three games → deaf game equivalents → motor settings reaching the games → verification with real assistive technology (still owed).
- Assessment/persistence integrity: audit items D-42, D-43, D-47, D-48 (a lesson counter that grows on wrong answers; completion without mastery; counters that move on their own; milestones that disagree) — batched in the third-audit queue.
