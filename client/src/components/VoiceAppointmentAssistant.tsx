import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, CalendarPlus, GripHorizontal, Loader2, Mic, MicOff, Send, Sparkles, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  addMinutesToTime,
  detectAssistantConfirmation,
  findAssistantClient,
  findAssistantClientSuggestion,
  findAssistantService,
  findAssistantServicePrefixMatches,
  findAssistantServiceSuggestion,
  getAssistantGreetingName,
  normalizeAssistantName,
  splitClientName,
  type AssistantClient,
  type AssistantService
} from '@/lib/appointmentAssistant';
import {
  VOICE_APPOINTMENT_DRAFT_EVENT,
  VOICE_APPOINTMENT_DRAFT_STORAGE_KEY,
  type VoiceAppointmentFormDraft,
} from '@/lib/voiceAppointmentDraft';

type PendingQuestion = 'suggest_client' | 'create_client' | 'suggest_service' | 'choose_service' | 'create_service' | 'confirm_appointment' | null;

interface AssistantDraft {
  clientName?: string | null;
  clientId?: number | null;
  date?: string | null;
  startTime?: string | null;
  serviceName?: string | null;
  serviceId?: number | null;
  durationMinutes?: number | null;
  servicePrice?: number | null;
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
  servicePrice?: number | null;
  notes?: string | null;
  confirmation: 'yes' | 'no' | 'unknown';
}

interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface VoiceAppointmentAssistantProps {
  professionalEmail?: string;
}

const assistantSpeechLocales: Record<string, string> = {
  it: 'it-IT',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  nl: 'nl-NL',
  no: 'nb-NO',
  ro: 'ro-RO',
  ru: 'ru-RU',
  hi: 'hi-IN'
};

const ASSISTANT_FEMALE_VOICE_KEY = 'voice-appointment-assistant-female-voice';
const preferredFemaleVoiceNames = [
  /^google italiano$/i,
  /^microsoft elsa\b/i,
  /\b(alice|federica|lucia|isabella|elsa|bianca|fabiola|paola|carla|aria|jenny|sonia|amelie|denise|katja|ingrid|sabina|svetlana|neerja|heera|samantha|karen|moira|fiona|tessa|female|woman|donna)\b/i,
];
const knownMaleVoiceNames = /\b(cosimo|diego|giuseppe|luca|marco|male|man|uomo)\b/i;

function getAssistantSpeechLocale(language?: string): string {
  const baseLanguage = (language || 'it').split('-')[0].toLowerCase();
  return assistantSpeechLocales[baseLanguage] || 'it-IT';
}

function mergeInterpretation(draft: AssistantDraft, interpretation: Interpretation): AssistantDraft {
  const merged = { ...draft };
  const fields: Array<keyof Interpretation> = [
    'clientName',
    'date',
    'startTime',
    'serviceName',
    'durationMinutes',
    'servicePrice',
    'notes'
  ];

  for (const field of fields) {
    const value = interpretation[field];
    if (value !== null && value !== undefined && value !== '') {
      (merged as any)[field] = value;
    }
  }

  if (
    interpretation.clientName &&
    normalizeAssistantName(interpretation.clientName) !== normalizeAssistantName(draft.clientName)
  ) {
    merged.clientId = null;
    merged.createClientApproved = false;
  }
  if (
    interpretation.serviceName &&
    normalizeAssistantName(interpretation.serviceName) !== normalizeAssistantName(draft.serviceName)
  ) {
    merged.serviceId = null;
    merged.createServiceApproved = false;
    if (!interpretation.durationMinutes) merged.durationMinutes = null;
    merged.servicePrice = null;
  }

  return merged;
}

export default function VoiceAppointmentAssistant({
  professionalEmail
}: VoiceAppointmentAssistantProps) {
  const { t, i18n } = useTranslation();
  const speechLocale = getAssistantSpeechLocale(i18n.resolvedLanguage || i18n.language);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<AssistantDraft>({});
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [servicePickerOptions, setServicePickerOptions] = useState<AssistantService[]>([]);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechStartTimerRef = useRef<number | null>(null);
  const voicesChangedHandlerRef = useRef<(() => void) | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<AssistantClient[]>({
    queryKey: ['/api/clients'],
    enabled: open
  });
  const { data: services = [], isLoading: isLoadingServices } = useQuery<AssistantService[]>({
    queryKey: ['/api/services'],
    enabled: open
  });
  const isCatalogLoading = isLoadingClients || isLoadingServices;

  const speak = (text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) {
      onComplete?.();
      return;
    }
    const synthesis = window.speechSynthesis;
    if (speechStartTimerRef.current !== null) {
      window.clearTimeout(speechStartTimerRef.current);
      speechStartTimerRef.current = null;
    }
    if (voicesChangedHandlerRef.current) {
      synthesis.removeEventListener('voiceschanged', voicesChangedHandlerRef.current);
      voicesChangedHandlerRef.current = null;
    }
    synthesis.cancel();
    utteranceRef.current = null;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale;
    utterance.rate = 2.22;
    utterance.pitch = 1;

    let completed = false;
    const completeOnce = () => {
      if (completed) return;
      completed = true;
      utteranceRef.current = null;
      onComplete?.();
    };
    if (onComplete) {
      utterance.onend = completeOnce;
      utterance.onerror = event => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') completeOnce();
      };
    } else {
      utterance.onend = () => {
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
      };
    }

    const startSpeaking = (allowFallback: boolean): boolean => {
      const language = speechLocale.split('-')[0].toLowerCase();
      const matchingVoices = synthesis.getVoices().filter(voice =>
        voice.lang.toLowerCase().startsWith(language)
      );
      const savedVoiceName = localStorage.getItem(ASSISTANT_FEMALE_VOICE_KEY);
      const savedVoice = savedVoiceName
        ? matchingVoices.find(voice =>
            voice.name === savedVoiceName &&
            preferredFemaleVoiceNames.some(pattern => pattern.test(voice.name.trim()))
          )
        : undefined;
      if (savedVoiceName && !savedVoice) {
        localStorage.removeItem(ASSISTANT_FEMALE_VOICE_KEY);
      }
      const preferredFemaleVoice = preferredFemaleVoiceNames
        .map(pattern => matchingVoices.find(voice => pattern.test(voice.name.trim())))
        .find((voice): voice is SpeechSynthesisVoice => Boolean(voice));
      const selectedVoice = savedVoice || preferredFemaleVoice;

      if (!selectedVoice && !allowFallback) return false;

      const fallbackVoice = matchingVoices.find(voice =>
        !knownMaleVoiceNames.test(voice.name.trim())
      ) || matchingVoices[0] || null;
      utterance.voice = selectedVoice || fallbackVoice;
      if (selectedVoice) {
        localStorage.setItem(ASSISTANT_FEMALE_VOICE_KEY, selectedVoice.name);
      }
      utteranceRef.current = utterance;
      synthesis.speak(utterance);
      return true;
    };

    if (startSpeaking(false)) return;

    const handleVoicesChanged = () => {
      if (!startSpeaking(false)) return;
      if (speechStartTimerRef.current !== null) {
        window.clearTimeout(speechStartTimerRef.current);
        speechStartTimerRef.current = null;
      }
      synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      voicesChangedHandlerRef.current = null;
    };
    voicesChangedHandlerRef.current = handleVoicesChanged;
    synthesis.addEventListener('voiceschanged', handleVoicesChanged);
    speechStartTimerRef.current = window.setTimeout(() => {
      synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      voicesChangedHandlerRef.current = null;
      speechStartTimerRef.current = null;
      startSpeaking(true);
    }, 800);
  };

  const addAssistantMessage = (content: string, options: { autoListen?: boolean } = {}) => {
    setMessages(previous => [...previous, { role: 'assistant', content }]);
    speak(
      content,
      options.autoListen === false ? undefined : () => startListeningRef.current()
    );
  };

  useEffect(() => {
    if (!open || messages.length > 0) return;
    const greetingName = getAssistantGreetingName(professionalEmail);
    const greeting = greetingName
      ? t('voiceAppointmentAssistant.greeting', { name: greetingName })
      : t('voiceAppointmentAssistant.greetingFallback');
    setMessages([{ role: 'assistant', content: greeting }]);
    speak(greeting, () => startListeningRef.current());
  }, [open, messages.length, professionalEmail, speechLocale, t]);

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
      addAssistantMessage(t('voiceAppointmentAssistant.askClientName'), { autoListen: true });
      return nextDraft;
    }
    if (!nextDraft.date) {
      setPendingQuestion(null);
      addAssistantMessage(t('voiceAppointmentAssistant.askDate'), { autoListen: true });
      return nextDraft;
    }
    if (!nextDraft.startTime) {
      setPendingQuestion(null);
      addAssistantMessage(t('voiceAppointmentAssistant.askTime'), { autoListen: true });
      return nextDraft;
    }
    if (!nextDraft.serviceName) {
      setPendingQuestion(null);
      addAssistantMessage(t('voiceAppointmentAssistant.askService'), { autoListen: true });
      return nextDraft;
    }

    const existingClient = findAssistantClient(clients, nextDraft.clientName);
    if (existingClient) {
      nextDraft.clientId = existingClient.id;
      nextDraft.clientName = `${existingClient.firstName} ${existingClient.lastName || ''}`.trim();
    } else if (!nextDraft.createClientApproved) {
      const suggestion = findAssistantClientSuggestion(clients, nextDraft.clientName);
      if (suggestion) {
        setPendingQuestion('suggest_client');
        addAssistantMessage(
          t('voiceAppointmentAssistant.clientSuggestion', {
            requested: nextDraft.clientName,
            suggestion: `${suggestion.client.firstName} ${suggestion.client.lastName || ''}`.trim()
          }),
          { autoListen: true }
        );
      } else {
        setPendingQuestion('create_client');
        addAssistantMessage(
          t('voiceAppointmentAssistant.clientNotFound', { name: nextDraft.clientName }),
          { autoListen: true }
        );
      }
      return nextDraft;
    }

    const prefixMatches = findAssistantServicePrefixMatches(services, nextDraft.serviceName);
    const existingService = findAssistantService(services, nextDraft.serviceName);
    if (prefixMatches.length > 1 && !nextDraft.serviceId) {
      setPendingQuestion('choose_service');
      setServicePickerOptions(prefixMatches);
      setServicePickerOpen(true);
      addAssistantMessage(
        t('voiceAppointmentAssistant.serviceFamilyPrompt', { name: nextDraft.serviceName }),
        { autoListen: true }
      );
      return nextDraft;
    }
    if (existingService) {
      nextDraft.serviceId = existingService.id;
      nextDraft.serviceName = existingService.name;
      nextDraft.durationMinutes = existingService.duration || 60;
    } else if (!nextDraft.createServiceApproved) {
      const suggestion = findAssistantServiceSuggestion(services, nextDraft.serviceName);
      if (suggestion) {
        setPendingQuestion('suggest_service');
        addAssistantMessage(
          t('voiceAppointmentAssistant.serviceSuggestion', {
            requested: nextDraft.serviceName,
            suggestion: suggestion.service.name
          }),
          { autoListen: true }
        );
      } else {
        setPendingQuestion('create_service');
        setServicePickerOptions(services);
        setServicePickerOpen(true);
        addAssistantMessage(
          t('voiceAppointmentAssistant.servicePickerPrompt', { name: nextDraft.serviceName }),
          { autoListen: true }
        );
      }
      return nextDraft;
    }

    if (!nextDraft.durationMinutes) {
      setPendingQuestion(null);
      addAssistantMessage(
        t('voiceAppointmentAssistant.askDuration', { name: nextDraft.serviceName }),
        { autoListen: true }
      );
      return nextDraft;
    }

    if (
      nextDraft.createServiceApproved &&
      (nextDraft.servicePrice === null || nextDraft.servicePrice === undefined)
    ) {
      setPendingQuestion(null);
      addAssistantMessage(
        t('voiceAppointmentAssistant.askServicePrice', { name: nextDraft.serviceName }),
        { autoListen: true }
      );
      return nextDraft;
    }

    const date = new Date(`${nextDraft.date}T12:00:00`);
    const readableDate = Number.isNaN(date.getTime())
      ? nextDraft.date
      : new Intl.DateTimeFormat(speechLocale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Rome'
      }).format(date);
    const notesText = nextDraft.notes
      ? t('voiceAppointmentAssistant.notes', { value: nextDraft.notes })
      : '';
    setPendingQuestion('confirm_appointment');
    addAssistantMessage(
      t('voiceAppointmentAssistant.summary', {
        client: nextDraft.clientName,
        date: readableDate,
        time: nextDraft.startTime,
        service: nextDraft.serviceName,
        duration: nextDraft.durationMinutes,
        price: nextDraft.createServiceApproved
          ? t('voiceAppointmentAssistant.summaryPrice', { price: nextDraft.servicePrice })
          : '',
        notes: notesText
      }),
      { autoListen: true }
    );
    return nextDraft;
  };

  const openManualAppointmentForm = async (readyDraft: AssistantDraft) => {
    if (
      !readyDraft.clientName ||
      !readyDraft.serviceName ||
      !readyDraft.date ||
      !readyDraft.startTime ||
      !readyDraft.durationMinutes
    ) {
      addAssistantMessage(t('voiceAppointmentAssistant.missingRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const existingClient = findAssistantClient(clients, readyDraft.clientName);
      let clientId = readyDraft.clientId || existingClient?.id || null;
      if (!clientId) {
        if (!readyDraft.createClientApproved) {
          throw new Error(t('voiceAppointmentAssistant.unauthorizedClient'));
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
      if (!clientId) {
        throw new Error(t('voiceAppointmentAssistant.unauthorizedClient'));
      }

      const existingService = findAssistantService(services, readyDraft.serviceName);
      let serviceId = readyDraft.serviceId || existingService?.id || null;
      if (!serviceId) {
        if (!readyDraft.createServiceApproved) {
          throw new Error(t('voiceAppointmentAssistant.unauthorizedService'));
        }
        if (readyDraft.servicePrice === null || readyDraft.servicePrice === undefined) {
          throw new Error(t('voiceAppointmentAssistant.missingServicePrice'));
        }
        const response = await apiRequest('POST', '/api/services', {
          name: readyDraft.serviceName,
          duration: readyDraft.durationMinutes,
          price: readyDraft.servicePrice,
          color: '#7c3aed'
        });
        const createdService = await response.json();
        serviceId = createdService.id;
      }
      if (!serviceId) {
        throw new Error(t('voiceAppointmentAssistant.unauthorizedService'));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
      ]);

      const formDraft: VoiceAppointmentFormDraft = {
        clientId,
        serviceId,
        clientName: readyDraft.clientName,
        serviceName: readyDraft.serviceName,
        date: readyDraft.date,
        startTime: readyDraft.startTime.substring(0, 5),
        durationMinutes: readyDraft.durationMinutes,
        notes: readyDraft.notes || '',
      };

      resetConversation();
      setOpen(false);
      if (window.location.pathname === '/calendar') {
        window.dispatchEvent(new CustomEvent(VOICE_APPOINTMENT_DRAFT_EVENT, { detail: formDraft }));
      } else {
        sessionStorage.setItem(VOICE_APPOINTMENT_DRAFT_STORAGE_KEY, JSON.stringify(formDraft));
        window.location.assign('/calendar');
      }
    } catch (error) {
      console.error('[AI APPOINTMENT ASSISTANT] Appointment creation error:', error);
      addAssistantMessage(t('voiceAppointmentAssistant.creationError'));
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
      const detectedConfirmation = detectAssistantConfirmation(
        userMessage,
        i18n.resolvedLanguage || i18n.language
      );
      const isExpectedServiceName = Boolean(
        !draft.serviceName &&
        draft.clientName &&
        draft.date &&
        draft.startTime
      );
      let interpretation: Interpretation;

      if (pendingQuestion === 'choose_service') {
        interpretation = {
          serviceName: detectedConfirmation === 'unknown' ? userMessage : null,
          confirmation: detectedConfirmation
        };
      } else if (pendingQuestion && detectedConfirmation !== 'unknown') {
        interpretation = { confirmation: detectedConfirmation };
      } else if (isExpectedServiceName) {
        interpretation = {
          serviceName: userMessage,
          confirmation: detectedConfirmation
        };
      } else {
        const response = await apiRequest('POST', '/api/ai-appointment-assistant/interpret', {
          message: userMessage,
          draft: {
            clientName: draft.clientName,
            date: draft.date,
            startTime: draft.startTime,
            serviceName: draft.serviceName,
            durationMinutes: draft.durationMinutes,
            servicePrice: draft.servicePrice,
            notes: draft.notes
          },
          language: i18n.resolvedLanguage || i18n.language
        });
        interpretation = await response.json() as Interpretation;
      }
      const confirmation = detectedConfirmation === 'unknown'
        ? interpretation.confirmation
        : detectedConfirmation;
      let nextDraft = mergeInterpretation(draft, interpretation);

      if (pendingQuestion === 'suggest_client') {
        const exactClient = findAssistantClient(clients, nextDraft.clientName || '');
        const suggestedClient = findAssistantClientSuggestion(clients, draft.clientName || '');
        const requestedAnotherClient = Boolean(
          nextDraft.clientName &&
          normalizeAssistantName(nextDraft.clientName) !== normalizeAssistantName(draft.clientName)
        );

        if (exactClient) {
          nextDraft.clientId = exactClient.id;
          nextDraft.clientName = `${exactClient.firstName} ${exactClient.lastName || ''}`.trim();
          nextDraft.createClientApproved = false;
          setPendingQuestion(null);
        } else if (confirmation === 'yes' && suggestedClient) {
          nextDraft.clientId = suggestedClient.client.id;
          nextDraft.clientName =
            `${suggestedClient.client.firstName} ${suggestedClient.client.lastName || ''}`.trim();
          nextDraft.createClientApproved = false;
          setPendingQuestion(null);
        } else if (requestedAnotherClient) {
          nextDraft.clientId = null;
          nextDraft.createClientApproved = false;
          setPendingQuestion(null);
          nextDraft = askNextQuestion(nextDraft);
          setDraft({ ...nextDraft });
          return;
        } else if (confirmation === 'no') {
          nextDraft.clientName = null;
          nextDraft.clientId = null;
          nextDraft.createClientApproved = false;
          setDraft(nextDraft);
          setPendingQuestion(null);
          addAssistantMessage(t('voiceAppointmentAssistant.okExistingClient'), { autoListen: true });
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage(
            t('voiceAppointmentAssistant.confirmClientSuggestion'),
            { autoListen: true }
          );
          return;
        }
      }

      if (pendingQuestion === 'create_client') {
        // A user may correct or repeat the name after the first lookup
        // ("cerca meglio Andrea Zambelli"). Retry the catalog lookup before
        // interpreting the message as a yes/no answer to client creation.
        const existingClient = findAssistantClient(clients, nextDraft.clientName || '');
        if (existingClient) {
          nextDraft.clientId = existingClient.id;
          nextDraft.clientName = `${existingClient.firstName} ${existingClient.lastName || ''}`.trim();
          nextDraft.createClientApproved = false;
          setPendingQuestion(null);
        } else if (confirmation === 'yes') {
          nextDraft.createClientApproved = true;
          setPendingQuestion(null);
        } else if (confirmation === 'no') {
          nextDraft.clientName = null;
          nextDraft.clientId = null;
          nextDraft.createClientApproved = false;
          setDraft(nextDraft);
          setPendingQuestion(null);
          addAssistantMessage(t('voiceAppointmentAssistant.okExistingClient'), { autoListen: true });
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage(t('voiceAppointmentAssistant.confirmClient'), { autoListen: true });
          return;
        }
      }

      if (pendingQuestion === 'suggest_service') {
        const exactService = findAssistantService(services, nextDraft.serviceName || '');
        const suggestedService = findAssistantServiceSuggestion(services, draft.serviceName || '');
        const requestedAnotherService = Boolean(
          nextDraft.serviceName &&
          nextDraft.serviceName !== draft.serviceName
        );

        if (exactService) {
          nextDraft.serviceId = exactService.id;
          nextDraft.serviceName = exactService.name;
          nextDraft.durationMinutes = exactService.duration || 60;
          setPendingQuestion(null);
        } else if (confirmation === 'yes' && suggestedService) {
          nextDraft.serviceId = suggestedService.service.id;
          nextDraft.serviceName = suggestedService.service.name;
          nextDraft.durationMinutes = suggestedService.service.duration || 60;
          nextDraft.createServiceApproved = false;
          setPendingQuestion(null);
        } else if (requestedAnotherService) {
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = false;
          setPendingQuestion(null);
          nextDraft = askNextQuestion(nextDraft);
          setDraft({ ...nextDraft });
          return;
        } else if (confirmation === 'no') {
          nextDraft.serviceName = null;
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = false;
          setDraft(nextDraft);
          setPendingQuestion(null);
          addAssistantMessage(t('voiceAppointmentAssistant.okExistingService'), { autoListen: true });
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage(t('voiceAppointmentAssistant.confirmServiceSuggestion'), { autoListen: true });
          return;
        }
      }

      if (pendingQuestion === 'choose_service') {
        const exactService = findAssistantService(services, nextDraft.serviceName || '');
        const normalizedAnswer = normalizeAssistantName(userMessage);
        const requestedOtherService =
          confirmation === 'no' ||
          ['altro', 'altra', 'other', 'another'].includes(normalizedAnswer);

        if (requestedOtherService) {
          nextDraft.serviceId = null;
          nextDraft.serviceName = null;
          nextDraft.durationMinutes = null;
          nextDraft.createServiceApproved = false;
          setServicePickerOpen(false);
          setPendingQuestion(null);
          setDraft(nextDraft);
          addAssistantMessage(t('voiceAppointmentAssistant.askOtherService'), { autoListen: true });
          return;
        } else if (exactService) {
          nextDraft.serviceId = exactService.id;
          nextDraft.serviceName = exactService.name;
          nextDraft.durationMinutes = exactService.duration || 60;
          nextDraft.createServiceApproved = false;
          setServicePickerOpen(false);
          setPendingQuestion(null);
        } else if (nextDraft.serviceName && nextDraft.serviceName !== draft.serviceName) {
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = false;
          setServicePickerOpen(false);
          setPendingQuestion('create_service');
          setDraft(nextDraft);
          addAssistantMessage(
            t('voiceAppointmentAssistant.serviceNotFound', { name: nextDraft.serviceName }),
            { autoListen: true }
          );
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage(
            t('voiceAppointmentAssistant.chooseListedService', { name: draft.serviceName }),
            { autoListen: true }
          );
          return;
        }
      }

      if (pendingQuestion === 'create_service') {
        const requestedAnotherService = Boolean(
          nextDraft.serviceName &&
          nextDraft.serviceName !== draft.serviceName
        );
        if (confirmation === 'yes') {
          nextDraft.serviceName = draft.serviceName;
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = true;
          setServicePickerOpen(false);
          setPendingQuestion(null);
        } else if (requestedAnotherService) {
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = false;
          setServicePickerOpen(false);
          setPendingQuestion(null);
          nextDraft = askNextQuestion(nextDraft);
          setDraft({ ...nextDraft });
          return;
        } else if (confirmation === 'no') {
          nextDraft.serviceName = null;
          nextDraft.serviceId = null;
          nextDraft.createServiceApproved = false;
          setServicePickerOpen(false);
          setDraft(nextDraft);
          setPendingQuestion(null);
          addAssistantMessage(t('voiceAppointmentAssistant.okExistingService'), { autoListen: true });
          return;
        } else {
          setDraft(nextDraft);
          addAssistantMessage(t('voiceAppointmentAssistant.confirmService'), { autoListen: true });
          return;
        }
      }

      if (pendingQuestion === 'confirm_appointment') {
        if (confirmation === 'yes') {
          setDraft(nextDraft);
          await openManualAppointmentForm(nextDraft);
          return;
        }
        if (confirmation === 'no') {
          setPendingQuestion(null);
          setDraft(nextDraft);
          addAssistantMessage(t('voiceAppointmentAssistant.modify'), { autoListen: true });
          return;
        }
      }

      nextDraft = askNextQuestion(nextDraft);
      setDraft({ ...nextDraft });
    } catch (error) {
      console.error('[AI APPOINTMENT ASSISTANT] Interpretation error:', error);
      addAssistantMessage(t('voiceAppointmentAssistant.interpretationError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    if (isCatalogLoading) {
      addAssistantMessage(t('voiceAppointmentAssistant.loadingCatalog'));
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addAssistantMessage(
        t('voiceAppointmentAssistant.unsupportedVoice'),
        { autoListen: false }
      );
      return;
    }

    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      addAssistantMessage(t('voiceAppointmentAssistant.listenError'), { autoListen: false });
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
  startListeningRef.current = startListening;

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const cancelServicePicker = () => {
    setServicePickerOpen(false);
    setPendingQuestion(null);
    setDraft(previous => ({
      ...previous,
      serviceId: null,
      serviceName: null,
      durationMinutes: null,
      servicePrice: null,
      createServiceApproved: false
    }));
    addAssistantMessage(t('voiceAppointmentAssistant.okExistingService'), { autoListen: true });
  };

  const selectServiceFromPicker = (service: AssistantService) => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
    setServicePickerOpen(false);
    setPendingQuestion(null);
    const selectedDraft: AssistantDraft = {
      ...draft,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.duration || 60,
      createServiceApproved: false
    };
    const nextDraft = askNextQuestion(selectedDraft);
    setDraft({ ...nextDraft });
  };

  const handleDialogDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dialogPosition.x,
      originY: dialogPosition.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDialogDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const maxX = Math.max(0, window.innerWidth / 2 - 96);
    const maxY = Math.max(0, window.innerHeight / 2 - 96);
    const nextX = dragState.originX + event.clientX - dragState.startX;
    const nextY = dragState.originY + event.clientY - dragState.startY;
    setDialogPosition({
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY))
    });
  };

  const handleDialogDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetConversation = () => {
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel();
    setMessages([]);
    setDraft({});
    setPendingQuestion(null);
    setServicePickerOpen(false);
    setServicePickerOptions([]);
    setInput('');
    setIsListening(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDialogPosition({ x: 0, y: 0 });
    }
    if (!nextOpen) {
      dragStateRef.current = null;
      setServicePickerOpen(false);
      setServicePickerOptions([]);
      recognitionRef.current?.stop?.();
      window.speechSynthesis?.cancel();
      setIsListening(false);
    }
  };

  return (
    <>
      <div
        className="appointment-action-shell fixed bottom-5 right-5 z-40 flex items-center gap-2.5"
        data-voice-appointment-trigger
      >
        <span
          className="appointment-action-label relative hidden whitespace-nowrap rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-extrabold text-violet-800 shadow-[0_8px_18px_rgba(84,58,145,0.12)] after:absolute after:right-[-5px] after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-y-1/2 after:rotate-45 after:border-r after:border-t after:border-violet-200 after:bg-violet-50 sm:inline-flex"
          aria-hidden="true"
        >
          {t('navigation.aiAssistant')}
        </span>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="appointment-action-control appointment-action-pulse-ai h-12 w-12 shrink-0 rounded-full bg-violet-600 p-0 text-white shadow-[0_0_0_6px_rgba(124,58,237,0.11),0_13px_25px_rgba(84,58,145,0.28)] transition-all hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-[0_0_0_7px_rgba(124,58,237,0.15),0_17px_30px_rgba(84,58,145,0.30)] focus-visible:ring-4 focus-visible:ring-violet-300"
          aria-label={t('voiceAppointmentAssistant.openAriaLabel')}
          title={t('voiceAppointmentAssistant.openTitle')}
          data-testid="button-open-voice-appointment-assistant"
        >
          <Mic className="h-6 w-6" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0"
          overlayClassName="bg-black/15"
          style={{
            marginLeft: `${dialogPosition.x}px`,
            marginTop: `${dialogPosition.y}px`
          }}
        >
          <DialogHeader
            className="touch-none select-none cursor-grab border-b bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 text-white active:cursor-grabbing"
            onPointerDown={handleDialogDragStart}
            onPointerMove={handleDialogDragMove}
            onPointerUp={handleDialogDragEnd}
            onPointerCancel={handleDialogDragEnd}
          >
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5" />
              {t('voiceAppointmentAssistant.title')}
              <GripHorizontal className="ml-auto h-4 w-4 opacity-75" aria-hidden="true" />
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
                    ? t('voiceAppointmentAssistant.loading')
                    : isSaving
                      ? t('voiceAppointmentAssistant.saving')
                      : t('voiceAppointmentAssistant.processing')}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {servicePickerOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="service-picker-title"
                className="flex max-h-[80%] w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-5 shadow-2xl"
              >
                <div>
                  <h2 id="service-picker-title" className="text-lg font-semibold">
                    {t('voiceAppointmentAssistant.servicePickerTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingQuestion === 'choose_service'
                      ? t('voiceAppointmentAssistant.serviceFamilyDescription', {
                          name: draft.serviceName
                        })
                      : t('voiceAppointmentAssistant.servicePickerDescription', {
                          name: draft.serviceName
                        })}
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {servicePickerOptions
                    .slice()
                    .sort((left, right) => left.name.localeCompare(right.name))
                    .map(service => (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => selectServiceFromPicker(service)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        <span className="font-medium">{service.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {service.duration || 60} min
                        </span>
                      </button>
                    ))}
                </div>

                {isListening && (
                  <div className="flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    <Mic className="h-4 w-4" />
                    {t('voiceAppointmentAssistant.listeningPlaceholder')}
                  </div>
                )}

                <Button type="button" variant="outline" onClick={cancelServicePicker}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}

          <div className="border-t bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('voiceAppointmentAssistant.minimumData')}
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
                {t('voiceAppointmentAssistant.restart')}
              </Button>
            </div>

            {pendingQuestion === 'confirm_appointment' && (
              <Button
                type="button"
                className="mb-2 w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openManualAppointmentForm(draft)}
                disabled={isProcessing || isSaving || isCatalogLoading}
                data-testid="button-confirm-ai-appointment"
              >
                <CalendarPlus className="h-4 w-4" />
                {t('voiceAppointmentAssistant.confirmButton')}
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={isListening ? 'default' : 'outline'}
                size="icon"
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isSaving || isCatalogLoading}
                className={isListening
                  ? 'bg-emerald-600 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.2)] hover:bg-emerald-700'
                  : undefined}
                 aria-label={isListening
                   ? t('voiceAppointmentAssistant.stopListening')
                   : t('voiceAppointmentAssistant.startListening')}
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
                placeholder={isListening
                  ? t('voiceAppointmentAssistant.listeningPlaceholder')
                  : t('voiceAppointmentAssistant.inputPlaceholder')}
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