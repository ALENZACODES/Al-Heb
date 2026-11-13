// @ts-check
// Gift a lesson (R6): a link, QR code or file that opens one lesson and a few games on another device, with a note from
// the sender. It is a guided first session, not a copy of anyone's progress: the gift carries the lesson's id, up to three
// game ids, a name and a note, and nothing else. No server. No DOM.
import { ARCADE_GAMES } from '../games/arcade.catalog.js';
import { cleanText, packObject, unpackObject, appBase, NOTE_MAX } from './share.js';

export const GIFT_KIND = 'alef-gift';
export const MAX_GAMES = 3;
const LESSON_ID = /^[a-z][a-z0-9-]{1,23}$/;

/** @param {{lesson:string, games?:string[], from?:string, note?:string}} g */
export function makeGift(g) {
  if (!LESSON_ID.test(String(g.lesson || ''))) return { ok: false, error: 'Choose a lesson.' };
  const games = [...new Set(g.games || [])].filter((id) => ARCADE_GAMES.some((x) => x.id === id)).slice(0, MAX_GAMES);
  const gift = { k: GIFT_KIND, v: 1, l: g.lesson, g: games, f: cleanText(g.from), n: cleanText(g.note, NOTE_MAX) };
  return { ok: true, gift, code: packObject(gift) };
}
export const giftLink = (code, base = appBase()) => `${base}#/gift?g=${code}`;

/**
 * Opens a gift. `lessons` is the lesson list of this device: a gift for a lesson this copy does not have is refused.
 * @returns {{ok:true, from:string, note:string, steps:{kind:'lesson'|'game', id:string, title:string, href:string}[]}|{ok:false, error:string}}
 */
export function openGift(input, lessons = []) {
  const o = typeof input === 'string' ? unpackObject(input, GIFT_KIND) : (input && input.k === GIFT_KIND && input.v === 1 ? input : null);
  if (!o || !LESSON_ID.test(String(o.l))) return { ok: false, error: 'That is not a gift from Aleph. Ask the sender for the link again.' };
  const lesson = lessons.find((x) => x.id === o.l);
  if (!lesson) return { ok: false, error: 'This gift is for a lesson this copy of Aleph does not have. Both devices may need the latest Aleph.' };
  const steps = [{ kind: /** @type {'lesson'} */ ('lesson'), id: lesson.id, title: String(lesson.title || lesson.id), href: `#/learn?lesson=${encodeURIComponent(lesson.id)}` }];
  for (const id of (Array.isArray(o.g) ? o.g : []).slice(0, MAX_GAMES)) { const g = ARCADE_GAMES.find((x) => x.id === id); if (g) steps.push({ kind: 'game', id: g.id, title: g.title, href: `#/${g.id}` }); }
  return { ok: true, from: cleanText(o.f), note: cleanText(o.n, NOTE_MAX), steps };
}
