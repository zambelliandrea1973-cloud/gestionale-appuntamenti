import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Componente speciale per gestire i lanci PWA
 * Recupera automaticamente il token QR salvato e reindirizza
 */
export default function PWALauncher() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("📱 [PWA LAUNCHER] Avvio PWA rilevato");
    
    // Controlla se abbiamo parametri URL con ownerId
    const urlParams = new URLSearchParams(window.location.search);
    const ownerIdFromQuery = urlParams.get('ownerId');
    
    // Cerca token salvato nel localStorage
    const savedToken = localStorage.getItem('client_qr_token');
    const savedClientId = localStorage.getItem('client_id');
    const savedOwnerId = localStorage.getItem('ownerId');
    
    console.log("📱 [PWA LAUNCHER] Dati salvati:", {
      token: savedToken ? "presente" : "assente",
      clientId: savedClientId,
      ownerId: savedOwnerId,
      ownerIdQuery: ownerIdFromQuery
    });
    
    if (savedToken && savedClientId) {
      // Abbiamo tutti i dati necessari - reindirizza all'area cliente
      console.log("📱 [PWA LAUNCHER] Token trovato, reindirizzo all'area cliente");
      
      // Usa il token come path per mantenere compatibilità
      const redirectPath = `/client/${savedToken}`;
      console.log("📱 [PWA LAUNCHER] Reindirizzamento a:", redirectPath);
      
      // Aggiorna la cronologia per rimuovere il parametro PWA
      window.history.replaceState({}, '', redirectPath);
      
      // Reindirizza utilizzando wouter
      setLocation(redirectPath);
      
    } else if (ownerIdFromQuery) {
      // Abbiamo solo l'ownerId, tenta recupero
      console.log("📱 [PWA LAUNCHER] Solo ownerId disponibile, tentativo recupero ultimo accesso");
      
      // Salva l'ownerId per future riferimenti
      localStorage.setItem('ownerId', ownerIdFromQuery);
      
      // Reindirizza all'area cliente normale per tentare il recupero
      setLocation('/client');
      
    } else {
      // Nessun dato - reindirizza all'area cliente per messaggio informativo
      console.log("📱 [PWA LAUNCHER] Nessun dato salvato, reindirizzo per messaggio QR");
      setLocation('/client');
    }
  }, [setLocation]);

  // Mostra schermata di caricamento durante il reindirizzamento
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Avvio Area Cliente
        </h2>
        <p className="text-gray-600">
          Caricamento in corso...
        </p>
      </div>
    </div>
  );
}