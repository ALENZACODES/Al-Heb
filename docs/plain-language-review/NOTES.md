# Style update (9 November 2026, America/Toronto)

The copy work on this branch uses **plain, easy-to-follow English**, not a warmer or more "human" voice.

Rules for every rewrite:

- Short, plain sentences. One idea per sentence where you can.
- Common words. Literal labels (a button says what it does).
- Do not add warmth, personality, jokes, or contractions for their own sake.
- Still remove AI tells (not-X-but-Y, staged openers, repeated closers, sales phrasing, em-dash habit, over-titled names).
- Still rewrite close-paraphrase synagogue passages. Keep facts and citations.
- Keep Hebrew, transliterations, teaching facts, keys and ids unchanged.
- Keep the library Title Case gate passing. Do not weaken tests.

Where a rewrite suggested below uses a chatty tone, apply a plainer wording instead.

---

# Aleph plain-language and plagiarism notes

Reviewed: 9 November 2026, America/Toronto  
Review tree: `/workspace/aleph-human-review/repo` (detached worktree of `origin/main`, do not commit or push from this tree)  
Commit: `e074ceae005a372cc20674ab7004db727707c1d5` (9 November 2026, 17:13 America/Toronto)  
Message: "Word takes workflow: push the takes in batches of 300"  
Guide: Wikipedia [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). That is the checklist used below.

## Why this branch

`origin/main` is the default branch and the current production line. `git ls-remote` on 9 November 2026 confirmed `refs/heads/main` at `e074ceae0`, the same tip already present as `origin/main` in the local clone. The review site auto-deploys from `main` (see README).

The two local clones named in the brief are older side branches and should be left alone:

- `/workspace/Al-Heb` is on `john/israeli-production-2026-11-05` (`44498eac7`, 6 November 2026, 08:28 America/Toronto), and it has a dirty working tree (audio files). That branch does not contain the later `main` history (library articles, Brain Lab, study plans, copy-audit fixes, and so on).
- `/workspace/Al-Heb-fun` is a worktree of the same repo on `john/fun-lessons-start-2026-11-06` (`ca6c5ef65`, 6 November 2026, 01:20 America/Toronto), also behind `main`.

Remote fetch is configured only for `main` (`+refs/heads/main:refs/remotes/origin/main`). A `git fetch --prune origin` was run against remotes; `ls-remote` was used to confirm other branch tips without checking them out.

## Checklist used (humanizer / Wikipedia)

Act on a single sighting of the first five. Weaker patterns need company.

1. Not X but Y ("not just… but…", "it isn't X, it's Y")
2. One-line closers and dramatic fragments ("That is the real win.", a short line that only restates the paragraph)
3. Sayings that sound deep ("at its core", "in essence", "what really matters")
4. Staged run-up ("Here's the thing", "Let's dive in", "Here's a detail that surprises people")
5. Arguing with no one ("I'm not saying…", "Don't get me wrong")
6. Forced triads
7. Repeated sentence openings / uniform rhythm
8. Em/en dashes used as the default connector (weak alone; a page full of them is not)
9. Stacked qualifiers (weak alone)
10. Hyphenated pairs after the noun (weak alone)
11. Passive voice with a missing subject (weak alone)
12. Overused AI words: delve, journey, seamless, unlock, elevate, empower, tapestry, testament, landscape, vibrant, pivotal, robust, enhance, foster, underscore, showcase, intricate, moreover, furthermore, crucial, …
13. Inflated significance ("marking a pivotal moment", "a new chapter opened")
14. Vague connection ("associated with", "linked to") without saying how
15. Shallow -ing riders (highlighting, symbolizing, reflecting, showcasing)
16. Sales language (nestled, breathtaking, in the heart of, renowned, stunning)
17. Borrowed or vague authority ("experts say", "some believe")
18. Avoiding is/are/has ("serves as", "stands as", "boasts")
19. Bold labels as decoration
20. Title-case headings, emoji bullets, decorative arrows
21. Curly quotation marks (weak alone)
22. Chatbot residue ("Great question!", "I hope this helps", "Would you like…?" in the writer's voice)
23. Knowledge-limit disclaimers
24. Heading restated in the first sentence
25. Writing about the document instead of the subject
26. Re-explaining what the reader already knows

House voice for rewrites: plain, warm, contracted where it fits, varied sentence length, specific. Keep Hebrew, transliterations, and teaching facts. Do not mention CAIA, CQF, CU Boulder conferral dates, or Brown University anywhere public. Location, when needed, is Toronto, Ontario.

## Counts

| What | Count | Notes |
|---|---|---|
| Automated string extraction, all JSON/JS including the 5,000-word dictionary | 374,756 | Saved as `inventory-raw-all-strings.csv`. Not a useful review set. |
| Focused user-facing inventory (UI, lessons, articles, synagogue stories, games, first-day, onboarding, awards, legal pages, festivals, letter stories, README, manifest, index, offline) | 31,171 strings in 559 files | `inventory.csv` |
| Automated AI-marker flags in that focused set | 341 | Many are false positives (literal "journey"/"unlock"/"harness", Title Case required by tests, game Title Case, typographic dashes in labels). See `flagged-user-facing.csv`. |
| Strings a person should actually change | about 90–120 | Concentrated in synagogue write-ups, game titles, a handful of library sentences, chrome consistency (Aleph vs ALEF), repeated Awards closers, and dash-heavy UI labels. |
| Plagiarism searches | 12 distinctive passages, plus the 12 library articles scanned for unique phrases | **5 close-paraphrase hits**, all in `data/synagogues/canada.json`, each already citing the source. No exact-phrase hits in the library articles, About page, or README. **Not exhaustive.** |

No CAIA, CQF, CU Boulder, or Brown University wording turned up in text files. Toronto already appears correctly (synagogue city names, `America/Toronto` on the certificate).

This repo has already had a plain-language pass (see `docs/review/COPY-AUDIT.md`, 4 November 2026) and a ten-check gate on library articles (`tools/content/check-articles.mjs`). A lot of the learner chrome is already unusually honest and concrete. The remaining AI tell is not "this whole app reads like a chatbot." It is a smaller set of leftover patterns, plus synagogue pages that still follow their sources too closely.

---

## A. Pages and screens

### A1. Opening prayer veil, shell, index (`index.html`, `src/shell/prayer-veil.js`)

Visible copy is mostly fine: "Listen to this prayer", "Don't show again", "Skip opening prayer", "Skip to main content". The Modeh Ani English is a standard prayer translation; leave the meaning alone.

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `index.html:58` | `Loading Aleph…` | Fine. Keep. | — |
| `index.html:61` noscript | `ALEF needs JavaScript enabled.` | Brand spelling. The app is "Aleph" everywhere else in this file. | `Aleph needs JavaScript turned on.` |
| `index.html:56` | `Sound: checking audio support...` | Slightly technical. | `Checking whether this device can play sound…` |
| `index.html:57` | aria-label `Your teachers` | Fine. | — |
| `index.html:7` meta description | `Aleph: learn to read Hebrew aloud and speak it in Israel.` | Fine, specific. | — |

### A2. Offline fallback (`offline.html`)

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `offline.html:3` title | `ALEF - offline` | Brand spelling; hyphen. | `Aleph — you're offline` is tempting, but avoid a new dash. Use `Aleph (offline)`. |
| `offline.html:6` | `ALEF could not load this page. It is not saved on this device yet. Reconnect and open ALEF once to use it offline.` | ALEF / slightly stiff. | `Aleph couldn't load this page. It isn't saved on this device yet. Get back online and open Aleph once, and it will work offline after that.` |
| button | `Try again` | Fine. | — |

The in-app Offline screen (`src/shell/offline.view.js`) was already rewritten in later `main` commits and reads as human. Leave unless you find leftover "offline helper" jargon.

### A3. Home, Learn, First 10 minutes

Home i18n (`src/shell/i18n.js`) is already plain: "Read Hebrew aloud. Speak it in Israel.", "Today's lesson", "No reviews due." Keep.

First-day on-ramp (`data/firstday/onramp.json`) is short and spoken. One soft closer:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `data/firstday/onramp.json` `done.tomorrow` | `Come back tomorrow for your next letter. A few minutes a day is all it takes.` | Mild §2 closer / slogan. | `Come back tomorrow for your next letter. A few minutes is enough.` |
| `done.title` | `Five wins. You read your first Hebrew word.` | Fine, punchy. | — |
| step titles | `Your First Letter: Shin` vs `Your second letter: Bet` | Inconsistent title case (§20). | Sentence case throughout: `Your first letter: Shin`. |

`nav.firstday` is already `First 10 minutes` in i18n (good). A previous commit mentioned putting this heading back into Title Case; prefer sentence case on the page heading if tests allow.

### A4. About (`src/shell/about.view.js`)

Already specific and modest. One dash and a slight rhythm bump:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `about.view.js:9` | `The other is to get around in Israel and sound natural.` | Fine. | — |
| `about.view.js:12` | `Made by John Khan. Aleph is © 2026 John Khan — all rights reserved.` | §8 dash (weak). | `Made by John Khan. Aleph is © 2026 John Khan. All rights reserved.` |

No biography, no degrees, no US university names. Keep it that way.

### A5. Terms and rights (`src/shell/terms.view.js`)

Mostly careful legal plain language. Light edits only:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `terms.view.js:16` | `Aleph — the app, its lessons, its original text and its artwork — belongs to John Khan.` | Pair of em dashes. | `Aleph (the app, its lessons, its original text and its artwork) belongs to John Khan.` |
| `terms.view.js:20` | `released under CC0 1.0 — free for any use` | Dash as comma. | `released under CC0 1.0, free for any use` |
| `terms.view.js:23` | `The playback copies were enhanced for clarity` | "Enhanced" is on the stock list, but here it is a literal audio process, already explained in parentheses. | Keep, or `cleaned up for clarity (gentle denoise…)` if you want to dodge the word. |

### A6. Help (`src/shell/help.view.js`)

Good, direct, contracted. Several em dashes used as asides (`For the long version — the research…`, `If reading the screen itself is the problem — small text…`). Weak alone, but this short page has several. Prefer commas or parentheses in a pass.

Bold lead-ins on the three Listen outcomes (`A clip plays.`, `Another voice is offered.`, `The device voice reads it.`) are useful labels, not decorative bold. Keep.

### A7. How this works, Privacy, Credits, Settings, Search, Install

These were rewritten in the November copy audit. They are already plain and honest. Do not "humanize" them into personality that softens the draft warnings.

Settings toasts (`Saved ✓ You'll hear…`) use a check mark. That is UI confirmation, not an emoji bullet list. Keep.

Search empty state is already warm: `No matches yet. Try a different spelling, or fewer letters.`

### A8. Awards and certificate (`src/awards/gallery.view.js`, `src/awards/certificate.js`)

The honesty is excellent and must stay. The problem is a repeated closer:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| gallery, Games / Streak / Counted sections | `They are activity, not mastery. Locked and earned are written in words, not by colour alone.` | Same two sentences after several sections (§2 repeated closer; also a mild not-X-but-Y). | Say it once at the top of the page. Under each group, only add what is new (e.g. "Only these five games already save a play count."). |
| `certificate.js` `FACE.course` | `Beginner Hebrew Foundations` | Title Case is normal on a certificate. Fine. | — |
| `FACE.footer` | `Independent learning programme` | Fine if you are keeping Canadian/British spelling (`programme`). Be consistent with `licenses` vs `licences` elsewhere. | Keep, or `Independent learning program` only if you standardize on US spelling. |
| `FACE.sampleLine` | `Sample design — completion has not been assessed or awarded.` | Dash. | `Sample design. Completion has not been assessed or awarded.` |
| `FACE.issuer` | `Aleph is Key Foundation` | Leave unless John wants a different legal name. | — |

### A9. Library (`data/library/articles.json`, Library screen)

Twelve short articles, already run through a stock-phrase and copied-wording gate. They are mostly good: concrete, contracted, specific dates and sources. Leftover tells:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| All article titles and section headings | e.g. `Three Words at the Centre`, `Beliefs Written Down, Then Rewritten`, `From Sundown to Stars` | §20 title case, and some headings are written for effect. **Conflict:** `tools/content/check-articles.mjs` requires Title Case via `src/shell/title-case.js`. | Preferred: switch the gate to sentence case (`Three words at the centre`) and retitle clever headings to say what the section holds (`The movement's platforms`, `When Shabbat starts and ends`). If John wants to keep Title Case as house style, leave titles and only fix the sentences below. |
| `shabbat-at-home` section "Two Candles" | `Here's a detail that surprises people: the candles are lit first and the blessing comes after.` | §4 staged run-up. | `The candles are lit first, and the blessing comes after.` |
| `how-a-service-flows` summary | `Open a prayer book and it can look endless. It isn't: a service has a few big blocks, always in the same order.` | §1 not-X-but-Y. | `A prayer book looks long, but a service is just a few big blocks, always in the same order.` |
| `how-a-service-flows` Shema section | `It isn't a request at all. It's a statement that God is one.` | §1. The contrast is useful here (people do treat Shema as a petition). Soften rather than delete. | `It is not a request. It is a statement that God is one.` or merge: `The Shema, said morning and evening, is a statement that God is one, not a request.` |
| `reform-judaism` | `Each one reads differently, and that is the point.` | Mild §2 closer. | `Each one reads differently, which is how the movement works: it revisits its own statements.` |
| `how-hebrew-came-back` | `The thinking was simple. If a child could grow up speaking Hebrew, a whole people could.` | Short closer. This one has a human bite; you may keep it. | Optional keep. |
| British "centre" / "practise" | Several articles | Consistency with the rest of the app, which already mixes Canadian spelling. | Keep Canadian spelling (centre, practise as a verb, licences) rather than flipping to US. |

Do not add new stock words. Do not invent historical claims. Keep citations.

### A10. Synagogue pages (`data/synagogues/canada.json`) — highest priority

Twenty-seven congregation write-ups. They are sourced (good) but several openers still track the source sentence-for-sentence, and a few use brochure or AI openers ("A new chapter in … opened", "The story begins with", "in the heart of downtown", "standard-bearer", "served as").

This is also the plagiarism hotspot. See section D. Rewrite every story in your own word order. Keep names, dates, addresses, and numbers. Keep the `sources` lists. Do not drop a fact to dodge a phrase; change the sentence.

Priority rewrites (examples; do the rest in the same spirit):

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `temple-bnai-tikvah-calgary` story[0] | `Calgary's Reform congregation began on 6 April 1979 with a Shabbat service in the living room of Ron and Judy Bing: 33 people from 13 families. Norm Yanofsky played guitar and Henry Zimmer read the weekly Torah portion.` | Close paraphrase of the congregation's "Our story" page (Ron Bing). | `Ron and Judy Bing hosted the first Shabbat service at their house on 6 April 1979. Thirteen families came, 33 people in all. Norm Yanofsky brought a guitar; Henry Zimmer read that week's Torah portion.` |
| `anshe-sholom-hamilton` story[0] | `Hamilton's first Jewish families began gathering for communal life over a store on James Street South in 1850, when the city counted some thirteen to sixteen Jewish households, mostly German.` | Distinctive phrase "over a store on James Street South in 1850" appears in published anniversary coverage. | `In 1850, Hamilton had only about thirteen to sixteen Jewish households, most of them German. They started meeting in a room above a shop on James Street South.` |
| `har-tikvah-brampton` story[0] | `Har Tikvah, 'Mountain of Hope', began in September 1977 with a tea for the Jewish women of North Peel.` | Tracks the official history page almost move for move ("It all began September 1977, with a tea for Jewish women in the North Peel area"). | `The name means Mountain of Hope. In September 1977, Jewish women in North Peel met for tea. That gathering led to the congregation.` (Keep the later facts: 50 women if the source supports it, 1978 incorporation, 1981 name change.) |
| `temple-israel-ottawa` story[0] | `Temple Israel, the first Reform congregation in Ottawa, was founded in the spring of 1966 by Bill and Billy Danson, Myrna and Ernie Potechin, Irwin and Elaine Singer, Sam and Jean Bond and Madelyn Alexandor.` | Near-verbatim name list and framing from the Ottawa Jewish Archives post "The History of Temple Israel" (4 February 2021). | `Ottawa's first Reform congregation got started in spring 1966. The founding group was Bill and Billy Danson, Myrna and Ernie Potechin, Irwin and Elaine Singer, Sam and Jean Bond, and Madelyn Alexandor.` Then continue in a new order (November membership, December 2 service at Gowling school, and so on), not the archive article's order. |
| `iyr-ha-melech-kingston` story[0] | `A new chapter in Kingston's Jewish life opened in 1975 when a Reform congregation was organised, thanks in large part to Michael Levison…` | §13 inflated opener ("a new chapter opened") plus likely exhibit phrasing. | `In 1975 Michael Levison, a British computer scientist newly arrived at Queen's, helped organise a Reform congregation in Kingston.` |
| `solel-mississauga` story[0] | `In 1973, the Hebrew year 5734, there was no synagogue, rabbi or Hebrew school in Mississauga. A handful of Jewish families, strangers to one another, decided there should be a Jewish presence…` | Close to the founders' own telling (Lester Krames via Solel's 50th letter). Facts are fine; change the shape. | `Mississauga in 1973 (5734) had no synagogue, no rabbi, and no Hebrew school. A few Jewish families who did not yet know each other set out to build both a school and a place to mark holidays.` |
| `shaarei-beth-el-oakville` story[0] | `The story begins with two immigrant couples.` | §4 staged opener. The Burke/Zuckerman facts did not turn up as a verbatim web hit; still rewrite the opener. | Drop "The story begins with." Start with the two couples and the year they settled in Oakville. |
| `temple-israel-london` / others | `…served as interim rabbi…` / `a strong voice for Reform Judaism in London and Southwestern Ontario` / `in the heart of downtown Newmarket` | §18 "served as"; §16 "in the heart of"; brochure tone. | `Rabbi Michal Shekel of Toronto was the interim rabbi.` / `…and the congregation grew from 40 families to 140.` (drop "strong voice" unless you are quoting). / `…a larger building downtown, near the public library.` |

Also watch "Recognised as Canada's first Reform congregation" (puffery + British spelling) in the Anshe Sholom later paragraph. State the claim once, with the source, without "recognised as".

### A11. Games hub and arcade (`src/games/games.view.js`, `src/games/arcade.catalog.js`)

Short tags are mostly fine ("Hear a letter, tap it before it hides"). The game *titles* have a generated-name feel: stacked nouns, "The …", "Cultivator", "Laboratory", "Decryption Grid".

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `games.view.js` | `The Hebrew Pinball Bouncer` | Over-titled. | `Hebrew Pinball` |
| | `Bubble Pop Prefix Blast` | Forced punch. | `Prefix Blast` |
| | `The Memory Palace Courtyard` | Extra noun. | `Memory Palace` |
| | `Hebrew Root Tree Cultivator` | Stock "cultivator". | `Root Tree` |
| | `Bumper Car Verb Conjugations` | Title-case lecture. | `Verb Bumper Cars` |
| | `Endless Runner: Shabbat Rush` | Genre label in the title. | `Shabbat Rush` |
| | `Typewriter Conveyor Belt` | Fine-ish; still long. | `Typewriter Belt` or keep. |
| | `The Israeli Flea Market Barter` | Brochure. | `Flea Market` or `Shuk Barter` |
| | `Submarine Sonar Vowels` | Fine if you like the joke. | Optional `Sonar Vowels` |
| | `Hebrew Rhyme Laboratory` | "Laboratory" is a common AI game name. | `Rhyme Lab` |
| | `Cipher Decryption Grid` | Two words for the same idea. | `Cipher Grid` |
| | `The Karaoke Beat Matcher` | | `Karaoke Beat` |
| | `The Museum Curator` | Fine. | Optional keep. |
| `wordfinder` hook | `No Hebrew experience needed: hear, look, find and learn 240 short words` | Slight sales triad. | `Made for people who don't know Hebrew yet. Hear a word, find it, and learn it. There are 240 short words.` |
| `shuktaxi.view.js:19` | `Read the Hebrew direction on your journey.` | "Journey" as travel is literal here. | `Read the Hebrew direction as you go. The street signs have no English on them.` |

If tests or art keys look up the old titles, update the tests and any visible heading only; do not rename route ids.

### A12. Letter memory stories (`data/letters/memory-chain.json`)

The stories are short mnemonics ("A bungalow with a ball inside: B! Bayit is a house."). That formula repeats 27 times (uniform rhythm, §7 at set scale). They do not read like chatbot essays. Do not flatten the teaching hook.

Optional light variation: keep the hook word and the Hebrew example, but don't force every story into `Sound! Word is meaning.` A few can be one calm sentence. Do not change the sound facts or the example words. Tradition-specific transliterations (`bayis`, `cholov`, etc.) stay.

Tips and sound lines are instructional; leave unless a line is actually wrong.

### A13. Lessons, review, prompts (`data/curriculum/lessons.json`, `hints.json`, `prompts.json`, lesson/review views)

Lesson titles and goals are mostly task-like ("Say Hagomel after a safe journey…"). "Journey" in I-34 is the actual topic (travel / Hagomel). Keep the meaning; you can say "trip" or "travel" if you want to dodge the watch-word: `Say Hagomel after a safe trip and answer the congregation's reply.`

Exercise feedback in `src/curriculum/exercises.session.js` was already signed off as human in the earlier audit ("Correct.", "Not quite.", "Still tricky. It will come back in your review."). Keep that tone.

Reflection prompts in `prompts.json` should be read for §3/§4 ("What really matters", "Let's explore"). I did not find those stock openers in a spot check; still skim the English prompt lines.

### A14. Read, Speak, Torah, Listen, Brain Lab, Study plan, Progress

Chrome in these areas was recently rewritten in `main` and is mostly plain. Watch for leftover preview-banner legalese on learner pages (a prior commit moved draft notes to About, Terms, and Credits). Do not put review-status jargon back on learner screens.

Rimon the mascot (`src/shell/rimon-speech.js`) shouts in all caps (`GREAT JOB!`, `YOU ARE AWESOME!`). That is arcade pep, not typical LLM prose. Leave it unless John wants a quieter mascot. Do not replace it with "You're doing an amazing job on your learning journey."

### A15. README and other public repo docs

`README.md` is a private-repo status document, already packed with specific counts and hedges. It is not chatbot fluff. Light issues only:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `README.md:1` | `# ALEF` | Brand. The running app is Aleph; the repo is Al-Heb. | Keep a one-line explanation, but use `Aleph` as the product name in the heading if that matches the shipped UI. |
| `README.md:5–7` | `without sounding like an outsider` | Specific, human. Keep. | — |
| em dashes in the Status section | several | Weak. | Commas or parentheses where easy. |
| `GAMES-START-HERE.md` | Internal onboarding for agents | Not a learner page. Out of scope unless it ships somewhere public. | — |

`CONTRIBUTING.md` and `SECURITY.md` are short and fine.

`manifest.webmanifest` description is honest: `A free Hebrew reading and speaking course for synagogue readers and Israel travellers. Works offline. Content is a draft, not yet reviewed by a Hebrew teacher or clergy.` Keep the warning. "Travellers" is Canadian spelling; keep if that is the house style. Shortcut labels are fine.

---

## B. Buttons, labels, aria-labels, empty and error states

Already in good shape from the November audit. Only small consistency items:

| Location | Current | Issue | Suggested rewrite |
|---|---|---|---|
| `src/shell/i18n.js` `nav.vocab` | `Dictionary — 5,000 words` | Em dash. | `Dictionary (5,000 words)` |
| `nav.israel` | `Sound like a local` | Slightly salesy, but it is a clear promise and not a stock AI phrase. Optional. | `Everyday Hebrew in Israel` |
| `nav.roles` / `nav.soundgap` / `nav.fade` / `nav.ladder` / `nav.dottile` / `nav.syllablechips` | Internal widget names | Still unclear to a newcomer (already marked "decide" in COPY-AUDIT). | Prefer a verb: `Practice sounds English doesn't have` for Sound gap, etc. Confirm with John before a mass rename; tests and search index these labels. |
| Book player | `▶ Listen — Noa` / `Listen — Ari` | Dash. | `Listen (Noa)` |
| Books shelf | `Start here — …` | Dash. | `Start here: …` |
| Error / empty (already rewritten) | `This screen did not load`, `Sorry about that. Try reloading…`, `This part of Aleph is not ready yet. Nothing is broken.` | Human. Keep. | — |
| Rimon / praise buttons | Keep short verbs: Start, Review, Show answer, Hear it, Trace it, Not now. | Fine. | — |

Do not invent new exclamation-heavy CTAs ("Unlock your potential", "Start your journey").

---

## C. Write-ups (articles, stories, certificates, lesson text)

Covered above in A8–A13. Priority order for the edits:

1. Rewrite `data/synagogues/canada.json` stories (plagiarism + sales/AI openers).
2. Library article sentences listed in A9 (and heading policy decision).
3. Game titles in A11.
4. Chrome consistency (Aleph spelling, dashes, Awards repeated closer, on-ramp closer).
5. Optional light variation in memory-chain stories.
6. Skim remaining learner views (`src/**/*.view.js`) and `data/israel`, `data/festivals`, `data/books/index.json`, `data/onboarding/plans.json` for leftover §1, §4, §12, and §16. I did not personally read every game view (there are dozens) or every intermediate lesson file word-for-word.

---

## D. Plagiarism pass (not exhaustive)

Method: chose distinctive English sentences from library articles, the About/intro pages, and synagogue stories; searched the public web for exact or near-exact wording. I did not search dictionary example sentences, game microcopy, or public-domain JPS 1917 / liturgy (those are quoted source texts, not original prose).

### No exact-phrase hits (original enough for this check)

- Library summary "Then one stubborn family started speaking it at breakfast."
- "Here's a detail that surprises people: the candles are lit first…" (the *fact* is standard; the wording did not appear as a copy).
- About page sentences ("Aleph is a Hebrew course with two goals…").
- `shanah me'uberet, a pregnant year` is a standard gloss of the Hebrew term, used in many places; not a theft of a unique sentence.

### Close-paraphrase hits (rewrite; keep the citations)

1. **Temple B'nai Tikvah (Calgary)** — `data/synagogues/canada.json` `temple-bnai-tikvah-calgary`  
   Source: https://templebnaitikvah.org/about/our-story/ (Ron Bing: first Shabbat on April 6, 1979 in the living room; 33 people, 13 families; Norm Yanofsky on guitar; Henry Zimmer reading Torah). The app sentence order and details follow that account closely. Already cited. Rewrite as in A10.

2. **Temple Anshe Sholom (Hamilton)** — `anshe-sholom-hamilton`  
   Source coverage, e.g. https://www.jewishhamilton.org/community-news/temple-celebrates-its-165th-anniversary-162326 ("…had its start over a store on James Street South in 1850 when the city's 16 Jewish families…"). Distinctive overlap: "over a store on James Street South in 1850". Already cited (CJN / OJA / temple history). Rewrite.

3. **Har Tikvah (Brampton)** — `har-tikvah-brampton`  
   Source: https://www.hartikvah.org/history ("It all began September 1977, with a tea for Jewish women in the North Peel area which brought an attendance of fifty women."). Already cited. Rewrite.

4. **Temple Israel (Ottawa)** — `temple-israel-ottawa`  
   Source: https://ottawajewisharchives.home.blog/2021/02/04/the-history-of-temple-israel/ ("…founded in the spring of 1966 by Bill and Billy Danson, Myrna and Ernie Potechin, Irwin and Elaine Singer, Sam and Jean Bond, and Madelyn Alexandor."). Near-verbatim founder list and framing. Already cites the temple history / Wikipedia. Rewrite and keep the names.

5. **Solel (Mississauga)** and **Iyr Ha-Melech (Kingston)** — shape and some wording sit close to the congregations' own histories / OJA exhibits (Solel: https://solel.ca/president-message/2023-going-back-50-years/). Not a word-for-word lift in the Solel 50th letter itself, but the "no synagogue, rabbi or Hebrew school" + "strangers" frame is the founders' stock telling. Rewrite the shape.

Oakville's Morris Burke / Marcos Zuckerman paragraph did not surface as a verbatim web hit in this pass. Still rewrite the "The story begins with" opener and keep the cited Oakville News / Beaver sources.

Library articles already have an in-repo shingle check against cited pages (`tools/content/check-sources.mjs`) and a copied-wording check. I did not re-run the live source fetcher in this review.

---

## E. Top patterns (with examples)

1. **Close paraphrase of cited sources** (synagogue stories) — see D.
2. **Title Case headings and "product" titles** — library headings; game names like `Hebrew Root Tree Cultivator`; `About This Lesson`.
3. **Em/en dashes as the default aside** — About copyright line, Terms, Help, `Dictionary — 5,000 words`, `Listen — Noa`.
4. **Not X but Y** — "It isn't a request at all. It's a statement…"; "It isn't: a service has a few big blocks…"; Awards' "activity, not mastery" repeated.
5. **Staged or inflated openers** — "Here's a detail that surprises people"; "A new chapter in Kingston's Jewish life opened"; "The story begins with two immigrant couples."
6. **Repeated one-line closer** — Awards sections all end with the same two sentences.
7. **Generated-sounding game titles** — stacked nouns and lab/cultivator/blast/grid.
8. **Uniform mnemonic rhythm** — letter stories almost all `Hook! Word is meaning.`
9. **Brand spelling drift** — Aleph vs ALEF in `offline.html`, noscript, README heading, some older titles.
10. **Brochure leftover in synagogue prose** — "in the heart of downtown", "standard-bearer", "recognised as", "strong voice for".

False friends the automated scan over-counted (do not "fix" these unless the English is also awkward): vocabulary glosses (`journey, ride`; `to harness`; `view, landscape, scenery`; `to raise, elevate`); literal game unlocks (`Level 3 unlocked`); "how it is said" (this is pronunciation, not "it is said that…"); "What would you like?" in restaurant dialogues; typographic check marks; CSS containing the word `landscape`.

---

## F. What this review did not fully cover

- Every one of the 60+ individual game view files, line by line.
- The 5,000-word dictionary examples and alternate glosses (only scanned for stock words; many hits were the word's actual meaning).
- Full English of Torah, siddur, and JPS 1917 (quoted source text).
- Every intermediate lesson JSON (`data/curriculum/lessons-intermediate/`) beyond titles, goals, and a sample.
- Internal docs under `docs/` other than noting they exist (COPY-AUDIT, launch copy). Those are not learner-facing.
- Running AI detectors (Originality, GPTZero, etc.). Humanizer itself says detectors still flag much of its output; the job here is to remove tells, not to chase a score.
- A live re-run of `tools/content/check-sources.mjs` against the cited web pages.

Existing clones and this worktree were not modified for copy, and nothing was committed or pushed.
