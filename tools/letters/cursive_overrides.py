"""Per-letter corrections applied after the automatic derivation (documented in docs/letters/STROKE-RULES.md).
Keys (indices refer to the chain list AFTER automatic orientation/ordering, before the override):
  join  [(i, j), ...]  concatenate chain i then chain j into one stroke (pen did not lift; auto-pairing missed it)
  flip  [i, ...]       reverse a chain's direction
  order [i, ...]       final order of chains
  min_len              drop chains shorter than this many pixels
"""
OVERRIDES = {
    "tet": {"flip": [0]},                 # Abzug numbered cursive: inner short stem first, long sweep last (see REVIEW-LIST)
    "gimel": {"order": [1, 0]},            # body first, right-to-left flick second (R4)
    "zayin": {"join": [(0, 1)]},           # top diagonal flows into the bottom curve: one pen stroke
    "chet": {"join": [(1, 2)], "order": [0, 1]},  # left leg = spike above the arc + leg; arc first (R3/R4)
    "tsadi": {"join": [(0, 1)]},           # "3"-shaped body written without lifting
}


def _mem(chains):
    """Auto result: chain0 = right diagonal + valley + short rise to the junction, chain1 = hump top -> left foot.
    The pen really goes right diagonal -> valley -> up to the hump top -> down-left to the foot (an N shape), so splice:
    chain0 up to the valley (lowest point), then chain1 from the hump top."""
    c0, c1 = chains
    v = max(range(len(c0)), key=lambda i: c0[i][0])
    return [c0[:v + 1] + c1]

def _pe_final(chains):
    """Left sweep (blue, auto chain1) is the first part of the same pen stroke: left tip -> junction -> loop -> stem down."""
    red, blue = chains
    return [blue[::-1] + red[1:]]

def _tav(chains):
    """Auto result is one chain: right stem end -> up over the arch -> down the left stem into the foot. Abzug's numbered cursive tav
    (viewed, not copied) writes the arch + right stem first (left to right, then down), then the left stem with its foot as a separate
    stroke. Split at the apex (top-most point): stroke 1 = apex -> end of right stem, stroke 2 = apex -> foot."""
    c = chains[0]
    ap = min(range(len(c)), key=lambda i: c[i][0])
    return [c[:ap + 1][::-1], c[ap:]]

CUSTOM = {"tav": _tav, "mem": _mem, "pe-final": _pe_final}
