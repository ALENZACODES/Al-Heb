/**
 * Styles for the calendar view (Lane 1). Injected once by calendar.view.js so the view works without a lane-8 CSS
 * change; uses the shell's CSS variables. Lane 8 may move this into an assets/css file.
 */
export const CALENDAR_CSS = `
.alef-calendar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; max-inline-size: 100%; }
.alef-calendar * { min-inline-size: 0; overflow-wrap: anywhere; }
.alef-calendar input, .alef-calendar select { max-inline-size: 100%; inline-size: 100%; }
.alef-cal-form .row > label { flex: 1 1 9rem; }
.alef-calendar section, .alef-calendar details { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: .75rem 1rem; }
.alef-calendar h2 { font-size: 1.1rem; margin: 0 0 .4rem; }
.alef-cal-nav { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-block: .4rem; }
.alef-cal-nav button, .alef-cal-btn { font: inherit; min-block-size: var(--tap); min-inline-size: var(--tap); padding: .3rem .9rem; border-radius: 999px; border: 2px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; font-weight: 600; }
.alef-cal-nav button[aria-pressed="true"], .alef-cal-btn.primary { background: var(--accent); color: var(--accent-fg); }
.alef-cal-table { inline-size: 100%; border-collapse: collapse; table-layout: fixed; }
.alef-cal-table caption { text-align: start; font-weight: 700; padding-block: .3rem; }
.alef-cal-table th { font-size: .75rem; color: var(--muted); font-weight: 600; padding: .2rem; }
.alef-cal-table td { border: 1px solid var(--border); padding: 0; vertical-align: top; }
.alef-cal-day { position: relative; display: grid; gap: 0; inline-size: 100%; min-block-size: 4.2rem; padding: .2rem .25rem; text-align: start; font: inherit; font-size: .8rem; background: transparent; color: inherit; border: 0; cursor: pointer; }
.alef-cal-day .g { font-weight: 700; font-size: .95rem; }
.alef-cal-day .h { color: var(--muted); font-size: .75rem; }
.alef-cal-day .l { font-size: .68rem; line-height: 1.15; overflow-wrap: anywhere; }
.alef-cal-day.out, .alef-cal-day.out .g, .alef-cal-day.out .h, .alef-cal-day.out .l { color: var(--muted); font-weight: 400; }
.alef-cal-day.shabbat { background: color-mix(in srgb, var(--accent) 9%, transparent); }
.alef-cal-day.holiday .l { font-weight: 700; color: var(--accent); }
.alef-cal-day.today { outline: 2px solid var(--focus); outline-offset: -2px; }
.alef-cal-day[aria-pressed="true"] { background: var(--accent); color: var(--accent-fg); }
.alef-cal-day[aria-pressed="true"] .h, .alef-cal-day[aria-pressed="true"] .l, .alef-cal-day.out[aria-pressed="true"] .g { color: inherit; }
.alef-cal-year { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .6rem; }
.alef-cal-mini { inline-size: 100%; border-collapse: collapse; font-size: .7rem; text-align: center; }
.alef-cal-mini td { padding: .1rem; }
.alef-cal-mini .hol { background: var(--accent); color: var(--accent-fg); border-radius: 4px; font-weight: 700; }
.alef-cal-mini .rc { text-decoration: underline; }
.alef-cal-mini .sat { color: var(--muted); }
.alef-prayer { border-inline-start: 5px solid var(--accent); }
.alef-prayer.now { box-shadow: 0 0 0 2px var(--focus); }
.alef-prayer .alef-he-large { font-size: 1.6rem; line-height: 1.8; display: block; }
.alef-cal-draft { color: var(--muted); font-size: .8rem; }
.alef-cal-form { display: grid; gap: .6rem; }
.alef-cal-form label { display: grid; gap: .15rem; font-weight: 600; }
.alef-cal-form input, .alef-cal-form select { font: inherit; min-block-size: var(--tap); padding: .2rem .5rem; }
.alef-cal-form .row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: end; }
.alef-cal-form .check { display: flex; gap: .5rem; align-items: center; font-weight: 400; }
.alef-cal-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; }
.alef-cal-note { color: var(--muted); font-size: .85rem; }
`;
