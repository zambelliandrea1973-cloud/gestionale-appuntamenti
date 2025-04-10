import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Download, Copy, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectLinkGenerator } from "./DirectLinkGenerator";

interface QRCodeModalProps {
  clientId: number;
  clientName: string;
  open: boolean;
  onClose: () => void;
  onQrCodeGenerated?: (qrCode: string) => void;
  initialTab?: "qrcode" | "link";
}

export default function QRCodeModal({ clientId, clientName, open, onClose, onQrCodeGenerated, initialTab = "qrcode" }: QRCodeModalProps) {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  
  // Mutation per generare il token di attivazione e il QR code
  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/generate-activation`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setActivationUrl(data.activationUrl);
      
      // Notifica il genitore che il codice QR è stato generato
      if (onQrCodeGenerated && data.qrCode) {
        onQrCodeGenerated(data.qrCode);
      }
      
      toast({
        title: "Token generato",
        description: "Token di attivazione generato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Genera il token quando il componente viene montato
  if (open && !qrCode && !generateTokenMutation.isPending) {
    generateTokenMutation.mutate();
  }
  
  // Funzione per scaricare il QR code come immagine
  const downloadQrCode = () => {
    if (!qrCode) return;
    
    // Crea un elemento <a> temporaneo
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `qr-attivazione-${clientName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code scaricato",
      description: "Il QR code è stato scaricato correttamente",
    });
  };
  
  // Funzione per copiare l'URL di attivazione negli appunti
  const copyActivationUrl = () => {
    if (!activationUrl) return;
    
    navigator.clipboard.writeText(activationUrl)
      .then(() => {
        toast({
          title: "URL copiato",
          description: "L'URL di attivazione è stato copiato negli appunti",
        });
      })
      .catch((err) => {
        toast({
          title: "Errore",
          description: "Impossibile copiare l'URL negli appunti",
          variant: "destructive",
        });
      });
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Codice QR di Attivazione Cliente</DialogTitle>
          <DialogDescription>
            Questo QR code permetterà a {clientName} di accedere all'area riservata.
            Può essere scansionato con la fotocamera di qualsiasi smartphone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-4">
          {generateTokenMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-gray-500">Generazione QR code in corso...</p>
            </div>
          ) : qrCode ? (
            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                <TabsTrigger value="link">Link diretto</TabsTrigger>
              </TabsList>
              
              <TabsContent value="qrcode" className="flex flex-col items-center">
                <div className="border rounded-md p-2 bg-white">
                  <img src={qrCode} alt="QR code di attivazione" className="w-64 h-64" />
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm" onClick={downloadQrCode}>
                    <Download className="mr-2 h-4 w-4" />
                    Scarica
                  </Button>
                </div>
                
                <p className="mt-4 text-sm text-gray-500 text-center">
                  Condividi questo QR code con il cliente per consentirgli di accedere all'area riservata.
                </p>
              </TabsContent>
              
              <TabsContent value="link" className="flex flex-col">
                {activationUrl && (
                  <div>
                    <div className="mb-4">
                      <div className="font-medium mb-2">Link di attivazione (per primo accesso)</div>
                      <div className="flex items-center space-x-2">
                        <div className="border rounded-md p-2 flex-1 bg-muted overflow-hidden">
                          <p className="text-sm text-muted-foreground truncate">
                            {activationUrl || "URL non disponibile"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={copyActivationUrl}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      {/* Usa il componente DirectLinkGenerator per il link di accesso diretto */}
                      {activationUrl.split('token=')[1] && (
                        <DirectLinkGenerator 
                          token={activationUrl.split('token=')[1].split('&')[0]} 
                          clientId={clientId} 
                          clientName={clientName}
                        />
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <QrCode className="w-12 h-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Nessun QR code generato</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}