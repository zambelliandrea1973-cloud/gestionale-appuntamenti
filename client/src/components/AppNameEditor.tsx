import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Info, Check, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

interface AppNameEditorProps {
  onSuccess?: () => void;
}

interface AppInfo {
  appName: string;
  appShortName: string;
}

export default function AppNameEditor({ onSuccess }: AppNameEditorProps) {
  const { t } = useTranslation();
  const [appInfo, setAppInfo] = useState<AppInfo>({
    appName: t('appNameEditor.defaultAppName'),
    appShortName: t('appNameEditor.defaultAppName')
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AppInfo>({
    appName: '',
    appShortName: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAppInfo();
  }, []);

  useEffect(() => {
    setFormValues({
      appName: appInfo.appName,
      appShortName: appInfo.appShortName
    });
  }, [appInfo]);

  const fetchAppInfo = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/client-app-info');
      if (!response.ok) {
        throw new Error(t('appNameEditor.toast.fetchErrorDesc'));
      }

      const data = await response.json();
      setAppInfo({
        appName: data.appName || t('appNameEditor.defaultAppName'),
        appShortName: data.appShortName || t('appNameEditor.defaultAppName')
      });
    } catch (error) {
      console.error('Failed to fetch app info:', error);
      toast({
        title: t('appNameEditor.toast.errorTitle'),
        description: t('appNameEditor.toast.fetchErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formValues.appName === appInfo.appName &&
        formValues.appShortName === appInfo.appShortName) {
      toast({
        title: t('appNameEditor.toast.noChangesTitle'),
        description: t('appNameEditor.toast.noChangesDesc'),
        variant: 'default',
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const response = await apiRequest('POST', '/api/update-app-info', formValues);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('appNameEditor.toast.saveErrorDesc'));
      }

      setSaveSuccess(true);
      setAppInfo(formValues);

      toast({
        title: t('appNameEditor.toast.savedTitle'),
        description: t('appNameEditor.toast.savedDesc'),
        variant: 'default',
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Failed to save app info:', error);
      setSaveError(error.message || t('appNameEditor.toast.saveErrorDesc'));
      toast({
        title: t('appNameEditor.toast.saveErrorTitle'),
        description: error.message || t('appNameEditor.toast.saveErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('appNameEditor.title')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('appNameEditor.intro')}
      </p>

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>{t('appNameEditor.successTitle')}</AlertTitle>
          <AlertDescription>
            {t('appNameEditor.successDesc')}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('appNameEditor.errorTitle')}</AlertTitle>
          <AlertDescription>
            {saveError}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">{t('appNameEditor.appNameLabel')}</Label>
                <Input
                  id="appName"
                  name="appName"
                  value={formValues.appName}
                  onChange={handleInputChange}
                  placeholder={t('appNameEditor.appNamePlaceholder')}
                  maxLength={30}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('appNameEditor.appNameHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appShortName">{t('appNameEditor.appShortNameLabel')}</Label>
                <Input
                  id="appShortName"
                  name="appShortName"
                  value={formValues.appShortName}
                  onChange={handleInputChange}
                  placeholder={t('appNameEditor.appShortNamePlaceholder')}
                  maxLength={12}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('appNameEditor.appShortNameHint')}
                </p>
              </div>

              <div className="pt-2 flex items-center">
                <Info className="h-4 w-4 text-muted-foreground mr-2" />
                <p className="text-xs text-muted-foreground">
                  {t('appNameEditor.info')}
                </p>
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
                      {t('appNameEditor.savingButton')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('appNameEditor.saveButton')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
