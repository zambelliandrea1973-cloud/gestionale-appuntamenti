import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Check, Loader2, Mic, MicOff, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AITrialNotice } from '@/components/AITrialNotice';
import AppointmentModeSwitch from './AppointmentModeSwitch';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ApiRequestError } from '@/lib/apiError';
import { createAssistantTrialConversation } from '@/lib/assistantTrialConversation';
import { createAssistantRecognition } from '@/lib/assistantRecognition';
import { startLiveAppointmentSession, type LiveAppointmentSession } from '@/lib/liveAppointmentSession';
import { prepareLiveGreeting } from '@/lib/liveAppointmentGreeting';
import type { LiveInterpretation } from '../../../shared/liveAppointmentProtocol';
import { getCachedAssistantGreeting, prepareAssistantGreeting, speakOfflineAssistantGreeting } from '@/lib/offlineAssistantGreeting';
import { detectAssistantConfirmation, formatAssistantDate, getAssistantGreetingName } from '@/lib/appointmentAssistant';
import { AI_TRIAL_ACCESS_KEY, aiTrialMessageKey, useAITrialAccess, type AITrialAccess } from '@/hooks/use-ai-trial-access';
import { PERSONAL_APPOINTMENTS_QUERY, notifyPersonalAppointmentSaved } from '@/hooks/use-personal-appointments';
import { completePersonalAppointmentDraft, personalAppointmentSchema, type PersonalAppointmentInput } from '../../../shared/personalAppointments';

type Draft = Partial<PersonalAppointmentInput> & { durationMinutes?: number };
type Message = { role: 'assistant' | 'user'; content: string };
export default function PersonalVoiceAppointmentAssistant({ professionalEmail }: { professionalEmail?: string }) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [conversationActive, setConversationActive] = useState(false);
  const [trialBlocked, setTrialBlocked] = useState(false);
  const trial = useAITrialAccess(open);
  const conversation = useRef(createAssistantTrialConversation());
  const recognition = useRef<any>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSequence = useRef(0);
  const speechRequest = useRef<AbortController | null>(null);
  const speechTimers = useRef<number[]>([]);
  const offlineGreeting = useRef<{ cancel: () => void } | null>(null);
  const openRef = useRef(false);
  const listenRef = useRef<() => void>(() => {});
  const pendingAutoListen = useRef(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const submitRef = useRef<(text: string) => Promise<void>>(async () => {});
  const liveSession = useRef<LiveAppointmentSession | null>(null);
  const liveFields = useRef<LiveInterpretation | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const blocked = trialBlocked || Boolean(trial.data && !trial.data.unlimited &&
    (!trial.data.eligible || (trial.data.appointments.remaining === 0 && !conversationActive)));
  const locale = i18n.resolvedLanguage || i18n.language || 'it';
  const speechLocale = ({ it:'it-IT', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES', nl:'nl-NL', no:'nb-NO', ro:'ro-RO', ru:'ru-RU', hi:'hi-IN', ar:'ar-SA' } as Record<string,string>)[locale.split('-')[0]] || locale;
  const greetingName = getAssistantGreetingName(professionalEmail);
  const greetingText = `${greetingName ? t('voiceAppointmentAssistant.greeting', { name: greetingName }) : t('voiceAppointmentAssistant.greetingFallback')}. ${t('personalAppointments.voiceGreeting', 'Dimmi pure.')}`;
  useEffect(() => { prepareLiveGreeting({ mode: 'personal', language: speechLocale, greeting: greetingText }); }, [speechLocale, greetingText]);
  const ready = personalAppointmentSchema.safeParse({ ...completePersonalAppointmentDraft(draft), location: draft.location || '', notes: draft.notes || '' });
  function clearSpeechTimers() {
    speechTimers.current.forEach(timer => window.clearTimeout(timer));
    speechTimers.current = [];
  }
  function stopAudio() {
    offlineGreeting.current?.cancel();
    offlineGreeting.current = null;
    speechSequence.current++;
    clearSpeechTimers();
    speechRequest.current?.abort();
    speechRequest.current = null;
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
      window.speechSynthesis?.cancel();
    }
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
    }
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }
  function cancelRecognition() {
    const engine = recognition.current;
    recognition.current = null;
    engine?.cancel();
    if (!liveSession.current?.ready()) setListening(false);
  }
  function stop() {
    liveSession.current?.close();
    liveSession.current = null;
    liveFields.current = null;
    generation.current++;
    pendingAutoListen.current = false;
    cancelRecognition();
    stopAudio();
  }
  useEffect(() => () => { openRef.current = false; stop(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages, processing]);
  async function speak(text: string) {
    liveSession.current?.respond(text);
  }
  async function legacySpeak(text: string) {
    const token = generation.current;
    stopAudio();
    const sequence = speechSequence.current;
    const isCurrent = () => openRef.current && token === generation.current && sequence === speechSequence.current;
    let completed = false;
    let fallbackStarted = false;
    const complete = () => {
      if (completed || !isCurrent()) return;
      completed = true;
      stopAudio();
      if (inFlight.current) pendingAutoListen.current = true;
      else listenRef.current();
    };
    const deviceSpeech = () => {
      if (!isCurrent() || fallbackStarted) return;
      fallbackStarted = true;
      clearSpeechTimers();
      speechRequest.current?.abort();
      speechRequest.current = null;
      if (audio.current) {
        audio.current.onended = audio.current.onerror = null;
        audio.current.pause();
      }
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        const message = new SpeechSynthesisUtterance(text);
        utterance.current = message;
        message.lang = speechLocale;
        const voices = window.speechSynthesis.getVoices();
        const matchingVoices = voices.filter(voice => voice.lang.startsWith(speechLocale.split('-')[0]));
        message.voice = matchingVoices.find(voice =>
          /female|woman|femmina|elsa|isabella|alice|federica|paola|samantha|victoria|zira|aria|jenny|sara|helena|amelie|audrey|katja|sabina|luciana/i.test(voice.name)
        ) || matchingVoices.find(voice => voice.lang === speechLocale) || matchingVoices[0] || null;
        message.rate = 0.94;
        message.pitch = 1.08;
        // Some Android browsers expose synthesis but never emit start/end.
        // Neither a missing start nor a missing end may permanently lock dictation.
        const startTimer = window.setTimeout(() => {
          if (!isCurrent()) return;
          setError(t('personalAppointments.speechError', 'Risposta vocale non disponibile. Puoi continuare nella chat.'));
          complete();
        }, 5000);
        speechTimers.current.push(startTimer);
        message.onstart = () => {
          window.clearTimeout(startTimer);
          if (!isCurrent()) return;
          speechTimers.current.push(window.setTimeout(() => {
            if (!isCurrent()) return;
            setError(t('personalAppointments.speechError', 'Risposta vocale non disponibile. Puoi continuare nella chat.'));
            complete();
          }, Math.min(120000, Math.max(20000, text.length * 110))));
        };
        message.onend = complete;
        message.onerror = () => {
          if (!isCurrent()) return;
          setError(t('personalAppointments.speechError', 'Risposta vocale non disponibile. Puoi continuare nella chat.'));
          complete();
        };
        try { window.speechSynthesis.speak(message); } catch {
          if (!isCurrent()) return;
          setError(t('personalAppointments.speechError', 'Risposta vocale non disponibile. Puoi continuare nella chat.'));
          complete();
        }
      } else complete();
    };
    const controller = new AbortController();
    speechRequest.current = controller;
    speechTimers.current.push(window.setTimeout(deviceSpeech, 22000));
    try {
      // Paid accounts may use central AI speech for the greeting without a
      // conversation. Trial greetings stay on-device and do not spend a trial.
      if (!conversation.current.isActive()) {
        const access = trial.data ?? await queryClient.fetchQuery<AITrialAccess>({
          queryKey: AI_TRIAL_ACCESS_KEY,
        });
        if (!isCurrent() || fallbackStarted) return;
        if (!access.unlimited) { deviceSpeech(); return; }
      }
      const response = await apiRequest('POST', '/api/ai-appointment-assistant/speech', {
        text, language: speechLocale, conversationId: conversation.current.getId(),
      }, { signal: controller.signal });
      const blob = await response.blob();
      if (!isCurrent() || fallbackStarted) return;
      clearSpeechTimers();
      audioUrl.current = URL.createObjectURL(blob);
      const player = new Audio(audioUrl.current);
      audio.current = player;
      player.onended = complete;
      speechTimers.current.push(window.setTimeout(deviceSpeech,
        Math.min(120000, Math.max(20000, text.length * 110))));
      player.onerror = () => {
        if (!isCurrent()) return;
        player.onended = player.onerror = null;
        player.pause();
        deviceSpeech();
      };
      await player.play();
    } catch (failure) {
      if (!isCurrent() || fallbackStarted) return;
      const key = aiTrialMessageKey(failure);
      if (key) { stopAudio(); setTrialBlocked(true); setError(t(key)); }
      else {
        if (audio.current) {
          audio.current.onended = audio.current.onerror = null;
          audio.current.pause();
        }
        deviceSpeech();
      }
    }
  }
  async function say(text: string) {
    setMessages(previous => [...previous, { role: 'assistant', content: text }]);
    await speak(text);
  }
  const save = useMutation({
    mutationFn: async (value: PersonalAppointmentInput) => {
      const response = await apiRequest('POST', '/api/personal-appointments', value);
      return response.json();
    },
    onSuccess: async saved => {
      await queryClient.invalidateQueries({ queryKey: PERSONAL_APPOINTMENTS_QUERY });
      notifyPersonalAppointmentSaved(saved.date, true);
      navigate('/calendar');
      openRef.current = false;
      setOpen(false); stop();
    },
    onError: () => setError(t('personalAppointments.saveError', 'Non riesco a salvare l’impegno. Riprova: i campi sono stati conservati.')),
  });
  async function submit(text: string) {
    if (!open || !text.trim() || blocked || inFlight.current || save.isPending) return;
    if (liveSession.current?.ready() && !liveFields.current) {
      liveSession.current.sendText(text);
      setInput('');
      return;
    }
    pendingAutoListen.current = false;
    cancelRecognition();
    stopAudio();
    inFlight.current = true;
    const token = generation.current;
    setInput(''); setError(''); setProcessing(true);
    setMessages(previous => [...previous, { role: 'user', content: text.trim() }]);
    try {
      await conversation.current.ensure(async () => (await apiRequest('POST', '/api/ai-appointment-assistant/conversation', {})).json());
      if (token !== generation.current) return;
      setConversationActive(true);
      void queryClient.invalidateQueries({ queryKey: AI_TRIAL_ACCESS_KEY });
      let result: any = liveFields.current;
      liveFields.current = null;
      if (!result) {
        const response = await apiRequest('POST', '/api/ai-appointment-assistant/interpret', {
          appointmentKind: 'personal', conversationId: conversation.current.getId(), message: text.trim(), draft, language: locale,
        });
        result = await response.json();
      }
      if (token !== generation.current) return;
      const next: Draft = { ...draft };
      for (const key of ['title','date','startTime','endTime','location','notes','durationMinutes'] as const) {
        if (result[key] !== null && result[key] !== undefined) (next as any)[key] = result[key];
      }
      if (result.durationMinutes != null && result.endTime == null) delete next.endTime;
      setDraft(next);
      const valid = personalAppointmentSchema.safeParse({ ...completePersonalAppointmentDraft(next), location: next.location || '', notes: next.notes || '' });
      // A confirmation with a correction must show the changed draft first.
      // Never trust an AI-produced "yes" to authorize a database write.
      if (valid.success && ready.success && detectAssistantConfirmation(text, locale) === 'yes' &&
        Object.keys(ready.data).every(key => ready.data[key as keyof PersonalAppointmentInput] === valid.data[key as keyof PersonalAppointmentInput])) {
        try { await save.mutateAsync(valid.data); }
        catch { await say(t('personalAppointments.saveError', 'Non riesco a salvare l’impegno. Riprova: i campi sono stati conservati.')); }
        return;
      }
      if (detectAssistantConfirmation(text, locale) === 'no') await say(t('personalAppointments.askChange', 'Dimmi cosa vuoi cambiare nella bozza.'));
      else if (!next.title) await say(t('personalAppointments.askTitle', 'Come vuoi chiamare questo impegno?'));
      else if (!next.date) await say(t('voiceAppointmentAssistant.askDate'));
      else if (!next.startTime) await say(t('voiceAppointmentAssistant.askTime'));
      else if (!valid.success) await say(t('personalAppointments.invalid', 'Inserisci un titolo, una data valida e un orario di fine successivo all’inizio.'));
      else await say(t('personalAppointments.askConfirm', 'Controlla titolo, data e orari nella bozza. Vuoi confermare questo impegno?'));
    } catch (failure) {
      if (token !== generation.current) return;
      const key = aiTrialMessageKey(failure);
      if (key) { setError(t(key)); setTrialBlocked(true); }
      else setError(t('personalAppointments.aiError', 'Non riesco a interpretare la richiesta. Riprova oppure usa il modulo manuale.'));
    } finally {
      if (token === generation.current) {
        setProcessing(false); inFlight.current = false;
        if (pendingAutoListen.current) {
          pendingAutoListen.current = false;
          listenRef.current();
        }
      }
    }
  }
  submitRef.current = submit;
  function listen() {
    if (liveSession.current?.active()) { liveSession.current.setMuted(listening); return; }
    beginLive();
  }
  function legacyListen() {
    if (!openRef.current || blocked || inFlight.current || save.isPending) return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return setError(t('personalAppointments.micUnsupported', 'Questo browser non supporta la dettatura. Puoi scrivere la richiesta.'));
    if (recognition.current?.active()) {
      pendingAutoListen.current = false;
      recognition.current.finish();
      return;
    }
    pendingAutoListen.current = false;
    stopAudio();
    const token = generation.current;
    const isCurrent = () => openRef.current && token === generation.current;
    const session = createAssistantRecognition({
      Recognition, language: speechLocale,
      onListening: value => { if (isCurrent()) setListening(value); },
      onTranscript: text => { if (isCurrent()) setInput(text); },
      onComplete: text => {
        if (!isCurrent()) return;
        recognition.current = null;
        submitRef.current(text);
      },
      onError: () => {
        if (!isCurrent()) return;
        recognition.current = null;
        setError(t('personalAppointments.micError', 'Non riesco ad accedere al microfono. Controlla i permessi o scrivi la richiesta.'));
      },
    });
    recognition.current = session.active() ? session : null;
  }
  listenRef.current = listen;
  function beginLive() {
    if (!openRef.current || blocked) return;
    liveSession.current?.close();
    const token = generation.current;
    liveSession.current = startLiveAppointmentSession({
      mode: 'personal', language: speechLocale, greeting: greetingText, conversationId: conversation.current.getId(),
      onListening: value => { if (token === generation.current) setListening(value); },
      onTranscript: text => { if (token === generation.current) setInput(text); },
      onActive: id => {
        if (token !== generation.current) return;
        if (conversation.current.getId() !== id) conversation.current.reset();
        void conversation.current.ensure(async () => ({ conversationId: id })).then(() => {
          if (token === generation.current) setConversationActive(true);
        }).catch(() => {});
        void queryClient.invalidateQueries({ queryKey: AI_TRIAL_ACCESS_KEY });
      },
      onTurn: async (text, fields) => {
        if (token !== generation.current) return;
        liveFields.current = fields;
        try { await submitRef.current(text); } finally { liveFields.current = null; }
      },
      onError: code => {
        if (token !== generation.current) return;
        liveSession.current = null;
        setListening(false);
        const key = aiTrialMessageKey(new ApiRequestError(code, 503, code));
        if (key) { setTrialBlocked(true); setError(t(key)); }
        else setError(t(code === 'LIVE_NOT_CONFIGURED' ? 'personalAppointments.liveNotConfigured' : 'personalAppointments.liveUnavailable'));
      },
    });
  }
  function changeOpen(value: boolean) {
    if (save.isPending) return;
    stop(); conversation.current.reset(); inFlight.current = false;
    openRef.current = value;
    setOpen(value); setListening(false); setProcessing(false); setConversationActive(false); setTrialBlocked(false); setError('');
    if (value) {
      const greetingName = getAssistantGreetingName(professionalEmail);
      const greeting = greetingName
        ? t('voiceAppointmentAssistant.greeting', { name: greetingName })
        : t('voiceAppointmentAssistant.greetingFallback');
      setDraft({});
      setInput('');
      setMessages([{ role: 'assistant', content: `${greeting}. ${t('personalAppointments.voiceGreeting', 'Dimmi pure.')}` }]);
      beginLive();
    }
  }
  return <>
    <div className="appointment-action-shell fixed bottom-5 right-2 sm:right-5 z-40 flex items-center gap-2" data-voice-appointment-trigger>
      <div className="hidden sm:contents"><span className="appointment-action-label whitespace-nowrap rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-extrabold text-violet-800">{t('navigation.aiAssistant')}</span></div>
      <Button aria-label={t('voiceAppointmentAssistant.openAriaLabel')} onClick={() => changeOpen(true)} className="appointment-action-control appointment-action-pulse-ai h-12 w-12 rounded-full bg-violet-600 p-0 text-white"><Mic className="h-6 w-6" /></Button>
      <AppointmentModeSwitch />
    </div>
    <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[88vh] overflow-y-auto p-0 gap-0" overlayClassName="bg-black/15">
      <DialogHeader className="border-b bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 text-white"><DialogTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5" />{t('personalAppointments.new')}</DialogTitle></DialogHeader>
      <div className="px-4 pt-3"><AITrialNotice feature="appointments" activeConversation={conversationActive} blocked={trialBlocked} /></div>
      <div className="space-y-3 px-4 py-4 max-h-[45vh] overflow-y-auto">
        {messages.map((message, index) => <p key={index} className={`rounded-xl p-3 text-sm ${message.role === 'user' ? 'ml-8 bg-violet-100' : 'mr-8 border bg-gray-50'}`}>{message.content}</p>)}
        {processing && <Loader2 aria-label={t('common.loading')} className="h-5 w-5 animate-spin text-violet-600" />}
        <div ref={chatEnd} />
      </div>
      {ready.success && <div className="mx-4 mb-3 rounded-xl border p-3 text-sm bg-white">
        <h3 className="font-bold">{ready.data.title}</h3><p className="mt-1">{formatAssistantDate(ready.data.date, locale)} · {ready.data.startTime}–{ready.data.endTime}</p>
        {ready.data.location && <p>{ready.data.location}</p>}{ready.data.notes && <p>{ready.data.notes}</p>}
        <Button disabled={processing || save.isPending} onClick={() => save.mutate(ready.data)} className="mt-3 bg-violet-600 text-white"><Check className="h-4 w-4 mr-2" />{t('personalAppointments.confirm', 'Conferma impegno')}</Button>
      </div>}
      {error && <p role="alert" className="mx-4 mb-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2 border-t p-4">
        <Button aria-label={listening ? t('personalAppointments.stopMic', 'Ferma microfono') : t('personalAppointments.startMic', 'Detta un impegno')} aria-pressed={listening} className={listening ? 'border-emerald-500 bg-emerald-100 text-emerald-800' : undefined} disabled={blocked || processing || save.isPending} onClick={() => { setError(''); listen(); }} variant="outline">{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
        <form className="flex flex-1 min-w-0 gap-2" onSubmit={event => { event.preventDefault(); void submit(input); }}>
          <Input aria-label={t('personalAppointments.request', 'Richiesta per l’impegno personale')} value={input} onChange={event => setInput(event.target.value)} disabled={blocked || save.isPending} placeholder={t('personalAppointments.voicePlaceholder', 'Es. Dentista domani alle 15 per un’ora')} />
          <Button type="submit" aria-label={t('personalAppointments.send', 'Invia richiesta')} disabled={blocked || processing || save.isPending || !input.trim()} className="bg-violet-600 text-white"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </DialogContent></Dialog>
  </>;
}