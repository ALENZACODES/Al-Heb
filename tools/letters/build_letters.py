#!/usr/bin/env python3
"""Assemble data/letters/letters.json from metadata + font outlines + authored strokes.
Run extract_outlines.py first. All stroke data is a DRAFT: validated=false, needsNativeReview=true."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geom import smooth
from author_strokes import PRINT, CURSIVE

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
outl = json.load(open(os.path.join(ROOT, "data", "letters", "_build", "print_outlines.json"), encoding="utf-8"))

# id, English name, Hebrew name (pointed), glyph, gematria, ipa (modern Israeli), English cue
META = [
 ("alef","Alef","אָלֶף","א",1,"ʔ","silent / a tiny glottal stop, like the pause in 'uh-oh'"),
 ("bet","Bet","בֵּית","ב",2,"b ~ v","b with a dot (bet), v without (vet)"),
 ("gimel","Gimel","גִּימֶל","ג",3,"ɡ","g as in go"),
 ("dalet","Dalet","דָּלֶת","ד",4,"d","d as in door"),
 ("he","He","הֵא","ה",5,"h","h as in hat"),
 ("vav","Vav","וָו","ו",6,"v","v as in van"),
 ("zayin","Zayin","זַיִן","ז",7,"z","z as in zoo"),
 ("chet","Chet","חֵית","ח",8,"χ","throaty ch, like Bach"),
 ("tet","Tet","טֵית","ט",9,"t","t as in top"),
 ("yod","Yod","יוֹד","י",10,"j","y as in yes"),
 ("kaf","Kaf","כַּף","כ",20,"k ~ χ","k with a dot (kaf), throaty ch without (khaf)"),
 ("lamed","Lamed","לָמֶד","ל",30,"l","l as in lamp"),
 ("mem","Mem","מֵם","מ",40,"m","m as in map"),
 ("nun","Nun","נוּן","נ",50,"n","n as in net"),
 ("samekh","Samekh","סָמֶךְ","ס",60,"s","s as in sun"),
 ("ayin","Ayin","עַיִן","ע",70,"ʔ","silent in modern Israeli Hebrew (like alef)"),
 ("pe","Pe","פֵא","פ",80,"p ~ f","p with a dot (pe), f without (fe)"),
 ("tsadi","Tsadi","צָדִי","צ",90,"ts","ts as in cats"),
 ("qof","Qof","קוֹף","ק",100,"k","k as in kite"),
 ("resh","Resh","רֵישׁ","ר",200,"ʁ","back-of-throat r, like French r"),
 ("shin","Shin","שִׁין","ש",300,"ʃ","sh as in ship (sin, dot on the left, is s)"),
 ("tav","Tav","תָּו","ת",400,"t","t as in top"),
 ("kaf-final","Final Kaf","כַּף סוֹפִית","ך",500,"k ~ χ","same as kaf, only at the end of a word"),
 ("mem-final","Final Mem","מֵם סוֹפִית","ם",600,"m","same as mem, only at the end of a word"),
 ("nun-final","Final Nun","נוּן סוֹפִית","ן",700,"n","same as nun, only at the end of a word"),
 ("pe-final","Final Pe","פֵא סוֹפִית","ף",800,"p ~ f","same as pe, only at the end of a word"),
 ("tsadi-final","Final Tsadi","צָדִי סוֹפִית","ץ",900,"ts","same as tsadi, only at the end of a word"),
]
FINAL_OF = {"kaf-final":"kaf","mem-final":"mem","nun-final":"nun","pe-final":"pe","tsadi-final":"tsadi"}
# Confusable sets from the research (Key Question 5). Letter ids only; the shin/sin dot set lives in confusables.json.
CONF = {
 "bet":["kaf","pe"],"kaf":["bet","pe"],"pe":["bet","kaf"],
 "gimel":["nun"],"nun":["gimel"],
 "dalet":["resh","kaf-final"],"resh":["dalet","kaf-final"],"kaf-final":["dalet","resh"],
 "vav":["zayin","nun-final","yod"],"zayin":["vav","nun-final"],"nun-final":["vav","zayin"],"yod":["vav"],
 "he":["chet","tav"],"chet":["he","tav"],"tav":["he","chet"],
 "samekh":["mem-final"],"mem-final":["samekh"],
 "tsadi":["ayin"],"ayin":["tsadi"],
 "pe-final":["tsadi-final"],"tsadi-final":["pe-final"],
}
PRINT_COUNT_CONFIRMED = {"vav":1,"kaf":1,"resh":1,"bet":2,"dalet":2,"zayin":2,"samekh":2,"ayin":2,"tsadi":2,"mem-final":2}
CURSIVE_COUNT_CONFIRMED = {"alef":2,"mem":3}

def strokes(spec):
    out = []
    for pts in spec:
        d, med = smooth(pts)
        out.append({"path": d, "median": med})
    return out

def script_block(kind, lid):
    spec = (PRINT if kind == "print" else CURSIVE)[lid]
    st = strokes(spec)
    blk = {"strokes": st, "strokeWidth": 85 if kind == "print" else 55,
           "validated": False, "needsNativeReview": True, "quality": "draft"}
    if kind == "print":
        blk["outline"] = outl[lid]["outline"]
        blk["outlineSource"] = "DejaVu Sans (see data/letters/SOURCES.md)"
        blk["strokeBasis"] = "authored centerlines over font outline; order by author convention (docs/letters/STROKE-RULES.md)"
        conf = PRINT_COUNT_CONFIRMED.get(lid)
    else:
        blk["strokeBasis"] = "hand-authored simplified ktav yad from verbal descriptions; no font or dataset"
        conf = CURSIVE_COUNT_CONFIRMED.get(lid)
    blk["strokeCountConfirmedByResearch"] = (conf == len(st)) if conf else False
    return blk

def main():
    recs = []
    for lid, name, nameHe, he, g, ipa, cue in META:
        r = {"id": lid, "name": name, "nameHe": nameHe, "he": he}
        if lid in FINAL_OF: r["finalOf"] = FINAL_OF[lid]
        r["gematria"] = g
        if lid in FINAL_OF:
            r["gematriaIsConvention"] = True
            r["gematriaNote"] = "500-900 for final forms is a widely cited convention; no fetched source confirmed it. Verify before printing."
        r["sound"] = {"ipa": ipa, "tradition": "israeli", "en": cue}
        r["confusableWith"] = CONF.get(lid, [])
        r["print"] = script_block("print", lid)
        r["cursive"] = script_block("cursive", lid)
        recs.append(r)
    with open(os.path.join(ROOT, "data", "letters", "letters.json"), "w", encoding="utf-8") as fh:
        json.dump(recs, fh, ensure_ascii=False, indent=1)
    print("wrote", len(recs), "records")
main()
