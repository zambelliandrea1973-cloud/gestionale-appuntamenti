import QRCode from 'qrcode';

/**
 * Servizio per la generazione dei codici QR per l'attivazione degli account client
 */
export const qrCodeService = {
  /**
   * Genera un codice QR in base all'URL fornito
   * @param url L'URL da codificare nel QR
   * @param options Opzioni di formattazione del QR code
   * @returns Una Promise che restituisce una stringa base64 del QR code
   */
  async generateQRCode(url: string, options: QRCode.QRCodeToDataURLOptions = {}): Promise<string> {
    try {
      // Opzioni di default per un QR code leggibile e di qualità
      const defaultOptions: QRCode.QRCodeToDataURLOptions = {
        errorCorrectionLevel: 'H', // Alta correzione errori per maggiore resilienza
        margin: 1,                // Margine ridotto per un QR code più compatto
        width: 300,               // Dimensione adeguata per la visualizzazione su mobile
        color: {
          dark: '#000000',        // Colore scuro per il QR code
          light: '#ffffff'        // Sfondo bianco
        }
      };
      
      // Unisci le opzioni di default con quelle passate come parametro
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Genera il QR code come URL data
      return await QRCode.toDataURL(url, mergedOptions);
    } catch (error) {
      console.error("Errore nella generazione del QR code:", error);
      throw error;
    }
  },

  /**
   * Genera un URL assoluto per l'attivazione di un account client
   * @param token Il token di attivazione
   * @param baseUrl L'URL base dell'applicazione
   * @returns L'URL completo per l'attivazione
   */
  generateActivationUrl(token: string, baseUrl: string): string {
    return `${baseUrl}/activate?token=${token}`;
  }
};