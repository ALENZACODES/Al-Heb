// Real-browser check of the Israel views at 390x844 (headless Chromium, no real phone). NOT part of `node --test`.
// Usage: node tests/israel.shot.mjs   -> docs/israel/shots/*.png and docs/israel/shots/report.json
// The shell router is patched IN MEMORY (page.route) to add the two route lines from docs/israel/README.md; no shell file is edited.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAppServer } from "../tools/serve.mjs";

const require = createRequire(import.meta.url);
let chromium;
for (const p of ["playwright", "/opt/npm-tools/node_modules/playwright", "/usr/lib/node_modules/playwright"]) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error("playwright not found"); process.exit(2); }
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = join(root, "docs/israel/shots"); mkdirSync(out, { recursive: true });
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); page.on("pageerror", (e) => errors.push(String(e)));
const ROUTE = "  { name: 'israel', pattern: '/israel', module: '../israel/israel.view.js', title: 'Sound like a local', owner: 'lane10', optional: true, group: 'learn', quick: 'nav.israel' },\n  { name: 'israelsec', pattern: '/israel/:sec', module: '../israel/israel.view.js', title: 'Sound like a local', owner: 'lane10', paramQuery: { sec: 'sec' } },\n";
await page.route("**/src/shell/router.js", async (r) => { const t = await (await r.fetch()).text(); await r.fulfill({ body: t.replace("  { name: 'about',", ROUTE + "  { name: 'about',"), contentType: "text/javascript" }); });
await page.route("**/src/shell/views.generated.js", async (r) => { const t = await (await r.fetch()).text(); await r.fulfill({ body: t.replace('"vocab/vocab.view.js"', '"vocab/vocab.view.js","israel/israel.view.js"'), contentType: "text/javascript" }); });
const report = {};
async function shot(name, hash, act) {
  await page.goto(base + "#" + hash); await page.waitForSelector("#view-title", { timeout: 5000 }); await page.waitForTimeout(500);
  if (act) await act();
  const m = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth, h1: document.querySelector("h1")?.textContent,
    smallTargets: [...document.querySelectorAll("main button, main a, main select")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 43 || r.width < 43) && getComputedStyle(e).display !== "inline"; }).map((e) => (e.textContent || "").trim().slice(0, 30)),
    hebrewNotRtl: [...document.querySelectorAll('[lang="he"]')].filter((e) => e.getAttribute("dir") !== "rtl").length }));
  report[name] = { ...m, overflowX: m.scrollW > m.innerW };
  await page.screenshot({ path: join(out, name + ".png"), fullPage: false });
}
await shot("overview", "/israel");
await shot("ladder", "/israel/ladder");
await shot("ladder-gendered", "/israel/ladder", async () => { await page.locator('[data-pair="lad-hows-it-going"]').scrollIntoViewIfNeeded(); await page.locator('button[data-v="f"]').nth(1).click(); await page.waitForTimeout(200); await page.locator('[data-pair="lad-hows-it-going"]').scrollIntoViewIfNeeded(); });
await shot("fillers", "/israel/fillers");
await shot("giveaways", "/israel/giveaways", async () => { await page.locator('[data-giveaway="gv-noun-adj"] .il-opt').nth(1).click(); await page.locator('[data-giveaway="gv-noun-adj"]').scrollIntoViewIfNeeded(); });
await shot("say-question", "/israel/say?seed=5");
await shot("say-answered", "/israel/say?seed=5", async () => { await page.locator(".il-opt").nth(0).click(); await page.waitForTimeout(200); await page.locator("#il-next").scrollIntoViewIfNeeded(); });
await shot("etiquette", "/israel/etiquette");
report.consoleErrors = errors;
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await browser.close(); server.close();
