import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients as clientsTable, invoices as invoicesTable, services as servicesTable, appointments as appointmentsTable } from '../../shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { getCurrencyForUser } from '../currencyHelper';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

  // === AREA CLIENTI - ROTTE PER QR CODE ACCESS ===
  
  // Validazione token QR - AGGIORNATA PER POSTGRESQL
  async function validateQRToken(clientCode: string, token: string) {
    // 🔄 USA POSTGRESQL: Cerca cliente per uniqueCode nel database condiviso
    const clientResults = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.uniqueCode, clientCode))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      logger.debug(`🔍 [QR-AUTH] Cliente non trovato per codice: ${clientCode}`);
      return null;
    }
    
    const client = clientResults[0];
    
    // Verifica che il token sia valido
    const expectedTokenPrefix = `${clientCode}_`;
    if (!token.startsWith(expectedTokenPrefix)) {
      logger.debug(`🔍 [QR-AUTH] Token non valido per cliente ${clientCode}: ${token}`);
      return null;
    }
    
    // Estrai legacy client ID dal uniqueCode (formato: PROF_014_9C1F_CLIENT_14003_816C)
    let legacyClientId: number | null = null;
    const legacyIdMatch = clientCode.match(/_CLIENT_(\d+)_/);
    if (legacyIdMatch) {
      legacyClientId = parseInt(legacyIdMatch[1]);
    }
    
    logger.debug(`✅ [QR-AUTH] Token valido per cliente ${client.firstName} ${client.lastName} (${clientCode}), legacyId: ${legacyClientId}`);
    return { clientId: client.id, client, legacyClientId };
  }

  // API: Recupera dati cliente tramite QR code
router.get('/api/simple/client/:clientCode', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      logger.debug(`🔍 [CLIENT-API] Richiesta dati per cliente: ${clientCode}, token: ${token ? 'presente' : 'assente'}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client } = validation;
      
      // Restituisci solo i dati necessari del cliente
      const clientData = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        uniqueCode: client.uniqueCode
      };
      
      logger.debug(`✅ [CLIENT-API] Dati cliente inviati: ${client.firstName} ${client.lastName}`);
      res.json(clientData);
      
    } catch (error) {
      console.error('❌ [CLIENT-API] Errore nel recupero dati cliente:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Recupera appuntamenti cliente tramite QR code
router.get('/api/simple/client/:clientCode/appointments', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { clientId, client } = validation;
      
      // 📊 TRACKING AUTOMATICO: Registra l'accesso solo se non già tracciato negli ultimi 2 minuti
      // Usa un lock in memoria per prevenire race condition dalle chiamate parallele
      try {
        const now = Date.now();
        const lastAccessTime = clientAccessLocks.get(clientId) || 0;
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (now - lastAccessTime > twoMinutesInMs) {
          // Imposta il lock PRIMA di fare qualsiasi operazione
          clientAccessLocks.set(clientId, now);
          
          const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
          const userAgent = req.headers['user-agent'] || 'unknown';
          await db.insert(clientAccesses).values({
            clientId: clientId,
            accessTime: new Date(),
            ipAddress: ip,
            userAgent: userAgent.substring(0, 500)
          });
          logger.debug(`📊 [AUTO-TRACKING] Accesso registrato per cliente ${clientId} (${client.firstName} ${client.lastName})`);
        } else {
          logger.debug(`📊 [AUTO-TRACKING] Accesso già registrato negli ultimi 2 min per cliente ${clientId}, skip (lock in memoria)`);
        }
      } catch (trackError) {
        console.error(`⚠️ [AUTO-TRACKING] Errore tracking (non bloccante):`, trackError);
      }
      
      // 🔄 USA POSTGRESQL: Recupera appuntamenti del cliente dal database
      const clientAppointments = await storage.getAppointmentsByClient(clientId);
      
      // 🔄 USA POSTGRESQL: Recupera servizi del proprietario
      const ownerId = client.ownerId;
      const ownerServices = ownerId ? await storage.getServices(ownerId) : [];
      
      // Mappa gli appuntamenti con i nomi dei servizi
      const mappedAppointments = clientAppointments.map(apt => {
        const service = ownerServices.find(s => s.id === apt.serviceId);
        return {
          id: apt.id,
          date: apt.date,
          time: apt.startTime, // startTime è il campo PostgreSQL
          service: service?.name || 'Servizio sconosciuto',
          status: apt.status || 'scheduled',
          notes: apt.notes || ''
        };
      });
      
      console.log(`📅 [CLIENT-API] ${mappedAppointments.length} appuntamenti trovati per cliente ${clientCode}`);
      res.json(mappedAppointments);
      
    } catch (error) {
      console.error('❌ [CLIENT-API] Errore nel recupero appuntamenti:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Recupera informazioni di contatto del professionista
router.get('/api/simple/client/:clientCode/contact-info', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client } = validation;
      
      // 🔄 USA POSTGRESQL: Recupera info contatto del proprietario
      const ownerId = client.ownerId;
      const contactInfo = ownerId ? await storage.getContactInfo(ownerId) : {};
      
      logger.debug(`📞 [CLIENT-API] Info contatto inviate per proprietario ${ownerId}`);
      res.json(contactInfo);
      
    } catch (error) {
      console.error('❌ [CLIENT-API] Errore nel recupero info contatto:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Recupera fatture del cliente
router.get('/api/simple/client/:clientCode/invoices', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      logger.debug(`📄 [CLIENT-INVOICES] Richiesta fatture per cliente: ${clientCode}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client, legacyClientId } = validation;
      
      // Query PostgreSQL con filtro multi-tenant sicuro + OR match su legacy ID
      const allClientInvoices = await db
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          totalAmount: invoicesTable.totalAmount,
          tax: invoicesTable.tax,
          date: invoicesTable.date,
          dueDate: invoicesTable.dueDate,
          status: invoicesTable.status,
          notes: invoicesTable.notes,
          createdAt: invoices.createdAt,
          publishedToPwa: invoicesTable.publishedToPwa
        })
        .from(invoicesTable)
        .where(and(
          or(
            eq(invoicesTable.clientId, client.id),
            legacyClientId ? eq(invoicesTable.clientId, legacyClientId) : eq(invoicesTable.clientId, -1)
          ),
          eq(invoicesTable.userId, client.userId) // Multi-tenant isolation
        ))
        .orderBy(desc(invoicesTable.date));
      
      // FILTRO: Solo fatture con flag publishedToPwa attivo (PostgreSQL)
      const sentInvoices = allClientInvoices.filter(inv => {
        const isPublished = inv.publishedToPwa === true;
        logger.debug(`🔍 [PWA-FILTER] Fattura ${inv.id} (${inv.invoiceNumber}): publishedToPwa=${inv.publishedToPwa}, result=${isPublished}`);
        return isPublished;
      });
      
      // Gli importi sono già in euro (non centesimi), non serve divisione
      const formattedInvoices = sentInvoices.map(inv => ({
        ...inv,
        totalAmount: inv.totalAmount,
        tax: inv.tax || 0
      }));
      
      logger.debug(`✅ [CLIENT-INVOICES] ${formattedInvoices.length}/${allClientInvoices.length} fatture inviate trovate per cliente ${clientCode}`);
      res.json(formattedInvoices);
      
    } catch (error) {
      console.error('❌ [CLIENT-INVOICES] Errore nel recupero fatture:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Download PDF fattura del cliente
router.get('/api/simple/client/:clientCode/invoices/:invoiceId/pdf', async (req, res) => {
    try {
      const { clientCode, invoiceId } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      console.log(`📥 [CLIENT-INVOICE-PDF] Richiesta PDF fattura ${invoiceId} per cliente ${clientCode}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client, legacyClientId } = validation;
      
      // Verifica che la fattura appartenga al cliente e al suo proprietario (multi-tenant)
      const invoice = await db
        .select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, parseInt(invoiceId)),
          or(
            eq(invoicesTable.clientId, client.id),
            legacyClientId ? eq(invoicesTable.clientId, legacyClientId) : eq(invoicesTable.clientId, -1)
          ),
          eq(invoicesTable.userId, client.userId)
        ))
        .limit(1);
      
      // SECURITY CHECK: Verifica che la fattura sia stata pubblicata sulla PWA (PostgreSQL)
      if (!invoice[0] || invoice[0].publishedToPwa !== true) {
        console.error(`❌ [CLIENT-INVOICE-PDF] Fattura ${invoiceId} non pubblicata sulla PWA (publishedToPwa: ${invoice[0]?.publishedToPwa})`);
        return res.status(403).json({ error: 'Fattura non disponibile' });
      }
      
      if (!invoice || invoice.length === 0) {
        console.error(`❌ [CLIENT-INVOICE-PDF] Fattura ${invoiceId} non trovata o non autorizzata per cliente ${clientCode}`);
        return res.status(404).json({ error: 'Fattura non trovata' });
      }
      
      logger.debug(`✅ [CLIENT-INVOICE-PDF] Fattura ${invoice[0].invoiceNumber} validata per cliente ${clientCode}`);
      
      const invoiceData = invoice[0];
      
      // Query invoice items from PostgreSQL
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceData.id));
      
      // Carica logo personalizzato
      const { loadUserLogo, buildInvoiceHtml, generatePdfBuffer } = await import('./utils/invoicePdf');
      const logoBase64 = await loadUserLogo(client.userId);
      
      // Carica dati aziendali
      let businessHeader = 'Gestionale Appuntamenti';
      let businessData = {
        companyName: '',
        address: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        fiscalCode: '',
        phone: '',
        email: ''
      };
      
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[client.userId];
        const userBusinessData = currentStorageData.userBusinessData?.[client.userId];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
      } catch (error) {
        console.log('⚠️ [PDF PWA] Errore caricamento dati aziendali:', error);
      }
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, client.userId);
      const currencySymbol = userCurrency.symbol;
      
      // Costruisci context per il template
      const context = {
        invoiceNumber: invoiceData.invoiceNumber,
        date: new Date(invoiceData.date).toLocaleDateString('it-IT'),
        dueDate: new Date(invoiceData.dueDate).toLocaleDateString('it-IT'),
        status: invoiceData.status,
        totalAmount: invoiceData.totalAmount,
        tax: invoiceData.tax || 0,
        notes: invoiceData.notes || undefined,
        
        clientName: `${client.firstName} ${client.lastName}`,
        clientAddress: client.address || undefined,
        clientPhone: client.phone || undefined,
        clientEmail: client.email || undefined,
        clientTaxCode: client.tax_code || undefined,
        clientVatNumber: client.vat_number || undefined,
        clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString('it-IT') : undefined,
        
        businessHeader,
        businessAddress: businessData.address || undefined,
        businessCity: businessData.city || undefined,
        businessPostalCode: businessData.postalCode || undefined,
        businessPhone: businessData.phone || undefined,
        businessEmail: businessData.email || undefined,
        businessVatNumber: businessData.vatNumber || undefined,
        businessFiscalCode: businessData.fiscalCode || undefined,
        
        items: items.map(item => ({
          description: item.description || 'Servizio',
          quantity: item.quantity || 1,
          price: item.price || 0,
          total: item.total || 0
        })),
        
        logoBase64,
        currencySymbol
      };
      
      // Genera HTML professionale con logo e grafica
      const htmlContent = buildInvoiceHtml(context);
      
      // Usa Puppeteer per generare PDF vero, con fallback HTML se fallisce
      try {
        const pdfBuffer = await generatePdfBuffer(htmlContent);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Fattura_${invoiceData.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        logger.debug(`✅ [CLIENT-INVOICE-PDF] PDF professionale generato per cliente ${clientCode}`);
      } catch (pdfError) {
        console.error('❌ [CLIENT-INVOICE-PDF] Errore Puppeteer, fallback HTML professionale:', pdfError);
        
        // Fallback: invia HTML professionale (stesso template, ma non PDF)
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="Fattura_${invoiceData.invoiceNumber}.html"`);
        res.send(htmlContent);
        
        logger.debug(`📄 [CLIENT-INVOICE-PDF] HTML professionale inviato come fallback per cliente ${clientCode}`);
      }
      
    } catch (error) {
      console.error('❌ [CLIENT-INVOICE-PDF] Errore nel download PDF:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API per sbloccare la cancellazione di clienti importati eliminati alla fonte
router.post('/api/unlock-client-deletion/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      logger.debug(`🔓 [/api/unlock-client-deletion] Admin ${user.id} richiede sblocco per cliente ${clientId}`);
      
      // Solo admin possono sbloccare cancellazioni
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo gli amministratori possono sbloccare le cancellazioni' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verifica che sia un cliente importato
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Solo i clienti importati possono essere sbloccati' 
        });
      }
      
      // Sblocca la cancellazione
      client.deletionUnlocked = true;
      saveStorageData(storageData);
      
      logger.debug(`✅ [SBLOCCO] Cliente ${client.firstName} ${client.lastName} (${clientId}) sbloccato per cancellazione dall'admin ${user.id}`);
      
      res.json({
        success: true,
        message: 'Cancellazione sbloccata con successo',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletionUnlocked: true
        }
      });
      
    } catch (error) {
      console.error('❌ [ERRORE SBLOCCO]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante lo sblocco della cancellazione' 
      });
    }
  });

  // API per simulare eliminazione dal sistema originale (per test)
router.post('/api/mark-client-deleted-at-source/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      logger.debug(`⚠️ [/api/mark-client-deleted-at-source] Admin ${user.id} marca cliente ${clientId} come eliminato alla fonte`);
      
      // Solo admin possono simulare eliminazioni
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo gli amministratori possono simulare eliminazioni' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verifica che sia un cliente importato
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Solo i clienti importati possono essere marcati come eliminati alla fonte' 
        });
      }
      
      // Marca come eliminato alla fonte
      client.deletedAtSource = true;
      saveStorageData(storageData);
      
      console.log(`🚨 [NOTIFICA ELIMINAZIONE] Cliente ${client.firstName} ${client.lastName} (${clientId}) eliminato alla fonte - notifica admin`);
      
      res.json({
        success: true,
        message: 'Cliente marcato come eliminato alla fonte',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletedAtSource: true
        }
      });
      
    } catch (error) {
      console.error('❌ [ERRORE NOTIFICA ELIMINAZIONE]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante la notifica di eliminazione' 
      });
    }
  });

export default router;
