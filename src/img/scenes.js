// Scene and letter-meet ids that the learner UI asks the image resolver for.
// Hold SPEAK art is intentionally absent: resolve() stays null for it unless a reviewer approves it later.

export const SCENE = Object.freeze({
  minuteOne: 'GAME_minute_one_celebration',
  letterRush: 'GAME_letter_rush',
  sofitSniper: 'GAME_sofit_sniper',
  niqqudFade: 'GAME_niqqud_fade',
  traditionDetective: 'GAME_tradition_detective',
  storyPostcard: 'GAME_story_postcard',
});

/** Which shipped SPEAK candidate belongs on this practice set. Never returns a hold id. */
export function speakSceneId(setId = '') {
  const s = String(setId || '');
  if (/taxi|travel|direction|place/.test(s)) return 'SPEAK_08_street_taxi';
  if (/shabbat|relig|prayer|food|cafe|table|home/.test(s)) return 'SPEAK_04_table_shabbat';
  if (/greet|welcome|family|polite|small-talk|people/.test(s)) return 'SPEAK_05_table_welcome';
  return 'SPEAK_05_table_welcome';
}

/** A resolved picture, or null when the resolver has nothing approved to show. */
export function picture(h, ctx, kind, id, extra = {}) {
  if (typeof ctx?.img !== 'function' || !id) return null;
  return ctx.img(h, { kind, id, width: extra.width ?? (kind === 'letter' ? 480 : 720), ...extra }) || null;
}

/** Meet cartoon for a letter lesson. Falls back to any other approved letter picture. */
export function letterMeet(h, ctx, letterId, extra = {}) {
  return picture(h, ctx, 'letter', letterId, { role: 'meet', class: 'letter-meet', ...extra })
    || picture(h, ctx, 'letter', letterId, { class: 'letter-meet', ...extra });
}
