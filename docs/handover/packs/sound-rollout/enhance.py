import subprocess, json, re, os, sys, hashlib
BASE = os.path.expanduser('~/workspace/alef-sound-rollout')
HISTORIC = "highpass=f=70,adeclick,afftdn=nf=-25:tn=1,lowpass=f=6000:p=2"
HISTORIC_ND = "highpass=f=70,adeclick,lowpass=f=6000:p=2"
LIGHT = "highpass=f=60,adeclick,afftdn=nf=-30:tn=1"
def analyse(f, filters):
    err = subprocess.run(['ffmpeg','-i',f,'-af',filters+',loudnorm=print_format=json','-f','null','-'],
                         capture_output=True, text=True).stderr
    m = re.search(r"\{\s*\"input_i\".*?\}", err, re.S)
    d = json.loads(m.group(0))
    return float(d['input_i']), float(d['input_tp'])
def render(f, filters, gain, out):
    af = f"{filters},aresample=44100,volume={gain:.2f}dB,alimiter=limit=0.89:level=false"
    r = subprocess.run(['ffmpeg','-y','-v','error','-i',f,'-af',af,'-ac','1','-ar','44100',
                        '-c:a','libvorbis','-q:a','4','-map_metadata','-1',out],
                       capture_output=True, text=True)
    if r.returncode != 0: print('RENDER FAIL', out, r.stderr[:300]); sys.exit(1)
def gain_for(f, filters):
    I, TP = analyse(f, filters)
    g = min(-16.0 - I, -1.5 - TP)
    return round(g, 2), I, TP
log = {}
files = sorted(os.listdir(os.path.join(BASE,'originals')))
for name in files:
    src = os.path.join(BASE,'originals',name)
    dst = os.path.join(BASE,'enhanced',name)
    if name.startswith('pd_'):
        g, If, TPf = gain_for(src, HISTORIC)
        render(src, HISTORIC, g, dst)
        nd = os.path.join(BASE,'enhanced-nodenoise',name)
        g2, If2, TPf2 = gain_for(src, HISTORIC_ND)
        render(src, HISTORIC_ND, g2, nd)
        log[name] = dict(chain='historic', gain=g, filt_I=If, filt_TP=TPf, nodenoise_gain=g2)
        print(f"{name}: historic gain={g:+.2f} (filtered I={If:.2f} TP={TPf:.2f}); nodenoise gain={g2:+.2f}", flush=True)
    else:
        g, If, TPf = gain_for(src, LIGHT)
        render(src, LIGHT, g, dst)
        log[name] = dict(chain='light', gain=g, filt_I=If, filt_TP=TPf)
        print(f"{name}: light gain={g:+.2f} (filtered I={If:.2f} TP={TPf:.2f})", flush=True)
json.dump(log, open(os.path.join(BASE,'enhance-log.json'),'w'), indent=1)
print('ALL DONE')
