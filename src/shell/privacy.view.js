// /privacy: plain-language statement built from what the code does (checked by reading the source on 2026-11-04; see tests/credits.test.js).
// Not legal advice and not a privacy-law compliance document. Data rows are exported so the test can check them against the source files.
import { h } from './ui.js';

/** Every network request ALEF's own code can make. `sendsUserData` is true only when something the learner typed, scanned or spoke leaves the device. */
export const FLOWS = [
  { id: 'own-site', what: 'Pages, scripts, fonts, lesson and corpus data files, and audio files if they exist', to: 'The site that serves ALEF (fetch of relative URLs, plus the service worker in sw.js)', sendsUserData: false, when: 'Whenever the app loads or updates. The request carries no progress or settings.', files: ['sw.js', 'src/app.js'] },
  { id: 'dicta', what: 'The Hebrew text recognised from a photo (not the photo) to add vowel points', to: 'Dicta, a third party (nakdan-u2-1a.loadbalancer.dicta.org.il)', sendsUserData: true, when: 'Only if you tick "Add vowels to unpointed text online" on the Scan screen. Off by default. The hosting headers in _headers (Content-Security-Policy connect-src) do not list Dicta, so a browser following them should block this call on the deployed site; that was read in the file, not tested on a live deployment. Dicta publishes no terms we could read.', files: ['src/photo/engines/web.js', 'src/photo/scan.view.js', '_headers'] },
  { id: 'local-helper', what: 'Recognised Hebrew text to translate (and the photo itself only if you also choose the local OCR option)', to: 'A helper program on your own computer (loopback address only: 127.0.0.1, localhost or [::1])', sendsUserData: false, when: 'Only if you enter a helper address on the Scan screen. Addresses that are not loopback are refused. It leaves your browser but not your machine.', files: ['src/photo/engines/local-server.js', 'src/photo/scan.view.js'] },
  { id: 'speech-recognition', what: 'Your voice, if the browser\'s speech recogniser is used on the Say it screen', to: 'Decided by your browser, not by ALEF. Some browsers send the audio to the browser maker\'s servers.', sendsUserData: true, when: 'Only after you press the button. ALEF does not upload audio itself. The Permissions-Policy header in _headers sets microphone=(), which should disable microphone use on the deployed site; read in the file, not tested live.', files: ['src/speak/recognizer.js', 'src/speak/model.js', '_headers'] },
];

/** Things the code does on your device only. */
export const LOCAL_ONLY = [
  'Progress, settings, review cards and streaks are written to your browser\'s localStorage (table below). There is no account and no server-side profile.',
  'Photo text recognition runs in your browser with a vendored copy of Tesseract (about 5 MB of recognition data are downloaded from the ALEF site on first use, then cached).',
  'Speech output uses your device\'s built-in voice (speechSynthesis).',
  'Location is read only when you press the button in Settings (navigator.geolocation). The latitude and longitude are saved in your settings and used on your device for candle-lighting times. Nothing in the code sends them anywhere. You can type numbers instead, or clear them.',
  'Reminders: the app shows notifications while it is open or via the service worker only after you allow them. No push server is configured (the push key is empty in src/shell/notify.js), so nothing is pushed to you from a server.',
  'Calendar and progress files are made in your browser and handed to you as downloads. The Teacher screen can copy a code to your clipboard when you press its button.',
  'A service worker (sw.js) keeps an offline copy of the app in the browser\'s Cache Storage.',
];

/** localStorage keys (all written with the prefix "alef:"). `file` is one source file that defines or uses the key. */
export const STORE_KEYS = [
  ['settings', 'Settings: language, script, theme, voice, congregation, saved latitude and longitude', 'src/shell/settings.js'],
  ['onboarding.v1', 'Setup answers and plan', 'src/onboarding/model.js'],
  ['onboarding.v1.dailyGoal', 'Daily goal', 'src/home/today.js'],
  ['placement.v1', 'Placement check result', 'src/placement/placement.view.js'],
  ['curriculum.progress', 'Completed lessons', 'src/curriculum/dom.js'],
  ['srs.cards', 'Review cards for lessons', 'src/curriculum/dom.js'],
  ['srs.vocab', 'Review cards for vocabulary', 'src/vocab/themes.view.js'],
  ['streak', 'Study streak', 'src/curriculum/dom.js'],
  ['curriculum.hints.suppressed', 'Hints you dismissed', 'src/curriculum/hints.js'],
  ['curriculum.pairs', 'Look-alike letter error counts', 'src/curriculum/actions.js'],
  ['curriculum.checkpoints', 'Checkpoint results', 'src/curriculum/actions.js'],
  ['curriculum.gender', 'Gender pair practice', 'src/curriculum/actions.js'],
  ['curriculum.ladder', 'Syllable ladder progress', 'src/curriculum/actions.js'],
  ['curriculum.loanwords', 'Loanword practice', 'src/curriculum/actions.js'],
  ['curriculum.scaffold', 'Read-without-Latin progress', 'src/curriculum/scaffold.js'],
  ['intermediate.v1', 'Intermediate lessons progress', 'src/curriculum/intermediate.view.js'],
  ['firstday.progress', 'First 10 minutes progress', 'src/firstday/model.js'],
  ['firstday.ladder', 'Pointed-to-unpointed ladder', 'src/firstday/ladder.view.js'],
  ['letters.progress', 'Letter tracing progress', 'src/letters/progress.js'],
  ['wordtrace.cards', 'Word tracing review cards', 'src/wordtrace/flow.js'],
  ['wordtrace.progress', 'Word tracing progress', 'src/wordtrace/flow.js'],
  ['vocab.themes.v1', 'Theme pack choices', 'src/vocab/themes.view.js'],
  ['israel.cards', 'Sound-like-a-local review cards', 'src/israel/model.js'],
  ['israel.stats', 'Sound-like-a-local session results', 'src/israel/model.js'],
  ['israel.prefs', 'Sound-like-a-local preferences', 'src/israel/israel.view.js'],
  ['listen.v1', 'Listen-and-pick results', 'src/listen/listen.view.js'],
  ['timedread.v1', 'Timed read-aloud results', 'src/progress/model.js'],
  ['speak.v1', 'Say-it results (not recordings)', 'src/speak/model.js'],
  ['sprint.last', 'Last word sprint', 'src/sprint/model.js'],
  ['typing.v1', 'Typing practice results', 'src/typing/typing.js'],
  ['trope.v1', 'Trope trainer results', 'src/trope/trope.view.js'],
  ['grammar.v1', 'Grammar notes progress', 'src/grammar/grammar.view.js'],
  ['compare.v1', 'Compare-traditions choices', 'src/pronunciation/compare.view.js'],
  ['pron.quiz.v1', 'Tradition quiz results', 'src/pronunciation/tradquiz.view.js'],
  ['pron.readmyway.v1', 'Read-it-my-way choices', 'src/pronunciation/readmyway.view.js'],
  ['pron.misses', 'Pronunciation misses', 'src/progress/model.js'],
  ['torahreader.v1', 'Torah reader position', 'src/torahreader/model.js'],
  ['torahread.v1', 'Torah-reading course progress', 'src/torahread/ui.js'],
  ['progress.state', 'Progress screen state', 'src/morning/model.js'],
  ['morning.prefs', 'Morning verse preferences', 'src/morning/plan.js'],
  ['notify.prefs', 'Reminder time and on/off', 'src/shell/boot-hooks.js'],
  ['calendar.prefs', 'Calendar preferences', 'src/shell/notify.js'],
  ['install.v1', 'Install prompt state', 'src/shell/install.js'],
  ['alef.audioBannerSeen.v1', 'Whether you dismissed the audio notice (saved under this exact name, without the "alef:" prefix)', 'src/shell/audio-access.js'],
  ['alef.storage-notice.v1', 'Storage notice state and whether you dismissed it (saved under this exact name, without the "alef:" prefix)', 'src/shell/install-notice.js'],
  ['alef.scroll.v1', 'Scroll position per screen, so Back returns you to the same place (saved under this exact name, without the "alef:" prefix)', 'src/shell/scroll-restore.js'],
];

const table = (caption, head, rows) => h('table', { class: 'priv-table' }, h('caption', {}, caption),
  h('thead', {}, h('tr', {}, ...head.map((x) => h('th', { scope: 'col' }, x)))),
  h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, c) : h('td', {}, c)))))));
const sec = (id, title, ...kids) => h('section', { class: 'card', id: `priv-${id}`, 'aria-labelledby': `priv-${id}-h` }, h('h2', { id: `priv-${id}-h` }, title), ...kids);

export function mount(root, ctx) {
  const t = (k, fb) => { const v = ctx && typeof ctx.t === 'function' ? ctx.t(k) : null; return v && v !== k ? v : fb; };
  const offDevice = FLOWS.filter((f) => f.sendsUserData);
  root.replaceChildren(h('article', { class: 'stack' },
    h('header', { class: 'card' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.privacy', 'Privacy')),
      h('p', { class: 'draft-flag', role: 'note' }, 'Plain-language summary of what this version of ALEF does with your data, written from reading its source code. It is not legal advice and not a compliance statement. It describes this build; if you were given a different build, ask the person who gave it to you.'),
      h('p', {}, 'Short version: ALEF has no account, no analytics and no advertising code (searched for in the source). By default your progress stays in your browser. Two optional features can send something off your device, and they are described below: online vowel points on the Scan screen, and your browser\'s own speech recogniser on the Say it screen.')),
    sec('flows', 'What can leave your device',
      h('p', {}, `${offDevice.length} of the ${FLOWS.length} kinds of network request below can carry something you typed, scanned or said. Everything else only fetches ALEF's own files.`),
      h('ul', {}, ...FLOWS.map((f) => h('li', { id: `flow-${f.id}`, 'data-sends-user-data': String(f.sendsUserData) },
        h('strong', {}, f.what), h('span', { class: 'block' }, h('span', { class: 'muted' }, 'Goes to: '), f.to), h('span', { class: 'block' }, h('span', { class: 'muted' }, 'When: '), f.when))))),
    sec('local', 'What stays on your device', h('ul', {}, ...LOCAL_ONLY.map((x) => h('li', {}, x)))),
    sec('not', 'What was searched for and not found',
      h('p', {}, 'The source was searched for analytics or tracking libraries, cookies, beacons, push subscriptions with a live key, camera or microphone uploads by ALEF itself, and any request that sends progress or settings anywhere. None was found in this build. The Vision OCR adapter in src/photo/engines/web.js exists as code but nothing in the app creates it. This is a code reading, not a network capture on a live site.'),
      h('p', {}, 'Your browser, your device vendor and the site\'s host can still log ordinary things such as your IP address when the app loads. ALEF cannot see or control that.')),
    sec('keys', 'What is stored in your browser',
      h('p', {}, 'Stored in localStorage on this device. Each key below is saved with the prefix "alef:". If localStorage is unavailable (for example private browsing), the app keeps this data in memory only and it is lost when you close the tab. Review cards, progress and settings contain what you did in the app, not your name or account.'),
      table('Stored keys', ['Key', 'What it holds', 'Source file'], STORE_KEYS)),
    sec('control', 'Export and delete your data',
      h('ul', {},
        h('li', {}, h('strong', {}, 'Export: '), 'Settings > Backup > "Download backup" saves every alef: key as one JSON file. The Progress screen can also save a progress-only file. ', h('a', { href: '#/settings' }, 'Open Settings'), ' or ', h('a', { href: '#/progress' }, 'Progress'), '.'),
        h('li', {}, h('strong', {}, 'Clear your saved location: '), 'Settings, the clear button next to latitude and longitude.'),
        h('li', {}, h('strong', {}, 'Reset settings: '), '"Reset settings to defaults" in Settings resets settings only. It does not delete progress or review cards.'),
        h('li', {}, h('strong', {}, 'Delete everything: '), 'there is no single "delete all" button in the app. Clear this site\'s data in your browser settings (this also removes the offline copy and the saved progress), or uninstall the app if you installed it. Download a backup first if you want to keep your progress.'))),
    h('p', {}, h('a', { class: 'btn secondary', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/how' }, 'How this works'), ' ', h('a', { class: 'btn secondary', href: '#/about' }, 'About'))));
  return () => {};
}
