// Script per disabilitare l'overlay di errore Vite
(function() {
  // Disabilita l'overlay di errore runtime di Vite
  if (window.__vite_plugin_react_preamble_installed__) {
    const originalError = console.error;
    console.error = function(...args) {
      // Filtra i messaggi dell'overlay Vite
      if (args[0] && typeof args[0] === 'string' && args[0].includes('plugin:runtime-error-plugin')) {
        return;
      }
      originalError.apply(console, args);
    };
  }

  // Nasconde l'overlay se già presente
  setTimeout(() => {
    const overlay = document.querySelector('[data-vite-error-overlay]');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }, 100);

  // Intercetta e nasconde nuovi overlay
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-vite-error-overlay')) {
          node.style.display = 'none';
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();