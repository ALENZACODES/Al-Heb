# Device-profile walk (P074)

Run: 2026-11-04T06:07:30.895Z · Chromium 153.0.8010.12 · 100 page visits in 154s

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

## Findings by element

Grouped across profiles by selector pattern (`:nth-of-type` and state classes stripped; "xN per page" counts the matching elements; "all (shell)" = header, nav or sound bar, present on every route). The "rule / file" column lists the matching stylesheet rules that set the measured property (own rule first, then the ancestors it inherits or scales from) and the file each lives in (a `<style>` string inside a view module, or assets/css).

### Overflow (0)

None.

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

## Diff vs previous run (2026-11-04T05:42:12.934Z)

Issues before: 762; now: 0; fixed: 762; new: 0.

Fixed:

- iPhone SE|light|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/learn|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/letters/alef|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/firstday|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/placement|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/sprint|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/service|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(4) > button.alef-cal-day.today
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(4) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(4) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(3) > button.alef-cal-day.out
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(4) > button.alef-cal-day.out
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(5) > button.alef-cal-day.out
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(6) > button.alef-cal-day.out
- iPhone SE|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out
- iPhone SE|light|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/calendar|tiny|button#more-btn > span.he.nav-he
- iPhone SE|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- iPhone SE|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|light|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone SE|light|/calendar|word-split|details.alef-cal-settings > div.alef-cal-form > fieldset > label.check
- iPhone SE|light|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|light|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|light|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|light|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|light|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|light|/settings|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/learn|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/letters/alef|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/firstday|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/placement|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/sprint|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/service|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(4) > button.alef-cal-day.today
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(4) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(3) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(4) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(5) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(6) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(1) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(2) > button.alef-cal-day
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(3) > button.alef-cal-day.out
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(4) > button.alef-cal-day.out
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(5) > button.alef-cal-day.out
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(6) > button.alef-cal-day.out
- iPhone SE|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out
- iPhone SE|dark|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/calendar|tiny|button#more-btn > span.he.nav-he
- iPhone SE|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- iPhone SE|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone SE|dark|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone SE|dark|/calendar|word-split|details.alef-cal-settings > div.alef-cal-form > fieldset > label.check
- iPhone SE|dark|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone SE|dark|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone SE|dark|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone SE|dark|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone SE|dark|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone SE|dark|/settings|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/learn|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/letters/alef|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/firstday|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/placement|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/sprint|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/service|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- iPhone 14 Pro|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|light|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone 14 Pro|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone 14 Pro|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone 14 Pro|light|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|light|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|light|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone 14 Pro|light|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|light|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|light|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|light|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|light|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|light|/settings|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/learn|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/letters/alef|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/firstday|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/placement|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/sprint|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/service|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|button#more-btn > span.he.nav-he
- iPhone 14 Pro|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- iPhone 14 Pro|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|dark|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone 14 Pro|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPhone 14 Pro|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPhone 14 Pro|dark|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|dark|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPhone 14 Pro|dark|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPhone 14 Pro|dark|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- iPhone 14 Pro|dark|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- iPhone 14 Pro|dark|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- iPhone 14 Pro|dark|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- iPhone 14 Pro|dark|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- iPhone 14 Pro|dark|/settings|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/learn|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/letters/alef|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/firstday|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/placement|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/sprint|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/service|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/calendar|tiny|button#more-btn > span.he.nav-he
- Pixel 7|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- Pixel 7|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|light|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Pixel 7|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Pixel 7|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Pixel 7|light|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|light|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|light|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Pixel 7|light|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|light|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|light|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|light|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|light|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|light|/settings|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/learn|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/letters/alef|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/firstday|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/placement|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/sprint|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/service|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|button#more-btn > span.he.nav-he
- Pixel 7|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- Pixel 7|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|dark|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Pixel 7|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Pixel 7|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Pixel 7|dark|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|dark|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Pixel 7|dark|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Pixel 7|dark|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Pixel 7|dark|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Pixel 7|dark|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Pixel 7|dark|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Pixel 7|dark|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Pixel 7|dark|/settings|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/learn|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/letters/alef|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/firstday|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/placement|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/sprint|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/service|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(4) > button.alef-cal-day.today
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(4) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(4) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(3) > button.alef-cal-day.out
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(4) > button.alef-cal-day.out
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(5) > button.alef-cal-day.out
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(6) > button.alef-cal-day.out
- Galaxy S9+|light|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out
- Galaxy S9+|light|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/calendar|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- Galaxy S9+|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|light|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Galaxy S9+|light|/calendar|word-split|details.alef-cal-settings > div.alef-cal-form > fieldset > label.check
- Galaxy S9+|light|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|light|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|light|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|light|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|light|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|light|/settings|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/learn|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/learn|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/learn|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/learn|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/learn|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/learn|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/letters/alef|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/letters/alef|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/firstday|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/firstday|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/firstday|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/firstday|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/firstday|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/firstday|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/placement|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/placement|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/placement|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/placement|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/placement|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/placement|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/sprint|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/sprint|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/sprint|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/sprint|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/sprint|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/sprint|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/service|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/service|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/service|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/service|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/service|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/service|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/read/bless-priestly-1|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/read/bless-priestly-1|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(4) > button.alef-cal-day.today
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(4) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(3) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(4) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(5) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(6) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(1) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(2) > button.alef-cal-day
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(3) > button.alef-cal-day.out
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(4) > button.alef-cal-day.out
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(5) > button.alef-cal-day.out
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(6) > button.alef-cal-day.out
- Galaxy S9+|dark|/calendar|tap|tbody > tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out
- Galaxy S9+|dark|/calendar|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/calendar|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/calendar|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/calendar|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/calendar|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/calendar|tiny|button#more-btn > span.he.nav-he
- Galaxy S9+|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- Galaxy S9+|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- Galaxy S9+|dark|/calendar|word-split|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- Galaxy S9+|dark|/calendar|word-split|details.alef-cal-settings > div.alef-cal-form > fieldset > label.check
- Galaxy S9+|dark|/settings|tiny|ul#nav > li:nth-of-type(1) > a > span.he.nav-he
- Galaxy S9+|dark|/settings|tiny|ul#nav > li:nth-of-type(2) > a > span.he.nav-he
- Galaxy S9+|dark|/settings|tiny|ul#nav > li:nth-of-type(3) > a > span.he.nav-he
- Galaxy S9+|dark|/settings|tiny|ul#nav > li:nth-of-type(4) > a > span.he.nav-he
- Galaxy S9+|dark|/settings|tiny|ul#nav > li:nth-of-type(5) > a > span.he.nav-he
- Galaxy S9+|dark|/settings|tiny|button#more-btn > span.he.nav-he
- iPad Mini|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- iPad Mini|light|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|light|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
- iPad Mini|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer.now > p.alef-cal-draft > small
- iPad Mini|dark|/calendar|tiny|div.alef-cal-today > section.alef-prayer > p.alef-cal-draft > small
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(1) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(3) > button.alef-cal-day > span.l
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(4) > button.alef-cal-day > span.l
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(2) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(3) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(4) > td:nth-of-type(7) > button.alef-cal-day.shabbat > span.l
- iPad Mini|dark|/calendar|tiny|tr:nth-of-type(5) > td:nth-of-type(7) > button.alef-cal-day.out > span.l
