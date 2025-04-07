import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock, FileText, User, Download, Smartphone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BeforeInstallPromptEvent } from '@/types/pwa';
import { InstallationGuide } from "@/components/InstallationGuide";

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
  
  // Funzione per installare l'app sul dispositivo - semplificata per non creare confusione
  const handleInstallApp = async () => {
    console.log("Tentativo di installazione dell'app");
    
    // Per iOS, mostra le istruzioni semplici
    if (isIOS) {
      toast({
        title: "Installazione su iOS",
        description: "Per installare, tocca l'icona di condivisione in Safari e seleziona 'Aggiungi a Home'",
        duration: 5000,
      });
      return;
    }
    
    // Per browser supportati con prompt disponibile
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          toast({
            title: "Installazione in corso",
            description: "L'app sta per essere installata sul tuo dispositivo",
          });
        } else {
          toast({
            title: "Installazione annullata",
            description: "Puoi installare l'app in qualsiasi momento dalla card dedicata",
          });
        }
        
        setDeferredPrompt(null);
        return;
      } catch (error) {
        console.error("Errore durante l'installazione dell'app:", error);
      }
    }
    
    // Se non c'è un prompt disponibile, mostra istruzioni diverse in base al browser
    // Rileva il browser
    const isChrome = navigator.userAgent.indexOf("Chrome") > -1;
    const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
    const isEdge = navigator.userAgent.indexOf("Edg") > -1;
    
    if (isChrome || isEdge) {
      toast({
        title: "Installazione manuale",
        description: "Clicca sui tre puntini in alto a destra del browser ⋮ poi seleziona 'Installa app' o 'Installa Studio App'",
        duration: 10000
      });
    } else if (isFirefox) {
      toast({
        title: "Installazione manuale",
        description: "Clicca sui tre puntini o sull'icona del menu in alto a destra, poi seleziona 'Installa sito come applicazione'",
        duration: 10000
      });
    } else {
      toast({
        title: "Browser non supportato",
        description: "Prova a usare Chrome, Edge o Safari per installare l'app",
        duration: 8000
      });
    }
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
      {/* Nessun debug panel visibile */}
      
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
      
      {/* Card per l'installazione dell'app mobile - visibile solo se l'app non è già installata, molto più semplice ora */}
      {!isInstalled && (
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/50">
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
            <div className="space-y-4 text-center">
              <div className="bg-white dark:bg-gray-800 mx-auto p-4 rounded-full shadow-sm inline-block">
                <Download className="h-12 w-12 text-blue-500" />
              </div>
              
              <div className="max-w-lg mx-auto">
                <h3 className="font-medium text-lg mb-2">Come installare l'app:</h3>
                {isIOS ? (
                  <ol className="text-left text-sm space-y-2 mb-4 mx-auto max-w-sm">
                    <li className="flex items-center p-2 bg-white rounded-md border border-gray-100">
                      <span className="mr-2 flex-shrink-0 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</span>
                      Tocca l'icona di condivisione in Safari
                    </li>
                    <li className="flex items-center p-2 bg-white rounded-md border border-gray-100">
                      <span className="mr-2 flex-shrink-0 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</span>
                      Seleziona "Aggiungi a Home"
                    </li>
                  </ol>
                ) : (
                  <ol className="text-left text-sm space-y-2 mb-4 mx-auto max-w-sm">
                    <li className="flex items-center p-2 bg-white rounded-md border border-gray-100">
                      <span className="mr-2 flex-shrink-0 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</span>
                      Tocca "Installa App" qui sotto
                    </li>
                    <li className="flex items-center p-2 bg-white rounded-md border border-gray-100">
                      <span className="mr-2 flex-shrink-0 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</span>
                      Conferma nella finestra che appare
                    </li>
                  </ol>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center mb-2 text-xs text-muted-foreground">
              Seleziona il tuo dispositivo:
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button 
                className="bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={handleInstallApp}
                variant="default"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.34c-.5.51-1.002.82-1.503 1.13l.964 1.66c.073.14.018.31-.123.39-.14.08-.31.03-.383-.09l-.97-1.68c-.5.19-1.043.32-1.64.32s-1.14-.13-1.64-.32l-.97 1.68c-.073.12-.243.17-.383.09-.14-.08-.196-.25-.123-.39l.964-1.66c-.5-.31-1.002-.62-1.503-1.13l-1.523 2.65c-.394.68.218 1.52.974 1.52h7.437c.756 0 1.368-.84.974-1.52l-1.523-2.65zm-2.956-10.2h-5.136v.96h5.137v-.96zm1.024 2.1c-.25 0-.46.21-.46.46 0 .26.2.47.46.47s.46-.21.46-.46c0-.26-.21-.47-.46-.47zm-7.365-2.1c-.55 0-1.02.47-1.02 1.02v1.3l-3.026 4.35c-.845 1.34.147 3.1 1.688 3.1l.92-.18c-.057-.34-.087-.69-.087-1.04 0-1.85.87-3.51 2.227-4.58l.052-.08v-3.87h-.754zm5.183 5.53c-2.964 0-5.37 2.41-5.37 5.37s2.406 5.37 5.37 5.37 5.37-2.41 5.37-5.37-2.406-5.37-5.37-5.37zm-.96-7.53h-5.136v.96h5.137v-.96zm6.177 4.52l-3.026-4.35v-1.3c0-.55-.47-1.02-1.018-1.02h-.754v3.87l.052.08c1.357 1.07 2.227 2.73 2.227 4.58 0 .35-.03.7-.086 1.04l.92.18c1.54 0 2.532-1.76 1.686-3.1z" />
                </svg>
                Android
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700" 
                size="lg"
                onClick={() => {
                  toast({
                    title: "Installazione su iOS",
                    description: "Per installare, tocca l'icona di condivisione in Safari e seleziona 'Aggiungi a Home'",
                    duration: 5000,
                  });
                }}
                variant="default"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.462 16.927s-1.083 1.481-2.543 1.481c-1.35 0-1.813-.968-3.49-.968-1.595 0-2.124.935-3.43.935-1.35 0-2.377-1.342-3.49-2.672-1.907-2.274-2.09-6.27-.913-8.063 1.125-1.714 2.833-1.714 3.8-1.714.968 0 1.796.622 2.764.622 1.083 0 1.706-.622 2.93-.622 1.05 0 2.46.39 3.317 1.652-2.9 1.683-2.434 6.044.055 9.35zm-5.258-14.911c-.881 1.09-2.182 1.909-3.49 1.792-.156-1.42.51-2.869 1.35-3.798.881-.968 2.4-1.714 3.63-1.792.132 1.518-.49 2.903-1.49 3.798z"/>
                </svg>
                iOS
              </Button>
            </div>
            <div className="mt-4 text-xs text-red-500 text-center">
              Se i pulsanti non funzionano, prova ad accedere con Safari per iOS o Chrome per Android
            </div>
          </CardFooter>
        </Card>
      )}
      
      {/* Guida dettagliata all'installazione - mostra solo se l'app non è installata */}
      {!isInstalled && <InstallationGuide />}
    </div>
  );
}