import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
// Importa il sistema di traduzione
import "./lib/i18n";
// Registra il service worker per supporto offline e aggiornamenti PWA
import { registerServiceWorker } from "./registerServiceWorker";

// Attiva il service worker
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
