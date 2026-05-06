// @ts-nocheck
import { db } from '../db';
import { invoices, clients, invoiceItems } from '../../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { loadUserLogo, buildInvoiceHtml, generatePdfBuffer, InvoiceRenderContext } from '../utils/invoicePdf';
import { loadStorageData } from '../storage';
import path from 'path';
import fs from 'fs';

interface InvoiceDependencies {
  invoice: any;
  client: any;
  items: any[];
  logoBase64: string;
  businessHeader: string;
  businessData: {
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    vatNumber?: string;
    fiscalCode?: string;
  };
  currencySymbol: string;
}

interface GeneratePdfOptions {
  invoiceId: number;
  userId?: number;         // Per route autenticate (email admin)
  clientCode?: string;     // Per route pubbliche PWA
  storage?: any;
}

/**
 * Load all dependencies needed to generate an invoice PDF
 * Used both by authenticated routes (admin email) and public routes (PWA client)
 */
export async function resolveInvoiceDependencies(
  invoiceId: number,
  options: { userId?: number; clientCode?: string },
  storage?: any
): Promise<InvoiceDependencies> {
  let userId: number;
  let client: any;
  
  // Determine userId: either direct or via clientCode
  if (options.clientCode) {
    // PWA flow: find client by clientCode
    const clientResults = await db.select()
      .from(clients)
      .where(eq(clients.uniqueCode, options.clientCode))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      throw new Error(`Client not found for clientCode ${options.clientCode}`);
    }
    
    client = clientResults[0];
    userId = client.userId;
    console.log(`🔍 [invoicePdfService] Resolved userId ${userId} from clientCode ${options.clientCode}`);
    
  } else if (options.userId) {
    // Flusso autenticato: usa userId diretto
    userId = options.userId;
    console.log(`🔍 [invoicePdfService] Uso userId ${userId} diretto`);
    
  } else {
    throw new Error('Specificare userId o clientCode');
  }
  
  // Load invoice da PostgreSQL con multi-tenant guard
  const invoiceResults = await db.select()
    .from(invoices)
    .where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.userId, userId)
    ))
    .limit(1);
  
  if (!invoiceResults || invoiceResults.length === 0) {
    throw new Error(`Invoice ${invoiceId} not found for user ${userId}`);
  }
  
  const invoice = invoiceResults[0];
  
  // Load client if already loaded (clientCode flow loads it first)
  if (!client) {
    const clientResults = await db.select()
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      throw new Error(`Client ${invoice.clientId} not found`);
    }
    
    client = clientResults[0];
  }
  
  // Load items invoice da PostgreSQL
  const items = await db.select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoice.id));
  
  // Load logo personalizzato
  const logoBase64 = await loadUserLogo(userId);
  
  // Load company data - use injected storage if present, otherwise fallback to global
  let businessHeader = 'Gestionale Appuntamenti';
  let businessData: any = {
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    email: '',
    vatNumber: '',
    fiscalCode: ''
  };
  
  try {
    if (storage) {
      // Injected storage: calls storage methods directly (returns objects, not wrappers)
      const userBusinessSettings = await storage.getUserBusinessSettings?.(userId);
      const userBusinessData = await storage.getUserBusinessData?.(userId);
      
      if (userBusinessSettings?.enabled && userBusinessSettings.name) {
        businessHeader = userBusinessSettings.name;
      }
      
      if (userBusinessData) {
        businessData = { ...businessData, ...userBusinessData };
        if (userBusinessData.companyName) {
          businessHeader = userBusinessData.companyName;
        }
      }
    } else {
      // Fallback: direct access to global storage.json
      const storageData = loadStorageData();
      const userBusinessSettings = storageData.userBusinessSettings?.[userId];
      const userBusinessData = storageData.userBusinessData?.[userId];
      
      if (userBusinessSettings?.enabled && userBusinessSettings.name) {
        businessHeader = userBusinessSettings.name;
      }
      
      if (userBusinessData) {
        businessData = { ...businessData, ...userBusinessData };
        if (userBusinessData.companyName) {
          businessHeader = userBusinessData.companyName;
        }
      }
    }
  } catch (error: any) {
    console.log('⚠️ [invoicePdfService] Error loading company data:', error);
  }
  
  // Retrieve user currency (use storage if passed, otherwise default €)
  let currencySymbol = '€';
  if (storage) {
    try {
      const { getCurrencyForUser } = await import('../utils/currencyUtils');
      const userCurrency = await getCurrencyForUser(storage, userId);
      currencySymbol = userCurrency.symbol;
    } catch (error: any) {
      console.log('⚠️ [invoicePdfService] Error loading currency, using default €:', error);
    }
  }
  
  return {
    invoice,
    client,
    items,
    logoBase64,
    businessHeader,
    businessData,
    currencySymbol
  };
}

/**
 * Build the context for the invoice HTML template
 */
export function buildInvoiceContext(deps: InvoiceDependencies): InvoiceRenderContext {
  const { invoice, client, items, logoBase64, businessHeader, businessData, currencySymbol } = deps;
  
  return {
    invoiceNumber: invoice.invoiceNumber,
    date: new Date(invoice.date).toLocaleDateString('en-GB'),
    dueDate: new Date(invoice.dueDate).toLocaleDateString('en-GB'),
    status: invoice.status,
    totalAmount: invoice.totalAmount,
    tax: invoice.tax || 0,
    notes: invoice.notes || undefined,
    
    clientName: `${client.firstName} ${client.lastName}`,
    clientAddress: client.address || undefined,
    clientPhone: client.phone || undefined,
    clientEmail: client.email || undefined,
    clientTaxCode: client.taxCode || undefined,
    clientVatNumber: client.vatNumber || undefined,
    clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString('en-GB') : undefined,
    
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
}

/**
 * Generate PDF buffer for an invoice (main function of the service)
 * Used both by email route and PWA route
 */
export async function generateInvoicePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { invoiceId, userId, clientCode, storage } = options;
  
  console.log(`📄 [invoicePdfService] Generation PDF per invoice ${invoiceId}${userId ? `, userId ${userId}` : ''}${clientCode ? `, clientCode ${clientCode}` : ''}`);
  
  // 1. Resolve dependencies (load data) - pass userId OR clientCode
  const dependencies = await resolveInvoiceDependencies(invoiceId, { userId, clientCode }, storage);
  
  // 2. Build context
  const context = buildInvoiceContext(dependencies);
  
  // 3. Generate HTML
  const html = buildInvoiceHtml(context);
  
  // 4. Generate PDF con Puppeteer (lancia eccezione If fallisce)
  const pdfBuffer = await generatePdfBuffer(html);
  
  console.log(`✅ [invoicePdfService] PDF generated: ${pdfBuffer.length} bytes`);
  
  return pdfBuffer;
}
