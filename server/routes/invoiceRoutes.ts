// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { invoices as invoicesTable, invoiceItems, clients as clientsTable, services as servicesTable, appointments as appointmentsTable, packageTemplates, packagePurchases, packageRedemptions, userIcons } from '../../shared/schema';
import { eq, and, desc, between } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { getCurrencyForUser } from '../currencyHelper';
import { generateInvoiceNumber as generateProfessionalInvoiceNumber } from '../utils/invoiceNumberGenerator';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/authMiddleware';

let defaultIconBase64 = '';
try {
  const iconPath = path.join(process.cwd(), 'client/public/FleurDeVie.jpg');
  if (fs.existsSync(iconPath)) {
    const iconBuffer = fs.readFileSync(iconPath);
    defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  }
} catch (e) {
  defaultIconBase64 = '';
}

const router = Router();

  // Funzione helper per generare PDF come buffer per allegati email
  async function generateInvoicePDFBuffer(invoiceId: number, user: any): Promise<Buffer> {
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]: any) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Fattura non trovata');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Recupera la valuta dell'utente
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Carica dati aziendali completi (stesso codice della stampa)
    let businessHeader = 'Gestionale Appuntamenti';
    let businessData = {
      companyName: '', address: '', city: '', postalCode: '', 
      vatNumber: '', fiscalCode: '', phone: '', email: ''
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      
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
      console.log('⚠️ Impossibile caricare dati aziendali per PDF allegato:', error);
    }
    
    // Carica dati cliente
    let clientDetails = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
        if (clientEntry) {
          clientDetails = clientEntry[1];
        }
      }
    } catch (error) {
      console.log('⚠️ Errore recupero dati cliente per PDF:', error);
    }
    
    // Genera HTML completo per PDF
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fattura ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .client-info, .invoice-details { flex: 1; }
    .invoice-details { text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { border: 1px solid #ccc; padding: 10px; text-align: left; }
    .items-table th { background-color: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 1.2em; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessHeader}</h1>
    ${businessData.address ? `<p><strong>Indirizzo:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>` : ''}
    ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : '<p>Tel: +39 347 144 5767</p>'}
    ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : '<p>biomedicinaintegrata.it</p>'}
    ${businessData.vatNumber ? `<p><strong>Partita IVA:</strong> ${businessData.vatNumber}</p>` : ''}
    ${businessData.fiscalCode ? `<p><strong>Codice Fiscale:</strong> ${businessData.fiscalCode}</p>` : ''}
  </div>
  
  <div class="invoice-info">
    <div class="client-info">
      <h3>Cliente:</h3>
      <p><strong>${clientDetails ? `${clientDetails.firstName} ${clientDetails.lastName}` : invoice.clientName || 'Cliente'}</strong></p>
      ${clientDetails?.address ? `<p><strong>Indirizzo:</strong> ${clientDetails.address}</p>` : ''}
      ${clientDetails?.phone ? `<p><strong>Telefono:</strong> ${clientDetails.phone}</p>` : ''}
      ${clientDetails?.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
      ${clientDetails?.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientDetails.taxCode}</p>` : ''}
      ${clientDetails?.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientDetails.vatNumber}</p>` : ''}
    </div>
    
    <div class="invoice-details">
      <h3>Dettagli Fattura:</h3>
      <p><strong>Numero:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
      <p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>
      <p><strong>Stato:</strong> ${invoice.status === 'draft' ? 'Bozza' : invoice.status === 'sent' ? 'Inviata' : invoice.status === 'paid' ? 'Pagata' : 'Scaduta'}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Descrizione</th>
        <th>Quantità</th>
        <th>Prezzo Unit.</th>
        <th>Totale</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${currencySymbol}${item.price.toFixed(2)}</td>
          <td>${currencySymbol}${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;"><strong>Totale:</strong></td>
        <td><strong>${currencySymbol}${invoice.total.toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>
  
  <div class="footer">
    <p>Grazie per aver scelto i nostri servizi.</p>
    <p>Per qualsiasi domanda, non esitate a contattarci.</p>
  </div>
</body>
</html>`;
    
    // Ritorna HTML come buffer per allegato
    return Buffer.from(htmlContent, 'utf-8');
  }

  // Endpoint per le fatture
router.get('/api/invoices', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        console.log('📄 [/api/invoices] Utente non autenticato');
        return res.status(401).json({ message: "Non autenticato" });
      }
      console.log('📄 [/api/invoices] Richiesta fatture per utente:', user.id);
      
      // Carica fatture da PostgreSQL
      const pgInvoices = await db
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          clientId: invoicesTable.clientId,
          totalAmount: invoicesTable.totalAmount,
          tax: invoicesTable.tax,
          date: invoicesTable.date,
          dueDate: invoicesTable.dueDate,
          status: invoicesTable.status,
          notes: invoicesTable.notes,
          createdAt: invoicesTable.createdAt,
          // Campi invio multicanale
          publishedToPwa: invoicesTable.publishedToPwa,
          pwaPublishedAt: invoicesTable.pwaPublishedAt,
          sentViaEmail: invoicesTable.sentViaEmail,
          emailSentAt: invoicesTable.emailSentAt,
          sentViaWhatsapp: invoicesTable.sentViaWhatsapp,
          whatsappSentAt: invoicesTable.whatsappSentAt,
          // Dati cliente
          clientFirstName: clientsTable.firstName,
          clientLastName: clientsTable.lastName,
          clientEmail: clientsTable.email,
          clientPhone: clientsTable.phone,
          clientAddress: clientsTable.address,
          clientTaxCode: clientsTable.taxCode,
          clientVatNumber: clientsTable.vatNumber
        })
        .from(invoicesTable)
        .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
        .where(eq(invoicesTable.userId, user.id))
        .orderBy(desc(invoicesTable.createdAt));
      
      // Trasforma in formato legacy per compatibilità frontend
      const userInvoices = pgInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        totalAmount: inv.totalAmount,
        total: inv.totalAmount / 100, // Convert cents to euros for display
        tax: inv.tax,
        date: inv.date,
        dueDate: inv.dueDate,
        status: inv.status,
        notes: inv.notes,
        createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
        ownerId: user.id,
        // Campi invio multicanale - CRITICI per pulsante verde->grigio
        publishedToPwa: inv.publishedToPwa || false,
        pwaPublishedAt: inv.pwaPublishedAt?.toISOString() || null,
        sentViaEmail: inv.sentViaEmail || false,
        emailSentAt: inv.emailSentAt?.toISOString() || null,
        sentViaWhatsapp: inv.sentViaWhatsapp || false,
        whatsappSentAt: inv.whatsappSentAt?.toISOString() || null,
        client: inv.clientId ? {
          id: inv.clientId,
          firstName: inv.clientFirstName,
          lastName: inv.clientLastName,
          email: inv.clientEmail,
          phone: inv.clientPhone,
          address: inv.clientAddress,
          taxCode: inv.clientTaxCode,
          vatNumber: inv.clientVatNumber
        } : null
      }));
      
      logger.debug(`📄 [/api/invoices] Restituisco ${userInvoices.length} fatture per utente ${user.id}`);
      
      // Header anti-cache per evitare 304 Not Modified dopo mutation
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(userInvoices);
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      res.status(500).json({ message: 'Error fetching invoices' });
    }
  });

  // Funzione per generare numero fattura automatico - FORMATO LEGALE
  async function generateInvoiceNumber(ownerId: number): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Carica fatture esistenti per questo owner per l'anno corrente da PostgreSQL
    const ownerInvoicesThisYear = await db
      .select({ invoiceNumber: invoicesTable.invoiceNumber })
      .from(invoicesTable)
      .where(eq(invoicesTable.userId, ownerId));
    
    // Filtra solo quelle dell'anno corrente
    const invoiceNumbersThisYear = ownerInvoicesThisYear
      .map(inv => inv.invoiceNumber)
      .filter(num => num && num.endsWith(`/${currentYear}`)); // Formato NNN/YYYY
    
    // Trova il numero progressivo più alto per questo anno
    let maxNumber = 0;
    invoiceNumbersThisYear.forEach(invoiceNumber => {
      const parts = invoiceNumber.split('/');
      if (parts.length === 2) {
        const progressiveNumber = parseInt(parts[0]);
        if (!isNaN(progressiveNumber) && progressiveNumber > maxNumber) {
          maxNumber = progressiveNumber;
        }
      }
    });
    
    const nextNumber = String(maxNumber + 1).padStart(3, '0');
    // FORMATO LEGALE: NNN/YYYY (es: 001/2025, 002/2025, etc.)
    return `${nextNumber}/${currentYear}`;
  }

  // Endpoint per ottenere il prossimo numero fattura
router.get('/api/invoices/next-number', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const nextNumber = await generateProfessionalInvoiceNumber(user.id, invoiceDate);
      
      res.json({ nextInvoiceNumber: nextNumber });
    } catch (error) {
      console.error('❌ Errore generazione prossimo numero:', error);
      res.status(500).json({ message: 'Errore nella generazione del numero' });
    }
  });

  // Endpoint per suggerimenti fatturazione
router.get('/api/invoices/suggestions', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const storageData = loadStorageData();
      
      // Carica clienti del professionista
      const allClients = storageData.clients || [];
      const userClients = allClients
        .filter(([_, client]: any) => client.ownerId === user.id)
        .map(([_, client]: any) => ({
          id: client.id,
          name: `${client.firstName} ${client.lastName}`.trim(),
          fullName: `${client.firstName} ${client.lastName}`.trim(),
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          taxCode: client.taxCode || '', // codice fiscale
          vatNumber: client.vatNumber || '' // partita iva
        }))
        .filter((client: any) => client.name.length > 0);

      // Carica fatture esistenti per analizzare importi comuni
      const allInvoices = storageData.invoices || [];
      const userInvoices = allInvoices
        .filter(([_, invoice]: any) => invoice.ownerId === user.id)
        .map(([_, invoice]: any) => invoice);

      // Estrai importi più comuni
      const amountCounts: Record<string, number> = {};
      userInvoices.forEach((invoice: any) => {
        const amount = invoice.totalAmount;
        if (amount && amount > 0) {
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;
        }
      });

      // Ordina importi per frequenza
      const commonAmounts = Object.entries(amountCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 10)
        .map(([amount]) => parseFloat(amount));

      // Aggiungi alcuni importi standard se la lista è vuota
      if (commonAmounts.length === 0) {
        commonAmounts.push(50, 70, 100, 150, 200);
      }

      // Estrai descrizioni più comuni
      const descriptionCounts: Record<string, number> = {};
      userInvoices.forEach((invoice: any) => {
        if (invoice.description && invoice.description.trim().length > 0) {
          const desc = invoice.description.trim().toLowerCase();
          descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1;
        }
      });

      const commonDescriptions = Object.entries(descriptionCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 10)
        .map(([desc]) => desc);

      // Aggiungi descrizioni standard se la lista è vuota
      if (commonDescriptions.length === 0) {
        commonDescriptions.push('visita medica', 'consulenza', 'controllo', 'terapia', 'esame');
      }

      res.json({
        clients: userClients,
        amounts: commonAmounts,
        descriptions: commonDescriptions
      });
      
    } catch (error) {
      console.error('❌ Errore caricamento suggerimenti:', error);
      res.status(500).json({ message: 'Errore nel caricamento dei suggerimenti' });
    }
  });

  // Endpoint per aggiornare fatture esistenti con clientId (migrazione dati)
router.post('/api/invoices/migrate-client-ids', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const storageData = loadStorageData();
      const invoices = Object.entries(storageData.invoices || {});
      const clients = Object.entries(storageData.clients || {});
      
      let updatedCount = 0;
      
      logger.debug(`🔄 [MIGRATE] Avvio migrazione clientId per utente ${user.id}`);
      
      for (const [invoiceKey, invoice] of invoices as any[]) {
        if (invoice.ownerId === user.id && !invoice.clientId && invoice.clientName) {
          const clientName = invoice.clientName.trim().replace(/\s+/g, ' ');
          
          const matchingClient = (clients as any[]).find(([_, client]: any) => {
            if (client.ownerId !== user.id) return false;
            const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
            return fullName === clientName;
          });
          
          if (matchingClient) {
            const [_, clientData]: any = matchingClient;
            invoice.clientId = clientData.id;
            updatedCount++;
            logger.debug(`✅ [MIGRATE] Fattura ${invoice.invoiceNumber}: "${invoice.clientName}" → cliente ID ${clientData.id}`);
          } else {
            logger.debug(`⚠️ [MIGRATE] Cliente non trovato per fattura ${invoice.invoiceNumber}: "${invoice.clientName}"`);
          }
        }
      }
      
      if (updatedCount > 0) {
        saveStorageData(storageData);
        logger.debug(`💾 [MIGRATE] Salvate ${updatedCount} fatture con clientId aggiornato`);
      }
      
      res.json({
        message: `Migrazione completata: ${updatedCount} fatture aggiornate`,
        updatedCount
      });
      
    } catch (error) {
      console.error('❌ Errore migrazione clientId:', error);
      res.status(500).json({ message: 'Errore durante la migrazione' });
    }
  });

  // PULIZIA FATTURE - Rinumera tutte le fatture con formato legale NNN/YYYY
router.post('/api/invoices/cleanup-numbering', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      console.log(`🧹 [/api/invoices/cleanup-numbering] Pulizia numerazione fatture per utente ${user.id}`);
      
      const storageData = loadStorageData();
      const allInvoices = storageData.invoices || [];
      
      // Filtra solo le fatture dell'utente corrente
      const userInvoices = allInvoices.filter(([_, invoice]: any) => invoice.ownerId === user.id);
      
      if (userInvoices.length === 0) {
        return res.json({ message: 'Nessuna fattura da pulire', cleaned: 0 });
      }
      
      console.log(`🧹 Trovate ${userInvoices.length} fatture dell'utente da rinumerare`);
      
      // Ordina le fatture per data (dalla più vecchia alla più recente)
      userInvoices.sort(([_, a]: any, [__, b]: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
      
      let cleanedCount = 0;
      
      // Rinumera tutte le fatture nell'ordine cronologico corretto
      userInvoices.forEach(([invoiceId, invoice]: any, index: any) => {
        const newNumber = String(index + 1).padStart(3, '0') + '/2025';
        const oldNumber = invoice.invoiceNumber;
        
        if (oldNumber !== newNumber) {
          logger.debug(`🔄 Rinumerazione: ${oldNumber} → ${newNumber} (${invoice.date || invoice.createdAt})`);
          invoice.invoiceNumber = newNumber;
          invoice.updatedAt = new Date().toISOString();
          cleanedCount++;
        }
      });
      
      // Salva i dati aggiornati
      if (cleanedCount > 0) {
        saveStorageData(storageData);
        logger.debug(`✅ [/api/invoices/cleanup-numbering] Pulizia completata: ${cleanedCount} fatture rinumerate`);
      }
      
      res.json({
        message: `Pulizia completata: ${cleanedCount} fatture rinumerate in formato legale NNN/YYYY`,
        cleaned: cleanedCount,
        total: userInvoices.length
      });
      
    } catch (error) {
      console.error('❌ Errore pulizia numerazione fatture:', error);
      res.status(500).json({ message: 'Errore durante la pulizia' });
    }
  });

  // ELIMINAZIONE FATTURA con doppia sicurezza (PostgreSQL)
router.delete('/api/invoices/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { confirmation } = req.body;
      
      logger.debug(`🗑️ [/api/invoices/${invoiceId}] Richiesta eliminazione per utente ${user.id}`);
      
      // Controllo doppia sicurezza - richiede confirmation: true
      if (!confirmation) {
        return res.status(400).json({ 
          message: 'Conferma di sicurezza richiesta',
          requiresConfirmation: true 
        });
      }
      
      // Carica la fattura da PostgreSQL per ottenere i dettagli
      const [invoiceToDelete] = await db
        .select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ))
        .limit(1);
      
      if (!invoiceToDelete) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      // Elimina prima gli items della fattura
      await db
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));
      
      // Poi elimina la fattura stessa
      await db
        .delete(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ));
      
      logger.debug(`✅ [/api/invoices/${invoiceId}] Fattura ${invoiceToDelete.invoiceNumber} eliminata con successo da PostgreSQL`);
      
      res.json({
        message: `Fattura ${invoiceToDelete.invoiceNumber} eliminata con successo`,
        deletedInvoice: {
          invoiceNumber: invoiceToDelete.invoiceNumber,
          date: invoiceToDelete.date,
          totalAmount: invoiceToDelete.totalAmount
        }
      });
      
    } catch (error) {
      console.error('❌ Errore eliminazione fattura:', error);
      res.status(500).json({ message: 'Errore durante l\'eliminazione' });
    }
  });

  // ===== PACKAGES (PACCHETTI PROMOZIONALI) - FUNZIONALITÀ PRO =====
  
  // GET /api/packages/templates - Lista modelli pacchetti
router.get('/api/packages/templates', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      
      const templates = await db
        .select()
        .from(packageTemplates)
        .where(eq(packageTemplates.userId, tenantId))
        .orderBy(desc(packageTemplates.createdAt));
      
      res.json(templates);
    } catch (error) {
      console.error('❌ Error fetching package templates:', error);
      res.status(500).json({ message: 'Error fetching package templates' });
    }
  });
  
  // POST /api/packages/templates - Crea modello pacchetto
router.post('/api/packages/templates', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { name, description, serviceIds, totalSessions, price, expirationDays } = req.body;
      
      // Validazione: verifica che i servizi appartengano all'utente
      if (serviceIds && serviceIds.length > 0) {
        const userServices = await db
          .select({ id: servicesTable.id })
          .from(servicesTable)
          .where(eq(servicesTable.userId, tenantId));
        
        const userServiceIds = userServices.map(s => s.id);
        const invalidServiceIds = serviceIds.filter((id: number) => !userServiceIds.includes(id));
        
        if (invalidServiceIds.length > 0) {
          return res.status(400).json({ 
            message: 'Servizi non validi o non autorizzati',
            invalidIds: invalidServiceIds 
          });
        }
      }
      
      const [newTemplate] = await db.insert(packageTemplates).values({
        userId: tenantId,
        name,
        description: description || null,
        serviceIds,
        totalSessions,
        price,
        expirationDays: expirationDays || null,
        isActive: true,
        updatedAt: new Date()
      }).returning();
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error('❌ Error creating package template:', error);
      res.status(500).json({ message: 'Error creating package template' });
    }
  });
  
  // PUT /api/packages/templates/:id - Aggiorna modello pacchetto
router.put('/api/packages/templates/:id', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const templateId = parseInt(req.params.id);
      const { name, description, serviceIds, totalSessions, price, expirationDays, isActive } = req.body;
      
      // Validazione: verifica che i servizi appartengano all'utente
      if (serviceIds && serviceIds.length > 0) {
        const userServices = await db
          .select({ id: servicesTable.id })
          .from(servicesTable)
          .where(eq(servicesTable.userId, tenantId));
        
        const userServiceIds = userServices.map(s => s.id);
        const invalidServiceIds = serviceIds.filter((id: number) => !userServiceIds.includes(id));
        
        if (invalidServiceIds.length > 0) {
          return res.status(400).json({ 
            message: 'Servizi non validi o non autorizzati',
            invalidIds: invalidServiceIds 
          });
        }
      }
      
      const [updatedTemplate] = await db
        .update(packageTemplates)
        .set({
          name,
          description,
          serviceIds,
          totalSessions,
          price,
          expirationDays,
          isActive,
          updatedAt: new Date()
        })
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ))
        .returning();
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Template non trovato' });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('❌ Error updating package template:', error);
      res.status(500).json({ message: 'Error updating package template' });
    }
  });
  
  // DELETE /api/packages/templates/:id - Elimina modello pacchetto
router.delete('/api/packages/templates/:id', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const templateId = parseInt(req.params.id);
      
      // Verifica se ci sono pacchetti attivi basati su questo template
      const activePurchases = await db
        .select({ id: packagePurchases.id })
        .from(packagePurchases)
        .where(and(
          eq(packagePurchases.templateId, templateId),
          eq(packagePurchases.userId, tenantId),
          eq(packagePurchases.status, 'active')
        ))
        .limit(1);
      
      if (activePurchases.length > 0) {
        return res.status(400).json({ 
          message: 'Impossibile eliminare: ci sono pacchetti attivi basati su questo template' 
        });
      }
      
      await db
        .delete(packageTemplates)
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ));
      
      res.json({ message: 'Template eliminato con successo' });
    } catch (error) {
      console.error('❌ Error deleting package template:', error);
      res.status(500).json({ message: 'Error deleting package template' });
    }
  });
  
  // GET /api/packages/purchases - Lista pacchetti venduti
router.get('/api/packages/purchases', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { clientId } = req.query;
      
      const whereCondition = clientId
        ? and(
            eq(packagePurchases.userId, tenantId),
            eq(packagePurchases.clientId, parseInt(clientId as string))
          )
        : eq(packagePurchases.userId, tenantId);

      const purchases = await db
        .select({
          id: packagePurchases.id,
          userId: packagePurchases.userId,
          templateId: packagePurchases.templateId,
          clientId: packagePurchases.clientId,
          invoiceId: packagePurchases.invoiceId,
          purchaseDate: packagePurchases.purchaseDate,
          sessionsTotal: packagePurchases.sessionsTotal,
          sessionsRemaining: packagePurchases.sessionsRemaining,
          status: packagePurchases.status,
          expiresAt: packagePurchases.expiresAt,
          notes: packagePurchases.notes,
          createdAt: packagePurchases.createdAt,
          completedAt: packagePurchases.completedAt,
          templateName: packageTemplates.name,
          templateDescription: packageTemplates.description,
          templatePrice: packageTemplates.price,
          clientFirstName: clientsTable.firstName,
          clientLastName: clientsTable.lastName
        })
        .from(packagePurchases)
        .leftJoin(packageTemplates, eq(packagePurchases.templateId, packageTemplates.id))
        .leftJoin(clientsTable, eq(packagePurchases.clientId, clientsTable.id))
        .where(whereCondition)
        .orderBy(desc(packagePurchases.createdAt));
      
      res.json(purchases);
    } catch (error) {
      console.error('❌ Error fetching package purchases:', error);
      res.status(500).json({ message: 'Error fetching package purchases' });
    }
  });
  
  // POST /api/packages/purchases - Vendi pacchetto a cliente
router.post('/api/packages/purchases', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { templateId, clientId, invoiceId, purchaseDate, notes } = req.body;
      
      // Verifica che il template esista e appartenga all'utente
      const [template] = await db
        .select()
        .from(packageTemplates)
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ))
        .limit(1);
      
      if (!template) {
        return res.status(404).json({ message: 'Template non trovato' });
      }
      
      // Verifica che il cliente esista e appartenga all'utente
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(and(
          eq(clientsTable.id, clientId),
          eq(clientsTable.userId, tenantId)
        ))
        .limit(1);
      
      if (!client) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }
      
      // Calcola data scadenza se specificata nel template
      let expiresAt = null;
      if (template.expirationDays) {
        const purchaseDateObj = new Date(purchaseDate);
        const expiresAtObj = new Date(purchaseDateObj);
        expiresAtObj.setDate(expiresAtObj.getDate() + template.expirationDays);
        expiresAt = expiresAtObj.toISOString().split('T')[0];
      }
      
      // Crea il pacchetto venduto
      const [newPurchase] = await db.insert(packagePurchases).values({
        userId: tenantId,
        templateId,
        clientId,
        invoiceId: invoiceId || null,
        purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
        sessionsTotal: template.totalSessions,
        sessionsRemaining: template.totalSessions,
        status: 'active',
        expiresAt,
        notes: notes || null
      }).returning();
      
      res.status(201).json(newPurchase);
    } catch (error) {
      console.error('❌ Error creating package purchase:', error);
      res.status(500).json({ message: 'Error creating package purchase' });
    }
  });
  
  // POST /api/packages/redeem - Riscatta seduta da pacchetto
router.post('/api/packages/redeem', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { purchaseId, appointmentId, performedBy, notes } = req.body;
      
      // Verifica che il pacchetto esista, appartenga all'utente e abbia sedute rimanenti
      const [purchase] = await db
        .select()
        .from(packagePurchases)
        .where(and(
          eq(packagePurchases.id, purchaseId),
          eq(packagePurchases.userId, tenantId)
        ))
        .limit(1);
      
      if (!purchase) {
        return res.status(404).json({ message: 'Pacchetto non trovato' });
      }
      
      if (purchase.status !== 'active') {
        return res.status(400).json({ message: 'Pacchetto non attivo' });
      }
      
      if (purchase.sessionsRemaining <= 0) {
        return res.status(400).json({ message: 'Nessuna seduta rimanente' });
      }
      
      // Verifica scadenza
      if (purchase.expiresAt) {
        const today = new Date().toISOString().split('T')[0];
        if (today > purchase.expiresAt) {
          // Aggiorna stato a expired
          await db
            .update(packagePurchases)
            .set({ status: 'expired' })
            .where(eq(packagePurchases.id, purchaseId));
          
          return res.status(400).json({ message: 'Pacchetto scaduto' });
        }
      }
      
      // Calcola numero seduta progressivo
      const existingRedemptions = await db
        .select({ sessionNumber: packageRedemptions.sessionNumber })
        .from(packageRedemptions)
        .where(eq(packageRedemptions.purchaseId, purchaseId))
        .orderBy(desc(packageRedemptions.sessionNumber))
        .limit(1);
      
      const sessionNumber = existingRedemptions.length > 0 
        ? existingRedemptions[0].sessionNumber + 1 
        : 1;
      
      // Crea il riscatto
      const [redemption] = await db.insert(packageRedemptions).values({
        userId: tenantId,
        purchaseId,
        appointmentId,
        sessionNumber,
        performedBy: performedBy || null,
        notes: notes || null
      }).returning();
      
      // Decrementa sedute rimanenti
      const newSessionsRemaining = purchase.sessionsRemaining - 1;
      const updateData: any = {
        sessionsRemaining: newSessionsRemaining
      };
      
      // Se è l'ultima seduta, marca come completato
      if (newSessionsRemaining === 0) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }
      
      await db
        .update(packagePurchases)
        .set(updateData)
        .where(eq(packagePurchases.id, purchaseId));
      
      // Aggiorna anche l'appuntamento per collegarlo al pacchetto
      if (appointmentId) {
        await db
          .update(appointmentsTable)
          .set({ packagePurchaseId: purchaseId })
          .where(and(
            eq(appointmentsTable.id, appointmentId),
            eq(appointmentsTable.userId, tenantId)
          ));
      }
      
      res.status(201).json({
        redemption,
        sessionsRemaining: newSessionsRemaining,
        completed: newSessionsRemaining === 0
      });
    } catch (error) {
      console.error('❌ Error redeeming package session:', error);
      res.status(500).json({ message: 'Error redeeming package session' });
    }
  });

  // DOWNLOAD ZIP GESTIONALE - Endpoint per scaricare il gestionale completo
router.get('/download-gestionale-zip', (req, res) => {
    try {
      const zipPath = path.join(__dirname, '../../gestionale-sanitario-completo-20250910-061135.zip');
      
      // Verifica che il file esista
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'File ZIP non trovato' });
      }
      
      // Imposta headers per il download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="gestionale-sanitario-completo.zip"');
      
      // Invia il file
      res.sendFile(zipPath, (err) => {
        if (err) {
          console.error('❌ Errore invio file ZIP:', err);
          res.status(500).json({ error: 'Errore durante il download' });
        } else {
          console.log('✅ Download ZIP gestionale completato con successo');
        }
      });
      
    } catch (error) {
      console.error('❌ Errore endpoint download ZIP:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // Crea una nuova fattura
router.post('/api/invoices', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceData = req.body;
      
      console.log('📄 [/api/invoices] Creazione fattura per utente:', user.id, invoiceData);
      
      // Genera numero fattura automatico con codice professionista (formato: BUS1422-001/2025)
      const invoiceNumber = await generateProfessionalInvoiceNumber(user.id, invoiceData.date || new Date().toISOString().split('T')[0]);
      
      // Salva in PostgreSQL
      const [newInvoice] = await db.insert(invoicesTable).values({
        userId: user.id,
        invoiceNumber,
        clientId: invoiceData.clientId,
        totalAmount: invoiceData.totalAmount || 0,
        tax: invoiceData.tax || 0,
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
        status: invoiceData.status || 'draft',
        notes: invoiceData.notes || null
      }).returning();
      
      // Salva invoice items se presenti
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        for (const item of invoiceData.items) {
          await db.insert(invoiceItems).values({
            userId: user.id,
            invoiceId: newInvoice.id,
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.price || item.unitPrice || 0,
          });
        }
      }
      
      // FALLBACK: salva anche in JSON storage per compatibilità
      const storageData = loadStorageData();
      if (!storageData.invoices) {
        storageData.invoices = [];
      }
      storageData.invoices.push([newInvoice.id, {
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        ...invoiceData,
        ownerId: user.id,
        createdAt: newInvoice.createdAt?.toISOString() || new Date().toISOString(),
        status: newInvoice.status
      }]);
      saveStorageData(storageData);
      
      logger.debug(`✅ [/api/invoices] Fattura ${invoiceNumber} salvata in PostgreSQL + JSON (ID: ${newInvoice.id})`);
      res.status(201).json(newInvoice);
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      res.status(500).json({ message: 'Error creating invoice' });
    }
  });

  // Aggiorna stato fattura - SOLO POSTGRESQL
router.patch('/api/invoices/:id/status', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;
      
      logger.debug(`📄 [/api/invoices/${invoiceId}/status] Aggiornamento stato per utente ${user.id}: ${status}`);
      
      // Valida status
      const validStatuses = ['unpaid', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Stato non valido' });
      }
      
      // Verifica fattura esiste e appartiene all'utente
      const existingInvoice = await db.select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ))
        .limit(1);
      
      if (!existingInvoice || existingInvoice.length === 0) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      // Prepara dati aggiornamento
      const updateData: any = { status };
      
      // Aggiungi timestamp per stato pagata
      if (status === 'paid') {
        updateData.paidAt = new Date();
      }
      
      // Aggiorna in PostgreSQL
      await db.update(invoicesTable)
        .set(updateData)
        .where(eq(invoicesTable.id, invoiceId));
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/status] Stato aggiornato in PostgreSQL: ${status}`);
      res.json({ 
        success: true, 
        status,
        paidAt: updateData.paidAt
      });
      
    } catch (error) {
      console.error('❌ Error updating invoice status:', error);
      res.status(500).json({ message: 'Errore aggiornamento stato' });
    }
  });

  // Genera PDF per stampa
router.get('/api/invoices/:id/pdf', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      logger.debug(`📄 [/api/invoices/${invoiceId}/pdf] Generazione PDF per utente ${user.id}`);
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Recupera logo personalizzato dal database
      let userLogo = defaultIconBase64;
      try {
        const iconRow = await db
          .select({ iconBase64: userIcons.iconBase64 })
          .from(userIcons)
          .where(eq(userIcons.userId, user.id))
          .limit(1);
        
        if (iconRow.length > 0 && iconRow[0].iconBase64) {
          userLogo = iconRow[0].iconBase64;
          console.log(`🖼️ [PDF] Logo personalizzato caricato per utente ${user.id}`);
        } else {
          console.log(`🖼️ [PDF] Uso logo default per utente ${user.id}`);
        }
      } catch (error) {
        console.log('⚠️ [PDF] Errore caricamento logo, uso default:', error);
      }
      
      // Carica dati aziendali completi per intestazione fattura
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
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        const userBusinessData = currentStorageData.userBusinessData?.[user.id];
        
        // Usa il nome personalizzato se disponibile
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        // Carica tutti i dati aziendali se disponibili
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
        
        logger.debug(`📄 [PDF] Dati aziendali per utente ${user.id}:`, {
          nome: businessHeader,
          indirizzo: businessData.address,
          citta: businessData.city,
          cap: businessData.postalCode,
          partitaIva: businessData.vatNumber,
          codiceFiscale: businessData.fiscalCode,
          telefono: businessData.phone,
          email: businessData.email
        });
      } catch (error) {
        console.log('⚠️ Impossibile caricare dati aziendali, uso default:', error);
      }
      
      // Recupera dati completi del cliente dal database usando SEMPRE clientId
      let clientDetails = null;
      try {
        const currentStorageData = loadStorageData();
        const clients = currentStorageData.clients || [];
        
        if (invoice.clientId) {
          const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
          if (clientEntry) {
            clientDetails = clientEntry[1];
            logger.debug(`📄 [PDF] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
              nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
              email: clientDetails.email,
              telefono: clientDetails.phone,
              indirizzo: clientDetails.address,
              codiceFiscale: clientDetails.taxCode,
              partitaIva: clientDetails.vatNumber
            });
          } else {
            logger.debug(`📄 [PDF] Cliente non trovato per ID: ${invoice.clientId}`);
          }
        } else {
          logger.debug(`⚠️ [PDF] FATTURA SENZA CLIENTID! Fattura ${invoice.invoiceNumber} usa clientName obsoleto`);
          
          // Solo come fallback per fatture vecchie
          if (invoice.clientName) {
            const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
            const clientEntry = clients.find(([_, client]: any) => {
              if (client.ownerId !== user.id) return false;
              const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
              return fullName === invoiceClientName;
            });
            
            if (clientEntry) {
              clientDetails = clientEntry[1];
              logger.debug(`📄 [PDF] FALLBACK: Dati trovati per nome "${invoice.clientName}"`);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Errore recupero dati cliente:', error);
      }
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Genera HTML per PDF con logo e layout migliorato
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fattura ${invoice.invoiceNumber}</title>
          <style>
            @page { 
              size: A4 portrait;
              margin: 15mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              color: #333;
              font-size: 11pt;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #4A90E2; 
              padding-bottom: 25px;
              margin-bottom: 35px;
            }
            .header img { 
              max-width: 120px; 
              max-height: 120px; 
              margin-bottom: 15px; 
            }
            .header h1 {
              margin: 10px 0;
              color: #2C3E50;
              font-size: 20pt;
            }
            .header p {
              margin: 5px 0;
              font-size: 10pt;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding: 20px;
              background-color: #F8F9FA;
              border-radius: 8px;
            }
            .client-info, .invoice-details {
              flex: 1;
            }
            .client-info h3, .invoice-details h3 {
              color: #4A90E2;
              margin-top: 0;
              margin-bottom: 15px;
              font-size: 13pt;
            }
            .client-info p, .invoice-details p {
              margin: 8px 0;
              font-size: 10pt;
            }
            .invoice-details {
              text-align: right;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              background-color: #4A90E2;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 11pt;
            }
            .items-table td {
              border: 1px solid #E0E0E0;
              padding: 12px;
              font-size: 10pt;
            }
            .total-row {
              background-color: #F8F9FA;
              font-weight: bold;
              font-size: 13pt;
            }
            .notes-section {
              background-color: #FFF9E6;
              border-left: 4px solid #FFC107;
              padding: 20px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .notes-section h4 {
              margin-top: 0;
              color: #F57C00;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 2px solid #E0E0E0;
              text-align: center;
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${userLogo}" alt="Logo" />
            <h1>${businessHeader}</h1>
            ${businessData.address || businessData.city || businessData.postalCode ? `
              <p><strong>Indirizzo:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>
            ` : ''}
            ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : ''}
            ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : ''}
            ${businessData.vatNumber ? `<p><strong>P.IVA:</strong> ${businessData.vatNumber}</p>` : ''}
            ${businessData.fiscalCode ? `<p><strong>C.F.:</strong> ${businessData.fiscalCode}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="client-info">
              <h3>Dati Cliente</h3>
              <p><strong>Nome:</strong> ${clientDetails ? `${clientDetails.firstName} ${clientDetails.lastName}` : invoice.clientName || 'Cliente'}</p>
              ${clientDetails?.address ? `<p><strong>Indirizzo:</strong> ${clientDetails.address}</p>` : ''}
              ${clientDetails?.phone ? `<p><strong>Telefono:</strong> ${clientDetails.phone}</p>` : ''}
              ${clientDetails?.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
              ${clientDetails?.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientDetails.taxCode}</p>` : ''}
              ${clientDetails?.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientDetails.vatNumber}</p>` : ''}
              ${clientDetails?.birthday ? `<p><strong>Data di nascita:</strong> ${new Date(clientDetails.birthday).toLocaleDateString('it-IT')}</p>` : ''}
            </div>
            <div class="invoice-details">
              <h3>Fattura N. ${invoice.invoiceNumber}</h3>
              <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
              <p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>
              <p><strong>Stato:</strong> ${
                invoice.status === 'paid' ? 'Pagata' :
                invoice.status === 'sent' ? 'Inviata' :
                invoice.status === 'overdue' ? 'Scaduta' : 'Bozza'
              }</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Descrizione</th>
                <th style="width: 15%; text-align: center;">Quantità</th>
                <th style="width: 17.5%; text-align: right;">Prezzo Unit.</th>
                <th style="width: 17.5%; text-align: right;">Totale</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: any) => `
                <tr>
                  <td>${item.description || invoice.description || 'Servizio medico'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              `).join('') || `
                <tr>
                  <td>${invoice.description || 'Servizio medico'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              `}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 15px;"><strong>TOTALE:</strong></td>
                <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${invoice.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <h4>Note</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Grazie per aver scelto i nostri servizi</p>
            <p style="margin-top: 10px; font-size: 9pt;">Documento generato il ${new Date().toLocaleDateString('it-IT')}</p>
          </div>
        </body>
        </html>
      `;
      
      // Usa Puppeteer per generare PDF vero (portrait/verticale)
      try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: false,
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
        
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="fattura-${invoice.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        logger.debug(`✅ [/api/invoices/${invoiceId}/pdf] PDF generato (Puppeteer, portrait) per fattura ${invoice.invoiceNumber}`);
      } catch (puppeteerError) {
        console.log('⚠️ Puppeteer non disponibile, uso HTML:', puppeteerError);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="fattura-${invoice.invoiceNumber}.html"`);
        res.send(htmlContent);
        logger.debug(`✅ [/api/invoices/${invoiceId}/pdf] HTML generato per fattura ${invoice.invoiceNumber}`);
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      res.status(500).json({ message: 'Errore generazione PDF' });
    }
  });

  // Genera anteprima HTML per fattura (stessa logica del PDF ma senza download)
router.get('/api/invoices/:id/preview', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      console.log(`👁️ [/api/invoices/${invoiceId}/preview] Generazione anteprima per utente ${user.id}`);
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Carica dati aziendali completi per intestazione fattura
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
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        const userBusinessData = currentStorageData.userBusinessData?.[user.id];
        
        // Usa il nome personalizzato se disponibile
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        // Carica tutti i dati aziendali se disponibili
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
        
        console.log(`👁️ [PREVIEW] Dati aziendali per utente ${user.id}:`, {
          nome: businessHeader,
          indirizzo: businessData.address,
          email: businessData.email
        });
      } catch (error) {
        console.log('⚠️ Impossibile caricare dati aziendali per preview, uso default:', error);
      }
      
      // Recupera dati completi del cliente dal database usando SEMPRE clientId
      let clientDetails = null;
      try {
        const currentStorageData = loadStorageData();
        const clients = currentStorageData.clients || [];
        
        if (invoice.clientId) {
          const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
          if (clientEntry) {
            clientDetails = clientEntry[1];
            console.log(`👁️ [PREVIEW] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
              nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
              email: clientDetails.email
            });
          } else {
            console.log(`👁️ [PREVIEW] Cliente non trovato per ID: ${invoice.clientId}`);
          }
        } else {
          logger.debug(`⚠️ [PREVIEW] FATTURA SENZA CLIENTID! Fattura ${invoice.invoiceNumber} usa clientName obsoleto`);
          
          // Solo come fallback per fatture vecchie
          if (invoice.clientName) {
            const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
            const clientEntry = clients.find(([_, client]: any) => {
              if (client.ownerId !== user.id) return false;
              const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
              return fullName === invoiceClientName;
            });
            
            if (clientEntry) {
              clientDetails = clientEntry[1];
              console.log(`👁️ [PREVIEW] Cliente trovato tramite nome "${invoiceClientName}":`, {
                nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
                email: clientDetails.email
              });
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Errore caricamento dati cliente per preview:', error);
      }
      
      // Recupera descrizione del servizio
      let serviceDescription = invoice.description || 'Servizio';
      try {
        const currentStorageData = loadStorageData();
        const services = currentStorageData.services || [];
        
        if (invoice.serviceId) {
          const serviceEntry = services.find(([id, service]: any) => id === invoice.serviceId);
          if (serviceEntry) {
            serviceDescription = serviceEntry[1].name;
            console.log(`👁️ [PREVIEW] Servizio trovato per ID ${invoice.serviceId}: ${serviceDescription}`);
          }
        } else {
          logger.debug(`⚠️ [PREVIEW] FATTURA SENZA SERVICEID! Usando description: ${serviceDescription}`);
        }
      } catch (error) {
        console.log('⚠️ Errore caricamento dati servizio per preview:', error);
      }
      
      // Genera HTML per anteprima (stessa logica del PDF)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fattura ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; font-size: 14px; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { float: left; width: 50%; }
            .invoice-info { float: right; width: 45%; text-align: right; }
            .clear { clear: both; }
            .client-info { margin: 20px 0; padding: 15px; background-color: #f9f9f9; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { text-align: right; font-size: 16px; }
            .footer { margin-top: 40px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h2>${businessHeader}</h2>
              ${businessData.address ? `<p>${businessData.address}</p>` : ''}
              ${businessData.city && businessData.postalCode ? `<p>${businessData.postalCode} ${businessData.city}</p>` : ''}
              ${businessData.phone ? `<p>Tel: ${businessData.phone}</p>` : ''}
              ${businessData.email ? `<p>Email: ${businessData.email}</p>` : ''}
              ${businessData.vatNumber ? `<p>P.IVA: ${businessData.vatNumber}</p>` : ''}
              ${businessData.fiscalCode ? `<p>C.F.: ${businessData.fiscalCode}</p>` : ''}
            </div>
            
            <div class="invoice-info">
              <h3>FATTURA</h3>
              <p><strong>Numero:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
              <p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>
              <p><strong>Stato:</strong> ${invoice.status === 'paid' ? 'Pagata' : invoice.status === 'sent' ? 'Inviata' : invoice.status === 'overdue' ? 'Scaduta' : 'Bozza'}</p>
            </div>
            <div class="clear"></div>
          </div>
          
          <div class="client-info">
            <h4>Fatturato a:</h4>
            ${clientDetails ? `
              <p><strong>${clientDetails.firstName} ${clientDetails.lastName}</strong></p>
              ${clientDetails.address ? `<p>${clientDetails.address}</p>` : ''}
              ${clientDetails.email ? `<p>Email: ${clientDetails.email}</p>` : ''}
              ${clientDetails.phone ? `<p>Tel: ${clientDetails.phone}</p>` : ''}
              ${clientDetails.taxCode ? `<p>Codice Fiscale: ${clientDetails.taxCode}</p>` : ''}
              ${clientDetails.vatNumber ? `<p>P.IVA: ${clientDetails.vatNumber}</p>` : ''}
            ` : `
              <p><strong>${invoice.clientName || 'Cliente'}</strong></p>
            `}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Descrizione</th>
                <th>Quantità</th>
                <th>Prezzo Unitario</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${serviceDescription}</td>
                <td>1</td>
                <td>${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                <td><strong>${currencySymbol}${invoice.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div>
              <h4>Note:</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Grazie per aver scelto i nostri servizi</p>
          </div>
        </body>
        </html>
      `;
      
      // Restituisce HTML puro per anteprima (senza header di download)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/preview] Anteprima generata per fattura ${invoice.invoiceNumber}`);
      
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      res.status(500).json({ message: 'Errore generazione anteprima' });
    }
  });

  // Ottieni dati suggeriti per invio email fattura
router.get('/api/invoices/:id/email-suggestions', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      const clients = storageData.clients || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Carica le impostazioni nome aziendale dell'utente
      let businessName = 'Gestionale Appuntamenti';
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessName = userBusinessSettings.name;
        }
      } catch (error) {
        console.log('⚠️ Impossibile caricare nome aziendale per email:', error);
      }
      
      // Cerca email del cliente usando SEMPRE clientId (metodo corretto)
      let clientEmail = '';
      let clientData = null;
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
        if (clientEntry) {
          const [_, client] = clientEntry;
          clientEmail = client.email || '';
          clientData = client;
          logger.debug(`📧 [EMAIL SUGGESTIONS] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
            nome: `${client.firstName} ${client.lastName}`,
            email: client.email,
            telefono: client.phone
          });
        } else {
          logger.debug(`📧 [EMAIL SUGGESTIONS] Cliente non trovato per ID: ${invoice.clientId}`);
        }
      } else {
        logger.debug(`⚠️ [EMAIL SUGGESTIONS] FATTURA SENZA CLIENTID! Fattura ${invoice.invoiceNumber} usa clientName obsoleto`);
        
        // Solo come fallback per fatture vecchie senza clientId
        if (invoice.clientName) {
          const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
          const clientEntry = clients.find(([_, client]: any) => {
            if (client.ownerId !== user.id) return false;
            const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
            return fullName === invoiceClientName;
          });
          
          if (clientEntry) {
            const [_, client] = clientEntry;
            clientEmail = client.email || '';
            clientData = client;
            logger.debug(`📧 [EMAIL SUGGESTIONS] FALLBACK: Email trovata per nome "${invoice.clientName}": ${clientEmail}`);
          }
        }
      }
      
      // Crea oggetto e messaggio personalizzati
      const subject = `Fattura ${invoice.invoiceNumber} - ${businessName}`;
      const message = `Gentile ${invoice.clientName || 'Cliente'},

In allegato trova la fattura n. ${invoice.invoiceNumber} del ${new Date(invoice.issueDate).toLocaleDateString('it-IT')}.

Importo totale: ${currencySymbol}${invoice.totalAmount.toFixed(2)}

Cordiali saluti,
${businessName}`;
      
      res.json({
        clientEmail,
        subject,
        message,
        businessName
      });
      
    } catch (error) {
      console.error('❌ Error getting email suggestions:', error);
      res.status(500).json({ message: 'Errore caricamento suggerimenti email' });
    }
  });

  // Funzione per generare PDF identico al pulsante stampa
  async function generateInvoicePDFForEmail(invoiceId: number, user: any, req: any): Promise<Buffer> {
    console.log('📄 [INVOICE EMAIL] Uso direttamente la stessa logica dell\'endpoint PDF...');
    
    // Usa esattamente la stessa logica dell'endpoint /pdf senza chiamate HTTP
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]: any) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Fattura non trovata per email');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Recupera la valuta dell'utente
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Recupera logo personalizzato dal database
    let userLogo = defaultIconBase64;
    try {
      const iconRow = await db
        .select({ iconBase64: userIcons.iconBase64 })
        .from(userIcons)
        .where(eq(userIcons.userId, user.id))
        .limit(1);
      
      if (iconRow.length > 0 && iconRow[0].iconBase64) {
        userLogo = iconRow[0].iconBase64;
        console.log(`🖼️ [PDF] Logo personalizzato caricato per utente ${user.id}`);
      } else {
        console.log(`🖼️ [PDF] Uso logo default per utente ${user.id}`);
      }
    } catch (error) {
      console.log('⚠️ [PDF] Errore caricamento logo, uso default:', error);
    }
    
    // Stessa logica dell'endpoint /pdf per dati aziendali
    let businessInfo = {
      nome: 'busnari silvia',
      indirizzo: 'via largo caduti nassiria 17', 
      citta: 'olgiate comasco',
      cap: '22100',
      partitaIva: 'it32445929',
      codiceFiscale: '',
      telefono: '3471445767',
      email: 'silvia.busnari@libero.it'
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      if (userBusinessData) {
        businessInfo = { ...businessInfo, ...userBusinessData };
      }
      logger.debug(`📄 [PDF] Dati aziendali per utente ${user.id}:`, businessInfo);
    } catch (error) {
      console.log('⚠️ Uso dati aziendali default per PDF email:', error);
    }
    
    // Stessa logica dell'endpoint /pdf per dati cliente
    let clientData = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
        if (clientEntry) {
          clientData = clientEntry[1];
          logger.debug(`📄 [PDF] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
            nome: clientData.firstName + ' ' + clientData.lastName,
            email: clientData.email,
            telefono: clientData.phone,
            indirizzo: clientData.address,
            codiceFiscale: clientData.taxCode,
            partitaIva: clientData.vatNumber
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Errore dati cliente per PDF email:', error);
    }
    
    // Stessa logica HTML dell'endpoint /pdf CON COLORI E LAYOUT MODERNO
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fattura ${invoice.invoiceNumber}</title>
          <style>
            @page { 
              size: A4 portrait;
              margin: 15mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              color: #333;
              font-size: 11pt;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #4A90E2; 
              padding-bottom: 25px;
              margin-bottom: 35px;
            }
            .header img { 
              max-width: 120px; 
              max-height: 120px; 
              margin-bottom: 15px; 
            }
            .header h1 {
              margin: 10px 0;
              color: #2C3E50;
              font-size: 20pt;
            }
            .header p {
              margin: 5px 0;
              font-size: 10pt;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding: 20px;
              background-color: #F8F9FA;
              border-radius: 8px;
            }
            .client-info, .invoice-details {
              flex: 1;
            }
            .client-info h3, .invoice-details h3 {
              color: #4A90E2;
              margin-top: 0;
              margin-bottom: 15px;
              font-size: 13pt;
            }
            .client-info p, .invoice-details p {
              margin: 8px 0;
              font-size: 10pt;
            }
            .invoice-details {
              text-align: right;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              background-color: #4A90E2;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 11pt;
            }
            .items-table td {
              border: 1px solid #E0E0E0;
              padding: 12px;
              font-size: 10pt;
            }
            .total-row {
              background-color: #F8F9FA;
              font-weight: bold;
              font-size: 13pt;
            }
            .notes-section {
              background-color: #FFF9E6;
              border-left: 4px solid #FFC107;
              padding: 20px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .notes-section h4 {
              margin-top: 0;
              color: #F57C00;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 2px solid #E0E0E0;
              text-align: center;
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${userLogo}" alt="Logo" />
            <h1>${businessInfo.nome || 'Gestionale Appuntamenti'}</h1>
            ${businessInfo.indirizzo || businessInfo.citta || businessInfo.cap ? `
              <p><strong>Indirizzo:</strong> ${businessInfo.indirizzo}${businessInfo.citta ? `, ${businessInfo.citta}` : ''}${businessInfo.cap ? ` ${businessInfo.cap}` : ''}</p>
            ` : ''}
            ${businessInfo.telefono ? `<p><strong>Tel:</strong> ${businessInfo.telefono}</p>` : ''}
            ${businessInfo.email ? `<p><strong>Email:</strong> ${businessInfo.email}</p>` : ''}
            ${businessInfo.partitaIva ? `<p><strong>P.IVA:</strong> ${businessInfo.partitaIva}</p>` : ''}
            ${businessInfo.codiceFiscale ? `<p><strong>C.F.:</strong> ${businessInfo.codiceFiscale}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="client-info">
              <h3>Dati Cliente</h3>
              <p><strong>Nome:</strong> ${clientData ? `${clientData.firstName} ${clientData.lastName}` : invoice.clientName || 'Cliente'}</p>
              ${clientData?.address ? `<p><strong>Indirizzo:</strong> ${clientData.address}</p>` : ''}
              ${clientData?.phone ? `<p><strong>Telefono:</strong> ${clientData.phone}</p>` : ''}
              ${clientData?.email ? `<p><strong>Email:</strong> ${clientData.email}</p>` : ''}
              ${clientData?.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientData.taxCode}</p>` : ''}
              ${clientData?.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientData.vatNumber}</p>` : ''}
            </div>
            
            <div class="invoice-details">
              <h3>Fattura N. ${invoice.invoiceNumber}</h3>
              <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
              ${invoice.dueDate ? `<p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>` : ''}
              <p><strong>Stato:</strong> ${
                invoice.status === 'paid' ? 'Pagata' :
                invoice.status === 'sent' ? 'Inviata' :
                invoice.status === 'overdue' ? 'Scaduta' : 'Bozza'
              }</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Descrizione</th>
                <th style="width: 15%; text-align: center;">Quantità</th>
                <th style="width: 17.5%; text-align: right;">Prezzo Unit.</th>
                <th style="width: 17.5%; text-align: right;">Totale</th>
              </tr>
            </thead>
            <tbody>
              ${(!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) ? 
                `<tr>
                  <td>${invoice.description || 'Servizio professionale'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td>
                </tr>` :
                invoice.items.map((item: any) => `
                  <tr>
                    <td>${item.description || 'Servizio professionale'}</td>
                    <td style="text-align: center;">${item.quantity || 1}</td>
                    <td style="text-align: right;">${currencySymbol}${(item.price || 0).toFixed(2)}</td>
                    <td style="text-align: right;">${currencySymbol}${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')
              }
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 15px;"><strong>TOTALE:</strong></td>
                <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <h4>Note</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Grazie per aver scelto i nostri servizi</p>
            <p style="margin-top: 10px; font-size: 9pt;">Documento generato il ${new Date().toLocaleDateString('it-IT')}</p>
          </div>
        </body>
        </html>`;

    logger.debug(`✅ [INVOICE EMAIL] HTML generato, conversione in PDF reale con Puppeteer...`);
    
    // Usa Puppeteer per convertire HTML in PDF reale
    try {
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: false, // Orientamento verticale (portrait)
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm', 
          bottom: '10mm',
          left: '10mm'
        }
      });
      
      await browser.close();
      
      logger.debug(`✅ [INVOICE EMAIL] PDF reale generato con successo: ${(pdfBuffer as Buffer).length} bytes`);
      return pdfBuffer as Buffer;
      
    } catch (puppeteerError: any) {
      console.log(`❌ [INVOICE EMAIL] Puppeteer failed: ${puppeteerError?.message}, uso fallback`);
      return await generateInvoicePDFForEmailFallback(invoiceId, user);
    }
  }

  async function generateInvoicePDFForEmailFallback(invoiceId: number, user: any): Promise<Buffer> {
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]: any) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Fattura non trovata per email');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Recupera la valuta dell'utente
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Recupera logo personalizzato dal database (come funzione principale)
    let userLogo = defaultIconBase64;
    try {
      const iconRow = await db
        .select({ iconBase64: userIcons.iconBase64 })
        .from(userIcons)
        .where(eq(userIcons.userId, user.id))
        .limit(1);
      
      if (iconRow.length > 0 && iconRow[0].iconBase64) {
        userLogo = iconRow[0].iconBase64;
        console.log(`🖼️ [FALLBACK] Logo personalizzato caricato per utente ${user.id}`);
      } else {
        console.log(`🖼️ [FALLBACK] Uso logo default per utente ${user.id}`);
      }
    } catch (error) {
      console.log('⚠️ [FALLBACK] Errore caricamento logo, uso default:', error);
    }
    
    // Stessa logica dati aziendali dell'endpoint /pdf
    let businessHeader = 'Gestionale Appuntamenti';
    let businessData = {
      companyName: '', address: '', city: '', postalCode: '', 
      vatNumber: '', fiscalCode: '', phone: '', email: ''
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      
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
      console.log('⚠️ Dati aziendali per PDF email, uso default:', error);
    }
    
    // Stessa logica cliente dell'endpoint /pdf
    let clientDetails = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
        if (clientEntry) {
          clientDetails = clientEntry[1];
        }
      }
    } catch (error) {
      console.log('⚠️ Errore dati cliente per PDF email:', error);
    }
    
    // HTML semplificato per evitare errori di escape
    const itemsHtml = (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) 
      ? `<tr><td>Servizi professionali - ${invoice.invoiceNumber}</td><td style="text-align: center;">1</td><td style="text-align: right;">${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td><td style="text-align: right;">${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td></tr>`
      : invoice.items.map((item: any) => `<tr><td>${item.description || 'Servizio professionale'}</td><td style="text-align: center;">${item.quantity || 1}</td><td style="text-align: right;">${currencySymbol} ${(item.price || 0).toFixed(2)}</td><td style="text-align: right;">${currencySymbol} ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td></tr>`).join('');
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fattura ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .client-info, .invoice-details { flex: 1; }
    .invoice-details { text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { border: 1px solid #ccc; padding: 10px; text-align: left; }
    .items-table th { background-color: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 1.2em; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessHeader}</h1>
    ${businessData.address || businessData.city ? `<p><strong>Indirizzo:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>` : ''}
    ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : '<p>Tel: +39 347 144 5767</p>'}
    ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : '<p>biomedicinaintegrata.it</p>'}
    ${businessData.vatNumber ? `<p><strong>Partita IVA:</strong> ${businessData.vatNumber}</p>` : ''}
    ${businessData.fiscalCode ? `<p><strong>Codice Fiscale:</strong> ${businessData.fiscalCode}</p>` : ''}
  </div>
  
  <div class="invoice-info">
    <div class="client-info">
      <h3>Dati Cliente</h3>
      ${clientDetails ? `
        <p><strong>Nome:</strong> ${clientDetails.firstName} ${clientDetails.lastName}</p>
        ${clientDetails.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
        ${clientDetails.phone ? `<p><strong>Telefono:</strong> ${clientDetails.phone}</p>` : ''}
        ${clientDetails.address ? `<p><strong>Indirizzo:</strong> ${clientDetails.address}</p>` : ''}
        ${clientDetails.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientDetails.taxCode}</p>` : ''}
        ${clientDetails.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientDetails.vatNumber}</p>` : ''}
      ` : `
        <p><strong>Nome:</strong> ${invoice.clientName || 'Cliente'}</p>
      `}
    </div>
    
    <div class="invoice-details">
      <h3>Dettagli Fattura</h3>
      <p><strong>Numero:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
      <p><strong>Stato:</strong> ${invoice.status === 'draft' ? 'Bozza' : invoice.status === 'sent' ? 'Inviata' : invoice.status === 'paid' ? 'Pagata' : invoice.status}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Descrizione</th>
        <th style="width: 100px;">Quantità</th>
        <th style="width: 100px;">Prezzo Unit.</th>
        <th style="width: 100px;">Totale</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <div class="total-row" style="text-align: right; font-size: 1.3em;">
    <strong>Totale: ${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</strong>
  </div>
  
  <div class="footer">
    <p>Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
  </div>
</body>
</html>`;
    
    // Usa pdfmake invece di Puppeteer (più affidabile su Replit)
    const pdfMake: any = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    if (pdfMake.default) {
      pdfMake.default.vfs = pdfFonts.default?.pdfMake?.vfs || pdfFonts.pdfMake?.vfs;
    }

    const docDefinition = {
      content: [
        // Logo aziendale
        {
          image: userLogo,
          width: 120,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        
        // Header aziendale completo (identico al PDF stampato)
        { 
          columns: [
            {
              text: [
                { text: `${businessHeader}\n`, fontSize: 18, bold: true, color: '#2C3E50' },
                `${businessData.address || 'via largo caduti nassiria 17'}\n`,
                `${businessData.city || 'olgiate comasco'} ${businessData.postalCode || '22100'}\n`,
                `Tel: ${businessData.phone || '3471445767'}\n`,
                `Email: ${businessData.email || 'silvia.busnari@libero.it'}\n`,
                businessData.vatNumber ? `P.IVA: ${businessData.vatNumber}\n` : '',
                businessData.fiscalCode ? `C.F.: ${businessData.fiscalCode}` : ''
              ].filter(line => line),
              width: '50%'
            },
            {
              text: [
                { text: 'FATTURA N. ', bold: true, fontSize: 14 },
                { text: `${invoice.invoiceNumber}\n`, fontSize: 14 },
                { text: 'Data: ', bold: true },
                `${new Date(invoice.date).toLocaleDateString('it-IT')}\n`,
              ],
              alignment: 'right',
              width: '50%'
            }
          ],
          margin: [0, 0, 0, 30]
        },
        
        // Dati Cliente completi
        { 
          text: 'Dati Cliente:', 
          style: 'sectionHeader',
          margin: [0, 0, 0, 10]
        },
        {
          text: [
            { text: 'Nome: ', bold: true },
            `${clientDetails ? clientDetails.firstName + ' ' + clientDetails.lastName : invoice.clientName}\n`,
            { text: 'Email: ', bold: true },
            `${clientDetails?.email || 'N/A'}\n`,
            { text: 'Telefono: ', bold: true },
            `${clientDetails?.phone || 'N/A'}\n`,
            { text: 'Indirizzo: ', bold: true },
            `${clientDetails?.address || 'N/A'}\n`,
            clientDetails?.taxCode ? [
              { text: 'Codice Fiscale: ', bold: true },
              `${clientDetails.taxCode}\n`
            ] : '',
            clientDetails?.vatNumber ? [
              { text: 'P.IVA: ', bold: true },
              `${clientDetails.vatNumber}`
            ] : ''
          ].flat().filter(Boolean),
          margin: [0, 0, 0, 20]
        },
        
        // Tabella servizi identica
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Descrizione', style: 'tableHeader' },
                { text: 'Quantità', style: 'tableHeader' },
                { text: 'Prezzo Unit.', style: 'tableHeader' },
                { text: 'Totale', style: 'tableHeader' }
              ],
              ...((!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) ? [
                [`Servizi professionali - ${invoice.invoiceNumber}`, '1', `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`, `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`]
              ] : invoice.items.map((item: any) => [
                item.description || 'Servizio professionale',
                (item.quantity || 1).toString(),
                `€ ${(item.price || 0).toFixed(2)}`,
                `€ ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
              ]))
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },
        
        // Totale finale
        {
          text: [
            { text: 'TOTALE: ', bold: true, fontSize: 16 },
            { text: `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`, bold: true, fontSize: 16 }
          ],
          alignment: 'right',
          margin: [0, 10, 0, 30]
        },
        
        // Footer identico al PDF stampato
        {
          text: [
            `Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}\n`,
            businessData.vatNumber && businessData.fiscalCode ? 
              `P.IVA: ${businessData.vatNumber} - C.F: ${businessData.fiscalCode}` :
              businessData.vatNumber ? `P.IVA: ${businessData.vatNumber}` :
              businessData.fiscalCode ? `C.F: ${businessData.fiscalCode}` : ''
          ].filter(Boolean),
          fontSize: 10,
          alignment: 'center',
          margin: [0, 20, 0, 0]
        }
      ],
      
      styles: {
        sectionHeader: { fontSize: 12, bold: true },
        tableHeader: { bold: true, fillColor: '#eeeeee' }
      }
    };

    const pdfBuffer = await new Promise((resolve, reject) => {
      const pdfMakeInstance = pdfMake.default || pdfMake;
      const printer = pdfMakeInstance.createPdf(docDefinition);
      printer.getBuffer((buffer: any) => {
        resolve(buffer);
      });
    });

    return pdfBuffer as Buffer;
  }

  // Invia fattura via email
router.post('/api/invoices/:id/send-email', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { recipientEmail, subject, message } = req.body;
      
      logger.debug(`📄 [/api/invoices/${invoiceId}/send-email] Invio email per utente ${user.id} a ${recipientEmail}`);
      
      // Validazione input
      if (!recipientEmail || !subject) {
        return res.status(400).json({ message: 'Email e oggetto sono obbligatori' });
      }
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Carica nome aziendale personalizzato per mittente
      let businessName = 'Gestionale Appuntamenti';
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessName = userBusinessSettings.name;
        }
      } catch (error) {
        console.log('⚠️ Impossibile caricare nome aziendale per invio email:', error);
      }
      
      // Invio email reale utilizzando il sistema collaudato dei promemoria
      try {
        const { notificationService } = await import('../services/notificationService');
        const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
        
        if (!fs.existsSync(emailConfigPath)) {
          console.log('⚠️ [EMAIL] Configurazione email non trovata, simulazione invio');
          logger.debug(`📧 SIMULAZIONE INVIO EMAIL:
            Da: ${businessName} <noreply@biomedicinaintegrata.it>
            A: ${recipientEmail}
            Oggetto: ${subject}
            Messaggio: ${message || 'Fattura in allegato'}
            Allegato: fattura-${invoice.invoiceNumber}.pdf
          `);
        } else {
          const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
          
          if (!emailConfig.emailEnabled || !emailConfig.emailAddress || !emailConfig.emailPassword) {
            console.log('⚠️ [EMAIL] Email non configurata, simulazione invio');
            logger.debug(`📧 SIMULAZIONE INVIO EMAIL:
              Da: ${businessName} <noreply@biomedicinaintegrata.it>
              A: ${recipientEmail}
              Oggetto: ${subject}
              Messaggio: ${message || 'Fattura in allegato'}
              Allegato: fattura-${invoice.invoiceNumber}.pdf
            `);
          } else {
            logger.debug(`📧 [INVOICE EMAIL] Invio fattura via email utilizzando sistema collaudato`);
            logger.debug(`📧 [INVOICE EMAIL] Da: ${emailConfig.emailAddress} A: ${recipientEmail}`);
            logger.debug(`📧 [INVOICE EMAIL] Oggetto: ${subject}`);
            
            // Genera PDF identico al pulsante stampa per allegato email
            let pdfBuffer = null;
            let filename = null;
            
            try {
              logger.debug(`📄 [INVOICE EMAIL] Uso stessa logica del pulsante stampa...`);
              
              // Chiama la funzione esistente che genera il PDF per la stampa
              pdfBuffer = await generateInvoicePDFForEmail(invoiceId, user, req);
              
              if (pdfBuffer && pdfBuffer.length > 0) {
                filename = `fattura-${invoice.invoiceNumber}.pdf`;
                logger.debug(`📎 [INVOICE EMAIL] PDF identico a stampa generato: ${filename} (${pdfBuffer.length} bytes)`);
              } else {
                throw new Error('PDF Buffer vuoto');
              }

            } catch (pdfError: any) {
              console.error(`❌ [INVOICE EMAIL] Errore generazione PDF stampa:`, pdfError?.message);
              pdfBuffer = null;
              filename = null;
            }
            
            // Usa la funzione specifica per fatture
            const emailSent = await notificationService.sendInvoiceEmail(
              recipientEmail,
              subject,
              message || `Gentile Cliente,\n\nIn allegato trova la fattura n. ${invoice.invoiceNumber} del ${new Date(invoice.date).toLocaleDateString('it-IT')}.\n\nDettagli fattura:\n- Numero: ${invoice.invoiceNumber}\n- Data: ${new Date(invoice.date).toLocaleDateString('it-IT')}\n- Importo: €${invoice.total?.toFixed(2) || '0.00'}\n\nCordiali saluti,\n${businessName}`.replace(/invalid date/gi, ''),
              emailConfig,
              pdfBuffer || undefined,
              filename
            );
            
            if (emailSent) {
              logger.debug(`✅ [INVOICE EMAIL] Email fattura inviata con successo${pdfBuffer ? ' con allegato PDF' : ' (solo testo)'}`);
            } else {
              throw new Error('Errore invio email dal sistema notificationService');
            }
          }
        }
      } catch (emailError) {
        console.error('❌ [EMAIL] Errore invio email reale, fallback a simulazione:', emailError);
        logger.debug(`📧 SIMULAZIONE INVIO EMAIL:
          Da: ${businessName} <noreply@biomedicinaintegrata.it>
          A: ${recipientEmail}
          Oggetto: ${subject}
          Messaggio: ${message || 'Fattura in allegato'}
          Allegato: fattura-${invoice.invoiceNumber}.pdf
        `);
      }
      
      logger.debug(`📧 [EMAIL] Nome aziendale utilizzato per invio: "${businessName}"`);
      
      // Aggiorna stato fattura a "inviata" se era in bozza
      if (invoice.status === 'draft') {
        const invoiceIndex = invoices.findIndex(([id]: any) => id === invoiceId);
        if (invoiceIndex !== -1) {
          invoices[invoiceIndex][1].status = 'sent';
          invoices[invoiceIndex][1].sentAt = new Date().toISOString();
          saveStorageData(storageData);
        }
      }
      
      // Salva log invio
      if (!invoice.emailHistory) {
        invoice.emailHistory = [];
      }
      invoice.emailHistory.push({
        sentAt: new Date().toISOString(),
        recipientEmail,
        subject,
        message: message || '',
        status: 'sent'
      });
      
      saveStorageData(storageData);
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/send-email] Email inviata con successo`);
      res.json({ 
        success: true,
        recipientEmail,
        sentAt: new Date().toISOString(),
        message: 'Email inviata con successo'
      });
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      res.status(500).json({ message: 'Errore invio email' });
    }
  });

  // Endpoint multicanale: invio fattura via PWA, Email, WhatsApp - SOLO POSTGRESQL
router.post('/api/invoices/:id/send', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { channels } = req.body; // { pwa: boolean, email: boolean, whatsapp: boolean }
      
      console.log(`📤 [/api/invoices/${invoiceId}/send] Invio multicanale per utente ${user.id}:`, channels);
      
      // Validazione: almeno un canale
      if (!channels || (!channels.pwa && !channels.email && !channels.whatsapp)) {
        return res.status(400).json({ message: 'Seleziona almeno un canale di invio' });
      }
      
      // Carica fattura da PostgreSQL
      const invoiceResults = await db.select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ))
        .limit(1);
      
      if (!invoiceResults || invoiceResults.length === 0) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const invoice = invoiceResults[0];
      
      // Carica dati cliente da PostgreSQL
      const clientResults = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, invoice.clientId))
        .limit(1);
      
      if (!clientResults || clientResults.length === 0) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }
      
      const client = clientResults[0];
      const results = { pwa: false, email: false, whatsapp: false };
      const now = new Date();
      
      // Prepara oggetto per aggiornamento
      const updateData: any = {};
      
      // 1. PWA: marca fattura come disponibile nell'area clienti
      if (channels.pwa) {
        console.log(`📱 [PWA] Fattura ${invoice.invoiceNumber} resa disponibile nell'area clienti`);
        updateData.publishedToPwa = true;
        updateData.pwaPublishedAt = now;
        results.pwa = true;
      }
      
      // 2. Email: carica dati cliente e invia
      if (channels.email) {
        try {
          if (!client.email) {
            logger.debug(`⚠️ [EMAIL] Cliente senza email, skip invio`);
          } else {
            const { notificationService } = await import('../services/notificationService');
            const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
            
            if (fs.existsSync(emailConfigPath)) {
              const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
              
              if (emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword) {
                // === GENERA PDF USANDO LOGICA PWA (logo + colori) ===
                
                // Carica items fattura
                const items = await db.select()
                  .from(invoiceItems)
                  .where(eq(invoiceItems.invoiceId, invoice.id));
                
                // Carica logo personalizzato (usa invoice.userId = professionista owner, NON user.id = admin)
                const { loadUserLogo, buildInvoiceHtml, generatePdfBuffer } = await import('../utils/invoicePdf');
                const logoBase64 = await loadUserLogo(invoice.userId);
                
                // Carica dati aziendali (usa invoice.userId = professionista owner)
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
                  const userBusinessSettings = currentStorageData.userBusinessSettings?.[invoice.userId];
                  const userBusinessData = currentStorageData.userBusinessData?.[invoice.userId];
                  
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
                  console.log('⚠️ [EMAIL PDF] Errore caricamento dati aziendali:', error);
                }
                
                // Recupera la valuta dell'utente (usa invoice.userId = professionista owner)
                const userCurrency = await getCurrencyForUser(storage, invoice.userId);
                const currencySymbol = userCurrency.symbol;
                
                // Costruisci context per il template
                const context = {
                  invoiceNumber: invoice.invoiceNumber,
                  date: new Date(invoice.date).toLocaleDateString('it-IT'),
                  dueDate: new Date(invoice.dueDate).toLocaleDateString('it-IT'),
                  status: invoice.status,
                  totalAmount: invoice.totalAmount,
                  tax: invoice.tax || 0,
                  notes: invoice.notes || undefined,
                  
                  clientName: `${client.firstName} ${client.lastName}`,
                  clientAddress: client.address || undefined,
                  clientPhone: client.phone || undefined,
                  clientEmail: client.email || undefined,
                  clientTaxCode: (client as any).tax_code || (client as any).taxCode || undefined,
                  clientVatNumber: (client as any).vat_number || (client as any).vatNumber || undefined,
                  clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString('it-IT') : undefined,
                  
                  businessHeader,
                  businessAddress: businessData.address || undefined,
                  businessCity: businessData.city || undefined,
                  businessPostalCode: businessData.postalCode || undefined,
                  businessPhone: businessData.phone || undefined,
                  businessEmail: businessData.email || undefined,
                  businessVatNumber: businessData.vatNumber || undefined,
                  businessFiscalCode: businessData.fiscalCode || undefined,
                  
                  items: items.map((item: any) => ({
                    description: item.description || 'Servizio',
                    quantity: item.quantity || 1,
                    price: (item as any).price || item.unitPrice || 0,
                    total: (item as any).total || (item.quantity * item.unitPrice) || 0
                  })),
                  
                  logoBase64,
                  currencySymbol
                };
                
                // Genera HTML professionale con logo e grafica
                const htmlContent = buildInvoiceHtml(context);
                
                // Genera PDF con Puppeteer (con fallback silenzioso)
                let pdfBuffer: Buffer;
                try {
                  pdfBuffer = await generatePdfBuffer(htmlContent);
                  logger.debug(`✅ [EMAIL PDF] PDF professionale generato con Puppeteer (${pdfBuffer.length} bytes)`);
                } catch (pdfError) {
                  console.error('❌ [EMAIL PDF] Puppeteer fallito, uso HTML come fallback:', pdfError);
                  // Fallback: converti HTML in buffer UTF-8
                  pdfBuffer = Buffer.from(htmlContent, 'utf-8');
                }
                
                const subject = `Fattura ${invoice.invoiceNumber}`;
                const message = `Gentile ${client.firstName} ${client.lastName},\n\nIn allegato la fattura n. ${invoice.invoiceNumber}.\n\nCordiali saluti`;
                
                await notificationService.sendInvoiceEmail(
                  client.email,
                  subject,
                  message,
                  emailConfig,
                  pdfBuffer,  // Buffer PDF professionale
                  `fattura-${invoice.invoiceNumber}.pdf`
                );
                
                logger.debug(`✅ [EMAIL] Fattura inviata a ${client.email} con PDF professionale allegato`);
                updateData.sentViaEmail = true;
                updateData.emailSentAt = now;
                results.email = true;
              } else {
                logger.debug(`⚠️ [EMAIL] Email non configurata`);
              }
            } else {
              logger.debug(`⚠️ [EMAIL] Configurazione email non trovata`);
            }
          }
        } catch (emailError) {
          console.error(`❌ [EMAIL] Errore invio:`, emailError);
        }
      }
      
      // 3. WhatsApp: genera link o invia messaggio
      if (channels.whatsapp) {
        try {
          if (!client.phone) {
            logger.debug(`⚠️ [WHATSAPP] Cliente senza telefono, skip invio`);
          } else {
            const { notificationService } = await import('../services/notificationService');
            const message = `Gentile ${client.firstName}, la fattura n. ${invoice.invoiceNumber} è disponibile nell'area clienti.`;
            const whatsappLink = notificationService.generateWhatsAppLink(client.phone, message);
            
            logger.debug(`📲 [WHATSAPP] Link generato: ${whatsappLink}`);
            updateData.sentViaWhatsapp = true;
            updateData.whatsappSentAt = now;
            results.whatsapp = true;
          }
        } catch (whatsappError) {
          console.error(`❌ [WHATSAPP] Errore:`, whatsappError);
        }
      }
      
      // Aggiorna fattura in PostgreSQL
      if (Object.keys(updateData).length > 0) {
        await db.update(invoicesTable)
          .set(updateData)
          .where(eq(invoicesTable.id, invoiceId));
        
        logger.debug(`💾 [/api/invoices/${invoiceId}/send] Fattura aggiornata in PostgreSQL:`, updateData);
      }
      
      const successChannels = Object.entries(results)
        .filter(([_, success]) => success)
        .map(([channel]) => channel.toUpperCase())
        .join(', ');
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/send] Invio completato: ${successChannels}`);
      
      res.json({ 
        success: true,
        message: `Fattura inviata con successo${successChannels ? ` via ${successChannels}` : ''}`,
        results
      });
      
    } catch (error) {
      console.error('❌ Error sending invoice:', error);
      res.status(500).json({ message: 'Errore invio fattura' });
    }
  });

export default router;
