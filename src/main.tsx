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

// Service Worker registration (disabled in preview/dev, enabled in production)
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
const isPreview = window.location.hostname.includes('.lovable.app');

if ("serviceWorker" in navigator && !isDevelopment && !isPreview) {
  // Only register SW in production builds
  const url = `/sw.js?v=${encodeURIComponent(SW_VERSION)}`;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(url, { 
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    }).then((registration) => {
      console.log('[App] Service Worker registered, version:', SW_VERSION);
      // Check for updates every hour
      setInterval(() => {
        registration.update().catch(() => {});
      }, 1000 * 60 * 60);
    }).catch((err) => {
      console.warn('[App] Service Worker registration failed:', err);
    });
  });
} else if (isDevelopment || isPreview) {
  console.log('[App] Service Worker DISABLED (dev/preview mode). Current version:', SW_VERSION);
  // Unregister any existing service workers in dev/preview
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach(reg => {
        reg.unregister();
        console.log('[App] Unregistered existing Service Worker in dev/preview mode');
      });
    });
  }
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
