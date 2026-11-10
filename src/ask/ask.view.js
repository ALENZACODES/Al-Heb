// Ask the Torah (#/ask): a talk messenger for scripture questions.
// The view is loaded lazily by the router and is not in the first-install precache.
import { h, heSpan } from '../shell/ui.js';
import { INTRO, OFFLINE_COPY, PLACEHOLDER, apiUrl, configured, passageHref } from './model.js';

const style = `
.ask-torah { max-width: 40rem; }
.ask-torah .ask-log { display: flex; flex-direction: column; gap: 0.85rem; margin: 1rem 0; }
.ask-torah .ask-msg { border-radius: 0.75rem; padding: 0.8rem 1rem; }
.ask-torah .ask-msg.user { background: var(--card, #f4efe4); margin-left: 2rem; }
.ask-torah .ask-msg.bot { background: var(--bg-2, #fffdf6); border: 1px solid var(--line, #e4d8be); }
.ask-torah .ask-verdict { font-weight: 650; margin: 0 0 0.4rem; }
.ask-torah .ask-passage { margin: 0.75rem 0 0; padding: 0.6rem 0 0; border-top: 1px solid var(--line, #e4d8be); }
.ask-torah .ask-he { font-size: 1.15rem; line-height: 1.6; }
.ask-torah form.ask-form { display: flex; gap: 0.5rem; }
.ask-torah form.ask-form input { flex: 1; }
.ask-torah .ask-pending { font-style: italic; }
`;

function passageBlock(p) {
  const href = passageHref(p);
  const link = href
    ? h('p', {}, h('a', { href, class: 'alef-link' }, p.link_label || (href.startsWith('#/') ? 'Read this passage in Aleph' : 'Read this passage on Sefaria')))
    : null;
  return h('div', { class: 'ask-passage' },
    h('p', {}, h('strong', {}, p.ref || '')),
    p.he ? h('p', { class: 'ask-he', lang: 'he', dir: 'rtl' }, heSpan(p.he, 'he')) : null,
    p.en ? h('p', {}, p.en) : null,
    link);
}

function laterBlock(p) {
  const href = p.href || null;
  const link = href ? h('p', {}, h('a', { href, class: 'alef-link', target: href.startsWith('http') ? '_blank' : null, rel: href.startsWith('http') ? 'noopener' : null }, 'Open the cited source')) : null;
  return h('div', { class: 'ask-passage' },
    h('p', {}, h('strong', {}, p.ref || 'Later source')),
    p.text ? h('p', {}, p.text) : null,
    p.note ? h('p', { class: 'muted' }, p.note) : null,
    link);
}

function botView(ans) {
  if (!ans) return h('p', { class: 'muted' }, 'No answer came back.');
  if (ans.declined || ans.verdict === 'off_topic') {
    return h('div', {}, h('p', { class: 'ask-verdict' }, ans.verdict_text || ''), h('p', {}, ans.explanation || ''));
  }
  return h('div', {},
    h('p', { class: 'ask-verdict' }, ans.verdict_text || ''),
    h('p', {}, ans.explanation || ''),
    ...(ans.passages || []).map(passageBlock),
    ...(ans.later_sources || []).map(laterBlock));
}

export function mount(root, ctx) {
  const env = ctx?.window || globalThis;
  const log = h('div', { class: 'ask-log', 'aria-live': 'polite' });
  const input = h('input', { type: 'search', id: 'ask-q', name: 'q', maxlength: '2000', placeholder: PLACEHOLDER, autocomplete: 'off', 'aria-label': 'Your question' });
  const send = h('button', { type: 'submit', class: 'btn' }, 'Ask');
  const form = h('form', { class: 'ask-form' }, input, send);
  const status = h('p', { class: 'muted ask-status' }, configured(env) ? '' : OFFLINE_COPY);

  const add = (who, node, text) => {
    const el = h('div', { class: `ask-msg ${who}` }, node || h('p', {}, text || ''));
    log.append(el);
    try { el.scrollIntoView({ block: 'nearest' }); } catch { /* ignore */ }
    return el;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = String(input.value || '').trim();
    if (!q) return;
    input.value = '';
    add('user', null, q);
    if (!configured(env)) {
      add('bot', h('p', {}, OFFLINE_COPY));
      return;
    }
    const pending = add('bot', h('p', { class: 'ask-pending' }, 'Looking up verses…'));
    try {
      const r = await fetch(apiUrl(env) + '/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!r.ok) throw new Error('bad status');
      const ans = await r.json();
      pending.replaceWith(h('div', { class: 'ask-msg bot' }, botView(ans)));
    } catch {
      pending.replaceWith(h('div', { class: 'ask-msg bot' }, h('p', {}, OFFLINE_COPY)));
    }
  });

  root.replaceChildren(h('article', { class: 'stack ask-torah' },
    h('style', {}, style),
    h('header', {},
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Ask the Torah'),
      h('p', { class: 'muted' }, INTRO)),
    log, status, form));
  try { input.focus(); } catch { /* ignore */ }
  return () => {};
}
