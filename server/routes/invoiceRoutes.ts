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

  // Helper function to generate PDF as buffer for email attachments
  async function generateInvoicePDFBuffer(invoiceId: number, user: any): Promise<Buffer> {
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]: any) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Invoice not found');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Retrieve the user's currency
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Load complete company data (same code as print)
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
      console.log('⚠️ Unable to load company data for attached PDF:', error);
    }
    
    // Load client data
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
      console.log('⚠️ Error retrieving client data for PDF:', error);
    }
    
    // Generate HTML for PDF attachment
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
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
    ${businessData.address ? `<p><strong>Address:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>` : ''}
    ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : ''}
    ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : ''}
    ${businessData.vatNumber ? `<p><strong>VAT Number:</strong> ${businessData.vatNumber}</p>` : ''}
    ${businessData.fiscalCode ? `<p><strong>Tax Code:</strong> ${businessData.fiscalCode}</p>` : ''}
  </div>
  
  <div class="invoice-info">
    <div class="client-info">
      <h3>Client:</h3>
      <p><strong>${clientDetails ? `${clientDetails.firstName} ${clientDetails.lastName}` : invoice.clientName || 'Client'}</strong></p>
      ${clientDetails?.address ? `<p><strong>Address:</strong> ${clientDetails.address}</p>` : ''}
      ${clientDetails?.phone ? `<p><strong>Phone:</strong> ${clientDetails.phone}</p>` : ''}
      ${clientDetails?.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
      ${clientDetails?.taxCode ? `<p><strong>Tax Code:</strong> ${clientDetails.taxCode}</p>` : ''}
      ${clientDetails?.vatNumber ? `<p><strong>VAT Number:</strong> ${clientDetails.vatNumber}</p>` : ''}
    </div>
    
    <div class="invoice-details">
      <h3>Invoice Details:</h3>
      <p><strong>Number:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-GB')}</p>
      <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
      <p><strong>Status:</strong> ${invoice.status === 'draft' ? 'Draft' : invoice.status === 'sent' ? 'Sent' : invoice.status === 'paid' ? 'Paid' : 'Overdue'}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
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
        <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
        <td><strong>${currencySymbol}${invoice.total.toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>
  
  <div class="footer">
    <p>Thank you for choosing our services.</p>
    <p>For any questions, please do not hesitate to contact us.</p>
  </div>
</body>
</html>`;
    
    // Return HTML as buffer for attachment
    return Buffer.from(htmlContent, 'utf-8');
  }

  // Endpoint for invoices
router.get('/api/invoices', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        console.log('📄 [/api/invoices] User not authenticated');
        return res.status(401).json({ message: "Not authenticated" });
      }
      console.log('📄 [/api/invoices] Invoices request for user:', user.id);
      
      // Load invoices da PostgreSQL
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
          // Multi-channel send fields
          publishedToPwa: invoicesTable.publishedToPwa,
          pwaPublishedAt: invoicesTable.pwaPublishedAt,
          sentViaEmail: invoicesTable.sentViaEmail,
          emailSentAt: invoicesTable.emailSentAt,
          sentViaWhatsapp: invoicesTable.sentViaWhatsapp,
          whatsappSentAt: invoicesTable.whatsappSentAt,
          // Dati client
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
      
      // Transform to legacy format for frontend compatibility
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
        // Multi-channel send fields - CRITICAL for green->grey button state
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
      
      logger.debug(`📄 [/api/invoices] Restituisco ${userInvoices.length} invoices for user ${user.id}`);
      
      // Anti-cache header to avoid 304 Not Modified after mutation
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(userInvoices);
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      res.status(500).json({ message: 'Error fetching invoices' });
    }
  });

  // Function to generate automatic invoice number - LEGAL FORMAT
  async function generateInvoiceNumber(ownerId: number): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Load existing invoices for this owner for the current year from PostgreSQL
    const ownerInvoicesThisYear = await db
      .select({ invoiceNumber: invoicesTable.invoiceNumber })
      .from(invoicesTable)
      .where(eq(invoicesTable.userId, ownerId));
    
    // Filter only those from the current year
    const invoiceNumbersThisYear = ownerInvoicesThisYear
      .map(inv => inv.invoiceNumber)
      .filter(num => num && num.endsWith(`/${currentYear}`)); // Formato NNN/YYYY
    
    // Find the highest sequential number for this year
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

  // Endpoint to get the next invoice number
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
      console.error('❌ Error generating next number:', error);
      res.status(500).json({ message: 'Error generating number' });
    }
  });

  // Endpoint for billing suggestions
router.get('/api/invoices/suggestions', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const storageData = loadStorageData();
      
      // Load professional's clients
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
          taxCode: client.taxCode || '', // tax code
          vatNumber: client.vatNumber || '' // VAT number
        }))
        .filter((client: any) => client.name.length > 0);

      // Load existing invoices to analyze common amounts
      const allInvoices = storageData.invoices || [];
      const userInvoices = allInvoices
        .filter(([_, invoice]: any) => invoice.ownerId === user.id)
        .map(([_, invoice]: any) => invoice);

      // Extract most common amounts
      const amountCounts: Record<string, number> = {};
      userInvoices.forEach((invoice: any) => {
        const amount = invoice.totalAmount;
        if (amount && amount > 0) {
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;
        }
      });

      // Sort importi per frequenza
      const commonAmounts = Object.entries(amountCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 10)
        .map(([amount]) => parseFloat(amount));

      // Add some standard amounts if the list is empty
      if (commonAmounts.length === 0) {
        commonAmounts.push(50, 70, 100, 150, 200);
      }

      // Extract most common descriptions
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

      // Add standard descriptions if the list is empty
      if (commonDescriptions.length === 0) {
        commonDescriptions.push('medical visit', 'consultation', 'check-up', 'therapy', 'examination');
      }

      res.json({
        clients: userClients,
        amounts: commonAmounts,
        descriptions: commonDescriptions
      });
      
    } catch (error) {
      console.error('❌ Error loading suggestions:', error);
      res.status(500).json({ message: 'Error loading suggestions' });
    }
  });

  // Endpoint for updating existing invoices with clientId (data migration)
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
      
      logger.debug(`🔄 [MIGRATE] Starting clientId migration for user ${user.id}`);
      
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
            logger.debug(`✅ [MIGRATE] invoice ${invoice.invoiceNumber}: "${invoice.clientName}" → client ID ${clientData.id}`);
          } else {
            logger.debug(`⚠️ [MIGRATE] Client not found for invoice ${invoice.invoiceNumber}: "${invoice.clientName}"`);
          }
        }
      }
      
      if (updatedCount > 0) {
        saveStorageData(storageData);
        logger.debug(`💾 [MIGRATE] Saved ${updatedCount} invoices with updated clientId`);
      }
      
      res.json({
        message: `Migration completed: ${updatedCount} invoices updated`,
        updatedCount
      });
      
    } catch (error) {
      console.error('❌ Error migrating clientId:', error);
      res.status(500).json({ message: 'Error during migration' });
    }
  });

  // INVOICE CLEANUP - Renumber all invoices with legal format NNN/YYYY
router.post('/api/invoices/cleanup-numbering', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      console.log(`🧹 [/api/invoices/cleanup-numbering] Numbering cleanup for user ${user.id}`);
      
      const storageData = loadStorageData();
      const allInvoices = storageData.invoices || [];
      
      // Filter only the current user's invoices
      const userInvoices = allInvoices.filter(([_, invoice]: any) => invoice.ownerId === user.id);
      
      if (userInvoices.length === 0) {
        return res.json({ message: 'No invoices to clean up', cleaned: 0 });
      }
      
      console.log(`🧹 Found ${userInvoices.length} user invoices to renumber`);
      
      // Sort invoices by date (from oldest to most recent)
      userInvoices.sort(([_, a]: any, [__, b]: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
      
      let cleanedCount = 0;
      
      // Renumber all invoices in the correct chronological order
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
      
      // Save the updated data
      if (cleanedCount > 0) {
        saveStorageData(storageData);
        logger.debug(`✅ [/api/invoices/cleanup-numbering] Cleanup completed: ${cleanedCount} invoices renumbered`);
      }
      
      res.json({
        message: `Cleanup completed: ${cleanedCount} invoices renumbered in legal format NNN/YYYY`,
        cleaned: cleanedCount,
        total: userInvoices.length
      });
      
    } catch (error) {
      console.error('❌ Error cleaning up invoice numbering:', error);
      res.status(500).json({ message: 'Error during cleanup' });
    }
  });

  // INVOICE DELETION with double security (PostgreSQL)
router.delete('/api/invoices/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { confirmation } = req.body;
      
      logger.debug(`🗑️ [/api/invoices/${invoiceId}] Delete request for user ${user.id}`);
      
      // Double safety check - requires confirmation: true
      if (!confirmation) {
        return res.status(400).json({ 
          message: 'Security confirmation required',
          requiresConfirmation: true 
        });
      }
      
      // Load the invoice from PostgreSQL to get details
      const [invoiceToDelete] = await db
        .select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ))
        .limit(1);
      
      if (!invoiceToDelete) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // First delete the invoice items
      await db
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));
      
      // Then delete the invoice itself
      await db
        .delete(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ));
      
      logger.debug(`✅ [/api/invoices/${invoiceId}] Invoice ${invoiceToDelete.invoiceNumber} deleted successfully from PostgreSQL`);
      
      res.json({
        message: `Invoice ${invoiceToDelete.invoiceNumber} deleted successfully`,
        deletedInvoice: {
          invoiceNumber: invoiceToDelete.invoiceNumber,
          date: invoiceToDelete.date,
          totalAmount: invoiceToDelete.totalAmount
        }
      });
      
    } catch (error) {
      console.error('❌ Error deleting invoice:', error);
      res.status(500).json({ message: 'Error during deletion' });
    }
  });

  // ===== PACKAGES (PROMOTIONAL PACKAGES) - PRO FEATURES =====
  
  // GET /api/packages/templates - List package templates
router.get('/api/packages/templates', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
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
  
  // POST /api/packages/templates - Create package template
router.post('/api/packages/templates', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { name, description, serviceIds, totalSessions, price, expirationDays } = req.body;
      
      // Validation: verify that services belong to the user
      if (serviceIds && serviceIds.length > 0) {
        const userServices = await db
          .select({ id: servicesTable.id })
          .from(servicesTable)
          .where(eq(servicesTable.userId, tenantId));
        
        const userServiceIds = userServices.map(s => s.id);
        const invalidServiceIds = serviceIds.filter((id: number) => !userServiceIds.includes(id));
        
        if (invalidServiceIds.length > 0) {
          return res.status(400).json({ 
            message: 'Servizi invalid o non autorizzati',
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
  
  // PUT /api/packages/templates/:id - Update package template
router.put('/api/packages/templates/:id', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const templateId = parseInt(req.params.id);
      const { name, description, serviceIds, totalSessions, price, expirationDays, isActive } = req.body;
      
      // Validation: verify that services belong to the user
      if (serviceIds && serviceIds.length > 0) {
        const userServices = await db
          .select({ id: servicesTable.id })
          .from(servicesTable)
          .where(eq(servicesTable.userId, tenantId));
        
        const userServiceIds = userServices.map(s => s.id);
        const invalidServiceIds = serviceIds.filter((id: number) => !userServiceIds.includes(id));
        
        if (invalidServiceIds.length > 0) {
          return res.status(400).json({ 
            message: 'Servizi invalid o non autorizzati',
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
        return res.status(404).json({ message: 'Template not found' });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('❌ Error updating package template:', error);
      res.status(500).json({ message: 'Error updating package template' });
    }
  });
  
  // DELETE /api/packages/templates/:id - Delete package template
router.delete('/api/packages/templates/:id', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const templateId = parseInt(req.params.id);
      
      // Check if there are active packages based on this template
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
          message: 'Cannot delete: there are active packages based on this template' 
        });
      }
      
      await db
        .delete(packageTemplates)
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ));
      
      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting package template:', error);
      res.status(500).json({ message: 'Error deleting package template' });
    }
  });
  
  // GET /api/packages/purchases - List sold packages
router.get('/api/packages/purchases', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
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
  
  // POST /api/packages/purchases - Sell package to client
router.post('/api/packages/purchases', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { templateId, clientId, invoiceId, purchaseDate, notes } = req.body;
      
      // Verify that the template exists and belongs to the user
      const [template] = await db
        .select()
        .from(packageTemplates)
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ))
        .limit(1);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Verify that the client exists and belongs to the user
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(and(
          eq(clientsTable.id, clientId),
          eq(clientsTable.userId, tenantId)
        ))
        .limit(1);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Calculate expiration date if specified in the template
      let expiresAt = null;
      if (template.expirationDays) {
        const purchaseDateObj = new Date(purchaseDate);
        const expiresAtObj = new Date(purchaseDateObj);
        expiresAtObj.setDate(expiresAtObj.getDate() + template.expirationDays);
        expiresAt = expiresAtObj.toISOString().split('T')[0];
      }
      
      // Create the sold package
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
  
  // POST /api/packages/redeem - Redeem session from package
router.post('/api/packages/redeem', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { purchaseId, appointmentId, performedBy, notes } = req.body;
      
      // Verify that the package exists, belongs to the user and has remaining sessions
      const [purchase] = await db
        .select()
        .from(packagePurchases)
        .where(and(
          eq(packagePurchases.id, purchaseId),
          eq(packagePurchases.userId, tenantId)
        ))
        .limit(1);
      
      if (!purchase) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      if (purchase.status !== 'active') {
        return res.status(400).json({ message: 'Package not active' });
      }
      
      if (purchase.sessionsRemaining <= 0) {
        return res.status(400).json({ message: 'No remaining sessions' });
      }
      
      // Verify expiry
      if (purchase.expiresAt) {
        const today = new Date().toISOString().split('T')[0];
        if (today > purchase.expiresAt) {
          // Update status to expired
          await db
            .update(packagePurchases)
            .set({ status: 'expired' })
            .where(eq(packagePurchases.id, purchaseId));
          
          return res.status(400).json({ message: 'Package expired' });
        }
      }
      
      // Calculate progressive session number
      const existingRedemptions = await db
        .select({ sessionNumber: packageRedemptions.sessionNumber })
        .from(packageRedemptions)
        .where(eq(packageRedemptions.purchaseId, purchaseId))
        .orderBy(desc(packageRedemptions.sessionNumber))
        .limit(1);
      
      const sessionNumber = existingRedemptions.length > 0 
        ? existingRedemptions[0].sessionNumber + 1 
        : 1;
      
      // Create the redemption
      const [redemption] = await db.insert(packageRedemptions).values({
        userId: tenantId,
        purchaseId,
        appointmentId,
        sessionNumber,
        performedBy: performedBy || null,
        notes: notes || null
      }).returning();
      
      // Decrement remaining sessions
      const newSessionsRemaining = purchase.sessionsRemaining - 1;
      const updateData: any = {
        sessionsRemaining: newSessionsRemaining
      };
      
      // If it is the last session, mark as completed
      if (newSessionsRemaining === 0) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }
      
      await db
        .update(packagePurchases)
        .set(updateData)
        .where(eq(packagePurchases.id, purchaseId));
      
      // Also update the appointment to link it to the package
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

  // DOWNLOAD ZIP - Endpoint to download the complete management system
router.get('/download-gestionale-zip', (req, res) => {
    try {
      const zipPath = path.join(__dirname, '../../gestionale-sanitario-completo-20250910-061135.zip');
      
      // Verify that the file exists
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'File ZIP not found' });
      }
      
      // Set headers for download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="scheduler-complete.zip"');
      
      // Send the file
      res.sendFile(zipPath, (err) => {
        if (err) {
          console.error('❌ Error sending ZIP file:', err);
          res.status(500).json({ error: 'Error during download' });
        } else {
          console.log('✅ Download ZIP completed successfully');
        }
      });
      
    } catch (error) {
      console.error('❌ Error in ZIP download endpoint:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Create a new invoice
router.post('/api/invoices', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceData = req.body;
      
      console.log('📄 [/api/invoices] Creating invoice for user:', user.id, invoiceData);
      
      // Generate automatic invoice number with professional code (format: BUS1422-001/2025)
      const invoiceNumber = await generateProfessionalInvoiceNumber(user.id, invoiceData.date || new Date().toISOString().split('T')[0]);
      
      // Save in PostgreSQL
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
      
      // Save invoice items if present
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
      
      // FALLBACK: also save in JSON storage for compatibility
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
      
      logger.debug(`✅ [/api/invoices] invoice ${invoiceNumber} saved in PostgreSQL + JSON (ID: ${newInvoice.id})`);
      res.status(201).json(newInvoice);
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      res.status(500).json({ message: 'Error creating invoice' });
    }
  });

  // Update invoice status - POSTGRESQL ONLY
router.patch('/api/invoices/:id/status', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;
      
      logger.debug(`📄 [/api/invoices/${invoiceId}/status] Updating status for user ${user.id}: ${status}`);
      
      // Validate status
      const validStatuses = ['unpaid', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Stato invalid' });
      }
      
      // Verify invoice exists and belongs to the user
      const existingInvoice = await db.select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ))
        .limit(1);
      
      if (!existingInvoice || existingInvoice.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Prepare update data
      const updateData: any = { status };
      
      // Add timestamp for paid status
      if (status === 'paid') {
        updateData.paidAt = new Date();
      }
      
      // Update in PostgreSQL
      await db.update(invoicesTable)
        .set(updateData)
        .where(eq(invoicesTable.id, invoiceId));
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/status] Status updated in PostgreSQL: ${status}`);
      res.json({ 
        success: true, 
        status,
        paidAt: updateData.paidAt
      });
      
    } catch (error) {
      console.error('❌ Error updating invoice status:', error);
      res.status(500).json({ message: 'Error updating status' });
    }
  });

  // Generate PDF for printing
router.get('/api/invoices/:id/pdf', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      logger.debug(`📄 [/api/invoices/${invoiceId}/pdf] Generation PDF for user ${user.id}`);
      
      // Load data
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Find the invoice
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Retrieve custom logo from the database
      let userLogo = defaultIconBase64;
      try {
        const iconRow = await db
          .select({ iconBase64: userIcons.iconBase64 })
          .from(userIcons)
          .where(eq(userIcons.userId, user.id))
          .limit(1);
        
        if (iconRow.length > 0 && iconRow[0].iconBase64) {
          userLogo = iconRow[0].iconBase64;
          console.log(`🖼️ [PDF] Custom logo loaded for user ${user.id}`);
        } else {
          console.log(`🖼️ [PDF] Using default logo for user ${user.id}`);
        }
      } catch (error) {
        console.log('⚠️ [PDF] Error loading logo, using default:', error);
      }
      
      // Load complete company data for invoice header
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
        
        // Use the custom name if available
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        // Load all company data if available
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
        
        logger.debug(`📄 [PDF] data business for user ${user.id}:`, {
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
        console.log('⚠️ Unable to load business data, using default:', error);
      }
      
      // Retrieve full client data from the database always using clientId
      let clientDetails = null;
      try {
        const currentStorageData = loadStorageData();
        const clients = currentStorageData.clients || [];
        
        if (invoice.clientId) {
          const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
          if (clientEntry) {
            clientDetails = clientEntry[1];
            logger.debug(`📄 [PDF] Client data found via ID ${invoice.clientId}:`, {
              nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
              email: clientDetails.email,
              telefono: clientDetails.phone,
              indirizzo: clientDetails.address,
              codiceFiscale: clientDetails.taxCode,
              partitaIva: clientDetails.vatNumber
            });
          } else {
            logger.debug(`📄 [PDF] Client not found for ID: ${invoice.clientId}`);
          }
        } else {
          logger.debug(`⚠️ [PDF] invoice WITHOUT CLIENTID! invoice ${invoice.invoiceNumber} uses legacy clientName`);
          
          // Only as fallback for old invoices
          if (invoice.clientName) {
            const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
            const clientEntry = clients.find(([_, client]: any) => {
              if (client.ownerId !== user.id) return false;
              const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
              return fullName === invoiceClientName;
            });
            
            if (clientEntry) {
              clientDetails = clientEntry[1];
              logger.debug(`📄 [PDF] FALLBACK: Dati found per nome "${invoice.clientName}"`);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error retrieving client data:', error);
      }
      
      // Retrieve the user's currency
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;

      // Fetch user language for locale-aware labels
      const { getUserLanguage: getUserLangForPdf } = await import('../utils/userLanguage');
      const { getInvoicePdfStrings, LOCALE_MAP: LOCALE_MAP_PDF } = await import('../utils/emailTranslations');
      const pdfLang = await getUserLangForPdf(user.id);
      const pdfT = getInvoicePdfStrings(pdfLang);
      const pdfDateLocale = LOCALE_MAP_PDF[pdfLang] ?? 'it-IT';

      // Generate HTML for PDF with logo and improved layout
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${pdfT.invoiceTitle} ${invoice.invoiceNumber}</title>
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
              <p><strong>${pdfT.addressLabel}:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>
            ` : ''}
            ${businessData.phone ? `<p><strong>${pdfT.telLabel}:</strong> ${businessData.phone}</p>` : ''}
            ${businessData.email ? `<p><strong>${pdfT.emailLabel}:</strong> ${businessData.email}</p>` : ''}
            ${businessData.vatNumber ? `<p><strong>${pdfT.vatNoLabel}:</strong> ${businessData.vatNumber}</p>` : ''}
            ${businessData.fiscalCode ? `<p><strong>${pdfT.taxCodeLabel}:</strong> ${businessData.fiscalCode}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="client-info">
              <h3>${pdfT.clientDetails}</h3>
              <p><strong>${pdfT.nameLabel}:</strong> ${clientDetails ? `${clientDetails.firstName} ${clientDetails.lastName}` : invoice.clientName || 'Client'}</p>
              ${clientDetails?.address ? `<p><strong>${pdfT.addressLabel}:</strong> ${clientDetails.address}</p>` : ''}
              ${clientDetails?.phone ? `<p><strong>${pdfT.phoneLabel}:</strong> ${clientDetails.phone}</p>` : ''}
              ${clientDetails?.email ? `<p><strong>${pdfT.emailLabel}:</strong> ${clientDetails.email}</p>` : ''}
              ${clientDetails?.taxCode ? `<p><strong>${pdfT.taxCodeLabel}:</strong> ${clientDetails.taxCode}</p>` : ''}
              ${clientDetails?.vatNumber ? `<p><strong>${pdfT.vatNumberLabel}:</strong> ${clientDetails.vatNumber}</p>` : ''}
              ${clientDetails?.birthday ? `<p><strong>${pdfT.dateOfBirthLabel}:</strong> ${new Date(clientDetails.birthday).toLocaleDateString(pdfDateLocale)}</p>` : ''}
            </div>
            <div class="invoice-details">
              <h3>${pdfT.invoiceNoLabel} ${invoice.invoiceNumber}</h3>
              <p><strong>${pdfT.dateLabel}:</strong> ${new Date(invoice.date).toLocaleDateString(pdfDateLocale)}</p>
              <p><strong>${pdfT.dueDateLabel}:</strong> ${new Date(invoice.dueDate).toLocaleDateString(pdfDateLocale)}</p>
              <p><strong>${pdfT.statusLabel}:</strong> ${
                invoice.status === 'paid' ? pdfT.statusPaid :
                invoice.status === 'sent' ? pdfT.statusSent :
                invoice.status === 'overdue' ? pdfT.statusOverdue : pdfT.statusDraft
              }</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">${pdfT.descriptionCol}</th>
                <th style="width: 15%; text-align: center;">${pdfT.quantityCol}</th>
                <th style="width: 17.5%; text-align: right;">${pdfT.unitPriceCol}</th>
                <th style="width: 17.5%; text-align: right;">${pdfT.totalCol}</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: any) => `
                <tr>
                  <td>${item.description || invoice.description || 'Service'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              `).join('') || `
                <tr>
                  <td>${invoice.description || 'Service'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              `}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 15px;"><strong>${pdfT.totalLabel}:</strong></td>
                <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${invoice.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <h4>${pdfT.notesLabel}</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>${pdfT.thankYou}</p>
            <p style="margin-top: 10px; font-size: 9pt;">${pdfT.documentGenerated} ${new Date().toLocaleDateString(pdfDateLocale)}</p>
          </div>
        </body>
        </html>
      `;
      
      // Use Puppeteer to generate a real PDF (portrait/vertical)
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
        res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        logger.debug(`✅ [/api/invoices/${invoiceId}/pdf] PDF generated (Puppeteer, portrait) for invoice ${invoice.invoiceNumber}`);
      } catch (puppeteerError) {
        console.log('⚠️ Puppeteer not available, using HTML:', puppeteerError);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.html"`);
        res.send(htmlContent);
        logger.debug(`✅ [/api/invoices/${invoiceId}/pdf] HTML generated for invoice ${invoice.invoiceNumber}`);
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      res.status(500).json({ message: 'Error generating PDF' });
    }
  });

  // Generate HTML preview for invoice (same logic as PDF but without download)
router.get('/api/invoices/:id/preview', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      console.log(`👁️ [/api/invoices/${invoiceId}/preview] Generating preview for user ${user.id}`);
      
      // Load data
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Find the invoice
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Retrieve the user's currency
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Load complete company data for invoice header
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
        
        // Use the custom name if available
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        // Load all company data if available
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
        
        console.log(`👁️ [PREVIEW] data business for user ${user.id}:`, {
          nome: businessHeader,
          indirizzo: businessData.address,
          email: businessData.email
        });
      } catch (error) {
        console.log('⚠️ Unable to load business data for preview, using default:', error);
      }
      
      // Retrieve full client data from the database always using clientId
      let clientDetails = null;
      try {
        const currentStorageData = loadStorageData();
        const clients = currentStorageData.clients || [];
        
        if (invoice.clientId) {
          const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
          if (clientEntry) {
            clientDetails = clientEntry[1];
            console.log(`👁️ [PREVIEW] Client data found via ID ${invoice.clientId}:`, {
              nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
              email: clientDetails.email
            });
          } else {
            console.log(`👁️ [PREVIEW] Client not found for ID: ${invoice.clientId}`);
          }
        } else {
          logger.debug(`⚠️ [PREVIEW] invoice WITHOUT CLIENTID! invoice ${invoice.invoiceNumber} uses legacy clientName`);
          
          // Only as fallback for old invoices
          if (invoice.clientName) {
            const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
            const clientEntry = clients.find(([_, client]: any) => {
              if (client.ownerId !== user.id) return false;
              const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
              return fullName === invoiceClientName;
            });
            
            if (clientEntry) {
              clientDetails = clientEntry[1];
              console.log(`👁️ [PREVIEW] Client found via name "${invoiceClientName}":`, {
                nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
                email: clientDetails.email
              });
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error loading client data for preview:', error);
      }
      
      // Retrieve descrizione of the service
      let serviceDescription = invoice.description || 'Servizio';
      try {
        const currentStorageData = loadStorageData();
        const services = currentStorageData.services || [];
        
        if (invoice.serviceId) {
          const serviceEntry = services.find(([id, service]: any) => id === invoice.serviceId);
          if (serviceEntry) {
            serviceDescription = serviceEntry[1].name;
            console.log(`👁️ [PREVIEW] Service found for ID ${invoice.serviceId}: ${serviceDescription}`);
          }
        } else {
          logger.debug(`⚠️ [PREVIEW] invoice WITHOUT SERVICEID! Using description: ${serviceDescription}`);
        }
      } catch (error) {
        console.log('⚠️ Error loading service data for preview:', error);
      }
      
      // Generate HTML for preview (same logic as PDF)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${invoice.invoiceNumber}</title>
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
              ${businessData.vatNumber ? `<p>VAT No.: ${businessData.vatNumber}</p>` : ''}
              ${businessData.fiscalCode ? `<p>Tax Code: ${businessData.fiscalCode}</p>` : ''}
            </div>
            
            <div class="invoice-info">
              <h3>INVOICE</h3>
              <p><strong>Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-GB')}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Status:</strong> ${invoice.status === 'paid' ? 'Paid' : invoice.status === 'sent' ? 'Sent' : invoice.status === 'overdue' ? 'Overdue' : 'Draft'}</p>
            </div>
            <div class="clear"></div>
          </div>
          
          <div class="client-info">
            <h4>Billed to:</h4>
            ${clientDetails ? `
              <p><strong>${clientDetails.firstName} ${clientDetails.lastName}</strong></p>
              ${clientDetails.address ? `<p>${clientDetails.address}</p>` : ''}
              ${clientDetails.email ? `<p>Email: ${clientDetails.email}</p>` : ''}
              ${clientDetails.phone ? `<p>Tel: ${clientDetails.phone}</p>` : ''}
              ${clientDetails.taxCode ? `<p>Tax Code: ${clientDetails.taxCode}</p>` : ''}
              ${clientDetails.vatNumber ? `<p>VAT No.: ${clientDetails.vatNumber}</p>` : ''}
            ` : `
              <p><strong>${invoice.clientName || 'Client'}</strong></p>
            `}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
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
              <h4>Notes:</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for choosing our services</p>
          </div>
        </body>
        </html>
      `;
      
      // Returns plain HTML for preview (without download headers)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/preview] Preview generated for invoice ${invoice.invoiceNumber}`);
      
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      res.status(500).json({ message: 'Error generating preview' });
    }
  });

  // Get suggested data for invoice email sending
router.get('/api/invoices/:id/email-suggestions', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      // Load data
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      const clients = storageData.clients || [];
      
      // Find the invoice
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Retrieve the user's currency
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Load the user's company name settings
      let businessName = 'Gestionale Appuntamenti';
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessName = userBusinessSettings.name;
        }
      } catch (error) {
        console.log('⚠️ Unable to load business name for email:', error);
      }
      
      // Find client email always using clientId (correct method)
      let clientEmail = '';
      let clientData = null;
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
        if (clientEntry) {
          const [_, client] = clientEntry;
          clientEmail = client.email || '';
          clientData = client;
          logger.debug(`📧 [EMAIL SUGGESTIONS] Client data found via ID ${invoice.clientId}:`, {
            nome: `${client.firstName} ${client.lastName}`,
            email: client.email,
            telefono: client.phone
          });
        } else {
          logger.debug(`📧 [EMAIL SUGGESTIONS] Client not found for ID: ${invoice.clientId}`);
        }
      } else {
        logger.debug(`⚠️ [EMAIL SUGGESTIONS] invoice WITHOUT CLIENTID! invoice ${invoice.invoiceNumber} uses legacy clientName`);
        
        // Only as fallback for old invoices without clientId
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
            logger.debug(`📧 [EMAIL SUGGESTIONS] FALLBACK: Email found per nome "${invoice.clientName}": ${clientEmail}`);
          }
        }
      }
      
      // Fetch user language for locale-aware date in suggestion message
      const { getUserLanguage: getUserLangForSug } = await import('../utils/userLanguage');
      const { LOCALE_MAP: LOCALE_MAP_SUG } = await import('../utils/emailTranslations');
      const sugLang = await getUserLangForSug(user.id);
      const sugDateLocale = LOCALE_MAP_SUG[sugLang] ?? 'it-IT';

      // Create custom subject and message (in user's language — English fallback for subject/message body)
      const subject = `Invoice ${invoice.invoiceNumber} - ${businessName}`;
      const message = `Dear ${invoice.clientName || 'Client'},

Please find attached invoice no. ${invoice.invoiceNumber} dated ${new Date(invoice.issueDate).toLocaleDateString(sugDateLocale)}.

Total amount: ${currencySymbol}${invoice.totalAmount.toFixed(2)}

Best regards,
${businessName}`;
      
      res.json({
        clientEmail,
        subject,
        message,
        businessName
      });
      
    } catch (error) {
      console.error('❌ Error getting email suggestions:', error);
      res.status(500).json({ message: 'Error loading email suggestions' });
    }
  });

  // Function to generate PDF identical to the print button
  async function generateInvoicePDFForEmail(invoiceId: number, user: any, req: any): Promise<Buffer> {
    console.log('📄 [INVOICE EMAIL] Using the same logic as the PDF endpoint directly...');
    
    // Use exactly the same logic as the /pdf endpoint without HTTP calls
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]: any) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Invoice not found per email');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Retrieve the user's currency
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Retrieve custom logo from the database
    let userLogo = defaultIconBase64;
    try {
      const iconRow = await db
        .select({ iconBase64: userIcons.iconBase64 })
        .from(userIcons)
        .where(eq(userIcons.userId, user.id))
        .limit(1);
      
      if (iconRow.length > 0 && iconRow[0].iconBase64) {
        userLogo = iconRow[0].iconBase64;
        console.log(`🖼️ [PDF] Custom logo loaded for user ${user.id}`);
      } else {
        console.log(`🖼️ [PDF] Using default logo for user ${user.id}`);
      }
    } catch (error) {
      console.log('⚠️ [PDF] Error loading logo, using default:', error);
    }
    
    // Same logic as the /pdf endpoint for company data
    let businessInfo = {
      nome: '',
      indirizzo: '',
      citta: '',
      cap: '',
      partitaIva: '',
      codiceFiscale: '',
      telefono: '',
      email: ''
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      if (userBusinessData) {
        businessInfo = { ...businessInfo, ...userBusinessData };
      }
      logger.debug(`📄 [PDF] data business for user ${user.id}:`, businessInfo);
    } catch (error) {
      console.log('⚠️ Using default company data for email PDF:', error);
    }
    
    // Same logic as the /pdf endpoint for client data
    let clientData = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]: any) => id === invoice.clientId);
        if (clientEntry) {
          clientData = clientEntry[1];
          logger.debug(`📄 [PDF] Client data found via ID ${invoice.clientId}:`, {
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
      console.log('⚠️ Error loading client data for PDF email:', error);
    }
    
    // Same HTML logic as the /pdf endpoint WITH MODERN COLORS AND LAYOUT
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${invoice.invoiceNumber}</title>
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
            <h1>${businessInfo.nome || 'Appointment Manager'}</h1>
            ${businessInfo.indirizzo || businessInfo.citta || businessInfo.cap ? `
              <p><strong>Address:</strong> ${businessInfo.indirizzo}${businessInfo.citta ? `, ${businessInfo.citta}` : ''}${businessInfo.cap ? ` ${businessInfo.cap}` : ''}</p>
            ` : ''}
            ${businessInfo.telefono ? `<p><strong>Tel:</strong> ${businessInfo.telefono}</p>` : ''}
            ${businessInfo.email ? `<p><strong>Email:</strong> ${businessInfo.email}</p>` : ''}
            ${businessInfo.partitaIva ? `<p><strong>VAT No.:</strong> ${businessInfo.partitaIva}</p>` : ''}
            ${businessInfo.codiceFiscale ? `<p><strong>Tax Code:</strong> ${businessInfo.codiceFiscale}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="client-info">
              <h3>Client Details</h3>
              <p><strong>Name:</strong> ${clientData ? `${clientData.firstName} ${clientData.lastName}` : invoice.clientName || 'Client'}</p>
              ${clientData?.address ? `<p><strong>Address:</strong> ${clientData.address}</p>` : ''}
              ${clientData?.phone ? `<p><strong>Phone:</strong> ${clientData.phone}</p>` : ''}
              ${clientData?.email ? `<p><strong>Email:</strong> ${clientData.email}</p>` : ''}
              ${clientData?.taxCode ? `<p><strong>Tax Code:</strong> ${clientData.taxCode}</p>` : ''}
              ${clientData?.vatNumber ? `<p><strong>VAT Number:</strong> ${clientData.vatNumber}</p>` : ''}
            </div>
            
            <div class="invoice-details">
              <h3>Invoice No. ${invoice.invoiceNumber}</h3>
              <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-GB')}</p>
              ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>` : ''}
              <p><strong>Status:</strong> ${
                invoice.status === 'paid' ? 'Paid' :
                invoice.status === 'sent' ? 'Sent' :
                invoice.status === 'overdue' ? 'Overdue' : 'Draft'
              }</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Description</th>
                <th style="width: 15%; text-align: center;">Quantity</th>
                <th style="width: 17.5%; text-align: right;">Unit Price</th>
                <th style="width: 17.5%; text-align: right;">Total</th>
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
                <td colspan="3" style="text-align: right; padding: 15px;"><strong>TOTAL:</strong></td>
                <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <h4>Notes</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for choosing our services</p>
            <p style="margin-top: 10px; font-size: 9pt;">Document generated on ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </body>
        </html>`;

    logger.debug(`✅ [INVOICE EMAIL] HTML generated, converting to real PDF with Puppeteer...`);
    
    // Use Puppeteer to convert HTML to real PDF
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
      
      logger.debug(`✅ [INVOICE EMAIL] Real PDF generated successfully: ${(pdfBuffer as Buffer).length} bytes`);
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
      throw new Error('Invoice not found per email');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Retrieve the user's currency
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Retrieve custom logo from the database (as main function)
    let userLogo = defaultIconBase64;
    try {
      const iconRow = await db
        .select({ iconBase64: userIcons.iconBase64 })
        .from(userIcons)
        .where(eq(userIcons.userId, user.id))
        .limit(1);
      
      if (iconRow.length > 0 && iconRow[0].iconBase64) {
        userLogo = iconRow[0].iconBase64;
        console.log(`🖼️ [FALLBACK] Custom logo loaded for user ${user.id}`);
      } else {
        console.log(`🖼️ [FALLBACK] Using default logo for user ${user.id}`);
      }
    } catch (error) {
      console.log('⚠️ [FALLBACK] Error loading logo, using default:', error);
    }
    
    // Same company data logic as the /pdf endpoint
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
      console.log('⚠️ Business data for PDF email, using default:', error);
    }
    
    // Same client logic as the /pdf endpoint
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
      console.log('⚠️ Error loading client data for PDF email:', error);
    }
    
    // Simplified HTML to avoid escape errors
    const itemsHtml = (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) 
      ? `<tr><td>Professional services - ${invoice.invoiceNumber}</td><td style="text-align: center;">1</td><td style="text-align: right;">${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td><td style="text-align: right;">${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td></tr>`
      : invoice.items.map((item: any) => `<tr><td>${item.description || 'Professional service'}</td><td style="text-align: center;">${item.quantity || 1}</td><td style="text-align: right;">${currencySymbol} ${(item.price || 0).toFixed(2)}</td><td style="text-align: right;">${currencySymbol} ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td></tr>`).join('');
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
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
    ${businessData.address || businessData.city ? `<p><strong>Address:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>` : ''}
    ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : ''}
    ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : ''}
    ${businessData.vatNumber ? `<p><strong>VAT Number:</strong> ${businessData.vatNumber}</p>` : ''}
    ${businessData.fiscalCode ? `<p><strong>Tax Code:</strong> ${businessData.fiscalCode}</p>` : ''}
  </div>
  
  <div class="invoice-info">
    <div class="client-info">
      <h3>Client Details</h3>
      ${clientDetails ? `
        <p><strong>Name:</strong> ${clientDetails.firstName} ${clientDetails.lastName}</p>
        ${clientDetails.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
        ${clientDetails.phone ? `<p><strong>Phone:</strong> ${clientDetails.phone}</p>` : ''}
        ${clientDetails.address ? `<p><strong>Address:</strong> ${clientDetails.address}</p>` : ''}
        ${clientDetails.taxCode ? `<p><strong>Tax Code:</strong> ${clientDetails.taxCode}</p>` : ''}
        ${clientDetails.vatNumber ? `<p><strong>VAT Number:</strong> ${clientDetails.vatNumber}</p>` : ''}
      ` : `
        <p><strong>Name:</strong> ${invoice.clientName || 'Client'}</p>
      `}
    </div>
    
    <div class="invoice-details">
      <h3>Invoice Details</h3>
      <p><strong>Number:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-GB')}</p>
      <p><strong>Status:</strong> ${invoice.status === 'draft' ? 'Draft' : invoice.status === 'sent' ? 'Sent' : invoice.status === 'paid' ? 'Paid' : invoice.status}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="width: 100px;">Quantity</th>
        <th style="width: 100px;">Unit Price</th>
        <th style="width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <div class="total-row" style="text-align: right; font-size: 1.3em;">
    <strong>Total: ${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</strong>
  </div>
  
  <div class="footer">
    <p>Document generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
  </div>
</body>
</html>`;
    
    // Use pdfmake instead of Puppeteer (more reliable on Replit)
    const pdfMake: any = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    if (pdfMake.default) {
      pdfMake.default.vfs = pdfFonts.default?.pdfMake?.vfs || pdfFonts.pdfMake?.vfs;
    }

    const docDefinition = {
      content: [
        // Company logo
        {
          image: userLogo,
          width: 120,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        
        // Full company header (identical to the printed PDF)
        { 
          columns: [
            {
              text: [
                { text: `${businessHeader}\n`, fontSize: 18, bold: true, color: '#2C3E50' },
                businessData.address ? `${businessData.address}\n` : '',
                businessData.city ? `${businessData.city}${businessData.postalCode ? ' ' + businessData.postalCode : ''}\n` : '',
                businessData.phone ? `Tel: ${businessData.phone}\n` : '',
                businessData.email ? `Email: ${businessData.email}\n` : '',
                businessData.vatNumber ? `VAT No.: ${businessData.vatNumber}\n` : '',
                businessData.fiscalCode ? `Tax Code: ${businessData.fiscalCode}` : ''
              ].filter(line => line),
              width: '50%'
            },
            {
              text: [
                { text: 'INVOICE NO. ', bold: true, fontSize: 14 },
                { text: `${invoice.invoiceNumber}\n`, fontSize: 14 },
                { text: 'Date: ', bold: true },
                `${new Date(invoice.date).toLocaleDateString('en-GB')}\n`,
              ],
              alignment: 'right',
              width: '50%'
            }
          ],
          margin: [0, 0, 0, 30]
        },
        
        // Full client details
        { 
          text: 'Client Details:', 
          style: 'sectionHeader',
          margin: [0, 0, 0, 10]
        },
        {
          text: [
            { text: 'Name: ', bold: true },
            `${clientDetails ? clientDetails.firstName + ' ' + clientDetails.lastName : invoice.clientName}\n`,
            { text: 'Email: ', bold: true },
            `${clientDetails?.email || 'N/A'}\n`,
            { text: 'Phone: ', bold: true },
            `${clientDetails?.phone || 'N/A'}\n`,
            { text: 'Address: ', bold: true },
            `${clientDetails?.address || 'N/A'}\n`,
            clientDetails?.taxCode ? [
              { text: 'Tax Code: ', bold: true },
              `${clientDetails.taxCode}\n`
            ] : '',
            clientDetails?.vatNumber ? [
              { text: 'VAT No.: ', bold: true },
              `${clientDetails.vatNumber}`
            ] : ''
          ].flat().filter(Boolean),
          margin: [0, 0, 0, 20]
        },
        
        // Services table
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Description', style: 'tableHeader' },
                { text: 'Quantity', style: 'tableHeader' },
                { text: 'Unit Price', style: 'tableHeader' },
                { text: 'Total', style: 'tableHeader' }
              ],
              ...((!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) ? [
                [`Professional services - ${invoice.invoiceNumber}`, '1', `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`, `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`]
              ] : invoice.items.map((item: any) => [
                item.description || 'Professional service',
                (item.quantity || 1).toString(),
                `€ ${(item.price || 0).toFixed(2)}`,
                `€ ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
              ]))
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },
        
        // Final total
        {
          text: [
            { text: 'TOTAL: ', bold: true, fontSize: 16 },
            { text: `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`, bold: true, fontSize: 16 }
          ],
          alignment: 'right',
          margin: [0, 10, 0, 30]
        },
        
        // Footer
        {
          text: [
            `Document generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}\n`,
            businessData.vatNumber && businessData.fiscalCode ? 
              `VAT No.: ${businessData.vatNumber} - Tax Code: ${businessData.fiscalCode}` :
              businessData.vatNumber ? `VAT No.: ${businessData.vatNumber}` :
              businessData.fiscalCode ? `Tax Code: ${businessData.fiscalCode}` : ''
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

  // Send invoice via email
router.post('/api/invoices/:id/send-email', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { recipientEmail, subject, message } = req.body;
      
      logger.debug(`📄 [/api/invoices/${invoiceId}/send-email] Sending email for user ${user.id} to ${recipientEmail}`);
      
      // Input validation
      if (!recipientEmail || !subject) {
        return res.status(400).json({ message: 'Email and subject are required' });
      }
      
      // Load data
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Find the invoice
      const invoiceEntry = invoices.find(([id, invoice]: any) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Load custom company name for sender
      let businessName = 'Gestionale Appuntamenti';
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessName = userBusinessSettings.name;
        }
      } catch (error) {
        console.log('⚠️ Unable to load business name for email send:', error);
      }
      
      // Send real email using the proven reminder system
      try {
        const { notificationService } = await import('../services/notificationService');
        const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
        
        if (!fs.existsSync(emailConfigPath)) {
          console.log('⚠️ [EMAIL] Email configuration not found, simulating send');
          logger.debug(`📧 SIMULATED EMAIL send:
            From: ${businessName} <noreply@biomedicinaintegrata.it>
            To: ${recipientEmail}
            Subject: ${subject}
            Message: ${message || 'Invoice attached'}
            Attachment: invoice-${invoice.invoiceNumber}.pdf
          `);
        } else {
          const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
          
          if (!emailConfig.emailEnabled || !emailConfig.emailAddress || !emailConfig.emailPassword) {
            console.log('⚠️ [EMAIL] Email not configured, simulating send');
            logger.debug(`📧 SIMULATED EMAIL send:
              From: ${businessName} <noreply@biomedicinaintegrata.it>
              To: ${recipientEmail}
              Subject: ${subject}
              Message: ${message || 'Invoice attached'}
              Attachment: invoice-${invoice.invoiceNumber}.pdf
            `);
          } else {
            logger.debug(`📧 [INVOICE EMAIL] Sending invoice via email using tested system`);
            logger.debug(`📧 [INVOICE EMAIL] From: ${emailConfig.emailAddress} To: ${recipientEmail}`);
            logger.debug(`📧 [INVOICE EMAIL] Subject: ${subject}`);
            
            // Generate PDF identical to the print button for email attachment
            let pdfBuffer = null;
            let filename = null;
            
            try {
              logger.debug(`📄 [INVOICE EMAIL] Using same logic as print button...`);
              
              // Call the existing function that generates the PDF for printing
              pdfBuffer = await generateInvoicePDFForEmail(invoiceId, user, req);
              
              if (pdfBuffer && pdfBuffer.length > 0) {
                filename = `invoice-${invoice.invoiceNumber}.pdf`;
                logger.debug(`📎 [INVOICE EMAIL] Print-identical PDF generated: ${filename} (${pdfBuffer.length} bytes`);
              } else {
                throw new Error('PDF Buffer empty');
              }

            } catch (pdfError: any) {
              console.error(`❌ [INVOICE EMAIL] Error generating print PDF:`, pdfError?.message);
              pdfBuffer = null;
              filename = null;
            }
            
            // Use the specific function for invoices
            const emailSent = await notificationService.sendInvoiceEmail(
              recipientEmail,
              subject,
              message || `Dear Client,\n\nPlease find attached invoice no. ${invoice.invoiceNumber} dated ${new Date(invoice.date).toLocaleDateString('en-GB')}.\n\nInvoice details:\n- Number: ${invoice.invoiceNumber}\n- Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}\n- Amount: €${invoice.total?.toFixed(2) || '0.00'}\n\nBest regards,\n${businessName}`.replace(/invalid date/gi, ''),
              emailConfig,
              pdfBuffer || undefined,
              filename
            );
            
            if (emailSent) {
              logger.debug(`✅ [INVOICE EMAIL] Invoice email sent successfully${pdfBuffer ? ' with PDF attachment' : ' (text only)'}`);
            } else {
              throw new Error('Error sending email via notificationService');
            }
          }
        }
      } catch (emailError) {
        console.error('❌ [EMAIL] Error sending real email, falling back to simulation:', emailError);
        logger.debug(`📧 SIMULATED EMAIL send:
          From: ${businessName} <noreply@biomedicinaintegrata.it>
          To: ${recipientEmail}
          Subject: ${subject}
          Message: ${message || 'Invoice attached'}
          Attachment: invoice-${invoice.invoiceNumber}.pdf
        `);
      }
      
      logger.debug(`📧 [EMAIL] Business name used for send: "${businessName}"`);
      
      // Update invoice status to "sent" if it was in draft
      if (invoice.status === 'draft') {
        const invoiceIndex = invoices.findIndex(([id]: any) => id === invoiceId);
        if (invoiceIndex !== -1) {
          invoices[invoiceIndex][1].status = 'sent';
          invoices[invoiceIndex][1].sentAt = new Date().toISOString();
          saveStorageData(storageData);
        }
      }
      
      // Save send log
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
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/send-email] Email sent successfully`);
      res.json({ 
        success: true,
        recipientEmail,
        sentAt: new Date().toISOString(),
        message: 'Email sent successfully'
      });
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      res.status(500).json({ message: 'Error sending email' });
    }
  });

  // Multi-channel endpoint: send invoice via PWA, Email, WhatsApp - POSTGRESQL ONLY
router.post('/api/invoices/:id/send', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { channels } = req.body; // { pwa: boolean, email: boolean, whatsapp: boolean }
      
      console.log(`📤 [/api/invoices/${invoiceId}/send] Multi-channel send for user ${user.id}:`, channels);
      
      // Validation: at least one channel
      if (!channels || (!channels.pwa && !channels.email && !channels.whatsapp)) {
        return res.status(400).json({ message: 'Select at least one send channel' });
      }
      
      // Load invoice from PostgreSQL
      const invoiceResults = await db.select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.id, invoiceId),
          eq(invoicesTable.userId, user.id)
        ))
        .limit(1);
      
      if (!invoiceResults || invoiceResults.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      const invoice = invoiceResults[0];
      
      // Load client data da PostgreSQL
      const clientResults = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, invoice.clientId))
        .limit(1);
      
      if (!clientResults || clientResults.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const client = clientResults[0];
      const results = { pwa: false, email: false, whatsapp: false };
      const now = new Date();
      
      // Prepare update object
      const updateData: any = {};
      
      // 1. PWA: mark invoice as available in the clients area
      if (channels.pwa) {
        console.log(`📱 [PWA] invoice ${invoice.invoiceNumber} made available in the clients area`);
        updateData.publishedToPwa = true;
        updateData.pwaPublishedAt = now;
        results.pwa = true;
      }
      
      // 2. Email: load client data and send
      if (channels.email) {
        try {
          if (!client.email) {
            logger.debug(`⚠️ [EMAIL] Client has no email, skipping send`);
          } else {
            const { notificationService } = await import('../services/notificationService');
            const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
            
            if (fs.existsSync(emailConfigPath)) {
              const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
              
              if (emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword) {
                // === GENERATE PDF USING PWA LOGIC (logo + colors) ===
                
                // Load items invoice
                const items = await db.select()
                  .from(invoiceItems)
                  .where(eq(invoiceItems.invoiceId, invoice.id));
                
                // Load custom logo (uses invoice.userId = professional owner, NOT user.id = admin)
                const { loadUserLogo, buildInvoiceHtml, generatePdfBuffer } = await import('../utils/invoicePdf');
                const { getUserLanguage } = await import('../utils/userLanguage');
                const { formatDateShort, LOCALE_MAP, getInvoicePdfStrings, normalizeLang } = await import('../utils/emailTranslations');
                const invoiceOwnerLang = await getUserLanguage(invoice.userId);
                const logoBase64 = await loadUserLogo(invoice.userId);
                
                // Load company data (uses invoice.userId = professional owner)
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
                  console.log('⚠️ [EMAIL PDF] Error loading company data:', error);
                }
                
                // Retrieve the user's currency (use invoice.userId = professional owner)
                const userCurrency = await getCurrencyForUser(storage, invoice.userId);
                const currencySymbol = userCurrency.symbol;
                
                // Build context for the template
                const invoiceDateLocale = LOCALE_MAP[invoiceOwnerLang] || 'en-GB';
                const context = {
                  invoiceNumber: invoice.invoiceNumber,
                  date: new Date(invoice.date).toLocaleDateString(invoiceDateLocale),
                  dueDate: new Date(invoice.dueDate).toLocaleDateString(invoiceDateLocale),
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
                  clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString(invoiceDateLocale) : undefined,
                  
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
                  currencySymbol,
                  language: invoiceOwnerLang
                };
                
                // Generate professional HTML with logo and graphics
                const htmlContent = buildInvoiceHtml(context);
                
                // Generate PDF with Puppeteer (with silent fallback)
                let pdfBuffer: Buffer;
                try {
                  pdfBuffer = await generatePdfBuffer(htmlContent);
                  logger.debug(`✅ [EMAIL PDF] Professional PDF generated with Puppeteer (${pdfBuffer.length} bytes)`);
                } catch (pdfError) {
                  console.error('❌ [EMAIL PDF] Puppeteer failed, using HTML as fallback:', pdfError);
                  // Fallback: convert HTML to UTF-8 buffer
                  pdfBuffer = Buffer.from(htmlContent, 'utf-8');
                }
                
                const subject = `Invoice ${invoice.invoiceNumber}`;
                const message = `Dear ${client.firstName} ${client.lastName},\n\nPlease find attached invoice no. ${invoice.invoiceNumber}.\n\nBest regards`;
                
                await notificationService.sendInvoiceEmail(
                  client.email,
                  subject,
                  message,
                  emailConfig,
                  pdfBuffer,  // Buffer PDF professionale
                  `fattura-${invoice.invoiceNumber}.pdf`
                );
                
                logger.debug(`✅ [EMAIL] Invoice sent to ${client.email} with professional PDF attachment`);
                updateData.sentViaEmail = true;
                updateData.emailSentAt = now;
                results.email = true;
              } else {
                logger.debug(`⚠️ [EMAIL] Email not configured`);
              }
            } else {
              logger.debug(`⚠️ [EMAIL] Email configuration not found`);
            }
          }
        } catch (emailError) {
          console.error(`❌ [EMAIL] Error sending:`, emailError);
        }
      }
      
      // 3. WhatsApp: generate link or send message
      if (channels.whatsapp) {
        try {
          if (!client.phone) {
            logger.debug(`⚠️ [WHATSAPP] Client has no phone, skipping send`);
          } else {
            const { notificationService } = await import('../services/notificationService');
            const message = `Dear ${client.firstName}, invoice no. ${invoice.invoiceNumber} is available in the client portal.`;
            const whatsappLink = notificationService.generateWhatsAppLink(client.phone, message);
            
            logger.debug(`📲 [WHATSAPP] Link generated: ${whatsappLink}`);
            updateData.sentViaWhatsapp = true;
            updateData.whatsappSentAt = now;
            results.whatsapp = true;
          }
        } catch (whatsappError) {
          console.error(`❌ [WHATSAPP] Error:`, whatsappError);
        }
      }
      
      // Update invoice in PostgreSQL
      if (Object.keys(updateData).length > 0) {
        await db.update(invoicesTable)
          .set(updateData)
          .where(eq(invoicesTable.id, invoiceId));
        
        logger.debug(`💾 [/api/invoices/${invoiceId}/send] Invoice updated in PostgreSQL:`, updateData);
      }
      
      const successChannels = Object.entries(results)
        .filter(([_, success]) => success)
        .map(([channel]) => channel.toUpperCase())
        .join(', ');
      
      logger.debug(`✅ [/api/invoices/${invoiceId}/send] Send completed: ${successChannels}`);
      
      res.json({ 
        success: true,
        message: `Invoice sent successfully${successChannels ? ` via ${successChannels}` : ''}`,
        results
      });
      
    } catch (error) {
      console.error('❌ Error sending invoice:', error);
      res.status(500).json({ message: 'Error sending invoice' });
    }
  });

export default router;
