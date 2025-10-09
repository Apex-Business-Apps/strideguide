// Registers SW in prod only; shows "update available" prompt
// Disables and unregisters SW in preview builds
export function registerSW() {
  // Disable SW in preview builds (lovableproject.com domain)
  const isPreview = window.location.hostname.includes('lovableproject.com');
  
  if (isPreview && "serviceWorker" in navigator) {
    // Unregister all service workers in preview
    navigator.serviceWorker.getRegistrations().then(regs => {
      Promise.all(regs.map(r => r.unregister())).catch(() => {});
    });
    
    // Clear all cache storage in preview
    if ('caches' in window) {
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name))).catch(() => {});
      });
    }
    
    console.log('[SW] Preview mode: Service Worker disabled and caches cleared');
    return;
  }
  
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  
  navigator.serviceWorker.register("/sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller) {
          const ev = new CustomEvent("sw:update", { detail: { version: "v3" } });
          window.dispatchEvent(ev);
        }
      });
    });
  }).catch(() => {});
}
