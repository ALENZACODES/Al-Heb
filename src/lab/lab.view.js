// Brain Lab (#/lab, #/lab/:game). Daily three-drill workout, ten short timed drills that adjust to you, five skill scores.
import { h, heSpan, coin } from '../shell/ui.js';
import { isAudioFree } from '../shell/audiofree.js';
import { sfx } from '../audio/sfx.js';
import { playRecordedClip, hasRecordedClip } from '../games/engine.js';
import {
  STORE_KEY, SESSION_SECONDS, SKILLS, GAMES, gameById, dayKey, dailyWorkout, step, trialPoints, startLevel, summarize,
  readState, recordSession, workoutProgress, workoutStreak, skillScore, overallScore, comparison, seeded,
} from './lab.core.js';
import { DRILLS } from './lab.games.js';

const GLYPH = { hunt: 'צ', matrix: 'מ', soundmatch: 'בָּ', siddurflash: 'שׁ', switch: 'כּ', gematria: 'א', countup: 'ג', numberear: 'ה', calendar: 'ל', pattern: 'כתב' };
const SKILL_COLOR = { speed: '#c9952c', memory: '#2f6b4f', attention: '#8a6d1f', flexibility: '#3d7457', problem: '#8a5f1c' };
// Text on a skill chip: dark on the light gold, cream on the rest (every pair at least 4.5:1).
const SKILL_INK = { speed: '#163527' };

const CSS = `
.lab{max-inline-size:44rem;margin-inline:auto}
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
.lab-skill{background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:14px;padding:.7rem .8rem;border-block-start:5px solid var(--sk)}
.lab-skill b{display:block;font-size:1.6rem;line-height:1.1;color:var(--fg,#1b2a20)}
.lab-skill small{color:var(--muted,#5d6b60)}
.lab-games{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.7rem;margin:.6rem 0 1.4rem}
.lab-game{display:flex;flex-direction:column;gap:.25rem;background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:14px;padding:.8rem .9rem;text-decoration:none;color:inherit;border-inline-start:6px solid var(--sk);min-block-size:48px}
.lab-game:hover{box-shadow:0 3px 12px #1e46341f}
.lab-game .t{font-weight:800;font-size:1.05rem}.lab-game .he{color:#8a6d1f}
.lab-game .m{font-size:.85rem;color:var(--muted,#5d6b60)}
.lab-spark{inline-size:100%;block-size:28px}
.lab-note{font-size:.85rem;color:var(--muted,#5d6b60)}
.lab-play{background:var(--card,#fffdf6);border:1px solid var(--border,#e2d6b8);border-radius:18px;padding:1rem;min-block-size:24rem;display:flex;flex-direction:column;gap:.7rem}
.lab-hud{display:flex;align-items:center;gap:.8rem;font-weight:700}
.lab-time{flex:1;block-size:10px;border-radius:99px;background:#e9e1cb;overflow:hidden}
.lab-time>span{display:block;block-size:100%;background:linear-gradient(90deg,#d4a647,#2f6b4f);transform-origin:left;transition:transform .2s linear}
.lab-lvl{font-size:.85rem;background:#1e4634;color:#fffaf0;border-radius:99px;padding:.2rem .6rem}
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
.lab-inline{font-size:1.6em;color:#1e4634;font-weight:700}.lab-inline-sm{font-size:1.15em;color:#1e4634}
.lab-val{font-size:.78rem;color:#6a5a2c;margin-block-start:.15rem}
.lab-badge{font-size:.8rem;font-weight:800;color:#2f6b4f}
.lab-digit{font-size:2rem;font-weight:800}
.lab-text{font-weight:700;font-size:1rem;text-align:center}
.lab-target{font-size:1.6rem;color:#1e4634}
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
.lab-feedback{min-block-size:1.4rem;text-align:center;color:#5d4a17;font-weight:600}
.lab-count{font-size:4rem;font-weight:800;color:#1e4634;text-align:center;margin:auto}
.lab-results{text-align:center}
.lab-results .score{font-size:3rem;font-weight:800;color:#1e4634;margin:.2rem 0}
.lab-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr));gap:.5rem;margin:1rem 0}
.lab-stats div{background:#fffaf0;border:1px solid #e2d6b8;border-radius:12px;padding:.5rem}
.lab-stats b{display:block;font-size:1.3rem}
.lab-actions{display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap;margin-block-start:.6rem}
.lab-intro .how{font-size:1.05rem}
@keyframes lab-shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@media (prefers-reduced-motion:reduce){.lab-cell,.lab-time>span{transition:none}.lab-cell.is-wrong{animation:none}}
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
  const wrap = h('div', { class: 'lab' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Brain Lab ', heSpan('מַעְבָּדָה', 'he')),
    h('p', { class: 'lab-sub' }, 'Short, fast drills that train your Hebrew eyes, ears and memory. Each one takes 45 seconds and gets harder as you get better.'),
    h('section', { class: 'lab-hero', 'aria-labelledby': 'lab-today' },
      h('h2', { id: 'lab-today' }, prog.complete ? 'Today’s workout is done' : 'Today’s Workout'),
      h('p', {}, prog.complete ? `Well done. Come back tomorrow for a new mix.${streak > 1 ? ` ${streak} days in a row.` : ''}` : `Three drills, about three minutes. ${prog.done.length} of 3 done.${streak > 0 ? ` Streak: ${streak} ${streak === 1 ? 'day' : 'days'}.` : ''}`),
      h('ol', { class: 'lab-plan' }, ...plan.map((id, i) => {
        const g = gameById(id), done = prog.done.includes(id);
        return h('li', { class: done ? 'done' : '' }, h('span', { class: 'dot', 'aria-hidden': 'true' }, done ? '✓' : String(i + 1)),
          coin(GLYPH[g.id] || 'א', 40), h('span', {}, h('span', { class: 'name' }, g.title), h('br'), h('span', { class: 'skill' }, skillOf(g.skill).name)),
          done ? h('span', { class: 'visually-hidden' }, ' (done)') : null);
      })),
      prog.complete ? h('a', { class: 'lab-go', href: `#/lab/${plan[0]}` }, 'Play again') : h('a', { class: 'lab-go', href: `#/lab/${next}?workout=1` }, prog.done.length ? 'Continue workout' : 'Start workout')),
    h('h2', {}, 'Your Skills'),
    h('p', { class: 'lab-note' }, overall == null ? 'Play any drill to see your first skill score.' : `Aleph brain score: ${overall}. Each skill score is your recent form in its drills, compared only with your own past games.`),
    h('div', { class: 'lab-skills' }, ...SKILLS.map((s) => {
      const v = skillScore(st, s.id);
      return h('div', { class: 'lab-skill', style: `--sk:${SKILL_COLOR[s.id]}` }, h('span', {}, s.name, ' ', heSpan(s.he, 'he lab-val')), h('b', {}, v == null ? '–' : String(v)), h('small', {}, s.blurb));
    })),
    h('h2', {}, 'All Drills'),
    h('div', { class: 'lab-games' }, ...GAMES.map((g) => {
      const gs = st.games[g.id];
      return h('a', { class: 'lab-game', href: `#/lab/${g.id}`, style: `--sk:${SKILL_COLOR[g.skill]}` },
        coin(GLYPH[g.id] || 'א', 56),
        h('span', { class: 't' }, g.title, ' ', heSpan(g.titleHe, 'he')),
        h('span', { class: 'm' }, `${skillOf(g.skill).name} · ${gs ? `best ${gs.best} · level ${gs.lastMax}` : 'not played yet'}`),
        h('span', { class: 'm' }, g.blurb),
        gs ? spark(gs.history.map((x) => x.s)) : null);
    })));
  root.replaceChildren(wrap);
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
  const onKey = (e) => { if (keyHandler && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); keyHandler(e.key); } };
  document.addEventListener('keydown', onKey);
  const wrap = h('div', { class: 'lab' });
  root.replaceChildren(wrap);
  const back = h('p', {}, h('a', { href: '#/lab' }, '← Brain Lab'));

  // Number drills play word recordings, which the app fetches the first time a word clip is asked about. Ask on the intro
  // screen, before the learner has touched anything, so the list is ready when the drill starts.
  if ((id === 'numberear' || id === 'countup') && !isAudioFree(ctx)) { try { ctx.audio?.status?.('word', 'numbers-01-m'); } catch { /* optional */ } }
  const intro = () => {
    const st = S.get(), gs = st.games[id];
    const plan = dailyWorkout(dayKey(), st), pos = plan.indexOf(id);
    const start = h('button', { type: 'button', class: 'lab-go', onclick: () => countdown() }, 'Start');
    wrap.replaceChildren(back,
      h('div', { class: 'lab-play lab-intro' },
        h('h1', { id: 'view-title', tabindex: '-1' }, game.title, ' ', heSpan(game.titleHe, 'he')),
        h('p', {}, h('span', { class: 'lab-lvl', style: `background:${SKILL_COLOR[game.skill]};color:${SKILL_INK[game.skill] || '#fffaf0'}` }, skillOf(game.skill).name), workout && pos >= 0 ? `  Workout drill ${pos + 1} of 3` : ''),
        h('p', { class: 'how' }, game.blurb),
        h('p', { class: 'lab-note' }, `${globalThis.document?.documentElement?.hasAttribute?.('data-calm') ? 'Ten rounds, no clock (calm mode is on).' : `${SESSION_SECONDS} seconds.`} Two right in a row takes you up a level; a miss takes you down one.${gs ? ` Your best: ${gs.best}. You start at level ${startLevel(gs)}.` : ''}`),
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
    catch { wrap.replaceChildren(back, h('div', { class: 'lab-play' }, h('p', { role: 'alert' }, 'This drill could not load its words. Check your connection, then try again.'), h('button', { type: 'button', class: 'btn', onclick: () => intro() }, 'Try again'))); return; }
    if (!alive) return;
    const timeBar = h('span'), scoreEl = h('span', { 'aria-live': 'off' }, '0'), lvlEl = h('span', { class: 'lab-lvl' }, '');
    const prompt = h('div', { class: 'lab-prompt', 'aria-live': 'polite' });
    const trialBar = h('div', { class: 'lab-trialbar', hidden: true });
    const board = h('div', { class: 'lab-board' });
    const feedback = h('p', { class: 'lab-feedback', 'aria-live': 'polite' });
    wrap.replaceChildren(back, h('div', { class: 'lab-play' },
      h('div', { class: 'lab-hud' }, h('div', { class: 'lab-time', role: 'progressbar', 'aria-label': 'Time left', 'aria-valuemin': '0', 'aria-valuemax': String(SESSION_SECONDS) }, timeBar), lvlEl, h('span', {}, 'Score ', scoreEl)),
      prompt, trialBar, board, feedback));
    const rnd = seeded(`${id}:${Date.now()}`);
    const audioOn = !isAudioFree(ctx);
    // Calm mode (Settings > Accessibility): no clocks at all. Rounds wait for you and the drill ends after ten rounds.
    const calm = !!globalThis.document?.documentElement?.hasAttribute?.('data-calm');
    const CALM_ROUNDS = 10;
    let ladder = { level: startLevel(gs), streak: 0 }, score = 0, over = false;
    const trials = [];
    // Timers a round sets (its time limit, its flashing words) belong to that round and are cleared when it ends.
    const roundTimers = new Set();
    const roundLater = (fn, ms) => { const t = later(() => { roundTimers.delete(t); fn(); }, ms); roundTimers.add(t); return t; };
    const endRound = () => { for (const t of roundTimers) { clearTimeout(t); timers.delete(t); } roundTimers.clear(); };
    const env = {
      h, heSpan, ctx, rnd, data, board, memo: {},
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
      try { sfx.play(r.ok ? (ladder.level > before ? 'streak' : 'success') : 'error_soft'); } catch { /* sound is optional */ }
      if (r.ok) feedback.textContent = ladder.level > before ? `Level ${ladder.level}!` : `+${pts}`;
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
      results(sum, prevGame, isBest, nextState, day);
    };
    next();
  };

  const results = (sum, prevGame, isBest, st, day) => {
    const plan = dailyWorkout(day, st), prog = workoutProgress(st, day, plan);
    const nextId = workout ? plan.find((g) => !prog.done.includes(g)) : null;
    const again = h('button', { type: 'button', class: 'btn secondary', onclick: () => intro() }, 'Play again');
    const primary = nextId ? h('a', { class: 'lab-go', href: `#/lab/${nextId}?workout=1` }, `Next: ${gameById(nextId).title}`)
      : h('a', { class: 'lab-go', href: '#/lab' }, workout && prog.complete ? 'Workout done: see your skills' : 'Back to Brain Lab');
    wrap.replaceChildren(back, h('div', { class: 'lab-play lab-results' },
      h('h1', { id: 'view-title', tabindex: '-1' }, game.title),
      h('p', { class: 'score' }, String(sum.score)),
      h('p', {}, isBest && sum.score > 0 ? (prevGame ? 'A new best score!' : 'Your first score in this drill.') : `Best: ${prevGame?.best ?? sum.score}`),
      h('div', { class: 'lab-stats' },
        h('div', {}, h('b', {}, `${sum.accuracy}%`), 'right'),
        h('div', {}, h('b', {}, String(sum.maxLevel)), 'top level'),
        h('div', {}, h('b', {}, sum.avgMs == null ? '–' : `${(sum.avgMs / 1000).toFixed(1)}s`), 'per answer'),
        h('div', {}, h('b', {}, `${sum.correct}/${sum.trials}`), 'rounds')),
      h('p', { class: 'lab-note' }, comparison(prevGame?.history, sum)),
      h('div', { class: 'lab-actions' }, primary, again)));
    primary.focus();
  };

  if (!game || !impl) { wrap.replaceChildren(back, h('h1', { id: 'view-title', tabindex: '-1' }, 'Drill Not Found'), h('p', {}, h('a', { href: '#/lab' }, 'See all the drills'))); }
  else intro();
  return () => { alive = false; clearAll(); document.removeEventListener('keydown', onKey); };
}

export function mount(root, ctx) {
  style(globalThis.document);
  const id = ctx.params?.game || ctx.query?.game;
  return id ? drill(root, ctx, id) : hub(root, ctx);
}
