# Practical Hebrew: The 194-Page Plan

Lane C, round 3. This plan turns the Israel track into a structured conversation course of 194 pages in 36 units: one real
situation per unit, one clear grammar point per grammar page, spaced review on every page, and listening and speaking drills.
The first 20 pages are written in full. The model is the way Babbel builds a course; the Hebrew is ALEF's own.

- Outline data: `data/curriculum/practical-pages/outline.json` (every unit and page id, kind, title, status and route)
- First 20 pages: `data/curriculum/practical-pages/first-20.json`, readable copy in `docs/curriculum/PRACTICAL-FIRST-20-PAGES.md`
- Page schema: `data/curriculum/practical-pages/page.schema.json` (v3, a superset of the v2 page)
- Tests: `tests/curriculum.practical-pages.test.js` (10 tests)
- Builder: the page builder script kept with the lane's working files; it reads only repo data

## One Course, Not Two

There are two drafts of this idea on GitHub. `feature/lesson-integrity-2026-11-10` has the Practical course: route `#/practical`,
33 units and 162 pages in `data/curriculum/practical/<unit>.json`, with a working view, progress and a clip map. This branch has
`#/israel-units`, 13 units built from whole lessons. They should not both ship. The plan:

1. **`#/practical` is the home.** Its unit ids, file layout and v2 page shape stay. Every page id in this plan uses its pattern
   (`pu-<unit>-pNN`), and the first 20 pages replace the first 20 v2 pages one for one.
2. **`#/israel-units` retires when the branches merge.** Its grammar points move into the grammar pages listed below. The route
   then redirects to `#/practical`, and `israelUnits.v1` progress is dropped (it only records review dates).
3. **Three units are added** so every Israel-track lesson has a home: `pu-verbs` (il16, il19), `pu-conversation` (il23, il24) and
   `pu-army` (I-18). The test fails if any Israel-track lesson is left out. The Practical branch's own plan left il16, il19, il23 and il24 out
   because they teach grammar or pronunciation, not a situation. Here they become `pu-verbs` and `pu-conversation`: units built
   around a grammar point, placed where a learner needs it.

## Where Each Piece Lives

| Piece | Path | Status |
|---|---|---|
| Course index (units, totals) | `data/curriculum/practical-units.json` → `data/curriculum/practical/index.json` | on the Practical branch |
| One file per unit, with its pages | `data/curriculum/practical/<unit>.json` | on the Practical branch; first 20 pages here in v3 |
| Page outline | `data/curriculum/practical-pages/outline.json` | this branch |
| Page schema | `data/curriculum/practical-pages/page.schema.json` | this branch |
| Clip map | `data/curriculum/practical/clip-map.json` | on the Practical branch |
| Routes | `#/practical`, `#/practical/:id`, `#/practical/:id/:page` in `src/shell/router.js` | on the Practical branch |
| Nav entry | `nav.practical` ("Practical") in `src/shell/i18n.js`; section and parent in `src/shell/nav-model.js` | on the Practical branch |
| View | `src/curriculum/practical.view.js` | needs the v3 fields (below) |
| Review store | `srs.practical`, through `src/curriculum/srs.js` | on the Practical branch |

## The Page, v2 to v3

v3 only adds optional fields, so the current view keeps working on a v3 page. Required (v2): `id`, `title`, `order`,
`grammarNote`, `items[]`, `srsQueue[]`, `listenIds[]`. Added (v3):

- `kind`: learn, grammar, dialogue, listen, speak, review or check. This sets the page rhythm.
- `can`: the can-do line ("Ask how someone is, to a man or to a woman.").
- `grammar`: `point`, `body` and `examples[]`. Examples point at the page's own items. Any Hebrew in the body must appear in this
  page's or an earlier page's items. In v2, `grammarNote` described the data files; in v3 it is the real note.
- `items[].audio`: `clipId`, `status` (tts, recorded or gap), `voices`. Also `form` (to or by a man or a woman), `register`
  (slang or formal) and `speaker` for dialogue lines.
- `listen[]`: hear a clip, pick the meaning from three of the page's items.
- `speak[]`: a situation in English, the line to say, its transliteration and the clip to compare with.
- `reviewDays` (1, 3, 7, 14, 30) and `reviewOf[]`: items from earlier pages that this page queues with band `review`.
- `culture` and `dialogue` (with `setting` and line ids from `data/curriculum/dialogues.json`).

**View work needed:** `practical.view.js` should show `can` under the title, `grammar.point` as the heading of the grammar box,
`speak[]` as prompt cards, `listen[]` as a pick-the-meaning round, and a `form` tag beside gendered items.

## The Rhythm of a Unit

| Babbel idea | ALEF page kind | What the learner does |
|---|---|---|
| Structured practical units | one unit per situation, L0 to L4 | Learn what a real situation needs, in order |
| Clear grammar explanations | `grammar` (33 pages) | Learn one point, shown with the page's own lines |
| Practical conversation | `dialogue` (10 pages) | Read a short scene, then practise its lines |
| Targeted listening | `listen` (13 pages), plus `listen[]` on every page | Hear a clip, pick the meaning |
| Targeted speaking | `speak` (30 pages), plus `speak[]` on every page | Say the line for a situation, then compare |
| Spaced repetition reviews | `review` (31 pages), plus `reviewOf[]` on every page | Earlier items come back on a 1, 3, 7, 14, 30-day schedule |
| Level checks | `check` (5 pages) | Mixed items from every unit in the level |

## Full Outline (194 Pages)

### L0: First words

**`pu-greetings` Greetings and Courtesy** (7 pages) · lessons il01 · dialogue `d-smalltalk` · phrasebook `greetings`

- `pu-greetings-p01` learn: Hello and Goodbye **(written)**
- `pu-greetings-p02` grammar: Good Morning to Good Night **(written)**
- `pu-greetings-p03` grammar: How Are You? **(written)**
- `pu-greetings-p04` learn: Fine, Thanks **(written)**
- `pu-greetings-p05` dialogue: Nice to Meet You **(written)**
- `pu-greetings-p06` learn: Shabbat and Holiday Greetings **(written)**
- `pu-greetings-p07` review: Good Wishes and Unit Review **(written)**

**`pu-politeness` Please, Sorry and Being Polite** (5 pages) · lessons il01 · phrasebook `politeness`

- `pu-politeness-p01` learn: Thank You and Please **(written)**
- `pu-politeness-p02` grammar: Sorry and Excuse Me **(written)**
- `pu-politeness-p03` learn: Yes, No and Maybe **(written)**
- `pu-politeness-p04` listen: Street Hebrew **(written)**
- `pu-politeness-p05` review: Enough, It Will Be Fine, and Unit Review **(written)**

**`pu-fillers` Sounding Local** (6 pages) · lessons il02 · phrasebook `fillers`

- `pu-fillers-p01` learn: So, Well, But **(written)**
- `pu-fillers-p02` learn: Right, Really, Just **(written)**
- `pu-fillers-p03` grammar: I Don't Understand **(written)**
- `pu-fillers-p04` grammar: Do You Speak English? **(written)**
- `pu-fillers-p05` speak: Slower, Please **(written)**
- `pu-fillers-p06` review: What Does It Mean? and Unit Review **(written)**

**`pu-numbers` Numbers, Prices and Time** (7 pages) · lessons il04, il05 · phrasebook `numbers`

- `pu-numbers-p01` grammar: One to Five **(written)**
- `pu-numbers-p02` learn: Six to Ten **(written)**
- `pu-numbers-p03` learn: Twenty, Thirty, a Hundred, a Thousand
- `pu-numbers-p04` grammar: What Time Is It?
- `pu-numbers-p05` learn: Today, Tomorrow, Yesterday
- `pu-numbers-p06` listen: Hear the Number
- `pu-numbers-p07` review: Unit Review

**`pu-introducing` Introducing Yourself** (5 pages) · lessons il03 · dialogue `d-smalltalk`

- `pu-introducing-p01` grammar: My Name Is
- `pu-introducing-p02` learn: Where Are You From?
- `pu-introducing-p03` dialogue: Small Talk at a Party
- `pu-introducing-p04` speak: Say It About Yourself
- `pu-introducing-p05` check: Level 0 Check


### L1: Getting around

**`pu-cafe` Ordering at a Cafe** (10 pages) · lessons il06, il07, I-13 · dialogue `d-cafe` · phrasebook `cafe`

- `pu-cafe-p01` learn: Coffee and Tea
- `pu-cafe-p02` grammar: I Want: Man and Woman
- `pu-cafe-p03` learn: Something to Eat
- `pu-cafe-p04` grammar: How Much Is It?
- `pu-cafe-p05` dialogue: At the Counter
- `pu-cafe-p06` listen: Hear the Order
- `pu-cafe-p07` learn: Here or To Go
- `pu-cafe-p08` speak: Order for Yourself
- `pu-cafe-p09` learn: Paying and Thanks
- `pu-cafe-p10` review: Unit Review

**`pu-restaurant` Ordering at a Restaurant** (10 pages) · lessons il06, il07, I-13, I-38 · dialogue `d-restaurant`

- `pu-restaurant-p01` learn: A Table for Two
- `pu-restaurant-p02` learn: The Menu
- `pu-restaurant-p03` grammar: The: הַ and Adjectives
- `pu-restaurant-p04` dialogue: Ordering a Meal
- `pu-restaurant-p05` learn: Dietary Needs
- `pu-restaurant-p06` listen: Hear the Waiter
- `pu-restaurant-p07` speak: Ask for the Bill
- `pu-restaurant-p08` learn: Complaints, Politely
- `pu-restaurant-p09` grammar: Can I Have...?
- `pu-restaurant-p10` review: Unit Review

**`pu-shop` Shopping and Paying** (9 pages) · lessons il08, il09, I-12, I-43 · dialogue `d-shop` · phrasebook `shop`

- `pu-shop-p01` learn: In the Shop
- `pu-shop-p02` grammar: Numbers with Nouns
- `pu-shop-p03` learn: Sizes and Colours
- `pu-shop-p04` dialogue: Trying On a Shirt
- `pu-shop-p05` grammar: This and That
- `pu-shop-p06` listen: Hear the Price
- `pu-shop-p07` speak: Ask to Try It On
- `pu-shop-p08` learn: Paying by Card
- `pu-shop-p09` review: Unit Review

**`pu-directions` Asking for and Following Directions** (7 pages) · lessons il11, I-15 · dialogue `d-directions` · phrasebook `directions`

- `pu-directions-p01` learn: Where Is...?
- `pu-directions-p02` grammar: Right, Left, Straight
- `pu-directions-p03` dialogue: Where Is the Bus Station?
- `pu-directions-p04` learn: Near and Far
- `pu-directions-p05` listen: Follow the Directions
- `pu-directions-p06` speak: Ask the Way
- `pu-directions-p07` review: Unit Review

**`pu-transport` Taxi, Bus and Train** (9 pages) · lessons il10, I-11, I-23 · dialogue `d-taxi` · phrasebook `taxi`

- `pu-transport-p01` learn: Taking a Taxi
- `pu-transport-p02` grammar: To and From: לְ and מִ
- `pu-transport-p03` dialogue: A Taxi to the Airport
- `pu-transport-p04` learn: The Bus
- `pu-transport-p05` learn: The Train
- `pu-transport-p06` listen: Hear the Stop
- `pu-transport-p07` speak: Tell the Driver Where
- `pu-transport-p08` learn: Tickets and the Rav-Kav
- `pu-transport-p09` review: Unit Review

**`pu-small-talk` Small Talk** (8 pages) · lessons il13, I-25, I-36 · dialogue `d-smalltalk` · phrasebook `small-talk`

- `pu-small-talk-p01` learn: Where Are You From?
- `pu-small-talk-p02` grammar: Questions: מָה, מִי, אֵיפֹה
- `pu-small-talk-p03` dialogue: Nice to Meet You
- `pu-small-talk-p04` learn: Work and Studies
- `pu-small-talk-p05` listen: Hear the Question
- `pu-small-talk-p06` speak: Talk About Yourself
- `pu-small-talk-p07` learn: Keeping It Going
- `pu-small-talk-p08` check: Level 1 Check


### L2: Daily life

**`pu-verbs` Verbs: Now and Yesterday** (5 pages) · lessons il16, il19

- `pu-verbs-p01` grammar: Present Tense: Four Forms
- `pu-verbs-p02` learn: Everyday Verbs
- `pu-verbs-p03` grammar: Past Tense: What I Did
- `pu-verbs-p04` speak: Say What You Did Yesterday
- `pu-verbs-p05` review: Unit Review

**`pu-family` Family and Who You Are** (5 pages) · lessons il14, I-42

- `pu-family-p01` learn: My Family
- `pu-family-p02` grammar: My, Your, His, Her
- `pu-family-p03` learn: Ages and Birthdays
- `pu-family-p04` speak: Describe Your Family
- `pu-family-p05` review: Unit Review

**`pu-home` Home and Repairs** (4 pages) · lessons I-44

- `pu-home-p01` learn: Rooms and Things
- `pu-home-p02` learn: Something Is Broken
- `pu-home-p03` speak: Call the Landlord
- `pu-home-p04` review: Unit Review

**`pu-time` Days, Time and Dates** (5 pages) · lessons il12

- `pu-time-p01` learn: Days of the Week
- `pu-time-p02` grammar: Telling the Time
- `pu-time-p03` learn: Dates and Months
- `pu-time-p04` listen: Hear the Time
- `pu-time-p05` review: Unit Review

**`pu-weather` Weather and What to Take** (4 pages) · lessons il15, I-24

- `pu-weather-p01` learn: Hot, Cold, Rain
- `pu-weather-p02` grammar: It Is: No Word Needed
- `pu-weather-p03` speak: Talk About the Weather
- `pu-weather-p04` review: Unit Review

**`pu-hotel` Hotel and Booking** (5 pages) · lessons il17 · dialogue `d-hotel`

- `pu-hotel-p01` learn: At Reception
- `pu-hotel-p02` dialogue: Checking In
- `pu-hotel-p03` grammar: I Have, You Have: יֵשׁ לִי
- `pu-hotel-p04` speak: Ask for Something in the Room
- `pu-hotel-p05` review: Unit Review

**`pu-phone` Phone, SIM and Messages** (4 pages) · lessons il22, I-16

- `pu-phone-p01` learn: Buying a SIM
- `pu-phone-p02` learn: On the Phone
- `pu-phone-p03` speak: Leave a Message
- `pu-phone-p04` review: Unit Review

**`pu-apartment` Looking at an Apartment** (4 pages) · lessons I-17

- `pu-apartment-p01` learn: Rooms and Rent
- `pu-apartment-p02` grammar: Is There...? יֵשׁ and אֵין
- `pu-apartment-p03` speak: Questions for the Owner
- `pu-apartment-p04` review: Unit Review

**`pu-plans` Making Plans** (4 pages) · lessons il20

- `pu-plans-p01` learn: When Are You Free?
- `pu-plans-p02` grammar: Want To: רוֹצֶה Plus a Verb
- `pu-plans-p03` speak: Suggest a Plan
- `pu-plans-p04` review: Unit Review

**`pu-opinions` Opinions and Preferences** (4 pages) · lessons il21

- `pu-opinions-p01` learn: I Like, I Don't Like
- `pu-opinions-p02` grammar: I Think That: שֶׁ
- `pu-opinions-p03` speak: Give Your Opinion
- `pu-opinions-p04` review: Unit Review

**`pu-driving` Driving and the Road** (4 pages) · lessons I-39

- `pu-driving-p01` learn: Signs and Roads
- `pu-driving-p02` learn: Parking and Fuel
- `pu-driving-p03` speak: Ask a Driver
- `pu-driving-p04` review: Unit Review

**`pu-hiking` Hiking and the Trail** (4 pages) · lessons I-40

- `pu-hiking-p01` learn: On the Trail
- `pu-hiking-p02` learn: Water and Safety
- `pu-hiking-p03` speak: Ask About the Trail
- `pu-hiking-p04` review: Unit Review

**`pu-beach` At the Beach** (3 pages) · lessons I-41

- `pu-beach-p01` learn: Sun and Sea
- `pu-beach-p02` speak: At the Beach Kiosk
- `pu-beach-p03` review: Unit Review

**`pu-conversation` Putting It Together** (4 pages) · lessons il23, il24

- `pu-conversation-p01` learn: Sound Less Like an Outsider
- `pu-conversation-p02` dialogue: A Longer Conversation
- `pu-conversation-p03` speak: Your Turn
- `pu-conversation-p04` check: Level 2 Check


### L3: Living in Israel

**`pu-work` Work, Office and a Course** (5 pages) · lessons I-36, I-37

- `pu-work-p01` learn: At the Office
- `pu-work-p02` grammar: Requests at Work
- `pu-work-p03` learn: Meetings and Email
- `pu-work-p04` speak: Introduce Your Job
- `pu-work-p05` review: Unit Review

**`pu-health` Doctor, Clinic and Pharmacy** (7 pages) · lessons il18, I-14, I-20

- `pu-health-p01` learn: It Hurts Here
- `pu-health-p02` grammar: My Head Hurts: כּוֹאֵב לִי
- `pu-health-p03` learn: At the Clinic
- `pu-health-p04` learn: At the Pharmacy
- `pu-health-p05` listen: Hear the Instructions
- `pu-health-p06` speak: Describe What Hurts
- `pu-health-p07` review: Unit Review

**`pu-bank` Bank, Cash and Forms** (5 pages) · lessons I-21, I-48

- `pu-bank-p01` learn: At the Bank
- `pu-bank-p02` learn: Filling In a Form
- `pu-bank-p03` grammar: Must and Need: צָרִיךְ
- `pu-bank-p04` speak: Ask at the Counter
- `pu-bank-p05` review: Unit Review

**`pu-post` Post Office and Parcels** (4 pages) · lessons I-22

- `pu-post-p01` learn: Sending a Parcel
- `pu-post-p02` learn: Collecting a Parcel
- `pu-post-p03` speak: Ask Where Your Parcel Is
- `pu-post-p04` review: Unit Review

**`pu-emergencies` Emergencies and Calling for Help** (6 pages) · lessons I-46, il18 · phrasebook `help`

- `pu-emergencies-p01` learn: Help!
- `pu-emergencies-p02` learn: Calling an Ambulance or the Police
- `pu-emergencies-p03` grammar: Commands: Come, Call, Wait
- `pu-emergencies-p04` listen: Hear the Instructions
- `pu-emergencies-p05` speak: Say What Happened
- `pu-emergencies-p06` review: Unit Review

**`pu-delivery` Ordering Delivery** (4 pages) · lessons I-45

- `pu-delivery-p01` learn: The Order
- `pu-delivery-p02` learn: The Address
- `pu-delivery-p03` speak: Call the Courier
- `pu-delivery-p04` review: Unit Review

**`pu-social` Messages, Photos and Social Media** (4 pages) · lessons I-49

- `pu-social-p01` learn: Short Messages
- `pu-social-p02` grammar: Future Tense: I Will
- `pu-social-p03` speak: Reply to a Friend
- `pu-social-p04` review: Unit Review

**`pu-army` Army Slang Basics** (3 pages) · lessons I-18

- `pu-army-p01` learn: Words From the Army
- `pu-army-p02` listen: Hear It in Conversation
- `pu-army-p03` review: Unit Review

**`pu-news` Reading a Headline** (4 pages) · lessons I-47

- `pu-news-p01` learn: Headline Words
- `pu-news-p02` grammar: Reading Without Vowel Marks
- `pu-news-p03` learn: One Short Story
- `pu-news-p04` check: Level 3 Check


### L4: Shabbat and the year

**`pu-shabbat` Being Invited for Shabbat** (5 pages) · lessons I-19

- `pu-shabbat-p01` learn: The Invitation
- `pu-shabbat-p02` learn: At the Table
- `pu-shabbat-p03` grammar: Polite Requests at a Meal
- `pu-shabbat-p04` speak: Thank Your Hosts
- `pu-shabbat-p05` review: Unit Review

**`pu-holidays` Holiday Greetings and Everyday Wishes** (5 pages) · lessons I-50

- `pu-holidays-p01` learn: The Year at a Glance
- `pu-holidays-p02` learn: Greetings for Each Holiday
- `pu-holidays-p03` listen: Hear the Greeting
- `pu-holidays-p04` speak: Wish Someone Well
- `pu-holidays-p05` check: Final Check


## The First 20 Pages

`pu-greetings` p01–p07, `pu-politeness` p01–p05, `pu-fillers` p01–p06 and `pu-numbers` p01–p02, written in full: 103 items,
each with pointed Hebrew, transliteration, English and an audio clip id. Every page has a real grammar point, 1–3 speaking
prompts, a listening round, and from page 2 on, earlier items queued for review. The readable copy is
`docs/curriculum/PRACTICAL-FIRST-20-PAGES.md`.

Grammar covered in order: one word with two jobs; adjective after the noun, matching it; the your-ending for a man (ךָ) and a
woman (ךְ); negating with לֹא; three forms of welcome and הַ for the; masculine and feminine nouns; telling a man or a woman
to do something; בְּבַקָּשָׁה with two jobs; present tense changing with the speaker; לֹא as no and not; register; הַשֵּׁם;
filler words; questions made by tone; man's and woman's present-tense forms; אַתָּה and אַתְּ; אֶפְשָׁר with a to-verb as a
polite request with no gender; the impersonal אוֹמְרִים; and the two sets of numbers.

**Sources.** Every Hebrew line is copied by id from `data/corpus/phrasebook.json`, the audio manifests (which hold the woman's
forms the phrasebook leaves out, such as מַה שְׁלוֹמֵךְ? and אֲנִי מִצְטַעֶרֶת) or `data/curriculum/dialogues.json`. The test
re-reads each source and fails on any difference.

**Audio.** 101 of the 103 items have clips in the manifests, in both the man's and the woman's voice. These are text-to-speech
clips, not human recordings. The two gaps are dialogue lines `d-smalltalk-l1` and `d-smalltalk-l2`, which have no clips yet.

**Transliteration.** Phrasebook rows keep the phrasebook's transliteration. The 19 woman's forms and counting-set numbers that
come only from the audio manifest have transliteration written for these pages in the same spoken style ("ma shlomech?").
Each is marked `translitSource` and needs a native check.

## For Native Review

Found while writing; nothing changed in the sources:

- `d-smalltalk-l1` spells hi as הַיי; the phrasebook has הֵי.
- il02 has יָאללָה and סַבָּבָּה; the phrasebook has יַאלְלָה and סַבָּבָה. The second dagesh in סַבָּבָּה looks like a slip.
- `d-smalltalk-l7` has מְאוֹד; the phrasebook has מְאֹד. Both spellings are in use; one course should pick one.
- Counting-set numbers come first, which matches how numbers are said aloud. A teacher may prefer the other order.

## For John

1. **Which branch owns Practical.** The recommendation is the Practical branch's route and files, with this branch's 20 pages and
   outline merged in, and `#/israel-units` retired. Nothing merges without you.
2. **בְּעֶזְרַת הַשֵּׁם on `pu-politeness-p05`.** The page explains that הַשֵּׁם (the Name) is how speakers refer to God in
   daily speech without saying a divine name. It contains no divine name, but it is a decision about how God is spoken of, so it
   is held for you. Delete the page's grammar block to drop it.
3. **The eight divine-name holds from round 1 are unchanged** (see `docs/review/LESSON-INTEGRITY-2026-11-10.md`).
4. **L4 (Shabbat and holidays)** sits at the end of the Israel course. Another option is to link it to the synagogue track.
5. **Native review** of the 20 pages, the 19 transliterations, and the items above, before any page leaves draft.

## What Is Left

- Write the remaining 174 pages to this standard. The builder already checks every source, clip and grammar run.
- View support for the v3 fields, listed above.
- Clips for the dialogue lines, so dialogue pages can play.
- A native-speaker read of everything marked `nativeReview`.
