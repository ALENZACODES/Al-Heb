# Israeli audio: speech-to-text check

Each clip was played to a Hebrew speech-to-text model (ivrit-ai Whisper large-v3-turbo) and what it heard was compared with the Hebrew the clip should say. Spelling-only differences are allowed (ו/י vowel letters, ט/ת, כ/ק, ע/א, ס/ש, a final א/ה). A machine check: a **fail** is strong evidence the clip is wrong; a **pass** means it is recognisable, not that a teacher has approved it.

Unique recordings checked: **6603** (identical files under several ids are counted once).

| kind | fail | unheard | borderline | number | pass |
|---|---|---|---|---|---|
| builder | 14 | 0 | 41 | 0 | 267 |
| word | 48 | 0 | 102 | 6 | 6125 |
| **all** | **62** | **0** | **143** | **6** | **6392** |

Clip files to re-record (fail + unheard + borderline, every path sharing the audio): **252**, listed in [asr-redo-israeli.txt](asr-redo-israeli.txt). Full table: [asr-check.csv](asr-check.csv).

Fix them with `python tools/audio/asr-check/fix.py` (needs GOOGLE_TTS_API_KEY).

## Worst 150

| verdict | score | should say | heard | phonetic | clip |
|---|---|---|---|---|---|
| fail | 0.0 | הָא | אה. | ha | `audio/f/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הִוא | היו | hiv | `audio/f/israeli/word/kiddush-veshamru-w14.mp3` |
| fail | 0.0 | הָא | אה | ha | `audio/m/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | הִוא | היו | hiv | `audio/m/israeli/word/kiddush-veshamru-w14.mp3` |
| fail | 0.0 | פֶּה | תודה רבה | peh | `audio/builder/h60b16793_noa.mp3` |
| fail | 0.286 | כָּאן | קמקורי | kan | `audio/builder/h0c3016b2_ari.mp3` |
| fail | 0.333 | שִׁבְעָה | שספה | shiv'ah | `audio/builder/h68a92f84_ari.mp3` |
| fail | 0.5 | שָׂבַע | סבא | sava | `audio/f/israeli/word/h264da105.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/h68843f80.mp3` |
| fail | 0.5 | בְּפִי | בשיא | befi | `audio/f/israeli/word/haftarah-after-w133.mp3` |
| fail | 0.5 | סָר | שר | sar | `audio/f/israeli/word/hc480edcd.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/yigdal-w47.mp3` |
| fail | 0.5 | אֶל | אר | el | `audio/f/israeli/word/yigdal-w8.mp3` |
| fail | 0.5 | אִירָא׃ | יראה | ira | `audio/m/israeli/word/adon-olam-1-w72.mp3` |
| fail | 0.5 | שָׂבַע | סבא | sava | `audio/m/israeli/word/h264da105.mp3` |
| fail | 0.5 | סָר | שר | sar | `audio/m/israeli/word/hc480edcd.mp3` |
| fail | 0.5 | שִׁשָּׁה | שיסה | shishah | `audio/m/israeli/word/numbers-06-m.mp3` |
| fail | 0.5 | פָּרָה | בואו רע | parah | `audio/builder/h80d6f3f0_ari.mp3` |
| fail | 0.5 | שִׁשָּׁה | שיסו | shishah | `audio/builder/pc9b3fcc6_noa.mp3` |
| fail | 0.5 | טָרִי | צ'רי | tari | `audio/builder/h8349e150_noa.mp3` |
| fail | 0.571 | דְקֻדְשָׁא | דקוצ'ה | dekudsha | `audio/f/israeli/word/brich-shmei-w65.mp3` |
| fail | 0.571 | בְשָׂמִים׃ | וסמים. | vesamim | `audio/f/israeli/word/havdalah-spices-w9.mp3` |
| fail | 0.571 | בְשָׂמִים | וסמים. | vesamim | `audio/f/israeli/word/i-06-w3.mp3` |
| fail | 0.571 | וְיִתְנַשֵּׂא | והתנסה. | veyitnase | `audio/f/israeli/word/kaddish-1-w32.mp3` |
| fail | 0.571 | דְקוּדְשָׁא | דקוצ'ה | dekudesha | `audio/f/israeli/word/kaddish-1-w37.mp3` |
| fail | 0.571 | דְקֻדְשָׁא | דקוצ'ה | dekudsha | `audio/m/israeli/word/brich-shmei-w65.mp3` |
| fail | 0.571 | בְשָׂמִים׃ | וסמים. | vesamim | `audio/m/israeli/word/havdalah-spices-w9.mp3` |
| fail | 0.571 | בְשָׂמִים | וסמים. | vesamim | `audio/m/israeli/word/i-06-w3.mp3` |
| fail | 0.571 | דְקוּדְשָׁא | דקוצ'ה | dekudesha | `audio/m/israeli/word/kaddish-1-w37.mp3` |
| fail | 0.571 | בִּנְסֹעַ | בנשואה | binso'a | `audio/m/israeli/word/vayehi-binsoa-w2.mp3` |
| fail | 0.571 | שָׁבוּעַ | שישה סבועה | shavu'a | `audio/builder/h92151b55_noa.mp3` |
| fail | 0.571 | חֲמִשָּׁה | חמיסופה | chamishah | `audio/builder/h29aadfe4_ari.mp3` |
| fail | 0.667 | עֻזּוֹ | וזו | uzo | `audio/f/israeli/word/aleinu-1-w50.mp3` |
| fail | 0.667 | וּלְחַיִּין | ולחיים. | ulechayin | `audio/f/israeli/word/brich-shmei-w117.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/f/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | וּמַסְגֵּא | ומזגה. | umasge | `audio/f/israeli/word/brich-shmei-w91.mp3` |
| fail | 0.667 | טַף | ת' | taf | `audio/f/israeli/word/h0cc80aed.mp3` |
| fail | 0.667 | אִוָּה | איבה | ivah | `audio/f/israeli/word/h0cdd730a.mp3` |
| fail | 0.667 | יֻדַּע | יהודה | yuda | `audio/f/israeli/word/h0e071b5c.mp3` |
| fail | 0.667 | הִוָּה | היבה | hivah | `audio/f/israeli/word/ha3cf2c46.mp3` |
| fail | 0.667 | אָכֹם | החום | akhom | `audio/f/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | שְׂחוֹק | צחוק | sechok | `audio/f/israeli/word/shir-hamaalot-w11.mp3` |
| fail | 0.667 | עֻזּוֹ | וזו | uzo | `audio/m/israeli/word/aleinu-1-w50.mp3` |
| fail | 0.667 | דְּלִבָּאי | בלי ביי | delibay | `audio/m/israeli/word/brich-shmei-w112.mp3` |
| fail | 0.667 | וּלְחַיִּין | ולחיים. | ulechayin | `audio/m/israeli/word/brich-shmei-w117.mp3` |
| fail | 0.667 | וְאַתְרָךְ | והטראח | ve'atrakh | `audio/m/israeli/word/brich-shmei-w7.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/m/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | וּמַסְגֵּא | ומזגה. | umasge | `audio/m/israeli/word/brich-shmei-w91.mp3` |
| fail | 0.667 | אִוָּה | איבה | ivah | `audio/m/israeli/word/h0cdd730a.mp3` |
| fail | 0.667 | יֻדַּע | יהודה | yuda | `audio/m/israeli/word/h0e071b5c.mp3` |
| fail | 0.667 | יְרִיעָה | יריה | yeri'ah | `audio/m/israeli/word/ha54e1129.mp3` |
| fail | 0.667 | אָכֹם | אכון | akhom | `audio/m/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | לֹא אִירָא | לא יראה. | lo ira | `audio/m/israeli/word/i-09-w16.mp3` |
| fail | 0.667 | חֲמִשָּׁה | חמיסה | chamishah | `audio/m/israeli/word/numbers-05-m.mp3` |
| fail | 0.667 | שְׂחוֹק | צחוק | sechok | `audio/m/israeli/word/shir-hamaalot-w11.mp3` |
| fail | 0.667 | רֹאשׁ | רושף | rosh | `audio/builder/h4fed6814_ari.mp3` |
| fail | 0.667 | שָׁבוּעַ | שוזבועה | shavu'a | `audio/builder/h92151b55_ari.mp3` |
| fail | 0.667 | חֲמִשָּׁה | חמיסו | chamishah | `audio/builder/h29aadfe4_noa.mp3` |
| fail | 0.667 | שִׁבְעָה | שיסעה | shiv'ah | `audio/builder/h68a92f84_noa.mp3` |
| fail | 0.667 | מֵאָה | מה? | me'ah | `audio/builder/hffd9b904_noa.mp3` |
| fail | 0.667 | כֶּלֶב | כאב | kelev | `audio/builder/kelev_ari.mp3` |
| fail | 0.727 | וּבְשָׁכְבְּךָ | הופשח בך. | uveshakhbekha | `audio/f/israeli/word/shema-vahavta-w30.mp3` |
| borderline | 0.75 | שַׂמְּחֵנוּ | סמכנו | samechenu | `audio/f/israeli/word/haftarah-after-w64.mp3` |
| borderline | 0.75 | בְּשָׂשׁוֹן | בסשון | besashon | `audio/f/israeli/word/havdalah-opening-w17.mp3` |
| borderline | 0.75 | נֶאְדָּר | נהדר | nedar | `audio/f/israeli/word/mi-chamocha-1-w6.mp3` |
| borderline | 0.75 | נֶאְדָּר | נהדר | nedar | `audio/f/israeli/word/r43-w3.mp3` |
| borderline | 0.75 | וַאֲבָרֲכָה | והברכה. | va'avarakhah | `audio/m/israeli/word/ashrei-145-1-3-w6.mp3` |
| borderline | 0.75 | בְּשָׂשׁוֹן | בסשון | besashon | `audio/m/israeli/word/havdalah-opening-w17.mp3` |
| borderline | 0.75 | בְּבַקָּשָׁה | בבקיסא. | bevakashah | `audio/m/israeli/word/politeness-03.mp3` |
| borderline | 0.75 | שֶׁמֶשׁ | שף מה שף | shemesh | `audio/builder/h86027352_noa.mp3` |
| borderline | 0.75 | רֹאשׁ | ראש אף | rosh | `audio/builder/h4fed6814_noa.mp3` |
| borderline | 0.75 | שְׁלוֹשָׁה | שץ לא שסע | sheloshah | `audio/builder/h3dfe9831_ari.mp3` |
| borderline | 0.75 | שְׁלוֹשָׁה | שסלו שסה | sheloshah | `audio/builder/h3dfe9831_noa.mp3` |
| borderline | 0.75 | שְׁלִישִׁי | שסלישסי | shelishi | `audio/builder/h0b1cfbd9_ari.mp3` |
| borderline | 0.75 | שְׁלִישִׁי | שס לי שסי | shelishi | `audio/builder/h0b1cfbd9_noa.mp3` |
| borderline | 0.8 | אֲבָרֲכֶךָּ | הברכך | avarakheka | `audio/f/israeli/word/ashrei-145-1-3-w11.mp3` |
| borderline | 0.8 | דְּהוּא | עד הוא | dehu | `audio/f/israeli/word/brich-shmei-w84.mp3` |
| borderline | 0.8 | שַׁקְשׁוּקָה | שפקה שסוכה | shakshukah | `audio/f/israeli/word/cafe-18.mp3` |
| borderline | 0.8 | שְׁאֵר | שוייר | she'er | `audio/f/israeli/word/h0210d79f.mp3` |
| borderline | 0.8 | חֵמָה | חמאה | chemah | `audio/f/israeli/word/h4739925f.mp3` |
| borderline | 0.8 | פַּר | פער | par | `audio/f/israeli/word/h69a35691.mp3` |
| borderline | 0.8 | בְיָמֵינוּ | וימינו | veyameinu | `audio/f/israeli/word/haftarah-after-w57.mp3` |
| borderline | 0.8 | בְשֵׁם | ושם. | veshem | `audio/f/israeli/word/haftarah-after-w90.mp3` |
| borderline | 0.8 | בָּךְ׃ | באח | bakh | `audio/f/israeli/word/havdalah-opening-w39.mp3` |
| borderline | 0.8 | וִיקָר | ועיקר | vikar | `audio/f/israeli/word/havdalah-opening-w51.mp3` |
| borderline | 0.8 | שָׁר | שער | shar | `audio/f/israeli/word/hcd826bec.mp3` |
| borderline | 0.8 | אִכֵּף | אי כיף | ikef | `audio/f/israeli/word/hd502ab04.mp3` |
| borderline | 0.8 | אָוֶן | אבן | aven | `audio/f/israeli/word/hddeaa2ed.mp3` |
| borderline | 0.8 | שִׁשָּׁה | שי שופע | shishah | `audio/f/israeli/word/numbers-06-m.mp3` |
| borderline | 0.8 | בַגּוֹיִם | וגויים | vagoyim | `audio/f/israeli/word/shir-hamaalot-w17.mp3` |
| borderline | 0.8 | בְרִנָּה | ורינה | verinah | `audio/f/israeli/word/shir-hamaalot-w43.mp3` |
| borderline | 0.8 | בְאוֹר | ואור | ve'or | `audio/f/israeli/word/sim-shalom-w19.mp3` |
| borderline | 0.8 | דְּהוּא | עד הוא | dehu | `audio/m/israeli/word/brich-shmei-w84.mp3` |
| borderline | 0.8 | סְתָם | סם | setam | `audio/m/israeli/word/fillers-09.mp3` |
| borderline | 0.8 | בְיָמֵינוּ | וימינו | veyameinu | `audio/m/israeli/word/haftarah-after-w57.mp3` |
| borderline | 0.8 | בְשֵׁם | ושם. | veshem | `audio/m/israeli/word/haftarah-after-w90.mp3` |
| borderline | 0.8 | וִיקָר | ועיקר | vikar | `audio/m/israeli/word/havdalah-opening-w51.mp3` |
| borderline | 0.8 | שָׁר | שער | shar | `audio/m/israeli/word/hcd826bec.mp3` |
| borderline | 0.8 | אָוֶן | אבן | aven | `audio/m/israeli/word/hddeaa2ed.mp3` |
| borderline | 0.8 | וַיְהִי בִּנְסֹעַ הָאָרֹן | ויהי בנשואה הארון. | vayhi binso'a ha'aron | `audio/m/israeli/word/i-26-w2.mp3` |
| borderline | 0.8 | רֶבַע | ראבה | reva | `audio/m/israeli/word/numbers-19.mp3` |
| borderline | 0.8 | וּבְשָׁכְבְּךָ | ופשח בך. | uveshakhbekha | `audio/m/israeli/word/shema-vahavta-w30.mp3` |
| borderline | 0.8 | בַגּוֹיִם | וגויים | vagoyim | `audio/m/israeli/word/shir-hamaalot-w17.mp3` |
| borderline | 0.8 | בְרִנָּה | ורינה | verinah | `audio/m/israeli/word/shir-hamaalot-w43.mp3` |
| borderline | 0.8 | בְאוֹר | ואור. | ve'or | `audio/m/israeli/word/sim-shalom-w19.mp3` |
| borderline | 0.8 | וּבְשָׁכְבְּךָ | ופשח בך. | uveshakhbekha | `audio/m/israeli/word/vahavta-full-w24.mp3` |
| borderline | 0.8 | שְׁמִי | שסמי | shemi | `audio/builder/pec9a400e_ari.mp3` |
| borderline | 0.8 | שְׁמִי | שיסמי | shemi | `audio/builder/pec9a400e_noa.mp3` |
| borderline | 0.8 | אֵשׁ | אשף | esh | `audio/builder/hf1da5ea6_ari.mp3` |
| borderline | 0.8 | אֵשׁ | אשף | esh | `audio/builder/hf1da5ea6_noa.mp3` |
| borderline | 0.8 | שָׁנָה | שסנה | shanah | `audio/builder/hf07c1580_ari.mp3` |
| borderline | 0.8 | שָׁנָה | שפנה | shanah | `audio/builder/hf07c1580_noa.mp3` |
| borderline | 0.8 | שֵׁנִי | שסני | sheni | `audio/builder/h42410d5e_ari.mp3` |
| borderline | 0.8 | שֵׁנִי | שפני | sheni | `audio/builder/h42410d5e_noa.mp3` |
| borderline | 0.8 | טָרִי | תארי | tari | `audio/builder/h8349e150_ari.mp3` |
| borderline | 0.8 | שָׁם | שסם | sham | `audio/builder/hf2bba104_ari.mp3` |
| borderline | 0.8 | שָׁם | שסם | sham | `audio/builder/hf2bba104_noa.mp3` |
| borderline | 0.8 | כָּאן | כן | kan | `audio/builder/h0c3016b2_noa.mp3` |
| borderline | 0.8 | שׁוּב | שפוב | shuv | `audio/builder/h99a070bb_ari.mp3` |
| borderline | 0.8 | שׁוּב | שפוב | shuv | `audio/builder/h99a070bb_noa.mp3` |
| borderline | 0.8 | לְאָן | לין | le'an | `audio/builder/h79df22f0_noa.mp3` |
| borderline | 0.833 | אַנְטִיבְּיוֹטִיקָה | אנטיפיוטיקה | antibeyotikah | `audio/f/israeli/word/i-14-w15.mp3` |
| borderline | 0.833 | מֶשֶׁךְ־הַזָּרַע | משך חזרה | meshekh-hazara | `audio/f/israeli/word/shir-hamaalot-w41.mp3` |
| borderline | 0.833 | דְכָל־עַמָּךְ | נחל אמח | dekhal-amakh | `audio/m/israeli/word/brich-shmei-w114.mp3` |
| borderline | 0.833 | אַנְטִיבְּיוֹטִיקָה | אנטיפיוטיקה | antibeyotikah | `audio/m/israeli/word/i-14-w15.mp3` |
| borderline | 0.833 | מֶשֶׁךְ־הַזָּרַע | משך חזרה | meshekh-hazara | `audio/m/israeli/word/shir-hamaalot-w41.mp3` |
| borderline | 0.857 | בְחֶפְצוֹ | וחפצו. | vecheftzo | `audio/f/israeli/word/adon-olam-1-w11.mp3` |
| borderline | 0.857 | מָלַךְ | מלאך | malakh | `audio/f/israeli/word/adon-olam-1-w4.mp3` |
| borderline | 0.857 | בַשָּׁלוֹם׃ | ושלום. | vashalom | `audio/f/israeli/word/adonai-oz-w8.mp3` |
| borderline | 0.857 | שָׂמָנוּ | שמענו | samanu | `audio/f/israeli/word/aleinu-1-w14.mp3` |
| borderline | 0.857 | שָׁלוֹם | שסלום | shalom | `audio/f/israeli/word/anchor-shin.mp3` |
| borderline | 0.857 | וַאֲהַלְלָה | ואהלה. | va'ahalelah | `audio/f/israeli/word/ashrei-145-1-3-w12.mp3` |
| borderline | 0.857 | צַדִּיקַיָּא | צדיקאיה | tzadikaya | `audio/f/israeli/word/brich-shmei-w38.mp3` |
| borderline | 0.857 | בֵּאלָהָא | בלהה | belaha | `audio/f/israeli/word/brich-shmei-w82.mp3` |
| borderline | 0.857 | מֵצַר | מצער | metzar | `audio/f/israeli/word/h50ac3ea7.mp3` |
| borderline | 0.857 | פַּרְק | פארק | park | `audio/f/israeli/word/h8a450588.mp3` |
| borderline | 0.857 | סָלַח | סלאח | salach | `audio/f/israeli/word/hdd847ae4.mp3` |
| borderline | 0.857 | מָלַךְ | מלאך | malakh | `audio/f/israeli/word/i-09-w2.mp3` |
| borderline | 0.857 | וַיְהִי בִּנְסֹעַ הָאָרֹן | ויהי בנשוא הארון. | vayhi binso'a ha'aron | `audio/f/israeli/word/i-26-w2.mp3` |
| borderline | 0.857 | וְיִתְעַלֶּה | והתעלה. | veyit'aleh | `audio/f/israeli/word/kaddish-1-w34.mp3` |
| borderline | 0.857 | כִרְעוּתֵהּ | קירוטה | khir'uteh | `audio/f/israeli/word/kaddish-1-w8.mp3` |
| borderline | 0.857 | מַה־טֹּבוּ | מה טוב הוא! | mah-tovu | `audio/f/israeli/word/mah-tovu-1-w1.mp3` |
| borderline | 0.857 | מִצָּר | מצהר | mitzar | `audio/f/israeli/word/maoz-tzur-1-w16.mp3` |
| borderline | 0.857 | מְצַוְּךָ | מצבך | metzavekha | `audio/f/israeli/word/shema-vahavta-w19.mp3` |
| borderline | 0.857 | מְצַוְּךָ | מצבך | metzavekha | `audio/f/israeli/word/vahavta-full-w13.mp3` |
| borderline | 0.857 | בִּנְסֹעַ | בן סואה | binso'a | `audio/f/israeli/word/vayehi-binsoa-w2.mp3` |
| borderline | 0.857 | בְחֶפְצוֹ | וחפצו. | vecheftzo | `audio/m/israeli/word/adon-olam-1-w11.mp3` |
| borderline | 0.857 | מָלַךְ | מלאך | malakh | `audio/m/israeli/word/adon-olam-1-w4.mp3` |
| borderline | 0.857 | בַשָּׁלוֹם׃ | ושלום. | vashalom | `audio/m/israeli/word/adonai-oz-w8.mp3` |
| borderline | 0.857 | שָׁלוֹם | שסלום | shalom | `audio/m/israeli/word/anchor-shin.mp3` |
