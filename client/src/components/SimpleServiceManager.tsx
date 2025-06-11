import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  userId: number;
}

export default function SimpleServiceManager() {
  const { user } = useUserWithLicense();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("60");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceColor, setNewServiceColor] = useState("#3b82f6");
  const { toast } = useToast();

  console.log(`🔧 SIMPLE: ServiceManager per utente ${user?.id}`);

  // Query per caricare i servizi con React Query (persistenza automatica)
  const { data: services = [], isLoading: loading, error } = useQuery({
    queryKey: ['/api/services'],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minuti
    refetchOnWindowFocus: false
  });

  // Effetto per aggiornare il timestamp quando i servizi vengono caricati
  useEffect(() => {
    if (services.length > 0) {
      setLastUpdate(new Date());
      console.log('🔧 REACT QUERY: Servizi caricati e persistiti:', services);
    }
  }, [services]);

  // Mutation per creare nuovo servizio con React Query
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: { name: string; duration: number; price: number; color: string; description: string }) => {
      const response = await apiRequest("POST", "/api/services", serviceData);
      return await response.json();
    },
    onSuccess: (newService) => {
      console.log(`✅ REACT QUERY: Servizio creato per utente ${user?.id}:`, newService);
      
      // Invalida e ricarica automaticamente la cache dei servizi
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setLastUpdate(new Date());
      
      // Reset form
      setNewServiceName("");
      setNewServiceDuration("60");
      setNewServicePrice("");
      setNewServiceColor("#3b82f6");
      
      toast({ title: "Servizio creato!" });
    },
    onError: (error: any) => {
      console.error('Errore creazione:', error);
      toast({ title: "Errore nella creazione", variant: "destructive" });
    }
  });

  // Crea nuovo servizio
  const createService = async () => {
    if (!newServiceName.trim()) {
      toast({ title: "Inserisci un nome per il servizio", variant: "destructive" });
      return;
    }

    const serviceData = {
      name: newServiceName.trim(),
      duration: parseInt(newServiceDuration) || 60,
      price: parseFloat(newServicePrice) || 0,
      color: newServiceColor,
      description: ""
    };

    createServiceMutation.mutate(serviceData);
  };

  // Mutation per eliminare servizio con React Query
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/services/${id}`);
      return response;
    },
    onSuccess: (_, deletedId) => {
      console.log(`🗑️ REACT QUERY: Servizio eliminato per utente ${user?.id}:`, deletedId);
      
      // Invalida e ricarica automaticamente la cache dei servizi
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setLastUpdate(new Date());
      
      toast({ title: "Servizio eliminato!" });
    },
    onError: (error: any) => {
      console.error('Errore eliminazione:', error);
      toast({ title: "Errore nell'eliminazione", variant: "destructive" });
    }
  });

  // Elimina servizio
  const deleteService = async (id: number) => {
    deleteServiceMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle>Gestione Servizi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Gestisci i servizi offerti dalla tua attività. Utente: {user?.id}
            </p>
          </div>
          <Button onClick={createService} disabled={loading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuovo Servizio
          </Button>
        </CardHeader>
        <CardContent>
          {/* Form per nuovo servizio */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
            <Input
              placeholder="Nome servizio"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Input
              placeholder="Durata (min)"
              type="number"
              value={newServiceDuration}
              onChange={(e) => setNewServiceDuration(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Input
              placeholder="Prezzo (€)"
              type="number"
              step="0.01"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Input
              type="color"
              value={newServiceColor}
              onChange={(e) => setNewServiceColor(e.target.value)}
            />
          </div>

          {/* Tabella servizi */}
          {loading && services.length === 0 ? (
            <div className="text-center py-8">Caricamento servizi...</div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun servizio presente. Crea il primo servizio!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead>Colore</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell>€{service.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: service.color || '#3b82f6' }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implementare funzione di modifica
                            toast({ title: "Modifica servizio - In sviluppo" });
                          }}
                          className="text-blue-600 hover:text-blue-700"
                          title="Modifica servizio"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteService(service.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Elimina servizio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Info debug */}
          <div className="mt-4 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
            Servizi caricati: {services.length} | Ultimo aggiornamento: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Mai'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}