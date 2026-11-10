import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const word=read('data/builder_words.json').find(w=>w.hebrew==='שלום');
const replacements=[];
for(const file of ['data/audio/manifest-words-israeli.json','data/audio/manifest-kind-word.json']) {
  for(const row of read(file)) {
    if(row.tradition!=='israeli' || row.text?.replace(/[֑-ׇ]/g,'')!=='שלום')continue;
    if(replacements.some(r=>r.path===row.path))continue;
    const source=word[row.voice==='m'?'audio_ari':'audio_noa'];
    fs.copyFileSync(path.join(root,source),path.join(root,row.path));
    replacements.push({path:row.path,source});
  }
}
fs.writeFileSync(path.join(root,'tools/audio/builder-shalom-replacements.json'),JSON.stringify(replacements,null,2)+'\n');
console.log('Updated '+replacements.length+' existing shalom clips.');
