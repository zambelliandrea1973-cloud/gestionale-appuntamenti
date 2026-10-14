import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { PersonalPasswordRecovery } from './PersonalRecovery';
import { useAppointmentMode } from '@/hooks/use-appointment-mode';
import { useTranslation } from 'react-i18next';
import { createPersonalSpaceIdle } from '../../../../shared/personalSpaceIdle';
import { spaceApi, setSpaceExpiredHandler, setSpaceToken, getSpaceToken, type SpaceAccess, type SpaceProfiles } from './api';

export const PERSONAL_SPACE_PROFILES_KEY = ['/api/personal-appointments/space/profiles'] as const;
const ACCESS_KEY = ['/api/personal-appointments/space/access'] as const;
type AccessOptions = { force?: boolean; fixedIdentity?: boolean; configureOnly?: boolean; identityName?: string; forGoogle?: boolean; onCancel?: () => void; onComplete?: () => void };
type SpaceContextValue = { profiles?: SpaceProfiles; access?: SpaceAccess; isLoading: boolean; unlocked: boolean; requestAccess: (identityId?: number, options?: AccessOptions) => void; lock: () => Promise<void>; refresh: () => void };
const PersonalSpaceContext = createContext<SpaceContextValue | null>(null);
export const usePersonalSpace = () => {
  const value = useContext(PersonalSpaceContext);
  if (!value) throw new Error('PersonalSpaceProvider mancante');
  return value;
};

export function PersonalSpaceProvider({ children, accountKey }: { children: ReactNode; accountKey?: number | string }) {
  const client = useQueryClient();
  const { t } = useTranslation();
  const [, setMode] = useAppointmentMode();
  const setModeRef = useRef(setMode);
  setModeRef.current = setMode;
  const mounted = useRef(false);
  const previousAccount = useRef(accountKey);
  const accountRef = useRef(accountKey);
  accountRef.current = accountKey;
  const idleRef = useRef<ReturnType<typeof createPersonalSpaceIdle> | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [profileId, setProfileId] = useState<number | undefined>();
  const [identityId, setIdentityId] = useState<number | undefined>();
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [configureOnly, setConfigureOnly] = useState(false);
  const [cancelAction, setCancelAction] = useState<(() => void) | null>(null);
  const [completeAction, setCompleteAction] = useState<(() => void) | null>(null);
  const requestInProgress = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forGoogle, setForGoogle] = useState(false);
  const [fixedIdentity, setFixedIdentity] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const profilesQuery = useQuery({ queryKey: [...PERSONAL_SPACE_PROFILES_KEY, accountKey], queryFn: spaceApi.profiles, retry: 1, staleTime: 30_000, refetchInterval: 30_000 });
  const accessQuery = useQuery({ queryKey: [...ACCESS_KEY, accountKey, profileId], queryFn: spaceApi.access, enabled: tokenReady, retry: false, refetchInterval: 30_000 });
  const multi = profilesQuery.data?.multi === true;
  const unlocked = !!profilesQuery.data && !!accessQuery.data?.profile && tokenReady &&
    (multi ? !!getSpaceToken() : accessQuery.data.profile.id === profilesQuery.data.singleProfileId);

  const purge = useCallback(() => {
    client.removeQueries({ predicate: query =>
      (String(query.queryKey[0]).includes('/api/personal-appointments') || query.queryKey[1] === 'personal') &&
      !String(query.queryKey[0]).includes('/space/profiles') &&
      !String(query.queryKey[0]).includes('/busy')
    });
    client.removeQueries({ queryKey: ACCESS_KEY });
  }, [client]);
  useEffect(() => {
    if (!mounted.current || previousAccount.current !== accountKey) {
      mounted.current = true;
      previousAccount.current = accountKey;
      setSpaceToken(null);
      setTokenReady(false);
      setProfileId(undefined);
      setPrompt(false);
      setIdleWarning(false);
      purge();
      client.removeQueries({ queryKey: ['/api/personal-appointments/busy'] });
    }
  }, [purge, accountKey]);
  const lock = useCallback(async () => {
    const pending = tokenReady ? spaceApi.lock() : Promise.resolve();
    setSpaceToken(null); setTokenReady(false); setProfileId(undefined); purge();
    try { await pending; } catch { /* local lock still applies */ }
  }, [purge, tokenReady]);
  useEffect(() => {
    if (multi && tokenReady && !getSpaceToken()) void lock();
  }, [multi, tokenReady, lock]);
  useEffect(() => {
    if (!multi || !tokenReady || !getSpaceToken()) return;
    const token = getSpaceToken();
    let disposed = false;
    const idle = createPersonalSpaceIdle({
      now: () => Date.now(),
      warning: setIdleWarning,
      expire: () => {
        // Switch FIRST: locked personal mode must not reopen the password form.
        setModeRef.current('work');
        setPrompt(false);
        void lock();
      },
      renew: () => {
        if (profileId == null || disposed || getSpaceToken() !== token) return;
        void spaceApi.activity(profileId).catch(() => {
          if (!disposed && getSpaceToken() === token) {
            setModeRef.current('work');
            setPrompt(false);
            void lock();
          }
        });
      },
    });
    idleRef.current = idle;
    const activity = (event: Event) => { if (event.isTrusted && document.visibilityState !== 'hidden') idle.activity(); };
    const check = () => { idle.check(); };
    // Polling only CHECKS time; it never renews or records activity.
    const timer = window.setInterval(check, 1000);
    for (const event of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(event, activity, { capture: true, passive: true });
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      for (const event of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(event, activity, true);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', check);
      if (idleRef.current === idle) idleRef.current = null;
      setIdleWarning(false);
    };
  }, [multi, tokenReady, profileId, accountKey, lock]);
  useEffect(() => () => {
    setSpaceToken(null);
    purge();
  }, [purge]);
  useEffect(() => {
    setSpaceExpiredHandler(() => {
      setModeRef.current('work'); setPrompt(false); setIdleWarning(false);
      setTokenReady(false); setProfileId(undefined); purge();
    });
    return () => setSpaceExpiredHandler(null);
  }, [purge]);
  useEffect(() => {
    if (profilesQuery.data && !profilesQuery.data.multi) {
      setPrompt(false);
      setPassword('');
      requestInProgress.current = false;
      if (!tokenReady || getSpaceToken() || profileId !== profilesQuery.data.singleProfileId) {
        // Solo owner has automatic access; the endpoint may issue access without password.
        purge();
        setProfileId(profilesQuery.data.singleProfileId);
        setSpaceToken(null);
        setTokenReady(true);
      }
    }
  }, [profilesQuery.data, tokenReady, profileId, purge]);
  useEffect(() => {
    const handle = () => { void lock(); };
    window.addEventListener('personal-space-profile-change', handle);
    return () => window.removeEventListener('personal-space-profile-change', handle);
  }, [lock]);
  const requestAccess = useCallback(async (targetIdentityId?: number, options: AccessOptions = {}) => {
    if (prompt || requestInProgress.current) return;
    requestInProgress.current = true;
    let profiles = profilesQuery.data;
    if (!profiles || (targetIdentityId != null && !profiles.identities.some(row => row.identityId === targetIdentityId))) {
      try { profiles = (await profilesQuery.refetch()).data; } catch { profiles = undefined; }
    }
    // Solo access is automatic: never expose profile/password recognition UI there.
    if (!profiles?.multi) { requestInProgress.current = false; return; }
    const target = profiles.identities.find(identity => identity.identityId === targetIdentityId);
    if (options.configureOnly && (!target || (target.passwordConfigured !== false && target.configured !== false))) { requestInProgress.current = false; return; }
    // Unlock is accepted before /access finishes loading. Do not let either
    // mode-selector effect reopen the password form during that interval.
    if ((unlocked || (tokenReady && !!getSpaceToken() && !accessQuery.isError)) &&
        !options.force && targetIdentityId == null) { requestInProgress.current = false; return; }
    if (unlocked || options.force) await lock();
    setConfigureOnly(options.configureOnly === true);
    setForGoogle(options.forGoogle === true);
    setFixedIdentity(options.fixedIdentity === true);
    setCancelAction(() => options.onCancel || null);
    setCompleteAction(() => options.onComplete || null);
    setError('');
    setPassword('');
    if (targetIdentityId != null) {
      const shouldEnroll = options.configureOnly || !target?.configured || target?.passwordConfigured === false;
      setIdentityId(shouldEnroll ? targetIdentityId : undefined);
      setProfileId(target?.profileId);
      setProfileName(options.identityName || target?.name || '');
    } else {
      setIdentityId(undefined);
      setProfileId(undefined);
      setProfileName('');
    }
    setPrompt(true);
    requestInProgress.current = false;
  }, [prompt, profilesQuery.data, profilesQuery.refetch, unlocked, tokenReady, accessQuery.isError, lock]);
  useEffect(() => {
    const handle = () => requestAccess();
    window.addEventListener('personal-space-request', handle);
    return () => window.removeEventListener('personal-space-request', handle);
  }, [requestAccess]);
  const refresh = useCallback(() => { void profilesQuery.refetch(); void accessQuery.refetch(); }, [profilesQuery.refetch, accessQuery.refetch]);
  async function submitAccess(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const accountAtSubmit = accountKey;
    try {
      const selected = profilesQuery.data?.profiles.find(profile => profile.id === profileId);
      const enrollIdentity = profilesQuery.data?.identities.find(identity => identity.identityId === identityId);
      const shouldEnroll = identityId != null && (configureOnly || !selected || !enrollIdentity?.configured || (enrollIdentity.profileId === selected.id && enrollIdentity.passwordConfigured === false));
      const result = shouldEnroll && identityId != null
        ? await spaceApi.enroll({ identityId, name: profileName.trim() || enrollIdentity?.name || 'Profilo personale', password })
        : selected ? await spaceApi.unlock({ profileId: selected.id, password }) : null;
      if (!result) throw new Error('Seleziona il tuo profilo.');
      if (accountAtSubmit !== accountRef.current) return;
      if (configureOnly) {
        setSpaceToken(result.token);
        try { await spaceApi.lock(); } catch { /* enrollment succeeded; local access is still discarded */ }
        setSpaceToken(null); setTokenReady(false); setProfileId(undefined); purge();
        setPrompt(false); setPassword('');
        requestInProgress.current = false;
        await client.invalidateQueries({ queryKey: PERSONAL_SPACE_PROFILES_KEY });
        completeAction?.();
      } else {
        setSpaceToken(result.token); setProfileId(result.profile.id); setTokenReady(true);
        purge(); setPrompt(false); setPassword('');
        requestInProgress.current = false;
        await client.invalidateQueries({ queryKey: ACCESS_KEY });
        completeAction?.();
      }
      setCancelAction(null); setCompleteAction(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Accesso non riuscito.'); }
    finally { setBusy(false); }
  }
  const value = useMemo(() => ({ profiles: profilesQuery.data, access: unlocked ? accessQuery.data : undefined, isLoading: profilesQuery.isLoading || accessQuery.isLoading, unlocked, requestAccess, lock, refresh }), [profilesQuery.data, profilesQuery.isLoading, accessQuery.data, accessQuery.isLoading, unlocked, requestAccess, lock, refresh]);
  return <PersonalSpaceContext.Provider value={value}>
    {children}
    {multi && unlocked && idleWarning && <section role="alert" className="fixed bottom-24 left-4 right-4 z-[125] mx-auto max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
      <p>{t('personalAppointments.idleWarning', 'Tra un minuto lo spazio personale si bloccherà per inattività. Gli impegni salvati restano conservati.')}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setModeRef.current('work'); void lock(); }}>{t('personalAppointments.idleLock', 'Blocca ora')}</Button>
        <Button type="button" onClick={() => idleRef.current?.activity(true)}>{t('personalAppointments.idleContinue', 'Continua nel personale')}</Button>
      </div>
    </section>}
    {prompt && multi && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="personal-space-title" className="max-h-[90dvh] overflow-y-auto w-full max-w-md rounded-2xl border border-slate-200 bg-[#fbfaf6] p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-teal-100 p-2 text-teal-800"><LockKeyhole className="h-5 w-5" /></span><div><h2 id="personal-space-title" className="text-lg font-semibold text-slate-900">{configureOnly ? 'Configura lo spazio personale' : 'Spazio personale'}</h2><p className="text-sm text-slate-600">{forGoogle ? 'Per collegare il tuo account Google al calendario privato, crea o usa la password del tuo spazio personale. È la stessa password che userai anche senza Google.' : configureOnly ? `Crea la password personale di ${profileName || 'questo collaboratore'}. Servirà per aprire il suo calendario privato, anche senza Google.` : 'Seleziona il tuo nome registrato nella struttura e usa la tua password personale, anche se non colleghi Google Calendar.'}</p></div></div>
        <form className="space-y-3" onSubmit={submitAccess}>
          <label className="block text-sm font-medium">Profilo
            <select disabled={configureOnly || forGoogle || fixedIdentity} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 disabled:opacity-70" value={identityId != null ? `identity:${identityId}` : profileId ?? ''} onChange={event => {
              const value = event.target.value;
              if (value.startsWith('identity:')) { const next = Number(value.slice(9)); setIdentityId(next); setProfileId(profilesQuery.data?.identities.find(row => row.identityId === next)?.profileId); setProfileName(profilesQuery.data?.identities.find(row => row.identityId === next)?.name || ''); }
              else { setIdentityId(undefined); setProfileId(Number(value)); }
            }}>
              <option value="">{profilesQuery.isLoading ? 'Caricamento profili…' : 'Seleziona profilo'}</option>
              {profilesQuery.data?.profiles.filter(profile => {
                const identity = profilesQuery.data?.identities.find(row => row.identityId === profile.identityId);
                return !(identity && (identity.passwordConfigured === false || identity.configured === false));
              }).map(profile => <option key={profile.id} value={profile.id}>{profilesQuery.data?.identities.find(row => row.identityId === profile.identityId)?.name || profile.name}</option>)}
              {profilesQuery.data?.identities.filter(identity => !identity.configured || identity.passwordConfigured === false).map(identity => <option key={`identity-${identity.identityId}`} value={`identity:${identity.identityId}`}>{identity.name} · configura accesso</option>)}
              {identityId != null && !profilesQuery.data?.identities.some(row => row.identityId === identityId) && <option value={`identity:${identityId}`}>{profileName || 'Collaboratore'} · configura accesso</option>}
            </select>
          </label>
          {profilesQuery.isError && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><p>Impossibile caricare i profili.</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void profilesQuery.refetch()}>Riprova</Button></div>}
          {identityId != null && !configureOnly && <p className="text-sm">Nome nella struttura: <strong>{profilesQuery.data?.identities.find(row => row.identityId === identityId)?.name || profileName}</strong></p>}
          <label className="block text-sm font-medium">{identityId != null ? 'Crea password personale (almeno 4 caratteri)' : 'Password personale'}<PasswordInput key={`${identityId}:${profileId}:${prompt}`} autoFocus required minLength={identityId != null ? 4 : undefined} autoComplete={identityId != null ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => { requestInProgress.current = false; setPrompt(false); setPassword(''); cancelAction?.(); setCancelAction(null); setCompleteAction(null); }}>Annulla</Button><Button type="submit" disabled={busy || (identityId == null && !profileId) || !password}>{busy ? 'Verifica…' : configureOnly ? 'Imposta password' : identityId != null ? 'Configura e apri' : 'Apri spazio'}</Button></div>
        </form>
        {identityId == null && !!profileId && !configureOnly && <PersonalPasswordRecovery key={profileId} profileId={profileId} onDone={() => { setPassword(''); setError(''); setProfileId(undefined); }} />}
        <p className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />L’accesso scade quando blocchi lo spazio o cambi profilo.</p>
      </section>
    </div>}
  </PersonalSpaceContext.Provider>;
}