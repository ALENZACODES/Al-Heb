# Israeli audio: speech-to-text check

Each clip was played to a Hebrew speech-to-text model (ivrit-ai Whisper large-v3-turbo) and what it heard was compared with the Hebrew the clip should say. Spelling-only differences are allowed (ו/י vowel letters, ט/ת, כ/ק, ע/א, ס/ש, a final א/ה). A machine check: a **fail** is strong evidence the clip is wrong; a **pass** means it is recognisable, not that a teacher has approved it.

Unique recordings checked: **13806** (identical files under several ids are counted once).

| kind | fail | unheard | borderline | number | pass |
|---|---|---|---|---|---|
| builder | 13 | 0 | 42 | 0 | 267 |
| dictionary | 165 | 0 | 194 | 0 | 6857 |
| word | 40 | 0 | 80 | 6 | 6142 |
| **all** | **218** | **0** | **316** | **6** | **13266** |

Clip files to re-record (fail + unheard + borderline, every path sharing the audio): **586**, listed in [asr-redo-israeli.txt](asr-redo-israeli.txt). Full table: [asr-check.csv](asr-check.csv).

Fix them with `python tools/audio/asr-check/fix.py` (needs GOOGLE_TTS_API_KEY).

## Worst 150

| verdict | score | should say | heard | phonetic | clip |
|---|---|---|---|---|---|
| fail | 0.0 | וָו | ו. | vav | `audio/f/israeli/word/h29a2e2b8.mp3` |
| fail | 0.0 | הָא | אה. | ha | `audio/f/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הִוא | היו | hiv | `audio/f/israeli/word/kiddush-veshamru-w14.mp3` |
| fail | 0.0 | וָו | ו. | vav | `audio/m/israeli/word/h29a2e2b8.mp3` |
| fail | 0.0 | הָא | אה | ha | `audio/m/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הִוא | היו | hiv | `audio/m/israeli/word/kiddush-veshamru-w14.mp3` |
| fail | 0.0 | יִעֵל | E.L. |  | `audio/m/israeli/dictionary/dict-v74ed122f.mp3` |
| fail | 0.0 | הֵד | Head |  | `audio/m/israeli/dictionary/dict-vb75ed959.mp3` |
| fail | 0.0 | הֵד | Head |  | `audio/f/israeli/dictionary/dict-vb75ed959.mp3` |
| fail | 0.0 | צִי | סי |  | `audio/m/israeli/dictionary/dict-vf965f588.mp3` |
| fail | 0.0 | צִי | סי |  | `audio/f/israeli/dictionary/dict-vf965f588.mp3` |
| fail | 0.0 | הִזְהִיר | He's here |  | `audio/m/israeli/dictionary/dict-v9fd8edbe.mp3` |
| fail | 0.0 | הִזְהִיר | He's here |  | `audio/f/israeli/dictionary/dict-v9fd8edbe.mp3` |
| fail | 0.0 | לוּז | Lose |  | `audio/f/israeli/dictionary/dict-v2144da4c.mp3` |
| fail | 0.0 | לֵץ | let's |  | `audio/m/israeli/dictionary/dict-ve591ed9d.mp3` |
| fail | 0.0 | לֵץ | let's |  | `audio/f/israeli/dictionary/dict-ve591ed9d.mp3` |
| fail | 0.0 | עִסָּה | יישא |  | `audio/f/israeli/dictionary/dict-veb0c40a7.mp3` |
| fail | 0.0 | אַיָּה | היה. |  | `audio/m/israeli/dictionary/dict-vd549b2f6.mp3` |
| fail | 0.0 | אַיָּה | היה. |  | `audio/f/israeli/dictionary/dict-vd549b2f6.mp3` |
| fail | 0.0 | זֵד | Z |  | `audio/m/israeli/dictionary/dict-v4f069a9b.mp3` |
| fail | 0.0 | זֵד | Z |  | `audio/f/israeli/dictionary/dict-v4f069a9b.mp3` |
| fail | 0.0 | גּוֹ | בוא |  | `audio/m/israeli/dictionary/dict-v1d519995.mp3` |
| fail | 0.0 | הֵא | ‫ה. |  | `audio/m/israeli/dictionary/dict-va4b7d8ca.mp3` |
| fail | 0.0 | הֵא | אה |  | `audio/f/israeli/dictionary/dict-va4b7d8ca.mp3` |
| fail | 0.0 | הִתִּיז | It is |  | `audio/m/israeli/dictionary/dict-v37d12a6d.mp3` |
| fail | 0.0 | פֶּה | תודה רבה | peh | `audio/builder/h60b16793_noa.mp3` |
| fail | 0.333 | אָסַר | השר |  | `audio/f/israeli/dictionary/dict-v55e2c8a5.mp3` |
| fail | 0.333 | הִפּוּךְ | כיפור |  | `audio/f/israeli/dictionary/dict-v627d068b.mp3` |
| fail | 0.333 | שִׁבְעָה | שספה | shiv'ah | `audio/builder/h68a92f84_ari.mp3` |
| fail | 0.333 | כָּאן | קמקורי | kan | `audio/builder/h0c3016b2_ari.mp3` |
| fail | 0.4 | פֶּרֶא | תראה |  | `audio/f/israeli/dictionary/dict-va592f974.mp3` |
| fail | 0.4 | צִנָּה | סינאה |  | `audio/m/israeli/dictionary/dict-v09bc22b5.mp3` |
| fail | 0.4 | גְּדִיָּה | נדיעה |  | `audio/m/israeli/dictionary/dict-v35e9a9c5.mp3` |
| fail | 0.4 | סַעַר | שר |  | `audio/m/israeli/dictionary/dict-vbe4f68ad.mp3` |
| fail | 0.4 | סַעַר | שר |  | `audio/f/israeli/dictionary/dict-vbe4f68ad.mp3` |
| fail | 0.4 | עִבָּה | היא באה |  | `audio/m/israeli/dictionary/dict-v9d74021c.mp3` |
| fail | 0.4 | עִבָּה | היא באה |  | `audio/f/israeli/dictionary/dict-v9d74021c.mp3` |
| fail | 0.4 | הִשְׁעָה | אישה |  | `audio/f/israeli/dictionary/dict-v65697bc0.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/h68843f80.mp3` |
| fail | 0.5 | בְּפִי | בשיא | befi | `audio/f/israeli/word/haftarah-after-w133.mp3` |
| fail | 0.5 | סָר | שר | sar | `audio/f/israeli/word/hc480edcd.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/yigdal-w8.mp3` |
| fail | 0.5 | אִירָא׃ | יראה | ira | `audio/m/israeli/word/adon-olam-1-w72.mp3` |
| fail | 0.5 | סָר | שר | sar | `audio/m/israeli/word/hc480edcd.mp3` |
| fail | 0.5 | צָפָה | שפה |  | `audio/m/israeli/dictionary/dict-vd1dc7040.mp3` |
| fail | 0.5 | צָפָה | שפה |  | `audio/f/israeli/dictionary/dict-vd1dc7040.mp3` |
| fail | 0.5 | פֶּשַׁע | תשע |  | `audio/f/israeli/dictionary/dict-v3e4efef3.mp3` |
| fail | 0.5 | תָּקַע | דקה. |  | `audio/m/israeli/dictionary/dict-vbb37f4e8.mp3` |
| fail | 0.5 | תָּקַע | דקה. |  | `audio/f/israeli/dictionary/dict-vbb37f4e8.mp3` |
| fail | 0.5 | הִשְׁתִּין | אשתים |  | `audio/m/israeli/dictionary/dict-v0adc7d97.mp3` |
| fail | 0.5 | הִוְרִיד | עברית |  | `audio/m/israeli/dictionary/dict-vee218d52.mp3` |
| fail | 0.5 | צֵלָע | סלע |  | `audio/m/israeli/dictionary/dict-v078de213.mp3` |
| fail | 0.5 | יִדֵּעַ | אידאה |  | `audio/m/israeli/dictionary/dict-v580e08ee.mp3` |
| fail | 0.5 | יִדֵּעַ | אידאה |  | `audio/f/israeli/dictionary/dict-v580e08ee.mp3` |
| fail | 0.5 | אָיֹם | היום |  | `audio/m/israeli/dictionary/dict-vdbd69ec8.mp3` |
| fail | 0.5 | אָיֹם | היום |  | `audio/f/israeli/dictionary/dict-vdbd69ec8.mp3` |
| fail | 0.5 | בֵּיאֵס | ב-yes |  | `audio/m/israeli/dictionary/dict-va748bd68.mp3` |
| fail | 0.5 | תֹּף | טוב. |  | `audio/m/israeli/dictionary/dict-vc614b204.mp3` |
| fail | 0.5 | תֹּף | צוף |  | `audio/f/israeli/dictionary/dict-vc614b204.mp3` |
| fail | 0.5 | גּוּשׁ | בוש |  | `audio/f/israeli/dictionary/dict-va6fd2f59.mp3` |
| fail | 0.5 | עִוָּה | היבה |  | `audio/m/israeli/dictionary/dict-vc361a16f.mp3` |
| fail | 0.5 | עִסָּה | היסע |  | `audio/m/israeli/dictionary/dict-veb0c40a7.mp3` |
| fail | 0.5 | גּוּר | בור |  | `audio/f/israeli/dictionary/dict-vca76d692.mp3` |
| fail | 0.5 | עַיִט | היית |  | `audio/f/israeli/dictionary/dict-v7f95515b.mp3` |
| fail | 0.5 | חוֹחַ | רוח |  | `audio/m/israeli/dictionary/dict-vb9a52183.mp3` |
| fail | 0.5 | הוֹקִי | אוקי |  | `audio/m/israeli/dictionary/dict-v28359347.mp3` |
| fail | 0.5 | פָּעָה | טעה |  | `audio/f/israeli/dictionary/dict-vbcf265ea.mp3` |
| fail | 0.5 | שְׁעוּעִית | שהווית |  | `audio/m/israeli/dictionary/dict-ve8865de4.mp3` |
| fail | 0.5 | שְׁעוּעִית | שהוהית |  | `audio/f/israeli/dictionary/dict-ve8865de4.mp3` |
| fail | 0.5 | הִבְרִיק | עברית |  | `audio/m/israeli/dictionary/dict-v2aa896cd.mp3` |
| fail | 0.5 | הִשִּׂיא | איסי |  | `audio/m/israeli/dictionary/dict-vf913aeb1.mp3` |
| fail | 0.5 | בְּתוּלִים | גדולים |  | `audio/m/israeli/dictionary/dict-v81f6e097.mp3` |
| fail | 0.5 | הָזָה | עזה. |  | `audio/m/israeli/dictionary/dict-v406265cc.mp3` |
| fail | 0.5 | זֵעָה | זהה. |  | `audio/m/israeli/dictionary/dict-v08d9c6ed.mp3` |
| fail | 0.5 | זֵעָה | זהה. |  | `audio/f/israeli/dictionary/dict-v08d9c6ed.mp3` |
| fail | 0.5 | צֳרִי | סורי |  | `audio/m/israeli/dictionary/dict-v91f9804c.mp3` |
| fail | 0.5 | צֳרִי | סורי |  | `audio/f/israeli/dictionary/dict-v91f9804c.mp3` |
| fail | 0.5 | פָּרָה | בואו רע | parah | `audio/builder/h80d6f3f0_ari.mp3` |
| fail | 0.5 | שִׁשָּׁה | שיסו | shishah | `audio/builder/pc9b3fcc6_noa.mp3` |
| fail | 0.5 | טָרִי | צ'רי | tari | `audio/builder/h8349e150_noa.mp3` |
| fail | 0.571 | דְקֻדְשָׁא | דקוצ'ה | dekudsha | `audio/f/israeli/word/brich-shmei-w65.mp3` |
| fail | 0.571 | דְקוּדְשָׁא | דקוצ'ה | dekudesha | `audio/f/israeli/word/kaddish-1-w37.mp3` |
| fail | 0.571 | כִרְעוּתֵהּ | קירוטה | khir'uteh | `audio/f/israeli/word/kaddish-1-w8.mp3` |
| fail | 0.571 | דְקֻדְשָׁא | דקוצ'ה | dekudsha | `audio/m/israeli/word/brich-shmei-w65.mp3` |
| fail | 0.571 | דְקוּדְשָׁא | דקוצ'ה | dekudesha | `audio/m/israeli/word/kaddish-1-w37.mp3` |
| fail | 0.571 | פָּלַט | בלעת |  | `audio/f/israeli/dictionary/dict-vb199456f.mp3` |
| fail | 0.571 | עָרֵל | הראל |  | `audio/m/israeli/dictionary/dict-vf64ecd57.mp3` |
| fail | 0.571 | קֶטְשׁוֹפּ | קצ'ופ |  | `audio/m/israeli/dictionary/dict-v84da75c3.mp3` |
| fail | 0.571 | קֶטְשׁוֹפּ | קצ'ופ |  | `audio/f/israeli/dictionary/dict-v84da75c3.mp3` |
| fail | 0.571 | גִּשֵׁר | נשאר |  | `audio/m/israeli/dictionary/dict-v77b1d228.mp3` |
| fail | 0.571 | שָׁבוּעַ | שישה סבועה | shavu'a | `audio/builder/h92151b55_noa.mp3` |
| fail | 0.571 | חֲמִשָּׁה | חמיסופה | chamishah | `audio/builder/h29aadfe4_ari.mp3` |
| fail | 0.667 | עֻזּוֹ | וזו | uzo | `audio/f/israeli/word/aleinu-1-w50.mp3` |
| fail | 0.667 | וּלְחַיִּין | ולחיים. | ulechayin | `audio/f/israeli/word/brich-shmei-w117.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/f/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | וּמַסְגֵּא | ומזגה. | umasge | `audio/f/israeli/word/brich-shmei-w91.mp3` |
| fail | 0.667 | טַף | ת' | taf | `audio/f/israeli/word/h0cc80aed.mp3` |
| fail | 0.667 | יֻדַּע | יהודה | yuda | `audio/f/israeli/word/h0e071b5c.mp3` |
| fail | 0.667 | אָכֹם | החום | akhom | `audio/f/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | ברוך | ברוך | vrvkh | `audio/f/israeli/word/r35-w3.mp3` |
| fail | 0.667 | שְׂחוֹק | צחוק | sechok | `audio/f/israeli/word/shir-hamaalot-w11.mp3` |
| fail | 0.667 | עֻזּוֹ | וזו | uzo | `audio/m/israeli/word/aleinu-1-w50.mp3` |
| fail | 0.667 | דְּלִבָּאי | בלי ביי | delibay | `audio/m/israeli/word/brich-shmei-w112.mp3` |
| fail | 0.667 | וּלְחַיִּין | ולחיים. | ulechayin | `audio/m/israeli/word/brich-shmei-w117.mp3` |
| fail | 0.667 | וְאַתְרָךְ | והטראח | ve'atrakh | `audio/m/israeli/word/brich-shmei-w7.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/m/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | וּמַסְגֵּא | ומזגה. | umasge | `audio/m/israeli/word/brich-shmei-w91.mp3` |
| fail | 0.667 | נָכוֹן | ניקון | nakhon | `audio/m/israeli/word/fillers-04.mp3` |
| fail | 0.667 | יֻדַּע | יהודה | yuda | `audio/m/israeli/word/h0e071b5c.mp3` |
| fail | 0.667 | יְרִיעָה | יריה | yeri'ah | `audio/m/israeli/word/ha54e1129.mp3` |
| fail | 0.667 | אָכֹם | אכון | akhom | `audio/m/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | לֹא אִירָא | לא יראה. | lo ira | `audio/m/israeli/word/i-09-w16.mp3` |
| fail | 0.667 | שְׂחוֹק | צחוק | sechok | `audio/m/israeli/word/shir-hamaalot-w11.mp3` |
| fail | 0.667 | אִמֵּת | היא מת. |  | `audio/m/israeli/dictionary/dict-v040e9391.mp3` |
| fail | 0.667 | אִמֵּת | היא מת. |  | `audio/f/israeli/dictionary/dict-v040e9391.mp3` |
| fail | 0.667 | כְּ־ | כן. |  | `audio/m/israeli/dictionary/dict-vc4b2b486.mp3` |
| fail | 0.667 | אִתֵּר | היתר |  | `audio/m/israeli/dictionary/dict-vc81e8706.mp3` |
| fail | 0.667 | אֵפֶר | עשר |  | `audio/f/israeli/dictionary/dict-v9a3752ee.mp3` |
| fail | 0.667 | אָסַר | עשר |  | `audio/m/israeli/dictionary/dict-v55e2c8a5.mp3` |
| fail | 0.667 | הֵמִית | אמית |  | `audio/m/israeli/dictionary/dict-v1d64cfd2.mp3` |
| fail | 0.667 | בּוֹר | בואו |  | `audio/m/israeli/dictionary/dict-vee9b6edc.mp3` |
| fail | 0.667 | עִגֵּל | יגאל |  | `audio/f/israeli/dictionary/dict-vb40ee7fd.mp3` |
| fail | 0.667 | הִתִּיךְ | הידיך |  | `audio/m/israeli/dictionary/dict-vc38bbda7.mp3` |
| fail | 0.667 | פָּרַק | ברק |  | `audio/f/israeli/dictionary/dict-v858164ba.mp3` |
| fail | 0.667 | הׇאֳרַק | או רק. |  | `audio/m/israeli/dictionary/dict-vdd9e2334.mp3` |
| fail | 0.667 | צַו | צב |  | `audio/m/israeli/dictionary/dict-v2056afc2.mp3` |
| fail | 0.667 | צַו | צב |  | `audio/f/israeli/dictionary/dict-v2056afc2.mp3` |
| fail | 0.667 | מָאַס | מעש |  | `audio/m/israeli/dictionary/dict-v323d1bb3.mp3` |
| fail | 0.667 | מָאַס | מעש |  | `audio/f/israeli/dictionary/dict-v323d1bb3.mp3` |
| fail | 0.667 | נָעַר | נהר |  | `audio/m/israeli/dictionary/dict-v7af25aad.mp3` |
| fail | 0.667 | נָעַר | נהר |  | `audio/f/israeli/dictionary/dict-v7af25aad.mp3` |
| fail | 0.667 | פָּלַט | בלט |  | `audio/m/israeli/dictionary/dict-vb199456f.mp3` |
| fail | 0.667 | הִלּוּךְ | הילור |  | `audio/f/israeli/dictionary/dict-v76e88ba2.mp3` |
| fail | 0.667 | הוֹעִיל | פועיל |  | `audio/m/israeli/dictionary/dict-v76419583.mp3` |
| fail | 0.667 | אִיֵּת | יט |  | `audio/m/israeli/dictionary/dict-va5986f61.mp3` |
| fail | 0.667 | צָפַר | ספר |  | `audio/m/israeli/dictionary/dict-v771aa9b9.mp3` |
| fail | 0.667 | נָסַךְ | מסך |  | `audio/m/israeli/dictionary/dict-v1ab9d8fb.mp3` |
| fail | 0.667 | נוּר | נו |  | `audio/m/israeli/dictionary/dict-v3228345c.mp3` |
| fail | 0.667 | דֶּבֶר | דבל |  | `audio/m/israeli/dictionary/dict-vb4c31767.mp3` |
| fail | 0.667 | גְּדוּד | נידוד |  | `audio/m/israeli/dictionary/dict-v430bbce6.mp3` |
| fail | 0.667 | אִכֵּל | היכל |  | `audio/m/israeli/dictionary/dict-vf8881a8f.mp3` |
| fail | 0.667 | בִּשֵּׁל | מישל |  | `audio/m/israeli/dictionary/dict-v8455cf3c.mp3` |
| fail | 0.667 | אָשֵׁם | השם |  | `audio/m/israeli/dictionary/dict-v118cb057.mp3` |
| fail | 0.667 | אָשֵׁם | השם |  | `audio/f/israeli/dictionary/dict-v118cb057.mp3` |
| fail | 0.667 | סָכַר | שכר |  | `audio/m/israeli/dictionary/dict-v8b326f31.mp3` |
| fail | 0.667 | סָכַר | שכר |  | `audio/f/israeli/dictionary/dict-v8b326f31.mp3` |
| fail | 0.667 | אָרַג | הרג |  | `audio/f/israeli/dictionary/dict-vae5ac99e.mp3` |
| fail | 0.667 | תְּנוּךְ | תנור |  | `audio/f/israeli/dictionary/dict-v49efc3b6.mp3` |
| fail | 0.667 | אֱלִיל | אליר |  | `audio/f/israeli/dictionary/dict-v396b1e64.mp3` |
| fail | 0.667 | אֹרַס | הורס |  | `audio/m/israeli/dictionary/dict-v14a31f1d.mp3` |
