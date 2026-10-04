import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Cloud, LockKeyhole, Mic, Pencil, Plus, ShieldCheck, Trash2, UnlockKeyhole, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { privateApi, PrivateApiError, setPrivateGoogleStatusHandler, type EventDraft, type PrivateEvent, type PrivateReminder } from './api';
import { usePrivateAppointments } from './PrivateAppointmentsProvider';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AITrialNotice } from '@/components/AITrialNotice';
import { AI_TRIAL_ACCESS_KEY, useAITrialAccess } from '@/hooks/use-ai-trial-access';
import './private-appointments.css';

const toDateString = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const isoToday = () => toDateString(new Date());
const freshDraft = (date = isoToday()): EventDraft => ({ title:'', startDate:date, endDate:date, startTime:'09:00', endTime:'09:30', allDay:false, location:'', description:'', recurrence:'none', reminderMinutes:null });
const dateLabel = (value:string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
const rangeFor = (cursor:Date, period:'day'|'week'|'month') => {
  const start=new Date(cursor), end=new Date(cursor);
  if(period==='month'){start.setDate(1);end.setMonth(end.getMonth()+1,0);}
  if(period==='week'){const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);end.setTime(start.getTime());end.setDate(end.getDate()+6);}
  return [toDateString(start),toDateString(end)] as const;
};
const timeLabel = (event:PrivateEvent) => event.allDay ? 'Tutto il giorno' : `${event.startTime || '—'}${event.endTime ? ` – ${event.endTime}` : ''}`;
const card = 'rounded-xl border border-[#dfe4dc] bg-[#fffefa] shadow-[0_5px_20px_rgba(49,65,52,.045)]';

function AppointmentForm({ initial, defaults, defaultDate, onClose, onSaved, sessionKey, isSessionCurrent }: {initial:EventDraft|null;defaults:Partial<EventDraft>|null;defaultDate:string;onClose:()=>void;onSaved:(event:PrivateEvent)=>void;sessionKey:string;isSessionCurrent:(key:string)=>boolean}) {
  const [draft,setDraft] = useState<EventDraft>(() => initial
    ? initial.source==='local'&&initial.recurrence!=='none'
      ? {...initial,startDate:initial.seriesStartDate||initial.startDate,endDate:initial.seriesEndDate||initial.endDate}
      : initial
    : {...freshDraft(defaultDate),...defaults});
  const [saving,setSaving] = useState(false), [problem,setProblem] = useState('');
  const [conflict,setConflict] = useState<any>(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const update = (key:keyof EventDraft,value:any) => setDraft(prev=>({...prev,[key]:value}));
  const submit = async (allowConflict=false) => {
    if(!isSessionCurrent(sessionKey))return;
    if (!draft.title.trim() || !draft.startDate || !draft.endDate) { setProblem('Inserisci titolo e date.'); return; }
    if (draft.endDate < draft.startDate || (!draft.allDay && draft.endDate===draft.startDate && (draft.endTime || '') <= (draft.startTime || ''))) { setProblem('La fine deve essere successiva all’inizio.'); return; }
    setSaving(true); setProblem('');
    const requestSession=sessionKey;
    try {
      const saved = await privateApi.save({...draft,title:draft.title.trim(),allowConflict});
      if(!mounted.current||!isSessionCurrent(requestSession))return;
      onSaved(saved); onClose();
    } catch (error) {
      if(!mounted.current||!isSessionCurrent(requestSession))return;
      const e = error as PrivateApiError;
      if (e.status===409 && e.body?.code==='WORK_CONFLICT' && !allowConflict) setConflict(e.body);
      else setProblem(e.message || 'Salvataggio non riuscito. Riprova.');
    } finally { if(mounted.current)setSaving(false); }
  };
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-[#29332d]/45 p-3" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="max-h-[92dvh] w-full max-w-[620px] overflow-auto rounded-2xl border border-[#e1e6df] bg-[#fffefa] shadow-[0_24px_90px_rgba(35,47,39,.24)]" role="dialog" aria-modal="true" aria-labelledby="private-form-title">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e7ebe4] bg-[#fffefa]/95 px-5 py-4 backdrop-blur">
        <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#71825f]">Spazio privato</p><h2 id="private-form-title" className="m-0 text-xl font-bold text-[#354439]">{draft.id?'Modifica impegno':'Nuovo impegno'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Chiudi" className="grid h-9 w-9 place-items-center rounded-lg text-[#66746a] hover:bg-[#f0f2ed]"><X size={18}/></button>
      </header>
      <div className="space-y-4 p-5">
        {(draft.recurrence||'none')!=='none'&&<p className="rounded-lg border border-[#e0e5dd] bg-[#f4f6f1] px-3 py-2 text-xs text-[#626e64]">Modifica dell’intera serie: la ricorrenza aggiorna tutte le occorrenze.</p>}
        {draft.source==='google' && <p className="rounded-lg border border-[#dedfdb] bg-[#f0f0ed] px-3 py-2 text-xs text-[#5e655f]">Evento Google personale: le modifiche verranno applicate anche alla copia collegata.</p>}
        <Field label="Titolo" required><input autoFocus className="pa-field" maxLength={200} value={draft.title} onChange={e=>update('title',e.target.value)} placeholder="Es. Pausa pranzo"/></Field>
        <label className="flex items-center gap-2 text-sm font-medium text-[#55645a]"><input type="checkbox" className="accent-[#657a50]" checked={draft.allDay} onChange={e=>update('allDay',e.target.checked)}/>Tutto il giorno</label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data inizio" required><input className="pa-field" type="date" value={draft.startDate} onChange={e=>{update('startDate',e.target.value);if(draft.endDate<e.target.value)update('endDate',e.target.value);}}/></Field>
          <Field label="Data fine" required><input className="pa-field" type="date" min={draft.startDate} value={draft.endDate} onChange={e=>update('endDate',e.target.value)}/></Field>
          {!draft.allDay && <><Field label="Ora inizio" required><input className="pa-field" type="time" value={draft.startTime||''} onChange={e=>update('startTime',e.target.value)}/></Field><Field label="Ora fine" required><input className="pa-field" type="time" value={draft.endTime||''} onChange={e=>update('endTime',e.target.value)}/></Field></>}
        </div>
        <Field label="Luogo"><input className="pa-field" maxLength={200} value={draft.location||''} onChange={e=>update('location',e.target.value)} placeholder="Facoltativo"/></Field>
        <Field label="Descrizione"><textarea className="pa-field min-h-[82px] resize-y" maxLength={4000} value={draft.description||''} onChange={e=>update('description',e.target.value)} placeholder="Aggiungi un dettaglio"/></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ripetizione"><select className="pa-field" value={draft.recurrence} onChange={e=>update('recurrence',e.target.value)}><option value="none">Nessuna</option><option value="daily">Ogni giorno</option><option value="weekly">Ogni settimana</option><option value="monthly">Ogni mese</option></select></Field>
          <Field label="Promemoria"><select className="pa-field" value={draft.reminderMinutes===null?'none':draft.reminderMinutes} onChange={e=>update('reminderMinutes',e.target.value==='none'?null:Number(e.target.value))}><option value="none">Nessuno</option><option value="0">All’ora dell’evento</option><option value="5">5 minuti prima</option><option value="15">15 minuti prima</option><option value="60">1 ora prima</option></select></Field>
        </div>
        {problem && <p className="m-0 rounded-lg bg-[#fff0ed] px-3 py-2 text-sm text-[#9c4b3d]" role="alert">{problem}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e7ebe4] pt-4">
          {draft.id ? <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#a14f43] hover:bg-[#fbefec]" onClick={()=>window.dispatchEvent(new CustomEvent('private-event-delete',{detail:draft.id}))}><Trash2 size={15}/>Elimina</button>:<span/>}
          <div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#657269] hover:bg-[#f1f3ef]">Annulla</button><button type="button" disabled={saving} onClick={()=>void submit()} className="rounded-lg bg-[#607449] px-4 py-2 text-sm font-bold text-white hover:bg-[#50633d] disabled:opacity-60">{saving?'Salvataggio…':'Salva impegno'}</button></div>
        </div>
      </div>
    </section>
    {conflict && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#29332d]/50 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-[#fffefa] p-5 shadow-xl"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#fbf1dc] text-[#95713a]"><AlertTriangle size={20}/></div><h3 className="m-0 text-lg font-bold text-[#354439]">Sovrapposizione con il lavoro</h3><p className="mt-2 text-sm leading-relaxed text-[#69766c]">Questo impegno coincide con uno o più appuntamenti di lavoro. Puoi modificarlo oppure registrarlo comunque.</p>{Array.isArray(conflict.conflicts)&&<ul className="my-3 max-h-28 overflow-auto text-xs text-[#69766c]">{conflict.conflicts.map((c:any,i:number)=><li key={i}>{c.title||'Appuntamento'} · {c.startTime||''}</li>)}</ul>}<div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-lg px-4 py-2 text-sm font-semibold text-[#657269] hover:bg-[#f1f3ef]" onClick={()=>setConflict(null)}>Modifica</button><button type="button" disabled={saving} className="rounded-lg bg-[#607449] px-4 py-2 text-sm font-bold text-white" onClick={()=>{setConflict(null);void submit(true);}}>Continua comunque</button></div></section></div>}
  </div>;
}
function Field({label,required,children}:{label:string;required?:boolean;children:any}) { return <label className="block text-xs font-semibold text-[#5c6b60]">{label}{required?' *':''}<div className="mt-1">{children}</div></label>; }

function VoiceComposer({onClose,onDraft,sessionKey,isSessionCurrent}:{onClose:()=>void;onDraft:(draft:Partial<EventDraft>)=>void;sessionKey:string;isSessionCurrent:(key:string)=>boolean}) {
  const [transcript,setTranscript]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [conversationActive,setConversationActive]=useState(false),[trialBlocked,setTrialBlocked]=useState(false);
  const recognition = useRef<any>(null), conversation = useRef<string|null>(null), convoPromise=useRef<Promise<string|null>|null>(null);
  const operation=useRef(0), mounted=useRef(true);
  const {i18n}=useTranslation();
  const queryClient=useQueryClient();
  const {data:trialAccess,isLoading:trialLoading}=useAITrialAccess(true);
  const begin = () => {
    const API=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!API){setStatus('Il riconoscimento vocale non è disponibile in questo browser. Scrivi la frase qui sotto.');return;}
    const rec=new API(); recognition.current=rec; rec.lang=i18n.resolvedLanguage||i18n.language||'it-IT';rec.interimResults=true;rec.continuous=false;
    rec.onresult=(e:any)=>{let text='';for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript;setTranscript(text);};
    rec.onerror=()=>setStatus('Non è stato possibile acquisire la voce. Puoi modificare la trascrizione.');rec.onend=()=>setStatus('Trascrizione pronta da rivedere.');rec.start();setStatus('In ascolto…');
  };
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;operation.current++;recognition.current?.stop?.();};},[]);
  const close=()=>{operation.current++;onClose();};
  const interpret = async () => {
    if(!transcript.trim()){setStatus('Scrivi o detta prima una frase.');return;}
    if(trialLoading){setStatus('Verifico l’accesso all’assistente…');return;}
    if(trialAccess&&!trialAccess.unlimited&&(!trialAccess.eligible||(trialAccess.appointments.remaining===0&&!conversationActive))){setTrialBlocked(true);setStatus('Il limite delle conversazioni AI disponibili è stato raggiunto.');return;}
    const requestId=++operation.current, requestSession=sessionKey;
    setBusy(true);setStatus('');
    try {
      if(!convoPromise.current) convoPromise.current=fetch('/api/ai-appointment-assistant/conversation',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'}).then(async r=>{if(!r.ok)throw new Error('Conversazione AI non disponibile.');const data=await r.json();return data.conversationId??null;});
      conversation.current=await convoPromise.current;
      if(!mounted.current||operation.current!==requestId||!isSessionCurrent(requestSession))return;
      setConversationActive(true);
      void queryClient.invalidateQueries({queryKey:AI_TRIAL_ACCESS_KEY});
      const interpreted=await privateApi.interpret({message:transcript,draft:{},language:i18n.resolvedLanguage||i18n.language||'it',conversationId:conversation.current||''});
      if(!mounted.current||operation.current!==requestId||!isSessionCurrent(requestSession))return;
      onDraft(interpreted);setStatus('Bozza pronta: controlla tutti i campi prima di salvarla.');
    } catch(e){if(mounted.current&&operation.current===requestId&&isSessionCurrent(requestSession))setStatus((e as Error).message||'Interpretazione non riuscita. Riprova.');}
    finally{if(mounted.current&&operation.current===requestId)setBusy(false);}
  };
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-[#29332d]/45 p-3"><section className="w-full max-w-lg rounded-2xl border border-[#e1e6df] bg-[#fffefa] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="private-voice-title">
     <header className="flex items-start justify-between border-b border-[#e7ebe4] px-5 py-4"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#71825f]">Assistente per impegni privati</p><h2 id="private-voice-title" className="m-0 text-xl font-bold text-[#354439]">Raccontami l’impegno</h2></div><button type="button" onClick={close} aria-label="Chiudi" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f0f2ed]"><X size={18}/></button></header>
    <div className="px-4 pt-3"><AITrialNotice feature="appointments" activeConversation={conversationActive} blocked={trialBlocked}/></div>
    <div className="space-y-4 p-5"><div className="rounded-xl border border-[#e1e5df] bg-[#f7f8f4] p-3"><p className="m-0 text-xs leading-relaxed text-[#67746a]">La voce prepara una bozza, non salva l’impegno. Rivedi e conferma ogni dato nel modulo.</p><button type="button" onClick={begin} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#607449] px-3 py-2 text-sm font-bold text-white"><Mic size={16}/>Detta impegno</button></div>
      <Field label="Trascrizione modificabile"><textarea className="pa-field min-h-[105px] resize-y" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Es. Domani dalle 11, pausa pranzo fuori studio"/></Field>
      {status&&<p className="m-0 text-sm text-[#69766c]" role="status">{status}</p>}
       <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#657269] hover:bg-[#f1f3ef]">Annulla</button><button type="button" disabled={busy} onClick={()=>void interpret()} className="rounded-lg bg-[#607449] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{busy?'Preparo la bozza…':'Prepara bozza'}</button></div>
    </div></section></div>;
}

export default function PrivateAgenda({selectedDate,view,searchQuery}:{selectedDate:Date;view:'day'|'week'|'month';searchQuery:string}) {
  const {profiles,access,events,loading,error,mode,dialog,profileId,creationDefaults,openCreate,closeDialog,reload,unlock,enroll,lock,selectProfile,setEvents,refreshProfiles,refreshAccess,generation,isGenerationCurrent}=usePrivateAppointments();
  const [selectedIdentity,setSelectedIdentity]=useState<number|null>(null);
  const [password,setPassword]=useState(''),[name,setName]=useState(''),[confirm,setConfirm]=useState(''),[authError,setAuthError]=useState(''),[confirmDelete,setConfirmDelete]=useState<PrivateEvent|null>(null),[editing,setEditing]=useState<EventDraft|null>(null);
  const [deleteError,setDeleteError]=useState('');
  const [calendarOptions,setCalendarOptions]=useState<Array<{id:string;summary:string}>>([]),[googleError,setGoogleError]=useState(''),[busy,setBusy]=useState(false);
  const [privateGoogleUnavailable,setPrivateGoogleUnavailable]=useState(false);
  const [syncInfo,setSyncInfo]=useState('');
  const [reminders,setReminders]=useState<PrivateReminder[]>([]);
  const [notificationPermission,setNotificationPermission]=useState(typeof Notification==='undefined'?'unsupported':Notification.permission);
  const [showCalendarCreate,setShowCalendarCreate]=useState(false),[calendarName,setCalendarName]=useState('Personale');
  const shownReminders=useRef(new Set<string>());
  const activeSessionKey=useRef('');
  const sessionKey=access?`${access.profile.id}:${generation}`:'';
  activeSessionKey.current=sessionKey;
  const isSessionCurrent=(candidate:string)=>candidate!==''&&activeSessionKey.current===candidate&&isGenerationCurrent(generation);
  const identity=profiles?.identities.find(x=>x.identityId===selectedIdentity) || profiles?.identities.find(x=>x.profileId===profileId);
  useEffect(()=>{if(profiles&&!profiles.multi&&profiles.identities[0])setSelectedIdentity(profiles.identities[0].identityId);else if(profiles?.identities.length&&!profiles.identities.some(x=>x.identityId===selectedIdentity))setSelectedIdentity(profiles.identities[0].identityId);},[profiles,selectedIdentity]);
  useEffect(()=>{setPrivateGoogleStatusHandler(status=>setPrivateGoogleUnavailable(status==='unavailable'));return()=>setPrivateGoogleStatusHandler(null);},[]);
  useEffect(()=>{
    if(access)return;
    setEditing(null);setConfirmDelete(null);setPassword('');setConfirm('');setName('');
    setCalendarOptions([]);setGoogleError('');setPrivateGoogleUnavailable(false);setSyncInfo('');setDeleteError('');setReminders([]);setBusy(false);
    shownReminders.current.clear();
  },[access?.profile.id]);
  useEffect(()=>{const handler=(e:Event)=>{const id=(e as CustomEvent).detail;const event=events.find(x=>String(x.id)===String(id));if(event)setConfirmDelete(event);};window.addEventListener('private-event-delete',handler);return()=>window.removeEventListener('private-event-delete',handler);},[events]);
  const filtered=useMemo(()=>events.filter(e=>!searchQuery||`${e.title} ${e.location||''} ${e.description||''}`.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())).sort((a,b)=>`${a.startDate}${a.startTime||''}`.localeCompare(`${b.startDate}${b.startTime||''}`)),[events,searchQuery]);
  const period=view;
  const cursor=selectedDate;
  const dateTag=toDateString(selectedDate);
  const [periodStart,periodEnd]=useMemo(()=>rangeFor(selectedDate,view),[selectedDate,view]);
  useEffect(()=>{void reload(periodStart,periodEnd);},[periodStart,periodEnd,access?.profile.id]);
  useEffect(()=>{
    if(!access)return;
    let live=true;
    const poll=async()=>{
      try {
        const due=await privateApi.reminders();
        if(!live)return;
        setReminders(due);
        if(typeof Notification!=='undefined'&&Notification.permission==='granted') {
          due.forEach(reminder=>{
            const key=`${reminder.id}:${reminder.occurrenceDate}`;
            if(!shownReminders.current.has(key)) {
              shownReminders.current.add(key);
               new Notification('Promemoria personale',{body:'Apri lo spazio privato per leggere il promemoria'});
            }
          });
        }
      } catch { /* The private API error is shown by the main calendar query and 401/403 lock immediately. */ }
    };
    void poll();
    const timer=window.setInterval(()=>void poll(),60_000);
    return()=>{live=false;window.clearInterval(timer);setReminders([]);};
  },[access?.profile.id]);
  const visible=filtered.filter(e=>e.startDate<=periodEnd&&e.endDate>=periodStart);
  const calendarDates=useMemo(()=>{
    if(period==='month'){
      const first=new Date(cursor.getFullYear(),cursor.getMonth(),1), count=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate(), offset=(first.getDay()+6)%7;
      const cells=Math.ceil((offset+count)/7)*7;
      return Array.from({length:cells},(_,i)=>i-offset+1).map(day=>day>0&&day<=count?toDateString(new Date(cursor.getFullYear(),cursor.getMonth(),day)):null);
    }
    const from=new Date(`${periodStart}T12:00:00`);
    return Array.from({length:period==='week'?7:1},(_,i)=>{const date=new Date(from);date.setDate(date.getDate()+i);return toDateString(date);});
  },[period,cursor,periodStart]);
  const weekDates=calendarDates.filter((day):day is string=>day!==null);
  const editEvent=(event:PrivateEvent)=>{
    const series=event.source==='local'&&event.recurrence!=='none'
      ? {...event,startDate:event.seriesStartDate||event.startDate,endDate:event.seriesEndDate||event.endDate}
      : event;
    setEditing(series);openCreate('manual');
  };
  const save = (event:PrivateEvent) => { setEvents([...events.filter(e=>String(e.id)!==String(event.id)),event].sort((a,b)=>`${a.startDate}${a.startTime||''}`.localeCompare(`${b.startDate}${b.startTime||''}`))); void reload(periodStart,periodEnd); };
  const doDelete=async()=>{if(!confirmDelete||!isSessionCurrent(sessionKey))return;const operationSession=sessionKey;setBusy(true);setDeleteError('');try{await privateApi.remove(confirmDelete);if(!isSessionCurrent(operationSession))return;setEvents(events.filter(e=>String(e.id)!==String(confirmDelete.id)));setConfirmDelete(null);setEditing(null);closeDialog();void reload(periodStart,periodEnd);}catch(e){if(isSessionCurrent(operationSession))setDeleteError((e as Error).message);}finally{if(isSessionCurrent(operationSession))setBusy(false);}};
  const googleManage=async()=>{const operationSession=sessionKey;if(!isSessionCurrent(operationSession))return;setGoogleError('');try{const list=await privateApi.calendars();if(isSessionCurrent(operationSession))setCalendarOptions(list);}catch(e){if(isSessionCurrent(operationSession))setGoogleError((e as Error).message);}};
  const createPrivateCalendar=async()=>{
    const operationSession=sessionKey;if(!isSessionCurrent(operationSession))return;
    setGoogleError('');
    if(!calendarName.trim()){setGoogleError('Inserisci il nome del calendario.');return;}
    try {
      const created=await privateApi.createCalendar(calendarName.trim());
      await refreshAccess();
      if(!isSessionCurrent(operationSession))return;
      setCalendarOptions([]);
      setShowCalendarCreate(false);
      setSyncInfo(`Calendario privato “${created.summary}” selezionato.`);
      void reload(periodStart,periodEnd);
     } catch(e){if(isSessionCurrent(operationSession))setGoogleError((e as Error).message);}
  };
  const connectGoogle=async()=>{const operationSession=sessionKey;if(!isSessionCurrent(operationSession))return;try{const {url}=await privateApi.connect();if(isSessionCurrent(operationSession))window.location.assign(url);}catch(e){if(isSessionCurrent(operationSession))setGoogleError((e as Error).message);}};
  const selectCalendar=async(id:string)=>{const operationSession=sessionKey;if(!isSessionCurrent(operationSession))return;try{await privateApi.selectCalendar(id);await refreshAccess();if(!isSessionCurrent(operationSession))return;setCalendarOptions([]);void reload(periodStart,periodEnd);}catch(e){if(isSessionCurrent(operationSession))setGoogleError((e as Error).message);}};
  const syncGoogle=async()=>{const operationSession=sessionKey;if(!isSessionCurrent(operationSession))return;try{const result=await privateApi.sync();if(!isSessionCurrent(operationSession))return;setSyncInfo(result?.message||'Sincronizzazione completata.');void reload(periodStart,periodEnd);}catch(e){if(isSessionCurrent(operationSession))setGoogleError((e as Error).message);}};
  const disconnectGoogle=async()=>{const operationSession=sessionKey;if(!isSessionCurrent(operationSession))return;if(!window.confirm('Scollegare Google personale? Gli eventi non verranno eliminati.'))return;try{await privateApi.disconnect();if(isSessionCurrent(operationSession))window.location.reload();}catch(e){if(isSessionCurrent(operationSession))setGoogleError((e as Error).message);}};
  const saveAuth=async()=>{setAuthError('');try{if(identity?.configured){await unlock(identity.profileId!,password);}else{if(password.length<10||password.length>128)throw new Error('La password deve contenere da 10 a 128 caratteri.');if(name.trim().length>100||!name.trim())throw new Error('Inserisci un nome (massimo 100 caratteri).');if(password!==confirm)throw new Error('Le password non coincidono.');await enroll(identity!.identityId,name.trim(),password);}setPassword('');setConfirm('');setName('');}catch(e){setAuthError((e as Error).message);} };
  if(loading) return <section className={`${card} mb-5 p-5`} aria-label="Caricamento spazio privato"><div className="h-5 w-52 animate-pulse rounded bg-[#e8ece5]"/><div className="mt-4 h-24 animate-pulse rounded-xl bg-[#f0f2ed]"/></section>;
  if(!profiles) return <section className={`${card} mb-5 p-5`}><h2 className="m-0 text-lg font-bold text-[#354439]">Spazio privato</h2><p className="mb-3 mt-2 text-sm text-[#69766c]">{error||'Non è stato possibile caricare le identità.'}</p><button type="button" onClick={()=>void refreshProfiles()} className="rounded-lg bg-[#607449] px-3 py-2 text-sm font-bold text-white">Riprova</button></section>;
  return <section className={`${card} mb-6 overflow-hidden`} aria-label="Impegni privati">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8e1] bg-[#f7f8f4] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e9ede5] text-[#61764e]"><CalendarDays size={18}/></span><div><h2 className="m-0 text-base font-bold text-[#354439]">Impegni privati</h2><p className="m-0 text-[11px] text-[#7b877d]">Spazi personali separati · nessun cliente o servizio</p></div></div>
      <div className="flex flex-wrap items-center gap-2">{profiles.multi&&<label className="flex items-center gap-2 text-xs font-semibold text-[#5e6b61]">Identità<select value={selectedIdentity??''} onChange={e=>{const id=Number(e.target.value);setSelectedIdentity(id);setPassword('');setConfirm('');setName('');setAuthError('');setGoogleError('');const item=profiles.identities.find(i=>i.identityId===id);if(item)selectProfile(item);}} className="h-9 max-w-[170px] rounded-lg border border-[#dce2da] bg-white px-2 text-xs">{profiles.identities.map(i=><option key={i.identityId} value={i.identityId}>{i.name}</option>)}</select></label>}
      {access&&profiles.multi?<button type="button" onClick={()=>void lock()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8e0d5] bg-[#edf2e9] px-3 text-xs font-bold text-[#586e47]"><LockKeyhole size={14}/>Blocca area</button>:null}
      </div>
    </header>
     {!access ? !profiles.multi ? <div className="m-4 rounded-xl border border-[#e0e6dc] bg-[#f8f9f6] p-4 sm:m-5"><div className="flex items-center gap-2 text-sm font-bold text-[#43543f]"><ShieldCheck size={17}/>Spazio personale in caricamento</div><p className="mb-3 mt-2 text-xs leading-relaxed text-[#737f75]">{error||'Lo spazio personale del titolare non richiede password finché lo studio ha un solo professionista.'}</p><button type="button" onClick={()=>void refreshAccess()} className="rounded-lg bg-[#607449] px-3 py-2 text-sm font-bold text-white">Riprova accesso</button></div> : <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(260px,.8fr)] sm:p-5">
      <div className="rounded-xl border border-[#e0e6dc] bg-[#f8f9f6] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#43543f]"><ShieldCheck size={17}/>Area personale {identity?.name ? `di ${identity.name}` : ''} bloccata</div><p className="mb-3 mt-2 text-xs leading-relaxed text-[#737f75]">Il calendario di lavoro rimane invariato. Sblocca con la password personale per vedere i dettagli privati.</p>
        {identity?.configured?<><label className="mb-1 block text-xs font-semibold text-[#5d6b60]">Password personale</label><input className="pa-field" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void saveAuth()} placeholder="Password"/><button type="button" onClick={()=>void saveAuth()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#607449] px-3 py-2 text-sm font-bold text-white"><UnlockKeyhole size={15}/>Sblocca spazio</button></>:<>
          <label className="mb-1 block text-xs font-semibold text-[#5d6b60]">Nome visibile</label><input className="pa-field" maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome professionista"/>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-[#5d6b60]">Crea password</label><input className="pa-field" type="password" minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></div><div><label className="mb-1 block text-xs font-semibold text-[#5d6b60]">Conferma password</label><input className="pa-field" type="password" maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></div><p className="mb-0 mt-2 text-[10px] text-[#7a867d]">Da 10 a 128 caratteri. La password non può essere recuperata dall’app.</p><button type="button" onClick={()=>void saveAuth()} className="mt-3 rounded-lg bg-[#607449] px-3 py-2 text-sm font-bold text-white">Crea spazio protetto</button>
        </>}
        {error&&<p className="mb-0 mt-3 text-xs text-[#a04b3d]" role="alert">{error}</p>}{authError&&<p className="mb-0 mt-3 text-xs text-[#a04b3d]" role="alert">{authError}</p>}
      </div><div className="flex flex-col justify-center rounded-xl border border-[#e2e5df] bg-[#fffefa] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#5b695f]"><LockKeyhole size={15}/>Privacy per professionista</div><p className="mb-0 mt-2 text-xs leading-relaxed text-[#7b867d]">Ogni persona accede con la propria password. I dettagli non vengono salvati nel browser e si cancellano dalla memoria quando blocchi o cambi identità.</p></div>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full bg-[#e9e9e6] px-2.5 py-1 font-semibold text-[#4f5751]">Personale locale</span>{access.google.connected&&<span className="rounded-full bg-[#f0f0ed] px-2.5 py-1 font-semibold text-[#4f5751]">Google personale</span>}<span className="text-[#78847b]">· {access.profile.name}</span></div>
        <button type="button" onClick={()=>void reload(periodStart,periodEnd)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe4dc] text-[#69766c] hover:bg-[#f4f6f1]" aria-label="Aggiorna"><RefreshCw size={15}/></button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex gap-2"><button type="button" onClick={()=>{setEditing(null);openCreate('manual');}} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#64794e] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#53663f]"><Plus size={16}/>Nuovo impegno privato</button><button type="button" onClick={()=>openCreate('voice')} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#dcded9] bg-[#f0f0ed] px-3 text-xs font-bold text-[#555e57] hover:bg-[#e7e8e4]"><Mic size={15}/>Voce AI privata</button></div>
      </div>
       {mode==='free'&&<p className="mx-4 mb-3 rounded-lg bg-[#f1f2ef] px-3 py-2 text-xs text-[#68716a] sm:mx-5">I comandi rapidi “Libero” aprono bozze personali. Anche i pulsanti di questa agenda restano sempre nello spazio privato; ogni bozza richiede la tua conferma.</p>}
      <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e7e9e4] bg-[#fafbf8] px-3 py-2 sm:mx-5">
        <div><p className="m-0 text-xs font-semibold text-[#59665d]">Promemoria privati</p><p className="m-0 mt-0.5 text-[10px] text-[#818b82]">In-app finché il gestionale è aperto. Le notifiche locali si attivano solo su richiesta; Google usa i promemoria del suo calendario.</p></div>
        {notificationPermission==='unsupported'?<span className="text-[10px] text-[#7b867d]">Notifiche browser non supportate</span>:notificationPermission==='granted'?<span className="text-[10px] font-semibold text-[#5d704e]">Notifiche browser attive</span>:<button type="button" onClick={async()=>{const permission=await Notification.requestPermission();setNotificationPermission(permission);}} className="rounded-md border border-[#dce2da] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#59665d]">Attiva notifiche in questo browser</button>}
      </div>
      {reminders.length>0&&<div className="mx-4 mb-3 rounded-lg border border-[#e3e6df] bg-[#f7f8f4] px-3 py-2 sm:mx-5"><p className="m-0 text-xs font-bold text-[#536157]">Promemoria in scadenza</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{reminders.map((r,i)=><span key={`${r.id}:${r.occurrenceDate}:${i}`} className="text-[11px] text-[#68746b]">{r.title} · {dateLabel(r.occurrenceDate||r.startDate)} {r.startTime||''}</span>)}</div></div>}
      <div className="mx-4 mb-3 overflow-x-auto sm:mx-5">
        {period==='month'&&<div className="min-w-[520px] overflow-hidden rounded-xl border border-[#e7ebe4]">
          <div className="grid grid-cols-7 bg-[#f7f8f4]">{['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(label=><div key={label} className="border-b border-r border-[#e7ebe4] px-2 py-2 text-[10px] font-bold uppercase text-[#879188]">{label}</div>)}</div>
          <div className="grid grid-cols-7">{calendarDates.map((day,index)=><div key={`${day||'blank'}-${index}`} className={`min-h-[74px] border-b border-r border-[#edf0eb] p-1.5 ${day?'bg-[#fffefa]':'bg-[#fafbf8]'}`}>{day&&<><span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${day===isoToday()?'bg-[#607449] font-bold text-white':'text-[#657269]'}`}>{Number(day.slice(-2))}</span><div className="mt-1 space-y-0.5">{visible.filter(event=>event.startDate<=day&&event.endDate>=day).slice(0,2).map(event=><button type="button" key={`${event.source}:${event.id}:${day}`} onClick={()=>editEvent(event)} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold ${event.source==='google'?'bg-[#e8e9e6] text-[#535a54]':'bg-[#eeefec] text-[#4c554e]'}`}>{event.startTime&&!event.allDay?`${event.startTime} `:''}{event.title}</button>)}</div></>}</div>)}</div>
        </div>}
        {period==='week'&&<div className="grid min-w-[650px] grid-cols-7 overflow-hidden rounded-xl border border-[#e7ebe4]">{weekDates.map(day=><div key={day} className="min-h-[112px] border-r border-[#e7ebe4] bg-[#fffefa] p-2"><p className="mb-2 text-[10px] font-bold uppercase text-[#879188]">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric'})}</p>{visible.filter(event=>event.startDate<=day&&event.endDate>=day).map(event=><button type="button" key={`${event.source}:${event.id}:${day}`} onClick={()=>editEvent(event)} className={`mb-1 block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-semibold ${event.source==='google'?'bg-[#e8e9e6] text-[#535a54]':'bg-[#eeefec] text-[#4c554e]'}`}>{event.allDay?'Tutto il giorno':event.startTime}{event.startTime?' · ':''}{event.title}</button>)}</div>)}</div>}
        {period==='day'&&<div className="overflow-hidden rounded-xl border border-[#e7ebe4] bg-[#fffefa]">{visible.filter(event=>event.startDate<=dateTag&&event.endDate>=dateTag).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||'')).map(event=><button type="button" key={`${event.source}:${event.id}:${event.occurrenceDate||''}`} onClick={()=>editEvent(event)} className={`flex w-full items-center gap-3 border-b border-[#edf0eb] px-3 py-2.5 text-left last:border-0 ${event.source==='google'?'bg-[#f0f0ed]':'bg-[#f8f8f5]'}`}><span className="w-28 shrink-0 text-xs font-semibold text-[#6f7971]">{timeLabel(event)}</span><span className="h-7 w-1 shrink-0 rounded-full bg-[#747b75]"/><span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#414b43]">{event.title}</span><Pencil size={13} className="shrink-0 text-[#89938a]"/></button>)}{!visible.some(event=>event.startDate<=dateTag&&event.endDate>=dateTag)&&<p className="m-0 px-4 py-5 text-center text-xs text-[#818b82]">Nessun impegno per questa giornata.</p>}</div>}
      </div>
      {error&&<div className="mx-4 mb-3 flex items-start justify-between gap-3 rounded-lg border border-[#e4c8bd] bg-[#fff3ef] px-3 py-2 text-xs text-[#974d3f] sm:mx-5"><span>{error}</span><button type="button" onClick={()=>void reload(periodStart,periodEnd)} className="font-bold underline">Riprova</button></div>}
      {privateGoogleUnavailable&&<div className="mx-4 mb-3 rounded-lg border border-[#e3d1a9] bg-[#fbf5e6] px-3 py-2 text-xs text-[#806438] sm:mx-5" role="status">Google personale non è raggiungibile in questo momento. Gli impegni locali restano visibili e salvabili; la sincronizzazione verrà riprovata.</div>}
      <div className="px-4 pb-4 sm:px-5"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(event=><article key={`${event.source}:${event.id}:${event.occurrenceDate||''}`} className={`group rounded-xl border px-3.5 py-3 transition-colors ${event.source==='google'?'border-[#d9dbd6] bg-[#f0f0ed]':'border-[#d9ddd7] bg-[#f5f5f2]'}`}>
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${event.source==='google'?'bg-[#929791]':'bg-[#69716b]'}`}/><h3 className="m-0 truncate text-sm font-bold text-[#414b43]">{event.title}</h3></div><p className="mb-0 mt-1 text-xs text-[#737d75]">{dateLabel(event.occurrenceDate||event.startDate)}{event.endDate!==event.startDate?` – ${dateLabel(event.endDate)}`:''} · {timeLabel(event)}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={()=>{setEditing(event);openCreate('manual');}} aria-label={`Modifica ${event.title}`} className="grid h-8 w-8 place-items-center rounded-md text-[#69766c] hover:bg-white/70"><Pencil size={14}/></button><button type="button" onClick={()=>setConfirmDelete(event)} aria-label={`Elimina ${event.title}`} className="grid h-8 w-8 place-items-center rounded-md text-[#986056] hover:bg-white/70"><Trash2 size={14}/></button></div></div>
          {(event.location||event.description)&&<p className="mb-0 mt-2 truncate text-xs text-[#6f7971]">{event.location&&<>{event.location}{event.description?' · ':''}</>}{event.description}</p>}
           <div className="mt-2 flex items-center justify-between gap-2"><span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[#687169]">{event.source==='google'?'Google personale':'Personale locale'}</span>{access.google.connected&&event.syncPending&&<span className="text-[10px] font-semibold text-[#a35343]">Google non sincronizzato</span>}</div>
        </article>)}
        {!visible.length&&<div className="col-span-full rounded-xl border border-dashed border-[#dce2d9] bg-[#fafbf8] px-4 py-8 text-center"><CalendarDays className="mx-auto h-6 w-6 text-[#89958b]"/><p className="mb-0 mt-2 text-sm font-semibold text-[#59665d]">{searchQuery?'Nessun impegno corrispondente':'Nessun impegno in questo periodo'}</p><p className="mb-0 mt-1 text-xs text-[#838d84]">{searchQuery?'Modifica la ricerca o prova un altro termine.':'Aggiungi un impegno privato: resterà disponibile anche senza Google.'}</p>{!searchQuery&&<button type="button" onClick={()=>{setEditing(null);openCreate('manual');}} className="mt-3 rounded-lg bg-[#607449] px-3 py-2 text-xs font-bold text-white">Crea il primo impegno</button>}</div>}
      </div></div>
      <div className="border-t border-[#e8ebe5] bg-[#fafbf8] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Cloud size={16} className="text-[#768274]"/><div><p className="m-0 text-xs font-bold text-[#536157]">Google personale</p><p className="m-0 text-[10px] text-[#849087]">{access.google.connected?`Collegato${access.google.email?` · ${access.google.email}`:''}`:'Facoltativo · gli impegni locali funzionano comunque'}</p></div></div>
           <div className="flex flex-wrap gap-2">{access.google.connected?<><button type="button" onClick={()=>void googleManage()} className="rounded-lg border border-[#dce2da] bg-white px-3 py-2 text-xs font-semibold text-[#59665d]">Scegli calendario</button><button type="button" onClick={()=>setShowCalendarCreate(v=>!v)} className="rounded-lg border border-[#dce2da] bg-white px-3 py-2 text-xs font-semibold text-[#59665d]">Crea calendario privato</button><button type="button" onClick={()=>void syncGoogle()} className="rounded-lg border border-[#dce2da] bg-white px-3 py-2 text-xs font-semibold text-[#59665d]">Sincronizza</button><button type="button" onClick={()=>void disconnectGoogle()} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#69766c] hover:bg-white">Scollega</button></>:<button type="button" onClick={()=>void connectGoogle()} className="rounded-lg bg-[#e8ece5] px-3 py-2 text-xs font-bold text-[#53664a]">Collega Google personale</button>}</div></div>
        {googleError&&<p className="mb-0 mt-2 text-xs text-[#a14f43]" role="alert">{googleError}</p>}{syncInfo&&<p className="mb-0 mt-2 text-xs text-[#5d704e]" role="status">{syncInfo}</p>}
        {showCalendarCreate&&<div className="mt-3 rounded-lg border border-[#e0e5dd] bg-white p-3"><p className="mb-2 text-xs font-semibold text-[#59665d]">Crea un calendario Google separato, solo tuo e non condiviso.</p><div className="flex flex-wrap gap-2"><input className="pa-field max-w-xs" maxLength={100} value={calendarName} onChange={e=>setCalendarName(e.target.value)} aria-label="Nome del calendario privato"/><button type="button" onClick={()=>void createPrivateCalendar()} className="rounded-lg bg-[#607449] px-3 py-2 text-xs font-bold text-white">Crea e seleziona</button><button type="button" onClick={()=>setShowCalendarCreate(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6b786e]">Annulla</button></div></div>}
        {calendarOptions.length>0&&<div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#e0e5dd] bg-white p-3"><label className="text-xs font-semibold text-[#59665d]">Calendario privato</label><select className="pa-field max-w-xs" value={access.google.calendarId||''} onChange={e=>void selectCalendar(e.target.value)}><option value="">Scegli…</option>{calendarOptions.map(c=><option key={c.id} value={c.id}>{c.summary}</option>)}</select><button type="button" onClick={()=>setCalendarOptions([])} className="text-xs text-[#77837a]">Chiudi</button></div>}
      </div>
    </>}
    {access&&dialog==='manual'&&<AppointmentForm initial={editing} defaults={creationDefaults} defaultDate={dateTag} onClose={()=>{closeDialog();setEditing(null);}} onSaved={save} sessionKey={sessionKey} isSessionCurrent={isSessionCurrent}/>}
    {access&&dialog==='voice'&&<VoiceComposer onClose={closeDialog} onDraft={draft=>{if(!isSessionCurrent(sessionKey))return;setEditing({...freshDraft(),...draft});closeDialog();openCreate('manual');}} sessionKey={sessionKey} isSessionCurrent={isSessionCurrent}/>}
    {access&&confirmDelete&&<div className="fixed inset-0 z-[100] grid place-items-center bg-[#29332d]/50 p-4"><section className="w-full max-w-md rounded-2xl bg-[#fffefa] p-5 shadow-xl" role="alertdialog" aria-modal="true"><h3 className="m-0 text-lg font-bold text-[#354439]">{confirmDelete.recurrence!=='none'?'Eliminare questa serie?':'Eliminare questo impegno?'}</h3><p className="mt-2 text-sm leading-relaxed text-[#727e74]">“{confirmDelete.title}”{confirmDelete.recurrence!=='none'?' verrà rimosso per tutte le occorrenze della serie':''}{(confirmDelete.source==='google'||confirmDelete.googleEventId)?' e dalla copia Google personale':''}. Questa azione è definitiva.</p>{deleteError&&<p className="mt-3 text-xs text-[#a14f43]" role="alert">{deleteError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>{setDeleteError('');setConfirmDelete(null);}} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#657269]">Annulla</button><button type="button" disabled={busy} onClick={()=>void doDelete()} className="rounded-lg bg-[#a64f42] px-4 py-2 text-sm font-bold text-white">{busy?'Eliminazione…':confirmDelete.recurrence!=='none'?'Elimina serie':'Elimina impegno'}</button></div></section></div>}
  </section>;
}