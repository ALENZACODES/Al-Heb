import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const letters = [
  ['א','alef','אָלֶף','alef'], ['ב','bet','בֵּית','bet'], ['ג','gimel','גִּימֶל','gimel'],
  ['ד','dalet','דָּלֶת','dalet'], ['ה','he','הֵא','he'], ['ו','vav','וָו','vav'],
  ['ז','zayin','זַיִן','zayin'], ['ח','chet','חֵית','chet'], ['ט','tet','טֵית','tet'],
  ['י','yod','יוֹד','yod'], ['כ','kaf','כַּף','kaf'], ['ך','kaf-final','כַּף סוֹפִית','kaf sofit'],
  ['ל','lamed','לָמֶד','lamed'], ['מ','mem','מֵם','mem'], ['ם','mem-final','מֵם סוֹפִית','mem sofit'],
  ['נ','nun','נוּן','nun'], ['ן','nun-final','נוּן סוֹפִית','nun sofit'], ['ס','samekh','סָמֶךְ','samekh'],
  ['ע','ayin','עַיִן','ayin'], ['פ','pe','פֵּא','pe'], ['ף','pe-final','פֵּא סוֹפִית','pe sofit'],
  ['צ','tsadi','צָדִי','tsadi'], ['ץ','tsadi-final','צָדִי סוֹפִית','tsadi sofit'],
  ['ק','qof','קוֹף','kof'], ['ר','resh','רֵישׁ','resh'], ['ש','shin','שִׁין','shin'], ['ת','tav','תָּו','tav'],
].map(([glyph,id,nikud,translit]) => ({ glyph, id, nikud, translit, meaning_en: id.endsWith('-final') ? 'Final form of ' + translit.split(' ')[0] : 'Letter ' + translit }));
const marks = [
  ['\u05b0','sheva','שְׁוָא','shva','A short e or no vowel'],
  ['\u05b1','hataf-segol','חֲטַף סֶגוֹל','chataf segol','Short e vowel'],
  ['\u05b2','hataf-patah','חֲטַף פַּתָּח','chataf patach','Short a vowel'],
  ['\u05b3','hataf-qamats','חֲטַף קָמָץ','chataf kamatz','Short o vowel'],
  ['\u05b4','hiriq','חִירִיק','chirik','i vowel'], ['\u05b5','tsere','צֵירֵי','tsere','e vowel'],
  ['\u05b6','segol','סֶגוֹל','segol','e vowel'], ['\u05b7','patah','פַּתָּח','patach','a vowel'],
  ['\u05b8','qamats','קָמָץ','kamatz','a vowel; sometimes o'], ['\u05b9','holam','חוֹלָם','cholam','o vowel'],
  ['\u05bb','qubuts','קֻבּוּץ','kubutz','u vowel'], ['\u05bc','dagesh','דָּגֵשׁ','dagesh','Consonant dot; with vav, u'],
  ['\u05c1','shin-dot','נְקֻדַּת שִׁין','nekudat shin','Right dot: sh'],
  ['\u05c2','sin-dot','נְקֻדַּת שִׂין','nekudat sin','Left dot: s'],
  ['\u05c7','qamats-qatan','קָמָץ קָטָן','kamatz katan','o vowel'],
].map(([glyph,id,nikud,translit,meaning_en])=>({glyph,id,nikud,translit,meaning_en}));
for (const s of [...letters,...marks]) {
  s.audio_ari = `audio/builder/symbol-${s.id}_ari.mp3`;
  s.audio_noa = `audio/builder/symbol-${s.id}_noa.mp3`;
}
fs.writeFileSync(root + 'data/builder_symbols.json', JSON.stringify({letters,marks},null,2)+'\n');
