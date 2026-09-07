import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, CalendarPlus, Loader2, Mic, MicOff, Send, Sparkles, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  addMinutesToTime,
  findAssistantClient,
  findAssistantService,
  splitClientName,
  type AssistantClient,
  type AssistantService
} from '@/lib/appointmentAssistant';

type PendingQuestion = 'create_client' | 'create_service' | 'confirm_appointment' | null;

interface AssistantDraft {
  clientName?: string | null;
  clientId?: number | null;
  date?: string | null;
  startTime?: string | null;
  serviceName?: string | null;
  serviceId?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  createClientApproved?: boolean;
  createServiceApproved?: boolean;
}

interface Interpretation {
  clientName?: string | null;
  date?: string | null;
  startTime?: string | null;
  serviceName?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  confirmation: 'yes' | 'no' | 'unknown';
}

interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface VoiceAppointmentAssistantProps {
  professionalName?: string;
}

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Rome'
});

function mergeInterpretation(draft: AssistantDraft, interpretation: Interpretation): AssistantDraft {
  const merged = { ...draft };
  const fields: Array<keyof Interpretation> = [
    'clientName',
    'date',
    'startTime',
    'serviceName',
    'durationMinutes',
    'notes'
  ];

  for (const field of fields) {
    const value = interpretation[field];
    if (value !== null && value !== undefined && value !== '') {
      (merged as any)[field] = value;
    }
  }

  if (interpretation.clientName && interpretation.clientName !== draft.clientName) {
    merged.clientId = null;
    merged.createClientApproved = false;
  }
  if (interpretation.serviceName && interpretation.serviceName !== draft.serviceName) {
    merged.serviceId = null;
    merged.createServiceApproved = false;
    if (!interpretation.durationMinutes) merged.durationMinutes = null;
  }

  return merged;
}

export default function VoiceAppointmentAssistant({
  professionalName
}: VoiceAppointmentAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<AssistantDraft>({});
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<AssistantClient[]>({
    queryKey: ['/api/clients'],
    enabled: open
  });
  const { data: services = [], isLoading: isLoadingServices } = useQuery<AssistantService[]>({
    queryKey: ['/api/services'],
    enabled: open
  });
  const isCatalogLoading = isLoadingClients || isLoadingServices;

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const addAssistantMessage = (content: string) => {
    setMessages(previous => [...previous, { role: 'assistant', content }]);
    speak(content);
  };

  useEffect(() => {
    if (!open || messages.length > 0) return;
    const firstName = professionalName?.trim().split(/\s+/)[0];
    const greeting = firstName
      ? `Ciao ${firstName}, sono il tuo assistente appuntamenti. Dimmi il nome del cliente, la data, l'ora e il trattamento.`
      : `Ciao, sono il tuo assistente appuntamenti. Dimmi il nome del cliente, la data, l'ora e il trattamento.`;
    setMessages([{ role: 'assistant', content: greeting }]);
    speak(greeting);
  }, [open, messages.length, professionalName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isSaving]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const askNextQuestion = (nextDraft: AssistantDraft): AssistantDraft => {
    if (!nextDraft.clientName) {
      setPendingQuestion(null);
      addAssistantMessage('Qual è il nome del cliente?');
      return nextDraft;
    }
    if (!nextDraft.date) {
      setPendingQuestion(null);
      addAssistantMessage('Per quale data vuoi creare l’appuntamento?');
      return nextDraft;
    }
    if (!nextDraft.startTime) {
      setPendingQuestion(null);
      addAssistantMessage('A che ora deve iniziare l’appuntamento?');
      return nextDraft;
    }
    if (!nextDraft.serviceName) {
      setPendingQuestion(null);
      addAssistantMessage('Quale trattamento o servizio devo inserire?');
      return nextDraft;
    }

    const existingClient = findAssistantClient(clients, nextDraft.clientName);
    if (existingClient) {
      nextDraft.clientId = existingClient.id;
      nextDraft.clientName = `${existingClient.firstName} ${existingClient.lastName || ''}`.trim();
    } else if (!nextDraft.createClientApproved) {
      setPendingQuestion('create_client');
      addAssistantMessage(
        `${nextDraft.clientName} non risulta tra i clienti. Vuoi creare questo nuovo cliente?`
      );
      return nextDraft;
    }

    const existingService = findAssistantService(services, nextDraft.serviceName);
    if (existingService) {
      nextDraft.serviceId = existingService.id;
      nextDraft.serviceName = existingService.name;
      nextDraft.durationMinutes = existingService.duration || 60;
    } else if (!nextDraft.createServiceApproved) {
      setPendingQuestion('create_service');
      addAssistantMessage(
        `Il trattamento ${nextDraft.serviceName} non è presente. Vuoi creare questo nuovo servizio?`
      );
      return nextDraft;
    }

    if (!nextDraft.durationMinutes) {
      setPendingQuestion(null);
      addAssistantMessage(`Quanto dura il trattamento ${nextDraft.serviceName}, in minuti?`);
      return nextDraft;
    }

    const date = new Date(`${nextDraft.date}T12:00:00`);
    const readableDate = Number.isNaN(date.getTime())
      ? nextDraft.date
      : dateFormatter.format(date);
    const notesText = nextDraft.notes ? ` Note: ${nextDraft.notes}.` : '';
    setPendingQuestion('confirm_appointment');
    addAssistantMessage(
      `Riepilogo: ${nextDraft.clientName}, ${readableDate} alle ${nextDraft.startTime}, ` +
      `${nextDraft.serviceName}, durata ${nextDraft.durationMinutes} minuti.${notesText} Confermi la creazione?`
    );
    return nextDraft;
  };

  const saveAppointment = async (readyDraft: AssistantDraft) => {
    if (
      !readyDraft.clientName ||
      !readyDraft.serviceName ||
      !readyDraft.date ||
      !readyDraft.startTime ||
      !readyDraft.durationMinutes
    ) {
      addAssistantMessage('Mancano ancora alcune informazioni obbligatorie.');
      return;
    }

    setIsSaving(true);
    try {
      let clientId = readyDraft.clientId || null;
      if (!clientId) {
        if (!readyDraft.createClientApproved) {
          throw new Error('La creazione del nuovo cliente non è stata autorizzata.');
        }
        const clientName = splitClientName(readyDraft.clientName);
        const response = await apiRequest('POST', '/api/clients', {
          ...clientName,
          phone: '',
          email: null,
          notes: 'Cliente creato tramite assistente AI'
        });
        const createdClient = await response.json();
        clientId = createdClient.id;
      }

      let serviceId = readyDraft.serviceId || null;
      if (!serviceId) {
        if (!readyDraft.createServiceApproved) {
          throw new Error('La creazione del nuovo servizio non è stata autorizzata.');
        }
        const response = await apiRequest('POST', '/api/services', {
          name: readyDraft.serviceName,
          duration: readyDraft.durationMinutes,
          price: 0,
          color: '#7c3aed'
        });
        const createdService = await response.json();
        serviceId = createdService.id;
      }

      const endTime = addMinutesToTime(readyDraft.startTime, readyDraft.durationMinutes);
      await apiRequest('POST', '/api/appointments', {
        clientId,
        serviceId,
        date: readyDraft.date,
        startTime: readyDraft.startTime,
        endTime,
        notes: readyDraft.notes || '',
        status: 'scheduled'
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] }),
        queryClient.invalidateQueries({
          predicate: query => String(query.queryKey[0]).startsWith('/api/appointments/')
        })
      ]);

      setPendingQuestion(null);
      setDraft({});
      addAssistantMessage('Appuntamento creato correttamente. Vuoi inserirne un altro?');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      addAssistantMessage(`Non sono riuscito a creare l’appuntamento: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const submitMessage = async (rawMessage?: string) => {
    const userMessage = (rawMessage ?? input).trim();
    if (!userMessage || isProcessing || isSaving || isCatalogLoading) return;

    setInput('');
    setMessages(previous => [...previous, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      const response = await apiRequest('POST', '/api/ai-appointment-assistant/interpret', {
        message: userMessage,
        draft: {
          clientName: draft.clientName,
          date: draft.date,
          startTime: draft.startTime,
          serviceName: draft.serviceName,
          durationMinutes: draft.durationMinutes,
          notes: draft.notes
        }
      });
      const interpretation = await response.json() as Interpretation;
      let nextDraft = mergeInterpretation(draft, interpretation);

      if (pendingQuestion === 'create_client') {
        if (interpretation.confirmation === 'yes') {
          nextDraft.createClientApproved = true;
          setPendingQuestion(null);
        } else if (interpretation.confirmation === 'no') {
          nextDraft.clientName = null;
          nextDraft.clientId = null;
          nextDraft.createClientApproved = false;
          setDraft(nextDraft);
          setPendingQuestion(null);
          addAssistantMessage('Va bene. Indicami il nome di un cliente già presente.');
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage('Rispondi sì per creare il cliente, oppure no per indicarne un altro.');
          return;
        }
      }

      if (pendingQuestion === 'create_service') {
        if (interpretation.confirmation === 'yes') {
          nextDraft.createServiceApproved = true;
          setPendingQuestion(null);
        } else if (interpretation.confirmation === 'no') {
          nextDraft.serviceName = null;
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = false;
          setDraft(nextDraft);
          setPendingQuestion(null);
          addAssistantMessage('Va bene. Indicami un trattamento già presente.');
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage('Rispondi sì per creare il servizio, oppure no per indicarne un altro.');
          return;
        }
      }

      if (pendingQuestion === 'confirm_appointment') {
        if (interpretation.confirmation === 'yes') {
          setDraft(nextDraft);
          await saveAppointment(nextDraft);
          return;
        }
        if (interpretation.confirmation === 'no') {
          setPendingQuestion(null);
          setDraft(nextDraft);
          addAssistantMessage('Va bene. Dimmi cosa vuoi modificare.');
          return;
        }
      }

      nextDraft = askNextQuestion(nextDraft);
      setDraft({ ...nextDraft });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Riprova tra poco.';
      addAssistantMessage(`Non ho capito la richiesta: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    if (isCatalogLoading) {
      addAssistantMessage('Attendi un momento: sto caricando clienti e trattamenti.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addAssistantMessage(
        'Il riconoscimento vocale non è disponibile in questo browser. Puoi scrivere la richiesta nel campo qui sotto.'
      );
      return;
    }

    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      addAssistantMessage('Non sono riuscito ad ascoltare. Riprova oppure scrivi la richiesta.');
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
        void submitMessage(transcript);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const resetConversation = () => {
    setMessages([]);
    setDraft({});
    setPendingQuestion(null);
    setInput('');
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-violet-600 p-0 text-white shadow-xl hover:bg-violet-700"
        aria-label="Apri assistente vocale appuntamenti"
        title="Assistente vocale appuntamenti"
        data-testid="button-open-voice-appointment-assistant"
      >
        <Mic className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 text-white">
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5" />
              Assistente appuntamenti AI
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[52vh] min-h-[300px] px-4 py-4">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                      <Bot className="h-4 w-4" />
                    </span>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <User className="h-4 w-4" />
                    </span>
                  )}
                </div>
              ))}
              {(isProcessing || isSaving || isCatalogLoading) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isCatalogLoading
                    ? 'Caricamento clienti e trattamenti…'
                    : isSaving
                      ? 'Creazione appuntamento…'
                      : 'Sto elaborando…'}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Dati minimi: cliente, data, ora e trattamento
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetConversation}
                disabled={isProcessing || isSaving || isCatalogLoading}
                className="h-7 gap-1 px-2 text-xs"
              >
                <X className="h-3 w-3" />
                Ricomincia
              </Button>
            </div>

            {pendingQuestion === 'confirm_appointment' && (
              <Button
                type="button"
                className="mb-2 w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => saveAppointment(draft)}
                disabled={isProcessing || isSaving || isCatalogLoading}
                data-testid="button-confirm-ai-appointment"
              >
                <CalendarPlus className="h-4 w-4" />
                Conferma e crea appuntamento
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={isListening ? 'destructive' : 'outline'}
                size="icon"
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isSaving || isCatalogLoading}
                aria-label={isListening ? 'Interrompi ascolto' : 'Avvia ascolto'}
                data-testid="button-toggle-appointment-listening"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void submitMessage();
                }}
                placeholder={isListening ? 'Ti sto ascoltando…' : 'Parla oppure scrivi qui…'}
                disabled={isProcessing || isSaving}
                data-testid="input-voice-appointment-message"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => void submitMessage()}
                disabled={!input.trim() || isProcessing || isSaving || isCatalogLoading}
                aria-label="Invia messaggio"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}