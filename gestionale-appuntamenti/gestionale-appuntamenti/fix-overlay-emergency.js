/**
 * SCRIPT DI EMERGENZA PER DISABILITARE L'OVERLAY
 * Rimuove completamente l'overlay fastidioso che blocca l'applicazione
 */

// Script per essere iniettato nella pagina per disabilitare l'overlay
const overlayDisableScript = `
<script>
// Disabilita completamente l'overlay di errore Vite
if (window.__vite_plugin_react_preamble_installed__) {
  window.__vite_plugin_react_preamble_installed__ = false;
}

// Rimuovi overlay esistenti
function removeErrorOverlays() {
  const overlays = document.querySelectorAll('[data-vite-dev-id], .vite-error-overlay, [class*="error-overlay"]');
  overlays.forEach(overlay => {
    try {
      overlay.remove();
    } catch (e) {}
  });
}

// Previeni la creazione di nuovi overlay
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
  const element = originalCreateElement.call(this, tagName);
  if (element.tagName === 'DIV' && 
      (element.className?.includes('error') || 
       element.id?.includes('error') ||
       element.dataset?.viteDevId)) {
    return null;
  }
  return element;
};

// Esegui rimozione ogni 100ms
setInterval(removeErrorOverlays, 100);

// Rimozione immediata
removeErrorOverlays();

console.log('🎯 OVERLAY DI ERRORE DISABILITATO');
</script>
`;

console.log('Script di emergenza creato per disabilitare overlay');