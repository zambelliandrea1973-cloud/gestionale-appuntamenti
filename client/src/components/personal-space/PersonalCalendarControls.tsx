import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, LockKeyhole, Settings2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppointmentMode } from '@/hooks/use-appointment-mode';
import { usePersonalSpace } from './PersonalSpaceProvider';
import PersonalGoogleSettings from './PersonalGoogleSettings';
import { PersonalRecoverySettings } from './PersonalRecovery';

export default function PersonalCalendarControls() {
  const [mode, setMode] = useAppointmentMode();
  const space = usePersonalSpace();
  const [googleOpen, setGoogleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const personal = mode === 'personal';
  const multi = space.profiles?.multi === true;
  const previousPersonal = useRef(personal);
  const googleHealthy = !!space.access?.google?.connected &&
    !!space.access.google.calendarId && !!space.access.sync && !space.access.sync.pending;
  const showGoogle = space.unlocked && !googleHealthy;

  useEffect(() => {
    if (googleHealthy || !space.unlocked) setGoogleOpen(false);
  }, [googleHealthy, space.unlocked, space.access?.profile.id]);

  useEffect(() => {
    setSettingsOpen(false);
    setGoogleOpen(false);
  }, [space.unlocked, space.access?.profile.id, personal]);

  useEffect(() => {
    const returnedToWork = previousPersonal.current && !personal;
    previousPersonal.current = personal;
    if (personal && multi && !space.unlocked) {
      space.requestAccess(undefined, { onCancel: () => setMode('work') });
    } else if (returnedToWork && multi && space.unlocked) {
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
    if (personal && multi) void space.lock();
    setMode('work');
    setGoogleOpen(false);
  };
  const changeProfile = () => {
    setSettingsOpen(false);
    setGoogleOpen(false);
    setMode('personal');
    space.requestAccess(undefined, {
      force: true,
      onCancel: () => setMode('work'),
    });
  };

  // Solo creation mode never filters the combined calendar. Keep Google
  // reachable as a separate small control, without a shared/personal panel.
  if (!multi) return showGoogle ? <div className="flex flex-wrap justify-end gap-2">
    <Button type="button" size="sm" variant="outline" onClick={() => setGoogleOpen(value => !value)} aria-expanded={googleOpen}>Google personale</Button>
    {googleOpen && <div className="w-full"><PersonalGoogleSettings /></div>}
  </div> : null;

  return <section aria-label="Selettore calendario" className="rounded-xl border border-[#dce3d8] bg-[#f6f8f3] p-2">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <div className="inline-flex shrink-0 rounded-lg border border-[#d7dfd4] bg-[#fbfcf9] p-0.5" aria-label="Modalità calendario">
        <Button type="button" size="sm" variant={!personal ? 'default' : 'ghost'} className="h-8 px-2.5" aria-pressed={!personal} onClick={showWork}>
          <Users className="mr-1.5 h-3.5 w-3.5" />{multi ? 'Condiviso' : 'Lavoro'}
        </Button>
        <Button type="button" size="sm" variant={personal ? 'default' : 'ghost'} className="h-8 px-2.5" aria-pressed={personal} onClick={showPersonal}>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />Personale
        </Button>
      </div>
      {personal && space.unlocked && <span className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-[#35443b]" title={space.access?.profile.name}>
        {space.access?.profile.name || 'Profilo personale'}
      </span>}
      {personal && !space.unlocked && multi && <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => space.requestAccess(undefined, { onCancel: () => setMode('work') })}>
        <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Accedi
      </Button>}
      {personal && space.unlocked && multi && <Button type="button" size="sm" variant="outline" className="h-8 px-2.5" onClick={() => { void space.lock(); setMode('work'); }}>
        <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Blocca
      </Button>}
      {personal && space.unlocked && <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-[#526c59]" onClick={() => setSettingsOpen(value => !value)} aria-expanded={settingsOpen}>
        <Settings2 className="h-3.5 w-3.5" />Impostazioni
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
      </Button>}
    </div>
    {personal && space.unlocked && settingsOpen && <div className="mt-2 border-t border-[#dce3d8] pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={changeProfile}>Cambia profilo</Button>
        {showGoogle && <Button type="button" size="sm" variant="outline" onClick={() => setGoogleOpen(value => !value)} aria-expanded={googleOpen}>
          {googleOpen ? 'Nascondi Google' : 'Google personale'}
        </Button>}
      </div>
      {showGoogle && googleOpen && <div className="mt-2"><PersonalGoogleSettings /></div>}
      <PersonalRecoverySettings key={space.access?.profile.id} />
    </div>}
  </section>;
}