import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('tools/audio/builder-manifest.json');
const replacements=read('tools/audio/builder-shalom-replacements.json');
for(const clip of manifest.clips){
  const data=fs.readFileSync(path.join(root,clip.path));
  assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256,clip.path);
  if(process.argv.includes('--decode')){
    const result=spawnSync(process.env.FFMPEG || 'ffmpeg',['-hide_banner','-i',path.join(root,clip.path),'-f','null','-'],{encoding:'utf8'});
    assert.equal(result.status,0,clip.path);
    const kbps=Number(result.stderr.match(/Audio: mp3[^\n]*, (\d+) kb\/s/)?.[1]);
    assert.ok(kbps>0 && kbps<=48,clip.path+' bitrate '+kbps);
  }
}
for(const row of replacements) assert.deepEqual(fs.readFileSync(path.join(root,row.path)),fs.readFileSync(path.join(root,row.source)),row.path);
console.log(JSON.stringify({newClips:manifest.clips.length,replacedClips:replacements.length,hashesVerified:true,decoded:process.argv.includes('--decode'),maxBitrateKbps:48}));
