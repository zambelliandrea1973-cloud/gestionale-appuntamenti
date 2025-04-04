import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConsentText, availableLanguages, ConsentText } from "@/lib/privacyConsents";

interface PrivacyConsentFormProps {
  clientId: number;
  onConsentProvided: () => void;
  hasConsent?: boolean;
}

export default function PrivacyConsentForm({ clientId, onConsentProvided, hasConsent = false }: PrivacyConsentFormProps) {
  const { toast } = useToast();
  const [consent, setConsent] = useState<boolean>(hasConsent);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("it-IT");
  const [consentText, setConsentText] = useState<ConsentText>(getConsentText(selectedLanguage));

  // Aggiorna il testo del consenso quando cambia la lingua
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setConsentText(getConsentText(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
      toast({
        title: "Consenso richiesto",
        description: "Per proseguire è necessario accettare i termini della privacy",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Salva il consenso nel database
      const response = await apiRequest('POST', '/api/consents', {
        clientId,
        consentProvided: true,
        consentDate: new Date().toISOString(),
        consentText: JSON.stringify({
          language: selectedLanguage,
          version: "1.0"
        })
      });
      
      if (response.ok) {
        // Callback per il componente padre
        onConsentProvided();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Errore durante la registrazione del consenso");
      }
    } catch (error) {
      console.error("Errore nell'invio del modulo di consenso:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante la registrazione del consenso",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{consentText.title}</span>
          <div className="w-48">
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona lingua" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-6 pb-6">
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[400px] rounded-md border p-4 mb-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {consentText.introduction}
              </p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "数据控制者" : "Titolare del trattamento"}</h3>
              <p>{consentText.dataController}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "处理目的" : "Finalità del trattamento"}</h3>
              <p>
                {consentText.language === "Italiano" 
                  ? "I dati personali da Lei forniti saranno trattati per le seguenti finalità:"
                  : consentText.language === "中文" 
                    ? "提供个人信息的目的："
                    : "Purposes of data processing:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.purposes.map((purpose, index) => (
                  <li key={index}>{purpose}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "法律依据" : "Base giuridica del trattamento"}</h3>
              <p>
                {consentText.language === "Italiano" 
                  ? "Il trattamento dei Suoi dati personali si fonda sulle seguenti basi giuridiche:"
                  : consentText.language === "中文" 
                    ? "处理您个人信息的法律依据："
                    : "Legal basis for data processing:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.legalBasis.map((basis, index) => (
                  <li key={index}>{basis}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "数据类别" : "Categorie di dati trattati"}</h3>
              <p>
                {consentText.language === "Italiano" 
                  ? "Il trattamento riguarderà le seguenti categorie di dati:"
                  : consentText.language === "中文" 
                    ? "处理涉及以下类别的数据："
                    : "The processing will involve the following categories of data:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.dataCategories.map((category, index) => (
                  <li key={index}>{category}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "处理方式" : "Modalità di trattamento"}</h3>
              <p>{consentText.dataProcessing}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "保留期限" : "Periodo di conservazione"}</h3>
              <p>{consentText.retentionPeriod}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "数据接收者" : "Destinatari dei dati"}</h3>
              <p>
                {consentText.language === "Italiano" 
                  ? "I dati potranno essere comunicati a:"
                  : consentText.language === "中文" 
                    ? "数据可能会传达给："
                    : "The data may be communicated to:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.dataRecipients.map((recipient, index) => (
                  <li key={index}>{recipient}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "数据传输" : "Trasferimento dati"}</h3>
              <p>{consentText.dataTransfer}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.rightsTitle}</h3>
              <p>
                {consentText.language === "Italiano" 
                  ? "In qualità di interessato, Lei ha il diritto di:"
                  : consentText.language === "中文" 
                    ? "作为数据主体，您有权："
                    : "As a data subject, you have the right to:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.rights.map((right, index) => (
                  <li key={index}>{right}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "提供数据的性质" : "Natura del conferimento dei dati"}</h3>
              <p>{consentText.consentNature}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.language === "中文" ? "自动化决策" : "Processo decisionale automatizzato"}</h3>
              <p>{consentText.automatedDecisionMaking}</p>
            </div>
          </ScrollArea>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="consent" 
                checked={consent} 
                onCheckedChange={(value) => setConsent(value === true)}
                disabled={hasConsent || isSubmitting}
              />
              <label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {hasConsent 
                  ? consentText.language === "Italiano" 
                    ? "Hai già fornito il consenso al trattamento dei dati personali"
                    : consentText.language === "中文" 
                      ? "您已提供个人信息处理同意"
                      : "You have already provided consent for personal data processing"
                  : consentText.consentStatement}
              </label>
            </div>
            
            {!hasConsent && (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting 
                  ? consentText.language === "Italiano" 
                    ? "Salvataggio in corso..." 
                    : consentText.language === "中文" 
                      ? "保存中..." 
                      : "Saving..."
                  : consentText.language === "Italiano" 
                    ? "Fornisci consenso" 
                    : consentText.language === "中文" 
                      ? "提供同意" 
                      : "Provide consent"}
              </Button>
            )}
            
            {hasConsent && (
              <p className="text-sm text-muted-foreground italic text-center">
                {consentText.language === "Italiano" 
                  ? "Hai già fornito il consenso al trattamento dei dati personali in data precedente."
                  : consentText.language === "中文" 
                    ? "您已于之前日期提供了个人信息处理同意。"
                    : "You have already provided consent for personal data processing at a previous date."}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}