// Brain Lab (#/lab, #/lab/:game). Daily three-drill workout, sixteen short timed drills that adjust to you, five skill scores.
import { h, heSpan } from '../shell/ui.js';
import { isAudioFree } from '../shell/audiofree.js';
import { untimedOn, shortcutsOn } from '../shell/motor.js';
import { signalRimon } from '../shell/rimon-events.js';
import { sfx } from '../audio/sfx.js';
import { playRecordedClip, hasRecordedClip } from '../games/engine.js';
import {
  STORE_KEY, SESSION_SECONDS, SKILLS, GAMES, gameById, dayKey, dailyWorkout, step, trialPoints, startLevel, summarize,
  readState, recordSession, workoutProgress, workoutStreak, skillScore, overallScore, comparison, seeded,
  GLYPHS, isNewGame, normTradition, starsFor, uniqueMet,
} from './lab.core.js';
import { DRILLS as FIRST_TEN } from './lab.games.js';
import { NEW_DRILLS } from './lab.games2.js';

const DRILLS = Object.freeze({ ...FIRST_TEN, ...NEW_DRILLS });
/** Games whose ordered in-game picture is a mat behind the whole board (the others place theirs inside the round). */
const BOARD_MATS = new Set(['hunt', 'countup', 'calendar', 'pattern']);
/** Pictures ordered for Brain Lab (docs/images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md and the first ten games' orders): shown only once ingested and approved. */
const art = (ctx, id, cls, width) => { try { return ctx.img?.(h, { kind: 'id', id, class: cls, width, decorative: true }) || null; } catch { return null; } };
/** The round token beside a game: its approved picture, or its letter on a green-and-gold disc. */
const token = (ctx, g) => {
  const glyph = GLYPHS[g.id] || 'א', letters = glyph.replace(/[\u0591-\u05C7]/g, '').length;
  return art(ctx, `LAB_v2_${g.id}`, 'lab-token', 112) || h('span', { class: `lab-token lab-token-glyph${letters >= 5 ? ' is-longer' : letters >= 3 ? ' is-long' : ''}`, 'aria-hidden': 'true' }, heSpan(glyph, 'he'));
};
/** Rimon reacts to a Brain Lab moment; the companion decides whether it shows (dismissed, reduced motion). */
const rimon = (action, moment, game) => { try { signalRimon(action, { moment: `lab.${moment}`, game }); } catch { /* optional */ } };
/**
 * Rimon on the results card, drawn from his own approved sprite sheets (assets/img/rimon/<action>.png, 4 x 3 frames): one still
 * frame at the height of the gesture. Shown until the game's own results picture (LAB_v2_<game>_win) is approved.
 */
const RIMON_POSE = { highfive: ['highfive', 7, 'Rimon gives you a high five'], laugh: ['laugh', 7, 'Rimon laughs with joy'], wink: ['wink', 6, 'Rimon winks: well played'], nervous: ['nervous', 5, 'Rimon: you can do it'] };
const rimonStill = (pose) => {
  const [sheet, frame, label] = RIMON_POSE[pose] || RIMON_POSE.wink;
  return h('span', { class: 'lab-rimon', role: 'img', 'aria-label': label,
    style: `background-image:url("assets/img/rimon/${sheet}.png");background-position:${(frame % 4) * 100 / 3}% ${Math.floor(frame / 4) * 50}%` });
};
let wavedThisVisit = false; // Rimon waves when Brain Lab first opens, not every time you come back to the list
const tradOf = (ctx) => normTradition(typeof ctx.settings?.get === 'function' ? ctx.settings.get('congregation') : ctx.settings?.congregation);

const SKILL_COLOR = { speed: '#c9952c', memory: '#2f6b4f', attention: '#8a6d1f', flexibility: '#3d7457', problem: '#8a5f1c' };
// Text on a skill chip: dark on the light gold, cream on the rest (every pair at least 4.5:1).
const SKILL_INK = { speed: '#163527' };

const CSS = `
.lab{max-inline-size:44rem;margin-inline:auto;--lab-accent:var(--accent,#1e4634);--lab-gold:#75591a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="contrast"]) .lab{--lab-gold:#e2cd8f}}
:root[data-theme="dark"] .lab,:root[data-theme="contrast-dark"] .lab{--lab-gold:#e2cd8f}
/* Light "paper" tiles keep dark ink in every theme; text straight on the page card follows the theme. */
.lab-cell,.lab-stats div,.lab-met li,.lab-ticket,.lab-flash,.lab-chain,.lab-flank,.lab-twin,.lab-drop,.lab-slots li,.lab-rule,.lab-card,.lab-sky{color:#1b2a20}
.lab-met li .en,.lab-cell .lab-val,.lab-ticket .lab-val{color:#5d4a2a}
.lab h1{margin-block:.2em .3em}
.lab-sub{color:var(--muted,#5d6b60);margin-block:0 1rem}
.lab-hero{background:linear-gradient(160deg,#1e4634,#163527);color:#fffaf0;border-radius:18px;padding:1.1rem 1.2rem;border:2px solid #d4a647;box-shadow:0 6px 18px #10281826}
.lab-hero h2{margin:0 0 .3rem;color:#f2d27c;font-size:1.25rem}
.lab-hero p{margin:.2rem 0 .8rem}
.lab-plan{display:grid;gap:.5rem;margin:.6rem 0 1rem;padding:0;list-style:none}
.lab-plan li{display:flex;align-items:center;gap:.7rem;background:#ffffff14;border-radius:12px;padding:.55rem .7rem}
.lab-plan .dot{inline-size:1.6rem;block-size:1.6rem;border-radius:50%;border:2px solid #d4a647;display:grid;place-items:center;font-weight:800;flex:none}
.lab-plan li.done .dot{background:#d4a647;color:#163527}
.lab-plan .name{font-weight:700}.lab-plan .skill{font-size:.8rem;opacity:.85}
.lab-go{display:inline-flex;min-block-size:52px;align-items:center;justify-content:center;padding:.6rem 1.4rem;border-radius:999px;background:#e9c46a;color:#163527;font-weight:800;text-decoration:none;border:0;box-shadow:0 3px 0 #b38a2e;font-size:1.05rem}
.lab-go:focus-visible{outline:3px solid #fffaf0;outline-offset:3px}
.lab-skills{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.6rem;margin:1.2rem 0}
.lab-skill{background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:14px;padding:.5rem .7rem;border-block-start:5px solid var(--sk)}
.lab-skill b{display:block;font-size:1.4rem;line-height:1.1;color:var(--fg,#1b2a20)}
.lab-skill small{color:var(--muted,#5d6b60);display:block;font-size:.8rem;line-height:1.3}
.lab-games{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.7rem;margin:.6rem 0 1.4rem}
.lab-game{display:flex;flex-direction:column;gap:.25rem;background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:14px;padding:.8rem .9rem;text-decoration:none;color:inherit;border-inline-start:6px solid var(--sk);min-block-size:48px}
.lab-game:hover{box-shadow:0 3px 12px #1e46341f}
.lab-game .t{font-weight:800;font-size:1.05rem}.lab-game .he{color:var(--lab-gold)}
.lab-game .m{font-size:.85rem;color:var(--muted,#5d6b60)}
.lab-spark{inline-size:100%;block-size:28px}
.lab-note{font-size:.85rem;color:var(--muted,#5d6b60)}
.lab-play{background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:18px;padding:1rem;min-block-size:24rem;display:flex;flex-direction:column;gap:.7rem}
.lab-hud{display:flex;align-items:center;gap:.8rem;font-weight:700}
.lab-time{flex:1;block-size:10px;border-radius:99px;background:#e9e1cb;overflow:hidden}
.lab-time>span{display:block;block-size:100%;background:linear-gradient(90deg,#d4a647,#2f6b4f);transform-origin:left;transition:transform .2s linear}
.lab-lvl{font-size:.85rem;background:#1e4634;color:#fffaf0;border-radius:99px;padding:.2rem .6rem}
.lab-run{font-size:.8rem;color:var(--lab-gold);white-space:nowrap}.lab-run.is-on{color:#7a5a12}.lab-run.is-on{background:#f6e6b8;border:1px solid #d4a647;border-radius:99px;padding:.1rem .5rem}
.lab-prompt{font-size:1.15rem;font-weight:600;min-block-size:3.2rem;display:flex;align-items:center;justify-content:center;text-align:center;gap:.4rem;flex-wrap:wrap}
.lab-board{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem}
.lab-trialbar{block-size:4px;border-radius:99px;background:#d4a647;transform-origin:left;inline-size:100%}
.lab-grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:.5rem;inline-size:min(100%,26rem)}
.lab-cell{aspect-ratio:1;border-radius:14px;border:2px solid #d9cba5;background:#fffaf0;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font:inherit;color:#1b2a20;box-shadow:0 3px 0 #d9cba5;transition:transform .08s ease,background .15s}
.lab-cell:active{transform:translateY(2px);box-shadow:0 1px 0 #d9cba5}
.lab-cell.is-hidden{background:#1e4634;border-color:#1e4634;box-shadow:0 3px 0 #10281a}
.lab-cell.is-picked{background:#f6e6b8;border-color:#d4a647}
.lab-cell.is-right{background:#d8eedc;border-color:#2f6b4f}
.lab-cell.is-wrong{background:#f6d6cf;border-color:#a8442f;animation:lab-shake .3s}
.lab-cell.is-reveal{outline:3px dashed #2f6b4f;outline-offset:-6px;background:#eef7f0}
.lab-cell.lab-wide{aspect-ratio:auto;min-block-size:4.2rem;padding:.4rem}
.lab-cell.lab-wordcell{aspect-ratio:auto;min-block-size:5rem;padding:.3rem}
.lab-glyph{font-size:clamp(1.8rem,8vw,2.6rem);line-height:1.2}
.lab-huge{font-size:clamp(4rem,22vw,6.5rem)}
.lab-word{font-size:clamp(1.3rem,6vw,1.9rem);line-height:1.35}
.lab-inline{font-size:1.6em;color:var(--lab-accent);font-weight:700}.lab-inline-sm{font-size:1.15em;color:var(--lab-accent)}
.lab-val{font-size:.78rem;color:var(--lab-gold);margin-block-start:.15rem}
.lab-badge{font-size:.8rem;font-weight:800;color:#2f6b4f}
.lab-digit{font-size:2rem;font-weight:800}
.lab-text{font-weight:700;font-size:1rem;text-align:center}
.lab-target{font-size:1.6rem;color:var(--lab-accent)}
.lab-sum{font-weight:700;margin:0}
.lab-flash{min-block-size:7rem;display:grid;place-items:center;inline-size:100%;border-radius:16px;background:#fffaf0;border:2px solid #d9cba5}
.lab-flash .lab-word{font-size:clamp(2.2rem,10vw,3.4rem)}.lab-flash .lab-preview{color:#8a6d1f}
.lab-flash.is-wrong{border-color:#a8442f;background:#f6d6cf}
.lab-now{min-block-size:64px;min-inline-size:12rem;font-size:1.25rem}
.lab-row{display:flex;gap:1rem;justify-content:center}
.lab-yn{min-inline-size:8rem;min-block-size:56px;font-size:1.15rem}
.lab-card{border-radius:18px;padding:.5rem 2.2rem;border:4px solid}
.lab-card.rule-dot,.lab-rule.rule-dot{border-color:#d4a647;color:#7a5a12}
.lab-card.rule-fin,.lab-rule.rule-fin{border-color:#2f6b4f;color:#1e4634}
.lab-rule{border:3px solid;border-radius:99px;padding:.2rem .9rem;background:#fffaf0}
.lab-feedback{min-block-size:1.4rem;text-align:center;color:var(--lab-gold);font-weight:600}
.lab-count{font-size:4rem;font-weight:800;color:var(--lab-accent);text-align:center;margin:auto}
.lab-results{text-align:center}
.lab-results .score{font-size:3rem;font-weight:800;color:var(--lab-accent);margin:.2rem 0}
.lab-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr));gap:.5rem;margin:1rem 0}
.lab-stats div{background:#fffaf0;border:1px solid #e2d6b8;border-radius:12px;padding:.5rem}
.lab-stats b{display:block;font-size:1.3rem}
.lab-actions{display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap;margin-block-start:.6rem}
.lab-intro .how{font-size:1.05rem}
/* hub: tokens, New marks, skill groups */
.lab-hero-art{display:block;inline-size:100%;block-size:auto;aspect-ratio:3/1;object-fit:cover;border-radius:16px;margin-block-end:.8rem}
.lab-token{inline-size:56px;block-size:56px;border-radius:50%;flex:none;object-fit:cover}
.lab-token-glyph{display:grid;place-items:center;background:#1e4634;border:3px solid #d4a647;box-shadow:inset 0 0 0 3px #1e4634,inset 0 0 0 4px #e9c46a66;color:#f2d27c;font-weight:700;overflow:hidden}
.lab-token-glyph .he{font-size:1.35rem;line-height:1;white-space:nowrap;color:#f2d27c}
.lab-token-glyph.is-long .he{font-size:.95rem}.lab-token-glyph.is-longer .he{font-size:.78rem}
.lab-game{flex-direction:row;align-items:flex-start;gap:.75rem}
.lab-game .body{display:flex;flex-direction:column;gap:.2rem;min-inline-size:0;flex:1}
.lab-fresh{margin:0 0 1rem}
.lab-fresh h2{font-size:1.05rem;margin:0 0 .4rem}
.lab-fresh-row{display:flex;gap:.6rem;overflow-x:auto;padding-block-end:.4rem;scroll-snap-type:x mandatory}
.lab-fresh-card{flex:0 0 9.5rem;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:.3rem;text-align:center;background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:14px;padding:.7rem .5rem;text-decoration:none;color:inherit;min-block-size:48px}
.lab-fresh-card .t{font-weight:800}
.lab-fresh-card .lab-teaches{font-size:.78rem;line-height:1.3}
.lab-new{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:#a8442f;color:#fffaf0;border-radius:99px;padding:.05rem .5rem;margin-inline-start:.35rem;vertical-align:middle}
.lab-teaches{font-size:.85rem;color:var(--lab-accent);font-weight:600}
.lab-group{margin:1rem 0 .3rem;font-size:1.05rem;display:flex;align-items:center;gap:.5rem}
.lab-group::before{content:"";inline-size:.8rem;block-size:.8rem;border-radius:3px;background:var(--sk)}
.lab-plan .lab-token{inline-size:40px;block-size:40px}.lab-plan .lab-token-glyph .he{font-size:.95rem}
/* intro and results */
.lab-cover{display:block;inline-size:100%;block-size:auto;aspect-ratio:2/1;object-fit:cover;border-radius:14px}
.lab-win-art{display:block;inline-size:180px;block-size:180px;margin:0 auto;object-fit:contain}
.lab-rimon{display:block;inline-size:116px;block-size:116px;margin:0 auto -.5rem;background-size:400% 300%;background-repeat:no-repeat}
.lab-stars{font-size:2rem;letter-spacing:.2rem;color:var(--lab-gold);margin:0}
.lab-met{list-style:none;padding:0;margin:.6rem 0;display:grid;gap:.4rem;text-align:start}
.lab-met li{display:flex;align-items:center;gap:.6rem;background:#fffaf0;border:1px solid #e2d6b8;border-radius:12px;padding:.4rem .7rem}
.lab-met .he{font-size:1.35rem;line-height:1.3}
.lab-met .en{flex:1;color:var(--muted,#5d6b60);font-size:.9rem}
.lab-met button{min-block-size:40px;min-inline-size:40px}
/* Sound Twins */
.lab-twin-stage{display:flex;align-items:center;justify-content:center;gap:1.2rem;min-block-size:9rem}
.lab-twin{min-inline-size:8rem;min-block-size:8rem;display:grid;place-items:center;background:#fffaf0;border:3px solid #d4a647;border-radius:22px;box-shadow:0 4px 0 #d9cba5;transform:scale(.94);transition:transform .16s ease}
.lab-twin.is-in{transform:scale(1)}
.lab-twin-before{min-inline-size:3rem;text-align:center;color:#5d6b60}
.lab-twin-before:not(:empty){border:2px dashed #d9cba5;border-radius:14px;padding:.2rem .5rem;background:#fffaf0}
/* Vowel Rain */
.lab-sky{position:relative;inline-size:min(100%,22rem);block-size:clamp(9rem,32vh,13rem);border-radius:18px;background:linear-gradient(#e9f0ea,#fffaf0);border:2px solid #d9cba5;overflow:hidden}
.lab-drop{position:absolute;inset-inline-start:50%;inset-block-start:.3rem;translate:-50% 0;min-inline-size:4.2rem;min-block-size:4.2rem;display:grid;place-items:center;background:#fffaf0;border:3px solid #2f6b4f;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;box-shadow:0 3px 0 #1e4634}
.lab-drop.is-caught{border-color:#d4a647;background:#f6e6b8;transition:none!important}
.lab-drop.is-missed{border-color:#a8442f;background:#f6d6cf}
.lab-ground{position:absolute;inset-inline:0;inset-block-end:0;block-size:.8rem;background:#6b7f3a}
.lab-vowels{flex-wrap:nowrap;gap:.35rem}
.lab-vowel{min-inline-size:3rem;min-block-size:3.4rem;padding-inline:.2rem;flex:1 1 0;max-inline-size:4rem;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.3rem;line-height:1.1}
.lab-vowel-hint{font-size:1.35rem;font-weight:400;line-height:1.2}
/* Middle Letter */
.lab-flank{display:flex;gap:.15rem;justify-content:center;background:#fffaf0;border:2px solid #d9cba5;border-radius:16px;padding:.4rem .8rem}
.lab-flank .lab-glyph{font-size:clamp(2rem,9vw,2.8rem)}
.lab-flank .is-marked{border-block-end:4px solid #d4a647}
/* Taxi Turns */
.lab-road{position:relative;display:grid;grid-template-columns:repeat(3,1fr);inline-size:min(100%,24rem);min-block-size:11rem;background:#3d4a45;border-radius:16px;padding:.6rem;gap:.4rem;background-image:repeating-linear-gradient(90deg,transparent 0 calc(33.33% - 2px),#e9c46a calc(33.33% - 2px) 33.33%)}
.lab-lane{display:flex;align-items:flex-start;justify-content:center}
.lab-sign{display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.4rem .5rem;min-inline-size:5.5rem;text-align:center}
.lab-sign.sign-word{background:#e9c46a;color:#163527;border:3px solid #fffaf0;border-radius:999px}
.lab-sign.sign-side{background:#1e4634;color:#fffaf0;border:3px dashed #fffaf0;border-radius:6px}
.lab-sign .lab-val{color:inherit;opacity:.85}
.lab-cab{position:absolute;inset-block-end:.5rem;inset-inline-start:50%;translate:-50% 0;inline-size:2.4rem;block-size:3.2rem;background:#e9c46a;border:3px solid #163527;border-radius:10px 10px 6px 6px;transition:translate .35s ease}
.lab-road.go-left .lab-cab{translate:-190% -1.2rem}.lab-road.go-right .lab-cab{translate:90% -1.2rem}.lab-road.go-straight .lab-cab{translate:-50% -2.4rem}
.lab-rule.rule-word{border-color:#d4a647;color:#5d4a17;border-radius:999px}
.lab-rule.rule-side{border-color:#1e4634;color:#1e4634;border-style:dashed;border-radius:6px}
.lab-turns .btn{min-inline-size:6rem;min-block-size:56px;font-size:1.05rem;display:inline-flex;align-items:center;justify-content:center;gap:.4rem}
/* Café Order */
.lab-cafe{display:flex;flex-direction:column;align-items:center;gap:.4rem;inline-size:100%}
.lab-who{margin:0;font-weight:700;color:var(--lab-accent);display:flex;align-items:center;gap:.5rem}
.lab-face{inline-size:56px;block-size:56px;border-radius:50%;object-fit:cover;border:3px solid #d4a647;background:#fffaf0}
.lab-menu-pic{inline-size:56px;block-size:56px;object-fit:contain}
.lab-ticket{min-block-size:6.5rem;min-inline-size:12rem;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fffaf0;border:2px dashed #b38a2e;border-radius:12px;padding:.4rem 1rem}
.lab-order-he{font-size:clamp(1.8rem,8vw,2.4rem)}
.lab-slots{display:flex;gap:.4rem;list-style:none;padding:0;margin:0;flex-wrap:wrap;justify-content:center}
.lab-slots li{min-inline-size:2.4rem;min-block-size:2.2rem;display:grid;place-items:center;border-radius:10px;background:#f6e6b8;border:1px solid #d4a647;padding:0 .4rem;font-size:.9rem}
.lab-slots .he{font-size:1.15rem}
/* Prayer Chain */
.lab-chain{display:flex;flex-wrap:wrap;gap:.35rem .5rem;justify-content:center;font-size:clamp(1.4rem,6.5vw,1.9rem);line-height:1.5;margin:0;min-block-size:3.2rem;background:#fffaf0;border:2px solid #d9cba5;border-radius:14px;padding:.5rem .8rem;inline-size:100%}
.lab-link.is-given{color:#5d6b60}
.lab-link.is-right{color:#1e4634;font-weight:700}
.lab-link.is-name{color:#8a6d1f;font-weight:700}
.lab-link.is-next{color:#8a6d1f}
.lab-link.is-reveal{color:#a8442f;text-decoration:underline dotted}
.lab-chain-en{display:block;margin-block-start:.2rem;font-weight:400}
.lab-chain-opts{flex-wrap:wrap;gap:.5rem}
.lab-chain-opt{min-block-size:56px;min-inline-size:7rem;display:inline-flex;flex-direction:column;align-items:center;gap:0;line-height:1.2}
.lab-chain-opt .lab-val{font-size:.8rem;font-weight:400}
/* ordered board pictures (docs/images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md), shown once approved; never under high contrast */
.lab-has-art{background-size:cover;background-position:center}
.lab-board.lab-has-art{border-radius:14px;padding:.6rem}
.lab-side-pic{inline-size:56px;block-size:56px;object-fit:contain;vertical-align:middle}
.lab-grid .lab-cell.is-hidden{background-image:var(--lab-back,none);background-size:cover}
.lab-drop.lab-has-art,.lab-cab.lab-has-art{background-size:contain;background-repeat:no-repeat;background-color:transparent;border-color:transparent;box-shadow:none}
@media (prefers-contrast:more),(forced-colors:active){.lab-has-art,.lab-grid .lab-cell.is-hidden{background-image:none!important}}
:root[data-theme^="contrast"] .lab-has-art,:root[data-theme^="contrast"] .lab-grid .lab-cell.is-hidden{background-image:none!important}
@keyframes lab-shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@media (prefers-reduced-motion:reduce){.lab-cell,.lab-time>span,.lab-twin,.lab-cab{transition:none!important}.lab-cell.is-wrong{animation:none}}
`;
function style(doc) { if (doc && !doc.getElementById('lab-css')) { const s = doc.createElement('style'); s.id = 'lab-css'; s.textContent = CSS; doc.head.append(s); } }

const store = (ctx) => ({
  get: () => readState(ctx.store?.get?.(STORE_KEY)),
  set: (v) => { try { ctx.store?.set?.(STORE_KEY, v); } catch { /* storage blocked: the game still plays */ } },
});
const skillOf = (id) => SKILLS.find((s) => s.id === id);

function spark(values) {
  const v = values.slice(-12);
  if (v.length < 2) return null;
  const max = Math.max(...v, 1), min = Math.min(...v, 0), w = 120, hgt = 28;
  const pts = v.map((y, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${(hgt - 3 - ((y - min) / (max - min || 1)) * (hgt - 6)).toFixed(1)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`); svg.setAttribute('class', 'lab-spark'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('preserveAspectRatio', 'none');
  const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  pl.setAttribute('points', pts); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', '#2f6b4f'); pl.setAttribute('stroke-width', '2'); pl.setAttribute('stroke-linejoin', 'round');
  svg.append(pl); return svg;
}

// ------------------------------------------------------------------ Hub
function hub(root, ctx) {
  const st = store(ctx).get(), today = dayKey();
  const plan = dailyWorkout(today, st), prog = workoutProgress(st, today, plan), streak = workoutStreak(st, today);
  const next = plan.find((id) => !prog.done.includes(id));
  const overall = overallScore(st);
  const newOnes = GAMES.filter((g) => isNewGame(g, st));
  const tile = (g) => {
    const gs = st.games[g.id];
    return h('a', { class: 'lab-game', href: `#/lab/${g.id}`, style: `--sk:${SKILL_COLOR[g.skill]}` }, token(ctx, g),
      h('span', { class: 'body' },
        h('span', { class: 't' }, g.title, ' ', heSpan(g.titleHe, 'he'), isNewGame(g, st) ? h('span', { class: 'lab-new' }, 'New') : null),
        g.teaches ? h('span', { class: 'lab-teaches' }, g.teaches) : null,
        h('span', { class: 'm' }, gs ? `Best ${gs.best} · level ${gs.lastMax}` : g.blurb),
        gs ? spark(gs.history.map((x) => x.s)) : null));
  };
  const wrap = h('div', { class: 'lab' },
    (prog.complete && art(ctx, 'LAB_v2_workout_done', 'lab-hero-art', 1200)) || art(ctx, 'LAB_v2_hero', 'lab-hero-art', 1200),
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Brain Lab ', heSpan('מַעְבָּדָה', 'he')),
    h('p', { class: 'lab-sub' }, 'Short, fast games that train your Hebrew eyes, ears and memory. Each one takes 45 seconds and gets harder as you get better.'),
    newOnes.length ? h('section', { class: 'lab-fresh', 'aria-labelledby': 'lab-fresh-h' },
      h('h2', { id: 'lab-fresh-h' }, newOnes.length === 1 ? 'A New Game to Try' : `${newOnes.length} New Games to Try`),
      h('div', { class: 'lab-fresh-row' }, ...newOnes.map((g) => h('a', { class: 'lab-fresh-card', href: `#/lab/${g.id}` }, token(ctx, g), h('span', { class: 't' }, g.title), h('span', { class: 'lab-teaches' }, g.teaches))))) : null,
    h('section', { class: 'lab-hero', 'aria-labelledby': 'lab-today' },
      h('h2', { id: 'lab-today' }, prog.complete ? 'Today’s workout is done' : 'Today’s Workout'),
      h('p', {}, prog.complete ? `Well done. Come back tomorrow for a new mix.${streak > 1 ? ` ${streak} days in a row.` : ''}` : `Three games, about three minutes. ${prog.done.length} of 3 done.${streak > 0 ? ` Streak: ${streak} ${streak === 1 ? 'day' : 'days'}.` : ''}`),
      h('ol', { class: 'lab-plan' }, ...plan.map((id, i) => {
        const g = gameById(id), done = prog.done.includes(id);
        return h('li', { class: done ? 'done' : '' }, h('span', { class: 'dot', 'aria-hidden': 'true' }, done ? '✓' : String(i + 1)), token(ctx, g),
          h('span', {}, h('span', { class: 'name' }, g.title), h('br'), h('span', { class: 'skill' }, skillOf(g.skill).name)),
          done ? h('span', { class: 'visually-hidden' }, ' (done)') : null);
      })),
      prog.complete ? h('a', { class: 'lab-go', href: `#/lab/${plan[0]}` }, 'Play again') : h('a', { class: 'lab-go', href: `#/lab/${next}?workout=1` }, prog.done.length ? 'Continue workout' : 'Start workout')),
    h('h2', {}, 'Your Skills'),
    h('p', { class: 'lab-note' }, overall == null ? 'Play any game to see your first skill score.' : `Aleph brain score: ${overall}. Each skill score is your recent form in its games, compared only with your own past games.`),
    h('div', { class: 'lab-skills' }, ...SKILLS.map((s) => {
      const v = skillScore(st, s.id);
      return h('div', { class: 'lab-skill', style: `--sk:${SKILL_COLOR[s.id]}` }, h('span', {}, s.name, ' ', heSpan(s.he, 'he lab-val')), h('b', {}, v == null ? '–' : String(v)), h('small', {}, s.blurb));
    })),
    h('h2', {}, 'All Games'),
    ...SKILLS.flatMap((s) => [
      h('h3', { class: 'lab-group', style: `--sk:${SKILL_COLOR[s.id]}` }, s.name, ' ', heSpan(s.he, 'he lab-val')),
      h('div', { class: 'lab-games' }, ...GAMES.filter((g) => g.skill === s.id).map(tile))]));
  root.replaceChildren(wrap);
  if (!wavedThisVisit) { wavedThisVisit = true; rimon('wave', 'hub'); }
  return () => {};
}

// ------------------------------------------------------------------ One drill
function drill(root, ctx, id) {
  const game = gameById(id), impl = DRILLS[id];
  const workout = ctx.query?.workout === '1' || /[?&]workout=1/.test(globalThis.location?.hash || '');
  const S = store(ctx);
  let alive = true; const timers = new Set(); let keyHandler = null;
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; };
  const clearAll = () => { for (const t of timers) clearTimeout(t); timers.clear(); keyHandler = null; };
  // Arrow keys always answer (left/right, and up for straight on in Taxi Turns); single letters (a e i o u in Vowel Rain) only while
  // single-key shortcuts are on (Settings > Touch and movement).
  const onKey = (e) => {
    if (!keyHandler || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^Arrow(Left|Right|Up)$/.test(e.key) || (/^[a-z]$/i.test(e.key) && shortcutsOn(ctx))) { e.preventDefault(); keyHandler(e.key); }
  };
  // Calm mode and No time limits both take the clocks away: rounds wait for you and a game ends after ten rounds.
  const noClock = () => !!globalThis.document?.documentElement?.hasAttribute?.('data-calm') || untimedOn(ctx);
  document.addEventListener('keydown', onKey);
  const wrap = h('div', { class: 'lab' });
  root.replaceChildren(wrap);
  const back = h('p', {}, h('a', { href: '#/lab' }, '← Brain Lab'));

  // Number, café and taxi games play word recordings, which the app fetches the first time a word clip is asked about. Ask on the intro
  // screen, before the learner has touched anything, so the list is ready when the drill starts.
  if (['numberear', 'countup', 'cafe', 'taxi'].includes(id) && !isAudioFree(ctx)) { try { ctx.audio?.status?.('word', id === 'cafe' || id === 'taxi' ? 'directions-07' : 'numbers-01-m'); } catch { /* optional */ } }
  const intro = () => {
    const st = S.get(), gs = st.games[id];
    const plan = dailyWorkout(dayKey(), st), pos = plan.indexOf(id);
    const start = h('button', { type: 'button', class: 'lab-go', onclick: () => countdown() }, 'Start');
    wrap.replaceChildren(back,
      h('div', { class: 'lab-play lab-intro' },
        art(ctx, `LAB_v2_${id}_cover`, 'lab-cover', 900),
        h('h1', { id: 'view-title', tabindex: '-1' }, game.title, ' ', heSpan(game.titleHe, 'he')),
        h('p', {}, h('span', { class: 'lab-lvl', style: `background:${SKILL_COLOR[game.skill]};color:${SKILL_INK[game.skill] || '#fffaf0'}` }, skillOf(game.skill).name), workout && pos >= 0 ? `  Workout game ${pos + 1} of 3` : ''),
        game.teaches ? h('p', { class: 'lab-teaches' }, `You practise: ${game.teaches.charAt(0).toLowerCase()}${game.teaches.slice(1)}.`) : null,
        h('p', { class: 'how' }, game.blurb),
        h('p', { class: 'lab-note' }, `${noClock() ? 'Ten rounds, no clock (calm mode or No time limits is on).' : `${SESSION_SECONDS} seconds.`} Two right in a row takes you up a level; a miss takes you down one.${gs ? ` Your best: ${gs.best}. You start at level ${startLevel(gs)}.` : ''}`),
        h('div', { class: 'lab-actions' }, start)));
    start.focus();
  };

  const countdown = () => {
    const c = h('div', { class: 'lab-count', 'aria-live': 'assertive' }, '3');
    wrap.replaceChildren(back, h('div', { class: 'lab-play' }, c));
    let n = 3; const tick = () => { n--; if (n <= 0) play(); else { c.textContent = String(n); later(tick, 600); } };
    // load the drill's data during the countdown
    impl.load(env0).then((d) => { env0.data = d; }).catch(() => {});
    later(tick, 600);
  };

  const env0 = { ctx, data: null };

  const play = async () => {
    const st = S.get(), gs = st.games[id];
    let data;
    try { data = env0.data || await impl.load(env0); }
    catch { wrap.replaceChildren(back, h('div', { class: 'lab-play' }, h('p', { role: 'alert' }, 'This game could not load its words. Check your connection, then try again.'), h('button', { type: 'button', class: 'btn', onclick: () => intro() }, 'Try again'))); return; }
    if (!alive) return;
    const timeBar = h('span'), scoreEl = h('span', { 'aria-live': 'off' }, '0'), lvlEl = h('span', { class: 'lab-lvl' }, '');
    const runEl = h('span', { class: 'lab-run', 'aria-hidden': 'true' });
    let run = 0;
    const prompt = h('div', { class: 'lab-prompt', 'aria-live': 'polite' });
    const trialBar = h('div', { class: 'lab-trialbar', hidden: true });
    const board = h('div', { class: 'lab-board' });
    const feedback = h('p', { class: 'lab-feedback', 'aria-live': 'polite' });
    wrap.replaceChildren(back, h('div', { class: 'lab-play' },
      h('div', { class: 'lab-hud' }, h('div', { class: 'lab-time', role: 'progressbar', 'aria-label': 'Time left', 'aria-valuemin': '0', 'aria-valuemax': String(SESSION_SECONDS) }, timeBar), lvlEl, runEl, h('span', {}, 'Score ', scoreEl)),
      prompt, trialBar, board, feedback));
    const rnd = seeded(`${id}:${Date.now()}`);
    const audioOn = !isAudioFree(ctx);
    // Calm mode and No time limits (Settings > Accessibility): no clocks at all. Rounds wait for you and the game ends after ten rounds.
    const calm = noClock();
    const reduceMotion = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const met = [];
    const CALM_ROUNDS = 10;
    let ladder = { level: startLevel(gs), streak: 0 }, score = 0, over = false;
    const trials = [];
    // Timers a round sets (its time limit, its flashing words) belong to that round and are cleared when it ends.
    const roundTimers = new Set();
    const roundLater = (fn, ms) => { const t = later(() => { roundTimers.delete(t); fn(); }, ms); roundTimers.add(t); return t; };
    const endRound = () => { for (const t of roundTimers) { clearTimeout(t); timers.delete(t); } roundTimers.clear(); };
    const env = {
      h, heSpan, ctx, rnd, data, board, memo: {},
      tradition: tradOf(ctx), calm: calm || reduceMotion,
      // An approved picture from the shared image resolver, or null (the game then shows text only).
      img: (kind, imgId, cls, width) => { try { return ctx.img?.(h, { kind, id: imgId, class: cls, width, decorative: true }) || null; } catch { return null; } },
      // The file of an approved picture, for a board backdrop (CSS background); null when it is not in the app yet.
      artSrc: (imgId, width) => { try { return ctx.images?.resolve?.('id', imgId, { width })?.src || null; } catch { return null; } },
      backdrop: (el, imgId, width = 900) => { const src = env.artSrc(imgId, width); if (src && el) { el.style.backgroundImage = `url("${src}")`; el.classList.add('lab-has-art'); } return el; },
      met: (item) => { if (item?.he) met.push(item); },
      rimon: (action) => rimon(action, 'round', id),
      now: () => (globalThis.performance?.now?.() ?? Date.now()),
      prompt: (x) => { prompt.replaceChildren(x); },
      say: (t) => { feedback.textContent = t; },
      later: roundLater,
      keys: (fn) => { keyHandler = fn; },
      timeLimit: (ms, fn) => {
        if (calm) return;
        trialBar.hidden = false; trialBar.style.transition = 'none'; trialBar.style.transform = 'scaleX(1)';
        requestAnimationFrame(() => { trialBar.style.transition = `transform ${ms}ms linear`; trialBar.style.transform = 'scaleX(0)'; });
        roundLater(() => { feedback.textContent = 'Out of time.'; fn(); }, ms);
      },
      hasClip: (kind, cid) => audioOn && hasRecordedClip(ctx, kind, cid),
      playClip: (kind, cid, text) => (audioOn ? playRecordedClip(ctx, kind, cid, { text }) : Promise.resolve(false)),
      sayWord: (w) => (audioOn && (w?.clip || w?.id) ? playRecordedClip(ctx, 'word', w.clip || w.id, { text: w.he }) : Promise.resolve(false)),
    };
    if (BOARD_MATS.has(id)) env.backdrop(board, `LAB_v2_${id}_play`, 900);
    const t0 = Date.now(), total = SESSION_SECONDS * 1000;
    const clock = setInterval(() => {
      if (calm) { timeBar.style.transform = `scaleX(${1 - trials.length / CALM_ROUNDS})`; return; }
      const left = Math.max(0, total - (Date.now() - t0));
      timeBar.style.transform = `scaleX(${left / total})`;
      if (left <= 0 && !over) { over = true; clearInterval(clock); finish(); }
    }, 200);
    timers.add(clock);
    const next = async () => {
      if (over || !alive) return;
      lvlEl.textContent = `Level ${ladder.level}`;
      trialBar.hidden = true; keyHandler = null;
      const level = ladder.level;
      feedback.textContent = '';
      const r = await impl.trial(env, level);
      endRound();
      if (over || !alive) return;
      keyHandler = null;
      const pts = trialPoints(r.ok, level, r.ms, r.par || 1500);
      score += pts; scoreEl.textContent = String(score);
      trials.push({ ok: r.ok, ms: r.ms, level, pts });
      const before = ladder.level; ladder = step(ladder, r.ok);
      // A run of right answers shows beside the level from three in a row; it does not change the score.
      run = r.ok ? run + 1 : 0; runEl.textContent = run >= 3 ? `${run} in a row` : ''; runEl.classList.toggle('is-on', run >= 3);
      try { sfx.play(r.ok ? (ladder.level > before ? 'streak' : 'success') : 'error_soft'); } catch { /* sound is optional */ }
      if (r.ok) feedback.textContent = ladder.level > before ? `Level ${ladder.level}!` : `+${pts}`;
      if (r.ok && ladder.level > before && ladder.level % 2 === 0) rimon('bounce', 'levelup', id);
      if (calm && trials.length >= CALM_ROUNDS) { over = true; finish(); return; }
      later(next, r.ok ? 380 : 1100);
    };
    const finish = () => {
      clearInterval(clock); clearAll();
      const sum = summarize(trials), day = dayKey();
      const prev = S.get(), prevGame = prev.games[id];
      const isBest = !prevGame || sum.score > (prevGame.best || 0);
      const nextState = recordSession(prev, id, sum, day);
      S.set(nextState);
      if (isBest && sum.score > 0) { try { sfx.play('streak'); } catch { /* optional */ } }
      results(sum, prevGame, isBest, nextState, day, uniqueMet(met));
    };
    next();
  };

  const results = (sum, prevGame, isBest, st, day, metList = []) => {
    const plan = dailyWorkout(day, st), prog = workoutProgress(st, day, plan);
    const nextId = workout ? plan.find((g) => !prog.done.includes(g)) : null;
    const stars = starsFor(sum);
    const pose = workout && prog.complete ? 'laugh' : isBest && sum.score > 0 ? 'highfive' : stars >= 2 ? 'wink' : 'nervous';
    rimon(pose, workout && prog.complete ? 'workout-done' : 'results', id);
    const audioOn = !isAudioFree(ctx);
    const listen = (it) => (audioOn && it.clip && hasRecordedClip(ctx, it.clip.kind, it.clip.id)
      ? h('button', { type: 'button', class: 'btn secondary', 'aria-label': `Hear ${it.en}`, onclick: () => playRecordedClip(ctx, it.clip.kind, it.clip.id, { text: it.he }) }, '▶') : null);
    const again = h('button', { type: 'button', class: 'btn secondary', onclick: () => intro() }, 'Play again');
    const primary = nextId ? h('a', { class: 'lab-go', href: `#/lab/${nextId}?workout=1` }, `Next: ${gameById(nextId).title}`)
      : h('a', { class: 'lab-go', href: '#/lab' }, workout && prog.complete ? 'Workout done: see your skills' : 'Back to Brain Lab');
    wrap.replaceChildren(back, h('div', { class: 'lab-play lab-results' },
      art(ctx, `LAB_v2_${id}_win`, 'lab-win-art', 360) || rimonStill(pose),
      h('h1', { id: 'view-title', tabindex: '-1' }, game.title),
      h('p', { class: 'lab-stars', role: 'img', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('p', { class: 'score' }, String(sum.score)),
      h('p', {}, isBest && sum.score > 0 && prevGame ? art(ctx, 'LAB_v2_new_best', 'lab-side-pic', 200) : null, isBest && sum.score > 0 ? (prevGame ? 'A new best score!' : 'Your first score in this game.') : `Best: ${prevGame?.best ?? sum.score}`),
      h('div', { class: 'lab-actions' }, primary, again),
      h('div', { class: 'lab-stats' },
        h('div', {}, h('b', {}, `${sum.accuracy}%`), 'right'),
        h('div', {}, h('b', {}, String(sum.maxLevel)), 'top level'),
        h('div', {}, h('b', {}, sum.avgMs == null ? '–' : `${(sum.avgMs / 1000).toFixed(1)}s`), 'per answer'),
        h('div', {}, h('b', {}, `${sum.correct}/${sum.trials}`), 'rounds')),
      h('p', { class: 'lab-note' }, comparison(prevGame?.history, sum)),
      metList.length ? h('section', { 'aria-labelledby': 'lab-met-h' },
        h('h2', { id: 'lab-met-h', class: 'lab-group', style: `--sk:${SKILL_COLOR[game.skill]}` }, 'Hebrew You Met'),
        h('ul', { class: 'lab-met' }, ...metList.map((it) => h('li', {}, heSpan(it.he, 'he'), h('span', { class: 'en' }, it.en), listen(it))))) : null));
    primary.focus();
  };

  if (!game || !impl) { wrap.replaceChildren(back, h('h1', { id: 'view-title', tabindex: '-1' }, 'Game Not Found'), h('p', {}, h('a', { href: '#/lab' }, 'See all the games'))); }
  else intro();
  return () => { alive = false; clearAll(); document.removeEventListener('keydown', onKey); };
}

export function mount(root, ctx) {
  style(globalThis.document);
  const id = ctx.params?.game || ctx.query?.game;
  return id ? drill(root, ctx, id) : hub(root, ctx);
}
