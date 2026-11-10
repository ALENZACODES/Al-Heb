// First-run setup (#/welcome). The flow (letters question -> synagogue and pronunciation -> your week) lives in
// src/onboarding/firstrun.view.js and is re-exported here so the existing `welcome` route line keeps working unchanged.
// Voice and goal are no longer asked at first run; both stay in Settings (src/shell/settings.view.js).
export { mount } from '../onboarding/firstrun.view.js';
