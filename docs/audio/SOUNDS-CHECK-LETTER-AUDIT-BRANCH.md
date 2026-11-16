# Letter audit branch: the same sound check

The clips re-recorded on `claude/letter-audit-2026-11-13` (not on main when this was written, 16 Nov 2026) were heard three times each by `tools/audio/asr-check/scan_sounds.py`, the same way as the clips on main. A machine check.

| clip | should sound | on main | heard on main | on the branch | heard on the branch |
|---|---|---|---|---|---|
| `audio/f/israeli/letter/khaf.mp3` | xaf | listen | k'af / k'af / k'af / k'af / k'af | agree | x'af / x'af / x'af |
| `audio/f/israeli/letter/resh.mp3` | reS | agree | r'ejS / r'ejS | listen | r'eqis / r'eqis / r'eqis |
| `audio/f/israeli/letter/vav-sound.mp3` | va | listen | q'a / u'a / va / q'a / q'a | agree | v'a / v'a / v'a |
| `audio/f/israeli/letter/vet-sound.mp3` | va | listen | q'a / u'a / va / q'a / q'a | agree | v'a / v'a / v'a |
| `audio/f/israeli/letter/vet.mp3` | vet | listen | b'et / b'et / b'et / b'et / b'et | agree | v'et / v'et / v'et |
| `audio/f/israeli/syllable/vav-a.mp3` | va | listen | q'a / u'a / va / q'a / q'a | agree | v'a / v'a / v'a |
| `audio/f/israeli/vowel/dagesh.mp3` | b | majority | m'u / b'u / b'o / b'u / m'u | listen | m'a? / m'a? / m'a? |
| `audio/m/israeli/letter/khaf.mp3` | xaf | listen | k'af / k'af / k'af / k'af / k'af | agree | x'af / x'af / x'af |
| `audio/m/israeli/letter/shin.mp3` | Sin | majority | S'in / s'e / S'in / S'in / S'in | majority | s'in / S'in / S'in |
| `audio/m/israeli/letter/vav-sound.mp3` | v | listen | v'ad / vad'a / vad'a / v'ad. / vad'a | agree | v'a / v'a / v'a |
| `audio/m/israeli/letter/vet-sound.mp3` | v | listen | v'ad / vad'a / vad'a / v'ad. / vad'a | agree | v'a / v'a / v'a |
| `audio/m/israeli/letter/vet.mp3` | vet | listen | b'ejt / b'ejt / b'ejt / b'et / b'et | agree | v'et / v'et / v'et |
| `audio/m/israeli/syllable/vav-a.mp3` | va | listen | u'a / w'a / w'at / w'a / w'a | agree | v'a / v'a / v'a |
| `audio/m/israeli/vowel/dagesh.mp3` | b | agree | b'u / b'u | agree | b'at / b'at / b'a |

Two branch clips to play by ear before the branch is merged: Noa's Resh name (heard "re-is" all three times) and Noa's Dagesh sound (heard "ma" all three times).
