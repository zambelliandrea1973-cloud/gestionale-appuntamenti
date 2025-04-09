import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, Globe, Facebook, Instagram, Check, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ContactInfo, loadContactInfo, saveContactInfo, isValidContactInfo } from '@/lib/contactInfo';

interface ContactInfoEditorProps {
  onSuccess?: () => void;
}

export default function ContactInfoEditor({ onSuccess }: ContactInfoEditorProps) {
  const { t } = useTranslation();
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Carica le informazioni dei contatti al mount
  useEffect(() => {
    const savedInfo = loadContactInfo();
    setContactInfo(savedInfo);
  }, []);

  const handleInputChange = (field: keyof ContactInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Rimuovi l'errore di validazione quando l'utente modifica il campo
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    // Verifica solo i campi che hanno un valore
    Object.entries(contactInfo).forEach(([key, value]) => {
      if (value && !isValidContactInfo(key as keyof ContactInfo, value)) {
        errors[key] = t(`settings.contactInfo.invalidFormat`, 'Formato non valido');
        isValid = false;
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFields()) {
      toast({
        title: t('settings.contactInfo.validationError', 'Errore di validazione'),
        description: t('settings.contactInfo.checkFields', 'Controlla i campi evidenziati'),
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Salva le informazioni di contatto
      saveContactInfo(contactInfo);
      
      // Emetti un evento personalizzato per notificare che i contatti sono stati aggiornati
      const event = new CustomEvent('contactInfoUpdated', { 
        detail: { contactInfo } 
      });
      window.dispatchEvent(event);
      
      // Forza un aggiornamento del localStorage per attivare l'evento 'storage'
      const storageKey = 'healthcare_app_contact_info';
      const tempValue = JSON.stringify(contactInfo) + '_temp';
      localStorage.setItem(storageKey + '_temp', tempValue);
      localStorage.removeItem(storageKey + '_temp');
      
      console.log("Informazioni di contatto salvate:", contactInfo);
      
      setSaveSuccess(true);
      toast({
        title: t('settings.contactInfo.saveSuccess', 'Salvataggio completato'),
        description: t('settings.contactInfo.saveSuccessDesc', 'Le informazioni di contatto sono state aggiornate con successo'),
        variant: "default",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Errore durante il salvataggio delle informazioni di contatto:', error);
      setSaveError(error.message || t('settings.contactInfo.saveError', 'Si è verificato un errore durante il salvataggio'));
      toast({
        title: t('settings.contactInfo.saveErrorTitle', 'Errore di salvataggio'),
        description: error.message || t('settings.contactInfo.saveError', 'Si è verificato un errore durante il salvataggio'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('settings.contactInfo.title', 'Informazioni di contatto')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.contactInfo.description', 'Inserisci le informazioni di contatto che verranno visualizzate nell\'app cliente')}
      </p>

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>{t('settings.contactInfo.saveSuccess', 'Salvataggio completato')}</AlertTitle>
          <AlertDescription>
            {t('settings.contactInfo.saveSuccessDesc', 'Le informazioni di contatto sono state aggiornate con successo')}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('settings.contactInfo.errorTitle', 'Errore')}</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  {t('settings.contactInfo.email', 'Email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactInfo.email || ''}
                  onChange={handleInputChange('email')}
                  placeholder="email@esempio.com"
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-xs text-red-500">{validationErrors.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.emailDesc', 'Indirizzo email di contatto pubblico')}
                </p>
              </div>

              {/* Telefono 1 */}
              <div className="space-y-2">
                <Label htmlFor="phone1" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  {t('settings.contactInfo.phone1', 'Telefono principale')}
                </Label>
                <Input
                  id="phone1"
                  type="tel"
                  value={contactInfo.phone1 || ''}
                  onChange={handleInputChange('phone1')}
                  placeholder="+39 123 456 7890"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.phone1Desc', 'Numero di telefono principale per i contatti')}
                </p>
              </div>

              {/* Telefono 2 */}
              <div className="space-y-2">
                <Label htmlFor="phone2" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  {t('settings.contactInfo.phone2', 'Telefono secondario')}
                </Label>
                <Input
                  id="phone2"
                  type="tel"
                  value={contactInfo.phone2 || ''}
                  onChange={handleInputChange('phone2')}
                  placeholder="+39 098 765 4321"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.phone2Desc', 'Numero di telefono secondario (opzionale)')}
                </p>
              </div>

              {/* Sito Web */}
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  {t('settings.contactInfo.website', 'Sito Web')}
                </Label>
                <Input
                  id="website"
                  value={contactInfo.website || ''}
                  onChange={handleInputChange('website')}
                  placeholder="esempio.it o www.esempio.com"
                  className={validationErrors.website ? 'border-red-500' : ''}
                />
                {validationErrors.website && (
                  <p className="text-xs text-red-500">{validationErrors.website}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.websiteDesc', 'Inserisci solo il dominio (esempio.it) o l\'URL completo (https://esempio.it)')}
                </p>
              </div>

              {/* Facebook */}
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center">
                  <Facebook className="h-4 w-4 mr-2" />
                  {t('settings.contactInfo.facebook', 'Facebook')}
                </Label>
                <Input
                  id="facebook"
                  value={contactInfo.facebook || ''}
                  onChange={handleInputChange('facebook')}
                  placeholder="nomepagina o facebook.com/nomepagina"
                  className={validationErrors.facebook ? 'border-red-500' : ''}
                />
                {validationErrors.facebook && (
                  <p className="text-xs text-red-500">{validationErrors.facebook}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.facebookDesc', 'Nome pagina o URL completo di Facebook')}
                </p>
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center">
                  <Instagram className="h-4 w-4 mr-2" />
                  {t('settings.contactInfo.instagram', 'Instagram')}
                </Label>
                <Input
                  id="instagram"
                  value={contactInfo.instagram || ''}
                  onChange={handleInputChange('instagram')}
                  placeholder="nomeutente o instagram.com/nomeutente"
                  className={validationErrors.instagram ? 'border-red-500' : ''}
                />
                {validationErrors.instagram && (
                  <p className="text-xs text-red-500">{validationErrors.instagram}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.instagramDesc', 'Nome utente o URL completo di Instagram')}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('settings.contactInfo.saving', 'Salvataggio in corso...')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('settings.contactInfo.save', 'Salva informazioni di contatto')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}