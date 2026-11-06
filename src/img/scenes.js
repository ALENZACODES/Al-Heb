// Scene and letter-meet ids that the learner UI asks the image resolver for.
// Hold SPEAK art is intentionally absent: resolve() stays null for it unless a reviewer approves it later.

export const SCENE = Object.freeze({
  minuteOne: 'GAME_minute_one_celebration',
  minuteOneVariant: 'GAME_minute_one_celebration_02',
  minuteOneStill03: 'GAME_minute_one_celebration_03',
  minuteOneStill04: 'GAME_minute_one_celebration_04',
  minuteOneStill05: 'GAME_minute_one_celebration_05',
  minuteOneStill06: 'GAME_minute_one_celebration_06',
  minuteOneStill07: 'GAME_minute_one_celebration_07',
  minuteOneStill08: 'GAME_minute_one_celebration_08',
  minuteOneStill09: 'GAME_minute_one_celebration_09',
  minuteOneStill11: 'GAME_minute_one_celebration_11',
  minuteOneStill12: 'GAME_minute_one_celebration_12',
  letterRush: 'GAME_letter_rush',
  letterRushRound: 'GAME_letter_rush_02',
  letterRushRound03: 'GAME_letter_rush_03',
  letterRushRound04: 'GAME_letter_rush_04',
  letterRushRound05: 'GAME_letter_rush_05',
  letterRushRound06: 'GAME_letter_rush_06',
  sofitSniper: 'GAME_sofit_sniper',
  sofitSniperLevel: 'GAME_sofit_sniper_02',
  sofitSniperLevel03: 'GAME_sofit_sniper_03',
  sofitSniperLevel04: 'GAME_sofit_sniper_04',
  sofitSniperLevel05: 'GAME_sofit_sniper_05',
  sofitSniperLevel06: 'GAME_sofit_sniper_06',
  niqqudFade: 'GAME_niqqud_fade',
  niqqudFadeStill: 'GAME_niqqud_fade_02',
  niqqudFadeStill03: 'GAME_niqqud_fade_03',
  niqqudFadeStill04: 'GAME_niqqud_fade_04',
  niqqudFadeStill05: 'GAME_niqqud_fade_05',
  traditionDetective: 'GAME_tradition_detective',
  traditionDetectiveListen: 'GAME_tradition_detective_02',
  traditionDetectiveCase: 'GAME_tradition_detective_03',
  traditionDetectiveCase04: 'GAME_tradition_detective_04',
  traditionDetectiveCase05: 'GAME_tradition_detective_05',
  traditionDetectiveCase06: 'GAME_tradition_detective_06',
  storyPostcard: 'GAME_story_postcard',
  storySeaside: 'GAME_story_seaside_market',
  storyEpisode: 'GAME_story_episode_02',
  storyEpisode03: 'GAME_story_episode_03',
  storyEpisode04: 'GAME_story_episode_04',
  storyEpisode05: 'GAME_story_episode_05',
  karaokeListen: 'GAME_karaoke_listen',
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
