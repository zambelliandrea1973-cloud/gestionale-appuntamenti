import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, QrCode } from 'lucide-react';

interface DirectLinkGeneratorProps {
  token: string;
  clientId: number;
  clientName: string;
}

export function DirectLinkGenerator({ token, clientId, clientName }: DirectLinkGeneratorProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  
  // Genera l'URL completo per l'accesso diretto
  const generateDirectLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auto-login?token=${token}&clientId=${clientId}`;
  };
  
  const directLink = generateDirectLink();
  
  // Funzione per copiare il link negli appunti
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setIsCopied(true);
      
      toast({
        title: "Link copiato!",
        description: "Il link di accesso diretto è stato copiato negli appunti.",
      });
      
      // Resetta lo stato dopo 2 secondi
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Errore durante la copia del link:", err);
      toast({
        title: "Errore",
        description: "Non è stato possibile copiare il link. Prova a selezionarlo manualmente.",
        variant: "destructive",
      });
    }
  };
  
  // Funzione per aprire il link in una nuova scheda
  const openInNewTab = () => {
    window.open(directLink, '_blank');
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Link Diretto</CardTitle>
        <CardDescription>
          Copia e condividi questo link con {clientName} per un accesso semplice e diretto all'area cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="direct-link">Link di accesso</Label>
            <div className="flex items-center gap-2">
              <Input 
                id="direct-link" 
                readOnly 
                value={directLink} 
                className="flex-1" 
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyToClipboard}
                title="Copia link"
              >
                <Copy className={`h-4 w-4 ${isCopied ? 'text-green-500' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={openInNewTab}
                title="Apri in una nuova scheda"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Questo link permette un accesso più facile all'area cliente con nome utente precompilato.</p>
            <p className="mt-1">Sarà necessario inserire solo la password, rendendo l'accesso rapido e semplice.</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">Note di sicurezza:</span> Questo link contiene un token riservato. Da condividere solo con {clientName}.
        </div>
      </CardFooter>
    </Card>
  );
}