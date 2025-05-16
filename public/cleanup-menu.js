// Soluzione radicale rimuovi voci di menu - v7.0.0
document.addEventListener('DOMContentLoaded', function() {
  function removeProblematicItems() {
    // Cerca tutti i possibili pulsanti nel menu mobile per testo
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      const buttonText = button.textContent || '';
      if (buttonText.includes('Questionari') || buttonText.includes('Appuntamenti')) {
        // Trova il genitore più vicino che potrebbe essere l'intero elemento di menu
        const menuItem = button.closest('a') || button.closest('div') || button.closest('li');
        if (menuItem) {
          menuItem.remove();
        } else {
          button.remove();
        }
      }
    });

    // Rimuovi anche qualsiasi link con testo problematico
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      const linkText = link.textContent || '';
      if (linkText.includes('Questionari') || linkText.includes('Appuntamenti')) {
        link.remove();
      }
    });
  }

  // Esegui all'avvio e ogni secondo
  removeProblematicItems();
  setInterval(removeProblematicItems, 1000);

  // Intercetta anche le modifiche al DOM
  const observer = new MutationObserver(() => {
    removeProblematicItems();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});