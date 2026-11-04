# Hebrew For Beginners YouTube playlists: teaching ideas for ALEF

Status: research notes, 2026-11-03. Scores are the author's judgement on a 0-1000 scale, not measured outcomes. Machine-readable concepts: `data/curriculum/resource-concepts-yt.json` (validated by `tests/resources-gratis.test.js`). Only ideas and pedagogy are used; no caption text, video, image or audio from the channel is copied.

Score axes in the table: r reading siddur or Torah aloud / i Israeli functional Hebrew / c beginner clarity / f fit with ALEF (offline app, stylus tracing, per-tradition audio, SRS, existing workbook) / risk originality risk (higher is worse). The headline score is a judgement that weighs these, not an average.

## Access summary

I read English auto-captions only. I did not watch any video and did not hear any audio, so nothing below describes what is shown on screen except where the instructor says it aloud ("this sign", "the dot"). Captions are machine made, so some wording is garbled.

| Playlist | Videos | Captions read | Not read |
|---|---|---|---|
| Alphabet course (PLs_960L8fsozkSpqNbEHOZ0iBa3ArWK0k) | 7 lessons + 1 supporter promo | 7 of 7 | none |
| Vowel signs (PLs_960L8fsow93QPN6hISr7v6PnlFLWEH) | 7 + promo | 5: a, e, o, short e, overview | i signs (ZnFycQ-XVSo), u signs (cdeCPo3K9uk): the video host answered 429 or a bot check |
| Handwriting (PLs_960L8fsozA99DPz4HpVoJIyBgj2Oul) | 5 + promo | 1 usable (part 1) | part 2, part 3, overview: rate limited; part 4: captions read but unusable (garbled) |

The promo video (xCMKWsjuCg0) is a 28 second supporter appeal in all three lists and was ignored. The channel licence is not stated in the data I could read (yt-dlp reported none); treat it as standard YouTube terms.

## What the playlists are

The alphabet course is seven lessons of 1.5 to 5 minutes. Letters come in alphabet order, three or four per lesson, with one notable behaviour flagged per letter: silent carriers (aleph, ayin), dot toggles (bet, kaf, pe), final forms, look-alike warnings, and geresh variants (gimel, zayin, tsadi). The vowel series is one short video per vowel sound (a, e, i, o, u) plus short e and an overview, grouping all signs that make each sound and the vowel-letter variants. The handwriting series (print to script) is a bonus that follows reading.

Strengths: very small chunks; each exception is named at the moment it appears; the vowel series teaches by sound family; permission to recognise without writing. Weaknesses I can see from the captions: the English-equivalent letter shortcut hides sounds with no English match; geresh variants are mixed into the first alphabet lessons; a final he is described as simply unread, which is a shortcut that fails for some Torah words; short e is taught as the value of the two dots (shva), which is wrong when the shva is silent; the instructor's explanation of resh and ayin is brief.

## Concepts and scores

| ID | Concept | Source | r | i | c | f | risk | Score | Improved |
|---|---|---|---|---|---|---|---|---|---|
| yt-vowels-01 | Vowel signs grouped by the sound they make (a, e, i, o, u families) with several signs per family | yt-vowels | 930 | 880 | 850 | 880 | 150 | 880 | 965 |
| yt-alphabet-03 | Same glyph with and without a dot, sounds compared back to back | yt-alphabet | 850 | 700 | 850 | 850 | 100 | 850 | 960 |
| yt-vowels-03 | Vowel letters taught inside the vowel family (with or without the yud or vav) | yt-vowels | 880 | 860 | 800 | 850 | 100 | 860 | 955 |
| yt-alphabet-04 | Verbal look-alike warnings (final nun versus vav, tav versus chet) | yt-alphabet | 800 | 650 | 800 | 850 | 100 | 810 | 930 |
| yt-handwriting-02 | Cursive introduced as a curlier version of the printed letter, with start points and arrows | yt-handwriting | 450 | 820 | 800 | 880 | 100 | 800 | 930 |
| yt-vowels-02 | Recognise first, write later (explicit permission to not memorise how to draw the signs) | yt-vowels | 780 | 800 | 850 | 800 | 100 | 790 | 900 |
| yt-alphabet-02 | One special feature called out per letter as it is introduced | yt-alphabet | 760 | 600 | 800 | 800 | 150 | 780 | 880 |
| yt-handwriting-01 | Handwriting as a bonus unit after reading print | yt-handwriting | 450 | 800 | 800 | 850 | 100 | 740 | 860 |
| yt-vowels-06 | Vowel overview recap with a mute-and-say prompt | yt-vowels | 700 | 650 | 750 | 800 | 100 | 720 | - |
| yt-vowels-04 | Per-sound practice word lists with matching audio | yt-vowels | 780 | 650 | 700 | 700 | 200 | 700 | - |
| yt-alphabet-01 | Seven short lessons of three or four letters each, in alphabet order | yt-alphabet | 600 | 500 | 800 | 700 | 100 | 640 | - |
| yt-handwriting-03 | Notebook copying instruction: write each letter several times | yt-handwriting | 400 | 650 | 700 | 600 | 50 | 560 | - |
| yt-alphabet-06 | English-equivalent letter per Hebrew letter as the main sound anchor | yt-alphabet | 400 | 450 | 600 | 400 | 100 | 430 | - |
| yt-alphabet-05 | Geresh letters (gimel, zayin, tsadi with a mark) taught inside the main alphabet lessons | yt-alphabet | 250 | 650 | 500 | 400 | 150 | 420 | - |
| yt-vowels-05 | Shva shown as a separate short-e lesson | yt-vowels | 300 | 300 | 500 | 300 | 100 | 380 | - |

### Concept notes

**yt-alphabet**

- yt-alphabet-01 (640): Seven short lessons of three or four letters each, in alphabet order. The alphabet playlist is seven videos of about 1.5 to 5 minutes. Each lesson takes a few letters in the traditional order and states one notable behaviour of each, so a lesson ends before attention drops.
- yt-alphabet-02 (780): One special feature called out per letter as it is introduced. Each letter gets a plain-language flag: aleph and ayin carry no sound of their own, final he is not pronounced, bet/kaf/pe change with a dot, final forms exist. The learner meets the exception at the moment of meeting the letter. Note: The lesson also says a final he is simply not read. That is a beginner shortcut: it is wrong for mappiq-he and for several Torah words. ALEF should say 'usually silent' and link to the exceptions later.
- yt-alphabet-03 (850): Same glyph with and without a dot, sounds compared back to back. For bet, kaf and pe the instructor shows the dotted and undotted glyph and has the learner hear the two sounds in turn, then repeats the contrast on later letters so it becomes a pattern. Note: Israeli Hebrew merges several pairs (tav/tet, kaf/chet sounds), so the contrast must be tradition aware.
- yt-alphabet-04 (810): Verbal look-alike warnings (final nun versus vav, tav versus chet). When a new letter resembles an earlier one the instructor stops and asks the learner to look at the difference, naming the earlier letter. This is the only discrimination work in the playlist.
- yt-alphabet-05 (420): Geresh letters (gimel, zayin, tsadi with a mark) taught inside the main alphabet lessons. Loan-sound variants (j as in John, zh, ch) are given directly after the base letter. For a beginner this competes with the base letter just learned. Note: Useful for Israeli loanwords (jeans, chips) but not for siddur reading. Better as a separate later mini unit. The captions also tie the instructor's English-equivalent claims to American English, which I could not check.
- yt-alphabet-06 (430): English-equivalent letter per Hebrew letter as the main sound anchor. Each letter is paired with an English letter that sounds similar (a, b, g...). Quick, but it hides sounds with no English match (chet, resh, tsadi). Note: The lesson on resh says the sound differs from English; it gives a throat-versus-tongue explanation without a recording drill in the captions.

**yt-vowels**

- yt-vowels-01 (880): Vowel signs grouped by the sound they make (a, e, i, o, u families) with several signs per family. Instead of listing signs one at a time, the playlist makes five videos, one per vowel sound, and shows all the signs that give that sound, including vowel letters beside them. Learners see that many marks collapse to five sounds. Note: The video series lumps shva in as a short e. That is a simplification that is wrong in silent-shva positions, so ALEF keeps shva in its own unit.
- yt-vowels-02 (790): Recognise first, write later (explicit permission to not memorise how to draw the signs). The instructor says repeatedly that learners only need to recognise the signs, not write them, and promises that they will eventually read without the marks. It lowers early load and sets expectations.
- yt-vowels-03 (860): Vowel letters taught inside the vowel family (with or without the yud or vav). The e-family and o/u-family videos mention that a yud or vav after the letter gives the same sound, so the full spellings are shown as variants of one sound, not as new letters. Note: Concept confirmed from the o, e and u captions (the u caption set was unavailable, so u coverage is inferred from the overview).
- yt-vowels-04 (700): Per-sound practice word lists with matching audio. Each video points to downloadable extra material: lists of words for that vowel and an mp3 for listening and repeating. The files are separate downloads that I did not open.
- yt-vowels-05 (380): Shva shown as a separate short-e lesson. The short e video says two dots under a letter give a short e. A beginner-friendly rule that is wrong whenever the shva is silent, which is common in prayers. Note: Counterexample for ALEF: the shva rules module in src/pronunciation/shva.js is the right treatment; do not copy this simplification.
- yt-vowels-06 (720): Vowel overview recap with a mute-and-say prompt. A closing overview revisits every family, asks the learner to say the sound before hearing it, and ends with an instruction to practise with the extra files. A retrieval pass before the next section.

**yt-handwriting**

- yt-handwriting-01 (740): Handwriting as a bonus unit after reading print. Cursive is taught only after the print alphabet and vowels, as a bonus with a notebook-copying instruction rather than a test. It keeps the reading path uncluttered.
- yt-handwriting-02 (800): Cursive introduced as a curlier version of the printed letter, with start points and arrows. The instructor says a script letter is nearly the same as the print letter but curlier, shows the start point and the stroke arrow, and repeats it for each letter. The link to print is the teaching idea. Note: Part 4 auto-captions were unusable (garbled); parts 2, 3 and the overview captions were not retrieved because the video host rate-limited me. Part 1 and the claims above are from Part 1 only.
- yt-handwriting-03 (560): Notebook copying instruction: write each letter several times. The only practice instruction is to copy each letter a few times in a notebook. Cheap, offline, and what the printable workbook already supports.


## Improved ALEF specs (concepts scoring 850 or more)

### yt-vowels-01 Five-family vowel board that reads from niqqud.json (880 -> 965)

- Screen: Five-column board, one column per vowel sound (a e i o u). Each column stacks the signs in that family, drawn on a neutral carrier, with count badges (3 signs for a, 3 for e, and so on). A tradition switch re-sorts any sign whose value differs (for example qamats in some Ashkenazi readings).
- Data: vowelFamilies[] = {family: a|e|i|o|u, signs:[niqqudId...], variantByTradition:{israeli:[], sephardi:[], ashkenazi:[]}} generated from data/pronunciation/niqqud.json (single source), never hand copied.
- Interaction: Drag each sign into its family column (self checking), then hear one example syllable per sign. A speeded round shows a pointed letter and asks for the family. Wrong answers return to SRS tagged by sign.
- Test: Unit: every sign id from niqqud.json (except shva, dagesh and the dots) appears in exactly one family per tradition; family counts match the ipa values; drag test accepts only members; board renders in RTL without clipping.

### yt-vowels-03 Same-sound spelling variants inside the vowel board (860 -> 955)

- Screen: In each family column of the vowel board a second row shows the 'full spelling' variants (sign alone, sign plus yud, sign plus vav) on the same carrier, with one audio per row that is identical.
- Data: matresVariants[] = {family, forms:[{pointed, spelledFull}]} derived from niqqud.json and the word list; examples drawn from ALEF's own corpus.
- Interaction: Learner taps 'same sound?' to see both forms play identically; later the unpointed-text round asks which family a plain vav or yud stands for in a real word.
- Test: Unit: each variant pair has an identical audio id; corpus examples exist for every pair; unpointed reading round returns only answers consistent with the word's pointed form.

### yt-alphabet-03 Dot toggle tile with set-the-dot test (850 -> 960)

- Screen: Two-state letter tile: one big glyph with a draggable or tappable dot. Left half shows plosive (dotted), right half shows fricative (plain), each with its sound button and a mouth-position hint drawn by ALEF.
- Data: dageshPairs[] = {letterId, dotted: {sound, ipa}, plain: {sound, ipa}} for bet, kaf, pe; a tradition field so a pair can be dropped or re-labelled where a tradition has no audible contrast. Audio ids reuse letter and syllable manifest entries.
- Interaction: Toggle the dot; the sound plays and the tile morphs. Then a 6 item test plays a sound and the learner must set the dot correctly. Mistakes feed the SRS card for that letter pair.
- Test: Unit: exactly three pairs ship, each has audio ids that resolve in the manifest (or are flagged missing), and the test generator never produces an item whose answer is ambiguous under the selected tradition.


## Smaller improvements (below 850)

- yt-alphabet-04 Differing-stroke highlight pairs (810 -> 930): Side by side pair tile with the differing stroke highlighted in a contrasting colour, 3 second pulse, then both glyphs in a text sample.
- yt-handwriting-02 Print-to-cursive morph slider (800 -> 930): Morph slider on the tracing screen: drag between the print glyph and the cursive glyph; both shown with numbered stroke arrows at the same scale.
- yt-vowels-02 Read-first, write-optional unit tracks (790 -> 900): Unit header chip: 'Read this unit' versus 'Write this unit'. Reading mode hides tracing and focuses on recognition; writing mode unlocks tracing for the same signs.
- yt-alphabet-02 Letter behaviour badges tied to the data (780 -> 880): Letter card with a single highlighted badge row (silent carrier, dot changes sound, has final form, look-alike warning). Badge text is ALEF's own wording.
- yt-handwriting-01 Track-aware handwriting path (740 -> 860): Optional 'Handwriting' path that unlocks after the print alphabet, marked as bonus for the siddur track and as core for the Israel track.

## Not verified

Nothing here was measured with learners. Mouth-position claims and the vowel-family counts per tradition should be checked against `data/pronunciation/niqqud.json` and a native speaker before shipping. Captions for the i-signs, u-signs and handwriting parts 2 and 3 plus overview were not read, so concepts about those parts are inferred from the other videos in the same series. The instructor's remarks on gimel/zayin/tsadi with a mark and on ayin were taken from captions I could not check against the video.
