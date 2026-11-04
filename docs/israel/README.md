# Israel track: "Sound like a local" (draft)

Status: DRAFT. Every line was written by an AI agent from general knowledge. No native speaker has checked the Hebrew, pointing, transliteration (capitals mark the stressed syllable), register tags, gender forms or etiquette notes. No audio exists. Nothing was tested with learners. All data carries `proofread:false`, `needsNativeReview:true` and a per-item `confidence` (high/medium/low) with a `confidenceReason` when not high.

## Files
- `data/israel/register-ladder.json`: 65 textbook vs everyday pairs (greetings, thanks, agreement, how-are-you, cafe, shuk, pharmacy, bus/Rav-Kav, taxi, sherut, train, directions, paying, bargaining, small talk, apologising, phone/WhatsApp). Lines with gender have `gender: speaker|addressee` and `forms.{m,f}`; the top-level `he` equals `forms.m`.
- `data/israel/fillers.json`: 22 fillers/discourse words (yalla, sababa, nu, achi, beseder, balagan, davka, kvar, ma pitom, vala, ...), each with an example. Only words whose meaning and register the author is fairly sure of.
- `data/israel/giveaways.json`: 15 learner errors with fix, "say it" line and a 3-option drill.
- `data/israel/scenarios.json`: 16 "Say it" scenarios, one natural / one stiff / one wrong-register option each.
- `data/israel/etiquette.json`: 11 short cards. The one regional card is phrased as "commonly reported" and flagged.
- `src/israel/model.js` (pure logic, validator, SRS hook, audio hook, recording-script list), `src/israel/israel.view.js`, `src/israel/style.js` (styles injected at runtime; no shell CSS edited).
- Tests: `tests/israel.data.test.js`, `tests/israel.logic.test.js`, `tests/israel.view.test.js` (fake DOM). `tests/israel.shot.mjs` is a real-Chromium 390px check, not part of `node --test`; it writes `docs/israel/shots/`.

## Shell wiring (needs lane 8; nothing in src/shell was edited)
Add to `ROUTES` in `src/shell/router.js`:

    { name: 'israel',    pattern: '/israel',      module: '../israel/israel.view.js', title: 'Sound like a local', owner: 'lane10', optional: true, group: 'learn', quick: 'nav.israel' },
    { name: 'israelsec', pattern: '/israel/:sec', module: '../israel/israel.view.js', title: 'Sound like a local', owner: 'lane10', paramQuery: { sec: 'sec' } },

Add the i18n string `nav.israel` = "Sound like a local", then run `node tools/build-precache.mjs` so `views.generated.js` and the precache list include `israel/israel.view.js`, `israel/model.js`, `israel/style.js` and `data/israel/*.json`. Sections: `#/israel/ladder|fillers|giveaways|say|etiquette`; `#/israel/say?seed=5` fixes the round.

## Audio hook (honest)
Each line has a stable id `il-<item>-<side>[-m|-f]` (`audioNeeds(data)` lists all 250 with Hebrew and transliteration for a recording script). The view asks `ctx.audio.status("line", id)` and shows a Play button ONLY when the player reports `source: "file"`. Browser text-to-speech is not offered as audio. Today every line shows "No audio yet." The kind `line` is the lane 4 kind; these ids are not in `data/audio/manifest.json`.

## SRS hook
Say it picks and giveaway drills are stored under the store key `israel.cards` (own key, ids `israel:scenario:<id>` and `israel:giveaway:<id>`), scheduled with lane 1's `review()`: natural = Good (3), stiff = Hard (2), wrong register = Again (1). `pickScenarios` shows overdue scenarios first. Stats are in `israel.stats`. These cards are NOT in `srs.cards`, so the main Review queue does not show them yet: merging needs lane 1 to teach `parseCardId` the `israel:` prefix (`dueCount(cards)` is exported for a home-screen badge).

## Native review checklist
1. Pointing and stress capitals on every line (especially feminine forms and loanwords).
2. Register tags and the "stiff"/"wrong register" judgements in scenarios.
3. Items marked low: lad-taxi-meter, lad-sherut-off, lad-sherut-pass, et-taxi-tip.
4. Regional claims (et-tel-aviv, the resh giveaway) and "commonly heard" statements.
5. Etiquette: tipping, haggling, Rav-Kav, Shabbat details.
