# Letters, Vowels and Syllables in All Three Traditions: Full Check (17 Nov 2026, after fix run 4)

All 1,055 clips heard on a Kaggle GPU by the sound model (renikud/whisper-he-ipa), five hearings each among different neighbours, against each card's own sound, with the stricter rule (no more than one extra sound). A machine check; no person has listened.

| tradition | kind | clips | right | wrong | right % |
|---|---|---|---|---|---|
| ashkenazi | letter | 99 | 93 | 6 | 93.9% |
| ashkenazi | syllable | 202 | 197 | 5 | 97.5% |
| ashkenazi | vowel | 25 | 24 | 1 | 96.0% |
| israeli | letter | 114 | 112 | 2 | 98.2% |
| israeli | syllable | 236 | 226 | 10 | 95.8% |
| israeli | vowel | 30 | 29 | 1 | 96.7% |
| sephardi | letter | 114 | 110 | 4 | 96.5% |
| sephardi | syllable | 205 | 198 | 7 | 96.6% |
| sephardi | vowel | 30 | 30 | 0 | 100.0% |
| **all** | | **1,055** | **1,019** | **36** | **96.6%** |

The morning check (before the fixes) was 858 of 1,055 (81.3%). The 36 still flagged are in `traditions-wrong.txt`; fix run 6 works on them. The CPU check used between runs heard some of them differently (it passed several the GPU fails and the other way round): the two hearings disagree on short sounds, so this table, the fuller of the two, is the one to go by.
