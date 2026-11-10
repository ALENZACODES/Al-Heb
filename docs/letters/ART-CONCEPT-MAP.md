# Art concept map (DRAFT)

Status: DRAFT. Nothing here has been seen by a Hebrew teacher or a designer. Data: `data/letters/art-concept-map.json` (this page is a reading copy). Checked by `tests/letters.artconcept.test.js`.

One row per letter: the approved picture concept (`data/letters/memory-chain.json`, art in `assets/letters/morph/`), the older concept in `data/letters/mnemonics.json`, the older art prompt in `tools/images/spec.mjs` (files in `assets/img/gen`), and what to do. The agreement columns compare prompt words only. No picture was opened.

Status: **keep** = nothing older conflicts. **retire** = an older concept conflicts; displayed text was rewritten where needed, art stays on disk; visibility follows each image approval. **needs decision** = a person must choose. No asset was deleted.

| # | Letter | Approved concept (chain) | Older mnemonic text | Older art prompt (agreement) | Morph SVG | Older art in app | Status |
|---|---|---|---|---|---|---|---|
| 01 | alef | A silent mime in a handstand. The handstand body is the letter. | same | Ox head (differs) | alef.svg | per-image approval | **needs decision** |
| 02 | bet | A bungalow seen from the side with a ball inside; the floor sticks out at the back. | same | Bed inside a house (differs) | bet.svg | per-image approval | **retire** |
| 03 | gimel | A grumpy camel stomping forward, one foot kicked out ahead: the foot is gimel's foot. | same | Giraffe mid-stride (differs) | gimel.svg | per-image approval | **retire** |
| 04 | dalet | A diving board sticking out from one post over a pool. | same | Door frame (differs) | dalet.svg | per-image approval | **retire** |
| 05 | he | A small hut on a mountain with a gap in the left wall. | same | House with an open window (partial) | he.svg | per-image approval | **keep** |
| 06 | vav | One straight vine hanging from a hook: the letter is the vine, the hook is the ceiling hook. | same | Vine on a stake (same) | vav.svg | per-image approval | **keep** |
| 07 | zayin | A zipper pull on a zipper with gold teeth: a short bar on top and a straight stem down. | same | Zipper pull (same) | zayin.svg | per-image approval | **keep** |
| 08 | chet | A closed gate at the edge of a loch (a lake), with a jug of milk standing at the gate. | changed here (was: closed garden gate with a hissing cat behind it) | Hut doorway (differs) | chet.svg | per-image approval | **retire** |
| 09 | tet | A round teapot full of tea, its top curling inward. | same | Teacup with a curled handle (partial) | tet.svg | per-image approval | **keep** |
| 10 | yod | A tiny hand at the top of the line flicking a yo-yo on its string. | same | Yo-yo on a short string (same) | yod.svg | per-image approval | **keep** |
| 11 | kaf | A cup lying on its side: the C-shape is the letter. | changed here (was: kitchen spoon holding a popcorn kernel) | Cupped palm (differs) | kaf.svg | per-image approval | **retire** |
| 12 | lamed | A tall lamp post with a bent arm reaching high, lighting the ground below. | same | Lighthouse / shepherd's staff (differs) | lamed.svg | per-image approval | **retire** |
| 13 | mem | A mailbox on a post with a letter sticking out and a small flag. | changed here (was: camping tent with its door flap open) | Mountain over water (mayim) (differs) | mem.svg | per-image approval | **retire** |
| 14 | nun | A cat curled up asleep, side view, with a Z for its snore. The only cat picture in the set. | same | Nail bent at the top (differs) | nun.svg | per-image approval | **retire** |
| 15 | samekh | A striped swim ring floating on water: the closed ring is the letter. | changed here (was: soft round cushion with a person sitting on it) | Sun (differs) | samekh.svg | per-image approval | **retire** |
| 16 | ayin | A big open eye: the sweeping lid curve is the letter. | same | Eye (ayin) (same) | ayin.svg | per-image approval | **keep** |
| 17 | pe | A wide-open mouth blowing one big bubble, the curl inside the letter being the tongue. | same | Pie in an open mouth (partial) | pe.svg | per-image approval | **keep** |
| 18 | tsadi | A slice of pizza with a bird perched on the pizza box; the leaning body is the letter. | changed here (was: cat sitting upright with pointed ears, beside a pizza slice) | Cat sitting (ts of 'cats') (differs) | tsadi.svg | per-image approval | **retire** |
| 19 | qof | A red kite in the sky with its long string dangling below the line. | same | Kangaroo tail / monkey (kof) hanging (differs) | qof.svg | per-image approval | **retire** |
| 20 | resh | A smooth round head in profile, growling; no corners. | same | Rainbow arc / head (rosh) (partial) | resh.svg | per-image approval | **keep** |
| 21 | shin | A birthday shortcake with three candle flames: the three prongs are the letter. | same | Shark teeth / three flames (partial) | shin.svg | per-image approval | **keep** |
| 22 | tav | A small table with a baby beside it; the leg with a little foot is the letter. | same | Table / tent (partial) | tav.svg | per-image approval | **keep** |
| 23 | kaf-final | A king in a long robe whose cloak trails behind him into a loch (a lake). | same | Key hanging on a hook (differs) | kaf-final.svg | per-image approval | **retire** |
| 24 | mem-final | A camping tent zipped shut beside the sea, with mom at the door. | same | Sealed box (differs) | mem-final.svg | per-image approval | **retire** |
| 25 | nun-final | One tall nail hammered upright into a big stone. | same | Nail driven down (same) | nun-final.svg | per-image approval | **keep** |
| 26 | pe-final | A big feather held off the tip of a nose; the long stem is the tail of the letter. | changed here (was: cartoon mouth with a long tongue blowing a feather off a spoon) | Flag on a pole (differs) | pe-final.svg | per-image approval | **retire** |
| 27 | tsadi-final | A tall tree with Y-shaped branches and a long straight trunk, nuts hanging from the branches. | same | Tree with a taproot (same) | tsadi-final.svg | per-image approval | **keep** |

Variants: vet, khaf and fe share their parent picture (khaf text now says cup, as kaf); sin has its own file `assets/letters/morph/sin.svg` (28 files in all).

## Notes per letter

- **alef**: Approved chain concept and older mnemonic are both the silent handstand mime. The brief lists a generic mime as conflicting with the Noa direction, but memory-chain.json (and docs/letters/RECONCILE.md) approve the mime, so nothing was retired. Human decision: keep the mime, or replace it with a Noa picture. Older art prompt is an ox head.
- **bet**: Older art prompt is a bed inside a house; approved is a bungalow with a ball.
- **gimel**: Older art prompt is a giraffe; approved is a grumpy camel.
- **dalet**: Older art prompt is a door frame; approved is a diving board.
- **he**: Older art prompt is a house with an open window; approved is a hut with a gap in the wall. Both are small buildings with an opening.
- **vav**: Vine in both.
- **zayin**: Zipper pull in both.
- **chet**: Older mnemonic text had a closed gate with a hissing cat (a second cat in the set); now the gate by a loch with a milk jug, as in the chain. Older art prompt is a hut doorway.
- **tet**: Older art prompt is a teacup with a curled handle; approved is a teapot. Both are tea vessels.
- **yod**: Yo-yo in both.
- **kaf**: Older mnemonic text had a kitchen spoon with a kernel; now a cup on its side, as in the chain. Older art prompt is a cupped palm.
- **lamed**: Older art prompt is a lighthouse or shepherd staff; approved is a lamp post.
- **mem**: Older mnemonic text had an open-flap mountain tent; now a mailbox, as in the chain. Older art prompt is a mountain over water.
- **nun**: Approved and older mnemonic text are the one napping cat. Older art prompt is a bent nail, which is not the approved picture. Cat stays the only cat in the set.
- **samekh**: Older mnemonic text had a soft cushion; now a swim ring, as in the chain. Older art prompt is a sun.
- **ayin**: Eye in both. The sound wording was reconciled by reading (see the ayin section).
- **pe**: Older art prompt is a pie in an open mouth; approved is a mouth blowing a bubble. Both show an open mouth.
- **tsadi**: Older mnemonic text had a sitting cat with pointed ears (a second cat in the set); now a pizza slice with a bird on the box, as in the chain. Older art prompt is a sitting cat.
- **qof**: Older art prompt is a kangaroo tail or hanging monkey; approved is a kite.
- **resh**: Older art prompt is a rainbow arc or a head; approved is a round head in profile. The head is in both.
- **shin**: Older art prompt is shark teeth or three flames; approved is a birthday cake with three flames. The flames are in both.
- **tav**: Older art prompt is a table or tent; approved is a table with a baby. The table is in both.
- **kaf-final**: Older art prompt is a key on a hook; approved is a king whose cloak trails into a loch.
- **mem-final**: Older art prompt is a sealed box; approved is a tent zipped shut by the sea. Older text said "Mountain tent" (a leftover of the retired open-mem tent); now "a tent".
- **nun-final**: Nail in both. The anchor word pointing was reconciled with the word list (see the garden section). Its alt story still has a cat; it is not displayed.
- **pe-final**: Older mnemonic text had a mouth with a lolling tongue; now a feather held off a nose, as in the chain. Older art prompt is a flag on a pole.
- **tsadi-final**: Tree in both. Its alt story still has a cat on a pole; it is not displayed.

## Ayin: sound wording

Stated per reading, only from data/pronunciation/consonants.json (verified true): Israeli [ʔ] or silent, merged with alef ("do not try a pharyngeal in Israel"); Sephardi pharyngeal [ʕ] (Western Sephardim [ŋ]); Ashkenazi silent (relic [ŋ] in Yiddish Yankev, mayse).

Changed: mnemonics.json ayin sound, soundAnchor, story, altStory, caption, lookalike, imageIdea; alef lookalike; meta.note; memory-chain.json ayin story (via tools/letters/memory-chain.source.json); tools/images/spec.mjs ayin sound (printed in the book header and the art prompt; it said "silent in Tel Aviv, throaty in Mizrahi speech", which the data does not say).

The data does not decide:
- How many Sephardi or Mizrahi communities keep a throat sound for ayin, and which: the data gives one "Sephardi" textbook model and says it is not a model of any community.
- Whether Ashkenazi ayin is always silent: data/traditions/sounds.json says "silent in most forms; traditional authorities advised a throaty sound in prayer, which is rarely done".
- Alef has the same issue: its fields say silent, while consonants.json lists a glottal stop [ʔ] for Sephardi. Not changed in this pass.

## Garden anchor (nun-final): pointing

The word list (`data/vocab/words.json`, id ha5babfe9) points the noun "garden" with patach + dagesh. The old anchor word used qamats + dagesh; it now uses the word list pointing. data/vocab/words.json also has the same consonants with segol + dagesh (id had0d3973, "a gene"); that is a different word.

Same pointing as the word list: data/curriculum/lessons.json (4); data/curriculum/lessons-intermediate/I-42.json (3); data/wordtrace/words.json; data/pronunciation/runtime/lookup-02.json; data/tts/soundwords.*.json (lesson-word and vocab-alias); tools/curriculum/intermediate/isr2.py.

Changed or regenerated: data/letters/mnemonics.json; data/audio/manifest.json (2 anchor-nun-final rows, rebuilt); data/tts/soundwords.israeli.json (1 row, rebuilt); docs/voices/* and docs/drafts/batches/batch-19-word.csv (regenerated). no occurrence in src/.

For a qualified reviewer: A qualified Hebrew reader should confirm the pointing and the word choice. The word list is dictionary-derived and flagged for review, and the data does not say whether the qamats form is a recognised variant, so it was not kept as one.

## Needs a human decision

- alef: keep the handstand mime (approved in the chain) or replace it with a Noa picture. The data shows no Noa letter picture.
- Older art in assets/img/gen: current visibility follows data/images/approvals.json. Owner-approved pictures may be shown; the concept decisions above remain draft. Nothing was deleted.
- ayin and alef sound wording: reviewer to check the per-reading lines (see the ayin section).
- garden pointing: reviewer to confirm patach + dagesh.
- nun-final and tsadi-final alt stories still describe a cat: retire them or leave them hidden.
- The brief mentions kneeling and standing nuns near lines 29 and 40 of mnemonics.json. Those lines are the nun (napping cat) and nun-final (nail) records; no kneeling or standing nun text was found in the file. docs/DECISIONS-NEEDED.md item 13 says a kneeling-nun picture was already replaced by the cat.

## Not rebuilt

book/out, docs/workbook/html and the workbook PDFs were built before this pass and were not rebuilt.
