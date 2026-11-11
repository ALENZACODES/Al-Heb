/**
 * Gender drill (#/gender-drill), PREVIEW and DRAFT. The learner says whether they are a man or a woman (or asks to see both forms);
 * "I" forms then follow that choice. There is no default: until a choice is stored nothing is drilled.
 * Choice questions (agreement, listener, noun gender) are checked against the data; "say it" cards are self-reported.
 * The learner's gender is the shared Settings value `gender` (Settings > My gender); this page reads and writes that. When the ctx has no
 * settings object (tests) it falls back to the old gender.v1 field. Store key gender.v1 keeps { asked, right } (and the old speaker field). ctx extras for tests: ctx.genderData = {templates, paradigms}.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { sourcesLine } from '../shell/sources.js';
import { mixed } from '../hebrewtext/mixed.js';
import { loadTemplates, loadParadigms } from './loader.js';
import { learnerGender, setLearnerGenderSetting } from '../shell/settings.js';
import { STORE_KEY, LEGACY_STORE_KEY, SPEAKERS, SPEAKER_LABEL, normalizePrefs, setSpeaker, buildDrill, isChoice, grade } from './model.js';

export const DRAFT_NOTE = 'Draft and unreviewed: no Hebrew teacher has checked these forms. Words and vowel marks come from the word list. The sentences are simple: "I / you / he / she" plus a word. The word list has no feminine adjectives, so adjectives that change with gender are not drilled here.';

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-genderdrill', 'aria-labelledby': 'gd-title' });
  const h1 = el('h1', { id: 'gd-title', tabindex: '-1' }, 'Gender drill');
  const who = el('div', { class: 'gd-who' });
  const body = el('div', { class: 'gd-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'gd-status' });
  wrap.append(h1, el('p', { class: 'gd-draft' }, DRAFT_NOTE), who, body, status, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  let alive = true, tpl = null, pars = [], prefs = normalizePrefs(null), items = [], idx = 0, picked = null, shown = false, other = false, round = 0;
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, STORE_KEY, prefs);
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  const form = (f) => el('p', {}, heText(f.he, 'alef-he gd-big'), f.translit ? ` (${f.translit})` : ' (no transliteration in the data)');

  function renderWho() {
    who.replaceChildren(el('p', { id: 'gd-who-label' }, 'Who is speaking, in this drill?'),
      el('div', { role: 'group', 'aria-labelledby': 'gd-who-label' }, ...SPEAKERS.map((s) => btn(s === 'both' ? 'Show both forms' : s === 'm' ? 'I am a man' : 'I am a woman',
        () => { prefs = setSpeaker(prefs, s); if (!setLearnerGenderSetting(ctx, s)) save(); start(); say(`Saved: ${SPEAKER_LABEL[s]}. You can change this any time.`); }, { class: 'btn secondary', 'aria-pressed': String(prefs.speaker === s) }))));
  }
  function start() {
    const d = buildDrill(tpl, prefs.speaker, { seed: 500 + round * 17, count: 8, paradigms: pars });
    items = d.items; idx = 0; picked = null; shown = false; other = false; renderWho(); renderItem(d.needsChoice);
  }
  function next() { idx += 1; picked = null; shown = false; other = false; renderItem(false); }

  function renderItem(needsChoice) {
    if (needsChoice) { body.replaceChildren(el('p', {}, 'Choose above first. Aleph does not guess your gender, and it will not drill you in masculine forms by default.')); return; }
    if (idx >= items.length) {
      body.replaceChildren(el('p', {}, `Round done. Checked questions, all time: ${prefs.right} right of ${prefs.asked}. "Say it" cards are not counted because you grade them yourself.`), btn('Another round', () => { round += 1; start(); }));
      return;
    }
    const it = items[idx], nodes = [el('p', {}, `Item ${idx + 1} of ${items.length}`), el('p', { class: 'gd-prompt' }, ...mixed(it.prompt))];
    if (it.type === 'self-both') {
      nodes.push(el('p', {}, 'If you are a man:'), form(it.forms.m), el('p', {}, 'If you are a woman:'), form(it.forms.f), btn('Next', next));
    } else if (it.type === 'self') {
      if (!shown) nodes.push(btn('Show my form', () => { shown = true; renderItem(false); }));
      else {
        nodes.push(form(it.main));
        nodes.push(other ? el('div', {}, el('p', {}, 'The other gender says (for recognition only):'), form(it.other)) : btn('Show the other gender, for comparison', () => { other = true; renderItem(false); }));
        nodes.push(btn('I said it right', next, { 'aria-label': `I said it right, item ${idx + 1}` }), btn('Not yet', next, { 'aria-label': `Not yet, item ${idx + 1}` }));
      }
    } else if (isChoice(it)) {
      const res = picked ? grade(it, picked) : null;
      nodes.push(el('div', { role: 'group', 'aria-label': 'Answers' }, ...it.options.map((o) => btn(o.he ? [heText(o.he), o.translit ? ` (${o.translit})` : ''] : o.label, () => choose(o.id), { disabled: !!picked, class: 'btn secondary', 'aria-pressed': String(picked === o.id) }))));
      if (res) nodes.push(el('p', {}, res.correct ? 'Right. ' : 'Not this one. ', ...mixed(it.explain)), btn(idx + 1 < items.length ? 'Next' : 'Finish round', next));
    }
    body.replaceChildren(...nodes);
  }
  function choose(id) {
    const it = items[idx], ok = grade(it, id).correct;
    picked = id; prefs = { ...prefs, asked: prefs.asked + 1, right: prefs.right + (ok ? 1 : 0) }; save(); renderItem(false); say(ok ? 'Right.' : 'Not this one.');
  }

  (async () => {
    try {
      const d = ctx?.genderData;
      tpl = d?.templates || await loadTemplates();
      pars = d ? (d.paradigms || []) : await loadParadigms().catch(() => []);
      prefs = normalizePrefs(await storeGet(ctx, STORE_KEY, null), await storeGet(ctx, LEGACY_STORE_KEY, null));
      if (typeof ctx?.settings?.get === 'function') prefs = { ...prefs, speaker: learnerGender(ctx) }; // the shared setting is the only source (unset stays unset)
      if (alive) start();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The word list could not be loaded. If you are offline, open this page once while online, or use "Use Aleph offline" in the More menu to download everything. Nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
