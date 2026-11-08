# ALEF — Audio Ledger

State as of the snapshot: **2026-11-07, 16:26 EST**. Counts are from verified landings and inventories, not from plans. Where a figure predates today's landings it says so — a full recount of `data/audio/summary.json` after today's merges settle is owed.

## The voices

| Role | Standard voice | High-grade voice |
|---|---|---|
| Male reader ("Ari") | he-IL-Wavenet-B | he-IL-Chirp3-HD-Charon |
| Female reader ("Noa") | he-IL-Wavenet-A | he-IL-Chirp3-HD-Kore |
| English narration (female) | — | en-US-Chirp3-HD-Kore |
| English Torah (male + female) | — | en-US-Chirp3-HD-Charon / en-US-Chirp3-HD-Kore |

House spec for every landed clip: 44.1 kHz mono, 96 kb/s MP3, 0.3 s silence pads at both ends, peak target −3 dBFS, all embedded metadata stripped, zero-hit metadata scan before commit. Normalization scripts are in `packs/books/` and `packs/arcade/`.

## Landed on main

- **Synthetic library overall:** the app can request 22,512 clips; the manifest summary stood at 19,453 synthesized clips before today's book landing, and coverage was regenerated at 85.0% (fix #14). Recount owed (see header).
- **Israeli foundations:** letters, syllables, vowels, and lectures — complete on main.
- **Prayer library:** 140/140 clips (standard voices).
- **Opening veil:** 160/160 clips (80 blessings × 2 voices).
- **Little Books:** Books 1–5 voiced earlier; **Books 6–62: 1,368 high-grade clips** (684 pages × 2 voices) produced Nov 7 with zero synthesis failures and landed the same day (branch `audio/books-6-62-hd`, commit `68cf868`; landing commits `776752dd` through the shelf flip `f9c6128c935c`). Live-verified byte-for-byte on spot checks across the shelf. The earlier standard-voice attempt at the same set (400 clips normalized, never shipped) is harvested locally at `~/workspace/alef-books-audio/harvest/` — it is the per-unit fallback set if a high-grade clip is ever found defective. 0 fallbacks were needed.
- **Sacred Listen (historic recordings):** 15 files enhanced and shipped at their original paths inside Build C; the untouched originals are preserved in the repo under `audio/listen/originals/`. Measurements and the ship table: `packs/sound-rollout/`.

## Produced, not yet landed

- **Arcade game lines — 370/370 clips** (185 male + 185 female), normalized and QA-passed, on branch **`audio/arcade-30-voice`** (commit `151ca69bf07c`); the raw production run is on `audio/arcade-30-voice-raw` (commit `e7a1233`). They land with the games merge (in flight at snapshot). Recording script: `packs/arcade/recording-script.csv`.
- **Reform Judaism narration — 5 clips** (5 sections, 1,104 words, English high-grade female voice; no fallback needed) on branch **`audio/reform-narration-raw`** (commit `8644fda`). They land with the page apply: harvest, normalize to house spec, transcribe-back QA (any missing or added word means a re-render), provenance records. Script and spec: `packs/reform-narration/`.
- **Books raw set:** branch `audio/books-6-62-raw` (commit `91396259`) holds the raw production output behind the landed book clips.

## In flight at snapshot

- **Prayer upgrade — 124 high-grade clips** (62 prayers × 2 voices), produced during an earlier Nov 7 session and parked locally with an inventory (`packs/prayers-hd/INVENTORY.csv`). Owner ruled 16:04: land them as the prayer upgrade. At snapshot: all 124 mapped to live prayer paths (`packs/prayers-hd/mapped.txt`); the **16 live prayer clips with no high-grade counterpart stay standard voice** (`packs/prayers-hd/no-hd-counterpart.txt`) — so after the upgrade, 124 of 140 prayer clips are high-grade and 16 remain standard. The replaced standard originals are being preserved on branch `audio/prayers-standard-backup` (being created by that landing — confirm it exists before treating the upgrade as reversible).

## Missing / not produced

- **Tradition foundations — 728 clips, 0 exist.** Per tradition (Ashkenazi and Sephardi): 57 letters + 110 syllables + 15 vowels, × 2 voices. These need human tradition readers; machine voices must not be substituted. The complete recording pack (exact paths and texts, spec, push commands) is on branch `audio/foundation-traditions` (commit `02973320`) and in `packs/foundation-recordings/`.
- **Tradition letters/syllables/vowels beyond foundations** and all tradition reading audio: not produced, human-gated (see the audition gate below).
- **Dictionary fill — about 9,878 clips** would cover the 4,939 dictionary entries that currently have no manifest row, in both Israeli voices. Not produced; staged in the dictionary build (LANES.md). Separately, the clip-lookup rebuild makes about 1,251 existing clips playable in the dictionary with no new production.
- **Journey gaps:** the phrases library is not complete in both voices, and the beginner-journey words lack guaranteed clips — an audit + production workstream was dispatched at 16:20 (LANES.md); counts come from its audit, not from estimates.
- **Torah audio — none exists.** Production order: exact-count freeze → Genesis 1 smoke (124 clips across the four tracks) → full Genesis pilot → decision gate on measured cost and size → the remaining books. Shipping shape: Hebrew verse + chapter clips and English chapter clips in v1; English verse clips produced and held on the raw branch (`audio/torah-raw` / `audio/torah-english-raw` when created).
- **Cantorial readings:** no clear historic recording exists for 9 core pieces; synthetic spoken readings are planned and must be labelled as readings, not chant. Not produced.

## The production pattern (repeatable without the original machine)

- **Platform:** Google Cloud Text-to-Speech, project `gen-lang-client-0474790324` (sign-in is the owner's Google account; the free trial runs to Feb 4, 2027).
- **The quota-header rule:** every synthesis call must carry the header `X-Goog-User-Project: gen-lang-client-0474790324`. A missing header once failed an entire ~500-call sprint with 403s while the scripts retried blindly. Rules now: (1) one single test call through the identical auth path before any batch; (2) batch scripts fail loudly on the FIRST error and print one full error body; (3) an early progress checkpoint — files above zero after the first minute, or stop.
- **Flow:** recording-script CSV (text, voice, exact target path) → synthesis run (raw output stays on a `*-raw` branch or a zip) → harvest and verify against the script (count, no extras, no empties) → normalize to house spec (smoke one file first) → QA spread + metadata scan → land on main in chunks → precache regeneration → live byte checks.
- **Cost shape:** the books set (about 5,300 characters per book set page run; 1,368 clips) and the arcade set (5,274 characters) each cost on the order of a dime at list price and landed inside free allowances in practice; the Torah is the one large job — about 2.68M characters across four tracks, roughly US$80 gross at list, roughly US$20–50 net inside the monthly free allowance depending on how it is split across months, against trial credit. Measure at the Genesis gate; do not take these figures as quotes.

## Honesty gates

- Synthetic speech is labelled synthetic wherever it plays (the veil and the Terms & Rights page both carry the disclosure).
- A tradition voice ships only after the blind-judge gate: authenticity at least 8/10 from at least two human judges, no dimension under 6, transcription error rate at most 0.10 — or it is recorded by human tradition readers. A labelled audition candidate is never shipped as a tradition on anyone's say-so.
- Signal-level QA (levels, durations, file integrity) is not a listen-check. Clips flagged by machine QA ride the teacher/cantor review pack; the spoken-Hebrew verdict is human.
