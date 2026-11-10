# Vocabulary: items that need a person's judgement

The safe, mechanical fixes are in `data/vocab/corrections.json` (applied by `tools/vocab/apply_corrections.mjs`): 2 exact-duplicate records removed, 65 transliterations that lost an h restored, 2 missing transliterations filled. Nothing below was changed. Each item has my recommendation; none of the recommendations has been checked by a Hebrew reader, and glosses suggested here are mine, from general knowledge.

Counts are for the corrected `words.json` (6,303 records).

## 1. Rank holders that are probably wrong (ranks 1-100)

Frequency is counted per unpointed spelling, so a rare word can sit on the rank earned by a common one.

| rank | record | problem | recommendation |
|---|---|---|---|
| 5 | `ha3cf2c46` הִוָּה "to constitute" | spelling הוה is mostly forms of היה; the gloss is a rare sense | mark as a form of `h2cd963e3` הָיָה (rank 7) and take it out of the teaching list; `vocab5000.json` already treats it this way (`isForm`). The rank-5 slot then goes to the next word. |
| 71 | `h5c96df63` מָן "manna" | its count is the preposition מן "from"; no record for מִן "from" exists | add מִן (preposition, "from") from Wiktionary with this rank; move "manna" to the rare tail (3,000+). This is an addition, not a correction. |
| 3,164 | `h229314a3` הֱוֵא "be" | Aramaic form; shares the count of הוא "he" | form of `h1ef19acb`; drop from teaching. |
| 99 | `שָׁם` verb "to assess" | holds a slot that belongs to the adverb שָׁם "there" (rank 323) | exchange ranks with the adverb. |
| 31 | `נָבַל` verb "to wither" | rank belongs to no common word of that spelling | demote to the tail (2,000+). |
| 135, 194, 400, 362, 494 | passive verbs (חֻשַּׁב, יֻדַּע, דֻּבַּר, נוֹסַף, הוּסַף: "to be calculated/informed/spoken/added") | inherit the rank of the active verb | rule for the build: pu'al and huf'al entries get the base verb's rank plus 1,000. |

Also in the top 100, shared-spelling cases where the rank holder is right but the others are inflated (these are the 1,695 `homograph` rows; the deck builder already pushes later senses back by x3): אֵת "shovel" (1,419), עֹל "yoke" (403), רֹק "saliva" (481), אֹמֶר (833), אֵם "mother" (443; plausible, keep), אִישׁ pron "anyone" (405). Recommendation: do this in the build for all of them (second and later senses of a spelling: rank x3, or a per-record `rankShared` flag) instead of by hand.

## 2. Glosses (251 records flagged `gloss-machine`)

Suggested replacements for the most frequent (rank order). "Keep" means the gloss is a correct but passive/stative sense and should simply be taught later.

| rank | record | now | suggested |
|---|---|---|---|
| 1 | אֵת | used to introduce a semantically definite direct object | (marks a definite direct object; not translated) |
| 13 | שֶׁל | of, belonging to, owned by, pertaining to | of; belonging to |
| 75 | סֵדֶר | Order, the state of being well-arranged, ... | order; arrangement (also the Passover seder) |
| 102 | יָשַׁב | to sit, to be in a position with the torso upright ... | to sit; to live (somewhere) |
| 169 | אֹהֶל | a collective term for all that covers a dead body ... | tent (the shown sense is a technical ritual term) |
| 192 | הֵבִין | to understand, to have understanding, to be one who understands | to understand |
| 209 | הִפְסִיק | to stop, to cease, ... (See usage note below.) | to stop; to interrupt |
| 218 | עָצַר | to stop, ... (See usage note below.) | to stop; to halt |
| 251 | דָּאַג | to worry (about something), to be concerned (about something) | to worry |
| 473 | פֶּן | lest, [[[in order that\|in order]]] that ... not, for otherwise | lest; in case |
| 554 | פָּחַד | to fear, to be scared, afraid, frightened of ... | to fear; to be afraid |
| 626 | בִּלְתִּי | not, except, without, unless, ... | not; except; without |
| 709 | נִפְגַּשׁ | to meet (with someone), to have a meeting ... | to meet (with someone) |
| 815 | אִכְפַּת | used to indicate someone's care or concern ... | (it) matters; (one) cares |
| 850 | חֹמֶר | a homer, a former Hebrew unit of dry volume | material; substance (the shown sense is a measure) |
| 863 | אָמֵן | used to express agreement ... | amen |
| passive "to be X-ed" (135, 194, 362, 400, 494, 783 ...) | | | keep the gloss; see section 1 rule |

Apply as `overrides` in the build (so a rebuild keeps them), not by editing `words.json`.

## 3. Nouns missing a gender (6)

| record | now | recommendation |
|---|---|---|
| `h876d966b` הָעֶרֶב | noun, "this evening, tonight" | it is "the evening" (article attached); make it an adverb/phrase "this evening; tonight", no gender |
| `h7fa2d998` כָּאן | noun, "here" | an adverb; the adverb record (rank 35) exists, so remove this one as a duplicate sense |
| `h0c27cdd3` אַל | noun, "naught, nothing" | rare literary; masculine; tail |
| `hfcd86a18` הַב | noun, "woof" | interjection |
| `h79986a16` שׁוּם | noun, "Name, sake, purpose, cause" | wrong sense; the everyday meaning is "garlic" (masculine); also שום "any" in שום דבר. Needs a native check. |
| `h085098ab` עֲבֻדָּה | noun, "a staff of servants" | everyday meaning "fact" (feminine); the shown sense is a rare biblical one |

## 4. Intentionally unpointed items (2)

`p7cb5e293` יהוה and `pfcc78ea6` אדני come from lesson r34, which teaches reading these words unpointed, so the lack of niqqud is the point. Pointing them would duplicate `p6584b7dc` יְהוָה and `p996ad12f` אֲדֹנָי. Recommendation: keep unpointed, record that in `flags.reasons` ("intentionally unpointed: lesson r34") so the `no-niqqud` lint can exempt them. Only their missing transliteration (adonai) was filled, because the lesson glosses say how they are read. This differs from the original brief, which listed them as a niqqud fix.

## 5. Other flagged groups

- 113 records with `pos: unknown` (26 phrasebook words, 87 lesson words): assign a part of speech from the lesson context; not inferred automatically.
- 420 `dup-spelling` (same spelling and POS, different pointing): mostly legitimate (kal vs pi'el, ktiv haser variants); review the 32 with rank under 400 first.
- 820 nouns without a plural and the 837 gender/plural rule rows: `docs/vocab/review/gender-plural-rules-*.csv`; irregular plurals and duals (עיניים, ערים) need a person.
- The two removed duplicates (שֵׂעָר, אִגְרוּף) each had a different Tatoeba example sentence; the removed record's sentence is gone with it.
- No record has a per-record licence field: add `license` in the next build from `data/vocab/attribution.json` (see `data/vocab/LICENSE-NOTES.md`).

## Addendum (2026-11-04): offensive or wrong English glosses, divine-name spellings

Scan: a word list (profanity, slurs, sexual terms, ethnic and disability terms, Jehovah/Yahweh/YHWH) over `en`, every `alt` and the example sentence of all 6,303 records of `data/vocab/words.json` (packs and index are copies). Changes are 35 appended entries in `data/vocab/corrections.json` (fields `en`, `alt`, `flags.hidden`, `example`), applied by `tools/vocab/apply_corrections.mjs`, which now also updates the `en` column of `index.json`. `tools/vocab/deck_order.mjs` and `tools/vocab/theme_packs.mjs` skip records with `flags.hidden`. Nothing here is a native review; every row stays unreviewed.

Gloss replaced with a neutral one (meaning certain from the record's own other senses or the gloss itself):
- `h31ff5eef` debili: "Retarded, mentally defective" -> "Pointless, foolish" (its own second sense).
- `h8ea4d152` la'azazel: "Damn!, Hell!" / alt "Screw him/her/it!" -> "an exclamation of anger or dismissal (a mild curse)" (pos is interjection).
- `hae4935f7` nakheh: "a cripple" -> "a person with a disability".
- `h950879c7` tzo'ani: "Gypsy" -> "a Romani person".
- `h4f80908c` nanas: "midget, dwarf" -> "dwarf"; `hc208e546` gamad: alt "midget" removed.
- `h01cd8c45` kushi: alt "negro, Black" -> "Black"; `hefbbc2c7` zonah: alt "slut" removed (gloss already says prostitute).
- `h786538b1` mamzer: "mamzer, bastard" -> "mamzer"; `hefc2e447` chakhemolog: "wise-ass" dropped; `h34d7fae2` chirben: "to fuck something up" dropped.

Suppressed (gloss and meaning not certain from the record): `h974f415a` mizdayen ("fucking, retarded") and `h8e35f713` zayan ("fucker (one who has a lot of sex)"): `flags.hidden` true, gloss set to "slang (gloss withheld pending review)", left out of the deck order and the theme packs. They remain in words.json, packs and index (ids stay stable); the Vocab list view in `src/vocab` does not yet honour `flags.hidden` (not my files), so they can still appear in lists built from index.json until that view skips them.

Example sentences removed (Tatoeba lines with profanity, a slur or a vulgar remark, `example` set to null): h8ea4d152, h5ba22cfa (dafak), h520d496c (piger), hf7d0fb03 (ziyen), h8e35f713, hefbbc2c7, h974f415a ("I fuck God"), h14a9ec93, h549846fd, h34d7fae2, h3b306d6b, h4f80908c, hc208e546, h786538b1, h9bb1d8c2, h161176d0, h84a3a6b3, h950879c7.

Left as they are, listed for a human decision: clinical or legal sexual vocabulary (shakhav, tachan "to have sex", ones/anas rape, baal, min/mini, seksi, hatradah, avaryan and their examples), shemok "schmuck" (vulgar, needs a register label), goy / goyah (neutral in Hebrew, contested in English), gever alt "cock" and darakh "to cock" (legitimate senses), fishel "screw up", and examples "sexy legs" (regel, seksi), "Same-sex couples" (mini).

Jehovah / Yahweh spellings in glosses: `ha3cf2c46` hivah example "Jehovah's Witnesses are known for their door-to-door preaching." (kept, a proper name, flagged); `hd92218f1` tanin alt "an enemy of Yahweh or Israel" (kept as a gloss; docs/sensitivity/CONVENTIONS.md judges it acceptable). No other gloss contains them.
