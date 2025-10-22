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
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Titolare del trattamento" :
                 consentText.languageCode === "en" ? "Data Controller" :
                 consentText.languageCode === "es" ? "Responsable del tratamiento" :
                 consentText.languageCode === "de" ? "Verantwortlicher für die Datenverarbeitung" :
                 consentText.languageCode === "fr" ? "Responsable du traitement" :
                 consentText.languageCode === "zh" ? "数据控制者" :
                 "Data Controller"}
              </h3>
              <p>{consentText.dataController}</p>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Finalità del trattamento" :
                 consentText.languageCode === "en" ? "Purposes of Processing" :
                 consentText.languageCode === "es" ? "Finalidades del tratamiento" :
                 consentText.languageCode === "de" ? "Zwecke der Verarbeitung" :
                 consentText.languageCode === "fr" ? "Finalités du traitement" :
                 consentText.languageCode === "zh" ? "处理目的" :
                 "Purposes of Processing"}
              </h3>
              <p>
                {consentText.languageCode === "it" ? "I dati personali da Lei forniti saranno trattati per le seguenti finalità:" :
                 consentText.languageCode === "en" ? "Your personal data will be processed for the following purposes:" :
                 consentText.languageCode === "es" ? "Sus datos personales serán tratados para las siguientes finalidades:" :
                 consentText.languageCode === "de" ? "Ihre personenbezogenen Daten werden für folgende Zwecke verarbeitet:" :
                 consentText.languageCode === "fr" ? "Vos données personnelles seront traitées pour les finalités suivantes:" :
                 consentText.languageCode === "zh" ? "提供个人信息的目的：" :
                 "Your personal data will be processed for the following purposes:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.purposes.map((purpose, index) => (
                  <li key={index}>{purpose}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Base giuridica del trattamento" :
                 consentText.languageCode === "en" ? "Legal Basis" :
                 consentText.languageCode === "es" ? "Base jurídica del tratamiento" :
                 consentText.languageCode === "de" ? "Rechtsgrundlage der Verarbeitung" :
                 consentText.languageCode === "fr" ? "Base juridique du traitement" :
                 consentText.languageCode === "zh" ? "法律依据" :
                 "Legal Basis"}
              </h3>
              <p>
                {consentText.languageCode === "it" ? "Il trattamento dei Suoi dati personali si fonda sulle seguenti basi giuridiche:" :
                 consentText.languageCode === "en" ? "The processing of your personal data is based on the following legal grounds:" :
                 consentText.languageCode === "es" ? "El tratamiento de sus datos personales se basa en las siguientes bases jurídicas:" :
                 consentText.languageCode === "de" ? "Die Verarbeitung Ihrer personenbezogenen Daten basiert auf folgenden Rechtsgrundlagen:" :
                 consentText.languageCode === "fr" ? "Le traitement de vos données personnelles est fondé sur les bases juridiques suivantes:" :
                 consentText.languageCode === "zh" ? "处理您个人信息的法律依据：" :
                 "The processing of your personal data is based on the following legal grounds:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.legalBasis.map((basis, index) => (
                  <li key={index}>{basis}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Categorie di dati trattati" :
                 consentText.languageCode === "en" ? "Categories of Data" :
                 consentText.languageCode === "es" ? "Categorías de datos tratados" :
                 consentText.languageCode === "de" ? "Kategorien der verarbeiteten Daten" :
                 consentText.languageCode === "fr" ? "Catégories de données traitées" :
                 consentText.languageCode === "zh" ? "数据类别" :
                 "Categories of Data"}
              </h3>
              <p>
                {consentText.languageCode === "it" ? "Il trattamento riguarderà le seguenti categorie di dati:" :
                 consentText.languageCode === "en" ? "The processing will involve the following categories of data:" :
                 consentText.languageCode === "es" ? "El tratamiento afectará a las siguientes categorías de datos:" :
                 consentText.languageCode === "de" ? "Die Verarbeitung betrifft folgende Datenkategorien:" :
                 consentText.languageCode === "fr" ? "Le traitement concernera les catégories de données suivantes:" :
                 consentText.languageCode === "zh" ? "处理涉及以下类别的数据：" :
                 "The processing will involve the following categories of data:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.dataCategories.map((category, index) => (
                  <li key={index}>{category}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Modalità di trattamento" :
                 consentText.languageCode === "en" ? "Processing Methods" :
                 consentText.languageCode === "es" ? "Modalidades de tratamiento" :
                 consentText.languageCode === "de" ? "Verarbeitungsmethoden" :
                 consentText.languageCode === "fr" ? "Modalités de traitement" :
                 consentText.languageCode === "zh" ? "处理方式" :
                 "Processing Methods"}
              </h3>
              <p>{consentText.dataProcessing}</p>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Periodo di conservazione" :
                 consentText.languageCode === "en" ? "Retention Period" :
                 consentText.languageCode === "es" ? "Período de conservación" :
                 consentText.languageCode === "de" ? "Aufbewahrungsfrist" :
                 consentText.languageCode === "fr" ? "Période de conservation" :
                 consentText.languageCode === "zh" ? "保留期限" :
                 "Retention Period"}
              </h3>
              <p>{consentText.retentionPeriod}</p>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Destinatari dei dati" :
                 consentText.languageCode === "en" ? "Data Recipients" :
                 consentText.languageCode === "es" ? "Destinatarios de los datos" :
                 consentText.languageCode === "de" ? "Empfänger der Daten" :
                 consentText.languageCode === "fr" ? "Destinataires des données" :
                 consentText.languageCode === "zh" ? "数据接收者" :
                 "Data Recipients"}
              </h3>
              <p>
                {consentText.languageCode === "it" ? "I dati potranno essere comunicati a:" :
                 consentText.languageCode === "en" ? "The data may be communicated to:" :
                 consentText.languageCode === "es" ? "Los datos pueden ser comunicados a:" :
                 consentText.languageCode === "de" ? "Die Daten können weitergegeben werden an:" :
                 consentText.languageCode === "fr" ? "Les données peuvent être communiquées à:" :
                 consentText.languageCode === "zh" ? "数据可能会传达给：" :
                 "The data may be communicated to:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.dataRecipients.map((recipient, index) => (
                  <li key={index}>{recipient}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Trasferimento dati" :
                 consentText.languageCode === "en" ? "Data Transfer" :
                 consentText.languageCode === "es" ? "Transferencia de datos" :
                 consentText.languageCode === "de" ? "Datenübermittlung" :
                 consentText.languageCode === "fr" ? "Transfert de données" :
                 consentText.languageCode === "zh" ? "数据传输" :
                 "Data Transfer"}
              </h3>
              <p>{consentText.dataTransfer}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.rightsTitle}</h3>
              <p>
                {consentText.languageCode === "it" ? "In qualità di interessato, Lei ha il diritto di:" :
                 consentText.languageCode === "en" ? "As a data subject, you have the right to:" :
                 consentText.languageCode === "es" ? "Como interesado, tiene derecho a:" :
                 consentText.languageCode === "de" ? "Als betroffene Person haben Sie das Recht auf:" :
                 consentText.languageCode === "fr" ? "En tant que personne concernée, vous avez le droit de:" :
                 consentText.languageCode === "zh" ? "作为数据主体，您有权：" :
                 "As a data subject, you have the right to:"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.rights.map((right, index) => (
                  <li key={index}>{right}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Natura del conferimento dei dati" :
                 consentText.languageCode === "en" ? "Nature of Data Provision" :
                 consentText.languageCode === "es" ? "Naturaleza de la provisión de datos" :
                 consentText.languageCode === "de" ? "Art der Datenbereitstellung" :
                 consentText.languageCode === "fr" ? "Nature de la fourniture des données" :
                 consentText.languageCode === "zh" ? "提供数据的性质" :
                 "Nature of Data Provision"}
              </h3>
              <p>{consentText.consentNature}</p>
              
              <h3 className="text-lg font-medium pt-2">
                {consentText.languageCode === "it" ? "Processo decisionale automatizzato" :
                 consentText.languageCode === "en" ? "Automated Decision-Making" :
                 consentText.languageCode === "es" ? "Proceso de toma de decisiones automatizado" :
                 consentText.languageCode === "de" ? "Automatisierte Entscheidungsfindung" :
                 consentText.languageCode === "fr" ? "Processus décisionnel automatisé" :
                 consentText.languageCode === "zh" ? "自动化决策" :
                 "Automated Decision-Making"}
              </h3>
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
                  ? consentText.languageCode === "it" ? "Hai già fornito il consenso al trattamento dei dati personali" :
                    consentText.languageCode === "en" ? "You have already provided consent for personal data processing" :
                    consentText.languageCode === "es" ? "Ya has proporcionado consentimiento para el tratamiento de datos personales" :
                    consentText.languageCode === "de" ? "Sie haben bereits Ihre Einwilligung zur Verarbeitung personenbezogener Daten erteilt" :
                    consentText.languageCode === "fr" ? "Vous avez déjà donné votre consentement au traitement des données personnelles" :
                    consentText.languageCode === "zh" ? "您已提供个人信息处理同意" :
                    "You have already provided consent for personal data processing"
                  : consentText.consentStatement}
              </label>
            </div>
            
            {!hasConsent && (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting 
                  ? consentText.languageCode === "it" ? "Salvataggio in corso..." :
                    consentText.languageCode === "en" ? "Saving..." :
                    consentText.languageCode === "es" ? "Guardando..." :
                    consentText.languageCode === "de" ? "Wird gespeichert..." :
                    consentText.languageCode === "fr" ? "Enregistrement en cours..." :
                    consentText.languageCode === "zh" ? "保存中..." :
                    "Saving..."
                  : consentText.languageCode === "it" ? "Fornisci consenso" :
                    consentText.languageCode === "en" ? "Provide consent" :
                    consentText.languageCode === "es" ? "Dar consentimiento" :
                    consentText.languageCode === "de" ? "Einwilligung erteilen" :
                    consentText.languageCode === "fr" ? "Donner consentement" :
                    consentText.languageCode === "zh" ? "提供同意" :
                    "Provide consent"}
              </Button>
            )}
            
            {hasConsent && (
              <p className="text-sm text-muted-foreground italic text-center">
                {consentText.languageCode === "it" ? "Hai già fornito il consenso al trattamento dei dati personali in data precedente." :
                 consentText.languageCode === "en" ? "You have already provided consent for personal data processing at a previous date." :
                 consentText.languageCode === "es" ? "Ya has proporcionado consentimiento para el tratamiento de datos personales en una fecha anterior." :
                 consentText.languageCode === "de" ? "Sie haben bereits zu einem früheren Zeitpunkt Ihre Einwilligung zur Verarbeitung personenbezogener Daten erteilt." :
                 consentText.languageCode === "fr" ? "Vous avez déjà donné votre consentement au traitement des données personnelles à une date antérieure." :
                 consentText.languageCode === "zh" ? "您已于之前日期提供了个人信息处理同意。" :
                 "You have already provided consent for personal data processing at a previous date."}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}