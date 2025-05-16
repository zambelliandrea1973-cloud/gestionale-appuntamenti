// Soluzione radicale rimuovi voci di menu - v8.0.0
(function() {
  // Esegui immediatamente all'avvio e dopo aver caricato il DOM
  function inizia() {
    console.log('Avvio pulizia menu mobile versione 8.0.0');
    
    // Rimozione elementi problematici con più tentativi
    pulisciMenu();
    
    // Programma pulizie periodiche per catturare elementi aggiunti dinamicamente
    setInterval(pulisciMenu, 500);
  }
  
  function pulisciMenu() {
    // 1. Cerca tutti i pulsanti con testo "Questionari" o "Appuntamenti"
    document.querySelectorAll('button, a').forEach(elemento => {
      const testo = elemento.innerText || elemento.textContent || '';
      if (testo.includes('Questionari') || testo.includes('Appuntamenti')) {
        console.log('Trovato elemento problematico:', testo);
        
        // Trova il contenitore dell'elemento di menu
        let contenitore = elemento;
        
        // Risali fino a 3 livelli per trovare il container completo
        for (let i = 0; i < 3; i++) {
          if (contenitore.parentElement) {
            contenitore = contenitore.parentElement;
          }
        }
        
        // Nascondi completamente l'elemento
        elemento.style.display = 'none';
        elemento.style.visibility = 'hidden';
        elemento.style.opacity = '0';
        elemento.style.pointerEvents = 'none';
        elemento.style.height = '0';
        elemento.style.width = '0';
        elemento.style.overflow = 'hidden';
        elemento.style.position = 'absolute';
        elemento.style.zIndex = '-9999';
        
        // Rimuovi anche il testo
        elemento.innerHTML = '';
        elemento.innerText = '';
        elemento.textContent = '';
        
        // Aggiungi attributo per identificare elementi nascosti
        elemento.setAttribute('data-removed', 'true');
      }
    });
    
    // 2. Cerca specificamente all'interno dei menu mobili (sheet)
    document.querySelectorAll('[class*="sheet"], [class*="menu"], [class*="mobile"]').forEach(menu => {
      const items = menu.querySelectorAll('div, a, button, li');
      items.forEach(item => {
        const testo = item.innerText || item.textContent || '';
        if (testo.includes('Questionari') || testo.includes('Appuntamenti')) {
          console.log('Trovato elemento problematico in menu:', testo);
          item.style.display = 'none';
          item.style.visibility = 'hidden';
          item.innerHTML = '';
        }
      });
    });
    
    // 3. Blocco specifico dello sheet mobile se contiene voci problematiche
    document.querySelectorAll('[role="dialog"]').forEach(dialog => {
      const content = dialog.innerText || dialog.textContent || '';
      if (content.includes('Questionari') || content.includes('Appuntamenti')) {
        console.log('Trovato dialog con contenuto problematico');
        // Inserisci una funzione che impedisca di aprire lo sheet
        const problematicItems = dialog.querySelectorAll('a, button, div');
        problematicItems.forEach(item => {
          const itemText = item.innerText || item.textContent || '';
          if (itemText.includes('Questionari') || itemText.includes('Appuntamenti')) {
            item.style.display = 'none';
            item.setAttribute('data-removed', 'true');
          }
        });
      }
    });
  }
  
  // Avvia subito
  inizia();
  
  // Aggiungi anche listener DOMContentLoaded per sicurezza
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizia);
  }
  
  // Intercetta modifiche al DOM
  const observer = new MutationObserver(() => {
    pulisciMenu();
  });
  
  // Osserva tutto il documento per modifiche
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
})();