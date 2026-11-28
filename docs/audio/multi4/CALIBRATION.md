# Calibrating the sound checks (27 Nov 2026)

All four sound checks were run on 150 human Hebrew recordings with expert IPA (ILSpeech, 1,551 words; `tools/audio/asr-check/calib.py`).

| Sound check | Correct human words it wrongly fails |
|---|---|
| renikud (Hebrew-trained) | 0.8% |
| lv60 (English-trained) | 35% |
| xlsr53 (English-trained) | 32% |
| ipa1000 (multilingual) | 50% |

Under the old rule (all four, or three of four) correct human speech only reaches about 65%, so that rule cannot reach 99%.

**Measure from here on:** a word counts as heard right when the Hebrew-trained check hears at least 3/4 of its sounds (`accuracy_he.py`).
Caveat: renikud was partly trained on ILSpeech, so its 0.8% is flattering; its power to catch real mistakes is not yet tested.

**Clips in use (with the Chirp haftarah lines):** 3,748 / 4,006 = 93.56% (Hebrew 93.60%, Aramaic 93.38%). Old rule: 87.19%.
Before the Chirp haftarah lines: 95.71%. The flagged words are in `tools/audio/asr-check/round11-flagged.json` (62 clips, 258 words).

Also tested: slowing a take after recording does not change its scores (raw vs paced haftarah takes score the same).
