import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker (production builds only; the virtual module is a no-op in dev). */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
