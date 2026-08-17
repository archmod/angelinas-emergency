/** Debug switches. Read once from the URL at boot; toggled at runtime by DebugOverlay hotkeys. */
export interface DebugFlags {
  /** ?debug=1 — master switch (eruda console, overlay hotkeys, exposes window.__game). */
  enabled: boolean;
  /** ?level=<id> — start directly in a level. */
  level: string | null;
  overlay: boolean;
  hearing: boolean;
  nav: boolean;
  bodies: boolean;
  god: boolean;
}

export function readDebugFlags(search: string = window.location.search): DebugFlags {
  const q = new URLSearchParams(search);
  const on = (k: string) => q.has(k) && q.get(k) !== '0';
  const enabled = on('debug');
  return {
    enabled,
    level: q.get('level'),
    overlay: enabled && (on('overlay') || on('nav') || on('hearing') || on('bodies')),
    hearing: on('hearing'),
    nav: on('nav'),
    bodies: on('bodies'),
    god: on('god'),
  };
}
