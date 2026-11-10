# Rimon 200-pose catalogue

Drafted 2026-11-10 (America/Toronto) for overnight ALEF lane 2, ahead of the 200-still catalogue (docs/images/RIMON-STILLS.md).
That catalogue (drawn into `data/images/rimon/v2/`) is the one the app follows; this set's pictures are matched to it in tools/images/rimon/art-map.mjs.

## Character lock (do not drift)

Rimon is a frozen character. Official references used:

- `assets/img/gen/MASCOT_rimon.800.webp` and `.1600.webp` — hero model sheet (primary)
- `assets/img/rimon/rimon-sprite.png` and the 12-frame action sheets (`blink`, `wave`, `wink`, `bounce`, `laugh`, `highfive`, `nervous`, `sad`, `thinking`, `point`, `stretch`, `yawn`)
- `assets/games/arcade/cast/rimon-face.png` and `rimon-fly.png` (face close-up; flying is a special arcade variant with small olive wings — do not add wings except if a pose explicitly needs a fly-in)

Must always include: round pomegranate-red body `#B0373B`; gold three-point calyx `#D9A441`; two olive-green leaf ears `#6B7F3A`; black oval dot eyes; pink circular blush; simple smile; deep-sea-blue sash with a front bow `#1F3A5F`; tiny red arms and stubby feet. Flat vector, no gradients, no photoreal, no text of any kind, no divine names, no letters on dreidels, books, certificates, menorahs, or badges.

Files: `data/images/rimon/rimon-###.webp`, about 512×512, transparent or paper-cream `#F6F1E7`. Never overwrite existing files.

## Style prefix for every image prompt

```
Flat vector illustration of Rimon, the official ALEF Hebrew-app mascot, exactly matching the attached character references: a small perfectly round pomegranate-red (#B0373B) body; a gold three-pointed crown-shaped calyx (#D9A441) on top of the head; two olive-green leaf ears (#6B7F3A) flanking the calyx, one left and one right, slightly pointed; two large friendly black oval dot eyes; soft pink circular blush on both cheeks; a simple single-curve closed smile unless the pose says otherwise; a deep-sea-blue sash (#1F3A5F) tied in a neat front bow around the middle of the body; tiny red arms with small rounded hands (visible simple fingers only when a hand is open); tiny red stubby feet. Same proportions as the reference: large round body, short limbs, crown sitting neatly on top. House style: flat vector, clean solid colors, no gradients, no gloss, no photorealism, no 3D, no anime, no watercolor, no drop shadow on the ground, no sparkles, no motion lines, no text of any kind (no Hebrew, no Latin, no numerals, no logos, no letters on props). Single character centered with about 10 percent margin. Plain paper-cream background #F6F1E7. Square 1:1 composition. Calm, warm, respectful children's-app mood.
```

## Poses

| id | file | category | screen | trigger | pose |
| --- | --- | --- | --- | --- | --- |
| 001 | `rimon-001.webp` | onboarding | Onboarding / first launch | App opens for a new learner | Standing square to the viewer, friendly closed smile, right arm raised in a gentle wave, left arm relaxed at his side, eyes open and bright. |
| 002 | `rimon-002.webp` | onboarding | Onboarding welcome screen | Welcome title appears | Both arms raised high in an open hello, palms open, wide warm closed smile, feet planted, crown upright. |
| 003 | `rimon-003.webp` | onboarding | Onboarding welcome screen | After the hello animation | A small respectful bow: head and crown tipped slightly forward, both arms at his sides, gentle smile, eyes open. |
| 004 | `rimon-004.webp` | onboarding | Onboarding path chooser | Prompting the learner to continue | Body facing us, left arm relaxed, right arm pointing to the viewer's right (toward a continue control), encouraging smile, eyes looking in the direction of the point. |
| 005 | `rimon-005.webp` | onboarding | Onboarding first Hebrew letter | The first letter card is revealed | Small bounce of delight, both fists gently clenched near chest height, big closed smile, eyes curved into happy arcs, feet together. |
| 006 | `rimon-006.webp` | onboarding | Track / path picker | Learner is asked to pick a starting path | Both arms open to the sides as if presenting two options, calm smile, eyes open, standing firmly, inviting not pushy. |
| 007 | `rimon-007.webp` | onboarding | Onboarding name / greeting step | Learner confirms their display name | Tiny hands clapping in front of the sash, delighted closed smile, eyes happy arcs, body a little taller as if mid-clap. |
| 008 | `rimon-008.webp` | onboarding | Placement / level pick | A level option is highlighted | Head nodding slightly forward then level, pleased closed smile, one tiny hand on the sash as if agreeing, eyes open. |
| 009 | `rimon-009.webp` | onboarding | First-run tooltip | Pointing at a primary button below | Leaning forward a little, right arm pointing downward, left arm out for balance, eyes looking down toward the point, helpful smile. |
| 010 | `rimon-010.webp` | onboarding | Sound check / listen intro | Audio example starts | One tiny hand cupped beside his head as if listening, head tipped slightly, soft smile, eyes open and attentive, the other arm relaxed. |
| 011 | `rimon-011.webp` | onboarding | Onboarding 'your turn' beat | The app invites the learner to try | Leaning slightly toward the viewer, both arms a little forward in an encouraging 'your turn' gesture, bright open eyes, warm smile. |
| 012 | `rimon-012.webp` | onboarding | Onboarding first success | First practice item is correct | Classic proud closed smile, cheeks lifted, both arms slightly out, eyes open and shining, feet planted. No props. |
| 013 | `rimon-013.webp` | onboarding | Onboarding mid-flow | Learner hesitates on a step | One arm raised in a clear thumbs-up, the other relaxed, confident closed smile, eyes open, standing tall. |
| 014 | `rimon-014.webp` | onboarding | Optional skip / later | Learner skips an optional intro step | A gentle friendly shrug, both arms slightly out with palms up, soft smile, eyes open, no judgment. |
| 015 | `rimon-015.webp` | onboarding | Audio permission / sample | Playing a sample sound | Standing still, eyes softly closed as if enjoying a sound, small smile, arms relaxed, head level. |
| 016 | `rimon-016.webp` | onboarding | Microphone permission | Mic permission is granted or the speak intro starts | Holding a very simple unlabelled oval microphone in both tiny hands near the sash, encouraging smile, eyes open. Microphone is a plain charcoal-and-gold shape with no logo or text. |
| 017 | `rimon-017.webp` | onboarding | End of onboarding, start first lesson | Ready to begin CTA | Athletic ready stance: feet a little apart, both arms slightly bent at his sides, determined but friendly closed smile, eyes open, crown upright. |
| 018 | `rimon-018.webp` | onboarding | First lesson door | Learner taps start | Stepping to the viewer's right, one foot lifted a little, one arm swinging forward, happy closed smile, looking ahead. |
| 019 | `rimon-019.webp` | onboarding | Home map first visit | The lesson path is first shown | Pointing forward and slightly down toward a path, other hand on his sash, proud little smile, eyes following the point. |
| 020 | `rimon-020.webp` | onboarding | Returning after onboarding, day-1 return | Second session start | Smaller, warmer wave with one hand, head tipped a little, soft smile, as if greeting a friend who came back. |
| 021 | `rimon-021.webp` | correct | Lesson item | Correct answer (standard) | Base standing pose, small confirming nod (chin slightly down), pleased closed smile, arms relaxed. |
| 022 | `rimon-022.webp` | correct | Lesson item | Correct answer (light / easy item) | Base pose, one eye closed in a friendly wink (viewer's left eye closed to a curved line), the other eye open, playful closed smile, arms relaxed. |
| 023 | `rimon-023.webp` | correct | Lesson item | Correct answer with energy | Mid-bounce, both feet just off the ground, arms slightly out, big closed smile, eyes happy. |
| 024 | `rimon-024.webp` | correct | Lesson item | Correct after a harder item | Hands clapping in front of the sash, open happy smile (mouth a small joyful oval or wide grin), eyes curved into arcs. |
| 025 | `rimon-025.webp` | correct | Lesson item | Correct streak of 2+ in a row in-lesson | One arm stretched high toward the viewer as if offering a high five, open hand, bright smile, the other arm out for balance. |
| 026 | `rimon-026.webp` | correct | Lesson item | Especially delightful correct moment | Head tipped slightly back, mouth open in a happy laugh, eyes closed in joyful arcs, tiny hands near the sash. |
| 027 | `rimon-027.webp` | correct | Lesson item | Perfect item or bonus | Both arms raised straight up in a V, wide closed smile, eyes open, feet planted, crown upright. |
| 028 | `rimon-028.webp` | correct | Lesson item | Correct during a music or rhythm beat | Body swayed to one side, one arm up, one arm out, happy smile, looking like a tiny dance step, feet on the ground. |
| 029 | `rimon-029.webp` | correct | Lesson item | Correct after a retry | Standing tall, tiny hands on his hips (or near the sash), proud closed smile, chin a little up, eyes open. |
| 030 | `rimon-030.webp` | correct | Lesson item | Big correct (unit checkpoint item) | A small jump, knees bent, arms up, mouth a happy open grin, eyes bright. |
| 031 | `rimon-031.webp` | correct | Lesson item | Correct on a challenge item | One tiny fist pumped near shoulder height, the other arm down, determined happy smile, eyes open. |
| 032 | `rimon-032.webp` | correct | Lesson item | Correct on a respectful / blessing-related practice (no divine names shown) | A small grateful bow, arms at sides, gentle smile, calm eyes, no ritual props and no text. |
| 033 | `rimon-033.webp` | correct | Lesson item | Correct on a sneak-peek or bonus tile | Peering slightly to one side then smiling wide, one hand near his cheek, delighted closed smile. |
| 034 | `rimon-034.webp` | correct | Lesson item | Correct with a playful flourish | A three-quarter turn mid-spin, looking back over his shoulder with a smile, one arm out, feet in a turn. |
| 035 | `rimon-035.webp` | correct | Lesson item | Back-to-back correct answers | Both arms forward in two thumbs-up, big smile, eyes open, standing square. |
| 036 | `rimon-036.webp` | correct | Lesson item | Correct on a kindness / greeting phrase | Tiny hands together in a simple heart shape in front of the sash, soft smile, eyes happy arcs. No text. |
| 037 | `rimon-037.webp` | correct | Lesson item | Reduced-motion correct state (still) | Perfect still of the base character with a slightly wider warm smile and lifted cheeks, arms relaxed, no motion. |
| 038 | `rimon-038.webp` | correct | Lesson item | Correct at the end of a short set | Arms open wide as if ready for a hug, big warm smile, feet apart a little. |
| 039 | `rimon-039.webp` | correct | Lesson item | Correct in a game-like drill | One tiny foot kicked out playfully to the side, arms out, laughing smile. |
| 040 | `rimon-040.webp` | correct | Lesson item | Top-tier in-lesson correct (no sparkles drawn) | Centered hero smile, both arms gently raised at 45 degrees, eyes open and very happy, calm and bright, no effects. |
| 041 | `rimon-041.webp` | wrong | Lesson item | Incorrect answer, first try | A soft 'oh' face: small round open mouth, eyebrows slightly concerned (simple charcoal curves), arms a little out, not scared, not mocking. |
| 042 | `rimon-042.webp` | wrong | Lesson item | Incorrect answer, encouraging | Head shaken slightly (tipped a few degrees), sympathetic closed wavy mouth, one hand raised in a gentle 'try again' wave. |
| 043 | `rimon-043.webp` | wrong | Lesson item | Incorrect, prompting a rethink | One tiny hand on his chin, the other arm across the sash, eyes looking up and to the side, small thoughtful mouth. |
| 044 | `rimon-044.webp` | wrong | Lesson item | After an incorrect, before retry | Leaning forward kindly, both hands offering a small encouraging gesture, soft smile returning, eyes warm. |
| 045 | `rimon-045.webp` | wrong | Lesson item | Incorrect but close | A smaller thumbs-up with a 'you almost had it' closed smile, head tipped, eyes kind. |
| 046 | `rimon-046.webp` | wrong | Lesson item | Learner taps retry | Ready stance, determined little smile, one fist lightly clenched, nodding forward, supportive not stern. |
| 047 | `rimon-047.webp` | wrong | Lesson item | Hint is available after a miss | Pointing carefully toward a hint area (down or to the side), helpful smile, other hand on sash. |
| 048 | `rimon-048.webp` | wrong | Lesson item | Second miss on the same item | A brief sadder mouth (small downturn), but eyes still open and kind, one hand over the sash, then clearly still present and caring — not slumped in despair. |
| 049 | `rimon-049.webp` | wrong | Lesson item | Optional item missed | Friendly shrug, palms up, soft smile, as if saying it is all right. |
| 050 | `rimon-050.webp` | wrong | Lesson item | Learner seems stuck (timer or repeats) | Eyes closed, small calm smile, both hands on the sash, a quiet 'take a breath' stillness. |
| 051 | `rimon-051.webp` | wrong | Speak / listen item missed | Replay audio after a miss | Hand cupped to ear again, attentive eyes, small hopeful smile. |
| 052 | `rimon-052.webp` | wrong | Lesson item | Correct answer is revealed | A teaching nod, pointing gently, calm closed smile, no scolding. |
| 053 | `rimon-053.webp` | wrong | Lesson item | Set continues after misses | One hand raised half way, encouraging smile, 'we will get the next one' energy. |
| 054 | `rimon-054.webp` | wrong | Lesson item | End of a tough item | Arms open in a small comforting gesture, soft smile, head tipped. |
| 055 | `rimon-055.webp` | wrong | Lesson item | Moving on to the next item after a miss | Back to a calm base smile, arms relaxed, a tiny determined sparkle-free nod. |
| 056 | `rimon-056.webp` | streaks | Home / lesson complete | First lesson of a new streak | A modest cheer, one arm up, pleased smile, standing tall. No flame drawings if they look like text; optional tiny unlabelled gold leaf, or no prop at all. |
| 057 | `rimon-057.webp` | streaks | Streak badge / home | 3-day streak | Both arms up, bigger smile, a tiny bounce, eyes happy. |
| 058 | `rimon-058.webp` | streaks | Streak celebration | 7-day streak | Proud chest out, both thumbs up, wide smile, standing on tiptoe. |
| 059 | `rimon-059.webp` | streaks | Streak celebration | 14-day streak | Jumping with both arms in a V, open happy grin, leaves bouncing slightly upward. |
| 060 | `rimon-060.webp` | streaks | Streak celebration | 30-day streak | A proud theatrical little bow, one arm across the sash, the other out, big smile. |
| 061 | `rimon-061.webp` | streaks | Home streak widget | Viewing an active streak | Holding a simple unlabelled gold circle (a streak token, no numbers or letters) in both hands, warm smile, careful and proud. |
| 062 | `rimon-062.webp` | streaks | Streak at risk | Evening of a day with no lesson yet | Hugging a simple unlabelled gold circle close to the sash, slightly nervous but hopeful smile, eyes open. |
| 063 | `rimon-063.webp` | streaks | Home | Streak saved just in time | A big relieved smile, one hand on the sash, the other wiping his brow, eyes closed briefly in relief. |
| 064 | `rimon-064.webp` | streaks | Streak freeze / pause info | Explaining a rest day (including Shabbat-aware rest, no ritual parody) | Calm standing pose, one hand raised in a gentle 'it is okay to rest' palm, soft smile, no props that imitate ritual objects. |
| 065 | `rimon-065.webp` | streaks | Streak week view | Opening the week recap | Pointing at a blank unlabelled cream calendar card with no numbers or letters, happy nod, other hand on sash. |
| 066 | `rimon-066.webp` | streaks | Streak month view | Monthly streak recap | Arms open wide, proud smile, as if showing a long path, standing tall. |
| 067 | `rimon-067.webp` | streaks | Streak share card (image itself has no text) | Share streak CTA (the still has no writing) | Hero pose: three-quarter view, one arm up, big smile, ready to be placed on a share card. |
| 068 | `rimon-068.webp` | streaks | Home after a broken streak | Starting a streak again | Determined ready stance, small hopeful smile, one fist pumped at waist height, encouraging not shameful. |
| 069 | `rimon-069.webp` | streaks | Streak celebration | Completing a weekly goal | High-five toward the viewer, jumping slightly, huge smile. |
| 070 | `rimon-070.webp` | streaks | Home | Long streak, reduced-motion / evening | Still, hands folded over the sash, gentle proud smile, eyes softly closed. |
| 071 | `rimon-071.webp` | lesson-complete | Lesson complete screen | Lesson finished successfully | Both arms in a high V, big closed smile, eyes happy, feet planted, hero celebration still. |
| 072 | `rimon-072.webp` | lesson-complete | Lesson complete screen | A more formal lesson (prayer or reading track, no divine names) | Respectful bow with a happy closed smile, arms at sides, calm celebration. |
| 073 | `rimon-073.webp` | lesson-complete | Lesson complete screen | High score in the lesson | Clapping above his head (hands together over the crown, not covering it completely), laughing smile. |
| 074 | `rimon-074.webp` | lesson-complete | Lesson complete screen | Perfect lesson | Mid-air small jump, body slightly rotated, arms out, open grin. |
| 075 | `rimon-075.webp` | lesson-complete | Lesson complete screen | First trophy of a unit | Holding a simple unlabelled gold cup-shape (no text, no numbers) in both hands, proud smile, looking at the viewer. |
| 076 | `rimon-076.webp` | lesson-complete | Lesson complete screen | Medal awarded | A plain unlabelled gold medal-shape hanging on a short blue ribbon over the sash (no text), proud closed smile, arms slightly out. |
| 077 | `rimon-077.webp` | lesson-complete | Lesson complete screen | Three-star style result (star has no text) | Holding a simple five-point gold star with no text, both hands, delighted smile. One star only. |
| 078 | `rimon-078.webp` | lesson-complete | Lesson complete screen | Next lesson CTA | Pointing to the viewer's right toward Next, encouraging smile, other arm waving a little. |
| 079 | `rimon-079.webp` | lesson-complete | Lesson complete screen | Suggesting a short break | Sitting down with tiny legs forward, hands on the sash, content tired-happy smile, eyes softly pleased. |
| 080 | `rimon-080.webp` | lesson-complete | Lesson complete screen | Review missed items CTA | Thumbs up and a slight point, 'we can review' smile, standing calmly. |
| 081 | `rimon-081.webp` | lesson-complete | Unit complete | A whole unit is finished | Arms wide, standing in front of a blank unlabelled cream ribbon banner with no text, huge smile. |
| 082 | `rimon-082.webp` | lesson-complete | Path / course complete | A learning path is finished | Deep happy bow, then looking up with a proud smile, one hand over the sash. |
| 083 | `rimon-083.webp` | lesson-complete | Lesson complete screen | Practice-with-a-friend beat | Both hands raised for a double high five, jump, huge smile. |
| 084 | `rimon-084.webp` | lesson-complete | Lesson complete screen | Celebration without effects | Dancing sway, one foot out, both arms up, open laugh, no confetti or sparkles drawn. |
| 085 | `rimon-085.webp` | lesson-complete | Lesson complete, reduced motion | prefers-reduced-motion or evening wrap-up | Still hero smile, arms gently out at 45 degrees, peaceful and proud. |
| 086 | `rimon-086.webp` | idle | Companion dock / any screen | Default idle, eyes open | EXACT base pose matching the official references: standing square, feet together, tiny arms relaxed at his sides, calm closed smile, crown upright, both leaf ears level, eyes open. This is the model sheet still. |
| 087 | `rimon-087.webp` | idle | Companion dock | Idle blink frame | Same exact body, position and outline as the base pose; only the eyes change to fully closed short charcoal lines. Calm smile unchanged. |
| 088 | `rimon-088.webp` | idle | Companion dock | Idle half-blink | Same exact body as the base pose; eyelids halfway down over the dot eyes. Nothing else changes. |
| 089 | `rimon-089.webp` | idle | Companion dock | Idle variant after a while | Base pose with a slightly wider relaxed smile, eyes open, arms still. |
| 090 | `rimon-090.webp` | idle | Companion dock | Long idle | Base pose with weight shifted onto one foot, the other foot slightly out, arms still relaxed, calm smile. |
| 091 | `rimon-091.webp` | idle | Companion dock | Idle glance | Base body, head turned a little to the viewer's left, eyes looking left, smile remains. |
| 092 | `rimon-092.webp` | idle | Companion dock | Idle glance | Base body, head turned a little to the viewer's right, eyes looking right, smile remains. |
| 093 | `rimon-093.webp` | idle | Companion dock | Idle curiosity | Base body, eyes looking up, small curious smile, crown upright. |
| 094 | `rimon-094.webp` | idle | Companion dock | Pleasant idle | Eyes softly closed, small content smile, one hand over the sash, as if humming with no notation shown. |
| 095 | `rimon-095.webp` | idle | Companion dock | Gentle idle motion still | Body swayed slightly left, arms hanging, calm smile, feet planted. |
| 096 | `rimon-096.webp` | idle | Companion dock | Gentle idle motion still | Body swayed slightly right, arms hanging, calm smile, feet planted. |
| 097 | `rimon-097.webp` | idle | Home / between lessons | Waiting on the home path | Sitting with tiny legs forward, hands in his lap at the sash, patient smile, eyes open. |
| 098 | `rimon-098.webp` | idle | Companion dock collapsed / peek | Rimon is peeking in from the side | Rimon peeking from the right edge, one hand waving, most of the round body visible, playful smile. Still fully on-model, not cropped through the face. |
| 099 | `rimon-099.webp` | idle | Companion dock | Long inactivity, before full yawn | Base pose, mouth a small oval, eyes drooping slightly, arms relaxed. |
| 100 | `rimon-100.webp` | idle | Companion dock | After a long idle, waking back up | Both tiny arms stretched straight up, eyes happily closed, body a few pixels taller, feet in the same place, content. |
| 101 | `rimon-101.webp` | error-offline | Error toast / generic failure | A soft unexpected error | Small surprised round mouth, raised simple eyebrow curves, hands a little up, not panicked. |
| 102 | `rimon-102.webp` | error-offline | Error screen | Something did not load | One hand scratching just beside the crown (not knocking it off), puzzled wavy mouth, eyes looking up. |
| 103 | `rimon-103.webp` | error-offline | Error screen | Unknown error | Full shrug, palms up, apologetic small smile, head tipped. |
| 104 | `rimon-104.webp` | error-offline | Offline screen | The app is offline | Looking left then drawn as looking slightly off to one side, one hand over his brow as if searching, concerned but calm. |
| 105 | `rimon-105.webp` | error-offline | Offline screen | Waiting for a connection | Sitting patiently, hands in lap, small hopeful smile, eyes open. |
| 106 | `rimon-106.webp` | error-offline | Offline screen | Retry connection CTA | Holding a very simple unlabelled loop-antenna or radio shape (no text, no logos, no bars with numbers) and giving a thumbs-up with the other hand, hopeful smile. |
| 107 | `rimon-107.webp` | error-offline | Offline-capable lesson | A downloaded lesson still works | Reassuring nod and thumbs-up, calm smile, as if saying we can keep learning. |
| 108 | `rimon-108.webp` | error-offline | Error screen | Retry button is offered | Pointing down or aside toward a retry control, encouraging determined smile. |
| 109 | `rimon-109.webp` | error-offline | 404 / missing page | Page not found | Holding two ends of a simple unlabelled broken chain or blank card (no text), sorry little mouth, kind eyes. |
| 110 | `rimon-110.webp` | error-offline | Timeout screen | A request timed out | Glancing at a plain unlabelled round clock-shape with a simple unmarked face (no numerals), mild worry, one foot tapping pose (one foot slightly lifted). |
| 111 | `rimon-111.webp` | error-offline | Save / progress error | Progress may not have saved | Hands protectively over the sash, worried but brave small smile, looking at the viewer as if promising to try again. |
| 112 | `rimon-112.webp` | error-offline | After an error | Retry succeeded | Arms up, relieved laugh, same celebration energy as a correct answer. |
| 113 | `rimon-113.webp` | error-offline | Maintenance / temporarily unavailable | Planned downtime | Sitting with a small unlabelled hanging-door-sign shape that is completely blank (no letters), calm waiting smile. |
| 114 | `rimon-114.webp` | error-offline | Empty search / no results | No results | Looking into a plain unlabelled empty box or open bag with nothing inside, curious then soft shrug, kind smile. |
| 115 | `rimon-115.webp` | error-offline | Permission screen | A permission was denied | Open palms, understanding nod, soft smile, no scolding, ready to continue without that feature. |
| 116 | `rimon-116.webp` | holidays | Home on Friday evening / Shabbat mode | Shabbat-aware rest state | Sitting peacefully, hands folded over the sash, eyes softly closed, gentle smile, no work-like props, a calm Friday-evening mood. No text. |
| 117 | `rimon-117.webp` | holidays | Home / Shabbat greeting | Shabbat welcome (candles already in the scene, not a how-to) | Standing beside a simple pair of unlit-or-lit candles in plain holders on a small cream table, Rimon's hands folded respectfully, warm quiet smile. He is present, not performing a blessing. No text, no prayer quotes. |
| 118 | `rimon-118.webp` | holidays | Shabbat table scene | Shabbat meal moment in a lesson or home card | Standing at a simple table with two plain braided loaves (no writing on a cover, or a blank cloth), content smile, hands resting at his sides. Respectful, not comedic. |
| 119 | `rimon-119.webp` | holidays | Friday afternoon reminder | Winding down before rest | Walking calmly, one arm relaxed, peaceful smile, as if heading home. No phones or tools in hand. |
| 120 | `rimon-120.webp` | holidays | Saturday evening | Havdalah-time quiet still (no ritual instruction) | Standing in a slightly dimmer cream setting (flat color, no gradients), a simple unlabelled spice jar and a plain braided candle on a table beside him, calm smile, hands still. No text. |
| 121 | `rimon-121.webp` | holidays | Holiday home card — Rosh Hashanah | Rosh Hashanah greeting | Standing beside a small plate of apple slices and a little bowl of honey (plain, no labels), hopeful smile, hands open in a welcome. No text, no shofar required. |
| 122 | `rimon-122.webp` | holidays | Holiday home card — Rosh Hashanah | Pomegranate new-year motif (Rimon with fruit, careful not to look like a second mascot eating himself) | Standing beside a simple bowl of whole pomegranates, one tiny hand gesturing toward the bowl, proud but gentle smile. He himself remains the mascot, not a fruit on the plate. |
| 123 | `rimon-123.webp` | holidays | Holiday home card — Yom Kippur | Yom Kippur still, very respectful | Standing still and modest, hands folded, eyes gently closed, a serious but kind calm face, no comedy, no food props, no text. Plenty of empty cream space. |
| 124 | `rimon-124.webp` | holidays | Holiday home card — Sukkot | Sukkot greeting | Standing inside a simple sukkah suggested by a few leafy branches overhead and rustic posts, happy closed smile, arms slightly out. No text on decorations. |
| 125 | `rimon-125.webp` | holidays | Holiday / lesson | Showing lulav and etrog as objects of a lesson (respectful, not a joke) | Carefully holding a simple lulav bundle and a yellow etrog in his tiny hands, serious-happy respectful smile, standing still. No text. |
| 126 | `rimon-126.webp` | holidays | Holiday home card — Simchat Torah | Joyful dance still | Joyful dancing sway with both arms up, big smile, no scroll text; if a scroll is present it is a closed plain parchment roll with completely blank sides. |
| 127 | `rimon-127.webp` | holidays | Holiday home card — Hanukkah | Hanukkah greeting | Standing beside a simple nine-branched menorah (one taller shamash, eight equal branches), a few candles lit, warm smile, hands folded or one hand open in welcome. No text, no letters on the menorah. |
| 128 | `rimon-128.webp` | holidays | Holiday / lesson game | Dreidel pause / play still | Looking at a plain four-sided dreidel on the floor (the faces are blank — no letters), delighted smile, hands ready to take a turn, kneeling or bending slightly. |
| 129 | `rimon-129.webp` | holidays | Holiday home card | Festive food still | Standing beside a simple plate of latkes and a small plain apple-sauce bowl, no labels, happy smile, not messy-comedy. |
| 130 | `rimon-130.webp` | holidays | Holiday home card — Purim | Purim greeting | Festive happy pose, both arms up, big smile, a simple plain eye-mask held in one hand (mask has no text or faces of real people), respectful fun not scary. |
| 131 | `rimon-131.webp` | holidays | Holiday / lesson | A grogger / noisemaker still | Holding a simple unlabelled wooden grogger, mid happy shake, smiling, no letters on the toy. |
| 132 | `rimon-132.webp` | holidays | Holiday home card — Pesach | Pesach greeting | Standing at a set table with a plain seder plate of simple unnamed foods (no labels, no letters), respectful smile, hands folded. No hagaddah text. |
| 133 | `rimon-133.webp` | holidays | Holiday / lesson | Matzah as a vocabulary object | Holding a simple square of matzah (plain, no brands or text) in both hands, educational calm smile. |
| 134 | `rimon-134.webp` | holidays | Holiday home card — Shavuot | Shavuot greeting | Standing among simple flowers and greenery, happy peaceful smile, maybe a small basket of plain white dairy-looking cakes with no labels. No text, no tablets with writing. |
| 135 | `rimon-135.webp` | holidays | Holiday / lesson | Landscape still, respectful | Standing in the foreground with a simple distant flat-vector mountain in cream-and-olive, looking toward it quietly, calm smile, no writing in the scene, no tablets. |
| 136 | `rimon-136.webp` | holidays | Holiday home card — Tu BiShvat | Tree planting still | Kneeling or bending, both hands around a small sapling in a mound of earth, hopeful smile, olive-green leaves on the sapling, no signs or text. |
| 137 | `rimon-137.webp` | holidays | Holiday / lesson | Seven species still, educational | Standing beside a simple arrangement of grapes, figs, pomegranates, olives, dates, wheat and barley — all unlabelled, no text — presenting them with open hands and a calm smile. |
| 138 | `rimon-138.webp` | holidays | Holiday home card — Lag BaOmer | Distant bonfire still, safe and calm | Standing in the foreground, a small simple campfire shape in the middle distance (flat, not scary), warm smile, one hand waving, plenty of space, no dangerous play. |
| 139 | `rimon-139.webp` | holidays | Holiday home card — Yom Haatzmaut | Celebratory still without slogans | Happy cheer, both arms up, standing on a simple cream ground with a few plain blue-and-white bunting flags that have no star, letters, or symbols, just two-color triangles. Joyful smile. |
| 140 | `rimon-140.webp` | holidays | Holiday home card — Yom HaZikaron | Quiet memorial still, very respectful | Standing still, hands folded, eyes gently lowered, a solemn kind face, no flags required, no text, plenty of quiet space. |
| 141 | `rimon-141.webp` | holidays | Holiday home card — Tisha B'Av | Somber still, respectful | Sitting quietly, hands in his lap, eyes lowered, a gentle somber mouth (not cartoon-crying), no comedy, no destroyed-building gore, just quiet cream space. |
| 142 | `rimon-142.webp` | holidays | Calendar / Rosh Chodesh | New month still | Looking up at a simple crescent moon in the cream sky, small hopeful smile, one hand lightly raised, no text or calendar numbers. |
| 143 | `rimon-143.webp` | holidays | Saturday night / week start | Ready for a new week of learning | A calm then brighter smile, one thumbs-up, standing ready, a small unlabelled braided candle on a table behind him, no text. |
| 144 | `rimon-144.webp` | holidays | Generic Jewish holiday card | Fallback holiday still when a specific art is not used | Warm welcome, both arms open, a simple unlabelled small bouquet of olive leaves and a gold circle, respectful smile, no text. |
| 145 | `rimon-145.webp` | holidays | Generic holy day | A solemn holy-day fallback | A deep respectful bow, arms at sides, eyes gently closed, quiet cream space, no props, no text. |
| 146 | `rimon-146.webp` | brain-lab | Brain Lab hub | Opening Brain Lab | Excited welcome, both arms open, bright smile, standing in front of a simple unlabelled cream game-board suggestion (blank tiles, no letters). |
| 147 | `rimon-147.webp` | brain-lab | Brain Lab hub | Choosing a lab game | Wearing simple round unlabelled gold-rim goggles pushed up onto the crown (they must not hide the calyx completely), playful determined smile, one thumb up. Still clearly Rimon. |
| 148 | `rimon-148.webp` | brain-lab | Brain Lab puzzle | A puzzle is on screen | Hand on chin, the other on the sash, eyes narrowed in concentration (still friendly dots), small straight mouth. |
| 149 | `rimon-149.webp` | brain-lab | Brain Lab puzzle | The learner solves a puzzle | Sudden happy open mouth, eyes wide, one finger raised as if an idea landed, other arm out. |
| 150 | `rimon-150.webp` | brain-lab | Brain Lab timed game | A timer is running (no numerals on the prop) | Athletic ready stance, focused smile, a plain unlabelled hourglass beside him, no numbers. |
| 151 | `rimon-151.webp` | brain-lab | Brain Lab game | Correct move in a lab game | Small jump and clap, same on-model celebration as lesson-correct, slightly more playful. |
| 152 | `rimon-152.webp` | brain-lab | Brain Lab game | A miss in a lab game | A comical but kind wobble, one foot out, reassuring smile, hands out for balance — never mean. |
| 153 | `rimon-153.webp` | brain-lab | Memory / match game | About to flip a card | Pointing at a pair of blank cream rounded cards with no letters or pictures required, concentrated smile. |
| 154 | `rimon-154.webp` | brain-lab | Pinball / arcade lab game | A good shot or win | Leaning as if watching a board, both fists lightly clenched, excited smile, no logos on any machine. |
| 155 | `rimon-155.webp` | brain-lab | Bubble game | A successful pop | Reaching one hand up toward a plain unlabelled soap bubble, delighted smile, on tiptoe. |
| 156 | `rimon-156.webp` | brain-lab | Pattern / sequence game | Showing a sequence | Pointing along a row of three blank colored squares (red, gold, olive) with no letters, teaching smile. |
| 157 | `rimon-157.webp` | brain-lab | Brain Lab hub | Scientist-play still, light touch | Wearing a simple unlabelled cream lab coat over the sash (sash still visible at the opening), holding a plain unlabelled flask with a drop of pomegranate-red juice, friendly smile. Coat must not hide who he is. |
| 158 | `rimon-158.webp` | brain-lab | Brain Lab results | Game finished well | Arms in a V, jumping, huge smile, no score numbers drawn. |
| 159 | `rimon-159.webp` | brain-lab | Brain Lab results | Game finished with a low score | Encouraging thumbs-up, kind smile, ready stance, 'play again' energy. |
| 160 | `rimon-160.webp` | brain-lab | Brain Lab hub | Leaving back to lessons | A small wave, turning slightly toward the path, warm smile. |
| 161 | `rimon-161.webp` | storybooks | Storybooks library | Opening the library | Sitting with a plain closed cream book (completely blank cover, no letters), waving with the other hand, warm smile. |
| 162 | `rimon-162.webp` | storybooks | Storybook reader | A story is opened | Holding an open book with completely blank pages (no writing, no pictures required), looking down then smiling up at the viewer. |
| 163 | `rimon-163.webp` | storybooks | Storybook reader | Read-aloud is playing | One hand raised in a gentle storytelling gesture, mouth a small speaking oval, eyes open and animated, book in the other arm, pages blank. |
| 164 | `rimon-164.webp` | storybooks | Storybook reader | Turning a page | In the act of turning a blank page, curious smile, eyes on the book. |
| 165 | `rimon-165.webp` | storybooks | Storybook reader | Listener mode | Sitting, eyes softly closed, content smile, book open on his lap, as if listening together. |
| 166 | `rimon-166.webp` | storybooks | Storybook reader | A surprising story beat | Small gasp (round mouth), eyes a little wider, hands on the blank book, still friendly not scared. |
| 167 | `rimon-167.webp` | storybooks | Storybook reader | A funny story beat | Laughing with eyes closed, one hand on his sash, book tucked under the other arm. |
| 168 | `rimon-168.webp` | storybooks | Storybook reader | A kindness beat | Hands over his sash, soft moved smile, head tipped, gentle eyes. |
| 169 | `rimon-169.webp` | storybooks | Storybook reader | The end of a book | Closing the blank book, a small bow, happy satisfied smile. |
| 170 | `rimon-170.webp` | storybooks | Storybooks library | Recommending the next book | Pointing to the side at another blank cream book on a shelf (shelf of 2–3 blank books, no titles), encouraging smile. |
| 171 | `rimon-171.webp` | storybooks | Storybook reader, evening | A bedtime story ending | A cute yawn, book closed, sleepy smile, eyes half closed, still on-model, not dark or scary. |
| 172 | `rimon-172.webp` | storybooks | Storybook reader | A page failed to load | Holding a book with empty pages, puzzled but calm, one shrug-hand, kind face — leads into retry. |
| 173 | `rimon-173.webp` | storybooks | Storybooks library | A new book is available | Peeking over a larger blank cream book held upright, excited eyes and smile. |
| 174 | `rimon-174.webp` | storybooks | Storybook that includes Rimon as a character | Rimon cameo in a story | A clear wave, slightly three-quarter view, same on-model design, as if stepping into a page, no text. |
| 175 | `rimon-175.webp` | storybooks | Storybooks library idle | Long idle in the library | Dozing sitting against a small stack of blank books, peaceful smile, eyes closed, crown upright. |
| 176 | `rimon-176.webp` | awards | Awards / badge screen | A new badge is earned | Holding a plain unlabelled gold badge-circle in both hands, amazed happy smile, looking at the viewer. No letters or numbers on the badge. |
| 177 | `rimon-177.webp` | awards | Awards / profile | Viewing earned badges | Standing proud, a small plain gold circle pinned near the sash (no text), hands on hips, smile. |
| 178 | `rimon-178.webp` | awards | Certificate screen | A certificate is ready (the still itself has no writing) | Holding a vertical cream certificate paper that is completely blank, proud smile, both hands on the edges. |
| 179 | `rimon-179.webp` | awards | Awards | A rare award | Gently touching his gold calyx with one hand as if proud of it, shy-proud smile, the other arm relaxed. Do not add a second crown. |
| 180 | `rimon-180.webp` | awards | Level up modal | Level increased (no numerals drawn) | Jumping, arms in a V, huge smile, a plain unlabelled gold arrow-up shape beside him, no digits. |
| 181 | `rimon-181.webp` | awards | Friendly progress, not a public shame board | Viewing personal progress | Pointing at a blank cream bar-chart with no numbers or labels, encouraging smile, only one simple bar. |
| 182 | `rimon-182.webp` | awards | Share award card (no text in the image) | Share CTA | Hero three-quarter pose, one arm up, big smile, ready to sit on a share card. |
| 183 | `rimon-183.webp` | awards | Badge cabinet | Opening the collection | Standing before a small shelf of 3–4 plain unlabelled gold circles, presenting them with open arms, proud smile. |
| 184 | `rimon-184.webp` | awards | Awards | Very first badge ever | Both hands on a badge, eyes wide and happy, a small bounce, mouth an amazed oval. |
| 185 | `rimon-185.webp` | awards | Awards that a family or teacher might see | A more formal award | Respectful bow while holding a blank certificate, kind smile. |
| 186 | `rimon-186.webp` | awards | Awards + streak | A streak badge specifically | Holding a plain gold circle and giving a thumbs-up, proud but calm. |
| 187 | `rimon-187.webp` | awards | Brain Lab awards | A lab medal | A plain medal on a blue ribbon, one arm up, playful proud smile. |
| 188 | `rimon-188.webp` | awards | Storybook awards | Finished a set of books | Holding a blank book and a blank badge together, content smile. |
| 189 | `rimon-189.webp` | awards | Awards | Close to the next badge | On tiptoe, reaching toward a slightly-out-of-reach plain gold circle, determined hopeful smile. |
| 190 | `rimon-190.webp` | awards | Awards closer | Closing the awards screen | A grateful wave, soft proud smile, other hand over the sash. |
| 191 | `rimon-191.webp` | reminders | Practice reminder / re-engagement | Daily reminder (in-app or widget art) | A clear friendly wave, bright smile, standing square, inviting the learner back. No text in the image. |
| 192 | `rimon-192.webp` | reminders | Practice reminder | It is practice time | Pointing at a plain unlabelled round clock with no numerals, encouraging smile, other hand waving. |
| 193 | `rimon-193.webp` | reminders | Evening reminder | An evening session invitation | Standing beside a simple unlabelled small lamp with a warm cream glow suggested only as a flat pale-gold oval (no gradients if possible; a flat pale gold circle is fine), calm smile. |
| 194 | `rimon-194.webp` | reminders | Morning reminder | A morning session invitation | The stretch-up pose, happy freshly-awake smile, eyes open, arms up. |
| 195 | `rimon-195.webp` | reminders | Reminder | Streak at risk, kind tone | Holding the plain gold token close, hopeful eyes, small wave, never shaming. |
| 196 | `rimon-196.webp` | reminders | Reminder before Shabbat | Encouraging a lesson before rest, then rest | A calm point toward a path, then one hand raised in a gentle 'and then rest' palm, kind smile, no ritual parody. |
| 197 | `rimon-197.webp` | reminders | Re-engagement | The learner has been away | Peeking around a blank cream door edge, one waving hand, hopeful smile, fully on-model. |
| 198 | `rimon-198.webp` | reminders | Midday reminder | A short practice invitation | Sitting with a plain unlabelled cup (no logo) and a wave, casual friendly smile. |
| 199 | `rimon-199.webp` | reminders | Daily goal reminder | Today's goal is waiting (no numbers) | Pointing at a blank checklist of three empty unlabelled boxes (no writing), determined smile, thumbs up with the other hand. |
| 200 | `rimon-200.webp` | reminders | Night / app close | A goodnight still, no pressure | A small sleepy wave, eyes half closed, gentle smile, one hand near his face, peaceful, no streak pressure. |
