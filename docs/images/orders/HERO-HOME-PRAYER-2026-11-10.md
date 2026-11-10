# Hero Images: Home and Opening Prayer (Art Orders, 2026-11-10)

Owner's brief, in his words: "must feel like heaven sent". Two hero images, each in two sizes: 1536 x 1024 (desktop) and 1024 x 1536 (phone). House green #16301C with gold (#D9A441, light gold #E8C97A, pale gold #F3DFA6).

## Ground rules for every image

- **No lettering in any generated image.** No Hebrew, no English, no logo, no signs, no book pages with readable text, no scroll text. Image models invent letter shapes; every letter on these screens is real text rendered by the app (the prayer, the tagline, the Aleph logo) or one of the gold lettering stills made from the real font (below). Prompts say this explicitly.
- **The gold Aleph is the logo.** It is never drawn by the image model. Rimon is the mascot only; he never replaces the logo and never wears or holds the logo.
- **Characters on-model:** Rimon: round red pomegranate, small golden crown of leaves on top with two olive-green leaves, navy-blue sash tied in a knot at the front, rosy cheeks, two dot eyes, small smile, thin red arms and legs; flat, friendly illustration style, never photoreal. Ari: man, about 30, short dark curly hair, short dark beard, warm smile, navy crew-neck tee, thin gold chain. Noa: woman, about 30, shoulder-length dark curly hair, warm smile, rust-terracotta button shirt. Ari and Noa never touch or hold a Torah scroll in these images.
- **No divine name** anywhere, in any form. No tefillin, no tallit worn by Rimon. Nothing that reads as a specific synagogue or living person.
- **Safe zones:** text sits over calm areas named in each order; keep those areas low-detail and darker so gold text stays at 4.5:1 or better.
- Deliver WebP (quality 80) plus a PNG master. Phone file under 220 KB, desktop under 320 KB.

## 1. Home hero: "The Tree of Life at First Light"

Files: `assets/img/gen/HERO_home_heaven.1536x1024.webp`, `assets/img/gen/HERO_home_heaven.1024x1536.webp`

**Composition (desktop 1536 x 1024):** an ancient olive tree on the right two-thirds, trunk golden and twisted, canopy opening upward into a soft column of light. Hills of Jerusalem stone in the far distance, misty. Foreground right: a low dry-stone wall with a woven basket of pomegranates and a few olive branches. Left third: quiet deep-green sky with faint gold dust; this is the text area. Rimon is not in the photoreal hero (he appears as the app's own animated sprite beside the welcome card).

**Composition (phone 1024 x 1536):** tree centred in the lower 60 percent, light column rising up through the top; top 35 percent is calm sky (text area for the title and tagline); bottom 12 percent darker ground (buttons sit there).

**Lighting:** pre-dawn turning to first light. One warm gold light source high behind the canopy, rays through the leaves (volumetric, gentle), rim light on the trunk; the rest of the scene in deep green shadow. Feels hushed and sacred, not dramatic.

**Palette:** shadows #0E1F12 to #16301C, mid greens #1C4023 to #2F6A3B, highlights #D9A441, #E8C97A, #F3DFA6. No blue sky, no purple.

**Text on top (rendered by the app, not in the image):** desktop left third: "Aleph" wordmark with the gold אָלֶף logo, tagline "Read Hebrew aloud. Speak it in Israel.", the Start button. Phone: the same in the top calm area.

**Prompt (desktop):**
> Ultra-realistic fine-art photograph, 1536 x 1024, landscape. An ancient olive tree with a twisted golden-brown trunk stands on the right two-thirds of the frame on a hillside of pale Jerusalem limestone, its silver-green canopy opening upward into a soft column of warm golden light at first dawn. Fine golden dust floats in the light. Distant misty hills. In the right foreground, a low dry-stone wall with a woven basket of ripe red pomegranates and a few olive sprigs. The left third of the frame is calm, deep forest-green sky (#16301C) with faint gold particles and no objects, kept dark and smooth for text. Lighting: one warm gold light source high behind the canopy, gentle volumetric rays, rim light on the bark, deep green shadows elsewhere. Palette strictly deep green #16301C to #2F6A3B and gold #D9A441 to #F3DFA6. Hushed, reverent, heavenly, award-winning landscape photography, 85 mm, f/5.6, high dynamic range, no people, no animals, no text, no letters, no symbols, no signs, no logos, no writing of any kind.

**Prompt (phone):** same wording with: "1024 x 1536, portrait. The olive tree is centred in the lower 60 percent of the frame; the column of light rises through the top; the top 35 percent is calm, dark forest-green sky (#16301C) for text; the bottom 12 percent is darker ground."

## 2. Opening prayer backdrop: "Light Over the Tents"

Files: `assets/img/gen/HERO_prayer_light.1536x1024.webp`, `assets/img/gen/HERO_prayer_light.1024x1536.webp`

The prayer page shows Mah Tovu (first visit) or Modeh Ani. The words are the point; the image is a backdrop that sits behind them at about 55 percent strength, under a green veil.

**Composition:** a wide desert valley before sunrise, rows of simple woven tents far below and small (Mah Tovu: "How goodly are your tents, O Jacob"), a faint line of distant hills, and above them a vast, soft sky where gold light gathers at the centre. Centre 60 percent of the width and the middle third of the height: smooth glowing sky with no objects (the Hebrew line, transliteration and English sit there). Bottom 15 percent: dark ground (Listen and Skip buttons). Top corners dark (Close and Don't show again).

**Lighting:** a single soft gold glow at the exact centre, as if the light is coming from behind the words; falloff to deep green at the edges (vignette). Tents lit only at their tops by the glow.

**Palette:** edges #0D1F12, mid #16301C to #1F4A2A, centre glow #E8C97A to #FFF4D0 at low intensity (so gold text still reads: the app adds a green veil and keeps the glow behind the words soft).

**Prompt (desktop):**
> Ultra-realistic cinematic photograph, 1536 x 1024. A wide, quiet desert valley just before sunrise seen from a high ridge: far below, small rows of simple woven wool tents with faint warm light at their peaks; a thin line of distant hills; above, a vast, smooth sky. At the exact centre of the sky a soft, sacred golden glow gathers, as if light is shining from behind something unseen, fading outward into deep forest green (#16301C) at the edges with a gentle vignette. The centre band of the image is smooth sky with no objects, no stars, no birds. Palette strictly deep green #0D1F12 to #1F4A2A and soft gold #E8C97A to #FFF4D0. Serene, reverent, heaven-sent, award-winning fine-art photography, long exposure softness, no people, no text, no letters, no symbols, no writing, no flags.

**Prompt (phone):** same wording with: "1024 x 1536, portrait. Tents along the bottom 20 percent; the golden glow at the centre of the frame, 45 percent from the top; top corners and bottom 15 percent dark."

## Real text vs image

| Element | How it is made | Why |
|---|---|---|
| Prayer lines (Hebrew with vowel marks) | Live text, Frank Ruhl Libre, gold leaf in CSS (`assets/css/polish.css`, section 13) | Every letter and mark exact, readable aloud by screen readers, crisp at any size |
| Transliteration and English | Live text | Same |
| Aleph logo אָלֶף | Live text in the header today; the gold lettering still below for store art and splash | Exact glyphs |
| Tagline, buttons | Live text | Same |
| Gold lettering stills (store art, social cards, splash) | Rendered from the real font by `tools/images/gold_lettering.py` (headless Chrome, transparent background) | Exact glyphs; never an image model |
| Tree, light, tents, sky | Generated images (orders above) | No text in them |

## Gold lettering stills (made, from the real font)

In `docs/images/orders/hero-2026-11-10/` (transparent WebP, rendered with headless Chrome from Frank Ruhl Libre 700, so the shapes are the font's own):

- `gold-aleph-wordmark.webp` (1024 x 512): אָלֶף
- `gold-mah-tovu-line1.webp` (1536 x 512): מַה־טֹּבוּ אֹהָלֶיךָ יַעֲקֹב
- `gold-modeh-ani-opening.webp` (1536 x 512): מוֹדֶה אֲנִי

Look: vertical gold-leaf gradient (#FFF6D8 to #D9A441 to #A8741F and back to light), a 2 px darker gold edge underneath for depth, a soft pale-gold halo and a faint drop shadow. For review by a Hebrew reader before any public use. No still contains a divine name.

## Gold glow on the prayer page (built)

`assets/css/polish.css`, section 13: the Hebrew line is a gold gradient clipped to the letters. On open it brightens once over 2.6 s (dawn), then a slow sheen of light crosses the words every 9 s. With reduced motion or calm mode: steady gold with a soft halo, no movement. Forced colours: plain system text. Contrast: the darkest gold stop is 6.3:1 on #16301C and 4.5:1 on the lighter centre of the backdrop.

When the backdrop images land, add them under the existing gradient, with the green veil on top so the gold text keeps its contrast:

```css
.prayer-veil {
  background:
    radial-gradient(60% 45% at 50% 45%, rgba(22, 48, 28, .35), rgba(13, 31, 18, .82) 100%),
    image-set(url("../img/gen/HERO_prayer_light.1536x1024.webp") 1x) center / cover no-repeat,
    #16301c;
}
@media (max-width: 700px) and (orientation: portrait) {
  .prayer-veil { background:
    radial-gradient(70% 40% at 50% 45%, rgba(22, 48, 28, .35), rgba(13, 31, 18, .82) 100%),
    url("../img/gen/HERO_prayer_light.1024x1536.webp") center / cover no-repeat, #16301c; }
}
```

The home hero swaps in through `src/shell/astral-tree.js` (`ANCIENT_TREE_SRC` and `ANCIENT_TREE_MOBILE_SRC`) once the files exist; the tests in `tests/home.hero.test.js` check the files ship.
