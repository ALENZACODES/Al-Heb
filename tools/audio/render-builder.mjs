import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const config = read('tools/audio/voices.json');
const words = read('data/builder_words.json');
const symbols = read('data/builder_symbols.json');
const rows = [...words,...symbols.letters,...symbols.marks].flatMap(w => ['ari','noa'].map(v => ({
  id: w.id, text: w.nikud, voice: config[v], path: w['audio_'+v],
})));
const manifestPath = path.join(root,'tools/audio/builder-manifest.json');
const existing = fs.existsSync(manifestPath) ? read('tools/audio/builder-manifest.json') : { clips: [] };
const fingerprint = r => createHash('sha256').update(JSON.stringify([r.text,r.voice,config.bitrateKbps])).digest('hex');
const pending = rows.filter(r => process.argv.includes('--redo') || !existing.clips.some(c => c.path===r.path && c.fingerprint===fingerprint(r) && fs.existsSync(path.join(root,r.path))));
console.log(JSON.stringify({total: rows.length, pending: pending.length, characters: pending.reduce((n,r)=>n+[...r.text].length,0), estimatedUSD: pending.reduce((n,r)=>n+[...r.text].length,0)*30/1e6}));
if (!process.argv.includes('--execute')) process.exit(0);
const key = process.env.GOOGLE_TTS_API_KEY;
if (!key) throw new Error('Set GOOGLE_TTS_API_KEY before rendering.');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
if (spawnSync(ffmpeg,['-version'],{stdio:'ignore'}).status!==0) throw new Error('Set FFMPEG to an installed encoder.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'hebrew-audio-'));
try {
  for (const r of pending) {
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method:'POST', headers:{'Content-Type':'application/json','X-Goog-Api-Key':key}, signal:AbortSignal.timeout(90000),
      body:JSON.stringify({input:{text:r.text},voice:{languageCode:config.languageCode,name:r.voice},audioConfig:{audioEncoding:'MP3',sampleRateHertz:config.sampleRateHertz}}),
    });
    if (!res.ok) throw new Error(`Synthesis failed with HTTP ${res.status} for ${r.id}`);
    const data = await res.json();
    if (!data.audioContent) throw new Error('No audio returned for '+r.id);
    const input = path.join(temp,'input.mp3'), output = path.join(root,r.path);
    fs.writeFileSync(input,Buffer.from(data.audioContent,'base64'));
    fs.mkdirSync(path.dirname(output),{recursive:true});
    const encoded = spawnSync(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',input,'-map_metadata','-1','-ac','1','-ar',String(config.sampleRateHertz),'-codec:a','libmp3lame','-b:a',config.bitrateKbps+'k',output],{encoding:'utf8'});
    if(encoded.status!==0) throw new Error('Encoding failed for '+r.id);
    existing.clips = existing.clips.filter(c=>c.path!==r.path);
    existing.clips.push({...r, fingerprint:fingerprint(r), bytes:fs.statSync(output).size, sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex')});
    fs.writeFileSync(manifestPath,JSON.stringify({languageCode:config.languageCode,bitrateKbps:config.bitrateKbps,clips:existing.clips},null,2)+'\n');
    console.log('Saved '+r.path);
  }
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
