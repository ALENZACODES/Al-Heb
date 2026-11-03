# Lane 3: vowels, pronunciation traditions, transliteration

Data (`data/pronunciation/`): `niqqud.json` (15 shared ids, ipa/english per tradition, variants), `consonants.json`
(27 letter ids + feature list), `drills.json` (ranked drills, 5 switch cards, same-word pairs), `easy.json` (cited facts).
Code (`src/pronunciation/`): `hebrew.js` (parser), `shva.js` (rules), `kamatz-katan.js`, `transliterate.js`,
`sounds.model.js` (pure display helpers), `sounds.view.js` (`mount(root, ctx)`).

## Transliteration schemes
- `siddur` (default): ch=chet, kh=khaf, tz, k, ai/ei, final h shown, shva na = e.
- `academic`: approximation of the Academy 2006 choices named in the notes (ẖ, kh, ts, ay/oy). Not a full implementation.
- `ashkenazi-siddur`: siddur style, tradition forced to ashkenazi (kamatz=o, tzere=ei, tav without dagesh=s).
- israeli and sephardi give the same Latin output; their IPA differs in the data.

## Known gaps (all flagged in code and data)
- Shva: T1-T5 in `shva.js` are TODO; L3 relies on a final-stress assumption (own derivation).
- Kamatz katan: only U+05C7 and a four-word list (`kamatz-katan.js`), unverified; other cases are misread.
- `shvaMode: 'colloquial'` is an own heuristic, not corpus-validated.
- No stress marking in transliteration; no ta'amim-based phrasing.
- Not included because unsourced in the notes: he-dropping, "ma ze", intonation, fillers. Aspiration drill is `verified: false`.
- Every IPA value, English approximation, stress mark and example gloss needs native-speaker review.

## Settings contract the view assumes (for lane 8)
`ctx.settings.congregation` readable; written via `settings.set('congregation', v)` if present, else assignment;
external changes followed via `subscribe(fn)` / `onChange(fn)` / `addEventListener('change', fn)` if present.
`ctx.audio.play('vowel', id)` on tap. `ctx.pronunciationData` optionally injects the four JSON files (tests).
Note: with Node 22 the contract command `node --test tests/` fails ("Cannot find module"); use `node --test tests/*.test.js`.
