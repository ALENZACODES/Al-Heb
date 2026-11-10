# Hebrew for Israel, Unit by Unit

The Israel track rearranged as practical units, the way a structured conversation course (Babbel is the usual example) is built:
one real situation per unit, a short grammar note that explains the pattern behind the phrases, spaced review, and listening and
speaking drills. Route: `#/israel-units` (preview). Data: `data/curriculum/israel-units.json`. Logic: `src/curriculum/israel-units.js`.
Tests: `tests/curriculum.israel-units.test.js`.

## Rules

- **No new Hebrew.** A unit only groups lessons that already exist. Every Hebrew example in a grammar note is a verbatim line of that
  unit's own lessons, and the drills use the lessons' own words, word clips and exercises. The test fails on any other Hebrew.
- **Lessons keep their order.** Units are a second way into the same lessons; prerequisites and locks are unchanged. Each unit has
  core lessons (beginner, il01 to il24) and go-further lessons (B1, which open after the il24 capstone).
- **Draft.** The grammar notes are original English, not yet checked by a native speaker or teacher, and the page says so.

## The units

| Unit | Title | Core | Go further | You will be able to |
|---|---|---|---|---|
| u01 | Hello and Introductions | il01, il03 | I-25 | Greet, thank, say sorry, and say who you are and where you are from |
| u02 | Sound Like a Local | il02, il13, il23 | - | Use the small words Israelis fill a conversation with, and put the stress where they do |
| u03 | Numbers and Prices | il04, il05 | - | Count, understand a price in shekels and ask how much |
| u04 | Cafe and Ordering Food | il06, il07 | I-13, I-45 | Order a coffee the way you like it, eat in or take away, and ask for the bill |
| u05 | Shopping and Paying | il08, il09 | I-12, I-43 | Ask if something is there, ask the price, bargain a little and pay |
| u06 | Getting Around | il10, il11 | I-11, I-15, I-23, I-39 | Take a bus, train or taxi, ask the way and follow directions |
| u07 | Time, Plans and the Phone | il12, il20, il22 | I-16, I-49 | Say when, make a plan, and arrange or move a meeting by phone or message |
| u08 | Verbs: Now and Yesterday | il16, il19 | - | Say what you do now and what you did yesterday |
| u09 | People, Family and Opinions | il14, il21 | I-42, I-38 | Talk about your family, ask about someone's children and say what you think |
| u10 | Health, Help and Emergencies | il18 | I-14, I-20, I-46 | Say what hurts, get medicine, see a doctor and call for help |
| u11 | Home, Work and Study | il17 | I-17, I-44, I-21, I-22, I-48, I-36, I-37 | Book a room, rent and fix an apartment, handle the bank and post office, and talk about work and study |
| u12 | Israeli Life: Weather, Outings and Holidays | il15 | I-24, I-40, I-41, I-18, I-19, I-47, I-50 | Talk about the weather, go out, accept a Shabbat invitation and give the right holiday greeting |
| u13 | Capstone Conversation | il24 | - | Hold a five-minute conversation: greet, buy something, ask the way and make a plan |

All 24 il lessons and all 30 Israel B1 lessons are placed once; no synagogue lesson is.

## Grammar notes, in one line each

- **Hello and Introductions**: No word for 'am' or 'is' in the present: Hebrew just puts the two parts side by side. 'You' changes for a man and a woman, and so does the question that uses it.
- **Sound Like a Local**: Most Hebrew words are stressed on the last syllable; English speakers tend to stress too early. Fillers carry the tone of a whole sentence; 'nu' can mean 'well?', 'so?' or 'come on'.
- **Numbers and Prices**: When you simply count (one, two, three) Israelis use the feminine forms. 'Kama' asks both 'how much' and 'how many'.
- **Cafe and Ordering Food**: 'Efshar' plus a verb in the 'to ...' form is the polite way to ask for something. 'Bli' means 'without' and goes straight before the noun. The verb follows the speaker: a man says rotzeh, a woman says rotzah.
- **Shopping and Paying**: 'Yesh' (there is) and 'ein' (there isn't) never change, whatever follows them. 'How much does it cost' is literally 'how much does this go up'.
- **Getting Around**: An ending -ah on a place word can mean 'towards': right becomes 'to the right'. Commands change for a woman.
- **Time, Plans and the Phone**: The future for 'I' starts with e- (or a- before some letters). Days of the week are mostly numbered: Sunday is 'the first day'; Saturday is Shabbat.
- **Verbs: Now and Yesterday**: Present tense works like an adjective: it changes for man, woman and plural, not for I, you or he. Past tense marks the person on the end of the verb: -ti is 'I'.
- **People, Family and Opinions**: 'I have' is 'yesh li': there is to me. Age is asked as 'son of how much' or 'daughter of how much'.
- **Health, Help and Emergencies**: Symptoms use 'yesh li', I have. 'It hurts me' puts the person after the verb.
- **Home, Work and Study**: 'Ani mechapes' (I'm looking for) takes the thing straight after it, with no 'for'. 'Rotzeh' (want) plus a 'to ...' verb says what you want to do.
- **Israeli Life: Weather, Outings and Holidays**: How you feel uses 'to me': 'kar li' is 'I'm cold'; without 'li' it describes the day. Greetings belong to a time: Shabbat shalom until Shabbat ends, then shavua tov.
- **Capstone Conversation**: Everything so far in one talk; when you are stuck, ask for it again instead of switching to English.

## Practice in each unit

| Drill | What the learner does | Built from | Graded |
|---|---|---|---|
| Unit review | sees each word of the unit, says what it means, checks, hears it | the lessons' words and word clips | self-check |
| Listening | hears a word clip, picks its meaning from three | words of the same unit with different glosses | automatically |
| Speaking | reads an English cue, says the Hebrew aloud, then checks and hears it | beginner words, and the respond exercises of the B1 lessons | self-check |

**Spaced review.** A unit's review opens one day after its core lessons are finished, then falls due again 3, 7, 14 and 30 days after
each review (store key `israelUnits.v1`). Word cards from the lessons are also scheduled by the app's own spaced-repetition scheduler,
as before.

## Not done (needs people or recordings)

- The clips are synthetic voices; no native speaker has recorded or checked them.
- Speaking is self-checked; there is no speech recognition.
- The grammar notes need a teacher's review before the route leaves preview.
