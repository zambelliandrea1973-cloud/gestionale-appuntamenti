import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

declare global {
  interface Window {
    __installPromptEvent?: BeforeInstallPromptEvent;
    __pwaInstallEventAttached?: boolean;
    __pwaIsInstalled?: boolean;
  }
}

export function PwaInstallButton() {
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isReadyToInstall, setIsReadyToInstall] = useState<boolean>(false);

  useEffect(() => {
    // Verifica se PWA è già installata
    if (window.__pwaIsInstalled) {
      setIsInstalled(true);
    }

    // Verifica se il dispositivo è standalone (già installato come PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      window.__pwaIsInstalled = true;
    }

    // Verifica se esiste già un evento di installazione
    if (window.__installPromptEvent) {
      setInstallPrompt(window.__installPromptEvent);
      setIsReadyToInstall(true);
    }

    // Listener per gli eventi futuri
    const handleBeforeInstallPrompt = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent;
      
      // Previeni il comportamento di default
      e.preventDefault();
      
      // Salva l'evento per uso futuro
      window.__installPromptEvent = promptEvent;
      setInstallPrompt(promptEvent);
      setIsReadyToInstall(true);
    };

    // Listener per rilevare se l'app è installata
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsReadyToInstall(false);
      window.__pwaIsInstalled = true;
      
      toast({
        title: "App installata",
        description: "L'applicazione è stata installata con successo sul tuo dispositivo.",
        variant: "default",
      });
    };

    // Listener per quando il componente viene montato
    const handlePwaInstallReady = () => {
      if (window.__installPromptEvent) {
        setInstallPrompt(window.__installPromptEvent);
        setIsReadyToInstall(true);
      }
    };

    // Registra gli eventi
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwaInstallReady', handlePwaInstallReady);

    // Ripulisci al dismontaggio
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwaInstallReady', handlePwaInstallReady);
    };
  }, [toast]);

  // Funzione per installare l'app
  const handleInstallClick = async () => {
    if (!installPrompt) {
      // Se non abbiamo un installPrompt, dobbiamo fornire istruzioni per l'installazione manuale
      // basate sul sistema operativo e sul browser
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isDuckDuckGo = /DuckDuckGo/.test(navigator.userAgent);
      
      let instructions = "";
      
      if (isIOS && isSafari) {
        instructions = "Premi l'icona 'Condividi' (il quadrato con la freccia in alto) e seleziona 'Aggiungi alla schermata Home'";
      } else if (isIOS) {
        instructions = "Apri l'app in Safari, premi l'icona 'Condividi' e seleziona 'Aggiungi alla schermata Home'";
      } else if (isAndroid && isChrome) {
        instructions = "Premi i tre puntini in alto a destra e seleziona 'Aggiungi a schermata Home'";
      } else if (isAndroid && isDuckDuckGo) {
        instructions = "Apri questa pagina in Chrome, quindi premi i tre puntini in alto a destra e seleziona 'Aggiungi a schermata Home'";
      } else {
        instructions = "Visita questa pagina utilizzando Chrome o Safari e premi 'Installa app sul dispositivo'";
      }
      
      toast({
        title: "Installazione manuale richiesta",
        description: instructions,
        duration: 7000,
      });
      
      return;
    }

    try {
      // Mostra il prompt di installazione
      await installPrompt.prompt();
      
      // Attendi la scelta dell'utente
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        window.__pwaIsInstalled = true;
        
        toast({
          title: "Installazione in corso",
          description: "L'applicazione sta per essere installata sul tuo dispositivo.",
          variant: "default",
        });
      } 
      
      // Rimuovi l'evento di installazione, può essere usato solo una volta
      setInstallPrompt(null);
      window.__installPromptEvent = undefined;
    } catch (error) {
      console.error("Errore durante l'installazione dell'app:", error);
      toast({
        title: "Errore di installazione",
        description: "Si è verificato un errore durante l'installazione dell'app.",
        variant: "destructive",
      });
    }
  };

  // Mostro sempre il pulsante, anche se non possiamo rilevare il supporto PWA
  // Su iOS questo viene rilevato in modo diverso
  return (
    <Card className="mb-6 border-dashed border-primary/50 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Smartphone className="mr-2 h-5 w-5" />
          {isInstalled ? "App Installata" : "Installa App sul Dispositivo"}
        </CardTitle>
        <CardDescription>
          {isInstalled 
            ? "Hai già installato l'app sul tuo dispositivo" 
            : "Installa l'app per un accesso più rapido e funzionalità offline"}
        </CardDescription>
      </CardHeader>
      
      {!isInstalled && (
        <CardContent>
          <p className="text-sm mb-2">
            L'icona dell'app verrà aggiunta alla schermata principale del tuo dispositivo, 
            permettendoti di accedere direttamente all'area cliente senza dover utilizzare il browser.
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Accesso con un solo tocco</li>
            <li>Funziona anche offline</li>
            <li>Nessuna app da scaricare dagli store</li>
            <li>Occupazione minima della memoria</li>
          </ul>
        </CardContent>
      )}
      
      <CardFooter>
        {isInstalled ? (
          <div className="w-full flex items-center justify-center text-green-600">
            <Check className="h-5 w-5 mr-2" />
            <span>App installata sul dispositivo</span>
          </div>
        ) : (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleInstallClick}
            variant="default"
          >
            <Download className="mr-2 h-4 w-4" />
            Installa App sul Dispositivo
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}