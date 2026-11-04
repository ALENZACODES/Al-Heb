# Prayer-line ids referenced by lessons (for Lane 5)

Lane 5 should define each id below in `data/corpus/registry.json` (pointed Hebrew, source, status). Lane 1 stores NO prayer text in `lessons.json`, only these ids. The Hebrew in `data/curriculum/prompts.json` was typed by an agent from memory and must be checked against whatever Lane 5 verifies.

| id | text (reference only) | first used in |
|---|---|---|
| `bless-priestly-1` | Numbers 6:24 | r05, r15 |
| `bless-priestly-2` | Numbers 6:25 | r05, r25 |
| `bless-priestly-3` | Numbers 6:26 | r05, r26 |
| `shema-1` | Deuteronomy 6:4 | r22 |
| `shema-2` | "Baruch shem kevod malchuto l'olam va'ed" (rabbinic line after the Shema) | r36 |
| `bless-formula-1` | "Baruch atah Adonai Eloheinu melech ha'olam" | r28 |
| `vahavta-1` | Deuteronomy 6:5 | r32 |
| `vahavta-2` | Deuteronomy 6:6-7 | r37 |
| `torah-bless-1` | blessing before the Torah reading ("asher bachar banu") | r38 |
| `torah-bless-2` | blessing after the Torah reading | r38 |
| `modeh-ani-1` | Modeh Ani (m. and f. variants) | r39 |
| `mah-tovu-1` | Numbers 24:5 | r40 |
| `kiddush-wine-1` | Friday-night blessing over wine ("borei peri hagafen") | r41 |
| `avot-1` | opening of the Amidah (Avot) | r42 |
| `mi-chamocha-1` | Exodus 15:11 | r43 |
| `aleinu-1` | Aleinu, first paragraph opening | r44 |
| `kaddish-1` | opening of the Kaddish (Aramaic) | r45 |
| `adon-olam-1` | Adon Olam, first lines | r46 |
| `birkat-hamazon-1` | first blessing of Birkat Hamazon | r47 |

Note: the prompts data refers to `bless-priestly-1` (m12) and `shema-1` (e01) by content, not by id.

## Added by the intermediate lessons (I-01..I-50)

All of these ids are already in `data/corpus/registry.json`; the intermediate lessons only reference them. `ref` is the registry reference.

| id | ref | first used in |
|---|---|---|
| `torah-barchu` | Siddur: Barchu before the Torah reading | I-01 |
| `amidah-lips` | Psalm 51:17 (Amidah preface) | I-02 |
| `avot-closing` | Siddur: Amidah, first blessing, closing lines | I-02 |
| `kedushah-kadosh` | Isaiah 6:3 | I-02 |
| `kedushah-baruch` | Ezekiel 3:12 (last three words) | I-02 |
| `kedushah-yimloch` | Psalm 146:10 | I-02 |
| `oseh-shalom` | Siddur: Oseh shalom | I-02 |
| `ein-kamocha` | Psalm 86:8 | I-03 |
| `gadlu` | Psalm 34:4 | I-03 |
| `lecha-hashem` | Siddur: Lecha Adonai hagedulah (1 Chronicles 29:11, Psalm 99:5, 99:9) | I-03 |
| `vezot-hatorah` | Siddur: V'zot haTorah (Deuteronomy 4:44, Numbers 9:23) | I-03 |
| `etz-chaim` | Siddur: Etz chaim hi (Proverbs 3:18, 3:17, 3:16, Isaiah 42:21) | I-03 |
| `hashivenu` | Lamentations 5:21 | I-03 |
| `yehalelu` | Psalm 148:13-14 | I-03 |
| `candle-shabbat` | Siddur: Shabbat candle blessing | I-05 |
| `kiddush-gen-2-1-3` | Genesis 2:1-3 | I-05 |
| `kiddush-shabbat-eve` | Siddur: Kiddush for Friday night, the sanctification | I-05 |
| `hamotzi` | Siddur: HaMotzi | I-05 |
| `kiddush-veshamru` | Exodus 31:16-17 | I-05 |
| `kiddush-zachor` | Exodus 20:8-11 | I-05 |
| `havdalah-opening` | Siddur: Havdalah, opening verses (Hinei El yeshuati) | I-06 |
| `havdalah-spices` | Siddur: Havdalah, blessing over spices | I-06 |
| `havdalah-flame` | Siddur: Havdalah, blessing over the flame | I-06 |
| `havdalah-hamavdil` | Siddur: Havdalah, the separation blessing | I-06 |
| `yigdal` | Siddur: Yigdal | I-09 |
| `mi-sheberach-opening` | Siddur: Mi sheberach, opening words | I-10 |
| `num-12-13` | Numbers 12:13 (second half) | I-10 |
| `hagomel` | Siddur: Birkat Hagomel | I-10 |
| `shehecheyanu` | Siddur: Shehecheyanu | I-10 |
| `vayehi-binsoa` | Siddur: Vayehi binsoa (Numbers 10:35, Isaiah 2:3, blessing) | I-26 |
| `brich-shmei` | Siddur: Berich shmei (Zohar, Vayakhel) | I-26 |
| `haftarah-before` | Siddur: Haftarah, blessings before | I-26 |
| `sim-shalom` | Siddur: Amidah, Sim shalom (morning) | I-27 |
| `amidah-yihyu` | Siddur: Amidah, closing verse (Psalm 19:15) | I-27 |
| `amidah-elohai-netzor` | Siddur: Amidah, Elohai netzor | I-27 |
| `hanukkah-nissim` | Siddur: Hanukkah, blessing for the miracles | I-31 |
| `hanukkah-candle` | Siddur: Hanukkah candle blessing | I-32 |
| `hanerot-halalu` | Siddur: Hanerot halalu | I-32 |
| `maoz-tzur-1` | Siddur: Maoz Tzur, first verse | I-32 |
| `zimun-opening` | Siddur: Birkat Hamazon, zimun (invitation) | I-33 |
| `shir-hamaalot` | Psalm 126:1-6 | I-33 |
