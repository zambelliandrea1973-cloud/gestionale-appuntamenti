import { useTranslation } from 'react-i18next';
import { useAppointmentMode } from '@/hooks/use-appointment-mode';

export default function AppointmentModeSwitch() {
  const [mode, setMode] = useAppointmentMode();
  const { t } = useTranslation();
  const personal = mode === 'personal';
  return <button type="button" role="switch" aria-checked={personal}
    aria-label={t('personalAppointments.switchLabel', 'Modalità impegni personali')}
    onClick={() => setMode(personal ? 'work' : 'personal')}
    className="h-12 shrink-0 flex items-center gap-1.5 rounded-full border border-[#dde3d8] bg-[#f7f8f5] px-2 text-[#57634f] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <span aria-hidden="true" className={`flex w-[31px] h-[19px] rounded-full p-[2px] transition-colors ${personal ? 'bg-primary' : 'bg-[#bdc5b6]'}`}>
      <span className={`h-[15px] w-[15px] rounded-full bg-white shadow transition-transform ${personal ? 'translate-x-[12px]' : ''}`} />
    </span>
    <span className="flex flex-col text-left leading-tight"><small className="text-[8px] sm:text-[10px]">{t('personalAppointments.mode', 'Modalità')}</small><b className="text-[10px] sm:text-xs">{personal ? t('personalAppointments.personal', 'Personale') : t('personalAppointments.work', 'Lavoro')}</b></span>
  </button>;
}