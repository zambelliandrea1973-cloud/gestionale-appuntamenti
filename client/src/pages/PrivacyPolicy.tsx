import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Ultimo aggiornamento: 12/05/2025</h2>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Introduzione</h3>
              <p className="mb-3">
                La presente Privacy Policy descrive le modalità di raccolta, utilizzo e condivisione dei dati personali nell'utilizzo dell'applicazione Gestione Appuntamenti. 
                La privacy dei nostri utenti è una priorità assoluta e ci impegniamo a proteggerla rispettando rigorosamente il Regolamento 
                Generale sulla Protezione dei Dati (GDPR) e le altre normative applicabili sulla protezione dei dati.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Titolare del Trattamento</h3>
              <p className="mb-3">
                Il titolare del trattamento dei dati è Zambelli Andrea, che può essere contattato all'indirizzo email: zambelli.andrea.1973@gmail.com.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Tipi di Utenti e Dati Raccolti</h3>
              <p className="mb-3">L'applicazione gestisce le seguenti categorie di utenti e dati:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Staff e Amministratori:</strong> dati personali come nome, email, credenziali di accesso.</li>
                <li><strong>Clienti:</strong> dati personali e di contatto, informazioni sugli appuntamenti, dati sanitari (quando necessari per il servizio).</li>
                <li><strong>Utenti con licenza:</strong> informazioni sulla licenza, dati di fatturazione, storico pagamenti.</li>
                <li><strong>Dati operativi:</strong> logs, statistiche di utilizzo, informazioni sui dispositivi utilizzati per accedere al servizio.</li>
              </ul>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Finalità del Trattamento</h3>
              <p className="mb-3">I dati vengono raccolti e trattati per le seguenti finalità:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Gestione degli appuntamenti e dei servizi offerti</li>
                <li>Invio di notifiche e promemoria</li>
                <li>Fatturazione e gestione dei pagamenti</li>
                <li>Assistenza clienti</li>
                <li>Miglioramento del servizio</li>
                <li>Adempimento di obblighi legali</li>
              </ul>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Base Giuridica del Trattamento</h3>
              <p className="mb-3">Il trattamento dei dati si basa su:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Esecuzione di un contratto di cui l'interessato è parte</li>
                <li>Consenso esplicito dell'interessato (specialmente per dati sanitari)</li>
                <li>Legittimo interesse del titolare del trattamento</li>
                <li>Adempimento di obblighi legali</li>
              </ul>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Periodo di Conservazione</h3>
              <p className="mb-3">
                I dati personali vengono conservati per il tempo necessario all'esecuzione del servizio 
                e successivamente per il periodo richiesto dagli obblighi legali e fiscali. I dati sanitari 
                sono conservati per il periodo minimo necessario al raggiungimento delle finalità per cui sono stati raccolti.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Condivisione dei Dati</h3>
              <p className="mb-3">I dati personali possono essere condivisi con:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Fornitori di servizi (come processori di pagamento, servizi di notifica)</li>
                <li>Autorità pubbliche, quando richiesto dalla legge</li>
                <li>Professionisti esterni (consulenti, esperti IT)</li>
              </ul>
              <p className="mt-3">
                Tutti i terzi con cui condividiamo i dati sono vincolati da accordi che garantiscono 
                la protezione dei dati in conformità con la normativa applicabile.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Diritti degli Interessati</h3>
              <p className="mb-3">Gli utenti hanno diritto di:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Accedere ai propri dati personali</li>
                <li>Rettificare dati inesatti</li>
                <li>Richiedere la cancellazione dei dati ("diritto all'oblio")</li>
                <li>Limitare il trattamento in determinate circostanze</li>
                <li>Opporsi al trattamento per motivi legittimi</li>
                <li>Ricevere i dati in formato elettronico per trasferirli ad altro titolare (portabilità)</li>
                <li>Revocare il consenso in qualsiasi momento</li>
                <li>Presentare reclamo all'Autorità Garante per la protezione dei dati personali</li>
              </ul>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Sicurezza dei Dati</h3>
              <p className="mb-3">
                Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da 
                perdita, uso improprio e accesso non autorizzato, inclusa la crittografia dei dati sensibili, 
                l'accesso limitato e controllato, e procedure di backup regolari.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Modifiche alla Privacy Policy</h3>
              <p className="mb-3">
                Ci riserviamo il diritto di modificare questa Privacy Policy in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina con 
                l'indicazione della data di aggiornamento. In caso di modifiche significative, informeremo gli utenti tramite email o notifica nell'applicazione.
              </p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">Contatti</h3>
              <p>
                Per qualsiasi domanda relativa alla presente Privacy Policy o al trattamento dei dati personali, è possibile contattare il titolare del trattamento 
                all'indirizzo email zambelli.andrea.1973@gmail.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}