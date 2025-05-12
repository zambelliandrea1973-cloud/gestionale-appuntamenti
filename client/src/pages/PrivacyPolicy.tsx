import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <Separator className="mb-6" />
        
        <div className="prose prose-blue max-w-none">
          <p className="text-lg mb-4">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Introduzione</h2>
            <p>
              La presente Privacy Policy descrive le modalità di raccolta, utilizzo e condivisione dei dati personali 
              nell'utilizzo dell'applicazione Gestione Appuntamenti. La privacy dei nostri utenti è una priorità 
              assoluta e ci impegniamo a proteggerla rispettando rigorosamente il Regolamento Generale sulla Protezione 
              dei Dati (GDPR) e le altre normative applicabili sulla protezione dei dati.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Titolare del Trattamento</h2>
            <p>
              Il titolare del trattamento dei dati è Zambelli Andrea, che può essere contattato all'indirizzo email: 
              zambelli.andrea.1973@gmail.com.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Tipi di Utenti e Dati Raccolti</h2>
            <p>
              L'applicazione prevede le seguenti categorie di utenti, ciascuna con differenti livelli di accesso e trattamento dati:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Amministratore:</strong> Accesso completo a tutte le funzionalità, inclusa la gestione dello staff.
              </li>
              <li>
                <strong>Staff:</strong> Accesso completo al programma con licenza gratuita, esclusa la gestione dello staff.
              </li>
              <li>
                <strong>Customer (acquirenti):</strong> Utenti che hanno acquistato licenze, con accesso esclusivo alla dashboard amministrativa.
              </li>
              <li>
                <strong>Client:</strong> Clienti finali che prenotano appuntamenti, con accesso esclusivo all'area clienti tramite app o browser.
              </li>
            </ul>
            <p className="mt-4">
              Durante l'utilizzo dell'applicazione, raccogliamo le seguenti categorie di dati personali:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Dati di identificazione (nome, cognome, email)</li>
              <li>Dati di contatto (numero di telefono, indirizzo)</li>
              <li>Dati relativi agli appuntamenti (data, ora, servizio)</li>
              <li>In alcuni casi, dati sanitari basilari (allergie, note mediche) solo previo consenso esplicito</li>
              <li>Dati relativi ai pagamenti e alle licenze acquistate</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Finalità del Trattamento</h2>
            <p>
              I dati personali vengono raccolti e trattati per le seguenti finalità:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Gestione degli appuntamenti e dei servizi richiesti</li>
              <li>Invio di promemoria e notifiche relative agli appuntamenti</li>
              <li>Gestione delle licenze e dei pagamenti</li>
              <li>Miglioramento dell'applicazione attraverso il feedback degli utenti</li>
              <li>Adempimento di obblighi legali e normativi</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Base Giuridica del Trattamento</h2>
            <p>
              Il trattamento dei dati personali si basa sulle seguenti condizioni di liceità:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Esecuzione di un contratto (per la fornitura del servizio di gestione appuntamenti)</li>
              <li>Consenso esplicito (per il trattamento di dati sanitari o l'invio di comunicazioni promozionali)</li>
              <li>Legittimo interesse (per il miglioramento del servizio e la sicurezza dell'applicazione)</li>
              <li>Adempimento di obblighi legali</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Conservazione dei Dati</h2>
            <p>
              I dati personali vengono conservati per il tempo necessario al raggiungimento delle finalità per cui sono stati raccolti, 
              o per il periodo richiesto dalla legge. In particolare:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>I dati relativi agli appuntamenti vengono conservati per 2 anni dalla data dell'appuntamento</li>
              <li>I dati relativi ai pagamenti vengono conservati per 10 anni come richiesto dalla normativa fiscale</li>
              <li>I dati degli utenti vengono conservati fino alla cancellazione dell'account</li>
            </ul>
            <p className="mt-4">
              Alla scadenza del periodo di conservazione, i dati vengono cancellati o anonimizzati.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Destinatari dei Dati</h2>
            <p>
              I dati personali possono essere condivisi con le seguenti categorie di destinatari:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Il personale autorizzato che necessita di accedere ai dati per fornire il servizio</li>
              <li>Fornitori di servizi che agiscono come responsabili del trattamento (provider di hosting, servizi di pagamento)</li>
              <li>Autorità pubbliche, quando richiesto dalla legge</li>
            </ul>
            <p className="mt-4">
              I dati vengono trattati all'interno dell'Unione Europea e non sono oggetto di trasferimento verso paesi terzi, 
              salvo quando necessario per l'utilizzo di servizi specifici e con adeguate garanzie.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Diritti degli Interessati</h2>
            <p>
              Gli utenti hanno diritto di:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Accedere ai propri dati personali</li>
              <li>Rettificare dati inaccurati o incompleti</li>
              <li>Cancellare i propri dati (diritto all'oblio)</li>
              <li>Limitare il trattamento dei propri dati</li>
              <li>Ricevere i propri dati in formato strutturato (portabilità)</li>
              <li>Opporsi al trattamento basato su legittimo interesse</li>
              <li>Revocare il consenso in qualsiasi momento</li>
              <li>Presentare un reclamo all'autorità di controllo competente</li>
            </ul>
            <p className="mt-4">
              Per esercitare questi diritti, è possibile contattare il titolare del trattamento all'indirizzo email 
              zambelli.andrea.1973@gmail.com.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Sicurezza dei Dati</h2>
            <p>
              Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da perdita, 
              uso improprio, accesso non autorizzato, divulgazione, alterazione o distruzione. Queste misure includono:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Crittografia dei dati sensibili</li>
              <li>Autenticazione degli utenti</li>
              <li>Backup regolari</li>
              <li>Controllo degli accessi</li>
              <li>Formazione del personale sulle pratiche di sicurezza dei dati</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Modifiche alla Privacy Policy</h2>
            <p>
              Ci riserviamo il diritto di modificare questa Privacy Policy in qualsiasi momento. 
              Le modifiche saranno pubblicate su questa pagina con l'indicazione della data di aggiornamento. 
              In caso di modifiche significative, informeremo gli utenti tramite email o notifica nell'applicazione.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contatti</h2>
            <p>
              Per qualsiasi domanda relativa alla presente Privacy Policy o al trattamento dei dati personali, 
              è possibile contattare il titolare del trattamento all'indirizzo email zambelli.andrea.1973@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}