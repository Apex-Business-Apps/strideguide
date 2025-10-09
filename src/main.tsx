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
import { registerSW } from "./sw/register";
import { ErrorBoundary } from "./components/ErrorBoundary";
import UpdateToast from "./components/UpdateToast";

// Initialize core managers
import "./utils/InstallManager";
import "./utils/AudioArmer";

// Initialize performance monitoring
import "./utils/PerformanceMonitor";

// Load runtime config before app boot
import { loadRuntimeConfig } from "./config/runtime";

// Register SW in production only (using new v3 module)
registerSW();
console.log('[App] SW registration initialized, version:', SW_VERSION);

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
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
      <UpdateToast />
    </ErrorBoundary>
  );
});
