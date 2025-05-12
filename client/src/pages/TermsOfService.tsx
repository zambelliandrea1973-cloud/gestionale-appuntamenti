import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import FooterOnly from '@/components/FooterOnly';
import { Toaster } from '@/components/ui/toaster';

// Versione ottimizzata che non utilizza il Layout completo per migliorare le performance
export default function TermsOfService() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header semplificato */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <a href="/" className="text-white hover:text-gray-200">
              <h1 className="text-xl font-semibold">Gestione Appuntamenti</h1>
            </a>
            <a href="/dashboard" className="text-white hover:text-gray-200 text-sm">
              Torna alla Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Contenuto */}
      <main className="flex-grow container mx-auto py-8 px-4">
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
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">7. Limitazione di Responsabilità</h3>
              <p className="mb-3">
                L'Applicazione è fornita "così com'è" e "come disponibile", senza garanzie di alcun tipo, esplicite o implicite. 
                Il Fornitore non garantisce che l'Applicazione sarà ininterrotta, tempestiva, sicura o priva di errori.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">8. Indennità</h3>
              <p className="mb-3">
                L'utente accetta di indennizzare e tenere indenne il Fornitore da qualsiasi reclamo derivante dall'utilizzo 
                dell'Applicazione o dalla violazione dei presenti Termini.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">9. Modifiche ai Termini</h3>
              <p className="mb-3">
                Il Fornitore si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno 
                efficaci dopo la pubblicazione dei Termini aggiornati nell'Applicazione.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">10. Legge Applicabile</h3>
              <p className="mb-3">
                I presenti Termini sono regolati dalle leggi italiane, con giurisdizione esclusiva dei tribunali di Milano, Italia.
              </p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">11. Contatti</h3>
              <p>
                Per domande relative ai presenti Termini, contattare: zambelli.andrea.1973@gmail.com
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      {/* Footer semplificato */}
      <footer className="bg-gray-100 border-t border-gray-300 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} Zambelli Andrea - G.A.
            </div>
            <div className="flex space-x-4">
              <a href="/privacy-policy" className="text-primary hover:text-primary-dark text-sm">Privacy Policy</a>
              <a href="/terms-of-service" className="text-primary hover:text-primary-dark text-sm">Termini di Servizio</a>
            </div>
          </div>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
}