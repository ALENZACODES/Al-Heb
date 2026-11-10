// Rimon "big moment" stills: a bold burst-in still for each situation, on top of the
// existing companion. Decoration only: a missing image, an unknown event, or any
// error shows nothing and never touches scoring, progress, or navigation.
import { RIMON_STILLS_AVAILABLE, RIMON_STILLS_V2 } from './rimon-stills-index.js';
import { FLIPS, SITUATION_FLIP, flipUrl, flipForSituation } from './rimon-flips.js';
export { FLIPS, SITUATION_FLIP, flipUrl, flipForSituation };

// Preferred stills per situation (see docs/images/rimon-placements.md).
// Plain ids (023, 025b) are the original drawn set (data/images/rimon/rimon-###.webp).
// Catalogue stills are asked for by name as v2:NNN (data/images/rimon/v2/rimon-NNN-<slug>.webp).
// The two catalogues share numbers but not poses, so a v2 file is never treated as a
// replacement for the same-numbered drawn still. Drawn ids are tried first, then v2.
// Ids that are not in the available list are skipped. A `b` id is a bolder reroll
// of a drawn pose and is tried first among that pair.
export const SITUATIONS = Object.freeze({
  home: ['002', '001', 'v2:001', 'v2:082', '100', 'v2:080', 'v2:081', '020', 'v2:083', '018', 'v2:087', '038', 'v2:086'],
  onboarding: ['005', 'v2:003', '010', '015', 'v2:004', '008', 'v2:005', '019', 'v2:006'],
  welcomeBack: ['020', 'v2:002', '038', 'v2:086'],
  lessonStart: ['017', 'v2:007', '018', 'v2:008', '008', 'v2:010', '011', 'v2:009', '078', '004', 'v2:040', 'v2:041', '019', 'v2:042', 'v2:043', '062', 'v2:044'],
  correct: ['012', 'v2:012', '021', '023', '024', '026', '027', '028', '030', '031', '033', '034', '035', '036', '037', '039', '040', 'v2:018', 'v2:019', 'v2:020', 'v2:021', 'v2:022', 'v2:023', 'v2:024', 'v2:025', '022', 'v2:026'],
  bigCorrect: ['025b', '025', 'v2:027', '083', 'v2:028', '026', 'v2:039', '076', 'v2:015', '068', 'v2:029'],
  wrong: ['014', 'v2:013', '041', '042', '044', '045', '048', '049', '054', '055', 'v2:030', 'v2:031', 'v2:032', 'v2:033', 'v2:034', 'v2:035', '050', 'v2:037'],
  hint: ['047', '051', '052', 'v2:036'],
  streak: ['056', 'v2:054', '057', 'v2:055', '058', 'v2:056', '059', 'v2:057', '060', 'v2:058', '066', 'v2:059', '067', 'v2:060', '069', 'v2:061', '061', 'v2:067'],
  streakRisk: ['062', 'v2:062', '063', 'v2:063', '055', 'v2:064', '068', 'v2:065', '065', 'v2:175', 'v2:176'],
  rest: ['064', 'v2:066', '100', 'v2:078', 'v2:077', 'v2:079'],
  lessonComplete: ['071', 'v2:014', '073', '074', '083', '084', 'v2:046', 'v2:047', '077', '075', 'v2:048', 'v2:049', '085', '079', '080', 'v2:050', 'v2:051'],
  unitComplete: ['082', '081', 'v2:045', 'v2:171', 'v2:172', '066', 'v2:173', 'v2:174'],
  idle: ['089', '090', '091', '092', '093', '094', '095', '096', '097', 'v2:068', 'v2:069', 'v2:070', 'v2:071', 'v2:072', 'v2:073', 'v2:074', 'v2:075', '087', '099', 'v2:076', '098', 'v2:011'],
  loading: ['110', 'v2:186', '043', 'v2:038', 'v2:052', '080', 'v2:053'],
  empty: ['114', 'v2:164', 'v2:190'],
  error: ['104', '102', 'v2:180', 'v2:181', '101', '108', '109', 'v2:182'],
  recovered: ['112', '107', 'v2:184'],
  offline: ['106', '105', 'v2:183', '107', 'v2:185'],
  shabbat: ['118', 'v2:088', 'v2:089', '117', 'v2:090', 'v2:091', '116', '119', 'v2:092', 'v2:093', 'v2:094', '120', 'v2:095', '070', 'v2:097', 'v2:096'],
  holiday: ['121', '122', 'v2:098', 'v2:099', 'v2:100', 'v2:101', '123', 'v2:102', 'v2:103', '125', '124', 'v2:104', 'v2:105', 'v2:106', 'v2:107', 'v2:108', 'v2:109', 'v2:110', 'v2:111', 'v2:112', 'v2:113', 'v2:114', 'v2:115', 'v2:116', 'v2:117', 'v2:118', 'v2:119', 'v2:120', 'v2:121', 'v2:122', 'v2:123', 'v2:124', 'v2:125', 'v2:126', 'v2:127', 'v2:128', 'v2:129', 'v2:130', 'v2:131', 'v2:132', 'v2:133', 'v2:134'],
  brainLab: ['v2:017', 'v2:135', 'v2:136', 'v2:137', 'v2:138', 'v2:139', 'v2:140', 'v2:141', 'v2:142', 'v2:143', 'v2:144', 'v2:145', 'v2:146'],
  brainLabWin: ['v2:147', 'v2:148', 'v2:149', 'v2:150', 'v2:151'],
  brainLabMiss: ['049', '054', 'v2:030', 'v2:031', 'v2:034'],
  storybooks: ['v2:016', 'v2:152', 'v2:153', 'v2:156', 'v2:157'],
  storyReader: ['v2:154', 'v2:155'],
  award: ['075', 'v2:163', '076', '077', 'v2:165', 'v2:166', '065', '066', 'v2:167', 'v2:168', '067', 'v2:169', 'v2:170'],
  reminder: ['110', 'v2:177', '062', '065', 'v2:175', 'v2:176', '099', 'v2:084', 'v2:085', 'v2:178', 'v2:179'],
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

// The numbered still for an id. The v2 folder is a different catalogue (docs/images/RIMON-STILLS.md): its 018 is not this
// set's 018, so a v2 picture is used only when asked for by name, as 'v2:018'. Rimon's stage (src/shell/rimon-stage.js)
// places the v2 pictures by meaning.
export function stillUrl(id, base = 'data/images/rimon/', v2 = RIMON_STILLS_V2) {
  const m = /^v2:(\d{3})$/.exec(String(id));
  if (m && v2 && v2[m[1]]) return `${base}v2/rimon-${m[1]}-${v2[m[1]]}.webp`;
  return `${base}rimon-${String(id).replace(/^v2:/, '')}.webp`;
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
      // Rimon's stage (src/shell/rimon-stage.js), when running, chooses the picture from the one map for every Rimon surface and
      // knows quiet days, prayer and Torah screens and Hide Rimon: [] means no Rimon now, null means use this module's own pick.
      let fromStage = null;
      try { fromStage = globalThis.alefRimonStage?.urlsForSituation?.(plan.situation) ?? null; } catch { fromStage = null; }
      if (Array.isArray(fromStage) && !fromStage.length) return false;
      if (fromStage?.[0]) plan.flip = null; // the flip-books belong to this module's own pictures
      const src = fromStage?.[0] || stillUrl(plan.id, base);
      // Offline, a picture is asked for only when a copy is kept on the device (no request that can only fail), and without its flip-book.
      if ((win.navigator || globalThis.navigator)?.onLine === false) {
        keptCopy(src).then((ok) => { if (ok && alive) { plan.flip = null; paint(plan, src, now); } }).catch(() => {});
        return false;
      }
      paint(plan, src, now);
      return true;
    } catch { hide(); return false; }
  }
  async function keptCopy(url) {
    try { const kept = win.caches || globalThis.caches; return !!(kept && await kept.match(new URL(url, win.location?.href || globalThis.location?.href).href)); } catch { return false; }
  }
  function paint(plan, src, now) {
    try {
      last = plan.id; shownAt = now;
      hide();
      fig.dataset.situation = plan.situation;
      fig.dataset.still = plan.id;
      if (plan.flip) fig.dataset.flip = plan.flip;
      img.src = src;
      fig.hidden = false;
      if (plan.situation === 'streak' && plan.animate) fig.classList.add('is-streak-glow');
      if (plan.animate) { void fig.offsetWidth; fig.classList.add(ENTRANCE_CLASS[plan.entrance] || 'is-burst'); }
      playFlip(plan);
      timer = setTimeout(hide, Math.round(holdMs * (plan.hold || (plan.situation === 'shabbat' ? 1.5 : 1))));
    } catch { hide(); }
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
