import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Phone, Mail, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

// PWA Installation Banner Component
function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showInstallBanner) return null;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Installa App</p>
              <p className="text-sm text-blue-700">Aggiungi questa app alla schermata principale per un accesso rapido</p>
            </div>
          </div>
          <Button onClick={handleInstallClick} size="sm" className="bg-blue-600 hover:bg-blue-700">
            Installa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ClientData {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  uniqueCode: string;
  ownerId: number;
}

interface Appointment {
  id: number;
  date: string;
  time: string;
  service: string;
  status: string;
  notes?: string;
}

export default function PureClientArea() {
  const params = useParams();
  const [client, setClient] = useState<ClientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const initializeClientArea = async () => {
      try {
        const clientCode = params.clientCode;
        if (!clientCode) {
          setError("Codice di accesso non valido");
          setLoading(false);
          return;
        }

        console.log('🏠 [PURE CLIENT] Inizializzazione area cliente:', clientCode);
        
        // Aggiorna il manifest PWA per preservare il percorso del cliente
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          const newHref = `/manifest.json?clientToken=${clientCode}`;
          manifestLink.setAttribute('href', newHref);
          console.log(`📱 PWA: Manifest aggiornato per cliente: ${newHref}`);
          
          // Forza il refresh del manifest per dispositivi PWA
          const link = manifestLink.cloneNode(true);
          manifestLink.parentNode?.removeChild(manifestLink);
          document.head.appendChild(link);
        }
        
        // Carica dati cliente con autenticazione basata su codice
        console.log('🏠 [PURE CLIENT] Richiesta API per codice:', clientCode);
        const clientResponse = await fetch(`/api/client-by-code/${clientCode}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('🏠 [PURE CLIENT] Risposta API status:', clientResponse.status, clientResponse.statusText);

        if (!clientResponse.ok) {
          console.error('🏠 [PURE CLIENT] Errore API:', clientResponse.status, clientResponse.statusText);
          const errorText = await clientResponse.text();
          console.error('🏠 [PURE CLIENT] Dettagli errore:', errorText);
          setError(`Accesso non autorizzato (${clientResponse.status})`);
          setLoading(false);
          return;
        }

        const clientData = await clientResponse.json();
        console.log('🏠 [PURE CLIENT] Cliente caricato:', clientData.firstName, clientData.lastName);
        setClient(clientData);

        // Carica appuntamenti del cliente
        await loadClientAppointments(clientData.id, clientData.ownerId);

      } catch (error) {
        console.error('❌ [PURE CLIENT] Errore inizializzazione:', error);
        setError("Errore di connessione");
      } finally {
        setLoading(false);
      }
    };

    initializeClientArea();
  }, [params.clientCode]);

  const loadClientAppointments = async (clientId: number, ownerId: number) => {
    try {
      console.log('📅 [PURE CLIENT] Caricamento appuntamenti per cliente:', clientId);
      
      const response = await fetch(`/api/client-appointments/${clientId}?ownerId=${ownerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const appointmentsData = await response.json();
        setAppointments(appointmentsData);
        console.log('📅 [PURE CLIENT] Appuntamenti caricati:', appointmentsData.length);
      }
    } catch (error) {
      console.error('❌ [PURE CLIENT] Errore caricamento appuntamenti:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento area personale...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Accesso Negato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error || "Impossibile accedere all'area personale"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Cliente */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Benvenuto, {client.firstName} {client.lastName}
            </CardTitle>
            <CardDescription>
              La tua area personale per consultare i tuoi appuntamenti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PWA Installation Banner */}
        <PWAInstallBanner />

        {/* Istruzioni PWA */}
        <Card className="bg-green-50 border-green-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Download className="h-5 w-5" />
              Installa App sul tuo dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-green-700">
              <p><strong>📱 Su Android:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Tocca il menu ⋮ in alto a destra</li>
                <li>Seleziona "Aggiungi alla schermata Home"</li>
                <li>Conferma "Installa" o "Aggiungi"</li>
              </ol>
              
              <p><strong>🍎 Su iOS:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Tocca il pulsante Condividi 📤</li>
                <li>Scorri e tocca "Aggiungi alla schermata Home"</li>
                <li>Tocca "Aggiungi" in alto a destra</li>
              </ol>
              
              <p><strong>💻 Su Desktop:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Cerca l'icona + nella barra degli indirizzi</li>
                <li>Clicca "Installa" quando appare</li>
              </ol>
              
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="font-medium">✨ Vantaggi dell'installazione:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Accesso rapido dalla schermata principale</li>
                  <li>Funziona anche senza connessione</li>
                  <li>Esperienza app nativa</li>
                  <li>Notifiche per i tuoi appuntamenti</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista Appuntamenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-green-600" />
              I Tuoi Appuntamenti
            </CardTitle>
            <CardDescription>
              La tua area personale per consultare i tuoi appuntamenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nessun appuntamento programmato</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{appointment.service}</h3>
                            <div className="flex items-center gap-2 text-gray-600 mt-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(appointment.date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 mt-1">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.time}</span>
                            </div>
                            {appointment.notes && (
                              <p className="text-gray-600 mt-2 text-sm">{appointment.notes}</p>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'scheduled' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.status === 'scheduled' ? 'Confermato' : 'In attesa'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}