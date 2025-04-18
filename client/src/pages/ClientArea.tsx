import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock, FileText, User, Link, ExternalLink, Copy, X, Download, Smartphone, Save, Loader2 } from "lucide-react";
import { DirectLinkAccess } from "@/components/DirectLinkAccess";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { TokenExpiryAlert } from "@/components/TokenExpiryAlert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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
    address?: string;
    birthday?: string;
    hasConsent: boolean;
  };
}

export default function ClientArea() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [futureAppointments, setFutureAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(true);
  const [showAllAppointments, setShowAllAppointments] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [token, setToken] = useState<string>("");
  
  useEffect(() => {
    // Verifica autenticazione
    fetchCurrentUser();
    
    // Recupera il token dalla query string o da localStorage per supporto PWA
    const tokenFromQuery = new URLSearchParams(window.location.search).get('token');
    let tokenToUse = tokenFromQuery;
    
    // Se c'è un token nell'URL, salvalo nel localStorage per il supporto PWA
    if (tokenFromQuery) {
      localStorage.setItem('clientAccessToken', tokenFromQuery);
    } 
    // Se non c'è un token nell'URL ma c'è nel localStorage, usalo
    else if (!tokenFromQuery) {
      const storedToken = localStorage.getItem('clientAccessToken');
      if (storedToken) {
        tokenToUse = storedToken;
        console.log("Token recuperato da localStorage per supporto PWA");
      }
    }
    
    // Imposta il token
    if (tokenToUse) {
      setToken(tokenToUse);
    }
  }, []);

  useEffect(() => {
    if (user?.client?.id) {
      fetchClientAppointments(user.client.id);
    }
  }, [user]);

  const fetchCurrentUser = async () => {
    try {
      // Verifichiamo se abbiamo un token nel localStorage (per supporto PWA)
      const storedToken = localStorage.getItem('clientAccessToken');
      const storedClientId = localStorage.getItem('clientId');

      // Se siamo in una PWA installata e abbiamo token/clientId salvati nel localStorage,
      // usiamoli per tentare l'autenticazione tramite API specifica
      if (window.matchMedia('(display-mode: standalone)').matches && 
          storedToken && storedClientId) {
        console.log("PWA in modalità standalone, tentativo di auto-login con token salvato");
        try {
          const tokenResponse = await apiRequest('POST', '/api/verify-token', { 
            token: storedToken, 
            clientId: parseInt(storedClientId, 10) 
          });
          
          if (tokenResponse.ok) {
            const tokenResult = await tokenResponse.json();
            setUser(tokenResult);
            setLoading(false);
            return;
          }
          // Se il token non è valido, continua con il metodo normale (sessione)
          console.log("Auto-login con token fallito, prova con sessione standard");
        } catch (tokenError) {
          console.error("Errore durante l'auto-login con token:", tokenError);
        }
      }

      // Metodo standard di autenticazione basato su sessione
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
          
          setLocation("/client-login?expired=true");
          return;
        }
        
        // Se è un cliente valido, salviamo l'ID nel localStorage per supporto PWA
        if (userData.client?.id) {
          localStorage.setItem('clientId', userData.client.id.toString());
        }
        
        setUser(userData);
      } else {
        // Se non autenticato, reindirizza alla pagina di login con parametro di sessione scaduta
        console.log("Sessione non valida o scaduta, redirezione a login con parametro expired=true");
        setLocation("/client-login?expired=true");
      }
    } catch (error) {
      console.error("Errore nel caricamento dell'utente corrente:", error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile verificare l'autenticazione",
        variant: "destructive",
      });
      
      setLocation("/client-login?expired=true");
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
        
        // Filtra solo gli appuntamenti futuri
        const now = new Date();
        const onlyFutureAppointments = sortedAppointments.filter((app: any) => {
          const appointmentDate = new Date(`${app.date}T${app.startTime}`);
          return appointmentDate >= now;
        });
        
        setFutureAppointments(onlyFutureAppointments);
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

  const handleLogout = () => {
    // Se siamo in una PWA installata (modalità standalone), non facciamo nulla
    // L'utente userà i controlli di sistema per chiudere l'app
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }
    
    // Metodo 1: Prova a chiudere la finestra corrente (funziona solo in alcuni casi)
    window.close();
    
    // Metodo 2: Prova a usare history.back() se era aperta da un'altra pagina
    setTimeout(() => {
      try {
        window.history.back();
      } catch (e) {
        // Ignorato
      }
    }, 100);
    
    // Metodo 3: Reindirizza a una pagina vuota che chiude se stessa (quasi sempre funziona)
    setTimeout(() => {
      const closePage = window.open('', '_self');
      if (closePage) {
        closePage.document.write(`
          <html>
            <head>
              <title>Chiusura...</title>
              <style>
                body { 
                  font-family: Arial, sans-serif;
                  background-color: #f5f5f5;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                }
                div {
                  text-align: center;
                  background-color: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h3 { margin-top: 0; }
                button {
                  background-color: #4a88bd;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  padding: 8px 16px;
                  cursor: pointer;
                  margin-top: 10px;
                }
              </style>
            </head>
            <body>
              <div>
                <h3>App chiusa</h3>
                <p>Puoi chiudere questa pagina o riaprire l'app.</p>
                <button onclick="window.close()">Chiudi</button>
              </div>
              <script>
                // Prova a chiudere automaticamente
                window.close();
              </script>
            </body>
          </html>
        `);
        closePage.document.close();
      }
    }, 200);
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
  
  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Componente per avviso token in scadenza */}
      {token && user?.client?.id && <TokenExpiryAlert token={token} clientId={user.client.id} />}
      
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
                  {user.client.address && <p><strong>Indirizzo:</strong> {user.client.address}</p>}
                  {user.client.birthday && <p><strong>Data di nascita:</strong> {formatDate(user.client.birthday)}</p>}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
              Per aggiornare i dati contatta il tuo professionista
            </p>
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
                : futureAppointments.length > 0 
                  ? `Hai ${futureAppointments.length} appuntament${futureAppointments.length === 1 ? 'o' : 'i'} futur${futureAppointments.length === 1 ? 'o' : 'i'}` 
                  : "Nessun appuntamento futuro programmato"}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full text-sm" 
              size="sm"
              onClick={() => setShowAllAppointments(true)}
            >
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

      {/* Componente di accesso diretto minimizzabile (tirolo) */}
      {token && user?.client?.id && (
        <DirectLinkAccess token={token} clientId={user.client.id} />
      )}
      
      {/* La sezione "I tuoi prossimi appuntamenti" è stata nascosta e sostituita dal dialog */}
      
      {/* Dialog per visualizzare tutti gli appuntamenti */}
      <Dialog open={showAllAppointments} onOpenChange={setShowAllAppointments}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Tutti i tuoi appuntamenti
            </DialogTitle>
            <DialogDescription>
              Visualizza tutti i tuoi appuntamenti passati e futuri
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {appointments.map((appointment) => {
              // Verifica se l'appuntamento è passato
              const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}`);
              const isExpired = appointmentDate < new Date();
              
              return (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between 
                    ${isExpired ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}
                >
                  <div className="flex-1 mb-3 md:mb-0">
                    <div className="font-medium flex items-center">
                      {appointment.serviceName}
                      {isExpired && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                          Passato
                        </span>
                      )}
                      {!isExpired && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                          Futuro
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-col md:flex-row md:gap-4">
                      <span className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        {formatDate(appointment.date)}
                      </span>
                      <span className="flex items-center mt-1 md:mt-0">
                        <Clock className="mr-2 h-4 w-4" />
                        {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      Dettagli
                    </Button>
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
                  </div>
                </div>
              );
            })}
            
            {appointments.length === 0 && !loadingAppointments && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Non hai ancora nessun appuntamento</p>
              </div>
            )}
            
            {loadingAppointments && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Chiudi
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per visualizzare i dettagli di un appuntamento */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Dettagli Appuntamento
            </DialogTitle>
            <DialogDescription>
              Informazioni dettagliate sul trattamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{selectedAppointment.serviceName}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data</p>
                    <p className="text-sm">{formatDate(selectedAppointment.date)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Orario</p>
                    <p className="text-sm">{formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Durata</p>
                    <p className="text-sm">{selectedAppointment.duration} minuti</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stato</p>
                    <div className="flex items-center">
                      {selectedAppointment.status === "completed" ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Completato</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Programmato</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedAppointment.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Note</p>
                    <p className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md">{selectedAppointment.notes}</p>
                  </div>
                )}
                
                {selectedAppointment.reminderSent && !selectedAppointment.reminderConfirmed && (
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        confirmAppointmentReminder(selectedAppointment.id);
                        setSelectedAppointment(null);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Conferma appuntamento
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Chiudi
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Componente per l'installazione dell'app PWA */}
      <PwaInstallButton />
    </div>
  );
}