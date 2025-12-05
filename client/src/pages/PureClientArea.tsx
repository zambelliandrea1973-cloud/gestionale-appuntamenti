import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Phone, Mail, Download, X, ChevronDown, ChevronUp, Plus, CheckCircle, XCircle, AlertCircle, ArrowRight, FileText } from "lucide-react";
import { SiInstagram, SiGmail } from "react-icons/si";
import { FaPhone, FaGlobe, FaWhatsapp } from "react-icons/fa";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

interface Service {
  id: number;
  name: string;
  duration: number;
  color: string;
  price: number;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  specialization?: string | null;
}

interface BookingRequest {
  id: number;
  serviceId: number;
  requestedDate: string;
  requestedTimeStart: string;
  requestedTimeEnd: string;
  proposedSlots: { start: string; end: string }[];
  selectedSlot?: { start: string; end: string };
  status: string;
  clientNotes?: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  tax: number;
  date: string;
  dueDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

// Componente per richiesta appuntamento
function BookingRequestSection({ clientCode }: { clientCode: string }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDayPart, setSelectedDayPart] = useState("");
  const [notes, setNotes] = useState("");
  const [proposedSlots, setProposedSlots] = useState<{ start: string; end: string }[]>([]);
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
  
  // Query servizi disponibili
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/client-services', clientCode],
    queryFn: async () => {
      const res = await fetch(`/api/client-services?clientCode=${clientCode}`);
      if (!res.ok) throw new Error('Failed to load services');
      return res.json();
    }
  });
  
  // Query collaboratori disponibili
  const { data: staffList = [] } = useQuery<StaffMember[]>({
    queryKey: ['/api/client-staff', clientCode],
    queryFn: async () => {
      const res = await fetch(`/api/client-staff?clientCode=${clientCode}`);
      if (!res.ok) throw new Error('Failed to load staff');
      return res.json();
    }
  });
  
  // Query richieste esistenti del cliente
  const { data: bookingRequests = [] } = useQuery<BookingRequest[]>({
    queryKey: ['bookingRequests', clientCode],
    queryFn: async () => {
      const res = await fetch(`/api/booking-requests?clientCode=${clientCode}`);
      if (!res.ok) throw new Error('Failed to load requests');
      return res.json();
    }
  });
  
  // Mutation per creare richiesta
  const createRequest = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create request');
      return res.json();
    },
    onSuccess: (data) => {
      const requestId = data.request?.id || data.id;
      setCreatedRequestId(requestId);
      setProposedSlots(data.proposedSlots || []);
      setStep(5);
      queryClient.invalidateQueries({ queryKey: ['bookingRequests', clientCode] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Impossibile creare la richiesta. Riprova."
      });
    }
  });
  
  // Mutation per selezionare slot
  const selectSlot = useMutation({
    mutationFn: async ({ requestId, slotIndex }: { requestId: number; slotIndex: number }) => {
      const res = await fetch(`/api/booking-requests/${requestId}/select-slot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSlotIndex: slotIndex, clientCode })
      });
      if (!res.ok) throw new Error('Failed to select slot');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingRequests', clientCode] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Richiesta inviata!",
        description: "Riceverai una conferma appena approvata."
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Impossibile selezionare lo slot. Riprova."
      });
    }
  });
  
  const dayParts = [
    { label: 'Mattina (09:00-13:00)', value: 'morning', start: '09:00', end: '13:00' },
    { label: 'Pomeriggio (14:00-18:00)', value: 'afternoon', start: '14:00', end: '18:00' },
    { label: 'Sera (18:00-21:00)', value: 'evening', start: '18:00', end: '21:00' }
  ];
  
  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate("");
    setSelectedDayPart("");
    setNotes("");
    setProposedSlots([]);
    setCreatedRequestId(null);
  };
  
  const handleSubmit = () => {
    const dayPart = dayParts.find(d => d.value === selectedDayPart);
    if (!selectedService || !selectedDate || !dayPart) return;
    
    createRequest.mutate({
      clientCode,
      serviceId: selectedService,
      staffId: selectedStaff || undefined,
      requestedDate: selectedDate,
      requestedTimeStart: dayPart.start,
      requestedTimeEnd: dayPart.end,
      clientNotes: notes
    });
  };
  
  const canContinue = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return true; // Staff opzionale, sempre passabile
    if (step === 3) return selectedDate !== "";
    if (step === 4) return selectedDayPart !== "";
    return false;
  };
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          Richiedi Appuntamento
        </CardTitle>
        <CardDescription>
          Richiedi un nuovo appuntamento selezionando servizio, data e fascia oraria
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full" data-testid="button-request-appointment">
            <Plus className="h-4 w-4 mr-2" />
            Nuova Richiesta
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`flex-1 h-2 rounded ${step >= s ? 'bg-blue-600' : 'bg-gray-200'} ${s < 5 ? 'mr-2' : ''}`} />
              ))}
            </div>
            
            {step === 1 && (
              <div className="space-y-3">
                <Label>Seleziona Servizio</Label>
                {services.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center" data-testid="empty-services">
                    <p className="text-gray-600">Nessun servizio disponibile al momento.</p>
                    <p className="text-sm text-gray-500 mt-1">Contatta il centro per maggiori informazioni.</p>
                  </div>
                ) : (
                  <Select value={selectedService?.toString() || ""} onValueChange={(v) => setSelectedService(parseInt(v))}>
                    <SelectTrigger data-testid="select-service">
                      <SelectValue placeholder="Scegli un servizio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name} ({s.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                )}
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-3">
                <Label>Professionista Preferito (opzionale)</Label>
                <Select value={selectedStaff?.toString() || "none"} onValueChange={(v) => setSelectedStaff(v === "none" ? null : parseInt(v))}>
                  <SelectTrigger data-testid="select-staff">
                    <SelectValue placeholder="Scegli professionista..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna Preferenza</SelectItem>
                    {staffList.map(staff => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.firstName} {staff.lastName}
                        {staff.specialization && ` - ${staff.specialization}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-2">
                  Puoi indicare un professionista specifico oppure lasciare "Nessuna Preferenza"
                </p>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-3">
                <Label>Seleziona Data</Label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-md"
                  data-testid="input-date"
                />
              </div>
            )}
            
            {step === 4 && (
              <div className="space-y-3">
                <Label>Seleziona Fascia Oraria</Label>
                <Select value={selectedDayPart} onValueChange={setSelectedDayPart}>
                  <SelectTrigger data-testid="select-timeframe">
                    <SelectValue placeholder="Scegli fascia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dayParts.map(dp => (
                      <SelectItem key={dp.value} value={dp.value}>
                        {dp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="mt-4">Note (opzionali)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eventuali note o preferenze..."
                  data-testid="textarea-notes"
                />
              </div>
            )}
            
            {step === 5 && (
              <div className="space-y-3">
                <Label>Slot Disponibili</Label>
                {proposedSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-orange-500" />
                    <p>Nessuno slot disponibile in questa fascia oraria.</p>
                    <p className="text-sm mt-2">Prova con un'altra data o fascia.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {proposedSlots.map((slot, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                        onClick={() => createdRequestId && selectSlot.mutate({ requestId: createdRequestId, slotIndex: idx })}
                        disabled={!createdRequestId || selectSlot.isPending}
                        data-testid={`button-slot-${idx}`}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {slot.start} - {slot.end}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 mt-4">
              {step > 1 && step < 5 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-back">
                  Indietro
                </Button>
              )}
              {step < 4 && (
                <Button onClick={() => setStep(step + 1)} disabled={!canContinue()} className="flex-1" data-testid="button-next">
                  Continua
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {step === 4 && (
                <Button onClick={handleSubmit} disabled={!canContinue() || createRequest.isPending} className="flex-1" data-testid="button-submit">
                  {createRequest.isPending ? 'Invio...' : 'Invia Richiesta'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} data-testid="button-cancel">
                Annulla
              </Button>
            </div>
          </div>
        )}
        
        {/* Lista Richieste Esistenti */}
        {bookingRequests.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4 text-gray-700">Le tue richieste</h3>
            <div className="space-y-3">
              {bookingRequests.map((req) => {
                const service = services.find(s => s.id === req.serviceId);
                const statusConfig = {
                  slots_proposed: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', label: 'Scegli slot', icon: AlertCircle },
                  client_selected: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', label: 'In attesa', icon: Clock },
                  admin_confirmed: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', label: 'Approvato ✓', icon: CheckCircle },
                  rejected: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', label: 'Respinta', icon: XCircle }
                };
                const config = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.slots_proposed;
                const Icon = config.icon;
                
                return (
                  <Card key={req.id} className={`border-l-4 ${config.border} ${config.bg}`} data-testid={`booking-request-${req.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{service?.name || 'Servizio'}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(req.requestedDate).toLocaleDateString('it-IT')} - 
                            {req.requestedTimeStart}-{req.requestedTimeEnd}
                          </p>
                          {req.selectedSlot && (
                            <p className="text-sm font-medium text-blue-600 mt-1">
                              Slot selezionato: {req.selectedSlot.start} - {req.selectedSlot.end}
                            </p>
                          )}
                          {req.clientNotes && (
                            <p className="text-sm text-gray-500 mt-2 italic">"{req.clientNotes}"</p>
                          )}
                        </div>
                        <Badge className={`${config.bg} ${config.text} border-0 flex items-center gap-1`} data-testid={`status-badge-${req.id}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PureClientArea() {
  const params = useParams();
  const [client, setClient] = useState<ClientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showDataProtectionModal, setShowDataProtectionModal] = useState<boolean>(false);
  const [contactInfo, setContactInfo] = useState<any>({});
  const [showInstallInstructions, setShowInstallInstructions] = useState<boolean>(false);

  // Funzione per caricare le informazioni di contatto del professionista tramite ownerId
  const loadContactInfo = async (ownerId?: number) => {
    try {
      if (!ownerId) {
        console.log('📞 [CLIENT FOOTER] Nessun ownerId fornito');
        return;
      }
      
      const response = await fetch(`/api/owner-contact-info/${ownerId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContactInfo(data);
        console.log('📞 [CLIENT FOOTER] Informazioni contatto caricate per owner:', ownerId, data);
      } else {
        console.error('📞 [CLIENT FOOTER] Errore response:', response.status);
      }
    } catch (error) {
      console.error('❌ [CLIENT FOOTER] Errore caricamento contatti:', error);
    }
  };

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
        
        // Registra l'accesso del cliente e ottieni token di autenticazione
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
            const accessData = await accessResponse.json();
            if (accessData.token) {
              localStorage.setItem('clientToken', accessData.token);
              console.log('✅ Accesso PWA registrato e token salvato per cliente:', clientCode);
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
        
        // Carica fatture del cliente
        await loadClientInvoices(clientData.uniqueCode);
        
        // Carica le informazioni di contatto del professionista
        await loadContactInfo(clientData.ownerId);
        


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
      
      // Usa il clientCode (uniqueCode) invece di clientId
      const clientCode = client?.uniqueCode || params.clientCode;
      const token = localStorage.getItem('clientToken') || '';
      
      const response = await fetch(`/api/simple/client/${clientCode}/appointments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const appointmentsData = await response.json();
        setAppointments(appointmentsData);
        console.log('📅 [PURE CLIENT] Appuntamenti caricati:', appointmentsData.length);
      } else {
        console.error('❌ [PURE CLIENT] Errore response:', response.status);
      }
    } catch (error) {
      console.error('❌ [PURE CLIENT] Errore caricamento appuntamenti:', error);
    }
  };

  const loadClientInvoices = async (clientCode: string) => {
    try {
      console.log('📄 [PURE CLIENT] Caricamento fatture per cliente:', clientCode);
      
      const token = localStorage.getItem('clientToken') || '';
      
      const response = await fetch(`/api/simple/client/${clientCode}/invoices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const invoicesData = await response.json();
        setInvoices(invoicesData);
        console.log('📄 [PURE CLIENT] Fatture caricate:', invoicesData.length);
      } else {
        console.error('❌ [PURE CLIENT] Errore response fatture:', response.status);
      }
    } catch (error) {
      console.error('❌ [PURE CLIENT] Errore caricamento fatture:', error);
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

        {/* Richiesta Nuovo Appuntamento */}
        <BookingRequestSection clientCode={client.uniqueCode} />

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

        {/* Documenti e Fatture */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-purple-600" />
              Documenti e Fatture
            </CardTitle>
            <CardDescription>
              Accesso a tutte le fatture emesse
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nessuna fattura disponibile</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {invoices.map((invoice) => {
                    const invoiceDate = new Date(invoice.date);
                    const dueDate = new Date(invoice.dueDate);
                    const isOverdue = invoice.status === 'unpaid' && dueDate < new Date();
                    
                    return (
                      <Card 
                        key={invoice.id} 
                        className={`border-l-4 ${
                          invoice.status === 'paid' 
                            ? 'border-l-green-500 bg-white' 
                            : isOverdue
                              ? 'border-l-red-500 bg-red-50'
                              : 'border-l-orange-500 bg-orange-50'
                        }`}
                        data-testid={`invoice-${invoice.id}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-gray-900">
                                Fattura {invoice.invoiceNumber}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(invoice.date)}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-gray-600">
                                <span className="font-medium">Totale:</span>
                                <span className="text-lg font-bold">
                                  €{invoice.totalAmount.toFixed(2)}
                                </span>
                              </div>
                              {invoice.notes && (
                                <p className="mt-2 text-sm text-gray-600">
                                  {invoice.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : isOverdue
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-orange-100 text-orange-800'
                              }`}>
                                {invoice.status === 'paid' 
                                  ? 'Pagata' 
                                  : isOverdue
                                    ? 'Scaduta'
                                    : 'Da pagare'
                                }
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-2"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem('clientToken') || '';
                                    const response = await fetch(`/api/simple/client/${client?.uniqueCode}/invoices/${invoice.id}/pdf`, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    
                                    if (!response.ok) {
                                      console.error('Errore download PDF:', response.status);
                                      return;
                                    }
                                    
                                    // Download blob
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Fattura_${invoice.invoiceNumber}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } catch (error) {
                                    console.error('Errore download fattura:', error);
                                  }
                                }}
                                data-testid={`download-invoice-${invoice.id}`}
                              >
                                <Download className="h-4 w-4" />
                                Scarica PDF
                              </Button>
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

        {/* Istruzioni PWA - Pulsante collassabile */}
        <Collapsible 
          open={showInstallInstructions} 
          onOpenChange={setShowInstallInstructions}
          className="mt-8"
        >
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-between bg-green-50 border-green-200 hover:bg-green-100 text-green-800"
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Istruzioni installazione app
              </span>
              {showInstallInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="bg-green-50 border-green-200 mt-2">
              <CardContent className="pt-6">
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
          </CollapsibleContent>
        </Collapsible>
        
        {/* Footer completo con tutte le informazioni */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          {/* Sezione contatti del professionista */}
          {(contactInfo.email || contactInfo.phone || contactInfo.phone1 || contactInfo.website || contactInfo.instagram) && (
            <Card className="bg-gray-50 mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-gray-800">
                  {contactInfo.businessName || 'Studio Professionale'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Icone di contatto - Versioni colorate con loghi originali */}
                <div className="flex justify-center space-x-4">
                  {contactInfo.email && contactInfo.showEmail !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 p-0 border-2 hover:scale-110 transition-transform"
                      style={{ borderColor: '#EA4335', color: '#EA4335' }}
                      onClick={() => window.location.href = `mailto:${contactInfo.email}`}
                      title={contactInfo.email}
                    >
                      <SiGmail className="h-6 w-6" style={{ color: '#EA4335' }} />
                    </Button>
                  )}

                  {contactInfo.phone && contactInfo.showPhone !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 p-0 border-2 hover:scale-110 transition-transform"
                      style={{ borderColor: '#25D366', color: '#25D366' }}
                      onClick={() => {
                        // Rimuovi spazi, trattini e il carattere + dal numero
                        const cleanPhone = contactInfo.phone.replace(/[\s\-+]/g, '');
                        window.open(`https://wa.me/${cleanPhone}`, '_blank');
                      }}
                      title={`WhatsApp: ${contactInfo.phone}`}
                    >
                      <FaWhatsapp className="h-6 w-6" style={{ color: '#25D366' }} />
                    </Button>
                  )}

                  {contactInfo.phone1 && contactInfo.showPhone1 !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 p-0 border-2 hover:scale-110 transition-transform"
                      style={{ borderColor: '#0088CC', color: '#0088CC' }}
                      onClick={() => window.location.href = `tel:${contactInfo.phone1}`}
                      title={contactInfo.phone1}
                    >
                      <FaPhone className="h-6 w-6" style={{ color: '#0088CC' }} />
                    </Button>
                  )}

                  {contactInfo.website && contactInfo.showWebsite !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 p-0 border-2 hover:scale-110 transition-transform"
                      style={{ borderColor: '#4285F4', color: '#4285F4' }}
                      onClick={() => window.open(
                        contactInfo.website?.startsWith('http') 
                          ? contactInfo.website 
                          : `https://${contactInfo.website}`, 
                        '_blank'
                      )}
                      title={contactInfo.website}
                    >
                      <FaGlobe className="h-6 w-6" style={{ color: '#4285F4' }} />
                    </Button>
                  )}

                  {contactInfo.instagram && contactInfo.showInstagram !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 p-0 border-0 hover:scale-110 transition-transform relative overflow-hidden"
                      style={{
                        background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                      onClick={() => window.open(
                        `https://instagram.com/${contactInfo.instagram?.replace('@', '')}`, 
                        '_blank'
                      )}
                      title={`@${contactInfo.instagram?.replace('@', '')}`}
                    >
                      <SiInstagram 
                        className="h-7 w-7 relative z-10" 
                        style={{ color: 'white' }}
                      />
                    </Button>
                  )}
                </div>

                {/* Informazioni dettagliate in formato testo */}
                <div className="text-center space-y-2 text-sm text-gray-600">
                  {contactInfo.email && contactInfo.showEmail !== false && (
                    <p>
                      <span className="font-medium">Email:</span>{' '}
                      <a 
                        href={`mailto:${contactInfo.email}`} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {contactInfo.email}
                      </a>
                    </p>
                  )}
                  
                  {contactInfo.phone && contactInfo.showPhone !== false && (
                    <p>
                      <span className="font-medium">Telefono:</span>{' '}
                      <a 
                        href={`tel:${contactInfo.phone}`} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {contactInfo.phone}
                      </a>
                    </p>
                  )}

                  {contactInfo.phone1 && contactInfo.showPhone1 !== false && (
                    <p>
                      <span className="font-medium">Cellulare:</span>{' '}
                      <a 
                        href={`tel:${contactInfo.phone1}`} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {contactInfo.phone1}
                      </a>
                    </p>
                  )}
                  
                  {contactInfo.website && contactInfo.showWebsite !== false && (
                    <p>
                      <span className="font-medium">Sito web:</span>{' '}
                      <a 
                        href={contactInfo.website?.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {contactInfo.website}
                      </a>
                    </p>
                  )}
                  
                  {contactInfo.instagram && contactInfo.showInstagram !== false && (
                    <p>
                      <span className="font-medium">Instagram:</span>{' '}
                      <a 
                        href={`https://instagram.com/${contactInfo.instagram?.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        @{contactInfo.instagram?.replace('@', '')}
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Informazioni legali e versione */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors underline"
                >
                  Privacy Policy
                </a>
                <span>•</span>
                <a 
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors underline"
                >
                  Termini di Servizio
                </a>
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
              <p>Il Titolare del trattamento dei dati è Zambelli Andrea, contattabile all'indirizzo zambelli.andrea.1973@gmail.com</p>
              
              <h3 className="font-semibold">3. Tipologie di Dati Raccolti</h3>
              <p>I dati personali raccolti comprendono: nome, cognome, data di nascita, codice fiscale, indirizzo email, numero di telefono, informazioni relative agli appuntamenti erogati.</p>
              
              <h3 className="font-semibold">4. Finalità del Trattamento</h3>
              <p>I dati vengono trattati per: gestione degli appuntamenti, comunicazioni relative ai servizi erogati, adempimenti di obblighi legali e contabili.</p>
              
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