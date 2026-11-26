# Round 1 (original clips, all 8 checks): problem words, written by sound

Checks: 4 word checks (ivrit-turbo, whisper-v3, mms-1b, seamless-v2) and 4 phonetic checks (renikud, lv60, xlsr53, ipa1000).
A word is confirmed when at least 3 phonetic checks hear 75% or more of its sounds (all of them if fewer than 3 ran) and at most one word check mishears it. Sounds in plain letters: sh, kh (ח/כ), ts (צ), ch.

Recordings: **135**. Words: **4006**. Confirmed: **3202** (**79.93%**). Problem words: **804**.

| clip | word | should sound | word checks that misheard it (what they wrote) | phonetic checks (share of sounds heard) |
|---|---|---|---|---|
| `word/hf76c8cd2.mp3` | אָכֹם | akhom | ivrit-turbo: אקאם; whisper-v3: אקם; mms-1b: אקם; seamless-v2: אקאם. | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% — heard: renikud "akam"; lv60 "a k a m"; xlsr53 "a k a m"; ipa1000 "akam" |
| `word/kiddush-shabbat-eve-w11.mp3` | בָנוּ | vanu | ivrit-turbo: באנו; mms-1b: באנו; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% — heard: renikud "banu"; lv60 "b a n u"; xlsr53 "b a n u"; ipa1000 "banu" |
| `word/kiddush-shabbat-eve-w11.mp3` | בָנוּ | vanu | ivrit-turbo: באנו.; seamless-v2: באנו. | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% — heard: renikud "banu"; lv60 "b a n u"; xlsr53 "b a n u"; ipa1000 "banu" |
| `word/r35-w3.mp3` | ברוך | vrkh | ivrit-turbo: ברור.; whisper-v3: ברור; mms-1b: ברוך; seamless-v2: באגור | renikud 67%; lv60 0%; xlsr53 33%; ipa1000 0% — heard: renikud "barukh"; lv60 "b a k u h"; xlsr53 "b a r u r"; ipa1000 "begugo" |
| `word/aleinu-1-w6.mp3` | גְּדֻלָּה | gdula | whisper-v3: נדולה.; mms-1b: דל; seamless-v2: תסתכל. | renikud 80%; lv60 80%; xlsr53 80%; ipa1000 80% — heard: renikud "dula"; lv60 "d u l a"; xlsr53 "i d u l a"; ipa1000 "dula" |
| `word/i-08-w4.mp3` | גְּדֻלָּה | gdula | whisper-v3: נדולה.; mms-1b: דל; seamless-v2: תסתכל. | renikud 80%; lv60 80%; xlsr53 80%; ipa1000 80% — heard: renikud "mdula"; lv60 "d u l a"; xlsr53 "i d u l a"; ipa1000 "dula" |
| `word/yigdal-w42.mp3` | גְדֻלָּתוֹ | gdulato | whisper-v3: נגדול לטו.; mms-1b: רידו לתו; seamless-v2: נדמה לו, | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 86% — heard: renikud "gidulato"; lv60 "l i d u l a t o"; xlsr53 "n i d u l a t o"; ipa1000 "idulato" |
| `dictionary/dict-va4b7d8ca.mp3` | הֵא | he | ivrit-turbo: אה; whisper-v3: ‫ההה.; mms-1b: הe; seamless-v2: היי. היי. | renikud 50%; lv60 100%; xlsr53 100%; ipa1000 100% — heard: renikud "ha"; lv60 "h e"; xlsr53 "h e"; ipa1000 "he" |
| `dictionary/dict-va4b7d8ca.mp3` | הֵא | he | ivrit-turbo: אה; whisper-v3: תודה.; mms-1b: ה; seamless-v2: היי. | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% — heard: renikud "ha"; lv60 "p e"; xlsr53 "p e"; ipa1000 "pe" |
| `dictionary/dict-vb9c8a2b6.mp3` | וִיסְקִי | viski | ivrit-turbo: וויסקי; whisper-v3: וויסקי; mms-1b: wisקי; seamless-v2: וויסקי | renikud 80%; lv60 80%; xlsr53 80%; ipa1000 60% — heard: renikud "wiski"; lv60 "w i s k i"; xlsr53 "w i s k i"; ipa1000 "wiske" |
| `word/ashrei-145-1-3-w12.mp3` | וַאֲהַלְלָה | vahala | whisper-v3: והללה.; mms-1b: וההלה לה; seamless-v2: וההללה | renikud 100%; lv60 100%; xlsr53 83%; ipa1000 83% — heard: renikud "vehahalala"; lv60 "v i a h a l a l a"; xlsr53 "v e h a l a l a"; ipa1000 "veagalala" |
| `word/amidah-lips-w4.mp3` | וּפִי | ufi | ivrit-turbo: אופי; whisper-v3: אופי. | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% — heard: renikud "ufi"; lv60 "w u f i"; xlsr53 "u f i"; ipa1000 "ufi" |
| `word/bless-priestly-1-w1.mp3` | יְבָרֶכְךָ | jvarekha | ivrit-turbo: יברך.; whisper-v3: יברך.; mms-1b: יבהרך; seamless-v2: יברך. | renikud 100%; lv60 71%; xlsr53 86%; ipa1000 86% — heard: renikud "jivarekha"; lv60 "j a v a l e h k a"; xlsr53 "j e v a l e kh a"; ipa1000 "jevalekha" |
| `dictionary/dict-vc4b2b486.mp3` | כְּ | k | ivrit-turbo: כן.; mms-1b: k | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% — heard: renikud "ken"; lv60 "k e"; xlsr53 "k e"; ipa1000 "ke" |
| `word/lecha-hashem-w9.mp3` | כֹל | khol | ivrit-turbo: קול; mms-1b: cl; seamless-v2: קול. | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% — heard: renikud "kol"; lv60 "k o l"; xlsr53 "k o l"; ipa1000 "kol" |
| `word/lecha-hashem-w9.mp3` | כֹל | khol | ivrit-turbo: קול; whisper-v3: קול.; mms-1b: קל; seamless-v2: קול. | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% — heard: renikud "kol"; lv60 "k o l"; xlsr53 "k o l"; ipa1000 "kol" |
| `word/i-09-w16.mp3` | לא אירא | l r | seamless-v2: לא אראה. | renikud 100%; lv60 0%; xlsr53 100%; ipa1000 0% — heard: renikud "lo hera"; lv60 "l o i a"; xlsr53 "l o r a"; ipa1000 "loiga" |
| `word/shema-vahavta-w19.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 50%; xlsr53 67%; ipa1000 33% — heard: renikud "mitsokha"; lv60 "m i s o kh a"; xlsr53 "m i ts o kh a"; ipa1000 "mitsokh" |
| `word/vahavta-2-w6.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 50%; xlsr53 67%; ipa1000 33% — heard: renikud "mitsokha"; lv60 "m i s o kh a"; xlsr53 "m i ts o kh a"; ipa1000 "mitsokh" |
| `dictionary/dict-v323d1bb3.mp3` | מָאַס | mas | whisper-v3: מעש.; seamless-v2: מאת. | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% — heard: renikud "mas"; lv60 "m a h a s"; xlsr53 "m a h a s"; ipa1000 "mas" |
| `dictionary/dict-v1d5d18fe.mp3` | נִעְנֵעַ | ninea | ivrit-turbo: נהניה; whisper-v3: נהיה. | renikud 80%; lv60 100%; xlsr53 100%; ipa1000 60% — heard: renikud "mijaneha"; lv60 "n i a n e a"; xlsr53 "n i a n e a"; ipa1000 "mijne" |
| `word/mi-chamocha-1-w6.mp3` | נֶאְדָּר | nedar | ivrit-turbo: נהדר!; whisper-v3: נהדר. | renikud 80%; lv60 80%; xlsr53 80%; ipa1000 80% — heard: renikud "meadar"; lv60 "n e d a"; xlsr53 "n e a d a"; ipa1000 "neadal" |
| `word/h60b16793.mp3` | פֶּה | pe | ivrit-turbo: ב.; mms-1b: pe; seamless-v2: ת. | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% — heard: renikud "pe"; lv60 "p e"; xlsr53 "p e"; ipa1000 "pe" |
| `word/h69a35691.mp3` | פַּר | par | whisper-v3: בואו.; mms-1b: פ; seamless-v2: פארג. | renikud 67%; lv60 33%; xlsr53 33%; ipa1000 67% — heard: renikud "bar"; lv60 "b a l"; xlsr53 "b a l"; ipa1000 "pal" |
| `dictionary/dict-v11122fe7.mp3` | פָּן | pan | mms-1b: pן; seamless-v2: פאן. | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 100% — heard: renikud "pan"; lv60 "b a n"; xlsr53 "p a n"; ipa1000 "pan" |
| `dictionary/dict-v17d329a2.mp3` | פָּרוּר | parur | ivrit-turbo: ברור; whisper-v3: פגעו.; seamless-v2: פאגו. | renikud 80%; lv60 60%; xlsr53 60%; ipa1000 40% — heard: renikud "barur"; lv60 "p a g u"; xlsr53 "p a g u"; ipa1000 "pago" |
| `dictionary/dict-ve8865de4.mp3` | שְׁעוּעִית | shuit | ivrit-turbo: שהוהית; whisper-v3: שיעוית; mms-1b: שהוית; seamless-v2: שיוויט. | renikud 100%; lv60 75%; xlsr53 75%; ipa1000 75% — heard: renikud "shehuit"; lv60 "sh i j i t"; xlsr53 "sh i i t"; ipa1000 "shewit" |
| `dictionary/dict-ve8865de4.mp3` | שְׁעוּעִית | shuit | ivrit-turbo: שהווית; whisper-v3: שאווית; mms-1b: שוית; seamless-v2: שוויט. | renikud 100%; lv60 75%; xlsr53 75%; ipa1000 75% — heard: renikud "shehuit"; lv60 "sh e i t"; xlsr53 "sh e i t"; ipa1000 "shewit" |
| `word/i-16-w8.mp3` | מַטְעֵן | maten | ivrit-turbo: מתן; whisper-v3: מתן; mms-1b: מתן; seamless-v2: מתן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% — heard: renikud "maten"; lv60 "m a t e n"; xlsr53 "m a t e n"; ipa1000 "meten" |
| `word/i-16-w8.mp3` | מַטְעֵן | maten | ivrit-turbo: מתן; whisper-v3: מתן; mms-1b: מתן; seamless-v2: מתן | renikud 80%; lv60 100%; xlsr53 100%; ipa1000 100% — heard: renikud "matan"; lv60 "m a t e n"; xlsr53 "m a t e n"; ipa1000 "maten" |
| `line/ashrei-145-1-3-l2.mp3` | אֲבָרֲכֶךָּ | avarakhekha | seamless-v2: אברכי חווה עלה ששמחה | renikud 67%; lv60 67%; xlsr53 56%; ipa1000 56% |
| `line/ashrei-145-1-3-l2.mp3` | וַאֲהַלְלָה | vahala | ivrit-turbo: ואהלה; whisper-v3: ואהלה; mms-1b: ואהלה; seamless-v2: אברכי חווה עלה ששמחה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `line/ashrei-145-1-3-l2.mp3` | שִׁמְךָ | shimkha | ivrit-turbo: ששמחה; whisper-v3: ששמחה; mms-1b: שסמחה; seamless-v2: אברכי חווה עלה ששמחה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/torah-numbers-32-39.mp3` | וַיִּלְכְּדֻהָ | vajilkduha | ivrit-turbo: וילקדוהה | renikud 70%; lv60 60%; xlsr53 80%; ipa1000 80% |
| `line/brich-shmei.mp3` | עַמָּךְ | amakh | ivrit-turbo: למך; seamless-v2: למך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | קֳדָמָךְ | kodamakh | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | חַיִּין | khajin | whisper-v3: חיים; seamless-v2: חיים | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | בְּגוֹ | bgo | ivrit-turbo: גו; whisper-v3: בגדול | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | צַדִּיקַיָּא | tsadikaja | none | renikud 50%; lv60 38%; xlsr53 50%; ipa1000 38% |
| `line/brich-shmei.mp3` | לִי | li | whisper-v3: כל דילי; mms-1b: דילי ודיל המך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אַנְתְּ | ant | whisper-v3: (nothing); seamless-v2: אתה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אַנְתְּ | ant | whisper-v3: (nothing); seamless-v2: אתה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אַנְתְּ | ant | whisper-v3: (nothing); seamless-v2: אתה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | מַלְכַיָּא | malkhaja | whisper-v3: (nothing); mms-1b: מלקיה | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | דְקֻדְשָׁא | dkudsha | whisper-v3: (nothing); seamless-v2: דה קדושה | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `line/brich-shmei.mp3` | אוֹרַיְתֵהּ | orajte | whisper-v3: (nothing); seamless-v2: או ראית בכל | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `line/brich-shmei.mp3` | בְּכָל | bkhal | whisper-v3: (nothing); seamless-v2: או ראית בכל | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | עִדָּן | idan | whisper-v3: (nothing); mms-1b: ידן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | בַּר | bar | whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `line/brich-shmei.mp3` | אֱלָהִין | elahin | whisper-v3: (nothing); seamless-v2: אללה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `line/brich-shmei.mp3` | סָמִיכְנָא | samikhna | whisper-v3: (nothing); seamless-v2: סמיכה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֶלָּא | ela | whisper-v3: (nothing); seamless-v2: לה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | בֵּאלָהָא | belaha | whisper-v3: (nothing); seamless-v2: בלה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | דִשְׁמַיָּא | dishmaja | whisper-v3: (nothing); mms-1b: דשמהדהו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | דְּהוּא | dhu | ivrit-turbo: דהו; whisper-v3: (nothing); mms-1b: דשמהדהו; seamless-v2: דהו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֱלָהָא | elaha | whisper-v3: (nothing); seamless-v2: אלאה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 60% |
| `line/brich-shmei.mp3` | וּנְבִיאוֹהִי | unviohi | whisper-v3: (nothing); mms-1b: ונביאו היא | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `line/brich-shmei.mp3` | לְמֶעְבַּד | lmebad | whisper-v3: מישלין | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/brich-shmei.mp3` | טָבְוָן | tavan | whisper-v3: מישלין; seamless-v2: תוואן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | בֵּהּ | be | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | קֳדָמָךְ | kodamakh | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | דְּתִפְתַּח | dtiftakh | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | לִבָּאי | libaj | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 100% |
| `line/brich-shmei.mp3` | בְּאוֹרַיְתָא | borajta | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `line/brich-shmei.mp3` | וְתַשְׁלִים | vetashlim | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | מִשְׁאֲלִין | mishalin | ivrit-turbo: קודמך משלין; whisper-v3: מישלין; mms-1b: משלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/brich-shmei.mp3` | דְּלִבָּאי | dlibaj | none | renikud 83%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `line/brich-shmei.mp3` | דְכָל | dkhal | ivrit-turbo: דיכא; whisper-v3: דיקל; mms-1b: דיקל; seamless-v2: דיקל | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 25% |
| `line/brich-shmei.mp3` | עַמָּךְ | amakh | ivrit-turbo: למך; seamless-v2: למך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | וּלְחַיִּין | ulkhajin | none | renikud 57%; lv60 14%; xlsr53 57%; ipa1000 57% |
| `prayer/brich-shmei.mp3` | עַמָּךְ | amakh | ivrit-turbo: למך; seamless-v2: למך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | קֳדָמָךְ | kodamakh | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | חַיִּין | khajin | whisper-v3: חיים; seamless-v2: חיים | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | בְּגוֹ | bgo | ivrit-turbo: גו; whisper-v3: בגדול | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | צַדִּיקַיָּא | tsadikaja | none | renikud 50%; lv60 38%; xlsr53 50%; ipa1000 38% |
| `prayer/brich-shmei.mp3` | לִי | li | whisper-v3: כל דילי; mms-1b: דילי ודיל המך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אַנְתְּ | ant | whisper-v3: (nothing); seamless-v2: אתה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אַנְתְּ | ant | whisper-v3: (nothing); seamless-v2: אתה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אַנְתְּ | ant | whisper-v3: (nothing); seamless-v2: אתה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | מַלְכַיָּא | malkhaja | whisper-v3: (nothing); mms-1b: מלקיה | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | דְקֻדְשָׁא | dkudsha | whisper-v3: (nothing); seamless-v2: דה קדושה | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/brich-shmei.mp3` | אוֹרַיְתֵהּ | orajte | whisper-v3: (nothing); seamless-v2: או ראית בכל | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/brich-shmei.mp3` | בְּכָל | bkhal | whisper-v3: (nothing); seamless-v2: או ראית בכל | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | עִדָּן | idan | whisper-v3: (nothing); mms-1b: ידן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | בַּר | bar | whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/brich-shmei.mp3` | אֱלָהִין | elahin | whisper-v3: (nothing); seamless-v2: אללה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `prayer/brich-shmei.mp3` | סָמִיכְנָא | samikhna | whisper-v3: (nothing); seamless-v2: סמיכה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֶלָּא | ela | whisper-v3: (nothing); seamless-v2: לה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | בֵּאלָהָא | belaha | whisper-v3: (nothing); seamless-v2: בלה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | דִשְׁמַיָּא | dishmaja | whisper-v3: (nothing); mms-1b: דשמהדהו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | דְּהוּא | dhu | ivrit-turbo: דהו; whisper-v3: (nothing); mms-1b: דשמהדהו; seamless-v2: דהו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֱלָהָא | elaha | whisper-v3: (nothing); seamless-v2: אלאה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 60% |
| `prayer/brich-shmei.mp3` | וּנְבִיאוֹהִי | unviohi | whisper-v3: (nothing); mms-1b: ונביאו היא | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `prayer/brich-shmei.mp3` | לְמֶעְבַּד | lmebad | whisper-v3: מישלין | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/brich-shmei.mp3` | טָבְוָן | tavan | whisper-v3: מישלין; seamless-v2: תוואן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | בֵּהּ | be | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנה; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | קֳדָמָךְ | kodamakh | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | דְּתִפְתַּח | dtiftakh | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | לִבָּאי | libaj | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | בְּאוֹרַיְתָא | borajta | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | וְתַשְׁלִים | vetashlim | ivrit-turbo: קודמך משלין; whisper-v3: מישלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | מִשְׁאֲלִין | mishalin | ivrit-turbo: קודמך משלין; whisper-v3: מישלין; mms-1b: משלין | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | דְּלִבָּאי | dlibaj | none | renikud 83%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `prayer/brich-shmei.mp3` | דְכָל | dkhal | ivrit-turbo: דיכא; whisper-v3: דיקל; mms-1b: דיקל; seamless-v2: דיקל | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 25% |
| `prayer/brich-shmei.mp3` | עַמָּךְ | amakh | ivrit-turbo: למך; seamless-v2: למך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | וּלְחַיִּין | ulkhajin | none | renikud 57%; lv60 14%; xlsr53 57%; ipa1000 57% |
| `prayer/kaddish-1.mp3` | בְרָא | vra | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | כִרְעוּתֵהּ | khirute | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 0% |
| `prayer/kaddish-1.mp3` | וּבְיוֹמֵיכוֹן | uvjomekhon | none | renikud 89%; lv60 33%; xlsr53 33%; ipa1000 56% |
| `prayer/kaddish-1.mp3` | וּבְחַיֵּי | uvkhajej | none | renikud 100%; lv60 57%; xlsr53 57%; ipa1000 71% |
| `prayer/kaddish-1.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: (nothing); mms-1b: ישראר | renikud 86%; lv60 86%; xlsr53 100%; ipa1000 71% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: וימרו; whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 17% |
| `prayer/kaddish-1.mp3` | יְהֵא | jhe | whisper-v3: (nothing); seamless-v2: יאהה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | וּלְעָלְמֵי | ulalmej | whisper-v3: (nothing); mms-1b: הולעלמי | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | וְיִשְׁתַּבַּח | vejishtabakh | whisper-v3: (nothing); seamless-v2: ויתפלל | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 60% |
| `prayer/kaddish-1.mp3` | וְיִתְרוֹמַם | vejitromam | whisper-v3: (nothing) | renikud 100%; lv60 70%; xlsr53 80%; ipa1000 70% |
| `prayer/kaddish-1.mp3` | וְיִתְנַשֵּׂא | vejitnase | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 78%; xlsr53 89%; ipa1000 89% |
| `prayer/kaddish-1.mp3` | וְיִתְהַדָּר | vejithadar | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 90%; lv60 60%; xlsr53 70%; ipa1000 50% |
| `prayer/kaddish-1.mp3` | הוּא | hu | whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 50%; ipa1000 50% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: וימרו; whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 17% |
| `prayer/kaddish-1.mp3` | יְהֵא | jhe | whisper-v3: (nothing); seamless-v2: יאהה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | שְׁמַיָּא | shmaja | ivrit-turbo: שמעיה; seamless-v2: שמאיה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: (nothing); mms-1b: ישראר | renikud 86%; lv60 86%; xlsr53 100%; ipa1000 71% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: וימרו; whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 17% |
| `prayer/kaddish-1.mp3` | הוּא | hu | whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 50%; ipa1000 50% |
| `prayer/kaddish-1.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: (nothing); mms-1b: ישראר | renikud 86%; lv60 86%; xlsr53 100%; ipa1000 71% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: וימרו; whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 17% |
| `prayer/ashrei-145-1-3.mp3` | אֲרוֹמִמְךָ | aromimkha | whisper-v3: הרוממך; mms-1b: הרומימך; seamless-v2: ארומיך | renikud 100%; lv60 75%; xlsr53 62%; ipa1000 75% |
| `prayer/ashrei-145-1-3.mp3` | וַאֲבָרֲכָה | vavarakha | whisper-v3: והברכה; seamless-v2: והברך | renikud 88%; lv60 88%; xlsr53 100%; ipa1000 88% |
| `prayer/ashrei-145-1-3.mp3` | שִׁמְךָ | shimkha | ivrit-turbo: השמך; whisper-v3: השמך; mms-1b: השמך; seamless-v2: שמה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/ashrei-145-1-3.mp3` | אֲבָרֲכֶךָּ | avarakhekha | whisper-v3: הברכיך; seamless-v2: ברכיך | renikud 89%; lv60 89%; xlsr53 89%; ipa1000 78% |
| `prayer/ashrei-145-1-3.mp3` | וַאֲהַלְלָה | vahala | ivrit-turbo: ואהל; whisper-v3: וההל; mms-1b: ועהל; seamless-v2: והלה | renikud 100%; lv60 83%; xlsr53 67%; ipa1000 67% |
| `prayer/ashrei-145-1-3.mp3` | שִׁמְךָ | shimkha | ivrit-turbo: השמך; whisper-v3: השמך; mms-1b: השמך; seamless-v2: שמה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/ashrei-145-1-3.mp3` | וּמְהֻלָּל | umhulal | whisper-v3: ומעולל; mms-1b: ומעולל; seamless-v2: ומעולל | renikud 100%; lv60 71%; xlsr53 86%; ipa1000 71% |
| `prayer/ashrei-145-1-3.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/torah-leviticus-14-43.mp3` | הַנֶּגַע | hanega | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 83% |
| `line/torah-leviticus-14-43.mp3` | בַּבַּיִת | babajit | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 86% |
| `line/torah-leviticus-14-43.mp3` | הִקְצוֹת | hiktsot | whisper-v3: היא קצות; mms-1b: יקצות | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/torah-leviticus-14-43.mp3` | הַבַּיִת | habajit | none | renikud 100%; lv60 71%; xlsr53 57%; ipa1000 43% |
| `line/torah-leviticus-14-43.mp3` | הִטּוֹחַ | hitoakh | whisper-v3: היא תוח; mms-1b: יתח | renikud 100%; lv60 83%; xlsr53 67%; ipa1000 67% |
| `line/torah-leviticus-14-43.mp3` | וְאַחֲרֵי | veakharej | none | renikud 100%; lv60 62%; xlsr53 62%; ipa1000 75% |
| `line/torah-leviticus-14-43.mp3` | הִקְצוֹת | hiktsot | whisper-v3: היא קצות; mms-1b: הגצות | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `line/torah-leviticus-14-43.mp3` | הַבַּיִת | habajit | none | renikud 100%; lv60 57%; xlsr53 71%; ipa1000 71% |
| `line/torah-leviticus-14-43.mp3` | וְאַחֲרֵי | veakharej | none | renikud 100%; lv60 62%; xlsr53 62%; ipa1000 75% |
| `prayer/torah-bless-1.mp3` | בָּרוּךְ | barukh | whisper-v3: ברוכתו; seamless-v2: אורתו ברכתו | renikud 80%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `prayer/torah-bless-1.mp3` | אַתָּה | ata | whisper-v3: ברוכתו; seamless-v2: אורתו ברכתו | renikud 67%; lv60 100%; xlsr53 67%; ipa1000 67% |
| `prayer/torah-bless-1.mp3` | אֲדֹנָי | adonaj | none | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/torah-bless-1.mp3` | אֱלֹהֵינוּ | elohenu | whisper-v3: עלינו; seamless-v2: עלינו | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `prayer/torah-bless-1.mp3` | הָעוֹלָם | haolam | seamless-v2: העולה | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/torah-bless-1.mp3` | בָּחַר | bakhar | none | renikud 80%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `prayer/torah-bless-1.mp3` | לָנוּ | lanu | none | renikud 75%; lv60 0%; xlsr53 0%; ipa1000 0% |
| `prayer/torah-bless-1.mp3` | אֶת | et | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 100% |
| `prayer/torah-bless-1.mp3` | בָּרוּךְ | barukh | whisper-v3: ברוכתו; seamless-v2: אורתו ברכתו | renikud 80%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `prayer/torah-bless-1.mp3` | אַתָּה | ata | whisper-v3: ברוכתו; seamless-v2: אורתו ברכתו | renikud 67%; lv60 100%; xlsr53 67%; ipa1000 67% |
| `prayer/torah-bless-1.mp3` | אֲדֹנָי | adonaj | none | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/torah-genesis-10-15.mp3` | וּכְנַעַן | ukhnan | whisper-v3: אוכנן; mms-1b: הוכנן; seamless-v2: אוכנן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/torah-genesis-10-15.mp3` | וְאֶת | vet | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/torah-genesis-10-15.mp3` | חֵת | khet | ivrit-turbo: ח; whisper-v3: ח; seamless-v2: ח | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 33% |
| `line/torah-genesis-10-15.mp3` | וּכְנַעַן | ukhnan | whisper-v3: אוכנן; mms-1b: הוכנן; seamless-v2: כוכנן | renikud 100%; lv60 80%; xlsr53 100%; ipa1000 100% |
| `line/torah-genesis-10-15.mp3` | צִידֹן | tsidon | ivrit-turbo: סידון; whisper-v3: סידון; mms-1b: סידון; seamless-v2: סידון | renikud 80%; lv60 80%; xlsr53 100%; ipa1000 80% |
| `line/torah-genesis-10-15.mp3` | חֵת | khet | ivrit-turbo: חה; whisper-v3: חה; mms-1b: ואתחה; seamless-v2: ח | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/vahavta-full.mp3` | לְבָבְךָ | lvavkha | mms-1b: נפשך; seamless-v2: לבך | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 83% |
| `prayer/vahavta-full.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `prayer/vahavta-full.mp3` | בַדֶּרֶךְ | vaderekh | ivrit-turbo: בשבטך בביתך ובלכתך בדרך ובשכבך ובקומיך | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 57% |
| `prayer/vahavta-full.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 50%; xlsr53 67%; ipa1000 33% |
| `prayer/vahavta-full.mp3` | בַדֶּרֶךְ | vaderekh | none | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 57% |
| `prayer/vahavta-full.mp3` | וּבְשָׁכְבְּךָ | uvshakhbkha | none | renikud 62%; lv60 50%; xlsr53 75%; ipa1000 62% |
| `line/kaddish-1-l2.mp3` | בְּעָלְמָא | balma | none | renikud 60%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `line/kaddish-1-l2.mp3` | בְרָא | vra | whisper-v3: ברוק הראותי וימליך מלכותי בחיי חון וביומי חון; seamless-v2: ברוקר אוטה וימליך מלכותי | renikud 33%; lv60 33%; xlsr53 33%; ipa1000 0% |
| `line/kaddish-1-l2.mp3` | כִרְעוּתֵהּ | khirute | whisper-v3: ברוק הראותי וימליך מלכותי בחיי חון וביומי חון; mms-1b: קראותה; seamless-v2: ברוקר אוטה וימליך מלכותי | renikud 67%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/kaddish-1-l2.mp3` | וְיַמְלִיךְ | vejamlikh | whisper-v3: ברוק הראותי וימליך מלכותי בחיי חון וביומי חון; seamless-v2: ברוקר אוטה וימליך מלכותי | renikud 100%; lv60 100%; xlsr53 75%; ipa1000 88% |
| `line/kaddish-1-l2.mp3` | מַלְכוּתֵהּ | malkhute | whisper-v3: ברוק הראותי וימליך מלכותי בחיי חון וביומי חון; seamless-v2: ברוקר אוטה וימליך מלכותי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/kaddish-1-l2.mp3` | בְּחַיֵּיכוֹן | bkhajekhon | whisper-v3: ברוק הראותי וימליך מלכותי בחיי חון וביומי חון; seamless-v2: ברוקר אוטה וימליך מלכותי | renikud 100%; lv60 88%; xlsr53 100%; ipa1000 88% |
| `line/kaddish-1-l2.mp3` | וּבְיוֹמֵיכוֹן | uvjomekhon | whisper-v3: ברוק הראותי וימליך מלכותי בחיי חון וביומי חון; seamless-v2: ברוקר אוטה וימליך מלכותי | renikud 100%; lv60 100%; xlsr53 89%; ipa1000 100% |
| `line/kaddish-1-l2.mp3` | יִשְׂרָאֵל | jisrael | none | renikud 100%; lv60 71%; xlsr53 57%; ipa1000 57% |
| `line/kaddish-1-l2.mp3` | בַּעֲגָלָא | bagala | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/yigdal.mp3` | חַי | khaj | none | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 100% |
| `prayer/yigdal.mp3` | וְיִשְׁתַּבַּח | vejishtabakh | mms-1b: והשתבך; seamless-v2: והשתבש | renikud 90%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/yigdal.mp3` | עֵת | et | none | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `prayer/yigdal.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/yigdal.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/yigdal.mp3` | הַגּוּף | haguf | none | renikud 100%; lv60 60%; xlsr53 100%; ipa1000 60% |
| `prayer/yigdal.mp3` | לֹא | lo | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | דָּבָר | davar | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 40% |
| `prayer/yigdal.mp3` | לֹא | lo | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | כְּמֹשֶׁה | kmoshe | ivrit-turbo: כמו; whisper-v3: כמו; seamless-v2: כמו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | עוֹד | od | ivrit-turbo: שעוד; whisper-v3: שעוד; seamless-v2: שעוד | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | אֶת | et | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/yigdal.mp3` | תּוֹרַת | torat | whisper-v3: (nothing); seamless-v2: תורה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/yigdal.mp3` | יַד | jad | whisper-v3: (nothing) | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 100% |
| `prayer/yigdal.mp3` | לֹא | lo | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | יַחֲלִיף | jakhalif | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/yigdal.mp3` | הָאֵל | hael | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `prayer/yigdal.mp3` | וְלֹא | velo | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | יָמִיר | jamir | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/yigdal.mp3` | דָּתוֹ | dato | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `prayer/yigdal.mp3` | דָּבָר | davar | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 40% |
| `prayer/yigdal.mp3` | לְרָשָׁע | lrasha | mms-1b: לראשה; seamless-v2: לראשה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 60% |
| `prayer/yigdal.mp3` | קֵץ | kets | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/yigdal.mp3` | בָּרוּךְ | barukh | whisper-v3: תודה; seamless-v2: ברור | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 40% |
| `prayer/yigdal.mp3` | תְּהִלָּתוֹ | thilato | ivrit-turbo: ‫אותו; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/brich-shmei.mp3` | יְהֵא | jhe | seamless-v2: יאהה | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 67% |
| `line/brich-shmei.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: מלכיה; mms-1b: ישראר | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/brich-shmei.mp3` | וּפֻרְקַן | ufurkan | none | renikud 100%; lv60 57%; xlsr53 57%; ipa1000 86% |
| `line/brich-shmei.mp3` | לְעַמָּךְ | lamakh | whisper-v3: מלכיה; mms-1b: להמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | צְלוֹתָנָא | tslotana | whisper-v3: סלוטנה; seamless-v2: סולטנה | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `line/brich-shmei.mp3` | יְהֵא | jhe | seamless-v2: יאהה | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 67% |
| `line/brich-shmei.mp3` | חַיִּין | khajin | whisper-v3: חיים; seamless-v2: חיים | renikud 80%; lv60 40%; xlsr53 80%; ipa1000 100% |
| `line/brich-shmei.mp3` | בְּטִיבוּ | btivu | ivrit-turbo: וטיבו; whisper-v3: חיים | renikud 100%; lv60 80%; xlsr53 60%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | צַדִּיקַיָּא | tsadikaja | whisper-v3: חיים | renikud 50%; lv60 38%; xlsr53 25%; ipa1000 38% |
| `line/brich-shmei.mp3` | לְמִרְחַם | lmirkham | whisper-v3: חיים; seamless-v2: למלחם | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `line/brich-shmei.mp3` | וְיַת | vejat | ivrit-turbo: ויד; whisper-v3: מלכיה; seamless-v2: (nothing) | renikud 80%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | כָּל | kal | whisper-v3: מלכיה; mms-1b: קלדילי; seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | לִי | li | whisper-v3: מלכיה; mms-1b: להמך; seamless-v2: קלדילי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | וְדִי | vedi | whisper-v3: מלכיה; mms-1b: להמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | לְעַמָּךְ | lamakh | whisper-v3: מלכיה; mms-1b: להמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: מלכיה; mms-1b: ישראר | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `line/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `line/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `line/brich-shmei.mp3` | דְּשַׁלִּיט | dshalit | whisper-v3: מלכיה; seamless-v2: דה שליט | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | דְקֻדְשָׁא | dkudsha | whisper-v3: מלכיה; seamless-v2: דה קדושה | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `line/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `line/brich-shmei.mp3` | דְּסָגִידְנָא | dsagidna | ivrit-turbo: נא; seamless-v2: דה סגידנה כמא | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | דְּהוּא | dhu | ivrit-turbo: דהו; whisper-v3: דהו; mms-1b: דהו; seamless-v2: דהו | renikud 100%; lv60 100%; xlsr53 67%; ipa1000 33% |
| `line/brich-shmei.mp3` | אֱלָהָא | elaha | ivrit-turbo: אלאה; seamless-v2: אללה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `line/brich-shmei.mp3` | וּנְבִיאוֹהִי | unviohi | ivrit-turbo: ונביא אויה; whisper-v3: ונביא אוייה; mms-1b: ונביא אויה; seamless-v2: ונביא אוייה | renikud 14%; lv60 57%; xlsr53 57%; ipa1000 57% |
| `line/brich-shmei.mp3` | וּמַסְגֵּא | umasge | ivrit-turbo: ומזגה; seamless-v2: ומי זגה | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/brich-shmei.mp3` | לְמֶעְבַּד | lmebad | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 83% |
| `line/brich-shmei.mp3` | טָבְוָן | tavan | none | renikud 80%; lv60 60%; xlsr53 80%; ipa1000 60% |
| `line/brich-shmei.mp3` | בֵּהּ | be | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/brich-shmei.mp3` | יְהֵא | jhe | seamless-v2: יאהה | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 67% |
| `line/brich-shmei.mp3` | לִבָּאי | libaj | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 100% |
| `line/brich-shmei.mp3` | מִשְׁאֲלִין | mishalin | whisper-v3: משלין; mms-1b: משלין; seamless-v2: משלין | renikud 86%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/brich-shmei.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: מלכיה; mms-1b: ישראר | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/brich-shmei.mp3` | וּלְחַיִּין | ulkhajin | none | renikud 57%; lv60 14%; xlsr53 14%; ipa1000 43% |
| `prayer/brich-shmei.mp3` | יְהֵא | jhe | seamless-v2: יאהה | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 67% |
| `prayer/brich-shmei.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: מלכיה; mms-1b: ישראר | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | וּפֻרְקַן | ufurkan | none | renikud 100%; lv60 57%; xlsr53 57%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | לְעַמָּךְ | lamakh | whisper-v3: מלכיה; mms-1b: להמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | צְלוֹתָנָא | tslotana | whisper-v3: סלוטנה; seamless-v2: סולטנה | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | יְהֵא | jhe | seamless-v2: יאהה | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 67% |
| `prayer/brich-shmei.mp3` | חַיִּין | khajin | whisper-v3: חיים; seamless-v2: חיים | renikud 80%; lv60 40%; xlsr53 80%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | בְּטִיבוּ | btivu | ivrit-turbo: וטיבו; whisper-v3: חיים | renikud 100%; lv60 80%; xlsr53 60%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | צַדִּיקַיָּא | tsadikaja | whisper-v3: חיים | renikud 50%; lv60 38%; xlsr53 25%; ipa1000 38% |
| `prayer/brich-shmei.mp3` | לְמִרְחַם | lmirkham | whisper-v3: חיים; seamless-v2: למלחם | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | וְיַת | vejat | ivrit-turbo: ויד; whisper-v3: מלכיה; seamless-v2: (nothing) | renikud 80%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | כָּל | kal | whisper-v3: מלכיה; mms-1b: קלדילי; seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | לִי | li | whisper-v3: מלכיה; mms-1b: להמך; seamless-v2: קלדילי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | וְדִי | vedi | whisper-v3: מלכיה; mms-1b: להמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | לְעַמָּךְ | lamakh | whisper-v3: מלכיה; mms-1b: להמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: מלכיה; mms-1b: ישראר | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `prayer/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `prayer/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `prayer/brich-shmei.mp3` | דְּשַׁלִּיט | dshalit | whisper-v3: מלכיה; seamless-v2: דה שליט | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | דְקֻדְשָׁא | dkudsha | whisper-v3: מלכיה; seamless-v2: דה קדושה | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/brich-shmei.mp3` | הוּא | hu | ivrit-turbo: דסגיד; whisper-v3: מלכיה; mms-1b: הו | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `prayer/brich-shmei.mp3` | דְּסָגִידְנָא | dsagidna | ivrit-turbo: נא; seamless-v2: דה סגידנה כמא | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | דְּהוּא | dhu | ivrit-turbo: דהו; whisper-v3: דהו; mms-1b: דהו; seamless-v2: דהו | renikud 100%; lv60 100%; xlsr53 67%; ipa1000 33% |
| `prayer/brich-shmei.mp3` | אֱלָהָא | elaha | ivrit-turbo: אלאה; seamless-v2: אללה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/brich-shmei.mp3` | וּנְבִיאוֹהִי | unviohi | ivrit-turbo: ונביא אויה; whisper-v3: ונביא אוייה; mms-1b: ונביא אויה; seamless-v2: ונביא אוייה | renikud 14%; lv60 57%; xlsr53 57%; ipa1000 57% |
| `prayer/brich-shmei.mp3` | וּמַסְגֵּא | umasge | ivrit-turbo: ומזגה; seamless-v2: ומי זגה | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/brich-shmei.mp3` | לְמֶעְבַּד | lmebad | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 83% |
| `prayer/brich-shmei.mp3` | טָבְוָן | tavan | none | renikud 80%; lv60 60%; xlsr53 80%; ipa1000 60% |
| `prayer/brich-shmei.mp3` | בֵּהּ | be | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | אֲנָא | ana | ivrit-turbo: באנא; whisper-v3: בענה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | יְהֵא | jhe | seamless-v2: יאהה | renikud 100%; lv60 33%; xlsr53 67%; ipa1000 67% |
| `prayer/brich-shmei.mp3` | לִבָּאי | libaj | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 100% |
| `prayer/brich-shmei.mp3` | מִשְׁאֲלִין | mishalin | whisper-v3: משלין; mms-1b: משלין; seamless-v2: משלין | renikud 86%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | יִשְׂרָאֵל | jisrael | ivrit-turbo: ישראיר; whisper-v3: מלכיה; mms-1b: ישראר | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/brich-shmei.mp3` | וּלְחַיִּין | ulkhajin | none | renikud 57%; lv60 14%; xlsr53 14%; ipa1000 43% |
| `prayer/kaddish-1.mp3` | אָמֵן | amen | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | בְרָא | vra | none | renikud 67%; lv60 33%; xlsr53 67%; ipa1000 33% |
| `prayer/kaddish-1.mp3` | כִרְעוּתֵהּ | khirute | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 33% |
| `prayer/kaddish-1.mp3` | וּבְיוֹמֵיכוֹן | uvjomekhon | none | renikud 89%; lv60 67%; xlsr53 67%; ipa1000 56% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | אָמֵן | amen | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | יְהֵא | jhe | whisper-v3: (nothing); seamless-v2: יאהה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | וּלְעָלְמֵי | ulalmej | whisper-v3: (nothing); seamless-v2: וללמי | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | יִתְבָּרַךְ | jitbarakh | whisper-v3: (nothing); seamless-v2: התברך | renikud 88%; lv60 100%; xlsr53 88%; ipa1000 75% |
| `prayer/kaddish-1.mp3` | וְיִשְׁתַּבַּח | vejishtabakh | whisper-v3: (nothing); seamless-v2: והשתבש | renikud 90%; lv60 80%; xlsr53 80%; ipa1000 70% |
| `prayer/kaddish-1.mp3` | וְיִתְפָּאַר | vejitpar | whisper-v3: (nothing); seamless-v2: והתפאר | renikud 88%; lv60 75%; xlsr53 75%; ipa1000 88% |
| `prayer/kaddish-1.mp3` | וְיִתְרוֹמַם | vejitromam | whisper-v3: (nothing); seamless-v2: והתרומם | renikud 50%; lv60 70%; xlsr53 70%; ipa1000 90% |
| `prayer/kaddish-1.mp3` | וְיִתְנַשֵּׂא | vejitnase | whisper-v3: (nothing); seamless-v2: והתנשא | renikud 33%; lv60 78%; xlsr53 67%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | וְיִתְהַדָּר | vejithadar | whisper-v3: (nothing); seamless-v2: והתהדר | renikud 90%; lv60 70%; xlsr53 70%; ipa1000 80% |
| `prayer/kaddish-1.mp3` | וְיִתְעַלֶּה | vejitale | whisper-v3: (nothing); seamless-v2: והתעלה | renikud 88%; lv60 88%; xlsr53 62%; ipa1000 75% |
| `prayer/kaddish-1.mp3` | וְיִתְהַלָּל | vejithalal | whisper-v3: (nothing); seamless-v2: והתעלל | renikud 90%; lv60 70%; xlsr53 80%; ipa1000 80% |
| `prayer/kaddish-1.mp3` | דְקוּדְשָׁא | dkudsha | whisper-v3: (nothing); mms-1b: דה קדשה בריך; seamless-v2: דה קודשה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | בְּרִיךְ | brikh | whisper-v3: (nothing); mms-1b: דה קדשה בריך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `prayer/kaddish-1.mp3` | דַּאֲמִירָן | damiran | whisper-v3: (nothing); mms-1b: דמירן | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | אָמֵן | amen | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | יְהֵא | jhe | whisper-v3: (nothing); seamless-v2: יאהה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | שְׁמַיָּא | shmaja | whisper-v3: (nothing); seamless-v2: שמיהה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | אָמֵן | amen | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kaddish-1.mp3` | בִּמְרוֹמָיו | bimromav | whisper-v3: תודה; mms-1b: בימראומיו | renikud 100%; lv60 88%; xlsr53 88%; ipa1000 75% |
| `prayer/kaddish-1.mp3` | וְאִמְרוּ | veimru | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kaddish-1.mp3` | אָמֵן | amen | ivrit-turbo: אין; whisper-v3: תודה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/shema-vahavta.mp3` | מְצַוְּךָ | mtsaukha | mms-1b: מצך | renikud 67%; lv60 67%; xlsr53 50%; ipa1000 33% |
| `prayer/shema-vahavta.mp3` | בְּבֵיתֶךָ | bvetekha | none | renikud 86%; lv60 86%; xlsr53 71%; ipa1000 71% |
| `prayer/shema-vahavta.mp3` | בַדֶּרֶךְ | vaderekh | none | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 43% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | מַיִם | majim | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע המלך יענה לנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/havdalah-opening.mp3` | יַעֲנֵנוּ | janenu | mms-1b: יהננו; seamless-v2: הושיע המלך יענה לנו | renikud 100%; lv60 83%; xlsr53 100%; ipa1000 100% |
| `line/havdalah-opening.mp3` | קָרְאֵנוּ | karenu | whisper-v3: קרנו; mms-1b: קרנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/havdalah-opening.mp3` | הָיְתָה | hajta | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 60% |
| `line/havdalah-opening.mp3` | וִיקָר | vikar | none | renikud 80%; lv60 80%; xlsr53 60%; ipa1000 60% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | מַיִם | majim | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע המלך יענה לנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/havdalah-opening.mp3` | יַעֲנֵנוּ | janenu | mms-1b: יהננו; seamless-v2: הושיע המלך יענה לנו | renikud 100%; lv60 83%; xlsr53 100%; ipa1000 100% |
| `prayer/havdalah-opening.mp3` | קָרְאֵנוּ | karenu | whisper-v3: קרנו; mms-1b: קרנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/havdalah-opening.mp3` | הָיְתָה | hajta | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 60% |
| `prayer/havdalah-opening.mp3` | וִיקָר | vikar | none | renikud 80%; lv60 80%; xlsr53 60%; ipa1000 60% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/yigdal.mp3` | חַי | khaj | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 100% |
| `prayer/yigdal.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/yigdal.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/yigdal.mp3` | כְּמֹשֶׁה | kmoshe | ivrit-turbo: כמו; whisper-v3: כמו; seamless-v2: כמו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | עוֹד | od | ivrit-turbo: שעוד; whisper-v3: שעוד; seamless-v2: שעוד | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | לְעוֹלָמִים | lolamim | ivrit-turbo: (nothing); whisper-v3: לעולם | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/yigdal.mp3` | לְרָשָׁע | lrasha | mms-1b: לראשה; seamless-v2: לראשה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/yigdal.mp3` | קֵץ | kets | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | whisper-v3: זכר ברוך; mms-1b: באנו; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `line/kiddush-shabbat-eve.mp3` | בְרֵאשִׁית | vreshit | none | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/kiddush-shabbat-eve.mp3` | לִיצִיאַת | litsiat | whisper-v3: זכר ברוך; mms-1b: ליציית | renikud 100%; lv60 100%; xlsr53 83%; ipa1000 67% |
| `line/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | whisper-v3: זכר ברוך; mms-1b: באנו; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `line/kiddush-shabbat-eve.mp3` | בָחַרְתָּ | vakharta | whisper-v3: זכר ברוך | renikud 86%; lv60 71%; xlsr53 86%; ipa1000 71% |
| `line/kiddush-shabbat-eve.mp3` | קָדְשְׁךָ | kadshkha | ivrit-turbo: (nothing); whisper-v3: זכר ברוך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `line/kiddush-shabbat-eve.mp3` | הִנְחַלְתָּנוּ | hinkhaltanu | whisper-v3: זכר ברוך; seamless-v2: הנחתתנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 90% |
| `prayer/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | whisper-v3: זכר ברוך; mms-1b: באנו; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `prayer/kiddush-shabbat-eve.mp3` | בְרֵאשִׁית | vreshit | none | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/kiddush-shabbat-eve.mp3` | לִיצִיאַת | litsiat | whisper-v3: זכר ברוך; mms-1b: ליציית | renikud 100%; lv60 100%; xlsr53 83%; ipa1000 67% |
| `prayer/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | whisper-v3: זכר ברוך; mms-1b: באנו; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `prayer/kiddush-shabbat-eve.mp3` | בָחַרְתָּ | vakharta | whisper-v3: זכר ברוך | renikud 86%; lv60 71%; xlsr53 86%; ipa1000 71% |
| `prayer/kiddush-shabbat-eve.mp3` | קָדְשְׁךָ | kadshkha | ivrit-turbo: (nothing); whisper-v3: זכר ברוך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kiddush-shabbat-eve.mp3` | הִנְחַלְתָּנוּ | hinkhaltanu | whisper-v3: זכר ברוך; seamless-v2: הנחתתנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 90% |
| `prayer/shema-vahavta.mp3` | לְבָבְךָ | lvavkha | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/shema-vahavta.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 33% |
| `prayer/shema-vahavta.mp3` | בַדֶּרֶךְ | vaderekh | whisper-v3: ודרך; mms-1b: ודרך | renikud 86%; lv60 86%; xlsr53 100%; ipa1000 86% |
| `prayer/shema-vahavta.mp3` | וּבְשָׁכְבְּךָ | uvshakhbkha | none | renikud 75%; lv60 62%; xlsr53 75%; ipa1000 62% |
| `prayer/yehalelu.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 100% |
| `line/havdalah-opening.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/havdalah-opening.mp3` | יָהּ | ja | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 100% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | מַיִם | majim | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `line/havdalah-opening.mp3` | בְּשָׂשׁוֹן | bsashon | whisper-v3: בססון; mms-1b: בססון; seamless-v2: בססון ממי עיני ישוע | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 83% |
| `line/havdalah-opening.mp3` | בִרְכָתֶךָ | virkhatekha | none | renikud 44%; lv60 67%; xlsr53 78%; ipa1000 78% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/havdalah-opening.mp3` | בָּךְ | bakh | whisper-v3: (nothing); seamless-v2: באך | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 100% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/havdalah-opening.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 40% |
| `line/havdalah-opening.mp3` | קָרְאֵנוּ | karenu | whisper-v3: קרנו; mms-1b: קרנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `line/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/havdalah-opening.mp3` | יָהּ | ja | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 100% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | מַיִם | majim | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `prayer/havdalah-opening.mp3` | בְּשָׂשׁוֹן | bsashon | whisper-v3: בססון; mms-1b: בססון; seamless-v2: בססון ממי עיני ישוע | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 83% |
| `prayer/havdalah-opening.mp3` | בִרְכָתֶךָ | virkhatekha | none | renikud 44%; lv60 67%; xlsr53 78%; ipa1000 78% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | צְבָאוֹת | tsvaot | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/havdalah-opening.mp3` | בָּךְ | bakh | whisper-v3: (nothing); seamless-v2: באך | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 100% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/havdalah-opening.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 40% |
| `prayer/havdalah-opening.mp3` | קָרְאֵנוּ | karenu | whisper-v3: קרנו; mms-1b: קרנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `prayer/havdalah-opening.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/amidah-elohai-netzor.mp3` | אֱלֹהַי | elohaj | none | renikud 67%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/amidah-elohai-netzor.mp3` | לְשׁוֹנִי | lshoni | ivrit-turbo: לששוני; whisper-v3: לששוני; mms-1b: לשסונים; seamless-v2: העין עצור לשסונים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `line/amidah-elohai-netzor.mp3` | וּשְׂפָתַי | usfataj | whisper-v3: ושפתיים; mms-1b: וספטין | renikud 71%; lv60 71%; xlsr53 57%; ipa1000 86% |
| `line/amidah-elohai-netzor.mp3` | וְלִמְקַלְלַי | velimkalaj | ivrit-turbo: ולמקלי; whisper-v3: ולמכלי; mms-1b: ולמכלי; seamless-v2: ולמקליי | renikud 100%; lv60 90%; xlsr53 80%; ipa1000 80% |
| `line/amidah-elohai-netzor.mp3` | נַפְשִׁי | nafshi | whisper-v3: נפשיסי; mms-1b: נפשיסי; seamless-v2: נפשיסי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | וְנַפְשִׁי | venafshi | whisper-v3: ונפשיסי; mms-1b: ונפשיסי; seamless-v2: ונפשיסי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | כֶּעָפָר | keafar | none | renikud 67%; lv60 67%; xlsr53 50%; ipa1000 50% |
| `line/amidah-elohai-netzor.mp3` | תִּהְיֶה | tihje | none | renikud 60%; lv60 80%; xlsr53 60%; ipa1000 60% |
| `line/amidah-elohai-netzor.mp3` | נַפְשִׁי | nafshi | whisper-v3: נפשיסי; mms-1b: נפשיסי; seamless-v2: נפשיסי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | עָלַי | alaj | none | renikud 75%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/amidah-elohai-netzor.mp3` | רָעָה | ra | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 0% |
| `line/amidah-elohai-netzor.mp3` | עֲצָתָם | atsatam | seamless-v2: חפר את תום וכלכל מחשבת תום | renikud 33%; lv60 33%; xlsr53 50%; ipa1000 33% |
| `line/amidah-elohai-netzor.mp3` | מַחֲשַׁבְתָּם | makhashavtam | seamless-v2: חפר את תום וכלכל מחשבת תום | renikud 70%; lv60 70%; xlsr53 70%; ipa1000 60% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך | renikud 75%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך | renikud 75%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך | renikud 75%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך | renikud 75%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | תּוֹרָתֶךָ | toratekha | ivrit-turbo: תורתך; whisper-v3: תורתך; seamless-v2: תורך | renikud 75%; lv60 75%; xlsr53 50%; ipa1000 50% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך | renikud 75%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | יֵחָלְצוּן | jekhaltsun | ivrit-turbo: תורתך; whisper-v3: תורתך; seamless-v2: רצון | renikud 88%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/amidah-elohai-netzor.mp3` | יְדִידֶיךָ | jdidekha | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: ידידי; seamless-v2: ידידי | renikud 71%; lv60 71%; xlsr53 57%; ipa1000 71% |
| `line/amidah-elohai-netzor.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: חושסי; seamless-v2: חוססי | renikud 80%; lv60 80%; xlsr53 60%; ipa1000 0% |
| `line/amidah-elohai-netzor.mp3` | יְמִינְךָ | jminkha | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: היה | renikud 100%; lv60 83%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | וַעֲנֵנִי | vaneni | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: מנחבהענני; seamless-v2: והנעיני | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `line/amidah-elohai-netzor.mp3` | יִהְיוּ | jihju | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 40% |
| `line/amidah-elohai-netzor.mp3` | אִמְרֵי | imrej | whisper-v3: עם; mms-1b: עם; seamless-v2: עם | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/amidah-elohai-netzor.mp3` | פִי | fi | whisper-v3: ריפי; mms-1b: ריפי; seamless-v2: רייפי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְפָנֶיךָ | lfanekha | none | renikud 57%; lv60 86%; xlsr53 57%; ipa1000 57% |
| `line/amidah-elohai-netzor.mp3` | יְהוָה | adonaj | none | renikud 83%; lv60 50%; xlsr53 67%; ipa1000 83% |
| `line/amidah-elohai-netzor.mp3` | וְגוֹאֲלִי | vegoali | ivrit-turbo: וגולי; whisper-v3: וגולי; mms-1b: וגולי; seamless-v2: וגולי | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 71% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 75%; xlsr53 100%; ipa1000 75% |
| `prayer/amidah-elohai-netzor.mp3` | שְׁמֶךָ | shmekha | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען שמיך עשה למעען ימיניך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 75%; xlsr53 100%; ipa1000 75% |
| `prayer/amidah-elohai-netzor.mp3` | יְמִינֶךָ | jminekha | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: קדשתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 75%; xlsr53 100%; ipa1000 75% |
| `prayer/amidah-elohai-netzor.mp3` | קְדֻשָּׁתֶךָ | kdushatekha | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 100%; xlsr53 89%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 75%; xlsr53 100%; ipa1000 75% |
| `prayer/amidah-elohai-netzor.mp3` | תּוֹרָתֶךָ | toratekha | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 62% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתך; mms-1b: למעען תורתיך למעען | renikud 100%; lv60 75%; xlsr53 100%; ipa1000 75% |
| `prayer/amidah-elohai-netzor.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `line/amidah-elohai-netzor.mp3` | הָפֵר | hafer | whisper-v3: אפר; seamless-v2: אפר | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/amidah-elohai-netzor.mp3` | עֲצָתָם | atsatam | seamless-v2: אתתם | renikud 100%; lv60 83%; xlsr53 50%; ipa1000 50% |
| `line/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | שְׁמֶךָ | shmekha | ivrit-turbo: תורתך; whisper-v3: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | יְמִינֶךָ | jminekha | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: ימיניך אה למען קדשתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `line/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | קְדֻשָּׁתֶךָ | kdushatekha | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 89%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | תּוֹרָתֶךָ | toratekha | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `line/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/amidah-elohai-netzor.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | הָפֵר | hafer | whisper-v3: אפר; seamless-v2: אפר | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `prayer/amidah-elohai-netzor.mp3` | עֲצָתָם | atsatam | seamless-v2: אתתם | renikud 100%; lv60 83%; xlsr53 50%; ipa1000 50% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | שְׁמֶךָ | shmekha | ivrit-turbo: תורתך; whisper-v3: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | יְמִינֶךָ | jminekha | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: ימיניך אה למען קדשתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 86% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | קְדֻשָּׁתֶךָ | kdushatekha | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 89%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | עֲשֵׂה | ase | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | תּוֹרָתֶךָ | toratekha | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `prayer/amidah-elohai-netzor.mp3` | לְמַעַן | lman | ivrit-turbo: תורתך; whisper-v3: תורתיך; mms-1b: תורתיך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/amidah-elohai-netzor.mp3` | הוֹשִׁיעָה | hoshia | ivrit-turbo: הושיע; whisper-v3: הושיע; mms-1b: הושיע; seamless-v2: הושיע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | whisper-v3: דוד לך ומברכים אותך יתברך שמך; seamless-v2: אלוהים | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | צוּר | tsur | none | renikud 100%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `prayer/haftarah-after.mp3` | הָאֹמֵר | haomer | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | whisper-v3: דוד לך ומברכים אותך יתברך שמך; seamless-v2: אלוהים | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד משיחך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | בֵּית | bet | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | whisper-v3: דוד לך ומברכים אותך יתברך שמך; seamless-v2: אלוהים | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | בֵּית | bet | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | דָּוִד | david | ivrit-turbo: דוד משיחך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד משיחך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | דָּוִד | david | ivrit-turbo: דוד משיחך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד משיחך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | הַנְּבִיאִים | hanvim | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: הנביים | renikud 100%; lv60 83%; xlsr53 100%; ipa1000 83% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | whisper-v3: דוד לך ומברכים אותך יתברך שמך; seamless-v2: אלוהים | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד משיחך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | whisper-v3: דוד לך ומברכים אותך יתברך שמך; seamless-v2: אלוהים | renikud 100%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲנַחְנוּ | anakhnu | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 83%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | מוֹדִים | modim | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/haftarah-after.mp3` | לָךְ | lakh | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | וּמְבָרְכִים | umvarkhim | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 88%; xlsr53 88%; ipa1000 88% |
| `prayer/haftarah-after.mp3` | אוֹתָךְ | otakh | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `prayer/haftarah-after.mp3` | יִתְבָּרַךְ | jitbarakh | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 88%; ipa1000 75% |
| `prayer/haftarah-after.mp3` | שִׁמְךָ | shimkha | ivrit-turbo: לך ומברכים אותך יתברך שמך; whisper-v3: דוד לך ומברכים אותך יתברך שמך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | חַי | khaj | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | whisper-v3: דוד לך ומברכים אותך יתברך שמך; mms-1b: אדוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/cafe-03-f.mp3` | רוֹצָה | rotsa | none | renikud 100%; lv60 25%; xlsr53 100%; ipa1000 50% |
| `line/torah-numbers-32-39.mp3` | בְּנֵי | bnej | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/torah-numbers-32-39.mp3` | וַיִּלְכְּדֻהָ | vajilkduha | ivrit-turbo: וילקדוהה; mms-1b: גילדה ויל קדוהה | renikud 70%; lv60 80%; xlsr53 80%; ipa1000 70% |
| `line/yigdal-l7.mp3` | קָם | kam | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 33% |
| `line/yigdal-l7.mp3` | כְּמֹשֶׁה | kmoshe | ivrit-turbo: כמו שסר; whisper-v3: כמו שסר; mms-1b: כמושאסה עודנביא; seamless-v2: כמו שסר | renikud 80%; lv60 80%; xlsr53 80%; ipa1000 60% |
| `line/sim-shalom-l1.mp3` | כָּל | kal | none | renikud 0%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `line/sim-shalom-l1.mp3` | בְּאוֹר | bor | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `line/sim-shalom-l1.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/sim-shalom-l1.mp3` | בְאוֹר | vor | none | renikud 67%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `line/aleinu-1.mp3` | לְשַׁבֵּחַ | lshabeakh | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 86% |
| `line/aleinu-1.mp3` | שָׂמָנוּ | samanu | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/aleinu-1.mp3` | מִשְׁתַּחֲוִים | mishtakhavim | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/aleinu-1.mp3` | וָרִיק | varik | ivrit-turbo: (nothing); mms-1b: בריק | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `line/aleinu-1.mp3` | יוֹשִׁיעַ | joshia | ivrit-turbo: (nothing); whisper-v3: (nothing); seamless-v2: יוסיה | renikud 100%; lv60 100%; xlsr53 80%; ipa1000 100% |
| `line/aleinu-1.mp3` | וַאֲנַחְנוּ | vanakhnu | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/aleinu-1.mp3` | מִשְׁתַּחֲוִים | mishtakhavim | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/aleinu-1.mp3` | עֻזּוֹ | uzo | ivrit-turbo: וזו; whisper-v3: וזו; mms-1b: וזו; seamless-v2: וזו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/aleinu-1.mp3` | וְיָדַעְתָּ | vejadata | ivrit-turbo: (nothing); mms-1b: וידת | renikud 100%; lv60 100%; xlsr53 88%; ipa1000 100% |
| `line/aleinu-1.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/aleinu-1.mp3` | הָאָרֶץ | harets | seamless-v2: האדמה | renikud 100%; lv60 60%; xlsr53 100%; ipa1000 60% |
| `line/aleinu-1.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/aleinu-1.mp3` | לְשַׁבֵּחַ | lshabeakh | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 86% |
| `prayer/aleinu-1.mp3` | שָׂמָנוּ | samanu | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/aleinu-1.mp3` | מִשְׁתַּחֲוִים | mishtakhavim | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | וָרִיק | varik | ivrit-turbo: (nothing); mms-1b: בריק | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/aleinu-1.mp3` | יוֹשִׁיעַ | joshia | ivrit-turbo: (nothing); whisper-v3: (nothing); seamless-v2: יוסיה | renikud 100%; lv60 100%; xlsr53 80%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | וַאֲנַחְנוּ | vanakhnu | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | מִשְׁתַּחֲוִים | mishtakhavim | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | עֻזּוֹ | uzo | ivrit-turbo: וזו; whisper-v3: וזו; mms-1b: וזו; seamless-v2: וזו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | וְיָדַעְתָּ | vejadata | ivrit-turbo: (nothing); mms-1b: וידת | renikud 100%; lv60 100%; xlsr53 88%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/aleinu-1.mp3` | הָאָרֶץ | harets | seamless-v2: האדמה | renikud 100%; lv60 60%; xlsr53 100%; ipa1000 60% |
| `prayer/aleinu-1.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/kaddish-1-l4.mp3` | יִתְבָּרַךְ | jitbarakh | whisper-v3: התברך; seamless-v2: התברך | renikud 88%; lv60 100%; xlsr53 88%; ipa1000 75% |
| `line/kaddish-1-l4.mp3` | וְיִשְׁתַּבַּח | vejishtabakh | whisper-v3: והשתבח; seamless-v2: והשתבח | renikud 90%; lv60 90%; xlsr53 80%; ipa1000 60% |
| `line/kaddish-1-l4.mp3` | וְיִתְפָּאַר | vejitpar | whisper-v3: והתפער; seamless-v2: והתפאר | renikud 88%; lv60 88%; xlsr53 75%; ipa1000 62% |
| `line/kaddish-1-l4.mp3` | וְיִתְרוֹמַם | vejitromam | whisper-v3: והתרומם; seamless-v2: והתרומם | renikud 90%; lv60 90%; xlsr53 80%; ipa1000 60% |
| `line/kaddish-1-l4.mp3` | וְיִתְנַשֵּׂא | vejitnase | whisper-v3: והתנסה; seamless-v2: והתנסה | renikud 89%; lv60 78%; xlsr53 67%; ipa1000 67% |
| `line/kaddish-1-l4.mp3` | וְיִתְהַדָּר | vejithadar | whisper-v3: והתהדר; seamless-v2: והתהדר | renikud 90%; lv60 60%; xlsr53 70%; ipa1000 70% |
| `line/kaddish-1-l4.mp3` | וְיִתְעַלֶּה | vejitale | whisper-v3: והתעלה; seamless-v2: והתעלה | renikud 88%; lv60 62%; xlsr53 62%; ipa1000 75% |
| `line/kaddish-1-l4.mp3` | וְיִתְהַלָּל | vejithalal | whisper-v3: והתהלל; seamless-v2: והתעלל | renikud 90%; lv60 70%; xlsr53 60%; ipa1000 70% |
| `line/kaddish-1-l4.mp3` | דְקוּדְשָׁא | dkudsha | whisper-v3: דה קודשה בריך; mms-1b: דה קדשה בריך; seamless-v2: דה קודשה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/kaddish-1-l4.mp3` | בְּרִיךְ | brikh | whisper-v3: דה קודשה בריך; mms-1b: דה קדשה בריך | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 75% |
| `prayer/sim-shalom.mp3` | כָּל | kal | none | renikud 0%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/sim-shalom.mp3` | בְּאוֹר | bor | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/sim-shalom.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/sim-shalom.mp3` | בְאוֹר | vor | none | renikud 67%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `line/kiddush-shabbat-eve.mp3` | בְּמִצְוֹתָיו | bmitsvotav | seamless-v2: במצאיו | renikud 78%; lv60 67%; xlsr53 78%; ipa1000 67% |
| `line/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | ivrit-turbo: (nothing); whisper-v3: זכר אתה; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `line/kiddush-shabbat-eve.mp3` | כִּי | ki | ivrit-turbo: (nothing); whisper-v3: זכר אתה; mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/kiddush-shabbat-eve.mp3` | לִיצִיאַת | litsiat | whisper-v3: זכר אתה; mms-1b: להציאת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `line/kiddush-shabbat-eve.mp3` | כִּי | ki | ivrit-turbo: (nothing); whisper-v3: זכר אתה; mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | ivrit-turbo: (nothing); whisper-v3: זכר אתה; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `line/kiddush-shabbat-eve.mp3` | בָחַרְתָּ | vakharta | ivrit-turbo: (nothing); whisper-v3: זכר אתה | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 71% |
| `line/kiddush-shabbat-eve.mp3` | וְאוֹתָנוּ | veotanu | ivrit-turbo: (nothing); whisper-v3: זכר אתה | renikud 100%; lv60 100%; xlsr53 86%; ipa1000 100% |
| `line/kiddush-shabbat-eve.mp3` | קִדַּשְׁתָּ | kidashta | ivrit-turbo: (nothing); whisper-v3: זכר אתה | renikud 86%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/kiddush-shabbat-eve.mp3` | בְּמִצְוֹתָיו | bmitsvotav | seamless-v2: במצאיו | renikud 78%; lv60 67%; xlsr53 78%; ipa1000 67% |
| `prayer/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | ivrit-turbo: (nothing); whisper-v3: זכר אתה; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `prayer/kiddush-shabbat-eve.mp3` | כִּי | ki | ivrit-turbo: (nothing); whisper-v3: זכר אתה; mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/kiddush-shabbat-eve.mp3` | לִיצִיאַת | litsiat | whisper-v3: זכר אתה; mms-1b: להציאת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/kiddush-shabbat-eve.mp3` | כִּי | ki | ivrit-turbo: (nothing); whisper-v3: זכר אתה; mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/kiddush-shabbat-eve.mp3` | בָנוּ | vanu | ivrit-turbo: (nothing); whisper-v3: זכר אתה; seamless-v2: באנו | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `prayer/kiddush-shabbat-eve.mp3` | בָחַרְתָּ | vakharta | ivrit-turbo: (nothing); whisper-v3: זכר אתה | renikud 86%; lv60 86%; xlsr53 86%; ipa1000 71% |
| `prayer/kiddush-shabbat-eve.mp3` | וְאוֹתָנוּ | veotanu | ivrit-turbo: (nothing); whisper-v3: זכר אתה | renikud 100%; lv60 100%; xlsr53 86%; ipa1000 100% |
| `prayer/kiddush-shabbat-eve.mp3` | קִדַּשְׁתָּ | kidashta | ivrit-turbo: (nothing); whisper-v3: זכר אתה | renikud 86%; lv60 86%; xlsr53 100%; ipa1000 100% |
| `prayer/vahavta-2.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 67%; xlsr53 50%; ipa1000 33% |
| `prayer/vahavta-2.mp3` | בַדֶּרֶךְ | vaderekh | none | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `prayer/vahavta-2.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 67%; xlsr53 50%; ipa1000 33% |
| `prayer/vahavta-2.mp3` | בַדֶּרֶךְ | vaderekh | none | renikud 71%; lv60 71%; xlsr53 71%; ipa1000 57% |
| `line/sim-shalom-l1.mp3` | בְּאוֹר | bor | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/sim-shalom-l1.mp3` | בְאוֹר | vor | none | renikud 67%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `line/bless-priestly-1.mp3` | יְבָרֶכְךָ | jvarekha | ivrit-turbo: יברך; whisper-v3: יברך; mms-1b: יבריך; seamless-v2: יברך אותך | renikud 86%; lv60 100%; xlsr53 86%; ipa1000 71% |
| `line/torah-numbers-6-24.mp3` | יְבָרֶכְךָ | jvarekha | whisper-v3: יברך; mms-1b: יברך | renikud 86%; lv60 71%; xlsr53 71%; ipa1000 57% |
| `line/torah-numbers-6-24.mp3` | וְיִשְׁמְרֶךָ | vejishmrekha | mms-1b: והשמליך | renikud 100%; lv60 60%; xlsr53 70%; ipa1000 40% |
| `prayer/bless-priestly-1.mp3` | יְבָרֶכְךָ | jvarekha | whisper-v3: יברך; mms-1b: יבריך; seamless-v2: יברך אותך | renikud 86%; lv60 71%; xlsr53 86%; ipa1000 86% |
| `prayer/shir-hamaalot.mp3` | אֲדֹנָי | adonaj | whisper-v3: (nothing); mms-1b: ידוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/shir-hamaalot.mp3` | הָיִינוּ | hajinu | whisper-v3: (nothing); mms-1b: האינו | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/shir-hamaalot.mp3` | אָז | az | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/shir-hamaalot.mp3` | שְׂחוֹק | skhok | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/shir-hamaalot.mp3` | אָז | az | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/shir-hamaalot.mp3` | בַגּוֹיִם | vagojim | seamless-v2: פגויים | renikud 86%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `prayer/shir-hamaalot.mp3` | אֲדֹנָי | adonaj | whisper-v3: (nothing); mms-1b: ידוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/shir-hamaalot.mp3` | אֲדֹנָי | adonaj | whisper-v3: (nothing); mms-1b: ידוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/shir-hamaalot.mp3` | עִמָּנוּ | imanu | whisper-v3: (nothing); seamless-v2: איתנו | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/shir-hamaalot.mp3` | הָיִינוּ | hajinu | whisper-v3: (nothing); mms-1b: האינו | renikud 83%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/shir-hamaalot.mp3` | אֲדֹנָי | adonaj | whisper-v3: (nothing); mms-1b: ידוה | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `prayer/shir-hamaalot.mp3` | הַזֹּרְעִים | hazorim | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: הזורים; seamless-v2: הזורים | renikud 100%; lv60 86%; xlsr53 71%; ipa1000 57% |
| `prayer/shir-hamaalot.mp3` | בְּדִמְעָה | bdima | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: בדימה; seamless-v2: בדימה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/shir-hamaalot.mp3` | בְּרִנָּה | brina | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/shir-hamaalot.mp3` | הַזָּרַע | hazara | none | renikud 83%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `prayer/shir-hamaalot.mp3` | בְרִנָּה | vrina | none | renikud 60%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `line/kaddish-1-l2.mp3` | בְרָא | vra | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 33% |
| `line/kaddish-1-l2.mp3` | כִרְעוּתֵהּ | khirute | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 33% |
| `line/kaddish-1-l2.mp3` | וּבְיוֹמֵיכוֹן | uvjomekhon | none | renikud 89%; lv60 67%; xlsr53 22%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | ivrit-turbo: דוד משיכך; seamless-v2: אלוהים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/haftarah-after.mp3` | צוּר | tsur | none | renikud 100%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `prayer/haftarah-after.mp3` | הוּא | hu | none | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | ivrit-turbo: דוד משיכך; seamless-v2: אלוהים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/haftarah-after.mp3` | כִּי | ki | ivrit-turbo: (nothing); mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | כִּי | ki | ivrit-turbo: (nothing); mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/haftarah-after.mp3` | הִיא | hi | mms-1b: הי | renikud 100%; lv60 100%; xlsr53 50%; ipa1000 50% |
| `prayer/haftarah-after.mp3` | בְיָמֵינוּ | vjamenu | none | renikud 86%; lv60 86%; xlsr53 57%; ipa1000 71% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | שַׂמְּחֵנוּ | samkhenu | none | renikud 86%; lv60 71%; xlsr53 71%; ipa1000 86% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | ivrit-turbo: דוד משיכך; seamless-v2: אלוהים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/haftarah-after.mp3` | דָּוִד | david | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | זָר | zar | none | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | יִנְחֲלוּ | jinkhalu | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 86% |
| `prayer/haftarah-after.mp3` | כִּי | ki | ivrit-turbo: (nothing); mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | דָּוִד | david | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | הַתּוֹרָה | hatora | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 50% |
| `prayer/haftarah-after.mp3` | וְעַל | veal | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | הָעֲבוֹדָה | havoda | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `prayer/haftarah-after.mp3` | וְעַל | veal | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | הַנְּבִיאִים | hanvim | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 83% |
| `prayer/haftarah-after.mp3` | וְעַל | veal | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | יוֹם | jom | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | ivrit-turbo: דוד משיכך; seamless-v2: אלוהים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/haftarah-after.mp3` | עַל | al | ivrit-turbo: דוד; whisper-v3: דוד שבת | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/haftarah-after.mp3` | אֱלֹהֵינוּ | elohenu | ivrit-turbo: דוד משיכך; seamless-v2: אלוהים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/haftarah-after.mp3` | חַי | khaj | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 100% |
| `prayer/haftarah-after.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: דוד משיכך; mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/sim-shalom.mp3` | בְּאוֹר | bor | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/sim-shalom.mp3` | בְאוֹר | vor | none | renikud 67%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `line/haftarah-after-l3.mp3` | שַׂמְּחֵנוּ | samkhenu | whisper-v3: סמכנו | renikud 86%; lv60 71%; xlsr53 71%; ipa1000 86% |
| `line/haftarah-after-l3.mp3` | אֲדֹנָי | adonaj | whisper-v3: (nothing); mms-1b: ידוה | renikud 50%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `line/haftarah-after-l3.mp3` | בֵּית | bet | whisper-v3: סמכנו | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `line/haftarah-after-l3.mp3` | דָּוִד | david | ivrit-turbo: עיד; whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/haftarah-after-l3.mp3` | זָר | zar | whisper-v3: סמכנו | renikud 100%; lv60 67%; xlsr53 100%; ipa1000 67% |
| `line/haftarah-after-l3.mp3` | כִּי | ki | whisper-v3: (nothing); mms-1b: הי | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/haftarah-after-l3.mp3` | בָּרוּךְ | barukh | whisper-v3: (nothing); seamless-v2: ברור | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 40% |
| `line/haftarah-after-l3.mp3` | אֲדֹנָי | adonaj | whisper-v3: (nothing); mms-1b: ידוה | renikud 50%; lv60 83%; xlsr53 83%; ipa1000 83% |
| `line/haftarah-after-l3.mp3` | דָּוִד | david | ivrit-turbo: עיד; whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kiddush-zachor.mp3` | הַשַׁבָּת | hashabat | none | renikud 100%; lv60 100%; xlsr53 71%; ipa1000 71% |
| `prayer/kiddush-zachor.mp3` | לַאֲדֹנָי | ladonaj | mms-1b: לאדוה; seamless-v2: ליהוה אליך | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 100% |
| `prayer/kiddush-zachor.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 67%; ipa1000 67% |
| `prayer/kiddush-zachor.mp3` | וַיָּנַח | vajanakh | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: וא הינך; seamless-v2: ויאנח | renikud 100%; lv60 86%; xlsr53 86%; ipa1000 71% |
| `prayer/kiddush-zachor.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 67%; ipa1000 67% |
| `prayer/kiddush-zachor.mp3` | הַשַׁבָּת | hashabat | none | renikud 100%; lv60 100%; xlsr53 71%; ipa1000 71% |
| `prayer/kiddush-zachor.mp3` | וַיְקַדְּשֵׁהוּ | vajkadshehu | mms-1b: והיכדשהו; seamless-v2: ויאקדשו | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 60% |
| `prayer/shir-hamaalot.mp3` | אֶת | et | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 100% |
| `prayer/shir-hamaalot.mp3` | הָיִינוּ | hajinu | mms-1b: האינו | renikud 83%; lv60 83%; xlsr53 67%; ipa1000 67% |
| `prayer/shir-hamaalot.mp3` | שְׂחוֹק | skhok | none | renikud 50%; lv60 25%; xlsr53 50%; ipa1000 50% |
| `prayer/shir-hamaalot.mp3` | בַגּוֹיִם | vagojim | seamless-v2: בגורים | renikud 57%; lv60 71%; xlsr53 43%; ipa1000 43% |
| `prayer/shir-hamaalot.mp3` | הָיִינוּ | hajinu | mms-1b: האינו | renikud 83%; lv60 83%; xlsr53 67%; ipa1000 67% |
| `prayer/shir-hamaalot.mp3` | אֶת | et | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 100% |
| `prayer/shir-hamaalot.mp3` | הַזֹּרְעִים | hazorim | ivrit-turbo: (nothing); whisper-v3: דמעה; seamless-v2: הזורים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `prayer/shir-hamaalot.mp3` | בְּדִמְעָה | bdima | whisper-v3: דמעה; seamless-v2: בדימה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/shir-hamaalot.mp3` | הַזָּרַע | hazara | none | renikud 83%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `prayer/shir-hamaalot.mp3` | בְרִנָּה | vrina | none | renikud 60%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `line/torah-exodus-16-28.mp3` | יְהוָה | adonaj | mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/torah-exodus-16-28.mp3` | מִצְוֹתַי | mitsvotaj | ivrit-turbo: מצוותי; whisper-v3: מצוותיי; mms-1b: מצבותי; seamless-v2: מצוותיי | renikud 100%; lv60 62%; xlsr53 88%; ipa1000 88% |
| `line/kedushah-yimloch.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: (nothing); seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kedushah-yimloch.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: (nothing); seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/yigdal-l7.mp3` | קָם | kam | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/yigdal-l7.mp3` | עוֹד | od | ivrit-turbo: סעוד; whisper-v3: סעוד; seamless-v2: סעוד | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/yigdal-l7.mp3` | תְּמוּנָתוֹ | tmunato | whisper-v3: תפעונתו; mms-1b: אפרונתו; seamless-v2: תופעתו | renikud 100%; lv60 71%; xlsr53 57%; ipa1000 57% |
| `line/lecha-hashem.mp3` | כֹל | khol | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/lecha-hashem.mp3` | לַהֲדֹם | lahadom | whisper-v3: לאדום; seamless-v2: לאדום | renikud 86%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/lecha-hashem.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | כִּי | ki | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/lecha-hashem.mp3` | כֹל | khol | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | קָדוֹשׁ | kadosh | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/lecha-hashem.mp3` | הוּא | hu | none | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 0% |
| `prayer/lecha-hashem.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | כִּי | ki | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: היא; seamless-v2: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/lecha-hashem.mp3` | קָדוֹשׁ | kadosh | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/lecha-hashem.mp3` | אֲדֹנָי | adonaj | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: אדוי | renikud 100%; lv60 83%; xlsr53 83%; ipa1000 67% |
| `line/avot-1.mp3` | וֵאלֹהֵי | velohej | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `line/avot-1.mp3` | יִצְחָק | jitskhak | none | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/avot-1.mp3` | וֵאלֹהֵי | velohej | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 71% |
| `line/avot-1.mp3` | הַגִּבּוֹר | hagibor | none | renikud 100%; lv60 100%; xlsr53 71%; ipa1000 71% |
| `line/avot-1.mp3` | מֶלֶךְ | melekh | ivrit-turbo: שיעה; whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/avot-1.mp3` | עוֹזֵר | ozer | ivrit-turbo: שיעה; whisper-v3: (nothing) | renikud 100%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `line/avot-1.mp3` | וּמוֹשִׁיעַ | umoshia | ivrit-turbo: שיעה; whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 83%; ipa1000 83% |
| `prayer/avot-1.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוי | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/avot-1.mp3` | יִצְחָק | jitskhak | none | renikud 100%; lv60 50%; xlsr53 83%; ipa1000 67% |
| `prayer/avot-1.mp3` | בְּאַהֲבָה | bahava | none | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/shema-vahavta-l3.mp3` | מְצַוְּךָ | mtsaukha | seamless-v2: מצפה | renikud 83%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/vahavta-2-l1.mp3` | מְצַוְּךָ | mtsaukha | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `line/vahavta-full-l2.mp3` | אֲשֶׁר | asher | ivrit-turbo: אשף; whisper-v3: אשף; mms-1b: אשף; seamless-v2: השף | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 50% |
| `line/vahavta-full-l2.mp3` | אָנֹכִי | anokhi | ivrit-turbo: רנוכי; whisper-v3: רנוכי; mms-1b: רנוחי; seamless-v2: רנוכי | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `line/vahavta-full-l2.mp3` | מְצַוְּךָ | mtsaukha | whisper-v3: מצב; mms-1b: מצב; seamless-v2: מצף | renikud 50%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `line/vahavta-full-l2.mp3` | הַיּוֹם | hajom | ivrit-turbo: יום; whisper-v3: חיום; mms-1b: חיום | renikud 100%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/vahavta-full-l2.mp3` | לְבָבֶךָ | lvavekha | none | renikud 86%; lv60 57%; xlsr53 57%; ipa1000 43% |
| `line/yehalelu-l2.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: (nothing); seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 50%; ipa1000 100% |
| `prayer/adon-olam-1.mp3` | מָלַךְ | malakh | none | renikud 60%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `prayer/adon-olam-1.mp3` | אֲזַי | azaj | mms-1b: הזי; seamless-v2: הזי | renikud 100%; lv60 75%; xlsr53 75%; ipa1000 75% |
| `prayer/adon-olam-1.mp3` | וְאַחֲרֵי | veakharej | none | renikud 100%; lv60 62%; xlsr53 75%; ipa1000 62% |
| `prayer/adon-olam-1.mp3` | בְּלִי | bli | ivrit-turbo: תכלית; whisper-v3: תכלית | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/adon-olam-1.mp3` | רֵאשִׁית | reshit | ivrit-turbo: תכלית; whisper-v3: תכלית | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 80% |
| `prayer/adon-olam-1.mp3` | בְּלִי | bli | ivrit-turbo: תכלית; whisper-v3: תכלית | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/adon-olam-1.mp3` | תַכְלִית | takhlit | ivrit-turbo: תכלית; whisper-v3: תכלית | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/adon-olam-1.mp3` | וְאָעִירָה | veaira | whisper-v3: והעירה; mms-1b: והעירה; seamless-v2: והעירה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 67% |
| `prayer/adon-olam-1.mp3` | גְּוִיָּתִי | gvijati | none | renikud 100%; lv60 71%; xlsr53 71%; ipa1000 100% |
| `line/kedushah-yimloch.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: (nothing); seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 50%; ipa1000 100% |
| `prayer/kedushah-yimloch.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: (nothing); seamless-v2: (nothing) | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 100% |
| `prayer/kiddush-veshamru.mp3` | בְנֵי | vnej | none | renikud 75%; lv60 50%; xlsr53 50%; ipa1000 75% |
| `prayer/kiddush-veshamru.mp3` | הִוא | hi | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 0% |
| `prayer/kiddush-veshamru.mp3` | אֲדֹנָי | adonaj | mms-1b: ידוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/kiddush-veshamru.mp3` | הַשָּׁמַיִם | hashamajim | none | renikud 100%; lv60 56%; xlsr53 67%; ipa1000 78% |
| `prayer/kiddush-veshamru.mp3` | הָאָרֶץ | harets | none | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 0% |
| `prayer/kiddush-veshamru.mp3` | וַיִּנָּפַשׁ | vajinafash | whisper-v3: הוא הינפש; mms-1b: ו היינפש | renikud 67%; lv60 78%; xlsr53 78%; ipa1000 78% |
| `line/hanerot-halalu.mp3` | וִישׁוּעוֹתֶיךָ | vishuotekha | whisper-v3: ואישועותיך; seamless-v2: ואישויותיך | renikud 100%; lv60 89%; xlsr53 89%; ipa1000 100% |
| `prayer/hanerot-halalu.mp3` | מַדְלִיקִין | madlikin | whisper-v3: מדליקים; seamless-v2: מדליקים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 88% |
| `prayer/hanerot-halalu.mp3` | וִישׁוּעוֹתֶיךָ | vishuotekha | whisper-v3: ואישועותיך; seamless-v2: ואישויותיך | renikud 100%; lv60 89%; xlsr53 89%; ipa1000 100% |
| `line/torah-exodus-16-28.mp3` | יְהוָה | adonaj | mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 50% |
| `line/torah-exodus-16-28.mp3` | מִצְוֹתַי | mitsvotaj | ivrit-turbo: מצוותי; whisper-v3: מצוותיי; mms-1b: מצבותי; seamless-v2: מצוותיי | renikud 100%; lv60 75%; xlsr53 88%; ipa1000 75% |
| `line/torah-leviticus-27-18.mp3` | מֵעֶרְכֶּךָ | merkekha | ivrit-turbo: מרכך; whisper-v3: מרקחה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `line/kaddish-1-l6.mp3` | יְהֵא | jhe | whisper-v3: יהשלמה הרבה; mms-1b: יהש | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/kaddish-1-l6.mp3` | שְׁלָמָא | shlama | whisper-v3: יהשלמה הרבה; mms-1b: למע; seamless-v2: השלמה | renikud 80%; lv60 80%; xlsr53 80%; ipa1000 80% |
| `line/kaddish-1-l6.mp3` | רַבָּא | raba | whisper-v3: יהשלמה הרבה; seamless-v2: הרבה | renikud 75%; lv60 75%; xlsr53 75%; ipa1000 50% |
| `line/kaddish-1-l6.mp3` | וְחַיִּים | vekhajim | ivrit-turbo: יוחאים | renikud 71%; lv60 43%; xlsr53 57%; ipa1000 57% |
| `line/kaddish-1-l6.mp3` | כָּל | kal | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/kaddish-1-l6.mp3` | יִשְׂרָאֵל | jisrael | none | renikud 100%; lv60 71%; xlsr53 86%; ipa1000 57% |
| `line/kaddish-1-l6.mp3` | וְאִמְרוּ | veimru | none | renikud 67%; lv60 50%; xlsr53 67%; ipa1000 50% |
| `line/vayehi-binsoa.mp3` | בִּנְסֹעַ | binsoa | ivrit-turbo: בנשא | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/vayehi-binsoa.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/vayehi-binsoa.mp3` | בָּרוּךְ | barukh | seamless-v2: ברור | renikud 100%; lv60 80%; xlsr53 60%; ipa1000 60% |
| `prayer/vayehi-binsoa.mp3` | בִּנְסֹעַ | binsoa | ivrit-turbo: בנשא | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/vayehi-binsoa.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/vayehi-binsoa.mp3` | בָּרוּךְ | barukh | seamless-v2: ברור | renikud 0%; lv60 80%; xlsr53 80%; ipa1000 60% |
| `line/haftarah-after-l1.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/haftarah-after-l1.mp3` | צוּר | tsur | none | renikud 100%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `line/haftarah-after-l1.mp3` | הוּא | hu | none | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 50% |
| `line/haftarah-after-l1.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/haftarah-after-l1.mp3` | כִּי | ki | ivrit-turbo: מדבריך; mms-1b: הי | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/haftarah-after-l1.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `prayer/yehalelu.mp3` | לִבְנֵי | livnej | none | renikud 100%; lv60 100%; xlsr53 67%; ipa1000 67% |
| `prayer/yehalelu.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/aleinu-1.mp3` | בְּרֵאשִׁית | breshit | none | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 33% |
| `line/aleinu-1.mp3` | הָאֲרָצוֹת | haratsot | none | renikud 100%; lv60 71%; xlsr53 100%; ipa1000 57% |
| `line/aleinu-1.mp3` | נוֹטֶה | note | ivrit-turbo: (nothing); whisper-v3: נותן תה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/aleinu-1.mp3` | שָׁמַיִם | shamajim | none | renikud 100%; lv60 57%; xlsr53 71%; ipa1000 71% |
| `line/aleinu-1.mp3` | עֻזּוֹ | uzo | none | renikud 33%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `line/aleinu-1.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/aleinu-1.mp3` | בְּרֵאשִׁית | breshit | none | renikud 100%; lv60 50%; xlsr53 100%; ipa1000 33% |
| `prayer/aleinu-1.mp3` | הָאֲרָצוֹת | haratsot | none | renikud 100%; lv60 71%; xlsr53 100%; ipa1000 57% |
| `prayer/aleinu-1.mp3` | נוֹטֶה | note | ivrit-turbo: (nothing); whisper-v3: נותן תה | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/aleinu-1.mp3` | שָׁמַיִם | shamajim | none | renikud 100%; lv60 57%; xlsr53 71%; ipa1000 71% |
| `prayer/aleinu-1.mp3` | עֻזּוֹ | uzo | none | renikud 33%; lv60 33%; xlsr53 33%; ipa1000 33% |
| `prayer/aleinu-1.mp3` | אֵין | ejn | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/kaddish-1-l6.mp3` | יְהֵא | jhe | whisper-v3: יהש; mms-1b: יהשס; seamless-v2: יהושע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `line/kaddish-1-l6.mp3` | שְׁלָמָא | shlama | ivrit-turbo: שסלמו; whisper-v3: אסלמו; mms-1b: למארה; seamless-v2: למור | renikud 80%; lv60 60%; xlsr53 60%; ipa1000 60% |
| `line/kaddish-1-l6.mp3` | שְׁמַיָּא | shmaja | mms-1b: ששמעיי; seamless-v2: השמיים | renikud 80%; lv60 80%; xlsr53 60%; ipa1000 80% |
| `line/kaddish-1-l6.mp3` | כָּל | kal | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/kaddish-1-l6.mp3` | יִשְׂרָאֵל | jisrael | none | renikud 100%; lv60 57%; xlsr53 71%; ipa1000 57% |
| `line/kaddish-1-l6.mp3` | וְאִמְרוּ | veimru | none | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 67% |
| `line/kaddish-1-l6.mp3` | אָמֵן | amen | none | renikud 75%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `line/kiddush-veshamru-l2.mp3` | הִוא | hi | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 0% |
| `line/kiddush-veshamru-l2.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוה | renikud 100%; lv60 67%; xlsr53 83%; ipa1000 67% |
| `line/kiddush-veshamru-l2.mp3` | הַשָּׁמַיִם | hashamajim | none | renikud 100%; lv60 56%; xlsr53 78%; ipa1000 67% |
| `line/kiddush-veshamru-l2.mp3` | הָאָרֶץ | harets | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 0% |
| `line/kiddush-veshamru-l2.mp3` | וַיִּנָּפַשׁ | vajinafash | whisper-v3: הוא הינפש; mms-1b: ו היינפש | renikud 78%; lv60 78%; xlsr53 78%; ipa1000 89% |
| `line/lecha-hashem.mp3` | כֹל | khol | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `line/lecha-hashem.mp3` | בַּשָּׁמַיִם | bashamajim | none | renikud 100%; lv60 78%; xlsr53 67%; ipa1000 67% |
| `line/lecha-hashem.mp3` | לַהֲדֹם | lahadom | ivrit-turbo: לאדום; whisper-v3: לאדום; seamless-v2: לאדום | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `line/yehalelu-l2.mp3` | יָהּ | ja | ivrit-turbo: (nothing); whisper-v3: (nothing); mms-1b: (nothing); seamless-v2: (nothing) | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/lecha-hashem.mp3` | כֹל | khol | none | renikud 67%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | בַּשָּׁמַיִם | bashamajim | none | renikud 100%; lv60 78%; xlsr53 67%; ipa1000 67% |
| `prayer/lecha-hashem.mp3` | לַהֲדֹם | lahadom | ivrit-turbo: לאדום; whisper-v3: לאדום; seamless-v2: לאדום | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 71% |
| `line/hanerot-halalu.mp3` | מַדְלִיקִין | madlikin | whisper-v3: מדליקים; seamless-v2: מדליקים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/hanerot-halalu.mp3` | מַדְלִיקִין | madlikin | whisper-v3: מדליקים; seamless-v2: מדליקים | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kiddush-veshamru.mp3` | בְנֵי | vnej | none | renikud 75%; lv60 50%; xlsr53 50%; ipa1000 75% |
| `prayer/kiddush-veshamru.mp3` | הִוא | hi | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 0% |
| `prayer/kiddush-veshamru.mp3` | הַשָּׁמַיִם | hashamajim | none | renikud 100%; lv60 67%; xlsr53 89%; ipa1000 67% |
| `prayer/kiddush-veshamru.mp3` | הָאָרֶץ | harets | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 60% |
| `prayer/kiddush-veshamru.mp3` | וַיִּנָּפַשׁ | vajinafash | whisper-v3: הוא היינפש; mms-1b: והיינהפש | renikud 100%; lv60 89%; xlsr53 78%; ipa1000 78% |
| `prayer/kiddush-zachor.mp3` | וְגֵרְךָ | vegerkha | none | renikud 100%; lv60 71%; xlsr53 86%; ipa1000 71% |
| `prayer/kiddush-zachor.mp3` | כִּי | ki | mms-1b: היא | renikud 100%; lv60 50%; xlsr53 50%; ipa1000 50% |
| `prayer/kiddush-zachor.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוי | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/kiddush-zachor.mp3` | הַשָּׁמַיִם | hashamajim | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 78% |
| `prayer/kiddush-zachor.mp3` | הָאָרֶץ | harets | none | renikud 100%; lv60 60%; xlsr53 80%; ipa1000 20% |
| `prayer/kiddush-zachor.mp3` | הַיָּם | hajam | ivrit-turbo: (nothing) | renikud 100%; lv60 60%; xlsr53 60%; ipa1000 80% |
| `prayer/kiddush-zachor.mp3` | בָּם | bam | ivrit-turbo: (nothing); mms-1b: בעם וא הינח | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/kiddush-zachor.mp3` | וַיָּנַח | vajanakh | mms-1b: בעם וא הינח | renikud 100%; lv60 71%; xlsr53 57%; ipa1000 86% |
| `prayer/kiddush-zachor.mp3` | אֲדֹנָי | adonaj | mms-1b: אדוי | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 67% |
| `prayer/kiddush-zachor.mp3` | וַיְקַדְּשֵׁהוּ | vajkadshehu | mms-1b: וא היכדשהו | renikud 100%; lv60 70%; xlsr53 70%; ipa1000 70% |
| `line/kiddush-veshamru-l2.mp3` | הִוא | hi | none | renikud 50%; lv60 50%; xlsr53 50%; ipa1000 0% |
| `line/kiddush-veshamru-l2.mp3` | הַשָּׁמַיִם | hashamajim | none | renikud 100%; lv60 67%; xlsr53 67%; ipa1000 78% |
| `line/vayehi-binsoa.mp3` | בִּנְסֹעַ | binsoa | ivrit-turbo: בנשוא; mms-1b: בנסעע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
| `prayer/vayehi-binsoa.mp3` | בִּנְסֹעַ | binsoa | ivrit-turbo: בנשוא; mms-1b: בנסעע | renikud 100%; lv60 100%; xlsr53 100%; ipa1000 100% |
