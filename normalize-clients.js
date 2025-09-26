// Script per normalizzare i codici clienti dal browser
fetch('/api/clients/normalize-codes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ NORMALIZZAZIONE COMPLETATA:', data);
  // Ricarica la pagina per vedere i nuovi codici
  setTimeout(() => window.location.reload(), 1000);
})
.catch(error => {
  console.error('❌ Errore normalizzazione:', error);
});
