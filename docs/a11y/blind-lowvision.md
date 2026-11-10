# Blind and low-vision learners: audit and fixes

Tool: `node tools/a11y/blind.mjs` (writes `tools/a11y/blind-run.json`; `--routes /a,/b`, `--quick` for a shorter Tab walk, `--scenarios-only` for the 17 behaviour checks only, `--strict`). Tests: `tests/a11y.blind.test.js` (unit tests for the new text, plus the scenarios in Chromium when Playwright is installed).

**No screen reader (VoiceOver, TalkBack, NVDA), braille display, magnifier software or blind person was involved. Nobody here can test with one.** Everything below was measured in headless Chromium with its accessibility tree (`ariaSnapshot`), the DOM and CSS. A clean result means these checks found nothing. It does not mean the app works well with a screen reader, and it is not a claim of conformance to any standard.

## What was checked
| Check | How | Scope |
|---|---|---|
| Landmarks, skip link, one `h1`, heading order | DOM | 23 routes at 375x667 and 1280x800: every v0 route (`/`, `/learn`, `/letters`, `/letters/atlas`, `/letters/alef`, `/progress`, `/firstday`, `/install`, `/credits`, `/privacy`, `/offline`, `/settings`, `/welcome`, `/search`, `/about`) plus `/learn?lesson=r01`, `/learn?review=1`, `/firstday/ladder`, `/torahread`, `/torahreader`, `/sounds`, `/vocab`, `/read` |
| Names for controls | accessibility tree: any button, link, tab, field or image with no name | same |
| Pictures | `img` without `alt`, `svg` / `role=img` / `canvas` without a name | same |
| Live regions | main holds a `role=status`, `alert`, `log` or `aria-live` region when it has fields or two or more buttons | same |
| Focus after navigation | after an in-app route change, focus is on the view heading (waits up to 2.5 s) | same |
| Focus trap | Tab 90 times (30 with `--quick`); fails if the last 30 stops cycle among three or fewer elements | same |
| Hebrew | every Hebrew text node in main has `lang="he"`, `dir=rtl` when it is Hebrew only, and a text equivalent (an `aria-label`, or Latin text in the same item) | same |
| Reflow | viewport 640x400 (a 1280x800 window at 200%) and 320x200 (400%): page scrolls sideways, text clipped by `overflow`, content past the viewport | `/`, `/letters`, `/letters/alef`, `/learn`, `/learn?lesson=r01`, `/learn?review=1` |
| Scenarios (17) | drive the screens and read the result: the stroke stepper by keyboard, picture description, labelled glyphs, quiz verdict, review front | see below |

## Result of the final run
23 routes, 2 viewports, 6 pages at 2 zoom levels, 17 scenarios. Two findings remain (one issue, seen at both sizes), below. Everything else the checks look for was clean, including the landmarks, skip link, single `h1`, no skipped heading levels, no unnamed control, no `img` without `alt`, no unnamed `svg` or `canvas`, no focus trap, focus on the heading after navigation on every route, and `lang` / `dir` on every Hebrew node.

Remaining:
- `/` (Home), both sizes: "main has buttons but no live region". The buttons are the daily-goal choices. Each carries `aria-pressed` and focus is put back on the pressed one, so the state is on the control; nothing is announced when a goal is picked. Left as is (not a view in this lane).

## Fixed
1. **Tracing had no non-visual route (brief item 3).** New `src/letters/strokewords.js` (pure) describes each stroke from the stroke data in `data/letters/letters.json`: where it starts and ends (nine places on the letter's own box, or top / middle / bottom for a narrow letter such as Vav), each leg of the path with direction in words and whether it is straight or curved, a sharp turn or a bend, whether to lift the finger or keep going from where the last stroke ended, and a length word. `src/letters/trace.view.js` adds a collapsed "Strokes in words (no drawing needed)" section on the Trace tab with an honest note, a **Previous stroke in words / Next stroke in words** stepper (plain buttons, so Enter and Space work, focus stays where it is, the sentence is read from a polite live region), and an ordered list of all strokes. The drawing area now carries `aria-describedby` that points to a short sentence telling a screen reader where the text version is. The existing "Next stroke" button (which draws the stroke for you) is unchanged.
   - The note on the panel says tracing is a visual skill and the panel does not replace it, that a program worked the sentences out from stroke data a teacher has not checked, and that some curves are described more simply than they are drawn.
   - Not verified: whether the sentences are right for what a teacher would teach. The checks only show every stroke of every print and cursive letter gets a sentence (tests), that the plain-line cases come out right, and that the output is consistent with the data. I read about twenty of the sentences against my own idea of the letters and they looked plausible, but I did not check each against a teacher.
2. **Memory card pictures (item 4).** The picture and the big letter inside the card stay hidden from a screen reader (they are decorative to it). Pressing the picture now fills a polite, screen-reader-only description (`.mc-sr`, referenced by `aria-describedby` on the picture button) made from the chain entry's `picture.idea` (why the shape fits) and the picture file's own `<desc>`, in `src/letters/memorycard.js` (`pictureDescription`, `svgDescription`). The sound hook and the example word are already text in the list under the card. Before the press the description is empty, because the card reveals the chain step by step and an existing test requires the hook to stay hidden until pressed. At least 25 of the 27 picture files carry a description (tested).
3. **Hebrew items in exercises had no readable name (items 2 and 5).** New `src/letters/shapetext.js`. A lone letter used as a question or an option now has `role="img"` with a label that describes its SHAPE from `data/letters/mnemonics.json`, with the letter's own name masked, so the label does not give the answer away (tested for every letter). A pointed word used as a question gets "Hebrew word. Sounds like: ..." from the same respelling the app already shows on answer sides. Where: lesson quick check (`exercises.session.js`, `exercises.ui.js`; right and wrong are also said in words because the label replaces the mark the style adds), first-day quick check (`firstday.view.js`), review front for letter and word cards (`review.view.js`), look-alike drill options (`trace.view.js`; they were labelled with the letter name, which handed over the answer the question names), and the first-day ladder word (`ladder.view.js`). Helper: `heLabeled` in `src/curriculum/dom.js`.
   - Trade-off: a person with a Hebrew voice who wants to read the word themselves still hears the respelling instead. There is no setting for it yet.
4. **Lesson words** now show "Sounds like: ... (respelling)" as text under the English meaning (`lesson.view.js`).
5. **Verdicts and focus (item 6).** After an answer in the lesson quick check the answer buttons are disabled, so focus moves to Continue. A screen reader may speak the new focus instead of the polite status. Continue now has `aria-describedby` pointing at the verdict and the explanation (same for the first-day check, the review memory choice and the memory practice round), so it is read either way. The look-alike drill, the stroke stepper and the tracing feedback announce through live regions and move no focus. I did not change `disabled` to `aria-disabled` because existing tests rely on it.
6. **Zoom (item 7).** At 400% (320x200) the sticky Check / Continue bar of lessons covered a third of the window. It now scrolls with the page below 320 px of height (`assets/css/learn.css`). Measured clean: no sideways scroll, no clipped text, nothing past the viewport at 640x400 and 320x200 on Home, Letters, a letter, Learn, a lesson and review.

## Checked and left as is
- Skip link ("Skip to main content") is present and its target exists on every route. Navigation, banner and main landmarks exist on every route.
- The letter picker, atlas tiles and memory card buttons already had names ("Alef", "א Alef /ʔ/").
- Memory-chain questions already mask the letter's name in the picture text (`maskLeak` in `src/letters/memory.js`).
- `/sounds`: Hebrew in table cells has the transliteration and meaning in the other cells of the row.

## Gaps (not done or not verifiable here)
- **Any real assistive technology.** How the new text sounds, how long it feels, whether the order is natural, whether a Hebrew-capable voice reads `lang="he"` text well, and whether a live region and a focus move collide in each screen reader are all unknown. Verdict handling in item 5 is a guess at a common behaviour, not a tested one.
- **Word tracing** (`/words/trace`, `src/wordtrace/`) is also drag-on-canvas and has no strokes-in-words panel yet.
- **Vowel-mark cards** in review (a pointed vowel shown alone) have no shape label; the shapes of vowel marks are not in a data file this lane could use.
- **Torah reading** word buttons are named with the Hebrew word and "Points shown. Press to show how it is said."; there is no respelling in the name, so a screen reader without a Hebrew voice gets nothing useful until the button is pressed. `/torahreader` and the pointed lines in `/vocab` and `/read` were scanned only for lang / dir / name.
- **Scene and word pictures** (`ctx.img`) take their `alt` from the image prompt records; no image on the audited routes lacked `alt`, but I did not read the alt text of the pictures to judge it, and unapproved images are not shipped in this build.
- **The `h1` on a letter page is "Letter"** (the route title), not "Letter: Alef"; the page title announcement does name the letter.
- **Magnification software and pinch zoom** were not tried. 200% and 400% were approximated by narrowing the viewport (640x400, 320x200), which is how the reflow rule is usually measured but is not the same as browser zoom (text size preferences, fonts and `rem` media queries can differ).
- **Contrast, colour and motion** are another lane's; not repeated here.
- `/settings`, `/welcome`, `/search` and `/progress` got the structure checks above only, with no deeper states driven. `/firstday` and `/learn?review=1` were driven only as far as the first card or answer.
