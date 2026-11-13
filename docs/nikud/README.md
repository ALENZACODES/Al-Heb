# Vowel marks on this device (`src/nikud`)

Hebrew that reaches the app without vowel marks (a sign read by the Camera Translator, a line typed or
translated on the Talk screen) can get its marks, and a line showing how it is said, on the learner's own
device. Stored Talk lines that had no marks get them from files made ahead of time.

Nothing here is in the first install. No server is involved.

## What the learner sees

- **Settings → Vowel mark packs** and the **Talk** screen list two optional packs with their size before
  anything is fetched: *Vowel Marks* (303 MB) and *Sounds And Stress* (294 MB). One press downloads a pack
  in parts of at most 16 MiB, each checked against its SHA-256. A pack can be stopped, carried on later
  and removed.
- With a pack on the device, an **Add Vowel Marks** button appears under a Hebrew line that has bare words:
  on the Talk screen and in the Camera Translator's line detail. The marks replace the bare line; with the
  sound pack a line of sounds follows, and the same line written the way the learner's tradition says it
  (the app's own rules in `src/pronunciation`).
- With "Show Hebrew vowel marks where Aleph has them" on, a stored Talk line that has no checked marks
  shows marks made ahead of time, with the note that nobody has checked them yet.

Until the packs are on the pack host the two rows say *Not available to download yet* and no button is
shown.

## Rules kept in code and tests (`tests/nikud.test.js`)

- The divine Name is written ה׳. A line that holds it never gets a sound line and is never sent to the
  sound pack.
- Letters are never changed. A word that already has marks keeps them. Text with cantillation marks
  (Torah) is returned as it came.
- A download starts only from the learner's press. There is no timer, no notification and no background
  fetch in `src/nikud`.
- Packs live in their own caches, `alef-pack-nikud-v1` and `alef-pack-phonemes-v1`. An app update does not
  clear them; "Delete all my data" treats them like the Talk packs.
- The screens load `src/nikud/panel.js` with a lazy `import()`. `tools/build-precache.mjs` lists
  `src/nikud/` as on demand and never lists `assets/vendor/`.

## Where the code comes from

The work is done by two packages of [ALENZACODES/alef-tools](https://github.com/ALENZACODES/alef-tools),
vendored as plain ES modules:

```
assets/vendor/_alef-tools/loader@<version>/   shared pack loader (download, checks, cache, worker host)
assets/vendor/_alef-tools/nikud@<version>/    marks and sounds; nikud/<unit>.json = marks made ahead of time
assets/vendor/_alef-tools/nikud.lock.json     the alef-tools commit and every file's size and SHA-256
src/nikud/vendor.js                           the one file that names those folders (written by the tool)
```

To move to another alef-tools commit:

```
node tools/alef-tools/sync-nikud.mjs --from <alef-tools checkout>
node tools/build-precache.mjs
npm test
```

`node tools/alef-tools/sync-nikud.mjs --check` fails when a vendored file differs from the lock.
`sync-nikud.mjs` is a stand-in for the shared `tools/alef-tools/sync.mjs` of the alef-tools loader lane; it
writes the same folders, so that tool can take over without moving anything.

## Where the packs come from

Looked for in this order (alef-tools `docs/CONTRACT.md`, section 4.2):

1. `assets/vendor/_packs/<pack>/pack.json` on the site itself (only if a deploy carries a pack);
2. `https://alenzacodes.github.io/alef-packs/<pack>/pack.json`.

The site's `connect-src` already allows that host. Only data comes from it; code always comes from the
site. The runtime is the app's own `assets/vendor/_ort` (onnxruntime-web, WebAssembly, one thread).

## Trying it on one computer before the packs are published

```
# in alef-tools: build the two packs (about 10 minutes, 6 GB of memory, see packages/nikud/README.md)
# then copy them next to the site and serve it
mkdir -p assets/vendor/_packs
cp -r <alef-tools>/out/packs/nikud <alef-tools>/out/packs/phonemes assets/vendor/_packs/
npm run serve        # open #/talk, press Get Vowel Marks, type a Hebrew line, press Add Vowel Marks
```

`assets/vendor/_packs/` must not be committed (a test fails if it exists in the tree).

## Credits

Dicta's DictaBERT-large-char-menaked (CC BY 4.0, converted to 8-bit ONNX) and Phonikud (MIT) are listed
on the credits page from `data/legal/attributions.json`; the licence audit has a section for them.
