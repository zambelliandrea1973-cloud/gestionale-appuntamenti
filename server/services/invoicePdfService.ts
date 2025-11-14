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
 * Carica tutte le dipendenze necessarie per generare una fattura PDF
 * Usato sia da route autenticate (email admin) che pubbliche (PWA client)
 */
export async function resolveInvoiceDependencies(
  invoiceId: number,
  options: { userId?: number; clientCode?: string },
  storage?: any
): Promise<InvoiceDependencies> {
  let userId: number;
  let client: any;
  
  // Determina userId: o diretto o via clientCode
  if (options.clientCode) {
    // Flusso PWA: trova client da clientCode
    const clientResults = await db.select()
      .from(clients)
      .where(eq(clients.uniqueCode, options.clientCode))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      throw new Error(`Cliente non trovato per clientCode ${options.clientCode}`);
    }
    
    client = clientResults[0];
    userId = client.userId;
    console.log(`🔍 [invoicePdfService] Risolto userId ${userId} da clientCode ${options.clientCode}`);
    
  } else if (options.userId) {
    // Flusso autenticato: usa userId diretto
    userId = options.userId;
    console.log(`🔍 [invoicePdfService] Uso userId ${userId} diretto`);
    
  } else {
    throw new Error('Specificare userId o clientCode');
  }
  
  // Carica fattura da PostgreSQL con multi-tenant guard
  const invoiceResults = await db.select()
    .from(invoices)
    .where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.userId, userId)
    ))
    .limit(1);
  
  if (!invoiceResults || invoiceResults.length === 0) {
    throw new Error(`Fattura ${invoiceId} non trovata per utente ${userId}`);
  }
  
  const invoice = invoiceResults[0];
  
  // Carica cliente se non già caricato (flusso clientCode lo carica prima)
  if (!client) {
    const clientResults = await db.select()
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      throw new Error(`Cliente ${invoice.clientId} non trovato`);
    }
    
    client = clientResults[0];
  }
  
  // Carica items fattura da PostgreSQL
  const items = await db.select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoice.id));
  
  // Carica logo personalizzato
  const logoBase64 = await loadUserLogo(userId);
  
  // Carica dati aziendali - usa storage iniettato se presente, altrimenti fallback global
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
      // Storage iniettato: chiama metodi storage direttamente (ritornano oggetti, non wrapper)
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
      // Fallback: accesso diretto a storage.json globale
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
  } catch (error) {
    console.log('⚠️ [invoicePdfService] Errore caricamento dati aziendali:', error);
  }
  
  // Recupera valuta dell'utente (usa storage se passato, altrimenti default €)
  let currencySymbol = '€';
  if (storage) {
    try {
      const { getCurrencyForUser } = await import('../utils/currencyUtils');
      const userCurrency = await getCurrencyForUser(storage, userId);
      currencySymbol = userCurrency.symbol;
    } catch (error) {
      console.log('⚠️ [invoicePdfService] Errore caricamento valuta, uso default €:', error);
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
 * Costruisce il context per il template HTML della fattura
 */
export function buildInvoiceContext(deps: InvoiceDependencies): InvoiceRenderContext {
  const { invoice, client, items, logoBase64, businessHeader, businessData, currencySymbol } = deps;
  
  return {
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
    clientTaxCode: client.taxCode || undefined,
    clientVatNumber: client.vatNumber || undefined,
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
}

/**
 * Genera PDF buffer per una fattura (funzione principale del service)
 * Usato sia da email route che da PWA route
 */
export async function generateInvoicePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { invoiceId, userId, clientCode, storage } = options;
  
  console.log(`📄 [invoicePdfService] Generazione PDF per fattura ${invoiceId}${userId ? `, userId ${userId}` : ''}${clientCode ? `, clientCode ${clientCode}` : ''}`);
  
  // 1. Risolvi dipendenze (carica dati) - passa userId OR clientCode
  const dependencies = await resolveInvoiceDependencies(invoiceId, { userId, clientCode }, storage);
  
  // 2. Costruisci context
  const context = buildInvoiceContext(dependencies);
  
  // 3. Genera HTML
  const html = buildInvoiceHtml(context);
  
  // 4. Genera PDF con Puppeteer (lancia eccezione se fallisce)
  const pdfBuffer = await generatePdfBuffer(html);
  
  console.log(`✅ [invoicePdfService] PDF generato: ${pdfBuffer.length} bytes`);
  
  return pdfBuffer;
}
