/**
 * Manual Sections Configuration
 * Registro centralizzato per tutte le sezioni del manuale utente
 */

export interface ManualSectionConfig {
  sectionId: string;
  accordionValue: string;
  titleIT: string;
  category: 'getting-started' | 'daily-operations' | 'advanced' | 'pwa-client';
}

/**
 * Mappa completa di tutte le sezioni del manuale
 * Ogni sezione ha:
 * - sectionId: identificatore backend (section-X-Y)
 * - accordionValue: valore per accordion UI
 * - titleIT: titolo in italiano (default)
 * - category: categoria di appartenenza
 */
export const MANUAL_SECTIONS: Record<string, ManualSectionConfig> = {
  // CATEGORIA 1: Configurazione Iniziale (Getting Started)
  'section-1-1': {
    sectionId: 'section-1-1',
    accordionValue: 'first-access',
    titleIT: '1.1 Primo Accesso al Sistema',
    category: 'getting-started'
  },
  'section-1-2': {
    sectionId: 'section-1-2',
    accordionValue: 'company-data',
    titleIT: '1.2 Configurare i Dati Aziendali',
    category: 'getting-started'
  },
  'section-1-3': {
    sectionId: 'section-1-3',
    accordionValue: 'banking-data',
    titleIT: '1.3 Configurare i Dati Bancari',
    category: 'getting-started'
  },
  'section-1-4': {
    sectionId: 'section-1-4',
    accordionValue: 'staff-rooms',
    titleIT: '1.4 Gestire Staff e Stanze di Trattamento',
    category: 'getting-started'
  },
  'section-1-5': {
    sectionId: 'section-1-5',
    accordionValue: 'email-setup',
    titleIT: '1.5 Configurare le Email Automatiche',
    category: 'getting-started'
  },

  // CATEGORIA 2: Operazioni Quotidiane (Daily Operations)
  'section-2-1': {
    sectionId: 'section-2-1',
    accordionValue: 'manage-clients',
    titleIT: '2.1 Gestione Clienti',
    category: 'daily-operations'
  },
  'section-2-2': {
    sectionId: 'section-2-2',
    accordionValue: 'calendar',
    titleIT: '2.2 Calendario e Appuntamenti',
    category: 'daily-operations'
  },
  'section-2-3': {
    sectionId: 'section-2-3',
    accordionValue: 'pwa-booking',
    titleIT: '2.3 Richieste Appuntamento PWA Cliente',
    category: 'daily-operations'
  },
  'section-2-4': {
    sectionId: 'section-2-4',
    accordionValue: 'invoices',
    titleIT: '2.4 Gestione Fatture',
    category: 'daily-operations'
  },

  // CATEGORIA 3: Funzioni Avanzate (Advanced Features)
  'section-3-1': {
    sectionId: 'section-3-1',
    accordionValue: 'inventory',
    titleIT: '3.1 Gestione Inventario e Magazzino',
    category: 'advanced'
  },
  'section-3-2': {
    sectionId: 'section-3-2',
    accordionValue: 'reports',
    titleIT: '3.2 Report e Statistiche',
    category: 'advanced'
  },
  'section-3-3': {
    sectionId: 'section-3-3',
    accordionValue: 'marketing',
    titleIT: '3.3 Campagne Marketing con AI',
    category: 'advanced'
  },
  'section-3-4': {
    sectionId: 'section-3-4',
    accordionValue: 'whatsapp',
    titleIT: '3.4 Centro WhatsApp',
    category: 'advanced'
  },
  'section-3-5': {
    sectionId: 'section-3-5',
    accordionValue: 'referral',
    titleIT: '3.5 Sistema Referral e Commissioni',
    category: 'advanced'
  },

  // CATEGORIA 4: PWA Area Cliente (Client PWA)
  'section-4-1': {
    sectionId: 'section-4-1',
    accordionValue: 'client-access',
    titleIT: '4.1 Come i Clienti Accedono alla Loro Area',
    category: 'pwa-client'
  },
  'section-4-2': {
    sectionId: 'section-4-2',
    accordionValue: 'client-features',
    titleIT: '4.2 Cosa Possono Fare i Clienti nell\'Area Riservata',
    category: 'pwa-client'
  },
  'section-4-3': {
    sectionId: 'section-4-3',
    accordionValue: 'install-pwa',
    titleIT: '4.3 Come Installare l\'App sul Telefono (PWA)',
    category: 'pwa-client'
  },
  'section-4-4': {
    sectionId: 'section-4-4',
    accordionValue: 'customize-client-area',
    titleIT: '4.4 Personalizzare l\'Aspetto dell\'Area Cliente',
    category: 'pwa-client'
  }
};

/**
 * Helper: ottieni array di tutte le sezioni ordinate per categoria
 */
export const getAllSections = (): ManualSectionConfig[] => {
  return Object.values(MANUAL_SECTIONS);
};

/**
 * Helper: ottieni sezioni per categoria
 */
export const getSectionsByCategory = (category: ManualSectionConfig['category']): ManualSectionConfig[] => {
  return Object.values(MANUAL_SECTIONS).filter(s => s.category === category);
};

/**
 * Helper: ottieni config da sectionId
 */
export const getSectionConfig = (sectionId: string): ManualSectionConfig | undefined => {
  return MANUAL_SECTIONS[sectionId];
};

/**
 * Fallback data per tutte le sezioni quando il database è vuoto
 * Sync con MANUAL_TEMPLATES in server/routes/manualRoutes.ts
 */
export interface ManualStep {
  content: string;
  mediaFiles?: Array<{ type: 'image' | 'video'; url: string; caption?: string }>;
}

export interface ManualSectionData {
  steps: ManualStep[];
}

export const MANUAL_FALLBACK_DATA: Record<string, ManualSectionData> = {
  'section-1-1': {
    steps: [{
      content: `Video Tutorial: Come accedere per la prima volta

Procedura di Accesso:
1. Apri il browser e vai all'indirizzo fornito dal tuo amministratore
2. Inserisci le credenziali di accesso (username e password)
3. Al primo accesso, ti verrà mostrato questo manuale automaticamente
4. Puoi accedere nuovamente al manuale in qualsiasi momento dal menu Impostazioni

💡 Suggerimento: Aggiungi il sito ai preferiti del browser per un accesso rapido!`,
      mediaFiles: []
    }]
  },
  'section-1-2': {
    steps: [{
      content: `Percorso: Menu principale → Impostazioni

Tab: Generali
- Nome Azienda: Inserisci il nome della tua pratica medica
- Servizi Offerti: Configura i trattamenti e servizi che offri (es. "Visita Generale", "Ecografia", "Analisi")
- Valuta: Seleziona la valuta di riferimento (EUR, USD, CHF, ecc.)

Tab: Contatti
- Email: Email di contatto per i clienti
- Telefono: Numero di telefono principale e secondario
- Indirizzo: Indirizzo fisico della pratica
- Sito Web: URL del tuo sito (opzionale)
- Social Media: Link Instagram, Facebook, LinkedIn (opzionali)

Tab: Aspetto
- Logo/Icona: Carica il logo della tua pratica (apparirà nell'app cliente)
- Colori: Personalizza colore primario e secondario del brand
- Tema: Scegli tra tema chiaro o scuro`,
      mediaFiles: []
    }]
  },
  'section-1-3': {
    steps: [{
      content: `Percorso: Menu principale → Banking Settings

I dati bancari sono necessari per ricevere pagamenti e appariranno sulle fatture:

- Nome Banca: Il nome del tuo istituto bancario
- IBAN: Codice IBAN del conto corrente
- BIC/SWIFT: Codice internazionale della banca (per bonifici esteri)
- Intestatario: Nome dell'intestatario del conto`,
      mediaFiles: []
    }]
  },
  'section-1-4': {
    steps: [{
      content: `Percorso: Impostazioni → Tab "Staff & Stanze"

Gestione Collaboratori
Aggiungi i membri del tuo team medico:
1. Clicca su "Aggiungi Collaboratore"
2. Inserisci nome, email e ruolo del collaboratore
3. Configura i permessi di accesso (opzionale)
4. Invia l'invito via email

Stanze di Trattamento
Configura le sale disponibili nella tua struttura:
1. Clicca su "Aggiungi Stanza"
2. Inserisci il nome della stanza (es. "Sala 1", "Studio Ecografia")
3. Associa la stanza ai servizi specifici (opzionale)`,
      mediaFiles: []
    }]
  },
  'section-1-5': {
    steps: [{
      content: `Percorso: Impostazioni → Tab "Email"

Configura l'invio automatico di email per notifiche e promemoria:

• Server SMTP: Indirizzo del server email (es. smtp.gmail.com)
• Porta: Di solito 587 o 465
• Username: Il tuo indirizzo email
• Password: Password dell'account email (usa password applicazione per Gmail)
• Email mittente: L'indirizzo che apparirà come mittente

Cosa verranno inviate le email:
• Conferme di appuntamenti
• Promemoria automatici prima degli appuntamenti
• Invio fatture ai clienti
• Campagne di marketing personalizzate`,
      mediaFiles: []
    }]
  },
  'section-2-1': {
    steps: [{
      content: `Percorso: Menu principale → Clienti

Aggiungere un nuovo cliente
1. Clicca sul pulsante "+ Nuovo Cliente"
2. Compila i dati anagrafici:
   - Nome e Cognome
   - Codice Fiscale
   - Email e Telefono
   - Data di nascita
   - Indirizzo (opzionale)
3. Salva il nuovo cliente
4. Il sistema genera automaticamente un codice QR univoco per l'accesso del cliente

Modificare un cliente esistente
1. Cerca il cliente dalla lista (usa la barra di ricerca)
2. Clicca sull'icona "Modifica" (matita)
3. Aggiorna i dati necessari
4. Salva le modifiche

QR Code per accesso cliente
Ogni cliente ha un QR code univoco per accedere alla sua area riservata:
1. Apri la scheda del cliente
2. Clicca su "Visualizza QR Code"
3. Il cliente può scansionare il codice con lo smartphone per accedere alla sua area personale
4. Oppure puoi stampare il QR code e consegnarlo al cliente`,
      mediaFiles: []
    }]
  },
  'section-2-2': {
    steps: [{
      content: `Percorso: Menu principale → Calendario

Creare un nuovo appuntamento
1. Clicca su uno slot orario vuoto nel calendario
2. Seleziona il cliente (o creane uno nuovo)
3. Scegli il servizio da erogare
4. Seleziona la stanza (se configurata)
5. Aggiungi note interne (opzionale)
6. Conferma l'appuntamento

Il cliente riceverà automaticamente una email di conferma (se configurata).

Visualizzazioni disponibili
- Vista Giorno: Mostra gli appuntamenti di una singola giornata
- Vista Settimana: Panoramica settimanale con tutti gli slot
- Vista Mese: Calendario mensile con conteggio appuntamenti
- Vista Lista: Elenco cronologico di tutti gli appuntamenti

Gestire gli appuntamenti
- Modifica: Clicca sull'appuntamento per modificare data, ora o servizio
- Sposta: Trascina l'appuntamento su un nuovo slot
- Cancella: Elimina l'appuntamento (il cliente riceverà notifica)
- Completa: Segna come completato al termine della visita

Promemoria automatici
Il sistema può inviare promemoria automatici ai clienti:
- 24 ore prima dell'appuntamento
- 1 ora prima dell'appuntamento
- Tramite Email e/o WhatsApp (se configurati)`,
      mediaFiles: []
    }]
  },
  'section-2-3': {
    steps: [{
      content: 'Questa sezione usa contenuti dinamici multi-lingua. Consulta la pagina pubblica del manuale per i dettagli.',
      mediaFiles: []
    }]
  },
  'section-2-4': {
    steps: [{
      content: `Percorso: Menu principale → Fatture

Creare una nuova fattura
1. Clicca su "+ Nuova Fattura"
2. Seleziona il cliente
3. Aggiungi i servizi erogati (con quantità e prezzi)
4. Il sistema calcola automaticamente:
   - Subtotale
   - IVA (se applicabile)
   - Totale nella valuta selezionata
5. Aggiungi note o termini di pagamento (opzionale)
6. Salva la fattura

Inviare la fattura al cliente
1. Dalla lista fatture, clicca sull'icona "Invia"
2. Scegli il metodo di invio:
   - Email (PDF allegato)
   - WhatsApp (link di download)
   - Stampa diretta
3. La fattura verrà anche resa disponibile nell'area cliente

Stati della fattura
- Bozza: Fattura non ancora inviata
- Inviata: Fattura inviata ma non pagata
- Pagata: Pagamento ricevuto
- Scaduta: Fattura non pagata oltre la scadenza

Dati visualizzati nella fattura
- Dati aziendali e logo (dalle Impostazioni)
- Dati cliente
- Numero progressivo fattura
- Data emissione e scadenza
- Dettaglio servizi con prezzi nella valuta selezionata
- Dati bancari per il pagamento`,
      mediaFiles: []
    }]
  },
  'section-3-1': {
    steps: [{
      content: `Percorso: Menu principale → Inventario

Aggiungere prodotti al magazzino
1. Clicca su "+ Nuovo Prodotto"
2. Inserisci i dettagli del prodotto:
   - Nome del prodotto
   - Categoria (creane di nuove se necessario)
   - Codice prodotto/SKU
   - Prezzo di acquisto e vendita
   - Quantità disponibile
   - Fornitore
   - Note
3. Carica una foto del prodotto (opzionale ma consigliato)
4. Salva il prodotto

Gestire le categorie prodotti
1. Vai alla sezione "Categorie"
2. Crea categorie logiche (es. "Farmaci", "Dispositivi", "Materiale Sanitario")
3. Assegna colori diversi per identificare rapidamente le categorie

Monitorare le scorte
- Visualizza a colpo d'occhio i prodotti in esaurimento
- Ricevi alert automatici quando le scorte scendono sotto la soglia minima
- Traccia movimenti di carico e scarico

Modificare immagini prodotti
1. Apri la scheda del prodotto
2. Clicca sull'immagine attuale (o sull'area "Aggiungi immagine")
3. Carica una nuova foto dal tuo dispositivo
4. L'immagine verrà ridimensionata automaticamente`,
      mediaFiles: []
    }]
  },
  'section-3-2': {
    steps: [{
      content: `Percorso: Menu principale → Report

Tipi di report disponibili
- Report Finanziario: Fatturato, incassi, crediti in sospeso
- Report Appuntamenti: Statistiche su prenotazioni, cancellazioni, no-show
- Report Clienti: Nuovi clienti, clienti attivi, clienti inattivi
- Report Servizi: Servizi più richiesti, redditività per servizio
- Report Inventario: Valore magazzino, rotazione prodotti

Filtrare i dati
- Seleziona periodo temporale (oggi, settimana, mese, anno, personalizzato)
- Filtra per collaboratore
- Filtra per servizio o categoria
- Visualizza la valuta selezionata nelle impostazioni

Esportare i report
- Scarica report in formato PDF
- Esporta dati in Excel/CSV per analisi approfondite
- Stampa report direttamente dal browser`,
      mediaFiles: []
    }]
  },
  'section-3-3': {
    steps: [{
      content: `Percorso: Menu principale → Marketing Campaigns

Creare una campagna
1. Clicca su "+ Nuova Campagna"
2. Inserisci:
   - Nome della campagna
   - Tipo di campagna (Promozionale, Informativa, Evento)
   - Oggetto e messaggio personalizzato
3. Usa l'AI Assistant per generare testi accattivanti automaticamente
4. Seleziona i destinatari (tutti i clienti, solo attivi, segmento personalizzato)
5. Scegli il canale di invio: Email, WhatsApp o entrambi
6. Programma l'invio (immediato o schedulato)

Funzionalità AI
- Generazione testi: L'AI crea messaggi persuasivi basati sul tipo di campagna
- Personalizzazione: Inserisce automaticamente nome cliente e dettagli personalizzati
- Ottimizzazione orari: Suggerisce gli orari migliori per l'invio
- A/B Testing: Testa diverse versioni del messaggio

Link promozionali pubblici
Ogni campagna genera un link unico pubblico con:
- Pagina web dedicata con il messaggio della campagna
- Media allegati (immagini, video) incorporati
- Pulsante di contatto diretto
- Tracking automatico delle visualizzazioni

Ideale per superare i limiti di WhatsApp sugli allegati!

Monitorare i risultati
- Tasso di apertura email
- Click sui link
- Conversioni (appuntamenti prenotati dalla campagna)
- ROI della campagna`,
      mediaFiles: []
    }]
  },
  'section-3-4': {
    steps: [{
      content: `Percorso: Menu principale → WhatsApp Center

Configurazione iniziale
1. Vai al WhatsApp Center
2. Scansiona il QR code con WhatsApp Web dal tuo telefono
3. Autorizza la connessione
4. Il sistema sarà collegato al tuo numero WhatsApp Business

Funzionalità disponibili
- Invio messaggi automatici: Promemoria appuntamenti, conferme
- Messaggi di massa: Invia campagne a liste di clienti
- Template messaggi: Crea modelli predefiniti per risposte rapide
- Allegati: Invia documenti, fatture, immagini
- Tracking: Monitora messaggi letti e consegnati

Best practices
- Chiedi sempre il consenso prima di inviare messaggi promozionali
- Personalizza i messaggi con il nome del cliente
- Evita di inviare troppi messaggi (rischio blocco WhatsApp)
- Usa orari appropriati (9:00-20:00)`,
      mediaFiles: []
    }]
  },
  'section-3-5': {
    steps: [{
      content: `Percorso: Menu principale → Referral

Come funziona il programma referral
Guadagna commissioni invitando nuovi utenti:
- 25% di commissione su ogni abbonamento venduto
- Pagamento una tantum per piani annuali
- Pagamento ricorrente per piani mensili (ogni mese)
- Commissioni visualizzate nella valuta selezionata

Il tuo link referral
1. Vai alla pagina Referral
2. Copia il tuo link personale unico
3. Condividi il link con:
   - Colleghi medici
   - Amici professionisti
   - Social media
   - Newsletter
4. Quando qualcuno si iscrive tramite il tuo link, ricevi la commissione

Monitorare le commissioni
- Dashboard Referral: Visualizza statistiche in tempo reale
- Click sul link: Quante persone hanno cliccato
- Conversioni: Quanti si sono iscritti
- Commissioni maturate: Totale guadagnato
- Commissioni pagate: Cronologia pagamenti ricevuti
- Commissioni in sospeso: In attesa di pagamento

Modalità di pagamento
Le commissioni vengono pagate:
- Mensilmente per le commissioni ricorrenti
- Entro 30 giorni dalla sottoscrizione per i piani annuali
- Tramite bonifico bancario o PayPal
- Soglia minima di prelievo: importo configurabile`,
      mediaFiles: []
    }]
  },
  'section-4-1': {
    steps: [{
      content: `Due modalità di accesso:

Opzione 1: QR Code (Consigliato)
1. Dalla scheda cliente, genera il QR code personale
2. Stampa il QR code o mostralo sullo schermo
3. Il cliente scansiona il codice con la fotocamera dello smartphone
4. Si apre automaticamente la sua area riservata
5. Il cliente può salvare l'app sulla home screen del telefono

Opzione 2: Link diretto
1. Copia il link personale del cliente
2. Invialo via email, WhatsApp o SMS
3. Il cliente clicca sul link e accede all'area riservata`,
      mediaFiles: []
    }]
  },
  'section-4-2': {
    steps: [{
      content: `Funzionalità disponibili ai clienti:

- Visualizzare appuntamenti:
  Vedere tutti gli appuntamenti passati e futuri con date, orari e servizi

- Scaricare fatture:
  Accedere a tutte le fatture in formato PDF

- Visualizzare documenti medici:
  Consultare referti, prescrizioni e documenti sanitari caricati

- Dati personali:
  Visualizzare i propri dati anagrafici e informazioni di contatto

- Contatti:
  Vedere i contatti della pratica (telefono, email, indirizzo)`,
      mediaFiles: []
    }]
  },
  'section-4-3': {
    steps: [{
      content: `Su iPhone (Safari)
1. Apri l'area cliente tramite QR code o link
2. Tocca il pulsante "Condividi" (quadrato con freccia)
3. Scorri e seleziona "Aggiungi a Home"
4. Conferma il nome dell'app
5. L'icona apparirà sulla home screen come un'app normale

Su Android (Chrome)
1. Apri l'area cliente tramite QR code o link
2. Tocca il menu (tre puntini in alto a destra)
3. Seleziona "Aggiungi a schermata Home" o "Installa app"
4. Conferma l'installazione
5. L'app sarà disponibile come tutte le altre app`,
      mediaFiles: []
    }]
  },
  'section-4-4': {
    steps: [{
      content: `L'area cliente riflette automaticamente il tuo brand:

- Logo/Icona: Il logo caricato nelle Impostazioni → Aspetto
- Colori: I colori primario e secondario del tuo brand
- Nome azienda: Appare nell'header dell'app
- Contatti: Footer con tutte le info di contatto`,
      mediaFiles: []
    }]
  }
};
