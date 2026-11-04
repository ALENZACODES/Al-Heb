# Lane 3 round 4: vowel board, niqqud dial, dot tile, syllable chips

All four screens are DRAFT: every spelling, gloss, respelling, mouth hint and stress mark was written by an AI agent and has not been checked by a native speaker. No recorded audio exists; buttons appear only when `ctx.audio.has(kind, id)` is true, otherwise "no audio yet" is shown.

| Screen | Module | Concept | Data |
|---|---|---|---|
| Vowel families | `src/pronunciation/vowelboard.view.js` | yt-vowels-01 (+ plene from yt-vowels-03) | `niqqud.json` (families derived at runtime), `plene.json` |
| Niqqud dial | `niqquddial.view.js` | gr-t625-02 | `dial-words.json`, `niqqud.json`, `consonants.json` |
| Dot toggle | `dottile.view.js` | yt-alphabet-03 | `consonants.json`, `dot-pairs.json`, `data/letters/letters.json` (read only) |
| Syllable chips | `syllablechips.view.js` | gr-tmh-05 | `syllables.js`, `stress.json`, `prayerwords.json`, `dial-words.json` |

Shared: `ui.js` (scaffold, draft notice, tradition radios bound to `settings.congregation`, audio gating, `pron.misses` recorder, theme variables with fallbacks), `boards.model.js` (pure models).

## Decisions and caveats
- Short vs long is not claimed as an audible difference in Israeli Hebrew (`plene.json` shortLongNote).
- Shva is not taught as "short e": it is kept out of the vowel board; the chips use `shva.js` for na/nach and the dial badge says it is sounded or silent.
- Final he: a he with no dot is a vowel letter (written, no h heard, tells you the vowel); a he with mappiq is a consonant. It is never described as "just not read". How often modern speech says the mappiq h is flagged for a native speaker.
- The board uses select-then-place (buttons) instead of drag, so it works by keyboard and touch; the spec's drag is not implemented.
- Misses are stored under store key `pron.misses` as `{screen, tag, ts}` (last 200). Nothing reads them yet; SRS integration is not done.
- Syllable boundaries come from `src/photo/syllabify.js` (photo lane, imported read-only) with this lane's shva classifier. Chip Latin = difference of `transliterate()` over word prefixes, final he silent. If a word's prefixes are inconsistent, no Latin is shown for it (none fail in the fixtures).
- Stress: default final; exceptions in `stress.json` (segolates etc., own knowledge). Ashkenazi stress only for the ten prayer words (from `prayerwords.json`); other words are flagged "not checked".
- The siddur respelling writes tzere+yod as `ei` (peirot) though the Israeli sound equals defective `perot`; the board says so.
- Not verified: browser layout beyond one Chromium 390px check (no horizontal overflow from these views, both colour schemes mount without errors); screen readers; glyph placement of dagesh/shin dots depends on the font.

## Also fixed (lane 8 review)
`soundgap.view.js`: both tables wrapped in a focusable `.table-wrap` (overflow-x:auto); fixed colours replaced by app CSS variables (`--border`, `--focus`, `--warn-bg`...) with fallbacks; same variable change in `sounds.view.js`.

## Routes (for lane 8)
See the final report of the round-4 lane 3 run.
