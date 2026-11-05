# Copy audit 2: the first ten minutes

Date: 2026-11-04. Scope: learner-facing English from first launch to the first review, at 375x667 in headless Chromium, plus the source views.

Screens run: first-run setup (goal, letters question, pronunciation style, plan), Home, Your first 10 minutes (including a wrong answer), Letters (trace, Animate, Hint, memory card), Lesson r01 and its quick check, Review (empty), Learn, Settings, Offline, Install, 404, `offline.html`, and the four preview pages (Vowel marks fading out, Roots, Gender drill, Record and compare).

What I did not run: a wrong stroke on the trace canvas (the mouse test produced no feedback line I could read), the lesson quick check beyond question 1, and a review with due cards. For those I read the source (`exercises.session.js`, `review.view.js`, `trace.view.js`). Other lanes were editing the same files while I worked (`plain-copy.js`, `today.js`, `lesson.view.js`, `settings.view.js`, `firstday.view.js`, `memorycard.js`). Where their wording replaced mine, the table shows the text now on disk.

Rules used: plain words, 15 words or fewer per sentence, no jargon (IPA, niqqud, "respelling", "pointing"), warm but not childish, no overstated claims, honest draft labels, no shaming, one name per thing.

Status: **fixed** = changed in `src` or `data` in this pass; **open** = not changed (reason given).

## 1. Findings

| Screen | String (as it was) | Problem | Proposed / applied text | Status |
|---|---|---|---|---|
| Setup, step 1 | "Yes, I read with vowels" | "vowels" alone is vague; the app says "vowel marks" elsewhere | "Yes, I can read with vowel marks" (`onboarding/model.js`; test and QA tool comment updated) | fixed |
| Setup, step 2 | "Which way of saying Hebrew?" | Awkward; the setting is called "Pronunciation style" | "Which pronunciation style do you want?" | fixed |
| Setup, step 2 | "Optional: your movement" (inside it: "Which branch of Judaism are you part of?") | Summary and question use different words; "movement" is unclear | "Optional: your branch of Judaism" | fixed |
| Setup, plan | "Change synagogue or pronunciation" | Two names for one choice | "Change pronunciation style" | fixed |
| Setup, minutes | "This is your own study goal." | Home and Progress say "Daily goal" | "This is your own daily goal." | fixed |
| Setup, plan | "Your goal is 10 minutes a day. The lessons below add up to about 155 minutes this week." | The plan is more than twice the stated goal. Also Home then shows "Daily goal: 5 min" (setup default 10, Home default 5) | Not a wording problem. Make setup write the goal it shows, or say "lessons are 15 to 30 minutes each" | open (logic/data) |
| Home | "Study goal: 5 min" | Three names for one thing | "Daily goal: 5 min" (`home/today.js`; `tests/home.today.test.js`) | fixed |
| Home | "Paused. Your best streak was 3 days. A new one starts when you finish a counted day." | "Paused" reads as a fault; "counted day" is unclear | "Your best streak was 3 days. A new one starts the next time you study for 5 minutes." | fixed |
| Home | "Today is not counted yet." | Loss framing | "Study for 5 minutes today to add a day." | fixed |
| Home | Streak rule, 24 words in one sentence | Over 15 words | Now `plain('streakRule')` (other lane): "A day counts when you study for 5 minutes. The timer stops if you do not tap for a minute." | fixed |
| Home | "Welcome back. Nothing to catch up on. Ease in with a few review cards (stop whenever you like), or go straight..." | 19 words, brackets | Now `plain('welcomeBackDue')` (other lane). The no-cards variant is still a colon sentence; fine | fixed |
| First 10 minutes | "(Sephardi respelling, rule-generated)" | "respelling" is jargon | "(how it sounds in English letters, Sephardi style; made by rules)" | fixed |
| First 10 minutes | "Pointing and gloss are draft course data; the Latin respelling is rule-generated..." | Three jargon words | "The vowel marks and the English meaning are draft course data. The English-letter spelling of the sound was made by rules for Sephardi style." | fixed |
| First 10 minutes | "5 of 5 wins · budget 10 min (a design target, not measured)" | "budget", "design target" | "5 of 5 wins · about 10 minutes in all (a goal, not measured)" | fixed |
| First 10 minutes | "Each letter carries the vowel sign under it, so you read the letter and then its sign as one piece." | 22 words; "sign" | "The vowel mark sits under its letter. Read the letter and its mark together as one sound." | fixed |
| First 10 minutes | Step titles and prompts: "Your first vowel sign: the small T", "Which one has the vowel sign under it?", "Win 3 of 5: your first vowel sign." | "vowel sign" vs "vowel mark" | "vowel mark" in all six strings in `data/firstday/onramp.json` | fixed |
| First 10 minutes | "No Sephardi recording yet: the device voice speaks Israeli Hebrew, so it will not match your Sephardi setting. Read the respelling instead." | 18 words; "respelling" | "There is no Sephardi recording yet. The device voice speaks Israeli Hebrew, so it will not match your Sephardi setting. Read the English-letter spelling instead." (`pronunciation/forTradition.js`; three tests in `accents.lanes.test.js`) | fixed |
| First 10 minutes | Wrong answer: "Not quite: it is Shin. Nothing is lost." | none | Keep. Warm, short, no blame | ok |
| First 10 minutes | Draft banner: "Draft, unreviewed: no Hebrew teacher has checked it and no learner has tried it yet." | none | Keep. Honest and 17 words in two clauses; acceptable | ok |
| Memory card | "No recording yet, and the device voice speaks Israeli Hebrew, not Sephardi: read the respelling." | 16 words; "respelling" | "No recording yet. The device voice speaks Israeli Hebrew, not Sephardi. Read the English-letter spelling." Same for the fallback-voice line (`letters/memorycard.js`, test updated) | fixed |
| Memory card | Button "Play the chain" | "chain" is a build term | "Show one step at a time" | fixed |
| Letters | Header line "/ʃ/ sh with the right dot, s with the left dot" | IPA slashes with no gloss | Slashes removed from the Letter page header (`letters/trace.view.js`). The sound words stay. The atlas still shows IPA but has an explaining line | fixed |
| Letters | Toggles "Strict" and "Outline" | Unclear what they do | "Strict checking" and "Show outline" | fixed |
| Letters | "Show me, stroke by stroke (buttons)" | Wordy; "(buttons)" | "Walk me through it with buttons" (letters and word trace; `tools/a11y/keyboard.mjs` matcher updated) | fixed |
| Letters | "Stroke order is a draft awaiting teacher review. (draft)" | Says "draft" twice, and the same warning appears again above it | Drop the "(draft)" suffix in `reviewNotice`. It is a code branch, not a wording change | open |
| Letters | "Draft: an Israeli teacher has not yet checked the stroke order and shapes. If your school teaches a different order, follow your teacher." | none | Keep | ok |
| Lesson r01 | "White belt · 20 min · Read the siddur" | "siddur" not explained | "... Read the prayer book" (`curriculum/lesson.view.js`). Also in `intermediate.view.js`: still "siddur" | fixed (r01); open (intermediate view) |
| Lesson r01 | "Baby steps: 5 screens, about 2 minutes each." | "Baby steps" is childish; "screens" vs "Step 1 of 5" | "Short steps: 5 steps, about 2 minutes each." | fixed |
| Lesson r01 | "Draft content: glosses and pointing have not yet been reviewed by a native speaker." | Jargon | Now `plain('lessonDraft')` (other lane): "This is a draft. A native Hebrew speaker has not checked the meanings or vowel marks yet." | fixed |
| Lesson r01 | Vowel rows "a as in father [a(ː)]", "sh as in shoe [ʃ]" | IPA in brackets, no gloss | Brackets removed from the lesson page (`lesson.view.js`) | fixed |
| Lesson r01 | "Sounds like: shav (Sephardi respelling)" (lesson and Review) | "respelling" | "Sounds like: shav (Sephardi style)" | fixed |
| Lesson r01 | Button "Practise these cards" | British spelling; a third name for review | "Review these cards" (lesson page, two places) | fixed |
| Lesson r01 | "There is no lesson with id "x"." / "Could not load lesson content: <raw error>" | Shows an id and a raw error | "We could not find that lesson." / "This lesson did not load. Please reload the page and try again." | fixed |
| Quick check | Verdicts "Correct." "Right." "Yes." "That's it." / "Not quite." / "Still tricky. It will come back in your review." | none | Keep. No shaming, no gushing | ok |
| Quick check | Summary "That was a tough one. 3 to look at again; they are in your review..." | Semicolon, 22 words | Now `plain('closingTough')` (other lane): "That was a hard one. 3 to look at again. They are in your review. You can try the lesson again if you like." | fixed |
| Review (empty) | "Nothing due" then "No reviews are due. Complete a lesson to add cards, or come back later." then "All caught up." | Same message three times | Keep the first two. Drop "All caught up." (small, layout only) | open |
| Review | "That one will come back soon." / "How well did you remember it?" | none | Keep | ok |
| Settings | "Sound currently comes from your browser's text-to-speech voice." | Jargon | Now `plain('settingsIntro')` (other lane): "Sound comes from your device's own voice." | fixed |
| Settings | Pronunciation style group had no explanation | A learner cannot tell what "Ashkenazi" changes | Added line: "Pronunciation style is the way Hebrew sounds are said. It changes the sounds you hear and read. Pick the one your synagogue or teacher uses." | fixed |
| Settings | Gender help: 4 sentences up to 26 words, "pair cards" | Long; unknown term | "Hebrew words change with the speaker's gender. "I am a student" is different for a man and a woman. The gender drill and the "Sound like a local" pages use this choice, so you only say it once. Until you choose, pages show both forms or ask you. ALEF never assumes masculine. The choice stays on this device and is included in your backup." | fixed |
| Settings | "Could not restore: <raw error>. Your progress on this device was not changed." | Raw error text remains | "This file could not be restored. Your progress on this device was not changed." (keep the code in a details line) | open |
| Settings | "Accessibility: text, sound, colour, touch and calm settings" | British spelling in an otherwise US-style app | "color" | open (spelling pass) |
| Offline | "Word audio index (sephardi)", "Audio clip index (core)" | "index" | "Word audio list (Sephardi)", "Audio clip list (core)" (`shell/offline.js`; test updated) | fixed |
| Offline | "Photo reader engine (OCR)" | "OCR" | "Photo reader (text recognition)" | fixed |
| Offline | "...grammar and traditions data" | "traditions" never explained | "...grammar and pronunciation-style data" | fixed |
| Offline | "about 416 B (about 0% of the small space browsers allow for this; we assume 5 million characters)" | Cramped; "B" | "about 416 bytes" and drop the assumption into a details line | open |
| Offline | "Your progress is not protected from automatic browser clean-up yet." then, below, "Progress is not protected from automatic browser clean-up. Use..." | Said twice | Keep the second, which has the action | open |
| Install | "Put ALEF on your home screen so it opens like an app, works offline, and can remind you to study." | 19 words | "Add ALEF to your home screen. It opens like an app, works offline, and can remind you to study." | fixed |
| `offline.html` | "ALEF could not load this page and it is not saved on this device yet. Reconnect and open ALEF once to make the app available offline." | 18 and 15 words | "ALEF could not load this page. It is not saved on this device yet. Reconnect and open ALEF once to use it offline." The file is in the precache list, so the manifest hash is stale until `build-precache` is run | fixed (precache not rebuilt, per instructions) |
| 404 | "Page not found" + the path + "Home" | Cold | "We could not find that page." under the title | open |
| Learn | Card names "Syllable ladder", "Fade-out recall", "Look-alike checkpoint" | Tool names, not actions | e.g. "Read with fewer vowel marks", "Recall a line as it fades" | open (no owner agreed; same as old audit) |
| Learn | Button "Mark complete" | Lets a learner skip the quick check without saying so | "Mark complete without the quick check" | open |
| Learn / lessons data | Intermediate titles: "the few lines the corpus holds", "new siddur page", "Grey-belt assessment" | "corpus", "siddur", "belt" in data titles | "the few lines ALEF has", "new prayer book page", "Grey-belt check" | open (data) |
| Preview banner | "Preview: unreviewed, may change" | none | Keep. Honest and short | ok |
| Preview: Vowel marks fading out | Title "Vowel points, fading out"; "Stage 1: full points"; "Points shown: stage 1 shows every point."; "Show the points"; "the 20-step pointed to unpointed ladder"; "aided read" | "points", "pointed", "aided" | "Vowel marks, fading out"; "Stage 1: all vowel marks"; "Vowel marks shown: stage 1 shows every mark."; "Show the vowel marks"; "the 20-step ladder from vowel marks to none"; "This counts as a read with help." Title also changed in `nav.strings.js` and `router.js` | fixed |
| Preview: Roots | "364 groups of two or more words share letters in the data, 151 have three or more, 82 pass the stricter rule check and 0 are confirmed by a Hebrew reader." | One 40-word sentence | "... A verb pattern is listed for 1817. 364 groups of two or more words share root letters, and 151 groups have three or more. 82 groups pass a stricter check made by rules. A Hebrew reader has confirmed 0 groups. Verbs without a root are not grouped." | fixed |
| Preview: Gender drill | "Words and pointing come from the word list; ... adjective agreement is not drilled here." | "pointing", "agreement" | "Words and vowel marks come from the word list. The sentences are simple: "I / you / he / she" plus a word. The word list has no feminine adjectives, so adjectives that change with gender are not drilled here." | fixed |
| Preview: Record and compare | "Rule-made respelling: ikel (unreviewed)" | "respelling" | "English-letter spelling, made by rules: ikel (unreviewed)" | fixed |
| Preview: Record and compare | "In this style: alef is a glottal stop [ʔ], ayin is pharyngeal [ʕ]" | IPA and two Latin terms | Needs a plain line in `data/pronunciation` (for example "alef is a short stop in the throat; ayin is a deeper throat sound"). I would not write it without a pronunciation reviewer | open (data) |
| Progress (outside the ten minutes, but one tap away) | "Siddur coverage", "mature means the scheduler expects you to keep them for 21 days", "Taught rows", "Belts" | Still in the old wording | See old audit section 3b | open |

## 2. Names: what is now consistent, what is not

| Thing | Now | Left |
|---|---|---|
| Daily goal | Home, setup, Progress all "Daily goal" | Setup default (10) and Home default (5) disagree in number |
| Vowel mark | First 10 minutes, onramp data, setup, preview pages | Progress and some lesson data still say "vowel signs" / "signs" |
| Review | Lesson button is "Review these cards"; Review page title "Review" | the Ladder, Checkpoint, Fade and Scaffold screens still say "Practise" or "practised" (not in the first ten minutes) |
| Pronunciation style | Setup, Settings, offline list | A few nav and data strings still say "tradition" |
| American spelling | "Practicing", "Review" | "colour", "licences", "Practise", "recognise" remain on Settings, Credits, Ladder and Loanwords |

## 3. What the old audit said, and where it stands

Old file: `docs/review/COPY-AUDIT.md`.

Fixed since then, confirmed in the rendered app unless marked "source":
- Learn: belt line ("Your level: White belt. Belts are ALEF's own levels..."), "Read the prayer book" tab, "Read without English letters", the three streak lines, "Beginner (A1)" style level labels.
- Review: streak line, empty state, no raw errors (source), "Review these cards".
- Settings: "Pronunciation style" and its three descriptions, "Include Israel lessons", delete-all text with the optional offline-copy box, "built-in voice" wording.
- Setup: "Which branch of Judaism...", pronunciation descriptions, the plan draft note, "The plan did not load" fallbacks.
- Offline: "Offline use is switched on for this page."
- Streak: "Paused" is gone from Home (the diff in old section 6 is now applied and the test changed as that section planned).
- First 10 minutes: all five diff items from old section 6 (`respelling`, `Pointing and gloss`, `budget`).
- Lesson page: level pill, draft note, raw errors, "siddur" in the pill (old section 6 diff).
- Shva lesson title (old "decide") now reads "a silent shva at word end".
- Vowel sign vs vowel mark (old "decide"): decided as "vowel mark" and applied to the first ten minutes.

Still open from the old audit:
- Nav names that describe the widget ("Sound gap", "Dot tiles", "Syllable chips", "Fade-out recall", "Syllable ladder").
- Tsadi / Tzere, Chet / Khaf spellings.
- American spelling pass.
- "Mark complete" wording.
- Progress: "Siddur coverage", "mature", "scheduler".
- "Could not restore: <raw error>" in Settings (the reassurance was added; the code is still shown).
- The research section of "How this works".

## 4. Tests

Run: `node --test` on the v0, firstday, onramp, onboarding, home, curriculum, letters, settings, install, offline, nikkudfade, roots, genderdrill, recordcompare, audio.access and accents.lanes files (browser-tier files skipped).

563 tests, 557 pass, 2 fail, neither caused by copy edits:
- `tests/offline.test.js` "letter memory pictures..." says "run node tools/build-precache.mjs". The precache manifest is stale. I did not rebuild it, as instructed.
- `tests/onramp.test.js` "flow: one screen per step..." fails because another lane added a "Next question" button inside the quick-check box. The test counts every button there as an answer choice. The test needs updating by that lane.

Also seen once and not retraced: `tests/settings.roundtrip.browser.test.js` timed out waiting for the delete button to enable. It is a browser-tier test, I ran it once, and I did not check whether it failed before my edits.

Test files changed for wording: `home.today`, `curriculum.learnflow`, `onramp`, `onboarding`, `letters.memorycard`, `accents.lanes`, `audio.access`, `offline`, `nikkudfade`.

Method note: strings were pulled with a Playwright script (kept in `/tmp`, not in the repo) that loads each route and reads `#main` text, `aria-label` and `title`.
