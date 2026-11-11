# Israeli audio: speech-to-text check

Each clip was played to a Hebrew speech-to-text model (ivrit-ai Whisper large-v3-turbo) and what it heard was compared with the Hebrew the clip should say. Spelling-only differences are allowed (ו/י vowel letters, ט/ת, כ/ק, ע/א, ס/ש, a final א/ה). A machine check: a **fail** is strong evidence the clip is wrong; a **pass** means it is recognisable, not that a teacher has approved it.

Unique recordings checked: **13803** (identical files under several ids are counted once).

| kind | fail | unheard | borderline | number | pass |
|---|---|---|---|---|---|
| builder | 0 | 0 | 0 | 0 | 322 |
| dictionary | 22 | 0 | 28 | 0 | 7163 |
| word | 3 | 0 | 1 | 6 | 6258 |
| **all** | **25** | **0** | **29** | **6** | **13743** |

Clip files to re-record (fail + unheard + borderline, every path sharing the audio): **54**, listed in [asr-redo-israeli.txt](asr-redo-israeli.txt). Full table: [asr-check.csv](asr-check.csv).

Fix them with `python tools/audio/asr-check/fix.py` (needs GOOGLE_TTS_API_KEY).

## Worst 150

| verdict | score | should say | heard | phonetic | clip |
|---|---|---|---|---|---|
| fail | 0.0 | הָא | אה? | ha | `audio/f/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הֵד | Head |  | `audio/f/israeli/dictionary/dict-vb75ed959.mp3` |
| fail | 0.0 | הִזְהִיר | He's here |  | `audio/f/israeli/dictionary/dict-v9fd8edbe.mp3` |
| fail | 0.0 | אַיָּה | היה. |  | `audio/f/israeli/dictionary/dict-vd549b2f6.mp3` |
| fail | 0.0 | הֵא | ‫ה. |  | `audio/m/israeli/dictionary/dict-va4b7d8ca.mp3` |
| fail | 0.0 | הֵא | אה |  | `audio/f/israeli/dictionary/dict-va4b7d8ca.mp3` |
| fail | 0.333 | אָסַר | השר |  | `audio/f/israeli/dictionary/dict-v55e2c8a5.mp3` |
| fail | 0.5 | עַיִט | היית |  | `audio/f/israeli/dictionary/dict-v7f95515b.mp3` |
| fail | 0.5 | שְׁעוּעִית | שהווית |  | `audio/m/israeli/dictionary/dict-ve8865de4.mp3` |
| fail | 0.5 | שְׁעוּעִית | שהוהית |  | `audio/f/israeli/dictionary/dict-ve8865de4.mp3` |
| fail | 0.571 | קֶטְשׁוֹפּ | קצ'ופ |  | `audio/m/israeli/dictionary/dict-v84da75c3.mp3` |
| fail | 0.571 | קֶטְשׁוֹפּ | קצ'ופ |  | `audio/f/israeli/dictionary/dict-v84da75c3.mp3` |
| fail | 0.667 | אָכֹם | עקם | akhom | `audio/f/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | ברוך | ברוך | vrvkh | `audio/f/israeli/word/r35-w3.mp3` |
| fail | 0.667 | אֵפֶר | עשר |  | `audio/f/israeli/dictionary/dict-v9a3752ee.mp3` |
| fail | 0.667 | אָסַר | עשר |  | `audio/m/israeli/dictionary/dict-v55e2c8a5.mp3` |
| fail | 0.667 | שָׁ | שעה |  | `audio/m/israeli/dictionary/dict-vf2bb3587.mp3` |
| fail | 0.667 | מֶם | מ. |  | `audio/f/israeli/dictionary/dict-v1348133a.mp3` |
| fail | 0.667 | סָכָל | שחל |  | `audio/m/israeli/dictionary/dict-v81437014.mp3` |
| fail | 0.667 | הִתְנִיעַ | התמיה |  | `audio/m/israeli/dictionary/dict-vaac207f7.mp3` |
| fail | 0.667 | יָצוּעַ | יצואה |  | `audio/f/israeli/dictionary/dict-v983aaf3a.mp3` |
| fail | 0.667 | פָּרוּר | ברור |  | `audio/m/israeli/dictionary/dict-v17d329a2.mp3` |
| fail | 0.667 | פָּרוּר | ברור |  | `audio/f/israeli/dictionary/dict-v17d329a2.mp3` |
| fail | 0.667 | גֶּבֶס | גבש |  | `audio/f/israeli/dictionary/dict-v625564e6.mp3` |
| fail | 0.667 | עָרַג | הרג |  | `audio/f/israeli/dictionary/dict-v61830b9a.mp3` |
| borderline | 0.8 | אֲבָרֲכֶךָּ | אברקק | avarakheka | `audio/f/israeli/word/ashrei-145-1-3-w11.mp3` |
| borderline | 0.8 | הוֹשִׁיעַ | הושיעה |  | `audio/f/israeli/dictionary/dict-vcc28a845.mp3` |
| borderline | 0.8 | מִישֶׁהִי | מי שהיא. |  | `audio/m/israeli/dictionary/dict-v49ca7a70.mp3` |
| borderline | 0.8 | יִוֵּן | איבן |  | `audio/m/israeli/dictionary/dict-va8b52d4d.mp3` |
| borderline | 0.8 | יִוֵּן | איבן |  | `audio/f/israeli/dictionary/dict-va8b52d4d.mp3` |
| borderline | 0.8 | בָּז | באז |  | `audio/m/israeli/dictionary/dict-v71c26bc6.mp3` |
| borderline | 0.8 | הִבִּיעַ | הביעה |  | `audio/f/israeli/dictionary/dict-vcd9714c3.mp3` |
| borderline | 0.8 | עֵנָב | עיניו |  | `audio/f/israeli/dictionary/dict-v45d1d6f9.mp3` |
| borderline | 0.8 | וִיסְקִי | וויסקי |  | `audio/m/israeli/dictionary/dict-vb9c8a2b6.mp3` |
| borderline | 0.8 | מַעַן | מן |  | `audio/m/israeli/dictionary/dict-veed16b07.mp3` |
| borderline | 0.8 | תְּאוֹם | תהום |  | `audio/m/israeli/dictionary/dict-vada9e769.mp3` |
| borderline | 0.8 | קַשׁ | קאש |  | `audio/f/israeli/dictionary/dict-v72edc72e.mp3` |
| borderline | 0.8 | קַת | קאט |  | `audio/m/israeli/dictionary/dict-vfbc8fdb6.mp3` |
| borderline | 0.8 | פַּת | פאט |  | `audio/f/israeli/dictionary/dict-v03706504.mp3` |
| borderline | 0.833 | הִתְנַקְּשׁוּת | התנגשות |  | `audio/m/israeli/dictionary/dict-v46725d39.mp3` |
| borderline | 0.857 | נָמַס | נמאס |  | `audio/f/israeli/dictionary/dict-v88c94bb1.mp3` |
| borderline | 0.857 | חָמָס | חמאס |  | `audio/f/israeli/dictionary/dict-vdab4e390.mp3` |
| borderline | 0.857 | הִרְגִּיעַ | הרגיעה |  | `audio/f/israeli/dictionary/dict-v4f199720.mp3` |
| borderline | 0.857 | הִשְׁקִיעַ | השקיעה |  | `audio/f/israeli/dictionary/dict-v0a92c26e.mp3` |
| borderline | 0.857 | אֵיכְשֶׁהוּ | איך שהוא. |  | `audio/f/israeli/dictionary/dict-v9fc86790.mp3` |
| borderline | 0.857 | עָמַס | עמאס |  | `audio/m/israeli/dictionary/dict-v10c77c9b.mp3` |
| borderline | 0.857 | עָמַס | עמאס |  | `audio/f/israeli/dictionary/dict-v10c77c9b.mp3` |
| borderline | 0.857 | הִטְבִּיעַ | התביעה |  | `audio/m/israeli/dictionary/dict-ve8caca46.mp3` |
| borderline | 0.857 | הִטְבִּיעַ | הטביעה |  | `audio/f/israeli/dictionary/dict-ve8caca46.mp3` |
| borderline | 0.857 | חָמַס | חמאס |  | `audio/m/israeli/dictionary/dict-v8242b1b0.mp3` |
| borderline | 0.857 | חָמַס | חמאס |  | `audio/f/israeli/dictionary/dict-v8242b1b0.mp3` |
| borderline | 0.857 | הִתְנִיעַ | התניעה |  | `audio/f/israeli/dictionary/dict-vaac207f7.mp3` |
| borderline | 0.857 | הִכְנִיעַ | הכניעה |  | `audio/f/israeli/dictionary/dict-v47224aa8.mp3` |
| borderline | 0.889 | הִזְדַּקֵּק | יזדקק |  | `audio/f/israeli/dictionary/dict-v5c628dbf.mp3` |
