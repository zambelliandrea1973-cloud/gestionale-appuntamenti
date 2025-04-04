import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PrivacyConsentFormProps {
  clientId: number;
  onConsentProvided: () => void;
  hasConsent?: boolean;
}

export default function PrivacyConsentForm({ clientId, onConsentProvided, hasConsent = false }: PrivacyConsentFormProps) {
  const { toast } = useToast();
  const [consent, setConsent] = useState<boolean>(hasConsent);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
      toast({
        title: "Consenso richiesto",
        description: "Per proseguire è necessario accettare i termini della privacy",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Salva il consenso nel database
      const response = await apiRequest('POST', '/api/consents', {
        clientId,
        consentProvided: true,
        consentDate: new Date().toISOString(),
      });
      
      if (response.ok) {
        // Callback per il componente padre
        onConsentProvided();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Errore durante la registrazione del consenso");
      }
    } catch (error) {
      console.error("Errore nell'invio del modulo di consenso:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante la registrazione del consenso",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6 px-6 pb-6">
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[400px] rounded-md border p-4 mb-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Informativa sul trattamento dei dati personali</h2>
              <p className="text-sm text-muted-foreground">
                Ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)
              </p>
              
              <h3 className="text-lg font-medium pt-2">Titolare del trattamento</h3>
              <p>
                Il titolare del trattamento è [Nome Studio/Professionista], con sede in [Indirizzo], 
                [Città], [CAP], [Provincia], P.IVA [Numero], contattabile all'indirizzo email [Email] 
                e al numero di telefono [Telefono].
              </p>
              
              <h3 className="text-lg font-medium pt-2">Finalità del trattamento</h3>
              <p>
                I dati personali da Lei forniti saranno trattati per le seguenti finalità:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Erogazione dei servizi richiesti e gestione degli appuntamenti</li>
                <li>Adempimento di obblighi contrattuali e legali</li>
                <li>Gestione amministrativa e contabile</li>
                <li>Invio di comunicazioni relative ai servizi sottoscritti</li>
                <li>Invio di promemoria per gli appuntamenti</li>
              </ul>
              
              <h3 className="text-lg font-medium pt-2">Base giuridica del trattamento</h3>
              <p>
                Il trattamento dei Suoi dati personali si fonda sulle seguenti basi giuridiche:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Esecuzione di un contratto di cui Lei è parte</li>
                <li>Adempimento di obblighi legali cui è soggetto il titolare</li>
                <li>Consenso da Lei espresso per specifiche finalità</li>
                <li>Legittimo interesse del titolare</li>
              </ul>
              
              <h3 className="text-lg font-medium pt-2">Categorie di dati trattati</h3>
              <p>
                Il trattamento riguarderà le seguenti categorie di dati:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Dati anagrafici e di contatto (nome, cognome, indirizzo, email, telefono)</li>
                <li>Dati relativi alla salute (informazioni mediche pertinenti al trattamento)</li>
                <li>Dati fiscali (necessari per la fatturazione)</li>
                <li>Eventuali dati relativi a preferenze di appuntamento</li>
              </ul>
              
              <h3 className="text-lg font-medium pt-2">Modalità di trattamento</h3>
              <p>
                Il trattamento dei dati avverrà mediante strumenti elettronici e cartacei, 
                con logiche strettamente correlate alle finalità per cui sono raccolti e, 
                comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.
              </p>
              
              <h3 className="text-lg font-medium pt-2">Periodo di conservazione</h3>
              <p>
                I dati personali saranno conservati per il tempo necessario all'erogazione dei 
                servizi richiesti e per l'adempimento degli obblighi di legge, e comunque non 
                oltre i termini previsti dalla normativa vigente.
              </p>
              
              <h3 className="text-lg font-medium pt-2">Destinatari dei dati</h3>
              <p>
                I dati potranno essere comunicati a:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Personale autorizzato del Titolare</li>
                <li>Soggetti esterni nominati Responsabili del trattamento (consulenti, fornitori di servizi tecnici)</li>
                <li>Enti pubblici e privati quando previsto da norme di legge o di regolamento</li>
              </ul>
              
              <h3 className="text-lg font-medium pt-2">Trasferimento dati extra UE</h3>
              <p>
                I dati personali non saranno trasferiti in Paesi terzi extra UE.
              </p>
              
              <h3 className="text-lg font-medium pt-2">Diritti dell'interessato</h3>
              <p>
                In qualità di interessato, Lei ha il diritto di:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Accedere ai Suoi dati personali</li>
                <li>Chiederne la rettifica o la cancellazione</li>
                <li>Chiedere la limitazione del trattamento</li>
                <li>Opporsi al trattamento</li>
                <li>Richiedere la portabilità dei dati</li>
                <li>Revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento basata sul consenso prima della revoca</li>
              </ul>
              <p className="pt-2">
                Lei ha inoltre il diritto di proporre reclamo all'Autorità Garante per la protezione dei dati personali.
              </p>
              
              <h3 className="text-lg font-medium pt-2">Natura del conferimento dei dati</h3>
              <p>
                Il conferimento dei dati personali è necessario per l'erogazione dei servizi richiesti. 
                Il mancato conferimento di tali dati comporta l'impossibilità di erogare i servizi richiesti.
              </p>
              
              <h3 className="text-lg font-medium pt-2">Processo decisionale automatizzato</h3>
              <p>
                Non è presente alcun processo decisionale automatizzato, compresa la profilazione.
              </p>
            </div>
          </ScrollArea>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="consent" 
                checked={consent} 
                onCheckedChange={(value) => setConsent(value === true)}
                disabled={hasConsent || isSubmitting}
              />
              <label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {hasConsent 
                  ? "Hai già fornito il consenso al trattamento dei dati personali" 
                  : "Dichiaro di aver letto e compreso l'informativa sulla privacy e acconsento al trattamento dei miei dati personali per le finalità indicate"}
              </label>
            </div>
            
            {!hasConsent && (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio in corso..." : "Fornisci consenso"}
              </Button>
            )}
            
            {hasConsent && (
              <p className="text-sm text-muted-foreground italic text-center">
                Hai già fornito il consenso al trattamento dei dati personali in data precedente.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}