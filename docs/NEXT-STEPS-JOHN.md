# Next steps that only John can do

Written 2026-11-04. Ordered by what unblocks the most. Each item names the file to open first. Nothing below has been done by anyone: nothing is deployed, nothing is recorded, no native or clergy reviewer has returned a row (`docs/STATUS.md`).

1. **Decide the licence.** Open `docs/legal/DECISIONS-FOR-JOHN.md`. Choose a code licence (proprietary, MIT or Apache-2.0), a content approach for the share-alike vocabulary (A, B or C), and what to do with the prayers whose source labels are unsure (21 Metsudah records, 6 Torat Emet, 15 Shaliehsaboo). Background is in `docs/legal/CONTENT-LICENCE-AUDIT.md`. Not legal advice; the files say a lawyer has not looked at any of it. Until you decide, the README says all rights are reserved and no `LICENSE` file exists.

2. **Set up Cloudflare Pages.** Open `docs/deploy/CLOUDFLARE-PAGES.md`, section "Steps", items 3 to 10 (account, connect the private repository, build command `node tools/deploy/build_site.mjs`, output folder `dist`). Then run its "After the deploy" checks on a phone and a desktop. Before you do, run `node tools/deploy/build_site.mjs && node tools/deploy/check-deploy.mjs` locally and make sure every check passes. Also read `docs/deploy/CI-GAP.md` (the CI notes are against an older commit).

3. **Send the review packs to native speakers and clergy.** Open `docs/review/INSTRUCTIONS.md` (what to tell reviewers) and `docs/review/STATUS.md` (nine packs, 7,039 rows, 0 reviewed). The files to send are in `docs/review/packs/` (CSV plus a printable HTML page per pack). Start with `04-liturgy-corpus-and-trope` (clergy or cantor) and `01-core-lessons` (Hebrew teacher). When rows come back: `node tools/review/ingest.mjs returned.csv --reviewer NAME --type teacher|cantor|native --date YYYY-MM-DD` (dry run), then add `--write`. The older packet tooling is in `docs/review/README.md`.

4. **Get voices.** Two routes, both yours to start.
   - Human recording: open `docs/voices/casting-brief.md`, then `docs/voices/kit/README.md` (session plans and slates for four voices) and `docs/voices/donor-rights-grant.md` (what a donor signs) and `docs/voices/buyout-contract-terms.md`. A dedicated record-kit tool does not exist yet; the kits in `docs/voices/kit/` are plans only. Priority clips: `docs/voices/recording/priority_summary.md`.
   - Local synthetic voice: open `docs/tts/README.md`. It has not produced a real clip yet (the one real attempt ran out of disk); run it on your own machine, listen first, follow `docs/voices/tts-evaluation-protocol.md`, and note that Sephardi and Ashkenazi clips and Israeli letters, vowels and syllables need a human.
   - Decide which Israeli clips may stand in for Sephardi (`data/audio/equivalence.json` is empty).

5. **Generate and approve images.** Open `docs/images/RUNBOOK.md` for the order in which to paste batches into your image tool (515 prompts have no image yet; 282 are ingested, 0 approved). Ingest with `docs/images/README.md`, then approve or reject on the review sheet (`node tools/images/review_page.mjs`, open `data/images/review/index.html`). Decide the disclosure wording in `docs/images/RIGHTS.md`.

6. **Test on real devices.** Open `docs/qa/DEVICES.md` (what the emulation covers and what only a phone can show) and `docs/A11Y.md`. Try it on an iPhone and an Android phone: install, offline reload, bottom tab bar and More sheet, a screen reader on the letters and a lesson. Note failures against `docs/qa/SWEEP.md` so they can be fixed.

7. **Pick one or two learners and one shul or class** once something is deployed. Open `docs/host-kit/facilitator-guide.md` and `docs/host-kit/outreach-drafts.md`. The strategy file `docs/strategy/DUOLINGO-100.md` says plainly that no learner test has been run.
