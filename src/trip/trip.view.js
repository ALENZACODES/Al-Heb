// @ts-check
// Israel trip (#/trip). mount(root, ctx) => unmount. Two parts on one page:
//   Trip Planner   days, a place for each, the kinds of stop, and the stored Hebrew lines each stop needs; saved on this device,
//                  and saved as a text file when the learner asks
//   At The Restaurant   read a Hebrew menu, order by tapping or typing, answer the waiter (who may mishear), ask for the bill, check it
// Every Hebrew line is a stored one (data/talk/pack.json). Nothing leaves the device. Store key: trip.v1.
// Tests inject ctx.tripData {pack}, ctx.rng.
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { TRIP_KEY, STOPS, MAX_DAYS, israelPlaces, linesFor, normalizePlan, addDay, removeDay, toggleStop, planText, menu, line, newVisit, readOrder, heardAs, bill, checkVisit, newBoard, board } from './trip.js';

export const COPY = Object.freeze({
  title: 'Israel Trip',
  lead: 'Plan your days and take the Hebrew you will need for each stop. Then practise ordering a meal.',
  planner: 'Trip Planner', restaurant: 'At The Restaurant', station: 'At The Station',
  stationHint: 'Read the board and press the line you would board.',
  noDays: 'No days yet. Pick a place and add your first day.',
  full: `A plan holds up to ${MAX_DAYS} days.`,
  task: 'You are at a table. Read the menu and order these three things:',
  orderHint: 'Tap the dishes on the menu, or type your order in Hebrew.',
  nothing: 'Choose at least one dish first.',
});
export const CSS = `
.alef-trip{max-inline-size:42rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-trip *{box-sizing:border-box;max-inline-size:100%}
.alef-trip .tp-tabs,.alef-trip .tp-row{display:flex;gap:.5rem;flex-wrap:wrap;margin-block:.6rem}
.alef-trip .tp-tabs button{flex:1 1 9rem}
.alef-trip .tp-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.alef-trip .btn,.alef-trip select,.alef-trip input[type=text]{min-block-size:var(--tap,48px);font:inherit}
.alef-trip select,.alef-trip input[type=text]{inline-size:100%;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-trip .tp-lines{list-style:none;padding:0;margin:.4rem 0}
.alef-trip .tp-lines li{padding-block:.3rem;border-block-start:1px solid var(--border,#999)}
.alef-trip .tp-he{font-size:1.3rem;display:block}
.alef-trip .tp-menu{display:grid;grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:.5rem}
.alef-trip .tp-menu button{display:flex;flex-direction:column;align-items:center;gap:.15rem}
.alef-trip .tp-menu button[aria-pressed=true]{outline:3px solid currentColor}
.alef-trip .tp-check{display:flex;align-items:center;gap:.5rem;min-block-size:44px}
`;

/** @param {HTMLElement} root @param {any} [ctx] */
export async function mount(root, ctx = {}) {
  let alive = true;
  const pack = (ctx.tripData && ctx.tripData.pack) || await loadJSON('data/talk/pack.json').catch(() => null);
  let plan = normalizePlan(await storeGet(ctx, TRIP_KEY, null));
  if (!alive) return () => {};
  const keep = async (next) => { plan = normalizePlan(next); await storeSet(ctx, TRIP_KEY, plan); };
  const rng = ctx.rng || Math.random;
  const kids = (...xs) => xs.flat().filter(Boolean);
  const pair = (l, cls = 'tp-he') => (l ? [heText(l.he, `alef-he ${cls}`), el('span', { class: 'muted' }, l.en)] : []);

  const wrap = el('section', { class: 'alef-trip', 'aria-labelledby': 'tp-title' }, el('style', {}, CSS), el('h1', { id: 'tp-title' }, COPY.title), el('p', {}, COPY.lead));
  const panel = el('div', { id: 'tp-panel' }); const tabs = {};
  const show = (name) => { for (const [k, b] of Object.entries(tabs)) b.setAttribute('aria-pressed', String(k === name)); panel.replaceChildren(views[name]()); };
  const bar = el('div', { class: 'tp-tabs', role: 'group', 'aria-label': 'Parts of Israel Trip' });
  for (const name of ['planner', 'restaurant', 'station']) { tabs[name] = el('button', { type: 'button', class: 'btn secondary', 'data-tab': name, 'aria-pressed': 'false', onclick: () => show(name) }, COPY[name]); bar.append(tabs[name]); }
  wrap.append(bar, panel);

  function planner() {
    const places = israelPlaces(pack);
    const host = el('div', {}); const note = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
    const more = {};   // how many lines each stop of each day shows
    const paint = () => {
      const name = /** @type {HTMLInputElement} */ (el('input', { type: 'text', id: 'tp-name', maxlength: '80', dir: 'auto', onchange: async (e) => { await keep({ ...plan, name: e.target.value }); } })); name.value = plan.name;
      const pick = el('select', { id: 'tp-place' }, places.map((p) => el('option', { value: p.he }, `${p.en} (${p.he})`)));
      const add = el('button', { type: 'button', class: 'btn', id: 'tp-add', onclick: async () => { if (plan.days.length >= MAX_DAYS) { note.textContent = COPY.full; return; } await keep(addDay(plan, /** @type {any} */ (pick).value || places[0]?.he)); if (alive) paint(); } }, 'Add A Day');
      const days = plan.days.map((d, i) => {
        const en = places.find((p) => p.he === d.place)?.en || '';
        const card = el('div', { class: 'tp-card', 'data-day': String(i) }, el('h3', {}, `Day ${i + 1}: ${en} `, heText(d.place)));
        for (const s of STOPS) {
          const box = /** @type {HTMLInputElement} */ (el('input', { type: 'checkbox', id: `tp-${i}-${s.id}`, onchange: async () => { await keep(toggleStop(plan, i, s.id)); if (alive) paint(); } })); box.checked = d.stops.includes(s.id);
          card.append(el('label', { class: 'tp-check', for: `tp-${i}-${s.id}` }, box, s.label));
          if (!d.stops.includes(s.id)) continue;
          const all = linesFor(pack, s.id); const n = more[`${i}-${s.id}`] || 6;
          card.append(el('ul', { class: 'tp-lines', 'aria-label': `${s.label}, day ${i + 1}` }, all.slice(0, n).map((l) => el('li', {}, pair(l)))));
          if (all.length > n) card.append(el('button', { type: 'button', class: 'btn secondary', onclick: () => { more[`${i}-${s.id}`] = n + 6; paint(); } }, `More Lines For ${s.label}`));
        }
        card.append(el('div', { class: 'tp-row' }, el('button', { type: 'button', class: 'btn secondary', 'data-remove': String(i), onclick: async () => { await keep(removeDay(plan, i)); if (alive) paint(); } }, `Remove Day ${i + 1}`)));
        return card;
      });
      const save = el('button', { type: 'button', class: 'btn secondary', id: 'tp-export', hidden: !plan.days.length, onclick: () => {
        try { const a = el('a', { href: URL.createObjectURL(new Blob([planText(plan, pack)], { type: 'text/plain;charset=utf-8' })), download: 'israel-trip.txt' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); note.textContent = 'Your plan was saved as a text file.'; } catch { note.textContent = 'This browser could not save a file.'; }
      } }, 'Save My Plan As A File');
      host.replaceChildren(...kids(
        el('div', { class: 'tp-card' }, el('h2', {}, 'Your Plan'), el('label', { for: 'tp-name' }, 'Name Of The Trip'), name, el('label', { for: 'tp-place' }, 'Where Will You Be?'), pick, el('div', { class: 'tp-row' }, add, save), note),
        plan.days.length ? days : el('p', { id: 'tp-empty' }, COPY.noDays)));
    };
    paint();
    return host;
  }

  function restaurant() {
    const m = menu(pack); const byId = new Map(m.map((x) => [x.id, x]));
    if (m.length < 6) return el('p', {}, 'The menu could not load. Check your connection and open the page again.');
    const visit = newVisit(pack, rng);
    const done = { order: [], confirmed: false, arrived: [], asked: '', verdict: 'fine' };
    const host = el('div', { class: 'tp-card' });
    const names = (ids) => ids.map((id) => byId.get(id).he).join(', ');
    const say = (who, he, en) => el('p', {}, el('strong', {}, `${who}: `), heText(he, 'alef-he tp-he'), en ? el('span', { class: 'muted' }, en) : null);
    const choice = (id, l, go) => el('button', { type: 'button', class: 'btn', 'data-say': id, onclick: go }, kids(pair(l)));

    const order = () => {
      const picked = new Set(done.order); const note = el('p', { role: 'status', 'aria-live': 'polite' });
      const typed = /** @type {HTMLInputElement} */ (el('input', { type: 'text', id: 'tp-typed', lang: 'he', dir: 'rtl', autocomplete: 'off', spellcheck: 'false' }));
      const grid = el('div', { class: 'tp-menu', role: 'group', 'aria-label': 'Menu' }, m.map((x) => {
        const b = el('button', { type: 'button', class: 'btn secondary', 'data-dish': x.id, 'aria-pressed': String(picked.has(x.id)), onclick: () => { if (picked.has(x.id)) picked.delete(x.id); else picked.add(x.id); b.setAttribute('aria-pressed', String(picked.has(x.id))); } }, heText(x.he, 'alef-he tp-he'), el('span', {}, `${x.price} ₪`));
        return b;
      }));
      const send = () => {
        const fromText = readOrder(pack, typed.value);
        done.order = m.map((x) => x.id).filter((id) => picked.has(id) || fromText.includes(id));
        if (!done.order.length) { note.textContent = COPY.nothing; return; }
        repeat();
      };
      host.replaceChildren(el('h2', {}, 'Your Order'), el('p', {}, COPY.task), el('p', { id: 'tp-want' }, el('strong', {}, visit.want.map((id) => byId.get(id).en).join(', '))),
        say('Waiter', line(pack, 'order')?.he || '', ''), el('p', { class: 'muted' }, COPY.orderHint), grid, el('label', { for: 'tp-typed' }, 'Or Type Your Order In Hebrew'), typed,
        el('div', { class: 'tp-row' }, el('button', { type: 'button', class: 'btn', id: 'tp-send', onclick: send }, 'Order')), note);
    };
    const repeat = () => {
      const heard = heardAs(visit, done.order);
      host.replaceChildren(el('h2', {}, 'The Waiter Repeats Your Order'), say('You', names(done.order), ''), say('Waiter', `${names(heard)}?`, ''), el('p', {}, 'Is that what you ordered?'),
        el('div', { class: 'tp-row' }, choice('yes', line(pack, 'yes'), () => { done.confirmed = true; done.arrived = heard; table(); }), choice('no', line(pack, 'no'), () => { done.confirmed = false; done.arrived = done.order; fixed(); })));
    };
    const fixed = () => {
      host.replaceChildren(el('h2', {}, 'The Waiter Tries Again'), say('Waiter', `${names(done.order)}. ${line(pack, 'ok')?.he || ''}`, ''), el('div', { class: 'tp-row' }, el('button', { type: 'button', class: 'btn', id: 'tp-on', onclick: table }, 'Go On')));
    };
    const table = () => {
      host.replaceChildren(...kids(el('h2', {}, 'At The Table'), say('Waiter', line(pack, 'enjoy')?.he || '', line(pack, 'enjoy')?.en), el('p', {}, 'On the table: ', heText(names(done.arrived))),
        el('p', {}, 'You have finished eating. What do you say?'),
        el('div', { class: 'tp-row' }, ['menu', 'bill', 'water'].map((k) => choice(k, line(pack, k), () => { done.asked = k; pay(); })))));
    };
    const pay = () => {
      const b = bill(pack, visit, done.arrived);
      host.replaceChildren(...kids(el('h2', {}, 'The Bill'), done.asked === 'bill' ? null : el('p', {}, 'That was not the bill. The waiter brings it anyway.'),
        el('ul', { class: 'tp-lines', id: 'tp-bill' }, b.rows.map((x) => el('li', {}, heText(x.he), ` ${x.price} ₪`)), el('li', {}, el('strong', {}, `Total: ${b.total} ₪`))),
        el('p', {}, 'Look at the bill. What do you say?'),
        el('div', { class: 'tp-row' }, choice('fine', line(pack, 'fine'), () => { done.verdict = 'fine'; result(); }), choice('mistake', line(pack, 'mistake'), () => { done.verdict = 'mistake'; result(); }))));
    };
    const result = async () => {
      const r = checkVisit(visit, done);
      if (r.points > plan.best) await keep({ ...plan, best: r.points });
      if (!alive) return;
      host.replaceChildren(el('h2', {}, 'How It Went'), el('p', { id: 'tp-score', role: 'status' }, `${r.points} of ${r.of}. Your best: ${Math.max(plan.best, r.points)} of ${r.of}.`),
        el('ul', { class: 'tp-lines' }, r.checks.map((c) => el('li', { 'data-check': c.id, 'data-ok': String(c.ok) }, `${c.ok ? 'Yes' : 'No'}: ${c.text}`))),
        el('p', {}, 'You came for: ', heText(names(visit.want))),
        el('div', { class: 'tp-row' }, el('button', { type: 'button', class: 'btn', id: 'tp-again', onclick: () => show('restaurant') }, 'Another Visit')));
    };
    order();
    return host;
  }

  function station() {
    const ROUNDS = 5; let n = 0, right = 0;
    const host = el('div', { class: 'tp-card' });
    const round = () => {
      if (n >= ROUNDS) { host.replaceChildren(el('h2', {}, 'How It Went'), el('p', { id: 'tp-station-score', role: 'status' }, `${right} of ${ROUNDS} right.`), el('button', { type: 'button', class: 'btn', onclick: () => show('station') }, 'Another Five')); return; }
      const b = newBoard(pack, rng); const out = el('div', { id: 'tp-station-result', role: 'status', 'aria-live': 'polite' }); let done = false;
      const rows = b.rows.map((r) => el('button', { type: 'button', class: 'btn secondary', 'data-row': String(r.id), 'data-role': r.role, onclick: () => {
        if (done) return; done = true; const res = board(b, r.id); if (res.ok) right++; n++;
        out.replaceChildren(el('p', {}, el('strong', {}, res.text)), el('button', { type: 'button', class: 'btn', id: 'tp-station-next', onclick: round }, n >= ROUNDS ? 'See My Score' : 'Next Board'));
      } }, kids(el('span', {}, `${r.time} `), heText(r.kindHe), ' ', heText(r.to.he), el('span', {}, ` Platform ${r.bay}`), r.late ? heText(r.lateHe) : null)));
      host.replaceChildren(el('h2', {}, 'Departures'), el('p', { class: 'muted' }, `Board ${n + 1} of ${ROUNDS}`), el('p', { id: 'tp-station-task' }, `You have a ${b.want.kind} ticket to ${b.want.to.en}. Take the first one that is on time.`), el('p', { class: 'muted' }, COPY.stationHint),
        el('div', { class: 'tp-row', role: 'group', 'aria-label': 'Departures board', style: 'flex-direction:column' }, rows), out);
    };
    round();
    return host;
  }

  const views = { planner, restaurant, station };
  root.replaceChildren(wrap);
  show(ctx.query && views[ctx.query.part] ? ctx.query.part : 'planner');
  return () => { alive = false; };
}
