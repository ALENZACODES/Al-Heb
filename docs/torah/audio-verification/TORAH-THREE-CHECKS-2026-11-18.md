# Hebrew Torah Verses: Three Checks (18 Nov 2026)

Every Hebrew Torah verse clip the app plays (both voices), heard by machines: **words** (ivrit-ai Whisper hears every word of the verse), **sounds** (renikud/whisper-he-ipa hears every word's sounds, 0.6 or better), **pace** (speech within 12% of 4.6 syllables a second). These are the steady-pace clips of 17 Nov, plus Genesis 1 re-recorded with pauses. No person has listened.

**Partial:** 8,283 of the 11,692 clips (17 of 24 slices). Slices 5, 14 and 16 were still running at 11:52 UTC; slices 20-23 were checked on Kaggle GPUs (1,948 clips: all three right 1,202, words 1,268, sounds 1,846, pace 1,935, before the Name re-check) and are being re-checked on GitHub for this list.

| | clips | share |
|---|---|---|
| checked | 8283 | |
| **all three right** | **5174** | **62.5%** |
| words right | 5370 | 64.8% |
| sounds right | 7860 | 94.9% |
| pace right | 8237 | 99.4% |
| fail sounds or pace (likely a real fault) | 467 | 5.6% |
| fail words only (often the recognizer's spelling) | 2642 | 31.9% |

The Name: in 123 clips the only weak sound was the Name; the phoneme model heard "adonai" in 108 of them, so those count as right.

| book | clips | all three right |
|---|---|---|
| deuteronomy | 1356 | 834 (61.5%) |
| exodus | 1713 | 1122 (65.5%) |
| genesis | 2171 | 1301 (59.9%) |
| leviticus | 1218 | 780 (64.0%) |
| numbers | 1825 | 1137 (62.3%) |

## Fail sounds or pace (likely real)

| verse | voice | sounds | pace | weak sounds | words the recognizer missed |
|---|---|---|---|---|---|
| deuteronomy-1-12 | Noa (f) | ✗ | ✓ 4.59 | אֵיכָה | טָרְחֲכֶם |
| deuteronomy-1-16 | Noa (f) | ✗ | ✓ 4.25 | הַהִוא | הַהִוא |
| deuteronomy-11-25 | Noa (f) | ✗ | ✓ 4.27 | אֲדֹנָי, בָהּ |  |
| deuteronomy-15-10 | Noa (f) | ✗ | ✓ 4.63 | אֲדֹנָי | לְבָבְךָ, בְּתִתְּךָ |
| deuteronomy-15-4 | Noa (f) | ✗ | ✓ 4.66 | יְבָרֶכְךָ, אֲדֹנָי |  |
| deuteronomy-17-14 | Noa (f) | ✗ | ✓ 5.01 | כְּכָל |  |
| deuteronomy-17-8 | Noa (f) | ✗ | ✓ 4.61 | כִּי |  |
| deuteronomy-18-16 | Noa (f) | ✗ | ✓ 4.6 | עוֹד |  |
| deuteronomy-19-6 | Noa (f) | ✗ | ✓ 4.6 | הוּא | וְהִכָּהוּ, הוּא |
| deuteronomy-2-18 | Noa (f) | ✓ | ✗ 3.94 |  |  |
| deuteronomy-2-20 | Noa (f) | ✗ | ✓ 4.67 | אַף, בָהּ |  |
| deuteronomy-2-34 | Noa (f) | ✗ | ✓ 4.35 | הַהִוא | כָּל, עָרָיו, הַהִוא, כָּל, שָׂרִיד |
| deuteronomy-2-4 | Noa (f) | ✗ | ✓ 4.6 | עֵשָׂו | צַו, עֵשָׂו |
| deuteronomy-2-8 | Noa (f) | ✗ | ✓ 4.75 | גָּבֶר | וַנַּעֲבֹר, בְנֵי עֵשָׂו, בְּשֵׂעִיר, גָּבֶר, וַנַּעֲבֹר, מִדְבַּר |
| deuteronomy-20-20 | Noa (f) | ✗ | ✓ 4.31 | הִוא | וְכָרָתָּ |
| deuteronomy-20-5 | Noa (f) | ✗ | ✓ 4.59 | בַיִת |  |
| deuteronomy-21-1 | Noa (f) | ✗ | ✓ 4.59 | מִי |  |
| deuteronomy-21-11 | Noa (f) | ✗ | ✓ 4.41 | בָהּ |  |
| deuteronomy-21-4 | Noa (f) | ✗ | ✓ 4.33 | הַהִוא | הַהִוא |
| deuteronomy-21-5 | Noa (f) | ✗ | ✓ 4.6 | כִּי | וְנִגְּשׁוּ, בָם, וְכָל |
| deuteronomy-22-13 | Noa (f) | ✗ | ✓ 4.61 | כִּי | כִּי יִקַּח אִישׁ אִשָּׁה וּבָא אֵלֶיהָ וּשְׂנֵאָהּ |
| deuteronomy-23-12 | Noa (f) | ✗ | ✓ 4.63 | אֶל |  |
| deuteronomy-23-14 | Noa (f) | ✗ | ✓ 4.58 | בָהּ |  |
| deuteronomy-23-23 | Noa (f) | ✓ | ✗ 3.87 |  |  |
| deuteronomy-25-16 | Noa (f) | ✗ | ✓ 4.59 | אֵלֶּה | אֵלֶּה כֹּל |
| deuteronomy-25-4 | Noa (f) | ✓ | ✗ 4.02 |  |  |
| deuteronomy-26-1 | Noa (f) | ✗ | ✓ 4.87 | בָּהּ |  |
| deuteronomy-29-22 | Noa (f) | ✗ | ✓ 4.67 | בָהּ | וָמֶלַח, בָהּ כָּל, כְּמַהְפֵּכַת, וַעֲמֹרָה אַדְמָה וּצְבוֹיִם |
| deuteronomy-3-12 | Noa (f) | ✗ | ✓ 4.48 | הַהִוא | הַהִוא, מֵעֲרֹעֵר, וְעָרָיו |
| deuteronomy-30-12 | Noa (f) | ✗ | ✓ 4.59 | הִוא | הִוא |
| deuteronomy-32-44 | Noa (f) | ✗ | ✓ 4.19 | נוּן | כָּל |
| deuteronomy-32-48 | Noa (f) | ✗ | ✓ 4.59 | לֵאמֹר |  |
| deuteronomy-32-5 | Noa (f) | ✓ | ✗ 3.8 |  |  |
| deuteronomy-33-11 | Noa (f) | ✗ | ✓ 4.43 | אֲדֹנָי |  |
| deuteronomy-33-22 | Noa (f) | ✓ | ✗ 3.91 |  |  |
| deuteronomy-34-2 | Noa (f) | ✗ | ✓ 4.61 | אֶפְרַיִם |  |
| deuteronomy-34-3 | Noa (f) | ✗ | ✓ 4.58 | עַד | צֹעַר |
| deuteronomy-4-32 | Noa (f) | ✗ | ✓ 4.59 | אוֹ | כִּי שְׁאַל |
| deuteronomy-4-33 | Noa (f) | ✗ | ✓ 4.36 | וַיֶּחִי | וַיֶּחִי |
| deuteronomy-4-6 | Noa (f) | ✗ | ✓ 4.29 | הִוא | הִוא, כָּל |
| deuteronomy-7-1 | Noa (f) | ✗ | ✓ 4.51 | בָא |  |
| deuteronomy-7-16 | Noa (f) | ✗ | ✓ 4.59 | הוּא | כָּל |
| deuteronomy-8-6 | Noa (f) | ✗ | ✓ 4.62 | אֶת | וּלְיִרְאָה |
| exodus-10-20 | Noa (f) | ✗ | ✓ 4.59 | יִשְׂרָאֵל |  |
| exodus-10-21 | Noa (f) | ✗ | ✓ 4.59 | אֲדֹנָי |  |
| exodus-10-29 | Noa (f) | ✗ | ✓ 4.64 | וַיֹּאמֶר |  |
| exodus-11-8 | Noa (f) | ✗ | ✓ 4.64 | אָף | אַתָּה וְכָל |
| exodus-12-8 | Noa (f) | ✗ | ✓ 4.45 | יֹאכְלֻהוּ |  |
| exodus-13-3 | Noa (f) | ✗ | ✓ 4.3 | אֲדֹנָי |  |
| exodus-17-16 | Noa (f) | ✗ | ✓ 4.62 | יָהּ | יָהּ, מִלְחָמָה |
| exodus-18-20 | Noa (f) | ✗ | ✓ 4.56 | בָהּ |  |
| exodus-18-26 | Noa (f) | ✗ | ✓ 4.72 | עֵת | בְּכָל עֵת |
| exodus-18-9 | Noa (f) | ✗ | ✓ 4.42 | וַיִּחַדְּ | וַיִּחַדְּ |
| exodus-19-8 | Noa (f) | ✗ | ✓ 4.6 | אֲדֹנָי, אֶת, אֲדֹנָי |  |
| exodus-2-21 | Noa (f) | ✗ | ✓ 4.58 | וַיּוֹאֶל |  |
| exodus-20-17 | Noa (f) | ✗ | ✓ 4.67 | אֶל | נַסּוֹת |
| exodus-21-2 | Noa (f) | ✗ | ✓ 4.4 | כִּי |  |
| exodus-21-21 | Noa (f) | ✗ | ✓ 4.57 | אוֹ |  |
| exodus-21-33 | Noa (f) | ✗ | ✓ 4.61 | אִישׁ, אִישׁ | אִישׁ בּוֹר |
| exodus-21-8 | Noa (f) | ✗ | ✓ 4.58 | בָהּ | וְהֶפְדָּהּ |
| exodus-24-1 | Noa (f) | ✗ | ✓ 4.68 | אֶל, אֲדֹנָי | נָדָב, וַאֲבִיהוּא, וְשִׁבְעִים |
| exodus-25-35 | Noa (f) | ✗ | ✓ 4.32 | וְכַפְתֹּר, תַּחַת, שְׁנֵי, הַקָּנִים, מִמֶּנָּה, וְכַפְתֹּר, תַּחַת, שְׁנֵי, הַקָּנִים, מִמֶּנָּה, לְשֵׁשֶׁת, הַקָּנִים, הַיֹּצְאִים, מִן, הַמְּנֹרָה |  |
| exodus-27-15 | Noa (f) | ✗ | ✓ 4.64 | עֶשְׂרֵה |  |
| exodus-29-12 | Noa (f) | ✗ | ✓ 4.7 | כָּל |  |
| exodus-30-31 | Noa (f) | ✗ | ✓ 4.61 | זֶה |  |
| exodus-31-7 | Noa (f) | ✗ | ✓ 4.6 | וְאֵת | וְאֵת |
| exodus-32-15 | Noa (f) | ✗ | ✓ 4.58 | וַיִּפֶן | לֻחֹת, לֻחֹת |
| exodus-32-5 | Noa (f) | ✗ | ✓ 4.52 | וַיִּבֶן, לַאדֹנָי |  |
| exodus-34-27 | Noa (f) | ✗ | ✓ 4.49 | אִתְּךָ | כָּרַתִּי |
| exodus-34-3 | Noa (f) | ✓ | ✗ 4.04 |  |  |
| exodus-34-33 | Noa (f) | ✗ | ✓ 4.62 | וַיְכַל | וַיְכַל |
| exodus-37-11 | Noa (f) | ✓ | ✗ 4.01 |  |  |
| exodus-38-14 | Noa (f) | ✗ | ✓ 4.98 | עֶשְׂרֵה | אַמָּה אֶל הַכָּתֵף |
| exodus-38-16 | Noa (f) | ✓ | ✗ 3.64 |  | מָשְׁזָר |
| exodus-4-16 | Noa (f) | ✗ | ✓ 4.59 | וְדִבֶּר, וְהָיָה |  |
| exodus-4-3 | Noa (f) | ✗ | ✓ 4.57 | וַיַּשְׁלִיכֵהוּ, אַרְצָה, וַיְהִי |  |
| exodus-5-15 | Noa (f) | ✗ | ✓ 4.95 | יִשְׂרָאֵל | כֹה |
| exodus-5-9 | Noa (f) | ✗ | ✓ 4.58 | בָהּ |  |
| exodus-6-4 | Noa (f) | ✗ | ✓ 4.61 | אֶת | (nothing) |
| exodus-6-7 | Noa (f) | ✗ | ✓ 4.6 | לִי | מִצְרָיִם |
| genesis-1-11 | Noa (f) | ✗ | ✓ 4.86 | זַרְעוֹ, בוֹ | תַּדְשֵׁא, דֶּשֶׁא, מַזְרִיעַ, זֶרַע, עֹשֶׂה, פְּרִי |
| genesis-1-12 | Noa (f) | ✗ | ✗ 5.27 | וַיַּרְא | וַתּוֹצֵא, זֶרַע, וְעֵץ עֹשֶׂה פְּרִי, זַרְעוֹ בוֹ, וַיַּרְא |
| genesis-1-13 | Noa (f) | ✗ | ✓ 4.58 | בֹקֶר | בֹקֶר, יוֹם |
| genesis-1-18 | Noa (f) | ✗ | ✓ 4.59 | וַיַּרְא | וַיַּרְא |
| genesis-1-2 | Noa (f) | ✗ | ✓ 4.78 | וְחֹשֶׁךְ | וְחֹשֶׁךְ |
| genesis-1-21 | Noa (f) | ✗ | ✓ 4.59 | עוֹף | הַחַיָּה, וַיַּרְא |
| genesis-1-29 | Noa (f) | ✗ | ✓ 5.1 | עֵץ | בּוֹ פְרִי עֵץ, לְאָכְלָה |
| genesis-1-31 | Noa (f) | ✗ | ✓ 4.55 | וַיַּרְא, בֹקֶר | וַיַּרְא |
| genesis-1-4 | Noa (f) | ✗ | ✓ 4.6 | הָאוֹר, הָאוֹר | וַיַּרְא, כִּי, טוֹב, וַיַּבְדֵּל |
| genesis-10-21 | Noa (f) | ✓ | ✗ 4.03 |  | אֲחִי |
| genesis-10-8 | Noa (f) | ✓ | ✗ 4.03 |  |  |
| genesis-11-26 | Noa (f) | ✓ | ✗ 4.01 |  | אַבְרָם |
| genesis-12-14 | Noa (f) | ✗ | ✓ 4.6 | כְּבוֹא | וַיְהִי כְּבוֹא אַבְרָם, וַיִּרְאוּ, הָאִשָּׁה |
| genesis-12-17 | Noa (f) | ✗ | ✓ 4.59 | וְאֶת | וַיְנַגַּע, בֵּיתוֹ, אַבְרָם |
| genesis-14-17 | Noa (f) | ✗ | ✓ 4.6 | כְּדָר | כְּדָר |
| genesis-14-2 | Noa (f) | ✗ | ✓ 4.57 | הִיא | שִׁנְאָב, הִיא, צֹעַר |
| genesis-14-21 | Noa (f) | ✓ | ✗ 3.77 |  | אַבְרָם |
| genesis-15-7 | Noa (f) | ✗ | ✓ 4.7 | מֵאוּר | כַּשְׂדִּים |
| genesis-16-12 | Noa (f) | ✓ | ✗ 3.88 |  | בַכֹּל |
| genesis-17-13 | Noa (f) | ✗ | ✓ 4.26 | יִמּוֹל | יִמּוֹל |
| genesis-18-29 | Noa (f) | ✗ | ✓ 4.62 | אֶעֱשֶׂה |  |
| genesis-19-20 | Noa (f) | ✗ | ✓ 4.58 | הִוא | (nothing), מִצְעָר אִמָּלְטָה, הִוא |
| genesis-19-8 | Noa (f) | ✗ | ✓ 4.58 | לִי | אוֹצִיאָה |
| genesis-2-12 | Noa (f) | ✗ | ✓ 4.46 | הַהִוא | הַהִוא |
| genesis-2-18 | Noa (f) | ✗ | ✓ 4.26 | אֶעֱשֶׂהּ |  |
| genesis-2-24 | Noa (f) | ✗ | ✓ 4.86 | יַעֲזָב |  |
| genesis-2-6 | Noa (f) | ✓ | ✗ 5.21 |  | וְאֵד, וְהִשְׁקָה |
| genesis-20-1 | Noa (f) | ✗ | ✓ 4.35 | וַיִּסַּע | בִּגְרָר |
| genesis-21-10 | Noa (f) | ✗ | ✓ 4.61 | עִם | עִם יִצְחָק |
| genesis-21-16 | Noa (f) | ✗ | ✓ 4.47 | אֶרְאֶה | וַתֵּבְךְּ |
| genesis-21-21 | Noa (f) | ✗ | ✓ 4.62 | לוֹ | לוֹ, מֵאֶרֶץ |
| genesis-21-6 | Noa (f) | ✓ | ✗ 4.04 |  |  |
| genesis-22-13 | Noa (f) | ✗ | ✓ 4.64 | לְעֹלָה |  |
| genesis-23-1 | Noa (f) | ✗ | ✓ 4.58 | וַיִּהְיוּ |  |
| genesis-23-19 | Noa (f) | ✗ | ✓ 4.61 | כֵן, הִוא | קָבַר, הִוא חֶבְרוֹן |
| genesis-23-2 | Noa (f) | ✗ | ✓ 4.59 | הִוא | (nothing) |
| genesis-24-25 | Noa (f) | ✓ | ✗ 3.72 |  |  |
| genesis-24-44 | Noa (f) | ✗ | ✓ 4.62 | הִוא | הִוא |
| genesis-24-52 | Noa (f) | ✗ | ✓ 4.58 | לַאדֹנָי | וַיִּשְׁתַּחוּ |
| genesis-24-57 | Noa (f) | ✗ | ✓ 4.88 | וַיֹּאמְרוּ | לַנַּעֲרָ |
| genesis-25-26 | Noa (f) | ✗ | ✓ 4.6 | אָחִיו, אֹחֶזֶת | אֹחֶזֶת, בַּעֲקֵב, וַיִּקְרָא |
| genesis-25-34 | Noa (f) | ✗ | ✓ 4.59 | וְיַעֲקֹב, וַיֵּלַךְ | וְיַעֲקֹב, וּנְזִיד, וַיֵּלַךְ, וַיִּבֶז |
| genesis-25-5 | Noa (f) | ✗ | ✓ 4.52 | לוֹ |  |
| genesis-26-12 | Noa (f) | ✗ | ✓ 4.61 | הַהִוא | הַהִוא, הַהִוא, וַיְבָרֲכֵהוּ |
| genesis-26-2 | Noa (f) | ✗ | ✓ 4.63 | וַיֵּרָא |  |
| genesis-26-24 | Noa (f) | ✗ | ✓ 4.62 | אֵלָיו, אַל | אָנֹכִי, אָבִיךָ אַל תִּירָא כִּי אִתְּךָ אָנֹכִי וּבֵרַכְתִּיךָ וְהִרְבֵּיתִי, זַרְעֲךָ, בַּעֲבוּר |
| genesis-26-25 | Noa (f) | ✗ | ✓ 4.43 | וַיִּבֶן |  |
| genesis-28-18 | Noa (f) | ✗ | ✓ 4.61 | עַל | (nothing), מְרַאֲשֹׁתָיו וַיָּשֶׂם אֹתָהּ מַצֵּבָה וַיִּצֹק |
| genesis-28-19 | Noa (f) | ✗ | ✓ 4.58 | אֵל |  |
| genesis-29-7 | Noa (f) | ✓ | ✗ 3.96 |  | הַשְׁקוּ |
| genesis-30-8 | Noa (f) | ✗ | ✓ 4.72 | שְׁמוֹ |  |
| genesis-31-36 | Noa (f) | ✗ | ✓ 4.52 | וַיִּחַר | וַיִּחַר |
| genesis-32-21 | Noa (f) | ✗ | ✓ 4.62 | יִשָּׂא | אֲכַפְּרָה, כֵן אֶרְאֶה |
| genesis-32-7 | Noa (f) | ✗ | ✓ 4.82 | עֵשָׂו | וְאַרְבַּע |
| genesis-34-19 | Noa (f) | ✗ | ✓ 4.59 | כִּי |  |
| genesis-37-11 | Noa (f) | ✗ | ✓ 4.6 | בוֹ | שָׁמַר |
| genesis-38-11 | Noa (f) | ✗ | ✓ 4.61 | בְנְי |  |
| genesis-38-16 | Noa (f) | ✗ | ✓ 4.6 | כִּי | וַיֵּט, וַיֹּאמֶר, הָבָה, כִּי כַלָּתוֹ הִוא וַתֹּאמֶר מַה תִּתֶּן, אֵלָי |
| genesis-38-21 | Noa (f) | ✗ | ✓ 4.59 | בָזֶה | הִוא |
| genesis-38-24 | Noa (f) | ✗ | ✓ 4.62 | וַיֻּגַּד |  |
| genesis-38-25 | Noa (f) | ✗ | ✓ 4.41 | הִוא | (nothing) |
| genesis-4-12 | Noa (f) | ✗ | ✓ 4.96 | לֹא | תֵּת כֹּחָהּ לָךְ |
| genesis-4-23 | Noa (f) | ✗ | ✓ 4.6 | אִישׁ | עָדָה, כִּי אִישׁ הָרַגְתִּי |
| genesis-41-45 | Noa (f) | ✗ | ✓ 4.81 | אֹן | פַרְעֹה שֵׁם, צָפְנַת פַּעְנֵחַ, פּוֹטִי, כֹּהֵן אֹן לְאִשָּׁה וַיֵּצֵא, מִצְרָיִם |
| genesis-41-47 | Noa (f) | ✗ | ✓ 4.57 | וַתַּעַשׂ | וַתַּעַשׂ |
| genesis-41-49 | Noa (f) | ✓ | ✗ 3.75 |  |  |
| genesis-41-51 | Noa (f) | ✗ | ✓ 4.44 | וַיִּקְרָא | וַיִּקְרָא |
| genesis-42-11 | Noa (f) | ✗ | ✓ 4.85 | אִישׁ | נָחְנוּ |
| genesis-42-38 | Noa (f) | ✗ | ✓ 4.47 | וּקְרָאָהוּ, בָהּ | וּקְרָאָהוּ |
| genesis-43-19 | Noa (f) | ✗ | ✓ 4.78 | עַל |  |
| genesis-43-24 | Noa (f) | ✗ | ✓ 4.55 | וַיָּבֵא, הָאִישׁ |  |
| genesis-44-10 | Noa (f) | ✗ | ✓ 4.55 | יִהְיֶה |  |
| genesis-44-30 | Noa (f) | ✗ | ✓ 4.49 | עַבְדְּךָ | בְנַפְשׁוֹ |
| genesis-45-12 | Noa (f) | ✗ | ✓ 4.56 | כִּי |  |
| genesis-46-23 | Noa (f) | ✓ | ✗ 3.25 |  |  |
| genesis-47-17 | Noa (f) | ✗ | ✓ 4.6 | הַהִוא | וַיְנַהֲלֵם, הַהִוא |
| genesis-47-23 | Noa (f) | ✗ | ✓ 4.27 | הֵא |  |
| genesis-47-30 | Noa (f) | ✗ | ✓ 4.67 | וַיֹּאמַר | וְשָׁכַבְתִּי, וּנְשָׂאתַנִי, וּקְבַרְתַּנִי, וַיֹּאמַר, אֶעֱשֶׂה, כִדְבָרֶךָ |
| genesis-48-7 | Noa (f) | ✗ | ✓ 4.39 | הִוא | וָאֶקְבְּרֶהָ, הִוא |
| genesis-6-19 | Noa (f) | ✗ | ✓ 4.24 | יִהְיוּ |  |
| genesis-6-2 | Noa (f) | ✗ | ✓ 4.58 | בְנֵי |  |
| genesis-6-3 | Noa (f) | ✗ | ✓ 4.62 | הוּא | בָאָדָם, הוּא |
| genesis-7-16 | Noa (f) | ✗ | ✓ 4.51 | אֲדֹנָי, בַּעֲדוֹ | מִכָּל |
| genesis-7-18 | Noa (f) | ✗ | ✓ 4.64 | וַיִּגְבְּרוּ, הַמַּיִם |  |
| genesis-7-2 | Noa (f) | ✗ | ✓ 4.59 | אֲשֶׁר | שִׁבְעָה, שִׁבְעָה, אֲשֶׁר, הִוא, שְׁנַיִם |
| genesis-7-23 | Noa (f) | ✗ | ✓ 4.6 | וַיִּמַח |  |
| genesis-8-5 | Noa (f) | ✗ | ✓ 4.81 | עַד | וְחָסוֹר |
| genesis-9-7 | Noa (f) | ✗ | ✓ 4.57 | בָהּ |  |
| leviticus-10-13 | Noa (f) | ✗ | ✓ 4.61 | הִוא | הִוא |
| leviticus-10-17 | Noa (f) | ✗ | ✓ 4.5 | הִוא | עֲוֹן |
| leviticus-11-19 | Noa (f) | ✗ | ✓ 4.61 | וְאֵת, וְאֶת, וְאֶת | וְאֵת, וְאֶת, וְאֶת |
| leviticus-11-22 | Noa (f) | ✗ | ✓ 4.59 | אֵלֶּה | הַסָּלְעָם |
| leviticus-11-23 | Noa (f) | ✗ | ✓ 4.59 | הוּא |  |
| leviticus-11-45 | Noa (f) | ✗ | ✓ 4.57 | כִּי |  |
| leviticus-12-4 | Noa (f) | ✗ | ✓ 4.61 | עַד | עַד מְלֹאת |
| leviticus-13-11 | Noa (f) | ✗ | ✓ 4.61 | הוּא | צָרַעַת, הִוא בְּעוֹר, הַכֹּהֵן, יַסְגִּרֶנּוּ, הוּא |
| leviticus-13-14 | Noa (f) | ✗ | ✓ 4.55 | הֵרָאוֹת | וּבְיוֹם, הֵרָאוֹת, בּוֹ |
| leviticus-13-27 | Noa (f) | ✗ | ✓ 4.43 | הִוא | הִוא |
| leviticus-13-28 | Noa (f) | ✗ | ✓ 4.6 | הִוא, הִוא | וְהִוא כֵהָה שְׂאֵת, הִוא, הִוא |
| leviticus-13-38 | Noa (f) | ✗ | ✓ 4.62 | אוֹ | אוֹ, בְעוֹר |
| leviticus-13-42 | Noa (f) | ✗ | ✓ 4.46 | הִוא | בַקָּרַחַת, בַגַּבַּחַת, הִוא בְּקָרַחְתּוֹ, בְגַבַּחְתּוֹ |
| leviticus-13-55 | Noa (f) | ✗ | ✓ 4.4 | הִוא | הֻכַּבֵּס, פְּחֶתֶת, הִוא |
| leviticus-15-3 | Noa (f) | ✗ | ✓ 4.4 | הִוא | (nothing) |
| leviticus-16-4 | Noa (f) | ✗ | ✓ 4.27 | וּלְבֵשָׁם | וּבְאַבְנֵט |
| leviticus-18-14 | Noa (f) | ✗ | ✓ 4.09 | הִוא | (nothing) |
| leviticus-19-4 | Noa (f) | ✗ | ✓ 4.59 | אַל | הָאֱלִילִים, לָכֶם |
| leviticus-2-15 | Noa (f) | ✗ | ✓ 4.59 | הִוא | הִוא |
| leviticus-2-6 | Noa (f) | ✗ | ✓ 4.62 | הִוא |  |
| leviticus-20-1 | Noa (f) | ✗ | ✓ 4.62 | וַיְדַבֵּר | וַיְדַבֵּר, לֵּאמֹר |
| leviticus-20-22 | Noa (f) | ✗ | ✓ 4.69 | בָּהּ |  |
| leviticus-20-26 | Noa (f) | ✗ | ✓ 4.34 | כִּי |  |
| leviticus-20-9 | Noa (f) | ✗ | ✓ 4.61 | אִישׁ | כִּי אִישׁ |
| leviticus-22-20 | Noa (f) | ✓ | ✗ 3.95 |  |  |
| leviticus-22-7 | Noa (f) | ✗ | ✓ 4.6 | וְטָהֵר, וְאַחַר, כִּי | וְטָהֵר, וְאַחַר |
| leviticus-22-8 | Noa (f) | ✗ | ✓ 4.62 | בָהּ | לְטָמְאָה |
| leviticus-23-3 | Noa (f) | ✗ | ✓ 4.47 | הִוא | הִוא |
| leviticus-23-43 | Noa (f) | ✗ | ✓ 4.67 | אֲדֹנָי, אֱלֹהֵיכֶם |  |
| leviticus-24-17 | Noa (f) | ✗ | ✓ 4.55 | כָּל |  |
| leviticus-25-11 | Noa (f) | ✗ | ✓ 4.6 | הִוא | הִוא |
| leviticus-25-17 | Noa (f) | ✗ | ✓ 4.79 | אִישׁ |  |
| leviticus-25-20 | Noa (f) | ✓ | ✗ 5.22 |  |  |
| leviticus-25-41 | Noa (f) | ✗ | ✓ 4.59 | הוּא |  |
| leviticus-25-55 | Noa (f) | ✗ | ✓ 4.71 | מֵאֶרֶץ |  |
| leviticus-25-6 | Noa (f) | ✗ | ✓ 4.58 | לְךָ, וּלְעַבְדְּךָ |  |
| leviticus-26-40 | Noa (f) | ✗ | ✓ 4.59 | בִי | וְהִתְוַדּוּ, עֲוֹנָם, עֲוֹן אֲבֹתָם, עִמִּי |
| leviticus-26-8 | Noa (f) | ✗ | ✓ 4.74 | וּמֵאָה | וּמֵאָה |
| leviticus-27-21 | Noa (f) | ✗ | ✓ 4.61 | בַיֹּבֵל |  |
| leviticus-4-27 | Noa (f) | ✗ | ✓ 4.48 | בַּעֲשֹׂתָהּ, אֲדֹנָי | בִשְׁגָגָה, בַּעֲשֹׂתָהּ, וְאָשֵׁם |
| leviticus-5-26 | Noa (f) | ✗ | ✓ 4.6 | בָהּ | בָהּ |
| leviticus-6-18 | Noa (f) | ✗ | ✓ 4.32 | הִוא | (nothing) |
| leviticus-6-9 | Noa (f) | ✗ | ✓ 4.63 | יֹאכְלוּהָ |  |
| leviticus-7-21 | Noa (f) | ✗ | ✓ 4.6 | מֵעַמֶּיהָ | מֵעַמֶּיהָ |
| leviticus-7-23 | Noa (f) | ✓ | ✗ 3.99 |  |  |
| leviticus-7-24 | Noa (f) | ✗ | ✓ 4.59 | תֹאכְלֻהוּ | וְאָכֹל |
| leviticus-7-8 | Noa (f) | ✗ | ✓ 4.61 | עוֹר | אִישׁ עוֹר |
| leviticus-9-2 | Noa (f) | ✗ | ✓ 4.76 | אֲדֹנָי | תְּמִימִם |
| numbers-1-2 | Noa (f) | ✗ | ✓ 4.62 | שְׂאוּ | כָּל, עֲדַת, כָּל |
| numbers-1-25 | Noa (f) | ✗ | ✓ 4.6 | גָד |  |
| numbers-1-4 | Noa (f) | ✓ | ✗ 3.91 |  |  |
| numbers-1-41 | Noa (f) | ✗ | ✓ 4.62 | מֵאוֹת | וְאַרְבָּעִים, מֵאוֹת |
| numbers-10-13 | Noa (f) | ✓ | ✗ 5.26 |  | וַיִּסְעוּ בָּרִאשֹׁנָה |
| numbers-10-28 | Noa (f) | ✗ | ✓ 4.59 | וַיִּסָּעוּ |  |
| numbers-11-33 | Noa (f) | ✗ | ✓ 4.58 | אֲדֹנָי, חָרָה, אֲדֹנָי | וַיַּךְ |
| numbers-12-13 | Noa (f) | ✓ | ✗ 3.85 |  |  |
| numbers-12-6 | Noa (f) | ✗ | ✓ 4.61 | נָא | בַּמַּרְאָה |
| numbers-14-11 | Noa (f) | ✗ | ✓ 4.53 | בִי |  |
| numbers-14-41 | Noa (f) | ✗ | ✓ 4.53 | אֲדֹנָי |  |
| numbers-16-8 | Noa (f) | ✗ | ✓ 4.57 | אֶל | שִׁמְעוּ נָא בְּנֵי לֵוִי |
| numbers-16-9 | Noa (f) | ✗ | ✓ 4.59 | אֲדֹנָי |  |
| numbers-17-10 | Noa (f) | ✗ | ✓ 4.7 | הֵרֹמּוּ | הֵרֹמּוּ |
| numbers-18-19 | Noa (f) | ✗ | ✓ 4.48 | הִוא | הִוא, וּלְזַרְעֲךָ |
| numbers-20-6 | Noa (f) | ✗ | ✓ 4.46 | וַיֵּרָא, אֲדֹנָי |  |
| numbers-21-26 | Noa (f) | ✗ | ✓ 4.6 | הִוא | הִוא |
| numbers-21-35 | Noa (f) | ✓ | ✗ 3.91 |  | וַיִּירְשׁוּ |
| numbers-22-6 | Noa (f) | ✗ | ✓ 4.6 | הוּא | לְכָה נָּא אָרָה, תָּאֹר, יוּאָר |
| numbers-23-1 | Noa (f) | ✗ | ✓ 4.62 | וַיֹּאמֶר, בָּזֶה | (nothing), וְהָכֵן, פָרִים |
| numbers-23-14 | Noa (f) | ✗ | ✓ 4.61 | וַיִּבֶן | שִׁבְעָה |
| numbers-23-4 | Noa (f) | ✗ | ✓ 4.59 | פָּר, וָאַיִל | וָאַעַל |
| numbers-24-11 | Noa (f) | ✗ | ✓ 4.62 | אֲכַבֶּדְךָ |  |
| numbers-24-20 | Noa (f) | ✗ | ✓ 4.61 | אֶת |  |
| numbers-24-22 | Noa (f) | ✗ | ✓ 4.57 | אִם, מָה | אִם, קָיִן, תִּשְׁבֶּךָּ |
| numbers-24-6 | Noa (f) | ✗ | ✓ 4.35 | אֲדֹנָי | כַּאֲהָלִים |
| numbers-25-8 | Noa (f) | ✗ | ✓ 4.6 | אֶל | קֳבָתָהּ |
| numbers-26-38 | Noa (f) | ✗ | ✓ 4.7 | בְּנֵי |  |
| numbers-26-46 | Noa (f) | ✓ | ✗ 3.72 |  | שָׂרַח |
| numbers-26-51 | Noa (f) | ✗ | ✓ 4.81 | וָאָלֶף | יִשְׂרָאֵל, שֵׁשׁ, וָאָלֶף |
| numbers-28-23 | Noa (f) | ✗ | ✓ 4.58 | עֹלַת | מִלְּבַד, הַתָּמִיד |
| numbers-3-9 | Noa (f) | ✗ | ✓ 4.64 | לוֹ | הֵמָּה לוֹ מֵאֵת בְּנֵי |
| numbers-30-1 | Noa (f) | ✗ | ✓ 4.6 | אֶל |  |
| numbers-30-15 | Noa (f) | ✗ | ✓ 4.66 | כִּי | אֱסָרֶיהָ |
| numbers-31-21 | Noa (f) | ✗ | ✓ 4.8 | אֶת |  |
| numbers-32-13 | Noa (f) | ✗ | ✓ 4.6 | וַיִּחַר | וַיִּחַר, וַיְנִעֵם |
| numbers-32-19 | Noa (f) | ✗ | ✓ 4.61 | כִּי | כִּי לֹא נִנְחַל אִתָּם, בָאָה |
| numbers-32-29 | Noa (f) | ✗ | ✓ 4.54 | וּנְתַתֶּם |  |
| numbers-32-36 | Noa (f) | ✓ | ✗ 4.02 |  | עָרֵי |
| numbers-33-43 | Noa (f) | ✓ | ✗ 5.37 |  | בְּאֹבֹת |
| numbers-34-8 | Noa (f) | ✗ | ✓ 4.55 | תְּתָאוּ | מֵהֹר |
| numbers-35-22 | Noa (f) | ✗ | ✓ 4.61 | אוֹ |  |
| numbers-36-7 | Noa (f) | ✗ | ✓ 4.58 | אִישׁ | אִישׁ |
| numbers-5-24 | Noa (f) | ✗ | ✓ 4.66 | בָהּ |  |
| numbers-5-31 | Noa (f) | ✗ | ✓ 4.29 | הַהִוא | מֵעָוֹן, עֲוֹנָהּ |
| numbers-7-63 | Noa (f) | ✗ | ✓ 4.32 | אַיִל |  |
| numbers-8-1 | Noa (f) | ✗ | ✓ 4.62 | וַיְדַבֵּר | וַיְדַבֵּר, לֵּאמֹר |
| numbers-8-26 | Noa (f) | ✗ | ✓ 4.26 | אֶחָיו |  |
| numbers-8-4 | Noa (f) | ✗ | ✓ 4.59 | הִוא | הִוא |
| numbers-9-13 | Noa (f) | ✗ | ✓ 4.36 | הַהִוא |  |
| deuteronomy-11-12 | Ari (m) | ✗ | ✓ 4.59 | בָּהּ | וְעַד |
| deuteronomy-11-25 | Ari (m) | ✗ | ✓ 4.54 | בָהּ |  |
| deuteronomy-11-3 | Ari (m) | ✗ | ✓ 4.59 | אֹתֹתָיו |  |
| deuteronomy-14-4 | Ari (m) | ✓ | ✗ 4.04 |  | שֵׂה, וְשֵׂה |
| deuteronomy-16-7 | Ari (m) | ✗ | ✓ 4.59 | בּוֹ, בַבֹּקֶר | בּוֹ |
| deuteronomy-18-7 | Ari (m) | ✗ | ✓ 4.49 | אֶחָיו |  |
| deuteronomy-2-20 | Ari (m) | ✗ | ✓ 4.85 | בָהּ | בָהּ |
| deuteronomy-2-22 | Ari (m) | ✗ | ✓ 4.61 | עֵשָׂו | עֵשָׂו, הַחֹרִי, (nothing) |
| deuteronomy-2-29 | Ari (m) | ✗ | ✓ 4.61 | עֵשָׂו |  |
| deuteronomy-2-8 | Ari (m) | ✗ | ✓ 4.77 | עֵשָׂו | וַנַּעֲבֹר, עֵשָׂו, בְּשֵׂעִיר, גָּבֶר, וַנַּעֲבֹר, מִדְבַּר, מוֹאָב |
| deuteronomy-20-11 | Ari (m) | ✗ | ✓ 4.58 | בָהּ |  |
| deuteronomy-21-11 | Ari (m) | ✗ | ✓ 4.61 | בָהּ |  |
| deuteronomy-21-8 | Ari (m) | ✗ | ✓ 4.59 | אֲדֹנָי |  |
| deuteronomy-22-13 | Ari (m) | ✗ | ✓ 4.58 | אִישׁ |  |
| deuteronomy-22-18 | Ari (m) | ✗ | ✓ 4.61 | הַהִוא | הַהִוא, וְיִסְּרוּ |
| deuteronomy-23-14 | Ari (m) | ✗ | ✓ 4.51 | בָהּ |  |
| deuteronomy-25-11 | Ari (m) | ✗ | ✓ 4.59 | כִּי |  |
| deuteronomy-26-19 | Ari (m) | ✗ | ✓ 4.62 | לַאדֹנָי |  |
| deuteronomy-26-6 | Ari (m) | ✗ | ✓ 5.12 | וַיָּרֵעוּ | וַיְעַנּוּנוּ |
| deuteronomy-27-9 | Ari (m) | ✗ | ✓ 4.6 | לֵאמֹר | לְעָם, לַאדֹנָי |
| deuteronomy-29-23 | Ari (m) | ✗ | ✓ 4.56 | מֶה | מֶה עָשָׂה |
| deuteronomy-3-24 | Ari (m) | ✗ | ✓ 4.53 | מִי |  |
| deuteronomy-30-11 | Ari (m) | ✗ | ✓ 4.59 | הִוא, הִוא | מִמְּךָ, (nothing) |
| deuteronomy-31-30 | Ari (m) | ✗ | ✓ 4.79 | עַד | בְּאָזְנֵי |
| deuteronomy-32-32 | Ari (m) | ✗ | ✓ 4.6 | כִּי | עֲנָבֵמוֹ עִנְּבֵי רוֹשׁ |
| deuteronomy-4-21 | Ari (m) | ✗ | ✓ 4.6 | בֹא |  |
| deuteronomy-5-1 | Ari (m) | ✗ | ✓ 4.6 | וַיִּקְרָא | וַיִּקְרָא |
| deuteronomy-5-5 | Ari (m) | ✗ | ✓ 4.6 | הַהִוא | הַהִוא |
| deuteronomy-5-8 | Ari (m) | ✗ | ✓ 4.59 | אֲשֶׁר |  |
| deuteronomy-6-15 | Ari (m) | ✗ | ✓ 4.96 | יֶחֱרֶה |  |
| deuteronomy-9-21 | Ari (m) | ✗ | ✓ 4.58 | עַד | וְאֶת, וָאֶכֹּת, מִן הָהָר |
| exodus-1-1 | Ari (m) | ✗ | ✓ 4.85 | אֵת |  |
| exodus-1-16 | Ari (m) | ✗ | ✓ 4.71 | וְאִם | בְּיַלֶּדְכֶן, וּרְאִיתֶן |
| exodus-10-6 | Ari (m) | ✗ | ✓ 4.57 | עַד | הַזֶּה |
| exodus-10-9 | Ari (m) | ✗ | ✓ 4.6 | כִּי |  |
| exodus-12-8 | Ari (m) | ✗ | ✓ 4.45 | יֹאכְלֻהוּ |  |
| exodus-16-25 | Ari (m) | ✗ | ✓ 4.75 | לַאדֹנָי | אִכְלֻהוּ |
| exodus-17-14 | Ari (m) | ✗ | ✓ 4.61 | אֶמְחֶה | אֶמְחֶה, אֶת |
| exodus-17-5 | Ari (m) | ✗ | ✓ 4.52 | אִתְּךָ | וּמַטְּךָ |
| exodus-17-7 | Ari (m) | ✗ | ✓ 4.6 | אֲדֹנָי, אֲדֹנָי, אָיִן |  |
| exodus-18-20 | Ari (m) | ✗ | ✓ 4.63 | בָהּ |  |
| exodus-21-17 | Ari (m) | ✓ | ✗ 5.34 |  | אָבִיו |
| exodus-21-26 | Ari (m) | ✗ | ✓ 4.44 | אֶת, עֵין |  |
| exodus-22-26 | Ari (m) | ✗ | ✓ 4.57 | הִוא | כִּי הִוא כְסוּתוֹ |
| exodus-23-6 | Ari (m) | ✓ | ✗ 4.04 |  |  |
| exodus-26-31 | Ari (m) | ✗ | ✓ 4.66 | פָרֹכֶת |  |
| exodus-3-13 | Ari (m) | ✗ | ✓ 4.88 | בָא | אָנֹכִי בָא |
| exodus-30-5 | Ari (m) | ✗ | ✓ 4.59 | עֲצֵי |  |
| exodus-31-13 | Ari (m) | ✗ | ✓ 4.43 | הִוא | הִוא |
| exodus-31-14 | Ari (m) | ✗ | ✓ 4.56 | בָהּ | הִוא |
| exodus-31-16 | Ari (m) | ✗ | ✓ 4.86 | בְנֵי |  |
| exodus-32-25 | Ari (m) | ✗ | ✓ 4.61 | אֶת | כִּי פְרָעֹה |
| exodus-33-11 | Ari (m) | ✗ | ✓ 4.61 | אִישׁ |  |
| exodus-34-4 | Ari (m) | ✗ | ✓ 4.59 | שְׁנֵי, שְׁנֵי |  |
| exodus-35-12 | Ari (m) | ✓ | ✗ 5.2 |  |  |
| exodus-36-20 | Ari (m) | ✗ | ✓ 4.57 | אֶת |  |
| exodus-37-11 | Ari (m) | ✓ | ✗ 3.95 |  |  |
| exodus-37-21 | Ari (m) | ✗ | ✓ 4.6 | וְכַפְתֹּר, תַּחַת, שְׁנֵי, הַקָּנִים, מִמֶּנָּה |  |
| exodus-37-7 | Ari (m) | ✗ | ✓ 4.58 | שְׁנֵי | וַיַּעַשׂ שְׁנֵי, קְצוֹת |
| exodus-38-16 | Ari (m) | ✓ | ✗ 3.93 |  |  |
| exodus-39-18 | Ari (m) | ✗ | ✓ 4.59 | עַל | וַיִּתְּנֻם עַל כִּתְפֹת הָאֵפֹד |
| exodus-4-13 | Ari (m) | ✗ | ✓ 4.9 | בִּי |  |
| exodus-4-2 | Ari (m) | ✓ | ✗ 5.34 |  |  |
| exodus-40-9 | Ari (m) | ✗ | ✓ 4.36 | כָּל |  |
| exodus-5-15 | Ari (m) | ✗ | ✓ 4.61 | לֵאמֹר | שֹׁטְרֵי, פַּרְעֹה, כֹה, לַעֲבָדֶיךָ |
| exodus-5-7 | Ari (m) | ✗ | ✓ 4.57 | לֹא |  |
| exodus-5-9 | Ari (m) | ✗ | ✓ 4.63 | בָהּ |  |
| exodus-6-5 | Ari (m) | ✗ | ✓ 4.59 | וָאֶזְכֹּר |  |
| exodus-8-8 | Ari (m) | ✗ | ✓ 4.59 | אֲדֹנָי |  |
| exodus-9-32 | Ari (m) | ✗ | ✓ 4.64 | כִּי |  |
| genesis-1-17 | Ari (m) | ✗ | ✓ 4.56 | בִּרְקִיעַ | בִּרְקִיעַ, לְהָאִיר |
| genesis-1-24 | Ari (m) | ✗ | ✓ 4.61 | הָאָרֶץ | הָאָרֶץ, וָרֶמֶשׂ, וְחַיְתוֹ, וַיְהִי |
| genesis-1-29 | Ari (m) | ✗ | ✓ 4.61 | עֵץ | זֶרַע, עֵץ, זָרַע, לְאָכְלָה |
| genesis-1-3 | Ari (m) | ✗ | ✓ 4.96 | אוֹר, אוֹר | אוֹר, אוֹר |
| genesis-10-16 | Ari (m) | ✗ | ✓ 4.91 | וְאֶת, וְאֵת | וְאֶת, הַיְבוּסִי, וְאֶת, וְאֵת |
| genesis-11-4 | Ari (m) | ✗ | ✓ 4.59 | פֶּן | עִיר, פֶּן נָפוּץ |
| genesis-12-14 | Ari (m) | ✗ | ✓ 4.58 | כִּי, הִוא | כְּבוֹא אַבְרָם מִצְרָיְמָה, הִוא |
| genesis-12-18 | Ari (m) | ✗ | ✓ 4.6 | כִּי, הִוא |  |
| genesis-14-7 | Ari (m) | ✗ | ✓ 4.5 | הִוא | הִוא |
| genesis-14-8 | Ari (m) | ✗ | ✓ 4.52 | הִוא | צֹעַר, הַשִּׂדִּים |
| genesis-17-13 | Ari (m) | ✗ | ✓ 4.47 | יִמּוֹל | יִמּוֹל |
| genesis-17-22 | Ari (m) | ✗ | ✓ 4.64 | אֱלֹהִים |  |
| genesis-18-20 | Ari (m) | ✗ | ✓ 4.61 | כִּי, כִּי |  |
| genesis-18-30 | Ari (m) | ✗ | ✓ 4.6 | לַאדֹנָי, וַאֲדַבֵּרָה | אוּלַי |
| genesis-18-32 | Ari (m) | ✗ | ✓ 4.64 | אַךְ | לַאדֹנָי וַאֲדַבְּרָה אַךְ |
| genesis-19-12 | Ari (m) | ✗ | ✓ 4.6 | פֹה |  |
| genesis-19-23 | Ari (m) | ✓ | ✗ 5.28 |  | יָצָא, וְלוֹט, בָּא, צֹעֲרָה |
| genesis-19-38 | Ari (m) | ✗ | ✓ 4.7 | הִוא |  |
| genesis-2-18 | Ari (m) | ✗ | ✓ 4.58 | לּוֹ, עֵזֶר | אֶעֱשֶׂהּ, עֵזֶר |
| genesis-22-7 | Ari (m) | ✗ | ✓ 4.58 | בְנִי |  |
| genesis-23-15 | Ari (m) | ✗ | ✓ 4.6 | מַה, הִוא |  |
| genesis-24-26 | Ari (m) | ✗ | ✓ 4.81 | וַיִּקֹּד | וַיִּקֹּד |
| genesis-27-24 | Ari (m) | ✗ | ✓ 4.87 | זֶה |  |
| genesis-28-6 | Ari (m) | ✗ | ✓ 4.59 | עֵשָׂו | וַיַּרְא עֵשָׂו כִּי בֵרַךְ, וַיְצַו |
| genesis-28-7 | Ari (m) | ✗ | ✓ 4.61 | אֲרָם |  |
| genesis-3-17 | Ari (m) | ✗ | ✓ 4.55 | לֵאמֹר |  |
| genesis-30-1 | Ari (m) | ✗ | ✓ 4.72 | אַיִן |  |
| genesis-32-10 | Ari (m) | ✗ | ✓ 4.53 | אַבְרָהָם, וֵאלֹהֵי | וְאֵיטִיבָה |
| genesis-32-7 | Ari (m) | ✗ | ✓ 4.59 | עֵשָׂו |  |
| genesis-33-17 | Ari (m) | ✗ | ✓ 4.7 | לוֹ | נָסַע סֻכֹּתָה וַיִּבֶן לוֹ בָּיִת, (nothing) |
| genesis-35-3 | Ari (m) | ✗ | ✓ 4.81 | אֵל |  |
| genesis-36-19 | Ari (m) | ✗ | ✓ 4.57 | עֵשָׂו |  |
| genesis-36-5 | Ari (m) | ✗ | ✓ 4.4 | עֵשָׂו | וְאָהֳלִיבָמָה |
| genesis-36-9 | Ari (m) | ✗ | ✓ 4.6 | עֵשָׂו |  |
| genesis-37-14 | Ari (m) | ✗ | ✓ 4.52 | וְאֶת, שְׁלוֹם, הַצֹּאן |  |
| genesis-37-22 | Ari (m) | ✗ | ✓ 4.42 | בוֹ |  |
| genesis-37-26 | Ari (m) | ✗ | ✗ 5.19 | אֶחָיו |  |
| genesis-37-29 | Ari (m) | ✗ | ✓ 4.58 | וַיָּשָׁב | וַיִּקְרַע |
| genesis-38-16 | Ari (m) | ✗ | ✓ 4.72 | הִוא | (nothing), כִּי כַלָּתוֹ הִוא וַתֹּאמֶר |
| genesis-38-9 | Ari (m) | ✗ | ✓ 4.37 | בָּא |  |
| genesis-4-12 | Ari (m) | ✗ | ✓ 4.58 | לֹא | תֵּת |
| genesis-4-18 | Ari (m) | ✗ | ✓ 4.65 | אֶת | לַחֲנוֹךְ אֶת עִירָד וְעִירָד יָלַד אֶת מְחוּיָאֵל וּמְחִיּיָאֵל יָלַד אֶת, יָלַד אֶת |
| genesis-4-21 | Ari (m) | ✓ | ✗ 4.04 |  |  |
| genesis-41-27 | Ari (m) | ✗ | ✓ 4.53 | שֶׁבַע |  |
| genesis-41-54 | Ari (m) | ✗ | ✓ 4.59 | שֶׁבַע |  |
| genesis-43-32 | Ari (m) | ✗ | ✓ 4.4 | הִוא | הִוא |
| genesis-44-34 | Ari (m) | ✗ | ✓ 4.56 | כִּי | וְהַנַּעַר, אֶרְאֶה בָרָע אֲשֶׁר יִמְצָא |
| genesis-45-25 | Ari (m) | ✗ | ✓ 4.74 | וַיָּבֹאוּ |  |
| genesis-47-23 | Ari (m) | ✗ | ✓ 4.6 | הֵן | לְפַרְעֹה, הֵא |
| genesis-47-30 | Ari (m) | ✗ | ✓ 4.61 | אֶעֱשֶׂה | אֲבֹתַי, וּנְשָׂאתַנִי, וּקְבַרְתַּנִי, אֶעֱשֶׂה, כִדְבָרֶךָ |
| genesis-48-20 | Ari (m) | ✗ | ✓ 4.58 | לֵאמוֹר, לֵאמֹר | וְכִמְנַשֶּׁה, אֶפְרַיִם |
| genesis-5-4 | Ari (m) | ✗ | ✓ 4.62 | וַיִּהְיוּ | וַיִּהְיוּ, הוֹלִידוֹ |
| genesis-6-17 | Ari (m) | ✗ | ✓ 4.68 | בּוֹ |  |
| genesis-6-2 | Ari (m) | ✗ | ✓ 4.57 | כִּי | כִּי טֹבֹת |
| genesis-6-7 | Ari (m) | ✗ | ✓ 4.63 | כִּי | אֶמְחֶה, אֶת |
| genesis-7-22 | Ari (m) | ✗ | ✓ 4.58 | רוּחַ | רוּחַ, חַיִּים, בֶּחָרָבָה |
| genesis-9-26 | Ari (m) | ✗ | ✓ 4.61 | וִיהִי | וִיהִי כְנַעַן, לָמוֹ |
| leviticus-10-4 | Ari (m) | ✗ | ✓ 4.49 | שְׂאוּ, מֵאֵת | דֹּד, אֲחֵיכֶם מֵאֵת פְּנֵי |
| leviticus-10-7 | Ari (m) | ✗ | ✓ 4.52 | כִּי |  |
| leviticus-13-20 | Ari (m) | ✗ | ✓ 4.59 | הִוא | הִוא |
| leviticus-13-25 | Ari (m) | ✗ | ✓ 4.52 | הִוא, הִוא | (nothing), פָּרָחָה, (nothing) |
| leviticus-13-28 | Ari (m) | ✗ | ✓ 4.61 | בָעוֹר, כִּי | כֵהָה שְׂאֵת הַמִּכְוָה הִוא, הַכֹּהֵן כִּי צָרֶבֶת הַמִּכְוָה הִוא |
| leviticus-13-42 | Ari (m) | ✗ | ✓ 4.6 | בַגַּבַּחַת | אוֹ בַגַּבַּחַת נֶגַע, אֲדַמְדָּם, צָרַעַת, בְגַבַּחְתּוֹ |
| leviticus-13-55 | Ari (m) | ✗ | ✓ 4.43 | הִוא | הֻכַּבֵּס, הִוא |
| leviticus-13-57 | Ari (m) | ✗ | ✓ 4.6 | הִוא | הִוא |
| leviticus-14-23 | Ari (m) | ✗ | ✓ 4.58 | אֲדֹנָי |  |
| leviticus-15-25 | Ari (m) | ✗ | ✓ 4.57 | כִי | וְאִשָּׁה, יָזוּב, תָזוּב, טֻמְאָתָהּ, טְמֵאָה |
| leviticus-18-17 | Ari (m) | ✗ | ✓ 4.33 | הִוא | (nothing) |
| leviticus-18-19 | Ari (m) | ✗ | ✓ 4.66 | לֹא | בְּנִדַּת, טֻמְאָתָהּ, לֹא |
| leviticus-18-20 | Ari (m) | ✗ | ✓ 4.57 | בָהּ |  |
| leviticus-18-23 | Ari (m) | ✗ | ✓ 4.59 | בָהּ, הוּא | לְטָמְאָה, בָהּ, לְרִבְעָהּ תֶּבֶל הוּא |
| leviticus-18-29 | Ari (m) | ✗ | ✓ 4.69 | אֲשֶׁר |  |
| leviticus-21-8 | Ari (m) | ✗ | ✓ 4.6 | אֶת | אֱלֹהֶיךָ הוּא |
| leviticus-22-8 | Ari (m) | ✗ | ✓ 4.57 | בָהּ, אֲדֹנָי |  |
| leviticus-23-36 | Ari (m) | ✗ | ✓ 4.59 | הִוא | אִשֶּׁה, לַאדֹנָי, אִשֶּׁה, לַאדֹנָי |
| leviticus-24-3 | Ari (m) | ✗ | ✓ 4.6 | עַד | מוֹעֵד |
| leviticus-25-14 | Ari (m) | ✗ | ✓ 4.61 | אִישׁ |  |
| leviticus-25-2 | Ari (m) | ✗ | ✓ 4.59 | דַּבֵּר |  |
| leviticus-25-22 | Ari (m) | ✗ | ✓ 4.57 | בּוֹא |  |
| leviticus-25-43 | Ari (m) | ✗ | ✓ 4.91 | בוֹ | תִרְדֶּה בוֹ בְּפָרֶךְ וְיָרֵאתָ מֵאֱלֹהֶיךָ |
| leviticus-26-26 | Ari (m) | ✗ | ✓ 4.59 | תִשְׂבָּעוּ |  |
| leviticus-26-40 | Ari (m) | ✗ | ✓ 4.61 | בִי | עֲוֹנָם, עֲוֹן |
| leviticus-4-13 | Ari (m) | ✗ | ✓ 4.59 | כָּל | יִשְׁגּוּ וְנֶעְלַם, (nothing) |
| leviticus-4-2 | Ari (m) | ✗ | ✓ 4.7 | מִצְוֹת | בִשְׁגָגָה, מִצְוֹת |
| leviticus-4-22 | Ari (m) | ✗ | ✓ 4.76 | וְאָשֵׁם | מִכָּל, מִצְוֹת, וְאָשֵׁם |
| leviticus-4-25 | Ari (m) | ✗ | ✓ 4.47 | אֶל | וְלָקַח, (nothing), דָּמוֹ יִשְׁפֹּךְ אֶל |
| leviticus-5-26 | Ari (m) | ✗ | ✓ 4.71 | בָהּ | בָהּ |
| leviticus-6-6 | Ari (m) | ✓ | ✗ 3.94 |  |  |
| leviticus-8-12 | Ari (m) | ✗ | ✓ 4.6 | עַל | עַל רֹאשׁ |
| numbers-1-23 | Ari (m) | ✗ | ✓ 4.59 | פְּקֻדֵיהֶם |  |
| numbers-1-43 | Ari (m) | ✗ | ✓ 4.76 | מֵאוֹת | וְאַרְבַּע |
| numbers-10-27 | Ari (m) | ✗ | ✓ 4.57 | וְעַל |  |
| numbers-11-10 | Ari (m) | ✗ | ✓ 4.64 | וַיִּחַר | מְאֹד, וּבְעֵינֵי |
| numbers-11-12 | Ari (m) | ✗ | ✓ 4.57 | בְחֵיקֶךָ | כִּי תֹאמַר |
| numbers-11-3 | Ari (m) | ✗ | ✓ 4.61 | שֵׁם | הַהוּא תַּבְעֵרָה כִּי בָעֲרָה בָם אֵשׁ |
| numbers-13-12 | Ari (m) | ✓ | ✗ 5.45 |  |  |
| numbers-13-19 | Ari (m) | ✗ | ✓ 4.51 | בָּהּ | הִוא |
| numbers-14-7 | Ari (m) | ✗ | ✓ 4.71 | בָהּ |  |
| numbers-15-12 | Ari (m) | ✗ | ✓ 4.85 | אֲשֶׁר |  |
| numbers-15-31 | Ari (m) | ✗ | ✓ 4.52 | בָהּ |  |
| numbers-16-10 | Ari (m) | ✗ | ✓ 4.63 | וְאֶת, כָּל, אַחֶיךָ |  |
| numbers-18-9 | Ari (m) | ✗ | ✓ 4.59 | לִי | לְכָל |
| numbers-19-13 | Ari (m) | ✗ | ✓ 4.59 | בוֹ | בְּמֵת |
| numbers-2-17 | Ari (m) | ✗ | ✓ 4.6 | אִישׁ | וְנָסַע, יִסָּעוּ |
| numbers-20-24 | Ari (m) | ✗ | ✓ 4.57 | פִּי |  |
| numbers-20-3 | Ari (m) | ✗ | ✓ 4.59 | עִם | גָוַעְנוּ |
| numbers-20-8 | Ari (m) | ✗ | ✓ 4.6 | אֶת | בְּעִירָם |
| numbers-21-19 | Ari (m) | ✓ | ✗ 5.63 |  |  |
| numbers-26-46 | Ari (m) | ✓ | ✗ 3.89 |  |  |
| numbers-27-21 | Ari (m) | ✗ | ✓ 4.59 | אֲדֹנָי, הוּא | הוּא וְכָל |
| numbers-27-22 | Ari (m) | ✗ | ✓ 4.58 | וַיַּעַשׂ, מֹשֶׁה | (nothing) |
| numbers-29-25 | Ari (m) | ✗ | ✓ 4.55 | מִנְחָתָהּ | עִזִּים, מִנְחָתָהּ |
| numbers-3-13 | Ari (m) | ✗ | ✓ 4.57 | כָל, עַד | כִּי לִי כָּל בְּכוֹר, בְּכוֹר, לִי כָל בְּכוֹר |
| numbers-3-40 | Ari (m) | ✗ | ✓ 4.7 | וְשָׂא |  |
| numbers-31-44 | Ari (m) | ✗ | ✓ 4.63 | וּבָקָר | וּבָקָר |
| numbers-32-4 | Ari (m) | ✗ | ✓ 4.59 | הִוא | עֲדַת, הִוא |
| numbers-32-5 | Ari (m) | ✗ | ✓ 4.63 | אַל |  |
| numbers-32-9 | Ari (m) | ✗ | ✓ 4.62 | בֹא |  |
| numbers-33-28 | Ari (m) | ✗ | ✓ 5.08 | וַיִּסְעוּ | מִתָּרַח |
| numbers-34-17 | Ari (m) | ✗ | ✓ 4.64 | נוּן |  |
| numbers-35-23 | Ari (m) | ✗ | ✓ 4.59 | בְכָל | בְּלֹא |
| numbers-35-33 | Ari (m) | ✗ | ✓ 4.6 | אִם |  |
| numbers-4-5 | Ari (m) | ✗ | ✓ 4.83 | בָהּ | בִּנְסֹעַ, אֲרֹן |
| numbers-5-18 | Ari (m) | ✗ | ✓ 4.48 | הִוא | הִוא |
| numbers-5-27 | Ari (m) | ✗ | ✓ 4.62 | בָהּ | וַתִּמְעֹל |
| numbers-5-4 | Ari (m) | ✗ | ✓ 4.6 | עָשׂוּ |  |
| numbers-7-14 | Ari (m) | ✓ | ✗ 5.51 |  | אַחַת, עֲשָׂרָה |
| numbers-7-38 | Ari (m) | ✓ | ✗ 5.51 |  | אַחַת, עֲשָׂרָה |
| numbers-8-13 | Ari (m) | ✗ | ✓ 4.6 | לַאדֹנָי |  |
| numbers-8-22 | Ari (m) | ✗ | ✓ 4.59 | עַל |  |
| numbers-9-11 | Ari (m) | ✗ | ✓ 4.6 | עָשָׂר | בְּאַרְבָּעָה, עָשָׂר, הָעַרְבַּיִם |

## Fail words only

The sound and pace checks pass; the word recognizer wrote some words differently. Most are spelling: כָּל written כול, אַבְרָם written אברהם, the Torah's הִוא (read "hi") written היא. Some may be real.

| verse | voice | words |
|---|---|---|
| deuteronomy-1-18 | Noa (f) | תַּעֲשׂוּן |
| deuteronomy-1-23 | Noa (f) | וָאֶקַּח, לַשָּׁבֶט |
| deuteronomy-1-26 | Noa (f) | אֲבִיתֶם |
| deuteronomy-1-27 | Noa (f) | (nothing) |
| deuteronomy-1-33 | Noa (f) | הַהֹלֵךְ |
| deuteronomy-1-40 | Noa (f) | וּסְעוּ, סוּף |
| deuteronomy-1-7 | Noa (f) | וּסְעוּ |
| deuteronomy-10-11 | Noa (f) | וְיִרְשׁוּ |
| deuteronomy-10-13 | Noa (f) | מִצְוֹת |
| deuteronomy-10-14 | Noa (f) | הֵן, לַאדֹנָי |
| deuteronomy-10-15 | Noa (f) | מִכָּל |
| deuteronomy-10-22 | Noa (f) | לָרֹב |
| deuteronomy-10-3 | Noa (f) | וָאַעַשׂ, וָאַעַל |
| deuteronomy-10-7 | Noa (f) | נָסְעוּ |
| deuteronomy-11-13 | Noa (f) | מִצְוֹתַי |
| deuteronomy-11-14 | Noa (f) | דְגָנֶךָ וְתִירֹשְׁךָ וְיִצְהָרֶךָ |
| deuteronomy-11-16 | Noa (f) | הִשָּׁמְרוּ לָכֶם |
| deuteronomy-11-19 | Noa (f) | וְלִמַּדְתֶּם |
| deuteronomy-11-29 | Noa (f) | יְבִיאֲךָ, בָא |
| deuteronomy-11-3 | Noa (f) | וּלְכָל |
| deuteronomy-11-6 | Noa (f) | וַתִּבְלָעֵם, אָהֳלֵיהֶם |
| deuteronomy-11-8 | Noa (f) | כָּל |
| deuteronomy-11-9 | Noa (f) | וּלְזַרְעָם |
| deuteronomy-12-11 | Noa (f) | כָּל |
| deuteronomy-12-15 | Noa (f) | אַוַּת, וְכָאַיָּל |
| deuteronomy-12-17 | Noa (f) | וְנִדְבֹתֶיךָ |
| deuteronomy-12-21 | Noa (f) | יִבְחַר |
| deuteronomy-12-22 | Noa (f) | יַחְדָּו |
| deuteronomy-12-29 | Noa (f) | אַתָּה בָא |
| deuteronomy-12-30 | Noa (f) | הִשָּׁמְדָם |
| deuteronomy-12-31 | Noa (f) | בָאֵשׁ |
| deuteronomy-12-6 | Noa (f) | וַהֲבֵאתֶם, עֹלֹתֵיכֶם, מַעְשְׂרֹתֵיכֶם, יֶדְכֶם, וְנִדְבֹתֵיכֶם, בְּקַרְכֶם |
| deuteronomy-13-10 | Noa (f) | תַּהַרְגֶנּוּ |
| deuteronomy-13-11 | Noa (f) | וּסְקַלְתּוֹ בָאֲבָנִים, מֵאֶרֶץ |
| deuteronomy-13-16 | Noa (f) | הַכֵּה תַכֶּה אֶת |
| deuteronomy-13-17 | Noa (f) | בָאֵשׁ |
| deuteronomy-13-4 | Noa (f) | מְנַסֶּה, הֲיִשְׁכֶם |
| deuteronomy-13-5 | Noa (f) | מִצְוֹתָיו |
| deuteronomy-13-6 | Noa (f) | סָרָה, וְהַפֹּדְךָ, וּבִעַרְתָּ, הָרָע |
| deuteronomy-13-7 | Noa (f) | יְסִיתְךָ |
| deuteronomy-14-10 | Noa (f) | הוּא לָכֶם |
| deuteronomy-14-12 | Noa (f) | וְהָעָזְנִיָּה |
| deuteronomy-14-20 | Noa (f) | כָּל עוֹף |
| deuteronomy-14-21 | Noa (f) | עַם |
| deuteronomy-14-26 | Noa (f) | תְּאַוֶּה, תִּשְׁאָלְךָ |
| deuteronomy-14-28 | Noa (f) | כָּל |
| deuteronomy-14-29 | Noa (f) | וּבָא, הַלֵּוִי, וְאָכְלוּ, יְבָרֶכְךָ |
| deuteronomy-14-5 | Noa (f) | וּתְאוֹ, וָזָמֶר |
| deuteronomy-15-13 | Noa (f) | מֵעִמָּךְ |
| deuteronomy-15-23 | Noa (f) | תִּשְׁפְּכֶנּוּ |
| deuteronomy-15-6 | Noa (f) | וְהַעֲבַטְתָּ, תַעֲבֹט |
| deuteronomy-15-8 | Noa (f) | תַּעֲבִיטֶנּוּ |
| deuteronomy-16-10 | Noa (f) | יְבָרֶכְךָ |
| deuteronomy-16-3 | Noa (f) | בְחִפָּזוֹן |
| deuteronomy-17-12 | Noa (f) | בְזָדוֹן, לְבִלְתִּי |
| deuteronomy-18-11 | Noa (f) | וְיִדְּעֹנִי |
| deuteronomy-18-18 | Noa (f) | וְדִבֶּר |
| deuteronomy-19-14 | Noa (f) | תַסִּיג |
| deuteronomy-19-16 | Noa (f) | חָמָס, סָרָה |
| deuteronomy-19-18 | Noa (f) | בְאָחִיו |
| deuteronomy-19-21 | Noa (f) | וְלֹא, עֵינֶךָ |
| deuteronomy-19-5 | Noa (f) | בַיַּעַר, בַגַּרְזֶן, וָחָי |
| deuteronomy-2-10 | Noa (f) | וָרָם |
| deuteronomy-2-22 | Noa (f) | (nothing) |
| deuteronomy-2-24 | Noa (f) | רָשׁ, וְהִתְגָּר |
| deuteronomy-2-26 | Noa (f) | סִיחוֹן |
| deuteronomy-2-28 | Noa (f) | בְרַגְלָי |
| deuteronomy-2-32 | Noa (f) | יָהְצָה |
| deuteronomy-2-33 | Noa (f) | כָּל |
| deuteronomy-2-36 | Noa (f) | מֵעֲרֹעֵר |
| deuteronomy-2-5 | Noa (f) | כִּי |
| deuteronomy-2-9 | Noa (f) | עָר |
| deuteronomy-20-1 | Noa (f) | עִמָּךְ, הַמַּעַלְךָ |
| deuteronomy-20-14 | Noa (f) | בָעִיר |
| deuteronomy-20-6 | Noa (f) | יְחַלְּלֶנּוּ |
| deuteronomy-21-14 | Noa (f) | עִנִּיתָהּ |
| deuteronomy-21-18 | Noa (f) | סוֹרֵר |
| deuteronomy-21-3 | Noa (f) | הַהִוא |
| deuteronomy-21-6 | Noa (f) | הַהִוא, בַנָּחַל |
| deuteronomy-21-9 | Noa (f) | הַדָּם |
| deuteronomy-22-1 | Noa (f) | תְּשִׁיבֵם |
| deuteronomy-22-28 | Noa (f) | אֹרָשָׂה |
| deuteronomy-22-29 | Noa (f) | עִנָּהּ, שַׁלְּחָה, כָּל |
| deuteronomy-22-6 | Noa (f) | קַן |
| deuteronomy-22-9 | Noa (f) | פֶּן |
| deuteronomy-23-21 | Noa (f) | בָא |
| deuteronomy-23-22 | Noa (f) | מֵעִמָּךְ |
| deuteronomy-23-26 | Noa (f) | וְקָטַפְתָּ |
| deuteronomy-23-8 | Noa (f) | בְאַרְצוֹ |
| deuteronomy-24-10 | Noa (f) | בְרֵעֲךָ |
| deuteronomy-24-19 | Noa (f) | בְשָׂדֶךָ |
| deuteronomy-24-4 | Noa (f) | שִׁלְּחָהּ, לְאִשָּׁה, אַחֲרֵי, הֻטַּמָּאָה, תַחֲטִיא, לְךָ נַחֲלָה |
| deuteronomy-24-6 | Noa (f) | חֹבֵל |
| deuteronomy-24-7 | Noa (f) | וְהִתְעַמֶּר, וּבִעַרְתָּ, הָרָע |
| deuteronomy-24-8 | Noa (f) | הַצָּרַעַת |
| deuteronomy-25-1 | Noa (f) | אֲנָשִׁים, וְנִגְּשׁוּ |
| deuteronomy-25-5 | Noa (f) | וְיִבְּמָהּ |
| deuteronomy-25-7 | Noa (f) | אָבָה, יַבְּמִי |
| deuteronomy-25-9 | Noa (f) | וְנִגְּשָׁה |
| deuteronomy-26-11 | Noa (f) | בְכָל |
| deuteronomy-26-14 | Noa (f) | בְאֹנִי |
| deuteronomy-26-17 | Noa (f) | וּמִצְוֹתָיו |
| deuteronomy-26-9 | Noa (f) | וַיְבִאֵנוּ |
| deuteronomy-27-1 | Noa (f) | וַיְצַו |
| deuteronomy-27-10 | Noa (f) | מִצְוֹתָו |
| deuteronomy-27-11 | Noa (f) | וַיְצַו |
| deuteronomy-27-14 | Noa (f) | קוֹל רָם |
| deuteronomy-27-17 | Noa (f) | מַסִּיג |
| deuteronomy-27-8 | Noa (f) | בַּאֵר |
| deuteronomy-28-1 | Noa (f) | מִצְוֹתָיו |
| deuteronomy-28-13 | Noa (f) | מִצְוֹת |
| deuteronomy-28-14 | Noa (f) | מִכָּל |
| deuteronomy-28-15 | Noa (f) | כָּל, מִצְוֹתָיו, כָּל |
| deuteronomy-28-18 | Noa (f) | אֲלָפֶיךָ |
| deuteronomy-28-21 | Noa (f) | בָא |
| deuteronomy-28-30 | Noa (f) | תְאָרֵשׂ, תִּטַּע |
| deuteronomy-28-38 | Noa (f) | הָאַרְבֶּה |
| deuteronomy-28-45 | Noa (f) | מִצְוֹתָיו |
| deuteronomy-28-51 | Noa (f) | הִשָּׁמְדָךְ, אֲלָפֶיךָ |
| deuteronomy-28-55 | Noa (f) | אֹיִבְךָ |
| deuteronomy-28-56 | Noa (f) | וּבְבִתָּהּ |
| deuteronomy-28-57 | Noa (f) | הַיּוֹצֵת |
| deuteronomy-28-59 | Noa (f) | זַרְעֶךָ, וָחֳלָיִם |
| deuteronomy-28-60 | Noa (f) | מַדְוֵה, יָגֹרְתָּ, וְדָבְקוּ |
| deuteronomy-28-63 | Noa (f) | בָא |
| deuteronomy-28-66 | Noa (f) | תְּלֻאִים |
| deuteronomy-28-9 | Noa (f) | מִצְוֹת |
| deuteronomy-29-1 | Noa (f) | כָּל, כָּל, וּלְכָל, וּלְכָל |
| deuteronomy-29-11 | Noa (f) | כֹּרֵת |
| deuteronomy-29-18 | Noa (f) | סְפוֹת |
| deuteronomy-29-19 | Noa (f) | סְלֹחַ, יֶעְשַׁן |
| deuteronomy-29-24 | Noa (f) | בְּרִית, בְּהוֹצִיאוֹ |
| deuteronomy-29-26 | Noa (f) | וַיִּחַר, הַהִוא |
| deuteronomy-29-6 | Noa (f) | סִיחֹן |
| deuteronomy-29-7 | Noa (f) | לָראוּבֵנִי |
| deuteronomy-3-10 | Noa (f) | הַגִּלְעָד, הַבָּשָׁן |
| deuteronomy-3-11 | Noa (f) | עוֹג, הִוא |
| deuteronomy-3-14 | Noa (f) | חַוֹּת |
| deuteronomy-3-17 | Noa (f) | (nothing) |
| deuteronomy-3-21 | Noa (f) | הַהִוא, כָּל |
| deuteronomy-3-27 | Noa (f) | בְעֵינֶיךָ |
| deuteronomy-3-28 | Noa (f) | וְצַו אֶת |
| deuteronomy-3-4 | Noa (f) | עָרָיו, הַהִוא |
| deuteronomy-3-8 | Noa (f) | הַהִוא |
| deuteronomy-30-10 | Noa (f) | מִצְוֹתָיו, בְּכָל |
| deuteronomy-30-16 | Noa (f) | מִצְוֹתָיו, בָא, לְרִשְׁתָּהּ |
| deuteronomy-30-5 | Noa (f) | וְהִרְבְּךָ |
| deuteronomy-30-6 | Noa (f) | וּמָל |
| deuteronomy-30-7 | Noa (f) | כָּל |
| deuteronomy-30-8 | Noa (f) | מִצְוֹתָיו |
| deuteronomy-31-10 | Noa (f) | וַיְצַו |
| deuteronomy-31-12 | Noa (f) | הַקְהֵל, וְגֵרְךָ |
| deuteronomy-31-13 | Noa (f) | לְיִרְאָה |
| deuteronomy-31-14 | Noa (f) | וַיִּתְיַצְּבוּ |
| deuteronomy-31-16 | Noa (f) | הִנְּךָ, כָּרַתִּי |
| deuteronomy-31-18 | Noa (f) | הַסְתֵּר |
| deuteronomy-31-20 | Noa (f) | וְנִאֲצוּנִי |
| deuteronomy-31-27 | Noa (f) | עָרְפְּךָ |
| deuteronomy-31-29 | Noa (f) | לְהַכְעִיסוֹ |
| deuteronomy-31-7 | Noa (f) | וֶאֱמָץ |
| deuteronomy-31-8 | Noa (f) | תֵחָת |
| deuteronomy-31-9 | Noa (f) | אֲרוֹן, בְּרִית, יִשְׂרָאֵל |
| deuteronomy-32-10 | Noa (f) | כְּאִישׁוֹן |
| deuteronomy-32-14 | Noa (f) | עֵנָב |
| deuteronomy-32-15 | Noa (f) | אֱלוֹהַ |
| deuteronomy-32-16 | Noa (f) | יַקְנִאֻהוּ, יַכְעִיסֻהוּ |
| deuteronomy-32-20 | Noa (f) | אַסְתִּירָה |
| deuteronomy-32-21 | Noa (f) | כִּעֲסוּנִי בְּהַבְלֵיהֶם, אַכְעִיסֵם |
| deuteronomy-32-22 | Noa (f) | בְאַפִּי |
| deuteronomy-32-24 | Noa (f) | אֲשַׁלַּח |
| deuteronomy-32-26 | Noa (f) | אַפְאֵיהֶם, אַשְׁבִּיתָה |
| deuteronomy-32-28 | Noa (f) | תְּבוּנָה |
| deuteronomy-32-32 | Noa (f) | עֲנָבֵמוֹ, רוֹשׁ, אַשְׁכְּלֹת |
| deuteronomy-32-38 | Noa (f) | עֲלֵיכֶם סִתְרָה |
| deuteronomy-32-42 | Noa (f) | אַשְׁכִּיר, פַּרְעוֹת |
| deuteronomy-32-45 | Noa (f) | כָּל, כָּל |
| deuteronomy-32-50 | Noa (f) | בְּהֹר |
| deuteronomy-32-6 | Noa (f) | הֲ לַאדֹנָי |
| deuteronomy-33-2 | Noa (f) | אֵשׁ |
| deuteronomy-33-20 | Noa (f) | וּלְגָד, אַף קָדְקֹד |
| deuteronomy-33-23 | Noa (f) | שְׂבַע |
| deuteronomy-33-25 | Noa (f) | דָּבְאֶךָ |
| deuteronomy-33-28 | Noa (f) | יַעַרְפוּ |
| deuteronomy-33-6 | Noa (f) | מְתָיו |
| deuteronomy-33-8 | Noa (f) | וּלְלֵוִי |
| deuteronomy-34-12 | Noa (f) | כָּל |
| deuteronomy-34-4 | Noa (f) | בְעֵינֶיךָ |
| deuteronomy-34-7 | Noa (f) | כָהֲתָה |
| deuteronomy-34-8 | Noa (f) | אֵבֶל |
| deuteronomy-34-9 | Noa (f) | סָמַךְ |
| deuteronomy-4-10 | Noa (f) | וְאַשְׁמִעֵם |
| deuteronomy-4-12 | Noa (f) | הָאֵשׁ |
| deuteronomy-4-23 | Noa (f) | כָּרַת |
| deuteronomy-4-25 | Noa (f) | לְהַכְעִיסוֹ |
| deuteronomy-4-29 | Noa (f) | וּבִקַּשְׁתֶּם, וּבְכָל |
| deuteronomy-4-30 | Noa (f) | וְשָׁמַעְתָּ |
| deuteronomy-4-37 | Noa (f) | וְתַחַת |
| deuteronomy-4-40 | Noa (f) | מִצְוֹתָיו |
| deuteronomy-4-47 | Noa (f) | עוֹג |
| deuteronomy-4-48 | Noa (f) | מֵעֲרֹעֵר, שִׂיאֹן |
| deuteronomy-4-9 | Noa (f) | חַיֶּיךָ, וְהוֹדַעְתָּם |
| deuteronomy-5-18 | Noa (f) | תִתְאַוֶּה, וַאֲמָתוֹ |
| deuteronomy-5-26 | Noa (f) | מִצְוֹתַי |
| deuteronomy-5-28 | Noa (f) | כָּל |
| deuteronomy-5-3 | Noa (f) | אֵלֶּה, פֹה |
| deuteronomy-5-5 | Noa (f) | הַהִוא |
| deuteronomy-5-7 | Noa (f) | (nothing) |
| deuteronomy-5-9 | Noa (f) | עֲוֹן |
| deuteronomy-6-11 | Noa (f) | נָטָעְתָּ |
| deuteronomy-6-19 | Noa (f) | דִּבֶּר |
| deuteronomy-6-2 | Noa (f) | וּמִצְוֹתָיו, מְצַוֶּךָ |
| deuteronomy-6-8 | Noa (f) | וּקְשַׁרְתָּם |
| deuteronomy-7-18 | Noa (f) | זָכֹר תִּזְכֹּר |
| deuteronomy-7-22 | Noa (f) | וְנָשַׁל |
| deuteronomy-7-23 | Noa (f) | הִשָּׁמְדָם |
| deuteronomy-7-24 | Noa (f) | הִשְׁמִדְךָ |
| deuteronomy-7-9 | Noa (f) | מִצְוֹתָיו |
| deuteronomy-8-14 | Noa (f) | מִצְרַיִם |
| deuteronomy-8-16 | Noa (f) | יָדְעוּן |
| deuteronomy-8-2 | Noa (f) | הֹלִיכֲךָ, מִצְוֹתָיו |
| deuteronomy-8-20 | Noa (f) | מַאֲבִיד, בְּקוֹל |
| deuteronomy-8-3 | Noa (f) | וַיְעַנְּךָ, וַיַּרְעִבֶךָ, יָדְעוּן |
| deuteronomy-9-12 | Noa (f) | סָרוּ |
| deuteronomy-9-18 | Noa (f) | לְהַכְעִיסוֹ |
| deuteronomy-9-24 | Noa (f) | דַּעְתִּי |
| deuteronomy-9-8 | Noa (f) | וַיִּתְאַנַּף |
| exodus-1-15 | Noa (f) | לַמְיַלְּדֹת |
| exodus-1-17 | Noa (f) | עָשׂוּ |
| exodus-1-22 | Noa (f) | וַיְצַו, הַיְאֹרָה |
| exodus-1-7 | Noa (f) | בִּמְאֹד |
| exodus-10-17 | Noa (f) | וְהַעְתִּירוּ |
| exodus-10-18 | Noa (f) | וַיֶּעְתַּר |
| exodus-10-19 | Noa (f) | הָאַרְבֶּה, אַרְבֶּה |
| exodus-10-23 | Noa (f) | הָיָה אוֹר |
| exodus-10-24 | Noa (f) | פַרְעֹה, יֻצָּג |
| exodus-10-4 | Noa (f) | אַרְבֶּה |
| exodus-10-6 | Noa (f) | מֵעִם |
| exodus-11-7 | Noa (f) | תֵּדְעוּן |
| exodus-12-15 | Noa (f) | הָרִאשֹׁן |
| exodus-12-19 | Noa (f) | וּבְאֶזְרַח |
| exodus-12-27 | Noa (f) | וַיִּקֹּד, וַיִּשְׁתַּחֲוּוּ |
| exodus-12-3 | Noa (f) | כָּל, עֲדַת |
| exodus-12-31 | Noa (f) | צְּאוּ |
| exodus-12-4 | Noa (f) | יִמְעַט |
| exodus-12-47 | Noa (f) | עֲדַת |
| exodus-12-6 | Noa (f) | עֲדַת |
| exodus-12-7 | Noa (f) | וְלָקְחוּ |
| exodus-13-14 | Noa (f) | יִשְׁאָלְךָ |
| exodus-13-15 | Noa (f) | הִקְשָׁה, פַרְעֹה |
| exodus-13-20 | Noa (f) | וַיִּסְעוּ |
| exodus-14-12 | Noa (f) | בְמִצְרַיִם |
| exodus-14-17 | Noa (f) | וְאִכָּבְדָה |
| exodus-14-22 | Noa (f) | חֹמָה, מִימִינָם |
| exodus-14-29 | Noa (f) | בַיַּבָּשָׁה |
| exodus-14-4 | Noa (f) | וְאִכָּבְדָה |
| exodus-14-8 | Noa (f) | וַיִּרְדֹּף |
| exodus-15-1 | Noa (f) | אָשִׁירָה, גָאֹה, בַיָּם |
| exodus-15-10 | Noa (f) | נָשַׁפְתָּ בְרוּחֲךָ כִּסָּמוֹ |
| exodus-15-11 | Noa (f) | כָמֹכָה בָּאֵלִם, נֶאְדָּר |
| exodus-15-16 | Noa (f) | אֵימָתָה, יִדְּמוּ, כָּאָבֶן |
| exodus-15-17 | Noa (f) | תְּבִאֵמוֹ |
| exodus-15-19 | Noa (f) | בַיַּבָּשָׁה |
| exodus-15-2 | Noa (f) | (nothing), יָהּ, זֶה, אֵלִי, וַאֲרֹמְמֶנְהוּ |
| exodus-15-21 | Noa (f) | גָאֹה, בַיָּם |
| exodus-15-25 | Noa (f) | וַיִּצְעַק, וַיִּמְתְּקוּ, נִסָּהוּ |
| exodus-15-26 | Noa (f) | לְמִצְוֹתָיו, רֹפְאֶךָ |
| exodus-15-5 | Noa (f) | בִמְצוֹלֹת, אָבֶן |
| exodus-15-7 | Noa (f) | גְּאוֹנְךָ תַּהֲרֹס קָמֶיךָ תְּשַׁלַּח חֲרֹנְךָ יֹאכְלֵמוֹ |
| exodus-16-13 | Noa (f) | בָעֶרֶב, הַשְּׂלָו |
| exodus-16-14 | Noa (f) | הַטָּל |
| exodus-16-15 | Noa (f) | הוּא וַיֹּאמֶר |
| exodus-16-16 | Noa (f) | בְּאָהֳלוֹ |
| exodus-16-17 | Noa (f) | וְהַמַּמְעִיט |
| exodus-16-19 | Noa (f) | אִישׁ אַל |
| exodus-16-2 | Noa (f) | עֲדַת |
| exodus-16-3 | Noa (f) | בְיַד, כָּל |
| exodus-16-35 | Noa (f) | כְּנָעַן |
| exodus-16-36 | Noa (f) | עֲשִׂרִית |
| exodus-16-8 | Noa (f) | בְּתֵת |
| exodus-16-9 | Noa (f) | כָּל עֲדַת |
| exodus-17-1 | Noa (f) | עֲדַת |
| exodus-17-10 | Noa (f) | וְחוּר |
| exodus-17-11 | Noa (f) | עֲמָלֵק |
| exodus-17-12 | Noa (f) | בְיָדָיו |
| exodus-17-4 | Noa (f) | וַיִּצְעַק, מֹשֶׁה, אֶל, וּסְקָלֻנִי |
| exodus-17-5 | Noa (f) | וּמַטְּךָ, הַיְאֹר |
| exodus-18-1 | Noa (f) | כָּל |
| exodus-18-11 | Noa (f) | בַדָּבָר |
| exodus-18-19 | Noa (f) | אִיעָצְךָ |
| exodus-18-21 | Noa (f) | מִכָּל |
| exodus-18-23 | Noa (f) | וְצִוְּךָ, וְיָכָלְתָּ, עֲמֹד |
| exodus-18-25 | Noa (f) | מִכָּל |
| exodus-19-14 | Noa (f) | וַיְכַבְּסוּ |
| exodus-19-16 | Noa (f) | בַיּוֹם |
| exodus-19-17 | Noa (f) | וַיִּתְיַצְּבוּ |
| exodus-19-19 | Noa (f) | מְאֹד |
| exodus-19-23 | Noa (f) | בָּנוּ |
| exodus-2-16 | Noa (f) | צֹאן אֲבִיהֶן |
| exodus-2-23 | Noa (f) | בַיָּמִים, שַׁוְעָתָם |
| exodus-2-5 | Noa (f) | אֲמָתָהּ |
| exodus-20-13 | Noa (f) | בְרֵעֲךָ, עֵד |
| exodus-20-15 | Noa (f) | עָשֵׁן |
| exodus-20-16 | Noa (f) | פֶּן |
| exodus-20-22 | Noa (f) | וַתְּחַלְלֶהָ |
| exodus-21-12 | Noa (f) | מַכֵּה, אִישׁ, יוּמָת |
| exodus-21-13 | Noa (f) | אִנָּה |
| exodus-21-14 | Noa (f) | בְעָרְמָה |
| exodus-21-15 | Noa (f) | יוּמָת |
| exodus-21-16 | Noa (f) | בְיָדוֹ |
| exodus-21-18 | Noa (f) | אֲנָשִׁים, וְהִכָּה |
| exodus-21-22 | Noa (f) | אֲנָשִׁים |
| exodus-21-29 | Noa (f) | וְהוּעַד |
| exodus-21-3 | Noa (f) | וְיָצְאָה |
| exodus-21-34 | Noa (f) | לִבְעָלָיו |
| exodus-21-4 | Noa (f) | בְגַפּוֹ |
| exodus-21-6 | Noa (f) | אָזְנוֹ |
| exodus-22-11 | Noa (f) | מֵעִמּוֹ, לִבְעָלָיו |
| exodus-22-22 | Noa (f) | שָׁמֹעַ |
| exodus-22-25 | Noa (f) | תְּשִׁיבֶנּוּ |
| exodus-22-26 | Noa (f) | יִשְׁכָּב, וְשָׁמַעְתִּי |
| exodus-22-27 | Noa (f) | בְעַמְּךָ, תָאֹר |
| exodus-22-3 | Noa (f) | הִמָּצֵא, בְיָדוֹ, שֶׂה |
| exodus-22-4 | Noa (f) | יַבְעֶר |
| exodus-22-5 | Noa (f) | וּמָצְאָה |
| exodus-23-12 | Noa (f) | וַחֲמֹרֶךָ |
| exodus-23-26 | Noa (f) | אֲמַלֵּא |
| exodus-23-27 | Noa (f) | וְהַמֹּתִי |
| exodus-23-28 | Noa (f) | מִלְּפָנֶיךָ |
| exodus-23-32 | Noa (f) | לֹא, תִכְרֹת, בְּרִית |
| exodus-23-4 | Noa (f) | (nothing), תֹּעֶה, תְּשִׁיבֶנּוּ |
| exodus-24-10 | Noa (f) | וּכְעֶצֶם, לָטֹהַר |
| exodus-24-12 | Noa (f) | וְאֶתְּנָה, לְהוֹרֹתָם |
| exodus-24-9 | Noa (f) | וַאֲבִיהוּא |
| exodus-25-10 | Noa (f) | אַמָּתַיִם |
| exodus-25-17 | Noa (f) | אַמָּתַיִם |
| exodus-25-2 | Noa (f) | כָּל אִישׁ, יִדְּבֶנּוּ |
| exodus-25-23 | Noa (f) | אַמָּתַיִם |
| exodus-25-5 | Noa (f) | מְאָדָּמִים |
| exodus-26-1 | Noa (f) | יְרִיעֹת |
| exodus-26-16 | Noa (f) | הָאַמָּה |
| exodus-26-18 | Noa (f) | לִפְאַת |
| exodus-26-20 | Noa (f) | לִפְאַת |
| exodus-26-24 | Noa (f) | הָאֶחָת |
| exodus-26-7 | Noa (f) | יְרִיעֹת, עַשְׁתֵּי, יְרִיעֹת |
| exodus-26-9 | Noa (f) | הַיְרִיעֹת, הַיְרִיעֹת, הַיְרִיעָה |
| exodus-27-11 | Noa (f) | לִפְאַת |
| exodus-27-13 | Noa (f) | לִפְאַת |
| exodus-27-14 | Noa (f) | אַמָּה |
| exodus-27-7 | Noa (f) | אֹתוֹ |
| exodus-27-9 | Noa (f) | לִפְאַת, בָאַמָּה |
| exodus-28-1 | Noa (f) | בָּנָיו, וַאֲבִיהוּא, אֶלְעָזָר, וְאִיתָמָר |
| exodus-28-28 | Noa (f) | מִטַּבְּעֹתָיו |
| exodus-28-3 | Noa (f) | כָּל |
| exodus-28-38 | Noa (f) | עֲוֹן |
| exodus-28-43 | Noa (f) | עָוֹן |
| exodus-28-6 | Noa (f) | הָאֵפֹד |
| exodus-29-10 | Noa (f) | וְסָמַךְ |
| exodus-29-18 | Noa (f) | אִשֶּׁה |
| exodus-29-19 | Noa (f) | וְסָמַךְ |
| exodus-29-21 | Noa (f) | אַהֲרֹן, הוּא |
| exodus-29-32 | Noa (f) | בַּסָּל |
| exodus-29-40 | Noa (f) | וְעִשָּׂרֹן |
| exodus-29-42 | Noa (f) | אִוָּעֵד |
| exodus-29-46 | Noa (f) | לְשָׁכְנִי בְתוֹכָם |
| exodus-3-19 | Noa (f) | וְלֹא, בְּיָד |
| exodus-3-4 | Noa (f) | סָר |
| exodus-3-8 | Noa (f) | זָבַת, וּדְבָשׁ, וְהַחִוִּי |
| exodus-30-15 | Noa (f) | יַמְעִיט |
| exodus-30-18 | Noa (f) | כִּיּוֹר |
| exodus-30-2 | Noa (f) | (nothing), אָרְכּוֹ וְאַמָּה רָחְבּוֹ רָבוּעַ יִהְיֶה וְאַמָּתַיִם |
| exodus-30-21 | Noa (f) | וּלְזַרְעוֹ |
| exodus-30-26 | Noa (f) | וּמָשַׁחְתָּ, בוֹ |
| exodus-30-36 | Noa (f) | אִוָּעֵד |
| exodus-30-4 | Noa (f) | צַלְעֹתָיו |
| exodus-31-15 | Noa (f) | שַׁבָּתוֹן |
| exodus-31-17 | Noa (f) | אוֹת, הִוא |
| exodus-31-2 | Noa (f) | חוּר לְמַטֵּה |
| exodus-32-1 | Noa (f) | וַיַּרְא הָעָם כִּי, (nothing), הָעָם, אַהֲרֹן, קוּם עֲשֵׂה, מֶה הָיָה לוֹ |
| exodus-32-10 | Noa (f) | וְיִחַר |
| exodus-32-13 | Noa (f) | אַרְבֶּה |
| exodus-32-16 | Noa (f) | וְהַלֻּחֹת |
| exodus-32-17 | Noa (f) | בְּרֵעֹה |
| exodus-32-19 | Noa (f) | וַיִּחַר |
| exodus-32-22 | Noa (f) | כִּי בְרָע הוּא |
| exodus-32-24 | Noa (f) | וָאַשְׁלִכֵהוּ, בָאֵשׁ |
| exodus-32-30 | Noa (f) | אֶעֱלֶה, אֲדֹנָי, אֲכַפְּרָה |
| exodus-32-8 | Noa (f) | סָרוּ |
| exodus-33-10 | Noa (f) | אָהֳלוֹ |
| exodus-33-12 | Noa (f) | בְשֵׁם |
| exodus-33-14 | Noa (f) | יֵלֵכוּ וַהֲנִחֹתִי לָךְ |
| exodus-33-19 | Noa (f) | בְשֵׁם |
| exodus-33-20 | Noa (f) | יִרְאַנִי |
| exodus-33-21 | Noa (f) | הִנֵּה, מָקוֹם |
| exodus-33-22 | Noa (f) | כְּבֹדִי וְשַׂמְתִּיךָ |
| exodus-33-3 | Noa (f) | אֶעֱלֶה |
| exodus-33-4 | Noa (f) | וַיִּתְאַבָּלוּ |
| exodus-33-5 | Noa (f) | אֶעֱלֶה, וְאֵדְעָה |
| exodus-33-6 | Noa (f) | וַיִּתְנַצְּלוּ |
| exodus-33-8 | Noa (f) | אָהֳלוֹ |
| exodus-34-15 | Noa (f) | פֶּן, תִּכְרֹת |
| exodus-34-20 | Noa (f) | בְשֶׂה |
| exodus-34-30 | Noa (f) | קָרַן |
| exodus-34-35 | Noa (f) | קָרַן |
| exodus-35-1 | Noa (f) | וַיַּקְהֵל, עֲדַת |
| exodus-35-10 | Noa (f) | כָּל |
| exodus-35-11 | Noa (f) | אָהֳלוֹ |
| exodus-35-15 | Noa (f) | בַּדָּיו |
| exodus-35-20 | Noa (f) | עֲדַת |
| exodus-35-21 | Noa (f) | וּלְכָל |
| exodus-35-23 | Noa (f) | אֵילִם, מְאָדָּמִים, תְּחָשִׁים |
| exodus-35-31 | Noa (f) | וּבְכָל |
| exodus-35-34 | Noa (f) | וְאָהֳלִיאָב, אֲחִיסָמָךְ |
| exodus-35-35 | Noa (f) | וְאֹרֵג |
| exodus-35-7 | Noa (f) | מְאָדָּמִים |
| exodus-35-8 | Noa (f) | וְשֶׁמֶן, וּבְשָׂמִים |
| exodus-36-1 | Noa (f) | וְאָהֳלִיאָב |
| exodus-36-10 | Noa (f) | הַיְרִיעֹת, יְרִיעֹת |
| exodus-36-11 | Noa (f) | הַיְרִיעָה, הַיְרִיעָה |
| exodus-36-15 | Noa (f) | לְעַשְׁתֵּי |
| exodus-36-16 | Noa (f) | הַיְרִיעֹת, הַיְרִיעֹת |
| exodus-36-23 | Noa (f) | לִפְאַת |
| exodus-36-25 | Noa (f) | וּלְצֶלַע, לִפְאַת |
| exodus-36-31 | Noa (f) | הָאֶחָת |
| exodus-36-33 | Noa (f) | וַיַּעַשׂ |
| exodus-36-38 | Noa (f) | וָוֵיהֶם, וְצִפָּה, רָאשֵׁיהֶם |
| exodus-36-9 | Noa (f) | הַיְרִיעָה, הַיְרִיעָה, הַיְרִיעֹת |
| exodus-37-1 | Noa (f) | אַמָּתַיִם |
| exodus-37-10 | Noa (f) | אַמָּתַיִם |
| exodus-37-16 | Noa (f) | הַקְּשָׂוֹת |
| exodus-37-25 | Noa (f) | וְאַמָּתַיִם |
| exodus-37-6 | Noa (f) | אַמָּתַיִם |
| exodus-38-11 | Noa (f) | בָאַמָּה |
| exodus-38-15 | Noa (f) | הֶחָצֵר |
| exodus-38-18 | Noa (f) | בְרֹחַב |
| exodus-38-21 | Noa (f) | הַלְוִּיִּם |
| exodus-38-28 | Noa (f) | הָאֶלֶף, וַחֲמִשָּׁה, עָשָׂה וָוִים |
| exodus-38-29 | Noa (f) | וְאַלְפַּיִם |
| exodus-38-5 | Noa (f) | הַקְּצָוֹת |
| exodus-38-6 | Noa (f) | הַבַּדִּים |
| exodus-38-9 | Noa (f) | מֵאָה בָּאַמָּה |
| exodus-39-14 | Noa (f) | שְׁתֵּים |
| exodus-39-20 | Noa (f) | וַיִּתְּנֻם |
| exodus-39-21 | Noa (f) | מִטַּבְּעֹתָיו, בִּפְתִיל |
| exodus-39-23 | Noa (f) | הַמְּעִיל, לְפִיו, סָבִיב |
| exodus-39-25 | Noa (f) | הַמְּעִיל |
| exodus-39-27 | Noa (f) | אֹרֵג |
| exodus-39-3 | Noa (f) | תּוֹלַעַת |
| exodus-39-31 | Noa (f) | פְּתִיל |
| exodus-39-36 | Noa (f) | לֶחֶם |
| exodus-39-43 | Noa (f) | וַיַּרְא, אֹתָם |
| exodus-4-12 | Noa (f) | אֶהְיֶה |
| exodus-4-18 | Noa (f) | אֵלֲכָה |
| exodus-4-26 | Noa (f) | אָמְרָה חֲתַן, לַמּוּלֹת |
| exodus-4-31 | Noa (f) | עָנְיָם |
| exodus-4-6 | Noa (f) | כַּשָּׁלֶג |
| exodus-40-2 | Noa (f) | מִשְׁכַּן, אֹהֶל |
| exodus-40-3 | Noa (f) | הַפָּרֹכֶת |
| exodus-40-34 | Noa (f) | הֶעָנָן |
| exodus-40-9 | Noa (f) | כָּל, כָּל |
| exodus-5-14 | Noa (f) | פַרְעֹה, כִלִּיתֶם |
| exodus-5-16 | Noa (f) | עֲשׂוּ |
| exodus-5-6 | Noa (f) | וַיְצַו |
| exodus-5-7 | Noa (f) | כִּתְמוֹל |
| exodus-6-1 | Noa (f) | בְיָד |
| exodus-6-12 | Noa (f) | פַרְעֹה, עֲרַל |
| exodus-6-14 | Noa (f) | וּפַלּוּא |
| exodus-6-23 | Noa (f) | אֲבִיהוּא |
| exodus-6-29 | Noa (f) | כָּל |
| exodus-6-3 | Noa (f) | וָאֵרָא אֶל |
| exodus-6-9 | Noa (f) | שָׁמְעוּ |
| exodus-7-10 | Noa (f) | וַיְהִי |
| exodus-7-17 | Noa (f) | בַּיְאֹר |
| exodus-7-23 | Noa (f) | לָזֹאת |
| exodus-7-25 | Noa (f) | הַיְאֹר |
| exodus-7-4 | Noa (f) | יִשְׁמַע, בִּשְׁפָטִים |
| exodus-8-1 | Noa (f) | בְּמַטֶּךָ, וְהַעַל |
| exodus-8-11 | Noa (f) | וַיַּרְא, פַּרְעֹה, הָרְוָחָה וְהַכְבֵּד |
| exodus-8-13 | Noa (f) | בְמַטֵּהוּ, הָיָה כִנִּים בְּכָל |
| exodus-8-18 | Noa (f) | בַיּוֹם |
| exodus-8-20 | Noa (f) | עָרֹב |
| exodus-8-24 | Noa (f) | אֲשַׁלַּח |
| exodus-8-25 | Noa (f) | וְסָר |
| exodus-8-26 | Noa (f) | וַיֶּעְתַּר |
| exodus-9-16 | Noa (f) | הַרְאֹתְךָ, בְּכָל |
| exodus-9-17 | Noa (f) | עוֹדְךָ |
| exodus-9-2 | Noa (f) | וְעוֹדְךָ |
| exodus-9-24 | Noa (f) | בְּכָל |
| exodus-9-3 | Noa (f) | הוֹיָה |
| exodus-9-31 | Noa (f) | גִּבְעֹל |
| genesis-1-10 | Noa (f) | וּלְמִקְוֵה, וַיַּרְא |
| genesis-1-14 | Noa (f) | וְהָיוּ |
| genesis-1-15 | Noa (f) | לִמְאוֹרֹת בִּרְקִיעַ, לְהָאִיר עַל |
| genesis-1-16 | Noa (f) | הַכּוֹכָבִים |
| genesis-1-26 | Noa (f) | בִדְגַת |
| genesis-1-27 | Noa (f) | זָכָר |
| genesis-1-28 | Noa (f) | וַיְבָרֶךְ, וְכִבְשֻׁהָ, בִּדְגַת |
| genesis-1-5 | Noa (f) | בֹקֶר |
| genesis-1-8 | Noa (f) | שָׁמָיִם |
| genesis-1-9 | Noa (f) | יִקָּווּ |
| genesis-10-15 | Noa (f) | חֵת |
| genesis-10-2 | Noa (f) | וְיָוָן |
| genesis-10-22 | Noa (f) | וְאַרְפַּכְשַׁד |
| genesis-10-23 | Noa (f) | עוּץ |
| genesis-10-25 | Noa (f) | בְיָמָיו |
| genesis-10-31 | Noa (f) | לִלְשֹׁנֹתָם |
| genesis-10-6 | Noa (f) | וּכְנָעַן |
| genesis-10-7 | Noa (f) | סְבָא |
| genesis-11-12 | Noa (f) | וְאַרְפַּכְשַׁד |
| genesis-11-13 | Noa (f) | אַרְפַּכְשַׁד |
| genesis-11-18 | Noa (f) | רְעוּ |
| genesis-11-2 | Noa (f) | בְּנָסְעָם, (nothing), בִקְעָה, בְּאֶרֶץ, שִׁנְעָר, וַיֵּשְׁבוּ |
| genesis-11-29 | Noa (f) | אַבְרָם, אַבְרָם, יִסְכָּה |
| genesis-11-7 | Noa (f) | רֵעֵהוּ |
| genesis-12-10 | Noa (f) | אַבְרָם, לָגוּר |
| genesis-12-12 | Noa (f) | יְחַיּוּ |
| genesis-12-13 | Noa (f) | אֲחֹתִי אָתְּ |
| genesis-12-19 | Noa (f) | (nothing), וָאֶקַּח |
| genesis-12-20 | Noa (f) | וַיְצַו, כָּל |
| genesis-12-3 | Noa (f) | וַאֲבָרֲכָה, אָאֹר |
| genesis-12-4 | Noa (f) | אַבְרָם, מֵחָרָן |
| genesis-12-9 | Noa (f) | אַבְרָם |
| genesis-13-1 | Noa (f) | אַבְרָם |
| genesis-13-10 | Noa (f) | צֹעַר |
| genesis-13-11 | Noa (f) | וַיִּסַּע |
| genesis-13-12 | Noa (f) | אַבְרָם, בְּעָרֵי, וַיֶּאֱהַל |
| genesis-13-14 | Noa (f) | אַבְרָם, מֵעִמּוֹ |
| genesis-13-15 | Noa (f) | אֶתְּנֶנָּה |
| genesis-13-18 | Noa (f) | וַיֶּאֱהַל, אַבְרָם, בְּאֵלֹנֵי |
| genesis-13-2 | Noa (f) | וְאַבְרָם |
| genesis-13-3 | Noa (f) | אָהֳלוֹ |
| genesis-13-4 | Noa (f) | אַבְרָם |
| genesis-13-8 | Noa (f) | אַבְרָם, לוֹט אַל נָא |
| genesis-13-9 | Noa (f) | וְאַשְׂמְאִילָה |
| genesis-14-1 | Noa (f) | מֶלֶךְ שִׁנְעָר אַרְיוֹךְ מֶלֶךְ אֶלָּסָר כְּדָרְלָעֹמֶר מֶלֶךְ, וְתִדְעָל |
| genesis-14-14 | Noa (f) | אַבְרָם |
| genesis-14-20 | Noa (f) | וַיִּתֶּן |
| genesis-14-22 | Noa (f) | אַבְרָם |
| genesis-14-23 | Noa (f) | אַבְרָם |
| genesis-14-24 | Noa (f) | עָנֵר |
| genesis-14-3 | Noa (f) | הַשִּׂדִּים הוּא |
| genesis-14-8 | Noa (f) | אַדְמָה, הִוא, וַיַּעַרְכוּ, הַשִּׂדִּים |
| genesis-14-9 | Noa (f) | מֶלֶךְ שִׁנְעָר וְאַרְיוֹךְ מֶלֶךְ אֶלָּסָר |
| genesis-15-1 | Noa (f) | אַבְרָם, אַבְרָם, שְׂכָרְךָ |
| genesis-15-16 | Noa (f) | עֲוֹן |
| genesis-15-18 | Noa (f) | אַבְרָם |
| genesis-15-2 | Noa (f) | אַבְרָם |
| genesis-15-21 | Noa (f) | וְאֶת, וְאֶת, וְאֶת, וְאֶת, הַיְבוּסִי |
| genesis-15-3 | Noa (f) | אַבְרָם, הֵן |
| genesis-15-5 | Noa (f) | זַרְעֶךָ |
| genesis-15-6 | Noa (f) | וַיַּחְשְׁבֶהָ |
| genesis-15-9 | Noa (f) | קְחָה לִי עֶגְלָה |
| genesis-16-10 | Noa (f) | (nothing), אַרְבֶּה |
| genesis-16-2 | Noa (f) | אַבְרָם, אִבָּנֶה, אַבְרָם |
| genesis-16-3 | Noa (f) | אַבְרָם, אַבְרָם |
| genesis-16-5 | Noa (f) | אַבְרָם, הָרָתָה, בֵּינִי, וּבֵינֶיךָ |
| genesis-16-6 | Noa (f) | אַבְרָם |
| genesis-16-8 | Noa (f) | בָאת |
| genesis-17-1 | Noa (f) | אַבְרָם, אַבְרָם |
| genesis-17-12 | Noa (f) | יִמּוֹל, מִזַּרְעֲךָ |
| genesis-17-14 | Noa (f) | וְעָרֵל, עָרְלָתוֹ, הֵפַר |
| genesis-17-16 | Noa (f) | עַמִּים |
| genesis-17-2 | Noa (f) | וְאֶתְּנָה, בִּמְאֹד |
| genesis-17-24 | Noa (f) | עָרְלָתוֹ |
| genesis-17-3 | Noa (f) | אַבְרָם |
| genesis-17-5 | Noa (f) | אַבְרָם, נְתַתִּיךָ |
| genesis-17-6 | Noa (f) | אֹתְךָ, מְאֹד |
| genesis-17-8 | Noa (f) | כָּל |
| genesis-18-11 | Noa (f) | בָּאִים |
| genesis-18-13 | Noa (f) | לֵאמֹר |
| genesis-18-15 | Noa (f) | יָרֵאָה |
| genesis-18-21 | Noa (f) | אֵדָעָה |
| genesis-18-25 | Noa (f) | כַצַדִּיק כָּרָשָׁע |
| genesis-18-30 | Noa (f) | יִחַר |
| genesis-18-32 | Noa (f) | עֲשָׂרָה, הָעֲשָׂרָה |
| genesis-19-14 | Noa (f) | צְּאוּ |
| genesis-19-15 | Noa (f) | בַּעֲוֹן |
| genesis-19-16 | Noa (f) | וַיֹּצִאֻהוּ |
| genesis-19-19 | Noa (f) | וָמַתִּי |
| genesis-19-2 | Noa (f) | כִּי, בָרְחוֹב |
| genesis-19-22 | Noa (f) | הִמָּלֵט, צוֹעַר |
| genesis-19-23 | Noa (f) | יָצָא, בָּא, צֹעֲרָה |
| genesis-19-29 | Noa (f) | הַהֲפֵכָה |
| genesis-19-30 | Noa (f) | מִצּוֹעַר, בְּצוֹעַר |
| genesis-19-38 | Noa (f) | הוּא |
| genesis-19-4 | Noa (f) | מִנַּעַר |
| genesis-19-7 | Noa (f) | אַחַי |
| genesis-19-9 | Noa (f) | בָאִישׁ |
| genesis-2-14 | Noa (f) | פְרָת |
| genesis-2-16 | Noa (f) | וַיְצַו |
| genesis-2-17 | Noa (f) | וָרָע |
| genesis-2-22 | Noa (f) | וַיְבִאֶהָ |
| genesis-2-25 | Noa (f) | עֲרוּמִּים |
| genesis-2-3 | Noa (f) | מִכָּל |
| genesis-2-5 | Noa (f) | וְאָדָם אַיִן |
| genesis-2-8 | Noa (f) | וַיִּטַּע |
| genesis-2-9 | Noa (f) | הַדַּעַת |
| genesis-20-16 | Noa (f) | לְאָחִיךְ |
| genesis-20-17 | Noa (f) | וְאַמְהֹתָיו |
| genesis-20-5 | Noa (f) | (nothing), (nothing) |
| genesis-20-9 | Noa (f) | (nothing), וַיֹּאמֶר, חֲטָאָה, יֵעָשׂוּ |
| genesis-21-12 | Noa (f) | בְיִצְחָק |
| genesis-21-13 | Noa (f) | אֲשִׂימֶנּוּ |
| genesis-21-15 | Noa (f) | וַיִּכְלוּ |
| genesis-21-17 | Noa (f) | מַה לָּךְ |
| genesis-21-19 | Noa (f) | הַנָּעַר |
| genesis-21-20 | Noa (f) | קַשָּׁת |
| genesis-21-33 | Noa (f) | וַיִּטַּע |
| genesis-21-7 | Noa (f) | הֵינִיקָה, לִזְקֻנָיו |
| genesis-21-8 | Noa (f) | הִגָּמֵל |
| genesis-22-1 | Noa (f) | נִסָּה |
| genesis-22-11 | Noa (f) | מַלְאַךְ |
| genesis-22-18 | Noa (f) | בְזַרְעֲךָ |
| genesis-22-20 | Noa (f) | לְנָחוֹר |
| genesis-22-23 | Noa (f) | שְׁמֹנָה אֵלֶּה |
| genesis-22-24 | Noa (f) | (nothing) |
| genesis-22-6 | Noa (f) | וַיֵּלְכוּ, שְׁנֵיהֶם |
| genesis-22-8 | Noa (f) | הַשֶּׂה |
| genesis-23-12 | Noa (f) | וַיִּשְׁתַּחוּ |
| genesis-23-13 | Noa (f) | אִם אַתָּה לוּ, וְאֶקְבְּרָה |
| genesis-23-20 | Noa (f) | חֵת |
| genesis-24-13 | Noa (f) | יֹצְאֹת |
| genesis-24-17 | Noa (f) | הַגְמִיאִינִי |
| genesis-24-21 | Noa (f) | הַהִצְלִיחַ |
| genesis-24-24 | Noa (f) | מִלְכָּה |
| genesis-24-3 | Noa (f) | וְאַשְׁבִּיעֲךָ |
| genesis-24-30 | Noa (f) | כִּרְאֹת |
| genesis-24-45 | Noa (f) | הָעַיְנָה |
| genesis-24-46 | Noa (f) | הִשְׁקָתָה |
| genesis-24-47 | Noa (f) | בְּתוּאֵל |
| genesis-24-5 | Noa (f) | הֶהָשֵׁב |
| genesis-24-54 | Noa (f) | הוּא |
| genesis-24-59 | Noa (f) | אֲחֹתָם |
| genesis-24-60 | Noa (f) | הֲיִי, שֹׂנְאָיו |
| genesis-24-67 | Noa (f) | וַיְבִאֶהָ, שָׂרָה, וַיֶּאֱהָבֶהָ |
| genesis-25-13 | Noa (f) | וְאַדְבְּאֵל |
| genesis-25-21 | Noa (f) | וַיֶּעְתַּר, כִּי עֲקָרָה |
| genesis-25-27 | Noa (f) | עֵשָׂו |
| genesis-25-28 | Noa (f) | וַיֶּאֱהַב |
| genesis-25-29 | Noa (f) | וַיָּזֶד |
| genesis-25-33 | Noa (f) | הִשָּׁבְעָה, וַיִּמְכֹּר |
| genesis-25-4 | Noa (f) | עֵיפָה |
| genesis-26-10 | Noa (f) | אָשָׁם |
| genesis-26-11 | Noa (f) | מוֹת יוּמָת |
| genesis-26-18 | Noa (f) | וַיְסַתְּמוּם |
| genesis-26-7 | Noa (f) | הִוא |
| genesis-26-9 | Noa (f) | אִשְׁתְּךָ הִוא וְאֵיךְ, הִוא, אָמוּת |
| genesis-27-1 | Noa (f) | מֵרְאֹת |
| genesis-27-10 | Noa (f) | בַּעֲבֻר, יְבָרֶכְךָ |
| genesis-27-13 | Noa (f) | וְלֵךְ |
| genesis-27-20 | Noa (f) | הִקְרָה |
| genesis-27-3 | Noa (f) | וְעַתָּה שָׂא נָא כֵלֶיךָ תֶּלְיְךָ וְקַשְׁתֶּךָ וְצֵא, לִּי צָיִד |
| genesis-27-30 | Noa (f) | אַךְ יָצֹא |
| genesis-27-36 | Noa (f) | הֲכִי |
| genesis-27-37 | Noa (f) | סְמַכְתִּיו וּלְכָה |
| genesis-27-38 | Noa (f) | וַיֵּבְךְּ |
| genesis-27-4 | Noa (f) | וְהָבִיאָה, תְּבָרֶכְךָ |
| genesis-27-40 | Noa (f) | עֻלּוֹ |
| genesis-27-46 | Noa (f) | בְחַיַּי |
| genesis-28-14 | Noa (f) | וּבְזַרְעֶךָ |
| genesis-28-16 | Noa (f) | יָדָעְתִּי |
| genesis-28-2 | Noa (f) | בְתוּאֵל |
| genesis-28-20 | Noa (f) | אִם |
| genesis-28-22 | Noa (f) | אֲעַשְּׂרֶנּוּ |
| genesis-28-5 | Noa (f) | אֲרָם, אֵם |
| genesis-28-6 | Noa (f) | וַיְצַו |
| genesis-29-11 | Noa (f) | וַיִּשַּׁק, וַיִּשָּׂא, וַיֵּבְךְּ |
| genesis-29-12 | Noa (f) | הוּא וְכִי, הוּא וַתָּרָץ |
| genesis-29-13 | Noa (f) | וַיְבִיאֵהוּ |
| genesis-29-18 | Noa (f) | וַיֶּאֱהַב, אֶעֱבָדְךָ |
| genesis-29-2 | Noa (f) | הַהִוא |
| genesis-29-20 | Noa (f) | בְעֵינָיו |
| genesis-29-26 | Noa (f) | הַצְּעִירָה |
| genesis-29-27 | Noa (f) | וְנִתְּנָה |
| genesis-29-28 | Noa (f) | שְׁבֻעַ |
| genesis-29-32 | Noa (f) | יֶאֱהָבַנִי |
| genesis-29-35 | Noa (f) | אוֹדֶה, קָרְאָה |
| genesis-29-9 | Noa (f) | (nothing) |
| genesis-3-10 | Noa (f) | וָאִירָא |
| genesis-3-12 | Noa (f) | (nothing) |
| genesis-3-16 | Noa (f) | אַרְבֶּה, וְהֵרֹנֵךְ |
| genesis-30-1 | Noa (f) | הָבָה |
| genesis-30-16 | Noa (f) | בְּדוּדָאֵי |
| genesis-30-18 | Noa (f) | שְׂכָרִי, יִשָׂשכָר |
| genesis-30-3 | Noa (f) | וְאִבָּנֶה |
| genesis-30-30 | Noa (f) | מְעַט, לָרֹב |
| genesis-30-32 | Noa (f) | וְכָל |
| genesis-30-33 | Noa (f) | שְׂכָרִי |
| genesis-30-39 | Noa (f) | וַתֵּלַדְןָ הַצֹּאן, וּטְלֻאִים |
| genesis-30-4 | Noa (f) | בִּלְהָה |
| genesis-30-6 | Noa (f) | (nothing), וַיִּתֶּן |
| genesis-31-20 | Noa (f) | הָאֲרַמִּי |
| genesis-31-28 | Noa (f) | הִסְכַּלְתָּ |
| genesis-31-29 | Noa (f) | אֲבִיכֶם |
| genesis-31-3 | Noa (f) | וְאֶהְיֶה |
| genesis-31-34 | Noa (f) | וַתְּשִׂמֵם |
| genesis-31-40 | Noa (f) | בַיּוֹם, וַתִּדַּד, מֵעֵינָי |
| genesis-31-5 | Noa (f) | (nothing) |
| genesis-31-6 | Noa (f) | אֲבִיכֶן |
| genesis-31-7 | Noa (f) | מַשְׂכֻּרְתִּי |
| genesis-31-8 | Noa (f) | שְׂכָרֶךָ, עֲקֻדִּים, שְׂכָרֶךָ, עֲקֻדִּים |
| genesis-32-10 | Noa (f) | וְאֵיטִיבָה |
| genesis-32-11 | Noa (f) | וּמִכָּל, בְמַקְלִי |
| genesis-32-13 | Noa (f) | אֵיטִיב |
| genesis-32-15 | Noa (f) | וּתְיָשִׁים |
| genesis-32-16 | Noa (f) | וַעְיָרִם |
| genesis-32-25 | Noa (f) | עֲלוֹת |
| genesis-32-29 | Noa (f) | וַתּוּכָל |
| genesis-32-30 | Noa (f) | וַיְבָרֶךְ |
| genesis-32-5 | Noa (f) | וַיְצַו |
| genesis-32-9 | Noa (f) | וְהִכָּהוּ |
| genesis-33-17 | Noa (f) | נָסַע |
| genesis-33-19 | Noa (f) | בְּנֵי חֲמוֹר אֲבִי שְׁכֶם |
| genesis-33-4 | Noa (f) | וַיְחַבְּקֵהוּ |
| genesis-34-10 | Noa (f) | וּסְחָרוּהָ |
| genesis-34-12 | Noa (f) | וְאֶתְּנָה |
| genesis-34-2 | Noa (f) | וַיְעַנֶּהָ |
| genesis-34-25 | Noa (f) | בַיּוֹם |
| genesis-34-30 | Noa (f) | עֲכַרְתֶּם, וְהִכּוּנִי |
| genesis-35-11 | Noa (f) | גּוֹיִם, וּמְלָכִים |
| genesis-35-19 | Noa (f) | הִוא |
| genesis-35-2 | Noa (f) | וְהִטַּהֲרוּ |
| genesis-35-20 | Noa (f) | קְבֻרַת, רָחֵל |
| genesis-35-21 | Noa (f) | מֵהָלְאָה |
| genesis-35-22 | Noa (f) | הַהִוא |
| genesis-35-27 | Noa (f) | (nothing) |
| genesis-35-6 | Noa (f) | כְּנַעַן |
| genesis-36-1 | Noa (f) | עֵשָׂו הוּא |
| genesis-36-11 | Noa (f) | וְגַעְתָּם |
| genesis-36-12 | Noa (f) | עָדָה |
| genesis-36-14 | Noa (f) | אָהֳלִיבָמָה, עֲנָה, יַעְלָם |
| genesis-36-16 | Noa (f) | גַּעְתָּם |
| genesis-36-17 | Noa (f) | רְעוּאֵל, רְעוּאֵל |
| genesis-36-18 | Noa (f) | אָהֳלִיבָמָה, יַעְלָם, אָהֳלִיבָמָה |
| genesis-36-2 | Noa (f) | אָהֳלִיבָמָה |
| genesis-36-21 | Noa (f) | הַחֹרִי |
| genesis-36-23 | Noa (f) | עַלְוָן |
| genesis-36-28 | Noa (f) | דִישָׁן עוּץ וַאֲרָן |
| genesis-36-30 | Noa (f) | הַחֹרִי |
| genesis-36-38 | Noa (f) | וַיָּמָת שָׁאוּל וַיִּמְלֹךְ, בַּעַל, עַכְבּוֹר |
| genesis-36-41 | Noa (f) | אָהֳלִיבָמָה |
| genesis-36-5 | Noa (f) | וְאָהֳלִיבָמָה, יָלְדָה, יַעְלָם |
| genesis-37-17 | Noa (f) | נָסְעוּ, וַיִּמְצָאֵם |
| genesis-37-18 | Noa (f) | לַהֲמִיתוֹ |
| genesis-37-20 | Noa (f) | וְנַשְׁלִכֵהוּ |
| genesis-37-27 | Noa (f) | אָחִינוּ |
| genesis-37-32 | Noa (f) | הִוא |
| genesis-37-33 | Noa (f) | אֲכָלָתְהוּ |
| genesis-37-35 | Noa (f) | וַיְמָאֵן, וַיֵּבְךְּ |
| genesis-38-1 | Noa (f) | וַיֵּרֶד, מֵאֵת, עַד |
| genesis-38-17 | Noa (f) | אֲשַׁלַּח |
| genesis-38-22 | Noa (f) | וַיָּשָׁב, וַיֹּאמֶר, וְגַם אַנְשֵׁי הַמָּקוֹם |
| genesis-38-28 | Noa (f) | בְלִדְתָּהּ, שָׁנִי |
| genesis-38-5 | Noa (f) | וְהָיָה, בִכְזִיב |
| genesis-38-8 | Noa (f) | וְהָקֵם |
| genesis-39-1 | Noa (f) | מִצְרָיְמָה |
| genesis-39-19 | Noa (f) | וַיִּחַר, אַפּוֹ |
| genesis-39-7 | Noa (f) | אֶל |
| genesis-39-9 | Noa (f) | מְאוּמָה |
| genesis-4-17 | Noa (f) | וַתַּהַר |
| genesis-4-18 | Noa (f) | עִירָד, וְעִירָד, לָמֶךְ |
| genesis-4-20 | Noa (f) | הָיָה אֲבִי |
| genesis-4-26 | Noa (f) | הוּחַל |
| genesis-4-5 | Noa (f) | שָׁעָה |
| genesis-40-10 | Noa (f) | אַשְׁכְּלֹתֶיהָ |
| genesis-40-23 | Noa (f) | הַמַּשְׁקִים |
| genesis-40-5 | Noa (f) | וְהָאֹפֶה, אֲסוּרִים |
| genesis-41-18 | Noa (f) | הַיְאֹר |
| genesis-41-21 | Noa (f) | רַע כַּאֲשֶׁר בַּתְּחִלָּה וָאִיקָץ |
| genesis-41-25 | Noa (f) | הִגִּיד |
| genesis-41-32 | Noa (f) | הִשָּׁנוֹת |
| genesis-41-33 | Noa (f) | וְחָכָם, וִישִׁיתֵהוּ |
| genesis-41-4 | Noa (f) | פַּרְעֹה |
| genesis-41-48 | Noa (f) | בֶּעָרִים |
| genesis-41-5 | Noa (f) | בְּרִיאוֹת |
| genesis-41-53 | Noa (f) | מִצְרָיִם |
| genesis-41-55 | Noa (f) | לְכָל |
| genesis-42-16 | Noa (f) | פַרְעֹה |
| genesis-42-19 | Noa (f) | יֵאָסֵר |
| genesis-42-24 | Noa (f) | וַיֵּבְךְּ |
| genesis-42-25 | Noa (f) | וַיְצַו |
| genesis-42-36 | Noa (f) | שִׁכַּלְתֶּם, כֻלָּנָה |
| genesis-43-11 | Noa (f) | עֲשׂוּ |
| genesis-43-12 | Noa (f) | קְחוּ, אַמְתְּחֹתֵיכֶם |
| genesis-43-18 | Noa (f) | בְּאַמְתְּחֹתֵינוּ |
| genesis-43-23 | Noa (f) | בְּאַמְתְּחֹתֵיכֶם |
| genesis-43-25 | Noa (f) | הַמִּנְחָה |
| genesis-43-30 | Noa (f) | וַיֵּבְךְּ |
| genesis-43-32 | Noa (f) | לֶחֶם |
| genesis-43-34 | Noa (f) | מַשְׂאֹת, וַתֵּרֶב, מַשְׂאַת, מִמַּשְׂאֹת |
| genesis-43-9 | Noa (f) | אֶעֶרְבֶנּוּ |
| genesis-44-1 | Noa (f) | וַיְצַו, אַמְתְּחֹת, יוּכְלוּן, אַמְתַּחְתּוֹ |
| genesis-44-16 | Noa (f) | עֲוֹן, הִנֶּנּוּ |
| genesis-44-2 | Noa (f) | גְּבִיעַ |
| genesis-44-3 | Noa (f) | הֵמָּה |
| genesis-44-32 | Noa (f) | עָרַב, אֲבִיאֶנּוּ |
| genesis-44-5 | Noa (f) | הֲרֵעֹתֶם |
| genesis-44-8 | Noa (f) | אַמְתְּחֹתֵינוּ, הֱשִׁיבֹנוּ |
| genesis-45-14 | Noa (f) | וַיֵּבְךְּ |
| genesis-45-15 | Noa (f) | וַיֵּבְךְּ |
| genesis-45-16 | Noa (f) | וַיִּיטַב |
| genesis-45-21 | Noa (f) | עֲגָלוֹת |
| genesis-45-22 | Noa (f) | שְׂמָלֹת, שְׂמָלֹת |
| genesis-45-24 | Noa (f) | תִּרְגְּזוּ |
| genesis-45-26 | Noa (f) | בְּכָל |
| genesis-45-4 | Noa (f) | מִצְרָיְמָה |
| genesis-45-5 | Noa (f) | יִחַר, שְׁלָחַנִי |
| genesis-46-17 | Noa (f) | בְרִיעָה |
| genesis-46-20 | Noa (f) | אֹן |
| genesis-46-27 | Noa (f) | בְמִצְרַיִם |
| genesis-46-29 | Noa (f) | וַיֶּאְסֹר, וַיֵּבְךְּ |
| genesis-46-9 | Noa (f) | וּפַלּוּא |
| genesis-47-11 | Noa (f) | רַעְמְסֵס כַּאֲשֶׁר |
| genesis-47-16 | Noa (f) | וְאֶתְּנָה |
| genesis-47-18 | Noa (f) | הַהִוא |
| genesis-47-21 | Noa (f) | לֶעָרִים |
| genesis-47-31 | Noa (f) | הִשָּׁבְעָה |
| genesis-48-11 | Noa (f) | רְאֹה, זַרְעֶךָ |
| genesis-49-10 | Noa (f) | יִקְּהַת, עַמִּים |
| genesis-49-11 | Noa (f) | אֹסְרִי, כִּבֵּס |
| genesis-49-15 | Noa (f) | לְמַס |
| genesis-49-2 | Noa (f) | הִקָּבְצוּ |
| genesis-49-25 | Noa (f) | וְיַעְזְרֶךָּ |
| genesis-49-26 | Noa (f) | וּלְקָדְקֹד |
| genesis-49-27 | Noa (f) | יְחַלֵּק |
| genesis-49-29 | Noa (f) | וַיְצַו |
| genesis-49-33 | Noa (f) | לְצַוֹּת |
| genesis-49-4 | Noa (f) | עָלָה |
| genesis-49-5 | Noa (f) | חָמָס |
| genesis-49-6 | Noa (f) | בְאַפָּם, עִקְּרוּ |
| genesis-49-7 | Noa (f) | אַפָּם |
| genesis-49-9 | Noa (f) | וּכְלָבִיא, מִי, יְקִימֶנּוּ |
| genesis-5-2 | Noa (f) | הִבָּרְאָם |
| genesis-5-25 | Noa (f) | לָמֶךְ |
| genesis-50-1 | Noa (f) | וַיֵּבְךְּ |
| genesis-50-12 | Noa (f) | בָנָיו, צִוָּם |
| genesis-50-13 | Noa (f) | וַיִּקְבְּרוּ |
| genesis-50-15 | Noa (f) | כָּל |
| genesis-50-16 | Noa (f) | צִוָּה |
| genesis-50-17 | Noa (f) | וַיֵּבְךְּ |
| genesis-50-2 | Noa (f) | וַיְצַו |
| genesis-50-21 | Noa (f) | אֲכַלְכֵּל |
| genesis-50-23 | Noa (f) | שִׁלֵּשִׁים |
| genesis-50-26 | Noa (f) | וַיָּמָת, וָעֶשֶׂר, שָׁנִים, בְּמִצְרָיִם |
| genesis-6-13 | Noa (f) | בָּשָׂר, כִּי, מָלְאָה |
| genesis-6-14 | Noa (f) | בַּכֹּפֶר |
| genesis-6-16 | Noa (f) | שְׁנִיִּם |
| genesis-7-11 | Noa (f) | בְּשִׁבְעָה |
| genesis-7-17 | Noa (f) | וַיִּרְבּוּ |
| genesis-7-4 | Noa (f) | כָּל |
| genesis-8-16 | Noa (f) | וּנְשֵׁי |
| genesis-8-19 | Noa (f) | וְכָל |
| genesis-9-14 | Noa (f) | וְנִרְאֲתָה |
| genesis-9-2 | Noa (f) | בְּיֶדְכֶם |
| genesis-9-20 | Noa (f) | וַיִּטַּע |
| genesis-9-21 | Noa (f) | אָהֳלֹה |
| genesis-9-22 | Noa (f) | כְנַעַן |
| genesis-9-25 | Noa (f) | לְאֶחָיו |
| genesis-9-27 | Noa (f) | בְּאָהֳלֵי, כְנַעַן |
| genesis-9-8 | Noa (f) | אִתּוֹ, לֵאמֹר |
| leviticus-1-16 | Noa (f) | מֻרְאָתוֹ |
| leviticus-1-17 | Noa (f) | אִשֵּׁה |
| leviticus-1-9 | Noa (f) | וּכְרָעָיו, אִשֵּׁה רֵיחַ |
| leviticus-10-14 | Noa (f) | מִזִּבְחֵי |
| leviticus-10-16 | Noa (f) | שְׂעִיר |
| leviticus-10-19 | Noa (f) | הַיִּיטַב |
| leviticus-10-6 | Noa (f) | וּלְאִיתָמָר |
| leviticus-10-9 | Noa (f) | תֵּשְׁתְּ אַתָּה וּבָנֶיךָ אִתָּךְ בְּבֹאֲכֶם |
| leviticus-11-10 | Noa (f) | שֶׁקֶץ, הֵם |
| leviticus-11-11 | Noa (f) | וְשֶׁקֶץ, יִהְיוּ |
| leviticus-11-18 | Noa (f) | הַקָּאָת |
| leviticus-11-2 | Noa (f) | מִכָּל |
| leviticus-11-24 | Noa (f) | תִּטַּמָּאוּ |
| leviticus-11-26 | Noa (f) | שֹׁסַעַת |
| leviticus-11-27 | Noa (f) | אַרְבַּע |
| leviticus-11-30 | Noa (f) | וְהָאֲנָקָה, וְהַחֹמֶט וְהַתִּנְשָׁמֶת |
| leviticus-11-34 | Noa (f) | הָאֹכֶל |
| leviticus-11-39 | Noa (f) | הִיא |
| leviticus-11-42 | Noa (f) | וְכֹל |
| leviticus-11-5 | Noa (f) | טָמֵא |
| leviticus-11-6 | Noa (f) | וּפַרְסָה, טְמֵאָה |
| leviticus-11-8 | Noa (f) | וּבְנִבְלָתָם |
| leviticus-12-1 | Noa (f) | וַיְדַבֵּר |
| leviticus-12-5 | Noa (f) | וְטָמְאָה |
| leviticus-13-13 | Noa (f) | הַצָּרַעַת |
| leviticus-13-18 | Noa (f) | כִּי יִהְיֶה בוֹ בְעֹרוֹ שְׁחִין |
| leviticus-13-19 | Noa (f) | אֲדַמְדָּמֶת |
| leviticus-13-2 | Noa (f) | בְעוֹר, בְעוֹר |
| leviticus-13-20 | Noa (f) | מַרְאֶהָ, מִן הָעוֹר וּשְׂעָרָהּ הָפַךְ לָבָן, הַכֹּהֵן נֶגַע צָרַעַת הִוא בַּשְּׁחִין פָּרָחָה |
| leviticus-13-21 | Noa (f) | וְהִיא כֵהָה וְהִסְגִּירוֹ הַכֹּהֵן |
| leviticus-13-22 | Noa (f) | פָּשֹׂה |
| leviticus-13-26 | Noa (f) | וְהִוא |
| leviticus-13-4 | Noa (f) | הִוא |
| leviticus-13-40 | Noa (f) | הוּא |
| leviticus-13-43 | Noa (f) | אֲדַמְדֶּמֶת, אוֹ, בְגַבַּחְתּוֹ |
| leviticus-13-48 | Noa (f) | וְלַצָּמֶר |
| leviticus-13-49 | Noa (f) | וְהָרְאָה |
| leviticus-13-54 | Noa (f) | וְכִבְּסוּ |
| leviticus-13-56 | Noa (f) | הֻכַּבֵּס |
| leviticus-13-57 | Noa (f) | (nothing) |
| leviticus-13-58 | Noa (f) | וְסָר |
| leviticus-13-6 | Noa (f) | וְטִהֲרוֹ |
| leviticus-13-8 | Noa (f) | (nothing) |
| leviticus-14-10 | Noa (f) | בַשֶּׁמֶן |
| leviticus-14-28 | Noa (f) | הָאָשָׁם |
| leviticus-14-3 | Noa (f) | הַצָּרַעַת |
| leviticus-14-36 | Noa (f) | כָּל |
| leviticus-14-44 | Noa (f) | מַמְאֶרֶת, הִוא |
| leviticus-14-46 | Noa (f) | יִטְמָא |
| leviticus-14-53 | Noa (f) | הַצִפֹּר |
| leviticus-14-8 | Noa (f) | לְאָהֳלוֹ |
| leviticus-14-9 | Noa (f) | בַיּוֹם |
| leviticus-15-2 | Noa (f) | הוּא |
| leviticus-15-20 | Noa (f) | תִּשְׁכַּב |
| leviticus-15-22 | Noa (f) | בְּכָל כְּלִי |
| leviticus-15-23 | Noa (f) | (nothing) |
| leviticus-15-25 | Noa (f) | הִוא |
| leviticus-15-26 | Noa (f) | וְכָל |
| leviticus-15-31 | Noa (f) | בְּטַמְּאָם |
| leviticus-15-6 | Noa (f) | הַזָּב |
| leviticus-16-13 | Noa (f) | אֲדֹנָי וְכִסָּה עֲנַן |
| leviticus-16-15 | Noa (f) | שְׂעִיר, וְהִזָּה |
| leviticus-16-17 | Noa (f) | כָּל קְהַל |
| leviticus-16-2 | Noa (f) | בְכָל, הָאָרֹן |
| leviticus-16-21 | Noa (f) | וְסָמַךְ, עֲוֹנֹת |
| leviticus-16-22 | Noa (f) | עֲוֹנֹתָם |
| leviticus-16-23 | Noa (f) | בִּגְדֵי |
| leviticus-16-31 | Noa (f) | וְעִנִּיתֶם |
| leviticus-16-33 | Noa (f) | כָּל |
| leviticus-16-5 | Noa (f) | עֲדַת, וְאַיִל |
| leviticus-17-10 | Noa (f) | וְהִכְרַתִּי, עַמָּהּ |
| leviticus-17-14 | Noa (f) | בְנַפְשׁוֹ, הוּא |
| leviticus-17-4 | Noa (f) | הֱבִיאוֹ |
| leviticus-18-12 | Noa (f) | שְׁאֵר, (nothing) |
| leviticus-18-13 | Noa (f) | עֶרְוַת, שְׁאֵר |
| leviticus-18-15 | Noa (f) | בִּנְךָ |
| leviticus-18-16 | Noa (f) | עֶרְוַת, עֶרְוַת |
| leviticus-18-20 | Noa (f) | וְאֶל אֵשֶׁת עֲמִיתְךָ, שְׁכָבְתְּךָ, לְזָרַע, לְטָמְאָה, בָהּ |
| leviticus-18-28 | Noa (f) | קָאָה |
| leviticus-18-3 | Noa (f) | וּבְחֻקֹּתֵיהֶם |
| leviticus-18-6 | Noa (f) | שְׁאֵר |
| leviticus-18-7 | Noa (f) | הִוא |
| leviticus-19-1 | Noa (f) | וַיְדַבֵּר |
| leviticus-19-10 | Noa (f) | תְעוֹלֵל, וְלַגֵּר, תַּעֲזֹב |
| leviticus-19-20 | Noa (f) | וְהִוא, וְהָפְדֵּה |
| leviticus-19-23 | Noa (f) | וּנְטַעְתֶּם, וַעֲרַלְתֶּם |
| leviticus-19-3 | Noa (f) | (nothing) |
| leviticus-19-31 | Noa (f) | הַיִּדְּעֹנִים, לְטָמְאָה |
| leviticus-2-10 | Noa (f) | לְאַהֲרֹן |
| leviticus-2-14 | Noa (f) | אָבִיב |
| leviticus-2-5 | Noa (f) | בַשֶּׁמֶן |
| leviticus-2-8 | Noa (f) | מֵאֵלֶּה |
| leviticus-20-16 | Noa (f) | לְרִבְעָה |
| leviticus-20-17 | Noa (f) | וְנִכְרְתוּ, עֲוֹנוֹ |
| leviticus-20-18 | Noa (f) | הֶעֱרָה |
| leviticus-20-19 | Noa (f) | עֲוֹנָם |
| leviticus-20-2 | Noa (f) | עַם, (nothing) |
| leviticus-20-21 | Noa (f) | (nothing) |
| leviticus-20-27 | Noa (f) | אוֹב, (nothing) |
| leviticus-20-3 | Noa (f) | וְהִכְרַתִּי, מִזַּרְעוֹ |
| leviticus-20-5 | Noa (f) | וְהִכְרַתִּי |
| leviticus-21-13 | Noa (f) | בִבְתוּלֶיהָ |
| leviticus-21-2 | Noa (f) | לְאִמּוֹ, וּלְאָבִיו |
| leviticus-21-3 | Noa (f) | יִטַּמָּא |
| leviticus-21-5 | Noa (f) | (nothing), קָרְחָה בְּרֹאשָׁם, שָׂרָטֶת |
| leviticus-21-9 | Noa (f) | הִיא |
| leviticus-22-16 | Noa (f) | עֲוֹן, אַשְׁמָה, קָדְשֵׁיהֶם כִּי |
| leviticus-22-27 | Noa (f) | כֶשֶׂב |
| leviticus-22-5 | Noa (f) | בְאָדָם, טֻמְאָתוֹ |
| leviticus-22-6 | Noa (f) | וְטָמְאָה |
| leviticus-23-12 | Noa (f) | הֲנִיפְכֶם, הָעֹמֶר |
| leviticus-23-13 | Noa (f) | בַשֶּׁמֶן, נִיחֹחַ, וְנִסְכֹּה |
| leviticus-23-14 | Noa (f) | וְקָלִי, הֲבִיאֲכֶם |
| leviticus-23-30 | Noa (f) | הַהִוא |
| leviticus-23-32 | Noa (f) | וְעִנִּיתֶם, בְּתִשְׁעָה, לַחֹדֶשׁ |
| leviticus-23-36 | Noa (f) | הַשְּׁמִינִי, מִקְרָא, יִהְיֶה, לָכֶם |
| leviticus-23-42 | Noa (f) | תֵּשְׁבוּ |
| leviticus-24-12 | Noa (f) | בַּמִּשְׁמָר |
| leviticus-24-14 | Noa (f) | וְסָמְכוּ |
| leviticus-24-2 | Noa (f) | צַו |
| leviticus-25-12 | Noa (f) | הִוא קֹדֶשׁ תִּהְיֶה לָכֶם |
| leviticus-25-18 | Noa (f) | וִישַׁבְתֶּם |
| leviticus-25-33 | Noa (f) | הִוא |
| leviticus-25-37 | Noa (f) | אָכְלֶךָ |
| leviticus-25-39 | Noa (f) | עֲבֹדַת, (nothing) |
| leviticus-25-42 | Noa (f) | עָבֶד |
| leviticus-25-49 | Noa (f) | מִשְּׁאֵר |
| leviticus-25-54 | Noa (f) | בִּשְׁנַת |
| leviticus-25-7 | Noa (f) | לֶאֱכֹל |
| leviticus-26-13 | Noa (f) | עֻלְּכֶם, וָאוֹלֵךְ |
| leviticus-26-14 | Noa (f) | הַמִּצְוֹת |
| leviticus-26-15 | Noa (f) | תִּמְאָסוּ, לְבִלְתִּי, מִצְוֹתַי |
| leviticus-26-25 | Noa (f) | חֶרֶב |
| leviticus-26-28 | Noa (f) | וְיִסַּרְתִּי |
| leviticus-26-30 | Noa (f) | וְהִשְׁמַדְתִּי, בָּמֹתֵיכֶם |
| leviticus-26-33 | Noa (f) | אֱזָרֶה, בַגּוֹיִם, וְעָרֵיכֶם |
| leviticus-26-37 | Noa (f) | אָיִן |
| leviticus-26-39 | Noa (f) | בַּעֲוֹנָם, בַּעֲוֹנֹת |
| leviticus-26-41 | Noa (f) | יִרְצוּ, עֲוֹנָם |
| leviticus-26-6 | Noa (f) | וְהִשְׁבַּתִּי |
| leviticus-27-15 | Noa (f) | כֶּסֶף, עֶרְכְּךָ |
| leviticus-27-27 | Noa (f) | וּפָדָה |
| leviticus-27-34 | Noa (f) | הַמִּצְוֹת |
| leviticus-27-6 | Noa (f) | וְאִם |
| leviticus-3-11 | Noa (f) | אִשֶּׁה |
| leviticus-3-12 | Noa (f) | עֵז, קָרְבָּנוֹ |
| leviticus-3-13 | Noa (f) | וְסָמַךְ |
| leviticus-3-2 | Noa (f) | וְסָמַךְ |
| leviticus-3-8 | Noa (f) | וְסָמַךְ |
| leviticus-3-9 | Noa (f) | אִשֶּׁה, לַאדֹנָי |
| leviticus-4-10 | Noa (f) | וְהִקְטִירָם |
| leviticus-4-13 | Noa (f) | עֲדַת, יִשְׁגּוּ, מִצְוֹת, וְאָשֵׁמוּ |
| leviticus-4-2 | Noa (f) | בִשְׁגָגָה, מִצְוֹת |
| leviticus-4-24 | Noa (f) | וְסָמַךְ |
| leviticus-4-28 | Noa (f) | אוֹ |
| leviticus-4-31 | Noa (f) | כַּאֲשֶׁר הוּסַר |
| leviticus-4-32 | Noa (f) | לְחַטָּאת |
| leviticus-4-33 | Noa (f) | וְסָמַךְ |
| leviticus-4-4 | Noa (f) | וְסָמַךְ |
| leviticus-5-1 | Noa (f) | עֲוֹנוֹ |
| leviticus-5-17 | Noa (f) | מִצְוֹת, וְאָשֵׁם, וְנָשָׂא, עֲוֹנוֹ |
| leviticus-5-18 | Noa (f) | שִׁגְגָתוֹ |
| leviticus-5-2 | Noa (f) | וְאָשֵׁם |
| leviticus-5-21 | Noa (f) | בַּעֲמִיתוֹ, עָשַׁק, עֲמִיתוֹ |
| leviticus-5-23 | Noa (f) | וְאָשֵׁם, הָעֹשֶׁק |
| leviticus-5-24 | Noa (f) | יִתְּנֶנּוּ |
| leviticus-5-25 | Noa (f) | אֲשָׁמוֹ, אַיִל |
| leviticus-5-4 | Noa (f) | וְאָשֵׁם |
| leviticus-5-7 | Noa (f) | שֶׂה וְהֵבִיא |
| leviticus-6-13 | Noa (f) | עֲשִׂירִת |
| leviticus-6-19 | Noa (f) | קָדֹשׁ |
| leviticus-6-2 | Noa (f) | צַו |
| leviticus-6-22 | Noa (f) | זָכָר |
| leviticus-7-13 | Noa (f) | תּוֹדַת |
| leviticus-7-15 | Noa (f) | תּוֹדַת |
| leviticus-7-20 | Noa (f) | וְטֻמְאָתוֹ, וְנִכְרְתָה, מֵעַמֶּיהָ |
| leviticus-7-25 | Noa (f) | מֵעַמֶּיהָ |
| leviticus-7-27 | Noa (f) | הַהִוא |
| leviticus-7-38 | Noa (f) | צַוֹּתוֹ |
| leviticus-7-6 | Noa (f) | יֵאָכֵל |
| leviticus-8-1 | Noa (f) | וַיְדַבֵּר |
| leviticus-8-10 | Noa (f) | כָּל |
| leviticus-8-11 | Noa (f) | וַיַּז |
| leviticus-8-18 | Noa (f) | וַיִּסְמְכוּ |
| leviticus-8-22 | Noa (f) | וַיִּסְמְכוּ |
| leviticus-8-24 | Noa (f) | אָזְנָם |
| leviticus-8-26 | Noa (f) | הַיָּמִין |
| leviticus-8-30 | Noa (f) | וַיַּז |
| leviticus-8-33 | Noa (f) | מִלֻּאֵיכֶם |
| leviticus-9-15 | Noa (f) | וַיְחַטְּאֵהוּ |
| numbers-1-13 | Noa (f) | פַּגְעִיאֵל |
| numbers-1-14 | Noa (f) | דְּעוּאֵל |
| numbers-1-18 | Noa (f) | וַיִּתְיַלְדוּ |
| numbers-1-37 | Noa (f) | פְּקֻדֵיהֶם |
| numbers-1-45 | Noa (f) | כָּל, כָּל |
| numbers-1-5 | Noa (f) | שְׁדֵיאוּר |
| numbers-1-8 | Noa (f) | צוּעָר |
| numbers-10-14 | Noa (f) | וַיִּסַּע |
| numbers-10-15 | Noa (f) | צוּעָר |
| numbers-10-18 | Noa (f) | וְנָסַע, שְׁדֵיאוּר |
| numbers-10-2 | Noa (f) | וּלְמַסַּע |
| numbers-10-21 | Noa (f) | הַקְּהָתִים |
| numbers-10-22 | Noa (f) | וְנָסַע, עַמִּיהוּד |
| numbers-10-23 | Noa (f) | פְּדָה |
| numbers-10-31 | Noa (f) | לְעֵינָיִם |
| numbers-10-34 | Noa (f) | בְּנָסְעָם |
| numbers-10-35 | Noa (f) | בִּנְסֹעַ, הָאָרֹן |
| numbers-10-36 | Noa (f) | וּבְנֻחֹה |
| numbers-10-7 | Noa (f) | וּבְהַקְהִיל |
| numbers-10-9 | Noa (f) | הַצַּר |
| numbers-11-10 | Noa (f) | וַיִּחַר, וּבְעֵינֵי |
| numbers-11-11 | Noa (f) | מָצָתִי |
| numbers-11-12 | Noa (f) | כִּי תֹאמַר |
| numbers-11-26 | Noa (f) | וַיִּתְנַבְּאוּ |
| numbers-11-29 | Noa (f) | לִי, כָּל עַם |
| numbers-11-32 | Noa (f) | וְכָל, הַשְּׂלָו, אָסַף |
| numbers-11-7 | Noa (f) | וְעֵינוֹ |
| numbers-12-10 | Noa (f) | סָר, כַּשָּׁלֶג |
| numbers-12-12 | Noa (f) | בְשָׂרוֹ |
| numbers-12-14 | Noa (f) | יָרֹק |
| numbers-12-8 | Noa (f) | בְחִידֹת, בְמֹשֶׁה |
| numbers-13-14 | Noa (f) | וָפְסִי |
| numbers-13-18 | Noa (f) | הִוא |
| numbers-13-20 | Noa (f) | וּמָה, הִוא |
| numbers-13-23 | Noa (f) | (nothing), בַמּוֹט |
| numbers-13-26 | Noa (f) | עֲדַת |
| numbers-13-30 | Noa (f) | עָלֹה |
| numbers-14-1 | Noa (f) | הָעֵדָה |
| numbers-14-12 | Noa (f) | אַכֶּנּוּ, וְאוֹרִשֶׁנּוּ |
| numbers-14-18 | Noa (f) | עָוֹן, עֲוֹן, רִבֵּעִים |
| numbers-14-21 | Noa (f) | וְיִמָּלֵא |
| numbers-14-22 | Noa (f) | וַיְנַסּוּ |
| numbers-14-29 | Noa (f) | מִסְפַּרְכֶם |
| numbers-14-39 | Noa (f) | וַיִּתְאַבְּלוּ |
| numbers-14-4 | Noa (f) | מִצְרָיְמָה |
| numbers-14-44 | Noa (f) | וַאֲרוֹן |
| numbers-14-9 | Noa (f) | בַּאדֹנָי, סָר |
| numbers-15-10 | Noa (f) | לַנֶּסֶךְ |
| numbers-15-11 | Noa (f) | בַכְּבָשִׂים, בָעִזִּים |
| numbers-15-20 | Noa (f) | עֲרִסֹתֵכֶם |
| numbers-15-22 | Noa (f) | תִשְׁגּוּ, דִּבֶּר |
| numbers-15-24 | Noa (f) | וְנִסְכּוֹ, לְחַטָּת |
| numbers-15-25 | Noa (f) | עֲדַת, (nothing), אִשֶּׁה, לַאדֹנָי |
| numbers-15-26 | Noa (f) | עֲדַת |
| numbers-15-31 | Noa (f) | עֲוֹנָה בָהּ |
| numbers-15-33 | Noa (f) | כָּל |
| numbers-15-39 | Noa (f) | מִצְוֹת |
| numbers-15-4 | Noa (f) | עִשָּׂרוֹן |
| numbers-15-40 | Noa (f) | כָּל, מִצְוֹתָי, קְדֹשִׁים |
| numbers-16-17 | Noa (f) | וְהִקְרַבְתֶּם |
| numbers-16-19 | Noa (f) | כָּל, כָּל |
| numbers-16-26 | Noa (f) | אָהֳלֵי, תִּגְּעוּ |
| numbers-16-27 | Noa (f) | אָהֳלֵיהֶם |
| numbers-16-30 | Noa (f) | נִאֲצוּ |
| numbers-16-6 | Noa (f) | עֲשׂוּ, לָכֶם מַחְתּוֹת קֹרַח וְכָל עֲדָתוֹ |
| numbers-17-12 | Noa (f) | וַיְכַפֵּר |
| numbers-17-19 | Noa (f) | אִוָּעֵד |
| numbers-17-20 | Noa (f) | וַהֲשִׁכֹּתִי |
| numbers-17-28 | Noa (f) | לִגְוֹעַ |
| numbers-17-3 | Noa (f) | מַחְתּוֹת, הִקְרִיבֻם |
| numbers-17-4 | Noa (f) | אֶלְעָזָר הַכֹּהֵן, וַיְרַקְּעוּם |
| numbers-18-1 | Noa (f) | עֲוֹן, עֲוֹן |
| numbers-18-13 | Noa (f) | בְּאַרְצָם |
| numbers-18-17 | Noa (f) | תַּקְטִיר |
| numbers-18-23 | Noa (f) | עֲוֹנָם |
| numbers-18-25 | Noa (f) | וַיְדַבֵּר |
| numbers-18-27 | Noa (f) | הַיָּקֶב |
| numbers-18-30 | Noa (f) | יָקֶב |
| numbers-19-11 | Noa (f) | בְּמֵת |
| numbers-19-16 | Noa (f) | בְמֵת, בְקָבֶר |
| numbers-19-19 | Noa (f) | וְחִטְּאוֹ |
| numbers-19-8 | Noa (f) | הָעָרֶב |
| numbers-2-12 | Noa (f) | שַׁדָּי |
| numbers-2-18 | Noa (f) | עַמִּיהוּד |
| numbers-2-2 | Noa (f) | בְאֹתֹת |
| numbers-2-20 | Noa (f) | פְּדָהצוּר |
| numbers-2-24 | Noa (f) | וּמֵאָה, יִסָּעוּ |
| numbers-2-27 | Noa (f) | פַּגְעִיאֵל |
| numbers-2-29 | Noa (f) | אֲחִירַע |
| numbers-2-31 | Noa (f) | יִסְעוּ |
| numbers-2-34 | Noa (f) | נָסָעוּ |
| numbers-2-9 | Noa (f) | יִסָּעוּ |
| numbers-20-11 | Noa (f) | וַתֵּשְׁתְּ |
| numbers-20-16 | Noa (f) | עִיר קְצֵה גְבוּלֶךָ |
| numbers-20-17 | Noa (f) | בְאֵר |
| numbers-21-10 | Noa (f) | בְּאֹבֹת |
| numbers-21-11 | Noa (f) | וַיִּסְעוּ |
| numbers-21-15 | Noa (f) | עָר |
| numbers-21-16 | Noa (f) | הִוא, הַבְּאֵר |
| numbers-21-21 | Noa (f) | סִיחֹן |
| numbers-21-28 | Noa (f) | עָר |
| numbers-21-29 | Noa (f) | כְּמוֹשׁ, נָתַן |
| numbers-21-34 | Noa (f) | כָּל |
| numbers-21-4 | Noa (f) | מֵהֹר |
| numbers-22-19 | Noa (f) | בָזֶה, וְאֵדְעָה |
| numbers-22-22 | Noa (f) | וַיִּחַר |
| numbers-22-27 | Noa (f) | וַיִּחַר |
| numbers-22-28 | Noa (f) | לְבִלְעָם |
| numbers-22-32 | Noa (f) | וַיֹּאמֶר, אֲתֹנְךָ, זֶה |
| numbers-22-33 | Noa (f) | וַתִּרְאַנִי |
| numbers-22-38 | Noa (f) | אוּכַל |
| numbers-22-39 | Noa (f) | חֻצוֹת |
| numbers-22-4 | Noa (f) | כָּל |
| numbers-22-40 | Noa (f) | לְבִלְעָם |
| numbers-22-7 | Noa (f) | בָלָק |
| numbers-22-8 | Noa (f) | דָּבָר, כַּאֲשֶׁר |
| numbers-23-23 | Noa (f) | פָּעַל |
| numbers-23-26 | Noa (f) | בִּלְעָם |
| numbers-23-29 | Noa (f) | וְהָכֵן |
| numbers-23-5 | Noa (f) | דָּבָר, בִלְעָם, וְכֹה, תְדַבֵּר |
| numbers-23-6 | Noa (f) | מוֹאָב |
| numbers-23-7 | Noa (f) | אָרָה, זֹעֲמָה |
| numbers-23-9 | Noa (f) | אֶרְאֶנּוּ |
| numbers-24-10 | Noa (f) | וַיִּחַר |
| numbers-24-17 | Noa (f) | אֶרְאֶנּוּ |
| numbers-24-19 | Noa (f) | וְהֶאֱבִיד, שָׂרִיד |
| numbers-24-23 | Noa (f) | וַיִּשָּׂא, מְשָׁלוֹ |
| numbers-24-24 | Noa (f) | מִיַּד, עֲדֵי |
| numbers-24-3 | Noa (f) | בְעֹר |
| numbers-24-4 | Noa (f) | שַׁדַּי |
| numbers-24-5 | Noa (f) | אֹהָלֶיךָ, יִשְׂרָאֵל |
| numbers-25-18 | Noa (f) | אֲחֹתָם, בְיוֹם |
| numbers-25-2 | Noa (f) | אֱלֹהֵיהֶן, לֵאלֹהֵיהֶן |
| numbers-25-3 | Noa (f) | וַיִּחַר |
| numbers-26-17 | Noa (f) | לַאֲרוֹד |
| numbers-26-25 | Noa (f) | יִשָּׂשכָר, אַרְבָּעָה |
| numbers-26-30 | Noa (f) | אִיעֶזֶר, הָאִיעֶזְרִי |
| numbers-26-44 | Noa (f) | לִבְרִיעָה |
| numbers-26-45 | Noa (f) | בְרִיעָה |
| numbers-26-52 | Noa (f) | וַיְדַבֵּר |
| numbers-26-54 | Noa (f) | וְלַמְעַט |
| numbers-26-60 | Noa (f) | אֲבִיהוּא |
| numbers-26-65 | Noa (f) | נוּן |
| numbers-26-8 | Noa (f) | פַלּוּא, אֱלִיאָב |
| numbers-26-9 | Noa (f) | הִצּוּ |
| numbers-27-17 | Noa (f) | עֲדַת |
| numbers-27-18 | Noa (f) | וְסָמַכְתָּ |
| numbers-27-21 | Noa (f) | וְשָׁאַל, הוּא וְכָל, הָעֵדָה |
| numbers-27-22 | Noa (f) | כָּל |
| numbers-27-23 | Noa (f) | (nothing) |
| numbers-28-10 | Noa (f) | וְנִסְכָּהּ |
| numbers-28-12 | Noa (f) | בַשֶּׁמֶן, בַשֶּׁמֶן |
| numbers-28-13 | Noa (f) | וְעִשָּׂרֹן, עִשָּׂרוֹן, בַשֶּׁמֶן |
| numbers-28-14 | Noa (f) | וְנִסְכֵּיהֶם, זֹאת, עֹלַת |
| numbers-28-15 | Noa (f) | וְנִסְכּוֹ |
| numbers-28-20 | Noa (f) | בַשָּׁמֶן |
| numbers-28-24 | Noa (f) | וְנִסְכּוֹ |
| numbers-28-3 | Noa (f) | הָאִשֶּׁה |
| numbers-28-31 | Noa (f) | וְנִסְכֵּיהֶם |
| numbers-28-7 | Noa (f) | וְנִסְכּוֹ |
| numbers-28-8 | Noa (f) | וּכְנִסְכּוֹ |
| numbers-28-9 | Noa (f) | בַשֶּׁמֶן, וְנִסְכּוֹ |
| numbers-29-10 | Noa (f) | עִשָּׂרוֹן, עִשָּׂרוֹן |
| numbers-29-11 | Noa (f) | וְנִסְכֵּיהֶם |
| numbers-29-14 | Noa (f) | בַשָּׁמֶן |
| numbers-29-16 | Noa (f) | (nothing), וְנִסְכָּהּ |
| numbers-29-17 | Noa (f) | אַרְבָּעָה |
| numbers-29-18 | Noa (f) | וְנִסְכֵּיהֶם |
| numbers-29-22 | Noa (f) | וְנִסְכָּהּ |
| numbers-29-24 | Noa (f) | וְנִסְכֵּיהֶם |
| numbers-29-25 | Noa (f) | (nothing), וְנִסְכָּהּ |
| numbers-29-26 | Noa (f) | אֵילִם |
| numbers-29-28 | Noa (f) | וְנִסְכָּהּ |
| numbers-29-3 | Noa (f) | בַשָּׁמֶן |
| numbers-29-30 | Noa (f) | וְנִסְכֵּיהֶם |
| numbers-29-33 | Noa (f) | וְנִסְכֵּהֶם |
| numbers-29-34 | Noa (f) | (nothing), וְנִסְכָּהּ |
| numbers-29-36 | Noa (f) | אִשֵּׁה רֵיחַ, פַּר, אֶחָד, אֶחָד, שִׁבְעָה, תְּמִימִם |
| numbers-29-38 | Noa (f) | וּמִנְחָתָהּ וְנִסְכָּהּ |
| numbers-29-39 | Noa (f) | וּלְנִסְכֵּיכֶם |
| numbers-29-4 | Noa (f) | וְעִשָּׂרוֹן |
| numbers-29-9 | Noa (f) | בַשָּׁמֶן |
| numbers-3-12 | Noa (f) | כָּל |
| numbers-3-2 | Noa (f) | וַאֲבִיהוּא |
| numbers-3-25 | Noa (f) | בְּאֹהֶל |
| numbers-3-30 | Noa (f) | וּנְשִׂיא בֵית אָב לְמִשְׁפְּחֹת הַקְּהָתִי אֶלִיצָפָן |
| numbers-3-39 | Noa (f) | אָלֶף |
| numbers-3-4 | Noa (f) | וַאֲבִיהוּא, וַיְכַהֵן אֶלְעָזָר וְאִיתָמָר |
| numbers-3-48 | Noa (f) | הָעֹדְפִים |
| numbers-30-11 | Noa (f) | אִסָּר |
| numbers-30-13 | Noa (f) | וּלְאִסַּר |
| numbers-30-16 | Noa (f) | עֲוֹנָהּ |
| numbers-30-4 | Noa (f) | תִדֹּר, אִסָּר |
| numbers-30-6 | Noa (f) | אָבִיהָ, וֶאֱסָרֶיהָ, אָבִיהָ |
| numbers-30-8 | Noa (f) | וֶאֱסָרֶהָ |
| numbers-31-3 | Noa (f) | אֲנָשִׁים |
| numbers-31-35 | Noa (f) | הַנָּשִׁים, אָלֶף |
| numbers-31-38 | Noa (f) | אָלֶף |
| numbers-31-40 | Noa (f) | אָלֶף |
| numbers-31-41 | Noa (f) | תְּרוּמַת |
| numbers-31-44 | Noa (f) | אָלֶף |
| numbers-31-46 | Noa (f) | אָלֶף |
| numbers-31-50 | Noa (f) | אֶצְעָדָה, וְכוּמָז לְכַפֵּר |
| numbers-31-7 | Noa (f) | וַיִּצְבְּאוּ |
| numbers-32-10 | Noa (f) | וַיִּחַר |
| numbers-32-15 | Noa (f) | תְשׁוּבֻן |
| numbers-32-20 | Noa (f) | וַיֹּאמֶר, אֲלֵיהֶם |
| numbers-32-3 | Noa (f) | וְדִיבֹן, וְאֶלְעָלֵה וּשְׂבָם וּנְבוֹ וּבְעֹן |
| numbers-32-32 | Noa (f) | נַחְנוּ |
| numbers-32-34 | Noa (f) | דִּיבֹן, עֲרֹעֵר |
| numbers-32-35 | Noa (f) | עַטְרֹת |
| numbers-32-39 | Noa (f) | וַיִּלְכְּדֻהָ |
| numbers-32-6 | Noa (f) | תֵּשְׁבוּ פֹה |
| numbers-32-7 | Noa (f) | תְנִיאוּן |
| numbers-33-12 | Noa (f) | בְּדָפְקָה |
| numbers-33-14 | Noa (f) | מֵאָלוּשׁ |
| numbers-33-2 | Noa (f) | מַסְעֵיהֶם |
| numbers-33-21 | Noa (f) | בְּרִסָּה |
| numbers-33-22 | Noa (f) | בִּקְהֵלָתָה |
| numbers-33-23 | Noa (f) | מִקְּהֵלָתָה |
| numbers-33-28 | Noa (f) | מִתָּרַח |
| numbers-33-29 | Noa (f) | מִמִּתְקָה |
| numbers-33-36 | Noa (f) | גָּבֶר, בְמִדְבַּר צִן הִוא |
| numbers-33-37 | Noa (f) | בְּהֹר |
| numbers-33-41 | Noa (f) | מֵהֹר |
| numbers-33-45 | Noa (f) | וַיִּסְעוּ, מֵעִיִּים, בְּדִיבֹן |
| numbers-33-46 | Noa (f) | וַיִּסְעוּ, מִדִּיבֹן |
| numbers-33-8 | Noa (f) | בְּמָרָה |
| numbers-33-9 | Noa (f) | מִמָּרָה, אֵילִמָה וּבְאֵילִם |
| numbers-34-10 | Noa (f) | וְהִתְאַוִּיתֶם |
| numbers-34-12 | Noa (f) | הַיַּרְדֵּנָה |
| numbers-34-13 | Noa (f) | וַיְצַו |
| numbers-34-17 | Noa (f) | לָכֶם |
| numbers-34-20 | Noa (f) | עַמִּיהוּד |
| numbers-34-22 | Noa (f) | וּלְמַטֵּה בְנֵי דָן נָשִׂיא |
| numbers-34-27 | Noa (f) | אֲחִיהוּד |
| numbers-34-28 | Noa (f) | פְּדַהְאֵל |
| numbers-34-29 | Noa (f) | כְּנָעַן |
| numbers-34-4 | Noa (f) | עַקְרַבִּים, צִנָה, אַדָּר |
| numbers-35-11 | Noa (f) | עָרִים, עָרֵי |
| numbers-35-12 | Noa (f) | הֶעָרִים, מִגֹּאֵל |
| numbers-35-14 | Noa (f) | עָרֵי |
| numbers-35-16 | Noa (f) | הִכָּהוּ |
| numbers-35-17 | Noa (f) | הִכָּהוּ |
| numbers-35-18 | Noa (f) | הִכָּהוּ, הוּא |
| numbers-35-23 | Noa (f) | אוֹ בְכָל |
| numbers-35-5 | Noa (f) | וּמַדֹּתֶם, לָהֶם |
| numbers-35-8 | Noa (f) | תַּמְעִיטוּ, מֵעָרָיו |
| numbers-36-13 | Noa (f) | הַמִּצְוֹת |
| numbers-36-2 | Noa (f) | צִוָּה, צֻוָּה, צְלָפְחָד |
| numbers-36-5 | Noa (f) | וַיְצַו |
| numbers-36-8 | Noa (f) | יִירְשׁוּ |
| numbers-4-10 | Noa (f) | הַמּוֹט |
| numbers-4-11 | Noa (f) | יִפְרְשׂוּ |
| numbers-4-12 | Noa (f) | עַל הַמּוֹט |
| numbers-4-15 | Noa (f) | בִּנְסֹעַ |
| numbers-4-23 | Noa (f) | לִצְבֹא |
| numbers-4-25 | Noa (f) | יְרִיעֹת, וְאֶת |
| numbers-4-37 | Noa (f) | הַקְּהָתִי |
| numbers-5-14 | Noa (f) | וְקִנֵּא, וְקִנֵּא |
| numbers-5-18 | Noa (f) | וְהֶעֱמִיד, מִנְחַת, מִנְחַת, הִוא, וּבְיַד |
| numbers-5-28 | Noa (f) | נִטְמְאָה, הָאִשָּׁה, וּטְהֹרָה, הִוא, וְנִזְרְעָה |
| numbers-5-3 | Noa (f) | יְטַמְּאוּ |
| numbers-5-6 | Noa (f) | מִכָּל, הַהִוא |
| numbers-6-17 | Noa (f) | נִסְכּוֹ |
| numbers-6-23 | Noa (f) | אָמוֹר לָהֶם |
| numbers-6-5 | Noa (f) | יַזִּיר |
| numbers-6-9 | Noa (f) | וְכִי |
| numbers-7-13 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-14 | Noa (f) | זָהָב |
| numbers-7-17 | Noa (f) | אֵילִם |
| numbers-7-19 | Noa (f) | אֶחָד |
| numbers-7-23 | Noa (f) | אֵילִם, צוּעָר |
| numbers-7-25 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-29 | Noa (f) | אֵילִם |
| numbers-7-3 | Noa (f) | עֲגָלָה |
| numbers-7-30 | Noa (f) | שְׁדֵיאוּר |
| numbers-7-35 | Noa (f) | שְׁדֵיאוּר |
| numbers-7-37 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-39 | Noa (f) | אַיִל |
| numbers-7-43 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-45 | Noa (f) | אַיִל |
| numbers-7-47 | Noa (f) | אֵילִם, דְּעוּאֵל |
| numbers-7-49 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-59 | Noa (f) | אֵילִם |
| numbers-7-67 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-72 | Noa (f) | עַשְׁתֵּי, פַּגְעִיאֵל |
| numbers-7-73 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-79 | Noa (f) | בַשֶּׁמֶן |
| numbers-7-87 | Noa (f) | לְחַטָּאת |
| numbers-7-89 | Noa (f) | וּבְבֹא |
| numbers-8-14 | Noa (f) | וְהִבְדַּלְתָּ |
| numbers-8-7 | Noa (f) | תַעַר, וְכִבְּסוּ |
| numbers-8-8 | Noa (f) | סֹלֶת, בַשָּׁמֶן, לְחַטָּאת |
| numbers-9-1 | Noa (f) | בְמִדְבַּר |
| numbers-9-11 | Noa (f) | יֹאכְלֻהוּ |
| numbers-9-18 | Noa (f) | יִסְעוּ |
| numbers-9-19 | Noa (f) | יִסָּעוּ |
| numbers-9-20 | Noa (f) | יִסָּעוּ |
| numbers-9-23 | Noa (f) | יִסָּעוּ |
| deuteronomy-1-12 | Ari (m) | לְבַדִּי, טָרְחֲכֶם, וְרִיבְכֶם |
| deuteronomy-1-19 | Ari (m) | וַנִּסַּע |
| deuteronomy-1-21 | Ari (m) | תֵּחָת |
| deuteronomy-1-25 | Ari (m) | בְיָדָם |
| deuteronomy-1-26 | Ari (m) | וְלֹא אֲבִיתֶם |
| deuteronomy-1-27 | Ari (m) | בְאָהֳלֵיכֶם |
| deuteronomy-1-28 | Ari (m) | הֵמַסּוּ |
| deuteronomy-1-3 | Ari (m) | בְּעַשְׁתֵּי |
| deuteronomy-1-34 | Ari (m) | לֵאמֹר |
| deuteronomy-1-36 | Ari (m) | יִרְאֶנָּה |
| deuteronomy-1-40 | Ari (m) | פְּנוּ, וּסְעוּ |
| deuteronomy-1-46 | Ari (m) | בְקָדֵשׁ |
| deuteronomy-10-16 | Ari (m) | וְעָרְפְּכֶם |
| deuteronomy-10-3 | Ari (m) | וָאַעַל |
| deuteronomy-10-6 | Ari (m) | נָסְעוּ |
| deuteronomy-10-7 | Ari (m) | נָסְעוּ |
| deuteronomy-10-8 | Ari (m) | (nothing) |
| deuteronomy-10-9 | Ari (m) | לְלֵוִי, הוּא |
| deuteronomy-11-10 | Ari (m) | בְרַגְלְךָ |
| deuteronomy-11-28 | Ari (m) | מִצְוֹת |
| deuteronomy-11-9 | Ari (m) | וּלְזַרְעָם |
| deuteronomy-12-1 | Ari (m) | תִּשְׁמְרוּן |
| deuteronomy-12-17 | Ari (m) | וְנִדְבֹתֶיךָ |
| deuteronomy-12-19 | Ari (m) | הִשָּׁמֶר |
| deuteronomy-12-20 | Ari (m) | תְאַוֶּה |
| deuteronomy-12-29 | Ari (m) | בָא |
| deuteronomy-12-31 | Ari (m) | יִשְׂרְפוּ |
| deuteronomy-13-11 | Ari (m) | וּסְקַלְתּוֹ, בָאֲבָנִים |
| deuteronomy-13-15 | Ari (m) | אֱמֶת נָכוֹן |
| deuteronomy-13-17 | Ari (m) | בָאֵשׁ |
| deuteronomy-13-19 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-13-3 | Ari (m) | וְנָעָבְדֵם |
| deuteronomy-13-5 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-13-7 | Ari (m) | כִּי יְסִיתְךָ אָחִיךָ בֶן אִמֶּךָ, לֵאמֹר נֵלְכָה וְנַעַבְדָה |
| deuteronomy-14-22 | Ari (m) | זַרְעֶךָ |
| deuteronomy-14-23 | Ari (m) | לְיִרְאָה |
| deuteronomy-15-14 | Ari (m) | וּמִיִּקְבֶךָ |
| deuteronomy-15-18 | Ari (m) | וּבֵרַכְךָ |
| deuteronomy-15-2 | Ari (m) | יַשֶּׁה, בְּרֵעֵהוּ |
| deuteronomy-15-20 | Ari (m) | בְשָׁנָה |
| deuteronomy-15-4 | Ari (m) | יְבָרֶכְךָ |
| deuteronomy-16-10 | Ari (m) | יְבָרֶכְךָ |
| deuteronomy-16-13 | Ari (m) | בְּאָסְפְּךָ, וּמִיִּקְבֶךָ |
| deuteronomy-16-15 | Ari (m) | יְבָרֶכְךָ |
| deuteronomy-16-19 | Ari (m) | תַטֶּה |
| deuteronomy-16-20 | Ari (m) | תִּחְיֶה |
| deuteronomy-16-3 | Ari (m) | בְחִפָּזוֹן |
| deuteronomy-17-12 | Ari (m) | בְזָדוֹן |
| deuteronomy-17-20 | Ari (m) | רוּם |
| deuteronomy-17-3 | Ari (m) | אוֹ, אוֹ |
| deuteronomy-17-5 | Ari (m) | (nothing), וּסְקַלְתָּם |
| deuteronomy-18-16 | Ari (m) | אֶרְאֶה |
| deuteronomy-18-19 | Ari (m) | אָנֹכִי אֶדְרֹשׁ מֵעִמּוֹ |
| deuteronomy-18-3 | Ari (m) | שֶׂה |
| deuteronomy-18-4 | Ari (m) | דְּגָנְךָ |
| deuteronomy-19-18 | Ari (m) | בְאָחִיו |
| deuteronomy-19-4 | Ari (m) | בִּבְלִי |
| deuteronomy-19-5 | Ari (m) | בַיַּעַר, בַגַּרְזֶן |
| deuteronomy-19-6 | Ari (m) | וְהִכָּהוּ |
| deuteronomy-2-1 | Ari (m) | וַנִּסַּע |
| deuteronomy-2-11 | Ari (m) | רְפָאִים |
| deuteronomy-2-15 | Ari (m) | לְהֻמָּם |
| deuteronomy-2-21 | Ari (m) | (nothing) |
| deuteronomy-2-25 | Ari (m) | אָחֵל |
| deuteronomy-2-26 | Ari (m) | סִיחוֹן, לֵאמֹר |
| deuteronomy-2-27 | Ari (m) | אֶעְבְּרָה |
| deuteronomy-2-28 | Ari (m) | וְשָׁתִיתִי |
| deuteronomy-2-3 | Ari (m) | פְּנוּ |
| deuteronomy-2-31 | Ari (m) | הַחִלֹּתִי |
| deuteronomy-2-36 | Ari (m) | מֵעֲרֹעֵר |
| deuteronomy-2-9 | Ari (m) | בָּם, עָר |
| deuteronomy-20-14 | Ari (m) | בָעִיר |
| deuteronomy-20-16 | Ari (m) | מֵעָרֵי |
| deuteronomy-20-6 | Ari (m) | פֶּן, יְחַלְּלֶנּוּ |
| deuteronomy-21-14 | Ari (m) | עִנִּיתָהּ |
| deuteronomy-21-17 | Ari (m) | הַשְּׂנוּאָה, יַכִּיר |
| deuteronomy-21-18 | Ari (m) | וְיסְּרוּ |
| deuteronomy-21-20 | Ari (m) | סוֹרֵר, וְסֹבֵא |
| deuteronomy-21-21 | Ari (m) | וּרְגָמֻהוּ, בָאֲבָנִים |
| deuteronomy-21-22 | Ari (m) | בְאִישׁ |
| deuteronomy-21-23 | Ari (m) | תָלִין |
| deuteronomy-21-6 | Ari (m) | בַנָּחַל |
| deuteronomy-22-14 | Ari (m) | בְּתוּלִים |
| deuteronomy-22-2 | Ari (m) | דְּרֹשׁ |
| deuteronomy-22-21 | Ari (m) | וּסְקָלוּהָ |
| deuteronomy-22-24 | Ari (m) | בָעִיר, עִנָּה |
| deuteronomy-22-28 | Ari (m) | אֹרָשָׂה |
| deuteronomy-22-29 | Ari (m) | עִנָּהּ |
| deuteronomy-23-21 | Ari (m) | יְבָרֶכְךָ |
| deuteronomy-23-25 | Ari (m) | שָׂבְעֶךָ |
| deuteronomy-23-8 | Ari (m) | בְאַרְצוֹ |
| deuteronomy-24-1 | Ari (m) | וּבְעָלָהּ וְהָיָה, תִמְצָא, בָהּ, וְכָתַב לָהּ סֵפֶר כְּרִיתֻת |
| deuteronomy-24-12 | Ari (m) | תִשְׁכַּב |
| deuteronomy-24-13 | Ari (m) | וּבֵרֲכֶךָּ |
| deuteronomy-24-14 | Ari (m) | מֵאַחֶיךָ |
| deuteronomy-24-15 | Ari (m) | חֵטְא |
| deuteronomy-24-16 | Ari (m) | בְּחֶטְאוֹ |
| deuteronomy-24-8 | Ari (m) | הַצָּרַעַת |
| deuteronomy-25-19 | Ari (m) | מִכָּל, עֲמָלֵק |
| deuteronomy-25-7 | Ari (m) | יַבְּמִי |
| deuteronomy-26-14 | Ari (m) | בְאֹנִי, צִוִּיתָנִי |
| deuteronomy-26-18 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-26-2 | Ari (m) | בַטֶּנֶא |
| deuteronomy-26-9 | Ari (m) | וַיְבִאֵנוּ |
| deuteronomy-27-10 | Ari (m) | מִצְוֹתָו |
| deuteronomy-27-11 | Ari (m) | וַיְצַו |
| deuteronomy-27-12 | Ari (m) | וְיִשָּׂשכָר |
| deuteronomy-27-17 | Ari (m) | מַסִּיג |
| deuteronomy-27-24 | Ari (m) | אָרוּר |
| deuteronomy-28-1 | Ari (m) | מִצְוֹתָיו, עֶלְיוֹן |
| deuteronomy-28-20 | Ari (m) | הִשָּׁמֶדְךָ |
| deuteronomy-28-21 | Ari (m) | בָא |
| deuteronomy-28-25 | Ari (m) | נִגָּף, לְזַעֲוָה |
| deuteronomy-28-30 | Ari (m) | תְאָרֵשׂ |
| deuteronomy-28-40 | Ari (m) | בְּכָל, יִשַּׁל |
| deuteronomy-28-45 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-28-46 | Ari (m) | וּלְמוֹפֵת |
| deuteronomy-28-48 | Ari (m) | וּבְעֵירֹם |
| deuteronomy-28-54 | Ari (m) | בְאָחִיו |
| deuteronomy-28-59 | Ari (m) | זַרְעֶךָ, וָחֳלָיִם |
| deuteronomy-28-60 | Ari (m) | מַדְוֵה, יָגֹרְתָּ |
| deuteronomy-28-64 | Ari (m) | בְּכָל |
| deuteronomy-28-66 | Ari (m) | תְּלֻאִים |
| deuteronomy-28-7 | Ari (m) | וּבְשִׁבְעָה |
| deuteronomy-28-8 | Ari (m) | יְצַו, וּבֵרַכְךָ |
| deuteronomy-29-11 | Ari (m) | וּבְאָלָתוֹ |
| deuteronomy-29-18 | Ari (m) | סְפוֹת |
| deuteronomy-29-20 | Ari (m) | וְהִבְדִּילוֹ |
| deuteronomy-29-24 | Ari (m) | בְּהוֹצִיאוֹ |
| deuteronomy-29-26 | Ari (m) | וַיִּחַר, הַהִוא |
| deuteronomy-29-3 | Ari (m) | וְאָזְנַיִם |
| deuteronomy-29-4 | Ari (m) | וָאוֹלֵךְ |
| deuteronomy-29-6 | Ari (m) | סִיחֹן |
| deuteronomy-3-14 | Ari (m) | וַיִּקְרָא, חַוֹּת |
| deuteronomy-3-18 | Ari (m) | וָאֲצַו |
| deuteronomy-3-21 | Ari (m) | הַהִוא |
| deuteronomy-3-25 | Ari (m) | אֶעְבְּרָה |
| deuteronomy-3-28 | Ari (m) | וְצַו |
| deuteronomy-3-4 | Ari (m) | עָרָיו, (nothing) |
| deuteronomy-3-5 | Ari (m) | הַרְבֵּה מְאֹד |
| deuteronomy-30-10 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-30-13 | Ari (m) | הִוא, לֵאמֹר |
| deuteronomy-30-16 | Ari (m) | מִצְוֹתָיו, וּבֵרַכְךָ, בָא |
| deuteronomy-30-18 | Ari (m) | תֹּאבֵדוּן |
| deuteronomy-30-19 | Ari (m) | וְזַרְעֶךָ |
| deuteronomy-30-3 | Ari (m) | הָעַמִּים |
| deuteronomy-30-8 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-31-13 | Ari (m) | לְיִרְאָה |
| deuteronomy-31-14 | Ari (m) | וַיִּתְיַצְּבוּ |
| deuteronomy-31-16 | Ari (m) | שֹׁכֵב, וְקָם, בָא, בְּרִיתִי, כָּרַתִּי |
| deuteronomy-31-17 | Ari (m) | וּמְצָאֻהוּ |
| deuteronomy-31-20 | Ari (m) | אֲבִיאֶנּוּ, וְהֵפֵר |
| deuteronomy-31-23 | Ari (m) | וַיְצַו |
| deuteronomy-31-25 | Ari (m) | וַיְצַו |
| deuteronomy-31-29 | Ari (m) | לְהַכְעִיסוֹ |
| deuteronomy-31-9 | Ari (m) | אֲרוֹן |
| deuteronomy-32-10 | Ari (m) | כְּאִישׁוֹן |
| deuteronomy-32-14 | Ari (m) | עֵנָב |
| deuteronomy-32-15 | Ari (m) | אֱלוֹהַ |
| deuteronomy-32-16 | Ari (m) | יַכְעִיסֻהוּ |
| deuteronomy-32-17 | Ari (m) | אֱלֹהַ |
| deuteronomy-32-18 | Ari (m) | מְחֹלְלֶךָ |
| deuteronomy-32-2 | Ari (m) | כִּשְׂעִירִם |
| deuteronomy-32-21 | Ari (m) | אַכְעִיסֵם |
| deuteronomy-32-25 | Ari (m) | אֵימָה |
| deuteronomy-32-38 | Ari (m) | וְיַעְזְרֻכֶם |
| deuteronomy-32-4 | Ari (m) | הַצּוּר, דְּרָכָיו |
| deuteronomy-32-6 | Ari (m) | הֲ לַאדֹנָי |
| deuteronomy-33-11 | Ari (m) | בָּרֵךְ אֲדֹנָי חֵילוֹ וּפֹעַל, תִּרְצֶה, מָתְנַיִם |
| deuteronomy-33-13 | Ari (m) | וּלְיוֹסֵף |
| deuteronomy-33-15 | Ari (m) | גִּבְעוֹת |
| deuteronomy-33-16 | Ari (m) | וּלְקָדְקֹד |
| deuteronomy-33-27 | Ari (m) | אוֹיֵב |
| deuteronomy-33-5 | Ari (m) | בִישֻׁרוּן |
| deuteronomy-33-6 | Ari (m) | מְתָיו |
| deuteronomy-33-7 | Ari (m) | מִצָּרָיו |
| deuteronomy-33-8 | Ari (m) | וּלְלֵוִי |
| deuteronomy-33-9 | Ari (m) | יִנְצֹרוּ |
| deuteronomy-34-1 | Ari (m) | מוֹאָב, וַיַּרְאֵהוּ |
| deuteronomy-34-4 | Ari (m) | הֶרְאִיתִיךָ, בְעֵינֶיךָ |
| deuteronomy-34-6 | Ari (m) | מוֹאָב |
| deuteronomy-4-10 | Ari (m) | וְאַשְׁמִעֵם |
| deuteronomy-4-17 | Ari (m) | אֲשֶׁר, צִפּוֹר, אֲשֶׁר |
| deuteronomy-4-2 | Ari (m) | לִשְׁמֹר |
| deuteronomy-4-36 | Ari (m) | הֶרְאֲךָ |
| deuteronomy-4-40 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-4-42 | Ari (m) | הֶעָרִים |
| deuteronomy-4-46 | Ari (m) | (nothing) |
| deuteronomy-4-48 | Ari (m) | מֵעֲרֹעֵר, שִׂיאֹן |
| deuteronomy-5-10 | Ari (m) | מִצְוֹתָי |
| deuteronomy-5-18 | Ari (m) | תִתְאַוֶּה |
| deuteronomy-5-2 | Ari (m) | בְּחֹרֵב |
| deuteronomy-5-20 | Ari (m) | כְּשָׁמְעֲכֶם |
| deuteronomy-5-26 | Ari (m) | מִצְוֹתַי |
| deuteronomy-5-27 | Ari (m) | לְאָהֳלֵיכֶם |
| deuteronomy-5-6 | Ari (m) | מִצְרַיִם |
| deuteronomy-6-10 | Ari (m) | לָתֶת |
| deuteronomy-6-11 | Ari (m) | נָטָעְתָּ |
| deuteronomy-6-12 | Ari (m) | הִשָּׁמֶר |
| deuteronomy-6-2 | Ari (m) | וּמִצְוֹתָיו, יַאֲרִכֻן |
| deuteronomy-6-20 | Ari (m) | כִּי יִשְׁאָלְךָ בִנְךָ מָחָר לֵאמֹר מָה |
| deuteronomy-6-5 | Ari (m) | מְאֹדֶךָ |
| deuteronomy-6-6 | Ari (m) | הָאֵלֶּה |
| deuteronomy-6-7 | Ari (m) | בַדֶּרֶךְ, וּבְשָׁכְבְּךָ |
| deuteronomy-7-1 | Ari (m) | בָא |
| deuteronomy-7-13 | Ari (m) | אֲלָפֶיךָ |
| deuteronomy-7-14 | Ari (m) | עָקָר, וַעֲקָרָה, וּבִבְהֶמְתֶּךָ |
| deuteronomy-7-15 | Ari (m) | בְּכָל |
| deuteronomy-7-17 | Ari (m) | אֵיכָה אוּכַל |
| deuteronomy-7-19 | Ari (m) | אַתָּה יָרֵא |
| deuteronomy-7-20 | Ari (m) | הַצִּרְעָה |
| deuteronomy-7-9 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-8-11 | Ari (m) | מִצְוֹתָיו |
| deuteronomy-8-19 | Ari (m) | הַעִדֹתִי |
| deuteronomy-8-6 | Ari (m) | מִצְוֹת |
| deuteronomy-9-16 | Ari (m) | וָאֵרֶא |
| deuteronomy-9-19 | Ari (m) | (nothing) |
| deuteronomy-9-20 | Ari (m) | (nothing) |
| deuteronomy-9-22 | Ari (m) | מַקְצִפִים |
| deuteronomy-9-28 | Ari (m) | הוֹצֵאתָנוּ, הוֹצִיאָם |
| deuteronomy-9-7 | Ari (m) | הִקְצַפְתָּ |
| deuteronomy-9-8 | Ari (m) | וַיִּתְאַנַּף |
| exodus-1-10 | Ari (m) | וְנוֹסַף, עַל שֹׂנְאֵינוּ |
| exodus-1-11 | Ari (m) | עָרֵי, רַעַמְסֵס |
| exodus-1-17 | Ari (m) | דִּבֶּר |
| exodus-1-22 | Ari (m) | וַיְצַו, הַיְאֹרָה |
| exodus-1-3 | Ari (m) | יִשָּׂשכָר |
| exodus-1-8 | Ari (m) | וַיָּקָם |
| exodus-10-12 | Ari (m) | בָּאַרְבֶּה |
| exodus-10-13 | Ari (m) | הָאַרְבֶּה |
| exodus-10-14 | Ari (m) | אַרְבֶּה |
| exodus-10-16 | Ari (m) | וּלְאַהֲרֹן |
| exodus-10-18 | Ari (m) | וַיֶּעְתַּר |
| exodus-10-2 | Ari (m) | בָם |
| exodus-10-24 | Ari (m) | פַרְעֹה |
| exodus-10-3 | Ari (m) | לֵעָנֹת |
| exodus-10-4 | Ari (m) | אַרְבֶּה |
| exodus-12-11 | Ari (m) | מָתְנֵיכֶם |
| exodus-12-12 | Ari (m) | וְעָבַרְתִּי |
| exodus-12-18 | Ari (m) | בְּאַרְבָּעָה |
| exodus-12-19 | Ari (m) | וּבְאֶזְרַח |
| exodus-12-2 | Ari (m) | רִאשׁוֹן הוּא לָכֶם |
| exodus-12-35 | Ari (m) | וַיִּשְׁאֲלוּ, וּשְׂמָלֹת |
| exodus-12-36 | Ari (m) | וַיַּשְׁאִלוּם |
| exodus-12-41 | Ari (m) | וְאַרְבַּע |
| exodus-12-49 | Ari (m) | יִהְיֶה |
| exodus-13-11 | Ari (m) | יְבִאֲךָ |
| exodus-13-13 | Ari (m) | בְשֶׂה |
| exodus-13-14 | Ari (m) | כִּי יִשְׁאָלְךָ בִנְךָ, הוֹצִיאָנוּ |
| exodus-13-15 | Ari (m) | פַרְעֹה |
| exodus-13-17 | Ari (m) | בִּרְאֹתָם |
| exodus-13-19 | Ari (m) | מִזֶּה אִתְּכֶם |
| exodus-14-12 | Ari (m) | בְמִצְרַיִם |
| exodus-14-15 | Ari (m) | וְיִסָּעוּ |
| exodus-14-17 | Ari (m) | וְאִכָּבְדָה |
| exodus-14-19 | Ari (m) | וַיִּסַּע, וַיִּסַּע |
| exodus-14-27 | Ari (m) | נָסִים |
| exodus-14-4 | Ari (m) | וְאִכָּבְדָה |
| exodus-15-1 | Ari (m) | אָשִׁירָה, גָאֹה, גָּאָה, בַיָּם |
| exodus-15-10 | Ari (m) | נָשַׁפְתָּ בְרוּחֲךָ כִּסָּמוֹ |
| exodus-15-11 | Ari (m) | נֶאְדָּר |
| exodus-15-12 | Ari (m) | יְמִינְךָ תִּבְלָעֵמוֹ |
| exodus-15-13 | Ari (m) | בְחַסְדְּךָ |
| exodus-15-14 | Ari (m) | יִרְגָּזוּן |
| exodus-15-15 | Ari (m) | מוֹאָב |
| exodus-15-17 | Ari (m) | תְּבִאֵמוֹ |
| exodus-15-19 | Ari (m) | וּבְפָרָשָׁיו, בַיַּבָּשָׁה |
| exodus-15-2 | Ari (m) | יָהּ, וַאֲרֹמְמֶנְהוּ |
| exodus-15-25 | Ari (m) | נִסָּהוּ |
| exodus-15-26 | Ari (m) | רֹפְאֶךָ |
| exodus-15-4 | Ari (m) | פַּרְעֹה |
| exodus-15-6 | Ari (m) | נֶאְדָּרִי |
| exodus-15-9 | Ari (m) | תִּמְלָאֵמוֹ |
| exodus-16-12 | Ari (m) | דַּבֵּר, וִידַעְתֶּם |
| exodus-16-16 | Ari (m) | בְּאָהֳלוֹ |
| exodus-16-17 | Ari (m) | וְהַמַּמְעִיט |
| exodus-16-18 | Ari (m) | וַיָּמֹדּוּ, בָעֹמֶר |
| exodus-16-24 | Ari (m) | הִבְאִישׁ |
| exodus-16-26 | Ari (m) | תִּלְקְטֻהוּ |
| exodus-16-28 | Ari (m) | מִצְוֹתַי |
| exodus-16-3 | Ari (m) | בְיַד |
| exodus-16-32 | Ari (m) | בַּמִּדְבָּר |
| exodus-16-36 | Ari (m) | הָאֵיפָה |
| exodus-17-12 | Ari (m) | בְיָדָיו |
| exodus-17-3 | Ari (m) | הֶעֱלִיתָנוּ |
| exodus-17-6 | Ari (m) | בְּחֹרֵב, בַצּוּר |
| exodus-18-12 | Ari (m) | לֶאֱכָל |
| exodus-18-14 | Ari (m) | כָּל |
| exodus-18-19 | Ari (m) | אִיעָצְךָ |
| exodus-18-26 | Ari (m) | בְּכָל |
| exodus-18-8 | Ari (m) | לְחֹתְנוֹ |
| exodus-19-1 | Ari (m) | מִדְבַּר |
| exodus-19-16 | Ari (m) | בַיּוֹם |
| exodus-19-17 | Ari (m) | וַיִּתְיַצְּבוּ |
| exodus-19-19 | Ari (m) | בְקוֹל |
| exodus-19-2 | Ari (m) | וַיִּחַן |
| exodus-19-24 | Ari (m) | פֶּן |
| exodus-2-16 | Ari (m) | וַתָּבֹאנָה, וַתִּדְלֶנָה, וַתְּמַלֶּאנָה, הָרְהָטִים |
| exodus-2-17 | Ari (m) | וַיּוֹשִׁעָן |
| exodus-2-20 | Ari (m) | קִרְאֶן |
| exodus-2-21 | Ari (m) | בִתּוֹ |
| exodus-2-23 | Ari (m) | בַיָּמִים, וַתַּעַל, שַׁוְעָתָם |
| exodus-2-24 | Ari (m) | נַאֲקָתָם |
| exodus-2-3 | Ari (m) | הַיְאֹר |
| exodus-2-4 | Ari (m) | אֲחֹתוֹ |
| exodus-2-6 | Ari (m) | מִיַּלְדֵי |
| exodus-2-9 | Ari (m) | שְׂכָרֵךְ |
| exodus-20-17 | Ari (m) | נַסּוֹת |
| exodus-20-2 | Ari (m) | מִצְרַיִם |
| exodus-20-20 | Ari (m) | וֵאלֹהֵי, לָכֶם |
| exodus-20-22 | Ari (m) | וַתְּחַלְלֶהָ |
| exodus-20-23 | Ari (m) | בְמַעֲלֹת |
| exodus-20-5 | Ari (m) | עֲוֹן, רִבֵּעִים |
| exodus-21-18 | Ari (m) | וְהִכָּה |
| exodus-21-22 | Ari (m) | אֲנָשִׁים |
| exodus-21-32 | Ari (m) | אוֹ, אָמָה |
| exodus-21-4 | Ari (m) | בְגַפּוֹ |
| exodus-21-9 | Ari (m) | יִיעָדֶנָּה |
| exodus-22-11 | Ari (m) | מֵעִמּוֹ |
| exodus-22-12 | Ari (m) | יְבִאֵהוּ |
| exodus-22-15 | Ari (m) | אֹרָשָׂה, מָהֹר יִמְהָרֶנָּה |
| exodus-22-19 | Ari (m) | זֹבֵחַ |
| exodus-22-25 | Ari (m) | תְּשִׁיבֶנּוּ |
| exodus-22-27 | Ari (m) | וְנָשִׂיא, תָאֹר |
| exodus-22-4 | Ari (m) | יַבְעֶר, אוֹ כֶרֶם |
| exodus-23-1 | Ari (m) | חָמָס |
| exodus-23-21 | Ari (m) | הִשָּׁמֶר |
| exodus-23-23 | Ari (m) | וֶהֱבִיאֲךָ, הַחִוִּי, וְהִכְחַדְתִּיו |
| exodus-23-26 | Ari (m) | וַעֲקָרָה, אֲמַלֵּא |
| exodus-23-28 | Ari (m) | הַצִּרְעָה, הַחִוִּי |
| exodus-23-5 | Ari (m) | מַשָּׂאוֹ |
| exodus-24-4 | Ari (m) | הָהָר |
| exodus-24-5 | Ari (m) | וַיִּזְבְּחוּ זְבָחִים שְׁלָמִים לַאדֹנָי |
| exodus-24-6 | Ari (m) | בָּאַגָּנֹת |
| exodus-24-9 | Ari (m) | וַאֲבִיהוּא |
| exodus-25-10 | Ari (m) | וְאַמָּה, וְאַמָּה |
| exodus-25-12 | Ari (m) | הַשֵּׁנִית |
| exodus-25-17 | Ari (m) | אַמָּתַיִם |
| exodus-25-20 | Ari (m) | בְּכַנְפֵיהֶם |
| exodus-25-23 | Ari (m) | אַמָּתַיִם |
| exodus-25-28 | Ari (m) | בָם |
| exodus-25-5 | Ari (m) | אֵילִם, מְאָדָּמִים |
| exodus-26-12 | Ari (m) | וְסֶרַח, תִּסְרַח |
| exodus-26-13 | Ari (m) | סָרוּחַ |
| exodus-26-14 | Ari (m) | מְאָדָּמִים, מִלְמָעְלָה |
| exodus-26-16 | Ari (m) | וַחֲצִי, הָאַמָּה |
| exodus-26-18 | Ari (m) | לִפְאַת |
| exodus-26-2 | Ari (m) | הַיְרִיעָה, הַיְרִיעָה, הַיְרִיעֹת |
| exodus-26-7 | Ari (m) | עַשְׁתֵּי |
| exodus-26-8 | Ari (m) | לְעַשְׁתֵּי |
| exodus-27-12 | Ari (m) | לִפְאַת |
| exodus-27-13 | Ari (m) | לִפְאַת |
| exodus-27-16 | Ari (m) | אַמָּה, תְּכֵלֶת, וְאַדְנֵיהֶם |
| exodus-27-18 | Ari (m) | בָאַמָּה, בַּחֲמִשִּׁים |
| exodus-27-19 | Ari (m) | בְּכֹל |
| exodus-27-3 | Ari (m) | וְיָעָיו |
| exodus-27-7 | Ari (m) | צַלְעֹת, בִּשְׂאֵת |
| exodus-27-9 | Ari (m) | בָאַמָּה |
| exodus-28-1 | Ari (m) | וַאֲבִיהוּא |
| exodus-28-17 | Ari (m) | אֹדֶם |
| exodus-28-21 | Ari (m) | שָׁבֶט |
| exodus-28-25 | Ari (m) | כִּתְפוֹת |
| exodus-28-26 | Ari (m) | טַבְּעוֹת |
| exodus-28-27 | Ari (m) | טַבְּעוֹת |
| exodus-28-29 | Ari (m) | בְּבֹאוֹ |
| exodus-28-30 | Ari (m) | הָאוּרִים |
| exodus-28-32 | Ari (m) | פִי, אֹרֵג |
| exodus-28-38 | Ari (m) | עֲוֹן |
| exodus-28-40 | Ari (m) | אַבְנֵטִים, וּמִגְבָּעוֹת, לְכָבוֹד |
| exodus-28-43 | Ari (m) | עָוֹן |
| exodus-29-15 | Ari (m) | וְסָמְכוּ |
| exodus-29-25 | Ari (m) | הוּא לַאדֹנָי |
| exodus-29-29 | Ari (m) | לְמָשְׁחָה בָהֶם וּלְמַלֵּא בָם אֶת |
| exodus-29-42 | Ari (m) | אִוָּעֵד |
| exodus-29-44 | Ari (m) | מוֹעֵד |
| exodus-29-5 | Ari (m) | אַהֲרֹן |
| exodus-3-11 | Ari (m) | אוֹצִיא |
| exodus-3-22 | Ari (m) | בֵּיתָהּ |
| exodus-3-7 | Ari (m) | רָאֹה |
| exodus-3-9 | Ari (m) | וְעַתָּה |
| exodus-30-12 | Ari (m) | בִּפְקֹד, בִּפְקֹד |
| exodus-30-18 | Ari (m) | כִּיּוֹר, מוֹעֵד |
| exodus-30-29 | Ari (m) | יִקְדָּשׁ |
| exodus-30-37 | Ari (m) | לָכֶם |
| exodus-30-6 | Ari (m) | אִוָּעֵד |
| exodus-31-17 | Ari (m) | וּבֵין בְּנֵי, אוֹת, כִּי שֵׁשֶׁת |
| exodus-31-18 | Ari (m) | וַיִּתֵּן |
| exodus-31-2 | Ari (m) | בֶן חוּר |
| exodus-31-6 | Ari (m) | אָהֳלִיאָב, אֲחִיסָמָךְ |
| exodus-32-1 | Ari (m) | מֶה הָיָה |
| exodus-32-10 | Ari (m) | וְיִחַר |
| exodus-32-11 | Ari (m) | אַפְּךָ |
| exodus-32-19 | Ari (m) | וַיִּחַר |
| exodus-32-21 | Ari (m) | (nothing), גְדֹלָה |
| exodus-32-22 | Ari (m) | כִּי בְרָע הוּא |
| exodus-32-23 | Ari (m) | מֶה הָיָה |
| exodus-32-24 | Ari (m) | הִתְפָּרָקוּ, בָאֵשׁ |
| exodus-32-8 | Ari (m) | סָרוּ |
| exodus-33-12 | Ari (m) | בְשֵׁם |
| exodus-33-13 | Ari (m) | וְאֵדָעֲךָ |
| exodus-33-16 | Ari (m) | וְנִפְלֵינוּ |
| exodus-33-17 | Ari (m) | וָאֵדָעֲךָ |
| exodus-33-8 | Ari (m) | אָהֳלוֹ, בֹּאוֹ |
| exodus-34-15 | Ari (m) | מִזִּבְחוֹ |
| exodus-34-20 | Ari (m) | בְשֶׂה |
| exodus-34-24 | Ari (m) | אוֹרִישׁ |
| exodus-34-34 | Ari (m) | וּבְבֹא |
| exodus-34-35 | Ari (m) | עוֹר |
| exodus-34-7 | Ari (m) | עָוֹן, עֲוֹן |
| exodus-34-9 | Ari (m) | לַעֲוֹנֵנוּ |
| exodus-35-28 | Ari (m) | וְלִקְטֹרֶת הַסַּמִּים |
| exodus-35-34 | Ari (m) | וְאָהֳלִיאָב, אֲחִיסָמָךְ |
| exodus-35-35 | Ari (m) | וְאֹרֵג |
| exodus-36-11 | Ari (m) | הַשֵּׁנִית |
| exodus-36-12 | Ari (m) | בַּיְרִיעָה, הַיְרִיעָה |
| exodus-36-14 | Ari (m) | עַשְׁתֵּי |
| exodus-36-15 | Ari (m) | הַיְרִיעָה, הַיְרִיעָה, לְעַשְׁתֵּי, יְרִיעֹת |
| exodus-36-2 | Ari (m) | אָהֳלִיאָב |
| exodus-36-25 | Ari (m) | לִפְאַת |
| exodus-36-26 | Ari (m) | וְאַרְבָּעִים אַדְנֵיהֶם כָּסֶף |
| exodus-36-31 | Ari (m) | צֶלַע, הָאֶחָת |
| exodus-36-33 | Ari (m) | וַיַּעַשׂ |
| exodus-36-38 | Ari (m) | וְאַדְנֵיהֶם |
| exodus-36-6 | Ari (m) | וַיְצַו |
| exodus-37-1 | Ari (m) | אַמָּתַיִם |
| exodus-37-20 | Ari (m) | גְבִעִים |
| exodus-37-25 | Ari (m) | וְאַמָּתַיִם |
| exodus-37-3 | Ari (m) | וַיִּצֹק, הַשֵּׁנִית |
| exodus-37-9 | Ari (m) | סֹכְכִים |
| exodus-38-23 | Ari (m) | אָהֳלִיאָב |
| exodus-38-29 | Ari (m) | וְאַלְפַּיִם |
| exodus-38-8 | Ari (m) | בְּמַרְאֹת, הַצֹּבְאֹת |
| exodus-38-9 | Ari (m) | לִפְאַת, בָּאַמָּה |
| exodus-39-1 | Ari (m) | עָשׂוּ |
| exodus-39-14 | Ari (m) | שָׁבֶט |
| exodus-39-19 | Ari (m) | בָּיְתָה |
| exodus-39-20 | Ari (m) | וַיִּתְּנֻם |
| exodus-39-22 | Ari (m) | וַיַּעַשׂ |
| exodus-39-30 | Ari (m) | צִיץ |
| exodus-39-34 | Ari (m) | הַמְאָדָּמִים |
| exodus-4-18 | Ari (m) | אֵלֲכָה |
| exodus-4-6 | Ari (m) | הָבֵא |
| exodus-4-9 | Ari (m) | בַּיַּבָּשֶׁת |
| exodus-40-34 | Ari (m) | מוֹעֵד |
| exodus-40-35 | Ari (m) | וְלֹא |
| exodus-40-36 | Ari (m) | יִסְעוּ |
| exodus-40-37 | Ari (m) | יִסְעוּ |
| exodus-40-38 | Ari (m) | בְּכָל, מַסְעֵיהֶם |
| exodus-5-14 | Ari (m) | כִלִּיתֶם |
| exodus-5-16 | Ari (m) | עֲשׂוּ |
| exodus-5-20 | Ari (m) | בְּצֵאתָם |
| exodus-5-21 | Ari (m) | פַרְעֹה |
| exodus-5-3 | Ari (m) | נֵלֲכָה, אוֹ בֶחָרֶב |
| exodus-6-1 | Ari (m) | יְשַׁלְּחֵם |
| exodus-6-23 | Ari (m) | לְאִשָּׁה, אֲבִיהוּא |
| exodus-6-24 | Ari (m) | וַאֲבִיאָסָף |
| exodus-6-30 | Ari (m) | עֲרַל |
| exodus-7-17 | Ari (m) | בַּיְאֹר |
| exodus-7-20 | Ari (m) | בַּיְאֹר, בַּיְאֹר |
| exodus-7-21 | Ari (m) | הַדָּם |
| exodus-8-11 | Ari (m) | פַּרְעֹה, וְהַכְבֵּד |
| exodus-8-13 | Ari (m) | בְמַטֵּהוּ, כִנִּים |
| exodus-8-15 | Ari (m) | (nothing), לֵב פַּרְעֹה |
| exodus-8-16 | Ari (m) | הַמָּיְמָה |
| exodus-8-20 | Ari (m) | עָרֹב, הֶעָרֹב |
| exodus-8-22 | Ari (m) | יִסְקְלֻנוּ |
| exodus-8-5 | Ari (m) | בַּיְאֹר |
| exodus-8-7 | Ari (m) | וְסָרוּ, בַּיְאֹר |
| exodus-9-10 | Ari (m) | אֲבַעְבֻּעֹת |
| exodus-9-17 | Ari (m) | עוֹדְךָ |
| exodus-9-3 | Ari (m) | הוֹיָה |
| exodus-9-35 | Ari (m) | בְּיַד |
| exodus-9-8 | Ari (m) | פַרְעֹה |
| exodus-9-9 | Ari (m) | פֹּרֵחַ |
| genesis-1-15 | Ari (m) | בִּרְקִיעַ, לְהָאִיר |
| genesis-1-20 | Ari (m) | יִשְׁרְצוּ, שֶׁרֶץ |
| genesis-1-21 | Ari (m) | וַיַּרְא |
| genesis-1-22 | Ari (m) | וַיְבָרֶךְ |
| genesis-1-25 | Ari (m) | וַיַּעַשׂ, וַיַּרְא |
| genesis-1-27 | Ari (m) | זָכָר, וּנְקֵבָה |
| genesis-1-30 | Ari (m) | וַיְהִי |
| genesis-1-8 | Ari (m) | שָׁמָיִם |
| genesis-1-9 | Ari (m) | יִקָּווּ |
| genesis-10-10 | Ari (m) | שִׁנְעָר |
| genesis-10-12 | Ari (m) | (nothing) |
| genesis-10-15 | Ari (m) | צִידֹן, חֵת |
| genesis-10-17 | Ari (m) | הַחִוִּי |
| genesis-10-19 | Ari (m) | לָשַׁע |
| genesis-10-22 | Ari (m) | וְאַרְפַּכְשַׁד |
| genesis-10-24 | Ari (m) | וְאַרְפַּכְשַׁד |
| genesis-10-31 | Ari (m) | לְגוֹיֵהֶם |
| genesis-10-5 | Ari (m) | בְּגוֹיֵהֶם |
| genesis-10-7 | Ari (m) | סְבָא |
| genesis-11-11 | Ari (m) | אַרְפַּכְשָׁד |
| genesis-11-13 | Ari (m) | אַרְפַּכְשַׁד |
| genesis-11-15 | Ari (m) | וַיְחִי שֶׁלַח, הוֹלִידוֹ אֶת |
| genesis-11-21 | Ari (m) | הוֹלִידוֹ |
| genesis-11-23 | Ari (m) | הוֹלִידוֹ |
| genesis-11-25 | Ari (m) | הוֹלִידוֹ |
| genesis-11-27 | Ari (m) | אַבְרָם, לוֹט |
| genesis-11-29 | Ari (m) | אַבְרָם, אַבְרָם, יִסְכָּה |
| genesis-11-30 | Ari (m) | עֲקָרָה, אֵין |
| genesis-11-31 | Ari (m) | אַבְרָם, אַבְרָם |
| genesis-12-1 | Ari (m) | אַבְרָם, אַרְאֶךָּ |
| genesis-12-17 | Ari (m) | וַיְנַגַּע אֲדֹנָי אֶת פַּרְעֹה נְגָעִים, בֵּיתוֹ עַל דְּבַר |
| genesis-12-20 | Ari (m) | וַיְצַו, אֲנָשִׁים |
| genesis-12-3 | Ari (m) | וַאֲבָרֲכָה, אָאֹר |
| genesis-12-4 | Ari (m) | אַבְרָם |
| genesis-12-5 | Ari (m) | אַבְרָם |
| genesis-12-6 | Ari (m) | אַבְרָם |
| genesis-12-7 | Ari (m) | אַבְרָם, לַאדֹנָי |
| genesis-12-8 | Ari (m) | וַיַּעְתֵּק, אָהֳלֹה, בֵּית, אֵל, וְהָעַי |
| genesis-13-1 | Ari (m) | אַבְרָם |
| genesis-13-11 | Ari (m) | וַיִּסַּע |
| genesis-13-12 | Ari (m) | אַבְרָם, בְּעָרֵי, וַיֶּאֱהַל |
| genesis-13-18 | Ari (m) | אַבְרָם |
| genesis-13-2 | Ari (m) | וְאַבְרָם |
| genesis-13-3 | Ari (m) | אָהֳלוֹ |
| genesis-13-4 | Ari (m) | אַבְרָם |
| genesis-13-5 | Ari (m) | אַבְרָם |
| genesis-13-7 | Ari (m) | אַבְרָם |
| genesis-13-8 | Ari (m) | בֵּינִי |
| genesis-13-9 | Ari (m) | וְאַשְׂמְאִילָה |
| genesis-14-1 | Ari (m) | וְתִדְעָל |
| genesis-14-12 | Ari (m) | אַבְרָם |
| genesis-14-13 | Ari (m) | אַבְרָם |
| genesis-14-15 | Ari (m) | וַעֲבָדָיו, (nothing), לְדַמָּשֶׂק |
| genesis-14-23 | Ari (m) | אַבְרָם |
| genesis-14-24 | Ari (m) | עָנֵר, וּמַמְרֵא |
| genesis-14-3 | Ari (m) | הַשִּׂדִּים הוּא |
| genesis-14-4 | Ari (m) | כְּדָרְלָעֹמֶר |
| genesis-14-9 | Ari (m) | וְתִדְעָל, מֶלֶךְ שִׁנְעָר וְאַרְיוֹךְ מֶלֶךְ אֶלָּסָר |
| genesis-15-1 | Ari (m) | אַבְרָם, אַבְרָם, שְׂכָרְךָ |
| genesis-15-11 | Ari (m) | אַבְרָם |
| genesis-15-12 | Ari (m) | אַבְרָם |
| genesis-15-17 | Ari (m) | וַיְהִי |
| genesis-15-18 | Ari (m) | פְּרָת |
| genesis-15-19 | Ari (m) | הַקֵּינִי |
| genesis-15-5 | Ari (m) | זַרְעֶךָ |
| genesis-15-8 | Ari (m) | אִירָשֶׁנָּה |
| genesis-16-1 | Ari (m) | אַבְרָם |
| genesis-16-10 | Ari (m) | אַרְבֶּה |
| genesis-16-11 | Ari (m) | עָנְיֵךְ |
| genesis-16-12 | Ari (m) | בַכֹּל |
| genesis-16-15 | Ari (m) | אַבְרָם |
| genesis-16-16 | Ari (m) | וְאַבְרָם |
| genesis-16-3 | Ari (m) | אַבְרָם, אַבְרָם |
| genesis-16-5 | Ari (m) | אַבְרָם |
| genesis-16-6 | Ari (m) | אַבְרָם, וַתְּעַנֶּהָ |
| genesis-16-7 | Ari (m) | וַיִּמְצָאָהּ, שׁוּר |
| genesis-17-14 | Ari (m) | וְעָרֵל |
| genesis-17-15 | Ari (m) | אִשְׁתְּךָ |
| genesis-17-2 | Ari (m) | וְאֶתְּנָה, בֵּינִי, בִּמְאֹד |
| genesis-17-20 | Ari (m) | בִּמְאֹד |
| genesis-17-21 | Ari (m) | אָקִים |
| genesis-17-25 | Ari (m) | עֶשְׂרֵה |
| genesis-17-3 | Ari (m) | אַבְרָם |
| genesis-18-15 | Ari (m) | יָרֵאָה |
| genesis-18-19 | Ari (m) | יְדַעְתִּיו |
| genesis-18-25 | Ari (m) | כַצַדִּיק כָּרָשָׁע |
| genesis-18-6 | Ari (m) | סְאִים |
| genesis-18-8 | Ari (m) | וְחָלָב |
| genesis-18-9 | Ari (m) | בָאֹהֶל |
| genesis-19-11 | Ari (m) | וַיִּלְאוּ |
| genesis-19-16 | Ari (m) | וַיֹּצִאֻהוּ |
| genesis-19-22 | Ari (m) | הִמָּלֵט, צוֹעַר |
| genesis-19-3 | Ari (m) | אָפָה |
| genesis-19-30 | Ari (m) | מִצּוֹעַר, בְּצוֹעַר |
| genesis-19-4 | Ari (m) | מִנַּעַר |
| genesis-19-5 | Ari (m) | וְנֵדְעָה |
| genesis-2-1 | Ari (m) | וַיְכֻלּוּ, וְכָל צְבָאָם |
| genesis-2-12 | Ari (m) | הַהִוא |
| genesis-2-16 | Ari (m) | וַיְצַו |
| genesis-2-19 | Ari (m) | וַיָּבֵא |
| genesis-2-21 | Ari (m) | מִצַּלְעֹתָיו |
| genesis-2-4 | Ari (m) | בְּהִבָּרְאָם |
| genesis-20-12 | Ari (m) | וַתְּהִי לִי לְאִשָּׁה |
| genesis-20-17 | Ari (m) | וְאַמְהֹתָיו |
| genesis-20-2 | Ari (m) | (nothing) |
| genesis-20-8 | Ari (m) | וַיַּשְׁכֵּם, בְּאָזְנֵיהֶם, וַיִּירְאוּ |
| genesis-21-15 | Ari (m) | וַיִּכְלוּ |
| genesis-21-16 | Ari (m) | וַתֵּבְךְּ |
| genesis-21-17 | Ari (m) | מַה לָּךְ |
| genesis-21-18 | Ari (m) | אֲשִׂימֶנּוּ |
| genesis-21-20 | Ari (m) | קַשָּׁת |
| genesis-21-21 | Ari (m) | פָּארָן |
| genesis-21-23 | Ari (m) | הִשָּׁבְעָה |
| genesis-21-7 | Ari (m) | הֵינִיקָה |
| genesis-21-9 | Ari (m) | מְצַחֵק |
| genesis-22-12 | Ari (m) | יְרֵא |
| genesis-22-13 | Ari (m) | (nothing) |
| genesis-22-17 | Ari (m) | אַרְבֶּה |
| genesis-22-19 | Ari (m) | בִּבְאֵר |
| genesis-22-20 | Ari (m) | יָלְדָה |
| genesis-22-21 | Ari (m) | אֶת, בְּכֹרוֹ וְאֶת, וְאֶת, קְמוּאֵל |
| genesis-22-22 | Ari (m) | יִדְלָף, בְּתוּאֵל |
| genesis-23-11 | Ari (m) | לְךָ |
| genesis-23-13 | Ari (m) | וְאֶקְבְּרָה |
| genesis-23-19 | Ari (m) | קָבַר |
| genesis-23-20 | Ari (m) | חֵת |
| genesis-23-4 | Ari (m) | וְאֶקְבְּרָה |
| genesis-24-1 | Ari (m) | בָּא, בַּיָּמִים |
| genesis-24-14 | Ari (m) | כַדֵּךְ |
| genesis-24-15 | Ari (m) | כִּלָּה |
| genesis-24-17 | Ari (m) | הַגְמִיאִינִי |
| genesis-24-20 | Ari (m) | וַתְּעַר, לְכָל |
| genesis-24-34 | Ari (m) | וַיֹּאמַר |
| genesis-24-46 | Ari (m) | הִשְׁקָתָה |
| genesis-24-54 | Ari (m) | בַבֹּקֶר |
| genesis-25-13 | Ari (m) | בִּשְׁמֹתָם, וְאַדְבְּאֵל |
| genesis-25-21 | Ari (m) | וַיֶּעְתַּר, לְנֹכַח, עֲקָרָה, וַיֵּעָתֶר, וַתַּהַר |
| genesis-25-23 | Ari (m) | מִלְאֹם |
| genesis-25-25 | Ari (m) | וַיֵּצֵא |
| genesis-25-29 | Ari (m) | עָיֵף |
| genesis-25-30 | Ari (m) | הַלְעִיטֵנִי |
| genesis-25-5 | Ari (m) | לוֹ |
| genesis-26-12 | Ari (m) | (nothing), (nothing) |
| genesis-26-18 | Ari (m) | וַיְסַתְּמוּם, פְּלִשְׁתִּים |
| genesis-26-21 | Ari (m) | בְּאֵר |
| genesis-26-4 | Ari (m) | בְזַרְעֲךָ |
| genesis-26-5 | Ari (m) | וַיִּשְׁמֹר, מִצְוֹתַי |
| genesis-27-1 | Ari (m) | מֵרְאֹת |
| genesis-27-10 | Ari (m) | יְבָרֶכְךָ |
| genesis-27-21 | Ari (m) | גְּשָׁה, עֵשָׂו אִם |
| genesis-27-25 | Ari (m) | תְּבָרֶכְךָ, וַיֵּשְׁתְּ |
| genesis-27-3 | Ari (m) | וְעַתָּה שָׂא נָא כֵלֶיךָ תֶּלְיְךָ וְקַשְׁתֶּךָ וְצֵא הַשָּׂדֶה וְצוּדָה לִּי צָיִד |
| genesis-27-33 | Ari (m) | וָאֲבָרֲכֵהוּ |
| genesis-27-39 | Ari (m) | הַשָּׁמַיִם |
| genesis-27-4 | Ari (m) | תְּבָרֶכְךָ |
| genesis-27-40 | Ari (m) | עֻלּוֹ |
| genesis-27-41 | Ari (m) | וְאַהַרְגָה |
| genesis-27-46 | Ari (m) | בְחַיַּי |
| genesis-28-1 | Ari (m) | וַיְצַוֵּהוּ וַיֹּאמֶר |
| genesis-28-12 | Ari (m) | וַיַּחֲלֹם |
| genesis-28-19 | Ari (m) | לוּז |
| genesis-28-21 | Ari (m) | בְשָׁלוֹם |
| genesis-28-4 | Ari (m) | אִתָּךְ, לְרִשְׁתְּךָ |
| genesis-28-9 | Ari (m) | נָשָׁיו |
| genesis-29-11 | Ari (m) | וַיֵּבְךְּ |
| genesis-29-13 | Ari (m) | וַיְבִיאֵהוּ |
| genesis-29-15 | Ari (m) | הֲכִי |
| genesis-29-2 | Ari (m) | בְאֵר |
| genesis-29-20 | Ari (m) | בְעֵינָיו, אֹתָהּ |
| genesis-29-21 | Ari (m) | הָבָה, וְאָבוֹאָה |
| genesis-29-23 | Ari (m) | בָעֶרֶב, בִתּוֹ |
| genesis-29-25 | Ari (m) | וַיְהִי, לֵאָה, מַה זֹּאת, בְרָחֵל, וְלָמָּה, רִמִּיתָנִי |
| genesis-29-26 | Ari (m) | הַצְּעִירָה |
| genesis-29-27 | Ari (m) | שְׁבֻעַ |
| genesis-29-28 | Ari (m) | שְׁבֻעַ |
| genesis-29-31 | Ari (m) | שְׂנוּאָה |
| genesis-29-35 | Ari (m) | קָרְאָה |
| genesis-29-5 | Ari (m) | נָחוֹר |
| genesis-3-10 | Ari (m) | וָאִירָא |
| genesis-3-12 | Ari (m) | (nothing) |
| genesis-3-13 | Ari (m) | הִשִּׁיאַנִי וָאֹכֵל |
| genesis-3-15 | Ari (m) | אָשִׁית |
| genesis-3-16 | Ari (m) | אַרְבֶּה |
| genesis-3-20 | Ari (m) | כִּי |
| genesis-3-23 | Ari (m) | לַעֲבֹד, הָאֲדָמָה |
| genesis-3-3 | Ari (m) | תִגְּעוּ |
| genesis-3-4 | Ari (m) | הָאִשָּׁה לֹא מוֹת |
| genesis-30-18 | Ari (m) | שְׂכָרִי |
| genesis-30-19 | Ari (m) | לֵאָה, וַתֵּלֶד |
| genesis-30-2 | Ari (m) | וַיִּחַר |
| genesis-30-23 | Ari (m) | וַתֵּלֶד |
| genesis-30-32 | Ari (m) | וְכָל |
| genesis-30-33 | Ari (m) | שְׂכָרִי |
| genesis-30-35 | Ari (m) | וְהַטְּלֻאִים |
| genesis-30-39 | Ari (m) | וַתֵּלַדְןָ הַצֹּאן, וּטְלֻאִים |
| genesis-30-6 | Ari (m) | קָרְאָה |
| genesis-30-9 | Ari (m) | לֵאָה כִּי עָמְדָה |
| genesis-31-1 | Ari (m) | לְאָבִינוּ, לְאָבִינוּ |
| genesis-31-17 | Ari (m) | וַיָּקָם, וַיִּשָּׂא |
| genesis-31-2 | Ari (m) | וַיַּרְא |
| genesis-31-21 | Ari (m) | וְכָל, (nothing) |
| genesis-31-28 | Ari (m) | הִסְכַּלְתָּ |
| genesis-31-3 | Ari (m) | וְאֶהְיֶה |
| genesis-31-37 | Ari (m) | כֹּה נֶגֶד |
| genesis-31-4 | Ari (m) | וּלְלֵאָה |
| genesis-31-42 | Ari (m) | אָמֶשׁ |
| genesis-31-47 | Ari (m) | גַּלְעֵד |
| genesis-31-48 | Ari (m) | גַּלְעֵד |
| genesis-31-5 | Ari (m) | שִׁלְשֹׁם, וֵאלֹהֵי |
| genesis-32-11 | Ari (m) | הָיִיתִי |
| genesis-32-14 | Ari (m) | בְיָדוֹ |
| genesis-32-16 | Ari (m) | וַעְיָרִם |
| genesis-32-18 | Ari (m) | וַיְצַו, וִשְׁאֵלְךָ |
| genesis-32-20 | Ari (m) | וַיְצַו |
| genesis-32-33 | Ari (m) | הַזֶּה כִּי |
| genesis-32-4 | Ari (m) | עֵשָׂו |
| genesis-33-10 | Ari (m) | כִּרְאֹת |
| genesis-33-11 | Ari (m) | וַיִּפְצַר |
| genesis-33-12 | Ari (m) | נִסְעָה |
| genesis-33-18 | Ari (m) | וַיִּחַן |
| genesis-34-1 | Ari (m) | בַּת לֵאָה |
| genesis-34-10 | Ari (m) | וּסְחָרוּהָ |
| genesis-34-12 | Ari (m) | וְאֶתְּנָה |
| genesis-34-14 | Ari (m) | הַדָּבָר, עָרְלָה |
| genesis-34-2 | Ari (m) | הַחִוִּי, וַיְעַנֶּהָ |
| genesis-34-4 | Ari (m) | אָבִיו |
| genesis-34-6 | Ari (m) | חֲמוֹר |
| genesis-34-7 | Ari (m) | כְּשָׁמְעָם, וַיִּתְעַצְּבוּ, וַיִּחַר, בְיִשְׂרָאֵל |
| genesis-35-1 | Ari (m) | בְּבָרְחֲךָ |
| genesis-35-2 | Ari (m) | וְהַחֲלִיפוּ |
| genesis-35-20 | Ari (m) | (nothing) |
| genesis-35-21 | Ari (m) | מֵהָלְאָה |
| genesis-35-22 | Ari (m) | הַהִוא |
| genesis-35-23 | Ari (m) | וְיִשָּׂשכָר |
| genesis-35-25 | Ari (m) | בִלְהָה |
| genesis-35-27 | Ari (m) | (nothing) |
| genesis-35-5 | Ari (m) | וַיִּסָּעוּ |
| genesis-35-7 | Ari (m) | בֵּית |
| genesis-35-9 | Ari (m) | (nothing), בְּבֹאוֹ |
| genesis-36-10 | Ari (m) | אֱלִיפַז, עָדָה |
| genesis-36-18 | Ari (m) | אָהֳלִיבָמָה, יַעְלָם, אָהֳלִיבָמָה |
| genesis-36-23 | Ari (m) | עַלְוָן |
| genesis-36-24 | Ari (m) | וְאַיָּה, עֲנָה |
| genesis-36-25 | Ari (m) | וְאָהֳלִיבָמָה |
| genesis-36-27 | Ari (m) | בִּלְהָן, וְזַעֲוָן |
| genesis-36-32 | Ari (m) | דִּנְהָבָה |
| genesis-36-40 | Ari (m) | יְתֵת |
| genesis-37-15 | Ari (m) | וַיִּשְׁאָלֵהוּ |
| genesis-37-2 | Ari (m) | נַעַר |
| genesis-37-20 | Ari (m) | וְנַשְׁלִכֵהוּ, אֲכָלָתְהוּ |
| genesis-37-25 | Ari (m) | לֶאֱכָל |
| genesis-37-30 | Ari (m) | אָנָה אֲנִי בָא |
| genesis-37-35 | Ari (m) | וַיְמָאֵן, וַיֵּבְךְּ |
| genesis-38-1 | Ari (m) | (nothing), עֲדֻלָּמִי |
| genesis-38-11 | Ari (m) | לְתָמָר כַּלָּתוֹ, בֵית אָבִיךְ, אָמַר, כְּאֶחָיו |
| genesis-38-12 | Ari (m) | שׁוּעַ |
| genesis-38-14 | Ari (m) | וַתָּסַר |
| genesis-38-19 | Ari (m) | וַתָּסַר, צְעִיפָהּ |
| genesis-38-22 | Ari (m) | בָזֶה |
| genesis-38-5 | Ari (m) | בֵּן, וְהָיָה, בִכְזִיב |
| genesis-39-15 | Ari (m) | כְשָׁמְעוֹ |
| genesis-39-19 | Ari (m) | וַיִּחַר |
| genesis-39-20 | Ari (m) | הַסֹּהַר, הַמֶּלֶךְ אֲסוּרִים וַיְהִי, הַסֹּהַר |
| genesis-39-7 | Ari (m) | אֵשֶׁת |
| genesis-39-8 | Ari (m) | וַיְמָאֵן |
| genesis-4-10 | Ari (m) | מִן |
| genesis-4-13 | Ari (m) | עֲוֹנִי |
| genesis-4-15 | Ari (m) | אוֹת |
| genesis-4-5 | Ari (m) | וַיִּחַר |
| genesis-4-6 | Ari (m) | קָיִן |
| genesis-40-2 | Ari (m) | סָרִיסָיו |
| genesis-40-7 | Ari (m) | בְמִשְׁמַר |
| genesis-41-19 | Ari (m) | תֹּאַר |
| genesis-41-20 | Ari (m) | הַבְּרִיאֹת |
| genesis-41-29 | Ari (m) | שָׂבָע |
| genesis-41-32 | Ari (m) | הִשָּׁנוֹת |
| genesis-41-34 | Ari (m) | פַרְעֹה |
| genesis-41-35 | Ari (m) | בֶּעָרִים |
| genesis-41-50 | Ari (m) | בְּטֶרֶם, אוֹן |
| genesis-41-55 | Ari (m) | וַתִּרְעַב |
| genesis-41-7 | Ari (m) | וַתִּבְלַעְנָה |
| genesis-42-11 | Ari (m) | נָחְנוּ |
| genesis-42-18 | Ari (m) | עֲשׂוּ |
| genesis-42-22 | Ari (m) | בַיֶּלֶד |
| genesis-42-23 | Ari (m) | וְהֵם |
| genesis-42-24 | Ari (m) | וַיֵּבְךְּ, מֵאִתָּם |
| genesis-42-25 | Ari (m) | וַיְצַו |
| genesis-42-29 | Ari (m) | הַקֹּרֹת |
| genesis-42-34 | Ari (m) | וְאֵדְעָה |
| genesis-43-12 | Ari (m) | אַמְתְּחֹתֵיכֶם |
| genesis-43-16 | Ari (m) | הָבֵא |
| genesis-43-18 | Ari (m) | בְּאַמְתְּחֹתֵינוּ |
| genesis-43-21 | Ari (m) | אַמְתְּחֹתֵינוּ, אַמְתַּחְתּוֹ |
| genesis-43-28 | Ari (m) | וַיִּשְׁתַּחֲוֻּו |
| genesis-43-34 | Ari (m) | מַשְׂאֹת |
| genesis-43-6 | Ari (m) | הֲרֵעֹתֶם |
| genesis-43-9 | Ari (m) | אֶעֶרְבֶנּוּ |
| genesis-44-18 | Ari (m) | בְּאָזְנֵי, כְּפַרְעֹה |
| genesis-44-32 | Ari (m) | עָרַב, אֲבִיאֶנּוּ |
| genesis-44-8 | Ari (m) | אַמְתְּחֹתֵינוּ |
| genesis-45-11 | Ari (m) | וְכִלְכַּלְתִּי |
| genesis-45-14 | Ari (m) | וַיֵּבְךְּ |
| genesis-45-15 | Ari (m) | וַיֵּבְךְּ |
| genesis-45-16 | Ari (m) | אֲחֵי, וַיִּיטַב |
| genesis-45-18 | Ari (m) | וְאֶתְּנָה, וְאִכְלוּ |
| genesis-45-19 | Ari (m) | עֲשׂוּ |
| genesis-45-21 | Ari (m) | עֲגָלוֹת |
| genesis-45-7 | Ari (m) | שְׁאֵרִית |
| genesis-46-1 | Ari (m) | וַיִּסַּע, וְכָל |
| genesis-46-13 | Ari (m) | יִשָׂשכָר |
| genesis-46-16 | Ari (m) | וְחַגִּי, וְאַרְאֵלִי |
| genesis-46-27 | Ari (m) | בְמִצְרַיִם |
| genesis-46-29 | Ari (m) | וַיֶּאְסֹר, וַיֵּבְךְּ |
| genesis-46-3 | Ari (m) | אֲשִׂימְךָ |
| genesis-46-31 | Ari (m) | אֶעֱלֶה |
| genesis-46-4 | Ari (m) | אַעַלְךָ |
| genesis-46-9 | Ari (m) | וּפַלּוּא |
| genesis-47-11 | Ari (m) | רַעְמְסֵס |
| genesis-47-17 | Ari (m) | וַיְנַהֲלֵם, בְּכָל, (nothing) |
| genesis-47-27 | Ari (m) | מִצְרַיִם, וַיֵּאָחֲזוּ, וַיִּפְרוּ וַיִּרְבּוּ מְאֹד |
| genesis-47-29 | Ari (m) | תִקְבְּרֵנִי |
| genesis-47-6 | Ari (m) | הִוא |
| genesis-48-11 | Ari (m) | רְאֹה, זַרְעֶךָ |
| genesis-48-14 | Ari (m) | אֶפְרַיִם, וְאֶת, שְׂמֹאלוֹ |
| genesis-48-7 | Ari (m) | בְּעוֹד, וָאֶקְבְּרֶהָ |
| genesis-49-16 | Ari (m) | דָּן יָדִין |
| genesis-49-18 | Ari (m) | קִוִּיתִי |
| genesis-49-2 | Ari (m) | הִקָּבְצוּ |
| genesis-49-26 | Ari (m) | וּלְקָדְקֹד |
| genesis-49-29 | Ari (m) | וַיְצַו |
| genesis-49-4 | Ari (m) | תּוֹתַר |
| genesis-49-5 | Ari (m) | חָמָס |
| genesis-49-6 | Ari (m) | בְאַפָּם, עִקְּרוּ |
| genesis-49-7 | Ari (m) | אֲחַלְּקֵם |
| genesis-5-13 | Ari (m) | וַיּוֹלֶד |
| genesis-5-2 | Ari (m) | הִבָּרְאָם |
| genesis-5-26 | Ari (m) | הוֹלִידוֹ |
| genesis-5-3 | Ari (m) | שֵׁת |
| genesis-5-32 | Ari (m) | יָפֶת |
| genesis-50-2 | Ari (m) | וַיְצַו |
| genesis-50-22 | Ari (m) | מֵאָה, וָעֶשֶׂר |
| genesis-50-3 | Ari (m) | וַיִּמְלְאוּ |
| genesis-50-5 | Ari (m) | אֶעֱלֶה, וְאֶקְבְּרָה |
| genesis-6-10 | Ari (m) | יָפֶת |
| genesis-6-3 | Ari (m) | בָאָדָם |
| genesis-6-4 | Ari (m) | בָאָרֶץ |
| genesis-6-5 | Ari (m) | רַע, כָּל |
| genesis-7-2 | Ari (m) | הִוא |
| genesis-8-19 | Ari (m) | וְכָל, יָצְאוּ |
| genesis-8-4 | Ari (m) | אֲרָרָט |
| genesis-9-20 | Ari (m) | וַיִּטַּע |
| genesis-9-21 | Ari (m) | אָהֳלֹה |
| genesis-9-24 | Ari (m) | מִיֵּינוֹ |
| genesis-9-27 | Ari (m) | כְנַעַן |
| genesis-9-6 | Ari (m) | בָּאָדָם |
| leviticus-1-16 | Ari (m) | מֻרְאָתוֹ |
| leviticus-1-4 | Ari (m) | וְסָמַךְ |
| leviticus-1-8 | Ari (m) | הַפָּדֶר |
| leviticus-10-1 | Ari (m) | וַאֲבִיהוּא |
| leviticus-10-12 | Ari (m) | מֵאִשֵּׁי |
| leviticus-10-17 | Ari (m) | אֲכַלְתֶּם, הַחַטָּאת, (nothing), נָתַן לָכֶם לָשֵׂאת אֶת עֲוֹן |
| leviticus-10-5 | Ari (m) | וַיִּשָּׂאֻם |
| leviticus-10-6 | Ari (m) | וּלְאִיתָמָר |
| leviticus-11-13 | Ari (m) | הָעָזְנִיָּה |
| leviticus-11-21 | Ari (m) | כְרָעַיִם |
| leviticus-11-26 | Ari (m) | הִוא, מַפְרֶסֶת |
| leviticus-11-3 | Ari (m) | מַפְרֶסֶת |
| leviticus-11-33 | Ari (m) | תִשְׁבֹּרוּ |
| leviticus-11-4 | Ari (m) | הוּא לָכֶם |
| leviticus-11-41 | Ari (m) | הַשֹּׁרֵץ |
| leviticus-11-42 | Ari (m) | וְכֹל |
| leviticus-11-43 | Ari (m) | וְנִטְמֵתֶם |
| leviticus-11-6 | Ari (m) | (nothing), לָכֶם |
| leviticus-12-2 | Ari (m) | דְּוֹתָהּ |
| leviticus-13-11 | Ari (m) | (nothing), וְטִמְּאוֹ |
| leviticus-13-2 | Ari (m) | בְעוֹר, בְעוֹר |
| leviticus-13-23 | Ari (m) | הַשְּׁחִין |
| leviticus-13-27 | Ari (m) | פָּשֹׂה, הִוא |
| leviticus-13-3 | Ari (m) | וְשֵׂעָר |
| leviticus-13-41 | Ari (m) | יִמָּרֵט |
| leviticus-13-43 | Ari (m) | לְבָנָה, אֲדַמְדֶּמֶת |
| leviticus-13-44 | Ari (m) | נִגְעוֹ |
| leviticus-13-48 | Ari (m) | בִשְׁתִי, בְעֵרֶב, בְעוֹר, בְּכָל |
| leviticus-13-49 | Ari (m) | אֲדַמְדָּם, וְהָרְאָה |
| leviticus-13-5 | Ari (m) | שֵׁנִית |
| leviticus-13-51 | Ari (m) | מַמְאֶרֶת, הוּא |
| leviticus-13-52 | Ari (m) | מַמְאֶרֶת, הִוא |
| leviticus-13-58 | Ari (m) | וְסָר |
| leviticus-14-10 | Ari (m) | בַשֶּׁמֶן |
| leviticus-14-15 | Ari (m) | הַשְּׂמָאלִית |
| leviticus-14-21 | Ari (m) | וְעִשָּׂרוֹן |
| leviticus-14-26 | Ari (m) | הַשְּׂמָאלִית |
| leviticus-14-32 | Ari (m) | בְּטָהֳרָתוֹ |
| leviticus-14-38 | Ari (m) | וְהִסְגִּיר |
| leviticus-14-55 | Ari (m) | וּלְצָרַעַת |
| leviticus-14-57 | Ari (m) | הַצָּרָעַת |
| leviticus-14-7 | Ari (m) | הַצָּרַעַת |
| leviticus-14-8 | Ari (m) | לְאָהֳלוֹ |
| leviticus-14-9 | Ari (m) | בַיּוֹם, וְכִבֶּס |
| leviticus-15-11 | Ari (m) | הַזָּב |
| leviticus-15-12 | Ari (m) | וְכָל כְּלִי |
| leviticus-15-18 | Ari (m) | וְרָחֲצוּ |
| leviticus-15-27 | Ari (m) | בָּם, יִטְמָא |
| leviticus-15-3 | Ari (m) | הִוא |
| leviticus-15-31 | Ari (m) | בְּטַמְּאָם |
| leviticus-15-32 | Ari (m) | זֹאת, הַזָּב, לְטָמְאָה |
| leviticus-15-33 | Ari (m) | וְהַזָּב |
| leviticus-16-17 | Ari (m) | כָּל |
| leviticus-16-19 | Ari (m) | מִטֻּמְאֹת |
| leviticus-16-21 | Ari (m) | וְסָמַךְ, עֲוֹנֹת |
| leviticus-16-22 | Ari (m) | עֲוֹנֹתָם |
| leviticus-16-23 | Ari (m) | מוֹעֵד |
| leviticus-16-27 | Ari (m) | בָאֵשׁ |
| leviticus-16-30 | Ari (m) | בַיּוֹם |
| leviticus-16-31 | Ari (m) | לָכֶם, וְעִנִּיתֶם |
| leviticus-16-9 | Ari (m) | חַטָּאת |
| leviticus-17-11 | Ari (m) | נְתַתִּיו |
| leviticus-17-14 | Ari (m) | בְנַפְשׁוֹ הוּא וָאֹמַר, (nothing), יִכָּרֵת |
| leviticus-17-16 | Ari (m) | עֲוֹנוֹ |
| leviticus-17-3 | Ari (m) | כֶשֶׂב |
| leviticus-17-5 | Ari (m) | מוֹעֵד |
| leviticus-18-13 | Ari (m) | הִוא |
| leviticus-18-14 | Ari (m) | (nothing) |
| leviticus-18-16 | Ari (m) | עֶרְוַת, עֶרְוַת |
| leviticus-18-21 | Ari (m) | וּמִזַּרְעֲךָ |
| leviticus-18-25 | Ari (m) | עֲוֹנָהּ |
| leviticus-18-30 | Ari (m) | תִטַּמְּאוּ |
| leviticus-18-9 | Ari (m) | אֲחוֹתְךָ, אָבִיךָ אוֹ בַת אִמֶּךָ |
| leviticus-19-10 | Ari (m) | תְעוֹלֵל |
| leviticus-19-13 | Ari (m) | תָלִין |
| leviticus-19-17 | Ari (m) | חֵטְא |
| leviticus-19-23 | Ari (m) | וּנְטַעְתֶּם, וַעֲרַלְתֶּם |
| leviticus-19-25 | Ari (m) | לְהוֹסִיף |
| leviticus-19-31 | Ari (m) | הַיִּדְּעֹנִים |
| leviticus-19-7 | Ari (m) | הֵאָכֹל |
| leviticus-19-8 | Ari (m) | עֲוֹנוֹ, הַהִוא |
| leviticus-2-3 | Ari (m) | מֵאִשֵּׁי |
| leviticus-2-5 | Ari (m) | בְּלוּלָה, בַשֶּׁמֶן |
| leviticus-2-9 | Ari (m) | אַזְכָּרָתָהּ |
| leviticus-20-14 | Ari (m) | (nothing), אִמָּהּ זִמָּה הִוא בָּאֵשׁ יִשְׂרְפוּ אֹתוֹ וְאֶתְהֶן וְלֹא |
| leviticus-20-17 | Ari (m) | עֲוֹנוֹ |
| leviticus-20-19 | Ari (m) | עֲוֹנָם |
| leviticus-20-3 | Ari (m) | וְהִכְרַתִּי, מִזַּרְעוֹ |
| leviticus-20-6 | Ari (m) | וְהִכְרַתִּי |
| leviticus-21-11 | Ari (m) | יִטַּמָּא |
| leviticus-21-17 | Ari (m) | מִזַּרְעֲךָ |
| leviticus-21-3 | Ari (m) | וְלַאֲחֹתוֹ |
| leviticus-22-11 | Ari (m) | בְלַחְמוֹ |
| leviticus-22-16 | Ari (m) | עֲוֹן |
| leviticus-22-22 | Ari (m) | וְאִשֶּׁה |
| leviticus-22-24 | Ari (m) | וּמָעוּךְ |
| leviticus-22-26 | Ari (m) | וַיְדַבֵּר |
| leviticus-22-3 | Ari (m) | וְטֻמְאָתוֹ, הַהִוא |
| leviticus-22-31 | Ari (m) | מִצְוֹתַי |
| leviticus-22-4 | Ari (m) | אַהֲרֹן |
| leviticus-22-6 | Ari (m) | וְטָמְאָה |
| leviticus-23-1 | Ari (m) | וַיְדַבֵּר |
| leviticus-23-14 | Ari (m) | וְקָלִי |
| leviticus-23-15 | Ari (m) | הֲבִיאֲכֶם |
| leviticus-23-18 | Ari (m) | וְנִסְכֵּיהֶם |
| leviticus-23-21 | Ari (m) | יִהְיֶה |
| leviticus-23-3 | Ari (m) | מִקְרָא |
| leviticus-23-43 | Ari (m) | בְּהוֹצִיאִי |
| leviticus-23-5 | Ari (m) | בְּאַרְבָּעָה |
| leviticus-24-12 | Ari (m) | בַּמִּשְׁמָר |
| leviticus-24-2 | Ari (m) | צַו |
| leviticus-24-9 | Ari (m) | מֵאִשֵּׁי |
| leviticus-25-10 | Ari (m) | תָּשֻׁבוּ |
| leviticus-25-12 | Ari (m) | קֹדֶשׁ תִּהְיֶה לָכֶם, תְּבוּאָתָהּ |
| leviticus-25-26 | Ari (m) | גְאֻלָּתוֹ |
| leviticus-25-35 | Ari (m) | וּמָטָה |
| leviticus-25-46 | Ari (m) | וּבְאַחֵיכֶם |
| leviticus-25-5 | Ari (m) | סְפִיחַ, עִנְּבֵי |
| leviticus-26-13 | Ari (m) | עֻלְּכֶם, וָאוֹלֵךְ |
| leviticus-26-15 | Ari (m) | מִצְוֹתַי |
| leviticus-26-16 | Ari (m) | בֶּהָלָה |
| leviticus-26-23 | Ari (m) | תִוָּסְרוּ |
| leviticus-26-28 | Ari (m) | וְיִסַּרְתִּי |
| leviticus-26-41 | Ari (m) | עֲוֹנָם |
| leviticus-26-43 | Ari (m) | בָּהְּשַׁמָּה, מָאָסוּ, גָּעֲלָה |
| leviticus-26-6 | Ari (m) | וְהִשְׁבַּתִּי |
| leviticus-27-28 | Ari (m) | יַחֲרִם |
| leviticus-27-7 | Ari (m) | מִבֶּן |
| leviticus-3-13 | Ari (m) | וְסָמַךְ |
| leviticus-3-15 | Ari (m) | הַכְּלָיֹת, הַחֵלֶב, הַכְּלָיֹת |
| leviticus-3-17 | Ari (m) | וְכָל |
| leviticus-4-11 | Ari (m) | בְּשָׂרוֹ |
| leviticus-4-15 | Ari (m) | וְסָמְכוּ |
| leviticus-4-27 | Ari (m) | בִשְׁגָגָה, מִמִּצְוֹת, וְאָשֵׁם |
| leviticus-4-29 | Ari (m) | וְסָמַךְ |
| leviticus-4-33 | Ari (m) | וְסָמַךְ |
| leviticus-4-4 | Ari (m) | וְסָמַךְ |
| leviticus-4-5 | Ari (m) | הַפָּר |
| leviticus-5-1 | Ari (m) | עֲוֹנוֹ |
| leviticus-5-15 | Ari (m) | תִמְעֹל |
| leviticus-5-17 | Ari (m) | מִצְוֹת, עֲוֹנוֹ |
| leviticus-5-23 | Ari (m) | וְאָשֵׁם |
| leviticus-5-24 | Ari (m) | אוֹ |
| leviticus-5-3 | Ari (m) | וְאָשֵׁם |
| leviticus-5-7 | Ari (m) | שֶׂה וְהֵבִיא |
| leviticus-6-10 | Ari (m) | חָמֵץ, אֹתָהּ, מֵאִשָּׁי, הִוא כַּחַטָּאת וְכָאָשָׁם |
| leviticus-6-11 | Ari (m) | מֵאִשֵּׁי |
| leviticus-6-22 | Ari (m) | זָכָר |
| leviticus-6-8 | Ari (m) | בְּקֻמְצוֹ |
| leviticus-6-9 | Ari (m) | תֵּאָכֵל, בַּחֲצַר |
| leviticus-7-10 | Ari (m) | בְלוּלָה, בַשֶּׁמֶן |
| leviticus-7-16 | Ari (m) | זִבְחוֹ |
| leviticus-7-18 | Ari (m) | הֵאָכֹל, עֲוֹנָהּ |
| leviticus-7-24 | Ari (m) | וְאָכֹל |
| leviticus-7-38 | Ari (m) | צַוֹּתוֹ |
| leviticus-7-5 | Ari (m) | אִשֶּׁה, אָשָׁם |
| leviticus-8-18 | Ari (m) | וַיִּסְמְכוּ |
| leviticus-8-20 | Ari (m) | מֹשֶׁה אֶת הָרֹאשׁ |
| leviticus-8-21 | Ari (m) | הַכְּרָעַיִם |
| leviticus-8-23 | Ari (m) | רַגְלוֹ |
| leviticus-8-26 | Ari (m) | הַיָּמִין |
| leviticus-8-31 | Ari (m) | יֹאכְלֻהוּ |
| leviticus-8-4 | Ari (m) | הָעֵדָה |
| leviticus-9-15 | Ari (m) | וַיְחַטְּאֵהוּ |
| leviticus-9-16 | Ari (m) | וַיַּעֲשֶׂהָ |
| leviticus-9-23 | Ari (m) | וַיֵּרָא |
| leviticus-9-24 | Ari (m) | וַיָּרֹנּוּ |
| leviticus-9-4 | Ari (m) | בַשָּׁמֶן |
| numbers-1-10 | Ari (m) | פְּדָהצוּר |
| numbers-1-14 | Ari (m) | דְּעוּאֵל |
| numbers-1-21 | Ari (m) | וַחֲמֵשׁ |
| numbers-1-27 | Ari (m) | פְּקֻדֵיהֶם |
| numbers-1-29 | Ari (m) | יִשָּׂשכָר, אַרְבָּעָה |
| numbers-1-34 | Ari (m) | (nothing) |
| numbers-1-46 | Ari (m) | (nothing) |
| numbers-1-5 | Ari (m) | שְׁדֵיאוּר |
| numbers-10-18 | Ari (m) | וְנָסַע, שְׁדֵיאוּר |
| numbers-10-19 | Ari (m) | שִׁמְעוֹן |
| numbers-10-20 | Ari (m) | דְּעוּאֵל |
| numbers-10-21 | Ari (m) | וְנָסְעוּ |
| numbers-10-22 | Ari (m) | וְנָסַע |
| numbers-10-25 | Ari (m) | וְנָסַע |
| numbers-10-26 | Ari (m) | פַּגְעִיאֵל |
| numbers-10-5 | Ari (m) | תְּרוּעָה, וְנָסְעוּ |
| numbers-11-11 | Ari (m) | מָצָתִי |
| numbers-11-26 | Ari (m) | וַיִּתְנַבְּאוּ |
| numbers-11-28 | Ari (m) | כְּלָאֵם |
| numbers-11-31 | Ari (m) | נָסַע, וּכְאַמָּתַיִם |
| numbers-11-32 | Ari (m) | הַשְּׂלָו, אָסַף |
| numbers-11-35 | Ari (m) | נָסְעוּ |
| numbers-11-4 | Ari (m) | הִתְאַוּוּ, תַּאֲוָה |
| numbers-12-10 | Ari (m) | סָר, כַּשָּׁלֶג |
| numbers-12-8 | Ari (m) | בְחִידֹת, בְמֹשֶׁה |
| numbers-12-9 | Ari (m) | וַיִּחַרְאַף |
| numbers-13-23 | Ari (m) | אֶחָד |
| numbers-13-3 | Ari (m) | פָּארָן |
| numbers-13-30 | Ari (m) | כָּלֵב אֶת, עָלֹה |
| numbers-13-32 | Ari (m) | עָבַרְנוּ בָהּ לָתוּר, וְכָל הָעָם אֲשֶׁר |
| numbers-13-33 | Ari (m) | בְעֵינֵינוּ, בְּעֵינֵיהֶם |
| numbers-14-18 | Ari (m) | עָוֹן, עֲוֹן, רִבֵּעִים |
| numbers-14-19 | Ari (m) | לַעֲוֹן |
| numbers-14-21 | Ari (m) | וְיִמָּלֵא |
| numbers-14-22 | Ari (m) | וַיְנַסּוּ |
| numbers-14-23 | Ari (m) | וְכָל מְנַאֲצַי לֹא |
| numbers-14-25 | Ari (m) | וּסְעוּ |
| numbers-14-4 | Ari (m) | רֹאשׁ, מִצְרָיְמָה |
| numbers-14-42 | Ari (m) | אַל תַּעֲלוּ כִּי אֵין אֲדֹנָי בְּקִרְבְּכֶם |
| numbers-14-44 | Ari (m) | וַיַּעְפִּלוּ, וַאֲרוֹן |
| numbers-14-5 | Ari (m) | קְהַל |
| numbers-15-11 | Ari (m) | לַשֶּׂה, בַכְּבָשִׂים |
| numbers-15-13 | Ari (m) | נִיחֹחַ |
| numbers-15-20 | Ari (m) | עֲרִסֹתֵכֶם |
| numbers-15-21 | Ari (m) | עֲרִסֹתֵיכֶם |
| numbers-15-24 | Ari (m) | וְעָשׂוּ, וְנִסְכּוֹ, כַּמִּשְׁפָּט, לְחַטָּת |
| numbers-15-25 | Ari (m) | וְכִפֶּר, עֲדַת, וְחַטָּאתָם |
| numbers-15-26 | Ari (m) | עֲדַת |
| numbers-15-27 | Ari (m) | בִשְׁגָגָה, לְחַטָּאת |
| numbers-15-28 | Ari (m) | בְּחֶטְאָה, בִשְׁגָגָה |
| numbers-15-29 | Ari (m) | בִּשְׁגָגָה |
| numbers-15-3 | Ari (m) | בִנְדָבָה |
| numbers-15-35 | Ari (m) | בָאֲבָנִים |
| numbers-15-4 | Ari (m) | עִשָּׂרוֹן |
| numbers-15-40 | Ari (m) | מִצְוֹתָי |
| numbers-15-6 | Ari (m) | בַשֶּׁמֶן |
| numbers-15-9 | Ari (m) | הַהִין |
| numbers-16-26 | Ari (m) | אָהֳלֵי |
| numbers-16-27 | Ari (m) | אָהֳלֵיהֶם |
| numbers-16-28 | Ari (m) | תֵּדְעוּן |
| numbers-16-34 | Ari (m) | פֶּן |
| numbers-16-6 | Ari (m) | עֲשׂוּ |
| numbers-16-9 | Ari (m) | מֵעֲדַת |
| numbers-17-17 | Ari (m) | מֵאִתָּם |
| numbers-17-2 | Ari (m) | הַמַּחְתֹּת |
| numbers-17-28 | Ari (m) | לִגְוֹעַ |
| numbers-17-4 | Ari (m) | מַחְתּוֹת, וַיְרַקְּעוּם |
| numbers-17-5 | Ari (m) | קְטֹרֶת |
| numbers-17-6 | Ari (m) | וַיִּלֹּנוּ, הֲמִתֶּם |
| numbers-18-19 | Ari (m) | תְּרוּמֹת, מֶלַח |
| numbers-18-2 | Ari (m) | (nothing), שֵׁבֶט אָבִיךָ הַקְרֵב אִתָּךְ וְיִלָּווּ עָלֶיךָ וִישָׁרְתוּךָ |
| numbers-18-27 | Ari (m) | הַיָּקֶב |
| numbers-19-11 | Ari (m) | בְּמֵת |
| numbers-19-2 | Ari (m) | עֹל |
| numbers-19-20 | Ari (m) | יִטְמָא, יִתְחַטָּא, מִתּוֹךְ |
| numbers-19-9 | Ari (m) | (nothing) |
| numbers-2-10 | Ari (m) | שְׁדֵיאוּר |
| numbers-2-12 | Ari (m) | וְנָשִׂיא, שַׁדָּי |
| numbers-2-16 | Ari (m) | יִסָּעוּ |
| numbers-2-20 | Ari (m) | פְּדָהצוּר |
| numbers-2-27 | Ari (m) | פַּגְעִיאֵל |
| numbers-2-29 | Ari (m) | אֲחִירַע |
| numbers-2-34 | Ari (m) | נָסָעוּ |
| numbers-2-4 | Ari (m) | וּצְבָאוֹ |
| numbers-2-5 | Ari (m) | צוּעָר |
| numbers-2-6 | Ari (m) | וּצְבָאוֹ |
| numbers-2-8 | Ari (m) | וְאַרְבַּע |
| numbers-20-13 | Ari (m) | מֵי מְרִיבָה |
| numbers-20-20 | Ari (m) | וַיֵּצֵא |
| numbers-20-21 | Ari (m) | וַיְמָאֵן |
| numbers-21-15 | Ari (m) | עָר |
| numbers-21-16 | Ari (m) | הִוא, אֱסֹף, וְאֶתְּנָה |
| numbers-21-17 | Ari (m) | בְאֵר עֱנוּ |
| numbers-21-22 | Ari (m) | אֶעְבְּרָה, בְאֵר |
| numbers-21-23 | Ari (m) | יָהְצָה |
| numbers-21-30 | Ari (m) | דִּיבוֹן |
| numbers-21-4 | Ari (m) | מֵהֹר |
| numbers-21-7 | Ari (m) | הִתְפַּלֵּל |
| numbers-22-10 | Ari (m) | מוֹאָב |
| numbers-22-14 | Ari (m) | מוֹאָב |
| numbers-22-19 | Ari (m) | בָזֶה, וְאֵדְעָה |
| numbers-22-20 | Ari (m) | וַיֹּאמֶר לוֹ אִם |
| numbers-22-27 | Ari (m) | וַיִּחַר |
| numbers-22-28 | Ari (m) | לְבִלְעָם |
| numbers-22-30 | Ari (m) | הַהַסְכֵּן |
| numbers-22-33 | Ari (m) | וַתִּרְאַנִי, וַתֵּט |
| numbers-22-34 | Ari (m) | בִּלְעָם |
| numbers-22-40 | Ari (m) | לְבִלְעָם |
| numbers-22-41 | Ari (m) | (nothing) |
| numbers-22-5 | Ari (m) | פְּתוֹרָה |
| numbers-23-1 | Ari (m) | וְהָכֵן |
| numbers-23-12 | Ari (m) | אֶשְׁמֹר |
| numbers-23-13 | Ari (m) | תִּרְאֶנּוּ |
| numbers-23-17 | Ari (m) | וְשָׂרֵי |
| numbers-23-19 | Ari (m) | וְיִתְנֶחָם |
| numbers-23-26 | Ari (m) | אֶעֱשֶׂה |
| numbers-23-7 | Ari (m) | בָלָק, קֶדֶם, אָרָה, זֹעֲמָה |
| numbers-24-1 | Ari (m) | בִּלְעָם |
| numbers-24-14 | Ari (m) | אִיעָצְךָ |
| numbers-24-15 | Ari (m) | בְעֹר |
| numbers-24-21 | Ari (m) | הַקֵּינִי |
| numbers-24-3 | Ari (m) | בְעֹר |
| numbers-24-4 | Ari (m) | שַׁדַּי |
| numbers-24-7 | Ari (m) | מֵאֲגַג |
| numbers-25-11 | Ari (m) | בְּקַנְאוֹ, בְּקִנְאָתִי |
| numbers-25-3 | Ari (m) | וַיִּחַר |
| numbers-26-14 | Ari (m) | וְעֶשְׂרִים |
| numbers-26-2 | Ari (m) | עֲדַת |
| numbers-26-26 | Ari (m) | לְסֶרֶד, הַסַּרְדִּי |
| numbers-26-31 | Ari (m) | וְאַשְׂרִיאֵל, הָאַשְׂרִאֵלִי |
| numbers-26-34 | Ari (m) | וּפְקֻדֵיהֶם |
| numbers-26-37 | Ari (m) | וַחֲמֵשׁ |
| numbers-26-52 | Ari (m) | וַיְדַבֵּר |
| numbers-26-54 | Ari (m) | וְלַמְעַט |
| numbers-26-56 | Ari (m) | לִמְעָט |
| numbers-26-60 | Ari (m) | אֲבִיהוּא |
| numbers-26-61 | Ari (m) | וַאֲבִיהוּא |
| numbers-26-9 | Ari (m) | הִצּוּ |
| numbers-27-10 | Ari (m) | וּנְתַתֶּם |
| numbers-27-18 | Ari (m) | וְסָמַכְתָּ |
| numbers-27-3 | Ari (m) | בַּעֲדַת |
| numbers-28-10 | Ari (m) | בְּשַׁבַּתּוֹ, וְנִסְכָּהּ |
| numbers-28-2 | Ari (m) | צַו, לְאִשַּׁי |
| numbers-28-21 | Ari (m) | לַכֶּבֶשׂ |
| numbers-28-24 | Ari (m) | וְנִסְכּוֹ |
| numbers-28-28 | Ari (m) | בְּלוּלָה, בַשָּׁמֶן |
| numbers-28-3 | Ari (m) | הָאִשֶּׁה |
| numbers-28-31 | Ari (m) | וְנִסְכֵּיהֶם |
| numbers-28-4 | Ari (m) | הָעַרְבָּיִם |
| numbers-29-10 | Ari (m) | עִשָּׂרוֹן, עִשָּׂרוֹן |
| numbers-29-11 | Ari (m) | וְנִסְכֵּיהֶם |
| numbers-29-15 | Ari (m) | וְעִשָּׂרוֹן, עִשָּׂרוֹן |
| numbers-29-16 | Ari (m) | וְנִסְכָּהּ |
| numbers-29-19 | Ari (m) | וְנִסְכֵּיהֶם |
| numbers-29-2 | Ari (m) | אַיִל |
| numbers-29-20 | Ari (m) | עַשְׁתֵּי |
| numbers-29-26 | Ari (m) | אֵילִם |
| numbers-29-27 | Ari (m) | וְנִסְכֵּיהֶם |
| numbers-29-31 | Ari (m) | מִנְחָתָהּ וּנְסָכֶיהָ |
| numbers-29-33 | Ari (m) | וְנִסְכֵּהֶם |
| numbers-29-37 | Ari (m) | וְנִסְכֵּיהֶם |
| numbers-29-38 | Ari (m) | וּמִנְחָתָהּ וְנִסְכָּהּ |
| numbers-29-39 | Ari (m) | וּלְנִסְכֵּיכֶם |
| numbers-29-4 | Ari (m) | וְעִשָּׂרוֹן |
| numbers-29-5 | Ari (m) | אֶחָד חַטָּאת לְכַפֵּר עֲלֵיכֶם |
| numbers-29-6 | Ari (m) | וְנִסְכֵּיהֶם |
| numbers-3-2 | Ari (m) | וַאֲבִיהוּא |
| numbers-3-21 | Ari (m) | לְגֵרְשׁוֹן, הַגֵּרְשֻׁנִּי |
| numbers-3-29 | Ari (m) | יַחֲנוּ |
| numbers-3-33 | Ari (m) | לִמְרָרִי |
| numbers-3-4 | Ari (m) | וַאֲבִיהוּא |
| numbers-3-46 | Ari (m) | הָעֹדְפִים |
| numbers-3-48 | Ari (m) | הָעֹדְפִים |
| numbers-3-49 | Ari (m) | הָעֹדְפִים |
| numbers-30-15 | Ari (m) | אֱסָרֶיהָ |
| numbers-30-16 | Ari (m) | עֲוֹנָהּ |
| numbers-30-3 | Ari (m) | הִשָּׁבַע, לֶאְסֹר, אִסָּר |
| numbers-30-5 | Ari (m) | וֶאֱסָרָהּ |
| numbers-30-6 | Ari (m) | אָבִיהָ, וֶאֱסָרֶיהָ, אָבִיהָ |
| numbers-30-7 | Ari (m) | אוֹ |
| numbers-30-8 | Ari (m) | וֶאֱסָרֶהָ |
| numbers-31-23 | Ari (m) | יָבֹא, וְטָהֵר, יִתְחַטָּא, יָבֹא |
| numbers-31-24 | Ari (m) | בִּגְדֵיכֶם |
| numbers-31-29 | Ari (m) | לְאֶלְעָזָר |
| numbers-31-32 | Ari (m) | הַמַּלְקוֹחַ, הַבָּז, עַם הַצָּבָא צֹאן |
| numbers-31-33 | Ari (m) | וּבָקָר |
| numbers-31-35 | Ari (m) | אָלֶף |
| numbers-31-38 | Ari (m) | אָלֶף |
| numbers-31-46 | Ari (m) | אָלֶף |
| numbers-31-47 | Ari (m) | אֶחָד |
| numbers-31-50 | Ari (m) | אֶצְעָדָה |
| numbers-32-10 | Ari (m) | וַיִּחַר |
| numbers-32-17 | Ari (m) | טַפֵּנוּ |
| numbers-32-19 | Ari (m) | בָאָה |
| numbers-32-24 | Ari (m) | עָרִים |
| numbers-32-26 | Ari (m) | מִקְנֵנוּ |
| numbers-32-28 | Ari (m) | וַיְצַו |
| numbers-32-3 | Ari (m) | וְדִיבֹן |
| numbers-32-32 | Ari (m) | נַחְנוּ |
| numbers-32-33 | Ari (m) | עָרֵי |
| numbers-32-38 | Ari (m) | מְעוֹן, שִׂבְמָה |
| numbers-32-39 | Ari (m) | וַיִּלְכְּדֻהָ |
| numbers-32-41 | Ari (m) | חַוֹּתֵיהֶם |
| numbers-32-6 | Ari (m) | רְאוּבֵן הַאַחֵיכֶם, תֵּשְׁבוּ פֹה |
| numbers-32-8 | Ari (m) | בְּשָׁלְחִי |
| numbers-33-13 | Ari (m) | וַיִּסְעוּ מִדָּפְקָה |
| numbers-33-21 | Ari (m) | וַיַּחֲנוּ |
| numbers-33-22 | Ari (m) | וַיִּסְעוּ |
| numbers-33-25 | Ari (m) | בְּמַקְהֵלֹת |
| numbers-33-31 | Ari (m) | וַיִּסְעוּ, מִמֹּסֵרוֹת, בִּבְנֵי, יַעֲקָן |
| numbers-33-33 | Ari (m) | וַיִּסְעוּ |
| numbers-33-37 | Ari (m) | בְּהֹר |
| numbers-33-39 | Ari (m) | בְּהֹר |
| numbers-33-45 | Ari (m) | וַיִּסְעוּ, מֵעִיִּים, בְּדִיבֹן |
| numbers-33-46 | Ari (m) | וַיִּסְעוּ, גָּד, וַיַּחֲנוּ |
| numbers-33-47 | Ari (m) | דִּבְלָתָיְמָה |
| numbers-33-5 | Ari (m) | וַיִּסְעוּ |
| numbers-33-50 | Ari (m) | מוֹאָב |
| numbers-33-52 | Ari (m) | מַשְׂכִּיֹּתָם |
| numbers-33-53 | Ari (m) | וְהוֹרַשְׁתֶּם, לָכֶם |
| numbers-33-54 | Ari (m) | וְלַמְעַט |
| numbers-33-8 | Ari (m) | בְּמָרָה |
| numbers-34-16 | Ari (m) | וַיְדַבֵּר |
| numbers-34-2 | Ari (m) | צַו |
| numbers-34-20 | Ari (m) | עַמִּיהוּד |
| numbers-34-21 | Ari (m) | כִּסְלוֹן |
| numbers-34-23 | Ari (m) | נָשִׂיא, חַנִּיאֵל |
| numbers-34-26 | Ari (m) | יִשָׂשכָר |
| numbers-34-28 | Ari (m) | פְּדַהְאֵל, עַמִּיהוּד |
| numbers-34-3 | Ari (m) | הַמֶּלַח |
| numbers-35-1 | Ari (m) | מוֹאָב |
| numbers-35-16 | Ari (m) | הִכָּהוּ |
| numbers-35-17 | Ari (m) | הִכָּהוּ |
| numbers-35-18 | Ari (m) | אוֹ, הִכָּהוּ |
| numbers-35-2 | Ari (m) | צַו, לֶעָרִים |
| numbers-35-20 | Ari (m) | בִּצְדִיָּה |
| numbers-35-21 | Ari (m) | אוֹ, הִכָּהוּ |
| numbers-35-27 | Ari (m) | (nothing) |
| numbers-35-8 | Ari (m) | מֵעָרָיו |
| numbers-36-10 | Ari (m) | עָשׂוּ |
| numbers-36-2 | Ari (m) | צִוָּה, צֻוָּה, בַאדֹנָי |
| numbers-36-5 | Ari (m) | וַיְצַו |
| numbers-4-10 | Ari (m) | הַמּוֹט |
| numbers-4-11 | Ari (m) | בַּדָּיו |
| numbers-4-12 | Ari (m) | בָם |
| numbers-4-19 | Ari (m) | עֲשׂוּ |
| numbers-4-24 | Ari (m) | הַגֵּרְשֻׁנִּי |
| numbers-4-41 | Ari (m) | מוֹעֵד |
| numbers-5-13 | Ari (m) | וְהִוא |
| numbers-5-15 | Ari (m) | קְנָאֹת הוּא, עָוֹן |
| numbers-5-17 | Ari (m) | חָרֶשׂ |
| numbers-5-19 | Ari (m) | הִנָּקִי |
| numbers-5-2 | Ari (m) | צַו |
| numbers-5-25 | Ari (m) | הַקְּנָאֹת |
| numbers-5-31 | Ari (m) | מֵעָוֹן, עֲוֹנָהּ |
| numbers-5-5 | Ari (m) | וַיְדַבֵּר, לֵּאמֹר |
| numbers-6-12 | Ari (m) | וְהִזִּיר |
| numbers-6-15 | Ari (m) | וּמִנְחָתָם, וְנִסְכֵּיהֶם |
| numbers-6-2 | Ari (m) | כִּי יַפְלִא לִנְדֹּר |
| numbers-6-3 | Ari (m) | יִשְׁתֶּה, יִשְׁתֶּה, וִיבֵשִׁים |
| numbers-7-18 | Ari (m) | צוּעָר נְשִׂיא יִשָּׂשכָר |
| numbers-7-22 | Ari (m) | לְחַטָּאת |
| numbers-7-23 | Ari (m) | אֵילִם |
| numbers-7-25 | Ari (m) | בַשֶּׁמֶן |
| numbers-7-29 | Ari (m) | אֵילִם |
| numbers-7-31 | Ari (m) | בַשֶּׁמֶן |
| numbers-7-46 | Ari (m) | לְחַטָּאת |
| numbers-7-47 | Ari (m) | אֵילִם, דְּעוּאֵל |
| numbers-7-5 | Ari (m) | מֵאִתָּם |
| numbers-7-50 | Ari (m) | מְלֵאָה, קְטֹרֶת |
| numbers-7-53 | Ari (m) | אֵילִם |
| numbers-7-55 | Ari (m) | בַשֶּׁמֶן |
| numbers-7-58 | Ari (m) | לְחַטָּאת |
| numbers-7-61 | Ari (m) | בַשֶּׁמֶן |
| numbers-7-67 | Ari (m) | בְּשֶׁקֶל, בַשֶּׁמֶן |
| numbers-7-71 | Ari (m) | אֵילִם |
| numbers-7-72 | Ari (m) | עַשְׁתֵּי, פַּגְעִיאֵל |
| numbers-7-73 | Ari (m) | בַשֶּׁמֶן |
| numbers-7-77 | Ari (m) | פַּגְעִיאֵל |
| numbers-7-78 | Ari (m) | שְׁנֵים |
| numbers-7-83 | Ari (m) | אֵילִם |
| numbers-7-9 | Ari (m) | וְלִבְנֵי |
| numbers-8-10 | Ari (m) | וְסָמְכוּ |
| numbers-8-14 | Ari (m) | וְהִבְדַּלְתָּ |
| numbers-8-19 | Ari (m) | וָאֶתְּנָה |
| numbers-8-6 | Ari (m) | הַלְוִיִּם |
| numbers-8-7 | Ari (m) | תַעַר |
| numbers-8-8 | Ari (m) | בְּלוּלָה, בַשָּׁמֶן |
| numbers-9-10 | Ari (m) | אוֹ, בְדֶרֶךְ, אוֹ |
| numbers-9-13 | Ari (m) | וְנִכְרְתָה |
| numbers-9-17 | Ari (m) | יִסְעוּ |
| numbers-9-19 | Ari (m) | יִסָּעוּ |
| numbers-9-20 | Ari (m) | יִסָּעוּ |
| numbers-9-21 | Ari (m) | וְנָסָעוּ, וְנָסָעוּ |
| numbers-9-22 | Ari (m) | יִסָּעוּ, יִסָּעוּ |
| numbers-9-8 | Ari (m) | וְאֶשְׁמְעָה |
