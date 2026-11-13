# alef-tools in this app

All code for the open Hebrew language models lives in
[ALENZACODES/alef-tools](https://github.com/ALENZACODES/alef-tools). This app pulls in one fixed version of it.
The rules both sides keep are in that repo's `docs/CONTRACT.md`.

## What is here

| Path | What |
|---|---|
| `data/alef-tools.lock.json` | The pinned alef-tools commit and every vendored file with its size and SHA-256. |
| `assets/vendor/_alef-tools/<pkg>@<version>/` | The vendored code (small ES modules). Committed, because the host publishes the repo as it is. |
| `src/settings/alef-tools.generated.js` | Package id to folder. Written by the sync tool. |
| `src/settings/tools.js` | The one place screens import the loader from. It registers the Shabbat check first. |
| `src/settings/shabbat.js` | `isShabbatSafeMode()`: the app's existing Shabbat and Yom Tov logic, handed to the loader. |
| `src/settings/packs.view.js`, `packs.model.js` | The Language Packs page (`#/packs`). |
| `data/packs/catalog.json` | The packs that page can list. Written by the sync tool from the alef-tools manifest. |
| `tools/alef-tools/sync.mjs` | Fetches the pinned commit, checks every file, writes all of the above. |

## Moving to a newer alef-tools

```
node tools/alef-tools/sync.mjs --ref <full commit sha>     # add --add <pkg> to vendor another package
node tools/build-precache.mjs
npm test
```

Commit the lock, the vendored folder, the two generated files and the precache list together.
`node tools/alef-tools/sync.mjs --check` (run by CI, no network) fails if any vendored file differs from the lock.

## What never happens

- Nothing under `assets/vendor/` is in the first install. The loader code is fetched the first time a screen needs it
  (and by "Download everything"), so Talk still opens offline.
- No language pack is ever listed in `precache-manifest.js`. A pack downloads only when the learner presses Download,
  in parts of at most 16 MiB, each checked by SHA-256, into its own cache, and can be deleted on the Language Packs page.
- No model weights are in this repo's alef-tools folder: the sync tool refuses anything but code, JSON and licence texts.
- On Shabbat and Yom Tov nothing downloads by itself. A download the learner starts still works.
- The only address outside the site the app may read from is the pack host, `https://alenzacodes.github.io`
  (`connect-src` in `render.yaml` and `_headers`). Scripts come from the site alone.
