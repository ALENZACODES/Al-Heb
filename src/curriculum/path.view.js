/**
 * Curriculum (#/curriculum): the whole course in one order to follow. Every lesson (reading and speaking) and every Practical
 * page, in five stages, with what is done and what comes next. mount(root, ctx) -> unmount.
 * Data: data/curriculum/path.json, built by tools/curriculum/build_path.mjs from the lesson list and the Practical course;
 * nothing on this screen is written by hand except the short English guidance. Progress is read from the same store keys the
 * lesson and Practical screens write (curriculum.progress, practical.progress); this screen writes nothing.
 * ctx extras for tests: ctx.pathData = the parsed path.json.
 */
import { el, storeGet, levelLabel, PROGRESS_KEY } from "./dom.js";
import { loadJSON } from "./data.js";
import { mixed } from "../hebrewtext/mixed.js";
import { PROGRESS_KEY as PRACTICAL_KEY } from "./practical-progress.js";
import { pathProgress, titleCase, pageKey, lessonHref } from "./path.model.js";

export const PATH_URL = "data/curriculum/path.json";
const CSS_HREF = new URL("../../assets/css/curriculum.css", import.meta.url).href;
/** The page's own stylesheet, added once on first open (kept out of the first install). */
function ensureCss() {
  const doc = globalThis.document;
  if (!doc || !doc.head || !doc.getElementById || doc.getElementById("alef-curriculum-css")) return;
  const link = doc.createElement("link");
  link.id = "alef-curriculum-css"; link.rel = "stylesheet"; link.href = CSS_HREF;
  doc.head.append(link);
}
export const DRAFT_NOTE = "The order is the course's own draft. No Hebrew teacher has reviewed it yet.";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function bar(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return el("div", { class: "alef-path-bar", role: "img", "aria-label": `${label}: ${done} of ${total} done` },
    el("span", { class: "alef-path-bar-fill", style: `inline-size:${pct}%` }),
    el("span", { class: "alef-path-bar-text", "aria-hidden": "true" }, `${label}: ${done} of ${total}`));
}

function lessonRow(l, done, hasIntermediate) {
  return el("li", { class: done ? "alef-path-item is-done" : "alef-path-item", "data-lesson": l.id },
    el("a", { href: lessonHref(l, hasIntermediate) }, ...mixed(l.title)),
    el("span", { class: "alef-path-meta" }, [levelLabel(l.level), l.min ? `about ${l.min} min` : ""].filter(Boolean).join(" · ")),
    done ? el("span", { class: "alef-path-done" }, "Done") : null);
}

function lessonBlock(kind, label, lessons, lessonsDone, open, hasIntermediate, extra) {
  if (!lessons.length) return null;
  const n = lessons.filter((l) => lessonsDone.has(l.id)).length;
  return el("details", { class: "alef-path-block", "data-block": kind, open: open || null },
    el("summary", {}, el("span", { class: "alef-path-block-name" }, label), " ",
      el("span", { class: "alef-path-meta" }, `${plural(lessons.length, "lesson", "lessons")} · ${n} done`)),
    extra || null,
    el("ol", { class: "alef-path-lessons" }, ...lessons.map((l) => lessonRow(l, lessonsDone.has(l.id), hasIntermediate))));
}

function unitRow(u, pagesDone) {
  const n = u.pages.filter((p) => pagesDone.has(pageKey(u.id, p.id))).length;
  return el("li", { class: "alef-path-unit", "data-unit": u.id },
    el("a", { class: "alef-path-unit-name", href: `#/practical/${encodeURIComponent(u.id)}` }, u.title),
    el("span", { class: "alef-path-meta" }, `${n} of ${plural(u.pages.length, "page", "pages")} done${u.short ? " · shorter draft pages" : ""}`),
    el("ol", { class: "alef-path-pages", "aria-label": `Pages of ${u.title}` },
      ...u.pages.map((p, i) => {
        const done = pagesDone.has(pageKey(u.id, p.id));
        return el("li", {}, el("a", { class: done ? "alef-path-page is-done" : "alef-path-page", href: `#/practical/${encodeURIComponent(u.id)}/${encodeURIComponent(p.id)}`,
          "aria-label": `Page ${i + 1}: ${p.title}${done ? " (done)" : ""}`, title: p.title }, String(i + 1)));
      })));
}

function stageSection(row, i, isCurrent, lessonsDone, pagesDone, hasIntermediate) {
  const s = row.stage;
  const id = `path-${s.id}`;
  const gates = s.gates && s.gates.length
    ? el("ul", { class: "alef-path-gates", "aria-label": "Reading goals of this stage" }, ...s.gates.map((g) => el("li", {}, el("strong", {}, `${g.belt} belt: `), ...mixed(g.gate))))
    : null;
  const unitsN = s.units.length;
  return el("section", { class: `alef-path-stage${isCurrent ? " is-current" : ""}${row.complete ? " is-complete" : ""}`, "data-stage": s.id, "aria-labelledby": id },
    el("h2", { id }, `Stage ${s.n}: ${titleCase(s.title)}`),
    el("p", { class: "alef-path-status" }, row.complete ? "Stage complete. " : isCurrent ? "You are here. " : "",
      `${row.lessonsDone} of ${plural(row.lessons, "lesson", "lessons")} · ${row.pagesDone} of ${plural(row.pages, "Practical page", "Practical pages")}`),
    lessonBlock("read", "Reading", s.read, lessonsDone, isCurrent, hasIntermediate, gates),
    lessonBlock("speak", "Speaking", s.speak, lessonsDone, isCurrent, hasIntermediate, null),
    unitsN ? el("details", { class: "alef-path-block", "data-block": "practical", open: isCurrent || null },
      el("summary", {}, el("span", { class: "alef-path-block-name" }, "Practical"), " ",
        el("span", { class: "alef-path-meta" }, `${plural(unitsN, "unit", "units")} · ${plural(row.pages, "page", "pages")} · ${row.pagesDone} done`)),
      el("ul", { class: "alef-path-units" }, ...s.units.map((u) => unitRow(u, pagesDone)))) : null);
}

function nextCard(p, hasIntermediate) {
  if (p.allDone) return el("section", { class: "alef-path-next", "aria-labelledby": "path-next" }, el("h2", { id: "path-next" }, "Next Up"),
    el("p", {}, "You have finished every lesson and every Practical page on the path."));
  const item = (label, href, title, meta) => el("li", {}, el("a", { class: "btn alef-path-next-link", href },
    el("span", { class: "alef-path-next-kind" }, label), el("span", { class: "alef-path-next-title" }, ...mixed(title)),
    meta ? el("span", { class: "alef-path-next-meta" }, meta) : null));
  return el("section", { class: "alef-path-next", "aria-labelledby": "path-next" },
    el("h2", { id: "path-next" }, "Next Up"),
    el("ul", { class: "alef-path-next-list" },
      p.nextRead ? item("Reading", lessonHref(p.nextRead.lesson, hasIntermediate), p.nextRead.lesson.title, `Stage ${p.nextRead.stage.n}${p.nextRead.lesson.min ? ` · about ${p.nextRead.lesson.min} min` : ""}`) : null,
      p.nextSpeak ? item("Speaking", lessonHref(p.nextSpeak.lesson, hasIntermediate), p.nextSpeak.lesson.title, `Stage ${p.nextSpeak.stage.n}${p.nextSpeak.lesson.min ? ` · about ${p.nextSpeak.lesson.min} min` : ""}`) : null,
      p.nextPage ? item("Practical", `#/practical/${encodeURIComponent(p.nextPage.unit.id)}/${encodeURIComponent(p.nextPage.page.id)}`, p.nextPage.page.title, `${p.nextPage.unit.title} · page ${p.nextPage.number} of ${p.nextPage.unit.pages.length}`) : null));
}

export function mount(root, ctx) {
  let alive = true;
  try { ensureCss(); } catch { /* the page still reads without its styles */ }
  root.replaceChildren(el("article", { class: "card alef-path" }, el("h1", { id: "view-title", tabindex: "-1" }, "Curriculum"), el("p", {}, "Loading…")));
  (async () => {
    let path = null;
    try { path = ctx?.pathData || await loadJSON(PATH_URL); } catch { path = null; }
    if (!alive) return;
    if (!path || !Array.isArray(path.stages)) {
      root.replaceChildren(el("article", { class: "card alef-path" }, el("h1", { id: "view-title", tabindex: "-1" }, "Curriculum"),
        el("p", { role: "alert" }, "The course order could not be loaded. Reload; nothing was lost."),
        el("p", {}, el("a", { class: "btn", href: "#/learn" }, "Open Lessons"))));
      return;
    }
    const [lp, pp] = await Promise.all([storeGet(ctx, PROGRESS_KEY, { completed: {} }), storeGet(ctx, PRACTICAL_KEY, { completed: {} })]);
    if (!alive) return;
    const lessonsDone = new Set(Object.keys((lp && lp.completed) || {}).filter((k) => lp.completed[k]));
    const pagesDone = new Set(Object.keys((pp && pp.completed) || {}).filter((k) => pp.completed[k]));
    const p = pathProgress(path, lessonsDone, pagesDone);
    const hasIntermediate = ctx?.hasRoute ? ctx.hasRoute("intermediatelesson") !== false : true;
    const t = path.totals || {};
    root.replaceChildren(el("article", { class: "card alef-path", "aria-labelledby": "view-title" },
      el("h1", { id: "view-title", tabindex: "-1" }, "Curriculum"),
      el("p", { class: "alef-path-lead" }, `The whole course in one order: ${p.lessons} lessons and ${p.pages} Practical pages in ${plural(p.stages.length, "stage", "stages")}. `
        + "Reading and speaking run side by side. A good study day is one lesson, then one Practical page."),
      el("p", { class: "muted" }, DRAFT_NOTE),
      nextCard(p, hasIntermediate),
      el("section", { class: "alef-path-total", "aria-label": "Your progress on the whole path" },
        bar(p.lessonsDone, p.lessons, "Lessons"), bar(p.pagesDone, p.pages, "Practical pages")),
      el("ul", { class: "alef-path-links" },
        ctx?.hasRoute?.("placement") === false ? null : el("li", {}, el("a", { href: "#/placement" }, "Not a beginner? Take the placement check")),
        ctx?.hasRoute?.("classtrack") === false ? null : el("li", {}, el("a", { href: "#/classtrack" }, "Put the reading lessons on dates with My Study Plan"))),
      ...p.stages.map((row, i) => stageSection(row, i, !p.allDone && i === p.current, lessonsDone, pagesDone, hasIntermediate)),
      t.minutes ? el("p", { class: "muted alef-path-foot" }, `The lessons add up to about ${Math.round(t.minutes / 60)} hours by their own estimates, which were never timed on a learner.`) : null));
  })();
  return () => { alive = false; };
}
