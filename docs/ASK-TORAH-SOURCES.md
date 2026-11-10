# Sources for Ask the Torah

Aleph’s Ask the Torah page quotes only texts it can fetch from a recorded source. It does not invent a verse or a reference. The service checks every cited verse id against the stored text before an answer is shown.

## Hebrew of the Torah

- **Source:** Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc., as already built into `data/corpus/torah/` by `tools/torah/fetch_torah.mjs`.
- **Licence:** “All biblical Hebrew text, in any format, may be viewed or copied without restriction.” Citation appreciated. This is not to be presented as the Westminster Leningrad Codex itself.
- **Notes:** Verses are shown in the standard Hebrew chapter and verse grid used by the Aleph Torah reader. The four-letter Name is displayed as ה׳. John has not yet decided how the Name should be shown; this is a working default and is never spelled out or sent to a voice.

## English of the Torah

- **Source:** *The Holy Scriptures: A New Translation* (Jewish Publication Society, 1917), retrieved through the Sefaria API with that version title pinned (the same pin as the Torah reader).
- **Licence:** Public domain (by age; Sefaria labels the version Public Domain).
- **Notes:** English wording is not silently replaced. The four-letter Name in Latin letters is not used; this edition already writes “the LORD” or “God”.

## Rest of the Tanakh (when a question is not in the Torah)

- **Hebrew:** UXLC / Tanach.us, same licence as above, when a verse is stored in `tools/ask-torah/knowledge/extra-verses.jsonl`.
- **English:** JPS 1917, public domain, same pin as above.
- **Links:** If Aleph does not yet have a reader for that book, the answer links to the passage on Sefaria.

## Mishnah, Talmud and later tradition

- These are used only to say *where a later idea comes from* when it is not in the written Torah (for example, the title “rabbi”).
- Citations name the work (for example, Mishnah Avot 1:1, Mishnah Megillah 4:3). Quoted later-text lines, when present, are taken from Sefaria and recorded in `tools/ask-torah/knowledge/later-texts.json` with the licence Sefaria reports for that text.
- Explanatory wording around those citations is original to Aleph. It is respectful and non-denominational, and it notes where traditions differ.

## What this page does not use

- It does not quote a modern copyrighted translation as the verse itself.
- It does not invent midrashic stories as if they were Torah verses.
- It does not speak the four-letter Name.

See also `docs/torah/SOURCES.md` for the fetch log of the main Torah corpus.
