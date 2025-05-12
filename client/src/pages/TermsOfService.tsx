import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import { Separator } from '@/components/ui/separator';

export default function TermsOfService() {
  const { t } = useTranslation();
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Termini di Servizio</h1>
        <Separator className="mb-6" />
        
        <div className="prose prose-blue max-w-none">
          <p className="text-lg mb-4">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Introduzione</h2>
            <p>
              Benvenuto nell'applicazione "Gestione Appuntamenti". Questi Termini di Servizio ("Termini") 
              regolano l'utilizzo dell'applicazione e costituiscono un accordo legalmente vincolante 
              tra l'utente e Zambelli Andrea (di seguito "noi", "nostro" o "Fornitore del Servizio").
            </p>
            <p className="mt-2">
              Utilizzando l'applicazione, l'utente accetta di essere vincolato da questi Termini. 
              Se non si accettano i Termini, non è possibile utilizzare l'applicazione.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Descrizione del Servizio</h2>
            <p>
              "Gestione Appuntamenti" è un'applicazione professionale per la gestione di appuntamenti di lavoro, 
              con funzionalità specifiche per professionisti del settore e i loro clienti. L'applicazione 
              consente di gestire appuntamenti, clienti, fatturazione e comunicazioni.
            </p>
            <p className="mt-2">
              L'applicazione prevede diverse tipologie di utenti:
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
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Registrazione e Account</h2>
            <p>
              Per utilizzare l'applicazione, è necessario registrarsi e creare un account. L'utente deve fornire 
              informazioni accurate, complete e aggiornate. L'utente è responsabile della sicurezza delle proprie 
              credenziali di accesso e di tutte le attività che si verificano sotto il proprio account.
            </p>
            <p className="mt-2">
              Ci riserviamo il diritto di sospendere o terminare l'account in caso di violazione dei presenti Termini 
              o in caso di sospetto di attività fraudolenta o illegale.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Licenze e Abbonamenti</h2>
            <p>
              L'applicazione offre diverse tipologie di licenze:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Trial:</strong> Periodo di prova gratuito di 40 giorni con accesso a funzionalità limitate.</li>
              <li><strong>Base:</strong> Licenza a pagamento per 1 anno con funzionalità essenziali.</li>
              <li><strong>Pro:</strong> Licenza a pagamento per 1 anno con funzionalità avanzate.</li>
              <li><strong>Business:</strong> Licenza a pagamento per 1 anno con tutte le funzionalità disponibili.</li>
              <li><strong>Staff:</strong> Licenza gratuita di 10 anni per i membri dello staff.</li>
              <li><strong>Admin:</strong> Licenza senza scadenza per amministratori.</li>
            </ul>
            <p className="mt-4">
              Il pagamento per le licenze a pagamento deve essere effettuato in anticipo. I rinnovi avvengono 
              automaticamente alla scadenza, a meno che l'utente non disattivi il rinnovo automatico.
            </p>
            <p className="mt-2">
              Ci riserviamo il diritto di modificare i prezzi delle licenze. Eventuali modifiche verranno comunicate 
              con un preavviso di almeno 30 giorni.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Proprietà Intellettuale</h2>
            <p>
              L'applicazione "Gestione Appuntamenti" e tutti i suoi contenuti, caratteristiche e funzionalità 
              (compresi ma non limitati a testi, grafici, logo, icone, immagini, clip audio, video, software) 
              sono di proprietà del Fornitore del Servizio o dei suoi licenzianti e sono protetti dalle leggi 
              italiane, europee e internazionali su copyright, marchi, brevetti e altre proprietà intellettuali.
            </p>
            <p className="mt-2">
              L'utilizzo dell'applicazione non concede all'utente alcun diritto di proprietà intellettuale 
              sull'applicazione o sui suoi contenuti.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Utilizzo Consentito</h2>
            <p>
              L'utente si impegna a utilizzare l'applicazione esclusivamente per scopi legittimi e in conformità 
              con tutte le leggi e i regolamenti applicabili. In particolare, l'utente non deve:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Utilizzare l'applicazione per attività illegali o fraudolente;</li>
              <li>Tentare di accedere a aree riservate dell'applicazione o dei sistemi;</li>
              <li>Caricare o trasmettere malware o altri codici dannosi;</li>
              <li>Interferire con il funzionamento dell'applicazione o dei server;</li>
              <li>Raccogliere informazioni personali di altri utenti senza autorizzazione;</li>
              <li>Utilizzare l'applicazione in modo da violare i diritti di terzi.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Protezione dei Dati</h2>
            <p>
              Il trattamento dei dati personali è regolato dalla nostra Privacy Policy, che costituisce 
              parte integrante dei presenti Termini. L'utente comprende che l'utilizzo dell'applicazione 
              comporta la raccolta e il trattamento di dati personali come descritto nella Privacy Policy.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitazione di Responsabilità</h2>
            <p>
              L'applicazione viene fornita "così com'è" e "come disponibile". Il Fornitore del Servizio non 
              garantisce che l'applicazione sarà sempre sicura, priva di errori o funzionerà senza interruzioni.
            </p>
            <p className="mt-2">
              Nei limiti consentiti dalla legge, il Fornitore del Servizio declina ogni responsabilità per 
              danni diretti, indiretti, incidentali, consequenziali, speciali o punitivi derivanti dall'utilizzo 
              o dall'impossibilità di utilizzare l'applicazione.
            </p>
            <p className="mt-2">
              L'utente è responsabile del backup dei propri dati e delle informazioni inserite nell'applicazione.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Indennizzo</h2>
            <p>
              L'utente accetta di indennizzare, difendere e tenere indenne il Fornitore del Servizio da 
              qualsiasi reclamo, danno, responsabilità, costo o spesa (comprese ragionevoli spese legali) 
              derivanti dalla violazione dei presenti Termini o dall'utilizzo improprio dell'applicazione.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Modifiche ai Termini</h2>
            <p>
              Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche 
              saranno effettive dopo la pubblicazione dei Termini aggiornati sull'applicazione. L'uso continuato 
              dell'applicazione dopo tali modifiche costituisce accettazione dei nuovi Termini.
            </p>
            <p className="mt-2">
              Per modifiche sostanziali, forniremo una notifica attraverso l'applicazione o via email.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Legge Applicabile e Foro Competente</h2>
            <p>
              I presenti Termini sono regolati e interpretati in conformità con le leggi italiane. 
              Qualsiasi controversia derivante o relativa ai presenti Termini sarà soggetta alla giurisdizione 
              esclusiva del Tribunale di Milano, Italia.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Disposizioni Generali</h2>
            <p>
              Se una qualsiasi disposizione dei presenti Termini è ritenuta non valida o inapplicabile, 
              tale disposizione sarà limitata o eliminata nella misura minima necessaria affinché i restanti 
              Termini rimangano in pieno vigore ed effetto.
            </p>
            <p className="mt-2">
              Il mancato esercizio o applicazione di qualsiasi diritto o disposizione dei presenti Termini 
              non costituisce una rinuncia a tale diritto o disposizione.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contatti</h2>
            <p>
              Per domande relative ai presenti Termini di Servizio, contattare zambelli.andrea.1973@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}