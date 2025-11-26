import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package,
  PackagePlus,
  Users,
  Gift,
  Calendar,
  Clock,
  Euro,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";

// Schema validazione per template pacchetto
const packageTemplateSchema = z.object({
  name: z.string().min(1, "Nome pacchetto richiesto"),
  description: z.string().optional(),
  serviceIds: z.array(z.number()).min(1, "Seleziona almeno un servizio"),
  totalSessions: z.number().min(1, "Numero sedute deve essere almeno 1"),
  price: z.number().min(0, "Prezzo deve essere positivo"),
  expirationDays: z.number().optional(),
});

// Schema validazione per vendita pacchetto
const packagePurchaseSchema = z.object({
  templateId: z.number(),
  clientId: z.number(),
  purchaseDate: z.string(),
  notes: z.string().optional(),
});

export default function PackagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol, formatPrice } = useCurrency();
  
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Fetch templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/packages/templates"],
  });
  
  // Fetch purchases
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ["/api/packages/purchases"],
  });
  
  // Fetch services per multi-select
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
  });
  
  // Fetch clients per vendita
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  // Form per creare template
  const templateForm = useForm({
    resolver: zodResolver(packageTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      serviceIds: [],
      totalSessions: 10,
      price: 0,
      expirationDays: undefined,
    },
  });
  
  // Form per vendere pacchetto
  const purchaseForm = useForm({
    resolver: zodResolver(packagePurchaseSchema),
    defaultValues: {
      templateId: 0,
      clientId: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });
  
  // Mutation: Crea template
  const createTemplate = useMutation({
    mutationFn: async (data: any) => {
      // Converti prezzo da euro a centesimi
      const priceInCents = Math.round(data.price * 100);
      
      const response = await apiRequest("POST", "/api/packages/templates", {
        ...data,
        price: priceInCents
      });
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages/templates"] });
      setTemplateDialogOpen(false);
      templateForm.reset();
      toast({
        title: "Template creato",
        description: "Il pacchetto promozionale è stato creato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare il template",
        variant: "destructive",
      });
    },
  });
  
  // Mutation: Vendi pacchetto
  const createPurchase = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/packages/purchases", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages/purchases"] });
      setPurchaseDialogOpen(false);
      purchaseForm.reset();
      toast({
        title: "Pacchetto venduto",
        description: "Il pacchetto è stato assegnato al cliente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile vendere il pacchetto",
        variant: "destructive",
      });
    },
  });
  
  // Mutation: Elimina template
  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/packages/templates/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages/templates"] });
      toast({
        title: "Template eliminato",
        description: "Il template è stato eliminato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare il template",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmitTemplate = (data: any) => {
    createTemplate.mutate(data);
  };
  
  const handleSubmitPurchase = (data: any) => {
    createPurchase.mutate(data);
  };
  
  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center flex-wrap gap-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pacchetti Promozionali</h1>
          <Badge variant="outline">PRO</Badge>
        </div>
        
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <PackagePlus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Pacchetto</span>
              <span className="sm:hidden">Nuovo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Pacchetto Promozionale</DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-4">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Pacchetto</FormLabel>
                      <FormControl>
                        <Input placeholder="es. 10 Trattamenti Viso Premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrizione del pacchetto..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="totalSessions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero Sedute</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={templateForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo Totale ({symbol})</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="500.00"
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={templateForm.control}
                  name="expirationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validità (giorni, opzionale)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="180"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="serviceIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servizi Inclusi</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            const serviceId = parseInt(value);
                            if (!field.value.includes(serviceId)) {
                              field.onChange([...field.value, serviceId]);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Aggiungi servizio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service: any) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((serviceId: number) => {
                          const service = services.find((s: any) => s.id === serviceId);
                          return service ? (
                            <Badge key={serviceId} variant="secondary">
                              {service.name}
                              <button
                                type="button"
                                className="ml-2"
                                onClick={() => field.onChange(field.value.filter((id: number) => id !== serviceId))}
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createTemplate.isPending}>
                    {createTemplate.isPending ? "Creazione..." : "Crea Pacchetto"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Modelli Pacchetti</TabsTrigger>
          <TabsTrigger value="purchases">Pacchetti Venduti</TabsTrigger>
        </TabsList>
        
        {/* Tab: Modelli Pacchetti */}
        <TabsContent value="templates" className="space-y-4">
          {loadingTemplates ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Caricamento...
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Nessun pacchetto promozionale creato</p>
                <Button onClick={() => setTemplateDialogOpen(true)}>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Crea il tuo primo pacchetto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template: any) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-2">{template.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Attivo" : "Disattivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sedute:</span>
                        <span className="font-medium">{template.totalSessions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Prezzo:</span>
                        <span className="font-medium">{formatPrice(template.price / 100)}</span>
                      </div>
                      {template.expirationDays && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Validità:</span>
                          <span className="font-medium">{template.expirationDays} giorni</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Servizi:</span>
                        <span className="font-medium">{template.serviceIds?.length || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Vendi
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Vendi Pacchetto: {template.name}</DialogTitle>
                          </DialogHeader>
                          <Form {...purchaseForm}>
                            <form onSubmit={purchaseForm.handleSubmit((data) => {
                              handleSubmitPurchase({
                                ...data,
                                templateId: template.id
                              });
                            })} className="space-y-4">
                              <FormField
                                control={purchaseForm.control}
                                name="clientId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cliente</FormLabel>
                                    <FormControl>
                                      <Select
                                        onValueChange={(value) => field.onChange(parseInt(value))}
                                        value={field.value?.toString()}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seleziona cliente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {clients.map((client: any) => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                              {client.firstName} {client.lastName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={purchaseForm.control}
                                name="purchaseDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Data Acquisto</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={purchaseForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Note (opzionale)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
                                  Annulla
                                </Button>
                                <Button type="submit" disabled={createPurchase.isPending}>
                                  {createPurchase.isPending ? "Vendita..." : "Vendi Pacchetto"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare questo template? Questa azione non può essere annullata.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplate.mutate(template.id)}>
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Tab: Pacchetti Venduti */}
        <TabsContent value="purchases" className="space-y-4">
          {loadingPurchases ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Caricamento...
              </CardContent>
            </Card>
          ) : purchases.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nessun pacchetto venduto ancora</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase: any) => {
                const progressPercent = ((purchase.sessionsTotal - purchase.sessionsRemaining) / purchase.sessionsTotal) * 100;
                const isExpiring = purchase.expiresAt && 
                  new Date(purchase.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 giorni
                
                return (
                  <Card key={purchase.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{purchase.templateName}</CardTitle>
                          <CardDescription className="mt-1">
                            {purchase.clientFirstName} {purchase.clientLastName}
                          </CardDescription>
                        </div>
                        <Badge variant={
                          purchase.status === 'active' ? 'default' :
                          purchase.status === 'completed' ? 'secondary' :
                          purchase.status === 'expired' ? 'destructive' :
                          'outline'
                        }>
                          {purchase.status === 'active' ? 'Attivo' :
                           purchase.status === 'completed' ? 'Completato' :
                           purchase.status === 'expired' ? 'Scaduto' :
                           purchase.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Barra progresso */}
                      <div>
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span className="text-muted-foreground">Progresso sedute</span>
                          <span className="font-medium">
                            {purchase.sessionsTotal - purchase.sessionsRemaining} / {purchase.sessionsTotal}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Acquistato il:</span>
                          <span className="font-medium">{purchase.purchaseDate}</span>
                        </div>
                        {purchase.expiresAt && (
                          <div>
                            <span className="text-muted-foreground block">Scade il:</span>
                            <span className={`font-medium ${isExpiring ? 'text-orange-600' : ''}`}>
                              {purchase.expiresAt}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground block">Sedute rimanenti:</span>
                          <span className="font-medium text-lg">{purchase.sessionsRemaining}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Prezzo pagato:</span>
                          <span className="font-medium">{formatPrice(purchase.templatePrice / 100)}</span>
                        </div>
                      </div>
                      
                      {purchase.notes && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground text-sm block mb-1">Note:</span>
                          <p className="text-sm">{purchase.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
