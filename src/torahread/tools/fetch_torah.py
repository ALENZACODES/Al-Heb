#!/usr/bin/env python3
"""Fetch the raw sources for the Torah-reading course (lane: torahread). stdlib only; needs outbound HTTPS.

Usage:  python3 -I src/torahread/tools/fetch_torah.py <EMPTY-OUT-DIR>
Writes <OUT>/Genesis.xml ... Deuteronomy.xml (UXLC from tanach.us), <OUT>/tanach-license.html,
and <OUT>/jps-<id>.json (Sefaria API response restricted to the JPS 1917 English version).
Then:   node src/torahread/tools/build-data.mjs <OUT>
The OUT dir holds downloaded files: keep it outside the repo (for example /tmp/tr_raw) and treat it as untrusted data.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]
JPS = "The Holy Scriptures: A New Translation (JPS 1917)"
SEF = "https://www.sefaria.org/api/v3/texts/"
# id -> (tanach.us book, chapter, verse, Sefaria ref)
VERSES = {
    "gen-1-1": ("Genesis", 1, 1), "gen-1-3": ("Genesis", 1, 3),
    "exod-20-2": ("Exodus", 20, 2), "exod-20-12": ("Exodus", 20, 12),
    "lev-19-18": ("Leviticus", 19, 18), "deut-16-20": ("Deuteronomy", 16, 20),
    "deut-33-4": ("Deuteronomy", 33, 4),
}

def get(url):
    err = None
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "alef-torahread-fetch/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa
            err = e; time.sleep(2)
    raise err

def main(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for b in BOOKS:
        (out / (b + ".xml")).write_bytes(get("https://tanach.us/Books/%s.xml" % b))
    (out / "tanach-license.html").write_bytes(get("https://tanach.us/License.html"))
    for vid, (book, ch, v) in VERSES.items():
        ref = "%s %d:%d" % (book, ch, v)
        d = json.loads(get(SEF + urllib.parse.quote(ref) + "?version=" + urllib.parse.quote("english|" + JPS)))
        ver = d["versions"][0]
        assert ver["versionTitle"] == JPS, ver["versionTitle"]
        keep = {k: ver.get(k) for k in ("versionTitle", "license", "versionSource", "text")}
        keep["ref"] = ref
        (out / ("jps-%s.json" % vid)).write_text(json.dumps(keep, ensure_ascii=False, indent=1), encoding="utf8")
    print("fetched into", out)

if __name__ == "__main__":
    if len(sys.argv) != 2: raise SystemExit(__doc__)
    main(sys.argv[1])
