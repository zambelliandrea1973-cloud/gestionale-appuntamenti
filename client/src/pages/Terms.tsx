import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header con pulsante indietro */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Home
          </Button>
          <h1 className="text-4xl font-bold text-primary border-b-2 border-primary pb-3">
            Termini di Servizio e Condizioni d'Uso
          </h1>
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-primary rounded-r-lg">
            <p><strong>Data di entrata in vigore:</strong> 20 Giugno 2025</p>
            <p><strong>Ultima modifica:</strong> 20 Giugno 2025</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Sezione 1 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">1. Accettazione dei Termini</h2>
              <p className="text-muted-foreground leading-relaxed">
                L'utilizzo del Gestionale Appuntamenti ("il Servizio") implica l'accettazione integrale dei presenti 
                Termini di Servizio. Se non si accettano questi termini, non è possibile utilizzare il Servizio.
              </p>
            </CardContent>
          </Card>

          {/* Sezione 2 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">2. Descrizione del Servizio</h2>
              <p className="text-muted-foreground mb-4">
                Il Gestionale Appuntamenti è un sistema software per la gestione di:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Prenotazioni e appuntamenti</li>
                <li>Anagrafica clienti</li>
                <li>Fatturazione e documenti fiscali</li>
                <li>Comunicazioni automatiche</li>
                <li>Report e statistiche</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Il Servizio è progettato per essere utilizzato in diversi settori professionali inclusi, 
                ma non limitati a: servizi medici, estetici, consulenza, e altri servizi professionali.
              </p>
            </CardContent>
          </Card>

          {/* Sezione 3 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">3. Tipologie di Abbonamento</h2>
              
              <p className="text-muted-foreground mb-4">
                Tutti i piani includono le seguenti funzionalità:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-6">
                <li>Calendario appuntamenti</li>
                <li>Gestione clienti</li>
                <li>App QR/PWA per clienti</li>
                <li>Richiesta appuntamenti cliente</li>
                <li>Notifiche clienti</li>
                <li>Emissione fatture</li>
                <li>Sincronizzazione Google Calendar</li>
                <li>Report e statistiche</li>
                <li>Pacchetti promozionali</li>
                <li>Gestione più dipendenti</li>
                <li>Magazzino prodotti</li>
                <li>Campagne Marketing AI</li>
              </ul>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-300 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">3.1 Piano Base</h3>
                  <p className="text-muted-foreground"><strong>Prezzo:</strong> €5,99/mese oppure €59,00/anno</p>
                  <p className="text-muted-foreground"><strong>Limite clienti:</strong> 100</p>
                </div>

                <div className="p-4 border border-blue-400 rounded-lg bg-blue-50">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">3.2 Piano Professional</h3>
                  <p className="text-muted-foreground"><strong>Prezzo:</strong> €9,99/mese oppure €99,00/anno</p>
                  <p className="text-muted-foreground"><strong>Limite clienti:</strong> 500</p>
                </div>

                <div className="p-4 border border-gray-300 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">3.3 Piano Business</h3>
                  <p className="text-muted-foreground"><strong>Prezzo:</strong> €19,99/mese oppure €199,00/anno</p>
                  <p className="text-muted-foreground"><strong>Limite clienti:</strong> Illimitato</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sezione 4 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">4. Responsabilità dell'Utente</h2>
              <p className="text-muted-foreground mb-4">L'utente si impegna a:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Utilizzare il Servizio in conformità alle leggi applicabili</li>
                <li>Mantenere riservate le proprie credenziali di accesso</li>
                <li>Inserire dati accurati e aggiornati</li>
                <li>Rispettare la privacy dei propri clienti</li>
                <li>Effettuare backup regolari dei propri dati</li>
              </ul>
            </CardContent>
          </Card>

          {/* Sezione 5 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">5. Privacy e Protezione Dati</h2>
              <p className="text-muted-foreground mb-4">
                Il trattamento dei dati personali avviene in conformità al Regolamento Generale sulla Protezione 
                dei Dati (GDPR). L'utente mantiene la titolarità dei propri dati e di quelli dei propri clienti.
              </p>
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <p className="font-semibold text-yellow-800 mb-2">Importante:</p>
                <p className="text-yellow-700">
                  L'utente è responsabile del rispetto delle normative sulla privacy nei confronti dei propri 
                  clienti e della raccolta del consenso necessario per il trattamento dei loro dati.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sezione 6 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">6. Limitazioni e Esclusioni</h2>
              <p className="text-muted-foreground mb-4">
                Il Servizio è fornito "così com'è". Zambelli Development non garantisce:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Disponibilità continua del servizio</li>
                <li>Assenza di errori o interruzioni</li>
                <li>Compatibilità con tutti i dispositivi</li>
              </ul>
            </CardContent>
          </Card>

          {/* Sezione 7 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">7. Fatturazione e Pagamenti</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Gli abbonamenti sono fatturati mensilmente o annualmente</li>
                <li>I pagamenti sono dovuti in anticipo</li>
                <li>I rimborsi sono concessi solo in casi eccezionali</li>
                <li>I prezzi possono essere modificati con preavviso di 30 giorni</li>
              </ul>
            </CardContent>
          </Card>

          {/* Sezione 8 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">8. Risoluzione e Sospensione</h2>
              <p className="text-muted-foreground mb-4">Il contratto può essere risolto:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Dall'utente in qualsiasi momento con preavviso di 30 giorni</li>
                <li>Da Zambelli Development in caso di violazione dei termini</li>
                <li>Per mancato pagamento dopo 15 giorni dalla scadenza</li>
              </ul>
            </CardContent>
          </Card>

          {/* Sezione 9 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">9. Modifiche ai Termini</h2>
              <p className="text-muted-foreground">
                Zambelli Development si riserva il diritto di modificare questi termini in qualsiasi momento. 
                Le modifiche sostanziali saranno comunicate con almeno 30 giorni di preavviso.
              </p>
            </CardContent>
          </Card>

          {/* Sezione 10 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">10. Legge Applicabile</h2>
              <p className="text-muted-foreground">
                I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di Milano.
              </p>
            </CardContent>
          </Card>

          {/* Sezione 11 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">11. Contatti</h2>
              <p className="text-muted-foreground mb-4">Per questioni relative ai presenti termini, contattare:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Email:</strong> zambelli.andrea.1973@gmail.com</li>
                <li><strong>Sviluppatore:</strong> Zambelli Development</li>
              </ul>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center">
              <p className="font-semibold text-foreground">Gestionale Appuntamenti v2.1.0</p>
              <p className="text-muted-foreground">© 2025 Zambelli Development - Tutti i diritti riservati</p>
            </CardContent>
          </Card>

          {/* Pulsante per tornare indietro */}
          <div className="text-center pt-6">
            <Button onClick={() => navigate("/")} size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}