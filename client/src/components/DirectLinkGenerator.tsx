import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t('i18nFinale.directLinkGenerator.linkCopiedTitle'),
        description: t('i18nFinale.directLinkGenerator.linkCopied'),
      });
      
      // Resetta lo stato dopo 2 secondi
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Error copying link:", err);
      toast({
        title: t('common.error'),
        description: t('i18nFinale.directLinkGenerator.copyFailed'),
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
        <CardTitle className="text-lg font-semibold">{t('i18nFinale.directLinkGenerator.directLinkTitle')}</CardTitle>
        <CardDescription>
          {t('i18nFinale.directLinkGenerator.copyAndShareDesc', { clientName })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="direct-link">{t('i18nFinale.directLinkGenerator.accessLink')}</Label>
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
                title={t('i18nFinale.directLinkGenerator.copyLinkTitle')}
              >
                <Copy className={`h-4 w-4 ${isCopied ? 'text-green-500' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={openInNewTab}
                title={t('i18nFinale.directLinkGenerator.openInNewTab')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>{t('i18nFinale.directLinkGenerator.easyAccessNote')}</p>
            <p className="mt-1">{t('i18nFinale.directLinkGenerator.passwordOnlyNote')}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">{t('i18nFinale.directLinkGenerator.securityNoteLabel')}</span> {t('i18nFinale.directLinkGenerator.securityNoteText', { clientName })}
        </div>
      </CardFooter>
    </Card>
  );
}