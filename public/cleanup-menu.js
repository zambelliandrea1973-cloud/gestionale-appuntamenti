/**
 * cleanup-menu.js
 * 
 * Script per rimuovere forzatamente i pulsanti problematici dal menu mobile
 * Questo script viene eseguito dopo il caricamento della pagina e osserva
 * le modifiche al DOM per rimuovere dinamicamente elementi indesiderati
 */

(function() {
  // Elenco delle parole chiave da rimuovere nei pulsanti del menu
  const forbiddenTexts = ['Appuntamenti', 'Questionari'];
  
  // Funzione che rimuove i pulsanti problematici
  function cleanupMenu() {
    // Cerca tutti i pulsanti all'interno dei menu mobili
    const buttons = document.querySelectorAll('nav button, nav a');
    
    buttons.forEach(button => {
      // Ottieni il testo visualizzato del pulsante
      const buttonText = button.textContent || '';
      
      // Controlla se contiene una delle parole proibite
      if (forbiddenTexts.some(text => buttonText.includes(text))) {
        // Nasconde completamente l'elemento
        button.style.display = 'none';
        button.setAttribute('aria-hidden', 'true');
        
        // Log per debug
        console.log(`Nascosto pulsante con testo: "${buttonText.trim()}"`);
      }
    });
  }
  
  // Funzione per osservare le modifiche dinamiche al DOM
  function setupObserver() {
    // Configura un osservatore per le modifiche al DOM
    const observer = new MutationObserver((mutations) => {
      // Verifica se ci sono modifiche significative
      const needsCleanup = mutations.some(mutation => {
        // Controlla se sono stati aggiunti nodi
        return mutation.addedNodes.length > 0;
      });
      
      // Se ci sono modifiche che potrebbero aver aggiunto menu, pulisci
      if (needsCleanup) {
        cleanupMenu();
      }
    });
    
    // Inizia a osservare il documento intero
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return observer;
  }
  
  // Funzione principale
  function init() {
    // Esegui la pulizia iniziale dopo il caricamento completo
    if (document.readyState === 'complete') {
      cleanupMenu();
      setupObserver();
    } else {
      window.addEventListener('load', () => {
        cleanupMenu();
        setupObserver();
      });
    }
    
    // Aggiungi handler per l'apertura del menu
    document.addEventListener('click', (e) => {
      // Se è stato cliccato un pulsante che potrebbe aprire un menu
      if (e.target && (
        e.target.classList.contains('menu-button') || 
        e.target.closest('[aria-haspopup="true"]') ||
        e.target.closest('[data-state="open"]')
      )) {
        // Esegui la pulizia dopo un breve ritardo
        setTimeout(cleanupMenu, 100);
      }
    });
    
    // Pulisci anche quando cambia la route nell'app
    window.addEventListener('popstate', () => {
      setTimeout(cleanupMenu, 100);
    });
  }
  
  // Avvio
  init();
})();