// Print plates use existing artwork; marks are typeset from the corpus table.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const GROUPS = {"scroll":"Scroll","bimah":"Bimah","practice":"Reading practice","haftarah":"Haftarah","wheel":"Torah cycle","qa":"Questions and practice"};
const ART_MARKS = ['etnachta','kadma','karney_para','mahapakh','mercha','munach','pashta','pazer','segolta','sof_pasuk','telisha','tifcha','zakef_gadol','zakef_katan','zarka'];
export const TORAH_PLATE_CSS = '.torah-plates .plates-grid{display:grid;grid-template-columns:1fr 1fr;gap:12pt}.torah-plates figure{margin:0;break-inside:avoid}.torah-plates img{display:block;width:100%;height:2.3in;object-fit:contain}.torah-plates figcaption{font-size:9pt}.torah-plates .mark{font-size:36pt;line-height:1.8;display:block}';
export function torahPlates({img, table}) {
  const figure = (stem, caption) => '<figure><img src="'+esc(img(stem))+'" alt="'+esc(caption)+'"/><figcaption>'+esc(caption)+'</figcaption></figure>';
  const section = (id, title, body) => '<section class="chapter torah-plates" id="'+id+'"><h2>'+esc(title)+'</h2>'+body+'</section>';
  const chunks = (items, n) => Array.from({length:Math.ceil(items.length/n)}, (_, i) => items.slice(i*n,i*n+n));
  const craft = Object.entries(GROUPS).flatMap(([group,title]) => chunks(Array.from({length:10},(_,i)=>({stem:'CRAFT_'+group+'_'+String(i+1).padStart(2,'0'),caption:title+' · '+(i+1)})),4).map((items,i)=>section('craft-'+group+'-'+(i+1),'Torah craft: '+title+' · '+(i+1),'<div class="plates-grid">'+items.map(x=>figure(x.stem,x.caption)).join('')+'</div>'))).join('');
  const aliases = {mahapakh:'mahpach',segolta:'segol',sof_pasuk:'sof-pasuk',karney_para:'karnei-parah',telisha:'telisha-ketanah',tifcha:'tipcha'};
  const marks = ART_MARKS.map(stem => {
    const id = aliases[stem] ?? stem.replaceAll('_','-');
    const mark = table.prose.find(x=>x.id===id);
    const label = stem === 'telisha' ? 'Telisha: both forms' : mark ? mark.ashkenazi+' / '+mark.sephardi : stem.replaceAll('_',' ');
    const glyph = stem === 'telisha' ? '<span class="he mark" lang="he" dir="rtl">'+table.prose.filter(x=>x.id.startsWith('telisha-')).map(x=>esc(x.ashkenazi)+' '+esc('◌'+x.char)).join(' · ')+'</span>' : mark ? '<span class="he mark" lang="he" dir="rtl">'+esc('◌'+mark.char)+'</span>' : '';
    return '<div>'+glyph+'<h3>'+esc(label)+'</h3><div class="plates-grid">'+figure('TROPE_'+stem+'_mnemonic',label+' — memory picture')+figure('TROPE_'+stem+'_card',label+' — illustration card')+'</div></div>';
  });
  const trope = chunks(marks,2).map((items,i)=>section('trope-plates-'+(i+1),'Cantillation: visual reference · '+(i+1),'<p class="small">Names and marks follow data/corpus/trope/table.json. Draft, not reviewed by a cantor. Pictures are memory aids; they do not specify a melody or teach a hand signal.</p>'+items.join(''))).join('');
  const hands = chunks(Array.from({length:10},(_,i)=>({stem:'TROPE_hand_'+String(i+1).padStart(2,'0'),caption:'Hand illustration · '+(i+1)})),4).map((items,i)=>section('trope-hands-'+(i+1),'Hand illustrations · '+(i+1),'<p class="small">Illustration reference only; hand signals vary by teacher and community.</p><div class="plates-grid">'+items.map(x=>figure(x.stem,x.caption)).join('')+'</div>')).join('');
  return craft+trope+hands;
}

