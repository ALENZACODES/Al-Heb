"""Unprompted English ASR on rendered chunks, with resumable exact-hash reports."""
import pathlib,json,sys,hashlib,argparse,time
from faster_whisper import WhisperModel

from verify_utils import normalize,distance
root=pathlib.Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--shard',type=int,default=0);p.add_argument('--shards',type=int,default=1);p.add_argument('--start',type=int,default=0);args=p.parse_args()
model=WhisperModel('tiny.en',device='cpu',compute_type='int8',download_root=str(root/'models'),cpu_threads=2,local_files_only=True)
rows=json.loads((root/'plan.json').read_text(encoding='utf-8'))[args.start:][args.shard::args.shards]
while True:
    complete=0;new=0
    for r in rows:
        clip=root/r['path'];report=clip.with_suffix('.asr.json')
        if not clip.exists() or not pathlib.Path(str(clip)+'.json').exists():continue
        sha=hashlib.sha256(clip.read_bytes()).hexdigest()
        if report.exists() and json.loads(report.read_text())['audioSha256']==sha:complete+=1;continue
        segments,info=model.transcribe(str(clip),language='en',beam_size=5,condition_on_previous_text=False,vad_filter=False)
        transcript=' '.join(s.text.strip() for s in segments)
        ref,hyp=normalize(r['text']),normalize(transcript);edits=distance(ref,hyp)
        record=dict(id=r['id'],reference=r['text'],transcript=transcript,wordEdits=edits,referenceWords=len(ref),wer=edits/max(1,len(ref)),model='Systran/faster-whisper-tiny.en',audioSha256=sha,fingerprint=r['fingerprint'],status='asr-exact' if not edits else 'asr-difference-needs-review',certified=False)
        report.write_text(json.dumps(record,indent=2),encoding='utf-8');complete+=1;new+=1
        print(json.dumps({k:record[k] for k in ['id','wordEdits','wer','status']}),flush=True)
    if complete==len(rows):break
    if not new:time.sleep(5)
