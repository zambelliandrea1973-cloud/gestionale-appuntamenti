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

// Definizione dello schema per il form (i messaggi vengono tradotti via t() nei FormMessage)
const emailSettingsSchema = z.object({
  emailEnabled: z.boolean().default(false),
  emailAddress: z.string().email("emailSettings.invalidEmail").optional().or(z.literal("")),
  emailPassword: z.string().min(1, "emailSettings.passwordRequired").optional().or(z.literal("")),
  emailTemplate: z.string().optional(),
  emailSubject: z.string().optional(),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

export default function EmailAndCalendarSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const DEFAULT_EMAIL_TEMPLATE = t('settings.defaultEmailTemplate');
  const DEFAULT_EMAIL_SUBJECT = t('settings.defaultEmailSubject');

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
          title: t('emailSettings.toastSaved'),
          description: t('emailSettings.toastSavedDesc'),
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || t('emailSettings.toastSaveError'));
      }
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('emailSettings.toastSaveError'),
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
        title: t('common.error'),
        description: t('emailSettings.toastTestEmailMissing'),
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
          title: t('emailSettings.toastTestSent'),
          description: t('emailSettings.toastTestSentDesc'),
        });
      } else {
        throw new Error(data.error || t('emailSettings.toastTestSendError'));
      }
    } catch (error) {
      console.error('Errore nell\'invio dell\'email di test:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('emailSettings.toastTestSendError'),
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
          <h3 className="text-lg font-medium">{t('settings.emailSettings')}</h3>
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
                      {t('settings.enableEmail')}
                    </FormLabel>
                    <FormDescription>
                      {t('settings.emailDesc')}
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
                        {t('settings.emailAddress')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('settings.emailExamplePlaceholder')} />
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.emailAddress?.message
                          ? t(form.formState.errors.emailAddress.message as string)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emailPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('settings.emailPassword')}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          placeholder="••••••••••" 
                        />
                      </FormControl>
                      <div className="space-y-2 mt-2">
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            {t('emailSettings.gmailWarning')}
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                            {t('emailSettings.gmailSteps')}
                          </p>
                          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                            <li>
                              <strong>{t('emailSettings.step1')}</strong>
                              <br />
                              <a 
                                href="https://myaccount.google.com/signinoptions/two-step-verification" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 ml-6"
                              >
                                {t('emailSettings.step1Link')}
                              </a>
                            </li>
                            <li>
                              <strong>{t('emailSettings.step2')}</strong>
                              <br />
                              <a 
                                href="https://myaccount.google.com/apppasswords" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 ml-6 break-all"
                              >
                                👉 https://myaccount.google.com/apppasswords
                              </a>
                            </li>
                            <li>
                              {t('emailSettings.step3')}
                            </li>
                          </ol>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 italic">
                            {t('emailSettings.warning2fa')}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('emailSettings.otherProviders')}
                        </p>
                      </div>
                      <FormMessage>
                        {form.formState.errors.emailPassword?.message
                          ? t(form.formState.errors.emailPassword.message as string)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center mb-4">
                    <MessagesSquare className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h4 className="text-base font-medium">{t('emailSettings.template')}</h4>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetEmailTemplate}
                      className="ml-auto text-xs"
                    >
                      {t('emailSettings.restoreDefault')}
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="emailSubject"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>
                          {t('emailSettings.subject')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('emailSettings.subjectPlaceholder')} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {t('emailSettings.subjectVars', { vars: '{{nome}}, {{cognome}}, {{data}}, {{ora}}, {{servizio}}' })}
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
                          {t('emailSettings.bodyLabel')}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={t('emailSettings.bodyPlaceholder')} 
                            className="min-h-[200px]"
                          />
                        </FormControl>
                        <FormDescription className="text-xs mt-2">
                          {t('emailSettings.bodyVarsHint', { vars: '{{nome}}, {{cognome}}, {{data}}, {{ora}}, {{servizio}}' })}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4 pt-4 border-t">
                    <FormLabel className="mb-2 block">{t('emailSettings.testSend')}</FormLabel>
                    <div className="flex gap-2">
                      <Input 
                        placeholder={t('emailSettings.testPlaceholder')} 
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
                        {t('emailSettings.sendTest')}
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
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}