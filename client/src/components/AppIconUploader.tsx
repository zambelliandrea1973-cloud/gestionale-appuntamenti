import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Check, AlertCircle, Image as ImageIcon, RefreshCw, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface AppIconUploaderProps {
  onSuccess?: () => void;
}

interface IconInfo {
  exists: boolean;
  isCustom?: boolean;
  iconPath?: string;
  lastModified?: string;
}

export default function AppIconUploader({ onSuccess }: AppIconUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUsingDefault, setIsUsingDefault] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [iconInfo, setIconInfo] = useState<IconInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Carica le informazioni sull'icona esistente al mount
  useEffect(() => {
    fetchIconInfo();
  }, []);

  const fetchIconInfo = async () => {
    setIsLoadingInfo(true);
    try {
      const response = await fetch('/api/client-app-info');
      if (!response.ok) {
        throw new Error('Errore nel recupero delle informazioni sull\'icona');
      }

      const data = await response.json();
      
      // Estrai le informazioni sull'icona
      const iconData = data.icon;
      setIconInfo(iconData);

      // Se esiste un'icona, imposta l'URL di anteprima
      if (iconData.exists && iconData.iconPath) {
        // Aggiungi timestamp per evitare la cache del browser
        setPreviewUrl(`${iconData.iconPath}?t=${new Date().getTime()}`);
      } else {
        // Imposta l'icona predefinita se non c'è nessuna icona
        setPreviewUrl('/icons/default-app-icon.jpg');
      }
    } catch (error) {
      console.error('Errore nel recupero delle informazioni sull\'icona:', error);
      // In caso di errore, mostra comunque l'icona predefinita
      setPreviewUrl('/icons/default-app-icon.jpg');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Funzione per notificare il Service Worker dell'aggiornamento dell'icona
  const notifyServiceWorkerIconUpdate = (iconUrl: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_ICON',
        iconUrl: iconUrl
      });
    }
  };

  const useDefaultIcon = async () => {
    setIsUsingDefault(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const response = await fetch('/api/use-default-icon', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante l\'impostazione dell\'icona predefinita');
      }

      setUploadSuccess(true);
      
      // Imposta l'URL dell'anteprima direttamente sull'icona predefinita
      setPreviewUrl(`/icons/default-app-icon.jpg?t=${new Date().getTime()}`);
      
      // Ricarica le informazioni sull'icona per aggiornare la data di modifica
      await fetchIconInfo();
      
      // Notifica il Service Worker dell'aggiornamento dell'icona
      notifyServiceWorkerIconUpdate('/icons/default-app-icon.jpg');
      
      toast({
        title: "Icona predefinita impostata",
        description: "L'icona predefinita è stata impostata con successo e sarà utilizzata per entrambe le app.",
        variant: "default",
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Errore durante l\'impostazione dell\'icona predefinita:', error);
      setUploadError(error.message || 'Si è verificato un errore durante l\'impostazione dell\'icona predefinita.');
      toast({
        title: "Errore",
        description: error.message || 'Si è verificato un errore durante l\'impostazione dell\'icona predefinita.',
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

  const processFile = (file: File) => {
    // Verifica dimensione file (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('L\'immagine selezionata è troppo grande. La dimensione massima è 2MB.');
      return;
    }

    // Verifica il tipo di file
    if (!file.type.startsWith('image/')) {
      setUploadError('Per favore seleziona un file immagine valido.');
      return;
    }

    // Genera l'URL di anteprima
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Carica il file
    uploadFile(file);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('icon', file);

      const response = await fetch('/api/upload-app-icon', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante il caricamento dell\'icona');
      }

      setUploadSuccess(true);
      
      // Ricarica le informazioni sull'icona per aggiornare la data di modifica
      await fetchIconInfo();
      
      // Notifica il Service Worker dell'aggiornamento dell'icona
      notifyServiceWorkerIconUpdate('/icons/app-icon.svg');
      
      toast({
        title: "Icona caricata con successo",
        description: "L'icona dell'app cliente è stata aggiornata.",
        variant: "default",
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Errore durante il caricamento dell\'icona:', error);
      setUploadError(error.message || 'Si è verificato un errore durante il caricamento dell\'icona.');
      toast({
        title: "Errore di caricamento",
        description: error.message || 'Si è verificato un errore durante il caricamento dell\'icona.',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Funzione per formattare la data
  const formatLastModified = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Icona dell'App Cliente</h3>
        {!isLoadingInfo && iconInfo?.exists && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center text-xs"
            onClick={fetchIconInfo}
            disabled={isLoadingInfo}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingInfo ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Carica un'icona personalizzata che verrà usata sia per l'app principale che per l'app cliente. Questa icona sarà visualizzata sulla schermata home di tutti i dispositivi (sia i tuoi che quelli dei clienti).
      </p>

      {!isLoadingInfo && iconInfo?.exists && iconInfo.lastModified && (
        <div className="flex items-center mb-4">
          <Badge variant="outline" className="text-xs font-normal">
            Ultima modifica: {formatLastModified(iconInfo.lastModified)}
          </Badge>
        </div>
      )}

      {uploadSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>Caricamento completato</AlertTitle>
          <AlertDescription>
            L'icona dell'app è stata aggiornata con successo. Questa icona sarà utilizzata sia per l'app principale che per l'app cliente.
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive" className="mb-4">
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
              {isUploading ? 'Caricamento in corso...' : 'Trascina qui l\'immagine o fai clic per selezionarla'}
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
              {isUploading ? 'Caricamento...' : 'Seleziona file'}
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
                      {previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt="App Icon Preview" 
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
                            {previewUrl ? (
                              <img 
                                src={previewUrl} 
                                alt="App Icon Preview Small"
                                className="max-w-full max-h-6 object-contain" 
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                          <span>App Cliente</span>
                        </div>
                      </div>
                      
                      {previewUrl && (
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
          
          {/* Pulsante per usare l'icona predefinita */}
          {!isLoadingInfo && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full flex items-center justify-center gap-2"
              onClick={useDefaultIcon}
              disabled={isUsingDefault || (iconInfo?.exists && !iconInfo?.isCustom)}
            >
              <Undo2 className="h-4 w-4" />
              {isUsingDefault ? 'Impostazione...' : (
                iconInfo?.exists && !iconInfo?.isCustom 
                  ? 'Icona predefinita già in uso'
                  : 'Usa icona predefinita'
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Informazioni sull'icona predefinita */}
      <div className="mt-6 p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-3">
          <img 
            src="/icons/default-app-icon.jpg" 
            alt="Icona predefinita" 
            className="w-12 h-12 rounded-md object-cover border"
          />
          <div>
            <h4 className="text-sm font-medium">Icona predefinita: Fleur de Vie multicolore</h4>
            <p className="text-xs text-muted-foreground">
              Puoi ripristinare questa icona predefinita in qualsiasi momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}