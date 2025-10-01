import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "./i18n";
import "./utils/ComponentTester";
import "./utils/SystemReliabilityTester";

// Initialize core managers
import "./utils/InstallManager";
import "./utils/AudioArmer";

// i18n is now synchronously initialized
createRoot(document.getElementById("root")!).render(<App />);
