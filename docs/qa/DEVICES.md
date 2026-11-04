# Device-profile walk (P074)

Run: 2026-11-04T05:38:27.503Z · Chromium 153.0.8010.12 · 100 page visits in 143s

## What this is, and is not

This is Playwright **device emulation** in headless Chromium: each profile sets the viewport, device pixel ratio, touch events and user-agent string of the named phone or tablet. It is **not a real device**. Nobody held a phone; no finger tapped anything; there is no real GPU, no real font fallback, no OS keyboard, no notch, no browser chrome eating the viewport, no network throttling. In this environment WebKit is not installed, so the iPhone SE, iPhone 14 Pro and iPad Mini rows ran in Chromium too and say nothing about Safari (iOS Safari bugs with `100vh`, `env(safe-area-inset-*)`, `position: fixed`, font synthesis or niqqud placement cannot appear here). What the table can tell you is what Chromium does at those exact CSS widths and pixel densities. A real-device pass (BrowserStack, a borrowed phone, or Safari Technology Preview's responsive mode) is still owed before any claim that the app "works on iPhone".

Checks per route and profile: (1) **overflow**: `document.scrollWidth > clientWidth`, plus any box whose right edge passes the viewport even when `main { overflow-x: clip }` hides it ("clipped only"); (2) **tap**: interactive controls with a box under 44 x 44 CSS px (inline links inside running text are exempt, a checkbox or radio is measured by its label); (3) **tiny**: elements with visible text whose computed `font-size` is under 12 CSS px; (4) **RTL**: Hebrew text nodes that also contain Latin and wrap across lines without bidi isolation or with a fragment narrower than one glyph (a word split at the script boundary), and pointed Hebrew (niqqud) whose line box is tighter than 1.15 x font-size or sits inside an `overflow: hidden/clip` ancestor no taller than itself; (5) **nav covers**: with the page scrolled to its end, how many px of `main` sit under a `position: fixed` bar (the phone bottom nav); (6) **errors**: page errors and console errors (resource-load failures are listed but not counted). Every visit also records whether the view reached `body[data-ready="1"]`. localStorage is seeded as onboarded with 24 lessons complete, so routes show their normal state rather than the welcome screen. Screenshots are full-page (capped at 3000 CSS px), JPEG quality 40, at CSS-pixel scale (1x), so they show layout, not the device's pixel density.

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

| Route | Profile | ready | ovf | tap <44 | text <12px | RTL | nav covers | errors |
|---|---|---|---|---|---|---|---|---|
| `/` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/learn` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/learn` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/learn` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/learn` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/learn` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/letters/alef` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/letters/alef` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/letters/alef` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/letters/alef` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/letters/alef` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/firstday` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/firstday` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/firstday` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/firstday` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/firstday` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/placement` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/placement` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/placement` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/placement` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/placement` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/sprint` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/sprint` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/sprint` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/sprint` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/sprint` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/service` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/service` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/service` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/service` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/service` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/read/bless-priestly-1` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/read/bless-priestly-1` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/read/bless-priestly-1` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/read/bless-priestly-1` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/read/bless-priestly-1` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |
| `/calendar` | iPhone SE | yes / yes | 0 / 0 | 35 / 35 | 15 / 15 | - / - | - / - | - / - |
| `/calendar` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 15 / 15 | - / - | - / - | - / - |
| `/calendar` | Pixel 7 | yes / yes | 0 / 0 | - / - | 15 / 15 | - / - | - / - | - / - |
| `/calendar` | Galaxy S9+ | yes / yes | 0 / 0 | 35 / 35 | 15 / 15 | - / - | - / - | - / - |
| `/calendar` | iPad Mini | yes / yes | 0 / 0 | - / - | 9 / 9 | - / - | - / - | - / - |
| `/settings` | iPhone SE | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/settings` | iPhone 14 Pro | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/settings` | Pixel 7 | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/settings` | Galaxy S9+ | yes / yes | 0 / 0 | - / - | 6 / 6 | - / - | - / - | - / - |
| `/settings` | iPad Mini | yes / yes | 0 / 0 | - / - | - / - | - / - | - / - | - / - |

## Findings by element

Grouped across profiles by selector pattern (`:nth-of-type` and state classes stripped; "xN per page" counts the matching elements; "all (shell)" = header, nav or sound bar, present on every route). The "rule / file" column lists the matching stylesheet rules that set the measured property (own rule first, then the ancestors it inherits or scales from) and the file each lives in (a `<style>` string inside a view module, or assets/css).

### Overflow (0)

None.

### Tap targets under 44 px (1)

| Route | Element | name | size | where | rule / file |
|---|---|---|---|---|---|
| `/calendar` | `tbody > tr > td > button.alef-cal-day` (x35 per page) | Sunday 1 November 2026,  | 35x67 | iPhone SE, Galaxy S9+ | `.alef-calendar * {min-inline-size:0px} @ <style#alef-cal-style>`<br>`.alef-cal-day {min-block-size:4.2rem;inline-size:100%;padding:0.2rem 0.25rem;font-size:0.8rem} @ <style#alef-cal-style>`<br>src/curriculum/calendar.style.js |

### Text under 12 px (4)

| Route | Element | px | sample | where | rule / file |
|---|---|---|---|---|---|
| `/calendar` | `tr > td > button.alef-cal-day > span.l` (x7 per page) | 10.9 | Chayei Sara | every profile | `.alef-cal-day .l {font-size:0.68rem} @ <style#alef-cal-style>`<br>`from button.alef-cal-day.shabbat: .alef-cal-day {font-size:0.8rem} @ <style#alef-cal-style>`<br>src/curriculum/calendar.style.js |
| `/calendar` | `div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small` (x2 per page) | 10.7 | Draft, not reviewed by clergy. | every profile | `small {font-size:smaller} @ browser default`<br>`from p.alef-cal-draft: .alef-cal-draft {font-size:0.8rem} @ <style#alef-cal-style>`<br>src/curriculum/calendar.style.js |
| `all (shell)` | `ul#nav > li > a > span.he.nav-he` (x5 per page) | 10.2 | בית | iPhone SE, iPhone 14 Pro, Pixel 7, Galaxy S9+ | `.he, [lang="he"] {font-size:1.15em} @ assets/css/app.css`<br>`.nav-he {font-size:0.85em} @ assets/css/app.css`<br>`from a: .site-nav a {font-size:0.9rem} @ assets/css/app.css`<br>`from a: .site-nav a, .more-btn {font-size:0.75rem} @ assets/css/app.css`<br>assets/css/app.css |
| `all (shell)` | `button#more-btn > span.he.nav-he` | 10.2 | עוד | iPhone SE, iPhone 14 Pro, Pixel 7, Galaxy S9+ | `.he, [lang="he"] {font-size:1.15em} @ assets/css/app.css`<br>`.nav-he {font-size:0.85em} @ assets/css/app.css`<br>`from button#more-btn: .site-nav a, .more-btn {font-size:0.75rem} @ assets/css/app.css`<br>`from button#more-btn: .more-btn {font-size:0.75rem} @ assets/css/app.css`<br>assets/css/app.css |

### RTL: mixed-script wrapping and niqqud clipping (0)

None flagged. (The check is a heuristic on line boxes and overflow; it cannot see glyph rendering.)

### Fixed bar covering the end of the content (0)

None: with the page scrolled to the bottom, no fixed bar overlaps the end of `main`.

### Errors and failed requests (0 visits)

None.
