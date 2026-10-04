---
name: Appuntamenti liberi e impegni privati
description: Obiettivo prodotto: acquisire impegni senza cliente o servizio e senza dipendere da Google Calendar.
---

Il gestionale deve consentire una modalità di acquisizione appuntamenti libera, senza obbligo di collegamento a clienti e servizi, selezionabile tramite un interruttore a cursore accanto alla modalità attuale.

**Why:** Il 2026-10-04 il proprietario ha richiesto una modalità simile a Google Calendar per non obbligare i professionisti a registrare lì gli appuntamenti privati, soprattutto quando la sincronizzazione non funziona.

**How to apply:** La creazione di impegni privati deve funzionare direttamente nel gestionale senza richiedere una connessione Google. Non inferire regole di disponibilità o comportamento della sincronizzazione non ancora concordati.

Il proprietario ha precisato il 2026-10-04 che il selettore deve cambiare modalità sia per l'inserimento manuale sia per quello vocale AI. In modalità libera i campi non devono essere vincolati ai database di clienti e servizi. Il selettore va in basso accanto ai pulsanti attuali, tutti sulla stessa fila.

**Why:** Gli impegni personali e non lavorativi devono essere registrabili nel gestionale senza dover continuare a usare Google Calendar.

**How to apply:** Conservare il flusso lavorativo esistente. Gli impegni personali creati nel gestionale devono avere una tonalità di grigio diversa dagli eventi importati da Google; i colori degli appuntamenti lavorativi devono rimanere invariati.

Mostrare un'anteprima separata prima di inserire il nuovo sistema nel programma.

**Why:** Il proprietario ha chiesto esplicitamente di vedere l'anteprima prima dell'integrazione.

**How to apply:** Preparare il prototipo usando l'interfaccia reale come punto di partenza; non modificare il programma né pubblicare la funzionalità prima dell'approvazione dell'anteprima.

L'anteprima è stata approvata il 2026-10-04. Nella vista Giorno, un singolo clic o tocco sull'orario deve aprire il modulo della modalità selezionata con quell'orario già compilato.

**Why:** Dopo l'approvazione il proprietario ha chiesto esplicitamente questa scorciatoia per entrambe le modalità.

**How to apply:** Non ripristinare il doppio tocco sugli slot. Distinguere un tocco completato dallo scorrimento; conservare le regole separate di espansione delle schede.

Per mantenere i comandi sulla stessa fila, confrontare i centri dei pulsanti visibili, non solo i contenitori esterni.

**Why:** I contenitori dei comandi storici riservano spazio differente: allinearli può lasciare il pulsante manuale visibilmente più alto del microfono.

**How to apply:** Verificare la geometria dei controlli effettivi su telefono, anche dopo un cambio di modalità o di dimensione della finestra. Conservare la possibilità di trascinamento esplicito.

La modalità di compilazione scelta dal professionista deve restare selezionata dopo uscita e rientro nel gestionale.

**Why:** Il 2026-10-04 il proprietario ha richiesto esplicitamente questa verifica prima dell'invio a GitHub.

**How to apply:** Conservare la preferenza separatamente per account, anche durante la pulizia al logout e al login; non conservare invece sessioni o autorizzazioni private. La persistenza locale vale sullo stesso browser/dispositivo.

Per questa modalità libera, conservare la versione dell'anteprima approvata, senza introdurre un secondo accesso tramite password privata né sincronizzazione Google personale implicita.

**Why:** Il 2026-10-04, dopo essere stato informato che GitHub conteneva anche un'agenda protetta distinta, il proprietario ha scelto esplicitamente la versione locale dell'anteprima come versione da pubblicare.

**How to apply:** Non ripristinare automaticamente l'agenda protetta quando si riconciliano copie divergenti. Non cancellare i dati storici dell'altra agenda; eventuale recupero o migrazione richiede un accordo separato.

L'archivio protetto precedente non deve diventare leggibile dal solo accesso condiviso al gestionale dopo il passaggio alla modalità locale.

**Why:** Un login comune non identifica il professionista a cui appartengono i dati precedentemente protetti.

**How to apply:** Conservare l'archivio senza migrare o esporre automaticamente i suoi contenuti. Il recupero deve essere un'azione esplicita, con destinazione e autorizzazione concordate.

L'assistente per gli impegni personali deve aprirsi con lo stesso saluto personalizzato della modalità Lavoro, seguito da «Dimmi pure».

**Why:** Il 2026-10-04 il proprietario ha chiesto di sostituire il messaggio che spiegava quali impegni raccontare con questo saluto.

**How to apply:** Usare la stessa fonte del nome e lo stesso saluto della modalità Lavoro, mantenendo il saluto generico quando il nome non è disponibile e traducendo l'invito nelle altre lingue.