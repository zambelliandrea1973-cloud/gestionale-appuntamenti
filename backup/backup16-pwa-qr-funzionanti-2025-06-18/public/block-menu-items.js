// Script per rimuovere permanentemente i link problematici - v1.0.0
(function() {
  function removeProblematicLinks() {
    // Lista di selettori per trovare i link indesiderati ovunque
    const selectors = [
      'a[href="/surveys"]',
      'a[href="/appointments"]',
      'a[href*="/surveys"]',
      'a[href*="/appointments"]',
      'a[href="/questionnaires"]',
      'a[href*="/questionnaires"]',
      'button[data-survey-link="true"]',
      'button[data-appointment-link="true"]',
      '*[data-mobile-hidden="true"]'
    ];
    
    // Rimuovi tutti gli elementi che corrispondono ai selettori
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.remove();
      });
    });
    
    // Ricerca più aggressiva basata sul testo contenuto
    const problematicTerms = ['Questionari', 'Appuntamenti'];
    document.querySelectorAll('a, button, div, span').forEach(el => {
      if (el.textContent && problematicTerms.some(term => el.textContent.includes(term))) {
        const shouldSkip = 
          el.closest('[data-title="calendar"]') || 
          el.closest('.text-lg.flex.items-center') || 
          el.tagName === 'TITLE';
          
        if (!shouldSkip) {
          el.remove();
        }
      }
    });
  }
  
  // Esegui subito e poi periodicamente
  removeProblematicLinks();
  setInterval(removeProblematicLinks, 1000);
  
  // Intercetta anche i nuovi elementi aggiunti al DOM
  const observer = new MutationObserver(mutations => {
    removeProblematicLinks();
  });
  
  // Osserva il DOM per nuovi elementi
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();