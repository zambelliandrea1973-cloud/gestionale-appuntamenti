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

// Registry centralizzato con tutto il contenuto hardcoded
const manualSections: Record<string, EditableSection> = {
  'first-access-section': {
    title: 'Primo Accesso al Sistema',
    steps: [
      {
        stepNumber: 1,
        title: 'Video Tutorial',
        content: 'Video Tutorial: Come accedere per la prima volta',
        mediaFiles: []
      },
      {
        stepNumber: 2,
        title: 'Procedura di Accesso',
        content: `1. Apri il browser e vai all'indirizzo fornito dal tuo amministratore
2. Inserisci le credenziali di accesso (username e password)
3. Al primo accesso, ti verrà mostrato questo manuale automaticamente
4. Puoi accedere nuovamente al manuale in qualsiasi momento dal menu Impostazioni`,
        mediaFiles: []
      },
      {
        stepNumber: 3,
        title: 'Suggerimento',
        content: '💡 Suggerimento: Aggiungi il sito ai preferiti del browser per un accesso rapido!',
        mediaFiles: []
      }
    ]
  }
};

// Helper per ottenere snapshot della sezione con deep clone
const getSectionSnapshot = (sectionKey: string): EditableSection | null => {
  const original = manualSections[sectionKey];
  if (!original) return null;
  // Deep clone per evitare mutazioni accidentali
  return JSON.parse(JSON.stringify(original));
};

export default function ManualePage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
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

  // Query per caricare contenuto salvato della sezione "first-access"
  const { data: savedFirstAccessContent } = useQuery<EditableSection | null>({
    queryKey: ['/api/manual/content', 'first-access-section', 'it'],
    queryFn: async () => {
      const response = await fetch('/api/manual/content/first-access-section/it');
      if (response.status === 404) {
        return null; // Nessun contenuto salvato, usa default
      }
      if (!response.ok) {
        throw new Error('Errore caricamento contenuto');
      }
      const data = await response.json();
      return {
        title: data.title,
        steps: data.steps
      };
    },
    staleTime: 0, // Sempre ricarica per avere dati freschi
  });

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
        throw new Error(`Upload fallito: ${errorText || response.statusText}`);
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

  // Mutation per salvare contenuto (senza reset automatico)
  const saveContentMutation = useMutation({
    mutationFn: async (data: { section: string; locale: string; title: string; steps: ManualStep[] }) => {
      // Passa l'oggetto diretto, apiRequest fa già JSON.stringify automaticamente!
      const response = await apiRequest('POST', '/api/manual/content', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il salvataggio');
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Funzione per iniziare modifica sezione con snapshot
  const startEditingSection = async (sectionKey: string) => {
    try {
      // Prova a caricare il contenuto salvato dal database
      const response = await fetch(`/api/manual/content/${sectionKey}/it`);
      
      let sectionData: EditableSection | null = null;
      
      if (response.ok) {
        // Contenuto salvato esistente - USA QUESTO!
        const saved = await response.json();
        sectionData = {
          title: saved.title,
          steps: saved.steps
        };
        toast({
          title: "📖 Contenuto caricato",
          description: "Modifiche precedenti caricate dal database",
        });
      } else if (response.status === 404) {
        // 404 = Nessun contenuto salvato, usa default hardcoded (sicuro)
        sectionData = getSectionSnapshot(sectionKey);
        toast({
          title: "📝 Contenuto di default",
          description: "Modifica il contenuto predefinito",
        });
      } else {
        // Altro errore (500, 403, etc) = ABORT edit, non usare default!
        toast({
          title: "❌ Errore caricamento",
          description: `Impossibile caricare il contenuto (${response.status}). Riprova più tardi.`,
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
        title: "❌ Errore di connessione",
        description: "Impossibile caricare il contenuto. Verifica la connessione e riprova.",
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
        title: "⚠️ Nessuna modifica",
        description: "Non ci sono modifiche da salvare",
        variant: "destructive"
      });
      return;
    }

    // Valida tutte le sezioni prima di salvare
    for (const sectionKey of sectionsToSave) {
      const section = editableContent[sectionKey];
      if (!section || !section.title) {
        toast({
          title: "⚠️ Titolo obbligatorio",
          description: `Inserisci il titolo della sezione "${sectionKey}"`,
          variant: "destructive"
        });
        return;
      }
    }

    // Batch save con Promise.all
    try {
      const savePromises = sectionsToSave.map(async (sectionKey) => {
        const editedSection = editableContent[sectionKey];
        const originalSnapshot = getSectionSnapshot(sectionKey);
        
        // Merge: preserva step originali non modificati
        const mergedSteps = originalSnapshot 
          ? [...editedSection.steps] 
          : editedSection.steps;
        
        return saveContentMutation.mutateAsync({
          section: sectionKey,
          locale: 'it',
          title: editedSection.title,
          steps: mergedSteps
        });
      });
      
      await Promise.all(savePromises);
      
      // Singolo toast success DOPO batch save
      toast({
        title: "✅ Salvato",
        description: `${sectionsToSave.length} ${sectionsToSave.length === 1 ? 'sezione salvata' : 'sezioni salvate'} con successo`,
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
      title: "Funzionalità in sviluppo",
      description: "L'export PDF sarà disponibile a breve. Per ora consulta il manuale online.",
    });
    return;
    
    // PDF export verrà implementato in un secondo momento
    // quando risolviamo le dipendenze di pdfmake
    /* try {
      const docDefinition: any = {
        content: [
          { text: 'Manuale d\'Uso - Gestionale Appuntamenti', style: 'header', margin: [0, 0, 0, 20] },
          { text: 'Guida completa all\'utilizzo del gestionale per la tua pratica medica', style: 'subheader', margin: [0, 0, 0, 30] },
          
          { text: 'PRIMI PASSI', style: 'sectionHeader', pageBreak: 'before' },
          
          { text: '1.1 Primo Accesso al Sistema', style: 'subsectionHeader' },
          { text: 'Procedura di accesso:', bold: true, margin: [0, 10, 0, 5] },
          { ul: [
            'Apri il browser e vai all\'indirizzo fornito dal tuo amministratore',
            'Inserisci le credenziali di accesso (username e password)',
            'Al primo accesso, ti verrà mostrato un tour guidato automaticamente',
            'Puoi accedere nuovamente al manuale in qualsiasi momento dal menu'
          ], margin: [0, 0, 0, 15] },
          
          { text: '1.2 Configurare i Dati Aziendali', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Impostazioni', margin: [0, 5, 0, 5] },
          { text: 'Tab Generali:', bold: true, margin: [0, 10, 0, 5] },
          { ul: ['Nome Azienda', 'Servizi Offerti', 'Valuta di riferimento'], margin: [0, 0, 0, 10] },
          { text: 'Tab Contatti:', bold: true, margin: [0, 10, 0, 5] },
          { ul: ['Email', 'Telefono', 'Indirizzo', 'Sito Web', 'Social Media'], margin: [0, 0, 0, 10] },
          { text: 'Tab Aspetto:', bold: true, margin: [0, 10, 0, 5] },
          { ul: ['Logo/Icona', 'Colori brand', 'Tema chiaro o scuro'], margin: [0, 0, 0, 15] },
          
          { text: '1.3 Configurare i Dati Bancari', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Banking Settings', margin: [0, 5, 0, 5] },
          { ul: ['Nome Banca', 'IBAN', 'BIC/SWIFT', 'Intestatario conto'], margin: [0, 0, 0, 15] },
          
          { text: 'OPERAZIONI QUOTIDIANE', style: 'sectionHeader', pageBreak: 'before' },
          
          { text: '2.1 Gestione Clienti', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Clienti', margin: [0, 5, 0, 5] },
          { text: 'Aggiungere un nuovo cliente:', bold: true, margin: [0, 10, 0, 5] },
          { ol: [
            'Clicca su "+ Nuovo Cliente"',
            'Compila dati anagrafici (nome, email, telefono, codice fiscale)',
            'Salva il cliente',
            'Il sistema genera un QR code univoco per l\'accesso cliente'
          ], margin: [0, 0, 0, 15] },
          
          { text: '2.2 Calendario e Appuntamenti', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Calendario', margin: [0, 5, 0, 5] },
          { text: 'Creare un appuntamento:', bold: true, margin: [0, 10, 0, 5] },
          { ol: [
            'Clicca su uno slot orario vuoto',
            'Seleziona il cliente',
            'Scegli il servizio',
            'Seleziona la stanza (opzionale)',
            'Conferma l\'appuntamento'
          ], margin: [0, 0, 0, 10] },
          { text: 'Il cliente riceverà automaticamente una conferma via email.', italics: true, margin: [0, 0, 0, 15] },
          
          { text: '2.3 Gestione Fatture', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Fatture', margin: [0, 5, 0, 5] },
          { text: 'Creare una fattura:', bold: true, margin: [0, 10, 0, 5] },
          { ol: [
            'Clicca su "+ Nuova Fattura"',
            'Seleziona il cliente',
            'Aggiungi servizi con quantità e prezzi',
            'Il sistema calcola automaticamente totale e IVA',
            'Invia via Email, WhatsApp o stampa'
          ], margin: [0, 0, 0, 15] },
          
          { text: 'FUNZIONI AVANZATE', style: 'sectionHeader', pageBreak: 'before' },
          
          { text: '3.1 Gestione Inventario', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Inventario', margin: [0, 5, 0, 5] },
          { ul: [
            'Aggiungi prodotti con nome, categoria, prezzo e foto',
            'Gestisci categorie con colori identificativi',
            'Monitora scorte e ricevi alert automatici',
            'Traccia movimenti di carico e scarico'
          ], margin: [0, 0, 0, 15] },
          
          { text: '3.2 Report e Statistiche', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Report', margin: [0, 5, 0, 5] },
          { text: 'Report disponibili:', bold: true, margin: [0, 10, 0, 5] },
          { ul: [
            'Report Finanziario (fatturato, incassi, crediti)',
            'Report Appuntamenti (statistiche prenotazioni)',
            'Report Clienti (nuovi, attivi, inattivi)',
            'Report Servizi (servizi più richiesti)',
            'Report Inventario (valore magazzino)'
          ], margin: [0, 0, 0, 15] },
          
          { text: '3.3 Campagne Marketing con AI', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Marketing Campaigns', margin: [0, 5, 0, 5] },
          { ul: [
            'Crea campagne promozionali con AI Assistant',
            'Invia via Email e/o WhatsApp',
            'Genera link promozionali pubblici con media incorporati',
            'Monitora aperture, click e conversioni',
            'Traccia ROI delle campagne'
          ], margin: [0, 0, 0, 15] },
          
          { text: '3.4 Sistema Referral e Commissioni', style: 'subsectionHeader' },
          { text: 'Percorso: Menu principale → Referral', margin: [0, 5, 0, 5] },
          { ul: [
            '25% di commissione su ogni abbonamento venduto',
            'Pagamento una tantum per piani annuali',
            'Pagamento ricorrente mensile per piani mensili',
            'Condividi il tuo link personale unico',
            'Monitora click, conversioni e commissioni maturate'
          ], margin: [0, 0, 0, 15] },
          
          { text: 'AREA CLIENTE PWA', style: 'sectionHeader', pageBreak: 'before' },
          
          { text: '4.1 Accesso Cliente', style: 'subsectionHeader' },
          { text: 'I clienti accedono tramite:', bold: true, margin: [0, 10, 0, 5] },
          { ul: [
            'QR Code personale (scansione con smartphone)',
            'Link diretto inviato via email/WhatsApp'
          ], margin: [0, 0, 0, 15] },
          
          { text: '4.2 Funzionalità Area Cliente', style: 'subsectionHeader' },
          { text: 'Cosa possono fare i clienti:', bold: true, margin: [0, 10, 0, 5] },
          { ul: [
            'Visualizzare appuntamenti passati e futuri',
            'Scaricare fatture in PDF',
            'Consultare documenti medici',
            'Vedere dati personali e contatti della pratica'
          ], margin: [0, 0, 0, 15] },
          
          { text: '4.3 Installare PWA su Smartphone', style: 'subsectionHeader' },
          { text: 'iPhone (Safari):', bold: true, margin: [0, 10, 0, 5] },
          { ol: [
            'Apri l\'area cliente',
            'Tocca "Condividi" (quadrato con freccia)',
            'Seleziona "Aggiungi a Home"',
            'L\'icona apparirà sulla home screen'
          ], margin: [0, 0, 0, 10] },
          { text: 'Android (Chrome):', bold: true, margin: [0, 10, 0, 5] },
          { ol: [
            'Apri l\'area cliente',
            'Tocca menu (tre puntini)',
            'Seleziona "Aggiungi a schermata Home"',
            'L\'app sarà disponibile come le altre app'
          ], margin: [0, 0, 0, 20] },
          
          { text: 'SUPPORTO', style: 'sectionHeader', margin: [0, 30, 0, 10] },
          { text: 'Per assistenza:', margin: [0, 0, 0, 5] },
          { ul: [
            'Consulta questo manuale completo dal menu Impostazioni',
            'Guarda i video tutorial incorporati in ogni sezione',
            'Contatta il supporto tecnico via email'
          ], margin: [0, 0, 0, 10] },
          
          { text: `Documento generato il ${new Date().toLocaleDateString('it-IT')}`, 
            style: 'footer', 
            margin: [0, 30, 0, 0] 
          }
        ],
        styles: {
          header: { fontSize: 24, bold: true, color: '#2563eb' },
          subheader: { fontSize: 14, italics: true, color: '#64748b' },
          sectionHeader: { fontSize: 18, bold: true, color: '#1e40af', margin: [0, 20, 0, 10] },
          subsectionHeader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5] },
          footer: { fontSize: 10, italics: true, color: '#94a3b8', alignment: 'center' }
        },
        defaultStyle: { fontSize: 11, lineHeight: 1.3 }
      };
      
      // pdfMake.createPdf(docDefinition).download('Manuale_Gestionale_Appuntamenti.pdf');
      
      toast({
        title: "PDF pronto",
        description: "Il manuale è stato scaricato con successo!",
      });
    } catch (error) {
      console.error('Errore generazione PDF:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il PDF. Riprova.",
        variant: "destructive",
      });
    } */
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
                Manuale d'Uso
              </h1>
              <p className="text-muted-foreground mt-1">
                Guida completa all'utilizzo del gestionale per la tua pratica medica
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <Button onClick={handleDownloadPDF} variant="outline" data-testid="button-download-pdf">
                <Download className="mr-2 h-4 w-4" />
                Scarica PDF
              </Button>
            )}
            {isAdmin && !editMode && (
              <Button onClick={() => setEditMode(true)} variant="default" data-testid="button-edit-mode">
                <Edit className="mr-2 h-4 w-4" />
                Modifica
              </Button>
            )}
            {isAdmin && editMode && (
              <>
                <Button onClick={handleCancelEdit} variant="outline" data-testid="button-cancel-edit">
                  <X className="mr-2 h-4 w-4" />
                  Annulla
                </Button>
                <Button 
                  onClick={handleSaveAllSections} 
                  variant="default" 
                  disabled={saveContentMutation.isPending}
                  data-testid="button-save-edit"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveContentMutation.isPending ? 'Salvataggio...' : 'Salva'}
                </Button>
              </>
            )}
          </div>
        </div>
        {editMode && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm">
              <strong>✏️ Modalità Modifica:</strong> Stai modificando il contenuto del manuale. Le modifiche verranno salvate quando clicchi su "Salva".
            </p>
          </div>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-6 h-auto">
          <TabsTrigger value="getting-started" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Primi Passi</span>
          </TabsTrigger>
          <TabsTrigger value="daily-operations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Operazioni Quotidiane</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Funzioni Avanzate</span>
          </TabsTrigger>
          <TabsTrigger value="client-area" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Area Cliente</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PRIMI PASSI */}
        <TabsContent value="getting-started">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Configurazione Iniziale
              </CardTitle>
              <CardDescription>
                Imposta i dati aziendali e configura il sistema per la tua pratica medica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 1.1: Primo Accesso - CON HOVER-TO-EDIT */}
                <div 
                  className={`relative ${editMode ? 'hover:border-2 hover:border-dashed hover:border-blue-500 dark:hover:border-blue-400 rounded-lg transition-all' : ''}`}
                  onMouseEnter={() => editMode && setHoveredSection('first-access-section')}
                  onMouseLeave={() => editMode && setHoveredSection(null)}
                >
                  {hoveredSection === 'first-access-section' && editingSection !== 'first-access-section' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 shadow-md hover:bg-blue-50 dark:hover:bg-blue-900"
                      onClick={() => startEditingSection('first-access-section')}
                      data-testid="button-edit-first-access"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>
                  )}
                  
                  <AccordionItem value="first-access">
                    <AccordionTrigger className="text-lg font-semibold">
                      1.1 Primo Accesso al Sistema
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {editingSection === 'first-access-section' ? (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-500 dark:border-blue-400 mb-4">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              ✏️ Stai modificando questa sezione. Clicca "Fatto" quando hai finito.
                            </p>
                          </div>

                          <div className="space-y-4 border-2 border-dashed border-blue-300 dark:border-blue-700 p-4 rounded-lg mb-4">
                            <Label className="text-base font-semibold">Titolo Sezione *</Label>
                            <Input
                              value={editableContent['first-access-section']?.title || 'Primo Accesso al Sistema'}
                              onChange={(e) => updateSectionContent('first-access-section', 'title', e.target.value)}
                              placeholder="Inserisci il titolo della sezione"
                              className="text-base"
                              data-testid="input-section-title"
                            />
                          </div>

                          <div className="space-y-4 border-2 border-dashed border-blue-300 dark:border-blue-700 p-4 rounded-lg">
                            <Label className="text-base font-semibold">Video Tutorial</Label>
                            <Textarea
                              value={editableContent['first-access-section']?.steps[0]?.content || 'Video Tutorial: Come accedere per la prima volta'}
                              onChange={(e) => updateStepContent('first-access-section', 0, 'content', e.target.value)}
                              placeholder="Descrizione o link del video tutorial"
                              className="min-h-[80px]"
                            />
                            
                            <div className="space-y-2">
                              <Label>Upload Video/Immagine</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*,video/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload('first-access-section', 0, file);
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
                                  {uploadingFile ? 'Caricamento...' : 'Carica'}
                                </Button>
                              </div>
                              
                              {editableContent['first-access-section']?.steps[0]?.mediaFiles?.map((media, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                  {media.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  <span className="text-sm flex-1 truncate">{media.url}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMedia('first-access-section', 0, idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4 border-2 border-dashed border-blue-300 dark:border-blue-700 p-4 rounded-lg">
                            <Label className="text-base font-semibold">Procedura di Accesso</Label>
                            <Textarea
                              value={editableContent['first-access-section']?.steps[1]?.content || `1. Apri il browser e vai all'indirizzo fornito dal tuo amministratore
2. Inserisci le credenziali di accesso (username e password)
3. Al primo accesso, ti verrà mostrato questo manuale automaticamente
4. Puoi accedere nuovamente al manuale in qualsiasi momento dal menu Impostazioni`}
                              onChange={(e) => updateStepContent('first-access-section', 1, 'content', e.target.value)}
                              placeholder="Inserisci i passi della procedura (uno per riga)"
                              className="min-h-[150px]"
                            />
                          </div>

                          <div className="space-y-4 border-2 border-dashed border-amber-300 dark:border-amber-700 p-4 rounded-lg">
                            <Label className="text-base font-semibold">Suggerimento</Label>
                            <Textarea
                              value={editableContent['first-access-section']?.steps[2]?.content || '💡 Suggerimento: Aggiungi il sito ai preferiti del browser per un accesso rapido!'}
                              onChange={(e) => updateStepContent('first-access-section', 2, 'content', e.target.value)}
                              placeholder="Inserisci un suggerimento utile"
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
                              Chiudi
                            </Button>
                          </div>
                          
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                              ℹ️ Le modifiche verranno salvate quando clicchi <strong>"Salva"</strong> in alto a destra
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Usa contenuto salvato se esiste, altrimenti default */}
                          {(() => {
                            const content = savedFirstAccessContent || manualSections['first-access-section'];
                            const step1 = content?.steps[0];
                            const step2 = content?.steps[1];
                            const step3 = content?.steps[2];
                            
                            return (
                              <>
                                {/* Step 1: Video Tutorial */}
                                {step1 && (
                                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <Play className="h-4 w-4" />
                                      {step1.title}
                                    </h4>
                                    
                                    {/* Mostra immagini/video caricati */}
                                    {step1.mediaFiles && step1.mediaFiles.length > 0 ? (
                                      <div className="space-y-2">
                                        {step1.mediaFiles.map((media, idx) => (
                                          <div key={idx}>
                                            {media.type === 'image' ? (
                                              <img 
                                                src={media.url} 
                                                alt={media.caption || `Media ${idx + 1}`}
                                                className="w-full rounded"
                                              />
                                            ) : (
                                              <video 
                                                src={media.url} 
                                                controls 
                                                className="w-full rounded"
                                              />
                                            )}
                                            {media.caption && (
                                              <p className="text-sm text-muted-foreground mt-1">{media.caption}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                                        {step1.content}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Step 2: Procedura */}
                                {step2 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold">{step2.title}</h4>
                                    <div className="whitespace-pre-wrap text-sm">{step2.content}</div>
                                    {step2.mediaFiles && step2.mediaFiles.map((media, idx) => (
                                      <div key={idx}>
                                        {media.type === 'image' ? (
                                          <img src={media.url} alt={media.caption || ''} className="w-full rounded mt-2" />
                                        ) : (
                                          <video src={media.url} controls className="w-full rounded mt-2" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Step 3: Suggerimento */}
                                {step3 && (
                                  <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm">
                                      <strong>{step3.title}:</strong> {step3.content}
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </div>

                {/* Sezione 1.2: Dati Aziendali */}
                <AccordionItem value="company-data">
                  <AccordionTrigger className="text-lg font-semibold">
                    1.2 Configurare i Dati Aziendali
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Screenshot di riferimento
                      </h4>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Screenshot: Pagina Impostazioni → Tab Generali]
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Impostazioni</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Tab: Generali</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Nome Azienda:</strong> Inserisci il nome della tua pratica medica</li>
                            <li><strong>Servizi Offerti:</strong> Configura i trattamenti e servizi che offri (es. "Visita Generale", "Ecografia", "Analisi")</li>
                            <li><strong>Valuta:</strong> Seleziona la valuta di riferimento (EUR, USD, CHF, ecc.)</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Tab: Contatti</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Email:</strong> Email di contatto per i clienti</li>
                            <li><strong>Telefono:</strong> Numero di telefono principale e secondario</li>
                            <li><strong>Indirizzo:</strong> Indirizzo fisico della pratica</li>
                            <li><strong>Sito Web:</strong> URL del tuo sito (opzionale)</li>
                            <li><strong>Social Media:</strong> Link Instagram, Facebook, LinkedIn (opzionali)</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Tab: Aspetto</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Logo/Icona:</strong> Carica il logo della tua pratica (apparirà nell'app cliente)</li>
                            <li><strong>Colori:</strong> Personalizza colore primario e secondario del brand</li>
                            <li><strong>Tema:</strong> Scegli tra tema chiaro o scuro</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm">
                        <strong>✅ Importante:</strong> Questi dati appariranno nelle fatture e nell'app cliente, assicurati che siano corretti e completi!
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 1.3: Dati Bancari */}
                <AccordionItem value="banking-data">
                  <AccordionTrigger className="text-lg font-semibold">
                    1.3 Configurare i Dati Bancari
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Banking Settings</h4>
                      
                      <p>I dati bancari sono necessari per ricevere pagamenti e appariranno sulle fatture:</p>
                      
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Nome Banca:</strong> Il nome del tuo istituto bancario</li>
                        <li><strong>IBAN:</strong> Codice IBAN del conto corrente</li>
                        <li><strong>BIC/SWIFT:</strong> Codice internazionale della banca (per bonifici esteri)</li>
                        <li><strong>Intestatario:</strong> Nome dell'intestatario del conto</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Video Tutorial
                      </h4>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Spazio per video: "Come configurare i dati bancari"]
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm">
                        <strong>🔒 Sicurezza:</strong> Tutti i dati bancari sono memorizzati in modo sicuro e visibili solo a te e ai tuoi clienti nelle fatture.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 1.4: Staff e Stanze */}
                <AccordionItem value="staff-rooms">
                  <AccordionTrigger className="text-lg font-semibold">
                    1.4 Gestire Staff e Stanze di Trattamento
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Impostazioni → Tab "Staff & Stanze"</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Gestione Collaboratori</Badge>
                          <p className="mb-2">Aggiungi i membri del tuo team medico:</p>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca su "Aggiungi Collaboratore"</li>
                            <li>Inserisci nome, email e ruolo del collaboratore</li>
                            <li>Configura i permessi di accesso (opzionale)</li>
                            <li>Invia l'invito via email</li>
                          </ol>
                          <p className="mt-2 text-sm text-muted-foreground">
                            I collaboratori potranno gestire i propri appuntamenti e accedere alle funzionalità assegnate.
                          </p>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Stanze di Trattamento</Badge>
                          <p className="mb-2">Configura le sale disponibili nella tua struttura:</p>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca su "Aggiungi Stanza"</li>
                            <li>Inserisci il nome della stanza (es. "Sala 1", "Studio Ecografia")</li>
                            <li>Associa la stanza ai servizi specifici (opzionale)</li>
                          </ol>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Le stanze ti aiutano a organizzare gli appuntamenti e evitare sovrapposizioni.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Screenshot: Gestione Staff e Stanze]
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 1.5: Email */}
                <AccordionItem value="email-setup">
                  <AccordionTrigger className="text-lg font-semibold">
                    1.5 Configurare le Email Automatiche
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Impostazioni → Tab "Email"</h4>
                      
                      <p>Configura l'invio automatico di email per notifiche e promemoria:</p>
                      
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Server SMTP:</strong> Indirizzo del server email (es. smtp.gmail.com)</li>
                        <li><strong>Porta:</strong> Di solito 587 o 465</li>
                        <li><strong>Username:</strong> Il tuo indirizzo email</li>
                        <li><strong>Password:</strong> Password dell'account email (usa password applicazione per Gmail)</li>
                        <li><strong>Email mittente:</strong> L'indirizzo che apparirà come mittente</li>
                      </ul>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold mb-2">Cosa verranno inviate le email:</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                        <li>Conferme di appuntamenti</li>
                        <li>Promemoria automatici prima degli appuntamenti</li>
                        <li>Invio fatture ai clienti</li>
                        <li>Campagne di marketing personalizzate</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Video Tutorial
                      </h4>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Spazio per video: "Configurare Gmail per email automatiche"]
                      </div>
                    </div>
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
                Gestione Quotidiana
              </CardTitle>
              <CardDescription>
                Le operazioni giornaliere per gestire clienti, appuntamenti e fatture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 2.1: Gestione Clienti */}
                <AccordionItem value="manage-clients">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      2.1 Gestione Clienti
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Clienti</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Aggiungere un nuovo cliente</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca sul pulsante "+ Nuovo Cliente"</li>
                            <li>Compila i dati anagrafici:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Nome e Cognome</li>
                                <li>Codice Fiscale</li>
                                <li>Email e Telefono</li>
                                <li>Data di nascita</li>
                                <li>Indirizzo (opzionale)</li>
                              </ul>
                            </li>
                            <li>Salva il nuovo cliente</li>
                            <li>Il sistema genera automaticamente un <strong>codice QR univoco</strong> per l'accesso del cliente</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Modificare un cliente esistente</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Cerca il cliente dalla lista (usa la barra di ricerca)</li>
                            <li>Clicca sull'icona "Modifica" (matita)</li>
                            <li>Aggiorna i dati necessari</li>
                            <li>Salva le modifiche</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">QR Code per accesso cliente</Badge>
                          <p className="mb-2">Ogni cliente ha un QR code univoco per accedere alla sua area riservata:</p>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Apri la scheda del cliente</li>
                            <li>Clicca su "Visualizza QR Code"</li>
                            <li>Il cliente può scansionare il codice con lo smartphone per accedere alla sua area personale</li>
                            <li>Oppure puoi stampare il QR code e consegnarlo al cliente</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Come aggiungere e gestire i clienti"]
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm">
                        <strong>💡 Pro Tip:</strong> Il QR code permette al cliente di accedere ai propri appuntamenti, fatture e documenti medici senza dover ricordare password!
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 2.2: Calendario Appuntamenti */}
                <AccordionItem value="calendar">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      2.2 Calendario e Appuntamenti
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Calendario</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Creare un nuovo appuntamento</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca su uno slot orario vuoto nel calendario</li>
                            <li>Seleziona il cliente (o creane uno nuovo)</li>
                            <li>Scegli il servizio da erogare</li>
                            <li>Seleziona la stanza (se configurata)</li>
                            <li>Aggiungi note interne (opzionale)</li>
                            <li>Conferma l'appuntamento</li>
                          </ol>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Il cliente riceverà automaticamente una email di conferma (se configurata).
                          </p>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Visualizzazioni disponibili</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Vista Giorno:</strong> Mostra gli appuntamenti di una singola giornata</li>
                            <li><strong>Vista Settimana:</strong> Panoramica settimanale con tutti gli slot</li>
                            <li><strong>Vista Mese:</strong> Calendario mensile con conteggio appuntamenti</li>
                            <li><strong>Vista Lista:</strong> Elenco cronologico di tutti gli appuntamenti</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Gestire gli appuntamenti</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Modifica:</strong> Clicca sull'appuntamento per modificare data, ora o servizio</li>
                            <li><strong>Sposta:</strong> Trascina l'appuntamento su un nuovo slot</li>
                            <li><strong>Cancella:</strong> Elimina l'appuntamento (il cliente riceverà notifica)</li>
                            <li><strong>Completa:</strong> Segna come completato al termine della visita</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Promemoria automatici</Badge>
                          <p className="mb-2">Il sistema può inviare promemoria automatici ai clienti:</p>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>24 ore prima dell'appuntamento</li>
                            <li>1 ora prima dell'appuntamento</li>
                            <li>Tramite Email e/o WhatsApp (se configurati)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Come gestire il calendario appuntamenti"]
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 2.3: Fatture */}
                <AccordionItem value="invoices">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      2.3 Gestione Fatture
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Fatture</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Creare una nuova fattura</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca su "+ Nuova Fattura"</li>
                            <li>Seleziona il cliente</li>
                            <li>Aggiungi i servizi erogati (con quantità e prezzi)</li>
                            <li>Il sistema calcola automaticamente:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Subtotale</li>
                                <li>IVA (se applicabile)</li>
                                <li>Totale nella valuta selezionata</li>
                              </ul>
                            </li>
                            <li>Aggiungi note o termini di pagamento (opzionale)</li>
                            <li>Salva la fattura</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Inviare la fattura al cliente</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Dalla lista fatture, clicca sull'icona "Invia"</li>
                            <li>Scegli il metodo di invio:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Email (PDF allegato)</li>
                                <li>WhatsApp (link di download)</li>
                                <li>Stampa diretta</li>
                              </ul>
                            </li>
                            <li>La fattura verrà anche resa disponibile nell'area cliente</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Stati della fattura</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong className="text-yellow-600">Bozza:</strong> Fattura non ancora inviata</li>
                            <li><strong className="text-blue-600">Inviata:</strong> Fattura inviata ma non pagata</li>
                            <li><strong className="text-green-600">Pagata:</strong> Pagamento ricevuto</li>
                            <li><strong className="text-red-600">Scaduta:</strong> Fattura non pagata oltre la scadenza</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Dati visualizzati nella fattura</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Dati aziendali e logo (dalle Impostazioni)</li>
                            <li>Dati cliente</li>
                            <li>Numero progressivo fattura</li>
                            <li>Data emissione e scadenza</li>
                            <li>Dettaglio servizi con prezzi nella valuta selezionata</li>
                            <li>Dati bancari per il pagamento</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Screenshot: Esempio fattura generata]
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm">
                        <strong>💡 Suggerimento:</strong> Puoi creare una fattura direttamente da un appuntamento completato per risparmiare tempo!
                      </p>
                    </div>
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
                Funzioni Avanzate
              </CardTitle>
              <CardDescription>
                Strumenti avanzati per marketing, inventario, report e referral
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 3.1: Inventario/Magazzino */}
                <AccordionItem value="inventory">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      3.1 Gestione Inventario e Magazzino
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Inventario</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Aggiungere prodotti al magazzino</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca su "+ Nuovo Prodotto"</li>
                            <li>Inserisci i dettagli del prodotto:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Nome del prodotto</li>
                                <li>Categoria (creane di nuove se necessario)</li>
                                <li>Codice prodotto/SKU</li>
                                <li>Prezzo di acquisto e vendita</li>
                                <li>Quantità disponibile</li>
                                <li>Fornitore</li>
                                <li>Note</li>
                              </ul>
                            </li>
                            <li>Carica una foto del prodotto (opzionale ma consigliato)</li>
                            <li>Salva il prodotto</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Gestire le categorie prodotti</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Vai alla sezione "Categorie"</li>
                            <li>Crea categorie logiche (es. "Farmaci", "Dispositivi", "Materiale Sanitario")</li>
                            <li>Assegna colori diversi per identificare rapidamente le categorie</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Monitorare le scorte</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Visualizza a colpo d'occhio i prodotti in esaurimento</li>
                            <li>Ricevi alert automatici quando le scorte scendono sotto la soglia minima</li>
                            <li>Traccia movimenti di carico e scarico</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Modificare immagini prodotti</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Apri la scheda del prodotto</li>
                            <li>Clicca sull'immagine attuale (o sull'area "Aggiungi immagine")</li>
                            <li>Carica una nuova foto dal tuo dispositivo</li>
                            <li>L'immagine verrà ridimensionata automaticamente</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Gestione completa inventario con immagini prodotti"]
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.2: Report */}
                <AccordionItem value="reports">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      3.2 Report e Statistiche
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Report</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Tipi di report disponibili</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Report Finanziario:</strong> Fatturato, incassi, crediti in sospeso</li>
                            <li><strong>Report Appuntamenti:</strong> Statistiche su prenotazioni, cancellazioni, no-show</li>
                            <li><strong>Report Clienti:</strong> Nuovi clienti, clienti attivi, clienti inattivi</li>
                            <li><strong>Report Servizi:</strong> Servizi più richiesti, redditività per servizio</li>
                            <li><strong>Report Inventario:</strong> Valore magazzino, rotazione prodotti</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Filtrare i dati</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Seleziona periodo temporale (oggi, settimana, mese, anno, personalizzato)</li>
                            <li>Filtra per collaboratore</li>
                            <li>Filtra per servizio o categoria</li>
                            <li>Visualizza la valuta selezionata nelle impostazioni</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Esportare i report</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Scarica report in formato PDF</li>
                            <li>Esporta dati in Excel/CSV per analisi approfondite</li>
                            <li>Stampa report direttamente dal browser</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Screenshot: Dashboard report con grafici]
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.3: Marketing Campaigns */}
                <AccordionItem value="marketing">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      3.3 Campagne Marketing con AI
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Marketing Campaigns</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Creare una campagna</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Clicca su "+ Nuova Campagna"</li>
                            <li>Inserisci:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Nome della campagna</li>
                                <li>Tipo di campagna (Promozionale, Informativa, Evento)</li>
                                <li>Oggetto e messaggio personalizzato</li>
                              </ul>
                            </li>
                            <li>Usa l'<strong>AI Assistant</strong> per generare testi accattivanti automaticamente</li>
                            <li>Seleziona i destinatari (tutti i clienti, solo attivi, segmento personalizzato)</li>
                            <li>Scegli il canale di invio: Email, WhatsApp o entrambi</li>
                            <li>Programma l'invio (immediato o schedulato)</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Funzionalità AI</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Generazione testi:</strong> L'AI crea messaggi persuasivi basati sul tipo di campagna</li>
                            <li><strong>Personalizzazione:</strong> Inserisce automaticamente nome cliente e dettagli personalizzati</li>
                            <li><strong>Ottimizzazione orari:</strong> Suggerisce gli orari migliori per l'invio</li>
                            <li><strong>A/B Testing:</strong> Testa diverse versioni del messaggio</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Link promozionali pubblici</Badge>
                          <p className="mb-2">Ogni campagna genera un link unico pubblico con:</p>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Pagina web dedicata con il messaggio della campagna</li>
                            <li>Media allegati (immagini, video) incorporati</li>
                            <li>Pulsante di contatto diretto</li>
                            <li>Tracking automatico delle visualizzazioni</li>
                          </ul>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Ideale per superare i limiti di WhatsApp sugli allegati!
                          </p>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Monitorare i risultati</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Tasso di apertura email</li>
                            <li>Click sui link</li>
                            <li>Conversioni (appuntamenti prenotati dalla campagna)</li>
                            <li>ROI della campagna</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Creare campagne marketing con AI"]
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm">
                        <strong>🚀 Pro Feature:</strong> Le campagne marketing automatizzate possono aumentare il tasso di ritorno dei clienti fino al 40%!
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.4: WhatsApp Center */}
                <AccordionItem value="whatsapp">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      3.4 Centro WhatsApp
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → WhatsApp Center</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Configurazione iniziale</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Vai al WhatsApp Center</li>
                            <li>Scansiona il QR code con WhatsApp Web dal tuo telefono</li>
                            <li>Autorizza la connessione</li>
                            <li>Il sistema sarà collegato al tuo numero WhatsApp Business</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Funzionalità disponibili</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Invio messaggi automatici:</strong> Promemoria appuntamenti, conferme</li>
                            <li><strong>Messaggi di massa:</strong> Invia campagne a liste di clienti</li>
                            <li><strong>Template messaggi:</strong> Crea modelli predefiniti per risposte rapide</li>
                            <li><strong>Allegati:</strong> Invia documenti, fatture, immagini</li>
                            <li><strong>Tracking:</strong> Monitora messaggi letti e consegnati</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Best practices</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Chiedi sempre il consenso prima di inviare messaggi promozionali</li>
                            <li>Personalizza i messaggi con il nome del cliente</li>
                            <li>Evita di inviare troppi messaggi (rischio blocco WhatsApp)</li>
                            <li>Usa orari appropriati (9:00-20:00)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Configurare e usare WhatsApp Business"]
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm">
                        <strong>⚠️ Attenzione:</strong> Mantieni sempre il telefono connesso a internet per garantire l'invio dei messaggi automatici.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 3.5: Referral e Commissioni */}
                <AccordionItem value="referral">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      3.5 Sistema Referral e Commissioni
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Percorso: Menu principale → Referral</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Come funziona il programma referral</Badge>
                          <p className="mb-2">Guadagna commissioni invitando nuovi utenti:</p>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>25% di commissione</strong> su ogni abbonamento venduto</li>
                            <li><strong>Pagamento una tantum</strong> per piani annuali</li>
                            <li><strong>Pagamento ricorrente</strong> per piani mensili (ogni mese)</li>
                            <li>Commissioni visualizzate nella valuta selezionata</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Il tuo link referral</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Vai alla pagina Referral</li>
                            <li>Copia il tuo link personale unico</li>
                            <li>Condividi il link con:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Colleghi medici</li>
                                <li>Amici professionisti</li>
                                <li>Social media</li>
                                <li>Newsletter</li>
                              </ul>
                            </li>
                            <li>Quando qualcuno si iscrive tramite il tuo link, ricevi la commissione</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Monitorare le commissioni</Badge>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Dashboard Referral:</strong> Visualizza statistiche in tempo reale</li>
                            <li><strong>Click sul link:</strong> Quante persone hanno cliccato</li>
                            <li><strong>Conversioni:</strong> Quanti si sono iscritti</li>
                            <li><strong>Commissioni maturate:</strong> Totale guadagnato</li>
                            <li><strong>Commissioni pagate:</strong> Cronologia pagamenti ricevuti</li>
                            <li><strong>Commissioni in sospeso:</strong> In attesa di pagamento</li>
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Modalità di pagamento</Badge>
                          <p className="mb-2">Le commissioni vengono pagate:</p>
                          <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Mensilmente per le commissioni ricorrenti</li>
                            <li>Entro 30 giorni dalla sottoscrizione per i piani annuali</li>
                            <li>Tramite bonifico bancario o PayPal</li>
                            <li>Soglia minima di prelievo: importo configurabile</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Guadagnare con il programma referral"]
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm">
                        <strong>💰 Esempio:</strong> Se inviti 10 colleghi che sottoscrivono il piano Professional (€50/mese), guadagni €125/mese ricorrenti!
                      </p>
                    </div>
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
                Area Cliente PWA
              </CardTitle>
              <CardDescription>
                Come i tuoi clienti accedono alla loro area riservata tramite smartphone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                
                {/* Sezione 4.1: Accesso cliente */}
                <AccordionItem value="client-access">
                  <AccordionTrigger className="text-lg font-semibold">
                    4.1 Come i Clienti Accedono alla Loro Area
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Due modalità di accesso:</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Opzione 1: QR Code (Consigliato)</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Dalla scheda cliente, genera il QR code personale</li>
                            <li>Stampa il QR code o mostralo sullo schermo</li>
                            <li>Il cliente scansiona il codice con la fotocamera dello smartphone</li>
                            <li>Si apre automaticamente la sua area riservata</li>
                            <li>Il cliente può salvare l'app sulla home screen del telefono</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Opzione 2: Link diretto</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Copia il link personale del cliente</li>
                            <li>Invialo via email, WhatsApp o SMS</li>
                            <li>Il cliente clicca sul link e accede all'area riservata</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Come i clienti accedono con QR Code"]
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm">
                        <strong>🔐 Sicurezza:</strong> Ogni QR code è univoco e personale. Solo il cliente autorizzato può accedere ai suoi dati!
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 4.2: Cosa vedono i clienti */}
                <AccordionItem value="client-features">
                  <AccordionTrigger className="text-lg font-semibold">
                    4.2 Cosa Possono Fare i Clienti nell'Area Riservata
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Funzionalità disponibili ai clienti:</h4>
                      
                      <ul className="list-disc list-inside space-y-3 ml-2">
                        <li>
                          <strong>Visualizzare appuntamenti:</strong>
                          <p className="text-sm text-muted-foreground ml-6">Vedere tutti gli appuntamenti passati e futuri con date, orari e servizi</p>
                        </li>
                        <li>
                          <strong>Scaricare fatture:</strong>
                          <p className="text-sm text-muted-foreground ml-6">Accedere a tutte le fatture in formato PDF</p>
                        </li>
                        <li>
                          <strong>Visualizzare documenti medici:</strong>
                          <p className="text-sm text-muted-foreground ml-6">Consultare referti, prescrizioni e documenti sanitari caricati</p>
                        </li>
                        <li>
                          <strong>Dati personali:</strong>
                          <p className="text-sm text-muted-foreground ml-6">Visualizzare i propri dati anagrafici e informazioni di contatto</p>
                        </li>
                        <li>
                          <strong>Contatti:</strong>
                          <p className="text-sm text-muted-foreground ml-6">Vedere i contatti della pratica (telefono, email, indirizzo)</p>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Screenshot: Interfaccia area cliente da smartphone]
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm">
                        <strong>📱 PWA:</strong> L'area cliente è una Progressive Web App - funziona come un'app nativa ma non richiede download da App Store!
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 4.3: Installare PWA */}
                <AccordionItem value="install-pwa">
                  <AccordionTrigger className="text-lg font-semibold">
                    4.3 Come Installare l'App sul Telefono (PWA)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-4">
                        <div>
                          <Badge className="mb-2">Su iPhone (Safari)</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Apri l'area cliente tramite QR code o link</li>
                            <li>Tocca il pulsante "Condividi" (quadrato con freccia)</li>
                            <li>Scorri e seleziona "Aggiungi a Home"</li>
                            <li>Conferma il nome dell'app</li>
                            <li>L'icona apparirà sulla home screen come un'app normale</li>
                          </ol>
                        </div>

                        <Separator />

                        <div>
                          <Badge className="mb-2">Su Android (Chrome)</Badge>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Apri l'area cliente tramite QR code o link</li>
                            <li>Tocca il menu (tre puntini in alto a destra)</li>
                            <li>Seleziona "Aggiungi a schermata Home" o "Installa app"</li>
                            <li>Conferma l'installazione</li>
                            <li>L'app sarà disponibile come tutte le altre app</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-muted-foreground">
                        [Video: "Installare PWA su iPhone e Android"]
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm">
                        <strong>⭐ Vantaggio:</strong> Una volta installata, l'app funziona anche offline per consultare dati già caricati!
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sezione 4.4: Personalizzazione area cliente */}
                <AccordionItem value="customize-client-area">
                  <AccordionTrigger className="text-lg font-semibold">
                    4.4 Personalizzare l'Aspetto dell'Area Cliente
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">L'area cliente riflette automaticamente il tuo brand:</h4>
                      
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Logo/Icona:</strong> Il logo caricato nelle Impostazioni → Aspetto</li>
                        <li><strong>Colori:</strong> I colori primario e secondario del tuo brand</li>
                        <li><strong>Nome azienda:</strong> Appare nell'header dell'app</li>
                        <li><strong>Contatti:</strong> Footer con tutte le info di contatto</li>
                      </ul>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm">
                        <strong>💡 Suggerimento:</strong> Scegli colori coerenti con il tuo brand per un'esperienza professionale!
                      </p>
                    </div>
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
              <h3 className="font-semibold text-lg mb-2">Hai bisogno di aiuto?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Questo manuale è sempre disponibile dal menu Impostazioni. Per assistenza personalizzata:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Contatta il supporto tecnico via email</li>
                <li>Consulta i video tutorial incorporati in ogni sezione</li>
                <li>Scarica il PDF del manuale per consultazione offline</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
