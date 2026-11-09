# Decision memo: can Israeli recordings stand in for 'sephardi' clips?

Status: DRAFT recommendation for the product owner. Nothing in the audio manifest, `data/audio/equivalence.json` or `docs/CONTRACT.md` was changed. No audio exists in the repository, so everything below concerns recordings that have not been made. No native speaker, cantor or linguist reviewed this memo.

## 1. The question

`docs/CONTRACT.md` makes the `sephardi` setting mean "American synagogue default = sephardi values". The manifest holds a `sephardi` entry for every clip a learner can request (2,203 required clips per voice, 4,406 for both voices; `docs/voices/coverage.md`). All are missing, and `data/audio/equivalence.json` is empty on purpose: "no authority has decided" which Israeli clips may stand in. The casting brief (line 43) and the kit README leave this open. The player already supports the answer: a rule produces `equivalentTo` on the entry and `src/audio/player.js` then plays the Israeli file with `via: 'equivalent'`.

## 2. What the manifest says is the same and what is different (computed from `data/audio/manifest.json`, man voice, 2026-11-03)

| kind | sephardi entries with an Israeli twin | pointed text identical | `ipa` field differs |
|---|---:|---:|---:|
| word | 173 | 173 | 0 |
| line | 129 | 129 | 0 |
| prayer (whole text) | 70 | 70 | 0 |
| letter (names and isolated sounds) | 57 | 31 | 26 |
| vowel | 15 | 7 | 8 |
| syllable grid | 110 | 0 | 110 |

(Prayer-word clips, 1,719 per voice in the coverage table, are shard entries in `manifest-words-*.json`; they follow the same pattern: same text.) So for connected words and lines the pointed text is identical, and the only differences the project itself records are in the isolated sounds, vowels and syllables (the `ipa` hint, for example Israeli alef `[ʔ]` against none for sephardi).

## 3. What differs in the mouth, and how much it matters

Facts are paraphrased from the references in `data/traditions/sources.json`; confidence follows `data/traditions/sounds.json`.

| Feature | Israeli recording | Sephardi-values target | Does it break the stand-in? |
|---|---|---|---|
| Ayin, chet as throaty sounds | No: ayin is glottal or silent, chet is the same sound as khaf (Modern Hebrew phonology page; older Mizrahi speakers are an exception) | Strict Sephardi and Mizrahi readers keep them (Sephardi Hebrew page). The app's own American-synagogue habit is ayin silent and chet as ch (lane 3 inference, unreviewed). | Yes for a strict Sephardi target. No for the American-synagogue target as Aleph defines it. Also the main reason isolated alef, ayin and chet clips should not stand in. |
| Qof | k | k in the general Sephardi table; the pages name only Georgian Jews as keeping it distinct | No, for the mainstream target. |
| Stress | Mostly final; colloquial Israeli drifts toward second-to-last, and some names are stressed differently (Pealim, Modern Hebrew phonology) | Final stress for most words (Sephardi Hebrew page says it follows where Biblical Hebrew puts it) | Small, controllable. A native speaker reading prayers casually may shift stress; a reading brief ("liturgical, final stress as in the siddur") fixes it. Review every clip for it. |
| Kamatz and patach | Both ah | Both ah in popular Sephardi speech; formal reading may restore a distinction (Sephardi Hebrew page, which does not say how) | No for the popular reading the app teaches. Flag if a reviewer expects a length distinction. |
| Tsere, segol, cholam | e, e, o | e, e, o | No. |
| Shva | Often dropped in everyday speech | Sounded as e where it is vocal | Yes, if the Israeli reader speaks colloquially. Brief: sound every vocal shva. |
| Resh | Uvular (back of the throat) | Front tap or trill (Spanish-like); many Americans use English r | Audible. Not a reading error, but a listener hears an Israeli r in a clip labelled Sephardi. |
| Tav without a dot | t | t (th in some communities) | No for the mainstream target. |

Summary: for the American-synagogue meaning of "sephardi" almost every difference vanishes, because that setting is defined by Israeli/Sephardi vowel values plus English-speaker habits. For a real Sephardi or Mizrahi community (Wikipedia stresses many variants) an Israeli recording is wrong on the throat sounds and on resh at least.

## 4. Options

| | Option | Cost | Benefit | Main risk |
|---|---|---|---|---|
| A | Record a full separate sephardi kit | A third kit for each voice. A comparable Ashkenazi kit is about 970 clips and the project's own model range is 7 to 19 booth hours per voice (nobody was timed, no rates are known). A Sephardi kit was not generated, so its size is an assumption. Needs talent who can read in a chosen Sephardi tradition. | Best fidelity to a chosen community. | You must first decide which community. The result would sound like that community, not like "American synagogue Sephardi values", which is a convention rather than a community. |
| B | Blanket rule: Israeli stands in for all sephardi clips | Zero recording. | Instant coverage for the default setting. | Wrong for isolated alef, ayin, chet and syllable clips if the target is strict Sephardi; hides the setting's real meaning from the learner. |
| C | Selective rule: stand-in for connected text only (kinds word, line, prayer: 2,021 clips per voice by the manifest), record or omit the 144 isolated-sound clips | Reading brief, a native reviewer, a short pilot. | About 90% of the sephardi workload removed, and the clips a learner hears in prayers are the ones where the difference is smallest. | The reviewer might reject the pilot (stress, shva); isolated-sound gaps remain. |
| D | Same as B or C, but rename the setting in the UI to say what it is ("Israeli-style, as in most non-Orthodox US synagogues") | Copy change in the shell, not in the manifest. | Honest labelling. The app's own labels already hint at this ("Sephardi (American synagogue default)"). | Departs from the CONTRACT wording; needs the owner's approval. |
| E | Leave sephardi without audio; show "no audio yet" | Zero. | No misleading clips. | Default setting for Americans has no sound; the whole listening experience depends on the Israeli reading anyway. |

## 5. Recommendation

Choose C with D's labelling, staged:

1. Do not add any rule until a native Israeli or Sephardi reviewer has listened to the pilot (the 30-clip pilot in `docs/voices/kit/README.md`) and signed off. The equivalence file is described as "human-reviewed rules only"; keep that.
2. Write the Israeli reading brief to remove the controllable differences: liturgical register, final stress as in the siddur, every vocal shva sounded, no Ashkenazi forms.
3. Then add rules restricted by `kinds` to `word`, `line`, `prayer` (the rule shape in `equivalence.json` supports `kinds` and `ids`). Example, to be added by the owner, not by this lane: `{"from":"sephardi","to":"israeli","kinds":["word","line","prayer"]}`.
4. Keep letter, vowel and syllable clips out of the rule. Either record them separately in the sephardi tradition or leave them israeli-only with a note that pharyngeals are not modelled.
5. Make sure the UI says "Israeli recording" when the player reports `via: 'equivalent'` (the Traditions screen already does this for its own Play buttons). The Traditions drill never counts a stand-in as a second setting, so it cannot turn identical audio into a fake listening test.
6. If users from Sephardi or Mizrahi communities are a target audience, revisit and consider option A with a named community reader.

What would change the recommendation: a reviewer finding the stress or shva differences unfixable by briefing (go to A or E); the owner deciding "sephardi" means a specific community (go to A); evidence from real learners that Israeli-style audio is confusing in a US synagogue (go to A).

## 6. Doubts

- The 2,021 figure is from manifest entry counts (words, lines and whole-prayer entries per voice, plus the prayer-word shards); it was not re-derived from `coverage.md`.
- Everything about American-synagogue habits is lane 3's inference. The one published survey (Benor and Cohen) measured one or two words and is not representative.
- The Sephardi Hebrew page does not describe stress beyond "final where Biblical Hebrew has it" and does not say how formal readers restore the kamatz/patach distinction.
- Cost and hours come from the project's model, not from a quote.
