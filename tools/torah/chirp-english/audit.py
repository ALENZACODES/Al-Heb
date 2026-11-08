"""Final source coverage, identity, duplicate, and audio-hash gate; no ASR certification claim."""
import pathlib,json,hashlib,sys,datetime
root=pathlib.Path(__file__).resolve().parent
repo=pathlib.Path(sys.argv[1]).resolve()
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
plan=read(root/'plan.json');chapters=read(root/'chapters.json');manifest=read(root/'manifest-english.json');provenance=read(root/'provenance.json')
assert len(plan)==502 and len({r['id'] for r in plan})==502
assert len(chapters)==len(manifest)==len(provenance)==374
rows={r['id']:r for r in plan}
entries={(r['voice'],r['id']):r for r in manifest}
assert len(entries)==374 and len({r['path'] for r in manifest})==374
assert len(list((root/'delivery'/'audio').rglob('*.mp3')))==374
verse_count=0
for book,count in [('genesis',50),('exodus',40),('leviticus',27),('numbers',36),('deuteronomy',34)]:
    for n in range(1,count+1):
        source=read(repo/'data'/'corpus'/'torah'/book/f'{n:02d}.json')
        verse_count+=len(source['verses'])
        expected=' '.join(v['en'] for v in source['verses'])
        for speaker,voice,provider_voice in [('ari','m','en-US-Chirp3-HD-Charon'),('noa','f','en-US-Chirp3-HD-Kore')]:
            chapter=next(c for c in chapters if c['book']==book and c['chapter']==n and c['speaker']==speaker)
            chunks=[rows[cid] for cid in chapter['chunks']]
            assert ' '.join(c['text'] for c in chunks)==expected
            assert chunks[0]['fromVerse']==1 and chunks[-1]['toVerse']==len(source['verses'])
            for i,c in enumerate(chunks):
                assert len(c['text'].encode())<=4800 and c['voice']==provider_voice
                if i:assert c['fromVerse']==chunks[i-1]['toVerse']+1
                meta=read(root/(c['path']+'.json'))
                assert meta['fingerprint']==c['fingerprint'] and meta['voice']==provider_voice
                assert meta['spokenText'] in [c['text'],c['text'].replace(';','.').replace(':','.')]
                assert meta['audioSha256']==hashlib.sha256((root/c['path']).read_bytes()).hexdigest()
            entry=entries[(voice,chapter['id'])]
            assert entry['provider']=='google' and entry['providerVoice']==provider_voice and entry['timing']=='chapter-only'
            assert entry['text']==expected and entry['durationMs']>0
            assert entry['audioSha256']==hashlib.sha256((root/'delivery'/entry['path']).read_bytes()).hexdigest()
assert verse_count==5846
reports=[]
for p in (root/'clips').glob('*.asr.json'):
    r=read(p)
    assert r['audioSha256']==hashlib.sha256((root/rows[r['id']]['path']).read_bytes()).hexdigest()
    reports.append(r)
report={'createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'chapters':187,'verses':verse_count,'voices':['Ari / Charon','Noa / Kore'],'chapterTracks':374,'requestChunks':502,'sourceCoverage':'All source verses submitted in original order for both voices; no missing or duplicate chapter tracks.','provider':'Google Chirp 3 HD','nominalCharacters':sum(len(r['text']) for r in plan),'audioBytes':sum((root/'delivery'/r['path']).stat().st_size for r in manifest),'audioHours':sum(r['durationMs'] for r in manifest)/3600000,'asrChunksAtAudit':len(reports),'asrModel':'Systran/faster-whisper-tiny.en','asrModelRevision':'0d3d19a32d3338f10357c0889762bd8d64bbdeba','asrCaveat':'Unprompted recognition includes differences on names, archaic numbers and homophones; not human-reviewed pronunciation certification.','sourceAndHashChecks':'passed','fullDecodeChecks':'All chapter tracks were fully decoded by assemble.py; this audit rechecked their saved audio hashes.'}
(root/'final-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
