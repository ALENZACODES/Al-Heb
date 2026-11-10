# Camera overlay style — what looks best, and what ALEF will use

John asked for “a very cool writing look” on camera translation: English written *on* the photo of a Hebrew sign, in the style that reads best. This note compares how the leading camera translators draw that text, then picks one default and one optional ALEF look.

## What the leading apps actually do

### Google Lens / Google Translate camera (best “printed on the sign” look)

Older Lens and Translate camera modes painted **opaque colour blocks** (Word Lens–style plates) over each line, then set the translation in a generic sans on top. That was readable, but it hid the sign and looked like stickers.

Since the 2022 AR Translate / Magic Eraser work, and in the 2025 Lens Translator write-ups, Google **erases the original letters, inpaints the background, and typesets the translation to match the source’s size, colour, and typography**, so the new words look as if they were printed on the sign. You can still “show original text.” The pipeline is: detect → OCR → erase/inpaint → fit and paint text. Inpainting is easy on flat painted signs and harder on photos, gradients, and tight letter-spacing (a too-tight mask leaves ghost strokes; a too-wide mask smears neighbours).

Sources:

- [Google Lens getting AR Translate](https://9to5google.com/2022/09/28/google-lens-ar-translate/) (9to5Google, 28 Sep 2022) — Magic Eraser-style swap, text matches original style, ~100 ms.
- [Google Lens replaces the camera tool in Google Translate](https://9to5google.com/2022/12/05/google-lens-translate-camera/) (9to5Google, 5 Dec 2022) — overlay vs. later inpaint; “Show original text.”
- [What’s new in Google Lens Translator](https://en.androidguias.com/news-for-google-lens-translator/) (Android Guías, updated 6 May 2025) — coloured boxes removed; font, size, and colour adapted so the translation “appears to be part of the original image.”
- [How AI image translation works: 3 methods compared](https://translatemyimage.com/blog/how-ai-image-translation-works) — camera overlay vs. OCR + inpaint + retype vs. full generative redraw; failure modes of each.

### Apple Live Text / Translate camera

Apple’s Translate **Camera** tab (Live Text) draws the translation **over** the detected line. You freeze the frame, tap a line for a card (copy, save, listen to original or translation). MacStories’ side-by-side with Google is blunt: Apple’s plates **can obstruct the photo and feel visually distracting**; Google is better at *integrating* the new text into the image. Live Text in Camera itself uses a **yellow detection frame**, then system text selection — a reader overlay, not a reprinted sign.

Sources:

- [Use the camera in the Translate app on iPhone](https://support.apple.com/guide/iphone/translate-with-the-camera-iphea8b95631/ios) (Apple Support) — overlay, freeze, tap for copy/save/play.
- [Translate with the camera view on iPad](https://support.apple.com/guide/ipad/translate-with-the-camera-ipad889c9271/ipados) (Apple Support) — tap overlay → translation card, listen to original or translation.
- [Use Live Text with your iPhone camera](https://support.apple.com/guide/iphone/use-live-text-iphcf0b71b0e/ios) (Apple Support) — yellow frame around detected text.
- [Is Apple’s Translate app still getting lost in translation?](https://www.macstories.net/reviews/is-apples-translate-app-still-getting-lost-in-translation/) (MacStories) — overlays “pale in comparison to Google Translate.”
- [Design critique: Translate (iPhone app)](https://ixd.prattsi.org/2026/09/design-critique-translate-iphone-app/) (IXD@Pratt, Sep 2026) — camera is one-way source→target; status hints use noticeable colour and opacity without blocking the subject.

### DeepL (image in the mobile apps)

DeepL **overlays translated text on the original**. It is built for “read this now,” with a control to **disable the overlay**, select all to see original and translation separately, rotate, and copy. DeepL’s public help does **not** describe inpainting, colour sampling, or font matching. That usually means a high-contrast plate or direct overlay — readable, less “printed on the sign.”

Source: [Translate text from an image in the mobile apps](https://support.deepl.com/hc/en-us/articles/4408415322130-Translate-text-from-an-image-in-the-mobile-apps) (DeepL Help Center).

### Papago (closest engineering write-up of “best looking”)

Naver Papago’s image / AR translate is the most explicit published recipe, and it agrees with modern Lens:

1. OCR, then group letters into sentences/paragraphs (HTS).
2. **Inpaint** the original strokes (they moved off solid “construction-paper” plates because those looked fake).
3. **Sample letter colour from the stroke mask**, not a crude mode of the whole box (thin strokes otherwise pick up the background).
4. **Boost contrast** against the inpainted background until the pair meets a contrast-ratio bar (shadows and blurry photos were failing).
5. Keep the **original alignment** (left / centre / right) — early “always left” broke Hebrew-style and right-aligned signs.
6. **Auto-fit** into a renderable area: shrinking to the old box made some translations unreadably small; they now infer a slightly larger legal area, still inside the sign.

Font matching is still called out as ongoing research. A clean, heavy sans is the practical choice when the source font cannot be cloned.

Sources:

- [Papago text-rendering development notes](https://20may.tistory.com/entry/이미지-번역-파파고-텍스트-렌더링-개발기) (DEVIEW talk write-up) — inpaint, colour, alignment, renderable area, contrast ratio.
- [How Papago became a travel essential (DEVIEW 2023)](https://www.techm.kr/news/articleView.html?idxno=107311) (TechM) — GAN inpainting of strokes; contrast-ratio colour; alignment from baselines.
- [Papago Image Translation](https://www.fin-ncloud.com/product/aiService/papagoImageTranslation) (Naver Cloud) — Text Editing = inpainting + rendering, keeping position, colour, and size.
- [Papago, the global translator…](https://www.navercorp.com/en/story/storyDetail?seq=31988) (Naver Corp.) — instant image + AR; ECCV 2022 inpainting paper.

## The pick

**Default: Google Lens–style “printed on the sign.”** It is what people now expect, it is what MacStories judged more attractive than Apple’s plates, and it is the same pipeline Papago documented in detail.

How ALEF will draw a line of translation:

| Step | What we do | Why |
|---|---|---|
| Erase | Inpaint (TELEA or a small LaMa-style pass) inside a **slightly dilated** letter/box mask | Removes Hebrew strokes without a solid sticker. Dilation hides ghost serifs; too much dilation is avoided so adjacent graphics stay sharp. |
| Colour | Sample **ink** from the original stroke pixels, **paint** from a ring around the box; then raise the ink’s contrast against the inpainted paint until it meets at least **WCAG 3:1** (4.5:1 when we can) | Looks like the shop’s own lettering, but stays readable in glare and shadow (Papago’s lesson). |
| Type | Self-hosted **Noto Sans** (and **Noto Sans Hebrew** when the source is still shown). Optional **Inter**. Weight **600–700**, tight but not cramped tracking, slightly tighter leading than body copy | License-safe; a modern grotesque reads as “sign painting” at small sizes better than a thin UI font. We do not ship Inter/Noto from a CDN. |
| Fit | Binary-search font size so the English (LTR, centred if the Hebrew was centred) fits the box; if it would drop below a readable floor (~14 px on the photo), grow the plate by a few pixels *inside the sign* rather than shrinking into mud | Same problem Papago solved when English is longer than Hebrew. |
| Depth | A **1-px hairline shadow or incised edge** sampled from a darker neighbour of the paint, only if the sign already has relief; otherwise flat | Fake drop shadows on a painted fascia look cheap; a hint of the sign’s own edge does not. |
| Toggle | Tap a region to flip original ⇄ translation; also a global “Original / Translated” control | Matches Lens “show original” and Apple’s per-line card, without Apple’s persistent plate. |
| Motion | A short **shimmer / wipe reveal** (about 280 ms) along the line as the translation lands. **Honour `prefers-reduced-motion`:** if reduced motion is on, the new text just appears, no shimmer. | Feels considered, not gimmicky; never required for comprehension. |

**We will not** use coloured block overlays as the default (old Lens, often Apple, often DeepL). They are a **fallback only**: if inpainting is poor (busy photo, tiny letters, low contrast), show a rounded, sampled-paint plate with high-contrast type rather than a muddy “reprint.”

## Optional premium: ALEF gold-accent

A second style, off by default, for when the user wants the app’s look rather than a perfect facsimile of the shop:

- Inpaint as above (the Hebrew still disappears).
- Type in a warm off-white (`#FFF6E4`) or rich ink, with a **thin gold hairline** (`#C9A227`–`#E8C547`) under the baseline or as a 1-px stroke on the caps — not a gold fill on the letters (that fails on small signs).
- No mascot, no logo on the photo, no sparkle particles. The shimmer, if motion is allowed, uses the same gold highlight.

This is a display option, not the commercial default. Storefront photos should still look like the storefront.

## Divine Name and metadata

Never render the four-letter Name on a photo (hold the region, do not inpaint-and-replace it with a spoken substitute on the sign). Strip EXIF and other metadata from every uploaded and returned image. Do not keep photos on the server.

## Sample images

Three synthetic before/after pairs (optical store, bakery, exit) will be generated with this renderer and attached to the camera backtest report, with EXIF stripped. They illustrate: (1) default reprinted ink on a flat fascia, (2) the contrast-boost path on a darker sign, (3) the optional gold-accent style on the same photo.
