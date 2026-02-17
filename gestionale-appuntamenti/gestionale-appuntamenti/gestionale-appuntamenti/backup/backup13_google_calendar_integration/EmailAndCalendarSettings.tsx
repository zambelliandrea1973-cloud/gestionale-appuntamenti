import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Mail, Calendar, RefreshCw, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Definizione dello schema per il form
const emailSettingsSchema = z.object({
  emailEnabled: z.boolean().default(false),
  emailAddress: z.string().email("Inserisci un indirizzo email valido").optional().or(z.literal("")),
  emailPassword: z.string().min(1, "La password è obbligatoria se l'email è abilitata").optional().or(z.literal("")),
  calendarEnabled: z.boolean().default(false),
  calendarId: z.string().optional().or(z.literal("")),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

export default function EmailAndCalendarSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailEnabled: false,
      emailAddress: "",
      emailPassword: "",
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
  
  // Funzione per avviare l'autorizzazione Google
  const startGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Apre l'URL di autorizzazione in una nuova finestra
          window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          // Verifica periodicamente se l'autorizzazione è completata
          const checkInterval = setInterval(async () => {
            try {
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
            } catch (error) {
              console.error('Errore durante il controllo dell\'autorizzazione:', error);
            }
          }, 3000); // Controlla ogni 3 secondi
          
          // Ferma il controllo dopo 2 minuti (per evitare loop infiniti)
          setTimeout(() => {
            clearInterval(checkInterval);
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
              </div>
            )}
            
            <div className="pt-4 border-t">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                <h3 className="text-lg font-medium">{t('settings.googleCalendar', 'Google Calendar')}</h3>
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