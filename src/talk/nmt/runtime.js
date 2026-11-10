// @ts-check
// Talk translation pack: puts the graphs, the tokenizer and the decoding loop together. No DOM, no storage.
// The browser worker (worker.js) and the Node scoring tool (tools/talk/nmt/score.mjs) both call this with the same runtime
// and the same pack files, so the scores in docs/talk are scores of the shipped code.
import { createTokenizer } from './tokenizer.js';
import { createDecoder } from './decode.js';

/** Joins the parts of one pack file. @param {ArrayBuffer[]} parts */
export function joinParts(parts) {
  const total = parts.reduce((a, p) => a + p.byteLength, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(new Uint8Array(p), at); at += p.byteLength; }
  return out;
}

/**
 * @param {{ort:any, pack:any, read:(path:string)=>Promise<ArrayBuffer>, onStage?:(stage:string)=>void}} cfg
 *   pack: one entry of manifest.packs; read: returns the bytes of one part by its manifest path.
 * @returns {Promise<{translate:(text:string, opts?:{beams?:number})=>Promise<string>, direction:string}>}
 */
export async function createRuntime(cfg) {
  const { ort, pack, read } = cfg;
  const file = async (name) => {
    const f = pack.files.find((x) => x.name === name);
    if (!f) throw new Error(`pack file missing: ${name}`);
    const parts = [];
    for (const p of f.parts) parts.push(await read(p.path));
    return joinParts(parts);
  };
  const vocab = JSON.parse(new TextDecoder().decode(await file('vocab.json')));
  const opts = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  const session = async (name) => { cfg.onStage?.(name); return ort.InferenceSession.create(await file(name), opts); };
  // one at a time: three graphs built at once would hold every byte twice at the same moment
  const table = await session('table.onnx');
  const encoder = await session('encoder.onnx');
  const decoder = await session('decoder.onnx');
  const tok = createTokenizer(vocab);
  const dec = createDecoder({ ort, table, encoder, decoder, vocab });
  /** One line at a time: the runtime cannot run two requests on one graph at once. */
  let chain = Promise.resolve('');
  const translate = (text, o = {}) => {
    const job = chain.then(async () => {
      const ids = tok.encode(text);
      if (ids.length <= 1) return '';
      return tok.decode(await dec.generate(ids, o));
    });
    chain = job.catch(() => '');
    return job;
  };
  return { translate, direction: pack.direction };
}
