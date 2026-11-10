import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]);
const {speechText}=await import(pathToFileURL(path.join(root,'src/shell/names.js')));
const {cleanHebrewForTts}=await import(pathToFileURL(path.join(root,'tools/audio/tts/google.mjs')));
const rows=[];
for(const book of ['genesis','exodus','leviticus','numbers','deuteronomy']){
 for(const file of fs.readdirSync(path.join(root,'data/corpus/torah',book)).filter(x=>x.endsWith('.json')).sort()){
  const chapter=JSON.parse(fs.readFileSync(path.join(root,'data/corpus/torah',book,file),'utf8'));
  for(const verse of chapter.verses) for(const lang of ['he','en']) for(const speaker of ['ari','noa']){
   const text=lang==='he'?cleanHebrewForTts(speechText(verse.he)):verse.en;
   if(!text?.trim() || Buffer.byteLength(text)>4800)throw Error('Invalid verse '+chapter.ref+':'+verse.n);
   const voice=`${lang==='he'?'he-IL':'en-US'}-Chirp3-HD-${speaker==='ari'?'Charon':'Kore'}`;
   const id=`${book}-${chapter.chapter}-${verse.n}-${lang}-${speaker}`;
   const fingerprint=createHash('sha256').update(JSON.stringify({text,voice,encoding:'MP3',rate:24000})).digest('hex');
   rows.push({id,book,chapter:chapter.chapter,verse:verse.n,lang,speaker,voice,text,displayText:verse[lang],fingerprint,path:`clips/${id}.mp3`,reviewRequired:true});
  }
 }
}
fs.writeFileSync(new URL('plan.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify({clips:rows.length,characters:rows.reduce((s,r)=>s+[...r.text].length,0),nominalUSD:rows.reduce((s,r)=>s+[...r.text].length,0)*30/1e6}));
