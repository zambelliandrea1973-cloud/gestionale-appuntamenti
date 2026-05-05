import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

interface ColorSettings {
  primaryColor: string;
  secondaryColor: string;
}

export default function ColorEditor() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ColorSettings>({
    primaryColor: '#3f51b5',
    secondaryColor: '#ffffff'
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carica le impostazioni attuali dei colori
  useEffect(() => {
    loadColorSettings();
  }, []);

  const loadColorSettings = async () => {
    try {
      // USA apiRequest per headers automatici (x-device-type, anti-cache, etc.)
      const response = await apiRequest('GET', '/api/client-app-info');
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎨 COLORI CARICATI:', data.primaryColor, data.secondaryColor);
        setSettings({
          primaryColor: data.primaryColor || '#3f51b5',
          secondaryColor: data.secondaryColor || '#ffffff'
        });
      }
    } catch (error) {
      console.error('Errore caricamento colori:', error);
    }
  };

  const saveSettings = async () => {
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // USA apiRequest per headers automatici (x-device-type, Content-Type, anti-cache, etc.)
      const response = await apiRequest('POST', '/api/color-settings-v2', {
        primaryColor: settings.primaryColor
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ COLORE SALVATO SEPARATAMENTE: "${settings.primaryColor}" per utente ${result.userId}`);
        setSaveSuccess(true);
        
        // 🔄 REFRESH DELLA PAGINA per mostrare immediatamente il nuovo colore
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        toast({
          title: t('i18nFinale.colorEditor.colorSavedTitle'),
          description: t('i18nFinale.colorEditor.savedDescription'),
          variant: "default",
        });
      } else {
        const errorText = await response.text();
        console.error('Errore risposta server:', errorText);
        throw new Error(t('colorEditor.saveError', 'Failed to save color settings ({{status}})', { status: response.status }));
      }
    } catch (error: any) {
      setSaveError(error.message || t('common.error'));
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">{t('i18nFinale.colorEditor.primaryColorLabel')}</Label>
          <div className="flex gap-2">
            <Input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={settings.primaryColor}
              onChange={handleInputChange}
              className="w-20"
            />
            <Input
              name="primaryColor"
              value={settings.primaryColor}
              onChange={handleInputChange}
              placeholder="#3f51b5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor">{t('i18nFinale.colorEditor.secondaryColorLabel')}</Label>
          <div className="flex gap-2">
            <Input
              id="secondaryColor"
              name="secondaryColor"
              type="color"
              value={settings.secondaryColor}
              onChange={handleInputChange}
              className="w-20"
            />
            <Input
              name="secondaryColor"
              value={settings.secondaryColor}
              onChange={handleInputChange}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {/* PULSANTE SPECIFICO - STESSO SISTEMA DEL NOME AZIENDALE */}
      <div className="pt-4 border-t">
        <Button 
          onClick={saveSettings} 
          className="w-full"
        >
          💾 {t('i18nFinale.colorEditor.saveColors')}
        </Button>
        
        {saveSuccess && (
          <div className="mt-2 text-sm text-green-600">
            ✅ {t('i18nFinale.colorEditor.savedSuccessText')}
          </div>
        )}
        
        {saveError && (
          <div className="mt-2 text-sm text-red-600">
            ❌ {saveError}
          </div>
        )}
      </div>
    </div>
  );
}