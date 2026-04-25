import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, ExternalLink, Home, Share, Save } from "lucide-react";
import { BeforeInstallPromptEvent } from '@/types/pwa';

interface AddToHomeScreenProps {
  minimal?: boolean;
}

export function AddToHomeScreen({ minimal = false }: AddToHomeScreenProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    
    const isAppInstalled = (window as any).__pwaIsInstalled || 
                           window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    if (isAppInstalled) {
      console.log('App già installata in modalità standalone');
      setIsInstalled(true);
    }
    
    if ((window as any).__installPromptEvent) {
      setDeferredPrompt((window as any).__installPromptEvent);
    }
    
    const handleInstallPrompt = (e: Event) => {
      console.log('Evento beforeinstallprompt catturato', e);
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      (window as any).__installPromptEvent = promptEvent;
    };
    
    const handlePwaInstallReady = () => {
      if ((window as any).__installPromptEvent) {
        setDeferredPrompt((window as any).__installPromptEvent);
      }
    };
    
    const handlePwaInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('pwaInstallReady', handlePwaInstallReady);
    window.addEventListener('pwaInstalled', handlePwaInstalled);
    window.addEventListener('appinstalled', handlePwaInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('pwaInstallReady', handlePwaInstallReady);
      window.removeEventListener('pwaInstalled', handlePwaInstalled);
      window.removeEventListener('appinstalled', handlePwaInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      toast({
        title: t('addToHomeScreen.iosToastTitle'),
        description: t('addToHomeScreen.iosToastDescription'),
        duration: 5000,
      });
      return;
    }
    
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          toast({
            title: t('addToHomeScreen.createdToastTitle'),
            description: t('addToHomeScreen.createdToastDescription'),
          });
          setIsInstalled(true);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error("Errore durante l'installazione:", error);
      }
    } else {
      if (isAndroid) {
        toast({
          title: t('addToHomeScreen.androidToastTitle'),
          description: t('addToHomeScreen.androidToastDescription'),
          duration: 6000
        });
      } else {
        toast({
          title: t('addToHomeScreen.genericToastTitle'),
          description: t('addToHomeScreen.genericToastDescription'),
          duration: 6000
        });
      }
    }
  };

  if (minimal) {
    return (
      <Button 
        onClick={handleInstallClick}
        variant="outline" 
        className="gap-2 bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700"
      >
        <ExternalLink className="h-4 w-4" />
        {t('addToHomeScreen.minimalButton')}
      </Button>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg font-medium">
          <Home className="mr-2 h-5 w-5 text-blue-600" /> 
          {t('addToHomeScreen.cardTitle')}
        </CardTitle>
        <CardDescription>
          {t('addToHomeScreen.cardDescription')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Smartphone className="h-12 w-12 text-blue-500" />
          </div>
          
          <p className="text-sm text-center max-w-xs mx-auto">
            {t('addToHomeScreen.cardBody')}
          </p>
        </div>
      </CardContent>
      
      <CardFooter>
        {isIOS ? (
          <Button 
            onClick={handleInstallClick}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Share className="h-5 w-5" />
            {t('addToHomeScreen.iosButton')}
          </Button>
        ) : (
          <Button 
            onClick={handleInstallClick}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Save className="h-5 w-5" />
            {t('addToHomeScreen.androidButton')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
