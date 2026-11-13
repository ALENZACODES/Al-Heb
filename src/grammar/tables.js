// @ts-check
// Grammar tables and drills (ideas O2 to O9). Pure: no DOM, no network. All Hebrew comes from data/grammar/tables.json,
// which was typed by hand; this file only lays it out and joins whole words into short phrases. It never changes a word.
export const PERSON_ORDER = Object.freeze(['1s', '2ms', '2fs', '3ms', '3fs', '1p', '2mp', '2fp', '3mp', '3fp']);
export const TABS = Object.freeze([
  ['pronouns', 'Pronouns'], ['prepositions', 'Prepositions'], ['numbers', 'Numbers'], ['questions', 'Question Words'],
  ['existence', 'There Is, I Have'], ['agreement', 'Describing Words'], ['comparing', 'Comparing'], ['construct', 'Of Pairs'],
]);
export const DRAFT_NOTE = 'These tables were typed by hand from the standard forms. No Hebrew teacher has checked them yet.';

/** mulberry32, the same small generator the other drills use. */
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, list) => list[Math.floor(r() * list.length)];
const shuffle = (r, list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fill = (s, map) => s.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');

// ---- joining whole words
/** "There is / is not" and "have / do not have". person '' gives the bare "there is" line. */
export function have(d, yes, person, thing) {
  const word = yes ? d.existence.yes : d.existence.no;
  const to = person ? d.prepositions.find((p) => p.id === 'le').forms[person] : '';
  const who = person ? d.persons[person].split(' / ')[0] : '';
  return { he: [word, to, thing.he].filter(Boolean).join(' '), en: person ? `${who} ${yes ? (/^(he|she)$/.test(who) ? 'has' : 'have') : (/^(he|she)$/.test(who) ? 'does not have' : 'do not have')} ${thing.en}` : `There is ${yes ? '' : 'no '}${thing.en}` };
}
/** The form of a describing word that copies a noun. */
export const adjFor = (adj, noun, plural) => adj[(noun.gender === 'f' ? 'f' : 'm') + (plural ? 'p' : 's')];
/** A noun with its describing word, one or many. */
export function describe(d, noun, adj, plural) {
  return { he: `${plural ? noun.p : noun.s} ${adjFor(adj, noun, plural)}`, en: `${plural ? 'more than one' : 'one'} ${adj.en} ${noun.en}` };
}
/** One comparing sentence. Both nouns carry "the". */
export function compare(d, patternId, a, b, adj) {
  const p = d.comparing.patterns.find((x) => x.id === patternId);
  const plain = (en) => en.split(/[,(]/)[0].trim();
  return { he: fill(p.tplHe, { A: a.the, B: b ? b.the : '', adj: adjFor(adj, a, false) }).trim(), en: fill(p.tplEn, { a: `the ${plain(a.en)}`, b: b ? `the ${plain(b.en)}` : '', q: plain(adj.en), er: adj.er, est: adj.est }) };
}

// ---- tables for the screen: {title, note?, head:[...], rows:[{cells:[{text?, he?}], say?:string}]}
const personTable = (d, title, forms, extra) => ({ title, head: ['Who', 'Hebrew', ...(extra ? ['In a line'] : [])], rows: PERSON_ORDER.map((p) => ({ cells: [{ text: d.persons[p] }, { he: forms[p] }, ...(extra ? [{ he: extra(p) }] : [])], say: forms[p] })) });

/** Every table of one tab. @param {any} d the parsed data file @param {string} tab */
export function tablesFor(d, tab) {
  if (tab === 'pronouns') return Object.values(d.pronouns).map((k) => ({ ...personTable(d, k.title, k.forms, (p) => fill(k.frame.tplHe, { x: k.forms[p] })), note: `${k.gloss}. The line: ${fill(k.frame.tplEn, { who: '...' })}` }));
  if (tab === 'prepositions') return d.prepositions.map((p) => ({ ...personTable(d, `${p.base}  ${p.en}`, p.forms), titleHe: p.base, note: p.note || '' }));
  if (tab === 'numbers') {
    const n = d.numbers;
    const two = (title, set, names) => ({ title, head: ['', 'With a masculine noun', 'With a feminine noun'], rows: n.values.map((v, i) => ({ cells: [{ text: `${v}, ${names[i]}` }, { he: set.m[i] }, { he: set.f[i] }], say: set.m[i] })) });
    return [{ ...two('Counting Numbers', n.cardinal, n.english), note: n.rule }, two('First, Second, Third', n.ordinal, n.ordinalEnglish),
      { title: 'Telling The Time', note: n.time.note, head: ['English', 'Hebrew'], rows: n.values.map((v, i) => ({ cells: [{ text: fill(n.time.tplEn, { n: n.english[i] }) }, { he: fill(n.time.tplHe, { f: n.cardinal.f[i] }) }], say: fill(n.time.tplHe, { f: n.cardinal.f[i] }) })) },
      { title: 'Prices', note: n.money.note, head: ['English', 'Hebrew'], rows: n.values.filter((v) => v >= n.money.from).map((v) => ({ cells: [{ text: fill(n.money.tplEn, { n: n.english[v - 1] }) }, { he: fill(n.money.tplHe, { m: n.cardinal.m[v - 1] }) }], say: fill(n.money.tplHe, { m: n.cardinal.m[v - 1] }) })) }];
  }
  if (tab === 'questions') return [{ title: 'The Question Words', head: ['English', 'Hebrew'], rows: d.questions.words.map((w) => ({ cells: [{ text: w.en }, { he: w.he }], say: w.he })) },
    { title: 'A Question And Its Answer', head: ['Question', 'Answer'], rows: d.questions.pairs.map((p) => ({ cells: [{ he: p.q, text: p.qEn }, { he: p.a, text: p.aEn }], say: p.q })) }];
  if (tab === 'existence') {
    const t = d.existence.things;
    return [{ title: 'There Is, There Is Not', note: d.existence.rule, head: ['English', 'Hebrew'], rows: t.flatMap((x) => [true, false].map((yes) => { const s = have(d, yes, '', x); return { cells: [{ text: s.en }, { he: s.he }], say: s.he }; })) },
      { title: 'I Have, I Do Not Have', head: ['English', 'Hebrew'], rows: PERSON_ORDER.flatMap((p, i) => [true, false].map((yes) => { const s = have(d, yes, p, t[i % t.length]); return { cells: [{ text: s.en }, { he: s.he }], say: s.he }; })) }];
  }
  if (tab === 'agreement') {
    const a = d.agreement;
    return [{ title: 'Four Forms Of A Describing Word', note: a.rule, head: ['English', 'One, masculine', 'One, feminine', 'Many, masculine', 'Many, feminine'], rows: a.adjectives.map((x) => ({ cells: [{ text: x.en }, { he: x.ms }, { he: x.fs }, { he: x.mp }, { he: x.fp }], say: x.ms })) },
      { title: 'Nouns With Their Describing Word', head: ['Noun', 'One', 'Many'], rows: a.nouns.map((n, i) => { const adj = a.adjectives[i % a.adjectives.length]; return { cells: [{ text: `${n.en} (${n.gender === 'f' ? 'feminine' : 'masculine'}), ${adj.en}` }, { he: describe(d, n, adj, false).he }, { he: describe(d, n, adj, true).he }], say: describe(d, n, adj, false).he }; }) }];
  }
  if (tab === 'comparing') {
    const c = d.comparing; const nouns = c.nouns.map((en) => d.agreement.nouns.find((n) => n.en === en)); const adjs = c.adjectives.map((en) => d.agreement.adjectives.find((x) => x.en === en));
    return c.patterns.map((p, k) => ({ title: p.id === 'more' ? 'More Than' : p.id === 'most' ? 'The Most' : 'As ... As', note: k === 0 ? c.rule : '', head: ['English', 'Hebrew'],
      rows: nouns.map((a, i) => { const s = compare(d, p.id, a, nouns[(i + 1) % nouns.length], adjs[i % adjs.length]); return { cells: [{ text: s.en }, { he: s.he }], say: s.he }; }) }));
  }
  if (tab === 'construct') {
    const c = d.construct;
    return Object.entries(c.rules).map(([id, text], k) => ({ title: text, note: k === 0 ? c.rule : '', head: ['First noun alone', 'The pair', 'English'], rows: c.pairs.filter((p) => p.rule === id).map((p) => ({ cells: [{ he: p.free }, { he: p.pair }, { text: `${p.en} (${p.lit})` }], say: p.pair })) }));
  }
  return [];
}

// ---- drills: {prompt, show?:Hebrew, options:[{he?, text?}], answer:index}
const item = (r, prompt, right, wrong, show) => { const opts = shuffle(r, [right, ...wrong.filter((w) => (w.he || w.text) !== (right.he || right.text)).slice(0, 3)]); return { prompt, show: show || '', options: opts, answer: opts.indexOf(right) }; };
const others = (r, list, not, n = 3) => shuffle(r, [...new Set(list)].filter((x) => x !== not)).slice(0, n);

/** A set of questions for one tab. The same seed gives the same set. @returns {{prompt:string, show:string, options:{he?:string,text?:string}[], answer:number}[]} */
export function drill(d, tab, seed = 1, count = 8) {
  const r = rng(seed * 7919 + tab.length);
  const out = [];
  for (let i = 0; i < count * 4 && out.length < count; i++) {
    const p = pick(r, PERSON_ORDER);
    if (tab === 'pronouns') { const k = pick(r, Object.values(d.pronouns)); out.push(item(r, `${k.title}: which word is "${d.persons[p]}"?`, { he: k.forms[p] }, others(r, Object.values(k.forms), k.forms[p]).map((he) => ({ he })))); }
    else if (tab === 'prepositions') { const k = pick(r, d.prepositions); out.push(item(r, `${k.en}: which form is for "${d.persons[p]}"?`, { he: k.forms[p] }, others(r, Object.values(k.forms), k.forms[p]).map((he) => ({ he })), k.base)); }
    else if (tab === 'numbers') { const n = d.numbers; const v = Math.floor(r() * 8) + 2; const g = r() < 0.5 ? 'm' : 'f'; const right = n.cardinal[g][v];
      out.push(item(r, `"${n.english[v]}" with a ${g === 'm' ? 'masculine' : 'feminine'} noun`, { he: right }, [n.cardinal[g === 'm' ? 'f' : 'm'][v], n.cardinal[g][(v + 1) % 10], n.cardinal[g][(v + 9) % 10]].map((he) => ({ he })))); }
    else if (tab === 'questions') { const q = pick(r, d.questions.pairs); const ask = r() < 0.5;
      out.push(ask ? item(r, 'Which question gets this answer?', { he: q.q }, others(r, d.questions.pairs.map((x) => x.q), q.q).map((he) => ({ he })), q.a)
        : item(r, 'Which answer fits this question?', { he: q.a }, others(r, d.questions.pairs.map((x) => x.a), q.a).map((he) => ({ he })), q.q)); }
    else if (tab === 'existence') { const t = pick(r, d.existence.things); const yes = r() < 0.5; const s = have(d, yes, p, t);
      out.push(item(r, `How do you say "${s.en}"?`, { he: s.he }, [have(d, !yes, p, t), have(d, yes, pick(r, PERSON_ORDER.filter((x) => x !== p)), t), have(d, yes, '', t)].map((x) => ({ he: x.he })))); }
    else if (tab === 'agreement') { const a = d.agreement; const n = pick(r, a.nouns); const adj = pick(r, a.adjectives); const plural = r() < 0.5; const right = adjFor(adj, n, plural);
      out.push(item(r, `"${adj.en}" for this noun (${n.en}${plural ? ', more than one' : ''})`, { he: right }, others(r, [adj.ms, adj.fs, adj.mp, adj.fp], right).map((he) => ({ he })), plural ? n.p : n.s)); }
    else if (tab === 'comparing') { const c = d.comparing; const nouns = c.nouns.map((en) => d.agreement.nouns.find((x) => x.en === en)); const a = pick(r, nouns); const b = pick(r, nouns.filter((x) => x !== a)); const want = pick(r, c.adjectives); const adj = d.agreement.adjectives.find((x) => x.en === want); const pat = pick(r, c.patterns);
      const s = compare(d, pat.id, a, b, adj);
      out.push(item(r, `How do you say "${s.en}"?`, { he: s.he }, c.patterns.filter((x) => x !== pat).map((x) => ({ he: compare(d, x.id, a, b, adj).he })))); }
    else if (tab === 'construct') { const c = d.construct; const pr = pick(r, c.pairs);
      out.push(item(r, `${pr.en}: what happened to the first noun?`, { text: c.rules[pr.rule] }, Object.entries(c.rules).filter(([id]) => id !== pr.rule).map(([, text]) => ({ text })), `${pr.free}  →  ${pr.pair}`)); }
    else break;
    const last = out[out.length - 1];
    if (last.options.length < 2 || out.slice(0, -1).some((x) => x.prompt === last.prompt && x.show === last.show)) out.pop();
  }
  return out;
}

/** Every Hebrew word and phrase the tables show, for the checks. */
export function allHebrew(d) {
  return TABS.flatMap(([tab]) => tablesFor(d, tab).flatMap((t) => t.rows.flatMap((row) => row.cells.map((c) => c.he).filter(Boolean))));
}
