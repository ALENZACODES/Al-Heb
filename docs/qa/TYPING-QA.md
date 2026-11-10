# Typing trainer QA at 375x667

Run with `node tools/qa/typing.mjs` (headless Chromium 153.0.8010.12 via Playwright; synthetic pointer, touch-enabled context and keyboard input; no real phone, no real device Hebrew keyboard, no screen reader). Only what the script printed is listed here.

## Before the change (observed)

- Every drill was reachable from `#/typing`: Single letters, Final forms, Common words, Prayer lines. No page errors.
- On-screen keys: 27 letter keys, 30 to 38.7 px wide and 48 px high (Space 250 px, Delete 88 px, both 48 px high). The task brief quoted 34x55; this run measured 48 px high, not 55. Every letter key was under 44 px wide.
- Keyboard was one container 343 px wide (letters on 3 physical rows of 8, 10, 9 keys). No sideways page scroll (scrollWidth 375).
- The "Israeli key positions" checkbox was 13x13 px.

## Why not 3 rows of 9 at 44 px

The keyboard container is 343 px wide at a 375 px viewport. Nine keys at 44 px plus gaps need about 396 px plus 8 gaps, so 3 rows of 9 cannot fit without scrolling. A scrollable two-row layout was not used either: it would hide keys. The keys now wrap in a grid (below).

## Change

- `src/typing/typing.view.js`: at viewport width 32rem (512 px) or less, the 27 letter keys flow into a wrapping grid, `repeat(auto-fill, minmax(44px, 1fr))`; Space and Delete stay on a full-width row below. Wider screens keep the 3 physical rows. Key minimum is 44 px wide and 44 px high.
- Every key has an `aria-label` that starts with the visible letter (for example "ך kaf (final form)", "Space", "Delete last letter").
- Up/Down arrow keys move to the nearest key on the next visual line (needed because rows now wrap); Left/Right unchanged.
- Tapping a key keeps focus in the input with `preventScroll`, so the page no longer jumps back to the input. Before this, 3 of 27 taps in the automated run were lost in the new layout while the page scrolled; after, all 27 were typed in 3 of 3 runs.
- The Israeli-key-positions checkbox row is now a 53 px high, 343 px wide label with a 24x24 box.
- `tests/typing.test.js`: the aria-label assertion was changed on purpose (old test expected no aria-label and an English name inside the key text); added assertions for all 29 labels, the five final-form labels, and a CSS test for the 44 px minimum, the narrow grid rule and no horizontal scrolling on the keyboard.

## After the change at 375x667 (observed)

- All four drills reachable; first prompts seen: letters, finals, words (pointed), lines (pointed). Page errors: none.
- Letter keys: 44.9 x 48 px each (27 keys); Space 250.1 x 48; Delete 88.1 x 48. Letter keys laid out on 4 lines of 7, 7, 7, 6, plus the Space/Delete row (5 lines).
- The script's check for targets under 44 px in the visible page (drill screens): none. On the drill-choose screen the only flagged element is the 24x24 checkbox itself; its label row is 343x53.
- Sideways scroll: documentElement scrollWidth 375 = innerWidth 375 on the choose screen and in all four drills, also after tapping every key. Keyboard container scrollWidth 343 = clientWidth 343.
- Tapping all 27 keys in order typed all 27 letters, in the Common words drill. The five final forms (ך ם ן ף ץ) are present as separate keys with the labels listed above. Delete removed one character.
- Accessibility tree (Playwright aria snapshot) shows the keyboard as a group containing the three row groups, then the buttons named as above. Keys without an aria-label: 0. Tab stops inside the keyboard: 1; arrow-key movement by visual position: ק Down gives פ (next line, same column), Down again gives ח, Up gives פ.
- RTL: the input is `dir="rtl" lang="he"` (computed direction rtl). Tapping ש then ל gave the value "של". The on-screen keyboard container is `direction: ltr` on purpose (physical key positions).
- Physical keyboard: inserting Hebrew text into the input ("שלום") worked; Enter checked the answer. With "Israeli key positions" on, pressing a, k, u, o on an English layout typed "שלום".
- Rounds completed by tapping the on-screen keys: Single letters 10 of 10 right; Final forms 5 of 5 right. The Prayer lines drill opened with "Item 1 of 3" (no full round played in this run).
- Other widths (key sizes only): 320 px wide: keys 44 x 48, 5 lines, no sideways scroll; 414 px: 50.5 x 48, 4 lines; 600 px: 52.5 x 48, 3 rows. No sideways scroll at any of them.

## Not fixed / not checked

- At 375x667 the keyboard starts about 823 px down the page (document height 1361 px), so on a first view the keys are below the fold and the page needs scrolling to reach them. Not changed.
- Not tested: a real phone, the device's own Hebrew keyboard, a screen reader, other browsers, landscape, dark mode.
- Hebrew key names and prompts come from existing data; no Hebrew text was written for this change.
