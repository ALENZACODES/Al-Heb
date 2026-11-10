import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]);
const {speechText}=await import(pathToFileURL(path.join(root,'src/shell/names.js')));
const rows=[],chapters=[];
const spoken=he=>speechText(he).replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,'').replace(/־/g,' ').replace(/אלהים/g,'אלוהים').replace(/\s+/g,' ').trim();
for(const book of ['genesis','exodus','leviticus','numbers','deuteronomy']){
 for(const file of fs.readdirSync(path.join(root,'data/corpus/torah',book)).filter(f=>f.endsWith('.json')).sort()){
  const raw=fs.readFileSync(path.join(root,'data/corpus/torah',book,file)),ch=JSON.parse(raw),chunks=[];
  let verses=[],from=1,last=0;
  for(const v of ch.verses){
   const t=spoken(v.he)+'.';
   if(Buffer.byteLength(t)>3800)throw Error('Verse exceeds request limit');
   if(verses.length&&Buffer.byteLength([...verses,t].join(' '))>3800){chunks.push({from,to:last,text:verses.join(' ')});verses=[];from=v.n;}
   verses.push(t);last=v.n;
  }
  if(verses.length)chunks.push({from,to:last,text:verses.join(' ')});
  if(chunks.map(c=>c.text).join(' ')!==ch.verses.map(v=>spoken(v.he)+'.').join(' '))throw Error('Chapter text coverage mismatch');
  for(const speaker of ['ari','noa']){
   const voice=`he-IL-Chirp3-HD-${speaker==='ari'?'Charon':'Kore'}`,id=`torah-${book}-${ch.chapter}`;
   const chapter={id,book,chapter:ch.chapter,ref:ch.ref,speaker,voice,lang:'he',sourceSha256:createHash('sha256').update(raw).digest('hex'),chunks:[],path:`audio/${speaker==='ari'?'m':'f'}/israeli/torah-chapter/${id}.mp3`,speechPolicy:'unpointed; source divine-name reading; Elohim modern speech-only spelling; verse pauses',status:'pending-asr'};
   for(const[i,c]of chunks.entries()){
    const cid=`${book}-${ch.chapter}-${speaker}-${i+1}`,fingerprint=createHash('sha256').update(JSON.stringify({text:c.text,voice,encoding:'MP3',rate:24000})).digest('hex');
    rows.push({id:cid,book,chapter:ch.chapter,chunk:i+1,fromVerse:c.from,toVerse:c.to,lang:'he',speaker,voice,text:c.text,fingerprint,path:`clips/${cid}.mp3`,speechPolicy:chapter.speechPolicy,experimental:true});chapter.chunks.push(cid);
   }
   chapters.push(chapter);
  }
 }
}
fs.writeFileSync(new URL('plan.json',import.meta.url),JSON.stringify(rows,null,2));
fs.writeFileSync(new URL('chapters.json',import.meta.url),JSON.stringify(chapters,null,2));
console.log(JSON.stringify({chapters:chapters.length,chunks:rows.length,characters:rows.reduce((s,r)=>s+r.text.length,0),nominalUSD:rows.reduce((s,r)=>s+r.text.length,0)*30/1e6}));
