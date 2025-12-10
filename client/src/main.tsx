import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
// Importa il sistema di traduzione
import "./lib/i18n";
// Service Worker DISABILITATO per evitare errori "Unexpected token '<'"
// import { registerServiceWorker } from "./registerServiceWorker";

// Disabilita popup DevTools/runtime-error-modal
(window as any).__REPLIT_DISABLE_RUNTIME_ERROR_MODAL = true;

// Service worker disabilitato
// registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
