# Device-profile walk (P074)

Run: 2026-11-04T06:17:24.425Z · Chromium 153.0.8010.12 · 180 page visits in 320s

## What this is, and is not

This is Playwright **device emulation** in headless Chromium: each profile sets the viewport, device pixel ratio, touch events and user-agent string of the named phone or tablet. It is **not a real device**. Nobody held a phone; no finger tapped anything; there is no real GPU, no real font fallback, no OS keyboard, no notch, no browser chrome eating the viewport, no network throttling. In this environment WebKit is not installed, so the iPhone SE, iPhone 14 Pro and iPad Mini rows ran in Chromium too and say nothing about Safari (iOS Safari bugs with `100vh`, `env(safe-area-inset-*)`, `position: fixed`, font synthesis or niqqud placement cannot appear here). What the table can tell you is what Chromium does at those exact CSS widths and pixel densities. A real-device pass (BrowserStack, a borrowed phone, or Safari Technology Preview's responsive mode) is still owed before any claim that the app "works on iPhone".

Checks per route and profile: (1) **overflow**: `document.scrollWidth > clientWidth`, plus any box whose right edge passes the viewport even when `main { overflow-x: clip }` hides it ("clipped only"); (2) **tap**: interactive controls with a box under 44 x 44 CSS px (inline links inside running text are exempt, a checkbox or radio is measured by its label); (3) **tiny**: elements with visible text whose computed `font-size` is under 12 CSS px; (3b) **word split**: a single word (4+ letters, Latin or Hebrew) inside a box narrower than 240 px that is laid out across two lines, i.e. broken mid-word by `overflow-wrap`/`word-break`; (4) **RTL**: Hebrew text nodes that also contain Latin and wrap across lines without bidi isolation or with a fragment narrower than one glyph (a word split at the script boundary), and pointed Hebrew (niqqud) whose line box is tighter than 1.15 x font-size or sits inside an `overflow: hidden/clip` ancestor no taller than itself; (5) **nav covers**: with the page scrolled to its end, how many px of `main` sit under a `position: fixed` bar (the phone bottom nav); (6) **errors**: page errors and console errors (resource-load failures are listed but not counted). Every visit also records whether the view reached `body[data-ready="1"]`. localStorage is seeded as onboarded with 24 lessons complete, so routes show their normal state rather than the welcome screen. Screenshots are full-page (capped at 3000 CSS px), JPEG quality 40, at CSS-pixel scale (1x), so they show layout, not the device's pixel density. In a full-page capture the fixed bottom nav is painted once at the height of the first viewport, so it appears to float mid-page; that is a screenshot artifact, not a layout bug.

## Profiles

| Profile | CSS viewport | DPR | Touch | Native engine (not used here) |
|---|---|---|---|---|
| iPhone SE | 320 x 568 | 2 | yes | webkit |
| iPhone 14 Pro | 393 x 660 | 3 | yes | webkit |
| Pixel 7 | 412 x 839 | 2.625 | yes | chromium |
| Galaxy S9+ | 320 x 658 | 4.5 | yes | chromium |
| iPad Mini | 768 x 1024 | 2 | yes | webkit |

## Results

Each cell is light / dark. Counts are distinct flagged elements on that page. "ovf" is the page scrollWidth minus clientWidth in px (0 = none); "(clip)" means boxes poke out but `main` clips them so the page itself does not scroll sideways. Screenshots: `shots-devices/<profile>-<scheme>-<route>.jpg`.

| Route | Profile | ready | ovf | tap <44 | text <12px | word split | RTL | nav covers | errors |
|---|---|---|---|---|---|---|---|---|---|
| `/` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/learn` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/learn` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/learn` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/learn` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/learn` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/letters/alef` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/letters/alef` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/letters/alef` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/letters/alef` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/letters/alef` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/placement` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/placement` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/placement` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/placement` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/placement` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/sprint` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/sprint` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/sprint` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/sprint` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/sprint` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/service` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/service` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/service` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/service` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/service` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/read/bless-priestly-1` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/read/bless-priestly-1` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/read/bless-priestly-1` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/read/bless-priestly-1` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/read/bless-priestly-1` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/calendar` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/calendar` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/calendar` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/calendar` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/calendar` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/settings` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/settings` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/settings` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/settings` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/settings` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/speak` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/speak` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/speak` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/speak` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/speak` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/offline` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/offline` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/offline` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/offline` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/offline` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/reminders` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/reminders` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/reminders` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/reminders` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/reminders` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/install` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/install` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/install` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/install` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/install` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/vocab/themes` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/vocab/themes` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/vocab/themes` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/vocab/themes` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/vocab/themes` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/welcome` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/welcome` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/welcome` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/welcome` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/welcome` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday/ladder` | iPhone SE | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday/ladder` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday/ladder` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday/ladder` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/firstday/ladder` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/progress` | iPhone SE | yes / yes | 0 (clip) / 0 (clip) | - / - | - / - | - / - | - / - | - / - | - / - |
| `/progress` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/progress` | Pixel 7 | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |
| `/progress` | Galaxy S9+ | yes / yes | 0 (clip) / 0 (clip) | - / - | - / - | - / - | - / - | - / - | - / - |
| `/progress` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - | - / - |

## Findings by element

Grouped across profiles by selector pattern (`:nth-of-type` and state classes stripped; "xN per page" counts the matching elements; "all (shell)" = header, nav or sound bar, present on every route). The "rule / file" column lists the matching stylesheet rules that set the measured property (own rule first, then the ancestors it inherits or scales from) and the file each lives in (a `<style>` string inside a view module, or assets/css).

### Overflow (6)

| Route | Element | right edge | where | rule / file |
|---|---|---|---|---|
| `/progress` | `main#main > div.pg > p.draft-flag` | 383px (w 367) | iPhone SE, Galaxy S9+ | `.draft-flag {padding:0.5rem 0.75rem} @ assets/css/app.css`<br>assets/css/app.css, src/pronunciation/ui.js |
| `/progress` | `main#main > div.pg > section.card` | 383px (w 367) | iPhone SE, Galaxy S9+ | `.card {padding:1rem 1.25rem} @ assets/css/app.css`<br>assets/css/app.css, src/pronunciation/ui.js |
| `/progress` | `h2#pg-h-now` | 362px (w 325) | iPhone SE, Galaxy S9+ | - |
| `/progress` | `main#main > div.pg > section.card > p.small.muted` | 362px (w 325) | iPhone SE, Galaxy S9+ | - |
| `/progress` | `main#main > div.pg > section.card > ul.pg-now` | 362px (w 325) | iPhone SE, Galaxy S9+ | `.pg ul, .pg ol {margin:0px} @ <style in main>`<br>`.pg-now {padding:0px;margin:0px} @ <style in main>`<br>src/progress/progress.view.js |
| `/progress` | `div.pg > section.card > ul.pg-now > li` | 362px (w 305) | iPhone SE, Galaxy S9+ | `.pg-now li {grid-template-columns:1fr auto;margin:0px} @ <style in main>`<br>src/progress/progress.view.js |

### Tap targets under 44 px (0)

None.

### Text under 12 px (0)

None.

### Words broken mid-word (0)

None.

### RTL: mixed-script wrapping and niqqud clipping (0)

None flagged. (The check is a heuristic on line boxes and overflow; it cannot see glyph rendering.)

### Fixed bar covering the end of the content (0)

None: with the page scrolled to the bottom, no fixed bar overlaps the end of `main`.

### Errors and failed requests (0 visits)

None.

## Diff vs previous run (2026-11-04T06:07:30.895Z)

Issues before: 0; now: 24; fixed: 0; new: 24.


New:

- iPhone SE|light|/progress|overflow|main#main > div.pg > p.draft-flag
- iPhone SE|light|/progress|overflow|main#main > div.pg > section.card
- iPhone SE|light|/progress|overflow|h2#pg-h-now
- iPhone SE|light|/progress|overflow|main#main > div.pg > section.card > p.small.muted
- iPhone SE|light|/progress|overflow|main#main > div.pg > section.card > ul.pg-now
- iPhone SE|light|/progress|overflow|div.pg > section.card > ul.pg-now > li:nth-of-type(1)
- iPhone SE|dark|/progress|overflow|main#main > div.pg > p.draft-flag
- iPhone SE|dark|/progress|overflow|main#main > div.pg > section.card
- iPhone SE|dark|/progress|overflow|h2#pg-h-now
- iPhone SE|dark|/progress|overflow|main#main > div.pg > section.card > p.small.muted
- iPhone SE|dark|/progress|overflow|main#main > div.pg > section.card > ul.pg-now
- iPhone SE|dark|/progress|overflow|div.pg > section.card > ul.pg-now > li:nth-of-type(1)
- Galaxy S9+|light|/progress|overflow|main#main > div.pg > p.draft-flag
- Galaxy S9+|light|/progress|overflow|main#main > div.pg > section.card
- Galaxy S9+|light|/progress|overflow|h2#pg-h-now
- Galaxy S9+|light|/progress|overflow|main#main > div.pg > section.card > p.small.muted
- Galaxy S9+|light|/progress|overflow|main#main > div.pg > section.card > ul.pg-now
- Galaxy S9+|light|/progress|overflow|div.pg > section.card > ul.pg-now > li:nth-of-type(1)
- Galaxy S9+|dark|/progress|overflow|main#main > div.pg > p.draft-flag
- Galaxy S9+|dark|/progress|overflow|main#main > div.pg > section.card
- Galaxy S9+|dark|/progress|overflow|h2#pg-h-now
- Galaxy S9+|dark|/progress|overflow|main#main > div.pg > section.card > p.small.muted
- Galaxy S9+|dark|/progress|overflow|main#main > div.pg > section.card > ul.pg-now
- Galaxy S9+|dark|/progress|overflow|div.pg > section.card > ul.pg-now > li:nth-of-type(1)
