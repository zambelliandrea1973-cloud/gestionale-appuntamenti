import React, { useState, useRef } from 'react';
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
          // Usa l'icona 192x192 come preview
          const iconPath = data.currentIcons.find((icon: any) => icon.sizes === '192x192')?.src;
          if (iconPath) {
            setCurrentIcon(iconPath);
          }
        }
      }
    } catch (error) {
      console.error('Errore caricamento icona corrente:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validazione tipo file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Errore",
        description: "Seleziona solo file immagine (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validazione dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Errore",
        description: "Il file è troppo grande. Dimensione massima: 10MB",
        variant: "destructive",
      });
      return;
    }

    // Crea preview
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
        title: "Errore",
        description: "Seleziona prima un'immagine",
        variant: "destructive",
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
          title: "Successo",
          description: "Icona PWA aggiornata! Le modifiche saranno visibili al prossimo aggiornamento dell'app.",
        });

        // Aggiorna l'icona corrente
        await loadCurrentIcon();
        setPreviewIcon(null);
        
        // Reset input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Notifica parent component
        onIconUpdated?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'upload');
      }
    } catch (error) {
      console.error('Errore upload icona:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento dell'icona",
        variant: "destructive",
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
          title: "Successo",
          description: "Icona predefinita ripristinata! Le modifiche saranno visibili al prossimo aggiornamento dell'app.",
        });

        // Aggiorna l'icona corrente
        await loadCurrentIcon();
        setPreviewIcon(null);
        
        // Reset input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Notifica parent component
        onIconUpdated?.();
      } else {
        throw new Error('Errore durante il ripristino');
      }
    } catch (error) {
      console.error('Errore ripristino icona:', error);
      toast({
        title: "Errore",
        description: "Errore durante il ripristino dell'icona predefinita",
        variant: "destructive",
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
          Personalizza Icona PWA
        </CardTitle>
        <CardDescription>
          Carica un'immagine personalizzata che sarà automaticamente convertita in icone PWA
          per dispositivi mobili. Formati supportati: JPG, PNG, GIF, WebP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Icona Corrente */}
        <div className="space-y-2">
          <Label>Icona Attuale</Label>
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            {currentIcon ? (
              <img 
                src={currentIcon} 
                alt="Icona PWA corrente" 
                className="w-16 h-16 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <Eye className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium">Icona PWA Corrente</p>
              <p className="text-sm text-muted-foreground">
                Questa è l'icona che appare quando gli utenti installano l'app
              </p>
            </div>
          </div>
        </div>

        {/* Upload Nuova Icona */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="icon-upload">Carica Nuova Icona</Label>
            <Input
              id="icon-upload"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {/* Preview */}
          {previewIcon && (
            <div className="space-y-2">
              <Label>Anteprima</Label>
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-blue-50">
                <img 
                  src={previewIcon} 
                  alt="Anteprima nuova icona" 
                  className="w-16 h-16 rounded-lg object-cover border"
                />
                <div className="flex-1">
                  <p className="font-medium">Nuova Icona</p>
                  <p className="text-sm text-muted-foreground">
                    Sarà convertita automaticamente in formati 96x96, 192x192 e 512x512 PNG
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearPreview}
                  disabled={isUploading}
                >
                  Rimuovi
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex gap-3">
          <Button 
            onClick={uploadIcon}
            disabled={!previewIcon || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Caricamento...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Aggiorna Icona PWA
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={restoreDefaultIcon}
            disabled={isUploading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Ripristina Predefinita
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">ℹ️ Informazioni Importanti</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• L'immagine sarà automaticamente ridimensionata in 96x96, 192x192 e 512x512 pixel</li>
            <li>• Usa immagini quadrate per risultati migliori</li>
            <li>• Le modifiche saranno visibili al prossimo aggiornamento/reinstallazione dell'app</li>
            <li>• Formati supportati: JPG, PNG, GIF, WebP (max 10MB)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}