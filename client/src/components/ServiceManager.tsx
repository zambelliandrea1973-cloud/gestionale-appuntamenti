import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserWithLicense } from "@/hooks/use-user-with-license";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  color?: string;
  description?: string;
}

interface ServiceFormData {
  id?: number;
  name: string;
  duration: number | string;
  price: number | string;
  color?: string;
  description?: string;
}

export default function ServiceManager() {
  console.log("🔧 FRONTEND: ServiceManager component rendered");
  
  const { user } = useUserWithLicense();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    duration: 60,
    price: 0,
    color: "#3b82f6",
    description: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  console.log("🔧 FRONTEND: ServiceManager state initialized for user:", user?.id);

  // Query servizi - COMPLETAMENTE SINCRONA per garantire aggiornamenti immediati
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Funzione per caricare servizi direttamente con separazione per utente
  const loadServices = useCallback(async () => {
    if (!user?.id) {
      console.log("🔄 FRONTEND: Nessun utente attivo, skip caricamento servizi");
      return;
    }
    
    try {
      console.log(`🔄 FRONTEND: Caricamento servizi per utente ${user.id}`);
      setIsLoading(true);
      setError(null);
      
      // Pulisci cache locale per questo utente
      const localStorageKey = `services_cache_user_${user.id}`;
      localStorage.removeItem(localStorageKey);
      
      const response = await apiRequest("GET", "/api/services");
      
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📋 FRONTEND: Servizi caricati per utente ${user.id}:`, data);
      setServices(data);
      
      // Salva in cache locale specifica per utente
      localStorage.setItem(localStorageKey, JSON.stringify({
        timestamp: Date.now(),
        data: data,
        userId: user.id
      }));
      
    } catch (err) {
      console.error("❌ FRONTEND: Errore caricamento servizi:", err);
      setError(err instanceof Error ? err : new Error('Errore sconosciuto'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Carica servizi al mount del componente e al cambio utente
  useEffect(() => {
    console.log("🔄 FRONTEND: useEffect chiamato - caricamento iniziale servizi");
    
    // Pulisci tutti i dati di cache esistenti quando cambia utente
    if (user?.id) {
      // Rimuovi cache di altri utenti per evitare contaminazione
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('services_cache_user_') && !key.includes(`user_${user.id}`)) {
          localStorage.removeItem(key);
          console.log(`🧹 FRONTEND: Rimossa cache di altro utente: ${key}`);
        }
      });
      
      // Invalida completamente React Query cache
      queryClient.clear();
      console.log("🧹 FRONTEND: Cache React Query completamente invalidata");
      
      loadServices();
    }
  }, [user?.id, loadServices]);

  // Alias per compatibilità con il codice esistente
  const refetchServices = loadServices;

  // Mutation per creare un nuovo servizio
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      console.log("🚀 FRONTEND: Inizio creazione servizio:", data);
      const response = await apiRequest("POST", "/api/services", data);
      console.log("📡 FRONTEND: Risposta backend ricevuta:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ FRONTEND: Errore dal backend:", errorData);
        throw new Error(errorData.message || "Errore durante la creazione del servizio");
      }
      
      const newService = await response.json();
      console.log("📦 FRONTEND: Dati servizio dal backend:", newService);
      return newService;
    },
    onSuccess: (newService) => {
      console.log("🎉 FRONTEND: onSuccess chiamato con servizio:", newService);
      
      // Aggiornamento sincrono immediato
      setServices(currentServices => {
        const updatedServices = [...currentServices, newService];
        console.log("📝 FRONTEND: Lista aggiornata immediatamente:", updatedServices);
        return updatedServices;
      });
      
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Servizio creato",
        description: "Il servizio è stato creato con successo",
      });
      
      // Ricarica dal backend in background senza interferire con lo stato
      loadServices().catch(err => console.error("Errore ricarica background:", err));
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un servizio
  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await apiRequest("PUT", `/api/services/${data.id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'aggiornamento del servizio");
      }
      return response.json();
    },
    onSuccess: async (updatedService) => {
      console.log("✅ FRONTEND: Servizio aggiornato con successo:", updatedService);
      
      // Aggiornamento diretto dello state - IMMEDIATO
      setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
      
      // Ricarica anche dal backend per sicurezza
      await loadServices();
      console.log("✅ FRONTEND: Lista servizi aggiornata dopo modifica");
      
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Servizio aggiornato",
        description: "Il servizio è stato aggiornato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un servizio
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/services/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'eliminazione del servizio");
      }
      return true;
    },
    onSuccess: async (_, deletedId) => {
      console.log("✅ FRONTEND: Servizio eliminato con successo, ID:", deletedId);
      
      // Aggiornamento diretto dello state - IMMEDIATO
      setServices(prev => prev.filter(s => s.id !== deletedId));
      
      // Ricarica anche dal backend per sicurezza
      await loadServices();
      console.log("✅ FRONTEND: Lista servizi aggiornata dopo eliminazione");
      
      toast({
        title: "Servizio eliminato",
        description: "Il servizio è stato eliminato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "number") {
      // Per i campi numerici, se il valore è vuoto, manteniamo una stringa vuota
      // invece di convertire immediatamente a 0, permettendo all'utente di digitare
      const newValue = value === "" ? "" : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        title: "Errore",
        description: "Il nome del servizio è obbligatorio",
        variant: "destructive",
      });
      return;
    }
    
    // Prepara i dati per l'invio, convertendo stringhe vuote o valori non validi in 0
    const dataToSubmit = {
      ...formData,
      duration: typeof formData.duration === 'string' ? parseInt(formData.duration) || 0 : formData.duration,
      price: typeof formData.price === 'string' ? parseFloat(formData.price) || 0 : formData.price
    };

    if (isEditing && formData.id) {
      updateServiceMutation.mutate(dataToSubmit);
    } else {
      createServiceMutation.mutate(dataToSubmit);
    }
  };

  const handleEditService = (service: Service) => {
    setFormData({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price: service.price,
      color: service.color || "#3b82f6",
      description: service.description || "",
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteService = (id: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo servizio?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      duration: 60,
      price: 0,
      color: "#3b82f6",
      description: "",
    });
    setIsEditing(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsDialogOpen(open);
  };

  // Formatta la durata in ore e minuti
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
    }
    return `${mins}m`;
  };

  // Formatta il prezzo come valuta
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !isLoading && services.length === 0) {
    console.log("❌ FRONTEND: Errore critico nel caricamento servizi:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Errore durante il caricamento dei servizi: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Gestione Trattamenti e Servizi</h3>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="flex gap-2 items-center">
              <PlusCircle className="h-4 w-4" />
              <span>Aggiungi Servizio</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Modifica Servizio" : "Nuovo Servizio"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Es. Terapia Bicom"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right">
                    Durata (min)
                  </Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Prezzo (€)
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="color" className="text-right">
                    Colore
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="color"
                      name="color"
                      type="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.color}
                      onChange={handleInputChange}
                      name="color"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descrizione
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Descrizione opzionale"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Annulla
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending}>
                  {createServiceMutation.isPending || updateServiceMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent"></div>
                      Salvataggio...
                    </span>
                  ) : (
                    "Salva"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Gestisci i trattamenti e i servizi offerti, inclusi durata e prezzo. Questi dati saranno utilizzati nei report e nelle fatture.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">Nome</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Colore</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services && services.length > 0 ? (
                services.map((service: Service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{formatDuration(service.duration)}</TableCell>
                    <TableCell>{formatPrice(service.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: service.color || "#3b82f6" }}
                        ></div>
                        <span className="text-xs text-muted-foreground">
                          {service.color || "#3b82f6"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditService(service)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Nessun servizio disponibile. Aggiungi il tuo primo servizio!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground mt-2">
        Nota: I servizi eliminati non saranno più disponibili per nuovi appuntamenti, ma quelli già programmati manterranno i dati originali.
      </div>
    </div>
  );
}