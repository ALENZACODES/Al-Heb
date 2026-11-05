# Image review, lane 1 drafts (items 101-109)

Status: DRAFT notes for a human designer/owner. Nothing here is approved, accepted or ready to ship.

## Scope and limits

- This look was at 512 px contact sheets only (12 pictures per sheet, 300 px thumbnails, 8 sheets, every picture seen). No picture was opened at full size, and the 1024 files were not looked at (they were not staged).
- Small details (fine lines, tiny marks, hands, stitching) may be missed at this size. Treat "no flag" as "nothing noticed at this size", not as "checked and clean".
- The inbox was read only. Nothing was modified, moved or promoted.
- Descriptions say what is visible, not what the label intends. Pairing with labels and teaching use need human review.

## Cross-check against inventory.csv and prompts.json

- 85 staged 512 px PNGs. Each folder's 512 rows in inventory.csv match the staged files one to one by subject (101: 8, 102: 10, 103: 10, 104: 10, 105: 8, 106: 10, 107: 12, 108: 7, 109: 10). No missing and no extra pictures.
- prompts.json has the same subjects as the inventory in every folder (no missing or extra prompt entries).
- Every staged 512 file decodes as 512 x 512, matching the inventory width/height, and its SHA-256 matches the inventory hash.
- inventory.csv also lists a 1024 row for each subject (85 rows). Those 1024 files are not in the inbox, as expected. Their sizes and hashes were not checked.
- Prompts ask for 1024 x 1024 output; the 512 files are described in the reviews as resized copies. Not verified here.
- Prompts for items 101 and 102 ask for no text; 103-109 prompts not individually compared with pictures beyond the notes below.

## Style across the set (seen at 512 px)

- Items 101-105 and 107 share a look: cream background, thick charcoal outline, navy/mustard/olive/terracotta palette.
- Flags on consistency: item 106 (people) is flat solid navy silhouettes with no charcoal outline or interior detail, which looks different from the rest. Item 108 (days) is plain outlined calendar icons with a colour bar. Item 109 (feelings) is flat yellow round faces with a dark outline, close to common emoji style. Items 102 (glass, jar, egg, fork, spoon, plate, bread, lemon) use more shading and gradient than the flatter 101/103/104 pictures.

## Per picture

### 101 street objects
- bus-stop-pole: a square sign on a brown pole with a navy bus front pictogram, on a green base. No text.
- coin-purse: a red-brown clasp purse with a yellow frame and two yellow knobs and a green sprig mark. No text.
- falafel-pita: a pita pocket filled with falafel balls, lettuce, tomato, cucumber and onion slices.
- market-scale: a navy kitchen-style scale with a grey pan on top and a round dial with one pointer, no numbers or marks. Flag: dial has no numerals (fine), but it looks like a household or shop scale rather than a market one.
- pedestrian-crossing: white zebra stripes on a dark road with brick-coloured sidewalks, a bush and a yellow sign on each side showing a simple stripe mark. Flag: the sign mark is not a standard crossing pictogram; the draft's own review also says this is illustrative only.
- shared-taxi: a yellow and navy minibus seen from the front-left with side windows. Nothing marks it as a shared taxi (no sign, no text). Flag: generic van, label cannot be established from the picture.
- train-ticket: an orange ticket with notched ends showing a navy and green vehicle on a rail line. Flag: the vehicle looks like a bus or tram on rails, not clearly a train.
- water-bottle-cup: a blue bottle with an orange-red cap and olive loop beside a mustard cup, both holding water.

### 102 kitchen and food
- bread: a single brown loaf with diagonal slashes on top.
- egg: a plain beige egg with a light highlight. Flag: very pale against the cream background and with a lighter outline weight than neighbours.
- fork: a grey four-tine fork with a terracotta handle and a small leaf design.
- glass: a clear tumbler half full of blue water.
- jar: an empty clear glass jar with a mustard lid.
- lemon: a whole yellow lemon with two leaves and a cut wedge in front.
- olives: a sprig with two green olives and one dark purple olive, with leaves.
- plate: a round plate seen from above with a floral and leaf border, centre empty. Flag: decorative flowers are small and busy compared with the rest.
- pot: a terracotta cooking pot with a mustard lid, navy knob and olive side handles.
- spoon: a grey spoon with a terracotta handle and a leaf design.

### 103 clothing and body
- bag: a terracotta tote with mustard handles, no pattern.
- coat: a navy coat with three terracotta buttons, collar and two pockets.
- foot: a bare foot seen from the side with five toes and ankle shown; the top of the ankle is cut off flat. Flag: skin tone only one shade, ankle ends abruptly, outline thinner than the other items; toes look a little uneven.
- glasses: navy-frame glasses with olive and terracotta arms.
- hand: an open hand, palm facing the viewer, five fingers with palm lines, wrist cut off flat. Flag: check the finger shapes and palm lines at full size; wrist cut off.
- hat: a terracotta wide-brim hat with a mustard band and bow.
- scarf: a striped scarf in navy, mustard, terracotta and olive, with fringe, knotted at the top.
- shoe: a navy low sneaker with cream laces and a mustard sole, side view.
- umbrella: an open umbrella with navy, mustard, olive and terracotta panels and a hooked handle.
- watch: a wristwatch with a mustard case, olive strap with stitching, white face with two hands and no numbers or ticks.

### 104 nature and weather
- cloud: a white cloud with grey swirls.
- flower: a terracotta five-petal flower with a mustard centre, stem and two olive leaves.
- hill: a green mound with grass tufts and two terracotta patches. Flag: a bare mound could be read as a pile or a bush; check it against the label.
- rain: a grey cloud with six navy raindrops under it.
- sea: a navy block of wavy bands with white wave lines, flat top and rounded bottom edge, no horizon or sky. Flag: the shape looks like a bowl or tub of water, not open sea.
- snow: a grey cloud with navy snowflakes and a small snow mound below.
- star: a flat yellow five-point star with dark outline.
- sun: a mustard disc with eight terracotta rays, no face.
- tree: a round green tree with mustard leaves and a terracotta trunk.
- wind: navy swirl lines with two leaves (mustard, terracotta) blowing.

### 105 places in the home
- balcony: a mustard wall with a glass sliding door, navy railing, a potted plant and terracotta floor.
- bathroom: a navy clawfoot tub with water, a shower head, a pedestal sink with taps, a round mirror, a shelf with plant and towels, and a terracotta mat. Flag: more crowded than the rest of the set.
- bedroom: a wooden bed with navy and mustard blanket, bedside table with lamp and a small plant. Flag: wall and floor lines are only partly drawn.
- front-door: a navy panelled door with a mustard handle, two wall lanterns, two potted shrubs, a step and a mustard mat.
- garden-gate: a terracotta arched wooden gate with black hinges between mustard fence sections, two bushes and stepping stones.
- living-room: a navy sofa with mustard and terracotta cushions, a low wooden table with a plant, a green rug, a floor lamp and a potted plant.
- stairs: a staircase with a mustard handrail and black balusters, a small window and a potted plant. Flag: the stair perspective is slightly odd; check at full size.
- window-view: a terracotta-framed four-pane window showing a tree, hills and blue sky.

### 106 family and people
All ten are solid dark navy silhouettes with no faces or features and no outline, on a cream background. Flags apply to the whole set: style differs from the rest of the lane; the silhouettes carry little to tell roles apart; no real people or characters recognised. Body shapes show gender through hair and clothing outline only, which may not suit every label.
- baby: a seated baby silhouette with a round head.
- brother: a standing boy with short hair, arms at sides.
- father: a standing adult male with short hair.
- friend: a standing young person with one hand raised in a wave. Flag: nothing about it says "friend" except the wave.
- grandfather: a standing older man, broader and rounder than the father, no cane or other cue.
- grandmother: a standing woman in a skirt or dress with hair in a bun.
- mother: a standing woman with a short bob and a trousered or slim outline.
- neighbour: a standing adult male, almost the same as the father. Flag: neighbour and father are hard to tell apart.
- sister: a standing smaller girl with a bob haircut.
- teacher: a standing woman with one arm held out as if gesturing. Flag: no teaching cue beyond the gesture.

### 107 animals
- bee: a mustard and black striped bee with olive thorax, pale wings and two terracotta-tipped antennae, seen from above. Face is a plain round head with two dots.
- bird: a small bird with a navy head, terracotta chest, mustard wing and olive tail, side view.
- butterfly: a butterfly with navy-edged wings in mustard, olive and terracotta with white dots, wings open.
- cat: a standing cat with a patchy terracotta, navy, cream and olive coat and a striped tail curved up.
- cow: a white cow with navy, mustard, terracotta and olive patches, small horns and a pink udder. Flag: patch colours are not natural cow colours; udder is visible.
- dog: a floppy-eared dog with terracotta, navy and olive patches, tail up with motion lines. Flag: patch colours are not natural.
- donkey: a navy donkey with long mustard-lined ears, an olive mane and a tufted tail, side view.
- fish: a fish with a terracotta head, navy and mustard scales, olive fins and a mustard tail.
- horse: a brown horse with a navy mane and tail, white socks and a white blaze.
- lion: a mustard lion with a navy mane and a tufted tail, walking.
- sheep: a cream woolly sheep with a terracotta face and ears and olive legs. Flag: olive legs look odd.
- snake: a green snake with mustard and terracotta spots and a red forked tongue, in a gentle curve.

### 108 days of the week
All seven are the same outlined calendar icon with two binder rings and an empty white body, differing only by the colour of a band across the top. No numbers, letters or day marks. Flags for the whole set: the day is signalled by colour only, so nothing in the picture says which day it is; colours rely on the filename for identity; saturday-gray and the dark navy sunday could be hard to tell apart for some viewers. Individual positions of the band and the size of the icon vary a little between pictures.
- friday-plum: purple band.
- monday-mustard: yellow band.
- saturday-gray: dark grey band.
- sunday-navy: dark blue band.
- thursday-teal: teal band.
- tuesday-olive: green band.
- wednesday-terracotta: orange-red band.

### 109 feelings
All ten are round yellow faces with a dark outline and simple eyes and mouth, no text. Flags for the set: the expressions are similar to one another and several do not clearly match their label.
- cold: eyes squeezed in angled lines and a zigzag mouth, like shivering or gritted teeth. Plausible for cold, but no cold cue (no snow, shiver marks).
- happy: curved closed eyes and a wide smile.
- hot: half-closed eyes and a small open oval mouth. Flag: reads as yawning or tired, not hot; no sweat, tongue or heat cue.
- hungry: two dot eyes and a tiny open mouth with a pink tongue. Flag: reads as surprised or whistling, no hunger cue.
- proud: closed curved eyes and a small one-sided smile. Flag: looks like smug or content; hard to tell from happy.
- sad: small drooping eyes and a downturned mouth.
- sleepy: closed curved eyes and a small round mouth. Flag: close to tired and to hot.
- surprised: large white eyes with dots and a big open oval mouth.
- tired: half-lidded eyes with flat lids and a flat mouth. Flag: close to sleepy; slightly darker face tone than the rest.
- worried: small angled eyes and a wavy mouth.

## Things not seen in any picture (at 512 px)

- No readable text, letters, numbers or fake Hebrew was noticed in any picture, including the sign and ticket pictograms and watch and scale faces.
- No logos or brand marks were noticed.
- No recognisable real people or known characters were noticed.
- No extra limbs or face glitches were noticed in the animals or faces; hands and feet (103-hand, 103-foot) need a full-size look.

## Needs human review

All 85 pictures are DRAFT and need a human designer/owner review, including the label-match questions above (shared-taxi, train-ticket, sea, hill, hot, hungry, proud, neighbour/father) and the style differences in items 106, 108 and 109. The cultural fit for an "in Israel" set (101) has not been judged by me.
