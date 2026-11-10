# assets/img

Real images go here as `assets/img/<stem>.png` (or `.svg`/`.webp`/`.jpg`), where `<stem>` is the file name from `data/images/manifest.csv` without extension (e.g. `L01_alef_print_mnemonic.png`).

- `placeholders/<stem>.svg` - generated stand-ins, one per manifest row (797). Regenerate: `node tools/images/make_placeholders.mjs`. They may carry English labels; real images must contain NO text.
- `generated/` - raw API variants (`<stem>__v1.png` ...) written by `tools/images/gen_via_api.mjs`. A human picks the winner and copies it up one level under the manifest name. (Do not ship `generated/`.)
- `index.json` - list of real files present; the resolver `book/img.js` uses it. Re-run `make_placeholders.mjs` after adding images.

Resolver: `import { createImgResolver } from '../book/img.js'` then `createImgResolver({ base: 'assets/img', files: index.files }).src('L01_alef_print_mnemonic')` returns the real file if indexed, else the placeholder.

Status: as of this build ZERO real AI images exist. Every `src()` returns a placeholder.
