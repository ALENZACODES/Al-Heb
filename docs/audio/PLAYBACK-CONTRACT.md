# Shared playback contract

For the vocabulary and phrase owners. This is the player on the games branch. It is not a claim about the live site, and it is not a native review.

## What you call

`ctx.audio.play(kind, id, options)` and `ctx.audio.status(kind, id, options)`.

`kind` is `letter`, `word`, `line`, or `prayer`. `id` is the manifest id for that exact item. Do not pass another word's id because the one you wanted is missing.

`options.voice` is `m` or `f`. `options.tradition` is `israeli`, `sephardi`, or `ashkenazi`. Omit them and the player uses Settings. `options.rate` is `normal` or `slow` (0.7×). Omit it and the player uses the sound-bar speed.

`options.text` is pointed Hebrew used only when no file exists and a Hebrew device voice is allowed. It must be the same line. Do not send a different word, a transliteration, or another tradition's spelling.

## What you get back

- `source: 'file'` means the exact voice and tradition had a manifest entry that is not `missing`, and the audio element accepted it. `ended: true` means the element fired `ended`. `stopped: true` means navigation or `stop()` cut it off.
- `fileError` means the element fired `error` or `play()` was rejected. A 404 does not continue into a Dutch, English, or Arabic voice.
- `source: 'tts-fallback'` means there was no exact file and this device has a voice whose language tag starts with `he`. The utterance's `voice` is that voice. This is not a recording and it is not Sephardi or Ashkenazi.
- `source: 'none'` means nothing was spoken. The words stay on screen.

The sound bar says "Playing" only after the element's `playing` event (or the utterance's `start`). "Sound finished." follows `ended`. "Sound stopped." follows navigation. "The recording did not load." follows `error`.

## What the player will not do

It will not play the man clip when the woman is selected, or an Israeli file when Sephardi or Ashkenazi is selected, unless that item is marked `scope: 'israeli-only'` (phrasebook and anchor words) or the manifest entry carries `equivalentTo: ['israeli']` (the Sephardi stand-in rules in `data/audio/equivalence.json`, 2026-11-07: a Sephardi letter, vowel, syllable, prayer or word with no clip of its own plays the Israeli clip of the same voice, and the sound line names Israeli). A missing word list for one pronunciation is not filled with another tradition's list.

An alias such as `prayer` → `line/...` follows the target only for the same voice and tradition, and only when the target status is not `missing`. A missing target does not become a file.

## Local manifest on this branch

Counted from `data/audio/manifest.json` plus the three word shards in this tree, not from the live host. Most entries are `missing`. The non-missing entries are status `tts` and point at files under `audio/{m|f}/{tradition}/`. Woman Israeli and man Israeli letter files are on disk here. Sephardi and Ashkenazi letter files for alef are not. One woman Sephardi word file and one woman Ashkenazi word file are on disk. That is not the auditor's 25,122 site catalogue, and it is not proof those URLs answer 200 on the deployed server.

## Speed and Echo (2026-11-07)

Every clip plays at normal speed unless the learner changes it. Settings offers two controls, both off by default:

- **Speed**: `clipRate` is `normal` (1×) or `slow` (0.7×). The rate is set on the audio element with `preservesPitch`, so the same voice is heard slower at the same pitch. The browser voice gets the same rate. The sound line says "Normal speed." or "Slow, 0.7×." after "Playing".
- **Echo** (`echoMode`): for a letter, vowel, syllable or word, `play()` becomes listen, hear it slowly, say it: the clip at the chosen speed, a 350 ms gap, the clip again at 0.7×, then a silent turn as long as the slow clip × 1.25 (clamped to 0.9–6 s) for the learner to say it back. Media events carry `step: 'first' | 'slow' | 'your-turn'`; the sound line reads "Now slowly.", "Your turn: say it.", then "Sound finished. Press Play to hear it again.". Lines, prayers and sequences (`playSequence`) never echo. `stop()` interrupts any step. `audio.echo()` runs the sequence on demand; `play(kind, id, { noEcho: true })` opts one call out.
