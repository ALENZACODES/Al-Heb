#!/usr/bin/env python3
"""Build data/letters/keyboard-si1452.json from xkeyboard-config symbols/il ("basic" = SI-1452 (2013)).
Source: /usr/share/X11/xkb/symbols/il (xkb-data 2.41, permissive X11-style license; see data/letters/SOURCES.md).
The AltGr niqqud entries were cross-checked against Wikipedia 'Hebrew keyboard' (AltGr list) -- they agree.
Usage: python3 tools/letters/build_keyboard.py [path/to/symbols/il]"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/usr/share/X11/xkb/symbols/il"
HEB = {"hebrew_aleph":"א","hebrew_bet":"ב","hebrew_gimel":"ג","hebrew_dalet":"ד","hebrew_he":"ה","hebrew_waw":"ו","hebrew_zain":"ז",
 "hebrew_chet":"ח","hebrew_tet":"ט","hebrew_yod":"י","hebrew_kaph":"כ","hebrew_lamed":"ל","hebrew_mem":"מ","hebrew_nun":"נ",
 "hebrew_samech":"ס","hebrew_ayin":"ע","hebrew_pe":"פ","hebrew_zade":"צ","hebrew_qoph":"ק","hebrew_resh":"ר","hebrew_shin":"ש",
 "hebrew_taw":"ת","hebrew_finalkaph":"ך","hebrew_finalmem":"ם","hebrew_finalnun":"ן","hebrew_finalpe":"ף","hebrew_finalzade":"ץ"}
ID = {"א":"alef","ב":"bet","ג":"gimel","ד":"dalet","ה":"he","ו":"vav","ז":"zayin","ח":"chet","ט":"tet","י":"yod","כ":"kaf","ל":"lamed",
 "מ":"mem","נ":"nun","ס":"samekh","ע":"ayin","פ":"pe","צ":"tsadi","ק":"qof","ר":"resh","ש":"shin","ת":"tav",
 "ך":"kaf-final","ם":"mem-final","ן":"nun-final","ף":"pe-final","ץ":"tsadi-final"}
ASCII = {"slash":"/","apostrophe":"'","semicolon":";","comma":",","period":".","minus":"-","equal":"=","bracketleft":"[","bracketright":"]",
 "backslash":"\\","asciitilde":"~","exclam":"!","at":"@","numbersign":"#","dollar":"$","percent":"%","asciicircum":"^","ampersand":"&",
 "asterisk":"*","parenright":")","parenleft":"(","underscore":"_","plus":"+","braceright":"}","braceleft":"{","bar":"|","question":"?",
 "colon":":","quotedbl":'"',"greater":">","less":"<","rightdoublequotemark":"”","doublelowquotemark":"„",
 "rightsinglequotemark":"’","singlelowquotemark":"‚","EuroSign":"€","NewSheqelSign":"₪","degree":"°",
 "multiply":"×","division":"÷","endash":"–","none":None}
QW = {"AD":"qwertyuiop","AC":"asdfghjkl;","AB":"zxcvbnm,./"}
NIQQUD = {0x5b8:"kamatz",0x5b7:"patach",0x5b5:"tzere",0x5b6:"segol",0x5b4:"chirik",0x5b9:"cholam",0x5bb:"kubutz",0x5b0:"shva",
 0x5b2:"chataf-patach",0x5b1:"chataf-segol",0x5b3:"chataf-kamatz",0x5bc:"dagesh",0x5c1:"shin-dot",0x5c2:"sin-dot"}

def sym(tok):
    tok = tok.strip()
    if tok in HEB: return HEB[tok]
    if tok in ASCII: return ASCII[tok]
    m = re.fullmatch(r"U([0-9A-Fa-f]{4})", tok)
    if m: return chr(int(m.group(1), 16))
    if len(tok) == 1: return tok
    raise SystemExit("unmapped keysym " + tok)

def main():
    txt = open(SRC, encoding="utf-8").read()
    block = txt.split('xkb_symbols "basic"')[1].split("\n};")[0]
    keys = []
    for m in re.finditer(r"key <(\w+)>\s*\{\[([^\]]*)\]\}", block):
        code, body = m.group(1), [t for t in m.group(2).split(",")]
        levels = [sym(t) for t in body if t.strip()]
        base = levels[0]; shift = levels[1] if len(levels) > 1 else None
        altgr = levels[2] if len(levels) > 2 else None
        label = None
        mm = re.fullmatch(r"(AD|AC|AB)(\d\d)", code)
        if mm and int(mm.group(2)) <= 10: label = QW[mm.group(1)][int(mm.group(2)) - 1]
        elif code == "AD11": label = "["
        elif code == "AD12": label = "]"
        elif code == "AC11": label = "'"
        elif code == "BKSL": label = "\\"
        elif code == "TLDE": label = "`"
        elif code.startswith("AE"):
            n = int(code[2:]); label = {11:"-",12:"="}.get(n, str(n % 10))
        keys.append({"code": code, "qwerty": label, "base": base, "shift": shift, "altgr": altgr})
    letters = {}
    for k in keys:
        if k["base"] in ID:
            letters[ID[k["base"]]] = {"code": k["code"], "qwerty": k["qwerty"], "char": k["base"], "layer": "base"}
    niqqud = {}
    for k in keys:
        a = k["altgr"]
        if a and ord(a) in NIQQUD:
            niqqud[NIQQUD[ord(a)]] = {"code": k["code"], "qwerty": k["qwerty"], "char": a, "codepoint": "U+%04X" % ord(a),
                                      "modifier": "AltGr", "keycapBase": k["base"]}
    out = {
     "id": "si-1452",
     "name": "Israeli standard SI-1452 (2013 revision, first part)",
     "source": "xkeyboard-config symbols/il, xkb_symbols \"basic\" (header: 'implementation of the Israeli standard SI-1452 (2013)'); AltGr niqqud list cross-checked with Wikipedia 'Hebrew keyboard'",
     "notes": [
       "'qwerty' is the key legend of the US layout at the same physical position, which is what an Israeli keyboard also prints.",
       "Final letters (ך ם ן ף ץ) each have their own base-layer key.",
       "shuruk has no key of its own: type vav then AltGr+vav-position dagesh (U+05BC), i.e. ו + dagesh. Flagged as a gap for lane 3 to confirm.",
       "This is the 2013 layout. The 2018 'si2' variant (SI-1452-2) moves ת ץ ן; NOT included here.",
       "The extra Yiddish and nun-hafukha entries in the xkb file are omitted from the trainer.",
       "Physical key positions beyond the letter rows (number row punctuation) are listed in 'keys' for completeness only."],
     "keys": keys, "letters": letters, "niqqud": niqqud,
     "gaps": ["shuruk (composed: vav + dagesh)", "SI-1452-2 (2018) variant not encoded", "verified against xkb file and Wikipedia AltGr list only, not against the SI-1452 standard document itself"]}
    with open(os.path.join(ROOT, "data", "letters", "keyboard-si1452.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(len(letters), "letters,", len(niqqud), "niqqud;", sorted(set(NIQQUD.values()) - set(niqqud)))
main()
