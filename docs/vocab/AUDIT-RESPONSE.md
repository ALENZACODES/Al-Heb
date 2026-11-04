# Response to the 2026-11-04 vocabulary audit (Class 1)

Scope: the mechanical defects listed in the audit of `data/vocab/vocab5000.json` and `data/vocab/words.json`. Everything below was done by editing the build inputs (`data/vocab/overrides.json` for the 5,000-word build, `data/vocab/corrections.json` for `words.json`) and rebuilding; nothing was hand-edited in a generated file. No Hebrew text or pointing was written: every Hebrew string in the data is still a copy of a Wiktionary headword or of an existing repo record. No entry is proofread; every row stays `proofread: false`. This is not a native-speaker review.

Rebuild sequence used: `node tools/vocab/apply_corrections.mjs` -> `python3 -I tools/vocab/build_vocab5k.py` -> `node src/vocab/split-tiers.mjs` -> `frequency.mjs`, `theme_packs.mjs`, `deck_order.mjs`, `attribution.mjs`, `review_pack.mjs` -> `tools/pronunciation/build_{derived,variants,pages,runtime,minimal_pairs}.mjs` -> `tools/audio/build_manifest.mjs` (+ the `--write` doc generators) -> `node src/speak/build.mjs`.

## Item by item

### 1. Rank 937 מֶרְץ glossed "march"

Checked against the Wiktionary snapshot the build uses (`tools/vocab/.cache/kaikki-hebrew.jsonl`, page מרץ). It has two entries with different pointing: the proper noun **מֶרְץ** (merts) = "March (the third month of the Gregorian calendar...)", and the noun **מֶרֶץ** (mérets, segolate) = "energy, vigour, forcefulness, liveliness", tagged dated. The entry at rank 937 is the curated-core month (topic Months, `curatedCore: true`), its pointed form is מֶרְץ, and that pointing means March, not energy. So the audit's proposed gloss "energy, vigour" would attach the wrong word to this pointing; it was not applied. The real defect is capitalisation: `clean_gloss()` in `build_vocab5k.py` lower-cases a leading capital when the same word occurs in lower case anywhere in `words.json`, and "march" does. Fix: override `v9e04887c` gloss -> **"March (month)"**. The "energy" noun מֶרֶץ is not in the 5,000 and was not added.

### 2. The three unpointed entries (ranks 604, 711, 827)

`words.json` has no record spelled עכשיו, יום שישי or שחור. It does have the defective (ktiv haser) spellings of two of them: `hcb5a058a` עַכְשָׁו "now" and `h8dd44157` שָׁחֹר "black", which are also in the 5,000 as separate entries (rank 55 עכשו and rank 3499 שחר). Their pointed forms were **not** copied onto the plene entries: `tests/vocab.schema.test.js` requires (pointed form, POS) to be unique, and the pair would collide; the build would also give both the same id. Done instead:

- **עכשיו (v66f62b1a)**: marked `isForm: true`, `formOf: v994abac9` (rank 55, pointed עַכְשָׁו, same gloss). `lemmasOnly()` skips it when teaching, so the learner meets "now" only as the pointed entry. Still `pointed: null`, `needsPointing: true`.
- **שחור (vba010668)**: left as is. Its pointed twin שָׁחֹר sits at rank 3499 (tier 5000), so marking the beginner entry as a form would push "black" out of the first 1,000. Needs a decision by the maintainer (swap the two or point this one) that the data cannot make.
- **יום שישי (vdf2737fe)**: no pointed record of the phrase anywhere in the repo; left unpointed and flagged.

Listed in `data/vocab/audit-baseline.json` under `null-pointed` (3).

### 3. Sixteen glosses containing Hebrew text

Fifteen were hand overrides whose author put the prefix form or an example into the gloss; one (כחול) was raw Wiktionary text. The English part stands alone in every case; the Hebrew was removed (the headword already shows the form). Before / after:

| id | lemma | before | after |
|---|---|---|---|
| `v32e7afd6` | ל | to, for (prefix לְ־) | to, for (prefix) |
| `vaa2ad51d` | הוה | is, are (present-tense form of היה, to be) | is, are (present-tense form of 'to be') |
| `v3bc64373` | יש | there is, there are; (with ל־) to have | there is, there are; (with the prefix 'to') to have |
| `vb985a686` | ב | in, at, with (prefix בְּ־) | in, at, with (prefix) |
| `v67b1e365` | אין | there is not, there are not; (with ל־) to have no | there is not, there are not; (with the prefix 'to') to have no |
| `vab6cd0ee` | מ | from, of (prefix מִ־) | from, of (prefix) |
| `v140214c2` | ש | that, which, who (prefix שֶׁ־) | that, which, who (prefix) |
| `v77777be8` | ה | question prefix הֲ־ (formal yes/no question: "is it...?") | question prefix (formal yes/no question: "is it...?") |
| `ve441aade` | עשר | ten (used in 11-19, e.g. אחד עשר = eleven) | ten (used in 11-19) |
| `v1b6856e4` | ו | and (prefix וְ־) | and (prefix) |
| `veac5df72` | פי | times (multiplier, e.g. פי שניים = twice as much) | times (multiplier, as in 'twice as much') |
| `v1feb4208` | ד | that, which, who (prefix דְּ־; Aramaic-style, rare) | that, which, who (prefix; Aramaic-style, rare) |
| `v2aae2e95` | פרק | park (usually spelled פארק) | park (loanword; usually spelled with an alef) |
| `v0b96c869` | אי | not, un-, non- (negating prefix, as in אי־אפשר "impossible") | not, un-, non- (negating prefix) |
| `vb667e8ae` | הוא | be! (rare imperative of היה) | be! (rare imperative of 'to be') |
| `v7ba41398` | כחול | blue, a darker shade than תְּכֵלֶת (tchélet) | blue |

`hebrew-in-gloss` is now 0 and the test fails if one comes back.

### 4. סַנְדָּק "sandek"

`words.json` `h1782f762` `en` -> "sandek (the person who holds the baby at a circumcision)" (`corrections.json`), restating its own alt "a godparent" as the specific role; the alt is kept. The 5,000 build strips long parentheses from `words.json` glosses, so override `vd5c1fc73` sets the same text there.

### 5. שׁוּם and מְלָפְפוֹן

Both records already carried the everyday sense as an alt. `corrections.json` swaps gloss and alt, nothing added: `h79986a16` "Name, sake, purpose, cause" / ["garlic"] -> "garlic" / ["name, sake, purpose, cause"]; `hd91e4a26` "Armenian cucumber, vegetable melon" / ["cucumber"] -> "cucumber" / ["Armenian cucumber, vegetable melon"]. The rebuilt 5,000 picks these up from `words.json` (rank 4692 "garlic", re-topiced Society -> Food by the head-noun rule; rank 4815 "cucumber"). Note the rank-512 homograph שׁוּם "some, any" (det) is a different record and unchanged.

### 6. הִשְׁתּוֹחֵחַ transliterated "hishtochecha"

Regenerated with the repo's own transliterator (`transliterate(he, {scheme:'siddur', tradition:'israeli'})` from `src/pronunciation/transliterate.js`): it returns **"hishtochecha"**, the stored value. The stored string is therefore the scheme's output, and the defect is in the scheme: a word-final chet with patach (furtive patach, פתח גנובה) is written "-cha" instead of "-ach" (רוּחַ -> "rucha", כֹּחַ -> "kocha", הִצְלִיחַ -> "hitzlicha"). Final ayin is handled ("lishmo'a"); the IPA path already knows the rule (`tests/pronunciation.variants.test.js`, רוּחַ). **94 `words.json` records** are affected (check `furtive-patach-translit` in `audit_checks.mjs`; all 94 are in the baseline). Not changed here: `tests/vocab.corrections.test.js` requires every stored translit to equal the scheme output, so the fix belongs in the transliterator (pronunciation lane), after which `apply_corrections.mjs --generate` style regeneration and a baseline rewrite remove the 94 hits.

### 7. Listed for native review, no change

| rank | entry | audit's suggestion | why not changed |
|---|---|---|---|
| 1032 | לִקְרַאת, prep, "to meet" | "toward, in anticipation of" | Wiktionary/`words.json` give "to meet" with alt "opposite" only; the suggested sense is not in the source data |
| 3959 | בֻּזָּה, verb, "to be degraded, to be despised, to be abused" | drop "to be abused" | the gloss is the source's; cutting a sense is a judgement call |
| 429 | תִּוֵּךְ, verb, "to mediate" | rank reflects the spelling תוך, not this verb | already tagged `rare-sense` and cross-referenced via `sameSpelling`; no common competitor with the same lemma to swap with (METHOD.md, rank swaps) |

Also for review: the 62 duplicate (lemma, pointed) groups (Wiktionary POS splits such as כָּאן adv/adj/noun at ranks 37/2125/2126) and the 27 `circular-gloss` hits that remain after סנדק: most are loanwords where gloss = transliteration is correct (bank, virus, robot, sushi...), but גאון "Gaon", עמר "omer", חצפה "chutzpah", שיך "sheikh", נקוד "nikud", בלבול "bulbul", הא "ha!" are transliteration-as-gloss and deserve a plain English gloss. All keys are in the baseline.

### 8. Automated sweep

`node tools/vocab/audit_checks.mjs` reproduces the audit's full-set checks plus the furtive-patach check: `null-pointed` 3, `hebrew-in-gloss` 0, `verb-gloss-form` 3 (ranks 5, 18, 3198, benign as the audit found), `duplicate-lemma-pointed` 62 groups, `circular-gloss` 28 -> 27 plus the fixed סנדק no longer counted, `furtive-patach-translit` 94. Known hits are recorded in `data/vocab/audit-baseline.json` (keys are entry ids or `lemma|pointed`, so rank shifts do not disturb it). `tests/vocab.audit.test.js` fails on any hit outside the baseline, on a stale baseline entry, and if any of the fixes above regress. `--write-baseline` rewrites the file after a deliberate fix; `--check` is the command-line form of the test.

## Found on the way

- The committed `vocab5000.json` was stale against `words.json`: the sensitivity lane's gloss corrections (`corrections.json`, 2026-11-04) had not been rebuilt into the 5,000 (rank 168 still read "damn!, Hell!", 2675 "midget, dwarf", 4943 "Gypsy", etc.). The rebuild carries them in. Two records the sensitivity lane hid (`h974f415a` מזדין, `h8e35f713` זין) have the gloss "slang (gloss withheld pending review)" in `words.json`; the 5,000 build does not read `flags.hidden` and would print the bare word "slang". Overrides `v86404c39` / `v73a6f0a9` set the gloss "(slang; gloss withheld pending review)", tag `needs-check`, and `flags: {hidden: true}`; `build_vocab5k.py` now copies a `flags` object from an override and `split-tiers.mjs` keeps `flags` in the tier packs, so `src/vocab/loader.js` drops both records from every list. Ranks were not changed. A better fix is for the build to skip hidden records (it shifts ranks below 1152 by one and below 3823 by two; not done here).
- Rank 4943 צועני was lower-cased to "romani person" by the same capitalisation rule as מרץ; override `vc8d62cea` restores "Romani person".
- The committed pronunciation, audio and attribution outputs were also stale against their builders (they still carried wording the builders no longer emit); regenerating them is why those files changed in this pass.
- `tools/hebrew-lint/baseline.json` was rewritten with `--update-baseline`: one key moved (`describing-words-set03.json .words[95]` -> `[94]`, same word, same pre-existing finding) after the theme packs were regenerated, and resolved audio-manifest entries dropped out. No new Hebrew finding was baselined.
