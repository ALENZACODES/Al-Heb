# Practical Hebrew: The 189-Page Plan

Lane C, round 3. This plan turns the Israel track into a structured conversation course of 189 pages in 36 units: one real
situation per unit, one clear grammar point per grammar page, spaced review on every page, and listening and speaking drills.
The first 101 pages (levels 0 and 1, and the first six units of level 2) are written in full, and they show in the live `#/practical` course. The model is the way Babbel builds a course; the Hebrew is ALEF's own.

- Outline data: `data/curriculum/practical-pages/outline.json` (every unit and page id, kind, title, status and route)
- Written pages (101): `data/curriculum/practical-pages/written.json`, readable copy in `docs/curriculum/PRACTICAL-WRITTEN-PAGES.md`
- Page schema: `data/curriculum/practical-pages/page.schema.json` (v3, a superset of the v2 page)
- Tests: `tests/curriculum.practical-pages.test.js` (10 tests)
- Builder: the page builder script kept with the lane's working files; it reads only repo data

## One Course, Not Two

There are two drafts of this idea on GitHub. `feature/lesson-integrity-2026-11-10` has the Practical course: route `#/practical`,
33 units and 162 pages in `data/curriculum/practical/<unit>.json`, with a working view, progress and a clip map. This branch has
`#/israel-units`, 13 units built from whole lessons. They should not both ship. The plan:

1. **`#/practical` is the home** (decided by John on 2026-11-10). Its unit ids, file layout and v2 page shape stay. Every page id in this plan uses its pattern
   (`pu-<unit>-pNN`), and the written pages replace the matching v2 pages one for one.
2. **`#/israel-units` is retired** and redirects to `#/practical` (done in round 11). Its grammar points move into the grammar pages listed below. The route
   then redirects to `#/practical`, and `israelUnits.v1` progress is dropped (it only records review dates). It stays until then
   so the branch keeps a working Israel course on its own.
3. **Every Israel-track lesson has a unit.** il16 and il19 sit in the live units `pu-verbs-now` and `pu-past`, il23 and il24 in
   `pu-decide`, and I-18 in `pu-army` (outlined, held off the live set). An earlier draft of this plan used its own ids
   (`pu-verbs`, `pu-conversation`); round 9 renamed them to the live ids so their written pages can show. The test fails if any
   Israel-track lesson is left out, or if an outline unit has no live unit.

## Where Each Piece Lives

| Piece | Path | Status |
|---|---|---|
| Course index (units, totals) | `data/curriculum/practical-units.json` → `data/curriculum/practical/index.json` | on the Practical branch |
| One file per unit, with its pages | `data/curriculum/practical/<unit>.json` | on the Practical branch; first 30 pages here in v3 |
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

## Full Outline (189 Pages)

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
- `pu-numbers-p03` learn: Twenty, Thirty, a Hundred, a Thousand **(written)**
- `pu-numbers-p04` grammar: What Time Is It? **(written)**
- `pu-numbers-p05` learn: Today, Tomorrow, Yesterday **(written)**
- `pu-numbers-p06` listen: Hear the Number **(written)**
- `pu-numbers-p07` review: Unit Review **(written)**

**`pu-introducing` Introducing Yourself** (5 pages) · lessons il03 · dialogue `d-smalltalk`

- `pu-introducing-p01` grammar: My Name Is **(written)**
- `pu-introducing-p02` learn: Where Are You From? **(written)**
- `pu-introducing-p03` dialogue: Small Talk at a Party **(written)**
- `pu-introducing-p04` speak: Say It About Yourself **(written)**
- `pu-introducing-p05` check: Level 0 Check **(written)**


### L1: Getting around

**`pu-cafe` Ordering at a Cafe** (10 pages) · lessons il06, il07, I-13 · dialogue `d-cafe` · phrasebook `cafe`

- `pu-cafe-p01` learn: Coffee and Tea **(written)**
- `pu-cafe-p02` grammar: I Want: Man and Woman **(written)**
- `pu-cafe-p03` learn: Something to Eat **(written)**
- `pu-cafe-p04` grammar: How Much Is It? **(written)**
- `pu-cafe-p05` dialogue: At the Counter **(written)**
- `pu-cafe-p06` listen: Hear the Order **(written)**
- `pu-cafe-p07` learn: Here or To Go **(written)**
- `pu-cafe-p08` speak: Order for Yourself **(written)**
- `pu-cafe-p09` learn: Paying and Thanks **(written)**
- `pu-cafe-p10` review: Unit Review **(written)**

**`pu-restaurant` Ordering at a Restaurant** (7 pages) · lessons il06, il07, I-13, I-38 · dialogue `d-restaurant`

- `pu-restaurant-p01` learn: A Table for Two **(written)**
- `pu-restaurant-p02` learn: The Menu **(written)**
- `pu-restaurant-p03` grammar: Adjectives That Match **(written)**
- `pu-restaurant-p04` dialogue: Ordering a Meal **(written)**
- `pu-restaurant-p05` learn: With and Without **(written)**
- `pu-restaurant-p06` speak: Ask for the Bill **(written)**
- `pu-restaurant-p07` review: Gladly, and Unit Review **(written)**

**`pu-shop` Shopping and Paying** (9 pages) · lessons il08, il09, I-12, I-43 · dialogue `d-shop` · phrasebook `shop`

- `pu-shop-p01` learn: In the Shop **(written)**
- `pu-shop-p02` grammar: Numbers with Nouns **(written)**
- `pu-shop-p03` learn: Sizes **(written)**
- `pu-shop-p04` dialogue: Trying On a Shirt **(written)**
- `pu-shop-p05` grammar: This: זֶה and זֹאת **(written)**
- `pu-shop-p06` listen: Hear the Price **(written)**
- `pu-shop-p07` speak: Ask to Try It On **(written)**
- `pu-shop-p08` learn: Paying and the Receipt **(written)**
- `pu-shop-p09` review: Closing Time and Unit Review **(written)**

**`pu-directions` Asking for and Following Directions** (7 pages) · lessons il11, I-15 · dialogue `d-directions` · phrasebook `directions`

- `pu-directions-p01` learn: Where Is...? **(written)**
- `pu-directions-p02` grammar: Right, Left, Straight **(written)**
- `pu-directions-p03` dialogue: Where Is the Central Station? **(written)**
- `pu-directions-p04` learn: Near and Far **(written)**
- `pu-directions-p05` listen: Follow the Directions **(written)**
- `pu-directions-p06` speak: Ask the Way **(written)**
- `pu-directions-p07` review: Two Words, One Place, and Unit Review **(written)**

**`pu-transport` Taxi, Bus and Train** (9 pages) · lessons il10, I-11, I-23 · dialogue `d-taxi` · phrasebook `taxi`

- `pu-transport-p01` learn: Taking a Taxi **(written)**
- `pu-transport-p02` grammar: To and From: לְ and מִ **(written)**
- `pu-transport-p03` dialogue: A Taxi to the Airport **(written)**
- `pu-transport-p04` learn: The Bus **(written)**
- `pu-transport-p05` learn: The Train **(written)**
- `pu-transport-p06` listen: Hear the Stop **(written)**
- `pu-transport-p07` speak: Tell the Driver Where **(written)**
- `pu-transport-p08` learn: Tickets and the Rav-Kav **(written)**
- `pu-transport-p09` review: Unit Review **(written)**

**`pu-small-talk` Small Talk** (8 pages) · lessons il13, I-25, I-36 · dialogue `d-smalltalk` · phrasebook `small-talk`

- `pu-small-talk-p01` learn: How Long Have You Been Here? **(written)**
- `pu-small-talk-p02` grammar: Questions: מָה and מָתַי **(written)**
- `pu-small-talk-p03` learn: How Do You Feel? **(written)**
- `pu-small-talk-p04` learn: Work and Studies **(written)**
- `pu-small-talk-p05` listen: Hear the Question **(written)**
- `pu-small-talk-p06` speak: Friends and Goodbyes **(written)**
- `pu-small-talk-p07` learn: Keeping It Going **(written)**
- `pu-small-talk-p08` check: Level 1 Check **(written)**


### L2: Daily life

**`pu-verbs-now` What I Do Now** (3 pages) · lessons il16

- `pu-verbs-now-p01` grammar: Present Tense: Man and Woman **(written)**
- `pu-verbs-now-p02` learn: Everyday Verbs **(written)**
- `pu-verbs-now-p03` review: Come Here, and Unit Review **(written)**

**`pu-past` What I Did** (2 pages) · lessons il19

- `pu-past-p01` grammar: Past Tense: What I Did **(written)**
- `pu-past-p02` review: What I Did Yesterday, and Unit Review **(written)**

**`pu-family` Family and Who You Are** (5 pages) · lessons il14, I-42

- `pu-family-p01` learn: My Family **(written)**
- `pu-family-p02` grammar: One and Many: -ים **(written)**
- `pu-family-p03` learn: School and Play **(written)**
- `pu-family-p04` speak: Describe Your Family **(written)**
- `pu-family-p05` review: Happy, and Unit Review **(written)**

**`pu-home` Home and Repairs** (4 pages) · lessons I-44

- `pu-home-p01` learn: Rooms and Things **(written)**
- `pu-home-p02` learn: Something Is Broken **(written)**
- `pu-home-p03` speak: Call the Landlord **(written)**
- `pu-home-p04` review: Help, and Unit Review **(written)**

**`pu-time` Days, Time and Dates** (3 pages) · lessons il12

- `pu-time-p01` learn: Days of the Week **(written)**
- `pu-time-p02` grammar: Telling the Time **(written)**
- `pu-time-p03` review: Today and Tomorrow, and Unit Review **(written)**

**`pu-weather` Weather and What to Take** (4 pages) · lessons il15, I-24

- `pu-weather-p01` learn: Hot, Cold, Rain **(written)**
- `pu-weather-p02` grammar: It Is: No Word Needed **(written)**
- `pu-weather-p03` speak: Seasons and What to Take **(written)**
- `pu-weather-p04` review: Rain, and Unit Review **(written)**

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

**`pu-decide` Putting It Together** (4 pages) · lessons il23, il24

- `pu-decide-p01` learn: Sound Less Like an Outsider
- `pu-decide-p02` dialogue: A Longer Conversation
- `pu-decide-p03` speak: Your Turn
- `pu-decide-p04` check: Level 2 Check


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

**`pu-army` Army Slang Basics** (3 pages) · lessons I-18 · held off the live set

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

## The Written Pages

Round 3 wrote `pu-greetings` p01–p07, `pu-politeness` p01–p05, `pu-fillers` p01–p06 and `pu-numbers` p01–p02. Round 4 added
`pu-numbers` p03–p07 and `pu-introducing` p01–p05, so all of level 0 is written (30 pages). Round 6 added all ten `pu-cafe` pages (40 written). Round 7 added `pu-restaurant` (7 pages; its outline was cut from 10 because the sources hold no complaint or listening lines worth a page) and `pu-shop` (9 pages): 56 written, 191 in the outline. Round 8 finished level 1 with `pu-directions` (7), `pu-transport` (9) and `pu-small-talk` (8): 80 written. Round 9 added
`pu-verbs-now` (3), `pu-past` (2), `pu-family` (5) and `pu-home` (4): 94 written. It also uses the gender pairs in
`data/curriculum/gender-pairs.json` as a source for women's forms that the phrasebook lacks; those lines have no clip yet. Round 10 added `pu-time` (3 pages, cut from 5 because the source has six words) and
`pu-weather` (4): 101 written, 189 in the outline. Round 3's 20 pages hold 103 items,
each with pointed Hebrew, transliteration, English and an audio clip id. Every page has a real grammar point, 1–3 speaking
prompts, a listening round, and from page 2 on, earlier items queued for review. The readable copy is
`docs/curriculum/PRACTICAL-WRITTEN-PAGES.md`.

Grammar covered in order: one word with two jobs; adjective after the noun, matching it; the your-ending for a man (ךָ) and a
woman (ךְ); negating with לֹא; three forms of welcome and הַ for the; masculine and feminine nouns; telling a man or a woman
to do something; בְּבַקָּשָׁה with two jobs; present tense changing with the speaker; לֹא as no and not; register; הַשֵּׁם;
filler words; questions made by tone; man's and woman's present-tense forms; אַתָּה and אַתְּ; אֶפְשָׁר with a to-verb as a
polite request with no gender; the impersonal אוֹמְרִים; and the two sets of numbers. Round 4 adds tens ending in -im; hours
in the counting set; הַיּוֹם as the day; כַּמָּה; two ways to say my name; מִ (from) and וְ (and) as prefixes; and describing
yourself as a man or a woman. Round 6 adds עִם (with), רוֹצֶה and רוֹצָה, menu loanwords, עוֹד and גַּם, the polite
future question מָה תִּרְצִי?, to-verbs starting with ל, the woman's ending ת, בְּ (by), and לְ said li before a shva.
Round 7 adds לְכַמָּה, הִנֵּה, adjectives that match the noun, בְּלִי, בְּשִׂמְחָה, יֵשׁ and אֵין, masculine nouns with the
long number set, קְטַנָּה for a feminine noun, הַחֻלְצָה הַזֹּאת, זֶה and זֹאת with אֶת, אֶפְשָׁר with a noun, and plural אַתֶּם.
Round 8 adds commands to a man and a woman, the ה of direction, וְאַחַר כָּךְ, no word for is, מַגִּיעִים, two nouns as
one (בֵּית חוֹלִים, תַּחֲנַת), צָרִיךְ and צְרִיכָה, לַ as לְ plus הַ, הַבָּאָה, תָּפוּס and פָּנוּי, הָיְתָה, בֶּן and בַּת כַּמָּה,
חַם לִי, and אִתְּךָ and אִתָּךְ. Round 9 adds the present tense for a man and a woman, keeping אֲנִי, the past ending תִּי,
הָיָה, בּוֹא and בּוֹאִי, אָח and אָחוֹת, the plural -im with moving vowels, גַּן with two meanings, תַּלְמִיד and תַּלְמִידָה,
שָׂמֵחַ and שְׂמֵחָה, the trade ending -ai, and בַּעַל הַבַּיִת.

**Sources.** Every Hebrew line is copied by id from `data/corpus/phrasebook.json`, the audio manifests (which hold the woman's
forms the phrasebook leaves out, such as מַה שְׁלוֹמֵךְ? and אֲנִי מִצְטַעֶרֶת) or `data/curriculum/dialogues.json`. The test
re-reads each source and fails on any difference.

**Audio.** 365 of the 432 items on the 101 pages have clips in the manifests, in both the man's and the woman's voice. These are text-to-speech
clips, not human recordings. The 67 gaps are dialogue lines and gender-pair lines, which have no clips yet; the test allows gaps only on those two kinds of line.

**Transliteration.** Phrasebook rows keep the phrasebook's transliteration. Thirty items (woman's forms and counting-set numbers that come only from the audio manifest,
and four lesson words with no transliteration of their own) have transliteration written for these pages in the same spoken style ("ma shlomech?").
Each is marked `translitSource` and needs a native check.

## For Native Review

Found while writing; nothing changed in the sources:

- `d-smalltalk-l1` spells hi as הַיי; the phrasebook has הֵי.
- il02 has יָאללָה and סַבָּבָּה; the phrasebook has יַאלְלָה and סַבָּבָה. The second dagesh in סַבָּבָּה looks like a slip.
- `d-smalltalk-l7` has מְאוֹד; the phrasebook has מְאֹד. Both spellings are in use; one course should pick one.
- Counting-set numbers come first, which matches how numbers are said aloud. A teacher may prefer the other order.

## John's Decisions (2026-11-10)

1. **One Israel course.** `#/israel-units` is merged into `#/practical`, and its routes redirect there.
2. **The eight divine-name items stay held** (see `docs/review/LESSON-INTEGRITY-2026-11-10.md`).
3. **בְּעֶזְרַת הַשֵּׁם on `pu-politeness-p05` is kept and shown.**
4. **Army slang is live.** `pu-army` (I-18) is in the live index, and its three pages are written. The word for weapon is not
   used on any page.
5. **Both festival greetings are kept:** גְּמַר חֲתִימָה טוֹבָה and חַג כָּשֵׁר וְשָׂמֵחַ.
6. **The Shabbat and holiday units stay at the end** of the Israel course.

Still open: native-speaker and cantor review of every written page and transliteration.

## What Is Left

- Write the remaining 88 pages (the rest of level 2, then levels 3 and 4) to this standard. Pages avoid any item on the hidden list (`data/curriculum/practical/hidden-items.json`). The builder already checks every source, clip and grammar run.
- View support for the v3 fields, listed above.
- Clips for the dialogue lines, so dialogue pages can play.
- A native-speaker read of everything marked `nativeReview`.
