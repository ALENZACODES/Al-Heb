# Tradition styles test (Israeli, Sephardi, Ashkenazi)

**Date:** 10 November 2026, America/Toronto (ET)  
**Lane:** overnight ALEF lesson-integrity  
**Sample:** 50 items with on-disk clips in all three traditions (male voice).  
**Spend cap:** US$5  
**Spend so far:** $0.2047  
**Lane C plan:** `lanes/replies/STYLES-G-r1.md` landed overnight; the playback and spelling-flag fixes from that verdict are in `eefe184b7`.

Nothing here was merged to `main` or deployed. The divine Name was not sent to TTS or STT. The full audio tree was not checked out; clips were read in place from `/workspace/Al-Heb-overnight/audio`.

## How to read this

John asked whether the three tradition styles are actually different and accurate. Lane C is being asked the same question separately. This file is the Google Cloud / rule-check pass, not a rabbi review.

Israeli and Sephardi Latin letters stay identical in the current engine (`src/pronunciation/transliterate.js`) unless John turns on the held flags. Their differences are meant to show up in IPA, vowel wording, and in the audio files. Ashkenazi Latin uses **s** for a tav without dagesh and **o** for kamatz gadol, where Israeli and Sephardi use **t** and **a** (for example Shabbat vs Shabbos). Sephardi ḥ/ʿ for ח and ע, and doubled letters such as Shabbos, are built behind `STYLE_FLAGS.sephardiPharyngeals` and `STYLE_FLAGS.geminateDisplay`, default off; this lane did not turn them on.

## File identity (the clips themselves)

50 of 50 items have three pairwise-different mp3s. 0 items have the same bytes in every tradition.

- Israeli file equals Sephardi file: 0/50
- Israeli file equals Ashkenazi file: 0/50
- Sephardi file equals Ashkenazi file: 0/50

These files exist in the manifests and on disk. After `eefe184b7`, each congregation setting prefers its own bank file. The Israeli file is only used when the own-tradition row is missing or unplayable (for example a `:mock` source). Device TTS is still refused as an Ashkenazi stand-in.

## Transliteration rule check

The engine probes pass: tav without dagesh is `ta` / `ta` / `sa`; kamatz gadol on bet is `ba` / `ba` / `bo`.
Default Latin (geminate off, the app default) for שַׁבָּת is `shabat` / `shabat` / `shabos`. With `geminate: true` it is `shabbat` / `shabbat` / `shabbos`. The tav/sav and kamatz a/o contrast is present in both; the familiar double-b spelling is only used when gemination is on, which the app does not turn on today.

Of the 50 sample items, 0 have an item-level Latin fail (Israeli vs Sephardi should match; Ashkenazi should differ when the word has an undageshed tav or a kamatz gadol).

## Settings switch (audio and on-screen Latin)

Checked 20 of the sample items through `createAudio` with the real manifests.

- On-screen Latin changes when switching to Ashkenazi: 20/20 (expected whenever the word has tav-without-dagesh or kamatz gadol).
- Audio *file path* changes with the setting: 20/20.
- All three settings resolve to an `/israeli/` path: 0/20.

`PLAYBACK_TRADITION` is `{'israeli': 'israeli', 'sephardi': 'sephardi', 'ashkenazi': 'ashkenazi'}` (identity map: each setting prefers its own bank). Admitted accent provenance labels in the live manifests: 0 — labels are separate from whether a present bank file is played.

**Playback audio now changes with the style setting** when that tradition has a present bank file. Sephardi and Ashkenazi routes use their own recorded or paid-cloud mp3s from the shared audio bank. Letters, vowels, and some prayer rows that are still missing in those banks fall back to the Israeli file. Held for John: Sephardi ḥ/ʿ spelling and doubled-letter display; both flags stay off.

## Speech-to-text of the on-disk tradition clips

Transcription is Vertex `gemini-3.5-flash` on the existing tradition mp3s (Google Cloud Chirp / Speech-to-Text v2 is not callable with the API keys we have). A style is marked unintelligible when letter-level WER is above 0.35 after nikkud is stripped.

| Style | STT match | Pass rate | Unintelligible |
|---|---:|---:|---:|
| israeli | 43/50 | 86% | 5 |
| sephardi | 15/50 | 30% | 30 |
| ashkenazi | 7/50 | 14% | 41 |


## Listen-check: is the low Sephardi / Ashkenazi pass rate real?

The first STT pass used an **“Israeli Hebrew speech”** prompt on every clip, then scored the transcript against the standard Hebrew spelling. That is biased against Ashkenazi *sav* / *komets* (for example `candle-shabbat-w14` Ashkenazi transcribes as שבוס, i.e. “shabbos”, and fails a letter-for-letter match to שבת). It can also hurt long, slow Sephardi files.

This lane then:

1. Re-scored the first-pass transcripts offline, folding common Ashkenazi phonetic spellings (ס for undageshed ת, extra ו for kamatz *o*). That rescued **only 1** extra Ashkenazi item (7/50 → 8/50). Sephardi was unchanged (15/50).
2. Re-ran Vertex `gemini-3.5-flash` with a **tradition-aware** prompt: transcribe Sephardi or Ashkenazi speech into *standard* Hebrew spelling (write שבת even if you hear shabbos). Spend on this pass: US$0.0831.
3. Measured durations with `ffprobe` and compared each clip to its Israeli counterpart.
4. Tempo-capped **copies** of clips over the agreed rates (Sephardi 1.33×, Ashkenazi 1.15× the Israeli duration) in `/tmp/tradition-tempo-cap`. Those copies were re-transcribed with the same aware prompt. **The shared audio bank was not overwritten**, because capping almost never turned a fail into a pass.

| Style | First pass (Israeli prompt) | Offline phonetic fold | Tradition-aware prompt | Combined (any pass) | Tempo-capped copies (only over-cap clips) |
|---|---:|---:|---:|---:|---:|
| israeli | 43/50 (86%) | 43/50 | 4/7 of the first-pass fails | **47/50** | — |
| sephardi | 15/50 (30%) | 15/50 | 18/50 (36%) | **21/50** | 5/46, **0 gained** vs a prior pass |
| ashkenazi | 7/50 (14%) | 8/50 | 14/50 (28%) | **17/50** | 3/18, **1 gained** vs a prior pass |

Israeli is mostly fine. Sephardi and Ashkenazi improve with a fairer prompt, but stay well below Israeli. The remaining misses are not mainly a scoring trick.

### Durations (male voice, 50 items)

| Style | Median duration vs Israeli | Mean | Max | Over the agreed cap |
|---|---:|---:|---:|---:|
| sephardi (cap 1.33×) | 1.71× | 1.79× | 2.62× | **46/50** |
| ashkenazi (cap 1.15×) | 1.08× | 1.13× | 1.67× | **18/50** |

Sephardi bank clips are systematically slow. That is a real production issue for learners, even though speeding copies up to 1.33× did not fix STT. Ashkenazi is closer to the Israeli length; a minority are over 1.15×.

### What the remaining fails look like

- **Accent-correct but hard to score.** Short Ashkenazi words can be right in the ear (*shabbos* → שבוס) and still fail a naive letter match. Keep those clips. Use a tradition-aware transcriber, or a phonetic fold, when judging them.
- **Wrong or unintelligible long lines.** On several prayer lines the aware transcript is a *different* liturgy: Maoz Tzur coming back as a Mi Sheberach or a “what do we ask of heaven” speech; Lecha Dodi as Psalm 144 (“לדוד ברוך ה' צורי”); Kaddish as Yizkor (“יזכור אלהים את נשמת אבי מורי”). Israeli of the same lines transcribes correctly. These need a human listen and, if the file is the wrong text or mush, a remake from the pointed source / a checked respelling. Do not invent Hebrew. Do not voice the divine Name.
- **Tempo alone is not the fix.** 64 over-cap copies were sped to the agreed caps and re-heard. Sephardi gained 0 passes; Ashkenazi gained 1. So this lane did **not** write tempo-capped files back over the bank.

Suggested next step (for lane C / a later render, still under the $5 tradition cap leftover of about US$4.80): remake the unintelligible long-line fails, not a blanket 1.33/1.15 rewrite of clips that already transcribe well. A bank-wide Sephardi tempo cap may still be worth it for *listening comfort*, as a separate, reviewed pass.

Tradition-styles Cloud spend across the first pass, the aware pass, and the tempo experiment: **US$0.2047 of US$5**.


## Sample

Buckets in the sample: {'word': 20, 'phrase': 15, 'prayer-line': 15}. Prayer-*kind* rows have no Sephardi or Ashkenazi files (those rows are `missing` and alias or stand in); liturgical *lines* (Kiddush, Shema, Priestly Blessing, and similar) are the prayer-line bucket.

| id | kind | bucket | Hebrew | contrasting features | files distinct |
|---|---|---|---|---|---|
| `candle-shabbat-w14` | word | word | שַׁבָּת׃ | tav sav, kamatz | yes |
| `candle-shabbat-w2` | word | word | אַתָּה | tav sav, kamatz | yes |
| `candle-shabbat-w9` | word | word | בְּמִצְוֹתָיו | tav sav, kamatz | yes |
| `kiddush-gen-2-1-3-w26` | word | word | שָׁבַת | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w2` | word | word | אַתָּה | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w23` | word | word | תְּחִלָּה | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w31` | word | word | בָחַרְתָּ | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w32` | word | word | וְאוֹתָנוּ | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w33` | word | word | קִדַּשְׁתָּ | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w40` | word | word | הִנְחַלְתָּנוּ׃ | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w42` | word | word | אַתָּה | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w45` | word | word | הַשַּׁבָּת׃ | tav sav, kamatz | yes |
| `kiddush-shabbat-eve-w9` | word | word | בְּמִצְוֹתָיו | tav sav, kamatz | yes |
| `kiddush-veshamru-w20` | word | word | אֶת־הַשָּׁמַיִם | tav sav, kamatz | yes |
| `kiddush-veshamru-w21` | word | word | וְאֶת־הָאָרֶץ | tav sav, kamatz | yes |
| `kiddush-veshamru-w24` | word | word | שָׁבַת | tav sav, kamatz | yes |
| `kiddush-veshamru-w3` | word | word | אֶת־הַשַּׁבָּת | tav sav, kamatz | yes |
| `kiddush-veshamru-w5` | word | word | אֶת־הַשַּׁבָּת | tav sav, kamatz | yes |
| `kiddush-veshamru-w6` | word | word | לְדֹרֹתָם | tav sav, kamatz | yes |
| `kiddush-wine-1-w2` | word | word | אַתָּה | tav sav, kamatz | yes |
| `brich-shmei` | line | phrase | בְּרִיךְ שְׁמֵהּ דְּמָרֵא עָלְמָא בְּרִיךְ כִּתְרָךְ וְאַתְרָךְ יְהֵא רְעוּתָךְ עִם עַמָּךְ יִשְׂרָאֵל לְעָלַם וּפֻרְקַן יְמִינָךְ אַחֲזֵי לְעַמָּךְ בְּבֵית מַקְדְּשָׁךְ וּלְאַמְטוּיֵי לָנָא מִטּוּב נְהוֹרָךְ וּלְקַבֵּל צְלוֹתָנָא בְּרַחֲמִין יְהֵא רַעֲוָא קֳדָמָךְ דְּתוֹרִיךְ לָן חַיִּין בְּטִיבוּ וְלֶהֱוֵי אֲנָא פְקִידָא בְּגוֹ צַדִּיקַיָּא לְמִרְחַם עָלַי וּלְמִנְטַר יָתִי וְיַת־כָּל־דִּי־לִי וְדִי־לְעַמָּךְ יִשְׂרָאֵל אַנְתְּ הוּא זָן לְכֹלָּא וּמְפַרְנֵס לְכֹלָּא אַנְתְּ הוּא שַׁלִּיט עַל־כֹּלָּא אַנְתְּ הוּא דְּשַׁלִּיט עַל־מַלְכַיָּא וּמַלְכוּתָא דִּילָךְ הִיא אֲנָא עַבְדָּא דְקֻדְשָׁא בְּרִיךְ הוּא דְּסָגִידְנָא קַמֵּהּ וּמִקַּמֵּי דִּיקַר אוֹרַיְתֵהּ בְּכָל־עִדָּן וְעִדָּן לָא עַל־אֱנָשׁ רָחִיצְנָא וְלָא עַל־בַּר־אֱלָהִין סָמִיכְנָא אֶלָּא בֵּאלָהָא דִשְׁמַיָּא דְּהוּא אֱלָהָא קְשׁוֹט וְאוֹרַיְתֵהּ קְשׁוֹט וּנְבִיאוֹהִי קְשׁוֹט וּמַסְגֵּא לְמֶעְבַּד טָבְוָן וּקְשׁוֹט בֵּהּ אֲנָא רָחִיץ וְלִשְׁמֵהּ קַדִּישָׁא יַקִּירָא אֲנָא אֵמַר תֻּשְׁבְּחָן יְהֵא רַעֲוָא קֳדָמָךְ דְּתִפְתַּח לִבָּאי בְּאוֹרַיְתָא וְתַשְׁלִים מִשְׁאֲלִין דְּלִבָּאי וְלִבָּא דְכָל־עַמָּךְ יִשְׂרָאֵל לְטָב וּלְחַיִּין וְלִשְׁלָם׃ | tav sav, kamatz | yes |
| `hanerot-halalu` | line | phrase | הַנֵּרוֹת הַלָּלוּ אֲנַחְנוּ מַדְלִיקִין עַל הַנִּסִּים וְעַל הַתְּשׁוּעוֹת וְעַל הַנִּפְלָאוֹת שֶׁעָשִׂיתָ לַאֲבוֹתֵינוּ עַל יְדֵי כֹּהֲנֶיךָ הַקְּדוֹשִׁים וְכָל־שְׁמוֹנַת יְמֵי חֲנֻכָּה הַנֵּרוֹת הַלָּלוּ קֹדֶשׁ וְאֵין לָנוּ רְשׁוּת לְהִשְׁתַּמֵּשׁ בָּהֶם אֶלָּא לִרְאוֹתָם בִּלְבָד כְּדֵי לְהוֹדוֹת לִשְׁמֶךָ עַל נִסֶּיךָ נִפְלְאוֹתֶיךָ וִישׁוּעוֹתֶיךָ׃ | tav sav, kamatz | yes |
| `lecha-dodi-1-l1` | line | phrase | לְכָה דוֹדִי לִקְרַאת כַּלָּה פְּנֵי שַׁבָּת נְקַבְּלָה׃ | tav sav, kamatz | yes |
| `mah-tovu-1` | line | phrase | מַה־טֹּבוּ אֹהָלֶיךָ יַעֲקֹב מִשְׁכְּנֹתֶיךָ יִשְׂרָאֵל׃ | tav sav, kamatz | yes |
| `malchutcha` | line | phrase | מַלְכוּתְךָ מַלְכוּת כָּל־עֹלָמִים וּמֶמְשֶׁלְתְּךָ בְּכָל־דּוֹר וָדוֹר׃ | tav sav, kamatz | yes |
| `maoz-tzur-1` | line | phrase | מָעוֹז צוּר יְשׁוּעָתִי לְךָ נָאֶה לְשַׁבֵּחַ תִּכּוֹן בֵּית תְּפִלָּתִי וְשָׁם תּוֹדָה נְזַבֵּחַ לְעֵת תָּכִין מַטְבֵּחַ מִצָּר הַמְנַבֵּחַ אָז אֶגְמוֹר בְּשִׁיר מִזְמוֹר חֲנֻכַּת הַמִּזְבֵּחַ׃ | tav sav, kamatz | yes |
| `mi-sheberach-opening` | line | phrase | מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב | tav sav, kamatz | yes |
| `shir-hamaalot-l6` | line | phrase | הָלוֹךְ יֵלֵךְ וּבָכֹה נֹשֵׂא מֶשֶׁךְ־הַזָּרַע בֹּא־יָבוֹא בְרִנָּה נֹשֵׂא אֲלֻמֹּתָיו׃ | tav sav, kamatz | yes |
| `vahavta-2-l2` | line | phrase | וְשִׁנַּנְתָּם לְבָנֶיךָ וְדִבַּרְתָּ בָּם בְּשִׁבְתְּךָ בְּבֵיתֶךָ וּבְלֶכְתְּךָ בַדֶּרֶךְ וּבְשָׁכְבְּךָ וּבְקוּמֶךָ׃ | tav sav, kamatz | yes |
| `vahavta-full-l3` | line | phrase | וְשִׁנַּנְתָּם לְבָנֶיךָ וְדִבַּרְתָּ בָּם בְּשִׁבְתְּךָ בְּבֵיתֶךָ וּבְלֶכְתְּךָ בַדֶּרֶךְ וּבְשָׁכְבְּךָ וּבְקוּמֶךָ׃ | tav sav, kamatz | yes |
| `vahavta-full-l4` | line | phrase | וּקְשַׁרְתָּם לְאוֹת עַל־יָדֶךָ וְהָיוּ לְטֹטָפֹת בֵּין עֵינֶיךָ׃ | tav sav, kamatz | yes |
| `vahavta-full-l5` | line | phrase | וּכְתַבְתָּם עַל־מְזוּזֹת בֵּיתֶךָ וּבִשְׁעָרֶיךָ׃ | tav sav, kamatz | yes |
| `yigdal-l10` | line | phrase | צוֹפֶה וְיוֹדֵעַ סְתָרֵינוּ מַבִּיט לְסוֹף דָּבָר בְּקַדְמָתוֹ׃ | tav sav, kamatz | yes |
| `yigdal-l11` | line | phrase | גּוֹמֵל לְאִישׁ חֶסֶד כְּמִפְעָלוֹ נוֹתֵן לְרָשָׁע רָע כְּרִשְׁעָתוֹ׃ | tav sav, kamatz | yes |
| `yigdal-l12` | line | phrase | יִשְׁלַח לְקֵץ הַיָּמִין מְשִׁיחֵנוּ לִפְדּוֹת מְחַכֵּי קֵץ יְשׁוּעָתוֹ׃ | tav sav, kamatz | yes |
| `kiddush-veshamru-l1` | line | prayer-line | וְשָׁמְרוּ בְנֵי־יִשְׂרָאֵל אֶת־הַשַּׁבָּת לַעֲשׂוֹת אֶת־הַשַּׁבָּת לְדֹרֹתָם בְּרִית עוֹלָם׃ | tav sav, kamatz | yes |
| `kiddush-zachor-l1` | line | prayer-line | זָכוֹר אֶת־יוֹם הַשַׁבָּת לְקַדְּשׁוֹ | tav sav, kamatz | yes |
| `kiddush-zachor-l2` | line | prayer-line | שֵׁשֶׁת יָמִים תַּעֲבֹד וְעָשִׂיתָ כָּל־מְלַאכְתֶּךָ | tav sav, kamatz | yes |
| `kiddush-gen-2-1-3-l1` | line | prayer-line | וַיְכֻלּוּ הַשָּׁמַיִם וְהָאָרֶץ וְכָל־צְבָאָם׃ | kamatz | yes |
| `adon-olam-1-l2` | line | prayer-line | לְעֵת נַעֲשָׂה בְחֶפְצוֹ כֹּל אֲזַי מֶלֶךְ שְׁמוֹ נִקְרָא׃ | tav sav, kamatz | yes |
| `adon-olam-1-l3` | line | prayer-line | וְאַחֲרֵי כִּכְלוֹת הַכֹּל לְבַדּוֹ יִמְלֹךְ נוֹרָא׃ | tav sav, kamatz | yes |
| `adon-olam-1-l4` | line | prayer-line | וְהוּא הָיָה וְהוּא הֹוֶה וְהוּא יִהְיֶה בְּתִפְאָרָה׃ | tav sav, kamatz | yes |
| `adon-olam-1-l6` | line | prayer-line | בְּלִי רֵאשִׁית בְּלִי תַכְלִית וְלוֹ הָעֹז וְהַמִּשְׂרָה׃ | tav sav, kamatz | yes |
| `adon-olam-1-l7` | line | prayer-line | וְהוּא אֵלִי וְחַי גוֹאֲלִי וְצוּר חֶבְלִי בְּעֵת צָרָה׃ | tav sav, kamatz | yes |
| `adon-olam-1-l8` | line | prayer-line | וְהוּא נִסִּי וּמָנוֹס לִי מְנָת כּוֹסִי בְּיוֹם אֶקְרָא׃ | tav sav, kamatz | yes |
| `adon-olam-1-l9` | line | prayer-line | בְּיָדוֹ אַפְקִיד רוּחִי בְּעֵת אִישָׁן וְאָעִירָה׃ | tav sav, kamatz | yes |
| `ashrei-145-1-3-l1` | line | prayer-line | תְּהִלָּה לְדָוִד אֲרוֹמִמְךָ אֱלוֹהַי הַמֶּלֶךְ וַאֲבָרֲכָה שִׁמְךָ לְעוֹלָם וָעֶד׃ | tav sav, kamatz | yes |
| `ashrei-145-16` | line | prayer-line | פּוֹתֵחַ אֶת־יָדֶךָ וּמַשְׂבִּיעַ לְכָל־חַי רָצוֹן׃ | tav sav, kamatz | yes |
| `ashrei-84-5` | line | prayer-line | אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ עוֹד יְהַלְלוּךָ סֶּלָה׃ | tav sav, kamatz | yes |
| `kaddish-1-l1` | line | prayer-line | יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא אָמֵן | tav sav, kamatz | yes |

## Notes

Pool of usable three-tradition ids: {'usable': 2052, 'usable_buckets': {'prayer-line': 31, 'word': 1991, 'phrase': 30}}. Audio root: `/workspace/Al-Heb-overnight/audio`.

