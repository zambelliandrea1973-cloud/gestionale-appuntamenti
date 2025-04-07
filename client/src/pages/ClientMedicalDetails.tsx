import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientLegacyNotes from "@/components/ClientLegacyNotes";

export default function ClientMedicalDetails() {
  const [_, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  
  // Estrai l'ID del cliente dall'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      setClientId(parseInt(id));
    }
  }, []);

  // Carica i dati del cliente
  const { data: client, isLoading } = useQuery<any>({
    queryKey: clientId ? [`/api/clients/${clientId}`] : [],
    enabled: !!clientId
  });

  if (isLoading) {
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
            <CardTitle className="text-xl">Cliente non trovato</CardTitle>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna all'elenco clienti
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Formatta la data di nascita
  const formattedBirthday = client.birthday 
    ? format(new Date(client.birthday), "dd MMMM yyyy", { locale: it })
    : "Non specificata";

  return (
    <div className="container mx-auto p-4">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{client.firstName} {client.lastName}</CardTitle>
              <CardDescription>Scheda medica completa</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setLocation('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna all'elenco
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Informazioni personali</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Nome:</span> {client.firstName}
                </div>
                <div>
                  <span className="font-medium">Cognome:</span> {client.lastName}
                </div>
                <div>
                  <span className="font-medium">Telefono:</span> {client.phone || "Non specificato"}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {client.email || "Non specificata"}
                </div>
                <div>
                  <span className="font-medium">Indirizzo:</span> {client.address || "Non specificato"}
                </div>
                <div>
                  <span className="font-medium">Data di nascita:</span> {formattedBirthday}
                </div>
                <div>
                  <span className="font-medium">Cliente frequente:</span> {client.isFrequent ? "Sì" : "No"}
                </div>
                <div>
                  <span className="font-medium">Consenso al trattamento dati:</span> {client.hasConsent ? "Ottenuto" : "Non ottenuto"}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Appuntamenti</h3>
              <Link href={`/clients/${client.id}/appointments`}>
                <Button variant="outline" className="mb-4">
                  <Calendar className="mr-2 h-4 w-4" />
                  Visualizza tutti gli appuntamenti
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-8">
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notes">Note strutturate</TabsTrigger>
                <TabsTrigger value="medical">Dati medici legacy</TabsTrigger>
                <TabsTrigger value="other">Altre informazioni</TabsTrigger>
              </TabsList>
              
              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <ClientLegacyNotes clientId={client.id} category="general" label="Note generali" />
                    <ClientLegacyNotes clientId={client.id} category="medical" label="Note mediche" />
                    <ClientLegacyNotes clientId={client.id} category="allergies" label="Allergie e informazioni sanitarie" />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="medical" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Note mediche (legacy)</h3>
                      <div className="border p-4 rounded-md bg-background min-h-24 whitespace-pre-wrap">
                        {client.medicalNotes || "Nessuna nota medica registrata"}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Allergie e informazioni sanitarie (legacy)</h3>
                      <div className="border p-4 rounded-md bg-background min-h-24 whitespace-pre-wrap">
                        {client.allergies || "Nessuna allergia o informazione sanitaria registrata"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="other" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Note generali (legacy)</h3>
                      <div className="border p-4 rounded-md bg-background min-h-24 whitespace-pre-wrap">
                        {client.notes || "Nessuna nota generale registrata"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={() => setLocation('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco clienti
          </Button>
          <Button onClick={() => setLocation(`/clients`)}>
            Modifica cliente
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}