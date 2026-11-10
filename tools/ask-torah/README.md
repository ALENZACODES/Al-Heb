# Ask the Torah

A question page and a small service for Aleph. Someone types a question such as “Is the Shema in the Torah?” or “What is a rabbi?”. The answer says whether the topic is in the written Torah, quotes the verses (Hebrew and English) with exact references, gives a short explanation, and links to the Aleph Torah reader or to Sefaria.

The page only answers questions about the Torah, the Tanakh and Jewish texts.

## In the app: static answers, no server

The app does not call this service. `python build_static.py` runs the same vetted, no-model pipeline once, offline, over every bank question and writes `data/ask/` (a question bank, 32 answer files and the topic list). The page `#/ask` loads those files only when it opens and finds the answer in the browser with `src/ask/match.js`; when nothing matches well it says it has no vetted answer yet. Rebuild `data/ask/` after changing the pipeline, then run `node eval/eval_static_match.mjs` from this directory's parent repo root (`node tools/ask-torah/eval/eval_static_match.mjs`). See `docs/review/ASK-TORAH-STATIC-2026-11-10.md`.

The server below, the Gradio demo and `render.yaml` are for offline testing only and are not on the learner's path.

## Run the service locally (testing only)

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
# from this directory, with the repo's data/corpus/torah present
python server.py
```

Open http://127.0.0.1:8787/demo.

An optional Gradio demo is `python gradio_app.py` if Gradio is installed. It is not required.

## Evaluation

```bash
python eval/generate_questions.py
python eval/run_eval.py --split tune --failures /tmp/ask-tune-fail.json
python eval/run_eval.py --split test --out /tmp/ask-test.json
```

Questions are in `eval/questions-10k.jsonl` (kept out of the app precache). Gold references are recorded when each question is created from a real verse or a curated later source.
