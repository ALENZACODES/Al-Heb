import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]);
const rows=[],chapters=[];
for(const book of ['genesis','exodus','leviticus','numbers','deuteronomy']) {
  for(const file of fs.readdirSync(path.join(root,'data/corpus/torah',book)).filter(f=>f.endsWith('.json')).sort()) {
    const raw=fs.readFileSync(path.join(root,'data/corpus/torah',book,file));
    const ch=JSON.parse(raw), chunks=[];
    let words=[],from=1,last=0;
    for(const v of ch.verses) {
      if(Buffer.byteLength(v.en)>4800)throw Error('Verse exceeds request limit');
      if(words.length && Buffer.byteLength([...words,v.en].join(' '))>4800) {chunks.push({from,to:last,text:words.join(' ')});words=[];from=v.n;}
      words.push(v.en);last=v.n;
    }
    if(words.length)chunks.push({from,to:last,text:words.join(' ')});
    if(chunks.map(c=>c.text).join(' ')!==ch.verses.map(v=>v.en).join(' '))throw Error('Text mismatch');
    for(const speaker of ['ari','noa']) {
      const voice=`en-US-Chirp3-HD-${speaker==='ari'?'Charon':'Kore'}`;
      const id=`torah-en-${book}-${ch.chapter}`;
      const chapter={id,book,chapter:ch.chapter,ref:ch.ref,speaker,voice,lang:'en',source:'JPS 1917',sourceSha256:createHash('sha256').update(raw).digest('hex'),chunks:[],path:`audio/${speaker==='ari'?'m':'f'}/english/torah-chapter-en/${id}.mp3`};
      for(const [i,c]of chunks.entries()) {
        const cid=`${book}-${ch.chapter}-${speaker}-${i+1}`;
        const fingerprint=createHash('sha256').update(JSON.stringify({text:c.text,voice,encoding:'MP3',rate:24000})).digest('hex');
        rows.push({id:cid,book,chapter:ch.chapter,chunk:i+1,fromVerse:c.from,toVerse:c.to,lang:'en',speaker,voice,text:c.text,fingerprint,path:`clips/${cid}.mp3`});
        chapter.chunks.push(cid);
      }
      chapters.push(chapter);
    }
  }
}
fs.writeFileSync(new URL('plan.json',import.meta.url),JSON.stringify(rows,null,2));
fs.writeFileSync(new URL('chapters.json',import.meta.url),JSON.stringify(chapters,null,2));
console.log(JSON.stringify({chapters:chapters.length,chunks:rows.length,characters:rows.reduce((s,r)=>s+r.text.length,0),nominalUSD:rows.reduce((s,r)=>s+r.text.length,0)*30/1e6}));
