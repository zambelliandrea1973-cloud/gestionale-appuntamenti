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
    
    // Se non c'è un prompt disponibile, mostra istruzioni per l'installazione manuale
    toast({
      title: "Installazione manuale",
      description: "Per installare questa app, usa il menu del browser (⋮) e seleziona 'Installa app'",
      duration: 8000
    });
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
          <CardFooter>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              onClick={handleInstallApp}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              {isIOS ? "Installa su iOS" : "Installa App"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}