# Drafts inbox: how to use it (10 steps)

Outside drafts (see `SIX-LANES.md`) are never used by the app until a person promotes them. Nothing here is reviewed content.

1. Save each reply as ONE file in `docs/drafts/inbox/lane<N>/`, named like `lane2-18-greetings.csv` (lower case, digits, hyphens; the lane number matches the folder; csv, json, md or png only).
2. Do not fix a draft by hand to make it pass. Ask the drafter for a redo.
3. Run `node tools/drafts/check_inbox.mjs`. It only reads; it never changes or moves a file.
4. Open `docs/drafts/INBOX-REPORT.md`. The Files table has a Status per file: FIX FIRST, needs native check, or nothing mechanical found.
5. FIX FIRST: read the Errors table. "What is wrong" says where (row and id) and "What to do" says the next step. Then run step 3 again.
6. "Unknown words" are not errors. They are Hebrew words the app list does not have with that pointing; a person confirms each one.
7. Lines marked `?? CHECK` go to a native speaker. "nothing mechanical found" never means the Hebrew is right.
8. Pictures: if the report says hidden information, run `node tools/meta/strip.mjs` on a copy first.
9. To accept a file: `node tools/drafts/promote.mjs docs/drafts/inbox/lane2/lane2-18-greetings.csv data/some-folder`. It refuses a file with errors, MOVES the file (it leaves the inbox), never overwrites, and adds a line to `docs/drafts/PROMOTED.md`. Add `--strict` to also refuse `?? CHECK` lines.
10. Then run that area's own tests. Options for the check: `--strict`, `--max-words N`, `--inbox DIR`, `--report FILE`, `--no-report`.

## What the checker looks at

- **Hebrew.** Each Hebrew string goes through `tools/hebrew-lint`. Each word is looked up in `data/vocab/words.json` with the same pointing; a miss is an "unknown word" with a reason (the report shows the app's pointing when the letters match).
- **Banned content (errors).** Tool, vendor or provenance wording; divine names; links to hosts not in `tools/drafts/url-allowlist.json`; author, copyright or credit lines; music notes or "lyrics"; any line or cell with more than 8 Hebrew words (looks copied).
- **Shape.** Duplicate ids, empty cells, ragged CSV rows, invalid JSON, file-name rule, wrong folder, unsupported types.
- **Images.** PNG only: valid file, at most 6 MiB, each side 256 to 4096 pixels, no metadata chunks.

It cannot tell whether Hebrew is correct, a picture is original, or a source is real.

Tests: `node --test tests/drafts.inbox.test.js`.
