# Chirp voice pilot (28 Nov 2026)

160 sample clips (words, dictionary, lines, syllables, letters), each in four Chirp 3 HD voices per gender, raw takes.
Accuracy: share of words the Hebrew-trained sound check hears (>= 3/4 of the sounds). Sound: UTMOS predicted listener score (1-5).

| Voice | Words heard right | Clips with every word right | Predicted listener score |
|---|---|---|---|
| Charon (m) | 80.0% | 68.8% | 3.65 |
| Orus (m) | 78.2% | 61.3% | 3.70 |
| Fenrir (m) | 77.6% | 61.3% | 3.68 |
| Puck (m) | 78.2% | 63.7% | 3.66 |
| Leda (f) | 79.9% | 68.8% | 3.76 |
| Kore (f) | 78.0% | 63.7% | 3.65 |
| Aoede (f) | 78.0% | 63.7% | 3.74 |
| Zephyr (f) | 76.1% | 62.5% | 3.76 |

## Baseline: the same 160 clips as they are now (WaveNet)

| Voice | Words heard right | Single words | Dictionary | Lines | Clips with every word right | Predicted listener score |
|---|---|---|---|---|---|---|
| WaveNet-B (m, in use) | 97.6% | 97% | 100% | 98% | 76/80 | 3.52 |
| Charon (m, best Chirp) | 80.0% | 76% | 73% | 85% | 55/80 | 3.65 |
| WaveNet-A (f, in use) | 96.2% | 100% | 97% | 95% | 76/80 | 3.69 |
| Leda (f, best Chirp) | 79.9% | 76% | 73% | 85% | 55/80 | 3.76 |

Even taking the best of four Chirp voices per clip, 63 of 80 clips per gender come out fully right, against 76 of 80 for WaveNet.
The check is not harsher on one-word clips: WaveNet single words score 97-100% on it.
Chirp sounds slightly more natural by the predicted score (about +0.1) and is far less accurate (about -17 points).
The full Chirp re-record (17,843 clips) was not started.
