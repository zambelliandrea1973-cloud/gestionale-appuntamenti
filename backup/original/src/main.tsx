import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from "./App"; // Usiamo la versione normale dell'app
import "./index.css";

// Logging per debugging
console.log('React version:', React.version);
console.log('ReactDOM:', ReactDOM);
console.log('Root element:', document.getElementById('root'));

// Rimozione del service worker per sicurezza
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered');
    }
  });
}

// Render estremamente semplificato senza provider di contesto o altre complessità
document.addEventListener('DOMContentLoaded', () => {
  try {
    const root = document.getElementById('root');
    if (root) {
      // Rimuoviamo qualsiasi contenuto esistente per sicurezza
      root.innerHTML = '';
      
      // Rendering React di base
      const reactRoot = ReactDOM.createRoot(root);
      reactRoot.render(<App />);
      console.log('Rendering completato con successo');
    } else {
      console.error('Root element not found');
      // Creiamo un nuovo elemento root se non esiste
      const newRoot = document.createElement('div');
      newRoot.id = 'root';
      document.body.appendChild(newRoot);
      console.log('Creato nuovo elemento root');
      
      const reactRoot = ReactDOM.createRoot(newRoot);
      reactRoot.render(<App />);
    }
  } catch (error: unknown) {
    console.error('Error rendering app:', error instanceof Error ? error.message : 'Unknown error');
    
    // In caso di errore, aggiungiamo un messaggio di errore visibile
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.style.margin = '20px';
    errorDiv.style.border = '1px solid red';
    errorDiv.textContent = `Errore critico: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`;
    document.body.appendChild(errorDiv);
  }
});
