import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

  // Stati per la modifica servizi
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    duration: "",
    price: "",
    color: "#3b82f6"
  });
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

  // Mutation per aggiornare servizio con React Query
  const updateServiceMutation = useMutation({
    mutationFn: async (serviceData: { id: number; name: string; duration: number; price: number; color: string }) => {
      const response = await apiRequest("PUT", `/api/services/${serviceData.id}`, {
        name: serviceData.name,
        duration: serviceData.duration,
        price: serviceData.price,
        color: serviceData.color
      });
      return response;
    },
    onSuccess: (_, updatedService) => {
      console.log(`✏️ REACT QUERY: Servizio aggiornato per utente ${user?.id}:`, updatedService);
      
      // Invalida e ricarica automaticamente la cache dei servizi
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setLastUpdate(new Date());
      setIsEditDialogOpen(false);
      setEditingService(null);
      
      toast({ title: "Servizio aggiornato!" });
    },
    onError: (error: any) => {
      console.error('Errore aggiornamento:', error);
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    }
  });

  // Elimina servizio
  const deleteService = async (id: number) => {
    deleteServiceMutation.mutate(id);
  };

  // Apre il dialog di modifica servizio
  const openEditDialog = (service: any) => {
    setEditingService(service);
    setEditForm({
      name: service.name,
      duration: service.duration.toString(),
      price: service.price.toString(),
      color: service.color || "#3b82f6"
    });
    setIsEditDialogOpen(true);
  };

  // Salva le modifiche al servizio
  const saveEditedService = () => {
    if (!editingService || !editForm.name.trim()) {
      toast({ title: "Inserisci un nome per il servizio", variant: "destructive" });
      return;
    }

    const serviceData = {
      id: editingService.id,
      name: editForm.name.trim(),
      duration: parseInt(editForm.duration) || 60,
      price: parseFloat(editForm.price) || 0,
      color: editForm.color
    };

    updateServiceMutation.mutate(serviceData);
  };

  // Chiude il dialog di modifica
  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingService(null);
    setEditForm({
      name: "",
      duration: "",
      price: "",
      color: "#3b82f6"
    });
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
                          onClick={() => openEditDialog(service)}
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

      {/* Dialog di modifica servizio */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifica Servizio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="Nome del servizio"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-duration" className="text-right">
                Durata (min)
              </Label>
              <Input
                id="edit-duration"
                type="number"
                value={editForm.duration}
                onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                className="col-span-3"
                placeholder="60"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">
                Prezzo (€)
              </Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-color" className="text-right">
                Colore
              </Label>
              <div className="col-span-3 flex gap-2 items-center">
                <Input
                  id="edit-color"
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={editForm.color}
                  onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Annulla
            </Button>
            <Button 
              onClick={saveEditedService}
              disabled={updateServiceMutation.isPending}
            >
              {updateServiceMutation.isPending ? "Salvando..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}