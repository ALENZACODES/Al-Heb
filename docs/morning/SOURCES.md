# Morning verses: sources (fetched 2026-11-03)

`data/morning-verses.json` has 130 entries `{id, hebrew, english_jps1917, source_ref}` and nothing else (no provenance fields in the file).
Rebuild: download into an empty directory the UXLC books and the Sefaria JPS 1917 verses named in `refs.txt`, then
`node tools/morning/build-verses.mjs <RAW-DIR>`. The verse REFERENCES were chosen by hand (editorial); every Hebrew and English string comes from the downloads.

| Part | Source | Label as the source states it | Checked |
|---|---|---|---|
| Hebrew (pointed, cantillation removed by `cleanLine`) | UXLC 2.6, tanach.us/Books/*.xml, same pipeline and licence statement as `docs/torahread/SOURCES.md` | "may be viewed or copied without restriction" (tanach.us/License.html) | pipeline = the one that reproduces registry records shema-1 and bless-priestly-1 |
| English | JPS 1917 via Sefaria API v3 (`english|The Holy Scriptures: A New Translation (JPS 1917)`) | Sefaria `license: Public Domain` | the build refuses any verse whose label is not "Public Domain" or whose version title lacks "JPS 1917" |

Not verified: Sefaria's label itself (not independently confirmed); no Hebrew educator has proofread any entry; JPS spelling and capitalisation (LORD, thee/thou) are kept as served.
Dropped by the build (8 of 138 candidates): Psalms 23:1, 27:1, 103:1, 119:105, 121:1, 133:1 (the served English begins with a psalm title or section heading that the Hebrew field would not match 1:1), 136:1 (duplicate of 118:1), 86:11 (source typography artefact).
Pirkei Avot was not used (no Sefaria Avot version licence was checked).
Modeh Ani: Hebrew from registry record `modeh-ani-1` (Metsudah via Sefaria, label CC-BY, attribute Metsudah Publications and Sefaria); the feminine form is derived and flagged needs-check. English there is an original gloss.
Audio: `data/audio/manifest.json` lists `line/modeh-ani-1` for all voices/traditions with status "missing" as of this build, so the card renders without a play button.
