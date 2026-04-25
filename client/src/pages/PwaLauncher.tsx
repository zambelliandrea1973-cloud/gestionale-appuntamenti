// @ts-nocheck
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

/**
 * PwaLauncher - Component per avvio PWA
 * 
 * Versione migliorata con:
 * 1. Controllo completo e più affidabile dei dati di accesso
 * 2. Più informazioni per il debug
 * 3. Maggiore sicurezza nel mantenimento del token di accesso
 * 4. Backup dei dati di accesso per evitare perdite
 */
export default function PwaLauncher() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Log di debug per vedere cosa c'è nel localStorage
    const storedData = {
      originalUrl: localStorage.getItem('originalUrl'),
      qrLink: localStorage.getItem('qrLink'),
      qrData: localStorage.getItem('qrData'),
      clientUsername: localStorage.getItem('clientUsername'),
      clientId: localStorage.getItem('clientId'),
      clientAccessToken: localStorage.getItem('clientAccessToken'),
      hasToken: localStorage.getItem('clientAccessToken') ? 'sì' : 'no'
    };
    
    setStorageData(storedData);
    console.log("PwaLauncher - Contenuto localStorage:", storedData);
    
    // RAFFORZAMENTO: Se abbiamo alcuni dati ma non altri (per evitare perdita di dati)
    if (storedData.clientId && !storedData.clientAccessToken && storedData.qrData) {
      console.log("Ricostruzione token da qrData");
      localStorage.setItem('clientAccessToken', storedData.qrData);
      storedData.clientAccessToken = storedData.qrData;
    }
    
    // Funzione per reindirizzare l'utente alla pagina appropriata
    const redirectUser = () => {
      // Controllo avanzato per determinare la destinazione dell'utente
      const hasCredentials = storedData.clientUsername && storedData.clientId;
      const hasToken = storedData.clientAccessToken;
      
      // Caso 1: Abbiamo credenziali E token - perfetto per login diretto e automatico
      if (hasCredentials && hasToken) {
        console.log("Credenziali e token disponibili, reindirizzamento all'area client");
        
        // Rinforzare salvando nuovamente il token (per prevenire la perdita)
        // A volte localStorage può non salvare correttamente o essere pulito
        localStorage.setItem('clientAccessToken', storedData.clientAccessToken);
        
        // Aggiorniamo il messaggio toast per avere un feedback migliore
        toast({
          title: t('i18nFinale.pwaLauncher.autoAccessTitle'),
          description: t('i18nFinale.pwaLauncher.credentialsFoundDesc'),
          duration: 2000,
        });
        
        // Creiamo un URL con il token come parametro per massimizzare la compatibilità
        const targetUrl = `/client-area?token=${encodeURIComponent(storedData.clientAccessToken)}&clientId=${storedData.clientId}`;
        
        console.log("Accesso diretto all'area client con token esplicito:", targetUrl);
        setLocation(targetUrl);
      }
      // Caso 2: Abbiamo credenziali ma non token - probabile login standard
      else if (hasCredentials) {
        console.log("Utente già configurato, reindirizzamento alla pagina di login");
        
        toast({
          title: t('i18nFinale.pwaLauncher.loginRequiredTitle'),
          description: t('i18nFinale.pwaLauncher.enterPassword'),
          duration: 2000,
        });
        
        // Reindirizza alla pagina di login client (nome utente sarà precompilato)
        setLocation('/client-login');
      }
      // Caso 3: Non abbiamo credenziali - necessaria attivazione 
      else {
        console.log("Utente non configurato, reindirizzamento alla pagina di attivazione QR");
        
        toast({
          title: t('i18nFinale.pwaLauncher.configRequiredTitle'),
          description: t('i18nFinale.pwaLauncher.scanQrToConfigure'),
          duration: 2000,
        });
        
        // Reindirizza alla pagina di attivazione QR
        setLocation('/activate');
      }
      
      setLoading(false);
    };
    
    // Reindirizza automaticamente dopo un breve delay
    const timer = setTimeout(redirectUser, 1500);
    
    return () => clearTimeout(timer);
  }, [setLocation, toast]);
  
  // Funzione per rigenerare manualmente il localStorage
  const riparaStorage = () => {
    // Se abbiamo clientId e qrData ma non token, proviamo a ricostruire
    if (storageData.clientId && storageData.qrData && !storageData.clientAccessToken) {
      localStorage.setItem('clientAccessToken', storageData.qrData);
      toast({
        title: t('i18nFinale.pwaLauncher.storageRepairedTitle'),
        description: t('i18nFinale.pwaLauncher.tokenRecreatedDesc'),
      });
      
      // Refresh della pagina
      window.location.reload();
    } else {
      toast({
        title: t('i18nFinale.pwaLauncher.cannotRepairTitle'),
        description: t('i18nFinale.pwaLauncher.insufficientDataToken'),
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('i18nFinale.pwaLauncher.welcome')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('i18nFinale.pwaLauncher.initCheck')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 gap-6">
          {loading ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                {t('i18nFinale.pwaLauncher.initApp')}
              </p>
              <p className="text-sm text-center">
                {t('i18nFinale.pwaLauncher.verifyingUser')}
              </p>
              <div className="w-full mt-2">
                <Button 
                  variant="ghost" 
                  className="text-xs" 
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                >
                  {showDebugInfo ? t('i18nFinale.pwaLauncher.hideDebugInfo') : t('i18nFinale.pwaLauncher.showDebugInfo')}
                </Button>
                
                {showDebugInfo && storageData && (
                  <div className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-40">
                    <p><strong>localStorage:</strong></p>
                    <p>clientId: {storageData.clientId || t('i18nFinale.pwaLauncher.missing')}</p>
                    <p>username: {storageData.clientUsername || t('i18nFinale.pwaLauncher.missing')}</p>
                    <p>token: {storageData.clientAccessToken ? t('i18nFinale.pwaLauncher.present') : t('i18nFinale.pwaLauncher.missing')}</p>
                    <p>qrData: {storageData.qrData ? t('i18nFinale.pwaLauncher.present') : t('i18nFinale.pwaLauncher.missing')}</p>
                    <p>hasToken: {storageData.hasToken}</p>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 text-xs h-6" 
                      onClick={riparaStorage}
                    >
                      {t('i18nFinale.pwaLauncher.attemptRepair')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center">
              {t('i18nFinale.pwaLauncher.ifNotRedirected')}
              <Button 
                variant="link"
                onClick={() => setLocation('/client-login')}
                className="p-0 h-auto mx-1"
              >
                {t('i18nFinale.pwaLauncher.clickHere')}
              </Button> 
              {t('i18nFinale.pwaLauncher.toProceedLogin')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}