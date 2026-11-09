# Brief: apply the plain-language edits on Aleph

**Style:** write plain, easy-to-follow English. Short sentences. Common words. One idea per sentence. Literal button labels. Do not add warmth, personality, or contractions for their own sake. Still remove AI tells and still rewrite close-paraphrase synagogue stories.



You are editing the Aleph Hebrew-learning app so learner-facing English is plain and easy to follow: short sentences, common words, one idea per sentence, literal button labels. Remove AI tells. Rewrite close-paraphrase synagogue passages. Do not add warmth, personality, or contractions for their own sake. This brief is self-contained. The detailed findings are in `NOTES.md` in the same folder (`docs/plain-language-review/`). Large inventory CSVs were removed from the PR; do not add them back.

Do the work. Open a pull request when the tests pass. Do not push to `main` or to anyone else's branch.

## 1. Branch

- Base on **`main`**, specifically `e074ceae005a372cc20674ab7004db727707c1d5` if that is still the tip, otherwise the current `origin/main`.
- That is the production line (default branch; the review site deploys from `main`).
- Do **not** start from, commit to, or push to:
  - `john/israeli-production-2026-11-05`
  - `john/fun-lessons-start-2026-11-06`
  - any `chatgpt/*`, `cursor/*`, or other bot working branch
  - the dirty worktrees at `/workspace/Al-Heb` and `/workspace/Al-Heb-fun`
- Work on **`john/easy-to-follow-voice-2026-11-09`**. Do not push to the deleted branch `john/human-voice-2026-11-09`.

## 2. What to change, and what to leave alone

Change **English learner-facing copy only**:

- UI chrome: `index.html`, `offline.html`, `manifest.webmanifest`, `src/shell/*` views, i18n, nav labels, error/empty/offline states, Awards and certificate face text, game titles and hooks, button labels and aria-labels that are visible or announced.
- Write-ups: `data/library/articles.json`, `data/synagogues/canada.json` stories and summaries, first-day on-ramp English, lesson goals/titles only where the English voice is the problem, book shelf blurbs if they show the same tells.
- Public product naming: use **Aleph** (not ALEF) in learner-facing UI. The git repository may still be called Al-Heb.

Do **not**:

- Change Hebrew text, niqqud, transliterations, IPA, or sound facts.
- Change teaching content meaning (which letter, which verse, which date, which blessing, which congregation fact).
- Change JSON keys, route ids, game ids, file names, or store keys just to make copy prettier.
- Soften or remove honesty lines (draft status, synthetic voice, "not a degree", "activity not mastery" said *once*, clergy/teacher review warnings).
- Add personality that invents facts, jokes that punch down, or claims the app cannot support.
- Mention CAIA, CQF, CU Boulder, conferral dates, or Brown University anywhere public.
- Put a personal bio on About beyond "Made by John Khan." Location, if it appears, is Toronto, Ontario.
- Rewrite public-domain JPS 1917, liturgy in English, or dictionary glosses unless a gloss is accidentally written as an AI stock sentence rather than a definition.
- "Fix" false friends listed in NOTES.md section E (literal *journey* as travel, *unlock* as a game level, *harness* as a noun, "how it is said", "What would you like?" in a café dialogue, CSS `landscape`).
- Commit in the review worktree at `/workspace/aleph-human-review/repo` if it is still detached; do your work in a fresh branch of a clean clone or worktree.

## 3. Voice

Follow [blader/humanizer](https://github.com/blader/humanizer) v3.1 (Wikipedia "Signs of AI writing"). In short:

- State the point. Do not write "it's not X, it's Y" unless you are actually correcting a belief the reader holds.
- Cut staged openers ("Here's a detail that surprises people", "The story begins with", "A new chapter opened").
- Cut one-line closers that only restate the paragraph. If the same closer is pasted under several sections, say it once.
- Prefer periods, commas, colons, or parentheses over em dashes.
- Prefer sentence case for ordinary headings. Game titles can stay short proper names, not "The Hebrew Root Tree Cultivator".
- Use contractions where they fit. Vary sentence length. Be specific: names, dates, numbers.
- Canadian spelling is acceptable and already in use (centre, licences, travellers, practise as a verb). Be consistent; do not mix "license" and "licence" on the same page without a reason (verb vs noun is a reason in Canadian English).
- Keep every supported fact. If you need a detail you do not have, write a simpler sentence or leave the fact as cited. Do not invent.

Suggested wording for each flagged string is in NOTES.md. You may improve those rewrites, but do not change their meaning.

## 4. Work plan (do it in this order)

### 4.1 Synagogue stories (highest priority)

Rewrite English `summary` and `story` paragraphs in `data/synagogues/canada.json` so they keep the facts and citations but do not follow the source sentence-for-sentence.

Must-fix entries (close paraphrase of cited pages): `temple-bnai-tikvah-calgary`, `anshe-sholom-hamilton`, `har-tikvah-brampton`, `temple-israel-ottawa`, plus `solel-mississauga`, `iyr-ha-melech-kingston`, `shaarei-beth-el-oakville`. Then the rest of the 27 for brochure language ("in the heart of", "standard-bearer", "recognised as", "served as" where "was" will do).

Keep every `sources` URL. After rewriting, spot-check that names, years, street addresses, and family counts are still correct.

### 4.2 Library articles

Edit `data/library/articles.json` using the sentence-level list in NOTES.md A9.

Heading policy: the current gate in `tools/content/check-articles.mjs` **requires Title Case**. Humanizer treats Title Case headings as an AI tell. Preferred path: change the gate to sentence case, update `tests/library.test.js` (and any snapshot or title-case assertions), and convert article titles and section headings to sentence case, with plainer heading wording where the current heading is written for effect. If you do not want to touch the gate in this PR, leave titles in Title Case and only fix the sentences.

Re-run `node tools/content/check-articles.mjs` and, if the environment can reach the network, `node tools/content/check-sources.mjs`.

### 4.3 Games titles

Shorten the over-titled names in `src/games/games.view.js` and any visible heading that duplicates them. Do not rename route ids. Update tests that assert on the old visible title. See NOTES.md A11.

### 4.4 Chrome consistency

- `index.html` noscript, `offline.html`: Aleph, not ALEF; slightly warmer offline sentence (NOTES A1–A2).
- About copyright dash; Terms dashes; Help dashes if easy.
- `nav.vocab`: `Dictionary (5,000 words)`.
- Awards gallery: the line "They are activity, not mastery. Locked and earned are written in words, not by colour alone." should appear once, not under every group.
- Certificate sample line: drop the em dash.
- First-day `done.tomorrow` closer; consistent sentence case on on-ramp step titles.
- README product name only if you can do it without breaking badges or links.

### 4.5 Optional

Light variation in `data/letters/memory-chain.json` English stories (keep hook word, example word, and tradition transliterations). Skim remaining `src/**/*.view.js` and `data/onboarding/plans.json`, `data/books/index.json`, `data/israel`, `data/festivals` for leftover tells.

## 5. Tests and PR

From the repo root:

```sh
npm test
node tools/content/check-articles.mjs
node tools/meta/scan.mjs --text
```

If those are slow, at least run the tests that will break if copy changes:

- `tests/library.test.js`
- `tests/honesty.wording.test.js`
- `tests/trust-copy.test.js`
- `tests/meta.text.test.js`
- `tests/credits.test.js`
- `tests/legal.test.js`
- `tests/sources.test.js`
- `tests/site.quality.test.js`
- `tests/games.routes.test.js` and any game test that asserts on a title you changed
- `tests/shell.rimon-speech.test.js` only if you touch Rimon (prefer not to)
- `tests/pwa.manifest.test.js` if you touch the manifest
- `tests/offline.test.js` if you touch offline copy

Update assertions that expect the old English. Do not weaken a test to sneak a worse sentence through.

Open a PR:

- Base: `main`
- Head: `john/easy-to-follow-voice-2026-11-09`
- Title: `Use plain, easy-to-follow English in app copy`
- Body should point at NOTES.md (you may copy the counts and the five plagiarism URLs into the PR), list files changed, and state that Hebrew and teaching facts were left alone.
- Do not mention CAIA, CQF, or school credentials in the PR body either.

## 6. Definition of done

- Synagogue stories no longer share distinctive phrasing with the cited pages (same facts, different sentences).
- Library leftover tells in NOTES A9 are gone (or the heading policy is documented in the PR if titles stay Title Case).
- ALEF does not appear in learner-facing HTML (`index.html`, `offline.html`, in-app chrome). Manifest and UI use Aleph.
- No new stock AI words, no new "not just X but Y", no new em-dash habit, no new game title in the "The Hebrew … Laboratory" pattern.
- Tests above pass.
- No unrelated refactors, no generated audio or image changes.

If something in NOTES.md disagrees with a passing test that encodes a product rule (for example a required honesty sentence), keep the honesty and adjust the wording only.
