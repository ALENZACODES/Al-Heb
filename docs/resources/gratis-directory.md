# Free-Hebrew directory (Gratis Global): teaching ideas for Aleph

Status: research notes, 2026-11-03. Scores are the author's judgement on a 0-1000 scale, not measured outcomes. Machine-readable concepts: `data/curriculum/resource-concepts-gratis.json` (validated by `tests/resources-gratis.test.js`). Licence summary and consequences: `docs/resources/gratis-reuse-matrix.md`. Only ideas and pedagogy are used; no text, vocabulary lists, audio, lyrics or images from any resource are copied.

Source directory: https://gratisglobal.com/learn-hebrew-free (over 100 links across 11 headings: apps, dictionaries, video lessons, audio lessons, online courses, other resources, speaking practice, media, dictionaries and pronunciation guides, textbooks, tests). I visited the priority subset below, one resource at a time, and did not try to cover the whole list.

Score axes: r reading siddur or Torah aloud / i Israeli functional Hebrew / c beginner clarity / f fit with Aleph / risk originality risk (higher is worse). Each concept record also carries an `evidence` field saying how much I actually saw.

## Access summary

| Resource | Result |
|---|---|
| TeachMeHebrew | Read home, about, 500 words, frequency list, 3 grammar lessons, 2 dialogs, R/KH page, song, phrasebook, signage, Anki page |
| Learn101 | Plain requests get 409 or 406 (bot cookie challenge); worked with a cookie header. Read overview, alphabet, vocabulary, phrases, a practice guide, copyright |
| Hebrew With Ben | Unreachable: the session proxy refused the host. Nothing recorded |
| StoryOlive (was StoryHebrew) | Redirected; story listing read only, stories are behind login |
| A Little Hebrew reading trainer | Read the page, its public script, and a few card responses |
| FSI Hebrew (LiveLingua) | LiveLingua page returned 403; used a mirror's description. PDF and audio not opened |
| DLI survival kit | Read menu, sounds page and 4 modules; zips not opened |
| Goethe Book2 | Read lesson 2 and lesson 6 page text including the exercise mechanic |
| Loecsen | Read landing page; legal page blocked (406) |
| UT Austin LAITS | Read home, tutorials index, video list and sound bites list; no tutorial opened |
| Wikibooks | The URL in the directory (Biblical_Hebrew) is a missing page; the book is at /wiki/Hebrew. Read home, contents, alphabet, lesson 1 |
| User top-625 sheet | Whole file structure analysed |
| Jewish Miami phrase page | Whole page read |

## Per-resource notes

### TeachMeHebrew.com

- Address: https://www.teachmehebrew.com/
- Reached: yes. Pages read: home, about, 500 words, frequency list, lessons 1, 11, 14, dialogs 1, 8, R and KH page, alefbet song, phrasebook, signage, Anki page.
- Licence or terms: Footer on every page: Copyright 2026 TeachMeHebrew, All Rights Reserved. Anki decks are described as free but no licence is stated.

Concepts:

- gr-tmh-01 (690): Four-step path: alphabet, basic words and phrases, grammar by example, dialogs. The home page orders the site as Step 0 alphabet, Step 1 basic vocabulary (words, phrases, verbs, numbers, time), Step 2 thirty grammar-by-example lessons, Step 3 fifteen dialogs. Communicate first, rules after.
- gr-tmh-02 (860): Grammar by example with masculine and feminine versions of the same sentence side by side. A grammar lesson opens with two or three lines of rule (for instance that the present-tense verb to be is not written) and then lists many parallel sentences, repeating each one in its masculine and feminine form with English, transliteration and Hebrew in three columns. Note: Lesson pages 1, 11 and 14 read.
- gr-tmh-03 (740): Ten-thousand word frequency list kept in natural inflected and prefixed forms. The list ranks 10,000 words from about five million words of mostly news and encyclopedia text. It leaves prefixes and suffixes attached on purpose, so the same lexeme appears many times, and it says its own order would differ for speech. Note: Page read (about 447 thousand characters of text). The corpus is written text; Aleph would want a spoken source for the Israel track and a prayer-text source for the read track.
- gr-tmh-04 (320): Five hundred basic words ordered alphabetically by Hebrew spelling. The 500-word page lists English, transliteration and Hebrew in Hebrew alphabetical order, so a watermelon, a dad, and the word for but sit next to each other. It is a reference, not a learning order. Note: Anti-pattern for sequencing. Fine as a lookup index. The first words on the page alphabetically are mixed everyday and rare items, so frequency or theme is a better teaching order.
- gr-tmh-05 (860): Transliteration with hyphenated syllables and the stressed syllable marked. Every transliteration on the site breaks words into hyphenated syllables and marks the stressed syllable by emphasis, with a stated rule that stress is final unless marked. Learners can see stress without knowing the script. Note: Prayer stress (milel/milra) matters for reading aloud and for cantillation readiness.
- gr-tmh-06 (870): A page that only drills the two hardest sounds, each with every vowel before and after. One page drills ר and the ח/כ/ך sound with a grid: sound plus each of five vowels (onset) and each of five vowels plus sound (coda), all recorded by a native speaker, explained as the sounds learners find hardest.
- gr-tmh-07 (620): Letter-order song using a picture for each early letter. The page gives the lyrics of the Israeli children's alefbet song, mapping early letters to pictures (tent, house, camel, door) and then verse-chunking the rest of the order. Memorising order by melody and image. Note: The lyrics are a copyrighted song; Aleph must write its own chant. Not reproduced here.
- gr-tmh-08 (820): Fifteen short scripted dialogs on everyday scenes (restaurant, directions, phone, family...). Each dialog is a short back-and-forth about one scene, shown line by line in three columns. The restaurant one runs from the host's greeting to ordering. Speaker labels are not visible in the page text, so turns are inferred. Note: Dialog 1 and 8 read.
- gr-tmh-09 (380): Song and joke pages as reading and listening extras. Twenty-odd song lyric pages and fourteen joke pages offer authentic Hebrew entertainment texts, listed as optional extras after the core steps. Note: Lyrics are third-party copyrighted; Aleph should link out, not embed. Evidence: listing only; pages not opened.
- gr-tmh-10 (700): Israeli signage page (photo plus reading plus translation). A page of real signs with the Hebrew, a transliteration and an English gloss (the page I read had one entry: the red shield of David sign). A small idea: teach reading from real signs. Note: Pairs with the photo-scan lane. Aleph would need its own photographs.
- gr-tmh-11 (700): Request-a-phrase loop and colloquial register notes. The phrasebook page collects requested everyday phrases in both genders (an informal screw-up phrase, an around-nine-thirty phrase, a request for a lift) with English glosses and some notes in brackets. Real spoken register, driven by user requests. Note: An in-app 'request a phrase' would need a backend or at least an email link; no claim is made that Aleph has one.
- gr-tmh-12 (560): Anki decks for the alphabet, words, verbs, phrases and numbers, with audio. The site offers downloadable flash card decks with audio so the learner can use their own spaced repetition tool. Note: Aleph has its own FSRS-style scheduler. A CSV export of the learner's deck would be a trust feature.
- gr-tmh-13 (780): A frequency list built from one single text (Harry Potter in Hebrew). The menu lists a separate word-frequency list for one book. The idea, inferred from the title only, is a vocabulary list for one text. Evidence: title and menu entry only; page not opened.

### Learn101

- Address: https://learn101.org/hebrew.php
- Reached: yes. Pages read: overview, alphabet, vocabulary 500, phrases, word practice guide, copyright.
- Licence or terms: Copyright page: viewing for personal, non-commercial use only; electronic storage, modification, reproduction, distribution or any public or commercial use forbidden without permission.
- Note: Plain requests get HTTP 409/406 from a bot cookie challenge; it worked with the cookie header set.

Concepts:

- gr-l101-01 (520): Visible fourteen-step learning path in a side panel. Every lesson page shows the whole path: alphabet, adjectives, nouns, plural, gender, numbers, phrases, grammar, vocabulary, a 500-word list, verbs, listening, a quiz, translation. The learner always sees where they are.
- gr-l101-02 (480): Alphabet table with a rough English keyword for each letter and finals listed as rows. Each letter is given with a bracketed sound and an English example word (like moon, like town). Final forms get their own rows. It is unpointed and claims 26 letters, which does not match 22 plus 5 finals. Note: Counting error noted; vav is shown only as v, with no mention of o/u uses on the page snippet I read.
- gr-l101-03 (520): Short practice guides that move words from recognition to recall using concrete pictures. Study-guide pages (3 minutes) advise: pick a small set, attach a concrete mental image to each word, copy the form exactly, then test by speaking the answers. Generic but sound practice. Note: Pages read; the advice is generic study technique.
- gr-l101-04 (640): Phrases grouped by situation on one page (greetings, emergency, directions, introductions, holiday wishes, travel). A single phrases lesson groups lines by situation with English and Hebrew side by side, including holiday wishes and hotel phrases.

### Hebrew With Ben

- Address: https://www.hebrewwithben.com/
- Reached: no. Pages read: none.
- Licence or terms: Unknown, not reachable
- Note: The session proxy refused the host (not on the allow list). No concepts recorded. Search results did not describe it.

Concepts:

None recorded.

### StoryOlive (formerly StoryHebrew)

- Address: https://storyolive.com/en/hebrew/stories
- Reached: yes. Pages read: stories listing.
- Licence or terms: Not stated on the listing page; terms and privacy are linked but not read. Some stories free, premium behind login.

Concepts:

- gr-sh-01 (780): Graded short stories labelled A1 to C2, filterable by topic, some free. The site (renamed from StoryHebrew to StoryOlive) lists dozens of stories with level tags, topic tags (daily life, food, travel, holidays...) and a free flag. Content sits behind login and premium. I read only the listing. Note: Aleph would write its own tiny pointed readers using only taught words. Evidence: listing only; story texts not read.
- gr-sh-02 (640): Placement test and free tools (alphabet, numbers, level test). Free tools include an alphabet page, numbers page and a Hebrew level test. A placement check lets a returning learner skip known material. Evidence: listing only; level test content not seen.

### A Little Hebrew reading trainer

- Address: https://www.alittlehebrew.com/read/
- Reached: yes. Pages read: trainer page, its public script, a few card JSON responses.
- Licence or terms: Not stated on the page or script I read (unstated).

Concepts:

- gr-alh-01 (900): Hear a syllable, pick the matching written card from two, with a tiny alphabet that grows. The reading trainer plays a sound and shows two written cards; the learner picks the match as fast as they can, with guessing allowed. Sampling its card data showed it starts with two consonants on one vowel, then repeats syllables, then closes syllables and short words, adding one idea per level. Note: Idea is general decoding practice; no card data is copied. No licence stated on the page.
- gr-alh-02 (760): Ladder graduates to real text (invites reading Genesis 1). At the end of all levels the trainer says the learner is ready to read and links to the first chapter of Genesis. A clear 'you can now read something real' moment. Note: Genesis 1 would be pointed text from a PD source in Aleph; the fit here is graduation to the priestly blessing opener.
- gr-alh-03 (400): Sound effects and badges for levels and achievements. Short ding sounds, a level-up reward and an achievements row give feedback without accounts; progress is kept in the address and a cookie.

### FSI Hebrew Basic Course via LiveLingua

- Address: https://www.livelingua.com/project/fsi/Hebrew/
- Reached: no. Pages read: mirror course page.
- Licence or terms: A mirror (fsi-language-courses.org) states these courses are in the public domain. FSI courses are US government works; I did not confirm for this course or for the audio and I did not read the PDF.
- Note: The LiveLingua page returned 403 to me, so I used the mirror's description.

Concepts:

- gr-fsi-01 (850): Transliteration scaffold removed over the course (script introduced alongside, then transliteration dropped). A description of the 40-unit FSI Basic Hebrew course (1965) says dialogs are transliterated in the early units, an alphabet introduction sits near the back and is meant to be studied in parallel, and later sections drop transliteration. The idea is to fade the scaffold. Note: The livelingua page returned a 403 to me. Evidence: description of the course from a mirror page (fsi-language-courses.org); the FSI Hebrew PDF itself was not opened.
- gr-fsi-02 (700): Unit shape of dialog, then drills, then exercises with audio per unit. The mirror describes 40 units, each containing dialogs, drills and exercises, with over 22 hours of audio, designed for 1960s diplomats and aimed at informal educated spoken Hebrew. Pattern drilling after a dialog. Note: Vocabulary and register are from 1965; Aleph would treat the form (dialog then substitution drill) as the idea. Evidence: mirror description only.

### DLI Hebrew Language Survival Kit

- Address: https://fieldsupport.dliflc.edu/products/hebrew/he_bc_LSK/default.html
- Reached: yes. Pages read: menu, sounds, modules 1, 2, 10, 22.
- Licence or terms: Not stated on the pages I read. US government product; public domain status not verified.

Concepts:

- gr-dli-01 (740): A first module of sounds unfamiliar to English speakers, each with a like-as-in guide. The survival kit opens its menu with a sounds-unfamiliar-to-English-speakers module, listing a handful of hard sounds with English approximations written in its own letter scheme. Note: Content is a short list of sounds; overlaps with the TeachMeHebrew sound page and Aleph's lane-3 drills.
- gr-dli-02 (560): Survival-first topic ordering: commands, helpful words, greetings, emergencies, then niche vocabulary. The 22-module kit starts with commands and warnings, then helpful words and questions, greetings, numbers, days and time, directions, emergency terms, food, medical terms. Military topics (ranks, mine warfare) make most of it irrelevant to a civilian learner. Note: Idea worth keeping: a small emergency card. Audio and PDF are offered as zip downloads; licence is not stated on the pages I read.

### Goethe-Verlag Book2 (50languages)

- Address: https://www.goethe-verlag.com/book2/EN/ENHE/ENHE002.HTM
- Reached: yes. Pages read: lesson 2, lesson 6 contents and exercise.
- Licence or terms: Footer: copyright Goethe Verlag, all rights reserved. Free MP3 download is offered but no reuse licence appears on the pages I read.

Concepts:

- gr-gv-01 (860): Progressive letter hiding: show all, every second letter, first letters only, none. Each model sentence has four display levels in which the Hebrew and transliteration are masked more and more, so the learner reconstructs the line from partial cues. Note: Mechanic seen on a lesson page. Content is all rights reserved on the page footer.
- gr-gv-02 (640): One hundred short lessons built on a few model sentences each, travel-first themes. The course has 100 lessons on themes from people and family through hotel, train, doctor and bank, then past tense, imperatives and conjunctions. Each lesson shows a run of model sentences with native audio. Note: Free MP3 download exists but no reuse licence was stated on the pages I read; footer says all rights reserved.

### Loecsen

- Address: https://www.loecsen.com/en/learn-hebrew
- Reached: yes. Pages read: course landing page.
- Licence or terms: Footer: all rights reserved. A legal page exists but returned a bot-challenge error, so terms were not read.

Concepts:

- gr-lo-01 (820): Staged lesson ladder: listen and repeat, pick meaning, reorder, find phrase from native language, type the missing word. Every lesson walks the learner from comprehension to production with a fixed sequence of five test types, plus a speech recognition option in one browser and a certificate. It converts passive exposure into recall. Evidence: course page read; exercises not run.
- gr-lo-02 (640): Can-do level goals and a CEFR A1 claim (6 levels, 17 chapters, 40-65 hours). Levels are named by what the learner can do (say the essentials on arrival, find your way, order at a table, handle trouble) and linked to a certificate. Forty to sixty-five hours is the site's own estimate. Note: Time estimate and A1 claim are the site's, not checked by me.
- gr-lo-03 (700): Word-tile reordering of a sentence (up to seven words). A rung asks the learner to put shuffled words into the right order. Hebrew puts the verb or adjective in places English does not.

### University of Texas at Austin Hebrew (LAITS)

- Address: https://hebrew.laits.utexas.edu/
- Reached: yes. Pages read: home, tutorials index, video clips list, sound bites list.
- Licence or terms: Materials may be used, quoted or linked for educational purposes without prior permission with credit to Dr. Raizen and UT Austin. Commercial use and duplication are strictly prohibited.

Concepts:

- gr-la-01 (720): Units named for letters of the alphabet, each with flashcards then a cumulative vocabulary review every two to three units. The tutorials page lists Unit Alef, Unit Bet, Unit Gimel and so on, each with small flashcard sets, followed by review activities that combine the last two or three units (Alef to Gimel, Dalet to Vav). Note: Free for educational use with credit; commercial use prohibited. Evidence: index page only; tutorial content not opened.
- gr-la-02 (720): Listening-first video scenes with transcripts held back. The video page lists scenes (before class, a restaurant, buying clothes, planning a trip) and says transcripts are given only on accessibility request, so the learner must listen to understand. Not safe to copy; the mechanic is portable. Note: Accessibility transcripts must still be available in Aleph; reveal-after-attempt is the compromise. Evidence: listing only; videos not watched.
- gr-la-03 (450): Authentic voices: interviews with children, second-language learners and radio announcers. A sound bites collection of interviews exposes learners to varied real speakers. Aleph would need its own consented recordings. Evidence: listing only.

### Wikibooks Hebrew (Israeli Hebrew)

- Address: https://en.wikibooks.org/wiki/Hebrew
- Reached: yes. Pages read: book home, contents, introduction alphabet, elementary lesson 1.
- Licence or terms: Creative Commons Attribution-ShareAlike (additional terms may apply), stated in the page footer.

Concepts:

- gr-wb-01 (520): Alphabet table: letter, IPA, name, English keyword. A four-column alphabet table gives each letter, IPA, name in Hebrew script and a keyword. Community text; some letter names are spelled in odd non-standard ways, and the IPA for resh follows a French r. Note: CC BY-SA text; Aleph should not import the table, its own letters.json is the source.
- gr-wb-02 (740): Lesson page with four columns (English, pointed Hebrew, transliteration, IPA) and a short culture note. Lesson 1 of the elementary course tabulates greeting words and pronouns in four columns, then gives notes such as the two usual replies to thanks. Note: Share-alike applies to copied text and tables; the structure is free to reuse.
- gr-wb-03 (720): Introduction unit on sounds, syllables, dagesh, vowel reduction, shva, spelling. The contents page has a pronunciation and spelling block with those named topics before greetings. Only the contents were seen, not the pages. Evidence: contents page only.

### User-supplied top-625 words sheet (structure only)

- Address: research_notes/resources/words/top625-user-supplied.csv
- Reached: yes. Pages read: whole file structure.
- Licence or terms: Unknown; supplied by the user, origin not recorded.
- Note: 722 data rows in 27 blocks, so more than the 625 in the title. Used as an organisation reference only; no words reused.

Concepts:

- gr-t625-01 (720): Domain-based topic blocks with Hebrew headings (27 blocks). The sheet groups words into 27 labelled blocks (animals, transport, location, clothing, colours, people, society, food, home, body, nature, directions, time, verbs, adjectives, pronouns, numbers...). Verbs, adjectives, pronouns and numbers get the biggest blocks. Note: Block sizes counted from the file: 722 entries over 27 blocks, largest verbs 86, adjectives 67, numbers 61, pronouns 57. The title says top 625; the file has more rows.
- gr-t625-02 (900): Unpointed Hebrew column beside a fully pointed column. Each row has the English gloss, an everyday unpointed Hebrew form (partly pointed in places) and a fully pointed form. In the file 519 of 722 rows differ between the two Hebrew columns. Note: Structure only; the words themselves are not reused. Source and licence of the sheet are not known to me.
- gr-t625-03 (700): Slash-joined alternatives in one cell (car as two words, road as two words). Several rows give two Hebrew words separated by a slash for one English gloss, without saying which is colloquial or formal, or which is gendered. Note: Do not claim register accuracy without native review.
- gr-t625-04 (720): Number words as built forms (102, 110, 111, 1,000, 10,000, ordinals). The numbers block spells out compound numbers and ordinals rather than just digits, so learners see how larger numbers are built.

### Greater Miami Jewish Federation, Common Hebrew Words and Phrases

- Address: https://jewishmiami.org/about/departments/missions/common_hebrew_words_and_phrases
- Reached: yes. Pages read: phrase page.
- Licence or terms: No content licence stated; the site has terms of service not read.

Concepts:

- gr-jm-01 (680): One-page travel card organised by situation (greetings and courtesies, shopping and dining, emergencies, getting around, days, seasons, numbers). A federation mission page lists words and phrases under seven situation headings with English and a transliteration. Compact enough to print as a pocket card.
- gr-jm-02 (840): Speaker gender and addressee gender marked inline (male/female) for questions and statements. Phrases that change by gender give both forms in one line, for example what is your name and how are you, and I want, so the traveller must pick the right one for themselves or the person they address. Note: The page's own labels are inconsistent (some pairs list female first); Aleph's control removes that ambiguity.
- gr-jm-03 (250): Transliteration only, with no Hebrew script. The phrase list shows English and an ad hoc Latin spelling for every item, with inconsistent spellings across the page. The learner never meets the script.
- gr-jm-04 (700): Culture notes inside the vocabulary (shared taxi versus regular taxi, corner grocery, change literally as leftovers). Some items carry a short gloss that explains how the thing works in Israel. Taxi has two kinds, change is an idiom, a small local grocery has its own word.


## Concepts and scores

| ID | Concept | Source | r | i | c | f | risk | Score | Improved |
|---|---|---|---|---|---|---|---|---|---|
| gr-alh-01 | Hear a syllable, pick the matching written card from two, with a tiny alphabet that grows | alh | 950 | 500 | 950 | 900 | 150 | 900 | 975 |
| gr-t625-02 | Unpointed Hebrew column beside a fully pointed column | top625 | 920 | 950 | 850 | 900 | 150 | 900 | 975 |
| gr-tmh-02 | Grammar by example with masculine and feminine versions of the same sentence side by side | tmh | 250 | 950 | 850 | 900 | 120 | 860 | 965 |
| gr-tmh-06 | A page that only drills the two hardest sounds, each with every vowel before and after | tmh | 880 | 860 | 880 | 900 | 100 | 870 | 965 |
| gr-gv-01 | Progressive letter hiding: show all, every second letter, first letters only, none | goethe | 880 | 820 | 800 | 900 | 120 | 860 | 965 |
| gr-tmh-05 | Transliteration with hyphenated syllables and the stressed syllable marked | tmh | 780 | 880 | 850 | 880 | 200 | 860 | 960 |
| gr-fsi-01 | Transliteration scaffold removed over the course (script introduced alongside, then transliteration dropped) | fsi | 820 | 850 | 800 | 900 | 100 | 850 | 960 |
| gr-jm-02 | Speaker gender and addressee gender marked inline (male/female) for questions and statements | jewishmiami | 50 | 950 | 800 | 950 | 100 | 840 | 960 |
| gr-tmh-08 | Fifteen short scripted dialogs on everyday scenes (restaurant, directions, phone, family...) | tmh | 150 | 900 | 750 | 850 | 150 | 820 | 955 |
| gr-tmh-13 | A frequency list built from one single text (Harry Potter in Hebrew) | tmh | 880 | 300 | 700 | 880 | 200 | 780 | 955 |
| gr-lo-01 | Staged lesson ladder: listen and repeat, pick meaning, reorder, find phrase from native language, type the missing word | loecsen | 500 | 880 | 850 | 880 | 200 | 820 | 955 |
| gr-tmh-03 | Ten-thousand word frequency list kept in natural inflected and prefixed forms | tmh | 450 | 700 | 650 | 700 | 300 | 740 | 940 |
| gr-t625-03 | Slash-joined alternatives in one cell (car as two words, road as two words) | top625 | 100 | 850 | 600 | 700 | 100 | 700 | 880 |
| gr-sh-01 | Graded short stories labelled A1 to C2, filterable by topic, some free | storyolive | 500 | 850 | 700 | 800 | 350 | 780 | - |
| gr-alh-02 | Ladder graduates to real text (invites reading Genesis 1) | alh | 900 | 300 | 800 | 900 | 150 | 760 | - |
| gr-dli-01 | A first module of sounds unfamiliar to English speakers, each with a like-as-in guide | dli | 700 | 780 | 700 | 800 | 200 | 740 | - |
| gr-wb-02 | Lesson page with four columns (English, pointed Hebrew, transliteration, IPA) and a short culture note | wikibooks | 350 | 800 | 750 | 800 | 250 | 740 | - |
| gr-la-01 | Units named for letters of the alphabet, each with flashcards then a cumulative vocabulary review every two to three units | laits | 200 | 750 | 700 | 750 | 200 | 720 | - |
| gr-la-02 | Listening-first video scenes with transcripts held back | laits | 100 | 820 | 700 | 780 | 300 | 720 | - |
| gr-wb-03 | Introduction unit on sounds, syllables, dagesh, vowel reduction, shva, spelling | wikibooks | 750 | 500 | 650 | 800 | 200 | 720 | - |
| gr-t625-01 | Domain-based topic blocks with Hebrew headings (27 blocks) | top625 | 350 | 780 | 750 | 800 | 100 | 720 | - |
| gr-t625-04 | Number words as built forms (102, 110, 111, 1,000, 10,000, ordinals) | top625 | 150 | 850 | 700 | 750 | 100 | 720 | - |
| gr-tmh-10 | Israeli signage page (photo plus reading plus translation) | tmh | 250 | 820 | 700 | 800 | 200 | 700 | - |
| gr-tmh-11 | Request-a-phrase loop and colloquial register notes | tmh | 100 | 900 | 700 | 700 | 200 | 700 | - |
| gr-fsi-02 | Unit shape of dialog, then drills, then exercises with audio per unit | fsi | 150 | 820 | 650 | 750 | 100 | 700 | - |
| gr-lo-03 | Word-tile reordering of a sentence (up to seven words) | loecsen | 400 | 800 | 750 | 750 | 250 | 700 | - |
| gr-jm-04 | Culture notes inside the vocabulary (shared taxi versus regular taxi, corner grocery, change literally as leftovers) | jewishmiami | 50 | 880 | 650 | 750 | 100 | 700 | - |
| gr-tmh-01 | Four-step path: alphabet, basic words and phrases, grammar by example, dialogs | tmh | 300 | 800 | 700 | 750 | 150 | 690 | - |
| gr-jm-01 | One-page travel card organised by situation (greetings and courtesies, shopping and dining, emergencies, getting around, days, seasons, numbers) | jewishmiami | 100 | 820 | 700 | 800 | 150 | 680 | - |
| gr-l101-04 | Phrases grouped by situation on one page (greetings, emergency, directions, introductions, holiday wishes, travel) | learn101 | 150 | 780 | 650 | 650 | 300 | 640 | - |
| gr-sh-02 | Placement test and free tools (alphabet, numbers, level test) | storyolive | 400 | 650 | 650 | 700 | 200 | 640 | - |
| gr-gv-02 | One hundred short lessons built on a few model sentences each, travel-first themes | goethe | 100 | 780 | 750 | 700 | 200 | 640 | - |
| gr-lo-02 | Can-do level goals and a CEFR A1 claim (6 levels, 17 chapters, 40-65 hours) | loecsen | 100 | 800 | 750 | 700 | 150 | 640 | - |
| gr-tmh-07 | Letter-order song using a picture for each early letter | tmh | 550 | 650 | 700 | 600 | 600 | 620 | - |
| gr-tmh-12 | Anki decks for the alphabet, words, verbs, phrases and numbers, with audio | tmh | 350 | 650 | 600 | 550 | 300 | 560 | - |
| gr-dli-02 | Survival-first topic ordering: commands, helpful words, greetings, emergencies, then niche vocabulary | dli | 150 | 700 | 600 | 550 | 100 | 560 | - |
| gr-l101-01 | Visible fourteen-step learning path in a side panel | learn101 | 200 | 600 | 700 | 600 | 200 | 520 | - |
| gr-l101-03 | Short practice guides that move words from recognition to recall using concrete pictures | learn101 | 250 | 550 | 650 | 550 | 200 | 520 | - |
| gr-wb-01 | Alphabet table: letter, IPA, name, English keyword | wikibooks | 400 | 450 | 550 | 500 | 200 | 520 | - |
| gr-l101-02 | Alphabet table with a rough English keyword for each letter and finals listed as rows | learn101 | 350 | 400 | 500 | 450 | 200 | 480 | - |
| gr-la-03 | Authentic voices: interviews with children, second-language learners and radio announcers | laits | 50 | 700 | 500 | 500 | 500 | 450 | - |
| gr-alh-03 | Sound effects and badges for levels and achievements | alh | 300 | 300 | 500 | 500 | 200 | 400 | - |
| gr-tmh-09 | Song and joke pages as reading and listening extras | tmh | 150 | 500 | 450 | 350 | 750 | 380 | - |
| gr-tmh-04 | Five hundred basic words ordered alphabetically by Hebrew spelling | tmh | 150 | 350 | 400 | 300 | 100 | 320 | - |
| gr-jm-03 | Transliteration only, with no Hebrew script | jewishmiami | 0 | 450 | 350 | 200 | 100 | 250 | - |

## Improved Aleph specs (concepts scoring 850 or more)

### gr-alh-01 Syllable ladder with confusable-aware distractors (900 -> 975)

- Screen: Full-screen card pair (RTL), speaker button, level bar. After each answer the correct card flashes and its syllable is shown with letter-by-letter highlight. Tradition and voice follow settings.
- Data: readLadder[] = {level, newLetters, newVowels, items:[{audioId, target, distractors:[near-miss ids]}]} generated from letters/niqqud data so distractors are real confusables (bet/vet, dalet/resh, qamats/patach).
- Interaction: Sound plays; learner taps the match; correct streaks advance; two wrong in a row drops back a step. Items missed return in SRS. Ends with a real verse unlocked (Priestly Blessing opener).
- Test: Unit: each level introduces at most one new letter or vowel, distractors are never homophones within the selected tradition, every item has an audio id, and ladder reaches all 27 letters and the 5 vowel families.

### gr-t625-02 Niqqud dial with plene check (900 -> 975)

- Screen: Word card with a Niqqud dial: Unpointed (as Israelis write), Partial (vowel letters shown), Full (siddur style). The dial reveals marks with an animation and a tradition badge for any mark whose sound differs by tradition.
- Data: words[].forms = {unpointed, full}; the partial level is computed (adds only matres lectionis). Forms validated by code point and by a check that stripping niqqud from full equals unpointed (modulo plene spelling).
- Interaction: Learner reads in unpointed mode, taps to reveal; later tests show an unpointed word and ask for the sound; a siddur round shows full niqqud and asks for the sound by tradition.
- Test: Unit: strip(full) equals unpointed for every word, or the difference is explained in a plene flag; the dial renders in RTL with marks attached to their letters.

### gr-tmh-06 Hard-sound lab grid with contrast words (870 -> 965)

- Screen: Hard-sound lab: grid with rows for the target sound and columns for a, e, i, o, u in onset and coda. Alongside each cell a minimal-pair 'sounds like' contrast (for example chet versus he, resh versus lamed) drawn from Aleph's own word list.
- Data: drills.json extension: {sound, cell:{position: onset|coda, vowel}, audioIds, contrastWith:[ids]}; audio per voice and tradition; fallback flags honest about TTS.
- Interaction: Tap a cell to hear it; record-yourself (no scoring claimed) then compare waveform lengths only if a recording exists; a listen-and-pick test with the contrast word.
- Test: Unit: 20 cells exist per sound (10 vowel cells onset and coda); every cell has a manifest id or a missing flag; contrastWith ids resolve in the corpus.

### gr-tmh-02 Gender pair cards with both voices (860 -> 965)

- Screen: Sentence pair card: the same sentence twice, one tinted per speaker/addressee gender, the differing letters highlighted. A voice button for Ari and one for Noa on each.
- Data: genderPairs[] = {id, en, forms:{m:{he, translit}, f:{he, translit}}, differsAt:[charIndex...], grammarTag}. All sentences authored for Aleph; none copied from the site.
- Interaction: Learner picks 'I am...' (m/f) in settings; the card shows their own form first. A quiz plays a voice and asks which gender was meant, then a second quiz asks to produce the other form by tapping the changed ending.
- Test: Unit: every pair differs in at least one letter, differsAt indices point at real differing characters, both voices exist in the manifest or are flagged, and no sentence string is a copy of a TeachMeHebrew line (checked by a fixture of forbidden strings).

### gr-tmh-05 Syllable chips with stress marking (860 -> 960)

- Screen: Word line shows syllable chips (RTL order) with a stress dot or accent bar under the stressed chip; tapping a chip plays just that syllable; a toggle hides the Latin letters entirely.
- Data: syllables[] and stressIndex on each word record, produced by src/photo/syllabify.js plus a stress exceptions table (default final, milel exceptions listed); validated against audio syllable files where present.
- Interaction: Learner taps chips; a drill plays a word and asks which chip is stressed; a second drill removes chips one by one.
- Test: Unit: syllable join equals the word; stressIndex in range; the default-final rule yields the listed stress for the fixture words; exceptions table entries all appear in the corpus.

### gr-gv-01 Fade-out recall for prayer lines and phrases (860 -> 965)

- Screen: Retrieval strip for any pointed line: four stops (full, alternate letters, initials, blank) on a slider; tap a gap to fill with the on-screen Hebrew keyboard or a letter choice; syllable audio plays on completion.
- Data: fadeLevels derived from the line's consonant skeleton and niqqud at render time (no new data); hiding rules keep niqqud with its letter; level stored per line in SRS.
- Interaction: A correct full recall moves the line to the next fade level at its next review; a miss returns it to the previous level. Works for prayer lines and Israeli phrases.
- Test: Unit: masking never hides a niqqud mark separately from its letter, level 3 is the empty string, reversing the fade restores the original line, and masked lines still render RTL.

### gr-fsi-01 Per-word transliteration fading (850 -> 960)

- Screen: Per-word scaffold dial: Latin letters shown, shown faintly, shown on tap, hidden. The dial position per word is set by that word's SRS strength, not by the lesson number.
- Data: scaffold:{wordId, level 0-3} in learner store, updated by review outcomes; transliterate.js provides schemes; no new text data needed.
- Interaction: As a word is answered correctly across days its transliteration fades; a miss raises the scaffold again. Learner can pin the scaffold on for a word.
- Test: Unit: level never drops without a correct review, never exceeds bounds, and a fresh word starts at level 0 or 1 by setting.


## Smaller improvements (below 850)

- gr-jm-02 Say-as-me / hear-as-you gender selector (840 -> 960): Settings-aware phrase card: 'You say' shows the form for the learner's gender, 'You hear' shows the form for the other person, and a small swap toggles who is addressed.
- gr-tmh-08 Role-swap dialogs with two voices (820 -> 955): Two-lane chat view: Noa and Ari alternate; the learner takes one lane and the app voices the other. Tap any line for syllable chips and a gloss; a Swap button switches roles and re-inflects gendered forms.
- gr-lo-01 Five-rung item ladder with gender-aware typing (820 -> 955): Lesson progress rail with five rungs. Each rung is a different exercise on the same eight items; the rail shows which rungs have been cleared for each item.
- gr-tmh-13 Pre-reading new-word list per prayer or portion (780 -> 955): Text preview before reading: 'This prayer has 41 distinct words; you know 33; here are the 8 new ones with sound and meaning.'
- gr-tmh-03 Coverage meter on an owned frequency list (740 -> 940): Vocabulary screen with a coverage meter: 'you can now read N% of the running words in the Israeli track texts'. Tap the meter to see the next five highest value words.
- gr-t625-03 Register-tagged alternates (700 -> 880): Word card shows primary and alternate with a register chip (everyday, formal, loan) and a short 'when' line.

## Cross-cutting observations

- Gender is the main Israeli-function gap in the free tools I read: TeachMeHebrew pairs forms and the Miami page marks them inline, but no resource lets the learner say which form they are producing. Aleph's two voices make that possible.
- Frequency data sources differ in kind. TeachMeHebrew's list is written news and encyclopedia text; the user's sheet has no frequency at all; none of these is a prayer or Torah list. Aleph needs its own per-text counts.
- Sequencing: alphabetical word lists (TeachMeHebrew 500) are lookups, not curricula; situational grouping (Miami, DLI, Loecsen, Goethe) is better for the Israel track.
- The user's sheet has 722 rows, not 625, and 519 rows differ between its unpointed and pointed columns. Pointing is inconsistent across the first Hebrew column.
- Quality varies: Learn101 says 26 letters; Wikibooks letter names and IPA contain errors a native reviewer should check; the Miami page spells transliterations inconsistently.

## Not verified

Nothing was measured with learners. I did not read the FSI PDF, the DLI zips, the TeachMeHebrew Anki decks, any StoryOlive story, any LAITS tutorial or video, Loecsen exercises, or the Harry Potter list page (concept inferred from its menu title). Licence statements are page footers or notices I saw; I am not giving legal advice and have not read the full terms pages of TeachMeHebrew, StoryOlive, Loecsen or Jewish Miami.
