"""Local, unprompted Hugging Face round-trip check. Never certifies vowel accuracy."""
import argparse, hashlib, json, pathlib, re, unicodedata, os

ROOT=pathlib.Path(__file__).resolve().parent
MODEL='ivrit-ai/whisper-large-v3-turbo-ct2'
MODEL_REVISION='72ad623a37947395efcc3933132353790e5a12f5'
ORTHOGRAPHY={'היתה':'הייתה','אלהים':'אלוהים','תהו':'תוהו','ובהו':'ובוהו'}
POLICY=hashlib.sha256(json.dumps({'version':2,'normalization':'NFD-without-marks-punctuation','orthography':ORTHOGRAPHY},ensure_ascii=False,sort_keys=True).encode()).hexdigest()

def cache_matches(old,digest,fingerprint,model_id,revision):
    return (old.get('audioSha256')==digest and old.get('fingerprint')==fingerprint
            and old.get('model')==model_id and old.get('modelRevision')==revision
            and old.get('verifierPolicy')==POLICY)

def normalize(text):
    text=unicodedata.normalize('NFD',text).lower()
    text=''.join(c for c in text if unicodedata.category(c)!='Mn')
    return re.sub(r'[^\u05d0-\u05ea a-z0-9]', ' ',text).split()

def distance(a,b):
    row=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        nxt=[i]
        for j,y in enumerate(b,1):nxt.append(min(nxt[-1]+1,row[j]+1,row[j-1]+(x!=y)))
        row=nxt
    return row[-1]

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--limit',type=int,default=0);args=parser.parse_args()
    from faster_whisper import WhisperModel
    model_id=os.environ.get('HEBREW_ASR_MODEL',MODEL)
    canonical=MODEL if model_id==MODEL or 'ivrit-ai' in model_id else model_id
    revision=MODEL_REVISION if canonical==MODEL else os.environ.get('HEBREW_ASR_REVISION')
    model=WhisperModel(model_id,device='cpu',compute_type='int8',download_root=str(ROOT/'models'),cpu_threads=4,revision=revision)
    rows=json.loads((ROOT/'plan.json').read_text(encoding='utf-8'))
    count=0
    for r in rows:
        if r['lang']!='he':continue
        clip=ROOT/r['path']; report=clip.with_suffix('.asr.json')
        if not clip.exists():continue
        digest=hashlib.sha256(clip.read_bytes()).hexdigest()
        if report.exists():
            old=json.loads(report.read_text(encoding='utf-8'))
            if cache_matches(old,digest,r['fingerprint'],canonical,revision):continue
        # No source text, initial prompt, or hotwords supplied: avoids priming recognition.
        segments,info=model.transcribe(str(clip),language='he',beam_size=5,condition_on_previous_text=False,vad_filter=False)
        transcript=' '.join(s.text.strip() for s in segments)
        ref,hyp=normalize(r['text']),normalize(transcript)
        edits=distance(ref,hyp)
        orthographic_edits=distance([ORTHOGRAPHY.get(w,w) for w in ref],[ORTHOGRAPHY.get(w,w) for w in hyp])
        result={'id':r['id'],'fingerprint':r['fingerprint'],'audioSha256':digest,'model':canonical,'modelRevision':revision,'verifierPolicy':POLICY,
                'reference':r['text'],'transcript':transcript,'wordEdits':edits,'referenceWords':len(ref),
                'wer':edits/max(1,len(ref)),'asrExact':edits==0,'orthographicWordEdits':orthographic_edits,
                'orthographicEquivalences':ORTHOGRAPHY,'wordsMatch':orthographic_edits==0,
                'status':'words-match' if orthographic_edits==0 else 'asr-mismatch',
                'publishable':False,'limitation':'Unpointed ASR cannot verify vowels, stress, qere, or divine-name convention.'}
        report.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'id':r['id'],'wordEdits':edits,'wer':result['wer'],'status':result['status']}),flush=True)
        count+=1
        if args.limit and count>=args.limit:break

if __name__=='__main__':main()
