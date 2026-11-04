# On-ramp words, Spot It, hints, checkpoint, mnemonics, dialogues (lane 1)

Status 2026-11-03. All of this is draft content. Nothing here has been tested with learners, reviewed by a native speaker or checked against a dictionary. There is no audio for any of it.

Deep links (all handled by `src/curriculum/learn.view.js`):

| Link | What |
|---|---|
| `#/learn?loanwords=1` / `=lw1..lw3` | "Words you can already read": group list / one group |
| `#/learn?spotit=<letterId>[&seed=n]` | Spot It scan drill for one letter |
| `#/learn?checkpoint=1[&seed=n]` | cumulative look-alike checkpoint |
| `#/learn?dialogues=1` / `?dialogue=<id>` | Israel-track dialogue list / one dialogue |

## 1. Loanword on-ramp (`data/curriculum/loanwords.json`, `loanwords.js`, `loanwords.view.js`)
Three groups (lw1 after r12, lw2 after r20, lw3 after r24), 26 pointed words in total. Each word has `he`, `plain`, `gloss`, `translit`, `lettersUsed`, `marksUsed`, `proofread:false`. `origin` is "international" on purpose; no etymology was researched. The test checks that every letter and vowel sign of a word is taught by the group's `unlockAfter` lesson. It cannot check that a word is really in everyday Israeli use or that its pointing is right: that is the author's judgement only. The groups are kept outside `lessons.json` so the audio manifest, vocab and book tooling (other lanes) are not disturbed; they are not SRS cards and have no audio. The learner decodes first, then taps "Show the meaning", then marks "I knew this" or "Not yet" (stored under `curriculum.loanwords`).

## 2. Spot It (`spotit.js`, `spotit.view.js`)
`buildSpotIt({targetId, words, taught, confusables, seed})` is pure and deterministic. Words come from the read-track lessons up to the one that introduces the letter, plus decodable loanwords. Each line holds at least one target word and, when available, a word containing a look-alike from `confusables.json`. Output: cells with `kind` hit/decoy/other, `hitIndices`, `decoyIndices`. `scoreSpotIt` counts decoy taps against the pair (`pairErrors`, key `a|b`). Effects on "Check": pair stats saved under `curriculum.pairs` ({errors, trials}); the target and any letters that fooled the learner get an SRS lapse (card created if missing). The first lesson of a letter often has no taught look-alike yet (for example bet in r01), so the drill is then a plain scan.

## 3. Interference hints (`data/curriculum/hints.json`, `hints.js`, `hint-ui.js`)
Kinds: confusable-pair, wrong-vowel, direction-slip, silent-letter, final-form, missing-short-vowels. Rules enforced in `hintFor` and tested: never on a correct answer; once per kind per page session; a second miss of the same kind shows the worked example once; later misses show nothing; "Got it, don't show this again" persists the kind under `curriculum.hints.suppressed`. Hints are under 140 characters. Shown after "Again" in review (kind inferred from the card type, not diagnosed), after a decoy tap in Spot It and after a wrong checkpoint answer.

## 4. "Remember it" step
`lesson.view.js` shows each lesson letter's hook from `data/letters/mnemonics.json` (shape, story, sound, anchor word, look-alike warning) between Letters and Vowels, plus "Spot It" links. The mnemonics file itself belongs to lane 2 and is still flagged unreviewed there.

## 5. Look-alike checkpoint (`checkpoint.js`, `checkpoint.view.js`)
Built from `confusables.json` sets narrowed to letters the learner has completed lessons for (needs at least two per set). One question per taught letter per set; options are only taught letters of the same set; alternating "which one is Bet?" (glyph choices) and "what is this called?" (name choices). Pass mark 80%. Results: wrong answers lapse the letter's SRS card, right answers count as Good; the weak sets and Spot It links are shown; the result is saved under `curriculum.checkpoints` by alphabet third (9, 18, 27 letters taught). Not done: the lesson order was not regrouped so look-alikes are taught apart (the existing r10, r12, r16 lessons still pair a letter with its final form, and r18 pairs dalet and gimel); no "no lesson contains two confusable letters" rule is enforced.

## 6. Dialogues (`data/curriculum/dialogues.json`, `dialogues.js`, `dialogues.view.js`)
Seven original dialogues (cafe, restaurant, directions, small talk, shopping, taxi, hotel), 6 to 10 lines each, written from the topic alone, with pointed Hebrew, hand-written transliteration and English. Each is tied to an Israel-track lesson through `unlockAfter` (a preview is allowed before it). Gender is fixed per speaker (named in `speakers`). Hebrew grammar, pointing, naturalness and the transliteration are unchecked by a native speaker. The view hides or shows transliteration and English.

## Storage keys added
`curriculum.hints.suppressed`, `curriculum.pairs`, `curriculum.loanwords`, `curriculum.checkpoints`.

## Needs from other lanes
- Lane 8: the four new `*.view.js` files (precache `views.generated.js` was regenerated by lane 8 while I worked and its test passes), and CSS for `.alef-spot-line`, `.alef-spot-cell` (`aria-pressed`, `.alef-spot-hit`, `.alef-spot-missed`, `.alef-spot-wrong`), `.alef-hint-panel`, `.alef-translit`. Without it the buttons are unstyled but usable.
- Lane 4: no audio ids exist for loanwords or dialogue lines.

## Round 4 exercises (lane 1, 2026-11-03)
All draft: unreviewed content, no native review, no learner testing, no recorded audio. Concept ids refer to `data/curriculum/resource-concepts-gratis.json`; their status there stays `proposed` (a test requires it).

| Link | Concept | What |
|---|---|---|
| `#/learn?ladder=1[&level=n][&seed=n]` | gr-alh-01 | Syllable ladder: hear a syllable, pick one of two cards. 30 levels (seed level, then one new letter or vowel family per level, then 5 final forms). 3 right in a row advances, 2 wrong in a row drops a level. Misses become `syllable:<id>` SRS cards. Clearing it shows the Priestly Blessing opener from the corpus. |
| `#/learn?fade=1` / `?fade=<id>[&level=n]` | gr-gv-01 | Fade-out recall (full, alternate letters, initials, blank) for one-line corpus entries and some phrasebook lines. Level is stored on the `line:<id>` SRS card as `fadeLevel`. |
| `#/learn?gender=pairs[&quiz=1]` | gr-tmh-02 | Man/woman form cards with differing letters highlighted, voice selector, "which gender" and "tap the changed letters" quizzes. |
| `#/learn?gender=roles` | gr-jm-02 | Say-as-me / hear-as-you: six phrase paradigms composed from parts, speaker and addressee choosers, swap. |
| `#/learn?scaffold=1` | gr-fsi-01 | Word practice where the Latin transliteration fades per word (shown, faint, on tap, hidden) with that word's SRS stability; pin per word. `rateCard` updates the scaffold for any `word:` card. |

Storage keys added: `curriculum.ladder`, `curriculum.gender` ({iAm, stats}), `curriculum.scaffold`. SRS card ids added: `syllable:`, `line:`, `gender:` (review.view.js can show all three).

Known limits (stated honestly):
- Ladder: homophone rules (tet/tav, qof/kaf, alef/ayin) are a hand-written table, deliberately conservative; not checked by a native speaker. Final forms use letter audio, not syllable audio, because no final-form syllable clips exist. Audio ids exist in the manifest but every clip is still `missing`; sound comes from the browser voice if at all.
- Fade: corpus text is "verified" only in the sense of a machine comparison with its cited source (`proofread:false`). The slider lets a learner practise any stage; only an attempt at the saved stage moves the saved level.
- Gender: the 16 authored pairs and 6 paradigms are original and unreviewed; 46 more pairs come from the phrasebook, which is itself flagged native-speaker-needed. None of the female or paradigm forms has audio (ids `gp-NN-m/f`, `gpar-NN-<speaker><addressee>` are not in the manifest), so the listening quiz only appears for items that report audio; otherwise it is a reading quiz. No comparison against TeachMeHebrew or Jewish Miami text was possible beyond writing the sentences from scratch. `tests/fixtures/forbidden-gender-strings.json` is optional and does not exist.
- Scaffold: fade thresholds (stability 2.5, 6, 14 days) and one-step-per-day are hand-chosen. "Level" here rises as help is removed (0 shown ... 3 hidden); the spec wording "level never drops without a correct review" was read as "help is never removed without a correct review".
- The setting `scaffoldStart` ("full" or "faint") and a learner-gender setting do not exist in the shell yet; the views read them with fallbacks (full; the choice stored under `curriculum.gender`).

Needs from other lanes: lane 8 to route and precache the new files (`node tools/build-precache.mjs`) and style the classes `alef-draft-notice`, `alef-cardpair`, `alef-card-opt` (`alef-correct`, `alef-wrong`), `alef-levelbar`, `alef-gap` (`alef-gap-open`, `alef-correct`), `alef-fade-line`, `alef-fade-blank`, `alef-gap-options`, `alef-diff` (on `<mark>`), `alef-pair`, `alef-chip` (`aria-pressed`), `alef-voice-choice` (`aria-checked`), `alef-iam`, `alef-latin` (`alef-translit-faint`, `alef-latin-0..3`), `alef-unlock`. Lane 4: audio ids for gender forms.
