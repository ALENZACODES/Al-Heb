# Morph recognition review (blind)

Method: all 28 files in assets/letters/morph rendered at 200 px, light scheme, headless Chromium (Chrome), state B (default, object) and state A (class morph-show-a, letter). Files read were the versions on disk at about 19:24 (latest mtime then). I viewed the images first and wrote my guess down, then compared with picture.idea, sound.hook and word.gloss in data/letters/memory-chain.json, and with each SVG title. Only 200 px renders were examined; no larger zoom, no dark mode, no animation checked.

Scope note: 28 files, not 27 (sin.svg has no entry in memory-chain.json, so it was compared against shin only).

Rating: G = recognised and matches, Y = recognisable but weak/partly mismatched, R = not recognised or contradicts the chain data.

| id | blind guess (confidence) | letter visible in object? | vs idea / hook | rating |
|---|---|---|---|---|
| alef | person doing a handstand on gloves, tangled with a crossing diagonal (40%) | yes, but diagonal reads as an X laid over the head | title matches; idea's cheering father is absent; busiest tile (motion ticks, dashes, beret) | Y |
| ayin | carrot (90%) | weak: the curve is the carrot edge, no eye cue | contradicts idea (winking eye) and hook "eye" | R |
| bet | house with a ball in a doorway/window (75%) | yes, floor bracket and wall | matches | G |
| chet | grey cat behind a gate (80%) | yes, arch/gate | matches (hissing not visible) | G |
| dalet | diving board over a pool (90%) | yes | matches; door-at-end not seen | G |
| gimel | animal head with long neck, cropped at top-left (35%) | yes | head cut off by the viewBox, camel not recognisable; grumpy not visible | R |
| he | creature (bird/dog) peeking from a hole in a house (55%) | yes | idea says a person shouting hey; creature is not clearly a person | Y |
| kaf-final | crowned figure in long robe (70%) | yes, orange arm is a clear stem | matches king; the stem reads as a separate pipe rather than a cloak | G |
| kaf | horseshoe magnet / C-clamp (70%) | yes | contradicts idea (spoon with kernel) and hook "kernel"; title says magnet | Y |
| lamed | lamp with light cone, small humps below (65%) | yes | hook "lamp" fits; idea has bread, the humps do not read as bread | Y |
| mem-final | tent or door with waves (60%) | yes, box and door | matches idea roughly (zipped tent by sea) | G |
| mem | mailbox with letter (85%) | yes | contradicts idea (tent and water); hook "mom" has no link to mailbox | Y |
| nun-final | tall striped cat (60%) | yes, straight stem | contradicts idea (nail in stone); title says cat; near twin of tsadi-final | R |
| nun | sleeping orange cat with Z (90%) | yes | matches (nap); no candle | G |
| pe-final | orange hook/cane with dash and wind lines (25%) | yes | mouth, tongue, feather not recognisable | R |
| pe | chomper with dots (85%) | yes | matches title; idea says bubble blower, so hook "pop" is not shown | G |
| qof | kite with bow tail (90%) | yes | matches | G |
| resh | head in profile with dark hair (80%) | yes, hair cap and back of head | matches | G |
| samekh | lifebuoy on water (90%) | yes, closed loop | contradicts idea (cushion, person reading); hook "sit" weak | Y |
| shin | birthday cake with three flames (85%) | yes | matches | G |
| sin | same cake (identical at this size) | yes | indistinguishable from shin at 200 px; no chain entry | R |
| tav | orange table with a child, sound arcs (45%) | yes, table top and legs | idea has tapping toe, not seen; baby small | Y |
| tet | teapot (95%) | yes | matches; phone handset not seen | G |
| tsadi-final | stretched striped cat, arms up (60%) | yes | contradicts idea (tree with cats); near twin of nun-final | R |
| tsadi | dark blue sitting cat with pizza slice (75%) | yes, diagonal body | ears clipped at top edge; bird on box not seen | Y |
| vav | vine with leaves and grapes on a hook (85%) | yes, straight stem | matches | G |
| yod | candle with flame (95%) | yes | contradicts idea and hook "yo-yo"; title says candle | Y |
| zayin | orange zipped pouch with zipper pull (65%) | yes | matches hook "zipper"; gold not shown | G |

## Look-alike pairs
- Cats: nun, nun-final, tsadi, tsadi-final and chet all use a cat (five). nun-final and tsadi-final are the same stretched yellow striped cat; only the arms differ. Not separable by state B alone.
- shin and sin: same cake, no visible difference at 200 px.
- bet and kaf: distinct in state B (house vs magnet); in state A they are both C-like boxes, which is expected.
- mem and mem-final: tent vs mailbox, different objects and no shared cue.

## Other findings
- Idea text in memory-chain.json is stale for at least ayin, kaf, mem, samekh, yod, nun-final, tsadi-final, pe-final, he and lamed. The art and SVG titles have moved on; hooks (eye, kernel, yo-yo, sit, nail) no longer match the pictures.
- Clipping: gimel head, tsadi ears, and the top edge of several tiles touch the viewBox boundary.
- Nothing inappropriate seen.
- State A (letter only) renders cleanly for all files; samekh and mem letters look hand-wobbly compared with the rest.

## Top 8 fixes
1. ayin: carrot has no link to eye; give it an eye (or drop the carrot) and fix the hook mismatch.
2. nun-final and tsadi-final: make visibly different objects (they are the same cat); restore nail-in-stone or tree-with-cats, or change one cat strongly.
3. pe-final: not readable; redraw as a clear mouth/tongue/feather or a single strong object.
4. gimel: head is cropped and the animal is unclear; reframe inside the viewBox so a camel (humps, grumpy face) reads.
5. shin vs sin: make the difference visible at 200 px (dot position or a distinct object cue) and add a sin entry to the chain data.
6. Sync memory-chain.json idea, alt and hook with the art for kaf, mem, samekh, yod, he, lamed, tav (or change art to the ideas).
7. alef: reduce clutter and untangle the diagonal from the head so the handstand reads at once.
8. tsadi and tav: unclip the cat ears; enlarge the tav baby or tapping toe so the table is not just a plain orange bracket.
