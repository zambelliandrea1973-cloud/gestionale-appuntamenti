import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { insertConsentSchema } from "@shared/schema";

interface ConsentFormProps {
  clientId: number;
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

// Schema for form validation
const formSchema = insertConsentSchema.extend({
  signature: z.string().min(2, "La firma è obbligatoria"),
});

type FormData = z.infer<typeof formSchema>;

export default function ConsentForm({ clientId }: ConsentFormProps) {
  const { toast } = useToast();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const signaturePadRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  
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
      signature: ""
    }
  });
  
  // Initialize signature pad
  const initSignaturePad = () => {
    if (signaturePadRef.current && !signatureUrl) {
      const canvas = document.createElement("canvas");
      canvas.width = signaturePadRef.current.clientWidth;
      canvas.height = 150;
      canvas.style.border = "1px solid #e2e8f0";
      canvas.style.borderRadius = "0.375rem";
      canvas.style.touchAction = "none";
      
      signaturePadRef.current.innerHTML = "";
      signaturePadRef.current.appendChild(canvas);
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "black";
      
      // Mouse events
      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stopDrawing);
      canvas.addEventListener("mouseout", stopDrawing);
      
      // Touch events
      canvas.addEventListener("touchstart", startDrawingTouch);
      canvas.addEventListener("touchmove", drawTouch);
      canvas.addEventListener("touchend", stopDrawing);
      
      function startDrawing(e: MouseEvent) {
        isDrawing.current = true;
        draw(e);
      }
      
      function startDrawingTouch(e: TouchEvent) {
        isDrawing.current = true;
        drawTouch(e);
      }
      
      function draw(e: MouseEvent) {
        if (!isDrawing.current || !ctx) return;
        
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
      }
      
      function drawTouch(e: TouchEvent) {
        if (!isDrawing.current || !ctx) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      function stopDrawing() {
        isDrawing.current = false;
        
        // Save signature as data URL
        const dataUrl = canvas.toDataURL("image/png");
        setSignatureUrl(dataUrl);
        form.setValue("signature", dataUrl);
      }
    }
  };
  
  // Save consent mutation
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/consents", data);
    },
    onSuccess: async () => {
      toast({
        title: "Consenso salvato",
        description: "Il consenso è stato registrato con successo",
      });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/consents/client', clientId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
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
    if (!signatureUrl) {
      toast({
        title: "Firma richiesta",
        description: "È necessario apporre la firma per confermare il consenso",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(data);
  };
  
  // Clear signature
  const clearSignature = () => {
    setSignatureUrl(null);
    form.setValue("signature", "");
    
    // Re-initialize the signature pad
    setTimeout(initSignaturePad, 0);
  };
  
  // Download consent as PDF
  const downloadConsent = () => {
    if (!existingConsent) return;
    
    // Create a printable version for download
    const printContent = `
      <html>
        <head>
          <title>Modulo di Consenso</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { font-size: 18px; margin-bottom: 20px; }
            .consent-text { margin-bottom: 30px; white-space: pre-wrap; }
            .signature-container { margin-top: 30px; }
            .signature-label { font-weight: bold; margin-bottom: 10px; }
            .signature-image { border-bottom: 1px solid #000; padding-bottom: 5px; }
            .date { margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>MODULO DI CONSENSO AL TRATTAMENTO DEI DATI</h1>
          <div class="consent-text">${existingConsent.consentText}</div>
          <div class="signature-container">
            <div class="signature-label">Firma del cliente:</div>
            <div class="signature-image">
              <img src="${existingConsent.signature}" alt="Firma" style="max-width: 300px; max-height: 100px;" />
            </div>
          </div>
          <div class="date">
            Data: ${new Date(existingConsent.signedAt).toLocaleDateString('it-IT')}
          </div>
        </body>
      </html>
    `;
    
    // Open printable version in a new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Print or save as PDF
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast({
        title: "Errore",
        description: "Non è stato possibile aprire la finestra di stampa. Controlla che i popup non siano bloccati.",
        variant: "destructive",
      });
    }
  };
  
  // Initialize signature pad when component is mounted
  useState(() => {
    if (!existingConsent) {
      setTimeout(initSignaturePad, 0);
    }
  });
  
  // Loading state
  const isLoading = isLoadingClient || isLoadingConsent;
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If consent already exists, show it
  if (existingConsent) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Consenso già fornito</AlertTitle>
            <AlertDescription>
              Il cliente ha già fornito il consenso al trattamento dei dati in data {new Date(existingConsent.signedAt).toLocaleDateString('it-IT')}.
            </AlertDescription>
          </Alert>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Testo del consenso:</h3>
            <div className="text-sm p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
              {existingConsent.consentText}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-1">Firma:</h3>
            <div className="border rounded-md p-2 bg-white">
              <img 
                src={existingConsent.signature} 
                alt="Firma" 
                className="max-h-[100px]" 
              />
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={downloadConsent}
          >
            <Download className="mr-2 h-4 w-4" />
            Scarica modulo di consenso
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // If no consent exists, show form to collect it
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Alert className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Consenso richiesto</AlertTitle>
          <AlertDescription>
            Per poter trattare i dati personali e medici del cliente è necessario raccogliere il consenso.
          </AlertDescription>
        </Alert>
        
        <FormField
          control={form.control}
          name="consentText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Testo del consenso</FormLabel>
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
              <div className="text-sm p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
                {field.value}
              </div>
              <FormDescription>
                Questo è il testo standard del consenso al trattamento dei dati personali e medici.
              </FormDescription>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="signature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firma del cliente</FormLabel>
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
              <div
                ref={signaturePadRef}
                className="border rounded-md min-h-[150px] flex items-center justify-center"
                onClick={initSignaturePad}
              >
                {!signatureUrl && (
                  <p className="text-sm text-gray-500">
                    Clicca qui per firmare
                  </p>
                )}
              </div>
              <FormDescription className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="mt-2"
                >
                  Cancella firma
                </Button>
              </FormDescription>
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={mutation.isPending || !signatureUrl}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Conferma e salva consenso
        </Button>
      </form>
    </Form>
  );
}
