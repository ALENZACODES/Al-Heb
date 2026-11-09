/**
 * Day page: /day/<iso-date>. mount(root, ctx) -> unmount.
 *
 * Explains one day of the calendar: Hebrew date, what the day is and why it matters, what people do, key words with
 * transliteration and English, which prayers and readings apply (linked into the app where they exist), the Torah
 * portion, candle-lighting / havdalah times for the learner's chosen city, and previous / next navigation.
 *
 * Copy comes from data/calendar/days.json (reviewed copy, nothing composed here); dates and times from calendar.js
 * through calendar.day.js. ctx: { params:{date}, store, settings, hasRoute, now?() } plus optional `dayData` for tests
 * { copy, links, registry:[{id,title}], lessons:[[id,title]] }.
 */
import { isoDate } from "./calendar.js";
import { CAL_PREFS_KEY, normalizePrefs, resolveLocation } from "./calendar.locations.js";
import { dayPage, validISO, CALC_NOTE } from "./calendar.day.js";
import { markerChip, artAvailable, ART_BASE } from "./calendar.markers.js";
import { CALENDAR_CSS } from "./calendar.style.js";
import { loadJSON } from "./data.js";
import { el, heText, storeGet } from "./dom.js";
import { uiEnglish } from "../shell/names.js";

const finite = (v) => typeof v === "number" && Number.isFinite(v);
function shellLocation(ctx) {
  const s = ctx?.settings, loc = s?.location;
  if (loc && finite(loc.lat) && finite(loc.lon)) return { lat: loc.lat, lon: loc.lon, tz: loc.tz };
  return finite(s?.lat) && finite(s?.lon) ? { lat: s.lat, lon: s.lon } : null;
}
const todayISO = (ctx) => { const d = ctx && typeof ctx.now === "function" ? ctx.now() : new Date(); return isoDate({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }); };

async function loadAll(ctx) {
  const inj = ctx?.dayData || {};
  const [copy, links, registry, lessons] = await Promise.all([
    inj.copy || loadJSON("data/calendar/days.json"),
    inj.links || loadJSON("data/festivals/links.json").catch(() => null),
    inj.registry || loadJSON("data/corpus/registry.json").then((r) => r.entries).catch(() => []),
    inj.lessons ? Promise.resolve(inj.lessons) : loadJSON("data/curriculum/lessons.json").then((l) => l.lessons.map((x) => [x.id, x.title])).catch(() => []),
  ]);
  return { copy, links, registryTitles: new Map(registry.map((e) => [e.id, e.title])), lessonTitles: new Map(lessons) };
}

export function mount(root, ctx) {
  let alive = true;
  if (typeof document !== "undefined" && document.head && !document.getElementById?.("alef-cal-style")) document.head.append(el("style", { id: "alef-cal-style" }, CALENDAR_CSS));
  const wrap = el("section", { class: "alef-calendar alef-day", "aria-labelledby": "view-title" });
  root.append(wrap);
  const iso = ctx?.params?.date || ctx?.query?.date || "";

  if (!validISO(iso)) {
    wrap.append(el("h1", { id: "view-title", class: "alef-h", tabindex: "-1" }, "Day"),
      el("p", {}, iso ? `"${iso}" is not a date this calendar can show. Use the form YYYY-MM-DD.` : "No date was given."),
      el("p", {}, el("a", { class: "btn", href: "#/calendar" }, "Open the calendar")));
    return () => { alive = false; wrap.remove(); };
  }

  wrap.append(el("h1", { id: "view-title", class: "alef-h", tabindex: "-1" }, "Loading day…"));

  (async () => {
    const [prefsRaw, D] = await Promise.all([storeGet(ctx, CAL_PREFS_KEY, null), loadAll(ctx)]);
    if (!alive) return;
    const prefs = normalizePrefs(prefsRaw);
    const loc = resolveLocation(prefs, shellLocation(ctx));
    const israel = prefs.parshaSchedule === "israel" || (prefs.parshaSchedule === "auto" && !!loc?.israel);
    const has = (n) => (typeof ctx?.hasRoute === "function" ? !!ctx.hasRoute(n) : false);
    const page = dayPage(iso, { mode: prefs.observance, israel, copy: D.copy, links: D.links, env: { hasRoute: has, registryTitles: D.registryTitles, lessonTitles: D.lessonTitles }, loc, havdalahPrefs: prefs.havdalah });
    render(page, loc);
  })().catch((e) => {
    if (!alive) return;
    wrap.replaceChildren(el("h1", { id: "view-title", class: "alef-h", tabindex: "-1" }, "Day"),
      el("p", { role: "alert" }, "The day page could not load its data. ", el("a", { href: "#/calendar" }, "Back to the calendar")),
      el("p", { class: "alef-cal-note mono" }, String(e && e.message || e)));
  });

  const E = (s) => uiEnglish(ctx, s);

  function render(p, loc) {
    const isToday = p.iso === todayISO(ctx);
    const head = el("header", { class: "alef-cal-head alef-day-head" },
      el("p", { class: "alef-day-kicker" }, el("a", { href: "#/calendar" }, "Calendar"), " › ", p.iso),
      el("h1", { id: "view-title", class: "alef-h", tabindex: "-1" }, p.dateLabel, isToday ? el("span", { class: "alef-day-today" }, " (today)") : null),
      el("p", { class: "alef-hebdate" }, p.hebrew.label, " ", heText(p.hebrew.he, "alef-he alef-he-large")),
      p.markers.length ? el("p", { class: "alef-mk-row", "aria-label": "Day markers" }, ...p.markers.map((m) => markerChip(m, { el }))) : null);
    headerArt(head);

    const kids = [head];
    if (p.quiet) kids.push(el("section", { class: "alef-day-sec" }, el("h2", {}, "An ordinary day"), el("p", {}, "No festival, fast or Rosh Chodesh falls on this day. The next notable day is listed below.")));

    for (const s of p.sections) kids.push(sectionView(s));

    // Torah portion (Shabbat) and times
    if (p.parsha || p.noPortion) kids.push(el("section", { class: "alef-day-sec", "aria-labelledby": "alef-day-parsha" },
      el("h2", { id: "alef-day-parsha" }, "Torah portion"),
      p.parsha ? el("p", {}, el("strong", {}, p.parsha.href ? el("a", { href: p.parsha.href, "aria-label": `Practise reading the Torah portion ${p.parsha.en}` }, p.parsha.en) : p.parsha.en), " ", heText(p.parsha.he), " ", el("span", { class: "muted" }, "(The full portion text is not in Aleph yet; the link opens the Torah reading practice.)"))
        : el("p", {}, p.noPortion)));

    if (p.times.length || p.needsLocation) {
      const timesKids = [el("h2", { id: "alef-day-times" }, "Candle lighting and havdalah")];
      if (p.needsLocation) timesKids.push(el("p", {}, el("a", { href: "#/calendar" }, "Choose a city on the Calendar screen"), " to see candle-lighting and havdalah times for this day."));
      else {
        timesKids.push(el("dl", { class: "alef-day-times" }, ...p.times.flatMap((t) => [
          el("dt", {}, t.label), el("dd", {}, t.time ? el("strong", { class: "alef-day-time" }, t.time) : null, t.time ? ` ${loc?.tz || "UTC"} ` : "", el("small", {}, t.detail))])));
        timesKids.push(el("p", { class: "alef-cal-note" }, CALC_NOTE));
      }
      kids.push(el("section", { class: "alef-day-sec", "aria-labelledby": "alef-day-times" }, ...timesKids));
    }

    // navigation
    const n = p.nav;
    kids.push(el("nav", { class: "alef-day-nav", "aria-label": "Day navigation" },
      el("a", { class: "alef-cal-btn", href: `#/day/${n.prev}`, rel: "prev" }, "‹ Previous day"),
      el("a", { class: "alef-cal-btn", href: "#/calendar" }, "Calendar"),
      el("a", { class: "alef-cal-btn", href: `#/day/${n.next}`, rel: "next" }, "Next day ›"),
      n.prevNotable ? el("a", { class: "alef-cal-btn", href: `#/day/${n.prevNotable.iso}` }, `‹ ${n.prevNotable.en} (${n.prevNotable.iso})`) : null,
      n.nextNotable ? el("a", { class: "alef-cal-btn", href: `#/day/${n.nextNotable.iso}` }, `${n.nextNotable.en} (${n.nextNotable.iso}) ›`) : null));
    kids.push(el("p", { class: "alef-cal-note" }, "Draft explanations written for Aleph in plain language; not reviewed by clergy. Customs differ between communities: your own congregation's practice comes first."));
    // the shell focused the loading heading when the route opened; keep focus on the real heading once it is replaced
    const hadFocus = typeof document !== "undefined" && document.activeElement && wrap.contains?.(document.activeElement);
    wrap.replaceChildren(...kids);
    if (hadFocus) { const h1 = head.querySelector?.("h1"); h1?.focus?.({ preventScroll: true }); }
    if (typeof document !== "undefined" && document.title != null) document.title = `${p.dateLabel} - Aleph`;
  }

  function sectionView(s) {
    const id = `alef-day-${s.key}`;
    const kids = [
      el("h2", { id }, s.title),
      s.he ? el("p", { class: "alef-day-name" }, heText(s.he, "alef-he alef-he-large"), s.tr ? el("span", { class: "alef-day-tr" }, " ", s.tr) : null, s.en && s.en !== s.title ? el("span", { class: "muted" }, ` · ${s.en}`) : null) : null,
      s.note ? el("p", {}, s.note) : null,
    ];
    if (!s.hasCopy) kids.push(el("p", { class: "alef-cal-note" }, "No explanation is written for this day yet."));
    if (s.what.length) kids.push(el("h3", {}, "What it is"), ...s.what.map((t) => el("p", {}, E(t))));
    if (s.customs.length) kids.push(el("h3", {}, "What people do"), el("ul", {}, ...s.customs.map((t) => el("li", {}, E(t)))));
    if (s.words.length) kids.push(el("h3", {}, "Key words"),
      el("table", { class: "alef-day-words" },
        el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Hebrew"), el("th", { scope: "col" }, "Say it"), el("th", { scope: "col" }, "English"))),
        el("tbody", {}, ...s.words.map((w) => el("tr", {}, el("td", {}, heText(w.he, "alef-he")), el("td", { class: "alef-day-tr" }, w.tr), el("td", {}, E(w.en)))))));
    if (s.readings.length || s.links.length) {
      kids.push(el("h3", {}, "Prayers and readings"));
      if (s.readings.length) kids.push(el("ul", {}, ...s.readings.map((t) => el("li", {}, E(t)))));
      kids.push(s.links.length
        ? el("div", {}, el("p", { class: "alef-cal-note" }, "In Aleph:"), el("ul", { class: "alef-day-links" }, ...s.links.map((l) => el("li", {}, el("a", { href: l.href }, l.label)))))
        : el("p", { class: "alef-cal-note" }, "None of these texts is in Aleph yet."));
    }
    if (s.learnMore) kids.push(el("p", {}, el("a", { class: "btn", href: s.learnMore.href }, `Learn more: ${s.learnMore.label}`)));
    return el("section", { class: `alef-day-sec alef-day-${s.key}`, "aria-labelledby": id, "data-day-section": s.key }, ...kids);
  }

  /** Optional banner art assets/img/calendar/header.png (1600x600); only when the file exists. */
  function headerArt(head) {
    artAvailable("header").then((ok) => {
      if (!ok || !alive) return;
      const img = el("img", { class: "alef-cal-art", alt: "", src: `${ART_BASE}/header.png`, width: "1600", height: "600", decoding: "async" });
      img.addEventListener("error", () => img.remove());
      head.prepend(img); head.classList.add("has-art");
    }).catch(() => {});
  }

  return () => { alive = false; wrap.remove(); };
}
