// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, RotateCcw, Eye, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface IconUploadProps {
  onIconUpdated?: () => void;
}

export default function IconUpload({ onIconUpdated }: IconUploadProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    loadCurrentIcon();
  }, []);

  const loadCurrentIcon = async () => {
    try {
      const response = await apiRequest('GET', '/api/current-icon-info');
      if (response.ok) {
        const data = await response.json();
        if (data.currentIcons && data.currentIcons.length > 0) {
          const iconPath = data.currentIcons.find((icon: any) => icon.sizes === '192x192')?.src;
          if (iconPath) {
            setCurrentIcon(iconPath);
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to load current icon:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('iconUpload.toast.errorTitle'),
        description: t('iconUpload.toast.invalidTypeDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('iconUpload.toast.errorTitle'),
        description: t('iconUpload.toast.fileTooLargeDesc'),
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewIcon(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadIcon = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: t('iconUpload.toast.errorTitle'),
        description: t('iconUpload.toast.noFileDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('icon', file);

      const response = await fetch('/api/upload-custom-icon', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: t('iconUpload.toast.successTitle'),
          description: t('iconUpload.toast.uploadOkDesc'),
        });

        await loadCurrentIcon();
        setPreviewIcon(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        onIconUpdated?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t('iconUpload.toast.uploadErrorDesc'));
      }
    } catch (error: any) {
      console.error('Failed to upload icon:', error);
      toast({
        title: t('iconUpload.toast.errorTitle'),
        description: error.message || t('iconUpload.toast.uploadErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const restoreDefaultIcon = async () => {
    setIsUploading(true);

    try {
      const response = await apiRequest('POST', '/api/restore-default-icon');
      if (response.ok) {
        toast({
          title: t('iconUpload.toast.successTitle'),
          description: t('iconUpload.toast.restoreOkDesc'),
        });

        await loadCurrentIcon();
        setPreviewIcon(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        onIconUpdated?.();
      } else {
        throw new Error(t('iconUpload.toast.restoreErrorDesc'));
      }
    } catch (error: any) {
      console.error('Failed to restore default icon:', error);
      toast({
        title: t('iconUpload.toast.errorTitle'),
        description: t('iconUpload.toast.restoreErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreviewIcon(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('iconUpload.title')}
        </CardTitle>
        <CardDescription>
          {t('iconUpload.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t('iconUpload.currentLabel')}</Label>
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            {currentIcon ? (
              <img
                src={currentIcon}
                alt={t('iconUpload.currentAlt')}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <Eye className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium">{t('iconUpload.currentName')}</p>
              <p className="text-sm text-muted-foreground">
                {t('iconUpload.currentDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="icon-upload">{t('iconUpload.uploadLabel')}</Label>
            <Input
              id="icon-upload"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {previewIcon && (
            <div className="space-y-2">
              <Label>{t('iconUpload.previewLabel')}</Label>
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-blue-50">
                <img
                  src={previewIcon}
                  alt={t('iconUpload.previewAlt')}
                  className="w-16 h-16 rounded-lg object-cover border"
                />
                <div className="flex-1">
                  <p className="font-medium">{t('iconUpload.newIconLabel')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('iconUpload.newIconDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearPreview}
                  disabled={isUploading}
                >
                  {t('iconUpload.removeButton')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={uploadIcon}
            disabled={!previewIcon || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('iconUpload.uploadingButton')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t('iconUpload.uploadButton')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={restoreDefaultIcon}
            disabled={isUploading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('iconUpload.restoreButton')}
          </Button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">{t('iconUpload.info.heading')}</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{t('iconUpload.info.b1')}</li>
            <li>{t('iconUpload.info.b2')}</li>
            <li>{t('iconUpload.info.b3')}</li>
            <li>{t('iconUpload.info.b4')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
