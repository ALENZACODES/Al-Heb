"""Supplemental audio-only phoneme recognition; no reference prompt is supplied."""
import argparse,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parent
def main():
    p=argparse.ArgumentParser();p.add_argument('clips',nargs='+');args=p.parse_args()
    import torch
    from transformers import AutoProcessor,AutoModelForSpeechSeq2Seq
    from faster_whisper.audio import decode_audio
    torch.set_num_threads(4)
    location=str(ROOT/'phoneme-model')
    metadata=ROOT/'phoneme-model/.cache/huggingface/download/config.json.metadata'
    revision=metadata.read_text().splitlines()[0] if metadata.exists() else None
    with open(ROOT/'phoneme-model/model.safetensors','rb') as weights:
        weights_hash=hashlib.file_digest(weights,'sha256').hexdigest()
    if weights_hash!='07827941fe5bbdadc5ee3563bf218e9683ee328e2e6e6bc88b51cea7cc1e3fb9':
        raise RuntimeError('Unexpected phoneme-model weights; verify model provenance before use')
    processor=AutoProcessor.from_pretrained(location)
    model=AutoModelForSpeechSeq2Seq.from_pretrained(location).eval()
    for filename in args.clips:
        clip=pathlib.Path(filename);audio=decode_audio(str(clip),sampling_rate=16000)
        features=processor(audio,sampling_rate=16000,return_tensors='pt',return_attention_mask=True)
        with torch.inference_mode():
            ids=model.generate(**features,max_new_tokens=440)
        raw=processor.batch_decode(ids,skip_special_tokens=True)[0]
        ipa=raw
        for a,b in [('dZ','dʒ'),('tS','tʃ'),('S','ʃ'),('Z','ʒ'),('q','ʔ'),("'",'ˈ'),('r','ʁ'),('x','χ'),('g','ɡ')]:ipa=ipa.replace(a,b)
        report={'clip':clip.name,'audioSha256':hashlib.sha256(clip.read_bytes()).hexdigest(),'model':'renikud/whisper-he-ipa','modelRevision':revision,'modelWeightsSha256':'07827941fe5bbdadc5ee3563bf218e9683ee328e2e6e6bc88b51cea7cc1e3fb9','inferencePolicy':'v2-attention-mask','asciiPhonemes':raw,'ipa':ipa,'status':'supplemental-phoneme-evidence','publishable':False,'limitation':'Model-predicted phonemes, not a human listening certification; compare against separately established source pronunciation.'}
        clip.with_suffix('.phonemes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=True),flush=True)
if __name__=='__main__':main()
