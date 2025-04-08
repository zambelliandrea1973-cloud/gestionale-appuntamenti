import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

// Versione di React
console.log('React version:', React.version);

// Rimozione del service worker per sicurezza
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered');
    }
  });
}

// Render semplice, senza StrictMode per evitare doppi rendering
try {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <>
        <App />
        <Toaster />
      </>
    );
  } else {
    console.error('Root element not found');
  }
} catch (error: unknown) {
  console.error('Error rendering app:', error instanceof Error ? error.message : 'Unknown error');
}
