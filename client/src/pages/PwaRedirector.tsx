import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * PwaRedirector
 * 
 * Pagina che gestisce il reindirizzamento automatico quando l'app viene avviata in modalità PWA.
 * Cerca informazioni memorizzate (token, link QR, ecc.) e reindirizza alla pagina appropriata.
 */
export default function PwaRedirector() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const redirect = async () => {
      try {
        // Controlliamo se siamo in una PWA installata
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');
        
        console.log("PwaRedirector - Checking PWA mode:", isPWA);
        
        // Se non siamo in PWA, reindirizza alla home
        if (!isPWA) {
          console.log("PwaRedirector - Not in PWA mode, redirecting to /");
          setLocation("/");
          return;
        }
        
        // Verifichiamo se abbiamo un link QR salvato
        const qrLink = localStorage.getItem('qrLink');
        if (qrLink) {
          console.log("PwaRedirector - QR link found, redirecting to:", qrLink);
          
          // Se il link è relativo, aggiungi l'URL base
          if (qrLink.startsWith('/')) {
            window.location.href = window.location.origin + qrLink;
          } else {
            window.location.href = qrLink;
          }
          return;
        }
        
        // Verifichiamo se abbiamo dati QR salvati
        const qrData = localStorage.getItem('qrData');
        if (qrData) {
          console.log("PwaRedirector - QR data found, redirecting to /activate");
          setLocation(`/activate?data=${encodeURIComponent(qrData)}`);
          return;
        }
        
        // Non abbiamo informazioni salvate, reindirizza al login cliente
        console.log("PwaRedirector - No saved information, redirecting to client login");
        setLocation("/client-login");
        
      } catch (error) {
        console.error("PwaRedirector - Error during redirection:", error);
        toast({
          title: t('common.error'),
          description: t('i18nFinale.pwaRedirector.appStartError'),
          variant: "destructive",
        });
        
        // In caso di errore, reindirizza al login cliente
        setTimeout(() => {
          setLocation("/client-login");
        }, 1000);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Aggiungi un piccolo ritardo per permettere al service worker di completare l'inizializzazione
    setTimeout(() => {
      redirect();
    }, 500);
  }, [setLocation, toast]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">{t('i18nFinale.pwaRedirectorExtra.starting')}</p>
      {!isLoading && (
        <p className="mt-2 text-sm text-muted-foreground">{t('i18nFinale.pwaRedirectorExtra.redirecting')}</p>
      )}
    </div>
  );
}