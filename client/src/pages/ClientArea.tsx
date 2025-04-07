import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock, FileText, User, Download, Smartphone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BeforeInstallPromptEvent } from '@/types/pwa';

interface UserData {
  id: number;
  username: string;
  type: string;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    hasConsent: boolean;
  };
}

export default function ClientArea() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifica autenticazione
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user?.client?.id) {
      fetchClientAppointments(user.client.id);
    }
  }, [user]);
  
  // Gestione dell'installazione dell'app PWA - Completamente riscritta per maggiore semplicità
  useEffect(() => {
    // Rileva se il dispositivo è iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // Verifica se l'app è già installata
    const isAppInstalled = (window as any).__pwaIsInstalled || 
                           window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    if (isAppInstalled) {
      console.log('App già installata in modalità standalone');
      setIsInstalled(true);
    }
    
    // Controllo immediato se esiste già un evento di installazione salvato
    if ((window as any).__installPromptEvent) {
      console.log('Evento di installazione trovato nella window!');
      setDeferredPrompt((window as any).__installPromptEvent);
    }
    
    // Ascolta gli eventi PWA
    const handlePwaInstallReady = () => {
      console.log('Evento pwaInstallReady ricevuto');
      if ((window as any).__installPromptEvent) {
        setDeferredPrompt((window as any).__installPromptEvent);
        toast({
          title: "App pronta per l'installazione",
          description: "Puoi installare l'app sul tuo dispositivo per un accesso più rapido!",
          duration: 5000,
        });
      }
    };
    
    const handlePwaInstalled = () => {
      console.log('Evento pwaInstalled ricevuto');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    
    // Ascolta eventi personalizzati che vengono attivati dal codice in index.html
    window.addEventListener('pwaInstallReady', handlePwaInstallReady);
    window.addEventListener('pwaInstalled', handlePwaInstalled);
    
    // Cattura direttamente l'evento beforeinstallprompt solo se non è già stato catturato
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt catturato in ClientArea', e);
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Salva anche nella window
      (window as any).__installPromptEvent = promptEvent;
    };
    
    // Se la window non ha ancora catturato l'evento, aggiungi un listener anche qui
    if (!(window as any).__pwaInstallEventAttached) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
    
    // Monitora cambiamenti di displayMode
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        console.log('Display mode changed to standalone');
        setIsInstalled(true);
      }
    };
    
    // Aggiungi il listener per il display mode
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleDisplayModeChange);
    }
    
    // Aggiungi un listener per l'evento appinstalled
    const handleAppInstalled = () => {
      console.log('App installata con successo (evento appinstalled)');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Cleanup
    return () => {
      window.removeEventListener('pwaInstallReady', handlePwaInstallReady);
      window.removeEventListener('pwaInstalled', handlePwaInstalled);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      // Rimuovi il listener solo se l'abbiamo aggiunto noi
      if (!(window as any).__pwaInstallEventAttached) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
      
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiRequest('GET', '/api/current-user');
      
      if (response.ok) {
        const userData = await response.json();
        
        // Verifica che l'utente sia un cliente
        if (userData.type !== "client") {
          toast({
            title: "Accesso negato",
            description: "Questa area è riservata ai clienti",
            variant: "destructive",
          });
          
          setLocation("/client-login");
          return;
        }
        
        setUser(userData);
      } else {
        // Se non autenticato, reindirizza alla pagina di login
        setLocation("/client-login");
      }
    } catch (error) {
      console.error("Errore nel caricamento dell'utente corrente:", error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile verificare l'autenticazione",
        variant: "destructive",
      });
      
      setLocation("/client-login");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientAppointments = async (clientId: number) => {
    setLoadingAppointments(true);
    try {
      const response = await apiRequest('GET', `/api/appointments/client/${clientId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Ordina gli appuntamenti per data e ora (il più recente prima)
        const sortedAppointments = data.sort((a: any, b: any) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error("Errore nel caricamento degli appuntamenti:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli appuntamenti",
        variant: "destructive",
      });
    } finally {
      setLoadingAppointments(false);
    }
  };
  
  // Funzione per confermare la ricezione del promemoria
  const confirmAppointmentReminder = async (appointmentId: number) => {
    try {
      const response = await apiRequest('POST', `/api/appointments/${appointmentId}/confirm-reminder`);
      
      if (response.ok) {
        const result = await response.json();
        
        // Aggiorna la lista degli appuntamenti
        if (user?.client?.id) {
          fetchClientAppointments(user.client.id);
        }
        
        toast({
          title: "Promemoria confermato",
          description: "Grazie per aver confermato il tuo appuntamento.",
          variant: "default",
        });
      } else {
        throw new Error("Errore nella conferma del promemoria");
      }
    } catch (error) {
      console.error("Errore nella conferma del promemoria:", error);
      toast({
        title: "Errore",
        description: "Impossibile confermare il promemoria",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      toast({
        title: "Logout effettuato",
        description: "Hai effettuato il logout con successo",
      });
      setLocation("/client-login");
    } catch (error) {
      console.error("Errore durante il logout:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il logout",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (timeString: string) => {
    // Formato: 12:30:00 -> 12:30
    return timeString.substring(0, 5);
  };
  
  // Funzione per installare l'app sul dispositivo
  const handleInstallApp = async () => {
    console.log("Tentativo di installazione dell'app");
    
    // Per iOS, mostra le istruzioni
    if (isIOS) {
      toast({
        title: "Installazione su iOS",
        description: "Per installare, tocca l'icona di condivisione in Safari e seleziona 'Aggiungi a Home'",
        duration: 5000,
      });
      return;
    }
    
    // NUOVO: Hack - proviamo a forzare un evento beforeinstallprompt simulando un click su un link
    // Questo trick a volte attiva il browser a mostrare il prompt di installazione su Chrome/Edge
    const createFakeInstallPrompt = () => {
      // Crea un elemento a che simula un'interazione
      const fakeLink = document.createElement('a');
      fakeLink.href = window.location.href;
      fakeLink.rel = 'manifest';
      fakeLink.style.display = 'none';
      document.body.appendChild(fakeLink);
      fakeLink.click();
      
      // Crea un secondo elemento per forzare un'azione più profonda
      const fakeDiv = document.createElement('div');
      fakeDiv.style.position = 'fixed';
      fakeDiv.style.top = '0';
      fakeDiv.style.left = '0';
      fakeDiv.style.right = '0';
      fakeDiv.style.bottom = '0';
      fakeDiv.style.zIndex = '999999';
      fakeDiv.style.backgroundColor = 'rgba(0,0,0,0.01)';
      fakeDiv.style.display = 'none';
      document.body.appendChild(fakeDiv);
      
      // Aggiungi un listener temporaneo per catturare potenziali eventi
      const tempListener = (e: any) => {
        console.log('Hack generato evento:', e);
        e.preventDefault();
        setDeferredPrompt(e);
        window.__installPromptEvent = e;
        document.body.removeEventListener('beforeinstallprompt', tempListener);
      };
      
      document.body.addEventListener('beforeinstallprompt', tempListener);
      
      // Simula un'interazione utente
      setTimeout(() => {
        fakeDiv.style.display = 'block';
        fakeDiv.click();
        
        // Rimuovi gli elementi dopo l'uso
        setTimeout(() => {
          document.body.removeChild(fakeLink);
          document.body.removeChild(fakeDiv);
          
          // Se ancora non abbiamo un prompt, proviamo altre tecniche
          if (!deferredPrompt && !(window as any).__installPromptEvent) {
            continueInstallProcess();
          }
        }, 500);
      }, 100);
    };
    
    // Funzione che prosegue il processo di installazione standard
    const continueInstallProcess = async () => {
      // Prova a usare il prompt se disponibile
      if (deferredPrompt) {
        try {
          console.log("Prompt di installazione disponibile, tentativo di mostrarlo");
          await deferredPrompt.prompt();
          console.log("Prompt di installazione mostrato all'utente");
          
          const choiceResult = await deferredPrompt.userChoice;
          console.log("Scelta dell'utente:", choiceResult.outcome);
          
          if (choiceResult.outcome === 'accepted') {
            toast({
              title: "Installazione in corso",
              description: "L'app sta per essere installata sul tuo dispositivo",
              variant: "default",
            });
          } else {
            toast({
              title: "Installazione annullata",
              description: "Puoi installare l'app in qualsiasi momento dal pulsante dedicato",
              variant: "default",
            });
          }
          
          setDeferredPrompt(null);
          (window as any).__installPromptEvent = null;
          return;
        } catch (error) {
          console.error("Errore durante l'installazione dell'app:", error);
        }
      }
      
      // Piano B: usare il prompt globale
      if ((window as any).__installPromptEvent) {
        console.log("Utilizzo del prompt globale come fallback");
        try {
          const globalPrompt = (window as any).__installPromptEvent;
          await globalPrompt.prompt();
          const choiceResult = await globalPrompt.userChoice;
          
          if (choiceResult.outcome === 'accepted') {
            toast({
              title: "Installazione in corso",
              description: "L'app sta per essere installata sul tuo dispositivo",
              variant: "default",
            });
          }
          
          (window as any).__installPromptEvent = null;
          return;
        } catch (error) {
          console.error("Errore con il prompt globale:", error);
        }
      }
      
      // Piano C: Cambiare tattica completamente - offrire all'utente istruzioni manuali
      // Invece di tentare di registrare manualmente il service worker
      const appUrl = window.location.href;
      toast({
        title: "Installazione manuale",
        description: "Per installare questa app, usa il menu del browser (⋮) e seleziona 'Installa app' o 'Aggiungi a schermata Home'.",
        duration: 10000
      });
      
      // Mostra opzioni di backup con istruzioni più visibili
      const instructionsDiv = document.createElement('div');
      instructionsDiv.style.position = 'fixed';
      instructionsDiv.style.top = '50%';
      instructionsDiv.style.left = '50%';
      instructionsDiv.style.transform = 'translate(-50%, -50%)';
      instructionsDiv.style.backgroundColor = 'white';
      instructionsDiv.style.padding = '20px';
      instructionsDiv.style.borderRadius = '10px';
      instructionsDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      instructionsDiv.style.zIndex = '99999';
      instructionsDiv.style.maxWidth = '350px';
      
      instructionsDiv.innerHTML = `
        <div style="text-align:center; margin-bottom:15px;">
          <h3 style="font-weight:bold; margin-bottom:8px;">Installazione manuale</h3>
          <p style="margin-bottom:10px;">Il tuo browser supporta le PWA, ma non è stato possibile attivare il prompt automatico.</p>
        </div>
        <div style="margin-bottom:15px;">
          <p style="font-weight:bold; margin-bottom:8px;">Per installare manualmente:</p>
          <ol style="margin-left:20px; list-style-type:decimal;">
            <li style="margin-bottom:5px;">Tocca il menu del browser (⋮)</li>
            <li style="margin-bottom:5px;">Seleziona "Installa app" o "Aggiungi a schermata Home"</li>
            <li style="margin-bottom:5px;">Conferma l'installazione</li>
          </ol>
        </div>
        <div style="text-align:center;">
          <button id="close-instructions" style="padding:8px 16px; background:#4f46e5; color:white; border:none; border-radius:5px; cursor:pointer;">Ho capito</button>
        </div>
      `;
      
      document.body.appendChild(instructionsDiv);
      
      document.getElementById('close-instructions')?.addEventListener('click', () => {
        document.body.removeChild(instructionsDiv);
      });
    };
    
    // Avvia il processo provando prima con un hack e poi continuando normalmente
    createFakeInstallPrompt();
    
    // Se dopo 500ms non abbiamo ancora ottenuto un prompt, continua con il processo standard
    setTimeout(() => {
      if (!deferredPrompt && !(window as any).__installPromptEvent) {
        continueInstallProcess();
      }
    }, 500);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Debug Info - Solo per lo sviluppo */}
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
        <p><strong>Debug PWA:</strong> {deferredPrompt ? "Prompt PWA disponibile ✅" : "Prompt PWA non disponibile ❌"}</p>
        <p><strong>Dispositivo iOS:</strong> {isIOS ? "Sì ✅" : "No ❌"} | <strong>App installata:</strong> {isInstalled ? "Sì ✅" : "No ❌"}</p>
        <p><strong>Funzionalità PWA:</strong> {'serviceWorker' in navigator ? "Service Worker supportato ✅" : "Service Worker non supportato ❌"}</p>
        <div className="mt-2 flex gap-2 flex-wrap">
          <button 
            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js', {scope: '/'})
                  .then(reg => {
                    console.log('Service Worker registrato manualmente:', reg);
                    toast({
                      title: "Service Worker Registrato",
                      description: "Registrazione manuale completata",
                    });
                  })
                  .catch(err => {
                    console.error('Errore registrazione:', err);
                    toast({
                      title: "Errore Registrazione SW",
                      description: err.message,
                      variant: "destructive"
                    });
                  });
              }
            }}
          >
            Registra SW
          </button>
          <button 
            className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
            onClick={() => {
              // Forza il prompt se possibile
              if ((window as any).__installPromptEvent) {
                setDeferredPrompt((window as any).__installPromptEvent);
                console.log("Prompt PWA ripristinato manualmente");
                toast({
                  title: "PWA Ready",
                  description: "Il prompt di installazione è stato ripristinato"
                });
              } else {
                console.log("Nessun prompt PWA disponibile in window");
                toast({
                  title: "Nessun prompt disponibile",
                  description: "Ricarica la pagina e riprova",
                  variant: "destructive"
                });
              }
            }}
          >
            Ripristina Prompt
          </button>
          <button 
            className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs"
            onClick={handleInstallApp}
          >
            Forza installazione (con hack)
          </button>
          <button 
            className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
            onClick={() => {
              // Mostra le istruzioni manuali direttamente
              const instructionsDiv = document.createElement('div');
              instructionsDiv.style.position = 'fixed';
              instructionsDiv.style.top = '50%';
              instructionsDiv.style.left = '50%';
              instructionsDiv.style.transform = 'translate(-50%, -50%)';
              instructionsDiv.style.backgroundColor = 'white';
              instructionsDiv.style.padding = '20px';
              instructionsDiv.style.borderRadius = '10px';
              instructionsDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              instructionsDiv.style.zIndex = '99999';
              instructionsDiv.style.maxWidth = '350px';
              
              instructionsDiv.innerHTML = `
                <div style="text-align:center; margin-bottom:15px;">
                  <h3 style="font-weight:bold; margin-bottom:8px;">Installazione manuale</h3>
                  <p style="margin-bottom:10px;">Il tuo browser supporta le PWA, ma non è stato possibile attivare il prompt automatico.</p>
                </div>
                <div style="margin-bottom:15px;">
                  <p style="font-weight:bold; margin-bottom:8px;">Per installare manualmente:</p>
                  <ol style="margin-left:20px; list-style-type:decimal;">
                    <li style="margin-bottom:5px;">Tocca il menu del browser (⋮)</li>
                    <li style="margin-bottom:5px;">Seleziona "Installa app" o "Aggiungi a schermata Home"</li>
                    <li style="margin-bottom:5px;">Conferma l'installazione</li>
                  </ol>
                </div>
                <div style="text-align:center;">
                  <button id="close-instructions" style="padding:8px 16px; background:#4f46e5; color:white; border:none; border-radius:5px; cursor:pointer;">Ho capito</button>
                </div>
              `;
              
              document.body.appendChild(instructionsDiv);
              
              document.getElementById('close-instructions')?.addEventListener('click', () => {
                document.body.removeChild(instructionsDiv);
              });
            }}
          >
            Istruzioni manuali
          </button>
        </div>
      </div>
      
      <header className="mb-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Area Cliente</h1>
          {user?.client && (
            <p className="text-muted-foreground">
              Benvenuto, {user.client.firstName} {user.client.lastName}
            </p>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
          {!isInstalled && (
            <Button 
              variant="default" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleInstallApp}
              disabled={!deferredPrompt && !isIOS}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              {isIOS ? "Installa da Safari" : "Installa App"}
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout}>
            Esci
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profilo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {user?.client && (
                <>
                  <p><strong>Nome:</strong> {user.client.firstName} {user.client.lastName}</p>
                  <p><strong>Telefono:</strong> {user.client.phone}</p>
                  {user.client.email && <p><strong>Email:</strong> {user.client.email}</p>}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full text-sm" size="sm">
              Modifica profilo
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Appuntamenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {loadingAppointments 
                ? "Caricamento appuntamenti..." 
                : appointments.length > 0 
                  ? `Hai ${appointments.length} appuntamenti` 
                  : "Nessun appuntamento programmato"}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full text-sm" size="sm">
              Visualizza tutti
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Consensi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {user?.client?.hasConsent 
                ? "Hai fornito il consenso al trattamento dei dati" 
                : "Consenso al trattamento dati non ancora fornito"}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant={user?.client?.hasConsent ? "outline" : "default"} 
              className="w-full text-sm" 
              size="sm"
              onClick={() => setLocation("/consent")}
            >
              {user?.client?.hasConsent ? "Visualizza consenso" : "Fornisci consenso"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" /> 
            I tuoi prossimi appuntamenti
          </CardTitle>
          <CardDescription>
            Visualizza e gestisci i tuoi appuntamenti programmati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAppointments ? (
            <div className="text-center py-6">
              <div className="animate-spin inline-block h-8 w-8 border-b-2 border-primary rounded-full"></div>
              <p className="mt-2 text-muted-foreground">Caricamento appuntamenti...</p>
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.slice(0, 5).map((appointment) => {
                  // Verifica se l'appuntamento è passato
                  const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}`);
                  const isExpired = appointmentDate < new Date();
                  
                  return (
                    <div 
                      key={appointment.id} 
                      className={`border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between ${isExpired ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex-1 mb-3 md:mb-0">
                        <div className="font-medium flex items-center">
                          {appointment.serviceName}
                          {isExpired && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                              Passato
                            </span>
                          )}
                          {appointment.status === "completed" && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              Completato
                            </span>
                          )}
                          {appointment.reminderSent && !appointment.reminderConfirmed && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800" title="Promemoria inviato">
                              Notificato
                            </span>
                          )}
                          {appointment.reminderConfirmed && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-green-100 text-green-800" title="Promemoria confermato">
                              Confermato
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(appointment.date)}
                          <Clock className="h-4 w-4 ml-3 mr-1" />
                          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2">
                        {!isExpired && appointment.status !== "completed" && (
                          <Button variant="outline" size="sm">
                            Modifica
                          </Button>
                        )}
                        
                        {appointment.reminderSent && !appointment.reminderConfirmed && !isExpired && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => confirmAppointmentReminder(appointment.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Conferma
                          </Button>
                        )}
                        
                        <Button 
                          variant={appointment.status === "completed" || isExpired ? "ghost" : "outline"} 
                          size="sm"
                        >
                          {appointment.status === "completed" ? "Completato" : "Dettagli"}
                        </Button>
                      </div>
                    </div>
                  );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Non hai appuntamenti programmati</p>
              <Button className="mt-4" variant="outline">Contattaci per prenotare</Button>
            </div>
          )}
        </CardContent>
        {appointments.length > 5 && (
          <CardFooter>
            <Button variant="outline" className="w-full">
              Visualizza tutti gli appuntamenti ({appointments.length})
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Card per l'installazione dell'app mobile - visibile solo se l'app non è già installata */}
      {!isInstalled && (
        <div>
          {/* NUOVO: Alert fluttuante che cattura l'attenzione */}
          <div className="fixed bottom-5 right-5 z-50 p-4 bg-blue-600 text-white rounded-lg shadow-lg flex items-center gap-3 animate-pulse max-w-xs">
            <Smartphone className="h-8 w-8" />
            <div>
              <div className="font-bold">Installa l'app!</div>
              <div className="text-sm">Accedi più velocemente</div>
            </div>
            <button 
              className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-medium"
              onClick={handleInstallApp}
            >
              Installa
            </button>
          </div>
          
          {/* Card informativa completa */}
          <Card className="mb-8 border-dashed border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5" /> 
                Installa l'app sul tuo dispositivo
              </CardTitle>
              <CardDescription>
                Accedi facilmente alla tua area cliente installando l'app direttamente sul tuo dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm">
                    <Download className="h-10 w-10 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">Vantaggi dell'installazione</h3>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Accesso rapido e diretto all'area cliente</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Nessun bisogno di scansionare il QR code ogni volta</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Funziona anche offline per visualizzare i tuoi dati</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Ricevi notifiche per i tuoi appuntamenti</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* NUOVO: Istruzioni specifiche per installazione */}
                <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium mb-2">Come installare l'app:</h4>
                  {isIOS ? (
                    <div className="text-sm space-y-2">
                      <p className="flex items-center">
                        <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 flex items-center justify-center">1</span>
                        Tocca l'icona <span className="mx-1 px-2 py-1 bg-gray-100 rounded">Condividi</span> nella barra degli strumenti del browser
                      </p>
                      <p className="flex items-center">
                        <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 flex items-center justify-center">2</span>
                        Scorri verso il basso e seleziona <span className="mx-1 px-2 py-1 bg-gray-100 rounded">Aggiungi a Home</span>
                      </p>
                      <p className="flex items-center">
                        <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 flex items-center justify-center">3</span>
                        Conferma toccando <span className="mx-1 px-2 py-1 bg-gray-100 rounded">Aggiungi</span>
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm space-y-2">
                      <p className="flex items-center">
                        <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 flex items-center justify-center">1</span>
                        Tocca il pulsante <span className="mx-1 px-2 py-1 bg-blue-600 text-white rounded">Installa app</span> qui sotto
                      </p>
                      <p className="flex items-center">
                        <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 flex items-center justify-center">2</span>
                        Nella finestra di dialogo che appare, seleziona <span className="mx-1 px-2 py-1 bg-gray-100 rounded">Installa</span>
                      </p>
                      <p className="flex items-center">
                        <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 flex items-center justify-center">3</span>
                        L'app verrà installata e apparirà sulla schermata Home
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
                onClick={handleInstallApp}
              >
                <Smartphone className="mr-2 h-5 w-5" />
                {isIOS 
                  ? "Installa: tocca l'icona di condivisione e poi Aggiungi alla Home" 
                  : "Installa app sul dispositivo"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}