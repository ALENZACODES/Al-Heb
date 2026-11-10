# Intermediate path QA (first five lessons)

Observed on 2026-11-04. Headless Chromium (Playwright), 375x667 touch viewport, static server from tools/serve.mjs, service workers blocked, locale en-CA, congregation setting left at the default (sephardi). A scripted emulation, not real learners: it taps what a script can find and does not judge Hebrew, audio or comprehension. Two profiles: fresh, and one seeded with the beginner lessons (r01-r51, il01-il24) marked complete. Lessons I-01 to I-05 were played start to finish with a first-option-every-time strategy (about half of the answers wrong on purpose, so retries and requeueing were exercised). Scratch scripts and screenshots were in /tmp and have been deleted.

## What worked

- Route `#/intermediate` and `#/intermediate/I-0x` open on a fresh and a seeded profile; 0 console or network errors in either.
- Preview banner ("Preview: unreviewed, may change", with the longer "not part of the first release yet" note for screen readers) shows at the top of the list and of every lesson page, also after the lesson re-renders. Draft and "needs native review" notes are shown on both screens.
- All exercise types met in I-01..I-05 played through with a Next/Finish button after every answer: respond, order, fade, spot, recall, produce, match, dialogue. No dead end, no horizontal overflow at 375px, no tap target under 40px reported by the script.
- Each lesson ended on "Lesson finished" with a Next lesson link and a link back to the list.
- Progress saves: after the five lessons the list shows "5 of 50 lessons finished" with per-lesson scores (8/16, 10/17, 9/18, 11/15, 7/18); it was identical after a page reload; `intermediate.v1` and `curriculum.progress` held I-01..I-05; 78 word/line cards were created from misses. Answering one exercise of I-06 and reloading gave "1 of 16 answered" and a "Continue" button.
- Fresh profile: lesson pages are open but say "Finish ... first. You can still look around." Nothing is locked.

## Prerequisite vocabulary (computed from data)

Method: tokens of each intermediate lesson's Words list, unpointed, compared with every token in the beginner lessons' words and earlier intermediate lesson words; a token also counts as known if it (or it minus one common prefix letter) has frequencyRank <= 1500 in data/vocab/words.json. Whole-entry matching (lesson word = vocab entry) is too strict here because most entries are phrases.

- New "hard" tokens in the lesson's own Words list (rank above 1500, absent from vocabulary, or not in words.json, and not introduced earlier): I-01 2, I-02 6, I-03 6, I-04 5, I-05 3. Across I-01..I-50: 245 of 809 distinct word tokens, in 49 of 50 lessons. These words are all in the lesson's own Words section, which is shown before the exercises, so they are taught up front rather than assumed.
- Words that appear only inside exercises, not in any Words list or earlier lesson (not taught anywhere): I-01 1 (אלהיך), I-02 10, I-03 10, I-04 8, I-05 7. Examples: I-02 צבאות, חסדים, עוזר, ומושיע; I-04 דקודשא, עלמיא, שמיא; I-05 השמים, ויכלו. These come from whole prayer lines used in order/fade/spot exercises. A learner meets them without a gloss except in the answer text. Listed for review, not changed.
- Beginner link: I-01 requires r51 (title "Grey-belt assessment"), which a learner who finished the beginner lessons has. When this was observed, the fresh-profile note read "Finish Grey-belt assessment first", and "belt" is a course term that nothing on the intermediate screens explains. Fixed afterwards, see "Fixed after this observation".

## Gloss register and pronunciation (first five lessons, observed)

For native review, nothing was changed:

- Divine name: I-02 glosses אֲדֹנָי as "my Lord", while exercise text uses "the LORD" for the four-letter name and "our God" elsewhere.
- Mixed informal and liturgical glosses: "cheers!" for לְחַיִּים and "peaceful Sabbath (greeting ...)" beside "who sanctifies the Shabbat". "Sabbath" and "Shabbat" are both used in I-05.
- Gloss style varies: "open (you will open)", "bless! (the leader's call)", "magnify! (leader's invitation)", "(Aramaic)" on some Kaddish words but not on others (יִשְׂרָאֵל and אָמֵן are not marked, fine; "who makes peace" is Hebrew and unmarked, fine). Spelling "for ever" (two words).
- I-04: עָלֵינוּ glossed "it is upon us" in a Kaddish lesson; the goal text elsewhere uses Aleinu as a prayer name.
- Transliteration is inconsistent for khaf/chet: "barkhu", "hamevorakh", "levavekha", "zakhor" but "echad", "tiftach", "chadesh", "lechem", "lechayim", "chayim".
- I-05 נֵר glossed "oil lamp, candle".

## Plain-language UI

- Exercise names are plain ("Choose the Hebrew", "Put in order", "Spot the word"). Rating buttons "1 Again / 2 Hard / 3 Good / 4 Easy" are used without a prompt saying what they mean beyond "How did you do?".
- Feedback "Marked as known." / "Marked to review." is clear.
- Counter oddity (as observed, fixed afterwards): the "N of M" in the exercise heading and progress bar grew when a wrong answer was requeued (I-01 showed "of 16", "of 17", "of 18", "of 20" while the lesson has 16 exercises), and the summary says "8 of 16 marked as known".

## Bugs fixed in src/curriculum/intermediate.view.js (mechanical)

1. The lesson intro page printed the literal text "null" twice (null children passed straight to replaceChildren). Now filtered. Verified in the browser: no "null" text.
2. Start button was 2500-3200px down the page (4-5 screens) after the goals and a 10-15 word list. Added a "Jump to the exercises" button above Goals. Verified present; it moves focus to the Start button.
3. "Finish <title> first" used the full I-01 title (about 70 characters) on every locked list row. Intermediate prerequisites are now shown as their id ("finish I-01 first"); beginner lessons keep their titles. Verified on the list.
4. `.alef-int-opt[data-state=right|wrong]` styles existed in learn.css but the view never set the attribute, so one-tap answers (produce, spot) had no mark on the buttons. They now mark the right answer and a wrong pick (with the check or cross prefix from the CSS). Verified only by the unit test render (no wrong-state screenshot taken); the register type was left as is.

## Fixed after this observation (changes in src/curriculum/intermediate.view.js, read from the working-tree diff)

These three items were open when the notes above were taken and have since been changed in the view code. I read the diff; I did not re-play the lessons in a browser for this update, so the effect on screen is not re-observed here.

1. Match exercises: each Hebrew phrase now has one select ("Choose the meaning", with a visually hidden "Meaning of ..." label) in place of a button per meaning under every phrase, so the exercise should no longer run to 16-25 buttons. Screen height after the change was not measured here.
2. Counter: the heading and progress bar now count first answers against the lesson's fixed number of exercises ("question N of 16", "N of 16 done"), and requeued retries are counted apart ("plus N to retry", "retry N of M"), so the total no longer grows.
3. Belt wording: prerequisite notes now say "the beginner <title without the belt word> (lesson r51)" instead of "Grey-belt assessment". The exact text on screen was not read in a browser for this update.

## Open items (not fixed)

- On some exercises the Next button is still below the first screen. Which exercise types, and by how much, was not re-measured after the match-select change.
- The exercise-only untaught words listed above, and the register notes, need a native reviewer.

## Tests run (final run, after the changes)

tests/curriculum*.test.js (14 files), tests/intermediate.links.test.js and tests/v0.test.js: all 0 failures. During the work, curriculum.reviewpics failed once (stale word-vocab-map.json) and passed on the later run; I did not touch that data.
