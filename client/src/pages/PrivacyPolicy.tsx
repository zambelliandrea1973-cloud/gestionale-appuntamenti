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
            Torna alla Home / Back to Home
          </Button>
        </Link>

        <article className="prose dark:prose-invert max-w-none">

          <h1>Informativa sulla Privacy / Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento / Last updated: 1 Dicembre 2025</p>

          <hr />

          <h2>1. Introduzione / Introduction</h2>
          <p>
            <strong>IT:</strong> Gestionale Appuntamenti ("noi", "nostro/a" o "nostri") gestisce l'applicazione web Gestionale Appuntamenti ("Servizio").
            Questa pagina ti informa delle nostre politiche riguardanti la raccolta, l'uso e la divulgazione dei dati personali 
            quando usi il nostro Servizio e delle scelte che hai riguardo a tali dati.
          </p>
          <p>
            <strong>EN:</strong> Gestionale Appuntamenti ("we", "our" or "us") operates the Gestionale Appuntamenti web application ("Service").
            This page informs you of our policies regarding the collection, use, and disclosure of personal data 
            when you use our Service and the choices you have regarding such data.
          </p>

          <h2>2. Raccolta e Utilizzo dei Dati / Data Collection and Use</h2>

          <h3>2.1 Tipi di Dati Raccolti / Types of Data Collected</h3>
          <p><strong>IT:</strong> Raccogliamo diversi tipi di informazioni per vari scopi al fine di fornirti un migliore servizio:</p>
          <p><strong>EN:</strong> We collect different types of information for various purposes to provide you with a better service:</p>
          <ul>
            <li><strong>Dati Personali / Personal Data:</strong> Nome, indirizzo email, numero di telefono, indirizzo / Name, email address, phone number, address</li>
            <li><strong>Dati di Utilizzo / Usage Data:</strong> Informazioni sul browser, indirizzi IP, pagine visitate / Browser information, IP addresses, pages visited</li>
            <li><strong>Dati di Calendario / Calendar Data:</strong> Appuntamenti, disponibilità, preferenze professionali / Appointments, availability, professional preferences</li>
            <li><strong>Dati di Pagamento / Payment Data:</strong> Informazioni di fatturazione elaborate in modo sicuro / Billing information processed securely</li>
            <li><strong>Dati di Google Calendar / Google Calendar Data:</strong> Token di autenticazione OAuth per sincronizzazione / OAuth authentication tokens for synchronization</li>
          </ul>

          <h3>2.2 Utilizzo dei Dati / Use of Data</h3>
          <p><strong>IT:</strong> Utilizziamo i dati raccolti per:</p>
          <p><strong>EN:</strong> We use the collected data to:</p>
          <ul>
            <li>Fornire e mantenere il Servizio / Provide and maintain the Service</li>
            <li>Notificare i cambiamenti al nostro Servizio / Notify you about changes to our Service</li>
            <li>Consentire la partecipazione alle funzioni interattive / Allow participation in interactive features</li>
            <li>Fornire assistenza clienti / Provide customer support</li>
            <li>Raccogliere analitiche per migliorare il Servizio / Gather analytics to improve the Service</li>
            <li>Monitorare l'utilizzo del Servizio / Monitor the usage of the Service</li>
            <li>Rilevare, prevenire e affrontare frodi e problemi di sicurezza / Detect, prevent and address fraud and security issues</li>
          </ul>

          <h2>3. Sicurezza dei Dati / Data Security</h2>
          <p>
            <strong>IT:</strong> La sicurezza dei tuoi dati è importante per noi, ma nessun metodo di trasmissione su Internet 
            o metodo di archiviazione elettronica è sicuro al 100%. 
            Anche se ci sforziamo di proteggere i tuoi dati personali con mezzi ragionevoli, 
            non possiamo garantire una sicurezza assoluta.
          </p>
          <p>
            <strong>EN:</strong> The security of your data is important to us, but no method of transmission over the Internet 
            or method of electronic storage is 100% secure. 
            While we strive to protect your personal data using reasonable means, 
            we cannot guarantee absolute security.
          </p>

          <h2>4. Dati di Google Calendar / Google Calendar Data</h2>
          <p>
            <strong>IT:</strong> Quando autorizzi la sincronizzazione con Google Calendar, raccogliamo e immagazziniamo:
          </p>
          <p>
            <strong>EN:</strong> When you authorize synchronization with Google Calendar, we collect and store:
          </p>
          <ul>
            <li>Token di accesso OAuth per accedere al tuo calendario / OAuth access tokens to access your calendar</li>
            <li>Gli appuntamenti che scegli di sincronizzare / The appointments you choose to synchronize</li>
            <li>Le informazioni sugli eventi del calendario (titolo, orario, partecipanti) / Calendar event information (title, time, participants)</li>
          </ul>
          <p>
            <strong>IT:</strong> Questi dati vengono utilizzati esclusivamente per sincronizzare gli appuntamenti con il tuo Google Calendar. 
            Puoi revocare l'accesso in qualsiasi momento dalle impostazioni del tuo account Google.
          </p>
          <p>
            <strong>EN:</strong> This data is used exclusively to synchronize appointments with your Google Calendar. 
            You can revoke access at any time from your Google account settings.
          </p>

          <h2>5. Cookie</h2>
          <p>
            <strong>IT:</strong> Utilizziamo i cookie per identificarti e ricordare le tue preferenze. 
            Puoi disabilitare i cookie tramite le impostazioni del tuo browser.
          </p>
          <p>
            <strong>EN:</strong> We use cookies to identify you and remember your preferences. 
            You can disable cookies through your browser settings.
          </p>

          <h2>6. Link a Siti di Terze Parti / Third-Party Links</h2>
          <p>
            <strong>IT:</strong> Il nostro Servizio può contenere link a siti web di terze parti. 
            Non siamo responsabili per le pratiche sulla privacy di tali siti.
          </p>
          <p>
            <strong>EN:</strong> Our Service may contain links to third-party websites. 
            We are not responsible for the privacy practices of such sites.
          </p>

          <h2>7. Diritti dell'Utente / User Rights</h2>
          <p><strong>IT:</strong> In conformità con il GDPR, hai il diritto di:</p>
          <p><strong>EN:</strong> In accordance with the GDPR, you have the right to:</p>
          <ul>
            <li>Accedere ai tuoi dati personali / Access your personal data</li>
            <li>Correggere dati imprecisi / Correct inaccurate data</li>
            <li>Richiedere l'eliminazione dei tuoi dati / Request the deletion of your data</li>
            <li>Opporsi al trattamento dei tuoi dati / Object to the processing of your data</li>
            <li>Limitare il trattamento / Restrict processing</li>
            <li>Richiedere la portabilità dei dati / Request data portability</li>
          </ul>

          <h2>8. Contatti / Contact</h2>
          <p>
            <strong>IT:</strong> Se hai domande su questa Informativa sulla Privacy, 
            puoi contattarci all'indirizzo email di supporto nel tuo account.
          </p>
          <p>
            <strong>EN:</strong> If you have questions about this Privacy Policy, 
            you can contact us at the support email address in your account.
          </p>

          <h2>9. Modifiche / Changes</h2>
          <p>
            <strong>IT:</strong> Potremmo aggiornare la nostra Informativa sulla Privacy di tanto in tanto. 
            Ti notificheremo di eventuali modifiche pubblicando la nuova Informativa sulla Privacy in questa pagina.
          </p>
          <p>
            <strong>EN:</strong> We may update our Privacy Policy from time to time. 
            We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </article>
      </div>
    </div>
  );
}
