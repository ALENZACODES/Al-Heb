# SSML and phoneme hints (rule-generated, untested)

**Status: every string here is rule output from the niqqud text (see VARIANTS.md). No native speaker has checked it, no
engine has been run against it, and no recording exists.**

## Files
- `data/pronunciation/derived/_ssml-001..018.json` (underscore: not precached, ~190 KB each): one record per variants
  record, `{i: id, ssml: {israeli, sephardi, ashkenazi}}`.
- `data/pronunciation/derived/ssml-profile.json` (small, runtime-safe): per-tradition language tag, IPA inventory used,
  engine notes, warnings.
- Builder: `node tools/pronunciation/build_derived.mjs` (also writes the syllable shards and `index.json`).

## Format
`<speak version="1.1" xml:lang="he-IL"><phoneme alphabet="ipa" ph="ʃaˈbat">שַׁבָּת</phoneme></speak>`

- One `<phoneme>` per pointed word, words separated by a space (a maqaf also becomes a space); a word with no niqqud is
  left as plain text.
- `ph` is the variant IPA with syllable dots removed; the primary stress mark `ˈ` stays before the stressed syllable.
- `& < > "` are XML-escaped. The language tag is `he-IL` for all three traditions because no language tag separates
  them; the tradition lives in the IPA only.

## What is and is not known about using it
- Browser speech synthesis (`speechSynthesis`) generally takes plain text and ignores SSML markup. For it, speak the
  pointed Hebrew with `lang = 'he-IL'`. That approximates the Israeli tradition only. There is no known browser voice
  for the Sephardi (ħ, ʕ, trilled r) or Ashkenazi (ɔ, ej, oj, s for tav) readings, so those need recordings.
- For a server-side or future TTS engine, `<phoneme alphabet="ipa">` is the standard SSML element, but whether a given
  engine supports `he-IL`, accepts IPA for Hebrew, and honours ħ ʕ ɔ ə or the stress mark is **not checked here**. Run
  a short sample per engine and compare it to a donor recording before using any of it in the app.
- Careful (liturgical) shva values are written; everyday Israeli speech drops many shvas (flag
  `words-ipa-colloquial-shva-drop` in the variants data). The Israeli SSML is therefore a careful reading.
- Divine-name words are written as the standard reading Adonai.

## For recording scripts
Use `tools/pronunciation/recording_script.mjs` (docs/voices/recording-script-{israeli,sephardi,ashkenazi}.csv); it reads
the same variant data, so the phoneme string and the donor's script cannot drift apart.
