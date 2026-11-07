# SFX CREDITS — ALEF / Al-Heb free game UI sounds

**Staged:** 2026-11-06 (America/Toronto)  
**Path:** `/workspace/shared/al-heb/sfx-free/`  
**Status:** Staging only — NOT merged to `main`. Do NOT change Ari/Noa/Rimon faces or production WaveNet/Chirp voices.

## Primary pack

| Field | Value |
|-------|-------|
| Pack | **Kenney Interface Sounds** (v1.0) |
| Author | Kenney (www.kenney.nl) |
| License | **CC0 1.0 Universal** (public domain dedication) |
| License URL | https://creativecommons.org/publicdomain/zero/1.0/ |
| Official page | https://kenney.nl/assets/interface-sounds |
| Mirror used | OpenGameArt zip `kenney_interfaceSounds.zip` (https://opengameart.org/content/interface-sounds) |
| Optional GitHub mirror | https://github.com/Calinou/kenney-interface-sounds |
| Credit (optional) | "Kenney.nl" or "www.kenney.nl" — not mandatory under CC0 |

Original `License.txt` preserved at: `sfx-free/License-Kenney-CC0.txt`  
Raw OGG pack preserved under: `sfx-free/raw/Audio/` (100 files)

## Curated app subset

- **30** mono MP3 clips @ ~96 kbps, 44.1 kHz → `sfx-free/ui/*.mp3`
- Stable filenames for the games engine (see `ui/MAP.json`)
- Intended events: click, confirm, success, error/miss, pop/bubble_pop, whoosh/swoosh, streak, flipper, catch, collect, tick, open/close, etc.

## Not included (optional later)

- Kenney RPG Audio (also CC0) — skip this turn to keep the pack tiny
- romainsimon/uisfx arcade subset — skip this turn; Kenney covers the needed events

## App credit line (suggested)

> Interface sound effects by Kenney.nl (CC0 1.0).

## Rules

- CC0 only for game SFX in this folder.
- No cast voice replacement — these are UI/game feedback only.
- Wire via ChatGPT order: `games-25/orders/2026-11-06-sfx-wire-chatgpt.md`
