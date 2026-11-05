# Audio clips: where to keep them, what we do not know about the voice, and what "approved" requires

Written 2026-11-05 for the owner. This is a decision sheet. It states what the repo records, shows the arithmetic, and lists questions to put to the voice provider and to a lawyer. It gives no legal conclusions and answers none of the licence questions.

Everything below is one of three kinds, and is labelled when it matters:

- **Counted**: read from files in this repo (the audio manifests, the two ingest reports, the deploy notes) or from the host's API on the date given.
- **Estimate**: arithmetic on counted numbers with an assumption written next to it.
- **Not checked**: said plainly where it applies.

## The three decisions in one screen

| # | Decision | Recommendation | Why, in one line |
|---|---|---|---|
| 1 | Where do more clips live? | Stop adding clips to the main repo. Use a separate private store that the build pulls from (option B below). Keep the 87 already committed where they are. | The repo history cannot be rewritten, so anything committed stays; the rights to these clips are not cleared; the repo is already 696 MiB. |
| 2 | Can the outside synthetic voice be sold inside the app or book? | Unknown. Ask the provider and a lawyer (section 2). Do not assume yes. | The repo records "licence not cleared" and has no provider terms. |
| 3 | When may a clip be called approved? | Only when a native listener has listened to that exact file AND the rights questions are answered in writing AND a person has recorded both in the clip's sidecar (section 3). | Today no clip meets either condition, and the tests encode that. |

## 1. Size, history growth and hosting

### 1.1 What is in the repo today (counted)

| Fact | Value | Source |
|---|---:|---|
| Clips listed in the manifests | 24,906 | `data/audio/summary.json`, [`../STATUS.md`](../STATUS.md) |
| Clips that exist (all `synthetic-unreviewed`, Israeli, voice slot `m`, single words) | 87 | [`INGEST-REPORT-88.md`](INGEST-REPORT-88.md) |
| Recorded by a human | 0 | same |
| Entries in the `m`/`israeli` slot, all kinds | 4,685 | counted from `data/audio/manifest.json` and `manifest-words-israeli.json` on main, 2026-11-05 |
| of which words / lines / prayers | 4,143 / 290 / 70 | same count |
| of which letters, vowels, syllables (human-only; the ingest tool will not take them from a synthetic source) | 182 | same count; rule in [`INGEST-CLIPS.md`](INGEST-CLIPS.md) |
| Entries a synthetic source may fill in that slot | 4,503 (= 4,685 - 182) | arithmetic |
| Same slot for `f` | 4,685 | same count; all `missing` |
| Still missing by the manifest status | 24,819 (= 24,906 - 87) | arithmetic |
| Still missing by the coverage report ("required" clips only) | 22,425 (= 22,512 - 87) | [`INGEST-REPORT-88.md`](INGEST-REPORT-88.md), `coverage.mjs`; the gap of 2,394 is clips the coverage report does not count as required (its own text says optional whole-prayer reads and aliases are excluded); this was not broken down further |

The request's "4,685 Israeli words" is the full Israeli male slot: 4,143 words plus 290 lines, 70 prayers and 182 human-only items. Only 4,503 of those can come from a synthetic source under the repo's own rule.

### 1.2 Size per clip, and the extrapolation (estimate)

Three per-clip figures exist. They differ because they measure different things:

| Figure | Per clip | Where it comes from |
|---|---:|---|
| a | 6.6 KiB | tool-measured average of the first 82 clips, [`INGEST-REPORT-83-tool.md`](INGEST-REPORT-83-tool.md) |
| b | 7.3 KiB | tool-measured average reported in [`INGEST-REPORT-88-tool.md`](INGEST-REPORT-88-tool.md) (written when 5 more were applied; the report does not say which clips it averages) |
| c | about 12.9 KiB | 1.1 MB for the 87 clips as stated in the owner's request (the first report says 1.1 MB for 82 MP3 plus 82 sidecar files). Includes sidecar files and disk block rounding, so it is an upper bound for the MP3s alone. Not re-measured here: `audio/` is not in the working copy used to write this sheet. |

The tool's own conversion setting is 64 kbps mono, which is 8,000 bytes per second, about 7.8 KiB per second. The 87 clips run roughly 0.3 to 1.8 s each (reports), which is consistent with figure a and b.

**Formulas** (all KiB, divide by 1024 for MiB):

- Size of N clips of one kind: `S = N x s`.
- Mixed set: `S = Nw x sw + Nl x sl + Np x sp`, with words `sw` from the table above, and, as an **assumption not measured by anything in the repo**, lines about 4 s (`sl` = 32 KiB) and prayers about 8 s (`sp` = 64 KiB) at 8 KiB per second. Every measured clip so far is a single word, so extrapolating word-sized numbers to lines and prayers is the weakest part of this table.

| Set | N | at a (6.6) | at b (7.3) | at c (12.9) |
|---|---:|---:|---:|---:|
| `m`/`israeli`, everything a synthetic source may fill | 4,503 | 29.0 MiB | 32.1 MiB | 56.7 MiB |
| `m` + `f` Israeli, same rule | 9,006 | 58.0 MiB | 64.2 MiB | 113.4 MiB |
| Mixed `m`/`israeli` (4,143 words at b, 290 lines at 32, 70 prayers at 64) | 4,503 | | 43.0 MiB | |
| Mixed, both voices | 9,006 | | 85.9 MiB | |
| Every manifest entry (the tools' own projection, not a plan) | 24,906 | 160.5 MiB | 177.6 MiB | 313.8 MiB |

The 160 and 177 MiB rows match what the ingest reports print ("a projection, not a measurement"). Sidecar `.meta.json` files add one extra file per clip in git; their size was not measured separately.

Not every listed clip should be rendered: letters, vowels and syllables are human-only, and Sephardi and Ashkenazi clips cannot come from this source (the app labels them "style not verified"; no clip exists for either). So the realistic synthetic target is the 4,503 and perhaps the `f` slot, not 24,906.

### 1.3 Git history growth risk (counted and reasoned)

- GitHub reports the repo at **712,939 KB, about 696 MiB** (`gh api repos/ALENZACODES/Al-Heb`, read 2026-11-05; the API's size figure is approximate).
- GitHub's guidance on large files: repositories "ideally less than 1 GB", and "less than 5 GB is strongly recommended"; a warning above 50 MiB per file and a block above 100 MiB per file (docs.github.com, "About large files on GitHub", read 2026-11-05). Headroom to the 1 GB ideal is about 328 MiB, and every other lane shares it.
- MP3 is already compressed, so git cannot shrink a changed clip against its old version. Each version of a clip that is committed adds about its full size, and a replaced clip stays in history. History rewrites are not allowed by the owner, so the repo size can only go up. A bad batch, a re-render, or clips whose rights later turn out not to cover distribution would all remain in the history.
- Effect of adding clips to the 696 MiB base once (estimate, using the table above):

| Added once | Repo size afterwards |
|---|---:|
| m/israeli, 4,503 clips at b | about 728 MiB |
| m/israeli, mixed estimate | about 739 MiB |
| m + f Israeli, mixed estimate | about 782 MiB |
| all 24,906 at c | about 1,010 MiB (past the 1 GB ideal; at figure c) |

Add one more copy for every full re-render. Cloning, CI and every contributor pay for the whole history, not just the latest tree (CI clone time was not measured).

### 1.4 Deploy size and host limits (read 2026-11-05)

| Host | Limit | Source and date |
|---|---|---|
| Cloudflare Pages | 20,000 files per site on Free (100,000 on paid plans, with `PAGES_WRANGLER_MAJOR_VERSION=4`); 25 MiB per file; 500 builds a month on Free; no total site size is stated on the page | developers.cloudflare.com/pages/platform/limits, page shows "last updated" 2026-09-05, read 2026-11-05 |
| GitHub Pages | published site no larger than 1 GB; source repo recommended 1 GB; deploy timeout 10 minutes; soft bandwidth 100 GB a month; soft 10 builds an hour; private repos need a paid plan | docs.github.com, "GitHub Pages limits", read 2026-11-05 |
| GitHub release assets | each file under 2 GiB; up to 1,000 assets per release; "no limit on the total size of a release" or bandwidth | docs.github.com, "About releases", read 2026-11-05 |
| Cloudflare R2 (Standard) | $0.015 per GB-month; free each month: 10 GB-month, 1 million Class A and 10 million Class B requests; egress free through the S3 API, Workers API or r2.dev | developers.cloudflare.com/r2/pricing, read 2026-11-05 |

Prices and limits change; open the pages again on the day you decide. The deploy notes in [`../deploy/CLOUDFLARE-PAGES.md`](../deploy/CLOUDFLARE-PAGES.md) already identified file count as the limit to watch, and `tools/deploy/make-dist.mjs` hard-codes 20,000 files and 25 MiB (the build fails over it, by design, via [`../../tools/deploy/build_site.mjs`](../../tools/deploy/build_site.mjs)).

What the build ships today (counted, from the deploy note, 2026-11-04; main has moved since): 723 files, 59.76 MiB. Both builds copy `audio/` into the site. [`../../tools/build-static.mjs`](../../tools/build-static.mjs) (the GitHub Pages build) copies only `.mp3`, `.m4a` and `.ogg` there, so sidecars stay out. `make-dist.mjs`, which the Cloudflare build ([`../../tools/deploy/build_site.mjs`](../../tools/deploy/build_site.mjs)) uses, walks the whole `audio/` folder and its exclusion list covers only `.py`, `.md`, `.csv` and test files (read from the code, not run on a tree with clips), so by reading it the `.mp3.meta.json` sidecars would ship too: **two files per clip, and the sidecars' provenance fields (batch label, input hash, ingest date) would be served publicly**. Excluding `*.meta.json` in `make-dist.mjs` is a one-line change that is not made here; ask for it before any deploy that includes clips. They are not in the install precache; [`../../sw.js`](../../sw.js) caches `.mp3` at first request, and passes Range requests to the network (not tested in a real browser).

Fixed: `make-dist.mjs` now ships only `.mp3`, `.m4a` and `.ogg` under `audio/` and never ingest reports. A build on a tree with 87 clips went from 983 files (87 mp3 plus 87 sidecars) to 896; guarded by the test "make-dist ships clip mp3s but never *.meta.json sidecars or ingest reports" in `tests/deploy.test.js`.

| Shipped clips | Files, Cloudflare build as written (723 + 2N, sidecars included) | Files if sidecars are excluded (723 + N) | Against Cloudflare Free 20,000 | Site size (59.76 MiB + clips at a to c; sidecar bytes not measured) | Against GitHub Pages 1 GB |
|---|---:|---:|---|---|---|
| 4,503 (m/israeli) | 9,729 | 5,226 | fits | about 89 to 117 MiB | fits |
| 9,006 (m + f Israeli) | 18,735 | 9,729 | fits, close | about 118 to 173 MiB | fits |
| 24,906 (everything) | 50,535 | 25,629 | **over** either way | about 220 to 374 MiB | fits |

With sidecars shipped the Free limit is reached at about (20,000 - 723) / 2 = 9,638 clips; with them excluded, at about 19,277. So size in bytes is not the constraint on either host at the realistic target; the constraints are repo history (1.3) and, for the Cloudflare Free plan, the file count once both voices are shipped. A native-app wrapper that bundles the clips has the same byte counts; store size limits were not checked.

### 1.5 Three options

| | A. Keep in git up to a threshold | B. Separate private store pulled at build (private assets repo, or a private release artifact) | C. Object storage with a CDN |
|---|---|---|---|
| What it is | Clips committed under `audio/` as now | Clips live outside this repo; the build downloads them into `dist/audio/` and checks a list of SHA-256 values kept in this repo | Clips served from a bucket; the app points at that address |
| Setup | none | a build-script change, a read-only access token stored as a build secret, a checksum list (the sidecars hold the SHA-256 of the *input* files, not of the MP3s, so a new list is needed). None of this is built. | the same plus a bucket, a public address, and app and header changes |
| History growth in this repo | permanent, monotonic | none beyond the checksum list | none |
| If the rights turn out not to cover distribution | files stay in history (no rewrites) | delete the asset or repo | delete the objects |
| Build | nothing extra | build needs the token and the network; a failed download must fail the build (not built) | none for clips |
| Single origin, current security headers | unchanged | unchanged (files end up in `dist/`) | changes: the policy in [`../../_headers`](../../_headers) allows only same-origin and the privacy text says no third-party origin; a bucket address is another origin. Offline caching of cross-origin media needs checking. Not tested. |
| Pages file limit (20,000) | counts | still counts (files are in `dist/`) | does not count |
| Cost | none | none at these sizes (not checked: private-repo or release storage rules for large totals) | R2 list price puts 0.3 GB at $0 a month (inside the 10 GB free tier); operation counts at this scale are far inside the free tier (estimate) |
| Fit for a sold app | clips become part of the repo you may hand over | assets must be handed over separately; their provenance file travels with them | same, plus an account to transfer |

### 1.6 Recommendation and break-even

**Use B for every clip not already committed, and do not add further clips to the main repo until the rights in section 2 are answered.** Reasons, in order of weight: (1) irreversibility, because a clip with unknown redistribution rights committed here cannot be removed from history; (2) growth is monotonic and shared with every other lane; (3) B costs nothing in money and keeps the file layout the app already expects (`audio/<voice>/<tradition>/<kind>/<id>.mp3`).

Where A is acceptable, and the break-even, with the threshold stated as a judgement the owner may change: keep clips in git only if the rights are cleared **and** the cumulative bytes ever committed (every version of every clip) stay at or under **50 MiB**, about 7% of today's repo. At figure b that is about 7,000 clips; at figure c about 4,000. In practice:

- one voice (`m`/`israeli`, about 29 to 57 MiB) rendered once: under the threshold at figure a or b, over it at c, so A only if the real size is at the low end and no re-render is expected;
- two voices, or any full re-render, or any batch that might be replaced: over the threshold, so B;
- the human recordings, when they exist, follow the same sums with their own per-clip size (not known yet).

Move from B to C when either of these is true: the shipped clip count nears the Cloudflare Free file limit (about 9,600 clips as the build is written, about 19,000 if the sidecars are excluded; all 24,906 would need C or a paid plan); or several apps or hosts need the same clips. Below that, C adds a second origin and header changes for no saving.

Work B needs that nobody has done: the download step and its failure handling, the checksum list, a token held as a build secret, and a check that a clean build from an empty `audio/` still passes the precache and deploy checks. This sheet is docs only and changes no tool.

## 2. Provenance and licence of the outside synthetic voice

### 2.1 What the repo records now (counted)

- Every clip written by [`../../tools/audio/ingest.mjs`](../../tools/audio/ingest.mjs) carries `status: "synthetic-unreviewed"`, `source: "outside-synthetic"`, and `synth: { origin, reviewed: false, redistributionCleared: false, licence: "unknown: not cleared", batch, note, inputSha256, ingestedAt, ingestedBy }`, in the manifest and in the clip's sidecar. The batch label and note are kept neutral on purpose.
- Not known to the repo: who made the clips, with what, under what terms, whether the voice imitates a real person, whether there is a signed grant if it does, the model, the settings, the text that was submitted. The first batch report says the supplier calls it a "synthetic default voice" and that three machine recognizers from one model family passed it; that is not a rights statement. See [`INGEST-REPORT-83.md`](INGEST-REPORT-83.md) and [`INGEST-REPORT-88.md`](INGEST-REPORT-88.md).
- Older render paths mark their output `redistributionCleared: false` too, and the listening-test plan says redistribution rights of cloud voices are unconfirmed and to be settled by counsel ([`../voices/tts-evaluation-protocol.md`](../voices/tts-evaluation-protocol.md)).
- The legal notes list audio rights as unresolved: [`../legal/LICENCE-OPTIONS.md`](../legal/LICENCE-OPTIONS.md) (section 5), [`../legal/CONTENT-LICENCE-AUDIT.md`](../legal/CONTENT-LICENCE-AUDIT.md), [`../legal/SALE-READINESS.md`](../legal/SALE-READINESS.md), [`../legal/DECISIONS-FOR-JOHN.md`](../legal/DECISIONS-FOR-JOHN.md). For human voices the repo has a draft buyout sheet and a draft donor grant, both marked as needing a lawyer ([`../voices/buyout-contract-terms.md`](../voices/buyout-contract-terms.md), [`../voices/donor-rights-grant.md`](../voices/donor-rights-grant.md)).

Keep the provider's name, plan and terms in the owner's own records, not in this repo: repo text is kept free of tool and company names, and the `synth.licence` field should stay neutral.

### 2.2 Checklist: questions for the voice or tool provider (get every answer in writing, dated, with the version of the terms)

Who and what
- [ ] Who is the legal supplier of these files (company or person), and who generated them?
- [ ] Which service, model and version produced them, on which plan or tier, on what dates?
- [ ] Is the voice a stock voice, a licensed library voice, or a clone or imitation of a real person? If a real person: was consent given, in writing, and does it cover commercial use?
- [ ] Is the voice exclusive to us, or can others generate the same voice?

Use of the output
- [ ] May the output be used commercially (sold product, subscription, ads, free tier)?
- [ ] May it be copied and redistributed to end users inside an app (web, installed, store app) and in an audio or e-book companion to a printed book?
- [ ] May it be sub-licensed or passed on, including to the buyer if the app or the company is sold or merged?
- [ ] Is permission worldwide and perpetual, or limited by territory, term, or by being on a paid plan when the clip was made or when it is distributed? What happens to clips already generated if the plan lapses or the terms change?
- [ ] Are there restricted uses (education, children, religious text, advertising, political, impersonation) or a required content policy?

Ownership and encumbrances
- [ ] Who owns the output, and does the provider keep any rights, a licence back, or the right to reuse the clips or the text we sent?
- [ ] Are the outputs encumbered by anyone else's rights (training-data claims, performer rights, a model licence that restricts outputs, for example non-commercial)? Is there a warranty or indemnity?
- [ ] May the outputs be used to train or adjust another model, or to make a derived voice?
- [ ] Are the generated clips watermarked or fingerprinted, and may a conversion step (this repo re-encodes and strips tags) be applied?

Attribution and disclosure
- [ ] Is credit to the provider required, and in what form and place?
- [ ] Is a "synthetic voice" disclosure required by the provider's terms, and in what wording?

Records
- [ ] Can the provider supply a licence or invoice and a generation log (date, model, settings, text) that matches these files? Our sidecars store only the SHA-256 of what was delivered.
- [ ] Which clips does the answer cover (this batch only, or later batches too)?

### 2.3 Questions for a lawyer (not answered here)

- [ ] Does the provider's written answer, taken with its terms, allow sale of the app and the book, and a later sale of the business? What would you want changed?
- [ ] Which jurisdictions matter: the publisher's, the provider's, and the places the app is sold? Does a synthetic voice raise personality or voice-likeness issues in any of them?
- [ ] Are there rules that require labelling synthetic audio in the places we would sell, and what wording is needed, beyond the in-app label the repo already shows?
- [ ] What is the position on ownership of machine-generated audio, and what should the app's terms say?
- [ ] Is it a problem that clips with uncleared rights are already in the history of a private repo that cannot be rewritten? What should be done about the 87 already committed?
- [ ] What evidence should be kept for a buyer's due diligence?
- [ ] Is the draft donor grant and buyout sheet for human voices enough, or what should change?

## 3. What must be true before a clip can be called approved

"Approved" must mean two separate things, and both must hold for the same file:

1. **Quality: a native listener has listened to it.** The repo has no such review for any clip. The first report states the rule: a native Hebrew listener reviews each clip individually ([`INGEST-REPORT-83.md`](INGEST-REPORT-83.md)). The earlier test plan sets a bar for judging a provider: at least 3 listeners including 2 native Israeli speakers, and at least 90% of items scored correct on pronunciation and stress by every native listener ([`../voices/tts-evaluation-protocol.md`](../voices/tts-evaluation-protocol.md)). Letters, vowels and syllables stay human-recorded whatever the result. A machine pass (the supplier's recognizers, or the ingest tool's length, level and clipping checks) does not count.
2. **Rights: the section 2 answers are in hand, in writing, and a lawyer has looked at them.** Until then `redistributionCleared` stays false.

Plus, as a practical rule proposed here (the repo does not do it yet): record who listened, on what date, and the SHA-256 of the exact MP3 that was heard, so that a later re-render invalidates the approval.

### The repo's flow today (read from the code and tests; not run for this sheet)

- States: `missing` -> `synthetic-unreviewed` (written by `ingest.mjs`, never anything higher) -> `synthetic-reviewed` (a person, by hand; the label file says no tool does this: [`../../src/shell/audio-labels.js`](../../src/shell/audio-labels.js)). `recorded` is for a real human recording only. `ingest.mjs` and the render-update tool leave `recorded` and `synthetic-reviewed` entries alone.
- The manifest is generated from the sidecar: [`../../tools/audio/build_manifest.mjs`](../../tools/audio/build_manifest.mjs) reads `status` and `synth` from `<clip>.mp3.meta.json` and rebuilds `data/audio/manifest.json` from them. So the edit belongs in the sidecar, followed by a rebuild; a manifest-only edit would be overwritten.
- Steps for a person approving a clip, after both conditions above are met:
  1. Edit the sidecar: `status` to `synthetic-reviewed`, `synth.reviewed` to `true`, and `synth.redistributionCleared` to `true` only if the rights answers say so (a neutral `synth.licence` wording, no provider name). The sidecar has no reviewer, date or hash field today; adding them is a schema change that needs the same care as a tool change.
  2. `node tools/audio/build_manifest.mjs`, then `--check` (must say the files are current), then `node tools/audio/coverage.mjs --write`.
  3. The in-app label then reads "reviewed by a listener" instead of "unreviewed" (same label file). It says nothing about rights, so the label alone is not a clearance.
  4. `node tools/meta/scan.mjs` and `--text`, the unit tests, then a small commit.
- **A test will fail on purpose, and that is a decision, not a bug to route around.** [`../../tests/audio.manifest.test.js`](../../tests/audio.manifest.test.js) asserts that every non-missing entry is `synthetic-unreviewed` with `synth.reviewed` false, and its status whitelist omits `synthetic-reviewed`; the coverage test counts only `synthetic-unreviewed`. Whoever approves the first clip must update those tests deliberately, keeping the guarantees that no entry is `recorded` without a human recording and adding: `synthetic-reviewed` only with `reviewed` true, a reviewer record, and a matching file hash. Do not loosen them to a bare status list.
- What is not enforced anywhere: no build step refuses to ship a clip with `redistributionCleared: false`. Before any public publishing is ever turned on, add a check that the shipped clip set contains only cleared clips. Publishing is off and is not touched by this sheet.
- The clip held back in the first batch (`hf1da5ea6`) stays out until a person has listened to it ([`INGEST-REPORT-88.md`](INGEST-REPORT-88.md)).

### Wording until then

Call these "synthetic, unreviewed, rights not cleared". Do not call them approved, recorded, teacher audio, a man's voice, an Israeli accent, or ready to teach with. The in-app label already says "not a recorded teacher" and "unreviewed".

## Related files

[`INGEST-CLIPS.md`](INGEST-CLIPS.md), [`INGEST-REPORT-83.md`](INGEST-REPORT-83.md), [`INGEST-REPORT-88.md`](INGEST-REPORT-88.md), [`NO-AUDIO.md`](NO-AUDIO.md), [`../deploy/CLOUDFLARE-PAGES.md`](../deploy/CLOUDFLARE-PAGES.md), [`../deploy/GO-LIVE-CHECKLIST.md`](../deploy/GO-LIVE-CHECKLIST.md), [`../DEPLOY.md`](../DEPLOY.md), [`../voices/coverage.md`](../voices/coverage.md), [`../DECISIONS-NEEDED.md`](../DECISIONS-NEEDED.md), [`../review/WHO-CAN-HELP.md`](../review/WHO-CAN-HELP.md).
