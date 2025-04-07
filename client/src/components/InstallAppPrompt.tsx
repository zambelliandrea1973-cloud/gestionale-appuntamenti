import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, Check } from 'lucide-react';
import { BeforeInstallPromptEvent } from '@/types/pwa';

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Registra il service worker
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

    // Check if it's iOS
    const ua = window.navigator.userAgent;
    const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the prompt to the user
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app is already installed
    // The 'display-mode' media query helps identify if the app is running in standalone mode
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    if (isAppInstalled) {
      setIsInstalled(true);
      setShowPrompt(false);
    }

    // Rileva l'installazione dell'app durante la sessione corrente
    window.addEventListener('appinstalled', () => {
      console.log('App installata con successo!');
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We no longer need the prompt regardless of outcome
    setDeferredPrompt(null);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
  };

  // Se l'app è già installata, mostra un messaggio di conferma
  if (isInstalled) {
    return (
      <div className="w-full max-w-md mx-auto mt-4 mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">App installata correttamente</span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Puoi accedere rapidamente alla tua area personale dalla home screen del tuo dispositivo.
        </p>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <Card className="w-full max-w-md mx-auto mt-4 mb-6 shadow-md">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2" 
          onClick={dismissPrompt}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle>Installa l'App</CardTitle>
        <CardDescription>
          Aggiungi questa app alla schermata home per un accesso più rapido
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isIOS ? (
          <div className="space-y-3">
            <p className="text-sm">Per installare l'app su iOS:</p>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>Tocca l'icona di condivisione <span className="inline-block px-2 py-1 rounded bg-gray-100">📤</span> in Safari</li>
              <li>Scorri verso il basso e tocca <strong>Aggiungi a Home</strong></li>
              <li>Tocca <strong>Aggiungi</strong> in alto a destra</li>
            </ol>
          </div>
        ) : (
          <p className="text-sm">
            Installa l'app sul tuo dispositivo per accedere più facilmente ai tuoi appuntamenti e dati personali, anche offline.
          </p>
        )}
      </CardContent>
      <CardFooter>
        {!isIOS && (
          <Button onClick={handleInstallClick} className="w-full flex items-center justify-center">
            <Download className="mr-2 h-4 w-4" />
            Installa App
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}