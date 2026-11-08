// ALEF opening prayer veil: one sourced entry per real page load.
// The veil holds for its full dwell (6 s for a returning learner, 9 s on a
// first visit, longer while its prayer plays), counted from the LATER of the
// prayer rendering and the app's ready signal — never from load timing — so a
// first visit that spends seconds installing the offline copy does not eat
// the dwell (owner report, Nov 7 2026: the veil closed within ~4 s of the
// page settling); only the dwell timer, a tap, Skip, Escape or the 12 s
// failsafe close it. The chosen prayer's clip starts as the prayer renders
// (the learner's voice setting, woman by default); where the browser blocks
// autoplay the veil asks for one tap, which starts the clip without closing
// the veil. While the clip plays the veil holds; it closes 1 s after "ended".
export const MODEH_ANI = Object.freeze({
  he: 'מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ',
  tr: 'Modeh ani lefanecha, Melech chai vekayam, shehechezarta bi nishmati bechemla. Raba emunatecha.',
  en: 'I thank You, living and eternal King, for returning my soul to me with compassion. Great is Your faithfulness.',
  source: 'Traditional Modeh Ani — exact wording supplied in the ALEF homepage brief; edition collation pending.'
});
const LAST_KEY = 'alef:opening-prayer:last:v1';
const VISIT_KEY = 'alef:opening-prayer:seen:v1';
/** Count of opening prayers actually heard: the Awards engine reads this. */
export const LISTEN_COUNT_KEY = 'alef:opening-prayer:listens:v1';
/** How often the veil shows. OWNER RULING (Nov 7 2026): 'every-visit' — the
 *  usability review's once-per-learner-ever was put to the owner and declined.
 *  The learner's own off switch is "Don't show again" (the veilOptOut
 *  setting, reversible in Settings). This constant is the whole frequency
 *  policy: 'once-ever' would show the veil only until the first visit. */
export const VEIL_FREQUENCY = 'every-visit';

export function prayerKey(p) { return p.he; }

/** Does not mutate the bank. If there are 2+ candidates, never repeats the previous one. */
export function pickPrayer(bank, previous = '', random = Math.random) {
  const valid = Array.isArray(bank) ? bank.filter((p) =>
    p && typeof p.he === 'string' && typeof p.en === 'string' && typeof p.source === 'string' &&
    p.he.trim() && p.en.trim() && p.source.trim()) : [];
  if (!valid.length) return MODEH_ANI;
  const fresh = valid.filter((p) => prayerKey(p) !== previous);
  const pool = fresh.length ? fresh : valid;
  const choice = Number(random());
  const n = Number.isFinite(choice) ? Math.min(pool.length - 1, Math.max(0, Math.floor(choice * pool.length))) : 0;
  return pool[n];
}

/** Clip for a bank prayer, or null. data.audio maps 1-based bank positions ("1".."80") to {m, f} paths. */
export function prayerAudioPath(data, chosen, voice) {
  if (!data || !Array.isArray(data.prayers) || !chosen) return null;
  const idx = data.prayers.findIndex((p) => prayerKey(p) === prayerKey(chosen));
  if (idx < 0) return null;
  const entry = data.audio?.[String(idx + 1)];
  const path = entry?.[voice === 'm' ? 'm' : 'f'];
  return typeof path === 'string' && path.trim() ? path : null;
}

/** The learner's voice pick + audio-free flag, read from the same store record the app writes.
 *  The veil runs before the app boots, so it reads localStorage directly and degrades to defaults. */
function readAudioPrefs() {
  try {
    const raw = localStorage.getItem('alef:settings');
    const s = raw ? JSON.parse(raw) : {};
    return { voice: s?.voice === 'm' ? 'm' : 'f', audioFree: s?.audioFree === true, veilOptOut: s?.veilOptOut === true };
  } catch { return { voice: 'f', audioFree: false, veilOptOut: false }; }
}

/** "Don't show again": persist the opt-out into the same settings record the
 *  app reads, so Settings can reverse it. The veil runs before the app boots,
 *  so it writes the record directly, exactly as it reads it above. */
function writeVeilOptOut() {
  try {
    const raw = localStorage.getItem('alef:settings');
    const s = raw ? JSON.parse(raw) : {};
    if (s && typeof s === 'object' && !Array.isArray(s)) { s.veilOptOut = true; localStorage.setItem('alef:settings', JSON.stringify(s)); }
  } catch { /* private mode: the opt-out lasts this visit only */ }
}

function luckyNumber() {
  try {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  } catch { return Math.random(); }
}
function readLocal(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
function writeLocal(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode: no persistence */ } }

/** Listen-button label and prompt for each audio state. Pure, so tests can pin the copy. */
export const AUDIO_STATES = Object.freeze({
  idle: { label: 'Listen to this prayer', prompt: '', pressed: 'false' },
  playing: { label: 'Pause the prayer', prompt: '', pressed: 'true' },
  paused: { label: 'Continue the prayer', prompt: '', pressed: 'false' },
  blocked: { label: 'Listen to this prayer', prompt: 'Tap anywhere to hear the prayer', pressed: 'false' }
});

/** Did play() fail because the browser wants a gesture first (autoplay policy), rather than because the clip is broken?
 *  Chromium, Firefox and Safari all reject with NotAllowedError; anything else is a real media failure. */
export function isAutoplayBlock(err) { return !!err && (err.name === 'NotAllowedError' || /not allowed|user gesture|user activation/i.test(String(err.message || ''))); }

/** Should this pointer/key event start blocked playback? Buttons keep their own meaning (Close, Skip, Don't show again, Listen),
 *  Escape still closes, and Tab/modifier keys are navigation. Everything else on the veil is the learner's first tap. */
export function startsBlockedPlayback(e) {
  if (!e) return false;
  if (e.type === 'keydown') {
    if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.altKey || e.ctrlKey || e.metaKey) return false;
  }
  const t = e.target;
  return !(t && typeof t.closest === 'function' && t.closest('button, a, input, select, textarea'));
}

function initPrayerVeil() {
  const veil = document.getElementById('alef-prayer-veil');
  if (!veil) return;
  const he = document.getElementById('alef-prayer-he');
  const tr = document.getElementById('alef-prayer-tr');
  const en = document.getElementById('alef-prayer-en');
  const listenBtn = document.getElementById('alef-prayer-listen');
  const audioNote = document.getElementById('alef-prayer-audio-note');
  const audioPrompt = document.getElementById('alef-prayer-audio-prompt');
  const closeBtn = document.getElementById('alef-prayer-close');
  const noShowBtn = document.getElementById('alef-prayer-noshow');
  // The learner's own off switch wins over everything: no veil at all.
  if (readAudioPrefs().veilOptOut) { veil.remove(); return; }
  if (VEIL_FREQUENCY === 'once-ever' && readLocal(VISIT_KEY)) { veil.remove(); return; }
  const firstVisit = !readLocal(VISIT_KEY);
  writeLocal(VISIT_KEY, '1');
  let closed = false;
  let rendered = false;
  let readySeen = false;
  let deadline = null;
  let audio = null, audioPath = '', holding = false;
  let audioState = 'idle', counted = false, swallowClickUntil = 0;
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  function stopAudio() {
    try { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load?.(); } } catch { /* ignore */ }
  }
  function setAudioState(next) {
    audioState = next;
    const ui = AUDIO_STATES[next] || AUDIO_STATES.idle;
    veil.dataset.audioState = next;
    if (listenBtn) { listenBtn.textContent = ui.label; listenBtn.setAttribute('aria-pressed', ui.pressed); }
    if (audioPrompt) { audioPrompt.textContent = ui.prompt; audioPrompt.hidden = !ui.prompt; }
  }
  // Playback (the autoplay attempt or an explicit Listen tap) may extend the
  // short opening. A missing media "ended" event must never strand the
  // learner behind the veil.
  const MAX_LISTEN_HOLD_MS = 18000;
  function holdForAudio() {
    if (closed || holding) return;
    holding = true;
    clearTimeout(deadline);
    deadline = setTimeout(() => dismiss(true), MAX_LISTEN_HOLD_MS);
  }
  function releaseAfter(ms) {
    if (closed) return;
    clearTimeout(deadline);
    deadline = setTimeout(() => dismiss(true), ms);
  }
  // Start the dwell only once the prayer is rendered AND the app is ready to
  // be read: on a slow first visit the render lands seconds before the page
  // settles, and counting from render alone ate the dwell.
  function arm() {
    if (rendered && readySeen && !holding && !closed) releaseAfter(firstVisit ? 9000 : 6000);
  }
  function hideAudioControls() {
    if (listenBtn) listenBtn.hidden = true;
    if (audioNote) audioNote.hidden = true;
    if (audioPrompt) audioPrompt.hidden = true;
  }
  /** Start (or resume) the chosen clip. `auto` is the attempt made as the prayer renders, before any gesture:
   *  a NotAllowedError there is the browser's autoplay policy, so the veil asks for a tap instead of giving up. */
  function startPlayback({ auto = false } = {}) {
    if (closed || !audioPath) return;
    holdForAudio();
    try {
      if (!audio) audio = new Audio();
      if (audio.getAttribute('src') !== audioPath) audio.src = audioPath;
      audio.onended = () => { setAudioState('idle'); releaseAfter(1000); };
      audio.onerror = () => { hideAudioControls(); setAudioState('idle'); releaseAfter(800); };
      const p = audio.play();
      const started = () => {
        // Playback started: the learner heard this prayer. (A failed play
        // never counts — the catch below leaves the count alone.) A pause and
        // resume of the same prayer is still one listen.
        setAudioState('playing');
        if (!counted) { counted = true; try { writeLocal(LISTEN_COUNT_KEY, String((parseInt(readLocal(LISTEN_COUNT_KEY), 10) || 0) + 1)); } catch { /* private mode */ } }
      };
      const failed = (err) => {
        if (closed) return;
        if (auto && isAutoplayBlock(err)) { blockedByPolicy(); return; }
        hideAudioControls(); setAudioState('idle'); releaseAfter(800);
      };
      if (p?.then) {
        p.then(() => {
          // Playback started (see started() above).
          started();
        }).catch(failed);
      } else started(); // very old media implementations return nothing from play()
    } catch (err) { if (auto && isAutoplayBlock(err)) blockedByPolicy(); else releaseAfter(800); }
  }
  // The browser wants a gesture first: ask for one tap and hand the veil back
  // to its normal dwell (or a failsafe, if the app has not signalled ready).
  function blockedByPolicy() {
    setAudioState('blocked');
    holding = false;
    if (readySeen) arm(); else releaseAfter(12000);
  }
  function pausePlayback() {
    if (!audio) return;
    try { audio.pause(); } catch { /* ignore */ }
    setAudioState('paused');
    // Paused by hand: let the veil close on a short dwell unless Continue is tapped.
    holding = false;
    releaseAfter(4000);
  }
  listenBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // a veil click dismisses; the Listen button must not
    if (closed || !audioPath) return;
    if (audioState === 'playing') pausePlayback(); else startPlayback();
  });
  // Autoplay refused: the learner's first tap or key on the veil starts the
  // prayer and must NOT close it. The click that follows that pointerdown is
  // swallowed; buttons keep their own meaning.
  function onFirstGesture(e) {
    if (closed || audioState !== 'blocked' || !startsBlockedPlayback(e)) return;
    if (e.type === 'keydown') e.preventDefault(); else swallowClickUntil = Date.now() + 1000;
    startPlayback();
  }

  function dismiss(now = false) {
    if (closed) return;
    closed = true;
    stopAudio();
    clearTimeout(deadline);
    document.removeEventListener('alef:ready', onReady);
    document.removeEventListener('keydown', onKey);
    if (now || reduce) { veil.remove(); return; }
    veil.classList.add('prayer-veil--leaving');
    setTimeout(() => veil.remove(), 150);
  }
  function onReady() { readySeen = true; arm(); }
  function onKey(e) { if (e.key === 'Escape') { dismiss(true); return; } onFirstGesture(e); }
  veil.addEventListener('pointerdown', onFirstGesture);
  veil.addEventListener('click', () => { if (Date.now() < swallowClickUntil) { swallowClickUntil = 0; return; } dismiss(true); });
  closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(true); });
  noShowBtn?.addEventListener('click', (e) => { e.stopPropagation(); writeVeilOptOut(); dismiss(true); });
  document.addEventListener('keydown', onKey);
  document.addEventListener('alef:ready', onReady, { once: true });
  // Failsafe only: never trap the learner if the bank fetch hangs. The real
  // dwell starts when the prayer actually renders (below) — a blessing that
  // vanishes before it can be read or heard is worse than none (owner
  // report, Nov 7 2026: the veil closed before anyone could tap Listen).
  deadline = setTimeout(() => dismiss(true), 12000);
  if (document.body.dataset.ready === '1') readySeen = true;

  // Local same-origin JSON in the PWA precache. Do not block boot on network.
  Promise.resolve().then(async () => {
    let chosen = MODEH_ANI;
    let bankData = null;
    try {
      const response = await fetch(new URL('../../data/homepage/prayers.json', import.meta.url));
      if (!response.ok) throw new Error('prayer bank unavailable');
      const data = await response.json();
      if (!Array.isArray(data.prayers) || data.prayers.length !== 80) throw new Error('unreviewed or incomplete prayer bank');
      bankData = data;
      chosen = pickPrayer(data.prayers, readLocal(LAST_KEY), luckyNumber);
    } catch { /* the supplied Modeh Ani is the single safe fallback */ }
    if (closed) return;
    he.textContent = chosen.he;
    if (tr) { tr.textContent = chosen.tr || ''; tr.hidden = !chosen.tr; }
    en.textContent = chosen.en;
    veil.dataset.prayerReady = '1';
    rendered = true;
    arm();
    writeLocal(LAST_KEY, prayerKey(chosen));
    try {
      const prefs = readAudioPrefs();
      const path = prefs.audioFree ? null : prayerAudioPath(bankData, chosen, prefs.voice);
      if (path && listenBtn) {
        audioPath = path;
        setAudioState('idle');
        listenBtn.hidden = false;
        if (audioNote) audioNote.hidden = false;
        // The prayer is meant to be heard, not only read (owner, Nov 7 2026):
        // play it as it appears. Browsers that want a gesture first reject
        // with NotAllowedError; then the veil asks for a tap (see failed()).
        startPlayback({ auto: true });
      }
    } catch { /* audio is an addition; the veil still works without it */ }
  });
}

if (typeof document !== 'undefined' && document.getElementById?.('alef-prayer-veil')) initPrayerVeil();
