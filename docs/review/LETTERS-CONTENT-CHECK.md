# Letters content check: data/letters, mnemonic hooks, letter-name spelling

Status: DRAFT. Nothing here was checked by a native or fluent reader. "Checked" means a script or a read-through of the data agreed or disagreed with another file in the repo. No audio, no browser run, no image was looked at (the hooks were read as text and as `imageIdea` strings only).

## What was actually checked

- Read in full: `data/letters/letters.json` (every field except the outline/stroke geometry), `mnemonics.json` (27 letters + 4 variants), `confusables.json`, `interference.json`, and the per-tradition letter records in `data/pronunciation/consonants.json`.
- Scripted: confusable-set pairs against `interference.json` pairs and against `letters.json` `confusableWith`; every mnemonic `wordSound` against the live `transliterate()` engine; caption length (60 max); letter-name spelling grep across `src`, `data`, `book`, `tools/letters`, `docs/letters`, tests.
- Not done: no check of the generated PDFs, no check of the 800/1254 px mnemonic images, no native proofreading of any Hebrew (nameHe, example words, pointing).

## App convention for letter names (taken from `letters.json` `name` + `consonants.json`)

Alef, Bet / Vet, Gimel, Dalet, He, Vav, Zayin, Chet, Tet, Yod, Kaf / Khaf, Lamed, Mem, Nun, Samekh, Ayin, Pe / Fe, Tsadi, Qof, Resh, Shin / Sin, Tav; finals "Final Kaf / Mem / Nun / Pe / Tsadi".
Two-sound letters keep one record; Vet, Khaf, Fe, Sin are the names of the second sound only.

## Fixed (mechanical, the only edits made)

| # | where | change |
|---|---|---|
| F1 | `data/letters/mnemonics.json` (10 spots), `data/letters/interference.json` (3 spots) | "Final Khaf" / "Final Fe" (name, stories, look-alike tips) renamed to the app's "Final Kaf" / "Final Pe". Letter ids and the real second-sound names Khaf and Fe are unchanged. |
| F2 | `data/letters/mnemonics.json`, tsadi | `wordSound` "tsipor" changed to "tzipor" (what `transliterate()` and the vocab file produce). |
| F3 | `data/letters/mnemonics.json`, tav | `wordSound`, story and caption "toda" / "Toda" changed to "todah" (what `transliterate()` and `lessons.json` use). Caption still under 60 characters. |
| F4 | `tools/letters/build_letters.py` (CONF) then `python3 -I tools/letters/build_letters.py` | `confusableWith` for yod, zayin, nun-final made to match the vav/zayin/nun-final/yod set in `confusables.json`: yod now lists zayin and nun-final; zayin and nun-final now list yod. Before running, an unchanged run was confirmed byte-identical to the stored `letters.json`; after, only those three arrays differ. |

Not regenerated (still show the old text until rebuilt): `book/out/alef-mnemonic-flashcards-*.html/.pdf`, `book/out/alef-book.html` (2 "Final Khaf" / 2 "Final Fe"), `docs/review/out/17-mnemonics.*`. The book HTML in `book/out` is a bleed/print variant that a plain `node book/build.mjs` does not reproduce, so it was left alone. The workbook PDFs carry only the unchanged captions and "Kaf sofit"-style labels, so F1-F3 do not change them.

## Findings for a native reviewer / owner (not changed)

### A. Sound claims vs tradition
The hooks in `mnemonics.json` are Israeli-only. The atlas shows a tradition-aware sound line (`consonants.json`), the hooks next to it do not change.

1. Tav (`toda`, "T for Tav", "Table with a Toe"): the sound line mentions Ashkenazi s, but the stories do not. With an Ashkenazi setting, an undotted tav is s (`consonants.json`: "s without dagesh (Shabbos)"); the anchor word has a dagesh so it is true there, the "T for Tav" framing is not true for undotted tav in that tradition.
2. Ayin: story and `soundAnchor` say "silent ... the same as alef". `consonants.json` has Sephardi [ʕ] (pharyngeal). The `sound` line hedges ("a deep throat sound in some traditions"), the story and anchor do not.
3. Alef: "tiny pause in uh-oh" is Israeli/Sephardi; Ashkenazi record says plain silent. Minor.
4. Chet: "ch as in Chanukah, challah, Bach" and the "cat hissing" story are fine for Israeli and Ashkenazi [x]; Sephardi is pharyngeal [ħ]. Also many English speakers say Hanukkah with an h, so "Chanukah" is a weak anchor for the throaty sound (Bach / loch are the better ones, already listed).
5. Resh: "growl from the back of the throat", "French-style r": Israeli only. Sephardi record is an alveolar trill/tap; Ashkenazi "by regional dialect".
6. Qof (Mizrahi [q]), vav (Sephardi [w]), tsadi (some Sephardi [s]), gimel/dalet (some Sephardi spirantised): not mentioned in hooks; low priority.
7. Final kaf "kh only at the end of a word" and final pe "f": both can carry a dagesh (k / p) in rare words (`consonants.json` says so for both). The hooks say "only", which is slightly too strong.
8. The `sound` strings in `letters.json` are Israeli only by design (`tradition: "israeli"`). No error found in them.

### B. Culturally risky or doubtful hooks
1. Zayin: the hook is a dagger / weapon ("jabbed into the ground", image idea "a small dagger stuck upright"). The reason line says "zayin means weapon". In modern Israeli slang the word zayin is also vulgar. Needs a native view on whether the name belongs in a general-audience hook and whether a weapon picture is acceptable for children and schools.
2. Nun: "a Nun kneeling in prayer" and the image idea "a nun in a habit kneeling and bowing". This is a Christian image for a Jewish-learning course, and kneeling prayer is not a Jewish custom. Final nun repeats it ("the Nun standing up straight"). Suggest the owner choose another picture (the `altStory`, a cat napping, already exists).
3. Sin: "sinister" and "a hissing snake" (story, image idea). A snake plus "sin" reads as a religious reference to some readers; "sinister = left" is a true etymology but a high-register word.
4. Tsadi: "kneeling person" in the `altStory`/shape and the link to tsaddik are marked uncertain in the data already.
5. Qof: "Kooky monkey" and "kook"; monkey imagery is the literal meaning of kof but "kooky" is mildly pejorative.
6. Gimel: "grumpy camel", fine in itself; flag only because camel hooks can read as a regional stereotype.
7. Shin: reason line says shin is written on mezuzah cases for a divine name. Factual, no divine name is spelled out; kept for the owner's call.
8. No profanity, no brand names and no identifiable people were found in the hooks (scan --text passes).

### C. English hook words that are not simple
Candidate replacements are for the owner to choose; none were changed.
tsetse (also unsafe to pronounce: /ts/ vs /t/), kernel, bungalow, sinister, lolling, pursed, kooky, trident, acrobat, stilt, cloak, mattress, tubing, Latin. Fine: bed, ball, camel, door, hut, vine, teapot, yo-yo, spoon, lamp, tent, nap, cushion, eye, party horn, pizza, monkey, ramp, cake, table, toe, king.
Weakest hook: tsadi (tsetse fly). Pizza already carries the sound, so the fly is decoration.

### D. Confusable pairs
- Every pair inside every set in `confusables.json` has an entry in `interference.json`. Two entries (kaf|qof, mem|mem-final) are pair-only and are not in a set; that is intentional extra coverage, not an error.
- Tips that do state a visible difference: bet/kaf/pe, gimel/nun, dalet/resh, dalet/final kaf, resh/final kaf, vav/zayin/yod/final nun, he/chet/tav, samekh/final mem, final pe/final tsadi, kaf/qof, mem/final mem.
- Weakest tip: ayin|tsadi ("second stroke comes from the top right / top left"). A stroke direction cue is hard to see on a printed glyph; a native teacher should confirm the direction and whether a shape cue ("tsadi has a flat base and a fork; ayin is one curve") is enough on its own. The tsadi mnemonic repeats the same stroke-direction claim.
- chet|tav tip ("Chet's left leg is straight and sits flush with the base") is true but redundant with the foot cue.
- `confusables.json` and `interference.json` both say they were paraphrased from English learner sites, not an Israeli teacher.
- Not covered by a tip: mem vs nun-final in handwriting, ayin vs alef. Judgement call.

### E. Letter names: deviations from the app convention
| deviation | where | note |
|---|---|---|
| "Het" for Chet | `src/speak/pairs.js` (title "Het or khaf", label "het (ח)"), `src/speak/model.js` label "het / khaf (throaty kh)", `data/speak/pairs.json`, `data/speak/minimal-pairs.json`, `data/pronunciation/runtime/rules.json` (title/nav "Het (ח)"), `runtime/reasons.json`, `src/traditions/traditions.view.js`, comments | Visible in the speaking drills and the rules page. The ids `het` and `het-khaf` are also data keys and a route (`#/rules/het`), and tests assert the label text (`tests/speak.test.js`, `pronunciation.*.test.js`). Not changed: it needs a decision on ids and a rebuild of the pronunciation runtime. |
| "Kaf sofit", "Mem sofit", "Nun sofit", "Pe sofit", "Tsadi sofit" | `tools/letters/workbook.mjs`, `tools/letters/firstday_pages.mjs` (SOFIT map), the workbook and first-day PDFs, `book/out/alef-book.html` | App says "Final Kaf" etc. Hard-coded in `tests/letters.workbook.test.js` ("Mem sofit"...). Owner call: either word is fine, but the course uses both. |
| "He (Hey)" | `mnemonics.json` name | `letters.json` says "He". Left because "Hey" helps a reader say it. |
| "Aleph" | `data/curriculum/belts.json`, `resource-concepts-youtube100.json`, `src/pronunciation/kamatz-katan.js` | These refer to other programmes by their own names, or a lesson label; not letter-name spellings. Left. |
| "Final kaf", "Final tsadi" (lowercase second word) | `data/pronunciation/consonants.json` | Capitalisation only; matches in meaning. |
| "Tzadi", "Kuf", "Khet", "Aleph" as a letter name | none found | Chet, Tsadi, Qof, Alef are used consistently everywhere else, including the book and workbook sources. |
| "tz" in Hebrew word respellings (tzipor, eretz, tzadik) vs "ts" in the letter name and sound lines | engine / vocab vs letters data | Deliberate split (letter name Tsadi, word respelling tz); the tsadi-final anchor reads "ts as in eretz", which mixes the two spellings. Owner call. |

### F. Hebrew names and example words (never altered, native check needed)
- `nameHe` for pe is "פֵא" without a dagesh; the name of the letter is usually written with one (פֵּא). Same for the stored pe-final label. Not changed (Hebrew is not invented here).
- `nameHe` spellings (הֵא, חֵית, טֵית, יוֹד, צָדִי, לָמֶד, ...) are stated in `SOURCES.md` as "conventional spellings; not checked against an Academy list".
- Example words in the hooks are "pointed by hand and need native proofreading" (`mnemonics.json` meta). Not proofread here.
- The reason lines about letter-name meanings (zayin = weapon, vav = hook, kaf = palm/spoon, etc.) are phrased as "often taught", never as history. Tet, chet, tsadi, nun meanings are marked uncertain in the data already.
- Final-form gematria 500-900 is already flagged as a convention in the data and in the workbook footnote.

## Hook replacements (second pass): every row below is needs-native-review

Source edited: `data/letters/mnemonics.json` (hand-authored; `build_letters.py` does not write it). Goal: simple English words, no weapon, no religious figure or posture, no pejorative word, no hard word. Nothing here was heard or seen by a native reader; the first sounds below were compared with the tradition records in `data/pronunciation/consonants.json` only.

| letter | old hook | new hook | needs-native-review | sound across traditions (per `consonants.json`) |
|---|---|---|---|---|
| Zayin | dagger / weapon, "zayin means weapon" | Zipper pull (Z, zzzip); alt: an upright Z | needs-native-review | z in all three. The reason line no longer uses the name's meaning. |
| Nun | a Nun kneeling in prayer | Nap, a cat curled in a box; alt: a Nest in the corner | needs-native-review | n in all three. |
| Final nun | the Nun standing up straight | a Nail standing upright; alt: the cat stretched out | needs-native-review | n in all three. |
| Sin | "sinister" (Latin for left), snake | a Sun in the upper left corner: Sss; alt: Sat/Sit | needs-native-review | s with the left dot in all three records. Older Lithuanian Ashkenazi merged shin and sin as s (historical, in `consonants.json`). Shin's story and caption were changed to match. |
| Qof | Kooky monkey | Kite with its string below the line; alt: Key | needs-native-review | k in Israeli and Ashkenazi. Some Mizrahi communities say [q], a deeper sound; the sound line now says so instead of claiming plain k. The anchor word kof (monkey) is unchanged. |
| Tsadi | Tsetse fly | a sitting Cat with pointed ears; alt: a slice of Pizza | needs-native-review | ts in Israeli and Ashkenazi; s in some traditional Sephardi communities (stated in the sound line). No common English word begins with ts, so the first sound does NOT match: the hook uses the ts at the end of "cats" and in the middle of "pizza". The "kneeling person" line was removed from the reason. |
| Final tsadi | altStory Tsetse fly on a stilt | altStory a Cat on a long pole (main story, the Tree, kept) | needs-native-review | as tsadi. |

Also changed to match: `tools/images/spec_blockj.mjs` (LETTER_ALTS zayin, tsadi, tsadi-final) and the shape text for tsadi in `tools/images/spec.mjs`; `tests/letters.atlas.test.js` (nun story text). Existing generated letter images (`assets/img/gen`, `data/images`) were NOT redrawn and may still show the old pictures (dagger, nun, tsetse fly, monkey) until the image run is repeated. Kept as is: gimel camel, shin's mezuzah remark, chet/ayin/resh tradition notes in section A.

Rebuilt with repo builders: `node tools/letters/workbook.mjs --mnemonics`, `node book/flashcards.mjs`, `node tools/review/build_packet.mjs` (the packet builder rewrites the whole docs/review/out folder, so the full run was used). `book/out/alef-book.html` and its PDFs were not rebuilt.

## Tests run

See the end of this file for the result lines.

After the edits: `node --test tests/letters.*.test.js tests/workbook.*.test.js tests/book.*.test.js` gave 128 tests, 127 pass, 0 fail, 1 skipped (same as before the edits). `node tools/meta/scan.mjs --text` PASS. Scratch files in /tmp (backups of the three data files) are removed below.
