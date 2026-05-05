import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function StaffLogin() {
  const { t } = useTranslation();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // CRITICO: Pulisci la sessione server PRIMA di qualsiasi altra operazione
  // per evitare che FooterContactIcons carichi dati di sessioni precedenti
  useEffect(() => {
    const clearSession = async () => {
      try {
        // 1. Pulisci sessione server (questo invaliderà automaticamente i dati utente)
        await apiRequest('POST', '/api/logout');
        console.log('🧹 Sessione server pulita all\'arrivo su StaffLogin');
        
        // 2. Invalida query di autenticazione per forzare ricaricamento
        queryClient.invalidateQueries({ queryKey: ['/api/user-with-license'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contact-info'] });
        queryClient.invalidateQueries({ queryKey: ['/api/company-name-settings'] });
        console.log('🧹 Query di autenticazione invalidate');
      } catch (error) {
        console.log('⚠️ Errore pulizia sessione (normale se non c\'era sessione):', error);
      }
    };
    clearSession();
  }, []);
  
  // Controlla se dobbiamo mostrare la pagina di login per admin e pre-compila username se presente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const usernameParam = params.get('username');
    
    if (roleParam === 'admin') {
      setIsAdminLogin(true);
    }
    
    // Pre-compila username se arriva dalla registrazione
    if (usernameParam) {
      setUsername(decodeURIComponent(usernameParam));
    }
  }, []);
  
  // Carica le credenziali memorizzate quando la pagina viene caricata
  useEffect(() => {
    const savedUsername = localStorage.getItem("staffUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);
  
  // Funzione per pulire manualmente cache e dati (utile per app WebView)
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // 1. Pulisci sessionStorage e localStorage PRIMA di tutto
      const keysToKeep = rememberMe ? ['staffUsername'] : [];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      // 2. Pulisci cache React Query
      queryClient.clear();
      
      // 3. Pulisci sessione server (questo cancellerà anche il cookie)
      await apiRequest('POST', '/api/logout');
      console.log('🧹 PULIZIA MANUALE: Logout completato');
      
      // 4. CRITICO: Redirect a pagina vuota e poi torna a login
      // Questo forza il browser a fare una richiesta completamente nuova senza cookie cached
      window.location.href = '/staff-login?cleared=1';
      
    } catch (error) {
      console.error('❌ Errore durante la pulizia:', error);
      // Anche in caso di errore, forza il redirect per pulire
      window.location.href = '/staff-login?cleared=1';
    }
  };
  
  // Crea la mutazione per gestire il login
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/staff/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: async (userData) => {
      console.log("Login riuscito, dati utente:", userData);
      
      // CRITICO: Pulisci TUTTI i dati localStorage di altri utenti per evitare contaminazione
      const keysToKeep = ['staffUsername']; // Solo credenziali memorizzate
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
          console.log(`🧹 Rimosso localStorage: ${key}`);
        }
      });
      
      // Forza la ripultura COMPLETA della cache per ottenere i dati utente aggiornati
      queryClient.clear(); // PULISCE TUTTA LA CACHE per evitare contaminazione cross-utente
      console.log('🧹 Cache React Query completamente pulita al login');
      
      // CRITICO: DE-REGISTRA Service Worker e pulisci tutte le cache
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('🧹 Service Worker de-registrato');
          }
        }
        
        // Pulisci TUTTE le cache del browser
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log(`🧹 Cache eliminata: ${cacheName}`);
          }
        }
      } catch (error) {
        console.error('⚠️ Errore pulizia Service Worker/cache:', error);
      }
      
      // CRITICO: Forza RELOAD COMPLETO invece di semplice redirect
      // Questo garantisce che TUTTE le cache browser/React siano pulite
      console.log(`✅ Login completato per ${userData.username} (ID: ${userData.id}), redirect con reload completo...`);
      
      // Controlla se c'è un redirect salvato (es. da email trial)
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        console.log(`🔗 Redirect salvato trovato: ${redirectUrl}`);
        sessionStorage.removeItem('redirectAfterLogin');
      }
      
      // IMPORTANTE: Aggiungi un piccolo delay per garantire che la cache sia pulita
      // poi usa window.location.href (non replace) per forzare full page reload
      setTimeout(() => {
        window.location.href = redirectUrl || "/dashboard";
      }, 100);
    },
    onError: (error: Error) => {
      setError(error.message || t('staffLoginPage.errorOccurred'));
      toast({
        title: t('staffLoginPage.loginError'),
        description: error.message || t('staffLoginPage.errorOccurred'),
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Verifica che tutti i campi siano compilati
    if (!username || !password) {
      setError(t('staffLoginPage.enterCredentials'));
      return;
    }
    
    // Se abbiamo selezionato "Ricorda il mio account", salva l'username
    if (rememberMe) {
      localStorage.setItem("staffUsername", username);
    } else {
      localStorage.removeItem("staffUsername");
    }
    
    // Esegui la mutazione
    loginMutation.mutate({ username, password });
  };
  
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Form di login */}
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {isAdminLogin ? t('staffLoginPage.adminTitle') : t('staffLoginPage.title')}
            </CardTitle>
            <CardDescription className="text-center">
              {isAdminLogin 
                ? t('staffLoginPage.adminDescription')
                : t('staffLoginPage.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('staffLoginPage.error')}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">{t('staffLoginPage.username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('staffLoginPage.usernamePlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('staffLoginPage.password')}</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('staffLoginPage.passwordPlaceholder')}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('staffLoginPage.rememberMe')}
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loginMutation.isPending ? t('staffLoginPage.loggingIn') : t('staffLoginPage.login')}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 border-t pt-4">
            {/* Link Forgot Password */}
            <button 
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-primary hover:underline w-full text-center"
            >
              {t('staffLoginPage.forgotPassword')}
            </button>
            
            {/* Pulsante per pulire cache manualmente (utile per app WebView) */}
            <Button 
              type="button"
              variant="outline"
              className="w-full" 
              disabled={isClearing}
              onClick={handleClearCache}
            >
              {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isClearing ? t('staffLoginPage.clearing') : `🧹 ${t('staffLoginPage.clearCache')}`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t('staffLoginPage.clearCacheHint')}
            </p>
            
            <div className="text-sm text-gray-600 text-center pt-2 border-t">
              <div>{t('staffLoginPage.noAccount')} <a href="/register" className="text-primary hover:underline">{t('staffLoginPage.register')}</a></div>
              <div className="pt-2">
                <span className="text-muted-foreground">
                  {t('staffLoginPage.areProfessional')} {" "}
                  <button
                    onClick={() => navigate("/customer-login")}
                    className="text-primary hover:underline"
                  >
                    {t('staffLoginPage.loginAsProfessional')}
                  </button>
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>
        
        {/* Sezione informativa */}
        <div className="hidden md:block p-6">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('staffLoginPage.adminPanel')}
          </h2>
          <p className="text-lg mb-6">
            {t('staffLoginPage.adminPanelDesc')}
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('staffLoginPage.featureCalendar')}</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('staffLoginPage.featureClients')}</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('staffLoginPage.featureBilling')}</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('staffLoginPage.featureNotifications')}</span>
            </li>
          </ul>
          <div className="mt-6 text-sm text-muted-foreground">
            {t('staffLoginPage.accessRestricted')}
          </div>
        </div>
      </div>
    </div>
  );
}