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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConsentFormProps {
  clientId: number;
  embedded?: boolean; // Se true, non mostra il form wrapper per evitare form annidati
}

// Default consent text
const DEFAULT_CONSENT_TEXT = `
INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI E CONSENSO

Ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR), La informiamo che i dati personali e le categorie particolari di dati (come i dati relativi alla salute) da Lei forniti saranno trattati nel rispetto della normativa citata.

I dati saranno utilizzati per:
- Gestione degli appuntamenti e dei trattamenti
- Conservazione della storia clinica e delle allergie
- Contatti per appuntamenti, modifiche e cancellazioni
- Adempimento degli obblighi di legge
- Dati necessari per la fatturazione

I dati saranno conservati per il tempo necessario agli scopi per i quali sono stati raccolti e potranno essere comunicati esclusivamente a soggetti competenti per l'espletamento dei servizi necessari, con garanzia di tutela dei suoi diritti.

Lei ha il diritto di ottenere dal titolare la cancellazione, la limitazione, l'aggiornamento, la rettificazione, la portabilità dei suoi dati, e può opporsi al loro trattamento nei casi previsti dalla legge.

Per esercitare i suoi diritti o per ottenere informazioni sui suoi dati, può contattare il titolare del trattamento.
`;

// Schema for form validation - simplified for checkbox consent
const formSchema = z.object({
  clientId: z.number(),
  consentText: z.string(),
  consentAccepted: z.boolean().refine(val => val === true, {
    message: "È necessario accettare l'informativa per procedere"
  }),
  consentType: z.enum(["digital_acceptance"]),
  fullName: z.string().min(2, "Nome e cognome obbligatori")
});

type FormData = z.infer<typeof formSchema>;

export default function ConsentForm({ clientId, embedded = false }: ConsentFormProps) {
  const { toast } = useToast();

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
      fullName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : ""
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

  // Handle form submission
  const onSubmit = (data: FormData) => {
    createConsentMutation.mutate(data);
  };

  // Download PDF mutation
  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/consents/client/${clientId}/pdf`);
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `consenso-${client?.firstName}-${client?.lastName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Download completato",
        description: "Il documento PDF del consenso è stato scaricato.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore durante il download del PDF.",
        variant: "destructive",
      });
    },
  });

  if (isLoadingClient || isLoadingConsent) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Cliente non trovato</AlertTitle>
        <AlertDescription>
          Non è stato possibile trovare le informazioni del cliente.
        </AlertDescription>
      </Alert>
    );
  }

  // Ensure client hasConsent is set to true if we have an existing consent
  React.useEffect(() => {
    if (existingConsent && client && !client.hasConsent) {
      apiRequest("PUT", `/api/clients/${clientId}`, {
        ...client,
        hasConsent: true
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      });
    }
  }, [existingConsent, client, clientId]);

  // If consent already exists, show existing consent
  if (existingConsent) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Consenso già registrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Il consenso al trattamento dei dati per {client.firstName} {client.lastName} è già stato registrato.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p><strong>Data registrazione:</strong> {new Date(existingConsent.createdAt).toLocaleString()}</p>
            <p><strong>Tipo consenso:</strong> {existingConsent.consentType === 'digital_acceptance' ? 'Accettazione digitale' : 'Firma tradizionale'}</p>
          </div>
          <Button
            onClick={() => downloadPdfMutation.mutate()}
            disabled={downloadPdfMutation.isPending}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadPdfMutation.isPending ? "Download in corso..." : "Scarica PDF Consenso"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Consenso al trattamento dei dati personali</CardTitle>
        <p className="text-muted-foreground">
          Cliente: {client.firstName} {client.lastName}
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            {/* Display consent text */}
            <div className="bg-muted p-6 rounded-lg max-h-80 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                {DEFAULT_CONSENT_TEXT}
              </pre>
            </div>

            {/* Full name field */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome e Cognome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Inserisci nome e cognome"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Conferma il tuo nome completo come da documento di identità
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consent acceptance checkbox */}
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
                    <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Accetto l'informativa
                    </FormLabel>
                    <FormDescription>
                      Dichiaro di aver letto e compreso l'informativa sul trattamento dei dati personali e acconsento al trattamento dei miei dati secondo quanto descritto.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />



            {/* Submit button */}
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createConsentMutation.isPending || !form.watch('consentAccepted')}
              className="w-full"
            >
              {createConsentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrazione in corso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Registra Consenso
                </>
              )}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}