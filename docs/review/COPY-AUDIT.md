# Plain-language copy audit (v0 routes)

Date: 2026-11-04. Scope: learner-facing English on the 15 v0 routes (`welcome`, `home`, `firstday`, `learn`, `letters`, `letter`, `atlas`, `progress`, `settings`, `about`, `credits`, `privacy`, `install`, `offline`, `search`), plus the screens they open directly (lesson, review, quick check, "How this works"). Sources read: `src/shell/i18n.js`, `src/shell/nav.strings.js`, every v0 view file, `data/firstday/onramp.json`, `data/curriculum/lessons.json` (r01 to r10).

Status column: **applied** = changed in the repo; **diff** = file is being edited by someone else, proposed change is in the diff section below; **decide** = needs John's call (touches data, tests or many files).

## 1. How it was measured

`node tools/docs/readlevel.mjs` (new, no dependencies) lifts string literals out of the source, keeps the ones that read like sentences, and computes the Flesch-Kincaid grade per file and per string. `--strings` lists strings of 8+ words above the limit (default 9), `--jargon` lists strings that use a word from the jargon list.

Limits, stated plainly:
- It scores literals, not the rendered page. Sentences built from several literals or from data (card text, lesson data, the credits table) are scored in pieces or not at all.
- Short UI strings score low and noisily. Per-file averages are therefore low (2 to 6). The per-string list is the useful output.
- Syllables are counted with a heuristic, so grades are good to about one grade.
- It does not check that a rewrite is true. Each rewrite below was written to keep the original claim and nothing more.

| Run | Files above grade 7 | Strings of 8+ words above grade 9 | Strings using a jargon word |
|---|---|---|---|
| Before | 1 (`about.view.js`, 8.5) | 18 | 25 |
| After | 0 (highest: `credits.view.js`, 6.2) | 13 (privacy table rows, credits count line, `today.js` rule line) | 11 (all explained at first use, or in files listed as diff/decide) |

## 2. Jargon: one decision per word

| Word | Where a learner meets it | Decision |
|---|---|---|
| belt | Learn map ("Current belt"), lesson page ("white"), Progress | Say "level" first, then "belt". First use on Learn now reads "Your level: White belt. Belts are Aleph's own levels, like in martial arts. Each one covers a set of lessons." Lesson lists show "White belt", not raw `white` (applied; lesson page: diff). |
| A1 / A2 / B1 | Learn list, lesson page (raw codes) | Shown as "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)" (applied via `levelLabel` in `src/curriculum/dom.js`). |
| niqqud / nikud | Typing tab, nav "Vowel-point dial" | Never shown to a learner as a bare word in v0 text. Use "vowel marks". If the Hebrew word is wanted, say it once: "vowel marks (niqqud)". |
| dagesh | Keyboard note, lesson goals | Explain as "the dot (dagesh)" at first use. Applied in the keyboard note. r01 to r10 goals say "dot inside Bet", which is fine. |
| tradition, congregation | Settings, setup, nav, search, "How this works" | Replace with "pronunciation style" (what it is) and "synagogue" (where it is used). The setting key stays `congregation`; only labels changed. |
| siddur | Learn tabs, onboarding, Progress | "Prayer book". Onboarding keeps "prayer book (siddur)" because that is where the word is introduced. |
| SRS, scheduler | Progress numbers | Not shown as "SRS". "Scheduler" and "mature" replaced by "come back after longer and longer gaps" and "well known". |
| trope | Nav, privacy table | "Chanting marks" (the nav sheet already says this in its section note). |
| gloss, pointing, respelling, Latin | Draft notices, firstday, Learn | "English meaning", "vowel marks", "how it sounds in English letters", "English letters". |
| liturgy, clergy, bundled, module | Home opening card, unavailable card | Replaced (see table). |
| shva | Lesson r10 title | **decide** (lesson title is data): "a silent shva (two dots) at word end". |
| IPA slashes /b/ in the atlas | Atlas tiles | Atlas help now says "The symbols between slashes show the sound, as in a dictionary." |
| AltGr | Typing tab | "AltGr (the right Alt key)" at first use. |
| checksum, key, localStorage | Progress backup, privacy | "built-in check", "saved item", "your browser, on this device". |

## 3. String-by-string findings

### 3a. `src/shell/i18n.js` and `nav.strings.js` (applied)

| Key | Where | Issue | Rewrite |
|---|---|---|---|
| `home.opening.title` | Home card | Unclear | "Opening prayer" |
| `home.opening.draft` | Home card | "clergy/educator review" | "Draft: a rabbi or Hebrew teacher has not checked this yet." |
| `home.opening.body` | Home card | "liturgy", "bundled", "slot", grade 12 | "This spot is kept for an opening prayer. We will add one after a rabbi or Hebrew teacher has checked it. The plan is to start with the Priestly Blessing, a short blessing from the Torah (Numbers 6:24-26)." |
| `home.opening.link` | Home button | "the reader" is unexplained | "Go to Read" |
| `settings.congregation` | Settings legend | "Prayer pronunciation" hides that it is a style choice | "Pronunciation style" |
| `settings.congregation.sephardi` | Settings | Name unexplained | "Sephardi (the usual style in American synagogues)" |
| `settings.congregation.ashkenazi` | Settings | Name unexplained | "Ashkenazi (the older European style)" |
| `settings.congregation.israeli` | Settings | Name unexplained | "Israeli (how Hebrew is spoken in Israel today)" |
| `settings.israelTrack` | Settings checkbox | "track" | "Include Israel lessons (everyday spoken Hebrew)" |
| `settings.location` | Settings legend | Awkward | "Your location, for candle-lighting times (optional)" |
| `settings.persist.no` | Settings | Passive, no next step | "This browser cannot save your progress. It will be lost when you close the app, so download a backup before you leave." (same fact as `storageNotice`) |
| `settings.browserVoiceAnyway` | Settings checkbox | Cryptic bracket | "Use my browser's voice even when it cannot match my pronunciation style (you will see a note when that happens)" |
| `unavailable.body` | Shown when a page is missing | "module ... this build" | "This part of Aleph is not ready yet. Nothing is broken. Please check back later." |
| `error.title` | Error card | Vague, alarming | "This screen did not load" |
| `error.body` | Error card | Blames the screen, no next step | "Sorry about that. Try reloading the page, or go back to Home." |
| `nav.scaffold` | Menu, Learn | "Latin" | "Read without English letters" |
| `nav.traditions`, `nav.compare`, `nav.traditionquiz` | Menu | "tradition" | "Pronunciation styles", "Compare pronunciation styles", "Which pronunciation style is this?" |
| `nav.trope` | Menu | "Trope" | "Chanting-mark trainer" |
| `nav.firstday-ladder` | Menu | "Pointed to unpointed" | "Reading with fewer vowel marks" |
| `nav.section.speak.desc`, `nav.route.traditions-guide`, `nav.preview.note.speak` | Menu | "tradition" | "...compare pronunciation styles.", "Which pronunciation style should I learn?", "...pronunciation-style pages..." |
| `search.none` | Search | Cold | "No matches yet. Try a different spelling, or fewer letters." |
| `search.error` | Search | Passive | "Letters and words did not load, but you can still search pages." |

Not changed, but unclear to a newcomer (needs the page owner, because I do not know exactly what each page does): `nav.soundgap` "Sound gap", `nav.fade` "Fade-out recall", `nav.ladder` "Syllable ladder", `nav.dottile` "Dot tiles", `nav.roles` "Say it as me", `nav.syllablechips` "Syllable chips". Each should say what you do ("Practice sounds English does not have"), not what the widget is called. **decide**

### 3b. Views not owned by anyone else (applied)

| Where | Issue | Rewrite |
|---|---|---|
| Learn map: track tab | "Read the siddur" | "Read the prayer book" |
| Learn map: level pill | Raw `white`, `A1`, `B1` | "White belt", "Beginner (A1)", ... |
| Learn map: belt line | "Current belt: White", never explains belts, "Black (fluency practice)" | "Your level: White belt. Belts are Aleph's own levels, like in martial arts. Each one covers a set of lessons." / "Black belt (practice for fluency)" |
| Learn map: link | "Read without Latin" | "Read without English letters" |
| Learn map: streak (3 lines) | "(5 minutes today keeps it)" is loss framing; "Paused" reads as a fault | "Streak: 3 days. Study for 5 minutes today to add a day." / "Your best streak was 12 days. A new one starts the next time you study for 5 minutes." / "A streak counts the days you study for 5 minutes or more, on a lesson, review or practice screen." |
| Review: streak line (2 lines) | Same | "Streak: 3 days. Study for 5 minutes today to add a day." / "A streak counts the days you study for 5 minutes or more." |
| Review: Prayer card hint | "Corpus text: compared with its source by a machine" | "Prayer text: checked against its source by a computer, not proofread by a person." |
| Review: save error | Shows raw `e.message` | "That answer could not be saved. Please try again." |
| Review: start error | Shows raw `e.message` | "The review did not start. Please reload the page and try again." |
| Quick-check summary | Refers to a button "Practise again" that is not on the lesson page | "...Do the exercise again to answer them." |
| Letter page: three errors | Raw `err.message`, "Keyboard data not loaded." | "The letter data did not load. Please reload the page and try again." / "Look-alike sets are not available right now." / "The keyboard did not load. Please reload the page." |
| Letter page: draft notice | Shouting "DRAFT" | "Draft: an Israeli teacher has not yet checked the stroke order and shapes. If your school teaches a different order, follow your teacher." |
| Letter page: keyboard note | "SI-1452 (2013), from <layout package name>", AltGr, dagesh unexplained | "This is the standard Israeli keyboard (SI-1452). Press the matching key on your keyboard. For vowel marks, hold AltGr (the right Alt key) or tap the key on screen. Shuruk, the "oo" vowel, has no key of its own: type vav, then the dot (dagesh)." (the source is still named on Credits) |
| Letter page: tab | "Vowel marks (AltGr)" | "Vowel marks" |
| Atlas: help line | IPA slashes unexplained | adds "The symbols between slashes show the sound, as in a dictionary." |
| Atlas: load error | Raw `err.message` | "The atlas did not load. Please reload the page and try again." |
| Setup: pronunciation text (Ashkenazi) | "the vowel kamatz ... letter tav" | "The older European style. For example, one vowel sounds like "aw", and the letter tav without a dot sounds like "s"." |
| Setup: pronunciation (Sephardi) | Clipped | "The default. These are the vowel sounds most American synagogues use." |
| Setup: question | "movement" | "Which branch of Judaism are you part of? (optional)" |
| Setup: plan draft note | 3 sentences of internals ("pacing guide", "Every link goes to an existing screen") | "Draft: no learner has tried this plan yet. The minutes are goals, not measurements. The plan has one lesson a day and starts with the lesson shown on Home. It updates as you finish lessons." |
| Setup: plan errors, plan note | "plan data", "draft cutoffs, untested" | "The plan did not load. You can still start." / "(a draft guess)" |
| Progress: draft flag | "belt gates and thresholds", "pointing" | "Draft: the milestones and levels here are Aleph's own, and no expert has reviewed them. A native Hebrew speaker has not yet checked the vowel marks." |
| Progress: "Siddur coverage" | Jargon | "Prayer book coverage" (also the milestone labels in `data/progress/personal-milestones.json`, the "Read the prayer book and Torah" path title and the grey-belt gate text) |
| Progress: Belts blurb | "names borrowed, gates are ours" | "Belts are Aleph's own levels, named after colours, like in martial arts. A belt means you have met every letter and vowel sign in its texts and finished its lessons." |
| Progress: numbers | "new / learning / mature", "the scheduler expects" | "new / learning / well known"; "Review cards come back after longer and longer gaps while you keep remembering them. "Well known" means a card you should remember for 21 days or more." |
| Progress: backup | "checksum", "progress keys", "keys in the file win" | "built-in check", "saved items", "if both have the same item, the file wins"; status "The file check passed." |
| Progress: build error | "could not be computed" | "Progress could not be shown right now. Your saved learning is not affected." |
| About (whole page) | Grade 8.5; "congregation", "native/clergy review", "pointing, transliteration" | Rewritten in plain words, same claims (see file) |
| Credits | "pointing, transliteration"; shows raw error text | Same claims in plain words; "The credits list did not load. Please reload the app, or try again when you are online." |
| Privacy | "vendored copy of ..." (a named software library), "navigator.geolocation", "speechSynthesis", "localStorage", table labels with "congregation", "Trope", "Tradition" | Plain wording; table labels use the new names. |
| **Privacy: wrong statement** | Said "there is no single 'delete all' button". Settings has one ("Delete all my data", type DELETE). `tests/credits.test.js` asserted the wrong sentence. | Rewritten to describe the real button, including that the offline copy is removed only when the extra box is ticked (matches `wipeAllData`). Test updated. |
| Offline | "offline helper", raw error text, "assumed 5 million characters" | "Offline use is switched on for this page." / "The list of offline files did not load. ..." / "The download did not finish. Check your connection and try again." / "(about 3% of the small space browsers allow for this; we assume 5 million characters)" |
| How this works | "decode pointed (vowelled) Hebrew ... with a congregation", "Pronunciation traditions", "glosses and pointing" | Plain wording for the top section and heading only. The research section (effect sizes, citations) is still reviewer-level; see decide list. |

### 3c. Files being edited by others (diff only)

See section 6. Summary of what the diffs fix:

| File | Issue | Rewrite |
|---|---|---|
| `src/home/today.js` | "Paused. Your best streak was 3 days." | "Your best streak was 3 days. A new one starts the next time you study for 5 minutes." |
| `src/home/today.js` | Rule line grade 10 | "A day counts once you study for 5 minutes on a lesson, review or practice screen. The timer pauses after a minute without a tap." |
| `src/home/today.js` | "Today is not counted yet." | "Study for 5 minutes today to add a day." |
| `src/home/today.js` | Home says "Study goal", Progress says "Daily goal", setup says "minutes a day" | Use "Daily goal" everywhere |
| `src/firstday/firstday.view.js` | "(Israeli respelling, rule-generated)", "Pointing and gloss ... Latin respelling", "budget 10 min (a design target ...)" | "(how it sounds in English letters, Israeli style; made by rules)"; "The vowel marks and the English meaning are draft course data. The English-letter spelling of the sound was made by rules for Israeli style."; "5 of 5 wins · about 10 minutes in all (a goal, not measured)" |
| `src/curriculum/lesson.view.js` | Level pill shows "white · 5 min · Read the siddur" | "White belt · 5 min · Read the prayer book" |
| `src/curriculum/lesson.view.js` | "glosses and pointing" | "Draft: a native Hebrew speaker has not yet checked the English meanings or the vowel marks." |
| `src/curriculum/lesson.view.js` | Raw error text; `no lesson with id "x"` | "This lesson did not load. Please reload the page and try again." / "We could not find that lesson." |
| `src/shell/settings.view.js` | Delete text says it removes "the offline copies of the app" (it does so only if the box is ticked); "offline service worker" | "Tick the box below to remove the offline copy of the app too." / "Also remove the offline copy of the app (Aleph will need a connection to open next time)" |
| `src/shell/settings.view.js` | No explanation of pronunciation style | Adds one line above the radio group |
| `src/shell/settings.view.js` | "text-to-speech voice" | "your browser's built-in voice" |
| `src/shell/settings.view.js` | "Could not restore: <raw error>" | "This file could not be restored (<error>). Your progress on this device was not changed." |
| `src/home/today.js` tests | `tests/home.today.test.js:118` expects `/Paused\. Your best streak was 3 days/` | Change to `/Your best streak was 3 days\. A new one starts/` when the diff is applied |

Checked and fine (no change): `src/curriculum/exercises.session.js` (feedback is "Correct.", "Not quite.", "Still tricky. It will come back in your review.", "That was a tough one. ... trying the lesson once more is fine"), `src/shell/home.view.js` (no hard-coded copy beyond the i18n keys), `src/shell/install.view.js` (grade 2.3; "Not now" and the 30-day message are kind), `data/firstday/onramp.json` (grade 1.2; "Nothing is lost." on a wrong answer is the right tone).

## 4. Consistency of names

| Topic | What the app does now | Recommendation |
|---|---|---|
| Shin / Sin | Letter list has one letter `shin`, with "(sin, dot on the left, is s)" in its sound line. Vowel list has "Shin dot" and "Sin dot". No place spells it "Sin" as a separate letter or "Shinn". | Consistent. Keep "Shin" for the letter and "Sin" only when talking about the left-hand dot. Say so once in the Letter page (not done: owner of letters data). |
| Aleph / Alef / Aleph | App name "Aleph" (188 hits in v0 files). Letter "Alef" (10). "Aleph" appears once, in a code comment (`src/pronunciation/kamatz-katan.js`), not in learner text. | Consistent. Rule: Aleph = the app, Alef = the letter. |
| Tsadi vs Tzere, Chet vs Khaf | Letter "Tsadi" but vowel "Tzere"; "Chet" and "Chirik" with `ch`, but "throaty ch" for chet and "khaf" for the soft kaf | **decide**: pick `ts` or `tz` (suggest `Tzadi`/`Tzere` to match the vowel and common American usage), and one spelling for the throat sound (`Chet`/`Khaf` both in use). Needs data and test updates, so not applied. |
| Vowel sign / vowel mark / vowel point | "vowel sign" (first-10-minutes, Progress), "Vowel marks" (letter page, my rewrites), "Vowel-point dial", "Vowel board" | **decide**: use "vowel mark" in all learner text. `data/firstday/onramp.json` ("Your first vowel sign") and Progress ("Signs taught by lessons") would change. |
| Daily goal | "Study goal" (Home), "Daily goal" (Progress), "How many minutes a day?" (setup) | "Daily goal" (diff for `today.js`). |
| Lesson vs belt vs level | Raw `level` values leaked into the UI | Fixed in Learn; lesson page via diff. |
| British vs American spelling | "licence", "Practise", "Recognised" in some screens; "practice", "recognizer", "license" in others. Audience is North American (default style is "American synagogues"). | **decide**: American spelling throughout. It touches route titles, `nav.credits`, many tests; not applied. |
| "Review" vs "Practise these cards" vs "Practice this" | Three labels for similar actions on Learn, lesson and Progress | Part of the American-spelling pass: "Practice these cards", "Practice this". |

## 5. Buttons, empty and error states, streak copy

Button labels reviewed (all short, verb first, no change needed): Start, Review, Review now, Mark complete, Show answer, Again / Hard / Good / Easy (each has a plain gloss in its `aria-label`), Hear it, Trace it, Animate, Start over, Next, Finish, Skip, Undo, Not now, Download backup, Restore from backup file, Replace my progress with this backup, Cancel, Delete all my data.

Changed or flagged:
- "Open the reader" became "Go to Read" (applied).
- "Mark complete" lets a learner skip the quick check; label is fine, but the lesson page should say "Mark complete without the quick check" if that is the intent (**decide**).
- "Review now" appears with "Keep reviewing" and "Practise these cards": acceptable.

Error and empty states: every raw `e.message` shown to a learner in the files I own was replaced (Review, Letter page, Atlas, Credits, Offline). Remaining raw errors are in `lesson.view.js` and `settings.view.js` (diff) and in the debug `<details>` of the error card (`src/shell/ui.js`, deliberately technical).

Streak tone. One canon, now used in Learn and Review; the diff makes Home match:
- Active: "Streak: 3 days. Today counts." or "Streak: 3 days. Study for 5 minutes today to add a day."
- Broken or paused: "Your best streak was 12 days. A new one starts the next time you study for 5 minutes." No "Paused", no "lost", no countdown, no "keeps it".
- Never started: "A streak counts the days you study for 5 minutes or more, on a lesson, review or practice screen."
- Rest days (Progress) already read well: "Today is a rest day. Your streak is safe."
- Home review nudge ("Review 24 due cards first") is a plain statement; fine.

## 6. Diffs for files other people are editing

Made against the working tree at the time of writing (`/tmp` copies, since deleted). They use `levelLabel` from `src/curriculum/dom.js`, which is already added. The full diff block is kept below so it can be applied with `patch -p0` after adjusting the paths, or by hand.

```diff
--- a/src/home/today.js	2026-11-04 15:48:56.747033709 -0500
+++ b/src/home/today.js	2026-11-04 15:49:11.042456233 -0500
@@ -89,12 +89,12 @@
 /** @param {(k:string,v?:any)=>string} t */
 export function renderToday(today, t, onGoal) {
   const dueText = today.due.count === 0 ? t('home.due.none') : t(today.due.count === 1 ? 'home.due.count.one' : 'home.due.count', { n: today.due.count });
-  const RULE = 'A day counts after 5 minutes of study on a lesson, review or practice screen (the timer pauses after a minute without a tap).';
+  const RULE = 'A day counts once you study for 5 minutes on a lesson, review or practice screen. The timer pauses after a minute without a tap.';
   const days = (n) => `${n} day${n === 1 ? '' : 's'}`;
   const streakText = today.streak.count > 0
-    ? [h('strong', {}, days(today.streak.count)), today.streak.activeToday ? ' and counting. Today\'s 5 minutes are done.' : `. Today is not counted yet. ${RULE}`]
+    ? [h('strong', {}, days(today.streak.count)), today.streak.activeToday ? ' and counting. Today\'s 5 minutes are done.' : `. Study for 5 minutes today to add a day. ${RULE}`]
     : today.streak.best > 0
-      ? [`Paused. Your best streak was ${days(today.streak.best)}. A new one starts when you finish a counted day. ${RULE}`]
+      ? [`Your best streak was ${days(today.streak.best)}. A new one starts the next time you study for 5 minutes. ${RULE}`]
       : [`No streak yet. ${RULE}`];
   const away = !today.firstRun && today.streak.count === 0 && today.streak.best > 0;
   const why = today.primary?.kind === 'firstday' && today.onramp.wins > 0 ? `${today.onramp.wins} of ${today.onramp.total} wins so far. The next step is about 2 minutes.`
@@ -117,8 +117,8 @@
     h('p', { id: 'today-due', class: 'muted' }, today.due.count === 0 ? dueText : (today.primary?.kind === 'review' ? dueText : '')),
     sec.length || moreLinks.length ? h('p', { id: 'today-more', class: 'today-secondary' }, ...[...sec, ...moreLinks.map((m) => h('a', { href: m.href }, m.label))].flatMap((n, i) => [i ? ' \u00b7 ' : '', n])) : null,
     h('p', { id: 'today-streak' }, h('span', { class: 'muted' }, t('home.streak') + ': '), ...streakText),
-    h('details', { id: 'today-goal-box' }, h('summary', { class: 'muted small' }, `Study goal: ${today.dailyGoal} min`),
-      h('div', { id: 'today-goal', role: 'group', 'aria-labelledby': 'today-goal-l' }, h('span', { id: 'today-goal-l', class: 'muted' }, 'Study goal: '),
+    h('details', { id: 'today-goal-box' }, h('summary', { class: 'muted small' }, `Daily goal: ${today.dailyGoal} min`),
+      h('div', { id: 'today-goal', role: 'group', 'aria-labelledby': 'today-goal-l' }, h('span', { id: 'today-goal-l', class: 'muted' }, 'Daily goal: '),
         ...DAILY_GOALS.map((m) => h('button', { type: 'button', class: m === today.dailyGoal ? 'btn' : 'btn secondary', 'data-goal': String(m), 'aria-pressed': String(m === today.dailyGoal), onclick: () => onGoal && onGoal(m) }, `${m} min`)),
         h('span', { class: 'muted small' }, ' Your own target. The streak always counts a day at 5 minutes.'))));
 }
--- a/src/firstday/firstday.view.js	2026-11-04 15:48:56.817773681 -0500
+++ b/src/firstday/firstday.view.js	2026-11-04 15:49:11.049241686 -0500
@@ -59,7 +59,7 @@
     // one sound line, in the learner's tradition
     if (s.kind === 'letter') nodes.push(el('p', {}, el('strong', {}, L?.name || s.letter), ': ', letterSound(content?.consonants?.get?.(s.letter), tradition, { fallbackEn: L?.sound?.en || '' }).en));
     if (s.kind === 'vowel') nodes.push(el('p', {}, el('strong', {}, V?.name || s.vowel), ': ', vowelSound(V, tradition).en, ` (${LABELS[tradition]} sound)`));
-    if (s.kind === 'syllable' || s.kind === 'word') nodes.push(el('p', {}, el('strong', {}, respell(s.he, tradition) || s.id), s.en ? `, "${s.en}"` : '', ` (${LABELS[tradition]} respelling, rule-generated)`));
+    if (s.kind === 'syllable' || s.kind === 'word') nodes.push(el('p', {}, el('strong', {}, respell(s.he, tradition) || s.id), s.en ? `, "${s.en}"` : '', ` (how it sounds in English letters, ${LABELS[tradition]} style; made by rules)`));
     nodes.push(el('p', {}, s.action));
     const hook = s.kind === 'letter' ? { kind: 'letter', id: s.letter } : s.kind === 'vowel' ? { kind: 'vowel', id: s.vowel } : { kind: 'word', id: `firstday-${s.id}` };
     const row = el('p', { class: 'row' }, listen(hook));
@@ -72,7 +72,7 @@
     if (M) why.push(el('p', {}, M.shape), el('p', {}, M.story), el('p', { class: 'muted small' }, 'A memory hook written for this course: a teaching aid, not history.'));
     if (V) why.push(el('p', {}, V.position ? `Where it sits: ${V.position}.` : ''), el('p', {}, V.notes || ''));
     if (s.kind === 'syllable') why.push(el('p', {}, 'Hebrew reads right to left. Each letter carries the vowel sign under it, so you read the letter and then its sign as one piece.'));
-    if (s.kind === 'word') why.push(el('p', {}, 'Bet with no dot inside is the soft sound (v). The dot that makes it b is the next lesson.'), el('p', { class: 'muted small' }, `Pointing and gloss are draft course data; the Latin respelling is rule-generated for ${LABELS[tradition]}.`));
+    if (s.kind === 'word') why.push(el('p', {}, 'Bet with no dot inside is the soft sound (v). The dot that makes it b is the next lesson.'), el('p', { class: 'muted small' }, `The vowel marks and the English meaning are draft course data. The English-letter spelling of the sound was made by rules for ${LABELS[tradition]} style.`));
     if (s.kind === 'letter' && ctx?.hasRoute?.('learn') !== false) why.push(el('p', { class: 'fd-spot' }, 'Optional: ', el('a', { class: 'btn secondary', href: `#/learn?spotit=${s.letter}` }, `Spot It: ${L?.name || s.letter}`)));
     if (why.length) post.push(el('details', { class: 'fd-why' }, el('summary', {}, 'Why?'), ...why));
     // the check: at most 2 questions, one at a time; the answer (right or wrong) opens Next
@@ -117,7 +117,7 @@
   function renderDone() {
     const d = onramp.done || {};
     body.replaceChildren(
-      el('p', { class: 'muted' }, `${onramp.steps.length} of ${onramp.steps.length} wins · budget ${onrampMinutes(onramp)} min (a design target, not measured)`),
+      el('p', { class: 'muted' }, `${onramp.steps.length} of ${onramp.steps.length} wins · about ${onrampMinutes(onramp)} minutes in all (a goal, not measured)`),
       el('h2', {}, d.title || 'Done'),
       el('p', { class: 'fd-card alef-card' }, heText(onramp.steps.find((s) => s.kind === 'word')?.he || '', 'alef-he alef-huge fd-big')),
       el('p', {}, d.body || ''),
@@ -144,7 +144,7 @@
     if (s.kind === 'vowel') for (const id of s.items) { const v = data.vowels.find((x) => x.id === id); const rec = content?.vowels?.get(id === 'holam-male' ? 'cholam' : id); nodes.push(el('p', {}, heText(v.example, 'alef-he fd-big alef-big'), ` ${rec ? vowelSound(rec, tradition).en : v.sound}. ${v.note}`)); }
     if (s.kind === 'read') {
       const w = wordById(data, s.word);
-      nodes.push(el('p', {}, heText(w.he, 'alef-he fd-big alef-word-big')), el('p', {}, `${respell(w.he, tradition) || w.sound} (${LABELS[tradition]} respelling). Say it aloud, then check.`), listen(w.audio), hearNote(),
+      nodes.push(el('p', {}, heText(w.he, 'alef-he fd-big alef-word-big')), el('p', {}, `${respell(w.he, tradition) || w.sound} (how it sounds in English letters, ${LABELS[tradition]} style). Say it aloud, then check.`), listen(w.audio), hearNote(),
         el('button', { class: 'btn', type: 'button', onclick: () => { progress = { ...progress, ...markRead({ readWords: progress.readWords }, w.id) }; save(); say(`${respell(w.he, tradition) || w.sound}: ${w.gloss}. Source: ${w.source}.`); } }, 'Check my reading'));
       if (!w.fromBlessing) nodes.push(el('p', {}, 'This word is not from the Priestly Blessing.'));
     }
--- a/src/curriculum/lesson.view.js	2026-11-04 15:49:21.488034253 -0500
+++ b/src/curriculum/lesson.view.js	2026-11-04 15:49:21.614462763 -0500
@@ -1,6 +1,6 @@
 /** One lesson: its letters, vowels, words and prayer lines, with audio, completion and links to review. */
 import { lessons, byId } from "./lessons.js";
-import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
+import { el, heText, tr, replaceKeepingFocus, levelLabel } from "./dom.js";
 import { loadContent, vowelEnglish, vowelIpa } from "./content.js";
 import { saveQuickCheck, loadState } from "./actions.js";
 import { due as dueCards } from "./srs.js";
@@ -23,7 +23,7 @@
   root.append(wrap);
   const lesson = byId[lessonId];
   if (!lesson) {
-    wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Lesson not found"), el("p", {}, `There is no lesson with id "${lessonId}".`),
+    wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Lesson not found"), el("p", {}, "We could not find that lesson."),
       el("a", { class: "btn", href: "#/learn" }, "All lessons"));
     return () => { alive = false; wrap.remove(); };
   }
@@ -44,8 +44,8 @@
     const section = (id, title, ...kids) => el("section", { class: "card", "aria-labelledby": id }, el("h2", { id }, title), ...kids);
     const parts = [
       ctx.img?.(el, { kind: 'lesson', id: lesson.id, class: 'l-scene', width: 900 }),
-      el("p", { class: "muted" }, `${lesson.level} · ${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the siddur" : "Speak in Israel"}`),
-      el("p", { class: "draft-flag", role: "note" }, "Draft content: glosses and pointing have not yet been reviewed by a native speaker."),
+      el("p", { class: "muted" }, `${levelLabel(lesson.level)} · ${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the prayer book" : "Speak in Israel"}`),
+      el("p", { class: "draft-flag", role: "note" }, "Draft: a native Hebrew speaker has not yet checked the English meanings or the vowel marks."),
       unmet.length ? el("p", { class: "alef-locked", role: "note" }, `Locked: finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around.`) : null,
       lesson.onramp && !isDone ? el("p", { class: "card alef-onramp", role: "note" }, el("strong", {}, "Take this lesson one baby step at a time: "), `${lesson.steps?.length || 5} screens, about 2 minutes each. `,
         el("a", { class: "btn", id: "alef-onramp-link", href: "#" + lesson.onramp }, "Start with one letter")) : null,
@@ -124,6 +124,6 @@
       el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")), quizHost, done);
 
     replaceKeepingFocus(wrap, h1, ...parts);
-  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load lesson content: " + (e?.message || e))); });
+  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "This lesson did not load. Please reload the page and try again.")); });
   return () => { alive = false; offQuiz(); wrap.remove(); };
 }
--- a/src/shell/settings.view.js	2026-11-04 15:48:56.905359751 -0500
+++ b/src/shell/settings.view.js	2026-11-04 15:49:11.074193910 -0500
@@ -34,7 +34,7 @@
       let text = ''; try { text = await f.text(); } catch { text = ''; }
       e.target.value = '';
       const info = store.previewImport(text, { mode: 'replace' });
-      if (!info.ok) { restoreBox.hidden = true; status.textContent = 'Could not restore: ' + info.error + '. Your progress on this device was not changed.'; return; }
+      if (!info.ok) { restoreBox.hidden = true; status.textContent = 'This file could not be restored (' + info.error + '). Your progress on this device was not changed.'; return; }
       const go = h('button', { type: 'button', class: 'btn', onclick: () => {
         const res = store.importData(text, { mode: 'replace' });
         restoreBox.hidden = true; restoreBox.replaceChildren();
@@ -89,7 +89,7 @@
 
   root.replaceChildren(h('article', { class: 'card' },
     h('h1', { id: 'view-title', tabindex: '-1' }, t('settings.title')),
-    h('p', { class: 'muted' }, 'No recorded voices exist yet: the Man/Woman choice is a saved preference. Sound currently comes from your browser\'s text-to-speech voice. See "How this works".'),
+    h('p', { class: 'muted' }, 'There are no recorded voices yet, so the Man/Woman choice is only saved for later. The sound you hear comes from your browser\'s built-in voice. See "How this works".'),
     h('fieldset', { class: 'field' }, h('legend', {}, t('settings.backup')),
       h('div', { class: 'row' }, exportBtn, h('label', { class: 'btn secondary', id: 's-import-label', for: 's-import', tabindex: '0', role: 'button',
         onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } } }, t('settings.import')), fileInput),
@@ -97,6 +97,7 @@
       store.persistent ? null : h('p', { class: 'muted' }, t('settings.persist.no'))),
     status, // right under the backup buttons so a confirmation is visible without scrolling
     radioGroup('voice', 'settings.voice'),
+    h('p', { class: 'muted', id: 's-style-help' }, 'Pronunciation style: pick the one your synagogue uses. It changes the sounds you hear and read, not your lessons.'),
     radioGroup('congregation', 'settings.congregation'),
     radioGroup('goal', 'settings.goal'),
     h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-bva' }, h('input', { type: 'checkbox', id: 's-bva', checked: settings.get('browserVoiceAnyway') ? true : null, onchange: (e) => settings.set({ browserVoiceAnyway: e.target.checked }) }), h('span', {}, t('settings.browserVoiceAnyway')))),
@@ -109,9 +110,9 @@
     h('fieldset', { class: 'field' }, h('legend', {}, t('settings.location')),
       num('lat', t('settings.lat'), -90, 90), num('lon', t('settings.lon'), -180, 180), h('div', { class: 'row' }, geoBtn, clearBtn)),
     h('fieldset', { class: 'field' }, h('legend', {}, 'Delete all my data'),
-      h('p', { id: 's-wipe-help' }, `This permanently deletes your progress, review cards, streaks and settings from this device, and the offline copies of the app. It cannot be undone, so download a backup first. Type ${CONFIRM_WORD} to enable the button.`),
+      h('p', { id: 's-wipe-help' }, `This permanently deletes your progress, review cards, streaks and settings from this device. Tick the box below to remove the offline copy of the app too. It cannot be undone, so download a backup first. Type ${CONFIRM_WORD} to turn on the button.`),
       h('label', { class: 'field' }, `Type ${CONFIRM_WORD}`, wipeInput),
-      h('label', { class: 'opt', for: 's-wipe-sw' }, wipeSw, h('span', {}, 'Also remove the offline service worker (the app will need a connection to load next time)')),
+      h('label', { class: 'opt', for: 's-wipe-sw' }, wipeSw, h('span', {}, 'Also remove the offline copy of the app (Aleph will need a connection to open next time)')),
       h('div', { class: 'row' }, wipeGo)),
     h('fieldset', { class: 'field' }, h('legend', {}, 'Advanced'),
       boolRow('showUnapprovedImages', 'Show images that have not passed review', 'Pictures still waiting for a reviewer may be wrong or unsuitable. Leave this off unless you are reviewing them.')),
```

Tests to touch when the diffs are applied: `tests/home.today.test.js` (Paused line, "Study goal" if asserted), and any test asserting the old settings or lesson strings (`grep -rn "Study goal\|Draft content\|offline service worker" tests`).

## 7. Decisions needed

1. American spelling pass (licence, Practise, recognised). Large, mostly mechanical; touches tests.
2. One spelling for Tsadi/Tzere and Chet/Khaf; then one term for vowel sign/mark/point.
3. Lesson r10 title: explain "shva" ("a silent shva (two dots) at word end").
4. Unclear menu names (Sound gap, Fade-out recall, Syllable ladder, Dot tiles, Say it as me, Syllable chips): need one line each from the page owners saying what the learner does there.
5. "How this works" section 3 (research, effect sizes, citations) is written at reviewer level. Suggest keeping it but putting a three-line plain summary above it and a "Details for reviewers" label on the rest.
6. Privacy page tables (store keys with source file names, the third-party host name) are developer-facing. Suggest folding the "Source file" column into a `<details>`.
7. Router titles in `src/shell/router.js` still say "Compare traditions", "Which tradition should I learn?" (route `title` field, used for the document title). Not in my brief; they should follow the nav labels.

## 8. Checks run

- `node tools/docs/readlevel.mjs` before and after (table in section 1).
- Unit tests: I ran 23 test files for the views and strings I touched plus the 21 files that import them (about 520 tests). The only failure is `precache: skips vendor, PDFs and files over the size limit` (`precache-manifest.js` is stale because `src/shell/persist-gate.js` is new; I was told not to run the precache build, so it is untouched). I did not get a clean result for the full `node tools/test/run.mjs unit` run (the output file was removed while it ran), so I do not claim the whole suite passes. Browser tests were not run.
- `node tools/meta/scan.mjs --text` passes.
- Tests updated deliberately: `tests/progress.view.test.js` (Prayer book coverage, saved items, file check), `tests/onboarding.test.js` (plan note wording), `tests/credits.test.js` (Delete all my data).
