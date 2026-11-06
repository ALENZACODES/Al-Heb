# Phrase batch 1 audio coverage

Denominator: **50** phrases in this batch. This is a first set from records already in ALEF. It is not every Hebrew phrase.

A numerator counts a phrase when the grammatical form for that gender (or the one shared form) has a catalogue row with that form’s own id, the same pointed text, that tradition, and that narrator voice. A different id, even with the same spelling, is not counted. A separate slow recording is not counted as the normal clip.

| Tradition | Narrator | Normal clip | Slow clip | No normal clip |
| --- | --- | ---: | ---: | ---: |
| Israeli | Man | 49 | 0 | 1 |
| Israeli | Woman | 49 | 0 | 1 |
| Sephardi | Man | 0 | 0 | 50 |
| Sephardi | Woman | 0 | 0 | 50 |
| Ashkenazi | Man | 0 | 0 | 50 |
| Ashkenazi | Woman | 0 | 0 | 50 |

Phrases with no exact normal clip in any tradition or voice: **1** of 50.
- role-gpar-04: Can I help you? (draft-needs-native-review)

Slow recordings in this batch: **0**. The catalogue has no separate slow file for these lines. The unmerged playback contract can play one clip at 0.7× (`rate: 'slow'`). This build does not do that, and a normal file is not counted as a slow clip.

Review status is copied from the source (`native-speaker-needed: …` on phrasebook lines, `draft-needs-native-review` on the role-play line). No line is marked human-reviewed or native-reviewed. Clips that match are catalogue status `tts` (synthetic, not a recorded teacher).

Playback: `docs/audio/PLAYBACK-CONTRACT.md` on unmerged branch `chatgpt/games-enrich-2026-11-06` (commit 8f37d4ba) is not in this checkout. This page does not call the current player, because that player can substitute a tradition or a device voice. Catalogue rows are listed. The control says audio unavailable until that contract is merged.

D-07 (audit): the gender-pair drills, the six role-play paradigms, and the seven Israel dialogues still have no clips of their own. This batch does not copy those screens. One role-play line, "Can I help you?", is referenced by id and has no catalogue row. Dialogue lines stay on the dialogues page.
