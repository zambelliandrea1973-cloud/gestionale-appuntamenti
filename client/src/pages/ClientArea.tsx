import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock, FileText, User, Link, ExternalLink, Copy, X, Download, Smartphone } from "lucide-react";
import { DirectLinkAccess } from "@/components/DirectLinkAccess";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { TokenExpiryAlert } from "@/components/TokenExpiryAlert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
    
    // Recupera il token dalla query string
    const tokenFromQuery = new URLSearchParams(window.location.search).get('token');
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
    }
  }, []);

  useEffect(() => {
    if (user?.client?.id) {
      fetchClientAppointments(user.client.id);
    }
  }, [user]);

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

      {/* I componenti PwaInstallButton e DirectLinkAccess sono stati rimossi da qui per evitare duplicazioni */}

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
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowAllAppointments(false);
                      }}
                    >
                      {appointment.status === "completed" ? "Completato" : "Dettagli"}
                    </Button>
                  </div>
                </div>
              );
            })}
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
          
      {/* Link diretto universale */}
      <Card className="mb-8 border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Link className="mr-2 h-5 w-5 text-blue-600" /> 
            Link Diretto all'Area Cliente
          </CardTitle>
          <CardDescription>
            Salva questo link per accedere direttamente alla tua area cliente in futuro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.client?.id && (
            <div className="space-y-4">
              <p className="text-sm">
                Invece di scansionare il QR code ogni volta, puoi salvare questo link nei preferiti del browser o sulla schermata home del tuo dispositivo per un accesso rapido:
              </p>
              
              <div className="flex items-center space-x-2 mb-4">
                <div className="border rounded-md p-2 flex-1 bg-white overflow-hidden">
                  <p className="text-sm text-muted-foreground truncate">
                    {user?.client && `${window.location.origin}/auto-login?token=${new URLSearchParams(window.location.search).get('token')}&clientId=${user.client.id}`}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (user?.client) {
                      const directLink = `${window.location.origin}/auto-login?token=${new URLSearchParams(window.location.search).get('token')}&clientId=${user.client.id}`;
                      navigator.clipboard.writeText(directLink)
                        .then(() => {
                          toast({
                            title: "Link copiato",
                            description: "Il link è stato copiato negli appunti",
                          });
                        })
                        .catch(err => {
                          toast({
                            title: "Errore",
                            description: "Impossibile copiare il link",
                            variant: "destructive",
                          });
                        });
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                Questo link ti porterà all'area cliente con il tuo nome utente già inserito. Dovrai inserire solo la password.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3 flex-col sm:flex-row">
          <Button 
            onClick={() => {
              if (user?.client) {
                const directLink = `${window.location.origin}/auto-login?token=${new URLSearchParams(window.location.search).get('token')}&clientId=${user.client.id}`;
                navigator.clipboard.writeText(directLink)
                  .then(() => {
                    toast({
                      title: "Link copiato",
                      description: "Salvalo nei preferiti o sulla schermata home del tuo dispositivo!",
                    });
                  })
                  .catch(err => {
                    toast({
                      title: "Errore",
                      description: "Impossibile copiare il link",
                      variant: "destructive",
                    });
                  });
              }
            }} 
            className="w-full gap-2"
            variant="default"
          >
            <ExternalLink className="h-4 w-4" />
            Copia il link per accesso diretto
          </Button>
          
          <Button 
            onClick={() => {
              // Dispatch an event that will be caught by the PwaInstallButton component
              const event = new Event('pwaInstallReady');
              window.dispatchEvent(event);
              
              // Istruzioni basate sul browser e sistema operativo
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              const isAndroid = /Android/.test(navigator.userAgent);
              const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
              const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
              const isDuckDuckGo = /DuckDuckGo/.test(navigator.userAgent);
              
              if (window.__installPromptEvent) {
                window.__installPromptEvent.prompt();
                toast({
                  title: "Installazione app",
                  description: "Segui le istruzioni per installare l'app sul tuo dispositivo",
                });
              } else {
                let instructions = "";
                
                if (isIOS && isSafari) {
                  instructions = "Premi l'icona 'Condividi' (il quadrato con la freccia in alto) e seleziona 'Aggiungi alla schermata Home'";
                } else if (isIOS) {
                  instructions = "Apri questa pagina in Safari, premi l'icona 'Condividi' e seleziona 'Aggiungi alla schermata Home'";
                } else if (isAndroid && isChrome) {
                  instructions = "Premi i tre puntini in alto a destra e seleziona 'Aggiungi a schermata Home'";
                } else if (isAndroid && isDuckDuckGo) {
                  instructions = "Apri questa pagina in Chrome, quindi premi i tre puntini in alto a destra e seleziona 'Aggiungi a schermata Home'";
                } else {
                  instructions = "Visita questa pagina utilizzando Chrome o Safari";
                }
                
                toast({
                  title: "Installazione manuale",
                  description: instructions,
                  duration: 7000,
                });
              }
            }}
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            variant="default"
          >
            <Download className="h-4 w-4" />
            Installa app sul dispositivo
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}