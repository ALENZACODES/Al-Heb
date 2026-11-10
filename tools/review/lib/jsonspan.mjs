// Span-aware JSON parser + surgical patcher.
// Why: the repo's data files use many different layouts (1-space, 2-space, one-line records, no
// trailing newline...). Re-serialising a whole file would rewrite thousands of unrelated lines, so
// apply_review.mjs edits only the exact byte ranges it needs and then re-parses to prove validity.

export function parseSpans(text) {
  let i = 0;
  const n = text.length;
  const err = (m) => { throw new SyntaxError(`${m} at offset ${i}`); };
  const ws = () => { while (i < n && (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) i++; };
  function value() {
    ws();
    const c = text[i];
    if (c === '{') return object();
    if (c === '[') return array();
    if (c === '"') return string();
    return primitive();
  }
  function string() {
    const s = i;
    i++;
    while (i < n && text[i] !== '"') { if (text[i] === '\\') i++; i++; }
    if (i >= n) err('unterminated string');
    i++;
    return { t: 'str', s, e: i, v: JSON.parse(text.slice(s, i)) };
  }
  function primitive() {
    const s = i;
    while (i < n && !',]} \n\r\t'.includes(text[i])) i++;
    if (s === i) err('unexpected character');
    const raw = text.slice(s, i);
    return { t: 'lit', s, e: i, v: JSON.parse(raw) };
  }
  function object() {
    const s = i; i++;
    const props = [];
    ws();
    if (text[i] === '}') { i++; return { t: 'obj', s, e: i, props }; }
    for (;;) {
      ws();
      if (text[i] !== '"') err('expected key');
      const k = string();
      ws();
      if (text[i] !== ':') err('expected colon');
      i++;
      const v = value();
      props.push({ key: k.v, ks: k.s, ke: k.e, v });
      ws();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === '}') { i++; break; }
      err('expected , or }');
    }
    return { t: 'obj', s, e: i, props };
  }
  function array() {
    const s = i; i++;
    const items = [];
    ws();
    if (text[i] === ']') { i++; return { t: 'arr', s, e: i, items }; }
    for (;;) {
      items.push(value());
      ws();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === ']') { i++; break; }
      err('expected , or ]');
    }
    return { t: 'arr', s, e: i, items };
  }
  const root = value();
  ws();
  if (i !== n) err('trailing content');
  return root;
}

/** Resolve a path of keys / indices to a span node, or null. */
export function nodeAt(root, path) {
  let cur = root;
  for (const p of path) {
    if (!cur) return null;
    if (cur.t === 'obj') { const pr = cur.props.find((x) => x.key === p); cur = pr ? pr.v : null; }
    else if (cur.t === 'arr') cur = typeof p === 'number' ? cur.items[p] || null : null;
    else return null;
  }
  return cur;
}

/**
 * Build edits (not yet applied) that set `key` to `value` inside object node `obj`.
 * Replaces an existing value in place, or appends a new member in the file's own style.
 */
export function setKeyEdits(text, obj, key, value) {
  const lit = JSON.stringify(value);
  const existing = obj.props.find((p) => p.key === key);
  if (existing) return [{ pos: existing.v.s, del: existing.v.e - existing.v.s, text: lit }];
  if (!obj.props.length) return [{ pos: obj.s + 1, del: 0, text: `"${key}": ${lit}` }];
  const last = obj.props[obj.props.length - 1];
  const first = obj.props[0];
  const sep = text.slice(first.ke, first.v.s); // e.g. ': ' or ':'
  const between = text.slice(last.v.e, obj.e - 1);
  let member;
  if (between.includes('\n')) {
    const lineStart = text.lastIndexOf('\n', last.ks) + 1;
    const indent = text.slice(lineStart, last.ks);
    member = `,\n${/^\s*$/.test(indent) ? indent : ' '}"${key}"${sep}${lit}`;
  } else {
    const commaGap = text.slice(first.v.e, obj.props[1] ? obj.props[1].ks : first.v.e);
    member = `,${/^,\s+$/.test(commaGap) ? ' ' : ''}"${key}"${sep}${lit}`;
  }
  return [{ pos: last.v.e, del: 0, text: member }];
}

/** Apply edits (pos/del/text) to text. Edits must not overlap. Creation order is preserved for equal positions. */
export function applyEdits(text, edits) {
  const ordered = edits.map((e, idx) => ({ ...e, idx })).sort((a, b) => b.pos - a.pos || b.idx - a.idx);
  let out = text;
  for (const e of ordered) out = out.slice(0, e.pos) + e.text + out.slice(e.pos + e.del);
  return out;
}
