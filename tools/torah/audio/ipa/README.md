# Hebrew Torah Reading: Sounds From the Pointed Text

Google's Hebrew voices guess at Biblical words, and the earlier pilots in `docs/torah/audio-verification/` showed it. Here the guessing is taken away: every word's exact sounds (IPA) are worked out from the pointed text in `data/corpus/torah/`, and Google is told how to say each word.

## How Each Word Is Worked Out

- **Vowels and consonants** come from the points, through [Phonikud](https://github.com/thewh1teagle/phonikud) (Israeli/Sephardi five vowels, the same sound as the rest of ALEF).
- **Stress** comes from the chanting mark on the word. The mark sits on the stressed syllable. Marks that are always written at the start or end of a word (segol, pashta, zarqa, telisha, dehi) are skipped; a doubled pashta uses the first one; yetiv means the first syllable; silluq marks the last word of a verse. Where a word has only a fixed-place mark, the stress is taken from the same word elsewhere in the Torah (3,003 words); 257 words keep the default last-syllable stress.
- **Vocal sheva**: at the start of a word, under a doubled letter, after another sheva, before the same letter, and after a vowel the text marks with meteg.
- **Qamats as "o"**: in כָּל־, before hataf qamats, and in a closed syllable proven by the dagesh after the sheva (קָרְבָּן korban).
- **The divine name** is read as the app reads it everywhere (`src/shell/names.js`): Adonai, or Elohim where the text points it that way.
- Four words with a written-only letter are set by hand (`OVERRIDES` in `biblical_ipa.py`).

`ipa.json` holds the result for all 5,846 verses and 68,543 words: the source word, its IPA and a note on anything that was not read straight from a mark.

## Recording (Windows, Command Prompt, from `C:\Users\user\Al-Heb`)

You only need Python 3 (the `py` launcher) and the PowerShell that comes with Windows; `ipa.json` is already built. First `cd C:\Users\user\Al-Heb` and `git pull`.

1. Plan one chapter first (Genesis 1 is 62 requests, under $1):
   `py tools\torah\audio\ipa\plan.py --book genesis --chapter 1`
2. Record it with your Google key (the same `GOOGLE_TTS_API_KEY` the other audio tools use):
   `powershell -ExecutionPolicy Bypass -File tools\torah\audio\ipa\render.ps1`
3. Listen to `tools\torah\audio\ipa\clips\`. Ari is `-ari`, Noa is `-noa`.
4. Put the chapter in the app:
   `py tools\torah\audio\ipa\install.py --book genesis --chapter 1`
   then commit `audio\*\israeli\line\torah-genesis-1-*.mp3` and `data\audio\manifest-torah.json`. Each verse gets its own Hear button in the Torah Reader.

For the whole Torah: `py tools\torah\audio\ipa\plan.py` (11,692 requests, about $94 at Google's listed $30 per million characters, before any free allowance), then step 2 again. A rerun skips clips that are already done.

## Rebuilding `ipa.json`

Only needed after the Torah text or the rules change. Phonikud needs Python 3.12 or older:

```
py -3.12 -m pip install git+https://github.com/thewh1teagle/phonikud
node tools\torah\audio\ipa\spoken.mjs .
py -3.12 tools\torah\audio\ipa\biblical_ipa.py
```

## What Is Still Open

- The voices are Ari (Charon) and Noa (Kore) speaking under Google's German setting, because that is where Google accepts exact sounds. The Shema pilot used the same route. Listen for a German accent on ʁ and χ before recording everything.
- The sounds are rule-based from the points, not checked by a reader yet. A cantor or rabbi listening to a chapter is the real test.
- This is reading, not chanting.
