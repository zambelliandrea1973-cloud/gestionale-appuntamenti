import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/">
          <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Home
          </Button>
        </Link>

        <article className="prose dark:prose-invert max-w-none">
          <h1>Informativa sulla Privacy</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: 1 Dicembre 2025</p>

          <h2>1. Introduzione</h2>
          <p>
            Gestionale Appuntamenti ("noi", "nostro/a" o "nostri") gestisce l'applicazione web Gestionale Appuntamenti ("Servizio").
          </p>
          <p>
            Questa pagina ti informa delle nostre politiche riguardanti la raccolta, l'uso e la divulgazione dei dati personali 
            quando usi il nostro Servizio e delle scelte che hai riguardo a tali dati.
          </p>

          <h2>2. Raccolta e Utilizzo dei Dati</h2>
          <p>Raccogliamo diversi tipi di informazioni per vari scopi al fine di fornirti un migliore servizio:</p>

          <h3>2.1 Tipi di Dati Raccolti</h3>
          <ul>
            <li><strong>Dati Personali:</strong> Nome, indirizzo email, numero di telefono, indirizzo</li>
            <li><strong>Dati di Utilizzo:</strong> Informazioni sul browser, indirizzi IP, pagine visitate</li>
            <li><strong>Dati di Calendario:</strong> Appuntamenti, disponibilità, preferenze professionali</li>
            <li><strong>Dati di Pagamento:</strong> Informazioni di fatturazione (elaborate in modo sicuro)</li>
            <li><strong>Dati di Google Calendar:</strong> Token di autenticazione OAuth (per sincronizzazione)</li>
          </ul>

          <h3>2.2 Utilizzo dei Dati</h3>
          <p>Utilizziamo i dati raccolti per:</p>
          <ul>
            <li>Fornire e mantenere il Servizio</li>
            <li>Notificare i cambiamenti al nostro Servizio</li>
            <li>Consentire la partecipazione del cliente alle funzioni interattive del Servizio</li>
            <li>Fornire assistenza clienti</li>
            <li>Raccogliere analitiche per migliorare il Servizio</li>
            <li>Monitorare l'utilizzo del Servizio</li>
            <li>Rilevare, prevenire e affrontare frodi e problemi di sicurezza</li>
          </ul>

          <h2>3. Sicurezza dei Dati</h2>
          <p>
            La sicurezza dei tuoi dati è importante per noi, ma nessun metodo di trasmissione su Internet 
            o metodo di archiviazione elettronica è 100% sicuro. 
            Anche se sforniamo di proteggere i tuoi dati personali con mezzi ragionevoli, 
            non possiamo garantire una sicurezza assoluta.
          </p>

          <h2>4. Dati di Google Calendar</h2>
          <p>
            Quando autorizzi la sincronizzazione con Google Calendar, raccogliamo e immagazziniamo:
          </p>
          <ul>
            <li>Token di accesso OAuth per accedere al tuo calendario</li>
            <li>Gli appuntamenti che scegli di sincronizzare</li>
            <li>Le informazioni sugli eventi del calendario (titolo, orario, partecipanti)</li>
          </ul>
          <p>
            Questi dati vengono utilizzati esclusivamente per sincronizzare gli appuntamenti con il tuo Google Calendar. 
            Puoi revocare l'accesso in qualsiasi momento dalle impostazioni del tuo account Google.
          </p>

          <h2>5. Cookie</h2>
          <p>
            Utilizziamo i cookie per identificarti e ricordare le tue preferenze. 
            Puoi disabilitare i cookie tramite le impostazioni del tuo browser.
          </p>

          <h2>6. Link a Siti di Terze Parti</h2>
          <p>
            Il nostro Servizio può contenere link a siti web di terze parti. 
            Non siamo responsabili per le pratiche sulla privacy di tali siti.
          </p>

          <h2>7. Diritti dell'Utente</h2>
          <p>In conformità con il GDPR, hai il diritto di:</p>
          <ul>
            <li>Accedere ai tuoi dati personali</li>
            <li>Correggere dati imprecisi</li>
            <li>Richiedere l'eliminazione dei tuoi dati</li>
            <li>Opporsi al trattamento dei tuoi dati</li>
            <li>Limitare il trattamento</li>
            <li>Richiedere la portabilità dei dati</li>
          </ul>

          <h2>8. Contatti</h2>
          <p>
            Se hai domande su questa Informativa sulla Privacy, 
            puoi contattarci all'indirizzo email di supporto nel tuo account.
          </p>

          <h2>9. Modifiche a questa Informativa sulla Privacy</h2>
          <p>
            Potremmo aggiornare la nostra Informativa sulla Privacy di tanto in tanto. 
            Ti notificheremo di eventuali modifiche pubblicando la nuova Informativa sulla Privacy in questa pagina.
          </p>
        </article>
      </div>
    </div>
  );
}
