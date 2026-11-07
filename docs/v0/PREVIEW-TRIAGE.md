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

## First session path (unchanged)

`welcome` -> `firstday` (five small steps; the pronunciation style and what sound to expect are named at the top) -> `learn`
(r01 onward) -> `letters` / `atlas` -> `progress`. None of these is hidden or merged. Settings holds backup, restore and delete;
Home shows a backup reminder after three finished lessons (`docs/progress/BACKUP-REMINDER.md`).
