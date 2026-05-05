import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, Globe, Facebook, Instagram, Check, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ContactInfo, loadContactInfo, saveContactInfo, saveContactInfoToAPI, isValidContactInfo } from '@/lib/contactInfo';
import { apiRequest } from '@/lib/queryClient';

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
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      // USA apiRequest per headers automatici (x-device-type, anti-cache, etc.)
      const response = await apiRequest('GET', '/api/contact-info');
      
      if (response.ok) {
        const data = await response.json();
        console.log('📞 Informazioni contatto caricate:', data);
        setContactInfo(data);
      } else {
        console.log('Nessuna informazione contatto trovata, uso predefinite');
        setContactInfo({});
      }
    } catch (error) {
      console.error('Errore durante il recupero delle informazioni di contatto:', error);
      setContactInfo({});
    }
  };

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
        errors[key] = t(`settings.contactInfo.invalidFormat`, 'Invalid format');
        isValid = false;
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFields()) {
      toast({
        title: t('settings.contactInfo.validationError', 'Validation error'),
        description: t('settings.contactInfo.checkFields', 'Please check the highlighted fields'),
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      console.log('📞 Salvataggio informazioni contatto:', contactInfo);
      
      // USA apiRequest per headers automatici (x-device-type, Content-Type, anti-cache, etc.)
      const response = await apiRequest('POST', '/api/contact-info', contactInfo);

      if (!response.ok) {
        throw new Error('Failed to save contact information');
      }
      
      const result = await response.json();
      console.log('📞 Informazioni contatto salvate:', result);
      
      setSaveSuccess(true);
      toast({
        title: t('settings.contactInfo.saveSuccess', 'Save complete'),
        description: t('settings.contactInfo.saveSuccessDesc', 'Contact information has been updated successfully'),
        variant: "default",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Errore durante il salvataggio delle informazioni di contatto:', error);
      setSaveError(error.message || t('settings.contactInfo.saveError', 'An error occurred while saving'));
      toast({
        title: t('settings.contactInfo.saveErrorTitle', 'Save error'),
        description: error.message || t('settings.contactInfo.saveError', 'An error occurred while saving'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('settings.contactInfo.title', 'Contact information')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.contactInfo.description', 'Enter the contact information that will be displayed in the client app')}
      </p>

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>{t('settings.contactInfo.saveSuccess', 'Save complete')}</AlertTitle>
          <AlertDescription>
            {t('settings.contactInfo.saveSuccessDesc', 'Contact information has been updated successfully')}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('settings.contactInfo.errorTitle', 'Error')}</AlertTitle>
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
                  placeholder={t('i18nFinale.contactInfoEditor.emailPlaceholder')}
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
                  {t('settings.contactInfo.phone1', 'Primary phone')}
                </Label>
                <Input
                  id="phone1"
                  type="tel"
                  value={contactInfo.phone1 || ''}
                  onChange={handleInputChange('phone1')}
                  placeholder="+39 123 456 7890"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.phone1Desc', 'Primary phone number for contacts')}
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
                  {t('settings.contactInfo.phone2Desc', 'Secondary phone number (optional)')}
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
                  placeholder={t('i18nFinale.contactInfoEditor.websiteExamplePlaceholder')}
                  className={validationErrors.website ? 'border-red-500' : ''}
                />
                {validationErrors.website && (
                  <p className="text-xs text-red-500">{validationErrors.website}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.contactInfo.websiteDesc', 'Enter only the domain (example.com) or the full URL (https://example.com)')}
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
                    {t('settings.contactInfo.saving', 'Saving...')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('settings.contactInfo.save', 'Save contact information')}
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