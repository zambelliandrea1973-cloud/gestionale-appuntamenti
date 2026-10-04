import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { privateApi, clearPrivateToken, setPrivateToken, setPrivateUnauthorizedHandler, PrivateApiError, type EventDraft, type PrivateAccess, type PrivateEvent, type PrivateIdentity, type PrivateProfiles } from './api';

type PrivateContextValue = {
  profiles: PrivateProfiles | null; access: PrivateAccess | null; events: PrivateEvent[];
  loading: boolean; error: string; mode: 'work' | 'free'; dialog: 'manual' | 'voice' | null;
  profileId: number | null; generation: number; creationDefaults: Partial<EventDraft> | null; openCreate: (kind: 'manual'|'voice', defaults?: Partial<EventDraft>) => void;
  closeDialog: () => void; setMode: (mode: 'work'|'free') => void; reload: (start?: string, end?: string) => Promise<void>;
  unlock: (profileId: number, password: string) => Promise<void>;
  enroll: (identityId: number, name: string, password: string) => Promise<void>;
  lock: () => Promise<void>; selectProfile: (identity: PrivateIdentity) => void;
  setEvents: (events: PrivateEvent[]) => void; lockImmediately: () => void;
  refreshProfiles: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  isGenerationCurrent: (expected: number) => boolean;
};
const Context = createContext<PrivateContextValue | null>(null);
const range = () => {
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth()-1, 1), end = new Date(now.getFullYear(), now.getMonth()+2, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return [fmt(start), fmt(end)] as const;
};
export function PrivateAppointmentsProvider({ children, accountKey }: { children: ReactNode; accountKey?: number | string }) {
  const queryClient = useQueryClient();
  const [profiles, setProfiles] = useState<PrivateProfiles|null>(null);
  const [access, setAccess] = useState<PrivateAccess|null>(null);
  const [events, setEventsState] = useState<PrivateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'work'|'free'>('work');
  const [dialog, setDialog] = useState<'manual'|'voice'|null>(null);
  const [creationDefaults, setCreationDefaults] = useState<Partial<EventDraft>|null>(null);
  const [profileId, setProfileId] = useState<number|null>(null);
  const generation = useRef(0);
  const active = useRef(true);
  const tokenExpiry = useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearSensitive = useCallback(() => {
    generation.current++;
    if(tokenExpiry.current) clearTimeout(tokenExpiry.current);
    tokenExpiry.current=null;
    clearPrivateToken();
    setAccess(null); setEventsState([]); setDialog(null); setCreationDefaults(null); setProfileId(null);
    setMode('work');
    queryClient.removeQueries({ predicate: q => String(q.queryKey[0]).startsWith('private-appointments') });
  }, [queryClient]);
  const armTokenExpiry = useCallback(() => {
    if(tokenExpiry.current) clearTimeout(tokenExpiry.current);
    tokenExpiry.current=setTimeout(()=>{
      tokenExpiry.current=null;
      clearSensitive();
      setError('La sessione privata è scaduta. Sblocca nuovamente lo spazio.');
    },30*60*1000);
  },[clearSensitive]);
  useEffect(() => { setPrivateUnauthorizedHandler(clearSensitive); return () => setPrivateUnauthorizedHandler(null); }, [clearSensitive]);
  const lockImmediately = useCallback(() => { clearSensitive(); }, [clearSensitive]);
  useEffect(() => {
    active.current = true;
    clearSensitive();
    setProfiles(null);
    const requestGeneration = generation.current;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const p = await privateApi.profiles();
        if (!active.current || requestGeneration !== generation.current) return;
        setProfiles(p);
        if (!p.multi && p.singleProfileId != null) {
          const gen = ++generation.current;
          try {
            const a = await privateApi.access();
            if (!active.current || gen !== generation.current) return;
            setAccess(a); setProfileId(a.profile.id);
          } catch (e) { if ((e as PrivateApiError).status !== 401 && (e as PrivateApiError).status !== 403) setError((e as Error).message); }
        }
      } catch (e) { if (active.current) setError((e as Error).message || 'Impossibile caricare gli spazi privati.'); }
      finally { if (active.current) setLoading(false); }
    };
    void load();
    return () => { active.current = false; if(tokenExpiry.current)clearTimeout(tokenExpiry.current);tokenExpiry.current=null;clearPrivateToken();generation.current++; };
  }, [accountKey, clearSensitive]);
  const reload = useCallback(async (start?: string, end?: string) => {
    if (!access) { setEvents([]); return; }
    const [defaultStart, defaultEnd] = range(), requestGeneration = generation.current, owner = access.profile.id;
    try {
      const result = await privateApi.events(start || defaultStart, end || defaultEnd);
      if (requestGeneration === generation.current && owner === profileId) setEvents(result);
      setError('');
    } catch (e) {
      if (requestGeneration !== generation.current || owner !== profileId) return;
      if ((e as PrivateApiError).status === 401 || (e as PrivateApiError).status === 403) { clearSensitive(); return; }
      setError((e as Error).message || 'Impossibile caricare gli impegni privati.');
    }
  }, [access, profileId, clearSensitive]);
  const unlock = useCallback(async (id: number, password: string) => {
    clearSensitive();
    const attemptGeneration = generation.current;
    try {
      const result = await privateApi.unlock({ profileId:id, password });
      if (attemptGeneration !== generation.current) return;
      setPrivateToken(result.token); armTokenExpiry(); setProfileId(result.profile.id);
      const gen = ++generation.current;
      const a = await privateApi.access();
      if (gen !== generation.current) return;
      setAccess(a); setError('');
    } catch (e) { if (attemptGeneration === generation.current) clearSensitive(); throw e; }
  }, [clearSensitive, armTokenExpiry]);
  const enroll = useCallback(async (identityId:number,name:string,password:string) => {
    clearSensitive();
    const attemptGeneration = generation.current;
    try {
      const result = await privateApi.createProfile({ identityId, name, password });
      if (attemptGeneration !== generation.current) return;
      setPrivateToken(result.token); armTokenExpiry(); setProfileId(result.profile.id);
      const gen = ++generation.current, a = await privateApi.access();
      if (gen !== generation.current) return;
      setAccess(a); setError('');
      try { setProfiles(await privateApi.profiles()); } catch { /* Enrollment and access are already complete. */ }
    } catch (e) {
      if (attemptGeneration === generation.current) clearSensitive();
      throw e;
    }
  }, [clearSensitive, armTokenExpiry]);
  const lock = useCallback(async () => {
    const pending = access ? privateApi.lock() : Promise.resolve();
    clearSensitive();
    try { await pending; } catch { /* local lock still takes effect */ }
  }, [access, clearSensitive]);
  useEffect(() => {
    if(!access)return;
    let live=true;
    const expectedProfile=access.profile.id;
    const checkAccess=async()=>{
      const requestGeneration=generation.current;
      try {
        const current=await privateApi.access();
        if(!live||requestGeneration!==generation.current||current.profile.id!==expectedProfile)return;
        if(current.multi&&!access.multi){
          clearSensitive();
          setError('Lo studio ora ha più professionisti. Sblocca nuovamente lo spazio personale.');
          const latestProfiles=await privateApi.profiles();
          if(live)setProfiles(latestProfiles);
          return;
        }
        if(current.google.connected!==access.google.connected||current.google.calendarId!==access.google.calendarId||current.google.email!==access.google.email) setAccess(current);
      } catch(error) {
        if(!live||requestGeneration!==generation.current)return;
        const status=(error as PrivateApiError).status;
        if(status===401||status===403)return;
        if(live)setError((error as Error).message||'Verifica dello spazio privato non riuscita.');
      }
    };
    const timer=window.setInterval(()=>void checkAccess(),30_000);
    return()=>{live=false;window.clearInterval(timer);};
  },[access?.profile.id,access?.multi,access?.google.connected,access?.google.calendarId,access?.google.email,clearSensitive]);
  const selectProfile = useCallback((identity: PrivateIdentity) => {
    void lock();
    setProfileId(identity.profileId ?? null);
  }, [lock]);
  const openCreate = useCallback((kind:'manual'|'voice', defaults?: Partial<EventDraft>) => {
    if(!access){setDialog(null);setError('Sblocca lo spazio privato per aprire un modulo.');return;}
    setCreationDefaults(defaults ?? null);
    setDialog(kind);
  }, [access]);
  const renderGeneration = generation.current;
  const isGenerationCurrent = useCallback((expected: number) => generation.current === expected, []);
  const setEvents = useCallback((next: PrivateEvent[]) => {
    if (renderGeneration === generation.current) setEventsState(next);
  }, [renderGeneration]);
  const refreshProfiles = useCallback(async () => {
    setLoading(true); setError('');
    const requestGeneration = generation.current;
    try {
      const result = await privateApi.profiles();
      if (requestGeneration !== generation.current) return;
      setProfiles(result);
      if (!result.multi && result.singleProfileId != null) {
        const accessGeneration = ++generation.current;
        const privateAccess = await privateApi.access();
        if (accessGeneration === generation.current) { setAccess(privateAccess); setProfileId(privateAccess.profile.id); }
      }
    }
    catch (e) { setError((e as Error).message || 'Impossibile caricare gli spazi privati.'); }
    finally { setLoading(false); }
  }, []);
  const refreshAccess = useCallback(async () => {
    const expectedGeneration=generation.current, expectedProfile=profileId;
    const result=await privateApi.access();
    if(expectedGeneration===generation.current&&(expectedProfile==null||result.profile.id===expectedProfile)){setProfileId(result.profile.id);setAccess(result);}
  },[profileId]);
  const value = useMemo(() => ({ profiles, access, events, loading, error, mode, dialog, profileId, creationDefaults, generation: generation.current, openCreate, closeDialog:()=>setDialog(null), setMode, reload, unlock, enroll, lock, selectProfile, setEvents, lockImmediately, refreshProfiles, refreshAccess, isGenerationCurrent }), [profiles,access,events,loading,error,mode,dialog,profileId,creationDefaults,openCreate,reload,unlock,enroll,lock,selectProfile,setEvents,lockImmediately,refreshProfiles,refreshAccess,isGenerationCurrent]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePrivateAppointments() {
  const value = useContext(Context);
  if (!value) throw new Error('usePrivateAppointments must be used inside PrivateAppointmentsProvider');
  return value;
}