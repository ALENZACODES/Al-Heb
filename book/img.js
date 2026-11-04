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
//
// Approved AI-generated images (data/images/generated-manifest.json, written by tools/images/ingest.mjs; it lists approved images only)
// are picked up when the caller passes it as `generated`. Lookup order: real file in base -> approved generated -> placeholder SVG.
//   const r = createImgResolver({ base, files, generated: JSON.parse(readFileSync('data/images/generated-manifest.json')) });
//   r.src('L05_dalet_quirky')                  // '<base>/gen/L05_dalet_quirky.800.webp' once approved
//   r.src('L05_dalet_quirky', { width: 1600 }) // smallest variant with long edge >= 1600, else the largest

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
  let gen = opts.generated?.images ?? {};
  let genDir = (opts.generated?.dir ?? 'gen').replace(/^\/|\/$/g, '');
  const genEntry = (stem) => (Object.prototype.hasOwnProperty.call(gen, stem) && gen[stem]?.files?.length ? gen[stem] : null);
  /** Smallest variant whose long edge >= width (default 800), else the largest. */
  const pick = (entry, width = 800) => {
    const fs = [...entry.files].sort((a, b) => a.edge - b.edge);
    return (fs.find((f) => f.edge >= width) ?? fs[fs.length - 1]).file;
  };
  return {
    base,
    isReal(name) { const stem = stemOf(name); return !!realFile(stem) || !!genEntry(stem); },
    isGenerated(name) { const stem = stemOf(name); return !realFile(stem) && !!genEntry(stem); },
    src(name, o = {}) {
      const stem = stemOf(name);
      const f = realFile(stem);
      if (f) return `${base}/${f}`;
      const g = genEntry(stem);
      return g ? `${base}/${genDir}/${pick(g, o.width)}` : `${base}/placeholders/${stem}.svg`;
    },
    /** Replace the approved generated-image list (manifest object as written by tools/images/ingest.mjs). */
    setGenerated(manifest) { gen = manifest?.images ?? {}; genDir = (manifest?.dir ?? 'gen').replace(/^\/|\/$/g, ''); },
    /** Update the known real-file list (e.g. after fetching a fresh index.json). */
    setFiles(files) { set.clear(); for (const f of files) set.add(f); },
  };
}
