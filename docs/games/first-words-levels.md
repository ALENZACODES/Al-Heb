# Hebrew Word Finder — Level 1 of 9 (branch candidate)

**Status:** preview, not yet tested by a native Hebrew educator or by first-time learners. This branch does not merge or publish.

## A true first-minute game

Route `#/wordfinder` starts with the first five of 24 deliberately familiar headwords (hello/peace, yes, no, thank you, please). The learner needs **no prior Hebrew**. Each short word passes through three gentle, unhurried states:

1. **Meet:** pointed Hebrew in large type, source transliteration, simple English meaning, an ordinary real-world use note, buttons for Hebrew and English audio
2. **Find:** compare the shapes in three large, keyboard-operable choices. The prompt repeats the English meaning and pronunciation. The correct word comes only from the same sourced bank
3. **Celebrate / next:** one calm success message, replay audio, and move on. Mistakes never penalise the learner, and `Show me a hint` highlights the correct word without completing it

Each round has five words. The learner can choose the first 24, all 240, or one of eleven themes. The existing store saves only the IDs of found words and the cumulative round count under `games.wordfinder.v1`. Revisits choose unseen words first. Fully studied groups become gentle review rounds. No typing, deadlines, losing lives, hearts, leaderboards, forced sign-up, or unlock gates.

## Source and audio truthfulness

`data/games/firstwords.json` contains exactly **240** separate pointed Hebrew words, source transliterations and stable vocabulary IDs copied from `data/vocab/index.json`. The 24 first words are explicitly ordered. The displayed short English glosses and the everyday-use explanations are pedagogical editorial copy; they are **not** quoted Hebrew sentence examples or native-reviewed. Vocabulary entries derive from Wiktionary/Kaikki and FrequencyWords; consult `docs/vocab/LICENSES.md` and `data/vocab/attribution.json` for CC BY-SA provenance.

**Hebrew playback** is through the unchanged `ctx.audio.play('word', id, {text})` and the shared `speak` function: existing recorded/pre-rendered files first; a device's actual Hebrew voice if available; otherwise explicit on-screen guidance and **no fake playback**. **English playback** is an explicitly labelled browser `en-CA` device reading of the English meaning and use note, if available. Neither replaces, revoices, or changes Israeli, Sephardi or Ashkenazi production clips. Sound-off (audioFree) settings are respected. No BGM or new SFX assets are added; existing opt-in game UI feedback can be used.

## Nine suggested skill bands

The games hub `#/games` retains the 24 currently listed original games, keeps the unfinished Echo Chamber directly accessible without advertising it, and adds Word Finder as the 25th listed game. All have a visible suggested **Level 1–9** label:

| Level | Learning intent |
| --- | --- |
| 1 | Start from zero: shapes, basic sounds and everyday words |
| 2 | Recognition of letters, vowel marks and the first word patterns |
| 3 | Short word identification with guided meaning |
| 4 | Familiar phrases, types and prefixes |
| 5 | Practical word use and rhyme recognition |
| 6 | Short Hebrew sequences and simple situations |
| 7 | Everyday scenarios and understanding in context |
| 8 | Roots, patterns and ambiguous forms |
| 9 | Fast, complex practice and form changes |

Levels are **guidance**, not placement scores, CEFR equivalents, certificates, or hard locks. Many of the existing 25 games are previews and have not been validated with new learners; a game may need to move up or down once learner testing is available. The existing routes and character art stay unchanged.

## Verification

- Unit and integrity tests: `node --test tests/games.wordfinder.test.js`
- Entire existing unit tier: `node tools/test/run.mjs unit`
- Offline generator (never hand-edit generated output): `node tools/build-precache.mjs`
- Manual on-phone acceptance: open `#/wordfinder` fresh, study five words, try a wrong choice, use hint, find the right card, check audio truth, complete five, reload and check saved IDs; check 320 px widths, keyboard, screen reader, audioFree and reduced motion

**No claim of human testing, fully successful unit-suite run, or 100% audible coverage may be made without a corresponding test result.**
