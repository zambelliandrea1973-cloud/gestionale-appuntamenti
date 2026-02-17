import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { LanguageSelector } from "@/components/ui/language-selector";

/**
 * WelcomePage - Pagina iniziale dell'applicazione
 * Mostra opzioni per creare un nuovo account o accedere con uno esistente
 */
export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useUserWithLicense();
  const { t } = useTranslation();

  // Controlliamo se siamo in versione PWA per impostare comportamenti specifici
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone || 
    document.referrer.includes('android-app://');

  // Reindirizza utenti autenticati alla dashboard
  useEffect(() => {
    // Controlla se stiamo arrivando da un flusso cliente (QR scan)
    const urlParams = new URLSearchParams(window.location.search);
    const hasClientToken = urlParams.get('token') && urlParams.get('clientId');
    
    if (!isLoading && user && !hasClientToken) {
      console.log('✅ Utente autenticato rilevato su WelcomePage, reindirizzamento a /dashboard');
      setLocation('/dashboard');
      return;
    }
    
    // Se abbiamo un token cliente, lascia che l'utente scelga dove andare
    if (hasClientToken) {
      console.log('Token cliente rilevato, rimango su WelcomePage per scelta utente');
    }
  }, [user, isLoading, setLocation]);

  // Verifica la presenza di credenziali salvate per potenziale accesso rapido
  useEffect(() => {
    // Se siamo in una PWA e ci sono credenziali salvate, potremmo fare un redirect automatico
    if (isPWA) {
      const hasStoredStaffCredentials = localStorage.getItem('staffUsername') && localStorage.getItem('staffPassword');
      const hasStoredClientCredentials = localStorage.getItem('clientUsername') && localStorage.getItem('clientPassword');
      
      // In questo caso non facciamo redirect automatico per dare sempre la possibilità di scegliere
      // ma potremmo valutare tale opzione in futuro
      console.log("Welcome page caricata in modalità PWA", {
        hasStoredStaffCredentials,
        hasStoredClientCredentials
      });
    }
  }, [isPWA]);

  // Mostra loading mentre verifichiamo l'autenticazione
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header specifico per la welcome page */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium">{t('welcome.title')}</h1>
            <div className="text-white">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('welcome.heading')}</CardTitle>
            <CardDescription>
              {t('welcome.chooseOption')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3">
              <Button 
                className="h-16 text-lg"
                size="lg"
                onClick={() => setLocation("/register")}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {t('welcome.createAccount')}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                {t('welcome.newUsersDescription')}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                className="h-12 text-base"
                size="lg" 
                variant="outline"
                onClick={() => setLocation("/customer-login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {t('welcome.professionalAccess')}
              </Button>
              
              <Button 
                className="h-12 text-base"
                size="lg" 
                variant="outline"
                onClick={() => setLocation("/staff-login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {t('welcome.staffAdminAccess')}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                {t('welcome.chooseAccessType')}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-xs text-muted-foreground mt-4">
              <p>{t('footer.version')}</p>
              <p>{t('footer.allRightsReserved')}</p>
            </div>
          </CardFooter>
        </Card>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-center text-xs text-gray-500">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
      
      {/* Componente Toaster per mostrare notifiche */}
      <Toaster />
    </div>
  );
}