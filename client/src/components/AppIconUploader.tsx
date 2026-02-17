import React, { useState, useRef, useEffect } from 'react';
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
        throw new Error('Errore nel recupero delle informazioni sull\'icona');
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
      console.error('Errore durante il caricamento dell\'icona:', error);
      setCurrentIconUrl(null);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const fetchDefaultIconInfo = async () => {
    try {
      const response = await apiRequest('GET', '/api/default-app-icon');
      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDefaultIconInfo({
        url: data.icon,
        name: data.name || "Fleur de Vie multicolore"
      });
    } catch (error) {
      console.error('Errore durante il caricamento dell\'icona predefinita:', error);
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
        throw new Error(data.message || 'Errore durante l\'impostazione dell\'icona predefinita');
      }

      setUploadSuccess(true);
      setPendingFile(null);
      setPendingPreviewUrl(null);
      
      window.location.reload();
      
      toast({
        title: "Icona predefinita impostata",
        description: "L'icona predefinita è stata ripristinata con successo.",
        variant: "default",
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Errore durante l\'impostazione dell\'icona predefinita:', error);
      setUploadError(error.message || 'Si è verificato un errore.');
      toast({
        title: "Errore",
        description: error.message || 'Si è verificato un errore.',
        variant: "destructive",
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
      setUploadError('L\'immagine selezionata è troppo grande. La dimensione massima è 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Per favore seleziona un file immagine valido.');
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
            throw new Error(data.message || 'Errore durante il caricamento dell\'icona');
          }

          setUploadSuccess(true);
          setCurrentIconUrl(iconData);
          setPendingFile(null);
          setPendingPreviewUrl(null);
          setIconInfo(prev => prev ? { ...prev, isCustom: true } : prev);

          try {
            await apiRequest('POST', '/api/sync-pwa-icons');
          } catch (syncError) {
            console.warn('Errore sincronizzazione PWA:', syncError);
          }

          toast({
            title: "Icona salvata",
            description: "L'icona dell'app è stata aggiornata e sincronizzata per i clienti.",
            variant: "default",
          });

          if (onSuccess) {
            onSuccess();
          }
        } catch (error: any) {
          setUploadError(error.message || 'Si è verificato un errore durante il salvataggio.');
          toast({
            title: "Errore",
            description: error.message || 'Si è verificato un errore.',
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.readAsDataURL(pendingFile);
    } catch (error: any) {
      setUploadError(error.message || 'Si è verificato un errore.');
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
          Icona dell'App Cliente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Carica un'icona personalizzata che verrà usata sia per l'app principale che per l'app cliente. Questa icona sarà visualizzata sulla schermata home di tutti i dispositivi (sia i tuoi che quelli dei clienti).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

      {uploadSuccess && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Salvato</AlertTitle>
          <AlertDescription>
            L'icona dell'app è stata aggiornata con successo.
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
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
              Trascina qui l'immagine o fai clic per selezionarla
            </p>
            <p className="text-xs text-muted-foreground">
              SVG, PNG o JPG (max. 2MB)
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
              Seleziona file
            </Button>
          </div>
        </div>

        <div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 bg-muted/20">
                <h4 className="text-sm font-medium mb-2">Anteprima</h4>
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
                          alt="Anteprima icona" 
                          className="max-w-full max-h-24 object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <ImageIcon className="h-16 w-16 mb-2" />
                          <span className="text-xs">Nessuna icona</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Dispositivo cliente:</span>
                        <div className="flex items-center">
                          <span className="flex items-center justify-center w-8 h-8 bg-background rounded-md border mr-1 shadow-sm">
                            {displayUrl ? (
                              <img 
                                src={displayUrl} 
                                alt="Icona piccola"
                                className="max-w-full max-h-6 object-contain" 
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                          <span>App Cliente</span>
                        </div>
                      </div>
                      
                      {displayUrl && (
                        <p className="text-xs text-muted-foreground mt-2">
                          L'icona verrà visualizzata sulla home screen dei dispositivi quando i clienti installeranno l'app.
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
              alt="Icona predefinita" 
              className="w-12 h-12 rounded-md object-cover border"
            />
          ) : (
            <div className="w-12 h-12 rounded-md border flex items-center justify-center bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-sm font-medium">
              Icona predefinita: {defaultIconInfo?.name || "Fleur de Vie multicolore"}
            </h4>
            <p className="text-xs text-muted-foreground">
              Puoi ripristinare questa icona predefinita in qualsiasi momento.
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
            {isUsingDefault ? 'Ripristino...' : 'Ripristina l\'icona predefinita'}
          </Button>
        </div>
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2"
        onClick={() => {
          if (!pendingFile) {
            toast({
              title: "Nessun file selezionato",
              description: "Seleziona prima un'immagine da caricare.",
              variant: "destructive",
            });
            return;
          }
          saveIcon();
        }}
        disabled={isUploading}
      >
        <Save className="h-4 w-4" />
        {isUploading ? 'Salvataggio in corso...' : 'Salva icona'}
      </Button>
      </CardContent>
    </Card>
  );
}