import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { Mail, Calendar, RefreshCw, ArrowRight, HelpCircle, ExternalLink, MessagesSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";

// Definizione dello schema per il form
const emailSettingsSchema = z.object({
  emailEnabled: z.boolean().default(false),
  emailAddress: z.string().email("Inserisci un indirizzo email valido").optional().or(z.literal("")),
  emailPassword: z.string().min(1, "La password è obbligatoria se l'email è abilitata").optional().or(z.literal("")),
  emailTemplate: z.string().optional(),
  emailSubject: z.string().optional(),
  calendarEnabled: z.boolean().default(false),
  calendarId: z.string().optional().or(z.literal("")),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

// Template predefinito per l'email, simile a quello WhatsApp
const DEFAULT_EMAIL_TEMPLATE = "Gentile {{nome}} {{cognome}},\n\nQuesto è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.\n\nPer qualsiasi modifica o cancellazione, La preghiamo di contattarci.\n\nCordiali saluti,\nStudio Professionale";

// Oggetto predefinito per l'email
const DEFAULT_EMAIL_SUBJECT = "Promemoria appuntamento del {{data}}";

export default function EmailAndCalendarSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailEnabled: false,
      emailAddress: "",
      emailPassword: "",
      emailTemplate: DEFAULT_EMAIL_TEMPLATE,
      emailSubject: DEFAULT_EMAIL_SUBJECT,
      calendarEnabled: false,
      calendarId: "",
    },
  });
  
  // Al caricamento del componente, carica le impostazioni esistenti
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/email-calendar-settings');
        if (response.ok) {
          const data = await response.json();
          
          // Verifica lo stato dell'autorizzazione Google
          setIsGoogleAuthorized(!!data.googleAuthStatus?.authorized);
          
          // Imposta i valori del form
          form.reset({
            emailEnabled: data.emailEnabled || false,
            emailAddress: data.emailAddress || "",
            emailPassword: data.emailPassword ? "••••••••••" : "", // Non mostrare la password reale
            emailTemplate: data.emailTemplate || DEFAULT_EMAIL_TEMPLATE,
            emailSubject: data.emailSubject || DEFAULT_EMAIL_SUBJECT,
            calendarEnabled: data.calendarEnabled || false,
            calendarId: data.calendarId || "",
          });
        }
      } catch (error) {
        console.error('Errore nel caricamento delle impostazioni email/calendario:', error);
      }
    };
    
    fetchSettings();
  }, [form]);
  
  // Gestione del salvataggio
  const onSubmit = async (values: EmailSettingsFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Se la password è mascherata (••••••••••), non la inviamo per non sovrascrivere
      const dataToSend = {
        ...values,
        emailPassword: values.emailPassword === "••••••••••" ? undefined : values.emailPassword,
      };
      
      const response = await fetch('/api/email-calendar-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (response.ok) {
        toast({
          title: "Impostazioni salvate",
          description: "Le impostazioni di email e calendario sono state aggiornate con successo",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Si è verificato un errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Funzione per inviare un'email di test
  const sendTestEmail = async () => {
    if (!testEmailAddress) {
      toast({
        title: "Errore",
        description: "Inserisci un indirizzo email per il test",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingTest(true);
    try {
      const response = await fetch('/api/email-calendar-settings/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmailAddress }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Email inviata",
          description: "L'email di test è stata inviata con successo",
        });
      } else {
        throw new Error(data.error || 'Si è verificato un errore durante l\'invio dell\'email');
      }
    } catch (error) {
      console.error('Errore nell\'invio dell\'email di test:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };
  
  // Funzione per avviare l'autorizzazione Google
  const startGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Aggiungiamo un event listener per il messaggio di successo
          const messageListener = (event: MessageEvent) => {
            if (event.data === 'google-auth-success') {
              window.removeEventListener('message', messageListener);
              
              // Verifichiamo lo stato dell'autorizzazione
              (async () => {
                try {
                  const statusResponse = await fetch('/api/google-auth/status');
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    if (statusData.authorized) {
                      setIsGoogleAuthorized(true);
                      toast({
                        title: "Autorizzazione completata",
                        description: "L'account Google è stato autorizzato con successo",
                      });
                    }
                  }
                } catch (error) {
                  console.error('Errore durante la verifica dell\'autorizzazione:', error);
                }
              })();
            }
          };
          
          window.addEventListener('message', messageListener);
          
          // Apre l'URL di autorizzazione in una nuova finestra
          const authWindow = window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          // Verifica periodicamente se l'autorizzazione è completata (come fallback)
          const checkInterval = setInterval(async () => {
            try {
              // Se la finestra è stata chiusa, controlliamo lo stato
              if (authWindow && authWindow.closed) {
                const statusResponse = await fetch('/api/google-auth/status');
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  if (statusData.authorized) {
                    clearInterval(checkInterval);
                    setIsGoogleAuthorized(true);
                    toast({
                      title: "Autorizzazione completata",
                      description: "L'account Google è stato autorizzato con successo",
                    });
                  }
                }
              }
            } catch (error) {
              console.error('Errore durante il controllo dell\'autorizzazione:', error);
            }
          }, 3000); // Controlla ogni 3 secondi
          
          // Ferma il controllo dopo 2 minuti (per evitare loop infiniti)
          setTimeout(() => {
            clearInterval(checkInterval);
            window.removeEventListener('message', messageListener);
          }, 120000);
        }
      } else {
        throw new Error('Non è stato possibile avviare l\'autorizzazione Google');
      }
    } catch (error) {
      console.error('Errore nell\'autorizzazione Google:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'autorizzazione Google",
        variant: "destructive",
      });
    }
  };
  
  // Reset del template dell'email al valore predefinito
  const resetEmailTemplate = () => {
    form.setValue('emailTemplate', DEFAULT_EMAIL_TEMPLATE);
    form.setValue('emailSubject', DEFAULT_EMAIL_SUBJECT);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center mb-4">
          <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
          <h3 className="text-lg font-medium">{t('settings.emailSettings', 'Configurazione Email')}</h3>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="emailEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t('settings.enableEmail', 'Abilita invio email')}
                    </FormLabel>
                    <FormDescription>
                      {t('settings.emailDesc', 'Abilita l\'invio di email di notifica ai clienti')}
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
              <div className="space-y-4 bg-muted/30 rounded-lg p-4 border">
                <FormField
                  control={form.control}
                  name="emailAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('settings.emailAddress', 'Indirizzo Email')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="esempio@tuodominio.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emailPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('settings.emailPassword', 'Password o Chiave App')}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          placeholder="••••••••••" 
                        />
                      </FormControl>
                      <FormDescription>
                        {t('settings.passwordNote', 'Per servizi Google, usa una password specifica per app')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center mb-4">
                    <MessagesSquare className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h4 className="text-base font-medium">Template Email</h4>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetEmailTemplate}
                      className="ml-auto text-xs"
                    >
                      Ripristina predefinito
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="emailSubject"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>
                          Oggetto Email
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Promemoria appuntamento" 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Puoi usare: {"{{nome}}, {{cognome}}, {{data}}, {{ora}}, {{servizio}}"}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="emailTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Testo Email
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Testo del messaggio" 
                            className="min-h-[200px]"
                          />
                        </FormControl>
                        <FormDescription className="text-xs mt-2">
                          Inserisci il testo del messaggio. Puoi usare le seguenti variabili:
                          {"{{nome}}, {{cognome}}, {{data}}, {{ora}}, {{servizio}}"}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4 pt-4 border-t">
                    <FormLabel className="mb-2 block">Test invio email</FormLabel>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Inserisci email per test" 
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="max-w-sm"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={sendTestEmail}
                        disabled={isSendingTest || !form.watch("emailEnabled")}
                      >
                        {isSendingTest ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Invio in corso...
                          </>
                        ) : "Invia test"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Invia un'email di test per verificare la configurazione
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                <h3 className="text-lg font-medium">{t('settings.googleCalendar', 'Google Calendar')}</h3>
                <Link to="/google-setup" className="ml-auto flex items-center text-sm text-primary hover:underline">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  {t('settings.googleSetupGuide', 'Guida alla configurazione')}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </div>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="calendarEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t('settings.enableCalendar', 'Sincronizza con Google Calendar')}
                        </FormLabel>
                        <FormDescription>
                          {t('settings.calendarDesc', 'Gli appuntamenti verranno sincronizzati con il tuo calendario Google')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isGoogleAuthorized}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {!isGoogleAuthorized && (
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <p className="text-sm mb-3">{t('settings.googleAuthRequired', 'Per sincronizzare il calendario è necessario autorizzare l\'accesso a Google Calendar')}</p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={startGoogleAuth}
                      className="flex items-center"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('settings.authorizeGoogle', 'Autorizza Google Calendar')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
                
                {isGoogleAuthorized && form.watch("calendarEnabled") && (
                  <FormField
                    control={form.control}
                    name="calendarId"
                    render={({ field }) => (
                      <FormItem className="bg-muted/30 rounded-lg p-4 border">
                        <FormLabel>
                          {t('settings.calendarId', 'ID Calendario (opzionale)')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="primary o ID calendario specifico" />
                        </FormControl>
                        <FormDescription>
                          {t('settings.calendarIdDesc', 'Lascia vuoto per usare il calendario principale')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center"
              >
                {isSubmitting && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('common.save', 'Salva impostazioni')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}