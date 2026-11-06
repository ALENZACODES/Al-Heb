// Game 22 — manual spoken-language rhythm practice only.
// No prayer or cantorial recordings are used for arcade scores.
// Syllable-to-recording timestamps are not available; the registry's audio sync gate remains open.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.karaokebeat.v1';
export function buildCadenceDeck(phrasebook) {
  return (phrasebook?.entries || []).filter(row =>
    row.id && row.he && row.en && ['directions','politeness','greetings'].includes(row.situation) &&
    row.he.trim().split(/\s+/u).length >= 3 && row.he.trim().split(/\s+/u).length <= 7)
    .map(row => ({ id:row.id, he:row.he, en:row.en, tokens:row.he.trim().split(/\s+/u) }));
}
export function cadenceIsComplete(record, taps) {
  return !!record?.tokens?.length && taps === record.tokens.length;
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], round = 0, beats = 0, previous = 0, intervals = [];
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 5 });
  const status = h('p', { class:'game-status', role:'status', 'aria-live':'polite' }, 'Loading sourced speaking phrases…');
  const board = h('div', { class:'game-board' });
  const article = h('article', { class:'card game-card game-karaokebeat' },
    h('h1', { id:'view-title' }, 'The Karaoke Beat Matcher'),
    h('p', {}, 'Manual rhythm training: tap each Hebrew word in reading order while speaking aloud.'),
    h('p', { class:'muted' }, 'No syllable-timestamped recordings are supplied. This is self-paced word rhythm, not audio-synchronised karaoke. Sacred prayers and cantorial clips are excluded.'), status, board);
  root.replaceChildren(article);
  function paint() {
    if (!alive || !article.isConnected) return;
    if (round >= Math.min(8, deck.length)) {
      board.replaceChildren(resultsCard(h, heSpan, session, { title:'Rhythm study finished', onAgain: () => {
        round = 0; beats = 0; previous = 0; intervals = [];
        session = createSession({store:ctx?.store,storeKey:STORE_KEY,par:5}); paint();
      } }));
      return;
    }
    const record = deck[round], words = h('div',{class:'game-karaoke-tokens',dir:'rtl'},
      ...record.tokens.map((token,i)=>h('span',{class:'game-karaoke-token' +
        (i === beats ? ' game-karaoke-current' : '')},heSpan(token,'he game-he-sm'))));
    const tap = h('button',{type:'button',class:'btn',onclick:()=>{
      if (!alive || beats >= record.tokens.length) return;
      const now = performance.now();
      if (previous > 0) intervals.push(now-previous);
      previous = now; beats++;
      if (cadenceIsComplete(record, beats)) {
        // Manual cadence is only scored for an evenly spaced learner-generated beat;
        // no claim that it is aligned to speech or an audio file.
        const mean = intervals.length ? intervals.reduce((a,b)=>a+b,0)/intervals.length : 0;
        const variation = mean > 0 ? Math.max(...intervals.map(t=>Math.abs(t-mean)/mean)) : 1;
        const ok = intervals.length >= 2 && mean >= 180 && mean <= 1800 && variation <= 0.4;
        session.answer(ok); sfx.play(ok ? 'success' : 'miss'); status.textContent = ok ?
          'Consistent manual tempo; no recording synchronization assessed.' :
          'Try a steadier manual rhythm.';
        if (ok) round++;
        beats = 0; previous = 0; intervals = []; paint(); return;
      }
      paint();
    }},'Tap next spoken word');
    const reset = h('button',{type:'button',class:'btn secondary',onclick:()=>{
      beats=0;previous=0;intervals=[];paint();
    }},'Restart phrase');
    board.replaceChildren(h('p',{},record.en),words,h('p',{},'Beat '+beats+' of '+record.tokens.length),tap,reset);
  }
  loadJson('data/corpus/phrasebook.json').then(data=>{
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildCadenceDeck(data)).slice(0,8);
    if (deck.length < 4) { status.textContent = 'Insufficient non-sacred phrase records.'; return; }
    paint();
  }).catch(()=>{ if(alive) status.textContent='Source phrases unavailable.'; });
  return ()=>{alive=false; leaveSfx();};
}
