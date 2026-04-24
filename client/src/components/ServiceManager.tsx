import { useState, useEffect, useCallback, useReducer } from "react";
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
import { PlusCircle, Pencil, Trash2, AlertCircle, Check, X, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
  const [forceRender, forceUpdate] = useReducer(x => x + 1, 0);
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startInlineEdit = (serviceId: number, field: string, value: any) => {
    setEditingService(serviceId);
    setEditingField(field);
    setEditValue(String(value ?? ''));
  };

  const cancelInlineEdit = () => {
    setEditingService(null);
    setEditingField(null);
    setEditValue('');
  };

  const saveInlineEdit = async () => {
    if (editingService === null || editingField === null) return;
    try {
      const response = await fetch(`/api/services/${editingService}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editingField]: editingField === 'duration' || editingField === 'price' ? Number(editValue) : editValue })
      });
      if (response.ok) {
        loadServices();
      }
    } catch (e) {
      console.error('Error saving inline edit:', e);
    }
    cancelInlineEdit();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveInlineEdit();
    if (e.key === 'Escape') cancelInlineEdit();
  };

  const loadServices = useCallback(async () => {
    if (!user?.id) {
      console.log("🔄 FRONTEND ServiceManager: Nessun utente autenticato, skip caricamento servizi");
      setServices([]);
      setIsLoading(false);
      return;
    }
    
    try {
      console.log(`🔄 FRONTEND ServiceManager: Caricamento servizi per utente ${user.id}`);
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest("GET", "/api/services");
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log("🔄 FRONTEND ServiceManager: Utente non autenticato, servizi vuoti");
          setServices([]);
          return;
        }
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ FRONTEND ServiceManager: ${data.length} servizi caricati per utente ${user.id}`);
      setServices(data);
      
    } catch (err) {
      console.error("❌ FRONTEND ServiceManager: Errore caricamento servizi:", err);
      setError(err instanceof Error ? err : new Error('Errore sconosciuto'));
      setServices([]);
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
      
      // AGGIORNAMENTO IMMEDIATO FORZATO - BYPASS di qualsiasi problema di re-render
      setServices(prev => {
        const updated = [...prev, newService];
        console.log("📝 FRONTEND: AGGIORNAMENTO DIRETTO nella mutationFn:", updated);
        return updated;
      });
      
      // Forza re-render immediato
      forceUpdate();
      
      return newService;
    },
    onSuccess: (newService) => {
      console.log(`🎉 FRONTEND: onSuccess chiamato per utente ${user?.id}:`, newService);
      
      // FORZA aggiornamento immediato - BYPASS di qualsiasi cache
      setServices(currentServices => {
        const updatedServices = [...currentServices, newService];
        console.log(`📝 FRONTEND: AGGIORNAMENTO FORZATO per utente ${user?.id}:`, updatedServices);
        return updatedServices;
      });
      
      // Forza re-render del componente
      setIsLoading(false);
      
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: t('serviceManager.toast.created.title'),
        description: t('serviceManager.toast.created.desc'),
      });
      
      // Ricarica IMMEDIATA dal backend
      setTimeout(() => {
        console.log("🔄 FRONTEND: Ricarica forzata dal backend");
        loadServices();
      }, 50);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
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
        title: t('serviceManager.toast.updated.title'),
        description: t('serviceManager.toast.updated.desc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un servizio
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("🗑️ FRONTEND: Inizio eliminazione servizio ID:", id);
      const response = await apiRequest("DELETE", `/api/services/${id}`);
      console.log("📡 FRONTEND: Risposta eliminazione:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'eliminazione del servizio");
      }
      
      // AGGIORNAMENTO IMMEDIATO FORZATO - BYPASS di qualsiasi problema di re-render
      setServices(prev => {
        const updated = prev.filter(s => s.id !== id);
        console.log("📝 FRONTEND: ELIMINAZIONE DIRETTA nella mutationFn:", updated);
        return updated;
      });
      
      // Forza re-render immediato
      forceUpdate();
      
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
        title: t('serviceManager.toast.deleted.title'),
        description: t('serviceManager.toast.deleted.desc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
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
        title: t('common.error'),
        description: t('serviceManager.errors.requiredName'),
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
    if (window.confirm(t('serviceManager.confirmDelete'))) {
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
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription>
          {t('serviceManager.errors.loadingDesc', { message: error.message })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('serviceManager.heading')}</h3>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="flex gap-2 items-center">
              <PlusCircle className="h-4 w-4" />
              <span>{t('serviceManager.addService')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="min-[1200px]:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? t('serviceManager.editService') : t('serviceManager.newService')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    {t('serviceManager.fields.name')}
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder={t('serviceManager.fields.namePlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right">
                    {t('serviceManager.fields.duration')}
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
                    {t('serviceManager.fields.price')}
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
                    {t('serviceManager.fields.color')}
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
                    {t('serviceManager.fields.description')}
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder={t('serviceManager.fields.descriptionPlaceholder')}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t('common.cancel')}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending}>
                  {createServiceMutation.isPending || updateServiceMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent"></div>
                      {t('serviceManager.savingButton')}
                    </span>
                  ) : (
                    t('common.save')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t('serviceManager.intro')}
        </p>
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
          <Edit3 className="h-3 w-3" />
          <span>{t('serviceManager.quickEditHint')}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">{t('serviceManager.tableHeaders.name')}</TableHead>
                <TableHead>{t('serviceManager.tableHeaders.duration')}</TableHead>
                <TableHead>{t('serviceManager.tableHeaders.price')}</TableHead>
                <TableHead>{t('serviceManager.tableHeaders.color')}</TableHead>
                <TableHead className="text-right">{t('serviceManager.tableHeaders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services && services.length > 0 ? (
                services.map((service: Service) => (
                  <TableRow key={service.id}>
                    {/* Nome servizio - editabile inline */}
                    <TableCell className="font-medium">
                      {editingService === service.id && editingField === 'name' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={saveInlineEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-2 py-1 -mx-2 group transition-all"
                          onClick={() => startInlineEdit(service.id, 'name', service.name)}
                          title={t('serviceManager.editTooltips.name')}
                        >
                          <span className="group-hover:text-blue-700">{service.name}</span>
                          <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                        </div>
                      )}
                    </TableCell>

                    {/* Durata - editabile inline */}
                    <TableCell>
                      {editingService === service.id && editingField === 'duration' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-8 w-20"
                            min="15"
                            step="15"
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">min</span>
                          <Button size="sm" variant="ghost" onClick={saveInlineEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-2 py-1 -mx-2 group transition-all"
                          onClick={() => startInlineEdit(service.id, 'duration', service.duration)}
                          title={t('serviceManager.editTooltips.duration')}
                        >
                          <span className="group-hover:text-blue-700">{formatDuration(service.duration)}</span>
                          <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                        </div>
                      )}
                    </TableCell>

                    {/* Prezzo - editabile inline */}
                    <TableCell>
                      {editingService === service.id && editingField === 'price' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-8 w-20"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">€</span>
                          <Button size="sm" variant="ghost" onClick={saveInlineEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-2 py-1 -mx-2 group transition-all"
                          onClick={() => startInlineEdit(service.id, 'price', service.price)}
                          title={t('serviceManager.editTooltips.price')}
                        >
                          <span className="group-hover:text-blue-700">{formatPrice(service.price)}</span>
                          <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                        </div>
                      )}
                    </TableCell>

                    {/* Colore - editabile inline */}
                    <TableCell>
                      {editingService === service.id && editingField === 'color' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-8 w-12 p-1"
                            autoFocus
                          />
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-8 w-20 text-xs"
                            placeholder="#000000"
                          />
                          <Button size="sm" variant="ghost" onClick={saveInlineEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-2 py-1 -mx-2 group transition-all"
                          onClick={() => startInlineEdit(service.id, 'color', service.color || '#3b82f6')}
                          title={t('serviceManager.editTooltips.color')}
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: service.color || "#3b82f6" }}
                          ></div>
                          <span className="text-xs text-muted-foreground group-hover:text-blue-700">
                            {service.color || "#3b82f6"}
                          </span>
                          <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditService(service)}
                          title={t('serviceManager.actionTitles.editFull')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteService(service.id)}
                          title={t('serviceManager.actionTitles.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <p className="text-muted-foreground">{t('serviceManager.empty.title')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('serviceManager.empty.subtitle')}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground mt-2">
        {t('serviceManager.footnote')}
      </div>
    </div>
  );
}