import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
  ownerId?: number;
}

interface ServiceFormData {
  id?: number;
  name: string;
  duration: number | string;
  price: number | string;
  color?: string;
  description?: string;
}

export default function ServiceManagerSimple() {
  const { user } = useUserWithLicense();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    duration: 30,
    price: 50,
    color: "#3b82f6",
    description: "",
  });

  console.log("🔧 SIMPLE: ServiceManager per utente", user?.id);
  console.log("🔧 USER STATE:", { user, hasId: !!user?.id });

  // Fetch services
  const { data: services = [], isLoading, error } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user?.id,
  });

  console.log("🔧 REACT QUERY: Servizi caricati e persistiti:", services);
  console.log("🔧 TABELLA: Rendering tabella con", services.length, "servizi");
  console.log("🔧 LOADING STATE:", { 
    isLoading, 
    hasUser: !!user?.id, 
    userEnabled: !!user?.id,
    servicesLength: services.length,
    error: error?.message
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await apiRequest("POST", "/api/services", {
        name: data.name,
        duration: Number(data.duration),
        price: Number(data.price),
        color: data.color || "#3b82f6",
        description: data.description || "",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Successo",
        description: "Servizio creato con successo",
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

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await apiRequest("PUT", `/api/services/${data.id}`, {
        name: data.name,
        duration: Number(data.duration),
        price: Number(data.price),
        color: data.color || "#3b82f6",
        description: data.description || "",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Successo",
        description: "Servizio aggiornato con successo",
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

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Successo",
        description: "Servizio eliminato con successo",
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
    console.log("🗑️ FRONTEND: Tentativo eliminazione servizio con ID:", id);
    console.log("🗑️ FRONTEND: Tipo ID:", typeof id);
    if (window.confirm("Sei sicuro di voler eliminare questo servizio?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      duration: 30,
      price: 50,
      color: "#3b82f6",
      description: "",
    });
    setIsEditing(false);
  };

  const editService = (service: Service) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Errore",
        description: "Il nome del servizio è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    if (Number(formData.duration) <= 0) {
      toast({
        title: "Errore", 
        description: "La durata deve essere maggiore di 0",
        variant: "destructive",
      });
      return;
    }

    if (Number(formData.price) < 0) {
      toast({
        title: "Errore",
        description: "Il prezzo non può essere negativo",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      updateServiceMutation.mutate(formData);
    } else {
      createServiceMutation.mutate(formData);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Rimuovo la condizione di loading per forzare il rendering
  // if (isLoading && services.length === 0) {
  //   console.log("🔧 LOADING: Componente in stato di caricamento");
  //   return <div>Caricamento servizi...</div>;
  // }

  console.log("🔧 RENDER: ServiceManagerSimple sta renderizzando la tabella");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestione Servizi</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci i trattamenti e i servizi offerti, inclusi durata e prezzo. Questi dati saranno utilizzati nei report e nelle fatture.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Servizi Disponibili</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Servizio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Modifica Servizio" : "Nuovo Servizio"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Servizio *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Es. Consulenza Generale"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durata (minuti) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      min="15"
                      step="15"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Prezzo (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Colore</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrizione opzionale del servizio"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  >
                    {isEditing ? "Aggiorna" : "Crea"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
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
              {services.map((service: Service) => (
                <TableRow key={`service-${service.id}`}>
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
                      {!service.isDefault && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => editService(service)}
                            title="Modifica servizio"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteService(service.id)}
                            title="Elimina servizio"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {service.isDefault && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          Servizio predefinito
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {services.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>Nessun servizio configurato.</p>
              <p className="text-sm">Aggiungi il primo servizio per iniziare.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}