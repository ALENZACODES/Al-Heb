# Brain Lab Audio Manifest (2026-11-10)

Every Hebrew item a Brain Lab game shows, checked against the recordings the games can play. Built by `node tools/lab/build-audio-manifest.mjs` from the game data; the full list (one row per item, with word id, Hebrew with nikud, English, both voices and the existing clip) is [`BRAIN-LAB-AUDIO-2026-11-10.csv`](BRAIN-LAB-AUDIO-2026-11-10.csv).

**Voices:** Israeli man (Ari, `m`) and Israeli woman (Noa, `f`), the same voices as the rest of the app. The Sephardi and Ashkenazi settings play the Israeli clips (owner decisions, 2026-11-07), so they need nothing of their own except where the tradition says the item differently; those rows say so in the `traditions` column. **Recorded** means a clip of exactly that pointed text exists in both voices and the game can play it.

| Game | Items | Recorded | Record first (1) | Next (2) | Later (3) |
|---|---|---|---|---|---|
| Prayer Chain, Siddur Flash | 48 | 44 | 1 | 3 | 0 |
| Café Order | 29 | 28 | 0 | 1 | 0 |
| Letter Pattern, Word Burst, Root Forge, Path Word | 929 | 812 | 0 | 117 | 0 |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | 110 | 83 | 0 | 27 | 0 |
| Taxi Turns | 5 | 4 | 0 | 1 | 0 |
| Vowel Rain | 73 | 39 | 0 | 15 | 19 |
| Calendar Puzzle | 27 | 14 | 0 | 0 | 13 |
| Sound Twins | 32 | 26 | 0 | 0 | 6 |
| Count Up, Number Ear, Migration Birds | 18 | 18 | 0 | 0 | 0 |
| Letter Hunt, Letter Matrix, Middle Letter, Gematria, Letter Sequence, Tile Turn | 27 | 27 | 0 | 0 | 0 |

Priority 1: a game plays it, or asks for it by sound, and beginners meet it first. Priority 2: a game plays it but higher up, or shows it silently to beginners. Priority 3: everything else.

**Held:** 44 recordings failed 2 of 3 transcription checks and are not played in Brain Lab (`data/lab/clip-holds.json`); the game shows the written sound instead. Each needs a person to listen before it is replaced or released. They are the rows marked "held: needs a listen" in the CSV.

## Record First

| Game | Id | Hebrew | English | Ari (m) | Noa (f) | Traditions |
|---|---|---|---|---|---|---|
| Prayer Chain, Siddur Flash | `torah-barchu` | בָּרְכוּ אֶת יְהוָה הַמְּבֹרָךְ׃ | Barchu (call to the Torah blessing) | missing | missing | Holds the divine name: recording held for John's decision; when recorded, the name is spoken as Adonai |

## Next

| Game | Id | Hebrew | English | Ari (m) | Noa (f) | Traditions |
|---|---|---|---|---|---|---|
| Café Order | `pf8630913` | פִּיתָה | pita bread | recorded | held: needs a listen | Israeli clip for all three settings |
| Prayer Chain, Siddur Flash | `hagomel` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם הַגּוֹמֵל לְחַיָּבִים טוֹבוֹת שֶׁגְּמָלַנִי כָּל טוֹב׃ | Birkat Hagomel (after recovery or safe travel) and the congregation's response | missing | missing | Holds the divine name: recording held for John's decision; when recorded, the name is spoken as Adonai |
| Prayer Chain, Siddur Flash | `sim-shalom` | שִׂים שָׁלוֹם טוֹבָה וּבְרָכָה חֵן וָחֶסֶד וְרַחֲמִים עָלֵינוּ וְעַל כָּל־יִשְׂרָאֵל עַמֶּךָ בָּרְכֵנוּ אָבִינוּ כֻּלָּנוּ כְּאֶחָד בְּאוֹר פָּנֶיךָ כִּי בְאוֹר פָּנֶיךָ נָתַתָּ לָּנוּ יְהוָה אֱלֹהֵינוּ תּוֹרַת חַיִּים וְאַהֲבַת חֶסֶד וּצְדָקָה וּבְרָכָה וְרַחֲמִים וְחַיִּים וְשָׁלוֹם וְטוֹב בְּעֵינֶיךָ לְבָרֵךְ אֶת עַמְּךָ יִשְׂרָאֵל בְּכָל־עֵת וּבְכָל־שָׁעָה בִּשְׁלוֹמֶךָ׃ | Sim shalom (peace blessing of the morning Amidah) | missing | missing | Holds the divine name: recording held for John's decision; when recorded, the name is spoken as Adonai |
| Prayer Chain, Siddur Flash | `haftarah-after` | בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם צוּר כָּל־הָעוֹלָמִים צַדִּיק בְּכָל־הַדּוֹרוֹת הָאֵל הַנֶּאֱמָן הָאֹמֵר וְעֹשֶׂה הַמְדַבֵּר וּמְקַיֵּם שֶׁכָּל־דְּבָרָיו אֱמֶת וָצֶדֶק נֶאֱמָן אַתָּה הוּא יְהוָה אֱלֹהֵינוּ וְנֶאֱמָנִים דְּבָרֶיךָ וְדָבָר אֶחָד מִדְּבָרֶיךָ אָחוֹר לֹא יָשׁוּב רֵיקָם כִּי אֵל מֶלֶךְ נֶאֱמָן וְרַחֲמָן אָתָּה בָּרוּךְ אַתָּה יְהוָה הָאֵל הַנֶּאֱמָן בְּכָל־דְּבָרָיו׃ | Haftarah blessings after the reading (Shabbat) | missing | missing | Holds the divine name: recording held for John's decision; when recorded, the name is spoken as Adonai |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `alef-i` | אִ | syllable "i" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `bet-u` | בֻּ | syllable "bu" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `gimel-a` | גַ | syllable "ga" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `gimel-o` | גֹ | syllable "go" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `dalet-e` | דֶ | syllable "de" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `dalet-o` | דֹ | syllable "do" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `dalet-u` | דֻ | syllable "du" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `zayin-a` | זַ | syllable "za" | held: needs a listen | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `chet-u` | חֻ | syllable "chu" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tet-e` | טֶ | syllable "te" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tet-i` | טִ | syllable "ti" | held: needs a listen | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tet-u` | טֻ | syllable "tu" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `yod-i` | יִ | syllable "yi" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `yod-u` | יֻ | syllable "yu" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `samekh-o` | סֹ | syllable "so" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `ayin-i` | עִ | syllable "i" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `pe-a` | פַּ | syllable "pa" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `pe-o` | פֹּ | syllable "po" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tsadi-i` | צִ | syllable "tzi" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tsadi-o` | צֹ | syllable "tzo" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tsadi-u` | צֻ | syllable "tzu" | held: needs a listen | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `qof-u` | קֻ | syllable "ku" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `resh-o` | רֹ | syllable "ro" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `resh-u` | רֻ | syllable "ru" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tav-e` | תֶ | syllable "te" | recorded | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tav-i` | תִ | syllable "ti" | held: needs a listen | held: needs a listen | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Sound Match, Vowel Rain, Speed Match, Vowel Storm | `tav-u` | תֻ | syllable "tu" | held: needs a listen | recorded | Israeli clip; Sound Match asks for it, and Speed Match and Vowel Storm play it, only where the tradition says the consonant the Israeli way (95 of 110 for Sephardi and for Ashkenazi) |
| Taxi Turns | `p84a865c5` | לֵךְ יָשָׁר | go straight | held: needs a listen | recorded | Israeli clip for all three settings |
| Vowel Rain | `gimel+kamatz` | גָ | gimel with kamatz, says "a" | held: needs a listen | recorded | Israeli and Sephardi: plays gimel-a, the same sound. Ashkenazi says "o": own Ashkenazi clip needed |
| Vowel Rain | `zayin+kamatz` | זָ | zayin with kamatz, says "a" | held: needs a listen | held: needs a listen | Israeli and Sephardi: plays zayin-a, the same sound. Ashkenazi says "o": own Ashkenazi clip needed |
| Vowel Rain | `pe+kamatz` | פָּ | pe with kamatz, says "a" | recorded | held: needs a listen | Israeli and Sephardi: plays pe-a, the same sound. Ashkenazi says "o": own Ashkenazi clip needed |
| Vowel Rain | `dalet+tzere` | דֵ | dalet with tzere, says "e" | held: needs a listen | recorded | Israeli and Sephardi: plays dalet-e, the same sound; not played in Ashkenazi |
| Vowel Rain | `tet+tzere` | טֵ | tet with tzere, says "e" | recorded | held: needs a listen | Israeli and Sephardi: plays tet-e, the same sound; not played in Ashkenazi |
| Vowel Rain | `tav+tzere` | תֵ | tav with tzere, says "e" | recorded | held: needs a listen | Israeli and Sephardi: plays tav-e, the same sound; not played in Ashkenazi |
| Vowel Rain | `bet+shuruk` | בּוּ | bet with shuruk, says "u" | recorded | held: needs a listen | plays bet-u, the same sound, in all three settings |
| Vowel Rain | `dalet+shuruk` | דוּ | dalet with shuruk, says "u" | held: needs a listen | recorded | plays dalet-u, the same sound, in all three settings |
| Vowel Rain | `chet+shuruk` | חוּ | chet with shuruk, says "u" | recorded | held: needs a listen | plays chet-u, the same sound, in all three settings |
| Vowel Rain | `tet+shuruk` | טוּ | tet with shuruk, says "u" | held: needs a listen | recorded | plays tet-u, the same sound, in all three settings |
| Vowel Rain | `yod+shuruk` | יוּ | yod with shuruk, says "u" | held: needs a listen | recorded | plays yod-u, the same sound, in all three settings |
| Vowel Rain | `tsadi+shuruk` | צוּ | tsadi with shuruk, says "u" | held: needs a listen | held: needs a listen | plays tsadi-u, the same sound, in all three settings |
| Vowel Rain | `qof+shuruk` | קוּ | qof with shuruk, says "u" | held: needs a listen | recorded | plays qof-u, the same sound, in all three settings |
| Vowel Rain | `resh+shuruk` | רוּ | resh with shuruk, says "u" | held: needs a listen | recorded | plays resh-u, the same sound, in all three settings |
| Vowel Rain | `tav+shuruk` | תוּ | tav with shuruk, says "u" | held: needs a listen | recorded | plays tav-u, the same sound, in all three settings |

Letter Pattern words without a recording are listed only in the CSV: 0 beginner words (level A1 or A2, priority 1), 117 at priority 2.

## For the Ashkenazi and Sephardi Settings

28 items are said differently in a tradition (for example kamatz is "o" in Ashkenazi, and Chet and Ayin are their own sounds in Sephardi). Those settings do not play the Israeli clip for them; recording them in the Ashkenazi or Sephardi way would let them be heard there. They are the rows whose `traditions` column says "own clip needed".
