// Registers SW in prod only; shows "update available" prompt
export function registerSW() {
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
