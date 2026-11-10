# Reading path check (2026-11-04)

Scope: src/torahreader, src/torahread, src/trope, src/listen, src/speak, src/wordtrace, data/corpus (read only), plus the pieces they call (src/pronunciation/transliterate.js and shva.js, src/audio/player.js, src/shell/audio*.js, src/corpus/read.view.js).

How this was checked: I ran the real modules under Node against the real data files (respelling for all three traditions, trope-name lookup, audio planning against the manifests, speak scoring, trope-trainer word collection) and read the view code. I did not open any screen in a browser, so layout, focus order and real speech/recognition behaviour are not covered. Everything about Hebrew below is taken from the data files; nothing was typed from memory except where a finding says "expected".

Samples: Genesis 1:1 (torahread ladder, `gen-1-1`), Deuteronomy 6:4 (Shema verse, reader), Numbers 6:24 and 6:25 (Priestly Blessing, reader). Prayers: Shema (`shema-1`), Modeh Ani (`modeh-ani-1`), Barchu (`torah-barchu`).

## 1. What a learner sees, step by step

### Respelling (siddur scheme, rule-generated; `src/pronunciation/transliterate.js`)

| Text | Israeli | Sephardi | Ashkenazi |
|---|---|---|---|
| Deut 6:4 | shema yisra'el adonai eloheinu adonai echad | identical to Israeli | shema yisro'eil adonoy eloheinu adonoy echod |
| Num 6:24 | yevarekhkha adonai veyishmerekha | identical | yevorekhkho adonoy veyishmerekho |
| Gen 1:1 | bereshit bara elohim et hashamayim ve'et ha'aretz | identical | bereishis boro elohim eis hashomayim ve'eis ho'oretz |
| Modeh Ani | modeh ani lefanekha melekh chai vekayam shehechezarta bi nishmati bechemlah rabah emunatekha | identical | modeh ani lefonekho melekh chai vekayom shehechezarto bi nishmosi bechemloh raboh emunosekho |
| Barchu | barkhu et adonai hamevorakh barukh adonai hamevorakh le'olam va'ed | identical | borkhu es adonoy hamevorokh borukh adonoy hamevorokh le'olom vo'ed |

Checked and correct in the output: Ashkenazi tav without dagesh gives s (eis, nishmosi, emunosekho, bereishis), tav with dagesh stays t (shehechezarto), kamatz gives o, tzere gives ei, the divine name is respelled as adonai/adonoy. Kamatz katan in bekhol-levovekho is handled (the "kol" word). Israeli and Sephardi are always identical in Latin letters (documented in the module header). The reader screen now says so (see fixes).

### Pointing and cantillation

| Item | Pointed text | Trope marks | Where shown |
|---|---|---|---|
| Deut 6:4 | yes | yes: tipcha, etnachta, mercha, tipcha, mercha + paseq, siluk (counts re-verified against the UXLC text in the data) | /torahreader (not routable, see F1), /trope (trainer) |
| Num 6:24-25 | yes | yes (mercha, tipcha, siluk; kadma, darga, tevir, tipcha, siluk) | same |
| Gen 1:1 | yes | none stored (verses.json is pointed text only) | /torahread ladder only |
| Shema (registry) | yes | none in the registry text; marks exist only for Deut 6:4-9 as a Torah passage | n/a |
| Modeh Ani, Barchu | yes | not applicable | /read, /torahread, /speak |

Marks per tradition (data/corpus/trope/table.json, used by torahreader and trope trainer; Ashkenazi list for ashkenazi, Sephardi/Mizrahi list for israeli and sephardi): tipcha is Tipcha / Tarcha; etnachta is Etnachta / Atnach; mercha is Mercha / Maarich; the last word of a verse is "Sof pasuk" (Ashkenazi) / "Siluk" (Sephardi); kadma is Kadma / Azla; pashta is Pashta / Kadma. Internally consistent between torahreader, trope trainer and the table. Israeli learners see the Sephardi list labelled "(Sephardi name)"; that is accurate but may surprise (a test pins the wording, so left alone).

### Word-by-word gloss

| Item | Glossed words |
|---|---|
| Deut 6:4 | 6 of 6 (hear, Israel, the LORD, our-God, the LORD, one) |
| Deut 6:5-9 | none (reader says "No literal gloss is stored for this word") |
| Num 6:24-26 | all 15 tokens; 6:22-23 and 6:27 none |
| Shema registry line (/read) | yes, shown for single-line texts |
| Modeh Ani, Barchu | none stored (registry has no wordGlosses for them) |
| Gen 1:1 | none per word; verse English only (JPS 1917). 30 frequent Torah words have glosses (words30) |

The screens state absence honestly rather than inventing glosses.

### Audio status

All 6384 entries in data/audio/manifest.json have status "missing", source "none"; `equivalence.json` has no rules. So nothing is a recording yet. What a learner gets:

| Setting | Result of "Hear it" |
|---|---|
| Israeli, device has a he-IL voice, item known to the manifest | browser voice (labelled as such) |
| Israeli, item NOT in the manifest | "no audio entry exists" (see F2) |
| Sephardi or Ashkenazi | "Not played" with a note to read the respelling (the device voice is Israeli; the app refuses to present it as the learner's tradition, which is the honest behaviour) |

Item ids: Shema (`shema-1`, `shema-1-w1..6`), Modeh Ani (`modeh-ani-1`), Barchu (`torah-barchu-l1`, `-l2`) and the reader's registry-backed words (`shema-vahavta-w1..42`, `bless-priestly-n-wk`) all exist in the manifests and line up with the reader tokens (checked: 42 of 42 Shema tokens and all Priestly Blessing tokens match the manifest word text; only the trailing sof pasuq differs). Not in any manifest: `torahread-gen-1-1` and the other six verse ids, `torahread-word-NN`, `torahreader-priestly-blessing-22/23/27-*`.

## 2. Findings

Severity: B = wrong output a learner would see, D = dead end, C = claim not backed by data, G = gap.

| # | Sev | Finding | Status |
|---|---|---|---|
| F1 | D | /torahreader is not in `src/shell/router.js` or `src/shell/i18n.js`, so the reader (the only screen with word-by-word marks and names) cannot be reached. The lines are already written in docs/corpus/READER-ROUTE.md. `views.generated.js` lists the file but nav hides unrouted views. | Diff below (router/i18n not mine) |
| F2 | D | `ctx.audio.play(kind, id, {text})` is called with the text for ids not in the manifest (Num 6:22-23, 6:27; all 7 `torahread` verses; 30 words), but `src/audio/player.js` ignores `o.text` (`plan()` and `planWithoutFile()` read only the manifest text). Result: "no audio entry exists" even for Israeli learners with a Hebrew device voice. The READER-ROUTE.md sentence "unless it falls back to the browser voice" is not what the code does. | Diff below (player not mine) |
| F3 | B | Respelling of any word ending in -ayu is wrong: וְהָיוּ gives "vehai" (Israeli/Sephardi) and "vehoy" (Ashkenazi) instead of vehayu / vehoyu. Cause: the yod after kamatz is treated as a silent diphthong letter even when the next letter is a shuruk vav, which then loses its vowel. Occurs in Deut 6:6 and 6:8 (the Shema passage). Over all 1077 distinct words of the registry and reader files this is the only word it changes. | Diff below (pronunciation not mine); tested in a scratch copy |
| F4 | B | Two shvas in a row where the first follows a long vowel: וּבְשָׁכְבְּךָ (Deut 6:7) gives "uveshakhebkha" (vowel on the wrong consonant). The L3 heuristic outranks "first of two shvas is silent". Expected "uveshakhbekha". Also changes קָדְשְׁךָ to kadshekha. This is one of the rules the module itself lists as heuristic; the fix is small. | Diff below; tested in a scratch copy |
| F5 | B | Read-aloud scoring (src/speak) compared the printed four-letter name with what the recognizer wrote. A recognizer writes what it hears (the spoken name), so every Barchu / blessing line with the name scored a "not heard" on that word and stored it in the missed-words report. Also the browser model voice was handed the written name. | Fixed in src/speak (below) |
| F6 | C | `src/torahread/sources.js` and docs/torahread/SOURCES.md still said Barchu and the blessing after the reading come from the Metsudah siddur (CC-BY, "riskiest label"). The registry now has `torah-barchu` from Siddur Edot HaMizrach (CC0) and `torah-bless-2` from Torat Emet 357 (Public Domain). | Fixed (below) |
| F7 | C | `recordedLine()` said the button "uses your browser's Hebrew voice if there is one". For the verse and word items that is false (F2), and for Sephardi/Ashkenazi it refuses. | Fixed (below) |
| F8 | C | The /torahread "Trope: not taught" page says the texts in this app leave cantillation marks out. True of the ladder texts, but /torahreader and /trope show marks. Once F1 is fixed the page contradicts the reader. | Not changed (data file, wording choice for the owner): suggested wording "The reading ladder texts leave the marks out; the Torah reader and the trope trainer show them for Numbers 6:22-27 and Deuteronomy 6:4-9 only." |
| F9 | G | Speak "Read a prayer aloud" has no Shema (`PRAYER_IDS` in src/speak/build.mjs has shema-2, the Baruch shem line, but not shema-1). The first prayer a learner reads with a congregation is missing from the one place that scores reading. Also `torah-barchu` has `lineAudio: null` although the manifest has `torah-barchu-l1/-l2`: the builder only maps single-line prayers. | Diff below (regenerates data/speak, so left) |
| F10 | G | Stress is never shown. Respellings carry no stress mark in any tradition, although Ashkenazi stress often differs from Israeli (data/pronunciation/prayerwords.json has it for 10 words: Ashkenazi "BO-rukh", "SHAH-bos"; Israeli "ba-RUKH", "sha-BAT"), and the reader data has `stressLetterIndex` for every Torah word, unused. The reader screen now says stress is not marked. | Open |
| F11 | B | Two modules disagree on the Ashkenazi cholam: transliterate.js default gives "o" (toroh, ho'olom), prayerwords.json says "TOY-roh / TOH-roh" and "ho-OY-lom (some: ho-OH-lom)". transliterate has a `cholam: 'oy'` option; the data calls the oy value a regional variant. Which is the app default for "Ashkenazi" should be one decision. | Open (decision) |
| F12 | G | Large letters (ayin of shema, dalet of echad, `largeLetters` in the reader data) are not drawn. The data note says so; the learner reading from a scroll would see them. | Open |
| F13 | G | Listen and pick can only offer the read-and-match drill (needs recorded words; none exist). It says so ("Audio not recorded yet"). Honest, no change. | Info |
| F14 | G | Wordtrace has no tradition handling: mark names are one fixed set ("Kamatz", "Cholam"), no respelling, "Hear the word" only when a file exists (none). The 10 "prayerwords" entries (e.g. Adonai, amen) have no audio id. | Info |
| F15 | G | Modeh Ani has a women's form (`variants.f`, derived by the project, marked needs-check) shown only as text on /read: no respelling, no audio id. | Info |

Not a bug, documented limit: Israeli and Sephardi respellings are identical by design; no Israeli or Sephardi difference (pharyngeals, shva) is written.

## 3. Changes made in this pass (files in scope)

- `src/speak/model.js`: new `spokenTarget()` and `spokenPointed()`. `compare`, `alignLetters` and `alignWords` fold the four-letter name to its spoken form on both the target and the heard text before scoring (so a recognizer that wrote either form matches, and prefixed forms like ליהוה work). Words in the result and in the missed-words report keep the printed form.
- `src/speak/speak.js`: the model voice receives `spokenPointed(he)` (same substitution the audio manifest uses). Import added.
- `tests/speak.test.js`: one existing assertion updated (voice text is the spoken form); one test added (divine-name matching, both heard forms, prefixed form, stored word is the printed one). Result: 48 pass, 0 fail.
- `src/torahread/ladder.view.js`: `recordedLine()` wording (F7). `tests/torahread.view.test.js` still passes (its "No recorded audio for this line yet" match is kept).
- `src/torahread/sources.js`, `docs/torahread/SOURCES.md`: source rows match the registry (F6). `tests/torahread.view.test.js` line 89 now expects CC0 instead of CC-BY (the CC-BY row was the stale one).
- `src/torahreader/torahreader.view.js`: the selected-word panel now carries one line: respelling follows the setting, is rule-generated and unchecked, does not mark stress, and (for Israeli/Sephardi) is identical in the two settings. Reader tests 13 of 13 and model tests 6 of 6 pass.

Test runs after the changes (real repo): speak 48/48, torahread.view 6/6, torahread.data 9/9, torahreader.model 6/6, torahreader.view 13/13, trope 5/5, listen 4/4, wordtrace.logic 20/20, wordtrace.view 13/13, audio.player 13/13, accents.lanes 5/5. `node tools/meta/scan.mjs --text` passes (it scans tracked files, so this new file is only covered once tracked; it contains none of the listed names).

## 4. Diffs for files not edited (owned elsewhere)

All three code diffs were applied to a scratch copy and checked: pronunciation.transliterate, .shva, .round4, .view all 0 failures; audio.player and audio.access 0 failures; a before/after run over all 1077 distinct registry and reader words changed exactly the words named in F3 and F4.

`src/pronunciation/transliterate.js` (F3)

```diff
 const NO_GEMINATE = new Set(['א', 'ע', 'ח', 'ר', 'ה']);
+/** Cluster i+1 is a vav that acts as a vowel letter (shuruk, or vav carrying cholam). */
+const nextIsVowelVav = (clusters, i) => { const nx = clusters[i + 1]; return !!nx && nx.ch === 'ו' && ((nx.dagesh && !nx.vowel) || nx.vowel === 'cholam'); };
 ...
       else if (pv === 'segol') skip[i] = true;
+      else if (nextIsVowelVav(clusters, i)) { /* consonantal yod before a vowel-vav (hayu, not hai): leave it; the vav then supplies its vowel */ }
       else if (pv === 'kamatz' || pv === 'patach' || pv === 'cholam' || pv === 'kubutz') {
```

Result: וְהָיוּ gives vehayu (Israeli, Sephardi) and vehoyu (Ashkenazi).

`src/pronunciation/shva.js` (F4), in `classifyShvas`, after the "second of two shvas" branch:

```diff
     } else if (isShva(i - 1) && out.get(i - 1)?.na === false) {
       v = V(i, true, 'B2'); // second of two shvas in a row
+    } else if (isShva(i + 1) && i + 1 < n - 1) {
+      v = V(i, false, 'B3'); // first of two shvas in a row is silent whatever precedes it; L1-L4 do not override
     } else {
```

Result: וּבְשָׁכְבְּךָ gives uveshakhbekha / uveshokhbekho. Existing test B2 (yishmeru, nafshekha) still passes because the rule id stays B3.

`src/audio/player.js` (F2), two lines, use the caller's text when the manifest has none (Israeli setting and a Hebrew voice only, as before; other traditions still get "tts-pronunciation-mismatch"):

```diff
-    const text = (exact && exact.text) || textBy.get(`${kind}|${id}`);
+    const text = (exact && exact.text) || textBy.get(`${kind}|${id}`) || (typeof o.text === 'string' && o.text.trim() ? o.text : '');
 ...  (in planWithoutFile)
-    const text = textBy.get(`${kind}|${id}`);
+    const text = textBy.get(`${kind}|${id}`) || (typeof o.text === 'string' && o.text.trim() ? o.text : '');
```

Caution: any test or screen that relies on "unknown-item" for an id passed with text would change; none in the suites I ran. The divine name must already be sent in spoken form by the caller (torahreader does; torahread ladder passes the printed text `item.he`, so `ladder.view.js` should pass `spokenForm(item.he)`, a one-line change in its scope that I have not made because it only matters once this player diff lands).

`src/shell/router.js` and `src/shell/i18n.js` (F1), from docs/corpus/READER-ROUTE.md:

```diff
+  { name: 'torahreader', pattern: '/torahreader', module: '../torahreader/torahreader.view.js', title: 'Torah reader', owner: 'torahreader', optional: true, group: 'learn', quick: 'nav.torahreader' },
+  'nav.torahreader': 'Torah reader',
```

Then `node tools/build-precache.mjs` (not run here, per the rules) and the nav tests.

`src/speak/build.mjs` (F9): add `'shema-1'` to `PRAYER_IDS`, then rebuild data/speak. For multi-line prayers, map `lineAudio` per line (`<id>-l<n>`) in the builder and `lineClip()` in speak.js so Barchu can use its listed line ids. Not done here because it regenerates 60 set files.

## 5. Not verified

- No browser run: focus order, RTL arrow keys, screen-reader announcements, real speech synthesis and recognition.
- Respellings and trope names are program or table output, not checked by a Hebrew teacher or cantor (the screens already say so).
- Which Ashkenazi cholam value, and which stress pattern, a given community uses (F10, F11).
