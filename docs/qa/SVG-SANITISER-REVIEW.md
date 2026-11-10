# SVG sanitiser review: `sanitizeSvg` in src/letters/memorycard.js

Scope: `sanitizeSvg` (line 83) and its sink `svgBox.innerHTML = clean` (line 293, in `apply`). Input is the repo's own `assets/letters/morph/*.svg` (28 files), fetched by `loadMorphSvg`. The threat is therefore a tampered or compromised asset, not user input, so this is defence in depth. The `o.svg` option feeds `apply` without sanitising by design ("already sanitised", tests); no caller outside memorycard.js passes it (grep of src).

## What was run

- `/tmp/svgsan-fuzz/fuzz.mjs`: imports the real `sanitizeSvg` under node 22 and feeds it 106 vectors (no DOM needed for the verdict). Results in `/tmp/svgsan-fuzz/results.json`.
- `/tmp/svgsan-fuzz/browser.mjs` and `browser2.mjs`: for every vector the sanitiser accepted, the sanitised output was assigned to `innerHTML` in headless Chrome (playwright, `/usr/bin/google-chrome`) on a stub origin `http://app.test/`. All requests were intercepted and aborted, and dialogs, injected script/iframe/img/a elements and `on*` attributes were counted.
- The same three scripts were rerun against the proposed patch in a scratch copy of src/ at `/tmp/svgsan-fuzz/tree`.
- Not run: Firefox/Safari, any test of the live app, mXSS via re-serialisation (the sink is a single `innerHTML` parse).

## Result summary (current code)

- No script execution found. No vector produced a dialog, a script/iframe element or an `on*` attribute in Chrome.
- Bypasses of the stated "no external references" guarantee (confirmed in Chrome as outbound requests): 8 variants (list below). They can load a remote image (a tracking beacon) or a same-origin file. They are not XSS.
- Root-level `style="position:fixed;..."` is accepted and does overlay the page (UI redress). Confirmed computed `position: fixed`.
- Over-rejection (false positive, safe): `data:` anywhere in text, any `&#`.

## Vectors and results (current code)

BLOCKED = `sanitizeSvg` returned null. PASSED = markup accepted. "Effect" is what Chrome did with the accepted output.

| Vector | Result | Effect in Chrome |
|---|---|---|
| `<script>`, mixed case, `< script>`, `<svg:script>`, `<script xlink:href=data:>` | BLOCKED | n/a |
| `<scr<!-- -->ipt>`, `<scr<?xml x?>ipt>` (split by stripped comment/PI) | BLOCKED | checks run after stripping |
| `<![CDATA[`, DOCTYPE/ENTITY, `&#60;script&#62;` | BLOCKED | n/a |
| `onload` on root, `/onload`, tab, form feed, `onload\n=`, `onerror`, `onclick` after quote, `onbegin`, uppercase, unquoted `onfocus`, nbsp-separated, `&#111;nclick` | BLOCKED | n/a |
| `<g\0onclick=...>` (NUL) | PASSED | none; parser makes an inert attribute name |
| `<a href=javascript:>`, `xlink:href`, `<use href=javascript:>` quoted, `java&Tab;script:` quoted, `&colon;`, `&#106;`, `&#x6A;`, leading whitespace | BLOCKED | n/a |
| `<a><set/animate attributeName=href to=javascript:>` | BLOCKED | unknown element |
| `<use href=java&Tab;script:...>` unquoted | PASSED | none (use does not run javascript:) |
| foreignObject (also `<  foreignObject>`), iframe, object/embed, `<img onerror>`, `<math>`, `<meta refresh>`, `<title><img onerror>` | BLOCKED | n/a |
| `<use href=https://evil/...>`, `xlink:href`, relative `other.svg#a`, `//evil/...`, `data:` href, `<image>`, `<feImage>` (all quoted) | BLOCKED | n/a |
| `<use href=https://evil/x.svg#a />` unquoted | PASSED | no request (cross-origin use refused by Chrome) |
| `<use href=/same.svg#a />` and `<use xlink:href=/same2.svg#a />` unquoted | PASSED | BYPASS: Chrome requested `http://app.test/same.svg` and `same2.svg` |
| `<use href=`//evil/x`>` backtick | PASSED | no request |
| `<style>` with `url(https://...)`, quoted, `cursor:url`, `@font-face src:url`, `@import`, `behavior:url`, `-moz-binding`, `url(/**/...)`, style attr `url(//evil)` | BLOCKED | n/a |
| `<style>svg{background-image:\75rl(https://evil/esc.png)}</style>` and `u\72l(...)` (CSS escape of the function name) | PASSED | BYPASS: request to `https://evil.example/esc.png`, `esc2.png` |
| `style="background-image:\75rl(...)"` attribute | PASSED | BYPASS: request to `attr.png` |
| `svg{background-image:image-set("https://evil/is.png" 1x)}`, same in a style attribute | PASSED | BYPASS: request to `is.png`, `x.png` |
| `-webkit-cross-fade("https://...")` | PASSED | no request seen |
| `fill="url(#a&rpar;,url(https://evil/x)"` and the same in `<style>` and `style=""` (named entity for `)` ends the regex match late) | PASSED | BYPASS: request to `rpar.png`, `rpar2.png` |
| `style="background-image:url&lpar;https://evil/x)"` (named entity for `(`) | PASSED | BYPASS: request to `lpar.png` |
| `url(&quot;https://...&quot;)`, `url(&Tab;https://...)` | BLOCKED | n/a |
| `@\69mport "https://..."`, `@font-face{src:\75rl(...)}` | PASSED | no request (scoper drops the @-rules; the font-face case was not observed loading) |
| `width:expression(alert(1))` | PASSED | none (IE only) |
| `position:fixed` on a root `style=""` | PASSED | root became `position: fixed` (page overlay possible) |
| `position:fixed` in a class rule on an inner `rect` | PASSED | no effect on SVG children |
| `body{}`, `:root{}`, `@media{body{}}` rules | PASSED | scoped to `.mc-svg` or dropped by `scopeSvgCss`; page body unaffected |
| `a[x=","],body{}` (comma inside a string) | PASSED | still every selector is prefixed; no leak seen |
| `</p>` / `</br>` foreign-content breakouts | `</p><style>...<img>` BLOCKED; `</p><title><g id="</title>` PASSED | no script or element injected |
| text after `</svg>`, text before `<svg`, unterminated comment, nested comment trick | BLOCKED | n/a |
| `<!--><script>..-->` abrupt comment | PASSED | whole comment stripped by the regex; nothing executes |
| BOM prefix, nested `<svg>`, `&lt;script&gt;` text, ids named `body`, `cookie`, `documentElement` | PASSED | inert; ids get the `mc-` prefix |
| 200KB+ input | BLOCKED | size cap |
| Real assets (28 files) | all 28 accepted | |

## Why the reject-list leaks

1. `href` is only checked when quoted; an unquoted value is never inspected.
2. `url(` is searched literally; CSS escapes in the function name, and `image-set()`/`image()`/`cross-fade()` strings, do not contain `url(`.
3. The `url(...)` regex stops at the first literal `)` and HTML named entities (`&rpar;`, `&lpar;`) are decoded by the parser after the regex ran. Only `&#` is rejected, not `&name;`.
4. Visual properties (`position:fixed`) are not considered.

## Patch

`docs/release/patches/security/01-svg-sanitiser-allowlist.patch` (applies with `patch -p1` from the repo root; `--dry-run` was clean). It replaces the reject-list with a tokenising allow-list: well-formed double-quoted tags only, known elements (existing `OK_TAGS`) and a new `OK_ATTRS` set, `href` must be `#id`, `url()` must be `#id` and only on fill/stroke/clip-path/mask/filter, no entities other than the five XML ones, CSS rejects backslashes, `&`, `<`, unknown @-rules, `image-set`/`image()`/`src()`/`position:` and any `url(` that is not `#id`, tag nesting must match, only one root. The id-prefixing, CSS scoping and `aria-hidden` steps are unchanged.

Run against the patch (scratch copy):

- Fuzz: 106 vectors, 96 blocked (was 72). Every bypass in the table above is now BLOCKED, including the unquoted `use`, CSS-escape `url`, `image-set`, `&rpar;`/`&lpar;` and root `position:fixed` cases. The one vector that changed the other way is `<text>data:text/html,x</text>`, now accepted (plain text, harmless). The remaining accepted vectors are the inert ones in the table.
- Browser: the 11 targeted bypass cases are BLOCKED; no accepted vector in the full run produced a request, dialog, injected element or `on*` attribute.
- Real assets: 28 of 28 still accepted.
- Repo tests in the scratch copy (`node --test`): letters.memorycard 17/17, letters.morph 46/46, letters.morph3 12/12, letters.memorychain 10/10 pass. `a11y.blind.test.js` is 7 pass, 1 fail; the failing case is the Chromium launch scenario and fails identically with the unpatched file in the same scratch copy, so it is environmental. The rest of the suite was not run, and the patch was not applied to the live tree.

## Caveats

- Chrome only. The `use` same-origin and CSS image requests are what Chrome did; other engines may differ.
- The patch's attribute allow-list was built from the attributes the 28 current files use plus common SVG presentation attributes. A future asset using an attribute outside it will fall back to the plain letter (fail closed) and the allow-list needs extending.
- No regression test for the new vectors was added to tests/.
