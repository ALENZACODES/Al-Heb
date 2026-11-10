"""Gold-leaf lettering stills rendered from the real Hebrew font (Frank Ruhl Libre), so every letter and vowel mark is the font's own.
Usage: python tools/images/gold_lettering.py OUT_DIR   (needs Python Playwright and a Chromium/Chrome install)
Writes transparent PNGs; convert to WebP for shipping. Add lines to ITEMS; never put a divine name in a still."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
FONT = (ROOT / 'assets/fonts/web/frank-ruhl-libre.woff2').as_uri()
CSS = """
@font-face{font-family:FRL;src:url('%s') format('woff2');font-weight:300 900}
html,body{margin:0;background:transparent}
.w{display:grid;place-items:center;width:%dpx;height:%dpx}
.t{font-family:FRL;font-weight:700;font-size:%dpx;line-height:1.25;direction:rtl;text-align:center;
 background:linear-gradient(170deg,#fff6d8 0%%,#f3dfa6 18%%,#d9a441 42%%,#a8741f 58%%,#e8c97a 72%%,#fff4d0 86%%,#c9952f 100%%);
 -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
 filter:drop-shadow(0 2px 0 #7a5212) drop-shadow(0 0 22px rgba(243,223,166,.55)) drop-shadow(0 10px 18px rgba(0,0,0,.35))}
"""
ITEMS = [("aleph-wordmark", "אָלֶף", 1024, 512, 260),
         ("mah-tovu-line1", "מַה־טֹּבוּ אֹהָלֶיךָ יַעֲקֹב", 1536, 512, 150),
         ("modeh-ani-opening", "מוֹדֶה אֲנִי", 1536, 512, 190)]
async def main(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        for name, txt, w, h, fs in ITEMS:
            await page.set_viewport_size({'width': w, 'height': h})
            await page.set_content(f"<style>{CSS % (FONT, w, h, fs)}</style><div class=w><div class=t lang=he>{txt}</div></div>")
            await page.evaluate("document.fonts.ready"); await page.wait_for_timeout(400)
            await page.screenshot(path=str(out / f'{name}.png'), omit_background=True)
        await b.close()
if __name__ == '__main__':
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'gold-lettering'))
