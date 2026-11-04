# ALEF record kit: getting human voice recordings from a volunteer

One HTML file, `tools/record-kit/recorder.html`, lets a reader (a cantor, a teacher) record the ALEF reading list on a phone or laptop. It needs no install, no account and no internet once the file is open. Nothing is uploaded: recordings stay on the volunteer's device until they send you one zip.

Status: built and tested with a fake microphone and fixture files only. No real volunteer has used it yet, and the consent wording is a draft (see below).

## 1. Prepare the page

```
node tools/record-kit/build.mjs                                  # picker only: the volunteer chooses the CSV
node tools/record-kit/build.mjs --script docs/voices/recording-script-sephardi.csv --limit 150 --out ~/sephardi-m.html   # list built in
```

`recorder.html` in the repo is the picker-only build (a test fails if it is stale). Reading lists: `docs/voices/recording-script-{israeli,sephardi,ashkenazi}.csv` (1,000 words each; the other repo slates also load). A `.json` list `{ "items": [{id, kind, tradition, he, translit, english}] }` works too. Use `--limit` to give a volunteer a session-sized slice (about 150 words).

## 2. Send it to the volunteer

- Email or message the single `.html` file (and the CSV if it is not built in). On a phone, open it from the attachment or save it to Files/Downloads and open it in Chrome (Android) or Safari (iPhone).
- Microphone access: the browser asks once. It works from a local file in Chrome and Safari; if a browser refuses, serve the folder with `node tools/serve.mjs` or any static server on a laptop and open it over `http://localhost`.
- Tell them: quiet room, phone about a hand span from the mouth, same distance throughout, one calm read per item, re-record if the page warns about loudness or silence. Pick the tradition and voice (m or f) on the first screen; it must match the list.
- Progress is saved on that device (IndexedDB). If the tab closes, reopening the same file offers Continue. Different browser or "private" mode means no saved progress: tell them to press Export a zip often.

## 3. Get the files back

The volunteer presses **Export a zip** and sends you the one `alef-recordings-<name>-<date>.zip` (email, shared drive, messaging app). It contains `audio/<voice>/<tradition>/<kind>/<id>.wav` (same naming as the app's audio paths), `manifest.csv` (id, duration, peak, warnings, name, tradition, date), `consent.json` and `consent.txt`.

Check and ingest:

```
node tools/record-kit/ingest.mjs ~/Downloads/alef-recordings-x.zip            # dry run: validates, writes nothing
node tools/record-kit/ingest.mjs x.zip --report report.csv
node tools/record-kit/ingest.mjs x.zip --apply                                  # post chain + copy into audio/ + manifest
```

Dry run reports bad names, unknown ids, clipping, silence, too short/long, mismatches with the page's `manifest.csv`, and refuses everything if consent is missing or incomplete. `--apply` runs the `tools/tts/post.mjs` chain (trim, loudness -16 LUFS, mono 44.1 kHz MP3, all metadata stripped), copies MP3s and a `.meta.json` sidecar (status `recorded`) into `audio/`, and marks manifest entries `recorded`. Words from the 1,000-word scripts use corpus ids that have no manifest entry yet: those clips are copied but the manifest is left alone (a gap in the manifest builder, not solved here). It will not overwrite an existing human clip without `--replace`. After applying, run the usual manifest check; do not run the precache build until you have listened to the clips.

Listen to every clip before release: the page and ingest check technical quality, not whether the reading is correct for the tradition.

## 4. Privacy and consent

- The page makes no network requests. Recordings and the volunteer's name live in the volunteer's browser storage and in the zip they choose to send.
- The consent screen is mandatory: three required ticks plus the name, and a separate optional box for voice cloning / model training, off by default. Without that tick the recordings must not be used to clone the voice or train any model (the ingest sidecar records `aiCloneConsent`).
- Consent text mirrors `docs/voices/donor-rights-grant.md` (use in the free or paid app, the book and marketing; ALEF may be sold or transferred; no royalties; withdrawal stops future use only). **It is draft wording: have a lawyer review before relying on it.** A ticked box on screen may not be enough for signed-agreement purposes; keep the signed form in `docs/voices/` as the legal record until a lawyer says otherwise, and note that minors need a guardian.
- `ingest --apply` stores `consent.json` and `consent.txt` under the work folder (default `~/alef-record-work/<name>-<ref>/consent/`), never in the repo. Do not commit zips, raw recordings or consent files; the repo only receives MP3s and sidecars with a random donor reference, no name.
- Ask the volunteer to delete the recordings from their device after you confirm receipt (the page's "Discard it and start over" clears the saved session).
