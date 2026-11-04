"""Tiny authoring DSL for the intermediate lessons (lives outside the repo; output is the JSON)."""

def W(he, en, note=None):
    d = {"he": he, "en": en}
    if note: d["note"] = note
    return d

def recall(he, en, hint=None):
    d = {"type": "recall", "he": he, "en": en}
    if hint: d["hint"] = hint
    return d

def produce(en, correct, *distractors):
    return {"type": "produce", "en": en, "options": [correct, *distractors], "answer": 0}

def match(*pairs):
    return {"type": "match", "pairs": [{"he": h, "en": e} for h, e in pairs]}

def order(he, en):
    return {"type": "order", "he": he, "en": en}

def respond(cue, ans_he, ans_en, prompt_he=None, prompt_en=None):
    d = {"type": "respond", "cue": cue, "answer": {"he": ans_he, "en": ans_en}}
    if prompt_he: d["prompt"] = {"he": prompt_he, "en": prompt_en or ""}
    return d

def gender(m, f, en):
    return {"type": "gender", "m": m, "f": f, "en": en}

def dialogue(*lines, task=None):
    d = {"type": "dialogue", "lines": [{"speaker": s, "he": h, "en": e} for s, h, e in lines]}
    if task: d["task"] = task
    return d

def fade(line, en, line_index=None):
    d = {"type": "fade", "line": line, "en": en}
    if line_index: d["lineIndex"] = line_index
    return d

def spot(line, target, en, line_index=None):
    d = {"type": "spot", "line": line, "target": target, "en": en}
    if line_index: d["lineIndex"] = line_index
    return d

def register(he, en, answer):
    return {"type": "register", "he": he, "en": en, "answer": answer, "options": ["formal", "neutral", "casual", "slang"]}

def lesson(id, unit, title, words, prayer_lines, goals, est, prereqs, exercises, note=None, level=None, track=None):
    return {
        "id": id, "unit": unit, "title": title, "words": words, "prayerLines": prayer_lines, "goals": goals,
        "estMinutes": est, "prerequisites": prereqs, "exercises": exercises, "note": note,
        "level": level or ("intermediate" if unit == "synagogue" else "B1"),
        "track": track or ("read" if unit == "synagogue" else "israel"),
    }
