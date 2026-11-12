// Prayer Practice (#/prayer-practice): one service ring, a line tutor for every service line, word decks, the fluency ladder,
// the parts roadmap and the festival outline (CODER-100 F3, F4, F5, F7, F8, F9). mount(root, ctx) -> unmount.
// ctx: { store, settings?, audio?, query?, now? }. Lazy route: this file and its model load only when the page opens (src/service/ is on
// demand). Reads only the app's own data: registry texts by id, the service orders, the gap list and the service guide.
import { h, heSpan, audioButton } from '../shell/ui.js';
import { playWithState, audioAccess } from '../shell/audio-access.js';
import { titleCase } from '../shell/title-case.js';
import { isAudioFree } from '../shell/audiofree.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { loadCorpus } from '../corpus/corpus.js';
import { loadJSON } from '../curriculum/data.js';
import { readSnapshot } from '../progress/model.js';
import { serviceRing, SERVICE_KEYS } from '../lib/counts.js';
import { loadServiceData, ORDER_IDS } from './model.js';
import { translit, practisedIds, REVIEW_LABEL } from './companion.model.js';
import {
  PRACTICE_KEY, SELF_CHECK, LADDER, NOT_YET, ARRIVING_NOTE, normalizePractice, serviceLines, serviceDeck, deckQueue, withLine, withWord, withStage,
  ladderOf, roadmap, roadmapCounts, festivalSkeleton, holidayPlan,
} from './practice.model.js';

const CSS = `
.pp { display: grid; gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.pp h2 { margin-block: .25rem; font-size: 1.2rem; }
.pp h3 { margin-block: .5rem .25rem; font-size: 1.05rem; }
.pp .pp-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.pp .btn { min-block-size: var(--tap, 48px); }
.pp .btn[aria-pressed=true] { background: var(--accent); color: var(--accent-fg); }
.pp .pp-he { font-size: 2rem; line-height: 1.8; unicode-bidi: isolate; margin: .25rem 0; }
.pp .pp-big { font-size: 3rem; line-height: 1.6; unicode-bidi: isolate; text-align: center; margin: .5rem 0; }
.pp .pp-w { font: inherit; background: none; border: 0; border-block-end: 2px dotted var(--border); padding: 0 .1rem; min-block-size: var(--tap, 48px); cursor: pointer; color: inherit; }
.pp .pp-w:focus-visible { outline: 3px solid var(--focus); }
.pp .pp-tr { font-style: italic; margin: .1rem 0; }
.pp progress { inline-size: 100%; block-size: .9rem; accent-color: var(--accent); }
.pp .pp-ring { font-size: 1.6rem; font-weight: 700; margin: 0; }
.pp .pp-stage { display: inline-block; padding: .1rem .5rem; border: 2px solid var(--border); border-radius: 6px; margin: .15rem; font-size: .9rem; }
.pp .pp-stage[data-done=true] { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.pp .pp-notyet { border-inline-start: 4px dashed var(--border); padding-inline-start: .5rem; }
.pp ul, .pp ol { padding-inline-start: 1.25rem; margin: 0; }
.pp li { margin-block: .3rem; }
.pp .small { font-size: .9rem; }
`;
const MODES = [['tutor', 'Line Tutor'], ['words', 'Word Deck'], ['ladder', 'Fluency Ladder'], ['roadmap', 'Parts Roadmap'], ['festivals', 'Festivals']];

async function storeGet(store, k, d) { try { const v = store.get(k, d); return (v && typeof v.then === 'function' ? await v : v) ?? d; } catch { return d; } }

export async function mount(root, ctx) {
  let alive = true;
  const { store } = ctx;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'pp' });
  const title = () => h('h1', { id: 'view-title', tabindex: '-1' }, 'Prayer Practice');
  root.replaceChildren(style, title(), h('p', { class: 'muted', role: 'status' }, 'Loading...'), main);

  let S, gaps, cal = null;
  try {
    [S, gaps] = await Promise.all([loadServiceData({ loadCorpus }), loadJSON('data/corpus/gaps.json')]);
    try { cal = await import('../curriculum/calendar.js'); } catch { cal = null; }
  } catch {
    if (alive) root.replaceChildren(style, title(), h('p', {}, 'Prayer Practice could not load its data files. Your learning is not affected.'));
    return () => { alive = false; };
  }
  if (!alive) return () => {};
  root.replaceChildren(style, title(), main);

  const tradition = congregationOf(ctx.settings);
  const q = ctx.query || {};
  const st = {
    mode: MODES.some(([m]) => m === q.mode) ? q.mode : 'tutor', order: ORDER_IDS.includes(q.order) ? q.order : 'shabbat-morning',
    i: 0, showTr: true, deckAt: 0, deckShow: false, prayer: null,
  };
  let rec = normalizePractice(await storeGet(store, PRACTICE_KEY, null));
  let companion = await storeGet(store, SERVICE_KEYS.companion, {});
  const cards = (() => { try { return readSnapshot(store).cards; } catch { return {}; } })();
  const calPrefs = await storeGet(store, 'calendar.prefs', null);
  const now = () => (typeof ctx.now === 'function' ? ctx.now() : new Date());
  const day = () => { const d = now(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const live = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });
  const save = () => { try { store.set(PRACTICE_KEY, rec); } catch { /* best effort */ } };
  const hasFile = (kind, id) => audioAccess(ctx.audio, kind, id, { tradition }).level === 'file';
  const orderTitle = (o) => S.orders.orders[o].title;
  if (q.line) { const at = serviceLines(S.orders, st.order, S.byId).findIndex((l) => l.key === q.line || l.entryId === q.line); if (at >= 0) st.i = at; }

  // ---------- F8: one ring per service ----------
  function ringCard() {
    const r = serviceRing(st.order, rec, companion, cards, S.orders.orders[st.order].items.map((x) => x.id));
    if (!r) return null;
    return h('section', { class: 'card', 'aria-labelledby': 'pp-ring-h', 'data-ring': `${st.order}:${r.pct}` },
      h('h2', { id: 'pp-ring-h' }, `${r.title}: Your Service Ring`),
      h('p', { class: 'pp-ring' }, `${r.pct}%`),
      h('progress', { max: '100', value: String(r.pct), 'aria-label': `${r.title}: service ring, ${r.pct}%` }),
      h('ul', {},
        h('li', { 'data-part': 'lines' }, `Lines read: ${r.lines.have} of ${r.lines.of}`),
        h('li', { 'data-part': 'words' }, `Words known: ${r.words.have} of ${r.words.of}`),
        h('li', { 'data-part': 'prayers' }, `Prayers followed: ${r.prayers.have} of ${r.prayers.of}`)),
      h('p', { class: 'small muted' }, `The ring is the average of the three shares. Each part is your own mark, not a test. It covers only the texts Aleph holds: ${r.gaps} typical ${r.gaps === 1 ? 'part is' : 'parts are'} not in Aleph yet.`));
  }

  function tabs() {
    return h('div', { class: 'pp-row', role: 'group', 'aria-label': 'Practice mode' }, ...MODES.map(([m, label]) =>
      h('button', { type: 'button', class: 'btn secondary', id: `pp-tab-${m}`, 'aria-pressed': st.mode === m ? 'true' : 'false', onclick: () => { st.mode = m; render(`pp-tab-${m}`); } }, label)));
  }
  const orderSwitch = () => h('div', { class: 'pp-row', role: 'group', 'aria-label': 'Service' }, ...ORDER_IDS.map((o) =>
    h('button', { type: 'button', class: 'btn secondary', 'data-order': o, 'aria-pressed': st.order === o ? 'true' : 'false', onclick: () => { st.order = o; st.i = 0; st.deckAt = 0; st.deckShow = false; st.prayer = null; render(); } }, orderTitle(o))));

  function wordButtons(l) {
    const kids = [];
    l.words.forEach((w, k) => {
      if (k) kids.push(' ');
      const id = `${l.entryId}-w${w.n}`;
      kids.push(!isAudioFree(ctx) && hasFile('word', id)
        ? h('button', { type: 'button', class: 'pp-w', lang: 'he', 'data-word': id, 'aria-label': `Play word ${w.n}`, onclick: (e) => playWithState(ctx, e?.target, 'word', id, { tradition, text: w.spoken }) }, w.shown)
        : h('span', {}, w.shown));
    });
    return h('p', { class: 'pp-he', lang: 'he', dir: 'rtl' }, ...kids);
  }

  // ---------- F3: line tutor ----------
  function tutorView() {
    const list = serviceLines(S.orders, st.order, S.byId);
    st.i = Math.max(0, Math.min(st.i, list.length - 1));
    const l = list[st.i];
    const seen = rec.lines[st.order] ?? {};
    const read = Object.keys(seen).length;
    const go = (d) => { st.i = Math.max(0, Math.min(list.length - 1, st.i + d)); render('pp-line'); live.textContent = `Line ${st.i + 1} of ${list.length}.`; };
    const tr = st.showTr ? translit(l.he, tradition) : '';
    return [orderSwitch(),
      h('p', { class: 'small', 'data-lines-read': `${read}/${list.length}` }, `Lines you have marked as read in ${orderTitle(st.order).toLowerCase()}: ${read} of ${list.length}.`),
      h('section', { class: 'card', id: 'pp-line', tabindex: '0', 'aria-labelledby': 'pp-line-h', 'data-line': l.key,
        onkeydown: (e) => { if (e.key === 'ArrowRight') { e.preventDefault?.(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault?.(); go(-1); } } },
        h('h2', { id: 'pp-line-h' }, `${l.moment}`),
        h('p', { class: 'small muted' }, `${l.title}${l.ref ? ` (${l.ref})` : ''}. Line ${l.n} of ${l.of} in this text; line ${st.i + 1} of ${list.length} in the service.`),
        wordButtons(l),
        tr ? h('p', { class: 'pp-tr', lang: 'he-Latn' }, tr) : null,
        l.en ? h('p', { class: 'pp-en' }, l.enWhole ? `English for the whole text: ${l.en}` : l.en) : (l.n > 1 ? h('p', { class: 'small muted' }, 'The English for this text is on its first line.') : null),
        audioButton(h, ctx, { kind: l.clip.kind, id: l.clip.id, tradition, text: l.spoken, label: 'Play the line', buttonId: 'pp-play-line' }),
        h('p', { class: 'small muted' }, 'Tap a dotted word to hear it where a word clip exists.')),
      h('div', { class: 'pp-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'pp-tr', onclick: () => { st.showTr = !st.showTr; render('pp-tr'); } }, st.showTr ? 'Hide transliteration' : 'Show transliteration'),
        h('button', { type: 'button', class: 'btn', id: 'pp-read', 'aria-pressed': seen[l.key] ? 'true' : 'false', onclick: () => {
          rec = withLine(rec, st.order, l.key, day()); save(); live.textContent = 'Marked as read.'; if (st.i < list.length - 1) go(1); else render('pp-read');
        } }, seen[l.key] ? 'Read (marked)' : 'I read this line aloud')),
      h('div', { class: 'pp-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'pp-prev', disabled: st.i === 0 ? true : null, onclick: () => go(-1) }, 'Previous line'),
        h('button', { type: 'button', class: 'btn secondary', id: 'pp-next', disabled: st.i === list.length - 1 ? true : null, onclick: () => go(1) }, 'Next line')),
      h('p', { class: 'small muted' }, `${SELF_CHECK} Transliteration is made by rule, in your Settings pronunciation; it is an approximation.`),
      live];
  }

  // ---------- F4: word deck ----------
  function wordsView() {
    const deck = serviceDeck(S.orders, st.order, S.byId);
    const known = rec.words[st.order] ?? {};
    const have = deck.filter((w) => known[w.key]).length;
    const queue = deckQueue(deck, rec, st.order, 10);
    const head = [orderSwitch(),
      h('section', { class: 'card', 'aria-labelledby': 'pp-deck-h' },
        h('h2', { id: 'pp-deck-h' }, `${orderTitle(st.order)} Words`),
        h('p', { 'data-words': `${have}/${deck.length}` }, `Words you know: ${have} of ${deck.length}`),
        h('progress', { max: String(deck.length), value: String(have), 'aria-label': `Words you know: ${have} of ${deck.length}` }),
        h('p', { class: 'small muted' }, 'Every different word in the lines Aleph holds for this service, most frequent first. You mark the ones you can read.'))];
    if (!queue.length) return [...head, h('p', {}, 'You have marked every word in this deck. Well done.'), knownList(deck, known), live];
    st.deckAt = Math.max(0, Math.min(st.deckAt, queue.length - 1));
    const w = queue[st.deckAt];
    const tr = st.deckShow ? translit(w.he, tradition) : '';
    const next = () => { st.deckShow = false; st.deckAt = (st.deckAt + 1) % queue.length; render('pp-deck-card'); };
    return [...head,
      h('section', { class: 'card', id: 'pp-deck-card', tabindex: '-1', 'aria-label': 'Word card', 'data-key': w.key },
        h('p', { class: 'small muted' }, `Card ${st.deckAt + 1} of ${queue.length} in this round. Seen ${w.count} ${w.count === 1 ? 'time' : 'times'} in this service, first in: ${w.moment}.`),
        h('p', { class: 'pp-big', lang: 'he', dir: 'rtl' }, w.shown),
        st.deckShow
          ? h('div', {}, tr ? h('p', { class: 'pp-tr', lang: 'he-Latn' }, tr) : h('p', { class: 'small muted' }, 'No transliteration for this word.'),
            w.clip ? audioButton(h, ctx, { kind: w.clip.kind, id: w.clip.id, tradition, text: w.spoken, label: 'Hear it' }) : h('p', { class: 'small muted' }, 'No clip of this word on its own yet.'))
          : h('button', { type: 'button', class: 'btn secondary', id: 'pp-reveal', onclick: () => { st.deckShow = true; render('pp-reveal-done'); } }, 'Say it, then check'),
        st.deckShow ? h('span', { id: 'pp-reveal-done', tabindex: '-1' }) : null,
        h('div', { class: 'pp-row' },
          h('button', { type: 'button', class: 'btn', id: 'pp-know', onclick: () => { rec = withWord(rec, st.order, w.key, true, day()); save(); live.textContent = 'Marked as known.'; st.deckShow = false; render('pp-deck-card'); } }, 'I can read it'),
          h('button', { type: 'button', class: 'btn secondary', id: 'pp-notyet', onclick: () => { live.textContent = 'It stays in the deck.'; next(); } }, 'Not yet'))),
      h('p', { class: 'small muted' }, SELF_CHECK),
      knownList(deck, known), live];
  }
  function knownList(deck, known) {
    const mine = deck.filter((w) => known[w.key]);
    if (!mine.length) return null;
    return h('details', {}, h('summary', {}, `Words You Marked (${mine.length})`),
      h('ul', {}, ...mine.map((w) => h('li', {}, heSpan(w.shown), ' ', h('button', { type: 'button', class: 'btn secondary small', 'data-unmark': w.key, onclick: () => { rec = withWord(rec, st.order, w.key, false, day()); save(); render(); } }, 'Put back in the deck')))));
  }

  // ---------- F7: fluency ladder ----------
  function ladderView() {
    const o = S.orders.orders[st.order];
    const lines = serviceLines(S.orders, st.order, S.byId);
    const followed = practisedIds(cards, companion);
    const keysOf = (id) => lines.filter((l) => l.entryId === id).map((l) => l.key);
    if (st.prayer && !o.items.some((x) => x.id === st.prayer)) st.prayer = null;
    if (!st.prayer) {
      return [orderSwitch(),
        h('p', {}, 'Four steps for each prayer: hear it, follow it, read it with vowels, read it without. Pick a prayer to see its steps.'),
        h('ol', { class: 'pp-ladder' }, ...o.items.map((it) => {
          const L = ladderOf(rec, it.id, followed, keysOf(it.id), st.order);
          return h('li', { 'data-prayer': it.id, 'data-steps': `${L.done}/${L.of}` },
            h('button', { type: 'button', class: 'btn secondary', 'data-open': it.id, onclick: () => { st.prayer = it.id; render('pp-prayer-h'); } }, `${it.moment}: ${L.done} of ${L.of} steps`));
        })),
        h('p', { class: 'small muted' }, SELF_CHECK)];
    }
    const it = o.items.find((x) => x.id === st.prayer), e = S.byId.get(it.id);
    const L = ladderOf(rec, it.id, followed, keysOf(it.id), st.order);
    const pl = lines.filter((l) => l.entryId === it.id);
    return [orderSwitch(),
      h('h2', { id: 'pp-prayer-h', tabindex: '-1' }, it.moment),
      h('p', { class: 'small muted' }, `${e.title}${e.ref ? ` (${e.ref})` : ''}`),
      h('p', {}, ...L.stages.map((s) => h('span', { class: 'pp-stage', 'data-stage': s.id, 'data-done': s.done ? 'true' : 'false' }, `${s.label}${s.done ? ': done' : ''}`))),
      ...L.stages.map((s) => h('section', { class: 'card', 'data-step': s.id },
        h('h3', {}, s.label), h('p', { class: 'small' }, s.how),
        s.id === 'hear' ? audioButton(h, ctx, { kind: pl.length > 1 ? 'prayer' : 'line', id: it.id, tradition, text: pl.map((l) => l.spoken).join(' '), label: 'Play the prayer' }) : null,
        s.id === 'vowels' ? h('div', {}, ...pl.map((l) => h('p', { class: 'pp-he', lang: 'he', dir: 'rtl' }, l.shown))) : null,
        s.id === 'plain' ? h('div', {}, ...pl.map((l) => h('p', { class: 'pp-he', lang: 'he', dir: 'rtl', 'data-plain': '' }, l.plain)), h('p', { class: 'small muted' }, 'The same lines with the vowel points and cantillation marks taken away; the letters are unchanged.')) : null,
        s.auto ? h('p', { class: 'small' }, 'Done: you practised this prayer in the Companion or stepped through all its lines.') : null,
        s.auto ? null : h('button', { type: 'button', class: 'btn secondary', 'data-mark': s.id, 'aria-pressed': s.done ? 'true' : 'false', onclick: () => {
          rec = withStage(rec, it.id, s.id, !s.done, day()); save(); live.textContent = s.done ? `${s.label}: mark removed.` : `${s.label}: marked done.`; render();
        } }, s.done ? 'Done (tap to undo)' : 'Mark done'))),
      h('div', { class: 'pp-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'pp-ladder-back', onclick: () => { st.prayer = null; render(); } }, 'All prayers'),
        h('a', { class: 'btn secondary', href: `#/read/${it.id}` }, 'Read the full text')),
      h('p', { class: 'small muted' }, SELF_CHECK), live];
  }

  // ---------- F5: parts roadmap ----------
  function roadmapView() {
    const groups = roadmap(S.orders, st.order, S.byId, S.guide, gaps);
    const c = roadmapCounts(groups);
    return [orderSwitch(),
      h('p', { 'data-roadmap': `${c.held}/${c.notYet}` }, `${orderTitle(st.order)}: Aleph holds ${c.held} ${c.held === 1 ? 'prayer' : 'prayers'} in this order. ${c.notYet} typical ${c.notYet === 1 ? 'part is' : 'parts are'} not in Aleph yet.`),
      h('p', { class: 'small muted' }, ARRIVING_NOTE),
      ...groups.map((g) => h('section', { class: 'card', 'data-group': g.id },
        h('h2', {}, g.title),
        g.held.length ? h('ul', {}, ...g.held.map((x) => h('li', { 'data-held': x.id }, h('a', { href: `#/read/${x.id}` }, x.moment), h('span', { class: 'small muted' }, ` (${x.title})`)))) : null,
        ...g.notYet.map((x) => h('div', { class: 'pp-notyet', 'data-not-yet': x.id },
          h('p', {}, h('strong', {}, `${NOT_YET}: `), x.name),
          x.where ? h('p', { class: 'small' }, `Where: ${x.where}.`) : null,
          x.why ? h('details', {}, h('summary', {}, 'Why it is not here yet'), h('p', { class: 'small' }, x.why)) : null)))),
      h('p', { class: 'small muted' }, `${REVIEW_LABEL}. Real services differ from congregation to congregation.`)];
  }

  // ---------- F9: festivals ----------
  function festivalsView() {
    const out = [h('p', {}, 'The festival prayers Aleph holds, in the order the service guide lists them, and the parts it does not hold yet. Nothing is filled in from memory.')];
    if (cal) {
      try {
        const d = now(), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const mode = ['reform', 'traditional', 'israel'].includes(calPrefs?.observance) ? calPrefs.observance : 'reform';
        const next = cal.nextHolidays(iso, 4, { mode });
        out.push(h('section', { class: 'card', 'aria-labelledby': 'pp-next-h' }, h('h2', { id: 'pp-next-h' }, 'Coming Up'),
          h('ul', {}, ...next.map((x) => {
            const p = holidayPlan(x, S.guide, gaps, S.byId);
            const what = p.kind === 'skeleton' ? `${p.skeleton.held.length} prayers in Aleph, ${p.skeleton.notYet.length} ${p.skeleton.notYet.length === 1 ? 'part' : 'parts'} not yet`
              : p.kind === 'gap' ? `${NOT_YET}: ${p.gap.name}` : 'Aleph holds no prayers for this day yet';
            return h('li', { 'data-holiday': x.id }, h('strong', {}, x.en), ` begins the evening of ${x.eve} (${x.start}${x.end !== x.start ? ` to ${x.end}` : ''}). ${what}.`);
          })),
          h('p', { class: 'small muted' }, `Dates from the app's own calendar (${mode} observance; change it in the Calendar).`)));
      } catch { /* the calendar module failed: the outline below still shows */ }
    }
    for (const occ of ['festivals', 'hanukkah']) {
      const sk = festivalSkeleton(S.guide, gaps, S.byId, occ);
      if (!sk) continue;
      out.push(h('section', { class: 'card', 'data-skeleton': sk.id, 'aria-labelledby': `pp-sk-${sk.id}` },
        h('h2', { id: `pp-sk-${sk.id}` }, titleCase(sk.title)),
        h('ol', {}, ...sk.held.map((x) => h('li', { 'data-held': x.id }, h('a', { href: x.href }, x.title), h('br', {}), heSpan(x.he)))),
        ...sk.notYet.map((x) => h('div', { class: 'pp-notyet', 'data-not-yet': x.id }, h('p', {}, h('strong', {}, `${NOT_YET}: `), x.name), x.where ? h('p', { class: 'small' }, `Where: ${x.where}.`) : null))));
    }
    out.push(h('p', { class: 'small muted' }, `${ARRIVING_NOTE} The festival Amidah is one of the parts not in Aleph yet.`));
    return out;
  }

  function render(focusId) {
    const body = st.mode === 'words' ? wordsView() : st.mode === 'ladder' ? ladderView() : st.mode === 'roadmap' ? roadmapView() : st.mode === 'festivals' ? festivalsView() : tutorView();
    main.replaceChildren(ringCard(), tabs(), ...body.filter(Boolean));
    if (focusId) main.querySelector('#' + focusId)?.focus?.();
  }
  render();
  if (ctx.audio && typeof ctx.audio.ensureManifest === 'function') Promise.resolve(ctx.audio.ensureManifest()).then(() => { if (alive) render(); }).catch(() => {});
  return () => { alive = false; companion = null; };
}
