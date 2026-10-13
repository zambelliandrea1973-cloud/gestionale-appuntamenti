import React from 'react';
import { CalendarClock, Check, MoveRight, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAssistantDate } from '@/lib/appointmentAssistant';
import { appointmentLabel, movedAppointment, type OperationState } from '@/lib/appointmentOperations';
import { appointmentOperationText, type AppointmentOperationMessage } from '@/lib/appointmentOperationMessages';

type ExistingAssistant = {
  state: OperationState | null;
  busy: boolean;
  choose: (id: number) => void | Promise<unknown>;
  confirm: () => void | Promise<unknown>;
  cancel: () => void;
};

type Props = {
  assistant: ExistingAssistant;
  language: string;
  disabled?: boolean;
};

export default function ExistingAppointmentOperationCard({ assistant, language, disabled = false }: Props) {
  const t = (key: AppointmentOperationMessage) => appointmentOperationText(language, key);
  const state = assistant.state;
  if (!state) return null;
  const formatDate = (date: string) => formatAssistantDate(date, language);
  const busy = disabled || assistant.busy;
  const hasMoveDestination = Boolean(state.changes.date || state.changes.startTime || state.changes.endTime || state.changes.durationMinutes);
  let destination: ReturnType<typeof movedAppointment> | null = null;
  if (state.action === 'move' && state.selected && hasMoveDestination) {
    try { destination = movedAppointment(state.selected, state.changes); } catch { /* Ask for valid fields without crashing the chat. */ }
  }

  return (
    <section aria-label={t(state.action === 'delete' ? 'deleteLabel' : 'moveLabel')}
      className="mx-3 mb-3 min-w-0 rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-sm shadow-sm sm:mx-4">
      <div className="mb-2 flex items-center gap-2 font-semibold text-violet-950">
        {state.action === 'delete' ? <Trash2 className="h-4 w-4 shrink-0" /> : <CalendarClock className="h-4 w-4 shrink-0" />}
        <span>{t(state.action === 'delete' ? 'deleteTitle' : 'moveTitle')}</span>
      </div>

      {state.phase === 'search' && (
        <p className="text-violet-900">{t('searching')}</p>
      )}

      {state.phase === 'choose' && state.candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-violet-900">{t('selectAppointment')}</p>
          <div className="grid max-h-56 gap-2 overflow-y-auto">
            {state.candidates.map((candidate, index) => (
              <Button key={candidate.id} type="button" variant="outline" disabled={busy}
                onClick={() => void assistant.choose(candidate.id)}
                className="h-auto min-w-0 justify-start whitespace-normal border-violet-200 bg-white px-3 py-2 text-left text-violet-950 hover:bg-violet-100">
                <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block break-words font-semibold">{appointmentLabel(candidate, t('appointment'))}</span>
                  {(candidate.client || candidate.service) && (
                    <span className="block break-words text-xs text-muted-foreground">
                      {[candidate.client && [candidate.client.firstName, candidate.client.lastName].filter(Boolean).join(' '), candidate.service?.name].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(candidate.date)} · {candidate.startTime.slice(0, 5)}–{candidate.endTime.slice(0, 5)}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {state.selected && (
        <div className="min-w-0 rounded-lg border border-violet-100 bg-white p-3">
          <p className="break-words font-semibold text-slate-900">{appointmentLabel(state.selected, t('appointment'))}</p>
          {(state.selected.client || state.selected.service) && (
            <p className="break-words text-xs text-muted-foreground">
              {[state.selected.client && [state.selected.client.firstName, state.selected.client.lastName].filter(Boolean).join(' '), state.selected.service?.name].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(state.selected.date)} · {state.selected.startTime.slice(0, 5)}–{state.selected.endTime.slice(0, 5)}
          </p>
          {state.action === 'move' && destination && (
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="break-words text-muted-foreground">{formatDate(state.selected.date)} · {state.selected.startTime.slice(0, 5)}</span>
              <MoveRight className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              <span className="break-words font-semibold text-violet-900">{formatDate(destination.date)} · {destination.startTime}–{destination.endTime}</span>
            </div>
          )}
        </div>
      )}

      {state.phase === 'details' && (
        <p className="mt-2 text-violet-900">{t('enterDestination')}</p>
      )}

      {state.phase === 'confirm' && (
        <Button type="button" disabled={busy} onClick={() => void assistant.confirm()}
          className={`mt-3 w-full gap-2 ${state.action === 'delete' ? 'bg-rose-700 text-white hover:bg-rose-800' : 'bg-violet-700 text-white hover:bg-violet-800'}`}>
          {state.action === 'delete' ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {t(state.action === 'delete' ? 'confirmDelete' : 'confirmMove')}
        </Button>
      )}

      <Button type="button" variant="ghost" disabled={busy} onClick={assistant.cancel}
        className="mt-2 h-9 w-full gap-2 text-slate-600 hover:bg-white">
        <X className="h-4 w-4" /> {t('cancelOperation')}
      </Button>
    </section>
  );
}
