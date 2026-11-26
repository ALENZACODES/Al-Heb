#!/bin/bash
# Cloud Shell entry point for the Chirp re-records:  bash <(curl -sL <raw url of this file>) test|all
set -e
B=claude/multi4-check-2026-11-25
P=$(gcloud config get-value project 2>/dev/null)
cd ~ && rm -rf Al-Heb
git clone -q --depth 1 --filter=blob:none --sparse -b $B https://github.com/ALENZACODES/Al-Heb.git
cd Al-Heb && git sparse-checkout set tools/audio/asr-check && git log -1 --format='%h %s'
gcloud services enable texttospeech.googleapis.com --project "$P"
if [ "$1" = test ]; then echo audio/f/israeli/word/hf76c8cd2.mp3 > /tmp/t1.txt; L=/tmp/t1.txt; O=~/takes-test
elif [ "$1" = r3 ]; then L=tools/audio/asr-check/round3-list.txt; O=~/aleph-takes-r3; X="--takes c-car,c-carkm,c-sel,c-sel-80,c-pt-80,c-pl-80 --problems tools/audio/asr-check/round3-problems.json"
elif [ "$1" = r2 ]; then L=tools/audio/asr-check/round2-list.txt; O=~/aleph-takes-r2; X="--takes c-km,c-kmpl,a0-pt,a1-pt,a2-pt,a0-km,a1-km,a2-km"
elif [ "$1" = long ]; then L=tools/audio/asr-check/long-rerender.txt; O=~/aleph-takes-long; X="--takes c-pt,c-pl,w-pt"
else L=tools/audio/asr-check/multi4-rerecord.txt; O=~/aleph-takes; fi
python3 tools/audio/asr-check/chirp_takes.py --list $L --out $O --project "$P" $X
find $O -name '*.mp3' | wc -l; du -sh $O; find $O -name '*.mp3' -size -2k
tar czf $O.tgz -C $(dirname $O) $(basename $O) && ls -la $O.tgz
cloudshell download $O.tgz || true
echo CS-DONE
