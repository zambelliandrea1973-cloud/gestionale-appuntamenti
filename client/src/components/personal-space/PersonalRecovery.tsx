import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { spaceApi } from './api';

function CodeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm">Codice ricevuto via email
    <Input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8}
      value={value} onChange={event => onChange(event.target.value)} placeholder="8 cifre" />
  </label>;
}

/** Mounted only within the unlocked profile, never in the shared account settings. */
export function PersonalRecoverySettings() {
  const [verified, setVerified] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    spaceApi.recoveryStatus().then(result => {
      if (mounted.current) setVerified(result.email);
    }).catch(() => { if (mounted.current) setError('Impossibile leggere lo stato del recupero. Riapri lo spazio per riprovare.'); });
    return () => { mounted.current = false; };
  }, []);
  async function run(action: 'send' | 'verify') {
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'send') {
        await spaceApi.recoveryEmail(email.trim());
        if (!mounted.current) return;
        setSent(true); setCode(''); setNotice('Codice inviato. Scade tra 15 minuti; controlla anche la posta indesiderata.');
      } else {
        await spaceApi.recoveryVerify(code);
        if (!mounted.current) return;
        setVerified(email.trim().toLowerCase()); setSent(false); setCode(''); setOpen(false);
        setNotice('Email verificata. Potrai usarla se dimentichi la password personale.');
      }
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <section className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm sm:basis-full" aria-label="Recupero password personale">
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>
      {verified ? 'Email di recupero verificata' : 'Configura recupero password'}
    </Button>
    {!verified && <p className="mt-2 text-xs text-slate-600">Verifica la tua email personale ora: servirà per recuperare l’accesso senza perdere gli impegni.</p>}
    {open && <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void run(sent ? 'verify' : 'send'); }}>
      {verified && <p>Email attuale: {verified}</p>}
      <p className="text-xs text-slate-600">Usa una casella accessibile solo a te, non quella condivisa dello studio. {verified ? 'La precedente resta valida finché non verifichi quella nuova.' : ''}</p>
      <label className="block">Email personale<Input type="email" autoComplete="email" required maxLength={254} disabled={sent || busy} value={email} onChange={event => setEmail(event.target.value)} /></label>
      {sent && <CodeInput value={code} onChange={setCode} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || verified === undefined}>{busy ? 'Attendi…' : sent ? 'Verifica email' : 'Invia codice di verifica'}</Button>
        {sent && <Button type="button" variant="outline" disabled={busy} onClick={() => { setSent(false); setCode(''); }}>Cambia email / reinvia</Button>}
      </div>
    </form>}
    {notice && <p role="status" className="mt-2 text-teal-800">{notice}</p>}
    {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
  </section>;
}

export function PersonalPasswordRecovery({ profileId, onDone }: { profileId: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (sent && password !== confirm) { setError('Le due password non coincidono.'); return; }
    setBusy(true);
    try {
      if (!sent) {
        const result = await spaceApi.recoveryRequest(profileId, email.trim());
        if (!mounted.current) return;
        setNotice(result.message); setSent(true);
      } else {
        await spaceApi.recoveryReset(profileId, code, password);
        if (!mounted.current) return;
        setPassword(''); setConfirm(''); setCode(''); setDone(true);
        setNotice('Password aggiornata. Gli impegni sono conservati e i precedenti accessi personali sono stati chiusi. Accedi con la nuova password.');
      }
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  if (!open) return <Button type="button" variant="link" className="mt-2 px-0" onClick={() => setOpen(true)}>Password personale dimenticata?</Button>;
  return <section className="mt-4 border-t pt-3" aria-label="Reimposta password personale">
    <h3 className="font-semibold">Recupera l’accesso personale</h3>
    <p className="my-2 text-xs text-slate-600">Serve l’email verificata in precedenza nel tuo spazio personale. L’email del gestionale o di Google non viene abilitata automaticamente.</p>
    {!done && <form className="space-y-3" onSubmit={submit}>
      <label className="block text-sm">Email personale verificata<Input type="email" required disabled={sent || busy} maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
      {sent && <>
        <CodeInput value={code} onChange={setCode} />
        <label className="block text-sm">Nuova password (almeno 4 caratteri)<PasswordInput required minLength={4} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label className="block text-sm">Ripeti nuova password<PasswordInput required minLength={4} maxLength={128} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /></label>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>{busy ? 'Attendi…' : sent ? 'Imposta nuova password' : 'Invia codice'}</Button>
        {sent && <Button type="button" variant="outline" disabled={busy} onClick={() => { setSent(false); setCode(''); setPassword(''); setConfirm(''); }}>Reinvia / cambia email</Button>}
        <Button type="button" variant="ghost" disabled={busy} onClick={() => { setOpen(false); setSent(false); setCode(''); setPassword(''); setConfirm(''); setError(''); setNotice(''); }}>Annulla</Button>
      </div>
    </form>}
    {notice && <p role="status" className="mt-2 text-sm text-teal-800">{notice}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    {done && <Button type="button" className="mt-3" onClick={onDone}>Torna all’accesso</Button>}
  </section>;
}
