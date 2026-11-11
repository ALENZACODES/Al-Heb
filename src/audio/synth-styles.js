// The game-music track names, kept apart from the engine (src/audio/synth-music.js) so the track list can be drawn
// before the engine loads (the engine is fetched when Play music is first pressed). tests/audio.music.test.js checks the two lists match.
export const SYNTH_STYLE_LIST = Object.freeze([
  {"id":"syn_galilee","title":"Galilee Breeze","role":"Calm lo-fi"},
  {"id":"syn_shuk","title":"Shuk Groove","role":"Market rhythm"},
  {"id":"syn_pixel","title":"Pixel Aleph","role":"Chiptune"},
  {"id":"syn_jerusalem","title":"Jerusalem Dawn","role":"Ambient"},
  {"id":"syn_telaviv","title":"Tel Aviv Nights","role":"Synthwave"},
  {"id":"syn_hora","title":"Hora Hop","role":"Lively dance"},
  {"id":"syn_rimon","title":"Rimon's Puzzle","role":"Gentle thinking"},
  {"id":"syn_caravan","title":"Desert Caravan","role":"Slow journey"},
  {"id":"syn_pomegranate","title":"Pomegranate Pop","role":"Bright and happy"},
  {"id":"syn_kinneret","title":"Kinneret Waves","role":"Floating"},
  {"id":"syn_study","title":"Study Hall Lo-fi","role":"Focus"},
  {"id":"syn_sprint","title":"Arcade Sprint","role":"Fast action"},
]);
