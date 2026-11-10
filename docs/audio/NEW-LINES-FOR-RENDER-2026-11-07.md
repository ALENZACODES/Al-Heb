# New Hebrew lines for the audio lane (Lane 4, items branch, 2026-11-07)

Nothing here has audio. Lane 4 rendered no clip. This lists the Hebrew text Lane 4 added that a learner could expect to hear, with a proposed id and path, so the audio lane can render it in its own pipeline. The day pages render no play button for these (no clip exists); once clips exist the view can add one.

## 1. Day-page key words (data/calendar/days.json, shown on /day/<date>)

Proposed path `audio/{m|f}/{tradition}/word/<id>.mp3`, kind `word`, Israeli voices m and f first. A word already in the dictionary with a clip can be aliased to it instead of re-rendered.

| id (proposed) | Hebrew | transliteration | English | day |
|---|---|---|---|---|
| cal-shabbat-1 | שַׁבָּת שָׁלוֹם | Shabbat shalom | a peaceful Shabbat (the greeting) | shabbat |
| cal-shabbat-2 | נֵרוֹת | nerot | candles | shabbat |
| cal-shabbat-3 | קִדּוּשׁ | kiddush | sanctification; the blessing over wine | shabbat |
| cal-shabbat-4 | חַלָּה | challah | braided Shabbat bread | shabbat |
| cal-shabbat-5 | מְנוּחָה | menuchah | rest | shabbat |
| cal-shabbat-6 | הַבְדָּלָה | havdalah | separation; the ceremony that ends Shabbat | shabbat |
| cal-shabbat-7 | שָׁבוּעַ טוֹב | shavua tov | a good week (said after Havdalah) | shabbat |
| cal-erev-shabbat-1 | עֶרֶב | erev | evening; the eve of a day | erev-shabbat |
| cal-erev-shabbat-2 | הַדְלָקַת נֵרוֹת | hadlakat nerot | candle lighting | erev-shabbat |
| cal-erev-shabbat-3 | שְׁקִיעָה | shki'ah | sunset | erev-shabbat |
| cal-rosh-chodesh-1 | חֹדֶשׁ | chodesh | month | rosh-chodesh |
| cal-rosh-chodesh-2 | יָרֵחַ | yare'ach | moon | rosh-chodesh |
| cal-rosh-chodesh-3 | חֹדֶשׁ טוֹב | chodesh tov | a good month (the greeting) | rosh-chodesh |
| cal-rosh-chodesh-4 | הַלֵּל | Hallel | psalms of praise (Psalms 113-118) | rosh-chodesh |
| cal-erev-festival-1 | חַג | chag | festival | erev-festival |
| cal-erev-festival-2 | חַג שָׂמֵחַ | chag sameach | happy festival (the greeting) | erev-festival |
| cal-rosh-hashanah-1 | שׁוֹפָר | shofar | ram's horn | rosh-hashanah |
| cal-rosh-hashanah-2 | תַּפּוּחַ בִּדְבַשׁ | tapuach bidvash | apple in honey | rosh-hashanah |
| cal-rosh-hashanah-3 | שָׁנָה טוֹבָה | shanah tovah | a good year (the greeting) | rosh-hashanah |
| cal-rosh-hashanah-4 | תְּשׁוּבָה | teshuvah | return, repentance | rosh-hashanah |
| cal-rosh-hashanah-5 | תַּשְׁלִיךְ | tashlich | casting away (the riverside ceremony) | rosh-hashanah |
| cal-yom-kippur-1 | צוֹם | tzom | fast | yom-kippur |
| cal-yom-kippur-2 | סְלִיחָה | slichah | forgiveness; sorry | yom-kippur |
| cal-yom-kippur-3 | כָּל נִדְרֵי | Kol Nidrei | 'all vows', the evening prayer that opens the day | yom-kippur |
| cal-yom-kippur-4 | נְעִילָה | Ne'ilah | closing; the final service | yom-kippur |
| cal-yom-kippur-5 | גְּמַר חֲתִימָה טוֹבָה | g'mar chatimah tovah | may you be sealed for good (the greeting) | yom-kippur |
| cal-sukkot-1 | סֻכָּה | sukkah | booth, hut | sukkot |
| cal-sukkot-2 | לוּלָב | lulav | palm frond | sukkot |
| cal-sukkot-3 | אֶתְרוֹג | etrog | citron | sukkot |
| cal-sukkot-4 | אֻשְׁפִּיזִין | ushpizin | guests (Aramaic) | sukkot |
| cal-sukkot-5 | חַג שָׂמֵחַ | chag sameach | happy festival | sukkot |
| cal-shemini-atzeret-1 | תּוֹרָה | Torah | Torah, teaching | shemini-atzeret |
| cal-shemini-atzeret-2 | הַקָּפוֹת | hakafot | circuits with the Torah scrolls | shemini-atzeret |
| cal-shemini-atzeret-3 | גֶּשֶׁם | geshem | rain | shemini-atzeret |
| cal-shemini-atzeret-4 | בְּרֵאשִׁית | Bereshit | 'In the beginning', the first word of the Torah | shemini-atzeret |
| cal-shemini-atzeret-5 | שִׂמְחָה | simchah | joy | shemini-atzeret |
| cal-simchat-torah-1 | תּוֹרָה | Torah | Torah, teaching | simchat-torah |
| cal-simchat-torah-2 | הַקָּפוֹת | hakafot | circuits with the Torah scrolls | simchat-torah |
| cal-simchat-torah-3 | שִׂמְחָה | simchah | joy | simchat-torah |
| cal-hanukkah-1 | חֲנֻכִּיָּה | chanukiyah | the nine-branched Hanukkah lamp | hanukkah |
| cal-hanukkah-2 | נֵר | ner | candle, lamp | hanukkah |
| cal-hanukkah-3 | שַׁמָּשׁ | shamash | the helper candle | hanukkah |
| cal-hanukkah-4 | סְבִיבוֹן | sevivon | dreidel, spinning top | hanukkah |
| cal-hanukkah-5 | נֵס | nes | miracle | hanukkah |
| cal-hanukkah-6 | סֻפְגָּנִיָּה | sufganiyah | jam doughnut | hanukkah |
| cal-hanukkah-7 | לְבִיבָה | levivah | latke, potato pancake | hanukkah |
| cal-tu-bishvat-1 | עֵץ | etz | tree | tu-bishvat |
| cal-tu-bishvat-2 | פְּרִי | pri | fruit | tu-bishvat |
| cal-tu-bishvat-3 | נְטִיעָה | neti'ah | planting | tu-bishvat |
| cal-tu-bishvat-4 | שִׁבְעַת הַמִּינִים | shiv'at haminim | the seven species | tu-bishvat |
| cal-tu-bishvat-5 | רִמּוֹן | rimon | pomegranate | tu-bishvat |
| cal-purim-1 | מְגִלָּה | megillah | scroll; the Book of Esther | purim |
| cal-purim-2 | רַעֲשָׁן | ra'ashan | noisemaker, grogger | purim |
| cal-purim-3 | אֹזֶן הָמָן | ozen Haman | hamantasch (literally 'Haman's ear') | purim |
| cal-purim-4 | מִשְׁלוֹחַ מָנוֹת | mishlo'ach manot | sending portions (gifts of food) | purim |
| cal-purim-5 | תַּחְפֹּשֶׂת | tachposet | costume | purim |
| cal-purim-6 | אֶסְתֵּר | Esther | Esther | purim |
| cal-pesach-1 | סֵדֶר | seder | order; the Passover meal | pesach |
| cal-pesach-2 | מַצָּה | matzah | unleavened bread | pesach |
| cal-pesach-3 | הַגָּדָה | haggadah | the telling; the seder book | pesach |
| cal-pesach-4 | מָרוֹר | maror | bitter herb | pesach |
| cal-pesach-5 | חָמֵץ | chametz | leavened food | pesach |
| cal-pesach-6 | אֲפִיקוֹמָן | afikoman | the hidden half-matzah eaten last | pesach |
| cal-yom-hashoah-1 | שׁוֹאָה | Shoah | catastrophe; the Holocaust | yom-hashoah |
| cal-yom-hashoah-2 | זִכָּרוֹן | zikaron | memory, remembrance | yom-hashoah |
| cal-yom-hashoah-3 | נִצּוֹל | nitzol | survivor | yom-hashoah |
| cal-yom-hashoah-4 | לִזְכֹּר | lizkor | to remember | yom-hashoah |
| cal-yom-hazikaron-1 | זִכָּרוֹן | zikaron | memory, remembrance | yom-hazikaron |
| cal-yom-hazikaron-2 | צְפִירָה | tzfirah | siren | yom-hazikaron |
| cal-yom-hazikaron-3 | חַיָּל | chayal | soldier | yom-hazikaron |
| cal-yom-hazikaron-4 | נוֹפְלִים | noflim | the fallen | yom-hazikaron |
| cal-yom-haatzmaut-1 | עַצְמָאוּת | atzma'ut | independence | yom-haatzmaut |
| cal-yom-haatzmaut-2 | דֶּגֶל | degel | flag | yom-haatzmaut |
| cal-yom-haatzmaut-3 | מְדִינָה | medinah | state, country | yom-haatzmaut |
| cal-yom-haatzmaut-4 | הַתִּקְוָה | Hatikvah | 'the hope', Israel's anthem | yom-haatzmaut |
| cal-yom-haatzmaut-5 | מַנְגָּל | mangal | barbecue | yom-haatzmaut |
| cal-shavuot-1 | תּוֹרָה | Torah | Torah, teaching | shavuot |
| cal-shavuot-2 | בִּכּוּרִים | bikkurim | first fruits | shavuot |
| cal-shavuot-3 | עֲשֶׂרֶת הַדִּבְּרוֹת | aseret hadibrot | the Ten Commandments (literally 'ten sayings') | shavuot |
| cal-shavuot-4 | הַר סִינַי | Har Sinai | Mount Sinai | shavuot |
| cal-shavuot-5 | רוּת | Rut | Ruth | shavuot |
| cal-shavuot-6 | גְּבִינָה | gvinah | cheese | shavuot |
| cal-tisha-bav-1 | צוֹם | tzom | fast | tisha-bav |
| cal-tisha-bav-2 | אֵיכָה | Eichah | 'How...', the Book of Lamentations | tisha-bav |
| cal-tisha-bav-3 | קִינָה | kinah | lament, dirge | tisha-bav |
| cal-tisha-bav-4 | בֵּית הַמִּקְדָּשׁ | Beit HaMikdash | the Temple in Jerusalem | tisha-bav |
| cal-tisha-bav-5 | חֻרְבָּן | churban | destruction | tisha-bav |

87 words.

## 2. Day-page names (the pointed heading of each day)

Proposed path `audio/{m|f}/{tradition}/word/cal-name-<day>.mp3`, kind `word`.

| id (proposed) | Hebrew | transliteration | English |
|---|---|---|---|
| cal-name-shabbat | שַׁבָּת | Shabbat | Shabbat (the Sabbath) |
| cal-name-erev-shabbat | עֶרֶב שַׁבָּת | erev Shabbat | Friday, the eve of Shabbat |
| cal-name-rosh-chodesh | רֹאשׁ חֹדֶשׁ | Rosh Chodesh | Rosh Chodesh (the new month) |
| cal-name-erev-festival | עֶרֶב חַג | erev chag | Eve of a festival |
| cal-name-rosh-hashanah | רֹאשׁ הַשָּׁנָה | Rosh HaShanah | Rosh Hashanah (the Jewish New Year) |
| cal-name-yom-kippur | יוֹם כִּפּוּר | Yom Kippur | Yom Kippur (the Day of Atonement) |
| cal-name-sukkot | סֻכּוֹת | Sukkot | Sukkot (the Festival of Booths) |
| cal-name-shemini-atzeret | שְׁמִינִי עֲצֶרֶת וְשִׂמְחַת תּוֹרָה | Shemini Atzeret veSimchat Torah | Shemini Atzeret and Simchat Torah |
| cal-name-simchat-torah | שִׂמְחַת תּוֹרָה | Simchat Torah | Simchat Torah |
| cal-name-hanukkah | חֲנֻכָּה | Chanukah | Hanukkah (the Festival of Lights) |
| cal-name-tu-bishvat | ט״וּ בִּשְׁבָט | Tu BiShvat | Tu BiShvat (the New Year for Trees) |
| cal-name-purim | פּוּרִים | Purim | Purim |
| cal-name-pesach | פֶּסַח | Pesach | Pesach (Passover) |
| cal-name-yom-hashoah | יוֹם הַשּׁוֹאָה | Yom HaShoah | Yom HaShoah (Holocaust Remembrance Day) |
| cal-name-yom-hazikaron | יוֹם הַזִּכָּרוֹן | Yom HaZikaron | Yom HaZikaron (Israel's Memorial Day) |
| cal-name-yom-haatzmaut | יוֹם הָעַצְמָאוּת | Yom HaAtzma'ut | Yom HaAtzmaut (Israel Independence Day) |
| cal-name-shavuot | שָׁבוּעוֹת | Shavuot | Shavuot (the Festival of Weeks) |
| cal-name-tisha-bav | תִּשְׁעָה בְּאָב | Tish'ah beAv | Tisha B'Av (the Ninth of Av) |

## 3. Morning screen

No new Hebrew text: the 130 morning verses and Modeh Ani gained transliteration and English only. Existing ids are unchanged (Modeh Ani = registry `modeh-ani-1`, kind line).

