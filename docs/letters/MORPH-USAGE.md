# Letter pictures (assets/letters/morph/*.svg): one contract

Every letter picture follows the same contract: same class names, same CSS variables, same two states. The contract is checked by
`node tools/letters/build_morph_sheet.mjs --check` (and by `tests/letters.morph.contract.test.js`). The contact sheet with every file as
A | B at 160 px is `tools/letters/morph-sheet.html` (rebuild: `node tools/letters/build_morph_sheet.mjs`; add `#dark` to preview dark).

## File shape

```
<svg xmlns="http://www.w3.org/2000/svg" class="morph morph-<id>" viewBox="0 0 200 200" role="img" aria-labelledby="<id>-t <id>-d">
  <title id="<id>-t">…</title>  <desc id="<id>-d">…</desc>
  <style> CORE (verbatim, same text in every file) + local art rules </style>
  <defs> … ids start with "<id>-" … </defs>
  <g class="morph-a"> the letter </g>
  <g class="morph-b"> the picture </g>
</svg>
```

* `<id>` is the file name without `.svg` (`kaf-final`). No width/height: the host sizes it. Under 6 KB. No script, SMIL, remote references,
  Hebrew text, or hard-coded colours in the markup.
* Every `id` starts with `<id>-` and every `href="#…"` / `url(#…)` resolves inside the file, so any number of files can be inlined in one page.
* The letter's own outline or strokes come from `data/letters/letters.json` unchanged (print outline for filled glyphs, trace strokes for stroked ones).

## Class names

| Class | On | Meaning |
|---|---|---|
| `morph` | root | marks a picture; the core CSS is scoped to `svg.morph` |
| `morph-<id>` | root | scope for the file's local art rules |
| `morph-a`, `morph-b` | one `<g>` each | A = the plain letter, B = the picture |
| `morph-show-a` | root, set by the host | show A (letter) instead of B (picture) |
| `morph-play` | root, set by the host | run the 8 s A to B to A loop (only if the user has no reduced-motion preference) |
| `morph-strokes` | the A group | letter drawn as round ink strokes (85 units wide in the 1000-unit glyph space) |
| `morph-trace` | the A group with `morph-strokes` | in the picture state the letter stays as a thin faint outline over the picture |
| `morph-pop`, `morph-pop-late` | parts of B | parts that pop in during the loop (`-late` is delayed 0.2 s) |
| `mfi`, `mf1`..`mf4` | any shape | fill: ink, accent 1..4 |
| `msi`, `ms1`..`ms4` | any shape | stroke colour: ink, accent 1..4 (set stroke width locally; add `fill="none"` on pure outlines) |
| `mk`, `ml`, `mb` | strokes | `mk` letter-weight round stroke (85), `ml` round stroke of width `--w` (default 24), `mb` butt caps |
| `mtile`, `mshade` | shapes | faint ink fill at 9 % (tile behind a picture) / 30 % (shadow) |

Anything else a file needs is a *local* class. Local CSS goes after the core, every selector starts with `svg.morph-<id>`, every
`@keyframes` is named `morph-<id>-*`, and it declares no custom property except `--w` (inline, for `ml` strokes). Never use `:root`, `html`,
`body` or `!important` locally. This is what keeps two inlined files from restyling each other.

## CSS variables

The host may set these five public variables on any ancestor (or on the svg). Each has a built-in fallback in the core, so a
file with no host styling still looks right, including as an `<img>`:

| Variable | Role | Light fallback | Dark fallback |
|---|---|---|---|
| `--morph-ink` | the letter and outlines | `currentColor` | `#f3ecdc` |
| `--morph-1` | warm accent | `#d9480f` | `#ff8a4c` |
| `--morph-2` | deep accent | `#1b3a6b` | `#8db8ff` |
| `--morph-3` | light accent / glow | `#ffd966` | `#ffe08a` |
| `--morph-4` | green accent | `#2f9e44` | `#69db7c` |

The core copies them into private `--m-ink`, `--m-1`..`--m-4`, which is all the art rules may read. Under `forced-colors: active` the private
variables become system colours (`CanvasText`, `Highlight`, `GrayText`, `LinkText`) whatever the host set.

## Host page: following the app theme

The app's theme variables are `--fg`, `--accent`, `--muted` and the `data-theme` attribute (`assets/css/app.css`). Inline the file and set
`--morph-ink` from the text colour; that alone keeps the letter readable in every theme:

```css
.alef-mem-pic { --morph-ink: var(--fg); }
```

The accent fallbacks follow the *operating system* scheme, not the app's `data-theme`. If the user forces a theme that differs from the
system, set the accents too:

```css
:root[data-theme="light"] .alef-mem-pic { --morph-1:#d9480f; --morph-2:#1b3a6b; --morph-3:#ffd966; --morph-4:#2f9e44; }
:root[data-theme="dark"]  .alef-mem-pic { --morph-1:#ff8a4c; --morph-2:#8db8ff; --morph-3:#ffe08a; --morph-4:#69db7c; }
```

(The memory card currently relies on the fallbacks; this snippet is the documented way to follow `data-theme`.)

## States and modes

* **Default = picture (B).** No class on the root shows B only; the plain letter is hidden (or, with `morph-trace`, a thin trace of it).
* **Letter (A):** add `morph-show-a` to the root. Hosts that animate A/B themselves (the memory card) override `.morph-a` / `.morph-b`
  opacity from their own, more specific rules; the file never animates unless `morph-play` is set.
* **Motion:** off unless the host adds `morph-play` *and* `prefers-reduced-motion` is not `reduce`. Under `reduce` the core cancels every
  animation and transition on the file (`animation:none!important`), so the picture state is shown and nothing moves. Add `morph-play`
  only on a user action or a screen where looping is wanted; the app's own rule is no autoplay.
* **`<img src>` / CSS background:** works as a static picture state (B) with the fallback palette; it follows `prefers-color-scheme`
  but cannot read host variables or `data-theme`. Use inline SVG when the theme must apply. The memory card fetches the file, sanitises it
  and inlines it, then removes `<title>`/`<desc>` and supplies its own `aria-label`.
* **Inline, many at once:** safe. The core is identical text in every file, local rules are scoped by `svg.morph-<id>`, ids are namespaced.

## Adding or changing a picture

1. Start from any existing file; keep the `<style>` core exactly as generated (`CORE_CSS` in `tools/letters/build_morph_sheet.mjs`).
2. Keep the glyph path verbatim from `data/letters/letters.json`; make the picture one clear object, not a letter with accessories.
3. Run `node tools/letters/build_morph_sheet.mjs --check`, rebuild the sheet, and look at it at 160 px and with `#dark`.
4. Changing the core means changing `CORE_CSS` and re-pasting it into all files (the test fails until every file matches).
