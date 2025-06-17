import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock, FileText, User, Link, ExternalLink, Copy, X, Download, Smartphone, Save, Loader2, ArrowLeft, ChevronLeft } from "lucide-react";
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
  const [accessTracked, setAccessTracked] = useState<boolean>(false); // Flag per evitare tracking duplicato
  const [pwaAccessMessage, setPwaAccessMessage] = useState<boolean>(false); // Flag per messaggio PWA
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false); // Flag per caricamento recupero

  // Funzione per registrare l'accesso del cliente - CONTEGGIO SEMPLICE SENZA LIMITI TEMPORALI
  const trackClientAccess = async (clientId: string) => {
    try {
      const response = await apiRequest('POST', `/api/client-access/track/${clientId}`, {});
      if (response.ok) {
        const result = await response.json();
        console.log(`📱 [PWA ACCESS TRACKED] Cliente ${clientId} - Accesso registrato: ${result.accessCount}`);
        setAccessTracked(true);
      }
    } catch (error) {
      console.error('Errore nel tracking accesso PWA:', error);
      // Non blocchiamo l'accesso per errori di tracking
    }
  };

  // Funzione per tentare il recupero dell'ultimo accesso PWA
  const tryRecoverLastAccess = async (ownerId: string) => {
    setRecoveryLoading(true);
    try {
      const response = await apiRequest('GET', `/api/client-access/last-access/${ownerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.clientId && data.isValid) {
          console.log(`📱 PWA: Recuperato ultimo accesso valido per cliente ${data.clientId}`);
          localStorage.setItem('clientAccessToken', data.token);
          localStorage.setItem('clientId', data.clientId.toString());
          setToken(data.token);
          verifyQRToken(data.token, data.clientId.toString());
          return;
        }
      }
    } catch (error) {
      console.error('Errore nel recupero ultimo accesso:', error);
    }
    setRecoveryLoading(false);
    setPwaAccessMessage(true);
  };
  
  useEffect(() => {
    // PRIORITÀ AI PARAMETRI QR - Controlla sempre prima i parametri URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = urlParams.get('token');
    const clientIdFromQuery = urlParams.get('clientId');
    const autoLoginFromQuery = urlParams.get('autoLogin');
    
    // ACCESSO DIRETTO VIA QR CODE - Priorità massima
    if (tokenFromQuery && clientIdFromQuery && autoLoginFromQuery === 'true') {
      console.log("🔐 QR Code Token rilevato - Accesso cliente diretto (priorità)");
      console.log(`Token: ${tokenFromQuery}`);
      console.log(`Client ID: ${clientIdFromQuery}`);
      
      // Salva nel localStorage per supporto PWA
      localStorage.setItem('clientAccessToken', tokenFromQuery);
      localStorage.setItem('clientId', clientIdFromQuery);
      
      // Imposta il token e verifica immediatamente
      setToken(tokenFromQuery);
      verifyQRToken(tokenFromQuery, clientIdFromQuery);
      return;
    }
    
    // Se non c'è token QR negli URL, verifica localStorage per PWA
    const storedToken = localStorage.getItem('clientAccessToken');
    const storedClientId = localStorage.getItem('clientId');
    
    if (storedToken && storedClientId) {
      console.log("📱 PWA Token salvato rilevato - Tentativo accesso cliente");
      setToken(storedToken);
      verifyQRToken(storedToken, storedClientId);
      return;
    }
    
    // Verifica se c'è un owner ID salvato per recuperare l'ultimo accesso
    const storedOwnerId = localStorage.getItem('ownerId');
    if (storedOwnerId) {
      console.log(`📱 PWA: Tentativo recupero ultimo accesso per proprietario ${storedOwnerId}`);
      tryRecoverLastAccess(storedOwnerId);
      return;
    }
    
    // Controllo PWA standalone - se siamo in PWA, NON fare controlli staff
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');
    
    if (isPWA) {
      console.log("📱 PWA rilevata - Skip controlli staff, mostra messaggio informativo");
      setLoading(false);
      setPwaAccessMessage(true);
      return;
    }
    
    // Solo ora verifica se l'utente è già autenticato come admin/staff
    const checkAdminAccess = async () => {
      try {
        const response = await apiRequest('GET', '/api/current-user');
        if (response.ok) {
          const userData = await response.json();
          
          // Se è admin/staff, reindirizza alla dashboard
          if (userData.type === "admin" || userData.type === "staff") {
            console.log("🚫 Admin/Staff rilevato - Reindirizzamento a dashboard");
            setLocation("/dashboard");
            return true;
          }
        }
      } catch (error) {
        console.log("Verifica admin fallita, procedo con autenticazione tradizionale");
      }
      return false;
    };
    
    // Verifica accesso admin solo se non ci sono token QR
    checkAdminAccess().then((isAdminAuthenticated) => {
      if (!isAdminAuthenticated) {
        // Fallback: verifica autenticazione tradizionale
        console.log("🔍 Nessun token QR - Verifica autenticazione tradizionale");
        fetchCurrentUser();
      }
    });
  }, []);

  useEffect(() => {
    if (user?.client?.id) {
      fetchClientAppointments(user.client.id);
    }
  }, [user]);

  const verifyQRToken = async (token: string, clientId: string) => {
    console.log(`🔐 Verifica token QR per cliente ${clientId}`);
    console.log(`🔐 Token ricevuto: ${token}`);
    setLoading(true);
    
    try {
      // NUOVO FORMATO GERARCHICO: PROF_XXX_XXXX_CLIENT_ID_HASH
      // Non verifichiamo più il formato locale, lasciamo che il server validi
      
      // Carica i dati del cliente direttamente tramite API dedicata
      const response = await apiRequest('POST', '/api/client-access/verify-token', {
        token: token,
        clientId: parseInt(clientId, 10)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ Errore verifica token: ${response.status} - ${errorData}`);
        throw new Error("Token non valido o scaduto");
      }
      
      const clientData = await response.json();
      console.log(`✅ Token QR valido - Cliente autenticato: ${clientData.client.firstName} ${clientData.client.lastName}`);
      
      // Estrai owner ID dal token gerarchico per user ID
      const ownerMatch = token.match(/^PROF_(\d{2,3})_/);
      const ownerId = ownerMatch ? parseInt(ownerMatch[1], 10) : parseInt(clientId, 10);
      
      // Imposta i dati utente direttamente
      setUser({
        id: ownerId,
        username: `client_${clientId}`,
        type: "client",
        client: clientData.client
      });
      
      // Registra l'accesso per il tracking
      if (!accessTracked) {
        trackClientAccess(clientId);
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error("Errore verifica token QR:", error);
      toast({
        title: "Token non valido",
        description: "Il QR code è scaduto o non valido. Richiedi un nuovo codice.",
        variant: "destructive",
      });
      
      // Pulisci localStorage e reindirizza al login
      localStorage.removeItem('clientAccessToken');
      localStorage.removeItem('clientId');
      setLocation("/client-login?expired=true");
    }
  };

  const fetchCurrentUser = async () => {
    try {
      // Verifichiamo se abbiamo un token nel localStorage (per supporto PWA)
      const storedToken = localStorage.getItem('clientAccessToken');
      const storedClientId = localStorage.getItem('clientId');

      // Se abbiamo token/clientId salvati nel localStorage, usiamoli per PWA
      if (storedToken && storedClientId) {
        console.log("📱 PWA: Tentativo auto-login con token localStorage");
        console.log(`Token salvato: ${storedToken}`);
        console.log(`Client ID salvato: ${storedClientId}`);
        
        try {
          const tokenResponse = await apiRequest('POST', '/api/client-access/verify-token', { 
            token: storedToken, 
            clientId: parseInt(storedClientId, 10) 
          });
          
          if (tokenResponse.ok) {
            const clientData = await tokenResponse.json();
            console.log("✅ PWA Auto-login riuscito con token localStorage");
            
            // Estrai owner ID dal token per user ID  
            const ownerMatch = storedToken.match(/^PROF_(\d{2,3})_/);
            const ownerId = ownerMatch ? parseInt(ownerMatch[1], 10) : parseInt(storedClientId, 10);
            
            setUser({
              id: ownerId,
              username: `client_${storedClientId}`,
              type: "client", 
              client: clientData.client
            });
            
            // Registra l'accesso PWA per il tracking
            if (!accessTracked) {
              trackClientAccess(storedClientId);
            }
            
            setLoading(false);
            return;
          } else {
            console.log("❌ PWA Auto-login fallito - token localStorage non valido");
            // Pulisci localStorage e procedi con autenticazione normale
            localStorage.removeItem('clientAccessToken');
            localStorage.removeItem('clientId');
          }
        } catch (tokenError) {
          console.error("Errore durante PWA auto-login:", tokenError);
          // Pulisci localStorage in caso di errore
          localStorage.removeItem('clientAccessToken');
          localStorage.removeItem('clientId');
        }
      }

      // Metodo standard di autenticazione basato su sessione
      const response = await apiRequest('GET', '/api/current-user');
      
      if (response.ok) {
        const userData = await response.json();
        
        // Verifica che l'utente sia SOLO un client, NON un customer
        if (userData.type !== "client") {
          toast({
            title: "Accesso negato",
            description: "Questa area è riservata ai clienti dei professionisti",
            variant: "destructive",
          });
          
          setLocation("/client-login?expired=true");
          return;
        }
        
        // Log per aiutare il debug
        console.log(`Utente client autorizzato ad accedere all'area clienti - clientId: ${userData.client?.id}`);
        
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

  // URL alternativo da usare per la schermata "App Chiusa"
  const CLOSE_PAGE_URL = "/close.html";

  // Stato per gestire il dialogo di chiusura sessione
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const handleLogout = () => {
    // Solo i clienti QR dovrebbero essere qui, mostra il dialogo di chiusura PWA
    setShowLogoutDialog(true);
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
  
  if (loading || recoveryLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          {recoveryLoading && (
            <p className="text-sm text-gray-600">Recupero ultimo accesso...</p>
          )}
        </div>
      </div>
    );
  }

  // Messaggio informativo per PWA senza dati di accesso
  if (pwaAccessMessage) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card className="border-[#4a6c33] border-2">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-[#4a6c33] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-lg text-slate-900">App Installata Correttamente</CardTitle>
            <CardDescription>
              Per accedere alla tua area personale, scansiona il codice QR fornito dal tuo professionista
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                L'app è ora installata sul tuo dispositivo. Per il primo accesso, utilizza il codice QR che ti è stato fornito.
              </p>
            </div>
            <Button 
              onClick={() => {
                // Pulisci solo i dati client, mantieni ownerId per future installazioni
                localStorage.removeItem('clientAccessToken');
                localStorage.removeItem('clientId');
                window.location.reload();
              }}
              variant="outline" 
              className="w-full"
            >
              Riprova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Componente per avviso token in scadenza per clienti QR code */}
      {token && user?.client?.id && <TokenExpiryAlert token={token} clientId={user.client.id} />}
      
      {/* Dialog di chiusura sessione */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
          <div className="flex flex-col items-center text-center p-6 pt-8 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-[#4a6c33] rounded-xl flex items-center justify-center mb-6">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-lg font-medium text-slate-900 mb-6">Sessione Chiusa</h2>
            
            <div className="w-full bg-[#f8fafc] p-5 rounded-lg mb-6">
              <p className="font-medium text-[#4a6c33] mb-5 text-left">Per uscire completamente dall'app:</p>
              
              <div className="mb-4 pb-4 border-b border-gray-100 opacity-30"></div>
              
              <div className="text-left mb-5">
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">2.</span>
                  <div>
                    <p>Premi <strong>nuovamente</strong> il tasto indietro</p>
                    <div className="flex justify-center gap-4 mt-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400">—</span>
                      </div>
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 text-center">
                Sono necessari <strong>due tocchi</strong> del tasto<br />indietro per uscire completamente.
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">Grazie per aver utilizzato l'Area Cliente.</p>
          </div>
        </DialogContent>
      </Dialog>
      
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
      
      {/* Componente PWA per clienti via QR code */}
      <PwaInstallButton />
    </div>
  );
}