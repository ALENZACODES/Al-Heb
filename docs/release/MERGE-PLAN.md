# Merge plan: local work vs GitHub main f924b24

Written 2026-11-04. Analysis only. Nothing in this repo was committed, staged, reset or merged while writing it. All measurements come from throwaway directories under `/tmp/merge-plan/` (outside the repo). Other lanes were editing the working tree, so every working-tree number below is a snapshot (taken 2026-11-04, about 2,130 changed paths) and must be re-measured before the real merge.

## 1. Situation, as measured

| Fact | Evidence |
|---|---|
| Remote `main` is `f924b24`, 150 commits. The last push is `c2dc882` (8 commits behind). | `git clone` of `ALENZACODES/Al-Heb`; `git log c2dc882..f924b24` |
| The 8 commits are 5 real commits plus 3 GitHub merge commits for PRs #2, #3, #4. | table in section 2 |
| Local `master` is `a12845f` (142 commits). `a12845f` and `c2dc882` have the same tree (`9fcfbd3b4f80...`), but different hashes. | `git rev-parse a12845f^{tree} c2dc882^{tree}` |
| `git merge-base master c2dc882` finds nothing: the two lines of history are unrelated to git. | measured in the real repo |
| The hashes differ only because `push-clean.sh` rewrites author and message and drops `assets/images/incoming`. The tip trees are identical. Trees of 18 older commits (positions 12 to 29 from the tip) differ because of the `incoming` removal; the other 124 are identical. | tree-by-tree comparison of both logs |
| Our unpushed content is therefore only the uncommitted working tree: 864 modified, 52 deleted, about 1,215 untracked files. There are no unpushed commits beyond `a12845f`. | `git status`, `git diff --name-only HEAD` |
| The real repo already holds the object `c2dc882` as `refs/remotes/origin/main` (stale; origin has not been fetched). | `git for-each-ref` |

### Finding that changes the plan: push-clean.sh would rewrite the remote's merge commits

`tools/release/push-clean.sh` runs `filter-branch` over all of `master`, setting committer to John Khan. Three of the new commits (`6e89c4a`, `9acd674`, `f924b24`) were committed by `GitHub <noreply@github.com>`. I ran the script's exact filter (with the remote's merged regex) over a clone of `f924b24`: the head became `31f90f5`, not `f924b24`. So even after a correct merge, running the unmodified script would again produce history that conflicts with the remote, and the only way through would be `--force`, which would destroy the merged PRs. Plain `git push` and `--force` are both unacceptable. The fix is in section 5 (rewrite only the new range, never the commits already on origin).

I verified that a range-limited rewrite works: after `filter-branch ... -- gh/main..integrate` on a test merge, the remote head was still an ancestor of the result (fast-forward).

## 2. The 8 remote commits (c2dc882..f924b24)

104 files changed in total (97 modified, 5 added, 2 deleted), +2,865 / -594.

| Commit | What | Files |
|---|---|---|
| `357e252` Repair main validation, refresh derived data and clean repository notes | Test and tool portability (Windows file URLs, path separators, runner exit codes), CI installs Pillow and segno and makes browser tests required, derived data refreshed (festival vocab, image index, next-1000 queue, manifests, precache), one transliteration fix, lint baseline entries, added `.gitattributes` and `docs/NOTES.md`, removed assistant-name text from tracked files (push-clean regexes now written `c[l]aude`) | 82 |
| `b1d0660` Fix browser learning checks and trim home loading | New `src/curriculum/state.js` (read-only `loadState`); `actions.js` re-exports it; `home.view.js` imports `state.js` instead of `actions.js`; smoke selectors; PWA check counts only installed cache entries | 10 |
| `14a5870` Stabilize backup test with valid streak data | `tests/settings.roundtrip.browser.test.js`: fixed clock plus a hand-written valid v2 streak record | 1 |
| `f0be387` Keep failed review ratings visible and retryable | `rateCard` writes cards with `ctx.store.set` directly so a rejection propagates; review view keeps the card revealed and shows "Try rating this card again"; new learnflow test | 5 |
| `48e2d88` Correct sound cue and scope learner progress claims | Gimel hard-g cue no longer says "gym" (soundAnchor and alternate story); "mastery" wording changed to "practised" in progress view, teacher summary, onramp wins, onboarding placement text | 14 |
| `6e89c4a`, `9acd674`, `f924b24` | GitHub merge commits for PRs #2, #3, #4 | 0 own |

## 3. Overlap with our work

Method: for each of the 104 remote-changed files I took three versions (base = `HEAD` = `c2dc882` tree, our working-tree file, remote `f924b24`) and ran `git merge-file`. I then confirmed by building a scratch commit of the whole working tree on top of `c2dc882` and running `git merge f924b24` (merge not completed, aborted, nothing kept).

| Class | Files | Meaning |
|---|---|---|
| Remote-only change (no overlap) | 39 | apply cleanly |
| Overlapping, total | 65 | |
| Identical change | 2 | `docs/images/paste/cmd-036.txt`, `cmd-037.txt` deleted on both sides |
| Trivial (different regions, git auto-merges) | 15 | see list below |
| Real conflict (textual, by `git merge`) | 48 files, 73 hunks | table below |

Trivial: `book/build.mjs`, `data/festivals/vocab.json`, `data/images/next1000.csv`, `data/vocab/themes/index.json`, `src/photo/scan.view.js`, `src/shell/home.view.js`, `src/speak/build.mjs`, `tests/credits.test.js`, `tests/store.safety.test.js`, `tests/typing.test.js`, `tools/build-precache.mjs`, `tools/deploy/check-deploy.mjs`, `tools/hebrew-lint/baseline.json`, `tools/meta/lib.mjs`, `tools/meta/text-allowlist.json`.

Textually clean does not mean semantically safe: `home.view.js` merged cleanly, and both sides made the same one-line import change (`actions.js` to `state.js`), but ours also rewrote the whole Home layout. The `home.view.js` change is therefore "identical on that line".

### Conflict table

Resolution key: OURS = keep our side; THEIRS = take remote; BOTH = hand-merge; REGEN = do not merge text, regenerate from merged sources.

| File(s) | Hunks | Class | Resolution |
|---|---|---|---|
| `src/curriculum/state.js` | add/add | real | **OURS**. Ours defines `currentStreak` here (v2 streak aware) and `progress.js` imports it from `state.js`. The remote version imports `currentStreak` from `progress.js`, which would be a circular import. |
| `src/curriculum/actions.js` | 2 | real | BOTH. Keep our `import { loadState } from "./state.js"` and `export { loadState }`. Port the remote `rateCard` change: replace `storeSet(ctx, CARDS_KEY, ...)` with the guard `if (!ctx?.store?.set) throw ...` plus `await ctx.store.set(CARDS_KEY, ...)`. Our `storeSet` swallows errors (`catch { /* best effort */ }`), so without this port a failed rating write is silently reported as saved. |
| `src/curriculum/review.view.js` | 1 | real | BOTH. Keep our file (92 added lines of memory-chain review). Port the remote catch block: on failed `rateCard` set the note to the failure plus "Try rating this card again", set `revealed = true`, and `return` before `stats[n]++; pos++`. Ours currently counts the review and advances even if the save failed. |
| `tests/curriculum.learnflow.test.js` | 1 | real | BOTH. Keep our edits and add the remote's 19-line retry test; run it. |
| `data/letters/mnemonics.json` | 1 | real | **OURS** plus the remote fix: remove "gym, " from the Gimel `soundAnchor` and its mention in the alternate story. Our tree still contains the "gym" cue (measured). Their other edit in this file is the same Gimel line. |
| `data/firstday/onramp.json` | 1 | real | BOTH. Ours renamed "vowel sign" to "vowel mark" in steps 3 to 5; theirs changed wins 1, 4 and 5 and the goal line ("baby steps" to "short steps"; "you know" / "you read" to "you practised"). Different lines, so apply both by hand. |
| `src/progress/progress.view.js` | 1 | real | BOTH. Ours adds `streakVisible` gating and plainer copy. Theirs scopes claims: "What have I practised?", "Try reading", "Words to practise", "use signs you have practised", "content coverage, not a reading assessment". Prefer THEIR claim wording where ours still says "you can read" or "can sound out" (more conservative, and it is the reviewed correction). Then fix `tests/progress.view.test.js` to match the final strings. |
| `tests/progress.view.test.js` | 2 | real | Follow the final `progress.view.js` text. |
| `src/onboarding/model.js` | 1 | real | BOTH. Ours blanked the descriptions for "Some" and "vowels" and shortened others; theirs changed those two descriptions to "draft placement check suggests a starting lesson". Keep ours but keep the "draft" qualifier somewhere learner-visible, or accept their text. Decide with the owner; neither is a conflict of fact. |
| `tests/settings.roundtrip.browser.test.js` | 1 | real | **OURS**. Ours waits for the boot-time streak normalisation and seeds the normalised record, and asserts more (schema 99 refusal, keyboard import, delete help text). Drop their `setFixedTime` approach unless the test fails. Needs a browser run to confirm. |
| `tools/lighthouse/pwa-check.mjs`, `tools/qa/pwa_audit.mjs` | 1 + 1 | real | THEIRS for `pwa_audit.mjs` (counts only `ALEF_PRECACHE`, which is the installed list; ours is the same intent, check that the on-demand list in `precache-manifest.js` still parses). For `pwa-check.mjs` take THEIRS (asserts the new worker waits for consent, then activates after SKIP_WAITING) if the service worker in our tree no longer calls skipWaiting automatically; otherwise OURS. Verify with the PWA check run. |
| `.github/workflows/ci.yml` | 1 | real | BOTH. Take our expanded workflow (timeouts, toolchain report, python requirements file). Take their intent: browser smoke job must not be `continue-on-error`. Check that `tools/test/requirements-ci.txt` pins `Pillow==11.3.0` and `segno==1.6.6` as their step does. |
| `.github/workflows/pages.yml` | 1 | real | BOTH, but the repository variable names disagree: ours `PAGES_ENABLED`, theirs `ENABLE_GITHUB_PAGES` (also documented in their `docs/NOTES.md`). Pick one name and update both `pages.yml` and `docs/NOTES.md`/deploy docs. Our file's `branches: [main, master]` and Cloudflare-style `dist/` build stay. |
| `tests/sprint.model.test.js` | 1 | real | Decide by data: ours asserts exactly 4 hidden ranks (43, 169, 1160, 3834) excluded; theirs recomputes from `vocab5000.json`. Theirs is more robust; keep it if it passes on our data. |
| `tests/torahread.view.test.js` | 1 | real | Licence string. Base said CC-BY, ours says CC0, theirs says CC BY-SA. I could not tell from the sources which the view prints. Resolve by running the test against the merged view and checking the licence record in `src/torahread/sources.js`; needs a human check of the wording. |
| `tests/vocab.corrections.test.js`, `data/vocab/corrections.json` | 2 | real | BOTH. Ours added about 2,480 lines of corrections (counts 173 translit, 370 corrections); theirs fixes one derived transliteration (+8/-1) and changes the test to `spec.corrections.length`. Hand-merge the one record into our corrections, then recompute the expected counts by running the test. |
| `tools/images/build_next1000.mjs` | 1 | real | BOTH. Theirs: queue excludes already-ingested images (`!done.has` and `!existing.has`) and "up to TARGET" instead of padding to 1000. Ours: `need = min(TARGET - remaining, newRows.length)`. Combine: keep their filter and our `Math.min`. |
| `tools/images/build_paste_files.mjs`, `tests/next1000.test.js`, `tests/paste.test.js`, `tests/images.ingest.test.js`, `tests/images.inter.test.js`, `tests/images.redo.test.js`, `tests/images.review.test.js`, `tests/book.images.test.js` | 1 to 2 each | real | Mostly one-line count changes (for example "of 86" became 103 on their side and 177 on ours). Resolve by REGEN: take ours, then re-run the generators and update asserted counts from the regenerated output. |
| `data/images/generated-manifest.json` | 4 | real | REGEN. Both sides appended about 2,400 to 2,570 rows. Do not hand-merge; take ours and re-run the manifest builder, then verify no row from theirs is lost (diff on `file` keys). |
| `data/images/next1000-groups.json`, `docs/images/NEXT_1000_COMMANDS.md`, `docs/images/RUNBOOK.md`, `docs/images/REDO-LIST.md` (5 hunks), `docs/images/paste/INDEX.md`, `redo-01` to `redo-09` (`redo-08`, `redo-09` add/add) | 1 to 5 | real | REGEN with the merged `build_next1000.mjs`, `build_redo.mjs`, `build_paste_files.mjs`, `build_runbook.mjs`. Both sides regenerated these from different source data, so the text differs only in derived numbers. |
| `data/vocab/words.json`, `data/vocab/index.json`, `data/vocab/packs/survival-lesson-read-1.json`, `data/vocab/themes/religion-prayer-set01.json`, `data/img/index.json` | 1 each | real (single huge line) | REGEN from merged sources (ours has 6,303 words, theirs 6,297 with one transliteration fix). Take ours, then apply the transliteration correction through `corrections.json` and rebuild; do not hand-edit one-line JSON. |
| `precache-manifest.js` | 1 | real | REGEN. Never merge by hand: run the precache build in the scratch clone only after all other conflicts are resolved. Check that `src/curriculum/state.js` and `src/shell/persist-gate.js` are both listed. |

The regeneration commands for the derived files were not run and I did not verify their exact order; candidates by file name are `tools/images/build_next1000.mjs`, `build_paste_files.mjs`, `build_redo.mjs`, `build_runbook.mjs`, `tools/vocab/apply_corrections.mjs`, `tools/vocab/build_words.mjs` and `tools/build-precache.mjs`. Read each tool's header and `docs/NOTES.md` (added by the remote) before running them.

## 4. Is the remote's content already in our tree?

| Remote change | In our working tree? | Evidence |
|---|---|---|
| Home trim (home imports `state.js`) | Yes, same shape. Our untracked `src/curriculum/state.js` exists and `home.view.js` has the identical import line. | the diffs above |
| `loadState` moved out of `actions.js` | Yes. | ours `actions.js` imports/re-exports from `state.js` |
| Backup-test streak fix | Different fix for the same cause (ours waits for the boot normalisation). Not identical. | `tests/settings.roundtrip.browser.test.js` |
| Gimel cue | No. "gym" is still in the Gimel record. | `data/letters/mnemonics.json` line 18 |
| Review rating retry | No. Ours still counts and advances on a failed save, and `storeSet` swallows write errors. | `review.view.js`, `dom.js` |
| Progress/teacher/onboarding claim scoping | Partly. Ours reworded different strings; "you can read / sound out" strings remain. | `progress.view.js` |
| CI hardening (required browser job, Pillow/segno) | Partly; ours has a richer workflow but keeps the smoke job lenient. | `ci.yml` |
| Windows/path portability fixes in 30+ tests and tools | No (these are the clean, non-overlapping 39 files). | file list |
| `.gitattributes` (`text=auto`, LF for js/mjs/json/md/yml) | No. | file absent locally |
| Assistant-name scrub in tracked text | Partly. The remote tip has 5 tracked files with such text; HEAD has 12; the working tree has 14, including new docs of ours (`docs/qa/REGRESSION-2026-11-04.md`, `docs/release/PRE-PUSH-INVENTORY.md`). | `grep -rIl` counts |

## 5. Integration plan (no force, no history rewrite of origin)

Principle: the merge happens in a scratch clone outside the repo; the real repo only gets one ordinary commit first and is realigned at the end. Never run `push-clean.sh` as it stands.

### Step 0. Quiesce
Set `REPO` to the absolute path of this repository (`export REPO=...`). Ask the other lanes to stop writing to it. Re-run `git status --short | wc -l` twice a minute apart; it must be stable.

### Step 1. Commit our work locally (normal commit, on master)
```
cd $REPO
git status --short | head            # review once more; ignored dirs (dist/, book/out/, data/images/review/) are not included
git add -A
git commit -m "Working-tree checkpoint before merging origin/main f924b24"
git rev-parse HEAD                   # call this W
```
Co-author or session trailers on this commit are fine; they are stripped in step 6.

### Step 2. Scratch clone and fetch the remote
```
set -euo pipefail
S=/tmp/merge-plan/integrate
rm -rf "$S"
git clone --no-local $REPO "$S"
cd "$S"
git remote add gh https://github.com/ALENZACODES/Al-Heb.git
git fetch gh main
test "$(git rev-parse gh/main)" = f924b24cb2c283fd7475f5cdd45f16dfeccf9d5d   # abort and re-plan if the remote moved again
git config user.name "John Khan"; git config user.email "johnnykhan1@gmail.com"
```

### Step 3. Put our commit on the remote's lineage, then merge
`a12845f` and `c2dc882` have identical trees, so replaying our commits onto `c2dc882` is conflict-free and gives git a true merge base.
```
git checkout -b integrate master
git rebase --onto c2dc882d0b6e56797f995a11b0ab4ec4196aea9a a12845f0f09324e5b682fe6d731f25b515a66102 integrate
git merge-base integrate gh/main        # must print c2dc882d0b6e...
git merge --no-ff --no-commit gh/main   # expect 48 conflicted files (15 other overlapping files auto-merge)
git diff --name-only --diff-filter=U | wc -l
```
Do not use `-X ours` or `-X theirs`: the conflicts mix "take ours" and "take theirs" and several need both sides.

### Step 4. Resolve using the table in section 3
Order: (1) source files first (`state.js`, `actions.js`, `review.view.js`, `progress.view.js`, `onboarding/model.js`, `onramp.json`, `mnemonics.json`, `corrections.json`, workflows, PWA tools), (2) generator scripts (`build_next1000.mjs`, `build_paste_files.mjs`), (3) take OURS for every derived file and then regenerate, (4) tests last, (5) `precache-manifest.js` last of all. Useful helpers:
```
git checkout --ours   -- <file> && git add <file>     # our side
git checkout --theirs -- <file> && git add <file>     # remote side
git diff --name-only --diff-filter=U                  # what remains
grep -rn '^<<<<<<<\|^>>>>>>>' --include='*.js' --include='*.mjs' --include='*.json' --include='*.md' --include='*.yml' --include='*.txt' . | grep -v node_modules   # must print nothing
```
Reapply the port items by hand: rateCard direct write, review retry catch, Gimel "gym", onramp "practised" wins, progress claim wording, `build_next1000.mjs` ingested-image filter.

### Step 5. Verify in the scratch clone (nothing here has been run yet)
```
node tools/build-precache.mjs                  # in the scratch clone only
npm test                                       # unit tier; compare against the remote's recorded result (1,906 pass, 2 local browser-location failures per docs/NOTES.md)
npm run test:browser                           # needs Playwright; settings round trip, learnflow, PWA
node tools/meta/scan.mjs && node tools/meta/scan.mjs --text
node tools/deploy/check-deploy.mjs --root dist # after node tools/deploy/build_site.mjs
git grep -il 'c[l]aude\|an[t]hropic' | sort   # compare with the remote's 5 files; remove any assistant-name text in tracked files that the remote already scrubbed
git commit -m "Merge origin/main (PRs #2, #3, #4) into local work"
```
A failing test caused by a count in derived data means regenerate, not edit the number by hand. If a unit test passes on remote's tip but fails on the merge, bisect between `gh/main` and the merge result before pushing.

### Step 6. Rewrite only the new commits, then push as a fast-forward
Do not run `tools/release/push-clean.sh` unchanged. Run the same filter over the new range only, so the remote's own commits (including the three GitHub-committed merges) keep their hashes:
```
cd /tmp/merge-plan/integrate
export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch -f \
  --env-filter "export GIT_AUTHOR_NAME='John Khan' GIT_AUTHOR_EMAIL='johnnykhan1@gmail.com' GIT_COMMITTER_NAME='John Khan' GIT_COMMITTER_EMAIL='johnnykhan1@gmail.com'" \
  --msg-filter "<the same message filter that tools/release/push-clean.sh uses: drops trailer lines and tool-name lines>" \
  -- gh/main..integrate
git merge-base --is-ancestor gh/main integrate && echo "fast-forward OK"
git log --format='%an %ae %cn %ce' gh/main..integrate | sort -u   # expect only the one author line
git push --dry-run gh integrate:main
git push gh integrate:main          # plain push; if rejected, stop and re-run from step 2. Never add --force.
```
Before this step, confirm `git ls-remote gh main` still returns `f924b24`.

### Step 7. Realign the real repo (owner decision)
```
cd $REPO
git branch backup/pre-merge-2026-11-04 master   # keeps the old local history and commit W
git fetch /tmp/merge-plan/integrate integrate:refs/heads/integrated
git checkout integrated                          # working tree is clean after step 1, so this only moves content
git branch -f master integrated && git checkout master
git fetch origin                                 # refreshes origin/main so prepush.sh's origin/main..HEAD range is correct
```
Branch moves only; no file in the working tree is discarded without a commit holding it. Skip this step if any lane has uncommitted work again.

### Step 8. Fix push-clean.sh for next time (separate commit, after the merge)
Change it to: clone, `git fetch target main` (add the target remote first), refuse to continue unless `target/main` is an ancestor of `master`, run the filter only over `target/main..master`, push `HEAD:main` without a force option, and delete the `--force` branch from the script and its usage line. Keep the `c[l]aude` spelling the remote introduced. Merge it on top of the remote's edited version of the script, which touches the same two lines.

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Running unchanged `push-clean.sh` rewrites GitHub-committed merges (measured: head becomes `31f90f5`) | push rejected, tempts `--force`, which deletes PRs #2 to #4 | step 6 range-limited filter; never `--force` |
| Local and remote histories share no merge base by hash | a plain `git merge origin/main` in the real repo would add/add conflict on nearly every file | step 3 rebase onto `c2dc882` first (identical tree) |
| Remote moves again before push | non-fast-forward | step 2 and 6 check the hash; redo from step 2 (the resolutions can be kept with `git rerere` if enabled: `git config rerere.enabled true` before step 3) |
| Silent loss of a failed-save guard | learner sees "saved" for an unsaved review rating | port both halves (`actions.js` direct write and `review.view.js` retry); the remote's learnflow test covers it |
| Circular import if the remote `state.js` is taken | module load failure of Home and progress | take OURS for `state.js` |
| Derived data merged by text | corrupt one-line JSON, wrong counts, stale precache | regenerate; precache last |
| Licence wording in `tests/torahread.view.test.js` (CC0 vs CC BY-SA) | a wrong licence assertion hides a real attribution error | check against the sources record before choosing |
| Assistant-name text re-enters tracked files (14 in our tree vs 5 on remote) | prepush text scan fails, or the text is published | step 5 grep, scrub our new docs, then rerun `meta/scan.mjs --text` |
| `.gitattributes` (`text=auto`, `eol=lf`) arrives with the merge | line-ending renormalisation may show spurious diffs | after the merge run `git add --renormalize . && git status --short`; expect none (no CRLF found in the sampled tracked text files) |
| Browser tests unverified | settings round trip and PWA update tests were written against different behaviour on each side | run `npm run test:browser` in the scratch clone; do not push on unit results alone |
| CI differences after push (required browser job, Python deps) | red CI on the first run | ensure the CI file lists the same dependency pins the tests need |
| Snapshot drift: the measurements here come from a moving working tree | conflict list may change | re-run the classification after step 1 (the commands are in section 7) |
| Large push (about 1,200 added files, 740 MB local `.git`) | slow or timed-out push through the proxy | push once; if it fails, check the proxy status before retrying; never split by force-pushing |

## 7. How these numbers were produced (reproducible, read-only)
```
git clone https://github.com/ALENZACODES/Al-Heb.git /tmp/merge-plan/remote
git -C /tmp/merge-plan/remote diff --name-status c2dc882 f924b24                 # 104 files
git -C $REPO diff --name-only HEAD; git -C $REPO ls-files --others --exclude-standard
# per overlapping file: git merge-file -p <ours> <base> <theirs>, base = HEAD:<file> (tree equals c2dc882)
# scratch trial: clone remote, branch from c2dc882, copy the working-tree file list, commit, git merge f924b24, git merge --abort
```
The classification and the trial merge agree (48 conflicted files).

## 8. What was not measured
- No test, build, precache, lint or browser run on either side or on a merged tree. All "should pass" statements are expectations, and the remote's own pass counts are quoted from its `docs/NOTES.md`, not reproduced.
- No conflict was resolved; the trial merge was aborted. Where the table says BOTH, the exact final text is unwritten.
- The exact regeneration commands and their order for derived files were not run.
- The licence question in `tests/torahread.view.test.js` is unresolved.
- Whether the first full push will succeed through the proxy at this size is untested (I ran no push, not even `--dry-run`).
- The working-tree snapshot is from a tree other lanes were still editing.
