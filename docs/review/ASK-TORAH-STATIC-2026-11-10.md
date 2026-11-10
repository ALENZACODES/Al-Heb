# Ask the Torah: Static Answers and Placement (2026-11-10)

Owner's decision (Nov 10, 3:56 AM): Aleph stays a static site with no server on the learner's path. This note records how Ask the Torah now works without one, how well the browser matching does, where the page lives in the app, and what is still open.

## How it works now

- `tools/ask-torah/build_static.py` runs the vetted answer pipeline (the same no-model path the 10,000-question backtest and the independent review scored) once, offline, on every bank question. It writes:
  - `data/ask/bank.json`: 10,005 questions, each pointing at one answer (681 KB, about 186 KB compressed).
  - `data/ask/answers/00.json` to `31.json`: 6,017 distinct answers (about 13 MB, about 2.6 MB compressed). A question loads one of these files.
  - `data/ask/topics.json`: the pipeline's 133 topics (concepts and later-tradition items) with their vetted answers, plus its typo and phrase rewrites.
- All of `data/ask/` and `src/ask/` load only when `#/ask` opens; none of it is in the first install.
- `src/ask/match.js` finds the answer in the browser: a named verse matches only that verse; an exact bank question is used as is; a recognised topic (after the same typo rewrites the pipeline uses) gets its topic answer; otherwise a keyword match over the bank, accepted only when it covers at least 60 percent of the question's weight. A short follow-up ("what about their kids then") is read with the learner's previous questions, but only when it reads like a follow-up. Otherwise the page says: "I don't have a vetted Torah answer for that yet." It never makes up a verse.
- A named verse with no note in the bank is shown as the verse itself (Hebrew and English from `data/corpus/torah/`), labelled as such.
- When the learner's words differ from the bank question that was answered, the answer says which question it is answering.
- No call to any server remains in the page. The FastAPI server, the demo app and `render.yaml` stay in `tools/ask-torah/` for offline testing only.

## Matching quality (measured, `node tools/ask-torah/eval/eval_static_match.mjs`)

| Set | Answered | Right when answered | Wrong | No answer |
|---|---|---|---|---|
| 1,500 bank questions, each removed from the bank and asked again | 1,387 of 1,500 (92.5%, incl. 200 shown as the verse itself) | 98.1% of the 1,187 matched to a bank answer | 23 | 113 |
| 150 free-form questions (typos, slang, follow-ups, off-topic), not in the bank | 141 of 150 | 99.3% | 1 | 9 |

"Right" means the matched answer has the same verdict as the vetted pipeline's own answer to that question and cites at least one of the same verses. Most of the 23 bank misses are partial quotes matched to a different verse with similar wording; the one free-form miss ("did pharaohs heart get hardened") cites a different verse about the same hardening. The 9 with no answer include the off-topic ones (weather, a programming question, a challah recipe), where saying "no answer" is the honest result.

## The Name

The build stops if any answer, question or topic contains the four letters of the Name, with or without vowel marks. This caught one real case: the bank question about the Hebrew word אליהוה (Exodus 9:33) echoed the Name, because the pipeline's display rule only handled the usual prefixes. Every learner-facing string now passes the pipeline's own rule and then a strict filter that writes ה׳; the page applies the same filter again to anything it shows, including verses drawn from the corpus. The Name is never voiced: the page has no audio.

## Earlier review (reported by the previous handoff, not re-run here)

The handoff reports a blind independent judge pass after its last fixes: 150 new free-form questions 150/150 and 300 sampled from the 10k 300/300, with no invented citations and no spelled Name; the first free-form pass was 128/150. The judge's result files were kept outside the repository and were not available for this note.

## Placement

| Question | Decision |
|---|---|
| Where it lives | **Inside reading, not as a separate chat.** (1) Every verse in the Torah reader has an "Ask" button that opens `#/ask` already asking "What does Genesis 4:2 say?". (2) The Read page has an "Ask the Torah" entry right under "Open the Torah reader". (3) The More menu lists it under Read. (4) Home lists it among the quick tiles once a learner is past the beginner Home; the beginner Home keeps its five destinations. No floating button: Rimon already floats, and a chat bubble in the corner would make Aleph feel like a help desk. |
| English copy | Title "Ask the Torah". Read-page line: "Ask about a person, a law, a festival or a verse. Each answer quotes the verses and links to them in the reader." Empty state heading "Try one of these". |
| Hebrew copy | שְׁאֵלוֹת עַל הַתּוֹרָה ("questions about the Torah"), chosen because it has no gender, unlike the imperative "ask". Tab label without vowel marks, like the other labels: שאלות על התורה. Needs a native check. |
| Icon | A small round gold seal on deep green with the open-book line drawn in gold, the same book used for Learn: the medallion style planned for the icon set. |
| Empty state | Six starter questions, each with a checked answer: Is the Shema in the Torah? · Where does the Torah talk about Shabbat? · Is Hanukkah in the Torah? · Where is the Priestly Blessing? · What does the Torah say about kosher food? · Who was Miriam? Under them: "Every answer here was checked before it was added. If a question has no checked answer yet, this page says so instead of guessing." |
| Links from the reader | Each verse row: an "Ask" button (44 px tall, labelled "Ask the Torah about Genesis 4:2" for screen readers). Every answer links each verse back to the reader. |
| Rimon | **No.** Like the opening prayer, this is a quiet place for the text itself, and a cartoon beside answers about the Torah would make them feel less serious. Rimon stays on the learning screens. |

## Still open

- A native Hebrew check of שְׁאֵלוֹת עַל הַתּוֹרָה.
- The owner decides when `#/ask` leaves preview.
- The camera translator and the live translator in the same owner's message belong to their own lanes.
