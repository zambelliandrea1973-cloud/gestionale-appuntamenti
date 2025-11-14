// Soluzione semplice: usa l'endpoint PDF esistente per allegato email
async function generatePDFFromEndpoint(invoiceId, req) {
  console.log('📄 [INVOICE EMAIL] Riutilizzo endpoint PDF esistente...');
  
  try {
    // Chiamata fetch all'endpoint PDF che già funziona perfettamente
    const pdfUrl = `http://localhost:5000/api/invoices/${invoiceId}/pdf`;
    
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
        'User-Agent': 'Internal-PDF-Generator'
      }
    });
    
    if (!response.ok) {
      throw new Error(`PDF endpoint failed: ${response.status}`);
    }
    
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`📎 [EMAIL] PDF ottenuto da endpoint stampa: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } catch (error) {
    console.log(`❌ [EMAIL] Fallback: ${error.message}`);
    
    // Fallback semplice con pdfMake già configurato 
    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    
    const doc = pdfMake.createPdf({
      content: [
        { text: 'FATTURA', style: 'header' },
        `Numero fattura: ${invoiceId}`,
        'Contenuto fattura allegato'
      ],
      styles: { 
        header: { fontSize: 18, bold: true, alignment: 'center' } 
      }
    });
    
    return new Promise((resolve, reject) => {
      doc.getBuffer(buffer => resolve(buffer));
    });
  }
}

// Uso nella funzione email:
// const pdfBuffer = await generatePDFFromEndpoint(invoiceId, req);