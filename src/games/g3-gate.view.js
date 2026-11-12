// Pattern Gate: you guard the gate for one verb pattern. Verbs walk up one at a time; let in the ones in your pattern and
// wave the others on. A quick go / no-go game: the eye learns the marks each pattern leaves (hit-, ni-, the mem of the present).
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, formOf, binyanOf, gloss } from './g3-core.js';
import { begin, grade, roundKeys, binRow, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-gate.v1';
const ITEMS = 16;
const spec = {
  id: 'g3-gate', title: 'Pattern Gate', titleHe: 'דֶּלֶת',
  blurb: 'Each verb pattern leaves a mark. Hitpa\'el verbs start with hit-; Nif\'al verbs start with ni-; in the present, Hif\'il starts with ma- or me- and Pi\'el with me-. You keep the gate for one pattern: let in its verbs, wave the others on, and do it before the next visitor arrives.',
  howTo: ['The pattern on your gate is shown above the visitor. Press "Let in" (key 1 or Enter) or "Wave on" (key 2).', 'Waiting too long counts as waving it on.', 'Level 5 changes the pattern on the gate every few visitors: read the sign.'],
  levels: [
    { name: 'The hit- gate', targets: ["hitpa'el"], form: 'past', patience: 6 },
    { name: 'The ni- gate', targets: ["nif'al"], form: 'past', patience: 5.5 },
    { name: 'Hif\'il in the present', targets: ["hif'il"], form: 'present', patience: 5 },
    { name: 'Pi\'el in the present', targets: ["pi'el"], form: 'present', patience: 4.5 },
    { name: 'The sign keeps changing', targets: ["hitpa'el", "nif'al", "hif'il"], form: 'past', patience: 4, every: 4 },
  ],
  par: () => ITEMS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};
/** A gate queue: about 40% of the visitors are in the target pattern at each step. */
export function gateQueue(verbs, targetAt, n, form, rnd = Math.random) {
  const out = [], used = new Set();
  for (let i = 0; i < n; i++) {
    const target = targetAt(i), want = rnd() < 0.4;
    const pool = shuffle(verbs.filter((v) => (v.binyan === target) === want && !used.has(v.id) && formOf(v, form)), rnd);
    if (!pool.length) continue;
    used.add(pool[0].id); out.push({ verb: pool[0], he: formOf(pool[0], form), target, isIn: want });
  }
  return out;
}

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'Only my pattern gets in.',
    'Verbs and pattern labels from the app\'s verb list (from its dictionary source; not checked by a teacher).');
  const cfg = A.cfg, rnd = A.rnd;
  let queue = [], at = 0, waited = 0;
  const sign = A.h('p', { class: 'g3-tag', role: 'status' });
  const row = binRow(A, [{ key: 'in', label: 'Let in', sub: 'it is in my pattern' }, { key: 'on', label: 'Wave on', sub: 'another pattern' }], (k) => judge(k === 'in'), { label: 'Gate' });
  area.replaceChildren(sign, row);
  const draw = () => {
    const it = queue[at];
    if (!it) return;
    const b = binyanOf(it.target);
    sign.textContent = `Gate: ${b.name} (${b.sign}).`;
    big.replaceChildren(heText(A, it.he));
    prompt.textContent = `Visitor ${at + 1} of ${queue.length}.`;
    waited = 0;
  };
  const judge = (letIn) => {
    const it = queue[at];
    if (!it || !T.live()) return;
    const own = binyanOf(it.verb.binyan)?.name || it.verb.binyan;
    const ok = letIn === it.isIn;
    grade(A, ok, { right: `${it.he} (${gloss(it.verb.en)}) is ${own}.`, wrong: `${it.he} is ${own}: ${it.isIn ? 'it belonged inside' : 'it should have walked on'}.` });
    at += 1;
    if (at >= queue.length) T.end({ won: true }); else draw();
  };
  roundKeys(A, (k) => { if (k === '1' || k === 'enter') { judge(true); return true; } if (k === '2') { judge(false); return true; } return false; });
  A.loop(() => { if (!T.live() || !queue[at]) return; waited += 0.1; if (waited >= cfg.patience) judge(false); }, 100);
  loadG3(A.ctx, 'verbs').then((d) => {
    if (!T.live()) return;
    const verbs = d.verbs.filter((v) => v.level !== 'B1');
    const targetAt = (i) => cfg.targets[cfg.every ? Math.floor(i / cfg.every) % cfg.targets.length : 0];
    queue = gateQueue(verbs, targetAt, ITEMS, cfg.form, rnd);
    draw();
  }).catch(() => A.announce('The verbs did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
