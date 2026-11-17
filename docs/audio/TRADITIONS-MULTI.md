# Letters, Vowels and Syllables: Three Listeners (17 Nov 2026, Kaggle GPU, version 4)

Every letter, vowel and syllable clip in the three traditions, heard on a Kaggle GPU by three listeners: the Whisper sound
model (renikud/whisper-he-ipa) and two phoneme models with no words at all (facebook/wav2vec2-lv-60-espeak-cv-ft and
facebook/wav2vec2-xlsr-53-espeak-cv-ft, three hearings each). A clip is right when two of the three hear the card's own sound
(`tools/audio/asr-check/listeners.py`, `scan_multi.py`, notebook `kaggle_multi.ipynb`).

| tradition | kind | clips | right | right % |
|---|---|---|---|---|
| ashkenazi | letter | 99 | 99 | 100% |
| ashkenazi | syllable | 202 | 202 | 100% |
| ashkenazi | vowel | 25 | 25 | 100% |
| israeli | letter | 114 | 114 | 100% |
| israeli | syllable | 236 | 236 | 100% |
| israeli | vowel | 30 | 30 | 100% |
| sephardi | letter | 114 | 114 | 100% |
| sephardi | syllable | 205 | 205 | 100% |
| sephardi | vowel | 30 | 30 | 100% |
| **all** | | **1,055** | **1,055** | **100%** |

The same day: 81.3% in the morning (one listener), 88.8% by three listeners before the exact-sound fixes, 99.3% before the last 7.

How the hard ones were made right: the card's reading given to the voice as exact sounds (IPA, e.g. Ashkenazi Vet [vejs]) through Google's Chirp HD voices (de-DE setting, the one that takes IPA), so the voice cannot read ב as b or a known word; Sephardi and Ashkenazi cards with the Israeli reading copy the fixed Israeli clip.

What this does not show: no person has listened. The phoneme models cannot hear the Hebrew r or tell ts from s, so on those points the Whisper model decides (rules in `listeners.py`). Cards re-recorded by the exact-sound route are in the Chirp HD voices (Charon, Kore), not the WaveNet voices of the other cards, so the voice sounds a little different between cards.
