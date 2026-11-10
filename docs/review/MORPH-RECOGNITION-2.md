# Morph recognition review 2 (fresh blind pass)

Method: all 28 files in assets/letters/morph, read after the "REDRAW DONE 20:12" line in docs/letters/RECONCILE.md. Rendered in headless Chrome, state B (default object) and state A (class morph-show-a, letter), at 200 px and 80 px, light scheme and real dark emulation (prefers-color-scheme: dark). I looked at the images before reading any hook, title or chain data. Caveat: the contact-sheet captions showed the file id under each tile, so the guesses were not blind to the letter name, only to the intended object. Not checked: animation, forced-colors, sizes above 200 px.

Rating: G = object recognised and matches chain idea/hook; Y = recognisable but weak, small, or partly clipped/mismatched; R = not recognised or contradicts.

| id | what I saw (confidence) | vs memory-chain / title | 80 px | dark | old -> new |
|---|---|---|---|---|---|
| alef | person upside down with crossed striped legs, face between hands (55%) | matches mime handstand, but mime cues (finger, beret) are not readable | weak | ok | Y -> Y |
| ayin | open eye with lashes and lid curve (95%) | matches | ok | ok | R -> G |
| bet | house with window and beach ball inside (80%) | matches; roof peak touches top edge | ok | ok | G -> G |
| chet | picket gate by water with a milk jug (80%) | matches; cat gone | ok | ok | G -> G |
| dalet | diving board on a post over a pool (90%) | matches; pool bleeds to three edges (by design) | ok | ok | G -> G |
| gimel | camel with hump and grumpy brow, foot kicked out (85%) | matches; head now inside frame | ok | ok | R -> G |
| he | creature peeking out of a house, shouting marks (55%) | idea says hut on mountain with a gap; reads as doghouse | ok | ok | Y -> Y |
| kaf-final | crowned king in long robe standing in water (75%) | matches | ok | ok | G -> G |
| kaf | tipped-over mug with spill and steam (85%) | matches cup on its side | ok | ok | Y -> G |
| lamed | desk or street lamp with cone of light, humps below (70%) | matches lamp; bulb is cut off by the top edge | ok | ok | Y -> Y (clip) |
| mem-final | house or tent with door, small person, waves (60%) | roughly "zipped tent, mom at door"; reads as a hut | ok | ok | G -> Y |
| mem | mailbox with letter and flag (90%) | matches | ok | ok | Y -> G |
| nun-final | big stone with one tall nail/rod standing in it (75%) | matches nail in stone; could read as sword in stone | ok | ok | R -> G |
| nun | sleeping cat with Z (95%) | matches; the only cat in the set | ok | ok | G -> G |
| pe-final | grey veined leaf on a yellow chick-like dome with eyes and orange beak (40%) | idea: feather held off a nose; reads as leaf/chick | weak | ok | R -> Y |
| pe | face with big open mouth blowing a bubble, helmet-like (65%) | matches bubble blower | ok | ok | G -> G |
| qof | kite with bow-tie string (90%) | matches | ok | ok | G -> G |
| resh | head in profile, growl arcs (85%) | matches | ok | ok | G -> G |
| samekh | striped swim ring on waves (95%) | matches | ok | ok | Y -> G |
| shin | birthday cake with three candle flames (90%) | matches | ok | ok | G -> G |
| sin | sun with rays and the letter in it (90%) | not in the 27 chain forms; chain notes it as "shin with left dot" | ok | ok | R -> G |
| tav | table with a small baby and sound arcs (60%) | matches; baby and foot are tiny | weak | ok | Y -> Y |
| tet | teapot with curled spout (95%) | matches; lid knob and steam touch the top edge | ok | ok | G -> G (minor clip) |
| tsadi-final | green tree with Y branches and hanging nuts (85%) | matches; cats gone | ok | ok | R -> G |
| tsadi | pizza slice with a bird on the box (80%) | matches; ears clip gone | ok | ok | Y -> G |
| vav | hanging vine with leaves and grapes from a ceiling hook (85%) | matches; hook bar sits on the top edge | ok | ok | G -> G |
| yod | hand flicking a yo-yo on a string (90%) | matches | ok | ok | Y -> G |
| zayin | orange pocket with a zipper pull (70%) | matches; zip tape touches left edge | ok | ok | G -> G |

Totals: G 22, Y 6 (alef, he, lamed, mem-final, pe-final, tav), R 0. Self-assessed by looking only; no second viewer.

## Look-alike checks
- Cats: only nun is a cat. Pass. Camel (gimel) is a different animal.
- shin vs sin: cake with flames vs sun with rays; clearly different at 200 and 80 px. Pass. Both reuse a similar letter colouring, which is fine.
- nun vs nun-final: sleeping cat vs nail in stone. Pass. nun-final vs tsadi-final: stone and tree. Pass.
- tsadi vs tsadi-final: pizza and bird vs tree. Pass.
- Remaining near-pairs: kaf-final and mem-final both sit in a rounded grey tile with water or waves at the bottom (kaf-final king in water, mem-final tent by waves); distinguishable by figure. he and mem-final are both a "house with a person at a gap". State A glyphs: nun-final and vav look alike, and kaf-final and resh are close; that is the font, not the art.

## Clipping and clutter
- Cut by the viewBox top edge: lamed (sun/bulb visibly cropped, worst), tet (lid and steam), nun (ear tips touch), bet (roof peak touches), vav (hook bar flush with top).
- Touching sides or bottom: he (left and right), zayin (zip tape at left), pe-final (bottom is a half-dome cut flat), dalet (pool bleeds on three sides). The last two look intentional.
- Clutter: alef is still the busiest tile and the least readable at 80 px; pe and pe-final are small-detail pictures that lose their cue at 80 px; tav baby is a few pixels at 80 px.
- Dark: all 28 read in dark, no ink lost on the dark background; lamed cone is muddy but fine. Light and dark were both rendered with real colour-scheme emulation.

## Fixed since the first review (docs/review/MORPH-RECOGNITION.md)
- ayin carrot -> eye. gimel head crop -> full camel. nun-final and tsadi-final twin cats -> stone and tree. Five cats -> one cat. shin/sin identical -> cake vs sun. kaf, mem, samekh, yod now agree with chain idea and hook. tsadi ear clip gone. chet cat gone.
- Chain idea text and SVG titles now match for all 27 forms; sin has no chain entry by design (chain says it is not one of the 27).

## Still open (top fixes)
1. lamed: pull the bulb/sun inside the viewBox (clipped at the top).
2. pe-final: make the object a feather, not a leaf (add quill, curl, tilt) and put it clearly off a nose; at 80 px the nose/face is lost.
3. alef: simplify further, or enlarge the finger-to-lips cue; still only about 55% at 200 px and weak at 80 px.
4. he: make it read as a hut on a mountain with a person in the gap, or change the idea text to the doghouse picture.
5. mem-final: add tent cues (peaked flap, guy lines) so it does not read as a house; the "mom" is tiny.
6. tav: enlarge the baby and the foot of the leg.
7. tet, nun, bet, vav: add 6 to 10 viewBox units of top margin (lid/steam, ears, roof peak, hook bar).
