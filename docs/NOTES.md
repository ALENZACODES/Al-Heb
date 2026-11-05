# Maintenance notes — 2026-11-04

## Main-branch repair

- Installed the image and QR dependencies used by the tests in both workflows. Browser failures now fail CI instead of being ignored.
- Rebuilt festival vocabulary, image descriptions, the image index, thematic vocabulary and the offline manifest from current source data.
- Fixed the pending image queue to exclude ingested images and account for the separate Run 3 queue. It now contains 981 available pending items instead of re-queuing completed work to reach 1,000.
- Updated image and vocabulary assertions to match current source records while retaining uniqueness, coverage and source-consistency checks.
- Corrected a derived transliteration with the shared transliterator and synchronized its dependent records. This does not constitute human language approval.
- Recorded two existing raw OCR observations in the lint baseline. They are provenance evidence, not learner-facing Hebrew; the original observations remain intact.
- Fixed Windows file URLs, generated font/image URLs, test paths and command entry points. Test-runner launch failures now return a failing exit code.
- Removed requested assistant-name references from tracked text, including a machine-specific research path. Detection rules retain their behavior through escaped patterns. No commit history was rewritten; licence and provenance records remain available.
- Corrected browser smoke selectors to target visible lesson content and wait for loaded review counts.

## Validation

The first GitHub main run inspected had 24 failed unit checks. Local repair verification reached 1,901 passing checks with four failures; the subsequent targeted run passed all 38 applicable checks (one optional check skipped). Deployment validation passed 44/44. Text and metadata scans passed. GitHub workflow results on the final commit are the authoritative final status.

## Publishing and outstanding review

No Pages site was configured when checked. The Pages workflow builds on main; public publishing requires configuring Pages and setting the repository variable `ENABLE_GITHUB_PAGES=true`. This avoids treating an unconfigured public deployment as an application test failure.

The older pull request #1 contains changes based on an earlier main and conflicts with newer work. Its changes were not blindly merged. Human Hebrew/clergy review, image approval, recordings, licence decisions and real-device acceptance remain separate requirements; passing CI does not establish those approvals.
