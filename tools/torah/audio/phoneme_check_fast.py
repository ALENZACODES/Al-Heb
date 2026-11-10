"""Audio-only IPA check using a locally converted, pinned ReNikud model."""
import argparse,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parent
CONVERTED_SHA='bcd37aad2f27ac4856065e879aa4cd1a869d728eeb40c856f158da29e030a6dd'
def check_model(path):
    with path.open('rb') as stream: digest=hashlib.file_digest(stream, 'sha256').hexdigest()
    if digest != CONVERTED_SHA: raise ValueError('Converted IPA model hash mismatch')
    return digest
def main():
    p=argparse.ArgumentParser();p.add_argument('clips',nargs='+');args=p.parse_args()
    from faster_whisper import WhisperModel
    converted_hash=check_model(ROOT/'phoneme-ct2/model.bin')
    model=WhisperModel(str(ROOT/'phoneme-ct2'),device='cpu',compute_type='int8',cpu_threads=4)
    for filename in args.clips:
        clip=pathlib.Path(filename)
        segs,_=model.transcribe(str(clip),language='he',task='transcribe',beam_size=1,best_of=1,temperature=0,condition_on_previous_text=False,vad_filter=False,suppress_tokens=[],without_timestamps=True)
        raw=' '.join(s.text.strip() for s in segs);ipa=raw
        for a,b in [('dZ','dʒ'),('tS','tʃ'),('S','ʃ'),('Z','ʒ'),('q','ʔ'),("'",'ˈ'),('r','ʁ'),('x','χ'),('g','ɡ')]:ipa=ipa.replace(a,b)
        report={'clip':clip.name,'audioSha256':hashlib.sha256(clip.read_bytes()).hexdigest(),'model':'renikud/whisper-he-ipa','modelRevision':'e709a907f8e0e6ebcb83340b8563818dd1bc3bee','sourceWeightsSha256':'07827941fe5bbdadc5ee3563bf218e9683ee328e2e6e6bc88b51cea7cc1e3fb9','convertedWeightsSha256':converted_hash,'inferencePolicy':'ct2-int8-beam1-no-source-prompt','asciiPhonemes':raw,'ipa':ipa,'status':'supplemental-phoneme-evidence','publishable':False,'limitation':'Model-predicted phonemes, not a human listening certification; compare against separately established source pronunciation.'}
        clip.with_suffix('.phonemes-fast.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=True),flush=True)
if __name__=='__main__':main()
