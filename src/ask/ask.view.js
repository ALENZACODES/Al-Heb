// Ask the Torah (#/ask): questions about the Torah, answered from Aleph's vetted answer bank. No server: the bank
// (data/ask/bank.json, topics.json, answers/NN.json) is built offline by tools/ask-torah/build_static.py from the same pipeline the
// 10,000-question backtest and the independent judge scored, and is fetched only when this page opens (never in the first install).
// src/ask/match.js maps a question to the closest vetted one, or to nothing: then the page says it has no vetted answer yet and never
// guesses a verse. A named verse with no note in the bank is shown as the verse itself. The Name is shown as ה׳, never spelled or voiced.
// Rimon does not appear here: like the prayer pages, this is a quiet place for the text itself.
// Deep links: #/ask?q=What%20does%20Genesis%202%3A4%20say%3F asks at once (the Torah reader's "Ask" button uses this).
import { h, heSpan, medal } from '../shell/ui.js';
import { INTRO, PLACEHOLDER, passageHref } from './model.js';
import { buildIndex, buildTopics, lookup, parseRef, shardOf } from './match.js';

export const NO_ANSWER = 'I don’t have a vetted Torah answer for that yet. Try naming a person, a law, a festival or a verse, or pick one of the questions below.';
export const LOADING = 'Getting the answers ready…';
export const LOAD_FAILED = 'The answers could not load. Check your connection and open this page again; nothing you typed was sent anywhere.';
export const STARTERS_FALLBACK = ['Is the Shema in the Torah?', 'Where does the Torah talk about Shabbat?', 'Is Hanukkah in the Torah?', 'Where is the Priestly Blessing?', 'What does the Torah say about kosher food?', 'Who was Miriam?'];
const NAME_RE = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה[֑-ׇ]*/g;
export const noName = (s) => String(s || '').replace(NAME_RE, 'ה׳');
const BOOK_EN = { genesis: 'Genesis', exodus: 'Exodus', leviticus: 'Leviticus', numbers: 'Numbers', deuteronomy: 'Deuteronomy' };

const style = `
.ask-torah { max-width: 40rem; }
.ask-torah .ask-hero { display: flex; gap: .9rem; align-items: center; margin: .4rem 0 .8rem; }
.ask-torah .ask-hero .alef-medal { flex: none; inline-size: 3.4rem; block-size: 3.4rem; }
.ask-torah .ask-log { display: flex; flex-direction: column; gap: .85rem; margin: 1rem 0; }
.ask-torah .ask-msg { border-radius: 1rem; padding: .8rem 1rem; }
.ask-torah .ask-msg.user { background: color-mix(in srgb, var(--accent) 16%, transparent); margin-inline-start: 2rem; }
.ask-torah .ask-msg.bot { background: var(--card); border: 1px solid var(--border); }
.ask-torah .ask-verdict { font-weight: 700; margin: 0 0 .4rem; }
.ask-torah .ask-from { font-size: .85rem; margin: 0 0 .5rem; }
.ask-torah .ask-passage { margin: .75rem 0 0; padding: .6rem 0 0; border-top: 1px solid var(--border); }
.ask-torah .ask-he { font-size: 1.2rem; line-height: 1.7; }
.ask-torah .ask-form { display: flex; gap: .5rem; position: sticky; bottom: 4.2rem; padding: .5rem 0; background: var(--bg); }
.ask-torah .ask-form input { flex: 1; min-block-size: 48px; font: inherit; padding: 0 .9rem; border-radius: 14px; border: 2px solid var(--border); background: var(--card); color: var(--fg); }
.ask-torah .ask-starters { list-style: none; padding: 0; margin: .4rem 0 0; display: flex; flex-wrap: wrap; gap: .5rem; }
.ask-torah .ask-starters li { min-inline-size: 0; max-inline-size: 100%; }
.ask-torah .ask-starters button { max-inline-size: 100%; white-space: normal; text-align: start; }
.ask-torah .ask-starters button { font: inherit; font-size: .95rem; min-block-size: 44px; padding: .4rem .9rem; border-radius: 999px; cursor: pointer;
  border: 1.5px solid color-mix(in srgb, var(--accent) 60%, transparent); background: transparent; color: var(--fg); }
.ask-torah .ask-starters button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.ask-torah .ask-note { font-size: .85rem; }
`;

function passageBlock(p) {
  const href = passageHref(p);
  return h('div', { class: 'ask-passage' },
    h('p', {}, h('strong', {}, p.ref || '')),
    p.he ? h('p', { class: 'ask-he', lang: 'he', dir: 'rtl' }, noName(p.he)) : null,
    p.en ? h('p', {}, p.en) : null,
    href ? h('p', {}, h('a', { href, class: 'alef-link' }, p.link_label || (href.startsWith('#/') ? 'Read this passage in Aleph' : 'Read this passage on Sefaria'))) : null);
}
function laterBlock(p) {
  const href = p.href || null, ext = href && href.startsWith('http');
  return h('div', { class: 'ask-passage' },
    h('p', {}, h('strong', {}, p.ref || 'Later source')),
    p.text ? h('p', {}, noName(p.text)) : null,
    p.note ? h('p', { class: 'muted' }, noName(p.note)) : null,
    href ? h('p', {}, h('a', { href, class: 'alef-link', target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, 'Open the cited source')) : null);
}
/** One answer from the bank, with the vetted question it came from when the learner's words were different. */
export function answerView(ans, { from = null } = {}) {
  if (!ans) return h('p', {}, NO_ANSWER);
  return h('div', {},
    from ? h('p', { class: 'muted ask-from' }, 'Answering the closest question in Aleph’s answer bank: “', from, '”') : null,
    h('p', { class: 'ask-verdict' }, noName(ans.verdict_text || '')),
    ans.explanation ? h('p', {}, noName(ans.explanation)) : null,
    ...(ans.passages || []).map(passageBlock),
    ...(ans.later_sources || []).map(laterBlock));
}

export async function mount(root, ctx) {
  const fetchJson = ctx?.fetchJson || (async (path) => { const r = await fetch(new URL(`../../${path}`, import.meta.url)); if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  let alive = true, bank = null, ix = null, topicIx = [], rw = null;
  const history = [];
  const shardCache = new Map();
  const log = h('div', { class: 'ask-log', 'aria-live': 'polite' });
  const input = h('input', { type: 'search', id: 'ask-q', name: 'q', maxlength: '500', placeholder: PLACEHOLDER, autocomplete: 'off', 'aria-label': 'Your question about the Torah', disabled: '' });
  const send = h('button', { type: 'submit', class: 'btn', id: 'ask-send', disabled: '' }, 'Ask');
  const form = h('form', { class: 'ask-form', id: 'ask-form' }, input, send);
  const status = h('p', { class: 'muted ask-status', role: 'status' }, LOADING);
  const startersList = h('ul', { class: 'ask-starters', 'aria-label': 'Questions to start with' });
  const empty = h('section', { class: 'ask-empty', 'aria-labelledby': 'ask-try' }, h('h2', { id: 'ask-try' }, 'Try one of these'), startersList,
    h('p', { class: 'muted ask-note' }, 'Every answer here was checked before it was added. If a question has no checked answer yet, this page says so instead of guessing.'));

  const add = (who, node) => {
    const el = h('div', { class: `ask-msg ${who}` }, node);
    log.append(el);
    try { el.scrollIntoView?.({ block: 'nearest' }); } catch { /* ignore */ }
    return el;
  };
  const answerById = async (id) => {
    const n = shardOf(id, bank?.shards || 32);
    if (!shardCache.has(n)) shardCache.set(n, fetchJson(`data/ask/answers/${String(n).padStart(2, '0')}.json`));
    return (await shardCache.get(n))[id] || null;
  };
  const verseView = async (verseId) => {
    const [book, ch, v] = verseId.split('.');
    try {
      const data = await fetchJson(`data/corpus/torah/${book}/${String(ch).padStart(2, '0')}.json`);
      const vs = (data.verses || []).find((x) => Number(x.n) === Number(v));
      if (!vs) return null;
      return h('div', {},
        h('p', { class: 'ask-verdict' }, `${BOOK_EN[book] || book} ${ch}:${v}`),
        h('p', { class: 'ask-he', lang: 'he', dir: 'rtl' }, noName(vs.he)),
        h('p', {}, vs.en),
        h('p', { class: 'muted ask-note' }, 'This is the verse itself. Aleph’s answer bank has no note on it yet.'),
        h('p', {}, h('a', { class: 'alef-link', href: `#/torahreader?book=${book}&chapter=${ch}&verse=${v}` }, 'Read it in the Torah reader')));
    } catch { return null; }
  };

  async function ask(q) {
    q = String(q || '').trim();
    if (!q || !ix) return;
    empty.hidden = true;
    add('user', h('p', {}, q));
    const pending = add('bot', h('p', { class: 'muted' }, 'Looking…'));
    let node = null;
    try {
      const m = lookup({ ix, topicIx, rw }, q, history);
      if (m?.verseId) node = await verseView(m.verseId);
      else if (m?.answerId) { const ans = await answerById(m.answerId); node = ans ? answerView(ans, { from: m.exact || m.topic || !m.question || m.question.toLowerCase() === q.toLowerCase() ? null : m.question }) : null; }
    } catch { node = null; }
    history.push(q); if (history.length > 4) history.shift();
    if (!alive) return;
    pending.replaceChildren(node || h('p', {}, NO_ANSWER));
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });

  root.replaceChildren(h('article', { class: 'stack ask-torah' },
    h('style', {}, style),
    h('header', {},
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Ask the Torah ', heSpan('שְׁאֵלוֹת עַל הַתּוֹרָה')),
      h('div', { class: 'ask-hero' }, medal('home', 'ask', 54), h('p', { class: 'muted' }, INTRO))),
    empty, log, status, form));

  try {
    const [b, t] = await Promise.all([fetchJson('data/ask/bank.json'), fetchJson('data/ask/topics.json').catch(() => ({ topics: [], rewrite: null }))]);
    if (!alive) return () => {};
    bank = b; ix = buildIndex(b.questions || []); topicIx = buildTopics(t.topics); rw = t.rewrite;
    for (const s of b.starters?.length ? b.starters : STARTERS_FALLBACK) startersList.append(h('li', {}, h('button', { type: 'button', class: 'ask-starter', onclick: () => ask(s) }, s)));
    status.textContent = ''; status.hidden = true;
    input.removeAttribute?.('disabled'); send.removeAttribute?.('disabled'); input.disabled = false; send.disabled = false;
    const q = ctx?.query?.q;
    if (q) ask(q); else { try { input.focus({ preventScroll: true }); } catch { /* ignore */ } }
  } catch {
    if (alive) status.textContent = LOAD_FAILED;
  }
  return () => { alive = false; };
}

export { parseRef };
