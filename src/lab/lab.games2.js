// Brain Lab games added 2026-11-10. Same contract as lab.games.js: load(env) fetches the game's data once, and trial(env, level)
// draws one round on env.board and resolves {ok, ms, par}. The runner in lab.view.js owns the clock, the level and the score.
// Each game teaches one thing a beginner needs in synagogue or in Israel; the round logic lives in lab.core.js (pure, tested).
// All Hebrew comes from the app's data: data/lab/words.json (built by tools/lab/build-lab-words.mjs from the dictionary and the
// sound tables), the letter table and the prayer registry. env.met(item) adds a word to the "Hebrew you met" list on the
// results card; env.rimon(action) lets Rimon react (optional, never needed to play).
import { randInt, twinsNext, twinsBack, rainPool, rainKeys, rainFallMs, middleTrial, taxiTrial, cafeOrder, chainTrial, lineWords, NOT_A_GAME } from './lab.core.js';
import { kit } from './lab.games.js';
import { transliterate } from '../pronunciation/transliterate.js';

const { getJSON, once, grid, big, mark, loadLetters } = kit;
const loadWords = (env) => once('labwords', () => getJSON(env, 'data/lab/words.json'));
const btn = (env, label, onclick, cls = 'btn') => env.h('button', { type: 'button', class: cls, onclick }, label);
/** Resolve a round once, whatever fires first (an answer or the clock). */
function once1(resolve) { let done = false; return (r) => { if (!done) { done = true; resolve(r); } }; }
const signName = (W, id) => W.signs?.find((x) => x.id === id)?.name || id;
/** A vowel sign shown on Vet, the way the vowel tables in the app show it (shuruk: Vet + vav with its dot). */
const signShape = (W, id) => { const m = W.signs?.find((x) => x.id === id)?.mark || ''; return 'ב' + m; };

// ---------------------------------------------------------------- Sound Twins (speed: letters that sound alike)
const twins = {
  load: loadWords,
  trial(env, level) {
    const W = env.data, m = env.memo, trad = env.tradition;
    m.hist = m.hist || [];
    const back = twinsBack(level);
    return new Promise((resolve) => {
      const finish = once1(resolve);
      const card = env.h('div', { class: 'lab-twin', 'aria-live': 'polite' });
      env.playArt?.(card); // the drawn card face
      const before = env.h('div', { class: 'lab-twin-before', 'aria-hidden': 'true' });
      const row = env.h('div', { class: 'lab-row' });
      env.board.replaceChildren(env.h('div', { class: 'lab-twin-stage' }, before, card), row);
      const nm = (c) => c.names?.[trad] || c.name; // Tav without its dot is Sav in Ashkenazi
      const paint = (c) => { card.replaceChildren(big(env, c.he, 'lab-glyph lab-huge')); card.setAttribute('aria-label', nm(c)); card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); };
      const warm = () => { // the first card(s) of a game, or after the game starts comparing two back: just look and remember
        const { card: c } = twinsNext(m.hist, W.cards, level, trad, env.rnd);
        m.hist.push(c); paint(c); before.replaceChildren();
        env.prompt(env.h('span', {}, 'Remember this sound…'));
        if (m.hist.length < back) env.later(warm, 1100); else env.later(ask, 1100);
      };
      const ask = () => {
        const ref = m.hist[m.hist.length - back];
        const { card: c, same } = twinsNext(m.hist, W.cards, level, trad, env.rnd);
        m.hist.push(c); if (m.hist.length > 4) m.hist.shift();
        paint(c);
        // Levels 1 and 2 keep the card to compare with in view, faded, so the twins can be learnt before they are tested.
        before.replaceChildren(level <= 2 ? big(env, ref.he, 'lab-glyph') : '');
        env.prompt(env.h('span', {}, back === 1 ? 'Same sound as the card before?' : 'Same sound as the card two before?'));
        const t0 = env.now();
        const pick = (yes, b) => {
          const ok = yes === same; mark(b, ok);
          if (!ok || level <= 2) env.say(`${c.he} ${nm(c)} and ${ref.he} ${nm(ref)}: ${same ? 'the same sound' : 'different sounds'}.`);
          env.met(same && c.id !== ref.id ? { he: `${ref.he} ${c.he}`, en: `${nm(ref)} and ${nm(c)} sound the same` } : { he: c.he, en: nm(c) });
          finish({ ok, ms: env.now() - t0, par: 1100 });
        };
        const no = btn(env, '✗ Different', () => pick(false, no), 'btn secondary lab-yn');
        const yes = btn(env, '✓ Same', () => pick(true, yes), 'btn lab-yn');
        row.replaceChildren(no, yes);
        env.keys((k) => { if (k === 'ArrowLeft') pick(false, no); else if (k === 'ArrowRight') pick(true, yes); });
        const limit = Math.max(1100, 3400 - level * 190);
        env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
      };
      if (m.hist.length < back) warm(); else ask();
    });
  },
};

// ---------------------------------------------------------------- Vowel Rain (speed: reading the vowel signs)
const rain = {
  load: loadWords,
  trial(env, level) {
    const W = env.data, trad = env.tradition;
    const pool = rainPool(W.vowels, level, trad);
    const keys = rainKeys(W.vowels.filter((v) => v.from <= level), trad);
    const drop = pool[randInt(env.rnd, pool.length)];
    const fall = rainFallMs(level);
    // Levels 1 to 3: each button shows the signs that make its sound, written on Vet (בַ בָ for a).
    const hintFor = (k) => [...new Set(pool.filter((v) => v.sound[trad] === k).map((v) => v.sign))].map((sid) => signShape(W, sid));
    return new Promise((resolve) => {
      const finish = once1(resolve);
      const t0 = env.now();
      const d = env.h('div', { class: 'lab-drop', role: 'img', 'aria-label': `Syllable ${drop.he}` }, big(env, drop.he, 'lab-glyph'));
      env.backdrop?.(d, 'LAB_v2_rain_drop', 200);
      const sky = env.h('div', { class: 'lab-sky' }, d, env.h('div', { class: 'lab-ground', 'aria-hidden': 'true' }));
      env.playArt?.(sky); // the drawn sky
      const row = env.h('div', { class: 'lab-row lab-vowels' });
      env.prompt(env.h('span', {}, 'Tap the vowel sound before it lands.'));
      env.board.replaceChildren(sky, row);
      const pick = (k, b) => {
        const want = drop.sound[trad];
        const ok = k === want; mark(b, ok);
        d.classList.add(ok ? 'is-caught' : 'is-missed');
        if (ok && drop.syllable && env.hasClip('syllable', drop.syllable)) env.playClip('syllable', drop.syllable, drop.he);
        if (!ok || level <= 2) env.say(`${drop.he}: ${signName(W, drop.sign)} says "${want}".`);
        env.met({ he: drop.he, en: `${signName(W, drop.sign)}, "${want}"` });
        finish({ ok, ms: env.now() - t0, par: Math.round(fall * 0.45) });
      };
      for (const k of keys) {
        const b = env.h('button', { type: 'button', class: 'btn lab-vowel', 'aria-label': `Vowel ${k}`, onclick: () => pick(k, b) },
          env.h('b', {}, k), level <= 3 ? env.h('span', { class: 'lab-vowel-hint he', lang: 'he', 'aria-hidden': 'true' }, hintFor(k).join(' ')) : null);
        row.append(b);
      }
      env.keys((key) => { const k = String(key).toLowerCase(); const i = keys.indexOf(k); if (i >= 0) pick(k, row.children[i]); });
      if (!env.calm) {
        d.style.transition = 'none'; d.style.transform = 'translateY(0)';
        // fall to the ground line, however tall the sky is on this screen
        requestAnimationFrame(() => requestAnimationFrame(() => { const dist = Math.max(0, sky.clientHeight - d.offsetHeight - 20); d.style.transition = `transform ${fall}ms linear`; d.style.transform = `translateY(${dist}px)`; }));
      }
      env.timeLimit(fall, () => { d.classList.add('is-missed'); env.say(`${drop.he} says "${drop.sound[trad]}".`); finish({ ok: false, ms: fall }); });
    });
  },
};

// ---------------------------------------------------------------- Middle Letter (attention: look-alikes in a crowd)
const middle = {
  load: loadLetters,
  trial(env, level) {
    const t = middleTrial(env.data, level, env.rnd);
    const limit = Math.max(1800, 6000 - level * 350);
    return new Promise((resolve) => {
      const finish = once1(resolve);
      const t0 = env.now();
      const row = env.h('div', { class: 'lab-flank', dir: 'rtl', role: 'img', 'aria-label': `A row of ${t.row.length} letters; the middle one is ${t.target.name}` },
        ...t.row.map((l, i) => env.heSpan(l.he, `he lab-glyph lab-flank-l${i === t.mid ? ' is-mid' : ''}${i === t.mid && level <= 3 ? ' is-marked' : ''}`)));
      env.prompt(env.h('span', {}, 'Which letter is in the middle?'));
      const g = grid(env, t.options.length, t.options.length <= 2 ? 2 : t.options.length === 3 ? 3 : 2, (i, b) => {
        b.classList.add('lab-wide');
        b.append(env.h('span', { class: 'lab-text' }, t.options[i].name));
        if (level <= 2) b.append(env.heSpan(t.options[i].he, 'he lab-val'));
      }, (i, b) => {
        const ok = t.options[i].id === t.target.id; mark(b, ok);
        if (!ok) { g.cells[t.options.indexOf(t.target)].classList.add('is-reveal'); env.say(`The middle letter is ${t.target.he} ${t.target.name}${t.tricky ? `; the letters around it are ${t.row[0].name}` : ''}.`); }
        env.met({ he: t.target.he, en: t.target.name });
        finish({ ok, ms: env.now() - t0, par: 1500 });
      }, 'Letter names');
      env.board.replaceChildren(row, g.el);
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    });
  },
};

// ---------------------------------------------------------------- Taxi Turns (flexibility: right, left, straight on)
const ARROW = { left: '←', straight: '↑', right: '→' };
const LABEL = { left: 'Left', straight: 'Straight', right: 'Right' };
const taxi = {
  load: loadWords,
  trial(env, level) {
    const tr = taxiTrial(env.data.directions, level, env.rnd, env.memo);
    const limit = Math.max(1400, 4400 - level * 230);
    return new Promise((resolve) => {
      const finish = once1(resolve);
      const t0 = env.now();
      // The rule is said in words and drawn two ways (a round gold sign for the word, a square green one for the side),
      // so it never rests on colour alone.
      const rule = tr.rule === 'word'
        ? env.h('span', { class: 'lab-rule rule-word' }, env.h('b', {}, 'Word rule: '), 'go where the word says')
        : env.h('span', { class: 'lab-rule rule-side' }, env.h('b', {}, 'Side rule: '), 'go to the side the sign is on');
      env.prompt(rule);
      const sign = env.h('div', { class: `lab-sign sign-${tr.rule}` }, big(env, tr.word.he, 'lab-word'), level <= 2 ? env.h('span', { class: 'lab-val' }, tr.word.tr) : null);
      const road = env.h('div', { class: 'lab-road', 'data-side': tr.side, role: 'img', 'aria-label': `A sign on the ${tr.side === 'straight' ? 'middle' : tr.side} of the road says ${tr.word.tr}` },
        env.h('div', { class: 'lab-lane' }, tr.side === 'left' ? sign : null), env.h('div', { class: 'lab-lane' }, tr.side === 'straight' ? sign : null), env.h('div', { class: 'lab-lane' }, tr.side === 'right' ? sign : null),
        env.backdrop?.(env.h('div', { class: 'lab-cab', 'aria-hidden': 'true' }), 'LAB_v2_taxi_cab', 200) || env.h('div', { class: 'lab-cab', 'aria-hidden': 'true' }));
      env.playArt?.(road); // the drawn road
      const row = env.h('div', { class: 'lab-row lab-turns' });
      const pick = (k, b) => {
        const ok = k === tr.answer; mark(b, ok);
        road.classList.add(`go-${k}`);
        if (!ok) env.say(tr.rule === 'word' ? `${tr.word.he} (${tr.word.tr}) means ${tr.word.en}.` : `The sign was on the ${tr.side === 'straight' ? 'middle: straight on' : tr.side}.`);
        if (ok && tr.word.clip && env.hasClip(tr.word.clip.kind, tr.word.clip.id)) env.playClip(tr.word.clip.kind, tr.word.clip.id, tr.word.he);
        env.met({ he: tr.word.he, en: tr.word.en, clip: tr.word.clip });
        finish({ ok, ms: env.now() - t0, par: 1300 });
      };
      for (const k of tr.keys) { const b = env.h('button', { type: 'button', class: 'btn lab-turn', 'aria-label': LABEL[k], onclick: () => pick(k, b) }, env.h('span', { 'aria-hidden': 'true' }, ARROW[k]), ' ', LABEL[k]); row.append(b); }
      env.board.replaceChildren(road, row);
      env.keys((k) => { const want = k === 'ArrowLeft' ? 'left' : k === 'ArrowRight' ? 'right' : k === 'ArrowUp' ? 'straight' : null; const i = tr.keys.indexOf(want); if (i >= 0) pick(want, row.children[i]); });
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    });
  },
};

// ---------------------------------------------------------------- Café Order (memory: ordering food and drink)
const cafe = {
  load: loadWords,
  trial(env, level) {
    const { order, menu } = cafeOrder(env.data.cafe, level, env.rnd);
    const who = env.memo.who = env.memo.who === 'Noa' ? 'Ari' : 'Noa';
    const showMs = Math.max(1000, 2000 - level * 80);
    return new Promise((resolve) => {
      const finish = once1(resolve);
      const slots = env.h('ol', { class: 'lab-slots', 'aria-label': `${order.length} things ordered` }, ...order.map(() => env.h('li', {}, '·')));
      const ticket = env.h('div', { class: 'lab-ticket', 'aria-live': 'polite' });
      // Noa or Ari, speaking (their approved portraits), takes the order; text only if the picture is not available.
      const face = env.img?.('id', who === 'Noa' ? 'CHAR_noa_speak' : 'CHAR_ari_speak', 'lab-face', 160);
      env.board.replaceChildren(env.playArt?.(env.h('div', { class: 'lab-cafe' }, env.h('p', { class: 'lab-who' }, face, `${who} orders`), ticket, slots))
        || env.h('div', { class: 'lab-cafe' }, env.h('p', { class: 'lab-who' }, face, `${who} orders`), ticket, slots));
      env.prompt(env.h('span', {}, `${who} is ordering. Remember it, in order.`));
      env.rimon?.('thinking');
      let i = 0;
      const showNext = () => {
        if (i >= order.length) { ticket.replaceChildren(env.h('span', { class: 'lab-note' }, 'Order taken.')); env.later(serve, 500); return; }
        const it = order[i++];
        ticket.replaceChildren(big(env, it.he, 'lab-word lab-order-he'), level <= 4 ? env.h('span', { class: 'lab-val' }, it.tr) : null, level <= 2 ? env.h('span', { class: 'lab-text' }, it.en) : null);
        if (it.clip && env.hasClip(it.clip.kind, it.clip.id)) env.playClip(it.clip.kind, it.clip.id, it.he);
        env.met({ he: it.he, en: it.en, clip: it.clip });
        env.later(showNext, showMs);
      };
      const serve = () => {
        const t0 = env.now(); let k = 0;
        ticket.replaceChildren();
        env.prompt(env.h('span', {}, `Bring ${who}'s order, in the same order.`));
        const g = grid(env, menu.length, 3, (j, b) => { b.classList.add('lab-wide'); const pic = env.img?.('word', menu[j].id, 'lab-menu-pic', 160) || (menu[j].pic ? env.img?.('id', menu[j].pic, 'lab-menu-pic', 160) : null); if (pic) b.append(pic); b.append(env.h('span', { class: 'lab-text' }, menu[j].en)); }, (j, b) => {
          if (b.disabled) return;
          if (menu[j] === order[k]) {
            b.disabled = true; mark(b, true);
            slots.children[k].replaceChildren(env.heSpan(order[k].he, 'he'));
            k++; if (k === order.length) finish({ ok: true, ms: env.now() - t0, par: 1500 * order.length + 800 });
          } else {
            mark(b, false);
            order.forEach((o, n) => { slots.children[n].replaceChildren(env.heSpan(o.he, 'he'), ` ${o.en}`); });
            env.say(`The order was: ${order.map((o) => o.en).join(', then ')}.`);
            finish({ ok: false, ms: env.now() - t0 });
          }
        }, 'Menu');
        env.board.firstChild.after(g.el);
      };
      env.later(showNext, 350);
    });
  },
};

// ---------------------------------------------------------------- Prayer Chain (memory: the words of the blessings in order)
const chain = {
  load: (env) => once('chainlines', async () => {
    const reg = await getJSON(env, 'data/corpus/registry.json');
    return reg.entries.filter((e) => e.category === 'siddur' && e.he && !NOT_A_GAME.has(e.id)).map((e) => ({ id: e.id, title: e.title, en: e.english, words: lineWords(e.he) })).filter((e) => e.words.length >= 5);
  }),
  trial(env, level) {
    const t = chainTrial(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const finish = once1(resolve);
      const t0 = env.now();
      const title = String(t.line.title).replace(/\s*\(.*\)\s*$/, '');
      const said = env.h('p', { class: 'lab-chain he', dir: 'rtl', lang: 'he', 'aria-live': 'polite' }, ...t.given.map((w) => env.h('span', { class: 'lab-link is-given' }, w)));
      const opts = env.h('div', { class: 'lab-row lab-chain-opts' });
      env.prompt(env.h('span', {}, env.h('b', {}, title), level <= 3 && t.line.en && t.line.en.length < 140 ? env.h('span', { class: 'lab-val lab-chain-en' }, t.line.en) : null));
      env.board.replaceChildren(said, opts);
      let k = 0;
      const next = () => {
        while (k < t.steps.length && t.steps[k].fixed) { // the divine name: filled in, never a choice
          said.append(env.h('span', { class: 'lab-link is-name', title: 'The divine name, filled in for you' }, t.steps[k].word)); k++;
        }
        if (k >= t.steps.length) {
          env.met({ he: [...t.given, ...t.steps.map((s) => s.word)].join(' '), en: title });
          if (level <= 3 && env.hasClip('line', t.line.id) && t.line.words.length <= 14) env.playClip('line', t.line.id, '');
          finish({ ok: true, ms: env.now() - t0, par: 2000 * t.steps.length + 800 }); return;
        }
        const step = t.steps[k];
        said.append(env.h('span', { class: 'lab-link is-next', 'aria-hidden': 'true' }, '…'));
        opts.replaceChildren(...step.options.map((w) => {
          // Levels 1 to 3: each choice also shows how it is said, in the learner's tradition (barukh / borukh), so a
          // beginner who cannot read every vowel yet can still follow the congregation.
          const say = level <= 3 ? (() => { try { return transliterate(w, { tradition: env.tradition }); } catch { return ''; } })() : '';
          const b = env.h('button', { type: 'button', class: 'btn secondary lab-chain-opt', lang: 'he', dir: 'rtl', 'aria-label': say ? `${w}, ${say}` : null, onclick: () => {
            said.lastChild.remove();
            if (w === step.word) { mark(b, true); said.append(env.h('span', { class: 'lab-link is-right' }, w)); k++; next(); }
            else {
              mark(b, false);
              for (const s of t.steps.slice(k)) said.append(env.h('span', { class: 'lab-link is-reveal' }, s.word));
              env.say(`The next word was ${step.word}.`);
              env.met({ he: [...t.given, ...t.steps.map((s) => s.word)].join(' '), en: title });
              finish({ ok: false, ms: env.now() - t0 });
            }
          } }, env.heSpan(w, 'he lab-word'), say ? env.h('span', { class: 'lab-val', lang: 'en', dir: 'ltr' }, say) : null);
          return b;
        }));
      };
      next();
    });
  },
};

export const NEW_DRILLS = Object.freeze({ twins, rain, middle, taxi, cafe, chain });
export const _test2 = { signName, signShape };
