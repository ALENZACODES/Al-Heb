# Preview triage: hide, merge or keep

v0 is the small set of routes in `SCOPE.md`. Every other page is **Preview**. This file gives each static preview route one
decision, so the More sheet stays short and the first session stays coherent (welcome, first day, lessons, letters, progress).

- **hide**: left out of the More sheet's Preview group and Home's "More ways to learn" (`PREVIEW_HIDDEN` in
  `src/shell/nav-model.js`). It still opens by direct link, still has the Preview banner, and search still finds it (labelled Preview).
  Nothing is deleted.
- **merge**: still listed as Preview for now; the note names the page it should fold into. No merge has been done yet.
- **keep**: stays in the Preview group until it meets the exit criteria in `SCOPE.md` (native review, tests, a real phone, meta scan).

`tests/v0.test.js` checks that every static preview route has exactly one row here and that every `hide` row matches `PREVIEW_HIDDEN`.

| route | decision | note |
|---|---|---|
| `loanwords` | keep | Short, confidence-building; candidate for v0 after native review. |
| `checkpoint` | keep | Look-alike letters; directly supports lessons r01-r10. |
| `dialogues` | keep | Israel goal path. |
| `ladder` | merge | Into the lesson path as an optional step; same idea as `syllablechips`. |
| `fade` | keep | Fade-out recall; target for `nikkud-fade`. |
| `wordtrace` | keep | Extends letter tracing (a v0 page). |
| `israel` | keep | Israel goal path. |
| `israelunits` | hide | Merged into the live Practical course; old #/israel-units routes redirect there. |
| `traditions` | keep | Target for `traditions-guide` and `traditions-hear`. |
| `traditions-guide` | merge | Into `traditions` (already a tab there). |
| `traditions-hear` | merge | Into `traditions` (already a tab there); no recorded audio yet. |
| `classtrack` | keep | Teacher and class use. |
| `morning` | keep | Daily habit. |
| `firstwin` | keep | Minute One word builder: the home page's "Try it now" leads here; 1,044 words with clips for both voices (docs/firstday/BUILDER-2026-11-07.md). |
| `timedread` | merge | Into `read` as an option; it is a timer on the same texts. |
| `share` | keep | Small and self-contained. |
| `classsummary` | hide | Teacher-only view; reached from `classtrack` or by link. |
| `service` | keep | Prayer-service follow-along. |
| `shabbat` | keep | Shabbat Companion (lane 5, 12 Nov): this Shabbat, the service map, follow-along, join-in drills and home rituals. Order not yet reviewed by a rabbi. |
| `prayer-practice` | keep | Prayer Practice (siddur-speaking lane, 12 Nov): line tutor, word decks, fluency ladder, parts roadmap, festival outline and the one service ring. Self-checked; order not yet reviewed by a rabbi. |
| `firstday-ladder` | merge | Into `firstday` as its optional last part. |
| `placement` | keep | Linked from the welcome screen for learners who can already read. |
| `reminders` | keep | Study reminders. |
| `typing` | keep | Typing practice. |
| `write` | keep | Writing: the daily journal, typed Hebrew answers, sentence rewriting. |
| `festivals` | keep | Calendar content. |
| `listen` | keep | Needs audio; useful once recordings exist. |
| `trope` | keep | Names of the marks only; no audio claims. |
| `tradition-quiz` | keep | Needs audio to be worth much; keep as preview. |
| `read-my-way` | keep | Tradition-aware reading. |
| `rules` | keep | Pronunciation rules reference. |
| `intermediate` | keep | After r10. |
| `israelunits` | hide | Merged into the live Practical course; old #/israel-units routes redirect there. |
| `practical` | keep | Babbel-style conversation units behind Practical; draft, needs native review; not a 126th lesson. |
| `grammar` | keep | Reference notes. |
| `compare` | keep | Target for `record-compare`. |
| `vocab-themes` | keep | Theme packs (shared audio button). |
| `speak` | keep | Say it. |
| `speak-studio` | keep | Speaking Studio (siddur-speaking lane, 12 Nov): record a service line and compare waveforms with the model clip, shadowing, self-rating, machine guess, gym, fluency, speaking days, voice journal. Nothing scores pronunciation. |
| `talk` | keep | Talk: short everyday lines between English and Hebrew, from stored lines on the device. Supports the Israel and synagogue goals. |
| `sprint` | keep | Word Sprint. |
| `gender` | merge | With `roles` and `gender-drill` into one gender page. |
| `roles` | merge | Into the gender page. |
| `scaffold` | keep | Read without Latin letters. |
| `sounds` | keep | Sound descriptions; also the silent-reading reference. |
| `read` | keep | Reader; target for `timedread`. |
| `scan` | keep | Scan a page. |
| `camera` | keep | Camera Translator: English drawn over the Hebrew on a photo of a sign or menu. On the device only, no server; measured on computer-made images only (docs/photo/CAMERA-TRANSLATE.md). |
| `calendar` | keep | Calendar. |
| `accessibility` | keep | Has its own quick row in Settings (see SCOPE.md). |
| `how` | keep | How this works; linked from the sound bar. |
| `workbook` | keep | Printable workbook. |
| `soundgap` | keep | Sound gap pairs. |
| `vowelboard` | keep | Target for `niqquddial` and `dottile`. |
| `niqquddial` | hide | Same vowel signs as `vowelboard`; to be merged into it. |
| `dottile` | hide | Same vowel signs as `vowelboard`; to be merged into it. |
| `syllablechips` | keep | Linked from the silent-reading steps. |
| `torahread` | keep | Target for `torahreader`. |
| `ask` | keep | Ask the Torah: answers from the written text, with links into the reader. Static answers, no server; reached from each verse in the Torah reader, the Read page, More and the full Home. |
| `torahreader` | hide | Second Torah screen; `torahread` covers the same need. |
| `vocab` | keep | Vocabulary list and review (shared audio button). |
| `nikkud-fade` | hide | Same idea as `fade`; to be merged into it. |
| `roots` | keep | Roots and verb families. |
| `gender-drill` | merge | Into the gender page. |
| `record-compare` | hide | Needs a recorded model voice, and there are no recordings yet; to be merged into `compare` later. |
| `scheduler` | hide | Developer explainer of review spacing; not learner-facing. |
| `known-words` | hide | Tool for checking texts against the word list; more for teachers and authors than learners. |
| `syllabus` | keep | Syllabus and goals; target for `time-budget`. |
| `time-budget` | hide | Planning numbers; belongs inside `syllabus`. |
| `daily` | keep | Daily goal and quests. |
| `awards` | keep | Practice-game activity and a sample beginner certificate. Not a lesson score. |
| `certificate` | keep | The learner's own record of lessons passed under the pass rule, with first-try scores and dates, and a link that recomputes it. Self-issued, not reviewed; says what it cannot prove. (lane 4, 12 Nov) |
| `move` | keep | Move progress to another of the learner's own devices by link, QR code or file; the import merges, never overwrites. No account, no server. (lane 4, 12 Nov) |
| `phrases` | keep | Common phrases and sentences; supports the speaking goal. |
| `books` | keep | The little-books shelf; listed in the Preview group so the books can be found. |
| `listen-shelf` | keep | The Sacred Listen shelf; listed in the Preview group so the recordings can be found. |
| `songs` | keep | The original songs with their words and the Hebrew sung in them. Not prayer audio; listed in the Preview group so the songs can be found. |
| `listen-practice` | keep | Listening Practice (audio lane, 12 Nov): line tools at slower speeds, word-by-word steps and the three-tradition compare, fill the gap from word clips, and dictation. Listed in the Preview group so it can be found. |
| `synagogues` | keep | Reform synagogues in Canada: a directory with pictures, stories and contact details for 27 congregations. Not a lesson; stays preview until the facts are checked by the congregations. |
| `games` | keep | The games hub; listed in the Preview group as the one door to all the games. |
| `wordfinder` | keep | The first game; linked from Home and the showcase. |
| `tugowar` | hide | A game; reached from the games hub, and search finds it by name. |
| `vowelcatcher` | hide | A game; reached from the games hub, and search finds it by name. |
| `pinball` | hide | A game; reached from the games hub, and search finds it by name. |
| `prefixblast` | hide | A game; reached from the games hub, and search finds it by name. |
| `memorypalace` | hide | A game; reached from the games hub, and search finds it by name. |
| `shabbatrush` | hide | A game; reached from the games hub, and search finds it by name. |
| `typewriter` | hide | A game; reached from the games hub, and search finds it by name. |
| `petclinic` | hide | A game; reached from the games hub, and search finds it by name. |
| `trainswitch` | hide | A game; reached from the games hub, and search finds it by name. |
| `weatherstudio` | hide | A game; reached from the games hub, and search finds it by name. |
| `rentalagent` | hide | A game; reached from the games hub, and search finds it by name. |
| `hanukkah-dreidel1` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-dreidel2` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-candles` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-count` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-pairs` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-colour` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-gelthunt` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-slide` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-hiddenlights` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-jumble` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-saveflame` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-charades` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `hanukkah-forbidden` | hide | A Hanukkah game; reached from the Hanukkah section of the games hub, and search finds it by name. |
| `echochamber` | hide | A game; reached from the games hub, and search finds it by name. |
| `museumcurator` | hide | A game; reached from the games hub, and search finds it by name. |
| `karaokebeat` | hide | A game; reached from the games hub, and search finds it by name. |
| `archbuilder` | hide | A game; reached from the games hub, and search finds it by name. |
| `lasermaze` | hide | A game; reached from the games hub, and search finds it by name. |
| `roottree` | hide | A game; reached from the games hub, and search finds it by name. |
| `letterbridge` | hide | A game; reached from the games hub, and search finds it by name. |
| `shadowcraft` | hide | A game; reached from the games hub, and search finds it by name. |
| `ciphergrid` | hide | A game; reached from the games hub, and search finds it by name. |
| `shuktaxi` | hide | A game; reached from the games hub, and search finds it by name. |
| `barter` | hide | A game; reached from the games hub, and search finds it by name. |
| `submarinesonar` | hide | A game; reached from the games hub, and search finds it by name. |
| `rhymelab` | hide | A game; reached from the games hub, and search finds it by name. |
| `bumperverbs` | hide | A game; reached from the games hub, and search finds it by name. |
| `bumpercar` | hide | An alias of `bumperverbs`; reached from the games hub, and search finds it by name. |
| `traintrack` | hide | An alias of `trainswitch`; reached from the games hub, and search finds it by name. |
| `weatherpresenter` | hide | An alias of `weatherstudio`; reached from the games hub, and search finds it by name. |
| `karaoke` | hide | An alias of `karaokebeat`; reached from the games hub, and search finds it by name. |
| `cipher` | hide | An alias of `ciphergrid`; reached from the games hub, and search finds it by name. |
| `fleamarket` | hide | An alias of `barter`; reached from the games hub, and search finds it by name. |

## First session path (unchanged)

`welcome` -> `firstday` (five small steps; the pronunciation style and what sound to expect are named at the top) -> `learn`
(r01 onward) -> `letters` / `atlas` -> `progress`. None of these is hidden or merged. Settings holds backup, restore and delete;
Home shows a backup reminder after three finished lessons (`docs/progress/BACKUP-REMINDER.md`).
| `phrases` | keep | Phrase browser over existing records. |
| `listen-shelf` | keep | Listening shelf; needs recordings. |
| `songs` | keep | Original songs page; plays only when pressed, pauses for any lesson voice. |
| `books` | keep | Little books shelf; readers are drafts until native review. |
| `games` | keep | The games hub; every game is reached from here. |
| `letterchomp` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `fallingletters` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `lettertwins` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `soundsnap` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `lookalikes` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `alefbetrun` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `finalfive` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `letterdrop` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `vowelstack` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `syllablesnake` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `wordbuilder` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `meltdown` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `flapvowel` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `bingoletters` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `wordsearch` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `minicross` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `wordmaze` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `scramble` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `bubbleword` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `trueornot` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `lettercrush` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `lettersudoku` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `quizladder` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `speedtype` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `gendersplit` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `pluralpop` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `sentencetrain` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `noahseven` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `tenwords` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `mitzvot613` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `tg-tilepairs` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-letterhunt` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-numerals` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-wordguess` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-torahwords` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-family` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-verbslots` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-storyorder` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-whosaid` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-parashah` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-tropehunt` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `tg-holidays` | keep | Torah and Hebrew game; reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g1-strokeorder` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-reveal` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-script` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-duel` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-sounddash` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-rhythm` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-gaptrain` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-whereis` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-finalswitch` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-sounddots` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-vowelchain` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-soundpairs` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-blend` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-nonsense` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-dagesh` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-riverhop` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-shva` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-helpers` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-syllablecut` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g1-flashread` | hide | A letters, vowels and sounds game (lane g1); reached from its section of the games hub, and search finds it by name. |
| `g2-sortrush` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-oddone` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-popup` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-familytree` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-bodymap` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-paintpots` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-lineup` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-snap` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-chain` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-dominoes` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-endings` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-street` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-whereami` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-clues` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-dayafter` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-trail` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-fourgroups` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-hive` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-ladder` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g2-firstletter` | hide | Words-by-topic game (lane g2); reached from the `games` hub, kept out of the More sheet. Preview until a native speaker reviews its Hebrew. |
| `g3-conveyor` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-lostfound` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-whack` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-onetwomany` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-questions` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-packcheck` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-clues` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-gate` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-grid` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-arrows` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-agree` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-negate` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-swapfix` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-mirror` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-shop` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-chains` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-press` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-sieve` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-repair` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g3-decoder` | keep | Grammar in Action game (lane g3); reached from the `games` hub. Preview until a teacher reviews its Hebrew. |
| `g4-greetings` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-clock` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-signs` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-cafe` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-change` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-bell` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-weather` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-slang` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-falafel` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-busboard` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-hours` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-shuk` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-menu` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-grid` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-phone` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-tone` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-week` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-tourist` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-emergency` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g4-pharmacy` | hide | Everyday Israel game (lane 4); reached from the Everyday Israel section of the games hub, and search finds it by name. Preview until a native speaker reviews its Hebrew. |
| `g5-simanim` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-harvest` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-grogger` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-fireworks` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-table` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-greet` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-shofar` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-kippur` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-gifts` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-plate` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-questions` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-omer` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-sukkah` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-species` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-steps` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-stars` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-bless` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-mend` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-readings` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `g5-scroll` | hide | Holiday, Shabbat and prayer game (lane 5); reached from its section of the `games` hub, and search finds it by name. Preview until a teacher reviews the Hebrew marked for review. |
| `wordfinder` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `tugowar` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `vowelcatcher` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `pinball` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `prefixblast` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `memorypalace` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `shabbatrush` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `typewriter` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `petclinic` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `trainswitch` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `weatherstudio` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `rentalagent` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `echochamber` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `museumcurator` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `karaokebeat` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `archbuilder` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `lasermaze` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `roottree` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `letterbridge` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `shadowcraft` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `ciphergrid` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `shuktaxi` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `barter` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `submarinesonar` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `rhymelab` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `league` | keep | Weekly practice league (pretend players, said so on the page); reached from the top bar. Preview until owner review and native review of the tier names. |
| `shop` | keep | Streak-freeze shop, streak repair, heart refill and the retention switches; reached from the top bar. Preview until owner review. |
| `bumperverbs` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `bumpercar` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `traintrack` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `weatherpresenter` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `karaoke` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `cipher` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `fleamarket` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `light` | keep | Star of David light: on-screen glow, optional phone flash, and a printable stencil. Preview until a real-phone check. |
| `bridge` | keep | Reading Without Vowels (lane 6, 12 Nov): the Fade-out ladder's last three stages per text, books, prayer lines, word recognition and the modern texts shelf. Self-graded; preview until a teacher reviews it. |
| `readlab` | keep | Reading Tools (reading lane, 12 Nov): vowel-mark slider per section and the Fade Challenge, Word Spotlight with syllable taps, family letters and verb-pattern colours by exact spelling, Three Versions, Sh'va Detective, Final Forms and Dagesh, Stress Drill, Reading by Text Type. Self-graded reads; drills checked against the app's data. Preview until a teacher reviews it. |
| `trope-families` | keep | Trope Families (lane 6, 12 Nov): signs and names from the app's trope table with real-verse examples; no melody audio exists. Names not reviewed. |
| `trope-aliyah` | keep | Trope Practice by Aliyah (lane 6, 12 Nov): phrase-by-phrase stepping with the existing verse recording; no chant audio exists. Names not reviewed. |
| `whats-new` | keep | What's New (lane platform, 12 Nov): the change list generated from the project history, new entries marked. |
| `my-data` | keep | My Data (lane platform, 12 Nov): what is stored, the JSON backup and two CSV downloads. |
| `cram` | keep | Cram (lane platform, 12 Nov): a lesson review sized to the minutes available. |
| `mastery` | keep | Mastery Map (lane platform, 12 Nov): every review card as new, learning, known or mastered by stated thresholds. |
| `my-week` | keep | My Week (lane platform, 12 Nov): weekly report, the learner's own weekly goals and a shareable picture card. |
| `lesson-badges` | keep | Lesson Badges (lane platform, 12 Nov): badges from verified lessons only; the unverified era listed. |
| `shortcuts` | keep | Keyboard Shortcuts (lane platform, 12 Nov): the shortcuts that exist, each checked against its code. |
| `worksheet` | keep | Printable Worksheet (lane platform, 12 Nov): a practice sheet from a lesson's own letters and words. |
| `focus` | keep | Focus Mode (lane platform, 12 Nov): one passage at a time, large text, the app's chrome hidden. |
| `game-library` | keep | Games Library (lane games-books, 12 Nov): every game on the games page counted once, skill and played/mastered filters, best and last scores, level requirements, the daily challenge. Reached from the `games` hub. |
| `tournament` | keep | Games Tournament (lane games-books, 12 Nov): five arcade games a week, one combined score, a board of this device's own runs. Reached from the Games Library. |
| `rootbuilder` | hide | Root Builder (lane games-books); reached from the games hub's More Games section, and search finds it by name. Answers come only from the app's unreviewed root families and verb list. |
| `sprint60` | hide | Sixty-Second Sprint (lane games-books); reached from the games hub's More Games section, and search finds it by name. |
| `wordfinder-listen` | hide | Word Finder by ear (lane games-books); reached from Word Finder and the games hub, and search finds it by name. |
| `listenspot` | hide | Listen and Spot (lane games-books); reached from the games hub's More Games section, and search finds it by name. |
| `quizladder-duo` | hide | Quiz Ladder for Two (lane games-books); reached from the games hub's More Games section, and search finds it by name. |
| `dreidel-duo` | hide | Dreidel for two to four players (lane games-books); reached from the games hub's More Games section, and search finds it by name. |
| `parashah` | keep | This Week's Parashah (lane games-books, 12 Nov): the calendar's portion with its aliyot, self-marked reading progress and a weekly goal. |
| `torah-search` | keep | Torah Search (lane games-books, 12 Nov): find a Hebrew word, or the words the app's root data lists under a root, in every verse; results open the reader at the verse. |
| `verse-notebook` | keep | Verse Notebook (lane games-books, 12 Nov): saved verses with the learner's own notes, kept on the device, exportable as a file. |
| `reading-challenge` | keep | Reading Challenges (lane games-books, 12 Nov): a learner-chosen number of little books in a month or a week, counted from books finished with the story check. |
| `course-map` | keep | Course Map (course lane, 12 Nov): every lesson of both paths drawn from its prerequisites, with done/open/locked and where the learner is. Preview until learners have used it. |
| `mixed-review` | keep | Mixed Review (course lane): a short quick-check set from the weakest reviewed cards; updates review cards. |
| `five-minutes` | keep | Daily Five-Minute Set (course lane): due cards, one new item, one game round; the time shown is measured. |
| `checkpoints` | keep | Checkpoint Tests (course lane): one per 10 lessons, lesson pass rule; opens the next block early, never marks lessons done. |
| `benchmarks` | keep | Benchmark Map (course lane): the rank goals from belts.json with proven/unproven state; says the IJL list is not in the repo. |
| `app-rules` | keep | How Hearts, Streaks, Minutes and Passing Work (course lane): the one rules page, built from the enforced constants; the Shop and Daily read from it. |
