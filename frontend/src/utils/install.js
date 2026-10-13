// Chrome fires `beforeinstallprompt` once, often before React has mounted, so it is
// captured here at module load (imported from main.jsx) and handed to the UI later.
let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  notify();
  event.prompt();
  const choice = await event.userChoice;
  return choice.outcome === 'accepted';
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

// iOS has no install event; the only route is Share > Add to Home Screen in Safari.
export function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  return isIos && !/crios|fxios|edgios/i.test(ua);
}
