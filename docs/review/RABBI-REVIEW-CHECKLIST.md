# Rabbi and cantor review checklist

A clergy person (or a Hebrew educator working with one) can use this list to walk the curriculum. Nothing on this list has been signed off. Every `prayer-meta` entry still has `clergyReviewed: false`. `proofread` is false on the intermediate lessons and on the 5,000-word list.

Date of this checklist: 10 November 2026, America/Toronto.

## How to use it

Work in this order. For each item, mark **yes / no / needs a decision**. If no, write the line id or lesson id and the wording you would prefer. Do not expect the app to change the divine Name, the default rite, or the "goy" cards until John picks an option on the decision sheet in `docs/review/JOHN-DECISIONS.md`.

## A. The Name

- [ ] The Tetragrammaton is written in the corpus in the Leningrad pointed form (`יְהוָה`). Siddur sources that printed a holam on the first he were normalised to that form (see `src/corpus/normalize.js`). Is that the form you want learners to *see*?
- [ ] Lessons and speech rules tell the learner to *say* "Adonai" (or "Hashem" in some notes). Is the spoken instruction right for this product?
- [ ] `r34` shows the unpointed spellings `יהוה` and `אדני` as a reading skill. Is that lesson placed late enough, and is the framing respectful?
- [ ] Does any exercise ask the learner to *write* or *assemble* the four letters in a way you would not want done casually on a phone?

## B. Rite (nusach)

- [ ] The corpus is mixed: Metsudah Ashkenaz, Torat Emet Sefard, Edot HaMizrach (Shaliehsaboo), and UXLC for verses. Each registry record names its `nusach` or its Tanakh source. Is mixed-and-labelled acceptable for launch?
- [ ] Festival evening Kiddush is the **weekday (non-Shabbat)** Sefard form, with parenthetical Shabbat words dropped. When a festival falls on Friday night the Shabbat words are said; that combined form is not a separate record. Is the note on those records enough?
- [ ] The Shavuot Kiddush insert keeps two source-print oddities from Torat Emet (`תּוֹרָתֵינוּ`, `הַשָׁבוּעוֹת` without dagesh) and names them in the registry notes. Would you rather we print the standard book form?
- [ ] Havdalah, Hanukkah, and the Friday-night Shabbat Kiddush come from more than one book. Spot-check `kiddush-shabbat-eve`, `havdalah-hamavdil`, `hanukkah-candle` against the siddur you use.

## C. Blessings and service order

- [ ] Shema, Baruch shem, V'ahavta (`I-01`, `r22`, `r36`, `r37`).
- [ ] Amidah: openings and selected closings only. Middle blessings and the festival Amidah (Yaaleh v'Yavo) are gaps.
- [ ] Torah service in order (`I-03`, `I-26`), including the aliyah blessings.
- [ ] Friday-night Kiddush (`I-05`) and Shabbat-day Kiddush (`I-35`).
- [ ] Havdalah (`I-06`).
- [ ] Hallel (`I-07`): selected refrain verses only, not the complete Psalms 113–118. Does the lesson say that clearly enough?
- [ ] Pesach festival Kiddush (`I-29`): wine, Shehecheyanu, Pesach insert, close ending "who makes Israel and the seasons holy" — not the Shabbat close.
- [ ] Sukkot (`I-30`): leshev basukkah; no lulav blessing yet (no pointed source in the corpus).
- [ ] Hanukkah (`I-32`), Purim (`I-31`), Yom Kippur lines and greetings (`I-28`, `I-50`).
- [ ] Birkat Hamazon: openings and zimun only (`I-33`).

## D. Words, greetings, and tone

- [ ] Yom Kippur greeting is `גְּמַר חֲתִימָה טוֹבָה`, not only `שָׁנָה טוֹבָה`.
- [ ] Pesach greeting `חַג כָּשֵׁר וְשָׂמֵחַ` is taught; generic `חַג שָׂמֵחַ` is also taught. Missing specific greetings are listed in the `I-50` note and in `INTERMEDIATE.md`.
- [ ] Psalm 117 in `I-07` has `כָּל־גּוֹיִם`, glossed as "all nations". Is that framing right? (Vocab cards for `גּוֹי` / `גּוֹיָה` are a separate John decision.)
- [ ] Army slang (`I-18`), dating (`I-38`), and news (`I-47`): any line a rabbi would not want in a product that also teaches the siddur?
- [ ] Gendered forms: take-care in `I-50` is labelled for a man and a woman. Spot other second-person forms for missing feminines.

## E. Accuracy of Hebrew

- [ ] Nikkud on lesson headwords matches a standard book (spot `מַפָּה`, `מַטְעֵן`, `קוּרְס`, which were corrected on this branch).
- [ ] UXLC Exodus 20:8 prints `הַשַׁבָּת` (shin without dagesh) in the Decalogue; Exodus 31 in V'shamru has the dagesh. This is source-faithful, not a typo. Confirm you are comfortable showing both.
- [ ] English glosses on liturgical lines are original project glosses, not a published translation (except UXLC verses, which use JPS 1917). Read them as "sense for a learner", not as a siddur translation you would publish under your name.

## F. Honesty about gaps

- [ ] Lessons that sit on a thin topic still name the corpus gap (`g-hallel`, `g-festival-kiddush`, and others in `data/corpus/gaps.json`). No lesson should imply that a stand-in prayer is the missing text.
- [ ] Licences: Metsudah is labelled CC-BY only by Sefaria (unverified); Torat Emet is labelled Public Domain only by Sefaria (unverified, and the project already notes a conflicting "all rights reserved" footer on the source site). Are you willing to ship with those labels as the docs state them?

## Sign-off (leave blank until a review happens)

- Reviewer name and role:
- Date:
- Siddur and Tanakh used for comparison:
- Result: approve for launch / approve with comments / hold
