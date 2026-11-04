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
| F14 | H | Letters (lane 2), CSS by shell lane | Tracing canvas about 1660px down on a phone (was O1) | app.css phone rules: letter grid one-row strip, stage moved up (stage at about y=390 at 390x844); depends on lane 2's child order |

## Open
None known from this walk. Not re-checked after these fixes: dark mode of the new not-found messages, the `/letters/final-mem` route (now "not found"; decide whether final forms should have their own pages).
