# ALEF Human Recording Kit — Male × Israeli

**Status:** DRAFT pattern instance (drafting lane) — **not** a claim that the slot is finally UNFILLED or that any audio/session exists  
**Derived from:** the m × sephardi pattern kit  
**Slot:** `m` × `israeli`  
**Delivery path root:** `audio/m/israeli/<kind>/<id>.mp3`  
**Sprint:** 2026-11-05 America/Toronto · SUPER COMMAND

Mark **FINAL** only after Casting declares the slot UNFILLED and the priority ID list is attached.

---

## 1. Slot cover

| Field | Value |
|-------|-------|
| Slot | **m × israeli** |
| Why this kit exists (DRAFT) | Pattern for the case where no sale-clear engine/voice passes blind casting on **Israeli (modern) authenticity** (or rights block shipping). Replace with sealed reasons from `CASTING-REPORT.md` when declared. |
| Search evidence | To be linked: `VOICE-SEARCH.md` (FIND lane) · casting UNFILLED row |
| Priority target | ~700 clips: prayer words → prayer lines → lesson/vocab words |
| Full slot (later) | ~2,340 (manifest-driven) |
| Audio claimed on disk today | **None** (do not invent) |

---

## 2. Donor consent (perpetual royalty-free commercial)

> **Voice Recording Consent — ALEF (Male Israeli slot)**
>
> I, **________________________**, grant **John Khan / the ALEF project rightsholder** a **perpetual, irrevocable, worldwide, royalty-free, transferable** licence to use my recorded voice and performances in the ALEF Hebrew learning application and related products, including **commercial sale, licensing, and distribution**, in any media now known or later developed.
>
> I understand recordings may be edited, normalized, segmented into short clips, and paired with Hebrew text for teaching. I waive claims to residuals or further payment beyond any one-time fee we agree in writing (**$________ / volunteer $0**).
>
> I confirm I am at least 18 and authorized to grant these rights. I am not assigning rights I do not have.
>
> Style requested: **Israeli everyday Hebrew: tav = “t”, kamatz = “a”, ayin light or silent, usual final-syllable stress** per the checklist below.
>
> Signature: ________  Printed name: ________  Date: ________  Email/phone: ________

**Internal checklist**

- [ ] Signed consent stored at: `________________` *(path blank until signed)*
- [ ] Fee / volunteer noted
- [ ] No substitute from forbidden sources (CapCut, Forvo, NC engines, scrapes, unconsented clone)
- [ ] Metadata stripped at encode
- [ ] Manifests flipped only when files exist

---

## 3. Israeli (modern) checklist (director card)

Coach and reject takes that drift. **Audio in the wrong tradition under this label is worse than silence.**

- [ ] **tav** always “t” (with or without dagesh)
- [ ] **kamatz** = “a”
- [ ] **ayin** lightly sounded or unsounded (modern norm)
- [ ] Stress usually **final syllable** (modern exceptions as the clip list marks them)
- [ ] **resh** as in modern Hebrew
- [ ] Everyday Israeli vowels and pacing, not liturgical colouring
---

## 4. Session plan (male israeli priority set)

| Block | Content | Est. time | Notes |
|-------|---------|-----------|-------|
| Setup | Quiet room, fixed mic, pointed scripts, water | 15–20 min | Same distance all session |
| Warm-up | 4 syllables + Modeh Ani line (keep only if checklist-clean) | 10 min | Coach sounded ayin / het |
| Pass A | Priority **prayer words** | 45–75 min | One word per take |
| Break | | 10 min | |
| Pass B | Priority **prayer lines** (incl. Modeh Ani, Shema L1, Kiddush excerpt, Lecha Dodi excerpt) | 45–75 min | Dignity & pacing |
| Break | | 10 min | |
| Pass C | Priority **lesson / vocab words** (pointed) | 60–90 min | Niqqud as written |
| Pickup | Director-flagged retakes | 20–40 min | |
| **Total** | ~700 priority | **~4–6 h** (1–2 days OK) | Full ~2,340 = extra day(s) |

**Encode delivery (after edit)**

- Mono · 44.1 kHz · MP3 96 kbps · −16 LUFS · TP −1 dBTP · 80 ms head/tail  
- `ffmpeg … -map_metadata -1 -write_id3v1 0 -id3v2_version 0`  
- Paths: `audio/m/israeli/word/…`, `audio/m/israeli/prayer/…`, etc.

---

## 5. Priority clip categories (~700) — male israeli

Exact IDs **not invented**. FIND/QB lanes must export from manifests into an attached list.

| Priority | Category | Approx. count | Manifest pointer | Produced |
|----------|----------|---------------|------------------|----------|
| 1 | Prayer words | _(fill from manifest)_ | `data/audio/` · israeli · m · prayer-word kinds | **0** |
| 2 | Prayer lines | _(fill)_ | prayer-line kinds | **0** |
| 3 | Lesson / vocab words | _(fill)_ | word kinds used in lessons | **0** |
| | **Priority total** | **~700** | | **0** |
| Later | Phrases | | | **0** |
| Later | Letters / syllables | | | **0** |
| | **Full slot** | **~2,340** | | **0** |

**Required attachment before FINAL kit**

- [ ] `recording-kit-m-israeli-clip-list.csv` (or `.md`) with columns: `id, kind, pointed_hebrew, take_ok`  
- [ ] Counts reconciled to coverage tool / manifests  
- Path: `________________` *(blank until exported)*

---

## 6. Donor-facing instructions (brand-free)

1. Read the **pointed Hebrew** exactly. Ask if unsure — do not guess from Latin letters.
2. Speak like a **kind teacher**: clear, warm, patient — not theatrical.
3. Keep the **israeli** pronunciation: Israeli everyday Hebrew: tav = “t”, kamatz = “a”, ayin light or silent, usual final-syllable stress.
4. One clip per take; full pause between items; say “retake” after a mistake, then repeat.
5. Prayer lines: unhurried and respectful.
6. You may stop anytime; we resume with the same mic setup.

We will edit silence, normalize loudness, cut short teaching clips, place them in the course, and may distribute or sell the course under your signed consent.

---

## 7. Casting / production links

| Doc | Role |
|-----|------|
| `CASTING-SHEET.md` | Rubric + tradition checklists |
| `CASTING-REPORT.md` | Seal UNFILLED + reasons before promoting this kit to FINAL |
| `AUDIO-PRODUCTION-REPORT.md` | Coverage / spend / licence ledgers |
| `VOICE-SEARCH.md` | FIND evidence (FIND lane; may still be drafting) |

---

## 8. Handoff needs (before a real session)

| From | Need |
|------|------|
| Casting (3 judges) | Formal UNFILLED for m×israeli **or** confirmation this stays DRAFT-only pattern |
| FIND lane / QB lane | Export ~700 priority IDs + pointed text for m/israeli |
| John | Donor identify/recruit, fee, signed consent storage |
| QB lane | Encode + provenance scan + branch commit (no `main` merge) when takes land |

---

## 9. Honesty block

- No male israeli production audio is asserted by this document.  
- No donor is booked by this document.  
- Produced counts remain **0** until files exist on disk.  
- Promote status line from **DRAFT** → **FINAL UNFILLED KIT** only when casting seals the slot.

*End of recording-kit-m-israeli.md (DRAFT).*
