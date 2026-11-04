# Defects (QA walk, 2026-11-04)

Severity: H = blocks or badly degrades a main task, M = visible or accessibility problem, L = polish.

## Fixed
| # | Sev | Where (lane) | Problem | Fix |
|---|---|---|---|---|
| F1 | M | Vocab (lane 9) | After a search the page showed the literal text "null" twice (`replaceChildren(null)`) | filter nulls; commit "lane9 vocab" |
| F2 | M | Sounds (lane 3) | Two tables 412px wide at 390px, cut off, not keyboard-scrollable | wrapped in `.table-wrap` with tabindex/region; commit "lane3 sounds" |
| F3 | M | Read (lane 5, CSS only) | Text picker select as wide as its longest option, cut off at the right edge | `select{max-inline-size:100%}` in app.css |
| F4 | M | Dot tiles, Niqqud dial, Syllable chips, Sounds, Vowel board, Sound gap (lane 3) | Radio sat at the end of the previous line, apart from its label; label text ran past the fieldset border | label rule in app.css (inline-flex, normal wrapping) |
| F5 | H | Letters, Atlas (lane 2) | Dark mode: letter grid and tab buttons were white with light, invisible glyphs; body text dark on dark | theme-variable overrides in app.css |
| F6 | M | Letters, Atlas (lane 2), shell | `aria-pressed`/`aria-selected` set to `true` rendered as `""` (invalid, state not announced); also the view's own `[aria-pressed=true]` lookup never matched, so the completed-letter badge did not appear until a re-render | boolean `aria-*` as "true"/"false" in the three `h()` helpers (trace, atlas, shell) |
| F7 | L | Shell, pronunciation views | Tap targets under 44px: sound-bar link (21px), disclosure summaries (32-40px), selects, pronunciation buttons (40px), radio/checkbox labels | app.css |
| F8 | L | QA tooling | Hidden file input and visually-hidden inputs counted as small | audit skips them |

## Open
| # | Sev | Where (owner) | Problem | Suggested fix |
|---|---|---|---|---|
| O1 | H | `#/letters`, `#/letters/:id` (lane 2, `src/letters/trace.view.js`) | On a 390x844 phone the tracing canvas starts about 1660px down the page (tabs, notice, 27-letter grid, toggles, letter card and the "Remember it" panel come first). A learner must scroll about two screens to reach the main interaction, and scrolling back to the grid to pick another letter. | Put the canvas above the memory-hook panel, collapse the letter grid into a picker, or make the grid horizontal-scroll |
| O2 | M | `#/ladder` (lane 1, `src/curriculum/ladder.view.js`) | The `<progress>` bar overlaps its status line ("Level 1 of 20 ..."), the text is cut in half in the screenshot | give the progress element its own block or `vertical-align`/margin |
| O3 | L | `#/vocab` (lane 9) | Glosses containing Hebrew letters (for example "to, for (prefix ...)") have no `lang=he` span | wrap the Hebrew run |
| O4 | L | `#/letters/zzz`, `/letters/final-mem`, `/read/nonexistent` (lanes 2, 5) | Unknown ids silently show Alef or the default text instead of a not-found message; `?tab=drill` and `?tab=type` are ignored by the Letters view | show a message; read `ctx.query.tab` |
| O5 | L | `#/fade/:id`, `#/scan`, `#/vocab` | Remaining small targets: fade range slider (16px), native file inputs on Scan, the "Show word forms" checkbox label (26px) | taller slider hit area, wrap in labels |
| O6 | L | Copy (lanes 1, 9) | "1 reviews due", "Add 1 of these 1 words to reviews" | plural helper |
