import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  userId: number;
}

export default function SimpleServiceManager() {
  const { user } = useUserWithLicense();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("60");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceColor, setNewServiceColor] = useState("#3b82f6");
  const { toast } = useToast();

  console.log(`🔧 SIMPLE: ServiceManager per utente ${user?.id}`);

  // Carica servizi dal server
  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data);
        setLastUpdate(new Date()); // Aggiorna timestamp quando carichi i servizi
        console.log('Servizi caricati:', data);
      } else {
        console.error('Errore caricamento:', response.status);
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crea nuovo servizio
  const createService = async () => {
    if (!newServiceName.trim()) {
      toast({ title: "Inserisci un nome per il servizio", variant: "destructive" });
      return;
    }

    try {
      const serviceData = {
        name: newServiceName.trim(),
        duration: parseInt(newServiceDuration) || 60,
        price: parseFloat(newServicePrice) || 0,
        color: newServiceColor,
        description: ""
      };

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
        credentials: 'include'
      });

      if (response.ok) {
        const newService = await response.json();
        
        // Aggiorna immediatamente la lista
        setServices(prev => [...prev, newService]);
        setLastUpdate(new Date()); // Aggiorna timestamp quando crei un servizio
        
        setNewServiceName("");
        setNewServiceDuration("60");
        setNewServicePrice("");
        setNewServiceColor("#3b82f6");
        toast({ title: "Servizio creato!" });
        console.log(`✅ SIMPLE: Servizio creato per utente ${user?.id}:`, newService);
      } else {
        toast({ title: "Errore nella creazione", variant: "destructive" });
      }
    } catch (error) {
      console.error('Errore creazione:', error);
      toast({ title: "Errore di rete", variant: "destructive" });
    }
  };

  // Elimina servizio
  const deleteService = async (id: number) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Rimuovi immediatamente dalla lista
        setServices(prev => prev.filter(s => s.id !== id));
        setLastUpdate(new Date()); // Aggiorna timestamp quando elimini un servizio
        toast({ title: "Servizio eliminato!" });
        console.log(`🗑️ SIMPLE: Servizio eliminato per utente ${user?.id}:`, id);
      } else {
        toast({ title: "Errore nell'eliminazione", variant: "destructive" });
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast({ title: "Errore di rete", variant: "destructive" });
    }
  };

  // Carica servizi all'avvio
  useEffect(() => {
    loadServices();
  }, []);

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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteService(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Info debug */}
          <div className="mt-4 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
            Servizi caricati: {services.length} | Ultimo aggiornamento: {new Date().toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}