import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
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
import { useTranslation } from "react-i18next";

function PWAInstallBanner() {
  const { t } = useTranslation();
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
              <p className="font-medium text-blue-900">{t('clientArea.installApp')}</p>
              <p className="text-sm text-blue-700">{t('clientArea.installAppDesc')}</p>
            </div>
          </div>
          <Button onClick={handleInstallClick} size="sm" className="bg-blue-600 hover:bg-blue-700">
            {t('clientArea.install')}
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

function BookingRequestSection({ clientCode, clientId, ownerId }: { clientCode: string; clientId: number; ownerId: number }) {
  const { t, i18n } = useTranslation();
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
        title: t('clientArea.error'),
        description: error.message || t('clientArea.errorCreateRequest')
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
        title: t('clientArea.requestSent'),
        description: t('clientArea.confirmationPending')
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('clientArea.error'),
        description: error.message || t('clientArea.errorSelectSlot')
      });
    }
  });
  
  const dayParts = [
    { label: t('clientArea.morning'), value: 'morning', start: '09:00', end: '13:00' },
    { label: t('clientArea.afternoon'), value: 'afternoon', start: '14:00', end: '18:00' },
    { label: t('clientArea.evening'), value: 'evening', start: '18:00', end: '21:00' }
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
          {t('clientArea.requestAppointment')}
        </CardTitle>
        <CardDescription>
          {t('clientArea.requestAppointmentDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showForm ? (
          <div className="space-y-4">
            <Button onClick={() => setShowForm(true)} className="w-full" data-testid="button-request-appointment">
              <Plus className="h-4 w-4 mr-2" />
              {t('clientArea.newRequest')}
            </Button>
            
            <div className="pt-3 border-t">
              <p className="text-sm text-gray-500 mb-2">{t('clientArea.pushNotifDesc')}</p>
              <PushNotificationToggle clientId={clientId} ownerId={ownerId} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`flex-1 h-2 rounded ${step >= s ? 'bg-blue-600' : 'bg-gray-200'} ${s < 5 ? 'mr-2' : ''}`} />
              ))}
            </div>
            
            {step === 1 && (
              <div className="space-y-3">
                <Label>{t('clientArea.selectService')}</Label>
                {services.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center" data-testid="empty-services">
                    <p className="text-gray-600 font-medium">{t('clientArea.onlineBookingDisabled', 'Online booking is temporarily disabled by the professional.')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('clientArea.contactByPhone', 'To book an appointment, contact the studio by phone.')}</p>
                  </div>
                ) : (
                  <Select value={selectedService?.toString() || ""} onValueChange={(v) => setSelectedService(parseInt(v))}>
                    <SelectTrigger data-testid="select-service">
                      <SelectValue placeholder={t('clientArea.chooseService')} />
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
                <Label>{t('clientArea.preferredStaff')}</Label>
                <Select value={selectedStaff?.toString() || "none"} onValueChange={(v) => setSelectedStaff(v === "none" ? null : parseInt(v))}>
                  <SelectTrigger data-testid="select-staff">
                    <SelectValue placeholder={t('clientArea.chooseStaff')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('clientArea.noPreference')}</SelectItem>
                    {staffList.map(staff => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.firstName} {staff.lastName}
                        {staff.specialization && ` - ${staff.specialization}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-2">
                  {t('clientArea.staffHint')}
                </p>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-3">
                <Label>{t('clientArea.selectDate')}</Label>
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
                <Label>{t('clientArea.selectTimeSlot')}</Label>
                <Select value={selectedDayPart} onValueChange={setSelectedDayPart}>
                  <SelectTrigger data-testid="select-timeframe">
                    <SelectValue placeholder={t('clientArea.chooseTimeSlot')} />
                  </SelectTrigger>
                  <SelectContent>
                    {dayParts.map(dp => (
                      <SelectItem key={dp.value} value={dp.value}>
                        {dp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="mt-4">{t('clientArea.notesOptional')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('clientArea.notesPlaceholder')}
                  data-testid="textarea-notes"
                />
              </div>
            )}
            
            {step === 5 && (
              <div className="space-y-3">
                <Label>{t('clientArea.availableSlots')}</Label>
                {proposedSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-orange-500" />
                    <p>{t('clientArea.noSlotsAvailable')}</p>
                    <p className="text-sm mt-2">{t('clientArea.tryAnotherSlot')}</p>
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
                  {t('clientArea.back')}
                </Button>
              )}
              {step < 4 && (
                <Button onClick={() => setStep(step + 1)} disabled={!canContinue()} className="flex-1" data-testid="button-next">
                  {t('clientArea.continue')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {step === 4 && (
                <Button onClick={handleSubmit} disabled={!canContinue() || createRequest.isPending} className="flex-1" data-testid="button-submit">
                  {createRequest.isPending ? t('clientArea.sending') : t('clientArea.sendRequest')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} data-testid="button-cancel">
                {t('clientArea.cancel')}
              </Button>
            </div>
          </div>
        )}
        
        {/* Lista Richieste Esistenti */}
        {bookingRequests.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4 text-gray-700">{t('clientArea.yourRequests')}</h3>
            <div className="space-y-3">
              {bookingRequests.map((req) => {
                const service = services.find(s => s.id === req.serviceId);
                const statusConfig = {
                  slots_proposed: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', label: t('clientArea.chooseSlot'), icon: AlertCircle },
                  client_selected: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', label: t('clientArea.waiting'), icon: Clock },
                  admin_confirmed: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', label: t('clientArea.approved'), icon: CheckCircle },
                  rejected: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', label: t('clientArea.rejected'), icon: XCircle }
                };
                const config = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.slots_proposed;
                const Icon = config.icon;
                
                return (
                  <Card key={req.id} className={`border-l-4 ${config.border} ${config.bg}`} data-testid={`booking-request-${req.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{service?.name || t('clientArea.service')}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(req.requestedDate).toLocaleDateString(i18n.language)} - 
                            {req.requestedTimeStart}-{req.requestedTimeEnd}
                          </p>
                          {req.selectedSlot && (
                            <p className="text-sm font-medium text-blue-600 mt-1">
                              {t('clientArea.selectedSlot')} {req.selectedSlot.start} - {req.selectedSlot.end}
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
  const { t, i18n } = useTranslation();
  const params = useParams();
  const [client, setClient] = useState<ClientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showDataProtectionModal, setShowDataProtectionModal] = useState<boolean>(false);
  const [contactInfo, setContactInfo] = useState<any>({});
  const [showInstallInstructions, setShowInstallInstructions] = useState<boolean>(false);

  // Funzione per caricare le informazioni di contatto del professionista tramite ownerId
  const loadContactInfo = async (ownerId?: number) => {
    try {
      if (!ownerId) {
        console.log('📞 [CLIENT FOOTER] No ownerId provided');
        return;
      }
      
      const response = await fetch(`/api/owner-contact-info/${ownerId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContactInfo(data);
        console.log('📞 [CLIENT FOOTER] Contact information loaded for owner:', ownerId, data);
      } else {
        console.error('📞 [CLIENT FOOTER] Response error:', response.status);
      }
    } catch (error) {
      console.error('❌ [CLIENT FOOTER] Error loading contact info:', error);
    }
  };

  useEffect(() => {
    const initializeClientArea = async () => {
      try {
        const clientCode = params.clientCode;
        if (!clientCode) {
          setError(t('clientArea.invalidAccessCode'));
          setLoading(false);
          return;
        }

        console.log('🏠 [PURE CLIENT] Initializing client area:', clientCode);
        
        // Aggiorna il manifest PWA per preservare il percorso del cliente
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          const newHref = `/manifest.json?clientToken=${clientCode}`;
          manifestLink.setAttribute('href', newHref);
          console.log(`📱 PWA: Manifest updated for client: ${newHref}`);
          
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
              console.log('✅ PWA access registered and token saved for client:', clientCode);
            }
          }
        } catch (error) {
          console.warn('Error registering PWA access:', error);
        }
        
        // Carica dati cliente con autenticazione basata su codice
        console.log('🏠 [PURE CLIENT] API request for code:', clientCode);
        const clientResponse = await fetch(`/api/client-by-code/${clientCode}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('🏠 [PURE CLIENT] API response status:', clientResponse.status, clientResponse.statusText);

        if (!clientResponse.ok) {
          console.error('🏠 [PURE CLIENT] API error:', clientResponse.status, clientResponse.statusText);
          const errorText = await clientResponse.text();
          console.error('🏠 [PURE CLIENT] Error details:', errorText);
          setError(`${t('clientArea.unauthorizedAccess')} (${clientResponse.status})`);
          setLoading(false);
          return;
        }

        const clientData = await clientResponse.json();
        console.log('🏠 [PURE CLIENT] Client loaded:', clientData.firstName, clientData.lastName);
        setClient(clientData);

        // Carica appuntamenti del cliente
        await loadClientAppointments(clientData.id, clientData.ownerId);
        
        // Carica fatture del cliente
        await loadClientInvoices(clientData.uniqueCode);
        
        // Carica le informazioni di contatto del professionista
        await loadContactInfo(clientData.ownerId);
        


      } catch (error) {
        console.error('❌ [PURE CLIENT] Initialization error:', error);
        setError(t('clientArea.connectionError'));
      } finally {
        setLoading(false);
      }
    };

    initializeClientArea();
  }, [params.clientCode]);

  const loadClientAppointments = async (clientId: number, ownerId: number) => {
    try {
      console.log('📅 [PURE CLIENT] Loading appointments for client:', clientId);
      
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
        // Ordina appuntamenti dal più recente al più vecchio
        const sortedAppointments = appointmentsData.sort((a: Appointment, b: Appointment) => {
          const dateA = new Date(a.date + 'T' + a.time);
          const dateB = new Date(b.date + 'T' + b.time);
          return dateB.getTime() - dateA.getTime();
        });
        setAppointments(sortedAppointments);
        console.log('📅 [PURE CLIENT] Appointments loaded:', sortedAppointments.length);
      } else {
        console.error('❌ [PURE CLIENT] Response error:', response.status);
      }
    } catch (error) {
      console.error('❌ [PURE CLIENT] Error loading appointments:', error);
    }
  };

  const loadClientInvoices = async (clientCode: string) => {
    try {
      console.log('📄 [PURE CLIENT] Loading invoices for client:', clientCode);
      
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
        // Ordina fatture per numero in ordine decrescente (003/2026 prima di 002/2026)
        const sortedInvoices = invoicesData.sort((a: Invoice, b: Invoice) => {
          // Estrai anno e numero dalla fattura (formato: XXX/YYYY o simile)
          const parseInvoiceNumber = (inv: string) => {
            const parts = inv.split('/');
            if (parts.length === 2) {
              const num = parseInt(parts[0].replace(/\D/g, ''), 10) || 0;
              const year = parseInt(parts[1], 10) || 0;
              return { year, num };
            }
            return { year: 0, num: 0 };
          };
          const numA = parseInvoiceNumber(a.invoiceNumber);
          const numB = parseInvoiceNumber(b.invoiceNumber);
          // Prima ordina per anno decrescente, poi per numero decrescente
          if (numB.year !== numA.year) return numB.year - numA.year;
          return numB.num - numA.num;
        });
        setInvoices(sortedInvoices);
        console.log('📄 [PURE CLIENT] Invoices loaded:', sortedInvoices.length);
      } else {
        console.error('❌ [PURE CLIENT] Invoice response error:', response.status);
      }
    } catch (error) {
      console.error('❌ [PURE CLIENT] Error loading invoices:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
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
          <p className="text-gray-600">{t('clientArea.loadingPersonalArea')}</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">{t('clientArea.accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error || t('clientArea.cannotAccessArea')}</p>
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
              {t('clientArea.welcome', { name: `${client.firstName} ${client.lastName}` })}
            </CardTitle>
            <CardDescription>
              {t('clientArea.personalAreaDesc')}
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
        <BookingRequestSection clientCode={client.uniqueCode} clientId={client.id} ownerId={client.ownerId} />

        {/* Lista Appuntamenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-green-600" />
              {t('clientArea.yourAppointments')}
            </CardTitle>
            <CardDescription>
              {t('clientArea.personalAreaDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('clientArea.noAppointments')}</p>
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
                                <span>{appointment.time?.slice(0, 5) || appointment.time}</span>
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
                                ? t('clientArea.completed') 
                                : appointment.status === 'scheduled' 
                                  ? t('clientArea.confirmed') 
                                  : t('clientArea.waiting')
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
              {t('clientArea.documentsInvoices')}
            </CardTitle>
            <CardDescription>
              {t('clientArea.invoicesAccess')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('clientArea.noInvoices')}</p>
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
                                {t('clientArea.invoice')} {invoice.invoiceNumber}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(invoice.date)}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-gray-600">
                                <span className="font-medium">{t('clientArea.total')}</span>
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
                                  ? t('clientArea.paid') 
                                  : isOverdue
                                    ? t('clientArea.overdue')
                                    : t('clientArea.unpaid')
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
                                      console.error('PDF download error:', response.status);
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
                                    console.error('Invoice download error:', error);
                                  }
                                }}
                                data-testid={`download-invoice-${invoice.id}`}
                              >
                                <Download className="h-4 w-4" />
                                {t('clientArea.downloadPdf')}
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
                {t('clientArea.installInstructions')}
              </span>
              {showInstallInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="bg-green-50 border-green-200 mt-2">
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm text-green-700">
                  <p><strong>📱 {t('clientArea.onAndroid')}</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>{t('clientArea.androidStep1')}</li>
                    <li>{t('clientArea.androidStep2')}</li>
                    <li>{t('clientArea.androidStep3')}</li>
                  </ol>
                  
                  <p><strong>🍎 {t('clientArea.onIos')}</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>{t('clientArea.iosStep1')}</li>
                    <li>{t('clientArea.iosStep2')}</li>
                    <li>{t('clientArea.iosStep3')}</li>
                  </ol>
                  
                  <p><strong>💻 {t('clientArea.onDesktop')}</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>{t('clientArea.desktopStep1')}</li>
                    <li>{t('clientArea.desktopStep2')}</li>
                  </ol>
                  
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="font-medium">✨ {t('clientArea.installBenefits')}</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>{t('clientArea.benefit1')}</li>
                      <li>{t('clientArea.benefit2')}</li>
                      <li>{t('clientArea.benefit3')}</li>
                      <li>{t('clientArea.benefit4')}</li>
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
                  {contactInfo.businessName || t('clientArea.professionalStudio')}
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
                      <span className="font-medium">{t('clientArea.emailLabel')}</span>{' '}
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
                      <span className="font-medium">{t('clientArea.phoneLabel')}</span>{' '}
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
                      <span className="font-medium">{t('clientArea.mobileLabel')}</span>{' '}
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
                      <span className="font-medium">{t('clientArea.websiteLabel')}</span>{' '}
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
                      <span className="font-medium">{t('clientArea.instagramLabel')}</span>{' '}
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
                  {t('i18nFinale.pureClientArea.privacyPolicy')}
                </a>
                <span>•</span>
                <a 
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors underline"
                >
                  {t('clientArea.termsOfService')}
                </a>
                <span>•</span>
                <button 
                  onClick={() => setShowDataProtectionModal(true)}
                  className="hover:text-blue-600 transition-colors underline"
                >
                  {t('clientArea.dataProtection')}
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <span>{t('i18nFinale.pureClientAreaExtra.copyrightLine', { year: 2024, author: 'Zambelli Andrea' })}</span>
                <span>•</span>
                <span>{t('i18nFinale.pureClientAreaExtra.versionLine', { version: '2.4.1' })}</span>
                <span>•</span>
                <a href="mailto:zambelli.andrea@libero.it" className="hover:text-blue-600 transition-colors">
                  {t('clientArea.technicalSupport')}
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Modal Protezione Dati */}
        <Dialog open={showDataProtectionModal} onOpenChange={setShowDataProtectionModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                {t('clientArea.dataProtectionTitle')}
                <Button variant="ghost" size="sm" onClick={() => setShowDataProtectionModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold">{t('clientArea.dataSecurity')}</h3>
              <p>{t('clientArea.dataSecurityDesc')}</p>
              
              <h3 className="font-semibold">{t('clientArea.encryption')}</h3>
              <p>{t('clientArea.encryptionDesc')}</p>
              
              <h3 className="font-semibold">{t('clientArea.dataAccess')}</h3>
              <p>{t('clientArea.dataAccessDesc')}</p>
              
              <h3 className="font-semibold">{t('clientArea.backupRecovery')}</h3>
              <p>{t('clientArea.backupRecoveryDesc')}</p>
              
              <h3 className="font-semibold">{t('clientArea.monitoring')}</h3>
              <p>{t('clientArea.monitoringDesc')}</p>
              
              <h3 className="font-semibold">{t('clientArea.staffTraining')}</h3>
              <p>{t('clientArea.staffTrainingDesc')}</p>
              
              <h3 className="font-semibold">{t('clientArea.breachReporting')}</h3>
              <p>{t('clientArea.breachReportingDesc')}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}