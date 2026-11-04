"""Build docs/youtube/synthesis.md from the concept JSON (tables) plus the narrative below."""
import json
d = json.load(open('/home/claude/alef/data/curriculum/resource-concepts-youtube100.json'))
cs = d['concepts']
def table(src):
    rows = ['| ID | Concept | r | i | c | f | risk | Score | Improved |', '|---|---|---|---|---|---|---|---|---|']
    for c in cs:
        if c['source'] != src: continue
        a = c['axes']
        rows.append('| %s | %s | %d | %d | %d | %d | %d | %d | %s |' % (c['id'], c['name'], a['r'], a['i'], a['c'], a['f'], a['risk'], c['score'], c['improvedScore'] if c['spec'] else '-'))
    return '\n'.join(rows)
top = sorted(cs, key=lambda c: (-c['improvedScore'], -c['score']))[:10]
o = f"""# Cross-video synthesis: what the top YouTube Hebrew videos teach, get wrong, and leave to ALEF

Status: research notes, 2026-11-03. Scores are judgement on a 0-1000 scale, not outcomes. Machine-readable: `data/curriculum/resource-concepts-youtube100.json` (validated by `tests/resources-youtube100.test.js`).

## Read this first: the evidence is small

Of 100 candidate videos, captions for only 16 could be fetched before YouTube rate-limited this machine (HTTP 429 and sign-in bot checks), and 15 were usable (see `top100.md`). The counts below are therefore "n of the videos I read": 9 alphabet/vowel videos, 3 phrase videos, 3 prayer videos, plus the earlier Hebrew For Beginners pass (`docs/resources/youtube-hfb-playlists.md`) counted as one extra source where noted. I did not watch or hear anything, so teaching done on screen is invisible to me. "Most common" here means most common in that sample, not across YouTube. The sample skews to the highest-view alphabet courses (HebrewPod101, Tim McNinch, a one-hour course, WORD in Hebrew, Learn Hebrew with Daniel); it holds almost no Israeli-slang, travel or Torah-trope videos, so conclusions about those genres are not drawn.

## The 15 most common teaching techniques (in the sample)

{table('y100-tech')}

Most widely used in the sample: alphabet order (8 of 9 reading videos), final forms as a batch (6), dotted/undotted pairs (5), silent carriers (5). Most useful per minute: an early real word, syllable chains drilled on a beat, and the merged-sound table.

## The 10 most common errors and myths (in the sample)

{table('y100-err')}

Each is something said aloud that I judge misleading. Frequencies are tiny, so rank by cost to the learner, not by count: shva, tradition, and silent final letters do the most damage to someone who wants to read a siddur.

## Typical sequences

- Letters: alef-bet order from aleph to tav (8 of 9 reading videos), two to four letters per lesson. Exceptions: the one-hour course pairs look-alikes in a self-chosen order, and the review video runs the whole alphabet in one pass. Dot variants (bet, kaf, pe) are met in place; final forms come after the main letters or inside the lesson of their base letter; shin and sin come near the end.
- Vowels (when taught in a block): the a-signs first, then the e-signs, then i, then o, then u, with shva last or deferred; one series brings shva in right after the first e-sign. The long/short pairing appears in the academic-style course only. Vowels are interleaved with letters from lesson one in the HebrewPod101 and Daniel courses, and taught after the alphabet in McNinch, WORD in Hebrew and Hebrew For Beginners.
- First word: a two-letter family word (father, come) in videos that interleave; in videos that separate, the first real word arrives only after the vowels.

## What no video does well and ALEF can

{table('y100-gap')}

In short: none checks the learner (writing, reading aloud, spelling); none makes pronunciation tradition a setting; none drills confusions based on the individual's own errors; none teaches stress or links a prayer's printed letters to its sound; and the phrase videos lean on Latin spellings.

## Top 10 concepts by improved score

| Rank | ID | Concept | Score | Improved |
|---|---|---|---|---|
""" + '\n'.join('| %d | %s | %s | %d | %d |' % (i + 1, c['id'], c['improvedName'] or c['name'], c['score'], c['improvedScore']) for i, c in enumerate(top)) + """

Each concept scoring 850 or more has a full improved spec (screen, data, interaction, test) rescored to 950 or more in the JSON, in the same shape as `data/curriculum/resource-concepts-books.json`. Several overlap earlier specs (yt-alphabet-03, yt-vowels-01) and are marked as such rather than re-specced. Originality: no teacher's mnemonic, example word list or script is reused; ALEF art and wording must be its own.
"""
open('/home/claude/alef/docs/youtube/synthesis.md', 'w').write(o)
