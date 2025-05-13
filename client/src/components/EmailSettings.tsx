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
import { Mail, RefreshCw, MessagesSquare } from "lucide-react";
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
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

// Template predefinito per l'email, simile a quello WhatsApp
const DEFAULT_EMAIL_TEMPLATE = "Gentile {{nome}} {{cognome}},\n\nQuesto è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.\n\nPer qualsiasi modifica o cancellazione, La preghiamo di contattarci.\n\nCordiali saluti,\nStudio Professionale";

// Oggetto predefinito per l'email
const DEFAULT_EMAIL_SUBJECT = "Promemoria appuntamento del {{data}}";

export default function EmailSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailCalendarSettings, setEmailCalendarSettings] = useState({
    emailEnabled: false,
    emailAddress: '',
    emailPassword: '',
    emailTemplate: '',
    emailSubject: '',
  });
  
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailEnabled: false,
      emailAddress: "",
      emailPassword: "",
      emailTemplate: DEFAULT_EMAIL_TEMPLATE,
      emailSubject: DEFAULT_EMAIL_SUBJECT,
    },
  });
  
  // Al caricamento del componente, carica le impostazioni esistenti
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/email-calendar-settings');
        if (response.ok) {
          const data = await response.json();
          
          // Imposta i valori del form
          form.reset({
            emailEnabled: data.emailEnabled || false,
            emailAddress: data.emailAddress || "",
            emailPassword: data.emailPassword ? "••••••••••" : "", // Non mostrare la password reale
            emailTemplate: data.emailTemplate || DEFAULT_EMAIL_TEMPLATE,
            emailSubject: data.emailSubject || DEFAULT_EMAIL_SUBJECT,
          });
        }
      } catch (error) {
        console.error('Errore nel caricamento delle impostazioni email:', error);
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
          description: "Le impostazioni di email sono state aggiornate con successo",
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
    // Verifica che l'email di test sia stata inserita
    if (!testEmailAddress) {
      toast({
        title: "Errore",
        description: "Inserisci un indirizzo email per il test",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica che le impostazioni email siano state configurate
    if (!form.getValues("emailEnabled")) {
      toast({
        title: "Configurazione incompleta",
        description: "Devi prima attivare l'invio email usando l'interruttore in alto",
        variant: "destructive",
      });
      return;
    }
    
    if (!form.getValues("emailAddress") || !form.getValues("emailPassword")) {
      toast({
        title: "Configurazione incompleta",
        description: "Devi inserire sia l'indirizzo email che la password/chiave app",
        variant: "destructive",
      });
      return;
    }

    // Se le condizioni sono soddisfatte, procedi con il test
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
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-base">
                        {t('settings.enableEmail', 'Abilita invio email')}
                      </FormLabel>
                      {form.formState.isDirty && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          Modifiche non salvate! Clicca "Salva impostazioni" dopo aver modificato.
                        </span>
                      )}
                    </div>
                    <FormDescription>
                      {t('settings.emailDesc', 'Abilita l\'invio di email di notifica ai clienti')}
                    </FormDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <span className={`text-xs font-medium ${emailCalendarSettings.emailEnabled ? 'text-green-600' : 'text-red-600'}`}>
                      {emailCalendarSettings.emailEnabled ? 'Attualmente abilitato' : 'Attualmente disabilitato'}
                    </span>
                  </div>
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
                        <Input {...field} placeholder="esempio@gmail.com" />
                      </FormControl>
                      <FormDescription className="text-xs mt-1">
                        <p>Se utilizzi Gmail, dovrai anche configurare un server SMTP separatamente.</p>
                        <p className="mt-1">Server SMTP per Gmail: <span className="font-mono bg-muted p-0.5 rounded">smtp.gmail.com</span>, porta: <span className="font-mono bg-muted p-0.5 rounded">587</span></p>
                      </FormDescription>
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
                      <FormDescription className="text-xs mt-1">
                        <p>{t('settings.passwordNote', 'Per servizi Google, non usare la tua password normale dell\'account')}</p>
                        <p className="mt-1 font-medium">Devi generare una "Password per le app" da <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/security</a> (richiede verifica in due passaggi attiva)</p>
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
                        disabled={isSendingTest || !form.getValues("emailEnabled")}
                        className="flex items-center"
                      >
                        {isSendingTest ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Invia test
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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