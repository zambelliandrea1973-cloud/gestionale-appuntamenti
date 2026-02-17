import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Video,
  Save,
  Edit,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  id: number;
  section: string;
  locale: string;
  title: string;
  steps: ManualStep[];
  createdAt: string;
  updatedAt: string;
}

const SECTIONS = [
  { value: 'intro', label: 'Introduzione' },
  { value: 'getting-started', label: 'Primi Passi' },
  { value: 'appointments', label: 'Gestione Appuntamenti' },
  { value: 'clients', label: 'Gestione Clienti' },
  { value: 'billing', label: 'Fatturazione' },
  { value: 'settings', label: 'Impostazioni' },
  { value: 'advanced', label: 'Funzioni Avanzate' }
];

const LOCALES = [
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'es', label: '🇪🇸 Español' }
];

export default function ManualAdminPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSection, setSelectedSection] = useState('intro');
  const [selectedLocale, setSelectedLocale] = useState('it');
  const [editMode, setEditMode] = useState(false);
  const [showNewStepDialog, setShowNewStepDialog] = useState(false);

  const [sectionTitle, setSectionTitle] = useState('');
  const [steps, setSteps] = useState<ManualStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);

  // Form per nuovo step
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepContent, setNewStepContent] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Carica il contenuto della sezione selezionata
  const { data: sectionContent, isLoading } = useQuery<ManualSection>({
    queryKey: ['/api/manual/content', selectedSection, selectedLocale],
    enabled: !!selectedSection && !!selectedLocale && !editMode,
  });

  useEffect(() => {
    if (sectionContent && !editMode) {
      setSectionTitle(sectionContent.title);
      
      // Parse steps se sono stringhe JSON
      let parsedSteps: ManualStep[];
      if (typeof sectionContent.steps === 'string') {
        try {
          parsedSteps = JSON.parse(sectionContent.steps);
        } catch {
          parsedSteps = [];
        }
      } else {
        parsedSteps = sectionContent.steps || [];
      }
      
      setSteps(parsedSteps);
    }
  }, [sectionContent, editMode]);

  // Mutation per upload file
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
      toast({
        title: "✅ File caricato",
        description: `File ${data.file.type === 'image' ? 'immagine' : 'video'} caricato con successo`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore upload",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation per salvare contenuto
  const saveContentMutation = useMutation({
    mutationFn: async (data: { section: string; locale: string; title: string; steps: ManualStep[] }) => {
      const method = sectionContent ? 'PUT' : 'POST';
      const endpoint = sectionContent 
        ? `/api/manual/content/${sectionContent.id}`
        : '/api/manual/content';

      const response = await apiRequest(method, endpoint, JSON.stringify(data));
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il salvataggio');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Salvato",
        description: "Contenuto salvato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manual/content', selectedSection, selectedLocale] });
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = async (stepIndex: number, file: File) => {
    setUploadingFile(true);
    try {
      const result = await uploadFileMutation.mutateAsync(file);
      
      // Aggiungi il file allo step
      const updatedSteps = [...steps];
      if (!updatedSteps[stepIndex].mediaFiles) {
        updatedSteps[stepIndex].mediaFiles = [];
      }
      
      updatedSteps[stepIndex].mediaFiles!.push({
        type: result.file.type,
        url: result.file.url,
        caption: ''
      });
      
      setSteps(updatedSteps);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveMedia = (stepIndex: number, mediaIndex: number) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex].mediaFiles?.splice(mediaIndex, 1);
    setSteps(updatedSteps);
  };

  const handleAddStep = () => {
    if (!newStepTitle || !newStepContent) {
      toast({
        title: "⚠️ Campi obbligatori",
        description: "Inserisci titolo e contenuto dello step",
        variant: "destructive"
      });
      return;
    }

    const newStep: ManualStep = {
      stepNumber: steps.length + 1,
      title: newStepTitle,
      content: newStepContent,
      mediaFiles: []
    };

    setSteps([...steps, newStep]);
    setNewStepTitle('');
    setNewStepContent('');
    setShowNewStepDialog(false);

    toast({
      title: "✅ Step aggiunto",
      description: "Ricorda di salvare le modifiche",
    });
  };

  const handleRemoveStep = (stepIndex: number) => {
    const updatedSteps = steps.filter((_, index) => index !== stepIndex);
    // Ricalcola step numbers
    updatedSteps.forEach((step, index) => {
      step.stepNumber = index + 1;
    });
    setSteps(updatedSteps);
  };

  const handleSave = () => {
    if (!sectionTitle) {
      toast({
        title: "⚠️ Titolo obbligatorio",
        description: "Inserisci il titolo della sezione",
        variant: "destructive"
      });
      return;
    }

    saveContentMutation.mutate({
      section: selectedSection,
      locale: selectedLocale,
      title: sectionTitle,
      steps
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/impostazioni')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestione Manuale</h1>
            <p className="text-muted-foreground">
              Crea e gestisci le sezioni del manuale con foto e video
            </p>
          </div>
        </div>

        {!editMode && (
          <Button
            onClick={() => setEditMode(true)}
            data-testid="button-edit-mode"
          >
            <Edit className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        )}
      </div>

      {/* Selettori */}
      <Card>
        <CardHeader>
          <CardTitle>Seleziona Sezione e Lingua</CardTitle>
          <CardDescription>
            Scegli quale sezione del manuale modificare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="section">Sezione</Label>
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
                disabled={editMode}
              >
                <SelectTrigger id="section">
                  <SelectValue />
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
              <Label htmlFor="locale">Lingua</Label>
              <Select
                value={selectedLocale}
                onValueChange={setSelectedLocale}
                disabled={editMode}
              >
                <SelectTrigger id="locale">
                  <SelectValue />
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

      {/* Editor */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle>Titolo Sezione</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="Es: Introduzione al Sistema"
              data-testid="input-section-title"
            />
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Steps ({steps.length})
          </h2>
          {editMode && (
            <Button
              onClick={() => setShowNewStepDialog(true)}
              data-testid="button-add-step"
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Step
            </Button>
          )}
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Caricamento...
            </CardContent>
          </Card>
        )}

        {!isLoading && steps.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nessuno step presente. Clicca "Modifica" per iniziare.
            </CardContent>
          </Card>
        )}

        {steps.map((step, stepIndex) => (
          <Card key={stepIndex}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Badge>Step {step.stepNumber}</Badge>
                    {step.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {step.content}
                  </CardDescription>
                </div>
                {editMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStep(stepIndex)}
                    data-testid={`button-remove-step-${stepIndex}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Media Files */}
              {step.mediaFiles && step.mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {step.mediaFiles.map((media, mediaIndex) => (
                    <div key={mediaIndex} className="relative group">
                      {media.type === 'image' ? (
                        <img
                          src={media.url}
                          alt={media.caption || `Media ${mediaIndex + 1}`}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={media.url}
                          controls
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      {editMode && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMedia(stepIndex, mediaIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {media.caption && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {media.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {editMode && (
                <div>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(stepIndex, file);
                      }
                    }}
                    disabled={uploadingFile}
                    className="hidden"
                    id={`file-upload-${stepIndex}`}
                  />
                  <Label
                    htmlFor={`file-upload-${stepIndex}`}
                    className="cursor-pointer"
                  >
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                      {uploadingFile ? (
                        <p className="text-sm text-muted-foreground">
                          Upload in corso...
                        </p>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Clicca per caricare foto o video
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Max 50MB per file
                          </p>
                        </>
                      )}
                    </div>
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      {editMode && (
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saveContentMutation.isPending}
            data-testid="button-save"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveContentMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditMode(false);
              // Ricarica i dati originali
              if (sectionContent) {
                setSectionTitle(sectionContent.title);
                const parsedSteps = typeof sectionContent.steps === 'string' 
                  ? JSON.parse(sectionContent.steps) 
                  : sectionContent.steps;
                setSteps(parsedSteps || []);
              }
            }}
          >
            Annulla
          </Button>
        </div>
      )}

      {/* Dialog Nuovo Step */}
      <Dialog open={showNewStepDialog} onOpenChange={setShowNewStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Step</DialogTitle>
            <DialogDescription>
              Aggiungi un nuovo passaggio alla sezione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="step-title">Titolo Step</Label>
              <Input
                id="step-title"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="Es: Configurazione iniziale"
              />
            </div>
            <div>
              <Label htmlFor="step-content">Contenuto</Label>
              <Textarea
                id="step-content"
                value={newStepContent}
                onChange={(e) => setNewStepContent(e.target.value)}
                placeholder="Descrivi cosa fare in questo passaggio..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewStepDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleAddStep}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
