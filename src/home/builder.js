import { reactRimon } from '../shell/rimon-events.js';
import { h, heSpan } from '../shell/ui.js';
import { createSession } from '../games/engine.js';
import { BUILDER_KEY, GAME_KEY, wordsFor, trayFor, tokensFor, phonetics, clipFor, recordWord } from './builder-model.js';

export function builderNode(ctx = {}) {
  const host = h('section', { class: 'home-builder', 'aria-label': 'Build Hebrew words' });
  const status = h('p', { class: 'builder-status', role: 'status', 'aria-live': 'polite' }, 'Loading your words…');
  host.append(status);
  let words = [], symbols, level = 1, word, placed = 0, withVowels = false, done = false, mistakes = 0;
  let voice = ctx.settings?.get('voice') || 'f';
  let tradition = ctx.settings?.get('congregation') || 'israeli';
  let audio, disposed = false, hoverTimer, held = false, observer, unsubscribe;
  let playSequence = 0;
  const stop = () => { playSequence++; if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } };
  function dispose() { disposed = true; stop(); clearTimeout(hoverTimer); unsubscribe?.(); observer?.disconnect(); }
  host.dispose = dispose;
  async function play(row, rate = 1) {
    if (disposed) return;
    stop();
    const sequence = playSequence;
    audio ||= new Audio();
    audio.src = clipFor(row, voice);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    try { await audio.play(); }
    catch { if (!disposed && sequence === playSequence) status.textContent = 'Sound could not start. Tap Play to try again.'; }
  }
  const button = (text, action, attrs = {}) => h('button', { type: 'button', class: 'btn secondary', onclick: action, ...attrs }, text);
  const controls = row => h('span', { class: 'builder-audio' },
    button('▶ Play', () => play(row), { 'aria-label': 'Play ' + (row.translit_israeli || row.translit) }),
    button('Slow · 0.6×', () => play(row, 0.6), { 'aria-label': 'Play slowly ' + (row.translit_israeli || row.translit) }));
  const symbolInfo = h('div', { class: 'builder-symbol-info', 'aria-live': 'polite' });
  function describe(s, speak = false) {
    symbolInfo.replaceChildren(heSpan(s.nikud), h('span', {}, s.translit + ' — ' + s.meaning_en), controls(s));
    if (speak) play(s);
  }
  function symbolButton(s) {
    const mark = !/[א-ת]/.test(s.glyph);
    const b = button('', () => { clearTimeout(hoverTimer); if (held) { held = false; return; } place(s.glyph); }, {
      class: 'builder-key', 'data-glyph': s.glyph, title: s.translit + ' — ' + s.meaning_en,
      'aria-label': 'Add ' + s.translit,
      onmouseenter: () => { describe(s); clearTimeout(hoverTimer); hoverTimer = setTimeout(() => describe(s,true),650); },
      onmouseleave: () => clearTimeout(hoverTimer),
      onfocus: () => describe(s),
      onpointerdown: () => { held=false; clearTimeout(hoverTimer); hoverTimer=setTimeout(()=>{held=true;describe(s,true);},550); },
      onpointerup: () => clearTimeout(hoverTimer), onpointercancel: () => clearTimeout(hoverTimer),
    });
    b.append(heSpan((mark ? '◌' : '') + s.glyph), h('span', { class: 'builder-key-name' }, s.translit));
    return b;
  }
  const target = h('div', { class: 'builder-target' });
  const slots = h('div', { class: 'builder-slots', dir: 'rtl', 'aria-label': 'Your word' });
  const tray = h('div', { class: 'builder-tray', dir: 'rtl' });
  const vowels = h('details', { class: 'builder-vowels' });
  const wordSelect = h('select', { 'aria-label': 'Choose a word', onchange: () => choose(words.find(w => w.id === wordSelect.value)) });
  const levelSelect = h('select', { 'aria-label': 'Builder level', onchange: () => { level=Number(levelSelect.value); drawChoices(); } },
    ...[1,2,3,4,5].map(n => h('option', { value: n }, 'Level ' + n)));
  const voiceSelect = h('select', { 'aria-label': 'Builder voice', onchange: () => { voice=voiceSelect.value; stop(); ctx.settings?.set({voice}); } },
    h('option',{value:'m'},'Ari'),h('option',{value:'f'},'Noa'));
  voiceSelect.value = voice;
  const traditionSelect = h('select', { 'aria-label': 'Phonetic style', onchange: () => { tradition=traditionSelect.value; ctx.settings?.set({congregation:tradition}); drawTarget(); } },
    ...['israeli','sephardi','ashkenazi'].map(t=>h('option',{value:t},t[0].toUpperCase()+t.slice(1))));
  traditionSelect.value = tradition;
  const tally = h('p',{class:'builder-tally'});
  function drawTally() {
    const saved = ctx.store?.get(BUILDER_KEY) || {};
    tally.textContent = `${Object.keys(saved.built || {}).length} different words built · ${saved.points || 0} points`;
  }
  function drawTarget() {
    if (!word) return;
    target.replaceChildren(heSpan(word.nikud,'he builder-word'),h('p',{},phonetics(word,tradition)),h('p',{},word.meaning_en),controls(word));
  }
  function drawSlots() {
    if (withVowels) {
      slots.replaceChildren(heSpan(tokensFor(word,true).slice(0,placed).join('') || '·'));
    } else {
      const clusters = word.nikud.normalize('NFD').match(/[א-ת][\u0591-\u05c7]*/gu) || [];
      slots.replaceChildren(...word.letters.map((_,i)=>heSpan(i<placed?clusters[i]:'·','he builder-slot')));
    }
  }
  function choose(next) {
    stop(); clearTimeout(hoverTimer); word=next; placed=0; done=false; mistakes=0; wordSelect.value=word.id;
    drawTarget(); drawSlots();
    status.textContent = withVowels ? 'Build right to left. Add each letter, then its vowel and dots.' : 'Build right to left. Tap the letters; vowel marks are added for you.';
  }
  function drawChoices() {
    const available = wordsFor(words,level);
    wordSelect.replaceChildren(...available.map(w=>h('option',{value:w.id},w.translit_israeli+' — '+w.meaning_en)));
    tray.replaceChildren(...trayFor(level).map(g=>symbolButton(symbols.letters.find(s=>s.glyph===g))));
    choose(available.find(w=>w.hebrew==='אבא') || available[0]);
  }
  function place(glyph) {
    if(done || !word) return;
    const tokens=tokensFor(word,withVowels);
    if(tokens[placed]!==glyph) { reactRimon('sad'); mistakes++; const needed=[...symbols.letters,...symbols.marks].find(s=>s.glyph===tokens[placed]); status.textContent='Try '+(needed?.translit || 'the next mark')+' next. You can do it.'; return; }
    placed++; drawSlots();
    if(placed<tokens.length) { status.textContent=`Good — ${tokens.length-placed} ${withVowels?'letters or marks':'letters'} to go.`; return; }
    done=true;
    play(word);
    try {
      const session=createSession({store:ctx.store,storeKey:GAME_KEY,par:mistakes ? 2 : 1});
      session.answer(true);
      const result=recordWord(ctx.store,word,session.score);
      let badge='';
      if(result.fresh) {
        session.saveBest();
        // The full awards rubric is only needed after a completed word, not
        // on every first visit to the home screen.
        import('../awards/eligibility.js').then(({ settleAwards }) => {
          const award = settleAwards(ctx.store, null, Date.now());
          if (!disposed && award.newly.includes('yolo')) status.textContent += ' First-attempt badge earned!';
        }).catch(() => {});
      }
      status.textContent=`You built ${phonetics(word,tradition)} — ${word.meaning_en}. ${result.fresh?'+10 points.':'Already counted; great practice!'}${badge}`;
      drawTally();
    } catch { status.textContent='Word complete! Your progress could not be saved on this device.'; }
  }
  Promise.all(['data/builder_words.json','data/builder_symbols.json'].map(async path=>{
    const response=await fetch(path); if(!response.ok) throw new Error('load'); return response.json();
  })).then(([loadedWords,loadedSymbols])=>{
    if(disposed) return;
    words=loadedWords; symbols=loadedSymbols;
    const mode=h('input',{type:'checkbox',onchange:()=>{withVowels=mode.checked;vowels.open=withVowels;choose(word);}});
    vowels.append(h('summary',{},'Vowel marks and dots'),h('p',{},'Turn on “Practise vowel marks” to place these yourself.'),
      h('div',{class:'builder-tray',dir:'rtl'},...symbols.marks.map(symbolButton)));
    host.replaceChildren(h('h2',{},'Build a Hebrew word'),h('p',{},`${words.length} words to discover. Start small and choose a higher level when you are ready.`),
      h('div',{class:'builder-options'},h('label',{},'Level ',levelSelect),h('label',{},'Voice ',voiceSelect),h('label',{},'Phonetics ',traditionSelect)),
      h('p',{class:'builder-audio-note'},'Both voices read Israeli Hebrew. Phonetic style changes only the English letters.'),
      h('label',{class:'builder-choice'},'Choose a word ',wordSelect),target,slots,tray,
      h('label',{class:'builder-mode'},mode,' Practise vowel marks'),vowels,symbolInfo,status,
      h('div',{class:'builder-actions'},button('Start over',()=>choose(word)),button('Next word',()=>{const list=wordsFor(words,level);choose(list[(list.findIndex(w=>w.id===word.id)+1)%list.length]);}),h('a',{href:'#/awards',class:'btn secondary'},'My badges')),tally);
    drawChoices(); drawTally();
    unsubscribe=ctx.settings?.subscribe(()=>{voice=ctx.settings.get('voice');tradition=ctx.settings.get('congregation');voiceSelect.value=voice;traditionSelect.value=tradition;drawTarget();});
    observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});
    observer.observe(document.body,{childList:true,subtree:true});
  }).catch(()=>{if(!disposed)status.textContent='The word list could not load. Reload this page to try again.';});
  return host;
}
