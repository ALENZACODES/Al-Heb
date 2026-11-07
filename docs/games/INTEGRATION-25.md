# 25-game integration pin

Staging only. This is not release approval, not a live deploy, and not an art merge.

Parents, unchanged:

- PR #20 `chatgpt/games-enrich-2026-11-06` at `2ff079611405692e80e6dc2bb9624876dc2bab0f` (shared player, Tug retry, Vowel basket). Not an ancestor of PR #22.
- PR #22 `chatgpt/games-remaining20-2026-11-06` at `7109790b68552d974712b30363899fdbe309d0d0` (25 route registrations). Its `src/audio/sfx.js` imports `./policy.js`, which that commit does not contain.

This branch adds PR #22's game modules onto the PR #20 tree, so `src/audio/policy.js` is present. PR #17 artwork is not included.

| Route | Hash | Module |
|---|---|---|
| Shabbat Rush | `#/shabbatrush` | `src/games/shabbatrush.view.js` |
| Typewriter | `#/typewriter` | `src/games/typewriter.view.js` |
| Pet Clinic | `#/petclinic` | `src/games/petclinic.view.js` |
| Train Switch | `#/trainswitch` | `src/games/trainswitch.view.js` |
| Weather Studio | `#/weatherstudio` | `src/games/weatherstudio.view.js` |
| Rental Agent | `#/rentalagent` | `src/games/rentalagent.view.js` |
| Echo Chamber | `#/echochamber` | `src/games/echochamber.view.js` |
| Museum Curator | `#/museumcurator` | `src/games/museumcurator.view.js` |
| Karaoke Beat | `#/karaokebeat` | `src/games/karaokebeat.view.js` |
| Arch Builder | `#/archbuilder` | `src/games/archbuilder.view.js` |
| Laser Maze | `#/lasermaze` | `src/games/lasermaze.view.js` |
| Root Tree | `#/roottree` | `src/games/roottree.view.js` |
| Letter Bridge | `#/letterbridge` | `src/games/letterbridge.view.js` |
| Shadow Craft | `#/shadowcraft` | `src/games/shadowcraft.view.js` |
| Cipher Grid | `#/ciphergrid` | `src/games/ciphergrid.view.js` |
| Shuk Taxi | `#/shuktaxi` | `src/games/shuktaxi.view.js` |
| Barter | `#/barter` | `src/games/barter.view.js` |
| Submarine Sonar | `#/submarinesonar` | `src/games/submarinesonar.view.js` |
| Rhyme Lab | `#/rhymelab` | `src/games/rhymelab.view.js` |
| Bumper Verbs | `#/bumperverbs` | `src/games/bumperverbs.view.js` |
| Pinball | `#/pinball` | `src/games/pinball.view.js` |
| Memory Palace | `#/memorypalace` | `src/games/memorypalace.view.js` |
| Prefix Blast | `#/prefixblast` | `src/games/prefixblast.view.js` |
| Tug-of-War | `#/tugowar` | `src/games/tugowar.view.js` |
| Vowel Catcher | `#/vowelcatcher` | `src/games/vowelcatcher.view.js` |

A failed module import says the screen did not load and shows the error. It does not say the game is simply not ready yet.
