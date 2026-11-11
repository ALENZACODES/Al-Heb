# Phrase batch 1 audio coverage

Denominator: **50** phrases in this batch. This is a first set from records already in Aleph. It is not every Hebrew phrase.

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

Separate slow files: **0**. That count is files only. It is not a claim that a shared 0.7× control could not play a normal file more slowly. This page plays a listed normal clip when you tap Listen; it never plays the normal file more slowly in place of a slow recording. A normal file is not entered in the slow column.

Review status is copied from the source (`native-speaker-needed: …` on phrasebook lines, `draft-needs-native-review` on the role-play line). No line is marked human-reviewed or native-reviewed. Israeli clips that match are synthetic text-to-speech files (catalogue status `tts`, source `paid-cloud`). They are not native human recordings.

Playback: this page plays through the shared player (src/audio/player.js), asking for the exact catalogue row of the chosen style and voice; a result that is not that exact file is refused, and nothing else is played in its place. Where the chosen style and voice have no row, the page offers another slot's own row as its own button, labelled with its real voice and style. Where no row exists at all, it offers the device voice, labelled as a device voice (Israeli-style only).

D-07 (audit): the gender-pair drills, the six role-play paradigms, and the seven Israel dialogues still have no clips of their own. This batch does not copy those screens. One role-play line, "Can I help you?", is referenced by id and has no catalogue row. Dialogue lines stay on the dialogues page.
