// Optional visual feedback; scoring and storage never depend on the companion.
export function reactRimon(action) {
  if (typeof globalThis.document?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('alef:rimon', { detail: { action } }));
  }
}

export function signalRimon(action, detail = {}) {
  if(typeof globalThis.document?.dispatchEvent === "function" && typeof CustomEvent === "function") document.dispatchEvent(new CustomEvent("alef:rimon", {detail:{...detail,action}}));
}

/** Page-complete and other visible cheers. Same event as signalRimon. */
export function showRimon(action = 'highfive', detail = {}) {
  signalRimon(action, detail);
}
