// Updates stay waiting until this tab's learner chooses to reload.
export function watchForUpdate(serviceWorker, registration, notify, reload) {
  let controlled = !!serviceWorker.controller;
  let notified = false, requested = false, reloaded = false;
  const installing = new Set();
  const reloadOnce = () => { if (!reloaded) { reloaded = true; reload(); } };
  const offer = (message) => {
    if (notified && !message) return;
    notified = true;
    notify(() => {
      if (requested) return;
      requested = true;
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      else reloadOnce(); // Another tab already activated the update.
    }, message);
  };
  const inspect = () => { if (controlled && registration.waiting) offer(); };
  const track = () => {
    const worker = registration.installing;
    if (worker && !installing.has(worker)) {
      installing.add(worker);
      worker.addEventListener('statechange', inspect);
    }
    inspect();
  };
  const changed = () => {
    if (!serviceWorker.controller) return;
    if (requested) reloadOnce();
    else if (controlled) offer(); // Other tabs never interrupt this learner automatically.
    controlled = true;
  };
  const message = (event) => {
    if (event.data?.type !== 'UPDATE_BLOCKED' || !requested) return;
    requested = false;
    offer('Close other ALEF tabs, then try Reload again. Your lesson has not been interrupted.');
  };
  serviceWorker.addEventListener('controllerchange', changed);
  serviceWorker.addEventListener('message', message);
  registration.addEventListener('updatefound', track);
  track();
  return () => {
    serviceWorker.removeEventListener('controllerchange', changed);
    serviceWorker.removeEventListener('message', message);
    registration.removeEventListener('updatefound', track);
    for (const worker of installing) worker.removeEventListener('statechange', inspect);
  };
}
