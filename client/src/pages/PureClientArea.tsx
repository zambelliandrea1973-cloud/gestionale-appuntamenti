import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Phone, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  uniqueCode: string;
}

interface Appointment {
  id: number;
  date: string;
  time: string;
  service: string;
  status: 'scheduled' | 'pending';
  notes?: string;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  phone1?: string;
  website?: string;
  instagram?: string;
}

export default function PureClientArea() {
  const { clientCode } = useParams<{ clientCode: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get token from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const autoLogin = urlParams.get('autoLogin') === 'true';

  useEffect(() => {
    if (!clientCode) {
      setError("Codice cliente mancante");
      setLoading(false);
      return;
    }

    loadClientData();
  }, [clientCode, token]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [CLIENT-AREA] Caricamento dati per cliente: ${clientCode}`);
      console.log(`🔑 [CLIENT-AREA] Token ricevuto: ${token ? 'Presente' : 'Assente'}`);
      console.log(`🚀 [CLIENT-AREA] AutoLogin: ${autoLogin}`);

      // Headers per l'autenticazione
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Carica dati cliente
      const clientResponse = await apiRequest(`/api/simple/client/${clientCode}`, {
        method: 'GET',
        headers
      });

      if (!clientResponse.ok) {
        throw new Error(`Errore nel caricamento del cliente: ${clientResponse.status}`);
      }

      const clientData = await clientResponse.json();
      console.log(`✅ [CLIENT-AREA] Dati cliente caricati:`, clientData);
      setClient(clientData);

      // Carica appuntamenti
      const appointmentsResponse = await apiRequest(`/api/simple/client/${clientCode}/appointments`, {
        method: 'GET',
        headers
      });

      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        console.log(`📅 [CLIENT-AREA] Appuntamenti caricati:`, appointmentsData);
        setAppointments(appointmentsData);
      } else {
        console.warn(`⚠️ [CLIENT-AREA] Impossibile caricare appuntamenti: ${appointmentsResponse.status}`);
        setAppointments([]);
      }

      // Carica informazioni di contatto del professionista
      const contactResponse = await apiRequest(`/api/simple/client/${clientCode}/contact-info`, {
        method: 'GET',
        headers
      });

      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        console.log(`📞 [CLIENT-AREA] Info contatto caricate:`, contactData);
        setContactInfo(contactData);
      } else {
        console.warn(`⚠️ [CLIENT-AREA] Impossibile caricare info contatto: ${contactResponse.status}`);
      }

    } catch (err) {
      console.error('❌ [CLIENT-AREA] Errore nel caricamento:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
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

        {/* Lista Appuntamenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              I tuoi Appuntamenti
            </CardTitle>
            <CardDescription>
              Visualizza tutti i tuoi appuntamenti programmati
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun appuntamento</h3>
                <p className="text-gray-600">Non hai appuntamenti programmati al momento.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
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
                      <Mail className="h-4 w-4" />
                      <span>{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo.phone1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{contactInfo.phone1}</span>
                    </div>
                  )}
                  {contactInfo.website && (
                    <div className="flex items-center justify-center gap-2">
                      <span>🌐</span>
                      <a 
                        href={`https://${contactInfo.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {contactInfo.website}
                      </a>
                    </div>
                  )}
                  {contactInfo.instagram && (
                    <div className="flex items-center justify-center gap-2">
                      <span>📷</span>
                      <a 
                        href={`https://instagram.com/${contactInfo.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
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