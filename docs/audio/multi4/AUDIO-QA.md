# Audio checks (no model): is each recording whole and clean?

Recordings: **135**. With a problem: **11**.

truncated     too little speech for the text (more than 7 syllables a second): the voice dropped the end
pace          outside the natural band (Torah: the verse pace; other lines: 4.14 syllables a second +-25%)
long pause    a silence over 0.9 s inside a line
lead / tail   more than 0.6 s of silence before the speech, or 1.5 s after it
clipping      more than 0.1% of samples at full scale
loudness      more than 6 dB louder or quieter than the median clip of its kind
pair          the male and female clips of the same text differ in speech length by more than 1.6x

| clip | check | detail |
|---|---|---|
| `audio/f/israeli/line/kedushah-yimloch.mp3` | pace | 3.0 syllables/s (natural 4.14) |
| `audio/f/israeli/line/torah-exodus-16-28.mp3` | loudness | -6.5 dB from the median |
| `audio/f/israeli/line/torah-genesis-10-15.mp3` | loudness | -7.5 dB from the median |
| `audio/f/israeli/line/torah-leviticus-14-43.mp3` | loudness | -6.4 dB from the median |
| `audio/f/israeli/line/torah-leviticus-27-18.mp3` | loudness | -7.8 dB from the median |
| `audio/f/israeli/line/torah-numbers-32-39.mp3` | loudness | -7.0 dB from the median |
| `audio/f/israeli/prayer/yehalelu.mp3` | pace | 3.1 syllables/s (natural 4.14) |
| `audio/f/israeli/prayer/yigdal.mp3` | pace | 3.1 syllables/s (natural 4.14) |
| `audio/m/israeli/line/torah-genesis-10-15.mp3` | loudness | -6.1 dB from the median |
| `audio/m/israeli/line/torah-numbers-6-24.mp3` | loudness | -6.0 dB from the median |
| `audio/m/israeli/dictionary/dict-va4b7d8ca.mp3` | pair | male speech 0.2 s vs female 0.3 s |
