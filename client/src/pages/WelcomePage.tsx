import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

/**
 * WelcomePage - Pagina iniziale dell'applicazione
 * Mostra opzioni per creare un nuovo account o accedere con uno esistente
 */
export default function WelcomePage() {
  const [, setLocation] = useLocation();

  // Controlliamo se siamo in versione PWA per impostare comportamenti specifici
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone || 
    document.referrer.includes('android-app://');

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header specifico per la welcome page */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium">Gestione Appuntamenti</h1>
          </div>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Benvenuto in Gestione Appuntamenti</CardTitle>
            <CardDescription>
              Scegli come vuoi procedere
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
                Crea un nuovo account
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Per nuovi utenti che vogliono iniziare a utilizzare il sistema
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                className="h-16 text-lg"
                size="lg" 
                variant="outline"
                onClick={() => setLocation("/client-login")}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Accedi
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Accesso per clienti e operatori
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-xs text-muted-foreground mt-4">
              <p>Gestione Appuntamenti v3.5.0</p>
              <p>© 2023-2025 Tutti i diritti riservati</p>
            </div>
          </CardFooter>
        </Card>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-center text-xs text-gray-500">
            <p>© 2023-2025 Zambelli Andrea - Gestione Appuntamenti</p>
          </div>
        </div>
      </footer>
      
      {/* Componente Toaster per mostrare notifiche */}
      <Toaster />
    </div>
  );
}