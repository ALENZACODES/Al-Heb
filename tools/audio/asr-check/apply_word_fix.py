"""After the word-fix slices (john/word-fix-r<run>-<n>) are copied into the working tree: finish the job.

  python tools/audio/asr-check/apply_word_fix.py docs/audio/word-fix/r<run>-*.jsonl

For every recording a slice replaced:
  - the sidecar (.meta.json) of each replaced file says which voice read what, and that it was heard right twice;
  - a Sephardi or Ashkenazi row that was a byte copy of the old Israeli clip gets the new clip (copies stay copies);
  - a replacement the sound check (sound_gate.py) sent back is skipped: its earlier clip is already in place;
  - builder hashes in tools/audio/builder-manifest.json are refreshed.
Prints the tally of the logs. Run tools/deploy/media-hosts.mjs --write and the tests afterwards.
"""
import collections, glob, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(__file__))
import fix as F  # noqa: E402

ROOT = F.ROOT


def main():
    nogate = '--no-gate' in sys.argv          # a run whose takes were already checked by sound (fix_list.py --sound-model)
    logs = [f for a in sys.argv[1:] if a != '--no-gate' for f in glob.glob(a)]
    tally, copies, human = collections.Counter(), 0, []
    gate = os.path.join(os.path.dirname(__file__), 'sound-gate-log.jsonl')      # replacements the sound check sent back
    back = {r['file'] for r in map(json.loads, open(gate, encoding='utf-8')) if r['decision'] != 'kept'} if os.path.exists(gate) and not nogate else set()
    for lf in sorted(logs):
        for line in open(lf, encoding='utf-8'):
            r = json.loads(line)
            if r['outcome'] == 'replaced' and r['file'] in back:
                tally['replaced, then put back by the sound check'] += 1
                continue
            tally[r['outcome'].split(':')[0]] += 1
            if r['outcome'].startswith('no take'):
                human.append(r)
            if r['outcome'] != 'replaced':
                continue
            for p in r['paths']:
                full = os.path.join(ROOT, p)
                if not os.path.exists(full):
                    continue
                mp = full + '.meta.json'
                if os.path.exists(mp):
                    meta = json.load(open(mp, encoding='utf-8'))
                    meta.update({'engine': 'google-cloud-tts', 'voiceId': r['voice'], 'inputText': r['spoken'], 'inputTextKind': 'hebrew',
                                 'note': f"Re-recorded 2026-11-16 after the full hearing flagged the clip (docs/audio/gpu-flagged-2026-11-16.json): "
                                         f"read from {r['spoken']}" + (f" at rate {r['rate']}" if r.get('rate', 1.0) != 1.0 else '') +
                                         f", heard right twice ({' / '.join(r['heard_new'])}) by tools/audio/asr-check/fix_list.py."})
                    meta.pop('inputSha256', None)
                    with open(mp, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
                if '/israeli/' in p:
                    old = subprocess.run(['git', '-C', ROOT, 'show', 'HEAD:' + p], capture_output=True).stdout
                    new = open(full, 'rb').read()
                    for t in ('sephardi', 'ashkenazi'):
                        q = os.path.join(ROOT, p.replace('/israeli/', f'/{t}/'))
                        if old and os.path.exists(q) and open(q, 'rb').read() == old:
                            open(q, 'wb').write(new)
                            copies += 1
    F.refresh_builder_manifest()
    print(dict(tally), '| tradition copies refreshed:', copies)
    if human:
        with open(os.path.join(ROOT, 'docs', 'audio', 'ASR-NEEDS-HUMAN.md'), 'a', encoding='utf-8') as f:
            for r in human:
                f.write(f"- {r['hebrew']}: `{r['file']}`, no synthetic take was heard right twice (16 Nov 2026)\n")
        print(len(human), 'added to docs/audio/ASR-NEEDS-HUMAN.md')


if __name__ == '__main__':
    main()
