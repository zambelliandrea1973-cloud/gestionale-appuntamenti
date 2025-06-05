import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  userId: number;
}

export default function SimpleServiceManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const { toast } = useToast();

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
        duration: 60,
        price: parseFloat(newServicePrice) || 0
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
        
        setNewServiceName("");
        setNewServicePrice("");
        toast({ title: "Servizio creato!" });
        console.log('Servizio creato:', newService);
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
        toast({ title: "Servizio eliminato!" });
        console.log('Servizio eliminato:', id);
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
        <CardHeader>
          <CardTitle>Gestione Servizi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form per nuovo servizio */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome servizio"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Input
              placeholder="Prezzo (€)"
              type="number"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Button onClick={createService} disabled={loading}>
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi
            </Button>
          </div>

          {/* Lista servizi */}
          <div className="space-y-2">
            {loading && services.length === 0 && (
              <div className="text-center py-4">Caricamento...</div>
            )}
            
            {services.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500">
                Nessun servizio presente. Creane uno!
              </div>
            )}

            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-gray-500">
                    €{service.price} - {service.duration} min
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteService(service.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Debug info */}
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            Servizi in memoria: {services.length} | 
            Ultimo aggiornamento: {new Date().toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}