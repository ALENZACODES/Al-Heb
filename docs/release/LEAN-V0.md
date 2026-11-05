# Lean v0 route audit (2026-11-05)

Status: DRAFT audit by the builder. Nothing here was reviewed by a Hebrew speaker, teacher, designer or learner, and nothing was run on a real phone. It changes no behaviour: the only code changes are five proposed patches under `docs/release/patches/lean-v0/` (not applied).

## 1. What was checked, and what was not

Checked (ran it):
- Route table read from `src/shell/router.js` at main `0deb4f5`: **87 routes, 15 `v0`, 72 `preview`** (earlier docs say 86 and 71; the router has grown by one).
- Every one of the 87 routes was opened in headless Chrome 153 at 375x667, fresh profile, `onboarded` seeded, service worker blocked, with the app served by `tools/serve.mjs`. For each I recorded the rendered text, the Preview banner, console and network errors, listen/play controls, and the in-page links. That Chrome had **no speech voices**, so it shows the "no voice on this device" state, not what a phone with a Hebrew voice does.
- Second pass on the 15 v0 routes plus Home after one finished lesson, Letters/Atlas/First-day with a Hear/Listen tap, lesson r05, the More sheet, and the `learn` query screens.
- Tests: with the patches applied, `tests/v0.test.js`, `nav.model`, `links.preview`, `home.today`, `progress.view` and the new `v0.learn-query-banner` test pass. Across two runs, 6 other checks fail (fonts.css file check, workbook PDF check, precache skip rule, and three docs-existence checks); they need files my sparse clone does not have, and they fail identically with and without the patches. `node tools/meta/scan.mjs` and `--text`: `PASS` on the tree with the patches applied; re-run before merging.

Not checked: any real phone or screen reader; any Hebrew, stroke order, respelling or translation; any audio (none exists); the workbook list and photo reader (their assets were not in my sparse clone, so the 404 for `assets/workbook/manifest.json` in my run is my clone, not a defect); whether `Mark complete` in the lesson list changes progress claims (read, not tapped). Param routes were opened with sample ids; `fadeline` (`/fade/priestly-blessing-1`) and `grammartopic` (`/grammar/dagesh`) showed their "no such line/topic" state because my guessed ids were wrong, so those two rows rest on the parent page and code reading.

Standing facts used below (from `docs/STATUS.md`, `data/images/approvals.json`, About page text, and the runs):
- **0 of 24,906 audio clips exist.** "Listen" uses `speechSynthesis`. With no Hebrew voice the sound bar says "No sound: the browser voice reported an error." (or "Sound: the list has not been loaded yet." if tapped in the first second or so). The detail behind "Full message / Details" was empty in my run.
- **0 approved images** (`approvals: {}`). The resolver then returns nothing and views render nothing (no empty frame). The letter memory pictures are separate hand-made SVGs (`assets/letters/morph/*.svg`), shown with a "draft memory hook" note, not gated by approvals.
- Everything Hebrew is unreviewed draft.

## 2. Findings that matter for the lean cut

1. **Home after one finished lesson is a wall of tiles with no Preview label.** First run is lean (Letters, Words, Read, Progress; Words and Read carry "Preview"). After one lesson, Home shows 18 tiles plus a "More ways to learn" box of 34 more (52 links, 43 of them preview), and before patch 01 none of the preview ones said Preview (v0 and preview tiles are mixed). Patch 01.
2. **`#/learn?...` screens are preview content with no banner.** `learn` is a v0 route, so `#/learn?loanwords=1`, `?checkpoint=1`, `?ladder=1`, `?fade=1`, `?scaffold=1`, `?gender=pairs|roles`, `?dialogues=1`, `?dialogue=..`, `?spotit=..` and `?lesson=I-nn` all open without the Preview banner (confirmed in the browser). The v0 Learn page links to six of them under "More ways to practise". Most carry their own "Draft" line; `checkpoint` carries none. Patch 04.
3. **The v0 Learn page lists far more than r01 to r10.** `docs/v0/SCOPE.md` says "the lesson path r01 to r10". The page showed "0 / 71 lessons" for the reading track (r01-r51 plus 20 INTERMEDIATE) and 54 for the Israel track, behind a "Show all" button; lessons are prerequisite-locked ("You can still look around"). That is a content-scope decision (owner decision 2), not a pure gating patch.
4. **Three v0 pages send the learner to preview pages without saying so:** Progress (Open/Go/Time a read/See the service -> `read`, `vocab`, `timedread`, `service`, `firstday-ladder`), the r05 lesson ("Read" next to each prayer line -> preview reader), and Settings/Welcome/About/Credits/Privacy (-> `how`, `accessibility`). Patches 02, 03. `how` and `accessibility` are different: the v0 pages tell the learner to read them for what is and is not finished, so the honesty depends on two Preview pages (owner decision 3).
5. **The first prayer line is already inside v0.** Lesson r05 ("Meet the Priestly Blessing") shows three pointed lines with Listen buttons on the lesson page itself, so the reader is not needed for a first prayer line. It is the fifth lesson and shows "Locked: finish Shabbat Shalom: review first. You can still look around." until r04 is done.
6. **Pages whose purpose needs recordings are reachable from menus:** `listen` (retitles itself "Read and match", but the menu label still says "Listen and pick"; `docs/qa/HONESTY-AUDIT.md` item 1), `tradition-quiz` (an eye quiz), `traditions-hear`, `record-compare` (already hidden), `speak` (its model voice is the device voice). Patch 05 hides three from menus (still searchable, still open by link, still bannered).
7. **Naming clash:** locked rounds in `loanwords` and `dialogues` have a button labelled "Preview", which reads like the app-wide Preview tier.
8. **Three daily-goal units:** Home Today card "Daily goal: 5 min", Progress "5 cards a day", `daily` "20 points". Three ideas of a goal on one learner's screens.
9. **Install page copy:** "works offline, and can remind you to study", while the Offline page says it "has not been tested in airplane mode" and `docs/STATUS.md` treats Safari offline as unverified; reminders is an unreviewed preview page.
10. **Size on a phone:** Progress is 8,137 px tall for a learner with no progress; `israelsec` 46,681 px; `syllabus` 21,405 px; `gender` 18,191 px; `vocab` 15,140 px; Credits 15,463 px; Privacy 12,837 px.
11. The **Voice: Man (Ari) / Woman (Noa)** setting in v0 Settings does nothing today (the page says "saved for later").

## 3. Proposed minimal first ship

A beginner needs: pick a style, meet a letter, trace it, hear it (if the device has a voice), read a first syllable and word, repeat tomorrow, and see a first prayer line.

Ship (all already `v0`; ranked 1 to 14 in section 4):
`welcome` -> `home` -> `firstday` -> `learn` (r01 to r10; r05 holds the first prayer line) -> `letters` / `letter` / `atlas` -> `progress` -> `settings` (with backup/restore/delete), `about`, `privacy`, `credits`, `offline`, `install`, `search`.

Promote or fold in before ship (owner decisions 3): `how` into About (or promote), `accessibility` (already linked from Settings and Welcome).

Keep as Preview, reachable but not pushed: `read`/`text` (the reader the lessons link to), `sounds`, `loanwords`, `typing`, `workbook`, `fade`, `placement`, `calendar`, `vowelboard`, `syllablechips`.

Hide until content is reviewed (menus and Home only; direct links and search still work, banner stays): everything in the Israel track (`israel`, `dialogues`, `gender`, `roles`, `gender-drill`, `speak`) pending owner decision 1; everything for teachers (`classtrack`, `share`, `classsummary`); the audio-only pages (patch 05 plus `speak`, `record-compare`); and the planning/dev pages (`scheduler`, `known-words`, `time-budget`, `syllabus`, `daily`).

Reduce, not remove: the INTERMEDIATE lessons in the v0 Learn list, and the Israel track chip, are the largest unreviewed volume inside a v0 route (owner decision 2).

## 4. Ranked recommendations

Rank = how early it should be in the first ship or promoted after it (1 = most needed by a beginner). Ranks 1 to 14 are the 15 v0 routes in path order (`letters` and `letter` share rank 5); 16 onward are preview routes in "closest to promotable" order, then merge, then hide. Variants of one screen share the parent's rank.

| Rank | Route(s) | Recommendation |
|---|---|---|
| 1 | welcome | keep in v0 |
| 2 | home | keep in v0 (patch 01; owner decision 4) |
| 3 | firstday | keep in v0 |
| 4 | learn | keep in v0 (patches 03, 04; owner decisions 1, 2) |
| 5 | letters, letter | keep in v0 |
| 6 | atlas | keep in v0 |
| 7 | settings | keep in v0 |
| 8 | progress | keep in v0 (patch 02; lean it) |
| 9 | about | keep in v0; fold `how` in |
| 10 | privacy | keep in v0 |
| 11 | credits | keep in v0 |
| 12 | offline | keep in v0 |
| 13 | install | keep in v0; fix copy (decision 5) |
| 14 | search | keep in v0 |
| 16 | how | merge into `about` or promote to v0 |
| 17 | accessibility | promote to v0 after an evidence line (decision 3) |
| 18 | read, text | keep preview; first to promote; absorb `timedread` |
| 19 | sounds | keep preview |
| 20 | loanwords, loanword | keep preview; rename its "Preview" button |
| 21 | workbook | keep preview |
| 22 | typing | keep preview |
| 23 | fade, fadeline | keep preview; absorb `nikkud-fade` |
| 24 | firstday-ladder | merge into `firstday` |
| 25 | placement | keep preview |
| 26 | calendar | keep preview |
| 27 | syllablechips | keep preview |
| 28 | vowelboard | keep preview; absorb `niqquddial`, `dottile` |
| 29 | spotit | merge into Letters "Look-alikes" |
| 30 | checkpoint | merge into Letters "Look-alikes" |
| 31 | vocab | keep preview (do not feature on first-run Home, decision 4) |
| 32 | service | keep preview |
| 33 | torahread, torahreadsec | keep preview |
| 34 | festivals, festival | keep preview |
| 35 | morning | keep preview |
| 36 | grammar, grammartopic | keep preview |
| 37 | rules, rules-page | keep preview |
| 38 | compare | keep preview; absorb `record-compare` later |
| 39 | read-my-way | keep preview |
| 40 | trope | keep preview |
| 41 | soundgap | keep preview |
| 42 | timedread | merge into `read` |
| 43 | ladder | merge into the lesson path |
| 44 | intermediate, intermediatelesson | keep preview; hide from the v0 Learn list (decision 2) |
| 45 | vocab-themes | keep preview |
| 46 | sprint | keep preview |
| 47 | wordtrace | keep preview |
| 48 | scan | keep preview |
| 49 | reminders | keep preview |
| 50 | share | keep preview (teacher/self) |
| 51 | classtrack, classtrackweek, classtrackmode | hide until a teacher has used it |
| 52 | syllabus | keep preview, absorb `time-budget` |
| 53 | daily | hide until the goal units agree (finding 8) |
| 54 | traditions, traditions-guide | keep preview |
| 55 | speak | hide until a model voice exists (decision 1/4) |
| 56 | israel, israelsec, dialogues, dialogue | hide until reviewed (decision 1) |
| 57 | gender, roles, gender-drill | merge into one page; hide until reviewed |
| 58 | roots | hide until reviewed (28% of verbs have roots) |
| 59 | listen, tradition-quiz, traditions-hear | hide from menus (patch 05) |
| 60 | torahreader, niqquddial, dottile, nikkud-fade, record-compare, scheduler, known-words, time-budget, classsummary | already hidden in `PREVIEW_HIDDEN`; keep hidden |

## 5. Route by route

Reading the tables. **Reach**: BAR bottom bar (only Learn and Progress, plus More); SHEET More sheet v0 section; PV Preview group in the More sheet (collapsed); H1 Home first-run row; HF Home after a finished lesson; TODAY Home Today card; `<-x` linked from x; every static route is also in SEARCH (labelled Preview) and opens by URL. **State** = with 0 audio and 0 approved images. **Honest?** whether the page tells the learner that state. Data paths are under `data/` and come from the view's own folder; shared libraries (letters, niqqud, corpus registry) are left out.

### 5.1 The 15 v0 routes

| # | Route | Purpose | Reach | Depends on | State | Honest? | Quality risks | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 1 | welcome `/welcome` | First-run: goal, can you read, pronunciation style, then plan | Home redirect until onboarded; Settings "Run first-time setup again" | onboarding/plans.json, curriculum/lessons.json | Text only; no audio, no images | Yes (draft placement note, "saved only on this device") | Offers goal "Speak in Israel" (drafts); "Yes, I can read" leads to preview placement; links preview `how`, `accessibility` | Keep |
| 2 | home `/` | Today card, next action | SHEET; landing | curriculum, progress stores | First run: 4 rows. After a lesson: 18 + 34 tiles, 43 of them preview and unlabelled (HF) | Partly (Today links say Preview; HF tiles do not) | Finding 1; first-run row shows Words and Read (Preview) | Keep; patch 01 |
| 3 | firstday `/firstday` | Five 2-minute steps: letter, letter, vowel, syllable, word | H1/TODAY; SHEET; `<-progress`, `home` | firstday/first10.json, onramp.json, ladder.json, letters, morph SVGs | Hear it -> "No sound: the browser voice reported an error." (no voice); pictures are the SVG memory card | Yes ("Draft, unreviewed"; names missing Sephardi audio) | Needs a Hebrew voice to be useful; the instruction "Tap Hear it" is given before any voice check | Keep |
| 4 | learn `/learn` | Lesson path, review of due cards, plus query-driven practice screens | BAR; SHEET; many links | curriculum/lessons.json (125 lessons), belts, corpus registry, vocab words | Listen buttons -> same error; image slots render nothing | Yes for audio ("About this lesson (draft content)"); no for tier (finding 2) | 71 reading + 54 Israel lessons vs "r01 to r10"; INTERMEDIATE unlabelled; one-tap "Mark complete" on the list (seen, not tapped); "More ways to practise" = preview screens | Keep; patches 03, 04; decisions 1, 2 |
| 5 | letters `/letters` | Trace letters, look-alikes, typing tab | SHEET; H1; `<-home`, `workbook`, `wordtrace` | letters/*.json, memory-chain.json, morph SVGs | No Hear control found by my script on the page; memory card shows SVG | Yes ("Draft: ... stroke order and shapes") | Strokes unverified by a teacher; shape check is rough (honesty audit item 23); needs touch | Keep |
| 6 | letter `/letters/:id` | One letter's trace page | `<-letters`, `firstday` | same | same | same | same | Keep |
| 7 | atlas `/letters/atlas` | 27-letter atlas: sound, name, quiz | SHEET; HF | letters.json, memory-chain.json | "Hear the sound" -> error without a voice; no recording note on the page before the tap | Partly | Tile says "hear its sound" with no voice caveat until tapped | Keep |
| 8 | settings `/settings` | Voice, tradition, goal, comfort, backup/restore/delete, reset | SHEET; `<-progress`, `firstday`, `privacy`, `offline`, `about` | audio/summary.json, images/approvals.json | Says "no recorded voices yet" | Yes ("What is ready, and what is not") | Man/Woman control has no effect yet; links to preview `accessibility`, `how` | Keep |
| 9 | progress `/progress` | What you practised, due cards, goals, milestones, backup | BAR; SHEET; H1; `<-home`, `share`, `privacy` | progress/*, timedread/gates.json, service/orders.json, firstday/ladder.json | All zeros for a new learner | Yes (self-reported rows labelled; "None of it is a fluency score") | 8,137 px tall at zero; links to 4-5 preview pages unlabelled; daily-goal units differ from Home | Keep; patch 02; lean the page |
| 10 | about `/about` | What ALEF is and what is ready | SHEET; `<-credits`, `privacy`, `how` | audio/summary.json, images/approvals.json | States 0 of 24,906 clips, pictures none approved | Yes | Duplicates parts of `how` | Keep; fold `how` in |
| 11 | privacy `/privacy` | Local-only data, what can leave the device | SHEET; `<-credits`, `about` | none | n/a | Yes (names Say it speech recognition) | 12,837 px; describes preview features (Say it, Scan) | Keep |
| 12 | credits `/credits` | Sources and licences | SHEET; `<-` nine preview pages | legal/attributions.json | n/a | Yes ("not checked by a lawyer") | 15,463 px; licence open questions are the owner's (`docs/legal`) | Keep |
| 13 | offline `/offline` | What is saved for offline use | SHEET | precache manifest, audio shards, vocab packs | "0 of 338 files saved" in my run (service worker blocked, so expected) | Yes ("has not been tested in airplane mode") | Safari offline unverified (STATUS) | Keep |
| 14 | install `/install` | Add to home screen | SHEET | none | n/a | Partly (finding 9) | Copy overstates offline and reminders | Keep; fix copy |
| 15 | search `/search` | Pages, letters, words | SHEET | letters.json, vocab packs (lazy) | Empty state only | Yes (preview results labelled "Preview") | Surfaces every preview and hidden page by name | Keep |

### 5.2 Preview routes: letters, lessons, practice (opened through `learn` or its own path)

| Route | Purpose | Tier | Reach | Depends on | State | Honest? | Quality risks | Recommendation |
|---|---|---|---|---|---|---|---|---|
| loanwords `/loanwords`, loanword `/loanwords/:group` | Israeli-used international words readable once letters are known | preview | PV, HF; link from Learn as `/learn?loanwords=1` (no banner) | curriculum/loanwords.json | Text only | Yes (draft, "Sounds like" respelling) | Locked rounds say "Preview"; words unreviewed | Keep preview (rank 20) |
| spotit `/spotit/:letter` | Tap every instance of a letter among look-alikes | preview | URL; Progress weak-spot rows | content built from letters, confusables | Text only | Yes (draft line) | Overlaps Letters "Look-alikes" | Merge into Letters (29) |
| checkpoint `/checkpoint` | Look-alike letter check | preview | PV, HF | lessons, confusables | Empty state for a new learner ("Nothing to check yet") | No draft line | Empty for the target user | Merge into Letters (30) |
| dialogues `/dialogues`, dialogue `/dialogues/:id` | Israel dialogues (cafe, taxi...) with transliteration | preview | PV, HF | curriculum/dialogues.json | Text; "There is no audio for them yet" | Yes | Locked items say "Preview"; gendered speakers unreviewed | Hide until reviewed (56) |
| ladder `/ladder` | 30-level syllable ladder | preview | PV, HF | pronunciation data | Listen -> error without a voice | Yes (names the missing recordings) | Overlaps `syllablechips` | Merge into lesson path (43) |
| fade `/fade`, fadeline `/fade/:id` | Fade-out recall of prayer lines | preview | PV, HF | corpus/registry.json, phrasebook.json | Text; page says prayer text is machine-compared to its source, not proofread | Yes | Needs completed lessons to be useful | Keep preview (23) |
| scaffold `/scaffold` | Read without Latin letters | preview | PV, HF | word cards from lessons | Empty until a lesson is done ("You have no word cards yet") | Yes | Empty for new learner | Keep preview (hold) |
| gender `/gender`, roles `/gender/roles` | Gender pair cards; "say it as me" | preview | PV, HF | curriculum/gender-pairs.json, phrasebook | "No recordings exist yet" shown; 18,191 px | Yes | Gendered forms unreviewed; long page | Merge with `gender-drill`; hide (57) |
| intermediate `/intermediate`, intermediatelesson `/intermediate/:id` | 20 to 50 intermediate siddur lessons | preview | PV, HF; `<-learn`; same lessons are also in the v0 Learn list | lessons-intermediate/I-*.json | I-01 has 12 Listen buttons -> error without a voice | Yes (draft, "machine transliteration, not a recording") | Unlabelled inside v0 `learn` (finding 2/3) | Keep preview; hide from Learn list (44) |
| placement `/placement` | 20-question check that suggests a lesson | preview | PV, HF; TODAY; `<-welcome` | placement/config.json, vocab words | Text only | Yes ("cutoffs are untested guesses") | Untested cutoffs steer a beginner | Keep preview (25) |
| firstday-ladder `/firstday/ladder` | Pointed to unpointed word ladder | preview | PV, HF; `<-nikkud-fade` | firstday/ladder.json | Hear it -> error without a voice | Yes | Overlaps `nikkud-fade`, `firstday` | Merge into `firstday` (24) |

### 5.3 Preview routes: reading, sounds, pronunciation

| Route | Purpose | Tier | Reach | Depends on | State | Honest? | Quality risks | Recommendation |
|---|---|---|---|---|---|---|---|---|
| read `/read`, text `/read/:textId` | Prayer and Torah reader, 70 corpus records, phrasebook | preview | H1 (Words, Read row); HF; `<-progress`, lessons, festivals, classtrack | corpus/registry.json, reader data | 18 play controls; "Play line" tapped early gave "Sound: the list has not been loaded yet."; page title "Reading a prayer line without hearing it" | Yes | Text machine-compared to sources, not proofread; 70 records unreviewed | Keep preview, first to promote (18) |
| sounds `/sounds` | Vowel chart and consonant descriptions per tradition | preview | PV; `<-read` | pronunciation/*.json | 15 tap-to-hear controls (not tapped); 12,251 px | Yes (draft) | Descriptions unreviewed; long | Keep preview (19) |
| syllablechips `/syllablechips` | Stress chips | preview | PV, HF; `<-read` | pronunciation data | "no recorded audio" stated | Yes | Draft | Keep preview (27) |
| vowelboard `/vowelboard` | Vowel families | preview | PV, HF; `<-classtrack` | pronunciation data | Stated | Yes | Draft | Keep preview; absorb the next two (28) |
| niqquddial `/niqquddial`, dottile `/dottile` | Same vowel signs, dial and dot toggle | preview | URL (hidden) | same | Stated | Yes | Duplicates | Hidden; merge into `vowelboard` |
| soundgap `/soundgap` | English-speaker traps (chet vs h) | preview | PV, HF | pronunciation/soundgap.json | Many "(no audio yet)" labels | Yes | Repetitive labels; draft | Keep preview (41) |
| rules `/rules`, rules-page `/rules/:rule` | Seven pronunciation rules | preview | PV, HF | pronunciation/runtime/rules.json | "no recording exists" | Yes | Rule-generated, unverified | Keep preview (37) |
| compare `/compare` | Same text in three traditions | preview | PV, HF; TODAY; `<-rules` | pronunciation runtime | Same note | Yes | Rule-generated | Keep preview (38) |
| read-my-way `/read-my-way` | Convert pointed text to a tradition | preview | PV, HF | same | Same note | Yes | Words outside the table are dropped | Keep preview (39) |
| tradition-quiz `/tradition-quiz` | Which tradition is this reading | preview | PV, HF | same | Says it is an eye quiz | Yes | Little value without audio | Hide from menus (59, patch 05) |
| traditions `/traditions`, traditions-guide, traditions-hear | Which tradition to learn; hear the difference | preview | PV, HF | traditions/*.json | Hear tab has nothing to play | Yes | Hear tab empty | Keep `traditions`; hide `traditions-hear` (patch 05) |
| trope `/trope` | Names of cantillation marks | preview | PV, HF | corpus/trope/*.json, trope-trainer/levels.json | Names only | Yes (machine parse of UXLC) | Mark names unreviewed | Keep preview (40) |
| torahread `/torahread`, torahreadsec `/torahread/:section` | Torah reading ladder | preview | PV, HF; `<-festivals`, `nikkud-fade` | none beyond corpus | Listen -> error | Yes | Large | Keep preview (33) |
| torahreader `/torahreader` | Marks on Priestly Blessing and Shema | preview | hidden | corpus/reader, trope | "plays no chanting" | Yes | Duplicates `torahread` | Keep hidden |
| nikkud-fade `/nikkud-fade` | Fade vowel marks over stages | preview | hidden; `<-torahread` | nikkudfade/*.json | Text only | Yes | Same idea as `fade` | Hidden; merge into `fade` |
| timedread `/timedread` | Self-timed read-aloud | preview | PV, HF; `<-progress` | timedread/gates.json | Locked until a line is decodable | Yes (self-reported; speech recognition may send audio) | Same texts as `read` | Merge into `read` (42) |
| typing `/typing` | Typing Hebrew letters and words | preview | PV, HF; TODAY | typing/drills.json, keyboard layout | No audio, no images | Yes (draft) | None audio-related | Keep preview (22) |
| scan `/scan` | OCR a printed page | preview | PV | corpus registry, vendor OCR (optional 5 MB download) | No audio; OCR assets not in my clone, so not run | Yes ("tested on 145 computer-generated images, about 88%") | Not measured on real photos | Keep preview (48) |

### 5.4 Preview routes: vocabulary, Israel, speaking

| Route | Purpose | Tier | Reach | Depends on | State | Honest? | Quality risks | Recommendation |
|---|---|---|---|---|---|---|---|---|
| vocab `/vocab` | 5,000-word list, browse and review | preview | H1 ("Words"); HF; `<-home`, `progress` | vocab/packs/vocab5k-tier-N.json (lazy) | 40 Listen buttons, each labelled "Device voice, not a recorded teacher"; 15,140 px | Yes ("built by a program from Wiktionary... expect wrong glosses") | Shown to a first-run learner as "Words"; list unreviewed | Keep preview; off first-run Home (31) |
| vocab-themes `/vocab/themes` | 40 theme packs | preview | PV, HF | vocab/themes/*.json | Image slots render nothing | Yes | Same source | Keep preview (45) |
| sprint `/sprint` | 5-minute word cards | preview | PV, HF | vocab packs, israel/scenarios.json | No audio | Yes | Same source | Keep preview (46) |
| wordtrace `/words/trace` | Trace words | preview | PV, HF | letters data | No audio | Yes | Extends tracing | Keep preview (47) |
| speak `/speak` | Say words aloud; speech recognition; shadowing | preview | PV, HF; TODAY | speak/sets/*.json | "no recorded clips exist yet, so Listen uses the browser's voice" | Yes | Needs microphone; browser may send audio off device (Privacy covers it); suggested on the Today card | Hide until a model voice exists (55) |
| record-compare `/record-compare` | Record yourself against a model voice | preview | hidden | speak data | Model voice is device speech | Yes | No recordings | Keep hidden |
| listen `/listen` | Listen-and-pick drill | preview | PV, HF | listen/config.json, vocab words | Retitles to "Read and match" and says it is not listening | Yes on the page; menu label still "Listen and pick" | Name mismatch | Hide from menus (59, patch 05) |
| israel `/israel`, israelsec `/israel/:sec` | Register ladder, fillers, "gives you away", etiquette | preview | PV, HF | israel/*.json | "no audio for any of this yet"; section pages up to 46,681 px | Yes ("written from general knowledge") | Unreviewed Modern Hebrew; very long | Hide until reviewed (56) |
| gender-drill `/gender-drill` | Drill gender forms | preview | PV, HF | gender/templates.json, gender-pairs.json | No audio | Yes | Adjectives not drilled | Merge into the gender page; hide (57) |
| roots `/roots` | Roots and verb families | preview | PV, HF | roots/*.json | No audio | Yes ("roots listed for 501 of 1820 verbs") | Loose links | Hide until reviewed (58) |
| grammar `/grammar`, grammartopic `/grammar/:topic` | Short grammar notes | preview | PV, HF | grammar/notes.json, vocab words | No audio | Yes ("built by a program") | Program-built notes | Keep preview (36) |

### 5.5 Preview routes: calendar, daily use, teacher, planning, help

| Route | Purpose | Tier | Reach | Depends on | State | Honest? | Quality risks | Recommendation |
|---|---|---|---|---|---|---|---|---|
| calendar `/calendar` | Hebrew date, parsha, candle times, morning prompt | preview | PV; `<-festivals`; Home "Open today's prompt" | calendar/*.json, location (opt-in) | No audio | Yes ("Draft, not reviewed by clergy") | Location opt-in for candle times | Keep preview (26) |
| festivals `/festivals`, festival `/festivals/:id` | This week's festival words and links | preview | PV, HF; TODAY | festivals/*.json | No audio; image slots empty | Yes | Links into `read` | Keep preview (34) |
| morning `/morning` | Morning verse and Modeh Ani | preview | PV, HF; TODAY | morning-verses.json, registry | No audio | Yes ("Draft wording and layout") | Devotional framing, "final text to be approved" | Keep preview (35) |
| service `/service` | Follow a prayer service | preview | PV, HF; `<-progress` | service/orders.json | 5 audio-type controls matched by my script; not tapped | Yes (11 parts not in ALEF) | Coverage numbers are content counts | Keep preview (32) |
| workbook `/workbook` | Printable tracing PDFs | preview | PV, HF | assets/workbook (13 MiB PDFs, not precached) | Not testable in my clone | Yes ("not saved for offline automatically") | Needs online | Keep preview (21) |
| reminders `/reminders` | Study notifications | preview | PV, HF | calendar/locations.json | No audio | Yes (Shabbat quiet needs a city) | Notification permission; unreviewed | Keep preview (49) |
| share `/share`, classsummary `/classsummary` | Send progress to a teacher; class table | preview | PV/HF (`share`); hidden (`classsummary`) | teacher module, progress | No audio | Yes (consent box) | Teacher use; data leaves device only by user action | Keep `share`; keep `classsummary` hidden (50) |
| classtrack `/classtrack`, classtrackweek `/classtrack/:week`, classtrackmode `/classtrack/:week/:mode` | Week-by-week class track and handouts | preview | PV, HF | curriculum/class-track.json | No audio | Yes | For classes; links into `read`, `vowelboard` | Hide until a teacher uses it (51) |
| syllabus `/syllabus`, time-budget `/time-budget` | Syllabus and goals; hours estimate | preview | PV; hidden | lessons.json | No audio | Yes (hours range unsourced, says so) | 21,405 px; estimates, not measurements | Keep `syllabus`; `time-budget` hidden, merge in (52) |
| daily `/daily` | Daily goal, points, quests, badges | preview | PV | preview/loops/*, local store | No audio; badge art file exists (`preview/loops/badges.art.js`), not examined | Yes ("not tried with learners") | Third goal unit (finding 8); points and quests | Hide until goals agree (53) |
| scheduler `/scheduler` | Explain review spacing (FSRS) | preview | hidden | none | Text | Yes (explanation only) | Developer page | Keep hidden |
| known-words `/known-words` | Check pasted text against the word list | preview | hidden | knownwords/index.json | Text | Yes | Author tool | Keep hidden |
| how `/how` | How this works, what is finished | preview | PV; `<-` Settings, About, Credits, Privacy, Welcome, sound bar | none | n/a | Yes | A v0 promise rests on a Preview page; 7,266 px | Merge into About or promote (16) |
| accessibility `/accessibility` | Accessibility settings and statement | preview | PV; quick row in Settings; `<-welcome` | audio and image summaries, legal | n/a | Yes | Preview by SCOPE exception; only automated checks exist | Promote after an evidence line (17) |

## 6. Proposed patches (not applied)

Files in `docs/release/patches/lean-v0/`, made against main `0deb4f5`. Each passes `git apply --check`; all five apply together; with all five applied `tests/v0.test.js`, `nav.model`, `links.preview`, `home.today`, `progress.view` and the new test pass and `node tools/meta/scan.mjs` passes. None changes what a v0 route does; each adds a label or banner, or removes a menu entry for a page that still opens by link. If a patch is applied, run `node tools/build-precache.mjs` (they touch `src/`).

| Patch | Change | Why |
|---|---|---|
| `01-home-label-preview-tiles.patch` | Home tiles and links to preview routes get " (Preview)" (as the Today card already does) | Finding 1 |
| `02-progress-label-preview-links.patch` | Progress links to preview routes (Open, Go, Time a read, See the service) get " (Preview)" | Finding 4 |
| `03-lesson-label-preview-read-link.patch` | "Read" next to a lesson's prayer line says " (Preview)" | Finding 4 |
| `04-banner-on-preview-learn-screens.patch` | Banner on `#/learn?loanwords\|spotit\|checkpoint\|ladder\|fade\|gender\|scaffold\|dialogues\|dialogue` and `?lesson=I-nn` (not on `?review=1`); adds `tests/v0.learn-query-banner.test.js` | Finding 2 |
| `05-hide-audio-only-routes-from-menus.patch` | `listen`, `tradition-quiz`, `traditions-hear` added to `PREVIEW_HIDDEN`, and their rows in `docs/v0/PREVIEW-TRIAGE.md` changed to hide | Finding 6 |

Apply with `git apply docs/release/patches/lean-v0/NN-*.patch`. Main moves often: re-run `git apply --check` first.

## 7. Owner decisions (separate from the patches)

1. **Israel track in v0?** The `learn` page offers "Speak in Israel" (54 lessons) and Welcome offers it as a goal. All of it is unreviewed Modern Hebrew with no audio. Ship reading only, or ship both with the draft labels?
2. **How much of Learn to show.** SCOPE says r01 to r10; the page lists 71 reading lessons including 20 INTERMEDIATE. Limit the list to r01-r10 (a view change, not a patch)? Keep the one-tap "Mark complete" on the list?
3. **`how` and `accessibility`.** Promote to v0 (each needs the four exit criteria in `SCOPE.md`) or fold `how` into About and keep `accessibility` as the Settings exception?
4. **Beginner suggestions.** First-run Home shows "Words (Preview)" (a 5,000-word program-built list) and "Read (Preview)"; the Today card suggests Say it, Typing, Festivals, Compare. Keep these for a beginner?
5. **Install copy.** Reword "works offline, and can remind you to study" until offline is checked on real phones and reminders are reviewed.
6. **Divine name.** Lesson r05 and the reader show the pointed divine name in the Priestly Blessing; Settings has a `writeGodAsGd` option I did not examine. Which default for a first release, and who signs it off?
7. **Labels.** Rename the inner "Preview" button on locked loanword/dialogue rounds; decide whether the Man/Woman voice control stays in Settings before recordings exist; unify the daily-goal unit.
8. **Merges.** The triage's merges (`timedread` into `read`, `spotit`/`checkpoint` into Letters, `ladder` into the path, the three gender pages into one) are engineering work; say which come before the first ship.
9. **What "ship" means for audio.** Without a Hebrew voice on the phone, the first Hear tap ends in a generic error line. Decide whether the sound bar needs a plain sentence ("This phone has no Hebrew voice and ALEF has no recordings yet").
