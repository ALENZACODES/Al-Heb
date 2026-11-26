# Uncertain clips: four-listener check

Listeners: ivrit-turbo, whisper-v3, mms-1b, seamless-v2. Word clip: right if 3 of 4 hear it. Sentence: a word 3 of 4 mishear means re-record.

| kind | correct | listen | re-record |
|---|---|---|---|
| word | 7 | 7 | 20 |
| sentence | 31 | 32 | 38 |

| clip | kind | verdict | listeners right | problem words | ivrit-turbo | whisper-v3 | mms-1b | seamless-v2 |
|---|---|---|---|---|---|---|---|---|
| `audio/f/israeli/line/aleinu-1.mp3` | sentence | re-record | 0/4 | עֻזּוֹ | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/amidah-elohai-netzor.mp3` | sentence | re-record | 0/4 | וְלִמְקַלְלַי וְגוֹאֲלִי לְשׁוֹנִי אִמְרֵי וְנַפְשִׁי נַפְשִׁי פִי | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/ashrei-145-1-3-l2.mp3` | sentence | re-record | 0/4 | שִׁמְךָ וַאֲהַלְלָה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/brich-shmei.mp3` | sentence | re-record | 0/4 | וּנְבִיאוֹהִי דְּהוּא מִשְׁאֲלִין | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/havdalah-opening.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/kaddish-1-l6.mp3` | sentence | re-record | 0/4 | שְׁלָמָא יְהֵא | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/kedushah-yimloch.mp3` | sentence | re-record | 0/4 | יָהּ | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/torah-exodus-16-28.mp3` | sentence | re-record | 0/4 | מִצְוֹתַי | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/torah-genesis-10-15.mp3` | sentence | re-record | 0/4 | חֵת וּכְנַעַן | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/yehalelu-l2.mp3` | sentence | re-record | 0/4 | יָהּ | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/yigdal-l7.mp3` | sentence | re-record | 0/4 | כְּמֹשֶׁה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/adon-olam-1.mp3` | sentence | re-record | 0/4 | וְאָעִירָה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/aleinu-1.mp3` | sentence | re-record | 0/4 | עֻזּוֹ | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/amidah-elohai-netzor.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/ashrei-145-1-3.mp3` | sentence | re-record | 0/4 | שִׁמְךָ וַאֲהַלְלָה אֲרוֹמִמְךָ | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/brich-shmei.mp3` | sentence | re-record | 0/4 | וּנְבִיאוֹהִי דְּהוּא מִשְׁאֲלִין | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/havdalah-opening.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/kedushah-yimloch.mp3` | sentence | re-record | 0/4 | יָהּ | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/yigdal.mp3` | sentence | re-record | 0/4 | כְּמֹשֶׁה עוֹד | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/amidah-elohai-netzor.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/bless-priestly-1.mp3` | sentence | re-record | 0/4 | יְבָרֶכְךָ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/brich-shmei.mp3` | sentence | re-record | 0/4 | דְכָל | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/havdalah-opening.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/kedushah-yimloch.mp3` | sentence | re-record | 0/4 | יָהּ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/lecha-hashem.mp3` | sentence | re-record | 0/4 | לַהֲדֹם | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/torah-exodus-16-28.mp3` | sentence | re-record | 0/4 | מִצְוֹתַי | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/torah-genesis-10-15.mp3` | sentence | re-record | 0/4 | צִידֹן חֵת וּכְנַעַן | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/vahavta-full-l2.mp3` | sentence | re-record | 0/4 | הַיּוֹם אֲשֶׁר אָנֹכִי מְצַוְּךָ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/yehalelu-l2.mp3` | sentence | re-record | 0/4 | יָהּ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/yigdal-l7.mp3` | sentence | re-record | 0/4 | עוֹד תְּמוּנָתוֹ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/amidah-elohai-netzor.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/bless-priestly-1.mp3` | sentence | re-record | 1/4 | יְבָרֶכְךָ | ✓ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/brich-shmei.mp3` | sentence | re-record | 0/4 | דְכָל | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/havdalah-opening.mp3` | sentence | re-record | 0/4 | הוֹשִׁיעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/kedushah-yimloch.mp3` | sentence | re-record | 0/4 | יָהּ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/kiddush-zachor.mp3` | sentence | re-record | 0/4 | וַיָּנַח | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/lecha-hashem.mp3` | sentence | re-record | 0/4 | לַהֲדֹם | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/yigdal.mp3` | sentence | re-record | 0/4 | כְּמֹשֶׁה עוֹד | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/dictionary/dict-va4b7d8ca.mp3` | word | re-record | 0/4 | הֵא | אה | ‫ההה. | הe | היי. היי. |
| `audio/f/israeli/dictionary/dict-ve8865de4.mp3` | word | re-record | 0/4 | שְׁעוּעִית | שהוהית | שיעוית | שהוית | שיוויט. |
| `audio/f/israeli/word/ashrei-145-1-3-w12.mp3` | word | re-record | 1/4 | וַאֲהַלְלָה | ואהללה. | והללה. | וההלה לה | וההללה |
| `audio/f/israeli/word/h60b16793.mp3` | word | re-record | 1/4 | פֶּה (cut from: הַמִּלָּה … ) | ב. | פ. | pe | ת. |
| `audio/f/israeli/word/hf76c8cd2.mp3` | word | re-record | 0/4 | אָכֹם | אקאם | אקם | אקם | אקאם. |
| `audio/f/israeli/word/i-16-w8.mp3` | word | re-record | 0/4 | מַטְעֵן | מתן | מתן | מתן | מתן |
| `audio/f/israeli/word/kiddush-shabbat-eve-w11.mp3` | word | re-record | 1/4 | בָנוּ | באנו | בנו. | באנו | באנו |
| `audio/f/israeli/word/lecha-hashem-w9.mp3` | word | re-record | 1/4 | כֹל | קול | חול. | cl | קול. |
| `audio/f/israeli/word/r35-w3.mp3` | word | re-record | 0/4 | ברוך | ברור. | ברור | ברוך | באגור |
| `audio/m/israeli/dictionary/dict-v17d329a2.mp3` | word | re-record | 1/4 | פָּרוּר | ברור | פגעו. | פרור | פאגו. |
| `audio/m/israeli/dictionary/dict-va4b7d8ca.mp3` | word | re-record | 0/4 | הֵא | אה | תודה. | ה | היי. |
| `audio/m/israeli/dictionary/dict-vb9c8a2b6.mp3` | word | re-record | 0/4 | וִיסְקִי | וויסקי | וויסקי | wisקי | וויסקי |
| `audio/m/israeli/dictionary/dict-ve8865de4.mp3` | word | re-record | 0/4 | שְׁעוּעִית | שהווית | שאווית | שוית | שוויט. |
| `audio/m/israeli/word/aleinu-1-w6.mp3` | word | re-record | 1/4 | גְּדֻלָּה (cut from: תַּגִּיד … ) | גדולה | נדולה. | דל | תסתכל. |
| `audio/m/israeli/word/bless-priestly-1-w1.mp3` | word | re-record | 0/4 | יְבָרֶכְךָ | יברך. | יברך. | יבהרך | יברך. |
| `audio/m/israeli/word/h69a35691.mp3` | word | re-record | 1/4 | פַּר (cut from: הַמִּלָּה … שׁוּב) | פר | בואו. | פ | פארג. |
| `audio/m/israeli/word/i-08-w4.mp3` | word | re-record | 1/4 | גְּדֻלָּה (cut from: תַּגִּיד … ) | גדולה | נדולה. | דל | תסתכל. |
| `audio/m/israeli/word/i-16-w8.mp3` | word | re-record | 0/4 | מַטְעֵן | מתן | מתן | מתן | מתן |
| `audio/m/israeli/word/lecha-hashem-w9.mp3` | word | re-record | 0/4 | כֹל | קול | קול. | קל | קול. |
| `audio/m/israeli/word/yigdal-w42.mp3` | word | re-record | 1/4 | גְדֻלָּתוֹ (cut from: הַמִּלָּה … ) | גדולתו | נגדול לטו. | רידו לתו | נדמה לו, |
| `audio/f/israeli/line/avot-1.mp3` | sentence | listen | 1/4 | מֶלֶךְ עוֹזֵר וּמוֹשִׁיעַ | ✗ | ✗ | ✗ | ✓ |
| `audio/f/israeli/line/hanerot-halalu.mp3` | sentence | listen | 1/4 | וִישׁוּעוֹתֶיךָ | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/kaddish-1-l2.mp3` | sentence | listen | 1/4 | בְרָא כִרְעוּתֵהּ וְיַמְלִיךְ מַלְכוּתֵהּ בְּחַיֵּיכוֹן וּבְיוֹמֵיכוֹן | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/kiddush-shabbat-eve.mp3` | sentence | listen | 0/4 | כִּי | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/kiddush-veshamru-l2.mp3` | sentence | listen | 1/4 | וַיִּנָּפַשׁ | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/lecha-hashem.mp3` | sentence | listen | 1/4 | לַהֲדֹם | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/torah-leviticus-14-43.mp3` | sentence | listen | 1/4 | הִקְצוֹת הִטּוֹחַ (nothing) | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/torah-leviticus-27-18.mp3` | sentence | listen | 2/4 | מֵעֶרְכֶּךָ | ✗ | ✗ | ✓ | ✓ |
| `audio/f/israeli/prayer/haftarah-after.mp3` | sentence | listen | 0/4 | כִּי | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/hanerot-halalu.mp3` | sentence | listen | 1/4 | וִישׁוּעוֹתֶיךָ מַדְלִיקִין | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/kaddish-1.mp3` | sentence | listen | 0/4 | שְׁמַיָּא יִשְׂרָאֵל | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/kiddush-shabbat-eve.mp3` | sentence | listen | 0/4 | כִּי | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/kiddush-veshamru.mp3` | sentence | listen | 1/4 | וַיִּנָּפַשׁ | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/lecha-hashem.mp3` | sentence | listen | 0/4 | כִּי | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/shema-vahavta.mp3` | sentence | listen | 1/4 | בַדֶּרֶךְ | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/shir-hamaalot.mp3` | sentence | listen | 0/4 | הַזֹּרְעִים בְּדִמְעָה | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/torah-bless-1.mp3` | sentence | listen | 2/4 | אֱלֹהֵינוּ בָּרוּךְ אַתָּה | ✓ | ✗ | ✓ | ✗ |
| `audio/f/israeli/prayer/vahavta-full.mp3` | sentence | listen | 1/4 | לְבָבְךָ | ✗ | ✓ | ✗ | ✗ |
| `audio/f/israeli/prayer/yehalelu.mp3` | sentence | listen | 1/4 | יָהּ | ✗ | ✗ | ✗ | ✓ |
| `audio/m/israeli/line/hanerot-halalu.mp3` | sentence | listen | 1/4 | מַדְלִיקִין | ✓ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/kaddish-1-l4.mp3` | sentence | listen | 1/4 | וְיִתְעַלֶּה וְיִתְהַלָּל וְיִתְרוֹמַם יִתְבָּרַךְ וְיִתְפָּאַר וְיִתְנַשֵּׂא וְיִתְהַדָּר וְיִשְׁתַּבַּח … | ✓ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/kaddish-1-l6.mp3` | sentence | listen | 0/4 | שְׁלָמָא | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/kiddush-shabbat-eve.mp3` | sentence | listen | 0/4 | בָנוּ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/torah-leviticus-14-43.mp3` | sentence | listen | 2/4 | הִקְצוֹת | ✓ | ✗ | ✗ | ✓ |
| `audio/m/israeli/line/torah-numbers-6-24.mp3` | sentence | listen | 2/4 | יְבָרֶכְךָ | ✓ | ✗ | ✗ | ✓ |
| `audio/m/israeli/line/vayehi-binsoa.mp3` | sentence | listen | 2/4 | בִּנְסֹעַ | ✗ | ✓ | ✗ | ✓ |
| `audio/m/israeli/prayer/hanerot-halalu.mp3` | sentence | listen | 1/4 | מַדְלִיקִין | ✓ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/kiddush-shabbat-eve.mp3` | sentence | listen | 0/4 | בָנוּ | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/kiddush-veshamru.mp3` | sentence | listen | 2/4 | וַיִּנָּפַשׁ | ✓ | ✗ | ✗ | ✓ |
| `audio/m/israeli/prayer/shir-hamaalot.mp3` | sentence | listen | 0/4 | הַזֹּרְעִים | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/vayehi-binsoa.mp3` | sentence | listen | 2/4 | בִּנְסֹעַ | ✗ | ✓ | ✗ | ✓ |
| `audio/m/israeli/prayer/yehalelu.mp3` | sentence | listen | 1/4 | יָהּ | ✗ | ✗ | ✗ | ✓ |
| `audio/m/israeli/dictionary/dict-v11122fe7.mp3` | word | listen | 2/4 | פָּן (cut from: הַמִּלָּה … שׁוּב) | פן | פן. | pן | פאן. |
| `audio/m/israeli/dictionary/dict-v1d5d18fe.mp3` | word | listen | 2/4 | נִעְנֵעַ | נהניה | נהיה. | ניאנה | ניאניה. |
| `audio/m/israeli/dictionary/dict-v323d1bb3.mp3` | word | listen | 2/4 | מָאַס (cut from: הַמִּלָּה … ) | מאס | מעש. | מעס | מאת. |
| `audio/m/israeli/dictionary/dict-vc4b2b486.mp3` | word | listen | 2/4 | כְּ־ | כן. | כה. | k | ק. |
| `audio/m/israeli/word/amidah-lips-w4.mp3` | word | listen | 2/4 | וּפִי | אופי | אופי. | ופי | ופי. |
| `audio/m/israeli/word/kiddush-shabbat-eve-w11.mp3` | word | listen | 2/4 | בָנוּ | באנו. | בנו. | בנו | באנו. |
| `audio/m/israeli/word/mi-chamocha-1-w6.mp3` | word | listen | 2/4 | נֶאְדָּר | נהדר! | נהדר. | נעדר | נעדר |
| `audio/f/israeli/line/cafe-03-f.mp3` | sentence | correct | 4/4 |  | ✓ | ✓ | ✓ | ✓ |
| `audio/f/israeli/line/haftarah-after-l1.mp3` | sentence | correct | 1/4 |  | ✗ | ✓ | ✗ | ✗ |
| `audio/f/israeli/line/haftarah-after-l3.mp3` | sentence | correct | 0/4 |  | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/shema-vahavta-l3.mp3` | sentence | correct | 3/4 |  | ✓ | ✗ | ✓ | ✓ |
| `audio/f/israeli/line/sim-shalom-l1.mp3` | sentence | correct | 0/4 |  | ✗ | ✗ | ✗ | ✗ |
| `audio/f/israeli/line/torah-numbers-32-39.mp3` | sentence | correct | 1/4 |  | ✗ | ✗ | ✓ | ✗ |
| `audio/f/israeli/line/vahavta-2-l1.mp3` | sentence | correct | 3/4 |  | ✓ | ✗ | ✓ | ✓ |
| `audio/f/israeli/line/vahavta-full-l2.mp3` | sentence | correct | 3/4 |  | ✓ | ✗ | ✓ | ✓ |
| `audio/f/israeli/line/vayehi-binsoa.mp3` | sentence | correct | 1/4 |  | ✗ | ✓ | ✗ | ✗ |
| `audio/f/israeli/prayer/avot-1.mp3` | sentence | correct | 2/4 |  | ✓ | ✓ | ✗ | ✗ |
| `audio/f/israeli/prayer/kiddush-zachor.mp3` | sentence | correct | 1/4 |  | ✗ | ✓ | ✗ | ✗ |
| `audio/f/israeli/prayer/sim-shalom.mp3` | sentence | correct | 1/4 |  | ✓ | ✗ | ✗ | ✗ |
| `audio/f/israeli/prayer/vahavta-2.mp3` | sentence | correct | 3/4 |  | ✓ | ✓ | ✓ | ✗ |
| `audio/f/israeli/prayer/vayehi-binsoa.mp3` | sentence | correct | 1/4 |  | ✗ | ✓ | ✗ | ✗ |
| `audio/m/israeli/line/aleinu-1.mp3` | sentence | correct | 0/4 |  | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/line/cafe-03-f.mp3` | sentence | correct | 4/4 |  | ✓ | ✓ | ✓ | ✓ |
| `audio/m/israeli/line/kaddish-1-l2.mp3` | sentence | correct | 4/4 |  | ✓ | ✓ | ✓ | ✓ |
| `audio/m/israeli/line/kiddush-veshamru-l2.mp3` | sentence | correct | 2/4 |  | ✓ | ✗ | ✗ | ✓ |
| `audio/m/israeli/line/shema-vahavta-l3.mp3` | sentence | correct | 3/4 |  | ✓ | ✓ | ✓ | ✗ |
| `audio/m/israeli/line/sim-shalom-l1.mp3` | sentence | correct | 2/4 |  | ✗ | ✓ | ✗ | ✓ |
| `audio/m/israeli/line/torah-genesis-30-30.mp3` | sentence | correct | 3/4 |  | ✓ | ✓ | ✗ | ✓ |
| `audio/m/israeli/line/torah-leviticus-27-18.mp3` | sentence | correct | 3/4 |  | ✓ | ✓ | ✗ | ✓ |
| `audio/m/israeli/line/torah-numbers-32-39.mp3` | sentence | correct | 2/4 |  | ✗ | ✓ | ✗ | ✓ |
| `audio/m/israeli/line/vahavta-2-l1.mp3` | sentence | correct | 4/4 |  | ✓ | ✓ | ✓ | ✓ |
| `audio/m/israeli/prayer/aleinu-1.mp3` | sentence | correct | 0/4 |  | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/haftarah-after.mp3` | sentence | correct | 0/4 |  | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/kaddish-1.mp3` | sentence | correct | 0/4 |  | ✗ | ✗ | ✗ | ✗ |
| `audio/m/israeli/prayer/shema-vahavta.mp3` | sentence | correct | 2/4 |  | ✓ | ✓ | ✗ | ✗ |
| `audio/m/israeli/prayer/sim-shalom.mp3` | sentence | correct | 3/4 |  | ✓ | ✓ | ✗ | ✓ |
| `audio/m/israeli/prayer/vahavta-2.mp3` | sentence | correct | 3/4 |  | ✓ | ✓ | ✓ | ✗ |
| `audio/m/israeli/prayer/vahavta-full.mp3` | sentence | correct | 1/4 |  | ✗ | ✓ | ✗ | ✗ |
| `audio/f/israeli/dictionary/dict-vc4b2b486.mp3` | word | correct | 3/4 |  | כה | כה | כe | מה? |
| `audio/f/israeli/word/brich-shmei-w116.mp3` | word | correct | 3/4 |  | לטב | לטב. | לה תו | לטב |
| `audio/f/israeli/word/i-09-w16.mp3` | word | correct | 3/4 |  | לא אירע. | לאירה. | לא ארה | לא אראה. |
| `audio/m/israeli/dictionary/dict-v1348133a.mp3` | word | correct | 3/4 |  | מ. | מים. | מם | מ.מ. |
| `audio/m/israeli/word/brich-shmei-w32.mp3` | word | correct | 3/4 |  | חיים | חיין | חיין | חיין |
| `audio/m/israeli/word/shema-vahavta-w19.mp3` | word | correct | 4/4 |  | מצוחה | מצוחה. | מצוך | מי צוחה? |
| `audio/m/israeli/word/vahavta-2-w6.mp3` | word | correct | 4/4 |  | מצוחה | מצוחה. | מצוך | מי צוחה? |
