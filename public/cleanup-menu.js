// Rimozione definitiva voci "Appuntamenti" e "Questionari" - v9.0.0
(function() {
  
  /**
   * Funzione principale di pulizia menu
   * Versione 9.0.0 - Rimozione completa
   * 
   * Questo script rimuove permanentemente i pulsanti "Appuntamenti" e "Questionari"
   * dal menu mobile come richiesto dal cliente.
   * 
   * La soluzione è strutturata per rimuovere fisicamente gli elementi dal DOM
   * anziché solo nasconderli.
   */
  
  let rimossiAppuntamenti = 0;
  let rimossiQuestionari = 0;
  
  function pulisciMenuMobile() {
    try {
      // 1. Rimozione diretta di tutti i pulsanti con testo problematico
      document.querySelectorAll('button, a, div').forEach(el => {
        const testo = (el.innerText || el.textContent || '').trim();
        
        if (testo === 'Appuntamenti' || testo === 'Questionari') {
          // Se è un pulsante del menu, trova il contenitore completo (tipicamente un <li> o <a>)
          let contenitore = el;
          while (contenitore && contenitore.parentElement && 
                 !['NAV', 'UL', 'BODY'].includes(contenitore.parentElement.tagName)) {
            contenitore = contenitore.parentElement;
          }
          
          // Rimuovi fisicamente dal DOM
          if (contenitore && contenitore.parentNode) {
            if (testo === 'Appuntamenti') rimossiAppuntamenti++;
            if (testo === 'Questionari') rimossiQuestionari++;
            
            contenitore.parentNode.removeChild(contenitore);
            console.log(`Rimosso elemento '${testo}' dal menu mobile`);
          } else {
            // Se non troviamo un contenitore adatto, rimuovi almeno l'elemento
            if (el.parentNode) {
              el.parentNode.removeChild(el);
              console.log(`Rimosso elemento '${testo}' (senza contenitore)`);
            }
          }
        }
      });
      
      // 2. Rimozione anche dai componenti di dialog aperti
      document.querySelectorAll('[role="dialog"], [aria-modal="true"], .mobile-menu, .sheet-content').forEach(dialog => {
        const links = dialog.querySelectorAll('a, button, [role="button"]');
        links.forEach(link => {
          const testo = (link.innerText || link.textContent || '').trim();
          if (testo === 'Appuntamenti' || testo === 'Questionari') {
            // Trova il contenitore più appropriato
            let contenitore = link;
            for (let i = 0; i < 3; i++) {
              if (contenitore.parentElement) {
                contenitore = contenitore.parentElement;
              }
            }
            
            if (contenitore && contenitore.parentNode) {
              contenitore.parentNode.removeChild(contenitore);
              console.log(`Rimosso elemento di dialogo '${testo}'`);
            }
          }
        });
      });
      
      // 3. Rimuovi anche elementi che vengono caricati dinamicamente con nomi tradotti
      const testiDaRimuovere = ['Appuntamenti', 'Questionari', 'Appointments', 'Surveys', 'Questionnaires'];
      document.querySelectorAll('[role="menuitem"], [class*="menu-item"]').forEach(item => {
        const testo = (item.innerText || item.textContent || '').trim();
        if (testiDaRimuovere.some(t => testo.includes(t))) {
          if (item.parentNode) {
            item.parentNode.removeChild(item);
          }
        }
      });
      
      // 4. Mostra statistiche in console solo se ci sono stati cambiamenti
      if (rimossiAppuntamenti > 0 || rimossiQuestionari > 0) {
        console.log(`Pulizia menu completata. Rimossi: ${rimossiAppuntamenti} 'Appuntamenti', ${rimossiQuestionari} 'Questionari'`);
      }
    } catch (error) {
      console.error('Errore durante la pulizia del menu:', error);
    }
  }
  
  // Esecuzione immediata
  pulisciMenuMobile();
  
  // Monitoring continuo (ogni 300ms) per catturare nuovi elementi che potrebbero essere aggiunti
  setInterval(pulisciMenuMobile, 300);
  
  // Osservatore per rilevare cambiamenti del DOM
  const observer = new MutationObserver(() => {
    pulisciMenuMobile();
  });
  
  // Osserva tutto il documento
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Assicurati che venga eseguito anche dopo il caricamento completo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pulisciMenuMobile);
  }
  
  // E quando la pagina è completamente caricata
  window.addEventListener('load', pulisciMenuMobile);
  
})();