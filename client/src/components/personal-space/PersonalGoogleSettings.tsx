import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, ExternalLink, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePersonalSpace } from './PersonalSpaceProvider';
import { spaceApi } from './api';

const ACCESS_KEY = ['/api/personal-appointments/space/access'] as const;
export default function PersonalGoogleSettings() {
  const { access, unlocked, requestAccess } = usePersonalSpace();
  const client = useQueryClient();
  const calendars = useQuery({ queryKey: [...ACCESS_KEY, 'calendars', access?.profile.id], queryFn: spaceApi.calendars, enabled: unlocked && !!access?.google.connected });
  const [summary, setSummary] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = () => client.invalidateQueries({ queryKey: ACCESS_KEY });
  const connect = useMutation({ mutationFn: spaceApi.connect, onSuccess: value => { window.location.assign(value.url); } });
  const sync = useMutation({ mutationFn: spaceApi.sync, onSuccess: result => { setNotice(result.message || (result.pending ? 'Sincronizzazione in attesa.' : 'Sincronizzazione aggiornata.')); refresh(); } });
  const disconnect = useMutation({ mutationFn: spaceApi.disconnect, onSuccess: () => { setNotice('Google Calendar scollegato. Le copie remote sono state conservate.'); refresh(); } });
  const create = useMutation({ mutationFn: (name: string) => spaceApi.createCalendar(name), onSuccess: () => { setSummary(''); setNotice('Calendario privato creato e selezionato.'); void calendars.refetch(); refresh(); } });
  const select = useMutation({ mutationFn: spaceApi.selectCalendar, onSuccess: refresh });
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('personalGoogle');
    if (!status) return;
    setNotice(status === 'connected' ? 'Google Calendar collegato.' : status === 'cancelled' ? 'Collegamento annullato.' : 'Collegamento Google non riuscito.');
    const url = new URL(window.location.href); url.searchParams.delete('personalGoogle'); window.history.replaceState({}, '', url);
  }, []);
  if (!unlocked) return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><p>Sblocca il tuo spazio personale per gestire Google Calendar.</p><Button variant="outline" className="mt-3" onClick={requestAccess}>Sblocca spazio</Button></div>;
  return <section className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-5">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-teal-100 p-2 text-teal-800"><CalendarDays className="h-5 w-5" /></span><div><h3 className="font-semibold text-slate-900">Google Calendar personale</h3><p className="mt-1 text-sm text-slate-600">Gli impegni privati si sincronizzano su un calendario dedicato. I dettagli non sono condivisi con il team.</p></div></div>
    {access?.google.connected ? <>
      <div className="mt-4 rounded-xl bg-white p-3 text-sm"><p className="font-medium">{access.google.email || 'Account Google collegato'}</p><p className="text-xs text-slate-500">Calendario: {calendars.data?.find(item => item.id === access.google.calendarId)?.summary || access.google.calendarId || 'da selezionare'}</p></div>
      {calendars.data?.length ? <label className="mt-3 block text-sm">Calendario privato<select className="mt-1 h-10 w-full rounded-md border bg-white px-3" value={access.google.calendarId || ''} onChange={event => select.mutate(event.target.value)}><option value="">Seleziona calendario</option>{calendars.data.map(calendar => <option key={calendar.id} value={calendar.id}>{calendar.summary}</option>)}</select></label> : null}
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}><RefreshCw className="mr-2 h-4 w-4" />{sync.isPending ? 'Aggiornamento…' : 'Sincronizza ora'}</Button><Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}><Unplug className="mr-2 h-4 w-4" />Scollega</Button></div>
      {access.sync?.pending && <p className="mt-2 text-sm text-amber-800">{access.sync.message || 'Sincronizzazione in attesa.'}</p>}
      <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); if (summary.trim()) create.mutate(summary.trim()); }}><Input value={summary} onChange={event => setSummary(event.target.value)} placeholder="Nome nuovo calendario privato" aria-label="Nome nuovo calendario" /><Button type="submit" variant="outline" disabled={!summary.trim() || create.isPending}>Crea</Button></form>
    </> : <Button className="mt-4" onClick={() => connect.mutate()} disabled={connect.isPending}><ExternalLink className="mr-2 h-4 w-4" />{connect.isPending ? 'Apertura…' : 'Collega Google Calendar'}</Button>}
    {notice && <p className="mt-3 flex items-center gap-2 text-sm text-teal-800"><Check className="h-4 w-4" />{notice}</p>}
    {(connect.isError || calendars.isError || sync.isError || create.isError || disconnect.isError) && <p role="alert" className="mt-3 text-sm text-rose-700">Operazione non riuscita. Riprova tra poco.</p>}
  </section>;
}