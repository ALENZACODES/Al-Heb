from pathlib import Path
import json,csv,re
R=Path('/workspace/shared/al-heb/voice-sprint-2026-11-05')
RPO=Path('/workspace/Al-Heb')
D=json.loads((RPO/'data/audio/english-glosses.json').read_text())
assert all(isinstance(v,str) and v and v!='UNKNOWN' for v in D.values()), 'Malformed reviewed gloss'
files=['data/audio/manifest.json','data/audio/manifest-words-israeli.json','data/audio/manifest-words-sephardi.json','data/audio/manifest-words-ashkenazi.json']
allrows=[]
for f in files:
 p=RPO/f;rows=json.loads(p.read_text());allrows.append((p,rows))
# Vocab/local existing translations, including id-matched disambiguation.
v=json.loads((RPO/'data/vocab/index.json').read_text());key={r[0]:r[v['fields'].index('en')] for r in v['rows']}
for e in json.loads((RPO/'data/corpus/phrasebook.json').read_text())['entries']:
 if e['id'] in ('numbers-05','numbers-06','numbers-07','numbers-08','numbers-10'):D[e['id']+'-f']=e['en']+' (feminine)'
# Align corpus-provided, explicit per-word glosses (the early explicit-gloss readings).
line_labels={}
for e in json.loads((RPO/'data/corpus/phrasebook.json').read_text())['entries']:line_labels[e['id']]=e['en']
def normal(t):return re.sub(r'יְ?הוָה','אֲדֹנָי',t).rstrip('׃')
for e in json.loads((RPO/'data/corpus/registry.json').read_text())['entries']:
 line_labels[e['id']]=e['english']
 for i,(h,en) in enumerate(zip(e['he'].split(),e.get('wordGlosses',[])),1):
  D[e['id']+'-w'+str(i)]=re.sub(r'(?<=[a-z])-(?=[a-z])',' ',en)
# Match EXISTING exact-id translations across voice rows, using any produced/local index.
indexpath=RPO/'audio/INDEX.csv'
if indexpath.exists():
 with indexpath.open(newline='') as fh:idx=list(csv.DictReader(fh))
 for r in idx:
  if r['tradition']=='israeli' and r['kind']=='word' and r['english']!='UNKNOWN':D[r['id']]=r['english']
for p,rows in allrows:
 for r in rows:
  if r['kind'] in ('line','prayer') and r.get('english','UNKNOWN')=='UNKNOWN':
   r['english']=line_labels.get(r['id'],line_labels.get(re.sub(r'-f$|-m$','',r['id']),'UNKNOWN'))
  if r['tradition']=='israeli' and r['kind']=='word':
   r['english']=D[r['id']] if r['id'] in D else r.get('english',key.get(r['id'],'UNKNOWN'))
 p.write_text('[\n' + ',\n'.join(json.dumps(row, ensure_ascii=False, separators=(',', ':')) for row in rows) + '\n]\n', encoding='utf-8')
# Synchronize the current index only. Never add/remove rows or production status.
with indexpath.open(newline='') as fh:reader=csv.DictReader(fh);fields=reader.fieldnames;idx=list(reader)
lookup={r['path']:r for _,rows in allrows for r in rows}
for r in idx:
 m=lookup.get(r['file'])
 if m and m.get('english') and m['english']!='UNKNOWN':r['english']=m['english']
 if not r['phonetic'] and m and m.get('phonetic'):r['phonetic']=m['phonetic']
with indexpath.open('w',newline='') as fh:
 w=csv.DictWriter(fh,fieldnames=fields,quoting=csv.QUOTE_ALL);w.writeheader();w.writerows(idx)
print('Refresh unknown:',sum(r['english']=='UNKNOWN' for r in idx),'of',len(idx))


def esc(value):
 return str(value).replace('|','\\|').replace('\n',' ')
with (RPO/'audio/INDEX.csv').open(newline='') as fh:
 idx=list(csv.DictReader(fh))
word=[r for r in idx if r['tradition']=='israeli' and r['kind']=='word']
lines=[r for r in idx if r['tradition']=='israeli' and r['kind']=='line']
unknown=[r for r in idx if r['english']=='UNKNOWN']
doc=['# Israeli audio: Hebrew, English, and phonetics','',
 'Read the Hebrew **right to left: ←**. Its English meaning is below it; the phonetic reading is below the English. Click a filename to open that audio file.','',
 'The stable filenames and stable audio IDs remain unchanged. `m` is Ari; `f` is Noa. The same word is listed once per voice recording.','',
 f"**Words:** {len(word)} clips. **Reading lines:** {len(lines)} clips. English and phonetic labels are also available in [INDEX.csv](INDEX.csv) for every produced clip in the branch.",'',
 'Phonetics use the project’s siddur-style Latin transliteration (for example, `ch` for the throat sound, `kh` for the similar guttural sound, `tz` for צ, and `sh` for שׁ). Hebrew pronunciation is authoritative; Latin spelling is a learner aid.','',
 'English is aligned from the project’s vocabulary, phrasebook and corpus translations. A compound Hebrew word can include an attached particle (for example, “and…”, “to…” or “the…”). `the LORD` represents the divine name according to the app’s reading convention.','',
 '## Israeli words','',f'{len(word)} English labels; {len([r for r in word if r["english"]=="UNKNOWN"])} UNKNOWN.','',
 '| file | hebrew | english | phonetic |','| --- | --- | --- | --- |']
for r in word:doc.append('| [{}]({}) | {} | {} | {} |'.format(r['id'],esc(r['file'].removeprefix('audio/')),esc(r['pointed_hebrew']),esc(r['english']),esc(r['phonetic'])))
doc+=['','## Israeli reading lines','',f'{len(lines)} English labels; {len([r for r in lines if r["english"]=="UNKNOWN"])} UNKNOWN.','', '| file | hebrew | english | phonetic |','| --- | --- | --- | --- |']
for r in lines:doc.append('| [{}]({}) | {} | {} | {} |'.format(r['id'],esc(r['file'].removeprefix('audio/')),esc(r['pointed_hebrew']),esc(r['english']),esc(r['phonetic'])))
doc+=['','## Validation','',f'All {len(idx)} produced clips in INDEX.csv have an English label; {len(unknown)} UNKNOWN. Filenames and IDs are unchanged.','']
(RPO/'audio/LABELS-israeli-words.md').write_text('\n'.join(doc))
print(f'{len(unknown)} UNKNOWN in {len(idx)} produced clips. Regenerated label sheet.')
