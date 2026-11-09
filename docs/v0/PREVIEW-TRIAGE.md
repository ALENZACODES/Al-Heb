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
| `firstday-ladder` | merge | Into `firstday` as its optional last part. |
| `placement` | keep | Linked from the welcome screen for learners who can already read. |
| `reminders` | keep | Study reminders. |
| `typing` | keep | Typing practice. |
| `festivals` | keep | Calendar content. |
| `listen` | keep | Needs audio; useful once recordings exist. |
| `trope` | keep | Names of the marks only; no audio claims. |
| `tradition-quiz` | keep | Needs audio to be worth much; keep as preview. |
| `read-my-way` | keep | Tradition-aware reading. |
| `rules` | keep | Pronunciation rules reference. |
| `intermediate` | keep | After r10. |
| `grammar` | keep | Reference notes. |
| `compare` | keep | Target for `record-compare`. |
| `vocab-themes` | keep | Theme packs (shared audio button). |
| `speak` | keep | Say it. |
| `sprint` | keep | Word Sprint. |
| `gender` | merge | With `roles` and `gender-drill` into one gender page. |
| `roles` | merge | Into the gender page. |
| `scaffold` | keep | Read without Latin letters. |
| `sounds` | keep | Sound descriptions; also the silent-reading reference. |
| `read` | keep | Reader; target for `timedread`. |
| `scan` | keep | Scan a page. |
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
| `phrases` | keep | Common phrases and sentences; supports the speaking goal. |
| `books` | keep | The little-books shelf; listed in the Preview group so the books can be found. |
| `listen-shelf` | keep | The Sacred Listen shelf; listed in the Preview group so the recordings can be found. |
| `synagogues` | keep | Reform synagogues in Canada: a directory with pictures, stories and contact details for 27 congregations. Not a lesson; stays preview until the facts are checked by the congregations. |
| `games` | keep | The games hub; listed in the Preview group as the one door to all the games. |
| `library` | keep | Library: short referenced articles on Jewish life; linked from Learn and from calendar day pages. |
| `lab` | keep | Brain Lab: the daily three-drill workout and its ten timed drills; linked from Learn and the games hub. |
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
| `bumperverbs` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `bumpercar` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `traintrack` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `weatherpresenter` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `karaoke` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `cipher` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
| `fleamarket` | keep | Game; reached from the `games` hub. Preview until native review of its words. |
