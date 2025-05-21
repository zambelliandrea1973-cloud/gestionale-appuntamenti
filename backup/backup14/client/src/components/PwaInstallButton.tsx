import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, ExternalLink, Chrome, Share, Globe } from 'lucide-react';
import { FaFirefox } from 'react-icons/fa';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogInstructions, setDialogInstructions] = useState<{
    title: string;
    steps: string[];
    browser: string;
    alternativeInstructions?: string[];
  } | null>(null);

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
    
    // Gestione dell'evento personalizzato per mostrare le istruzioni
    const handleShowPwaInstructions = (event: Event) => {
      showInstallInstructions();
    };

    // Registra gli eventi
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwaInstallReady', handlePwaInstallReady);
    window.addEventListener('showPwaInstructions', handleShowPwaInstructions);

    // Ripulisci al dismontaggio
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwaInstallReady', handlePwaInstallReady);
      window.removeEventListener('showPwaInstructions', handleShowPwaInstructions);
    };
  }, [toast]);

  // Funzione per mostrare istruzioni dettagliate in un Dialog
  const showInstallInstructions = () => {
    // Log dello user agent per debug
    console.log("User Agent:", navigator.userAgent);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent) && !/DuckDuckGo/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/DuckDuckGo/.test(navigator.userAgent);
    const isDuckDuckGo = /DuckDuckGo/.test(navigator.userAgent);
    
    // Log delle variabili di rilevamento del browser per debug
    console.log("Browser detection:", { isIOS, isAndroid, isChrome, isSafari, isDuckDuckGo });
    
    if (isIOS && isSafari) {
      setDialogInstructions({
        title: "Installazione su iOS con Safari",
        browser: "safari",
        steps: [
          "Premi l'icona 'Condividi' (il quadrato con la freccia in alto)",
          "Scorri verso il basso e seleziona 'Aggiungi alla schermata Home'",
          "Conferma premendo 'Aggiungi' nell'angolo in alto a destra"
        ]
      });
    } else if (isIOS) {
      setDialogInstructions({
        title: "Installazione su iOS",
        browser: "non-safari",
        steps: [
          "Copia l'URL di questa pagina",
          "Apri Safari",
          "Incolla l'URL nella barra degli indirizzi e visita la pagina",
          "Premi l'icona 'Condividi' e seleziona 'Aggiungi alla schermata Home'"
        ]
      });
    } else if (isAndroid && isChrome) {
      setDialogInstructions({
        title: "Installazione su Android con Chrome",
        browser: "chrome",
        steps: [
          "Premi i tre puntini in alto a destra",
          "Seleziona 'Aggiungi a schermata Home'",
          "Conferma premendo 'Aggiungi'"
        ]
      });
    } else if (isAndroid && isDuckDuckGo) {
      setDialogInstructions({
        title: "Installazione su Android con DuckDuckGo",
        browser: "duckduckgo",
        steps: [
          "Premi i tre puntini in alto a destra",
          "Seleziona 'Condividi'",
          "Scegli 'Chrome' dall'elenco delle app",
          "Chrome aprirà il sito e visualizzerà un banner di installazione PWA",
          "Premi 'Installa' nel banner di Chrome per completare l'installazione"
        ],
        alternativeInstructions: [
          "DuckDuckGo non supporta direttamente l'installazione PWA",
          "Il metodo più affidabile è condividere il sito con Chrome",
          "In Chrome l'installazione PWA è supportata nativamente"
        ]
      });
    } else {
      setDialogInstructions({
        title: "Installazione manuale",
        browser: "altro",
        steps: [
          "Visita questa pagina utilizzando Google Chrome",
          "Premi il pulsante 'Installa app sul dispositivo'",
          "Segui le istruzioni visualizzate"
        ]
      });
    }
    
    setOpenDialog(true);
  };

  // Stato per il popup di selezione del browser
  const [showBrowserSelector, setShowBrowserSelector] = useState(false);
  
  // Funzione per gestire la selezione del browser
  const handleBrowserSelection = (browserType: string) => {
    setShowBrowserSelector(false);
    
    // In base al browser selezionato, mostriamo le istruzioni appropriate
    switch(browserType) {
      case 'chrome':
        setDialogInstructions({
          title: "Installazione con Google Chrome",
          browser: "chrome",
          steps: [
            "Premi i tre puntini in alto a destra",
            "Seleziona 'Aggiungi a schermata Home' o 'Installa app'",
            "Conferma premendo 'Aggiungi' o 'Installa'"
          ]
        });
        break;
      case 'safari':
        setDialogInstructions({
          title: "Installazione con Safari",
          browser: "safari",
          steps: [
            "Premi l'icona 'Condividi' (il quadrato con la freccia in alto)",
            "Scorri verso il basso e seleziona 'Aggiungi alla schermata Home'",
            "Conferma premendo 'Aggiungi' nell'angolo in alto a destra"
          ]
        });
        break;
      case 'duckduckgo':
        setDialogInstructions({
          title: "Installazione con DuckDuckGo",
          browser: "duckduckgo",
          steps: [
            "Premi i tre puntini in alto a destra",
            "Seleziona 'Condividi'",
            "Scegli 'Chrome' dall'elenco delle app",
            "Chrome aprirà il sito e visualizzerà un banner di installazione PWA",
            "Premi 'Installa' nel banner di Chrome per completare l'installazione"
          ],
          alternativeInstructions: [
            "DuckDuckGo non supporta direttamente l'installazione PWA",
            "Il metodo più affidabile è condividere il sito con Chrome",
            "In Chrome l'installazione PWA è supportata nativamente"
          ]
        });
        break;
      case 'samsung':
        setDialogInstructions({
          title: "Installazione con Samsung Internet",
          browser: "altro",
          steps: [
            "Premi i tre puntini in basso a destra",
            "Seleziona 'Aggiungi pagina a' e poi 'Schermata Home'",
            "Conferma premendo 'Aggiungi'"
          ]
        });
        break;
      case 'firefox':
        setDialogInstructions({
          title: "Installazione con Firefox",
          browser: "altro",
          steps: [
            "Premi i tre puntini in alto a destra",
            "Seleziona 'Installa' o 'Aggiungi a schermata principale'",
            "Se questa opzione non è disponibile, visita il sito con Chrome"
          ]
        });
        break;
      default:
        setDialogInstructions({
          title: "Installazione con altro browser",
          browser: "altro",
          steps: [
            "Per la migliore esperienza, visita questa pagina con Google Chrome",
            "In Chrome, premi sui tre puntini in alto a destra",
            "Seleziona 'Installa app' o 'Aggiungi a schermata Home'"
          ]
        });
        break;
    }
    
    setOpenDialog(true);
  };

  // Funzione per installare l'app
  const handleInstallClick = async () => {
    // Controlliamo esplicitamente se siamo su DuckDuckGo e forziamo le istruzioni specifiche
    if (/DuckDuckGo/.test(navigator.userAgent)) {
      console.log("DuckDuckGo rilevato, mostrando istruzioni specifiche");
      setDialogInstructions({
        title: "Installazione su Android con DuckDuckGo",
        browser: "duckduckgo",
        steps: [
          "Premi i tre puntini in alto a destra",
          "Seleziona 'Condividi'",
          "Scegli 'Chrome' dall'elenco delle app",
          "Chrome aprirà il sito e visualizzerà un banner di installazione PWA",
          "Premi 'Installa' nel banner di Chrome per completare l'installazione"
        ],
        alternativeInstructions: [
          "DuckDuckGo non supporta direttamente l'installazione PWA",
          "Il metodo più affidabile è condividere il sito con Chrome",
          "In Chrome l'installazione PWA è supportata nativamente"
        ]
      });
      setOpenDialog(true);
      return;
    }
    
    if (!installPrompt) {
      // Se non è possibile l'installazione automatica, mostriamo il selettore di browser
      setShowBrowserSelector(true);
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

  // Renderizza l'icona del browser appropriata
  const renderBrowserIcon = (browser: string) => {
    switch (browser) {
      case 'chrome':
        return <Chrome className="h-6 w-6 text-blue-600" />;
      case 'safari':
        return <Share className="h-6 w-6 text-blue-600" />;
      case 'duckduckgo':
        return <ExternalLink className="h-6 w-6 text-orange-600" />;
      case 'firefox':
        return <FaFirefox className="h-6 w-6 text-orange-500" />;
      case 'samsung':
        return <Globe className="h-6 w-6 text-blue-700" />;
      default:
        return <Smartphone className="h-6 w-6 text-gray-600" />;
    }
  };

  // Mostro sempre il pulsante, anche se non possiamo rilevare il supporto PWA
  // Su iOS questo viene rilevato in modo diverso
  // Determina il tipo di browser anche per il render principale
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent) && !/DuckDuckGo/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/DuckDuckGo/.test(navigator.userAgent);
  const isDuckDuckGo = /DuckDuckGo/.test(navigator.userAgent);
  
  // Log per debug
  console.log("Main detection - UA:", navigator.userAgent);
  console.log("Main detection result:", { isIOS, isAndroid, isChrome, isSafari, isDuckDuckGo });

  // Testo informativo specifico per browser
  const getBrowserSpecificNote = () => {
    if (isAndroid && isChrome) {
      return (
        <p className="text-sm text-blue-700">
          Utilizza Chrome per installare l'app facilmente, ti basterà premere "Installa App" e seguire le istruzioni.
        </p>
      );
    } else if (isAndroid && isDuckDuckGo) {
      return (
        <p className="text-sm text-blue-700">
          Stai usando DuckDuckGo. Dopo aver premuto "Installa App", ti guideremo con istruzioni specifiche per il tuo browser.
        </p>
      );
    } else if (isIOS && isSafari) {
      return (
        <p className="text-sm text-blue-700">
          Con Safari su iOS, segui le istruzioni dopo aver premuto "Installa App" per aggiungerla alla schermata Home.
        </p>
      );
    } else if (isIOS) {
      return (
        <p className="text-sm text-blue-700">
          Per installare l'app su iOS, ti consigliamo di utilizzare Safari. Ti forniremo istruzioni dettagliate dopo aver premuto "Installa App".
        </p>
      );
    } else {
      return (
        <p className="text-sm text-blue-700">
          L'installazione funziona meglio con Google Chrome. Segui le istruzioni dettagliate dopo aver premuto "Installa App".
        </p>
      );
    }
  };

  return (
    <>
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
            
            <div className="p-2 my-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-700 mb-1">
                Nota specifica per il tuo browser:
              </p>
              {getBrowserSpecificNote()}
            </div>
            
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

      {/* Dialog con il selettore del browser */}
      <Dialog open={showBrowserSelector} onOpenChange={setShowBrowserSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Seleziona il tuo browser
            </DialogTitle>
            <DialogDescription>
              Seleziona il browser che stai utilizzando per ricevere istruzioni personalizzate
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={() => handleBrowserSelection('chrome')}
            >
              <Chrome className="h-8 w-8 text-blue-600" />
              <span>Google Chrome</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={() => handleBrowserSelection('safari')}
            >
              <Share className="h-8 w-8 text-blue-600" />
              <span>Safari</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={() => handleBrowserSelection('duckduckgo')}
            >
              <ExternalLink className="h-8 w-8 text-orange-600" />
              <span>DuckDuckGo</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={() => handleBrowserSelection('samsung')}
            >
              <Globe className="h-8 w-8 text-blue-700" />
              <span>Samsung Internet</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={() => handleBrowserSelection('firefox')}
            >
              <FaFirefox className="h-8 w-8 text-orange-500" />
              <span>Firefox</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={() => handleBrowserSelection('other')}
            >
              <Smartphone className="h-8 w-8 text-gray-500" />
              <span>Altro</span>
            </Button>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowBrowserSelector(false)}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog con istruzioni dettagliate per l'installazione manuale */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogInstructions && renderBrowserIcon(dialogInstructions.browser)}
              {dialogInstructions?.title || "Istruzioni di installazione"}
            </DialogTitle>
            <DialogDescription>
              Segui questi passaggi per installare l'app sul tuo dispositivo
            </DialogDescription>
          </DialogHeader>
          
          {dialogInstructions && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <ol className="space-y-2 pl-4">
                  {dialogInstructions.steps.map((step, index) => (
                    <li key={index} className="text-sm">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              
              {/* Mostriamo istruzioni alternative per browser speciali come DuckDuckGo */}
              {dialogInstructions.alternativeInstructions && dialogInstructions.alternativeInstructions.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="font-medium text-amber-800 mb-2">Informazioni aggiuntive:</p>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc pl-5">
                    {dialogInstructions.alternativeInstructions.map((info, index) => (
                      <li key={index}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setOpenDialog(false)}
              className="w-full sm:w-auto"
            >
              Ho capito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}