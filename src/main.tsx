import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "./utils/i18n";
import "./utils/ComponentTester";
import "./utils/SystemReliabilityTester";

createRoot(document.getElementById("root")!).render(<App />);
