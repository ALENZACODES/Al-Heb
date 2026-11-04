# Re-sourcing the Metsudah corpus records

Written by `tools/corpus/resource_metsudah.mjs` on 2026-11-04. Re-run the tool to regenerate; `--revert` restores the Metsudah text from the snapshot history. Nothing in this file is legal advice; nothing here has been read by a lawyer or proofread by a Hebrew educator.

## 1. What the licence sources actually say (read 2026-11-04)

| Source | URL | What it says |
|---|---|---|
| Sefaria version metadata for "The Metsudah siddur, 1981" (v3 texts API) | https://www.sefaria.org/api/v3/texts/Siddur%20Ashkenaz%2C%20Weekday%2C%20Shacharit%2C%20Preparatory%20Prayers%2C%20Modeh%20Ani?version=hebrew%7CThe%20Metsudah%20siddur%2C%201981 | `license: "CC-BY"`, `versionSource: https://www.nli.org.il/he/books/NNL_ALEPH002211687`, `versionNotes: ""`, `status: "locked"`, `digitizedBySefaria: ""`. No licence text, no statement of who granted CC-BY. |
| Sefaria versions index for Siddur Ashkenaz | https://www.sefaria.org/api/texts/versions/Siddur_Ashkenaz | Hebrew versions and labels: "The Metsudah siddur, 1981" CC-BY; "The Metsudah siddur: a new linear siddur ... 1981" CC-BY; "Torat Emet 357" **unknown** (on this index; it is "Public Domain" on Siddur Sefard and Siddur Edot HaMizrach); "Daat Siddur Ashkenaz" Public Domain; "Siddur Veshinantam" unknown; "Wikipedia" unknown. |
| Sefaria developer page "Copyright and Data Use" | https://developers.sefaria.org/docs/usage-of-our-name-and-logo | "Each version of a text has its own license." "Texts in the public domain can be reused without restriction." "Texts with a Creative Commons license may carry requirements to give attribution, share derived work, or limit usage in commercial contexts." "Texts with no noted license have not yet had their copyright status verified by Sefaria." |
| Sefaria help article on licensing | https://help.sefaria.org/hc/en-us/articles/18490043237148-How-to-Find-and-Understand-Licensing-or-Copyright-Information | "Texts in the public domain can be reused without restriction." "Texts with a Creative Commons license may carry requirements to give attribution." Does not say who assigns a label or that Sefaria guarantees it. |
| Sefaria sheet "Can I reuse a text I found on Sefaria for my project?" | https://prod.sefaria.org.il/sheets/228381 | "Texts with a CC BY license must be attributed to the publisher." "Sefaria has not verified the copyright status of a text (when no licence or Public Domain notice appears)." |
| Sefaria terms of use | https://www.sefaria.org/terms | Rendered client-side; the fetch returned navigation only, no terms text. Not read. |
| National Library of Israel record Sefaria links as the Metsudah source | https://www.nli.org.il/en/books/NNL_ALEPH990003580480205171/NLI | The Metsudah siddur: a new linear siddur with English translation and anthology of the classic commentaries; Davis, Avrohom Yosef; [Metsudah Publications]; [New York?]; 1983, c1982; "It may be prohibited to copy and use of the item for purposes of reproduction, publication" |
| Torat Emet freeware home page (source named by Sefaria for "Torat Emet 357") | http://www.toratemetfreeware.com/ | Home page footer reads "כל הזכויות שמורות ©" (all rights reserved). No licence text for the siddur data was found on the page; the "Public Domain" label is Sefaria's. |

**Reading of the above.** The CC-BY label on the Metsudah text is Sefaria's own metadata; no licence text from Metsudah Publications was found, and the NLI catalogue record Sefaria cites carries a copying warning. Sefaria's own documentation says CC-BY texts "must be attributed to the publisher" and may carry conditions, and that unlabelled texts are unverified. The replacement labels used below ("Public Domain" for Torat Emet 357, "CC0" for the Shaliehsaboo edition) are **also Sefaria's labels and are not independently verified**; the Torat Emet site itself shows an all-rights-reserved footer. What this swap achieves is narrower than "licence-clear": it removes the identifiable 1981 publisher from the chain for 11 records and puts them on the same (unverified) footing as the 21 Torat Emet / Shaliehsaboo records the corpus already used. Open Siddur and Hebrew Wikisource were tried as public-domain alternatives and did not yield usable text (section 4).

## 2. Records re-sourced

11 of 21 Metsudah records now cite another Sefaria version. Status is `verified` for each: the stored text equals `applyTransforms(rawLines, transforms)` on the fetched lines (checked by `tests/corpus.hebrew.test.js` and `tests/corpus.resource.test.js`). Every consonant is identical to the Metsudah text; the table lists every word whose marks or punctuation differ.

| id | new source (Sefaria page, 0-based paragraph) | version / label | words changed | punctuation only | transforms |
|---|---|---|---|---|---|
| `shema-2` | Siddur Sefard, Shabbat Eve Mincha, Mincha [27] | Torat Emet 357 / Public Domain | 0 | 0 | `{}` |
| `torah-barchu` | Siddur Edot HaMizrach, Weekday Shacharit, Torah Reading [11, 12] | Shaliehsaboo Edition / CC0 | 0 | 0 | `{"dropSmall":true}` |
| `torah-bless-2` | Siddur Sefard, Shabbat Morning Services, Blessings on Torah Reading [6] | Torat Emet 357 / Public Domain | 0 | 0 | `{}` |
| `adon-olam-1` | Siddur Sefard, Musaf [152] | Torat Emet 357 / Public Domain | 2 | 0 | `{}` |
| `lecha-hashem` | Siddur Sefard, Shabbat Morning Services, Shabbat Torah Reading [20] | Torat Emet 357 / Public Domain | 0 | 1 | `{"dropSmall":true}` |
| `vezot-hatorah` | Siddur Sefard, Rosh Chodesh, Torah Reading [27] | Torat Emet 357 / Public Domain | 0 | 1 | `{}` |
| `etz-chaim` | Siddur Sefard, Rosh Chodesh, Torah Reading [28] | Torat Emet 357 / Public Domain | 1 | 0 | `{"clip":{"startAt":"עץ","endAfter":"ויאדיר"}}` |
| `avot-closing` | Siddur Sefard, Shabbat Morning Services, Amidah [3] | Torat Emet 357 / Public Domain | 0 | 1 | `{}` |
| `amidah-yihyu` | Siddur Sefard, Various Prayers & Segulot, Prayer of the Shelah [12] | Torat Emet 357 / Public Domain | 0 | 0 | `{}` |
| `oseh-shalom` | Siddur Sefard, Shabbat Eve Mincha, Amidah [73] | Torat Emet 357 / Public Domain | 0 | 1 | `{"dropParen":true}` |
| `kiddush-shabbat-eve` | Siddur Sefard, Shabbat Evening Meal, Shabbat Eve Kiddush [7] | Torat Emet 357 / Public Domain | 0 | 1 | `{}` |

### 2.1 Every difference, character by character (old = Metsudah text, new = replacement)

#### `shema-2`
No difference: the normalised replacement equals the Metsudah text exactly.

#### `torah-barchu`
No difference: the normalised replacement equals the Metsudah text exactly.

#### `torah-bless-2`
No difference: the normalised replacement equals the Metsudah text exactly.

#### `adon-olam-1`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 47 | גּוֹאֲלִי | גוֹאֲלִי | U+05D2 U+05BC U+05D5 U+05B9 U+05D0 U+05B2 U+05DC U+05B4 U+05D9 | U+05D2 U+05D5 U+05B9 U+05D0 U+05B2 U+05DC U+05B4 U+05D9 | old has dagesh/mappiq |
| 64 | אִישַׁן | אִישָׁן | U+05D0 U+05B4 U+05D9 U+05E9 U+05B7 U+05C1 U+05DF | U+05D0 U+05B4 U+05D9 U+05E9 U+05B8 U+05C1 U+05DF | old has patach; new has qamats |

#### `lecha-hashem`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 11 | וּבָאָרֶץ | וּבָאָרֶץ׃ | U+05D5 U+05BC U+05D1 U+05B8 U+05D0 U+05B8 U+05E8 U+05B6 U+05E5 | U+05D5 U+05BC U+05D1 U+05B8 U+05D0 U+05B8 U+05E8 U+05B6 U+05E5 | sof pasuq only |

#### `vezot-hatorah`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 8 | יִשְׂרָאֵל | יִשְׂרָאֵל׃ | U+05D9 U+05B4 U+05E9 U+05B0 U+05C2 U+05E8 U+05B8 U+05D0 U+05B5 U+05DC | U+05D9 U+05B4 U+05E9 U+05B0 U+05C2 U+05E8 U+05B8 U+05D0 U+05B5 U+05DC | sof pasuq only |

#### `etz-chaim`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 9 | דַּרְכֵי | דַרְכֵי | U+05D3 U+05B7 U+05BC U+05E8 U+05B0 U+05DB U+05B5 U+05D9 | U+05D3 U+05B7 U+05E8 U+05B0 U+05DB U+05B5 U+05D9 | old has dagesh/mappiq |

#### `avot-closing`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 4 | וּמָגֵן׃ | וּמָגֵן | U+05D5 U+05BC U+05DE U+05B8 U+05D2 U+05B5 U+05DF | U+05D5 U+05BC U+05DE U+05B8 U+05D2 U+05B5 U+05DF | sof pasuq only |

#### `amidah-yihyu`
No difference: the normalised replacement equals the Metsudah text exactly.

#### `oseh-shalom`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 9 | כָּל־יִשְׂרָאֵל | כָּל יִשְׂרָאֵל | U+05DB U+05B8 U+05BC U+05DC U+05BE U+05D9 U+05B4 U+05E9 U+05B0 U+05C2 U+05E8 U+05B8 U+05D0 U+05B5 U+05DC | U+05DB U+05B8 U+05BC U+05DC U+0020 U+05D9 U+05B4 U+05E9 U+05B0 U+05C2 U+05E8 U+05B8 U+05D0 U+05B5 U+05DC | maqaf join only (changes the reader word ids after it) |

#### `kiddush-shabbat-eve`
| word # | old | new | old code points | new code points | kind |
|---|---|---|---|---|---|
| 40 | הִנְחַלְתָּנוּ | הִנְחַלְתָּנוּ׃ | U+05D4 U+05B4 U+05E0 U+05B0 U+05D7 U+05B7 U+05DC U+05B0 U+05EA U+05B8 U+05BC U+05E0 U+05D5 U+05BC | U+05D4 U+05B4 U+05E0 U+05B0 U+05D7 U+05B7 U+05DC U+05B0 U+05EA U+05B8 U+05BC U+05E0 U+05D5 U+05BC | sof pasuq only |

## 3. Records that stay on the Metsudah text

| id | status | what was tried |
|---|---|---|
| `modeh-ani-1` | CC-BY, verified | Siddur Edot HaMizrach, Preparatory Prayers, Modeh Ani (Shaliehsaboo CC0 and Torat Emet 357 "Public Domain", line 3) has the same words, but prints שֶהֶחֱזַרְתָּ with no shin dot and בְחֶמְלָה without dagesh. A shin with no dot fails the quality gate. |
| `vayehi-binsoa` | CC-BY, transcribed-needs-check | The only consonant-identical match (Torat Emet 357, "Siddur Sefard, Shabbat Mincha, Korbanot" line 22) is on a page that carries the Metsudah typographic fingerprint (124 U+0592 sheva-na markers, 24 U+05BA holam haser), so it is the same digitisation under another label. Rejected. Numbers 10:35 and Isaiah 2:3 could come from UXLC, but the closing line "Baruch shenatan" is not biblical, so the record could not be rebuilt from one clean source. |
| `hagomel` | CC-BY, verified | Same situation: the only match is "Siddur Sefard, Shabbat Mincha, Korbanot" (Metsudah fingerprint page). Rejected. |
| `kaddish-1` | CC-BY, verified | Torat Emet 357 Sefard pages (Kabbalat Shabbat line 41 and others) differ in wording: they add וְיַצְמַח פֻּרְקָנֵהּ וִיקָרֵב מְשִׁיחֵהּ and spell דְּקֻדְשָׁא / וְנֶחֱמָתָא differently; the Edot HaMizrach Kaddish differs more. Not a full match of the Ashkenaz wording. |
| `brich-shmei` | CC-BY, verified | Torat Emet 357 "Siddur Sefard, Rosh Chodesh, Torah Reading" line 3 differs in wording (בְּטִיבוּתָא for בְּטִיבוּ, וּמִקַּמָּא for וּמִקַּמֵּי, closing אָמֵן) and vowels (לֹא for לָא, בֶּאֱלָהָא for בֵּאלָהָא, לְטַב for לְטָב). Not a full match. |
| `amidah-elohai-netzor` | CC-BY, verified | No consonant-identical run on any Torat Emet 357 or Shaliehsaboo page (the Sefard pages spell נְצֹר without vav and continue with different wording). |
| `sim-shalom` | CC-BY, verified | Torat Emet 357 Sefard Amidah pages have the Sefard wording (adds חַיִּים, יִהְיֶה, לְבָרְכֵנוּ וּלְבָרֵךְ אֶת כָּל, בְּרֹב עֹז וְשָׁלוֹם); Edot HaMizrach differs more. Not a full match. |
| `lecha-dodi-1` | CC-BY, verified | Torat Emet 357 "Siddur Sefard, Kabbalat Shabbat" lines 16-18 spells הַמְּיֻחָד without vav (consonants differ) and prints ולִתְהִלָּה with no vowel on the vav. Not a full match. |
| `yigdal` | CC-BY, transcribed-needs-check | Edot HaMizrach pages (Shaliehsaboo CC0, Torat Emet 357) have the Sephardi wording (בְּקַדְמוּתוֹ, חָסִיד, יָמִין, and a fourteenth line). No Sefard page has Yigdal in a non-Metsudah version. Not a full match. |
| `zimun-opening` | CC-BY, verified | Torat Emet 357 "Siddur Sefard, Birchat HaMazon, Birchat HaMazon" prints the invitation inside a Yiddish rubric ("רַבּוֹתַי. מִיר וֶועלֶן בֶּענְטְשְׁן (או רַבּוֹתַי נְבָרֵךְ)") and a longer response; no clean two-line match. |

## 4. Sources tried and not used

- **Sefaria, same pages (Siddur Ashkenaz)**: every one of the 17 Metsudah pages was re-fetched with `version=hebrew|all`; the only Hebrew version on each is Metsudah (one page also has "Shema with Cantillation", label unknown). Daat Siddur Ashkenaz (label Public Domain) does not cover these pages and was already rejected for defective pointing.
- **Sefaria, Siddur Sefard and Siddur Edot HaMizrach**: all 343 pages were fetched and searched for consonant-identical runs of each record. Hits are listed above. One page, "Siddur Sefard, Shabbat Mincha, Korbanot", is labelled Torat Emet 357 / Public Domain but carries 124 U+0592 sheva-na markers and 24 U+05BA holam haser, the typographic fingerprint of the Metsudah digitisation; it was excluded as not a distinct source. Likewise "Siddur Sefard, Shabbat Day Meal, Zemirot" (26 U+0592).
- **Open Siddur Project** (opensiddur.org): https://opensiddur.org/shared/prayers/solilunar/everyday/kaddish and https://opensiddur.org/tagged/kaddish-yatom returned a Cloudflare JavaScript challenge / HTTP 403 to a plain fetch on 2026-11-04. No text could be read, so no per-text licence could be checked. Not used.
- **Hebrew Wikisource** (he.wikisource.org): the page קדיש יתום was fetched as raw wikitext (`index.php?title=קדיש_יתום&action=raw`). It is a multi-rite template composition (`{{נוסחי תפילה}}`, transcluding `{{:חצי קדיש}}`), names no source edition, carries no public-domain template, and contains at least one defective word (עָלֵינו with no vowel on the vav). The site default licence is CC BY-SA, which this project does not accept (share-alike). The API rate-limited further page fetches (HTTP 429). Not used.
- **tanach.us (UXLC)** was not used for the biblical verses embedded in `vayehi-binsoa`, `lecha-hashem`, `vezot-hatorah`, `etz-chaim` and `amidah-yihyu`: siddur spelling differs from the Leningrad ketiv in several words (for example וְגוֹאֲלִי / וְגֹאֲלִי), so a UXLC text would not be a consonant-identical replacement, and the non-biblical lines in the same records would still need a siddur source.

## 5. Method

1. Fetch the candidate page; select the version by exact `versionTitle` and `license`; refuse pages with the Metsudah fingerprint.
2. Copy the chosen paragraphs verbatim into `data/corpus/source-snapshot.json` (`rawLines`; for `adon-olam-1` the single source paragraph is split at its own colons into ten raw lines, recorded in `splitFrom`). The Metsudah item moves to `history[0]` with the text it produced (`metsudahHe`).
3. Normalise with `applyTransforms` (src/corpus/normalize.js), the same pipeline every other record uses. Transforms used: `dropSmall` (rubrics in `<small>`), `dropParen` (Ten-Days-of-Repentance variant), `clip` (etz-chaim starts at עץ and ends after ויאדיר on a longer paragraph). No `corrections`: the two records that previously needed a holam added by hand (`vezot-hatorah`, `etz-chaim`) no longer do, which is why their status moves from `transcribed-needs-check` to `verified`.
4. Gate: identical folded consonant skeleton; no hard issue from `checkHebrew`; a vowel on every word; a dot on every shin.
5. `tests/corpus.resource.test.js` checks the licence set, the snapshot evidence and that each re-sourced text replays from its raw lines.

Known limitation: `src/corpus/tools/build-registry.mjs` does not know about these swaps; if it is re-run it will rebuild the 11 records from the Metsudah history item, and this tool must then be run again (it is idempotent).
