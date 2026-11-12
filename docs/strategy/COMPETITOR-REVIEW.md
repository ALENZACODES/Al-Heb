# Competitor analysis: review against the Aleph repo (November 2026)

Source: `competitor-analysis.txt` (807 lines, read in full; HTML original not separately read). Repo read at commit `cb4e5c1`. Status words: **done**, **partial**, **not started**, **blocked** (needs a human). "Verified" means I opened the file named; nothing here was run in a browser. I ran four test files (audio.coverage, vocab.schema, corpus.hebrew, images.ingest): 44 pass, 0 fail. `node --test tests/` as a directory argument failed with a runner error, so I make no full-suite claim.

## 1. The ten findings that matter for decisions

1. **The white space is the doc's research claim**: no competitor combines niqqud-first reading, prayer reading, conversation, tradition-switchable audio and photo-OCR. I did not re-survey the field.
2. **Audio is the moat and Aleph has none.** 14,036 clips needed; 0 exist (`docs/voices/coverage.md`). Every "match: human audio" move is blocked on recording.
3. **Only Israeli audio can be machine-made** (the doc and `tools/audio/render_tts.mjs` agree). Ashkenazi prayer audio, the sharpest differentiator, is also the slowest lane.
4. **"Free now, maybe sold later" is a licensing decision.** The doc's sale-clear verdicts are looser than the repo's own records (section 4).
5. **CapCut is ruled out for Aleph audio** (section 5).
6. **A streak with automatic Shabbat/Yom Tov freeze is the cheapest differentiator.** The repo has a user-marked rest-day streak, not an automatic freeze.
7. **NJOP's host-network model is the distribution plan.** The repo already has a 10-week Class track (`#/classtrack`), not the doc's 5-week format.
8. **Scoring must be called "reading accuracy"**, not a pronunciation grade (doc, resource 21). The repo has no speech recognition.
9. **Some doc counts and repo claims fail checking** (sections 3, 6): 30 playbook moves not 31; "recording kits and buyout paperwork" is half true; Chatterbox is absent from the repo.
10. **Toronto dates are perishable** (Nov 4-18, Nov 14, Chanukah Dec 4-12); outreach is John's. I did not re-check them.

## 2. Status of every match/exceed move and adoption priority

M = match, E = exceed.

| Move | M | E | Evidence in repo |
|---|---|---|---|
| 1a streak + free start | partial | partial | No gating, no accounts. `streakInfo()` in `src/progress/model.js`; Home card in `src/shell/home.view.js`. Rest days are user-marked (`progress.state.rest`, max 90), no 5-minute timer, no automatic Shabbat freeze. |
| 1b human audio | blocked | partial | 0 of 14,036 clips. Tradition-aware player `src/audio/player.js`, shard loader `src/shell/audio-shards.js`; every shard entry is status "missing" (`docs/STATUS.md`). |
| 1c self-serve + speak scoring | done | not started | Static PWA, no enrolment. `docs/progress/README.md`: "no speech recognition". |
| 2a depth + guided spine | partial | partial | 146 vocab packs, `#/learn`, `#/ladder`, `#/classtrack`. No public content map found. |
| 2b line-by-line + OCR | partial | partial | `#/read/:id`, `#/scan` (vendored tesseract.js + `heb`). OCR measured on synthetic images only (88.4%); real photos unmeasured (`docs/photo/BENCHMARK.md`). |
| 2c offline audio packs | not started | not started | `docs/ARCHITECTURE.md` line 38: audio pre-download not implemented. Free core: done (no payments code). |
| 3a respond-before-reveal | partial | partial | `#/fade` fade-out recall; FSRS-style `src/curriculum/srs.js` (parameters not fitted). Spoken production absent. |
| 3b hands-free/offline audio | not started | not started | No audio exists; no audio mode. |
| 3c calm adult UI | partial | not started | `#/progress` shows "what you can read now" (`src/progress/decode.js`). No "why this prayer matters" content found. |
| 4a per-word scoring | not started | partial | `#/soundgap`, `src/pronunciation/shva.js`, `kamatz-katan.js` are rule tools, not scoring. |
| 4b image-first vocab | blocked | blocked | 797 manifest rows, all `pending`; `assets/img/placeholders` are SVG stand-ins; 0 approved (no `data/images/approvals.json`). |
| 4c polish + Israeli photos | partial | blocked | A11y tests and fonts exist; no real photos; images unapproved. |
| 5a import any text | partial | partial | `#/scan` OCR + opt-in Dicta Nakdan vowelizer (no published terms). No paste/URL import verified. |
| 5b known-words counters | partial | partial | Vocab band and line grading in `src/progress/`. No "Siddur Coverage %" headline found. |
| 5c graded library | partial | partial | 70 corpus entries (`data/corpus/registry.json`), `data/corpus/gaps.json`. No Ben-Yehuda content. |
| 6a many native speakers | blocked | blocked | Casting brief and kits exist; nobody contacted. |
| 6b SRS | done | not started | `srs.js`, `srs.vocab`/`srs.cards` keys. Reading-first cards not verified. |
| 6c AI chat partner | not started | not started | `docs/photo/TRANSLATION.md`: no cloud calls by design. |
| 7a Word Sprint | not started | not started | No "sprint" in `src/`. |
| 7b done-for-today | partial | partial | Daily goal (`goalInfo`); Shabbat times in `data/calendar/hebcal-fixtures.json`, `src/curriculum/reminders*.js`; no pre-Shabbat finish mode. |
| 7c topic + frequency index | done | partial | `#/vocab`, `data/vocab/packs`, prayer weighting `readWeight` in `data/vocab/meta.json`. |
| 8a daily variety | not started | not started | No rotation logic found. |
| 8b tap-verb grammar | partial | not started | Wiktionary `forms[]` paradigms in vocab data; tap-any-verb everywhere not verified. |
| 8c simple pricing | done | done | Free; no billing code. |
| 9a Day-1 reading win | partial | not started | `#/loanwords` ("Words you can already read"), onramp tests. Promise at onboarding not verified; recorded Day-1 vs Week-5 comparison absent. |
| 9b prayers as textbook | partial | partial | `#/read`, `#/torahread` (aliyah/trope views), Class track. |
| 9c cohorts + shul channel | partial | blocked | Class track with teacher/handout views (commit `cb4e5c1`); host recruitment is John's. |
| 10a mastery ladder | partial | partial | `#/progress` belts; `data/progress/belt-gates.json` states they are not the Aleph Champ ladder and speed gates are "unmeasured". |
| 10b triads + exceptions | partial | not started | Lesson sequencing not audited against triad design. |
| 10c ends at real books | partial | partial | `#/torahread` trope, `#/scan`; fading support not verified. |

| # | Adoption priority | Status | Evidence |
|---|---|---|---|
| 1 | Cloudflare Pages | not started, blocked | `docs/DEPLOY.md`: "nothing has been deployed"; Cloudflare is one of five listed options. Account is John's. |
| 2 | UXLC + Sefaria + Open Siddur | partial | UXLC and Sefaria-labelled texts in registry. Open Siddur deliberately not used (`docs/corpus/LICENSES.md` section 3). |
| 3 | Streak + freeze | partial | See 1a. |
| 4 | Morning card | partial | `tools/morning/build-verses.mjs` exists; no `data/morning-verses.json`, no `#/morning` route in `router.js`. |
| 5 | Chatterbox + Nakdimon | not started | "Chatterbox" appears nowhere in the repo; Nakdimon only in `docs/photo/ENGINES.md`. `render_tts.mjs` offers azure/google/elevenlabs, dry-run by default. |
| 6 | Human recording | partial, blocked | `docs/voices/kit/*` slates and plans, `casting-brief.md`, `buyout-contract-terms.md`. "No talent has been contacted". |
| 7 | Whisper | not started | No whisper code. |
| 8 | Wiktextract + FrequencyWords | done | `data/vocab/vocab5000.json` (5,000 entries), `sources.lock.json`; vocab.schema tests pass. |
| 9 | Tesseract heb | partial | Vendored (`assets/vendor/_tesseract`); no real-siddur benchmark. |
| 10 | Storyset/Commons images | not started | Repo path is generated images, 286 PNGs in `assets/images/incoming` (282 top-level), none approved. |

## 3. Doc claims checked against the repo and itself

| Claim | Finding |
|---|---|
| "Repo already contains recording kits and buyout/consent paperwork" | **Half true.** Kits: yes (`docs/voices/kit/`). Buyout: only a term sheet for a lawyer, "NOT legal advice and not a contract" (`buyout-contract-terms.md`). No donor consent form, no cloning opt-in, no signed-grant folder. |
| "§M metadata strip" | **Not in repo.** No `exiftool`/`map_metadata` use in tools; `tools/audio/normalize.sh` encodes mp3/m4a/opus without `-map_metadata -1`, targets -1.5 dBTP (doc: -1). The `images.ingest` tool strips metadata on web copies. |
| "14,036 clips" | **Matches** `docs/voices/coverage.md` (0 exist). The arithmetic is consistent (Israeli 2,612 x2, Ashkenazi 2,203 x2, Sephardi 2,203 x2). But `manifest.json` holds 4,142 rows; "clips" are per voice and tradition. |
| "797 illustrations" | **Matches** `data/images/manifest.csv` (797 rows, all `pending`). Doc calls them "placeholders"; the repo has also queued a further 1,000 (`data/images/next1000.csv`). 0 approved. |
| "5,000 words" | **Matches** `vocab5000.json` (5,000). Repo also has `words.json` (6,029 words, 270 phrases). 4,997 pointed from Wiktionary; all `proofread: false`. |
| "Chatterbox" / "Cloudflare Pages" | Chatterbox is **absent from the repo** (Resemble's page says MIT, lists Hebrew). Cloudflare is only an option in `DEPLOY.md`; nothing deployed. Doc cites 23 languages, Resemble says 20+. |
| "Aleph's code already flags the Dicta endpoint" | **True.** `docs/photo/ENGINES.md`: "No terms/rate limit found: ask Dicta before shipping". The code ships it behind an opt-in checkbox. |
| "31 strengths" | **Self-contradiction.** I count 30 (1a to 10c). Also the repo's belts borrow Aleph Champ-style names while the doc says avoid its trade dress. |
| Route 2: 14,036 clips in 8-20 machine-hours | **Inconsistent with the doc's own rule** that Chatterbox can only produce Israeli. Honest TTS scope is ~5,224 Israeli clips (2,612 x 2); the rest is human. |
| §M.4 "author = John Khan only; no co-author trailers; strip AI/tool names" | **Applied.** The published repo shows John Khan as the only author and carries no tool names. Disclosure of AI-made art is a separate question: `docs/images/RIGHTS.md` and `IMAGE-RUN.md` say to disclose it and to answer store AI-disclosure questions truthfully, so John should decide that wording knowingly. |

## 4. "Free now, sale later" against Aleph's actual licences

No NC, ND or personal-use material was found **in shipped data**. Non-commercial sources appear only as rejected or "ideas only" references (`docs/corpus/LICENSES.md` section 3; `docs/resources/gratis-directory.md`, e.g. Learn101: personal, non-commercial only). I grepped docs and data JSON for NC/ND/GPL terms; I did not audit `book/`, PDFs or the full `assets/` tree.

| Asset | Licence record | Effect on a later sale |
|---|---|---|
| Fonts: Heebo, Frank Ruhl Libre, Gveret Levin, Alef, Noto Sans/Serif Hebrew | OFL 1.1: `docs/licenses/OFL-*.txt`, `assets/fonts/FONTS.md` | Clear. Cannot sell fonts alone. Stroke data derived from Gveret Levin outlines is called a derivative by `data/letters/SOURCES.md`; whether OFL attaches to it is unresolved. |
| Vocabulary: `vocab5000.json`, `words.json`, packs, index | **CC BY-SA 4.0** (Wiktionary, GFDL dual) + FrequencyWords: `docs/vocab/LICENSES.md`, `sources.lock.json` | **Share-alike.** Sale is permitted, but the data must stay BY-SA and be attributed; a buyer cannot own it exclusively or relicense it. Combined-work status untested; no lawyer consulted. The doc's check marks (#4, #6) understate it. |
| Tatoeba examples (5,317) | CC BY 2.0 FR, per-example attribution (`docs/vocab/LICENSES.md`) | Clear with attribution. |
| Traditions notes | Paraphrased from Wikipedia (CC BY-SA); `data/traditions/sources.json` offers them BY-SA "as a precaution" | Share-alike on that data. Pealim, Chabad.org, Benor paper cited by URL only. |
| Corpus Hebrew: UXLC (28 records) | Tanach.us "viewed or copied without restriction": `docs/corpus/LICENSES.md` | Clear. Do not call it the WLC. |
| Corpus: Sefaria-labelled siddurim | CC0 (15), Public Domain (6), **CC-BY Metsudah (21)**. All **labels unverified** | Metsudah (21 of 70 entries) is the risk: label may not cover the 1981 vocalisation. Replace before sale, as the repo already says. |
| Tesseract.js, `heb`; Hebcal data; JPS 1917 | Apache-2.0 (`assets/vendor/_tesseract/README.md`); Hebcal CC BY 4.0; JPS PD per unverified Sefaria label | Clear with notices/credit. |
| Dicta Nakdan | No terms found | Not licensed. Opt-in feature; do not ship as dependable. |
| Pictures | Terms read via a summariser, not the live page (`docs/images/RIGHTS.md`) | Commercial use under those terms is not the same as a copyright; no exclusivity. 0 approved anyway. |
| TTS output | `buyout-contract-terms.md`: redistribution rights for Azure/Google/ElevenLabs "no official page confirming this" | Open item for counsel before any TTS audio ships. |
| Repo code | `README.md`: "License: not chosen yet", no LICENSE file | All rights reserved by default. John must choose before anyone else relies on it. |

## 5. CapCut

The doc's conclusion: for Aleph audio CapCut is a **trap**. CapCut's TTS page, as quoted, names Chinese, Malay, Vietnamese, Thai, English, Spanish, Japanese "and more", not Hebrew. Its Terms (section 5) bar scripted use and incorporating the service into another product, and the Materials License limits use to per-export, bars standalone use of materials, and bars making them available in other apps. The doc adds that 14,036 clips by hand would take 230-460 hours.

What I checked: I could not fetch CapCut's pages (blocked in this session) and a search turned up no confirmation either way, so **I did not verify the quotes or the Hebrew-voice absence**. The doc itself marks the Hebrew voice "unverified" and proposes a 15-minute in-app test; the user's computer is linked but I did not run it.

What it means for the plan: if CapCut is to be used for **Aleph lesson or prayer audio**, don't. If it is for **editing marketing or demo videos**, the doc says that is fine for Dual-Use-marked materials, but re-read the licence before using any CapCut-supplied voice, music or template commercially.

Alternatives from the doc and repo only: record people with the kits in `docs/voices/kit/` (the only route for Ashkenazi and Sephardi); Chatterbox locally for Israeli drafts (MIT per Resemble; not in the repo yet; clips carry a PerTh watermark); harvest Common Voice CC0 or Lingua Libre matches (small yield, per the doc); `tools/audio/render_tts.mjs` with Azure/Google/ElevenLabs is wired but unpriced for redistribution rights. The doc rules out Piper's Hebrew voice, Edge-TTS and Forvo.

## 6. Wrong, unverifiable or risky

Web checks I made (5 fetches, 2 failed or were blocked):

| Claim | Result |
|---|---|
| NJOP: 250,000+ taught; Level I free; five ~90-minute sessions | **Confirmed** on njop.org/hebrew. |
| Pimsleur: "Premium" (Hebrew only) and "All Access" plans; 7-day free trial | Plan names and trial **confirmed**; page showed **no prices**, so $19.95/$20.95 unverified. |
| Mondly annual ~$47.99 | **Not confirmed.** One third-party guide (checked 31 Oct 2026) gives $74.90/yr and $15.90/mo on the US App Store. The doc says prices vary; its "~$48/yr" anchor should not be quoted. |
| Chatterbox: MIT, Hebrew listed, watermarked | **Confirmed** on Resemble's page (calls it V3, "20+ languages"). |
| CapCut languages/terms; Cloudflare limits (20,000 files, 25 MiB) | **Not checked**: fetches blocked. |

Not checked: all other competitor prices and scale figures, the Toronto dates, and licence quotes for Forvo, Piper, Coqui, Meta, Unsplash, unDraw, Open Siddur.

Risks in the doc itself:
- **File-count ceiling.** 14,036 mp3s plus images plus data in one Pages project could sit near the 20,000-file limit the doc quotes. The repo tree is 3,479 files today (not all shipped). Unverified; plan to shard or use object storage.
- **Whisper scoring** may mark Sephardi/Ashkenazi readers wrong against Israeli targets unless targets are tradition-specific.
- **Outcome claims** ("Day-1 reading", "82% of Friday night") are targets; the repo has no measure behind them.
- **Negative claims** ("no competitor does X") were not re-searched.
- **Religious content** needs a Hebrew-educator or rabbinic reviewer; every corpus entry is `proofread: false`.

## 7. Next 30 days

| Lane | Week 1 | Weeks 2-3 | Week 4 |
|---|---|---|---|
| Deploy | John: choose host, create account. Build: count shippable files, deploy note. | Staging deploy; offline check on a phone. | Soft launch, audio fallback labelled. |
| Audio | John: decide Sephardi equivalence (`equivalence.json` is empty); pick 2 donors; counsel on consent form and TTS redistribution. | Build: add donor consent form and `recordings_needed.csv`; record priority subset (about 700 per tradition-voice). | Ingest first clips through a metadata-clean pipeline; coverage report. |
| Retention | Build: spec Shabbat/Yom Tov auto-freeze from `calendar.js` on top of existing rest days. | Build streak + 5-minute timer; morning card (`data/morning-verses.json`, `#/morning`). | Simulated-date QA walk. |
| Licences | Build: replace or confirm Metsudah records; credits page for BY-SA/BY. | John: lawyer on vocab share-alike; choose a code licence. | Re-run licence audit. |
| Images | John: approve or reject the 286 PNGs. | Build: ingest decisions. | Decide AI-disclosure wording. |
| Outreach | John only: Holy Blossom (new-member series starts Nov 4, likely too soon), City Shul (Nov 14), Chanukah (Dec 4-12). | Drafts prepared, John sends. | Review responses. |
| Scoring | Build: whisper.cpp spike on 50 recordings. | Honest "reading accuracy" label. | Decide go/no-go. |

Machine-readable actions: `docs/strategy/ACTIONS.csv`.
