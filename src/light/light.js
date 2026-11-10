// @ts-check
// Star of David light: pure helpers for the on-screen glow, flash sparkle and stencil.
// No DOM. Feature detection, Shabbat gating and the photosensitivity cap are tested in tests/light.test.js.
import { isShabbat } from '../shell/notify.js';

/** Full flash cycle must be at least this long (3 Hz cap) for photosensitivity safety. */
export const MIN_STROBE_PERIOD_MS = 334;
/** Default gentle pulse: one breath every 2.4 s (well under the cap). */
export const DEFAULT_PULSE_PERIOD_MS = 2400;
/** When no city is set, hide the torch from Friday 18:00 to Saturday 21:00 local. */
export const LOCAL_TORCH_QUIET = Object.freeze({ fridayFromHour: 18, saturdayUntilHour: 21 });

/**
 * Vertices and SVG path of a point-up Magen David inscribed in a circle of radius `r`.
 * Even steps are the six outer points; odd steps are the inner hexagon (radius r/2).
 * Screen y grows downward, and the first vertex is at the top.
 * @param {number} cx @param {number} cy @param {number} r
 */
export function hexagramPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 6;
    const rad = i % 2 === 0 ? r : r / 2;
    pts.push([cx + r * 0 + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const d = `M${pts.map((p) => `${round(p[0])} ${round(p[1])}`).join('L')}Z`;
  return { pts, d };
}

/**
 * The two overlapping equilateral triangles that make the star (point-up first).
 * @param {number} cx @param {number} cy @param {number} r
 */
export function magenDavidTriangles(cx, cy, r) {
  const at = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const up = [at(-Math.PI / 2), at(-Math.PI / 2 + 2 * Math.PI / 3), at(-Math.PI / 2 + 4 * Math.PI / 3)];
  const down = [at(Math.PI / 2), at(Math.PI / 2 + 2 * Math.PI / 3), at(Math.PI / 2 + 4 * Math.PI / 3)];
  return { up, down };
}

export function trianglePath(pts) {
  return `M${pts.map((p) => `${round(p[0])} ${round(p[1])}`).join('L')}Z`;
}

function round(n) { return Math.round(n * 1000) / 1000; }

/** True when the top vertex is above the centre (a point-up star, not a mirrored P-like shape). */
export function isPointUp(pts) {
  const top = pts.reduce((a, p) => (p[1] < a[1] ? p : a), pts[0]);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  return top[1] < pts.reduce((s, p) => s + p[1], 0) / pts.length && Math.abs(top[0] - cx) < 1e-6;
}

/**
 * Local fallback window: Friday 18:00 inclusive through Saturday 21:00 exclusive, in the date's local zone.
 * @param {Date} date
 */
export function isLocalTorchQuiet(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const dow = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  if (dow === 5 && minutes >= 18 * 60) return true;
  if (dow === 6 && minutes < 21 * 60) return true;
  return false;
}

/**
 * Whether the phone flash and strobe must stay off.
 * With a calendar city: reuse the app's Shabbat window (candle lighting to havdalah).
 * Without a city: Friday 18:00 to Saturday 21:00 local, so the flash is never guessed on during rest.
 * @param {Date} date
 * @param {{lat:number, lon:number, tz?:string, candleMinutes?:number, havdalah?:object}|null|undefined} loc
 */
export function isTorchQuiet(date, loc) {
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) return isShabbat(date, loc);
  return isLocalTorchQuiet(date);
}

/** Clamp a pulse period so a full on-off cycle is never faster than 3 Hz. */
export function clampStrobePeriod(ms) {
  const n = Number(ms);
  return Math.max(MIN_STROBE_PERIOD_MS, Number.isFinite(n) ? n : DEFAULT_PULSE_PERIOD_MS);
}

export const torchConstraint = (on) => ({ advanced: [{ torch: !!on }] });

/** True when this media track advertises a torch. Safe if getCapabilities is missing. */
export function trackSupportsTorch(track) {
  try { return track?.getCapabilities?.()?.torch === true; } catch { return false; }
}

/** True when the page can ask for a camera. Permission is never requested here. */
export function canRequestCamera(g = globalThis) {
  return typeof g?.navigator?.mediaDevices?.getUserMedia === 'function';
}

/**
 * iOS (Safari and other WebKit browsers) exposes getUserMedia but not a torch.
 * Used only to hide the flash toggle early; capability is still confirmed on a real track after a tap.
 * @param {any} [g]
 */
export function isLikelyTorchless(g = globalThis) {
  const nav = g?.navigator;
  const ua = String(nav?.userAgent || '');
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints || 0) > 1);
  return ios;
}

/**
 * Should the glow or flash pulse? Reduced motion and calm mode keep the star still.
 * Shabbat (or the local fallback) only gates the flash, not the on-screen glow.
 * @param {{reducedMotion?:boolean, calm?:boolean, torchQuiet?:boolean, kind:'glow'|'flash'}} o
 */
export function allowPulse(o) {
  if (o.reducedMotion || o.calm) return false;
  if (o.kind === 'flash' && o.torchQuiet) return false;
  return true;
}

/**
 * Screen wake lock, injectable for tests. request() is best-effort and never throws.
 * @param {{wakeLock?:{request:(type:string)=>Promise<{release:()=>Promise<void>, released?:boolean, addEventListener?:Function}>}}} [nav]
 */
export function createWakeLock(nav) {
  let sentinel = null;
  return {
    get active() { return !!(sentinel && sentinel.released !== true); },
    async request() {
      const api = nav?.wakeLock || (typeof navigator !== 'undefined' ? navigator.wakeLock : null);
      if (!api || typeof api.request !== 'function') return false;
      try {
        sentinel = await api.request('screen');
        return !!sentinel;
      } catch { sentinel = null; return false; }
    },
    async release() {
      const s = sentinel; sentinel = null;
      try { if (s && s.released !== true) await s.release(); } catch { /* already released */ }
    },
  };
}

export const STENCIL_SIZES_MM = Object.freeze([8, 10, 12]);
export const STENCIL_PDF = 'assets/light/star-stencil.pdf';
export const STENCIL_SVG = 'assets/light/star-stencil.svg';
