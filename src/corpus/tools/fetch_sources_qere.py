#!/usr/bin/env python3
"""QERE FIX + READER CONTEXT VERSES. Re-fetch a handful of UXLC items and MERGE them into data/corpus/source-snapshot.json.

Why: fetch_sources.py and fetch_sources_extra.py originally matched <w> elements only, so a ketiv/qere word (UXLC writes
the unpointed ketiv in <k> and the pointed qere in <q>) was missing from the raw line. Both scripts now read <w> and <q>
and skip <k>, the same convention as src/torahread/tools/build-data.mjs and tools/corpus/verify_texts.mjs. This script
re-fetches ONLY the two records that were affected, so nothing else in the snapshot changes:
    hashivenu       Lamentations 5:21  (qere  וְנָשׁוּבָה  was missing)
    shir-hamaalot   Psalms 126:1-6     (qere  שְׁבִיתֵנוּ  was missing in verse 4)
and adds two snapshot-only items (no registry record) that the Torah reader view shows around the Priestly Blessing:
    bless-priestly-intro   Numbers 6:22-23
    bless-priestly-close   Numbers 6:27
Re-running replaces just these four keys, each stamped with its own fetchedAt.

Run:  python3 -I src/corpus/tools/fetch_sources_qere.py   (needs outbound HTTPS; stdlib only)
Then: node src/corpus/tools/build-registry.mjs && node src/corpus/tools/build-licenses.mjs && node tools/corpus/trope.mjs
"""
import json, re, time, urllib.parse, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[3] / "data" / "corpus" / "source-snapshot.json"
SEF = "https://www.sefaria.org/api/v3/texts/"
JPS = "The Holy Scriptures: A New Translation (JPS 1917)"

def get(url):
    err = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'alef-corpus-fetch/1.0 (+https://github.com/ALENZACODES)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf8")
        except Exception as e:  # noqa
            err = e; time.sleep(2)
    raise err

_tanach = {}
def tanach_book(name):
    if name not in _tanach:
        _tanach[name] = get("https://tanach.us/Books/%s.xml" % name)
    return _tanach[name]

def tanach_verse(book, ch, v):
    s = tanach_book(book)
    m = re.search(r'<c n="%d">(.*?)</c>' % ch, s, re.S)
    mv = re.search(r'<v n="%d">(.*?)</v>' % v, m.group(1), re.S)
    words = [m[1] for m in re.findall(r"<(w|q)>(.*?)</\1>", mv.group(1), re.S)]  # <w> + <q>; <k> skipped
    return " ".join(w.strip() for w in words)

def tanach_item(book, ch, v1, v2, sefref):
    raw = [tanach_verse(book, ch, v) for v in range(v1, v2 + 1)]
    ver = re.search(r"<version>(.*?)</version>", tanach_book(book)).group(1)
    date = re.search(r"<edition>.*?<date>(.*?)</date>", tanach_book(book), re.S).group(1)
    d = json.loads(get(SEF + urllib.parse.quote(sefref) + "?version=" + urllib.parse.quote("english|" + JPS)))
    ev = d["versions"][0]
    assert ev["versionTitle"] == JPS and ev["license"] == "Public Domain", ev["versionTitle"]
    en = ev["text"] if isinstance(ev["text"], list) else [ev["text"]]
    return {
        "kind": "tanach-us", "book": book, "chapter": ch, "verses": [v1, v2],
        "versionTitle": "Unicode/XML Leningrad Codex (UXLC) " + ver + " (file dated " + date + ")",
        "license": "Public Domain / copy without restriction (tanach.us/License.html)",
        "url": "https://tanach.us/Books/%s.xml" % book,
        "rawLines": raw,
        "english": {"versionTitle": JPS, "license": "Public Domain", "ref": sefref, "rawLines": en,
                    "versionSource": ev.get("versionSource")},
    }

ITEMS = [
    ("hashivenu", "Lamentations", 5, 21, 21, "Lamentations 5:21"),
    ("shir-hamaalot", "Psalms", 126, 1, 6, "Psalms 126:1-6"),
    ("bless-priestly-intro", "Numbers", 6, 22, 23, "Numbers 6:22-23"),
    ("bless-priestly-close", "Numbers", 6, 27, 27, "Numbers 6:27"),
]

if __name__ == "__main__":
    items = {i: tanach_item(b, c, v1, v2, ref) for i, b, c, v1, v2, ref in ITEMS}
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for v in items.values(): v["fetchedAt"] = now
    snap = json.loads(OUT.read_text(encoding="utf8"))
    snap["items"].update(items)
    OUT.write_text(json.dumps(snap, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print("merged", sorted(items), "into", OUT)
