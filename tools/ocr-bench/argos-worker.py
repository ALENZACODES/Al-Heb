#!/usr/bin/env python3
"""Line-oriented he->en worker for tools/ocr-server.mjs. stdin: one JSON {"id":..,"text":..} per line; stdout: {"id":..,"text":..} or {"id":..,"error":..}.
Needs `pip install argostranslate` and the he->en package (see docs/TOOLING.md)."""
import sys, json
import argostranslate.translate as T
print(json.dumps({'ready': True}), flush=True)
for line in sys.stdin:
    try:
        req = json.loads(line)
        print(json.dumps({'id': req.get('id'), 'text': T.translate(req['text'], 'he', 'en')}, ensure_ascii=False), flush=True)
    except Exception as e:  # keep the worker alive
        print(json.dumps({'id': (req or {}).get('id') if 'req' in dir() else None, 'error': str(e)}), flush=True)
