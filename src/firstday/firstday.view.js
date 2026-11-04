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
import { el, heText, storeGet, storeSet, STREAK_KEY } from '../curriculum/dom.js';
import { recordActivity } from '../curriculum/progress.js';
import { loadFirst10, loadLadder, loadOnramp } from './loader.js';
import { DRAFT_NOTICE, PROGRESS_KEY, advance, markRead, wordById, buildCheck, gradeCheck, audioEntries, playHook, totalMinutes } from './model.js';
import { migrateProgress, winStep, recordAnswer, stepQuestions, stepIndex, onrampDone, totalMinutes as onrampMinutes } from './onramp.model.js';
import { vowelSound, respell, congregationOf, audioNote, letterSound, LABELS } from '../pronunciation/forTradition.js';

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
  const wrap = el('section', { class: 'alef-firstday', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Your first 10 minutes');
  const body = el('div', { class: 'fd-body' });
  const status = el('div', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, el('p', { class: 'fd-draft muted small', title: DRAFT_NOTICE }, SHORT_NOTICE), body, status);
  root.append(wrap);
  let alive = true, data = null, onramp = null, content = null, lessonQs = [], lesson = null, nextLesson = null;
  let progress = migrateProgress(null), check = null, picked = null, answered = null;
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, PROGRESS_KEY, progress);
  const focus = () => { try { h1.focus(); } catch { /* ignore */ } };
  const hearNote = () => el('p', { class: 'muted small fd-audio-note' }, audioNote(tradition));
  const listen = (hook, label = 'Hear it') => el('button', { class: 'btn', type: 'button', onclick: async () => {
    const r = await playHook(ctx?.audio, hook);
    say(r.source === 'none' ? 'Sound is not available on this device yet.' : r.source === 'tts-fallback' ? 'Played with the device voice (Israeli), not a recording.' : 'Playing.');
  } }, label);
  const wantPreview = () => ctx?.query?.part === 'preview';

  // ---------- on-ramp: one baby step per screen ----------
  function renderStep() {
    const i = stepIndex(onramp, progress);
    if (i >= onramp.steps.length || onrampDone(onramp, progress)) return renderDone();
    const s = onramp.steps[i];
    const L = s.kind === 'letter' ? content?.letters?.get(s.letter) : null;
    const M = s.kind === 'letter' ? content?.mnemonics?.get(s.letter) : null;
    const V = s.kind === 'vowel' ? content?.vowels?.get(s.vowel) : null;
    const he = s.kind === 'letter' ? (L?.he || '') : s.he;
    const nodes = [el('p', { class: 'muted' }, `Step ${i + 1} of ${onramp.steps.length} · about ${s.minutes} min`), el('h2', {}, s.title),
      el('p', { class: 'fd-card alef-card' }, heText(he, 'alef-he alef-huge fd-big'))];
    // one sound line, in the learner's tradition
    if (s.kind === 'letter') nodes.push(el('p', {}, el('strong', {}, L?.name || s.letter), ': ', letterSound(content?.consonants?.get?.(s.letter), tradition, { fallbackEn: L?.sound?.en || '' }).en));
    if (s.kind === 'vowel') nodes.push(el('p', {}, el('strong', {}, V?.name || s.vowel), ': ', vowelSound(V, tradition).en, ` (${LABELS[tradition]} sound)`));
    if (s.kind === 'syllable' || s.kind === 'word') nodes.push(el('p', {}, el('strong', {}, respell(s.he, tradition) || s.id), s.en ? `, "${s.en}"` : '', ` (${LABELS[tradition]} respelling, rule-generated)`));
    nodes.push(el('p', {}, s.action));
    const hook = s.kind === 'letter' ? { kind: 'letter', id: s.letter } : s.kind === 'vowel' ? { kind: 'vowel', id: s.vowel } : { kind: 'word', id: `firstday-${s.id}` };
    const row = el('p', { class: 'row' }, listen(hook));
    if (s.kind === 'letter') row.append(' ', el('a', { class: 'btn secondary', href: `#/letters/${s.letter}`, id: 'fd-trace' }, 'Trace it'));
    nodes.push(row, hearNote());
    // memory hooks and explanations stay behind "Why?"
    const why = [];
    if (M) why.push(el('p', {}, M.shape), el('p', {}, M.story), el('p', { class: 'muted small' }, 'A memory hook written for this course: a teaching aid, not history.'));
    if (V) why.push(el('p', {}, V.position ? `Where it sits: ${V.position}.` : ''), el('p', {}, V.notes || ''));
    if (s.kind === 'syllable') why.push(el('p', {}, 'Hebrew reads right to left. Each letter carries the vowel sign under it, so you read the letter and then its sign as one piece.'));
    if (s.kind === 'word') why.push(el('p', {}, 'Bet with no dot inside is the soft sound (v). The dot that makes it b is the next lesson.'), el('p', { class: 'muted small' }, `Pointing and gloss are draft course data; the Latin respelling is rule-generated for ${LABELS[tradition]}.`));
    if (s.kind === 'letter' && ctx?.hasRoute?.('learn') !== false) why.push(el('p', { class: 'fd-spot' }, 'Optional: ', el('a', { class: 'btn secondary', href: `#/learn?spotit=${s.letter}` }, `Spot It: ${L?.name || s.letter}`)));
    if (why.length) nodes.push(el('details', { class: 'fd-why' }, el('summary', {}, 'Why?'), ...why));
    // the check: at most 2 questions, one at a time; the answer (right or wrong) opens Next
    const qs = stepQuestions(s, lessonQs);
    if (!qs.length) answered = { all: true };
    const qi = answered?.qi || 0;
    const q = qs[qi];
    if (q && !answered?.all) {
      const opts = q.options.map((o, k) => el('button', { type: 'button', class: 'btn secondary fd-opt', 'data-n': String(k + 1), onclick: () => {
        const ok = k === q.answerIndex;
        progress = recordAnswer(progress, q.id, ok); save();
        opts.forEach((b, j) => { b.disabled = true; b.setAttribute('disabled', ''); if (j === q.answerIndex) b.setAttribute('data-state', 'right'); else if (j === k) b.setAttribute('data-state', 'wrong'); });
        const right = q.options[q.answerIndex].text;
        say(ok ? 'Yes.' : `Not quite: it is ${right}. Nothing is lost.`);
        if (qi + 1 < qs.length) { answered = { qi: qi + 1 }; setTimeout(() => { if (alive) renderStep(); }, ok ? 500 : 1500); }
        else { answered = { all: true }; renderStep(); }
      } }, o.he ? el('span', { lang: 'he', dir: 'rtl', class: 'alef-he' }, o.text) : o.text));
      nodes.push(el('div', { class: 'card fd-check', role: 'group', 'aria-label': 'Quick check' },
        el('p', {}, el('strong', {}, qs.length > 1 ? `Quick check ${qi + 1} of ${qs.length}: ` : 'Quick check: '), q.prompt, q.promptHe ? ' ' : '', q.promptHe ? heText(q.promptHe, 'alef-he alef-big') : null),
        el('div', { class: 'row', role: 'group', 'aria-label': 'Choices' }, ...opts)));
    } else {
      nodes.push(el('p', { class: 'fd-win', role: 'status' }, el('strong', {}, s.win)),
        el('button', { class: 'btn', type: 'button', id: 'fd-next', onclick: () => win(s) }, i + 1 < onramp.steps.length ? 'Next' : 'Finish'));
    }
    body.replaceChildren(...nodes);
  }
  async function win(s) {
    progress = winStep(progress, onramp, s.id); answered = null;
    await save();
    try { const raw = await storeGet(ctx, STREAK_KEY, null); await storeSet(ctx, STREAK_KEY, recordActivity(raw, Date.now())); } catch { /* best effort */ }
    if (onrampDone(onramp, progress) && lesson) {
      try {
        const act = await import('../curriculum/actions.js');
        const qs = onramp.steps.flatMap((st) => stepQuestions(st, lessonQs)).filter((q) => q.cardId && q.id in progress.answers);
        const results = Object.fromEntries(qs.map((q) => [q.id, progress.answers[q.id]]));
        await act.saveQuickCheck(ctx, lesson, qs, results);
        nextLesson = await findNext();
      } catch { /* the on-ramp still shows its done screen */ }
    }
    say(''); renderStep(); focus();
  }
  function renderDone() {
    const d = onramp.done || {};
    body.replaceChildren(
      el('p', { class: 'muted' }, `${onramp.steps.length} of ${onramp.steps.length} wins · budget ${onrampMinutes(onramp)} min (a design target, not measured)`),
      el('h2', {}, d.title || 'Done'),
      el('p', { class: 'fd-card alef-card' }, heText(onramp.steps.find((s) => s.kind === 'word')?.he || '', 'alef-he alef-huge fd-big')),
      el('p', {}, d.body || ''),
      el('p', {}, el('a', { class: 'btn', id: 'fd-next-lesson', href: nextLesson ? `#/learn?lesson=${nextLesson.id}` : '#/learn' }, nextLesson ? `Continue: ${nextLesson.title}` : 'All lessons')),
      d.preview ? el('p', {}, d.preview, ' ', el('a', { class: 'btn secondary', id: 'fd-preview', href: '#/firstday?part=preview' }, 'Read shalom today')) : null,
      el('p', {}, el('a', { href: '#/' }, 'Back to Home')));
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
    if (s.kind === 'letter') for (const id of s.items) { const l = data.letters.find((x) => x.id === id); nodes.push(el('p', {}, heText(l.he, 'alef-he fd-big alef-big'), ` ${letterSound(content?.consonants?.get?.(id), tradition, { fallbackEn: l.sound }).en} `, listen(l.audio))); }
    if (s.kind === 'vowel') for (const id of s.items) { const v = data.vowels.find((x) => x.id === id); const rec = content?.vowels?.get(id === 'holam-male' ? 'cholam' : id); nodes.push(el('p', {}, heText(v.example, 'alef-he fd-big alef-big'), ` ${rec ? vowelSound(rec, tradition).en : v.sound}. ${v.note}`)); }
    if (s.kind === 'read') {
      const w = wordById(data, s.word);
      nodes.push(el('p', {}, heText(w.he, 'alef-he fd-big alef-word-big')), el('p', {}, `${respell(w.he, tradition) || w.sound} (${LABELS[tradition]} respelling). Say it aloud, then check.`), listen(w.audio), hearNote(),
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
      progress = migrateProgress(await storeGet(ctx, PROGRESS_KEY, null));
      nextLesson = await findNext();
      if (!alive) return;
      // ?part=preview opens the older flow; a learner who was already inside it (legacy record) stays there; everyone else gets the steps
      if (wantPreview() || !onramp || (progress.part === 'preview' && !onrampDone(onramp, progress))) renderPreview();
      else renderStep();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The lesson could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.remove(); };
}
