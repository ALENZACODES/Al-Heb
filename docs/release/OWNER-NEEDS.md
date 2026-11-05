# What only people can supply: checklist for the 38 handoff items

Status: DRAFT checklist, written 4 November 2026. Source: `docs/release/HANDOFF-LEDGER.md` (item numbers below are the ledger's). Nothing here was checked against the app again, and nothing has been reviewed by anyone. Where I add a pointer that the ledger itself does not make, it is marked "outside the ledger".

How to use it: tick a box only when the thing exists and has been looked at by the person named. A ticked box does not close a ledger item by itself; the ledger's acceptance line for that item still applies.

## Items that need no person (engineering only)

04, 06, 23, 28 and 35 need no human input to proceed, apart from item 35's manual cases (see Owner, section 4). Items 01, 02, 03 and 05 are engineering work, with the few owner points listed below.

---

## 1. Owner (John)

### 1.1 Files from the Windows PC

The ledger (section 1) says the folders `outputs/lane1` to `outputs/lane6` and `C:\` paths cited by the handoff do not exist in this environment, and that a search for the cited file names found no match. **The ledger does not list the individual file names**, so I cannot give them to you without inventing them. What it does give is the lane and the item each file belongs to. Please copy the files named in the handoff for each row below, using the exact names the handoff used, and tell me if a name is missing.

| Ledger item | What is missing | Lane folder (per ledger) |
|---|---|---|
| 07 | Listening worksheet and its answer key | lane4 |
| 08 | Reading-blank worksheet and key | lane4 |
| 09 | Weekly quiz files and keys | lane4 |
| 10 | Files where the pronunciation fields disagree | lane2 |
| 11 | Letter recording takes (the ambiguous ones) | lane3 |
| 15 | The delivered artwork package (39 illustrations, 117 exports) and the lane drafts | not stated |
| 16 | The handoff's "item 28" lexical-contrast files (34 contrasts short) | lane2 |
| 17 | The handoff's "item 79" screen list | lane5 |
| 18 | The handoff's "item 43" import files (two shapes) | lane3 |
| 19 | The handoff's "item 25" conjugation files | lane2 |
| 20 | The quiz-week list and the class plan | lane4 |
| 21 | The two review registers | lane5 |
| 22 | The recording scripts | lane3 |
| 24 | The package rows L2-031-001 and L2-021-050 | not stated |
| 25 | The prayer-cue proposals | lane3 |
| 26 | The tradition-label files | lane3 and lane2 |
| 31 | The book masters (print files) | not stated |
| 32 | The 340 new test cases (the handoff's items 73 to 77) | lane5 |

Observation, not from the ledger: files with lane names (for example under `docs/drafts/inbox/lane1` to `lane6`) are now present in the working tree, whereas the ledger found those folders empty. I have not checked whether they are the same files the handoff cites. Please confirm which set is the source of truth before anyone reviews either.

- [ ] Copy the files above and confirm each by exact name.
- [ ] Say which of these are final and which are still drafts.

### 1.2 Decisions only the owner can make

- [ ] Item 14: approve the concept map (concept, letter, asset file) for the letter pictures. The ledger notes the owner's stated direction (a woman character and a neutral cat) cannot be verified from the repository. The mime concept is still in the sources. Say whether the mime is retired.
- [ ] Item 15: say which delivered artwork, if any, you approve. The ledger records that every image is currently unapproved.
- [ ] Item 12: after a reviewer gives wording (section 2), accept it and record the decision.
- [ ] Item 13: after a reviewer decides the garden word form (section 2), accept it and record the decision.
- [ ] Item 03: decide whether any of the other curriculum writes that still swallow errors count as critical (the ledger lists them as "adjacent, not confirmed as bugs").
- [ ] Item 02: say whether a build served from a repository subpath is meant to ship (the ledger says it is either tested or documented as not shipped).
- [ ] Item 05: decide whether the calendar page stays excluded from the contrast check, and give a reason, owner and retest condition for any exemption you keep.
- [ ] Item 22: choose the voice or community for the recordings, the permissions, and the review states, and approve the clip ID scheme. The ledger says do not generate audio.
- [ ] Item 36: approve which asset categories are placeholders or duplicates before anything is removed (the ledger says nothing is deleted just to lower counts).
- [ ] Item 38: approve the final wording of the release documents once the other items close or are marked open (`README.md`, `docs/STATUS.md`, `docs/HANDOFF.md` were modified and not read for the ledger).
- [ ] Item 21: approve the status words for the review registers (fixed, remaining, unverified, out of scope).

### 1.3 Runs, accounts and access

- [ ] Item 01: allow or trigger one run of the automated build on a hosted runner and share the result. The ledger says the browser job has not yet been run on a hosted runner and that one green run must be recorded before the non-blocking setting is dropped. This needs the repository host account and permission to run it.
- [ ] Item 06: after a green run, confirm the resolved package versions so the loose Python version ranges can be tightened.
- [ ] Item 22: arrange the people who record (actors and reviewers) and any studio or room.
- [ ] Item 33 and 34: provide or arrange physical devices (phones, tablets, an older computer), and a screen reader and voice-control setup, or a tester who has them.
- [ ] Item 35: run or arrange the manual backup, restore and clear-data cases the ledger lists as untested: cancelling the file picker, the browser offline cache after delete, and a browser where storage is denied. Record environment and result for each.
- [ ] Item 30: arrange a neutral group of learners for the placement study. The cutoffs are not to change before that.
- [ ] Item 34: record the results of the real-device and offline matrix once devices exist.

### 1.4 A real contact channel (outside the ledger)

The ledger does not name this as an item. It is needed for recruiting the reviewers below and for the learner study (items 22, 29, 30, 34), so I list it here.

- [ ] Choose one real address or form where reviewers and learners can reach you, and tell me which, so it can be put in the review packets. No such channel is recorded in this checklist's sources.

### 1.5 Licences and accounts (outside the ledger)

These come from other repository documents, not the ledger. They bear on item 38 (release documents must match real status) and are listed so they are not forgotten.

- [ ] Code licence: `docs/STATUS.md` says none is chosen (no `LICENSE` file). See `docs/legal/DECISIONS-FOR-JOHN.md` and `docs/legal/LICENCE-OPTIONS.md`.
- [ ] Share-alike content: `docs/STATUS.md` records that the vocabulary data is share-alike and that whether this reaches the app is an open legal question (see the lawyer, section 6).
- [ ] Hosting: `docs/STATUS.md` says no host account exists and nothing is deployed. An account is needed before any go-live (`docs/deploy/GO-LIVE-CHECKLIST.md`).
- [ ] The licence wording asserted in `tests/torahread.view.test.js` is unresolved per `docs/release/MERGE-PLAN.md` (CC0 versus CC BY-SA); someone must check it against the source record.

---

## 2. Hebrew native speaker or Hebrew teacher

Per the ledger's lane notes, native-speaker or community review is needed for 12, 13 and 24 to 26. The rest below is the ledger's "Hebrew/content" lane, where a reviewer is the only way to close the item. Blank means not reviewed; do not ask for a blanket OK on a file.

- [ ] Item 12: confirm wording for the ayin fields (`sound`, `soundAnchor`, `story`, `altStory`, `caption`, and the memory-chain story and tradition lines) so that none presents one community's pronunciation as universal. A qualified reviewer must confirm; a decision is recorded.
- [ ] Item 13: decide the garden word form, `גָּן` or `גַּן`, or two forms with a stated reason. The ledger makes no claim about which is right.
- [ ] Item 10: rule on the rows where the pronunciation fields disagree (needs the lane2 files from section 1.1).
- [ ] Item 11: listen to the letter recording takes and say which is the correct one where takes are ambiguous (needs the lane3 files and audio).
- [ ] Item 16: supply or approve the 34 missing lexical contrasts.
- [ ] Item 18: say which of the two import shapes is correct.
- [ ] Item 19: decide whether the work is a full conjugation resource or something narrower, and check the forms.
- [ ] Items 24 and 27: give a reviewed set of example words with sources, and decide L2-031-001 and L2-021-050. The ledger says the stress exception list holds a single placeholder entry and that rows should be added only from reviewer-supplied rows.
- [ ] Item 25: approve, change or reject each proposed prayer cue.
- [ ] Item 26: say which tradition labels are too broad and give the right ones.
- [ ] Item 22: act as listener on any recordings made, and check the clip review states. No recorded voice exists yet.
- [ ] Item 37: do a read-through of the rendered app (letter-name versus sound self-ratings, vocabulary exposure, service-guide scope, tradition choice, first-session travel relevance). The ledger did not render the app.
- [ ] Items 07, 08, 09, 20 (outside the ledger's wording): the ledger gives these to the book/assessment lane and names no reviewer. A teacher would need to confirm the corrected answer keys and the quiz-week mapping once the owner supplies the files.

### Handwriting teacher (a Hebrew teacher who teaches writing)

- [ ] Item 29: approve the print and cursive letter forms and the stroke order. The ledger says only a qualified handwriting teacher can do this and that the draft warnings must stay until then.
- [ ] Item 33: where relevant, check that stroke descriptions read sensibly to a learner (the ledger lists accessibility as the owner of the code).

---

## 3. Rabbi

Ledger items 12, 13, 24 to 26 call for native-speaker or community review. Which of those need clergy specifically is not stated by the ledger; the assignments below follow `docs/review/WHO-CAN-HELP.md` (outside the ledger) and should be confirmed.

- [ ] Item 25: approve or reject the proposed prayer cues for liturgical content and meaning.
- [ ] Item 26: advise on the tradition labels so that no tradition is described too broadly or one community's practice is not presented as the rule.
- [ ] Item 12: confirm, for the ayin text, that the per-tradition lines are acceptable.
- [ ] Items 24 and 37: check any rule-generated reading or app copy that touches religious content, including divine-name handling.

---

## 4. Cantor

The ledger does not name a cantor. Following `docs/review/WHO-CAN-HELP.md` (outside the ledger):

- [ ] Item 25: check the prayer cues for liturgical pronunciation and nusach.
- [ ] Item 26: check the tradition labels where they affect how a prayer is read.
- [ ] Item 22: if prayer recordings are made, act as the reviewer of their pronunciation; the ledger says no recorded voices exist.

---

## 5. Designer / illustrator

- [ ] Item 14: with the owner, produce the single approved map (concept, letter, asset file) and replace the retired mime artwork; the ledger says the asset names, the picture ideas and the memory-chain picture fields must all follow it.
- [ ] Item 15: deliver the package (39 illustrations, 117 exports) to the owner for transfer, and mark which are final. The repository currently lists zero real image files in the image index.
- [ ] Item 36: say which of the roughly 800 placeholder files are meant to be replaced, and which duplicates are intended. The ledger records counts that differ between the two trees (2,373 and 3,485 image files).
- [ ] Item 36: confirm usage rights for each image that ships (outside the ledger; see section 6).

---

## 6. Lawyer

The ledger names only one legal point (item 22, permissions for recordings). The rest is from `docs/STATUS.md` and `docs/legal/*` (outside the ledger), which say plainly that no lawyer has reviewed any of it.

- [ ] Item 22: permissions and consent terms for people who record voices, including how a recording may be used and reused.
- [ ] Item 38: the share-alike question for the vocabulary data (reported as derived from a public dictionary project and a word-frequency list) and whether it reaches the app or a bundle.
- [ ] Item 38: the 117 lesson-derived vocabulary records that state no licence.
- [ ] Item 38: licence declarations for third-party tools and models listed in `docs/STATUS.md`, which are to be confirmed by counsel.
- [ ] Items 15 and 36: ownership and licence of delivered artwork and of any image that ships.
- [ ] The licence wording conflict in `tests/torahread.view.test.js` (`docs/release/MERGE-PLAN.md`).

---

## 7. Coverage check against the 38

Every ledger item appears above or needs no person: 01 (1.3), 02 (1.2), 03 (1.2), 04 (none), 05 (1.2), 06 (1.3), 07 to 09 (1.1, 2), 10 (1.1, 2), 11 (1.1, 2), 12 (1.2, 2, 3), 13 (1.2, 2), 14 (1.2, 5), 15 (1.1, 1.2, 5), 16 (1.1, 2), 17 (1.1), 18 (1.1, 2), 19 (1.1, 2), 20 (1.1, 2), 21 (1.1, 1.2), 22 (1.1, 1.2, 1.3, 2, 4, 6), 23 (none), 24 (1.1, 2), 25 (1.1, 2, 3, 4), 26 (1.1, 2, 3, 4), 27 (2), 28 (none), 29 (2), 30 (1.3), 31 (1.1), 32 (1.1), 33 (1.3, 2), 34 (1.3), 35 (1.3), 36 (1.2, 5), 37 (2), 38 (1.2, 1.5, 6).

Gaps I cannot close from the ledger alone: the exact Windows file names (section 1.1); who reviews items 17, 31 and 32 (the ledger assigns them to verification and book/assessment lanes without naming a person); and whether item 25 and 26 need a rabbi, a cantor or both.
