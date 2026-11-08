# Sephardi sounds: the checklist for the Sephardi voice and the Sephardi spelling

Owner decision, 2026-11-08: the Sephardi clips are read by the same two voices as everything else (Ari and Noa), and what makes them Sephardi is the sounds below, not a different speaker. The list is paraphrased from the SephardicU transliteration guide and the Sephardi Hebrew article named in `data/traditions/sources.json` (`sephardicu`, `wp-sephardi`); the history is in Harshav (`harshav`). No sentence was copied. No native Sephardi reader has reviewed this yet; that review is the gate before any Sephardi clip is marked approved.

## The sounds a Sephardi clip must get right

| Letter or mark | Sound | Spelled (SephardicU) | Israeli clip differs? |
|---|---|---|---|
| Kamatz | a, like patach. Kamatz katan is o by the sound of the word (kal, tsahorayim), not by the grammar book | a | no |
| Patach and kamatz | the same vowel | a | no |
| Tsere | plain e, never ey | e | no |
| Holam | plain o, never oy or au | o | no |
| Vocal shva | a short e, always sounded (Berakhah) | e | yes when the Israeli reader swallows it: brief the reader |
| Tav without a dot | t (a few communities: th) | t | no |
| Ayin | a real throat sound (Arabic ayin); Spanish-Portuguese and Italian communities: ng | ’ | **yes**: Israeli ayin is silent |
| Chet | a breathy h from the throat, distinct from khaf | h (khaf is kh) | **yes**: Israeli chet = khaf |
| Qof | k (a deeper k in a few communities) | q | no |
| Resh | tapped or trilled at the front, like Spanish r | r | **yes**: Israeli resh is at the back |
| Tsadi | ts | ss | no |
| Stress | on the last syllable wherever the Bible marks it there (most words) | no mark | small: Israeli speech drifts to the second-last in some words |
| Dagesh forte | the consonant held a little longer | the letter doubled (Hanukkah) | no |
| Final he | kept (Torah, mitzvah) | h | no |
| Articles and prepositions | read as part of the word | written as separate words (Ha gefen) | no |

So an Israeli clip already stands in correctly for the vowels, tav, qof and tsadi; the three sounds that make a clip Sephardi rather than Israeli are **ayin, chet and resh**, plus a sounded shva and final stress.

## How this reaches the app

- `data/traditions/sounds.json`: every sound row now has a `sephardi` cell (`say`, `translit`) shown in the Sounds table as "Traditional Sephardi", with the SephardicU spelling.
- `data/traditions/guide.json` `background`: the beginner explainer "Why does Israeli Hebrew sound Sephardi?", shown on the Guide tab.
- `data/audio/equivalence.json`: until Sephardi clips exist, a Sephardi entry with no clip plays the Israeli clip and the sound line names Israeli (the vowels, tav, qof and tsadi are right; ayin, chet and resh are the Israeli values).

## How to make the Sephardi clips (when the voice run is done)

1. Same voices: Ari (`he-IL-Wavenet-B`) and Noa (`he-IL-Wavenet-A`), so the learner hears the same two people in every setting.
2. Input is the Sephardi respelling in `data/tts/soundwords.sephardi.json` (tools in `tools/tts/`), which must encode the table above: ayin audible, chet as a throat h, resh as a front tap, every vocal shva sounded, final stress marked.
3. Pilot 30 clips (`docs/voices/kit/README.md`), then a native Sephardi listener judges ayin, chet, resh, shva and stress before anything is ingested (`tools/audio/ingest.mjs --origin respelled`).
4. When a Sephardi clip lands, it wins over the stand-in automatically: the player prefers an exact Sephardi file to an `equivalentTo` file.
