#!/usr/bin/env python3
"""Decode QR SVGs back to text and compare with the expected URLs (OpenCV QRCodeDetector; pip install opencv-python-headless, Apache-2.0).
  verify_qr.py QR_DIR URLS.json    URLS.json = {key: url}. Prints JSON {checked, ok, failed:[...]}; exit 1 if any fail.
Rasterises each SVG with rsvg-convert at integer scales (first scale that decodes wins) with an added white border."""
import sys, json, subprocess, os, tempfile
import cv2, numpy as np
d, urls = sys.argv[1], json.load(open(sys.argv[2]))
dets = [cv2.QRCodeDetector()] + ([cv2.QRCodeDetectorAruco()] if hasattr(cv2, 'QRCodeDetectorAruco') else [])  # the classic detector misses a few valid codes; the Aruco-based one is the fallback
res = {'checked': 0, 'ok': 0, 'failed': []}
for key, url in urls.items():
    svg = os.path.join(d, key + '.svg')
    if not os.path.exists(svg): res['failed'].append([key, 'missing']); continue
    import re
    vb = int(re.search(r'viewBox="0 0 (\d+) ', open(svg).read()).group(1))
    text = ''
    for k in (3, 5, 2, 4, 6, 7, 8, 9, 10, 12):  # integer pixels-per-unit scales: OpenCV's detector is flaky on fractional module sizes
        png = subprocess.run(['rsvg-convert', '-w', str(vb * k), '-b', 'white', svg], capture_output=True, check=True).stdout
        img = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_GRAYSCALE)
        img = cv2.copyMakeBorder(img, 8 * k, 8 * k, 8 * k, 8 * k, cv2.BORDER_CONSTANT, value=255)
        text = next((t for t in (d_.detectAndDecode(img)[0] for d_ in dets) if t), '')
        if text: break
    res['checked'] += 1
    if text == url: res['ok'] += 1
    else: res['failed'].append([key, text])
print(json.dumps(res)); sys.exit(1 if res['failed'] else 0)
