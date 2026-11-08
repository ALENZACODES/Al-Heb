// Optional visual feedback; scoring and storage never depend on the companion.
export function reactRimon(action) {
  if (typeof globalThis.document?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('alef:rimon', { detail: { action } }));
  }
}
