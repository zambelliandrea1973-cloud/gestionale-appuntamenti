/**
 * cleanup-menu.js v3.0
 * 
 * Script ULTRA AVANZATO per rimuovere forzatamente i pulsanti problematici dal menu mobile
 * Versione potenziata basata sugli screenshot e sulla struttura esatta del menu
 * Utilizza tecniche avanzate e selettori specifici per garantire la rimozione completa
 */

(function() {
  // Elenco delle parole chiave da rimuovere (case insensitive)
  const forbiddenTexts = ['appuntamenti', 'questionari'];
  
  // ID di debug per tracciare le operazioni eseguite
  const debugId = 'menu-cleanup-v3-' + Date.now();
  console.log(`[${debugId}] Inizializzazione script ultra avanzato di pulizia menu`);
  
  // Conta gli elementi rimossi per debug
  let removedCount = 0;
  
  // Utilità per rendere un elemento completamente invisibile
  function hideElement(element, reason) {
    // Applica tutti i possibili stili di nascondimento
    element.style.display = 'none !important';
    element.style.visibility = 'hidden !important';
    element.style.opacity = '0 !important';
    element.style.pointerEvents = 'none !important';
    element.style.position = 'absolute !important';
    element.style.left = '-9999px !important';
    element.style.height = '0 !important';
    element.style.width = '0 !important';
    element.style.overflow = 'hidden !important';
    
    // Attributi per l'accessibilità e per il debugging
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('data-removed-by', debugId);
    element.setAttribute('data-removal-reason', reason);
    
    // Disabilita anche eventuali event listener
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      element.disabled = true;
      element.tabIndex = -1;
      
      // Clona e sostituisci per rimuovere definitivamente gli event listener
      const clone = element.cloneNode(true);
      if (element.parentNode) {
        element.parentNode.replaceChild(clone, element);
        clone.style.display = 'none !important';
        clone.style.visibility = 'hidden !important';
      }
    }
    
    return element;
  }
  
  // Funzione avanzata che rimuove i pulsanti problematici con più strategie
  function cleanupMenuItems() {
    // Contatore per questa esecuzione
    let currentRunCount = 0;
    
    // 1. SELETTORI SUPER SPECIFICI basati sugli screenshot forniti
    // Cattura esattamente i pulsanti come appaiono negli screenshot
    const specificMenuSelectors = [
      // Selettori esattamente come nello screenshot
      'div:has(> svg + span:contains("Appuntamenti"))',
      'div:has(> svg + span:contains("Questionari"))',
      
      // Selettori per il contenitore più ampio che contiene i pulsanti
      'body [role="dialog"] div:has(span:contains("Appuntamenti"))',
      'body [role="dialog"] div:has(span:contains("Questionari"))',
      'body div:has(> span:contains("Menu")) div:has(span:contains("Appuntamenti"))',
      'body div:has(> span:contains("Menu")) div:has(span:contains("Questionari"))'
    ];
    
    try {
      // Tenta di applicare i selettori specifici
      document.querySelectorAll(specificMenuSelectors.join(', ')).forEach(element => {
        hideElement(element, 'selettore-specifico-screenshot');
        currentRunCount++;
        console.log(`[${debugId}] Rimosso elemento da menu con selettore specifico: "${element.textContent.trim().substring(0, 30)}..."`);
      });
    } catch (e) {
      // Fallback se i selettori avanzati non sono supportati
      console.warn(`[${debugId}] Browser non supporta selettori CSS avanzati, utilizzo approccio alternativo`);
    }
    
    // 2. SELETTORI GENERICI per tutti i possibili pulsanti
    const allPossibleElements = document.querySelectorAll('button, a, [role="button"], [role="menuitem"], .button, [class*="Button"], [class*="button"], [class*="Nav"], [class*="Menu"], [class*="menu"], li');
    
    allPossibleElements.forEach(element => {
      // Ottieni tutto il testo contenuto nell'elemento
      const fullText = element.textContent || '';
      const lowerText = fullText.toLowerCase().trim();
      
      // Controlla se contiene una delle parole proibite
      const hasForbiddenText = forbiddenTexts.some(text => 
        lowerText.includes(text.toLowerCase())
      );
      
      if (hasForbiddenText) {
        // Nascondi l'elemento
        hideElement(element, 'contenuto-testuale');
        
        // Nascondi anche il container padre se è un elemento di menu
        const possibleContainers = ['li', '[role="menuitem"]', '[class*="menu-item"]'];
        for (const selector of possibleContainers) {
          const parentContainer = element.closest(selector);
          if (parentContainer && parentContainer !== element) {
            hideElement(parentContainer, 'container-di-elemento-proibito');
          }
        }
        
        currentRunCount++;
        console.log(`[${debugId}] Nascosto elemento #${removedCount + currentRunCount}: "${fullText.trim().substring(0, 30)}${fullText.length > 30 ? '...' : ''}"`);
      }
      
      // Controlla anche gli attributi dell'elemento
      const allAttrs = Array.from(element.attributes);
      for (const attr of allAttrs) {
        const attrValue = attr.value.toLowerCase();
        if (forbiddenTexts.some(text => attrValue.includes(text.toLowerCase()))) {
          hideElement(element, 'attributo-proibito');
          currentRunCount++;
          console.log(`[${debugId}] Nascosto elemento per attributo: "${attrValue}"`);
          break;
        }
      }
    });
    
    // 3. STRATEGIA MIRATA - cerca specificamente all'interno dei contenitori di menu
    // Visto che lo screenshot mostra chiaramente un componente menu/dialog specifico
    const menuContainerSelectors = [
      '[role="dialog"]', 
      '[role="menu"]',
      '[data-state="open"]',
      '.menu-container',
      '.mobile-menu',
      '[class*="drawer"]',
      '[class*="modal"]',
      '[class*="sidebar"]'
    ];
    
    menuContainerSelectors.forEach(containerSelector => {
      const containers = document.querySelectorAll(containerSelector);
      
      containers.forEach(container => {
        // Cerca all'interno dei container tutti gli elementi che potrebbero essere pulsanti di menu
        const menuItems = container.querySelectorAll('div, button, a, [role="menuitem"]');
        
        menuItems.forEach(item => {
          const fullText = item.textContent || '';
          const lowerText = fullText.toLowerCase().trim();
          
          if (forbiddenTexts.some(text => lowerText.includes(text.toLowerCase()))) {
            hideElement(item, 'elemento-in-container-menu');
            currentRunCount++;
            console.log(`[${debugId}] Nascosto elemento in menu: "${fullText.trim().substring(0, 30)}${fullText.length > 30 ? '...' : ''}"`);
          }
        });
      });
    });
    
    // 4. RIMUOVI CON JAVASCRIPT DIRETTO elementi con attributi personalizzati
    // Cerca elementi che hanno attributi data- che potrebbero indicare pulsanti di menu
    const attributeSelectors = [
      '[data-menu-item]',
      '[data-nav-item]',
      '[data-page]',
      '[data-route]',
      '[data-href]'
    ];
    
    attributeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(element => {
        const fullText = element.textContent || '';
        const lowerText = fullText.toLowerCase().trim();
        
        if (forbiddenTexts.some(text => lowerText.includes(text.toLowerCase()))) {
          hideElement(element, 'elemento-con-attributi-data');
          currentRunCount++;
          console.log(`[${debugId}] Nascosto elemento con attributi personalizzati: "${fullText.trim().substring(0, 30)}${fullText.length > 30 ? '...' : ''}"`);
        }
      });
    });
    
    // 5. VERIFICA STRUTTURA SPECIFICA DELLO SCREENSHOT
    // Cerca esplicitamente i div con svg + span che contengono il testo proibito
    try {
      document.querySelectorAll('div').forEach(div => {
        const svgElement = div.querySelector('svg');
        const spanElement = div.querySelector('span');
        
        if (svgElement && spanElement) {
          const spanText = spanElement.textContent.toLowerCase().trim();
          
          if (forbiddenTexts.some(text => spanText.includes(text.toLowerCase()))) {
            hideElement(div, 'struttura-svg-span');
            currentRunCount++;
            console.log(`[${debugId}] Nascosto elemento con struttura svg+span: "${spanText}"`);
          }
        }
      });
    } catch (e) {
      console.warn(`[${debugId}] Errore nella ricerca SVG+span:`, e);
    }
    
    // 6. INTERCETTA ANCHE SOTTO-COMPONENTI POTENZIALMENTE PROBLEMATICI
    // Cerca tutti gli elementi che potrebbero generare o contenere i pulsanti problematici
    const componentSelectors = [
      '[class*="navigation"]',
      '[class*="menu"]',
      '[class*="drawer"]',
      '[class*="sidebar"]',
      '[class*="navbar"]',
      '[class*="header"]',
      '[class*="App"]'
    ];
    
    componentSelectors.forEach(selector => {
      try {
        const components = document.querySelectorAll(selector);
        
        components.forEach(component => {
          // Per ciascun componente, aggiungi un observer specifico 
          // che verrà attivato quando il componente cambia
          setupComponentObserver(component);
        });
      } catch (e) {
        console.warn(`[${debugId}] Errore nella ricerca componenti:`, e);
      }
    });
    
    // 7. Rimuovi anche stili CSS che potrebbero mostrare questi elementi
    injectOverrideStyles();
    
    // Aggiorna il contatore totale
    removedCount += currentRunCount;
    return currentRunCount;
  }
  
  // Funzione che inietta stili CSS direttamente nel documento
  function injectOverrideStyles() {
    // Verifica se abbiamo già iniettato gli stili
    if (document.getElementById('menu-cleanup-styles-v3')) {
      return;
    }
    
    // Crea un elemento style 
    const styleElement = document.createElement('style');
    styleElement.id = 'menu-cleanup-styles-v3';
    styleElement.innerHTML = `
      /* SELETTORI SUPER PRECISI PER MENU MOBILE VISTO NEGLI SCREENSHOT */
      
      /* Selettori specifici per la struttura esatta mostrata negli screenshot */
      div:has(> svg + span:contains("Appuntamenti")),
      div:has(> svg + span:contains("Questionari")),
      [role="dialog"] div:has(span:contains("Appuntamenti")),
      [role="dialog"] div:has(span:contains("Questionari")),
      body div:has(> span:contains("Menu")) div:has(span:contains("Appuntamenti")),
      body div:has(> span:contains("Menu")) div:has(span:contains("Questionari")),
      
      /* Selettori CSS generici per tutti i possibili casi */
      button:contains("Appuntamenti"), 
      a:contains("Appuntamenti"),
      button:contains("Questionari"), 
      a:contains("Questionari"),
      button:contains("appuntamenti"), 
      a:contains("appuntamenti"),
      button:contains("questionari"), 
      a:contains("questionari"),
      
      /* Selettori basati su attributi href */
      [href*="appointment"],
      [href*="questionnaire"],
      [href*="appuntamenti"],
      [href*="questionari"],
      
      /* Selettori per elementi di lista */
      li:has(> a:contains("Appuntamenti")),
      li:has(> a:contains("Questionari")),
      li:has(> button:contains("Appuntamenti")),
      li:has(> button:contains("Questionari")),
      
      /* Selettori specifici per menu nei framework React */
      [role="menuitem"]:has(span:contains("Appuntamenti")),
      [role="menuitem"]:has(span:contains("Questionari")),
      [data-state="open"] div:has(span:contains("Appuntamenti")),
      [data-state="open"] div:has(span:contains("Questionari")),
      
      /* Selettori per menu sidebar e drawer */
      [role="navigation"] div:has(span:contains("Appuntamenti")),
      [role="navigation"] div:has(span:contains("Questionari")) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        left: -9999px !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
    `;
    
    // Aggiungi lo stile alla head - con priorità massima
    document.head.appendChild(styleElement);
    console.log(`[${debugId}] Stili CSS v3 iniettati per nascondere elementi problematici`);
  }
  
  // Imposta observer specifico per componenti
  function setupComponentObserver(component) {
    const observer = new MutationObserver((mutations) => {
      // Verifica se ci sono mutazioni rilevanti
      let shouldCleanup = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || 
            (mutation.type === 'attributes' && 
             (mutation.attributeName === 'class' || 
              mutation.attributeName === 'style' || 
              mutation.attributeName === 'data-state'))) {
          shouldCleanup = true;
          break;
        }
      }
      
      if (shouldCleanup) {
        // Esegui pulizia dopo un breve ritardo per permettere il rendering completo
        setTimeout(() => {
          const count = cleanupMenuItems();
          if (count > 0) {
            console.log(`[${debugId}] Pulizia dopo cambiamento componente: ${count} elementi rimossi`);
          }
        }, 50);
      }
    });
    
    // Configura observer per il componente
    observer.observe(component, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state', 'aria-expanded']
    });
    
    return observer;
  }
  
  // Funzione per creare un osservatore avanzato del DOM per l'intero documento
  function setupAdvancedObserver() {
    // Configura un osservatore per le modifiche ai nodi DOM con opzioni più aggressive
    const observer = new MutationObserver((mutations) => {
      let needsCleanup = false;
      
      for (const mutation of mutations) {
        // Se sono stati aggiunti nodi, pulisci
        if (mutation.addedNodes.length > 0) {
          // Controlla se qualcuno dei nodi aggiunti potrebbe contenere i testi proibiti
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              const text = element.textContent || '';
              if (forbiddenTexts.some(forbidden => text.toLowerCase().includes(forbidden))) {
                needsCleanup = true;
                break;
              }
            }
          }
          
          if (needsCleanup) break;
        }
        
        // Se un attributo è cambiato, controlla se è rilevante
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          // Se l'elemento è diventato visibile o è cambiato il suo stato
          if (
            mutation.attributeName === 'style' || 
            mutation.attributeName === 'class' ||
            mutation.attributeName === 'data-state' ||
            mutation.attributeName === 'aria-expanded' ||
            mutation.attributeName === 'open' ||
            mutation.attributeName === 'visibility'
          ) {
            needsCleanup = true;
            break;
          }
        }
      }
      
      if (needsCleanup) {
        // Piccolo ritardo per assicurarsi che il DOM sia aggiornato completamente
        setTimeout(() => {
          const removedItems = cleanupMenuItems();
          if (removedItems > 0) {
            console.log(`[${debugId}] Eseguita pulizia dopo mutazione DOM: ${removedItems} elementi rimossi`);
          }
        }, 50);
      }
    });
    
    // Osserva l'intero documento con opzioni complete
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-state', 'aria-expanded', 'open', 'visibility']
    });
    
    console.log(`[${debugId}] Osservatore DOM ultra avanzato configurato`);
    return observer;
  }
  
  // Esecuzione periodica più aggressiva
  function setupPeriodicCleanup() {
    // Pulisci immediatamente all'inizio
    cleanupMenuItems();
    
    // Pulisci frequentemente all'inizio
    const shortIntervals = [
      10, 50, 100, 200, 300, 500, 1000, 1500, 
      2000, 3000, 5000, 7000, 10000
    ];
    
    // Esegui la pulizia a intervalli specifici nei primi 10 secondi
    shortIntervals.forEach(interval => {
      setTimeout(() => {
        const removedItems = cleanupMenuItems();
        if (removedItems > 0) {
          console.log(`[${debugId}] Pulizia dopo ${interval}ms: ${removedItems} elementi rimossi`);
        }
      }, interval);
    });
    
    // Continua con pulizia periodica ogni 2 secondi per un minuto
    let count = 0;
    const interval = setInterval(() => {
      const removedItems = cleanupMenuItems();
      if (removedItems > 0) {
        console.log(`[${debugId}] Pulizia periodica #${count+1}: ${removedItems} elementi rimossi`);
      }
      
      count++;
      if (count >= 30) {
        clearInterval(interval);
        console.log(`[${debugId}] Pulizia periodica ad alta frequenza completata`);
        
        // Continua con intervalli più lunghi a tempo indefinito
        setInterval(cleanupMenuItems, 3000);
      }
    }, 2000);
  }
  
  // Intercetta le API che potrebbero modificare il DOM dinamicamente
  // Versione migliorata che intercetta più API
  function hookDynamicApis() {
    // 1. Intercetta fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const promise = originalFetch.apply(this, args);
      promise.then(() => {
        // Esegui pulizia dopo che i dati sono caricati, con intervalli multipli
        setTimeout(cleanupMenuItems, 100);
        setTimeout(cleanupMenuItems, 300);
        setTimeout(cleanupMenuItems, 500);
      });
      return promise;
    };
    
    // 2. Intercetta XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      this.addEventListener('load', () => {
        // Esegui pulizia a intervalli crescenti
        setTimeout(cleanupMenuItems, 100); 
        setTimeout(cleanupMenuItems, 300);
        setTimeout(cleanupMenuItems, 500);
      });
      return originalXHROpen.apply(this, args);
    };
    
    // 3. Intercetta History API per la navigazione
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      // Dopo la navigazione, pulisci menu
      setTimeout(cleanupMenuItems, 200);
      setTimeout(cleanupMenuItems, 500);
    };
    
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      // Dopo la navigazione, pulisci menu
      setTimeout(cleanupMenuItems, 200);
      setTimeout(cleanupMenuItems, 500);
    };
    
    // 4. Intercetta appendChild e insertBefore per catturare aggiunte al DOM
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(node) {
      const result = originalAppendChild.apply(this, arguments);
      
      // Se l'elemento aggiunto è rilevante per menu, esegui pulizia
      if (node.nodeType === Node.ELEMENT_NODE && 
         (node.tagName === 'DIV' || 
          node.tagName === 'UL' || 
          node.tagName === 'NAV' ||
          node.hasAttribute('role'))) {
        setTimeout(cleanupMenuItems, 50);
      }
      
      return result;
    };
    
    const originalInsertBefore = Element.prototype.insertBefore;
    Element.prototype.insertBefore = function(node, reference) {
      const result = originalInsertBefore.apply(this, arguments);
      
      // Se l'elemento aggiunto è rilevante per menu, esegui pulizia
      if (node.nodeType === Node.ELEMENT_NODE && 
         (node.tagName === 'DIV' || 
          node.tagName === 'UL' || 
          node.tagName === 'NAV' ||
          node.hasAttribute('role'))) {
        setTimeout(cleanupMenuItems, 50);
      }
      
      return result;
    };
    
    console.log(`[${debugId}] API dinamiche intercettate in modalità avanzata`);
  }
  
  // Event handler più completo per vari eventi
  function setupEventHandlers() {
    // Array esteso di eventi da monitorare
    const eventsToWatch = [
      // Input e interazione utente
      'click', 'touchend', 'mouseup', 'keydown', 'keyup', 'focus', 'blur',
      
      // Navigazione
      'popstate', 'hashchange', 'load', 'pageshow',
      
      // Animazioni e transizioni
      'animationend', 'transitionend', 'animationstart', 'transitionstart',
      
      // Dimensioni e layout
      'resize', 'orientationchange',
      
      // Visibilità
      'visibilitychange'
    ];
    
    // Aggiungi handler per ogni evento
    eventsToWatch.forEach(eventType => {
      document.addEventListener(eventType, () => {
        // Aspetta che eventuali menu si aprano, con tempi multipli
        setTimeout(cleanupMenuItems, 100);
        setTimeout(cleanupMenuItems, 300);
      }, { passive: true });
    });
    
    // Monitoraggio specifico per interazioni che potrebbero aprire menu
    document.addEventListener('click', (event) => {
      // Controlla se il click è su un potenziale attivatore di menu
      const target = event.target;
      const closestButton = target.closest('button, [role="button"]');
      
      if (closestButton) {
        // Se si clicca su un pulsante, c'è alta probabilità che si apra un menu
        // Esegui pulizia a intervalli crescenti
        setTimeout(cleanupMenuItems, 50);
        setTimeout(cleanupMenuItems, 150);
        setTimeout(cleanupMenuItems, 300);
      }
    }, { passive: true });
    
    console.log(`[${debugId}] Event handler configurati per ${eventsToWatch.length} tipi di eventi`);
  }
  
  // Funzione principale iniziale
  function init() {
    console.log(`[${debugId}] Avvio script di pulizia menu ultra avanzato v3.0`);
    
    // Esegui la prima pulizia al più presto possibile
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log(`[${debugId}] DOM caricato, esecuzione pulizia iniziale`);
        cleanupMenuItems();
        setupAdvancedObserver();
        setupPeriodicCleanup();
        setupEventHandlers();
        hookDynamicApis();
      });
    } else {
      // DOM già caricato, esegui subito
      console.log(`[${debugId}] DOM già caricato, esecuzione pulizia immediata`);
      cleanupMenuItems();
      setupAdvancedObserver();
      setupPeriodicCleanup();
      setupEventHandlers();
      hookDynamicApis();
    }
    
    // Esegui anche al caricamento completo della pagina 
    window.addEventListener('load', () => {
      console.log(`[${debugId}] Pagina completamente caricata, esecuzione pulizia aggiuntiva`);
      cleanupMenuItems();
      
      // Riapplica stili CSS per sicurezza
      injectOverrideStyles();
    });
    
    // Controlla anche quando l'app diventa visibile
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log(`[${debugId}] Documento tornato visibile, esecuzione pulizia`);
        cleanupMenuItems();
      }
    });
  }
  
  // Avvio dello script
  init();
})();