import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Phone, Download, Check, X } from "lucide-react";
import { BeforeInstallPromptEvent } from '@/types/pwa';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "./ui/dialog";

// Componente semplificato con due pulsanti distinti per Android e iOS
export function ClientPwaInstaller() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosDialog, setShowIosDialog] = useState(false);
  
  useEffect(() => {
    // Controlla se il dispositivo è iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);
    
    // Registra il service worker immediatamente
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js', {
        updateViaCache: 'none' // FORZA reload del SW, non usa cache HTTP
      })
        .then(async registration => {
          // Forza update immediato a v2 (corretto)
          await registration.update();
          console.log('Service Worker v2 registered:', registration);
        })
        .catch(error => {
          console.error('Error registering Service Worker:', error);
        });
    }
    
    // Verifica se l'app è già installata
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
    
    // Controllo immediato se esiste già un evento di installazione salvato
    if ((window as any).__installPromptEvent) {
      setInstallPrompt((window as any).__installPromptEvent);
    }
    
    // Per dispositivi non-iOS, cattura l'evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('ClientPwaInstaller: beforeinstallprompt captured');
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      // Salva anche nella window per condivisione tra componenti
      (window as any).__installPromptEvent = promptEvent;
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Rileva se l'app è stata installata durante la sessione corrente
    const handleAppInstalled = () => {
      console.log('App Installed!');
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Monitora il display mode
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleDisplayModeChange);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);
  
  // Funzione per installare l'app su Android
  const handleAndroidInstall = async () => {
    if (!installPrompt) {
      console.log('No installation prompt available');
      return;
    }
    
    try {
      // Mostra il prompt di installazione
      await installPrompt.prompt();
      
      // Attendi la scelta dell'utente
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted installation');
        setIsInstalled(true);
      } else {
        console.log('User declined installation');
      }
      
      // Resetta il prompt indipendentemente dall'esito
      setInstallPrompt(null);
      (window as any).__installPromptEvent = null;
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };
  
  // Se l'app è già installata, mostra un messaggio di conferma
  if (isInstalled) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 my-4">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">{t('i18nFinale.clientPwaInstaller.appInstalledCorrectly')}</span>
        </div>
        <p className="text-green-700 text-sm mt-1">{t('i18nFinale.clientPwaInstaller.alreadyInstalledHint')}</p>
      </div>
    );
  }
  
  // Mostra due pulsanti distinti per Android e iOS
  return (
    <div className="rounded-lg bg-primary-50 border border-primary-200 p-4 my-4">
      <h3 className="font-medium text-center mb-4">{t('i18nFinale.clientPwaInstaller.installAppOnDevice')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pulsante per Android */}
        <div className="rounded-lg bg-white p-3 border border-gray-200 flex flex-col">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.34c-.5.51-1.002.82-1.503 1.13l.964 1.66c.073.14.018.31-.123.39-.14.08-.31.03-.383-.09l-.97-1.68c-.5.19-1.043.32-1.64.32s-1.14-.13-1.64-.32l-.97 1.68c-.073.12-.243.17-.383.09-.14-.08-.196-.25-.123-.39l.964-1.66c-.5-.31-1.002-.62-1.503-1.13l-1.523 2.65c-.394.68.218 1.52.974 1.52h7.437c.756 0 1.368-.84.974-1.52l-1.523-2.65zm-2.956-10.2h-5.136v.96h5.137v-.96zm1.024 2.1c-.25 0-.46.21-.46.46 0 .26.2.47.46.47s.46-.21.46-.46c0-.26-.21-.47-.46-.47zm-7.365-2.1c-.55 0-1.02.47-1.02 1.02v1.3l-3.026 4.35c-.845 1.34.147 3.1 1.688 3.1l.92-.18c-.057-.34-.087-.69-.087-1.04 0-1.85.87-3.51 2.227-4.58l.052-.08v-3.87h-.754zm5.183 5.53c-2.964 0-5.37 2.41-5.37 5.37s2.406 5.37 5.37 5.37 5.37-2.41 5.37-5.37-2.406-5.37-5.37-5.37zm-.96-7.53h-5.136v.96h5.137v-.96zm6.177 4.52l-3.026-4.35v-1.3c0-.55-.47-1.02-1.018-1.02h-.754v3.87l.052.08c1.357 1.07 2.227 2.73 2.227 4.58 0 .35-.03.7-.086 1.04l.92.18c1.54 0 2.532-1.76 1.686-3.1z" />
            </svg>
            <span className="font-medium">Android</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {t('i18nFinale.clientPwaInstaller.androidInstallTap')}
          </p>
          <Button 
            onClick={handleAndroidInstall} 
            className="w-full mt-auto bg-green-600 hover:bg-green-700"
            disabled={!installPrompt}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('i18nFinale.clientPwaInstaller.installOnAndroid')}
          </Button>
        </div>
        
        {/* Pulsante per iOS */}
        <div className="rounded-lg bg-white p-3 border border-gray-200 flex flex-col">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.462 16.927s-1.083 1.481-2.543 1.481c-1.35 0-1.813-.968-3.49-.968-1.595 0-2.124.935-3.43.935-1.35 0-2.377-1.342-3.49-2.672-1.907-2.274-2.09-6.27-.913-8.063 1.125-1.714 2.833-1.714 3.8-1.714.968 0 1.796.622 2.764.622 1.083 0 1.706-.622 2.93-.622 1.05 0 2.46.39 3.317 1.652-2.9 1.683-2.434 6.044.055 9.35zm-5.258-14.911c-.881 1.09-2.182 1.909-3.49 1.792-.156-1.42.51-2.869 1.35-3.798.881-.968 2.4-1.714 3.63-1.792.132 1.518-.49 2.903-1.49 3.798z"/>
            </svg>
            <span className="font-medium">iOS</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('i18nFinale.clientPwaInstaller.tapShareInSafari')}</li>
              <li>{t('i18nFinale.clientPwaInstaller.selectAddToHome')}</li>
            </ol>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                className="w-full mt-auto bg-blue-600 hover:bg-blue-700"
                variant="default"
              >
                <Phone className="mr-2 h-4 w-4" />
                {t('i18nFinale.clientPwaInstaller.seeIosInstructions')}
              </Button>
            </DialogTrigger>
            <DialogContent className="min-[1200px]:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('i18nFinale.clientPwaInstaller.iosInstallTitle')}</DialogTitle>
                <DialogDescription>
                  {t('i18nFinale.clientPwaInstaller.iosStepsIntro')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">{t('i18nFinale.clientPwaInstaller.important')}</h3>
                  <p className="text-sm text-blue-700">
                    {t('i18nFinale.clientPwaInstaller.iosUseSafari')}
                  </p>
                </div>
                
                <ol className="space-y-4">
                  <li className="flex">
                    <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-800 font-bold mr-3 flex-shrink-0">1</div>
                    <div>
                      <p className="font-medium">{t('i18nFinale.clientPwaInstaller.tapShareIcon')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('i18nFinale.clientPwaInstaller.iosShareLocation')}
                      </p>
                      <div className="mt-2 bg-gray-100 p-3 rounded flex justify-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex">
                    <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-800 font-bold mr-3 flex-shrink-0">2</div>
                    <div>
                      <p className="font-medium">{t('i18nFinale.clientPwaInstaller.iosScrollAddHome')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('i18nFinale.clientPwaInstaller.iosScrollOptions')}
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex">
                    <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-800 font-bold mr-3 flex-shrink-0">3</div>
                    <div>
                      <p className="font-medium">{t('i18nFinale.clientPwaInstaller.tapAddTopRight')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('i18nFinale.clientPwaInstaller.iosCanRename')}
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex">
                    <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-800 font-bold mr-3 flex-shrink-0">4</div>
                    <div>
                      <p className="font-medium">{t('i18nFinale.clientPwaInstaller.done')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('i18nFinale.clientPwaInstaller.iosAppOnHome')}
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline">{t('i18nFinale.clientPwaInstaller.closeButton')}</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <p className="text-xs text-center mt-3 text-gray-500">
        {t('i18nFinale.clientPwaInstaller.browserNote')}
      </p>
    </div>
  );
}