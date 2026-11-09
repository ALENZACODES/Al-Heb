# Ashkenazi cholam: 'o' or 'oy'? Decision brief for John

Status: research brief, no code changed. Written 2026-11-04. Claims below are limited to what was read in the repo or on the cited pages; where a source was thin it says so.

## The question

For the Ashkenazi setting, should the app show cholam as `o` (sholom, Boruch-style) or as `oy` (sholoym-style, Toyroh)? Today the app does both, in different places.

## Where each appears in the repo

`o` (cholam shown as o):
- `src/pronunciation/transliterate.js`: option `cholam: 'o'|'oy'`, default `'o'` (header comment, `opts.cholam ?? 'o'`, and `case 'cholam': return o.ashk && o.cholam === 'oy' ? 'oy' : 'o'`). The header comment calls `'oy'` "a Polish/Chasidic value".
- Every Ashkenazi transliteration in the app that goes through `transliterate()` therefore uses `o` for cholam: `src/traditions/model.js` (lines 54, 66, 71, 205-206), `src/vocab/vocab.view.js`, `src/pronunciation/vowelboard.view.js`, `src/pronunciation/syllables.js`. No caller passes `cholam: 'oy'`; only the test does.
- `tests/pronunciation.transliterate.test.js`: expects `sholom` style output for Ashkenazi (ASHKENAZI list includes `sholom`, `adonoy`), line 143 asserts `cholam: 'oy'` gives `sholoym`.
- `data/pronunciation/prayerwords.json`: Ashkenazi `say` for Baruch `BO-rukh` (that is kamatz, not cholam), Shalom `SHO-lom`, Adonai `ah-doh-NOY` (the `doh` is the cholam, shown as o).

`oy` (shown as oy):
- `data/pronunciation/prayerwords.json`: `ho-OY-lom (some: ho-OH-lom)` (haolam), `TOY-roh / TOH-roh` (Torah).
- Adonai: `adonoy` in `transliterate.js` line 138 and in `data/pronunciation/drills.json` ("Adonoy"). This `oy` comes from kamatz + yod (Ashkenazi kamatz = o, then the yod diphthong), not from cholam. Do not confuse the two when deciding.

Prose that mentions the choice:
- `data/traditions/guide.json` line 59: "Ashkenazi has regional dialects. Aleph models one common siddur style; your community's may differ (for example oy or ey for cholam)."
- `data/traditions/sounds.json` has a cholam entry; `data/traditions/sources.json` cites "cholam and tsere regional values".

Internal inconsistency to fix whichever way you decide: `prayerwords.json` shows haolam with `OY` and Torah with `TOY-roh / TOH-roh`, but Shalom with `SHO-lom` and the `doh` of Adonoy with `o`. A learner sees cholam as `oy` in two words and `o` in two others, in the same tradition. The transliterator and the prayer-word cards disagree.

## What American Ashkenazi congregations use

What I could confirm from pages I read:
- Wikipedia, "Ashkenazi Hebrew": lists cholam as [au], [ou], [oi], [øi] or [ei] depending on sub-dialect; Northern German [au], Southern German [o], Galician/Polish [oi], Hungarian [øi], Lithuanian [ei]; and says many non-Hasidic Ashkenazim in America pronounce it [o]. It says Haredi communities in England mostly use the Galician/Polish [oi]. It gives no American Hasidic or Yeshivish breakdown. https://en.wikipedia.org/wiki/Ashkenazi_Hebrew (Wikipedia, not a primary source.)
- jewfaq.org transliteration guide: for Ashkenazic, the o sound may be rendered "oy" "especially among Chasidim"; it does not say how common this is beyond them. https://jewfaq.org/translitguide.htm
- Jewish-languages list thread: the oy/ou/au/ei values grew out of one earlier diphthong stage; a contributor suggests a stray "torasoy" example may not be a regular Ashkenazic form. A scholar-forum discussion, informal. https://groups.google.com/g/jewish-languages/c/z-PqGYNdU3w
- Leining list: for "goy"-type words (cholam + yod) people often say a shortened vowel; a single contributor's account, not a survey. https://groups.google.com/g/leining/c/6BMUm6KGftc/m/5xErLf7NAgAJ
- MyJewishLearning: until the mid-20th century most American synagogues used Ashkenazi pronunciation, and after 1948 many shifted to Modern Israeli. It does not discuss cholam. https://www.myjewishlearning.com/article/ashkenazic-and-sephardic-hebrew/

What I could not confirm: any survey or source giving the share of American Ashkenazi congregations by cholam variety. My reading, labelled as inference and not sourced: Hasidic and some Yeshivish settings lean toward `oy`/`oi` (Polish/Galician/Hungarian-derived); Lithuanian-derived `ey` exists in some Litvish settings; and the plain `o` (sholom) is the form in older American Conservative/Modern Orthodox and Reform-era "Ashkenazi" usage and in most English-language transliterations of the Ashkenazi style. Treat all of that as unverified until someone from those communities checks it. Congregations that moved to Israeli pronunciation no longer use any Ashkenazi variety.

## Options

1. Keep `o` as the default and offer `oy` as a variety setting. Matches the Wikipedia statement for non-Hasidic America and matches the current code default.
2. Switch default to `oy`. More faithful to the Polish/Galician-derived Haredi sound, but the sources above do not support calling it the common American default; likely to look foreign to non-Hasidic learners and clashes with the `o` in Shalom/Boruch rendering.
3. Offer a three-way variety: `o` (mainstream American), `oy` (Polish/Galician/Hasidic), `ey` (Lithuanian). `ey` is not implemented anywhere; the guide text already names it. Needs a real source for exact spellings before building.
4. Keep as is (mixed). Not recommended; the mix above is the real defect.

## Recommendation

Default: `o` for Ashkenazi, because the one source that speaks to America says non-Hasidic Ashkenazim there use [o] and the code already defaults to it. Add a settings choice, shown only when tradition is Ashkenazi: "Cholam sounds like: o (Sholom) / oy (Sholoym)", with a one-line note that your community may differ and to follow your rabbi or ba'al koreh. Defer `ey` until a source is checked. Keep Adonoy as-is (its `oy` is the kamatz-yod diphthong, so it stays `oy` under every variety).

Content fix needed under that choice: make `prayerwords.json` Ashkenazi `say` strings consistent with the default (haolam `ho-OH-lom`, Torah `TOH-roh`, with the `oy` spellings shown as the variety), and have the variety setting drive them. Someone who reads Hebrew should confirm each respelling; this brief does not invent any Hebrew.

## Toggle idea

Setting `ashkenaziCholam: 'o'|'oy'` stored with the other tradition settings; pass it as `cholam` to every `transliterate()` call (the option already exists); derive prayer-word `say` strings from the same value instead of storing both forms as free text. Add a test that no Ashkenazi screen mixes the two within one setting.

## Questions for you

- Which community do your target learners come from?
- Do you want the `ey` variety at all?
- Is a native Ashkenazi reader available to check the respellings?
