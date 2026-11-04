# ALEF vs Duolingo Hebrew (refreshed 2026-11-04)

Directive from John: "duolingo hebrew is the one to beat." `docs/strategy/duolingo-100.csv` still holds the 100-row plan (canonical, checked by `tests/strategy.duolingo100.test.js`); its status words were not re-audited in this refresh. This file now has three parts: what is known about Duolingo Hebrew (third-party, unchanged from 2026-11-03), a feature-by-feature table of ALEF as it is today, and where ALEF is deliberately different.

**Reading the status words.** `built` means the code and data exist in this checkout and the path is given. It does not mean a learner has tried it, a Hebrew educator has reviewed it, or it has run on a real phone: none of that has happened for any feature. `partial` means part of the feature exists. `missing` means nothing exists. ALEF does not have parity with Duolingo Hebrew on anything that needs scale, audio or a store app (table below).

Facts about ALEF measured on 2026-11-04 are in `docs/STATUS.md` with their commands: 73 routes, 125 core lessons, 50 intermediate lessons, 6,297 vocabulary records, 70 corpus records, 0 of 16,710 audio clips recorded, 0 images approved, 0 rows reviewed by natives (of 7,039 in the packs), nothing deployed, no learner has used it.

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


## 3. Feature by feature: Duolingo Hebrew vs ALEF today

Duolingo column: what the sources in section 1 say (third-party, some conflicting; no first-party description was obtained). "Not reported" means I found no source either way, not that it is absent.

| # | Feature | Duolingo Hebrew (section 1 source) | ALEF today | Status | Evidence in this repo |
|---|---|---|---|---|---|
| 1 | Alphabet teaching | A Letters section behind a menu (S12, S3) | Letter atlas, stroke tracing (print and cursive), look-alike drills | built, untested with learners | `src/letters/atlas.view.js`, `src/letters/trace.view.js`, `src/curriculum/spotit.view.js`, `src/curriculum/checkpoint.view.js` |
| 2 | Niqqud (vowel signs) | Conflicting reports (S1, S3) | Vowel trainers, syllable ladder, pointed-to-unpointed ladder | built (unpointed fade-out is partial) | `src/pronunciation/`, `src/curriculum/ladder.view.js`, `src/firstday/ladder.view.js`, `src/curriculum/fade.view.js` |
| 3 | Lesson path | Dozens of units, thousands of exercises (S6, S7) | 125 core lessons plus 50 intermediate lessons; all unreviewed | built, far smaller in scale | `data/curriculum/lessons.json`, `data/curriculum/lessons-intermediate/`, `src/curriculum/lesson.view.js`, `src/curriculum/intermediate.view.js` |
| 4 | Vocabulary | 4,109 words in a 2024 version (S6) | 6,297 records from open sources; pointing and glosses unreviewed; share-alike licence | built, unreviewed | `data/vocab/words.json`, `src/vocab/`, `docs/legal/CONTENT-LICENCE-AUDIT.md` |
| 5 | Spaced review | Review and strength described loosely (S5) | Scheduler and review screen; settings never fitted to real learner data | built, unproven | `src/curriculum/srs.js`, `src/curriculum/review.view.js` |
| 6 | Placement test | Exists (S14) | A draft placement check; a look-alike checkpoint | partial (draft, never run on a learner) | `src/placement/placement.view.js`, `src/curriculum/checkpoint.view.js` |
| 7 | Native audio | Native recordings, some gaps (S14, S3) | None. 0 of 16,710 clips recorded; browser voice fallback only | missing | `data/audio/manifest.json` (all `missing`), `docs/voices/coverage.md`, `docs/tts/README.md` |
| 8 | Speaking practice | No Hebrew pronunciation scoring reported (S5, old) | Say-it screen with browser speech recognition; timed read-aloud with no scoring | partial, draft | `src/speak/speak.js`, `src/speak/recognizer.js`, `src/timedread/timedread.view.js` |
| 9 | Listening exercises | Dictation, listening (S1, S13) | Listen-and-pick screen; no recorded audio to play, so it relies on the browser voice | partial | `src/listen/listen.view.js` |
| 10 | Typing practice | Typed translation, strict grading (S1, S4) | Hebrew keyboard layout trainer | built | `src/typing/typing.js`, `src/typing/typing.view.js` |
| 11 | Streak | Streaks, effective per one reviewer (S12) | 5-minute daily streak with Shabbat and Yom Tov freeze; simulated over 395 days in three modes | built (simulation only, no users) | `src/curriculum/streak.js`, `src/morning/engage.js`, `docs/qa/STREAK-FREEZE.md`, `tests/streak.freeze.test.js` |
| 12 | Reminders and push | Push notifications in native apps | Web Notification API and calendar-file reminders; no push server, no store app | partial | `src/shell/notify.js`, `src/shell/notify.view.js`, `docs/deploy/NOTIFICATIONS.md` |
| 13 | Leagues, friends, social | Leagues, cheers, followers (S12; leagues not verified) | None. A progress summary a learner can hand to a teacher | missing (share summary partial) | `src/teacher/teacher.view.js` |
| 14 | Energy or lives limit | Energy battery on the free tier (S9) | None, and no ads or accounts | not applicable by design | `src/store.js` (local storage only) |
| 15 | Progress and goals | Course progress, words learned | Progress screen with belts, what-you-can-read counts, weekly summary | built | `src/progress/progress.view.js`, `src/progress/decode.js` |
| 16 | Gamification polish | Gems, XP, polished animation, A/B tested at scale | Plain, unpolished | missing | no code; see `docs/strategy/duolingo-100.csv` section J |
| 17 | Mobile app in stores | iOS and Android apps | Static PWA; install prompt coded; Capacitor wrapper is notes only | partial (nothing deployed, never run on a device) | `manifest.webmanifest`, `sw.js`, `docs/CAPACITOR.md`, `docs/qa/DEVICES.md` |
| 18 | Offline | Limited without data (S12) | Service worker; offline reload passed on 9 routes in headless Chromium; audio shards fetched at runtime | partial (emulation only) | `sw.js`, `docs/DEPLOY.md`, `src/shell/offline.view.js` |
| 19 | Accessibility | Not researched | Keyboard walk, axe checks; open defects listed | partial (no screen reader testing) | `docs/A11Y.md`, `docs/qa/SWEEP.md` |
| 20 | Grammar explanation | Weak by reviewer accounts (S1, S2, S5) | Short grammar notes and gender-pair practice | partial, unreviewed | `src/grammar/grammar.view.js`, `src/curriculum/gender.view.js` |
| 21 | Everyday conversation | Translation and dictation sentences (S1) | Israel dialogues and a "sound like a local" track; no interactive conversation | partial, unreviewed | `src/curriculum/dialogues.view.js`, `src/israel/israel.view.js` |
| 22 | Conversation roleplay and video call (Max) | Roleplay and video call not listed for Hebrew (S10) | None | missing | none |
| 23 | Stories | None for Hebrew in the 2024 version (S6) | Reader of prayer and Torah texts, not stories | different (see section 4) | `src/corpus/read.view.js` |
| 24 | Handwriting | Not taught (S14) | Stroke-order tracing in print and cursive; cursive reading missing | partial | `src/letters/trace.view.js`, `src/wordtrace/wordtrace.view.js` |
| 25 | Price | Free with ads and energy; paid from about $80 a year (S8) | Free, no account, no ads, but nothing deployed and no licence chosen | not live | `docs/legal/DECISIONS-FOR-JOHN.md`, `docs/deploy/CLOUDFLARE-PAGES.md` |
| 26 | Content review and trust | Long-standing error complaints (S14, S3) | No native or clergy review yet: 0 of 7,039 rows | missing | `docs/review/STATUS.md` |
| 27 | Scale, brand, reach | 130 million monthly users (S11) | No users | missing | none |

Where Duolingo is clearly ahead today: native audio, scale of content and exercises, gamification and habit machinery, store apps with push, reach. ALEF has no advantage that has been tested.

## 4. Where ALEF is deliberately different (not a Duolingo clone)

These are choices, not claims of being better. None has been tested with learners.

- **Liturgical and Torah Hebrew, not only modern Hebrew.** A reader for prayers and Torah passages with cantillation tables and trope, a Torah-service guide, a morning-prayer card, and a follow-the-service view. No source describes Duolingo's Hebrew course covering this (absence not confirmed from first-party material). Evidence: `src/corpus/`, `src/trope/`, `src/service/`, `src/morning/`, `src/torahreader/`. All of it is unreviewed by clergy.
- **Three pronunciation traditions.** Israeli, Sephardi and Ashkenazi settings change respellings and, once recordings exist, which voice plays; the app compares them and quizzes which tradition a reading uses. Evidence: `src/pronunciation/`, `src/traditions/`, `data/audio/manifest-words-*.json`. Rules and respellings were set by the project and have no reviewer (packs 05a to 05c in `docs/review/STATUS.md`). No Sephardi audio rule has been decided.
- **Reading first.** The aim is to read a siddur and follow a service, plus an Israel track; loanwords, look-alike drills and pointed-to-unpointed ladders come before conversation.
- **Jewish calendar respect.** The streak freezes on Shabbat and Yom Tov (rest-day rules by observance mode); the calendar view and festival vocabulary follow the Hebrew year. Evidence: `src/curriculum/streak.js`, `src/festivals/`, `src/curriculum/calendar.view.js`. Verified by simulation only.
- **Teacher and class use.** Class track, share-my-progress and class-summary screens, and a host kit for a facilitator. Evidence: `src/classtrack/`, `src/teacher/`, `docs/host-kit/`. No class has used them.
- **Local-first.** No account, no server, progress stored on the device with a backup file. Evidence: `src/store.js`, `src/shell/backup.js`. Clearing site data loses progress unless a backup was downloaded.

## 5. Not claimed

- No claim that ALEF beats, equals or approaches Duolingo Hebrew on audio, scale, polish, retention or reach.
- No claim about learner outcomes. The head-to-head study and the five-learner first-session test in the CSV have not been run.
- No claim that any Hebrew, pointing, translation or prayer text is correct; none is reviewed.

## 6. Sources (all fetched 2026-11-03 unless noted)

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
