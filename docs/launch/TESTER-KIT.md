# Tester kit: first real learners (draft, 2026-11-05)

Purpose: get 5 to 10 real people to try Aleph while the owner watches or reads their notes, so the project has evidence from learners and not only from tests. Nothing in this file says a session has happened. As of this draft no learner has used the app (`docs/STATUS.md`, section "Deployed and reviewed"). The review site is live at https://alef-review.onrender.com/ (Render, from `main`), so the owner can hand testers that link.

Things the owner fills in before sending: the link or install steps, a way for testers to reach the owner (no contact address exists in the repo yet; `docs/launch/LIMITATIONS.md` says the same), and the date window. Left as `[OWNER: ...]` below.

---

## Part 1. The invite (send this, about one page)

**Subject: Help me test a free Hebrew reading app (about 25 minutes)**

Hi [name],

I am building a free app called Aleph that teaches you to read Hebrew letters and, later, prayers. I would like 25 minutes of your time to try it and tell me honestly where it is confusing. You are not being tested; the app is.

**Where it is:** [OWNER: link, or "I will hand you my phone"]

**What it is.** A Hebrew reading course that runs in your phone's browser. No account, no sign-up, no ads.

**What is NOT ready.** Please read this so nothing surprises you:

- **There are no recordings of a teacher.** Nobody has recorded a teacher's voice yet. The Hebrew clips (`spoken` in `data/audio/summary.json`, about 21,500 as of 2026-11-07) use a synthetic voice, a man's and a woman's, that no native speaker has reviewed; they cover letters, vowels, syllables, words, lines, prayers, book pages and games. Where no clip exists the app uses your phone's built-in Hebrew voice, if your phone has one. Some phones have none, and then you will see letters and words but hear nothing. The app tells you this in a notice at the top, and on the About and Settings screens.
- **The Hebrew has not been checked.** No native speaker, teacher, rabbi or cantor has reviewed the lessons, word lists, spellings of sounds or prayer text. There may be mistakes. That is one of the things I want to find out.
- **The pictures are drafts.** Some pictures may be missing or look odd.
- **It has not been tried on many phones.** If something is broken on yours, that is useful to know.

**What I would like you to try (three small tasks):**

1. **Learn the first two letters.** Start the app, follow the first steps, and learn the first two letters (Shin and Bet).
2. **Read the first prayer line.** Open the Read section, choose the Shema, and read the first line using the help on the screen (the Transliteration and English tick boxes).
3. **Do a review.** Open Learn and do the review of cards that come due.

Stop whenever you like. If you get stuck, say so out loud or write it down; do not struggle to please me.

**What I will ask you at the end:** a short form (about 5 minutes) and, if you are willing, a couple of questions. If you find something that looks wrong in the Hebrew, please tell me what you saw. I will pass it to a native reader to judge. I will not "fix" Hebrew myself.

**Your data:** the app keeps its notes on your phone only. See `docs/launch/PRIVACY-FOR-TESTERS.md` (the owner can paste or print it for you). I will only write down what you tell me or what I see you do, and I will record your name nowhere unless you want it there; a tester ID like T01 is enough.

**Consent, in one line:** by trying the app and answering the form you agree I may use your answers, without your name, to improve Aleph and to say how many people tested it. You can stop at any point and ask me to delete your answers. If you are under 18, please ask a parent or guardian first.

Thank you,
John

---

## Part 2. Facilitator checklist (the owner, or whoever watches)

### Before the session
- [ ] Tester ID chosen (T01, T02, ...). No name needed on the form.
- [ ] Working link or device ready. Open it yourself once in the same browser kind the tester will use.
- [ ] Tester starts from a clean browser state (new profile, private window, or Settings > "Delete all my data") so earlier progress does not hide first-run problems. Private windows keep data in memory only and lose it on close; that is fine for a session but means "come back tomorrow" cannot be tested there.
- [ ] Note: phone model, browser, whether the phone has a Hebrew voice (the app's notice says which; read it from the screen), screen reader or large text on or off.
- [ ] Printed or open copy of the feedback form (Part 3).
- [ ] Reading level check: ask only, "Have you read any Hebrew before?" (none / some letters / can sound out / fluent). Record the answer.

### Script (say it as written, do not add hints)
"Thanks for doing this. I am testing the app, not you. Please say what you are thinking out loud as you go. I will not help unless you ask, and if you ask I will note that you asked. You can stop any time. Here is the first task: [read task 1 from the invite]."

Then go quiet. Hand over task 2 and task 3 the same way.

### While they work: what to note (facts, not guesses)
For each task write: start time, end time, finished yes/no/gave up.
- Where they hesitated more than about ten seconds, and what was on screen.
- Where they tapped something that did nothing, or tapped the wrong thing.
- What they said out loud, in their words. Quote it; do not paraphrase.
- Any time they asked for help, and what they asked.
- Whether they noticed the sound notice ("no recorded teacher", synthetic clips, device voice) without being pointed to it, and what they said about it.
- Any sound that played, and whether they said it sounded like Hebrew to them.
- Any Hebrew they said looked wrong, odd or different from what they know. Write the screen name and the exact text; do not judge it.
- Anything that broke: blank screen, button that does not respond, text cut off.

### Rules
- **No leading questions.** Do not ask "Was that easy?" or "Did you like the notice?" Ask open ones: "What were you expecting there?", "What are you looking at now?", "What would you do next?"
- **Do not explain the screen** while they are working. If they are stuck for about a minute, ask "What are you trying to do?" and note it as a stuck point. Only then help, and note that you did.
- **Do not defend the app.** Do not say "that is a draft" in response to a complaint; write the complaint down.
- **Do not fix Hebrew.** If a tester or you suspect a Hebrew error, copy the screen name and text into the "Hebrew concerns" column and stop. A native reader decides (see `docs/review/README.md` for how review items are logged).
- **After the tasks, do the letters check** (see form, question L1): about ten minutes after they began the first letters, show them the two letters Shin and Bet on a blank card or a fresh screen, out of order, and ask them to say which is which. Write what they said. This measures whether they can read the letters; the app's own screens do not.
- Thank them, and do not promise changes.

### After the session
- [ ] Fill in the CSV row the same day while you remember it (Part 3).
- [ ] Copy Hebrew concerns to the review log as they are, unfixed.
- [ ] Do not count a session that you helped through as "finished unaided" in the row.

---

## Part 3. One-sheet feedback form (CSV-able)

One row per tester. The header row is also saved as `docs/launch/tester-feedback.csv`. Ask the tester questions in order; the facilitator fills the "observed" fields. Free-text answers: put them in quotes in the CSV and double any quote marks inside.

| Column | Who fills it | Asked as | Allowed answers |
|---|---|---|---|
| `tester_id` | facilitator | (none) | T01, T02, ... |
| `date` | facilitator | (none) | YYYY-MM-DD |
| `device_browser` | facilitator | (none) | text, for example phone model and browser |
| `hebrew_voice_on_device` | facilitator | read from the app's notice | yes / no / unknown |
| `prior_hebrew` | tester | "Have you read any Hebrew before?" | none / some_letters / can_sound_out / fluent |
| `t1_finished` | facilitator | observed, task 1 (first two letters) | unaided / with_help / gave_up |
| `t1_minutes` | facilitator | observed | number |
| `t2_finished` | facilitator | observed, task 2 (first prayer line) | unaided / with_help / gave_up |
| `t2_minutes` | facilitator | observed | number |
| `t3_finished` | facilitator | observed, task 3 (a review) | unaided / with_help / gave_up |
| `t3_minutes` | facilitator | observed | number |
| `L1_shin_bet_correct` | facilitator | "Which of these is Shin and which is Bet?" (about 10 minutes after starting, cards out of order) | both / one / neither |
| `L2_could_read_letters_self` | tester | "After about 10 minutes, how well could you tell the first two letters apart?" | 1 not at all, 2 a little, 3 mostly, 4 easily |
| `A1_noticed_no_audio_notice` | facilitator | observed: did they mention or read the notice without prompting | yes / no |
| `A2_notice_in_own_words` | tester | "In your own words, what did the app say about sound?" | free text; the facilitator marks the next column |
| `A2_matches_reality` | facilitator | compare A2 with the real notice: no recorded teacher, a few synthetic word clips, device voice only if the device has one | correct / partly / wrong |
| `A3_expected_audio` | tester | "Before reading the notice, did you expect to hear a teacher?" | yes / no / unsure |
| `C1_confusing` | tester | "What, if anything, was confusing?" | free text |
| `C2_stuck_screen` | facilitator | screen name where they were stuck longest | text |
| `H1_hebrew_concern` | tester or facilitator | "Did anything in the Hebrew look wrong or odd to you?" | none / yes |
| `H2_hebrew_screen_and_text` | whoever noticed | screen name and exact text, copied | free text; passed to a native reader, not edited by the builder |
| `B1_broken` | facilitator | anything that failed to load or respond | free text |
| `W1_would_return` | tester | "Would you open this again tomorrow, if it were finished?" | yes / maybe / no |
| `W2_why` | tester | "What made you say that?" | free text |
| `Q_quotes` | facilitator | exact words said out loud worth keeping | free text |

How to read the results, without inventing numbers: with a handful of testers, report counts ("4 of 7 tester rows had `L1_shin_bet_correct` = both"), never percentages or averages that look more certain than the sample. Say how many sessions were unaided versus helped. Do not publish a claim such as "learners can read in 10 minutes" from fewer than the people actually tested, and state their number and how they were found.

---

## What this kit does not do
- It does not recruit, host or deploy anything. No contact address or live link exists in the repo.
- It does not review the Hebrew. A tester's concern is a lead for a native reader, nothing more.
- Nobody has run this script yet; the three tasks were written from reading the app's routes and views (`#/firstday` and `#/letters`, `#/read/shema`, `#/learn?review=1`), not from a recorded walk-through on a phone. The facilitator should do task 1 to 3 once before the first session and fix any wording that does not match the screen.
