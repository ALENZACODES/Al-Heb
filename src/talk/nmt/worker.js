// @ts-check
// Talk translation pack: the worker. Translation runs here so the page stays responsive; nothing leaves the device.
// The worker's code lives in the tools repository (alef-tools, packages/translate), vendored at the pinned commit
// (data/alef-tools.lock.json). This file starts it. Messages that arrive before it is loaded wait their turn.
import { translateUrl } from './tools.js';

/** @type {any[]} */
const early = [];
const hold = (event) => { early.push(event); };
self.onmessage = hold;
import(translateUrl('worker.js')).then(() => {
  const handle = self.onmessage;                  // the vendored worker has put its own handler in place
  if (handle && handle !== hold) for (const event of early.splice(0)) handle.call(self, event);
}).catch((e) => {
  self.onmessage = (event) => self.postMessage({ id: event.data && event.data.id, ok: false, error: `worker code did not load: ${String((e && e.message) || e)}` });
  for (const event of early.splice(0)) /** @type {any} */ (self.onmessage)(event);
});
