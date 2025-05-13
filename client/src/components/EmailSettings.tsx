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
import { Mail, RefreshCw, MessagesSquare, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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

// Interfaccia per le impostazioni email
interface EmailCalendarSettings {
  emailEnabled: boolean;
  emailAddress: string;
  emailPassword: string;
  emailTemplate: string;
  emailSubject: string;
  hasPasswordSaved?: boolean; // Flag che indica se una password è stata salvata sul server
  [key: string]: any; // Per consentire proprietà aggiuntive
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);
  const [lastValidTemplate, setLastValidTemplate] = useState('');
  const [lastValidSubject, setLastValidSubject] = useState('');
  const [hasPasswordSaved, setHasPasswordSaved] = useState(false);
  // Utilizziamo l'interfaccia definita per le impostazioni email
  const [emailCalendarSettings, setEmailCalendarSettings] = useState<EmailCalendarSettings>({
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
  // Funzione per verificare se il testo contiene modifiche ai campi tra parentesi graffe
  const checkTemplateChanges = (newValue: string, oldValue: string) => {
    // Estrae tutti i campi tra parentesi graffe (incluse le parentesi) dal template precedente
    const templateVarRegex = /{{([^}]+)}}/g;
    let oldMatches: string[] = [];
    let match;
    
    // Usiamo un approccio più compatibile per iterare sui match
    while ((match = templateVarRegex.exec(oldValue)) !== null) {
      oldMatches.push(match[0]);
    }
    
    // Verifica se tutti i campi precompilati esistono ancora nel nuovo valore
    for (const match of oldMatches) {
      if (!newValue.includes(match)) {
        return true; // È stata rilevata una modifica o eliminazione di un campo precompilato
      }
    }
    
    // Verifica anche se sono state modificate le parentesi graffe
    // Contiamo le parentesi graffe aperte e chiuse nei due testi
    const oldOpenBrackets = (oldValue.match(/{/g) || []).length;
    const oldCloseBrackets = (oldValue.match(/}/g) || []).length;
    const newOpenBrackets = (newValue.match(/{/g) || []).length;
    const newCloseBrackets = (newValue.match(/}/g) || []).length;
    
    // Se il numero di parentesi è cambiato, potrebbe essere stata modificata una parte dei campi precompilati
    if (oldOpenBrackets !== newOpenBrackets || oldCloseBrackets !== newCloseBrackets) {
      return true;
    }
    
    return false; // Nessuna modifica rilevata ai campi precompilati
  };
  
  // Gestione del cambiamento del template
  const handleTemplateChange = (value: string, fieldName: 'emailTemplate' | 'emailSubject') => {
    const oldValue = fieldName === 'emailTemplate' 
      ? lastValidTemplate || DEFAULT_EMAIL_TEMPLATE 
      : lastValidSubject || DEFAULT_EMAIL_SUBJECT;
    
    // Se è la prima volta che memorizziamo un valore valido
    if (!lastValidTemplate && fieldName === 'emailTemplate') {
      setLastValidTemplate(value);
    } else if (!lastValidSubject && fieldName === 'emailSubject') {
      setLastValidSubject(value);
    }
    
    // Verifica se il nuovo valore contiene modifiche ai campi precompilati
    if (checkTemplateChanges(value, oldValue)) {
      setShowTemplateWarning(true);
      // Non aggiorniamo direttamente il valore nel form, aspettiamo conferma
      return false;
    }
    
    // Aggiorna il valore valido memorizzato
    if (fieldName === 'emailTemplate') {
      setLastValidTemplate(value);
    } else {
      setLastValidSubject(value);
    }
    
    return true;
  };
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/email-calendar-settings');
        if (response.ok) {
          const data = await response.json();
          
          // Aggiorna lo stato delle impostazioni salvate con dati sicuri
          const safeData: EmailCalendarSettings = {
            // Prima i default per evitare sovrascritture
            emailEnabled: false,
            emailAddress: '',
            emailPassword: '',
            emailTemplate: DEFAULT_EMAIL_TEMPLATE,
            emailSubject: DEFAULT_EMAIL_SUBJECT,
            // Poi i dati effettivi dalla risposta
            ...data
          };
          
          // Imposta lo stato che indica se una password è salvata sul server
          setHasPasswordSaved(!!data.hasPasswordSaved);
          setEmailCalendarSettings(safeData);
          
          const template = data.emailTemplate || DEFAULT_EMAIL_TEMPLATE;
          const subject = data.emailSubject || DEFAULT_EMAIL_SUBJECT;
          
          // Memorizza i valori iniziali come validi
          setLastValidTemplate(template);
          setLastValidSubject(subject);
          
          // Imposta i valori del form
          form.reset({
            emailEnabled: data.emailEnabled || false,
            emailAddress: data.emailAddress || "",
            emailPassword: data.emailPassword ? "••••••••••" : "", // Non mostrare la password reale
            emailTemplate: template,
            emailSubject: subject,
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
      // Verifichiamo quali dati inviare
      const dataToSend: any = { ...values };
      
      // Non inviare la password se è vuota o mascherata
      if (!values.emailPassword || values.emailPassword === "••••••••••") {
        // Rimuovi il campo completamente per non sovrascriverlo nel server
        delete dataToSend.emailPassword;
      }
      
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
        
        // Aggiornare lo stato delle impostazioni con la nuova configurazione
        setEmailCalendarSettings((prev: EmailCalendarSettings): EmailCalendarSettings => {
          // Creiamo una nuova configurazione con i valori aggiornati
          // Evitiamo di usare spread operator per evitare sovrapposizioni
          const updatedSettings: EmailCalendarSettings = {
            // Campi obbligatori
            emailEnabled: values.emailEnabled,
            emailAddress: values.emailAddress !== undefined ? values.emailAddress : prev.emailAddress,
            // Gestiamo la password in modo speciale
            emailPassword: values.emailPassword !== undefined && values.emailPassword !== "••••••••••" 
              ? values.emailPassword 
              : prev.emailPassword,
            emailTemplate: values.emailTemplate !== undefined ? values.emailTemplate : prev.emailTemplate,
            emailSubject: values.emailSubject !== undefined ? values.emailSubject : prev.emailSubject,
          };
          
          // Aggiungiamo altre proprietà personalizzate che potrebbero esistere
          for (const key in prev) {
            if (key !== 'emailEnabled' && 
                key !== 'emailAddress' && 
                key !== 'emailPassword' && 
                key !== 'emailTemplate' && 
                key !== 'emailSubject') {
              (updatedSettings as any)[key] = (prev as any)[key];
            }
          }
          
          // Se abbiamo inviato una nuova password, aggiorniamo il flag
          if (values.emailPassword && values.emailPassword !== "••••••••••") {
            setHasPasswordSaved(true);
            // Aggiorna il campo password a "••••••••••" nel form
            setTimeout(() => {
              form.setValue("emailPassword", "••••••••••");
            }, 100);
          }
          
          return updatedSettings;
        });
        
        // Ricarica le impostazioni per assicurarsi di avere i dati aggiornati dal server
        const refreshResponse = await fetch('/api/email-calendar-settings');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          // Assicuriamoci che i dati rispecchino la nostra interfaccia
          const safeData: EmailCalendarSettings = {
            // Prima i default
            emailEnabled: false,
            emailAddress: '',
            emailPassword: '',
            emailTemplate: DEFAULT_EMAIL_TEMPLATE,
            emailSubject: DEFAULT_EMAIL_SUBJECT,
            // Poi i dati effettivi
            ...refreshData
          };
          setEmailCalendarSettings(safeData);
        }
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
        
        // L'invio di email è riuscito, aggiorniamo lo stato delle impostazioni per essere sicuri
        const refreshResponse = await fetch('/api/email-calendar-settings');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          // Assicuriamoci che i dati rispecchino la nostra interfaccia
          const safeData: EmailCalendarSettings = {
            // Prima i default
            emailEnabled: false,
            emailAddress: '',
            emailPassword: '',
            emailTemplate: DEFAULT_EMAIL_TEMPLATE,
            emailSubject: DEFAULT_EMAIL_SUBJECT,
            // Poi i dati effettivi
            ...refreshData
          };
          setEmailCalendarSettings(safeData);
        }
      } else {
        // Mostriamo un messaggio di errore più dettagliato dal server
        const errorMessage = data.error || 'Si è verificato un errore durante l\'invio dell\'email';
        
        // Aggiungiamo informazioni di aiuto basate sull'errore
        let helpText = '';
        if (errorMessage.includes('EAUTH')) {
          helpText = '. Verifica che la "Password per le app" sia corretta e che Gmail non abbia bloccato l\'accesso.';
        } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNECTION')) {
          helpText = '. Verifica che il server SMTP sia raggiungibile (smtp.gmail.com) e che la porta 587 sia aperta.';
        } else if (errorMessage.includes('Invalid login')) {
          helpText = '. Nome utente o password non validi.';
        }
        
        throw new Error(errorMessage + helpText);
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
  
  // Variabili di stato per il dialog
  const [pendingValue, setPendingValue] = useState('');
  const [pendingField, setPendingField] = useState<'emailTemplate' | 'emailSubject' | null>(null);
  
  // Funzione che gestisce la conferma della modifica nonostante l'avviso
  const handleWarningConfirm = () => {
    if (pendingField && pendingValue) {
      // Aggiorna il campo con il valore in attesa
      form.setValue(pendingField, pendingValue);
      
      // Aggiorna l'ultimo valore valido
      if (pendingField === 'emailTemplate') {
        setLastValidTemplate(pendingValue);
      } else {
        setLastValidSubject(pendingValue);
      }
    }
    
    // Chiudi il dialog
    setShowTemplateWarning(false);
  };
  
  // Funzione che gestisce l'annullamento della modifica
  const handleWarningCancel = () => {
    // Ripristina il valore precedente nel form
    if (pendingField === 'emailTemplate') {
      form.setValue('emailTemplate', lastValidTemplate);
    } else if (pendingField === 'emailSubject') {
      form.setValue('emailSubject', lastValidSubject);
    }
    
    // Chiudi il dialog
    setShowTemplateWarning(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Dialog di avviso per la modifica dei campi precompilati */}
      <AlertDialog open={showTemplateWarning} onOpenChange={setShowTemplateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attenzione!</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">Hai modificato o eliminato dei campi precompilati tra parentesi graffe (es. {'{{nome}}'}, {'{{data}}'}).</p>
              <p className="mb-2">Questi campi sono essenziali per il funzionamento corretto dei promemoria automatici ai clienti.</p>
              <p className="font-medium">Se confermi questa modifica, potresti causare un malfunzionamento nell'invio dei promemoria.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWarningCancel}>Annulla modifica</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningConfirm}>Conferma modifica</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
                      <div className="flex gap-2 items-center">
                        <FormControl className="flex-1">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            {...field} 
                            placeholder="••••••••••" 
                          />
                        </FormControl>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-9 px-3"
                        >
                          {showPassword ? (
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              Nascondi
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <EyeOff className="h-4 w-4" />
                              Mostra
                            </span>
                          )}
                        </Button>
                      </div>
                      <FormDescription className="text-xs mt-1">
                        {hasPasswordSaved && form.getValues("emailPassword") === "••••••••••" && (
                          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4 text-green-500" /> Password salvata in modo sicuro sul server
                            </p>
                            <p className="text-green-700 text-xs mt-1">La password è già memorizzata e pronta per l'invio di email. Non è necessario reinserirla ad ogni riavvio.</p>
                          </div>
                        )}
                        <p>{t('settings.passwordNote', 'Per servizi Google, non usare la tua password normale dell\'account')}</p>
                        <p className="mt-1 font-medium">Devi generare una "Password per le app" da <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/security</a> (richiede verifica in due passaggi attiva)</p>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Pulsante Salva dopo credenziali */}
                <div className="pt-4 flex justify-center">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center px-8 w-60"
                  >
                    {isSubmitting && (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t('common.save', 'Salva impostazioni')}
                  </Button>
                </div>

                <div className="border-t pt-5 mt-6">
                  <div className="flex items-center mb-5">
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
                  
                  <div className="bg-muted/20 p-3 rounded mb-4 text-xs border border-muted">
                    <p className="font-medium">Promemoria automatici ai clienti:</p>
                    <p className="mt-1">Il sistema invierà automaticamente un'email di promemoria 24 ore prima dell'appuntamento, utilizzando questo template. Personalizza il messaggio inserendo variabili come <code>{'{{nome}}'}</code>, <code>{'{{cognome}}'}</code>, <code>{'{{data}}'}</code>, <code>{'{{ora}}'}</code>, <code>{'{{servizio}}'}</code> che verranno sostituite con i dati reali del cliente e dell'appuntamento.</p>
                  </div>
                  

                  
                  <FormField
                    control={form.control}
                    name="emailSubject"
                    render={({ field }) => (
                      <FormItem className="mb-5">
                        <FormLabel className="text-base font-medium">
                          Oggetto Email
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Promemoria appuntamento"
                            value={field.value}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              // Verifica se c'è stato un cambiamento ai campi precompilati
                              if (checkTemplateChanges(newValue, lastValidSubject)) {
                                // Se sì, mostra l'avviso e memorizza il valore in attesa
                                setPendingValue(newValue);
                                setPendingField('emailSubject');
                                setShowTemplateWarning(true);
                                // Non aggiorniamo il campo finché l'utente non conferma
                              } else {
                                // Altrimenti aggiorna direttamente il valore
                                field.onChange(newValue);
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="emailTemplate"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-base font-medium">
                          Testo Email
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Testo del messaggio" 
                            className="min-h-[200px]"
                            value={field.value}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              // Verifica se c'è stato un cambiamento ai campi precompilati
                              if (checkTemplateChanges(newValue, lastValidTemplate)) {
                                // Se sì, mostra l'avviso e memorizza il valore in attesa
                                setPendingValue(newValue);
                                setPendingField('emailTemplate');
                                setShowTemplateWarning(true);
                                // Non aggiorniamo il campo finché l'utente non conferma
                              } else {
                                // Altrimenti aggiorna direttamente il valore
                                field.onChange(newValue);
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-6 pt-5 border-t">
                    <FormLabel className="text-base font-medium mb-3 block">Test invio email</FormLabel>
                    <div className="bg-muted/20 p-3 rounded mb-3 text-xs border border-muted">
                      <p>Per eseguire un test, assicurati di aver prima <strong>salvato</strong> le credenziali email.</p>
                    </div>
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
          </form>
        </Form>
      </div>
    </div>
  );
}