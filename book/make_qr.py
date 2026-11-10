#!/usr/bin/env python3
"""Generate QR codes as inline SVG with segno (pip install segno; BSD-3).
Usage: make_qr.py OUT_DIR < urls.json     (urls.json = {"alef": "https://...", ...})
Writes OUT_DIR/<key>.svg and prints {key: svg-string-without-xml-prolog} as JSON on stdout.
Error correction M, quiet zone 2 modules (book keeps extra white margin around), pure black on white for scanner reliability."""
import json, sys, os
import segno

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
urls = json.load(sys.stdin)
res = {}
for k, url in urls.items():
    qr = segno.make(url, error='m', micro=False)
    path = os.path.join(out, f'{k}.svg')
    qr.save(path, kind='svg', scale=4, border=2, dark='#000000', light='#ffffff', xmldecl=False, svgns=True, nl=False, omitsize=True)
    svg = open(path, encoding='utf8').read()
    res[k] = svg
json.dump(res, sys.stdout)
