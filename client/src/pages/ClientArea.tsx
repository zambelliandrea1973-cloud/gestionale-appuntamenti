import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock, FileText, User, Link, ExternalLink, Copy, X, Download, Smartphone, Save, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { DirectLinkAccess } from "@/components/DirectLinkAccess";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { TokenExpiryAlert } from "@/components/TokenExpiryAlert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const [showEditProfile, setShowEditProfile] = useState<boolean>(false);
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);

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

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      
      // Rimuovi i dati di autenticazione dal localStorage
      localStorage.removeItem('clientAccessToken');
      localStorage.removeItem('clientId');
      localStorage.removeItem('clientUsername');
      
      toast({
        title: "Logout effettuato",
        description: "Hai effettuato il logout con successo",
      });
      // In caso di logout volontario, non mostriamo il messaggio di sessione scaduta
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
                  {user.client.address && <p><strong>Indirizzo:</strong> {user.client.address}</p>}
                  {user.client.birthday && <p><strong>Data di nascita:</strong> {formatDate(user.client.birthday)}</p>}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full text-sm" 
              size="sm"
              onClick={() => setShowEditProfile(true)}
            >
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
      
      {/* Dialog per la modifica del profilo */}
      {user?.client && (
        <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
          <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Modifica Profilo
              </DialogTitle>
              <DialogDescription>
                Aggiorna i tuoi dati personali
              </DialogDescription>
            </DialogHeader>
            
            <ProfileEditForm 
              client={user.client} 
              onSave={async (updatedData) => {
                setUpdatingProfile(true);
                try {
                  if (!user?.client?.id) {
                    throw new Error("ID cliente non disponibile");
                  }
                  
                  // Chiama l'endpoint API per aggiornare il profilo
                  const response = await apiRequest(
                    'PUT',
                    `/api/clients/${user.client?.id}`,
                    updatedData
                  );
                  
                  if (response.ok) {
                    const updatedClient = await response.json();
                    
                    // Aggiorna i dati dell'utente nello stato
                    setUser({
                      ...user,
                      client: updatedClient
                    });
                    
                    // Invalidare tutte le query relative ai clienti per aggiornare i dati nella dashboard
                    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                    // Invalidare anche la query specifica per questo cliente
                    queryClient.invalidateQueries({ queryKey: [`/api/clients/${user.client?.id}`] });
                    
                    toast({
                      title: "Profilo aggiornato",
                      description: "I tuoi dati sono stati aggiornati con successo",
                    });
                    
                    // Chiudi il dialog
                    setShowEditProfile(false);
                  } else {
                    const error = await response.json();
                    throw new Error(error.message || "Errore durante l'aggiornamento del profilo");
                  }
                } catch (error: any) {
                  console.error("Errore durante l'aggiornamento del profilo:", error);
                  toast({
                    title: "Errore",
                    description: error.message || "Si è verificato un errore durante l'aggiornamento del profilo",
                    variant: "destructive",
                  });
                } finally {
                  setUpdatingProfile(false);
                }
              }}
              isUpdating={updatingProfile}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Componente per il form di modifica del profilo
interface ProfileEditFormProps {
  client: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    birthday?: string;
  };
  onSave: (data: any) => void;
  isUpdating: boolean;
}

function ProfileEditForm({ client, onSave, isUpdating }: ProfileEditFormProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  // Schema di validazione con Zod
  const profileSchema = z.object({
    firstName: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
    lastName: z.string().min(2, "Il cognome deve contenere almeno 2 caratteri"),
    phone: z.string().min(5, "Inserisci un numero di telefono valido"),
    email: z.string().email("Inserisci un indirizzo email valido").optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    birthday: z.string().optional().or(z.literal("")),
  });

  // Configura il form
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      birthday: client.birthday || "",
    },
  });

  // Handler per l'invio del form
  function onSubmit(values: z.infer<typeof profileSchema>) {
    onSave(values);
  }
  
  // Funzione per gestire i passi
  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Componente per il progresso
  const Progress = () => (
    <div className="flex items-center justify-between mb-6 mt-2">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-3 rounded-full ${
            s <= step ? "bg-primary" : "bg-muted"
          } transition-all`}
          style={{
            width: `${100 / totalSteps - 4}%`,
          }}
        />
      ))}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Progress />
        
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-3 duration-300">
            <h3 className="text-lg font-semibold">Dati Personali</h3>
            
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci il nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cognome</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci il cognome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-4">
              <Button 
                type="button" 
                onClick={nextStep}
                className="w-full"
              >
                Continua
              </Button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
            <h3 className="text-lg font-semibold">Contatti</h3>
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci il numero di telefono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci l'email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
              >
                Indietro
              </Button>
              <Button 
                type="button" 
                onClick={nextStep}
              >
                Continua
              </Button>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
            <h3 className="text-lg font-semibold">Informazioni Addizionali</h3>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci l'indirizzo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di nascita (opzionale)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
              >
                Indietro
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="bg-primary text-white"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Salva modifiche
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}