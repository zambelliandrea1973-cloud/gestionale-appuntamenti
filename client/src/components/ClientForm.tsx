import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertClientSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConsentForm from "./ConsentForm";

interface ClientFormProps {
  clientId?: number;
  onClose: () => void;
  onClientCreated?: (clientId: number) => void;
}

// Extended schema with validation
const formSchema = insertClientSchema.extend({
  firstName: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  lastName: z.string().min(2, "Il cognome deve contenere almeno 2 caratteri"),
  phone: z.string().min(6, "Il numero di telefono deve contenere almeno 6 cifre"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

// Lista dei prefissi internazionali più comuni
const countryPrefixes = [
  { value: "+39", label: "Italia (+39)" },
  { value: "+1", label: "USA/Canada (+1)" },
  { value: "+44", label: "Regno Unito (+44)" },
  { value: "+33", label: "Francia (+33)" },
  { value: "+49", label: "Germania (+49)" },
  { value: "+34", label: "Spagna (+34)" },
  { value: "+41", label: "Svizzera (+41)" },
  { value: "+43", label: "Austria (+43)" },
  { value: "+32", label: "Belgio (+32)" },
  { value: "+31", label: "Paesi Bassi (+31)" },
  { value: "+351", label: "Portogallo (+351)" },
  { value: "+30", label: "Grecia (+30)" },
  { value: "+46", label: "Svezia (+46)" },
  { value: "+47", label: "Norvegia (+47)" },
  { value: "+45", label: "Danimarca (+45)" },
  { value: "+358", label: "Finlandia (+358)" },
  { value: "+48", label: "Polonia (+48)" },
  { value: "+420", label: "Repubblica Ceca (+420)" },
  { value: "+36", label: "Ungheria (+36)" },
  { value: "+40", label: "Romania (+40)" },
];

export default function ClientForm({ 
  clientId,
  onClose,
  onClientCreated
}: ClientFormProps) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState("+39"); // Default a prefisso italiano
  const [activeTab, setActiveTab] = useState("personal");
  
  // Fetch client if editing
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId
  });
  
  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      birthday: "",
      notes: "",
      isFrequent: false,
      medicalNotes: "",
      allergies: "",
      taxCode: "",
      vatNumber: ""
    }
  });
  
  // Update form values when editing existing client
  useEffect(() => {
    if (client) {
      form.reset(client);
    }
  }, [client, form]);
  
  // Create or update client mutation
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("🚀 Mutation inizio - Dati da inviare:", data);
      
      if (clientId) {
        console.log("✏️ Aggiornamento cliente esistente:", clientId);
        return apiRequest("PUT", `/api/clients/${clientId}`, data);
      } else {
        console.log("➕ Creazione nuovo cliente");
        const response = await apiRequest("POST", "/api/clients", data);
        console.log("📡 Risposta server ricevuta:", response.status);
        return response;
      }
    },
    onSuccess: async (response) => {
      // Parse response JSON - do this first to avoid the body already read error
      let responseData;
      try {
        responseData = await response.clone().json();
        console.log("Response data:", responseData);
      } catch (e) {
        console.error("Error parsing response:", e);
      }
      
      toast({
        title: clientId ? "Cliente aggiornato" : "Cliente creato",
        description: clientId 
          ? "I dati del cliente sono stati aggiornati con successo" 
          : "Nuovo cliente creato con successo",
      });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      if (!clientId) {
        // If this is a new client, get the client ID from the response and call the callback
        // Reset form to default values to clear all fields
        form.reset({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          address: "",
          birthday: "",
          notes: "",
          isFrequent: false,
          medicalNotes: "",
          allergies: "",
          taxCode: "",
          vatNumber: ""
        });
        
        if (onClientCreated && responseData) {
          onClientCreated(responseData.id);
        }
      }
      
      // Chiudi sempre il form dopo un salvataggio riuscito
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormData) => {
    console.log("🔄 Form submit - Dati inviati:", data);
    console.log("📝 Form errors:", form.formState.errors);
    
    // Combina prefisso e numero di telefono se necessario
    if (data.phone && !data.phone.startsWith('+')) {
      data.phone = `${prefix}${data.phone}`;
      console.log("📞 Telefono combinato:", data.phone);
    }
    
    mutation.mutate(data);
  };
  
  // Loading state
  const isLoading = clientId && isLoadingClient;
  
  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {clientId ? "Modifica Cliente" : "Nuovo Cliente"}
        </DialogTitle>
      </DialogHeader>
      
      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 sticky top-0 bg-background z-10">
            <TabsTrigger value="personal">Dati Personali</TabsTrigger>
            <TabsTrigger value="medical">Dati Medici</TabsTrigger>
            <TabsTrigger value="consent">Consenso Dati</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log("❌ Form validation errors:", errors);
            })}>
              <TabsContent value="personal" className="space-y-4 py-4">
                {/* Personal information fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Cognome" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => {
                      // Estrai il prefisso dal numero di telefono esistente
                      useEffect(() => {
                        if (field.value) {
                          // Cerca un prefisso internazionale nel formato +XX o +XXX
                          const prefixMatch = field.value.match(/^\+(\d{1,3})/);
                          if (prefixMatch) {
                            // Trova il prefisso dall'elenco
                            const matchedPrefix = countryPrefixes.find(p => field.value.startsWith(p.value));
                            if (matchedPrefix) {
                              setPrefix(matchedPrefix.value);
                            }
                          }
                        }
                      }, [field.value]);
                      
                      // Gestisci il cambio di numero rimuovendo il prefisso esistente e aggiungendo quello nuovo
                      const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        let phoneValue = e.target.value;
                        
                        // Rimuovi qualsiasi prefisso internazionale esistente
                        if (phoneValue.startsWith('+')) {
                          for (const cp of countryPrefixes) {
                            if (phoneValue.startsWith(cp.value)) {
                              phoneValue = phoneValue.substring(cp.value.length);
                              break;
                            }
                          }
                        }
                        
                        // Aggiorna il campo con il nuovo prefisso e il numero
                        field.onChange(prefix + phoneValue);
                      };
                      
                      // Quando cambia il prefisso, aggiorna il numero completo
                      const handlePrefixChange = (newPrefix: string) => {
                        setPrefix(newPrefix);
                        
                        // Rimuovi il vecchio prefisso dal numero corrente
                        let phoneNumber = field.value;
                        if (phoneNumber.startsWith('+')) {
                          for (const cp of countryPrefixes) {
                            if (phoneNumber.startsWith(cp.value)) {
                              phoneNumber = phoneNumber.substring(cp.value.length);
                              break;
                            }
                          }
                        }
                        
                        // Aggiorna il campo con il nuovo prefisso
                        field.onChange(newPrefix + phoneNumber);
                      };
                      
                      // Rimuovi il prefisso per la visualizzazione nell'input
                      let displayValue = field.value;
                      if (displayValue.startsWith(prefix)) {
                        displayValue = displayValue.substring(prefix.length);
                      }
                      
                      return (
                        <FormItem>
                          <FormLabel>Telefono *</FormLabel>
                          <div className="flex space-x-2">
                            <Select value={prefix} onValueChange={handlePrefixChange}>
                              <FormControl>
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Prefisso" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countryPrefixes.map((prefix) => (
                                  <SelectItem key={prefix.value} value={prefix.value}>
                                    {prefix.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormControl>
                              <Input 
                                value={displayValue} 
                                onChange={handlePhoneChange} 
                                placeholder="Numero di telefono" 
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            Il numero di telefono deve includere il prefisso internazionale
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Email" type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="Indirizzo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice Fiscale</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="RSSMRA80A01H501Z" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partita IVA</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="12345678901" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data di nascita</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isFrequent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Cliente frequente</FormLabel>
                          <FormDescription>
                            Il cliente frequenta regolarmente
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Note sul cliente"
                          className="resize-none"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="medical" className="space-y-4 py-4">
                {/* Medical information fields */}
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergie</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali allergie"
                          className="resize-none"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="medicalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note mediche</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note mediche rilevanti"
                          className="resize-none"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Informazioni mediche rilevanti per i trattamenti (condizioni preesistenti, farmaci, ecc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="consent" className="py-4">
                {/* Consent form */}
                {clientId ? (
                  <ConsentForm clientId={clientId.toString()} />
                ) : (
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm">È possibile raccogliere il consenso al trattamento dei dati dopo aver creato il cliente.</p>
                  </div>
                )}
              </TabsContent>
              
              <DialogFooter className="mt-4 sticky bottom-0 bg-background py-2 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={mutation.isPending}
                >
                  Annulla
                </Button>
                {activeTab !== "consent" && (
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending}
                    onClick={() => console.log("🔘 Submit button clicked")}
                  >
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {clientId ? "Aggiorna Dati" : "Salva"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      )}
    </DialogContent>
  );
}
