import React from 'react';
import { createRoot } from "react-dom/client";
import "./index.css";
import TestApp from './TestApp';

// Per debug
console.log("React version:", React.version);
console.log("createRoot:", createRoot);
console.log("Root element:", document.getElementById("root"));

// Gestione semplice degli errori
try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Elemento root non trovato!");
    // Crea un elemento root se non esiste
    const newRoot = document.createElement("div");
    newRoot.id = "root";
    document.body.appendChild(newRoot);
    console.log("Creato nuovo elemento root");
    
    const root = createRoot(newRoot);
    root.render(<TestApp />);
  } else {
    console.log("Root element trovato, procedendo al render");
    const root = createRoot(rootElement);
    root.render(<TestApp />);
  }
} catch (error) {
  console.error("Errore durante il rendering:", error);
  // Mostra errore a video per debugging
  const errorDiv = document.createElement("div");
  errorDiv.style.color = "red";
  errorDiv.style.padding = "20px";
  errorDiv.style.margin = "20px";
  errorDiv.style.border = "1px solid red";
  errorDiv.textContent = `Errore critico: ${error.message}`;
  document.body.appendChild(errorDiv);
}
