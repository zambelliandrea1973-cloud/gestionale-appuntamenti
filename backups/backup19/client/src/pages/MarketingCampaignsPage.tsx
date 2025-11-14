import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Send, 
  Mail, 
  MessageSquare, 
  Users, 
  Loader2,
  CheckCircle,
  Copy,
  Wand2,
  Upload,
  X,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Campaign {
  id: number;
  userId: number;
  title: string;
  message: string;
  createdAt: string;
  sentTo: number | null;
  uniqueCode: string;
  attachmentPaths: string[] | null;
  attachmentTypes: string[] | null;
}

export default function MarketingCampaignsPage() {
  const { t } = useTranslation();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '👋 Ciao! Sono il tuo assistente AI per creare campagne marketing.\n\nDescrivimi che tipo di campagna vuoi creare (es: "Sconto 20% per San Valentino" o "Promozione nuovi clienti") e ti aiuterò a scrivere un messaggio efficace!',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<{title: string; message: string} | null>(null);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableMessage, setEditableMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [totalClients, setTotalClients] = useState(0);
  
  // Carica campagne dal database
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['/api/campaigns'],
    staleTime: 60000, // 1 minuto
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Stati per popup sequenziale WhatsApp
  const [showGeneratedLinks, setShowGeneratedLinks] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{link: string; name: string; phone: string}>>([]);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Sincronizza i campi editabili quando viene generata una campagna
  useEffect(() => {
    if (generatedCampaign) {
      setEditableTitle(generatedCampaign.title);
      setEditableMessage(generatedCampaign.message);
    }
  }, [generatedCampaign]);

  // Carica numero clienti totali
  useEffect(() => {
    fetchTotalClients();
  }, []);

  const fetchTotalClients = async () => {
    try {
      const response = await apiRequest('GET', '/api/clients');
      if (response.ok) {
        const clients = await response.json();
        setTotalClients(clients.length);
      }
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    }
  };
  
  // Funzioni per gestire il popup sequenziale WhatsApp
  const openCurrentLink = () => {
    if (generatedLinks[currentLinkIndex]) {
      window.open(generatedLinks[currentLinkIndex].link, '_blank');
    }
  };
  
  const goToNextLink = () => {
    if (currentLinkIndex < generatedLinks.length - 1) {
      setCurrentLinkIndex(prev => prev + 1);
    } else {
      closeGeneratedLinks();
    }
  };
  
  const closeGeneratedLinks = () => {
    setShowGeneratedLinks(false);
    setGeneratedLinks([]);
    setCurrentLinkIndex(0);
    setIsSequenceRunning(false);
  };
  
  const goToNextSequentialLink = () => {
    if (currentLinkIndex < generatedLinks.length - 1) {
      const nextIndex = currentLinkIndex + 1;
      setCurrentLinkIndex(nextIndex);
      setTimeout(() => {
        // Usa nextIndex direttamente invece di currentLinkIndex (che potrebbe non essere aggiornato)
        if (generatedLinks[nextIndex]) {
          window.open(generatedLinks[nextIndex].link, '_blank');
        }
      }, 500);
    } else {
      closeGeneratedLinks();
    }
  };
  
  const startSequence = () => {
    setIsSequenceRunning(true);
    openCurrentLink();
  };


  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage chiamata, userInput:', userInput);
    
    if (!userInput.trim()) {
      console.log('⚠️ userInput vuoto, interrompo');
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);
    
    console.log('📤 Invio richiesta API a /api/ai/generate-campaign');

    try {
      const response = await apiRequest('POST', '/api/ai/generate-campaign', {
        prompt: userInput,
        conversationHistory: chatMessages
      });
      
      console.log('📥 Risposta API ricevuta, status:', response.status, 'ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dati parsati:', data);
        
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, aiMessage]);

        // Se l'IA ha generato una campagna, salvala
        if (data.campaign) {
          console.log('💾 Salvataggio campagna:', data.campaign);
          setGeneratedCampaign({
            title: data.campaign.title || 'Nuova Campagna',
            message: data.campaign.message
          });
        } else {
          console.warn('⚠️ Nessuna campagna nell\'oggetto data');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Errore API:', response.status, errorText);
        throw new Error('Errore nella generazione');
      }
    } catch (error) {
      console.error('❌ Eccezione catturata:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile generare la campagna. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
      console.log('🏁 handleSendMessage completata');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Verifica limite di 10 file totali
    if (uploadedFiles.length + files.length > 10) {
      toast({
        title: 'Troppi file',
        description: `Puoi caricare massimo 10 file. Attualmente hai ${uploadedFiles.length} file. Rimuovine alcuni prima di aggiungerne altri.`,
        variant: 'destructive'
      });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    const validFiles: File[] = [];
    const previews: string[] = [];

    // Valida tutti i file
    for (const file of files) {
      // Verifica tipo
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Tipo file non valido',
          description: `${file.name}: Carica solo immagini (JPG, PNG, GIF, WEBP) o video (MP4, WEBM)`,
          variant: 'destructive'
        });
        continue;
      }

      // Verifica dimensione (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File troppo grande',
          description: `${file.name}: Dimensione massima 10MB`,
          variant: 'destructive'
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Crea preview per tutti i file validi
    Promise.all(
      validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      })
    ).then(newPreviews => {
      setFilePreviews(prev => [...prev, ...newPreviews]);
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);

    toast({
      title: 'File caricati!',
      description: `${validFiles.length} file ${validFiles.length === 1 ? 'pronto' : 'pronti'} per l'invio`,
    });
  };

  const handleRemoveFile = (index?: number) => {
    if (index !== undefined) {
      // Rimuovi singolo file
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      setFilePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Rimuovi tutti i file
      setUploadedFiles([]);
      setFilePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyMessage = () => {
    if (editableMessage) {
      navigator.clipboard.writeText(editableMessage);
      toast({
        title: 'Copiato!',
        description: 'Messaggio copiato negli appunti',
      });
    }
  };

  const handleSendCampaign = async (channel: 'whatsapp' | 'email' | 'both') => {
    if (!generatedCampaign) return;

    setIsSending(true);

    try {
      // STEP 1: Salva campagna e genera link promozione (se ci sono allegati)
      let promotionLink = '';
      if (uploadedFiles.length > 0) {
        const promoFormData = new FormData();
        promoFormData.append('title', editableTitle);
        promoFormData.append('message', editableMessage);
        
        // Aggiungi tutti i file
        uploadedFiles.forEach(file => {
          promoFormData.append('files', file);
        });

        const promoResponse = await fetch('/api/promotions/create', {
          method: 'POST',
          body: promoFormData,
          credentials: 'include'
        });

        if (promoResponse.ok) {
          const promoData = await promoResponse.json();
          // Usa VITE_PUBLIC_DOMAIN se configurato (produzione Sliplane), altrimenti dominio corrente
          const baseUrl = import.meta.env.VITE_PUBLIC_DOMAIN || window.location.origin;
          promotionLink = `${baseUrl}/promozioni/${promoData.code}`;
        } else {
          // ❌ ERRORE CRITICO: Se il salvataggio fallisce, BLOCCA l'invio
          throw new Error('Impossibile salvare la promozione. Il messaggio con allegato NON può essere inviato senza link.');
        }
      }

      // STEP 2: Aggiungi link al messaggio se presente
      const finalMessage = promotionLink 
        ? `${editableMessage}\n\n🔗 Visualizza la promozione:\n${promotionLink}`
        : editableMessage;

      // STEP 3: Invia campagna
      const formData = new FormData();
      formData.append('title', editableTitle);
      formData.append('message', finalMessage);
      formData.append('channel', channel);
      
      // Aggiungi allegati (manteniamo per retrocompatibilità email)
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          formData.append('attachment', file);
        });
      }

      const response = await fetch('/api/campaigns/send-batch', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Ricarica campagne dal database
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });

        toast({
          title: '✅ Campagna inviata!',
          description: `Messaggio inviato a ${data.sent} clienti via ${channel === 'both' ? 'WhatsApp ed Email' : channel === 'whatsapp' ? 'WhatsApp' : 'Email'}`,
        });

        // Se il canale include WhatsApp, apri il popup sequenziale
        if (channel === 'whatsapp' || channel === 'both') {
          // Carica i clienti e genera i link WhatsApp
          const clientsResponse = await apiRequest('GET', '/api/clients');
          if (clientsResponse.ok) {
            const clients = await clientsResponse.json();
            
            // Genera i link WhatsApp per ogni cliente con telefono
            const links = clients
              .filter((client: any) => client.phone)
              .map((client: any) => ({
                link: `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(finalMessage)}`,
                name: `${client.firstName} ${client.lastName}`,
                phone: client.phone
              }));
            
            if (links.length > 0) {
              setGeneratedLinks(links);
              setCurrentLinkIndex(0);
              setShowGeneratedLinks(true);
              setIsSequenceRunning(false);
            }
          }
        }

        // Reset form
        setGeneratedCampaign(null);
        setEditableTitle('');
        setEditableMessage('');
        handleRemoveFile();
      } else {
        throw new Error('Errore invio');
      }
    } catch (error) {
      // Mostra messaggio specifico se disponibile, altrimenti generico
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Impossibile inviare la campagna. Riprova.';
      
      toast({
        title: '❌ Errore invio campagna',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="marketing-campaigns-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Campagne Marketing AI</h1>
          <p className="text-muted-foreground">
            Crea campagne personalizzate con l'intelligenza artificiale
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat AI - 2 colonne su desktop */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chat Box */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Assistente AI
              </CardTitle>
              <CardDescription>
                Descrivi la tua campagna e l'AI creerà il messaggio perfetto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {msg.timestamp.toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Sto generando...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Es: Crea una promozione sconto 15% per i nuovi clienti..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[80px]"
                  data-testid="input-campaign-prompt"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isGenerating}
                  size="icon"
                  className="h-20 w-20"
                  data-testid="button-send-prompt"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Campagna Generata */}
          {generatedCampaign && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Campagna Pronta - Modifica se Necessario
                </CardTitle>
                <CardDescription>
                  Puoi modificare il titolo e il messaggio prima di inviare
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Titolo Modificabile */}
                <div className="space-y-2">
                  <Label htmlFor="editable-title">Titolo</Label>
                  <Input
                    id="editable-title"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    placeholder="Titolo della campagna"
                    data-testid="input-campaign-title"
                  />
                </div>

                {/* Messaggio Modificabile */}
                <div className="space-y-2">
                  <Label htmlFor="editable-message">Messaggio</Label>
                  <Textarea
                    id="editable-message"
                    value={editableMessage}
                    onChange={(e) => setEditableMessage(e.target.value)}
                    placeholder="Messaggio della campagna"
                    className="min-h-[200px]"
                    data-testid="textarea-campaign-message"
                  />
                </div>

                {/* Upload Allegato */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Aggiungi Immagini o Video (opzionale)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      multiple
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-file"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadedFiles.length > 0 ? `${uploadedFiles.length} file caricati` : 'Carica File'}
                    </Button>
                    {uploadedFiles.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile()}
                        data-testid="button-remove-all-files"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rimuovi tutti
                      </Button>
                    )}
                  </div>
                  
                  {/* Preview File - Griglia */}
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group border rounded-lg p-2">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={filePreviews[index]}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                          ) : (
                            <video
                              src={filePreviews[index]}
                              className="w-full h-24 object-cover rounded"
                            />
                          )}
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-file-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <p className="text-xs mt-1 truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formati supportati: JPG, PNG, GIF, WEBP, MP4, WEBM (max 10MB per file, max 10 file)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMessage}
                    data-testid="button-copy-message"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copia
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSendCampaign('whatsapp')}
                      disabled={isSending}
                      variant="outline"
                      data-testid="button-send-whatsapp"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleSendCampaign('email')}
                      disabled={isSending}
                      variant="outline"
                      data-testid="button-send-email"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Email
                    </Button>
                    <Button
                      onClick={() => handleSendCampaign('both')}
                      disabled={isSending}
                      data-testid="button-send-both"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Entrambi
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info - 1 colonna su desktop */}
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Destinatari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{totalClients}</p>
                <p className="text-sm text-muted-foreground">Clienti totali</p>
              </div>
            </CardContent>
          </Card>

          {/* Storico Campagne */}
          <Card>
            <CardHeader>
              <CardTitle>Storico Campagne</CardTitle>
              <CardDescription>
                Ultime campagne inviate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nessuna campagna ancora inviata
                  </p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm">{campaign.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {campaign.sentTo || 0} clienti
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {campaign.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {campaign.attachmentPaths && campaign.attachmentPaths.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {campaign.attachmentTypes?.[0]?.startsWith('image') ? (
                                <ImageIcon className="h-3 w-3 mr-1" />
                              ) : (
                                <Video className="h-3 w-3 mr-1" />
                              )}
                              {campaign.attachmentPaths.length} file
                            </Badge>
                          )}
                          <span className="ml-auto">
                            {new Date(campaign.createdAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal per i link WhatsApp generati - popup sequenziale */}
      {showGeneratedLinks && generatedLinks.length > 0 && (
        <div className="fixed bottom-0 right-0 z-50 p-4 pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden pointer-events-auto border-2 border-primary">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {isSequenceRunning ? 'Invio in sequenza' : 'Link WhatsApp'}
                </h3>
                <p className="text-sm">Contatto {currentLinkIndex + 1} di {generatedLinks.length}</p>
              </div>
              <Badge variant="secondary">
                {Math.round((currentLinkIndex + 1) / generatedLinks.length * 100)}%
              </Badge>
            </div>
            
            <div className="p-4">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${((currentLinkIndex + 1) / generatedLinks.length) * 100}%` }}
                />
              </div>
              
              <div className="border rounded-lg bg-white p-3 mb-3">
                <p className="font-bold text-base">
                  {generatedLinks[currentLinkIndex]?.name}
                </p>
                {isSequenceRunning && (
                  <p className="text-sm text-muted-foreground mt-1">
                    WhatsApp si è aperto in una nuova finestra
                  </p>
                )}
              </div>
              
              {isSequenceRunning ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-center text-muted-foreground">Dopo aver inviato il messaggio:</p>
                  <Button
                    onClick={goToNextSequentialLink}
                    size="lg"
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {currentLinkIndex < generatedLinks.length - 1 
                      ? 'Vai al prossimo contatto' 
                      : 'Termina invio'}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={goToNextLink}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Salta contatto
                    </Button>
                    <Button
                      onClick={closeGeneratedLinks}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={startSequence}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    🚀 Invia in Sequenza
                  </Button>
                  
                  <div className="text-xs text-center text-muted-foreground">oppure</div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={openCurrentLink}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Apri uno
                    </Button>
                    
                    <Button
                      onClick={goToNextLink}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Salta
                    </Button>
                    
                    <Button
                      onClick={closeGeneratedLinks}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
