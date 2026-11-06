// Common phrases and sentences (#/phrases, #/phrases/:id). Preview.
// Playback goes through playPhraseClip, which follows the unmerged shared contract and
// does not play on this checkout.
import { h, heSpan } from '../shell/ui.js';
import {
  TRADITIONS, VOICES, TRAD_LABEL, VOICE_LABEL, loadPhraseScreen, formLabel, addressNotices, audioHonesty, contentHonesty, cellClip, playPhraseClip,
} from './model.js';

const NO_AUDIO = 'No audio yet';
const UNAVAILABLE = 'Audio unavailable. Shared playback is not in this build, so this clip is not played.';
const SLOW_MISSING = 'No separate slow recording. This build does not play the normal file more slowly.';

function readChoice(ctx, key, allowed, fallback) {
  const q = ctx?.query?.[key];
  if (allowed.includes(q)) return q;
  const fromSettings = ctx?.settings?.get?.(key === 'tradition' ? 'congregation' : 'voice') ?? ctx?.settings?.[key === 'tradition' ? 'congregation' : 'voice'];
  return allowed.includes(fromSettings) ? fromSettings : fallback;
}

function choiceRow(label, values, current, onPick) {
  return h('div', { class: 'row', role: 'radiogroup', 'aria-label': label },
    h('span', { class: 'muted' }, label + ': '),
    ...values.map(([id, text]) => h('button', {
      type: 'button',
      class: 'btn secondary',
      role: 'radio',
      'aria-checked': String(current === id),
      'data-choice': id,
      onclick: () => onPick(id),
    }, text)));
}

export function mount(root, ctx) {
  let alive = true;
  const wrap = h('section', { class: 'card alef-phrases', 'aria-labelledby': 'view-title' });
  const h1 = h('h1', { id: 'view-title', tabindex: '-1' }, 'Common phrases and sentences');
  wrap.append(h1, h('p', {}, 'Loading phrases…'));
  root.append(wrap);
  const phraseId = ctx?.params?.id || ctx?.query?.id || '';

  (async () => {
    const { batch, phrases } = await loadPhraseScreen();
    if (!alive) return;
    const byId = new Map(phrases.map((p) => [p.id, p]));
    let tradition = readChoice(ctx, 'tradition', TRADITIONS, 'israeli');
    let voice = readChoice(ctx, 'voice', VOICES, 'f');
    let category = ctx?.query?.category && (batch.categories || []).some((c) => c.id === ctx.query.category) ? ctx.query.category : 'all';
    let showMeaning = ctx?.query?.practice !== '1';
    let showSpelling = false;
    const note = h('p', { class: 'alef-audio-note', role: 'status', 'aria-live': 'polite' });

    const intro = () => [
      h('p', { class: 'draft-flag', role: 'note' }, contentHonesty(phrases[0]?.review) + ' A listed clip is the catalogue row for this exact line, this pronunciation style, and this voice. This build does not play it.'),
      h('p', { class: 'muted' }, 'This is a first set from ALEF’s phrasebook, plus one role-play line. It is not every Hebrew phrase. If the catalogue has no row for this style and voice, you will see “No audio yet”.'),
      h('p', { class: 'muted' }, 'Israel dialogues stay on their own page. They are not repeated here. The role-play line “Can I help you?” has no catalogue row.'),
    ];

    function selectors() {
      return h('div', { class: 'alef-phrases-choices' },
        choiceRow('Pronunciation style', TRADITIONS.map((t) => [t, TRAD_LABEL[t]]), tradition, (id) => { tradition = id; note.textContent = ''; draw(); }),
        choiceRow('Narrator', VOICES.map((v) => [v, v === 'f' ? 'Woman' : 'Man']), voice, (id) => { voice = id; note.textContent = ''; draw(); }));
    }

    function clipLine(form) {
      const normal = form.audio?.[tradition]?.[voice]?.normal || null;
      const slow = form.audio?.[tradition]?.[voice]?.slow || null;
      const listed = normal
        ? h('div', { class: 'row' },
          h('p', {
            class: 'muted alef-noaudio',
            'data-audio-state': 'unavailable',
            'data-clip-id': normal.id,
            'data-audio-speed': 'normal',
          }, UNAVAILABLE),
          h('button', {
            type: 'button',
            class: 'btn secondary',
            'data-act': 'listen',
            'aria-label': `Listen: ${formLabel(form) || 'phrase'}. ${TRAD_LABEL[normal.tradition]}, ${VOICE_LABEL[normal.voice]}. Playback may be unavailable.`,
            onclick: () => ask(normal, 'normal'),
          }, 'Listen'))
        : h('p', { class: 'muted alef-noaudio', 'data-audio-state': 'none' }, NO_AUDIO);
      const slowNode = slow
        ? h('button', {
          type: 'button',
          class: 'btn secondary',
          'data-act': 'listen-slow',
          'data-clip-id': slow.id,
          onclick: () => ask(slow, 'slow'),
        }, 'Listen slowly')
        : h('p', { class: 'muted alef-noaudio', 'data-audio-speed': 'slow', 'data-audio-state': 'none' }, SLOW_MISSING);
      const detail = normal ? h('span', { class: 'muted' }, audioHonesty(normal)) : null;
      return h('div', {}, listed, slowNode, detail);
    }

    async function ask(clip, rate) {
      note.textContent = 'Checking playback…';
      try {
        const result = await playPhraseClip(ctx, {
          kind: clip.kind, id: clip.id, voice: clip.voice, tradition: clip.tradition, rate,
        });
        if (!alive) return;
        if (result.source === 'file') note.textContent = audioHonesty(clip);
        else if (result.reason === 'playback-contract-not-landed') note.textContent = UNAVAILABLE;
        else note.textContent = 'No audio yet. Nothing else was played.';
      } catch {
        if (alive) note.textContent = 'No audio yet. Nothing else was played.';
      }
    }

    function practiceRow() {
      return h('div', { class: 'row' },
        h('button', {
          type: 'button',
          class: 'btn secondary',
          'aria-pressed': String(!showMeaning),
          'data-act': 'meaning',
          onclick: () => { showMeaning = !showMeaning; draw(); },
        }, showMeaning ? 'Practice: hide the meaning' : 'Show the meaning'),
        h('button', {
          type: 'button',
          class: 'btn secondary',
          'aria-pressed': String(showSpelling),
          'data-act': 'spelling',
          onclick: () => { showSpelling = !showSpelling; draw(); },
        }, showSpelling ? 'Hide the spelling' : 'Show the spelling'));
    }

    function drawDetail(phrase) {
      h1.textContent = phrase.categoryLabel;
      const blocks = phrase.forms.map((form) => {
        const label = formLabel(form);
        const spelling = showSpelling && form.translit ? h('p', { class: 'alef-translit' }, form.translit) : null;
        const missingSpelling = showSpelling && !form.translit ? h('p', { class: 'muted' }, 'No spelling is stored for this line.') : null;
        return h('div', { class: 'card', 'data-form': form.key },
          label ? h('p', { class: 'muted' }, label) : null,
          heSpan(form.he, 'alef-he alef-word-big'),
          clipLine(form),
          spelling,
          missingSpelling);
      });
      const meaning = showMeaning
        ? h('p', { 'data-meaning': 'shown' }, phrase.en)
        : h('p', { class: 'muted', 'data-meaning': 'hidden' }, 'Meaning hidden. Read or listen, then show it.');
      const sourceLine = phrase.source.kind === 'gender-paradigm'
        ? 'Role-play line from the existing “say it as me” set. No catalogue clip matches these sentences.'
        : 'Phrasebook line. The spelling, when shown, is the one stored with that line.';
      const notices = addressNotices(phrase).map((n) => h('p', { class: 'draft-flag', role: 'note', 'data-notice': n.id }, n.text));
      wrap.replaceChildren(h1, ...intro(), selectors(), note, practiceRow(),
        h('p', { class: 'muted' }, sourceLine),
        ...notices,
        ...blocks,
        meaning,
        h('p', { class: 'muted' }, contentHonesty(phrase.review)),
        h('a', { class: 'btn secondary', href: '#/phrases' }, 'All phrases'));
    }

    function drawList() {
      h1.textContent = 'Common phrases and sentences';
      const cats = [{ id: 'all', label: 'All' }, ...(batch.categories || [])];
      const tabs = h('div', { class: 'row', role: 'toolbar', 'aria-label': 'Categories' },
        ...cats.map((c) => {
          const count = c.id === 'all' ? phrases.length : phrases.filter((p) => p.category === c.id).length;
          return h('button', {
            type: 'button',
            class: 'btn secondary',
            'aria-pressed': String(category === c.id),
            'data-category': c.id,
            onclick: () => { category = c.id; draw(); },
          }, `${c.label} (${count})`);
        }));
      const shown = phrases.filter((p) => category === 'all' || p.category === category);
      const items = shown.map((p) => {
        const has = !!cellClip(p, tradition, voice, 'normal');
        const q = `?tradition=${tradition}&voice=${voice}`;
        return h('li', { class: 'alef-item', 'data-phrase': p.id },
          h('div', { class: 'alef-item-body' },
            h('div', { class: 'muted' }, p.categoryLabel),
            ...p.forms.map((f) => h('div', {}, heSpan(f.he, 'alef-he alef-word'))),
            h('div', {}, p.en),
            h('div', { class: 'muted', 'data-audio-state': has ? 'unavailable' : 'none' }, has ? 'Clip listed. Playback unavailable in this build.' : NO_AUDIO)),
          h('a', { class: 'btn secondary', href: `#/phrases/${encodeURIComponent(p.id)}${q}` }, 'Open'));
      });
      wrap.replaceChildren(h1, ...intro(), selectors(), note, tabs,
        h('p', { class: 'muted' }, `${shown.length} in this list. ${phrases.length} in the set.`),
        h('ul', { class: 'alef-items' }, ...items));
    }

    function draw() {
      if (!alive) return;
      if (!phraseId) { drawList(); return; }
      const phrase = byId.get(phraseId);
      if (!phrase) {
        h1.textContent = 'Common phrases and sentences';
        wrap.replaceChildren(h1, h('p', { role: 'alert' }, `There is no phrase “${phraseId}”.`), h('a', { class: 'btn', href: '#/phrases' }, 'All phrases'));
        return;
      }
      drawDetail(phrase);
    }
    draw();
  })().catch(() => {
    if (!alive) return;
    wrap.replaceChildren(h1, h('p', { role: 'alert' }, 'Could not load phrases. Reload the page, then try again.'));
  });

  return () => { alive = false; wrap.remove(); };
}
