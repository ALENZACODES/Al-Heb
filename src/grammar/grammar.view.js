/**
 * Grammar notes (#/grammar and #/grammar/:topic): six short notes with examples pulled from the vocabulary list and the prayer
 * library, each followed by a six-question "pick the form" practice. Everything is DRAFT and unreviewed; the screen says so.
 * Store key "grammar.v1": { topics: { [id]: { attempts, best, last, done } } }.
 * ctx extras for tests: ctx.grammarData {words, registry, notes}, ctx.rng, ctx.query.topic (or ctx.params.topic).
 */
import { el, storeGet, storeSet } from '../curriculum/dom.js';
import { loadGrammarData } from './loader.js';
import { STORE_KEY, TOPIC_IDS, DRAFT_NOTICE, buildTopics, buildQuestions, seededRng } from './model.js';

const CSS = `
.alef-grammar{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-grammar *{box-sizing:border-box;max-inline-size:100%}
.alef-grammar .gr-list{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.alef-grammar a.gr-link,.alef-grammar button.btn{display:flex;align-items:center;min-block-size:var(--tap,48px);min-inline-size:44px;padding:.4rem .75rem;white-space:normal;text-align:start;inline-size:100%}
.alef-grammar .gr-he{font-size:1.6rem;line-height:1.5}
.alef-grammar .gr-ex{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.alef-grammar .gr-ex li{border-inline-start:4px solid currentColor;padding-inline-start:.6rem}
.alef-grammar .gr-opts{display:grid;gap:.5rem;margin-block:.75rem}
.alef-grammar .gr-opts button{font-size:1.4rem;text-align:center;justify-content:center}
.alef-grammar .gr-tag{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.alef-grammar .gr-id{font-size:.8rem;color:var(--muted,#555)}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-grammar-style')) return; const s = document.createElement('style'); s.id = 'alef-grammar-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const focusNode = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };
const he = (text, cls = 'gr-he') => el('span', { class: cls, lang: 'he', dir: 'rtl' }, text);

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  let alive = true, topics = null, saved = { topics: {} };
  const topicId = ctx?.query?.topic || ctx?.params?.topic || '';
  const wrap = el('section', { class: 'alef-grammar', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Grammar notes');
  const body = el('div', { class: 'gr-body' });
  const status = el('div', { class: 'gr-status', role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTICE), body, status);
  root.append(wrap);
  const say = (t) => { status.textContent = t; };
  const setBody = (...n) => { body.replaceChildren(...n.filter(Boolean)); };

  async function init() {
    setBody(el('p', {}, 'Loading grammar notes...'));
    try {
      const data = ctx?.grammarData || await loadGrammarData();
      topics = buildTopics(data);
      const s = await storeGet(ctx, STORE_KEY, null);
      saved = s && typeof s === 'object' && s.topics ? s : { topics: {} };
    } catch {
      if (alive) setBody(el('p', { role: 'alert' }, 'The grammar notes could not be loaded. Check your connection and reload; nothing was lost.'));
      return;
    }
    if (!alive) return;
    if (topicId && topics[topicId]) renderTopic(topics[topicId]); else if (topicId) renderMissing(); else renderList();
  }

  function renderList() {
    h1.textContent = 'Grammar notes';
    setBody(
      el('p', {}, 'Short notes on how Hebrew words are built, with real examples from the word list and the prayer library, and six practice questions each.'),
      el('ul', { class: 'gr-list' }, TOPIC_IDS.map((id) => {
        const t = topics[id], s = saved.topics?.[id];
        return el('li', {}, el('a', { class: 'btn gr-link', href: `#/grammar/${id}` },
          el('span', {}, el('strong', {}, t.title), ' - ', t.summary, s?.done ? ` Practised: best ${s.best} of ${s.total || 6}.` : '')));
      })),
    );
    say(''); focusNode(h1);
  }

  function renderMissing() {
    h1.textContent = 'Grammar notes';
    setBody(el('p', { role: 'alert' }, 'There is no grammar topic with that name.'), el('a', { class: 'btn gr-link', href: '#/grammar' }, 'Back to all grammar notes'));
    focusNode(h1);
  }

  function renderTopic(t) {
    h1.textContent = t.title;
    const rng = ctx?.rng || seededRng((Date.now() ^ (saved.topics?.[t.id]?.attempts || 0) * 7919) >>> 0);
    const examples = el('ol', { class: 'gr-ex' }, t.examples.map((e) => el('li', {},
      he(e.he), el('div', {}, e.note),
      el('div', { class: 'gr-tag' }, e.label), el('div', { class: 'gr-id' }, `id: ${e.id}`))));
    const extra = t.stats ? el('p', { class: 'muted' }, `Counted over the vocabulary list: masculine -im ${t.stats.mIm}, masculine -ot ${t.stats.mOt}, feminine -ot ${t.stats.fOt}, feminine -im ${t.stats.fIm}.`) : null;
    const start = el('button', { type: 'button', class: 'btn', id: 'gr-start', onclick: () => practise(t, rng) }, 'Start 6 practice questions');
    setBody(
      el('p', { class: 'gr-tag' }, `Labels: ${t.labels.join(', ')}. Rule-based means worked out from a vocabulary field by a rule; corpus-attested means found in a prayer or Torah line (id shown).`),
      el('h2', {}, 'The idea'), el('p', {}, t.explanation),
      el('h2', {}, 'Six examples'), examples, extra,
      el('h2', {}, 'Practice'), t.examples.length < 6 ? el('p', { class: 'muted' }, 'Fewer than six examples could be built from the current data.') : null, start,
      el('p', {}, el('a', { href: '#/grammar' }, 'All grammar notes')));
    say(''); focusNode(h1);
  }

  function practise(t, rng) {
    const qs = buildQuestions(t, rng);
    if (!qs.length) { setBody(el('p', { role: 'alert' }, 'Not enough data to build practice for this topic yet.'), el('a', { href: '#/grammar' }, 'All grammar notes')); return; }
    let qi = 0, right = 0, answered = false;
    const show = () => {
      const q = qs[qi]; answered = false;
      const fb = el('p', { class: 'gr-fb', role: 'status', 'aria-live': 'polite' });
      const nextBtn = el('button', { type: 'button', class: 'btn', id: 'gr-next', hidden: true, onclick: () => { qi++; if (qi >= qs.length) finish(); else show(); } }, qi === qs.length - 1 ? 'See result' : 'Next question');
      const opts = el('div', { class: 'gr-opts', role: 'group', 'aria-label': 'Answer choices' }, q.options.map((o, i) => el('button', {
        type: 'button', class: 'btn gr-opt', lang: 'he', dir: 'rtl', 'data-i': i,
        onclick: (ev) => {
          if (answered) return; answered = true;
          const ok = i === q.answer; if (ok) right++;
          fb.textContent = (ok ? 'Right. ' : 'Not quite. The answer is ' + q.options[q.answer] + '. ') + q.explain;
          nextBtn.removeAttribute?.('hidden'); nextBtn.hidden = false;
          for (const b of opts.children) b.setAttribute('aria-disabled', 'true');
          focusNode(nextBtn);
        },
      }, o)));
      setBody(el('p', { class: 'gr-tag' }, `Question ${qi + 1} of ${qs.length}`), el('p', { id: 'gr-prompt' }, q.prompt), opts, fb, nextBtn);
      say(`Question ${qi + 1} of ${qs.length}`);
    };
    const finish = async () => {
      const prev = saved.topics?.[t.id] || {};
      saved = { ...saved, topics: { ...saved.topics, [t.id]: { attempts: (prev.attempts || 0) + 1, best: Math.max(prev.best || 0, right), total: qs.length, last: right, done: true } } };
      await storeSet(ctx, STORE_KEY, saved);
      if (!alive) return;
      setBody(el('h2', {}, `You got ${right} of ${qs.length}`), el('p', {}, 'Wrong answers cost nothing. Read the examples again and try a fresh set.'),
        el('button', { type: 'button', class: 'btn', id: 'gr-again', onclick: () => renderTopic(t) }, 'Back to the note'), el('a', { class: 'btn gr-link', href: '#/grammar' }, 'All grammar notes'));
      say(`Finished: ${right} of ${qs.length}`);
    };
    show();
  }

  init();
  return () => { alive = false; if (wrap.parentNode) wrap.parentNode.removeChild(wrap); };
}
