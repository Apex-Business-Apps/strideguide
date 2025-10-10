// @stride/sw-register v3.1 — Scoped to /app/sw.js in production; unregisters root SW; preview cleanup
export function registerSW() {
  const isPreview = window.location.hostname.includes('lovableproject.com');
  const isAppRoute = window.location.pathname.startsWith('/app');
  
  if (!("serviceWorker" in navigator)) return;
  
  // Preview mode: unregister all SW and clear caches
  if (isPreview) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      Promise.all(regs.map(r => r.unregister())).catch(() => {});
    });
    if ('caches' in window) {
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name))).catch(() => {});
      });
    }
    console.log('[SW] Preview: all workers unregistered, caches cleared');
    return;
  }
  
  // Production mode
  if (import.meta.env.DEV) return;
  
  // Marketing pages (/auth, /, etc.): unregister any root-level SW
  if (!isAppRoute) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => {
        if (r.scope === window.location.origin + '/' || !r.scope.includes('/app/')) {
          console.log(`[SW] Marketing page: unregistering non-/app/ worker at ${r.scope}`);
          r.unregister().catch(() => {});
        }
      });
    });
    return;
  }
  
  // PWA /app/ route: register scoped worker at /app/sw.js
  navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).then(reg => {
    console.log(`[SW] Registered /app/ worker: ${reg.scope}`);
    
    reg.addEventListener("updatefound", () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller) {
          const ev = new CustomEvent("sw:update", { detail: { version: "v3.1", scope: "/app/" } });
          window.dispatchEvent(ev);
        }
      });
    });
  }).catch(err => {
    console.warn('[SW] Registration failed:', err);
  });
}
