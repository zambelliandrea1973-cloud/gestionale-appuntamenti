import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Phone, Mail, Download, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientFooterContactIcons from "@/components/ClientFooterContactIcons";

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
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showDataProtectionModal, setShowDataProtectionModal] = useState<boolean>(false);



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
        
        // Registra l'accesso del cliente (importante per conteggio)
        try {
          const accessResponse = await fetch(`/api/client-access/${clientCode}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-device-type': 'mobile' // PWA è sempre mobile
            },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              source: 'pwa'
            })
          });
          
          if (accessResponse.ok) {
            console.log('✅ Accesso PWA registrato per cliente:', clientCode);
          }
        } catch (error) {
          console.warn('Errore registrazione accesso PWA:', error);
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

        {/* PWA Installation Banner rimosso */}

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
                  {appointments.map((appointment) => {
                    const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
                    const now = new Date();
                    const isPast = appointmentDate < now;
                    
                    return (
                      <Card 
                        key={appointment.id} 
                        className={`border-l-4 ${
                          isPast 
                            ? 'border-l-gray-400 bg-gray-50 opacity-75' 
                            : 'border-l-blue-500 bg-white'
                        }`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={`font-semibold text-lg ${
                                isPast ? 'text-gray-600' : 'text-gray-900'
                              }`}>
                                {appointment.service}
                              </h3>
                              <div className={`flex items-center gap-2 mt-1 ${
                                isPast ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(appointment.date)}</span>
                              </div>
                              <div className={`flex items-center gap-2 mt-1 ${
                                isPast ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                <Clock className="h-4 w-4" />
                                <span>{appointment.time}</span>
                              </div>
                              {appointment.notes && (
                                <p className={`mt-2 text-sm ${
                                  isPast ? 'text-gray-500' : 'text-gray-600'
                                }`}>
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isPast 
                                ? 'bg-gray-200 text-gray-700'
                                : appointment.status === 'scheduled' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {isPast 
                                ? 'Completato' 
                                : appointment.status === 'scheduled' 
                                  ? 'Confermato' 
                                  : 'In attesa'
                              }
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Istruzioni PWA spostate a fondo pagina */}
        <Card className="bg-green-50 border-green-200 mt-8">
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
        
        {/* Footer completo con tutte le informazioni */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          {/* Informazioni di contatto del professionista */}
          <ClientFooterContactIcons />
          
          {/* Informazioni legali e versione */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={() => setShowPrivacyModal(true)}
                  className="hover:text-blue-600 transition-colors underline"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button 
                  onClick={() => setShowTermsModal(true)}
                  className="hover:text-blue-600 transition-colors underline"
                >
                  Termini di Servizio
                </button>
                <span>•</span>
                <button 
                  onClick={() => setShowDataProtectionModal(true)}
                  className="hover:text-blue-600 transition-colors underline"
                >
                  Protezione Dati
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <span>&copy; 2024 Gestionale Appuntamenti by Zambelli Andrea</span>
                <span>•</span>
                <span>Versione 2.4.1</span>
                <span>•</span>
                <a href="mailto:zambelli.andrea@libero.it" className="hover:text-blue-600 transition-colors">
                  Supporto Tecnico
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Modal Privacy Policy */}
        <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                Privacy Policy
                <Button variant="ghost" size="sm" onClick={() => setShowPrivacyModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold">1. Informazioni Generali</h3>
              <p>Il presente documento costituisce l'informativa privacy resa agli utenti che utilizzano i servizi del Gestionale Appuntamenti by Zambelli Andrea.</p>
              
              <h3 className="font-semibold">2. Titolare del Trattamento</h3>
              <p>Il Titolare del trattamento dei dati è Zambelli Andrea, con sede in Via Cavallotti, contattabile all'indirizzo zambelli.andrea@libero.it</p>
              
              <h3 className="font-semibold">3. Tipologie di Dati Raccolti</h3>
              <p>I dati personali raccolti comprendono: nome, cognome, data di nascita, codice fiscale, indirizzo email, numero di telefono, informazioni relative agli appuntamenti sanitari.</p>
              
              <h3 className="font-semibold">4. Finalità del Trattamento</h3>
              <p>I dati vengono trattati per: gestione degli appuntamenti, comunicazioni relative ai servizi sanitari, adempimenti di obblighi legali e contabili.</p>
              
              <h3 className="font-semibold">5. Base Giuridica</h3>
              <p>Il trattamento è basato sul consenso dell'interessato e sull'esecuzione di misure precontrattuali adottate su richiesta dello stesso.</p>
              
              <h3 className="font-semibold">6. Conservazione dei Dati</h3>
              <p>I dati saranno conservati per il tempo strettamente necessario al raggiungimento delle finalità per cui sono stati raccolti.</p>
              
              <h3 className="font-semibold">7. Diritti dell'Interessato</h3>
              <p>L'utente ha diritto di richiedere l'accesso, la rettifica, la cancellazione dei propri dati personali, nonché la limitazione del trattamento.</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Termini di Servizio */}
        <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                Termini di Servizio
                <Button variant="ghost" size="sm" onClick={() => setShowTermsModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold">1. Accettazione dei Termini</h3>
              <p>Utilizzando il Gestionale Appuntamenti by Zambelli Andrea, l'utente accetta integralmente i presenti termini di servizio.</p>
              
              <h3 className="font-semibold">2. Descrizione del Servizio</h3>
              <p>Il servizio consiste in una piattaforma digitale per la gestione degli appuntamenti e la consultazione delle proprie informazioni.</p>
              
              <h3 className="font-semibold">3. Registrazione e Account</h3>
              <p>Per utilizzare il servizio è necessario fornire informazioni accurate e complete durante la registrazione.</p>
              
              <h3 className="font-semibold">4. Uso Consentito</h3>
              <p>Il servizio deve essere utilizzato esclusivamente per finalità lecite e in conformità alle presenti condizioni.</p>
              
              <h3 className="font-semibold">5. Responsabilità dell'Utente</h3>
              <p>L'utente è responsabile della sicurezza delle proprie credenziali di accesso e dell'uso appropriato del servizio.</p>
              
              <h3 className="font-semibold">6. Limitazioni di Responsabilità</h3>
              <p>Il servizio è fornito "così com'è" senza garanzie di alcun tipo, esplicite o implicite.</p>
              
              <h3 className="font-semibold">7. Modifiche ai Termini</h3>
              <p>I presenti termini possono essere modificati in qualsiasi momento con preavviso agli utenti.</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Protezione Dati */}
        <Dialog open={showDataProtectionModal} onOpenChange={setShowDataProtectionModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                Protezione Dati
                <Button variant="ghost" size="sm" onClick={() => setShowDataProtectionModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold">1. Sicurezza dei Dati</h3>
              <p>Implementiamo misure tecniche e organizzative appropriate per proteggere i dati personali contro la distruzione, la perdita, la modifica, la divulgazione non autorizzata.</p>
              
              <h3 className="font-semibold">2. Crittografia</h3>
              <p>Tutti i dati sensibili sono protetti mediante crittografia avanzata durante la trasmissione e l'archiviazione.</p>
              
              <h3 className="font-semibold">3. Accesso ai Dati</h3>
              <p>L'accesso ai dati personali è limitato al personale autorizzato che ha necessità di conoscere tali informazioni per le finalità del trattamento.</p>
              
              <h3 className="font-semibold">4. Backup e Ripristino</h3>
              <p>Vengono eseguiti backup regolari dei dati per garantire la continuità del servizio e la protezione contro la perdita di informazioni.</p>
              
              <h3 className="font-semibold">5. Monitoraggio</h3>
              <p>I sistemi vengono costantemente monitorati per rilevare e prevenire accessi non autorizzati o attività sospette.</p>
              
              <h3 className="font-semibold">6. Formazione del Personale</h3>
              <p>Il personale riceve formazione regolare sulle procedure di sicurezza e protezione dei dati personali.</p>
              
              <h3 className="font-semibold">7. Segnalazione Violazioni</h3>
              <p>In caso di violazione dei dati personali, procediamo alla notifica tempestiva alle autorità competenti e agli interessati, se richiesto.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}