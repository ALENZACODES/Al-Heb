# Memory chain audit (data/letters/memory-chain.json, 27 forms)

Status: DRAFT, independent read. Not checked by a native or fluent reader. Audited at 19:34 local; chain JSON last written 19:07, picture files last written 19:24.

## What was run

- Per form: the example word and pointing looked up by id in data/vocab/words.json (gloss, rank, part of speech, flags); respell() for israeli, sephardi and ashkenazi; the hook compared with the `english` line of each tradition in data/pronunciation/consonants.json; story length and contents (hook, transliteration, gloss); letter name against the app convention.
- Pictures: all 27 SVGs in assets/letters/morph rendered in a headless browser to one sheet and looked at; `build_morph_sheet.mjs --check` (all 28 files follow the contract); picture title read from each SVG and compared with the chain `picture.alt`.
- Tests: node --test tests/review*.test.js tests/letters*.test.js: 266 pass, 0 fail. The full unit tier shows 3 failures outside letters and review (shell/tradition re-export, views.generated.js precache listing, precache vendor test).
- Not done: no audio; the sensitivity data was only searched for the 27 word ids (no hit; no word has flags.hidden); no native reading.

## BLOCKING

B1. The pictures no longer match the chain. 13 of 27 SVGs show a different concept from the chain `picture.idea` / `alt` / `story`, so the story and the picture tell different things:

| form | SVG now shows | chain says |
|---|---|---|
| yod | lit candle | hand flicking a yo-yo (hook yo-yo, word yad) |
| kaf | horseshoe magnet | spoon with a kernel (hook kernel) |
| mem | mailbox with a letter | tent, glass of water (hook mom, word mayim) |
| samekh | striped lifebuoy | cushion, person sitting, book (hook sit) |
| ayin | carrot | winking eye (hook eye, word ayin) |
| pe | pac-man style chomper with three dots | mouth blowing a bubble |
| nun-final | cat stretched out long | tall nail in a stone |
| tsadi-final | cat stretching, arms up | Y-branched tree with cats |
| lamed | lamp lighting short letters | lamp over a loaf of bread |
| nun | cat asleep (no box, no candle in view) | cat in a box beside a candle in a jar |
| zayin | zipper pull on an open bag | zipper pull on a jacket |
| tet | teapot (telephone not visible) | teapot with telephone |
| chet | gate with cat (no milk) | gate, cat, saucer of milk |

The picture must show the hook and the word's meaning, or the story is false. Either regenerate the chain from the pictures or redraw. Severity: blocking. Owner: chain/pictures lane.

B2. Ayin picture (carrot) shows neither the hook nor the word (eye). Sub-case of B1 but the worst: a learner reading "eye" sees a carrot.

B3. Pe picture is a round yellow body with an open wedge mouth chasing three dots. That reads as a well-known video-game character. Rule: no characters or brands. Blocking until redrawn.

B4. Chet hook "Chanukah" starts with h for many English speakers, the same sound as he's hook "hey". The two hooks collide for those listeners, and the pair (gate with cat vs hut) are also look-alike letters. Suggest a hook without that risk, or state the scrape in the hook itself. Severity: high (teaching-correctness); native question added.

## Sound check (hook first sound vs letter, per tradition)

Method: consonants.json `english` line per tradition; respell() of the example word.

- Same in all three: bet, gimel, dalet, he, vav, zayin, tet, yod, kaf, lamed, mem, nun, samekh, pe, qof, shin, tav, mem-final, nun-final, pe-final, tsadi, tsadi-final, kaf-final.
- Alef (uh-oh) and ayin (eye): both are vowel-only hooks for a silent letter, so there is no first consonant to compare. Ashkenazi alef/ayin silent matches; the hook word starts with a vowel in all three.
- Mismatches (all disclosed in perTradition, none hidden):
  - chet, sephardi: consonants.json gives pharyngeal [ħ]; Chanukah / Bach is the Israeli value. Medium.
  - ayin, sephardi: pharyngeal [ʕ]; hook eye is silent. Medium.
  - resh, all three: round is the English r, which is not the Hebrew sound in any tradition. Disclosed as a spelling cue only. Medium: the hook does not "equal the sound" in any tradition.
  - tsadi: hook pizza has ts in the middle, not first. Disclosed (hookPosition medial). Low.
  - tav, ashkenazi: undotted tav is s; the example has a dagesh, so t is true for the word only. Low; disclosed.
  - kaf-final: hook Bach is a name; many speakers say it with a k, which is the dagesh sound, not final kaf. Medium. The perTradition line copies a consonants.json sentence that reads oddly ("k with dagesh") for the no-dagesh sound; native question.
- Engine: respell() gives identical israeli and sephardi output for every word (engine limitation; chet/ayin do not differ there). Ashkenazi differs only in vowels and final t/s: aba/abo, bayit/bayis, gamal/gomol, delet/deles, vav/vov, zahav/zohov, chalav/cholov, yad/yod, ner/neir, sefer/seifer, shalom/sholom, yam/yom, etz/eitz. None changes the first (or last, for finals) consonant.

## Word check

- All 27 words found by id in words.json; pointing identical to the chain; noun; none hidden; no divine name; max rank 1318 (nun, ner), then 1302 (tzipor), 1139 (chalav), 905 (gamal); all within 1500.
- Gloss: yod word yad is "arm" in the record with "hand" only as an alternative; the chain says hand (disclosed in risk). Low. Dalet, he, zayin, kaf, tet, nun, tsadi, tav chain glosses are shortened from the record and still agree.
- mem word (mayim): record pointing came from the phrasebook, not Wiktionary; flagged "not native-reviewed". Medium for a native pass.
- Several records have needsReview true (homograph flags): gimel, chet, lamed, samekh, pe, shin, kaf-final, nun-final, pe-final, mem. Low; listed in each risk line.
- Vav's word is the letter's own name (hook) and ayin's is the letter's own name (eye): acceptable but circular for the "seal" beat. Low.
- Not scanned: Hebrew-side senses a keyword list cannot see.

## Hooks (plain English, safe)

- Plain words an adult knows: all except uh-oh and shh (interjections, fine), Chanukah (a holiday name, see B4), Bach (a surname), yo-yo (generic now; ok), zipper (generic now; ok).
- No brand or character in any hook. The only look-alike risk is the pe picture (B3).
- Imagery: no weapons, nothing religion-offending found. Notes: gimel grumpy camel (possible regional stereotype, already a native question); zayin letter name has a slang meaning (picture is clean); a candle near a cat (nun, per chain) is a fire-safety image for children, keep them apart; shin birthday cake with flames is fine.
- Body-shaming: none seen. Pe-final "long tongue" and final nun/tsadi "stretched" cats are odd but not shaming.

## Does the picture resemble the letter (from the rendered sheet)

Good: alef (handstand), bet, dalet, he, vav, zayin, chet, tet, lamed, mem (mailbox arch), nun, samekh (ring), qof (kite with the letter over it), resh, shin, tav, kaf-final, mem-final, tsadi.
Weak: gimel (letter strokes and camel overlap and are hard to separate); kaf magnet (resembles the shape but not the hook); ayin carrot (shape is close, concept is wrong); pe chomper (see B3); nun-final and tsadi-final cats (stretched cat does not obviously give the letter form; the Y arms of tsadi-final do read); pe-final (mouth not visible; a seed or feather and sound marks only).
Style: two art styles are mixed (some with heavy dashed outline on grey, some flat navy and orange, finals on grey rounded tiles). Low.

## Confusable pairs

- he / chet: both are a house-like frame with a cat or person; plus the hook clash B4. High.
- nun / nun-final / tsadi / tsadi-final: four cats across the set (nun, chet, tsadi, tsadi-final) and a cat as final nun. Pictures of nun, nun-final and tsadi-final are three near-identical stretched or curled cats. High: unclear which cat is which letter.
- bet / kaf, kaf / pe, qof / kaf, vav / zayin / yod / nun-final, dalet / resh, samekh / mem-final: the pictures differ (house, magnet, kite, vine, zipper, candle...); phonetic pairs kaf/qof (both k) and tet/tav (both t) are by design.
- pe / pe-final and mem / mem-final: same concept in two states (by design).
- Hooks: tet "tea" vs tav "table" start with the same sound (the two t letters), expected.

## Letter names

Alef, Bet, Gimel, Dalet, He, Vav, Zayin, Chet, Tet, Yod, Kaf, Lamed, Mem, Nun, Samekh, Ayin, Pe, Tsadi, Qof, Resh, Shin, Tav and Final Kaf / Mem / Nun / Pe / Tsadi match the convention in LETTERS-CONTENT-CHECK.md. Stories contain the hook, the transliteration and the gloss; all are 14 words or fewer. Nothing to fix.

## Owner lane

I could not resolve an agent id for the chain owner, so no message was sent; B1 to B4 are listed in my report to the main session.

## Review pack

Added reviewer question `chain-hook-collisions` to tools/review/questions.mjs (CHAIN_GENERAL_QUESTIONS); packs and packet rebuilt in full (no --only).

## Second pass, 2026-11-04 (after the reconcile lane)

Status: DRAFT, independent read, no native or fluent reader. Chain JSON last written 19:47; RECONCILE.md last written 19:45; both unchanged for more than 5 minutes when audited (about 19:58). The redraw lane was still writing SVGs (gimel 19:52, chet 19:54; yod, kaf and others not yet redrawn), so picture findings below are about files as they stood, not the final art.

Run: respell() in israeli, sephardi and ashkenazi for all 27 words; consonants.json `english` line per tradition against the chain `perTradition` text; words.json lookup by vocabId (en, rank, pos, flags); picture alt compared with the SVG `<title>`. Tests: node --test tests/letters*.test.js tests/review*.test.js gave 272 tests, 268 pass, 3 fail, 1 skipped. The failures are letters.morph tests ("letter strokes are kept in picture B" for gimel and chet; "stroke path missing from layer A" for alef) on SVGs being rewritten at the time; the set of failing letters changed between two runs, so treat as redraw in progress, not a data fault. Not run: audio, native reading.

### New or changed hooks (nine): sound check

| form | hook | position | first sound = letter? | israeli / sephardi / ashkenazi | note |
|---|---|---|---|---|---|
| he | hut | initial | yes (h) | all same | clean. consonants.json: h, silent at word end. |
| kaf | cup | initial | yes (k) | all same | true for the dotted kaf (the word has the dot); the undotted sound is kh. Disclosed by the line. |
| mem | mailbox | initial | yes (m) | all same | "mailbox" is North American; UK/Australian readers say postbox or letterbox but still read the m. Low. |
| samekh | swim ring | initial | yes (s) | all same | two-word hook; "swim ring" is common in UK/Australia, less so in US/Canada (pool float). First sound still s. Low. |
| shin | shortcake | initial | yes (sh) | all same | North American dessert name; UK readers read it as shortbread-like but sh is still first. Low. Picture is a cake with flames, SVG title still says "birthday cake". |
| pe-final | feather | initial | yes (f) | all same | f is the dagesh/final sound; fine. |
| chet | loch | FINAL | NO: first sound is l (lamed's sound) | israeli same, ashkenazi same, sephardi differs (disclosed, matches.sephardi false) | see H1. |
| kaf-final | loch | FINAL | NO: first sound is l | all same (kh) | see H1. |
| tsadi-final | nuts | FINAL | NO: first sound is n (nun's sound) | all same (ts) | see H2. |

Unchanged hooks re-read for English-variant risk: tea (tet) and table (tav) fine in all four Englishes; round (resh) is a spelling cue only and is disclosed; mom (mem-final) vs mum is harmless since only the m is claimed; kite, dive, lamp, nap, nail, vine, zipper, pizza (medial ts, disclosed), yo-yo all start with the claimed sound. Gone: Chanukah and Bach (former B4 and the Bach k/kh risk are resolved by the reconcile lane, but see H1).

### Findings

H1. "loch" for chet and kaf-final. (a) It is a final-position hook, so a reader hears l first, which is lamed. (b) Many US, Canadian, Australian and English readers say loch as "lock" (k). For chet that is wrong in every tradition (chet is never k), and for kaf-final it gives the dagesh sound instead of the final-kaf sound. The risk lines already say "teach the scrape, not the k" and the chet line says "Not lock", so this is disclosed; it is a weaker teaching hook than the old one in one way (a Scots word with no English spelling cue). Chet and kaf-final now share one hook word by design. Severity: medium. Suggest a native or teacher question, and that the first screen show the sound spelled "kh/ch (scrape)" beside the word. Not a mechanical fix.

H2. "nuts" for final tsadi. First sound n collides with the nun hooks (nap, nail); the claimed sound is the final ts. The chain does mark hookPosition final and the line says "TS like the end of nuts". "Nuts" also has a slang sense in English; it is harmless here but a plainer hook (the cats it replaced were an image problem, not a sound one) could be chosen. Severity: low to medium. Not mechanical.

H3. Chet sephardi stays "Differs" (pharyngeal) and the chain says so; unchanged from first pass, not a regression.

H4. Gloss versus vocab record for the changed words: yod word yad now "arm", which equals the record's `en` (hand is only an alternate): matches, and the first-pass gloss mismatch is closed. All 27 chain glosses agree with the record `en` (shortened for dalet "door", he "mountain", zayin "gold", kaf "palm" from "palm, paw", nun "candle" from "oil lamp, candle", tet "telephone", tsadi "bird", shin "peace"). Hand is the common beginner meaning of יד; arm-first is the record's order. Flag for a native pass, low.

H5. Words: all 27 found by vocabId, all nouns, none hidden, no sensitive flag, no divine name (checked word, hook and story text). Max rank 1318 (ner), under the 1500 cap. Words with needsReview true in the record: chet (chalav), lamed, samekh, shin, kaf-final, nun-final, pe-final (homograph flags), and mem (mayim: phrasebook-sourced, pointing and gloss not native-reviewed; also plural-only). Each is listed in that form's risk line. No change from first pass.

H6. Respellings (engine): israeli and sephardi identical for every word (engine limit, so the chet and ayin sephardi difference is not visible in respell). Ashkenazi differs only in vowels and final t/s: abo, bayis, gomol, deles, vov, zohov, cholov, yod, neir, seifer, sholom, yom, eitz. None changes the first (or last, for finals) consonant, so the hook claims hold. The builder's storyByTradition applies these correctly (checked for all 27).

H7. Picture text still disagrees with the chain for forms not yet redrawn or retitled (this is the art lane's list in RECONCILE.md, not a new problem): yod SVG title "lit candle" (chain: hand flicking a yo-yo), kaf "horseshoe magnet" (chain: cup), chet title "closed garden gate" (alt adds loch and milk), shin "birthday cake" (alt: shortcake), kaf-final title has no loch, nun-final/pe-final/tsadi-final/mem-final titles lag the new alt (no mom, nuts or feather named in some). Re-check after the redraw lane posts its final STATUS line.

Mechanical mismatches between the chain, consonants.json, the engine and words.json: none found, so no message was sent to the reconcile lane. H1 and H2 are judgement calls and are listed here and in the report only.
