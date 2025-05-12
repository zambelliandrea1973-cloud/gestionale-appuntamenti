import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AtSign, Phone, HelpCircle, MessageSquare } from 'lucide-react';

export default function FooterContent() {
  const [activeDialog, setActiveDialog] = useState<'privacy' | 'terms' | 'support' | null>(null);
  const currentYear = new Date().getFullYear();
  
  return (
    <>
      <div className="flex space-x-4">
        <Button 
          variant="link" 
          className="text-primary hover:text-primary-dark text-sm"
          onClick={() => setActiveDialog('support')}
        >
          Supporto
        </Button>
        <Button 
          variant="link" 
          className="text-primary hover:text-primary-dark text-sm"
          onClick={() => setActiveDialog('privacy')}
        >
          Privacy Policy
        </Button>
        <Button 
          variant="link" 
          className="text-primary hover:text-primary-dark text-sm"
          onClick={() => setActiveDialog('terms')}
        >
          Termini di Servizio
        </Button>
      </div>

      {/* Dialog per Privacy Policy */}
      <Dialog open={activeDialog === 'privacy'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Privacy Policy</DialogTitle>
            <DialogDescription>Ultimo aggiornamento: 12/05/2025</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              <h3 className="text-lg font-semibold mb-2">Diritti degli Interessati</h3>
              <p className="mb-3">Gli utenti hanno diritto di:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Accedere ai propri dati personali</li>
                <li>Rettificare dati inesatti</li>
                <li>Richiedere la cancellazione dei dati</li>
                <li>Limitare il trattamento in determinate circostanze</li>
                <li>Ricevere i dati in formato elettronico (portabilità)</li>
                <li>Revocare il consenso in qualsiasi momento</li>
              </ul>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Contatti</h3>
              <p>
                Per qualsiasi domanda relativa alla presente Privacy Policy o al trattamento dei dati personali, è possibile contattare il titolare del trattamento 
                all'indirizzo email zambelli.andrea.1973@gmail.com.
              </p>
            </section>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Chiudi</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per Termini di Servizio */}
      <Dialog open={activeDialog === 'terms'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Termini di Servizio</DialogTitle>
            <DialogDescription>Ultimo aggiornamento: 12/05/2025</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              <h3 className="text-lg font-semibold mb-2">7. Legge Applicabile</h3>
              <p className="mb-3">
                I presenti Termini sono regolati dalle leggi italiane, con giurisdizione esclusiva dei tribunali di Milano, Italia.
              </p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">8. Contatti</h3>
              <p>
                Per domande relative ai presenti Termini, contattare: zambelli.andrea.1973@gmail.com
              </p>
            </section>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Chiudi</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per Supporto */}
      <Dialog open={activeDialog === 'support'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Supporto</DialogTitle>
            <DialogDescription>Assistenza e informazioni di contatto</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="contatti" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contatti">Contatti</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="assistenza">Richiedi Assistenza</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contatti">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Contatti di Assistenza</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <AtSign className="h-5 w-5 text-primary" />
                      <span>Email: <a href="mailto:zambelli.andrea.1973@gmail.com" className="text-primary hover:underline">zambelli.andrea.1973@gmail.com</a></span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <span>Telefono: +39 347 255 0110</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span>WhatsApp: +39 347 255 0110</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Orari di Assistenza</h4>
                    <p>Lunedì - Venerdì: 9:00 - 18:00</p>
                    <p>Sabato: 9:00 - 12:00</p>
                    <p>Domenica: Chiuso</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="faq">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Domande Frequenti</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Come posso cambiare il mio piano di abbonamento?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Puoi cambiare il tuo piano di abbonamento accedendo alla sezione "Piano" nel menù "Pagamenti" della dashboard amministrativa.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Come ripristinare la password?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Clicca sul link "Password dimenticata?" nella pagina di login. Ti verrà inviata un'email con le istruzioni per il ripristino.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Come configurare le notifiche automatiche?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Accedi alla sezione "Notifiche" nel menù "Impostazioni" per configurare i promemoria automatici e le preferenze di notifica.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Posso accedere da più dispositivi?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Sì, puoi accedere al tuo account da qualsiasi dispositivo con un browser web. L'applicazione è ottimizzata anche per dispositivi mobili.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="assistenza">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Richiedi Assistenza</h3>
                    <p>Per assistenza tecnica o informazioni sul tuo account, contatta il supporto tramite uno dei seguenti canali:</p>
                    
                    <div className="grid gap-4 mt-4">
                      <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                        <AtSign className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Email</h4>
                          <p className="text-sm text-gray-600">Invia una richiesta dettagliata</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                        <Phone className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Telefono</h4>
                          <p className="text-sm text-gray-600">Assistenza diretta con un operatore</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Guida Online</h4>
                          <p className="text-sm text-gray-600">Documentazione e tutorial disponibili</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Chiudi</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}