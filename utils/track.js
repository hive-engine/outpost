// Fire a custom Umami event (client-only, best-effort). Umami's tracker exposes
// window.umami.track(name, data) once /u.js has loaded; if analytics is blocked
// or not ready this is a silent no-op. Used to follow in-game actions (plays,
// ranked entries, puzzle solves) beyond the automatic pageview beacon.
export function track (event, data) {
  if (typeof window === 'undefined') { return }
  try {
    if (window.umami && typeof window.umami.track === 'function') {
      data ? window.umami.track(event, data) : window.umami.track(event)
    }
  } catch { /* analytics must never break gameplay */ }
}
