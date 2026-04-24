// @ts-nocheck
import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Download, 
  BookOpen, 
  Settings, 
  Users, 
  Calendar, 
  FileText, 
  Package, 
  TrendingUp, 
  MessageSquare,
  Gift,
  Play,
  Image as ImageIcon,
  Smartphone,
  Edit,
  Save,
  X,
  Upload,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useManualSection } from "@/hooks/use-manual-section";
import { ManualSection } from "@/components/ManualSection";

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

interface EditableSection {
  title: string;
  steps: ManualStep[];
}

// Helper per costruire snapshot della sezione dai contenuti i18n
const buildSectionSnapshot = (
  sectionKey: string,
  t: (key: string) => string
): EditableSection | null => {
  if (sectionKey !== 'section-1-1') return null;
  return {
    title: t('manual.page.fallback.s11.title'),
    steps: [
      {
        stepNumber: 1,
        title: t('manual.page.fallback.s11.step1Title'),
        content: t('manual.page.fallback.s11.step1Content'),
        mediaFiles: []
      },
      {
        stepNumber: 2,
        title: t('manual.page.fallback.s11.step2Title'),
        content: t('manual.page.fallback.s11.step2Content'),
        mediaFiles: []
      },
      {
        stepNumber: 3,
        title: t('manual.page.fallback.s11.step3Title'),
        content: t('manual.page.fallback.s11.step3Content'),
        mediaFiles: []
      }
    ]
  };
};

// Helper per renderizzare blocchi PWA da i18n
const renderPWABlock = (block: any, index: number) => {
  if (block.type === 'text') {
    return <p key={index} className="mb-2">{block.content}</p>;
  }
  
  if (block.type === 'list') {
    return (
      <ol key={index} className="list-decimal list-inside space-y-2 ml-2">
        {block.items.map((item: any, i: number) => (
          <li key={i}>
            <strong>{item.title}:</strong> {item.text}
            {item.items && (
              <ul className="list-disc list-inside ml-6 mt-1">
                {item.items.map((subItem: string, si: number) => (
                  <li key={si}>{subItem}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    );
  }
  
  if (block.type === 'nestedList') {
    return (
      <ul key={index} className="list-disc list-inside space-y-3 ml-2">
        {block.items.map((item: any, i: number) => (
          <li key={i}>
            <strong>{item.title}</strong>
            {item.items && (
              <ul className="list-disc list-inside ml-6 mt-1">
                {item.items.map((subItem: string, si: number) => (
                  <li key={si}>{subItem}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  }
  
  return null;
};

export default function ManualePage() {
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useUserWithLicense();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("getting-started");
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<Record<string, EditableSection>>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  const isAdmin = user?.type === 'admin';
  const locale = i18n.language || 'it';

  // Usa useManualSection hook per tutte le 18 sezioni
  const { data: section11, isLoading: loadingSection11 } = useManualSection('section-1-1', locale);
  const { data: section12, isLoading: loadingSection12 } = useManualSection('section-1-2', locale);
  const { data: section13, isLoading: loadingSection13 } = useManualSection('section-1-3', locale);
  const { data: section14, isLoading: loadingSection14 } = useManualSection('section-1-4', locale);
  const { data: section15, isLoading: loadingSection15 } = useManualSection('section-1-5', locale);
  const { data: section21, isLoading: loadingSection21 } = useManualSection('section-2-1', locale);
  const { data: section22, isLoading: loadingSection22 } = useManualSection('section-2-2', locale);
  const { data: section23, isLoading: loadingSection23 } = useManualSection('section-2-3', locale);
  const { data: section24, isLoading: loadingSection24 } = useManualSection('section-2-4', locale);
  const { data: section31, isLoading: loadingSection31 } = useManualSection('section-3-1', locale);
  const { data: section32, isLoading: loadingSection32 } = useManualSection('section-3-2', locale);
  const { data: section33, isLoading: loadingSection33 } = useManualSection('section-3-3', locale);
  const { data: section34, isLoading: loadingSection34 } = useManualSection('section-3-4', locale);
  const { data: section35, isLoading: loadingSection35 } = useManualSection('section-3-5', locale);
  const { data: section41, isLoading: loadingSection41 } = useManualSection('section-4-1', locale);
  const { data: section42, isLoading: loadingSection42 } = useManualSection('section-4-2', locale);
  const { data: section43, isLoading: loadingSection43 } = useManualSection('section-4-3', locale);
  const { data: section44, isLoading: loadingSection44 } = useManualSection('section-4-4', locale);

  // Mutation per upload file
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // Usa fetch direttamente invece di apiRequest per FormData
      // (apiRequest aggiunge Content-Type: application/json che rompe FormData)
      const response = await fetch('/api/manual/upload', {
        method: 'POST',
        body: formData, // NO JSON.stringify! FormData va mandato diretto
        credentials: 'include',
        // NO Content-Type header! Il browser lo aggiunge automaticamente per FormData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${t('manual.page.toasts.uploadFailedPrefix')}: ${errorText || response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('manual.page.toasts.uploadSuccessTitle'),
        description: data.file.type === 'image'
          ? t('manual.page.toasts.uploadSuccessImage')
          : t('manual.page.toasts.uploadSuccessVideo'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('manual.page.toasts.uploadErrorTitle'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation per salvare contenuto (senza reset automatico)
  const saveContentMutation = useMutation({
    mutationFn: async (data: { section: string; locale: string; title: string; steps: ManualStep[] }) => {
      // Passa l'oggetto diretto, apiRequest fa già JSON.stringify automaticamente!
      const response = await apiRequest('POST', '/api/manual/content', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('manual.page.toasts.saveErrorDefault'));
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: t('manual.page.toasts.saveErrorTitle'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Funzione per iniziare modifica sezione con snapshot
  const startEditingSection = async (sectionKey: string) => {
    try {
      // Prova a caricare il contenuto salvato dal database
      const response = await fetch(`/api/manual/content/${sectionKey}/${i18n.language}`);
      
      let sectionData: EditableSection | null = null;
      
      if (response.ok) {
        // Contenuto salvato esistente - USA QUESTO!
        const saved = await response.json();
        sectionData = {
          title: saved.title,
          steps: saved.steps
        };
        toast({
          title: t('manual.page.toasts.loadedTitle'),
          description: t('manual.page.toasts.loadedDesc'),
        });
      } else if (response.status === 404) {
        // 404 = Nessun contenuto salvato, usa default hardcoded (sicuro)
        sectionData = buildSectionSnapshot(sectionKey, t);
        toast({
          title: t('manual.page.toasts.defaultTitle'),
          description: t('manual.page.toasts.defaultDesc'),
        });
      } else {
        // Altro errore (500, 403, etc) = ABORT edit, non usare default!
        toast({
          title: t('manual.page.toasts.loadErrorTitle'),
          description: t('manual.page.toasts.loadErrorDesc', { status: response.status }),
          variant: "destructive"
        });
        return; // ABORT - non entrare in edit mode!
      }
      
      if (sectionData) {
        setEditableContent(prev => ({
          ...prev,
          [sectionKey]: sectionData
        }));
        setEditingSection(sectionKey);
      }
    } catch (error) {
      // Errore di rete = ABORT edit, non usare default!
      toast({
        title: t('manual.page.toasts.connErrorTitle'),
        description: t('manual.page.toasts.connErrorDesc'),
        variant: "destructive"
      });
      // NON entrare in edit mode, NON usare default hardcoded!
      return;
    }
  };

  const handleFileUpload = async (sectionKey: string, stepIndex: number, file: File) => {
    setUploadingFile(true);
    try {
      const result = await uploadFileMutation.mutateAsync(file);
      
      const updatedContent = { ...editableContent };
      if (!updatedContent[sectionKey]) {
        updatedContent[sectionKey] = { title: '', steps: [] };
      }
      if (!updatedContent[sectionKey].steps[stepIndex]) {
        updatedContent[sectionKey].steps[stepIndex] = {
          stepNumber: stepIndex + 1,
          title: '',
          content: '',
          mediaFiles: []
        };
      }
      if (!updatedContent[sectionKey].steps[stepIndex].mediaFiles) {
        updatedContent[sectionKey].steps[stepIndex].mediaFiles = [];
      }
      
      updatedContent[sectionKey].steps[stepIndex].mediaFiles!.push({
        type: result.file.type,
        url: result.file.url,
        caption: ''
      });
      
      setEditableContent(updatedContent);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveMedia = (sectionKey: string, stepIndex: number, mediaIndex: number) => {
    const updatedContent = { ...editableContent };
    updatedContent[sectionKey]?.steps[stepIndex]?.mediaFiles?.splice(mediaIndex, 1);
    setEditableContent(updatedContent);
  };

  const handleSaveAllSections = async () => {
    const sectionsToSave = Object.keys(editableContent);
    
    if (sectionsToSave.length === 0) {
      toast({
        title: t('manual.page.toasts.noChangesTitle'),
        description: t('manual.page.toasts.noChangesDesc'),
        variant: "destructive"
      });
      return;
    }

    // Valida tutte le sezioni prima di salvare
    for (const sectionKey of sectionsToSave) {
      const section = editableContent[sectionKey];
      if (!section || !section.title) {
        toast({
          title: t('manual.page.toasts.missingTitleTitle'),
          description: t('manual.page.toasts.missingTitleDesc', { section: sectionKey }),
          variant: "destructive"
        });
        return;
      }
    }

    // Batch save con Promise.all
    try {
      const savePromises = sectionsToSave.map(async (sectionKey) => {
        const editedSection = editableContent[sectionKey];
        const originalSnapshot = buildSectionSnapshot(sectionKey, t);
        
        // Merge: preserva step originali non modificati
        const mergedSteps = originalSnapshot 
          ? [...editedSection.steps] 
          : editedSection.steps;
        
        return saveContentMutation.mutateAsync({
          section: sectionKey,
          locale: i18n.language,
          title: editedSection.title,
          steps: mergedSteps
        });
      });
      
      await Promise.all(savePromises);
      
      // Singolo toast success DOPO batch save
      toast({
        title: t('manual.page.toasts.savedTitle'),
        description: sectionsToSave.length === 1
          ? t('manual.page.toasts.savedDescOne', { count: sectionsToSave.length })
          : t('manual.page.toasts.savedDescMany', { count: sectionsToSave.length }),
      });
      
      // Reset state
      setEditMode(false);
      setEditingSection(null);
      setHoveredSection(null);
      setEditableContent({});
      queryClient.invalidateQueries({ queryKey: ['/api/manual/content'] });
      
    } catch (error) {
      // Errore già gestito da mutation.onError
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingSection(null);
    setHoveredSection(null);
    setEditableContent({});
  };

  const updateSectionContent = (sectionKey: string, field: 'title', value: string) => {
    const updatedContent = { ...editableContent };
    if (!updatedContent[sectionKey]) {
      updatedContent[sectionKey] = { title: '', steps: [] };
    }
    updatedContent[sectionKey].title = value;
    setEditableContent(updatedContent);
  };

  const updateStepContent = (sectionKey: string, stepIndex: number, field: 'title' | 'content', value: string) => {
    const updatedContent = { ...editableContent };
    if (!updatedContent[sectionKey]) {
      updatedContent[sectionKey] = { title: '', steps: [] };
    }
    if (!updatedContent[sectionKey].steps[stepIndex]) {
      updatedContent[sectionKey].steps[stepIndex] = {
        stepNumber: stepIndex + 1,
        title: '',
        content: '',
        mediaFiles: []
      };
    }
    updatedContent[sectionKey].steps[stepIndex][field] = value;
    setEditableContent(updatedContent);
  };

  const handleDownloadPDF = async () => {
    toast({
      title: t('manual.page.toasts.pdfPendingTitle'),
      description: t('manual.page.toasts.pdfPendingDesc'),
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 h-8 w-8"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <BookOpen className="mr-3 h-8 w-8" />
                {t('manual.page.header.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('manual.page.header.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF} variant="outline" data-testid="button-download-pdf">
              <Download className="mr-2 h-4 w-4" />
              {t('manual.page.buttons.downloadPdf')}
            </Button>
            {isAdmin && (
              <Button onClick={() => setLocation('/manuale-admin')} variant="default" data-testid="button-edit-manual">
                <Edit className="mr-2 h-4 w-4" />
                {t('manual.page.buttons.editManual')}
              </Button>
            )}
          </div>
        </div>
        {editMode && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm">{t('manual.page.editMode.banner')}</p>
          </div>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-6 h-auto">
          <TabsTrigger value="getting-started" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('manual.page.tabs.gettingStarted')}</span>
          </TabsTrigger>
          <TabsTrigger value="daily-operations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('manual.page.tabs.dailyOps')}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('manual.page.tabs.advanced')}</span>
          </TabsTrigger>
          <TabsTrigger value="client-area" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">{t('manual.page.tabs.clientArea')}</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PRIMI PASSI */}
        <TabsContent value="getting-started">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6" />
                {t('manual.page.cards.gettingStarted.title')}
              </CardTitle>
              <CardDescription>
                {t('manual.page.cards.gettingStarted.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 1.1: Primo Accesso - CON HOVER-TO-EDIT */}
                <div 
                  className={`relative ${editMode ? 'hover:border-2 hover:border-dashed hover:border-blue-500 dark:hover:border-blue-400 rounded-lg transition-all' : ''}`}
                  onMouseEnter={() => editMode && setHoveredSection('section-1-1')}
                  onMouseLeave={() => editMode && setHoveredSection(null)}
                >
                  {hoveredSection === 'section-1-1' && editingSection !== 'section-1-1' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 shadow-md hover:bg-blue-50 dark:hover:bg-blue-900"
                      onClick={() => startEditingSection('section-1-1')}
                      data-testid="button-edit-first-access"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t('manual.page.buttons.editSection')}
                    </Button>
                  )}
                  
                  <AccordionItem value="first-access">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>{t('manual.page.sections.s11')}</span>
                        {user?.type === 'admin' && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            data-testid="button-edit-section-1-1"
                          >
                            <Link href={`/manuale-admin?section=section-1-1&locale=${i18n.language}`}>
                              <Edit className="h-3 w-3 mr-1" />
                              {t('manual.page.buttons.editSection')}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {editingSection === 'section-1-1' ? (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-500 dark:border-blue-400 mb-4">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              {t('manual.page.editMode.editingSection')}
                            </p>
                          </div>

                          <div className="space-y-4 border-2 border-dashed border-blue-300 dark:border-blue-700 p-4 rounded-lg mb-4">
                            <Label className="text-base font-semibold">{t('manual.page.editDialog.sectionTitleLabel')}</Label>
                            <Input
                              value={editableContent['section-1-1']?.title || t('manual.page.sections.s11').replace(/^[\d.]+\s*/, '')}
                              onChange={(e) => updateSectionContent('section-1-1', 'title', e.target.value)}
                              placeholder={t('manual.page.editDialog.sectionTitlePlaceholder')}
                              className="text-base"
                              data-testid="input-section-title"
                            />
                          </div>

                          <div className="space-y-4 border-2 border-dashed border-blue-300 dark:border-blue-700 p-4 rounded-lg">
                            <Label className="text-base font-semibold">{t('manual.page.editDialog.videoTutorialLabel')}</Label>
                            <Textarea
                              value={editableContent['section-1-1']?.steps[0]?.content || ''}
                              onChange={(e) => updateStepContent('section-1-1', 0, 'content', e.target.value)}
                              placeholder={t('manual.page.editDialog.videoTutorialPlaceholder')}
                              className="min-h-[80px]"
                            />
                            
                            <div className="space-y-2">
                              <Label>{t('manual.page.editDialog.uploadLabel')}</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*,video/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload('section-1-1', 0, file);
                                  }}
                                  disabled={uploadingFile}
                                  className="flex-1"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingFile}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {uploadingFile ? t('manual.page.buttons.uploading') : t('manual.page.buttons.upload')}
                                </Button>
                              </div>
                              
                              {editableContent['section-1-1']?.steps[0]?.mediaFiles?.map((media, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                  {media.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  <span className="text-sm flex-1 truncate">{media.url}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMedia('section-1-1', 0, idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4 border-2 border-dashed border-blue-300 dark:border-blue-700 p-4 rounded-lg">
                            <Label className="text-base font-semibold">{t('manual.page.editDialog.procedureLabel')}</Label>
                            <Textarea
                              value={editableContent['section-1-1']?.steps[1]?.content || ''}
                              onChange={(e) => updateStepContent('section-1-1', 1, 'content', e.target.value)}
                              placeholder={t('manual.page.editDialog.procedurePlaceholder')}
                              className="min-h-[150px]"
                            />
                          </div>

                          <div className="space-y-4 border-2 border-dashed border-amber-300 dark:border-amber-700 p-4 rounded-lg">
                            <Label className="text-base font-semibold">{t('manual.page.editDialog.tipLabel')}</Label>
                            <Textarea
                              value={editableContent['section-1-1']?.steps[2]?.content || ''}
                              onChange={(e) => updateStepContent('section-1-1', 2, 'content', e.target.value)}
                              placeholder={t('manual.page.editDialog.tipPlaceholder')}
                              className="min-h-[60px]"
                            />
                          </div>

                          <div className="flex justify-end gap-2 mt-6">
                            <Button
                              variant="default"
                              onClick={() => setEditingSection(null)}
                              data-testid="button-close-section-edit"
                            >
                              <X className="h-4 w-4 mr-2" />
                              {t('manual.page.buttons.close')}
                            </Button>
                          </div>
                          
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                              {t('manual.page.editMode.saveHint')}
                            </p>
                          </div>
                        </>
                      ) : (
                        <ManualSection 
                          steps={section11?.steps || []} 
                          isLoading={loadingSection11} 
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </div>

                {/* Sezione 1.2: Dati Aziendali */}
                <AccordionItem value="company-data">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s12')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-1-2"
                        >
                          <Link href={`/manuale-admin?section=section-1-2&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section12?.steps || []} 
                      isLoading={loadingSection12} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 1.3: Dati Bancari */}
                <AccordionItem value="banking-data">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s13')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-1-3"
                        >
                          <Link href={`/manuale-admin?section=section-1-3&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section13?.steps || []} 
                      isLoading={loadingSection13} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 1.4: Staff e Stanze */}
                <AccordionItem value="staff-rooms">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s14')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-1-4"
                        >
                          <Link href={`/manuale-admin?section=section-1-4&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section14?.steps || []} 
                      isLoading={loadingSection14} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 1.5: Email */}
                <AccordionItem value="email-setup">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s15')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-1-5"
                        >
                          <Link href={`/manuale-admin?section=section-1-5&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section15?.steps || []} 
                      isLoading={loadingSection15} 
                    />
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: OPERAZIONI QUOTIDIANE */}
        <TabsContent value="daily-operations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                {t('manual.page.cards.dailyOps.title')}
              </CardTitle>
              <CardDescription>
                {t('manual.page.cards.dailyOps.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 2.1: Gestione Clienti */}
                <AccordionItem value="manage-clients">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t('manual.page.sections.s21')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-2-1"
                        >
                          <Link href={`/manuale-admin?section=section-2-1&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section21?.steps || []} 
                      isLoading={loadingSection21} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 2.2: Calendario Appuntamenti */}
                <AccordionItem value="calendar">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t('manual.page.sections.s22')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-2-2"
                        >
                          <Link href={`/manuale-admin?section=section-2-2&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section22?.steps || []} 
                      isLoading={loadingSection22} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 2.3: Richieste Appuntamento PWA Cliente - Dynamic i18n */}
                <AccordionItem value="pwa-booking">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        2.3 {t('manual.pwa.title')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-2-3"
                        >
                          <Link href={`/manuale-admin?section=section-2-3&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section23?.steps || []} 
                      isLoading={loadingSection23} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 2.4: Fatture */}
                <AccordionItem value="invoices">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t('manual.page.sections.s24')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-2-4"
                        >
                          <Link href={`/manuale-admin?section=section-2-4&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section24?.steps || []} 
                      isLoading={loadingSection24} 
                    />
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: FUNZIONI AVANZATE */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                {t('manual.page.cards.advanced.title')}
              </CardTitle>
              <CardDescription>
                {t('manual.page.cards.advanced.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 3.1: Inventario/Magazzino */}
                <AccordionItem value="inventory">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {t('manual.page.sections.s31')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-3-1"
                        >
                          <Link href={`/manuale-admin?section=section-3-1&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section31?.steps || []} 
                      isLoading={loadingSection31} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.2: Report */}
                <AccordionItem value="reports">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t('manual.page.sections.s32')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-3-2"
                        >
                          <Link href={`/manuale-admin?section=section-3-2&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section32?.steps || []} 
                      isLoading={loadingSection32} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.3: Marketing Campaigns */}
                <AccordionItem value="marketing">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {t('manual.page.sections.s33')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-3-3"
                        >
                          <Link href={`/manuale-admin?section=section-3-3&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section33?.steps || []} 
                      isLoading={loadingSection33} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.4: WhatsApp Center */}
                <AccordionItem value="whatsapp">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {t('manual.page.sections.s34')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-3-4"
                        >
                          <Link href={`/manuale-admin?section=section-3-4&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section34?.steps || []} 
                      isLoading={loadingSection34} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.5: Referral e Commissioni */}
                <AccordionItem value="referral">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        {t('manual.page.sections.s35')}
                      </div>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-3-5"
                        >
                          <Link href={`/manuale-admin?section=section-3-5&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section35?.steps || []} 
                      isLoading={loadingSection35} 
                    />
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: AREA CLIENTE */}
        <TabsContent value="client-area">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-6 w-6" />
                {t('manual.page.cards.clientArea.title')}
              </CardTitle>
              <CardDescription>
                {t('manual.page.cards.clientArea.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 4.1: Accesso cliente */}
                <AccordionItem value="client-access">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s41')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-4-1"
                        >
                          <Link href={`/manuale-admin?section=section-4-1&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section41?.steps || []} 
                      isLoading={loadingSection41} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 4.2: Cosa vedono i clienti */}
                <AccordionItem value="client-features">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s42')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-4-2"
                        >
                          <Link href={`/manuale-admin?section=section-4-2&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section42?.steps || []} 
                      isLoading={loadingSection42} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 4.3: Installare PWA */}
                <AccordionItem value="install-pwa">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s43')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-4-3"
                        >
                          <Link href={`/manuale-admin?section=section-4-3&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section43?.steps || []} 
                      isLoading={loadingSection43} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 4.4: Personalizzazione area cliente */}
                <AccordionItem value="customize-client-area">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{t('manual.page.sections.s44')}</span>
                      {user?.type === 'admin' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="button-edit-section-4-4"
                        >
                          <Link href={`/manuale-admin?section=section-4-4&locale=${i18n.language}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('manual.page.buttons.editSection')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <ManualSection 
                      steps={section44?.steps || []} 
                      isLoading={loadingSection44} 
                    />
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Footer con suggerimenti */}
      <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <BookOpen className="h-8 w-8 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">{t('manual.page.footer.title')}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {t('manual.page.footer.description')}
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                {((t('manual.page.footer.items', { returnObjects: true }) as string[]) ?? []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
