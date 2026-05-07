// @ts-nocheck
import { Router } from 'express';
import { db } from '../db';
import { manualContent, users } from '../../shared/schema';
import { eq, and, asc } from 'drizzle-orm';
import multer from 'multer';
import { fileStorageService } from '../services/fileStorageService';

const router = Router();

// Cache per the tenant condiviso del manuale
let sharedManualTenantId: number | null = null;

// Helper per risolvere tenantId condiviso per il manuale
// IMPORTANT: The manual is shared among ALL accounts of the same practice
// (admin, staff, customer) - usano all lo stesso tenantId
async function getTenantId(user: any): Promise<number> {
  // If abbiamo already the tenantId cached, ritornalo
  if (sharedManualTenantId !== null) {
    return sharedManualTenantId;
  }

  try {
    // Find the first admin in the database (ordered by ID)
    const [firstAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.type, 'admin'))
      .orderBy(asc(users.id))
      .limit(1);

    if (firstAdmin) {
      sharedManualTenantId = firstAdmin.id;
      console.log(`📚 [MANUAL-TENANT] TenantId condiviso per manual: ${sharedManualTenantId}`);
      return sharedManualTenantId;
    }

    // Fallback: If there are admins, use the current user's ID
    console.warn(`⚠️ [MANUAL-TENANT] No admin found, using user.id: ${user.id}`);
    sharedManualTenantId = user.id;
    return sharedManualTenantId;
  } catch (error: any) {
    console.error('❌ [MANUAL-TENANT] Error retrieving tenantId:', error);
    // Fallback sicuro
    return user.id;
  }
}

// Template predefiniti per auto-provisioning sezioni manuale
const MANUAL_TEMPLATES: Record<string, { title: string; content: string }> = {
  'section-1-1': {
    title: 'Primo Accesso al Sistema',
    content: `Video Tutorial: Come accedere per la prima volta

Procedura di Accesso:
1. Apri il browser e vai all'indirizzo fornito dal tuo amministratore
2. Inserisci le credenziali di accesso (username e password)
3. Al primo accesso, ti verrà mostrato questo manuale automaticamente
4. Puoi accedere nuovamente al manuale in qualsiasi momento dal menu Impostazioni

💡 Suggerimento: Aggiungi il sito ai preferiti del browser per un accesso rapido!`
  },
  'section-1-2': {
    title: 'Configurare i Dati Aziendali',
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
- Tema: Scegli tra tema chiaro o scuro`
  },
  'section-1-3': {
    title: 'Configurare i Dati Bancari',
    content: `Percorso: Menu principale → Banking Settings

I dati bancari sono necessari per ricevere pagamenti e appariranno sulle fatture:

- Nome Banca: Il nome del tuo istituto bancario
- IBAN: Codice IBAN del conto corrente
- BIC/SWIFT: Codice internazionale della banca (per bonifici esteri)
- Intestatario: Nome dell'intestatario del conto`
  },
  'section-1-4': {
    title: 'Gestire Staff e Stanze di Trattamento',
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
3. Associa la stanza ai servizi specifici (opzionale)`
  },
  'section-1-5': {
    title: 'Configurare le Email Automatiche',
    content: `Percorso: Impostazioni → Tab "Email"

Configura l'invio automatico di email per notifiche e promemoria:

• Server SMTP: Indirizzo del server email (es. smtp.gmail.com)
• Port: Di solito 587 o 465
• Username: Il tuo indirizzo email
• Password: Password dell'account email (usa password applicazione per Gmail)
• Email mittente: L'indirizzo che apparirà come mittente

Cosa verranno inviate le email:
• Conferme di appuntamenti
• Promemoria automatici prima degli appuntamenti
• Invio fatture ai clienti
• Campagne di marketing personalizzate`
  },
  'section-2-1': {
    title: 'Gestione Clienti',
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
4. Oppure puoi stampare il QR code e consegnarlo al cliente`
  },
  'section-2-2': {
    title: 'Calendario e Appuntamenti',
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
- Tramite Email e/o WhatsApp (se configurati)`
  },
  'section-2-3': {
    title: 'Richieste Appuntamento PWA Cliente',
    content: 'Questa sezione usa contenuti dinamici multi-lingua. Consulta la pagina pubblica del manuale per i dettagli.'
  },
  'section-2-4': {
    title: 'Gestione Fatture',
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
- Draft: Fattura non ancora inviata
- Sent: Fattura inviata ma non pagata
- Pagata: Pagamento ricevuto
- Overdue: Fattura non pagata oltre la scadenza

Dati visualizzati nella fattura
- Dati aziendali e logo (dalle Impostazioni)
- Dati cliente
- Numero progressivo fattura
- Data emissione e scadenza
- Dettaglio servizi con prezzi nella valuta selezionata
- Dati bancari per il pagamento`
  },
  'section-3-1': {
    title: 'Gestione Inventario e Magazzino',
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
4. L'immagine verrà ridimensionata automaticamente`
  },
  'section-3-2': {
    title: 'Report e Statistiche',
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
- Stampa report direttamente dal browser`
  },
  'section-3-3': {
    title: 'Campagne Marketing con AI',
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
- ROI della campagna`
  },
  'section-3-4': {
    title: 'Centro WhatsApp',
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
- Usa orari appropriati (9:00-20:00)`
  },
  'section-3-5': {
    title: 'Sistema Referral e Commissioni',
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
- Soglia minima di prelievo: importo configurabile`
  },
  'section-4-1': {
    title: 'Come i Clienti Accedono alla Loro Area',
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
3. Il cliente clicca sul link e accede all'area riservata`
  },
  'section-4-2': {
    title: 'Cosa Possono Fare i Clienti nell\'Area Riservata',
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
  Vedere i contatti della pratica (telefono, email, indirizzo)`
  },
  'section-4-3': {
    title: 'Come Installare l\'App sul Telefono (PWA)',
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
5. L'app sarà disponibile come tutte le altre app`
  },
  'section-4-4': {
    title: 'Customize the Appearance of the Client Area',
    content: `L'area cliente riflette automaticamente il tuo brand:

- Logo/Icona: Il logo caricato nelle Impostazioni → Aspetto
- Colori: I colori primario e secondario del tuo brand
- Nome azienda: Appare nell'header dell'app
- Contatti: Footer con tutte le info di contatto`
  },
  'section-5-1': {
    title: 'Impostazioni',
    content: 'Personalizza le impostazioni avanzate del sistema.'
  },
  'section-6-1': {
    title: 'Funzioni Avanzate',
    content: 'Scopri le funzionalità avanzate del gestionale.'
  }
};

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (DB storage, non filesystem)
  fileFilter: (_req, file, cb) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
    ];
    
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa immagini (JPG, PNG, GIF, WEBP) o video (MP4, WEBM, MOV, AVI)'));
    }
  }
});

router.post('/api/manual/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        error: 'Permission denied: only administrators can modify the manual' 
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';

    const saved = await fileStorageService.saveFile(
      req.user.id,
      'manual',
      { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size }
    );

    return res.json({
      success: true,
      file: {
        url: saved.url,
        type: fileType,
        filename: file.originalname,
        size: file.size
      }
    });
  } catch (error: any) {
    console.error('❌ Error uploading manual file:', error);
    return res.status(500).json({ 
      error: 'Error uploading file' 
    });
  }
});

// GET: Get contenuto manuale per sezione e locale
router.get('/api/manual/content/:section/:locale', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { section, locale } = req.params;

    const tenantId = await getTenantId(req.user);
    
    const content = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.ownerId, tenantId),
          eq(manualContent.section, section),
          eq(manualContent.locale, locale)
        )
      )
      .limit(1);

    if (content.length === 0) {
      // AUTO-PROVISIONING: Create section from template if it exists
      // ⚠️ PERMISSIONS: Only admin can create new sections
      if (req.user.type !== 'admin') {
        // For professionals, return empty template without saving to DB
        const template = MANUAL_TEMPLATES[section];
        return res.json({
          id: null,
          userId: req.user.id,
          ownerId: tenantId,
          section: section,
          locale: locale,
          title: template?.title || '',
          steps: template ? [{
            stepNumber: 1,
            title: template.title,
            content: template.content,
            mediaFiles: []
          }] : []
        });
      }

      const template = MANUAL_TEMPLATES[section];
      
      if (!template) {
        // Template not found, restituisci placeholder vuoto
        return res.json({
          id: null,
          userId: req.user.id,
          section: section,
          locale: locale,
          title: '',
          steps: []
        });
      }
      
      // Create step con didascalia dal template
      const steps = [{
        stepNumber: 1,
        title: template.title,
        content: template.content,
        mediaFiles: []
      }];
      
      // Save to database (auto-provisioning ONLY for admins)
      const now = new Date();
      const [newSection] = await db
        .insert(manualContent)
        .values({
          userId: req.user.id,
          ownerId: tenantId,
          section: section,
          locale: locale,
          title: template.title,
          steps: steps, // Drizzle gestisce automaticamente la serializzazione JSON
          createdAt: now,
          updatedAt: now
        })
        .returning({
          id: manualContent.id,
          userId: manualContent.userId,
          ownerId: manualContent.ownerId,
          section: manualContent.section,
          locale: manualContent.locale,
          title: manualContent.title,
          steps: manualContent.steps,
          createdAt: manualContent.createdAt,
          updatedAt: manualContent.updatedAt
        });
      
      console.log(`✨ Auto-provisioning section ${section}/${locale} for ADMIN ${req.user.id}`);
      console.log(`✅ Record created with ID:`, newSection.id);
      
      return res.json(newSection);
    }

    return res.json(content[0]);
  } catch (error: any) {
    console.error('❌ Error retrieving manual content:', error);
    return res.status(500).json({ 
      error: 'Error retrieving content' 
    });
  }
});

// GET: Get all sections for a locale
router.get('/api/manual/sections/:locale', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { locale } = req.params;
    const tenantId = await getTenantId(req.user);

    const sections = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.ownerId, tenantId),
          eq(manualContent.locale, locale)
        )
      )
      .orderBy(manualContent.section);

    return res.json(sections);
  } catch (error: any) {
    console.error('❌ Error retrieving manual sections:', error);
    return res.status(500).json({ 
      error: 'Error retrieving sections' 
    });
  }
});

// POST: Create o aggiorna contenuto manuale (UPSERT - SOLO ADMIN)
router.post('/api/manual/content', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // ⚠️ PERMISSIONS: Only admin can create/modify manual content
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        error: 'Permission denied: only administrators can modify the manual' 
      });
    }

    const { section, locale, title, steps } = req.body;
    const tenantId = await getTenantId(req.user);

    if (!section || !locale || !title || !steps) {
      return res.status(400).json({ 
        error: 'Required fields: section, locale, title, steps' 
      });
    }

    // Check if esiste already
    const existing = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.ownerId, tenantId),
          eq(manualContent.section, section),
          eq(manualContent.locale, locale)
        )
      )
      .limit(1);

    let result;

    if (existing.length > 0) {
      // UPDATE: contenuto esistente
      const [updated] = await db
        .update(manualContent)
        .set({
          title,
          steps: steps, // Drizzle gestisce JSON automaticamente
          updatedAt: new Date()
        })
        .where(
          and(
            eq(manualContent.ownerId, tenantId),
            eq(manualContent.section, section),
            eq(manualContent.locale, locale)
          )
        )
        .returning();

      result = updated;
      console.log(`✅ Contenuto manual updated: section ${section}, locale ${locale}, tenantId: ${tenantId}`);
    } else {
      // INSERT: new content
      const [created] = await db.insert(manualContent).values({
        userId: req.user.id,
        ownerId: tenantId,
        section,
        locale,
        title,
        steps: steps, // Drizzle gestisce JSON automaticamente
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      result = created;
      console.log(`✅ Contenuto manual created: section ${section}, locale ${locale}, tenantId: ${tenantId}`);
    }

    return res.json({
      success: true,
      content: result
    });
  } catch (error: any) {
    console.error('❌ Error saving manual content:', error);
    return res.status(500).json({ 
      error: 'Error saving content' 
    });
  }
});

// PUT: Update contenuto manuale esistente (SOLO ADMIN)
router.put('/api/manual/content/:id', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // ⚠️ PERMISSIONS: Only admin can modify manual content
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        error: 'Permission denied: only administrators can modify the manual' 
      });
    }

    const { id } = req.params;
    const { title, steps } = req.body;
    const tenantId = await getTenantId(req.user);

    if (!title && !steps) {
      return res.status(400).json({ 
        error: 'Fornire almeno un campo da aggiornare: title o steps' 
      });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (steps) updateData.steps = steps; // Drizzle gestisce JSON automaticamente

    const [updated] = await db
      .update(manualContent)
      .set(updateData)
      .where(
        and(
          eq(manualContent.id, parseInt(id)),
          eq(manualContent.ownerId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ 
        error: 'Content not found or insufficient permissions' 
      });
    }

    console.log(`✅ Manual content updated: ID ${id}`);

    return res.json({
      success: true,
      content: updated
    });
  } catch (error: any) {
    console.error('❌ Error updating manual content:', error);
    return res.status(500).json({ 
      error: 'Error updating content' 
    });
  }
});

// DELETE: Delete contenuto manuale (SOLO ADMIN)
router.delete('/api/manual/content/:id', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // ⚠️ PERMISSIONS: Only admin can delete manual content
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        error: 'Permission denied: only administrators can modify the manual' 
      });
    }

    const { id } = req.params;
    const tenantId = await getTenantId(req.user);

    // Retrieve il contenuto per eliminare i file associati
    const [content] = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.id, parseInt(id)),
          eq(manualContent.ownerId, tenantId)
        )
      )
      .limit(1);

    if (!content) {
      return res.status(404).json({ 
        error: 'Content not found or insufficient permissions' 
      });
    }

    try {
      const steps = JSON.parse(content.steps as string);
      for (const step of steps) {
        if (step.mediaFiles && Array.isArray(step.mediaFiles)) {
          for (const media of step.mediaFiles) {
            if (media.url) {
              const fileIdMatch = media.url.match(/\/api\/files\/(\d+)\//);
              if (fileIdMatch) {
                await fileStorageService.deleteFile(parseInt(fileIdMatch[1]));
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Error deleting associated files:', err);
    }

    // Delete the record dal database
    await db
      .delete(manualContent)
      .where(
        and(
          eq(manualContent.id, parseInt(id)),
          eq(manualContent.ownerId, tenantId)
        )
      );

    console.log(`✅ Contenuto manual deleted: ID ${id}`);

    return res.json({
      success: true,
      message: 'Contenuto deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting manual content:', error);
    return res.status(500).json({ 
      error: 'Error deleting content' 
    });
  }
});

// DELETE: Delete singolo file (SOLO ADMIN)
router.delete('/api/manual/file', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // ⚠️ PERMISSIONS: Only admin can delete files from the manual
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        error: 'Permission denied: only administrators can modify the manual' 
      });
    }

    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'URL file invalid' });
    }

    const fileIdMatch = fileUrl.match(/\/api\/files\/(\d+)\//);
    if (fileIdMatch) {
      await fileStorageService.deleteFile(parseInt(fileIdMatch[1]));
    }

    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting file:', error);
    return res.status(500).json({ 
      error: 'Error deleting file' 
    });
  }
});

export default router;
