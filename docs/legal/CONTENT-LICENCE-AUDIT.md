# Content licence audit

Date of checks: 2026-11-04. **Not legal advice.** No lawyer has reviewed this. It records what each source says about itself, what I could read from the source's own page today, and what I could not. Machine-readable twin: `data/legal/attributions.json` (one row per source id below; `tests/legal.test.js` enforces that).

Status words used here and in the JSON:
- **verified-primary**: the licence statement was read on the source's own page (or the licence text itself) on 2026-11-04.
- **partly-verified**: a third-party label (for example Sefaria's) or a licence file inside the repo was re-read, but the underlying right was not confirmed.
- **unverified**: nothing was checked from a primary source today; the row repeats an earlier repo note.
- **project-owned / not-present**: written for this project, or nothing from that source is in the repo.

"Commercial sale" means selling the app or access to it. "Yes-with-conditions" means the licence text has no non-commercial restriction but attaches duties (credit, share-alike, notices).

## 1. What I read today, and what I could not

Read directly on 2026-11-04:
- tanach.us/License.html: "All biblical Hebrew text, in any format, may be viewed or copied without restriction." Citation "appreciated"; the text is not the Westminster Leningrad Codex; all other files and the look-and-feel are copyrighted.
- en.wiktionary.org/wiki/Wiktionary:Copyrights: original text is "dual-licensed ... under both the Creative Commons Attribution-ShareAlike 4.0 International License (CC-BY-SA) and the GNU Free Documentation License (GFDL)".
- kaikki.org/dictionary/index.html: data "made available under the same licenses as Wiktionary - both CC-BY-SA and GFDL".
- raw.githubusercontent.com/hermitdave/FrequencyWords README: "MIT License for code. CC-by-sa-4.0 for content." (and the repo LICENSE file is the MIT text).
- tatoeba.org/en/terms_of_use: Tatoeba "uses the default Creative Commons Attribution 2.0 France license (CC-BY 2.0 FR) for the use of textual sentences"; the only restriction named is attribution of the author; the page also says contributors may apply other licences per sentence and that reusers are responsible for checking.
- creativecommons.org/licenses/by-sa/4.0/legalcode.en: grants the right to "reproduce and Share the Licensed Material" and "produce, reproduce, and Share Adapted Material"; I searched the text for "NonCommercial" and found no such term. ShareAlike clause: "The Adapter's License You apply must be a Creative Commons license with the same License Elements, this version or later, or a BY-SA Compatible License." and "You may not offer or impose any additional or different terms or conditions on, or apply any Effective Technological Measures to, Adapted Material that restrict exercise of the rights granted under the Adapter's License You apply."
- Sefaria public API (`/api/texts/versions/<title>`), read live: Metsudah siddur Hebrew labelled CC-BY on Siddur Ashkenaz and Siddur Sefard (source link: National Library of Israel record NNL_ALEPH002211687); Torat Emet 357 labelled Public Domain on Siddur Sefard but `unknown` on Siddur Ashkenaz; Shaliehsaboo Edition Hebrew labelled CC0 in one version row and `unknown` in another, with upstream source given only as sefaria.org; JPS 1917 labelled Public Domain on Genesis, Numbers and Deuteronomy (source link: an Open Siddur page). Same API also shows labels the repo avoids: Miqra according to the Masorah is CC-BY-SA.
- guides.library.cornell.edu/copyright/publicdomain: US works published before 1931 are in the public domain due to copyright expiration (US rule only).
- openfontlicense.org/ofl-faq: "Can I sell a software package that includes these fonts? Yes".
- Upstream OFL.txt headers (google/fonts) for Heebo, Frank Ruhl Libre, Gveret Levin, Noto Sans/Serif Hebrew and Alef; DejaVu LICENSE (github dejavu-fonts): "Fonts are (c) Bitstream ... DejaVu changes are in public domain."
- hebcal.com/home/about: "Except where otherwise noted, content on this site is licensed under a Creative Commons Attribution 4.0 International License." (page dated March 29, 2026).
- en.wikipedia.org/wiki/Wikipedia:Copyrights: points reusers to CC BY-SA 4.0 and GFDL.

**Not read or not verifiable by me today:** Sefaria's own terms of use (the /terms page returned no readable licence text); Open Siddur and toratemetfreeware.com pages (so the upstream basis for the Torat Emet, Edot HaMizrach and JPS labels); the actual rights position of the 1981 Metsudah publication; OpenSubtitles' position on derived word counts; the Tatoeba per-sentence licence of each of the 5,315 sentences used (the repo records CC BY 2.0 FR for all; I did not test each against Tatoeba); upstream terms for the Tesseract Hebrew model, xkeyboard-config and the image tools; the Debian copyright file named in a repo note; whether the CC licences interact as hoped (see section 4). Anything about law outside the pages above is general background, not something I verified.

## 2. Source register

| id | Source | Used for | Licence | Commercial sale | Share-alike effect | Credit required | Status |
|---|---|---|---|---|---|---|---|
| `wiktionary` | Wiktionary contributors | lemmas, glosses, pointed headwords, POS, forms in `data/vocab/*` (6,027 of 6,297 word records) | CC BY-SA 4.0 and GFDL (dual) | Yes-with-conditions | Yes. Adapted material must be shared under CC BY-SA 4.0 or a BY-SA-compatible licence: the vocabulary data set as distributed | Yes: attribution, licence link, indicate changes | verified-primary |
| `kaikki-wiktextract` | kaikki.org Hebrew extract | the dump the vocab build read | same as Wiktionary (CC BY-SA, GFDL) | Yes-with-conditions | Same as Wiktionary | Yes (credit Wiktionary; mention Wiktextract/kaikki) | verified-primary |
| `frequencywords-opensubtitles` | FrequencyWords 2018 he (Hermit Dave), derived from OpenSubtitles2018 | rank order | CC BY-SA 4.0 (content), MIT (code) | Yes-with-conditions as far as the README goes | Yes: rank order is a derivative; same data set as above | Yes | partly-verified (README read; the underlying subtitle corpus rights not checked) |
| `tatoeba` | Tatoeba sentences | example sentences on 5,315 records | CC BY 2.0 FR | Yes-with-conditions (attribution only is named) | No share-alike of its own; open question whether it can sit inside a CC BY-SA data set (see section 4) | Yes, per sentence: author named with the sentence | partly-verified |
| `uxlc` | Unicode/XML Leningrad Codex 2.6, Tanach.us | Hebrew of all Tanakh verses; 434 vocab examples; cantillation data | "copied without restriction" | Yes | No | Not required; citation appreciated; do not call it WLC | verified-primary |
| `jps-1917` | JPS 1917 English Bible | English of 26 reader records and the morning verses | Public domain (label; 1917 publication) | Yes in the US by age; other countries not checked | No | Not required; credit is courteous | partly-verified |
| `metsudah-siddur` | Metsudah siddur 1981, via Sefaria | Hebrew of 21 prayer records | CC-BY (Sefaria label) | Unknown. CC-BY itself allows it, but whether Sefaria could grant it for a 1981 vocalised publication is not confirmed | No | Yes if the label holds: credit publisher, licence link, indicate changes | partly-verified |
| `torat-emet-357` | Torat Emet 357, via Sefaria | Hebrew of 6 prayer records | Public Domain (Sefaria label; Ashkenaz row says unknown) | Unknown | No | Courtesy only | partly-verified |
| `edot-hamizrach-shaliehsaboo` | Siddur Edot HaMizrach, Shaliehsaboo Edition, via Sefaria | Hebrew of 15 prayer records | CC0 (one row; another row for the same title says unknown) | Unknown (CC0 would permit it; provenance of the text is only "sefaria.org") | No | Courtesy only | partly-verified |
| `sefaria-platform` | Sefaria | delivery channel for the four rows above | per-version labels; terms not read | Unknown | Unknown | Credit Sefaria as source (as the repo does) | unverified |
| `font-heebo` | Heebo | UI font, shipped (woff2) | SIL OFL 1.1 | Yes-with-conditions (OFL FAQ: can sell a package including the fonts) | No (a repo note says OFL does not reach documents set in the font; not tested by me) | Keep copyright line and OFL text with the font | verified-primary |
| `font-frank-ruhl-libre` | Frank Ruhl Libre | pointed print Hebrew, shipped | SIL OFL 1.1 | Yes-with-conditions | No | same | verified-primary |
| `font-gveret-levin` | Gveret Levin | cursive display, shipped; outlines seed cursive data | SIL OFL 1.1 | Yes-with-conditions | The derived glyph data in `data/letters` stays under OFL terms (repo note; not tested by me) | same | verified-primary |
| `font-alef` | Alef | repo only, not shipped on the web | SIL OFL 1.1, Reserved Font Name "Alef" | Yes-with-conditions | No | same; do not rename-modify | verified-primary |
| `font-noto-sans-hebrew` | Noto Sans Hebrew | repo only | SIL OFL 1.1 | Yes-with-conditions | No | same | verified-primary |
| `font-noto-serif-hebrew` | Noto Serif Hebrew | repo only | SIL OFL 1.1 | Yes-with-conditions | No | same | verified-primary |
| `dejavu-outlines` | DejaVu Sans outlines | letter outline path data | Bitstream Vera licence; DejaVu changes public domain | Yes-with-conditions | No | Carry the Bitstream notice | partly-verified (upstream LICENSE header read; full Vera terms not read in full) |
| `tesseract-js` | tesseract.js and core 7.0.0 | in-browser OCR, shipped lazily | Apache-2.0 (licence files are in the repo) | Yes-with-conditions | No | Keep licence and notices | partly-verified (repo files read, upstream not re-fetched) |
| `tessdata-heb` | Tesseract Hebrew model | OCR language data | Apache-2.0 per repo README | Yes-with-conditions | No | Keep notice | unverified |
| `hebcal-fixtures` | Hebcal output snapshot | test fixtures; file is listed in `precache-manifest.js`, so it appears to ship | CC BY 4.0 (site-wide statement) | Yes-with-conditions | No | Credit Hebcal | partly-verified (site statement read; the fixture file's own source note repeats it) |
| `wikipedia-paraphrase` | Wikipedia articles on Hebrew traditions | paraphrased facts in `data/traditions` | CC BY-SA 4.0 | Yes-with-conditions | The repo treats the notes as adaptations offered under CC BY-SA as a precaution; whether bare facts need it is a legal question | Yes if treated as adaptation | partly-verified |
| `xkb-si1452` | xkeyboard-config il layout | keyboard layout data | X11-style permissive (repo note) | Yes-with-conditions | No | Keep notice | unverified |
| `generated-images` | image tools | illustrations (pipeline built, repo says none ingested for real yet) | tool terms; copyright in machine-made images uncertain | Unknown | No | Disclosure line recommended in the repo | unverified |
| `audio-voices` | recordings / synthetic speech | nothing today (0 of 16,290 clips exist per `docs/voices/coverage.md`) | n/a | n/a | n/a | n/a | not-present |
| `dicta-nakdan` | Dicta online vowel service | optional, off by default, sends text to a third party | no terms could be read (repo note) | Unknown | No | n/a | unverified |
| `project-original` | Project-written text and code | phrasebook, glosses, guides, code | owner's; none chosen | n/a | No | n/a | project-owned |
| `lessons-unstated-licence` | `data/curriculum/lessons.json` | 117 records merged into the vocabulary set | none stated | Unknown | They sit inside a CC BY-SA data set without a stated basis | n/a | unverified |
| `reference-only-sites` | Pealim, Chabad.org, BJPA | cited by URL only | not open | n/a | n/a | n/a | not-present |

## 3. Per-source notes

### wiktionary
Wiktionary says its original text is dual-licensed CC BY-SA 4.0 and GFDL. The CC BY-SA 4.0 legal code, as read today, has no non-commercial term. The word "original texts" in the Wiktionary statement leaves room for individual entries to contain third-party material; I did not check entries. Existing app credit text is in `src/vocab/vocab.view.js` and `data/vocab/attribution.json`.

### kaikki-wiktextract
kaikki.org states its data is under the same licences as Wiktionary. That is a statement by the host, consistent with the Wiktionary page.

### frequencywords-opensubtitles
The README names CC BY-SA 4.0 for content. What I could not check: the rights of whoever holds the underlying subtitle text in OpenSubtitles2018. A frequency count is derived data and may carry little of that, but that is a legal opinion I cannot give; it is on the lawyer list.

### tatoeba
The attribution duty is per sentence (author named). The repo keeps author names and sentence ids on each record. Not yet shown in the app according to `data/vocab/LICENSE-NOTES.md` ("suggested wording, not yet in the app"); I did not re-inspect the app code. Hebrew side is unpointed in Tatoeba.

### uxlc
Strongest source in the repo. Do not describe it as the WLC. The repo records a 2.6 file dated 19 Oct 2026.

### jps-1917
Sefaria's label is Public Domain and links to an Open Siddur page, which I did not open. The US rule for pre-1931 publications is confirmed by the Cornell guide; the position outside the US was not checked. Sefaria's digitised text may differ from the 1917 print in typography, which I did not examine.

### metsudah-siddur
Highest-risk source. 21 of 70 corpus records use it (about 30 percent), including the Kaddish, Modeh Ani, Adon Olam, Barchu and Lecha Dodi. Today's live Sefaria data confirms the CC-BY label and shows the National Library of Israel record as the source, which is a catalogue entry for a 1981 book, not a rights statement. If the product is sold, either obtain written confirmation from the rights holder or replace these 21 records (the repo audit already suggests a pre-1929 public-domain transcription).

### torat-emet-357
Sefaria shows Public Domain on the Siddur Sefard page and `unknown` on the Siddur Ashkenaz page for the same title. The source is a freeware download site; its terms were not read.

### edot-hamizrach-shaliehsaboo
Two Hebrew version rows exist: one CC0, one `unknown`. The CC0 row's source field points back to sefaria.org, so I cannot tell who made the transcription or on what basis they released it.

### sefaria-platform
Sefaria's terms of use were not read. Credit Sefaria as the source of retrieval, as the repo already does.

### fonts
All six families carry OFL 1.1 headers upstream (read today). OFL permits selling a package that includes the fonts and requires the copyright notice and licence to travel with them; texts are in `docs/licenses/OFL-*.txt` and `assets/fonts/*-OFL.txt`. Reserved Font Name: only Alef declares one, and the Alef font is not shipped on the web. DejaVu: the outlines are path data, not a font file; the Bitstream notice should still travel with `data/letters/letters.json`.

### tesseract
The vendored licence files are Apache-2.0 text. Apache-2.0 requires keeping the licence and notices when redistributing. The Hebrew model licence rests on the repo README only.

### hebcal-fixtures
Used by tests, but `data/calendar/hebcal-fixtures.json` is listed in `precache-manifest.js`, so it appears to be in the shipped bundle. Credit Hebcal in-app (or stop shipping the file). The file's own note says "Hebcal output is CC BY 4.0, credit Hebcal".

### wikipedia-paraphrase
The repo says no wording was copied. Copyright protects expression, not bare facts, but I cannot judge whether any note is close enough to count as an adaptation. The conservative course the repo took is to credit the four articles.

### xkb-si1452
Based on a repo note quoting the X11-style licence. Not checked today.

### generated-images
No repo statement says any real generated image has been ingested. Copyrightability of purely machine-made images, and the generating tool's terms, are open questions (the repo's `docs/images/RIGHTS.md` says the same and marks details unverified). If images ship, keep the disclosure line.

### audio-voices
`docs/voices/coverage.md` reports no audio files in the repo. Redistribution rights for synthetic speech were not found and a voice buyout contract is only a term sheet (`docs/voices/buyout-contract-terms.md`).

### dicta-nakdan
Optional and off by default per the deploy doc. Not content, but a third-party service with no readable terms.

### project-original
Phrasebook entries and lesson glosses state "original (project-owned)" but their pointing and glosses were written by an automated writing tool and are unreviewed. Whether purely machine-written text is protectable, and so whether it can be licensed or sold as exclusive, is a legal question (listed in the decisions file).

### lessons-unstated-licence
117 vocabulary records come from `data/curriculum/lessons.json`, which states no licence. They are bundled into the data set that is declared CC BY-SA. Decide: state a licence (the owner can release them under CC BY-SA 4.0 explicitly) or remove them.

### reference-only-sites
Linked, not copied (per the repo's own source notes). No attribution duty is created by a link.

## 4. Share-alike: what it covers and what is open

What the CC BY-SA 4.0 text says (read today): if you share adapted material, the licence on the adaptation must be BY-SA (same elements, this or a later version) or a BY-SA-compatible licence, and you may not apply effective technological measures that restrict the rights granted.

Applied here: `data/vocab/words.json`, `vocab5000.json`, `packs/`, `index.json` and the files derived from them are adaptations of Wiktionary and FrequencyWords. The repo's own conclusion (`docs/vocab/LICENSES.md`) is that this data set is distributed as a whole under CC BY-SA 4.0. I agree that is what the licence text points to for the data set itself.

Open, not settled by anything I read:
1. Whether the app code, the book, or a bundle that merges this data into one product becomes share-alike as a whole (aggregate versus adaptation). The repo says get a lawyer's opinion before selling a mixed bundle. None was obtained.
2. Whether app-store packaging or DRM counts as an "effective technological measure" that restricts the CC BY-SA rights. The clause exists in the text; its effect on store distribution is a legal question.
3. Whether CC BY 2.0 FR sentences (Tatoeba) can be combined into a CC BY-SA data set without a licence conflict. Both require credit; I verified neither combination rule.
4. Whether the 117 unlicensed lesson records and tool-written pointing can be placed under any licence.
5. Whether the dual GFDL licence adds duties if you rely on the CC BY-SA option only (Wiktionary offers both).

## 5. Sources deliberately not used (from the repo's own research; labels re-seen where noted)

NJPS and JPS 2023 (labelled CC-BY-NC or restricted), Koren, Contemporary Torah, Kehot, Fox, ArtScroll, Davka, Sefaria's Miqra according to the Masorah (CC-BY-SA, re-seen today), Open Siddur CC BY-SA pages, Wikibooks, FSI/DLI materials, TeachMeHebrew, Learn101, Book2, Loecsen, the UT Austin materials (non-commercial only), scraped vocabulary sets. `docs/resources/gratis-reuse-matrix.md` holds the per-site notes. A user-supplied top-625 sheet is used for counts only; its origin is unstated and no row is stored.
