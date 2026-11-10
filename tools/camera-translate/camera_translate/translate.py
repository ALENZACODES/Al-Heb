"""Hebrew -> English translators. Each takes a list of Hebrew lines and returns [{en, source, translit, pointed}].

  GoogleTranslator    Cloud Translation (Basic, v2 client), source he, target en. Needs credentials; sends text to Google.
  GlossaryTranslator  the offline sign word list; returns nothing unless every word on the line is known.
  ChainTranslator     tries each in order, line by line.
"""
from __future__ import annotations

import html

from .hebrew import Glossary, strip_marks


class TranslateError(RuntimeError):
    pass


def _empty():
    return {'en': None, 'source': None, 'translit': None, 'pointed': None}


class GlossaryTranslator:
    name = 'built-in sign word list'
    source = 'word-list'
    sends_text_off_server = False

    def __init__(self, glossary: Glossary | None = None):
        self.glossary = glossary or Glossary.load()

    def translate(self, lines: list[str]) -> list[dict]:
        out = []
        for line in lines:
            r = self.glossary.translate(line)
            source = None if not r['en'] else ('word-list-near' if r['status'] == 'near' else self.source)
            out.append({'en': r['en'], 'source': source, 'translit': r['translit'], 'pointed': r['pointed']})
        return out


class GoogleTranslator:
    name = 'Google Cloud Translation (he to en)'
    source = 'machine'
    sends_text_off_server = True

    def __init__(self, client=None):
        self._client = client

    def _get(self):
        if self._client is None:
            from google.cloud import translate_v2
            self._client = translate_v2.Client()
        return self._client

    def translate(self, lines: list[str]) -> list[dict]:
        wanted = [(i, strip_marks(t).strip()) for i, t in enumerate(lines) if strip_marks(t).strip()]
        out = [_empty() for _ in lines]
        if not wanted:
            return out
        try:
            res = self._get().translate([t for _, t in wanted], source_language='he', target_language='en', format_='text')
        except Exception as exc:
            raise TranslateError(f'cloud translation failed: {type(exc).__name__}') from exc
        if isinstance(res, dict):
            res = [res]
        for (i, _), r in zip(wanted, res):
            en = html.unescape(str(r.get('translatedText') or '')).strip()
            if en:
                out[i] = {'en': en, 'source': self.source, 'translit': None, 'pointed': None}
        return out


class ChainTranslator:
    """First translator that answers a line wins; a failing cloud translator falls through to the next one."""

    def __init__(self, translators: list):
        self.translators = translators
        self.name = ' then '.join(t.name for t in translators)
        self.errors: list[str] = []

    def translate(self, lines: list[str]) -> list[dict]:
        out = [_empty() for _ in lines]
        self.errors = []
        for t in self.translators:
            todo = [i for i, r in enumerate(out) if not r['en']]
            if not todo:
                break
            try:
                got = t.translate([lines[i] for i in todo])
            except TranslateError as exc:
                self.errors.append(str(exc))
                continue
            for i, r in zip(todo, got):
                if r.get('en'):
                    out[i] = r
        return out
