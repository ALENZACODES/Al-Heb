// @ts-check
// Israel trip: the Trip Planner and the restaurant scene. Pure functions: no DOM, no network, no storage.
// Every Hebrew line is one the app already stores (data/talk/pack.json: everyday lines by topic, nouns, places).
// Nothing comes from outside and nothing leaves the device (store key trip.v1).

export const TRIP_KEY = 'trip.v1';
export const MAX_DAYS = 21;
const MARKS = /[֑-ֽֿ-ׇ]/g;
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** A Hebrew line made ready to compare: no vowel points, no punctuation, final letters as ordinary ones. @param {string} s */
export const heKey = (s) => String(s || '').normalize('NFKC').replace(MARKS, '').replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/[^א-ת0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();

/** What a stop of the trip can be, and the topics of stored lines that go with it. */
export const STOPS = Object.freeze([
  { id: 'around', label: 'Getting Around', cats: ['directions'] },
  { id: 'hotel', label: 'Hotel', cats: ['hotel'] },
  { id: 'eat', label: 'Eating Out', cats: ['ordering'] },
  { id: 'shop', label: 'Shops And Markets', cats: ['shopping', 'numbers'] },
  { id: 'people', label: 'Meeting People', cats: ['greetings', 'smalltalk', 'politeness'] },
  { id: 'shul', label: 'Synagogue', cats: ['shul'] },
  { id: 'help', label: 'If Something Goes Wrong', cats: ['emergencies', 'language'] },
]);
const ISRAEL = ['jerusalem', 'tel aviv', 'haifa', 'eilat', 'beer sheva', 'tiberias', 'safed', 'the dead sea', 'nazareth'];
const title = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** The places in Israel the app has a Hebrew name for. @returns {{he:string, en:string}[]} */
export function israelPlaces(pack) {
  const by = new Map(((pack && pack.places) || []).map((p) => [p.en[0], p.he]));
  return ISRAEL.filter((n) => by.has(n)).map((n) => ({ he: by.get(n), en: title(n) }));
}

/** The stored lines for one kind of stop, in their stored order. Lines that hold the four-letter Name are left out. */
export function linesFor(pack, stopId) {
  const stop = STOPS.find((s) => s.id === stopId); if (!stop) return [];
  const out = [];
  for (const cat of stop.cats) for (const p of (pack && pack.phrases) || []) if (p.cat === cat && p.en?.[0] && !heKey(p.he).includes('יהוה')) out.push({ id: p.id, he: p.he, en: p.en[0] });
  return out;
}

/** @param {any} [saved] @returns {{name:string, days:{place:string, stops:string[]}[], best:number}} */
export function normalizePlan(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const ok = new Set(STOPS.map((x) => x.id));
  const days = (Array.isArray(s.days) ? s.days : []).filter((d) => d && typeof d.place === 'string').slice(0, MAX_DAYS)
    .map((d) => ({ place: d.place, stops: [...new Set((Array.isArray(d.stops) ? d.stops : []).filter((x) => ok.has(x)))] }));
  return { name: typeof s.name === 'string' ? s.name.slice(0, 80) : '', days, best: Number.isFinite(s.best) ? s.best : 0 };
}
export const addDay = (plan, place) => { const p = normalizePlan(plan); return p.days.length >= MAX_DAYS ? p : { ...p, days: [...p.days, { place, stops: [] }] }; };
export const removeDay = (plan, i) => { const p = normalizePlan(plan); return { ...p, days: p.days.filter((_, k) => k !== i) }; };
export const toggleStop = (plan, i, stopId) => {
  const p = normalizePlan(plan);
  return { ...p, days: p.days.map((d, k) => (k !== i ? d : { ...d, stops: d.stops.includes(stopId) ? d.stops.filter((x) => x !== stopId) : STOPS.filter((s) => s.id === stopId || d.stops.includes(s.id)).map((s) => s.id) })) };
};

/** The plan as plain text to keep or print: each day, its place, its stops and up to `perStop` lines for each. */
export function planText(plan, pack, perStop = 6) {
  const p = normalizePlan(plan); const places = new Map(israelPlaces(pack).map((x) => [x.he, x.en]));
  const lines = [p.name || 'My Israel Trip', ''];
  p.days.forEach((d, i) => {
    lines.push(`Day ${i + 1}: ${places.get(d.place) || ''} (${d.place})`);
    for (const id of d.stops) {
      lines.push(`  ${STOPS.find((s) => s.id === id).label}`);
      for (const l of linesFor(pack, id).slice(0, perStop)) lines.push(`    ${l.he}  -  ${l.en}`);
    }
    lines.push('');
  });
  return lines.join('\n');
}

// ---- the restaurant scene --------------------------------------------------------------------------------------------------------
/** The menu: English names of stored nouns, with a price in shekels. A dish is on the menu only if the app stores its Hebrew. */
const MENU = [['falafel', 24], ['hummus', 28], ['pita', 6], ['salad', 32], ['soup', 30], ['chicken', 58], ['fish', 72], ['rice', 18], ['pizza', 48], ['sandwich', 36], ['cake', 26], ['ice cream', 22],
  ['water', 8], ['coffee', 14], ['tea', 12], ['juice', 16], ['beer', 28], ['wine', 34]];
/** Dishes a waiter could mix up: the Hebrew names look or sound alike. */
const MIXUPS = [['pita', 'pizza'], ['juice', 'water'], ['coffee', 'tea'], ['soup', 'rice'], ['cake', 'chicken'], ['beer', 'wine'], ['falafel', 'hummus'], ['salad', 'sandwich'], ['fish', 'ice cream']];
/** The stored lines the scene speaks with, by what they do. */
export const SCENE_LINES = Object.freeze({ order: 't-can-order', yes: 't-yes', no: 't-no', bill: 't-bill', menu: 't-menu-please', water: 't-more-water', fine: 't-thats-all', mistake: 't-mistake-bill', enjoy: 't-enjoy-meal', ok: 't-ok' });

/** @returns {{id:string, he:string, en:string, price:number}[]} */
export function menu(pack) {
  const by = new Map(((pack && pack.nouns) || []).map((n) => [n.en[0], n.he]));
  return MENU.filter(([en]) => by.has(en)).map(([en, price]) => ({ id: en, he: by.get(en), en: title(en), price }));
}
export function line(pack, key) { const p = ((pack && pack.phrases) || []).find((x) => x.id === SCENE_LINES[key]); return p ? { he: p.he, en: p.en[0] } : null; }

/**
 * A new visit: what to order (three different things), whether the waiter will mishear one of them and which, and whether
 * the bill will carry something that was never ordered.
 * @param {any} pack @param {()=>number} [rng]
 */
export function newVisit(pack, rng = Math.random) {
  const m = menu(pack); const ids = m.map((x) => x.id); const want = [];
  while (want.length < 3 && want.length < ids.length) { const id = ids[Math.floor(rng() * ids.length)]; if (!want.includes(id)) want.push(id); }
  let heard = null;
  if (rng() < 0.6) for (const id of want) { const pair = MIXUPS.find((p) => p.includes(id)); const other = pair && pair.find((x) => x !== id); if (other && ids.includes(other) && !want.includes(other)) { heard = { said: id, heard: other }; break; } }
  const extras = ids.filter((id) => !want.includes(id) && id !== heard?.heard);
  const extra = rng() < 0.4 && extras.length ? extras[Math.floor(rng() * extras.length)] : null;
  return { want, heard, extra };
}

/** Reads a typed order: the menu items named in it, in menu order. Words that are not on the menu are ignored. */
export function readOrder(pack, typed) {
  const text = ` ${heKey(typed)} `;
  return menu(pack).filter((x) => text.includes(` ${heKey(x.he)} `) || text.includes(` ו${heKey(x.he)} `)).map((x) => x.id);   // "and" is written onto the word: וקפה
}
const same = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
/** What the waiter says back for an order: the order as heard (one dish may be the wrong one). */
export function heardAs(visit, order) { return order.map((id) => (visit.heard && id === visit.heard.said ? visit.heard.heard : id)); }
/** The bill for what arrived: every dish with its price, the extra line if this visit has one, and the total. */
export function bill(pack, visit, arrived) {
  const m = new Map(menu(pack).map((x) => [x.id, x]));
  const rows = [...arrived, ...(visit.extra ? [visit.extra] : [])].map((id) => m.get(id)).filter(Boolean);
  return { rows, total: rows.reduce((a, x) => a + x.price, 0), right: !visit.extra };
}

/**
 * Checks a finished visit.
 * @param {{want:string[], heard:any, extra:string|null}} visit
 * @param {{order:string[], confirmed:boolean, arrived:string[], asked:string, verdict:'fine'|'mistake'}} done
 * @returns {{points:number, of:number, checks:{id:string, ok:boolean, text:string}[]}}
 */
export function checkVisit(visit, done) {
  const misheard = !same(heardAs(visit, done.order), done.order);
  const checks = [
    { id: 'order', ok: same(done.order, visit.want), text: 'You ordered what you came for.' },
    { id: 'repeat', ok: misheard ? !done.confirmed : done.confirmed, text: misheard ? 'The waiter repeated it wrongly, and you said no.' : 'The waiter repeated it rightly, and you said yes.' },
    { id: 'table', ok: same(done.arrived, visit.want), text: 'The right dishes came to the table.' },
    { id: 'bill', ok: done.asked === 'bill', text: 'You asked for the bill.' },
    { id: 'total', ok: done.verdict === (visit.extra ? 'mistake' : 'fine'), text: visit.extra ? 'The bill had a dish you never ordered, and you said so.' : 'The bill was right, and you said so.' },
  ];
  return { points: checks.filter((c) => c.ok).length, of: checks.length, checks };
}

// ---- the bus and train board -------------------------------------------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
/**
 * A departures board and a trip to catch. Every Hebrew word on it is stored: the nouns for bus and train, the place names,
 * and the two lines that say a bus or a train is late. The right pick is the first service of the right kind to the right
 * place that is not late.
 * @param {any} pack @param {()=>number} [rng]
 */
export function newBoard(pack, rng = Math.random) {
  const places = israelPlaces(pack); const noun = new Map(((pack && pack.nouns) || []).map((n) => [n.en[0], n.he]));
  const late = { bus: ((pack && pack.phrases) || []).find((p) => p.id === 't-bus-late')?.he || '', train: ((pack && pack.phrases) || []).find((p) => p.id === 't-train-late')?.he || '' };
  const pick = (xs) => xs[Math.floor(rng() * xs.length)];
  const kind = rng() < 0.5 ? 'bus' : 'train'; const other = kind === 'bus' ? 'train' : 'bus';
  const to = pick(places); const rest = places.filter((p) => p.he !== to.he);
  const start = 6 * 60 + Math.floor(rng() * 12) * 60 + pick([0, 10, 20, 30, 40, 50]);
  const row = (k, place, minutes, isLate, role) => ({ kind: k, kindHe: noun.get(k), to: place, minutes, time: `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`, late: isLate, lateHe: isLate ? late[k] : '', role });
  const rows = [
    row(kind, to, start, true, 'late'),                       // the right kind and place, but late
    row(kind, to, start + 20, false, 'right'),                // the one to catch
    row(kind, to, start + 80, false, 'later'),                // gets there, much later
    row(other, to, start + 10, false, 'other-kind'),          // right place, wrong kind of ride
    row(kind, pick(rest), start + 15, false, 'wrong-place'),
    row(other, pick(rest), start + 30, false, 'wrong-place'),
  ].sort((a, b) => a.minutes - b.minutes).map((r, i) => ({ ...r, id: i, bay: 1 + ((i * 3 + Math.floor(start / 10)) % 9) }));
  return { want: { kind, to }, rows };
}
/** What happens when the learner boards a row of the board. @returns {{ok:boolean, text:string}} */
export function board(b, id) {
  const r = b.rows.find((x) => x.id === id); if (!r) return { ok: false, text: 'Pick a line of the board.' };
  const ride = (k) => (k === 'bus' ? 'bus' : 'train');
  if (r.role === 'right') return { ok: true, text: `Right. The ${ride(r.kind)} to ${r.to.en} leaves at ${r.time}, on time.` };
  if (r.role === 'late') return { ok: false, text: `That ${ride(r.kind)} goes to ${r.to.en}, but the board says it is late. The next one would have got you there sooner.` };
  if (r.role === 'later') return { ok: false, text: `You reach ${r.to.en}, an hour later than you needed to. An earlier ${ride(r.kind)} was on time.` };
  if (r.role === 'other-kind') return { ok: false, text: `That goes to ${r.to.en}, but it is a ${ride(r.kind)}. Your ticket is for the ${ride(b.want.kind)}.` };
  return { ok: false, text: `You are on the way to ${r.to.en}, not ${b.want.to.en}.` };
}

// ---- money: shekels in words, coins to pay with, change to give ------------------------------------------------------------------
export const COINS = Object.freeze([10, 5, 2, 1]);
/** A shekel amount from 1 to 19 in Hebrew words, from the stored number forms and the stored noun (שקל אחד, שני שקלים, חמישה שקלים). */
export function amountHe(pack, n) {
  const list = (pack && pack.numbers && pack.numbers.list) || []; const row = list.find((x) => x.n === n);
  const noun = ((pack && pack.nouns) || []).find((x) => x.en[0] === 'shekel');
  if (!row || !noun || n < 1 || n > 19) return '';
  if (n === 1) return `${noun.he} ${row.m}`;
  if (n === 2) return `${row.mConstruct} ${noun.pl}`;
  return `${row.m} ${noun.pl}`;
}
/** The fewest coins that make an amount. @param {number} n */
export function fewestCoins(n) { const out = []; let left = n; for (const c of COINS) while (left >= c) { out.push(c); left -= c; } return out; }
/** A money task: pay a price exactly, or give the change from a 20-shekel note. The amount to make is 1 to 19. */
export function newMoneyTask(pack, rng = Math.random) {
  const kind = rng() < 0.5 ? 'pay' : 'change'; const price = 1 + Math.floor(rng() * 19);
  const target = kind === 'pay' ? price : 20 - price;
  return { kind, price, target, priceHe: amountHe(pack, price), ask: kind === 'pay' ? 'Pay this price exactly, with as few coins as you can.' : 'The buyer hands you a 20-shekel note for this price. Give the change, with as few coins as you can.' };
}
/** @param {{target:number}} task @param {number[]} picked @returns {{exact:boolean, fewest:boolean, sum:number, best:number[]}} */
export function checkCoins(task, picked) {
  const sum = picked.reduce((a, c) => a + c, 0); const best = fewestCoins(task.target);
  return { exact: sum === task.target, fewest: sum === task.target && picked.length === best.length, sum, best };
}

// ---- the market stall ------------------------------------------------------------------------------------------------------------
/** The stored lines a buyer can say at the stall. */
export const STALL_LINES = Object.freeze({ expensive: 't-too-expensive', discount: 't-discount', take: 't-take-it', leave: 't-dont-want' });
const STALL_GOODS = ['bowl', 'plate', 'glass', 'bottle', 'towel', 'chair', 'key'];
export function stallLine(pack, key) { const p = ((pack && pack.phrases) || []).find((x) => x.id === STALL_LINES[key]); return p ? { he: p.he, en: p.en[0] } : null; }
/** A new stall: something to buy, the price the keeper opens with, and the lowest price the keeper will take (never shown). */
export function newStall(pack, rng = Math.random) {
  const nouns = ((pack && pack.nouns) || []).filter((n) => STALL_GOODS.includes(n.en[0]));
  const thing = nouns[Math.floor(rng() * nouns.length)] || { he: '', en: [''] };
  const open = 60 + 10 * Math.floor(rng() * 15); const floor = 10 * Math.round((open * (0.6 + 0.15 * rng())) / 10);
  return { thing: { he: thing.he, en: thing.en[0] }, open, floor, price: open, drops: 0, asked: false, over: false, deal: false, paid: 0, said: `${open} ₪` };
}
/**
 * One move at the stall. `move` is a stored line (expensive, discount, take, leave) or {offer: shekels}.
 * Saying it is too expensive brings the price down twice; a third time the keeper turns away. Asking for a discount works once.
 * An offer at or above the keeper's lowest price is taken; a little under it gets a counter-price; far under it ends the talk.
 */
export function stallMove(s, move) {
  if (s.over) return s;
  const step = Math.max(10, 10 * Math.round(s.open / 100));
  const end = (deal, paid, said) => ({ ...s, over: true, deal, paid, said });
  if (move === 'take') return end(true, s.price, 'Sold.');
  if (move === 'leave') return end(false, 0, 'The keeper shrugs. No sale.');
  if (move === 'expensive') {
    if (s.drops >= 2 || s.price <= s.floor) return end(false, 0, 'The keeper has heard enough and turns to the next buyer.');
    const price = Math.max(s.floor, s.price - step); return { ...s, price, drops: s.drops + 1, said: `${price} ₪` };
  }
  if (move === 'discount') {
    if (s.asked) return { ...s, said: `No more off. ${s.price} ₪` };
    const price = Math.max(s.floor, s.price - step / 2); return { ...s, price, asked: true, said: `${price} ₪` };
  }
  const offer = Math.floor(Number(move && move.offer));
  if (!Number.isFinite(offer) || offer <= 0) return { ...s, said: `Name a price in shekels. ${s.price} ₪` };
  if (offer >= s.price) return end(true, s.price, 'Sold.');
  if (offer >= s.floor) return end(true, offer, 'Sold.');
  if (offer >= 0.8 * s.floor) { const price = Math.max(s.floor, Math.min(s.price, 5 * Math.round((s.price + offer) / 10))); return { ...s, price, said: `${price} ₪` }; }
  return end(false, 0, 'The keeper laughs at that price and turns away.');
}
/** How the buying went, in plain words. */
export function stallResult(s) {
  if (!s.over) return '';
  if (!s.deal) return 'No deal this time.';
  const off = s.open - s.paid;
  return off <= 0 ? `You paid the first price, ${s.paid} shekels. Try asking for less next time.` : `You paid ${s.paid} shekels, ${off} less than the first price.${s.paid === s.floor ? ' That was the lowest the keeper would go.' : ''}`;
}

// ---- street signs ----------------------------------------------------------------------------------------------------------------
/** Signs to read, from the camera translator's sign list (data/camera/sign-glossary.json): Hebrew as printed, and what it says. */
export function signItems(glossary) {
  const seen = new Set();
  return ((glossary && glossary.entries) || []).filter((e) => e && e.he && e.en && !heKey(e.he).includes('יהוה') && !seen.has(e.en) && seen.add(e.en)).map((e) => ({ he: e.he, pointed: e.pointed || '', en: e.en }));
}
/** One sign and four meanings to choose from, one of them right. */
export function signQuestion(items, rng = Math.random) {
  const sign = items[Math.floor(rng() * items.length)]; const options = [sign.en];
  for (let guard = 0; options.length < 4 && guard < 200; guard++) { const o = items[Math.floor(rng() * items.length)].en; if (!options.includes(o)) options.push(o); }
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { sign, options };
}

// ---- emergency lines -------------------------------------------------------------------------------------------------------------
const EMERGENCY = [
  { id: 'help', label: 'Help', ids: ['t-help', 't-need-help', 't-can-you-help', 't-emergency', 't-fire', 't-be-careful'] },
  { id: 'doctor', label: 'Doctor', ids: ['t-need-doctor', 't-call-doctor', 't-call-ambulance', 't-where-hospital', 't-not-well', 't-sick', 't-hurts-here', 't-headache', 't-stomach', 't-fever', 't-dizzy', 't-cant-breathe', 't-pregnant'] },
  { id: 'pharmacy', label: 'Pharmacy', ids: ['t-where-pharmacy', 't-headache', 't-stomach', 't-fever'] },
  { id: 'lost', label: 'Lost Or Stolen', ids: ['t-call-police', 't-lost-passport', 't-lost-phone', 't-lost-wallet', 't-stolen-passport', 't-stolen-phone', 't-stolen-wallet', 't-accident'] },
];
/** The emergency lines the app stores, in four groups. A line with a woman's form carries it. */
export function emergencyCards(pack) {
  const by = new Map(((pack && pack.phrases) || []).map((p) => [p.id, p]));
  return EMERGENCY.map((g) => ({ id: g.id, label: g.label, lines: g.ids.map((id) => by.get(id)).filter(Boolean).map((p) => ({ id: p.id, he: p.he, f: p.f || '', en: p.en[0] })) })).filter((g) => g.lines.length);
}

// ---- hotel check-in --------------------------------------------------------------------------------------------------------------
/** The steps of a check-in: what the guest needs, the stored line that asks for it, two stored lines that do not, and the desk's answer. */
export function hotelSteps(booked = true) {
  return [
    booked ? { id: 'arrive', goal: 'You booked a room. Tell the desk.', right: 't-room', wrong: ['t-room-free', 't-checkout'], reply: 'Welcome. Your room is 12, on the first floor.' }
      : { id: 'arrive', goal: 'You have no booking. Ask for a room for tonight.', right: 't-room-tonight', wrong: ['t-room', 't-checkout'], reply: 'Yes, we have one. Room 12, on the first floor.' },
    { id: 'breakfast', goal: 'Find out if breakfast comes with the room.', right: 't-breakfast-included', wrong: ['t-breakfast-time', 't-no-hot-water'], reply: 'Yes, breakfast is included.' },
    { id: 'breakfast-time', goal: 'Ask when breakfast is.', right: 't-breakfast-time', wrong: ['t-checkout', 't-breakfast-included'], reply: 'From 7:00 to 10:00.' },
    { id: 'wifi', goal: 'Ask for the wifi password.', right: 't-wifi-password', wrong: ['t-charge-where', 't-doesnt-work'], reply: 'It is on your key card.' },
    { id: 'checkout', goal: 'Ask when you must leave the room on the last day.', right: 't-checkout', wrong: ['t-breakfast-time', 't-room-tonight'], reply: 'Checkout is at 11:00.' },
  ];
}
/** The three stored lines offered at a step, in a mixed order. */
export function hotelChoices(pack, step, rng = Math.random) {
  const by = new Map(((pack && pack.phrases) || []).map((p) => [p.id, p]));
  const ids = [step.right, ...step.wrong]; for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.map((id) => ({ id, he: by.get(id)?.he || '', en: by.get(id)?.en[0] || '' }));
}
/** The card the desk hands over at the end: the guest's name and nights, the room, and each answer the guest managed to get. */
export function hotelCard(steps, picks, guest) {
  const name = String(guest?.name || '').trim().slice(0, 60) || 'Guest'; const nights = Math.max(1, Math.min(30, Math.floor(Number(guest?.nights)) || 1));
  const got = steps.filter((s) => picks[s.id] === s.right);
  return { name, nights, right: got.length, of: steps.length, lines: [`Guest: ${name}`, `Nights: ${nights}`, ...got.map((s) => s.reply)] };
}

// ---- the airport ------------------------------------------------------------------------------------------------------------------
/** Arriving and leaving: what the traveller needs, the stored line that says it, two stored lines that do not, and what happens. Same shape as hotelSteps. */
export function airportSteps() {
  return [
    { id: 'tourist', goal: 'You have just landed. Someone asks who you are. Say you are a tourist.', right: 't-tourist', wrong: ['t-lost-passport', 't-buy-ticket'], reply: 'They nod and wave you on.' },
    { id: 'suitcase', goal: 'Your suitcase is too heavy. Ask for help with it.', right: 't-help-suitcase', wrong: ['t-need-bag', 't-taxi-airport'], reply: 'A porter comes over with a trolley.' },
    { id: 'ticket', goal: 'You want the train into town. Ask where to buy a ticket.', right: 't-buy-ticket', wrong: ['t-how-many-tickets', 't-how-much-airport'], reply: 'They point to the machine by the door.' },
    { id: 'taxi', goal: 'Your last day. Ask the hotel desk for a taxi to the airport.', right: 't-taxi-airport', wrong: ['t-buy-ticket', 't-tourist'], reply: 'The desk calls one for you.' },
    { id: 'price', goal: 'The taxi is here. Ask the driver what the ride to the airport costs.', right: 't-how-much-airport', wrong: ['t-how-long', 't-how-many-tickets'], reply: 'The driver tells you the price.' },
    { id: 'go', goal: 'You get in. Tell the driver where to go.', right: 't-to-airport', wrong: ['t-how-long', 't-help-suitcase'], reply: 'The driver pulls out.' },
  ];
}

// ---- the map ----------------------------------------------------------------------------------------------------------------------
// Where each stored place is, as latitude and longitude. Used only to put a dot on the screen.
const WHERE = { 'jerusalem': [31.78, 35.22], 'tel aviv': [32.08, 34.78], 'haifa': [32.79, 34.99], 'eilat': [29.56, 34.95], 'beer sheva': [31.25, 34.79], 'tiberias': [32.79, 35.53], 'safed': [32.96, 35.50], 'the dead sea': [31.50, 35.47], 'nazareth': [32.70, 35.30] };
const MAP_BOX = { north: 33.2, south: 29.3, west: 34.2, east: 35.9 };
/** The stored places in Israel with a spot on the map: x and y are per cent across and down, north at the top. Numbered north to south. */
export function mapPlaces(pack) {
  const he = new Map(((pack && pack.places) || []).map((p) => [p.en[0], p.he]));
  return Object.entries(WHERE).filter(([n]) => he.has(n)).sort((a, b) => b[1][0] - a[1][0] || a[1][1] - b[1][1]).map(([n, [lat, lon]], i) => ({
    id: n.replace(/\s+/g, '-'), n: i + 1, he: he.get(n), en: n.replace(/\b[a-z]/g, (c) => c.toUpperCase()),
    x: Math.round(((lon - MAP_BOX.west) / (MAP_BOX.east - MAP_BOX.west)) * 1000) / 10, y: Math.round(((MAP_BOX.north - lat) / (MAP_BOX.north - MAP_BOX.south)) * 1000) / 10 }));
}
/** The order the places are asked in for one round: every place once. */
export function mapRound(places, rng = Math.random) {
  const ids = places.map((p) => p.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids;
}
