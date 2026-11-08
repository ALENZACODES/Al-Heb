// Writes synagogues/index.html from data/synagogues/canada.json. Run: node tools/synagogues/build-page.mjs [--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const D = JSON.parse(readFileSync(join(root, 'data/synagogues/canada.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildPage() {
  const cur = D.congregations.filter((c) => c.status !== 'legacy').length;
  const sections = D.provinces.map((p) => {
    const items = D.congregations.filter((c) => c.province === p.code).map((c) => {
      const im = c.images[0];
      const pic = im ? `<img src="../assets/synagogues/${esc(c.id)}/thumb/${esc(im.file)}" alt="${esc(im.alt)}" width="240" height="160" loading="lazy">` : '';
      const legacy = c.status === 'legacy' ? ' <span class="badge">Legacy</span>' : '';
      return `<li>\n<a href="../#/synagogues/${esc(c.id)}">${pic}<span class="name">${esc(c.name)}${legacy}</span><span class="city">${esc(c.city)}</span></a>\n<p>${esc(c.summary)}</p>\n</li>`;
    }).join('\n');
    return `<section>\n<h2>${esc(p.name)}</h2>\n<ul>\n${items}\n</ul>\n</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reform synagogues in Canada</title>
<meta name="description" content="${cur} current Reform congregations across Canada, from Vancouver to Montreal, with a short history, pictures and contact details for each.">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="../assets/icons/icon.svg" type="image/svg+xml">
<style>
:root{--bg:#f6efe0;--fg:#1d2a1f;--muted:#5b665d;--card:#fffaf0;--line:#d8ccb0;--accent:#16301c}
@media (prefers-color-scheme:dark){:root{--bg:#101a13;--fg:#ece6d6;--muted:#a3ada5;--card:#16231a;--line:#2c3d30;--accent:#9fd0a8}}
body{margin:0;background:var(--bg);color:var(--fg);font:1rem/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:64rem;margin:0 auto;padding:1.5rem 1rem 3rem}
h1{font-size:1.9rem;margin:.2rem 0 .4rem}h2{margin:2rem 0 .8rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}
.lead{color:var(--muted);max-width:42rem}
ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:1rem}
li{background:var(--card);border:1px solid var(--line);border-radius:.6rem;overflow:hidden}
li a{display:block;color:inherit;text-decoration:none}li a:focus-visible,.open:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
li img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
.name{display:block;font-weight:650;padding:.6rem .8rem 0}.city{display:block;color:var(--muted);padding:0 .8rem}
li p{margin:.4rem .8rem .8rem;font-size:.92rem}
.badge{font-size:.72rem;border:1px solid var(--line);border-radius:.4rem;padding:0 .35rem;margin-left:.3rem;color:var(--muted)}
.open{display:inline-block;margin:.6rem 0;color:var(--accent);font-weight:650}
.note{color:var(--muted);font-size:.9rem;margin-top:2rem}
</style>
</head>
<body>
<main>
<h1>Reform synagogues in Canada</h1>
<p class="lead">${cur} current Reform congregations and ${D.congregations.length - cur} that have closed or no longer hold a building, from British Columbia to Quebec. Open any one for its story, more pictures, contact details and sources.</p>
<a class="open" href="../#/synagogues">Open the directory in the app</a>
${sections}
<p class="note">${esc(D.pictureNote)}</p>
<p class="note">${esc(D.sourceNote)}</p>
</main>
</body>
</html>
`;
}

const out = join(root, 'synagogues/index.html');
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const html = buildPage();
  if (process.argv.includes('--check')) {
    if (!existsSync(out) || readFileSync(out, 'utf8') !== html) { console.error('synagogues/index.html is out of date: run node tools/synagogues/build-page.mjs'); process.exit(1); }
    console.log('synagogues/index.html is current');
  } else { writeFileSync(out, html); console.log('wrote synagogues/index.html'); }
}
