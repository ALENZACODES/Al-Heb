# Class track: pedagogy map (DRAFT, not educator reviewed)

## Publicly described shape of a 10-session adult reading class
(from the listings in SOURCES.md; anything beyond this is inference)
1. Weekly live session, about 1 hour (B'nai Israel listing; the Reform listing says 10-11 am slot), 10 weeks.
2. Each week: a few new letters and vowel signs.
3. Progression: letters -> word segments (syllables) -> words -> sentences.
4. End goal: slowly sound out blessings and prayers from the siddur.
5. Cultural/Israeli context alongside; review between sessions; companion workbook; recorded audio/slides.

## Mapping to Aleph (lesson ids from data/curriculum/lessons.json)
| Week | Class-track focus | Aleph core lessons | Stretch |
|---|---|---|---|
| 1 | First letters Shin, Bet, Tav; kamatz, patach, dagesh; first word Shabbat | r01 r02 | |
| 2 | Lamed, final Mem, Vav, Yod; cholam, chirik | r03 r04 r05 r06 | |
| 3 | Alef, He, Resh, Mem; tzere | r07 r08 r09 | |
| 4 | Kaf (+final), Nun (+final); segol, shuruk, kubutz | r10 r11 r12 r13 | |
| 5 | Shva; Pe, Chet; first Priestly Blessing line and the Name | r14 r15 r16 r17 | |
| 6 | Dalet, Gimel, Ayin, Samekh/Sin; chataf vowels | r18 r19 r20 r21 | |
| 7 | Shema line 1; Zayin, Tet, Tsadi, Qof (alphabet complete) | r22 r23 r24 | |
| 8 | Full Priestly Blessing; blessing formula | r25 r26 r27 r28 | |
| 9 | Shva, dagesh and stress rules; Shema in full | r29 r30 r31 r36 | r32 r33 |
| 10 | Torah blessings, Friday-night wine blessing, a new siddur page | r38 r41 r50 | r37 r39 r40 |

Belts: weeks 1-9 cross white -> red -> orange -> yellow -> green and start purple (belts.json ranges r01-r09 white, r10-r19 red, r20-r24 orange, r25-r27 yellow, r28-r31 green, r36-r41 purple). A 10-week pace skips r32-r35 (blue) and r42-r47 (brown), which Aleph puts before the grey siddur-page lessons; r50 is used as a "new page" finale. This compression is Aleph's choice, not from any source.

## Coverage gaps: Aleph vs a typical 10-session adult class
1. **Weekly pacing**: Aleph is self-paced; had no week structure. Class track adds it (draft).
2. **Early whole-line reading**: Aleph's decode check finds almost no fully readable registry line before week 4 (the first is the opening of the zimun, week 4) because its lessons spend weeks on letters before prayer lines. A class that reads a real word every week must rely on lesson words in weeks 1-3; Aleph has few short real-word texts for weeks 1-3.
3. **In-class drills**: no teacher-facing drill scripts (choral reading, echo reading, cold calls). Teacher mode adds a plan; the drill content is generic.
4. **Homework**: Aleph has activities but no assignment sheet; class track adds one.
5. **Siddur-page reading practice**: Aleph reads single lines/ids, not a scanned or laid-out siddur page. `#/read` shows text but not page layout, rubrics or running-text line breaks as in print.
6. **Congregational-response practice**: no practice of responses (Amen, the Barchu call-and-response, Kaddish responses) or of leading vs following; torah-barchu/kedushah entries exist in the corpus but no response-timing drills.
7. **Sentence stage**: the class goes to sentences; Aleph has prayer lines but no short invented sentences between words and prayer lines.
8. **Audio per session**: Aleph has no recordings by a teacher or cantor; Tradition/pronunciation mismatch with a given teacher cannot be checked.
9. **Culture notes**: Israel track exists separately (il01-il24), but is not woven into the reading sessions; the class track only adds a one-line draft note per week.
10. **Assessment**: no end-of-course reading check against an unseen page except r48-r51 (grey) which is beyond week 10.
11. **Teacher feedback loop**: mistakes are logged per learner (pron.misses) but nothing aggregates them for a teacher.
