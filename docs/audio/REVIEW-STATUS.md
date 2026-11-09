# Sentence and prayer audio: review status

Every sentence and prayer clip was checked by two different machine reviewers: a Hebrew word model (what words it hears) and a sound model (what sounds it hears, no word guessing). This list is about the audio in the repo now. Machine reviewers can be wrong both ways; a teacher or cantor should still listen to the rows at the top.

| status | clips |
|---|---|
| clean (both) | 627 |
| one reviewer flags it: listen | 79 |
| both flag it, on different words: listen | 26 |
| both flag the same word: re-record | 8 |

| clip | status | sounds matched | weak by sound | wrong by word model |
|---|---|---|---|---|
| `audio/f/israeli/line/ashrei-145-1-3-l2.mp3` | both flag the same word: re-record | 82% | אֲבָרֲכֶךָּ | אֲבָרֲכֶךָּ וַאֲהַלְלָה שִׁמְךָ |
| `audio/f/israeli/line/torah-numbers-32-39.mp3` | both flag the same word: re-record | 88% | וַיֵּלְכוּ | וַיֵּלְכוּ מָכִיר וַיִּלְכְּדֻהָ |
| `audio/m/israeli/line/brich-shmei.mp3` | both flag the same word: re-record | 89% | צַדִּיקַיָּא לְמִרְחַם עָלַי וּלְמִנְטַר יָתִי אֶלָּא בֵּאלָהָא דִשְׁמַיָּא דְּהוּא אֱלָהָא דְכָל וּלְחַיִּין | דְּשַׁלִּיט דְקֻדְשָׁא בְּרִיךְ דְּסָגִידְנָא קַמֵּהּ אֱלָהִין סָמִיכְנָא דְּהוּא בֵּהּ אֲנָא מִשְׁאֲלִין דְכָל עַמָּךְ |
| `audio/m/israeli/prayer/brich-shmei.mp3` | both flag the same word: re-record | 89% | צַדִּיקַיָּא לְמִרְחַם עָלַי וּלְמִנְטַר יָתִי אֶלָּא בֵּאלָהָא דִשְׁמַיָּא דְּהוּא אֱלָהָא דְכָל וּלְחַיִּין | דְּשַׁלִּיט דְקֻדְשָׁא בְּרִיךְ דְּסָגִידְנָא קַמֵּהּ אֱלָהִין סָמִיכְנָא דְּהוּא בֵּהּ אֲנָא מִשְׁאֲלִין דְכָל עַמָּךְ |
| `audio/f/israeli/prayer/kaddish-1.mp3` | both flag the same word: re-record | 90% | כִרְעוּתֵהּ וְיִתְרוֹמַם וְיִתְנַשֵּׂא וְיִתְהַדָּר וְיִתְעַלֶּה וְאִמְרוּ | וְאִמְרוּ שְׁמַיָּא יִשְׂרָאֵל |
| `audio/f/israeli/prayer/ashrei-145-1-3.mp3` | both flag the same word: re-record | 92% | אֲבָרֲכֶךָּ | וַאֲבָרֲכָה אֲבָרֲכֶךָּ וַאֲהַלְלָה שִׁמְךָ |
| `audio/f/israeli/line/torah-leviticus-14-43.mp3` | both flag the same word: re-record | 93% | אַחַר | יָשׁוּב אַחַר וְאַחֲרֵי וְאַחֲרֵי |
| `audio/m/israeli/line/torah-leviticus-14-43.mp3` | both flag the same word: re-record | 96% | וְאִם | וְאִם יָשׁוּב |
| `audio/f/israeli/prayer/torah-bless-1.mp3` | both flag it, on different words: listen | 80% | הָעוֹלָם | מִכָּל |
| `audio/f/israeli/line/torah-genesis-10-15.mp3` | both flag it, on different words: listen | 83% | חֵת | בְּכֹרוֹ |
| `audio/m/israeli/line/torah-genesis-10-15.mp3` | both flag it, on different words: listen | 88% | אֶת | וּכְנַעַן וְאֶת |
| `audio/m/israeli/prayer/vahavta-full.mp3` | both flag it, on different words: listen | 89% | אֲדֹנָי וּכְתַבְתָּם עַל מְזוּזֹת | מְצַוְּךָ |
| `audio/f/israeli/prayer/vahavta-full.mp3` | both flag it, on different words: listen | 90% | וּבְקוּמֶךָ וּקְשַׁרְתָּם לְאוֹת עַל יָדֶךָ | מְצַוְּךָ |
| `audio/f/israeli/line/kaddish-1-l2.mp3` | both flag it, on different words: listen | 90% | כִרְעוּתֵהּ | יִשְׂרָאֵל |
| `audio/f/israeli/prayer/yigdal.mp3` | both flag it, on different words: listen | 91% | הִנּוֹ לֹא יַחֲלִיף הָאֵל וְלֹא יָמִיר דָּתוֹ מֵתִים יְחַיֶּה אֵל בְּרֹב חַסְדּוֹ בָּרוּךְ עֲדֵי עַד שֵׁם תְּהִלָּתוֹ | כְּמֹשֶׁה עוֹד |
| `audio/m/israeli/prayer/kiddush-zachor.mp3` | both flag it, on different words: listen | 91% | אֲדֹנָי וַיָּנַח בַּיּוֹם הַשְּׁבִיעִי עַל כֵּן בֵּרַךְ | בָּם |
| `audio/f/israeli/line/brich-shmei.mp3` | both flag it, on different words: listen | 92% | בְּטִיבוּ צַדִּיקַיָּא הוּא וּנְבִיאוֹהִי יַקִּירָא וּלְחַיִּין | יִשְׂרָאֵל וְיַת יִשְׂרָאֵל בֵּאלָהָא דְּהוּא אֱלָהָא וּמַסְגֵּא מִשְׁאֲלִין יִשְׂרָאֵל |
| `audio/f/israeli/prayer/brich-shmei.mp3` | both flag it, on different words: listen | 92% | בְּטִיבוּ צַדִּיקַיָּא הוּא וּנְבִיאוֹהִי יַקִּירָא וּלְחַיִּין | יִשְׂרָאֵל וְיַת יִשְׂרָאֵל בֵּאלָהָא דְּהוּא אֱלָהָא וּמַסְגֵּא מִשְׁאֲלִין יִשְׂרָאֵל |
| `audio/m/israeli/prayer/kaddish-1.mp3` | both flag it, on different words: listen | 93% | כִרְעוּתֵהּ וְיִתְעַלֶּה | שְׁמַיָּא |
| `audio/m/israeli/prayer/shema-vahavta.mp3` | both flag it, on different words: listen | 93% | וּקְשַׁרְתָּם | מְצַוְּךָ |
| `audio/m/israeli/line/havdalah-opening.mp3` | both flag it, on different words: listen | 93% | אֲדֹנָי צְבָאוֹת אַשְׁרֵי אָדָם | הוֹשִׁיעָה |
| `audio/m/israeli/line/kiddush-shabbat-eve.mp3` | both flag it, on different words: listen | 93% | קָדְשְׁךָ אֲדֹנָי | מִכָּל |
| `audio/m/israeli/prayer/havdalah-opening.mp3` | both flag it, on different words: listen | 93% | אֲדֹנָי צְבָאוֹת אַשְׁרֵי אָדָם | הוֹשִׁיעָה |
| `audio/m/israeli/prayer/kiddush-shabbat-eve.mp3` | both flag it, on different words: listen | 93% | קָדְשְׁךָ אֲדֹנָי | מִכָּל |
| `audio/m/israeli/prayer/yigdal.mp3` | both flag it, on different words: listen | 94% | הִנּוֹ לֹא יַחֲלִיף הָאֵל וְלֹא יָמִיר דָּתוֹ לְעוֹלָמִים | כְּמֹשֶׁה עוֹד |
| `audio/f/israeli/prayer/shema-vahavta.mp3` | both flag it, on different words: listen | 94% | וּבְשָׁכְבְּךָ | מְצַוְּךָ |
| `audio/f/israeli/prayer/yehalelu.mp3` | both flag it, on different words: listen | 95% | כִּי | יָהּ |
| `audio/f/israeli/line/havdalah-opening.mp3` | both flag it, on different words: listen | 95% | אֲדֹנָי צְבָאוֹת | הוֹשִׁיעָה |
| `audio/f/israeli/prayer/havdalah-opening.mp3` | both flag it, on different words: listen | 95% | אֲדֹנָי צְבָאוֹת | הוֹשִׁיעָה |
| `audio/f/israeli/line/amidah-elohai-netzor.mp3` | both flag it, on different words: listen | 96% | עֲשֵׂה | הוֹשִׁיעָה |
| `audio/f/israeli/prayer/amidah-elohai-netzor.mp3` | both flag it, on different words: listen | 96% | עֲשֵׂה | הוֹשִׁיעָה |
| `audio/m/israeli/line/amidah-elohai-netzor.mp3` | both flag it, on different words: listen | 96% | עֲשֵׂה | הוֹשִׁיעָה |
| `audio/m/israeli/prayer/amidah-elohai-netzor.mp3` | both flag it, on different words: listen | 96% | עֲשֵׂה | הוֹשִׁיעָה |
| `audio/m/israeli/prayer/haftarah-after.mp3` | both flag it, on different words: listen | 96% | אָתָּה בָּרוּךְ אַתָּה וְלֹא אֲנַחְנוּ מוֹדִים | דָּוִד |
| `audio/f/israeli/line/cafe-06.mp3` | one reviewer flags it: listen | 63% | קָפֶה |  |
| `audio/f/israeli/line/cafe-03-f.mp3` | one reviewer flags it: listen | 67% | קָפֶה |  |
| `audio/m/israeli/line/cafe-03-f.mp3` | one reviewer flags it: listen | 67% | קָפֶה |  |
| `audio/m/israeli/line/cafe-26.mp3` | one reviewer flags it: listen | 67% | בְּבַקָּשָׁה |  |
| `audio/m/israeli/line/cafe-08.mp3` | one reviewer flags it: listen | 71% | עִם |  |
| `audio/m/israeli/line/cafe-01.mp3` | one reviewer flags it: listen | 73% | שֻׁלְחָן |  |
| `audio/f/israeli/line/cafe-01.mp3` | one reviewer flags it: listen | 73% | שֻׁלְחָן |  |
| `audio/f/israeli/line/small-talk-03-m.mp3` | one reviewer flags it: listen | 78% | אַתָּה |  |
| `audio/f/israeli/line/cafe-08.mp3` | one reviewer flags it: listen | 82% | עִם |  |
| `audio/f/israeli/line/bless-priestly-2.mp3` | one reviewer flags it: listen | 84% | וִיחֻנֶּךָּ |  |
| `audio/f/israeli/line/torah-numbers-6-25.mp3` | one reviewer flags it: listen | 84% | וִיחֻנֶּךָּ |  |
| `audio/f/israeli/prayer/bless-priestly-2.mp3` | one reviewer flags it: listen | 84% | וִיחֻנֶּךָּ |  |
| `audio/f/israeli/line/cafe-03-m.mp3` | one reviewer flags it: listen | 86% | קָפֶה |  |
| `audio/f/israeli/line/kaddish-1-l6.mp3` | one reviewer flags it: listen | 87% |  | שְׁלָמָא |
| `audio/m/israeli/line/torah-numbers-6-24.mp3` | one reviewer flags it: listen | 88% |  | יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ |
| `audio/m/israeli/line/torah-numbers-32-39.mp3` | one reviewer flags it: listen | 88% |  | בְּנֵי מָכִיר גִּלְעָדָה וַיִּלְכְּדֻהָ |
| `audio/f/israeli/line/yigdal-l7.mp3` | one reviewer flags it: listen | 89% |  | כְּמֹשֶׁה |
| `audio/f/israeli/line/aleinu-1.mp3` | one reviewer flags it: listen | 89% | אֶל וַאֲנַחְנוּ מִשְׁתַּחֲוִים לִפְנֵי מֶלֶךְ מַלְכֵי עֻזּוֹ כִּי אֲדֹנָי הוּא הָאֱלֹהִים בַּשָּׁמַיִם מִמַּעַל |  |
| `audio/f/israeli/prayer/aleinu-1.mp3` | one reviewer flags it: listen | 89% | אֶל וַאֲנַחְנוּ מִשְׁתַּחֲוִים לִפְנֵי מֶלֶךְ מַלְכֵי עֻזּוֹ כִּי אֲדֹנָי הוּא הָאֱלֹהִים בַּשָּׁמַיִם מִמַּעַל |  |
| `audio/f/israeli/line/sim-shalom-l1.mp3` | one reviewer flags it: listen | 90% | כָּל וּבְרָכָה וְרַחֲמִים וְחַיִּים וְשָׁלוֹם |  |
| `audio/m/israeli/line/kaddish-1-l4.mp3` | one reviewer flags it: listen | 90% |  | דְקוּדְשָׁא בְּרִיךְ |
| `audio/f/israeli/prayer/sim-shalom.mp3` | one reviewer flags it: listen | 91% | כָּל וּבְרָכָה וְרַחֲמִים וְחַיִּים וְשָׁלוֹם |  |
| `audio/f/israeli/line/kiddush-shabbat-eve.mp3` | one reviewer flags it: listen | 91% | כִּי בָנוּ בָחַרְתָּ וְאוֹתָנוּ קִדַּשְׁתָּ |  |
| `audio/f/israeli/prayer/kiddush-shabbat-eve.mp3` | one reviewer flags it: listen | 91% | כִּי בָנוּ בָחַרְתָּ וְאוֹתָנוּ קִדַּשְׁתָּ |  |
| `audio/m/israeli/prayer/vahavta-2.mp3` | one reviewer flags it: listen | 91% |  | מְצַוְּךָ |
| `audio/m/israeli/line/sim-shalom-l1.mp3` | one reviewer flags it: listen | 92% | כָּל וְשָׁלוֹם וְטוֹב בְּעֵינֶיךָ לְבָרֵךְ אֶת |  |
| `audio/m/israeli/line/bless-priestly-1.mp3` | one reviewer flags it: listen | 92% |  | יְבָרֶכְךָ |
| `audio/m/israeli/prayer/bless-priestly-1.mp3` | one reviewer flags it: listen | 92% |  | יְבָרֶכְךָ |
| `audio/f/israeli/prayer/shir-hamaalot.mp3` | one reviewer flags it: listen | 92% | אָז אָז הַזֹּרְעִים בְּדִמְעָה בְּרִנָּה |  |
| `audio/m/israeli/line/kaddish-1-l2.mp3` | one reviewer flags it: listen | 92% | כִרְעוּתֵהּ |  |
| `audio/f/israeli/prayer/vahavta-2.mp3` | one reviewer flags it: listen | 92% |  | מְצַוְּךָ בַדֶּרֶךְ |
| `audio/f/israeli/prayer/haftarah-after.mp3` | one reviewer flags it: listen | 92% | אָחוֹר לֹא יָשׁוּב רֵיקָם כִּי אֵל מֶלֶךְ וּבְמַלְכוּת בֵּית עַל הַתּוֹרָה וְעַל הָעֲבוֹדָה וְעַל הַנְּבִיאִים וְעַל יוֹם הַשַּׁבָּת |  |
| `audio/m/israeli/prayer/sim-shalom.mp3` | one reviewer flags it: listen | 93% | כָּל וְשָׁלוֹם וְטוֹב בְּעֵינֶיךָ לְבָרֵךְ אֶת |  |
| `audio/m/israeli/line/torah-leviticus-27-18.mp3` | one reviewer flags it: listen | 93% |  | וְאִם אַחַר וְחִשַּׁב מֵעֶרְכֶּךָ |
| `audio/f/israeli/line/haftarah-after-l3.mp3` | one reviewer flags it: listen | 93% | נֵרוֹ אֲדֹנָי מָגֵן דָּוִד |  |
| `audio/m/israeli/line/torah-genesis-30-30.mp3` | one reviewer flags it: listen | 93% |  | מְעַט וַיְבָרֶךְ |
| `audio/m/israeli/prayer/shir-hamaalot.mp3` | one reviewer flags it: listen | 93% | בַגּוֹיִם הַזֹּרְעִים |  |
| `audio/f/israeli/line/torah-exodus-16-28.mp3` | one reviewer flags it: listen | 94% |  | מֵאַנְתֶּם לִשְׁמֹר |
| `audio/m/israeli/line/kedushah-yimloch.mp3` | one reviewer flags it: listen | 94% |  | יָהּ |
| `audio/m/israeli/prayer/kedushah-yimloch.mp3` | one reviewer flags it: listen | 94% |  | יָהּ |
| `audio/m/israeli/line/yigdal-l7.mp3` | one reviewer flags it: listen | 94% |  | עוֹד |
| `audio/f/israeli/line/lecha-hashem.mp3` | one reviewer flags it: listen | 94% | כִּי קָדוֹשׁ אֲדֹנָי אֱלֹהֵינוּ |  |
| `audio/f/israeli/prayer/lecha-hashem.mp3` | one reviewer flags it: listen | 94% | כִּי קָדוֹשׁ אֲדֹנָי אֱלֹהֵינוּ |  |
| `audio/f/israeli/line/avot-1.mp3` | one reviewer flags it: listen | 94% | מֶלֶךְ עוֹזֵר וּמוֹשִׁיעַ |  |
| `audio/f/israeli/prayer/avot-1.mp3` | one reviewer flags it: listen | 94% | מֶלֶךְ עוֹזֵר וּמוֹשִׁיעַ |  |
| `audio/f/israeli/line/shema-vahavta-l3.mp3` | one reviewer flags it: listen | 95% |  | מְצַוְּךָ |
| `audio/f/israeli/line/vahavta-2-l1.mp3` | one reviewer flags it: listen | 95% |  | מְצַוְּךָ |
| `audio/f/israeli/line/vahavta-full-l2.mp3` | one reviewer flags it: listen | 95% |  | מְצַוְּךָ |
| `audio/m/israeli/line/shema-vahavta-l3.mp3` | one reviewer flags it: listen | 95% |  | מְצַוְּךָ |
| `audio/m/israeli/line/vahavta-2-l1.mp3` | one reviewer flags it: listen | 95% |  | מְצַוְּךָ |
| `audio/m/israeli/line/vahavta-full-l2.mp3` | one reviewer flags it: listen | 95% |  | מְצַוְּךָ |
| `audio/f/israeli/line/yehalelu-l2.mp3` | one reviewer flags it: listen | 95% |  | יָהּ |
| `audio/f/israeli/prayer/adon-olam-1.mp3` | one reviewer flags it: listen | 95% | בְּלִי רֵאשִׁית |  |
| `audio/f/israeli/line/kedushah-yimloch.mp3` | one reviewer flags it: listen | 96% |  | יָהּ |
| `audio/f/israeli/prayer/kedushah-yimloch.mp3` | one reviewer flags it: listen | 96% |  | יָהּ |
| `audio/f/israeli/prayer/kiddush-veshamru.mp3` | one reviewer flags it: listen | 96% | הִוא |  |
| `audio/f/israeli/line/hanerot-halalu.mp3` | one reviewer flags it: listen | 96% | נִפְלְאוֹתֶיךָ |  |
| `audio/f/israeli/prayer/hanerot-halalu.mp3` | one reviewer flags it: listen | 96% | נִפְלְאוֹתֶיךָ |  |
| `audio/m/israeli/line/torah-exodus-16-28.mp3` | one reviewer flags it: listen | 96% |  | אָנָה מֵאַנְתֶּם |
| `audio/f/israeli/line/torah-leviticus-27-18.mp3` | one reviewer flags it: listen | 96% |  | וְנִגְרַע מֵעֶרְכֶּךָ |
| `audio/m/israeli/line/kaddish-1-l6.mp3` | one reviewer flags it: listen | 96% |  | כָּל |
| `audio/f/israeli/line/vayehi-binsoa.mp3` | one reviewer flags it: listen | 97% |  | בִּנְסֹעַ |
| `audio/f/israeli/prayer/vayehi-binsoa.mp3` | one reviewer flags it: listen | 97% |  | בִּנְסֹעַ |
| `audio/m/israeli/line/haftarah-after-l1.mp3` | one reviewer flags it: listen | 97% | כִּי אֵל מֶלֶךְ |  |
| `audio/f/israeli/line/haftarah-after-l1.mp3` | one reviewer flags it: listen | 97% | כִּי אֵל מֶלֶךְ |  |
| `audio/m/israeli/prayer/yehalelu.mp3` | one reviewer flags it: listen | 97% |  | יָהּ |
| `audio/m/israeli/line/aleinu-1.mp3` | one reviewer flags it: listen | 97% | עֻזּוֹ אֲדֹנָי |  |
| `audio/m/israeli/prayer/aleinu-1.mp3` | one reviewer flags it: listen | 97% | עֻזּוֹ אֲדֹנָי |  |
| `audio/f/israeli/line/kiddush-veshamru-l2.mp3` | one reviewer flags it: listen | 97% | הִוא |  |
| `audio/m/israeli/line/lecha-hashem.mp3` | one reviewer flags it: listen | 98% |  | לַהֲדֹם |
| `audio/m/israeli/line/yehalelu-l2.mp3` | one reviewer flags it: listen | 98% |  | יָהּ |
| `audio/m/israeli/prayer/lecha-hashem.mp3` | one reviewer flags it: listen | 98% |  | לַהֲדֹם |
| `audio/m/israeli/line/hanerot-halalu.mp3` | one reviewer flags it: listen | 98% | עַל |  |
| `audio/m/israeli/prayer/hanerot-halalu.mp3` | one reviewer flags it: listen | 98% | עַל |  |
| `audio/m/israeli/prayer/kiddush-veshamru.mp3` | one reviewer flags it: listen | 98% | הִוא |  |
| `audio/f/israeli/prayer/kiddush-zachor.mp3` | one reviewer flags it: listen | 98% |  | (nothing) |
| `audio/m/israeli/line/kiddush-veshamru-l2.mp3` | one reviewer flags it: listen | 98% | הִוא |  |
| `audio/m/israeli/line/vayehi-binsoa.mp3` | one reviewer flags it: listen | 99% |  | בִּנְסֹעַ |
| `audio/m/israeli/prayer/vayehi-binsoa.mp3` | one reviewer flags it: listen | 99% |  | בִּנְסֹעַ |
| `audio/f/israeli/line/shop-14.mp3` | clean (both) | 61% |  |  |
| `audio/f/israeli/line/directions-03.mp3` | clean (both) | 62% |  |  |
| `audio/f/israeli/line/shop-08.mp3` | clean (both) | 64% |  |  |
| `audio/m/israeli/line/greetings-07.mp3` | clean (both) | 64% |  |  |
| `audio/f/israeli/line/greetings-22-f.mp3` | clean (both) | 67% |  |  |
| `audio/f/israeli/line/help-08.mp3` | clean (both) | 69% |  |  |
| `audio/f/israeli/line/shop-05.mp3` | clean (both) | 70% |  |  |
| `audio/m/israeli/line/greetings-22-f.mp3` | clean (both) | 70% |  |  |
| `audio/m/israeli/line/shop-05.mp3` | clean (both) | 70% |  |  |
| `audio/f/israeli/line/cafe-04.mp3` | clean (both) | 71% |  |  |
| `audio/f/israeli/line/greetings-10.mp3` | clean (both) | 71% |  |  |
| `audio/f/israeli/line/greetings-11-m.mp3` | clean (both) | 71% |  |  |
| `audio/m/israeli/line/small-talk-01-m.mp3` | clean (both) | 71% |  |  |
| `audio/f/israeli/line/taxi-09-m.mp3` | clean (both) | 71% |  |  |
| `audio/m/israeli/line/cafe-21.mp3` | clean (both) | 71% |  |  |
| `audio/m/israeli/line/directions-03.mp3` | clean (both) | 71% |  |  |
| `audio/f/israeli/line/shop-09.mp3` | clean (both) | 72% |  |  |
| `audio/m/israeli/line/shop-09.mp3` | clean (both) | 72% |  |  |
| `audio/f/israeli/line/greetings-07.mp3` | clean (both) | 73% |  |  |
| `audio/m/israeli/line/cafe-24-m.mp3` | clean (both) | 73% |  |  |
| `audio/m/israeli/line/numbers-17.mp3` | clean (both) | 73% |  |  |
| `audio/f/israeli/line/directions-08-f.mp3` | clean (both) | 74% |  |  |
| `audio/m/israeli/line/cafe-06.mp3` | clean (both) | 74% |  |  |
| `audio/m/israeli/line/help-08.mp3` | clean (both) | 74% |  |  |
| `audio/f/israeli/line/taxi-15.mp3` | clean (both) | 74% |  |  |
| `audio/f/israeli/line/greetings-18.mp3` | clean (both) | 75% |  |  |
| `audio/f/israeli/line/politeness-02.mp3` | clean (both) | 75% |  |  |
| `audio/f/israeli/line/small-talk-05-m.mp3` | clean (both) | 75% |  |  |
| `audio/m/israeli/line/directions-08-f.mp3` | clean (both) | 75% |  |  |
| `audio/m/israeli/line/directions-09-m.mp3` | clean (both) | 75% |  |  |
| `audio/m/israeli/line/bless-priestly-2.mp3` | clean (both) | 76% |  |  |
| `audio/m/israeli/prayer/bless-priestly-2.mp3` | clean (both) | 76% |  |  |
| `audio/f/israeli/line/shop-15.mp3` | clean (both) | 76% |  |  |
| `audio/f/israeli/line/small-talk-04.mp3` | clean (both) | 76% |  |  |
| `audio/f/israeli/line/cafe-10.mp3` | clean (both) | 76% |  |  |
| `audio/f/israeli/line/cafe-25.mp3` | clean (both) | 76% |  |  |
| `audio/f/israeli/line/cafe-26.mp3` | clean (both) | 76% |  |  |
| `audio/m/israeli/line/fillers-19.mp3` | clean (both) | 76% |  |  |
| `audio/f/israeli/line/cafe-15.mp3` | clean (both) | 77% |  |  |
| `audio/f/israeli/line/torah-barchu-l2.mp3` | clean (both) | 77% |  |  |
| `audio/m/israeli/line/torah-barchu-l2.mp3` | clean (both) | 77% |  |  |
| `audio/m/israeli/prayer/torah-barchu.mp3` | clean (both) | 77% |  |  |
| `audio/f/israeli/line/small-talk-01-m.mp3` | clean (both) | 78% |  |  |
| `audio/m/israeli/line/cafe-04.mp3` | clean (both) | 78% |  |  |
| `audio/f/israeli/line/cafe-24-m.mp3` | clean (both) | 78% |  |  |
| `audio/f/israeli/line/numbers-17.mp3` | clean (both) | 78% |  |  |
| `audio/m/israeli/line/shop-14.mp3` | clean (both) | 78% |  |  |
| `audio/m/israeli/line/shop-15.mp3` | clean (both) | 78% |  |  |
| `audio/f/israeli/line/help-03-m.mp3` | clean (both) | 79% |  |  |
| `audio/f/israeli/line/taxi-09-f.mp3` | clean (both) | 79% |  |  |
| `audio/m/israeli/line/help-03-m.mp3` | clean (both) | 79% |  |  |
| `audio/f/israeli/line/taxi-12.mp3` | clean (both) | 79% |  |  |
| `audio/f/israeli/line/torah-barchu-l1.mp3` | clean (both) | 79% |  |  |
| `audio/m/israeli/line/shema-vahavta-l5.mp3` | clean (both) | 79% |  |  |
| `audio/m/israeli/line/torah-barchu-l1.mp3` | clean (both) | 79% |  |  |
| `audio/f/israeli/line/cafe-14.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/cafe-21.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/greetings-19.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/numbers-16.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/politeness-04.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/small-talk-09-f.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/taxi-03.mp3` | clean (both) | 80% |  |  |
| `audio/m/israeli/line/directions-10-f.mp3` | clean (both) | 80% |  |  |
| `audio/m/israeli/line/numbers-16.mp3` | clean (both) | 80% |  |  |
| `audio/m/israeli/line/politeness-04.mp3` | clean (both) | 80% |  |  |
| `audio/m/israeli/line/small-talk-09-f.mp3` | clean (both) | 80% |  |  |
| `audio/m/israeli/prayer/hagomel.mp3` | clean (both) | 80% |  |  |
| `audio/f/israeli/line/shema-vahavta-l5.mp3` | clean (both) | 81% |  |  |
| `audio/m/israeli/line/taxi-13.mp3` | clean (both) | 81% |  |  |
| `audio/f/israeli/line/bless-formula-1.mp3` | clean (both) | 81% |  |  |
| `audio/f/israeli/prayer/bless-formula-1.mp3` | clean (both) | 81% |  |  |
| `audio/m/israeli/line/fillers-18.mp3` | clean (both) | 81% |  |  |
| `audio/f/israeli/line/help-09.mp3` | clean (both) | 81% |  |  |
| `audio/f/israeli/line/vahavta-full-l4.mp3` | clean (both) | 81% |  |  |
| `audio/m/israeli/line/cafe-14.mp3` | clean (both) | 82% |  |  |
| `audio/f/israeli/prayer/torah-barchu.mp3` | clean (both) | 82% |  |  |
| `audio/m/israeli/line/vahavta-full-l3.mp3` | clean (both) | 82% |  |  |
| `audio/f/israeli/line/kaddish-1-l3.mp3` | clean (both) | 82% |  |  |
| `audio/f/israeli/line/fillers-15-f.mp3` | clean (both) | 82% |  |  |
| `audio/f/israeli/line/greetings-08.mp3` | clean (both) | 82% |  |  |
| `audio/m/israeli/line/cafe-25.mp3` | clean (both) | 82% |  |  |
| `audio/m/israeli/line/small-talk-11-f.mp3` | clean (both) | 82% |  |  |
| `audio/f/israeli/line/birkat-hamazon-1.mp3` | clean (both) | 83% |  |  |
| `audio/f/israeli/prayer/birkat-hamazon-1.mp3` | clean (both) | 83% |  |  |
| `audio/m/israeli/line/taxi-09-f.mp3` | clean (both) | 83% |  |  |
| `audio/f/israeli/line/politeness-07-f.mp3` | clean (both) | 83% |  |  |
| `audio/f/israeli/line/politeness-22.mp3` | clean (both) | 83% |  |  |
| `audio/f/israeli/line/small-talk-01-f.mp3` | clean (both) | 83% |  |  |
| `audio/m/israeli/line/hagomel-l2.mp3` | clean (both) | 84% |  |  |
| `audio/f/israeli/line/hagomel-l1.mp3` | clean (both) | 84% |  |  |
| `audio/m/israeli/line/directions-10-m.mp3` | clean (both) | 84% |  |  |
| `audio/m/israeli/line/shop-08.mp3` | clean (both) | 84% |  |  |
| `audio/m/israeli/line/taxi-03.mp3` | clean (both) | 84% |  |  |
| `audio/f/israeli/line/ashrei-145-1-3-l3.mp3` | clean (both) | 84% |  |  |
| `audio/f/israeli/line/directions-15.mp3` | clean (both) | 84% |  |  |
| `audio/f/israeli/line/yigdal-l6.mp3` | clean (both) | 85% |  |  |
| `audio/m/israeli/line/yigdal-l6.mp3` | clean (both) | 85% |  |  |
| `audio/m/israeli/line/help-09.mp3` | clean (both) | 85% |  |  |
| `audio/f/israeli/line/fillers-19.mp3` | clean (both) | 85% |  |  |
| `audio/f/israeli/line/taxi-07.mp3` | clean (both) | 85% |  |  |
| `audio/f/israeli/line/taxi-13.mp3` | clean (both) | 85% |  |  |
| `audio/f/israeli/line/fillers-05.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/greetings-04.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/greetings-05.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/greetings-12.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/greetings-21.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/help-03-f.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/shema-vahavta-l6.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/shop-03.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/small-talk-07-f.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/small-talk-09-m.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/small-talk-10-f.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/fillers-05.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/greetings-04.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/greetings-05.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/greetings-12.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/greetings-21.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/help-03-f.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/small-talk-01-f.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/small-talk-03-f.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/small-talk-07-f.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/small-talk-10-f.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/taxi-15.mp3` | clean (both) | 86% |  |  |
| `audio/m/israeli/line/taxi-12.mp3` | clean (both) | 86% |  |  |
| `audio/f/israeli/line/fillers-18.mp3` | clean (both) | 87% |  |  |
| `audio/f/israeli/line/yigdal-l5.mp3` | clean (both) | 87% |  |  |
| `audio/m/israeli/line/vahavta-full-l4.mp3` | clean (both) | 87% |  |  |
| `audio/f/israeli/line/cafe-24-f.mp3` | clean (both) | 87% |  |  |
| `audio/m/israeli/line/cafe-24-f.mp3` | clean (both) | 87% |  |  |
| `audio/m/israeli/line/politeness-22.mp3` | clean (both) | 87% |  |  |
| `audio/m/israeli/line/small-talk-19-m.mp3` | clean (both) | 87% |  |  |
| `audio/m/israeli/prayer/torah-bless-2.mp3` | clean (both) | 87% |  |  |
| `audio/f/israeli/line/cafe-27.mp3` | clean (both) | 87% |  |  |
| `audio/m/israeli/line/cafe-27.mp3` | clean (both) | 87% |  |  |
| `audio/f/israeli/line/directions-08-m.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/directions-14-f.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/fillers-16-m.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/fillers-23.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/greetings-03.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/greetings-06.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/greetings-24.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/shop-07.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/shop-10.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/small-talk-07-m.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/small-talk-11-f.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/vahavta-full-l5.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/cafe-10.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/directions-14-f.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/fillers-16-m.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/greetings-03.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/greetings-06.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/greetings-08.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/greetings-24.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/politeness-02.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/shema-vahavta-l6.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/shop-07.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/shop-10.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/small-talk-05-m.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/small-talk-07-m.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/yigdal-l9.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/ashrei-145-1-3-l2.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/adon-olam-1-l8.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/help-02-f.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/help-02-f.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/politeness-21.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/kaddish-1-l1.mp3` | clean (both) | 88% |  |  |
| `audio/f/israeli/line/taxi-04.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/directions-15.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/fillers-17-f.mp3` | clean (both) | 88% |  |  |
| `audio/m/israeli/line/kiddush-gen-2-1-3-l2.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/directions-10-f.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/greetings-11-f.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/greetings-22-m.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/shop-20.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/small-talk-16.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/taxi-01-f.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/directions-08-m.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/greetings-11-f.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/greetings-11-m.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/greetings-22-m.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/shop-20.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/small-talk-03-m.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/small-talk-16.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/taxi-01-f.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/vahavta-full-l5.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/shema-vahavta-l4.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/vahavta-2-l2.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/yigdal-l10.mp3` | clean (both) | 89% |  |  |
| `audio/m/israeli/line/torah-numbers-6-25.mp3` | clean (both) | 89% |  |  |
| `audio/f/israeli/line/adon-olam-1-l10.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/help-04-m.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/help-06.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/help-04-m.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/help-06.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/taxi-09-m.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/torah-numbers-6-24.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/shir-hamaalot-l3.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/shir-hamaalot-l3.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/small-talk-05-f.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/small-talk-05-f.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/yigdal-l8.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/adon-olam-1-l2.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/yigdal-l1.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/small-talk-14-f.mp3` | clean (both) | 90% |  |  |
| `audio/m/israeli/line/kaddish-1-l3.mp3` | clean (both) | 90% |  |  |
| `audio/f/israeli/line/shema-vahavta-l4.mp3` | clean (both) | 91% |  |  |
| `audio/f/israeli/line/vahavta-2-l2.mp3` | clean (both) | 91% |  |  |
| `audio/f/israeli/line/vahavta-full-l3.mp3` | clean (both) | 91% |  |  |
| `audio/m/israeli/line/directions-19.mp3` | clean (both) | 91% |  |  |
| `audio/m/israeli/line/help-07-f.mp3` | clean (both) | 91% |  |  |
| `audio/m/israeli/line/shop-11.mp3` | clean (both) | 91% |  |  |
| `audio/m/israeli/line/taxi-04.mp3` | clean (both) | 91% |  |  |
| `audio/f/israeli/line/adon-olam-1-l1.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/bless-priestly-1.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/greetings-23.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/small-talk-19-m.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/prayer/bless-priestly-1.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/adon-olam-1-l1.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/greetings-23.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/politeness-07-f.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/torah-genesis-30-30.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/directions-04.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/politeness-17.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/small-talk-10-m.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/small-talk-19-f.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/zimun-opening-l1.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/politeness-17.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/small-talk-10-m.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/small-talk-19-f.mp3` | clean (both) | 92% |  |  |
| `audio/m/israeli/line/zimun-opening-l1.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/gadlu.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/yigdal-l8.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/prayer/gadlu.mp3` | clean (both) | 92% |  |  |
| `audio/f/israeli/line/yigdal-l11.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/adonai-oz.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/prayer/adonai-oz.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/adonai-oz.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/ashrei-145-1-3-l1.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/prayer/adonai-oz.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/prayer/ashrei-145-1-3.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/adon-olam-1-l9.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/adon-olam-1-l9.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/kaddish-1-l1.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/ein-kamocha.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/prayer/ein-kamocha.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/ein-kamocha.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/prayer/ein-kamocha.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/help-04-f.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/help-07-m.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/shop-18.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/small-talk-06.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/small-talk-14-f.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/small-talk-14-m.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/torah-genesis-1-1.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/fillers-23.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/greetings-19.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/help-07-m.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/shop-18.mp3` | clean (both) | 93% |  |  |
| `audio/m/israeli/line/small-talk-06.mp3` | clean (both) | 93% |  |  |
| `audio/f/israeli/line/shir-hamaalot-l6.mp3` | clean (both) | 94% |  |  |
| `audio/m/israeli/line/shir-hamaalot-l6.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/ashrei-145-1-3-l1.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/ashrei-84-5.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/help-07-f.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/prayer/ashrei-84-5.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/mi-chamocha-1.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/prayer/mi-chamocha-1.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/adon-olam-1-l3.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/directions-09-m.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/greetings-09.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/shop-02.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/shop-11.mp3` | clean (both) | 94% |  |  |
| `audio/m/israeli/line/fillers-15-f.mp3` | clean (both) | 94% |  |  |
| `audio/m/israeli/line/greetings-09.mp3` | clean (both) | 94% |  |  |
| `audio/m/israeli/line/shop-02.mp3` | clean (both) | 94% |  |  |
| `audio/m/israeli/line/adon-olam-1-l2.mp3` | clean (both) | 94% |  |  |
| `audio/f/israeli/line/amidah-yihyu.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/prayer/amidah-yihyu.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/fillers-17-m.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/fillers-17-m.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/havdalah-spices.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/prayer/havdalah-spices.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/havdalah-spices.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/prayer/havdalah-spices.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/kiddush-veshamru-l1.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/adon-olam-1-l10.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/cafe-02.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/kaddish-1-l4.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/cafe-02.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/maoz-tzur-1.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/prayer/maoz-tzur-1.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/maoz-tzur-1.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/yigdal-l11.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/yigdal-l5.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/prayer/maoz-tzur-1.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/directions-02.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/fillers-14-f.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/yigdal-l3.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/ashrei-84-5.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/cafe-03-m.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/directions-02.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/fillers-14-f.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/line/small-talk-04.mp3` | clean (both) | 95% |  |  |
| `audio/m/israeli/prayer/ashrei-84-5.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/adon-olam-1-l4.mp3` | clean (both) | 95% |  |  |
| `audio/f/israeli/line/shir-hamaalot-l2.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/shir-hamaalot-l2.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/directions-20.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/greetings-14.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/kiddush-zachor-l3.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/num-12-13.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/politeness-21.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/yigdal-l12.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/prayer/num-12-13.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/adon-olam-1-l3.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/directions-20.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/greetings-14.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/num-12-13.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/yigdal-l12.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/prayer/num-12-13.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/amidah-lips.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/prayer/amidah-lips.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/mah-tovu-1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/prayer/mah-tovu-1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/shir-hamaalot-l5.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/shir-hamaalot-l5.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/prayer/adon-olam-1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/prayer/lecha-dodi-1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/ashrei-144-15.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/prayer/ashrei-144-15.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/ashrei-144-15.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/kiddush-zachor-l3.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/prayer/ashrei-144-15.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/greetings-27-f.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/greetings-27-m.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/lecha-dodi-1-l2.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/greetings-27-f.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/greetings-27-m.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/lecha-dodi-1-l2.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/yehalelu-l1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/shema-vahavta-l2.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/vahavta-1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/vahavta-full-l1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/prayer/vahavta-1.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/shema-vahavta-l2.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/vahavta-1.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/line/vahavta-full-l1.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/prayer/lecha-dodi-1.mp3` | clean (both) | 96% |  |  |
| `audio/m/israeli/prayer/vahavta-1.mp3` | clean (both) | 96% |  |  |
| `audio/f/israeli/line/fillers-22.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/kiddush-gen-2-1-3-l2.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/yigdal-l13.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/fillers-22.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/help-04-f.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/kiddush-veshamru-l1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/mi-chamocha-1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/yigdal-l13.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/prayer/mi-chamocha-1.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/hanukkah-candle.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/yigdal-l2.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/prayer/hanukkah-candle.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/prayer/zimun-opening.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/hanukkah-candle.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/yigdal-l1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/yigdal-l2.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/prayer/hanukkah-candle.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/prayer/zimun-opening.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/candle-shabbat.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/shir-hamaalot-l1.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/taxi-14.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/prayer/candle-shabbat.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/candle-shabbat.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/shir-hamaalot-l1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/small-talk-14-m.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/taxi-14.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/prayer/candle-shabbat.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/zimun-opening-l2.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/zimun-opening-l2.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/adon-olam-1-l8.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/fillers-16-f.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/haftarah-after-l4.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/lecha-dodi-1-l1.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/shema-1.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/shema-vahavta-l1.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/taxi-11.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/prayer/shema-1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/fillers-16-f.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/gadlu.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/lecha-dodi-1-l1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/taxi-07.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/taxi-11.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/prayer/gadlu.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/adon-olam-1-l5.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/kaddish-1-l5.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/adon-olam-1-l5.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/adon-olam-1-l7.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/kaddish-1-l5.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/etz-chaim.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/haftarah-after-l2.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/taxi-10.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/prayer/etz-chaim.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/etz-chaim.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/haftarah-after-l2.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/taxi-10.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/line/torah-genesis-1-1.mp3` | clean (both) | 97% |  |  |
| `audio/m/israeli/prayer/etz-chaim.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/kiddush-gen-2-1-3-l3.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/vezot-hatorah.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/prayer/vezot-hatorah.mp3` | clean (both) | 97% |  |  |
| `audio/f/israeli/line/havdalah-hamavdil.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/torah-numbers-31-21.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/havdalah-hamavdil.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/ashrei-145-1-3-l3.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/havdalah-hamavdil.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/yigdal-l10.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/yigdal-l9.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/havdalah-hamavdil.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/fillers-17-f.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/hashivenu.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/hashivenu.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/birkat-hamazon-1.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/birkat-hamazon-1.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/kedushah-baruch.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/shehecheyanu.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/kedushah-baruch.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/shehecheyanu.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/kedushah-baruch.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/malchutcha.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/shehecheyanu.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/kedushah-baruch.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/malchutcha.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/shehecheyanu.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/kiddush-zachor-l1.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/yigdal-l4.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/kiddush-zachor-l1.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/yigdal-l4.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/haftarah-after-l3.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/haftarah-after-l4.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/yehalelu-l1.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/kiddush-gen-2-1-3.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/kiddush-gen-2-1-3-l3.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/kaddish-1-l7.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/shema-2.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/shema-2.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/amidah-yihyu.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/shema-2.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/amidah-yihyu.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/shema-2.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/avot-1.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/avot-1.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/kiddush-gen-2-1-3.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/ashrei-145-16.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/torah-deuteronomy-6-4.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/prayer/ashrei-145-16.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/adon-olam-1-l4.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/line/ashrei-145-16.mp3` | clean (both) | 98% |  |  |
| `audio/m/israeli/prayer/ashrei-145-16.mp3` | clean (both) | 98% |  |  |
| `audio/f/israeli/line/adon-olam-1-l7.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/bless-priestly-3.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/kiddush-gen-2-1-3-l1.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/kiddush-zachor-l2.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/modeh-ani-1.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/shir-hamaalot-l4.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/torah-numbers-6-26.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/bless-priestly-3.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/modeh-ani-1.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/amidah-lips.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/bless-priestly-3.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/kiddush-gen-2-1-3-l1.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/kiddush-zachor-l2.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/mah-tovu-1.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/modeh-ani-1.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/shir-hamaalot-l4.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/torah-numbers-6-26.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/amidah-lips.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/bless-priestly-3.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/mah-tovu-1.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/modeh-ani-1.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/sim-shalom-l2.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/sim-shalom-l2.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/havdalah-flame.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/malchutcha.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/havdalah-flame.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/malchutcha.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/hashivenu.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/havdalah-flame.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/hashivenu.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/havdalah-flame.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/haftarah-before.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/haftarah-before.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/haftarah-before.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/haftarah-before.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/oseh-shalom.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/oseh-shalom.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/kaddish-1-l7.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/oseh-shalom.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/vezot-hatorah.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/oseh-shalom.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/vezot-hatorah.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/kedushah-kadosh.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/line/kiddush-zachor-l4.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/kedushah-kadosh.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/kedushah-kadosh.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/prayer/kedushah-kadosh.mp3` | clean (both) | 99% |  |  |
| `audio/m/israeli/line/hagomel-l1.mp3` | clean (both) | 99% |  |  |
| `audio/f/israeli/prayer/hagomel.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/prayer/torah-bless-2.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/adon-olam-1-l6.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/avot-closing.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/cafe-07.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/cafe-22-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/cafe-22-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/cafe-23-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/cafe-23-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-01.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-09-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-10-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-11.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-14-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-16.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-17.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-18.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/directions-19.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/fillers-13-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/fillers-13-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/fillers-14-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/fillers-15-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/fillers-20.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/fillers-21.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/greetings-13.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/greetings-17.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/hagomel-l2.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/hamotzi.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/hanukkah-nissim.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/help-02-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/help-05.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/kiddush-wine-1.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/mi-sheberach-opening.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/politeness-05.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/politeness-07-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/politeness-18.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/shop-01.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/shop-04.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/shop-06-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/shop-06-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/shop-13.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-02.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-03-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-08-f.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-08-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-11-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-12.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-13.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/small-talk-17.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/taxi-01-m.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/line/taxi-08.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/prayer/avot-closing.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/prayer/hamotzi.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/prayer/hanukkah-nissim.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/prayer/kiddush-wine-1.mp3` | clean (both) | 100% |  |  |
| `audio/f/israeli/prayer/mi-sheberach-opening.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/adon-olam-1-l6.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/avot-closing.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/bless-formula-1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/cafe-07.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/cafe-15.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/cafe-22-f.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/cafe-22-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/cafe-23-f.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/cafe-23-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-01.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-04.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-09-f.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-11.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-14-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-16.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-17.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/directions-18.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/fillers-13-f.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/fillers-13-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/fillers-14-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/fillers-15-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/fillers-20.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/fillers-21.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/greetings-10.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/greetings-13.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/greetings-17.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/greetings-18.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/hamotzi.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/hanukkah-nissim.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/help-02-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/help-05.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/kiddush-wine-1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/kiddush-zachor-l4.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/mi-sheberach-opening.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/politeness-05.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/politeness-07-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/politeness-18.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shema-1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shema-vahavta-l1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shop-01.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shop-03.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shop-04.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shop-06-f.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shop-06-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/shop-13.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-02.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-08-f.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-08-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-09-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-11-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-12.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-13.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/small-talk-17.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/taxi-01-m.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/taxi-08.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/torah-deuteronomy-6-4.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/torah-numbers-31-21.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/line/yigdal-l3.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/avot-closing.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/bless-formula-1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/hamotzi.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/hanukkah-nissim.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/kiddush-wine-1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/mi-sheberach-opening.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/shema-1.mp3` | clean (both) | 100% |  |  |
| `audio/m/israeli/prayer/torah-bless-1.mp3` | clean (both) | 100% |  |  |
