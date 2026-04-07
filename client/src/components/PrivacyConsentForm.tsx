import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConsentText, availableLanguages, ConsentText } from "@/lib/privacyConsents";
import { useTranslation } from "react-i18next";

interface PrivacyConsentFormProps {
  clientId: number;
  onConsentProvided: () => void;
  hasConsent?: boolean;
}

export default function PrivacyConsentForm({ clientId, onConsentProvided, hasConsent = false }: PrivacyConsentFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [consent, setConsent] = useState<boolean>(hasConsent);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("it-IT");
  const [consentText, setConsentText] = useState<ConsentText>(getConsentText(selectedLanguage));

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setConsentText(getConsentText(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
      toast({
        title: t('privacyConsent.consentRequired'),
        description: t('privacyConsent.consentRequiredDesc'),
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', '/api/consents', {
        clientId,
        consentProvided: true,
        consentText: JSON.stringify({
          language: selectedLanguage,
          version: "1.0"
        })
      });
      
      if (response.ok) {
        onConsentProvided();
      } else {
        const error = await response.json();
        throw new Error(error.message || t('privacyConsent.registrationError'));
      }
    } catch (error) {
      console.error("Consent form submission error:", error);
      toast({
        title: t('privacyConsent.error'),
        description: t('privacyConsent.registrationErrorDesc'),
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
                <SelectValue placeholder={t('privacyConsent.selectLanguage')} />
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
              
              <h3 className="text-lg font-medium pt-2">{consentText.dataControllerHeading}</h3>
              <p>{consentText.dataController}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.purposesHeading}</h3>
              <p>{consentText.purposesIntro}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.purposes.map((purpose, index) => (
                  <li key={index}>{purpose}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.legalBasisHeading}</h3>
              <p>{consentText.legalBasisIntro}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.legalBasis.map((basis, index) => (
                  <li key={index}>{basis}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.dataCategoriesHeading}</h3>
              <p>{consentText.dataCategoriesIntro}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.dataCategories.map((category, index) => (
                  <li key={index}>{category}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.dataProcessingHeading}</h3>
              <p>{consentText.dataProcessing}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.retentionPeriodHeading}</h3>
              <p>{consentText.retentionPeriod}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.dataRecipientsHeading}</h3>
              <p>{consentText.dataRecipientsIntro}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.dataRecipients.map((recipient, index) => (
                  <li key={index}>{recipient}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.dataTransferHeading}</h3>
              <p>{consentText.dataTransfer}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.rightsTitle}</h3>
              <p>{consentText.rightsIntro}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentText.rights.map((right, index) => (
                  <li key={index}>{right}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium pt-2">{consentText.consentNatureHeading}</h3>
              <p>{consentText.consentNature}</p>
              
              <h3 className="text-lg font-medium pt-2">{consentText.automatedDecisionMakingHeading}</h3>
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
                  ? consentText.consentAlreadyProvided
                  : consentText.consentStatement}
              </label>
            </div>
            
            {!hasConsent && (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting 
                  ? consentText.saving
                  : consentText.provideConsent}
              </Button>
            )}
            
            {hasConsent && (
              <p className="text-sm text-muted-foreground italic text-center">
                {consentText.consentAlreadyProvidedPrevious}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
