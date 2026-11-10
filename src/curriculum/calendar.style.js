/**
 * Styles for the calendar and day-page views. Injected once (id alef-cal-style) by calendar.view.js / day.view.js so the
 * views work without a shell CSS change; built on the shell's variables (--card, --border, --fg, --muted, --tap, --radius,
 * --focus) with a deep green and gold layer of their own.
 *
 * Colour never carries meaning alone: every marked day has a shape (inline SVG marker) and a text label, and the
 * contrast themes (data-theme^="contrast") collapse the palette onto the shell's foreground / background / accent.
 */
export const CALENDAR_CSS = `
.alef-calendar {
  --cal-green: #1e4634; --cal-green-deep: #143225; --cal-green-soft: #e4ecdf; --cal-green-ink: #143225;
  --cal-gold: #d9a441; --cal-gold-deep: #8a5f0f; --cal-gold-soft: #f6e9c8; --cal-gold-line: #c9962f;
  --cal-ink: var(--fg, #1c2a1e); --cal-paper: var(--card, #fffaf0); --cal-cream: #f6f1e7;
  display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; max-inline-size: 100%;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .alef-calendar { --cal-green: #2f6a50; --cal-green-deep: #16301f; --cal-green-soft: #1f3327; --cal-green-ink: #cfe3d2; --cal-gold: #e6b75a; --cal-gold-deep: #f0c96f; --cal-gold-soft: #332a12; --cal-gold-line: #b8903a; --cal-cream: #ece7da; }
}
:root[data-theme="dark"] .alef-calendar { --cal-green: #2f6a50; --cal-green-deep: #16301f; --cal-green-soft: #1f3327; --cal-green-ink: #cfe3d2; --cal-gold: #e6b75a; --cal-gold-deep: #f0c96f; --cal-gold-soft: #332a12; --cal-gold-line: #b8903a; --cal-cream: #ece7da; }
:root[data-theme^="contrast"] .alef-calendar { --cal-green: var(--accent); --cal-green-deep: var(--accent); --cal-green-soft: var(--bg); --cal-green-ink: var(--fg); --cal-gold: var(--fg); --cal-gold-deep: var(--fg); --cal-gold-soft: var(--bg); --cal-gold-line: var(--fg); --cal-cream: var(--accent-fg); }

.alef-calendar * { min-inline-size: 0; overflow-wrap: break-word; }
.alef-calendar input, .alef-calendar select { max-inline-size: 100%; inline-size: 100%; }
.alef-cal-form .row > label { flex: 1 1 9rem; }
.alef-calendar section, .alef-calendar details { background: var(--cal-paper); border: 1px solid var(--border); border-radius: var(--radius); padding: .75rem 1rem; }
.alef-calendar h2 { font-size: 1.1rem; margin: 0 0 .4rem; color: var(--cal-green-ink); }
.alef-calendar h3 { font-size: 1rem; margin: .8rem 0 .3rem; color: var(--cal-green-ink); }
.alef-calendar section > h2 { padding-block-end: .25rem; border-block-end: 2px solid var(--cal-gold); }

/* header band */
.alef-cal-head { position: relative; display: grid; gap: .3rem; padding: 1rem 1.1rem; border-radius: var(--radius); background: var(--cal-green-deep); color: var(--cal-cream); border: 1px solid var(--cal-green-deep); border-block-end: 4px solid var(--cal-gold); overflow: hidden; }
.alef-cal-head h1, .alef-cal-head .alef-hebdate, .alef-cal-head a { color: inherit; }
.alef-cal-head .alef-h { margin: 0; }
.alef-cal-head .alef-cal-art { inline-size: 100%; block-size: auto; aspect-ratio: 8 / 3; object-fit: cover; border-radius: calc(var(--radius) - 4px); display: block; margin-block-end: .3rem; }
.alef-cal-head .alef-he { color: var(--cal-gold); }
.alef-day-kicker { font-size: .85rem; margin: 0; opacity: .9; }
.alef-day-today { font-size: 1rem; font-weight: 400; color: var(--cal-gold); }
:root[data-theme^="contrast"] .alef-cal-head { background: var(--card); color: var(--fg); border-color: var(--fg); }
:root[data-theme^="contrast"] .alef-cal-head .alef-he, :root[data-theme^="contrast"] .alef-day-today { color: var(--fg); }

/* markers: shape + text, never colour alone */
.alef-mk-row { display: flex; flex-wrap: wrap; gap: .35rem; margin: .2rem 0 0; }
.alef-mk { display: inline-flex; align-items: center; gap: .3rem; font-size: .78rem; line-height: 1; padding: .22rem .55rem .22rem .35rem; border-radius: 999px; border: 1px solid var(--cal-gold-line); background: var(--cal-gold-soft); color: var(--cal-ink); white-space: nowrap; }
.alef-mk .alef-mk-svg, .alef-mk .alef-mk-img { inline-size: 1em; block-size: 1em; flex: none; font-size: 1.05rem; }
.alef-mk.has-art .alef-mk-svg { display: none; }
.alef-mk-festival { background: var(--cal-green); color: #fff; border-color: var(--cal-green); }
.alef-mk-festival-minor { background: var(--cal-green-soft); color: var(--cal-green-ink); border-color: var(--cal-green); }
.alef-mk-fast { background: transparent; border-style: dashed; border-color: var(--cal-ink); }
.alef-mk-remembrance { background: var(--cal-paper); color: var(--cal-ink); border-color: var(--cal-ink); }
.alef-mk-morning, .alef-mk-evening, .alef-mk-reminder-set { background: var(--cal-paper); color: var(--cal-gold-deep); border-color: var(--cal-gold-line); }
.alef-cal-form .check .alef-mk.compact { color: var(--cal-gold-deep); }
.alef-cal-form .check:not(:has(input:checked)) .alef-mk.compact { opacity: .45; }
.alef-mk-roshchodesh { background: var(--cal-green-soft); color: var(--cal-green-ink); border-color: var(--cal-green); }
.alef-mk-shabbat { background: var(--cal-gold); color: #2b2b2b; border-color: var(--cal-gold-deep); }
.alef-mk-done { background: transparent; color: var(--cal-green-ink); border-color: var(--cal-green); }
.alef-mk.compact { padding: 0; border: 0; background: transparent; color: var(--cal-green-ink); gap: 0; }
.alef-mk.compact .alef-mk-svg, .alef-mk.compact .alef-mk-img { font-size: .95rem; }
.alef-mk.compact.alef-mk-shabbat, .alef-mk.compact.alef-mk-candles, .alef-mk.compact.alef-mk-havdalah { color: var(--cal-gold-deep); }
:root[data-theme^="contrast"] .alef-mk, :root[data-theme^="contrast"] .alef-mk-festival, :root[data-theme^="contrast"] .alef-mk-shabbat { background: var(--bg); color: var(--fg); border-color: var(--fg); }
.alef-cal-legend { display: flex; flex-wrap: wrap; gap: .4rem .8rem; margin: .5rem 0 0; padding: 0; list-style: none; }
.alef-cal-legend li { display: inline-flex; align-items: center; gap: .3rem; font-size: .8rem; color: var(--muted); }

/* grid */
.alef-cal-nav { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-block: .4rem; }
.alef-cal-nav button, .alef-cal-btn { font: inherit; display: inline-flex; align-items: center; justify-content: center; min-block-size: var(--tap); min-inline-size: var(--tap); padding: .3rem .9rem; border-radius: 999px; border: 2px solid var(--cal-green); background: transparent; color: var(--cal-green-ink); cursor: pointer; font-weight: 600; text-decoration: none; }
.alef-cal-nav button[aria-pressed="true"], .alef-cal-btn.primary { background: var(--cal-green); color: #fff; }
:root[data-theme^="contrast"] .alef-cal-nav button[aria-pressed="true"], :root[data-theme^="contrast"] .alef-cal-btn.primary { color: var(--accent-fg); }
.alef-cal-table { inline-size: 100%; border-collapse: separate; border-spacing: 3px; table-layout: fixed; }
.alef-cal-table caption { text-align: start; font-weight: 700; padding: .5rem .6rem; color: var(--cal-cream); background: var(--cal-green-deep); border-radius: calc(var(--radius) - 4px) calc(var(--radius) - 4px) 0 0; border-block-end: 3px solid var(--cal-gold); }
.alef-cal-table caption .alef-he { color: var(--cal-gold); }
:root[data-theme^="contrast"] .alef-cal-table caption { background: var(--card); color: var(--fg); border: 1px solid var(--fg); }
:root[data-theme^="contrast"] .alef-cal-table caption .alef-he { color: var(--fg); }
.alef-cal-table th { font-size: .72rem; letter-spacing: .04em; text-transform: uppercase; color: var(--cal-gold-deep); font-weight: 700; padding: .35rem .2rem .2rem; border-block-end: 1px solid var(--cal-gold-line); }
.alef-cal-table td { padding: 0; vertical-align: top; }
.alef-cal-day { position: relative; display: grid; grid-template-rows: auto auto 1fr auto; gap: .1rem; inline-size: 100%; min-block-size: 4.6rem; padding: .25rem .3rem; text-align: start; font: inherit; font-size: .8rem; background: var(--cal-paper); color: var(--cal-ink); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; text-decoration: none; box-sizing: border-box; }
a.alef-cal-day { color: var(--cal-ink); }
.alef-say { font-style: italic; color: var(--cal-gold-deep); margin: .1rem 0 .3rem; }
.alef-cal-day .g { font-weight: 700; font-size: .95rem; }
.alef-cal-day .h { color: var(--muted); font-size: .72rem; }
.alef-cal-day .l { font-size: .72rem; line-height: 1.2; overflow-wrap: normal; hyphens: auto; color: var(--cal-green-ink); }
.alef-cal-day .m { display: flex; flex-wrap: wrap; gap: .15rem; align-self: end; }
/* phones: a 7-column grid at 375px leaves about 44px per cell, where "Candles", a parsha name or "today" wrap letter by letter.
   The label and the "today" word leave the cell (the gold outline, the markers and the aria-label still carry them);
   the day page and the detail panel show the names in full. */
@media (max-width: 479.98px) {
  .alef-cal-table { border-spacing: 0; }
  .alef-cal-day { min-block-size: 3.6rem; padding: .2rem .15rem; gap: .05rem; grid-template-rows: auto auto 1fr; }
  .alef-cal-day .l { display: none; }
  .alef-cal-day .h { font-size: .62rem; }
  .alef-cal-day.today .g::after { content: none; }
  .alef-cal-day .m { gap: .1rem; }
  .alef-cal-day .m .alef-mk { padding: .12rem; border-radius: 6px; }
}
@media (max-width: 359.98px) { .alef-calendar section[aria-label="Calendar grid"] { overflow-x: auto; } .alef-cal-table { min-inline-size: 322px; } }
.alef-cal-day.out { background: transparent; border-style: dashed; }
.alef-cal-day.out, .alef-cal-day.out .g, .alef-cal-day.out .h, .alef-cal-day.out .l { color: var(--muted); font-weight: 400; }
.alef-cal-day.shabbat { background: var(--cal-gold-soft); border-color: var(--cal-gold-line); border-inline-start: 4px solid var(--cal-gold); }
.alef-cal-day.holiday { background: var(--cal-green-soft); border-color: var(--cal-green); }
.alef-cal-day.holiday .l { font-weight: 700; }
.alef-cal-day.fast { background: var(--cal-paper); border: 1px dashed var(--cal-ink); }
.alef-cal-day.remembrance { background: var(--cal-paper); border-color: var(--cal-ink); }
.alef-cal-day.today { outline: 3px solid var(--cal-gold); outline-offset: -3px; }
.alef-cal-day.today .g::after { content: " today"; font-size: .6rem; font-weight: 600; color: var(--cal-gold-deep); text-transform: uppercase; letter-spacing: .04em; }
.alef-cal-day[aria-pressed="true"] { background: var(--cal-green); color: #fff; border-color: var(--cal-green); }
.alef-cal-day[aria-pressed="true"] .h, .alef-cal-day[aria-pressed="true"] .l, .alef-cal-day.out[aria-pressed="true"] .g, .alef-cal-day[aria-pressed="true"] .alef-mk.compact { color: inherit; }
.alef-cal-day:focus-visible, .alef-cal-btn:focus-visible, .alef-cal-nav button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
:root[data-theme^="contrast"] .alef-cal-day.shabbat, :root[data-theme^="contrast"] .alef-cal-day.holiday { background: var(--bg); border: 2px solid var(--fg); }
:root[data-theme^="contrast"] .alef-cal-day[aria-pressed="true"] { background: var(--accent); color: var(--accent-fg); }
.alef-cal-year { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .6rem; }
.alef-cal-mini { inline-size: 100%; border-collapse: collapse; font-size: .7rem; text-align: center; }
.alef-cal-mini td { padding: .1rem; }
.alef-cal-mini .hol { background: var(--cal-green); color: #fff; border-radius: 4px; font-weight: 700; }
.alef-cal-mini .rc { text-decoration: underline; text-decoration-color: var(--cal-gold-deep); text-decoration-thickness: 2px; }
.alef-cal-mini .sat { background: var(--cal-gold-soft); border-radius: 4px; }
:root[data-theme^="contrast"] .alef-cal-mini .hol { background: var(--accent); color: var(--accent-fg); }
:root[data-theme^="contrast"] .alef-cal-mini .sat { background: var(--bg); outline: 1px solid var(--fg); }

/* prayer cards, detail, reminders */
.alef-prayer { border-inline-start: 5px solid var(--cal-gold); }
.alef-prayer.now { box-shadow: 0 0 0 2px var(--focus); }
.alef-prayer .alef-he-large { font-size: 1.6rem; line-height: 1.8; display: block; }
.alef-cal-draft { color: var(--muted); font-size: .8rem; }
.alef-cal-draft small { font-size: 100%; }
.alef-cal-detail { margin-block-start: .6rem; padding: .6rem .8rem; border-radius: 8px; background: var(--cal-green-soft); border-inline-start: 4px solid var(--cal-green); }
.alef-cal-form { display: grid; gap: .6rem; }
.alef-cal-form label { display: grid; gap: .15rem; font-weight: 600; }
.alef-cal-form input, .alef-cal-form select { font: inherit; min-block-size: var(--tap); padding: .2rem .5rem; }
.alef-cal-form .row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: end; }
.alef-cal-form fieldset { border: 1px solid var(--cal-gold-line); border-radius: 8px; padding: .4rem .8rem .6rem; }
.alef-cal-form legend { font-weight: 700; color: var(--cal-green-ink); padding-inline: .3rem; }
.alef-cal-form .check { display: inline-flex; gap: .4rem; align-items: center; font-weight: 500; padding: .2rem .7rem .2rem .4rem; margin: .15rem .25rem .15rem 0; border: 1px solid var(--cal-gold-line); border-radius: 999px; background: var(--cal-paper); }
.alef-cal-form .check:has(input:checked) { background: var(--cal-green-soft); border-color: var(--cal-green); }
.alef-cal-form .check input { inline-size: auto; accent-color: var(--cal-green); margin: 0; }
.alef-cal-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; }
.alef-cal-list li { display: grid; grid-template-columns: auto 1fr; gap: .2rem .6rem; align-items: center; padding: .35rem .5rem; border-radius: 8px; border: 1px solid var(--border); border-inline-start: 4px solid var(--cal-gold); background: var(--cal-paper); }
.alef-cal-list li .alef-mk { grid-column: 1; }
.alef-cal-list li .when { font-weight: 700; color: var(--cal-green-ink); white-space: nowrap; }
.alef-cal-list li[data-kind="holiday"] { border-inline-start-color: var(--cal-green); }
.alef-cal-list li[data-kind="morning"], .alef-cal-list li[data-kind="evening"] { border-inline-start-color: var(--border); }
.alef-cal-note { color: var(--muted); font-size: .85rem; }
.alef-holidays li { margin-block: .2rem; }

/* day page */
.alef-day-sec .alef-day-name { display: flex; flex-wrap: wrap; align-items: baseline; gap: .3rem .6rem; margin: .2rem 0 .6rem; }
.alef-day-sec .alef-he-large { font-size: 1.7rem; line-height: 1.7; }
.alef-day-tr { font-style: italic; color: var(--cal-gold-deep); }
.alef-day-words { inline-size: 100%; border-collapse: collapse; }
.alef-day-words th { text-align: start; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; color: var(--cal-gold-deep); padding: .25rem .4rem; border-block-end: 1px solid var(--cal-gold-line); }
.alef-day-words td { padding: .35rem .4rem; border-block-end: 1px solid var(--border); vertical-align: top; }
.alef-day-words td .alef-he { font-size: 1.3rem; }
.alef-day-times { display: grid; grid-template-columns: auto 1fr; gap: .3rem .8rem; margin: 0; }
.alef-day-times dt { font-weight: 700; color: var(--cal-green-ink); }
.alef-day-times dd { margin: 0; }
.alef-day-time { font-size: 1.1rem; color: var(--cal-green-ink); }
.alef-day-links { margin: .2rem 0 0; padding-inline-start: 1.2rem; }
.alef-day-nav { display: flex; flex-wrap: wrap; gap: .5rem; }
`;
