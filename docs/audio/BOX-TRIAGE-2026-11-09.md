# Saving the Box's Uncommitted Work (2026-11-09)

Checked against GitHub on Nov 9 at about 22:10 ET. This plan changes nothing on `main`, deploys nothing and rewrites no branch. The tool it uses, `tools/audio/triage_checkout.py`, only reads the checkout and writes its lists outside the repo.

## What GitHub Has

| Branch | Box review | GitHub now | Note |
|---|---|---|---|
| `books/pictures-38-62` | `babac2cf` | `975b586a` | The job pushed book 49 (all 12 pictures) at 21:46 as `c4d2ef37`, then book 50 at 22:06. Still running. |
| `feature/original-music-2026-11-09` (PR #39) | `dacc829f` | `dacc829f` | Merged into `main` at 21:47 as `3f687235` (squash). |
| `fix/brain-lab-loading-2026-11-09` (PR #40) | `2199c020` | `2199c020` | Same. |
| `docs/commercial-image-orders-2026-11-09` (PR #41) | `d2febb51` | `1a90ab59` | Brain Lab orders added on top. |
| `cursor/vocab-sense-noise-4297` (PR #28) | `0bf2d9e5` | `0bf2d9e5` | Same. |
| `cursor/prayer-audio-integrate-03a5` (PR #29) | `fc1e0911` | `fc1e0911` | Same. |
| `john/israeli-production-2026-11-05` | `44498eac` | `44498eac` | Same. |
| `john/easy-to-follow-voice-2026-11-09` (PR #38) | `c0f7bf07` | `c0f7bf07` | Same. |

`main` was restarted as a fresh history at 17:13 on Nov 9 (`e074ceae`, six commits since). Every branch made before that shares no history with it, so "ahead" and "behind" counts against `main` mean nothing for those branches. The checks below compare file contents instead.

## Voice-Production Checkout (`/workspace/Al-Heb`, `john/israeli-production-2026-11-05`)

What the branch is: 419 checkpoint commits from Nov 3 to 08:28 on Nov 6, on the old history. Its 19,385 clips are all on `main` at the same paths: 18,783 byte for byte, and 605 that were re-done after Nov 6 (the branch's bytes are still on the Nov 6 to 8 branches; `main`'s first appear on Nov 8 and 9 branches). Only 2 non-audio paths on the branch are missing from `main`. None of its clips has a `.mp3.meta.json` sidecar.

What `main` still lacks: the audio manifests list 1,288 Israeli clips as `missing`. 674 of them already play another clip through `aliasOf`, so the real gap is **307 vocabulary words, both voices (614 clips)**, listed in [israeli-missing-words-2026-11-09.txt](israeli-missing-words-2026-11-09.txt). A dry run of the renderer on that list: 614 clips, 4,942 characters, about US$0.02 at list price.

So:

- **Do not commit onto `john/israeli-production-2026-11-05`.** It can never merge into `main`, and its paths are all owned by newer files on `main`.
- **Do not copy any box file over a path that `main` has.** `main`'s copies are the later work, including takes picked by both reviewers.
- **Save the box's leftovers as an archive**, the same way the five `audio/*-raw` branches already hold raw production zips.
- **Fill the 307-word gap with a fresh render** on a new branch from `main`. The box copies have no sidecar, so the app could not say where they came from, and they predate the Nov 7 text clean-up.

### Steps on the Box

1. Get the tool without touching the dirty checkout, then run it read-only:

   ```sh
   cd /workspace/Al-Heb
   git fetch origin
   git show origin/docs/box-triage-2026-11-09:tools/audio/triage_checkout.py > /tmp/triage_checkout.py
   python3 /tmp/triage_checkout.py --ref origin/main --zip
   ```

   It writes `summary.md`, `triage.csv`, one list per class and the archive zips (90 MB each at most) to `../alheb-triage-<branch>-<date>/`. Expect most of the 10,647 modified files in `same` or `differs`.

2. Read `summary.md`. Stop if it lists a possible secret: move that file out of the repo folder first.

3. Commit the archive on a new orphan branch, in its own worktree (the dirty checkout is not touched):

   ```sh
   cd /workspace
   git -C Al-Heb worktree add --detach ../alheb-box-raw origin/main
   cd ../alheb-box-raw
   git switch --orphan audio/israeli-production-box-raw
   cp ../alheb-triage-john_israeli-production-2026-11-05-*/{*.zip,archive-index.csv,triage.csv,summary.md} .
   git add -A
   git -c user.name="John Khan" -c user.email="johnnykhan1@gmail.com" commit -m "Voice production box leftovers: raw zips and triage lists (not used by the app)"
   git push -u origin audio/israeli-production-box-raw
   ```

4. Fill the gap on a new branch from `main`, with the approved Israeli voices and sidecars:

   ```sh
   cd /workspace
   git -C Al-Heb worktree add -b audio/israeli-missing-words-2026-11-09 ../alheb-missing origin/main
   cd ../alheb-missing
   node tools/audio/render_tts.mjs --provider google --voice both --kinds word --ids docs/audio/israeli-missing-words-2026-11-09.txt
   GOOGLE_TTS_API_KEY=... node tools/audio/render_tts.mjs --provider google --voice both --kinds word --ids docs/audio/israeli-missing-words-2026-11-09.txt --execute
   node tools/audio/mark_present.mjs
   node tools/build-precache.mjs && node tools/meta/scan.mjs --text && node tools/test/run.mjs unit
   ```

   Listen to a few clips on a phone. Then commit as John Khan, push, and open a draft PR. Leave it unmerged until John has listened.

5. Leave the dirty checkout as it is until John has seen the archive branch and the PR. Then it can be reset or removed.

## Little-Books Checkout

Nothing to commit by hand. The generating job commits each book when all 12 pictures are done: book 49 landed at 21:46, so the 11 untracked files the review saw were a book in progress. When the job finishes book 62, run `python3 /tmp/triage_checkout.py --ref origin/books/pictures-38-62` in that checkout. It should report only `same`. Any `differs` file is an alternate picture: GitHub's copy stays, because it is the one `data/books/*.json` points at.

## Never Commit

- Scratch and generated working files: `audio/_review/`, `tools/torah/snapshot/`, `data/images/sheets/`, `data/images/review/`, ingest reports, `dist/`, `node_modules/`, `__pycache__/`, `*.tmp`, `*.part`, `*.log`, `*.bak`.
- Secrets: `.env`, any key or service-account JSON (anything holding `"private_key"`), and the `GOOGLE_TTS_API_KEY` value itself.
- Duplicates: files named `... (1).mp3` or `... - Copy`, and files whose bytes GitHub already has under another name (the tool reports them as `same-elsewhere`).
- Anything over 95 MB. GitHub refuses files over 100 MB, and the site's deploy check stops at 25 MiB per file.
- Deletions: a file missing from the checkout is never pushed as a deletion.
- Code, docs or data edits made in the old checkout. `main` has moved on since Nov 6. Port real work by hand onto a fresh branch from `main`.

## Anything Else Missing From GitHub

Nothing the review listed is missing. Three things are easy to miss:

- `main`'s book data already points at the 300 pictures for books 38 to 62. On `main` they stay placeholders until `books/pictures-38-62` is merged; that branch has no PR yet.
- `john/word-takes` (1,865 candidate takes, last push 22:30 on Nov 9) and the `audio/*-raw` archives have no PR. That is by design, but they are not in `main`.
- `feature/original-music-audio-fix-2026-11-09` has no PR and needs none: PR #39 contains its 20:29 fix and the 21:05 recut that replaced it.

Not checked from here, because there is no shell access to them: John's Windows clone (`C:\Users\user\Al-Heb`), any other folder on the box, and pictures still waiting in the image tool's download folder. In each clone, `git status --short` (uncommitted work) and `git log @{u}..HEAD --oneline` (unpushed commits) answer the question.
