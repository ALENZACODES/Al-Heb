# Practical Fixes, Round 1

Reply to `PRACTICAL-FAILS` (71 unique items, 81 failing occurrences). Lane C, 2026-11-10.

## Result

- **Keep source: 71 of 71.** Each item was re-read in its named source on `feature/lesson-integrity-2026-11-10` (phrasebook,
  lessons or dialogues). Each source still matches the Hebrew and gloss in the report. Each item's Hebrew was also compared with
  every vocabulary entry that has the same letters, to catch a pointing slip. None of the 71 has a pointing typo, and none was
  changed because of a failed transcript.
- **No new Hebrew, and no data pushed.** None of the 71 needs a data change on the branch where the Practical set lives. This reply is committed as `docs/review/PRACTICAL-FIXES-r1.md`. No item
  contains or voices the divine Name.
- **Two real errors on `main`, already fixed on the feature branch.** Lesson I-16 teaches מִטְעָן as "charger"; the vocab file
  glosses it "cargo, luggage". Lesson I-37 teaches קוֹרֵס, the present tense of קָרַס (collapse), as "course". The feature branch already has the right
  words, מַטְעֵן and קוּרְס, with matching exercises. The test failed them only on sound. Until that branch merges, the live app
  teaches the wrong words. This lane's branch does not copy the fix, because it depends on the feature branch's new
  `lesson-lexicon.json` and would only add a merge conflict.
- **Three optional changes for John or a teacher, not pushed:**
  - `i-11-w5`: maqaf (־) for the hyphen in רַב-קַו.
  - `directions-06` and `directions-07`: glosses "to the left" and "to the right", the English il11 and I-15 already use.
  - Each would also change derived files (clip text, vocab and manifest English), so it should go in with a rebuild, not on its
    own.

## Test Changes That Would Clear Items Without Touching the Curriculum

These are suggestions for `tools/curriculum/gcloud_practical_test.py`. They change only how the transcript is compared.

1. **Numerals.** Read digits in the transcript as Hebrew number words before scoring. That would clear `d-cafe-l5`, `d-taxi-l6`
   and `d-hotel-l6`.
2. **Word boundaries.** Also compare with spaces, maqaf and hyphen removed, and pass an item if that matches. That would clear
   `shop-04`, `shop-10`, `il24-w3` and `i-11-w5`, and probably `greetings-17`, `il13-w5`, `numbers-16` and `directions-11`.
3. **Letters that sound the same in Israeli speech.** Count א/ע/ה, ט/ת, כ/ק, ח/כ and ב/ו as a match. That would clear
   `il18-w4`, `i-21-w12`, `i-46-w10` and `small-talk-13`. Report these as passing on sound, not as checked.
4. **Numbers.** Score `numbers-0N` against the clip the page plays (`numbers-0N-m` or `-f`). The recogniser hears the counting
   form unless it is told which form to expect.

Everything else stays hidden in `failing_keys` until a person listens. The listen-checks are listed in the notes column.

## Every Item

| Unit / item | Hebrew | Gloss | Heard | Verdict | Note |
|---|---|---|---|---|---|
| `pu-fillers` / `fillers-22` | אֵיךְ אוֹמְרִים ... בְּעִבְרִית? | how do you say ... in Hebrew? | איך אומרים | Keep source | Fill-in template; the loop dropped the dots and the tail. Keep hidden until a person hears the clip. |
| `pu-numbers` / `numbers-01` | אֶחָד | one (1) | אחת | Keep source | The phrasebook row is the masculine number. The recogniser returns the counting form (אחת). The first-20 pages teach both forms with the separate clips `numbers-01-m` and `numbers-01-f`. |
| `pu-numbers` / `numbers-04` | אַרְבָּעָה | four (4) | ארבע | Keep source | As numbers-01: masculine row, recogniser returned the counting form. Clips `numbers-04-m` and `-f` exist. |
| `pu-numbers` / `numbers-07` | שִׁבְעָה | seven (7) | שבע | Keep source | As numbers-01. Clips `numbers-07-m` and `-f` exist. |
| `pu-numbers` / `numbers-09` | תִּשְׁעָה | nine (9) | תשע | Keep source | As numbers-01. Clips `numbers-09-m` and `-f` exist. |
| `pu-directions` / `directions-06` | שְׂמֹאלָה | left | שמאל | Keep source; optional gloss | Hebrew is right. Optional gloss change "left" → "to the left", the English il11 and I-15 already give for this same word. Not pushed, because the gloss is copied into the vocab, audio manifest and first-day files. |
| `pu-small-talk` / `small-talk-10` | אֲנִי צָמֵא | I'm thirsty | אני צמח | Keep source | Heard as צמח (plant): one final letter. The row is the man's form, as its note says. |
| `pu-home` / `i-44-w1` | שָׁבוּר | broken | שבוע | Keep source | Heard as שבוע (week). Listen-check the ר. |
| `pu-weather` / `i-24-w9` | לַח | humid | לך | Keep source | One-syllable word. Heard as לך. |
| `pu-health` / `il18-w4` | רוֹפֵא | doctor | רופה | Keep source | Silent final א heard as ה. Same sound. |
| `pu-bank` / `i-21-w12` | רִבִּית | interest | רביט | Keep source | Final ת heard as ט. Same sound. |
| `pu-cafe` / `il07-w2` | לֶחֶם | bread | לכם | Keep source |  |
| `pu-cafe` / `il07-w3` | גְּבִינָה | cheese | דינה | Keep source |  |
| `pu-cafe` / `il07-w6` | תֵּה | tea | תיי | Keep source |  |
| `pu-cafe` / `i-13-w13` | צִמְחוֹנִי | vegetarian (m) | סימפוני | Keep source | Heard as סימפוני. Listen-check the צ. |
| `pu-cafe` / `i-13-w14` | צִמְחוֹנִית | vegetarian (f) | סימפונית | Keep source | As i-13-w13. |
| `pu-restaurant` / `d-restaurant-l5` | וְלִשְׁתּוֹת? | And to drink? | רוצה לשתות | Keep source | The recogniser added a word (רוצה). The line is a fragment by design. |
| `pu-shop` / `shop-16` | פָּתוּחַ | open | בטוח | Keep source |  |
| `pu-shop` / `i-12-w8` | טָרִי | fresh | תגיד | Keep source | Recogniser returned an unrelated word. |
| `pu-transport` / `taxi-05` | לַמָּלוֹן | to the hotel | למה לא? | Keep source | לַמָּלוֹן heard as למה לא; the dagesh and vowels in the source are right. |
| `pu-transport` / `taxi-06` | לַכּוֹתֶל | to the Western Wall | הכותל | Keep source | Heard הַ for לַ (the Western Wall vs to the Western Wall). Listen-check the ל. |
| `pu-transport` / `i-11-w5` | רַב-קַו | Rav-Kav (the transit card) | רב קו | Keep source; optional maqaf | Recogniser split it on the hyphen. Optional for John or a teacher: Hebrew joins compounds with a maqaf (־), not a keyboard hyphen. lessons.json already uses the maqaf 34 times. Changing it also changes the clip text, so it is not pushed. |
| `pu-transport` / `i-11-w9` | יוֹרֵד | getting off (m) | ילד | Keep source |  |
| `pu-small-talk` / `i-25-w10` | עִבְרִית | Hebrew | הבית | Keep source | Heard as הבית. |
| `pu-small-talk` / `i-36-w6` | מַעֲסִיק | employer | מסיק | Keep source |  |
| `pu-small-talk` / `i-36-w7` | רֵאָיוֹן | interview | רעיון | Keep source |  |
| `pu-family` / `i-42-w6` | מוֹרָה | teacher (f) | מועד | Keep source |  |
| `pu-home` / `i-44-w10` | דָּחוּף | urgent | הפחד | Keep source |  |
| `pu-home` / `i-44-w12` | תּוֹר | appointment, turn | תו | Keep source | One-syllable word. Same word as i-20-w5 and i-22-w8. |
| `pu-weather` / `i-24-w11` | חֹרֶף | winter | חובב | Keep source |  |
| `pu-phone` / `il22-w1` | הַלּוֹ | hello (on the phone) | שלום | Keep source | The recogniser swapped in a synonym (שלום for הַלּוֹ). The clip is probably fine. |
| `pu-phone` / `i-16-w8` | מַטְעֵן | charger (for a phone or battery) | מתן | Keep source (feature branch) | **Correct on the feature branch only.** `main` and this lane's branch still teach מִטְעָן (which the vocab file glosses "cargo, luggage") as "charger". `feature/lesson-integrity-2026-11-10` already fixed it to מַטְעֵן. Keep the feature-branch source and merge it. |
| `pu-phone` / `i-16-w12` | הַלּוֹ? | hello? (on the phone) | שלום | Keep source | As il22-w1: synonym swap. |
| `pu-apartment` / `i-17-w4` | קוֹמָה | story, floor | כמו | Keep source |  |
| `pu-apartment` / `i-17-w14` | אוֹר | light | לא | Keep source | One-syllable word. |
| `pu-driving` / `i-39-w3` | תַּמְרוּר | road sign | תמוז | Keep source |  |
| `pu-work` / `i-37-w9` | קוּרְס | a course (a class) | כוס | Keep source (feature branch) | **Correct on the feature branch only.** `main` teaches קוֹרֵס as "course" and links it to the vocab entry קָרַס (collapse); קוֹרֵס is "collapses", not "course". `feature/lesson-integrity-2026-11-10` already has קוּרְס, with matching I-37 exercises. Keep the feature-branch source and merge it. |
| `pu-health` / `i-20-w3` | רוֹפְאָה | doctor (f) | הופעה | Keep source |  |
| `pu-health` / `i-20-w5` | תּוֹר | appointment, turn | טוב | Keep source | Same word as i-44-w12. |
| `pu-bank` / `i-21-w13` | פָּתוּחַ | open | בטוח | Keep source |  |
| `pu-bank` / `i-48-w5` | כְּתֹבֶת | address | כובת | Keep source |  |
| `pu-post` / `i-22-w8` | תּוֹר | appointment, turn | תו | Keep source | Same word as i-44-w12. |
| `pu-post` / `i-22-w10` | כְּתֹבֶת | address | כובד | Keep source |  |
| `pu-post` / `i-22-w11` | מַעֲטָפָה | envelope | מה אתה פה | Keep source |  |
| `pu-delivery` / `i-45-w5` | כְּתֹבֶת | address | כובד | Keep source |  |
| `pu-delivery` / `i-45-w6` | קוֹמָה | story, floor | כמו | Keep source |  |
| `pu-social` / `i-49-w3` | פְּרוֹפִיל | profile | פיל | Keep source |  |
| `pu-news` / `i-47-w7` | רִבִּית | interest | רבי | Keep source |  |
| `pu-news` / `i-47-w11` | אֵין | there isn't | ן | Keep source | The recogniser returned one letter: the clip may be clipped at the start. Listen-check the audio file, not the Hebrew. |
| `pu-shabbat` / `i-19-w7` | יַיִן | wine | ניין | Keep source |  |
| `pu-introducing` / `il03-w3` | מַה שְׁמֵךְ | what is your name (to a woman) | מה שלמך | Keep source | Heard שלמך for שמך, one extra letter. Close to מַה שְׁלוֹמֵךְ; a reviewer should confirm the clip says שְׁמֵךְ. |
| `pu-cafe` / `cafe-21` | טָעִים מְאֹד | very tasty | נעים מאוד | Keep source | ט heard as נ (נעים). Listen-check: the clip must say ta'im, not na'im. |
| `pu-shop` / `shop-04` | זֶה זוֹל | it's cheap | זלזול | Keep source | Two words run together (זלזול). Only the word boundary differs. |
| `pu-shop` / `shop-10` | מָה הַמִּדָּה? | what size? | מהמידה | Keep source | Two words run together. Only the word boundary differs. |
| `pu-shop` / `shop-11` | יֵשׁ מִדָּה גְּדוֹלָה יוֹתֵר? | is there a bigger size? | יש מידג גדול יותר | Keep source | Heard גדול for גדולה. Listen-check the final vowel; the source agreement (מִדָּה גְּדוֹלָה) is right. |
| `pu-transport` / `d-taxi-l3` | עִם מוֹנֶה, בְּבַקָּשָׁה. | With the meter, please. | אמא הנה בבקשה | Keep source | Listen-check: heard as אמא הנה. |
| `pu-small-talk` / `small-talk-13` | קַר לִי | I'm cold | קרא לי | Keep source | קַר heard as קרא (same sound). |
| `pu-hotel` / `d-hotel-l6` | מִשֶּׁבַע עַד עֶשֶׂר. | From seven to ten. | משבע עד 10 | Keep source | Heard "10" for עֶשֶׂר. The meaning matches; the test failed only because a numeral was compared with a word. |
| `pu-emergencies` / `i-46-w10` | אָבַד לִי | I lost | עבד לי | Keep source | א heard as ע, which sound the same in Israeli speech. |
| `pu-decide` / `il24-w3` | בּוֹא נַחֲלִיט | let's decide | בואנה חלית | Keep source | Word boundary only (בואנה חלית). |
| `pu-shabbat` / `i-19-w11` | טָעִים מְאֹד | very tasty | נעים מאוד | Keep source | As cafe-21. |
| `pu-greetings` / `greetings-17` | לֹא רַע | not bad | לאגה | Keep source | Two short words run together. |
| `pu-numbers` / `numbers-16` | מָה הַשָּׁעָה? | what time is it? | מהרע | Keep source | Two short words run together. |
| `pu-cafe` / `cafe-08` | תֵּה עִם נַעֲנָע | tea with mint | תאמנו | Keep source | Listen-check. |
| `pu-cafe` / `cafe-22` | אֲנִי צִמְחוֹנִי | I'm vegetarian | אני צריך מונית | Keep source | Heard as צריך מונית. Listen-check; the row is the man's form, as its note says. |
| `pu-cafe` / `d-cafe-l5` | אַרְבָּעִים וּשְׁמוֹנָה שְׁקָלִים. | Forty-eight shekels. | 48 שקלים | Keep source | Heard "48". The meaning matches; the test failed only because a numeral was compared with words. |
| `pu-shop` / `shop-05` | יֵשׁ הַנָּחָה? | is there a discount? | יש לנו חג | Keep source | Listen-check. |
| `pu-directions` / `directions-11` | עַל יַד | next to | היד | Keep source | Two short words run together. |
| `pu-transport` / `d-taxi-l6` | בְּעֵרֶךְ עֶשְׂרִים דַּקּוֹת. | About twenty minutes. | בערך 20 דקות | Keep source | Heard "20". The meaning matches; the test failed only because a numeral was compared with words. |
| `pu-small-talk` / `il13-w5` | לֹא רַע | not bad | לאה | Keep source | As greetings-17. |
| `pu-family` / `i-42-w11` | בֶּן כַּמָּה? | how old (lit. son of how much)? | ממך | Keep source | Pointing checked in lane C round 1 (בֶּן כַּמָּה?). |
