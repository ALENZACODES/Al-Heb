import os
"""Generate data/curriculum/resource-concepts-youtube100.json (judgement scores, no caption text). Run: python3 tools/youtube/make-concepts.py"""
import json
SRC = {
 'y100-tech': 'Teaching techniques seen in the captions of widely viewed Hebrew-learning YouTube videos',
 'y100-err': 'Errors and myths heard in those captions, turned into guards for ALEF',
 'y100-gap': 'Things none of the read videos does well, which ALEF can',
}
LIC = 'Public YouTube videos by several channels; licence not stated in the data read, treat as standard YouTube terms with all rights reserved. Ideas only, no text, video, audio or image reused.'
sources = {k: {'name': v, 'licence': LIC} for k, v in SRC.items()}
C = []
def add(id, name, what, ax, score, ev, notes='', imp=None, spec=None):
    r, i, c, f, risk = ax
    d = dict(id=id, source=id.rsplit('-', 1)[0], name=name, what=what, axes=dict(r=r, i=i, c=c, f=f, risk=risk), score=score,
             improvedScore=imp[1] if imp else score, improvedName=imp[0] if imp else None, spec=spec, printable=None, status='proposed', evidence=ev, notes=notes)
    C.append(d)
def sp(screen, data, interaction, test): return dict(screen=screen, data=data, interaction=interaction, test=test)

# ---- techniques (15 most common among the 9 reading videos read, plus phrase videos) ----
add('y100-tech-01', 'Letters taught in alef-bet order', 'The default sequence: aleph first, then bet, gimel and so on, a few letters per lesson. Seen in 9 of 11 reading videos read. Easy to follow but puts look-alikes far apart and gives no reading until late.', (650, 500, 750, 650, 100), 600, 'captions-read (9 of 11)', 'ALEF can order by frequency and by contrast pairs instead.')
add('y100-tech-02', 'Print and handwritten forms shown together', 'Each letter is shown in the book shape and in the hand shape from the start, so the learner can read signs and also write notes. Seen in 4 to 5 of 11.', (500, 800, 750, 850, 100), 700, 'captions-read (5 of 11)')
add('y100-tech-03', 'Live stroke-order demonstration', 'The teacher draws each letter in front of the learner and says the number of strokes and where to start. Seen in 5 of 11. A screen video cannot check the learner copy.', (450, 700, 800, 900, 100), 780, 'captions-read (5 of 11)', 'Overlaps gap-02 where ALEF actually checks the learner trace.')
add('y100-tech-04', 'Letter name used as the sound cue', 'Learners are told the name of a letter starts with its sound, which gives a free memory hook. Seen in the HebrewPod101 series only (2 of the 9 videos read, same series). It fails for ayin, vav, tsadi and others and is rarely caveated.', (600, 550, 700, 650, 150), 640, 'captions-read (2 of 11, one series)')
add('y100-tech-05', 'One key word per letter', 'A familiar object or animal word is paired with every letter. Seen in 4 of 11. Helps recall but the words are not reused later in reading practice.', (550, 700, 750, 700, 150), 700, 'captions-read (4 of 11)')
add('y100-tech-06', 'Shape gimmicks and picture mnemonics', 'Letters and vowels are tied to a picture or a gag (a necktie, a gap in the shape, a hole at the bottom). Seen in 3 of 11. Strong for look-alike pairs; each teacher invents their own, so ALEF must draw its own.', (700, 600, 800, 800, 350), 760, 'captions-read (3 of 11)', 'Originality risk: never reuse a teacher gimmick.')
add('y100-tech-07', 'Dotted versus undotted pairs compared back to back', 'Bet, kaf and pe are played with and without the dot, then the contrast is reused. Seen in 6 of 11. Overlaps yt-alphabet-03 from the Hebrew For Beginners playlists.', (850, 700, 850, 850, 100), 790, 'captions-read (6 of 11)', 'Already specced as yt-alphabet-03; not re-specced here.')
add('y100-tech-08', 'Final letters taught as one batch', 'The five final shapes come together after the main letters, often with a rule that they only close a word. Seen in 6 of 11. Good for recognition; few teachers add a drill that makes the learner spot them in running text.', (700, 650, 800, 800, 100), 800, 'captions-read (6 of 11)')
add('y100-tech-09', 'Silent carriers named early', 'Aleph and ayin are explained as letters that mostly hand the sound to the vowel. Seen in 5 of 11. Helpful, but how silent they are depends on tradition and is rarely said.', (800, 700, 750, 800, 100), 820, 'captions-read (5 of 11)')
add('y100-tech-10', 'A real word read in the first lesson', 'Two letters plus one vowel sign yield a word the learner understands (father, come, roof) inside minutes. Seen in 3 of 11. The strongest motivator in the set and cheap to build.', (800, 900, 900, 900, 100), 900, 'captions-read (3 of 11)', 'Spec below makes it a standing first-lesson contract.',
    ('First-lesson word contract', 965),
    sp('Lesson 1 ends on a read-aloud card: three tiles (two consonants and a vowel sign) assemble into a meaningful word with a picture and one tap to hear it. Never shown before the tiles have been traced.',
       'firstWords[] = {id, letters[], vowelSignId, gloss, audioId, tradition} drawn only from letters and signs already taught; a build check rejects any word needing an untaught item.',
       'Tap each tile in order to hear its piece, then the blended word; learner reads it aloud into a self-check button (no recording stored) and then picks the matching picture from three.',
       'Unit: every firstWords entry resolves to taught letters and one vowel sign, has an audio id in the manifest, and appears in lesson 1 or 2 only. A render test asserts no untaught glyph on the card.'))
add('y100-tech-11', 'Vowel signs grouped by sound family', 'Signs are taught by the sound they make (a, e, i, o, u) rather than by name. Seen in 5 of 11. Overlaps yt-vowels-01 from the earlier playlist pass.', (880, 880, 850, 880, 150), 820, 'captions-read (5 of 11)', 'Already specced as yt-vowels-01.')
add('y100-tech-12', 'Consonant-plus-vowel syllable chains drilled on a beat', 'Every new vowel is immediately combined with all known letters and read in rhythm, so reading is syllable-level from minute five. Seen in full in 1 of 11 (the one-hour course), with per-sound practice lists in the Hebrew For Beginners vowel series. Rare but the most effective use of time I saw.', (900, 800, 850, 900, 150), 900, 'captions-read (2 of 11)', 'Needs ALEF audio for each syllable.',
    ('Syllable chain runner', 960),
    sp('A single row of letter-vowel tiles that scrolls right to left at a chosen pace with a pulse marker. The learner reads each tile as it passes; the sound plays after a one-beat gap so they speak first and check second.',
       'syllableChains[] = {id, vowelSignId, letterIds[], pace, audioIds[], tradition}; chains are generated from taught letters only and reuse the audio manifest syllable ids.',
       'Choose pace (slow, medium, fast); tap a tile to hear it at any time; the runner records hits (learner marks I got it / I missed it) and feeds missed tiles into the SRS queue.',
       'Unit: generated chains contain only taught items, every tile has an audio id or is flagged missing, pace values are in range, and a missed tile creates exactly one SRS card.'))
add('y100-tech-13', 'Quizzes and recaps at lesson ends', 'A short quiz or recap follows each block. Seen in 3 of 11. Useful but mostly passive (name the sign), with no spacing.', (550, 550, 700, 800, 50), 640, 'captions-read (3 of 11)')
add('y100-tech-14', 'Table of letters that sound the same in Israeli Hebrew', 'One video closes with groups of letters that merge in speech (aleph and ayin, vet and vav, tet and tav, kuf and kaf, sin and samech). Seen in 2 of 11. It answers a question every learner asks and almost nobody covers.', (700, 900, 850, 900, 100), 880, 'captions-read (2 of 11)', 'Tradition aware: merges differ for Sephardi and Ashkenazi readings.',
    ('Same-sound explorer with spelling quiz', 965),
    sp('A grid of merged-sound groups. Tap a sound to see which letters write it, with three example words each and a note on which tradition keeps the split.',
       'mergedSounds[] = {sound, ipa, letterIds[], traditionsThatSplit[], exampleWordIds[]} generated from the letter table plus a tradition field; no hand-copied word lists.',
       'Hear a word, pick the spelling from two to three candidates; wrong picks explain that both letters share the sound here and show the rule or the word memory hint. Results feed SRS on word cards.',
       'Unit: each group has at least two letters and one example word per letter; tradition switch changes which groups appear; quiz never offers a distractor that is also correct for the selected tradition.'))
add('y100-tech-15', 'Gender variants flagged as phrases arrive', 'Phrase videos stop to say a line changes with speaker and listener gender, giving up to four forms. Seen in all 3 phrase videos read. Taught as a list rather than a switch.', (100, 900, 800, 800, 100), 700, 'captions-read (3 of 3 phrase videos)')

# ---- errors and myths (each becomes a guard or a correct teaching in ALEF) ----
add('y100-err-01', 'Shva taught as silent, or as a flat short e', 'Two HebrewPod101 videos say shva has no sound and the earlier Hebrew For Beginners pass heard it taught as a short e (3 of 12 reading sources); one other video gives a usable rule (after a vowel it closes the syllable, otherwise a quick uh). Learners then mis-read common words and prayer lines.', (900, 850, 900, 900, 100), 920, 'captions-read (3 of 12)', 'Biggest single fixable error.',
    ('Shva decision walker', 975),
    sp('A word is split into syllables on screen. Where a shva sits, the learner is asked: does a vowel sign come directly before it, is it the first letter, is it under a doubled letter? The app then shows the vocal or silent verdict with the sound or a gap.',
       'shvaCases[] = {wordId, shvaPosition, rule: after-vowel | word-start | double | after-shva, verdict: silent | vocal, audioId, tradition}; rules stored as data so the lesson text and the checker share them.',
       'Learner drags a marker to the correct verdict, then hears the word. Wrong answers show the one rule that applied. A weekly mixed set re-tests cases the learner missed.',
       'Unit: every shvaCase has exactly one rule and a verdict consistent with it; no teaching card uses the words silent vowel as a blanket description; audio ids resolve.'))
add('y100-err-02', 'Long and short vowels presented as audible pairs', 'One academic-style video teaches signs as long/short pairs while admitting that native speakers merge them. Seen in 1 of 11, plus in Hebrew For Beginners vowel naming. For Israeli Hebrew this inflates the vowel inventory to seven or more; for liturgy it is only a naming convention.', (700, 900, 850, 900, 100), 860, 'captions-read (2 of 10)', 'Good teaching: tell learners the sound count per tradition up front.',
    ('Tradition-labelled vowel chart', 960),
    sp('One vowel chart where each sign shows its name, its sound in the chosen tradition, and a small badge when two signs are heard the same. A tradition control swaps the chart between Israeli, Sephardi liturgical and Ashkenazi liturgical readings.',
       'vowelTable[] = {signId, name, soundByTradition: {israeli, sephardi, ashkenazi}, mergedWith[]}; all lesson copy that states a sound reads from this table.',
       'Tap a sign to hear it in the chosen tradition; a Compare button plays two merged signs back to back so the learner hears that they match; a quiz asks which sound a sign makes in the selected tradition.',
       'Unit: every sign has a sound for all three traditions; mergedWith is symmetric; changing tradition changes at least one displayed sound; no copy hard-codes a vowel sound.'))
add('y100-err-03', 'Hebrew said to have no vowels', 'Two videos say Hebrew has no vowel letters or no vowels at all (a third says the letters are consonants, which is accurate). Misleading for a learner who must read vav and yud as vowels in real words. Seen in 2 of 11.', (600, 650, 700, 800, 100), 640, 'captions-read (2 of 11)')
add('y100-err-04', 'Aleph and ayin simply called silent', 'Several videos call aleph and ayin silent for simplicity (at least 3 of 11). Right for most Israeli speech, wrong for many Sephardi, Mizrahi and Yemenite readers and for learners who will hear a throat sound in the siddur.', (700, 800, 800, 850, 100), 840, 'captions-read (3 of 11)', 'Fix via the tradition switch, no separate spec.')
add('y100-err-05', 'Chet and the h letters given incompatible sounds', 'One video gives chet an h-like sound and a Bach-like sound in the same lesson (1 of 11); the usual advice elsewhere is a throat sound. Learners then cannot tell he from chet by ear.', (800, 850, 800, 800, 100), 760, 'captions-read (1 of 11)')
add('y100-err-06', 'The letter-name-gives-the-sound rule stated without limits', 'Stated as a law in the HebrewPod101 series (2 videos). Fine for most letters; not for ayin, vav or tsadi, and ayin gives the wrong cue.', (500, 500, 650, 700, 100), 620, 'captions-read (2 of 11)')
add('y100-err-07', 'Final he sounded out as a vowel', 'One video presents he as something that can sound like a, which blurs the fact that a word-final he is a silent spelling carrier (1 of 11, caption doubt). Learners then read extra syllables.', (900, 850, 850, 880, 100), 900, 'captions-read (1 of 11)', 'Rare in this set but costly and very common in learner errors generally.',
    ('Silent-letter tagging game', 965),
    sp('A word is shown with each letter tinted by role: sounds, carries a vowel, or silent. The learner taps the silent letter or letters, then hears the word. Final he, aleph in mid-word and ayin come up repeatedly.',
       'letterRoles[] = {wordId, letterIndex, role: sound | vowel-carrier | silent, tradition}; roles are produced by a rule table plus a reviewed exceptions list, never by hand per word.',
       'Tap to mark a silent letter; feedback shows the rule. After five wins the tint is removed and the learner marks silent letters on plain text.',
       'Unit: every word has at least one role per letter; final he is never marked sounding; exceptions list entries carry a reason; marking by tradition changes ayin only where documented.'))
add('y100-err-08', 'Vowel marks said to be optional, so skip them', 'Two videos tell learners modern text drops vowel marks and push on. True for newspapers; false for the siddur, Torah, children\'s books and anyone learning new words (2 of 11).', (950, 700, 700, 850, 100), 860, 'captions-read (2 of 11)', 'Cure is a toggle plus a bridge, not a lecture.',
    ('Pointed to unpointed bridge', 965),
    sp('Any reading text has a Marks toggle with three states: full vowel marks, tap-to-reveal per word, and none. A step ladder moves the learner from full marks to none over a course, never abruptly.',
       'textRenderModes: pointed | reveal | plain per text id; all corpus texts store full pointing, plain forms are derived; a ladder table says which stage unlocks each mode.',
       'In reveal mode tap a word for its marks and audio; the app counts reveals per word and queues frequent reveals for review; the learner chooses the next stage only after a clean passage.',
       'Unit: plain forms derive from pointed by stripping marks only; reveal counts persist; ladder stages unlock in order; the siddur and Torah texts cannot default to plain.'))
add('y100-err-09', 'One pronunciation presented as the pronunciation', 'Teachers pick one reading tradition (academic, Sephardi, or Israeli) and rarely say how to switch; phrase videos rely on Latin spellings alone, and the best prayer video leans on a syllable-by-syllable Latin key with stress in capitals. Seen in at least 5 of 18 sources. Learners then fail when they hear a synagogue, a class or an Israeli friend.', (950, 900, 850, 950, 100), 930, 'captions-read (at least 5 of 18)', 'ALEF already plans per-tradition audio; this makes the tradition a first-class setting in every drill.',
    ('Tradition setting in every drill', 975),
    sp('A tradition chip (Israeli, Sephardi, Ashkenazi, Mizrahi) sits at the top of every lesson and drill. Changing it changes audio, quiz answers and the notes under each letter, and a Compare view plays the same line in two traditions.',
       'settings.tradition, with traditionTable[] = {itemId, byTradition: {sound, audioId}} for letters, signs and shva cases; every drill reads through one lookup function.',
       'The chip persists; a first-run question sets it; a Compare button plays two traditions; mixed-tradition review is offered only when the learner opts in.',
       'Unit: a global test lists every drill item and asserts a sound or an explicit not-applicable entry for each tradition; switching tradition never leaves a quiz with two correct answers.'))
add('y100-err-10', 'Kamatz katan waved away', 'The a-sign that is read as an o sound in certain closed syllables is mentioned in passing in 1 of 11 and taught in none. Learners then mis-read frequent liturgical words.', (850, 600, 650, 800, 100), 830, 'captions-read (1 of 11 mentions it)')

# ---- gaps: what no video does well ----
add('y100-gap-01', 'Adaptive look-alike drilling', 'No video drills the classic confusions (bet/kaf, dalet/resh, vav/zayin/final nun, he/chet/tav) beyond a spoken warning. ALEF can log each learner confusion and serve the pair that hurts them.', (850, 800, 900, 950, 100), 880, 'captions-read (11 of 11 reading videos lack drills)', '',
    ('Confusion-pair trainer', 965),
    sp('A two-up card: hear a sound or word, tap one of two near-identical letters. After a miss, the pair is shown with its one differing feature highlighted by ALEF art (never a teacher mnemonic) and the miss is logged.',
       'confusionPairs[] = {a, b, feature, audioIds}; learnerConfusions{pairId: misses, lastSeen}; scheduling is a plain SRS queue weighted by miss count.',
       'Round of ten pairs, weighted to the learner worst pairs; a streak unlocks the next pair set; a heat map in progress shows which pairs are still weak.',
       'Unit: every pair has an audio id and a stated feature; selection never repeats a pair twice in a row; misses raise a pair weight and clean answers lower it.'))
add('y100-gap-02', 'Stylus tracing with a real stroke check', 'Every writing demo is passive, and the learner cannot be corrected on a video. ALEF can check start point, direction and order on a tablet, linked to the handwriting form.', (400, 800, 850, 950, 100), 870, 'captions-read (4 of 11 demo writing; none checks it)', '',
    ('Stroke-checked tracing', 960),
    sp('Letter outline with a ghost stroke and start dot; the learner draws, and each stroke is scored on start, direction and order. Hand letters get the same treatment after print letters.',
       'strokes[letterId][form] = ordered polylines with tolerance; learner result = {strokeScores[], orderOk}; only the scores are stored, never the ink image.',
       'Trace with the ghost, then trace blind; a wrong order is flagged once and the stroke replays; three blind passes mark the letter writing-ready.',
       'Unit: every letter has stroke data for print form; scoring is deterministic for a fixed input; order errors are reported separately from shape errors.'))
add('y100-gap-03', 'Word stress and rhythm', 'The read videos barely mention which syllable carries the stress. Reading aloud with the wrong stress is a common give-away, and ALEF can colour the stressed syllable and test it.', (700, 900, 800, 850, 100), 860, 'captions-read (stress barely touched in 9 of 11)', '',
    ('Stress marker practice', 955),
    sp('Words appear split into syllables with the stressed one coloured. The learner taps the stressed syllable, hears the word, and sees the usual pattern (last syllable by default, second-last for a known group).',
       'wordStress[] = {wordId, syllables[], stressIndex, pattern, tradition}; a pattern tag lets the checker teach the rule and not just the answer.',
       'Tap the stressed syllable; feedback names the pattern; a second mode hides the colour and asks the learner to read aloud and self-rate.',
       'Unit: stressIndex is within the syllable range, exactly one syllable is stressed per word, pattern values come from a closed list, audio ids resolve.'))
add('y100-gap-04', 'Follow-along prayer reading without transliteration', 'The prayer videos read a line for the learner to repeat, or discuss meaning, and none ties the sounds back to letters and signs. ALEF can light words as they are read and let the learner tap any word.', (950, 300, 850, 950, 100), 900, 'captions-read (4 of 4 prayer videos read)', '',
    ('Tap-a-word prayer reader', 970),
    sp('The prayer text in large pointed letters with words lighting at reading pace; a Tap on any word shows its syllables and plays that word; a Slow button halves the pace.',
       'prayerLines[] = {textId, words[], syllables[], audioId, timings[], tradition}; text comes from the licensed corpus, audio from our own recording or TTS with the usual disclosure.',
       'Pace control, loop a line, record-yourself self check with no storage, hide-the-marks mode from the bridge feature.',
       'Unit: timings are monotonic and cover each word, every word resolves to syllables, the text equals the corpus source byte for byte, and audio ids exist.'))
add('y100-gap-05', 'Gender-aware phrase builder', 'Phrase videos list up to four forms per line. A toggle on speaker and listener gender would let one card serve all forms and teach the pattern.', (50, 900, 800, 800, 100), 740, 'captions-read (3 of 3 phrase videos)')
add('y100-gap-06', 'Error log that explains the rule behind a miss', 'Videos cannot say why this learner missed this word. ALEF can tag each miss with the rule at fault (shva, silent letter, merged sound, look-alike) and show the matching mini-lesson.', (800, 800, 900, 950, 100), 840, 'captions-read (inferred from absence in 9 of 11)')
json.dump(dict(version=1, generated='2026-11-03',
    note='Scores 0-1000 are the author\'s judgement of expected learner value for ALEF, not measured outcomes. improvedScore equals score when no improvement was specced. riskAxis: higher is worse. Source: English captions (manual or auto, machine-noisy) of YouTube videos from the top-100 candidate list in docs/youtube/top100.md; only 20 of 100 captions were fetched before YouTube rate-limited the machine, so counts like 4 of 11 refer to the reading videos actually read. No video was watched and no audio heard. No text, video or audio is reused; ideas only.',
    axesKey={'r': 'reading siddur or Torah aloud', 'i': 'Israeli functional Hebrew', 'c': 'beginner clarity', 'f': 'fit with ALEF', 'risk': 'originality risk, higher is worse'},
    sources=sources, concepts=C), open(os.path.expanduser('~/alef/data/curriculum/resource-concepts-youtube100.json'), 'w'), indent=1, ensure_ascii=False)
print(len(C), sum(1 for c in C if c['score'] >= 850), sum(1 for c in C if c['spec']))
