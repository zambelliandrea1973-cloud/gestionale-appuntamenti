import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Upload,
  Video,
  Save,
  Edit,
  X,
  Play,
  Trash2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManualMedia {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

interface ManualStep {
  stepNumber: number;
  title: string;
  content: string;
  mediaFiles?: ManualMedia[];
}

interface ManualSection {
  id: number | null;
  section: string;
  locale: string;
  title: string;
  steps: ManualStep[];
  createdAt?: string;
  updatedAt?: string;
}

const SECTIONS = [
  { value: 'section-1-1', label: '1.1 Primo accesso al sistema' },
  { value: 'section-1-2', label: '1.2 Configurare i Dati Aziendali' },
  { value: 'section-1-3', label: '1.3 Configurare i Dati Bancari' },
  { value: 'section-1-4', label: '1.4 Gestire Staff e Stanze di Trattamento' },
  { value: 'section-1-5', label: '1.5 Configurare le Email Automatiche' },
  { value: 'section-2-1', label: '2.1 Gestione Clienti' },
  { value: 'section-2-2', label: '2.2 Calendario e Appuntamenti' },
  { value: 'section-2-3', label: '2.3 Richieste Appuntamento PWA Cliente' },
  { value: 'section-2-4', label: '2.4 Gestione Fatture' },
  { value: 'section-3-1', label: '3.1 Gestione Inventario e Magazzino' },
  { value: 'section-3-2', label: '3.2 Report e Statistiche' },
  { value: 'section-3-3', label: '3.3 Campagne Marketing con AI' },
  { value: 'section-3-4', label: '3.4 Centro WhatsApp' },
  { value: 'section-3-5', label: '3.5 Sistema Referral e Commissioni' },
  { value: 'section-4-1', label: '4.1 Come i Clienti Accedono alla Loro Area' },
  { value: 'section-4-2', label: '4.2 Cosa Possono Fare i Clienti nell\'Area Riservata' },
  { value: 'section-4-3', label: '4.3 Come Installare l\'App sul Telefono (PWA)' },
  { value: 'section-4-4', label: '4.4 Personalizzare l\'Aspetto dell\'Area Cliente' },
  { value: 'section-5-1', label: '5.1 Impostazioni' },
  { value: 'section-6-1', label: '6.1 Funzioni Avanzate' }
];

const LOCALES = [
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'nl', label: '🇳🇱 Nederlands' },
  { value: 'no', label: '🇳🇴 Norsk' },
  { value: 'ro', label: '🇷🇴 Română' },
  { value: 'ru', label: '🇷🇺 Русский' }
];

export default function ManualAdminPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSection, setSelectedSection] = useState('section-1-1');
  const [selectedLocale, setSelectedLocale] = useState('it');
  const [editMode, setEditMode] = useState(false);

  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionContent, setSectionContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<ManualMedia[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Sincronizza con query params URL (per navigazione da ManualePage)
  useEffect(() => {
    const params = new URLSearchParams(search);
    const section = params.get('section') || 'section-1-1';
    const locale = params.get('locale') || 'it';
    
    setSelectedSection(section);
    setSelectedLocale(locale);
  }, [search]);

  // Reset edit mode quando cambia sezione o lingua
  useEffect(() => {
    setEditMode(false);
  }, [selectedSection, selectedLocale]);

  // Carica il contenuto della sezione selezionata
  const { data: manualData, isLoading } = useQuery<ManualSection>({
    queryKey: ['/api/manual/content', selectedSection, selectedLocale],
    queryFn: async () => {
      const response = await fetch(`/api/manual/content/${selectedSection}/${selectedLocale}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Errore durante il caricamento del contenuto');
      }
      return response.json();
    },
    enabled: !!selectedSection && !!selectedLocale,
  });

  useEffect(() => {
    if (manualData && !editMode) {
      setSectionTitle(manualData.title);
      
      // Parse steps
      let parsedSteps: ManualStep[];
      if (typeof manualData.steps === 'string') {
        try {
          parsedSteps = JSON.parse(manualData.steps);
        } catch {
          parsedSteps = [];
        }
      } else {
        parsedSteps = manualData.steps || [];
      }
      
      // Estrai contenuto e media dal primo step
      if (parsedSteps.length > 0) {
        setSectionContent(parsedSteps[0].content || '');
        setMediaFiles(parsedSteps[0].mediaFiles || []);
      } else {
        setSectionContent('');
        setMediaFiles([]);
      }
    }
  }, [manualData, selectedSection, selectedLocale, editMode]);

  // Mutation per upload file (video o immagine)
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiRequest('POST', '/api/manual/upload', formData);
      if (!response.ok) {
        throw new Error('Errore durante l\'upload del file');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Aggiungi il nuovo file alla lista locale (NON salvare ancora!)
      const newMedia: ManualMedia = {
        type: data.file.type,
        url: data.file.url,
        caption: ''
      };
      
      setMediaFiles(prev => [...prev, newMedia]);
      
      const fileType = data.file.type === 'video' ? 'Video' : 'Immagine';
      toast({
        title: `✅ ${fileType} caricato`,
        description: `${fileType} aggiunto. Clicca "Salva" per confermare.`,
      });
      
      setUploadingFile(false);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore upload",
        description: error.message,
        variant: "destructive"
      });
      setUploadingFile(false);
    }
  });

  // Mutation per salvare contenuto
  const saveContentMutation = useMutation({
    mutationFn: async (data: { section: string; locale: string; title: string; content: string; mediaFiles: ManualMedia[] }) => {
      const method = manualData?.id ? 'PUT' : 'POST';
      const endpoint = manualData?.id
        ? `/api/manual/content/${manualData.id}`
        : '/api/manual/content';

      // Crea un singolo step con contenuto e tutti i media
      const steps: ManualStep[] = [{
        stepNumber: 1,
        title: data.title,
        content: data.content,
        mediaFiles: data.mediaFiles
      }];

      const response = await apiRequest(method, endpoint, {
        section: data.section,
        locale: data.locale,
        title: data.title,
        steps: steps
      });

      if (!response.ok) {
        throw new Error('Errore durante il salvataggio');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Salvato",
        description: "Contenuto salvato con successo",
      });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['/api/manual/content', selectedSection, selectedLocale] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({
        title: "Errore",
        description: "Seleziona solo immagini o video",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      toast({
        title: "Errore",
        description: "Il file deve essere massimo 1GB",
        variant: "destructive"
      });
      return;
    }

    setUploadingFile(true);
    uploadFileMutation.mutate(file);
  };

  const handleSave = () => {
    if (!sectionTitle.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un titolo per la sezione",
        variant: "destructive"
      });
      return;
    }

    saveContentMutation.mutate({
      section: selectedSection,
      locale: selectedLocale,
      title: sectionTitle,
      content: sectionContent,
      mediaFiles: mediaFiles
    });
  };

  const handleDeleteMedia = async (index: number) => {
    const mediaToDelete = mediaFiles[index];
    
    try {
      // Elimina il file dal server
      const response = await apiRequest('DELETE', '/api/manual/file', {
        fileUrl: mediaToDelete.url
      });
      
      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione del file dal server');
      }
      
      // Solo se l'eliminazione server-side ha successo, rimuovi dallo stato
      setMediaFiles(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: "✅ File rimosso",
        description: "Il file è stato eliminato dal server. Ricorda di salvare le modifiche.",
      });
    } catch (error) {
      toast({
        title: "❌ Errore eliminazione",
        description: error instanceof Error ? error.message : "Impossibile eliminare il file",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/manuale')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Amministrazione Manuale</h1>
            <p className="text-sm text-muted-foreground">
              Gestisci contenuti e video tutorial per ogni sezione
            </p>
          </div>
        </div>
        {!editMode ? (
          <Button
            onClick={() => setEditMode(true)}
            data-testid="button-edit-mode"
          >
            <Edit className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saveContentMutation.isPending}
              data-testid="button-save"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveContentMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditMode(false);
                // Reset ai dati originali
                if (manualData) {
                  setSectionTitle(manualData.title);
                  let parsedSteps: ManualStep[];
                  if (typeof manualData.steps === 'string') {
                    parsedSteps = JSON.parse(manualData.steps);
                  } else {
                    parsedSteps = manualData.steps || [];
                  }
                  if (parsedSteps.length > 0) {
                    setSectionContent(parsedSteps[0].content || '');
                    setMediaFiles(parsedSteps[0].mediaFiles || []);
                  }
                }
              }}
              data-testid="button-cancel"
            >
              Annulla
            </Button>
          </div>
        )}
      </div>

      {/* Selettori Sezione e Lingua */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleziona Sezione e Lingua</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sezione del Manuale</Label>
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  console.log('📝 Sezione selezionata:', value);
                  setSelectedSection(value);
                  setEditMode(false);
                }}
              >
                <SelectTrigger data-testid="select-section">
                  <SelectValue>
                    {SECTIONS.find(s => s.value === selectedSection)?.label || "Seleziona una sezione..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lingua</Label>
              <Select
                value={selectedLocale}
                onValueChange={(value) => {
                  setSelectedLocale(value);
                  setEditMode(false);
                }}
              >
                <SelectTrigger data-testid="select-locale">
                  <SelectValue>
                    {LOCALES.find(l => l.value === selectedLocale)?.label || "Seleziona lingua..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((locale) => (
                    <SelectItem key={locale.value} value={locale.value}>
                      {locale.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor Contenuto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline">{SECTIONS.find(s => s.value === selectedSection)?.label}</Badge>
            {editMode ? (
              <Input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Titolo sezione..."
                className="ml-4"
              />
            ) : (
              <span>{sectionTitle || 'Nessun titolo'}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Testo di spiegazione */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Spiegazione Testuale</Label>
            {editMode ? (
              <Textarea
                value={sectionContent}
                onChange={(e) => setSectionContent(e.target.value)}
                placeholder="Inserisci la spiegazione testuale per questa sezione..."
                rows={6}
                className="font-mono text-sm"
              />
            ) : (
              <div className="p-4 bg-muted rounded-lg min-h-[100px]">
                <p className="whitespace-pre-wrap">
                  {sectionContent || <span className="text-muted-foreground italic">Nessun contenuto disponibile</span>}
                </p>
              </div>
            )}
          </div>

          {/* Media di Supporto (Video e Immagini) */}
          <div>
            <Label className="text-base font-semibold mb-2 block flex items-center gap-2">
              <Video className="h-5 w-5" />
              Media di Supporto (Video e Immagini)
            </Label>
            
            {/* Galleria Media Esistenti */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="relative border rounded-lg overflow-hidden group">
                    {media.type === 'video' ? (
                      <div className="relative aspect-video bg-black">
                        <video
                          src={media.url}
                          controls
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={media.url}
                          alt={media.caption || 'Immagine manuale'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    {editMode && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleDeleteMedia(index)}
                        data-testid={`button-delete-media-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="p-3 bg-white/95 space-y-2">
                      <div className="text-xs font-medium text-center text-muted-foreground">
                        {media.type === 'video' ? '📹 Video' : '🖼️ Immagine'} #{index + 1}
                      </div>
                      {editMode ? (
                        <Input
                          value={media.caption || ''}
                          onChange={(e) => {
                            const newMediaFiles = [...mediaFiles];
                            newMediaFiles[index] = { ...media, caption: e.target.value };
                            setMediaFiles(newMediaFiles);
                          }}
                          placeholder="Didascalia..."
                          className="text-xs"
                          data-testid={`input-caption-${index}`}
                        />
                      ) : (
                        media.caption && (
                          <p className="text-xs text-center text-gray-600 italic">
                            {media.caption}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pulsante Upload (solo in edit mode) */}
            {editMode && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">
                      Carica video o immagini
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Immagini: JPG, PNG, GIF, WEBP<br/>
                      Video: MP4, WEBM, MOV (max 1GB)
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileSelect}
                    disabled={uploadingFile}
                    style={{ display: 'none' }}
                  />
                  
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    data-testid="button-upload-media"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingFile ? 'Caricamento...' : 'Aggiungi File'}
                  </Button>
                  
                  {uploadingFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4 animate-pulse" />
                      <span>Upload in corso...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messaggio quando non ci sono media */}
            {!editMode && mediaFiles.length === 0 && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground italic">Nessun media disponibile</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
