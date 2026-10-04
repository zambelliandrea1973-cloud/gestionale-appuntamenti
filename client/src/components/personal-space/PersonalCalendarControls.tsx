import { useEffect, useState } from 'react';
import { CalendarDays, Check, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppointmentMode } from '@/hooks/use-appointment-mode';
import { usePersonalSpace } from './PersonalSpaceProvider';
import PersonalGoogleSettings from './PersonalGoogleSettings';

export default function PersonalCalendarControls() {
  const [mode, setMode] = useAppointmentMode();
  const space = usePersonalSpace();
  const [googleOpen, setGoogleOpen] = useState(false);
  const personal = mode === 'personal';
  const multi = space.profiles?.multi === true;

  useEffect(() => {
    if (personal && multi && !space.unlocked) {
      space.requestAccess(undefined, { onCancel: () => setMode('work') });
    } else if (!personal && multi && space.unlocked) {
      void space.lock();
    }
  }, [personal, multi, space.unlocked, space.requestAccess, space.lock]);

  const showPersonal = () => {
    setMode('personal');
    if (multi && !space.unlocked) {
      space.requestAccess(undefined, { onCancel: () => setMode('work') });
    }
  };
  const showWork = () => {
    if (personal) void space.lock();
    setMode('work');
    setGoogleOpen(false);
  };
  const changeProfile = () => {
    setMode('personal');
    space.requestAccess(undefined, {
      force: true,
      onCancel: () => setMode('work'),
    });
  };

  return <section aria-label="Selettore calendario" className="rounded-xl border border-[#dce3d8] bg-[#f6f8f3] p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e3ebe2] text-[#526c59]">
        {personal ? (multi && !space.unlocked ? <LockKeyhole className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />) : <Users className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#718071]">Calendario</p>
        <p className="truncate text-sm font-semibold text-[#35443b]">
          {personal && space.unlocked ? (multi ? `Personale · ${space.access?.profile.name || 'Profilo sbloccato'}` : 'Personale') : personal ? (multi ? 'Personale · protetto' : 'Personale') : 'Condiviso'}
        </p>
        <p className="text-xs text-[#718071]">
          {personal && space.unlocked ? 'I dettagli sono visibili solo in questa modalità.' : personal && !multi ? 'Calendario personale in caricamento.' : 'Il calendario di lavoro resta condiviso; i privati appaiono come “Occupato”.'}
        </p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
      <div className="inline-flex rounded-lg border border-[#d7dfd4] bg-white p-1" aria-label="Modalità calendario">
        <Button type="button" size="sm" variant={!personal ? 'default' : 'ghost'} className="h-8" aria-pressed={!personal} onClick={showWork}>
          <Users className="mr-1.5 h-3.5 w-3.5" />Condiviso
        </Button>
        <Button type="button" size="sm" variant={personal ? 'default' : 'ghost'} className="h-8" aria-pressed={personal} onClick={showPersonal}>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />Personale
        </Button>
      </div>
      {personal && !space.unlocked && multi && <Button type="button" size="sm" variant="outline" onClick={() => space.requestAccess(undefined, { onCancel: () => setMode('work') })}>
        <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Accedi
      </Button>}
      {personal && space.unlocked && multi && <Button type="button" size="sm" variant="outline" onClick={changeProfile}>
        Cambia profilo
      </Button>}
      {personal && space.unlocked && <Button type="button" size="sm" variant="outline" onClick={() => setGoogleOpen(value => !value)} aria-expanded={googleOpen}>
        {googleOpen ? 'Nascondi Google' : 'Google personale'}
      </Button>}
    </div>
    {personal && space.unlocked && googleOpen && <div className="mt-3 w-full border-t border-[#dce3d8] pt-3 sm:col-span-2 sm:basis-full">
      <PersonalGoogleSettings />
    </div>}
    {personal && space.unlocked && multi && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#61736a] sm:basis-full">
      <Check className="h-3.5 w-3.5" />{multi ? `Spazio di ${space.access?.profile.name || 'profilo personale'} sbloccato` : 'Spazio personale disponibile'}
      <span className="ml-1 inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Ai colleghi compare solo “Occupato”.</span>
    </p>}
  </section>;
}