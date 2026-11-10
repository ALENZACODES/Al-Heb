# Proposal (not applied): let a default learner reach the synthetic clips

Status: proposal only. Nothing in `src/` depends on it. Measured basis: `docs/qa/JOURNEY-WITH-CLIPS.md`.

## The problem

All 87 clips are Man + Israeli. The default setting is Woman + Sephardi, so a default learner never gets a clip: the player will not swap voices, and `data/audio/equivalence.json` (no rules, human review required) does not let an Israeli clip stand in for Sephardi. They get the device voice or "No audio yet". Nothing on screen says a clip exists.

## What this must not do

- Not add an equivalence rule: that needs a native-speaker review, which has not happened.
- Not change the default voice or tradition, and not play a clip silently under a setting it does not match.
- Not describe a clip as a recording or as the learner's style.

## The proposal: an opt-in, labelled second button

`01-offer-israeli-man-clip.patch` (touches `src/shell/audio-access.js` only; applies cleanly with `git apply --check` on the tree this note was written against). Where the learner's own setting has no clip but `audio.status(kind, id, { voice: 'm', tradition: 'israeli' })` says a file exists, `audioButton` adds a second button, "Hear the synthetic Israeli man clip", with the chip "Not your setting (Synthetic voice (...unreviewed)). It is an Israeli-style man's voice." Pressing it plays that file with `play(kind, id, { voice: 'm', tradition: 'israeli' })`, which the player already supports.

What was run on it (headless Chrome, default settings, word trace opened on each word by `?word=`): for "dad" (`r07-w1`), "chen" (`r47-w4`) and "tea" (`il07-w6`) one extra button appeared and pressing it requested the matching `audio/m/israeli/word/*.mp3` file. Nothing was heard, and no test file was added for it.

What it does not do, and what was not checked:

- It covers only buttons built by `audioButton` (word trace and the other views that use it). The lesson Listen buttons (`playButton` in `src/curriculum/audio-ui.js`) would need the same few lines.
- A Sephardi learner's app loads only the Sephardi shard (0 clips), so the 52 vocabulary-id clips in `manifest-words-israeli.json` stay unreachable for them unless `src/shell/audio-shards.js` also loads the Israeli shard on demand. Only clips in `data/audio/manifest.json` (35) were tried.
- The new button's height was not measured against the 48 px rule, and no wording review was done.
- Whether an Israeli-style man's synthetic voice is something a Sephardi-setting learner should be offered at all is a product and review decision.

Smaller alternative if the second button is not wanted: leave the player alone and, in Settings only, add one line under Voice: "A few words have a synthetic Israeli-style man's clip. Choose Man and Israeli to hear it."
