# ALEF: 100 jobs for an external drafting assistant, in 6 lanes that cannot collide with the build agents

## Ground rules (paste at the top of every drafting chat)

You are a production lane for ALEF, a free Hebrew-learning app and book for adults (intro to intermediate; goal: read prayers and Torah aloud with a congregation, and get around in Israel). Work alone; never wait for me. Rules:

1. Everything you make is a DRAFT for human review. Never claim it was checked by a native speaker, rabbi or teacher.
2. Never invent Hebrew facts. When unsure of pointing (niqqud), spelling, or a word, mark it `?? CHECK`. Use only common, ordinary words. No divine names in examples.
3. Pronunciation has three traditions: Israeli, Sephardi, Ashkenazi. State which one every sound note is for.
4. Original work only: no copyrighted characters, brands, logos, song lyrics, or text copied from books or sites. Say where any fact came from.
5. Output in plain files I can paste: CSV, JSON or Markdown, one deliverable per reply, with a header row and stable ids. No commentary inside data files.
6. Do not put any author, tool or company name in the content or file names. File names: `lane<N>-<item#>-<short-name>.<ext>`.
7. Finish a deliverable fully before the next. At the end of each reply print `DONE <item#>` and the next item number.

Why these lanes are safe: they only produce files that land in `docs/drafts/inbox/lane<N>/`. The build agents never read that folder until John moves a file out of it, so nothing here can overwrite or race the agents' work.

Time estimate: each lane is roughly 6 to 8 hours of drafting work including your paste time. That is a planning guess, not measured.

---

## Lane 1: Pictures (17 jobs) - needs image generation

Exact prompts for jobs 1 to 17 are in `docs/drafts/IMAGE-PROMPTS.md`: shared rules, a negative-prompt list, 27 one-object letter prompts (file `lane1-<n>-<letterId>.png`), 5 look-alike pair prompts, 8 scene prompts and a 5-line acceptance check. Use those prompts instead of the short job lines below; the job lines stay as the index (still 17 jobs, 100 in all).

Command: "You are the ALEF illustrator. Make flat, friendly, simple pictures on a plain light background, no text, no letters, no people's faces in detail, no characters from any film, game or brand. Each picture must show ONE object. Return PNG, 1024x1024, then a 512 and a 128 version if you can."

1. Alef: a person standing on their hands (stick-figure style, neutral clothes)
2. Bet: a house, side view, open door, ball inside
3. Gimel: a grumpy camel
4. Dalet: a diving board over a pool
5. He and Vav: a hut with someone calling "hey" / a hanging vine
6. Zayin: a zipper being pulled (clothing-neutral)
7. Chet and Tet: a gate; a teapot
8. Yod and Kaf: a yo-yo; a magnet
9. Lamed and Mem: a lamp; a tent
10. Nun and Samekh: a sleeping cat on a pillow; a round cushion
11. Ayin and Pe: an eye; an open mouth with a "pop"
12. Tsadi and Qof: a pizza slice; a kite
13. Resh and Shin: a round ball rolling; a birthday cake with three candles
14. Tav: a table with a plate
15. Five final forms (kaf, mem, nun, pe, tsadi): same objects drawn long or "dropped" so a learner sees the tail going down
16. Look-alike pairs: draw bet/kaf, dalet/resh, vav/zayin, chet/he and tsadi/ayin side by side with a different colour block for each (no text)
17. Eight lesson scenes: bakery, bus stop, market, classroom, synagogue entrance (generic), kitchen, airport desk, cafe; no signs, no readable text

## Lane 2: Hebrew text drafting (17 jobs)

Command: "You are an ALEF content drafter. Write only simple Hebrew a beginner needs. Give every Hebrew line with full pointing, a transliteration for the Sephardi/Israeli reading, the Ashkenazi reading if it differs, and an English gloss. Flag `?? CHECK` for anything you are not certain of."

18. 200 greetings and polite phrases for Israel (CSV: he, translit, gloss, tradition note)
19. 100 phrases for a bakery, market and cafe
20. 60 phrases for taxis, buses and asking directions
21. 50 numbers and prices dialogues
22. 40 short family and friends conversations
23. 30 Shabbat table phrases and blessings' English meanings only (no liturgical Hebrew rewriting)
24. 30 prayer-reading word lists: words that recur in a siddur, with where a learner first meets them
25. 100 present-tense verbs in three persons with gloss
26. 50 question words and short questions
27. 60 colours, foods and household words with picture-friendly glosses
28. 40 minimal pairs that train a learner to hear differences (bet/vet, chet/kaf, tav/tet, alef/ayin)
29. 40 short reading passages (3 to 5 lines) at three levels, fully pointed
30. 30 sentences that contrast Israeli, Sephardi and Ashkenazi pronunciations of the same word
31. 25 common signs and labels in Israel (as words to recognise)
32. 20 text-message style short chats
33. 30 idioms (literal English, real meaning, `?? CHECK`)
34. 50 beginner dialogue lines for speaking practice with a partner

## Lane 3: Audio and speaking scripts (17 jobs)

Command: "You are the ALEF recording director. Write scripts for human voice actors. You do not generate audio. Be exact about what is said and how fast."

35. Recording brief for an Israeli female voice: pace, tone, mouth position notes
36. Same brief for an Israeli male voice
37. Same brief for a Sephardi voice
38. Same brief for an Ashkenazi voice
39. A 3-minute warm-up script for voice actors (vowels, throat sounds like chet and ayin)
40. Slate and file-naming guide for 25,000 clips (CSV example rows)
41. Checklist to QA a clip in 20 seconds
42. 27 "letter name and sound" read scripts, with the hook word to say after each
43. 100 word-list read scripts grouped in batches of 25
44. 50 sentence read scripts at slow and normal speed
45. 20 dialogue read scripts for two voices
46. Prayer-reading practice scripts (slow, in chunks of one phrase), for syllable-by-syllable listening
47. A "shadowing" guide: how a learner repeats after the audio
48. 30 speaking prompts: "say this about yourself in Hebrew"
49. A pronunciation self-check rubric a learner can fill after recording themselves
50. Plain-English explainer of the three traditions for voice actors
51. A contract-free "pronunciation notes for reviewers" sheet to give a native listener

## Lane 4: Book and workbook content (17 jobs)

Command: "You are the ALEF author. Write for adults who feel nervous. Short paragraphs, one idea each, a tiny win at the end of every page. No jargon. Number every exercise and give the answer key separately."

52. Chapter 1 draft: "Your first six letters"
53. Chapter 2 draft: "Sounds that are not in English"
54. Chapter 3 draft: "Vowels you can see"
55. Chapter 4 draft: "Reading your first word aloud"
56. Chapter 5 draft: "Reading a prayer line with a congregation"
57. 60 worksheet pages of letter tracing instructions (text only)
58. 40 matching and sorting exercises with an answer key
59. 40 fill-in-the-blank reading exercises with an answer key
60. 30 "listen and circle" exercises (the script for the audio is in Lane 3)
61. 12 weekly review quizzes, 20 questions each, answer key
62. A one-page cheat sheet for each of the three traditions
63. A glossary of 150 terms the book uses, plain English
64. A "mistakes everyone makes" page for each of 10 lessons
65. A 30-day study plan, 10 minutes a day
66. A 12-week plan for a group or class
67. A teacher guide for running a 45-minute lesson
68. Parent and grandparent guide: learning alongside a child

## Lane 5: Review, QA and adversarial testing (16 jobs)

Command: "You are the ALEF reviewer. Be hostile and specific. Quote the exact text you are criticising. Rank issues by how much they would confuse a first-time learner. Do not praise."

69. Review the 27 letter picture ideas: which pairs would be confused with each other?
70. Review the 27 hook words: any word said differently by English speakers in the US, UK, Canada?
71. Review the 27 example Hebrew words for any that are rude, religiously sensitive or uncommon
72. Role-play 10 learner personas (retired, teen, convert, heritage speaker, dyslexic, low vision, one-handed phone user, no sound at work, Israeli-bound, cantor-in-training) and list what each would trip on
73. Write 100 test cases for the letters screen in plain English steps
74. Write 100 test cases for onboarding and settings
75. Write 60 test cases for review and spaced repetition
76. Write 40 offline and slow-network test cases
77. Write 40 accessibility test cases (screen reader, large text, high contrast, keyboard only)
78. Compare ALEF's first 5 minutes with a typical language app's first 5 minutes, from public descriptions; list what to copy and what to avoid
79. Audit the English copy for the 20 most-used screens: too long, vague, patronising
80. Check 100 Hebrew words for pointing errors (list `?? CHECK` items for a native)
81. Draft a native-speaker review form that takes 20 minutes
82. Draft a rabbi or cantor review form for liturgical content
83. 50 questions a skeptical teacher would ask, with honest answers
84. A risk register: 25 ways this project could embarrass the author, ranked

## Lane 6: Launch, outreach and business drafts (16 jobs)

Command: "You are the ALEF launch writer. Be honest: no invented numbers, no testimonials, no claims of awards. Plain language."

85. Store/page description, short (80 words) and long (300 words)
86. 10 one-line taglines
87. Five-minute demo video script, scene by scene
88. 12 social posts (no hashtags that name a brand)
89. Email to synagogue education directors offering the app for free
90. Email to Hebrew school teachers
91. Email to adult-ed programs and community centres
92. Press note: neutral, 150 words
93. FAQ: 30 questions (price, privacy, offline, traditions, audio, who made this)
94. Privacy policy plain-English draft (the app stores progress on the device; no accounts; confirm this with the developer before publishing)
95. Terms of use draft
96. Credits and sources page template
97. A list of 40 places to share a free learning app (communities, newsletters), with a note on each community's rules to read first
98. Questions to ask a lawyer about selling the app later (licences, content sources)
99. A feedback survey: 12 questions, 3 minutes
100. A launch-week checklist (day by day) that a non-technical person can run

---

## How to use this without disturbing the build

1. Open six chats, one per lane. Paste the Ground rules, then that lane's Command, then say "Do item N" in order.
2. Save replies into `docs/drafts/inbox/lane<N>/`. Do not put them anywhere else.
3. When you want the build agents to use a file, tell them its name. They then check it (Hebrew against the app's own word list, sounds against the pronunciation data) before anything ships.
4. Anything from Lane 2, 3 or 5 marked `?? CHECK` goes to a native speaker, not to the app.
