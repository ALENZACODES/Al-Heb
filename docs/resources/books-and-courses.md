# Books and courses: teaching ideas for ALEF

Status: research notes, 2026-11-03. Scores are the author's judgement on a 0-1000 scale, not measured outcomes. Machine-readable concepts: `data/curriculum/resource-concepts-books.json` (validated by `tests/resources-books.test.js`). Only ideas and pedagogy are used; no text, artwork or audio from any resource is copied.

Score axes in the table: reading siddur or Torah aloud / Israeli functional Hebrew / beginner clarity / fit with ALEF (offline app, stylus tracing, per-tradition audio, SRS, existing workbook) / originality risk (higher is worse). The headline score is a judgement that weighs these, not an average.

## Access summary

| Resource | What I could see | What I could not |
|---|---|---|
| BPA Activity Book 1 (PDF, 51 pages) | Full text via pdftotext; pages 1-10 and 47-51 rasterised and looked at | I did not view every middle page as an image, only the text of all of them |
| NJOP interactive alphabet | Full static HTML of the page via curl and WebFetch | Lightbox behaviour (what a tap shows beyond audio) is script-driven and I could not run it; I did not listen to the audio |
| Udemy "Know The Hebrew Alphabet" | Public page via WebFetch: description, ratings, 4-section outline; a third-party listing for instructor and duration | Direct curl returned the Cloudflare 403 challenge; lecture titles beyond the outline, lecture content and individual reviews |
| Hebrew For Dummies, 2nd ed. | Publisher-level description and top-level table of contents from a bookseller listing; the public Dummies web excerpt page summary | Chapter titles below part level (except Chapter 1), any book text |

The dokumen.pub copy of Hebrew For Dummies is an unauthorised copy of a copyrighted book. I did not fetch or read it. Everything below on that book comes from legitimate public listings only.

## 1. BPA "Learning Hebrew: The Alphabet Activity Book" (children's book)

Structure: 51 pages: a parent introduction, a "time travelers" page, a one-page chart of the 22 letters in three script columns, then exactly two pages per letter in alphabet order (a picture and story page, then a write page), ending with a promotional page.

Activity types found: colouring of an object drawn per letter, copy-writing on ruled lines with one grey model at the right edge (start of an RTL line), reading a chart, and a story-plus-keywords hook. Stroke numbers and arrows appear on the modern-script model. The intro says it has 22 colouring activities.

Activity types absent (I checked the text of all pages for these): matching, word search, circling a letter in text, sound practice, any word reading, vowels, final letters, dagesh or shin dots, review of earlier letters, answer checking.

Strengths worth borrowing: a predictable page template; stroke numbers right on the model; one memory hook per letter.

Weaknesses: letters are never tied to a sound on the page; no discrimination of look-alikes (bet/kaf, dalet/resh); no reading at all, so a learner finishes unable to read a word; no spacing or review; the three-script ancestry strip and abstract "meanings" add load without helping decoding, and their historical claims are presented as fact, which I did not verify; colouring has little value past childhood. The book's religious conventions are not ALEF's and were ignored.

What ALEF already does better: stroke tracing with feedback, a faded repetition line, sound labels, finals and variants (31 rows), a confusables page and syllable and word pages in the printable workbook.

## 2. NJOP "The Interactive Hebrew Alphabet"

Seen in the page: an intro, a note that letters are shown left to right with Sephardic Israeli pronunciation, and a gallery of 32 tiles with per-tile audio file links, opened in a lightbox. Repeated names (Kaf three times, Pe three times, Mem, Nun, Tsadi, Shin and Tav twice) suggest variant and final tiles; the page does not label them, so that is inference. Links to separate reading and writing crash courses and an accessibility toolbar surround it.

Does well: immediate sound on tap, no sign-up, honest statement of pronunciation, variants as units.

Does poorly: left-to-right layout against the reading direction (the page itself notes it), a single tradition with no switch, and nothing on the page for stroke order, memory hooks, vowels or testing (I saw only the static HTML, so I cannot say what the lightbox adds). Audio was not copied or listened to.

## 3. Udemy "Know The Hebrew Alphabet" (free)

Public page content: about 55 minutes, 21 lectures in 4 sections (intro and Hebrew keyboard setup; alphabet in groups from Alef-Dalet through Resh-Tav with a midterm; recognising handwritten forms in groups; extras with an overview PDF). Letters and pronunciation only, no vowel signs. Ratings: 4.6 from 660 ratings on the Udemy page and 4.5 from 864 reviews on a third-party listing, so figures differ by source and date. Two instructors are named. I could not read reviews.

Worth keeping: handwriting recognition as its own block, keyboard setup early, small groups with a mid-course check. Weak points for ALEF: no vowels so no real reading; passive video; alphabetical chunking ignores look-alikes.

## 4. Hebrew For Dummies, 2nd edition (Jill Suzanne Jacobs, Wiley)

Not fetched: the dokumen.pub copy. From public listings only: parts run Getting Started, Hebrew in Action, Hebrew on the Go, Diving Deeper into Hebrew Life, Sacred Hebrew, Part of Tens, then appendices for verb tables, a mini-dictionary and an answer key. Chapter 1 is titled around words the reader already knows. The publisher description says it prepares readers for sounds unfamiliar to English speakers, contrasts Hebrew with English, covers right-to-left reading, and includes online native-speaker audio. A public excerpt page on the alphabet describes letters plus a vowel-point system.

I did not check the book's actual content, so every concept from it is a structural inference from the listing and the real chapters may differ.

## Concept table

Columns: id, source, concept, reading/Israeli/clarity/fit/risk, score, improved score. Improved scores are the author's re-judgement after the specs in the next section; they are not measured.

| id | source | concept | axes | score | improved |
|---|---|---|---|---|---|
| bk-bpa-01 | bpa | Fixed two-page template per letter | 600/500/800/700/100 | 620 | 620 |
| bk-bpa-02 | bpa | Numbered stroke-order arrows on the model glyph | 750/700/800/800/50 | 760 | 760 |
| bk-bpa-03 | bpa | Single heavy model glyph at the start of an RTL practice line, then blank ruled lines | 600/550/750/600/50 | 600 | 600 |
| bk-bpa-04 | bpa | Picture hook per letter (object plus short story) | 700/600/850/700/350 | 780 | 940 |
| bk-bpa-05 | bpa | Three-script ancestry strip (pictograph, paleo, modern) beside each letter | 250/150/550/350/300 | 330 | 330 |
| bk-bpa-06 | bpa | Three keyword "meanings" listed per letter | 100/100/500/150/400 | 200 | 200 |
| bk-bpa-07 | bpa | One-page alphabet chart with three script columns | 600/500/700/650/100 | 580 | 580 |
| bk-bpa-08 | bpa | "Did you know" orientation box (right to left, count of letters, name plus sound) | 650/600/800/600/100 | 600 | 600 |
| bk-bpa-09 | bpa | Colouring task as retention device | 250/250/600/300/100 | 280 | 280 |
| bk-bpa-10 | bpa | Alphabetical-only sequence, one letter at a time, no review | 300/300/650/200/50 | 250 | 250 |
| bk-bpa-11 | bpa-gap | Circle-the-target scan on running text (gap filler; not in the book) | 880/820/900/900/80 | 850 | 960 |
| bk-bpa-12 | bpa-gap | Sound-to-letter matching with a keyword per sound (gap filler) | 850/850/880/850/60 | 800 | 950 |
| bk-njop-01 | njop | Tap a big letter, instantly hear it (grid of all tiles) | 760/760/900/800/80 | 780 | 780 |
| bk-njop-02 | njop | Each form-plus-sound pair is its own tile (32 entries, repeated names for variants and finals) | 880/860/780/900/80 | 860 | 955 |
| bk-njop-03 | njop | One tradition stated plainly above the grid | 700/700/850/650/50 | 640 | 640 |
| bk-njop-04 | njop | Letters laid out left to right with an apology note | 300/300/600/100/30 | 150 | 150 |
| bk-njop-05 | njop | Read first, write later as separate courses | 840/600/800/750/100 | 780 | 780 |
| bk-njop-06 | njop | Built-in accessibility toolbar (contrast, text size, readable font, reduced motion) | 600/600/800/700/30 | 650 | 650 |
| bk-njop-07 | njop | Weakness: audio only; no quiz, no stroke order, no memory hook stated on the page | 300/300/500/100/30 | 200 | 200 |
| bk-udemy-01 | udemy | Letters taught in small alphabetical groups with a midterm | 750/700/850/750/100 | 780 | 940 |
| bk-udemy-02 | udemy | Hebrew keyboard setup in lecture one | 600/800/650/650/80 | 700 | 700 |
| bk-udemy-03 | udemy | Dedicated "recognise handwriting" block after print letters | 650/900/800/900/80 | 860 | 960 |
| bk-udemy-04 | udemy | Letters only, no vowel signs | 350/400/750/200/30 | 320 | 320 |
| bk-udemy-05 | udemy | Overview PDF cheat sheet | 550/500/750/650/50 | 560 | 560 |
| bk-udemy-06 | udemy | Video lecture format (about 55 minutes total) | 350/350/700/250/30 | 300 | 300 |
| bk-dummies-01 | dummies | "You already know some Hebrew" opener (cognates and loanwords as the first words) | 500/900/920/900/150 | 880 | 965 |
| bk-dummies-02 | dummies | Pre-teaching sounds English speakers lack (gutturals and similar) | 800/900/850/850/100 | 870 | 960 |
| bk-dummies-03 | dummies | Contrast framing: where Hebrew resembles English and where it differs | 800/850/900/850/120 | 860 | 955 |
| bk-dummies-04 | dummies | Parts ordered: basics, everyday action, travel, deeper life, sacred Hebrew last | 600/850/750/700/120 | 760 | 760 |
| bk-dummies-05 | dummies | Exercises with an answer key appendix | 700/700/850/700/60 | 760 | 760 |
| bk-dummies-06 | dummies | Verb tables and mini-dictionary appendices | 300/700/600/500/60 | 560 | 560 |
| bk-dummies-07 | dummies | Online audio of native speakers in conversation | 500/800/800/800/60 | 750 | 750 |
| bk-dummies-08 | dummies | Part of Tens: ten-item quick-win lists | 400/700/800/600/100 | 600 | 600 |

## Improved ALEF versions (every concept at 850+, plus several below it)

### bk-bpa-04 Shape-hook cards with learner choice (780 -> 940)

- Screen: Per-letter card showing a simple original image that echoes the print glyph's shape, a one-line cue, and the sound anchor word; a toggle swaps between two cues.
- Data: Data: hooks[] per letter {cue, imageId, kind: shape or sound}, authored for ALEF, not taken from the book. Optional history line kept in a separate "origin" field and labelled as background.
- Interaction: Learner picks the hook that works for them; a recall test later shows only the hook image and asks for the letter; hook usage informs which hooks stay.
- Test: Unit: every letter has at least one hook, imageId resolves to an asset or is flagged pending, no hook text contradicts the letter's recorded sound; recall quiz returns the right answer for each hook.

### bk-bpa-11 Letter-scan drill (Spot It) (850 -> 960)

- Screen: New drill screen "Spot It" reachable from a letter lesson and from the review queue. Shows 3 to 5 lines of pointed Hebrew, right to left, in the learner's chosen script; a target letter chip sits at the top right.
- Data: Pure builder over the corpus registry and the confusables list: for target T pick lines containing T and plant its confusable partners (for example bet/kaf, dalet/resh) as decoys. Output {lineIds, targetId, hitIndices, decoyIndices}. Difficulty ladder: single letters, then words, then a verse line. Results feed the existing progress store as per-letter and per-confusable-pair accuracy.
- Interaction: Tap or stylus-circle every instance of the target; decoys that are tapped count against the confusable pair and re-queue that pair in the SRS; a timer is optional and off by default; finishing shows hits, misses and which decoy fooled the learner.
- Test: Unit: builder returns hit indices equal to the true count of T in the line, never marks a decoy as a hit, and is deterministic with a seed. Data guard: only lines whose letters are all taught by that lesson. UI: mount/unmount leaves no listeners.
- Printable: Printable page kind "scan": one target letter in a box at the top right, 6 ruled lines of unpointed then pointed text, instruction "circle every one"; answer key page lists the count per line. Spec only; reuse the buildModel/buildHtml page-kind convention in tools/letters/workbook.mjs.

### bk-bpa-12 Sound-anchor matching (800 -> 950)

- Screen: Two-column matcher: left column plays an audio clip (no transliteration), right column shows 4 candidate glyphs including one look-alike; sits after the tap-to-hear atlas.
- Data: Per-letter keyword anchor (an everyday word whose first sound is the letter's sound) stored in letters.json as proposed field soundAnchor, one per tradition where sounds differ; reuses audio manifest ids kind=letter.
- Interaction: Hear, pick the glyph, get immediate audio plus the anchor word on a miss; misses of look-alikes are logged into the confusables SRS queue.
- Test: Unit: distractor generator never includes the target twice and always contains one confusable partner when one exists; accuracy logging writes to the progress store; every referenced audio id exists in the manifest.
- Printable: Printable "match the sound" page needs audio so is not good on paper; use a keyword-anchor page instead (draw a line from glyph to the picture word). Spec only.

### bk-njop-02 Letter Atlas of form-sound tiles (860 -> 955)

- Screen: Atlas screen: a right-to-left grid of all 27 letters plus the dagesh and shin-dot variants as separately labelled tiles, each tile showing glyph, its form state (plain, dagesh, final) and a small sound label for the active tradition.
- Data: Derived, not hand-typed: built from letters.json and niqqud.json variant rules, 31 form-sound units to match the printable workbook's 31 rows. Each tile links audio id kind=letter plus a sibling list (bet to vet, kaf to khaf, finals to their regular forms).
- Interaction: Tap a tile: audio plays in the chosen voice and tradition, the sibling tiles pulse; long-press shows stroke order. A "sound merges here" badge appears on pairs that sound identical in the chosen tradition (for example Israeli chet and khaf).
- Test: Unit: tile count equals 31; every tile has an audio id that resolves in the manifest or falls back to Web Speech; tiles are ordered right to left; sibling links are symmetric; merge badges match the pronunciation data for each tradition.

### bk-udemy-01 Confusion-aware groups with cumulative checkpoint (780 -> 940)

- Screen: Lesson plan view groups letters by look-alike sets separated across lessons (so bet and kaf are not introduced together), with a checkpoint after each third of the alphabet.
- Data: Grouping rule applied over confusables.json when generating lessons; checkpoint is a mixed quiz drawing from everything taught so far.
- Interaction: Checkpoint results move items between SRS stages; failure sends the learner to the relevant Spot It or matching drill.
- Test: Unit: no lesson contains two letters flagged confusable unless the lesson is a contrast lesson; each checkpoint draws only taught letters.

### bk-udemy-03 Handwriting decoder (860 -> 960)

- Screen: Drill screen "Read the handwriting" shown after the print letters are known. Each card shows one letter or a short word in ktav yad, with a print-script reveal on tap.
- Data: Uses the cursive glyph data already in letters.json (cursive strokes derived from an OFL font) plus a stylus-sample variation layer: random slant, stroke weight and joining jitter generated client-side. Optional extension: learner's own tracing from the trace view saved as a personal sample.
- Interaction: Forced-choice from 4 print candidates; the confusable cursive pairs are weighted up (cursive shapes that collide); after a miss the stroke-order animation of the cursive form plays once. Unlocks after 12 letters are mature in SRS.
- Test: Unit: jitter keeps the glyph inside its box and is deterministic with a seed; candidate set always includes the true letter once; unlock gate respects the SRS maturity threshold; every card passes the shape check in src/letters/shapecheck.js.
- Printable: Printable page kind "handwriting": a row of 8 jittered cursive samples with print-letter boxes to fill in. Spec only.

### bk-dummies-01 Words you can already read (loanword on-ramp) (880 -> 965)

- Screen: Lesson card "You can already read this": after the first 8 to 10 letters the learner decodes Israeli loanwords written in Hebrew, one at a time, with the English meaning hidden until they attempt it.
- Data: New list data/vocab loanwords (proposed): {he pointed, he plain, gloss, source language, lettersUsed[], tradition notes}. Selection rule: every letter in the word already taught, no vowel signs needed beyond what the lesson has shown. Needs native-speaker review before shipping and attribution is not required because the words are common vocabulary, but I have not checked any specific candidate list.
- Interaction: See word, tap letters to hear syllables, type or pick the English meaning, then hear the word in both voices. The learner can mark "I knew this" for a quick pass.
- Test: Unit: for each word, lettersUsed is a subset of the lesson's taught letters, pointed text passes the U+0590-05FF check, and no word appears before its letters are taught. Review flag status must be set to needs-native-review.

### bk-dummies-02 Sound-gap lab (870 -> 960)

- Screen: A short lab screen reached after the first consonants: three pairs of sounds English readers blur, each as a listen-and-pick minimal-pair drill (chet versus khaf, kaf versus qof, tet versus tav). The set shown depends on the chosen tradition because merges differ.
- Data: Pair table keyed by tradition in data/pronunciation (proposed pairs.json): {a, b, traditions where they are distinct, audio ids}. Pairs that are merged in a tradition are shown as "same sound here" rather than drilled.
- Interaction: Hear one clip, tap the letter; a mouth-position tip card appears on a miss; recording self-compare is out of scope until the audio lane supports it.
- Test: Unit: every pair references real letter ids and audio ids; merged pairs are never drilled in the tradition where they merge; no pair data contradicts the pronunciation data files. Human check: a native speaker confirms which pairs are distinct per tradition.

### bk-dummies-03 Interference hints triggered by the learner's own error (860 -> 955)

- Screen: Inline hint panel under a wrong answer: one sentence saying what an English reader tends to expect and what Hebrew does instead (reading direction, missing short vowels, silent letters).
- Data: Hint library keyed by error type: {errorKind, hint, appliesTo tradition}; error kinds come from the drill results already logged (confusable pair, wrong vowel, direction slip).
- Interaction: Show the hint only after a miss, once per error kind per session, with a "got it" button that suppresses it for that kind next time; repeated misses escalate to a worked example.
- Test: Unit: every errorKind produced by the drills has a hint; hints are under 140 characters; suppression state persists in the store; a hint never appears on a correct answer.

## Printable pages that fit the existing workbook

The workbook builder has page kinds front, strokeorder, letters, confusables, syllables and words. I did not edit `tools/letters/workbook.mjs`. Candidates for a later lane, all spec only: a "scan" page (circle the target letter, with an answer key page), a keyword-anchor matching page (draw a line from letter to picture word), a handwriting-decoding page, and an answer key appendix for the existing syllable and word pages (bk-dummies-05, scored 760, no improved spec).

## Not verified

No learning outcome was measured. The picture-hook, cancellation-scan and minimal-pair ideas are standard teaching techniques that I did not back with citations here. Per-tradition sound merges and the guttural pairs need a native speaker or the pronunciation lane's data before use. The loanword list does not exist yet and needs review.
