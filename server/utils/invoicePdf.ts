// @ts-nocheck
import { db } from '../db';
import { userIcons } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Logo default Fleur de Vie (PNG base64)
const defaultIconBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAP7klEQVR4nO2dbWxcxRWGn5mdXe/a3viTOHacEEIaCCRpRKEpUikQqaJUqqo2/EBVqaK2Uqv+QP1RqVL/VPTHr/6hqlSpqmpVqQVVlEIRpQQhQSEQkpCQQEJiJ3Zsxxt/7Hp3d+/t3J2xd7y7a+/unZm7M3fuzPNLkWzv3pk5c955z5kzZ85cEQRBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEASfSewuQKg42r9/P+3t7b2qPwFUAWgBl0fVvxLdC1QD1cg+gP5YXd+V+k0P0K9+g8AIMAZ8CLwL/AO4DJwDzg+Pj6+z+J1BmKKysrLu4QsXjLvmzwfoAXASeB24rH73AV86XcCQUAU8DmwA8MwfNAHBo1RWVlL4rW+x/tFHgS5gLbAR2AMcAz4FTgNHgQ+Ak8AZoN+hIgeBzcCDwC8o1s/YsWOexeRcDCIcnv/Xv4Kzs7PlW25RA3obMKj6YALYBrwGPCX5BhECDpfUzCJyPgBdXV0MDw+Djnd/lhMnKPT28tLwMEMdHc4VLiCsR/aUWGAhsBcJCEEIWHw9pHi/3xkZ4djAAOt27IDNm50okTfRfSQ7TASBoNuS5hU1SDbLsrw8T6xcaXdRPIf0kJhAmiBnJ9/1ByOTwbPL1qxh5bp1bN6+nUwm41wBPYI6gI9KD4lBMn1vdXU179+9u3RbTR+VUF+2VV/VVxkz5DeSAWYw/uH/AbgBXAP+a8jTjwKHXPrMINCNGBf+EEpuB4aoq6vj1Wkz9R3AJ0D9PPf+yImnTODXwD+Rs0gwSABfLl68+Gbg1+3tzTh0BdgK/MeQNrFj/noC+DHCIPGhGngbaPLEtmSH3+HMHLgOeNGCvANPgwBbgYMsVEE3A7+0u/A+Q7fxbgbtwNoiVBPeGUQBbgF+a2flBZY2YDeBvH/PuSABbBXB4jNE3ncaOWkJ8hXcYg7PBKlEJumCQPANGSxBINBt+qgZv8c9jC8MogN1sd0FCAANbmJ8EREEAPa4gfFFQBAAFruf8UVAECCa7BfGFwGhwDTbEm2wtkJHMmYnySGb9PdbWYgIiuv4F2Cb1HHbpIguwL2OFcSDwnoKeTq0EzjkdiFrEc+Hzti97RokILGDvdWZPAUO5cnnywD+hSwPsVYQMAB8HngM+dqqJ6y9S/WRxW4pbR9YvA58H3ga2e62JhAlHkl0IOe+P0T+/q//p6//T4/sN6jSW5hvFe5nMG6pfRHwnCr7p8Xpl3Ks/8BI2h+RHXI70l5S+zGCrqsFbAOeBF4BBpQsPyjS7j5S//e/f0rlO+l5fqTkPIEy6+PsA9XAGZX3S6p+J5Wsx6rXL5SsI6u5FS7zupXd+xP1fKs4c+CgyrsDeBfYjuTxlRPKZfvQWTt/gVT0vkW+Q+UPE6i+qEXqf79a0t5W7ZIBD+SpO0D9vYSsu8e68oPXZhtYuQJ4lPsZl01/p95JkG/+JvW7Cvs+Ul3BLuBJ5M/lNqvJdx3k/1FZS9R7JoBX5y+kw+yZ4tRFgXfNvYvq3I8Bf5srf7/xR5X+a/NdKGGjAAAAAElFTkSuQmCC`;

// Interface for invoice rendering context
export interface InvoiceRenderContext {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  tax: number;
  notes?: string;
  
  // Dati client
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientTaxCode?: string;
  clientVatNumber?: string;
  clientBirthday?: string;
  
  // Business data
  businessHeader: string;
  businessAddress?: string;
  businessCity?: string;
  businessPostalCode?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessVatNumber?: string;
  businessFiscalCode?: string;
  
  // Items invoice
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  
  // Logo (base64)
  logoBase64: string;
  
  // Valuta
  currencySymbol: string;
}

/**
 * Load the custom logo from the database (or use default)
 */
export async function loadUserLogo(userId: number): Promise<string> {
  try {
    const iconRow = await db
      .select({ iconBase64: userIcons.iconBase64 })
      .from(userIcons)
      .where(eq(userIcons.userId, userId))
      .limit(1);
    
    if (iconRow.length > 0 && iconRow[0].iconBase64) {
      console.log(`🖼️ [PDF] Custom logo loaded for user ${userId}`);
      return iconRow[0].iconBase64;
    }
  } catch (error: any) {
    console.log('⚠️ [PDF] Error loading logo, using default:', error);
  }
  
  console.log(`🖼️ [PDF] Using default logo for user ${userId}`);
  return defaultIconBase64;
}

/**
 * Generate HTML professionale per invoice (template condiviso)
 */
export function buildInvoiceHtml(context: InvoiceRenderContext): string {
  const {
    invoiceNumber,
    date,
    dueDate,
    status,
    totalAmount,
    tax,
    notes,
    clientName,
    clientAddress,
    clientPhone,
    clientEmail,
    clientTaxCode,
    clientVatNumber,
    clientBirthday,
    businessHeader,
    businessAddress,
    businessCity,
    businessPostalCode,
    businessPhone,
    businessEmail,
    businessVatNumber,
    businessFiscalCode,
    items,
    logoBase64,
    currencySymbol
  } = context;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoiceNumber}</title>
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
        <img src="${logoBase64}" alt="Logo" />
        <h1>${businessHeader}</h1>
        ${businessAddress || businessCity || businessPostalCode ? `
          <p><strong>Address:</strong> ${businessAddress || ''}${businessCity ? `, ${businessCity}` : ''}${businessPostalCode ? ` ${businessPostalCode}` : ''}</p>
        ` : ''}
        ${businessPhone ? `<p><strong>Tel:</strong> ${businessPhone}</p>` : ''}
        ${businessEmail ? `<p><strong>Email:</strong> ${businessEmail}</p>` : ''}
        ${businessVatNumber ? `<p><strong>VAT No.:</strong> ${businessVatNumber}</p>` : ''}
        ${businessFiscalCode ? `<p><strong>Tax Code:</strong> ${businessFiscalCode}</p>` : ''}
      </div>
      
      <div class="invoice-info">
        <div class="client-info">
          <h3>Client Details</h3>
          <p><strong>Name:</strong> ${clientName}</p>
          ${clientAddress ? `<p><strong>Address:</strong> ${clientAddress}</p>` : ''}
          ${clientPhone ? `<p><strong>Phone:</strong> ${clientPhone}</p>` : ''}
          ${clientEmail ? `<p><strong>Email:</strong> ${clientEmail}</p>` : ''}
          ${clientTaxCode ? `<p><strong>Tax Code:</strong> ${clientTaxCode}</p>` : ''}
          ${clientVatNumber ? `<p><strong>VAT Number:</strong> ${clientVatNumber}</p>` : ''}
          ${clientBirthday ? `<p><strong>Date of Birth:</strong> ${clientBirthday}</p>` : ''}
        </div>
        <div class="invoice-details">
          <h3>Invoice No. ${invoiceNumber}</h3>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          <p><strong>Status:</strong> ${
            status === 'paid' ? 'Paid' :
            status === 'sent' ? 'Sent' :
            status === 'overdue' ? 'Overdue' : 'Draft'
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
          ${items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${currencySymbol}${item.price.toFixed(2)}</td>
              <td style="text-align: right;">${currencySymbol}${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right; padding: 15px;"><strong>TOTAL:</strong></td>
            <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${totalAmount.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      ${notes ? `
        <div class="notes-section">
          <h4>Notes</h4>
          <p>${notes}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for choosing our services</p>
        <p style="margin-top: 10px; font-size: 9pt;">Document generated on ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate PDF Buffer usando Puppeteer (lancia eccezione If fallisce)
 */
export async function generatePdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const { execSync } = await import('child_process');
  
  // Find Chromium installato via Nix
  let executablePath: string | undefined;
  try {
    executablePath = execSync('which chromium-browser || which chromium', { encoding: 'utf-8' }).trim();
    console.log(`🌐 [PDF] Usando Chromium: ${executablePath}`);
  } catch (e) {
    console.log('⚠️ [PDF] Chromium not found, uso default Puppeteer');
  }
  
  let browser = null;
  try {
    browser = await puppeteer.default.launch({ 
      headless: true,
      executablePath, // Usa Chromium se found
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    console.log(`✅ [PDF] PDF generated with Puppeteer: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } finally {
    // CRITICAL: Always close the browser, also in case of error
    if (browser) {
      await browser.close();
    }
  }
}
