// ALEF opening prayer veil: one sourced entry per real page load.
// The visual never holds the application after its first-route ready event.
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

function initPrayerVeil() {
  const veil = document.getElementById('alef-prayer-veil');
  if (!veil) return;
  const he = document.getElementById('alef-prayer-he');
  const en = document.getElementById('alef-prayer-en');
  const maxMs = readLocal(VISIT_KEY) ? 800 : 2200;
  writeLocal(VISIT_KEY, '1');
  let closed = false;
  let deadline = null;
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  function dismiss(now = false) {
    if (closed) return;
    closed = true;
    clearTimeout(deadline);
    document.removeEventListener('alef:ready', onReady);
    document.removeEventListener('keydown', onKey);
    if (now || reduce) { veil.remove(); return; }
    veil.classList.add('prayer-veil--leaving');
    setTimeout(() => veil.remove(), 150);
  }
  function onReady() { dismiss(); }
  function onKey(e) { if (e.key === 'Escape') dismiss(true); }
  veil.addEventListener('click', () => dismiss(true));
  document.addEventListener('keydown', onKey);
  document.addEventListener('alef:ready', onReady, { once: true });
  deadline = setTimeout(() => dismiss(true), maxMs);
  if (document.body.dataset.ready === '1') dismiss();

  // Local same-origin JSON in the PWA precache. Do not block boot on network.
  Promise.resolve().then(async () => {
    let chosen = MODEH_ANI;
    try {
      const response = await fetch(new URL('../../data/homepage/prayers.json', import.meta.url));
      if (!response.ok) throw new Error('prayer bank unavailable');
      const data = await response.json();
      if (!Array.isArray(data.prayers) || data.prayers.length !== 80) throw new Error('unreviewed or incomplete prayer bank');
      chosen = pickPrayer(data.prayers, readLocal(LAST_KEY), luckyNumber);
    } catch { /* the supplied Modeh Ani is the single safe fallback */ }
    if (closed) return;
    he.textContent = chosen.he;
    en.textContent = chosen.en;
    veil.dataset.prayerReady = '1';
    writeLocal(LAST_KEY, prayerKey(chosen));
  });
}

if (typeof document !== 'undefined' && document.getElementById?.('alef-prayer-veil')) initPrayerVeil();
