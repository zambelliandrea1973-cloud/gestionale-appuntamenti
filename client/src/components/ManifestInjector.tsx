// @ts-nocheck
import { useEffect } from 'react';
import { useUserWithLicense } from '@/hooks/use-user-with-license';
import { useLocation } from 'wouter';

function updateFavicon(ownerId: string | number) {
  const faviconUrl = `/pwa-icon/32x32?owner=${ownerId}&ts=${Date.now()}`;
  const largeIconUrl = `/pwa-icon/96x96?owner=${ownerId}&ts=${Date.now()}`;

  const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
  existingFavicons.forEach(link => link.remove());

  const favicon32 = document.createElement('link');
  favicon32.rel = 'icon';
  favicon32.type = 'image/png';
  (favicon32 as any).sizes = '32x32';
  favicon32.href = faviconUrl;
  favicon32.id = 'dynamic-favicon-32';
  document.head.appendChild(favicon32);

  const favicon96 = document.createElement('link');
  favicon96.rel = 'icon';
  favicon96.type = 'image/png';
  (favicon96 as any).sizes = '96x96';
  favicon96.href = largeIconUrl;
  favicon96.id = 'dynamic-favicon-96';
  document.head.appendChild(favicon96);

  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.href = faviconUrl;
  shortcut.id = 'dynamic-shortcut-icon';
  document.head.appendChild(shortcut);

  const existingApple = document.querySelectorAll('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]');
  existingApple.forEach(link => link.remove());

  const appleIcon = document.createElement('link');
  appleIcon.rel = 'apple-touch-icon';
  (appleIcon as any).sizes = '192x192';
  appleIcon.href = `/pwa-icon/192x192?owner=${ownerId}&ts=${Date.now()}`;
  appleIcon.id = 'dynamic-apple-icon';
  document.head.appendChild(appleIcon);
}

export function ManifestInjector() {
  const { user, isLoading } = useUserWithLicense();
  const [location] = useLocation();
  
  useEffect(() => {
    if (isLoading) {
      return;
    }
    
    const isClientArea = location.startsWith('/client/') || 
                         window.location.pathname.includes('/client/PROF_');
    
    console.log('[MANIFEST INJECTOR] Inizializzazione:', {
      isClientArea,
      userLogged: !!user,
      location
    });
    
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach(link => link.remove());
    
    let manifestUrl: string | null = null;
    let iconOwnerId: string | number | null = null;
    
    if (isClientArea) {
      const pathMatch = window.location.pathname.match(/\/client\/([^/?]+)/);
      
      if (pathMatch) {
        const clientToken = pathMatch[1];
        const ownerIdMatch = clientToken.match(/^PROF_(\d{2,3})_/);
        if (ownerIdMatch) {
          iconOwnerId = ownerIdMatch[1];
        }
        manifestUrl = `/manifest.json?v=${Date.now()}&ownerId=${iconOwnerId}&clientToken=${clientToken}`;
      } else {
        manifestUrl = `/manifest.json?v=${Date.now()}`;
      }
      
    } else if (user) {
      iconOwnerId = user.id;
      manifestUrl = `/manifest-admin.json?userId=${user.id}&ts=${Date.now()}`;
    } else {
      console.log('[MANIFEST INJECTOR] Dashboard senza login, manifest NON aggiunto');
      return;
    }
    
    if (iconOwnerId) {
      updateFavicon(iconOwnerId);
    }
    
    if (manifestUrl) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestUrl;
      manifestLink.id = 'dynamic-manifest';
      document.head.appendChild(manifestLink);
    }
    
    return () => {
      document.getElementById('dynamic-manifest')?.remove();
      document.getElementById('dynamic-favicon-32')?.remove();
      document.getElementById('dynamic-favicon-96')?.remove();
      document.getElementById('dynamic-shortcut-icon')?.remove();
      document.getElementById('dynamic-apple-icon')?.remove();

      if (!document.querySelector('link[rel="icon"]')) {
        const defaultFavicon = document.createElement('link');
        defaultFavicon.rel = 'icon';
        defaultFavicon.type = 'image/png';
        defaultFavicon.href = '/icons/icon-96x96.png';
        document.head.appendChild(defaultFavicon);

        const defaultShortcut = document.createElement('link');
        defaultShortcut.rel = 'shortcut icon';
        defaultShortcut.href = '/icons/icon-96x96.png';
        document.head.appendChild(defaultShortcut);
      }
    };
    
  }, [user, isLoading, location]);
  
  return null;
}
