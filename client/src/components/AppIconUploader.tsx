import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Check, AlertCircle, Image as ImageIcon, Undo2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

interface AppIconUploaderProps {
  onSuccess?: () => void;
}

interface IconInfo {
  exists: boolean;
  isCustom?: boolean;
  iconPath?: string;
}

interface DefaultIconInfo {
  url: string;
  name: string;
}

export default function AppIconUploader({ onSuccess }: AppIconUploaderProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [isUsingDefault, setIsUsingDefault] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentIconUrl, setCurrentIconUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [iconInfo, setIconInfo] = useState<IconInfo | null>(null);
  const [defaultIconInfo, setDefaultIconInfo] = useState<DefaultIconInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchIconInfo();
  }, []);

  const fetchIconInfo = async () => {
    setIsLoadingInfo(true);
    try {
      const response = await apiRequest('GET', '/api/client-app-info');
      if (!response.ok) {
        throw new Error(t('appIconUploader.errorTitle'));
      }

      const data = await response.json();
      const iconUrl = data.icon;
      const isDefaultFleurDeVie = iconUrl.startsWith("data:image/jpeg;base64,") && iconUrl.length > 50000;

      setIconInfo({
        exists: true,
        isCustom: !isDefaultFleurDeVie,
        iconPath: iconUrl
      });

      await fetchDefaultIconInfo();
      setCurrentIconUrl(iconUrl);
    } catch (error) {
      console.error('Failed to load icon:', error);
      setCurrentIconUrl(null);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const fetchDefaultIconInfo = async () => {
    try {
      const response = await apiRequest('GET', '/api/default-app-icon');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDefaultIconInfo({
        url: data.icon,
        name: data.name || "Fleur de Vie multicolore"
      });
    } catch (error) {
      console.error('Failed to load default icon:', error);
      setDefaultIconInfo(null);
    }
  };

  const useDefaultIcon = async () => {
    setIsUsingDefault(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const response = await apiRequest('POST', '/api/reset-app-icon');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('appIconUploader.errorTitle'));
      }

      setUploadSuccess(true);
      setPendingFile(null);
      setPendingPreviewUrl(null);

      window.location.reload();

      toast({
        title: t('appIconUploader.toast.successResetTitle'),
        description: t('appIconUploader.toast.successResetDesc'),
        variant: 'default',
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Failed to set default icon:', error);
      setUploadError(error.message || t('appIconUploader.errorTitle'));
      toast({
        title: t('appIconUploader.errorTitle'),
        description: error.message || t('appIconUploader.errorTitle'),
        variant: 'destructive',
      });
    } finally {
      setIsUsingDefault(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t('appIconUploader.toast.fileTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError(t('appIconUploader.toast.invalidFileType'));
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(objectUrl);
  };

  const saveIcon = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const iconData = e.target?.result as string;
          const response = await apiRequest('POST', '/api/upload-app-icon', { iconData });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || t('appIconUploader.errorTitle'));
          }

          setUploadSuccess(true);
          setCurrentIconUrl(iconData);
          setPendingFile(null);
          setPendingPreviewUrl(null);
          setIconInfo(prev => prev ? { ...prev, isCustom: true } : prev);

          try {
            await apiRequest('POST', '/api/sync-pwa-icons');
          } catch (syncError) {
            console.warn('PWA icon sync failed:', syncError);
          }

          toast({
            title: t('appIconUploader.toast.successUploadTitle'),
            description: t('appIconUploader.toast.successUploadDesc'),
            variant: 'default',
          });

          if (onSuccess) {
            onSuccess();
          }
        } catch (error: any) {
          setUploadError(error.message || t('appIconUploader.errorTitle'));
          toast({
            title: t('appIconUploader.errorTitle'),
            description: error.message || t('appIconUploader.errorTitle'),
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(pendingFile);
    } catch (error: any) {
      setUploadError(error.message || t('appIconUploader.errorTitle'));
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const displayUrl = pendingPreviewUrl || currentIconUrl;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {t('appIconUploader.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('appIconUploader.desc')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

      {uploadSuccess && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>{t('appIconUploader.savedTitle')}</AlertTitle>
          <AlertDescription>
            {t('appIconUploader.savedDesc')}
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('appIconUploader.errorTitle')}</AlertTitle>
          <AlertDescription>
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition cursor-pointer"
            onClick={triggerFileInput}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="h-10 w-10 mb-2 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {t('appIconUploader.dropZoneText')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('appIconUploader.dropZoneFormats')}
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={isUploading}
            >
              {t('appIconUploader.selectFileButton')}
            </Button>
          </div>
        </div>

        <div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 bg-muted/20">
                <h4 className="text-sm font-medium mb-2">{t('appIconUploader.previewLabel')}</h4>
                {isLoadingInfo ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-center p-4 bg-background rounded-lg border">
                      {displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={t('appIconUploader.previewAlt')}
                          className="max-w-full max-h-24 object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <ImageIcon className="h-16 w-16 mb-2" />
                          <span className="text-xs">{t('appIconUploader.noIcon')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{t('appIconUploader.clientDevice')}</span>
                        <div className="flex items-center">
                          <span className="flex items-center justify-center w-8 h-8 bg-background rounded-md border mr-1 shadow-sm">
                            {displayUrl ? (
                              <img
                                src={displayUrl}
                                alt={t('appIconUploader.smallIconAlt')}
                                className="max-w-full max-h-6 object-contain"
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                          <span>{t('appIconUploader.clientApp')}</span>
                        </div>
                      </div>

                      {displayUrl && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('appIconUploader.previewHint')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-3">
          {defaultIconInfo ? (
            <img
              src={defaultIconInfo.url}
              alt={t('appIconUploader.defaultIconAlt')}
              className="w-12 h-12 rounded-md object-cover border"
            />
          ) : (
            <div className="w-12 h-12 rounded-md border flex items-center justify-center bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-sm font-medium">
              {t('appIconUploader.defaultIconLabel', { name: defaultIconInfo?.name || 'Fleur de Vie multicolore' })}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t('appIconUploader.defaultIconHint')}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1 shrink-0"
            onClick={useDefaultIcon}
            disabled={isUsingDefault}
          >
            <Undo2 className="h-3 w-3" />
            {isUsingDefault
              ? t('appIconUploader.restoringButton')
              : t('appIconUploader.restoreButton')}
          </Button>
        </div>
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2"
        onClick={() => {
          if (!pendingFile) {
            toast({
              title: t('appIconUploader.toast.noFileTitle'),
              description: t('appIconUploader.toast.noFileDesc'),
              variant: 'destructive',
            });
            return;
          }
          saveIcon();
        }}
        disabled={isUploading}
      >
        <Save className="h-4 w-4" />
        {isUploading
          ? t('appIconUploader.savingButton')
          : t('appIconUploader.saveButton')}
      </Button>
      </CardContent>
    </Card>
  );
}
