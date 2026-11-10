# Render queue, Nov 7 2026 (Google Cloud Text-to-Speech, no key in this environment)

Every command below was run here as a dry run (no network); the summaries are pasted as printed. `--execute` needs `GOOGLE_TTS_API_KEY` in the environment and `ffmpeg` on the path (loudness pass to the repo's delivery format). Commit the result as John Khan; the manifest rows already point at these paths.

## Voices and the HD guard (checked in `tools/audio/tts/google.mjs`)

- Defaults: `he-IL-Wavenet-B` (man, Ari) and `he-IL-Wavenet-A` (woman, Noa), the pair the owner passed for production on 2026-11-05 (`APPROVED_VOICES`).
- Any voice name matching `/Chirp3|Chirp-HD|Chirp_HD|HD-/` is refused unless `allowHd: true` or `GOOGLE_TTS_ALLOW_HD=1`. Checked: `GOOGLE_TTS_VOICE_M=he-IL-Chirp3-HD-Charon` without the flag -> `google: he-IL-Chirp3-HD-Charon is a multilingual HD voice, not an approved Israeli Hebrew voice (he-IL-Wavenet-B, he-IL-Wavenet-A). Pass allowHd:true / GOOGLE_TTS_ALLOW_HD=1 to use it on purpose.`
- Owner directive (Nov 7): prayer LINES are to be spoken with Google Chirp 3 HD, not WaveNet. Letters, vowels, syllables and words stay WaveNet unless the owner says otherwise.
- Which Chirp 3 HD names the renderer supports: it has no voice list; it passes whatever name it is given to the API. The only he-IL Chirp names written anywhere in this repo are `he-IL-Chirp3-HD-Charon` (man) and `he-IL-Chirp3-HD-Kore` (woman) in `data/audio/tts-prices.json`, marked there as "arbitrary starting picks", `verified: false`. `docs/verification/VERIFICATION.md` 4.06/4.19 records 30 he-IL Chirp3-HD voices (16 male, 14 female) without listing them. Confirm the exact names against the provider's voice list at render time (`GET https://texttospeech.googleapis.com/v1/voices?languageCode=he-IL`); do not take names from memory.
- Price: the adapter's constant was 16, which matched neither verified Google row (audit lane, Nov 7); it is now the WaveNet rate, US$4 per million characters, and `priceFor(name)` gives US$30 per million for a Chirp 3 HD name (`data/audio/tts-prices.json`, verified 2026-11-03). The dry run prices each row by the voice it will get, so a Chirp run prints the Chirp cost and names the Chirp voices in its header. Both are under the provider's monthly free tiers for these sizes; "billing of niqqud marks unverified" is the renderer's own caveat.
- Chirp 3 HD takes plain text only (the adapter throws on SSML) and, per `docs/verification/VERIFICATION.md` 4.18, offers no custom pronunciations and no pause control for he-IL. The adapter still runs `cleanHebrewForTts()` (cantillation, sof pasuq, meteg off; maqaf -> space).

## (a) The 62 redo prayer ids (`docs/audio/redo-israeli-2026-11-07.txt`), Chirp 3 HD, both voices

```sh
# dry run (what was run here; the HD env vars change nothing in a dry run except the request builder)
GOOGLE_TTS_ALLOW_HD=1 GOOGLE_TTS_VOICE_M=he-IL-Chirp3-HD-Charon GOOGLE_TTS_VOICE_F=he-IL-Chirp3-HD-Kore \
  node tools/audio/render_tts.mjs --provider google --voice both --kinds prayer --ids docs/audio/redo-israeli-2026-11-07.txt --redo

# render
GOOGLE_TTS_API_KEY="$GOOGLE_TTS_API_KEY" GOOGLE_TTS_ALLOW_HD=1 GOOGLE_TTS_VOICE_M=he-IL-Chirp3-HD-Charon GOOGLE_TTS_VOICE_F=he-IL-Chirp3-HD-Kore \
  node tools/audio/render_tts.mjs --provider google --voice both --kinds prayer --ids docs/audio/redo-israeli-2026-11-07.txt --redo --execute
```

Dry-run summary with the Chirp env: `DRY RUN: provider=google voice=both (m=he-IL-Chirp3-HD-Charon, f=he-IL-Chirp3-HD-Kore) REDO (replaces existing files)` then `clips=124 characters=18664 est. cost=US$0.5599`. Without the env (WaveNet pair): `clips=124 characters=18664 est. cost=US$0.0747`. No text warnings. Each `.meta.json` will carry the voice name and the spoken text, so the next person can tell a Chirp clip from a WaveNet one.

To render the same set with the approved WaveNet pair instead, drop the three `GOOGLE_TTS_*` variables.

## (b) The shalom lesson words, WaveNet, both voices (`docs/audio/redo-words-2026-11-07.txt`: r03-w1, r04-w2, r04-w3)

These three are the only word ids flagged in docs/audio (`ISRAELI-VOICE-2026-11-07.md`: not re-rendered on Nov 7; redo only if they sound wrong on a phone). No other regressed word id is recorded.

```sh
node tools/audio/render_tts.mjs --provider google --voice both --kinds word --ids docs/audio/redo-words-2026-11-07.txt --redo
GOOGLE_TTS_API_KEY="$GOOGLE_TTS_API_KEY" node tools/audio/render_tts.mjs --provider google --voice both --kinds word --ids docs/audio/redo-words-2026-11-07.txt --redo --execute
```

Dry-run summary: `clips=6 characters=58 est. cost=US$0.0002`. No text warnings.

## (c) Still-missing Israeli clips, WaveNet, both voices

```sh
node tools/audio/render_tts.mjs --provider google --voice both                                  # default kinds: syllable,word,line,prayer
node tools/audio/render_tts.mjs --provider google --voice both --kinds letter,vowel,letter-lecture
GOOGLE_TTS_API_KEY="$GOOGLE_TTS_API_KEY" node tools/audio/render_tts.mjs --provider google --voice both --execute
```

Dry-run summaries: default kinds `clips=3 characters=22 est. cost=US$0.0001` (all three are man-voice words: `h53c53bdf` חָדָשׁ, `h1eeebe32` פָּשַׁט, `h3e5d0f9c` תְּקוּפָה); letter/vowel/letter-lecture `clips=0`; per kind: syllable 0, word 3, line 0, prayer 0. The other 658 `missing` Israeli word rows are `vocab-alias` rows (`aliasOf` another word) that the player serves from their target clip; the renderer skips them by design.

## (d) Morning screen Hebrew lines

`src/morning` plays one clip, Modeh Ani (`line/modeh-ani-1`, both voices present, `tts`). `data/morning-verses.json` holds 130 Tanakh verses (10,413 Hebrew characters) that the screen shows as text only; none has a manifest row, and only 2 happen to match an existing Israeli clip's text. Nothing to render until rows exist: the renderer works from manifest rows, and adding 130 x 2 `line` rows is a manifest change (`tools/audio/build_manifest.mjs` is out of step with the committed manifests, see ISRAELI-VOICE-2026-11-07.md "Still open", so the rows would need the maintained path). If added, at the WaveNet rate: 260 clips, about 20,800 characters, about US$0.08 (about US$0.62 with Chirp 3 HD).

## (e) For the owner to confirm before running: all Israeli prayer LINE clips through Chirp 3 HD

The 580 Israeli `line` clips (290 ids x 2 voices) are the prayer lines `#/read` plays. They exist today (WaveNet or earlier renders; the sidecars of the Nov 7 prayer batch say only `tts:google`). Re-rendering them with Chirp would replace 580 files in place:

```sh
GOOGLE_TTS_ALLOW_HD=1 GOOGLE_TTS_VOICE_M=he-IL-Chirp3-HD-Charon GOOGLE_TTS_VOICE_F=he-IL-Chirp3-HD-Kore \
  node tools/audio/render_tts.mjs --provider google --voice both --kinds line --redo
```

Dry-run summary (Chirp env): `clips=580 characters=37070 est. cost=US$1.1121`. The 36 non-alias `prayer` rows (`--kinds prayer --redo`, WaveNet pair): `clips=36 characters=14286 est. cost=US$0.0571`. Listen to a handful before pushing: `audio/m/israeli/prayer/oseh-shalom.mp3`, `audio/f/israeli/prayer/sim-shalom.mp3`, `audio/m/israeli/line/bless-priestly-1.mp3`.

## Sephardi lines: how the pipeline speaks them, and what Chirp can do about accent

The owner's decision of Nov 7 (`SEPHARDI-PLAYBACK-2026-11-07.md`) retires the respelled Sephardi clips from playback, so this set is for the record, not a queue item. The manifests mark the 258 Sephardi line clips `status: tts, source: paid-cloud`; the label table (`src/shell/audio-labels.js`) and the `tools/tts` pipeline treat every non-Israeli synthetic clip as made from a Latin-letter "sound word" (a respelling that spells the Sephardi vowel values) spoken by an outside voice as if it were a foreign word, not from pointed Hebrew. The coordinator measured the live clips at about 2.5x the Israeli length (6.7 s against 2.7 s for `bless-priestly-1`), which fits that method; nobody listened here. The renderer in this repo refuses `--tradition sephardi` outright ("no TTS provider offers it"). Feeding Chirp 3 HD pointed Hebrew with `languageCode he-IL` gives Modern Israeli pronunciation, which already follows the Sephardi vowel values (qamats "a", tav always "t", cholam "o"); what it cannot give is the guttural ayin, chet and the emphatic consonants of a traditional Sephardi reading, because for he-IL Chirp offers no SSML, no `<phoneme>` override and no custom pronunciations (VERIFICATION.md 4.18). So the realistic choices are: Israeli clips as the Sephardi sound (the decision taken), or a human Sephardi reader.

## Noted, no action

- `audio/f/sephardi/line/avot-1.mp3` is 529,449 bytes, over the service worker's 524,288-byte clip cap (audit lane). It is a retired Sephardi file that the player no longer selects, so it is never requested; left as is.
