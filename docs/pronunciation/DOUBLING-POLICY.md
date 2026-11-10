# Doubling policy: dagesh chazak in respellings

Status: decided for the learner respelling; **needs-native-review** for every claim about how people actually speak.
Nothing here was checked by a native speaker, and no recording exists.

## The policy

1. **Everyday respelling (all three traditions, and every place a Latin respelling is shown to a learner):** a dagesh chazak
   (the doubling dot) is written as a **single letter**. Examples: סִדֵּר `sider`, אִשָּׁה `ishah`, חַיִּים `chayim`,
   אַתָּה `atah`, שַׁבָּת `shabat` (not `sidder`, `ishshah`, `chayyim`, `attah`, `shabbat`).
   This holds for the Israeli, Sephardi and Ashkenazi columns alike.
2. **Scholarly "rules" display only:** doubling may be shown where the screen is explicitly about the pointing rules (for
   example a rule page that says "this dot doubles the letter in the written system"). It must be labelled as a spelling
   convention, never as a sound the learner is asked to make. No such display exists yet; the option is kept in code
   (`geminate: true` in `src/pronunciation/transliterate.js`) and is off everywhere.
3. **One source of truth:** the stored `translit` in `data/vocab/words.json` (siddur scheme, Israeli) and the Compare
   lookup (`data/pronunciation/runtime/lookup-*.json`) are produced with the same setting, `GEMINATE = false` in
   `tools/pronunciation/build_variants.mjs`. A test (`tests/pronunciation.compare.test.js`) compares them for ranks 1-500.
4. The IPA columns never marked length, so they are unchanged by this policy.

## What Israeli Hebrew actually does, and what is uncertain

- **Modern Israeli Hebrew:** the doubling dagesh is not pronounced. The repo's own cited fact says so
  (`data/pronunciation/easy.json`, id `doubling-gone`, quoting the niqqud article: "acoustically and phonologically
  nonexistent in Modern Hebrew"; also `data/pronunciation/niqqud.json`, dagesh entry, Israeli: "gemination absent"; and
  `data/israel/giveaways.json`, id `gv-gemination`, which tells learners that reading a doubled consonant sounds like reading
  a textbook aloud). Those entries are the evidence; this lane did not look at corpus data or recordings.
  Only the begadkefat effect (b, k, p instead of v, kh, f) and the shva-na trigger remain audible consequences.
- **Sephardi and Mizrahi liturgical reading:** some communities are described in the literature as keeping real doubling in
  careful reading, others not. The repo's sources do not cover it (`niqqud.json`: "gemination not covered by the sources
  fetched"). **Uncertain, needs-native-review.** We therefore do not claim doubling for "the" Sephardi reading.
- **Ashkenazi liturgical reading:** the repo's sources also do not cover gemination. The common understanding is that the
  European Ashkenazi traditions do not double, but this was not checked here. **Uncertain, needs-native-review.**
- Because the doubling is either absent or unverified in every column, a single letter is the only choice that does not
  claim a sound the data cannot support. A learner who wants to hear a community that does double can be offered that as a
  later, separately sourced setting.

## What changed in the data

- `tools/pronunciation/build_variants.mjs`: `GEMINATE = false`, used for all four `transliterate()` calls (previously `true`).
- Rebuilt with the repo builders, in the order given in `docs/pronunciation/ROUTES2.md`: build_variants, build_derived,
  build_runtime, build_pages, build_minimal_pairs, recording_script.
- `wordKey()` in `src/pronunciation/compare.model.js` now also drops the maqaf, so the seven bound prefixes
  (לְ־ בְּ־ מִ־ שֶׁ־ הֲ־ וְ־ דְּ־) resolve to their lookup entries (the bare forms were already in the table; the `he` field
  carries a trailing maqaf and the old key did not match it). Their IPA still marks the single syllable as stressed, which is
  wrong for a clitic: needs-native-review.
- 23 stored `ipa` values in words.json ranks 1-500 replaced by the builder's Israeli IPA
  (`tools/vocab/ipa_rule_corrections.mjs` appends them to `data/vocab/corrections.json`; `apply_corrections.mjs` writes them).
  Stored stress marks were ignored when computing the replacement, except that דֶּרֶךְ and זֶרַע (segolates) are given
  first-syllable stress inside the tool (own knowledge) so they do not get the default final stress. Several replacements are
  careful-reading forms where everyday speech drops a shva (for example כְּמוֹ `ke.ˈmo` against everyday `kmo`):
  needs-native-review.
