# ALEF game UI SFX

Kenney Interface Sounds, CC0 1.0. The 30 curated MP3s in this folder are the staged pack (`ui/MAP.json` in the source zip). Credits: `audio/sfx/CREDITS.md`. Licence text: `audio/sfx/License-Kenney-CC0.txt`.

The helper in `src/audio/sfx.js` keeps every MAP key. The shared player the games call uses only three feedback sounds: correct (`success.mp3`), a gentle miss (`miss.mp3`, including calls that ask for `error`), and streak (`streak.mp3`). Other names stay available to `createSfxController` and fail silently on the shared player. A text line (`Correct`, `Not this time`, `Streak`) is the visual twin.

Effects stay off for the first minute, until the learner has a real win, and while speech, prayer, or a cantorial recording is playing. `soundEffects` still defaults to false. `calmMode`, `audioFree`, mute, and reduced motion also suppress them.

These MP3s are not part of the install precache. Missing files fail silently. Do not treat a copied file as proof that a phone speaker played it.
