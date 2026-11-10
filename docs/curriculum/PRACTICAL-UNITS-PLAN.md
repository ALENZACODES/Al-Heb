# Practical conversation units (Babbel-style) for the Israeli track

John asked for a structured, practical curriculum in ALEF: short conversation units (ordering food, directions, shopping, small talk, and the rest of daily life), each with a clear grammar note, a spaced-repetition review queue, and targeted listening and speaking drills.

This is a plan for that shape, mapped onto the lessons and phrasebook that already exist. It is not a new track and it does not add a 126th lesson (the integrity tests lock the count at 125; a prerequisite may only point at a lesson on the same track). It does not change the divine Name, the default rite, or גּוֹי data.

Written 10 November 2026, America/Toronto. Not a rabbi or native-speaker review.

## What “verified” means here

A unit is **built** only when every Hebrew line is already in the repo: `data/corpus/phrasebook.json` or `data/curriculum/lessons.json` (Israel-track and intermediate Israel lessons). No new Hebrew was composed for the two built units.

That is not the same as native-checked. The phrasebook note says it was written from general knowledge and is **not** reviewed by a native speaker; every phrasebook row is already tagged `native-speaker-needed: pointing and register` (a few fillers: slang/register and spelling). Lesson words and the speak survival sets are likewise unverified. Built units **inherit** that hold: `proofread` is false, `nativeReview` is required, and a reviewer should walk the phrasebook rows and the cited lesson words, not this file alone.

Everything in the map below that is not one of the two built units is a **planned** grouping of existing lessons, also held for native review before any further Hebrew is added.

## How a unit is meant to work

Each unit is a small, situation-shaped pack, closer to a Babbel lesson than to a 50-word intermediate list:

1. **A short grammar note** in English, naming only forms that already appear in the unit’s phrases (how אֶפְשָׁר + infinitive works, gendered רוֹצֶה / רוֹצָה, directional ־ָה, and so on). It is not a new grammar lesson and not a substitute for the existing grammar topics.
2. **A spaced-repetition queue** that reuses the scheduler already in `src/curriculum/srs.js` (FSRS-style, ratings Again / Hard / Good / Easy; card shape `id, kind, state, stability, difficulty, reps, lapses, lastReview, due`). Vocab review already stores cards under `srs.vocab` (`src/vocab/vocab.view.js`). Unit queues list existing phrasebook ids first (a 12-item core, then the rest of the situation). They do not invent a second scheduler.
3. **Listening drills** that play existing audio-manifest rows: phrasebook ids (Israeli-only scope, same as the survival phrasebook) and lesson-word ids such as `il06-w4` or `i-13-w2`. Missing files are a known worktree/audio issue, not a reason to invent clips.
4. **Speaking drills** that reuse the machine-built survival speak sets (`data/speak/sets/speak-survival-*.json`). Those sets are also unverified and some items have no `audioId` yet.

The two built units live in `data/curriculum/practical-units.json`. They are not wired into the router in this change.

## Map: Israeli-track lessons → practical units

Israel-track openers are `il01`–`il24`. Intermediate Israel lessons already sit on the same conversational ground (`I-11`–`I-25`, `I-36`–`I-50`). Phrasebook situations are the ten keys in `data/corpus/phrasebook.json`.

| Unit (planned id) | Situation | Existing lessons to reuse | Phrasebook | Speak set | Status |
|---|---|---|---|---|---|
| pu-greetings | Greetings and courtesy | il01, I-50 | greetings, politeness | speak-first-day, speak-survival-fillers-1 | planned — native review |
| pu-fillers | Sounding local (fillers) | il02, il23 | fillers | speak-survival-fillers-1 | planned — native review |
| pu-intro | Introducing yourself | il03, I-25 | small-talk (name / from) | speak-talking-asking-1 | planned — native review |
| pu-numbers | Numbers and prices | il04, il05 | numbers | speak-time-numbers-2 | planned — native review |
| **pu-cafe** | **Ordering at a cafe** | **il06, il07, I-13** | **cafe (27)** | **speak-survival-cafe-1** | **built-draft — native review still required** |
| pu-shop | Shops, markets, paying | il08, il09, I-12, I-43 | shop | speak-survival-shop-1 | planned — native review |
| pu-taxi | Taxi and getting a ride | il10, I-23 | taxi | speak-places-travel-1 | planned — native review |
| **pu-directions** | **Asking for and following directions** | **il11, I-15** | **directions (20)** | **speak-survival-directions-1** | **built-draft — native review still required** |
| pu-time | Days, time, appointments | il12, il22 | (lesson words; no dedicated situation) | speak-time-numbers-2 | planned — native review |
| pu-small-talk | How are you, where from, work | il13, I-25, I-36 | small-talk | speak-survival-small-talk-1 | planned — native review |
| pu-family | Family and who you are | il14, I-42 | (lesson words) | speak-people-family-1 | planned — native review |
| pu-weather | Weather and what to take | il15, I-24 | (lesson words) | speak-nature-animals-3 | planned — native review |
| pu-verbs-now | Present-tense “I do” | il16 | (lesson words; grammar-led) | speak-doing-verbs-1 | planned — native review |
| pu-hotel | Hotel and booking | il17, I-17 | directions (hotel), taxi | speak-places-travel-1 | planned — native review |
| pu-help | Help, health, pharmacy | il18, I-14, I-20 | help | speak-body-health-2 | planned — native review |
| pu-past-future | Past and future (bridge) | il19, il20 | (grammar-led) | speak-doing-verbs-2 | planned — native review |
| pu-opinions | Opinions and plans with someone | il21, il24, I-38 | small-talk | speak-feelings-mind-2 | planned — native review |
| pu-phone | Phone, SIM, messages | I-16, il22 | (lesson words) | speak-tech-media-1 | planned — native review |
| pu-transit | Bus, train, tickets | I-11, il10 | taxi, directions (station) | speak-places-travel-2 | planned — native review |
| pu-bank-post | Bank, forms, post office | I-21, I-22, I-48 | shop (paying) | speak-society-work-law-2 | planned — native review |
| pu-delivery | Ordering delivery | I-45, I-13 | cafe | speak-food-drink-1 | planned — native review |
| pu-repairs | Landlord and repairs | I-44, I-17 | help | speak-home-things-1 | planned — native review |
| pu-outdoors | Hiking, beach, driving | I-39, I-40, I-41 | directions | speak-places-travel-2 | planned — native review |
| pu-shabbat-table | Being invited, everyday blessings | I-19, I-50 | greetings | speak-religion-prayer-2 | planned — native review; Name/rite holds unchanged |
| pu-emergencies | Police, ambulance, fire | I-46, il18 | help | speak-body-health-3 | planned — native review |

Speak set ids are the ones already generated under `data/speak/sets/`. If a planned unit has no perfect set, use the nearest theme set and mark the gap; do not invent a new speak file until a native pass exists.

## The two built units

### pu-cafe — Ordering at a cafe

- **Lessons:** il06 Cafe: ordering a coffee; il07 Cafe and menu words; I-13 Cafe ordering: milk, sugar, sizes and the bill.
- **Grammar note:** Polite requests with אֶפְשָׁר + infinitive; gendered רוֹצֶה / רוֹצָה; בְּבַקָּשָׁה after a bare noun; אֶת before a definite object (אֶת הַתַּפְרִיט). Full prose is in the JSON.
- **SRS:** 12 core phrasebook ids (`cafe-14`, `cafe-02`, `cafe-03`, `cafe-04`, `cafe-09`, `cafe-10`, `cafe-21`, `cafe-25`, `cafe-26`, `cafe-27`, `cafe-01`, `cafe-08`), then the remaining cafe rows as an extend band, scheduled with `src/curriculum/srs.js`.
- **Listen:** those phrasebook ids, plus lesson words `il06-w1`–`il06-w7` and `i-13-w1`–`i-13-w9`.
- **Speak:** `speak-survival-cafe-1` (12 items, machine-built, unverified).
- **Hold:** every phrasebook row in this unit is already `native-speaker-needed: pointing and register`. Gendered cafe lines must be checked for feminine forms. Food names (חוּמוּס, פָלָאפֶל, שַׁקְשׁוּקָה) need a native pass on pointing and everyday register.

### pu-directions — Asking for and following directions

- **Lessons:** il11 Directions; I-15 Directions: streets, corners and “how do I get to”.
- **Grammar note:** אֵיפֹה vs אֵיךְ מַגִּיעִים לְ…; directional adverbs יָמִינָה, שְׂמֹאלָה, יָשָׁר; gendered imperatives לֵךְ / לְכִי, פְּנֵה / פְּנִי; frozen location phrases עַל יַד, מוּל, בַּפִּנָּה.
- **SRS:** 12 core ids (`directions-01`, `02`, `05`, `06`, `07`, `08`, `09`, `10`, `03`, `04`, `11`, `15`), then the remaining directions rows.
- **Listen:** those phrasebook ids, plus `il11-w1`–`il11-w6` and `i-15-w1`–`i-15-w15`.
- **Speak:** `speak-survival-directions-1` (12 items; some have no `audioId` yet).
- **Hold:** same native-speaker-needed tag. Imperative gender pairs and the impersonal מַגִּיעִים need a native pass. `directions-15` (show me on the map) is already in the phrasebook; the lesson noun מַפָּה is the I-40 / lesson-lexicon form, not a new word here.

## What is still held

- Native review of all phrasebook situations and of both built units (pointing, register, gendered forms).
- Native review before any planned unit is built out with extra Hebrew.
- Divine Name, default rite, and גּוֹי / גּוֹיָה cards — unchanged, including in pu-shabbat-table.
- Festival-specific greetings still without a sourced token stay in their existing hold (see `docs/review/JOHN-DECISIONS.md`); I-50 already has the greetings that were accepted into lessons.
- Audio files are not in this worktree; listening drills name manifest ids only.
- Do not invent recordings, do not add a 126th lesson, and do not wire these units into the app until a native pass and a small player hook have been reviewed.

## Where the code already is

| Need | Reuse |
|---|---|
| Spaced repetition | `src/curriculum/srs.js`; vocab reviews in `srs.vocab` |
| Phrase lines and audio ids | `data/corpus/phrasebook.json` + audio manifest (israeli-only) |
| Lesson words and audio ids | `data/curriculum/lessons.json` + `progress.js` word ids `<lessonId>-w<n>` |
| Speaking | `data/speak/sets/speak-survival-*.json` and `src/speak` |
| Situation list | phrasebook `situations` (greetings, politeness, fillers, cafe, shop, taxi, directions, numbers, small-talk, help) |
