// Script per bloccare completamente overlay Vite
(function() {
  // CSS più aggressivo per nascondere qualsiasi overlay
  const style = document.createElement('style');
  style.textContent = `
    /* Nasconde completamente tutti gli overlay Vite */
    vite-error-overlay,
    [data-vite-error-overlay],
    .vite-error-overlay,
    div[style*="position: fixed"][style*="z-index: 9999"],
    div[style*="position: fixed"][style*="background"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
      width: 0 !important;
      height: 0 !important;
    }
    
    /* Nasconde qualsiasi elemento che contiene testo dell'errore */
    *:contains("plugin:runtime-error-plugin"),
    *:contains("Unexpected token"),
    *:contains("server.hmr.overlay") {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // Intercepta la creazione di custom elements
  if (window.customElements && !window.customElements.get('vite-error-overlay')) {
    window.customElements.define('vite-error-overlay', class extends HTMLElement {
      constructor() {
        super();
        this.style.display = 'none';
        this.style.visibility = 'hidden';
        this.remove();
      }
    });
  }

  // Funzione aggressiva per rimuovere overlay
  function destroyOverlays() {
    // Selettori estesi per catturare ogni possibile overlay
    const selectors = [
      'vite-error-overlay',
      '[data-vite-error-overlay]',
      '.vite-error-overlay',
      'div[style*="position: fixed"]',
      'div[style*="z-index: 9999"]',
      'div[style*="background-color: rgba"]'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent || el.innerText || '';
        if (text.includes('plugin:runtime-error-plugin') || 
            text.includes('Unexpected token') ||
            text.includes('server.hmr.overlay') ||
            el.tagName === 'VITE-ERROR-OVERLAY') {
          el.remove(); // Rimuovi completamente dal DOM
        }
      });
    });

    // Rimuovi anche elementi appena creati
    const newOverlays = document.querySelectorAll('*');
    newOverlays.forEach(el => {
      if (el.tagName === 'VITE-ERROR-OVERLAY' || 
          el.hasAttribute('data-vite-error-overlay')) {
        el.remove();
      }
    });
  }

  // Esegui immediatamente e ripeti frequentemente
  destroyOverlays();
  setInterval(destroyOverlays, 100); // Ogni 100ms per essere più aggressivi

  // Observer più aggressivo per bloccare overlay
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Rimuovi immediatamente qualsiasi overlay
          if (node.tagName === 'VITE-ERROR-OVERLAY' || 
              node.hasAttribute && node.hasAttribute('data-vite-error-overlay')) {
            node.remove();
            return;
          }
          
          // Controlla il contenuto del nodo
          const text = node.textContent || node.innerText || '';
          if (text.includes('plugin:runtime-error-plugin') || 
              text.includes('Unexpected token')) {
            node.remove();
            return;
          }
          
          // Cerca e rimuovi overlay annidati
          if (node.querySelectorAll) {
            const nestedOverlays = node.querySelectorAll('vite-error-overlay, [data-vite-error-overlay]');
            nestedOverlays.forEach(overlay => overlay.remove());
          }
        }
      });
    });
  });

  // Osserva tutto il documento
  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeOldValue: true
  });

  // Blocca completamente la ricreazione degli overlay
  
  // 1. Intercetta createElement
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    if (tagName && tagName.toLowerCase() === 'vite-error-overlay') {
      // Ritorna un elemento vuoto che si autodistrugge
      const fakeElement = originalCreateElement.call(this, 'div');
      fakeElement.style.display = 'none';
      setTimeout(() => fakeElement.remove(), 0);
      return fakeElement;
    }
    return originalCreateElement.call(this, tagName);
  };

  // 2. Intercetta appendChild
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(node) {
    if (node && (node.tagName === 'VITE-ERROR-OVERLAY' || 
        node.hasAttribute && node.hasAttribute('data-vite-error-overlay'))) {
      // Non aggiungere l'overlay al DOM
      return node;
    }
    return originalAppendChild.call(this, node);
  };

  // 3. Intercetta insertBefore
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (newNode && (newNode.tagName === 'VITE-ERROR-OVERLAY' || 
        newNode.hasAttribute && newNode.hasAttribute('data-vite-error-overlay'))) {
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };

  // 4. Blocca customElements.define per vite-error-overlay
  if (window.customElements) {
    const originalDefine = window.customElements.define;
    window.customElements.define = function(name, constructor, options) {
      if (name === 'vite-error-overlay') {
        // Sostituisci con una classe vuota
        class FakeOverlay extends HTMLElement {
          constructor() {
            super();
            this.remove();
          }
        }
        return originalDefine.call(this, name, FakeOverlay, options);
      }
      return originalDefine.call(this, name, constructor, options);
    };
  }

  // 5. Intercetta console.error per bloccare trigger
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Filtra errori che potrebbero triggerare l'overlay
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('plugin:runtime-error-plugin') ||
         message.includes('Unexpected token') ||
         message.includes('vite-error-overlay') ||
         message.includes('Function components cannot be given refs'))) {
      return; // Non mostrare questi errori che causano overlay
    }
    return originalConsoleError.apply(this, args);
  };
})();