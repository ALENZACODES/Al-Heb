# Ask the Torah

A question page and a small service for Aleph. Someone types a question such as “Is the Shema in the Torah?” or “What is a rabbi?”. The answer says whether the topic is in the written Torah, quotes the verses (Hebrew and English) with exact references, gives a short explanation, and links to the Aleph Torah reader or to Sefaria.

The page only answers questions about the Torah, the Tanakh and Jewish texts.

## Run locally

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
# from this directory, with the repo's data/corpus/torah present
python server.py
```

Open http://127.0.0.1:8787/demo or, in the Aleph app, set `window.ALEF_ASK_TORAH_URL = 'http://127.0.0.1:8787'` and visit `#/ask`.

An optional Gradio demo is `python gradio_app.py` if Gradio is installed. It is not required.

## Evaluation

```bash
python eval/generate_questions.py
python eval/run_eval.py --split tune --failures /tmp/ask-tune-fail.json
python eval/run_eval.py --split test --out /tmp/ask-test.json
```

Questions are in `eval/questions-10k.jsonl` (kept out of the app precache). Gold references are recorded when each question is created from a real verse or a curated later source.
