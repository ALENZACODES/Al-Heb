#!/usr/bin/env python3
"""Fixes found in the independent free-form review, locked as tests."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ask_torah.answer import answer_question
from ask_torah.corpus import default_corpus
from ask_torah.divine import NAME_ABBREV, LATIN_NAME
from ask_torah.retrieve import Retriever

def main():
    r = Retriever(default_corpus())
    def ask(q, history=None):
        return answer_question(q, retriever=r, history=history)

    a = ask("whats the deal with moruning in the torah?? like when someone dies")
    assert a["verdict"] == "in_torah"
    assert set(a["cited_ids"]) & {"genesis.23.2", "genesis.37.34", "deuteronomy.34.8", "genesis.50.10"}

    a = ask("gods comandments, the main ones, where r they")
    assert a["verdict"] == "in_torah" and {"exodus.20.1", "deuteronomy.5.1", "deuteronomy.6.1"} & set(a["cited_ids"])

    a = ask("like what is evle according to the 5 books")
    assert a["verdict"] == "in_torah"
    assert any(i.startswith("genesis.") or i.startswith("deuteronomy.") for i in a["cited_ids"])

    a = ask("is rabbi in torah tho or did they make that up later")
    assert a["verdict"] == "not_in_torah" and not a["declined"]
    assert a.get("later_sources")

    a = ask("does the torah talk about the afterlife or olam haba")
    assert a["verdict"] == "not_in_torah"
    assert "genesis.37.35" in a["cited_ids"] or "deuteronomy.32.22" in a["cited_ids"] or "numbers.16.33" in a["cited_ids"]

    a = ask("is the messiah in the torah or only later prophets")
    assert a["verdict"] == "not_in_torah"

    a = ask("what about the satan, is he in the 5 books")
    assert a["verdict"] == "not_in_torah"

    a = ask("is the snake in eden supposed to be satan?? does it say that")
    assert a["verdict"] == "not_in_torah"
    assert "satan" in a["explanation"].lower() or "serpent" in a["explanation"].lower()

    a = ask("שמע ישראל — where is this and what does it say")
    assert a["verdict"] == "in_torah" and "deuteronomy.6.4" in a["cited_ids"]

    a = ask("is jerusalem even named in the torah")
    assert a["verdict"] == "not_in_torah"

    a = ask("milk and meat together, is that a torah thing or later")
    assert a["verdict"] == "in_torah"
    assert {"exodus.23.19", "exodus.34.26", "deuteronomy.14.21"} & set(a["cited_ids"])

    a = ask("what about their kids then", ["addam and ev — are they in chumash or just sunday school"])
    assert "genesis.4.1" in a["cited_ids"] or "genesis.4.8" in a["cited_ids"]

    a = ask("can i cook on it or no", ["what does the torah say about shabbat"])
    assert a["verdict"] == "in_torah" and ("exodus.35.3" in a["cited_ids"] or "exodus.16.23" in a["cited_ids"])

    a = ask("is lilith in the torah, adams first wife or whatever")
    assert a["verdict"] == "not_in_torah"

    a = ask("weather in tel aviv tomorrow")
    assert a["declined"] and a["verdict"] == "off_topic"

    # Divine Name never spelled in Latin
    a = ask("i heard 'let there be light' — exact ref pls")
    blob = a["explanation"] + " " + " ".join(p.get("en","")+p.get("he","") for p in a["passages"])
    assert not LATIN_NAME.search(blob)
    v = r.corpus.get("exodus.20.2")
    assert NAME_ABBREV in v.he

    a = ask("sorry i meant mourning, not morning — where does it talk about grieving")
    assert a["verdict"] == "in_torah"
    assert set(a["cited_ids"]) & {"genesis.23.2", "genesis.37.34", "deuteronomy.34.8", "genesis.50.10"}
    assert not set(a["cited_ids"]) & {"genesis.1.5", "exodus.29.39", "exodus.16.21"}

    a = ask("why cant i eat bacon lol where does it SAY that")
    assert a["verdict"] == "in_torah"
    assert any(x.startswith("leviticus.11.7") or x.startswith("deuteronomy.14.8") for x in a["cited_ids"])

    a = ask("casherut — pigs, shellfish, is that in the 5 books or just rabbis")
    assert a["verdict"] == "in_torah"
    assert a.get("tradition_id") != "rabbi-title"
    assert any("leviticus.11" in x or "deuteronomy.14" in x for x in a["cited_ids"])

    a = ask("do u have to have split hooves AND chew cud? where")
    assert a["verdict"] == "in_torah"
    assert any("leviticus.11" in x or "deuteronomy.14" in x for x in a["cited_ids"])

    a = ask("angels in the torah? like actual malachim?")
    assert a["verdict"] == "in_torah"
    assert any(x.startswith("genesis.") for x in a["cited_ids"])

    a = ask("did angels visit abraham or is that midrash")
    assert a["verdict"] == "in_torah"
    assert "genesis.18.2" in a["cited_ids"] or "genesis.18.1" in a["cited_ids"]
    assert "genesis.19.1" in a["cited_ids"]
    expl = a["explanation"].lower()
    assert "men" in expl and "angel" in expl

    a = ask("shavuot, is that when we got the torah according to the text itself")
    assert a["verdict"] == "in_torah"
    expl = a["explanation"].lower()
    assert "later" in expl or "does not" in expl or "not itself" in expl
    assert any("leviticus.23" in x or "deuteronomy.16" in x or "exodus.34.22" in x for x in a["cited_ids"])

    a = ask("noahs ark, rainbow, is that genesis")
    assert a["verdict"] == "in_torah"
    assert any(x.startswith("genesis.6") or x.startswith("genesis.7") or x.startswith("genesis.9") for x in a["cited_ids"])
    assert not any(x.startswith("exodus.") for x in a["cited_ids"])

    a = ask("did god really ask abraham to sacrifice isaac or is that not in the five books")
    assert a["verdict"] == "in_torah"
    assert any(x.startswith("genesis.22") for x in a["cited_ids"])
    assert not any(x.startswith("genesis.17") for x in a["cited_ids"])

    a = ask("moses death, does the torah say who buried him")
    assert a["verdict"] == "in_torah"
    assert "deuteronomy.34.6" in a["cited_ids"] or "deuteronomy.34.5" in a["cited_ids"]
    assert "exodus.2.10" not in a["cited_ids"]

    a = ask("the stranger, treat them like, where does it say")
    assert a["verdict"] == "in_torah" and a["cited_ids"]

    a = ask("honour your parents, which of the 10")
    assert a["verdict"] == "in_torah"
    assert any(x in a["cited_ids"] for x in ("exodus.20.12", "deuteronomy.5.16", "leviticus.19.3"))

    a = ask("is slavery in the torah and what does it say, honestly")
    assert a["verdict"] == "in_torah"
    assert any(x.startswith("exodus.21") or x.startswith("leviticus.25") or x.startswith("deuteronomy.15") for x in a["cited_ids"])

    a = ask("niddah / family purity, is the basic idea in the torah")
    assert a["verdict"] == "in_torah"
    assert any(x.startswith("leviticus.15") or x.startswith("leviticus.18.19") for x in a["cited_ids"])

    a = ask("witchcraft / a witch, does exodus really say that")
    assert a["verdict"] == "in_torah"
    assert "exodus.22.17" in a["cited_ids"]

    a = ask("is god a man or a woman in the torah, or neither")
    assert a["verdict"] == "in_torah"
    assert "numbers.23.19" in a["cited_ids"]

    a = ask("does the torah mention prayer, like people praying")
    assert a["verdict"] == "in_torah"
    assert "genesis.20.17" in a["cited_ids"] or "genesis.25.21" in a["cited_ids"]

    a = ask("ok name one woman who leads something", ["what does the torah actually say about women, not later commentators"])
    assert a["verdict"] == "in_torah"
    assert "exodus.15.20" in a["cited_ids"]

    a = ask("is the word 'angel' in english translations of genesis")
    assert a["verdict"] == "in_torah"
    assert any(x in a["cited_ids"] for x in ("genesis.16.7", "genesis.19.1", "genesis.22.11"))

    a = ask("who won the world series and also is baseball in the torah (spoiler no but im asking about the game)")
    assert a["verdict"] == "not_in_torah"
    assert not a["cited_ids"]

    a = ask("can you help me write a python loop, this isnt a torah question")
    assert a["verdict"] == "off_topic" and a["declined"]

    a = ask("is 'thou shalt not kill' or 'not murder', the commandment, where")
    assert a["verdict"] == "in_torah"
    assert "exodus.20.13" in a["cited_ids"] or "deuteronomy.5.17" in a["cited_ids"]

    a = ask("the angel in the burning bush wait was it an angel or god")
    assert a["verdict"] == "in_torah"
    assert "exodus.3.2" in a["cited_ids"]
    assert "exodus.2.10" not in a["cited_ids"]
    assert not any(x.startswith("genesis.") for x in a["cited_ids"])

    a = ask("polygamy, did the torah allow more than one wife")
    assert a["verdict"] == "in_torah"
    assert any(x in a["cited_ids"] for x in ("exodus.21.10", "deuteronomy.21.15", "deuteronomy.17.17"))
    assert "exodus.7.6" not in a["cited_ids"]

    a = ask("None of this is about religion: indoor plants.")
    assert a["declined"] and a["verdict"] == "off_topic"

    a = ask("Where in the Torah does the word ואתבנה appear in Genesis 21:10?")
    assert a["verdict"] == "in_torah"
    assert "genesis.21.10" in a["cited_ids"]
    expl = a["explanation"]
    assert "ואתבנה" in expl
    assert "maqqef" in expl.lower() or "consonant" in expl.lower() or "not written as a single" in expl.lower()

    print("independent tests ok")

if __name__ == "__main__":
    main()
