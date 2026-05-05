import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, AlertCircle, Type } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CompanyNameSettings {
  name: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  color: string;
  enabled: boolean;
}

export default function CompanyNameEditor() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<CompanyNameSettings>({
    name: '',
    fontSize: 24,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    color: '#000000',
    enabled: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/company-name-settings');

      if (response.ok) {
        const data = await response.json();
        console.log('🏢 Company name settings loaded:', data);
        setSettings(prev => ({ ...prev, ...data }));
      } else {
        console.log('No company name settings found, using defaults');
      }
    } catch (error) {
      console.error('Error fetching company name settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaveSuccess(false);
    setSaveError(null);

    try {
      console.log('🏢 Saving company name settings:', settings);

      const response = await apiRequest('POST', '/api/company-name-settings', settings);

      if (!response.ok) {
        throw new Error(t('companyNameEditor.saveErrorGeneric'));
      }

      const result = await response.json();
      console.log('🏢 Company name settings saved:', result);

      setSaveSuccess(true);
      toast({
        title: t('companyNameEditor.saveSuccessTitle'),
        description: t('companyNameEditor.saveSuccessDescription'),
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error saving company name settings:', error);
      setSaveError(error.message || t('companyNameEditor.saveErrorGeneric'));
      toast({
        title: t('companyNameEditor.saveErrorTitle'),
        description: error.message || t('companyNameEditor.saveErrorGeneric'),
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, fontSize: value[0] }));
  };

  const handleToggleEnabled = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const previewStyle = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    fontStyle: settings.fontStyle,
    color: settings.color,
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: '16px',
    opacity: settings.enabled ? 1 : 0.5
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            {t('companyNameEditor.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleToggleEnabled}
          >
            {settings.enabled ? t('companyNameEditor.deactivate') : t('companyNameEditor.activate')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('companyNameEditor.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>{t('companyNameEditor.savedTitle')}</AlertTitle>
          <AlertDescription>
            {t('companyNameEditor.savedDescription')}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('companyNameEditor.saveErrorTitle')}</AlertTitle>
          <AlertDescription>
            {saveError}
          </AlertDescription>
        </Alert>
      )}

      <div className={settings.enabled ? "" : "opacity-60"}>
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block text-sm font-medium">{t('companyNameEditor.previewLabel')}</Label>
              <div style={previewStyle}>
                {settings.name ? settings.name :
                  <span className="text-gray-400 italic">{t('companyNameEditor.previewPlaceholder')}</span>
                }
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-sm font-medium">{t('companyNameEditor.nameLabel')}</Label>
              <Input
                id="company-name"
                name="name"
                placeholder={t('companyNameEditor.namePlaceholder')}
                value={settings.name}
                onChange={handleInputChange}
                disabled={!settings.enabled}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">{t('companyNameEditor.fontSizeLabel')}</Label>
                <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
              </div>
              <Slider
                defaultValue={[settings.fontSize]}
                min={12}
                max={48}
                step={1}
                onValueChange={handleSliderChange}
                disabled={!settings.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('companyNameEditor.fontFamilyLabel')}</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => handleSelectChange('fontFamily', value)}
                disabled={!settings.enabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('companyNameEditor.fontFamilyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                  <SelectItem value="Tahoma">Tahoma</SelectItem>
                  <SelectItem value="Palatino Linotype">Palatino Linotype</SelectItem>
                  <SelectItem value="Lucida Sans Unicode">Lucida Sans Unicode</SelectItem>
                  <SelectItem value="Garamond">Garamond</SelectItem>
                  <SelectItem value="Bookman Old Style">Bookman Old Style</SelectItem>
                  <SelectItem value="Century Gothic">Century Gothic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('companyNameEditor.fontStyleLabel')}</Label>
              <Select
                value={settings.fontStyle}
                onValueChange={(value) => handleSelectChange('fontStyle', value)}
                disabled={!settings.enabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('companyNameEditor.fontStylePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t('companyNameEditor.fontStyleNormal')}</SelectItem>
                  <SelectItem value="italic">{t('companyNameEditor.fontStyleItalic')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('companyNameEditor.colorLabel')}</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled={!settings.enabled}
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: settings.color }}
                      />
                      <span>{settings.color}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        '#000000', '#0000FF', '#FF0000', '#008000', '#800080',
                        '#FFA500', '#A52A2A', '#808080', '#4682B4', '#006400',
                        '#8B0000', '#483D8B', '#2F4F4F', '#9932CC', '#FF1493'
                      ].map(color => (
                        <Button
                          key={color}
                          variant="outline"
                          className="w-8 h-8 p-0"
                          style={{ backgroundColor: color }}
                          onClick={() => handleSelectChange('color', color)}
                        />
                      ))}
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="custom-color">{t('companyNameEditor.customColorLabel')}</Label>
                      <Input
                        id="custom-color"
                        name="color"
                        type="color"
                        value={settings.color}
                        onChange={handleInputChange}
                        className="h-10 mt-1"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={saveSettings} className="w-full flex items-center justify-center gap-2" disabled={!settings.enabled}>
                <Check className="h-4 w-4" />
                {t('companyNameEditor.saveButton')}
              </Button>
            </div>
          </div>
      </div>

      <div className="text-xs text-muted-foreground mt-2">
        {t('companyNameEditor.footerNote')}
      </div>
      </CardContent>
    </Card>
  );
}
