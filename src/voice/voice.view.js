// Speaking Studio (#/speak-studio): record a service line and compare it with the model clip (waveforms side by side), shadow it
// with a timed silent turn, rate yourself, see the machine's guess, a daily gym from your own ratings, words per minute by week,
// your speaking days, and a voice journal kept on this device. CODER-100 G1, G2, G3, G5, G6, G8, G9, G10.
// Nothing here scores the learner's pronunciation: ratings are self-assessment, the recognizer's text is "a machine guess, not a grade",
// fluency is speed plus self-reported stumbles. Recordings stay in this browser (memory, or IndexedDB when kept in the journal).
// mount(root, ctx) -> unmount. ctx extras for tests: ctx.voiceStudio = {recorder, recognizer, journal, decode, makeAudio, setTimeout, clearTimeout, clock}.
import { h, heSpan, audioButton } from '../shell/ui.js';
import { audioAccess } from '../shell/audio-access.js';
import { isAudioFree, AUDIO_FREE_NOTE } from '../shell/audiofree.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { showName } from '../games/tg-core.js';
import { loadCorpus } from '../corpus/corpus.js';
import { loadServiceData, ORDER_IDS } from '../service/model.js';
import { serviceLines } from '../service/practice.model.js';
import { createRecorder, createRecognizer } from '../speak/recognizer.js';
import { KEY as TIMED_KEY } from '../timedread/model.js';
import { openJournal } from './journal.js';
import {
  STORE_KEY, AXES, RATING, SELF_LABEL, MACHINE_NOTE, FLUENCY_NOTE, GAP_FACTORS, GOAL_DAYS, normalizeState, addRating, addRecordingDay, setGoal,
  ratingsByWeek, weakestAxis, gymSet, turnMs, peaks, machineSentence, fluencyByWeek, speakingDays, speakingStreak, weekGoal, journalSeries,
  journalPassages, dayKey,
} from './voice.model.js';

const CSS = `
.vs { display: grid; gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.vs h2 { margin-block: .25rem; font-size: 1.2rem; }
.vs h3 { margin-block: .5rem .25rem; font-size: 1.05rem; }
.vs .vs-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.vs .btn { min-block-size: var(--tap, 48px); }
.vs .btn[aria-pressed=true] { background: var(--accent); color: var(--accent-fg); }
.vs .vs-he { font-size: 2rem; line-height: 1.8; unicode-bidi: isolate; margin: .25rem 0; }
.vs .vs-waves { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: .75rem; }
.vs .vs-wave svg { inline-size: 100%; block-size: 64px; display: block; }
.vs .vs-wave rect { fill: currentColor; }
.vs .vs-turn { font-size: 1.4rem; font-weight: 700; }
.vs table { border-collapse: collapse; inline-size: 100%; }
.vs th, .vs td { text-align: start; padding: .25rem .4rem; border-block-end: 1px solid var(--border); }
.vs ul { padding-inline-start: 1.25rem; margin: 0; }
.vs .small { font-size: .9rem; }
`;
const TABS = [['compare', 'Record and Compare'], ['shadow', 'Shadowing'], ['gym', 'Pronunciation Gym'], ['fluency', 'Fluency'], ['streak', 'Speaking Days'], ['journal', 'Voice Journal']];
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => {
  const d = globalThis.document;
  const e = typeof d?.createElementNS === 'function' ? d.createElementNS(SVG_NS, tag) : d.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v));
  for (const k of kids) if (k != null) e.append(k);
  return e;
};
const ERR = {
  unsupported: 'This browser cannot record from the microphone here.', 'not-allowed': 'The microphone was blocked. Allow it for this site, then try again.',
  'audio-capture': 'No microphone was found.', 'no-data': 'Nothing was recorded. Try again.', 'start-failed': 'Recording did not start. Try again.', 'stop-failed': 'Recording did not stop cleanly. Try again.',
};

/** Decode an audio source (URL on this origin, or a Blob) into mono samples with the browser's Web Audio API. Null when it cannot. */
async function decodeDefault(src) {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    const buf = typeof src === 'string' ? await (await fetch(src)).arrayBuffer() : await src.arrayBuffer();
    const ac = new AC();
    try { const audio = await ac.decodeAudioData(buf); return audio.getChannelData(0); } finally { try { ac.close?.(); } catch { /* ignore */ } }
  } catch { return null; }
}

export async function mount(root, ctx) {
  let alive = true;
  const inj = ctx?.voiceStudio || {};
  const { store } = ctx;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'vs' });
  const title = () => h('h1', { id: 'view-title', tabindex: '-1' }, 'Speaking Studio');
  root.replaceChildren(style, title(), h('p', { class: 'muted', role: 'status' }, 'Loading...'), main);
  let S;
  try { S = await loadServiceData({ loadCorpus }); } catch {
    if (alive) root.replaceChildren(style, title(), h('p', {}, 'The Speaking Studio could not load the prayer lines. Your learning is not affected.'));
    return () => { alive = false; };
  }
  if (!alive) return () => {};
  root.replaceChildren(style, title(), main);

  const tradition = congregationOf(ctx.settings);
  const recorder = inj.recorder || createRecorder({ maxMs: 20000 });
  const recognizer = inj.recognizer || createRecognizer();
  const journal = inj.journal || openJournal();
  const decode = inj.decode || decodeDefault;
  const makeAudio = inj.makeAudio || ((url) => (typeof Audio === 'function' ? new Audio(url) : null));
  const setT = inj.setTimeout || ((f, ms) => setTimeout(f, ms)), clearT = inj.clearTimeout || ((x) => clearTimeout(x));
  const clock = inj.clock || (() => Date.now());
  const get = (k, d) => { try { return store.get(k, d) ?? d; } catch { return d; } };
  let state = normalizeState(get(STORE_KEY, null));
  const save = () => { try { store.set(STORE_KEY, state); } catch { /* best effort */ } };
  const q = ctx.query || {};
  const linesOf = (o) => serviceLines(S.orders, o, S.byId);
  const allLines = (() => { const seen = new Map(); for (const o of ORDER_IDS) for (const l of linesOf(o)) if (!seen.has(l.key)) seen.set(l.key, { ...l, order: o }); return [...seen.values()]; })();
  const st = { tab: TABS.some(([t]) => t === q.tab) ? q.tab : 'compare', order: ORDER_IDS.includes(q.order) ? q.order : 'friday-night', i: 0,
    take: null, recording: false, waves: null, scores: {}, machine: null, gap: 1, rounds: 2, shadow: null, passage: null, journalRows: [], kept: false };
  const live = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });
  const say = (t) => { live.textContent = t; };
  let player = null, timer = null, shadowRun = 0;
  const stopAll = () => { shadowRun++; if (timer != null) { clearT(timer); timer = null; } try { player?.pause?.(); } catch { /* ignore */ } try { ctx.audio?.stop?.(); } catch { /* ignore */ } st.shadow = null; };
  const line = () => { const L = linesOf(st.order); st.i = Math.max(0, Math.min(st.i, L.length - 1)); return L[st.i]; };
  const modelClip = (l) => { const a = audioAccess(ctx.audio, l.clip.kind, l.clip.id, { tradition }); if (a.level !== 'file') return null; try { const p = ctx.audio.status(l.clip.kind, l.clip.id, { tradition }); return p?.source === 'file' ? p : null; } catch { return null; } };
  const dropTake = () => { st.take = null; st.waves = null; st.scores = {}; st.machine = null; st.kept = false; };

  async function playUrl(url) { try { player?.pause?.(); player = makeAudio(url); await player?.play?.(); } catch { say('Playback did not start. Try again.'); } }

  // ---------- shared line picker ----------
  function picker() {
    const l = line(), L = linesOf(st.order);
    const goto = (d) => { stopAll(); dropTake(); st.i = Math.max(0, Math.min(L.length - 1, st.i + d)); render('vs-line'); };
    return [h('div', { class: 'vs-row', role: 'group', 'aria-label': 'Service' }, ...ORDER_IDS.map((o) =>
      h('button', { type: 'button', class: 'btn secondary', 'data-order': o, 'aria-pressed': st.order === o ? 'true' : 'false', onclick: () => { stopAll(); dropTake(); st.order = o; st.i = 0; render(); } }, S.orders.orders[o].title))),
    h('section', { class: 'card', id: 'vs-line', tabindex: '-1', 'data-line': l.key, 'aria-label': 'The line' },
      h('p', { class: 'small muted' }, `${l.moment}: ${l.title}, line ${l.n} of ${l.of}. Line ${st.i + 1} of ${L.length}.`),
      h('p', { class: 'vs-he', lang: 'he', dir: 'rtl' }, l.shown),
      h('div', { class: 'vs-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'vs-prev', disabled: st.i === 0 ? true : null, onclick: () => goto(-1) }, 'Previous line'),
        h('button', { type: 'button', class: 'btn secondary', id: 'vs-next', disabled: st.i === L.length - 1 ? true : null, onclick: () => goto(1) }, 'Next line')))];
  }

  function waveNode(label, p) {
    const W = p.length, bars = p.map((v, i) => svg('rect', { x: i, y: (1 - Math.max(v, 0.02)) * 32, width: 0.7, height: Math.max(v, 0.02) * 64 }));
    return h('figure', { class: 'vs-wave', 'data-wave': label }, svg('svg', { viewBox: `0 0 ${W} 64`, preserveAspectRatio: 'none', role: 'img', 'aria-label': `${label} waveform` }, ...bars), h('figcaption', { class: 'small' }, label));
  }
  async function loadWaves(l) {
    const clip = modelClip(l);
    const [m, mine] = await Promise.all([clip?.url ? decode(clip.url) : Promise.resolve(null), st.take?.blob ? decode(st.take.blob) : Promise.resolve(null)]);
    if (!alive) return;
    st.waves = { model: m ? peaks(m) : null, mine: mine ? peaks(mine) : null, hadClip: !!clip };
    render();
  }

  // ---------- G1 + G3 + G5 + G10 save ----------
  function compareView() {
    const l = line();
    const out = [...picker()];
    out.push(h('div', { class: 'vs-row' }, audioButton(h, ctx, { kind: l.clip.kind, id: l.clip.id, tradition, text: l.spoken, label: 'Play the model', buttonId: 'vs-model' })));
    if (!recorder.supported) out.push(h('p', { role: 'note' }, ERR.unsupported, ' You can still listen to the model and use the machine check if your browser has one.'));
    else {
      out.push(h('div', { class: 'vs-row' },
        h('button', { type: 'button', class: 'btn', id: 'vs-rec', 'aria-pressed': st.recording ? 'true' : 'false', onclick: async () => {
          if (st.recording) {
            const r = await recorder.stop(); st.recording = false;
            if (!r.ok) { say(ERR[r.error] || 'The recording did not work. Try again.'); render('vs-rec'); return; }
            st.take = { url: r.url, ms: r.ms, blob: r.blob || null, at: clock() }; st.kept = false;
            state = addRecordingDay(state, dayKey(st.take.at)); save();
            say(`Recorded ${Math.round(r.ms / 100) / 10} seconds.`); render('vs-mine'); loadWaves(l);
            return;
          }
          stopAll(); dropTake();
          const r = await recorder.start();
          if (!r.ok) { say(ERR[r.error] || 'The recording did not work. Try again.'); return; }
          st.recording = true; say('Recording. Read the line aloud, then press Stop.'); render('vs-rec');
        } }, st.recording ? 'Stop recording' : (st.take ? 'Record again' : 'Record yourself')),
        st.take ? h('button', { type: 'button', class: 'btn secondary', id: 'vs-mine', onclick: () => playUrl(st.take.url) }, 'Play mine') : null));
    }
    if (st.take) {
      const w = st.waves;
      out.push(h('section', { class: 'card', 'aria-labelledby': 'vs-cmp-h' }, h('h2', { id: 'vs-cmp-h' }, 'Side by Side'),
        !w ? h('p', { class: 'small muted' }, 'Drawing the waveforms...') : h('div', { class: 'vs-waves' },
          w.model ? waveNode('Model clip', w.model) : h('p', { class: 'small muted', 'data-wave-none': 'model' }, w.hadClip ? 'The model waveform could not be drawn in this browser.' : 'No model clip for this line yet, so there is no model waveform.'),
          w.mine ? waveNode('Your recording', w.mine) : h('p', { class: 'small muted', 'data-wave-none': 'mine' }, 'Your waveform could not be drawn in this browser.')),
        h('p', { class: 'small muted' }, 'The shapes show loudness over time, so you can see pauses and length side by side. They are not a score: two good readings can look different.')),
        rubric(l),
        h('div', { class: 'vs-row' }, journal.supported
          ? h('button', { type: 'button', class: 'btn secondary', id: 'vs-keep', disabled: st.kept || !st.take.blob ? true : null, onclick: async () => {
            const r = await journal.add({ line: l.key, title: `${l.moment} (line ${l.n})`, at: st.take.at, ms: st.take.ms, blob: st.take.blob });
            st.kept = !!r.ok; say(r.ok ? 'Kept in your voice journal on this device.' : r.error === 'full' ? 'The journal is full (200 takes). Delete some old takes first.' : 'This take could not be kept.'); render('vs-keep');
          } }, st.kept ? 'Kept in your journal' : 'Keep in my voice journal')
          : h('p', { class: 'small muted' }, 'This browser cannot keep recordings, so the voice journal is off here.')));
    }
    if (recognizer.supported) {
      out.push(h('section', { class: 'card', 'aria-labelledby': 'vs-mc-h' }, h('h2', { id: 'vs-mc-h' }, 'Machine Check'),
        h('p', { class: 'small' }, MACHINE_NOTE),
        h('button', { type: 'button', class: 'btn secondary', id: 'vs-machine', onclick: async () => {
          stopAll(); say('Listening: read the line aloud now.');
          const r = await recognizer.listen();
          if (!alive) return;
          st.machine = r.ok ? showName(r.alternatives[0]) : '';
          if (!r.ok && r.error !== 'no-speech') { say('The recognizer did not work just now.'); }
          render('vs-machine-out');
        } }, 'Read it to the machine'),
        st.machine == null ? null : h('p', { id: 'vs-machine-out', tabindex: '-1', 'data-machine': '' }, ...(st.machine
          ? ['The machine heard: ', heSpan(st.machine), '. The line is: ', heSpan(l.plain), '. A machine guess, not a grade.']
          : [machineSentence('', l.plain)]))));
    } else out.push(h('p', { class: 'small muted', 'data-machine-none': '' }, 'Machine check: this browser has no speech recognizer, so there is no machine guess here. Nothing is sent to a server instead.'));
    out.push(live);
    return out;
  }

  function rubric(l) {
    return h('section', { class: 'card', 'aria-labelledby': 'vs-rub-h' }, h('h2', { id: 'vs-rub-h' }, 'Rate Yourself'),
      h('p', { class: 'small', 'data-self': '' }, SELF_LABEL),
      ...AXES.map((a) => h('div', { role: 'group', 'aria-label': a.label, 'data-axis': a.id }, h('p', {}, h('strong', {}, `${a.label}: `), a.ask),
        h('div', { class: 'vs-row' }, ...RATING.map(([v, label]) => h('button', { type: 'button', class: 'btn secondary', 'data-rate': `${a.id}:${v}`, 'aria-pressed': st.scores[a.id] === v ? 'true' : 'false', onclick: () => { st.scores[a.id] = v; render(); } }, label))))),
      h('button', { type: 'button', class: 'btn', id: 'vs-save-rating', disabled: AXES.some((a) => st.scores[a.id]) ? null : true, onclick: () => {
        state = addRating(state, l.key, clock(), st.scores); save(); st.scores = {}; say('Your ratings are saved.'); render('vs-save-rating');
      } }, 'Save my ratings'),
      ratingChart());
  }
  function ratingChart() {
    const wk = ratingsByWeek(state);
    if (!wk.length) return h('p', { class: 'small muted' }, 'Your ratings appear here, week by week, once you save some.');
    return h('details', {}, h('summary', {}, 'Your Ratings by Week'),
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Week of'), h('th', {}, 'Takes'), ...AXES.map((a) => h('th', {}, a.label)))),
        h('tbody', {}, ...wk.map((w) => h('tr', { 'data-week': w.week }, h('td', {}, w.week), h('td', {}, String(w.n)), ...AXES.map((a) => h('td', {}, w[a.id] == null ? '-' : `${w[a.id]} of 3`)))))),
      h('p', { class: 'small muted' }, SELF_LABEL));
  }

  // ---------- G2 shadowing ----------
  function shadowView() {
    const l = line(), clip = modelClip(l);
    const out = [...picker()];
    if (isAudioFree(ctx)) return [...out, h('p', { role: 'note' }, AUDIO_FREE_NOTE)];
    out.push(h('p', {}, 'The model plays, then a silence for you to say the line, then the model again so you can check. The silence is the length of the clip times the gap you choose.'),
      h('div', { class: 'vs-row', role: 'group', 'aria-label': 'Gap' }, h('span', {}, 'Gap: '), ...GAP_FACTORS.map((f) => h('button', { type: 'button', class: 'btn secondary', 'data-gap': String(f), 'aria-pressed': st.gap === f ? 'true' : 'false', onclick: () => { st.gap = f; render(); } }, `${f}x`))),
      h('div', { class: 'vs-row', role: 'group', 'aria-label': 'Rounds' }, h('span', {}, 'Rounds: '), ...[1, 2, 3].map((n) => h('button', { type: 'button', class: 'btn secondary', 'data-rounds': String(n), 'aria-pressed': st.rounds === n ? 'true' : 'false', onclick: () => { st.rounds = n; render(); } }, String(n)))));
    if (!clip) { out.push(h('p', { 'data-shadow-none': '' }, 'No clip for this line yet, so there is no model to shadow. Try the next line.'), live); return out; }
    out.push(st.shadow
      ? h('div', {}, h('p', { class: 'vs-turn', 'data-phase': st.shadow.phase }, st.shadow.text), h('button', { type: 'button', class: 'btn secondary', id: 'vs-shadow-stop', onclick: () => { stopAll(); say('Stopped.'); render('vs-shadow-go'); } }, 'Stop'))
      : h('button', { type: 'button', class: 'btn', id: 'vs-shadow-go', onclick: () => runShadow(l) }, 'Start shadowing'), live);
    return out;
  }
  async function runShadow(l) {
    stopAll(); const run = ++shadowRun;
    const phase = (p, text) => { if (run !== shadowRun || !alive) return false; st.shadow = { phase: p, text }; render(); return true; };
    const playModel = async () => { const t0 = clock(); try { await ctx.audio.play(l.clip.kind, l.clip.id, { tradition }); } catch { /* the clip did not play */ } return clock() - t0; };
    for (let r = 1; r <= st.rounds; r++) {
      if (!phase('model', `Round ${r} of ${st.rounds}: listen.`)) return;
      const ms = await playModel();
      const turn = turnMs(ms, st.gap);
      if (!phase('turn', `Your turn: say it now (${Math.round(turn / 100) / 10} seconds).`)) return;
      await new Promise((res) => { timer = setT(() => { timer = null; res(); }, turn); });
      if (!phase('check', `Round ${r} of ${st.rounds}: the model again, to check.`)) return;
      await playModel();
    }
    if (run !== shadowRun || !alive) return;
    st.shadow = null; say(`Done: ${st.rounds} ${st.rounds === 1 ? 'round' : 'rounds'}.`); render('vs-shadow-go');
  }

  // ---------- G6 gym ----------
  function gymView() {
    const weak = weakestAxis(state), set = gymSet(state, allLines, 5);
    if (!weak) return [h('p', { 'data-gym-empty': '' }, 'Rate a few of your recordings first (Record and Compare). The gym picks five lines from your own ratings.'), h('p', { class: 'small muted' }, SELF_LABEL)];
    const ax = AXES.find((a) => a.id === weak.id);
    return [h('section', { class: 'card', 'aria-labelledby': 'vs-gym-h' }, h('h2', { id: 'vs-gym-h' }, 'Today\'s Five'),
      h('p', { 'data-weak': weak.id }, `Your lowest self-rating lately: ${weak.label} (average ${weak.avg} of 3, ${weak.n} ${weak.n === 1 ? 'rating' : 'ratings'}). ${ax.ask}`),
      set.length ? h('ol', {}, ...set.map((x) => h('li', { 'data-gym': x.key }, heSpan(x.shown), h('br', {}), h('span', { class: 'small' }, `${x.moment}. ${x.why}. `),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { const o = x.order; st.order = o; st.i = linesOf(o).findIndex((y) => y.key === x.key); st.tab = 'compare'; dropTake(); render('vs-line'); } }, 'Practise it'))))
        : h('p', {}, 'Every line you rated was a 3 on every axis last time. Record some new lines.'),
      h('p', { class: 'small muted' }, `Chosen from your own ratings only. ${SELF_LABEL}`))];
  }

  // ---------- G8 fluency ----------
  function fluencyView() {
    const reads = (() => { const t = get(TIMED_KEY, null); return Array.isArray(t?.reads) ? t.reads : []; })();
    const wk = fluencyByWeek(reads);
    const top = Math.max(1, ...wk.map((w) => w.wpm));
    return [h('p', { 'data-fluency-note': '' }, FLUENCY_NOTE),
      wk.length ? h('div', {},
        svg('svg', { viewBox: `0 0 ${wk.length * 10} 50`, role: 'img', 'aria-label': 'Median words per minute by week', class: 'vs-wpm', preserveAspectRatio: 'none', style: 'inline-size:100%;block-size:80px' },
          ...wk.map((w, i) => svg('rect', { x: i * 10 + 1, y: 50 - (w.wpm / top) * 48, width: 8, height: (w.wpm / top) * 48, fill: 'currentColor' }))),
        h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Week of'), h('th', {}, 'Reads'), h('th', {}, 'Words per minute (median)'), h('th', {}, 'Stumbles per 100 words (yours)'))),
          h('tbody', {}, ...wk.map((w) => h('tr', { 'data-week': w.week }, h('td', {}, w.week), h('td', {}, String(w.reads)), h('td', {}, String(w.wpm)), h('td', {}, String(w.stumblesPer100)))))))
        : h('p', {}, 'No timed reads yet.'),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/timedread' }, 'Do a timed read'))];
  }

  // ---------- G9 speaking days ----------
  function streakView() {
    const attempts = (() => { const sp = get('speak.v1', null); return Array.isArray(sp?.attempts) ? sp.attempts : []; })();
    const days = speakingDays(state, attempts), today = dayKey(clock());
    const n = speakingStreak(days, today), g = weekGoal(days, today, state.goal);
    return [h('section', { class: 'card', 'aria-labelledby': 'vs-st-h' }, h('h2', { id: 'vs-st-h' }, 'Speaking Days'),
      h('p', { 'data-speak-streak': String(n) }, n ? `Speaking streak: ${n} ${n === 1 ? 'day' : 'days'} in a row with at least one recording.` : 'No speaking streak yet: record yourself today to start one.'),
      h('p', { 'data-week-goal': `${g.days}/${g.goal}` }, g.text),
      h('progress', { max: String(g.goal), value: String(Math.min(g.days, g.goal)), 'aria-label': g.text }),
      h('div', { class: 'vs-row', role: 'group', 'aria-label': 'Weekly goal' }, h('span', {}, 'Weekly goal: '), ...GOAL_DAYS.map((d) => h('button', { type: 'button', class: 'btn secondary', 'data-goal': String(d), 'aria-pressed': state.goal === d ? 'true' : 'false', onclick: () => { state = setGoal(state, d); save(); render(); } }, `${d}`))),
      h('p', { class: 'small muted' }, 'A speaking day is a day you recorded yourself here or in Say it. This streak is separate from your main streak and never costs anything.'))];
  }

  // ---------- G10 journal ----------
  function journalView() {
    if (!journal.supported) return [h('p', {}, 'This browser cannot keep recordings, so the voice journal is off here.')];
    const ps = journalPassages(st.journalRows);
    const out = [h('p', { class: 'small' }, 'Takes you chose to keep, dated, on this device only. Nothing is uploaded. Clearing the browser\'s site data deletes them.')];
    if (!ps.length) return [...out, h('p', { 'data-journal-empty': '' }, 'Nothing kept yet. After a recording in Record and Compare, press Keep in my voice journal.')];
    if (!st.passage || !ps.some((p) => p.line === st.passage)) st.passage = ps[0].line;
    out.push(h('div', { class: 'vs-row', role: 'group', 'aria-label': 'Passage' }, ...ps.map((p) => h('button', { type: 'button', class: 'btn secondary', 'data-passage': p.line, 'aria-pressed': st.passage === p.line ? 'true' : 'false', onclick: () => { st.passage = p.line; render(); } }, `${p.title}: ${p.takes} ${p.takes === 1 ? 'take' : 'takes'}`))));
    const series = journalSeries(st.journalRows, st.passage);
    const urlOf = (e) => { try { return e.blob && globalThis.URL?.createObjectURL ? globalThis.URL.createObjectURL(e.blob) : null; } catch { return null; } };
    out.push(h('ol', { class: 'vs-journal' }, ...series.map((e) => h('li', { 'data-take': String(e.id) }, `${e.day} (week ${e.week}), ${Math.round((e.ms || 0) / 100) / 10} seconds `,
      h('button', { type: 'button', class: 'btn secondary', onclick: () => { const u = urlOf(e); if (u) playUrl(u); else say('This take cannot be played here.'); } }, 'Play'), ' ',
      h('button', { type: 'button', class: 'btn secondary', 'data-delete': String(e.id), onclick: async () => { await journal.remove(e.id); st.journalRows = await journal.list(); say('Deleted.'); render(); } }, 'Delete')))),
      h('button', { type: 'button', class: 'btn', id: 'vs-play-all', onclick: async () => {
        for (const e of series) { if (!alive || st.tab !== 'journal') return; const u = urlOf(e); if (!u) continue; say(`Playing ${e.day}.`); await new Promise((res) => { try { player?.pause?.(); player = makeAudio(u); if (!player) return res(); player.onended = res; player.onerror = res; Promise.resolve(player.play?.()).catch(res); } catch { res(); } }); }
        say('Played every take in order, oldest first.');
      } }, 'Play all, oldest first'), live);
    return out;
  }

  function tabs() {
    return h('div', { class: 'vs-row', role: 'group', 'aria-label': 'Studio mode' }, ...TABS.map(([t, label]) => h('button', { type: 'button', class: 'btn secondary', id: `vs-tab-${t}`, 'aria-pressed': st.tab === t ? 'true' : 'false', onclick: async () => {
      stopAll(); st.tab = t; if (t === 'journal') st.journalRows = await journal.list(); render(`vs-tab-${t}`);
    } }, label)));
  }
  function render(focusId) {
    const body = st.tab === 'shadow' ? shadowView() : st.tab === 'gym' ? gymView() : st.tab === 'fluency' ? fluencyView() : st.tab === 'streak' ? streakView() : st.tab === 'journal' ? journalView() : compareView();
    main.replaceChildren(h('p', { class: 'small' }, 'Practise saying the prayer lines. Nothing here scores your pronunciation: you listen, compare and rate yourself.'), tabs(), ...body.filter(Boolean));
    if (focusId) main.querySelector('#' + focusId)?.focus?.();
  }
  if (st.tab === 'journal') st.journalRows = await journal.list();
  render();
  if (ctx.audio && typeof ctx.audio.ensureManifest === 'function') Promise.resolve(ctx.audio.ensureManifest()).then(() => { if (alive && !st.recording && !st.shadow) render(); }).catch(() => {});
  return () => { alive = false; stopAll(); try { recorder.dispose?.(); } catch { /* ignore */ } try { recognizer.stop?.(); } catch { /* ignore */ } };
}
