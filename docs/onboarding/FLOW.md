# First-run flow (onboarding) — DRAFT, untested with learners

Screen: `#/welcome` (existing route; `src/shell/router.js` was NOT edited). The route line points at
`src/shell/onboarding.view.js`, which now only re-exports `mount` from `src/onboarding/firstrun.view.js`.
`src/app.js` still redirects Home to `#/welcome` while `settings.onboarded` is false (unchanged).

Files owned by this lane: `src/onboarding/*`, `src/shell/onboarding.view.js` (first-run section = whole file),
`data/onboarding/plans.json`, `tests/onboarding.test.js`, this doc.

## Stages

1. **Goal and letters (one screen)** — "What do you want to do first?" with three choices (Read prayers or Torah /
   Speak in Israel / Both, or not sure), then "Can you already read the Hebrew letters?". The goal is the existing
   `goal` setting (`read` | `israel` | `both`), preselected to its current value (default `read`), so a learner who
   skips it gets the old flow. Defaults it derives, all changeable later (Settings, or "Change synagogue or
   pronunciation" and "Change goal or minutes a day" on the plan card):
   - Israel -> `congregation` is set to `israeli` (only when the goal was not already Israel, so a later re-answer
     does not overwrite a pick), stage 2 is skipped, and the flow goes straight to the plan card
     ("Israeli pronunciation", Start button = first Israel lesson).
   - Read or Both -> stage 2 as below (Sephardi / Ashkenazi / Israeli asked, Sephardi preselected).
   The goal choices have no descriptions and the "Some" / "Yes" letter answers have none either, so Continue
   stays above the tab bar at 375x667 (it was measured at y526-574 with the audio notice showing; with the long
   descriptions it sat under the bar).
   Letters question: "Can you already read the Hebrew letters?"
   - "No, start from the beginning" -> `#/firstday`
   - "Some" -> `#/placement`
   - "Yes, I read with vowels" -> `#/placement`
   Continue saves `onboarding.v1` and sets `settings.onboarded = true` and `goal`, then shows stage 2 (or the plan card for Israel). The question is never
   shown again by itself: a return visit to `#/welcome` shows the plan card. The only way back is the
   "Change my starting point" button on that card (it rewrites `letters`/`start`, keeps denomination and minutes).
   The destination is reached by the plan card's primary button, or by "Skip the rest and start now" on stages 2-3.
2. **Synagogue and pronunciation** — denomination (Reform / Conservative / Reconstructionist / Orthodox) and
   pronunciation (Sephardi / Ashkenazi / Israeli), each with a one-line statement of what it changes.
   - Pronunciation writes the existing `congregation` setting (`src/shell/settings.js`, `ENUMS.congregation`) on
     Continue. Skip leaves it untouched.
   - Denomination: there is **no** settings key for it, so it is stored only in `onboarding.v1.denomination`. It
     pre-selects a pronunciation suggestion (Reform/Conservative/Reconstructionist -> Sephardi; Orthodox -> none,
     with a note that congregations vary) unless the learner already picked one. It does not change lessons or the
     calendar; the calendar's festival-day mode stays in `calendar.prefs` (lane 1). Possible later hook for lane 1:
     read `onboarding.v1.denomination` to default `observance`.
3. **Your week** — minutes per day (5/10/15/20/30) -> 7-day card built by `buildPlan` in `src/onboarding/model.js`
   from `data/onboarding/plans.json`, the read-track lessons (`data/curriculum/lessons.json`, read only) and the
   placement result (`placement.v1`, read only). Rules: at most one lesson part per day; lessons longer than the
   daily budget are split over up to 4 days; extras (Trace letters, Sounds, Words you can already read, Syllable
   ladder, Look-alike checkpoint, Fade-out recall, Pointed-to-unpointed ladder, Read) fill the remaining minutes once
   the lesson that unlocks them is reached, each at most twice a week; day 7 starts with review. Items whose view
   is missing from the build are hidden via `ctx.hasRoute`. Before the placement check is taken the lessons are a
   placeholder from r01 and the card says so; after it, the card rebuilds from the recommended lesson and the
   primary button becomes "Start lesson rNN".
4. **Tests** — `tests/onboarding.test.js` (fake DOM; includes the goal question, Israel skipping stage 2, read/both still asking): answer->route mapping, storage, never-re-ask,
   settings wiring, plan shape and route validity, hasRoute filtering, labels/legends/button types/unique ids.

## Store keys
- `onboarding.v1`: `{ v:1, letters:'none'|'some'|'vowels', start:'/firstday'|'/placement', askedAt, denomination|null,
  minutesPerDay|null, step:'letters'|'congregation'|'minutes'|'plan' }`
- Reads `placement.v1` (never writes). Writes settings `onboarded` and `congregation` only.

## Settings hook ("Change my starting point")
`src/shell/settings.view.js` was not edited. Its existing link `t('settings.redo')` ("Run the first-time setup
again") goes to `#/welcome`, which now lands on the plan card with the "Change my starting point",
"Change synagogue or pronunciation" and "Change minutes a day" buttons. If lane 8 wants a direct link, add to
settings.view.js: `h('a', { class: 'btn secondary', href: '#/welcome' }, 'Change my starting point')` and
optionally rename `settings.redo` in `src/shell/i18n.js`. The "Reset settings to defaults" button keeps
`onboarded: true`, so a reset does not re-ask the question either.

## Not done / needs other lanes
- Precache: `src/onboarding/*` and `data/onboarding/plans.json` must be in `precache-manifest.js` for offline
  first run (`npm run precache`, not run by this lane).
- Voice (Man/Woman) is not asked at first run; it remains in Settings. The goal is asked on the first screen
  (see Stage 1); it is also still on the optional minutes screen ("Change goal or minutes a day").
- `tools/smoke.mjs` (first-run block, ~lines 86-92) and `tools/a11y/keyboard.mjs` (onboarding flow, ~lines 40-56)
  still look for "Man (Ari)", "Both" and a "Start learning" button and expect Enter to leave `#/welcome`.
  Needed update (owner: lane 8): check the radio labelled "No, start from the beginning", press the button
  "Continue" (`#ob-letters-continue`), assert `localStorage['alef:onboarding.v1']` has `letters:'none'` and
  `alef:settings` has `onboarded:true`; the screen stays on `#/welcome` (stage 2) until "Skip the rest and start
  now" (`#ob-skip-now`) or the plan card's `#ob-start` is followed. Until then `tests/a11y.browser.test.js`
  (Playwright, skipped where Chromium is absent) reports those two checks as failures.
- Not run in a browser or on a phone by this lane; no learner has tried the flow.
