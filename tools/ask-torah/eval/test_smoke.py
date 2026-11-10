#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ask_torah.answer import answer_question
from ask_torah.corpus import default_corpus
from ask_torah.divine import NAME_ABBREV
from ask_torah.retrieve import Retriever

def main():
    r = Retriever(default_corpus())
    a = answer_question("Is the Shema in the Torah?", retriever=r)
    assert a["verdict"] == "in_torah"
    assert "deuteronomy.6.4" in a["cited_ids"]
    a = answer_question("is rabbi in the Torah", retriever=r)
    assert a["verdict"] == "not_in_torah" and not a["declined"]
    a = answer_question("What's the weather in Toronto today?", retriever=r)
    assert a["verdict"] == "off_topic" and a["declined"]
    v = r.corpus.get("exodus.20.2")
    assert NAME_ABBREV in v.he
    assert "YHWH" not in v.en
    print("smoke ok")

if __name__ == "__main__":
    main()
