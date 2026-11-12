// Common phrases and sentences (#/phrases, #/phrases/:id). Preview.
// Playback goes through playPhraseClip: the exact catalogue row for the chosen
// style and voice, or — as its own labelled button — another slot's own row,
// or the device voice where no row exists (usability review U-02).
import { h, heSpan } from '../shell/ui.js';
import { DEVICE_LABEL } from '../shell/audio-access.js';
import { speechText } from '../shell/names.js';
import { playbackTradition, isAccentClip } from '../audio/player.js';
import {
  TRADITIONS, VOICES, TRAD_LABEL, VOICE_LABEL, loadPhraseScreen, formLabel, addressNotices, audioHonesty, contentHonesty, cellClip, playPhraseClip,
} from './model.js';

const NO_AUDIO = 'No audio yet';
const SLOW_MISSING = 'No separate slow recording. This page does not play the normal file more slowly.';
const SETTING_VOICE = { m: 'the man’s voice', f: 'the woman’s voice' };

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
      h('p', { class: 'draft-flag', role: 'note' }, contentHonesty(phrases[0]?.review) + ' A listed clip is the catalogue row for this exact line, this pronunciation style, and this voice. Tap Listen to hear it.'),
      h('p', { class: 'muted' }, 'This is a first set from Aleph’s phrasebook, plus one role-play line. It is not every Hebrew phrase. If the catalogue has no row for this style and voice, the page offers another voice’s own clip, or the device voice — each labelled as what it is.'),
      h('p', { class: 'muted' }, 'Israel dialogues stay on their own page. They are not repeated here. The role-play line “Can I help you?” has its own clip for each of the four speaker and addressee pairs.'),
    ];

    function selectors() {
      // U-05: the page's choices start from Settings and say so; these
      // buttons change this page only, Settings changes everywhere.
      const sVoice = ctx?.settings?.get?.('voice'); const sTrad = ctx?.settings?.get?.('congregation');
      const fromSettings = h('p', { class: 'muted', 'data-settings-mirror': '' },
        `Voice and style start from your Settings (${SETTING_VOICE[VOICES.includes(sVoice) ? sVoice : 'f']}, ${TRAD_LABEL[TRADITIONS.includes(sTrad) ? sTrad : 'israeli']} style). These buttons change this page only; change them in Settings to change everywhere.`);
      return h('div', { class: 'alef-phrases-choices' },
        fromSettings,
        choiceRow('Pronunciation style', TRADITIONS.map((t) => [t, TRAD_LABEL[t]]), tradition, (id) => { tradition = id; note.textContent = ''; draw(); }),
        choiceRow('Narrator', VOICES.map((v) => [v, v === 'f' ? 'Woman' : 'Man']), voice, (id) => { voice = id; note.textContent = ''; draw(); }));
    }

    // Other slots of this form that DO have a normal clip, best offer first:
    // same narrator in Israeli, then the other narrator in Israeli, then the rest.
    function ladderClips(form) {
      const out = [];
      for (const t of TRADITIONS) for (const v of VOICES) {
        if ((t === tradition || t === playbackTradition(tradition)) && v === voice) continue;
        const c = form.audio?.[t]?.[v]?.normal;
        if (!c) continue;
        if (t !== 'israeli' && !isAccentClip(c)) continue; // a retired slot (an older respelled Sephardi/Ashkenazi file) is not offered
        out.push(c);
      }
      const rank = (c) => (c.tradition === 'israeli' ? 0 : 2) + (c.voice === voice ? 0 : 1);
      return out.sort((a, b) => rank(a) - rank(b));
    }

    function clipLine(form) {
      // The row that PLAYS for this style: the style's own row when it is an admitted accent clip (src/audio/player.js
      // isAccentClip: an Israeli voice reading the respelling, or a tempo-capped older clip), otherwise the Israeli row
      // (PLAYBACK_TRADITION, owner decisions 2026-11-07); the button and caption name the row's real tradition.
      const played = playbackTradition(tradition, form.audio?.[tradition]?.[voice]?.normal);
      const normal = form.audio?.[played]?.[voice]?.normal || null;
      const slow = form.audio?.[played]?.[voice]?.slow || null;
      let listed;
      if (normal) {
        listed = h('div', { class: 'row' },
          h('button', {
            type: 'button',
            class: 'btn secondary',
            'data-act': 'listen',
            'data-audio-speed': 'normal',
            'aria-label': `Listen: ${formLabel(form) || 'phrase'}. ${TRAD_LABEL[normal.tradition]}, ${VOICE_LABEL[normal.voice]}.`,
            onclick: (e) => ask(normal, 'normal', e?.currentTarget),
          }, 'Listen'));
      } else {
        const ladder = ladderClips(form);
        if (ladder.length) {
          // U-02 ladder, step 1: another slot's own clip, as its own button,
          // labelled with its real voice and style — never passed off as the
          // chosen slot.
          const best = ladder[0];
          listed = h('div', {},
            h('p', { class: 'muted alef-noaudio', 'data-audio-state': 'ladder' }, `No clip in ${TRAD_LABEL[tradition]}, ${VOICE_LABEL[voice]} for this line yet.`),
            h('div', { class: 'row' }, h('button', {
              type: 'button',
              class: 'btn secondary',
              'data-act': 'listen-ladder',
              'data-clip-id': best.id,
              'data-audio-speed': 'normal',
              'aria-label': `Listen: ${formLabel(form) || 'phrase'}. ${TRAD_LABEL[best.tradition]}, ${VOICE_LABEL[best.voice]}.`,
              onclick: (e) => ask(best, 'normal', e?.currentTarget),
            }, `Hear the ${VOICE_LABEL[best.voice]}’s voice (${TRAD_LABEL[best.tradition]})`)),
            h('span', { class: 'muted' }, audioHonesty(best)));
        } else if (ctx?.audio && typeof ctx.audio.play === 'function') {
          // U-02 ladder, step 2: no catalogue row anywhere — the device voice,
          // labelled as a device voice before it makes a sound.
          listed = h('div', {},
            h('p', { class: 'muted alef-noaudio', 'data-audio-state': 'device' }, 'No clip for this line yet.'),
            h('div', { class: 'row' }, h('button', {
              type: 'button',
              class: 'btn secondary',
              'data-act': 'listen-device',
              'aria-label': `Listen with the device voice: ${formLabel(form) || 'phrase'}. ${DEVICE_LABEL}.`,
              onclick: (e) => askDevice(form, e?.currentTarget),
            }, 'Hear the device voice')),
            h('span', { class: 'muted' }, DEVICE_LABEL + '.'));
        } else {
          listed = h('p', { class: 'muted alef-noaudio', 'data-audio-state': 'none' }, NO_AUDIO);
        }
      }
      const slowNode = slow
        ? h('button', {
          type: 'button',
          class: 'btn secondary',
          'data-act': 'listen-slow',
          'data-clip-id': slow.id,
          onclick: (e) => ask(slow, 'slow', e?.currentTarget),
        }, 'Listen slowly')
        : h('p', { class: 'muted alef-noaudio', 'data-audio-speed': 'slow', 'data-audio-state': 'none' }, SLOW_MISSING);
      const detail = normal ? h('span', { class: 'muted', 'data-clip-id': normal.id }, audioHonesty(normal)) : null;
      return h('div', {}, listed, slowNode, detail);
    }

    async function ask(clip, rate, btn) {
      note.textContent = 'Playing…';
      if (btn) { btn.disabled = true; if (btn.classList) btn.classList.add('is-playing'); }
      try {
        const result = await playPhraseClip(ctx, {
          kind: clip.kind, id: clip.id, voice: clip.voice, tradition: clip.tradition, rate,
        });
        if (!alive) return;
        if (result.source === 'file') note.textContent = audioHonesty(clip);
        else note.textContent = 'No audio yet. Nothing else was played.';
      } catch {
        if (alive) note.textContent = 'No audio yet. Nothing else was played.';
      } finally {
        if (btn) { btn.disabled = false; if (btn.classList) btn.classList.remove('is-playing'); }
      }
    }

    async function askDevice(form, btn) {
      note.textContent = DEVICE_LABEL + '.';
      if (btn) { btn.disabled = true; if (btn.classList) btn.classList.add('is-playing'); }
      try {
        const r = await ctx.audio.play('line', 'phrase-device-voice', {
          text: speechText(form.he), tradition: 'israeli', voice, allowMismatchedTts: true,
        });
        if (!alive) return;
        note.textContent = r && r.source === 'tts-fallback' ? DEVICE_LABEL + '.' : 'No audio yet. Nothing else was played.';
      } catch {
        if (alive) note.textContent = 'No audio yet. Nothing else was played.';
      } finally {
        if (btn) { btn.disabled = false; if (btn.classList) btn.classList.remove('is-playing'); }
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
        const has = !!cellClip(p, playbackTradition(tradition, cellClip(p, tradition, voice, 'normal')), voice, 'normal');
        const anyClip = TRADITIONS.some((t) => VOICES.some((v) => cellClip(p, t, v, 'normal')));
        const q = `?tradition=${tradition}&voice=${voice}`;
        return h('li', { class: 'alef-item', 'data-phrase': p.id },
          h('div', { class: 'alef-item-body' },
            h('div', { class: 'muted' }, p.categoryLabel),
            ...p.forms.map((f) => h('div', {}, heSpan(f.he, 'alef-he alef-word'))),
            h('div', {}, p.en),
            h('div', { class: 'muted', 'data-audio-state': has ? 'file' : anyClip ? 'ladder' : 'none' }, has ? 'Clip listed — open to listen.' : anyClip ? 'No clip in this voice — open for other voices.' : NO_AUDIO)),
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
