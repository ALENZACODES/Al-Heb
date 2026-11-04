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

## Round 2: he fix, sound-gap lab, prayer-word contrast
- Fixed: `transliterate()` dropped a he whose following vav was a vowel letter (הוּא gave "u", הוֹדוּ gave "odu"). Now hu / hodu; regression tests in `tests/pronunciation.transliterate.test.js`.
- `data/pronunciation/soundgap.json` (`proofread:false`): eight contrasts (chet/khaf/he, alef/ayin, resh, tsadi, kaf/qof, tet/tav, samekh/sin, vav/bet) with per-tradition notes, plain-English mouth steps and word pairs. Pair kinds: minimal, homophone (same in Israeli), alternation, tradition. `heardIn` lists traditions where the pair is audibly different.
- `data/pronunciation/prayerwords.json` (`proofread:false`): ten prayer words, Israeli / American synagogue / Ashkenazi respellings with stress.
- `src/pronunciation/soundgap.view.js`: `mount(root, ctx)`; shows both. Play buttons appear only when `ctx.audio.has('word', 'soundgap-<gap>-<i>-a|b')`; no such audio exists yet.
- Needs a native speaker: every gloss and pair, pharyngeal chet/ayin, uvular qof, emphatic tet, w-vav, tsadi-as-s, Ashkenazi stress for amen and haolam, all respellings.
