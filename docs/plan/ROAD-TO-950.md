# Road to 950: Batch 1 Re-Cut and the Road From 590

Written 12 November 2026 for recommendation R-18 of the *ALEF Full Site Check* (11 November 2026). The report asked for two things: re-cut Batch 1 from its own register, and re-derive the road to 950 from its verified score of 590. The 6 November and 7 November Batch 1 commands are retired. Don't forward them; they would redo finished work.

The auditor's standing rule still holds: points are released only when a fix is verified live on the deployed build. Every number below that isn't 590 is an estimate for planning, not a score.

## Where Things Stand

| Category | 7 Nov | 11 Nov (verified) | Of |
|---|---|---|---|
| Curriculum & content volume | 96 | 98 | 150 |
| Reading & the nikkud system | 128 | 130 | 150 |
| Roots & grammar engine | 62 | 62 | 125 |
| Gender & form accuracy | 40 | 40 | 75 |
| Listening & audio | 70 | 78 | 150 |
| Speaking & pronunciation feedback | 22 | 22 | 75 |
| Spaced repetition & progress | 52 | 50 | 75 |
| Design, UX & performance | 54 | 56 | 100 |
| Trust, honesty & licensing | 35 | 37 | 50 |
| Reach toward intermediate (B1) | 18 | 17 | 50 |
| **Total** | **577** | **590** | **1000** |

The live build that carries the work below is commit `fffa57b`, deployed 11 November at 22:09 EST.

## Batch 1, Re-Cut

The report named five items left in Batch 1. Their state on `fffa57b`:

| Item | State | Where | Acceptance test (from the report) |
|---|---|---|---|
| R-02 one counts module | Shipped | `src/lib/counts.js`, `counts.generated.js`; Home, Learn, Progress, Syllabus, Settings, About, Dictionary, Awards, Daily, Shop, League, Morning, Roots read it | The ledger in M-01 shows one number per row at the same moment |
| R-03 deploy-time asset check | Partly | `tests/audio.truth.test.js` fails CI when a counted clip has no file, and `summary.json` must reconcile with the manifests. Render deploys by hand and does not wait for CI. | A deploy fails on any missing catalogued asset |
| R-06 single feedback render | Shipped | One verdict per answer in lessons, Placement and Listen-and-pick; the answer banner leaves the page | A screen-reader pass over five pages after a lesson finds no lesson text |
| R-12 learner-text sweep | Partly | No "null" on pages (runtime guard), "Practice" spelling, plurals, labelled counts. Not yet run as a sweep over **rendered** text on every page. | Rendered text, not source strings |
| Scan wording | Shipped | `c4c5e0c23`: plain progress wording for the one-time 5 MB download | — |

**Still to do to close Batch 1:**

1. **R-03 gate.** Either set Render to deploy only after CI passes, or give Render a build command that runs the asset check, so a missing clip stops the deploy. Both change a Render setting, so the owner says yes first. Auto-deploy is off on purpose (build minutes), so the build-command route fits better.
2. **R-12 rendered sweep.** Open every route on the live build and scan the rendered text for `null`, `undefined`, `NaN`, unpointed Hebrew in lesson content, raw ids and singular/plural slips. Fix what it finds.
3. **Release stamp.** Run `node tools/build-precache.mjs --stamp` once before each release deploy, so About and the `alef-build` meta name the build (S-09). A plain rebuild no longer moves the stamp.

## Everything Else Shipped Since the Report

All of it is live on `fffa57b` and awaits the auditor's live check.

- **Completion and pass mark (C-01, C-02, D-11, D-42, D-43):**
  - A lesson counts as done only at 70% right on the first try. Below that: "Not passed yet", with no XP and no streak day.
  - "Mark complete" is gone, and "Test out" is a real test.
  - The question counter is fixed, with retries shown separately.
  - Undo can't turn a miss into a first try. This was found live on 11 November and closed in `384ba6de0`.
- **Counts and streak (C-03, C-05, M-01, M-14, S-02, S-12):** one source for every count, a free streak restore, and the header counters on every page.
- **Pages and controls (M-02 to M-09, M-13, S-03, S-05, S-07, S-08, S-13):**
  - No "null" on any page, and every play control shows its state.
  - Loading placeholders instead of blank pages.
  - Books need their story question before they count as finished.
  - Sound Snap starts on the first tap.
  - Rimon is no longer duplicated or clipped.
  - The sitemap lists the main pages, and old page titles are cleared on navigation.
- **Build and figures (M-10, S-09):** a build stamp, and `summary.json` reconciles with the manifests.
- **Audio (C-04, M-11, S-04, S-10, S-11, D-07, D-12):**
  - About 830 new clips, each judged by three reviewers.
  - Every Siddur service line plays; 92 of the 146 are Chirp 3 HD.
  - Clips held for review are shown as held on every screen.
  - The retired clips were removed from the repo and a clear-cache deploy was run. Whether the live site has stopped serving them has not been re-checked.
  - The gender pairs, role-plays and 54 Israel dialogue lines have their own clips.
  - The Torah round 9 replaced 170 clips.
- **Speaking (M-12):** word-by-word scoring with the browser's own recognizer and no server. Browsers without recognition get an honest self-check with no score.
- **Belts (S-14):** Krav Maga ranks in lesson order, P0 to E5.
- **Fixes from the carried defects:**
  - D-12: the Shmitah dot.
  - D-30: a Slow button, at 0.7× and played once.
  - D-34: the "niqqud" spelling.
  - D-52: the Sacred Listen titles.
  - M-06: all 63 books have their story questions.
- **Content:** 125 new games: 13 Hanukkah, 12 Torah and Hebrew, and 100 in five sets of 20. They are mirrored in `ALENZACODES/alef-games`.
- **Update path:** a requested update now reloads even when the hand-over lands late. Background clip work is capped at 15 s, so it can't hold an update back.

## Estimate Per Category, If Verified

These are planning estimates on the report's rubric, not scores. The low end assumes the auditor credits only what it can see quickly; the high end assumes it credits each item fully.

| Category | Verified | Estimate if verified | What still caps it |
|---|---|---|---|
| Curriculum & content | 98 | 108–115 | Content unreviewed by a qualified reader (D-10); new games' Hebrew flags |
| Reading & nikkud | 130 | 132–135 | Letter, vowel and syllable clips only 33% own-file outside Israeli |
| Roots & grammar | 62 | 68–75 | 0 of 364 root families verified (D-13) |
| Gender & form | 40 | 46–52 | Gender-pair clips and agreement games exist; not re-tested at depth |
| Listening & audio | 78 | 88–96 | Prayer kind 26.5% own-file; plays-Israeli rows still 404 on a path check; no human clips |
| Speaking | 22 | 30–40 | Not measured on real devices (R-08) |
| Spaced repetition & progress | 50 | 58–64 | Scheduler uses default weights (D-36); storage browser-only (D-32) |
| Design, UX & performance | 56 | 66–74 | Rendered-text sweep; games have no art yet |
| Trust, honesty & licensing | 37 | 40–43 | Audio licence not cleared (D-20) |
| Reach toward B1 | 17 | 22–27 | Assessment items unreviewed |
| **Total** | **590** | **about 658–721** | |

## The Road From There to 950

Ordered by points per unit of work, with what each batch depends on.

### Batch 2: verify and close (no new build)
- The auditor re-tests `fffa57b` live and releases points item by item.
- The 13 carried defects get a verdict each. Lane 7's evidence table: 2 fixed, 5 already fine, 2 needing audio, 4 needing the owner. Of the two needing audio, D-07 is now recorded; D-26 still needs real Sephardi and Ashkenazi clips.
- Finish Batch 1's three open items above.
- **Target:** the verified total moves to the estimate band.

### Batch 3: audio by kind (R-03)
- **Order:** prayer, then syllable, letter and vowel, then the long tail.
- **Prayer:**
  - The five long prayers are being made in Chirp 3 HD line by line.
  - 256 prayer rows in `manifest.json` have no clip and no Israeli fallback (Sephardi and Ashkenazi rows such as `bless-priestly-1`). They need the fallback mapping or their own clips.
- **Path check vs fallback (owner decision first).** The report's acceptance test requests every catalogued path. 3,780 Sephardi and Ashkenazi rows play the Israeli clip by the owner's decision (`status: "plays-israeli"`, `plays: <israeli path>`), but their own path still 404s, so a path check counts them as missing. Two ways to settle it:
  - (a) agree with the auditor that a row that names its `plays` file counts as serving, or
  - (b) record real Sephardi and Ashkenazi clips (the owner's ElevenLabs plan).
- **Target:** prayer, syllable, letter and vowel above 80% serving; Sephardi above 80% by the agreed measure; Listening +10 to +20.

### Batch 4: speaking, measured (R-08)
- Test the in-browser recognizer on a fixed word set on real phones and desktops (Chrome, Safari; Firefox has none). Record how often it accepts correct and rejects wrong speech.
- The report's ivrit.ai Whisper route needs a server, which the owner's no-server rule excludes. If the browser recognizer measures poorly, re-plan the speaking target; the report allows landing nearer 940.
- **Target:** Speaking +10 to +20.

### Batch 5: roots and grammar
- Verify root families from a named source or a qualified reader; the roots build will not guess.
- Clear the denominators that were already fixed (Roots reads counts).
- Review the grammar games' flagged forms.
- **Target:** Roots +10 to +20, Gender +5 to +10.

### Batch 6: progress that holds
- Decide whether progress moves from browser storage to IndexedDB (D-32).
- After launch, fit the review scheduler on real learners' history (D-36).
- **Target:** Spaced repetition +5 to +10.

### Batch 7: the human layer (the last 50, per R-07)
This is the only route to the top of the scale. It has lead time, so start it now, in parallel:
- A qualified Hebrew reader reviews the content queue and the quick-check items. The report suggests Rabbi Tepper first, using the 7 November reviewer brief.
- Human recordings of the core prayers and letters, including a true lone "sh" for the Shin sound (TTS reads a lone שׁ as the letter name).
- Liturgy and divine-name items:
  - the clergy list: 4 clips with prefixed divine-name forms, plus the Psalm 117 Hallel line
  - the four Moses book pages: their "Elohim" takes failed 2 of 3 reviewers; the takes are on `john/fill-clips-r5-*` for a person to judge
- Clear the audio licence (D-20).
- **Target:** Curriculum, Trust and B1 to near their ceilings, about +50.

## Decisions Waiting on the Owner

1. R-03 gate: a Render build command that runs the asset check, or deploy after CI.
2. Plays-Israeli rows: count the named fallback as serving, or record real tradition clips.
3. Roots: which source, or which reader.
4. Progress storage: stay in the browser, or move to IndexedDB.
5. The clergy list, and the Moses pages' reading.
6. Who reviews and records, starting with Rabbi Tepper.

## Deploy-Time Asset Check: How Render Would Run It (M-04, R-08)

The check runs in three places: CI, the release build, and Render's own build (approved by the owner on 12 Nov 2026).

- **What it checks:** `node tools/deploy/check-assets.mjs` reads all eight audio lists:
  - manifest, kind-word and the three word shards
  - the English Torah chapters and the Hebrew Torah verse index
  - Book 63

  Every row that should play must have its file, and every plays-Israeli row must have a `plays` target that has a file. Every held clip must be catalogued and still on disk. The three hold sets must agree, and so must `data/audio/summary.json`. Any gap exits 1.
- **Evidence:** on a pass it writes `audit/asset-check.json` (build stamp, counts, gaps 0, time). Render serves the repo root, so the file is served once it is committed. `tools/deploy/make-dist.mjs` ships it in a built folder too.
- **Where it runs now:**
  - CI's `test` job, on every push (no evidence written there).
  - `npm run release`: `tools/build-precache.mjs --stamp` runs the check before it moves the stamp, and stops the release on any gap.
- **How Render would run it:** set the service's Build Command to `node tools/deploy/check-assets.mjs`, in render.yaml `buildCommand` and on the service itself, since it is not Blueprint-managed. Keep the publish path at `.`. A gap then fails the Render build and the old deploy stays live. Render's build runs on the full clone, so the check sees every clip. It takes about a second and needs no install.
- **Done (12 Nov 2026):** the Build Command is `node tools/deploy/check-assets.mjs` on the service and in render.yaml. The first deploy with it (commit 23910f29b) passed, and the served `audit/asset-check.json` carries the time of the check Render ran (14:01:08 UTC).

## How Each Batch Is Checked

Each batch ends with the report's acceptance test for its items, run on the live build after a stamped deploy (`--stamp`). No batch counts as closed until the auditor has released its points.
