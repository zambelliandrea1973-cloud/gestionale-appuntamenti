import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDateForApi } from '@/lib/utils/date';
import { personalAppointmentSchema, type PersonalAppointmentInput } from '../../../shared/personalAppointments';
import { PERSONAL_APPOINTMENTS_QUERY, notifyPersonalAppointmentSaved } from '@/hooks/use-personal-appointments';
import type { VoiceAppointmentFormDraft } from '@/lib/voiceAppointmentDraft';

interface Props {
  appointmentId?: number; onClose: () => void; onAppointmentSaved?: () => void;
  defaultDate?: Date; defaultTime?: string; selectedSlots?: string[];
  initialValues?: VoiceAppointmentFormDraft | null;
}
function plusMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const value = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export default function PersonalAppointmentForm(props: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = props.appointmentId ? Math.abs(props.appointmentId) : null;
  const initialTime = props.initialValues?.startTime || props.defaultTime?.slice(0, 5) || '09:00';
  const [data, setData] = useState<PersonalAppointmentInput>(() => ({
    title: props.initialValues?.title || '',
    date: props.initialValues?.date || formatDateForApi(props.defaultDate || new Date()),
    startTime: initialTime,
    endTime: props.initialValues?.endTime || plusMinutes(props.selectedSlots?.length ? [...props.selectedSlots].sort().at(-1)! : initialTime, props.selectedSlots?.length ? 15 : props.initialValues?.durationMinutes || 60),
    location: props.initialValues?.location || '', notes: props.initialValues?.notes || '',
  }));
  const [error, setError] = useState('');
  const record = useQuery<PersonalAppointmentInput>({
    queryKey: [`/api/personal-appointments/${id}`], enabled: Boolean(id),
  });
  useEffect(() => { if (record.data) setData(record.data); }, [record.data]);
  const save = useMutation({
    mutationFn: async (value: PersonalAppointmentInput) => {
      const response = await apiRequest(id ? 'PUT' : 'POST', id ? `/api/personal-appointments/${id}` : '/api/personal-appointments', value);
      return response.json();
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: PERSONAL_APPOINTMENTS_QUERY });
      if (id) await queryClient.invalidateQueries({ queryKey: [`/api/personal-appointments/${id}`] });
      notifyPersonalAppointmentSaved(saved.date);
      props.onAppointmentSaved?.();
      props.onClose();
      toast({ title: t('personalAppointments.saved', 'Impegno personale salvato') });
    },
    onError: () => setError(t('personalAppointments.saveError', 'Non riesco a salvare l’impegno. Riprova: i campi sono stati conservati.')),
  });
  const change = (field: keyof PersonalAppointmentInput, value: string) => setData(previous => ({ ...previous, [field]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = personalAppointmentSchema.safeParse(data);
    if (!parsed.success) return setError(t('personalAppointments.invalid', 'Inserisci un titolo, una data valida e un orario di fine successivo all’inizio.'));
    setError('');
    save.mutate(parsed.data);
  };
  return <section role="dialog" aria-modal="true" aria-labelledby="personal-form-title" className="w-[calc(100vw-16px)] sm:w-[520px] max-h-[90dvh] overflow-y-auto rounded-xl bg-white text-gray-800" onKeyDown={event => {
    if (event.key === 'Escape' && !save.isPending) props.onClose();
    if (event.key === 'Tab') {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <header className="flex items-start justify-between border-b px-5 py-5">
      <div><p className="text-[10px] font-bold tracking-wider text-primary">{t('personalAppointments.calendar', 'IL TUO CALENDARIO')}</p>
        <h2 id="personal-form-title" className="mt-1 text-xl font-bold">{id ? t('personalAppointments.edit', 'Modifica impegno personale') : t('personalAppointments.new', 'Nuovo impegno personale')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('personalAppointments.description', 'Un promemoria, una commissione o un momento per te.')}</p>
      </div><Button type="button" variant="ghost" size="icon" disabled={save.isPending} aria-label={t('common.close')} onClick={props.onClose}><X className="h-4 w-4" /></Button>
    </header>
    {id && record.isLoading ? <p className="p-6">{t('common.loading')}</p> : <form onSubmit={submit} className="space-y-4 p-5">
      {record.isError && <p role="alert" className="text-sm text-red-700">{t('personalAppointments.loadError', 'Non riesco a caricare l’impegno. Chiudi e riprova.')}</p>}
      <label className="block text-xs font-semibold">{t('personalAppointments.title', 'Titolo')}<Input autoFocus required maxLength={200} value={data.title} onChange={event => change('title', event.target.value)} placeholder={t('personalAppointments.titlePlaceholder', 'Es. Ritiro pacco, visita…')} className="mt-1" /></label>
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <label className="min-w-0 text-xs font-semibold">{t('personalAppointments.date', 'Data')}<Input required type="date" value={data.date} onChange={event => change('date', event.target.value)} className="mt-1 px-2 min-w-0" /></label>
        <label className="min-w-0 text-xs font-semibold">{t('personalAppointments.start', 'Inizio')}<Input required type="time" value={data.startTime} onChange={event => change('startTime', event.target.value)} className="mt-1 px-2 min-w-0" /></label>
        <label className="min-w-0 text-xs font-semibold">{t('personalAppointments.end', 'Fine')}<Input required type="time" value={data.endTime} onChange={event => change('endTime', event.target.value)} className="mt-1 px-2 min-w-0" /></label>
      </div>
      <label className="block text-xs font-semibold">{t('personalAppointments.location', 'Luogo (facoltativo)')}<Input maxLength={500} value={data.location} onChange={event => change('location', event.target.value)} className="mt-1" /></label>
      <label className="block text-xs font-semibold">{t('personalAppointments.notes', 'Note (facoltative)')}<textarea maxLength={5000} value={data.notes} onChange={event => change('notes', event.target.value)} className="mt-1 min-h-20 w-full rounded-md border p-2 font-normal text-sm" /></label>
      <p className="flex items-center gap-2 rounded-md bg-gray-100 p-3 text-xs"><Check className="h-4 w-4 shrink-0" />{t('personalAppointments.noLinks', 'Nessun cliente o servizio collegato.')}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <footer className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={save.isPending} onClick={props.onClose}>{t('common.cancel')}</Button><Button type="submit" disabled={save.isPending || (Boolean(id) && !record.data)}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></footer>
    </form>}
  </section>;
}