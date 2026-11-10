# Secular game music

Optional game / background beds and songs only. They do not play under prayer or the sacred listen shelf, and they pause while learner speech plays.

## Kenney Music Loops 1.1

Author: Kenney (https://kenney.nl/). Licence: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). Credit is optional.

- night_at_the_beach.ogg — Night at the Beach
- flowing_rocks.ogg — Flowing Rocks
- mission_plausible.ogg — Mission Plausible

## Original ALEF music (2026-11-09)

Author / owner: John Khan / ALENZA CODES.  
Licence: **All rights reserved, John Khan / ALENZA CODES.**

Original compositions made for ALEF. No third-party recordings. Files are metadata-stripped. See `ORIGINAL-MANIFEST.json` for durations and lyrics.

Instrumental beds:

- klezmer-loop-a.mp3 / klezmer-loop-b.mp3 — Jewish folk / klezmer dance loop
- niggun-calm-loop-a.mp3 / niggun-calm-loop-b.mp3 — Calm niggun / contemplative loop
- cantor-strings-a.mp3 / cantor-strings-b.mp3 — Cantorial-inspired strings (instrumental bed only; not prayer audio)

Optional songs (never under prayer screens or over learner speech):

- yachad.mp3 — Jewish folk / Reform-friendly communal song
- open-hands.mp3 — Reform Judaism–friendly worship song
- gates-of-morning-a.mp3 / gates-of-morning-b.mp3 — Cantorial / liturgical-inspired original

## Celebration stings (cut from the songs above, same owner and licence)

`stings/yachad-sting.mp3` and `stings/open-hands-sting.mp3`: about 6 seconds of each chorus, played by `src/audio/sting.js` after a finished lesson, only when the learner has music on. Chorus starts used: Yachad at 110.75 s, Open Hands at 37.25 s (loudest sustained 6 s windows). Rebuild with:

    ffmpeg -ss 110.75 -t 6 -i audio/music/yachad.mp3 -af "afade=t=in:d=0.25,afade=t=out:st=4.8:d=1.2" -map_metadata -1 -c:a libmp3lame -b:a 128k audio/music/stings/yachad-sting.mp3
    ffmpeg -ss 37.25 -t 6 -i audio/music/open-hands.mp3 -af "afade=t=in:d=0.25,afade=t=out:st=4.8:d=1.2" -map_metadata -1 -c:a libmp3lame -b:a 128k audio/music/stings/open-hands-sting.mp3
    node tools/audio/summary.mjs

The two sting files are present under `audio/music/stings/`.

## Seamless loop recut (2026-11-09)

Klezmer A/B, Niggun Calm A/B and Cantor Strings A/B were trimmed (trailing silence / fade-out removed) and crossfade-looped (~1.2–1.8 s) so HTML audio loop joins cleanly. Metadata stripped again after re-encode.

A further pass the same evening trimmed the remaining lead-in / tail silence, recut each bed with an equal-power (half-sine) crossfade of about 1.6–2.7 s, applied a gentle high-shelf lift (+3 to +6 dB at 8 kHz) so the beds are less muffled than the Kenney loops, and ran a −1 dBTP true-peak limiter on the hot tracks while keeping loudness around −14 to −16 LUFS. Stings were rebuilt from the limited songs with the same commands as above. Files are 192 kbps stereo 44.1 kHz MP3, metadata stripped again after re-encode.

That long end-to-start crossfade still did not loop musically (the join smeared different bars, and the player also dipped volume for 1.2 s at the wrap). A later pass cut each bed to a downbeat-aligned 16- or 32-bar loop in the steady middle of the track, with only a 10 ms splice, and plays those short beds through the gapless Web Audio engine (not HTMLAudio.loop).
