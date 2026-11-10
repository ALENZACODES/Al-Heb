// @ts-check
// #/league: the weekly practice league. The honesty line is always first, above the table, and is never shortened.
import { h, confetti, setKids } from './dom.js';
import { retention, RETENTION_ENABLED, RETENTION_OFF_KEY } from './boot.js';
import { HONESTY_LINE, LEAGUE, leagueView, timeLeftText, tierOf } from './leagues.js';
import { gemsText } from './gems.js';
import { showRimon } from './rimon.js';

export function mount(root, ctx) {
  let off = !RETENTION_ENABLED; try { off = off || ctx.store.get(RETENTION_OFF_KEY) === true; } catch { /* treat as on */ }
  if (off) { root.replaceChildren(h('div', { class: 'stack' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'League'), h('p', {}, 'This part of ALEF is switched off for now.'), h('a', { class: 'btn', href: '#/' }, 'Back to Home'))); return () => {}; }
  const R = retention(ctx);
  const body = h('div', { class: 'stack' });
  let greeted = false;
  function draw() {
    const rec = R.get();
    if (R.calm()) { setKids(body, h('p', {}, 'Calm mode is on, so the practice league is resting.')); return; }
    if (rec.league.enabled === false) { setKids(body, h('p', {}, 'The practice league is off.'), h('button', { type: 'button', class: 'btn', onclick: () => R.update((r) => { r.league.enabled = true; return r; }) }, 'Show the practice league')); return; }
    if (!R.leagueShown()) { setKids(body, h('p', {}, `Leagues open after ${LEAGUE.unlockLessons} lessons. You have finished ${rec.lessonsFinished}.`), h('a', { class: 'btn', href: '#/learn' }, 'Go to lessons')); return; }
    const v = leagueView(rec), kids = [];
    kids.push(h('p', { class: 'ret-honest' }, HONESTY_LINE));
    if (v.resultUnseen && v.last) {
      const l = v.last, to = tierOf(rec.league.tier).en;
      const text = l.result === 'up' ? `You moved up to ${to}!` : l.result === 'down' ? `You're in ${to} this week. A fresh run starts now.` : `You stayed in ${to}. Steady is good.`;
      kids.push(h('section', { class: 'card ret-result', role: 'status' }, l.result === 'up' ? confetti() : null, h('h2', {}, 'Last Week'), h('p', {}, `${text} You finished ${l.rank} of 30 with ${l.xp} XP.`),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => R.update((r) => { r.league.resultUnseen = null; return r; }) }, 'Got it')));
      if (!greeted) { greeted = true; showRimon(l.result === 'up' ? 'league_up' : l.result === 'down' ? 'league_down' : 'league_stay'); }
    }
    kids.push(h('div', { class: 'ret-tier' }, h('span', { class: 'ret-tier-badge' }, h('span', {}, v.tier.en), h('span', { lang: 'he', dir: 'rtl', class: 'he', 'data-review': 'hebrew' }, v.tier.he)),
      h('p', {}, `Tier ${v.tier.n} of 10. `, v.closed ? 'This week is finished. A new week starts on Sunday.' : `Ends Friday at 2 pm: ${timeLeftText(v.msLeft)}.`),
      v.toPromote && !v.closed ? h('p', { class: 'muted' }, `${v.toPromote} XP more reaches the move-up line.`) : null,
      !rec.league.joined && !v.closed ? h('p', { class: 'muted' }, 'Earn 1 XP this week to join the table.') : null));
    const rows = v.table.map((r) => {
      const zone = v.promoteLine && r.rank <= v.promoteLine ? 'up' : v.demoteLine && r.rank > v.demoteLine ? 'down' : '';
      return h('tr', { class: `${r.you ? 'is-you ' : ''}${zone ? 'zone-' + zone : ''}`.trim() || null },
        h('td', {}, String(r.rank)), h('th', { scope: 'row' }, h('span', { class: 'ret-initial', 'aria-hidden': 'true' }, r.name[0]), ' ', r.you ? 'You' : r.name),
        h('td', {}, `${r.xp} XP`), h('td', {}, zone === 'up' ? 'Moves up' : zone === 'down' ? 'Moves down' : ''));
    });
    kids.push(h('table', { class: 'ret-table' }, h('caption', {}, `${v.tier.en} league, 30 players. You are number ${v.you.rank}.`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Rank'), h('th', { scope: 'col' }, 'Player'), h('th', { scope: 'col' }, 'XP'), h('th', { scope: 'col' }, 'This week'))), h('tbody', {}, ...rows)));
    kids.push(h('p', { class: 'muted' }, `Moving up pays ${gemsText(50)}; first place pays ${gemsText(100)}. No results change between Friday evening and Saturday night.`));
    setKids(body, ...kids);
  }
  root.replaceChildren(h('div', { class: 'stack ret-league alef-retention' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'League'), body));
  const on = () => { try { draw(); } catch { /* keep the last drawing */ } };
  document.addEventListener('alef:retention', on); draw();
  return () => document.removeEventListener('alef:retention', on);
}
