// ALEF opening prayer veil: one sourced entry per real page load.
// The visual never holds the application after its first-route ready event.
// When that one entry has an Israeli clip for the learner's voice, it starts then.
// No other tradition and no browser voice. Skip, leaving the page, or a new entry stops it.
import { autoplayAllowed, clipFor, createEntryPlayback } from './prayer-audio.js';
export const MODEH_ANI = Object.freeze({
  he: 'מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ',
  en: 'I thank You, living and eternal King, for returning my soul to me with compassion. Great is Your faithfulness.',
  source: 'Traditional Modeh Ani — exact wording supplied in the ALEF homepage brief; edition collation pending.'
});
const LAST_KEY = 'alef:opening-prayer:last:v1';
const VISIT_KEY = 'alef:opening-prayer:seen:v1';

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

function luckyNumber() {
  try {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  } catch { return Math.random(); }
}
function readLocal(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
function writeLocal(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode: no persistence */ } }
function readSettings() { try { return JSON.parse(readLocal('alef:settings') || '{}'); } catch { return {}; } }

let playback = null;
let playbackToken = 0;
function stopEntryAudio() {
  playbackToken += 1;
  if (playback) { playback.stop(); playback = null; }
}

function initPrayerVeil() {
  const veil = document.getElementById('alef-prayer-veil');
  if (!veil) return;
  const he = document.getElementById('alef-prayer-he');
  const en = document.getElementById('alef-prayer-en');
  const maxMs = readLocal(VISIT_KEY) ? 800 : 2200;
  writeLocal(VISIT_KEY, '1');
  let closed = false;
  let deadline = null;
  let holdForTap = false;
  let startedAttempt = false;
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  function dismiss(now = false, keepAudio = false) {
    if (closed) return;
    closed = true;
    if (!keepAudio) stopEntryAudio();
    clearTimeout(deadline);
    document.removeEventListener('alef:ready', onReady);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onLeave);
    window.removeEventListener('pagehide', onLeave);
    if (now || reduce) { veil.remove(); return; }
    veil.classList.add('prayer-veil--leaving');
    setTimeout(() => veil.remove(), 150);
  }
  function onLeave() { dismiss(true); }
  function onReady() {
    if (!startedAttempt || holdForTap) return;
    dismiss(false, true);
  }
  function onKey(e) { if (e.key === 'Escape') dismiss(true); }
  veil.addEventListener('click', () => dismiss(true));
  document.addEventListener('keydown', onKey);
  document.addEventListener('alef:ready', onReady, { once: true });
  window.addEventListener('hashchange', onLeave);
  window.addEventListener('pagehide', onLeave);
  deadline = setTimeout(() => dismiss(true), maxMs);
  if (document.body.dataset.ready === '1') dismiss();

  // Local same-origin JSON in the PWA precache. Do not block boot on network.
  Promise.resolve().then(async () => {
    let chosen = MODEH_ANI;
    let catalog = { clips: [] };
    try {
      const [response, audioList] = await Promise.all([
        fetch(new URL('../../data/homepage/prayers.json', import.meta.url)),
        fetch(new URL('../../data/homepage/prayer-audio.json', import.meta.url)),
      ]);
      if (!response.ok) throw new Error('prayer bank unavailable');
      const data = await response.json();
      if (!Array.isArray(data.prayers) || data.prayers.length !== 80) throw new Error('unreviewed or incomplete prayer bank');
      chosen = pickPrayer(data.prayers, readLocal(LAST_KEY), luckyNumber);
      if (audioList.ok) catalog = await audioList.json();
    } catch { /* the supplied Modeh Ani is the single safe fallback */ }
    if (closed || veil.dataset.audioOnce === '1') return;
    veil.dataset.audioOnce = '1';
    he.textContent = chosen.he;
    en.textContent = chosen.en;
    veil.dataset.prayerReady = '1';
    writeLocal(LAST_KEY, prayerKey(chosen));
    const settings = readSettings();
    const voice = settings.voice === 'm' ? 'm' : 'f';
    const path = clipFor(catalog, chosen.he, voice);
    const playBtn = document.getElementById('alef-prayer-play');
    const note = document.getElementById('alef-prayer-sound');
    if (!autoplayAllowed(settings)) {
      if (note) note.textContent = 'Sound is off in Settings.';
      startedAttempt = true;
      if (document.body.dataset.ready === '1') onReady();
      return;
    }
    if (!path) {
      if (note) note.textContent = 'No Israeli recording for this entry yet.';
      startedAttempt = true;
      if (document.body.dataset.ready === '1') onReady();
      return;
    }
    clearTimeout(deadline);
    startedAttempt = true;
    const token = ++playbackToken;
    playback = createEntryPlayback({ path, onEnded: () => { if (!closed) dismiss(false, true); } });
    const started = await playback.start();
    if (token !== playbackToken) return;
    if (started.ok) {
      if (playBtn) {
        playBtn.hidden = false;
        playBtn.textContent = 'Pause';
        playBtn.setAttribute('aria-pressed', 'true');
        playBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          if (!playback) return;
          if (playback.playing) { playback.stop(); playBtn.textContent = 'Play the Israeli reading'; playBtn.setAttribute('aria-pressed', 'false'); }
          else { playback.start().then(() => { playBtn.textContent = 'Pause'; playBtn.setAttribute('aria-pressed', 'true'); }); }
        });
      }
      return;
    }
    if (started.reason === 'autoplay-blocked' && playBtn) {
      holdForTap = true;
      playBtn.hidden = false;
      playBtn.textContent = 'Play the Israeli reading';
      playBtn.setAttribute('aria-pressed', 'false');
      if (note) note.textContent = 'The browser held the sound. Tap to hear this Israeli reading.';
      playBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const again = await playback.start();
        if (!again.ok) return;
        playBtn.textContent = 'Pause';
        playBtn.setAttribute('aria-pressed', 'true');
      });
    }
  });
}

if (typeof document !== 'undefined' && document.getElementById?.('alef-prayer-veil')) initPrayerVeil();
