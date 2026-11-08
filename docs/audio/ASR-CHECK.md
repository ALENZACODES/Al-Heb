# Israeli audio: speech-to-text check

Each clip was played to a Hebrew speech-to-text model (ivrit-ai Whisper large-v3-turbo) and what it heard was compared with the Hebrew the clip should say. Spelling-only differences are allowed (ו/י vowel letters, ט/ת, כ/ק, ע/א, ס/ש, a final א/ה). A machine check: a **fail** is strong evidence the clip is wrong; a **pass** means it is recognisable, not that a teacher has approved it.

Unique recordings checked: **6276** (identical files under several ids are counted once).

| kind | fail | unheard | borderline | number | pass |
|---|---|---|---|---|---|
| word | 51 | 0 | 100 | 6 | 6119 |
| **all** | **51** | **0** | **100** | **6** | **6119** |

Clip files to re-record (fail + unheard + borderline, every path sharing the audio): **200**, listed in [asr-redo-israeli.txt](asr-redo-israeli.txt). Full table: [asr-check.csv](asr-check.csv).

Fix them with `python tools/audio/asr-check/fix.py` (needs GOOGLE_TTS_API_KEY).

## Worst 150

| verdict | score | should say | heard | phonetic | clip |
|---|---|---|---|---|---|
| fail | 0.0 | הָא | אה. | ha | `audio/f/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הִוא | היו | hiv | `audio/f/israeli/word/kiddush-veshamru-w14.mp3` |
| fail | 0.0 | הָא | אה | ha | `audio/m/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הִוא | היו | hiv | `audio/m/israeli/word/kiddush-veshamru-w14.mp3` |
| fail | 0.5 | כָּכָה | ככה | kakhah | `audio/f/israeli/word/h3777d988.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/h68843f80.mp3` |
| fail | 0.5 | בְּפִי | בשיא | befi | `audio/f/israeli/word/haftarah-after-w133.mp3` |
| fail | 0.5 | סָר | שר | sar | `audio/f/israeli/word/hc480edcd.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/yigdal-w8.mp3` |
| fail | 0.5 | אִירָא׃ | יראה | ira | `audio/m/israeli/word/adon-olam-1-w72.mp3` |
| fail | 0.5 | כָּכָה | ככה | kakhah | `audio/m/israeli/word/h3777d988.mp3` |
| fail | 0.5 | סָר | שר | sar | `audio/m/israeli/word/hc480edcd.mp3` |
| fail | 0.571 | דְקֻדְשָׁא | דקוצ'ה | dekudsha | `audio/f/israeli/word/brich-shmei-w65.mp3` |
| fail | 0.571 | דְקוּדְשָׁא | דקוצ'ה | dekudesha | `audio/f/israeli/word/kaddish-1-w37.mp3` |
| fail | 0.571 | כִרְעוּתֵהּ | קירוטה | khir'uteh | `audio/f/israeli/word/kaddish-1-w8.mp3` |
| fail | 0.571 | דְקֻדְשָׁא | דקוצ'ה | dekudsha | `audio/m/israeli/word/brich-shmei-w65.mp3` |
| fail | 0.571 | דְקוּדְשָׁא | דקוצ'ה | dekudesha | `audio/m/israeli/word/kaddish-1-w37.mp3` |
| fail | 0.6 | אֲבָרֲכֶךָּ | הברכך | avarakheka | `audio/f/israeli/word/ashrei-145-1-3-w11.mp3` |
| fail | 0.667 | עֻזּוֹ | וזו | uzo | `audio/f/israeli/word/aleinu-1-w50.mp3` |
| fail | 0.667 | שֶׁכָּכָה | שככה. | shekakhah | `audio/f/israeli/word/ashrei-144-15-w3.mp3` |
| fail | 0.667 | וִיחֻנֶּךָּ׃ | ויחונך. | vichuneka | `audio/f/israeli/word/bless-priestly-2-w5.mp3` |
| fail | 0.667 | וּלְחַיִּין | ולחיים. | ulechayin | `audio/f/israeli/word/brich-shmei-w117.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/f/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | וּמַסְגֵּא | ומזגה. | umasge | `audio/f/israeli/word/brich-shmei-w91.mp3` |
| fail | 0.667 | טַף | ת' | taf | `audio/f/israeli/word/h0cc80aed.mp3` |
| fail | 0.667 | יֻדַּע | יהודה | yuda | `audio/f/israeli/word/h0e071b5c.mp3` |
| fail | 0.667 | כּוֹכָב | כוכב | kokhav | `audio/f/israeli/word/h233af6f2.mp3` |
| fail | 0.667 | לֵוִי | לוי | levi | `audio/f/israeli/word/hc5ed2600.mp3` |
| fail | 0.667 | אָכֹם | החום | akhom | `audio/f/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | וִיחֻנֶּךָּ | ויחונך. | vichuneka | `audio/f/israeli/word/r25-w4.mp3` |
| fail | 0.667 | שְׂחוֹק | צחוק | sechok | `audio/f/israeli/word/shir-hamaalot-w11.mp3` |
| fail | 0.667 | עֻזּוֹ | וזו | uzo | `audio/m/israeli/word/aleinu-1-w50.mp3` |
| fail | 0.667 | שֶׁכָּכָה | שככה. | shekakhah | `audio/m/israeli/word/ashrei-144-15-w3.mp3` |
| fail | 0.667 | וִיחֻנֶּךָּ׃ | ויחונך. | vichuneka | `audio/m/israeli/word/bless-priestly-2-w5.mp3` |
| fail | 0.667 | דְּלִבָּאי | בלי ביי | delibay | `audio/m/israeli/word/brich-shmei-w112.mp3` |
| fail | 0.667 | וּלְחַיִּין | ולחיים. | ulechayin | `audio/m/israeli/word/brich-shmei-w117.mp3` |
| fail | 0.667 | וְאַתְרָךְ | והטראח | ve'atrakh | `audio/m/israeli/word/brich-shmei-w7.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/m/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | וּמַסְגֵּא | ומזגה. | umasge | `audio/m/israeli/word/brich-shmei-w91.mp3` |
| fail | 0.667 | נָכוֹן | ניקון | nakhon | `audio/m/israeli/word/fillers-04.mp3` |
| fail | 0.667 | יֻדַּע | יהודה | yuda | `audio/m/israeli/word/h0e071b5c.mp3` |
| fail | 0.667 | כּוֹכָב | כוכב | kokhav | `audio/m/israeli/word/h233af6f2.mp3` |
| fail | 0.667 | יְרִיעָה | יריה | yeri'ah | `audio/m/israeli/word/ha54e1129.mp3` |
| fail | 0.667 | לֵוִי | לוי | levi | `audio/m/israeli/word/hc5ed2600.mp3` |
| fail | 0.667 | אָכֹם | אכון | akhom | `audio/m/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | לֹא אִירָא | לא יראה. | lo ira | `audio/m/israeli/word/i-09-w16.mp3` |
| fail | 0.667 | וִיחֻנֶּךָּ | ויחונך. | vichuneka | `audio/m/israeli/word/r25-w4.mp3` |
| fail | 0.667 | שְׂחוֹק | צחוק | sechok | `audio/m/israeli/word/shir-hamaalot-w11.mp3` |
| fail | 0.727 | עַל־מַלְכַיָּא | אל-מלקאיה | al-malkhaya | `audio/f/israeli/word/brich-shmei-w59.mp3` |
| fail | 0.727 | וּבְשָׁכְבְּךָ | הופשח בך. | uveshakhbekha | `audio/f/israeli/word/shema-vahavta-w30.mp3` |
| fail | 0.727 | אֲבָרֲכֶךָּ | עבר אחיך | avarakheka | `audio/m/israeli/word/ashrei-145-1-3-w11.mp3` |
| borderline | 0.75 | כִּכְלוֹת | ככלות | kikhlot | `audio/f/israeli/word/adon-olam-1-w18.mp3` |
| borderline | 0.75 | טָבְוָן | טוואן | tavevan | `audio/f/israeli/word/brich-shmei-w93.mp3` |
| borderline | 0.75 | נֶאְדָּר | נהדר | nedar | `audio/f/israeli/word/mi-chamocha-1-w6.mp3` |
| borderline | 0.75 | כִּכְלוֹת | ככלות | kikhlot | `audio/m/israeli/word/adon-olam-1-w18.mp3` |
| borderline | 0.75 | וַאֲבָרֲכָה | והברכה. | va'avarakhah | `audio/m/israeli/word/ashrei-145-1-3-w6.mp3` |
| borderline | 0.8 | דְּהוּא | עד הוא | dehu | `audio/f/israeli/word/brich-shmei-w84.mp3` |
| borderline | 0.8 | שַׁקְשׁוּקָה | שפקה שסוכה | shakshukah | `audio/f/israeli/word/cafe-18.mp3` |
| borderline | 0.8 | שְׁאֵר | שוייר | she'er | `audio/f/israeli/word/h0210d79f.mp3` |
| borderline | 0.8 | חֵמָה | חמאה | chemah | `audio/f/israeli/word/h4739925f.mp3` |
| borderline | 0.8 | עָווֹן | עוון | avon | `audio/f/israeli/word/h5271b622.mp3` |
| borderline | 0.8 | פַּר | פער | par | `audio/f/israeli/word/h69a35691.mp3` |
| borderline | 0.8 | דָּוִד׃ | דוד | david | `audio/f/israeli/word/haftarah-after-w103.mp3` |
| borderline | 0.8 | בְיָמֵינוּ | וימינו | veyameinu | `audio/f/israeli/word/haftarah-after-w57.mp3` |
| borderline | 0.8 | דָּוִד | דוד | david | `audio/f/israeli/word/haftarah-after-w72.mp3` |
| borderline | 0.8 | בְשֵׁם | ושם. | veshem | `audio/f/israeli/word/haftarah-after-w90.mp3` |
| borderline | 0.8 | בָּךְ׃ | באח | bakh | `audio/f/israeli/word/havdalah-opening-w39.mp3` |
| borderline | 0.8 | וִיקָר | ועיקר | vikar | `audio/f/israeli/word/havdalah-opening-w51.mp3` |
| borderline | 0.8 | שָׁר | שער | shar | `audio/f/israeli/word/hcd826bec.mp3` |
| borderline | 0.8 | אִכֵּף | אי כיף | ikef | `audio/f/israeli/word/hd502ab04.mp3` |
| borderline | 0.8 | וַואלָה | וואלה | vavlah | `audio/f/israeli/word/il02-w6.mp3` |
| borderline | 0.8 | שִׁשָּׁה | שי שופע | shishah | `audio/f/israeli/word/numbers-06-m.mp3` |
| borderline | 0.8 | וָואלָה | וואלה! | vavlah | `audio/f/israeli/word/politeness-14.mp3` |
| borderline | 0.8 | בַגּוֹיִם | וגויים | vagoyim | `audio/f/israeli/word/shir-hamaalot-w17.mp3` |
| borderline | 0.8 | בְרִנָּה | ורינה | verinah | `audio/f/israeli/word/shir-hamaalot-w43.mp3` |
| borderline | 0.8 | בְאוֹר | ואור | ve'or | `audio/f/israeli/word/sim-shalom-w19.mp3` |
| borderline | 0.8 | דְּהוּא | עד הוא | dehu | `audio/m/israeli/word/brich-shmei-w84.mp3` |
| borderline | 0.8 | סְתָם | סם | setam | `audio/m/israeli/word/fillers-09.mp3` |
| borderline | 0.8 | עָווֹן | עוון | avon | `audio/m/israeli/word/h5271b622.mp3` |
| borderline | 0.8 | דָּוִד׃ | דוד | david | `audio/m/israeli/word/haftarah-after-w103.mp3` |
| borderline | 0.8 | בְיָמֵינוּ | וימינו | veyameinu | `audio/m/israeli/word/haftarah-after-w57.mp3` |
| borderline | 0.8 | דָּוִד | דוד | david | `audio/m/israeli/word/haftarah-after-w72.mp3` |
| borderline | 0.8 | בְשֵׁם | ושם. | veshem | `audio/m/israeli/word/haftarah-after-w90.mp3` |
| borderline | 0.8 | וִיקָר | ועיקר | vikar | `audio/m/israeli/word/havdalah-opening-w51.mp3` |
| borderline | 0.8 | שָׁר | שער | shar | `audio/m/israeli/word/hcd826bec.mp3` |
| borderline | 0.8 | וַיְהִי בִּנְסֹעַ הָאָרֹן | ויהי בנשואה הארון. | vayhi binso'a ha'aron | `audio/m/israeli/word/i-26-w2.mp3` |
| borderline | 0.8 | וַואלָה | וואלה. | vavlah | `audio/m/israeli/word/il02-w6.mp3` |
| borderline | 0.8 | רֶבַע | ראבה | reva | `audio/m/israeli/word/numbers-19.mp3` |
| borderline | 0.8 | וָואלָה | וואלה! | vavlah | `audio/m/israeli/word/politeness-14.mp3` |
| borderline | 0.8 | וּבְשָׁכְבְּךָ | ופשח בך. | uveshakhbekha | `audio/m/israeli/word/shema-vahavta-w30.mp3` |
| borderline | 0.8 | בַגּוֹיִם | וגויים | vagoyim | `audio/m/israeli/word/shir-hamaalot-w17.mp3` |
| borderline | 0.8 | בְרִנָּה | ורינה | verinah | `audio/m/israeli/word/shir-hamaalot-w43.mp3` |
| borderline | 0.8 | בְאוֹר | ואור. | ve'or | `audio/m/israeli/word/sim-shalom-w19.mp3` |
| borderline | 0.8 | וּבְשָׁכְבְּךָ | ופשח בך. | uveshakhbekha | `audio/m/israeli/word/vahavta-full-w24.mp3` |
| borderline | 0.833 | אַנְטִיבְּיוֹטִיקָה | אנטיפיוטיקה | antibeyotikah | `audio/f/israeli/word/i-14-w15.mp3` |
| borderline | 0.833 | מֶשֶׁךְ־הַזָּרַע | משך חזרה | meshekh-hazara | `audio/f/israeli/word/shir-hamaalot-w41.mp3` |
| borderline | 0.833 | דְכָל־עַמָּךְ | נחל אמח | dekhal-amakh | `audio/m/israeli/word/brich-shmei-w114.mp3` |
| borderline | 0.833 | אַנְטִיבְּיוֹטִיקָה | אנטיפיוטיקה | antibeyotikah | `audio/m/israeli/word/i-14-w15.mp3` |
| borderline | 0.833 | מֶשֶׁךְ־הַזָּרַע | משך חזרה | meshekh-hazara | `audio/m/israeli/word/shir-hamaalot-w41.mp3` |
| borderline | 0.857 | בְחֶפְצוֹ | וחפצו. | vecheftzo | `audio/f/israeli/word/adon-olam-1-w11.mp3` |
| borderline | 0.857 | מָלַךְ | מלאך | malakh | `audio/f/israeli/word/adon-olam-1-w4.mp3` |
| borderline | 0.857 | בַשָּׁלוֹם׃ | ושלום. | vashalom | `audio/f/israeli/word/adonai-oz-w8.mp3` |
| borderline | 0.857 | שָׂמָנוּ | שמענו | samanu | `audio/f/israeli/word/aleinu-1-w14.mp3` |
| borderline | 0.857 | כְּכָל־הֲמוֹנָם | ככל המונם | kekhol-hamonam | `audio/f/israeli/word/aleinu-1-w22.mp3` |
| borderline | 0.857 | שָׁלוֹם | שסלום | shalom | `audio/f/israeli/word/anchor-shin.mp3` |
| borderline | 0.857 | וַאֲהַלְלָה | ואהלה. | va'ahalelah | `audio/f/israeli/word/ashrei-145-1-3-w12.mp3` |
| borderline | 0.857 | לְדָוִד | לדוד | ledavid | `audio/f/israeli/word/ashrei-145-1-3-w2.mp3` |
| borderline | 0.857 | צַדִּיקַיָּא | צדיקאיה | tzadikaya | `audio/f/israeli/word/brich-shmei-w38.mp3` |
| borderline | 0.857 | מֵצַר | מצער | metzar | `audio/f/israeli/word/h50ac3ea7.mp3` |
| borderline | 0.857 | פַּרְק | פארק | park | `audio/f/israeli/word/h8a450588.mp3` |
| borderline | 0.857 | בְשָׂמִים׃ | וסמים. | vesamim | `audio/f/israeli/word/havdalah-spices-w9.mp3` |
| borderline | 0.857 | סָלַח | סלאח | salach | `audio/f/israeli/word/hdd847ae4.mp3` |
| borderline | 0.857 | בְשָׂמִים | וסמים. | vesamim | `audio/f/israeli/word/i-06-w3.mp3` |
| borderline | 0.857 | וַיְהִי בִּנְסֹעַ הָאָרֹן | ויהי בנשוא הארון. | vayhi binso'a ha'aron | `audio/f/israeli/word/i-26-w2.mp3` |
| borderline | 0.857 | וְיִתְנַשֵּׂא | והתנסה. | veyitnase | `audio/f/israeli/word/kaddish-1-w32.mp3` |
| borderline | 0.857 | וְיִתְעַלֶּה | והתעלה. | veyit'aleh | `audio/f/israeli/word/kaddish-1-w34.mp3` |
| borderline | 0.857 | מַה־טֹּבוּ | מה טוב הוא! | mah-tovu | `audio/f/israeli/word/mah-tovu-1-w1.mp3` |
| borderline | 0.857 | בִּנְסֹעַ | בן סואה | binso'a | `audio/f/israeli/word/vayehi-binsoa-w2.mp3` |
| borderline | 0.857 | בְחֶפְצוֹ | וחפצו. | vecheftzo | `audio/m/israeli/word/adon-olam-1-w11.mp3` |
| borderline | 0.857 | מָלַךְ | מלאך | malakh | `audio/m/israeli/word/adon-olam-1-w4.mp3` |
| borderline | 0.857 | בַשָּׁלוֹם׃ | ושלום. | vashalom | `audio/m/israeli/word/adonai-oz-w8.mp3` |
| borderline | 0.857 | כְּכָל־הֲמוֹנָם | ככל המונם | kekhol-hamonam | `audio/m/israeli/word/aleinu-1-w22.mp3` |
| borderline | 0.857 | שָׁלוֹם | שסלום | shalom | `audio/m/israeli/word/anchor-shin.mp3` |
| borderline | 0.857 | וַאֲהַלְלָה | ואהלה. | va'ahalelah | `audio/m/israeli/word/ashrei-145-1-3-w12.mp3` |
| borderline | 0.857 | לְדָוִד | לדוד | ledavid | `audio/m/israeli/word/ashrei-145-1-3-w2.mp3` |
| borderline | 0.857 | צַדִּיקַיָּא | צדיקאיה | tzadikaya | `audio/m/israeli/word/brich-shmei-w38.mp3` |
| borderline | 0.857 | מֵצַר | מצער | metzar | `audio/m/israeli/word/h50ac3ea7.mp3` |
| borderline | 0.857 | פַּרְק | פארק | park | `audio/m/israeli/word/h8a450588.mp3` |
| borderline | 0.857 | בְשָׂמִים׃ | וסמים. | vesamim | `audio/m/israeli/word/havdalah-spices-w9.mp3` |
| borderline | 0.857 | בְשָׂמִים | וסמים. | vesamim | `audio/m/israeli/word/i-06-w3.mp3` |
| borderline | 0.857 | חָכְמָה | חכמת | chokhmah | `audio/m/israeli/word/r32-w2.mp3` |
| borderline | 0.875 | אֵל נָא רְפָא נָא לָהּ | אל נערפה נעלה | el na refa na lah | `audio/f/israeli/word/i-10-w7.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/f/israeli/word/candle-shabbat-w9.mp3` |
| borderline | 0.889 | בָאֱלֹהִים | ואלוהים | va'elohim | `audio/f/israeli/word/ein-kamocha-w2.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/f/israeli/word/hanukkah-candle-w9.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/f/israeli/word/i-30-w9.mp3` |
| borderline | 0.889 | וּבְיוֹמֵיכוֹן | ובהומיכון. | uveyomeikhon | `audio/f/israeli/word/kaddish-1-w12.mp3` |
| borderline | 0.889 | וְיִתְהַדָּר | והתהדר. | veyithadar | `audio/f/israeli/word/kaddish-1-w33.mp3` |
| borderline | 0.889 | בְרֵאשִׁית | וראשית. | vereshit | `audio/f/israeli/word/kiddush-shabbat-eve-w19.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/f/israeli/word/kiddush-shabbat-eve-w9.mp3` |
| borderline | 0.889 | וְהִשְׁתַּחֲווּ | והשתחוו. | vehishtachavu | `audio/f/israeli/word/lecha-hashem-w21.mp3` |
| borderline | 0.889 | מִשְׁאֲלִין | מישלין | mish'alin | `audio/m/israeli/word/brich-shmei-w111.mp3` |
| borderline | 0.889 | שַׁקְשׁוּקָה | שפקה שוקה | shakshukah | `audio/m/israeli/word/cafe-18.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/m/israeli/word/candle-shabbat-w9.mp3` |
| borderline | 0.889 | בָאֱלֹהִים | ואלוהים | va'elohim | `audio/m/israeli/word/ein-kamocha-w2.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/m/israeli/word/hanukkah-candle-w9.mp3` |
| borderline | 0.889 | בְּמִצְוֹתָיו | במצוותיו | bemitzvotav | `audio/m/israeli/word/i-30-w9.mp3` |
| borderline | 0.889 | וּבְיוֹמֵיכוֹן | ובהומיכון. | uveyomeikhon | `audio/m/israeli/word/kaddish-1-w12.mp3` |
| borderline | 0.889 | מִן־שְׁמַיָּא | מין שמעיה. | min-shemaya | `audio/m/israeli/word/kaddish-1-w52.mp3` |
| borderline | 0.889 | וְהִשְׁתַּחֲווּ | והשתחוו. | vehishtachavu | `audio/m/israeli/word/lecha-hashem-w21.mp3` |
