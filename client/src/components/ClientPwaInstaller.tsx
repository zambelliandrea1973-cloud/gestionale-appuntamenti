import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Phone, Download, Check } from "lucide-react";
import { BeforeInstallPromptEvent } from '@/types/pwa';

// Questo componente è specifico per l'area cliente
export function ClientPwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  
  useEffect(() => {
    // Controlla se il dispositivo è iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);
    
    // Gestisce la registrazione del service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registrato con successo:', registration);
          })
          .catch(error => {
            console.error('Errore durante la registrazione del Service Worker:', error);
          });
      });
    }
    
    // Verifica se l'app è già installata
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsInstalled(isStandalone);
    
    // Per dispositivi non-iOS, cattura l'evento beforeinstallprompt
    if (!isIosDevice) {
      window.addEventListener('beforeinstallprompt', (e) => {
        // Previene la visualizzazione automatica del prompt
        e.preventDefault();
        // Salva l'evento per mostrarlo quando l'utente clicca sul pulsante
        setInstallPrompt(e as BeforeInstallPromptEvent);
      });
    }
    
    // Rileva se l'app è stata installata durante la sessione corrente
    window.addEventListener('appinstalled', () => {
      console.log('App Installata!');
      setIsInstalled(true);
      setInstallPrompt(null);
    });
  }, []);
  
  // Funzione per installare l'app
  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    
    await installPrompt.prompt();
    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('Utente ha accettato l\'installazione');
      setIsInstalled(true);
    } else {
      console.log('Utente ha rifiutato l\'installazione');
    }
    
    setInstallPrompt(null);
  };
  
  // Se l'app è già installata, mostra un messaggio di conferma
  if (isInstalled) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 my-4">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">App installata correttamente</span>
        </div>
        <p className="text-green-700 text-sm mt-1">Puoi accedere rapidamente all'app dalla home screen del tuo dispositivo.</p>
      </div>
    );
  }
  
  // Se è un dispositivo iOS, mostra le istruzioni per l'installazione manuale
  if (isIos) {
    return (
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 my-4">
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <Phone className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">Installa l'app sul tuo iPhone/iPad</span>
          </div>
          <ol className="list-decimal text-sm text-blue-700 ml-6 space-y-1">
            <li>Tocca l'icona di condivisione <span className="inline-block px-2 py-1 bg-gray-200 rounded">⎙</span> nella barra degli strumenti del browser</li>
            <li>Scorri verso il basso e tocca "<strong>Aggiungi a Home</strong>"</li>
            <li>Conferma toccando "<strong>Aggiungi</strong>"</li>
          </ol>
          <p className="text-blue-700 text-sm mt-2">Dopo averla installata, potrai accedere rapidamente alla tua area personale direttamente dalla home screen!</p>
        </div>
      </div>
    );
  }
  
  // Per dispositivi Android o altri, mostra il pulsante di installazione
  if (installPrompt) {
    return (
      <div className="rounded-lg bg-primary-50 border border-primary-200 p-4 my-4">
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <Download className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary-900 font-medium">Installa l'app sul tuo dispositivo</span>
          </div>
          <p className="text-primary-700 text-sm mb-3">
            Installa quest'app per accedere rapidamente alla tua area personale direttamente dalla home screen del tuo dispositivo!
          </p>
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Installa l'App
          </Button>
        </div>
      </div>
    );
  }
  
  // Se non è possibile installare l'app in questo momento (forse perché è già installata o per altri motivi), non mostrare nulla
  return null;
}