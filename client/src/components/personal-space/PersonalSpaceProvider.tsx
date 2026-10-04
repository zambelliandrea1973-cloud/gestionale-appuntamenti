import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { spaceApi, setSpaceExpiredHandler, setSpaceToken, getSpaceToken, type SpaceAccess, type SpaceProfiles } from './api';

export const PERSONAL_SPACE_PROFILES_KEY = ['/api/personal-appointments/space/profiles'] as const;
const ACCESS_KEY = ['/api/personal-appointments/space/access'] as const;
type SpaceContextValue = { profiles?: SpaceProfiles; access?: SpaceAccess; isLoading: boolean; unlocked: boolean; requestAccess: () => void; lock: () => Promise<void>; refresh: () => void };
const PersonalSpaceContext = createContext<SpaceContextValue | null>(null);
export const usePersonalSpace = () => {
  const value = useContext(PersonalSpaceContext);
  if (!value) throw new Error('PersonalSpaceProvider mancante');
  return value;
};

export function PersonalSpaceProvider({ children, accountKey }: { children: ReactNode; accountKey?: number | string }) {
  const client = useQueryClient();
  const mounted = useRef(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [profileId, setProfileId] = useState<number | undefined>();
  const [identityId, setIdentityId] = useState<number | undefined>();
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const profilesQuery = useQuery({ queryKey: [...PERSONAL_SPACE_PROFILES_KEY, accountKey], queryFn: spaceApi.profiles, retry: 1, staleTime: 30_000, refetchInterval: 30_000 });
  const accessQuery = useQuery({ queryKey: [...ACCESS_KEY, accountKey, profileId], queryFn: spaceApi.access, enabled: tokenReady, retry: false, refetchInterval: 30_000 });
  const multi = profilesQuery.data?.multi === true;
  const unlocked = !!profilesQuery.data && !!accessQuery.data?.profile && tokenReady && (!multi || !!getSpaceToken());

  const purge = useCallback(() => {
    client.removeQueries({ predicate: query =>
      (String(query.queryKey[0]).includes('/api/personal-appointments') || query.queryKey[1] === 'personal') &&
      !String(query.queryKey[0]).includes('/space/profiles') &&
      !String(query.queryKey[0]).includes('/busy')
    });
    client.removeQueries({ queryKey: ACCESS_KEY });
  }, [client]);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      setSpaceToken(null);
      setTokenReady(false);
      purge();
    }
  }, [purge]);
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
    const timer = window.setTimeout(() => void lock(), 30 * 60_000);
    return () => window.clearTimeout(timer);
  }, [multi, tokenReady, profileId, lock]);
  useEffect(() => () => {
    setSpaceToken(null);
    purge();
  }, [purge]);
  useEffect(() => {
    setSpaceExpiredHandler(() => { setTokenReady(false); setProfileId(undefined); purge(); });
    return () => setSpaceExpiredHandler(null);
  }, [purge]);
  useEffect(() => {
    if (profilesQuery.data && !profilesQuery.data.multi) {
      if (!tokenReady) {
        // Solo owner has automatic access; the endpoint may issue access without password.
        setProfileId(profilesQuery.data.singleProfileId);
        setSpaceToken(null);
        setTokenReady(true);
      }
    }
  }, [profilesQuery.data, tokenReady]);
  useEffect(() => {
    const handle = () => { void lock(); };
    window.addEventListener('personal-space-profile-change', handle);
    return () => window.removeEventListener('personal-space-profile-change', handle);
  }, [lock]);
  const requestAccess = useCallback(() => {
    if (unlocked) return;
    setPrompt(true); setError('');
  }, [unlocked]);
  useEffect(() => {
    const handle = () => requestAccess();
    window.addEventListener('personal-space-request', handle);
    return () => window.removeEventListener('personal-space-request', handle);
  }, [requestAccess]);
  const refresh = useCallback(() => { void profilesQuery.refetch(); void accessQuery.refetch(); }, [profilesQuery.refetch, accessQuery.refetch]);
  async function submitAccess(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const selected = profilesQuery.data?.profiles.find(profile => profile.id === profileId);
      const enrollIdentity = profilesQuery.data?.identities.find(identity => identity.identityId === identityId);
      const result = enrollIdentity && (!selected || !enrollIdentity.configured || (enrollIdentity.profileId === selected.id && enrollIdentity.passwordConfigured === false))
        ? await spaceApi.enroll({ identityId: enrollIdentity.identityId, name: profileName.trim() || enrollIdentity.name, password })
        : selected ? await spaceApi.unlock({ profileId: selected.id, password }) : null;
      if (!result) throw new Error('Seleziona il tuo profilo.');
      setSpaceToken(result.token); setProfileId(result.profile.id); setTokenReady(true);
      purge(); setPrompt(false); setPassword('');
      await client.invalidateQueries({ queryKey: ACCESS_KEY });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Accesso non riuscito.'); }
    finally { setBusy(false); }
  }
  const value = useMemo(() => ({ profiles: profilesQuery.data, access: unlocked ? accessQuery.data : undefined, isLoading: profilesQuery.isLoading || accessQuery.isLoading, unlocked, requestAccess, lock, refresh }), [profilesQuery.data, profilesQuery.isLoading, accessQuery.data, accessQuery.isLoading, unlocked, requestAccess, lock, refresh]);
  return <PersonalSpaceContext.Provider value={value}>
    {children}
    {prompt && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="personal-space-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-[#fbfaf6] p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-teal-100 p-2 text-teal-800"><LockKeyhole className="h-5 w-5" /></span><div><h2 id="personal-space-title" className="text-lg font-semibold text-slate-900">Spazio personale</h2><p className="text-sm text-slate-600">I tuoi impegni restano privati; ai colleghi compare solo “Occupato”.</p></div></div>
        <form className="space-y-3" onSubmit={submitAccess}>
          <label className="block text-sm font-medium">Profilo
            <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" value={identityId != null ? `identity:${identityId}` : profileId ?? ''} onChange={event => {
              const value = event.target.value;
              if (value.startsWith('identity:')) { const next = Number(value.slice(9)); setIdentityId(next); setProfileId(profilesQuery.data?.identities.find(row => row.identityId === next)?.profileId); }
              else { setIdentityId(undefined); setProfileId(Number(value)); }
            }}>
              <option value="">{profilesQuery.isLoading ? 'Caricamento profili…' : 'Seleziona profilo'}</option>{profilesQuery.data?.profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              {profilesQuery.data?.identities.filter(identity => !identity.configured || identity.passwordConfigured === false).map(identity => <option key={`identity-${identity.identityId}`} value={`identity:${identity.identityId}`}>{identity.name} · configura accesso</option>)}
            </select>
          </label>
          {profilesQuery.isError && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><p>Impossibile caricare i profili.</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void profilesQuery.refetch()}>Riprova</Button></div>}
          {identityId != null && <label className="block text-sm font-medium">Nome profilo<Input value={profileName} onChange={event => setProfileName(event.target.value)} placeholder={profilesQuery.data?.identities.find(row => row.identityId === identityId)?.name || 'Nome profilo'} /></label>}
          <label className="block text-sm font-medium">{identityId != null ? 'Crea password personale (almeno 10 caratteri)' : 'Password personale'}<Input autoFocus required minLength={identityId != null ? 10 : undefined} type="password" autoComplete={identityId != null ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setPrompt(false)}>Annulla</Button><Button type="submit" disabled={busy || (identityId == null && !profileId) || !password}>{busy ? 'Verifica…' : identityId != null ? 'Configura e apri' : 'Apri spazio'}</Button></div>
        </form>
        <p className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />L’accesso scade quando blocchi lo spazio o cambi profilo.</p>
      </section>
    </div>}
  </PersonalSpaceContext.Provider>;
}