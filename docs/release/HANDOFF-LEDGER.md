# Handoff ledger: 38-item audit of main f924b24

> **Superseded / stale since 2026-11-05: see [`STATUS.md`](../STATUS.md).** The ledger audits `main` at f924b24 (2026-11-04); the repo has moved on and the item statuses were not re-checked.

Audit baseline: main `f924b24` (4 November 2026). Ledger written 4 November 2026 (evening), read-only against two trees:

- **gh/main**: a fresh scratch clone of the private repository at `f924b24` (`/tmp/ledger`, nothing in the live repo was touched).
- **live**: the working checkout, HEAD `be465e3` plus a large uncommitted working tree (other lanes are editing it as this is written; a new test file appeared while this ledger was being compiled). Statements about "live" describe what was on disk at the moment they were read, and say when a change is uncommitted.

What this ledger is not: nothing was fixed here, and the test suites were not run against the live tree. Evidence is code reading plus small throw-away scripts run against a copy or read-only imports (the one script is described under item 03). Where a stored report in the repo is cited (for example `tools/a11y/last-run.json`) it is a file written earlier by someone else, not a result produced by this ledger.

Verdict vocabulary: REPRODUCED, ALREADY FIXED, NOT REPRODUCED, NEEDS A HUMAN, plus BLOCKED-ON-DEPENDENCY for items whose subject files live on the owner's PC and cannot be opened in this environment.

Line numbers: "gh" numbers are at `f924b24`; "live" numbers are the current working tree and will move.

## 1. Environment check

The handoff cites `outputs/lane1` to `outputs/lane6` and `C:\` paths. None of those exist here. `docs/drafts/inbox/lane1` to `lane6` exist in the live tree but are empty (`docs/drafts/INBOX-REPORT.md`: "The inbox holds no files"). A search of the live tree for the file names cited by items 07 to 11, 16 to 20 and 24 to 26 found no match. Every item whose subject is one of those files is therefore BLOCKED-ON-DEPENDENCY below, and nothing about their content was invented.

## 2. Summary table

| ID | Pri | Item in one line | Subject files here? | gh/main verdict | live verdict | Lane type |
|---|---|---|---|---|---|---|
| 01 | P1 | Required accessibility checks skip silently in CI | Yes | REPRODUCED | REPRODUCED (residual: install added; skips and non-blocking job remain) | code/CI |
| 02 | P1 | Built-site smoke test skipped; vacuous wait predicate | Yes | REPRODUCED | PARTLY FIXED (dist now built in the job; skip guard and the always-true wait remain) | code/CI |
| 03 | P1 | Lesson completion claims success after rejected writes | Yes | REPRODUCED (script run) | ALREADY FIXED in uncommitted working tree (script run) | code/CI |
| 04 | P1 | Sound status not keyboard operable | Yes | REPRODUCED | REPRODUCED | accessibility |
| 05 | P1 | Accessibility gates exempt known gaps | Yes | REPRODUCED | REPRODUCED | accessibility |
| 06 | P1 | Test dependencies not reproducible | Yes | REPRODUCED | PARTLY FIXED (runner pinned, rule engine locked; Python ranges remain) | code/CI |
| 07 | P1 | Listening worksheet key is all C | No (lane4) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | book/assessment |
| 08 | P1 | Reading-blank answers always first | No (lane4) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | book/assessment |
| 09 | P1 | Weekly quiz answers follow a pattern | No (lane4) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | book/assessment |
| 10 | P1 | Pronunciation fields disagree | No (lane2) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 11 | P1 | Letter recording takes ambiguous | No (lane3) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 12 | P1 | Ayin copy contradicts itself | Yes | REPRODUCED | REPRODUCED (also in the memory chain file) | Hebrew/content |
| 13 | P1 | Garden anchor pointed two ways | Yes | REPRODUCED | REPRODUCED | Hebrew/content |
| 14 | P1 | Retired art concepts remain in app sources | Yes | REPRODUCED | PARTLY FIXED (nun concepts replaced; mime remains) | Hebrew/content (text), artwork (assets) |
| 15 | P1 | Artwork and new drafts not integrated | Package: No. Repo letter data: Yes | BLOCKED-ON-DEPENDENCY (package) | BLOCKED-ON-DEPENDENCY (package) | artwork |
| 16 | P2 | Item 28 has 34 lexical contrasts short | No (lane2) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 17 | P2 | Item 79 screens chosen from source, not usage | No (lane5) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | verification |
| 18 | P2 | Item 43 two import shapes | No (lane3) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 19 | P2 | Item 25 not a full conjugation resource | No (lane2) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 20 | P2 | Quiz weeks vs class plan not mapped | No (lane4) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | book/assessment |
| 21 | P2 | Review registers stale | Registers: No (lane5). docs/A11Y.md: Yes | REPRODUCED for docs/A11Y.md; registers BLOCKED-ON-DEPENDENCY | REPRODUCED for docs/A11Y.md; registers BLOCKED-ON-DEPENDENCY | verification |
| 22 | P2 | No recorded voices delivered | Code/UI: Yes. Scripts: No (lane3) | NEEDS A HUMAN (code states it honestly) | NEEDS A HUMAN (code states it honestly) | Hebrew/content |
| 23 | P2 | Listening fallback is reading | Yes | REPRODUCED | ALREADY FIXED in uncommitted working tree (tests not run) | code/CI |
| 24 | P2 | Rule-generated readings need word validation | Package: No. Engines: Yes | BLOCKED-ON-DEPENDENCY (both example words absent from the app word list) | BLOCKED-ON-DEPENDENCY (same) | Hebrew/content |
| 25 | P2 | Prayer cues proposed, not approved | No (lane3) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 26 | P2 | Tradition labels too broad | No (lane3, lane2) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | Hebrew/content |
| 27 | P2 | Pronunciation engines: heuristics, thin exceptions | Yes | REPRODUCED | PARTLY FIXED (confidence reasons added, uncommitted; exception list still one entry) | code/CI with Hebrew/content review |
| 28 | P2 | Photo IPA adapter is an inert placeholder | Yes | NOT REPRODUCED as a product claim (placeholder confirmed) | NOT REPRODUCED as a product claim (placeholder confirmed) | code/CI |
| 29 | P2 | Tracing not teacher-certified | Yes | NEEDS A HUMAN | NEEDS A HUMAN (assisted vs independent now separated, uncommitted) | accessibility (code), Hebrew/content (teacher packet) |
| 30 | P2 | Placement not validated as an assessment | Yes | REPRODUCED (documented limitation) | PARTLY FIXED wording (uncommitted); learner study NEEDS A HUMAN | book/assessment |
| 31 | P2 | Book files not a verified print edition | Package: No | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | book/assessment |
| 32 | P2 | 340 new test cases not executed | No (lane5 items 73-77) | BLOCKED-ON-DEPENDENCY | BLOCKED-ON-DEPENDENCY | verification |
| 33 | P2 | Accessible names need fresh rendered check | Yes | REPRODUCED (pattern); old counts unverified | PARTLY FIXED (vowel-board names removed; trace letter names remain) | accessibility |
| 34 | P2 | Real-device and offline matrix unproven | Needs devices | NEEDS A HUMAN | NEEDS A HUMAN | verification |
| 35 | P2 | Backup/restore/clear failure-state evidence | Yes | NOT REPRODUCED (no failure observed; unit coverage exists) | NOT REPRODUCED (same) | verification |
| 36 | P2 | Asset volume hides placeholders and duplicates | Yes | REPRODUCED (counts confirmed) | REPRODUCED (counts differ) | artwork |
| 37 | P2 | Product copy needs a rendered pass | Yes | REPRODUCED (raw error text in alerts); rest NEEDS A HUMAN | REPRODUCED (same) | Hebrew/content with accessibility |
| 38 | P2 | Release documentation must match real status | Docs: partly | NEEDS A HUMAN | NEEDS A HUMAN | verification |

## 3. Detail: code and data items

### 01. Required accessibility checks are skipped

- **gh/main: REPRODUCED.** `.github/workflows/ci.yml:36` installs the browser runner only (an unpinned `npm install --no-save --no-package-lock` of the runner plus its browser download). `tests/a11y.browser.test.js:12` defines `haveAxe` as the existence of `tools/a11y/node_modules/<rule engine>/axe.min.js`; lines 14 and 27 pass `skip:` built from it; `tests/sweep.test.js:27` skips on the same file. Nothing in gh `ci.yml` installs into `tools/a11y`, so the three checks skip on a runner. The 22 passed / 4 skipped count in the handoff was not re-run here.
- **live: REPRODUCED (residual).** `ci.yml:72-74` now pins the runner and runs `npm ci --prefix tools/a11y`, which removes the cause of the skip on a runner. Still open: (a) `ci.yml:63` `continue-on-error: true` on the browser job, so a red or skipped run never fails the workflow; (b) the three tests still use `skip:` (`tests/a11y.browser.test.js:14,27`, `tests/sweep.test.js:27`) and there is no step that fails when a mandatory prerequisite is missing; (c) `ci.yml:58-60` says the browser job "has NOT been run on a GitHub runner yet", so whether the skips are gone is unverified.
- **Acceptance:** on a fresh run of main the three checks execute; the run reports zero skipped mandatory tests; the axe quick report and keyboard report are kept as workflow artifacts; a missing prerequisite fails the job.
- **Proposed fix:** make the three tests fail (not skip) when `CI` is set and a prerequisite is missing, add a step that counts skipped tests in the TAP output and fails on any mandatory one, upload the JSON reports, and drop `continue-on-error` once one green runner run is recorded.
- **Lane:** code/CI.

### 02. Built-site smoke is skipped

- **gh/main: REPRODUCED.** `tests/deploy.smoke.test.js:16` skips when `dist/index.html` is absent. In gh `ci.yml` the `build-dist` job (lines 17-27) builds `dist/` in a different job from `smoke` (lines 28-42) and nothing passes it across. gh `pages.yml` builds with `tools/build-static.mjs --base "/${GITHUB_REPOSITORY#*/}/"` while `build-dist` uses `tools/deploy/build_site.mjs`, so two different builders existed. `tests/deploy.smoke.test.js:30` is `waitForFunction(() => !!navigator.serviceWorker.controller || true)`, which can never fail.
- **live: PARTLY FIXED.** `ci.yml:75-76` builds `dist/` inside the browser job, so the skip condition is not met on a runner. `pages.yml` in live now builds with `tools/deploy/build_site.mjs` and runs `check-deploy.mjs`, so one builder feeds both workflows; I found no workflow that still calls `tools/build-static.mjs` (other callers not searched beyond `tools`, `.github`, `package.json`, `docs/DEPLOY.md`). Still reproduced: the skip guard at `tests/deploy.smoke.test.js:16` and the `|| true` at line 30 are unchanged. The repository-subpath case is not checked by any test I could find (live `pages.yml` passes no `--base`).
- **Acceptance:** the smoke test runs against the shipped `dist/` in CI with zero skips; the controlled-page assertion is real (the later assertion at line 36 already requires a controller after reload; line 30 should be removed or made strict); a subpath build is either tested or documented as not shipped.
- **Proposed fix:** delete the vacuous predicate, make a missing `dist/` a failure under `CI`, and add one assertion pass against a build made with a non-root base if that output is intended to ship.
- **Lane:** code/CI.

### 03. Lesson completion can claim success after rejected writes

- **gh/main: REPRODUCED.** `src/curriculum/dom.js:23-24` `storeSet` catches every rejection ("best effort") and ignores a missing store. `completeLesson` (`src/curriculum/actions.js:12-19`) writes progress, cards and streak through it; `saveQuickCheck` (`actions.js:167-176`) returns `completed: true`; `src/curriculum/lesson.view.js:107` then shows "Lesson complete". I ran a script against the scratch clone with a store whose `set` throws for each key in turn, for all keys, and with no store: in every case `completeLesson` resolved and reported the lesson as completed (with the other keys stored, or none), and `saveQuickCheck` returned `{"completed":true}` with every write rejected.
- **live: ALREADY FIXED in the uncommitted working tree.** `src/curriculum/dom.js` (modified, not committed) adds `storeWriteAll` (about lines 40-60) that writes in order, undoes earlier writes in reverse on failure, and throws `StoreWriteError`; `actions.js` plans the batch (cards, then progress, then streak) before writing. Re-running my script against live: each failing key, all keys failing, a missing store and `saveQuickCheck` all reject with "Your progress could not be saved. Nothing was changed." (or "There is no place to save your progress."), and the stub store shows every earlier write undone. `tests/curriculum.save-failure.test.js` (untracked, appeared during this audit) has 7 tests, including retry and the page not saying "Lesson complete"; I did not run it. The memory-fallback case (a store that returns false from `set`) is treated as success with the storage notice, which matches the handoff's "intentional, disclosed memory fallback".
- **Adjacent, not confirmed as bugs:** other writes in `actions.js` still go through the swallowing `storeSet` (for example lines 58, 75, 161, 171, 186, 198 in live). Whether any of those is "critical" in the handoff's sense needs a human decision.
- **Acceptance:** an injected failure at each of the three writes leaves stored state unchanged, the UI shows an alert and no completion, retry completes once and schedules each card once, and a missing store is an error. A reload shows UI and storage agree.
- **Proposed fix:** commit the working-tree change with its test file, then run the test file and the existing `tests/curriculum.learnflow.test.js` before closing.
- **Lane:** code/CI.

### 04. Keyboard users cannot expand sound status

- **gh/main: REPRODUCED.** `index.html:31` renders `<p id="sound-status" role="status">`; `src/app.js:106-108` adds only `st.addEventListener('click', () => st.classList.toggle('open'))`. A paragraph is not focusable, and `assets/css/app.css` only changes line clamping when `.open` is set (`.sound-bar p.open`).
- **live: REPRODUCED.** `index.html:31` still has the paragraph (it gained a "Details" link and a dismiss button, which do not expand the text); `src/app.js:158-159` is the same click-only toggle; `app.css:124,270` still keys off `p.open`. Neither file is marked modified at the time of reading.
- **Acceptance:** the expand control is reachable by Tab, has an accessible name and `aria-expanded`, toggles on Enter and Space, keeps focus, and the full text is readable at a narrow width; or the text is always fully visible and the toggle is removed.
- **Proposed fix:** either render the full status text without clamping on small screens, or wrap the text in a button with `aria-expanded` and `aria-controls`; add a keyboard step to `tools/a11y/keyboard.mjs`.
- **Lane:** accessibility. Owns `index.html`, `src/app.js` (status block only), `assets/css/app.css` (sound-bar rules).

### 05. Accessibility gates exempt known gaps

- **gh/main: REPRODUCED.** `tests/a11y.browser.test.js:19-21` excludes `/calendar` from the contrast check; line 32 asserts only `!x.ok && !x.gap`. `tools/a11y/keyboard.mjs:107,112,200` pass `gap = true` for three checks (focus after quiz re-render, focus in tile list, calendar Settings link). The stored `tools/a11y/keyboard-run.json` at gh has 43 results, none failing or flagged.
- **live: REPRODUCED.** Same exemptions in the same test lines (unmodified); `keyboard.mjs:110,115,207` still pass `gap = true`. Stored runs: `tools/a11y/last-run.json` (84 routes x 4 configurations, 0 nodes) and `keyboard-run.json` (146 results, 2 not ok and not flagged as gaps: "/letters" and "/letters/alef" "order in the page does not jump back up"). These are stored files from an earlier run, not re-run here, and the keyboard file contradicts a clean state. `docs/A11Y.md` still says calendar contrast failures exist (see item 21).
- **Acceptance:** exemptions removed or each carries a narrow reason, owner and retest condition in the test; the calendar is included in the contrast check; the two keyboard results above are fixed or explained; no claim of WCAG conformance from axe alone.
- **Proposed fix:** re-run the quick axe pass and the keyboard walk on current code, delete the calendar exclusion and the three `gap` flags that now pass, and treat the two failing keyboard results as new defects with their own IDs if they reproduce.
- **Lane:** accessibility. Owns `tests/a11y.browser.test.js` and `tools/a11y/keyboard.mjs` (coordinate with the code/CI lane on item 01 by sequencing, not sharing: see work plan).

### 06. Test dependencies not reproducible

- **gh/main: REPRODUCED.** `ci.yml:36` installs the browser runner unpinned with `--no-package-lock`; `tools/a11y/package.json` has `"axe-core":"^4.14.0"`; `tools/a11y/package-lock.json` exists but gh CI never uses it. Python: `ci.yml:13` pins `Pillow==11.3.0 segno==1.6.6`.
- **live: PARTLY FIXED.** `ci.yml:72` pins the browser runner to a fixed version (1.63.0); `ci.yml:74` uses `npm ci --prefix tools/a11y` against the lock file (same lock as gh, resolved 4.14.0 with an integrity hash). Still loose: `tools/a11y/package.json` keeps the caret range (acceptable with `npm ci`, but the lock records the same range); `tools/test/requirements-ci.txt` uses `Pillow>=10 pypdf>=4 numpy>=1.26 opencv-python-headless>=4.9` (its own comment says "tighten them to == once a green run shows the resolved versions"); system tools are installed unpinned with `continue-on-error: true` at `ci.yml:27` and `:33`, so a missing tool becomes a skip. Whether a clean machine installs and runs the same suites was not tested.
- **Acceptance:** a clean checkout installs from pinned or locked inputs and runs the same suites; the report step lists resolved versions.
- **Proposed fix:** pin the Python packages to the versions a green run reports, make the install steps non-optional for tools the mandatory tests need, record versions in the job log.
- **Lane:** code/CI.

### 12. Ayin copy contradicts itself

- **gh/main: REPRODUCED.** `data/letters/mnemonics.json:31` has `sound`: "silent in most Israeli speech, like alef; a deep throat sound in some traditions" but `soundAnchor`: "silent: only the vowel under it is heard", `story`: "...says nothing. All you hear is the vowel beneath, the same as alef", `altStory`: "...you never hear it. Silent." and `caption`: "...in silence; you only hear the vowel".
- **live: REPRODUCED.** Same line and text (file is committed, unmodified). `data/letters/memory-chain.json:711` adds "A big eye watches silently; the vowel does the talking: ayin." and line 685 an ayin picture idea, so the unqualified claim also lives in the memory chain.
- **Acceptance:** every displayed ayin field (`sound`, `soundAnchor`, `story`, `altStory`, `caption`, and the memory-chain story and per-tradition lines) agrees with the qualified `sound`, and no field presents one community's pronunciation as universal; a reviewer decision is recorded.
- **Proposed fix:** reword the five mnemonic fields and the chain story to say "silent in most Israeli speech" and leave the tradition lines to the settings-driven text; keep `sound` as is. A qualified reviewer must confirm the wording.
- **Lane:** Hebrew/content. Owns `data/letters/mnemonics.json`, `data/letters/memory-chain.json`.

### 13. Pointed garden anchor conflicts

- **gh/main: REPRODUCED.** `data/letters/mnemonics.json:40` (`nun-final`) has `"word":"גָּן"`; `data/curriculum/lessons.json:674` has `"he": "גַּן"`.
- **live: REPRODUCED.** Same line in `mnemonics.json:40`; `lessons.json:674` still `גַּן` (also at lines 18460, 18599, 18699 in live; 18477, 18616, 18716 in gh). `data/letters/memory-chain.json` does not contain either form. Vocabulary files under `data/vocab/` use `גַּן`.
- **Acceptance:** one reviewer-approved form (or two forms with a stated contextual reason) used everywhere the garden word is taught, with the decision recorded.
- **Proposed fix:** after the reviewer decides, change the one mismatching file and add a consistency test comparing the mnemonic anchor to the lesson word. I make no claim about which form is right.
- **Lane:** Hebrew/content. Owns `data/curriculum/lessons.json` for this change.

### 14. Retired art concepts remain in app sources

- **gh/main: REPRODUCED.** `data/letters/mnemonics.json:16` (alef) `imageIdea`: "cartoon mime in a handstand with a finger to the lips, audience clapping" and `story` "a mime doing a handstand"; `:29` (nun) `story` "a Nun kneeling in prayer" and `imageIdea` "a nun in a habit kneeling and bowing"; `:40` (nun-final) `imageIdea` "a nun standing straight in a garden beside a tall pole", `story` "the Nun standing up straight". Three mime matches and eight nun matches in the file.
- **live: PARTLY FIXED.** In the committed live file the nun entries now use a cat (`imageIdea` "a cat curled up asleep in an open box", `caption` "a cat Napping...") and final nun uses a nail (`imageIdea` "a single long nail standing upright in a garden bed"). The mime remains: `mnemonics.json:16` and `data/letters/memory-chain.json:23-24,50-54`. I cannot verify the owner's stated direction (a woman character and a neutral cat) from anything in this environment; the check here is only that the strings named in the handoff are gone or present. No single concept-to-letter-to-file map was found.
- **Acceptance:** one approved map (concept, letter, asset file) that the mnemonic `imageIdea`/`caption` fields, the memory chain `picture` fields and the asset names all follow; no retired concept string remains in app sources.
- **Proposed fix:** write the map as a data file once the owner approves the concepts, then update the two letter data files from it and check them with a test.
- **Lane:** Hebrew/content for the text fields; artwork for the assets and the map file. They must not edit `mnemonics.json` and `memory-chain.json` at the same time (see work plan).

### 15. Artwork and new drafts not integrated

- BLOCKED-ON-DEPENDENCY: the delivered package (39 illustrations, 117 exports) and the lane drafts are not in this environment. Repo-side facts that were checked: `data/letters/mnemonics.json` has 27 letters; `assets/img/index.json` lists zero real image files in both trees ("files": []); `docs/img/INTEGRATION.md` says no view calls the image resolver yet. No verdict on the package itself.
- **Lane:** artwork (needs the package first).

### 21. Review registers stale

- The two registers are BLOCKED-ON-DEPENDENCY (lane5 files). The repo-side part is reproduced: `docs/A11Y.md:18-19` still quotes 24 colour-contrast failures "all on `/calendar`" and 912 label-in-name failures (the file is byte-identical in both trees). Live stored axe results (`tools/a11y/last-run.json`) report 0 nodes on 84 routes, so the document is out of step with that file; the stored run itself was not repeated here. `tools/a11y/keyboard.mjs` still carries the calendar-Settings-link `gap` flag.
- Regression guard for the "do not reopen" list, checked in the code: the Gimel "gym" cue is fixed at gh/main (commit `48e2d88` changed `data/letters/mnemonics.json`; gimel `soundAnchor` is "g as in go, grumpy") but **the live tree still has "g as in go, gym, grumpy"** (`data/letters/mnemonics.json:18`). The rating-save retry fix (`f0be387`) is present in live (`src/curriculum/actions.js`, comment "The rating is the primary write"). The other listed fixes were not checked individually.
- **Acceptance:** each register row carries one of fixed, remaining, unverified, out of scope, with a commit or test link and the historical quotation kept.
- **Lane:** verification. Owns `docs/A11Y.md` and `docs/release/HANDOFF-LEDGER.md`.

### 22. No recorded voices delivered

- **gh/main:** `src/shell/settings.view.js:92` states "No recorded voices exist yet ... Sound currently comes from your browser's text-to-speech voice." **live:** the same message now comes from `src/shell/plain-copy.js:8` (`settingsIntro`), and `src/shell/audio.js:79` and `src/app.js:97` label the fallback "No recordings". The honest-state requirement is met in the code I read. The limitation is real and is not a bug: the clip ID scheme, voice or community choice, permissions and review states are the lane3 deliverable (not here) and the recordings need human actors.
- **Verdict:** NEEDS A HUMAN. **Lane:** Hebrew/content (clip ID and review-state spec) with the owner for recordings. Do not generate audio.

### 23. Listening fallback is reading

- **gh/main: REPRODUCED.** `data/listen/config.json` says "this is a reading drill, not a listening drill"; `src/listen/listen.view.js:32` creates the heading as `'Listen and pick'` unconditionally.
- **live: ALREADY FIXED in the uncommitted working tree.** `src/listen/listen.view.js` (modified) defines `TITLE_LISTEN`/`TITLE_READ` (lines 14-15), sets the heading by mode (line 72, 99), adds `READ_ONLY_NOTE`, `OFFLINE_NOTE` and `SCORE_NOTE` (lines 16-18), and `tests/listen.test.js` is modified. I did not run those tests. Real recordings, unavailable browser speech and offline playback were not exercised.
- **Acceptance:** title, instructions, score meaning and teacher reports follow the mode actually used; tests cover recordings present, absent, speech unavailable and offline; reading picks are never counted as listening.
- **Proposed fix:** commit and run the modified test; check the teacher summary text separately (not read here).
- **Lane:** code/CI.

### 24. Rule-generated readings need word-level validation

- BLOCKED-ON-DEPENDENCY for the package rows (L2-031-001, L2-021-050). In-app check: neither word appears in `data/vocab/words.json` (6,303 entries) in either tree when niqqud is stripped, so the two candidates are not currently shipped as app data. The engines (`src/pronunciation/shva.js`, `src/photo/syllabify.js`, `src/pronunciation/transliterate.js`) will still produce a reading for any word typed in. Live has an uncommitted `tests/pronunciation.regression-set.test.js` that pins agreement with stored readings and lists disagreements for a reviewer; it is not a correctness proof.
- **Lane:** Hebrew/content (reviewer decisions), then code/CI to propagate.

### 27. Pronunciation engines: declared heuristics and missing rules

- **gh/main: REPRODUCED.** `src/pronunciation/shva.js:12-28` documents L3 as a heuristic that assumes final stress ("MY derivation, not a sourced rule") and lists T1 to T5 as not implemented. `src/photo/syllabify.js:14,16` list unmodelled exceptions and `:39-45` `STRESS_EXCEPTIONS` has one entry (`'סֵפֶר': -2`) marked PLACEHOLDER. No confidence value is exposed.
- **live: PARTLY FIXED.** `shva.js` is unchanged. `syllabify.js` (modified, uncommitted) adds `readingConfidence` and reason codes (about lines 202-225, level `low` when a heuristic fired, `draft` otherwise), and `src/photo/scan.view.js:130` shows the draft note and "Why:" reasons. `STRESS_EXCEPTIONS` is still the single entry. Source-reviewed examples exist only as the untracked regression test described in item 24.
- **Acceptance:** reading confidence is shown wherever a rule-generated reading is shown; unsourced rules never present as fact; a reviewed example set exists with sources.
- **Proposed fix:** keep the engines deterministic, route every user-facing reading through the confidence level, and grow the exception list only from reviewer-supplied rows.
- **Lane:** code/CI for plumbing; Hebrew/content for the examples. Owns `src/photo/syllabify.js`, `src/pronunciation/shva.js`.

### 28. Photo IPA support is an inert placeholder

- **gh/main and live: NOT REPRODUCED as a product claim; placeholder CONFIRMED.** `src/photo/engines/web.js:135` `createPhonikudPlaceholder()` returns `installed: false`, `ipa: undefined` and a describe string saying it is not wired. `src/photo/pipeline.js:60` only runs IPA if `engines.ipa` is a function, and `src/photo/scan.view.js` prints "IPA:" only when a word has one (line 135 live, 134 gh). The only documentation mention is `docs/photo/ENGINES.md:51` ("Placeholder only ... inert"). No product copy promising IPA output from a photo was found in `README.md`, `index.html` or `src/photo`. The "IPA" shown on other screens (atlas, read-my-way) comes from stored pronunciation data, not from this adapter.
- **Acceptance:** no user-visible claim of photo IPA; nothing sends photos to an outside service by default.
- **Proposed fix:** none needed now; add a one-line test that the default engine bundle has no `ipa` function.
- **Lane:** code/CI.

### 29. Tracing not teacher-certified

- **gh/main:** `src/letters/trace.view.js:27` (high-doubt notice) and `:170` (draft notice) say the shapes and order are unreviewed. **live:** the same notices (`trace.view.js:31-34,182`); the file is modified and now tracks assisted runs (`assistedRun`, line 110, 276, 288; "Walked through." vs "Perfect!"/"Done."; the progress chip reads "drawn by you"). I did not run the tracing tests.
- **Verdict:** NEEDS A HUMAN. Only a qualified handwriting teacher can approve print and cursive forms and stroke order. The draft warnings must stay.
- **Lane:** accessibility for stroke descriptions; Hebrew/content for the teacher packet. Owns `src/letters/trace.view.js` (accessibility lane; see work plan).

### 30. Placement not validated as an assessment

- **gh/main: REPRODUCED (documented limitation).** `src/placement/placement.view.js:3` "Cutoffs are untested guesses"; `:12` `DRAFT_NOTE` says no teacher has checked it and no learner has tried it.
- **live: PARTLY FIXED in wording (uncommitted).** `placement.view.js:3` adds "reversible suggestion, not a measure of what you know"; line 79 says a short untested check cannot show how much you know. Untracked `tests/honesty.wording.test.js` checks the wording (not run here).
- **Acceptance:** recommendations stay reversible and modest; no copy claims measured mastery; a neutral learner study evaluates the cutoffs before any claim.
- **Proposed fix:** keep the wording tests; run a small learner study (human dependency) before changing cutoffs.
- **Lane:** book/assessment. Owns `src/placement/placement.view.js`.

### 33. Accessible names need fresh rendered verification

- **gh/main: REPRODUCED as a pattern.** `src/letters/trace.view.js:183` and `:292` give buttons that show a Hebrew glyph an English-only `aria-label` (`l.name`); `src/pronunciation/vowelboard.view.js:102` uses `aria-label: \`Sign ${rec.name}\``. The 912 and 24 counts in `docs/A11Y.md` were not re-measured.
- **live: PARTLY FIXED.** `vowelboard.view.js:38-41` (committed) now builds the sign button from its visible glyph plus a visible name span with no `aria-label`. `trace.view.js:213` still labels the letter grid with `l.name`; `:367` labels the look-alike buttons with `shapeLabel(...) || l.name`. The stored axe run in live shows no `label-content-name-mismatch` nodes; `tools/a11y/labels.mjs` (live only) is a stricter label check. No screen reader or voice-control product was used by anyone for these results.
- **Acceptance:** a fresh rendered axe pass plus the label check have no failures on the trace and vowel-board routes; a human checks real screen reader and voice-control behaviour.
- **Lane:** accessibility. Owns `src/letters/trace.view.js`, `src/pronunciation/vowelboard.view.js`.

### 34. Real-device and offline coverage

- Needs physical devices and assistive technology; nothing here can verify it. Repo evidence only: `tests/offline.test.js` exists, `tests/deploy.smoke.test.js` does a shell reload offline (item 02). `src/shell/workbook.view.js:17` already warns PDFs are not stored for offline use. **NEEDS A HUMAN.** **Lane:** verification.

### 35. Backup/restore and clearing data

- **gh/main and live: NOT REPRODUCED** (no failure observed; I did not run a browser). Unit evidence: `tests/pwa.backup.test.js` (round trip, refused bad file leaves store untouched, newer schema refused) and `tests/progress.backup.test.js` in both trees; `tests/store.safety.test.js` covers an out-of-space restore that rolls back (line 66), quota and blocked storage with in-memory fallback (77, 91), and delete-all with typed confirmation and optional cache and service-worker removal (156). `src/shell/settings.view.js` asks for DELETE before wiping. Gaps: no test found for cancelling a file picker, for the browser-level offline cache after delete, or for a real storage-denied browser.
- **Lane:** verification (manual cases with environment and result recorded).

### 36. Asset volume hides placeholders and duplicates

- **gh/main: REPRODUCED (counts confirmed).** 2,373 image files by extension outside `.git` and `dist` (png, jpg, jpeg, webp, svg, gif, avif); 958 `.webp`; 797 SVG files in `assets/img/placeholders` (801 SVG in total); `assets/img/index.json` lists no real image files. The handoff's 2,373, 958 and 797 match.
- **live:** 3,485 image files, 1,870 `.webp`, 797 files in `assets/img/placeholders`, 926 SVG in total; the extra files are untracked or modified working-tree additions. `docs/img/INTEGRATION.md` says every image is unapproved and no view calls the resolver. I found no inventory tool among `tools/images` (name search only); no broken-reference scan was run here.
- **Acceptance:** an inventory that lists each image with where it is referenced, whether it is a placeholder, size, variants and whether the service worker caches it; broken references and retired concepts flagged; no category deleted merely to reduce counts.
- **Proposed fix:** add a read-only inventory script that writes a report; do not delete anything in the same change.
- **Lane:** artwork. Owns `assets/img/**`, `data/images/**`, `tools/images/**`.

### 37. Remaining product copy needs a rendered pass

- **REPRODUCED (one part):** raw exception text is shown to learners in alerts. gh examples: `src/corpus/read.view.js:111`, `src/vocab/vocab.view.js:275,304`, `src/pronunciation/soundgap.view.js:185`, `src/wordtrace/wordtrace.view.js:108`, `src/traditions/traditions.view.js:492`, `src/pronunciation/sounds.view.js:238`, `src/torahread/torahread.view.js:30`; 12 matching view files in gh (the same pattern was counted by search, not each opened). Live has the same pattern, for example `src/corpus/read.view.js:118` ("The text corpus could not be loaded (${err?.message || err})"), `src/vocab/vocab.view.js:277`, `src/pronunciation/soundgap.view.js:185`, `src/israel/israel.view.js:231`.
- **NEEDS A HUMAN (the rest):** letter-name versus sound self-ratings, vocabulary exposure, service-guide scope, tradition choice and first-session travel relevance need a rendered read-through; I did not render the app.
- **Acceptance:** failure states say what happened in plain words and offer a next step without exposing internals; the rendered pass is recorded per screen.
- **Lane:** Hebrew/content (copy), serialised after the other lanes because it touches many view files.

### Items 07 to 11, 16 to 20, 25, 26, 31, 32

BLOCKED-ON-DEPENDENCY: the subject files (worksheets, keys, CSVs, scripts, test specifications, book masters) are not in this environment, so there is no verdict and no finding. Item 38 is a documentation task whose status depends on what the other items close. Repo side: `README.md`, `docs/STATUS.md` and `docs/HANDOFF.md` are modified in the live working tree; their release claims were not read for this ledger. NEEDS A HUMAN.

## 4. Priority-ordered work plan for parallel lanes

Rule used: one owner per file. A file owned by one lane is not edited by another until that lane has merged. Items needing people or missing files are listed last as dependencies and do not block the engineering lanes.

**Wave 1 (start now, all parallel, disjoint files)**

| Lane | Items | Owns (exclusive) |
|---|---|---|
| A. code/CI: pipeline | 01, 02, 06 | `.github/workflows/*.yml`, `tests/deploy.smoke.test.js`, `tests/sweep.test.js`, `tools/test/*`, `tools/a11y/package*.json`, `tools/deploy/*` |
| B. code/CI: persistence | 03 (commit and verify the working-tree fix) | `src/curriculum/dom.js`, `actions.js`, `lesson.view.js`, `lesson.parts.js`, `tests/curriculum.save-failure.test.js` |
| C. accessibility | 04, 05, 33, 29 (code part) | `index.html`, `src/app.js`, `assets/css/app.css` (sound-bar rules), `tests/a11y.browser.test.js`, `tools/a11y/keyboard.mjs`, `src/letters/trace.view.js`, `src/pronunciation/vowelboard.view.js` |
| D. Hebrew/content: letters | 12, 13, 14 (text), the gimel "gym" regression | `data/letters/mnemonics.json`, `data/letters/memory-chain.json`, `data/curriculum/lessons.json` |
| E. code/CI: engines and listening | 23 (commit and test), 27, 28 | `src/listen/*`, `data/listen/config.json`, `src/photo/syllabify.js`, `src/pronunciation/shva.js`, `src/photo/engines/web.js`, `src/photo/scan.view.js` |
| F. artwork | 36 inventory (new script only), 14 (assets and the map file), 15 when the package arrives | `assets/img/**`, `data/images/**`, `tools/images/**`, `docs/images/**` |
| G. book/assessment | 30 | `src/placement/placement.view.js`, `tests/honesty.wording.test.js` |

Sequencing notes: lanes A and C both touch the accessibility test path. A owns the workflow and the skip-to-fail mechanism; C owns the contents of `tests/a11y.browser.test.js` and `keyboard.mjs`. C must land its change to `tests/a11y.browser.test.js` before A changes how its skips are counted, or A makes only workflow-level changes in that file's neighbours. Lanes D and F share the letters concept map: D finishes the text first, F then reads the result.

**Wave 2 (after Wave 1 merges)**

| Lane | Items | Owns |
|---|---|---|
| H. Hebrew/content: copy pass | 37 (raw error text in about a dozen view files), 22 copy | the `*.view.js` files named in item 37 (only after lanes C and E have merged, because `trace.view.js`, `listen.view.js` and `scan.view.js` overlap) |
| I. verification | 21 (`docs/A11Y.md`), 34, 35, 38, and re-run of 01 to 06 on the merged result | `docs/A11Y.md`, `docs/release/HANDOFF-LEDGER.md`, new evidence files only |

**Dependencies (cannot start here, need files or people)**

- Lane files from the owner's PC: items 07 to 11, 16 to 20, 24 to 26, 31, 32 and the package for 15 and 21. Once supplied, assign book/assessment (07 to 09, 20, 31), Hebrew/content (10, 11, 16, 18, 19, 24 to 26), verification (17, 32).
- Qualified people: native-speaker or community review for 12, 13, 24 to 26; handwriting teacher for 29; recording actors and reviewers for 22; a neutral learner group for 30; physical devices and screen readers for 33 and 34.

## 5. New observations (not part of the 38)

1. Live lacks upstream commit `48e2d88`: the gimel "gym" cue is still in `data/letters/mnemonics.json:18`. It will return to the fixed state when gh/main is merged; the merge lane should confirm.
2. Live `tools/a11y/keyboard-run.json` records two keyboard results that are neither passing nor flagged (`/letters` and `/letters/alef` "order in the page does not jump back up"). They may be new defects; see item 05.
3. The `storeWriteAll` fix covers lesson completion only; several other curriculum writes still use the swallowing helper (item 03, adjacent).
4. Live `ci.yml` marks the browser job `continue-on-error: true` and installs system tools with `continue-on-error`, so a regression in the mandatory browser tier cannot currently fail the workflow (items 01, 06).

## 6. Scope statement

Checked by reading code in two trees: items 01 to 06, 12 to 14, 21 (partly), 22 (code), 23, 27 to 30, 33, 35 to 37. Checked by running a script: item 03 only (read-only imports from live, copy for gh). Not checked: any test suite result, any rendered page, any browser or device behaviour, any of the lane files. Everything marked BLOCKED-ON-DEPENDENCY or NEEDS A HUMAN stays open until the named files or people exist.
