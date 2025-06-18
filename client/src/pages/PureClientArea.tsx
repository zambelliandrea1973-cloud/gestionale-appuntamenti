import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Phone, Mail, Download, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

// PWA Installation Banner Component
function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isPwaMode, setIsPwaMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Rileva se è in modalità PWA - metodo semplificato e affidabile
    const checkPwaMode = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInAppBrowser = (window.navigator as any).standalone === true;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const hasMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      const isPwaMode = isStandalone || isInAppBrowser || isFullscreen || hasMinimalUi;
      
      console.log(`📱 [PWA DETECTION] Standalone: ${isStandalone}, iOS: ${isInAppBrowser}, Fullscreen: ${isFullscreen}, MinimalUI: ${hasMinimalUi}, PWA Mode: ${isPwaMode}`);
      setIsPwaMode(isPwaMode);
      
      return isPwaMode;
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isPwaMode) {
        setShowInstallBanner(true);
      }
    };

    // Check iniziale
    checkPwaMode();
    
    // Ascolta per cambiamenti nella modalità di visualizzazione
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      console.log('📱 [PWA] Display mode cambiato, ricontrollo...');
      setTimeout(checkPwaMode, 500);
    };
    
    // Ascolta per eventi di appinstalled
    const handleAppInstalled = () => {
      console.log('📱 [PWA] App installata rilevata!');
      localStorage.setItem('pwa-installed', 'true');
      setIsPwaMode(true);
      setShowInstallBanner(false);
    };
    
    mediaQuery.addListener(handleDisplayModeChange);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      mediaQuery.removeListener(handleDisplayModeChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
        // Salva stato di installazione e forza aggiornamento
        localStorage.setItem('pwa-installed', 'true');
        setIsPwaMode(true);
      }
      setDeferredPrompt(null);
    }
  };

  // Banner che cambia in base allo stato PWA
  return (
    <div className="group">
      <div className={`${isPwaMode ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg transition-all duration-300 overflow-hidden`}>
        <div 
          className="p-3 cursor-pointer"
          onClick={() => !isPwaMode && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPwaMode ? (
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <Download className="h-4 w-4 text-blue-600 flex-shrink-0" />
              )}
              <span className={`text-sm font-medium ${isPwaMode ? 'text-green-700' : 'text-blue-700'}`}>
                {isPwaMode ? 'App correttamente installata' : 'Installa app sul tuo dispositivo'}
              </span>
            </div>
            {/* Mostra pulsante sempre quando non è PWA */}
            {!isPwaMode && (
              <Button 
                onClick={handleInstallClick} 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                Installa
              </Button>
            )}
          </div>
          
          {/* Istruzioni dettagliate espandibili con hover e click */}
          {!isPwaMode && (
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? 'max-h-[600px]' : 'max-h-0 group-hover:max-h-[600px]'
            }`}>
            <div className="pt-3 border-t border-blue-200 mt-3">
              {/* Pulsante chiusura sempre visibile quando espanso */}
              {isExpanded && (
                <div className="flex justify-end mb-3">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔴 [ANDROID] Pulsante X cliccato - chiudendo banner');
                      setIsExpanded(false);
                    }}
                    className="p-3 rounded-full hover:bg-blue-100 active:bg-blue-200 transition-colors bg-blue-50 border border-blue-300 shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <X className="h-5 w-5 text-blue-700" />
                  </button>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-blue-700">📱 Su Android:</p>
                  <div className="ml-4 space-y-1">
                    <p className="text-xs text-blue-600">1. Tocca il menù ⋮ in alto a destra</p>
                    <p className="text-xs text-blue-600">2. Seleziona "Aggiungi alla schermata Home"</p>
                    <p className="text-xs text-blue-600">3. Conferma "Installa" o "Aggiungi"</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700">🍎 Su iOS:</p>
                  <div className="ml-4 space-y-1">
                    <p className="text-xs text-blue-600">1. Tocca il pulsante Condividi 🔗</p>
                    <p className="text-xs text-blue-600">2. Scorri e tocca "Aggiungi alla schermata Home"</p>
                    <p className="text-xs text-blue-600">3. Tocca "Aggiungi" in alto a destra</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700">💻 Su Desktop:</p>
                  <div className="ml-4 space-y-1">
                    <p className="text-xs text-blue-600">1. Cerca l'icona + nella barra degli indirizzi</p>
                    <p className="text-xs text-blue-600">2. Clicca "Installa" quando appare</p>
                  </div>
                </div>
                <div className="bg-blue-100 p-3 rounded">
                  <p className="text-xs font-medium text-blue-700">✨ Vantaggi dell'installazione:</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-blue-600">• Accesso rapido dalla schermata principale</p>
                    <p className="text-xs text-blue-600">• Funziona anche senza connessione</p>
                    <p className="text-xs text-blue-600">• Esperienza app nativa</p>
                    <p className="text-xs text-blue-600">• Notifiche per i tuoi appuntamenti</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
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

interface ContactInfo {
  email: string;
  phone: string;
  phone1?: string;
  website?: string;
  instagram?: string;
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
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
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
        
        // Registra l'accesso del cliente (importante per conteggio)
        try {
          // Estrai clientId dal clientCode per registrare l'accesso
          // Formato: PROF_014_9C1F_CLIENT_1750163505034_340F
          const parts = clientCode.split('_');
          const clientId = parts.length >= 5 ? parts[4] : null;
          
          if (clientId) {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isInAppBrowser = (window.navigator as any).standalone === true;
            const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
            const hasMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
            const isPwaInstalled = localStorage.getItem('pwa-installed') === 'true';
            const isPWA = isStandalone || isInAppBrowser || isFullscreen || hasMinimalUi || isPwaInstalled;
            
            const accessInfo = {
              isPWA: isPWA,
              userAgent: navigator.userAgent,
              timestamp: Date.now(),
              accessType: isPWA ? 'pwa' : 'browser'
            };
            
            console.log(`📱 [PWA ACCESS] Tracking accesso cliente ${clientId}:`, accessInfo);
            
            const accessResponse = await apiRequest('POST', `/api/client-access/track/${clientId}`, accessInfo);
            if (accessResponse.ok) {
              const result = await accessResponse.json();
              console.log(`📱 [PWA ACCESS TRACKED] Cliente ${clientId} - Accesso registrato: ${result.accessCount} (${accessInfo.accessType})`);
            }
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
        
        // Carica informazioni contatto del professionista
        await loadOwnerContactInfo(clientData.ownerId);

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
      console.log(`📅 [PURE CLIENT] Caricamento appuntamenti per cliente ${clientId}`);
      const response = await fetch(`/api/client-appointments/${clientId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const appointmentsData = await response.json();
        setAppointments(appointmentsData || []);
        console.log(`✅ [PURE CLIENT] Caricati ${appointmentsData?.length || 0} appuntamenti`);
      } else {
        console.warn(`⚠️ [PURE CLIENT] Errore caricamento appuntamenti: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [PURE CLIENT] Errore caricamento appuntamenti:', error);
    }
  };

  const loadOwnerContactInfo = async (ownerId: number) => {
    try {
      console.log(`🏥 [PWA CONTACTS] Caricamento contatti per professionista ${ownerId}`);
      const response = await fetch(`/api/owner-contact-info/${ownerId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const contacts = await response.json();
        setContactInfo(contacts);
        console.log(`✅ [PWA CONTACTS] Contatti caricati:`, contacts);
      } else {
        console.warn(`⚠️ [PWA CONTACTS] Errore caricamento contatti: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [PWA CONTACTS] Errore caricamento contatti:', error);
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

        {/* Footer con informazioni di contatto del professionista */}
        {contactInfo && (
          <Card className="mt-8 bg-white/80 backdrop-blur-sm border-gray-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <h3 className="font-semibold text-gray-800">Informazioni di contatto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  {contactInfo.email && (
                    <div className="flex items-center justify-center gap-2">
                      <span>📧</span>
                      <a href={`mailto:${contactInfo.email}`} className="hover:text-blue-600">
                        {contactInfo.email}
                      </a>
                    </div>
                  )}
                  {contactInfo.phone1 && (
                    <div className="flex items-center justify-center gap-2">
                      <span>📱</span>
                      <a href={`tel:${contactInfo.phone1}`} className="hover:text-blue-600">
                        {contactInfo.phone1}
                      </a>
                    </div>
                  )}
                  {contactInfo.website && (
                    <div className="flex items-center justify-center gap-2">
                      <span>🌐</span>
                      <a href={`https://${contactInfo.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                        {contactInfo.website}
                      </a>
                    </div>
                  )}
                  {contactInfo.instagram && (
                    <div className="flex items-center justify-center gap-2">
                      <span>📷</span>
                      <a href={`https://instagram.com/${contactInfo.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                        @{contactInfo.instagram}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}