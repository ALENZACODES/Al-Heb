# Intermediate lessons I-01..I-50 (draft, not registered)

Status 2026-11-04. Fifty draft lessons (I-01..I-25 stage 1, I-26..I-50 stage 2) in `data/curriculum/lessons-intermediate/I-NN.json`, indexed by
`data/curriculum/intermediate-index.json`, tested by `tests/curriculum.intermediate.test.js`
(`node --test tests/curriculum.intermediate.test.js`). They are **not** listed in `data/curriculum/lessons.json`;
nothing in `src/` loads them yet. Every lesson has `status: "draft"`, `proofread: false`, `needsNativeReview: true`.
No native speaker, rabbi, cantor or educator has reviewed any of it, nothing was tested with learners, and no audio exists.

## Where the Hebrew comes from

The only Hebrew sources are `data/vocab/words.json`, `data/corpus/*.json` and `data/service/*.json`. The test harvests
every Hebrew string in those files into a token set (NFC, cantillation removed, maqaf and punctuation split) and checks
that every Hebrew string in every lesson is either a whole source entry or a composition of source tokens, pointing
included. Each lesson word carries a `source` ({file, id} for a whole entry; `{file: "composed", tokens}` otherwise).
What this guarantees: no word or pointing was typed from memory. What it does not guarantee: that a composed phrase is
idiomatic or grammatical, that a token's pointing in `words.json` is right (for example `words.json` points
"traffic light" as rimzur, so it was left out), or that the English glosses are good. Those need a native speaker.

Consequences of the rule, stated per lesson in each file's `note`: some natural phrases could not be written
(no pointed token for "kilo", "SIM", "elevator", "keep the change", "refuah shleimah", "hodu", "chazak chazak",
"yishar koach", feminine forms such as "shelach" and "mechapeset", most "to the ..." prefixed place names).
Hallel (I-07) is built from refrain fragments only because the full Hallel is a corpus gap (`g-hallel` in
`data/corpus/gaps.json`); in that lesson the word na in "ana Adonai hoshia na" is the dictionary token without the
Masoretic dagesh.

## Shape

Same fields as a `lessons.json` lesson (`id, track, level, title, letters, vowels, words, prayerLines, goals,
estMinutes, prerequisites`; `letters` and `vowels` are empty; `words[].translit` is `null` as in `lessons.json`) plus:

- `unit`: `synagogue` (I-01..I-10, `track: "read"`, `level: "black"`, the belt after grey in `belts.json`) or
  `israel` (I-11..I-25, `track: "israel"`, `level: "B1"`, the cap the existing test enforces).
- `status`, `proofread`, `needsNativeReview`, `note`.
- `pronunciation`: `{traditions, scheme: "siddur", generatedBy: "src/pronunciation/transliterate.js"}`; each word has
  `pronunciation.{israeli, sephardi, ashkenazi}` (synagogue) or `pronunciation.israeli` (Israel), machine output of the
  project's transliterator in the siddur scheme (israeli and sephardi are identical there). The test recomputes them.
- `exercises`: 12 to 20 per lesson, ids `I-NN-eMM`, at least four types per lesson. Types:
  - `recall` {he, en}: show the Hebrew, recall the meaning (a `word:` SRS card).
  - `produce` {en, options[], answer}: pick the Hebrew for the English; `answer` is the index of the correct option.
  - `match` {pairs[{he,en}]}: 3 to 5 pairs.
  - `order` {he, en}: put the whitespace tokens of `he` back in order (3+ tokens).
  - `respond` {cue, prompt?{he,en}, answer{he,en}}: call and response (Barchu, Kedushah, Amen, or a situation cue).
  - `gender` {m, f, en}: man and woman forms of one line (fits the gender-pairs screen).
  - `dialogue` {lines[{speaker a|b, he, en}], task}: a 2 to 5 line exchange; `task` says which part to say.
  - `fade` {line, lineIndex?, en}: fade-out recall of a registry line (fits `src/curriculum/fade.js`; `lineIndex` is
    1-based for multi-line entries).
  - `spot` {line, lineIndex?, target, en}: find `target` (a token of that registry line) in the line.
  - `register` {he, en, answer, options}: name the register of a phrasebook line; `answer` is copied from
    `data/corpus/phrasebook.json` and the test checks it.

The trailing `recall`/`produce` exercises in some lessons were filled from the lesson's own word list to reach the
minimum of twelve; `produce` distractors there are simply other words of the same lesson.

## Lessons

| id | unit | title | prereq |
|---|---|---|---|
| I-01 | synagogue | Shema and its blessings: Barchu, Shema, Baruch shem, V'ahavta | r51 |
| I-02 | synagogue | Amidah openings: open my lips, Avot, Kedushah responses | I-01 |
| I-03 | synagogue | Torah service responses: ark, aliyah blessings, returning the scroll | I-01 |
| I-04 | synagogue | Kaddish responses: Amen, Yehei shmei raba, Brich hu | I-01 |
| I-05 | synagogue | Kiddush: candles, wine, bread and the Shabbat verses | I-01 |
| I-06 | synagogue | Havdalah: wine, spices, flame and the separation blessing | I-05 |
| I-07 | synagogue | Hallel refrains: the lines the congregation sings back | I-01 |
| I-08 | synagogue | Aleinu: the closing prayer and where to bow | I-02 |
| I-09 | synagogue | Adon Olam: the closing hymn line by line | I-02 |
| I-10 | synagogue | Mi Shebeirach, healing and thanksgiving: the blessings said for people | I-03 |
| I-11 | israel | Bus and train: tickets, platforms and getting off | il24 |
| I-12 | israel | Shuk bargaining: prices, discounts and 'I'll take it' | I-11 |
| I-13 | israel | Cafe ordering: milk, sugar, sizes and the bill | I-11 |
| I-14 | israel | Pharmacy: pain, fever, prescriptions and how often to take it | I-11 |
| I-15 | israel | Directions: streets, corners and 'how do I get to' | I-11 |
| I-16 | israel | Phone and SIM: numbers, messages, battery and signal | I-11 |
| I-17 | israel | Apartment viewing: rooms, floor, rent and the landlord | I-11 |
| I-18 | israel | Army slang basics: how soldiers and their friends talk | I-11 |
| I-19 | israel | Shabbat invitation: being invited, what to bring, saying thanks | I-13 |
| I-20 | israel | Hospital and clinic: doctor, appointment, insurance, 'where does it hurt' | I-14 |
| I-21 | israel | Bank: accounts, cash machines, exchanging money and signing | I-11 |
| I-22 | israel | Post office: parcels, letters, stamps and waiting your turn | I-11 |
| I-23 | israel | Taxi: destination, meter, 'slower' and the receipt | I-11 |
| I-24 | israel | Weather: hot, cold, rain, sun and what to take | I-11 |
| I-25 | israel | Small talk: where you're from, how long you've been here, keeping in touch | I-19 |

Synagogue lessons reference registry ids only (`prayerLines`); the Kaddish lesson is Aramaic apart from its last line,
and the Aleinu text is the Edot HaMizrach version held in the registry.

## How main should register them (not done here)

1. Append the 50 objects (or just their `lessons.json` fields) to `data/curriculum/lessons.json` after `il24`, in
   index order, so `topoOrder()` in `src/curriculum/lessons.js` still resolves and `available()` unlocks I-01 after
   r51 and I-11 after il24 (I-36 and the rest chain from I-25). Keep the extra fields; `lessons.js` ignores unknown keys.
2. `tests/curriculum.lessons.test.js` will then need two changes: the read-track count cap (`read.length <= 60`
   becomes 61 with the synagogue unit) and the belts check (level `black` has `lessons: null` in `belts.json`, so
   either give black a range `I-01-I-10` or exempt `I-` ids from the `r`-number range check). The read-track
   decodability test passes as written because all 27 letters and 15 marks are taught by r51.
3. Add the new ids to `docs/curriculum/corpus-ids-needed.md` (that test checks every referenced prayer id is listed):
   `amidah-lips, avot-closing, kedushah-kadosh, kedushah-baruch, kedushah-yimloch, oseh-shalom, torah-barchu,
   ein-kamocha, gadlu, lecha-hashem, vezot-hatorah, etz-chaim, hashivenu, yehalelu, candle-shabbat,
   kiddush-gen-2-1-3, kiddush-shabbat-eve, hamotzi, kiddush-veshamru, kiddush-zachor, havdalah-opening,
   havdalah-spices, havdalah-flame, havdalah-hamavdil, num-12-13, hagomel, shehecheyanu, mi-sheberach-opening, yigdal`.
4. Wire `exercises` to screens: `fade`/`spot` map to `src/curriculum/fade.js` and the Spot It idea; `gender` to
   `gender.view.js`; `recall`/`produce`/`match` to review cards; `respond`, `dialogue`, `order`, `register` need a
   small new exercise screen (none exists). Audio ids do not exist for any item (lane 4).
5. Run `node tools/build-precache.mjs` if any `src/` view file is added (not run by this lane).
6. Native review before anything ships: glosses, composed phrases, register labels, and the Hallel and Mi Shebeirach
   gaps above.

## Stage 2: I-26..I-50

Same schema, same sourcing rule, same checks. 10 more synagogue lessons (I-26..I-35) and 15 more Israel lessons
(I-36..I-50); 14 to 18 exercises each (752 across all 50). Everything below is draft and unreviewed.

| id | unit | title | prereq |
|---|---|---|---|
| I-26 | synagogue | The full Torah service in order: ark, reading, lifting, returning | I-03 |
| I-27 | synagogue | Shabbat-morning Amidah responses: Kedushah, Sim Shalom, closing verses | I-02 |
| I-28 | synagogue | Yom Kippur: the few lines the corpus holds and the words around them | I-01 |
| I-29 | synagogue | Pesach: the seder blessings the corpus holds | I-05 |
| I-30 | synagogue | Sukkot: sukkah words and the blessings that carry over | I-29 |
| I-31 | synagogue | Purim: the miracle blessing and the words of the day | I-29 |
| I-32 | synagogue | Hanukkah: the three blessings, Hanerot Halalu and Maoz Tzur | I-05 |
| I-33 | synagogue | Birkat Hamazon openings: Zimun, the first blessing and Shir Hamaalot | I-05 |
| I-34 | synagogue | Before and after a journey: Hagomel, peace and the vocabulary of the road | I-10 |
| I-35 | synagogue | Shabbat-day Kiddush: V'shamru, Zachor, wine and bread | I-05 |
| I-36 | israel | Work: office, meeting, boss and interview | I-25 |
| I-37 | israel | University: courses, lectures, exams and scholarships | I-36 |
| I-38 | israel | Dating and going out: asking someone out, plans and compliments | I-36 |
| I-39 | israel | Driving: car, road, signs, fuel and parking | I-15 |
| I-40 | israel | Hiking: trail, mountain, stream, water and the map | I-24 |
| I-41 | israel | Beach: sea, sand, towel and swimming | I-24 |
| I-42 | israel | Kids: asking about children, school and play | I-25 |
| I-43 | israel | Supermarket: aisles, prices, bags and the checkout | I-12 |
| I-44 | israel | Repairs and the landlord: something is broken | I-17 |
| I-45 | israel | Ordering delivery: pizza, address, floor and the courier | I-13 |
| I-46 | israel | Emergencies: police, ambulance, fire and calling for help | I-20 |
| I-47 | israel | News headlines: government, elections, war and peace, prices | I-25 |
| I-48 | israel | Banking forms: name, number, signature and date | I-21 |
| I-49 | israel | Social media: posting, messages, photos and passwords | I-16 |
| I-50 | israel | Holiday greetings by festival: who says what, and when | I-19 |

### Gaps this stage ran into (not invented; nothing from this list appears in any lesson)

Synagogue (no source file holds the text): Tefillat HaDerekh (propose `g-tefilat-haderech`); the Haggadah, Mah
Nishtanah, Dayenu and the Hallel for Pesach, Sukkot, Hanukkah (`g-hallel`); the festival Kiddush
(`g-festival-kiddush`); Kol Nidre, the Yom Kippur confession, Avinu Malkenu, Unetaneh Tokef, Ne'ilah
(`g-high-holidays`); lulav and etrog blessings and Hoshanot; the Megillah blessings and reading and Al HaNisim;
the Birkat Hamazon blessings 2 to 4 (`g-birkat-hamazon-rest`); the Torah reading and haftarah texts; the Musaf Amidah
(`g-musaf-amidah`). I-28 to I-31 are therefore thin on purpose: they teach vocabulary, the Shema lines and the
registry blessings that those occasions share, and each says so in its `note`.

Israel (no pointed token in `words.json`, phrasebook or other sources): kilo, SIM, elevator, arnona, furnished,
degrees, umbrella, "to the" place names (Tel Aviv, Haifa, Jerusalem), "traffic light" with a prefix, student
(`stuDENT`), library, timetable, email, salary, CV, "to resign", "date of birth", "ID number", fee, transfer, "plumber",
leak, "air-conditioner", "to fix", registered mail, post code, lifeguard, jellyfish, emergency numbers, "fire brigade",
"prime minister", economy, most app and social-media words, and most feminine participles (`oveDET`, `noHEget`,
`shoLEchet`, `lomeDET`). Holiday-specific greetings other than the generic "chag sameach" and "shana tova" (for
example the Hanukkah, Pesach and Yom HaAtzmaut forms) are also absent, so I-50 covers only Shabbat, week, holiday,
new year, congratulations, luck and health. Several natural-sounding sentences are composed from allowed tokens
(for example "efshar latzet ha'erev", "nesiah tovah") and are not attested phrasebook lines;
they need a native speaker.

### Image slots

`data/curriculum/intermediate-image-slots.json` has two slots per lesson (100 in all): `{id: "I-NN-img1|img2", role,
scene}` with a one-line scene description for a later image prompt. The `rules` field says: no text, letters, numbers or
readable signs in any image; generic people, no real individuals; one photographic style across the set; ritual
objects plainly and respectfully, no legible sacred text. No image has been generated, ingested or reviewed, and the
file is not read by any screen. The test checks two slots per lesson, unique ids, one-line scenes with no Hebrew and no
request for text.

### Regenerating (`tools/curriculum/intermediate/`)

The lesson JSON, the index and the slot map are generated from Python files in `tools/curriculum/intermediate/`:
`syn.py`, `isr.py` (I-01..I-25), `syn2.py`, `isr2.py` (I-26..I-50), `dsl.py` (exercise constructors), `sources.py`
(harvests the allowed Hebrew), `build.py` (validates, adds `source` and `pronunciation`, writes files and the index),
`slots.py` (image slot map), and two helpers: `chk.py` (read candidate Hebrew lines on stdin, report phrases or
tokens not in the sources) and `skel.py`, `src_of.py`, `find2.py` (look up pointed forms by unpointed skeleton, find
where a token occurs). Run from the repo root:

    python3 -I tools/curriculum/intermediate/build.py
    python3 -I tools/curriculum/intermediate/slots.py
    node --test tests/curriculum.intermediate.test.js

`build.py` prints every Hebrew token it cannot find in the sources (`MISSING`) and ends `ok 50 misses 0` when clean.
It needs `node` (it calls `src/pronunciation/transliterate.js`). Edit the Python, rerun, never hand-edit the JSON.
