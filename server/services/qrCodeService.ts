import QRCode from 'qrcode';

/**
 * Service for generating QR codes
 */
export const qrCodeService = {
  /**
   * Generate a QR code from a string
   * @param text The text to encode in the QR code
   * @returns A Promise that resolves to a base64 string containing the QR code image
   */
  async generateQRCode(text: string): Promise<string> {
    try {
      // Define the options for the QR code
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
      
      // Generate the QR code as a base64 string
      return await QRCode.toDataURL(text, qrOptions);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Unable to generate QR code');
    }
  },
  
  /**
   * Generate an activation URL from a token
   * @param token the token activation
   * @returns The complete activation URL
   */
  generateActivationUrl(token: string): string {
    // Get the application host from environment variables or use the Replit URL
    const host = process.env.REPLIT_SLUG || process.env.REPL_SLUG;
    
    // Build the application base URL
    let baseUrl = process.env.BASE_URL;
    
    // If a base URL is specified, use the Replit URL or localhost as fallback
    if (!baseUrl) {
      if (host) {
        baseUrl = `https://${host}.replit.app`;
      } else {
        baseUrl = `http://localhost:5000`;
      }
    }
    
    // Build the complete URL
    return `${baseUrl}/activate?token=${token}`;
  }
};