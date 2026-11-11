// Cleared sacred-listen and secular-music catalogue.
// Item rights follow the 2026-11-06 recording audit. The 1929 Maghreb file is held and is not listed.
// Chad Gadya is a folk song: it is not placed on a cantorial shelf.

export const HELD_FILE = 'pd_barichai_bocherh_aarbi_1929.ogg';
export const LISTEN_BASE = 'audio/listen/';
export const MUSIC_BASE = 'audio/music/';
/**
 * The file a browser is handed. Each audited .ogg/.oga has an MP3 copy beside it (same audio, re-encoded with ffmpeg):
 * Ogg Vorbis does not play in every desktop browser (owner report, Nov 8 2026: Sacred listen and the music bar were
 * silent on a computer but played on a phone), MP3 plays in all of them. Both are rendered from audio/listen/originals/ by tools/audio/cantorial_restore.py (2026-11-08 restoration).
 */
export const playableFile = (file) => String(file || '').replace(/\.og[ga]$/i, '.mp3');

const PD = 'Public domain (US sound recording published before 1926; EU recording right treated as expired)';
const SA3 = 'CC BY-SA 3.0';
const SA4 = 'CC BY-SA 4.0';
const SA3_URL = 'https://creativecommons.org/licenses/by-sa/3.0/';
const SA4_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** @typedef {{id:string,file:string,originalFile?:string,shelf:string,kind:'cantorial'|'demonstration'|'folk',title:string,performer:string,performerNote?:string,tradition:string,licence:string,licenceUrl?:string,source:string,sourceUrl:string,sha256_16:string,shareAlike:boolean}} ListenItem */

/** @type {ListenItem[]} */
export const LISTEN_ITEMS = [
  item('pd_adon_olam_1903', 'Adon Olam (1903)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Adoin_oilom_(1903).ogg', '1407392bad971450'),
  item('pd_mimkoimoi_hu_jifen_1902', 'Mimkomo Hu Yifen (1902)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Mimkoimoi_hu_jifen_(1902).ogg', '342666d655802a7c'),
  item('pd_kawokores_rohe_adre_1908', 'Kevakarat Ro\'eh Edro (1908)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Kawokores_rohe_adre_(1908).ogg', 'fc25445151f45ea5'),
  item('pd_birchos_kohanim_1908', 'Birkat Kohanim (1908)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Birchos_kohanim_(1908).ogg', '13d15dc551318900'),
  item('pd_sirota_kaddish_1903', 'Kaddish: Yitgadal Veyitkadash (1903)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'Named in the recording title.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Gershon_Sirota._Jisgadal_w%C4%9Bjiskadasch._1903.ogg', 'f7d0600bc005f3c4'),
  item('pd_zadik_katomor_1908', 'Tzaddik Katamar (1908)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Zadik_katomor_(1908).ogg', '86c77fa5f7d7e0ca'),
  item('pd_odom_yasoido_meator_1903', 'Adam Yesodo Me\'afar (1903)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Odom_yasoido_meator_(1903).ogg', '242abefa37359720'),
  item('cc_cantillation_torah_ashkenazi', 'Torah Reading: Cantillation Example', 'ashkenazi-demo', 'demonstration', 'Ezra Katz', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Cantillation_Example_Torah_Ashkenazi.ogg', '4ceea61c77383b23', true),
  item('cc_cantillation_haftarah_ashkenazi', 'Haftarah: Cantillation Example', 'ashkenazi-demo', 'demonstration', 'Ezra Katz', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Cantillation_Example_Haftarah_Ashkenazi.ogg', 'be17ee2262271376', true),
  item('cc_taamim_torah_superjew', 'Ta\'amei Hamikra: Torah Melody', 'ashkenazi-demo', 'demonstration', 'SuperJew', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Taamim_Torah_SuperJew.ogg', 'e788ba3ad3e1e34d', true),
  item('cc_taamim_haftarah_superjew', 'Ta\'amei Hamikra: Haftarah Melody', 'ashkenazi-demo', 'demonstration', 'SuperJew', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Taamim_Haftara_SuperJew.ogg', '366970f7a51ca1c3', true),
  item('cc_asael_genesis_noah_ashkenaz', 'Parashat Noach', 'ashkenazi-demo', 'demonstration', 'Yisra\'el Asael', 'Named on the source file. Playback uses the original Vorbis bytes with an .ogg name; the Commons file is .oga.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Ab_Genesis_No%27a%E1%B8%A5-0c-Yisra%27el_Asael_Ashkenaz.oga', 'ba01fb2aacdd23d2', true, 'cc_asael_genesis_noah_ashkenaz.oga'),
  item('cc_shofar_prayer_ashkenazi_nli', 'Shofar Prayer', 'ashkenazi-demo', 'demonstration', 'Not named', 'The National Library of Israel is the source. A singer is not named.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:The_National_Library_of_Israel_-_Shofar_Prayer,_Ashkenazi_version_-_1785188_SHOFAR78.ogg', '4bad163718c5b9ad', true),
  item('cc_chad_gadya_traditional', 'Chad Gadya', 'folk', 'folk', 'TimeEngineer', 'Passover folk song. Not synagogue cantorial, and the tradition is not stated.', 'Unknown', SA4, SA4_URL, 'https://commons.wikimedia.org/wiki/File:Traditional_Chad_Gadya.ogg', 'df016e48a47509fa', true),
];

/**
 * Hebrew title, standard English transliteration and meaning for each piece. The garbled archive spellings
 * ("Mimkoimoi hu jifen", "Kawokores rohe adre") are the Commons file names: they stay in the credits only (sourceTitle).
 * `he: null` means the Hebrew title is not settled; `ownerCheck` says what the owner should confirm.
 */
export const LISTEN_TITLES = {
  pd_adon_olam_1903: { he: 'אֲדוֹן עוֹלָם', translit: 'Adon Olam', meaning: 'Master of the World', from: 'Closing hymn of the service' },
  pd_mimkoimoi_hu_jifen_1902: { he: 'מִמְּקוֹמוֹ הוּא יִפֶן', translit: 'Mimkomo Hu Yifen', meaning: 'From His Place He Will Turn', from: 'Kedushah of the Musaf service' },
  pd_kawokores_rohe_adre_1908: { he: 'כְּבַקָּרַת רוֹעֶה עֶדְרוֹ', translit: 'Kevakarat Ro\'eh Edro', meaning: 'As a Shepherd Seeks Out His Flock', from: 'Unetaneh Tokef, High Holy Days' },
  pd_birchos_kohanim_1908: { he: 'בִּרְכַּת כֹּהֲנִים', translit: 'Birkat Kohanim', meaning: 'The Priestly Blessing', from: 'Numbers 6:24-26' },
  pd_sirota_kaddish_1903: { he: 'יִתְגַּדַּל וְיִתְקַדַּשׁ', translit: 'Yitgadal Veyitkadash', meaning: 'Magnified and Sanctified (the opening of the Kaddish)', from: 'Kaddish' },
  pd_zadik_katomor_1908: { he: 'צַדִּיק כַּתָּמָר', translit: 'Tzaddik Katamar', meaning: 'The Righteous Flourish Like a Palm Tree', from: 'Psalm 92:13' },
  pd_odom_yasoido_meator_1903: { he: 'אָדָם יְסוֹדוֹ מֵעָפָר', translit: 'Adam Yesodo Me\'afar', meaning: 'A Person Comes From Dust', from: 'Unetaneh Tokef, High Holy Days' },
  cc_cantillation_torah_ashkenazi: { he: 'קְרִיאַת הַתּוֹרָה', translit: 'Keriat HaTorah', meaning: 'Torah Reading, Sung With Cantillation' },
  cc_cantillation_haftarah_ashkenazi: { he: 'הַפְטָרָה', translit: 'Haftarah', meaning: 'Reading From the Prophets, Sung With Cantillation' },
  cc_taamim_torah_superjew: { he: 'טַעֲמֵי הַמִּקְרָא', translit: 'Ta\'amei Hamikra', meaning: 'The Reading Marks, Sung to the Torah Melody' },
  cc_taamim_haftarah_superjew: { he: 'טַעֲמֵי הַמִּקְרָא', translit: 'Ta\'amei Hamikra', meaning: 'The Reading Marks, Sung to the Haftarah Melody' },
  cc_asael_genesis_noah_ashkenaz: { he: 'פָּרָשַׁת נֹחַ', translit: 'Parashat Noach', meaning: 'The Noah Portion of Genesis' },
  cc_shofar_prayer_ashkenazi_nli: { he: null, translit: 'Shofar Prayer', meaning: 'The name the National Library of Israel gives this recording', ownerCheck: 'Hebrew title not set: the source does not say which shofar text is sung.' },
  cc_chad_gadya_traditional: { he: 'חַד גַּדְיָא', translit: 'Chad Gadya', meaning: 'One Little Goat' },
};

/** The archive's own name for a file (from the Commons URL), kept for credits only. */
export function sourceTitleOf(sourceUrl) {
  const last = String(sourceUrl || '').split('/').pop() || '';
  let name = last.replace(/^File:/, '');
  try { name = decodeURIComponent(name); } catch { /* keep the raw name */ }
  return name.replace(/\.(ogg|oga|mp3)$/i, '').replace(/_/g, ' ');
}

for (const row of LISTEN_ITEMS) Object.assign(row, LISTEN_TITLES[row.id] || {}, { sourceTitle: sourceTitleOf(row.sourceUrl) });

export const SHELVES = [
  { id: 'ashkenazi-cantorial', title: 'Ashkenazi Cantorial', tradition: 'Ashkenazi', empty: false, note: 'Historic recordings. They are listens, not this app\'s prayer voice.' },
  { id: 'ashkenazi-demo', title: 'Ashkenazi Cantillation and Prayer Demonstrations', tradition: 'Ashkenazi', empty: false, note: 'Short demonstrations. Share-alike applies if a recording is adapted.' },
  { id: 'folk', title: 'Folk Song', tradition: 'Unknown', empty: false, note: 'Not a cantorial shelf. Tradition is not stated on the source.' },
  { id: 'sephardi', title: 'Sephardi', tradition: 'Sephardi', empty: true, note: 'No cleared Sephardi recording is in this set.' },
  { id: 'israeli', title: 'Israeli', tradition: 'Israeli', empty: true, note: 'No cleared Israeli recording is in this set.' },
];

export const MUSIC_TRACKS = [
  { id: 'night_at_the_beach', file: 'night_at_the_beach.ogg', title: 'Night at the Beach', role: 'Soft menu', author: 'Kenney', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://kenney.nl/', sha256_16: '8beff4d1153fcea0' },
  { id: 'flowing_rocks', file: 'flowing_rocks.ogg', title: 'Flowing Rocks', role: 'Gentle exploration', author: 'Kenney', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://kenney.nl/', sha256_16: '8563774243e381e8' },
  { id: 'mission_plausible', file: 'mission_plausible.ogg', title: 'Mission Plausible', role: 'Light focus', author: 'Kenney', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://kenney.nl/', sha256_16: '324bb691a715a518' },
];

/** Original instrumental beds (John Khan / ALENZA CODES, All rights reserved). Optional game beds only. */
export const ORIGINAL_MUSIC_TRACKS = [
  { id: 'klezmer-loop-a', file: 'klezmer-loop-a.mp3', title: 'Klezmer Loop A', role: 'Folk dance bed', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '77f414e1582fc6e8' },
  { id: 'klezmer-loop-b', file: 'klezmer-loop-b.mp3', title: 'Klezmer Loop B', role: 'Folk dance bed', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '1e17433f3ee4767f' },
  { id: 'niggun-calm-loop-a', file: 'niggun-calm-loop-a.mp3', title: 'Niggun Calm Loop A', role: 'Contemplative bed', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '7cf9467fb61a94fa' },
  { id: 'niggun-calm-loop-b', file: 'niggun-calm-loop-b.mp3', title: 'Niggun Calm Loop B', role: 'Contemplative bed', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '9d262cf1adb28cad' },
  { id: 'cantor-strings-a', file: 'cantor-strings-a.mp3', title: 'Cantor Strings A', role: 'Strings bed', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: 'db1621c2646c9610' },
  { id: 'cantor-strings-b', file: 'cantor-strings-b.mp3', title: 'Cantor Strings B', role: 'Strings bed', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '37f07b5d17002244' },
];

/** Original songs (same owner). Selectable on game routes only; never under prayer / sacred listen / learner speech. */
export const ORIGINAL_SONG_TRACKS = [
  { id: 'yachad', file: 'yachad.mp3', title: 'Yachad', role: 'Communal folk song', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '456d6fbd577ecac6' },
  { id: 'open-hands', file: 'open-hands.mp3', title: 'Open Hands', role: 'Reform-friendly song', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '6ca58d0d920488b6' },
  { id: 'gates-of-morning-a', file: 'gates-of-morning-a.mp3', title: 'Gates of Morning A', role: 'Cantorial-inspired song', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '823f9bbdfdebf18a' },
  { id: 'gates-of-morning-b', file: 'gates-of-morning-b.mp3', title: 'Gates of Morning B', role: 'Cantorial-inspired song', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '69f850d5b2de7257' },
  { id: 'adon-olam', file: 'adon-olam.mp3', title: 'Adon Olam (Niggun)', role: 'Wordless niggun on a traditional melody', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '85485a63b054f942' },
  { id: 'hava-nagila', file: 'hava-nagila.mp3', title: 'Hava Nagila (Niggun)', role: 'Wordless niggun on a traditional melody', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: 'b924f9b883596f2d' },
  { id: 'ma-oz-tzur', file: 'ma-oz-tzur.mp3', title: "Ma'oz Tzur", role: 'Traditional Hanukkah song, modern cantorial arrangement', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: 'ee87e9cf8c3936cf' },
  { id: 'dayenu', file: 'dayenu.mp3', title: 'Dayenu', role: 'Traditional Passover song, modern cantorial arrangement', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '0f8782f665b8baf8' },
  { id: 'hevenu-shalom-aleichem', file: 'hevenu-shalom-aleichem.mp3', title: 'Hevenu Shalom Aleichem', role: 'Traditional peace song, modern cantorial arrangement', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '0f7746b9da87c3ef' },
  { id: 'yom-zeh-l-yisrael', file: 'yom-zeh-l-yisrael.mp3', title: "Yom Zeh L'Yisrael", role: 'Traditional Shabbat song, modern cantorial arrangement', author: 'John Khan / ALENZA CODES', licence: 'All rights reserved', sha256_16: '14fcb03475a97311' },
];

export const SACRED_ROUTES = new Set([
  'listen-shelf', 'read', 'text', 'morning', 'service', 'trope',
  'torahread', 'torahreadsec', 'torahreader', 'timedread',
]);

function item(id, title, shelf, kind, performer, performerNote, tradition, licence, licenceUrl, sourceUrl, sha, shareAlike = false, originalFile = '') {
  const year = /^pd_.*_(\d{4})$/.exec(id)?.[1];
  return {
    id, file: `${id}.ogg`, ...(originalFile ? { originalFile } : {}), shelf, kind, title, performer, performerNote, tradition,
    licence, ...(licenceUrl ? { licenceUrl } : {}), source: 'Wikimedia Commons', sourceUrl, sha256_16: sha, shareAlike,
    ...(year ? { historical: `Published ${year}. Early commercial recording, not a modern studio take.` } : {}),
  };
}

export function itemsOn(shelfId) {
  return LISTEN_ITEMS.filter((row) => row.shelf === shelfId);
}
