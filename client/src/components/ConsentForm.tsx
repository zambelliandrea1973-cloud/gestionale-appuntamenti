import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ConsentFormProps {
  clientId: string;
  embedded?: boolean;
}

const DEFAULT_CONSENT_TEXT = `Informativa sulla Privacy e Consenso al Trattamento dei Dati Personali

Ai sensi del Regolamento UE 2016/679 (GDPR), la informiamo che i Suoi dati personali saranno trattati per le seguenti finalità:

1. Gestione della pratica sanitaria e amministrativa
2. Adempimenti di legge e normativi
3. Comunicazioni relative ai servizi erogati

I Suoi dati saranno trattati con modalità cartacee e informatiche, con logiche strettamente correlate alle finalità sopra indicate e, comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.

Il conferimento dei dati è obbligatorio per l'erogazione dei servizi richiesti. Il mancato conferimento comporta l'impossibilità di erogare i servizi.

I Suoi dati non saranno comunicati a terzi, salvo nei casi previsti dalla legge.

Lei ha diritto di ottenere la conferma dell'esistenza o meno dei Suoi dati personali, di conoscerne il contenuto e l'origine, di verificarne l'esattezza o chiederne l'integrazione o l'aggiornamento, oppure la rettificazione. Ha inoltre il diritto di chiedere la cancellazione, la trasformazione in forma anonima o il blocco dei dati trattati in violazione di legge, nonché di opporsi in ogni caso, per motivi legittimi, al loro trattamento.`;

const formSchema = z.object({
  clientId: z.string(),
  consentText: z.string().min(1, "Testo del consenso obbligatorio"),
  consentAccepted: z.boolean().refine(val => val === true, {
    message: "È necessario accettare il consenso per procedere"
  }),
  consentType: z.literal("digital_acceptance"),
  fullName: z.string().min(2, "Nome e cognome obbligatori")
});

type FormData = z.infer<typeof formSchema>;

export default function ConsentForm({ clientId, embedded = false }: ConsentFormProps) {
  const { toast } = useToast();

  // TUTTI I HOOKS DEVONO ESSERE CHIAMATI AL TOP LEVEL - NESSUN HOOK CONDIZIONALE
  
  // Fetch client
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["/api/clients", clientId]
  });

  // Fetch consent if exists
  const { data: existingConsent, isLoading: isLoadingConsent } = useQuery({
    queryKey: ["/api/consents/client", clientId],
    retry: false
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId,
      consentText: DEFAULT_CONSENT_TEXT,
      consentAccepted: false,
      consentType: "digital_acceptance" as const,
      fullName: ""
    }
  });

  // Create consent mutation
  const createConsentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/consents", {
        ...data,
        signature: `${data.fullName} - Consenso digitale accettato il ${new Date().toLocaleString()}`
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consenso registrato",
        description: "Il consenso al trattamento dei dati è stato registrato con successo.",
      });
      
      // Refresh only consent data - the server handles the client update
      queryClient.invalidateQueries({ queryKey: ["/api/consents/client"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la registrazione del consenso.",
        variant: "destructive",
      });
    },
  });

  // Update form when client data changes
  React.useEffect(() => {
    if (client) {
      const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
      if (fullName && fullName !== form.getValues('fullName')) {
        form.setValue('fullName', fullName);
      }
    }
  }, [client, form]);

  // Ensure client hasConsent is set to true if we have an existing consent
  React.useEffect(() => {
    const consent = Array.isArray(existingConsent) 
      ? existingConsent.find(c => c.clientId === parseInt(clientId))
      : null;
      
    if (consent && client && !client.hasConsent) {
      apiRequest("PUT", `/api/clients/${clientId}`, {
        ...client,
        hasConsent: true
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      });
    }
  }, [existingConsent, client, clientId]);

  // Handle form submission
  const onSubmit = (data: FormData) => {
    createConsentMutation.mutate(data);
  };

  // Check for existing consent (array of consents)
  const consent = Array.isArray(existingConsent) 
    ? existingConsent.find(c => c.clientId === parseInt(clientId))
    : null;

  // RENDERING CONDIZIONALE DOPO TUTTI GLI HOOKS
  if (isLoadingClient || isLoadingConsent) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Caricamento consenso...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Cliente non trovato. Impossibile gestire il consenso.
        </AlertDescription>
      </Alert>
    );
  }

  // If consent already exists, show existing consent
  if (consent) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Consenso già registrato
          </CardTitle>
          <CardDescription>
            Il consenso al trattamento dei dati per questo cliente è già stato raccolto e registrato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Dettagli consenso:</h4>
            <div className="space-y-2 text-sm text-green-700">
              <p><strong>Cliente:</strong> {client.firstName} {client.lastName}</p>
              <p><strong>Data registrazione:</strong> {new Date(consent.createdAt).toLocaleString('it-IT')}</p>
              <p><strong>Firma:</strong> {consent.signature}</p>
              <p><strong>Stato:</strong> {consent.isActive ? 'Attivo' : 'Non attivo'}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-gray-800 mb-2">Testo del consenso:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{consent.consentText}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([consent.consentText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `consenso_${client.firstName}_${client.lastName}_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Scarica consenso
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show consent registration form
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Consenso al Trattamento dei Dati</CardTitle>
        <CardDescription>
          Registra il consenso GDPR per {client.firstName} {client.lastName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome e Cognome del Cliente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Inserisci nome e cognome"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Il nome completo deve corrispondere ai documenti ufficiali
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consentText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testo del Consenso</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={15}
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Puoi modificare il testo standard se necessario
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consentAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Confermo che il cliente ha letto e accettato il consenso
                    </FormLabel>
                    <FormDescription>
                      Spuntando questa casella dichiari che il cliente ha preso visione 
                      dell'informativa e ha prestato il consenso al trattamento dei dati personali.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={createConsentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createConsentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrazione...
                  </>
                ) : (
                  "Registra Consenso"
                )}
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}