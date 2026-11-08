export function signalRimon(action, detail = {}) {
  if(typeof globalThis.document?.dispatchEvent!=='function' || typeof globalThis.CustomEvent!=='function')return;
  globalThis.document.dispatchEvent(new CustomEvent('alef:rimon',{detail:{...detail,action}}));
}
