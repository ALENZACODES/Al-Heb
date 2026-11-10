# Word Sprint (draft)

Route to add (shell owner): `{ name: 'sprint', pattern: '/sprint', module: '../sprint/sprint.view.js', title: 'Word Sprint', owner: 'sprint', group: 'learn', quick: 'nav.sprint' }`
Also add `/^\/sprint/` to `COUNTED` in `src/morning/engage.js` so sprint time counts toward the streak, and the string `nav.sprint` ("Word Sprint").
Deep link: `#/sprint?dest=prayer:<registry id>` or `israel:<scenario id>`.

- 5 minutes, local timer, paused while the page is hidden; the current word is always finished.
- Words: unfinished vocabulary list (proofread:false, shown as "Unverified vocabulary"). Destination words are the list words found in a siddur line or an Israel scenario (natural reply). Pointed tokens must match a pointed list form (optionally after one prefix letter), so recognition is conservative: e.g. 5 of 9 words in the kiddush line.
- Cards: hear/see and pick meaning, see and pick transliteration (approximate), pointed Hebrew then reveal English and self-rate. Rotated by card reps.
- SRS: answers go through `review()` to store key `srs.vocab` (same cards as the Vocabulary screen). Right = Good, otherwise Again (due in 10 minutes). "Known" on the end screen = state review with stability >= 3 days; this is not mastery.
- Audio: Listen button only if `ctx.audio.has('word', id)`; at present all word clips are missing, so the screen says "No audio yet".
- Not done: images, swipe games, pre-Shabbat mode, browser-tested layout (390px is guarded by CSS and a source test only).
