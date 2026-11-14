#!/usr/bin/env python3
"""Triage an Al-Heb checkout that has uncommitted work, against what GitHub already has. Read-only on the repo.

Run from the root of the checkout (Python 3.8+, git on PATH; standard library only):

    python3 triage_checkout.py --ref origin/main                      # the voice-production checkout
    python3 triage_checkout.py --ref origin/books/pictures-38-62      # the little-books checkout
    python3 triage_checkout.py --ref origin/main --zip                # also pack the archive set into zips (90 MB each at most)

It runs `git fetch origin` first (skip with --no-fetch), then sorts every modified, untracked or deleted file into one class:

  same          identical bytes already on GitHub at the same path (in --ref). Nothing to do.
  same-elsewhere identical bytes already on GitHub under another path (a duplicate). Nothing to do.
  differs       GitHub has this path with different bytes. GitHub's copy stays (never overwritten). Audio goes to the archive.
  fills-missing new Israeli or English clip at a path the main audio manifests still list as "missing". Archive the box copy; fill the app
                with a fresh render on a new branch (the box clips have no sidecar, so the app cannot state where they came from).
  hold-tradition new Sephardi or Ashkenazi clip for a "missing" row. Made before the respelling method of docs/audio/ACCENT-VOICES-2026-11-08.md. Archive.
  new-unlisted  new file under audio/ that no manifest lists. Archive only.
  new-other     new non-audio file. Look at it by hand; port to a fresh branch from main only if it is real work.
  deleted       tracked file missing from the checkout. Never pushed as a deletion.
  never         scratch, secrets, duplicates by name, or over the size cap. Never committed.

Writes everything under --out (default: ../alheb-triage-<branch>-<date>, outside the repo): triage.csv, summary.md, one list per class,
and with --zip the archive zips plus archive-index.csv. It never stages, commits, pushes or deletes anything.
"""
import argparse, csv, datetime, hashlib, json, os, re, subprocess, sys, zipfile
from collections import Counter, defaultdict

MANIFESTS = ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json', 'data/audio/manifest-words-israeli.json',
             'data/audio/manifest-words-sephardi.json', 'data/audio/manifest-words-ashkenazi.json',
             'data/audio/manifest-torah.json', 'data/audio/manifest-torah-he.json']
APP_TRADITIONS = {'israeli', 'english'}
GITHUB_HARD_LIMIT = 100 * 1024 * 1024
SCRATCH = [r'(^|/)node_modules/', r'(^|/)__pycache__/', r'^audio/_review/', r'^dist(-test)?/', r'^tools/torah/snapshot/',
           r'^data/images/(sheets|review)/', r'^data/images/(ingest-report\.json|unmatched-assignment\.csv)$',
           r'(^|/)\.DS_Store$', r'(^|/)Thumbs\.db$', r'(^|/)desktop\.ini$', r'\.(tmp|part|partial|crdownload|log|bak|swp|orig|rej)$', r'~$']
SECRETS = [r'(^|/)\.env(\..*)?$', r'\.(pem|p12|pfx|key)$', r'(^|/)(service[-_]?account|credentials?|client_secret)[^/]*\.json$', r'(^|/)gcloud[^/]*\.json$']
DUP_NAME = re.compile(r'( \(\d+\)| - Copy( \(\d+\))?|^Copy of |_copy\d*)(\.[A-Za-z0-9]+)?$', re.I)


def git(*args, binary=False, check=True, inp=None):
    r = subprocess.run(['git', *args], capture_output=True, input=inp, check=False)
    if check and r.returncode != 0:
        sys.exit(f'git {" ".join(args)} failed: {r.stderr.decode(errors="replace").strip()}')
    return r.stdout if binary else r.stdout.decode('utf-8', errors='replace')


def status_entries():
    """(code, path) for every changed, untracked or deleted path; renames give the new path."""
    raw = git('status', '--porcelain=v1', '-z', '--untracked-files=all', binary=True).split(b'\0')
    out, i = [], 0
    while i < len(raw):
        e = raw[i]; i += 1
        if not e: continue
        code, path = e[:2].decode(), e[3:].decode('utf-8', errors='surrogateescape')
        if code[0] in 'RC': i += 1  # the next field is the old path
        out.append((code, path))
    return out


def tree_of(ref):
    out = {}
    for rec in git('ls-tree', '-r', '-z', ref, binary=True).split(b'\0'):
        if not rec: continue
        meta, path = rec.split(b'\t', 1)
        out[path.decode('utf-8', errors='surrogateescape')] = meta.split()[2].decode()
    return out


def manifest_rows(ref):
    rows = {}
    for f in MANIFESTS:
        txt = git('show', f'{ref}:{f}', check=False)
        if not txt.strip(): continue
        try: data = json.loads(txt)
        except ValueError: continue
        if isinstance(data, dict): data = next((v for v in data.values() if isinstance(v, list)), [])
        for e in data:
            if isinstance(e, dict) and e.get('path'):
                rows[e['path']] = {'status': e.get('status'), 'tradition': e.get('tradition'), 'kind': e.get('kind'), 'id': e.get('id'), 'file': f}
    return rows


def blob_hashes(paths):
    if not paths: return {}
    out = git('hash-object', '--stdin-paths', inp='\n'.join(paths).encode()).split()
    return dict(zip(paths, out))


def looks_secret(path):
    if any(re.search(p, path, re.I) for p in SECRETS): return True
    if path.lower().endswith('.json') and os.path.getsize(path) < 1_000_000:
        try:
            with open(path, 'rb') as fh: return b'"private_key"' in fh.read()
        except OSError: return False
    return False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--ref', default='origin/main', help='what GitHub has (default origin/main)')
    ap.add_argument('--manifest-ref', default='origin/main', help='where the audio manifests are read (default origin/main)')
    ap.add_argument('--out', default=None)
    ap.add_argument('--no-fetch', action='store_true')
    ap.add_argument('--zip', action='store_true', help='pack the audio that GitHub does not have (differs, fills-missing, hold-tradition, new-unlisted) into zips')
    ap.add_argument('--max-zip-mb', type=int, default=90)
    ap.add_argument('--max-file-mb', type=int, default=95)
    a = ap.parse_args()

    top = git('rev-parse', '--show-toplevel').strip()
    os.chdir(top)
    if not a.no_fetch: git('fetch', '--quiet', 'origin', check=False)
    branch = git('rev-parse', '--abbrev-ref', 'HEAD').strip()
    head = git('rev-parse', '--short=8', 'HEAD').strip()
    refsha = git('rev-parse', '--short=8', a.ref).strip()
    out = a.out or os.path.join(os.path.dirname(top), f'alheb-triage-{branch.replace("/", "_")}-{datetime.date.today()}')
    if os.path.abspath(out).startswith(os.path.abspath(top) + os.sep): sys.exit('--out must be outside the repo')
    os.makedirs(out, exist_ok=True)

    entries = status_entries()
    tree = tree_of(a.ref)
    blob_at = {}
    for tp, tb in tree.items(): blob_at.setdefault(tb, tp)
    mrows = manifest_rows(a.manifest_ref)
    present = [p for c, p in entries if os.path.isfile(p)]
    hashes = blob_hashes(present)
    cap = a.max_file_mb * 1024 * 1024

    rows, by_blob = [], defaultdict(list)
    for code, p in entries:
        r = {'path': p, 'git_status': code.strip() or code, 'class': '', 'bytes': '', 'box_blob': hashes.get(p, ''), 'github_blob': tree.get(p, ''),
             'manifest_status': '', 'tradition': '', 'sidecar_on_box': '', 'note': ''}
        m = mrows.get(p)
        if m: r['manifest_status'], r['tradition'] = m['status'] or '', m['tradition'] or ''
        if not os.path.exists(p):
            r['class'] = 'deleted'; r['note'] = 'not on disk; never push a deletion'
        elif os.path.isdir(p):
            continue
        else:
            size = os.path.getsize(p); r['bytes'] = size
            name = os.path.basename(p)
            if any(re.search(x, p) for x in SCRATCH): r['class'], r['note'] = 'never', 'scratch or generated working file'
            elif looks_secret(p): r['class'], r['note'] = 'never', 'looks like a secret or key: never commit'
            elif DUP_NAME.search(name): r['class'], r['note'] = 'never', 'duplicate by name (copy or (n) suffix)'
            elif size > cap: r['class'], r['note'] = 'never', f'over {a.max_file_mb} MB (GitHub refuses files over 100 MB)'
            elif p in tree and tree[p] == r['box_blob']: r['class'] = 'same'
            elif r['box_blob'] in blob_at: r['class'], r['note'] = 'same-elsewhere', f'identical bytes already on GitHub at {blob_at[r["box_blob"]]}'
            elif p in tree: r['class'], r['note'] = 'differs', 'GitHub has other bytes here: keep GitHub\'s copy'
            elif p.startswith('audio/'):
                if m and m['status'] == 'missing' and (m['tradition'] or '') in APP_TRADITIONS:
                    r['class'] = 'fills-missing'
                    r['sidecar_on_box'] = 'yes' if os.path.isfile(p + '.meta.json') else 'no'
                elif m and m['status'] == 'missing':
                    r['class'], r['note'] = 'hold-tradition', 'made before the respelling method (docs/audio/ACCENT-VOICES-2026-11-08.md): render fresh instead'
                elif m:
                    r['class'], r['note'] = 'differs', f'manifest says {m["status"]} but GitHub has no file here: check by hand'
                elif p.endswith('.meta.json') and mrows.get(p[:-10], {}).get('status') == 'missing' \
                        and (mrows[p[:-10]].get('tradition') or '') in APP_TRADITIONS:
                    r['class'], r['note'] = 'fills-missing', 'sidecar of a clip'
                else:
                    r['class'], r['note'] = 'new-unlisted', 'no manifest lists this path'
            else:
                r['class'] = 'new-other'
            if r['box_blob'] and r['class'] in ('fills-missing', 'new-unlisted', 'hold-tradition', 'new-other', 'differs'):
                by_blob[r['box_blob']].append(p)
        rows.append(r)

    dupes = {b: ps for b, ps in by_blob.items() if len(ps) > 1}
    for r in rows:
        if r['box_blob'] in dupes:
            r['note'] = (r['note'] + '; ' if r['note'] else '') + f'same bytes at {len(dupes[r["box_blob"]])} paths'

    with open(os.path.join(out, 'triage.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ['path']); w.writeheader(); w.writerows(rows)
    groups = defaultdict(list)
    for r in rows: groups[r['class']].append(r)
    for cls, rs in groups.items():
        with open(os.path.join(out, f'{cls}.txt'), 'w', encoding='utf-8') as fh: fh.write('\n'.join(x['path'] for x in rs) + '\n')

    archive = [r for r in rows if r['path'].startswith('audio/') and r['class'] in ('differs', 'fills-missing', 'hold-tradition', 'new-unlisted')]
    zips = []
    if a.zip and archive:
        limit, n, cur, size = a.max_zip_mb * 1024 * 1024, 0, None, 0
        idx = open(os.path.join(out, 'archive-index.csv'), 'w', newline='', encoding='utf-8'); iw = csv.writer(idx); iw.writerow(['zip', 'path', 'class', 'bytes', 'sha256'])
        for r in sorted(archive, key=lambda x: x['path']):
            b = int(r['bytes'] or 0)
            if cur is None or size + b > limit:
                if cur: cur.close()
                n += 1; zname = f'{branch.split("/")[-1]}-box-raw-{n:02d}.zip'; cur = zipfile.ZipFile(os.path.join(out, zname), 'w', zipfile.ZIP_STORED); size = 0; zips.append(zname)
            cur.write(r['path'], r['path']); size += b
            with open(r['path'], 'rb') as fh: iw.writerow([zips[-1], r['path'], r['class'], b, hashlib.sha256(fh.read()).hexdigest()])
        if cur: cur.close()
        idx.close()

    cnt = Counter(r['class'] for r in rows)
    def mb(rs): return sum(int(x['bytes'] or 0) for x in rs) / 1048576
    lines = [f'# Triage of {top}', '', f'- Checkout: `{branch}` at `{head}`; compared with `{a.ref}` at `{refsha}`; manifests from `{a.manifest_ref}`.',
             f'- Paths reported by git status: {len(entries)}.', '', '| Class | Files | MB | What to do |', '|---|---|---|---|']
    todo = {'same': 'Nothing: already on GitHub.', 'same-elsewhere': 'Nothing: a duplicate of a file GitHub already has under another name.', 'differs': 'Keep GitHub\'s copy. Audio: archive zip only. Other files: compare by hand.',
            'fills-missing': 'Main still lacks these: archive the box copies, fill the app with a fresh render on a new branch.', 'hold-tradition': 'Archive zip only; render fresh if wanted.',
            'new-unlisted': 'Archive zip only.', 'new-other': 'Read each; port real work to a fresh branch from main.', 'deleted': 'Leave alone; never push.',
            'never': 'Never commit (scratch, secrets, name duplicates, over the cap).'}
    for cls in ['same', 'same-elsewhere', 'differs', 'fills-missing', 'hold-tradition', 'new-unlisted', 'new-other', 'deleted', 'never']:
        lines.append(f'| {cls} | {cnt.get(cls, 0)} | {mb(groups.get(cls, [])):.1f} | {todo[cls]} |')
    fm = groups.get('fills-missing', [])
    lines += ['', f'- fills-missing clips with a sidecar on the box: {sum(1 for r in fm if r["sidecar_on_box"] == "yes")} of {sum(1 for r in fm if not r["path"].endswith(".meta.json"))}.',
              f'- Same bytes at several paths: {len(dupes)} groups (see the note column).',
              f'- Largest file: {max((int(r["bytes"] or 0) for r in rows), default=0) / 1048576:.1f} MB (GitHub hard limit 100 MB).',
              f'- Archive zips: {", ".join(zips) if zips else "not built (add --zip)"}.']
    secrets = [r['path'] for r in rows if 'secret' in r['note']]
    if secrets: lines += ['', '**Possible secrets found (never commit; move them out of the repo folder):**', *[f'- `{s}`' for s in secrets]]
    open(os.path.join(out, 'summary.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('\n'.join(lines)); print(f'\nWritten to {out}')


if __name__ == '__main__':
    main()
