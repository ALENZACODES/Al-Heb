/** Styles for the "Sound like a local" views, injected once (this lane cannot edit assets/css/app.css). Uses the app's CSS variables. */
export const CSS = `
.il-wrap{max-inline-size:44rem;margin-inline:auto}
.il-nav{display:flex;flex-wrap:wrap;gap:.5rem;margin-block:.75rem}
.il-nav a{display:inline-flex;align-items:center;min-block-size:44px;padding:.25rem .85rem;border:2px solid var(--accent);border-radius:999px;text-decoration:none;color:var(--accent);font-weight:600}
.il-nav a[aria-current="page"]{background:var(--accent);color:var(--accent-fg)}
.il-notice{background:var(--warn-bg);color:var(--warn-fg);padding:.6rem .8rem;border-radius:8px;border-inline-start:4px solid var(--focus);margin-block:.5rem}
.il-notice p{margin:.2rem 0}
.il-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius,12px);padding:.8rem .9rem;margin-block:.75rem;list-style:none}
.il-card h2,.il-card h3{margin:.1rem 0 .4rem;font-size:1.05rem}
.il-list{padding:0;margin:0}
.il-he{font-size:1.45rem;line-height:1.5;unicode-bidi:isolate}
.il-tr{font-style:italic;overflow-wrap:anywhere}
.il-line{border-inline-start:4px solid var(--border);padding-inline-start:.6rem;margin-block:.5rem}
.il-line[data-register="formal"]{border-color:#6b7280}.il-line[data-register="neutral"]{border-color:var(--accent)}
.il-line[data-register="casual"]{border-color:#2f7d4f}.il-line[data-register="slang"]{border-color:#b45309}
.il-badge{display:inline-block;font-size:.8rem;font-weight:700;padding:.05rem .5rem;border:1px solid currentColor;border-radius:999px;margin-inline-end:.35rem;white-space:nowrap}
.il-badge.il-low{background:var(--warn-bg);color:var(--warn-fg)}
.il-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-block:.5rem}
.il-opt{display:block;inline-size:100%;text-align:start;min-block-size:48px;padding:.6rem .8rem;margin-block:.4rem;border:2px solid var(--accent);border-radius:10px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.il-opt:disabled{cursor:default}
.il-opt[data-state="natural"]{border-color:#2f7d4f;background:color-mix(in srgb,#2f7d4f 14%,transparent)}
.il-opt[data-state="picked-wrong"]{border-color:#b91c1c}
.il-opt[aria-pressed="true"]{outline:3px solid var(--focus)}
.il-seg{display:inline-flex;gap:.25rem;flex-wrap:wrap}
.il-seg button{min-block-size:44px;min-inline-size:44px;padding:.25rem .8rem;border:2px solid var(--accent);border-radius:999px;background:transparent;color:var(--accent);font:inherit;cursor:pointer}
.il-seg button[aria-pressed="true"]{background:var(--accent);color:var(--accent-fg)}
.il-noaudio{color:var(--muted);font-size:.9rem}
.il-label{font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
.il-wrong{color:#b91c1c}.il-right{color:#166534}
:root[data-theme="dark"] .il-wrong{color:#fca5a5}:root[data-theme="dark"] .il-right{color:#86efac}
details.il-card summary{cursor:pointer;min-block-size:44px;display:flex;align-items:center;font-weight:700}
select.il-select{font:inherit;min-block-size:44px;max-inline-size:100%;background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding-inline:.5rem}
`;
export function injectStyle() {
  const d = globalThis.document;
  if (!d?.head || !d.getElementById || d.getElementById("il-style")) return;
  const s = d.createElement("style"); s.id = "il-style"; s.textContent = CSS; d.head.append(s);
}
