# Letter pictures vs memory chain: reconciliation

Rule: the picture must contain the object of the hook word (keyword method), the letter shape must be visible in it, and the hook's first sound
must be true in the traditions claimed. At most one cat picture in the whole set (nun keeps it). Decisions by the source-table lane, 2026-11-04.
"owner" is who edits: `src` = tools/letters/memory-chain.source.json (this lane), `art` = the lane that redraws assets/letters/morph/<id>.svg.
Not checked by a native or fluent reader.

| letter | keep | change | owner |
|---|---|---|---|
| alef | picture (mime handstand), hook uh-oh, word | idea/alt say only the mime (father is not drawn); art lane may declutter the busy tile (optional) | src |
| bet | picture, hook ball, word | nothing | none |
| gimel | hook grumpy, word camel | redraw: whole camel inside the frame (head is cropped), a visibly grumpy face, one foot kicked forward | redraw |
| dalet | picture, hook dive | drop the floating door from idea/story (a board over a pool) | src |
| he | letter shape (house frame with a gap in the left wall) | hook hey -> hut; text is final, so the art must change, not the text: redraw as a small hut (peaked roof, plank wall) on a mountain slope, gap in the left wall, NO dog or creature (review 2: it reads as a doghouse) | redraw |
| vav | picture, hook vine, word | nothing | none |
| zayin | picture | alt/idea say a zipper with a golden pull (no jacket or bag claimed) | src |
| chet | gate shape, word milk | hook Chanukah -> loch (final kh; avoids the h that collides with he). Redraw: closed gate at the edge of a lake (a loch), a jug of milk at the gate, NO cat | redraw |
| tet | picture (teapot), hook tea | drop the telephone from idea/alt (word is a loanword, not pictured) | src |
| yod | hook yo-yo, word | redraw: a tiny hand at the top flicking a yo-yo on its string (candle removed). Gloss aligned with the vocab record: arm (hand is its second sense) | redraw |
| kaf | word palm | hook kernel -> cup; redraw: a cup lying like a cupped palm, its C-shape is the letter (magnet removed) | redraw |
| lamed | picture (tall bent lamp), hook lamp | idea/alt: lamp only, no bread drawn | src |
| mem | picture (mailbox), hook | hook mom -> mailbox (mom is not drawn); story/alt follow | src |
| nun | picture (the one cat, napping), hook nap | idea/alt: napping cat; candle dropped (word ner not pictured) | src |
| samekh | picture (closed ring on water) | hook sit -> swim ring (the ring is drawn); story/alt follow | src |
| ayin | hook eye, word eye | redraw: a clear eye whose lid curve is the letter (carrot removed) | redraw |
| pe | hook pop, word mouth | redraw: a mouth blowing one bubble, curl = tongue. Remove the video-game-character look-alike | redraw |
| tsadi | hook pizza (medial ts), word bird | redraw: NO cat; a pizza slice with a bird perched on the box, diagonal body of the letter kept | redraw |
| qof | picture, hook kite, word | nothing | none |
| resh | picture (round head), hook round (cue only) | nothing | none |
| shin | picture (cake, three flames) | hook shh -> shortcake (sh, and a cake is drawn); story/alt follow | src |
| tav | picture (table, baby), hook table | idea/alt: table with a baby, no tapping toe claimed | src |
| kaf-final | picture (king, long cloak), word king | hook Bach (often said with k) -> loch; redraw: lake water at the foot of the cloak | redraw |
| mem-final | tent by the sea, word sea | hook mom stays: redraw adds a mother at the tent door | redraw |
| nun-final | hook nail, word stone | redraw: one tall nail hammered upright into a stone (cat removed) | redraw |
| pe-final | word nose | hook fluff -> feather; redraw: a large feather held off the tip of a nose (hook was unreadable) | redraw |
| tsadi-final | word tree | hook cats -> nuts (final ts, no cats); redraw: tall Y-branched tree with nuts hanging, no cats | redraw |

Redraw list (13): gimel, he, chet, yod, kaf, ayin, pe, tsadi, kaf-final, mem-final, nun-final, pe-final, tsadi-final. pe-final: review 2 says the current art reads as a leaf on a chick; it must show a big feather held off a nose.
Art-lane text only (no redraw): zayin, samekh, mem, shin, lamed, tet, nun, tav, alef titles and desc to match the new alt text in data/letters/memory-chain.json.

Story wording: stories are built per tradition. `story` is the Israeli text; the builder adds `storyByTradition` by replacing the word's transliteration with the rule respelling (aba/abo, bayit/bayis ...).

Status lines (the redraw lane appends below, one line per update):
STATUS src-lane: decisions written; source table and data applied in the same pass.
REDRAW DONE 20:12 2026-11-04: redrawn gimel, chet, ayin, pe, tsadi, nun-final, pe-final, tsadi-final, shin/sin (cake vs sun), alef (decluttered), yod, kaf, kaf-final, mem-final; he and tav text only. build_morph_sheet --check passes (28 files), tests/letters.*.test.js 0 failures. Ratings are self-assessed from 200px light and dark renders, not checked by an independent viewer.
STATUS src-lane: he moved to redraw after review 2; text stays as built.
