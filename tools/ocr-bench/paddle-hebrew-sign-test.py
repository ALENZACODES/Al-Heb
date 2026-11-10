#!/usr/bin/env python3
"""Experiment (dev tooling): RivoksLab paddleocr-hebrew WORD recognizers (ONNX, Apache-2.0) on the SYNTHETIC *sign* images only.
No detector is used: the whole image is fed as one word-level crop (so this is NOT an end-to-end engine and cannot read pages).
Models are downloaded from huggingface.co/Rivok/paddleocr-hebrew into the dir given as argv[1] (default /tmp/pph).
Usage: python3 tools/ocr-bench/paddle-hebrew-sign-test.py [/tmp/pph]
"""
import json, re, sys, time
from pathlib import Path
import numpy as np, cv2, onnxruntime as ort
ROOT = Path(__file__).resolve().parents[2]
M = Path(next((a for a in sys.argv[1:] if not a.startswith('--')), '/tmp/pph'))
BENCH = ROOT / 'data/photo/_benchmark'
charset = ['blank'] + [l.rstrip('\n') for l in open(M / 'charset_v2f.txt', encoding='utf8')] + [' ']
FIN = str.maketrans('ךםןףץ', 'כמנפצ')
def skel(s): return re.sub('[^א-ת]', '', re.sub('[֑-ׇ]', '', s)).translate(FIN)
def lev(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1): cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]
def tight_crop(im):
    # crude stand-in for a detector: bbox of pixels that differ from the border colour (NOT a real detector; see docstring)
    bg = np.median(np.concatenate([im[:3].reshape(-1, 3), im[-3:].reshape(-1, 3), im[:, :3].reshape(-1, 3), im[:, -3:].reshape(-1, 3)]), axis=0)
    d = np.abs(im.astype(np.int16) - bg).sum(-1)
    m = d > max(60, d.max() * 0.35)
    ys, xs = np.where(m)
    if len(xs) < 10: return im
    pad = 6
    return im[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
CROP = '--crop' in sys.argv
def prep(path, H=48, maxW=480):
    im = cv2.imread(str(path))
    if CROP: im = tight_crop(im)
    h, w = im.shape[:2]
    nw = min(maxW, max(16, int(round(w * H / h))))
    im = cv2.resize(im, (nw, H)).astype(np.float32).transpose(2, 0, 1) / 255.0
    im = (im - 0.5) / 0.5
    return im[None]
def decode(logits):
    idx = logits.argmax(-1)[0]; out = []; last = 0
    for i in idx:
        if i != last and i != 0: out.append(charset[i])
        last = i
    return ''.join(out)
items = [i for i in json.load(open(BENCH / 'ground-truth.json'))['items'] if i['kind'] == 'sign']
for name in ('mobile-word', 'server-v5'):
    sess = ort.InferenceSession(str(M / name / 'rec.onnx'), providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0].name
    edits = chars = 0; ms = []; ex = 0; samples = []
    for it in items:
        t0 = time.time(); out = sess.run(None, {inp: prep(BENCH / it['file'])})[0]; ms.append((time.time() - t0) * 1000)
        hyp = decode(out); ref = skel(' '.join(it['lines']))
        # model emits logical order; compare consonants only
        e = lev(ref, skel(hyp)); edits += e; chars += len(ref); ex += e == 0
        if len(samples) < 6: samples.append((it['id'], ref, skel(hyp), hyp))
    print(json.dumps({'model': name, 'tightCrop': CROP, 'n': len(items), 'charAccuracyPct': round(100 * max(0, 1 - edits / chars), 1), 'exactPct': round(100 * ex / len(items), 1), 'msMedian': round(float(np.median(ms))), 'msP95': round(float(np.percentile(ms, 95)))}))
    for s in samples: print('  ', s)
