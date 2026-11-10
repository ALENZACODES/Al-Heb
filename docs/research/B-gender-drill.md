# B: gender as a mechanic (feature c)

Status: PREVIEW tier, DRAFT. Route `#/gender-drill`. Gameplan pillar 3; board item R-003.

## What is real
- Learner setting: "I am a man / I am a woman / show me both forms", stored in `gender.v1` (`{speaker, asked, right}`). There is no default. With no stored choice the page drills nothing and says so. An explicit earlier choice in the existing `curriculum.gender` (`iAm`) is honoured when `gender.v1` has none.
- `node tools/gender/build.mjs` writes `data/gender/templates.json` from `data/vocab/words.json`: 5 pronouns (I, you m, you f, he, she), 20 person nouns with a masculine row and a different feminine form (list picked by hand from existing rows, build fails if one is missing; nouns whose English gloss changes with gender, such as son/daughter, are left out), and 79 irregular-gender nouns in the top 3,000 (feminine without a feminine ending, or masculine with one, by the data's own gender tag).
- `src/genderdrill/model.js`: generator `buildDrill(data, speaker, {seed, count, paradigms})` with four item types: "say it" (I am a student), agreement (he/she/you + blank, choose the noun form), listener (say a sentence to a man or a woman; the speaker slot uses the learner's own gender), noun gender (ending lies). Speaker 'f' never gets a masculine first-person form as prompt, option or main answer; the other form is a tap-to-reveal comparison. Speaker 'both' shows both forms on every first-person item.
- `src/genderdrill/genderdrill.view.js`: labelled controls, 44px minimum, status region, draft note.
- Tests: `tests/genderdrill.test.js` (13): data copied from words.json, ending rule, no silent default, no masculine first person over 60 seeds, both mode, agreement answers, listener composition, irregular grading, determinism, view behaviour in the fake DOM.

## What is not real / limits
- Adjective and verb agreement are NOT generated from vocabulary: the word list has 1 feminine adjective row (not the 1,391 that board item R-003 counts; those are mostly noun `forms.feminine`) and one present form per verb. Adjective/verb agreement items come only from the 16 repo-authored paradigms in `data/curriculum/gender-pairs.json`, which that file itself marks as not reviewed by a native speaker.
- Plural listeners (men, women, mixed groups) are not drilled: the data has no plural-agreement forms.
- Feminine forms have no transliteration in the data, so none is shown (the page says so).
- Gender tags are dictionary tags; some nouns take both genders. Sentences are bare "I/you/he/she + noun" patterns. All of it needs native review.
- "Say it" cards are self-reported and not counted in the score; only checked questions are.
- The existing pair cards (`#/learn?gender=pairs`) are untouched; that view reads `ctx.settings.get("gender")`, which is not a defined setting (settings.js has no such key), so it always falls back to 'm' until the learner taps a choice.
- Browser rendering at 375x667 not run.

## Update after R/M audit (same session)
- Counts corrected: 19 person-noun pairs, 79 irregular nouns.
- Unresolved (M audit round 3, root cause H): learner gender lives in `gender.v1` (this page), `curriculum.gender`, the Israel lane's own prefs, and an undefined `settings.get("gender")`. The Israel view maps anything but 'f' to 'm', so a learner who picks "both" here is still treated as masculine there. Fix is a shared `gender` setting in `src/shell/settings.js` (DEFAULTS, ENUMS, one Settings row) that all four read; not done because settings.js is shared and the coordinator did not authorise it.
- The page is titled "Gender drill" and the draft note says adjective agreement is not drilled from vocabulary.
