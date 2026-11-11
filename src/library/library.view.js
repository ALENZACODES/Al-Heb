// Library (#/library, #/library/:id): Aleph's own short articles on Jewish life, each with its Hebrew words and sources.
import { h, heSpan } from '../shell/ui.js';

const URL_ = new URL('../../data/library/articles.json', import.meta.url);
const VIDEOS = new URL('../../data/videos/letters.json', import.meta.url);
const GROUPS = [
  { title: 'Jewish Life and Prayer', ids: ['reform-judaism', 'shabbat-at-home', 'how-a-service-flows', 'torah-portions', 'how-hebrew-came-back'] },
  { title: 'The Jewish Year', ids: ['jewish-calendar', 'high-holy-days', 'sukkot', 'hanukkah', 'purim', 'passover-seder', 'shavuot'] },
];

const CSS = `
.lib{max-inline-size:42rem;margin-inline:auto}
.lib h1{margin-block:.2em .3em}
.lib-sub{color:var(--muted,#5d6b60)}
.lib-group{margin-block:1.2rem}
.lib-list{list-style:none;padding:0;display:grid;gap:.6rem}
.lib-card{display:block;background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-inline-start:6px solid #d4a647;border-radius:14px;padding:.8rem .9rem;text-decoration:none;color:inherit}
.lib-card:hover{box-shadow:0 3px 12px #1e46341f}
.lib-card b{display:block;font-size:1.08rem;color:inherit}
.lib-card span{font-size:.92rem;color:var(--muted,#5d6b60)}
.lib-art{font-size:1.06rem;line-height:1.65}
.lib-art h2{font-size:1.2rem;color:#1e4634;margin-block:1.4rem .4rem}
.lib-meta{color:var(--muted,#5d6b60);font-size:.9rem}
.lib-lede{font-size:1.12rem;color:#3b4a3f}
.lib-terms{background:#1e4634;color:#fffaf0;border-radius:16px;padding:.8rem 1rem;margin-block:1rem;border:2px solid #d4a647}
.lib-terms h2{color:#f2d27c;margin:0 0 .4rem;font-size:1rem}
.lib-terms ul{list-style:none;padding:0;margin:0;display:grid;gap:.45rem}
.lib-terms li{display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap}
.lib-terms .he{font-size:1.45rem;color:#fffaf0}
.lib-terms .tr{font-weight:700;color:#f2d27c}
.lib-try{display:inline-flex;min-block-size:48px;align-items:center;padding:.5rem 1.2rem;border-radius:999px;background:#e9c46a;color:#163527;font-weight:800;text-decoration:none;box-shadow:0 3px 0 #b38a2e;margin-block:1rem}
.lib-nav{display:flex;justify-content:space-between;gap:1rem;margin-block:1.4rem;flex-wrap:wrap}
.lib-vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.7rem;margin-block:1rem}
.lib-vid{background:#163527;border-radius:14px;overflow:hidden;border:2px solid #d4a647;margin:0}
.lib-vid video{display:block;inline-size:100%;aspect-ratio:1;background:#163527}
.lib-vid figcaption{color:#fffaf0;font-weight:700;padding:.35rem .6rem;display:flex;justify-content:space-between;align-items:center}
.lib-vid figcaption .he{color:#f2d27c;font-size:1.3rem}
.lib-feature{display:flex;gap:.8rem;align-items:center;background:#1e4634;color:#fffaf0;border-radius:14px;padding:.7rem .9rem;text-decoration:none;border:2px solid #d4a647;margin-block:1rem}
.lib-feature b{color:#f2d27c;display:block}
.lib-src{font-size:.78rem;color:#56635a;margin-block-start:1.6rem}
.lib-src summary{cursor:pointer;min-block-size:44px;display:flex;align-items:center}
.lib-src ol{padding-inline-start:1.2rem}
.lib-src a{color:inherit}
`;
function style(doc) { if (doc && !doc.getElementById('lib-css')) { const s = doc.createElement('style'); s.id = 'lib-css'; s.textContent = CSS; doc.head.append(s); } }

let cache = null;
async function load(ctx) {
  if (cache) return cache;
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(URL_);
  if (!res.ok) throw new Error('library did not load');
  cache = (await res.json()).articles;
  return cache;
}

function hub(wrap, arts) {
  const byId = new Map(arts.map((a) => [a.id, a]));
  const card = (a) => h('li', {}, h('a', { class: 'lib-card', href: `#/library/${a.id}` }, h('b', {}, a.title), h('span', {}, `${a.summary} · ${a.minutes} min`)));
  const listed = new Set(GROUPS.flatMap((g) => g.ids));
  const rest = arts.filter((a) => !listed.has(a.id));
  wrap.replaceChildren(
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Library ', heSpan('סִפְרִיָּה', 'he')),
    h('p', { class: 'lib-sub' }, 'Short reads on Jewish life, written for adults starting out. Each one teaches a few Hebrew words and ends with something to try in ALEF.'),
    h('a', { class: 'lib-feature', href: '#/library/letter-videos' }, h('span', { 'aria-hidden': 'true', style: 'font-size:2rem' }, '▶'), h('span', {}, h('b', {}, 'Letter Videos'), 'Watch each letter drawn stroke by stroke, then hear its name and sound.')),
    ...GROUPS.map((g) => h('section', { class: 'lib-group' }, h('h2', {}, g.title), h('ul', { class: 'lib-list' }, ...g.ids.map((id) => byId.get(id)).filter(Boolean).map(card)))),
    rest.length ? h('section', { class: 'lib-group' }, h('h2', {}, 'More'), h('ul', { class: 'lib-list' }, ...rest.map(card))) : '');
}

function article(wrap, arts, id) {
  const i = arts.findIndex((a) => a.id === id), a = arts[i];
  if (!a) { wrap.replaceChildren(h('h1', { id: 'view-title', tabindex: '-1' }, 'Article Not Found'), h('p', {}, h('a', { href: '#/library' }, 'See the whole Library'))); return; }
  const order = GROUPS.flatMap((g) => g.ids).filter((x) => arts.some((y) => y.id === x));
  const k = order.indexOf(id), prev = arts.find((x) => x.id === order[k - 1]), next = arts.find((x) => x.id === order[k + 1]);
  wrap.replaceChildren(h('article', { class: 'lib-art' },
    h('p', {}, h('a', { href: '#/library' }, '← Library')),
    h('h1', { id: 'view-title', tabindex: '-1' }, a.title),
    h('p', { class: 'lib-meta' }, `${a.minutes} minute read`),
    h('p', { class: 'lib-lede' }, a.summary),
    h('aside', { class: 'lib-terms', 'aria-label': 'Hebrew words in this article' }, h('h2', {}, 'Hebrew Words in This Article'),
      h('ul', {}, ...a.terms.map((t) => h('li', {}, heSpan(t.he, 'he'), h('span', { class: 'tr' }, t.tr), h('span', {}, t.en))))),
    ...a.sections.flatMap((s) => [h('h2', {}, s.heading), ...s.paras.map((p) => h('p', {}, p))]),
    a.tryIt ? h('a', { class: 'lib-try', href: a.tryIt.href }, a.tryIt.label) : '',
    h('nav', { class: 'lib-nav', 'aria-label': 'More articles' }, prev ? h('a', { href: `#/library/${prev.id}` }, `← ${prev.title}`) : h('span'), next ? h('a', { href: `#/library/${next.id}` }, `${next.title} →`) : h('span')),
    h('details', { class: 'lib-src' }, h('summary', {}, 'Sources'),
      h('ol', {}, ...a.references.map((r) => h('li', {}, h('a', { href: r.url, rel: 'noopener', target: '_blank' }, r.title), `, ${r.publisher}`))))));
}

async function videos(wrap, ctx) {
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(VIDEOS);
  if (!res.ok) throw new Error('videos did not load');
  const voice = ctx.settings?.get?.('voice') === 'f' ? 'f' : 'm';
  const all = (await res.json()).videos;
  const list = all.some((v) => v.voice === voice) ? all.filter((v) => v.voice === voice) : all.filter((v) => v.voice === all[0]?.voice);
  wrap.replaceChildren(
    h('p', {}, h('a', { href: '#/library' }, '← Library')),
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Letter Videos ', heSpan('סִרְטוֹנִים', 'he')),
    h('p', { class: 'lib-sub' }, 'Each letter is drawn in the order you write it, then you hear its name and its sound. Watch, then trace it yourself on the Letters screen.'),
    h('div', { class: 'lib-vids' }, ...list.map((v) => h('figure', { class: 'lib-vid' },
      h('video', { src: v.src, poster: v.poster, controls: '', preload: 'none', playsinline: '', 'aria-label': `${v.name}: drawn stroke by stroke, then its name and sound` }),
      h('figcaption', {}, h('span', {}, v.name), heSpan(v.he, 'he'))))),
    h('a', { class: 'lib-try', href: '#/letters' }, 'Trace the letters'));
}

export function mount(root, ctx) {
  style(globalThis.document);
  const wrap = h('div', { class: 'lib' });
  root.replaceChildren(wrap);
  const id = ctx.params?.id || ctx.query?.article;
  if (id === 'letter-videos') {
    videos(wrap, ctx).catch(() => wrap.replaceChildren(h('h1', { id: 'view-title', tabindex: '-1' }, 'Letter Videos'), h('p', { role: 'alert' }, 'The videos could not load. Check your connection, then reload the page.')));
    return () => {};
  }
  load(ctx).then((arts) => (id ? article(wrap, arts, id) : hub(wrap, arts)))
    .catch(() => wrap.replaceChildren(h('h1', { id: 'view-title', tabindex: '-1' }, 'Library'), h('p', { role: 'alert' }, 'The Library could not load. Check your connection, then reload the page.')));
  return () => {};
}
