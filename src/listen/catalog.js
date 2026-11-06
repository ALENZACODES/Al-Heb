// Cleared sacred-listen and secular-music catalogue.
// Item rights follow the 2026-11-06 recording audit. The 1929 Maghreb file is held and is not listed.
// Chad Gadya is a folk song: it is not placed on a cantorial shelf.

export const HELD_FILE = 'pd_barichai_bocherh_aarbi_1929.ogg';
export const LISTEN_BASE = 'audio/listen/';
export const MUSIC_BASE = 'audio/music/';

const PD = 'Public domain (US sound recording published before 1926; EU recording right treated as expired)';
const SA3 = 'CC BY-SA 3.0';
const SA4 = 'CC BY-SA 4.0';
const SA3_URL = 'https://creativecommons.org/licenses/by-sa/3.0/';
const SA4_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** @typedef {{id:string,file:string,originalFile?:string,shelf:string,kind:'cantorial'|'demonstration'|'folk',title:string,performer:string,performerNote?:string,tradition:string,licence:string,licenceUrl?:string,source:string,sourceUrl:string,sha256_16:string,shareAlike:boolean}} ListenItem */

/** @type {ListenItem[]} */
export const LISTEN_ITEMS = [
  item('pd_adon_olam_1903', 'Adon Olam (1903)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Adoin_oilom_(1903).ogg', '75f587acea581085'),
  item('pd_mimkoimoi_hu_jifen_1902', 'Mimkoimoi hu jifen (1902)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Mimkoimoi_hu_jifen_(1902).ogg', '3be61447bbd751e6'),
  item('pd_kawokores_rohe_adre_1908', 'Kawokores rohe adre (1908)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Kawokores_rohe_adre_(1908).ogg', '0a06534183608375'),
  item('pd_birchos_kohanim_1908', 'Birkat Kohanim (1908)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Birchos_kohanim_(1908).ogg', '7f3d997e9f34e45c'),
  item('pd_sirota_kaddish_1903', 'Kaddish — Jisgadal (1903)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'Named in the recording title.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Gershon_Sirota._Jisgadal_w%C4%9Bjiskadasch._1903.ogg', '00ebd756fa4f0403'),
  item('pd_zadik_katomor_1908', 'Tzadik katamar (1908)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Zadik_katomor_(1908).ogg', 'd7dbbb8c2426efce'),
  item('pd_odom_yasoido_meator_1903', 'Adam yesodo meafar (1903)', 'ashkenazi-cantorial', 'cantorial', 'Gershon Sirota', 'The source index credits Gershon Sirota. The file title does not repeat the name.', 'Ashkenazi', PD, '', 'https://commons.wikimedia.org/wiki/File:Odom_yasoido_meator_(1903).ogg', '3bc9eb1c32d454aa'),
  item('cc_cantillation_torah_ashkenazi', 'Torah cantillation example', 'ashkenazi-demo', 'demonstration', 'Ezra Katz', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Cantillation_Example_Torah_Ashkenazi.ogg', '8b1bd43eab85c479', true),
  item('cc_cantillation_haftarah_ashkenazi', 'Haftarah cantillation example', 'ashkenazi-demo', 'demonstration', 'Ezra Katz', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Cantillation_Example_Haftarah_Ashkenazi.ogg', '0711126cf5937f3e', true),
  item('cc_taamim_torah_superjew', 'Torah trope demonstration', 'ashkenazi-demo', 'demonstration', 'SuperJew', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Taamim_Torah_SuperJew.ogg', '5fea78eaa2f766d1', true),
  item('cc_taamim_haftarah_superjew', 'Haftarah trope demonstration', 'ashkenazi-demo', 'demonstration', 'SuperJew', 'Named as the Commons artist.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Taamim_Haftara_SuperJew.ogg', 'd6b37f598bf785fb', true),
  item('cc_asael_genesis_noah_ashkenaz', 'Genesis, Noah portion', 'ashkenazi-demo', 'demonstration', 'Yisra\'el Asael', 'Named on the source file. Playback uses the original Vorbis bytes with an .ogg name; the Commons file is .oga.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:Ab_Genesis_No%27a%E1%B8%A5-0c-Yisra%27el_Asael_Ashkenaz.oga', 'c3cb0d4e9ea278c0', true, 'cc_asael_genesis_noah_ashkenaz.oga'),
  item('cc_shofar_prayer_ashkenazi_nli', 'Shofar prayer', 'ashkenazi-demo', 'demonstration', 'Not named', 'The National Library of Israel is the source. A singer is not named.', 'Ashkenazi', SA3, SA3_URL, 'https://commons.wikimedia.org/wiki/File:The_National_Library_of_Israel_-_Shofar_Prayer,_Ashkenazi_version_-_1785188_SHOFAR78.ogg', '0c72d7f8e4d5a9bd', true),
  item('cc_chad_gadya_traditional', 'Chad Gadya', 'folk', 'folk', 'TimeEngineer', 'Passover folk song. Not synagogue cantorial, and the tradition is not stated.', 'Unknown', SA4, SA4_URL, 'https://commons.wikimedia.org/wiki/File:Traditional_Chad_Gadya.ogg', '432731be9c83118b', true),
];

export const SHELVES = [
  { id: 'ashkenazi-cantorial', title: 'Ashkenazi cantorial', tradition: 'Ashkenazi', empty: false, note: 'Historic recordings. They are listens, not this app\'s prayer voice.' },
  { id: 'ashkenazi-demo', title: 'Ashkenazi cantillation and prayer demonstrations', tradition: 'Ashkenazi', empty: false, note: 'Short demonstrations. Share-alike applies if a recording is adapted.' },
  { id: 'folk', title: 'Folk song', tradition: 'Unknown', empty: false, note: 'Not a cantorial shelf. Tradition is not stated on the source.' },
  { id: 'sephardi', title: 'Sephardi', tradition: 'Sephardi', empty: true, note: 'No cleared Sephardi recording is in this set.' },
  { id: 'israeli', title: 'Israeli', tradition: 'Israeli', empty: true, note: 'No cleared Israeli recording is in this set.' },
];

export const MUSIC_TRACKS = [
  { id: 'night_at_the_beach', file: 'night_at_the_beach.ogg', title: 'Night at the Beach', role: 'Soft menu', author: 'Kenney', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://kenney.nl/', sha256_16: '8beff4d1153fcea0' },
  { id: 'flowing_rocks', file: 'flowing_rocks.ogg', title: 'Flowing Rocks', role: 'Gentle exploration', author: 'Kenney', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://kenney.nl/', sha256_16: '8563774243e381e8' },
  { id: 'mission_plausible', file: 'mission_plausible.ogg', title: 'Mission Plausible', role: 'Light focus', author: 'Kenney', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://kenney.nl/', sha256_16: '324bb691a715a518' },
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
