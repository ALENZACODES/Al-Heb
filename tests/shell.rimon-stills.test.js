import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SITUATIONS, QUIET, situationForAction, situationForHash,
  isShabbatQuiet, stillUrl, pickStill, planMoment, mountRimonStills,
} from '../src/shell/rimon-stills.js';
import { RIMON_STILLS_AVAILABLE, RIMON_STILLS_V2 } from '../src/shell/rimon-stills-index.js';
import { FLIPS } from '../src/shell/rimon-flips.js';

const HAVE = RIMON_STILLS_AVAILABLE;

test('every mapped still id is a three-digit (optional letter) slug', () => {
  for (const [sit, ids] of Object.entries(SITUATIONS)) {
    assert.ok(ids.length, sit);
    for (const id of ids) assert.match(id, /^\d{3}[a-z]?$/, `${sit}:${id}`);
  }
});

test('the generated index matches files on disk and skips missing stills', () => {
  const dir = new URL('../data/images/rimon/', import.meta.url);
  const v2dir = new URL('../data/images/rimon/v2/', import.meta.url);
  const v1 = fs.readdirSync(dir).filter((f) => /^rimon-\d{3}[a-z]?\.webp$/.test(f)).map((f) => f.slice(6, -5));
  const v2 = fs.existsSync(v2dir)
    ? fs.readdirSync(v2dir).map((f) => /^rimon-(\d{3}[a-z]?)-([a-z0-9-]+)\.webp$/.exec(f)).filter(Boolean)
    : [];
  const fromDisk = [...new Set([...v1, ...v2.map((m) => m[1])])].sort();
  assert.deepEqual([...HAVE].sort(), fromDisk);
  const v2Map = {};
  for (const m of v2) if (!v2Map[m[1]]) v2Map[m[1]] = m[2];
  assert.deepEqual({ ...RIMON_STILLS_V2 }, v2Map);
  assert.ok(HAVE.size >= 50);
  // Never return an id that is not on disk (no 404s). Later catalogue ids are skipped
  // until those files exist; fallbacks that are on disk may still be chosen.
  const picked = pickStill('storybooks', { available: HAVE });
  if (picked) assert.ok(HAVE.has(picked), picked);
  const none = pickStill('storybooks', { available: new Set() });
  assert.equal(none, null);
});

test('situationForAction maps companion events and known situation names', () => {
  assert.equal(situationForAction('correct'), 'correct');
  assert.equal(situationForAction('highfive'), 'bigCorrect');
  assert.equal(situationForAction('sad'), 'wrong');
  assert.equal(situationForAction('nervous'), 'hint');
  assert.equal(situationForAction('lesson'), 'lessonComplete');
  assert.equal(situationForAction('stretch'), 'award');
  assert.equal(situationForAction('blink'), null);
  assert.equal(situationForAction('unknown'), null);
  assert.equal(situationForAction('home'), 'home');
  assert.equal(situationForAction(), null);
});

test('situationForHash covers home, onboarding, lessons, lab, books, awards', () => {
  assert.equal(situationForHash(''), 'home');
  assert.equal(situationForHash('#/'), 'home');
  assert.equal(situationForHash('#/welcome'), 'onboarding');
  assert.equal(situationForHash('#/learn/alef'), 'lessonStart');
  assert.equal(situationForHash('#/games/memory'), 'brainLab');
  assert.equal(situationForHash('#/books'), 'storybooks');
  assert.equal(situationForHash('#/story/one'), 'storyReader');
  assert.equal(situationForHash('#/awards'), 'award');
  assert.equal(situationForHash('#/settings'), null);
});

test('Shabbat-quiet window is Friday 18:00 through Saturday 21:00 local', () => {
  // Local dates, no UTC conversion: the function reads getDay/getHours of the given Date.
  const fri17 = new Date(2026, 10, 13, 17, 59); // Fri
  const fri18 = new Date(2026, 10, 13, 18, 0);
  const sat20 = new Date(2026, 10, 14, 20, 59);
  const sat21 = new Date(2026, 10, 14, 21, 0);
  const sun = new Date(2026, 10, 15, 10, 0);
  assert.equal(fri17.getDay(), 5);
  assert.equal(isShabbatQuiet(fri17), false);
  assert.equal(isShabbatQuiet(fri18), true);
  assert.equal(isShabbatQuiet(sat20), true);
  assert.equal(isShabbatQuiet(sat21), false);
  assert.equal(isShabbatQuiet(sun), false);
});

test('pickStill is deterministic with an injected random and can avoid the last id', () => {
  const available = new Set(['023', '024', '026']);
  assert.equal(pickStill('correct', { available, random: () => 0 }), '023');
  assert.equal(pickStill('correct', { available, random: () => 0.99 }), '026');
  assert.equal(pickStill('correct', { available, random: () => 0, avoid: '023' }), '024');
  assert.equal(pickStill('nope', { available }), null);
  assert.equal(pickStill('correct', { available: new Set() }), null);
});

test('planMoment uses burst for cheers, bounce for misses, and none when motion is reduced or quiet', () => {
  const available = new Set(['023', '041', '116', '057']);
  const midweek = new Date(2026, 10, 10, 12); // Tue
  const cheer = planMoment('correct', { now: midweek, available, random: () => 0 });
  assert.equal(cheer.id, '023');
  assert.equal(cheer.animate, true);
  assert.equal(cheer.entrance, 'burst');
  const miss = planMoment('wrong', { now: midweek, available, random: () => 0 });
  assert.equal(miss.entrance, 'bounce');
  const still = planMoment('correct', { now: midweek, available, reduceMotion: true, random: () => 0 });
  assert.equal(still.animate, false);
  const rest = planMoment('shabbat', { now: midweek, available, random: () => 0 });
  assert.equal(rest.animate, false);
  assert.equal(rest.entrance, 'none');
  const shabbat = planMoment('correct', { now: new Date(2026, 10, 13, 19), available, random: () => 0 });
  assert.equal(shabbat.situation, 'shabbat');
  assert.equal(shabbat.animate, false);
  assert.equal(planMoment('storybooks', { now: midweek, available }), null);
  assert.equal(stillUrl('025b'), 'data/images/rimon/rimon-025b.webp');
  // v2, when present, is preferred; a missing v2 id falls back to the numbered file.
  if (RIMON_STILLS_V2['001']) {
    assert.equal(stillUrl('001'), `data/images/rimon/v2/rimon-001-${RIMON_STILLS_V2['001']}.webp`);
  } else {
    assert.equal(stillUrl('001'), 'data/images/rimon/rimon-001.webp');
  }
  assert.equal(stillUrl('025b', 'data/images/rimon/', {}), 'data/images/rimon/rimon-025b.webp');

});

function fakeDoc({ reduceMotion = false, hash = '#/' } = {}) {
  const listeners = new Map();
  const body = { children: [], append(el) { this.children.push(el); el.parentNode = this; }, contains(el) { return this.children.includes(el); }, removeChild(el) { this.children = this.children.filter((c) => c !== el); } };
  const win = {
    matchMedia: (q) => ({ matches: /prefers-reduced-motion:\s*reduce/.test(q) && reduceMotion }),
    location: { hash },
    addEventListener(type, fn) { (listeners.get('win:' + type) || (listeners.set('win:' + type, []), listeners.get('win:' + type))).push(fn); },
    removeEventListener(type, fn) { const a = listeners.get('win:' + type) || []; listeners.set('win:' + type, a.filter((f) => f !== fn)); },
  };
  const doc = {
    body,
    defaultView: win,
    createElement(tag) {
      const el = {
        tagName: tag, className: '', hidden: false, dataset: {}, style: {},
        attributes: {}, children: [],
        setAttribute(k, v) { this.attributes[k] = v; },
        removeAttribute(k) { delete this.attributes[k]; this[k] === undefined || (k === 'src' && (this.src = undefined)); },
        append(child) { this.children.push(child); child.parentNode = this; },
        remove() { this.parentNode?.removeChild?.(this); },
        addEventListener(type, fn) { (listeners.get(tag + ':' + type) || (listeners.set(tag + ':' + type, []), listeners.get(tag + ':' + type))).push(fn); },
        get offsetWidth() { return 1; },
        classList: {
          _c: new Set(),
          add(...xs) { xs.forEach((x) => { this._c.add(x); el.className = [...this._c].join(' '); }); },
          remove(...xs) { xs.forEach((x) => this._c.delete(x)); el.className = [...this._c].join(' '); },
          contains(x) { return this._c.has(x); },
        },
      };
      return el;
    },
    addEventListener(type, fn) { (listeners.get('doc:' + type) || (listeners.set('doc:' + type, []), listeners.get('doc:' + type))).push(fn); },
    removeEventListener(type, fn) { const a = listeners.get('doc:' + type) || []; listeners.set('doc:' + type, a.filter((f) => f !== fn)); },
    dispatch(type, detail) { for (const fn of listeners.get('doc:' + type) || []) fn({ detail }); },
    _listeners: listeners,
  };
  return { doc, win, body, listeners };
}

test('mount shows a still on alef:rimon and hides it when the image errors', () => {
  const { doc } = fakeDoc();
  const m = mountRimonStills({ doc, holdMs: 50, base: 'data/images/rimon/' });
  assert.equal(doc.body.children.length, 1);
  const fig = m.element;
  const img = fig.children[0];
  assert.equal(fig.hidden, true);
  doc.dispatch('alef:rimon', { action: 'correct' });
  assert.equal(fig.hidden, false);
  assert.ok(fig.dataset.still);
  assert.match(img.src, /rimon-\d{3}[a-z]?\.webp$/);
  assert.ok(fig.classList.contains('is-burst'));
  // Fail-safe: a missing file removes the moment instead of leaving a broken image.
  const err = doc._listeners.get('img:error') || [];
  assert.ok(err.length);
  err[0]();
  assert.equal(fig.hidden, true);
  assert.equal(img.src, undefined);
  m.destroy();
  assert.equal(doc.body.children.includes(fig), false);
});

test('reduced motion and Shabbat skip the entrance animation; a missing situation is a no-op', () => {
  const { doc } = fakeDoc({ reduceMotion: true });
  const m = mountRimonStills({ doc, holdMs: 50 });
  const ok = m.show('correct');
  if (ok) {
    assert.equal(m.element.hidden, false);
    assert.equal(m.element.classList.contains('is-burst'), false);
    assert.equal(m.element.classList.contains('is-bounce'), false);
  }
  // Fallbacks (033, 011) let storybooks appear before later stills exist.
  assert.equal(m.show('storybooks'), true);
  assert.equal(m.element.classList.contains('is-burst'), false);
  m.destroy();
});

test('the stills module and its index never touch storage', () => {
  const src = fs.readFileSync(new URL('../src/shell/rimon-stills.js', import.meta.url), 'utf8')
    + fs.readFileSync(new URL('../src/shell/rimon-stills-index.js', import.meta.url), 'utf8')
    + fs.readFileSync(new URL('../src/shell/rimon-flips.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\bstorage\b|\blocalStorage\b|\bsessionStorage\b|\bstores?\.(get|set|save)/);
});

test('flip-books are eight-frame on-demand sheets and stay off during reduced motion or Shabbat', () => {
  const midweek = new Date(2026, 10, 10, 12);
  const available = HAVE;
  const dance = planMoment('correct', { now: midweek, available, random: () => 0 });
  assert.equal(dance.flip, 'celebrate');
  assert.equal(dance.entrance, 'burst');
  const home = planMoment('home', { now: midweek, available, random: () => 0 });
  assert.equal(home.flip, 'burst');
  assert.equal(home.entrance, 'crash');
  const miss = planMoment('wrong', { now: midweek, available, random: () => 0 });
  assert.equal(miss.flip, 'slump');
  const still = planMoment('correct', { now: midweek, available, reduceMotion: true, random: () => 0 });
  assert.equal(still.flip, null);
  assert.equal(still.animate, false);
  const shabbat = planMoment('correct', { now: new Date(2026, 10, 13, 19), available, random: () => 0 });
  assert.equal(shabbat.situation, 'shabbat');
  assert.equal(shabbat.flip, null);
  // Sheets exist on disk and every frame id is a real still.
  for (const [name, spec] of Object.entries(FLIPS)) {
    const file = new URL('../data/images/rimon/' + spec.file, import.meta.url);
    assert.ok(fs.existsSync(file), name);
    assert.equal(spec.frames.length, 8, name);
    for (const id of spec.frames) assert.ok(HAVE.has(id), `${name}:${id}`);
  }
});

test('idle and offline can appear using fallback stills before later catalogue files exist', () => {
  const midweek = new Date(2026, 10, 10, 12);
  const idle = planMoment('idle', { now: midweek, available: HAVE, reduceMotion: true, random: () => 0 });
  assert.ok(idle && HAVE.has(idle.id));
  assert.equal(idle.animate, false);
  const off = planMoment('offline', { now: midweek, available: HAVE, random: () => 0 });
  assert.ok(off && HAVE.has(off.id));
  assert.equal(off.flip, 'peek');
});
