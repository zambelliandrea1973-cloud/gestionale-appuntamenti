import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ExistingAppointmentOperationCard from '../../client/src/components/ExistingAppointmentOperationCard';
import { useExistingAppointmentAssistant } from '../../client/src/hooks/use-existing-appointment-assistant';

const records: any[] = [
  { id: 7, title: 'Dentista', date: '2026-10-28', startTime: '15:00', endTime: '16:00', notes: 'Nota originale', location: 'Studio' },
  { id: 8, title: 'Dentista', date: '2026-11-02', startTime: '10:00', endTime: '11:00', notes: '', location: '' },
];
(window as any).mutations = [];
window.fetch = async (input, init) => {
  const path = String(input), method = init?.method || 'GET';
  if (!path.startsWith('/api/personal-appointments')) throw new Error(`Unexpected fixture request: ${path}`);
  const id = Number(path.split('/').at(-1));
  if (method === 'GET') return Response.json(id ? records.find(record => record.id === id) : records);
  if ((window as any).failNext) {
    (window as any).failNext = false;
    return Response.json({ message: 'La fascia oraria è occupata. Scegli un altro orario.' }, { status: 409 });
  }
  (window as any).mutations.push({ path, method, body: init?.body ? JSON.parse(String(init.body)) : null });
  if (method === 'PUT') Object.assign(records.find(record => record.id === id), JSON.parse(String(init?.body)));
  if (method === 'DELETE') records.splice(records.findIndex(record => record.id === id), 1);
  return Response.json({ success: true });
};
function Harness() {
  const [messages, setMessages] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [profileId, setProfileId] = useState(3);
  const assistant = useExistingAppointmentAssistant({
    kind: 'personal', enabled: true, profileId, language: 'it',
    onMessage: message => { setMessages(previous => [...previous, message]); },
  });
  return <main>
    <h1>Verifica isolata assistente calendario</h1>
    <div aria-label="Risposte">{messages.map((message, index) => <p key={index}>{message}</p>)}</div>
    <ExistingAppointmentOperationCard assistant={assistant} language="it" />
    <form onSubmit={event => {
      event.preventDefault();
      const fields = /17/.test(text) ? { date: '2026-10-29', startTime: '17:00' } : /più tardi/.test(text) ? { action: 'move' as const, searchTitle: 'Dentista' } : {};
      void assistant.handle(text, fields); setText('');
    }}>
      <input aria-label="Richiesta" value={text} onChange={event => setText(event.target.value)} />
      <button disabled={assistant.busy}>Invia</button>
    </form>
    <button onClick={() => setProfileId(9)}>Cambia profilo</button>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
