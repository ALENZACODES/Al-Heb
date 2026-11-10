# Accessibility round 2: newest views

Tool: `node tools/a11y/newviews.mjs` (writes `tools/a11y/newviews-run.json`; `--routes /a,/b`, `--strict`). Test: `tests/a11y.newviews.test.js` (about 2.5 minutes; skipped without Playwright or `tools/a11y/node_modules/axe-core`).
Run on 2026-11-04 with axe-core 4.14.0 in Chromium at 390x844, light and dark colour schemes, on: `/firstday`, `/firstday/ladder`, `/placement`, `/speak`, `/welcome`, `/reminders`, `/install`, `/offline`, `/vocab/themes`, `/progress`.

**No screen reader was used, and no real phone or physical keyboard.** Everything below is a DOM, CSS or axe measurement in desktop Chromium. A clean result means these checks found nothing; it does not mean the screens are accessible to a person using VoiceOver, TalkBack or NVDA.

## What each check measures
| Check | How | Scope |
|---|---|---|
| axe | `axe.run` violations (all rules, including colour contrast); contrast "incomplete" results are counted | 10 routes x light and dark, plus extra states below |
| Focus order | Tab from the heading through `main`; records each stop; counts positive `tabindex`, stops that jump backwards on screen more than once, zero-size stops | same |
| Visible focus | each stop must have an outline of at least 2px or a box-shadow | same |
| Names | every visible input, select, button, link and ARIA widget has a non-empty name (label, `aria-label(ledby)`, text, `alt`, `title`); radio groups need a legend or group label; placeholder-only inputs | same |
| Touch targets | stops under 24x24 CSS px (a label that wraps the control counts as part of the target) | same |
| Headings | one visible `h1`; no skipped levels in `main`; focus lands on the heading after in-app navigation (the shell deliberately does not move focus on the very first load) | same |
| Live regions | counts `role=status/alert/log` and `aria-live` in `main`; flags status-looking text outside one | static presence only |
| Reduced motion | context with `prefers-reduced-motion: reduce`; any element in `main` still running an animation or transition over 10ms, or `scroll-behavior: smooth` | same |
| Reflow | viewport 320px wide (WCAG 1.4.10) and 195px wide (200% of a 390px phone); page scrolls sideways, or content extends past the viewport outside a scroll container | light only |
| Hebrew | every text node with Hebrew letters in `main` must sit under `lang="he"`; Hebrew-only nodes must also compute `direction: rtl` | all states |

Extra states exercised: `/welcome` step 2 (after Continue), `/placement` after the start button, `/reminders` waiting on the card (headless Chromium, permission not granted).

## Result
21 findings on the first run, 2 left after the fixes below. Both remaining are in `/progress` (not a view this lane may edit).

### Fixed (files this stage was allowed to change)
- `src/firstday/ladder.view.js`: the "Hear it", "I read it" and "Not yet" buttons had `aria-label`s that did not start with their visible text ("Hear step 1", "I read step 1 correctly"), which breaks WCAG 2.5.3 Label in Name (axe `label-content-name-mismatch`, serious, 3 buttons). Now "Hear it, step N", "I read it, step N correctly", "Not yet, step N".
- `src/shell/{notify,install,offline}.view.js`: each pulled focus back to the heading after its async load finished. If a keyboard user had already tabbed to a control, focus jumped back (seen in the audit on `/offline`). They now focus the heading only when nothing else has focus.
- Tool correction (not a view fix): my first run reported "focus not on heading" on every route because the check ran after a direct page load, where the shell intentionally leaves focus alone. It now navigates in-app from `#/` , waits until the text of `main` stops changing (up to about 8 s; `/progress` loads data first, and an early run gave it a false clean reflow result), then checks focus. All 10 routes pass.

### Not fixed: needs the owning lane
1. `/progress` (`src/progress/`): at a 320px viewport a card is about 367px wide (`p.draft-flag` and `section.card` reach x=383, headings x=362). `main { overflow-x: clip }` (assets/css/app.css line 79) hides the overflow, so the page does not scroll sideways but the right edge of the card is cut off, at 320px and at 195px. Cause inside the progress markup was not identified (a child with a large minimum width); WCAG 1.4.10 reflow is not met there. Listed as known in the test.
2. `/speak` (`src/speak/`) and `/welcome` (`src/shell/onboarding.view.js`): radios were 20x20 and 22x22 CSS px. They have wrapping labels, so the touch target is the label; the tool counts that and reports no finding. Not changed.

## Measured and clean (with the limits of each)
- axe: no violations on any of the 10 routes in either colour scheme after the ladder fix; no contrast "needs review" items. axe finds roughly a third of WCAG issues at best.
- Focus: stops per route in light: firstday 1, ladder 4, placement 2 (after start: more), speak 9, welcome 3, reminders 2, install 1, offline 3, vocab/themes 40, progress 2. No positive tabindex, no invisible focus ring, no zero-size stops, no repeated backwards jumps. 40 stops on `/vocab/themes` is the pack list; there is no skip-to-list control (not a violation, a usability note).
- Names/labels: every visible control had a name; radio groups had a legend or group label.
- Live regions: each route has at least one status region in `main`; this measures presence, not that the right text is announced at the right time (needs a screen reader).
- Reduced motion: no running animation or transition in `main` under `reduce` on any route. Fine for these routes; other routes were not run.
- Hebrew: no issues found in the states exercised. Hebrew appeared only on `/firstday/ladder` and `/welcome`, and on `/placement` once a question was shown (1 span each). `/speak`, `/firstday` (initial), `/vocab/themes`, `/reminders`, `/install`, `/offline` and `/progress` showed no Hebrew in the captured states, so nothing was tested there.

## Not covered
- Any screen reader. Voice control. Switch access. Real iOS Safari or Android Chrome. Zoom by pinch (the reflow numbers use a narrow viewport as a stand-in for 200% and 400% zoom).
- States not driven: `/firstday` beyond the first card; `/firstday/ladder` after answering; `/placement` mid-test and result; `/speak` microphone modes and results; `/reminders` with permission granted or denied (the iOS-in-a-tab message is untested in a browser); `/install` iOS and Chromium-prompt cards; `/offline` while downloading, with failures, and with the update section; `/vocab/themes` pack open; `/progress` with real history.
- Dark mode was measured by axe and contrast "incomplete" counts only; no visual review.
- Phone width only for the audit (390px); desktop widths were not run in this round.
