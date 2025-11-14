/**
 * Script di riavvio dell'applicazione per modalità di hosting con nginx
 * 
 * Questo script può essere inserito in una pagina di errore personalizzata di nginx
 * per permettere il riavvio dell'applicazione anche quando è completamente offline.
 * 
 * Usare questo codice nella configurazione nginx:
 * 
 * server {
 *   ...
 *   error_page 502 503 504 /502.html;
 *   location = /502.html {
 *     root /path/to/public;
 *     internal;
 *   }
 *   ...
 * }
 */

// Funzione per riavviare l'applicazione tramite API di emergenza
async function restartApp() {
  const appUrl = window.location.origin;
  const emergencyRestartUrl = `${appUrl}/api/admin/emergency-restart?key=gironico-restart-2025`;
  
  try {
    // Invia la richiesta di riavvio con fetch
    const response = await fetch(emergencyRestartUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Riavvio avviato con successo!'
      };
    } else {
      // Anche se la risposta non è ok, potrebbe essere che l'app stia già riavviando
      return {
        success: true,
        message: 'Riavvio in corso...'
      };
    }
  } catch (error) {
    // Se c'è un errore, probabilmente il server è completamente offline
    
    // Tenta di utilizzare XMLHttpRequest come fallback
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', emergencyRestartUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              message: data.message || 'Riavvio avviato con successo!'
            });
          } catch (e) {
            resolve({
              success: true,
              message: 'Riavvio in corso...'
            });
          }
        } else {
          resolve({
            success: true,
            message: 'Riavvio in corso...'
          });
        }
      };
      
      xhr.onerror = function() {
        // Anche in caso di errore, assumiamo che il riavvio possa essere in corso
        resolve({
          success: true,
          message: 'Riavvio in corso...'
        });
      };
      
      xhr.send();
    });
  }
}

// Funzione per avviare il conto alla rovescia
function startCountdown(seconds = 15, onComplete = null) {
  let remainingSeconds = seconds;
  
  const interval = setInterval(() => {
    remainingSeconds--;
    
    // Aggiorna il DOM se esiste un elemento per il conto alla rovescia
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
      countdownElement.textContent = remainingSeconds;
    }
    
    if (remainingSeconds <= 0) {
      clearInterval(interval);
      
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  }, 1000);
  
  return {
    cancel: () => clearInterval(interval),
    getRemainingSeconds: () => remainingSeconds
  };
}

// Esporta le funzioni per l'uso globale
window.restartApp = restartApp;
window.startCountdown = startCountdown;