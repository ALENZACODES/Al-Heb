# Beating Duolingo Hebrew: a 100-prong plan (draft, 2026-11-03)

Directive from John: "duolingo hebrew is the one to beat." This file is the plan; `docs/strategy/duolingo-100.csv` holds the same 100 rows (canonical, machine-readable); `tests/strategy.duolingo100.test.js` checks the CSV.

**How to read the status words.** `done` means the feature exists in the repo (a file path is given and the test checks that it exists). It does **not** mean it has been tried by a learner, reviewed by a Hebrew educator, or run on a real phone; most of ALEF has none of those. No learner has used ALEF in a test. Nothing is deployed (`docs/DEPLOY.md`). Audio: 0 of 14,036 required clips exist (`docs/voices/coverage.md`).

Status counts (100 prongs): partial 33, done 34, not started 14, blocked-on-human 14, planned 5.

Repo facts were read on 2026-11-03 from `src/shell/router.js`, `docs/STATUS.md`, `docs/voices/coverage.md`, `docs/DEPLOY.md`, `docs/A11Y.md`, and file listings. I did not run the app or the test suite for this document except the new strategy test. Other agents are editing the repo at the same time, so file-state claims can go stale.

## 1. What Duolingo Hebrew is, as far as I could verify (fetched 2026-11-03)

Most facts below come from third-party pages, forum posts and mirrors, not from Duolingo. Duolingo's own help pages and the community wiki could not be fetched (blocked by the session allowlist), so **no first-party description of the current Hebrew course was obtained.** I found no Duolingo statement about Hebrew course updates.

| Topic | What the sources say | Source | Confidence |
|---|---|---|---|
| Structure | A data page for a 2024-05-04 version lists 96 units in 3 sections (16, 40, 28), 505 levels, 4,109 words, and "no Stories". A page dated 2026-09-27 lists 5 sections and 60 units (its own unit breakdown sums to 54). The two disagree. | S6, S7 | Low: current structure unverified |
| Level | Third parties put the end of the course at about A2 (high beginner). The Duolingo app did not show CEFR levels as of June 2026. | S1, S2, S11 | Medium for "about A2" (secondary) |
| Exercises | One review says "mostly translation and dictation" yet describes tiles and multiple choice itself; another lists multiple choice, matching, listening and typed translation; an older review (undated) adds a male and a female voice and no pronunciation drills. | S1, S13, S5 | Low-medium; mixed |
| Letters | A separate Letters section exists but sits behind a menu (three-dot menu online per a Feb 2026 review; commenters in 2025 call it hidden). Early units are described as starting with whole words. A commenter says letter names are not shown. | S12, S3, S4 | Medium |
| Niqqud | Conflicting: one review says the course supports reading with niqqud and does not cover unpointed reading; a learner says the first lesson has no niqqud. The competitor notes cite the community wiki ("does not use niqqud as a rule"), which I could not open. | S1, S2, S3, S16 | Low: unverified |
| Audio | A native speaker (2023) praised native, non-robotic audio; commenters say many items lack audio or niqqud (one estimate: 60-70% of exercises have audio) and some pronunciation is wrong. An older review found the female voice hard to follow. Which vendor makes Hebrew audio is unknown (the Polly article never mentions Hebrew). | S14, S3, S5, S15 | Medium for "some gaps"; vendor unknown |
| RTL | No source found on Hebrew right-to-left rendering problems. | none | Unverified |
| Complaints | Hard entry barrier and strict typo/gender grading; valid alternatives rejected; random or formal sentences; reported errors unfixed for years; grammar (binyanim, prepositions) not well explained; narrow sentence set; plateau, no intermediate course; no slang; handwriting not taught. | S3, S4, S5, S14, S1, S2 | Medium (user and reviewer opinion) |
| Gamification | Streaks, gems and followers' cheers are described as effective by one reviewer. Free learners use an Energy battery that refills in about a day (replacing Hearts, announced July 2025); out of energy you wait, watch an ad, or spend gems. Leagues, XP and Friends Quests were not checked in this session. | S12, S9, S8 | Medium; leagues/quests not verified |
| Pricing (US App Store, third-party, 2026-10-13) | Super about $9.99-$12.99/month, $79.99-$119.99/year; Family most likely $119.99/year; Max not offered on the reviewer's account since September; the page says the CEO said in August 2026 that Max might be retired (second-hand). Free tier has ads and Energy but the same lesson content as paid. | S8 | Low-medium: prices vary by account and region |
| Max features | At launch (March 2023) Roleplay and Video Call covered Spanish, French, German, Italian, Portuguese (Roleplay and Video Call), Japanese, Korean, Chinese (Video Call only). Hebrew is not listed. Max features are app-only per the Oct 2026 page. Explain My Answer became free for all in 2026. | S10, S8, S11 | Medium that Hebrew is not listed; current status unverified |
| Other products | Math, Music (Oct 2023), Chess (April 2025) exist inside Duolingo; none relates to Hebrew. | S11 | Medium |
| Scale | 130 million monthly users (Q1 2025) and 10.9 million paid subscribers (June 2025) per Wikipedia. | S11 | Medium |
| Offline | A reviewer says offline use gives limited lessons without data. | S12 | Low |
| Course maintenance | Wikipedia says the volunteer contributor program ended in March 2021 and courses are maintained by professional linguists; a 2025 commenter still calls Hebrew "volunteer-course level". Unreconciled. | S11, S4 | Low |
| Not taught | No source describes prayer, Torah, tradition-specific pronunciation or siddur content in the Hebrew course; I could not confirm absence from first-party material. Commenters say handwriting and slang are not taught. | S14, S3, S16 | Medium for handwriting/slang; **absence of prayer/Torah is unverified** |
| Desktop vs mobile, accessibility, retention drop-off | Not researched or no quantified Hebrew-specific data found. The only retention hint is qualitative: a plateau at A2 (S1, S2). | none | Unverified |

The internal notes (S16) also say Duolingo Max's availability for Hebrew was unverified and that the "~$84/yr" Duolingo price anchor came from a third party. S17 already lists the competitor doc's unverified claims; I did not repeat its checks.

## 2. Honest ground rules for the claims in this plan

- Where I wrote "Duolingo has/lacks X" I give a source id. Absence claims are phrased as "no source found", never as fact.
- ALEF "done" means built, not proven. The biggest unproven things: audio (none), educator review (none), learner testing (none), real-device testing (none), deployment (none).
- ALEF is a reading-first tool for adults (siddur, Torah, plus an Israel track). Duolingo is a general gamified course. The plan "beats" Duolingo on a defined learner (adult who wants to read the siddur or follow a service) and does not claim a better general Hebrew course.

## 3. Top 10 highest-leverage prongs

| Rank | Prong | Why it matters |
|---|---|---|
| 1 | P093 Deploy to a public URL | Nothing else can be tested with learners until it is live. |
| 2 | P037 Human audio for the beginner path | Duolingo's native audio is its clearest advantage; ALEF has 0 clips. Start with the beginner-path subset, not all 14,036. |
| 3 | P001 Day-1 reading win, tested with 5 beginners | The core promise; currently a target. |
| 4 | P074 Real-device test (iOS and Android) | Every "works offline / installs" claim is headless-Chromium only today. |
| 5 | P061 Shabbat/Yom Tov streak freeze, QA-walked | Cheap, distinctive, and I found no source saying Duolingo offers it; but verify the simulation first. |
| 6 | P021 Siddur Coverage % wired into the app | Turns the prayer niche into a visible number; model exists, route does not. |
| 7 | P081 / P026 Educator review of lessons and prayer text | Trust. Everything is currently proofread:false. |
| 8 | P068 Three shul pilots | The distribution route Duolingo cannot copy easily; John-only. |
| 9 | P098 Head-to-head learner study | The only honest way to say "beat". |
| 10 | P014 Pointed to unpointed fading | Turns the main third-party critique (S1, S2) into an advantage for Israel-track learners. |

## 4. What Duolingo does better than ALEF today (we should not pretend otherwise)

1. **Audio.** Native recordings exist and are praised (S14); ALEF has none and falls back to the browser voice (`docs/voices/coverage.md`).
2. **Scale and polish of the lesson engine.** Thousands of exercises and 4,109 tracked words in a 2024 version (S6) against ALEF's 75 lessons (`data/curriculum/lessons.json`) and an unreviewed 5,000-word list.
3. **Habit machine at scale.** Streaks, gems, cheers, reminders, A/B testing, 130 million monthly users (S11, S12). ALEF's streak has no users.
4. **Real apps in stores with push notifications.** ALEF is a static PWA, nothing deployed, never run on a phone.
5. **Placement and grading engine.** Duolingo has a placement test (S14); ALEF has a checkpoint but no placement.
6. **Spoken output and conversation breadth.** The Hebrew course is described as lacking pronunciation drills (S5, old) but Duolingo has dictation (S1); ALEF has no speaking exercise at all.
7. **Brand, trust and reach.** An unknown new app starts at zero.
8. **Going beyond letters into whole Modern Hebrew sentences.** Dozens of units of sentence practice (S6, S7) versus ALEF's reading focus.
9. **"Free" is not a differentiator by itself.** Duolingo's free tier has the same lessons as paid (S8); the difference is ads and the Energy limit, not content.

## 5. Scorecard: ALEF vs Duolingo Hebrew on 12 dimensions

Scale: ahead / even / behind / unproven. "Unproven" means the claim depends on something not tested.

| # | Dimension | ALEF today (evidence) | Duolingo Hebrew (source) | Verdict |
|---|---|---|---|---|
| 1 | First-session win | Loanword route and onboarding exist (`src/curriculum/loanwords.view.js`); never user-tested | First lesson reportedly asks learners to write Hebrew (S4) | Unproven |
| 2 | Alphabet and niqqud | Atlas, tracing in two scripts, niqqud trainers, typing trainer (P007-P011) | Letters section behind a menu; niqqud policy conflicting (S3, S12, S1) | Ahead on paper; unproven with learners |
| 3 | Unpointed reading | Fade-out recall only; no vowel-fading path (P014) | Weak by third-party account (S1, S2) | Even (both weak) |
| 4 | Prayer and Torah | Reader (70 entries), Torah/trope views, class track; all unreviewed | No source found describing it | Ahead on scope; behind on review |
| 5 | Everyday speaking | Dialogues and "sound like a local" (unreviewed), no conversation practice | Translation, dictation; no Max Hebrew found (S1, S10) | Behind on breadth; even on depth |
| 6 | Audio | 0 clips; browser voice fallback | Native audio, some gaps (S14, S3) | Behind |
| 7 | Pronunciation feedback | Timed read, no scoring | None reported for Hebrew (S5) | Even (both lacking) |
| 8 | SRS and retention | FSRS-style scheduler, unfitted | Strength meters/review described (S5); details unverified | Unproven |
| 9 | Habit and gamification | 5-minute streak with Shabbat freeze (QA walk not done); no social | Streaks, gems, cheers, Energy (S12, S9) | Behind on scale; ahead on Shabbat-respect (unverified) |
| 10 | Offline and platform | Service worker, 9 routes offline in headless Chromium; no device test | Native apps; offline limited (S12) | Unproven |
| 11 | Content scale and QA | 75 lessons, proofread:false everywhere | Large, with long-standing error complaints (S6, S14) | Behind on scale |
| 12 | Price and access | Free, no account, no ads; nothing deployed | Free with ads and Energy; Super $79.99-$119.99/yr (S8) | Ahead on paper; not live |

## 6. 30-60-90 day sequence (from 2026-11-03)

**Days 0-30 (unblock and prove the core).** John: choose host and deploy (P093), pick the licence (P090), contact two audio donors (P042), schedule a real-device test (P074). Build: run the Shabbat freeze simulation (P061), wire the Siddur Coverage and Word Sprint routes (P021, P057), add update notice (P073), verify every beginner word uses only taught letters (P006). Five-learner Day-1 test (P001).
**Days 31-60 (audio and trust).** Record the beginner-path subset in Israeli and Ashkenazi voices (P037, P025); ingest and label it (P041). Educator review of letters, niqqud, Shema, Amidah opening, Kiddush (P081, P026). Start the first shul pilot (P068). Fit SRS defaults on pilot data (P054).
**Days 61-90 (compare and expand).** Run the head-to-head study (P098). Unpointed reading path (P014). Audio packs offline (P072). Publish the sourced comparison page only if the data supports it (P096). Re-run this scorecard (P100).

## 7. The 100 prongs

### A. Onboarding and first win (P001-P006)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P001 | Weakness (reported): a learner says the first lesson of Section 1 already asks them to write Hebrew; commenters call it the highest barrier of any Duolingo course. (S4, S3) | Make the first screen a reading win: read 3 loanwords (taxi, banana style) from letters taught minutes earlier, no typing in Hebrew. | **partial**: Loanwords route exists; onboarding exists; a timed Day-1 promise is not verified. `src/curriculum/loanwords.view.js`, `src/shell/onboarding.view.js` | S / build | In a moderated test of 5 true beginners, at least 4 of 5 read 3 loanwords aloud correctly within 10 minutes of first open with no help. | Target, not a result: no user test has been run. |
| P002 | Weakness (reported): the Letters section is hidden behind a menu (3-dot menu online per a 2026 review; "it is hidden" per commenters). (S12, S4, S3) | Keep Letters as a top-level bottom tab, never a submenu. | **done**: Letters is one of the five bottom tabs. `src/shell/router.js`, `docs/STATUS.md` | S / build | From any screen on a 390px phone, Letters is reachable in 1 tap (tools/qa/walk.mjs check). | Checked in headless Chromium only, not on a real phone. |
| P003 | Strength: Duolingo offers a placement test (a native speaker reviewed it in 2023). (S14) | Offer a "what can you already read?" check so returning learners skip letters they know. | **partial**: A look-alike checkpoint exists; skip-ahead routing from its result is not verified. `src/curriculum/checkpoint.view.js` | M / build | A learner who passes the checkpoint is routed past the letter lessons in 2 taps or fewer. | Do not call it a placement test until it places. |
| P004 | Neutral: Duolingo Hebrew is a general course (translation/dictation, A2 ceiling per third parties); no source describes a prayer-or-Israel goal choice. (S1, S16) | Ask goal on first run (read in synagogue / get around Israel / both) and tailor the path. | **done**: First-run setup stores goal and an Israel-track flag. `src/shell/onboarding.view.js` | S / build | First-run completes in under 60 seconds and the Home screen reflects the chosen goal (browser walk). | Whether the goal truly reorders lessons beyond the Israel flag is not verified. |
| P005 | Weakness: free Duolingo accounts see ads and use an Energy battery that refills in about a day; when it runs out you wait, watch an ad or spend gems. (S8, S9) | No account, no ads, no energy wall: first exercise with zero sign-up. | **done**: Static PWA with no accounts or billing code. `src/store.js`, `docs/strategy/COMPETITOR-REVIEW.md` | S / build | A new visitor reaches the first exercise with 0 sign-ups and 0 interstitials, in under 30 seconds on a mid-range phone. | Not a durable advantage if ALEF later adds ads or paywalls; do not promise "free forever" without P089. |
| P006 | Weakness (reported): early Duolingo units start with whole words and are labelled "Learn the Alphabet" without teaching letters first. (S12) | Never show a Hebrew word before its letters are taught; offer a path with no Latin transliteration. | **partial**: Scaffold route "Read without Latin" and loanword gating exist. `src/curriculum/scaffold.view.js` | M / build | Automated check: every word on every beginner lesson uses only letters and vowel signs already taught (decode.js grade = full). | Check not yet run across all 75 lessons. |

### B. Alphabet and niqqud (P007-P013)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P007 | Weakness (reported): letters look alike and learners invent their own mnemonics; commenter says the course does not show letter names. (S12, S3) | Look-alike drills and a letter atlas with names, sounds and confusables. | **done**: Atlas, interference data, Spot It and checkpoint exist. `src/letters/atlas.view.js`, `src/letters/interference.js`, `src/curriculum/spotit.view.js` | M / build | After lesson 10, look-alike checkpoint error rate under 15% in 5 pilot learners. | Error-rate target is a guess; no learner data. |
| P008 | Gap (commenter): the course does not teach handwritten Hebrew. (S14) | Stroke-order tracing in print and cursive. | **done**: Tracing view with print/cursive toggle. `src/letters/trace.view.js`, `tests/letters.trace.test.js` | M / build | All 27 letter forms traceable in both scripts, stroke order confirmed by a Hebrew teacher. | Stroke data derived from OFL font outlines; licence status of derivative unresolved; teacher review not done (docs/letters/REVIEW-LIST.md). |
| P009 | Mixed: one review says nikud-supported reading is included; another learner says the first lesson used no niqqud; niqqud policy is not confirmed from an official source. (S1, S3) | Teach niqqud as sound signs from the start with vowel board, dial, dot tiles, syllable chips. | **done**: Four niqqud trainers exist. `src/pronunciation/vowelboard.view.js`, `src/pronunciation/niqquddial.view.js` | M / build | Learner reads all 15 niqqud signs at 90% or better on a timed checkpoint. | Pedagogy is the author's design; unproven with learners. |
| P010 | Unverified: whether Duolingo teaches final forms, dagesh, shin/sin distinctions explicitly. (S16) | Teach the 27 forms and shin/sin as first-class items. | **partial**: Letter data has 27 forms and variants. `data/letters/letters.json` | S / build | Every variant form has a lesson item and a checkpoint question. | Do not claim Duolingo omits these; not checked. |
| P011 | Weakness (reported): learners must type Hebrew early and are told to install a Hebrew keyboard; typing is strictly graded. (S4, S5) | Keyboard-layout trainer that teaches where letters sit on the Israeli SI-1452 layout. | **done**: Typing trainer exists. `src/letters/typing.js`, `tests/letters.typing.test.js` | S / build | Learner types the alef-bet from memory in under 60 seconds in 3 pilot sessions. | Layout only; no mobile on-screen keyboard variants checked. |
| P012 | Gap (commenter): handwritten Hebrew not taught, so cursive notes are unreadable. (S14) | Add cursive reading drills (identify cursive forms, read short handwritten lines). | **partial**: Cursive tracing exists; reading cursive text does not. `src/letters/trace.view.js` | L / build | Learner identifies 22 cursive forms at 90% and reads 10 handwritten words. | Needs a cursive font or scans with clear rights. |
| P013 | Weakness (reported): learner made her own mnemonics (e.g. "t kickback"). (S12) | Ship a mnemonic per letter with an image and text. | **partial**: Mnemonic text exists; images unapproved placeholders. `data/letters/mnemonics.json`, `tests/mnemonics.test.js` | M / john | All 22 mnemonic images approved by John and shown in the letter view. | 286 AI images unreviewed; disclosure wording undecided (docs/images/RIGHTS.md). |

### C. Reading (pointed to unpointed) (P014-P019)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P014 | Weakness (third-party): the course leans on pointed text; unpointed reading is the key gap after it. (S1, S2) | Fade vowels over the path: pointed, partly pointed, unpointed; test on unpointed words. | **partial**: Fade-out recall exists for lines; vowel fading across the path is not verified. `src/curriculum/fade.view.js` | L / build | Learner reads 20 common unpointed words at 80% or better after the ladder. | Siddur reading is pointed; this is an Israel-track need. |
| P015 | Neutral: no source says how Duolingo teaches decoding of syllables. (S16) | Syllable ladder from letter+vowel to words. | **done**: Ladder route exists. `src/curriculum/ladder.view.js` | M / build | Learner completes the ladder and decodes 30 new syllables at 90%. | Unproven with learners. |
| P016 | Neutral: Duolingo tracks words learned (4,109 in a 2024 data page) not "what can I read". (S6) | "What I can read now" counter, per prayer line, from letters actually taught. | **done**: Decode grading and Progress screen exist. `src/progress/decode.js`, `src/progress/progress.view.js` | M / build | Progress screen shows a readable-lines count that matches a manual audit on 20 lines. | Manual audit not done. |
| P017 | Gap: a course can only teach its own sentences; no source says Duolingo reads your own photo. (S16) | Photograph a siddur page and get word cards. | **partial**: Scan view with vendored OCR. `src/photo/scan.view.js`, `docs/photo/BENCHMARK.md` | M / john | Word-level accuracy at or above 85% on 50 real siddur photos. | OCR 88.4% on synthetic images only; real photos unmeasured. |
| P018 | Weakness (reported): limited sentence variety; recycled sentences encourage memorising. (S1, S5) | Use many example sentences per word. | **partial**: Vocab data carries Tatoeba examples (5,317 per the review). `docs/vocab/LICENSES.md`, `src/vocab/vocab.view.js` | M / build | Each of the top 1,000 words shows 3 or more distinct example sentences. | Examples are machine-collected, proofread:false. |
| P019 | Neutral: no source on Duolingo text import. (S16) | Paste or import any Hebrew text and get vowels/word cards. | **not started**: Not built (only photo OCR and an opt-in vowelizer). `src/photo/scan.view.js` | M / build | Paste 500 words and get a readable word list in under 10 seconds offline. | Vowelizer service has no published terms. |

### D. Prayer and siddur (P020-P026)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P020 | Gap: no source found describing prayer or siddur content in Duolingo Hebrew; not verified as absent. (S16) | Read real prayers line by line with niqqud and transliteration toggles. | **done**: Reader view with 70 registry entries. `src/corpus/read.view.js`, `data/corpus/registry.json` | M / build | Learner can open Shema, Amidah opening and Kiddush and read line by line offline. | Every corpus entry is proofread:false (P026). |
| P021 | Gap: same as P020. (S16) | Headline "Siddur Coverage %": how much of Friday night you can decode. | **partial**: Model and view exist but no route in router.js at last read. `src/service/model.js`, `src/service/service.view.js` | S / build | Route registered; Home shows Siddur Coverage and a unit test fixes the number for a seeded state. | Coverage means decodable, not fluent. |
| P022 | Gap: same as P020. (S16) | Follow-the-service cards for Friday night and Shabbat morning. | **partial**: View built; not routed. `src/service/service.view.js`, `data/service/orders.json` | M / build | A learner can follow a full Friday night order card by card. | Order data needs rabbinic or educator review. |
| P023 | Gap: same as P020. (S16) | A 10-week adult class path from alef-bet to reading the service. | **done**: Class track route with teacher handouts. `src/classtrack/classtrack.view.js`, `data/curriculum/class-track.json` | M / build | 5 learners complete week 1 and read the Shema line unaided. | Unpiloted. |
| P024 | Gap: not a Duolingo topic; tradition-specific vowel values are not covered in any source. (S16) | Rule tools for shva and kamatz katan by tradition. | **done**: Rule modules exist. `src/pronunciation/shva.js`, `src/pronunciation/kamatz-katan.js` | M / reviewer | A Hebrew educator reviews 50 shva/kamatz katan examples with 95% agreement. | Rules, not audio; unreviewed. |
| P025 | Gap: tradition-specific prayer pronunciation audio is absent from every source reviewed. (S16, S17) | Prayer lines recorded in Israeli, Sephardi and Ashkenazi voices. | **blocked-on-human**: 0 of 14,036 required clips exist. `docs/voices/coverage.md` | L / recording | Top 129 prayer lines recorded in two traditions and playing in the app. | Blocked until talent is cast and paid. |
| P026 | Gap: same as P020. (S16, S17) | Educator or rabbinic proofreading of prayer text and translations. | **blocked-on-human**: No review done. `docs/corpus/LICENSES.md`, `docs/verification/VERIFICATION.md` | M / reviewer | Signed review of the Shema, Amidah and Kiddush records, proofread flag set true. | Religious text errors are a trust risk. |

### E. Torah and trope (P027-P030)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P027 | Gap: no Torah or trope content found in sources about Duolingo Hebrew. (S16) | Torah reading with trope marks explained. | **done**: Trope and reader views exist. `src/torahread/trope.view.js`, `tests/torahread.view.test.js` | M / build | Learner can follow cantillation marks for one aliyah. | Not expert reviewed. |
| P028 | Gap: same as P027. (S16) | Aliyah practice with a ladder from words to verse. | **done**: Aliyah and ladder views exist. `src/torahread/aliyah.view.js`, `src/torahread/ladder.view.js` | M / build | Learner completes an aliyah ladder for the upcoming parsha. | Unreviewed. |
| P029 | Gap: same as P027. (S16) | Link the weekly parsha to a reading plan. | **done**: Parsha calendar module exists. `src/curriculum/calendar.parsha.js`, `tests/calendar.parsha.test.js` | S / build | Parsha for any date matches Hebcal for a 52-week sample. | Fixtures checked, not live data. |
| P030 | Gap: no chanting audio in any source reviewed. (S16) | Recorded trope chanting. | **blocked-on-human**: Nothing recorded. `docs/voices/coverage.md` | L / recording | One parsha chanted by a qualified reader, in the app. | Needs a qualified reader. |

### F. Israel speaking (P031-P036)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P031 | Weakness (reported): many sentences random, formal or theatrical per a native speaker; few sentences available. (S14, S5) | Short realistic Israel dialogues (cafe, taxi). | **done**: Dialogues route and data. `src/curriculum/dialogues.view.js`, `data/curriculum/dialogues.json` | M / reviewer | A native speaker rates 20 dialogue lines as natural at 90% or better. | Machine-drafted until reviewed. |
| P032 | Gap (third-party): colloquial Hebrew is a gap after the course. (S2) | "Sound like a local" section for spoken forms. | **done**: Israel route and data. `src/israel/israel.view.js` | M / reviewer | Native review of the section with corrections applied. | Unreviewed. |
| P033 | Weakness (reported): no indication of formality or context. (S14) | Tag words with register (formal, spoken, slang). | **not started**: Not verified in vocab data. `data/vocab/meta.json` | M / build | Top 500 words carry a register tag, checked by a native speaker. | Needs a trusted register source. |
| P034 | Weakness (reported): strict about gender and plural; uses forms most speakers avoid. (S14, S5) | Gender pairs and "say it as me" role practice. | **done**: Gender view exists. `src/curriculum/gender.view.js` | S / build | Learner can switch speaker gender across 10 pairs at 90%. | Content draft. |
| P035 | Gap (commenter): the course does not teach slang. (S3, S2) | Slang and idiom pack. | **not started**: None. `data/israel` | M / reviewer | 50 common slang items with native-checked glosses. | Offensive-term risk; needs native curation. |
| P036 | Neutral: Max video/roleplay lists French, Spanish, German, Italian, Portuguese; Hebrew is not listed in the sources found. Unverified for 2026. (S8, S10) | Optional conversation practice with a tutor or on-device bot, if privacy design allows. | **not started**: No cloud calls by design. `docs/photo/TRANSLATION.md` | L / build | Conversation practice available without sending voice to a server, or by human tutor link. | Conflicts with the no-cloud design; may stay out. |

### G. Audio (P037-P043)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P037 | Strength and weakness: native audio is praised, yet some questions have no audio or wrong pronunciation (commenters: 60-70% have audio). (S14, S3, S1) | Human audio for every lesson word, tappable. | **blocked-on-human**: 0 clips recorded. `docs/voices/coverage.md`, `docs/voices/kit` | L / recording | 100% of beginner-path words have a human clip, native-checked. | Biggest Duolingo advantage today. |
| P038 | Gap: single-tradition audio is typical; the sources reviewed describe only Israeli-style audio. (S14, S16) | One-tap tradition switch. | **partial**: Player and settings support it; clips missing. `src/audio/player.js`, `src/shell/settings.js` | M / recording | Same prayer line plays in 3 voices. | Falls back to Israeli browser voice. |
| P039 | Strength: audio is slower and more enunciated than native speech. (S2) | Offer slow and normal speed. | **partial**: TTS rate setting exists; no slow/normal recorded pairs. `src/audio/player.js` | S / build | A speed control on every audio item. | Browser voice rate only. |
| P040 | Weakness (third-party): the course does not prepare learners for native-speed speech. (S1, S2) | Native-speed listening drills graded by level. | **not started**: None. `docs/voices/recording-script-israeli.md` | L / recording | 10 native-speed clips with comprehension questions per level. | Needs real recordings. |
| P041 | No Duolingo claim made; this is an ALEF-side prong. (none) | Be honest in the UI about which voice is playing. | **done**: Sound bar states audio status and falls back with a note. `src/shell/audio-shards.js`, `docs/STATUS.md` | S / build | Every audio play shows voice source: recorded, machine, or browser. | Shard words currently all "missing". |
| P042 | No Duolingo claim made; this is an ALEF-side prong. (none) | Donor consent form and recording kits. | **blocked-on-human**: Kits and a rights-grant draft exist; no talent contacted; not lawyer reviewed. `docs/voices/donor-rights-grant.md`, `docs/voices/kit` | M / john | Lawyer-reviewed form signed by first donor. | Not legal advice. |
| P043 | Neutral: Duolingo has used TTS in general (2017 blog on Polly; Hebrew not mentioned). (S15) | Israeli machine-voice drafts, labelled as machine voice. | **partial**: Render pipeline is dry-run only. `tools/audio/render_tts.mjs`, `docs/voices/tts-evaluation-protocol.md` | M / build | 50 lines rendered and blind-rated by 3 native speakers. | Redistribution rights unconfirmed. |

### H. Pronunciation and speaking feedback (P044-P048)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P044 | Weakness (older review): pronunciation drills absent. (S5) | Timed read-aloud with self-check. | **partial**: Timed read exists; no scoring. `src/timedread/timedread.view.js` | M / build | Learner records reading time over 4 weeks; trend shown. | Review is undated; may be outdated. |
| P045 | Gap (older review): no pronunciation feedback. (S5) | On-device reading-accuracy check, labelled "reading accuracy". | **not started**: No speech recognition. `docs/progress/README.md` | L / build | On 50 test recordings agrees with a human rater 80% of the time. | Per-tradition targets required. |
| P046 | No Duolingo claim made; this is an ALEF-side prong. (none) | Sound-gap guide for English speakers. | **done**: Soundgap view exists. `src/pronunciation/soundgap.view.js` | S / build | Reviewed by a Hebrew teacher. | Unreviewed. |
| P047 | No Duolingo claim made; this is an ALEF-side prong. (none) | Minimal-pair listening (chet/chaf, ayin/alef). | **not started**: None. `src/pronunciation/sounds.view.js` | M / recording | 10 pairs with human audio. | Needs recordings. |
| P048 | No Duolingo claim made; this is an ALEF-side prong. (none) | Record yourself and compare to a model. | **not started**: No audio. `src/audio/player.js` | M / build | Works offline on iOS and Android. | Needs model audio first. |

### I. SRS and retention science (P049-P054)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P049 | Weakness (reported): narrow sentence set recycled. (S1, S5) | Spaced repetition on individual words and lines. | **done**: FSRS-style scheduler. `src/curriculum/srs.js`, `tests/curriculum.srs.test.js` | M / build | Scheduler passes simulation tests. | Parameters not fitted. |
| P050 | Weakness (third-party): recognition over production. (S1) | Production practice: type or recall before reveal. | **partial**: Fade-out recall exists. `src/curriculum/fade.view.js` | M / build | A third of reviews require production. | Mix not measured. |
| P051 | Strength: ~2,000-2,500 words (one source), 4,109 learned words (2024 data page). (S1, S6) | Frequency-ordered 5,000-word list. | **done**: 5,000-word list with packs. `src/vocab/vocab.view.js`, `docs/vocab/LICENSES.md` | M / build | 5,000 words, proofread top 1,000. | proofread:false. |
| P052 | Gap: none reported. (S16) | Prayer-weighted frequency. | **done**: Weight in meta. `data/vocab/meta.json` | S / build | Top prayer words earlier. | Weight 1.5 is a guess. |
| P053 | Weakness (reported): binyanim mixed with vocabulary; limited coverage beyond pa'al. (S5, S2) | Tap-any-verb conjugation tables. | **partial**: Forms exist in data; tap-anywhere not verified. `src/vocab/vocab.view.js` | M / build | Any verb shows all forms on tap. | Wiktionary data unreviewed. |
| P054 | No Duolingo claim made; this is an ALEF-side prong. (none) | Fit the SRS parameters to real review logs instead of defaults. | **not started**: Scheduler uses unfitted parameters; no logs exist. `src/curriculum/srs.js` | M / build | Parameters re-fitted on at least 5,000 real reviews and retention at the scheduled interval is within 5 points of the 90% target. | Needs real users first; do not claim "optimised" before then. |

### J. Gamification and habit (P055-P060)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P055 | Strength: streaks and social nudges described as surprisingly effective. (S12) | Streak from 5 minutes engaged time. | **done**: Engine and timer exist. `src/curriculum/streak.js`, `src/morning/engage.js`, `tests/morning.test.js` | M / build | Streak counts exactly days with 300 seconds in simulated-clock tests. | Draft behaviour. |
| P056 | No Duolingo claim made; this is an ALEF-side prong. (none) | Daily morning verse card as a calm 1-tap habit hook. | **done**: Route plus 130 verses in data. `src/morning/morning.view.js`, `data/morning-verses.json` | S / build | Card opens from Home in 1 tap and shows a verse with a licence record per entry (audit of 130 rows). | Per-verse licence records not verified in this review. |
| P057 | No Duolingo claim made; this is an ALEF-side prong. (none) | Five-minute Word Sprint using vocab packs. | **partial**: Model with tests and view exist; no route in router.js at last read. `src/sprint/sprint.view.js`, `tests/sprint.model.test.js` | S / build | Route registered, and a seeded 5-minute run completes with a result screen in the browser walk. | Sprint images are placeholders; vocab is proofread:false. |
| P058 | No Duolingo claim made; this is an ALEF-side prong. (none) | A belt ladder tied to real reading gates rather than XP and leagues. | **partial**: Belts and gate data exist; gates self-described as unmeasured. `data/curriculum/belts.json`, `data/progress/belt-gates.json` | M / build | Gates calibrated: 5 pilot learners reach belt 2 within the planned time, or gates are revised. | Belt names resemble another product's ladder; trade dress question open (S17). |
| P059 | Strength: followers' cheers motivate. (S12) | Share a progress summary with a teacher or friend, no accounts. | **partial**: Share route exists (local summary). `src/teacher/teacher.view.js` | M / build | A summary exported on one device imports on another and renders the same numbers. | No leaderboard or live friends feature; do not claim parity with Duolingo social. |
| P060 | No Duolingo claim made; this is an ALEF-side prong. (none) | Gentle reminders: calendar ICS and in-browser notifications. | **partial**: Reminder modules exist. `src/curriculum/reminders.js`, `src/curriculum/reminders.ics.js` | M / build | A reminder set for 8:00 fires within 1 minute on a real Android and a real iOS PWA. | Browser notifications on iOS PWAs are not tested; no push server by design. |

### K. Jewish calendar respect (P061-P064)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P061 | Gap: no source found about Shabbat-aware streaks on Duolingo; not verified as absent. (S16) | Automatic Shabbat/Yom Tov streak freeze with observant mode. | **partial**: Freeze logic and tests exist; the simulated-date QA walk (A21) has not been run. `src/curriculum/streak.js`, `docs/strategy/ACTIONS.csv` | M / reviewer | A simulated 4-week calendar including a 2-day Yom Tov: streak equals the number of non-frozen days completed, zero breaks. | Wording is draft; whether the freeze should default on is a decision for John and a rabbi or educator. |
| P062 | No Duolingo claim made; this is an ALEF-side prong. (none) | A pre-Shabbat "done for today" mode that ends the session early on Fridays. | **not started**: Not built. `src/curriculum/reminders.js` | M / build | On Friday afternoons before candle lighting the app offers a 5-minute finish and states streak is safe; shown in a dated simulation. | Needs halachic input on screen use framing; do not decide for users. |
| P063 | No Duolingo claim made; this is an ALEF-side prong. (none) | Calendar with parsha, holidays, candle times. | **done**: Calendar view and tests exist. `src/curriculum/calendar.view.js`, `data/calendar/hebcal-fixtures.json` | M / build | Parsha and holiday dates match Hebcal for 52 weeks of a sample location in an automated test. | Tested against stored fixtures, not live Hebcal. |
| P064 | No Duolingo claim made; this is an ALEF-side prong. (none) | Surface holiday vocabulary and prayers before each festival. | **partial**: Calendar tests exist; surfacing in lessons not verified. `tests/curriculum.calendar.test.js` | M / build | Two weeks before Pesach, Home shows a holiday card linked to a reading in a dated simulation. | Not verified in the UI. |

### L. Community, synagogue, class (P065-P069)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P065 | Gap: Duolingo is individual-first; no source mentions cohorts. (S16) | A 10-week adult class track for shuls. | **done**: Class track route with weekly sheets. `src/classtrack/classtrack.view.js` | M / build | One external host teaches week 1 using only the printed handout and reports no blocking issue. | Unpiloted; content is draft. |
| P066 | No Duolingo claim made; this is an ALEF-side prong. (none) | Teacher summary of a class. | **done**: Teacher view and tests exist. `src/teacher/teacher.view.js`, `tests/teacher.view.test.js` | S / build | A teacher can paste 5 student summaries and see a class view (browser test). | Local only; no cloud sync by design. |
| P067 | No Duolingo claim made; this is an ALEF-side prong. (none) | Host kit so a shul can run the track without John. | **partial**: Check script and test exist. `tools/hostkit/check.mjs`, `tests/hostkit.test.js` | M / build | A volunteer with no ALEF background runs week 1 from the kit alone. | Kit content not externally reviewed. |
| P068 | No Duolingo claim made; this is an ALEF-side prong. (none) | Pilots with three shuls or JCCs. | **blocked-on-human**: Nobody contacted (review: outreach is John's). `docs/strategy/COMPETITOR-REVIEW.md` | L / john | 3 hosts have started the class track, each with at least 5 learners. | Dates in the competitor doc are perishable. |
| P069 | No Duolingo claim made; this is an ALEF-side prong. (none) | A bar/bat mitzvah reading track. | **not started**: Not started; building blocks exist (aliyah ladder). `src/torahread/aliyah.view.js` | L / build | A learner prepares one aliyah in 12 weeks following the track, rated usable by a teacher. | Needs a qualified reviewer; custom of the family's community varies. |

### M. Offline, PWA, performance (P070-P075)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P070 | Weakness: Duolingo offline is limited lessons. (S12) | A full app shell that works offline. | **done**: Service worker and offline test pass on 9 routes in headless Chromium. `sw.js`, `docs/DEPLOY.md` | M / build | Airplane-mode reload works on 9 routes on a real Android and a real iPhone. | Device test not done. Duolingo offline for free users is described as limited lessons (S12); Super offline not checked. |
| P071 | No Duolingo claim made; this is an ALEF-side prong. (none) | Installable PWA with manifest, icons, shortcuts. | **done**: Manifest and tests exist. `manifest.webmanifest`, `tests/pwa.manifest.test.js` | S / build | Chrome Lighthouse installable check passes and install works on one Android and one iPhone. | No device install seen. |
| P072 | No Duolingo claim made; this is an ALEF-side prong. (none) | Pre-download audio packs for offline. | **not started**: Not built; there is no audio to download yet. `docs/ARCHITECTURE.md` | M / build | A learner downloads the Israeli beginner pack (under 30 MB) and plays every clip offline. | Blocked on P037; file-count limits of hosts unverified. |
| P073 | No Duolingo claim made; this is an ALEF-side prong. (none) | Show an update notice and fix the first-session offline gap. | **planned**: Both gaps documented in DEPLOY.md; no code. `docs/DEPLOY.md` | S / build | New-version banner appears after a deployed update; a first-load-then-offline test passes. | Auto-reload during a lesson must be avoided. |
| P074 | Strength: native apps. (S11) | Test the PWA on real iOS and Android devices. | **blocked-on-human**: Nothing tested on a device. `docs/A11Y.md` | M / john | A written pass/fail checklist (install, offline, audio, notifications, tap targets) completed on one iPhone and one Android. | Blocks every claim of "works on phones". |
| P075 | No Duolingo claim made; this is an ALEF-side prong. (none) | Keep first load small and fast. | **partial**: First-paint test exists. `tests/firstpaint.test.js` | S / build | Cold first load under 1.5 MB transferred and interactive in under 3 seconds on a throttled mid-range profile. | Numbers come from emulation. |

### N. Accessibility (P076-P079)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P076 | No Duolingo claim made; this is an ALEF-side prong. (none) | Run axe on every route in four configurations. | **done**: Documented run; critical count 0. `docs/A11Y.md`, `tools/a11y/run.mjs` | M / build | Zero critical and zero colour-contrast failures on all routes in tools/a11y/run.mjs. | Axe finds about a third of issues; label-content-name-mismatch counts are high (912 nodes). |
| P077 | No Duolingo claim made; this is an ALEF-side prong. (none) | Screen-reader audit of the core path. | **blocked-on-human**: No screen reader used. `docs/A11Y.md` | M / reviewer | VoiceOver and TalkBack complete the first lesson with a blind or low-vision tester and no blocking issue. | Hebrew pronunciation by screen readers unverified. |
| P078 | Unverified: RTL issues not sourced. (none) | Correct right-to-left and lang=he everywhere Hebrew appears. | **partial**: Known defect O3: vocab glosses lack lang=he. `docs/STATUS.md` | S / build | Automated scan: every Hebrew text node has lang=he and correct direction on all routes. | No Duolingo RTL defects were found in sources, so no comparative claim. |
| P079 | No Duolingo claim made; this is an ALEF-side prong. (none) | Dark mode, large text, reduced motion. | **partial**: Dark theme exists; some views carry fixed colours; not all viewed. `assets/css/app.css` | S / build | All routes pass contrast in dark mode and 200% text zoom without clipping. | Dark mode not viewed on every route. |

### O. Content quality and trust (P080-P084)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P080 | Weakness: reported errors unfixed. (S14, S11) | A visible "report an error" button and a public fix log. | **not started**: No report path; credits page only. `src/shell/about.view.js` | M / build | Median time from report to fix under 7 days, shown in a public log. | Needs a maintainer; sources say Duolingo Hebrew errors can go unfixed for years (commenters, not verified by Duolingo). |
| P081 | Weakness: uneven quality. (S3, S11) | Paid or volunteer expert review of lessons, vocab and prayer text. | **blocked-on-human**: No review; everything proofread:false. `docs/verification/VERIFICATION.md` | L / reviewer | Top 1,000 words and all prayer records carry a named reviewer and date. | Cost and recruitment are John's; Duolingo's volunteer-to-professional history is Wikipedia-sourced (S11). |
| P082 | No Duolingo claim made; this is an ALEF-side prong. (none) | Visible credits and licence page. | **partial**: Credits exist; not legally reviewed. `src/shell/about.view.js`, `docs/vocab/LICENSES.md` | M / john | Every shipped dataset in docs/vocab/LICENSES.md appears on the About page with attribution text, checked by script. | Legal review pending (A07, A06). |
| P083 | No Duolingo claim made; this is an ALEF-side prong. (none) | Label drafts honestly; never hide that content is unreviewed. | **partial**: Draft notices exist in places. `docs/STATUS.md` | S / build | Every machine-drafted view shows a draft notice; a script lists views missing it. | Inconsistent today. |
| P084 | Weakness: valid alternatives rejected. (S14, S5) | Accept valid answer variants (spelling with/without vav, niqqud). | **partial**: Normalisation helpers exist; coverage not verified. `src/curriculum/hebrew.js` | M / build | On 50 known-valid variant answers, at least 95% are accepted. | Duolingo complaints are from users, not tested by us. |

### P. Book and print (P085-P088)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P085 | No Duolingo claim made; this is an ALEF-side prong. (none) | Printable book. | **done**: Print PDFs exist and are draft. `book/out/alef-book-8.5x11-print.pdf` | L / build | A print proof of one chapter is read cover to cover by a reviewer who lists errors. | Draft; no reviewer has read the book end to end. |
| P086 | No Duolingo claim made; this is an ALEF-side prong. (none) | QR codes link book pages to app routes. | **partial**: QR generator exists; host not deployed. `book/make_qr.py` | S / build | Scanning 10 QR codes opens the right route on a deployed URL. | Blocked by P093. |
| P087 | No Duolingo claim made; this is an ALEF-side prong. (none) | Printable flashcards of letters. | **done**: Letter and A4 PDFs exist. `book/out/alef-mnemonic-flashcards-letter.pdf` | S / build | A learner prints and uses all 22 cards; images approved. | Images unapproved. |
| P088 | No Duolingo claim made; this is an ALEF-side prong. (none) | Workbook with print worksheets. | **done**: Workbook view exists. `src/shell/workbook.view.js` | S / build | All workbook PDFs open and print on letter and A4. | Draft. |

### Q. Pricing and licensing (P089-P092)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P089 | Strength: free content same as paid. (S8) | Publish a free-core pledge. | **planned**: Not written; no billing code. `README.md` | S / john | A one-paragraph pledge is on the About page and README. | Binding commitment; John's decision. Duolingo: free tier has the same lesson content as paid (S8). |
| P090 | No Duolingo claim made; this is an ALEF-side prong. (none) | Choose a licence for the code. | **blocked-on-human**: README says not chosen. `README.md` | S / john | LICENSE file merged. | Until then others cannot lawfully reuse the code. |
| P091 | No Duolingo claim made; this is an ALEF-side prong. (none) | Legal opinion on CC BY-SA vocab data in any sold bundle. | **blocked-on-human**: Not requested. `docs/vocab/LICENSES.md` | M / john | Written opinion from a lawyer stored in docs/. | Costs money; only needed before selling. |
| P092 | Weakness: Super prices. (S8) | Decide what, if anything, is paid later (cohorts, audio packs). | **planned**: No billing code; decision pending. `docs/strategy/COMPETITOR-REVIEW.md` | M / john | Decision recorded with prices benchmarked against current Duolingo Super (US App Store listings $79.99-$119.99/yr per S8). | Prices vary by account; third-party reading. |

### R. Distribution and marketing (P093-P096)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P093 | Strength: store distribution. (S11) | Deploy to a public host. | **blocked-on-human**: Nothing deployed. `docs/DEPLOY.md` | S / john | A public HTTPS URL serves the app and passes the PWA check. | Host free-tier limits unverified. |
| P094 | No Duolingo claim made; this is an ALEF-side prong. (none) | Outreach to shuls, JCCs and NJOP-style hosts. | **blocked-on-human**: No outreach yet. `docs/strategy/ACTIONS.csv` | L / john | 10 contacts made, 3 replies logged in a sheet. | John's relationships; do not invent endorsements. |
| P095 | No Duolingo claim made; this is an ALEF-side prong. (none) | Short videos and posts demonstrating the Day-1 reading win. | **partial**: Research notes exist. `docs/youtube/synthesis.md` | M / john | 4 posts published, with the Day-1 claim only after P001 has data. | Do not publish unproven claims. |
| P096 | No Duolingo claim made; this is an ALEF-side prong. (none) | A public, sourced "ALEF vs Duolingo" page. | **not started**: Not written; this doc is internal. `docs/strategy/DUOLINGO-100.md` | S / build | Every claim on the page has a dated source; reviewed for fairness. | Defamation and staleness risk; use only cited facts. |

### S. Measurement (P097-P100)

| id | Duolingo gap or strength (source) | ALEF move | ALEF has it now? (status; file) | effort / owner | Beaten when | Risk or honesty note |
|---|---|---|---|---|---|---|
| P097 | No Duolingo claim made; this is an ALEF-side prong. (none) | Local, opt-in metrics export, no tracking. | **planned**: Backup/export exists; metrics not built. `src/shell/backup.js` | M / build | A learner can export anonymous stats as a file and delete them. | Without metrics we cannot measure anything else. |
| P098 | No Duolingo claim made; this is an ALEF-side prong. (none) | Head-to-head study: ALEF vs Duolingo Hebrew for adult synagogue goals. | **blocked-on-human**: Not run. `docs/strategy/DUOLINGO-100.md` | L / john | 10 beginners, 2 weeks each arm; ALEF arm reads more prayer lines correctly on a fixed test. | Small n; results are anecdotal, not proof. |
| P099 | No Duolingo claim made; this is an ALEF-side prong. (none) | Standard reading benchmark. | **partial**: Timed read-aloud exists. `src/timedread/timedread.view.js` | M / build | Same 10 lines timed at weeks 0, 2, 4; median speed up 30%. | Self-reported timings. |
| P100 | No Duolingo claim made; this is an ALEF-side prong. (none) | Re-run this scorecard every quarter. | **planned**: This document exists; no schedule. `docs/strategy/DUOLINGO-100.md` | S / build | Scorecard dated and diffed each quarter with new sources. | Facts about Duolingo change. |


## 8. Sources (all fetched 2026-11-03 unless noted)

| Id | URL | Used for | Notes |
|---|---|---|---|
| S1 | https://www.clozemaster.com/blog/?p=7907 | Duolingo Hebrew ~A2, exercises, plateau, nikud/unpointed gap | Third-party blog, undated; vendor of a competing product |
| S2 | https://www.clozemaster.com/blog/?p=7597 | Gaps after the course, A2, slower audio | Same publisher; undated |
| S3 | https://red.ks32.dev/r/hebrew/comments/1jqyujg/duolingo_hebrew_sucks_alternatives | Reddit r/hebrew thread (mirror): audio gaps, hidden niqqud/letters, grammar, uneven quality | User opinions; date not shown in the mirror |
| S4 | https://reddit.sentinel-team.org/posts/1rbzyn5/snapshots/2026-02-23T15%3A13%3A45.558517Z | Reddit post (about June 2025): first lesson asks to write Hebrew; Letters tab hidden | Snapshot of 6 of 8 comments |
| S5 | https://web.ma.utexas.edu/users/sadun/DuoHebrew.pdf | Detailed older review: exercise types, voices, binyanim, grading | Undated and likely about an older course version |
| S6 | https://duolingodata.com/dat/hefen96.html | 2024 structure: 96 units, 3 sections, 4,109 words, no Stories | Version dated 2024-05-04 |
| S7 | https://lingoly.io/units-each-duolingo-language/ | Sept 2026 claim: 5 sections, 60 units | Counts do not sum; conflicts with S6 |
| S8 | https://www.mindomax.com/duolingo-cost | Prices, Energy/ads, Max languages, Max retirement remark | Third party, dated 2026-10-13; prices vary |
| S9 | https://blog.duolingo.com/duolingo-energy/ | Energy replaces Hearts; recharges in about a day | Duolingo blog, 2025-07-03 |
| S10 | https://blog.duolingo.com/duolingo-max | Max at launch (2023): languages for Roleplay and Video Call | Duolingo blog; current availability not stated |
| S11 | https://en.wikipedia.org/wiki/Duolingo | MAU, subscribers, Max, Math/Music/Chess, volunteers ended, CEFR display | Wikipedia; read to character 100,000 of about 107,756 |
| S12 | https://turtledovethoughts.blogspot.com/2026/02/duolingo-hebrew-2026-review-honest.html | Feb 2026 learner review: hidden Letters, gamification, offline | One blogger, 30 days |
| S13 | https://integraliah.com/can-you-learn-hebrew-on-duolingo-an-in-depth-look/ | Exercise types listed | Published 2024-06-17, updated 2026-07-25 |
| S14 | https://lr.psf.lt/r/hebrew/comments/12gvpvb/i_tried_duolingos_placement_test_for_hebrew_as_a | r/hebrew native speaker, April 2023: audio, grading, formality, no handwriting | Mirror; 2023, may be outdated |
| S15 | https://aws.amazon.com/blogs/ai/powering-language-learning-on-duolingo-with-amazon-polly | Duolingo uses TTS broadly (2017) | Does not mention Hebrew; not evidence about Hebrew audio |
| S16 | ~/research_notes/competitor/competitor-analysis.txt | The user's competitor analysis (Duolingo section lines 68-103, 585-586) | Internal; its Duolingo-wiki claims could not be re-checked |
| S17 | docs/strategy/COMPETITOR-REVIEW.md | Review that flags unverified claims | Internal |

**Could not fetch / not verified:** `duolingo.fandom.com` Hebrew pages and `support.duolingo.com` (blocked by the allowlist); any first-party Duolingo statement on Hebrew; current unit count; current niqqud policy; Hebrew TTS vendor; RTL issues; app store review text and ratings for Hebrew; leagues, Friends Quests and Super offline details; accessibility of the Duolingo app; Hebrew-specific retention data; Duolingo Max availability for Hebrew today.
