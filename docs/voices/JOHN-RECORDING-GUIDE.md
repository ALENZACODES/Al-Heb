# Recording the first 100: John's walkthrough (one page)

Plain steps for you recording your own voice. Four recording runs in all: Sephardi man, Sephardi woman, Ashkenazi man, Ashkenazi woman. One speaker is one voice; do only the run that matches the speaker. The list of 100 clips per tradition is `docs/voices/first-100.csv` (readable version: `docs/voices/FIRST-100.md`).

## 1. Open the recorder page

Use Chrome or Edge on a laptop with a decent microphone, in a quiet room. The page is one file and needs no internet. Double-click the file for your tradition, or open it with the voice already chosen by adding the link ending shown here (replace `FOLDER` with where the two files sit):

| Run | Link to open |
|---|---|
| Sephardi, man | `file:///FOLDER/record-sephardi.html?tradition=sephardi&voice=m` |
| Sephardi, woman | `file:///FOLDER/record-sephardi.html?tradition=sephardi&voice=f` |
| Ashkenazi, man | `file:///FOLDER/record-ashkenazi.html?tradition=ashkenazi&voice=m` |
| Ashkenazi, woman | `file:///FOLDER/record-ashkenazi.html?tradition=ashkenazi&voice=f` |

If the two files do not exist yet, make them from the repo folder: `node tools/record-kit/build.mjs --script docs/voices/first-100.csv --tradition sephardi --out ~/record-sephardi.html` (and the same with `ashkenazi`). Allow the microphone when the browser asks.

## 2. Record

1. Type the name, tick the three required consent boxes (leave the voice-clone box unticked unless the speaker truly agrees), press continue.
2. Press the button to use the built-in list of 100. Record in order: press record, pause a second, say the item once, press stop. Re-record when the page warns about loudness or silence.
3. Read as your own congregation reads; sound every vocal shva; stay the same distance from the microphone. The page keeps your work if you reload, so you can stop and resume.

## 3. Export

Press Export a zip. You get `alef-recordings-<name>-<date>.zip` in Downloads. It holds the clips, a list, and the consent record (which has a real name; it never goes into the repo).

## 4. Check, then apply (from the repo folder)

Dry run first. It writes nothing and lists what it would accept, reject and copy:

```
node tools/record-kit/ingest.mjs ~/Downloads/alef-recordings-<name>-<date>.zip --root .
```

If the report shows no REJECT lines, run the same command with `--apply` added at the end:

```
node tools/record-kit/ingest.mjs ~/Downloads/alef-recordings-<name>-<date>.zip --root . --apply
```

Apply cleans each clip (trim, loudness, mono MP3), puts it under `audio/`, and marks it `recorded` in `data/audio/manifest*.json`. It also copies each clip to every other lesson word with the same pointed text (for example `r04-w1`, `r04-w2`, `r05-w1`), so those do not still say "No audio yet". Then listen to every clip: the check is technical only, not whether the reading is right.

## 5. Verify in the app

Run `node tools/serve.mjs`, open the address it prints, and choose the matching tradition and voice in the app settings. On a Listen screen for a word or line you recorded, the status should read **Recorded by a human reader** (not "No audio yet"). If it still says "No audio yet", the app's offline file list probably needs rebuilding first; do not guess, ask the developer.

## Consent and rights for voice donors (includes you)

The recorder page shows the consent text before anything is recorded and saves it with the zip. That text mirrors `docs/voices/donor-rights-grant.md`; the donor guide is `docs/voices/donor-recording-guide.md`, and the buyout terms are in `docs/voices/buyout-contract-terms.md`. **These are drafts written without a lawyer. A qualified lawyer must review them (moral rights, minors, privacy, voice-clone and AI-training wording, withdrawal, governing law) before any donor other than yourself is asked to tick or sign anything.** Do not publish a donor's recordings until that review is done and the signed grant is on file outside the repo. Voice cloning stays off unless the donor ticks the separate optional box.
