# Memory card QA (first-time learner)

Run: headless Google Chrome via Playwright, touch + mobile emulation, device scale 2, 375x667 and 360x640. Fresh profile per tradition (israeli, sephardi, ashkenazi); onboarding answered ("No, start from the beginning", then the tradition). Letters opened at `#/letters/<id>` for alef, bet, gimel, dalet, he and the finals kaf-final, mem-final, nun-final. At each letter: card as shown, then every "Play the chain" / "Next" press to the last stage. Extra passes: dark colour scheme (israeli 375, ashkenazi 360), `prefers-reduced-motion: reduce` (israeli 375), offline with the service worker (nun-final, alef, shin) on a temp copy of the tree. Synthetic taps, no real phone. Judgements below are mine from the screenshots; I have not run a test with real learners, so "under 10 seconds" is a reading of the screen, not a timing.

Screenshots (prefix `lq-`, 9 files, about 1 MB) are in `docs/qa/memory-card/`; the other files there came from another lane.

## What I checked and found OK

- Card present on all 8 letters x 3 traditions x 2 viewports (48 of 48); no page errors or console errors.
- No horizontal page overflow, no clipped or overflowing text inside the card, at either width, at any of the 4 stages (scrollWidth/clientWidth and bounding-box checks).
- Tap targets: picture button 88x88, primary "Play the chain / Next" button and "Hear the letter / Hear the word" all at least 44px tall; nothing under 44px inside the card.
- Picture loads inline for all 8 letters in all runs.
- Dark mode: card and picture re-tint, text readable (lq-israeli-375-dark-gimel-s3.png).
- Reduced motion: stage changes are instant; the picture shows at once on the first press. CSS has `transition:none` under the media query.
- Offline (temp copy, manifest regenerated there, worker controlling, `setOffline(true)`): card, chain data and inlined picture all work for alef, nun-final, shin; zero failed requests.
- Sound line differs correctly per tradition where it should: alef (israeli/sephardi "silent / glottal stop"; ashkenazi "silent"), and the generated respellings change (aba / aba / abo, bayit / bayit / bayis, gamal / gamal / gomol, delet / delet / deles, yam / yam / yom).

## Findings

1. **The card is not on the first screen of a letter page (main finding for "obvious in 10 seconds").** At 375x667 the card starts about 800-900 px down the page (360x640: about 790-910), below the tracing stage. The first screen shows tabs, the letter strip, the big letter and the empty tracing box (lq-first-screen-bet-375.png). A learner who is tracing never sees picture -> sound -> word unless they scroll. This is the placement chosen on purpose in `trace.view.js`, but the cost is that the memory idea is invisible at first look.
2. **Picture -> sound -> word takes three presses, and the sound is not shown with the picture.** Stage 0 shows only the letter and "Play the chain: picture" (a two-line button at 375). Press 1 shows the picture, press 2 adds the sound hook, press 3 adds the word. In my reading: the picture-turns-into-letter idea is clear on the first press for bet (house), gimel (camel), kaf-final (king/cloak) and nun-final (nail); the sound and word need two more presses and the learner has to know to press. Under 10 seconds is plausible only for a learner who taps straight away; I would not call it obvious from a cold read.
3. **Alef picture is hard to read at 88 px.** The handstand mime (lq-israeli-375-alef-s1.png) looks like an abstract X shape with small circles; the caption has to explain it. The other pictures I viewed (bet, gimel, dalet, kaf-final, mem-final, nun-final, he) are legible.
4. **Ashkenazi: story text contradicts the word shown.** The word line is rule-respelled (abo, bayis, gomol, deles, yom) but the story/hook text is shared across traditions ("Father cheers: aba!", "Bayit is a house.", "Gamal is a camel.", "Gamal", "Delet", "yam"). An Ashkenazi learner sees "abo = father" followed by a story that says "aba" (lq-ashkenazi-360-alef-s3.png). The "Same sound" lines are correct; the stories are not tradition-aware. The data's per-tradition field covers the sound line only.
5. **Final kaf sound line is confusing.** "Same sound: kh as in loch (k with dagesh, as in the last word of the Priestly Blessing)" names a dagesh (the k sound) inside a line about the kh sound, and a final kaf in melekh is not dagesh-marked. Needs a native/teacher read (the data file already flags needsNativeReview). Hook "Bach" is for the kh sound; fine, but the parenthetical should go or be corrected.
6. **Jargon under the word line.** "(Israeli respelling, rule-generated)" wraps to a second line on every card and is noise for a beginner.
7. **Tall final stage.** Fully opened, the card is 520-600 px at 375 and up to 692 px at 360x640 (more than one screen); the Hear buttons stack to two rows at 360, and the fixed bottom tab bar covers the bottom of the card until scrolled. Not clipped, but long. At 360 the caption wraps to 4 lines and pushes the primary button down.
8. **Offline needs a regenerated precache manifest.** With the committed `precache-manifest.js` (version 27b0474c78b6) there is no memory-chain.json, no `src/letters/memorycard.js` and no morph SVG in the list; offline, the card simply does not appear (0 of 3 letters had it) and nothing errors. With a manifest regenerated in a temp copy (version 103def590faa: 318 installed files, 28 morph SVGs, chain data, card modules all in the install list), the card works fully offline. Whoever ships must run `npm run precache` before release. I did not run it in the repo.
9. **Letters not reachable from a visible link on the first home screen.** In my onboarding-to-Letters path no visible `#/letters` link existed (only inside the collapsed More menu), so my script went by URL. I did not verify the More menu click path by hand; treat as unconfirmed.
10. A yellow "Sound: the list has not been loaded yet." banner sits above everything on a fresh letter page (lq-first-screen-bet-375.png), pushing content down. Not specific to the card.

Not tested: Hear the letter / Hear the word audio playback per tradition (only that buttons exist and are 44px+), real-device rendering, the Atlas and Today first-day cards (the first-day route showed no card in my fresh-profile pass at `#/firstday`; I did not step through its sub-screens), the remaining 22 letters.

## Owners

I could not resolve any owner lane ids from the session, so no messages were sent. Suggested owners: card placement and press flow (1, 2, 7) = letters view lane; chain text (4, 5, 6) = memory-chain data lane; picture (3) = morph art lane; precache (8) = release lane.

---

# Second pass (27 forms x 3 traditions, atlas, first day, audio notes, offline)

Run 2026-11-04, 20:06 to 20:20, while the card and the art were still being edited by other lanes, so this describes the tree as it was in that window (the last picture file changed 20:14; the picture sheet was taken after that, the atlas and first-day screens at about 20:10). Headless Google Chrome via Playwright, 375x667, `isMobile` + `hasTouch`, device scale 1 (the picture sheet at scale 3 for reading), taps not clicks. Fresh settings per tradition (`onboarded` + `congregation` = israeli, sephardi, ashkenazi). Not a real phone, not a test with learners; "reads as" below is my reading of the images.

Screenshots (prefix `mc2-`, 7 files, about 0.9 MB) in `docs/qa/memory-card/`: `mc2-grid-<tradition>-375x667.png` (all 27 cards, one press opened, shrunk to 62 percent so text in the sheet is small; the card checks ran on the full-size cards), `mc2-pictures-27.png` (27 pictures in the pressed state), `mc2-atlas-screens.png`, `mc2-firstday-screens.png`, `mc2-offline-tsadi-no-picture.png`.

## Letters page, 81 cards (27 forms x 3 traditions)

For each: open `#/letters/<id>`, read the card, press "Picture, sound, word", then "Story and tip".
- Card present, picture inline (svg), caption "Picture: ...", sound hook in quotes, Hebrew word, respelling and gloss, tradition chip: 81 of 81.
- Respelling follows the tradition, e.g. aba / aba / abo, gamal / gamal / gomol, shalom / shalom / sholom, yam / yam / yom, ner / ner / neir, etz / etz / eitz. The story text now uses the same respelling as the word row in every one of the 81 (string check): finding 4 of the first pass is fixed.
- No text clipped or overflowing the card (scrollWidth and bounding-box checks) at the one-press state or with story and tip open; no horizontal page scroll; smallest button 44 px; zero console errors, page errors or failed requests.
- Placement: before any press the card sits at y 316-497 (kaf 380-470) on the page, inside the 667 px first screen for all 81. Finding 1 of the first pass (card 800-900 px down) is fixed.
- One press now shows picture, sound and word together (finding 2 fixed). Height: 207-319 px after one press, up to 556 px with story and tip open (longest: Sephardi chet/ayin and resh, which carry long sound lines).
- "(Israeli respelling, rule-generated)" is now a small chip (finding 6 fixed).
- "Hear the letter" is present on all 81; "Hear the word" also (27 of 27 words have a vocabId).

## Picture versus hook / word: where they disagree

Read from `mc2-pictures-27.png` against hook, word and caption. Pictures match caption, hook and word for 24 of 27. Weak or off:
1. **alef**: still reads as an X with small circles; the caption has to carry it (unchanged from pass 1).
2. **pe-final**: caption says a feather held off the tip of a nose, word is "af = nose". The picture reads as a round yellow chick face with a feather above it; the "nose" is a beak-like orange blob. A learner would likely connect it to bird/feather, not nose.
3. **tav**: caption says a table with a baby beside it; the letter itself is the table top and the baby sits under it. Acceptable but the "beside" is not what is drawn.
Seen and since fixed during the run: yod showed a candle (caption: hand flicking a yo-yo) and kaf showed a horseshoe/magnet shape (caption: cup) in my 20:09 captures; both were redrawn at 20:08-20:14 and now match (hand + yo-yo, cup on its side). If the art lane touches these files again, re-read them.

Older story text that disagrees with the new picture (the card itself is consistent; the clash is with the older mnemonic shown elsewhere): the atlas detail panel always shows "Shape:" and "Story:" from `mnemonics.json` under the card, and the letters page shows the same under "Remember it" (closed by default on phones). For these the older story names a different image than the card picture: mem and mem-final (mountain tent vs mailbox / zipped tent by the sea), samekh (cushion vs swim ring), tsadi, tsadi-final (sitting cat vs pizza + bird / tree), nun-final (cat vs nail in stone), pe-final (pursed mouth vs feather and nose), kaf and kaf-final (kitchen spoon vs cup / king), yod (bead vs hand with yo-yo), tav (table with a toe vs table with a baby), chet (cat behind the gate vs jug of milk and loch). On the atlas a learner sees two different stories one under the other. Owner: whoever owns the atlas panel and `mnemonics.json`, or hide the older story when a card is shown.

## Atlas (`#/letters/atlas`)

- All 31 tiles tapped in each of the 3 traditions: the 27 forms show the card with picture, sound, word, story and tip, no clipping, no errors. The 4 variant tiles (vet, khaf, fe, sin) show no card and no fallback line (nothing is wrong, the chain has no entry for them; just so it is known).
- Quiz mode: tiles and score fit, no horizontal scroll (the only clipped elements are the visually-hidden headings).
- "Practice: picture, sound, word": stepped through a full round (8 questions, 14 screens counting repeats of missed ones): prompt, 4 options, feedback (story, tip, sound note), Next, "Round done: 2 of 8 right first time" (my deliberate wrong taps; the missed ones are said to return in review, I did not check the review deck). No clipping in question or feedback screens. The long feedback pushes the Next button down; it needs a scroll at 375x667 (see `mc2-atlas-screens.png`).
- The bottom tab bar covers the last line of the card ("Draft memory hook...") until the page is scrolled; known from pass 1.

## First day (`#/firstday`)

Stepped all 5 steps and the done screen (israeli and ashkenazi; screenshots israeli).
- Steps 1 (Shin) and 2 (Bet) show the compact card right under the step title, on the first screen, with one "Picture, sound, word" button; pressed: picture, hook, word with tradition chip, "Story and tip", "Hear the letter". No clipping, no errors. Respelling differs per tradition (shalom / sholom, bayit / bayis).
- Steps 3-5 (vowel, syllable, word) and the done screen have no card (by design: they are not letters).
- Observations: the card's sound line ("Same sound: sh with the right dot...") and the step's own line ("Shin says SH...") say nearly the same thing twice. "Same sound:" as an opening is unclear to a first-time reader (same as what?). In the first-day step the word shown in the card is shalom while the lesson's own first word is shav; not a contradiction, but two different example words in 10 minutes.
- Earlier "no card at #/firstday" in pass 1 no longer holds.

## Audio buttons: honest notes (headless, so limited)

Checked on alef, bet, shin, in all 3 traditions, by recording calls to `HTMLMediaElement.play` and `speechSynthesis.speak`. There are no recorded clips yet, so every press goes to the device voice, language he-IL; in this headless browser the voice cannot speak, and that is what the note says: "No recording for this one yet, and the device voice could not say it." followed by the tradition line ("the device voice speaks Israeli Hebrew, so it will not match your Sephardi/Ashkenazi setting. Read the respelling"; Israeli: "plays the device voice, which speaks Israeli Hebrew"). So no button claims to play something that did not play, and Sephardi/Ashkenazi learners are told the voice is Israeli. Gaps: (a) the two sentences read badly together ("could not say it" then "this plays the device voice"); (b) on a real phone with a Hebrew voice the first sentence may not appear; I did not test a real voice, so I do not know the wording there; (c) "Hear the word" on alef made no play call at all in headless (letter, bet and shin words did call the voice); the note was the same; I did not find out why. Offline the same note appears.

## Offline (temp copy, precache manifest regenerated in the copy, repo untouched)

Copy of src, data, assets (minus img, images, vendor, workbook) plus shell files under `/tmp`, manifest regenerated there (310 files installed, 265 on demand, 9 morph SVGs installed, chain data and card module in the install list), service worker controlling, then `setOffline(true)`. The copy is deleted after the run.
- Picture installed (first-day letters only: shin, bet, lamed, vav, mem, he, tav, mem-final): card works with picture; first-day step 1 works with picture; atlas bet with picture; zero failed requests.
- Picture seen once online (kaf): works offline.
- Picture never opened online (tsadi, nun-final, pe): card still opens with caption, hook, word, respelling and gloss; the picture slot falls back to the idea as words; one failed request and one console "Failed to load resource" for the svg. **The fallback text is clipped inside the 92 px picture button** (`mc2-offline-tsadi-no-picture.png`: "A slice of pizza with a bird perched on the" is cut off); the caption beside it carries the same idea in full, so nothing is lost, but it looks cut off. Minor.
- The committed `precache-manifest.js` in the repo was not regenerated or touched by me; whoever ships has to run `npm run precache` (the pass-1 note on this still stands, and I did not re-check the committed manifest this time).

## Still open / not tested

- Finding 5 from pass 1 (final kaf sound line mentions "k with dagesh" in a line about kh) is unchanged.
- The yellow "Sound: the list has not been loaded yet." / "the browser voice reported an error" banner sits above every page in headless; not a card issue.
- Real devices, real Hebrew voice, screen readers, dark mode and reduced motion for the 27 forms (only checked in pass 1 for a few letters), 360x640 for the 27 forms, the review deck after a missed practice question.

## Update, about 21:10 the same day (what changed since the run above)

The run above was made against the card below the tracing stage and the shared (Israeli) story text. Both have changed, and the rest of this file has not been redone. What I looked at now, from the data file, the code and one scripted run (headless Chromium, synthetic, fresh profile, tradition stored as israeli and as ashkenazi without confirming the key took effect; 375x667 and 360x640; letters alef, bet, shin, final kaf, final tsadi; 0 page errors):

- Finding 1 (card not on the first screen): addressed in `src/letters/trace.view.js`. For a letter not yet traced, the compact card (`data-first="1"`, 90 px tall) now sits above the tracing box at y 316 to 433 (it varies by letter because some letters show a review notice above it), so it is inside the first screen at both sizes. The cost is the stage: it starts at y 415 to 533 and 160 to 252 px of its 326 px is visible at 375x667 (107 to 225 px of 311 at 360x640). This run did not re-measure the stage before the move, and no one has tried tracing with the box lower. Card height with the picture shown and the later stages (findings 2, 3 and 7) was not re-measured; I only measured stage 0.
- Finding 4 (Ashkenazi story contradicts the word): addressed in the data. `data/letters/memory-chain.json` now has `storyByTradition`; for alef, nun, chet and final tsadi the Ashkenazi text carries the respelling ("cholov", "Neir", "Eitz"). I did not render the card in that setting this time.
- Finding 5 (final kaf sound line): not changed; the line still says "Same sound: kh as in loch (k with dagesh, as in the last word of the Priestly Blessing)".
- Finding 8 (precache): still true. `precache-manifest.js` (15:59) has no memory-chain file, card module or picture; `tests/offline.test.js` fails its "letter memory pictures" test for that reason (my run at 21:05). The install list in `tools/build-precache.mjs` is now 9 pictures; 19 load on demand.
- Finding 3 (alef picture): the file was changed at 20:46 after this run; one look at 200 px by me reads as a mime in a handstand; not re-measured at 88 px.
- Findings 2, 6, 7, 9 and 10 were not re-checked.
- The hooks changed (loch, hut, cup, mailbox, swim ring, shortcake, feather, nuts), so the sound lines and pictures seen in the screenshots in `docs/qa/memory-card/` for those letters are out of date.
- Related, from `docs/qa/REGRESSION-2026-11-04.md` (not mine): the scripted walk `tests/qa.walk.test.js` reported that dragging in the tracer counted no progress for alef, bet and shin in a copy taken after the new `trace.view.js` (it says the walk may need to press Animate first). I did not investigate.
