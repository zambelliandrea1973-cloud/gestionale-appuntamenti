import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
// Importa il sistema di traduzione
import "./lib/i18n";

// Disabilita popup DevTools/runtime-error-modal
(window as any).__REPLIT_DISABLE_RUNTIME_ERROR_MODAL = true;

// CRITICAL: Force service worker update and cache purge on every page load
// Version 9 - Complete cache nuke to fix stale bundle issue
const SW_VERSION = 'v9-purge-all';
const LAST_SW_VERSION_KEY = 'last-sw-version';

async function forceServiceWorkerRefresh() {
  try {
    const lastVersion = localStorage.getItem(LAST_SW_VERSION_KEY);
    
    if (lastVersion !== SW_VERSION) {
      console.log(`Forcing service worker refresh from ${lastVersion} to ${SW_VERSION}`);
      
      // 1. Unregister ALL service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Service worker unregistered:', registration.scope);
        }
      }
      
      // 2. Delete ALL caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('Cache deleted:', cacheName);
        }
      }
      
      // 3. Save new version
      localStorage.setItem(LAST_SW_VERSION_KEY, SW_VERSION);
      console.log('Service worker refresh complete, reloading...');
      
      // 4. Force reload to get fresh JavaScript
      window.location.reload();
      return;
    }
  } catch (error) {
    console.error('Error during service worker refresh:', error);
  }
}

// Execute immediately
forceServiceWorkerRefresh();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
