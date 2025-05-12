import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function FooterContent() {
  const { t } = useTranslation();
  const [dialogContent, setDialogContent] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    content: null
  });

  const closeDialog = () => {
    setDialogContent({
      isOpen: false,
      title: '',
      content: null
    });
  };

  const openPrivacyPolicy = () => {
    setDialogContent({
      isOpen: true,
      title: 'Privacy Policy',
      content: (
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Informativa sulla Privacy</h2>
            <p>Ultimo aggiornamento: 12 Maggio 2025</p>
            
            <h3 className="text-lg font-medium mt-6">1. Introduzione</h3>
            <p>
              La presente Informativa sulla Privacy descrive le nostre politiche e procedure sulla raccolta, l'uso e la 
              divulgazione delle informazioni dell'utente quando utilizza il nostro servizio e informa l'utente sui suoi 
              diritti alla privacy e su come la legge lo protegge.
            </p>
            
            <h3 className="text-lg font-medium mt-6">2. Tipologie di dati raccolti</h3>
            <h4 className="font-medium mt-4">Dati personali</h4>
            <p>
              Durante l'utilizzo del nostro servizio, potremmo chiederti di fornirci alcune informazioni di identificazione 
              personale che possono essere utilizzate per contattarti o identificarti. Le informazioni di identificazione 
              personale possono includere, ma non sono limitate a:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Indirizzo email</li>
              <li>Nome e cognome</li>
              <li>Numero di telefono</li>
              <li>Indirizzo</li>
              <li>Dati anagrafici e sanitari (per la gestione degli appuntamenti)</li>
              <li>Cookie e dati di utilizzo</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6">3. Finalità del trattamento</h3>
            <p>Utilizziamo i dati personali raccolti per le seguenti finalità:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Per fornire e mantenere il nostro servizio</li>
              <li>Per notificare modifiche al nostro servizio</li>
              <li>Per gestire gli appuntamenti e le comunicazioni correlate</li>
              <li>Per fornire assistenza clienti</li>
              <li>Per raccogliere analisi o informazioni preziose in modo da migliorare il nostro servizio</li>
              <li>Per monitorare l'utilizzo del nostro servizio</li>
              <li>Per rilevare, prevenire e affrontare problemi tecnici</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6">4. Conservazione dei dati</h3>
            <p>
              Conserveremo i tuoi dati personali solo per il tempo necessario agli scopi indicati nella presente 
              Informativa sulla Privacy. Conserveremo e utilizzeremo i tuoi dati personali nella misura necessaria 
              per adempiere ai nostri obblighi legali, risolvere controversie e far rispettare le nostre politiche.
            </p>
            
            <h3 className="text-lg font-medium mt-6">5. Trasferimento dei dati</h3>
            <p>
              Le tue informazioni, compresi i dati personali, possono essere trasferite e mantenute su computer 
              situati al di fuori del tuo stato, provincia, paese o altra giurisdizione governativa dove le leggi 
              sulla protezione dei dati possono essere diverse da quelle della tua giurisdizione.
            </p>
            <p className="mt-2">
              Il tuo consenso alla presente Informativa sulla Privacy seguito dall'invio di tali informazioni 
              rappresenta il tuo consenso al trasferimento.
            </p>
            
            <h3 className="text-lg font-medium mt-6">6. Divulgazione dei dati</h3>
            <h4 className="font-medium mt-4">Requisiti legali</h4>
            <p>
              Possiamo divulgare i tuoi dati personali in buona fede credendo che tale azione sia necessaria per:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Adempiere a un obbligo legale</li>
              <li>Proteggere e difendere i diritti o la proprietà del servizio</li>
              <li>Prevenire o indagare su possibili illeciti in relazione al servizio</li>
              <li>Proteggere la sicurezza personale degli utenti del servizio o del pubblico</li>
              <li>Proteggere dalla responsabilità legale</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6">7. Sicurezza dei dati</h3>
            <p>
              La sicurezza dei tuoi dati è importante per noi, ma ricorda che nessun metodo di trasmissione su Internet 
              o metodo di archiviazione elettronica è sicuro al 100%. Mentre ci sforziamo di utilizzare mezzi 
              commercialmente accettabili per proteggere i tuoi dati personali, non possiamo garantirne la sicurezza assoluta.
            </p>
            
            <h3 className="text-lg font-medium mt-6">8. I tuoi diritti sulla protezione dei dati</h3>
            <p>
              Ai sensi del Regolamento Generale sulla Protezione dei Dati (GDPR), hai determinati diritti 
              in relazione ai tuoi dati personali:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Il diritto di accesso, aggiornamento o cancellazione delle informazioni che abbiamo su di te</li>
              <li>Il diritto di rettifica</li>
              <li>Il diritto di opposizione</li>
              <li>Il diritto di limitazione</li>
              <li>Il diritto alla portabilità dei dati</li>
              <li>Il diritto di revocare il consenso</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6">9. Modifiche alla presente informativa sulla privacy</h3>
            <p>
              Potremmo aggiornare la nostra Informativa sulla Privacy di tanto in tanto. Ti informeremo di eventuali 
              modifiche pubblicando la nuova Informativa sulla Privacy in questa pagina.
            </p>
            <p className="mt-2">
              Ti consigliamo di rivedere periodicamente questa Informativa sulla Privacy per eventuali modifiche. 
              Le modifiche a questa Informativa sulla Privacy sono efficaci quando vengono pubblicate su questa pagina.
            </p>
            
            <h3 className="text-lg font-medium mt-6">10. Contattaci</h3>
            <p>
              Se hai domande su questa Informativa sulla Privacy, puoi contattarci:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Via email: privacy@example.com</li>
              <li>Via telefono: +39 123 456 7890</li>
            </ul>
            
          </div>
        </ScrollArea>
      )
    });
  };

  const openTermsOfService = () => {
    setDialogContent({
      isOpen: true,
      title: t('common.terms', 'Termini di Servizio'),
      content: (
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Termini di Servizio</h2>
            <p>Ultimo aggiornamento: 12 Maggio 2025</p>
            
            <h3 className="text-lg font-medium mt-6">1. Accettazione dei Termini</h3>
            <p>
              Leggendo e utilizzando questo servizio, l'utente accetta di rispettare i presenti Termini e Condizioni, 
              tutte le leggi e i regolamenti applicabili e riconosce di essere responsabile del rispetto di tutte le 
              leggi locali applicabili. Se non si accettano questi termini, si è pregati di non utilizzare il servizio.
            </p>
            
            <h3 className="text-lg font-medium mt-6">2. Licenza d'uso</h3>
            <p>
              Viene concessa l'autorizzazione a utilizzare temporaneamente questo servizio, soggetta alle seguenti condizioni:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Il servizio è concesso in licenza, non venduto</li>
              <li>La licenza è non esclusiva, non trasferibile, limitata e revocabile</li>
              <li>Non è consentito riprodurre, duplicare, copiare, vendere, rivendere o sfruttare qualsiasi parte del servizio</li>
              <li>Questa licenza può essere terminata in qualsiasi momento per qualsiasi motivo</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6">3. Abbonamenti</h3>
            <p>
              Alcuni aspetti del servizio sono forniti su base di abbonamento. Ti verrà addebitato in anticipo su base 
              ricorrente e periodica. Al termine di ogni periodo, il tuo abbonamento si rinnoverà automaticamente alle 
              stesse condizioni a meno che non venga annullato.
            </p>
            
            <h3 className="text-lg font-medium mt-6">4. Prova gratuita</h3>
            <p>
              Il servizio può offrire una prova gratuita per uno dei nostri piani di abbonamento. 
              Al termine del periodo di prova gratuita, ti verrà automaticamente addebitato il piano di 
              abbonamento applicabile, a meno che non annulli l'abbonamento prima della fine del periodo di prova.
            </p>
            
            <h3 className="text-lg font-medium mt-6">5. Account</h3>
            <p>
              Quando crei un account sul nostro servizio, devi fornire informazioni accurate, complete e aggiornate. 
              L'utente è responsabile della salvaguardia della password utilizzata per accedere al servizio e di 
              qualsiasi attività o azione intrapresa con il proprio account.
            </p>
            
            <h3 className="text-lg font-medium mt-6">6. Contenuto dell'utente</h3>
            <p>
              Il nostro servizio ti consente di pubblicare, collegare, archiviare, condividere e rendere disponibili 
              determinati dati, testo o altri materiali. Sei responsabile del contenuto che pubblichi sul servizio, 
              inclusa la sua legalità, affidabilità e appropriatezza.
            </p>
            
            <h3 className="text-lg font-medium mt-6">7. Limitazione di responsabilità</h3>
            <p>
              In nessun caso saremo responsabili per qualsiasi danno derivante dall'uso o dall'impossibilità di utilizzare 
              il servizio, inclusi ma non limitati a danni per perdita di profitti, avviamento, utilizzo, dati o altre 
              perdite intangibili.
            </p>
            
            <h3 className="text-lg font-medium mt-6">8. Modifiche ai termini</h3>
            <p>
              Ci riserviamo il diritto, a nostra esclusiva discrezione, di modificare o sostituire questi Termini in qualsiasi momento. 
              Se una revisione è significativa, cercheremo di fornire un preavviso di almeno 30 giorni prima che i nuovi termini 
              entrino in vigore.
            </p>
            
            <h3 className="text-lg font-medium mt-6">9. Legge applicabile</h3>
            <p>
              Questi Termini saranno regolati e interpretati in conformità con le leggi italiane, senza riguardo 
              alle disposizioni sui conflitti di legge.
            </p>
            
            <h3 className="text-lg font-medium mt-6">10. Contattaci</h3>
            <p>
              Se hai domande su questi Termini, puoi contattarci:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Via email: terms@example.com</li>
              <li>Via telefono: +39 123 456 7890</li>
            </ul>
          </div>
        </ScrollArea>
      )
    });
  };

  const openSupport = () => {
    setDialogContent({
      isOpen: true,
      title: t('common.support', 'Supporto'),
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Centro Assistenza</h2>
          
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="bg-background rounded-lg p-4 border shadow-sm">
              <h3 className="text-lg font-medium">Assistenza via Email</h3>
              <p className="mt-2">Per qualsiasi domanda o problema, scrivici a:</p>
              <p className="font-medium mt-1">supporto@example.com</p>
              <p className="text-muted-foreground text-sm mt-2">Risposta garantita entro 24 ore</p>
            </div>
            
            <div className="bg-background rounded-lg p-4 border shadow-sm">
              <h3 className="text-lg font-medium">Assistenza Telefonica</h3>
              <p className="mt-2">Chiama il nostro numero di supporto:</p>
              <p className="font-medium mt-1">+39 123 456 7890</p>
              <p className="text-muted-foreground text-sm mt-2">Disponibile dal lunedì al venerdì, 9:00-18:00</p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium">Domande Frequenti</h3>
            
            <div className="mt-4 space-y-3">
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <h4 className="font-medium">Come posso modificare i miei appuntamenti?</h4>
                <p className="mt-1 text-muted-foreground">
                  Per modificare un appuntamento, vai alla sezione "I miei appuntamenti" nel tuo profilo, 
                  seleziona l'appuntamento che desideri modificare e clicca sul pulsante "Modifica".
                </p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <h4 className="font-medium">Come posso aggiornare i miei dati personali?</h4>
                <p className="mt-1 text-muted-foreground">
                  Per aggiornare i tuoi dati personali, vai alla sezione "Profilo" e clicca su "Modifica profilo". 
                  Dopo aver apportato le modifiche, clicca su "Salva".
                </p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <h4 className="font-medium">Come posso cambiare il mio piano di abbonamento?</h4>
                <p className="mt-1 text-muted-foreground">
                  Per cambiare il tuo piano di abbonamento, vai alla sezione "Abbonamento" nel tuo profilo, 
                  clicca su "Cambia piano" e seleziona il nuovo piano a cui desideri passare.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    });
  };

  return (
    <div className="flex space-x-4">
      <Button variant="link" onClick={openSupport} className="text-primary hover:text-primary-dark text-sm">
        {t('common.support', 'Supporto')}
      </Button>
      <Button variant="link" onClick={openPrivacyPolicy} className="text-primary hover:text-primary-dark text-sm">
        Privacy Policy
      </Button>
      <Button variant="link" onClick={openTermsOfService} className="text-primary hover:text-primary-dark text-sm">
        {t('common.terms', 'Termini di Servizio')}
      </Button>

      <Dialog open={dialogContent.isOpen} onOpenChange={(open) => {
        if (!open) closeDialog();
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>
              {/* Description can be empty */}
            </DialogDescription>
          </DialogHeader>
          {dialogContent.content}
          <DialogFooter>
            <Button onClick={closeDialog}>{t('common.close', 'Chiudi')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}