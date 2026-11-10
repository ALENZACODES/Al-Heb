# Retention: Hebrew Awaiting Native Review

Status of every string below: needs-native-review. None is final. Each is rendered with `data-review="hebrew"`.

| Where | Hebrew | English |
| --- | --- | --- |
| League tier 1 | גַּרְעִין | Seed |
| League tier 2 | נֶבֶט | Sprout |
| League tier 3 | שֹׁרֶשׁ | Root |
| League tier 4 | עָנָף | Branch |
| League tier 5 | עָלֶה | Leaf |
| League tier 6 | פֶּרַח | Blossom |
| League tier 7 | פְּרִי | Fruit |
| League tier 8 | פַּרְדֵּס | Orchard |
| League tier 9 | כֶּתֶר | Crown |
| League tier 10 | רִמּוֹן זָהָב | Golden Pomegranate |
| Rimon bubble: welcome back | בְּרוּכִים הַשָּׁבִים! | WELCOME BACK! |
| Rimon bubble: holiday | חַג שָׂמֵחַ! | CHAG SAMEACH! |
| Rimon bubble: after Shabbat | שָׁבוּעַ טוֹב! | HAVE A GOOD WEEK! |
| Rimon bubble: heart won back | עוֹד לֵב! | ONE MORE HEART! |
| Rimon bubble: league move up | עוֹלִים שָׁלָב! | MOVING UP! |

The bubble lines are in `LINES` in `src/retention/rimon.js`. Two more reuse Hebrew already in the app (the Shabbat greeting and the "well done" line).

Note for the rabbi review: the words for tiers 8 and 9 carry religious meaning. Safe fallbacks if either is declined:
tier 8 "Grove", tier 9 "Treetop" (change `TIERS` in `src/retention/leagues.js`).
