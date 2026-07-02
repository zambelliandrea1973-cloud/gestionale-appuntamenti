import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertClientSchema } from "../../../shared/schema";
import { Loader2, AlertTriangle, Tag } from "lucide-react";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  onClose?: () => void;
  onSuccess?: () => void;
  onClientCreated?: (clientId: number) => void;
}

// Extended schema with validation (escludiamo userId perché viene aggiunto automaticamente)
// I messaggi di errore sono chiavi i18n e vengono tradotti automaticamente da <FormMessage />
const formSchema = insertClientSchema.omit({ userId: true, ownerId: true }).extend({
  firstName: z.string().min(2, "clientForm.nameMinChars"),
  lastName: z.string().min(2, "clientForm.lastNameMinChars"),
  phone: z.string().min(6, "clientForm.phoneMinChars"),
  email: z.string().email("clientForm.emailInvalid").or(z.literal("")),
  gender: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Lista dei prefissi internazionali piu comuni
function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}

const countryPrefixes = [
  { value: "+39", labelKey: "italy" },
  { value: "+1", labelKey: "usaCanada" },
  { value: "+44", labelKey: "unitedKingdom" },
  { value: "+33", labelKey: "france" },
  { value: "+49", labelKey: "germany" },
  { value: "+34", labelKey: "spain" },
  { value: "+41", labelKey: "switzerland" },
  { value: "+43", labelKey: "austria" },
  { value: "+32", labelKey: "belgium" },
  { value: "+31", labelKey: "netherlands" },
  { value: "+351", labelKey: "portugal" },
  { value: "+30", labelKey: "greece" },
  { value: "+46", labelKey: "sweden" },
  { value: "+47", labelKey: "norway" },
  { value: "+45", labelKey: "denmark" },
  { value: "+358", labelKey: "finland" },
  { value: "+48", labelKey: "poland" },
  { value: "+420", labelKey: "czechRepublic" },
  { value: "+36", labelKey: "hungary" },
  { value: "+40", labelKey: "romania" },
];

export default function ClientForm({ 
  clientId,
  onClose,
  onSuccess,
  onClientCreated
}: ClientFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUserWithLicense();
  const [prefix, setPrefix] = useState("+39");
  const [activeTab, setActiveTab] = useState("personal");
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [duplicateClients, setDuplicateClients] = useState<any[]>([]);
  const [pendingData, setPendingData] = useState<any>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastNameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const focusOnEnter = (nextRef: React.RefObject<HTMLInputElement>) => (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };
  
  // Fetch client if editing
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId
  });

  // Fetch next client code preview (only when creating new client)
  const { data: nextCodeData } = useQuery<{ previewCode: string }>({
    queryKey: ['/api/clients/next-code'],
    enabled: !clientId,
    staleTime: 0,
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
      vatNumber: "",
      gender: null
    }
  });
  
  // Update form values when editing existing client
  useEffect(() => {
    if (client) {
      form.reset(client);
    }
  }, [client, form]);
  
  // Extract prefix from phone number when it changes
  useEffect(() => {
    const phoneValue = form.watch('phone');
    if (phoneValue) {
      const prefixMatch = phoneValue.match(/^\+(\d{1,3})/);
      if (prefixMatch) {
        const matchedPrefix = countryPrefixes.find(p => phoneValue.startsWith(p.value));
        if (matchedPrefix) {
          setPrefix(matchedPrefix.value);
        }
      }
    }
  }, [form.watch('phone')]);
  
  // Create or update client mutation
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("🚀 Mutation start - Data to send:", data);
      
      if (clientId) {
        console.log("✏️ Updating existing client:", clientId);
        return apiRequest("PUT", `/api/clients/${clientId}`, data);
      } else {
        console.log("➕ Creating new client");
        const response = await apiRequest("POST", "/api/clients", data);
        console.log("📡 Server response received:", response.status);
        return response;
      }
    },
    onSuccess: async (response) => {
      console.log("✅ onSuccess called, response type:", typeof response);
      
      // Parse response JSON - do this first to get the client ID
      let responseData;
      try {
        responseData = await response.clone().json();
        console.log("✅ Response data parsed:", responseData);
      } catch (e) {
        console.error("❌ Error parsing response:", e);
      }
      
      toast({
        title: clientId ? t('clientForm.clientUpdated') : t('clientForm.clientCreated'),
        description: clientId 
          ? t('clientForm.clientUpdatedDesc') 
          : t('clientForm.clientCreatedDesc'),
      });

      // Aggiorna immediatamente la cache con i dati già disponibili nella risposta
      // (senza aspettare il refetch, così la card si aggiorna subito)
      if (clientId && responseData) {
        queryClient.setQueryData(['/api/clients'], (oldData: any[]) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map((c: any) => c.id === responseData.id ? responseData : c);
        });
        queryClient.setQueryData([`/api/clients/${clientId}`], responseData);
      }

      // Invalida e ricarica in background per sicurezza
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/clients'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/clients/next-code'] });
      
      if (!clientId) {
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
          vatNumber: "",
          gender: null
        });
        
        // Call onClientCreated with the new client ID
        if (onClientCreated && responseData) {
          onClientCreated(responseData.id);
        }
      }
      
      // Chiudi sempre il form dopo un salvataggio riuscito
      if (onClose) {
        onClose();
      }
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: t('clientForm.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const submitClientData = (data: FormData) => {
    if (!user?.id) {
      toast({
        title: t('clientForm.error'),
        description: t('clientForm.notAuthenticated'),
        variant: "destructive",
      });
      return;
    }
    
    if (data.phone && !data.phone.startsWith('+')) {
      data.phone = `${prefix}${data.phone}`;
    }
    
    const dataWithUserId = {
      ...data,
      userId: user.id,
      ownerId: user.id
    };
    
    mutation.mutate(dataWithUserId);
  };

  const onSubmit = async (data: FormData) => {
    if (clientId) {
      submitClientData(data);
      return;
    }
    
    if (!user?.id) {
      toast({
        title: t('clientForm.error'),
        description: t('clientForm.notAuthenticated'),
        variant: "destructive",
      });
      return;
    }
    
    if (data.phone && !data.phone.startsWith('+')) {
      data.phone = `${prefix}${data.phone}`;
    }
    
    setIsCheckingDuplicates(true);
    try {
      const response = await apiRequest("POST", "/api/clients/check-duplicate", {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      });
      const result = await response.json();
      
      if (result.hasDuplicates && result.duplicates.length > 0) {
        setDuplicateClients(result.duplicates);
        setPendingData(data);
        setShowDuplicateAlert(true);
        return;
      }
    } catch (error) {
      console.error("Duplicate check error:", error);
    } finally {
      setIsCheckingDuplicates(false);
    }
    
    submitClientData(data);
  };
  
  // Loading state
  const isLoading = clientId && isLoadingClient;
  
  return (
    <DialogContent className="min-[1200px]:max-w-[600px] max-h-[85vh] min-[1200px]:max-h-[90vh] flex flex-col p-0">
      <DialogHeader className="px-4 pt-4 min-[1200px]:px-6 min-[1200px]:pt-6">
        <DialogTitle className="text-xl min-[1200px]:text-lg">
          {clientId ? t('clientForm.editClient') : t('clientForm.newClient')}
        </DialogTitle>
      </DialogHeader>
      
      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-3 mx-4 min-[1200px]:mx-6 mb-2 flex-shrink-0" style={{ maxWidth: "calc(100% - 2rem)" }}>
            <TabsTrigger value="personal" className="text-sm px-2">{t('clientForm.personalData')}</TabsTrigger>
            <TabsTrigger value="medical" className="text-sm px-2">{t('clientForm.medicalData')}</TabsTrigger>
            <TabsTrigger value="consent" className="text-sm px-2">{t('clientForm.gdprConsent')}</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log("❌ Form validation errors:", errors);
            })} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-6 touch-manipulation">
                <TabsContent value="personal" className="space-y-4 py-4 mt-0">
                {/* Client code preview – only shown when creating a new client */}
                {!clientId && nextCodeData?.previewCode && (
                  <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {t('clientForm.codePreview', { code: nextCodeData.previewCode })}
                    </span>
                  </div>
                )}
                {/* Personal information fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('clientForm.firstName')} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            ref={mergeRefs(field.ref, firstNameInputRef)}
                            placeholder={t('clientForm.firstName')}
                            autoFocus={!clientId}
                            onKeyDown={focusOnEnter(lastNameInputRef)}
                          />
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
                        <FormLabel>{t('clientForm.lastName')} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            ref={mergeRefs(field.ref, lastNameInputRef)}
                            placeholder={t('clientForm.lastName')}
                            onKeyDown={focusOnEnter(phoneInputRef)}
                          />
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
                          <FormLabel>{t('clientForm.phone')} *</FormLabel>
                          <div className="flex space-x-1">
                            <Select value={prefix} onValueChange={handlePrefixChange}>
                              <FormControl>
                                <SelectTrigger className="w-[90px] shrink-0 px-2">
                                  <SelectValue placeholder={t('clientForm.prefixPlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countryPrefixes.map((prefix) => (
                                  <SelectItem key={prefix.value} value={prefix.value}>
                                    {t(`i18nFinale.countryPrefixes.${prefix.labelKey}`)} ({prefix.value})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormControl>
                              <Input 
                                value={displayValue} 
                                onChange={handlePhoneChange} 
                                placeholder={t('clientForm.phonePlaceholder')} 
                                ref={phoneInputRef}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            {t('clientForm.phoneDescription')}
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
                        <FormLabel>{t('clientForm.email')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('clientForm.email')} type="email" />
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
                      <FormLabel>{t('clientForm.address')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('clientForm.address')} />
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
                        <FormLabel>{t('clientForm.taxCode')}</FormLabel>
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
                        <FormLabel>{t('clientForm.vatNumber')}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="12345678901" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Sesso */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('clientForm.gender', 'Sesso')}</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value === 'male' ? null : 'male')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                              field.value === 'male'
                                ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-indigo-50'
                            }`}
                          >
                            ♂ {t('clientForm.genderMale', 'Uomo')}
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value === 'female' ? null : 'female')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                              field.value === 'female'
                                ? 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-fuchsia-50'
                            }`}
                          >
                            ♀ {t('clientForm.genderFemale', 'Donna')}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('clientForm.birthday')}</FormLabel>
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
                          <FormLabel>{t('clientForm.frequentClient')}</FormLabel>
                          <FormDescription>
                            {t('clientForm.frequentClientDesc')}
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
                      <FormLabel>{t('clientForm.notes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('clientForm.notesPlaceholder')}
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
              
              <TabsContent value="medical" className="space-y-4 py-4 mt-0">
                {/* Medical information fields */}
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('clientForm.allergies')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('clientForm.allergiesPlaceholder')}
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
                      <FormLabel>{t('clientForm.medicalNotes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('clientForm.medicalNotesPlaceholder')}
                          className="resize-none"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('clientForm.medicalNotesDesc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="consent" className="py-4 mt-0">
                {/* Consent form */}
                {clientId ? (
                  <ConsentForm clientId={clientId.toString()} />
                ) : (
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm">{t('clientForm.consentAfterCreate')}</p>
                  </div>
                )}
              </TabsContent>
              </div>
              
              <DialogFooter className="flex-shrink-0 bg-background border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={mutation.isPending}
                >
                  {t('clientForm.cancel')}
                </Button>
                {activeTab !== "consent" && (
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending || isCheckingDuplicates}
                  >
                    {(mutation.isPending || isCheckingDuplicates) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCheckingDuplicates ? t('clientForm.checkingDuplicates') : clientId ? t('clientForm.updateData') : t('clientForm.save')}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      )}
      
      <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('clientForm.duplicateTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">{t('clientForm.duplicateExisting')}</p>
                <div className="space-y-2 mb-3">
                  {duplicateClients.map((dc, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-foreground">
                      <span className="font-medium">{dc.firstName} {dc.lastName}</span>
                      {dc.phone && <span className="ml-2 text-muted-foreground">| {dc.phone}</span>}
                      {dc.email && <span className="ml-2 text-muted-foreground">| {dc.email}</span>}
                    </div>
                  ))}
                </div>
                <p>{t('clientForm.duplicateConfirm')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDuplicateAlert(false);
              setPendingData(null);
            }}>
              {t('clientForm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowDuplicateAlert(false);
              if (pendingData) {
                submitClientData(pendingData);
                setPendingData(null);
              }
            }}>
              {t('clientForm.createAnyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}
