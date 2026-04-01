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
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento / Last updated: 1 Aprile 2026</p>

          <hr />

          <h2>1. Introduzione / Introduction</h2>
          <p>
            <strong>IT:</strong> Gestionale Appuntamenti ("noi", "nostro/a" o "nostri") gestisce l'applicazione web e mobile Gestionale Appuntamenti ("Servizio"),
            disponibile come Progressive Web App (PWA) e tramite Google Play Store e Samsung Galaxy Store.
            Questa pagina ti informa delle nostre politiche riguardanti la raccolta, l'uso e la divulgazione dei dati personali 
            quando usi il nostro Servizio e delle scelte che hai riguardo a tali dati.
          </p>
          <p>
            <strong>EN:</strong> Gestionale Appuntamenti ("we", "our" or "us") operates the Gestionale Appuntamenti web and mobile application ("Service"),
            available as a Progressive Web App (PWA) and through Google Play Store and Samsung Galaxy Store.
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
            <li><strong>Dati di Pagamento / Payment Data:</strong> Informazioni di fatturazione elaborate in modo sicuro tramite Stripe e PayPal / Billing information processed securely through Stripe and PayPal</li>
            <li><strong>Dati di Google Calendar / Google Calendar Data:</strong> Token di autenticazione OAuth per sincronizzazione / OAuth authentication tokens for synchronization</li>
            <li><strong>Dati dei Contatti / Contact Data:</strong> Contatti importati da Google Contacts o file CSV, previo consenso esplicito dell'utente / Contacts imported from Google Contacts or CSV files, with explicit user consent</li>
            <li><strong>Dati di Notifica Push / Push Notification Data:</strong> Token di sottoscrizione push per l'invio di promemoria appuntamenti / Push subscription tokens for sending appointment reminders</li>
          </ul>

          <h3>2.2 Utilizzo dei Dati / Use of Data</h3>
          <p><strong>IT:</strong> Utilizziamo i dati raccolti per:</p>
          <p><strong>EN:</strong> We use the collected data to:</p>
          <ul>
            <li>Fornire e mantenere il Servizio / Provide and maintain the Service</li>
            <li>Notificare i cambiamenti al nostro Servizio / Notify you about changes to our Service</li>
            <li>Inviare promemoria appuntamenti tramite notifiche push, email e WhatsApp / Send appointment reminders via push notifications, email, and WhatsApp</li>
            <li>Consentire la partecipazione alle funzioni interattive / Allow participation in interactive features</li>
            <li>Fornire assistenza clienti / Provide customer support</li>
            <li>Raccogliere analitiche per migliorare il Servizio / Gather analytics to improve the Service</li>
            <li>Monitorare l'utilizzo del Servizio / Monitor the usage of the Service</li>
            <li>Generare fatture e gestire pagamenti / Generate invoices and manage payments</li>
            <li>Generare QR Code personalizzati per l'accesso rapido dei clienti / Generate personalized QR Codes for quick client access</li>
            <li>Rilevare, prevenire e affrontare frodi e problemi di sicurezza / Detect, prevent and address fraud and security issues</li>
          </ul>

          <h2>3. Notifiche Push / Push Notifications</h2>
          <p>
            <strong>IT:</strong> Il Servizio utilizza le notifiche push per inviare promemoria sugli appuntamenti.
            Per attivare questa funzionalità, il tuo browser o dispositivo richiederà il tuo consenso esplicito.
            Raccogliamo un token di sottoscrizione push che viene utilizzato esclusivamente per l'invio delle notifiche.
            Puoi disattivare le notifiche push in qualsiasi momento dalle impostazioni del tuo browser o dispositivo.
          </p>
          <p>
            <strong>EN:</strong> The Service uses push notifications to send appointment reminders.
            To activate this feature, your browser or device will request your explicit consent.
            We collect a push subscription token that is used exclusively for sending notifications.
            You can disable push notifications at any time from your browser or device settings.
          </p>

          <h2>4. Comunicazioni WhatsApp / WhatsApp Communications</h2>
          <p>
            <strong>IT:</strong> Il Servizio consente ai professionisti di inviare promemoria e comunicazioni ai clienti tramite WhatsApp.
            I messaggi vengono inviati utilizzando il numero di telefono fornito dal cliente. 
            Non condividiamo i numeri di telefono con terze parti. L'invio dei messaggi avviene tramite 
            link diretti a WhatsApp e non attraverso API di terze parti.
          </p>
          <p>
            <strong>EN:</strong> The Service allows professionals to send reminders and communications to clients via WhatsApp.
            Messages are sent using the phone number provided by the client.
            We do not share phone numbers with third parties. Messages are sent through 
            direct WhatsApp links and not through third-party APIs.
          </p>

          <h2>5. Dati di Google Calendar / Google Calendar Data</h2>
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

          <h2>6. Importazione Contatti / Contact Import</h2>
          <p>
            <strong>IT:</strong> Il Servizio consente di importare contatti da Google Contacts (tramite autorizzazione OAuth) 
            o da file CSV. L'importazione avviene solo su richiesta esplicita dell'utente. 
            I contatti importati vengono salvati nel database del Servizio e sono visibili solo al professionista che li ha importati.
            Non condividiamo i dati dei contatti importati con terze parti.
          </p>
          <p>
            <strong>EN:</strong> The Service allows importing contacts from Google Contacts (via OAuth authorization) 
            or from CSV files. Import only occurs upon explicit user request.
            Imported contacts are stored in the Service database and are visible only to the professional who imported them.
            We do not share imported contact data with third parties.
          </p>

          <h2>7. QR Code / QR Code</h2>
          <p>
            <strong>IT:</strong> Il Servizio genera QR Code personalizzati per consentire ai clienti un accesso rapido alla propria area personale.
            I QR Code contengono un identificativo univoco del cliente e non includono dati personali sensibili.
          </p>
          <p>
            <strong>EN:</strong> The Service generates personalized QR Codes to allow clients quick access to their personal area.
            QR Codes contain a unique client identifier and do not include sensitive personal data.
          </p>

          <h2>8. Sicurezza dei Dati / Data Security</h2>
          <p>
            <strong>IT:</strong> La sicurezza dei tuoi dati è importante per noi. Adottiamo le seguenti misure di protezione:
          </p>
          <p>
            <strong>EN:</strong> The security of your data is important to us. We adopt the following protection measures:
          </p>
          <ul>
            <li>Crittografia dei dati sensibili (password, token) / Encryption of sensitive data (passwords, tokens)</li>
            <li>Isolamento multi-tenant: i dati di ogni professionista sono separati e inaccessibili ad altri utenti / Multi-tenant isolation: each professional's data is separate and inaccessible to other users</li>
            <li>Connessioni HTTPS per tutte le comunicazioni / HTTPS connections for all communications</li>
            <li>Pagamenti elaborati in modo sicuro tramite Stripe e PayPal (non memorizziamo dati di carte di credito) / Payments processed securely through Stripe and PayPal (we do not store credit card data)</li>
          </ul>
          <p>
            <strong>IT:</strong> Nessun metodo di trasmissione su Internet o metodo di archiviazione elettronica è sicuro al 100%. 
            Non possiamo garantire una sicurezza assoluta.
          </p>
          <p>
            <strong>EN:</strong> No method of transmission over the Internet or method of electronic storage is 100% secure. 
            We cannot guarantee absolute security.
          </p>

          <h2>9. Cookie</h2>
          <p>
            <strong>IT:</strong> Utilizziamo i cookie di sessione per identificarti e ricordare le tue preferenze. 
            Non utilizziamo cookie di tracciamento pubblicitario. Il Servizio è completamente privo di pubblicità.
            Puoi disabilitare i cookie tramite le impostazioni del tuo browser.
          </p>
          <p>
            <strong>EN:</strong> We use session cookies to identify you and remember your preferences. 
            We do not use advertising tracking cookies. The Service is completely ad-free.
            You can disable cookies through your browser settings.
          </p>

          <h2>10. Servizi di Terze Parti / Third-Party Services</h2>
          <p><strong>IT:</strong> Il Servizio utilizza i seguenti servizi di terze parti:</p>
          <p><strong>EN:</strong> The Service uses the following third-party services:</p>
          <ul>
            <li><strong>Google OAuth 2.0:</strong> Per l'autenticazione e la sincronizzazione con Google Calendar e Contatti / For authentication and synchronization with Google Calendar and Contacts</li>
            <li><strong>Stripe:</strong> Per l'elaborazione dei pagamenti con carta / For credit card payment processing</li>
            <li><strong>PayPal:</strong> Per l'elaborazione dei pagamenti alternativi / For alternative payment processing</li>
            <li><strong>SMTP/Gmail/SendGrid:</strong> Per l'invio di email di notifica e conferma / For sending notification and confirmation emails</li>
          </ul>
          <p>
            <strong>IT:</strong> Ogni servizio di terze parti ha la propria informativa sulla privacy. Ti invitiamo a consultare le rispettive policy.
          </p>
          <p>
            <strong>EN:</strong> Each third-party service has its own privacy policy. We encourage you to review their respective policies.
          </p>

          <h2>11. Diritti dell'Utente / User Rights</h2>
          <p><strong>IT:</strong> In conformità con il GDPR, hai il diritto di:</p>
          <p><strong>EN:</strong> In accordance with the GDPR, you have the right to:</p>
          <ul>
            <li>Accedere ai tuoi dati personali / Access your personal data</li>
            <li>Correggere dati imprecisi / Correct inaccurate data</li>
            <li>Richiedere l'eliminazione dei tuoi dati / Request the deletion of your data</li>
            <li>Opporsi al trattamento dei tuoi dati / Object to the processing of your data</li>
            <li>Limitare il trattamento / Restrict processing</li>
            <li>Richiedere la portabilità dei dati / Request data portability</li>
            <li>Revocare il consenso in qualsiasi momento / Withdraw consent at any time</li>
          </ul>

          <h2>12. Conservazione dei Dati / Data Retention</h2>
          <p>
            <strong>IT:</strong> Conserviamo i tuoi dati personali per il tempo necessario a fornirti il Servizio.
            Quando elimini il tuo account, i tuoi dati vengono rimossi in modo permanente dal nostro sistema.
            Il professionista può eliminare i dati dei propri clienti in qualsiasi momento dall'area di gestione.
          </p>
          <p>
            <strong>EN:</strong> We retain your personal data for as long as necessary to provide you with the Service.
            When you delete your account, your data is permanently removed from our system.
            The professional can delete their clients' data at any time from the management area.
          </p>

          <h2>13. Contatti / Contact</h2>
          <p>
            <strong>IT:</strong> Se hai domande su questa Informativa sulla Privacy, 
            puoi contattarci all'indirizzo email di supporto nel tuo account.
          </p>
          <p>
            <strong>EN:</strong> If you have questions about this Privacy Policy, 
            you can contact us at the support email address in your account.
          </p>

          <h2>14. Modifiche / Changes</h2>
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
