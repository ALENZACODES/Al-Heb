import os, re, subprocess, sys, json
SRC = os.path.expanduser('~/workspace/alef-books-audio/hd-harvest/audio')
DST = os.path.expanduser('~/workspace/alef-books-audio/hd-normalized/audio')
flags=[]; done=skipped=0; files=[]
for voice in ('f','m'):
    d=os.path.join(SRC,voice,'israeli','book')
    for n in sorted(os.listdir(d)):
        if n.endswith('.mp3'): files.append(os.path.join(d,n))
files.sort(); print(f'total {len(files)}', flush=True)
for i,src in enumerate(files,1):
    rel=os.path.relpath(src,SRC); dst=os.path.join(DST,rel); os.makedirs(os.path.dirname(dst),exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst)>0: skipped+=1; continue
    p=subprocess.run(['ffmpeg','-i',src,'-af','volumedetect','-f','null','-'],capture_output=True,text=True)
    m=re.search(r'max_volume:\s*(-?[\d.]+|-inf) dB',p.stderr)
    if not m or m.group(1)=='-inf':
        flags.append({'file':rel,'issue':'silent-or-unmeasurable'}); continue
    gain=-3.0-float(m.group(1))
    cmd=['ffmpeg','-v','error','-y','-i',src,'-af',f'aresample=44100,volume={gain:.2f}dB,adelay=300:all=1,apad=pad_dur=0.3','-ar','44100','-ac','1','-b:a','96k','-map_metadata','-1','-id3v2_version','0',dst]
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode!=0 or not os.path.exists(dst) or os.path.getsize(dst)==0:
        print('FAIL',rel,r.stderr[:400],flush=True); sys.exit(1)
    done+=1
    if i%100==0: print(f'progress {i}/{len(files)} done={done} skipped={skipped} flags={len(flags)}',flush=True)
json.dump(flags,open(os.path.expanduser('~/workspace/alef-books-audio/normalize-hd-flags.json'),'w'),indent=1)
print(f'DONE normalized={done} skipped={skipped} flags={len(flags)}',flush=True)
