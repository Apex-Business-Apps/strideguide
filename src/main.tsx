import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SW_VERSION } from "./sw-version";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import i18n, { i18nReady } from "./i18n";
import "./utils/ComponentTester";
import "./utils/SystemReliabilityTester";

// Initialize core managers
import "./utils/InstallManager";
import "./utils/AudioArmer";

// Initialize performance monitoring
import "./utils/PerformanceMonitor";

// Load runtime config before app boot
import { loadRuntimeConfig } from "./config/runtime";

// CRITICAL: Only register SW for /app routes (PWA scope)
const isAppRoute = window.location.pathname.startsWith('/app');

// Aggressive SW cleanup outside /app scope
if (!isAppRoute && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    Promise.all(regs.map(r => r.unregister()));
  });
  if ('caches' in window) {
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
  }
  console.log('[App] Service Worker cleanup executed (marketing route)');
}

// Only register SW under /app scope
if (isAppRoute && "serviceWorker" in navigator) {
  const url = `/sw.js?v=${encodeURIComponent(SW_VERSION)}`;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(url, { 
      scope: '/app',
      updateViaCache: 'none'
    }).then((registration) => {
      console.log('[App] Service Worker registered for /app scope, version:', SW_VERSION);
      setInterval(() => {
        registration.update().catch(() => {});
      }, 1000 * 60 * 60);
    }).catch((err) => {
      console.warn('[App] Service Worker registration failed:', err);
    });
  });
} else if (!isAppRoute) {
  console.log('[App] Service Worker DISABLED (marketing route). Version:', SW_VERSION);
}

// Preload critical resources
const preloadCritical = () => {
  // Preload fonts
  const fontPreload = document.createElement('link');
  fontPreload.rel = 'preload';
  fontPreload.as = 'font';
  fontPreload.type = 'font/woff2';
  fontPreload.crossOrigin = 'anonymous';
  fontPreload.href = '/fonts/inter-var.woff2';
  document.head.appendChild(fontPreload);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preloadCritical);
} else {
  preloadCritical();
}

// Load runtime config, then boot app (block until i18n is ready)
Promise.all([
  loadRuntimeConfig().catch(err => {
    console.warn('[App] Runtime config load failed, using defaults:', err);
  }),
  i18nReady
]).finally(() => {
  if (!i18n.isInitialized) {
    console.warn('[App] i18n not initialized, forcing render anyway');
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
