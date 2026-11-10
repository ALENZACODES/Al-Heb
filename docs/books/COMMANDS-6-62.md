# Little books 6 to 62: picture run and voice run

Two master commands, one for the picture generator and one for the voice studio, plus where the files go and how they get into the app. Both read the CSVs that `node tools/books/build.mjs` writes. Keep tool and model names out of files, commit messages and branch names; `node tools/meta/scan.mjs --text` must stay green.

## Where the files go

| What | Path | Spec |
| --- | --- | --- |
| Page picture | `assets/books/bookN/BOOKN_pXX.jpg` (N = 6 to 62, XX = 01 to 12) | JPEG, 1659 x 948 px (same as books 1 to 5), landscape, quality 85, no EXIF or XMP, no text in the picture |
| Man's voice | `audio/m/israeli/book/bookN-pXX.mp3` | mono, 44.1 kHz, 96 kbps mp3, no ID3 tags, 0.3 s silence head and tail |
| Woman's voice | `audio/f/israeli/book/bookN-pXX.mp3` | same |

After pushing files: `node tools/books/build.mjs` (it flips `hasImg` and `hasAudio` from what exists on disk and recounts `index.json`), `node tools/meta/scan.mjs` (metadata) and `node tools/meta/scan.mjs --text`, then `npm test`. Commit as John Khan.

The 684 page rows are in `docs/books/image-prompts-6-62.csv` (one row a page: `output_path`, `scene`, `hebrew_on_page`, `english_on_page`) and the 1,368 clip rows in `docs/books/recording-script-6-62.csv` (one row a page a voice: `clip_id`, `voice`, `output_path`, `hebrew`, `phonetic`, `english`).

## Master command: pictures

Paste this once, then feed the CSV in batches of one book (12 rows) at a time.

```
You are illustrating a series of 57 short Hebrew readers for ADULT beginners. The readers look like
picture books but the subjects are adult: coffee, work, the bank, a first date, a night shift, moving
house, a wedding, the desert at night. One picture per page, 12 pages per book.

STYLE (identical for every picture in the series):
- Flat, warm, editorial illustration. Textured gouache look, visible brush grain, no gradients, no 3D,
  no photo-realism, no anime.
- Palette: warm off-white paper, deep olive green, gold ochre, terracotta, one accent of sea blue.
  Night scenes use deep indigo instead of off-white. Never pure black.
- Composition: one clear focal action, generous negative space on the LEFT third of the frame
  (the Hebrew text is placed there by the app). Eye level, mid shot. Landscape 16:9, 1659 x 948.
- People: adults 25 to 80, diverse Israeli faces, ordinary clothes, no caricature, no exaggerated
  features, kind expressions. Recurring characters keep the same look within a book.
- Setting cues: Tel Aviv Bauhaus balconies and water tanks, Jerusalem stone, Haifa's hillside,
  the Negev's red rock, a Carmel Market awning. Use them lightly; the scene line decides.
- NO TEXT of any kind in the image: no letters, no Hebrew, no numbers, no signs with words, no logos,
  no brands, no flags, no real people, no copyrighted characters.
- Not a children's style: no rounded cartoon proportions, no sparkles, no big-eyed characters.

FOR EACH ROW I give you (book, page, output_path, scene, hebrew_on_page, english_on_page):
1. Draw the SCENE line literally. The english_on_page line tells you the mood; do not put its words
   in the picture.
2. Keep the left third quiet for text.
3. Output one JPEG, 1659 x 948, quality 85, named exactly as output_path's file name
   (for example BOOK17_p04.jpg). Strip all metadata.
4. After the 12 pages of a book, show me a contact sheet of the 12 so I can check character
   consistency, then wait for "next".

If a scene line would need text to make sense, show the object instead (a lit phone, a ticket, a sign
shape with no letters). If a scene describes a split frame, draw two panels with a thin paper gap.

Reply "ready" and I will paste book 6.
```

Then for each book paste the 12 CSV rows for that book. When the 12 JPEGs come back, save them to `assets/books/bookN/` with the exact file names, run `node tools/meta/strip.mjs assets/books/bookN --apply --in-place` to remove any embedded metadata, then `node tools/books/build.mjs`.

## Master command: voices

Paste this once into the voice studio (or hand it to a human reader with the CSV). The app plays two voices for every page: a man (shown as "Ari") and a woman (shown as "Noa"), both Israeli Hebrew.

```
You are recording 684 very short Hebrew lines for an adult beginners' reading course, twice each:
once in a man's voice and once in a woman's voice. The learner reads along with the pointed Hebrew
on screen, so the recording must match the text EXACTLY, word for word, with no additions.

VOICE: Modern Israeli Hebrew, standard pronunciation (resh as the Israeli uvular r, chet and khaf
both as the Israeli kh, no Ashkenazi or Sephardi colouring). Warm, unhurried, clear, like a patient
teacher reading to one adult. Not childish, not theatrical, not a newsreader.

PACE: Slow but natural. Each word fully articulated with a slight gap between words. Full stops get a
real pause. Questions rise. Exclamations are warm, not shouted. Quoted dialogue is read as the
speaker would say it, but still slowly.

TEXT RULES:
- Read the `hebrew` column exactly. Final letters, dagesh (bet/vet, kaf/khaf, pe/fe) and shin/sin
  follow the vowel points as written. If a point looks wrong to you, read what is written and flag
  the clip_id in a list at the end; do not silently fix it.
- Names are Israeli names (Dana, Yossi, Maya, Tamar, Omer, Shira, Eitan, Nadav, Leah, David, Yael,
  Noa, Roni, Avraham, Mark); say them as Israelis do.
- Numbers written as words are read as written. The one digit string, "1956", is read in Hebrew as
  elef tesha me'ot chamishim ve-shesh.
- Loanwords (otobus, telefon, kafeh, falafel, shawarma, internet, meil, pitzah) are read the Israeli way.
- Nothing is added: no clip_id, no page number, no "page", no breath sounds exaggerated for effect.

FILE RULES: one file per row, mono, 44.1 kHz, 96 kbps mp3, 0.3 seconds of silence at the start
and end, peak normalised to -3 dBFS, NO ID3 tags or any metadata, file named exactly as `output_path`
(for example book17-p04.mp3) and placed under the folder in that path (audio/m/... for the man,
audio/f/... for the woman).

QUALITY GATE before you hand back a batch: play each clip against its `hebrew` text; any clip where a
word is missing, added, mispronounced against the points, or clipped at the edges is re-recorded.
Return the batch plus a list of clip_ids you flagged for a possible pointing error.

I will give you the CSV one book at a time (24 rows: 12 pages x 2 voices). Reply "ready".
```

Then paste the 24 rows for a book. Save the files to the exact paths, run `node tools/meta/scan.mjs audio/m/israeli/book audio/f/israeli/book` (it must find no tags), then `node tools/books/build.mjs`.

## After both runs, for the record

- Add a short report `docs/books/PRODUCTION-6-62.md`: which generator and which voices, dates, counts, and the list of flagged clip_ids. Say plainly that no native speaker has reviewed the Hebrew until one has.
- The native review of the 684 lines is the real gate; the pictures and voices do not make the Hebrew correct.
