// Shabbat Companion (#/shabbat): This Shabbat, the service map, follow-along, join-in drills and the Friday-night home rituals.
// mount(root, ctx) -> unmount. ctx: { store, settings?, audio?, query?, now?, clock?, wakeLock? }. Lazy route: this file and its model
// load only when the page opens (src/service/ is on demand). Reads only the app's own data; no prayerbook text, layout or page numbers.
import { h, heSpan, audioButton } from '../shell/ui.js';
import { playWithState, audioAccess } from '../shell/audio-access.js';
import { titleCase } from '../shell/title-case.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { loadCorpus } from '../corpus/corpus.js';
import { loadJSON } from '../curriculum/data.js';
import { readSnapshot } from '../progress/model.js';
import { loadServiceData, clipFor, lineClipFor } from './model.js';
import {
  COMPANION_KEY, REVIEW_LABEL, NOT_SCORED, SCAFFOLD_KEY, LEVEL_NAMES, showName, linesOf, wordsOf, partOf, mapItems, translit, fadeLevel,
  practisedIds, practiseList, thisShabbat, timingOf, withPractice, withHomeStep,
} from './companion.model.js';

const CSS = `
.sh { display: grid; gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.sh h2 { margin-block: .25rem; font-size: 1.25rem; }
.sh .sh-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.sh .btn { min-block-size: var(--tap, 48px); }
.sh .btn[aria-pressed=true] { background: var(--accent); color: var(--accent-fg); }
.sh .sh-big { min-block-size: 64px; min-inline-size: 8rem; font-size: 1.2rem; flex: 1 1 8rem; }
.sh .sh-he { font-size: 2.2rem; line-height: 1.8; unicode-bidi: isolate; }
.sh .sh-line { margin-block-end: .75rem; }
.sh .sh-w { font: inherit; background: none; border: 0; border-block-end: 2px dotted var(--border); padding: 0 .1rem; min-block-size: var(--tap, 48px); cursor: pointer; color: inherit; }
.sh .sh-w:focus-visible { outline: 3px solid var(--focus); }
.sh .sh-tr { font-style: italic; margin: .1rem 0; font-size: 1.1rem; }
.sh .sh-faint { opacity: .5; }
.sh .sh-here { font-weight: 700; border-inline-start: 6px solid var(--accent); padding-inline-start: .5rem; }
.sh .sh-done { font-weight: 700; }
.sh ol { padding-inline-start: 1.5rem; margin: 0; }
.sh li { margin-block: .35rem; }
.sh .small { font-size: .9rem; }
.sh .sh-card:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
`;
const MODES = [['week', 'This Shabbat'], ['map', 'Service Map'], ['follow', 'Follow Along'], ['join', 'Join In'], ['home', 'Home Rituals']];
const JUMP_LABEL = { 'shema-1': 'The Sh\'ma', 'torah-barchu': 'Barchu', 'mi-chamocha-1': 'Mi Chamocha', 'kaddish-1': 'Kaddish' };

async function storeGet(store, k, d) { try { const v = store.get(k, d); return (v && typeof v.then === 'function' ? await v : v) ?? d; } catch { return d; } }

export async function mount(root, ctx) {
  let alive = true;
  const { store } = ctx;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'sh' });
  const title = () => h('h1', { id: 'view-title', tabindex: '-1' }, 'Shabbat Companion');
  root.replaceChildren(style, title(), h('p', { class: 'muted', role: 'status' }, 'Loading...'), main);

  let S, comp, cal = null;
  try {
    [S, comp] = await Promise.all([loadServiceData({ loadCorpus }), loadJSON('data/service/companion.json')]);
    // the calendar's own modules (portion tables and city presets); without them the page still works, minus the dates
    try { const [p, l] = await Promise.all([import('../curriculum/calendar.parsha.js'), import('../curriculum/calendar.locations.js')]); cal = { parsha: p.parshaOnShabbat, ...l }; } catch { cal = null; }
  } catch {
    if (alive) root.replaceChildren(style, title(), h('p', {}, 'The Shabbat Companion could not load its data files. Your learning is not affected.'));
    return () => { alive = false; };
  }
  if (!alive) return () => {};
  root.replaceChildren(style, title(), main);

  const tradition = congregationOf(ctx.settings);
  const q = ctx.query || {};
  const orderOk = (o) => comp.maps.includes(o);
  const st = { mode: MODES.some(([m]) => m === q.mode) ? q.mode : 'week', order: orderOk(q.order) ? q.order : comp.maps[0], i: 0, drill: null, tapShown: new Set(), lockMsg: '' };
  if (q.id) { const at = S.orders.orders[st.order].items.findIndex((x) => x.id === q.id); if (at >= 0) { st.i = at; st.mode = q.mode || 'follow'; } }
  let rec = await storeGet(store, COMPANION_KEY, {});
  const scaffold = await storeGet(store, SCAFFOLD_KEY, {});
  const level = fadeLevel(scaffold, ctx.settings?.get?.('scaffoldStart') === 'faint' ? 'faint' : 'full');
  const cards = (() => { try { return readSnapshot(store).cards; } catch { return {}; } })();
  const clock = typeof ctx.clock === 'function' ? ctx.clock : () => Date.now();
  const now = () => (typeof ctx.now === 'function' ? ctx.now() : new Date());
  const live = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });
  const save = () => { try { store.set(COMPANION_KEY, rec); } catch { /* best effort */ } };
  const day = () => now().toISOString().slice(0, 10);
  const practised = () => practisedIds(cards, rec);

  const location = () => {
    if (!cal) return null;
    try {
      const prefs = cal.normalizePrefs(cal.__prefs ?? null);
      const s = ctx.settings, l = s?.location;
      const fb = l && Number.isFinite(l.lat) && Number.isFinite(l.lon) ? { lat: l.lat, lon: l.lon, tz: l.tz } : (Number.isFinite(s?.lat) && Number.isFinite(s?.lon) ? { lat: s.lat, lon: s.lon } : null);
      return cal.resolveLocation(prefs, fb);
    } catch { return null; }
  };
  if (cal) cal.__prefs = await storeGet(store, cal.CAL_PREFS_KEY, null);

  // ---------- Wake Lock: off by default, only while this page is open ----------
  const wl = ctx.wakeLock !== undefined ? ctx.wakeLock : globalThis.navigator?.wakeLock;
  let lock = null, wantLock = false;
  async function setLock(on) {
    wantLock = on; st.lockMsg = '';
    if (on && wl && typeof wl.request === 'function') {
      try { lock = await wl.request('screen'); lock?.addEventListener?.('release', () => { lock = null; }); }
      catch { wantLock = false; lock = null; st.lockMsg = 'Your browser did not allow the screen to stay on just now.'; }
    } else if (!on) { try { await lock?.release?.(); } catch { /* already released */ } lock = null; }
    if (alive) render('sh-lock');
  }
  const onVisible = () => { if (wantLock && !lock && globalThis.document?.visibilityState === 'visible') setLock(true); };
  globalThis.document?.addEventListener?.('visibilitychange', onVisible);

  const items = () => S.orders.orders[st.order].items;
  const go = (d) => { st.i = Math.max(0, Math.min(items().length - 1, st.i + d)); st.tapShown.clear(); render('sh-card'); live.textContent = `You are here: ${items()[st.i].moment}, ${st.i + 1} of ${items().length}.`; };
  const openAt = (order, id) => { st.order = order; st.i = Math.max(0, S.orders.orders[order].items.findIndex((x) => x.id === id)); st.mode = 'follow'; st.tapShown.clear(); render('sh-card'); };
  const onKey = (e) => {
    if (!alive || st.mode !== 'follow' || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = String(e.target?.tagName || e.target?.tag || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault?.(); go(1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault?.(); go(-1); }
  };
  globalThis.document?.addEventListener?.('keydown', onKey);

  // ---------- shared pieces ----------
  function tabs() {
    return h('div', { class: 'sh-row', role: 'group', 'aria-label': 'Companion mode' }, ...MODES.map(([m, label]) =>
      h('button', { type: 'button', class: 'btn secondary', id: `sh-tab-${m}`, 'data-mode': m, 'aria-pressed': st.mode === m ? 'true' : 'false', onclick: () => { st.mode = m; st.drill = null; render(`sh-tab-${m}`); } }, label)));
  }
  function jumps() {
    return h('nav', { 'aria-labelledby': 'sh-find-h' }, h('h2', { id: 'sh-find-h' }, 'Find a Prayer'),
      h('div', { class: 'sh-row' }, ...comp.jump.map((id) => h('button', { type: 'button', class: 'btn', 'data-jump': id, onclick: () => openAt(S.orders.orders[st.order].items.some((x) => x.id === id) ? st.order : comp.maps[0], id) }, JUMP_LABEL[id] || S.byId.get(id)?.title || id))));
  }
  const orderSwitch = () => h('div', { class: 'sh-row', role: 'group', 'aria-label': 'Service' }, ...comp.maps.map((o) =>
    h('button', { type: 'button', class: 'btn secondary', 'data-order': o, 'aria-pressed': st.order === o ? 'true' : 'false', onclick: () => { st.order = o; st.i = 0; render(); } }, S.orders.orders[o].title)));
  const review = () => h('p', { class: 'small', 'data-review': comp.review.status }, `${REVIEW_LABEL}. Every congregation runs the service a little differently: follow your own prayer book in the room.`);

  /** Transliteration for one line at the learner's fade level (0 shown, 1 faint, 2 on tap, 3 hidden). */
  function trNode(line, key) {
    const t = translit(line, tradition);
    if (!t || level >= 3) return null;
    if (level === 2 && !st.tapShown.has(key)) return h('button', { type: 'button', class: 'btn secondary small sh-trtap', onclick: () => { st.tapShown.add(key); render(); } }, 'Show transliteration');
    return h('p', { class: 'sh-tr' + (level === 1 ? ' sh-faint' : ''), lang: 'he-Latn' }, t);
  }
  const fadeNote = () => h('p', { class: 'small muted', 'data-fade': String(level) }, `Transliteration: ${LEVEL_NAMES[level]}. It follows your word fading level from Read Without English Letters.`);
  const hasFile = (kind, id) => audioAccess(ctx.audio, kind, id, { tradition }).level === 'file';

  /** One line as words: a word with its own clip is a button that plays it; the others are plain text. */
  function wordLine(entry, words) {
    const kids = [];
    words.forEach((w, k) => {
      if (k) kids.push(' ');
      const id = `${entry.id}-w${w.n}`, shown = showName(w.he);
      kids.push(hasFile('word', id)
        ? h('button', { type: 'button', class: 'sh-w', lang: 'he', 'data-word': id, 'aria-label': `Play word ${w.n}`, onclick: (e) => playWithState(ctx, e?.target, 'word', id, { tradition, text: partOf(S.byId, { entry: entry.id, word: w.n })?.spoken }) }, shown)
        : h('span', { class: 'sh-wt' }, shown));
    });
    return h('p', { class: 'sh-he', lang: 'he', dir: 'rtl' }, ...kids);
  }

  // ---------- This Shabbat ----------
  function weekView() {
    const w = thisShabbat({ now: now(), loc: location(), parsha: cal?.parsha });
    const done = practised();
    const todo = practiseList(S.orders, S.byId, done);
    const total = S.orders.orders['friday-night'].items.length;
    return [
      h('section', { class: 'card', 'aria-labelledby': 'sh-week-h' },
        h('h2', { id: 'sh-week-h' }, 'This Shabbat'),
        h('p', {}, `Friday evening ${w.friday} to Saturday ${w.saturday}.`),
        w.portion ? h('p', { 'data-portion': w.portion.en }, `Torah portion: ${w.portion.en} (`, heSpan(w.portion.he), ')') : h('p', { 'data-portion': '' }, 'No regular weekly portion this Shabbat: a festival reading is read instead.'),
        w.candles
          ? h('p', { 'data-candles': w.candles.time }, `Candle lighting: ${w.candles.time} ${w.candles.tz} in ${w.candles.place}, ${w.candles.minutes} minutes before sunset. Approximate; check with your community.`)
          : h('p', {}, h('a', { href: '#/calendar' }, 'Set your location in the Calendar'), ' to see candle-lighting time.')),
      h('section', { class: 'card', 'aria-labelledby': 'sh-order-h' },
        h('h2', { id: 'sh-order-h' }, 'The Service Order'),
        ...comp.maps.map((o) => h('p', {}, h('button', { type: 'button', class: 'btn secondary', 'data-open-map': o, onclick: () => { st.order = o; st.mode = 'map'; render('sh-tab-map'); } }, `${S.orders.orders[o].title}: ${S.orders.orders[o].items.length} prayers`)))),
      h('section', { class: 'card', 'aria-labelledby': 'sh-todo-h' },
        h('h2', { id: 'sh-todo-h' }, 'Practise Before Friday'),
        h('p', { 'data-practised': `${total - todo.length}/${total}` }, `${total - todo.length} of ${total} Friday evening prayers practised.`),
        todo.length
          ? h('ol', { class: 'sh-todo' }, ...todo.map((it) => h('li', {}, `${it.moment} `, h('button', { type: 'button', class: 'btn secondary', 'data-practise': it.id, onclick: () => openAt('friday-night', it.id) }, 'Practise'))))
          : h('p', {}, 'You have practised every prayer in the Friday evening map.'),
        h('p', { class: 'small muted' }, 'A prayer counts as practised when you mark it in Follow Along, finish its join-in drill, or practise it in Fade-out Recall.')),
    ];
  }

  // ---------- Service map ----------
  function mapView() {
    const done = practised();
    const list = mapItems(S.orders, st.order, S.byId);
    return [orderSwitch(), review(),
      h('ol', { class: 'sh-map', 'aria-label': `${S.orders.orders[st.order].title} service, prayer by prayer` }, ...list.map((it) => h('li', { 'data-item': it.id },
        h('strong', {}, it.moment), done.has(it.id) ? h('span', { class: 'sh-done' }, ' (practised)') : null,
        h('br', {}), h('span', { class: 'small' }, `${it.title}${it.ref ? ` (${it.ref})` : ''}`),
        h('br', {}), heSpan(it.he, 'he'),
        h('div', { class: 'sh-row' },
          h('a', { class: 'btn secondary', href: it.href, 'data-read': it.id }, 'Read the text'),
          h('button', { type: 'button', class: 'btn secondary', 'data-follow-from': it.id, onclick: () => openAt(st.order, it.id) }, 'Follow from here')))))];
  }

  // ---------- Follow along ----------
  function followView() {
    const list = items(); st.i = Math.max(0, Math.min(st.i, list.length - 1));
    const it = list[st.i], e = S.byId.get(it.id), lines = linesOf(e), words = wordsOf(e);
    const en = String(e.english ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    const card = { id: e.id, he: lines };
    const clip = clipFor(ctx.audio, card, tradition);
    const isDone = practised().has(it.id);
    const lockBtn = h('button', { type: 'button', class: 'btn secondary', id: 'sh-lock', 'aria-pressed': wantLock ? 'true' : 'false', disabled: wl && typeof wl.request === 'function' ? null : true,
      onclick: () => setLock(!wantLock) }, wantLock ? 'Keep the screen on: On' : 'Keep the screen on: Off');
    return [orderSwitch(),
      h('p', { class: 'sh-here', id: 'sh-here', 'data-here': it.id }, `You are here: ${titleCase(it.moment)} (${st.i + 1} of ${list.length})`),
      h('section', { class: 'card sh-card', id: 'sh-card', tabindex: '0', 'aria-labelledby': 'sh-card-h', onkeydown: onKey },
        h('h2', { id: 'sh-card-h' }, titleCase(it.moment)),
        h('p', { class: 'small muted' }, `${e.title} (${e.ref})`),
        ...lines.map((line, k) => {
          const lc = lines.length > 1 ? lineClipFor(ctx.audio, card, k, tradition) : null;
          return h('div', { class: 'sh-line' }, wordLine(e, words[k]), trNode(line, `${it.id}:${k}`),
            lc ? audioButton(h, ctx, { kind: lc.kind, id: lc.id, tradition, text: partOf(S.byId, { entry: e.id, line: k + 1 })?.spoken, label: `Play line ${k + 1}` }) : null);
        }),
        h('p', { class: 'sh-en' }, en.join(' ')),
        audioButton(h, ctx, { kind: clip ? clip.kind : (lines.length > 1 ? 'prayer' : 'line'), id: clip ? clip.id : e.id, tradition, text: lines.map((l, k) => partOf(S.byId, { entry: e.id, line: k + 1 })?.spoken).join(' '), label: 'Play the whole prayer', buttonId: 'sh-play' }),
        h('p', { class: 'small' }, h('a', { href: `#/read/${e.id}` }, 'Read the full text and notes'))),
      h('div', { class: 'sh-row' },
        h('button', { type: 'button', class: 'btn secondary sh-big', id: 'sh-prev', disabled: st.i === 0 ? true : null, onclick: () => go(-1) }, 'Previous'),
        h('button', { type: 'button', class: 'btn sh-big', id: 'sh-next', disabled: st.i === list.length - 1 ? true : null, onclick: () => go(1) }, 'Next')),
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', id: 'sh-mark', 'aria-pressed': isDone ? 'true' : 'false', onclick: () => { rec = withPractice(rec, it.id, day()); save(); render('sh-mark'); live.textContent = `${titleCase(it.moment)} marked as practised.`; } }, isDone ? 'Practised' : 'Mark as practised')),
      fadeNote(),
      h('div', { class: 'card' }, h('div', { class: 'sh-row' }, lockBtn),
        h('p', { class: 'small' }, wl && typeof wl.request === 'function'
          ? 'Keeps your screen from going dark while you follow the service on this page. It uses more battery and turns off when you leave the page.'
          : 'This browser cannot keep the screen on. You can lengthen the screen timeout in your phone\'s settings instead.'),
        st.lockMsg ? h('p', { class: 'small', role: 'alert' }, st.lockMsg) : null),
      h('details', {}, h('summary', {}, 'Where We Are in the Service'),
        h('ol', { class: 'sh-where' }, ...list.map((x, k) => h('li', { class: k === st.i ? 'sh-here' : null, 'aria-current': k === st.i ? 'step' : null }, k === st.i ? `${x.moment} (you are here)` : x.moment)))),
      h('p', { class: 'small muted' }, 'Arrow keys move to the previous or next prayer. Tap a dotted word to hear it where a clip exists.'),
      live];
  }

  // ---------- Join in ----------
  function joinView() {
    if (!st.drill) {
      return [h('p', {}, 'Practise the lines the congregation says together. Hear the leader, tap when you would come in, then read your line.'),
        h('p', { class: 'small', 'data-not-scored': '' }, NOT_SCORED),
        h('ul', { class: 'sh-drills' }, ...comp.drills.map((d) => h('li', {}, h('button', { type: 'button', class: 'btn', 'data-drill': d.id, onclick: () => { st.drill = { d, phase: 'ready' }; render('sh-drill-h'); } }, d.title),
          rec.drills?.[d.id] ? h('span', { class: 'small' }, ` Last time: ${rec.drills[d.id].band === 'unscored' ? 'timing not scored' : rec.drills[d.id].band.replace('-', ' ')}.`) : null)))];
    }
    const run = st.drill, d = run.d;
    const cue = partOf(S.byId, d.cue), resp = d.response.map((r) => partOf(S.byId, r));
    const cueHas = hasFile(cue.clip.kind, cue.clip.id);
    const out = [h('h2', { id: 'sh-drill-h', tabindex: '-1' }, d.title), h('p', {}, d.how), h('p', { class: 'small' }, NOT_SCORED),
      h('div', { class: 'card' }, h('p', { class: 'small muted' }, 'The leader:'), h('p', { class: 'sh-he', lang: 'he', dir: 'rtl' }, cue.shown))];
    if (run.phase === 'ready' || run.phase === 'cue') {
      const playBtn = h('button', { type: 'button', class: 'btn sh-big', id: 'sh-cue', disabled: run.phase === 'cue' ? true : null, onclick: async () => {
        run.phase = 'cue'; run.cueEnd = null; render('sh-respond');
        if (cueHas) { await playWithState(ctx, null, cue.clip.kind, cue.clip.id, { tradition, text: cue.spoken }); }
        run.cueEnd = clock();
        if (alive && st.drill === run && run.phase === 'cue') live.textContent = 'The leader has finished. Come in now.';
      } }, cueHas ? 'Play the leader\'s line' : 'Start');
      out.push(cueHas ? null : h('p', { class: 'small' }, 'No clip of the leader\'s line yet. Read it, press Start, then tap when you would come in.'),
        h('div', { class: 'sh-row' }, playBtn,
          h('button', { type: 'button', class: 'btn sh-big', id: 'sh-respond', disabled: run.phase === 'cue' ? null : true, onclick: () => {
            const t = clock();
            run.timing = timingOf(run.cueEnd == null ? -1 : t - run.cueEnd, cueHas);
            run.phase = 'read'; render('sh-resp-h');
          } }, 'Now I come in')));
    } else if (run.phase === 'read') {
      out.push(h('p', { 'data-timing': run.timing.band }, run.timing.label),
        h('section', { class: 'card', 'aria-labelledby': 'sh-resp-h' }, h('h3', { id: 'sh-resp-h', tabindex: '-1' }, 'Your Line: Read It Aloud'),
          ...resp.map((r) => h('div', { class: 'sh-line' }, h('p', { class: 'sh-he', lang: 'he', dir: 'rtl' }, r.shown), trNode(r.he, `drill:${d.id}:${r.clip.id}`),
            audioButton(h, ctx, { kind: r.clip.kind, id: r.clip.id, tradition, text: r.spoken, label: 'Hear it after you read' })))),
        h('p', {}, 'How did your reading go?'),
        h('div', { class: 'sh-row', role: 'group', 'aria-label': 'Your own check' }, ...[['smooth', 'I read it smoothly'], ['stumbled', 'I stumbled']].map(([k, label]) =>
          h('button', { type: 'button', class: 'btn', 'data-self': k, onclick: () => {
            rec = withPractice(rec, null, day(), { id: d.id, band: run.timing.band, self: k });
            for (const r of d.response) rec = withPractice(rec, r.entry, day());
            save(); run.self = k; run.phase = 'done'; render('sh-again');
          } }, label))));
    } else {
      out.push(h('p', { 'data-result': `${run.timing.band}/${run.self}` }, `${run.timing.label} Your check: ${run.self === 'smooth' ? 'read smoothly' : 'stumbled, so try it again soon'}.`),
        h('div', { class: 'sh-row' }, h('button', { type: 'button', class: 'btn', id: 'sh-again', onclick: () => { st.drill = { d, phase: 'ready' }; render('sh-cue'); } }, 'Try again'),
          h('button', { type: 'button', class: 'btn secondary', onclick: () => { st.drill = null; render('sh-tab-join'); } }, 'All drills')));
    }
    out.push(live);
    return out;
  }

  // ---------- Home rituals ----------
  function homeView() {
    const w = thisShabbat({ now: now(), loc: location(), parsha: cal?.parsha });
    const wk = rec.home?.[w.friday] ?? {};
    return [h('p', {}, `A Friday-night checklist for ${w.friday}, so you can lead the blessings at home. Tap a dotted word to hear it.`), fadeNote(),
      h('ol', { class: 'sh-home' }, ...comp.home.map((s) => h('li', { 'data-step': s.id },
        h('h2', {}, s.title), h('p', { class: 'small' }, s.when, s.id === 'candles' && w.candles ? `. This Friday: ${w.candles.time} ${w.candles.tz} in ${w.candles.place} (approximate).` : '.'),
        ...s.entries.map((id) => {
          const e = S.byId.get(id), lines = linesOf(e), words = wordsOf(e), card = { id, he: lines };
          const clip = clipFor(ctx.audio, card, tradition);
          return h('div', { class: 'card', 'data-entry': id }, h('p', { class: 'small muted' }, `${e.title} (${e.ref})`),
            ...lines.map((line, k) => h('div', { class: 'sh-line' }, wordLine(e, words[k]), trNode(line, `home:${id}:${k}`))),
            audioButton(h, ctx, { kind: clip ? clip.kind : (lines.length > 1 ? 'prayer' : 'line'), id: clip ? clip.id : id, tradition, text: lines.map((l, k) => partOf(S.byId, { entry: id, line: k + 1 })?.spoken).join(' '), label: 'Play', name: e.title }));
        }),
        h('button', { type: 'button', class: 'btn secondary', 'data-done': s.id, 'aria-pressed': wk[s.id] ? 'true' : 'false', onclick: () => { rec = withHomeStep(rec, w.friday, s.id, !wk[s.id]); for (const id of s.entries) if (!wk[s.id]) rec = withPractice(rec, id, day()); save(); render(); } }, wk[s.id] ? 'Done' : 'Mark as done')))),
      h('p', { class: 'small muted' }, 'Customs differ: some families add other songs and blessings. These steps use only the blessings Aleph holds.')];
  }

  function render(focusId) {
    const body = st.mode === 'week' ? weekView() : st.mode === 'map' ? mapView() : st.mode === 'follow' ? followView() : st.mode === 'join' ? joinView() : homeView();
    main.replaceChildren(tabs(), jumps(), ...body.filter(Boolean));
    if (focusId) main.querySelector('#' + focusId)?.focus?.();
  }
  render();
  // word clips are listed in per-tradition files that load on first use: draw again once the list is in, so word buttons appear
  if (ctx.audio && typeof ctx.audio.ensureManifest === 'function') Promise.resolve(ctx.audio.ensureManifest()).then(() => { if (alive && !st.drill) render(); }).catch(() => {});
  return () => {
    alive = false;
    globalThis.document?.removeEventListener?.('keydown', onKey);
    globalThis.document?.removeEventListener?.('visibilitychange', onVisible);
    try { lock?.release?.(); } catch { /* ignore */ }
    lock = null; wantLock = false;
  };
}
