# Word Notes (Tap A Hebrew Word)

What it is: tap a Hebrew word in a lesson and a small card opens under it with the word's dictionary form and English, the letters joined to its front (ו־ ה־ ב־ ל־ מ־ ש־ כ־) and what they mean, what kind of word it is with gender and number, an ending such as "his", whether it is a name or a place, and, where the app's own word list has them, its family letters and verb pattern. Each lesson also gets a "Word Notes" section: up to three short grammar notes drawn from the lesson's own words, and a button for every lesson word (the keyboard and screen-reader way in).

## Where things live

| Part | Path | Loaded |
|---|---|---|
| The word-notes package: note text code and per-lesson notes (177 units, 1.1 MB in all, largest 40 KB) | `assets/vendor/_alef-tools/morph@<version>/` | on demand, when a lesson shows its Word Notes; listed for "Download everything" |
| Card, tap handling, lesson section | `src/words/` | on demand (dynamic `import()` from the lesson view, Talk and Camera) |
| Styles | `assets/css/words.css` | with the first Word Notes section |
| Pin of the tools build | `data/alef-tools.lock.json` | build time (`node tools/alef-tools/sync.mjs --check` in CI) |

The vendored folder is a copy of `packages/morph/dist` from the tools repo (ALENZACODES/alef-tools) at the commit the lock names. Do not edit it here. Screens reach it through `src/words/morph.js`, which uses `src/settings/tools.js`, so no screen names a version. To update:

```
node tools/alef-tools/sync.mjs --ref <commit> --add morph      (add --from <checkout> to read a local copy)
node tools/build-precache.mjs
npm test
```

## What is and is not checked

- The notes come from two places and the card keeps them apart. From the app's own word list (through a link to one entry): the pointed dictionary form, the English, family letters, verb pattern. From a reading of the lesson text done ahead of time: the prefix split, kind of word, gender, number, person, tense, ending, name tag.
- Family letters are only ever copied from the word list (`data/vocab/words.json`). While `data/roots/verified.json` is empty the card says "Family letters … Not yet checked by a teacher", never "root".
- Where the word list and the reading disagree, the card shows only what is not in dispute and the word is on a review list in the tools repo (`packages/morph/review/lesson-words.json`, 760 words on 12 Nov 2026).
- No teacher or native speaker has checked the notes. The card says so.
- The four-letter Name has no notes and no card. It is replaced before any text is read, and a test checks that it is in no vendored notes file. A single letter shown on its own has no card either.
- Measured accuracy, what was measured and what was not: the tools repo, `packages/morph/README.md`.

## The Word Helper Language Pack (Not Offered Yet)

For words outside the lesson notes (Talk, Camera Translator, anything typed), the Word helper pack reads the word on the device. About 50 MB. It is an ordinary pack of the shared loader: listed, downloaded and deleted on the Language Packs page, in parts of at most 16 MiB each checked against a SHA-256, kept in its own cache (`alef-pack-words-v1`). This lane added no download code and no Settings row.

The catalog (`data/packs/catalog.json`) marks it `published: false`, because its files are not on the pack host. While that is so, the Language Packs page does not list it, lessons never mention it, and Talk and Camera behave exactly as before. Once it is published and the tools pin is moved, `src/words/morph.js wordsReader()` starts the reader for a device that already holds the pack; it never starts a download.

Not tried in a browser: the card and the tap handling were tested as models under Node, and the reader with a stand-in worker. A person still has to tap through a lesson on a phone and a desktop.

## Size

First install: +1,930 bytes raw, +544 bytes gzipped, in three files (the lesson view hook, one offline-download group, one credits row). Everything else is on demand.
