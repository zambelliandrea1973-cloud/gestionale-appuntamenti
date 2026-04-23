import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t("pwaInstall.installed"),
        description: t("pwaInstall.installedDesc"),
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
        title: t("pwaInstall.steps.iosSafari.title"),
        browser: "safari",
        steps: [
          t("pwaInstall.steps.iosSafari.step1"),
          t("pwaInstall.steps.iosSafari.step2"),
          t("pwaInstall.steps.iosSafari.step3")
        ]
      });
    } else if (isIOS) {
      setDialogInstructions({
        title: t("pwaInstall.steps.iosOther.title"),
        browser: "non-safari",
        steps: [
          t("pwaInstall.steps.iosOther.step1"),
          t("pwaInstall.steps.iosOther.step2"),
          t("pwaInstall.steps.iosOther.step3"),
          t("pwaInstall.steps.iosOther.step4")
        ]
      });
    } else if (isAndroid && isChrome) {
      setDialogInstructions({
        title: t("pwaInstall.steps.androidChrome.title"),
        browser: "chrome",
        steps: [
          t("pwaInstall.steps.androidChrome.step1"),
          t("pwaInstall.steps.androidChrome.step2"),
          t("pwaInstall.steps.androidChrome.step3")
        ]
      });
    } else if (isAndroid && isDuckDuckGo) {
      setDialogInstructions({
        title: t("pwaInstall.steps.androidDuckDuckGo.title"),
        browser: "duckduckgo",
        steps: [
          t("pwaInstall.steps.androidDuckDuckGo.step1"),
          t("pwaInstall.steps.androidDuckDuckGo.step2"),
          t("pwaInstall.steps.androidDuckDuckGo.step3"),
          t("pwaInstall.steps.androidDuckDuckGo.step4"),
          t("pwaInstall.steps.androidDuckDuckGo.step5")
        ],
        alternativeInstructions: [
          t("pwaInstall.steps.androidDuckDuckGo.alt1"),
          t("pwaInstall.steps.androidDuckDuckGo.alt2"),
          t("pwaInstall.steps.androidDuckDuckGo.alt3")
        ]
      });
    } else {
      setDialogInstructions({
        title: t("pwaInstall.steps.manual.title"),
        browser: "altro",
        steps: [
          t("pwaInstall.steps.manual.step1"),
          t("pwaInstall.steps.manual.step2"),
          t("pwaInstall.steps.manual.step3")
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
          title: t("pwaInstall.steps.chrome.title"),
          browser: "chrome",
          steps: [
            t("pwaInstall.steps.chrome.step1"),
            t("pwaInstall.steps.chrome.step2"),
            t("pwaInstall.steps.chrome.step3")
          ]
        });
        break;
      case 'safari':
        setDialogInstructions({
          title: t("pwaInstall.steps.safari.title"),
          browser: "safari",
          steps: [
            t("pwaInstall.steps.safari.step1"),
            t("pwaInstall.steps.safari.step2"),
            t("pwaInstall.steps.safari.step3")
          ]
        });
        break;
      case 'duckduckgo':
        setDialogInstructions({
          title: t("pwaInstall.steps.duckduckgo.title"),
          browser: "duckduckgo",
          steps: [
            t("pwaInstall.steps.duckduckgo.step1"),
            t("pwaInstall.steps.duckduckgo.step2"),
            t("pwaInstall.steps.duckduckgo.step3"),
            t("pwaInstall.steps.duckduckgo.step4"),
            t("pwaInstall.steps.duckduckgo.step5")
          ],
          alternativeInstructions: [
            t("pwaInstall.steps.duckduckgo.alt1"),
            t("pwaInstall.steps.duckduckgo.alt2"),
            t("pwaInstall.steps.duckduckgo.alt3")
          ]
        });
        break;
      case 'samsung':
        setDialogInstructions({
          title: t("pwaInstall.steps.samsung.title"),
          browser: "altro",
          steps: [
            t("pwaInstall.steps.samsung.step1"),
            t("pwaInstall.steps.samsung.step2"),
            t("pwaInstall.steps.samsung.step3")
          ]
        });
        break;
      case 'firefox':
        setDialogInstructions({
          title: t("pwaInstall.steps.firefox.title"),
          browser: "altro",
          steps: [
            t("pwaInstall.steps.firefox.step1"),
            t("pwaInstall.steps.firefox.step2"),
            t("pwaInstall.steps.firefox.step3")
          ]
        });
        break;
      default:
        setDialogInstructions({
          title: t("pwaInstall.steps.other.title"),
          browser: "altro",
          steps: [
            t("pwaInstall.steps.other.step1"),
            t("pwaInstall.steps.other.step2"),
            t("pwaInstall.steps.other.step3")
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
        title: t("pwaInstall.steps.androidDuckDuckGo.title"),
        browser: "duckduckgo",
        steps: [
          t("pwaInstall.steps.androidDuckDuckGo.step1"),
          t("pwaInstall.steps.androidDuckDuckGo.step2"),
          t("pwaInstall.steps.androidDuckDuckGo.step3"),
          t("pwaInstall.steps.androidDuckDuckGo.step4"),
          t("pwaInstall.steps.androidDuckDuckGo.step5")
        ],
        alternativeInstructions: [
          t("pwaInstall.steps.androidDuckDuckGo.alt1"),
          t("pwaInstall.steps.androidDuckDuckGo.alt2"),
          t("pwaInstall.steps.androidDuckDuckGo.alt3")
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
          title: t("pwaInstall.installing"),
          description: t("pwaInstall.installingDesc"),
          variant: "default",
        });
      } 
      
      // Rimuovi l'evento di installazione, può essere usato solo una volta
      setInstallPrompt(null);
      window.__installPromptEvent = undefined;
    } catch (error) {
      console.error("Error during app installation:", error);
      toast({
        title: t("pwaInstall.errorTitle"),
        description: t("pwaInstall.installError"),
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
    let noteKey: string;
    if (isAndroid && isChrome) noteKey = "pwaInstall.notes.androidChrome";
    else if (isAndroid && isDuckDuckGo) noteKey = "pwaInstall.notes.androidDuckDuckGo";
    else if (isIOS && isSafari) noteKey = "pwaInstall.notes.iosSafari";
    else if (isIOS) noteKey = "pwaInstall.notes.iosOther";
    else noteKey = "pwaInstall.notes.default";
    return <p className="text-sm text-blue-700">{t(noteKey)}</p>;
  };

  return (
    <>
      <Card className="mb-6 border-dashed border-primary/50 bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Smartphone className="mr-2 h-5 w-5" />
            {isInstalled ? t("pwaInstall.installed") : t("pwaInstall.cardTitle")}
          </CardTitle>
          <CardDescription>
            {isInstalled 
              ? t("pwaInstall.cardAlreadyDesc")
              : t("pwaInstall.cardDesc")}
          </CardDescription>
        </CardHeader>
        
        {!isInstalled && (
          <CardContent>
            <p className="text-sm mb-2">
              {t("pwaInstall.intro")}
            </p>
            
            <div className="p-2 my-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-700 mb-1">
                {t("pwaInstall.browserNote")}
              </p>
              {getBrowserSpecificNote()}
            </div>
            
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>{t("pwaInstall.feature1")}</li>
              <li>{t("pwaInstall.feature2")}</li>
              <li>{t("pwaInstall.feature3")}</li>
              <li>{t("pwaInstall.feature4")}</li>
            </ul>
          </CardContent>
        )}
        
        <CardFooter>
          {isInstalled ? (
            <div className="w-full flex items-center justify-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span>{t("pwaInstall.installedOnDevice")}</span>
            </div>
          ) : (
            <Button 
              className="w-full bg-green-600 hover:bg-green-700" 
              onClick={handleInstallClick}
              variant="default"
            >
              <Download className="mr-2 h-4 w-4" />
              {t("pwaInstall.installButton")}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Dialog con il selettore del browser */}
      <Dialog open={showBrowserSelector} onOpenChange={setShowBrowserSelector}>
        <DialogContent className="min-[1200px]:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              {t("pwaInstall.selectBrowser")}
            </DialogTitle>
            <DialogDescription>
              {t("pwaInstall.selectBrowserDesc")}
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
              <span>{t("pwaInstall.browserOther")}</span>
            </Button>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowBrowserSelector(false)}
              className="w-full sm:w-auto"
            >
              {t("pwaInstall.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog con istruzioni dettagliate per l'installazione manuale */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="min-[1200px]:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogInstructions && renderBrowserIcon(dialogInstructions.browser)}
              {dialogInstructions?.title || t("pwaInstall.instructionsTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("pwaInstall.instructionsDesc")}
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
                  <p className="font-medium text-amber-800 mb-2">{t("pwaInstall.additionalInfo")}</p>
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
              {t("pwaInstall.understood")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}