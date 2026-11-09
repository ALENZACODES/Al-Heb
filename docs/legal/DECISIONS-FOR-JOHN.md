# Decisions for John: licensing and selling Aleph

**Not legal advice.** I am not a lawyer and nothing here has been reviewed by one. This lists choices only you can make, what each one changes if you later sell the app or the company, and a checklist to finish before charging money. Facts come from `docs/legal/CONTENT-LICENCE-AUDIT.md` (read that for what was and was not verified on 2026-11-04). Where I could not verify something, I say so.

Current state: no code licence file exists, and the README and the About screen say all rights are reserved until one is added.

## 1. Licence for the code

You own the code only to the extent you wrote it. Some code and text in this repo was drafted by an automated writing tool; whether and how that is protected by copyright, and who owns it, is a question for a lawyer (I did not research it).

| Option | What it means | If you sell the app or the business |
|---|---|---|
| **Proprietary (all rights reserved), with a written licence to users** | Nobody may copy or reuse the code without your permission. This is the status quo. | A buyer gets a clean right to the code you own, and you keep control of who may fork it. The code stays separable from the CC BY-SA data (see section 2), which a lawyer should confirm. Cost: no open-source goodwill; third-party notices (fonts, OCR runtime) still need to ship. |
| **MIT** | Anyone may use, copy, modify, sell, including inside closed products, if they keep the notice. | Released copies cannot be taken back; anyone can fork the released code and compete. You can usually still change the licence on future versions if you own all contributions, but not retract what is out. A buyer pays for brand, content, users and future work, not exclusivity over past code. |
| **Apache-2.0** | Like MIT, plus an explicit patent grant and a notice/changes requirement. | Same irrevocability for released copies as MIT. The patent clause and notice file are slightly heavier. The vendored OCR runtime is already Apache-2.0, so no new licence family is introduced. |

What I would put in front of a lawyer: whether to keep the code proprietary now and open it later (easy) versus open it now and close it later (limited to future versions). That is a general observation, not a verified legal conclusion. If you choose proprietary, add a `LICENSE` file stating it, and update the README/About line that says "not chosen yet".

Decision needed: ______ (proprietary / MIT / Apache-2.0).

## 2. Licence for the content

### What is forced on you today
- The vocabulary data set (`data/vocab/*`, 6,033 of 6,303 records) is an adaptation of Wiktionary and FrequencyWords. The CC BY-SA 4.0 text (read 2026-11-04) requires that adaptations you share carry CC BY-SA 4.0 or a compatible licence, with attribution and a statement of changes. Selling is not forbidden by that text (I found no non-commercial term), but you cannot close that data set. Practical effect: someone else may legally copy your vocabulary list and examples, with credit, and sell their own product.
- Open question for a lawyer: whether the app code or a combined bundle becomes share-alike as a whole, whether app-store protections clash with the licence's "no technological measures that restrict the rights" clause, and how Tatoeba (CC BY 2.0 FR) sentences sit inside the CC BY-SA set.

### Options
| Option | Consequence if you sell |
|---|---|
| **A. Keep the Wiktionary-derived vocabulary and ship it as a separately licensed CC BY-SA 4.0 data set** (code and original lessons licensed separately) | Cheapest. Buyer inherits a share-alike data set and the attribution duties. Value of the vocabulary list as an exclusive asset is low, because anyone can reuse it. Needs the lawyer's view on separation. |
| **B. Replace the vocabulary data with content you wrote or that is permissive (public domain, CC0, CC BY)** | Removes share-alike from the vocabulary. Costly: 6,027 records, plus pointing and glosses need review anyway. Frequency ranks from FrequencyWords would also need replacing, and the rights position of the OpenSubtitles-derived counts is unchecked. |
| **C. Keep share-alike data only in a free tier or a downloadable pack, and sell only what you wrote** | Keeps the paid layer clean; needs a clear technical and written boundary. |

### Other content choices
- **Metsudah-sourced prayers (21 of 70 corpus records).** The CC-BY label is Sefaria's; the National Library of Israel record Sefaria links to is a catalogue entry. Options: get written confirmation from Metsudah Publications, or replace those 21 records with a pre-1929 public-domain transcription, or drop them from the paid product. Do not rely on the label for a sale.
- **Torat Emet 357 and Shaliehsaboo (CC0) prayers (6 and 15 records).** Sefaria labels disagree between its own pages (Torat Emet: Public Domain on one page, unknown on another; Shaliehsaboo: CC0 on one version row, unknown on another). Treat as unverified until the upstream owner is identified.
- **117 lesson-derived vocabulary records with no stated licence.** Either release them explicitly under CC BY-SA 4.0 or remove them.
- **tool-written pointing and glosses (phrasebook, lessons, glosses).** Unreviewed by a Hebrew educator, and the legal status of machine-written text is unsettled. Have both a native reviewer and a lawyer look at it before you state ownership to a buyer.
- **machine-generated illustrations.** If any ship, check the generating tool's terms and keep the disclosure line. The repo says no real generated image has been ingested yet.
- **Audio.** None exists today. If you add recordings, get a signed buyout (term sheet drafted in `docs/voices/buyout-contract-terms.md`); if you add synthetic speech, get the provider's redistribution terms in writing.

Decision needed: A / B / C, and for each flagged prayer source: confirm, replace, or drop.

## 3. Checklist before charging money

Do each item; tick when done. None of these has been done by me except where stated.

1. [ ] Hire a lawyer (Ontario/Canada, ideally with open-content and software licensing experience) and give them `CONTENT-LICENCE-AUDIT.md`, this file and `attributions.json`. Ask the questions in audit section 4 and the lawyer list in `data/vocab/LICENSE-NOTES.md`.
2. [ ] Choose and add a code `LICENSE` file (section 1). Update the "not chosen yet" lines in `README.md` and the About screen.
3. [ ] Decide content approach A, B or C (section 2) and write it down in one page.
4. [ ] Resolve the Metsudah question (confirm in writing, replace, or drop).
5. [ ] Resolve the 117 unlicensed lesson records.
6. [ ] Identify upstream owners for Torat Emet 357 and the Shaliehsaboo edition, or replace them; read Sefaria's terms of use (not read in this audit).
7. [ ] Show the full attribution list in the app, built from `data/legal/attributions.json` (about 28 rows; the About screen already has a credits section that needs reconciling with this list). Per-sentence Tatoeba author credit must appear with each example. Hebcal credit is needed because its fixture file appears to ship.
8. [ ] Ship licence texts and notices: OFL texts with the fonts, Apache-2.0 notices for the OCR runtime, the Bitstream notice with the letter outlines, a link to CC BY-SA 4.0, and the changes statement.
9. [ ] Re-read each licence page yourself on the day you launch (labels change; this audit is dated 2026-11-04).
10. [ ] Have a Hebrew educator and clergy review the Hebrew, pointing and prayer text. The repo says none has been reviewed.
11. [ ] Check app-store rules against the CC BY-SA no-additional-restrictions clause (lawyer question).
12. [ ] Confirm trademark and name clearance for "Aleph" in the jurisdictions and stores you will use (not researched here).
13. [ ] Terms of service, privacy policy and (if you collect payment) consumer and tax rules for Canada and any store country. Not covered here.
14. [ ] Check how copyright ownership of tool-assisted code and text is documented, so a buyer's due-diligence questions can be answered.
15. [ ] Keep an evidence folder: dated copies of each licence page and the fetch dates (the repo already keeps `data/vocab/sources.lock.json` hashes).
16. [ ] Re-run `node --test tests/legal.test.js` after any new source is added, so the attribution list stays complete.

## 4. What I could not do
I could not obtain a lawyer's opinion, read Sefaria's terms, open the Open Siddur or toratemetfreeware pages, confirm the Metsudah rights holder's position, test each Tatoeba sentence's individual licence, or check OpenSubtitles. Those rows are marked partly-verified or unverified in the audit.
