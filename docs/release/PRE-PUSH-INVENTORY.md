# Pre-push inventory (2026-11-04)

> **Superseded / stale since 2026-11-05: see [`STATUS.md`](../STATUS.md).** The working-tree counts below (modified, deleted, untracked) describe the checkout of 2026-11-04 and have not been re-run.

Read-only checks run against the working tree; nothing was staged, committed or pushed.

## Counts (git status --short)
- Modified: 841. Deleted: 52. Untracked: 1016 entries (1101 individual files once untracked dirs are expanded). 1910 status lines in total.
- Tracked files at HEAD: 4294 (142 commits). Remote: https://github.com/ALENZACODES/Al-Heb.git
- Size of changed + new files (untracked 53.4 MB, plus modified files at their new size): about 221.5 MB on disk.

## Largest files (new or modified), top of the 30
12.80 MB x4: book/out/alef-book-8.5x11-print-bleed-rtlspreads.pdf, -print.pdf, -print-bleed.pdf, alef-book-draft.pdf (all modified, already tracked)
7.05 MB data/vocab/words.json; 5.66 MB book/out/...REVERSED-ingram-lulu.pdf; 3.96 MB docs/voices/recording-script.csv; 2.91 MB docs/screens/vocab.png; 2.69 MB book/out/alef-book.html; 2.49 MB docs/screens/learn.png; 2.25 MB data/vocab/attribution.json; 2.25 MB docs/screens/how.png; 2.12 MB docs/voices/recording/recordings_needed.csv; 1.97 MB data/audio/manifest.json; then 1.2 to 1.9 MB: docs/screens/sounds.png, data/images/provenance.json, 3 audio word manifests, vocab5000.json, flashcard PDFs (docs/workbook and assets/workbook duplicates), flashcard HTML, data/images/manifest.csv, docs/screens/read*.png, frequency.json.

## Over 5 MB
Six files: the five book/out PDFs listed above (4 x ~12.8 MB, 1 x 5.7 MB) and data/vocab/words.json (7.05 MB). None is near the 100 MB per-file hard limit (largest is 12.8 MB).

## Repo size vs GitHub
- Local .git is 740 MB (pack 647 MB + 90 MB loose); working tree about 893 MB including dist/. GitHub's soft guidance is under 1 GB, hard limit 5 GB recommended max; per-file hard limit 100 MB (OK).
- Five modified book/out PDFs add about 51 MB of new blobs per commit that touches them (PDFs compress poorly). Repeated rebuilds will keep inflating history. Consider not committing regenerated print PDFs each time.

## Secrets and personal data
- Filename patterns (.env, *.pem, *.key, *secret*, *token*, *credential*, .DS_Store, *.log, *.db, *.zip, *.bak): no matches in new or modified files.
- Content patterns (cloud, code-host, chat and API keys, private key headers, key=value credentials): no matching files.
- Personal strings (phone, email, claim number, brokerage licence number): no matching files.
- Caveat: pattern greps, not a full audit; binary files were skipped by grep.

## Ignore rules
- Tracked-but-ignored: 0. No tracked .DS_Store, node_modules or __pycache__.
- Ignored and absent from the push (intended): dist/, book/out/qr/, data/images/sheets, review, ingest-report.json, docs/review/out/*.pdf (docs/review/.gitignore). Nothing there looks like needed source data, but dist/ and docs/review/out PDFs will not be on GitHub; confirm that is intended.

## Metadata / binaries
- node tools/meta/scan.mjs: PASS, zero findings (914 allowlisted; scanned roots assets, data, book/out, docs/voices, docs/qa; 3,000+ files).
- node tools/meta/scan.mjs --text: PASS (no AI/tool names in 4294 tracked text files, 24 allowlisted). Note it checks tracked files only; untracked text is not covered until added.
- book/pdf_tools.py has no "check" subcommand (subcommands: dests, pad-even, reverse, finalize, scrub, info). Used pdfinfo instead: all 7 book/out PDFs show Author "John Khan" and no Creator/Producer/Title.

## docs/drafts / inbox
- docs/drafts/ is untracked (10 files): README.md, SIX-LANES.md, INBOX-REPORT.md, IMAGE-PROMPTS.md plus inbox/lane1 to lane6, each containing only .gitkeep (no real drafts). tools/drafts/ (check_inbox.mjs, url-allowlist.json) is also new.
- Text naming tools or attribution in changed files: docs/review/CALENDAR-CHECK.md and tests/credits.test.js (the latter is a regex in a test, expected).

## push-clean.sh attribution rewrite
- It clones the repo (committed history only), so the 1910 uncommitted changes are not pushed until committed; run it only after commits exist.
- It rewrites author and committer on every commit, strips trailer and tool-attribution lines from messages, and aborts if any such text remains in the log. This is path-independent, so new paths are covered. The only path filter is assets/images/incoming, which does not exist in the working tree.
- Gap: it checks commit messages and identities only, not file contents (hence the CALENDAR-CHECK.md note above).

## Go / no-go
- GO: no file near 100 MB; no secret or personal-data hits; metadata scan clean; attribution rewrite covers new commits.
- GO (confirm): ignored items (dist/, review PDFs) are intentionally not published.
- CAUTION: five rebuilt 5 to 13 MB book PDFs add about 51 MB per push to an already 740 MB history; decide whether they belong in git.
- CAUTION: commit first; a new commit must exist for push-clean.sh to push anything. Review docs/review/CALENDAR-CHECK.md wording.
- NO-GO items: none found.
