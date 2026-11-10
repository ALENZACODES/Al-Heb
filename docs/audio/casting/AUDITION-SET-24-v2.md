# Blind audition set, 24 items (v2)

**Status:** DRAFT. This is a script for auditions. It says nothing about any audio existing, having been rendered, or having been reviewed.
**Supersedes:** `AUDITION-SET-24.md` kept in the sprint folder (v1). Targets unchanged: 4 letter/syllable + 8 vocab + 6 phrase + 6 prayer_line.

Identical for every candidate voice. Blind labels A to X are assigned at render time.

## Rules for reading this set

### Rule 1. The Divine Name
- Every Divine Name on the page is written exactly as the repo's own source string writes it: יְהוָה. v1 mixed two spellings (אֲדֹנָי in items 7, 13, 15, 17, 18; יְהוָה in 20, 21, 23, 24) and the אֲדֹנָי strings did not match the repo corpus text for those items. v2 uses one spelling only.
- Every voice reads each יְהוָה aloud as **Adonai** (a-do-NAI; tradition-appropriate stress). It is never spelled out letter by letter, never read as the four letters, and never replaced by "Hashem" or any other substitute.
- Item 7 in v1 was the isolated word אֲדֹנָי. It is removed from v2 so that no item carries the second spelling. Its slot now holds an ordinary word from the lesson data.
- A voice that reads יְהוָה any other way is logged in the Red flags log of `CASTING-REPORT.md` (Divine Name misread).

### Rule 2. Items 1 and 2 are letter NAMES
- In the repo's audio manifest, `shin` and `bet` are `kind: letter` and carry the pointed name spelling (שִׁין, בֵּית). The separate sound entries are `shin-sound` and `bet-sound` (ש, ב).
- So item 1 is read as the name of the letter, "shin" (rhymes with "seen"), and item 2 as the name "bet" (israeli: "beit"; ashkenazi tradition: the name as that tradition says it). Neither is read as the bare sound "sh" or "b".
- Items 3 and 4 are SOUNDS: the consonant plus vowel (ʃa, ʃi), read as one syllable with no letter name before it.
- Judges score items 1 and 2 on "name said clearly and cleanly", and items 3 and 4 on "syllable precision".

### Rule 3. No duplicates
- No two items share a source_id or a Hebrew string. Checked by script against the repo files named in the last column of the table below (every string was copied from the file, none typed).
- Items that open with the same blessing formula (18, 21, 23) are different lines and are kept; the shared opening is useful for comparing consistency across lines.

## The set

| # | kind | source_id | pointed Hebrew | read as |
|---|---|---|---|---|
| 1 | letter_or_syllable | `shin` | שִׁין | letter NAME ("shin") |
| 2 | letter_or_syllable | `bet` | בֵּית | letter NAME ("bet") |
| 3 | letter_or_syllable | `shin-a` | שַׁ | SOUND (sha) |
| 4 | letter_or_syllable | `shin-i` | שִׁ | SOUND (shi) |
| 5 | vocab | `shema-1-w1` | שְׁמַע |  |
| 6 | vocab | `shema-1-w2` | יִשְׂרָאֵל |  |
| 7 | vocab | `r18-w2` | גָּדוֹל |  |
| 8 | vocab | `shema-1-w4` | אֱלֹהֵינוּ |  |
| 9 | vocab | `r01-w1` | שָׁב |  |
| 10 | vocab | `r02-w1` | שַׁבָּת |  |
| 11 | vocab | `r02-w2` | בַּת |  |
| 12 | vocab | `r03-w1` | שָׁלוֹם |  |
| 13 | phrase | `mah-tovu-1` | מַה־טֹּבוּ אֹהָלֶיךָ יַעֲקֹב מִשְׁכְּנֹתֶיךָ יִשְׂרָאֵל׃ |  |
| 14 | phrase | `shema-2` | בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד׃ |  |
| 15 | phrase | `vahavta-1` | וְאָהַבְתָּ אֵת יְהוָה אֱלֹהֶיךָ בְּכָל־לְבָבְךָ וּבְכָל־נַפְשְׁךָ וּבְכָל־מְאֹדֶךָ׃ | "Adonai" for every יְהוָה |
| 16 | phrase | `oseh-shalom` | עֹשֶׂה שָׁלוֹם בִּמְרוֹמָיו הוּא יַעֲשֶׂה שָׁלוֹם עָלֵינוּ וְעַל כָּל יִשְׂרָאֵל וְאִמְרוּ אָמֵן׃ |  |
| 17 | phrase | `malchutcha` | מַלְכוּתְךָ מַלְכוּת כָּל־עֹלָמִים וּמֶמְשֶׁלְתְּךָ בְּכָל־דּוֹר וָדוֹר׃ |  |
| 18 | phrase | `hamotzi` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ׃ | "Adonai" for every יְהוָה |
| 19 | prayer_line | `prayers:modeh-ani-1` | מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה רַבָּה אֱמוּנָתֶךָ׃ |  |
| 20 | prayer_line | `prayers:shema-1` | שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד׃ | "Adonai" for every יְהוָה |
| 21 | prayer_line | `prayers:kiddush-wine-1` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם בּוֹרֵא פְּרִי הַגָּפֶן׃ | "Adonai" for every יְהוָה |
| 22 | prayer_line | `prayers:lecha-dodi-1` | לְכָה דוֹדִי לִקְרַאת כַּלָּה פְּנֵי שַׁבָּת נְקַבְּלָה׃ |  |
| 23 | prayer_line | `prayers:bless-formula-1` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם | "Adonai" for every יְהוָה |
| 24 | prayer_line | `prayers:bless-priestly-1` | יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ׃ | "Adonai" for every יְהוָה |

## Changes from v1

| v1 item | v1 problem | v2 item | Replacement source |
|---|---|---|---|
| 7 `shema-1-w3` אֲדֹנָי | second Divine Name spelling | 7 `r18-w2` גָּדוֹל | data/tts/soundwords.israeli.json |
| 13 `shema-1` | same line as 20 | 13 `mah-tovu-1` | data/corpus/registry.json |
| 15 `vahavta-1` | אֲדֹנָי did not match the repo string | 15 `vahavta-1` | same id, text now the registry string (יְהוָה) |
| 16 `modeh-ani-1` | same line as 19 | 16 `oseh-shalom` | data/corpus/registry.json, data/speak/prayers.json |
| 17 `bless-formula-1` | same line as 23 | 17 `malchutcha` | data/corpus/registry.json |
| 18 `hamotzi` | אֲדֹנָי did not match the repo string | 18 `hamotzi` | same id, text now the registry string (יְהוָה) |

Items 14, 19 to 22 and 24 are unchanged. Items 1 to 6 and 8 to 12 are unchanged.

Where each source lives:

- letter_or_syllable: data/audio/manifest.json (kind letter / syllable)
- vocab: data/tts/soundwords.israeli.json (items[].he)
- phrase: data/corpus/registry.json (entries[].he)
- prayer_line: data/speak/prayers.json, else data/corpus/registry.json (first line)

## Fresh 12-item re-audition set (for the top two per slot)

Used only in the re-audition step of `CASTING-REPORT.md` section 4. Rules 1 and 2 apply unchanged. This set shares no source_id and no Hebrew string with the 24 above (checked by script). Blind labels are re-drawn for the re-audition and are not reused from the first pass.

| # | kind | source_id | pointed Hebrew | read as |
|---|---|---|---|---|
| 1 | letter_or_syllable | `resh` | רֵישׁ | letter NAME ("resh") |
| 2 | letter_or_syllable | `lamed-a` | לַ | SOUND (la) |
| 3 | vocab | `r09-w1` | שִׁיר |  |
| 4 | vocab | `r12-w2` | שָׁנָה |  |
| 5 | vocab | `r14-w2` | בְּרֵאשִׁית |  |
| 6 | vocab | `r17-w2` | חָכָם |  |
| 7 | phrase | `ashrei-84-5` | אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ עוֹד יְהַלְלוּךָ סֶּלָה׃ |  |
| 8 | phrase | `ashrei-145-16` | פּוֹתֵחַ אֶת־יָדֶךָ וּמַשְׂבִּיעַ לְכָל־חַי רָצוֹן׃ |  |
| 9 | phrase | `bless-priestly-2` | יָאֵר יְהוָה פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ׃ | "Adonai" for every יְהוָה |
| 10 | prayer_line | `prayers:candle-shabbat` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל שַׁבָּת׃ | "Adonai" for every יְהוָה |
| 11 | prayer_line | `prayers:shehecheyanu` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם שֶׁהֶחֱיָינוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה׃ | "Adonai" for every יְהוָה |
| 12 | prayer_line | `prayers:torah-barchu` | בָּרְכוּ אֶת יְהוָה הַמְּבֹרָךְ׃ | "Adonai" for every יְהוָה |

Targets: 2 letter/syllable + 4 vocab + 3 phrase + 3 prayer_line. Items 10 and 11 start with the same blessing formula; item 12 and item 9 carry the Divine Name too, so Rule 1 is exercised in four of the twelve (9 to 12).

Not yet done: nothing in this file records a candidate, a recording or a score.
