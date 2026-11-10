# Babbel-style Hebrew curriculum: 100–200 pages

John asked (10 November 2026, 2:09 AM America/Toronto) for 100–200 pages of Babbel-style learning: short conversation units with a clear grammar note, spaced-review queues, and targeted listening and speaking. This is the scale-up plan for that shape, and it says where the pages live in the repo and in the app.

It does not add a 126th lesson (integrity tests lock the count at 125). It does not change the divine Name, the default rite, or גּוֹי data. It is not a native-speaker or clergy review.

Written 10 November 2026, America/Toronto, on `feature/lesson-integrity-2026-11-10`. When Claude lane C delivers a plan in `LANE-C-r2.md` or `r3.md`, that structure wins where the two plans conflict; this file will be reconciled and only sourced Hebrew will be implemented.

## What a “page” is

A **page** is one short screen, closer to a Babbel lesson step than to a 50-word intermediate lesson:

1. A title and a short **grammar note** in English, naming only forms that already appear on that page.
2. A handful of **items** (typically 4–8 lines or words).
3. A **spaced-review queue** that reuses `src/curriculum/srs.js` (Again / Hard / Good / Easy). Cards are stored under `srs.practical`, one card per item, keyed `unitId|itemId`.
4. **Listening** of existing audio-manifest ids (phrasebook ids, israeli-only; lesson-word ids such as `il14-w2`). Missing files are a known worktree/audio issue, not a reason to invent clips.
5. **Speaking** that reuses a machine-built survival or theme set already in `data/speak/sets/`. Those sets are unverified.

Pages belong to a **unit** (a situation: shopping, family, the pharmacy). Units belong to a **level** (a band of situations, roughly A0 through everyday A2 plus a Shabbat-and-holiday conversation band). The 125 lessons stay where they are; a page may *cite* a lesson, never replace it.

## Where it lives

| Piece | Place |
|---|---|
| Learner entry | Preview nav item **Practical** (`nav.practical` / `עברית מעשית`), Learn section |
| List of levels and units | `#/practical` |
| One unit (its pages) | `#/practical/:id` e.g. `#/practical/pu-family` |
| One page | `#/practical/:id/:page` e.g. `#/practical/pu-family/pu-family-p02` |
| View | `src/curriculum/practical.view.js` (already on-demand; not in first install) |
| Router | `practical`, `practicalunit`, `practicalpage` in `src/shell/router.js` |
| Index (small) | `data/curriculum/practical/index.json` |
| One file per unit | `data/curriculum/practical/<unitId>.json` |
| Compat pointer | `data/curriculum/practical-units.json` (schema 2: lists units and file paths, no bulky item copies) |
| This plan | `docs/curriculum/BABBEL-STYLE-CURRICULUM-PLAN.md` |
| Earlier unit map | `docs/curriculum/PRACTICAL-UNITS-PLAN.md` (still valid for the first six units) |

### Precache

Unit JSON must not sit in the v0 first-install list (already tight, under 3.95 MiB). `data/curriculum/practical/` is an **on-demand prefix**, like `data/curriculum/lessons-intermediate/`. The service worker runtime-caches a unit file the first time that unit is opened, or all at once from “Download everything”. The index is small and is also on-demand. `src/curriculum/practical.view.js` stays on-demand with the other preview views.

### What is not a home for these pages

- Not `data/curriculum/lessons.json` and not a 126th lesson.
- Not a new track that can be a prerequisite of r- or I- lessons (prerequisites cannot cross tracks).
- Not a package of new audio. Pages name ids that already exist in the manifest; they do not invent recordings.

## Hebrew rules

A built page may only show Hebrew that is already in:

- `data/corpus/phrasebook.json`, or
- `data/curriculum/lessons.json` (cited by lesson id and word index), or
- `data/curriculum/dialogues.json` (a line already in a dialogue).

That Hebrew is **sourced**, not **native-checked**. The phrasebook is already tagged `native-speaker-needed`. Lessons and dialogues remain `proofread: false` / `needsNativeReview`. Every unit and page is `status: built-draft`, `nativeReview: true`, `proofread: false`. The learner-facing badge stays on.

**New Hebrew**, if a later pass ever composes a line that is not in those files, must be marked `needs-native-review` and must never be stored as verified, proofread, or clergy-reviewed. This pass does not compose any.

Held and not used as new practice material: the divine Name (including הַשֵּׁם / בְּעֶזְרַת הַשֵּׁם / אֲדֹנָי / יְהוָה), default rite choices, and גּוֹי / גּוֹיָה cards. Festival greetings that still have no sourced token (מוֹעֲדִים לְשִׂמְחָה, צוֹם קַל, חַג אוּרִים שָׂמֵחַ) stay out rather than being invented. I-19 and I-50 already hold the greetings that were accepted into lessons; those may be cited.

## Levels, units, and pages

Five levels. The unit ids are stable. Page ids are `{unitId}-p{nn}`. Counts below are the built pages this branch can fill from current sources; a later native pass can add pages, never by treating invented lines as verified.

### L0 — First conversations

The first week of spoken Hebrew: greet, be polite, fill a pause, say a number or a price.

| Unit | Sources | Built pages (aim) |
|---|---|---|
| `pu-greetings` | phrasebook `greetings`; il01 | hello, thanks, time-of-day, how-are-you, goodbyes, wishes |
| `pu-politeness` | phrasebook `politeness` | please, sorry, after you, could you… |
| `pu-fillers` | phrasebook `fillers`; il02 | yaani, typi, ke’ilu, and the other sourced fillers |
| `pu-numbers` | phrasebook `numbers`; il04, il05 | 1–10, 11–100, shekels and prices |

### L1 — Town and table

Getting a coffee or a meal, paying, finding a street, riding a bus, making small talk.

| Unit | Sources | Built pages (aim) |
|---|---|---|
| `pu-cafe` | phrasebook `cafe`; il06, il07, I-13; dialogue `d-cafe` | ordering, drinks, the bill |
| `pu-restaurant` | cafe lines that work at a table; I-13, I-38; `d-restaurant` | a table, the menu, food, paying (no separate restaurant phrasebook) |
| `pu-shop` | phrasebook `shop`; il08, il09, I-12, I-43; `d-shop` | prices, sizes, cash and card |
| `pu-directions` | phrasebook `directions`; il11, I-15; `d-directions` | where, left and right, how do I get to |
| `pu-transport` | phrasebook `taxi`; il10, I-11, I-23; `d-taxi` | taxi, bus, train, tickets |
| `pu-small-talk` | phrasebook `small-talk`; il13, I-25, I-36; `d-smalltalk` | name, where from, work, feelings |

### L2 — Daily life

People you live with, the clock, the weather, a hotel, a phone.

| Unit | Sources | Built pages (aim) |
|---|---|---|
| `pu-family` | il14, I-42 | family words, asking about children |
| `pu-home` | I-44, and hotel/home lines already in lessons | something is broken, the landlord, when can you come |
| `pu-time` | il12 | today, tomorrow, hours, days, Shabbat as a weekday name |
| `pu-weather` | il15, I-24 | hot, cold, rain, what to take |
| `pu-hotel` | il17; `d-hotel` | booking, checking in |
| `pu-phone` | il22, I-16 | SIM, messages, battery, appointments |

### L3 — Work and services

The office, the clinic, the bank, an emergency.

| Unit | Sources | Built pages (aim) |
|---|---|---|
| `pu-work` | I-36, I-37 | office, meeting, a course |
| `pu-health` | il18, I-14, I-20 | doctor, pharmacy, “where does it hurt”, how often to take it |
| `pu-bank` | I-21, I-48 | accounts, cash machine, signing a form |
| `pu-post` | I-22 | parcels, stamps, waiting your turn |
| `pu-emergencies` | phrasebook `help`; I-46 | police, ambulance, fire, I lost my passport |
| `pu-delivery` | I-45 | pizza, address, floor, the courier |

### L4 — Shabbat and holiday conversation

Everyday invitation and greeting language already in the lessons. Not a liturgy course, and not a place to reopen Name or rite decisions.

| Unit | Sources | Built pages (aim) |
|---|---|---|
| `pu-shabbat` | I-19 | being invited, what to bring, when to come, thanks |
| `pu-holidays` | I-50 (greeting words only; Name-bearing lines held out) | chag sameach, shanah tovah, gmar chatimah tovah, everyday wishes |

## How the four practice pieces fit on a page

```
Level → Unit → Page
                 ├─ grammar note (English, forms already on the page)
                 ├─ items (sourced Hebrew + English + translit)
                 ├─ SRS queue  →  src/curriculum/srs.js  →  store key srs.practical
                 ├─ listen     →  existing manifest ids (phrasebook / lesson-word)
                 └─ speak      →  existing data/speak/sets/speak-*.json
```

The Practical list groups units by level. Opening a unit lists its pages with the native-review badge. Opening a page is the practice screen: the note, the cards, Listen, and the speak set. Related lessons link to `#/learn?lesson=il14` or `#/intermediate/I-14` and are labelled as existing lessons, not new ones.

## Schema (compatible with the first units, version 2)

`data/curriculum/practical/index.json`:

```json
{
  "schema": "alef-practical-curriculum/2",
  "proofread": false,
  "nativeReview": "required",
  "levels": [{ "id": "L0", "title": "First conversations", "order": 0 }],
  "units": [{
    "id": "pu-family",
    "title": "Family and who you are",
    "level": "L0",
    "file": "data/curriculum/practical/pu-family.json",
    "pageCount": 4,
    "status": "built-draft",
    "nativeReview": true
  }]
}
```

A unit file adds a `pages` array. Each page has `id`, `title`, `order`, `grammarNote`, `items` (the same item shape as today’s units: `id`, `source`, `he`, `en`, `translit`, `review`, `listen`), `srsQueue`, `listenIds`, and `speakSet`. Item `he` / `en` / `translit` are byte copies of the source row.

## What this branch builds now, and what waits

- **Built now (this branch):** 33 units, 162 pages, 734 sourced items, generated by `tools/curriculum/build_practical_pages.py` from the phrasebook, the Israel-track lessons, and the seven existing dialogues, with Name-bearing and goy lines left out. That sits inside the 100–200 page target; later sourced lines can fill the remaining room, never by treating invented Hebrew as verified.
- **Planned, not filled:** any page that would need a new Hebrew sentence (more hotel small talk, a fuller restaurant waiter set, reply-forms for unsourced festival greetings). Those stay titles in this plan until a sourced line exists, or until a native reviewer writes one flagged `needs-native-review`.
- **Claude’s plan:** if `LANE-C-r2.md` / `r3.md` ships a different level list, schema, or first 20 pages, that structure wins. Implementation still checks every Hebrew word against the app’s sources before it is stored as a built page.

## Held

Divine Name; default rite; גּוֹי / גּוֹיָה; clergy and native review of all of this material; unsourced festival greetings; the 22 audio-only test failures in a worktree with no audio checked out; no merge to main and no deploy.

## Sourced Hebrew still not paged

These Israel-track lessons still have unused clean words and were left out of the 162 built pages on purpose, not because the Hebrew is missing:

- **I-18 Army slang** — the lesson already exists, but the register is slang. It stays out of Practical until a native reviewer says those lines should be taught as conversation.
- **il16, il19, il23, il24** — these are grammar or pronunciation lessons (present, past, accent markers, capstone), not situation packs. Their words can fill later pages if Claude's schema asks for grammar screens; they were not invented into new "verified" lines.

Room to 200 pages should be filled only with further sourced lines, or with Claude's first 20 pages once they land and pass a source check.
