import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/Layout';

export default function TermsOfService() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Termini di Servizio</h1>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Ultimo aggiornamento: 12/05/2025</h2>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">1. Introduzione</h3>
              <p className="mb-3">
                I presenti Termini di Servizio ("Termini") regolano l'utilizzo dell'applicazione Gestione Appuntamenti ("Applicazione"), 
                fornita da Zambelli Andrea ("Fornitore"). Utilizzando l'Applicazione, l'utente accetta di essere vincolato dai presenti Termini. 
                Se non si accettano i Termini, si prega di non utilizzare l'Applicazione.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">2. Descrizione del Servizio</h3>
              <p className="mb-3">
                L'Applicazione è una piattaforma per la gestione di appuntamenti, clienti, pagamenti e comunicazioni professionali. 
                Include funzionalità come calendario, notifiche, fatturazione e gestione delle relazioni con i clienti. 
                Il servizio è disponibile in diversi piani di abbonamento con funzionalità differenziate.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">3. Registrazione e Account</h3>
              <p className="mb-3">
                Per utilizzare l'Applicazione, è necessario creare un account. L'utente è responsabile della sicurezza delle proprie credenziali 
                e di tutte le attività che si verificano tramite il proprio account. L'utente si impegna a fornire informazioni accurate, 
                complete e aggiornate durante la registrazione e a mantenerle tali.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">4. Piani di Abbonamento e Pagamenti</h3>
              <p className="mb-3">
                L'Applicazione offre diversi piani di abbonamento: Trial (gratuito per 40 giorni), Base, Professionale e Business, 
                ciascuno con funzionalità e limitazioni specifiche. I dettagli dei piani sono disponibili nell'Applicazione. 
                I pagamenti sono gestiti tramite i fornitori di servizi di pagamento integrati nell'Applicazione.
              </p>
              <p className="mb-3">
                Gli abbonamenti si rinnovano automaticamente alla fine del periodo, salvo disdetta. La disdetta deve essere effettuata 
                almeno 7 giorni prima della data di rinnovo per evitare l'addebito del periodo successivo.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">5. Diritti e Responsabilità dell'Utente</h3>
              <p className="mb-3">L'utente si impegna a:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Utilizzare l'Applicazione in conformità con tutte le leggi applicabili</li>
                <li>Non utilizzare l'Applicazione per attività illegali o fraudolente</li>
                <li>Non compromettere la sicurezza o l'integrità dell'Applicazione</li>
                <li>Non interferire con l'accesso di altri utenti all'Applicazione</li>
                <li>Ottenere il consenso appropriato dai clienti per il trattamento dei loro dati</li>
                <li>Mantenere riservati i dati dei clienti e utilizzarli solo per le finalità dichiarate</li>
              </ul>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">6. Proprietà Intellettuale</h3>
              <p className="mb-3">
                Tutti i diritti di proprietà intellettuale relativi all'Applicazione, inclusi ma non limitati a software, design, logo, 
                testi e contenuti, sono di proprietà esclusiva del Fornitore o dei suoi licenzianti. Nessuna disposizione dei presenti 
                Termini trasferisce alcun diritto di proprietà intellettuale all'utente.
              </p>
              <p className="mb-3">
                L'utente riceve una licenza limitata, non esclusiva, non trasferibile e revocabile per utilizzare l'Applicazione 
                in conformità con i presenti Termini e con il piano di abbonamento sottoscritto.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">7. Limitazione di Responsabilità</h3>
              <p className="mb-3">
                L'Applicazione è fornita "così com'è" e "come disponibile", senza garanzie di alcun tipo, esplicite o implicite. 
                Il Fornitore non garantisce che l'Applicazione sarà ininterrotta, tempestiva, sicura o priva di errori.
              </p>
              <p className="mb-3">
                Nei limiti consentiti dalla legge, il Fornitore non sarà responsabile per danni diretti, indiretti, incidentali, 
                speciali, consequenziali o punitivi, inclusi ma non limitati a perdita di profitti, dati, uso o altre perdite 
                intangibili derivanti dall'utilizzo o dall'impossibilità di utilizzare l'Applicazione.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">8. Indennità</h3>
              <p className="mb-3">
                L'utente accetta di indennizzare, difendere e tenere indenne il Fornitore e i suoi affiliati, direttori, 
                funzionari, dipendenti e agenti da qualsiasi reclamo, responsabilità, danno, perdita e spesa, incluse le 
                spese legali ragionevoli, derivanti da o in qualsiasi modo collegati all'utilizzo dell'Applicazione da parte 
                dell'utente o alla violazione dei presenti Termini.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">9. Modifiche ai Termini</h3>
              <p className="mb-3">
                Il Fornitore si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno 
                efficaci dopo la pubblicazione dei Termini aggiornati nell'Applicazione. L'uso continuato dell'Applicazione 
                dopo tali modifiche costituisce accettazione dei nuovi Termini.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">10. Risoluzione</h3>
              <p className="mb-3">
                Il Fornitore può, a sua esclusiva discrezione, sospendere o terminare l'accesso dell'utente all'Applicazione 
                per violazione dei presenti Termini o per qualsiasi altra ragione. L'utente può interrompere l'utilizzo 
                dell'Applicazione in qualsiasi momento.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">11. Legge Applicabile</h3>
              <p className="mb-3">
                I presenti Termini sono regolati e interpretati in conformità con le leggi italiane, senza riguardo ai 
                principi di conflitto di leggi. Qualsiasi controversia relativa ai presenti Termini sarà soggetta alla 
                giurisdizione esclusiva dei tribunali di Milano, Italia.
              </p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">12. Contatti</h3>
              <p>
                Per domande o chiarimenti relativi ai presenti Termini, contattare il Fornitore all'indirizzo email: 
                zambelli.andrea.1973@gmail.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}