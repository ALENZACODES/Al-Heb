# Vertex image use plan — ChatGPT Al-Heb assets

Updated: 2026-11-06T06:20:09.826074+00:00 (America/Toronto on box).
Model: gemini-3.5-flash · Freeze: no Ari/Noa/Rimon regen · no production audio swaps.

## Overnight DECISIONS (authority)

- Source: `docs/fun/OVERNIGHT-DECISIONS-2026-11-06.json` (ChatGPT ≥9.2 dual-decide).
- **ship.speak = []** · **ship.letter_cartoons = []**
- candidate SPEAK: 04, 05, 08 → `assets/speak-candidates/`
- hold SPEAK: 01–03, 06–07, 09–12 → `assets/speak-hold/` (kept for John unlock)
- style_break atlas-only (no regen): pe-final, qof, resh
- letter hold: shin, tav, tsadi, tsadi-final
- Sephardi top-15 = triage list only; **production_audio_auto_replace: false**

## Vertex scores

- Checked: **45**
- Mean on-brand: **9.31/10**
- Ledger total est. USD: **$1.8784**

## Wire paths

| Bucket | Path | Data map |
|---|---|---|
| candidate | `assets/speak-candidates/` | `data/images/speak-candidates.json` |
| hold | `assets/speak-hold/` | `data/images/speak-hold.json` |
| letter drafts | `assets/letter-cartoons/batch0{1,2,3}/` | `data/images/letter-cartoons-chatgpt.json` |
| decisions | `docs/fun/OVERNIGHT-DECISIONS-2026-11-06.json` | also `assets/chatgpt-overnight/DECISIONS.json` |

App: default hide hold; `minute-one.json#draftArt.showHoldRequiresUnlock=true`.

## Per-asset

| file | vertex on-brand | overnight bucket | screens |
|---|---:|---|---|
| `assets/letter-cartoons/batch01/aleph-meet.png` | 10 | letter_draft | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch01/bet-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/chet-meet.png` | 9 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/dalet-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/gimel-meet.png` | 9 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/he-meet.png` | 10 | letter_draft | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch01/tet-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/vav-meet.png` | 9 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/yod-meet.png` | 9 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch01/zayin-meet.png` | 9 | letter_draft | LettersMeet, SoundCard |
| `assets/letter-cartoons/batch02/ayin-meet.png` | 9 | letter_draft | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch02/kaf-final-meet.png` | 10 | letter_draft | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch02/kaf-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch02/lamed-meet.png` | 10 | letter_draft | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch02/mem-final-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch02/mem-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch02/nun-final-meet.png` | 10 | letter_draft | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch02/nun-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch02/pe-meet.png` | 10 | letter_draft | LettersMeet |
| `assets/letter-cartoons/batch02/samekh-meet.png` | 10 | letter_draft | LettersMeet, SoundCard |
| `assets/letter-cartoons/batch03/pe-final-meet.png` | 9 | style_break_atlas_only | LettersMeet |
| `assets/letter-cartoons/batch03/qof-meet.png` | 9 | style_break_atlas_only | LettersMeet |
| `assets/letter-cartoons/batch03/resh-meet.png` | 9 | style_break_atlas_only | LettersMeet |
| `assets/letter-cartoons/batch03/shin-meet.png` | 9 | letter_hold | LettersMeet |
| `assets/letter-cartoons/batch03/tav-meet.png` | 9 | letter_hold | LettersMeet |
| `assets/letter-cartoons/batch03/tsadi-final-meet.png` | 9 | letter_hold | LettersMeet, LetterLecture |
| `assets/letter-cartoons/batch03/tsadi-meet.png` | 9 | letter_hold | LettersMeet, LetterLecture |
| `assets/speak-hold/SPEAK_01_street_falafel.png` | 9 | hold | SpeakStreet, SpeakCafeMarket |
| `assets/speak-hold/SPEAK_02_street_bus_ticket.png` | 9 | hold | SpeakStreet |
| `assets/speak-hold/SPEAK_03_street_directions.png` | 9 | hold | SpeakStreet, GamesPhraseEcho, YourTurn |
| `assets/speak-candidates/SPEAK_04_table_shabbat.png` | 9 | candidate | SpeakTable |
| `assets/speak-candidates/SPEAK_04_table_shabbat.png` | 9 | candidate | SpeakTable |
| `assets/speak-candidates/SPEAK_05_table_welcome.png` | 9 | candidate | SpeakTable, SpeakCafeMarket |
| `assets/speak-candidates/SPEAK_05_table_welcome.png` | 9 | candidate | SpeakTable, SpeakCafeMarket |
| `assets/speak-hold/SPEAK_06_sanctuary_quiet.png` | 9 | hold | SpeakSanctuary |
| `assets/speak-candidates/SPEAK_08_street_taxi.png` | 9 | candidate | SpeakStreet, GamesPhraseEcho |
| `assets/speak-hold/SPEAK_01_street_falafel.png` | 9 | hold | SpeakStreet, SpeakCafeMarket |
| `assets/speak-hold/SPEAK_02_street_bus_ticket.png` | 9 | hold | SpeakStreet |
| `assets/speak-hold/SPEAK_03_street_directions.png` | 9 | hold | SpeakStreet, GamesPhraseEcho, YourTurn |
| `assets/speak-hold/SPEAK_06_sanctuary_quiet.png` | 9 | hold | SpeakSanctuary |
| `assets/speak-hold/SPEAK_07_sanctuary_together.png` | 9 | hold | SpeakSanctuary |
| `assets/speak-hold/SPEAK_09_cafe_order.png` | 9 | hold | SpeakCafeMarket, SpeakStreet, YourTurn |
| `assets/speak-hold/SPEAK_10_market_pomegranates.png` | 9 | hold | SpeakCafeMarket, SpeakStreet, YourTurn |
| `assets/speak-hold/SPEAK_11_sound_card.png` | 9 | hold | SoundCard, SpeakStreet, YourTurn |
| `assets/speak-hold/SPEAK_12_your_turn.png` | 9 | hold | YourTurn, SpeakTable, SpeakStreet |

## Flagged by Vertex (human review; no regen)

- `assets/letter-cartoons/batch01/vav-meet.png` score=9 flags=['wrong-letter-depicted']
