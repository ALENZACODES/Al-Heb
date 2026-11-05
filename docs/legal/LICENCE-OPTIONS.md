# Licence options for ALEF (code, content, images, audio)

**Not legal advice. No lawyer has reviewed this. No licence is chosen here: that is John's decision (see `DECISIONS-FOR-JOHN.md`).** This file compares choices for each asset class, given these goals: ALEF is free to learners now and may be sold (the app, access to it, or the company) later.

Source facts: `data/legal/attributions.json` (28 entries, generated 2026-11-04) and `CONTENT-LICENCE-AUDIT.md`, both read for this file. Descriptions of what each general licence does (MIT, Apache-2.0, CC family, OFL) are general background, not re-verified from the licence texts today, except where the audit says it read them.

## 1. What "sale-clear" needs

1. You must have the right to relicense or exclusively sell what you ship, or the buyer must accept the inbound licences as they are.
2. Nothing shipped should carry a non-commercial (NC) term.
3. Share-alike (SA) terms do not forbid selling, but they bind how the covered data is redistributed and they reduce exclusivity.
4. Every attribution duty must be met in the product (credits screen, licence texts shipped).

## 2. Code (`src/`, `tools/`, `sw.js`, tests)

| Option | Effect on later sale | Notes |
|---|---|---|
| Proprietary, all rights reserved, plus a written end-user licence | Keeps exclusivity; simplest for a buyer's due diligence | Status quo (README says "not chosen yet"). Needs a `LICENSE` file stating it. Third-party notices still must ship (Apache-2.0 OCR runtime, OFL fonts). |
| MIT | Released copies cannot be recalled; anyone may fork and sell | Lowest friction; buyer pays for brand, users, future work |
| Apache-2.0 | Same irrevocability, plus an express patent grant and notice duties | Already in the dependency mix (OCR runtime), so no new licence family |
| Copyleft (GPL/AGPL) | Forks must stay open; hard to sell exclusively; may clash with app-store terms | Not recommended for a possible sale; lawyer question if considered |

Open for a lawyer: ownership/copyright position of code and text drafted with an automated writing tool (not researched). Proprietary now and open later is the reversible path; the reverse is limited to future versions (general observation, unverified).

## 3. Content: curriculum, lessons, vocabulary, readings

Split by origin, because the licence differs by row.

| Part | Today | Options |
|---|---|---|
| Project-written curriculum text, lesson text, phrasebook | `project-original`: owner's, none chosen; pointing and glosses unreviewed by a Hebrew educator | Proprietary, or CC BY 4.0 / CC BY-NC-SA only if you want to give it away (NC-SA would itself block a sale of that part; do not pick NC for anything you may sell) |
| Vocabulary data (`data/vocab/*`, about 6,033 of 6,303 records) | Adaptation of Wiktionary and FrequencyWords, both CC BY-SA 4.0 | Cannot be closed. Either ship it as a separate CC BY-SA 4.0 data set (A), replace it with original or permissive data (B), or keep it only in a free layer and sell only what you wrote (C). See `DECISIONS-FOR-JOHN.md` section 2. |
| Example sentences | Tatoeba, CC BY 2.0 FR, per-sentence author credit | Keep authors with each example; interaction with the SA set is a lawyer question |
| Hebrew Tanakh text | UXLC: "viewed or copied without restriction" | Safe for sale; do not call it the WLC |
| English scripture | JPS 1917, public domain by US age label | US age rule read; non-US not checked |
| Prayer texts (42 records from 3 Sefaria-hosted versions) | Labels CC-BY, Public Domain, CC0; labels disagree between rows for two of them | Unverified rights; see lawyer list |

## 4. Images

| Option | Notes |
|---|---|
| Commission an illustrator with a written assignment (or exclusive licence) | Clearest for a sale; you can then pick any licence for the pictures |
| Machine-made images | Per `docs/images/RIGHTS.md` and the attribution entry `generated-images`: output ownership depends on the generating tool's terms (not verified), and copyright in purely machine-made images is uncertain, so exclusivity may not exist. Keep provenance records and a disclosure line. |
| Free licences (CC BY, CC0) for any images you want to give away | CC BY needs credit; CC0 does not; avoid NC and SA images in a product you may sell |
| Photos in `assets/images/` (about 219 MB, not shipped) | Provenance not covered by the attribution list; settle before any ship |

## 5. Audio

Audio: 87 synthetic word clips from an outside generator are in the repo as of 2026-11-05 (`audio-voices`: unverified, licence "unknown: not cleared"); nothing recorded by a person ships.

| Option | Notes |
|---|---|
| Human voices under a signed total buyout (term sheet: `docs/voices/buyout-contract-terms.md`) | Cleanest for a sale; the sheet excludes cloning and AI training unless priced separately; needs counsel in the talent's jurisdiction |
| Synthetic speech | Obtain the provider's redistribution and commercial terms in writing first (not found) |
| Donated recordings | Use a signed rights grant (`docs/voices/donor-rights-grant.md`); a lawyer should confirm it is enough for a sale |

## 6. Third-party data and software: what blocks or limits sale

Reading `commercialUse` and `shareAlike` from `data/legal/attributions.json`. No entry in the file has a non-commercial licence. Nothing there outright forbids selling. What limits sale:

**Share-alike (binds redistribution of the data, reduces exclusivity)**

| id | Source | Licence | Status |
|---|---|---|---|
| wiktionary | Wiktionary | CC BY-SA 4.0 (and GFDL) | verified-primary |
| kaikki-wiktextract | kaikki.org extract | CC BY-SA and GFDL | verified-primary |
| frequencywords-opensubtitles | FrequencyWords (from OpenSubtitles) | CC BY-SA 4.0 content, MIT code; subtitle corpus rights unchecked | partly-verified |
| wikipedia-paraphrase | Wikipedia (paraphrased tradition notes) | CC BY-SA 4.0 | partly-verified |

**Rights unknown (`commercialUse: unknown`; treat as blocking a sale until resolved)**

| id | Source | Why unknown |
|---|---|---|
| metsudah-siddur | Metsudah siddur 1981 via Sefaria | CC-BY is Sefaria's label; whether Sefaria could grant it for a 1981 print is unconfirmed (21 records) |
| torat-emet-357 | Torat Emet 357 via Sefaria | Public Domain on one page, unknown on another (6 records) |
| edot-hamizrach-shaliehsaboo | Siddur Edot HaMizrach via Sefaria | CC0 on one row, unknown on another; provenance unclear (15 records) |
| sefaria-platform | Sefaria terms | Not read |
| generated-images | image tools | Terms and copyrightability uncertain |
| dicta-nakdan | Dicta online vowel service | No terms read; off by default, blocked by the site CSP |
| lessons-unstated-licence | `data/curriculum/lessons.json` (117 vocab records) | No licence stated anywhere |

**Yes-with-conditions (credit and notices only; no SA, no NC)**: tatoeba (CC BY 2.0 FR, per-sentence credit), hebcal-fixtures (CC BY 4.0; file appears to ship), the six font families (SIL OFL 1.1; keep notices; Alef has a Reserved Font Name and is not shipped), dejavu-outlines (Bitstream notice), tesseract-js and tessdata-heb (Apache-2.0; heb model status unverified), xkb-si1452 (permissive per a repo note, unverified).

**Clear for sale**: uxlc (verified-primary), jps-1917 (US age label; partly-verified).

**Not applicable / not present**: audio-voices, reference-only-sites (links only), project-original (owned, subject to the open questions above).

## 7. Items to put in front of a lawyer

1. Does CC BY-SA on the vocabulary data reach the app, the book, or a bundle containing it, or only the data set? (audit section 4, item 1)
2. Do app-store packaging or DRM breach the CC BY-SA "no effective technological measures" clause?
3. Can Tatoeba (CC BY 2.0 FR) sentences sit inside a CC BY-SA set?
4. Does relying on CC BY-SA while Wiktionary also offers GFDL add duties?
5. The three Sefaria-hosted prayer sources: confirm upstream rights in writing or replace (Metsudah is the highest risk).
6. The 117 lesson records with no licence: state one or remove.
7. Ownership and protectability of code and text drafted with an automated writing tool; protectability of machine-made images.
8. OpenSubtitles rights behind the FrequencyWords counts.
9. Name and trademark clearance for "ALEF" (not researched).
10. Contract wording for voice buyouts (Israel and publisher's jurisdiction).

## 8. Consequence summary (neutral)

- A fully closed, exclusive sale of the whole bundle is not available while the Wiktionary-derived data and Wikipedia-derived notes are inside it.
- Selling the app with those parts kept under their own CC BY-SA terms looks permitted by the licence text read in the audit, subject to item 1 and 2 above.
- The cheapest way to widen options is to decide content approach A, B or C and to resolve the unknown-rights rows in section 6 before launch.
