import { useEffect, useRef, useState } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { personalRequest } from '@/components/personal-space/api';
import { createAppointmentOperations, type OperationState } from '@/lib/appointmentOperations';

type Options = {
  kind: 'personal' | 'work'; profileId?: number; enabled: boolean; language: string;
  onMessage: (message: string) => Promise<void> | void;
  onChanged?: (date: string) => void;
};
export function useExistingAppointmentAssistant(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [state, setState] = useState<OperationState | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const scope = () => `${latest.current.kind}:${latest.current.profileId ?? ''}:${(queryClient.getQueryData<any>(['/api/user-with-license'])?.id) ?? ''}`;
  const engine = useRef<ReturnType<typeof createAppointmentOperations> | null>(null);
  if (!engine.current) engine.current = createAppointmentOperations({
    scope, enabled: () => mounted.current && latest.current.enabled,
    language: () => latest.current.language,
    state: value => { if (mounted.current) setState(value); },
    say: async message => { if (mounted.current) await latest.current.onMessage(message); },
    load: async () => latest.current.kind === 'personal'
      ? personalRequest<any[]>('') : (await apiRequest('GET', '/api/appointments')).json(),
    read: async id => latest.current.kind === 'personal'
      ? personalRequest<any>(`/${id}`) : (await apiRequest('GET', `/api/appointments/${id}`)).json(),
    write: async (action, record, changes) => {
      if (latest.current.kind === 'personal') {
        await personalRequest(`/${record.id}`, { method: action === 'delete' ? 'DELETE' : 'PUT', ...(changes ? { body: JSON.stringify(changes) } : {}) });
      } else {
        const payload = changes ? { ...record, date: changes.date, startTime: changes.startTime, endTime: changes.endTime } : undefined;
        await apiRequest(action === 'delete' ? 'DELETE' : 'PUT', `/api/appointments/${record.id}`, payload);
      }
    },
    changed: async (_record, date) => {
      const sourceScope = scope();
      await queryClient.invalidateQueries({ predicate: query => {
        const key = String(query.queryKey[0]);
        return key.startsWith('/api/appointments') || key === '/api/personal-appointments' || key.startsWith('/api/personal-appointments/busy');
      } });
      if (mounted.current && latest.current.enabled && sourceScope === scope()) latest.current.onChanged?.(date);
    },
  });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; engine.current?.reset(); };
  }, []);
  useEffect(() => { engine.current?.reset(); }, [options.kind, options.profileId, options.enabled]);
  const run = async (callback: () => Promise<any>) => {
    if (busy) return true;
    setBusy(true);
    try { return await callback(); }
    catch (error: any) {
      if (mounted.current && latest.current.enabled) await latest.current.onMessage(
        error?.message || 'Operazione non riuscita. Nessun successo è stato confermato: controlla l’appuntamento e riprova.');
      return true;
    } finally { if (mounted.current) setBusy(false); }
  };
  return {
    state: options.enabled && state?.scope === scope() ? state : null, busy,
    handle: (text: string, fields?: Parameters<ReturnType<typeof createAppointmentOperations>['handle']>[1]) => run(() => engine.current!.handle(text, fields)),
    choose: (id: number) => run(() => engine.current!.choose(id)),
    confirm: () => run(() => engine.current!.confirm()),
    reset: () => engine.current!.reset(),
    cancel: () => { engine.current!.reset(); void latest.current.onMessage('Operazione annullata. Nessun appuntamento modificato.'); },
  };
}
