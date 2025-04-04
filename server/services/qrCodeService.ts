import QRCode from 'qrcode';

/**
 * Servizio per la generazione di codici QR
 */
export const qrCodeService = {
  /**
   * Genera un codice QR a partire da una stringa
   * @param text Il testo da codificare nel QR code
   * @returns Una Promise che risolve in una stringa base64 contenente l'immagine del QR code
   */
  async generateQRCode(text: string): Promise<string> {
    try {
      // Definisci le opzioni per il QR code
      const qrOptions = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };
      
      // Genera il QR code come stringa base64
      return await QRCode.toDataURL(text, qrOptions);
    } catch (error) {
      console.error('Errore nella generazione del QR code:', error);
      throw new Error('Impossibile generare il QR code');
    }
  },
  
  /**
   * Genera un URL di attivazione a partire da un token
   * @param token Il token di attivazione
   * @returns L'URL completo per l'attivazione
   */
  generateActivationUrl(token: string): string {
    // Costruisci l'URL base dell'applicazione
    const baseUrl = process.env.BASE_URL || `http://localhost:5000`;
    
    // Costruisci l'URL completo
    return `${baseUrl}/activate?token=${token}`;
  }
};