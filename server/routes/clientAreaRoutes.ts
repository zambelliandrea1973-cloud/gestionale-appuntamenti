// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients as clientsTable, invoices as invoicesTable, invoiceItems, services as servicesTable, appointments as appointmentsTable } from '../../shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { getCurrencyForUser } from '../currencyHelper';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

  // === AREA CLIENTI - ROTTE PER QR CODE ACCESS ===
  
  // QR token validation - UPDATED FOR POSTGRESQL
  async function validateQRToken(clientCode: string, token: string) {
    // 🔄 USE POSTGRESQL: Find client by uniqueCode in the shared database
    const clientResults = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.uniqueCode, clientCode))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      logger.debug(`🔍 [QR-AUTH] Client not found for code: ${clientCode}`);
      return null;
    }
    
    const client = clientResults[0];
    
    // Verify that the token is valid
    const expectedTokenPrefix = `${clientCode}_`;
    if (!token.startsWith(expectedTokenPrefix)) {
      logger.debug(`🔍 [QR-AUTH] Invalid token for client ${clientCode}: ${token}`);
      return null;
    }
    
    // Extract legacy client ID from uniqueCode (format: PROF_014_9C1F_CLIENT_14003_816C)
    let legacyClientId: number | null = null;
    const legacyIdMatch = clientCode.match(/_CLIENT_(\d+)_/);
    if (legacyIdMatch) {
      legacyClientId = parseInt(legacyIdMatch[1]);
    }
    
    logger.debug(`✅ [QR-AUTH] Valid token for client ${client.firstName} ${client.lastName} (${clientCode}), legacyId: ${legacyClientId}`);
    return { clientId: client.id, client, legacyClientId };
  }

  // API: Retrieve client data via QR code
router.get('/api/simple/client/:clientCode', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      logger.debug(`🔍 [CLIENT-API] Data request for client: ${clientCode}, token: ${token ? 'present' : 'absent'}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Invalid token or client not found' });
      }
      
      const { client } = validation;
      
      // Return only the necessary client data
      const clientData = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        uniqueCode: client.uniqueCode
      };
      
      logger.debug(`✅ [CLIENT-API] Client data sent: ${client.firstName} ${client.lastName}`);
      res.json(clientData);
      
    } catch (error: any) {
      console.error('❌ [CLIENT-API] Error retrieving client data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API: Retrieve client appointments via QR code
router.get('/api/simple/client/:clientCode/appointments', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Invalid token or client not found' });
      }
      
      const { clientId, client } = validation;
      
      // 📊 AUTOMATIC TRACKING: Register access only if already tracked in the last 2 minutes
      // Use an in-memory lock to prevent race conditions from parallel calls
      try {
        const now = Date.now();
        const lastAccessTime = clientAccessLocks.get(clientId) || 0;
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (now - lastAccessTime > twoMinutesInMs) {
          // Set the lock BEFORE performing any operation
          clientAccessLocks.set(clientId, now);
          
          const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
          const userAgent = req.headers['user-agent'] || 'unknown';
          await db.insert(clientAccesses).values({
            clientId: clientId,
            accessTime: new Date(),
            ipAddress: ip,
            userAgent: userAgent.substring(0, 500)
          });
          logger.debug(`📊 [AUTO-TRACKING] Access registered for client ${clientId} (${client.firstName} ${client.lastName})`);
        } else {
          logger.debug(`📊 [AUTO-TRACKING] Access already registered in the last 2 min for client ${clientId}, skip (memory lock)`);
        }
      } catch (trackError) {
        console.error(`⚠️ [AUTO-TRACKING] Error tracking (non-blocking):`, trackError);
      }
      
      // 🔄 USE POSTGRESQL: Retrieve client appointments from the database
      const clientAppointments = await storage.getAppointmentsByClient(clientId);
      
      // 🔄 USE POSTGRESQL: Retrieve owner services
      const ownerId = client.ownerId;
      const ownerServices = ownerId ? await storage.getServices(ownerId) : [];
      
      // Map appointments with service names
      const mappedAppointments = clientAppointments.map(apt => {
        const service = ownerServices.find(s => s.id === apt.serviceId);
        return {
          id: apt.id,
          date: apt.date,
          time: apt.startTime, // startTime is the PostgreSQL field
          service: service?.name || 'Unknown service',
          status: apt.status || 'scheduled',
          notes: apt.notes || ''
        };
      });
      
      console.log(`📅 [CLIENT-API] ${mappedAppointments.length} appointments found for client ${clientCode}`);
      res.json(mappedAppointments);
      
    } catch (error: any) {
      console.error('❌ [CLIENT-API] Error retrieving appointments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API: Retrieve professional contact information
router.get('/api/simple/client/:clientCode/contact-info', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Invalid token or client not found' });
      }
      
      const { client } = validation;
      
      // 🔄 USE POSTGRESQL: Retrieve owner contact info
      const ownerId = client.ownerId;
      const contactInfo = ownerId ? await storage.getContactInfo(ownerId) : {};
      
      logger.debug(`📞 [CLIENT-API] Contact info sent for owner ${ownerId}`);
      res.json(contactInfo);
      
    } catch (error: any) {
      console.error('❌ [CLIENT-API] Error retrieving contact info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API: Retrieve client invoices
router.get('/api/simple/client/:clientCode/invoices', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      logger.debug(`📄 [CLIENT-INVOICES] Invoice request for client: ${clientCode}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Invalid token or client not found' });
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
      
      // FILTER: Only invoices with publishedToPwa flag active (PostgreSQL)
      const sentInvoices = allClientInvoices.filter(inv => {
        const isPublished = inv.publishedToPwa === true;
        logger.debug(`🔍 [PWA-FILTER] invoice ${inv.id} (${inv.invoiceNumber}): publishedToPwa=${inv.publishedToPwa}, result=${isPublished}`);
        return isPublished;
      });
      
      // Amounts are already in euros (not cents), no division needed
      const formattedInvoices = sentInvoices.map(inv => ({
        ...inv,
        totalAmount: inv.totalAmount,
        tax: inv.tax || 0
      }));
      
      logger.debug(`✅ [CLIENT-INVOICES] ${formattedInvoices.length}/${allClientInvoices.length} sent invoices found for client ${clientCode}`);
      res.json(formattedInvoices);
      
    } catch (error: any) {
      console.error('❌ [CLIENT-INVOICES] Error retrieving invoices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API: Download client invoice PDF
router.get('/api/simple/client/:clientCode/invoices/:invoiceId/pdf', async (req, res) => {
    try {
      const { clientCode, invoiceId } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      console.log(`📥 [CLIENT-INVOICE-PDF] PDF invoice request ${invoiceId} for client ${clientCode}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Invalid token or client not found' });
      }
      
      const { client, legacyClientId } = validation;
      
      // Verify that the invoice belongs to the client and their owner (multi-tenant)
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
      
      // SECURITY CHECK: Verify that the invoice has been published on the PWA (PostgreSQL)
      if (!invoice[0] || invoice[0].publishedToPwa !== true) {
        console.error(`❌ [CLIENT-INVOICE-PDF] invoice ${invoiceId} not published to PWA (publishedToPwa: ${invoice[0]?.publishedToPwa})`);
        return res.status(403).json({ error: 'Invoice not available' });
      }
      
      if (!invoice || invoice.length === 0) {
        console.error(`❌ [CLIENT-INVOICE-PDF] invoice ${invoiceId} not found or not authorized for client ${clientCode}`);
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      logger.debug(`✅ [CLIENT-INVOICE-PDF] invoice ${invoice[0].invoiceNumber} validated for client ${clientCode}`);
      
      const invoiceData = invoice[0];
      
      // Query invoice items from PostgreSQL
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceData.id));
      
      // Load logo personalizzato
      const { loadUserLogo, buildInvoiceHtml, generatePdfBuffer } = await import('./utils/invoicePdf');
      const logoBase64 = await loadUserLogo(client.userId);
      
      // Load company data
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
      } catch (error: any) {
        console.log('⚠️ [PDF PWA] Error loading company data:', error);
      }
      
      // Retrieve the user's currency
      const userCurrency = await getCurrencyForUser(storage, client.userId);
      const currencySymbol = userCurrency.symbol;
      
      // Fetch the professional's language preference for locale-aware labels
      const { getUserLanguage: getPwaUserLang } = await import('./utils/userLanguage');
      const { LOCALE_MAP: PWA_LOCALE_MAP } = await import('./utils/emailTranslations');
      const pwaLang = await getPwaUserLang(client.userId);
      const pwaDateLocale = PWA_LOCALE_MAP[pwaLang] ?? 'it-IT';

      // Build context for the template
      const context = {
        invoiceNumber: invoiceData.invoiceNumber,
        date: new Date(invoiceData.date).toLocaleDateString(pwaDateLocale),
        dueDate: new Date(invoiceData.dueDate).toLocaleDateString(pwaDateLocale),
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
        clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString(pwaDateLocale) : undefined,
        
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
        currencySymbol,
        language: pwaLang,
      };
      
      // Generate HTML professionale con logo e grafica
      const htmlContent = buildInvoiceHtml(context);
      
      // Usa Puppeteer per generare PDF vero, con fallback HTML If fallisce
      try {
        const pdfBuffer = await generatePdfBuffer(htmlContent);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Fattura_${invoiceData.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        logger.debug(`✅ [CLIENT-INVOICE-PDF] Professional PDF generated for client ${clientCode}`);
      } catch (pdfError) {
        console.error('❌ [CLIENT-INVOICE-PDF] Puppeteer error, falling back to professional HTML:', pdfError);
        
        // Fallback: send professional HTML (same template, but not PDF)
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="Fattura_${invoiceData.invoiceNumber}.html"`);
        res.send(htmlContent);
        
        logger.debug(`📄 [CLIENT-INVOICE-PDF] Professional HTML sent as fallback for client ${clientCode}`);
      }
      
    } catch (error: any) {
      console.error('❌ [CLIENT-INVOICE-PDF] Error downloading PDF:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API to unblock deletion of imported clients deleted at source
router.post('/api/unlock-client-deletion/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      logger.debug(`🔓 [/api/unlock-client-deletion] Admin ${user.id} requests unblock for client ${clientId}`);
      
      // Only admins can unblock cancellations
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can unblock deletions' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Client not found' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verify that it is an imported client
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Only imported clients can be unblocked' 
        });
      }
      
      // Unlock the deletion
      client.deletionUnlocked = true;
      saveStorageData(storageData);
      
      logger.debug(`✅ [UNBLOCK] Client ${client.firstName} ${client.lastName} (${clientId}) unblocked for deletion by admin ${user.id}`);
      
      res.json({
        success: true,
        message: 'Cancellazione sbloccata successfully',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletionUnlocked: true
        }
      });
      
    } catch (error: any) {
      console.error('❌ [UNBLOCK ERROR]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error unblocking deletion' 
      });
    }
  });

  // API for simulating deletion from the original system (for testing)
router.post('/api/mark-client-deleted-at-source/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      logger.debug(`⚠️ [/api/mark-client-deleted-at-source] Admin ${user.id} marking client ${clientId} as deleted at source`);
      
      // Only admins can simulate deletions
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can simulate deletions' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Client not found' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verify that it is an imported client
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Only imported clients can be marked as deleted at source' 
        });
      }
      
      // Mark as deleted at the source
      client.deletedAtSource = true;
      saveStorageData(storageData);
      
      console.log(`🚨 [notification Deleting] client ${client.firstName} ${client.lastName} (${clientId}) deleted at source - notifying admin`);
      
      res.json({
        success: true,
        message: 'Client marked as deleted at source',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletedAtSource: true
        }
      });
      
    } catch (error: any) {
      console.error('❌ [error notification Deleting]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error sending deletion notification' 
      });
    }
  });

export default router;
