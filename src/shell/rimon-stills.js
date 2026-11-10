// Rimon "big moment" stills: a bold burst-in still for each situation, on top of the
// existing companion. Decoration only: a missing image, an unknown event, or any
// error shows nothing and never touches scoring, progress, or navigation.
import { RIMON_STILLS_AVAILABLE, RIMON_STILLS_V2 } from './rimon-stills-index.js';
import { FLIPS, SITUATION_FLIP, flipUrl, flipForSituation } from './rimon-flips.js';
export { FLIPS, SITUATION_FLIP, flipUrl, flipForSituation };

// Preferred stills per situation (see docs/images/rimon-placements.md). A `b` id is a
// bolder reroll of the same pose and is tried first; ids that are not in the
// available list are skipped.
export const SITUATIONS = Object.freeze({
  home: ['057', '056', '002', '006'],
  onboarding: ['003b', '002', '001', '006', '004'],
  welcomeBack: ['020', '001'],
  lessonStart: ['017', '018', '046', '055'],
  correct: ['023', '024', '026', '027', '030', '031', '035', '039', '022', '013'],
  bigCorrect: ['025b', '025', '027', '030', '040'],
  wrong: ['041', '042', '043', '048', '044', '045'],
  hint: ['047', '052', '053', '046'],
  streak: ['058', '057', '059', '061', '069', '056'],
  streakRisk: ['062', '063', '195', '043', '041'],
  rest: ['064', '196', '116', '050', '015'],
  lessonComplete: ['071', '073', '074', '075', '083', '084', '027', '026', '030', '035'],
  unitComplete: ['081', '082', '180', '027', '058'],
  idle: ['086', '089', '100', '098', '015', '050', '001'],
  loading: ['043', '148', '018'],
  empty: ['114', '103', '049'],
  error: ['101', '108', '047'],
  recovered: ['112', '027'],
  offline: ['105', '106', '107', '049', '043', '033'],
  shabbat: ['116', '117', '064', '050', '015', '037'],
  holiday: ['144', '145', '050', '037'],
  brainLab: ['146', '147', '160', '017', '018', '027'],
  brainLabWin: ['151', '158', '149', '027'],
  brainLabMiss: ['152', '159', '049'],
  storybooks: ['161', '170', '173', '033', '011'],
  storyReader: ['162', '163', '164', '169', '015', '033'],
  award: ['176', '178', '180', '184', '187', '029'],
  reminder: ['191', '192', '194', '197', '199', '033', '020', '011'],
});

// Quiet situations never animate in and never show a "burst".
export const QUIET = Object.freeze(new Set(['shabbat', 'rest', 'holiday', 'idle']));

// Existing companion actions (src/shell/rimon-events.js callers) mapped to situations.
const ACTION_SITUATION = Object.freeze({
  correct: 'correct', bounce: 'correct', wink: 'correct', laugh: 'correct', highfive: 'bigCorrect',
  wrong: 'wrong', sad: 'wrong', nervous: 'hint', thinking: 'loading',
  lesson: 'lessonComplete', point: 'lessonComplete', stretch: 'award', streak: 'streak',
  wave: 'home', yawn: 'idle', blink: null,
});

export function situationForAction(action) {
  if (typeof action !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(SITUATIONS, action)) return action;
  return ACTION_SITUATION[action] ?? null;
}

export function situationForHash(hash = '') {
  const h = String(hash || '').toLowerCase();
  if (h === '' || h === '#' || h === '#/' || h.startsWith('#/home')) return 'home';
  if (h.startsWith('#/welcome')) return 'onboarding';
  if (/^#\/(games|arcade|brain|lab)(\/|\?|$)/.test(h)) return 'brainLab';
  if (/^#\/(books|stories|library)(\/|\?|$)/.test(h)) return 'storybooks';
  if (/^#\/(book|story|read)(\/|\?|$)/.test(h)) return 'storyReader';
  if (/^#\/(awards|badges|certificate)(\/|\?|$)/.test(h)) return 'award';
  if (/^#\/(learn|lesson|intermediate)(\/|\?|$)/.test(h)) return 'lessonStart';
  return null;
}

// Friday from 18:00 to Saturday 21:00 local time counts as Shabbat-quiet for the
// mascot. This only calms decoration; it does not compute halachic times.
export function isShabbatQuiet(date = new Date()) {
  const d = date.getDay(), hr = date.getHours();
  return (d === 5 && hr >= 18) || (d === 6 && hr < 21);
}

// Prefer the Claude-order v2 file when it exists; otherwise the original numbered still.
export function stillUrl(id, base = 'data/images/rimon/', v2 = RIMON_STILLS_V2) {
  const slug = v2 && v2[id];
  if (slug) return `${base}v2/rimon-${id}-${slug}.webp`;
  return `${base}rimon-${id}.webp`;
}

// Pick one still for a situation. Pure: random and the available set are injectable.
export function pickStill(situation, { available = RIMON_STILLS_AVAILABLE, random = Math.random, avoid } = {}) {
  const list = SITUATIONS[situation];
  if (!list) return null;
  const have = available instanceof Set ? available : new Set(available || []);
  const ok = list.filter((id) => have.has(id));
  if (!ok.length) return null;
  const pool = ok.length > 1 && avoid ? ok.filter((id) => id !== avoid) : ok;
  const r = Math.min(Math.max(Number(random()) || 0, 0), 0.999999);
  return pool[Math.floor(r * pool.length)];
}

// Decide what to show for a request, applying Shabbat and reduced-motion rules.
export function planMoment(situation, { now = new Date(), reduceMotion = false, available, random, avoid } = {}) {
  if (!situation || !SITUATIONS[situation]) return null;
  let s = situation;
  // On Shabbat the big celebrations calm down to a quiet still.
  if (isShabbatQuiet(now) && !QUIET.has(s) && !['wrong', 'hint', 'error', 'offline'].includes(s)) s = 'shabbat';
  const quiet = QUIET.has(s);
  let id = pickStill(s, { available, random, avoid });
  const flip = flipForSituation(s, { reduceMotion, quiet });
  if (!id && flip) {
    const have = available instanceof Set ? available : new Set(available || RIMON_STILLS_AVAILABLE);
    id = (FLIPS[flip].frames || []).find((fid) => have.has(fid)) || null;
  }
  if (!id) return null;
  const entrance = quiet ? 'none' : (s === 'wrong' || s === 'hint' ? 'bounce' : (s === 'offline' || s === 'empty' || s === 'reminder' ? 'peek' : (s === 'streak' || s === 'bigCorrect' || s === 'home' || s === 'lessonStart' ? 'crash' : 'burst')));
  const hold = quiet || flip === 'sleepy' ? 1.6 : flip ? 1.15 : 1;
  return { situation: s, id, flip, animate: !reduceMotion && !quiet, entrance, hold };
}

export function mountRimonStills({ doc = globalThis.document, base = 'data/images/rimon/', holdMs = 1800 } = {}) {
  if (!doc?.createElement || !doc.body) return null;
  const win = doc.defaultView || globalThis;
  const media = (() => { try { return win.matchMedia?.('(prefers-reduced-motion: reduce)') || null; } catch { return null; } })();
  const fig = doc.createElement('figure');
  fig.className = 'rimon-moment';
  fig.hidden = true;
  fig.setAttribute('aria-hidden', 'true');
  const img = doc.createElement('img');
  img.className = 'rimon-moment-img';
  img.alt = '';
  img.decoding = 'async';
  img.width = 512; img.height = 512;
  const flipEl = doc.createElement('span');
  flipEl.className = 'rimon-moment-flip';
  flipEl.hidden = true;
  fig.append(img, flipEl);
  doc.body.append(fig);
  let alive = true, timer = 0, flipTimer = 0, last = '', shownAt = 0;
  const ENTRANCE_CLASS = { bounce: 'is-bounce', crash: 'is-crash', peek: 'is-peek', burst: 'is-burst' };
  const stopFlip = () => { clearTimeout(flipTimer); flipEl.hidden = true; flipEl.style.backgroundImage = ''; img.hidden = false; };
  const hide = () => { clearTimeout(timer); stopFlip(); fig.hidden = true; fig.classList.remove('is-burst', 'is-bounce', 'is-crash', 'is-peek', 'is-streak-glow'); fig.removeAttribute('data-situation'); fig.removeAttribute('data-flip'); };
  img.addEventListener('error', () => { if (flipEl.hidden) { img.removeAttribute('src'); hide(); } });
  function playFlip(plan) {
    if (!plan.flip || !plan.animate) return;
    const spec = FLIPS[plan.flip];
    const url = flipUrl(plan.flip, base);
    const Img = win.Image || globalThis.Image;
    if (!spec || !url || !Img) return;
    const probe = new Img();
    probe.onload = () => {
      if (!alive || fig.hidden) return;
      flipEl.style.backgroundImage = `url("${url}")`;
      flipEl.style.backgroundSize = `${spec.count * 100}% 100%`;
      flipEl.style.backgroundPosition = '0 0';
      flipEl.hidden = false;
      img.hidden = true;
      let i = 0;
      const step = () => {
        if (!alive || fig.hidden) return;
        flipEl.style.backgroundPosition = `${-i * 100}% 0`;
        i += 1;
        if (i < spec.count) flipTimer = win.setTimeout ? win.setTimeout(step, spec.ms) : setTimeout(step, spec.ms);
        else if (spec.loop) { i = 0; flipTimer = setTimeout(step, spec.ms); }
      };
      step();
    };
    // A missing sheet keeps the still visible; never throws.
    probe.onerror = () => { stopFlip(); };
    probe.src = url;
  }
  function show(situation) {
    try {
      if (!alive) return false;
      const now = Date.now();
      // Do not stack: the same situation within a beat is ignored.
      if (!fig.hidden && now - shownAt < 450 && fig.dataset.situation === situation) return false;
      const plan = planMoment(situation, { now: new Date(), reduceMotion: !!media?.matches, avoid: last });
      if (!plan) return false;
      last = plan.id; shownAt = now;
      hide();
      fig.dataset.situation = plan.situation;
      fig.dataset.still = plan.id;
      if (plan.flip) fig.dataset.flip = plan.flip;
      img.src = stillUrl(plan.id, base);
      fig.hidden = false;
      if (plan.situation === 'streak' && plan.animate) fig.classList.add('is-streak-glow');
      if (plan.animate) { void fig.offsetWidth; fig.classList.add(ENTRANCE_CLASS[plan.entrance] || 'is-burst'); }
      playFlip(plan);
      timer = setTimeout(hide, Math.round(holdMs * (plan.hold || (plan.situation === 'shabbat' ? 1.5 : 1))));
      return true;
    } catch { hide(); return false; }
  }
  const onEvent = (e) => { const s = situationForAction(e?.detail?.action); if (s) show(s); };
  const onRoute = () => { const s = situationForHash(win.location?.hash); if (s) show(s); };
  const onOffline = () => show('offline');
  const onOnline = () => show('recovered');
  doc.addEventListener('alef:rimon', onEvent);
  doc.addEventListener('alef:ready', onRoute);
  win.addEventListener?.('offline', onOffline);
  win.addEventListener?.('online', onOnline);
  return {
    element: fig, show, hide,
    destroy() { alive = false; hide(); try { fig.remove?.() || fig.parentNode?.removeChild?.(fig); } catch { /* already gone */ } doc.removeEventListener('alef:rimon', onEvent); doc.removeEventListener('alef:ready', onRoute); win.removeEventListener?.('offline', onOffline); win.removeEventListener?.('online', onOnline); },
  };
}
