# Letters, Vowels and Syllables in All Three Traditions (17 Nov 2026)

Each clip was checked against the reading the app shows for its own tradition (`src/pronunciation/forTradition.js`), by the sound model (renikud/whisper-he-ipa, five hearings each among different neighbours) on a Kaggle GPU, with Meta MMS letters alongside. **wrong** means most hearings missed the reading. A machine check.

| tradition | kind | clips | right | wrong | right % |
|---|---|---|---|---|---|
| ashkenazi | letter | 99 | 53 | 46 | 53.5% |
| ashkenazi | syllable | 202 | 165 | 37 | 81.7% |
| ashkenazi | vowel | 25 | 14 | 11 | 56.0% |
| israeli | letter | 114 | 107 | 7 | 93.9% |
| israeli | syllable | 236 | 207 | 29 | 87.7% |
| israeli | vowel | 30 | 24 | 6 | 80.0% |
| sephardi | letter | 114 | 97 | 17 | 85.1% |
| sephardi | syllable | 205 | 171 | 34 | 83.4% |
| sephardi | vowel | 30 | 20 | 10 | 66.7% |
| **all** | | **1,055** | **858** | **197** | **81.3%** |

What the wrong ones are:
- **Sephardi and Ashkenazi**: most were made by the Israeli voice reading an English-letter respelling, and it reads the English letters: "i" as "ai" (bi heard "bai", hi "hai"), "u" as "yu", Lamed as "lei-imd", Vet as "vayit", Ashkenazi Vet as "beis", letter-sound cards reading the whole letter name.
- **Israeli**: this check is stricter than `SOUNDS-CHECK.md` (it compares with the app's reading, not a looser match), so some Israeli rows it lists passed there. Some are the checker: the mark cards (shin dot, sin dot) say the letter's name; the vav sound clips are cut from "vav va".

List: `docs/audio/traditions-wrong.txt`. Fixer: `tools/audio/asr-check/tradition_fix.py` (workflow `tradition-fix`).
