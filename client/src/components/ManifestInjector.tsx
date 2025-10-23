import { useEffect } from 'react';
import { useUserWithLicense } from '@/hooks/use-user-with-license';
import { useLocation } from 'wouter';

/**
 * Componente che inietta dinamicamente il manifest PWA DOPO il login
 * per garantire che l'icona personalizzata del professionista venga caricata correttamente.
 * 
 * PROBLEMA RISOLTO: Il browser richiedeva il manifest prima del login,
 * causando il caricamento dell'icona di default anche dopo l'autenticazione.
 */
export function ManifestInjector() {
  const { user, isLoading } = useUserWithLicense();
  const [location] = useLocation();
  
  useEffect(() => {
    // Attendi che il caricamento sia completato
    if (isLoading) {
      return;
    }
    
    // Verifica se siamo nell'area cliente o admin
    const isClientArea = location.startsWith('/client/') || 
                         window.location.pathname.includes('/client/PROF_');
    
    console.log('📱 [MANIFEST INJECTOR] Inizializzazione:', {
      isClientArea,
      userLogged: !!user,
      location
    });
    
    // Rimuovi manifest precedenti per evitare duplicati
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach(link => link.remove());
    
    let manifestUrl: string | null = null;
    
    if (isClientArea) {
      // AREA CLIENTE: Estrai ownerId dal path
      const pathMatch = window.location.pathname.match(/\/client\/(PROF_(\d{2,3})_[A-F0-9]+)/);
      let ownerId: string | null = null;
      
      if (pathMatch) {
        const clientToken = pathMatch[1];
        ownerId = pathMatch[2];
        manifestUrl = `/manifest.json?v=${Date.now()}&ownerId=${ownerId}&clientToken=${clientToken}`;
        console.log('📱 [MANIFEST INJECTOR] Area cliente, token:', clientToken);
      } else {
        // Fallback generico per area cliente
        manifestUrl = `/manifest.json?v=${Date.now()}`;
        console.log('📱 [MANIFEST INJECTOR] Area cliente, fallback generico');
      }
      
    } else if (user) {
      // GESTIONALE ADMIN: Solo se utente è loggato!
      manifestUrl = `/manifest-admin.json?ts=${Date.now()}`;
      console.log('📱 [MANIFEST INJECTOR] Dashboard admin, utente loggato:', user.id);
    } else {
      // Utente NON loggato sulla dashboard → NON aggiungere manifest
      // (evita di caricare icona default prima del login)
      console.log('📱 [MANIFEST INJECTOR] Dashboard senza login, manifest NON aggiunto');
      return;
    }
    
    // Aggiungi il manifest solo se abbiamo un URL valido
    if (manifestUrl) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestUrl;
      manifestLink.id = 'dynamic-manifest';
      document.head.appendChild(manifestLink);
      
      console.log('✅ [MANIFEST INJECTOR] Manifest aggiunto:', manifestUrl);
    }
    
    // Cleanup: rimuovi manifest quando il componente si smonta
    return () => {
      const dynamicManifest = document.getElementById('dynamic-manifest');
      if (dynamicManifest) {
        dynamicManifest.remove();
        console.log('🧹 [MANIFEST INJECTOR] Manifest rimosso');
      }
    };
    
  }, [user, isLoading, location]);
  
  // Componente invisibile - solo logica
  return null;
}
