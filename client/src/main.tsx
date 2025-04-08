import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

// Registrazione del Service Worker per il supporto offline e l'installazione dell'app
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrato con successo:', registration.scope);
      })
      .catch(error => {
        console.error('Errore durante la registrazione del Service Worker:', error);
      });
  });
}

// Assicuriamoci che il componente root esista
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Elemento root non trovato!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
      <Toaster />
    </React.StrictMode>
  );
}
