// @ts-nocheck
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pencil, Trash2, Globe, CircleOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useCurrency } from "@/hooks/use-currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  userId: number;
  color?: string | null;
  onlineBooking?: boolean;
  isDemo?: boolean;
  isDefault?: boolean;
}

export default function SimpleServiceManager() {
  const { t } = useTranslation();
  const { user } = useUserWithLicense();
  const { symbol } = useCurrency();
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
  const { data: services = [], isLoading: loading, error } = useQuery<any>({
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
      
      toast({ title: t('services.serviceCreated') });
    },
    onError: (error: any) => {
      console.error('Errore creazione:', error);
      toast({ title: t('services.createError'), variant: "destructive" });
    }
  });

  // Crea nuovo servizio
  const createService = async () => {
    if (!newServiceName.trim()) {
      toast({ title: t('services.enterName'), variant: "destructive" });
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
      
      toast({ title: t('services.serviceDeleted') });
    },
    onError: (error: any) => {
      console.error('Errore eliminazione:', error);
      toast({ title: t('services.deleteError'), variant: "destructive" });
    }
  });

  const toggleOnlineBookingMutation = useMutation({
    mutationFn: async ({ id, onlineBooking }: { id: number; onlineBooking: boolean }) => {
      const response = await apiRequest("PUT", `/api/services/${id}`, { onlineBooking });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    },
    onError: (error: any) => {
      console.error('Errore toggle online booking:', error);
      toast({ title: t('common.error'), variant: "destructive" });
    }
  });

  const toggleAllOnlineBookingMutation = useMutation({
    mutationFn: async (onlineBooking: boolean) => {
      const promises = services.map((s: Service) =>
        apiRequest("PUT", `/api/services/${s.id}`, { onlineBooking })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({ title: onlineBooking ? t('services.allOnlineEnabled') : t('services.allOnlineDisabled') });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: "destructive" });
    }
  });

  const allOnlineEnabled = services.length > 0 && services.every((s: Service) => s.onlineBooking !== false);
  const onlineBooking = allOnlineEnabled;

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
      
      toast({ title: t('services.serviceUpdated') });
    },
    onError: (error: any) => {
      console.error('Errore aggiornamento:', error);
      toast({ title: t('services.updateError'), variant: "destructive" });
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
      toast({ title: t('services.enterName'), variant: "destructive" });
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
        <CardHeader className="pb-7">
          <CardTitle>{t('services.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('services.description')}
          </p>
          <div className="pt-3">
            <Button onClick={createService} disabled={loading} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('services.newService')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 italic">
            {t('services.createInstruction')} <span className="font-semibold">{t('services.newService')}</span>
          </p>
          
          {/* Form per nuovo servizio */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
            <Input
              placeholder={t('services.serviceName')}
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Input
              placeholder={t('services.durationMin')}
              type="number"
              value={newServiceDuration}
              onChange={(e) => setNewServiceDuration(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createService()}
            />
            <Input
              placeholder={`${t('services.price')} (${symbol})`}
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

          {loading && services.length === 0 ? (
            <div className="text-center py-8">{t('services.loading')}</div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-3">
              <p>{t('services.noServices')}</p>
              <p className="text-sm">{t('services.noServicesHint', 'Set up the services you offer your clients to start receiving bookings.')}</p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead colSpan={5} className="py-3 px-4 bg-blue-50/50 border rounded-l-lg border-r-0 h-auto">
                    <div className="flex items-center gap-2">
                      {allOnlineEnabled ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <CircleOff className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{t('services.onlineBookingTitle', 'Online Booking')}</p>
                        <p className="text-xs text-muted-foreground font-normal">{t('services.onlineBookingDesc', 'Enable or disable online booking for each service. Disabled services will not appear in the client app.')}</p>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 px-4 bg-blue-50/50 border rounded-r-lg border-l-0 text-center h-auto">
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={allOnlineEnabled}
                        onCheckedChange={(checked) => toggleAllOnlineBookingMutation.mutate(checked)}
                        disabled={toggleAllOnlineBookingMutation.isPending || services.length === 0}
                      />
                      <span className="text-xs text-muted-foreground font-normal whitespace-nowrap">
                        {allOnlineEnabled ? t('services.disableAllOnline', 'Disable all') : t('services.enableAllOnline', 'Enable all')}
                      </span>
                    </div>
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead>{t('services.name')}</TableHead>
                  <TableHead>{t('services.duration')}</TableHead>
                  <TableHead>{t('services.price')}</TableHead>
                  <TableHead>{t('services.color')}</TableHead>
                  <TableHead>{t('services.actions')}</TableHead>
                  <TableHead className="text-center">{t('services.onlineHeader', 'Prenotazioni Online')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} className={service.onlineBooking === false ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{service.name}</span>
                        {service.isDemo && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide border-gray-300 text-gray-500 bg-gray-100"
                            data-testid={`badge-demo-service-${service.id}`}
                          >
                            {t('common.demoLabel')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell>{symbol}{service.price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: service.color || '#3b82f6' }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(service)}
                          className="text-blue-600 hover:text-blue-700"
                          title={t('services.editService')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteService(service.id)}
                          className="text-red-600 hover:text-red-700"
                          title={t('services.deleteService')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={service.onlineBooking !== false}
                        onCheckedChange={(checked) => toggleOnlineBookingMutation.mutate({ id: service.id, onlineBooking: checked })}
                        disabled={toggleOnlineBookingMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}

          <div className="mt-4 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
            {t('services.servicesLoaded')}: {services.length} | {t('services.lastUpdate')}: {lastUpdate ? lastUpdate.toLocaleTimeString() : t('services.never')}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('services.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                {t('services.name')}
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder={t('services.servicePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-duration" className="text-right">
                {t('services.durationMin')}
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
                {t('services.price')} ({symbol})
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
                {t('services.color')}
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
              {t('services.cancel')}
            </Button>
            <Button 
              onClick={saveEditedService}
              disabled={updateServiceMutation.isPending}
            >
              {updateServiceMutation.isPending ? t('services.saving') : t('services.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}