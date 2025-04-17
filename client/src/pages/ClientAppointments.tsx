import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function ClientAppointments() {
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  
  // Estrai l'ID del cliente dall'URL
  useEffect(() => {
    const parts = window.location.pathname.split('/');
    // Il formato dell'URL dovrebbe essere '/clients/{clientId}/appointments'
    if (parts.length >= 3) {
      const id = parseInt(parts[2]);
      if (!isNaN(id)) {
        setClientId(id);
      }
    }
  }, []);
  
  // Carica i dati del cliente
  const { data: client, isLoading: isLoadingClient } = useQuery<any>({
    queryKey: clientId ? [`/api/clients/${clientId}`] : [],
    enabled: !!clientId
  });
  
  // Carica gli appuntamenti del cliente
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<any[]>({
    queryKey: clientId ? [`/api/appointments/client/${clientId}`] : [],
    enabled: !!clientId
  });
  
  if (isLoadingClient || isLoadingAppointments) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!client) {
    return (
      <div className="container mx-auto p-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{t('clients.details.notFound')}</CardTitle>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Formatta la data in italiano con iniziale maiuscola
    let formattedDate = format(date, "EEEE d MMMM yyyy", { locale: it });
    // Rendi la prima lettera maiuscola
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  };
  
  const formatAppointmentTime = (appointment: any) => {
    // Usa startTime e endTime se disponibili
    if (appointment.startTime && appointment.endTime) {
      return `${appointment.startTime.substring(0, 5)} - ${appointment.endTime.substring(0, 5)}`;
    }
    
    // Fallback al vecchio metodo se non ci sono startTime/endTime
    const date = new Date(appointment.date);
    if (date.toString() === "Invalid Date") {
      return "Orario non disponibile";
    }
    return format(date, "HH:mm", { locale: it });
  };
  
  // Funzione per determinare lo stato dell'appuntamento
  const getAppointmentStatus = (appointment: any) => {
    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    
    if (appointment.status === "confirmed") {
      return {
        label: t('appointments.status.confirmed', 'Confermato'),
        variant: "secondary" as const // cambiato da "success" a "secondary"
      };
    } else if (appointment.status === "cancelled") {
      return {
        label: t('appointments.status.cancelled', 'Cancellato'),
        variant: "destructive" as const
      };
    } else if (appointmentDate < now) {
      return {
        label: t('appointments.status.completed', 'Completato'),
        variant: "default" as const
      };
    } else {
      return {
        label: t('appointments.status.scheduled', 'Programmato'),
        variant: "outline" as const
      };
    }
  };

  const sortedAppointments = appointments 
    ? [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  
  return (
    <div className="container mx-auto p-4">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">
                {client.firstName} {client.lastName} - Appuntamenti
              </CardTitle>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/client-medical-details?id=${clientId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {sortedAppointments.length === 0 ? (
            <div className="text-center p-6">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Nessun appuntamento</p>
              <p className="text-sm text-muted-foreground mt-2">
                Questo cliente non ha appuntamenti registrati
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ora</TableHead>
                  <TableHead>Servizio</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAppointments.map((appointment: any) => {
                  const status = getAppointmentStatus(appointment);
                  
                  return (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {formatAppointmentDate(appointment.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          {formatAppointmentTime(appointment)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {appointment.service?.name || appointment.serviceName || 'Nessun servizio specificato'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/calendar?date=${format(new Date(appointment.date), 'yyyy-MM-dd')}`)}
                        >
                          Visualizza
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation(`/client-medical-details?id=${clientId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
          
          <Button onClick={() => setLocation(`/calendar`)}>
            Vai al Calendario
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}