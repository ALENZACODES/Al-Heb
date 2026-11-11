# ALEF Report Card

Started 2026-11-10, 10 PM Toronto. Graded on the all-lanes branch (`integration/all-lanes-2026-11-10`), not on `main`.

The grades are the builder's own, against the evidence listed. A grade moves only when something was built, run and checked. Where a grade needs a person (a native speaker, a rabbi or cantor, a learner on a real phone), no amount of building raises it to an A, and it is marked so.

## Grades

| Area | Grade | What was checked | What an A needs |
|---|---|---|---|
| Pages load and work | B+ | 3,786 of 3,795 unit tests pass (9 skipped, 0 fail). All 157 static pages opened at phone size from a built copy: no script errors, no empty pages, no broken pictures. Deploy check 46 of 46. | Every page that needs an id (a lesson, a book, a game round, a Practical page) opened too. A second browser engine. A real phone. |
| Layout, touch and keyboard | B | The repo's sweep on 16 key screens at three widths, light and dark: 11 findings at the start of the evening, 3 kinds left (the Play music button is 40px tall, not 44; a hidden file input the sweep misreads; and keyboard focus landing off screen on three screens). No serious accessibility rule fails on those 16. | The sweep on every screen with nothing left. A screen-reader pass by a person. |
| Look, pictures and icons | B+ | Rimon and 58 other pictures have a clear background. Blank doorway cards, missing menu icons, stretched tokens and banded game cards fixed. About ten screens looked at in screenshots. | Every screen looked at. A designer's eye. |
| Course depth | B | 200 written Practical pages in 40 units, 125 core lessons, 50 intermediate lessons, 63 little books. Level checks do not yet draw on the three newest units. Five place units keep thinner pages. | Level checks rebuilt. Every unit in the full page format. A teacher's review. |
| Hebrew accuracy and rabbi appeal | Incomplete | Nothing. No native speaker, rabbi, cantor or teacher has read or heard any of it. | People. This cannot be earned by building. |
| Voices and audio | C+ | Every clip is machine speech. Word clips passed a machine listening check earlier; 7,216 dictionary clips are being checked tonight. 67 Practical lines whose clips failed stay hidden. | Failing clips re-recorded and re-checked. Then human ears, which no build step replaces. |
| Games and coming back | B- | Game hubs open with pictures. Sound effects that were silent now play. No game was played through tonight. | Every game opened and one round played with no error. A learner's reaction. |
| Translator | C+ | 240 unseen sentences: 77.3 on first-choice wording, 94.4 counting other correct wordings. Hebrew to English is the weak side (69.9 and 90.8). About 11 lines come out with a wrong meaning. | 92 or better on first-choice wording in both directions, and no wrong meanings. |
| Hosting on GitHub | D | The built site is about 2.7 GB. GitHub Pages allows 1 GB a site and is switched off for the repo. The pack repo holds the Talk packs but is not being served. | Pages on for the pack repo, and a decision on where 2 GB of audio lives. |
| Against Duolingo, and commercial | Incomplete | Nothing measurable. No learner has used the app. | Learners. |

## What The Overnight Loop Can And Cannot Do

It can raise the first four rows, games, and parts of audio and the translator, because those have checks a machine can run. It cannot turn "Incomplete" into a grade, and it will not mark anything an A that was not checked.

## Rounds

| Round | Time | What changed | Checked by |
|---|---|---|---|
| 1 | 10:30 PM | Sweep findings 11 to 3 kinds: tap areas on the footer links and the music bar, two button names for screen readers, a request for a file that is never there, and the sweep no longer counts a clipped decorative layer as page overflow. | Sweep re-run on 16 screens; full unit run 3,786 pass, 0 fail. |
