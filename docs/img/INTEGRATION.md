# Wiring generated pictures into the views

Status: the resolver, helper and index exist (`src/img/resolve.js`, `data/img/index.json`). No view calls them yet, and today every image is unapproved, so every call returns `null` and nothing is drawn. The views below are owned by other lanes; each patch is one line (plus the shared setup). Nothing here edits those files.

## Rules
- `R.resolve(kind, id, opts)` returns `{id, src, alt, approved, aspect, width, height}` or `null`. `null` means "draw nothing": no placeholder box, no empty frame, no reserved gap.
- Only approved images come back (`data/images/approvals.json`). With `settings.showUnapprovedImages === true` unapproved ones also come back, marked `approved:false` (the `img()` helper adds `data-unapproved`). That switch is for reviewers; never turn it on by default.
- A picture also needs its file in `assets/img/gen/` (the index records which are there). Not generated yet = `null`.
- `img(h, spec)` returns a lazy `<img>` (`loading=lazy decoding=async`, `width`/`height` from the aspect ratio, `alt` from the manifest) or `null`. Pass the `h` of the view (`h` from `src/shell/ui.js` or `el` from `src/curriculum/dom.js`, both take `(tag, attrs, ...kids)`; `null` children are skipped by both).
- Pictures never carry the answer. In quizzes and placement, show them only after the learner has answered, or not at all.
- `alt` describes the picture; the Hebrew word itself stays in the visible text. Pass `decorative:true` where the caption already says the same thing.

## One-time setup (owner of `src/app.js` and `src/shell/settings.js`)
1. `src/shell/settings.js`: add `showUnapprovedImages: false` to `DEFAULTS` and a boolean branch in `validate` (the existing line for `israelTrack` / `onboarded` takes the new key as is: `if (key === 'israelTrack' || key === 'onboarded' || key === 'browserVoiceAnyway' || key === 'showUnapprovedImages')`). Until then the resolver reads `settings.get('showUnapprovedImages') === true`, which is simply false.
2. `src/app.js` (near `const ctxBase = {...}`, after `settings` exists):
   ```js
   import { loadImageResolver, img as imgEl } from './img/resolve.js';
   const images = await loadImageResolver((u) => fetch(u).then((r) => r.json()), { settings });
   // add to ctxBase:  images, img: (h, spec) => imgEl(h, { R: images, ...spec })
   ```
3. Service worker / precache (owner of the precache list): add `data/img/index.json` and `data/images/approvals.json` to the core list. Do not precache `assets/img/gen/*`; fetch on demand. Rebuild the index after any ingest: `node tools/img/build_index.mjs` (`--check` in CI).

## Per view

| View (file) | Call | One-line patch |
|---|---|---|
| Vocab cards (`src/vocab/vocab.view.js`, `cardItem`) | `word`, `e.id` | in the `el('li', { class: 'card vc-card' ... }` children, first: `ctx.img?.(el, { kind: 'word', id: e.id, class: 'vc-pic', width: 400 }),` |
| Theme packs (`src/vocab/themes.view.js`, `wordItem` near line 122) | `word`, `w.id` | add as first child of `el('li', { class: 'th-word' ...`: `ctx.img?.(el, { kind: 'word', id: w.id, class: 'th-pic', width: 400 }),` . The pack header (`th-card` button, line ~106) may use `{ kind: 'theme', id: t.id, slot: 1 }` where `t.id` equals the theme key (greetings, cafe, body, ...); this returns null for packs with no matching `VOC_<theme>_NN` picture. |
| Letter atlas (`src/letters/atlas.view.js`, detail `panel`, line ~180) | `letter`, `sel.id` | add as the first child of the `panel`: `ctx.img?.(h, { kind: 'letter', id: sel.id, script: state.script, variant: state.alt ? 'alt' : undefined, width: 600 }),`. `state.alt` is the existing "Another picture" toggle; the alt set is the J-block alternates, so when none is approved the toggle still swaps the text story. Final forms use ids like `kaf-final` (underscores are accepted too). |
| Vowels (atlas / lesson vowel rows) | `vowel`, vowel id | `ctx.img?.(h, { kind: 'vowel', id, width: 400 })` (ids: kamatz, patach, tzere, ..., `shin-sin-dots`, `cholam-chaser`). |
| Lessons (`src/curriculum/lesson.view.js`, after the `lesson.level` paragraph, line ~34) | `lesson`, `lesson.id` | `ctx.img?.(el, { kind: 'lesson', id: lesson.id, class: 'l-scene', width: 900 }),` in `parts`. Intermediate lessons `I-01`..`I-50` have two scenes (`img1`, `img2`) plus one extra; `slot: 2` picks the second. Core lessons without an `I-` id get `null`. |
| Festivals card (`src/festivals/festivals.view.js`, "Next festival" block, line ~67 and each pack at ~100) | `festival`, festival slug | `ctx.img?.(h, { kind: 'festival', id: pack.id, class: 'fv-pic', width: 900 }),` as the first part of the card. Slugs in the index: `hanukkah havdalah pesach purim rosh-hashanah shabbat-table shavuot sukkot synagogue-interior tu-bishvat yom-kippur`. If the festival model uses another id (e.g. `rosh-hashana`), map it in the view with a small object; the resolver returns `null` for unknown ids. |
| Placement (`src/placement/placement.view.js`, `renderStart`, line ~31) | `id`, `CHAR_ari_neutral` | optional greeter on the start screen only: `ctx.img?.(el, { kind: 'id', id: 'CHAR_ari_neutral', decorative: true, width: 300 }),` before the draft note. Do NOT put pictures in `question()`: a picture can give the answer away. |
| SRS review cards (`src/curriculum/review.view.js`) | `word` | show on the answer side only: `ctx.img?.(el, { kind: 'word', id: card.id, width: 400 })`. |

## Ids
- `letter`: `alef`..`tav`, finals `kaf-final mem-final nun-final pe-final tsadi-final`. Options `script: 'print'|'cursive'`, `variant: 'quirky'|'alt'`, `role` ('mnemonic', 'ari', 'noa', 'silhouette', 's1'..).
- `vowel`: the token in `tools/images/spec.mjs` VOWELS (hyphenated).
- `word`: the vocabulary word id (`h` + 8 hex, `data/vocab`), same value as the `key` column in `data/images/block-j.csv`.
- `theme`: pack key + `slot` (1-based picture number).
- `lesson`: `I-01`..`I-50`. `festival`: slug. `asset`: manifest set name (e.g. `setup_backgrounds`). `id`: an exact image id (e.g. `BG_cafe`).

## Layout
`img()` sets `width`, `height`, `aspect-ratio` and `max-width:100%`, so the box is reserved before the file loads. Wide scenes are 7:4, memory pictures 1:1. Use CSS for sizing only (e.g. `.vc-pic{width:100%;max-width:14rem;border-radius:.5rem}`); do not give the container a minimum height, so a `null` result leaves no gap.

## Regenerating
`node tools/img/build_index.mjs` after ingest (new files in `assets/img/gen/`) or after any manifest edit. `node tools/img/build_index.mjs --check` fails when `data/img/index.json` is stale; `tests/img.index.test.js` does the same inside `npm test`. Approvals are read live and need no rebuild.
