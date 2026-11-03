// Image resolver: returns the real image if it exists, else the SVG placeholder.
// Source-agnostic: works in the browser, in Node and in a service worker. No fs/fetch imports.
// The caller supplies the list of real files (assets/img/index.json -> files) or a predicate.
//
//   const r = createImgResolver({ base: 'assets/img', files: indexJson.files });
//   r.src('L01_alef_print_mnemonic')       // 'assets/img/placeholders/L01_alef_print_mnemonic.svg' until the PNG exists
//   r.src('L01_alef_print_mnemonic.png')   // same; extension optional
//   r.isReal('L01_alef_print_mnemonic')    // boolean
//
// Real file preference order: .png, .webp, .jpg, .svg (a hand-made SVG in assets/img/ counts as real).

const EXT = ['png', 'webp', 'jpg', 'svg'];

/** Strip a directory prefix and a known image extension. */
export function stemOf(name) {
  return String(name).replace(/^.*\//, '').replace(/\.(png|webp|jpg|svg)$/i, '');
}

/**
 * @param {{ base?: string, files?: Iterable<string>, has?: (fileName: string) => boolean }} opts
 *   base: URL/dir prefix (default 'assets/img'); files: names of real files directly in base; has: alternative predicate.
 */
export function createImgResolver(opts = {}) {
  const base = (opts.base ?? 'assets/img').replace(/\/$/, '');
  const set = new Set(opts.files ?? []);
  const has = opts.has ?? ((f) => set.has(f));
  const realFile = (stem) => EXT.map((e) => `${stem}.${e}`).find((f) => has(f));
  return {
    base,
    isReal(name) { return !!realFile(stemOf(name)); },
    src(name) {
      const stem = stemOf(name);
      const f = realFile(stem);
      return f ? `${base}/${f}` : `${base}/placeholders/${stem}.svg`;
    },
    /** Update the known real-file list (e.g. after fetching a fresh index.json). */
    setFiles(files) { set.clear(); for (const f of files) set.add(f); },
  };
}
