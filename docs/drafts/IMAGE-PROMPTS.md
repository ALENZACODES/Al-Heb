# ALEF letter pictures: prompts for an outside image generator (lane 1)

Status: DRAFT for John's review. Written 2026-11-04. Nothing here was run through an image generator, and no output was checked. Not reviewed by a native Hebrew reader.

Source of truth for each picture: `data/letters/memory-chain.json` (object, hook word) as reconciled in `docs/letters/RECONCILE.md`. Palette and file contract: `docs/letters/MORPH-USAGE.md`. The silhouette descriptions were written by looking at the print outlines in `docs/letters/preview-print.png`. Reconcile status at the time of writing: the redraw lane had not yet appended a status line, so a few redraws (gimel, chet, yod, kaf, ayin, pe, tsadi, the five finals) may still change the in-app SVGs; these prompts follow the reconciled table, not the SVG files.

## 1. How to use

1. Paste "Shared rules" (section 2) once at the start of a chat, then paste ONE prompt from section 4, 5 or 6 per image. Ask for one image at a time, 1024 by 1024 PNG.
2. Save each result as `docs/drafts/inbox/lane1/<file name>` using the file rule below. Do not put images anywhere else; the build agents do not read that folder until you move a file out.
3. Run the 5-line acceptance check (section 7) before keeping an image. If it fails, regenerate; after 3 failures, simplify the object (the prompt says how) and note the letter id.
4. These pictures are reference art for a human or for the picture lane. They are not the in-app SVG pictures, which follow the strict contract in `docs/letters/MORPH-USAGE.md`.

File name rule: `lane1-<n>-<letterId>.png`, where `<n>` is the two-digit number of the letter in section 4 (01 to 27) and `<letterId>` is the id shown there (for example `lane1-02-bet.png`, `lane1-23-kaf-final.png`). Pairs: `lane1-28-<a>-<b>.png`. Scenes: `lane1-33-<scene>.png`. No tool, company or person names in any file name.

## 2. Shared rules (paste first)

```
You are the ALEF illustrator. You make flat, friendly pictures for an adult Hebrew-learning app.
Rules for every image:
- ONE main object only, centred, filling about 70 percent of the square.
- Flat vector style: solid colour fills, clean edges, no gradients, no textures, no shadows except one flat soft-grey ground shadow, no outlines thicker than 6 px.
- Plain background: solid off-white #FBF8F1, nothing else behind the object.
- Square canvas, 1024 x 1024 pixels, PNG, sharp at 128 px.
- The SHAPE of one Hebrew letter must be hidden in the silhouette of the object. You are given a plain-words description of that silhouette. Follow it. The outline of the whole object must read as that shape when you squint.
- Palette: use ONLY the colours listed in each prompt plus ink #2B2B2B for any line work and the off-white background. Maximum 4 colours plus ink.
- Absolutely no text, no letters of any alphabet, no numbers, no logos, no brand marks, no signs, no watermarks, no characters from any film, game, comic or brand.
- Any person or animal has a plain round head and no facial detail except where the prompt asks for a mood.
Reply with the image only.
```

## 3. Negative prompt (paste after every prompt, or into the negative field if the generator has one)

```
text, letters, Hebrew letters, Latin letters, numbers, words, captions, signature, watermark, logo, brand, trademark, cartoon character, mascot, film character, game character, photograph, photorealistic, 3d render, gradient, texture, noise, glow, blur, shadow gradient, outline sketch, hand-drawn shaky lines, busy background, scenery, extra objects, second object, border, frame, detailed face, realistic eyes, crowd, hands with fingers, readable sign
```

## 4. The 27 letter prompts

Each prompt is self-contained: paste the "Shared rules" first, then the block below, then the negative list. The hook word and the Hebrew letter are for you, not for the generator: the generator is never told to draw the letter as text.

### 01. Alef (א)  file `lane1-01-alef.png`

Hook word: uh-oh. Picture idea in the app: A silent mime in a handstand with a finger to the lips. The handstand body is the letter.

```
Draw ONE object: A mime doing a handstand, seen from the side, neutral grey-blue clothes, one hand-less simple arm shape, a finger shape to the lips is NOT needed (no face detail: plain round head, no features).
Hidden letter shape (describe-the-silhouette): The body is one long diagonal from upper right to lower left (hips high at the upper right, the hands-down arm at the lower left). A second short curved limb hooks off the upper right end and a third short curved limb rises from the lower left. Together: a slanted line with one arm hooked at each end.
Colours: ink #2b2b2b, warm orange #d9480f, deep blue #1b3a6b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: ayin. Make sure your silhouette differs from the partner's description in section 5/4.

### 02. Bet (ב)  file `lane1-02-bet.png`

Hook word: ball. Picture idea in the app: A bungalow seen from the side with a beach ball inside the open doorway; the floor sticks out at the back.

```
Draw ONE object: A small bungalow house seen from the side, open doorway, a beach ball inside the doorway.
Hidden letter shape (describe-the-silhouette): A box that is open on the left: flat roof line along the top, a solid vertical wall on the right, a floor line along the bottom that sticks out past the right wall. The open doorway is the open left side.
Colours: warm orange #d9480f, deep blue #1b3a6b, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: kaf. Make sure your silhouette differs from the partner's description in section 5/4.

### 03. Gimel (ג)  file `lane1-03-gimel.png`

Hook word: grumpy. Picture idea in the app: A grumpy camel stomping forward, one foot kicked out ahead: the foot is gimel's foot.

```
Draw ONE object: A grumpy camel, whole animal inside the frame, one front foot kicked out ahead.
Hidden letter shape (describe-the-silhouette): One tall leaning body on the right (neck and back in one smooth curve) that bends over at the top toward the left like a head. At the bottom, one foot kicks out to the left as a small flat foot. Simple tall shape, not a wide camel.
Colours: warm orange #d9480f, light gold #ffd966, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: nun. Make sure your silhouette differs from the partner's description in section 5/4.

### 04. Dalet (ד)  file `lane1-04-dalet.png`

Hook word: dive. Picture idea in the app: A diving board sticking out from one post over a pool.

```
Draw ONE object: A diving board sticking out from one post over a pool of water.
Hidden letter shape (describe-the-silhouette): A long flat horizontal board at the top that overhangs to the right, with a single vertical post under its left-centre. Sharp square corner where the board meets the post, no curves.
Colours: deep blue #1b3a6b, light gold #ffd966, warm orange #d9480f; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: resh. Make sure your silhouette differs from the partner's description in section 5/4.

### 05. He (ה)  file `lane1-05-he.png`

Hook word: hut. Picture idea in the app: A small hut on a mountain with a gap in the left wall.

```
Draw ONE object: A small hut on a mountain, a gap in the left wall.
Hidden letter shape (describe-the-silhouette): A flat roof bar along the top with a tall wall on the right running down to the ground. On the left, a separate short wall that does NOT touch the roof: a clear gap between the roof and the left wall.
Colours: warm orange #d9480f, green #2f9e44, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: chet. Make sure your silhouette differs from the partner's description in section 5/4.

### 06. Vav (ו)  file `lane1-06-vav.png`

Hook word: vine. Picture idea in the app: One straight vine hanging from a hook: the letter is the vine, the hook is the ceiling hook.

```
Draw ONE object: A single straight vine hanging from a hook in the ceiling.
Hidden letter shape (describe-the-silhouette): One thin straight vertical line with only a tiny hook or head at its top. Nothing else touches it. No bar, no foot, no bend.
Colours: green #2f9e44, light gold #ffd966, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: zayin. Make sure your silhouette differs from the partner's description in section 5/4.

### 07. Zayin (ז)  file `lane1-07-zayin.png`

Hook word: zipper. Picture idea in the app: A golden zipper pull on a zipper: a short bar on top and a straight stem down.

```
Draw ONE object: A zipper with a golden pull, seen close up, no jacket or bag.
Hidden letter shape (describe-the-silhouette): One straight vertical stem with a short horizontal bar across the top that sticks out on both sides (like a nail or a T). The golden pull tab is the top bar.
Colours: light gold #ffd966, deep blue #1b3a6b, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: vav. Make sure your silhouette differs from the partner's description in section 5/4.

### 08. Chet (ח)  file `lane1-08-chet.png`

Hook word: loch. Picture idea in the app: A closed gate at the edge of a loch (a lake), with a jug of milk standing at the gate.

```
Draw ONE object: A closed gate at the edge of a lake, a jug of milk standing at the gate. No animals.
Hidden letter shape (describe-the-silhouette): An arch: a flat bar across the top, joined at the top right corner to a tall right post, and joined at the top left to a tall left post. Both posts reach the ground; the arch is completely closed at the top (no gap), open at the bottom.
Colours: deep blue #1b3a6b, light gold #ffd966, warm orange #d9480f; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: he. Make sure your silhouette differs from the partner's description in section 5/4.

### 09. Tet (ט)  file `lane1-09-tet.png`

Hook word: tea. Picture idea in the app: A round teapot full of tea, its spout curling inward.

```
Draw ONE object: A round teapot full of tea, its spout curling inward.
Hidden letter shape (describe-the-silhouette): A deep rounded bowl like a U. The right side rises and curls inward at the top (the spout curling in); the left side rises straight and ends in a small hook. Rounded everywhere, open at the top.
Colours: warm orange #d9480f, light gold #ffd966, deep blue #1b3a6b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: samekh. Make sure your silhouette differs from the partner's description in section 5/4.

### 10. Yod (י)  file `lane1-10-yod.png`

Hook word: yo-yo. Picture idea in the app: A tiny hand at the top of the line flicking a yo-yo on its string.

```
Draw ONE object: A tiny hand at the top of the picture flicking a yo-yo on its string.
Hidden letter shape (describe-the-silhouette): A very small shape: a short comma-like stroke floating high in the frame, with large empty space below and beside it. The hand holding the string is the small shape.
Colours: warm orange #d9480f, light gold #ffd966, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: vav. Make sure your silhouette differs from the partner's description in section 5/4.

### 11. Kaf (כ)  file `lane1-11-kaf.png`

Hook word: cup. Picture idea in the app: A cup lying on its side like a cupped palm: the C-shape is the letter.

```
Draw ONE object: A cup lying on its side like a cupped palm.
Hidden letter shape (describe-the-silhouette): A reversed C: a curved top edge, a curved back on the right, a curved bottom edge, completely open on the left. No corners, one smooth bend, no extra bar.
Colours: warm orange #d9480f, deep blue #1b3a6b, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: bet. Make sure your silhouette differs from the partner's description in section 5/4.

### 12. Lamed (ל)  file `lane1-12-lamed.png`

Hook word: lamp. Picture idea in the app: A tall lamp post with a bent arm reaching high, lighting the ground below.

```
Draw ONE object: A tall lamp post with a bent arm reaching high, lighting the ground below.
Hidden letter shape (describe-the-silhouette): The tallest shape in the whole set: a tall stem that rises very high, bends over at the top like a shepherd's crook toward the left, and below sweeps down on a slant to a foot at the lower right.
Colours: light gold #ffd966, deep blue #1b3a6b, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: kaf. Make sure your silhouette differs from the partner's description in section 5/4.

### 13. Mem (מ)  file `lane1-13-mem.png`

Hook word: mailbox. Picture idea in the app: A mailbox on a post with a letter sticking out and a small flag.

```
Draw ONE object: A mailbox on a post, a letter sticking out and a small flag.
Hidden letter shape (describe-the-silhouette): A rounded box with a flat bottom and a gentle arch on top; on the left, a long stem that rises up and hooks over into the arch like a handle. The box part is closed on the right, with a small gap at the lower left.
Colours: deep blue #1b3a6b, warm orange #d9480f, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: mem-final. Make sure your silhouette differs from the partner's description in section 5/4.

### 14. Nun (נ)  file `lane1-14-nun.png`

Hook word: nap. Picture idea in the app: A cat curled up asleep, side view, with a Z for its snore. The only cat picture in the set.

```
Draw ONE object: A cat curled up asleep, side view, with a Z for its snore. Only cat in the set.
Hidden letter shape (describe-the-silhouette): A bent shape: a vertical on the right, a flat base that runs left along the ground at the bottom, and a top that hooks left. Like a flat-bottomed J mirrored, with no foot below the base.
Colours: warm orange #d9480f, light gold #ffd966, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: gimel. Make sure your silhouette differs from the partner's description in section 5/4.

### 15. Samekh (ס)  file `lane1-15-samekh.png`

Hook word: swim ring. Picture idea in the app: A striped swim ring floating on water: the closed ring is the letter.

```
Draw ONE object: A striped swim ring floating on water.
Hidden letter shape (describe-the-silhouette): A closed ring: a rounded square or circle, completely closed, flat-bottomed, with no gaps and no tails.
Colours: warm orange #d9480f, deep blue #1b3a6b, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: mem-final. Make sure your silhouette differs from the partner's description in section 5/4.

### 16. Ayin (ע)  file `lane1-16-ayin.png`

Hook word: eye. Picture idea in the app: A big open eye: the sweeping lid curve is the letter.

```
Draw ONE object: A big open eye.
Hidden letter shape (describe-the-silhouette): A cup that opens upward: a long sweeping curve at the right that swoops down and across the bottom to the left, plus a straight diagonal arm from the upper left. Two arms rising from one cup, like a Y with a rounded bowl. The lid curve is the cup.
Colours: deep blue #1b3a6b, green #2f9e44, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: tsadi. Make sure your silhouette differs from the partner's description in section 5/4.

### 17. Pe (פ)  file `lane1-17-pe.png`

Hook word: pop. Picture idea in the app: A mouth pursed to blow one big bubble, the curl inside the letter being the tongue.

```
Draw ONE object: A mouth pursed to blow one big bubble.
Hidden letter shape (describe-the-silhouette): A rounded box open at the left like a mouth: top curve, right curve, bottom curve. Inside, near the top left, a small curl pointing right: the tongue. Closed on the right, open on the left, with one small curl in the opening.
Colours: warm orange #d9480f, light gold #ffd966, deep blue #1b3a6b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: bet. Make sure your silhouette differs from the partner's description in section 5/4.

### 18. Tsadi (צ)  file `lane1-18-tsadi.png`

Hook word: pizza. Picture idea in the app: A slice of pizza with a bird perched on the pizza box; the leaning body is the letter.

```
Draw ONE object: A slice of pizza with a bird perched on the pizza box.
Hidden letter shape (describe-the-silhouette): A leaning body that goes from upper left down to a flat foot at the bottom right, plus a second short arm curving down from the upper right into it. The pizza slice's long diagonal is the body; the bird is the second arm. Flat base along the bottom.
Colours: warm orange #d9480f, light gold #ffd966, deep blue #1b3a6b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: ayin. Make sure your silhouette differs from the partner's description in section 5/4.

### 19. Qof (ק)  file `lane1-19-qof.png`

Hook word: kite. Picture idea in the app: A red kite in the sky with its long string dangling below the line.

```
Draw ONE object: A red kite in the sky with its long string dangling below.
Hidden letter shape (describe-the-silhouette): A reversed-C style top (flat top edge, slanted back on the right) with a separate straight leg at the left that drops far below the bottom of the top part. The long string is the leg.
Colours: warm orange #d9480f, deep blue #1b3a6b, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: kaf. Make sure your silhouette differs from the partner's description in section 5/4.

### 20. Resh (ר)  file `lane1-20-resh.png`

Hook word: round. Picture idea in the app: A smooth round head in profile, growling; no corners.

```
Draw ONE object: A smooth round head in profile, growling.
Hidden letter shape (describe-the-silhouette): One round curve: a flat top that bends smoothly at the top right into a straight right side that goes down. NO sharp corner, no overhang, no left leg. The profile of a round head.
Colours: deep blue #1b3a6b, warm orange #d9480f, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: dalet. Make sure your silhouette differs from the partner's description in section 5/4.

### 21. Shin (ש)  file `lane1-21-shin.png`

Hook word: shortcake. Picture idea in the app: A birthday shortcake with three candle flames: the three prongs are the letter.

```
Draw ONE object: A birthday shortcake with three candle flames.
Hidden letter shape (describe-the-silhouette): A cup with three upright prongs: a curved base like a bowl, and three straight prongs rising from it (left, middle, right). The three candles are the prongs.
Colours: warm orange #d9480f, light gold #ffd966, green #2f9e44; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: tav. Make sure your silhouette differs from the partner's description in section 5/4.

### 22. Tav (ת)  file `lane1-22-tav.png`

Hook word: table. Picture idea in the app: A small table with a baby beside it; the leg with a little foot is the letter.

```
Draw ONE object: A small table with a baby beside it.
Hidden letter shape (describe-the-silhouette): An arch like a table: a flat top running across, a tall right leg, and a left leg that has a small foot kicking out to the left at the bottom. The arch is closed at the top.
Colours: warm orange #d9480f, deep blue #1b3a6b, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: chet. Make sure your silhouette differs from the partner's description in section 5/4.

### 23. Final Kaf (ך)  file `lane1-23-kaf-final.png`

Hook word: loch. Picture idea in the app: A king in a long robe whose cloak trails behind him into a loch (a lake).

```
Draw ONE object: A king in a long robe whose cloak trails behind him into a lake.
Hidden letter shape (describe-the-silhouette): A reversed C opened out: a curved top bar that bends down at the right into one long straight stem which drops far below the bottom line. The long cloak trailing down is the stem. No bottom bar.
Colours: deep blue #1b3a6b, light gold #ffd966, warm orange #d9480f; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: resh. Make sure your silhouette differs from the partner's description in section 5/4.

### 24. Final Mem (ם)  file `lane1-24-mem-final.png`

Hook word: mom. Picture idea in the app: A camping tent zipped shut beside the sea, with mom at the door.

```
Draw ONE object: A camping tent zipped shut beside the sea, a mother standing at the door.
Hidden letter shape (describe-the-silhouette): A closed box with square corners on all four sides, wider than it is tall. A small gap at the upper left corner where the door flap is. No rounded parts.
Colours: warm orange #d9480f, deep blue #1b3a6b, green #2f9e44; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: samekh. Make sure your silhouette differs from the partner's description in section 5/4.

### 25. Final Nun (ן)  file `lane1-25-nun-final.png`

Hook word: nail. Picture idea in the app: One tall nail hammered upright into a big stone.

```
Draw ONE object: One tall nail hammered upright into a big stone.
Hidden letter shape (describe-the-silhouette): One long straight vertical line that drops far below the baseline. Nothing else: no bar, no foot, no hook at the bottom. The nail is the line.
Colours: deep blue #1b3a6b, light gold #ffd966, ink #2b2b2b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: vav. Make sure your silhouette differs from the partner's description in section 5/4.

### 26. Final Pe (ף)  file `lane1-26-pe-final.png`

Hook word: feather. Picture idea in the app: A big feather held off the tip of a nose; the long stem is the tail of the letter.

```
Draw ONE object: A big feather held off the tip of a nose.
Hidden letter shape (describe-the-silhouette): A rounded box open at the left (like pe, with a small curl inside) whose right side continues into a long straight stem dropping far below the bottom. The feather's long quill is the stem.
Colours: light gold #ffd966, warm orange #d9480f, deep blue #1b3a6b; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: tsadi-final. Make sure your silhouette differs from the partner's description in section 5/4.

### 27. Final Tsadi (ץ)  file `lane1-27-tsadi-final.png`

Hook word: nuts. Picture idea in the app: A tall tree with Y-shaped branches and a long straight trunk, nuts hanging from the branches.

```
Draw ONE object: A tall tree with Y-shaped branches and nuts hanging from the branches.
Hidden letter shape (describe-the-silhouette): A long straight trunk dropping far below the bottom, splitting at the top into a Y: one branch up to the upper left and one curving up to the upper right.
Colours: green #2f9e44, warm orange #d9480f, light gold #ffd966; ink #2B2B2B for thin details; background #FBF8F1.
Flat vector, plain background, square 1024 x 1024, single object centred, no text, no letters, no logos, no characters.
```

Easily confused partner: pe-final. Make sure your silhouette differs from the partner's description in section 5/4.

## 5. The five look-alike pair prompts

One image per pair: two objects side by side, same size, left and right halves, each on its own flat colour block (no divider text, no labels). The point is the ONE difference. Palette for all pairs: left block light gold #FFD966, right block soft blue #8DB8FF only as the block colours; objects use warm orange #D9480F, deep blue #1B3A6B, green #2F9E44 and ink #2B2B2B. Square 1024 x 1024.

Shared pair rules: two objects only, each filling about 60 percent of its half; no text, letters or numbers; flat vector; plain colour blocks.

### Pair 1: Bet (house, ball) and Kaf (cup)  file `lane1-28-bet-kaf.png`

```
Draw TWO objects side by side on two flat colour blocks. LEFT: a small side-view house open on the left with a beach ball inside the doorway; its floor sticks out past the right wall (flat bottom corner). RIGHT: a cup lying on its side, one smooth reversed C with no corners and no sticking-out floor.
The one visible difference to keep: Left shape has a square bottom-right corner and a floor that sticks out. Right shape is fully round with no corner.
Flat vector, no text, no letters, no logos, no characters, square 1024 x 1024.
```

### Pair 2: Dalet (diving board) and Resh (round head)  file `lane1-28-dalet-resh.png`

```
Draw TWO objects side by side on two flat colour blocks. LEFT: a flat diving board overhanging to the right from one post, sharp square corner. RIGHT: a smooth round head in profile, the same overall size, with one rounded top-right corner and no overhang.
The one visible difference to keep: Left has a sharp corner and the bar sticks out past the stem. Right is one rounded curve, no overhang.
Flat vector, no text, no letters, no logos, no characters, square 1024 x 1024.
```

### Pair 3: Vav (hanging vine) and Zayin (zipper pull)  file `lane1-28-vav-zayin.png`

```
Draw TWO objects side by side on two flat colour blocks. LEFT: one straight vertical vine hanging from a tiny hook, nothing crossing it. RIGHT: a straight vertical zipper stem with a golden top bar that sticks out on both sides.
The one visible difference to keep: Same height. Only the right one has a crossbar at the top.
Flat vector, no text, no letters, no logos, no characters, square 1024 x 1024.
```

### Pair 4: Chet (closed gate) and He (hut with a gap)  file `lane1-28-chet-he.png`

```
Draw TWO objects side by side on two flat colour blocks. LEFT: a closed arch gate, flat top fully joined to both posts, no gap. RIGHT: a small hut on a mountain whose left wall does not touch the roof: a visible gap between the roof and the left wall.
The one visible difference to keep: Same size. Left has no gap; right has one clear gap at the upper left.
Flat vector, no text, no letters, no logos, no characters, square 1024 x 1024.
```

### Pair 5: Tsadi (pizza slice with a bird on the box) and Ayin (open eye)  file `lane1-28-tsadi-ayin.png`

```
Draw TWO objects side by side on two flat colour blocks. LEFT: a pizza slice leaning from upper left down to a flat foot, with a small bird perched on the box at the upper right. RIGHT: a big open eye whose sweeping lid curve comes from the upper RIGHT and whose short arm comes from the upper left.
The one visible difference to keep: In the left shape the second arm comes from the upper right; in the right shape the long arm sweeps from the right and the short arm comes from the left. Keep both arms clearly visible.
Flat vector, no text, no letters, no logos, no characters, square 1024 x 1024.
```

Note on file numbers: `lane1-28` is used for all five pair files and `lane1-33` for all scenes; they are told apart by the name after the number.

## 6. The eight lesson scenes

Each scene is ONE place seen from a fixed front view, flat style, plain walls, no signs, no menus, no readable marks of any kind. People: at most one, seen from behind or as a plain round-headed figure, no facial detail. Palette: warm orange #D9480F, deep blue #1B3A6B, light gold #FFD966, green #2F9E44, ink #2B2B2B, background #FBF8F1. Square 1024 x 1024. This is a "scene" so more than one prop is allowed, but the scene is still ONE view with no text.

### Scene 1: bakery  file `lane1-33-bakery.png`

```
A bakery counter seen from the front: a glass case with three loaves and a tray of rolls, a wooden shelf of bread behind, a plain round clock without numbers.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 2: bus stop  file `lane1-33-bus-stop.png`

```
A bus stop on a street: a plain shelter with a bench, a plain pole with a blank round disc on top, a simple bus end-on at the side with blank windows.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 3: market  file `lane1-33-market.png`

```
An open-air market stall: a striped awning, crates of oranges, tomatoes and a pile of green peppers, a hanging scale with a blank face.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 4: classroom  file `lane1-33-classroom.png`

```
A classroom: a plain green board with no marks, four small desks, a teacher's desk, a window, a round clock without numbers.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 5: synagogue entrance  file `lane1-33-synagogue-entrance.png`

```
The entrance of a generic stone building: two plain wooden doors, a round arch above, two steps, a pair of simple lanterns. No symbols, no star, no sign.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 6: kitchen  file `lane1-33-kitchen.png`

```
A home kitchen: a counter, a kettle on a stove, a bowl of fruit, a shelf with jars with blank labels, a window.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 7: airport desk  file `lane1-33-airport-desk.png`

```
An airport check-in desk: a plain counter, a conveyor belt, a suitcase on it, a blank screen on the wall, a rope barrier.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

### Scene 8: cafe  file `lane1-33-cafe.png`

```
A small cafe: a round table with two cups and a plate with a pastry, two chairs, a counter with a coffee machine in the background, a plant.
Flat vector, plain walls, no signs, no readable marks, no text, no letters, no numbers, no logos, no characters, at most one faceless figure, square 1024 x 1024.
```

## 7. Acceptance check for John (5 lines, per image)

1. Letter visible: squint or look at the image at 128 px. Can you see the Hebrew letter's shape in the object's outline, without being told which letter it is? If not, reject.
2. Object named in 2 seconds: can you name the object (and its hook word, section 4) in about 2 seconds? If it takes longer or you guess wrong, reject.
3. Not confusable with its partner: put it beside its listed partner (section 4, "partner" line, or the pair image). Could the two be mixed up? If yes, reject.
4. Clean: one object, plain background, no text, no letters, no logos, no recognisable character, no thick outlines; only the listed colours.
5. Right file: square 1024 x 1024 PNG, file name follows `lane1-<n>-<letterId>.png`, saved only in `docs/drafts/inbox/lane1/`.

Pass all five or regenerate. Before promotion, run `node tools/drafts/check_inbox.mjs` (PNG only, 256 to 4096 px a side, at most 6 MiB, no metadata chunks; strip metadata with `tools/meta/strip.mjs`). Nothing here is a native-reader check.
