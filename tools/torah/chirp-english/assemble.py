"""Verify source/chunk hashes and assemble complete chapter tracks without fake verse timings."""
import pathlib,json,hashlib,subprocess,argparse,av
root=pathlib.Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--ffmpeg',required=True);args=p.parse_args()
rows={r['id']:r for r in json.loads((root/'plan.json').read_text(encoding='utf-8'))}
chapters=json.loads((root/'chapters.json').read_text(encoding='utf-8'))
manifest=[];provenance=[]
for ch in chapters:
    chunks=[rows[cid] for cid in ch['chunks']]
    if not all((root/c['path']).exists() and (root/(c['path']+'.json')).exists() for c in chunks):continue
    digest=hashlib.sha256(''.join(c['fingerprint'] for c in chunks).encode()).hexdigest()
    track=root/'delivery'/ch['path'];track.parent.mkdir(parents=True,exist_ok=True)
    chunk_records=[]
    for c in chunks:
        clip=root/c['path'];meta=json.loads((root/(c['path']+'.json')).read_text(encoding='utf-8-sig'))
        if meta['fingerprint']!=c['fingerprint'] or meta['audioSha256']!=hashlib.sha256(clip.read_bytes()).hexdigest():raise ValueError('Chunk hash mismatch '+c['id'])
        if meta['spokenText'] not in [c['text'],c['text'].replace(';','.').replace(':','.')]:raise ValueError('Unexpected speech text alteration '+c['id'])
        chunk_records.append({'id':c['id'],'fingerprint':c['fingerprint'],'fromVerse':c['fromVerse'],'toVerse':c['toVerse'],'spokenText':meta['spokenText'],'sourceText':c.get('sourceText',c['text']),'speechNormalization':c.get('speechNormalization','none'),'audioSha256':meta['audioSha256'],'generatedUtc':meta['generatedUtc'],'punctuationAdjusted':meta['spokenText']!=c['text'],'requestTextSha256':hashlib.sha256(meta['spokenText'].encode()).hexdigest()})
    receipt=track.with_suffix('.json')
    cached=json.loads(receipt.read_text(encoding='utf-8')) if receipt.exists() else {}
    if not track.exists() or cached.get('fingerprint')!=digest or cached.get('audioSha256')!=hashlib.sha256(track.read_bytes()).hexdigest():
        listing=root/'concat.txt'
        listing.write_text('\n'.join("file '"+str((root/c['path']).resolve()).replace('\\','/').replace("'","'\\''")+"'" for c in chunks),encoding='utf-8')
        subprocess.run([args.ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(track)],check=True)
        # Full decode measures actual audio and detects corrupt MP3 frames, not estimated text timing.
        frames=0;samples=0;rate=0
        with av.open(str(track)) as container:
            for frame in container.decode(audio=0):frames+=1;samples+=frame.samples;rate=frame.sample_rate
        if not frames or not samples or not rate:raise ValueError('Empty decoded chapter '+ch['id'])
        record={**ch,'fingerprint':digest,'durationMs':round(samples/rate*1000),'audioSha256':hashlib.sha256(track.read_bytes()).hexdigest(),'bytes':track.stat().st_size,'chunks':[{'id':c['id'],'fingerprint':c['fingerprint'],'fromVerse':c['fromVerse'],'toVerse':c['toVerse']} for c in chunks],'qa':'Decoded completely; source coverage and fingerprints checked. English pilot ASR only, not all-chapter pronunciation certification.'}
        receipt.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    else:record=json.loads(receipt.read_text(encoding='utf-8'))
    record['chunks']=chunk_records
    provenance.append(record)
    manifest.append({'path':ch['path'],'voice':'m' if ch['speaker']=='ari' else 'f','tradition':'english','kind':'torah-chapter-en','id':ch['id'],'text':' '.join(c['text'] for c in chunks),'status':'tts','source':'paid-cloud','provider':'google','providerVoice':ch['voice'],'durationMs':record['durationMs'],'audioSha256':record['audioSha256'],'timing':'chapter-only','verification':'source-and-decode-checked; pilot-asr-only'})
(root/'manifest-english.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1),encoding='utf-8')
(root/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=1),encoding='utf-8')
print(json.dumps({'chaptersComplete':len(manifest),'expected':374,'bytes':sum(r['bytes'] for r in provenance),'hours':sum(r['durationMs'] for r in provenance)/3600000}))
