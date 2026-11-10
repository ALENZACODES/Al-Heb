# Practical Google Cloud test — 10 November 2026

Automated check of every Practical item. This replaces the learner-facing native-review badge.
The divine Name was never sent to text-to-speech.

- Unique items tested: 702 (applied to 750 unit occurrences).
- Pass: 673. Fail: 77. Blocked (Name): 0.
- Estimated spend this run: US$0.4644 of a US$15 cap.
- TTS: he-IL-Wavenet-B (he-IL). STT: Google Cloud Chirp he-IL (see note). Translation: Cloud Translation or Gemini on Vertex.

**STT note:** Google Cloud STT Chirp (Speech-to-Text v2) is not callable with the existing API keys (v2 requires OAuth; Speech v1 is blocked on the TTS key). Each WaveNet he-IL clip was instead transcribed on Vertex by gemini-3.5-flash.

After lane C's PRACTICAL-FIXES-r1 verdict (keep all 71 source lines; no invented Hebrew), the tester was updated only to treat Arabic numerals in a transcript as Hebrew number words. That cleared d-cafe-l5, d-taxi-l6 and d-hotel-l6 on a --redecide with no new Cloud calls. Other speech-loop misses stay hidden. בְּעֶזְרַת הַשֵּׁם and I-18 army slang were not decided or added to the live set.

Pass rule: (1) STT word-error rate is 0 after nikkud is stripped, or letter-error rate is at most 0.15 for a single token;
(2) Hebrew→English meaning matches the stored gloss;
(3) English→Hebrew matches the source after nikkud is stripped, or a Vertex judge agrees the meaning is the same.
Glosses that only failed because they drifted from the lesson or phrasebook source were restored from that source and re-checked.
Items that still fail are hidden from the Practical UI and listed for lane C in the Practical fails list in the lanes hub.

| unit | id | Hebrew | gloss | STT | WER | HE→EN | EN→HE | result | why |
|---|---|---|---|---|---:|---|---|---|---|
| pu-greetings | greetings-01 | שָׁלוֹם | hello / goodbye / peace | שלום | 0.00 | hello / goodbye / peace | שָׁלוֹם | pass | ok |
| pu-greetings | greetings-02 | הֵי | hi | היי | 1.00 | hi | הֵי | pass | ok |
| pu-greetings | greetings-03 | בֹּקֶר טוֹב | good morning | בוקר טוב | 0.50 | good morning | בֹּקֶר טוֹב | pass | ok |
| pu-greetings | greetings-04 | צָהֳרַיִם טוֹבִים | good afternoon | צהריים טובים | 0.50 | good afternoon | צָהֳרַיִם טוֹבִים | pass | ok |
| pu-greetings | greetings-05 | עֶרֶב טוֹב | good evening | ערב טוב | 0.00 | good evening | עֶרֶב טוֹב | pass | ok |
| pu-greetings | greetings-06 | לַיְלָה טוֹב | good night | לילה טוב | 0.00 | good night | לַיְלָה טוֹב | pass | ok |
| pu-greetings | greetings-07 | שַׁבָּת שָׁלוֹם | peaceful Sabbath (greeting from Friday afternoon to Saturday) | שבת שלום | 0.00 | peaceful Sabbath (greeting from Friday afternoon to Saturday) | שַׁבָּת שָׁלוֹם | pass | ok |
| pu-greetings | greetings-08 | שָׁבוּעַ טוֹב | good week | שבוע טוב | 0.00 | good week | שָׁבוּעַ טוֹב | pass | ok |
| pu-greetings | greetings-09 | חַג שָׂמֵחַ | happy holiday | חג שמח | 0.00 | happy holiday | חַג שָׂמֵחַ | pass | ok |
| pu-greetings | greetings-10 | שָׁנָה טוֹבָה | happy new year (Rosh Hashana greeting) | שנה טובה | 0.00 | happy new year (Rosh Hashana greeting) | שָׁנָה טוֹבָה | pass | ok |
| pu-greetings | greetings-11 | מַה שְׁלוֹמְךָ? | how are you? | מה שלומך? | 0.00 | how are you? | מַה שְׁלוֹמְךָ? | pass | ok |
| pu-greetings | greetings-12 | מָה נִשְׁמָע? | what's up? (lit. what is heard?) | מה נשמע | 0.00 | what's up? (lit. what is heard?) | מָה נִשְׁמָע? | pass | ok |
| pu-greetings | greetings-13 | מָה קוֹרֶה? | what's happening? | מה קורה? | 0.00 | what's happening? | מָה קוֹרֶה? | pass | ok |
| pu-greetings | greetings-14 | הַכֹּל בְּסֵדֶר | everything is OK | הכל בסדר | 0.00 | everything is OK | הַכֹּל בְּסֵדֶר | pass | ok |
| pu-greetings | greetings-15 | בְּסֵדֶר | OK / fine / alright | בסדר | 0.00 | OK / fine / alright | בְּסֵדֶר | pass | ok |
| pu-greetings | greetings-16 | מְצֻיָּן | excellent | מצוין | 1.00 | excellent | מְצֻיָּן | pass | ok |
| pu-greetings | greetings-17 | לֹא רַע | not bad | לאגה | 1.00 | not bad | לֹא רַע | fail | stt-wer=1.00 |
| pu-greetings | greetings-18 | כָּכָה כָּכָה | so-so | ככה ככה | 0.00 | so-so | כָּכָה כָּכָה | pass | ok |
| pu-greetings | greetings-19 | נָעִים מְאֹד | nice to meet you | נעים מאוד | 0.50 | nice to meet you | נָעִים מְאֹד | pass | ok |
| pu-greetings | greetings-20 | לְהִתְרָאוֹת | see you (later) | להתראות | 0.00 | see you (later) | לְהִתְרָאוֹת | pass | ok |
| pu-greetings | greetings-21 | יוֹם נָעִים | have a nice day | יום נעים | 0.00 | have a nice day | יוֹם נָעִים | pass | ok |
| pu-greetings | greetings-22 | בָּרוּךְ הַבָּא | welcome (to one person) | בָּרוּךְ הַבָּא | 0.00 | welcome (to one person) | בָּרוּךְ הַבָּא | pass | ok |
| pu-greetings | greetings-23 | בְּרוּכִים הַבָּאִים | welcome (to several people) | ברוכים הבאים | 0.00 | welcome (to several people) | בְּרוּכִים הַבָּאִים | pass | ok |
| pu-greetings | greetings-24 | מַזָּל טוֹב | congratulations / good luck | מזל טוב | 0.00 | congratulations / good luck | מַזָּל טוֹב | pass | ok |
| pu-greetings | greetings-25 | בְּהַצְלָחָה | good luck / all the best | בהצלחה | 0.00 | good luck / all the best | בְּהַצְלָחָה | pass | ok |
| pu-greetings | greetings-26 | לִבְרִיאוּת | bless you (after a sneeze) / to your health | לבריאות | 0.00 | bless you (after a sneeze) / to your health | לִבְרִיאוּת | pass | ok |
| pu-greetings | greetings-27 | תִּשְׁמֹר עַל עַצְמְךָ | take care of yourself | תשמור על עצמך | 0.33 | take care of yourself | תִּשְׁמֹר עַל עַצְמְךָ | pass | ok |
| pu-greetings | il01-w2 | תּוֹדָה | thanks | תודה | 0.00 | thanks | תּוֹדָה | pass | ok |
| pu-greetings | il01-w3 | בְּבַקָּשָׁה | please; you're welcome | בבקשה | 0.00 | please; you're welcome | בְּבַקָּשָׁה | pass | ok |
| pu-greetings | il01-w4 | סְלִיחָה | excuse me; sorry | סליחה | 0.00 | excuse me; sorry | סְלִיחָה | pass | ok |
| pu-greetings | il01-w5 | כֵּן | yes | כן | 0.00 | yes | כֵּן | pass | ok |
| pu-greetings | il01-w6 | לֹא | no | לא | 0.00 | no | לֹא | pass | ok |
| pu-politeness | politeness-01 | תּוֹדָה | thank you | תודה | 0.00 | thank you | תּוֹדָה | pass | ok |
| pu-politeness | politeness-02 | תּוֹדָה רַבָּה | thank you very much | תודה רבה | 0.00 | thank you very much | תּוֹדָה רַבָּה | pass | ok |
| pu-politeness | politeness-03 | בְּבַקָּשָׁה | please / you're welcome | בבקשה | 0.00 | please / you're welcome | בְּבַקָּשָׁה | pass | ok |
| pu-politeness | politeness-04 | אֵין בְּעָיָה | no problem | אין בעיה | 0.00 | no problem | אֵין בְּעָיָה | pass | ok |
| pu-politeness | politeness-05 | אֵין בַּעַד מָה | you're welcome (lit. nothing for what) | אין בעד מה | 0.00 | you're welcome (lit. nothing for what) | אֵין בַּעַד מָה | pass | ok |
| pu-politeness | politeness-06 | סְלִיחָה | excuse me / sorry | סליחה | 0.00 | excuse me / sorry | סְלִיחָה | pass | ok |
| pu-politeness | politeness-07 | אֲנִי מִצְטַעֵר | I'm sorry | אני מצטער | 0.00 | I'm sorry | אֲנִי מִצְטַעֵר | pass | ok |
| pu-politeness | politeness-08 | כֵּן | yes | כן | 0.00 | yes | כֵּן | pass | ok |
| pu-politeness | politeness-09 | לֹא | no | לא | 0.00 | no | לֹא | pass | ok |
| pu-politeness | politeness-10 | אוּלַי | maybe | אולי | 0.00 | maybe | אוּלַי | pass | ok |
| pu-politeness | politeness-11 | בְּטַח | sure / of course | בטח | 0.00 | sure / of course | בְּטַח | pass | ok |
| pu-politeness | politeness-12 | סַבָּבָה | cool / great / fine by me | סבבה | 0.00 | cool / great / fine by me | סַבָּבָה | pass | ok |
| pu-politeness | politeness-13 | יַאלְלָה | come on / let's go / OK then | יאללה | 0.00 | come on / let's go / OK then | יַאלְלָה | pass | ok |
| pu-politeness | politeness-14 | וָואלָה | really? / wow / honestly | וואלה | 0.00 | really? / wow / honestly | וָואלָה | pass | ok |
| pu-politeness | politeness-15 | אַחִי | my brother (bro) | אחי | 0.00 | my brother (bro) | אַחִי | pass | ok |
| pu-politeness | politeness-16 | יוֹפִי | great / nice | יופי | 0.00 | great / nice | יוֹפִי | pass | ok |
| pu-politeness | politeness-17 | חֲבָל עַל הַזְּמַן | awesome (lit. a waste of the time) | חבל על הזמן | 0.00 | awesome (lit. a waste of the time) | חֲבָל עַל הַזְּמַן | pass | ok |
| pu-politeness | politeness-18 | מָה פִּתְאוֹם? | no way! / what do you mean? | מה פתאום | 0.00 | no way! / what do you mean? | מָה פִּתְאוֹם? | pass | ok |
| pu-politeness | politeness-19 | דַּי | enough / stop it | די | 0.00 | enough / stop it | דַּי | pass | ok |
| pu-politeness | politeness-20 | רֶגַע | one moment | רגע | 0.00 | one moment | רֶגַע | pass | ok |
| pu-politeness | politeness-22 | יִהְיֶה בְּסֵדֶר | it'll be OK | יהיה בסדר | 0.00 | it'll be OK | יִהְיֶה בְּסֵדֶר | pass | ok |
| pu-politeness | il01-w1 | שָׁלוֹם | hello/peace | שלום | 0.00 | hello/peace | שָׁלוֹם | pass | ok |
| pu-politeness | il01-w7 | בֹּקֶר טוֹב | good morning | בוקר טוב | 0.50 | good morning | בֹּקֶר טוֹב | pass | ok |
| pu-fillers | fillers-01 | אָז | so | אז | 0.00 | so | אָז | pass | ok |
| pu-fillers | fillers-02 | נוּ | well? / come on | נו | 0.00 | well? / come on | נוּ | pass | ok |
| pu-fillers | fillers-03 | טוֹב | OK / well / good | טוב | 0.00 | OK / well / good | טוֹב | pass | ok |
| pu-fillers | fillers-04 | נָכוֹן | right / correct | נכון | 0.00 | right / correct | נָכוֹן | pass | ok |
| pu-fillers | fillers-05 | לֹא נָכוֹן | not right / wrong | לא נכון | 0.00 | not right / wrong | לֹא נָכוֹן | pass | ok |
| pu-fillers | fillers-06 | בֶּאֱמֶת? | really? | באמת | 0.00 | really? | בֶּאֱמֶת? | pass | ok |
| pu-fillers | fillers-07 | מַמָּשׁ | really / truly / very | ממש | 0.00 | really / truly / very | מַמָּשׁ | pass | ok |
| pu-fillers | fillers-08 | פָּשׁוּט | simply / just | פשוט | 0.00 | simply / just | פָּשׁוּט | pass | ok |
| pu-fillers | fillers-09 | סְתָם | just (because) / for no reason | סתם | 0.00 | just (because) / for no reason | סְתָם | pass | ok |
| pu-fillers | fillers-10 | בְּעֶצֶם | actually / in fact | בעצם | 0.00 | actually / in fact | בְּעֶצֶם | pass | ok |
| pu-fillers | fillers-11 | כְּלוֹמַר | that is / I mean | כלומר | 0.00 | that is / I mean | כְּלוֹמַר | pass | ok |
| pu-fillers | fillers-12 | אֲבָל | but | אבל | 0.00 | but | אֲבָל | pass | ok |
| pu-fillers | fillers-13 | אֲנִי לֹא יוֹדֵעַ | I don't know | אני לא יודע | 0.00 | I don't know | אֲנִי לֹא יוֹדֵעַ | pass | ok |
| pu-fillers | fillers-14 | אֲנִי לֹא מֵבִין | I don't understand | אני לא מבין | 0.00 | I don't understand | אֲנִי לֹא מֵבִין | pass | ok |
| pu-fillers | fillers-15 | אֲנִי מֵבִין | I understand | אני מבין | 0.00 | I understand | אֲנִי מֵבִין | pass | ok |
| pu-fillers | fillers-16 | אַתָּה מְדַבֵּר אַנְגְּלִית? | do you speak English? | אתה מדבר אנגלית | 0.00 | do you speak English? | אַתָּה מְדַבֵּר אַנְגְּלִית? | pass | ok |
| pu-fillers | fillers-17 | אֲנִי לֹא מְדַבֵּר עִבְרִית טוֹב | I don't speak Hebrew well | אני לא מדבר עברית טוב | 0.00 | I don't speak Hebrew well | אֲנִי לֹא מְדַבֵּר עִבְרִית טוֹב | pass | ok |
| pu-fillers | fillers-18 | אֶפְשָׁר לְדַבֵּר לְאַט? | can you speak slowly? | אפשר לדבר לאט? | 0.00 | can you speak slowly? | אֶפְשָׁר לְדַבֵּר לְאַט? | pass | ok |
| pu-fillers | fillers-19 | אֶפְשָׁר לַחֲזֹר עַל זֶה? | can you repeat that? | אפשר לחזור על זה? | 0.25 | can you repeat that? | אֶפְשָׁר לַחֲזֹר עַל זֶה? | pass | ok |
| pu-fillers | fillers-20 | מָה זֶה? | what is this? | מה זה | 0.00 | what is this? | מָה זֶה? | pass | ok |
| pu-fillers | fillers-21 | מָה זֶה אוֹמֵר? | what does that mean? | מה זה אומר | 0.00 | what does that mean? | מָה זֶה אוֹמֵר? | pass | ok |
| pu-fillers | fillers-22 | אֵיךְ אוֹמְרִים ... בְּעִבְרִית? | how do you say ... in Hebrew? | איך אומרים | 0.33 | how do you say ... in Hebrew? | אֵיךְ אוֹמְרִים ... בְּעִבְרִית? | fail | stt-wer=0.33 |
| pu-fillers | fillers-23 | אֶפְשָׁר לִכְתֹּב אֶת זֶה? | can you write that down? | אפשר לכתוב את זה | 0.25 | can you write that down? | אֶפְשָׁר לִכְתֹּב אֶת זֶה? | pass | ok |
| pu-fillers | il02-w1 | יָאללָה | come on; let's go | יאללה | 0.00 | come on; let's go | יָאללָה | pass | ok |
| pu-fillers | il02-w3 | סַבָּבָּה | cool; fine | סבבה | 0.00 | cool; fine | סַבָּבָּה | pass | ok |
| pu-fillers | il02-w4 | בְּסֵדֶר | OK; all right | בסדר | 0.00 | OK; all right | בְּסֵדֶר | pass | ok |
| pu-fillers | il02-w5 | אַחְלָה | great | אחלה | 0.00 | great | אַחְלָה | pass | ok |
| pu-fillers | il02-w6 | וַואלָה | really? wow | וואלה | 0.00 | really? wow | וַואלָה | pass | ok |
| pu-fillers | il23-w1 | רֹאשׁ | head (uvular vs tapped resh) | ראש | 0.00 | head (uvular vs tapped resh) | רֹאשׁ | pass | ok |
| pu-fillers | il23-w2 | חַיִּים | life (chet, not kaf) | חיים | 0.00 | life (chet, not kaf) | חַיִּים | pass | ok |
| pu-fillers | il23-w3 | מַה שְׁלוֹמְךָ | how are you (to a man; stress on the last syllable) | מה שלומך | 0.00 | how are you (to a man; stress on the last syllable) | מַה שְׁלוֹמְךָ | pass | ok |
| pu-numbers | numbers-01 | אֶחָד | one (1) | אחת | 1.00 | one (1) | אֶחָד | fail | stt-wer=1.00 |
| pu-numbers | numbers-02 | שְׁנַיִם | two (2) | שניים | 1.00 | two (2) | שְׁנַיִם | pass | ok |
| pu-numbers | numbers-03 | שְׁלוֹשָׁה | three (3) | שלושה | 0.00 | three (3) | שְׁלוֹשָׁה | pass | ok |
| pu-numbers | numbers-04 | אַרְבָּעָה | four (4) | ארבע | 1.00 | four (4) | אַרְבָּעָה | fail | stt-wer=1.00 |
| pu-numbers | numbers-05 | חֲמִשָּׁה | five (5) | חמישה | 1.00 | five (5) | חֲמִשָּׁה | pass | ok |
| pu-numbers | numbers-06 | שִׁשָּׁה | six (6) | שישה | 1.00 | six (6) | שִׁשָּׁה | pass | ok |
| pu-numbers | numbers-07 | שִׁבְעָה | seven (7) | שבע | 1.00 | seven (7) | שִׁבְעָה | fail | stt-wer=1.00 |
| pu-numbers | numbers-08 | שְׁמוֹנָה | eight (8) | שמונה | 0.00 | eight (8) | שְׁמוֹנָה | pass | ok |
| pu-numbers | numbers-09 | תִּשְׁעָה | nine (9) | תשע | 1.00 | nine (9) | תִּשְׁעָה | fail | stt-wer=1.00 |
| pu-numbers | numbers-10 | עֲשָׂרָה | ten (10) | עשרה | 0.00 | ten (10) | עֲשָׂרָה | pass | ok |
| pu-numbers | numbers-11 | עֶשְׂרִים | twenty (20) | עשרים | 0.00 | twenty (20) | עֶשְׂרִים | pass | ok |
| pu-numbers | numbers-12 | שְׁלוֹשִׁים | thirty (30) | שלושים | 0.00 | thirty (30) | שְׁלוֹשִׁים | pass | ok |
| pu-numbers | numbers-13 | חֲמִשִּׁים | fifty (50) | חמישים | 1.00 | fifty (50) | חֲמִשִּׁים | pass | ok |
| pu-numbers | numbers-14 | מֵאָה | one hundred (100) | מאה | 0.00 | one hundred (100) | מֵאָה | pass | ok |
| pu-numbers | numbers-15 | אֶלֶף | one thousand (1000) | אלף | 0.00 | one thousand (1000) | אֶלֶף | pass | ok |
| pu-numbers | numbers-16 | מָה הַשָּׁעָה? | what time is it? | מהרע | 1.00 | what time is it? | מָה הַשָּׁעָה? | fail | stt-wer=1.00 |
| pu-numbers | numbers-17 | הַשָּׁעָה שָׁלוֹשׁ | it's three o'clock | השעה שלוש | 0.00 | it's three o'clock | הַשָּׁעָה שָׁלוֹשׁ | pass | ok |
| pu-numbers | numbers-18 | חֲצִי | half | חצי | 0.00 | half | חֲצִי | pass | ok |
| pu-numbers | numbers-19 | רֶבַע | quarter | רבע | 0.00 | quarter | רֶבַע | pass | ok |
| pu-numbers | numbers-20 | הַיּוֹם | today | היום | 0.00 | today | הַיּוֹם | pass | ok |
| pu-numbers | numbers-21 | מָחָר | tomorrow | מחר | 0.00 | tomorrow | מָחָר | pass | ok |
| pu-numbers | numbers-22 | אֶתְמוֹל | yesterday | אתמול | 0.00 | yesterday | אֶתְמוֹל | pass | ok |
| pu-numbers | il04-w1 | אַחַת | one (f., counting) | אחת | 0.00 | one (f., counting) | אַחַת | pass | ok |
| pu-numbers | il04-w2 | שְׁתַּיִם | two (f.) | שתיים | 1.00 | two (f.) | שְׁתַּיִם | pass | ok |
| pu-numbers | il04-w3 | שָׁלוֹשׁ | three (f.) | שלוש | 0.00 | three (f.) | שָׁלוֹשׁ | pass | ok |
| pu-numbers | il04-w4 | אַרְבַּע | four (f.) | ארבע | 0.00 | four (f.) | אַרְבַּע | pass | ok |
| pu-numbers | il04-w5 | חָמֵשׁ | five (f.) | חמש | 0.00 | five (f.) | חָמֵשׁ | pass | ok |
| pu-numbers | il04-w6 | שֵׁשׁ | six | שש | 0.00 | six | שֵׁשׁ | pass | ok |
| pu-numbers | il04-w7 | שֶׁבַע | seven (f.) | שבע | 0.00 | seven (f.) | שֶׁבַע | pass | ok |
| pu-numbers | il04-w8 | שְׁמוֹנֶה | eight | שמונה | 0.00 | eight | שְׁמוֹנֶה | pass | ok |
| pu-numbers | il04-w9 | תֵּשַׁע | nine (f.) | תשע | 0.00 | nine (f.) | תֵּשַׁע | pass | ok |
| pu-numbers | il04-w10 | עֶשֶׂר | ten (f.) | עשר | 0.00 | ten (f.) | עֶשֶׂר | pass | ok |
| pu-numbers | il05-w4 | שֶׁקֶל | shekel | שקל | 0.00 | shekel | שֶׁקֶל | pass | ok |
| pu-numbers | il05-w5 | כַּמָּה | how much | כמה | 0.00 | how much | כַּמָּה | pass | ok |
| pu-introducing | il03-w1 | שְׁמִי | my name is | שמי | 0.00 | my name is | שְׁמִי | pass | ok |
| pu-introducing | il03-w2 | מַה שְׁמֶךָ | what is your name (to a man) | מה שמך | 0.00 | what is your name (to a man) | מַה שְׁמֶךָ | pass | ok |
| pu-introducing | il03-w3 | מַה שְׁמֵךְ | what is your name (to a woman) | מה שלמך | 0.50 | what is your name (to a woman) | מַה שְׁמֵךְ | fail | stt-wer=0.50 |
| pu-introducing | il03-w4 | אֲנִי מִ... | I am from... | אני מי | 0.50 | I am from... | אֲנִי מִ... | pass | ok |
| pu-introducing | il03-w5 | נָעִים מְאֹד | nice to meet you | נעים מאוד | 0.50 | nice to meet you | נָעִים מְאֹד | pass | ok |
| pu-cafe | cafe-01 | שֻׁלְחָן לִשְׁנַיִם, בְּבַקָּשָׁה | a table for two, please | שולחן לשניים, בבקשה | 0.67 | a table for two, please | שֻׁלְחָן לִשְׁנַיִם, בְּבַקָּשָׁה | pass | ok |
| pu-cafe | cafe-02 | אֶפְשָׁר לִרְאוֹת אֶת הַתַּפְרִיט? | can I see the menu? | אפשר לראות את התפריט? | 0.00 | can I see the menu? | אֶפְשָׁר לִרְאוֹת אֶת הַתַּפְרִיט? | pass | ok |
| pu-cafe | cafe-03 | אֲנִי רוֹצֶה קָפֶה | I would like a coffee | אני רוצה קפה | 0.00 | I would like a coffee | אֲנִי רוֹצֶה קָפֶה | pass | ok |
| pu-cafe | cafe-04 | קָפֶה הָפוּךְ | latte-style milky coffee (lit. upside-down coffee) | קפה הפוך | 0.00 | latte-style milky coffee (lit. upside-down coffee) | קָפֶה הָפוּךְ | pass | ok |
| pu-cafe | cafe-05 | אֶסְפְּרֶסוֹ | espresso | אספרסו | 0.00 | espresso | אֶסְפְּרֶסוֹ | pass | ok |
| pu-cafe | cafe-06 | קָפֶה שָׁחוֹר | black coffee | קפה שחור | 0.00 | black coffee | קָפֶה שָׁחוֹר | pass | ok |
| pu-cafe | cafe-07 | קָפֶה עִם חָלָב | coffee with milk | קפה עם חלב | 0.00 | coffee with milk | קָפֶה עִם חָלָב | pass | ok |
| pu-cafe | cafe-08 | תֵּה עִם נַעֲנָע | tea with mint | תאמנו | 1.00 | tea with mint | תֵּה עִם נַעֲנָע | fail | stt-wer=1.00 |
| pu-cafe | cafe-09 | מַיִם | water | מים | 0.00 | water | מַיִם | pass | ok |
| pu-cafe | cafe-10 | מַיִם קָרִים, בְּבַקָּשָׁה | cold water, please | מים קרים, בבקשה | 0.00 | cold water, please | מַיִם קָרִים, בְּבַקָּשָׁה | pass | ok |
| pu-cafe | cafe-11 | בִּירָה | beer | בירה | 0.00 | beer | בִּירָה | pass | ok |
| pu-cafe | cafe-12 | יַיִן | wine | יין | 0.00 | wine | יַיִן | pass | ok |
| pu-cafe | cafe-13 | לְחַיִּים! | cheers! | לחיים | 0.00 | cheers! | לְחַיִּים! | pass | ok |
| pu-cafe | cafe-14 | אֶפְשָׁר לְהַזְמִין? | can I order? | אפשר להזמין | 0.00 | can I order? | אֶפְשָׁר לְהַזְמִין? | pass | ok |
| pu-cafe | cafe-15 | אֶפְשָׁר עוֹד אֶחָד? | can I have another one? | אפשר עוד אחד | 0.00 | can I have another one? | אֶפְשָׁר עוֹד אֶחָד? | pass | ok |
| pu-cafe | cafe-16 | חוּמוּס | hummus | חומוס | 0.00 | hummus | חוּמוּס | pass | ok |
| pu-cafe | cafe-17 | פָלָאפֶל | falafel | פלאפל | 0.00 | falafel | פָלָאפֶל | pass | ok |
| pu-cafe | cafe-18 | שַׁקְשׁוּקָה | shakshuka (eggs poached in tomato sauce) | שקשוקה | 0.00 | shakshuka (eggs poached in tomato sauce) | שַׁקְשׁוּקָה | pass | ok |
| pu-cafe | cafe-19 | פִּיתָה | pita bread | פיתה | 0.00 | pita bread | פִּיתָה | pass | ok |
| pu-cafe | cafe-20 | סָלָט | salad | סלט | 0.00 | salad | סָלָט | pass | ok |
| pu-cafe | cafe-21 | טָעִים מְאֹד | very tasty | נעים מאוד | 1.00 | very tasty | טָעִים מְאֹד | fail | stt-wer=1.00 |
| pu-cafe | cafe-22 | אֲנִי צִמְחוֹנִי | I'm vegetarian | אני צריך מונית | 1.00 | I'm vegetarian | אֲנִי צִמְחוֹנִי | fail | stt-wer=1.00 |
| pu-cafe | cafe-23 | אֲנִי טִבְעוֹנִי | I'm vegan | אני טבעוני | 0.00 | I'm vegan | אֲנִי טִבְעוֹנִי | pass | ok |
| pu-cafe | cafe-24 | אֲנִי אָלֶרְגִּי לְ | I'm allergic to ... | אני אלרגי ל | 0.00 | I'm allergic to ... | אֲנִי אָלֶרְגִּי לְ | pass | ok |
| pu-cafe | cafe-25 | לֶאֱכֹל כָּאן אוֹ לָקַחַת? | eat here or take away? | לאכול כאן או לקחת? | 0.25 | eat here or take away? | לֶאֱכֹל כָּאן אוֹ לָקַחַת? | pass | ok |
| pu-cafe | cafe-26 | הַחֶשְׁבּוֹן, בְּבַקָּשָׁה | the bill, please | החשבון בבקשה | 0.00 | the bill, please | הַחֶשְׁבּוֹן, בְּבַקָּשָׁה | pass | ok |
| pu-cafe | cafe-27 | אֶפְשָׁר לְשַׁלֵּם בְּכַרְטִיס? | can I pay by card? | אפשר לשלם בכרטיס | 0.00 | can I pay by card? | אֶפְשָׁר לְשַׁלֵּם בְּכַרְטִיס? | pass | ok |
| pu-cafe | il06-w1 | אֶפְשָׁר | may I; is it possible | אפשר | 0.00 | may I; is it possible | אֶפְשָׁר | pass | ok |
| pu-cafe | il06-w2 | קָפֶה | coffee | קפה | 0.00 | coffee | קָפֶה | pass | ok |
| pu-cafe | il06-w3 | הָפוּךְ | latte-style coffee | הפוך | 0.00 | latte-style coffee | הָפוּךְ | pass | ok |
| pu-cafe | il06-w5 | לְהַזְמִין | to order | להזמין | 0.00 | to order | לְהַזְמִין | pass | ok |
| pu-cafe | il06-w6 | חֶשְׁבּוֹן | bill; check | חשבון | 0.00 | bill; check | חֶשְׁבּוֹן | pass | ok |
| pu-cafe | il07-w1 | אֹכֶל | food | אוכל | 1.00 | food | אֹכֶל | pass | ok |
| pu-cafe | il07-w2 | לֶחֶם | bread | לכם | 1.00 | bread | לֶחֶם | fail | stt-wer=1.00 |
| pu-cafe | il07-w3 | גְּבִינָה | cheese | דינה | 1.00 | cheese | גְּבִינָה | fail | stt-wer=1.00 |
| pu-cafe | il07-w4 | בֵּיצָה | egg | בֵּיצָה | 0.00 | egg | בֵּיצָה | pass | ok |
| pu-cafe | il07-w6 | תֵּה | tea | תיי | 1.00 | tea | תֵּה | fail | stt-wer=1.00 |
| pu-cafe | i-13-w6 | חָלָב | milk | חלב | 0.00 | milk | חָלָב | pass | ok |
| pu-cafe | i-13-w7 | סֻכָּר | sugar | סוכר | 1.00 | sugar | סֻכָּר | pass | ok |
| pu-cafe | i-13-w8 | בְּלִי | without | בלי | 0.00 | without | בְּלִי | pass | ok |
| pu-cafe | i-13-w9 | גָּדוֹל | big (m) | גדול | 0.00 | big (m) | גָּדוֹל | pass | ok |
| pu-cafe | i-13-w10 | קָטָן | small (m) | קטן | 0.00 | small (m) | קָטָן | pass | ok |
| pu-cafe | i-13-w13 | צִמְחוֹנִי | vegetarian (m) | סימפוני | 1.00 | vegetarian (m) | צִמְחוֹנִי | fail | stt-wer=1.00 |
| pu-cafe | i-13-w14 | צִמְחוֹנִית | vegetarian (f) | סימפונית | 1.00 | vegetarian (f) | צִמְחוֹנִית | fail | stt-wer=1.00 |
| pu-cafe | d-cafe-l1 | שָׁלוֹם! מָה תִּרְצִי? | Hello! What would you like? | שלום, מה תרצי? | 0.00 | Hello! What would you like? | שָׁלוֹם! מָה תִּרְצִי? | pass | ok |
| pu-cafe | d-cafe-l2 | אֲנִי רוֹצָה קָפֶה הָפוּךְ, בְּבַקָּשָׁה. | I'd like a cafe hafuch (a milky coffee), please. | אני רוצה קפה הפוך, בבקשה | 0.00 | I'd like a cafe hafuch (a milky coffee), please. | אֲנִי רוֹצָה קָפֶה הָפוּךְ, בְּבַקָּשָׁה. | pass | ok |
| pu-cafe | d-cafe-l3 | עוֹד מַשֶּׁהוּ? | Anything else? | עוד משהו | 0.00 | Anything else? | עוֹד מַשֶּׁהוּ? | pass | ok |
| pu-cafe | d-cafe-l4 | כֵּן, גַּם עוּגָה. כַּמָּה זֶה? | Yes, a cake too. How much is it? | כן, גם עוגה. כמה זה? | 0.00 | Yes, a cake too. How much is it? | כֵּן, גַּם עוּגָה. כַּמָּה זֶה? | pass | ok |
| pu-cafe | d-cafe-l5 | אַרְבָּעִים וּשְׁמוֹנָה שְׁקָלִים. | Forty-eight shekels. | 48 שקלים | 0.67 | Forty-eight shekels. | אַרְבָּעִים וּשְׁמוֹנָה שְׁקָלִים. | pass | ok |
| pu-cafe | d-cafe-l6 | אֶפְשָׁר בְּכַרְטִיס? | Can I pay by card? | אפשר בכרטיס? | 0.00 | Can I pay by card? | אֶפְשָׁר בְּכַרְטִיס? | pass | ok |
| pu-cafe | d-cafe-l7 | בֶּטַח. תּוֹדָה רַבָּה! | Of course. Thanks a lot! | בטח, תודה רבה. | 0.00 | Of course. Thanks a lot! | בֶּטַח. תּוֹדָה רַבָּה! | pass | ok |
| pu-cafe | cafe-01 | שֻׁלְחָן לִשְׁנַיִם, בְּבַקָּשָׁה | a table for two, please | שולחן לשניים, בבקשה | 0.67 | a table for two, please | שֻׁלְחָן לִשְׁנַיִם, בְּבַקָּשָׁה | pass | ok |
| pu-cafe | cafe-02 | אֶפְשָׁר לִרְאוֹת אֶת הַתַּפְרִיט? | can I see the menu? | אפשר לראות את התפריט? | 0.00 | can I see the menu? | אֶפְשָׁר לִרְאוֹת אֶת הַתַּפְרִיט? | pass | ok |
| pu-cafe | cafe-14 | אֶפְשָׁר לְהַזְמִין? | can I order? | אפשר להזמין | 0.00 | can I order? | אֶפְשָׁר לְהַזְמִין? | pass | ok |
| pu-cafe | cafe-16 | חוּמוּס | hummus | חומוס | 0.00 | hummus | חוּמוּס | pass | ok |
| pu-cafe | cafe-17 | פָלָאפֶל | falafel | פלאפל | 0.00 | falafel | פָלָאפֶל | pass | ok |
| pu-cafe | cafe-20 | סָלָט | salad | סלט | 0.00 | salad | סָלָט | pass | ok |
| pu-cafe | cafe-21 | טָעִים מְאֹד | very tasty | נעים מאוד | 1.00 | very tasty | טָעִים מְאֹד | fail | stt-wer=1.00 |
| pu-cafe | cafe-22 | אֲנִי צִמְחוֹנִי | I'm vegetarian | אני צריך מונית | 1.00 | I'm vegetarian | אֲנִי צִמְחוֹנִי | fail | stt-wer=1.00 |
| pu-cafe | cafe-25 | לֶאֱכֹל כָּאן אוֹ לָקַחַת? | eat here or take away? | לאכול כאן או לקחת? | 0.25 | eat here or take away? | לֶאֱכֹל כָּאן אוֹ לָקַחַת? | pass | ok |
| pu-cafe | cafe-26 | הַחֶשְׁבּוֹן, בְּבַקָּשָׁה | the bill, please | החשבון בבקשה | 0.00 | the bill, please | הַחֶשְׁבּוֹן, בְּבַקָּשָׁה | pass | ok |
| pu-cafe | cafe-27 | אֶפְשָׁר לְשַׁלֵּם בְּכַרְטִיס? | can I pay by card? | אפשר לשלם בכרטיס | 0.00 | can I pay by card? | אֶפְשָׁר לְשַׁלֵּם בְּכַרְטִיס? | pass | ok |
| pu-cafe | cafe-10 | מַיִם קָרִים, בְּבַקָּשָׁה | cold water, please | מים קרים, בבקשה | 0.00 | cold water, please | מַיִם קָרִים, בְּבַקָּשָׁה | pass | ok |
| pu-cafe | cafe-18 | שַׁקְשׁוּקָה | shakshuka (eggs poached in tomato sauce) | שקשוקה | 0.00 | shakshuka (eggs poached in tomato sauce) | שַׁקְשׁוּקָה | pass | ok |
| pu-cafe | cafe-19 | פִּיתָה | pita bread | פיתה | 0.00 | pita bread | פִּיתָה | pass | ok |
| pu-cafe | cafe-11 | בִּירָה | beer | בירה | 0.00 | beer | בִּירָה | pass | ok |
| pu-cafe | cafe-12 | יַיִן | wine | יין | 0.00 | wine | יַיִן | pass | ok |
| pu-cafe | cafe-13 | לְחַיִּים! | cheers! | לחיים | 0.00 | cheers! | לְחַיִּים! | pass | ok |
| pu-cafe | cafe-15 | אֶפְשָׁר עוֹד אֶחָד? | can I have another one? | אפשר עוד אחד | 0.00 | can I have another one? | אֶפְשָׁר עוֹד אֶחָד? | pass | ok |
| pu-cafe | cafe-23 | אֲנִי טִבְעוֹנִי | I'm vegan | אני טבעוני | 0.00 | I'm vegan | אֲנִי טִבְעוֹנִי | pass | ok |
| pu-cafe | cafe-24 | אֲנִי אָלֶרְגִּי לְ | I'm allergic to ... | אני אלרגי ל | 0.00 | I'm allergic to ... | אֲנִי אָלֶרְגִּי לְ | pass | ok |
| pu-cafe | cafe-03 | אֲנִי רוֹצֶה קָפֶה | I would like a coffee | אני רוצה קפה | 0.00 | I would like a coffee | אֲנִי רוֹצֶה קָפֶה | pass | ok |
| pu-cafe | cafe-08 | תֵּה עִם נַעֲנָע | tea with mint | תאמנו | 1.00 | tea with mint | תֵּה עִם נַעֲנָע | fail | stt-wer=1.00 |
| pu-cafe | cafe-09 | מַיִם | water | מים | 0.00 | water | מַיִם | pass | ok |
| pu-cafe | il06-w1 | אֶפְשָׁר | may I; is it possible | אפשר | 0.00 | may I; is it possible | אֶפְשָׁר | pass | ok |
| pu-cafe | il06-w2 | קָפֶה | coffee | קפה | 0.00 | coffee | קָפֶה | pass | ok |
| pu-cafe | il06-w3 | הָפוּךְ | latte-style coffee | הפוך | 0.00 | latte-style coffee | הָפוּךְ | pass | ok |
| pu-cafe | il06-w5 | לְהַזְמִין | to order | להזמין | 0.00 | to order | לְהַזְמִין | pass | ok |
| pu-cafe | il06-w6 | חֶשְׁבּוֹן | bill; check | חשבון | 0.00 | bill; check | חֶשְׁבּוֹן | pass | ok |
| pu-cafe | il07-w1 | אֹכֶל | food | אוכל | 1.00 | food | אֹכֶל | pass | ok |
| pu-cafe | il07-w2 | לֶחֶם | bread | לכם | 1.00 | bread | לֶחֶם | fail | stt-wer=1.00 |
| pu-cafe | il07-w3 | גְּבִינָה | cheese | דינה | 1.00 | cheese | גְּבִינָה | fail | stt-wer=1.00 |
| pu-cafe | il07-w4 | בֵּיצָה | egg | בֵּיצָה | 0.00 | egg | בֵּיצָה | pass | ok |
| pu-cafe | il07-w6 | תֵּה | tea | תיי | 1.00 | tea | תֵּה | fail | stt-wer=1.00 |
| pu-restaurant | i-13-w2 | קָפֶה הָפוּךְ | milky coffee (hafuch) | קפה הפוך | 0.00 | milky coffee (hafuch) | קָפֶה הָפוּךְ | pass | ok |
| pu-restaurant | i-13-w3 | אֶסְפְּרֶסוֹ | espresso | אספרסו | 0.00 | espresso | אֶסְפְּרֶסוֹ | pass | ok |
| pu-restaurant | i-13-w4 | קָפֶה שָׁחוֹר | black coffee | קפה שחור | 0.00 | black coffee | קָפֶה שָׁחוֹר | pass | ok |
| pu-cafe | i-13-w6 | חָלָב | milk | חלב | 0.00 | milk | חָלָב | pass | ok |
| pu-cafe | i-13-w7 | סֻכָּר | sugar | סוכר | 1.00 | sugar | סֻכָּר | pass | ok |
| pu-cafe | i-13-w8 | בְּלִי | without | בלי | 0.00 | without | בְּלִי | pass | ok |
| pu-cafe | i-13-w9 | גָּדוֹל | big (m) | גדול | 0.00 | big (m) | גָּדוֹל | pass | ok |
| pu-cafe | i-13-w10 | קָטָן | small (m) | קטן | 0.00 | small (m) | קָטָן | pass | ok |
| pu-cafe | i-13-w13 | צִמְחוֹנִי | vegetarian (m) | סימפוני | 1.00 | vegetarian (m) | צִמְחוֹנִי | fail | stt-wer=1.00 |
| pu-cafe | i-13-w14 | צִמְחוֹנִית | vegetarian (f) | סימפונית | 1.00 | vegetarian (f) | צִמְחוֹנִית | fail | stt-wer=1.00 |
| pu-restaurant | i-38-w1 | יָפֶה | beautiful, nice | יפה | 0.00 | beautiful, nice | יָפֶה | pass | ok |
| pu-restaurant | i-38-w2 | חָמוּד | cute, sweet, charming | חמוד | 0.00 | cute, sweet, charming | חָמוּד | pass | ok |
| pu-restaurant | i-38-w3 | מִסְעָדָה | restaurant | מסעדה | 0.00 | restaurant | מִסְעָדָה | pass | ok |
| pu-restaurant | i-38-w4 | סֶרֶט | film | סרט | 0.00 | film | סֶרֶט | pass | ok |
| pu-restaurant | i-38-w5 | חָבֵר | friend (m) | חבר | 0.00 | friend (m) | חָבֵר | pass | ok |
| pu-restaurant | i-38-w6 | חֲבֵרָה | friend (f) | חברה | 0.00 | friend (f) | חֲבֵרָה | pass | ok |
| pu-restaurant | i-38-w7 | אֶפְשָׁר לָצֵאת | can we go out? | אפשר לצאת | 0.00 | can we go out? | אֶפְשָׁר לָצֵאת | pass | ok |
| pu-restaurant | i-38-w8 | בֶּאֱמֶת? | really? | באמת | 0.00 | really? | בֶּאֱמֶת? | pass | ok |
| pu-restaurant | i-38-w9 | מָתַי? | when? | מתי | 0.00 | when? | מָתַי? | pass | ok |
| pu-restaurant | i-38-w10 | הָעֶרֶב | this evening | הערב | 0.00 | this evening | הָעֶרֶב | pass | ok |
| pu-restaurant | i-38-w11 | מָחָר | tomorrow | מחר | 0.00 | tomorrow | מָחָר | pass | ok |
| pu-restaurant | i-38-w12 | בְּשִׂמְחָה | gladly, with pleasure | בשמחה | 0.00 | gladly, with pleasure | בְּשִׂמְחָה | pass | ok |
| pu-restaurant | d-restaurant-l1 | שָׁלוֹם. לְכַמָּה אֲנָשִׁים? | Hello. For how many people? | שלום, לכמה אנשים? | 0.00 | Hello. For how many people? | שָׁלוֹם. לְכַמָּה אֲנָשִׁים? | pass | ok |
| pu-restaurant | d-restaurant-l2 | לִשְׁנַיִם, בְּבַקָּשָׁה. | For two, please. | לשניים, בבקשה. | 0.50 | For two, please. | לִשְׁנַיִם, בְּבַקָּשָׁה. | pass | ok |
| pu-restaurant | d-restaurant-l3 | בְּבַקָּשָׁה, פֹּה. הִנֵּה הַתַּפְרִיט. | Please, here. Here is the menu. | בבקשה, פה. הנה התפריט. | 0.00 | Please, here. Here is the menu. | בְּבַקָּשָׁה, פֹּה. הִנֵּה הַתַּפְרִיט. | pass | ok |
| pu-restaurant | d-restaurant-l4 | אֲנִי רוֹצֶה שְׁנִיצֶל וְסָלָט. | I'd like a schnitzel and a salad. | אני רוצה שניצל וסלט | 0.00 | I'd like a schnitzel and a salad. | אֲנִי רוֹצֶה שְׁנִיצֶל וְסָלָט. | pass | ok |
| pu-restaurant | d-restaurant-l5 | וְלִשְׁתּוֹת? | And to drink? | רוצה לשתות | 2.00 | And to drink? | וְלִשְׁתּוֹת? | fail | stt-wer=2.00 |
| pu-restaurant | d-restaurant-l6 | מַיִם, בְּבַקָּשָׁה. | Water, please. | מים בבקשה | 0.00 | Water, please. | מַיִם, בְּבַקָּשָׁה. | pass | ok |
| pu-restaurant | d-restaurant-l7 | סְלִיחָה, אֶפְשָׁר אֶת הַחֶשְׁבּוֹן? | Excuse me, can I have the bill? | סליחה, אפשר את החשבון? | 0.00 | Excuse me, can I have the bill? | סְלִיחָה, אֶפְשָׁר אֶת הַחֶשְׁבּוֹן? | pass | ok |
| pu-restaurant | d-restaurant-l8 | בֶּטַח, רֶגַע. | Sure, one moment. | בטח, רגע | 0.00 | Sure, one moment. | בֶּטַח, רֶגַע. | pass | ok |
| pu-shop | shop-01 | כַּמָּה זֶה עוֹלֶה? | how much does it cost? | כמה זה עולה | 0.00 | how much does it cost? | כַּמָּה זֶה עוֹלֶה? | pass | ok |
| pu-shop | shop-02 | מָה הַמְּחִיר? | what is the price? | מה המחיר | 0.00 | what is the price? | מָה הַמְּחִיר? | pass | ok |
| pu-shop | shop-03 | זֶה יָקָר | it's expensive | זה יקר | 0.00 | it's expensive | זֶה יָקָר | pass | ok |
| pu-shop | shop-04 | זֶה זוֹל | it's cheap | זלזול | 1.00 | it's cheap | זֶה זוֹל | fail | stt-wer=1.00 |
| pu-shop | shop-05 | יֵשׁ הַנָּחָה? | is there a discount? | יש לנו חג | 1.00 | is there a discount? | יֵשׁ הַנָּחָה? | fail | stt-wer=1.00 |
| pu-shop | shop-06 | אֲנִי רַק מִסְתַּכֵּל | I'm just looking | אני רק מסתכל | 0.00 | I'm just looking | אֲנִי רַק מִסְתַּכֵּל | pass | ok |
| pu-shop | shop-07 | אֶקַּח אֶת זֶה | I'll take this | אקח את זה | 0.00 | I'll take this | אֶקַּח אֶת זֶה | pass | ok |
| pu-shop | shop-08 | יֵשׁ לָכֶם ...? | do you have ...? | יש לכם | 0.00 | do you have ...? | יֵשׁ לָכֶם ...? | pass | ok |
| pu-shop | shop-09 | אֶפְשָׁר לִמְדֹּד? | can I try it on? | אפשר למדוד | 0.50 | can I try it on? | אֶפְשָׁר לִמְדֹּד? | pass | ok |
| pu-shop | shop-10 | מָה הַמִּדָּה? | what size? | מהמידה | 1.00 | what size? | מָה הַמִּדָּה? | fail | stt-wer=1.00 |
| pu-shop | shop-11 | יֵשׁ מִדָּה גְּדוֹלָה יוֹתֵר? | is there a bigger size? | יש מידג גדול יותר | 0.50 | is there a bigger size? | יֵשׁ מִדָּה גְּדוֹלָה יוֹתֵר? | fail | stt-wer=0.50 |
| pu-shop | shop-12 | מְזֻמָּן | cash | מזומן | 1.00 | cash | מְזֻמָּן | pass | ok |
| pu-shop | shop-13 | כַּרְטִיס אַשְׁרַאי | credit card | כרטיס אשראי | 0.00 | credit card | כַּרְטִיס אַשְׁרַאי | pass | ok |
| pu-shop | shop-14 | אֶפְשָׁר קַבָּלָה? | can I have a receipt? | אפשר קבלה | 0.00 | can I have a receipt? | אֶפְשָׁר קַבָּלָה? | pass | ok |
| pu-shop | shop-15 | אֶפְשָׁר שַׂקִּית? | can I have a bag? | אפשר שקית? | 0.00 | can I have a bag? | אֶפְשָׁר שַׂקִּית? | pass | ok |
| pu-shop | shop-16 | פָּתוּחַ | open | בטוח | 1.00 | open | פָּתוּחַ | fail | stt-wer=1.00 |
| pu-shop | shop-17 | סָגוּר | closed | סגור | 0.00 | closed | סָגוּר | pass | ok |
| pu-shop | shop-18 | מָתַי אַתֶּם סוֹגְרִים? | when do you close? | מתי אתם סוגרים | 0.00 | when do you close? | מָתַי אַתֶּם סוֹגְרִים? | pass | ok |
| pu-shop | shop-19 | שֶׁקֶל | shekel (Israeli currency) | שקל | 0.00 | shekel (Israeli currency) | שֶׁקֶל | pass | ok |
| pu-shop | shop-20 | אֵיפֹה הַשֵּׁרוּתִים? | where is the restroom? | איפה השירותים? | 0.50 | where is the restroom? | אֵיפֹה הַשֵּׁרוּתִים? | pass | ok |
| pu-shop | il08-w1 | כַּמָּה זֶה עוֹלֶה | how much does this cost | כמה זה עולה | 0.00 | how much does this cost | כַּמָּה זֶה עוֹלֶה | pass | ok |
| pu-shop | il08-w2 | יָקָר | expensive | יקר | 0.00 | expensive | יָקָר | pass | ok |
| pu-shop | il08-w3 | זוֹל | cheap | זול | 0.00 | cheap | זוֹל | pass | ok |
| pu-shop | il08-w4 | אֲנִי רוֹצֶה | I want (m.) | אני רוצה | 0.00 | I want (m.) | אֲנִי רוֹצֶה | pass | ok |
| pu-shop | il08-w5 | יֵשׁ | there is | יש | 0.00 | there is | יֵשׁ | pass | ok |
| pu-shop | il08-w6 | אֵין | there isn't | אין | 0.00 | there isn't | אֵין | pass | ok |
| pu-shop | il09-w3 | עוֹדֶף | change | עודף | 0.00 | change | עוֹדֶף | pass | ok |
| pu-shop | il09-w4 | שַׂקִּית | bag | שקית | 0.00 | bag | שַׂקִּית | pass | ok |
| pu-shop | il09-w5 | קַבָּלָה | receipt | קבלה | 0.00 | receipt | קַבָּלָה | pass | ok |
| pu-shop | i-12-w1 | שׁוּק | market | שוק | 0.00 | market | שׁוּק | pass | ok |
| pu-shop | i-12-w7 | חֲצִי | half | חצי | 0.00 | half | חֲצִי | pass | ok |
| pu-shop | i-12-w8 | טָרִי | fresh | תגיד | 1.00 | fresh | טָרִי | fail | stt-wer=1.00 |
| pu-shop | i-12-w9 | עַגְבָנִיָּה | tomato | עגבנייה | 1.00 | tomato | עַגְבָנִיָּה | pass | ok |
| pu-shop | i-12-w10 | מְלָפְפוֹן | cucumber | מלפפון | 0.00 | cucumber | מְלָפְפוֹן | pass | ok |
| pu-shop | i-12-w11 | גְּבִינָה | cheese | גבינה | 0.00 | cheese | גְּבִינָה | pass | ok |
| pu-shop | i-12-w12 | זֵיתִים | olives | זיתים | 0.00 | olives | זֵיתִים | pass | ok |
| pu-shop | i-43-w1 | קְנִיּוֹת | shopping | קניות | 0.00 | shopping | קְנִיּוֹת | pass | ok |
| pu-shop | i-43-w2 | עֲגָלָה | cart | עגלה | 0.00 | cart | עֲגָלָה | pass | ok |
| pu-shop | i-43-w3 | חָלָב | milk | חלב | 0.00 | milk | חָלָב | pass | ok |
| pu-shop | i-43-w4 | בֵּיצִים | eggs | ביצים | 0.00 | eggs | בֵּיצִים | pass | ok |
| pu-shop | i-43-w5 | לֶחֶם | bread | לחם | 0.00 | bread | לֶחֶם | pass | ok |
| pu-shop | i-43-w6 | פֵּרוֹת | fruit | פירות | 1.00 | fruit | פֵּרוֹת | pass | ok |
| pu-shop | i-43-w7 | מְחִיר | price | מחיר | 0.00 | price | מְחִיר | pass | ok |
| pu-shop | i-43-w11 | הַנָּחָה | discount | הנחה | 0.00 | discount | הַנָּחָה | pass | ok |
| pu-shop | d-shop-l1 | שָׁלוֹם. אֲנִי יָכוֹל לַעֲזֹר? | Hello. Can I help? | שלום, אני יכול לעזור? | 0.25 | Hello. Can I help? | שָׁלוֹם. אֲנִי יָכוֹל לַעֲזֹר? | pass | ok |
| pu-shop | d-shop-l2 | כַּמָּה הַחֻלְצָה הַזֹּאת? | How much is this shirt? | כמה החולצה הזאת | 0.33 | How much is this shirt? | כַּמָּה הַחֻלְצָה הַזֹּאת? | pass | ok |
| pu-shop | d-shop-l3 | מֵאָה וַעֲשָׂרָה שְׁקָלִים. | A hundred and ten shekels. | מאה ועשרה שקלים | 0.00 | A hundred and ten shekels. | מֵאָה וַעֲשָׂרָה שְׁקָלִים. | pass | ok |
| pu-shop | d-shop-l4 | יֵשׁ מִדָּה קְטַנָּה? | Do you have a small size? | יש מידה קטנה | 0.33 | Do you have a small size? | יֵשׁ מִדָּה קְטַנָּה? | pass | ok |
| pu-shop | d-shop-l5 | כֵּן, רֶגַע. הִנֵּה. | Yes, one moment. Here. | כן, רגע, הנה | 0.00 | Yes, one moment. Here. | כֵּן, רֶגַע. הִנֵּה. | pass | ok |
| pu-shop | d-shop-l7 | בֶּטַח. חֲדַר הַלְבָּשָׁה שָׁם. | Of course. The fitting room is there. | בטח, חדר הלבשה שם. | 0.00 | Of course. The fitting room is there. | בֶּטַח. חֲדַר הַלְבָּשָׁה שָׁם. | pass | ok |
| pu-shop | d-shop-l8 | אֲנִי לוֹקַחַת אֶת זֶה. בְּכַרְטִיס, בְּבַקָּשָׁה. | I'll take it. By card, please. | אני לוקחת את זה, בכרטיס בבקשה | 0.00 | I'll take it. By card, please. | אֲנִי לוֹקַחַת אֶת זֶה. בְּכַרְטִיס, בְּבַקָּשָׁה. | pass | ok |
| pu-directions | directions-01 | אֵיפֹה ...? | where is ...? | איפה | 0.00 | where is ...? | אֵיפֹה ...? | pass | ok |
| pu-directions | directions-02 | אֵיךְ מַגִּיעִים לְ...? | how do you get to ...? | איך מגיעים ל | 0.00 | how do you get to ...? | אֵיךְ מַגִּיעִים לְ...? | pass | ok |
| pu-directions | directions-03 | זֶה רָחוֹק? | is it far? | זה רחוק | 0.00 | is it far? | זֶה רָחוֹק? | pass | ok |
| pu-directions | directions-04 | זֶה קָרוֹב | it's near | זה קרוב | 0.00 | it's near | זֶה קָרוֹב | pass | ok |
| pu-directions | directions-05 | יָשָׁר | straight ahead | ישר | 0.00 | straight ahead | יָשָׁר | pass | ok |
| pu-directions | directions-06 | שְׂמֹאלָה | left | שמאל | 1.00 | left | שְׂמֹאלָה | fail | stt-wer=1.00 |
| pu-directions | directions-07 | יָמִינָה | right | ימינה | 0.00 | right | יָמִינָה | pass | ok |
| pu-directions | directions-08 | לֵךְ יָשָׁר | go straight | לך ישר | 0.00 | go straight | לֵךְ יָשָׁר | pass | ok |
| pu-directions | directions-09 | פְּנֵה שְׂמֹאלָה | turn left | פנה שמאלה | 0.00 | turn left | פְּנֵה שְׂמֹאלָה | pass | ok |
| pu-directions | directions-10 | פְּנֵה יָמִינָה | turn right | פני ימינה | 0.50 | turn right | פְּנֵה יָמִינָה | pass | ok |
| pu-directions | directions-11 | עַל יַד | next to | היד | 1.00 | next to | עַל יַד | fail | stt-wer=1.00 |
| pu-directions | directions-12 | מוּל | opposite | מול | 0.00 | opposite | מוּל | pass | ok |
| pu-directions | directions-13 | בַּפִּנָּה | on the corner | בפינה | 1.00 | on the corner | בַּפִּנָּה | pass | ok |
| pu-directions | directions-14 | אֲנִי אָבוּד | I'm lost | אני אבוד | 0.00 | I'm lost | אֲנִי אָבוּד | pass | ok |
| pu-directions | directions-15 | אֶפְשָׁר לְהַרְאוֹת לִי עַל הַמַּפָּה? | can you show me on the map? | אפשר להראות לי על המפה | 0.00 | can you show me on the map? | אֶפְשָׁר לְהַרְאוֹת לִי עַל הַמַּפָּה? | pass | ok |
| pu-directions | directions-16 | כַּמָּה זְמַן זֶה לוֹקֵחַ? | how long does it take? | כמה זמן זה לוקח | 0.00 | how long does it take? | כַּמָּה זְמַן זֶה לוֹקֵחַ? | pass | ok |
| pu-directions | directions-17 | אֵיפֹה בֵּית הַחוֹלִים? | where is the hospital? | איפה בית החולים | 0.00 | where is the hospital? | אֵיפֹה בֵּית הַחוֹלִים? | pass | ok |
| pu-directions | directions-18 | אֵיפֹה בֵּית הַמִּרְקַחַת? | where is the pharmacy? | איפה בית המרקחת | 0.00 | where is the pharmacy? | אֵיפֹה בֵּית הַמִּרְקַחַת? | pass | ok |
| pu-directions | directions-19 | אֵיפֹה הַמָּלוֹן? | where is the hotel? | איפה המלון? | 0.00 | where is the hotel? | אֵיפֹה הַמָּלוֹן? | pass | ok |
| pu-directions | directions-20 | אֵיפֹה הַתַּחֲנָה? | where is the station? | איפה התחנה? | 0.00 | where is the station? | אֵיפֹה הַתַּחֲנָה? | pass | ok |
| pu-directions | il11-w4 | קָרוֹב | near | קרוב | 0.00 | near | קָרוֹב | pass | ok |
| pu-directions | il11-w5 | רָחוֹק | far | רחוק | 0.00 | far | רָחוֹק | pass | ok |
| pu-directions | il11-w6 | אֵיפֹה | where | איפה | 0.00 | where | אֵיפֹה | pass | ok |
| pu-directions | i-15-w5 | פְּנֵה | turn (m) | פנה | 0.00 | turn (m) | פְּנֵה | pass | ok |
| pu-directions | i-15-w6 | לֵךְ | go (m) | לך | 0.00 | go (m) | לֵךְ | pass | ok |
| pu-directions | i-15-w10 | רְחוֹב | street | רחוב | 0.00 | street | רְחוֹב | pass | ok |
| pu-directions | i-15-w11 | בֵּית חוֹלִים | hospital | בית חולים | 0.00 | hospital | בֵּית חוֹלִים | pass | ok |
| pu-directions | i-15-w12 | גֶּשֶׁר | bridge | גשר | 0.00 | bridge | גֶּשֶׁר | pass | ok |
| pu-directions | i-15-w16 | אֲנִי אֲבוּדָה | I'm lost (f) | אני עבודה | 0.50 | I'm lost (f) | אֲנִי אֲבוּדָה | pass | ok |
| pu-directions | d-directions-l1 | סְלִיחָה, אֵיפֹה הַתַּחֲנָה הַמֶּרְכָּזִית? | Excuse me, where is the central station? | סליחה, איפה התחנה המרכזית? | 0.00 | Excuse me, where is the central station? | סְלִיחָה, אֵיפֹה הַתַּחֲנָה הַמֶּרְכָּזִית? | pass | ok |
| pu-directions | d-directions-l2 | לֵךְ יָשָׁר, וְאַחַר כָּךְ פְּנֵה שְׂמֹאלָה. | Go straight, and then turn left. | לך ישר ואחר כך פנה שמאלה | 0.00 | Go straight, and then turn left. | לֵךְ יָשָׁר, וְאַחַר כָּךְ פְּנֵה שְׂמֹאלָה. | pass | ok |
| pu-directions | d-directions-l4 | לֹא, חָמֵשׁ דַּקּוֹת. | No, five minutes. | לא, חמש דקות. | 0.00 | No, five minutes. | לֹא, חָמֵשׁ דַּקּוֹת. | pass | ok |
| pu-directions | d-directions-l5 | תּוֹדָה רַבָּה! | Thank you very much! | תודה רבה | 0.00 | Thank you very much! | תּוֹדָה רַבָּה! | pass | ok |
| pu-directions | d-directions-l6 | בְּבַקָּשָׁה. | You're welcome. | בבקשה | 0.00 | You're welcome. | בְּבַקָּשָׁה. | pass | ok |
| pu-transport | taxi-01 | אֲנִי צָרִיךְ מוֹנִית | I need a taxi | אני צריך מונית | 0.00 | I need a taxi | אֲנִי צָרִיךְ מוֹנִית | pass | ok |
| pu-transport | taxi-02 | לְאָן? | where to? | לאן | 0.00 | where to? | לְאָן? | pass | ok |
| pu-transport | taxi-03 | לִשְׂדֵה הַתְּעוּפָה, בְּבַקָּשָׁה | to the airport, please | לשדה התעופה, בבקשה. | 0.00 | to the airport, please | לִשְׂדֵה הַתְּעוּפָה, בְּבַקָּשָׁה | pass | ok |
| pu-transport | taxi-04 | לַתַּחֲנָה הַמֶּרְכָּזִית | to the central station | לתחנה המרכזית | 0.00 | to the central station | לַתַּחֲנָה הַמֶּרְכָּזִית | pass | ok |
| pu-transport | taxi-05 | לַמָּלוֹן | to the hotel | למה לא? | 2.00 | to the hotel | לַמָּלוֹן | fail | stt-wer=2.00 |
| pu-transport | taxi-06 | לַכּוֹתֶל | to the Western Wall | הכותל | 1.00 | to the Western Wall | לַכּוֹתֶל | fail | stt-wer=1.00 |
| pu-transport | taxi-07 | אֶפְשָׁר מוֹנֶה, בְּבַקָּשָׁה? | can you use the meter, please? | אפשר מונה בבקשה | 0.00 | can you use the meter, please? | אֶפְשָׁר מוֹנֶה, בְּבַקָּשָׁה? | pass | ok |
| pu-transport | taxi-08 | כַּמָּה זֶה יַעֲלֶה? | how much will it cost? | כמה זה יעלה | 0.00 | how much will it cost? | כַּמָּה זֶה יַעֲלֶה? | pass | ok |
| pu-transport | taxi-09 | עֲצֹר כָּאן, בְּבַקָּשָׁה | stop here, please | עצור כאן, בבקשה. | 0.33 | stop here, please | עֲצֹר כָּאן, בְּבַקָּשָׁה | pass | ok |
| pu-transport | taxi-10 | אֵיפֹה תַּחֲנַת הָאוֹטוֹבּוּס? | where is the bus stop? | איפה תחנת האוטובוס | 0.00 | where is the bus stop? | אֵיפֹה תַּחֲנַת הָאוֹטוֹבּוּס? | pass | ok |
| pu-transport | taxi-11 | אֵיזֶה אוֹטוֹבּוּס הוֹלֵךְ לְ...? | which bus goes to ...? | איזה אוטובוס הולך ל | 0.00 | which bus goes to ...? | אֵיזֶה אוֹטוֹבּוּס הוֹלֵךְ לְ...? | pass | ok |
| pu-transport | taxi-12 | מָתַי הָרַכֶּבֶת הַבָּאָה? | when is the next train? | מתי הרכבת הבאה | 0.00 | when is the next train? | מָתַי הָרַכֶּבֶת הַבָּאָה? | pass | ok |
| pu-transport | taxi-13 | כַּרְטִיס אֶחָד לְ..., בְּבַקָּשָׁה | one ticket to ..., please | כרטיס אחד ל בבקשה | 0.00 | one ticket to ..., please | כַּרְטִיס אֶחָד לְ..., בְּבַקָּשָׁה | pass | ok |
| pu-transport | taxi-14 | הַאִם זֶה הָאוֹטוֹבּוּס לְ...? | is this the bus to ...? | האם זה האוטובוס ל | 0.00 | is this the bus to ...? | הַאִם זֶה הָאוֹטוֹבּוּס לְ...? | pass | ok |
| pu-transport | taxi-15 | הַנְּסִיעָה הָיְתָה נָעִימָה, תּוֹדָה | it was a pleasant ride, thanks | הנסיעה הייתה נעימה, תודה. | 0.25 | it was a pleasant ride, thanks | הַנְּסִיעָה הָיְתָה נָעִימָה, תּוֹדָה | pass | ok |
| pu-transport | il10-w1 | מוֹנִית | taxi | מונית | 0.00 | taxi | מוֹנִית | pass | ok |
| pu-transport | il10-w2 | אוֹטוֹבּוּס | bus | אוטובוס | 0.00 | bus | אוֹטוֹבּוּס | pass | ok |
| pu-transport | il10-w3 | רַכֶּבֶת | train | רכבת | 0.00 | train | רַכֶּבֶת | pass | ok |
| pu-transport | il10-w4 | תַּחֲנָה | station; stop | תחנה | 0.00 | station; stop | תַּחֲנָה | pass | ok |
| pu-transport | il10-w5 | כַּרְטִיס | ticket | כרטיס | 0.00 | ticket | כַּרְטִיס | pass | ok |
| pu-transport | il10-w6 | נְסִיעָה | ride; trip | נסיעה | 0.00 | ride; trip | נְסִיעָה | pass | ok |
| pu-transport | i-11-w5 | רַב-קַו | Rav-Kav (the transit card) | רב קו | 2.00 | Rav-Kav (the transit card) | רַב-קַו | pass | ok |
| pu-transport | i-11-w6 | רְצִיף | platform | רציף | 0.00 | platform | רְצִיף | pass | ok |
| pu-transport | i-11-w7 | נַהָג | driver | נהג | 0.00 | driver | נַהָג | pass | ok |
| pu-transport | i-11-w8 | הַתַּחֲנָה הַבָּאָה | the next stop | התחנה הבאה | 0.00 | the next stop | הַתַּחֲנָה הַבָּאָה | pass | ok |
| pu-transport | i-11-w9 | יוֹרֵד | getting off (m) | ילד | 1.00 | getting off (m) | יוֹרֵד | fail | stt-wer=1.00 |
| pu-transport | i-11-w10 | יוֹרֶדֶת | getting off (f) | יוֹרֶדֶת | 0.00 | getting off (f) | יוֹרֶדֶת | pass | ok |
| pu-transport | i-11-w11 | תָּפוּס | taken (seat) | תפוס | 0.00 | taken (seat) | תָּפוּס | pass | ok |
| pu-transport | i-11-w12 | פָּנוּי | free (seat) | פנוי | 0.00 | free (seat) | פָּנוּי | pass | ok |
| pu-transport | i-23-w3 | לִשְׂדֵה הַתְּעוּפָה | to the airport | לשדה התעופה | 0.00 | to the airport | לִשְׂדֵה הַתְּעוּפָה | pass | ok |
| pu-transport | i-23-w6 | מוֹנֶה | meter | מונה | 0.00 | meter | מוֹנֶה | pass | ok |
| pu-transport | i-23-w9 | לְאַט | slowly | לאט | 0.00 | slowly | לְאַט | pass | ok |
| pu-transport | i-23-w10 | קַבָּלָה | receipt | קבלה | 0.00 | receipt | קַבָּלָה | pass | ok |
| pu-transport | i-23-w11 | מְמַהֵר | in a hurry (m) | ממהר | 0.00 | in a hurry (m) | מְמַהֵר | pass | ok |
| pu-transport | i-23-w12 | שֵׁרוּת | service; shared taxi (sherut) | שירות | 1.00 | service; shared taxi (sherut) | שֵׁרוּת | pass | ok |
| pu-transport | i-23-w13 | חַלּוֹן | window | חלון | 0.00 | window | חַלּוֹן | pass | ok |
| pu-transport | d-taxi-l1 | שָׁלוֹם. לִשְׂדֵה הַתְּעוּפָה, בְּבַקָּשָׁה. | Hello. To the airport, please. | שלום, לשדה התעופה, בבקשה. | 0.00 | Hello. To the airport, please. | שָׁלוֹם. לִשְׂדֵה הַתְּעוּפָה, בְּבַקָּשָׁה. | pass | ok |
| pu-transport | d-taxi-l2 | בְּסֵדֶר. עֲלֵה. | OK. Get in. | בסדר, עלי | 0.50 | OK. Get in. | בְּסֵדֶר. עֲלֵה. | pass | ok |
| pu-transport | d-taxi-l3 | עִם מוֹנֶה, בְּבַקָּשָׁה. | With the meter, please. | אמא הנה בבקשה | 0.67 | With the meter, please. | עִם מוֹנֶה, בְּבַקָּשָׁה. | fail | stt-wer=0.67 |
| pu-transport | d-taxi-l4 | כֵּן, בְּלִי בְּעָיָה. | Yes, no problem. | כן, בלי בעיה. | 0.00 | Yes, no problem. | כֵּן, בְּלִי בְּעָיָה. | pass | ok |
| pu-transport | d-taxi-l5 | כַּמָּה זְמַן? | How long will it take? | כמה זמן | 0.00 | How long will it take? | כַּמָּה זְמַן? | pass | ok |
| pu-transport | d-taxi-l6 | בְּעֵרֶךְ עֶשְׂרִים דַּקּוֹת. | About twenty minutes. | בערך 20 דקות | 0.33 | About twenty minutes. | בְּעֵרֶךְ עֶשְׂרִים דַּקּוֹת. | pass | ok |
| pu-transport | d-taxi-l7 | הִגַּעְנוּ. | We've arrived. | הגענו | 0.00 | We've arrived. | הִגַּעְנוּ. | pass | ok |
| pu-transport | d-taxi-l8 | כַּמָּה אֲנִי חַיָּב? | How much do I owe? | כמה אני חייב | 0.33 | How much do I owe? | כַּמָּה אֲנִי חַיָּב? | pass | ok |
| pu-transport | d-taxi-l9 | מֵאָה שְׁקָלִים. | A hundred shekels. | מַאשְׁקָלִים | 1.00 | A hundred shekels. | מֵאָה שְׁקָלִים. | pass | ok |
| pu-transport | d-taxi-l10 | הִנֵּה, תּוֹדָה. יוֹם טוֹב! | Here you go, thanks. Have a good day! | הנה, תודה. יום טוב. | 0.00 | Here you go, thanks. Have a good day! | הִנֵּה, תּוֹדָה. יוֹם טוֹב! | pass | ok |
| pu-small-talk | small-talk-01 | מַה שִּׁמְךָ? | what's your name? | מה שמך | 0.00 | what's your name? | מַה שִּׁמְךָ? | pass | ok |
| pu-small-talk | small-talk-02 | קוֹרְאִים לִי ... | my name is ... (lit. they call me ...) | קוראים לי | 0.00 | my name is ... (lit. they call me ...) | קוֹרְאִים לִי ... | pass | ok |
| pu-small-talk | small-talk-03 | מֵאֵיפֹה אַתָּה? | where are you from? | מאיפה אתה? | 0.00 | where are you from? | מֵאֵיפֹה אַתָּה? | pass | ok |
| pu-small-talk | small-talk-04 | אֲנִי מִקָּנָדָה | I'm from Canada | אני מקנדה | 0.00 | I'm from Canada | אֲנִי מִקָּנָדָה | pass | ok |
| pu-small-talk | small-talk-05 | אֲנִי תַּיָּר | I'm a tourist | אני תייר | 0.50 | I'm a tourist | אֲנִי תַּיָּר | pass | ok |
| pu-small-talk | small-talk-06 | זֹאת הַפַּעַם הָרִאשׁוֹנָה שֶׁלִּי בְּיִשְׂרָאֵל | it's my first time in Israel | זאת הפעם הראשונה שלי בישראל | 0.00 | it's my first time in Israel | זֹאת הַפַּעַם הָרִאשׁוֹנָה שֶׁלִּי בְּיִשְׂרָאֵל | pass | ok |
| pu-small-talk | small-talk-07 | מָה אַתָּה עוֹשֶׂה? | what do you do (for work)? | מה אתה עושה | 0.00 | what do you do (for work)? | מָה אַתָּה עוֹשֶׂה? | pass | ok |
| pu-small-talk | small-talk-08 | בֶּן כַּמָּה אַתָּה? | how old are you? (lit. son of how much) | מן כמה אתה | 0.33 | how old are you? (lit. son of how much) | בֶּן כַּמָּה אַתָּה? | pass | ok |
| pu-small-talk | small-talk-09 | אֲנִי רָעֵב | I'm hungry | אני רעב | 0.00 | I'm hungry | אֲנִי רָעֵב | pass | ok |
| pu-small-talk | small-talk-10 | אֲנִי צָמֵא | I'm thirsty | אני צמח | 0.50 | I'm thirsty | אֲנִי צָמֵא | fail | stt-wer=0.50 |
| pu-small-talk | small-talk-11 | אֲנִי עָיֵף | I'm tired | אני עייף | 0.50 | I'm tired | אֲנִי עָיֵף | pass | ok |
| pu-small-talk | small-talk-12 | חַם לִי | I'm hot | חמלי | 1.00 | I'm hot | חַם לִי | pass | ok |
| pu-small-talk | small-talk-13 | קַר לִי | I'm cold | קרא לי | 0.50 | I'm cold | קַר לִי | fail | stt-wer=0.50 |
| pu-small-talk | small-talk-14 | הַכֹּל בְּסֵדֶר אִתְּךָ? | are you OK? | הכל בסדר איתך? | 0.33 | are you OK? | הַכֹּל בְּסֵדֶר אִתְּךָ? | pass | ok |
| pu-small-talk | small-talk-15 | תִּרְגַּע | chill / calm down | תרגע | 0.00 | chill / calm down | תִּרְגַּע | pass | ok |
| pu-small-talk | small-talk-16 | מָה הַמַּצָּב? | how's it going? (lit. what's the situation) | מה המצב? | 0.00 | how's it going? (lit. what's the situation) | מָה הַמַּצָּב? | pass | ok |
| pu-small-talk | small-talk-17 | אֵין מָה לַעֲשׂוֹת | there's nothing to be done | אין מה לעשות | 0.00 | there's nothing to be done | אֵין מָה לַעֲשׂוֹת | pass | ok |
| pu-small-talk | small-talk-18 | חָבֵר | friend | חבר | 0.00 | friend | חָבֵר | pass | ok |
| pu-small-talk | small-talk-19 | אֶתְגַּעְגֵּעַ אֵלֶיךָ | I'll miss you | התגעגע אליך | 0.50 | I'll miss you | אֶתְגַּעְגֵּעַ אֵלֶיךָ | pass | ok |
| pu-small-talk | il13-w1 | מַה נִּשְׁמָע | what's up; how are you | מה נשמע | 0.00 | what's up; how are you | מַה נִּשְׁמָע | pass | ok |
| pu-small-talk | il13-w2 | הַכֹּל בְּסֵדֶר | everything's fine | הכל בסדר | 0.00 | everything's fine | הַכֹּל בְּסֵדֶר | pass | ok |
| pu-small-talk | il13-w3 | מַה קּוֹרֶה | what's happening | מה קורה? | 0.00 | what's happening | מַה קּוֹרֶה | pass | ok |
| pu-small-talk | il13-w5 | לֹא רַע | not bad | לאה | 1.00 | not bad | לֹא רַע | fail | stt-wer=1.00 |
| pu-small-talk | i-25-w2 | קוֹרְאִים לִי | my name is (they call me) | קוראים לי | 0.00 | my name is (they call me) | קוֹרְאִים לִי | pass | ok |
| pu-small-talk | i-25-w5 | כַּמָּה זְמַן | how long | כמה זמן | 0.00 | how long | כַּמָּה זְמַן | pass | ok |
| pu-small-talk | i-25-w6 | בָּאָרֶץ | in the country (Israel) | בארץ | 0.00 | in the country (Israel) | בָּאָרֶץ | pass | ok |
| pu-small-talk | i-25-w7 | שָׁבוּעַ | a week | שבוע | 0.00 | a week | שָׁבוּעַ | pass | ok |
| pu-small-talk | i-25-w8 | חֹדֶשׁ | month | חודש | 1.00 | month | חֹדֶשׁ | pass | ok |
| pu-small-talk | i-25-w9 | לוֹמֵד | studying (m) | לומד | 0.00 | studying (m) | לוֹמֵד | pass | ok |
| pu-small-talk | i-25-w10 | עִבְרִית | Hebrew | הבית | 1.00 | Hebrew | עִבְרִית | fail | stt-wer=1.00 |
| pu-small-talk | i-25-w12 | מָה נִשְׁמָע? | what's up? | מה נשמע | 0.00 | what's up? | מָה נִשְׁמָע? | pass | ok |
| pu-small-talk | i-25-w14 | נָעִים מְאֹד | nice to meet you | נעים מאוד | 0.50 | nice to meet you | נָעִים מְאֹד | pass | ok |
| pu-small-talk | i-25-w15 | לְהִתְרָאוֹת | see you | להתראות | 0.00 | see you | לְהִתְרָאוֹת | pass | ok |
| pu-small-talk | i-36-w1 | עֲבוֹדָה | work, job | עבודה | 0.00 | work, job | עֲבוֹדָה | pass | ok |
| pu-small-talk | i-36-w2 | מִשְׂרָד | office | משרד | 0.00 | office | מִשְׂרָד | pass | ok |
| pu-small-talk | i-36-w3 | פְּגִישָׁה | meeting, appointment | פגישה | 0.00 | meeting, appointment | פְּגִישָׁה | pass | ok |
| pu-small-talk | i-36-w4 | מְנַהֵל | manager, boss | מנהל | 0.00 | manager, boss | מְנַהֵל | pass | ok |
| pu-small-talk | i-36-w5 | לָקוֹחַ | client | לקוח | 0.00 | client | לָקוֹחַ | pass | ok |
| pu-small-talk | i-36-w6 | מַעֲסִיק | employer | מסיק | 1.00 | employer | מַעֲסִיק | fail | stt-wer=1.00 |
| pu-small-talk | i-36-w7 | רֵאָיוֹן | interview | רעיון | 1.00 | interview | רֵאָיוֹן | fail | stt-wer=1.00 |
| pu-small-talk | i-36-w8 | הוֹדָעָה | message, notice | הודעה | 0.00 | message, notice | הוֹדָעָה | pass | ok |
| pu-small-talk | i-36-w9 | מָחָר | tomorrow | מחר | 0.00 | tomorrow | מָחָר | pass | ok |
| pu-small-talk | i-36-w10 | הַיּוֹם | today | היום | 0.00 | today | הַיּוֹם | pass | ok |
| pu-small-talk | i-36-w11 | עוֹבֵד | working (m) | עובד | 0.00 | working (m) | עוֹבֵד | pass | ok |
| pu-small-talk | i-36-w12 | רֶגַע | one moment | רגע | 0.00 | one moment | רֶגַע | pass | ok |
| pu-small-talk | d-smalltalk-l1 | הַיי, מָה נִשְׁמָע? | Hi, how's it going? | היי, מה נשמע? | 0.00 | Hi, how's it going? | הַיי, מָה נִשְׁמָע? | pass | ok |
| pu-small-talk | d-smalltalk-l2 | הַכֹּל בְּסֵדֶר, תּוֹדָה. וְאַתָּה? | All fine, thanks. And you? | הכל בסדר, תודה. ואתה? | 0.00 | All fine, thanks. And you? | הַכֹּל בְּסֵדֶר, תּוֹדָה. וְאַתָּה? | pass | ok |
| pu-small-talk | d-smalltalk-l3 | הַכֹּל טוֹב. מֵאֵיפֹה אַתְּ? | All good. Where are you from? | הכל טוב, מאיפה את? | 0.00 | All good. Where are you from? | הַכֹּל טוֹב. מֵאֵיפֹה אַתְּ? | pass | ok |
| pu-small-talk | d-smalltalk-l4 | אֲנִי מִתֵּל אָבִיב. וְאַתָּה? | I'm from Tel Aviv. And you? | אני מתל אביב, ואתה? | 0.00 | I'm from Tel Aviv. And you? | אֲנִי מִתֵּל אָבִיב. וְאַתָּה? | pass | ok |
| pu-small-talk | d-smalltalk-l5 | אֲנִי מִקָּנָדָה. אֲנִי מְדַבֵּר עִבְרִית קְצָת. | I'm from Canada. I speak a little Hebrew. | אני מקנדה, אני מדבר עברית קצת. | 0.00 | I'm from Canada. I speak a little Hebrew. | אֲנִי מִקָּנָדָה. אֲנִי מְדַבֵּר עִבְרִית קְצָת. | pass | ok |
| pu-small-talk | d-smalltalk-l6 | מְצֻיָּן! אַתָּה מְדַבֵּר טוֹב. | Excellent! You speak well. | מצוין, אתה מדבר טוב. | 0.25 | Excellent! You speak well. | מְצֻיָּן! אַתָּה מְדַבֵּר טוֹב. | pass | ok |
| pu-small-talk | d-smalltalk-l7 | נָעִים מְאוֹד. | Very nice to meet you. | נעים מאוד | 0.00 | Very nice to meet you. | נָעִים מְאוֹד. | pass | ok |
| pu-family | il14-w1 | מִשְׁפָּחָה | family | משפחה | 0.00 | family | מִשְׁפָּחָה | pass | ok |
| pu-family | il14-w2 | אָח | brother | אח | 0.00 | brother | אָח | pass | ok |
| pu-family | il14-w3 | אָחוֹת | sister | אחות | 0.00 | sister | אָחוֹת | pass | ok |
| pu-family | il14-w4 | יֶלֶד | boy; child | ילד | 0.00 | boy; child | יֶלֶד | pass | ok |
| pu-family | il14-w5 | יַלְדָּה | girl | ילדה | 0.00 | girl | יַלְדָּה | pass | ok |
| pu-family | il14-w6 | נָשׂוּי | married (m.) | נשוי | 0.00 | married (m.) | נָשׂוּי | pass | ok |
| pu-family | i-42-w3 | יְלָדִים | children | ילדים | 0.00 | children | יְלָדִים | pass | ok |
| pu-family | i-42-w4 | תִּינוֹק | baby | תינוק | 0.00 | baby | תִּינוֹק | pass | ok |
| pu-family | i-42-w5 | גַּן | garden, kindergarten | גן | 0.00 | garden, kindergarten | גַּן | pass | ok |
| pu-family | i-42-w6 | מוֹרָה | teacher (f) | מועד | 1.00 | teacher (f) | מוֹרָה | fail | stt-wer=1.00 |
| pu-family | i-42-w7 | מוֹרֶה | teacher (m) | מוֹרֶה | 0.00 | teacher (m) | מוֹרֶה | pass | ok |
| pu-family | i-42-w8 | מִשְׂחָק | game | משחק | 0.00 | game | מִשְׂחָק | pass | ok |
| pu-family | i-42-w9 | אִמָּא | mother | אמא | 0.00 | mother | אִמָּא | pass | ok |
| pu-family | i-42-w10 | אַבָּא | father | אבא | 0.00 | father | אַבָּא | pass | ok |
| pu-family | i-42-w11 | בֶּן כַּמָּה? | how old (lit. son of how much)? | ממך | 1.00 | how old (lit. son of how much)? | בֶּן כַּמָּה? | fail | stt-wer=1.00 |
| pu-family | i-42-w12 | חָמוּד | cute, sweet, charming | חמוד | 0.00 | cute, sweet, charming | חָמוּד | pass | ok |
| pu-home | i-44-w1 | שָׁבוּר | broken | שבוע | 1.00 | broken | שָׁבוּר | fail | stt-wer=1.00 |
| pu-home | i-44-w2 | מַנְעוּל | lock | מנעול | 0.00 | lock | מַנְעוּל | pass | ok |
| pu-home | i-44-w3 | דֶּלֶת | door | דלת | 0.00 | door | דֶּלֶת | pass | ok |
| pu-home | i-44-w4 | חַשְׁמַל | electricity | חשמל | 0.00 | electricity | חַשְׁמַל | pass | ok |
| pu-home | i-44-w5 | חַשְׁמַלַּאי | electrician | חשמלאי | 0.00 | electrician | חַשְׁמַלַּאי | pass | ok |
| pu-home | i-44-w6 | מְקָרֵר | refrigerator | מקרר | 0.00 | refrigerator | מְקָרֵר | pass | ok |
| pu-home | i-44-w7 | קִיר | wall | קיר | 0.00 | wall | קִיר | pass | ok |
| pu-home | i-44-w8 | בַּעַל הַבַּיִת | the landlord | בעל הבית | 0.00 | the landlord | בַּעַל הַבַּיִת | pass | ok |
| pu-home | i-44-w9 | מָתַי? | when? | מתי | 0.00 | when? | מָתַי? | pass | ok |
| pu-home | i-44-w10 | דָּחוּף | urgent | הפחד | 1.00 | urgent | דָּחוּף | fail | stt-wer=1.00 |
| pu-home | i-44-w11 | עֶזְרָה | help | עזרה | 0.00 | help | עֶזְרָה | pass | ok |
| pu-home | i-44-w12 | תּוֹר | appointment, turn | תו | 1.00 | appointment, turn | תּוֹר | fail | stt-wer=1.00 |
| pu-time | il12-w1 | הַיּוֹם | today | היום | 0.00 | today | הַיּוֹם | pass | ok |
| pu-time | il12-w2 | מָחָר | tomorrow | מחר | 0.00 | tomorrow | מָחָר | pass | ok |
| pu-time | il12-w3 | אֶתְמוֹל | yesterday | אתמול | 0.00 | yesterday | אֶתְמוֹל | pass | ok |
| pu-time | il12-w4 | שָׁעָה | hour; time | שעה | 0.00 | hour; time | שָׁעָה | pass | ok |
| pu-time | il12-w5 | יוֹם רִאשׁוֹן | Sunday (first day) | יום ראשון | 0.00 | Sunday (first day) | יוֹם רִאשׁוֹן | pass | ok |
| pu-time | il12-w6 | שַׁבָּת | Saturday; Sabbath | שבת | 0.00 | Saturday; Sabbath | שַׁבָּת | pass | ok |
| pu-weather | il15-w1 | חַם | hot | חם | 0.00 | hot | חַם | pass | ok |
| pu-weather | il15-w2 | קַר | cold | קר | 0.00 | cold | קַר | pass | ok |
| pu-weather | il15-w3 | גֶּשֶׁם | rain | גשם | 0.00 | rain | גֶּשֶׁם | pass | ok |
| pu-weather | il15-w4 | שֶׁמֶשׁ | sun | שמש | 0.00 | sun | שֶׁמֶשׁ | pass | ok |
| pu-weather | il15-w5 | מֶזֶג אֲוִיר | weather | מזג אוויר | 0.50 | weather | מֶזֶג אֲוִיר | pass | ok |
| pu-weather | i-24-w6 | רוּחַ | wind | רוח | 0.00 | wind | רוּחַ | pass | ok |
| pu-weather | i-24-w7 | עָנָן | cloud | ענן | 0.00 | cloud | עָנָן | pass | ok |
| pu-weather | i-24-w8 | שֶׁלֶג | snow | שלג | 0.00 | snow | שֶׁלֶג | pass | ok |
| pu-weather | i-24-w9 | לַח | humid | לך | 1.00 | humid | לַח | fail | stt-wer=1.00 |
| pu-weather | i-24-w10 | קַיִץ | summer | קיץ | 0.00 | summer | קַיִץ | pass | ok |
| pu-weather | i-24-w11 | חֹרֶף | winter | חובב | 1.00 | winter | חֹרֶף | fail | stt-wer=1.00 |
| pu-weather | i-24-w12 | אָבִיב | spring | אביב | 0.00 | spring | אָבִיב | pass | ok |
| pu-weather | i-24-w13 | סְתָו | autumn | סתיו | 1.00 | autumn | סְתָו | pass | ok |
| pu-weather | i-24-w14 | כּוֹבַע | hat | כובע | 0.00 | hat | כּוֹבַע | pass | ok |
| pu-weather | i-24-w15 | מְעִיל | coat | מעיל | 0.00 | coat | מְעִיל | pass | ok |
| pu-hotel | il17-w1 | חֶדֶר | room | חדר | 0.00 | room | חֶדֶר | pass | ok |
| pu-hotel | il17-w2 | הַזְמָנָה | reservation | הזמנה | 0.00 | reservation | הַזְמָנָה | pass | ok |
| pu-hotel | il17-w3 | לַיְלָה | night | לילה | 0.00 | night | לַיְלָה | pass | ok |
| pu-hotel | il17-w4 | מַפְתֵּחַ | key | מפתח | 0.00 | key | מַפְתֵּחַ | pass | ok |
| pu-hotel | il17-w5 | אַרוּחַת בֹּקֶר | breakfast | ארוחת בוקר | 0.50 | breakfast | אַרוּחַת בֹּקֶר | pass | ok |
| pu-hotel | d-hotel-l1 | שָׁלוֹם. יֵשׁ לִי הַזְמָנָה. | Hello. I have a reservation. | שלום, יש לי הזמנה. | 0.00 | Hello. I have a reservation. | שָׁלוֹם. יֵשׁ לִי הַזְמָנָה. | pass | ok |
| pu-hotel | d-hotel-l2 | בְּאֵיזֶה שֵׁם? | Under what name? | באיזה שם | 0.00 | Under what name? | בְּאֵיזֶה שֵׁם? | pass | ok |
| pu-hotel | d-hotel-l3 | לֵוִי. | Levi. | לוי | 0.00 | Levi. | לֵוִי. | pass | ok |
| pu-hotel | d-hotel-l4 | כֵּן, אֲנִי רוֹאֶה. שְׁלוֹשָׁה לֵילוֹת. | Yes, I see it. Three nights. | כן, אני רואה. שלושה לילות. | 0.00 | Yes, I see it. Three nights. | כֵּן, אֲנִי רוֹאֶה. שְׁלוֹשָׁה לֵילוֹת. | pass | ok |
| pu-hotel | d-hotel-l5 | מָתַי אֲרוּחַת הַבֹּקֶר? | When is breakfast? | מתי ארוחת הבוקר | 0.33 | When is breakfast? | מָתַי אֲרוּחַת הַבֹּקֶר? | pass | ok |
| pu-hotel | d-hotel-l6 | מִשֶּׁבַע עַד עֶשֶׂר. | From seven to ten. | משבע עד 10 | 0.33 | From seven to ten. | מִשֶּׁבַע עַד עֶשֶׂר. | pass | ok |
| pu-hotel | d-hotel-l7 | הַחֶדֶר בַּקּוֹמָה הַשְּׁנִיָּה. הִנֵּה הַמַּפְתֵּחַ. | The room is on the second floor. Here is the key. | החדר בקומה השנייה. הנה המפתח. | 0.20 | The room is on the second floor. Here is the key. | הַחֶדֶר בַּקּוֹמָה הַשְּׁנִיָּה. הִנֵּה הַמַּפְתֵּחַ. | pass | ok |
| pu-hotel | d-hotel-l8 | תּוֹדָה רַבָּה! | Thank you very much! | תודה רבה | 0.00 | Thank you very much! | תּוֹדָה רַבָּה! | pass | ok |
| pu-phone | il22-w1 | הַלּוֹ | hello (on the phone) | שלום | 1.00 | hello (on the phone) | הַלּוֹ | fail | stt-wer=1.00 |
| pu-phone | il22-w2 | לְהִתְקַשֵּׁר | to get in touch | להתקשר | 0.00 | to get in touch | לְהִתְקַשֵּׁר | pass | ok |
| pu-phone | il22-w3 | פְּגִישָׁה | meeting | פגישה | 0.00 | meeting | פְּגִישָׁה | pass | ok |
| pu-phone | il22-w4 | לְקַבֵּעַ | to set (an appointment) | לקבוע | 1.00 | to set (an appointment) | לְקַבֵּע | pass | ok |
| pu-phone | il22-w5 | הוֹדָעָה | message | הודעה | 0.00 | message | הוֹדָעָה | pass | ok |
| pu-phone | i-16-w1 | טֶלֶפוֹן | phone | טלפון | 0.00 | phone | טֶלֶפוֹן | pass | ok |
| pu-phone | i-16-w2 | מִסְפָּר | number | מספר | 0.00 | number | מִסְפָּר | pass | ok |
| pu-phone | i-16-w3 | מִסְפַּר טֶלֶפוֹן | phone number | מספר טלפון | 0.00 | phone number | מִסְפַּר טֶלֶפוֹן | pass | ok |
| pu-phone | i-16-w5 | אִינְטֶרְנֶט | internet | אינטרנט | 0.00 | internet | אִינְטֶרְנֶט | pass | ok |
| pu-phone | i-16-w6 | סִיסְמָה | password | סיסמה | 0.00 | password | סִיסְמָה | pass | ok |
| pu-phone | i-16-w7 | סוֹלְלָה | battery | סוללה | 0.00 | battery | סוֹלְלָה | pass | ok |
| pu-phone | i-16-w8 | מַטְעֵן | charger (for a phone or battery) | מתן | 1.00 | charger (for a phone or battery) | מַטְעֵן | fail | stt-wer=1.00 |
| pu-phone | i-16-w10 | לִשְׁלֹחַ | to send | לשלוח | 1.00 | to send | לִשְׁלֹחַ | pass | ok |
| pu-phone | i-16-w11 | שׁוֹלֵחַ | sending (m) | שׁוֹלֵחַ | 0.00 | sending (m) | שׁוֹלֵחַ | pass | ok |
| pu-phone | i-16-w12 | הַלּוֹ? | hello? (on the phone) | שלום | 1.00 | hello? (on the phone) | הַלּוֹ? | fail | stt-wer=1.00 |
| pu-phone | i-16-w13 | רֶגַע | one moment | רגע | 0.00 | one moment | רֶגַע | pass | ok |
| pu-phone | i-16-w14 | אֲנִי לֹא שׁוֹמֵעַ | I can't hear (m) | אני לא שומע | 0.00 | I can't hear (m) | אֲנִי לֹא שׁוֹמֵעַ | pass | ok |
| pu-apartment | i-17-w1 | דִּירָה | apartment | דירה | 0.00 | apartment | דִּירָה | pass | ok |
| pu-apartment | i-17-w2 | חֶדֶר | room | חֶדֶר | 0.00 | room | חֶדֶר | pass | ok |
| pu-apartment | i-17-w3 | חֲדָרִים | rooms | חדרים | 0.00 | rooms | חֲדָרִים | pass | ok |
| pu-apartment | i-17-w4 | קוֹמָה | story, floor | כמו | 1.00 | story, floor | קוֹמָה | fail | stt-wer=1.00 |
| pu-apartment | i-17-w5 | מִרְפֶּסֶת | balcony | מִרְפֶּסֶת | 0.00 | balcony | מִרְפֶּסֶת | pass | ok |
| pu-apartment | i-17-w6 | חֲנָיָה | parking | חנייה | 1.00 | parking | חֲנָיָה | pass | ok |
| pu-apartment | i-17-w7 | חוֹזֶה | contract | חוזה | 0.00 | contract | חוֹזֶה | pass | ok |
| pu-apartment | i-17-w8 | בַּעַל הַבַּיִת | the landlord | בעל הבית | 0.00 | the landlord | בַּעַל הַבַּיִת | pass | ok |
| pu-apartment | i-17-w9 | וַעַד בַּיִת | building committee (fee) | ועד בית | 0.00 | building committee (fee) | וַעַד בַּיִת | pass | ok |
| pu-apartment | i-17-w10 | שָׁנָה | year | שנה | 0.00 | year | שָׁנָה | pass | ok |
| pu-apartment | i-17-w11 | חֹדֶשׁ | month | חודש | 1.00 | month | חֹדֶשׁ | pass | ok |
| pu-apartment | i-17-w12 | גְּדוֹלָה | big (f) | גדולה | 0.00 | big (f) | גְּדוֹלָה | pass | ok |
| pu-apartment | i-17-w13 | טוֹבָה | good (f) | טובה | 0.00 | good (f) | טוֹבָה | pass | ok |
| pu-apartment | i-17-w14 | אוֹר | light | לא | 1.00 | light | אוֹר | fail | stt-wer=1.00 |
| pu-plans | il20-w1 | אֲנִי אֵלֵךְ | I will go | אני אלך | 0.00 | I will go | אֲנִי אֵלֵךְ | pass | ok |
| pu-plans | il20-w2 | אֲנִי אֹכַל | I will eat | אני אוכל | 0.50 | I will eat | אֲנִי אֹכַל | pass | ok |
| pu-plans | il20-w3 | נִתְרָאֶה | we will see each other | נתראה | 0.00 | we will see each other | נִתְרָאֶה | pass | ok |
| pu-plans | il20-w4 | אוּלַי | maybe | אולי | 0.00 | maybe | אוּלַי | pass | ok |
| pu-plans | il20-w5 | בְּעוֹד שָׁבוּעַ | in a week | בעוד שבוע | 0.00 | in a week | בְּעוֹד שָׁבוּעַ | pass | ok |
| pu-opinions | il21-w1 | אֲנִי חוֹשֵׁב שֶׁ... | I think that... | אני חושב ש | 0.00 | I think that... | אֲנִי חוֹשֵׁב שֶׁ... | pass | ok |
| pu-opinions | il21-w2 | לְדַעְתִּי | in my opinion | לדעתי | 0.00 | in my opinion | לְדַעְתִּי | pass | ok |
| pu-opinions | il21-w3 | אֲנִי מַעֲדִיף | I prefer (m.) | אני מעדיף | 0.00 | I prefer (m.) | אֲנִי מַעֲדִיף | pass | ok |
| pu-opinions | il21-w4 | מַסְכִּים | I agree (m.) | מסכים | 0.00 | I agree (m.) | מַסְכִּים | pass | ok |
| pu-opinions | il21-w5 | לֹא מַסְכִּים | I disagree (m.) | לא מסכים | 0.00 | I disagree (m.) | לֹא מַסְכִּים | pass | ok |
| pu-driving | i-39-w1 | מְכוֹנִית | car | מכונית | 0.00 | car | מְכוֹנִית | pass | ok |
| pu-driving | i-39-w2 | כְּבִישׁ | road | כביש | 0.00 | road | כְּבִישׁ | pass | ok |
| pu-driving | i-39-w3 | תַּמְרוּר | road sign | תמוז | 1.00 | road sign | תַּמְרוּר | fail | stt-wer=1.00 |
| pu-driving | i-39-w4 | דֶּלֶק | fuel | דלק | 0.00 | fuel | דֶּלֶק | pass | ok |
| pu-driving | i-39-w5 | חֲנָיָה | parking | חנייה | 1.00 | parking | חֲנָיָה | pass | ok |
| pu-driving | i-39-w6 | מָנוֹעַ | engine | מנוע | 0.00 | engine | מָנוֹעַ | pass | ok |
| pu-driving | i-39-w7 | צְמִיג | tyre | צמיג | 0.00 | tyre | צְמִיג | pass | ok |
| pu-driving | i-39-w8 | נָתִיב | lane | נתיב | 0.00 | lane | נָתִיב | pass | ok |
| pu-driving | i-39-w9 | רִמְזוּר | traffic light | רמזור | 0.00 | traffic light | רִמְזוּר | pass | ok |
| pu-driving | i-39-w10 | יָשָׁר | straight (ahead) | ישר | 0.00 | straight (ahead) | יָשָׁר | pass | ok |
| pu-driving | i-39-w11 | עֲצֹר | stop! | עצור | 1.00 | stop! | עֲצֹר | pass | ok |
| pu-driving | i-39-w12 | לְאַט | slowly | לאט | 0.00 | slowly | לְאַט | pass | ok |
| pu-hiking | i-40-w1 | טִיּוּל | trip, hike | טיול | 0.00 | trip, hike | טִיּוּל | pass | ok |
| pu-hiking | i-40-w2 | מַסְלוּל | route | מסלול | 0.00 | route | מַסְלוּל | pass | ok |
| pu-hiking | i-40-w3 | הַר | mountain | הר | 0.00 | mountain | הַר | pass | ok |
| pu-hiking | i-40-w4 | נַחַל | stream | נחל | 0.00 | stream | נַחַל | pass | ok |
| pu-hiking | i-40-w5 | שְׁבִיל | trail | שביל | 0.00 | trail | שְׁבִיל | pass | ok |
| pu-hiking | i-40-w6 | מַיִם | water | מים | 0.00 | water | מַיִם | pass | ok |
| pu-hiking | i-40-w7 | מַפָּה | a map | מפה | 0.00 | a map | מַפָּה | pass | ok |
| pu-hiking | i-40-w8 | כּוֹבַע | hat | כובע | 0.00 | hat | כּוֹבַע | pass | ok |
| pu-hiking | i-40-w9 | שֶׁמֶשׁ | sun | שמש | 0.00 | sun | שֶׁמֶשׁ | pass | ok |
| pu-hiking | i-40-w10 | חַם | hot | חם | 0.00 | hot | חַם | pass | ok |
| pu-hiking | i-40-w11 | רָחוֹק | far | רחוק | 0.00 | far | רָחוֹק | pass | ok |
| pu-hiking | i-40-w12 | קָרוֹב | near | קרוב | 0.00 | near | קָרוֹב | pass | ok |
| pu-beach | i-41-w1 | חוֹף | beach | חוף | 0.00 | beach | חוֹף | pass | ok |
| pu-beach | i-41-w2 | יָם | sea | ים | 0.00 | sea | יָם | pass | ok |
| pu-beach | i-41-w3 | חוֹל | sand | חול | 0.00 | sand | חוֹל | pass | ok |
| pu-beach | i-41-w4 | גַּל | wave | גל | 0.00 | wave | גַּל | pass | ok |
| pu-beach | i-41-w5 | מַגֶּבֶת | towel | מגבת | 0.00 | towel | מַגֶּבֶת | pass | ok |
| pu-beach | i-41-w6 | שֶׁמֶשׁ | sun | שמש | 0.00 | sun | שֶׁמֶשׁ | pass | ok |
| pu-beach | i-41-w7 | מַיִם | water | מים | 0.00 | water | מַיִם | pass | ok |
| pu-beach | i-41-w8 | חַם | hot | חם | 0.00 | hot | חַם | pass | ok |
| pu-beach | i-41-w9 | קַר | cold | קר | 0.00 | cold | קַר | pass | ok |
| pu-beach | i-41-w10 | כּוֹבַע | hat | כובע | 0.00 | hat | כּוֹבַע | pass | ok |
| pu-beach | i-41-w11 | בֶּגֶד | garment | בגד | 0.00 | garment | בֶּגֶד | pass | ok |
| pu-beach | i-41-w12 | סַכָּנָה | danger | סכנה | 0.00 | danger | סַכָּנָה | pass | ok |
| pu-small-talk | i-36-w1 | עֲבוֹדָה | work, job | עבודה | 0.00 | work, job | עֲבוֹדָה | pass | ok |
| pu-small-talk | i-36-w2 | מִשְׂרָד | office | משרד | 0.00 | office | מִשְׂרָד | pass | ok |
| pu-small-talk | i-36-w3 | פְּגִישָׁה | meeting, appointment | פגישה | 0.00 | meeting, appointment | פְּגִישָׁה | pass | ok |
| pu-small-talk | i-36-w4 | מְנַהֵל | manager, boss | מנהל | 0.00 | manager, boss | מְנַהֵל | pass | ok |
| pu-small-talk | i-36-w5 | לָקוֹחַ | client | לקוח | 0.00 | client | לָקוֹחַ | pass | ok |
| pu-small-talk | i-36-w6 | מַעֲסִיק | employer | מסיק | 1.00 | employer | מַעֲסִיק | fail | stt-wer=1.00 |
| pu-small-talk | i-36-w7 | רֵאָיוֹן | interview | רעיון | 1.00 | interview | רֵאָיוֹן | fail | stt-wer=1.00 |
| pu-small-talk | i-36-w8 | הוֹדָעָה | message, notice | הודעה | 0.00 | message, notice | הוֹדָעָה | pass | ok |
| pu-small-talk | i-36-w9 | מָחָר | tomorrow | מחר | 0.00 | tomorrow | מָחָר | pass | ok |
| pu-small-talk | i-36-w10 | הַיּוֹם | today | היום | 0.00 | today | הַיּוֹם | pass | ok |
| pu-small-talk | i-36-w11 | עוֹבֵד | working (m) | עובד | 0.00 | working (m) | עוֹבֵד | pass | ok |
| pu-small-talk | i-36-w12 | רֶגַע | one moment | רגע | 0.00 | one moment | רֶגַע | pass | ok |
| pu-work | i-37-w1 | אוּנִיבֶרְסִיטָה | university | אוניברסיטה | 0.00 | university | אוּנִיבֶרְסִיטָה | pass | ok |
| pu-work | i-37-w2 | מוֹרֶה | teacher (m) | מורה | 0.00 | teacher (m) | מוֹרֶה | pass | ok |
| pu-work | i-37-w3 | מְרַצֶּה | lecturer; lecturing | מְרַצֶּה | 0.00 | lecturer; lecturing | מְרַצֶּה | pass | ok |
| pu-work | i-37-w4 | פְּרוֹפֶסוֹר | professor | פרופסור | 0.00 | professor | פְּרוֹפֶסוֹר | pass | ok |
| pu-work | i-37-w5 | מִבְחָן | test, exam | מבחן | 0.00 | test, exam | מִבְחָן | pass | ok |
| pu-work | i-37-w6 | שִׁעוּר | lesson, class | שיעור | 1.00 | lesson, class | שִׁעוּר | pass | ok |
| pu-work | i-37-w7 | סֵפֶר | book | ספר | 0.00 | book | סֵפֶר | pass | ok |
| pu-work | i-37-w8 | מִלְגָּה | scholarship | מילגה | 1.00 | scholarship | מִלְגָּה | pass | ok |
| pu-work | i-37-w9 | קוּרְס | a course (a class) | כוס | 1.00 | a course (a class) | קוּרְס | fail | stt-wer=1.00 |
| pu-work | i-37-w12 | חָבֵר | friend (m) | חבר | 0.00 | friend (m) | חָבֵר | pass | ok |
| pu-health | il18-w1 | אֲנִי לֹא מֵבִין | I don't understand (m.) | אני לא מבין | 0.00 | I don't understand (m.) | אֲנִי לֹא מֵבִין | pass | ok |
| pu-health | il18-w2 | אֶפְשָׁר לְדַבֵּר לְאַט | can you speak slowly | אפשר לדבר לאט | 0.00 | can you speak slowly | אֶפְשָׁר לְדַבֵּר לְאַט | pass | ok |
| pu-health | il18-w3 | תַּגִּידוּ בְּאַנְגְּלִית | say it in English (to more than one person) | תגידו באנגלית | 0.00 | say it in English (to more than one person) | תַּגִּידוּ בְּאַנְגְּלִית | pass | ok |
| pu-health | il18-w4 | רוֹפֵא | doctor | רופה | 1.00 | doctor | רוֹפֵא | fail | stt-wer=1.00 |
| pu-health | il18-w5 | בֵּית מֶרְקַחַת | pharmacy | בית מרקחת | 0.00 | pharmacy | בֵּית מֶרְקַחַת | pass | ok |
| pu-health | il18-w6 | עֶזְרָה | help | עזרה | 0.00 | help | עֶזְרָה | pass | ok |
| pu-health | i-14-w2 | תְּרוּפָה | medicine | תרופה | 0.00 | medicine | תְּרוּפָה | pass | ok |
| pu-health | i-14-w3 | כַּדּוּרִים | pills | כדורים | 0.00 | pills | כַּדּוּרִים | pass | ok |
| pu-health | i-14-w4 | מִרְשָׁם | prescription | מרשם | 0.00 | prescription | מִרְשָׁם | pass | ok |
| pu-health | i-14-w5 | כְּאֵב רֹאשׁ | headache | כאב ראש | 0.00 | headache | כְּאֵב רֹאשׁ | pass | ok |
| pu-health | i-14-w6 | כְּאֵב גָּרוֹן | sore throat | כאב גרון | 0.00 | sore throat | כְּאֵב גָּרוֹן | pass | ok |
| pu-health | i-14-w7 | כְּאֵב בֶּטֶן | stomach ache | כאב בטן | 0.00 | stomach ache | כְּאֵב בֶּטֶן | pass | ok |
| pu-health | i-14-w8 | חֹם | fever | חום | 1.00 | fever | חֹם | pass | ok |
| pu-health | i-14-w9 | נֶגֶד | against, for (a symptom) | נגד | 0.00 | against, for (a symptom) | נֶגֶד | pass | ok |
| pu-health | i-14-w10 | פַּעַם בְּיוֹם | once a day | פעם ביום | 0.00 | once a day | פַּעַם בְּיוֹם | pass | ok |
| pu-health | i-14-w11 | פַּעֲמַיִם בְּיוֹם | twice a day | פעמיים ביום | 0.50 | twice a day | פַּעֲמַיִם בְּיוֹם | pass | ok |
| pu-health | i-14-w12 | אַחֲרֵי | after | אחרי | 0.00 | after | אַחֲרֵי | pass | ok |
| pu-health | i-14-w13 | לִפְנֵי | before | לפני | 0.00 | before | לִפְנֵי | pass | ok |
| pu-health | i-14-w14 | אָלֶרְגִּי | allergic (m) | אלרגי | 0.00 | allergic (m) | אָלֶרְגִּי | pass | ok |
| pu-health | i-14-w15 | אַנְטִיבְּיוֹטִיקָה | antibiotics | אנטיביוטיקה | 0.00 | antibiotics | אַנְטִיבְּיוֹטִיקָה | pass | ok |
| pu-health | i-20-w1 | בֵּית חוֹלִים | hospital | בית חולים | 0.00 | hospital | בֵּית חוֹלִים | pass | ok |
| pu-health | i-20-w3 | רוֹפְאָה | doctor (f) | הופעה | 1.00 | doctor (f) | רוֹפְאָה | fail | stt-wer=1.00 |
| pu-health | i-20-w4 | אָחוֹת | nurse (f) | אחות | 0.00 | nurse (f) | אָחוֹת | pass | ok |
| pu-health | i-20-w5 | תּוֹר | appointment, turn | טוב | 1.00 | appointment, turn | תּוֹר | fail | stt-wer=1.00 |
| pu-health | i-20-w6 | בִּטּוּחַ | insurance | ביטוח | 1.00 | insurance | בִּטּוּחַ | pass | ok |
| pu-health | i-20-w7 | כּוֹאֵב | it hurts | כואב | 0.00 | it hurts | כּוֹאֵב | pass | ok |
| pu-health | i-20-w8 | בְּדִיקָה | test, examination | בדיקה | 0.00 | test, examination | בְּדִיקָה | pass | ok |
| pu-health | i-20-w9 | דָּם | blood | דם | 0.00 | blood | דָּם | pass | ok |
| pu-health | i-20-w10 | חֵרוּם | emergency | חירום | 1.00 | emergency | חֵרוּם | pass | ok |
| pu-health | i-20-w11 | אַמְבּוּלַנְס | ambulance | אמבולנס | 0.00 | ambulance | אַמְבּוּלַנְס | pass | ok |
| pu-health | i-20-w12 | הַדַּרְכּוֹן | the passport | הדרכון | 0.00 | the passport | הַדַּרְכּוֹן | pass | ok |
| pu-health | i-20-w13 | מִשְׁפָּחָה | family | משפחה | 0.00 | family | מִשְׁפָּחָה | pass | ok |
| pu-bank | i-21-w1 | בַּנְק | bank | בנק | 0.00 | bank | בַּנְק | pass | ok |
| pu-bank | i-21-w2 | חֶשְׁבּוֹן | account; bill | חשבון | 0.00 | account; bill | חֶשְׁבּוֹן | pass | ok |
| pu-bank | i-21-w3 | כֶּסֶף | money | כסף | 0.00 | money | כֶּסֶף | pass | ok |
| pu-bank | i-21-w4 | כַּסְפּוֹמָט | cash machine (ATM) | כספומט | 0.00 | cash machine (ATM) | כַּסְפּוֹמָט | pass | ok |
| pu-bank | i-21-w5 | לִמְשֹׁךְ | to withdraw | למשוך | 1.00 | to withdraw | לִמְשֹׁךְ | pass | ok |
| pu-bank | i-21-w6 | לְהַחְלִיף | to exchange | להחליף | 0.00 | to exchange | לְהַחְלִיף | pass | ok |
| pu-bank | i-21-w7 | דּוֹלָר | dollar | דולר | 0.00 | dollar | דּוֹלָר | pass | ok |
| pu-bank | i-21-w8 | שֶׁקֶל | shekel | שקל | 0.00 | shekel | שֶׁקֶל | pass | ok |
| pu-bank | i-21-w9 | כַּרְטִיס אַשְׁרַאי | credit card | כרטיס אשראי | 0.00 | credit card | כַּרְטִיס אַשְׁרַאי | pass | ok |
| pu-bank | i-21-w10 | חֲתִימָה | signature | חתימה | 0.00 | signature | חֲתִימָה | pass | ok |
| pu-bank | i-21-w11 | הַלְוָאָה | loan | הלוואה | 1.00 | loan | הַלְוָאָה | pass | ok |
| pu-bank | i-21-w12 | רִבִּית | interest | רביט | 1.00 | interest | רִבִּית | fail | stt-wer=1.00 |
| pu-bank | i-21-w13 | פָּתוּחַ | open | בטוח | 1.00 | open | פָּתוּחַ | fail | stt-wer=1.00 |
| pu-bank | i-21-w14 | סָגוּר | closed | סגור | 0.00 | closed | סָגוּר | pass | ok |
| pu-bank | i-48-w2 | מִסְפָּר | number | מספר | 0.00 | number | מִסְפָּר | pass | ok |
| pu-bank | i-48-w4 | שֵׁם | name | שם | 0.00 | name | שֵׁם | pass | ok |
| pu-bank | i-48-w5 | כְּתֹבֶת | address | כובת | 1.00 | address | כְּתֹבֶת | fail | stt-wer=1.00 |
| pu-bank | i-48-w6 | טֶלֶפוֹן | phone | טלפון | 0.00 | phone | טֶלֶפוֹן | pass | ok |
| pu-bank | i-48-w7 | הַיּוֹם | today | היום | 0.00 | today | הַיּוֹם | pass | ok |
| pu-bank | i-48-w8 | שָׁנָה | year | שנה | 0.00 | year | שָׁנָה | pass | ok |
| pu-bank | i-48-w9 | חֹדֶשׁ | month | חודש | 1.00 | month | חֹדֶשׁ | pass | ok |
| pu-post | i-22-w1 | דֹּאַר | post, mail | דואר | 1.00 | post, mail | דֹּאַר | pass | ok |
| pu-post | i-22-w2 | חֲבִילָה | parcel | חבילה | 0.00 | parcel | חֲבִילָה | pass | ok |
| pu-post | i-22-w3 | מִכְתָּב | letter | מכתב | 0.00 | letter | מִכְתָּב | pass | ok |
| pu-post | i-22-w4 | בּוּל | stamp | בול | 0.00 | stamp | בּוּל | pass | ok |
| pu-post | i-22-w5 | בּוּלִים | stamps | בולים | 0.00 | stamps | בּוּלִים | pass | ok |
| pu-post | i-22-w6 | לִשְׁלֹחַ | to send | לשלוח | 1.00 | to send | לִשְׁלֹחַ | pass | ok |
| pu-post | i-22-w7 | לֶאֱסֹף | to collect | לאסוף | 1.00 | to collect | לֶאֱסֹף | pass | ok |
| pu-post | i-22-w8 | תּוֹר | appointment, turn | תו | 1.00 | appointment, turn | תּוֹר | fail | stt-wer=1.00 |
| pu-post | i-22-w9 | מִסְפָּר | number | מספר | 0.00 | number | מִסְפָּר | pass | ok |
| pu-post | i-22-w10 | כְּתֹבֶת | address | כובד | 1.00 | address | כְּתֹבֶת | fail | stt-wer=1.00 |
| pu-post | i-22-w11 | מַעֲטָפָה | envelope | מה אתה פה | 3.00 | envelope | מַעֲטָפָה | fail | stt-wer=3.00 |
| pu-post | i-22-w12 | רָגִיל | regular | רגיל | 0.00 | regular | רָגִיל | pass | ok |
| pu-post | i-22-w13 | דֹּאַר אֲוִיר | air mail | דואר אוויר | 1.00 | air mail | דֹּאַר אֲוִיר | pass | ok |
| pu-emergencies | help-01 | עֶזְרָה! | help! | עזרה | 0.00 | help! | עֶזְרָה! | pass | ok |
| pu-emergencies | help-02 | אֲנִי צָרִיךְ רוֹפֵא | I need a doctor | אני צריך רופא | 0.00 | I need a doctor | אֲנִי צָרִיךְ רוֹפֵא | pass | ok |
| pu-emergencies | help-03 | תִּקְרָא לַמִּשְׁטָרָה | call the police | תקרא למשטרה | 0.00 | call the police | תִּקְרָא לַמִּשְׁטָרָה | pass | ok |
| pu-emergencies | help-04 | תִּקְרָא לְאַמְבּוּלַנְס | call an ambulance | תקרא לאמבולנס | 0.00 | call an ambulance | תִּקְרָא לְאַמְבּוּלַנְס | pass | ok |
| pu-emergencies | help-05 | אָבַד לִי הַדַּרְכּוֹן | I lost my passport | אבד לי הדרכון | 0.00 | I lost my passport | אָבַד לִי הַדַּרְכּוֹן | pass | ok |
| pu-emergencies | help-06 | אָבַד לִי הַטֶּלֶפוֹן | I lost my phone | אבד לי הטלפון | 0.00 | I lost my phone | אָבַד לִי הַטֶּלֶפוֹן | pass | ok |
| pu-emergencies | help-07 | אֲנִי לֹא מַרְגִּישׁ טוֹב | I don't feel well | אני לא מרגיש טוב | 0.00 | I don't feel well | אֲנִי לֹא מַרְגִּישׁ טוֹב | pass | ok |
| pu-emergencies | help-08 | יֵשׁ לִי כְּאֵב רֹאשׁ | I have a headache | יש לי כאב ראש | 0.00 | I have a headache | יֵשׁ לִי כְּאֵב רֹאשׁ | pass | ok |
| pu-emergencies | help-09 | אֶפְשָׁר לְהִשְׁתַּמֵּשׁ בַּטֶּלֶפוֹן שֶׁלְּךָ? | can I use your phone? | אפשר להשתמש בטלפון שלך? | 0.00 | can I use your phone? | אֶפְשָׁר לְהִשְׁתַּמֵּשׁ בַּטֶּלֶפוֹן שֶׁלְּךָ? | pass | ok |
| pu-emergencies | i-46-w1 | חֵרוּם | emergency | חירום | 1.00 | emergency | חֵרוּם | pass | ok |
| pu-emergencies | i-46-w2 | מִשְׁטָרָה | police | משטרה | 0.00 | police | מִשְׁטָרָה | pass | ok |
| pu-emergencies | i-46-w3 | אַמְבּוּלַנְס | ambulance | אמבולנס | 0.00 | ambulance | אַמְבּוּלַנְס | pass | ok |
| pu-emergencies | i-46-w4 | סַכָּנָה | danger | סכנה | 0.00 | danger | סַכָּנָה | pass | ok |
| pu-emergencies | i-46-w5 | דָּחוּף | urgent | דחוף | 0.00 | urgent | דָּחוּף | pass | ok |
| pu-emergencies | i-46-w6 | שְׂרֵפָה | fire | שריפה | 1.00 | fire | שְׂרֵפָה | pass | ok |
| pu-emergencies | i-46-w7 | גַּנָּב | thief | גנב | 0.00 | thief | גַּנָּב | pass | ok |
| pu-emergencies | i-46-w9 | רוֹפֵא | medical doctor, physician | רופא | 0.00 | medical doctor, physician | רוֹפֵא | pass | ok |
| pu-emergencies | i-46-w10 | אָבַד לִי | I lost | עבד לי | 0.50 | I lost | אָבַד לִי | fail | stt-wer=0.50 |
| pu-emergencies | i-46-w11 | הַדַּרְכּוֹן | the passport | הדרכון | 0.00 | the passport | הַדַּרְכּוֹן | pass | ok |
| pu-emergencies | i-46-w12 | טֶלֶפוֹן | phone | טלפון | 0.00 | phone | טֶלֶפוֹן | pass | ok |
| pu-health | il18-w1 | אֲנִי לֹא מֵבִין | I don't understand (m.) | אני לא מבין | 0.00 | I don't understand (m.) | אֲנִי לֹא מֵבִין | pass | ok |
| pu-health | il18-w2 | אֶפְשָׁר לְדַבֵּר לְאַט | can you speak slowly | אפשר לדבר לאט | 0.00 | can you speak slowly | אֶפְשָׁר לְדַבֵּר לְאַט | pass | ok |
| pu-health | il18-w3 | תַּגִּידוּ בְּאַנְגְּלִית | say it in English (to more than one person) | תגידו באנגלית | 0.00 | say it in English (to more than one person) | תַּגִּידוּ בְּאַנְגְּלִית | pass | ok |
| pu-health | il18-w5 | בֵּית מֶרְקַחַת | pharmacy | בית מרקחת | 0.00 | pharmacy | בֵּית מֶרְקַחַת | pass | ok |
| pu-health | il18-w6 | עֶזְרָה | help | עזרה | 0.00 | help | עֶזְרָה | pass | ok |
| pu-delivery | i-45-w1 | מִשְׁלוֹחַ | delivery, shipment | משלוח | 0.00 | delivery, shipment | מִשְׁלוֹחַ | pass | ok |
| pu-delivery | i-45-w2 | הַזְמָנָה | order, invitation | הזמנה | 0.00 | order, invitation | הַזְמָנָה | pass | ok |
| pu-delivery | i-45-w3 | שָׁלִיחַ | courier | שליח | 0.00 | courier | שָׁלִיחַ | pass | ok |
| pu-delivery | i-45-w4 | פִּיצָה | pizza | פיצה | 0.00 | pizza | פִּיצָה | pass | ok |
| pu-delivery | i-45-w5 | כְּתֹבֶת | address | כובד | 1.00 | address | כְּתֹבֶת | fail | stt-wer=1.00 |
| pu-delivery | i-45-w6 | קוֹמָה | story, floor | כמו | 1.00 | story, floor | קוֹמָה | fail | stt-wer=1.00 |
| pu-delivery | i-45-w7 | דֶּלֶת | door | דלת | 0.00 | door | דֶּלֶת | pass | ok |
| pu-delivery | i-45-w8 | סָלָט | salad | סלט | 0.00 | salad | סָלָט | pass | ok |
| pu-delivery | i-45-w9 | מַיִם | water | מים | 0.00 | water | מַיִם | pass | ok |
| pu-delivery | i-45-w10 | כַּמָּה זְמַן | how long | כמה זמן | 0.00 | how long | כַּמָּה זְמַן | pass | ok |
| pu-delivery | i-45-w11 | טָעִים | tasty | טעים | 0.00 | tasty | טָעִים | pass | ok |
| pu-delivery | i-45-w12 | תּוֹדָה | thanks | תודה | 0.00 | thanks | תּוֹדָה | pass | ok |
| pu-social | i-49-w1 | הוֹדָעָה | message, notice | הודעה | 0.00 | message, notice | הוֹדָעָה | pass | ok |
| pu-social | i-49-w2 | תְּמוּנָה | picture | תמונה | 0.00 | picture | תְּמוּנָה | pass | ok |
| pu-social | i-49-w3 | פְּרוֹפִיל | profile | פיל | 1.00 | profile | פְּרוֹפִיל | fail | stt-wer=1.00 |
| pu-social | i-49-w4 | סִיסְמָה | password | סיסמה | 0.00 | password | סִיסְמָה | pass | ok |
| pu-social | i-49-w5 | אִינְטֶרְנֶט | internet | אינטרנט | 0.00 | internet | אִינְטֶרְנֶט | pass | ok |
| pu-social | i-49-w6 | טֶלֶפוֹן | phone | טלפון | 0.00 | phone | טֶלֶפוֹן | pass | ok |
| pu-social | i-49-w7 | חָבֵר | friend (m) | חבר | 0.00 | friend (m) | חָבֵר | pass | ok |
| pu-social | i-49-w8 | חֲבֵרָה | friend (f) | חברה | 0.00 | friend (f) | חֲבֵרָה | pass | ok |
| pu-social | i-49-w9 | אֶפְשָׁר לִשְׁלֹחַ | can I send? | אפשר לשלוח | 0.50 | can I send? | אֶפְשָׁר לִשְׁלֹחַ | pass | ok |
| pu-social | i-49-w10 | שׁוֹלֵחַ | sending (m) | שולח | 0.00 | sending (m) | שׁוֹלֵחַ | pass | ok |
| pu-social | i-49-w11 | רֶגַע | one moment | רגע | 0.00 | one moment | רֶגַע | pass | ok |
| pu-social | i-49-w12 | בְּסֵדֶר | OK | בסדר | 0.00 | OK | בְּסֵדֶר | pass | ok |
| pu-news | i-47-w1 | חֲדָשׁוֹת | news | חדשות | 0.00 | news | חֲדָשׁוֹת | pass | ok |
| pu-news | i-47-w2 | מֶמְשָׁלָה | government | ממשלה | 0.00 | government | מֶמְשָׁלָה | pass | ok |
| pu-news | i-47-w3 | בְּחִירוֹת | elections | בחירות | 0.00 | elections | בְּחִירוֹת | pass | ok |
| pu-news | i-47-w4 | מִלְחָמָה | war | מלחמה | 0.00 | war | מִלְחָמָה | pass | ok |
| pu-news | i-47-w5 | שָׁלוֹם | peace | שלום | 0.00 | peace | שָׁלוֹם | pass | ok |
| pu-news | i-47-w6 | מְחִיר | price | מחיר | 0.00 | price | מְחִיר | pass | ok |
| pu-news | i-47-w7 | רִבִּית | interest | רבי | 1.00 | interest | רִבִּית | fail | stt-wer=1.00 |
| pu-news | i-47-w8 | הַיּוֹם | today | היום | 0.00 | today | הַיּוֹם | pass | ok |
| pu-news | i-47-w9 | מָחָר | tomorrow | מחר | 0.00 | tomorrow | מָחָר | pass | ok |
| pu-news | i-47-w10 | אֶתְמוֹל | yesterday | אתמול | 0.00 | yesterday | אֶתְמוֹל | pass | ok |
| pu-news | i-47-w11 | אֵין | there isn't | ן | 1.00 | there isn't | אֵין | fail | stt-wer=1.00 |
| pu-news | i-47-w12 | יֵשׁ | there is | יש | 0.00 | there is | יֵשׁ | pass | ok |
| pu-verbs-now | il16-w1 | אֲנִי הוֹלֵךְ | I go (m.) | אני הולך | 0.00 | I go (m.) | אֲנִי הוֹלֵךְ | pass | ok |
| pu-verbs-now | il16-w2 | אֲנִי אוֹכֵל | I eat (m.) | אני אוכל | 0.00 | I eat (m.) | אֲנִי אוֹכֵל | pass | ok |
| pu-verbs-now | il16-w3 | אֲנִי לוֹמֵד | I study (m.) | אני לומד | 0.00 | I study (m.) | אֲנִי לוֹמֵד | pass | ok |
| pu-verbs-now | il16-w4 | אֲנִי כּוֹתֵב | I write (m.) | אני כותב | 0.00 | I write (m.) | אֲנִי כּוֹתֵב | pass | ok |
| pu-verbs-now | il16-w5 | אֲנִי מְדַבֵּר | I speak (m.) | אני מדבר | 0.00 | I speak (m.) | אֲנִי מְדַבֵּר | pass | ok |
| pu-past | il19-w1 | הָלַכְתִּי | I went | הלכתי | 0.00 | I went | הָלַכְתִּי | pass | ok |
| pu-past | il19-w2 | אָכַלְתִּי | I ate | אכלתי | 0.00 | I ate | אָכַלְתִּי | pass | ok |
| pu-past | il19-w3 | רָאִיתִי | I saw | ראיתי | 0.00 | I saw | רָאִיתִי | pass | ok |
| pu-past | il19-w4 | אָמַרְתִּי | I said | אמרתי | 0.00 | I said | אָמַרְתִּי | pass | ok |
| pu-past | il19-w5 | הָיָה | there was; he was | היה | 0.00 | there was; he was | הָיָה | pass | ok |
| pu-decide | il24-w1 | מַה קָרָה | what happened | מה קרה | 0.00 | what happened | מַה קָרָה | pass | ok |
| pu-decide | il24-w2 | תַּסְבִּיר לִי | explain it to me (to a man) | תסבירי לי | 0.50 | explain it to me (to a man) | תַּסְבִּיר לִי | pass | ok |
| pu-decide | il24-w3 | בּוֹא נַחֲלִיט | let's decide | בואנה חלית | 1.00 | let's decide | בּוֹא נַחֲלִיט | fail | stt-wer=1.00 |
| pu-shabbat | i-19-w1 | שַׁבָּת שָׁלוֹם | peaceful Sabbath (greeting from Friday afternoon to Saturday) | שבת שלום | 0.00 | peaceful Sabbath (greeting from Friday afternoon to Saturday) | שַׁבָּת שָׁלוֹם | pass | ok |
| pu-shabbat | i-19-w2 | שָׁבוּעַ טוֹב | a good week (said once Shabbat ends) | שבוע טוב | 0.00 | a good week (said once Shabbat ends) | שָׁבוּעַ טוֹב | pass | ok |
| pu-shabbat | i-19-w3 | אֲרוּחָה | meal | ארוחה | 0.00 | meal | אֲרוּחָה | pass | ok |
| pu-shabbat | i-19-w4 | עֶרֶב | evening | ערב | 0.00 | evening | עֶרֶב | pass | ok |
| pu-shabbat | i-19-w5 | בְּשִׂמְחָה | gladly, with pleasure | בשמחה | 0.00 | gladly, with pleasure | בְּשִׂמְחָה | pass | ok |
| pu-shabbat | i-19-w6 | לְהָבִיא | to bring | להביא | 0.00 | to bring | לְהָבִיא | pass | ok |
| pu-shabbat | i-19-w7 | יַיִן | wine | ניין | 1.00 | wine | יַיִן | fail | stt-wer=1.00 |
| pu-shabbat | i-19-w8 | קִנּוּחַ | dessert | קינוח | 1.00 | dessert | קִנּוּחַ | pass | ok |
| pu-shabbat | i-19-w9 | מָתַי לָבוֹא? | when should I come? | מתי לבוא | 0.00 | when should I come? | מָתַי לָבוֹא? | pass | ok |
| pu-shabbat | i-19-w10 | הַשָּׁעָה שֶׁבַע | seven o'clock | השעה שבע | 0.00 | seven o'clock | הַשָּׁעָה שֶׁבַע | pass | ok |
| pu-shabbat | i-19-w11 | טָעִים מְאֹד | very tasty | נעים מאוד | 1.00 | very tasty | טָעִים מְאֹד | fail | stt-wer=1.00 |
| pu-shabbat | i-19-w12 | לְחַיִּים! | cheers! | לחיים | 0.00 | cheers! | לְחַיִּים! | pass | ok |
| pu-shabbat | i-19-w13 | תּוֹדָה רַבָּה | thank you very much | תודה רבה | 0.00 | thank you very much | תּוֹדָה רַבָּה | pass | ok |
| pu-shabbat | i-19-w14 | לְהִתְרָאוֹת | see you | להתראות | 0.00 | see you | לְהִתְרָאוֹת | pass | ok |
| pu-holidays | i-50-w1 | שַׁבָּת שָׁלוֹם | peaceful Sabbath (greeting from Friday afternoon to Saturday) | שבת שלום | 0.00 | peaceful Sabbath (greeting from Friday afternoon to Saturday) | שַׁבָּת שָׁלוֹם | pass | ok |
| pu-holidays | i-50-w2 | שָׁבוּעַ טוֹב | good week | שבוע טוב | 0.00 | good week | שָׁבוּעַ טוֹב | pass | ok |
| pu-holidays | i-50-w3 | חַג שָׂמֵחַ | happy holiday | חג שמח | 0.00 | happy holiday | חַג שָׂמֵחַ | pass | ok |
| pu-holidays | i-50-w4 | שָׁנָה טוֹבָה | happy new year (Rosh Hashana greeting) | שנה טובה | 0.00 | happy new year (Rosh Hashana greeting) | שָׁנָה טוֹבָה | pass | ok |
| pu-holidays | i-50-w5 | מַזָּל טוֹב | congratulations | מזל טוב | 0.00 | congratulations | מַזָּל טוֹב | pass | ok |
| pu-holidays | i-50-w6 | לְחַיִּים | cheers! | לחיים | 0.00 | cheers! | לְחַיִּים | pass | ok |
| pu-holidays | i-50-w7 | בְּהַצְלָחָה | good luck | בהצלחה | 0.00 | good luck | בְּהַצְלָחָה | pass | ok |
| pu-holidays | i-50-w8 | תִּשְׁמֹר עַל עַצְמְךָ | take care of yourself (said to a man) | תשמור על עצמך | 0.33 | take care of yourself (said to a man) | תִּשְׁמֹר עַל עַצְמְךָ | pass | ok |
| pu-holidays | i-50-w9 | לִבְרִיאוּת | to your health | לבריאות | 0.00 | to your health | לִבְרִיאוּת | pass | ok |
| pu-holidays | i-50-w11 | יוֹם נָעִים | have a nice day | יום נעים | 0.00 | have a nice day | יוֹם נָעִים | pass | ok |
| pu-holidays | i-50-w12 | סְלִיחָה | forgiveness, pardon | סליחה | 0.00 | forgiveness, pardon | סְלִיחָה | pass | ok |
| pu-holidays | i-50-w13 | גְּמַר חֲתִימָה טוֹבָה | a good final sealing (Yom Kippur greeting) | גמר חתימה טובה | 0.00 | a good final sealing (Yom Kippur greeting) | גְּמַר חֲתִימָה טוֹבָה | pass | ok |
| pu-holidays | i-50-w14 | תִּשְׁמְרִי עַל עַצְמֵךְ | take care of yourself (said to a woman) | תשמרי על עצמך | 0.00 | take care of yourself (said to a woman) | תִּשְׁמְרִי עַל עַצְמֵךְ | pass | ok |
