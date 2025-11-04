import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

createRoot(document.getElementById("root")!).render(<App />);

// Registrar o service worker via vite-plugin-pwa
registerSW({ immediate: true });
