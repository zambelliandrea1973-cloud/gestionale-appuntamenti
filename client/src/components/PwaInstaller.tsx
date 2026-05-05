import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Download, X } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "./ui/card";
import { BeforeInstallPromptEvent } from '@/types/pwa';

export function PwaInstaller() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  
  // Gestisce la registrazione del service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          // FORZA update a Service Worker v2 (corretto, non cacha API)
          const registration = await navigator.serviceWorker.register('/service-worker.js', {
            updateViaCache: 'none' // NON usare cache HTTP per il SW stesso
          });
          
          // Forza controllo immediato per aggiornamenti
          await registration.update();
          
          console.log('Service Worker v2 registered:', registration);
        } catch (error) {
          console.error('Service Worker registration error:', error);
        }
      });
    }
    
    // Cattura l'evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Previene la visualizzazione automatica del prompt
      e.preventDefault();
      // Salva l'evento per mostrarlo successivamente
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Mostra il banner di installazione personalizzato
      setShowBanner(true);
    });
    
    // Rileva se l'app è già installata
    window.addEventListener('appinstalled', () => {
      // L'app è stata installata
      console.log('App Installed!');
      // Nasconde il banner di installazione
      setShowBanner(false);
      // Resetta il prompt
      setInstallPrompt(null);
    });
  }, []);
  
  // Funzione per installare l'app
  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    
    // Mostra il prompt di installazione
    await installPrompt.prompt();
    
    // Attende la scelta dell'utente
    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted installation');
    } else {
      console.log('User declined installation');
    }
    
    // Resetta il riferimento al prompt
    setInstallPrompt(null);
  };
  
  // Nasconde il banner
  const dismissBanner = () => {
    setShowBanner(false);
  };
  
  // Se non c'è un prompt di installazione disponibile o se il banner non deve essere mostrato, non renderizza nulla
  if (!showBanner) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 left-0 right-0 mx-4 z-50">
      <Card className="border-primary/20 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{t('i18nFinale.pwaInstaller.installAppTitle')}</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={dismissBanner}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {t('i18nFinale.pwaInstaller.addToHomeForFaster')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="flex items-center text-sm text-muted-foreground">
            <ul className="list-disc ml-5 space-y-1">
              <li>{t('i18nFinale.pwaInstaller.quickAccessPersonal')}</li>
              <li>{t('i18nFinale.pwaInstaller.worksOffline')}</li>
              <li>{t('i18nFinale.pwaInstaller.automaticUpdates')}</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="pt-4">
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {t('i18nFinale.pwaInstaller.installAppTitle')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}