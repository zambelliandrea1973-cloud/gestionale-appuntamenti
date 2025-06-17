import { useEffect } from "react";

export default function ActivateAccount() {
  useEffect(() => {
    // REDIRECT IMMEDIATO E TRASPARENTE - Zero interfacce
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const clientIdFromUrl = params.get("clientId");
    
    if (tokenFromUrl) {
      // Salva token per PWA
      localStorage.setItem('clientAccessToken', tokenFromUrl);
      if (clientIdFromUrl) {
        localStorage.setItem('clientId', clientIdFromUrl);
      }
      
      // REDIRECT IMMEDIATO
      window.location.href = `/client-area?token=${tokenFromUrl}&clientId=${clientIdFromUrl || ''}&autoLogin=true`;
      return;
    }
    
    // Nessun token - redirect alla client area comunque
    window.location.href = "/client-area";
  }, []);

  // Pagina completamente trasparente - nessuna interfaccia
  return null;
}