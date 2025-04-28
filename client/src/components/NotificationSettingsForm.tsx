import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { NotificationSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface NotificationSettingsFormProps {
  onSettingsSaved?: () => void;
}

export function NotificationSettingsForm({ onSettingsSaved }: NotificationSettingsFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  const form = useForm({
    defaultValues: {
      id: 0,
      emailEnabled: false,
      smtpServer: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      senderEmail: "",
      emailSignature: "",
      smsEnabled: false,
      smsGatewayMethod: "direct",
      whatsappEnabled: false,
      whatsappMethod: "direct",
      useContactPhoneForNotifications: true,
      notificationPhone: "",
      twilioEnabled: false,
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
      notificationCenterEnabled: true,
      defaultReminderTime: 24,
    },
  });

  // Carica le impostazioni di notifica dal server
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/notification-settings");
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Aggiorna il form con i dati ricevuti
            setSettings(result.data);
            form.reset({
              id: result.data.id,
              emailEnabled: result.data.emailEnabled ?? false,
              smtpServer: result.data.smtpServer ?? "",
              smtpPort: result.data.smtpPort ?? 587,
              smtpUsername: result.data.smtpUsername ?? "",
              smtpPassword: result.data.smtpPassword ?? "",
              senderEmail: result.data.senderEmail ?? "",
              emailSignature: result.data.emailSignature ?? "",
              smsEnabled: result.data.smsEnabled ?? false,
              smsGatewayMethod: result.data.smsGatewayMethod ?? "direct",
              whatsappEnabled: result.data.whatsappEnabled ?? false,
              whatsappMethod: result.data.whatsappMethod ?? "direct",
              useContactPhoneForNotifications: result.data.useContactPhoneForNotifications ?? true,
              notificationPhone: result.data.notificationPhone ?? "",
              twilioEnabled: result.data.twilioEnabled ?? false,
              twilioAccountSid: result.data.twilioAccountSid ?? "",
              twilioAuthToken: result.data.twilioAuthToken ?? "",
              twilioPhoneNumber: result.data.twilioPhoneNumber ?? "",
              notificationCenterEnabled: result.data.notificationCenterEnabled ?? true,
              defaultReminderTime: result.data.defaultReminderTime ?? 24,
            });
          }
        } else {
          toast({
            title: "Errore",
            description: "Impossibile caricare le impostazioni di notifica",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Errore durante il caricamento delle impostazioni:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un problema durante il caricamento delle impostazioni",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast, form]);

  // Gestisce l'invio del form
  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/notification-settings", data);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Successo",
            description: "Impostazioni di notifica salvate con successo",
          });
          
          // Aggiorna i dati locali
          setSettings(result.data);
          
          // Callback per informare il componente padre
          if (onSettingsSaved) {
            onSettingsSaved();
          }
        } else {
          toast({
            title: "Errore",
            description: result.message || "Impossibile salvare le impostazioni",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il salvataggio",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore durante il salvataggio delle impostazioni:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Invia un'email di test
  const sendTestEmail = async () => {
    if (!testEmailAddress) {
      toast({
        title: "Errore",
        description: "Inserisci un indirizzo email per il test",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingTest(true);
      const response = await apiRequest("POST", "/api/notification-settings/test-email", {
        email: testEmailAddress,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Successo",
            description: "Email di test inviata con successo",
          });
        } else {
          toast({
            title: "Errore",
            description: result.message || "Impossibile inviare l'email di test",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante l'invio dell'email di test",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore durante l'invio dell'email di test:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante l'invio dell'email di test",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Esegue manualmente l'invio dei promemoria
  const processReminders = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/process-reminders");
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Successo",
            description: result.message || "Promemoria elaborati con successo",
          });
        } else {
          toast({
            title: "Errore",
            description: result.message || "Impossibile elaborare i promemoria",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante l'elaborazione dei promemoria",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore durante l'elaborazione dei promemoria:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante l'elaborazione dei promemoria",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Impostazioni di notifica</CardTitle>
        <CardDescription>
          Configura come vuoi inviare notifiche e promemoria ai tuoi clienti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="direct">Notifiche telefoniche</TabsTrigger>
                <TabsTrigger value="general">Impostazioni generali</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Abilita notifiche email</FormLabel>
                        <FormDescription>
                          Invia promemoria per appuntamenti tramite email ai clienti.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("emailEnabled") && (
                  <>
                    <div className="grid gap-4 py-4">
                      <div className="p-4 bg-accent/20 rounded-lg border-2 border-primary/20 mb-6">
                        <h4 className="text-base font-medium mb-3">Configurazione Rapida Email</h4>
                        
                        <div className="space-y-4">
                          {/* Campo Email */}
                          <div>
                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                            <Input 
                              placeholder="Inserisci il tuo indirizzo email" 
                              value={form.watch("senderEmail") || ""}
                              onChange={(e) => {
                                const email = e.target.value;
                                // Aggiorna il campo senderEmail
                                form.setValue("senderEmail", email);
                                // Aggiorna anche smtpUsername automaticamente
                                form.setValue("smtpUsername", email);
                                
                                // Se è un nuovo inserimento, genera anche una firma email predefinita
                                if (!form.watch("emailSignature") || form.watch("emailSignature") === "Con i migliori saluti," || form.watch("emailSignature") === "") {
                                  form.setValue("emailSignature", "Con i migliori saluti,");
                                }
                              }}
                            />
                          </div>
                          
                          {/* Campo Password */}
                          <div>
                            <FormLabel className="text-sm font-medium">Password</FormLabel>
                            <Input 
                              type="password" 
                              placeholder="Inserisci la tua password email" 
                              value={form.watch("smtpPassword") || ""}
                              onChange={(e) => form.setValue("smtpPassword", e.target.value)}
                            />
                            <FormDescription className="text-xs mt-1">
                              {form.watch("senderEmail")?.toLowerCase().includes("@gmail.com") ? (
                                <>
                                  Per Gmail è necessaria una "password per app". 
                                  <a 
                                    href="https://myaccount.google.com/apppasswords" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium ml-1"
                                  >
                                    Clicca qui per crearla
                                  </a>
                                </>
                              ) : (
                                "Per Gmail potrebbe essere necessaria una \"password per app\" generata nelle impostazioni di sicurezza Google."
                              )}
                            </FormDescription>
                          </div>
                          
                          {/* Pulsante Rileva impostazioni */}
                          <Button 
                            type="button" 
                            variant="default" 
                            className="w-full mt-2"
                            onClick={async () => {
                              const email = form.watch("senderEmail");
                              if (!email) {
                                toast({
                                  title: "Email richiesta",
                                  description: "Inserisci il tuo indirizzo email per rilevare le impostazioni",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              try {
                                setIsLoading(true);
                                const response = await apiRequest("POST", "/api/notification-settings/detect-smtp", {
                                  email
                                });
                                
                                if (response.ok) {
                                  const result = await response.json();
                                  
                                  if (result.success && result.data) {
                                    const config = result.data;
                                    
                                    // Aggiorna i campi del form con i dati rilevati
                                    form.setValue("smtpServer", config.smtpServer);
                                    form.setValue("smtpPort", config.smtpPort);
                                    form.setValue("smtpUsername", config.smtpUsername);
                                    form.setValue("senderEmail", config.senderEmail);
                                    
                                    // Genera firma se non impostata
                                    if (!form.watch("emailSignature")) {
                                      form.setValue("emailSignature", "Con i migliori saluti,");
                                    }
                                    
                                    toast({
                                      title: "✅ Impostazioni rilevate",
                                      description: config.instructions || "Inserisci la tua password per completare la configurazione"
                                    });
                                  }
                                } else {
                                  const error = await response.json();
                                  toast({
                                    title: "Errore",
                                    description: error.message || "Impossibile rilevare le impostazioni SMTP",
                                    variant: "destructive"
                                  });
                                }
                              } catch (error) {
                                console.error("Errore durante il rilevamento SMTP:", error);
                                toast({
                                  title: "Errore",
                                  description: "Si è verificato un problema durante il rilevamento delle impostazioni",
                                  variant: "destructive"
                                });
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            disabled={isLoading || !form.watch("senderEmail")}
                          >
                            {isLoading ? "Rilevamento in corso..." : "Rileva impostazioni SMTP"}
                          </Button>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-4 border-t pt-3">
                          <strong>1.</strong> Inserisci il tuo indirizzo email<br />
                          <strong>2.</strong> Clicca "Rileva impostazioni" per configurare automaticamente i server<br />
                          <strong>3.</strong> Inserisci la tua password e salva
                        </p>
                      </div>

                      <h4 className="text-sm font-medium mb-2">Impostazioni tecniche (compilate automaticamente)</h4>

                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div>
                          <FormField
                            control={form.control}
                            name="smtpServer"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Server SMTP</FormLabel>
                                <FormControl>
                                  <Input placeholder="Verrà rilevato automaticamente" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Es: smtp.gmail.com, smtp.outlook.com
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <FormField
                            control={form.control}
                            name="smtpPort"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Porta SMTP</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="Verrà rilevata automaticamente" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 587)} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Di solito 587 o 465
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div>
                          <FormField
                            control={form.control}
                            name="smtpUsername"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username SMTP</FormLabel>
                                <FormControl>
                                  <Input placeholder="Verrà compilato automaticamente" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Spesso è il tuo indirizzo email completo
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <FormField
                            control={form.control}
                            name="emailSignature"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Firma email</FormLabel>
                                <FormControl>
                                  <Input placeholder="Con i migliori saluti," {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>


                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-sm font-medium mb-2">Testa le impostazioni email</h3>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Inserisci email per test" 
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={sendTestEmail}
                          disabled={isSendingTest || !form.watch("emailEnabled")}
                        >
                          {isSendingTest ? "Invio..." : "Invia test"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="direct" className="space-y-4">
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <h3 className="text-base font-medium mb-2">Notifiche WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Le notifiche via WhatsApp ti permettono di inviare promemoria e comunicazioni 
                    ai tuoi clienti direttamente attraverso WhatsApp Web, senza 
                    costi aggiuntivi.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="notificationCenterEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Abilita centro notifiche</FormLabel>
                        <FormDescription>
                          Mostra i promemoria e le notifiche nell'app.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Abilita notifiche WhatsApp</FormLabel>
                        <FormDescription>
                          Genera link diretti a WhatsApp per inviare promemoria.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Abilita notifiche SMS</FormLabel>
                        <FormDescription>
                          Genera promemoria per SMS da inviare manualmente.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {(form.watch("whatsappEnabled") || form.watch("smsEnabled")) && (
                  <div className="space-y-4 bg-accent/20 p-4 rounded-lg border border-primary/20">
                    <h4 className="text-base font-medium">Numero di telefono per notifiche</h4>
                    
                    <FormField
                      control={form.control}
                      name="useContactPhoneForNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Inserisci numero WhatsApp</FormLabel>
                            <FormDescription>
                              Configura il tuo numero WhatsApp per inviare comunicazioni ai clienti.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("useContactPhoneForNotifications") && (
                      <FormField
                        control={form.control}
                        name="notificationPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numero WhatsApp per notifiche</FormLabel>
                            <FormDescription>
                              Inserisci il numero di telefono WhatsApp da utilizzare per inviare notifiche ai clienti. Assicurati di includere il prefisso internazionale (es. +39).
                            </FormDescription>
                            <FormControl>
                              <Input 
                                placeholder="+39 XXX XXX XXXX" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="general" className="space-y-4">
                <div className="grid gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="defaultReminderTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orario predefinito per i promemoria</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="24" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 24)} 
                          />
                        </FormControl>
                        <FormDescription>
                          Quante ore prima dell'appuntamento inviare i promemoria (predefinito: 24 ore)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Gestione promemoria</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={processReminders}
                      disabled={isLoading}
                    >
                      {isLoading ? "Elaborazione..." : "Elabora promemoria ora"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    I promemoria vengono elaborati automaticamente ogni ora, ma puoi forzare l'elaborazione manualmente.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvataggio..." : "Salva impostazioni"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}