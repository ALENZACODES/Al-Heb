/**
 * First 10 minutes (#/firstday): DRAFT, unreviewed. The on-ramp: five baby steps, one screen each, about 2 minutes each
 * (data/firstday/onramp.json): one letter, a second letter, one vowel sign, one syllable, one real word. It is lesson r01 taken one
 * piece at a time; the last win saves r01's quick-check answers (saveQuickCheck), so r01 counts as complete and its review cards exist.
 * Each win also counts the day as active the way a finished lesson does (recordActivity).
 * The older eight-step flow (data/firstday/first10.json: five letters, two vowels, shalom / sham / mah) is kept as an optional
 * preview after the five wins: #/firstday?part=preview. Store key firstday.progress for both (see onramp.model.js).
 * Audio: ctx.audio.play(kind, id); no recordings exist, the device voice (Israeli) is the fallback and the screen says so.
 * ctx extras for tests: ctx.firstdayData {first10, ladder, onramp, content, lessons}, ctx.rng.
 */
import { el, heText, heLabeled, storeGet, storeSet, showSaveFailure, STREAK_KEY } from '../curriculum/dom.js';
import { recordActivity } from '../curriculum/progress.js';
import { currentStreak } from '../curriculum/state.js';
import { loadFirst10, loadLadder, loadOnramp } from './loader.js';
import { DRAFT_NOTICE, PROGRESS_KEY, advance, markRead, wordById, buildCheck, gradeCheck, audioEntries, playHook, totalMinutes } from './model.js';
import { migrateProgress, winStep, recordAnswer, stepQuestions, stepIndex, onrampDone, totalMinutes as onrampMinutes } from './onramp.model.js';
import { loadMemoryChain, entryFor, buildMemoryCard } from '../letters/memorycard.js';
import { vowelSound, respell, congregationOf, audioNote, saySound, playLine, audioSupport, LABELS } from '../pronunciation/forTradition.js';
import { isAudioFree } from '../shell/audiofree.js';
import { soundOn } from '../curriculum/exercises.session.js';

const PREVIEW_SOURCES = 'Hebrew copied from existing course data; nothing new.';
const SHORT_NOTICE = 'Draft, unreviewed: no Hebrew teacher has checked it and no learner has tried it yet.';

/** Extra audio ids for the syllable and the word (no recording: the device voice says the text). */
export function onrampAudioEntries(onramp) {
  return (onramp?.steps || []).filter((s) => s.he && s.kind !== 'vowel').map((s) => ({ path: `audio/m/israeli/word/firstday-${s.id}.mp3`, voice: 'm', tradition: 'israeli', kind: 'word', id: `firstday-${s.id}`, text: s.he, status: 'missing', source: 'none', group: 'firstday' }));
}

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const rng = ctx?.rng || Math.random;
  const tradition = congregationOf(ctx?.settings);
  const wrap = el('section', { class: 'alef-firstday', 'aria-labelledby': 'view-title', 'data-tradition': tradition });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Your first 10 minutes');
  const body = el('div', { class: 'fd-body' });
  const status = el('div', { role: 'status', 'aria-live': 'polite', id: 'fd-status', class: 'visually-hidden' }); // read aloud; the feedback panel is what sighted learners see
  // one line, before step 1: which reading style this screen follows and what sound to expect with it (no recorded clips exist yet)
  const support = audioSupport(tradition, { browserVoiceAnyway: !!ctx?.settings?.get?.('browserVoiceAnyway'), audioFree: isAudioFree(ctx), recorded: ctx?.audio?.summary?.recorded || 0 });
  const styleLine = el('p', { class: 'fd-style muted small', id: 'fd-style', 'data-audio-support': support.supported },
    el('strong', {}, `Reading style: ${LABELS[tradition]}.`), ' ', support.line, ' ', el('a', { href: '#/settings' }, 'Change in Settings'));
  // exit X + progress bar on top, one action area at the bottom (CSS: body.fd-player hides the shell chrome)
  const meterFill = el('span', { class: 'fd-meter-fill' });
  const meter = el('div', { class: 'fd-meter', role: 'progressbar', 'aria-label': 'Lesson progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, meterFill);
  const top = el('div', { class: 'fd-top' }, el('a', { class: 'fd-x', href: '#/', 'aria-label': 'Leave the lesson. Your progress is saved.' }, '✕'), meter);
  const foot = el('div', { class: 'fd-foot' });
  h1.className = 'visually-hidden';
  wrap.append(top, h1, body, el('div', { class: 'fd-meta' }, styleLine, el('p', { class: 'fd-draft muted small', title: DRAFT_NOTICE }, SHORT_NOTICE)), status, foot);
  root.append(wrap);
  const bodyEl = globalThis.document?.body; try { bodyEl?.classList?.add('fd-player'); } catch { /* minimal DOMs */ }
  let alive = true, data = null, onramp = null, content = null, lessonQs = [], lesson = null, nextLesson = null;
  let chain, memCard = null; // chain: undefined while loading (never blocks the step), null when unavailable, else the file
  let progress = migrateProgress(null), check = null, picked = null, answered = null;
  // U-03: a finished on-ramp can be practised again. Practice runs on a
  // throwaway copy of the progress: nothing is saved, the recorded first
  // completion (its answers, cards and streak) is never touched.
  let practice = false;
  const say = (t) => { status.textContent = t; };
  const save = () => (practice ? Promise.resolve() : storeSet(ctx, PROGRESS_KEY, progress));
  const focus = () => { try { h1.focus(); } catch { /* ignore */ } };
  // after a quick-check answer or a rebuild: keep focus inside the screen (never drop it to body); only moves it if it was lost
  const focusLost = () => { const a = document.activeElement; return !a || a === document.body || !body.contains(a) || a.disabled; };
  const refocus = (sel) => { try { if (focusLost()) body.querySelector(sel)?.focus({ preventScroll: true }); } catch { /* ignore */ } };
  const hearNote = () => (isAudioFree(ctx) || tradition === 'israeli' ? el('span', { hidden: '' }) : el('p', { class: 'muted small fd-audio-note' }, audioNote(tradition)));
  const listen = (hook, label = 'Hear it') => isAudioFree(ctx) ? el('span', { hidden: '' }) : el('button', { class: 'btn', type: 'button', onclick: async () => {
    const r = await playHook(ctx?.audio, hook);
    say(playLine(r, tradition, 'it')); // one shared, tradition-aware sentence (never presents the Israeli device voice as the learner's style)
  } }, label);
  const wantPreview = () => ctx?.query?.part === 'preview';

  // ---------- on-ramp: one baby step per screen, app-style ----------
  // App-style player: learn screen, then one question per screen (pick, Check, feedback panel, Continue). Same steps, saving and scoring.
  let stage = 'learn', sel = null, verdict = null, combo = 0;
  const startedAt = Date.now();
  const units = () => onramp.steps.reduce((a, st) => a + 1 + stepQuestions(st, lessonQs).length, 0);
  const unitsBefore = (i) => onramp.steps.slice(0, i).reduce((a, st) => a + 1 + stepQuestions(st, lessonQs).length, 0);
  const setMeter = (done, label) => {
    const pct = Math.max(0, Math.min(100, Math.round((done / Math.max(1, units())) * 100)));
    meterFill.setAttribute('style', `width:${pct}%`);
    meter.setAttribute('aria-valuenow', String(pct)); meter.setAttribute('aria-valuetext', label);
  };
  const footSet = (...kids) => { foot.className = 'fd-foot'; foot.replaceChildren(...kids.filter(Boolean)); };
  const chime = (ok) => { try { if (soundOn(ctx)) ctx.sfx.play(ok ? 'success' : 'miss'); } catch { /* sound is never the only cue */ } };
  const kicker = (txt) => el('p', { class: 'fd-kicker' }, txt);
  const KIND_LABEL = { letter: 'New letter', vowel: 'New vowel mark', syllable: 'Read a syllable', word: 'Read a word' };

  function renderStep() {
    const i = stepIndex(onramp, progress);
    if (i >= onramp.steps.length || onrampDone(onramp, progress)) return renderDone();
    const s = onramp.steps[i];
    const qs = stepQuestions(s, lessonQs);
    if (stage === 'q' && !qs.length) { stage = 'learn'; return win(s); }
    const stepLabel = `Step ${i + 1} of ${onramp.steps.length}`;
    if (stage === 'learn') return renderLearn(s, i, stepLabel, qs);
    const qi = Math.min(answered?.qi || 0, qs.length - 1);
    return renderQuestion(s, i, stepLabel, qs, qi);
  }

  function renderLearn(s, i, stepLabel, qs) {
    const L = s.kind === 'letter' ? content?.letters?.get(s.letter) : null;
    const M = s.kind === 'letter' ? content?.mnemonics?.get(s.letter) : null;
    const V = s.kind === 'vowel' ? content?.vowels?.get(s.vowel) : null;
    const he = s.kind === 'letter' ? (L?.he || '') : s.he;
    if (memCard) { memCard.destroy(); memCard = null; }
    const me = s.kind === 'letter' ? entryFor(chain, s.letter) : null; // memory card: the big letter turns into its picture; the chain follows
    if (me) memCard = buildMemoryCard({ entry: me, glyph: he, tradition, audio: ctx?.audio, compact: true, hideSoundLine: true });
    setMeter(unitsBefore(i), stepLabel);
    const nodes = [el('p', { class: 'fd-steplabel' }, `${stepLabel} · about ${s.minutes} min`), kicker(KIND_LABEL[s.kind] || 'Learn'), el('h2', { class: 'fd-q', 'data-case': 'keep' }, s.title),
      memCard ? memCard.el : el('p', { class: 'fd-card alef-card', 'data-glyph-slot': '1' }, heText(he, 'alef-he alef-huge fd-big'))];
    if (s.kind === 'letter' && chain === null) nodes.push(el('p', { class: 'mc-fallback muted small', role: 'status', 'data-memory-fallback': '1' }, 'Picture and word hint unavailable offline'));
    // one sound line, in the learner's tradition
    if (s.kind === 'letter') nodes.push(el('p', { class: 'fd-say' }, saySound(content?.consonants?.get?.(s.letter), tradition, { fallbackEn: L?.sound?.en || '' })));
    if (s.kind === 'vowel') nodes.push(el('p', { class: 'fd-say' }, el('strong', {}, V?.name || s.vowel), ': ', vowelSound(V, tradition).en, ` (${LABELS[tradition]} sound)`));
    if (s.kind === 'syllable' || s.kind === 'word') nodes.push(el('p', { class: 'fd-say' }, el('strong', {}, respell(s.he, tradition) || s.id), s.en ? `, "${s.en}"` : '', ` (how it sounds in English letters, ${LABELS[tradition]} style)`));
    const hook = s.kind === 'letter' ? { kind: 'letter', id: s.letter } : s.kind === 'vowel' ? { kind: 'vowel', id: s.vowel } : { kind: 'word', id: `firstday-${s.id}` };
    const row = el('p', { class: 'row fd-tools' }, listen(hook));
    if (s.kind === 'letter') row.append(' ', el('a', { class: 'btn secondary', href: `#/letters/${s.letter}`, id: 'fd-trace' }, 'Trace it'));
    nodes.push(row, el('p', { class: 'fd-action' }, s.action));
    // memory hooks and explanations stay behind "Why?"
    const why = [];
    // the chain is the one story for a letter that has an entry; the old story prints only once the chain is known to lack it (upgradeCard adds it if the file arrives later without the letter)
    if (M) why.push(el('p', {}, M.shape), !me && chain !== undefined ? el('p', { 'data-old-story': '1' }, M.story) : null, el('p', { class: 'muted small' }, 'A memory hook written for this course: a teaching aid, not history.'));
    if (V) why.push(el('p', {}, V.position ? `Where it sits: ${V.position}.` : ''), el('p', {}, V.notes || ''));
    if (s.kind === 'syllable') why.push(el('p', {}, 'Hebrew reads right to left. The vowel mark sits under its letter. Read the letter and its mark together as one sound.'));
    if (s.kind === 'word') why.push(el('p', {}, 'Bet with no dot inside is the soft sound (v). The dot that makes it b is the next lesson.'), el('p', { class: 'muted small' }, `The vowel marks and the English meaning are draft course data. The English-letter spelling follows your ${LABELS[tradition]} setting, made by rules.`));
    if (s.kind === 'letter' && ctx?.hasRoute?.('learn') !== false) why.push(el('p', { class: 'fd-spot' }, 'Optional: ', el('a', { class: 'btn secondary', href: `#/learn?spotit=${s.letter}` }, `Spot It: ${L?.name || s.letter}`)));
    if (why.length) nodes.push(el('details', { class: 'fd-why' }, el('summary', {}, 'Why?'), ...why));
    body.replaceChildren(...nodes);
    footSet(el('button', { class: 'btn fd-cta', type: 'button', id: 'fd-continue', onclick: () => { if (!qs.length) { win(s); return; } stage = 'q'; answered = { qi: 0 }; sel = null; verdict = null; say(''); renderStep(); focusFirst(); } }, qs.length ? 'Continue' : 'Next'));
  }

  function renderQuestion(s, i, stepLabel, qs, qi) {
    const q = qs[qi];
    const last = qi + 1 >= qs.length;
    const right = q.options[q.answerIndex];
    setMeter(unitsBefore(i) + 1 + qi + (verdict ? 1 : 0), `${stepLabel}, question ${qi + 1} of ${qs.length}`);
    const tiles = q.options.map((o, k) => {
      const b = el('button', { type: 'button', class: 'fd-opt fd-tile', 'data-n': String(k + 1), 'aria-pressed': String(sel === k), onclick: () => pick(k) },
        el('span', { class: 'fd-tile-n', 'aria-hidden': 'true' }, String(k + 1)), o.he ? heLabeled(o.text, o.label, 'alef-he fd-tile-he') : el('span', { class: 'fd-tile-txt' }, o.text));
      if (verdict) { b.disabled = true; b.setAttribute('disabled', ''); if (k === q.answerIndex) b.setAttribute('data-state', 'right'); else if (k === verdict.k) b.setAttribute('data-state', 'wrong'); }
      else if (sel === k) b.setAttribute('data-state', 'picked');
      return b;
    });
    body.replaceChildren(
      el('p', { class: 'fd-steplabel' }, stepLabel),
      el('div', { class: 'card fd-check', role: 'group', 'aria-label': 'Quick check' },
        kicker(qs.length > 1 ? `Quick check ${qi + 1} of ${qs.length}` : 'Quick check'),
        el('h2', { class: 'fd-q', 'data-case': 'keep' }, q.prompt),
        q.promptHe ? el('p', { class: 'fd-qglyph' }, heLabeled(q.promptHe, q.promptLabel, 'alef-he alef-big')) : null,
        el('div', { class: 'fd-tiles', role: 'group', 'aria-label': 'Choices' }, ...tiles)));
    if (!verdict) {
      const check = el('button', { class: 'btn fd-cta', type: 'button', id: 'fd-check', onclick: doCheck }, 'Check');
      if (sel === null) { check.disabled = true; check.setAttribute('disabled', ''); check.setAttribute('aria-disabled', 'true'); }
      footSet(check);
      return;
    }
    const go = () => {
      verdict = null; sel = null;
      if (!last) { answered = { qi: qi + 1 }; renderStep(); focusFirst(); return; }
      stage = 'learn'; answered = null; win(s);
    };
    foot.className = `fd-foot fd-sheet ${verdict.ok ? 'is-ok' : 'is-bad'}`;
    foot.replaceChildren(
      el('div', { class: 'fd-sheet-msg', role: 'status' },
        el('p', { class: 'fd-sheet-title' }, el('span', { class: 'fd-sheet-ico', 'aria-hidden': 'true' }, verdict.ok ? '✓' : '✕'), ' ', verdict.ok ? verdict.praise : 'Not quite'),
        verdict.ok ? (combo >= 3 ? el('p', { class: 'fd-combo' }, `${combo} in a row!`) : null)
          : el('p', {}, 'Correct answer: ', right.he ? heText(right.text, 'alef-he') : el('strong', {}, right.text), el('span', { class: 'fd-kind' }, ' — that is how everyone learns.')),
        last ? el('p', { class: 'fd-win' }, el('strong', {}, s.win)) : null),
      last ? el('button', { class: 'btn fd-cta', type: 'button', id: 'fd-next', onclick: go }, verdict.ok ? 'Continue' : 'Got it')
        : el('button', { class: 'btn fd-cta', type: 'button', id: 'fd-next-q', onclick: go }, verdict.ok ? 'Continue' : 'Got it'));
    try { foot.querySelector('button')?.focus({ preventScroll: true }); } catch { /* ignore */ }

    function pick(k) { if (verdict) return; sel = k; renderStep(); try { body.querySelector(`.fd-opt[data-n="${k + 1}"]`)?.focus({ preventScroll: true }); } catch { /* ignore */ } }
    function doCheck() {
      if (sel === null || verdict) return;
      const ok = sel === q.answerIndex;
      progress = recordAnswer(progress, q.id, ok); save();
      combo = ok ? combo + 1 : 0;
      verdict = { ok, k: sel, praise: PRAISE[(qi + i) % PRAISE.length] };
      chime(ok);
      say(ok ? `${verdict.praise}${last ? ' ' + s.win : ''}` : `Not quite: it is ${right.text}. That is how everyone learns, and nothing is lost.`);
      renderStep();
    }
  }
  const focusFirst = () => { try { (body.querySelector('.fd-opt:not([disabled])') || foot.querySelector('button'))?.focus({ preventScroll: true }); } catch { /* ignore */ } };
  // keys: 1-4 pick, Enter presses the bottom button
  const onKey = (e) => {
    if (!alive || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (/^[1-4]$/.test(e.key)) { const b = body.querySelector(`.fd-opt[data-n="${e.key}"]:not([disabled])`); if (b) { e.preventDefault(); b.click(); } }
    else if (e.key === 'Enter' && t && t.tagName !== 'BUTTON' && t.tagName !== 'A' && t.tagName !== 'SUMMARY') { const b = foot.querySelector('button:not([disabled])'); if (b) { e.preventDefault(); b.click(); } }
  };
  try { globalThis.document?.addEventListener?.('keydown', onKey); } catch { /* minimal DOMs */ }

  // Count the lesson (its review cards, the done mark, the streak) in one all-or-nothing save. Returns the StoreWriteError when it could not be saved, else null.
  // The done screen still shows the wins either way, but a failed save is said plainly and offered again (showSaveFailed).
  async function countLesson() {
    try {
      const act = await import('../curriculum/actions.js');
      const qs = onramp.steps.flatMap((st) => stepQuestions(st, lessonQs)).filter((q) => q.cardId && q.id in progress.answers);
      const results = Object.fromEntries(qs.map((q) => [q.id, progress.answers[q.id]]));
      await act.saveQuickCheck(ctx, lesson, qs, results);
      nextLesson = await findNext();
      return null;
    } catch (e) {
      return e && e.name === 'StoreWriteError' ? e : null; /* any other problem: the on-ramp still shows its done screen */
    }
  }
  function showSaveFailed(err) {
    if (!alive) return;
    showSaveFailure(body, err, async () => { const e2 = await countLesson(); say(''); renderStep(); focus(); if (e2) showSaveFailed(e2); });
  }
  async function win(s) {
    progress = winStep(progress, onramp, s.id); answered = null;
    await save();
    if (!practice) { try { const raw = await storeGet(ctx, STREAK_KEY, null); await storeSet(ctx, STREAK_KEY, recordActivity(raw, Date.now())); } catch { /* best effort */ } }
    const err = !practice && onrampDone(onramp, progress) && lesson ? await countLesson() : null;
    stage = 'learn'; verdict = null; sel = null;
    say(''); renderStep(); focus(); focusFirst();
    if (err) showSaveFailed(err);
  }
  const PRAISE = ['Yes! Well done.', 'Yes, that is right!', 'Exactly right.', 'Yes! You are reading Hebrew.'];
  function renderDone() {
    const d = onramp.done || {};
    // the streak record decides (a day counts after 5 minutes)
    const streakLine = el('p', { class: 'fd-streak', id: 'fd-streak' }, '');
    if (!practice) storeGet(ctx, STREAK_KEY, null).then((s) => {
      const p = currentStreak(s, Date.now());
      streakLine.textContent = p.activeToday && p.count > 0
        ? (p.count === 1 ? 'Today counts: day 1 of your streak.' : `Your streak: ${p.count} days in a row.`)
        : 'Five minutes of study today starts your streak.';
    }).catch(() => {});
    // measured: answers in this record, minutes since this screen opened
    const vals = Object.values(progress.answers || {});
    const acc = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : null;
    const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    setMeter(units(), 'Lesson complete');
    const stat = (big, small) => el('li', { class: 'fd-stat' }, el('span', { class: 'fd-stat-big' }, big), el('span', { class: 'fd-stat-small' }, small));
    body.replaceChildren(
      el('div', { class: 'fd-done' },
        el('div', { class: 'fd-medal', 'aria-hidden': 'true' }, el('span', {}, '✓')),
        el('p', { class: 'fd-steplabel' }, practice ? 'Practice round finished. Your finished mark stays as it was — practising changes nothing you earned.' : `${onramp.steps.length} of ${onramp.steps.length} wins`),
        el('h2', { class: 'fd-done-title', 'data-case': 'keep' }, d.title || 'Done'),
        practice ? null : el('ul', { class: 'fd-stats', 'aria-label': 'This lesson' },
          stat(`${onramp.steps.length}/${onramp.steps.length}`, 'wins'),
          acc === null ? null : stat(`${acc}%`, 'answers right'),
          stat(`${mins} min`, 'this visit')),
        el('p', { class: 'fd-card alef-card' }, heText(onramp.steps.find((s) => s.kind === 'word')?.he || '', 'alef-he alef-huge fd-big')),
        el('p', {}, d.body || ''),
        practice ? null : streakLine,
        practice ? null : el('p', {}, d.tomorrow || 'Come back tomorrow for your next letter.',
          ctx?.hasRoute?.('reminders') !== false ? [' ', el('a', { href: '#/reminders', id: 'fd-remind' }, 'Remind me tomorrow')] : null),
        el('p', { class: 'fd-done-more' }, el('button', { class: 'btn secondary', type: 'button', id: 'fd-again', onclick: () => { practice = true; progress = migrateProgress(null); answered = null; stage = 'learn'; verdict = null; sel = null; say(''); renderStep(); focus(); } }, 'Do the steps again'),
          d.preview ? [' ', el('a', { class: 'btn secondary', id: 'fd-preview', href: '#/firstday?part=preview', title: d.preview }, 'Read shalom today')] : null),
        el('p', {}, el('a', { href: '#/' }, 'Back to Home'))));
    footSet(el('a', { class: 'btn fd-cta', id: 'fd-next-lesson', href: nextLesson ? `#/learn?lesson=${nextLesson.id}` : '#/learn' }, nextLesson ? `Continue: ${nextLesson.title}` : 'All lessons'));
    if (!practice) { try { celebrate(); } catch { /* decoration only */ } }
  }
  function celebrate() {
    const doc = globalThis.document; if (!doc?.createElement || !doc.body) return;
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || ctx?.settings?.get?.('calmMode') === true) return;
    const box = doc.createElement('div'); box.className = 'fd-confetti'; box.setAttribute('aria-hidden', 'true');
    for (let n = 0; n < 36; n++) { const c = doc.createElement('i'); c.style.left = (Math.random() * 100) + '%'; c.style.animationDelay = (Math.random() * 0.6) + 's'; c.style.background = n % 3 ? '#d9a441' : (n % 2 ? '#7fb069' : '#f6f1e7'); c.style.transform = `rotate(${Math.random() * 360}deg)`; box.append(c); }
    doc.body.append(box); setTimeout(() => box.remove(), 3200);
  }
  async function findNext() {
    try {
      const [{ lessons, available }, act] = await Promise.all([import('../curriculum/lessons.js'), import('../curriculum/actions.js')]);
      const st = await act.loadState(ctx);
      return available(Object.keys(st.completed), 'read')[0] || lessons.find((l) => l.id === 'r01') || null;
    } catch { return null; }
  }

  // ---------- preview: the older eight-step flow, unchanged in content ----------
  const pstep = () => Math.max(0, Math.min(data.steps.length - 1, Number(progress.previewStep) || 0));
  const pnext = () => { const a = advance({ step: pstep() }, data); progress = { ...progress, part: 'preview', previewStep: a.step, done: progress.done || a.done }; check = null; picked = null; say(''); save(); renderPreview(); focus(); };
  function renderPreview() {
    const s = data.steps[pstep()];
    const nodes = [el('p', { class: 'muted' }, `Preview. Step ${pstep() + 1} of ${data.steps.length}. Budget about ${Math.round(totalMinutes(data))} minutes (a design target, not measured). ${PREVIEW_SOURCES}`), el('h2', {}, s.title)];
    if (s.body) nodes.push(el('p', {}, s.body));
    if (s.kind === 'letter') for (const id of s.items) { const l = data.letters.find((x) => x.id === id); nodes.push(el('p', {}, heText(l.he, 'alef-he fd-big alef-big'), ` ${saySound(content?.consonants?.get?.(id), tradition, { fallbackEn: l.sound })} `, listen(l.audio))); }
    if (s.kind === 'vowel') for (const id of s.items) { const v = data.vowels.find((x) => x.id === id); const rec = content?.vowels?.get(id === 'holam-male' ? 'cholam' : id); nodes.push(el('p', {}, heText(v.example, 'alef-he fd-big alef-big'), ` ${rec ? vowelSound(rec, tradition).en : v.sound}. ${v.note}`)); }
    if (s.kind === 'read') {
      const w = wordById(data, s.word);
      nodes.push(el('p', {}, heText(w.he, 'alef-he fd-big alef-word-big')), el('p', {}, `${respell(w.he, tradition) || w.sound} (how it sounds in English letters, ${LABELS[tradition]} style). ${isAudioFree(ctx) ? 'Read it, then check.' : 'Say it aloud, then check.'}`), listen(w.audio), hearNote(),
        el('button', { class: 'btn', type: 'button', onclick: () => { progress = { ...progress, ...markRead({ readWords: progress.readWords }, w.id) }; save(); say(`${respell(w.he, tradition) || w.sound}: ${w.gloss}. Source: ${w.source}.`); } }, 'Check my reading'));
      if (!w.fromBlessing) nodes.push(el('p', {}, 'This word is not from the Priestly Blessing.'));
    }
    if (s.kind === 'check') {
      check = check || buildCheck(data, 'shalom', rng);
      nodes.push(...check.options.map((o) => el('button', { class: 'btn', type: 'button', lang: 'he', dir: 'rtl', onclick: () => { picked = gradeCheck(check, o.id); progress = { ...progress, checkCorrect: picked.correct }; save(); say(picked.correct ? 'Yes, that one is shalom.' : 'Not quite. Shalom is the long word with the dot-vav. Try again, nothing is lost.'); } }, o.he)));
    }
    if (s.kind === 'done') nodes.push(el('p', {}, data.honestyNote), el('p', {}, el('a', { class: 'btn', id: 'fd-next-lesson', href: nextLesson ? `#/learn?lesson=${nextLesson.id}` : '#/learn' }, nextLesson ? `Continue: ${nextLesson.title}` : 'All lessons')), el('p', {}, el('a', { href: '#/' }, 'Back to Home')));
    if (s.kind !== 'done') nodes.push(el('button', { class: 'btn', type: 'button', onclick: pnext }, 'Next'));
    body.replaceChildren(...nodes);
  }

  // chain arrived after the step was drawn: swap the plain letter for the card in place (no rebuild, so a check in progress is untouched)
  function upgradeCard() {
    if (!alive || !onramp || !data || memCard) return;
    const i = stepIndex(onramp, progress), s = onramp.steps[i];
    if (!s || s.kind !== 'letter' || onrampDone(onramp, progress)) return;
    const slot = body.querySelector('[data-glyph-slot]'); if (!slot) return;
    if (typeof slot.replaceWith !== 'function' || typeof slot.after !== 'function') { renderStep(); return; } // minimal DOMs: renderStep keeps the quiz position
    const me = entryFor(chain, s.letter);
    if (me) { memCard = buildMemoryCard({ entry: me, glyph: content?.letters?.get(s.letter)?.he || '', tradition, audio: ctx?.audio, compact: true, hideSoundLine: true }); slot.replaceWith(memCard.el); }
    else {
      if (chain === null) slot.after(el('p', { class: 'mc-fallback muted small', role: 'status', 'data-memory-fallback': '1' }, 'Picture and word hint unavailable offline'));
      const M = content?.mnemonics?.get(s.letter), shape = body.querySelector('.fd-why p'); // no chain entry: the old story stays, as before
      if (M?.story && shape && !body.querySelector('[data-old-story]')) shape.after(el('p', { 'data-old-story': '1' }, M.story));
    }
  }

  (async () => {
    try {
      const d = ctx?.firstdayData;
      const [first10, ladder, ramp] = d ? [d.first10, d.ladder, d.onramp] : await Promise.all([loadFirst10(), loadLadder(), loadOnramp()]);
      data = first10; onramp = ramp || (d ? await loadOnramp() : null);
      try { content = d?.content || await (await import('../curriculum/content.js')).loadContent(); } catch { content = null; }
      try {
        const { lessons, byId } = d?.lessons ? { lessons: d.lessons, byId: Object.fromEntries(d.lessons.map((l) => [l.id, l])) } : await import('../curriculum/lessons.js');
        lesson = byId[onramp?.lesson] || null;
        if (lesson && content) {
          const { buildChoiceQuestions } = await import('../curriculum/exercises.session.js');
          const idx = lessons.findIndex((l) => l.id === lesson.id);
          lessonQs = buildChoiceQuestions(lesson, content, { seed: 1 + idx, wordPool: lessons.filter((l) => !/^I-\d{2}$/.test(l.id)).flatMap((l) => l.words), tradition });
        }
      } catch { lesson = null; }
      try { ctx?.audio?.extend?.([...audioEntries(first10, ladder), ...onrampAudioEntries(onramp)]); } catch { /* optional */ }
      // the chain card never blocks Step 1: the step shows its big letter now; the card replaces it (and the offline note appears) when the file has loaded
      if (d?.memoryChain !== undefined) chain = d.memoryChain;
      else loadMemoryChain().then((c) => { chain = c || null; upgradeCard(); }, () => { chain = null; upgradeCard(); });
      progress = migrateProgress(await storeGet(ctx, PROGRESS_KEY, null));
      const nextP = findNext().then((n) => { nextLesson = n; });
      const showsSteps = !(wantPreview() || !onramp || (progress.part === 'preview' && !onrampDone(onramp, progress)));
      if (!showsSteps || onrampDone(onramp, progress)) await nextP; // only the done screen and the preview need the next lesson; a step does not wait for it (the win path awaits findNext itself)
      if (!alive) return;
      // ?part=preview opens the older flow; a learner who was already inside it (legacy record) stays there; everyone else gets the steps
      if (wantPreview() || !onramp || (progress.part === 'preview' && !onrampDone(onramp, progress))) renderPreview();
      else renderStep();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The lesson could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; if (memCard) memCard.destroy(); try { bodyEl?.classList?.remove('fd-player'); globalThis.document?.removeEventListener?.('keydown', onKey); } catch { /* ignore */ } wrap.remove(); };
}
