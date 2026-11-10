# Foundation recordings — Ashkenazi & Sephardi letters, syllables, vowels

The app already has every Israeli letter, syllable and vowel. It has **none** for the
Ashkenazi and Sephardi traditions: **728 clips** are missing (57 letters, 110 syllables
and 15 vowels, x 2 voices, x 2 traditions). These are the sounds a learner hears first,
and the traditions genuinely differ here, so they must be **recorded by readers of each
tradition** — they cannot be synthesised with the Israeli voices.

## What to record

`files.csv` lists every clip: the exact file name, the folder it belongs in, and the
pointed Hebrew to read (`read_this`). One reader per row's voice and tradition:
an Ashkenazi reader reads only the Ashkenazi rows, in Ashkenazi pronunciation
(kamatz as "o", tav as "s" where the tradition has it, and so on); a Sephardi reader
reads only the Sephardi rows. Read each item once, clearly, at teaching pace — these
are single letters, vowel sounds and syllables, about a second each.

## File spec (matches the existing production clips)

- MP3, 44.1 kHz, mono, about 96 kb/s
- File name EXACTLY as in the `file` column — no renaming, no numbering prefixes
- One item per file; a breath of silence at the start is fine

## Where the files go

Put each file at its `path` from the CSV, on the branch **audio/foundation-traditions**:

```
audio/<voice>/<tradition>/<kind>/<file>
e.g. audio/f/ashkenazi/letter/alef.mp3
```

Commands (from a clone of the repo):

```
git clone https://github.com/ALENZACODES/Al-Heb.git
cd Al-Heb
git checkout audio/foundation-traditions
# copy the recorded files into their audio/... folders, then:
git add audio
git commit -m "Add Ashkenazi and Sephardi foundation recordings"
git push origin audio/foundation-traditions
```

Or hand the named files to John — he will pass them on for ingest. Once the files are
in, the audio manifest is rebuilt from the files on disk and the clips go live with the
next publish; each clip is labelled in the app as a human recording.
